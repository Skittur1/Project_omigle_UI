import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FirebaseSignalingService } from '../../../core/services/firebase-signaling.service';
import { WebRTCService } from '../../../core/services/webrtc.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-video-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './video-chat.component.html',
  styleUrls: ['./video-chat.component.css']
})
export class VideoChatComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;
  
  // Firebase-based signaling — no custom backend needed
  private signalRService = inject(FirebaseSignalingService);
  private isCaller = false;
  private webRTCService = inject(WebRTCService);
  private router = inject(Router);
  
  userName = '';
  isConnecting = false;
  isInCall = false;
  partnerId = '';
  isVideoEnabled = true;
  isAudioEnabled = true;
  onlineUsers = 0;
  connectionStatus = false;
  errorMessage = '';
  
  private subscriptions: Subscription[] = [];
  
  ngOnInit() {
    this.setupSubscriptions();
    // Generate random username for testing
    this.userName = `User_${Math.floor(Math.random() * 1000)}`;
  }
  
  ngAfterViewInit() {
    // ViewChild is now available
  }
  
  private setupSubscriptions() {
    // Monitor connection status
    this.subscriptions.push(
      this.signalRService.connectionStatus$.subscribe(status => {
        this.connectionStatus = status;
        console.log('Connection status changed:', status);
        if (!status && this.isInCall) {
          this.endCall();
          this.errorMessage = 'Connection lost. Please reconnect.';
        }
      })
    );
    
    // Monitor online users
    this.subscriptions.push(
      this.signalRService.onlineUsers$.subscribe(count => {
        this.onlineUsers = count;
        console.log('Online users:', count);
      })
    );
    
    // Handle matchmaking — matched$ fires for CALLER when callee joins
    this.subscriptions.push(
      this.signalRService.matched$.subscribe(async (partnerId) => {
        console.log('Matched event received with partner:', partnerId);
        this.partnerId = partnerId;
        this.isInCall = true;
        this.isConnecting = false;
        this.isCaller = this.signalRService.getIsCaller();
        
        if (!this.isCaller) return; // Callee waits for offer via receiveOffer$

        try {
          // Initialize WebRTC
          const localStream = await this.webRTCService.getLocalStream();
          if (this.localVideo && this.localVideo.nativeElement) {
            this.localVideo.nativeElement.srcObject = localStream;
          }
          
          await this.webRTCService.initializePeerConnection(
            (candidate) => this.onIceCandidate(candidate),
            (stream) => this.onRemoteStream(stream)
          );
          
          // Create and send offer
          const offer = await this.webRTCService.createOffer();
          await this.signalRService.sendOffer(partnerId, offer);
          console.log('Offer sent successfully');
        } catch (error) {
          console.error('Error in match setup:', error);
          this.errorMessage = 'Failed to setup video call';
          this.endCall();
        }
      })
    );
    
    // Handle incoming offer — fires for CALLEE
    this.subscriptions.push(
      this.signalRService.receiveOffer$.subscribe(async (offer) => {
        console.log('Received offer');
        this.isInCall = true;
        this.isConnecting = false;
        this.isCaller = false;
        
        try {
          const localStream = await this.webRTCService.getLocalStream();
          if (this.localVideo && this.localVideo.nativeElement) {
            this.localVideo.nativeElement.srcObject = localStream;
          }
          
          await this.webRTCService.initializePeerConnection(
            (candidate) => this.onIceCandidate(candidate),
            (stream) => this.onRemoteStream(stream)
          );
          
          await this.webRTCService.setRemoteDescription(offer);
          const answer = await this.webRTCService.createAnswer();
          if (this.partnerId) {
            await this.signalRService.sendAnswer(this.partnerId, answer);
          }
          console.log('Answer sent successfully');
        } catch (error) {
          console.error('Error handling offer:', error);
        }
      })
    );
    
    // Handle answer
    this.subscriptions.push(
      this.signalRService.receiveAnswer$.subscribe(async (answer) => {
        console.log('Received answer');
        try {
          await this.webRTCService.setRemoteDescription(answer);
          console.log('Remote description set successfully');
        } catch (error) {
          console.error('Error setting remote description:', error);
        }
      })
    );
    
    // Handle ICE candidates
    this.subscriptions.push(
      this.signalRService.receiveCandidate$.subscribe(async (candidate) => {
        console.log('Received ICE candidate');
        try {
          await this.webRTCService.addIceCandidate(candidate);
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      })
    );
    
    // Handle partner leaving
    this.subscriptions.push(
      this.signalRService.partnerLeft$.subscribe(() => {
        console.log('Partner left');
        this.endCall();
        console.log('Your partner has left the chat');
      })
    );
  }
  
  private onIceCandidate(candidate: RTCIceCandidateInit) {
    if (this.partnerId) {
      console.log('Sending ICE candidate, isCaller:', this.isCaller);
      this.signalRService.sendCandidate(this.partnerId, candidate, this.isCaller);
    }
  }
  
  private onRemoteStream(stream: MediaStream) {
    if (this.remoteVideo && this.remoteVideo.nativeElement) {
      console.log('Received remote stream');
      const videoEl = this.remoteVideo.nativeElement;
      videoEl.srcObject = stream;
      videoEl.play().catch(err => console.warn('Video play was interrupted or blocked:', err));
    }
  }
  
  async startVideoChat() {
    if (!this.userName.trim()) {
      this.errorMessage = 'Please enter your name';
      return;
    }
    
    console.log('Starting video chat for user:', this.userName);
    this.isConnecting = true;
    this.errorMessage = '';
    
    const connected = await this.signalRService.startConnection(this.userName);
    if (!connected) {
      this.errorMessage = 'Failed to connect to chat server';
      this.isConnecting = false;
      console.error('Failed to connect');
    } else {
      console.log('Connected successfully, waiting for match...');
    }
  }
  
  async startTextChat() {
    this.router.navigate(['/text-chat'], { queryParams: { name: this.userName } });
  }
  
  toggleVideo() {
    this.isVideoEnabled = !this.isVideoEnabled;
    this.webRTCService.toggleVideo(this.isVideoEnabled);
    console.log('Video toggled:', this.isVideoEnabled);
  }
  
  toggleAudio() {
    this.isAudioEnabled = !this.isAudioEnabled;
    this.webRTCService.toggleAudio(this.isAudioEnabled);
    console.log('Audio toggled:', this.isAudioEnabled);
  }
  
  async endCall() {
    console.log('Ending call');
    this.isInCall = false;
    this.isConnecting = false;
    this.partnerId = '';
    this.webRTCService.closeConnection();
    
    if (this.localVideo && this.localVideo.nativeElement) {
      this.localVideo.nativeElement.srcObject = null;
    }
    if (this.remoteVideo && this.remoteVideo.nativeElement) {
      this.remoteVideo.nativeElement.srcObject = null;
    }
    
    await this.signalRService.disconnect();
  }
  
  skipPartner() {
    console.log('Skipping partner');
    this.endCall();
  }
  
  ngOnDestroy() {
  console.log('Destroying component');
  this.subscriptions.forEach(sub => sub.unsubscribe());
  this.webRTCService.closeConnection();
  this.signalRService.disconnect();
  }
}