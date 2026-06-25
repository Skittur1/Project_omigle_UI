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
  private isProcessingOffer = false;
  private pendingCandidates: RTCIceCandidate[] = [];
  configuration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      {
        urls: [
          'turn:openrelay.metered.ca:80',
          'turn:openrelay.metered.ca:443',
          'turn:openrelay.metered.ca:3478'
        ],
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: [
          'turn:turn.anyfirewall.com:443?transport=tcp',
          'turn:turn.anyfirewall.com:443?transport=udp'
        ],
        username: 'webrtc',
        credential: 'webrtc'
      }
    ],
    iceTransportPolicy: 'all'
  };

  constructor(private signalR: SignalRService) {
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
      // Just signal that we're ready, camera should already be started
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

    this.signalR.ConnectionOn('ReceiveIceCandidate', async (candidate: string) => {
      console.log('🧊 Received ICE candidate');
      await this.addIceCandidate(candidate);
    });
  }

  // ─────────────────────────────────────────────────────────────
  // PUBLIC METHODS
  // ─────────────────────────────────────────────────────────────

  async startCamera() {
    if (this.localStream) {
    this.localStreamSubject.next(this.localStream);
    return this.localStream;
    }
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      // Emit local stream to component
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

    // Add local tracks
    this.localStream.getTracks().forEach(track => {
      if (this.peerConnection) {
        this.peerConnection.addTrack(track, this.localStream!);
        console.log(`✅ Added ${track.kind} track`);
      }
    });

    // Handle remote tracks
    this.peerConnection.ontrack = (event) => {
      console.log('🎥 Remote track received:', event.track.kind);
      this.remoteStream = event.streams[0];
      this.remoteStreamSubject.next(this.remoteStream);
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 ICE Candidate:', event.candidate.type);
        // Send ICE candidate to partner
        this.signalR.invoke('SendIceCandidate', this.RoomId, JSON.stringify(event.candidate))
          .catch(err => console.log('⚠️ Could not send ICE candidate:', err));
      }
      if (event.candidate === null && this.peerConnection) {
        this.localSdp = JSON.stringify(this.peerConnection.localDescription);
        console.log('✅ SDP ready');
      }
    };

    // Monitor ICE connection state
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

    // Monitor connection state
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

    console.log('📤 Creating offer...');
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    await this.waitForIceGathering();
    
    console.log('📤 Sending offer...');
    await this.signalR.invoke('SendOffer', this.RoomId, this.localSdp);
    console.log('✅ Offer sent');
  }

  async createAndSendAnswer(remoteSdp: string) {
        if (!this.peerConnection) {
      console.error('❌ Peer connection not initialized');
      return;
    }

    if (this.isProcessingOffer) {
      console.log('⚠️ Already processing offer, ignoring duplicate');
      return;
    }

    if (this.peerConnection.remoteDescription) {
      console.log('⚠️ Remote description already set, ignoring duplicate offer');
      return;
    }

    this.isProcessingOffer = true;
        if (!this.peerConnection) {
          console.error('❌ Peer connection not initialized');
          return;
        }

    console.log('📥 Creating answer...');
    const remoteDesc = JSON.parse(remoteSdp);
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(remoteDesc));
    
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    await this.waitForIceGathering();
    
    console.log('📤 Sending answer...');
    await this.signalR.invoke('SendAnswer', this.RoomId, this.localSdp);
    console.log('✅ Answer sent');
  }

  async setRemoteDescription(sdp: string) {
    if (!this.peerConnection) {
      console.error('❌ Peer connection not initialized');
      return;
    }
    if (this.peerConnection.remoteDescription) {
    console.log('⚠️ Remote description already set, ignoring duplicate answer');
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
    
    try {
      const candidateObj = JSON.parse(candidate);
      const iceCandidate = new RTCIceCandidate(candidateObj);
       if (!this.peerConnection.remoteDescription) {
        console.log('📦 Remote description not set yet, queueing ICE candidate');
        this.pendingCandidates.push(iceCandidate);
        return;
      }
      await this.peerConnection.addIceCandidate(iceCandidate);
      console.log('✅ ICE candidate added');
    } catch (error) {
      console.error('❌ Error adding ICE candidate:', error);
    }
  }

  private waitForIceGathering(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.peerConnection) { resolve(); return; }
      if (this.peerConnection.iceGatheringState === 'complete') {
        this.localSdp = JSON.stringify(this.peerConnection.localDescription);
        resolve();
        return;
      } const checkState = () => {
      if (!this.peerConnection) return;
       if (this.peerConnection.iceGatheringState === 'complete') {
        this.localSdp = JSON.stringify(this.peerConnection.localDescription);
        this.peerConnection.removeEventListener(
          'icegatheringstatechange',
          checkState
        );
        resolve();
      }
    };

    this.peerConnection.addEventListener('icegatheringstatechange', checkState);
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
    this.remoteStream = null;
    this.isProcessingOffer = false;
    this.pendingCandidates = [];
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