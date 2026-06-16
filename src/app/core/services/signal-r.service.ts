import { Injectable } from '@angular/core';
import { Subject,BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MockSignalRService {
  private isConnected = false;
  private currentUserName = '';
  private connectionId = Math.random().toString(36).substr(2, 9);
  private matchCheckInterval: any = null;
  
  // Simple array to store waiting users (shared across instances)
  private static waitingUsers: { connectionId: string, userName: string, timestamp: number }[] = [];
  private static activeMatches: Map<string, string> = new Map();
  
  private matchedSubject = new Subject<string>();
  private receiveOfferSubject = new Subject<any>();
  private receiveAnswerSubject = new Subject<any>();
  private receiveCandidateSubject = new Subject<any>();
  private partnerLeftSubject = new Subject<void>();
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  private onlineUsersSubject = new BehaviorSubject<number>(0);

  public matched$ = this.matchedSubject.asObservable();
  public receiveOffer$ = this.receiveOfferSubject.asObservable();
  public receiveAnswer$ = this.receiveAnswerSubject.asObservable();
  public receiveCandidate$ = this.receiveCandidateSubject.asObservable();
  public partnerLeft$ = this.partnerLeftSubject.asObservable();
  public connectionStatus$ = this.connectionStatusSubject.asObservable();
  public onlineUsers$ = this.onlineUsersSubject.asObservable();

  async startConnection(userName: string): Promise<boolean> {
    try {
      console.log(`[${this.connectionId}] Starting connection for:`, userName);
      this.currentUserName = userName;
      this.isConnected = true;
      this.connectionStatusSubject.next(true);
      
      // Start matchmaking
      this.startMatchmaking();
      
      return true;
    } catch (error) {
      console.error('Connection failed', error);
      this.connectionStatusSubject.next(false);
      return false;
    }
  }

  private startMatchmaking() {
    // Clear any existing interval
    if (this.matchCheckInterval) {
      clearInterval(this.matchCheckInterval);
    }
    
    // Add self to waiting list
    this.addToWaitingList();
    
    // Check for match every 2 seconds
    this.matchCheckInterval = setInterval(() => {
      if (this.isConnected) {
        this.checkForMatch();
      }
    }, 2000);
    
    // Update online count
    this.updateOnlineCount();
  }

  private addToWaitingList() {
    // Remove old entries (older than 30 seconds)
    const now = Date.now();
    MockSignalRService.waitingUsers = MockSignalRService.waitingUsers.filter(u => now - u.timestamp < 30000);
    
    // Check if already in waiting list
    const alreadyWaiting = MockSignalRService.waitingUsers.find(u => u.connectionId === this.connectionId);
    
    if (!alreadyWaiting) {
      MockSignalRService.waitingUsers.push({
        connectionId: this.connectionId,
        userName: this.currentUserName,
        timestamp: Date.now()
      });
      console.log(`[${this.connectionId}] Added to waiting list. Total waiting: ${MockSignalRService.waitingUsers.length}`);
      console.log('Waiting users:', MockSignalRService.waitingUsers.map(u => u.connectionId));
    }
  }

  private checkForMatch() {
    // Clean up old entries
    const now = Date.now();
    MockSignalRService.waitingUsers = MockSignalRService.waitingUsers.filter(u => now - u.timestamp < 30000);
    
    // Find a different user (not self)
    const partner = MockSignalRService.waitingUsers.find(u => u.connectionId !== this.connectionId);
    
    if (partner && !MockSignalRService.activeMatches.has(this.connectionId)) {
      console.log(`[${this.connectionId}] Found partner:`, partner.connectionId);
      
      // Remove both from waiting list
      MockSignalRService.waitingUsers = MockSignalRService.waitingUsers.filter(
        u => u.connectionId !== this.connectionId && u.connectionId !== partner.connectionId
      );
      
      // Store the match
      MockSignalRService.activeMatches.set(this.connectionId, partner.connectionId);
      MockSignalRService.activeMatches.set(partner.connectionId, this.connectionId);
      
      // Notify
      this.matchedSubject.next(partner.connectionId);
      console.log(`[${this.connectionId}] ✅ Matched with:`, partner.connectionId);
      
      // Stop checking for matches
      if (this.matchCheckInterval) {
        clearInterval(this.matchCheckInterval);
        this.matchCheckInterval = null;
      }
    }
    
    this.updateOnlineCount();
  }

  async sendOffer(partnerId: string, offer: RTCSessionDescriptionInit) {
    console.log(`[${this.connectionId}] Sending offer to:`, partnerId);
    // Simulate sending to partner
    setTimeout(() => {
      console.log(`[${this.connectionId}] Simulating offer receipt`);
      this.receiveOfferSubject.next(offer);
    }, 100);
  }

  async sendAnswer(partnerId: string, answer: RTCSessionDescriptionInit) {
    console.log(`[${this.connectionId}] Sending answer`);
    setTimeout(() => {
      this.receiveAnswerSubject.next(answer);
    }, 100);
  }

  async sendCandidate(partnerId: string, candidate: RTCIceCandidateInit) {
    console.log(`[${this.connectionId}] Sending ICE candidate`);
    setTimeout(() => {
      this.receiveCandidateSubject.next(candidate);
    }, 50);
  }

  async disconnect() {
    console.log(`[${this.connectionId}] Disconnecting`);
    
    // Remove from waiting list
    MockSignalRService.waitingUsers = MockSignalRService.waitingUsers.filter(
      u => u.connectionId !== this.connectionId
    );
    
    // Remove from active matches
    const partnerId = MockSignalRService.activeMatches.get(this.connectionId);
    if (partnerId) {
      MockSignalRService.activeMatches.delete(this.connectionId);
      MockSignalRService.activeMatches.delete(partnerId);
      
      // Notify partner
      this.partnerLeftSubject.next();
    }
    
    if (this.matchCheckInterval) {
      clearInterval(this.matchCheckInterval);
      this.matchCheckInterval = null;
    }
    
    this.isConnected = false;
    this.connectionStatusSubject.next(false);
    this.updateOnlineCount();
  }

  private updateOnlineCount() {
    const total = MockSignalRService.waitingUsers.length + MockSignalRService.activeMatches.size;
    this.onlineUsersSubject.next(total);
  }
}

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
  private connectionUrl = 'http://localhost:5001/chatHub';

  private matchedSubject = new Subject<string>();
  private receiveOfferSubject = new Subject<any>();
  private receiveAnswerSubject = new Subject<any>();
  private receiveCandidateSubject = new Subject<any>();
  private partnerLeftSubject = new Subject<void>();
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  private onlineUsersSubject = new BehaviorSubject<number>(0);

  public matched$ = this.matchedSubject.asObservable();
  public receiveOffer$ = this.receiveOfferSubject.asObservable();
  public receiveAnswer$ = this.receiveAnswerSubject.asObservable();
  public receiveCandidate$ = this.receiveCandidateSubject.asObservable();
  public partnerLeft$ = this.partnerLeftSubject.asObservable();
  public connectionStatus$ = this.connectionStatusSubject.asObservable();
  public onlineUsers$ = this.onlineUsersSubject.asObservable();

  async startConnection(userName: string): Promise<boolean> {
    try {
      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(this.connectionUrl)
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Information)
        .build();

      this.registerEvents();
      await this.hubConnection.start();
      await this.hubConnection.invoke('Join', userName);

      this.connectionStatusSubject.next(true);
      console.log('SignalR Connected to server');
      return true;
    } catch (error) {
      console.error('SignalR Connection Error:', error);
      this.connectionStatusSubject.next(false);
      return false;
    }
  }

  private registerEvents() {
    this.hubConnection.on('Matched', (partnerId: string) => {
      console.log('Matched with partner:', partnerId);
      this.matchedSubject.next(partnerId);
    });

    this.hubConnection.on('ReceiveOffer', (offer: any) => {
      console.log('Received offer from partner');
      this.receiveOfferSubject.next(offer);
    });

    this.hubConnection.on('ReceiveAnswer', (answer: any) => {
      console.log('Received answer from partner');
      this.receiveAnswerSubject.next(answer);
    });

    this.hubConnection.on('ReceiveCandidate', (candidate: any) => {
      console.log('Received ICE candidate from partner');
      this.receiveCandidateSubject.next(candidate);
    });

    this.hubConnection.on('PartnerLeft', () => {
      console.log('Partner left the chat');
      this.partnerLeftSubject.next();
    });

    this.hubConnection.on('OnlineUsersCount', (count: number) => {
      this.onlineUsersSubject.next(count);
    });

    this.hubConnection.onreconnected(() => {
      this.connectionStatusSubject.next(true);
      console.log('SignalR reconnected');
    });

    this.hubConnection.onreconnecting(() => {
      this.connectionStatusSubject.next(false);
      console.log('SignalR reconnecting...');
    });

    this.hubConnection.onclose(() => {
      this.connectionStatusSubject.next(false);
      console.log('SignalR connection closed');
    });
  }

  async sendOffer(partnerId: string, offer: RTCSessionDescriptionInit) {
    await this.hubConnection.invoke('SendOffer', partnerId, offer);
  }

  async sendAnswer(partnerId: string, answer: RTCSessionDescriptionInit) {
    await this.hubConnection.invoke('SendAnswer', partnerId, answer);
  }

  async sendCandidate(partnerId: string, candidate: RTCIceCandidateInit) {
    await this.hubConnection.invoke('SendCandidate', partnerId, candidate);
  }

  async disconnect() {
    if (this.hubConnection) {
      await this.hubConnection.stop();
      this.connectionStatusSubject.next(false);
    }
  }
}
