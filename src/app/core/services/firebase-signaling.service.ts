import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore, Firestore,
  collection, doc, setDoc, getDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, getDocs, serverTimestamp, Timestamp,
  runTransaction
} from 'firebase/firestore';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FirebaseSignalingService {
  private app!: FirebaseApp;
  private db!: Firestore;

  private userId = this.generateId();
  private matchedPartnerId = '';
  private roomId = '';
  private matchCheckInterval: any = null;
  private unsubscribeRoom: (() => void) | null = null;
  private unsubscribeWaiting: (() => void) | null = null;

  // Observables
  private matchedSubject       = new Subject<string>();
  private receiveOfferSubject  = new Subject<RTCSessionDescriptionInit>();
  private receiveAnswerSubject = new Subject<RTCSessionDescriptionInit>();
  private receiveCandidateSubject = new Subject<RTCIceCandidateInit>();
  private partnerLeftSubject   = new Subject<void>();
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  private onlineUsersSubject   = new BehaviorSubject<number>(0);

  public matched$          = this.matchedSubject.asObservable();
  public receiveOffer$     = this.receiveOfferSubject.asObservable();
  public receiveAnswer$    = this.receiveAnswerSubject.asObservable();
  public receiveCandidate$ = this.receiveCandidateSubject.asObservable();
  public partnerLeft$      = this.partnerLeftSubject.asObservable();
  public connectionStatus$ = this.connectionStatusSubject.asObservable();
  public onlineUsers$      = this.onlineUsersSubject.asObservable();

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  async startConnection(userName: string): Promise<boolean> {
    try {
      
      this.app = initializeApp(environment.firebase, 'omigle-app');
      this.db  = getFirestore(this.app);

      await setDoc(doc(this.db, 'waiting', this.userId), {
        userId: this.userId,
        userName,
        matched: null,
        createdAt: serverTimestamp()
      });

      console.log(`[${this.userId}] Registered in waiting pool`);
      this.connectionStatusSubject.next(true);

      // Listen to our own waiting document for a match
      this.unsubscribeWaiting = onSnapshot(doc(this.db, 'waiting', this.userId), async (snap) => {
        const data = snap.data();
        if (data && data['matched'] && !this.matchedPartnerId) {
          const partnerId = data['matched'];
          console.log(`[${this.userId}] Match found in waiting document:`, partnerId);
          this.matchedPartnerId = partnerId;

          // Clear matchmaking interval
          if (this.matchCheckInterval) {
            clearInterval(this.matchCheckInterval);
            this.matchCheckInterval = null;
          }

          // Lexicographically smaller ID acts as the caller
          const isCaller = this.userId < partnerId;
          this.roomId = [this.userId, partnerId].sort().join('_');

          if (isCaller) {
            console.log(`[${this.userId}] Caller creating room:`, this.roomId);
            const roomRef = doc(this.db, 'rooms', this.roomId);
            await setDoc(roomRef, {
              caller: this.userId,
              callee: partnerId,
              offer: null,
              answer: null,
              createdAt: serverTimestamp()
            });

            this.matchedSubject.next(partnerId);
            this.listenToRoom(this.roomId, true);
          } else {
            console.log(`[${this.userId}] Callee joining room:`, this.roomId);
            this.matchedSubject.next(partnerId);
            this.listenToRoom(this.roomId, false);
          }

          // Remove self from waiting pool
          try {
            await deleteDoc(doc(this.db, 'waiting', this.userId));
          } catch (e) {
            console.error('Error deleting own waiting doc:', e);
          }
        }
      });

      // Start looking for a partner
      this.startMatchmaking();
      return true;
    } catch (err) {
      console.error('Firebase connection error:', err);
      this.connectionStatusSubject.next(false);
      return false;
    }
  }

  private startMatchmaking() {
    // Poll every 2 seconds for a partner
    this.matchCheckInterval = setInterval(async () => {
      if (this.matchedPartnerId) {
        clearInterval(this.matchCheckInterval);
        return;
      }
      await this.tryMatch();
    }, 2000);

    // Also run immediately
    this.tryMatch();

    // Watch online count
    this.watchOnlineCount();
  }

  private async tryMatch() {
    try {
      if (this.matchedPartnerId) return;

      const now = Date.now();
      const waitingRef = collection(this.db, 'waiting');
      const snapshot = await getDocs(waitingRef);

      // Find unmatched waiting users (active in the last 60 seconds)
      const others = snapshot.docs
        .filter(d => d.id !== this.userId)
        .filter(d => {
          const data = d.data();
          const ts = data['createdAt'] as Timestamp;
          const matched = data['matched'];
          return !matched && ts && (now - ts.toMillis()) < 60000;
        });

      this.onlineUsersSubject.next(snapshot.docs.length);

      if (others.length === 0) return; // Nobody else waiting

      const partnerDoc = others[0];
      const partnerId  = partnerDoc.id;

      const myRef = doc(this.db, 'waiting', this.userId);
      const partnerRef = doc(this.db, 'waiting', partnerId);

      // Atomically check if both are unmatched, then match them
      await runTransaction(this.db, async (transaction) => {
        const mySnap = await transaction.get(myRef);
        const partnerSnap = await transaction.get(partnerRef);

        if (!mySnap.exists() || !partnerSnap.exists()) {
          throw new Error('One of the waiting documents was deleted');
        }

        const myData = mySnap.data();
        const partnerData = partnerSnap.data();

        if (myData['matched'] || partnerData['matched']) {
          throw new Error('One of the users is already matched');
        }

        // Atomically link their matched fields
        transaction.update(myRef, { matched: partnerId });
        transaction.update(partnerRef, { matched: this.userId });
      });

      console.log(`[${this.userId}] Successfully paired in transaction with:`, partnerId);
    } catch (err) {
      // Ignore matchmaking failures due to concurrency / already matched
      console.log(`[${this.userId}] Match attempt info:`, (err as Error).message);
    }
  }

  private listenToRoom(roomId: string, isCaller: boolean) {
    const roomRef = doc(this.db, 'rooms', roomId);

    this.unsubscribeRoom = onSnapshot(roomRef, (snap) => {
      const data = snap.data();
      if (!data) return;

      // Caller receives answer
      if (isCaller && data['answer'] && !this._answerProcessed) {
        this._answerProcessed = true;
        console.log('Received answer from Firestore');
        this.receiveAnswerSubject.next(data['answer']);
      }

      // Callee receives offer
      if (!isCaller && data['offer'] && !this._offerProcessed) {
        this._offerProcessed = true;
        console.log('Received offer from Firestore');
        this.receiveOfferSubject.next(data['offer']);
      }

      // Both receive ICE candidates
      const candidatesKey = isCaller ? 'calleeCandidates' : 'callerCandidates';
      const candidates: RTCIceCandidateInit[] = data[candidatesKey] || [];
      const newCandidates = candidates.slice(this._processedCandidates);
      newCandidates.forEach(c => {
        console.log('Received ICE candidate');
        this.receiveCandidateSubject.next(c);
      });
      this._processedCandidates += newCandidates.length;

      // Detect partner left
      if (data['partnerLeft']) {
        this.partnerLeftSubject.next();
      }
    });
  }

  private _answerProcessed = false;
  private _offerProcessed  = false;
  private _processedCandidates = 0;

  async sendOffer(partnerId: string, offer: RTCSessionDescriptionInit) {
    console.log('Storing offer in Firestore');
    await updateDoc(doc(this.db, 'rooms', this.roomId), { offer });
  }

  async sendAnswer(partnerId: string, answer: RTCSessionDescriptionInit) {
    console.log('Storing answer in Firestore');
    await updateDoc(doc(this.db, 'rooms', this.roomId), { answer });
  }

  async sendCandidate(partnerId: string, candidate: RTCIceCandidateInit, isCaller: boolean) {
    const plainCandidate = {
      candidate: candidate.candidate,
      sdpMid: candidate.sdpMid,
      sdpMLineIndex: candidate.sdpMLineIndex,
      usernameFragment: candidate.usernameFragment || null
    };
    const key = isCaller ? 'callerCandidates' : 'calleeCandidates';
    const roomRef = doc(this.db, 'rooms', this.roomId);
    const snap = await getDoc(roomRef);
    const existing: RTCIceCandidateInit[] = (snap.data() as any)?.[key] || [];
    await updateDoc(roomRef, { [key]: [...existing, plainCandidate] });
  }

  async disconnect() {
    clearInterval(this.matchCheckInterval);
    this.unsubscribeRoom?.();
    this.unsubscribeWaiting?.();

    // Remove from waiting pool
    try { await deleteDoc(doc(this.db, 'waiting', this.userId)); } catch {}

    // Mark partner left in room
    if (this.roomId) {
      try {
        await updateDoc(doc(this.db, 'rooms', this.roomId), { partnerLeft: true });
      } catch {}
    }

    this.connectionStatusSubject.next(false);
    this.matchedPartnerId = '';
    this.roomId = '';
    this._answerProcessed = false;
    this._offerProcessed  = false;
    this._processedCandidates = 0;
  }

  private watchOnlineCount() {
    const waitingRef = collection(this.db, 'waiting');
    onSnapshot(waitingRef, snap => {
      this.onlineUsersSubject.next(snap.size);
    });
  }

  getIsCaller(): boolean {
    // Determined by who created the room
    return this.roomId.startsWith(this.userId);
  }
}
