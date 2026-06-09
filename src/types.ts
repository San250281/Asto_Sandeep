/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AstrologerAgent {
  id: string;
  name: string;
  specialization: string;
  price_per_minute: number;
  voice_id: string; // for ElevenLabs or Gemini prebuilt Voice Name
  personality: string;
  avatar: string; // URL or character symbol
  description: string;
  voice_name: string; // Display name of Voice style
  rating: number;
  total_calls: number;
  online: boolean;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  wallet_balance: number;
  free_trial_remaining_seconds: number;
  created_at: string;
  kundlis_purchased: string[]; // List of bought Kundli calculations
}

export interface WalletTransaction {
  id: string;
  amount: number;
  type: 'recharge' | 'call_deduction' | 'kundli_purchase';
  status: 'completed' | 'pending' | 'failed';
  description: string;
  created_at: string;
}

export interface VoiceSession {
  id: string;
  agent_id: string;
  start_time: string;
  end_time?: string;
  total_seconds: number;
  total_amount: number;
  status: 'active' | 'completed';
}

export interface ChatMessage {
  id: string;
  session_id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface KundliProfile {
  name: string;
  dob: string; // Date of birth
  tob: string; // Time of birth
  pob: string; // Place of birth
  gender: string;
  chart_type: string;
}

export interface KundliReport {
  id: string;
  profile: KundliProfile;
  purchase_date: string;
  rashi: string;
  nakshatra: string;
  ascendant: string;
  predictions: {
    general: string;
    career: string;
    love: string;
    remedies: string[];
  };
}
