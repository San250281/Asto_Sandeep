/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserProfile, WalletTransaction, VoiceSession } from '../types';

const USER_STORAGE_KEY = 'astro_voice_user_profile';
const TRANS_STORAGE_KEY = 'astro_voice_transactions';
const SESS_STORAGE_KEY = 'astro_voice_sessions';

export const INITIAL_USER: UserProfile = {
  uid: 'astro_test_user_101',
  name: 'Cosmic Seeker',
  email: 'game.rewardyn@gmail.com',
  phone: '+91 98765 43210',
  wallet_balance: 50.0, // Starting trial cash (₹50)
  free_trial_remaining_seconds: 30, // 30 seconds of free trial
  created_at: new Date().toISOString(),
  kundlis_purchased: [],
};

export const INITIAL_TRANSACTIONS: WalletTransaction[] = [
  {
    id: 'tx_init_01',
    amount: 50,
    type: 'recharge',
    status: 'completed',
    description: 'Welcome Bonus Astro Gift Credits',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
];

export function getLocalUser(): UserProfile {
  const data = localStorage.getItem(USER_STORAGE_KEY);
  if (!data) {
    saveLocalUser(INITIAL_USER);
    return INITIAL_USER;
  }
  return JSON.parse(data);
}

export function saveLocalUser(user: UserProfile) {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function getLocalTransactions(): WalletTransaction[] {
  const data = localStorage.getItem(TRANS_STORAGE_KEY);
  if (!data) {
    saveLocalTransactions(INITIAL_TRANSACTIONS);
    return INITIAL_TRANSACTIONS;
  }
  return JSON.parse(data);
}

export function saveLocalTransactions(txs: WalletTransaction[]) {
  localStorage.setItem(TRANS_STORAGE_KEY, JSON.stringify(txs));
}

export function getLocalSessions(): VoiceSession[] {
  const data = localStorage.getItem(SESS_STORAGE_KEY);
  if (!data) {
    return [];
  }
  return JSON.parse(data);
}

export function saveLocalSessions(sessions: VoiceSession[]) {
  localStorage.setItem(SESS_STORAGE_KEY, JSON.stringify(sessions));
}

// Generate new random transaction ID
export function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
}
