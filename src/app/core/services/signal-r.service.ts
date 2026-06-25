import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import * as signalR from '@microsoft/signalr';

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private hubConnection!: signalR.HubConnection;
  private connectionUrl = 'http://138.252.100.148:8126/hub/v1';
  private keepAliveInterval: any;

  async startConnection() {
    if (this.hubConnection && this.hubConnection.state !== signalR.HubConnectionState.Disconnected) {
      return;
    } 
    
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.connectionUrl)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.hubConnection.onclose(() => {
      console.log('Disconnected from SignalR hub');
      this.stopKeepAlive();
    });

    this.hubConnection.onreconnected(() => {
      console.log('Reconnected to SignalR hub');
      this.startKeepAlive();
    });

    await this.hubConnection.start();
    console.log('SignalR connection established');
    this.startKeepAlive();
  }

  // ✅ Add keep-alive to prevent server timeout
  private startKeepAlive() {
    this.stopKeepAlive();
    this.keepAliveInterval = setInterval(() => {
      if (this.isConnected()) {
        // Send a ping to keep connection alive
        this.invoke('Ping').catch(() => {});
      }
    }, 15000); // Send every 15 seconds
  }

  private stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  ConnectionOn(MethodName: string, callback: any) {
    if (!this.hubConnection) {
      console.warn('Hub connection not initialized');
      return;
    }
    this.hubConnection.on(MethodName, callback);
  }

  connectionOff(MethodName: string) {
    if (this.hubConnection) {
      this.hubConnection.off(MethodName);
    }
  }

  async invokeWithoutParams<T>(methodName: string): Promise<T> {
    if (!this.hubConnection) {
      throw new Error('Hub connection not initialized');
    }
    return await this.hubConnection.invoke<T>(methodName);
  }

  async invoke<T>(methodName: string, roomid?: any, sdp?: any): Promise<T> {
    if (!this.hubConnection) {
      throw new Error('Hub connection not initialized');
    }
    return await this.hubConnection.invoke<T>(methodName, roomid, sdp);
  }

  isConnected(): boolean {
    return this.hubConnection?.state === signalR.HubConnectionState.Connected;
  }

  async disconnect() {
    this.stopKeepAlive();
    if (this.hubConnection) {
      await this.hubConnection.stop();
    }
  }
}