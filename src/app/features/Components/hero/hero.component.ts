import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../../core/services/data.service';
import { GlobeVisualizationComponent } from '../globe-visualization/globe-visualization.component';
import { LiveActivityComponent } from '../live-activity/live-activity.component';
import { Router } from '@angular/router';
import { SignalRService } from '../../../core/services/signal-r.service';
import { ignoreElements } from 'rxjs';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [
    CommonModule,
    GlobeVisualizationComponent,
    LiveActivityComponent
  ],
  templateUrl: './hero.component.html'
})
export class HeroComponent implements OnInit {
  protected data = inject(DataService);
  constructor( private router:Router,private signalRService: SignalRService  ) {} 
  
  
 async  ngOnInit() {

  //   await this.signalRService.startConnection();

  //  await this.signalRService.ConnectionOn('FindPartner', () => {
  //     console.log('Matched with partner:');
      
  //   });
  //   await this.signalRService.ConnectionOn('StartCall', (roomId: any) => {
  //     console.log('Received offer:', roomId);


  //      const mysdp=this.GenarateIceCandidate();

      
  //      this.signalRService.invoke('SendOffer',mysdp,roomId).then(() => {
  //     console.log('Matched with partner:');
  //      })
  //     });

  //   await this.signalRService.ConnectionOn('ReceiveAnswer', (roomId: any) => {
  //     console.log('Received answer:', roomId);
  //   });
  //   await this.signalRService.ConnectionOn('ReceiveOffer', (sdp: any) => {
  //     console.log('Received ICE candidate:', sdp);

  //     const mysdp=this.GenarateIceCandidate();

  //     this.signalRService.invoke('SendAnswer', mysdp).then(() => {
  //       console.log('Answer sent successfully');
  //     });
  //   });
    
  }
   
  



 async goToVideoChat() {

  this.router.navigate(['/video-chat']);
  const res= await this.signalRService.invoke('FindPartner', () => {
      console.log('Matched with partner:');
      
    });
   
      await this.signalRService.invoke('SendOffer', () => {
      console.log('Matched with partner:');
      
    });
    
  
}

GenarateIceCandidate():Promise<string> {
  return new Promise((resolve, reject) => {
    const peerConnection = new RTCPeerConnection();
  
  
});
}
}