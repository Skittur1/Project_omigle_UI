import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { SignalRService } from './signal-r.service';

@Injectable({
  providedIn: 'root'
})
export class WebRTCService {
  
  // Use Subjects to communicate with component
  public localStreamSubject = new Subject<MediaStream>();
  public remoteStreamSubject = new Subject<MediaStream>();
  public iceCandidateSubject = new Subject<string>();
  public connectionStateSubject = new Subject<string>();

  localSdp = '';
  remoteSdp = '';
  localStream: MediaStream | null = null;
  remoteStream: MediaStream | null = null;
  peerConnection: RTCPeerConnection | null = null;
  RoomId = '';

  // UPDATED: New TURN configuration
  configuration: RTCConfiguration = {
  iceServers: [
      {
        urls: "stun:stun.relay.metered.ca:80",
      },
      {
        urls: "turn:standard.relay.metered.ca:80",
        username: "10fb06edf58626673cfcf637",
        credential: "V4WfGmTQAcs20RmA",
      },
      {
        urls: "turn:standard.relay.metered.ca:80?transport=tcp",
        username: "10fb06edf58626673cfcf637",
        credential: "V4WfGmTQAcs20RmA",
      },
      {
        urls: "turn:standard.relay.metered.ca:443",
        username: "10fb06edf58626673cfcf637",
        credential: "V4WfGmTQAcs20RmA",
      },
      {
        urls: "turns:standard.relay.metered.ca:443?transport=tcp",
        username: "10fb06edf58626673cfcf637",
        credential: "V4WfGmTQAcs20RmA",
      },
  
    ],
  };

  constructor(private signalR: SignalRService) {
    
  }
  
  private async safeInvoke(method: string, roomId: string, data: any) {
    if (!this.signalR.isConnected()) {
      console.log('⏳ Waiting for connection...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    await this.signalR.invoke(method, roomId, data);
  }
  
  public init() {
    this.setupSignalREvents();
  }

  // ─────────────────────────────────────────────────────────────
  // SETUP SIGNALR EVENTS
  // ─────────────────────────────────────────────────────────────

  private setupSignalREvents() {
    this.signalR.ConnectionOn('StartCall', async (roomId: string) => {
      console.log('🎯 Initiator - StartCall:', roomId);
      this.RoomId = roomId;
      await this.createAndSendOffer();
    });

    this.signalR.ConnectionOn('IncomingCall', async (roomId: string) => {
      console.log('📞 IncomingCall:', roomId);
      this.RoomId = roomId;
      this.createPeerConnection1();
    });

    this.signalR.ConnectionOn('ReceiveOffer', async (sdp: string) => {
      console.log('📥 Received offer');
      console.log('📥 OFFER SDP FROM SIGNALR:', sdp);
      await this.createAndSendAnswer(sdp);
    });

    this.signalR.ConnectionOn('ReceiveAnswer', async (sdp: string) => {
      console.log('📥 Received answer');
      console.log('📥 Received answer event');
      console.log('📥 ANSWER SDP FROM SIGNALR:', sdp);
      await this.setRemoteDescription(sdp);
    });

    this.signalR.ConnectionOn('ReceiveIceCandidate', async (candidate: string) => {
      console.log('🧊 Received ICE candidate');
      await this.addIceCandidate(candidate);
    });
  }

  // ─────────────────────────────────────────────────────────────
  // PUBLIC METHODS
  // ─────────────────────────────────────────────────────────────

  async startCamera() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      this.localStreamSubject.next(this.localStream);
      console.log('✅ Camera started');
      return this.localStream;
    } catch (error: any) {
      console.error('❌ Camera error:', error);
      throw new Error(`Camera access denied: ${error.message}`);
    }
  }

  async startCall() {
    try {
      await this.startCamera();
      this.createPeerConnection1();
      await this.signalR.invokeWithoutParams('FindPartner');
      console.log('✅ Finding partner...');
    } catch (error) {
      console.error('❌ Error starting call:', error);
      throw error;
    }
  }

  async endCall() {
    if (this.RoomId) {
      try {
        await this.signalR.invoke('Cancel', this.RoomId);
      } catch (error) {
        console.log('⚠️ Could not notify server');
      }
    }
    this.cleanup();
  }

  async skipPartner() {
    if (this.RoomId) {
      try {
        await this.signalR.invoke('Next', this.RoomId);
      } catch (error) {
        console.log('⚠️ Could not skip partner');
      }
      this.cleanupPeerConnection();
    }
  }

  toggleAudio() {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      audioTracks.forEach(t => t.enabled = !t.enabled);
    }
  }

  toggleVideo() {
    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks();
      videoTracks.forEach(t => t.enabled = !t.enabled);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // WEBRTC METHODS
  // ─────────────────────────────────────────────────────────────

  createPeerConnection1() {
    if (!this.localStream) {
      console.error('❌ Local stream not available');
      return;
    }

    if (this.peerConnection) {
      console.log('⚠️ Peer connection already exists, closing...');
      this.peerConnection.close();
      this.peerConnection = null;
    }

    console.log('🔧 Creating peer connection...');
    this.peerConnection = new RTCPeerConnection(this.configuration);

    this.localStream.getTracks().forEach(track => {
      if (this.peerConnection) {
        this.peerConnection.addTrack(track, this.localStream!);
        console.log(`✅ Added ${track.kind} track`);
      }
    });

    this.peerConnection.ontrack = (event) => {
      console.log('🎥 Remote track received:', event.track.kind);
      this.remoteStream = event.streams[0];
      this.remoteStreamSubject.next(this.remoteStream);
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 ICE Candidate:', event.candidate.type);
        this.safeInvoke('SendIceCandidate', this.RoomId, JSON.stringify(event.candidate))
          .catch(err => console.log('⚠️ Could not send ICE candidate:', err));
      }
      if (event.candidate === null && this.peerConnection) {
        this.localSdp = JSON.stringify(this.peerConnection.localDescription);
        console.log('✅ SDP ready');
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState;
      console.log('🧊 ICE State:', state);
      
      if (state === 'connected' || state === 'completed') {
        console.log('✅ ICE connected successfully!');
        this.connectionStateSubject.next('connected');
      }
      
      if (state === 'failed') {
        console.error('❌ ICE connection failed');
        this.connectionStateSubject.next('failed');
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log('🔌 Connection state:', state);
      
      if (state === 'connected') {
        console.log('✅ Call connected!');
        this.connectionStateSubject.next('connected');
      }
    };
  }

  async createAndSendOffer() {
    if (!this.peerConnection) {
      console.error('❌ Peer connection not initialized');
      return;
    }

    try {
      console.log('📤 Creating offer...');
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await this.peerConnection.setLocalDescription(offer);
      await this.waitForIceGathering();
      
      console.log('📤 Sending offer...');
      await this.safeInvoke('SendOffer', this.RoomId, this.localSdp);
      console.log('✅ Offer sent');
    } catch (error) {
      console.error('Error creating offer:', error);
      throw error;
    }
  }

  async createAndSendAnswer(remoteSdp: string) {
    if (!this.peerConnection) {
      console.error('❌ Peer connection not initialized');
      return;
    }

    try {
      // ✅ Check if already has remote description
      if (this.peerConnection.remoteDescription) {
        console.log('⚠️ Remote description already set, ignoring duplicate answer');
        return;
      }

      console.log('📥 Creating answer...');
      const remoteDesc = JSON.parse(remoteSdp);
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(remoteDesc));
      
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      await this.waitForIceGathering();
      
      console.log('📤 Sending answer...');
      await this.safeInvoke('SendAnswer', this.RoomId, this.localSdp);
      console.log('✅ Answer sent');
    } catch (error) {
      console.error('Error creating answer:', error);
      throw error;
    }
  }

  async setRemoteDescription(sdp: string) {
    if (!this.peerConnection) {
      console.error('❌ Peer connection not initialized');
      return;
    }
    
    // ✅ Check if already have remote description
    if (this.peerConnection.remoteDescription) {
      console.log('⚠️ Remote description already set, ignoring duplicate');
      return;
    }
    
    console.log('📥 Setting remote description...');
    const remoteDesc = JSON.parse(sdp);
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(remoteDesc));
    console.log('✅ Remote description set');
  }

  async addIceCandidate(candidate: string) {
    if (!this.peerConnection) {
      console.error('❌ Peer connection not initialized');
      return;
    }
    
    // ✅ Check if remote description exists
    if (!this.peerConnection.remoteDescription) {
      console.log('⚠️ Remote description not set yet, ignoring ICE candidate');
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

  private waitForIceGathering(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.peerConnection) {
        resolve();
        return;
      }
      
      if (this.peerConnection.iceGatheringState === 'complete') {
        this.localSdp = JSON.stringify(this.peerConnection.localDescription);
        resolve();
        return;
      }
      
      const existingHandler = this.peerConnection.onicecandidate;
      
      const iceHandler = (event: RTCPeerConnectionIceEvent) => {
        if (event.candidate === null) {
          this.localSdp = JSON.stringify(this.peerConnection!.localDescription);
          
          if (existingHandler) {
            this.peerConnection!.onicecandidate = existingHandler;
          } else {
            this.peerConnection!.onicecandidate = null;
          }
          
          resolve();
        }
      };
      
      this.peerConnection.onicecandidate = iceHandler;
      
      setTimeout(() => {
        if (this.peerConnection) {
          this.localSdp = JSON.stringify(this.peerConnection.localDescription);
          resolve();
        }
      }, 5000);
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CLEANUP
  // ─────────────────────────────────────────────────────────────

  public cleanupPeerConnection() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.localSdp = '';
    this.remoteSdp = '';
    this.remoteStream = null;
  }

  private cleanup() {
    this.cleanupPeerConnection();
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
    this.RoomId = '';
  }
}