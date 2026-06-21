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
      // STUN servers
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      
      // TURN servers - Free public TURN servers
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
    iceTransportPolicy: 'all' // Try all candidates (host, srflx, relay)
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