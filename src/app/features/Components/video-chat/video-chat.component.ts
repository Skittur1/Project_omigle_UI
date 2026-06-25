import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SignalRService } from '../../../core/services/signal-r.service';
import { WebRTCService } from '../../../core/services/webrtc.service';

@Component({
  selector: 'app-video-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './video-chat.component.html',
  styleUrls: ['./video-chat.component.css']
})
export class VideoChatComponent implements OnInit, OnDestroy {
  isInCall = false;
  isConnecting = false;
  errorMessage = '';
  userName = '';
  connectionStatus = 'Disconnected';
  isAudioEnabled = true;
  isVideoEnabled = true;
  remoteStreamAvailable = false;

  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

  constructor(
    private signalR: SignalRService,
    private webrtc: WebRTCService
  ) {}

  async ngOnInit() {
    try {
      await this.signalR.startConnection();
      this.connectionStatus = 'Connected';

      this.setupSignalREvents();
      this.setupWebRTCSubscriptions();

      console.log('✅ Connected');
    } catch (error) {
      console.error('❌ Connection failed:', error);
      this.errorMessage = 'Failed to connect to server';
      this.connectionStatus = 'Disconnected';
    }
  }

  ngOnDestroy() {
    this.cleanupSignalREvents();
    this.webrtc.endCall();
    this.signalR.disconnect();
  }

  private setupWebRTCSubscriptions() {
    this.webrtc.localStreamSubject.subscribe((stream) => {
      if (this.localVideo?.nativeElement) {
        this.localVideo.nativeElement.srcObject = stream;
        this.localVideo.nativeElement.muted = true;
        this.localVideo.nativeElement.play().catch(() => {});
      }
    });

    this.webrtc.remoteStreamSubject.subscribe((stream) => {
      console.log('🎥 Remote stream received in component:', stream);

      if (this.remoteVideo?.nativeElement) {
        this.remoteVideo.nativeElement.srcObject = stream;
        this.remoteVideo.nativeElement.play().catch((err) => {
          console.error('Remote video play error:', err);
        });
      }

      this.remoteStreamAvailable = true;
      this.isConnecting = false;
      this.isInCall = true;
    });

    this.webrtc.connectionStateSubject.subscribe((state) => {
      console.log('WebRTC connection state from subject:', state);

      if (state === 'connected') {
        this.isConnecting = false;
        this.isInCall = true;
        this.errorMessage = '';
      }

      if (state === 'connecting') {
        this.isConnecting = true;
      }

      if (state === 'failed') {
        this.isConnecting = false;
        this.errorMessage = 'Connection failed. Please try again.';
      }

      if (state === 'disconnected') {
        this.isConnecting = false;
      }

      if (state === 'closed') {
        this.isConnecting = false;
      }
    });
  }

  private setupSignalREvents() {
    // Initiator side
    this.signalR.ConnectionOn('StartCall', async (roomId: string) => {
      console.log('🎯 StartCall:', roomId);

      this.isInCall = true;
      this.isConnecting = true;
      this.errorMessage = '';
      this.webrtc.RoomId = roomId;

      try {
        await this.ensureCameraAndPeerConnection();
        await this.webrtc.createAndSendOffer();
      } catch (error) {
        console.error('Error in StartCall:', error);
        this.isConnecting = false;
        this.errorMessage = 'Failed to start call';
      }
    });

    this.signalR.ConnectionOn('Waiting', () => {
      console.log('⏳ Waiting for partner...');
      this.isInCall = true;
      this.isConnecting = true;
      this.errorMessage = '';
    });

    // Receiver side
    this.signalR.ConnectionOn('IncomingCall', async (roomId: string) => {
      console.log('📞 IncomingCall:', roomId);

      this.webrtc.RoomId = roomId;
      this.isInCall = true;
      this.isConnecting = true;
      this.errorMessage = '';

      try {
        await this.ensureCameraAndPeerConnection();
      } catch (error) {
        console.error('Error in IncomingCall:', error);
        this.isConnecting = false;
        this.errorMessage = 'Failed to prepare incoming call';
      }
    });

    this.signalR.ConnectionOn('ReceiveOffer', async (sdp: string) => {
      console.log('📥 Received offer');

      try {
        await this.ensureCameraAndPeerConnection();
        await this.webrtc.createAndSendAnswer(sdp);
      } catch (error) {
        console.error('Error handling offer:', error);
        this.isConnecting = false;
        this.errorMessage = 'Failed to handle offer';
      }
    });

    this.signalR.ConnectionOn('ReceiveAnswer', async (sdp: string) => {
      console.log('📥 Received answer');

      try {
        await this.webrtc.setRemoteDescription(sdp);
      } catch (error) {
        console.error('Error handling answer:', error);
        this.isConnecting = false;
        this.errorMessage = 'Failed to handle answer';
      }
    });

    this.signalR.ConnectionOn('ReceiveIceCandidate', async (candidate: string) => {
      console.log('🧊 Received ICE candidate');

      try {
        await this.webrtc.addIceCandidate(candidate);
      } catch (error) {
        console.error('Error handling ICE candidate:', error);
      }
    });

    this.signalR.ConnectionOn('Error', (code: string, msg: string) => {
      console.error('❌ SignalR Error:', code, msg);
      this.errorMessage = msg || 'Something went wrong';
      this.isConnecting = false;
    });
  }

  private cleanupSignalREvents() {
    this.signalR.connectionOff('StartCall');
    this.signalR.connectionOff('Waiting');
    this.signalR.connectionOff('IncomingCall');
    this.signalR.connectionOff('ReceiveOffer');
    this.signalR.connectionOff('ReceiveAnswer');
    this.signalR.connectionOff('ReceiveIceCandidate');
    this.signalR.connectionOff('Error');
  }

  private async ensureCameraAndPeerConnection() {
    if (!this.webrtc.localStream) {
      await this.webrtc.startCamera();
    }

    if (!this.webrtc.peerConnection) {
      this.webrtc.createPeerConnection1();
      return;
    }

    const state = this.webrtc.peerConnection.connectionState;
    const signalingState = this.webrtc.peerConnection.signalingState;

    if (
      state === 'closed' ||
      state === 'failed' ||
      signalingState === 'closed'
    ) {
      this.webrtc.cleanupPeerConnection();
      this.webrtc.createPeerConnection1();
    }
  }

  async startVideoChat() {
    if (!this.userName || this.userName.trim() === '') {
      this.errorMessage = 'Please enter your name first';
      return;
    }

    try {
      this.errorMessage = '';
      this.isConnecting = true;
      this.isInCall = true;
      this.remoteStreamAvailable = false;

      await this.ensureCameraAndPeerConnection();

      const connected = await this.signalR.waitUntilConnected(10, 500);
      if (!connected) {
        throw new Error('SignalR not connected');
      }

      await this.signalR.invokeWithoutParams('FindPartner');
      console.log('🔎 Finding partner...');
    } catch (error: any) {
      console.error('❌ Error starting video chat:', error);
      this.errorMessage = error.message || 'Failed to start video chat';
      this.isConnecting = false;
      this.isInCall = false;
      this.webrtc.cleanupPeerConnection();
    }
  }

  async endCall() {
    try {
      await this.webrtc.endCall();
    } catch (error) {
      console.error('Error ending call:', error);
    }

    this.isInCall = false;
    this.isConnecting = false;
    this.remoteStreamAvailable = false;
    this.errorMessage = '';
  }

  async skipPartner() {
    try {
      this.isConnecting = true;
      this.remoteStreamAvailable = false;

      if (this.webrtc.RoomId) {
        await this.signalR.invoke('Next', this.webrtc.RoomId);
      }

      // clean old peer and prepare new one
      this.webrtc.cleanupPeerConnection();

      if (this.webrtc.localStream) {
        this.webrtc.createPeerConnection1();
      }
    } catch (error) {
      console.error('Error skipping partner:', error);
      this.errorMessage = 'Failed to skip partner';
      this.isConnecting = false;
    }
  }

  toggleAudio() {
    this.isAudioEnabled = !this.isAudioEnabled;
    this.webrtc.toggleAudio();
  }

  toggleVideo() {
    this.isVideoEnabled = !this.isVideoEnabled;
    this.webrtc.toggleVideo();
  }
}