import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SignalRService } from '../../../core/services/signal-r.service';

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
  RoomId = '';
  isAudioEnabled = true;
  isVideoEnabled = true;

  // WebRTC
  localSdp = '';
  remoteSdp = '';
  localStream: MediaStream | null = null;
  peerConnection: RTCPeerConnection | null = null;
  remoteStreamAvailable = false;

  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

 configuration: RTCConfiguration = {
  iceServers: [
    {
      urls: 'stun:stun.relay.metered.ca:80'
    },
    {
      urls: 'turn:standard.relay.metered.ca:80',
      username: '10fb06edf58626673cfcf637',
      credential: 'V4WfGmTQAcs20RmA'
    },
    {
      urls: 'turn:standard.relay.metered.ca:80?transport=tcp',
      username: '10fb06edf58626673cfcf637',
      credential: 'V4WfGmTQAcs20RmA'
    },
    {
      urls: 'turn:standard.relay.metered.ca:443',
      username: '10fb06edf58626673cfcf637',
      credential: 'V4WfGmTQAcs20RmA'
    },
    {
      urls: 'turns:standard.relay.metered.ca:443?transport=tcp',
      username: '10fb06edf58626673cfcf637',
      credential: 'V4WfGmTQAcs20RmA'
    }
  ]
};
  constructor(private signalR: SignalRService) {}

  async ngOnInit() {
    try {
      await this.signalR.startConnection();
      this.connectionStatus = 'Connected';
      this.setupSignalREvents();
      console.log('✅ Connected');
    } catch (error) {
      console.error('❌ Connection failed:', error);
      this.errorMessage = 'Failed to connect to server';
    }
  }

  ngOnDestroy() {
    this.cleanupSignalREvents();
    this.cleanup();
    this.signalR.disconnect();
  }

  private setupSignalREvents() {
  this.signalR.ConnectionOn('StartCall', async (roomId: string) => {
    console.log('🎯 Initiator:', roomId);
    this.RoomId = roomId;
    this.isInCall = true;
    this.isConnecting = true;
    this.errorMessage = '';

    await this.createAndSendOffer();
  });

  this.signalR.ConnectionOn('ReceiveIceCandidate', async (candidate: string) => {
    console.log('🧊 Received ICE candidate');

    try {
      await this.addIceCandidate(candidate);
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  });

  this.signalR.ConnectionOn('Waiting', () => {
    console.log('⏳ Waiting...');
    this.isInCall = true;
    this.isConnecting = true;
  });

  this.signalR.ConnectionOn('IncomingCall', async (roomId: string) => {
    console.log('📞 Incoming:', roomId);
    this.RoomId = roomId;
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
    

    // await this.startCamera1();
    await this.ensureCameraAndPeerConnection();
    // this.createPeerConnection1();
    await this.signalR.invokeWithoutParams('FindPartner');
  });

  this.signalR.ConnectionOn('ReceiveOffer', async (sdp: string) => {
    console.log('📥 Received offer');
    await this.ensureCameraAndPeerConnection();
    await this.createAndSendAnswer(sdp);
  });

  this.signalR.ConnectionOn('ReceiveAnswer', async (sdp: string) => {
    console.log('📥 Received answer');
    await this.setRemoteDescription(sdp);
  });

  this.signalR.ConnectionOn('Error', (code: string, msg: string) => {
    console.error('❌ Error:', code, msg);
    this.errorMessage = msg;
    this.isConnecting = false;
  });
}

  async skipPartner() {
    if (this.RoomId) {
      this.isConnecting = true;
      this.remoteStreamAvailable = false;
      await this.signalR.invoke('Next', this.RoomId);
      this.cleanupPeerConnection();
      if (this.localStream) {
      this.createPeerConnection1();
    }
    }
  }

  toggleAudio() {
    this.isAudioEnabled = !this.isAudioEnabled;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(t => t.enabled = this.isAudioEnabled);
    }
  }

  toggleVideo() {
    this.isVideoEnabled = !this.isVideoEnabled;
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(t => t.enabled = this.isVideoEnabled);
    }
  }

  async startCamera1() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      if (this.localVideo?.nativeElement) {
        this.localVideo.nativeElement.srcObject = this.localStream;
        // try to play the video; browsers may require a user gesture
        this.localVideo.nativeElement.play().catch(e => console.warn('Play error:', e));
        console.log('✅ Camera started');
      } else {
        // If ViewChild isn't ready yet, schedule a short retry
        setTimeout(() => {
          if (this.localVideo?.nativeElement) {
            this.localVideo.nativeElement.srcObject = this.localStream;
            this.localVideo.nativeElement.play().catch(e => console.warn('Play error:', e));
            console.log('✅ Camera started (delayed)');
          }
        }, 200);
      }

    } catch (error: any) {
      console.error('❌ Camera error:', error);
      throw new Error(`Camera access denied: ${error.message}`);
    }
  }

  // createPeerConnection1() {
  //   if (!this.localStream) {
  //     throw new Error('Camera not started');
  //   }

  //   this.peerConnection = new RTCPeerConnection(this.configuration);

  //   this.localStream.getTracks().forEach(track => {
  //     if (this.peerConnection) {
  //       this.peerConnection.addTrack(track, this.localStream!);
  //     }
  //   });

  //   this.peerConnection.ontrack = (event) => {
  //     console.log('🎥 Remote track');
  //     setTimeout(() => {
  //       if (this.remoteVideo?.nativeElement) {
  //         this.remoteVideo.nativeElement.srcObject = event.streams[0];
  //         this.remoteVideo.nativeElement.play().catch(e => console.warn('Play error:', e));
  //         this.remoteStreamAvailable = true;
  //       }
  //     }, 100);
  //   };

  //   this.peerConnection.onicecandidate = (event) => {
  //     if (event.candidate === null && this.peerConnection) {
  //       this.localSdp = JSON.stringify(this.peerConnection.localDescription);
  //       console.log('✅ SDP ready');
  //     }
  //   };

  //   this.peerConnection.onconnectionstatechange = () => {
  //     if (this.peerConnection?.connectionState === 'connected') {
  //       this.isInCall = true;
  //       this.isConnecting = false;
  //       console.log('✅ Call connected!');
  //     }
  //   };
  // }
  private async ensureCameraAndPeerConnection() {
  if (!this.localStream) {
    await this.startCamera1();
  }

  if (!this.peerConnection) {
    this.createPeerConnection1();
    return;
  }

  const state = this.peerConnection.connectionState;
  const signalingState = this.peerConnection.signalingState;

  if (
    state === 'closed' ||
    state === 'failed' ||
    signalingState === 'closed'
  ) {
    this.cleanupPeerConnection();
    this.createPeerConnection1();
  }
}

  createPeerConnection1() {
  if (!this.localStream) {
    throw new Error('Camera not started');
  }

  this.peerConnection = new RTCPeerConnection(this.configuration);

  this.localStream.getTracks().forEach(track => {
    if (this.peerConnection) {
      this.peerConnection.addTrack(track, this.localStream!);
    }
  });

  this.peerConnection.ontrack = (event) => {
    console.log('🎥 Remote track:', event.track.kind);

    const videoEl = this.remoteVideo?.nativeElement;
    if (!videoEl) return;

    // Only assign srcObject once — reassigning on every ontrack call
    // (it fires separately for audio and video) aborts the prior play() call
    if (videoEl.srcObject !== event.streams[0]) {
      videoEl.srcObject = event.streams[0];

      videoEl.play()
        .then(() => {
          this.remoteStreamAvailable = true;
          console.log('✅ Remote video playing');
        })
        .catch(err => {
          // AbortError here is expected if a second track triggers another
          // load before this resolves — safe to ignore, the next play() will succeed
          if (err.name !== 'AbortError') {
            console.error('❌ Remote play failed:', err);
          }
        });
    }
  };

  this.peerConnection.onicecandidate = async (event) => {
  if (event.candidate && this.RoomId) {
    try {
      console.log('📤 Sending ICE candidate');
      await this.signalR.invoke(
        'SendIceCandidate',
        this.RoomId,
        JSON.stringify(event.candidate)
      );
    } catch (error) {
      console.error('❌ Error sending ICE candidate:', error);
    }
  }

  if (event.candidate === null && this.peerConnection) {
    this.localSdp = JSON.stringify(this.peerConnection.localDescription);
    console.log('✅ SDP ready');
  }
};

  this.peerConnection.onconnectionstatechange = () => {
    if (this.peerConnection?.connectionState === 'connected') {
      this.isInCall = true;
      this.isConnecting = false;
      console.log('✅ Call connected!');
    }
  };
}

  async createAndSendOffer() {
    if (!this.peerConnection) return;
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    await this.waitForIceGathering();
    await this.signalR.invoke('SendOffer', this.RoomId, this.localSdp);
    this.isInCall = true;
    this.isConnecting = false;
    console.log('📤 Offer sent');
  }

  async createAndSendAnswer(remoteSdp: string) {
    if (!this.peerConnection) return;
    const remoteDesc = JSON.parse(remoteSdp);
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(remoteDesc));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    await this.waitForIceGathering();
    await this.signalR.invoke('SendAnswer', this.RoomId, this.localSdp);
    this.isInCall = true;
    this.isConnecting = false;
    console.log('📤 Answer sent');
  }

  async setRemoteDescription(sdp: string) {
    if (!this.peerConnection) return;
    const remoteDesc = JSON.parse(sdp);
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(remoteDesc));
    console.log('✅ Remote set');
  }

  private waitForIceGathering(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.peerConnection) { resolve(); return; }
      if (this.peerConnection.iceGatheringState === 'complete') {
        this.localSdp = JSON.stringify(this.peerConnection.localDescription);
        resolve();
      } else {
        this.peerConnection.onicecandidate = (event) => {
          if (event.candidate === null) {
            this.localSdp = JSON.stringify(this.peerConnection!.localDescription);
            resolve();
          }
        };
      }
    });
  }

   cleanupPeerConnection() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.localSdp = '';
    this.remoteSdp = '';
  }

  private cleanup() {
    this.cleanupPeerConnection();
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
    if (this.localVideo?.nativeElement) {
      this.localVideo.nativeElement.srcObject = null;
    }
    if (this.remoteVideo?.nativeElement) {
      this.remoteVideo.nativeElement.srcObject = null;
    }
    this.remoteStreamAvailable = false;
    this.isInCall = false;
    this.isConnecting = false;
    this.RoomId = '';
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
 async addIceCandidate(candidate: string) {
  if (!this.peerConnection) {
    console.error('❌ Peer connection not initialized');
    return;
  }

  try {
    const candidateObj = JSON.parse(candidate);
    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateObj));
    console.log('✅ ICE candidate added');
  } catch (error) {
    console.error('❌ Error adding ICE candidate:', error);
  }
}
 
}