import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FirebaseSignalingService } from '../../../core/services/firebase-signaling.service';
import { WebRTCService } from '../../../core/services/webrtc.service';
import { Subscription } from 'rxjs';
import { SignalRService } from '../../../core/services/signal-r.service';


@Component({
  selector: 'app-video-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './video-chat.component.html',
  styleUrls: ['./video-chat.component.css']
})
export class VideoChatComponent implements OnInit, AfterViewInit, OnDestroy {
  

  isAudioEnabled = false;
  isVideoEnabled= false;
  isInCall = false;
  isConnecting = false;
  errorMessage = '';
  userName = '';
  onlineUsers: string[] = [];
  connectionStatus = '';

  RoomId = '';
   constructor(private SignalRService:SignalRService) 
     {
    
  
     }
 async  ngOnInit() {

    await this.SignalRService.startConnection();

    // initiator 
    this.SignalRService.ConnectionOn('startcall', (roomId: any) => {
      console.log('Received offer:', roomId);
      this.RoomId = roomId;
      this.createPeerConnection1();

      this.SignalRService.invoke('sendOffer',roomId, this.localSdp);

  });

  //initiator
  this.SignalRService.ConnectionOn('waiting', () => {
      console.log('No Match found');
  });

  // partner
  this.SignalRService.ConnectionOn('incomingcall', (roomId: any) => {
      console.log('partner roomId - ',roomId);
      this.RoomId = roomId;
  });


  // partner
  this.SignalRService.ConnectionOn('ReceiveOffer', (sdp: any) => {
      console.log('initiator sdp:', sdp);
     
      this.createPeerConnection1();
      this.createAnswer(sdp);
      this.SignalRService.invoke('SendAnswer', this.RoomId, this.localSdp);
  });

  // initiator
  this.SignalRService.ConnectionOn('ReceiveAnswer', (sdp: any) => {
      console.log('partner sdp:', sdp);
     
      // connect the video
      this.setRemoteDescription(sdp);
  });

}



  ngAfterViewInit(): void {
    throw new Error('Method not implemented.');
  }
  ngOnDestroy(): void {
    throw new Error('Method not implemented.');
  }
    localSdp = '';
    remoteSdp = '';
   
    localStream!: MediaStream;
   
    peerConnection!: RTCPeerConnection;
  
    @ViewChild('localVideo')
    localVideo!: ElementRef<HTMLVideoElement>;
   
    @ViewChild('remoteVideo')
    remoteVideo!: ElementRef<HTMLVideoElement>;
     
  
  
    configuration: RTCConfiguration = {
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302'
        },
   
        // Example TURN
        {
          urls: 'turn:YOUR_TURN_SERVER:3478',
          username: 'user',
          credential: 'password'
        }
      ]
    };
  
  
    OnStartButtonClick() {
      this.startCamera1();
      this.createPeerConnection1();
      this.SignalRService.invoke('FindPartner');
      
    }
    

  
     async startCamera1() {
   
      this.localStream =
        await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
   
        this.isInCall = true;
         this.localVideo.nativeElement.srcObject =
        this.localStream;
      }
      
  
    createPeerConnection1() {
   
      this.peerConnection =
        new RTCPeerConnection(this.configuration);
   
      this.localStream
        .getTracks()
        .forEach(track => {
          this.peerConnection.addTrack(
            track,
            this.localStream
          );
        });
   
      this.peerConnection.ontrack = event => {
        this.remoteVideo.nativeElement.srcObject =
          event.streams[0];
      };
   
      this.peerConnection.onicecandidate = () => {
   
        if (
          this.peerConnection.iceGatheringState ===
          'complete'
        ) {
   
          this.localSdp = JSON.stringify(
            this.peerConnection.localDescription
          );
        }
        console.log('ICE Candidate:', this.localSdp);
      };
   
      this.peerConnection.oniceconnectionstatechange =
        () => {
          console.log(
            'ICE State:',
            this.peerConnection.iceConnectionState
          );
        };
    }

   async  startVideoChat()
    {

      await this.SignalRService.invokeWithoutParams('FindPartner');

      await  this.startCamera1();     
   
  }

async setRemoteDescription(sdp: string) {
 
    const remoteDesc =
      JSON.parse(sdp);
 
    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(remoteDesc)
    );
  }


  async createAnswer(remotesdp: string) {
 
    const remoteDesc =
      JSON.parse(this.remoteSdp);
 
    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(remoteDesc)
    );
 
    const answer =
      await this.peerConnection.createAnswer();
 
    await this.peerConnection.setLocalDescription(
      answer
    );
  }
  endCall(){

    this.SignalRService.invoke('Cancel','roomId');
   
  }

  nextcall(){

    this.SignalRService.invoke('Next','roomId');
  
  }

  toggleAudio()
  {
    this.isAudioEnabled
  }
  toggleVideo()
  {
    this.isVideoEnabled
  }

  skipPartner()
  {
     this.SignalRService.invoke('Next','roomId');
  }

}