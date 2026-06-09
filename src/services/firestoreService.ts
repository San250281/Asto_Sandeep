/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  setDoc,
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  orderBy,
  addDoc,
  updateDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { UserProfile, WalletTransaction, VoiceSession, ChatMessage } from '../types';

/**
 * Fetch a User profile doc from Firestore.
 */
export async function getFirestoreUser(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const userDocRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      return userSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

/**
 * Create or save a User profile doc in Firestore.
 */
export async function createFirestoreUser(uid: string, profile: UserProfile): Promise<void> {
  const path = `users/${uid}`;
  try {
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, { ...profile, id: uid });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Update an existing User profile in Firestore (e.g., wallet balance, free trial, or kundli purchases).
 */
export async function updateFirestoreUser(uid: string, updates: Partial<UserProfile>): Promise<void> {
  const path = `users/${uid}`;
  try {
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Fetch all wallet transactions for a given user from Firestore, sorted by date.
 */
export async function getFirestoreTransactions(uid: string): Promise<WalletTransaction[]> {
  const path = `users/${uid}/transactions`;
  try {
    const colRef = collection(db, 'users', uid, 'transactions');
    const q = query(colRef, orderBy('created_at', 'desc'));
    const snap = await getDocs(q);
    const txs: WalletTransaction[] = [];
    snap.forEach((doc) => {
      txs.push(doc.data() as WalletTransaction);
    });
    return txs;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Append a wallet transaction record to the user's ledger subcollection.
 */
export async function addFirestoreTransaction(uid: string, tx: WalletTransaction): Promise<void> {
  const path = `users/${uid}/transactions/${tx.id}`;
  try {
    const docRef = doc(db, 'users', uid, 'transactions', tx.id);
    await setDoc(docRef, { ...tx, user_id: uid });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Retrieve all previous voice call sessions for the user, sorted by start time.
 */
export async function getFirestoreSessions(uid: string): Promise<VoiceSession[]> {
  const path = `users/${uid}/sessions`;
  try {
    const colRef = collection(db, 'users', uid, 'sessions');
    const q = query(colRef, orderBy('start_time', 'desc'));
    const snap = await getDocs(q);
    const sessions: VoiceSession[] = [];
    snap.forEach((doc) => {
      sessions.push(doc.data() as VoiceSession);
    });
    return sessions;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Create or update a voice session record.
 */
export async function saveFirestoreSession(uid: string, session: VoiceSession): Promise<void> {
  const path = `users/${uid}/sessions/${session.id}`;
  try {
    const docRef = doc(db, 'users', uid, 'sessions', session.id);
    await setDoc(docRef, { ...session, user_id: uid });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Save chat transcript messages under a specific voice session.
 */
export async function addFirestoreMessage(uid: string, sessionId: string, msg: ChatMessage): Promise<void> {
  const path = `users/${uid}/sessions/${sessionId}/messages/${msg.id}`;
  try {
    const docRef = doc(db, 'users', uid, 'sessions', sessionId, 'messages', msg.id);
    await setDoc(docRef, msg);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Retrieve transcript messages of a specific session.
 */
export async function getFirestoreMessages(uid: string, sessionId: string): Promise<ChatMessage[]> {
  const path = `users/${uid}/sessions/${sessionId}/messages`;
  try {
    const colRef = collection(db, 'users', uid, 'sessions', sessionId, 'messages');
    const q = query(colRef, orderBy('timestamp', 'asc'));
    const snap = await getDocs(q);
    const messages: ChatMessage[] = [];
    snap.forEach((doc) => {
      messages.push(doc.data() as ChatMessage);
    });
    return messages;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}
