import { ElementRef, Injectable, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { SignalRService } from './signal-r.service';

@Injectable({
  providedIn: 'root'
})
export class WebRTCService {


  constructor(SignalRService:SignalRService  ) 
   {
  

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
    
  }

   async startCamera1() {
 
    this.localStream =
      await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
 
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
    };
 
    this.peerConnection.oniceconnectionstatechange =
      () => {
        console.log(
          'ICE State:',
          this.peerConnection.iceConnectionState
        );
      };
  }

}