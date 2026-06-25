import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private hubConnection!: signalR.HubConnection;
  private connectionUrl = 'http://138.252.100.148:8126/hub/v1';
  private keepAliveInterval: any = null;

  async startConnection(): Promise<void> {
    if (
      this.hubConnection &&
      this.hubConnection.state !== signalR.HubConnectionState.Disconnected
    ) {
      return;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.connectionUrl)
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.hubConnection.onclose((error) => {
      console.log('Disconnected from SignalR hub', error);
      this.stopKeepAlive();
    });

    this.hubConnection.onreconnecting((error) => {
      console.log('SignalR reconnecting...', error);
      this.stopKeepAlive();
    });

    this.hubConnection.onreconnected((connectionId) => {
      console.log('Reconnected to SignalR hub', connectionId);
      this.startKeepAlive();
    });

    await this.hubConnection.start();
    console.log('SignalR connection established');
    this.startKeepAlive();
  }

  private startKeepAlive() {
    this.stopKeepAlive();

    this.keepAliveInterval = setInterval(async () => {
      try {
        if (this.isConnected()) {
          // If your hub has Ping method, keep this.
          // If not, comment this out.
          await this.invokeWithoutParams('Ping');
        }
      } catch (error) {
        // silent fail
      }
    }, 15000);
  }

  private stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  ConnectionOn(methodName: string, callback: (...args: any[]) => void) {
    if (!this.hubConnection) {
      console.warn(`Hub connection not initialized for event: ${methodName}`);
      return;
    }

    // Avoid duplicate handlers if component re-inits
    this.hubConnection.off(methodName);
    this.hubConnection.on(methodName, callback);
  }

  connectionOff(methodName: string) {
    if (this.hubConnection) {
      this.hubConnection.off(methodName);
    }
  }

  async invokeWithoutParams<T>(methodName: string): Promise<T> {
    if (!this.hubConnection) {
      throw new Error('Hub connection not initialized');
    }

    if (!this.isConnected()) {
      throw new Error(`Cannot invoke ${methodName}. SignalR is not connected.`);
    }

    return await this.hubConnection.invoke<T>(methodName);
  }

  async invoke<T>(methodName: string, roomId?: any, payload?: any): Promise<T> {
    if (!this.hubConnection) {
      throw new Error('Hub connection not initialized');
    }

    if (!this.isConnected()) {
      throw new Error(`Cannot invoke ${methodName}. SignalR is not connected.`);
    }

    if (payload !== undefined) {
      return await this.hubConnection.invoke<T>(methodName, roomId, payload);
    }

    if (roomId !== undefined) {
      return await this.hubConnection.invoke<T>(methodName, roomId);
    }

    return await this.hubConnection.invoke<T>(methodName);
  }

  isConnected(): boolean {
    return this.hubConnection?.state === signalR.HubConnectionState.Connected;
  }

  async waitUntilConnected(maxAttempts = 10, delayMs = 500): Promise<boolean> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      if (this.isConnected()) {
        return true;
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      attempts++;
    }

    return false;
  }

  async disconnect() {
    this.stopKeepAlive();

    if (this.hubConnection) {
      try {
        await this.hubConnection.stop();
      } catch (error) {
        console.error('Error while stopping SignalR connection:', error);
      }
    }
  }
}