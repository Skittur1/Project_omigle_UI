// import {
//   Component,
//   ElementRef,
//   ViewChild
// } from '@angular/core';
// import { FormsModule } from '@angular/forms';
 
// @Component({
//   selector: 'app-videostram',
//   imports: [FormsModule
//   ],
  
//   templateUrl:'./videostram.html',
//   styleUrl:'./videostram.scss',
// })
// export class Videostram {
 
//   @ViewChild('localVideo')
//   localVideo!: ElementRef<HTMLVideoElement>;
 
//   @ViewChild('remoteVideo')
//   remoteVideo!: ElementRef<HTMLVideoElement>;
 
//   localSdp = '';
//   remoteSdp = '';
 
//   localStream!: MediaStream;
 
//   peerConnection!: RTCPeerConnection;
 
//   configuration: RTCConfiguration = {
//     iceServers: [
//       {
//         urls: 'stun:stun.l.google.com:19302'
//       },
 
//       // Example TURN
//       {
//         urls: 'turn:YOUR_TURN_SERVER:3478',
//         username: 'user',
//         credential: 'password'
//       }
//     ]
//   };




//   //startCamera inside while calling  fetch 
//    async startCamera1() {
 
//     this.localStream =
//       await navigator.mediaDevices.getUserMedia({
//         video: true,
//         audio: true
//       });
 
//     this.localVideo.nativeElement.srcObject =
//       this.localStream;
//     }
 


//    createPeerConnection1() {
 
//     this.peerConnection =
//       new RTCPeerConnection(this.configuration);
 
//     this.localStream
//       .getTracks()
//       .forEach(track => {
//         this.peerConnection.addTrack(
//           track,
//           this.localStream
//         );
//       });
 
//     this.peerConnection.ontrack = event => {
//       this.remoteVideo.nativeElement.srcObject =
//         event.streams[0];
//     };
 
//     this.peerConnection.onicecandidate = () => {
 
//       if (
//         this.peerConnection.iceGatheringState ===
//         'complete'
//       ) {
 
//         this.localSdp = JSON.stringify(
//           this.peerConnection.localDescription
//         );
//       }
//     };
 
//     this.peerConnection.oniceconnectionstatechange =
//       () => {
//         console.log(
//           'ICE State:',
//           this.peerConnection.iceConnectionState
//         );
//       };
//   }

//   async startCamera() {
 
//     this.localStream =
//       await navigator.mediaDevices.getUserMedia({
//         video: true,
//         audio: true
//       });
 
//     this.localVideo.nativeElement.srcObject =
//       this.localStream;
 
//     this.createPeerConnection();
//   }
 
//   createPeerConnection() {
 
//     this.peerConnection =
//       new RTCPeerConnection(this.configuration);
 
//     this.localStream
//       .getTracks()
//       .forEach(track => {
//         this.peerConnection.addTrack(
//           track,
//           this.localStream
//         );
//       });
 
//     this.peerConnection.ontrack = event => {
//       this.remoteVideo.nativeElement.srcObject =
//         event.streams[0];
//     };
 
//     this.peerConnection.onicecandidate = () => {
 
//       if (
//         this.peerConnection.iceGatheringState ===
//         'complete'
//       ) {
 
//         this.localSdp = JSON.stringify(
//           this.peerConnection.localDescription
//         );
//       }
//     };
 
//     this.peerConnection.oniceconnectionstatechange =
//       () => {
//         console.log(
//           'ICE State:',
//           this.peerConnection.iceConnectionState
//         );
//       };
//   }
 
//   async createOffer() {
 
//     const offer =
//       await this.peerConnection.createOffer();
 
//     await this.peerConnection.setLocalDescription(
//       offer
//     );
//   }
 
//   async createAnswer() {
 
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
 
//   async setRemoteDescription() {
 
//     const remoteDesc =
//       JSON.parse(this.remoteSdp);
 
//     await this.peerConnection.setRemoteDescription(
//       new RTCSessionDescription(remoteDesc)
//     );
//   }
// }