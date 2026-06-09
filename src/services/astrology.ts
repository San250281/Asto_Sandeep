/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AstrologerAgent } from '../types';

export const AI_AGENTS: AstrologerAgent[] = [
  {
    id: 'guru-ji',
    name: 'Guru Ji',
    specialization: 'General Astrology & Spiritual Life Guidance',
    price_per_minute: 21,
    voice_id: 'Charon', // Gemini TTS prebuilt male voice style
    voice_name: 'Charon (Deep Spiritual Indian Guru Voice)',
    personality: 'traditional, wise, calm, deeply spiritual, and compassionate. Guru Ji uses Vedic concepts (Karma, Dharma, Dosha remedies) and offers blessings.',
    avatar: 'https://images.unsplash.com/photo-1609137144813-79d03823f663?auto=format&fit=crop&w=250&h=250&q=80',
    description: 'Expert in Vedic chart analysis, daily horoscopes, family alignments, spiritual pathfinding, and ancestral dosha remedies.',
    rating: 4.9,
    total_calls: 15482,
    online: true,
  },
  {
    id: 'love-expert',
    name: 'Love & Marriage Expert',
    specialization: 'Relationship & Compatibility Astrology',
    price_per_minute: 51,
    voice_id: 'Kore', // Gemini TTS prebuilt softer expressive voice style
    voice_name: 'Kore (Empathetic Softer Heartfelt Voice)',
    personality: 'warm, deeply empathetic, supportive, and understanding. She listens with romance in her soul, giving practical compatibility answers with emotional grace.',
    avatar: 'https://images.unsplash.com/photo-1594744803329-e58b31de215f?auto=format&fit=crop&w=250&h=250&q=80',
    description: 'Specializes in Synastry compatibility, marriage timing, relationship conflict resolution, breakups, and finding your cosmic soulmate.',
    rating: 4.8,
    total_calls: 9812,
    online: true,
  },
  {
    id: 'career-guru',
    name: 'Career & Wealth Guru',
    specialization: 'Financial & Business Success Astrology',
    price_per_minute: 70,
    voice_id: 'Puck', // Gemini TTS prebuilt professional consultant voice style
    voice_name: 'Puck (Premium Confident Corporate Consultant)',
    personality: 'highly professional, confident, sharp, motivational, and strategical. Combines cosmological alignments with realistic corporate advisory.',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=250&h=250&q=80',
    description: 'Specializes in job transitions, high-impact business launches, wealth periods (Dhana Yoga), stock market timing, and vocational alignment.',
    rating: 4.95,
    total_calls: 8743,
    online: true,
  },
];

export const ZODIAC_SIGNS = [
  { name: 'Aries', date: 'Mar 21 - Apr 19', symbol: '♈', element: 'Fire', color: 'text-red-500 hover:bg-red-500/10' },
  { name: 'Taurus', date: 'Apr 20 - May 20', symbol: '♉', element: 'Earth', color: 'text-emerald-500 hover:bg-emerald-500/10' },
  { name: 'Gemini', date: 'May 21 - Jun 20', symbol: '♊', element: 'Air', color: 'text-cyan-500 hover:bg-cyan-500/10' },
  { name: 'Cancer', date: 'Jun 21 - Jul 22', symbol: '♋', element: 'Water', color: 'text-blue-500 hover:bg-blue-500/10' },
  { name: 'Leo', date: 'Jul 23 - Aug 22', symbol: '♌', element: 'Fire', color: 'text-amber-500 hover:bg-amber-500/10' },
  { name: 'Virgo', date: 'Aug 23 - Sep 22', symbol: '♍', element: 'Earth', color: 'text-teal-500 hover:bg-teal-500/10' },
  { name: 'Libra', date: 'Sep 23 - Oct 22', symbol: '♎', element: 'Air', color: 'text-pink-500 hover:bg-pink-500/10' },
  { name: 'Scorpio', date: 'Oct 23 - Nov 21', symbol: '♏', element: 'Water', color: 'text-purple-500 hover:bg-purple-500/10' },
  { name: 'Sagittarius', date: 'Nov 22 - Dec 21', symbol: '♐', element: 'Fire', color: 'text-orange-500 hover:bg-orange-500/10' },
  { name: 'Capricorn', date: 'Dec 22 - Jan 19', symbol: '♑', element: 'Earth', color: 'text-slate-400 hover:bg-slate-400/10' },
  { name: 'Aquarius', date: 'Jan 20 - Feb 18', symbol: '♒', element: 'Air', color: 'text-indigo-500 hover:bg-indigo-500/10' },
  { name: 'Pisces', date: 'Feb 19 - Mar 20', symbol: '♓', element: 'Water', color: 'text-violet-500 hover:bg-violet-500/10' },
];

export const ASTROLOGY_FAQS = [
  {
    q: 'How accurate are the Vedic Voice Astrologers?',
    a: 'Our Astrologers are trained on expansive ancient Vedic texts, Synastry charts, and modern Western astrology. They construct personalized interpretations, delivering guidance tailored to your specific life questions in natural oral speech.',
  },
  {
    q: 'How does per-second wallet billing work?',
    a: 'Each Astrologer carries a dynamic pay-per-minute tier (e.g. ₹21/min for Guru Ji is ₹0.35/sec). Every second you are in a live voice session, your wallet balance decreases proportionally. The billing stops immediately when you hang up. Each new sign-up receives 30 seconds of free trial call time!',
  },
  {
    q: 'Can I generate a full computerized Kundli report?',
    a: 'Yes! Navigate to our Kundli calculation suite, type in your birth coordinates (Date, Exact Time, Place), and our calculations instantly decipher your rashi, nakshatra, ascendant, and compile a comprehensive, multi-chapter career, life, & remedies report for a flat fee of ₹99, deducted directly from your wallet.',
  },
  {
    q: 'What is the refund policy for failed transactions?',
    a: 'Transactions are secured and simulated with our sandboxed Razorpay layer. Since this is an interactive testing preview, recharges are instant and fully funded from simulated mock methods, ensuring a zero-cost test drive of our world-class premium experience!',
  },
];
