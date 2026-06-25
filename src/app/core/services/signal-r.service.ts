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
    if (
      this.hubConnection &&
      this.hubConnection.state !== signalR.HubConnectionState.Disconnected
    ) {
      return;
    }
    
      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(this.connectionUrl)
        // .withAutomaticReconnect()
        .withAutomaticReconnect([0, 2000, 5000, 10000])
        .configureLogging(signalR.LogLevel.Information)
        .build();

     
      await this.hubConnection.start();
      console.log('SignalR connection established');  

      // this.hubConnection.onreconnected(() => {
      //   console.log('Reconnected to SignalR hub');
      // });

      this.hubConnection.onclose(() => {
        console.log('Disconnected from SignalR hub');
      }); 
      console.log('SignalR connection established');
     
  }



  ConnectionOn(MethodName: string, callback:any) {
    if (!this.hubConnection) {
      console.warn(`Hub connection not initialized for event: ${MethodName}`);
      return;
    } this.hubConnection.off(MethodName);
       this.hubConnection.on(MethodName,callback);
  }

  connectionOff(MethodName: string) {
    this.hubConnection.off(MethodName);
  }
 
 async invokeWithoutParams<T>(methodName: string): Promise<T> {
    
      return await this.hubConnection.invoke<T>(methodName);

  }

  async invoke<T>(methodName: string, roomid?: any,sdp?:any){
    if (!this.hubConnection) {
      throw new Error('Hub connection not initialized');
    }
    if (sdp !== undefined) {
      return await this.hubConnection.invoke<T>(methodName, roomid, sdp);
    }
    if (roomid !== undefined) {
      return await this.hubConnection.invoke<T>(methodName, roomid);
    }
      return await this.hubConnection.invoke<T>(methodName);

  }


  async disconnect() {
    if (this.hubConnection) {
      await this.hubConnection.stop();
    }
  }
  isConnected(): boolean {
    return this.hubConnection?.state === signalR.HubConnectionState.Connected;
  }

}
