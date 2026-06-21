// import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject, AfterViewInit } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { Router } from '@angular/router';
// import { FirebaseSignalingService } from '../../../core/services/firebase-signaling.service';
// import { WebRTCService } from '../../../core/services/webrtc.service';
// import { Subscription } from 'rxjs';
// import { SignalRService } from '../../../core/services/signal-r.service';


// @Component({
//   selector: 'app-video-chat',
//   standalone: true,
//   imports: [CommonModule, FormsModule],
//   templateUrl: './video-chat.component.html',
//   styleUrls: ['./video-chat.component.css']
// })
// export class VideoChatComponent implements OnInit, AfterViewInit, OnDestroy {
  

//   isAudioEnabled = false;
//   isVideoEnabled= false;
//   isInCall = false;
//   isConnecting = false;
//   errorMessage = '';
//   userName = '';
//   onlineUsers: string[] = [];
//   connectionStatus = '';

//   RoomId = '';
//    constructor(private SignalRService:SignalRService) 
//      {
    
  
//      }
//  async  ngOnInit() {

//     await this.SignalRService.startConnection();

//     // initiator 
//     this.SignalRService.ConnectionOn('startcall', (roomId: any) => {
//       console.log('Received offer:', roomId);
//       this.RoomId = roomId;
//       this.createPeerConnection1();

//       this.SignalRService.invoke('sendOffer',roomId, this.localSdp);

//   });

//   //initiator
//   this.SignalRService.ConnectionOn('waiting', () => {
//       console.log('No Match found');
//   });

//   // partner
//   this.SignalRService.ConnectionOn('incomingcall', (roomId: any) => {
//       console.log('partner roomId - ',roomId);
//       this.RoomId = roomId;
//   });


//   // partner
//   this.SignalRService.ConnectionOn('ReceiveOffer', (sdp: any) => {
//       console.log('initiator sdp:', sdp);
     
//       this.createPeerConnection1();
//       this.createAnswer(sdp);
//       this.SignalRService.invoke('SendAnswer', this.RoomId, this.localSdp);
//   });

//   // initiator
//   this.SignalRService.ConnectionOn('ReceiveAnswer', (sdp: any) => {
//       console.log('partner sdp:', sdp);
     
//       // connect the video
//       this.setRemoteDescription(sdp);
//   });

// }



//   ngAfterViewInit(): void {
//     throw new Error('Method not implemented.');
//   }
//   ngOnDestroy(): void {
//     throw new Error('Method not implemented.');
//   }
//     localSdp = '';
//     remoteSdp = '';
   
//     localStream!: MediaStream;
   
//     peerConnection!: RTCPeerConnection;
  
//     @ViewChild('localVideo')
//     localVideo!: ElementRef<HTMLVideoElement>;
   
//     @ViewChild('remoteVideo')
//     remoteVideo!: ElementRef<HTMLVideoElement>;
     
  
  
//     configuration: RTCConfiguration = {
//       iceServers: [
//         {
//           urls: 'stun:stun.l.google.com:19302'
//         },
   
//         // Example TURN
//         {
//           urls: 'turn:YOUR_TURN_SERVER:3478',
//           username: 'user',
//           credential: 'password'
//         }
//       ]
//     };
  
  
//     OnStartButtonClick() {
//       this.startCamera1();
//       this.createPeerConnection1();
//       this.SignalRService.invoke('FindPartner');
      
//     }
    

  
//      async startCamera1() {
   
//       this.localStream =
//         await navigator.mediaDevices.getUserMedia({
//           video: true,
//           audio: true
//         });
   
//         this.isInCall = true;
//          this.localVideo.nativeElement.srcObject =
//         this.localStream;
//       }
      
  
//     createPeerConnection1() {
   
//       this.peerConnection =
//         new RTCPeerConnection(this.configuration);
   
//       this.localStream
//         .getTracks()
//         .forEach(track => {
//           this.peerConnection.addTrack(
//             track,
//             this.localStream
//           );
//         });
   
//       this.peerConnection.ontrack = event => {
//         this.remoteVideo.nativeElement.srcObject =
//           event.streams[0];
//       };
   
//       this.peerConnection.onicecandidate = () => {
   
//         if (
//           this.peerConnection.iceGatheringState ===
//           'complete'
//         ) {
   
//           this.localSdp = JSON.stringify(
//             this.peerConnection.localDescription
//           );
//         }
//         console.log('ICE Candidate:', this.localSdp);
//       };
   
//       this.peerConnection.oniceconnectionstatechange =
//         () => {
//           console.log(
//             'ICE State:',
//             this.peerConnection.iceConnectionState
//           );
//         };
//     }

//    async  startVideoChat()
//     {

//       await this.SignalRService.invokeWithoutParams('FindPartner');

//       await  this.startCamera1();     
   
//   }

// async setRemoteDescription(sdp: string) {
 
//     const remoteDesc =
//       JSON.parse(sdp);
 
//     await this.peerConnection.setRemoteDescription(
//       new RTCSessionDescription(remoteDesc)
//     );
//   }


//   async createAnswer(remotesdp: string) {
 
//     const remoteDesc =
//       JSON.parse(this.remoteSdp);
 
//     await this.peerConnection.setRemoteDescription(
//       new RTCSessionDescription(remoteDesc)
//     );
 
//     const answer =
//       await this.peerConnection.createAnswer();
 
//     await this.peerConnection.setLocalDescription(
//       answer
//     );
//   }
//   endCall(){

//     this.SignalRService.invoke('Cancel','roomId');
   
//   }

//   nextcall(){

//     this.SignalRService.invoke('Next','roomId');
  
//   }

//   toggleAudio()
//   {
//     this.isAudioEnabled
//   }
//   toggleVideo()
//   {
//     this.isVideoEnabled
//   }

//   skipPartner()
//   {
//      this.SignalRService.invoke('Next','roomId');
//   }

// }



//==================================================================

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
  isWaiting = false;
  errorMessage = '';
  userName = '';
  connectionStatus = 'Disconnected';
  RoomId = '';
  isAudioEnabled = true;
  isVideoEnabled = true;
  
  // Track if WebRTC is connected (independent of SignalR)
  isWebRTCConnected = false;

  // WebRTC
  localSdp = '';
  remoteSdp = '';
  localStream: MediaStream | null = null;
  peerConnection: RTCPeerConnection | null = null;

  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

  configuration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  constructor(private signalR: SignalRService) {}

  async ngOnInit() {
    try {
      await this.signalR.startConnection();
      this.connectionStatus = 'Connected';
      this.setupSignalREvents();
      console.log('✅ Connected');
      
      // Monitor SignalR connection state without affecting WebRTC
      this.signalR.connectionState$.subscribe(state => {
        console.log('📡 SignalR state changed:', state);
        // Don't change UI state if WebRTC is already connected
        if (!this.isWebRTCConnected) {
          this.connectionStatus = state === signalR.HubConnectionState.Connected ? 'Connected' : 'Disconnected';
        }
      });
    } catch (error) {
      console.error('❌ Connection failed:', error);
      this.errorMessage = 'Failed to connect to server';
    }
  }

  ngOnDestroy() {
    this.cleanup();
    this.signalR.disconnect();
  }

  // ─────────────────────────────────────────────────────────────
  // SIGNALR EVENTS
  // ─────────────────────────────────────────────────────────────

  private setupSignalREvents() {
    this.signalR.ConnectionOn('StartCall', async (roomId: string) => {
      console.log('🎯 Initiator:', roomId);
      this.RoomId = roomId;
      this.isWaiting = false;
      await this.createAndSendOffer();
    });

    this.signalR.ConnectionOn('Waiting', () => {
      console.log('⏳ Waiting for partner...');
      this.isConnecting = false;
      this.isWaiting = true;
    });

    this.signalR.ConnectionOn('IncomingCall', async (roomId: string) => {
      console.log('📞 Incoming:', roomId);
      this.RoomId = roomId;
      this.isInCall = true;
      this.isConnecting = false;
      this.isWaiting = false;
      // Camera already started, just create peer connection
      this.createPeerConnection1();
    });

    this.signalR.ConnectionOn('ReceiveOffer', async (sdp: string) => {
      console.log('📥 Received offer');
      await this.createAndSendAnswer(sdp);
    });

    this.signalR.ConnectionOn('ReceiveAnswer', async (sdp: string) => {
      console.log('📥 Received answer');
      await this.setRemoteDescription(sdp);
    });

    this.signalR.ConnectionOn('PartnerLeft', () => {
      console.log('👋 Partner left');
      // Only clean up if WebRTC is not connected
      if (!this.isWebRTCConnected) {
        this.isInCall = false;
        this.isConnecting = false;
        this.isWaiting = false;
        this.cleanupPeerConnection();
        this.errorMessage = 'Partner disconnected. Click Start again.';
      }
    });

    this.signalR.ConnectionOn('Error', (code: string, msg: string) => {
      console.error('❌ Server error:', code, msg);
      // Don't show error if WebRTC is already connected
      if (!this.isWebRTCConnected) {
        this.errorMessage = msg;
        this.isConnecting = false;
        this.isWaiting = false;
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UI ACTIONS
  // ─────────────────────────────────────────────────────────────

  async startVideoChat() {
    try {
      this.isConnecting = true;
      this.isWaiting = false;
      this.isWebRTCConnected = false;
      this.errorMessage = '';
      
      // Start camera first
      await this.startCamera1();
      
      // Create peer connection
      this.createPeerConnection1();
      
      // Find partner
      await this.signalR.invoke('FindPartner');
      
    } catch (error: any) {
      console.error('❌ Error:', error);
      this.errorMessage = error.message || 'Failed to start';
      this.isConnecting = false;
      this.isWaiting = false;
      this.cleanup();
    }
  }

  async endCall() {
    // Close WebRTC first
    this.cleanupPeerConnection();
    this.isWebRTCConnected = false;
    
    // Then notify server if in room
    if (this.RoomId) {
      try {
        await this.signalR.invoke('Cancel', this.RoomId);
      } catch (error) {
        console.log('⚠️ Could not notify server (may be disconnected)');
      }
    }
    
    this.cleanup();
  }

  async skipPartner() {
    if (this.RoomId) {
      this.isConnecting = true;
      this.isWaiting = false;
      this.isWebRTCConnected = false;
      this.cleanupPeerConnection();
      
      try {
        await this.signalR.invoke('Next', this.RoomId);
      } catch (error) {
        console.log('⚠️ Could not skip partner (may be disconnected)');
        // If SignalR is disconnected, just restart
        this.startVideoChat();
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

  // ─────────────────────────────────────────────────────────────
  // WEBRTC METHODS - These work independently of SignalR
  // ─────────────────────────────────────────────────────────────

  async startCamera1() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      setTimeout(() => {
        if (this.localVideo?.nativeElement) {
          this.localVideo.nativeElement.srcObject = this.localStream;
          this.localVideo.nativeElement.play().catch(e => console.warn('Play error:', e));
          console.log('✅ Camera started');
        }
      }, 100);

    } catch (error: any) {
      console.error('❌ Camera error:', error);
      throw new Error(`Camera access denied: ${error.message}`);
    }
  }

  createPeerConnection1() {
    if (!this.localStream) {
      throw new Error('Camera not started');
    }

    this.peerConnection = new RTCPeerConnection(this.configuration);

    // Add local tracks
    this.localStream.getTracks().forEach(track => {
      if (this.peerConnection) {
        this.peerConnection.addTrack(track, this.localStream!);
      }
    });

    // Handle remote tracks
    this.peerConnection.ontrack = (event) => {
      console.log('🎥 Remote track received');
      setTimeout(() => {
        if (this.remoteVideo?.nativeElement) {
          this.remoteVideo.nativeElement.srcObject = event.streams[0];
          this.remoteVideo.nativeElement.play().catch(e => console.warn('Play error:', e));
        }
      }, 100);
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate === null && this.peerConnection) {
        this.localSdp = JSON.stringify(this.peerConnection.localDescription);
        console.log('✅ SDP ready');
      }
    };

    // ✅ Monitor WebRTC connection state - independent of SignalR
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log('🔌 WebRTC state:', state);
      
      if (state === 'connected') {
        this.isInCall = true;
        this.isConnecting = false;
        this.isWaiting = false;
        this.isWebRTCConnected = true;
        this.connectionStatus = 'Connected (P2P)';
        console.log('✅ WebRTC Peer-to-Peer connected!');
      } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        this.isWebRTCConnected = false;
        console.log('⚠️ WebRTC disconnected');
        // Only clean up if not already cleaning
        if (state !== 'closed') {
          this.cleanupPeerConnection();
        }
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState;
      console.log('🧊 ICE state:', state);
      
      if (state === 'connected' || state === 'completed') {
        console.log('✅ ICE connected');
      }
    };
  }

  async createAndSendOffer() {
    if (!this.peerConnection) return;
    
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    await this.waitForIceGathering();
    
    try {
      await this.signalR.invoke('SendOffer', this.RoomId, this.localSdp);
      console.log('📤 Offer sent');
    } catch (error) {
      console.log('⚠️ Could not send offer (SignalR may be disconnected)');
      // Show error but don't break
      this.errorMessage = 'Failed to send offer. Please try again.';
    }
  }

  async createAndSendAnswer(remoteSdp: string) {
    if (!this.peerConnection) return;
    
    const remoteDesc = JSON.parse(remoteSdp);
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(remoteDesc));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    await this.waitForIceGathering();
    
    try {
      await this.signalR.invoke('SendAnswer', this.RoomId, this.localSdp);
      console.log('📤 Answer sent');
    } catch (error) {
      console.log('⚠️ Could not send answer (SignalR may be disconnected)');
      this.errorMessage = 'Failed to send answer. Please try again.';
    }
  }

  async setRemoteDescription(sdp: string) {
    if (!this.peerConnection) return;
    const remoteDesc = JSON.parse(sdp);
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(remoteDesc));
    console.log('✅ Remote description set');
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

  // ─────────────────────────────────────────────────────────────
  // CLEANUP
  // ─────────────────────────────────────────────────────────────

  private cleanupPeerConnection() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.localSdp = '';
    this.remoteSdp = '';
    this.isWebRTCConnected = false;
    this.connectionStatus = 'Connected';
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
    this.isInCall = false;
    this.isConnecting = false;
    this.isWaiting = false;
    this.RoomId = '';
  }
}