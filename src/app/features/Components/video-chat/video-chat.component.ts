import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
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
  
  // UI State
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
      this.webrtc.init();
      this.setupSignalREvents();
      
      // Subscribe to WebRTC events
      this.webrtc.localStreamSubject.subscribe(stream => {
        if (this.localVideo?.nativeElement) {
          this.localVideo.nativeElement.srcObject = stream;
        }
      });

      this.webrtc.remoteStreamSubject.subscribe(stream => {
        if (this.remoteVideo?.nativeElement) {
          this.remoteVideo.nativeElement.srcObject = stream;
          this.remoteStreamAvailable = true;
        }
      });

      this.webrtc.connectionStateSubject.subscribe(state => {
        if (state === 'connected') {
          this.isConnecting = false;
          this.isInCall = true;
        }
        if (state === 'failed') {
          this.isConnecting = false;
          this.errorMessage = 'Connection failed. Please try again.';
        }
      });

      console.log('✅ Connected');
    } catch (error) {
      console.error('❌ Connection failed:', error);
      this.errorMessage = 'Failed to connect to server';
    }
  }

  ngOnDestroy() {
    this.webrtc.endCall();
    this.signalR.disconnect();
  }

  private setupSignalREvents() {
    this.signalR.ConnectionOn('StartCall', async (roomId: string) => {
      console.log('🎯 Initiator:', roomId);
      this.isInCall = true;
      this.isConnecting = true;
      this.webrtc.RoomId = roomId;
      
      try {
        await this.webrtc.startCamera();
        this.webrtc.createPeerConnection1();
        await this.webrtc.createAndSendOffer();
        this.isConnecting = false;
      } catch (error) {
        console.error('Error in StartCall:', error);
        this.isConnecting = false;
      }
    });

    this.signalR.ConnectionOn('Waiting', () => {
      console.log('⏳ Waiting...');
      this.isInCall = true;
      this.isConnecting = true;
    });

    this.signalR.ConnectionOn('IncomingCall', async (roomId: string) => {
      console.log('📞 Incoming:', roomId);
      this.webrtc.RoomId = roomId;
      this.isInCall = true;
      this.isConnecting = true;
      
      try {
        await this.webrtc.startCamera();
        this.webrtc.createPeerConnection1();
        // Don't create offer here - wait for ReceiveOffer
      } catch (error) {
        console.error('Error in IncomingCall:', error);
        this.isConnecting = false;
      }
    });

    this.signalR.ConnectionOn('ReceiveOffer', async (sdp: string) => {
      console.log('📥 Received offer');
      try {
        await this.webrtc.createAndSendAnswer(sdp);
        this.isConnecting = false;
      } catch (error) {
        console.error('Error handling offer:', error);
        this.isConnecting = false;
      }
    });

    this.signalR.ConnectionOn('ReceiveAnswer', async (sdp: string) => {
      console.log('📥 Received answer');
      try {
        await this.webrtc.setRemoteDescription(sdp);
        this.isConnecting = false;
      } catch (error) {
        console.error('Error handling answer:', error);
        this.isConnecting = false;
      }
    });

    this.signalR.ConnectionOn('Error', (code: string, msg: string) => {
      console.error('❌ Error:', code, msg);
      this.errorMessage = msg;
      this.isConnecting = false;
    });
  }

  async startVideoChat() {
  // ✅ Check if username is entered
  if (!this.userName || this.userName.trim() === '') {
    this.errorMessage = 'Please enter your name first';
    return;
  }

  try {
    this.isConnecting = true;
    this.isInCall = true;
    this.errorMessage = '';
    
    await this.webrtc.startCamera();
    this.webrtc.createPeerConnection1();
    
    // Wait for connection if needed
    let attempts = 0;
    while (!this.signalR.isConnected() && attempts < 5) {
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }
    
    if (!this.signalR.isConnected()) {
      throw new Error('SignalR not connected');
    }
    
    await this.signalR.invokeWithoutParams('FindPartner');
    
  } catch (error: any) {
    console.error('❌ Error:', error);
    this.errorMessage = error.message || 'Failed to start';
    this.isConnecting = false;
    this.webrtc.endCall();
  }
}

  async endCall() {
    await this.webrtc.endCall();
    this.isInCall = false;
    this.isConnecting = false;
    this.remoteStreamAvailable = false;
  }

  async skipPartner() {
    if (this.webrtc.RoomId) {
      this.isConnecting = true;
      await this.signalR.invoke('Next', this.webrtc.RoomId);
      this.webrtc.cleanupPeerConnection();
      this.remoteStreamAvailable = false;
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