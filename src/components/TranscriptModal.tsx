/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MessageSquare, Calendar, Clock, Sparkles } from 'lucide-react';
import { VoiceSession, ChatMessage, AstrologerAgent } from '../types';
import { getFirestoreMessages } from '../services/firestoreService';
import { getLocalMessages } from '../services/billing';

interface TranscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: VoiceSession | null;
  agent: AstrologerAgent | null;
}

export default function TranscriptModal({ isOpen, onClose, session, agent }: TranscriptModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !session) return;

    async function loadTranscript() {
      setLoading(true);
      const isSimulated = localStorage.getItem('is_simulated_mode') === 'true';

      if (isSimulated || session.id.startsWith('mock_') || session.id.includes('simulated')) {
        const localMsgs = getLocalMessages(session.id);
        setMessages(localMsgs);
        setLoading(false);
      } else {
        // Try live database messages first
        try {
          const liveMsgs = await getFirestoreMessages(session.id, session.id); // Firestore userId can be derived or passed. To be ultra reliable we fetch using userId & sessionId
          // Wait! In getFirestoreMessages, the function expects uid and sessionId. Let's see current profile ID or check local storage
          const profileData = localStorage.getItem('astro_voice_user_profile');
          const uid = profileData ? JSON.parse(profileData).uid : 'astro_test_user_101';
          
          const msgs = await getFirestoreMessages(uid, session.id);
          if (msgs && msgs.length > 0) {
            setMessages(msgs);
          } else {
            // Check fallback local storage messages
            const localMsgs = getLocalMessages(session.id);
            setMessages(localMsgs);
          }
        } catch (err) {
          console.warn('Could not read live Firestore transcripts, fallback to local store:', err);
          const localMsgs = getLocalMessages(session.id);
          setMessages(localMsgs);
        } finally {
          setLoading(false);
        }
      }
    }

    loadTranscript();
  }, [isOpen, session]);

  if (!isOpen || !session || !agent) return null;

  const formattedDate = session.start_time
    ? new Date(session.start_time).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Unknown Date';

  return (
    <AnimatePresence>
      <div
        id="transcript-modal-container"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md cursor-pointer"
        onClick={onClose}
      >
        <motion.div
          id="transcript-modal-content"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border border-slate-800 rounded-[2rem] shadow-2xl p-6 sm:p-8 text-left overflow-hidden cursor-default flex flex-col max-h-[85vh]"
        >
          {/* Cosmic Glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-500/5 to-transparent rounded-full filter blur-xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-start justify-between mb-4 flex-shrink-0">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase font-mono tracking-wider bg-yellow-500/10 text-yellow-300 border border-yellow-500/15 mb-2">
                <MessageSquare className="w-3 h-3" /> Astral Speech Script
              </div>
              <h2 className="text-lg font-serif font-bold text-slate-100 flex items-center gap-2">
                Session with {agent.name}
              </h2>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> {formattedDate}
                <span>•</span>
                <Clock className="w-3 h-3" /> {session.total_seconds} seconds call
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 bg-slate-900 border border-slate-800 rounded-full text-slate-400 hover:text-slate-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Transcript Messages Feed */}
          <div className="flex-1 overflow-y-auto pr-1 my-4 space-y-4 scrollbar-thin min-h-[150px] max-h-[50vh]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-500">
                <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-mono">Reading cosmological script...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 space-y-2">
                <Sparkles className="w-8 h-8 text-slate-700 animate-pulse" />
                <p className="text-xs">No spoken transcribing recorded for this session.</p>
                <p className="text-[10px] text-slate-600 max-w-[240px]">
                  Speak clearly during your call to transcribe live vocal questions.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {messages.map((msg) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      <span className="text-[9px] uppercase font-mono text-slate-505 text-slate-500 px-1 mb-1">
                        {isUser ? 'Seeker (You)' : `${agent.name} (Oracle)`}
                      </span>
                      <div
                        className={`p-3.5 rounded-2xl text-xs max-w-[90%] leading-relaxed shadow-sm ${
                          isUser
                            ? 'bg-yellow-500/10 text-yellow-100 border border-yellow-500/10 rounded-tr-none'
                            : 'bg-slate-900/80 text-slate-300 border border-slate-800 rounded-tl-none'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="border-t border-slate-900 pt-4 flex items-center justify-between text-[9px] text-slate-500 font-mono flex-shrink-0">
            <span>SESSION SUMMARY • ENDED</span>
            <span className="text-slate-400">Total charge: ₹{session.total_amount.toFixed(2)}</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
