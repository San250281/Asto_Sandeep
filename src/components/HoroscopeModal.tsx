/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Heart, Briefcase, Compass, Sun, Moon, Flame, Star, Coins, CalendarDays, KeyRound } from 'lucide-react';
import { AstrologerAgent } from '../types';

interface HoroscopeModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: AstrologerAgent | null;
}

interface HoroscopeData {
  title: string;
  category: string;
  icon: React.ComponentType<any>;
  colorTheme: {
    primary: string; // Tailwind color name e.g. "amber-500"
    glow: string;    // e.g. "shadow-amber-500/20"
    badge: string;   // e.g. "bg-amber-500/10 text-amber-400 border-amber-500/20"
    bgGradient: string; // e.g. "from-amber-950/20 via-slate-900 to-slate-950"
  };
  forecast: string;
  planetaryPlacement: string;
  ritual: string;
  luckyColor: string;
  luckyNumber: string;
  powerHour: string;
}

const HOROSCOPES: Record<string, HoroscopeData> = {
  'guru-ji': {
    title: "Vedic Patrika & Daily Karma Guidance",
    category: "Vedic Karma & Spiritual Alignment",
    icon: Compass,
    colorTheme: {
      primary: "amber-500",
      glow: "shadow-amber-500/20",
      badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      bgGradient: "from-amber-950/40 via-slate-950 to-slate-900",
    },
    planetaryPlacement: "Jupiter transits Purva Bhadrapada (9th House of Dharma)",
    forecast: "The spiritual transit of Jupiter through your 9th house (Dharma Bhava) calls for profound introspection today... there is a slow, powerful shift of cosmic energy aligning your actions with your higher purpose. The evening brings a calming Moon transit in Taurus, which is an ideal time for personal rituals, meditation, or quiet study. Avoid critical investment commitments today, and let patience guide your steps through any professional uncertainty.",
    ritual: "Spend 5 minutes in silent meditation at sunset. Chant 'Om Namah Shivaya' 108 times to neutralize Saturn's minor blockages and stabilize your inner solar plexus energy.",
    luckyColor: "Saffron / Devanagari Gold",
    luckyNumber: "9",
    powerHour: "4:30 AM - 5:30 AM",
  },
  'love-expert': {
    title: "Venusian Alignment & Relationship Forecast",
    category: "Romance, Synastry & Emotional Healing",
    icon: Heart,
    colorTheme: {
      primary: "pink-500",
      glow: "shadow-pink-500/20",
      badge: "bg-pink-500/10 text-pink-400 border-pink-500/20",
      bgGradient: "from-pink-950/40 via-slate-950 to-slate-900",
    },
    planetaryPlacement: "Venus forms a harmonious Trine with Neptune (7th House of Partnerships)",
    forecast: "Venus is forming a beautiful, supportive alignment with Neptune today, unlocking a river of emotional empathy and creative expression... committed couples will find their relationship blanketed in gentle, reassuring warmth, making it the perfect night to talk with open-hearted vulnerability. If you are single, keep your aura clear and your heart receptive; a sweet, serendipitous soulmate transit is slowly crossing your fourth-house threshold.",
    ritual: "Write down three qualities you are truly grateful for in your closest companion. Burn a small incense stick of Sandalwood or Rose to welcome soft Venusian vibration into your space.",
    luckyColor: "Rose Quartz / Pastels",
    luckyNumber: "6",
    powerHour: "6:15 PM - 7:30 PM",
  },
  'career-guru': {
    title: "Strategic Dhana Yoga & Career Breakthroughs",
    category: "Corporate Career, Business & Wealth Strategy",
    icon: Briefcase,
    colorTheme: {
      primary: "emerald-500",
      glow: "shadow-emerald-500/20",
      badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      bgGradient: "from-emerald-950/40 via-slate-950 to-slate-900",
    },
    planetaryPlacement: "Mars enters your 10th House (Karma Bhava) of Ambition & Power",
    forecast: "Mars is actively entering your highest career sector, directly charging your solar plexus chakra with unstoppable executive energy... this transit marks a golden professional opportunity to initiate complex projects, publish key work, or negotiate future path alignments. A sudden, unexpected inquiry from a corporate contact located to your east could yield exciting long-term wealth developments.",
    ritual: "Briefly visualize your ultimate financial or corporate goal. Keep a coin or a small green stone on your desk today to ground the flowing Saturn and Mercury vibrations.",
    luckyColor: "Deep Emerald / Slate Teal",
    luckyNumber: "8",
    powerHour: "10:30 AM - 12:00 PM",
  },
};

export default function HoroscopeModal({ isOpen, onClose, agent }: HoroscopeModalProps) {
  const data = agent ? (HOROSCOPES[agent.id] || {
    title: "General Astrological Forecast",
    category: "Daily Cosmos Forecast",
    icon: Sparkles,
    colorTheme: {
      primary: "yellow-500",
      glow: "shadow-yellow-500/20",
      badge: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      bgGradient: "from-slate-950 via-slate-950 to-slate-900",
    },
    planetaryPlacement: "Cosmic alignments are in active transition",
    forecast: "The stars are in a beautiful state of alignment today, bringing fresh opportunities and unexpected paths of growth. Be patient with yourself and trust the internal wisdom driving your goals.",
    ritual: "Take three deep breaths of pure oxygen at the beginning of your day to clear your physical field.",
    luckyColor: "Cosmic Yellow",
    luckyNumber: "7",
    powerHour: "11:00 AM - 12:00 PM",
  }) : null;

  const IconComponent = data ? data.icon : Sparkles;

  return (
    <AnimatePresence>
      {isOpen && agent && data && (
        <div 
          id="horoscope-modal-container"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10"
        >
          {/* Backdrop overlay */}
          <motion.div
            id="horoscope-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm cursor-pointer z-0"
          />

          {/* Modal body container */}
          <motion.div
            id="horoscope-modal-content"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-lg bg-gradient-to-b ${data.colorTheme.bgGradient} border border-slate-800 rounded-[2rem] shadow-2xl ${data.colorTheme.glow} p-6 sm:p-8 text-left overflow-hidden z-10 flex flex-col max-h-[90vh]`}
          >
            {/* Subtle background cosmic elements */}
            <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-full filter blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-tr from-emerald-500/5 to-transparent rounded-full filter blur-xl pointer-events-none" />

            {/* Close button top right */}
            <button
              id="close-horoscope-modal"
              onClick={onClose}
              className="absolute top-5 right-5 text-slate-400 hover:text-white bg-slate-900/65 hover:bg-slate-800 border border-slate-800 p-2 rounded-full transition cursor-pointer z-20"
              aria-label="Close horoscope modal"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Core header of modal */}
            <div className="space-y-3 pb-3 border-b border-slate-800/80 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${data.colorTheme.badge}`}>
                  <IconComponent className="w-3.5 h-3.5" />
                  {data.category}
                </span>
                <span className="text-[10px] text-slate-500 font-mono inline-flex items-center gap-1">
                  <CalendarDays className="w-3 h-3 text-slate-500" /> Today's Oracle
                </span>
              </div>

              <div className="pt-1">
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-yellow-101 text-yellow-100 tracking-tight leading-snug">
                  {data.title}
                </h2>
                <div className="flex items-center gap-2 mt-1 px-0.5 text-[11px] text-slate-500 font-mono">
                  <Star className="w-3 h-3 fill-yellow-400/30 text-yellow-500/40" />
                  <span>{data.planetaryPlacement}</span>
                </div>
              </div>
            </div>

            {/* Scrollable central content */}
            <div className="flex-1 overflow-y-auto my-4 pr-1 space-y-5 scrollbar-thin">
              {/* Foreword from Astrologer */}
              <div className="flex items-start gap-3 bg-slate-950/40 border border-slate-900 p-3 rounded-2xl">
                <div className="w-10 h-10 rounded-full bg-slate-900 border border-yellow-500/10 flex-shrink-0 flex items-center justify-center overflow-hidden">
                  <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-[11px] font-sans font-semibold text-yellow-300/90 leading-none">{agent.name}</p>
                  <p className="text-[9px] font-sans text-slate-500 uppercase tracking-widest mt-1">{agent.specialization}</p>
                  <p className="text-[11px] text-slate-400 mt-1.5 italic font-light leading-relaxed">"The stars only incline, they do not bind... let us read with wisdom."</p>
                </div>
              </div>

              {/* Daily text block */}
              <div className="space-y-1">
                <h4 className="text-xs uppercase font-mono tracking-wider text-slate-500 font-bold block">Cosmic Forecast</h4>
                <p className="text-sm font-sans text-slate-300 leading-relaxed font-light select-text">
                  {data.forecast}
                </p>
              </div>

              {/* Spiritual Sadhana / Ritual */}
              <div className="p-4 bg-slate-950/50 border border-slate-800/50 rounded-2xl flex gap-3">
                <Sun className={`w-5 h-5 text-${data.colorTheme.primary} flex-shrink-0 mt-0.5`} />
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-slate-200">Suggested Daily Sadhana (Remedy)</h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-light select-text">{data.ritual}</p>
                </div>
              </div>

              {/* Parameter grid keys */}
              <div className="grid grid-cols-3 gap-2 pt-1 pb-1">
                <div className="bg-slate-950/30 border border-slate-900 rounded-xl p-2.5 text-center">
                  <span className="text-[9px] uppercase font-mono text-slate-500 block">Lucky Color</span>
                  <span className="text-xs text-slate-300 font-semibold mt-0.5 block truncate">{data.luckyColor}</span>
                </div>
                <div className="bg-slate-950/30 border border-slate-900 rounded-xl p-2.5 text-center">
                  <span className="text-[9px] uppercase font-mono text-slate-500 block">Lucky Number</span>
                  <span className="text-xs text-slate-300 font-semibold mt-0.5 block">{data.luckyNumber}</span>
                </div>
                <div className="bg-slate-950/30 border border-slate-900 rounded-xl p-2.5 text-center">
                  <span className="text-[9px] uppercase font-mono text-slate-500 block">Power Hours</span>
                  <span className="text-[10px] text-slate-300 font-semibold mt-0.5 block truncate">{data.powerHour}</span>
                </div>
              </div>
            </div>

            {/* Footer of modal */}
            <div className="pt-3 border-t border-slate-800/80 flex-shrink-0 flex justify-end">
              <button
                id="confirm-horoscope-close"
                onClick={onClose}
                className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 font-semibold py-2.5 px-4 rounded-xl text-xs transition active:scale-98 cursor-pointer text-center"
              >
                Close Oracle
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
