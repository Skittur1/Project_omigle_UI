import { Injectable } from '@angular/core';
import { Subject,BehaviorSubject } from 'rxjs';


// ─────────────────────────────────────────────────────────────
// Real SignalR Service — connects to the .NET backend over the
// network so two different devices can be matched and exchange
// WebRTC signaling data.
//
// ⚠️  If accessing from another device on the LAN, change
//     connectionUrl below to your host machine's network IP,
//     e.g. 'http://192.168.1.10:5001/chatHub'
// ─────────────────────────────────────────────────────────────
import * as signalR from '@microsoft/signalr';

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private hubConnection!: signalR.HubConnection;
  // Change 'localhost' to your PC's LAN IP when testing from another device
  private connectionUrl = 'http://138.252.100.148:8126/hub/v1';

 

  async startConnection() {
    
      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(this.connectionUrl)
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Information)
        .build();

     
      await this.hubConnection.start();

      this.hubConnection.onreconnected(() => {
        console.log('Reconnected to SignalR hub');
      });

      this.hubConnection.onclose(() => {
        console.log('Disconnected from SignalR hub');
      }); 
      console.log('SignalR connection established');
     
  }



  ConnectionOn(MethodName: string, callback: (roomid:any,sdp:any  ) => void) {
       this.hubConnection.on(MethodName,callback);
  }

  connectionOff(MethodName: string) {
    this.hubConnection.off(MethodName);
  }
 
 async invokeWithoutParams<T>(methodName: string){
    if (this.hubConnection) {
      this.hubConnection.invoke<T>(methodName);
    }

  }

  async invoke<T>(methodName: string, roomid?: any,sdp?:any){
    if (this.hubConnection) {
      this.hubConnection.invoke<T>(methodName, roomid, sdp);
    }

  }


  async disconnect() {
    if (this.hubConnection) {
      await this.hubConnection.stop();
    }
  }
}
