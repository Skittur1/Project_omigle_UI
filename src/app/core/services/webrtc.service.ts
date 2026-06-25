import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { SignalRService } from './signal-r.service';

@Injectable({
  providedIn: 'root'
})
export class WebRTCService {
  public localStreamSubject = new Subject<MediaStream>();
  public remoteStreamSubject = new Subject<MediaStream>();
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
      {
        urls: 'stun:stun.relay.metered.ca:80',
      },
      {
        urls: 'turn:standard.relay.metered.ca:80',
        username: '10fb06edf58626673cfcf637',
        credential: 'V4WfGmTQAcs20RmA',
      },
      {
        urls: 'turn:standard.relay.metered.ca:80?transport=tcp',
        username: '10fb06edf58626673cfcf637',
        credential: 'V4WfGmTQAcs20RmA',
      },
      {
        urls: 'turn:standard.relay.metered.ca:443',
        username: '10fb06edf58626673cfcf637',
        credential: 'V4WfGmTQAcs20RmA',
      },
      {
        urls: 'turns:standard.relay.metered.ca:443?transport=tcp',
        username: '10fb06edf58626673cfcf637',
        credential: 'V4WfGmTQAcs20RmA',
      },
    ],
  };

  constructor(private signalR: SignalRService) {}

  private async safeInvoke(method: string, roomId: string, data?: any) {
    const connected = await this.signalR.waitUntilConnected(10, 500);

    if (!connected) {
      throw new Error(`SignalR not connected. Cannot invoke ${method}`);
    }

    if (data !== undefined) {
      await this.signalR.invoke(method, roomId, data);
    } else {
      await this.signalR.invoke(method, roomId);
    }
  }

  async startCamera() {
    try {
      // if already available, reuse
      if (this.localStream) {
        this.localStreamSubject.next(this.localStream);
        return this.localStream;
      }

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

  createPeerConnection1() {
    if (!this.localStream) {
      console.error('❌ Local stream not available');
      return;
    }

    // If already connected / connecting, reuse
    if (this.peerConnection) {
      const state = this.peerConnection.connectionState;
      const signalingState = this.peerConnection.signalingState;

      if (
        state === 'connected' ||
        state === 'connecting' ||
        signalingState === 'have-local-offer' ||
        signalingState === 'have-remote-offer'
      ) {
        console.log('⚠️ Peer connection already exists, reusing it');
        return;
      }

      try {
        this.peerConnection.close();
      } catch (error) {
        console.error('Error closing old peer connection:', error);
      }

      this.peerConnection = null;
    }

    this.isProcessingOffer = false;
    this.pendingCandidates = [];
    this.localSdp = '';
    this.remoteSdp = '';
    this.remoteStream = new MediaStream();

    console.log('🔧 Creating peer connection...');
    this.peerConnection = new RTCPeerConnection(this.configuration);

    // Add local tracks
    this.localStream.getTracks().forEach(track => {
      this.peerConnection!.addTrack(track, this.localStream!);
    });

    // Remote track handler
    this.peerConnection.ontrack = (event: RTCTrackEvent) => {
      console.log('🎥 Remote track received:', event.streams);

      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }

      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach(track => {
          const alreadyExists = this.remoteStream!
            .getTracks()
            .some(t => t.id === track.id);

          if (!alreadyExists) {
            this.remoteStream!.addTrack(track);
          }
        });
      } else if (event.track) {
        const alreadyExists = this.remoteStream!
          .getTracks()
          .some(t => t.id === event.track.id);

        if (!alreadyExists) {
          this.remoteStream!.addTrack(event.track);
        }
      }

      this.remoteStreamSubject.next(this.remoteStream!);
    };

    // Send ICE candidates to other peer via SignalR
    this.peerConnection.onicecandidate = async (event) => {
      if (event.candidate && this.RoomId) {
        try {
          console.log('🧊 Sending ICE candidate');
          await this.safeInvoke(
            'SendIceCandidate',
            this.RoomId,
            JSON.stringify(event.candidate)
          );
        } catch (error) {
          console.error('❌ Error sending ICE candidate:', error);
        }
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState || '';
      console.log('🔗 Connection state:', state);
      this.connectionStateSubject.next(state);
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('🧊 ICE connection state:', this.peerConnection?.iceConnectionState);
    };

    this.peerConnection.onsignalingstatechange = () => {
      console.log('📡 Signaling state:', this.peerConnection?.signalingState);
    };

    this.peerConnection.onicegatheringstatechange = () => {
      console.log('📦 ICE gathering state:', this.peerConnection?.iceGatheringState);
    };
  }

  async createAndSendOffer() {
    if (!this.peerConnection) {
      console.error('❌ Peer connection not initialized');
      return;
    }

    // if remote description already exists, offer already done
    if (this.peerConnection.remoteDescription) {
      console.log('⚠️ Already have remote description, not creating offer again');
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
      this.localSdp = JSON.stringify(this.peerConnection.localDescription);

      console.log('📤 Sending offer...');
      await this.safeInvoke('SendOffer', this.RoomId, this.localSdp);
      console.log('✅ Offer sent');
    } catch (error) {
      console.error('❌ Error creating offer:', error);
      throw error;
    }
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

    // If already handled an offer, ignore duplicate
    if (
      this.peerConnection.remoteDescription &&
      this.peerConnection.signalingState !== 'stable'
    ) {
      console.log('⚠️ Offer already being/been handled, ignoring duplicate');
      return;
    }

    this.isProcessingOffer = true;

    try {
      const remoteDesc = JSON.parse(remoteSdp);

      // If remote description already exists, ignore duplicate
      if (this.peerConnection.remoteDescription) {
        console.log('⚠️ Remote description already set, ignoring duplicate offer');
        this.isProcessingOffer = false;
        return;
      }

      console.log('📥 Setting remote offer...');
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(remoteDesc)
      );

      console.log('📤 Creating answer...');
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      await this.waitForIceGathering();
      this.localSdp = JSON.stringify(this.peerConnection.localDescription);

      console.log('📤 Sending answer...');
      await this.safeInvoke('SendAnswer', this.RoomId, this.localSdp);
      console.log('✅ Answer sent');

      // Add any pending candidates received before remote description was set
      if (this.pendingCandidates.length > 0) {
        console.log(`📥 Adding ${this.pendingCandidates.length} pending ICE candidates...`);
        for (const candidate of this.pendingCandidates) {
          try {
            await this.peerConnection.addIceCandidate(candidate);
          } catch (error) {
            console.error('❌ Error adding pending candidate:', error);
          }
        }
        this.pendingCandidates = [];
      }
    } catch (error) {
      console.error('❌ Error creating answer:', error);
      throw error;
    } finally {
      this.isProcessingOffer = false;
    }
  }

  async setRemoteDescription(sdp: string) {
    if (!this.peerConnection) {
      console.error('❌ Peer connection not initialized');
      return;
    }

    // Answer already set
    if (this.peerConnection.remoteDescription) {
      console.log('⚠️ Remote description already set, ignoring duplicate answer');
      return;
    }

    try {
      console.log('📥 Setting remote description...');
      const remoteDesc = JSON.parse(sdp);

      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(remoteDesc)
      );

      console.log('✅ Remote description set');

      // Add pending candidates after remote description is set
      if (this.pendingCandidates.length > 0) {
        console.log(`📥 Adding ${this.pendingCandidates.length} pending ICE candidates...`);
        for (const candidate of this.pendingCandidates) {
          try {
            await this.peerConnection.addIceCandidate(candidate);
          } catch (error) {
            console.error('❌ Error adding pending candidate:', error);
          }
        }
        this.pendingCandidates = [];
      }
    } catch (error) {
      console.error('❌ Error setting remote description:', error);
      throw error;
    }
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
      if (!this.peerConnection) {
        resolve();
        return;
      }

      if (this.peerConnection.iceGatheringState === 'complete') {
        this.localSdp = JSON.stringify(this.peerConnection.localDescription);
        resolve();
        return;
      }

      const checkState = () => {
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

      // fallback timeout
      setTimeout(() => {
        if (this.peerConnection) {
          this.localSdp = JSON.stringify(this.peerConnection.localDescription);
        }
        resolve();
      }, 3000);
    });
  }

  toggleAudio() {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
    }
  }

  toggleVideo() {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
    }
  }

  async endCall() {
    if (this.RoomId) {
      try {
        await this.signalR.invoke('Cancel', this.RoomId);
      } catch (error) {
        console.log('⚠️ Could not notify server for cancel');
      }
    }

    this.cleanup();
  }

  async skipPartner() {
    if (this.RoomId) {
      try {
        await this.signalR.invoke('Next', this.RoomId);
      } catch (error) {
        console.log('⚠️ Could not notify server for next');
      }
    }

    this.cleanupPeerConnection();
  }

  public cleanupPeerConnection() {
    if (this.peerConnection) {
      try {
        this.peerConnection.ontrack = null;
        this.peerConnection.onicecandidate = null;
        this.peerConnection.onconnectionstatechange = null;
        this.peerConnection.oniceconnectionstatechange = null;
        this.peerConnection.onsignalingstatechange = null;
        this.peerConnection.onicegatheringstatechange = null;
        this.peerConnection.close();
      } catch (error) {
        console.error('Error closing peer connection:', error);
      }
    }

    this.peerConnection = null;
    this.localSdp = '';
    this.remoteSdp = '';
    this.remoteStream = null;
    this.isProcessingOffer = false;
    this.pendingCandidates = [];
  }

  private cleanup() {
    this.cleanupPeerConnection();

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    this.RoomId = '';
  }
}