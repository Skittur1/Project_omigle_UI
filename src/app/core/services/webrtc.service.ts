import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WebRTCService {
  private peerConnection!: RTCPeerConnection;
  private localStream!: MediaStream;
  private remoteStream = new MediaStream();
  private iceCandidateQueue: RTCIceCandidateInit[] = [];
  private remoteDescriptionSet = false;
  
  private iceCandidateSubject = new Subject<RTCIceCandidateInit>();
  private trackSubject = new Subject<MediaStream>();
  private connectionStateSubject = new Subject<RTCPeerConnectionState>();
  
  public iceCandidate$ = this.iceCandidateSubject.asObservable();
  public track$ = this.trackSubject.asObservable();
  public connectionState$ = this.connectionStateSubject.asObservable();

  async initializePeerConnection(onIceCandidate: (candidate: RTCIceCandidateInit) => void,
onTrack: (stream: MediaStream) => void
  ): Promise<RTCPeerConnection> {
    console.log("INITIALIZE PEER CONNECTION CALLED");
    
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10
    };

    this.peerConnection = new RTCPeerConnection(configuration);
    console.log("GGSINNGH",this.peerConnection);
    this.remoteDescriptionSet = false;

    // Add local tracks if available
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('ICE candidate generated:', event.candidate.type);
        onIceCandidate(event.candidate);
        this.iceCandidateSubject.next(event.candidate);
      }
    };

    // Handle remote track
    this.peerConnection.ontrack = (event) => {
      console.log('Remote track received');
      this.remoteStream = event.streams[0];
      onTrack(this.remoteStream);
      this.trackSubject.next(this.remoteStream);
    };

    // Monitor connection state
    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection.connectionState);
      this.connectionStateSubject.next(this.peerConnection.connectionState);
      
      if (this.peerConnection.connectionState === 'connected') {
        console.log(' WebRTC connection established successfully!');
      } else if (this.peerConnection.connectionState === 'failed') {
        console.error(' WebRTC connection failed');
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', this.peerConnection.iceConnectionState);
    };

    return this.peerConnection;
  }

  async getLocalStream(): Promise<MediaStream> {
    try {
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }
      
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      console.log(' Local stream obtained');
      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.peerConnection.createOffer({
      offerToReceiveVideo: true,
      offerToReceiveAudio: true
    });
    await this.peerConnection.setLocalDescription(offer);
    console.log('✅ Offer created');
    return offer;
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    console.log('✅ Answer created');
    return answer;
  }

  async setRemoteDescription(description: RTCSessionDescriptionInit) {
    console.log('Setting remote description:', description.type);
    await this.peerConnection.setRemoteDescription(description);
    this.remoteDescriptionSet = true;
    
    // Process queued ICE candidates
    if (this.iceCandidateQueue.length > 0) {
      console.log(`Processing ${this.iceCandidateQueue.length} queued ICE candidates`);
      for (const candidate of this.iceCandidateQueue) {
        try {
          await this.peerConnection.addIceCandidate(candidate);
        } catch (error) {
          console.error('Error adding queued candidate:', error);
        }
      }
      this.iceCandidateQueue = [];
    }
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (!candidate || !candidate.candidate) return;

    if (!this.remoteDescriptionSet) {
      console.log('Queueing ICE candidate');
      this.iceCandidateQueue.push(candidate);
      return;
    }

    try {
      await this.peerConnection.addIceCandidate(candidate);
      console.log('✅ ICE candidate added');
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }

  toggleVideo(enable: boolean) {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = enable;
        console.log('Video:', enable ? 'ON' : 'OFF');
      }
    }
  }

  toggleAudio(enable: boolean) {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = enable;
        console.log('Audio:', enable ? 'ON' : 'OFF');
      }
    }
  }

  closeConnection() {
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    this.remoteDescriptionSet = false;
    this.iceCandidateQueue = [];
    console.log('Connection closed');
  }

  getLocalStreamRef(): MediaStream | null {
    return this.localStream;
  }
}