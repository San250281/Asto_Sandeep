/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, PhoneOff, Compass, Sparkles, Volume2, ShieldAlert, MessageCircle, RefreshCw } from 'lucide-react';
import { AstrologerAgent, UserProfile, WalletTransaction, ChatMessage, VoiceSession } from '../types';
import { generateId } from '../services/billing';

interface VoiceSessionViewProps {
  agent: AstrologerAgent;
  user: UserProfile;
  onUpdateUser: (updatedUser: UserProfile) => void;
  transactions: WalletTransaction[];
  onUpdateTransactions: (updatedTxs: WalletTransaction[]) => void;
  sessions: VoiceSession[];
  onUpdateSessions: (updatedSessions: VoiceSession[]) => void;
  onHangUp: () => void;
  onRequestRecharge: () => void;
}

// Global window reference for Web Speech recognition types in TypeScript
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export default function VoiceSessionView({
  agent,
  user,
  onUpdateUser,
  transactions,
  onUpdateTransactions,
  sessions,
  onUpdateSessions,
  onHangUp,
  onRequestRecharge,
}: VoiceSessionViewProps) {
  const [sessionActive, setSessionActive] = useState(true);
  const [duration, setDuration] = useState(0);
  const [cost, setCost] = useState(0);
  const [micActive, setMicActive] = useState(false);
  const [botSpeaking, setBotSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  
  // Dialog flow strings
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  const [dialogFeed, setDialogFeed] = useState<{ sender: 'user' | 'ai'; text: string; time: string }[]>([
    { sender: 'ai', text: `Welcome, my seeker. I am ${agent.name}. Tell me what your natal geometry reveals today.`, time: '0:00' }
  ]);
  
  // Statuses/errors
  const [statusMsg, setStatusMsg] = useState<string>('Connected & active. Speak anytime.');
  const [showLowBalanceWarning, setShowLowBalanceWarning] = useState(false);

  // References to preserve state throughout the per-second render hooks
  const userRef = useRef<UserProfile>(user);
  const activeSessionRef = useRef<VoiceSession | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  const pricePerSec = agent.price_per_minute / 60;

  // Sync user profile changes to reference
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Clean-up on unmount
  useEffect(() => {
    return () => {
      // Discontinue standard speech recognizers & vocal synthesis queues
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (e) {}
      }
    };
  }, []);

  // Initialize the session on launch
  useEffect(() => {
    const sessId = generateId('sess');
    const newSession: VoiceSession = {
      id: sessId,
      agent_id: agent.id,
      start_time: new Date().toISOString(),
      total_seconds: 0,
      total_amount: 0,
      status: 'active',
    };

    activeSessionRef.current = newSession;
    onUpdateSessions([newSession, ...sessions]);

    // Speak initial greeting vocalization
    speakAudio(`Welcome, my seeker. I am ${agent.name}. Tell me what your natal geometry reveals today.`);

    // Spawn microphone listener automatically
    startMicrophoneCapture();
  }, [agent]);

  // Per-Second Continuous Billing Thread
  useEffect(() => {
    if (!sessionActive) return;

    const billingTimer = setInterval(() => {
      setDuration((prevSec) => {
        const nextSec = prevSec + 1;

        setTimeout(() => {
          const currentUser = userRef.current;
          let finalBal = currentUser.wallet_balance;
          let remainingTrial = currentUser.free_trial_remaining_seconds;

          // Billing calculation
          let calculatedDiff = 0;
          if (remainingTrial > 0) {
            remainingTrial = Math.max(0, remainingTrial - 1);
          } else {
            calculatedDiff = pricePerSec;
            finalBal = Math.max(0, finalBal - pricePerSec);
          }

          const calculatedAccruedCost = cost + calculatedDiff;
          setCost(calculatedAccruedCost);

          // Auto-cutoff logic on exhaustion of credits
          if (finalBal <= 0 && remainingTrial <= 0) {
            handleAbruptSessionTermination();
            return;
          }

          // Low balance visual triggers (less than 15 seconds left)
          if (finalBal <= pricePerSec * 15 && remainingTrial <= 0) {
            setShowLowBalanceWarning(true);
          } else {
            setShowLowBalanceWarning(false);
          }

          // Propagate state updates back
          const updatedUser: UserProfile = {
            ...currentUser,
            wallet_balance: finalBal,
            free_trial_remaining_seconds: remainingTrial,
          };
          onUpdateUser(updatedUser);

          // Sync local session logs
          if (activeSessionRef.current) {
            activeSessionRef.current.total_seconds = nextSec;
            activeSessionRef.current.total_amount = calculatedAccruedCost;
          }
        }, 0);

        return nextSec;
      });
    }, 1000);

    return () => clearInterval(billingTimer);
  }, [cost, sessionActive]);

  // Abrupt Termination on wallet exhaustion
  const handleAbruptSessionTermination = () => {
    setSessionActive(false);
    setStatusMsg('Call suspended. Wallet balance has reached zero.');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}

    // Complete session records
    completeSessionLogger();

    // Trigger charge alert
    setTimeout(() => {
      onHangUp();
      onRequestRecharge();
    }, 2000);
  };

  // Gracefully log voice sessions and transaction deduction records
  const completeSessionLogger = () => {
    if (activeSessionRef.current) {
      const finalSess = {
        ...activeSessionRef.current,
        end_time: new Date().toISOString(),
        status: 'completed' as const,
      };

      const filterSessions = sessions.map((s) => (s.id === finalSess.id ? finalSess : s));
      onUpdateSessions(filterSessions);

      // Submit deduction transaction logs if any amounts accrued
      if (finalSess.total_amount > 0) {
        const sessionTx: WalletTransaction = {
          id: generateId('tx_deduct'),
          amount: finalSess.total_amount,
          type: 'call_deduction',
          status: 'completed',
          description: `Voice call duration: ${finalSess.total_seconds} seconds with ${agent.name}`,
          created_at: new Date().toISOString(),
        };
        onUpdateTransactions([sessionTx, ...transactions]);
      }
    }
  };

  const handleManualHangup = () => {
    setSessionActive(false);
    setStatusMsg('Call hung up successfully.');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}

    completeSessionLogger();
    onHangUp();
  };

  // Convert Gemini Base64 Linear PCM (16-bit, 24000Hz) to a Playable Buffer
  const playPcmAudio = (base64Audio: string) => {
    try {
      // Initialize or resume HTML AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      } else if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      const ctx = audioContextRef.current;
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      
      // linear PCM is 16-bit (2 bytes per sample)
      const buffer = new ArrayBuffer(len);
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const int16Samples = new Int16Array(buffer);
      const sampleCount = int16Samples.length;

      // Extract raw audio values and fit inside AudioBuffer
      const audioBuffer = ctx.createBuffer(1, sampleCount, 24000);
      const channelData = audioBuffer.getChannelData(0);

      for (let i = 0; i < sampleCount; i++) {
        // Map Int16 integers [-32768, 32767] to standard floats [-1.0, 1.0]
        channelData[i] = int16Samples[i] / 32768.0;
      }

      // Stop currently executing bot audio if any
      if (audioSourceRef.current) {
        try {
          audioSourceRef.current.stop();
        } catch (e) {}
      }

      const sourceNode = ctx.createBufferNode ? ctx.createBufferNode() : ctx.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(ctx.destination);
      
      sourceNode.onended = () => {
        setBotSpeaking(false);
        setStatusMsg('Active listening mode. Speak now.');
        // Resume speech recognition once bot stops speaking
        if (micActive && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {}
        }
      };

      sourceNode.start(0);
      audioSourceRef.current = sourceNode;
    } catch (err) {
      console.error('PCM Audio playback failure:', err);
      // Fallback on standard web TTS synthesis in case of codec failure
      throw err;
    }
  };

  // Voice Speech Synthesizer
  const speakAudio = async (textToSpeak: string) => {
    try {
      setBotSpeaking(true);
      setStatusMsg('Astrologer is speaking...');

      // Suspend voice recognition during speech outputs to prevent bot feedback loop
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }

      // Try Server-Side Gemini Speech synthesis (Premium Cloned Voice replica)
      const response = await fetch('/api/astrology/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSpeak, voiceId: agent.voice_id }),
      });

      const speechData = await response.json();

      if (speechData.audio && !speechData.simulated) {
        playPcmAudio(speechData.audio);
        return;
      }

      // If key is absent, use browser's native SpeechSynthesis fallback
      const synthesisUtterance = new SpeechSynthesisUtterance(textToSpeak);
      
      // Fine-tune tone parameters based on requested astrologer personalities
      if (agent.id === 'guru-ji') {
        synthesisUtterance.rate = 0.85; // Wise, slower pace
        synthesisUtterance.pitch = 0.8; // Deep guru voice
      } else if (agent.id === 'love-expert') {
        synthesisUtterance.rate = 0.95; 
        synthesisUtterance.pitch = 1.1; // Supportive female pitch
      } else {
        synthesisUtterance.rate = 1.05; // Quick strategical pitch
        synthesisUtterance.pitch = 0.95;
      }

      synthesisUtterance.onend = () => {
        setBotSpeaking(false);
        setStatusMsg('Active listening mode. Speak now.');
        // Resume listening
        if (micActive && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {}
        }
      };

      synthesisUtterance.onerror = (e) => {
        console.error('Web Speech Synthesis error:', e);
        setBotSpeaking(false);
      };

      window.speechSynthesis.speak(synthesisUtterance);
    } catch (e) {
      console.warn('System sound synthesis aborted. Bot speaking reverted to visual text.');
      setBotSpeaking(false);
    }
  };

  // Browser-native speech recognition
  const startMicrophoneCapture = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatusMsg('Speech recognition API not supported in this frame. Type instead below!');
      return;
    }

    const recInstance = new SpeechRecognition();
    recInstance.continuous = false;
    recInstance.interimResults = true;
    recInstance.lang = 'en-IN'; // Optimized for general user English and Indian dialect pronunciations

    recInstance.onstart = () => {
      setMicActive(true);
      setStatusMsg('Listening to your coordinates...');
    };

    recInstance.onresult = (event: any) => {
      setUserSpeaking(true);
      const outputSpeech = Array.from(event.results)
        .map((res: any) => res[0])
        .map((res) => res.transcript)
        .join('');

      setCurrentTranscript(outputSpeech);
    };

    recInstance.onerror = (event: any) => {
      console.warn('Speech Recognition feedback error:', event.error);
      if (event.error === 'not-allowed') {
        setStatusMsg('Microphone blocked. Uncheck blocked frame rules or allow access.');
        setMicActive(false);
      }
      setUserSpeaking(false);
    };

    recInstance.onend = () => {
      setUserSpeaking(false);
      
      // If mic is still globally activated and user finished their statement, trigger calculations!
      if (currentTranscript.trim()) {
        processUserAstrologyQuery(currentTranscript);
        setCurrentTranscript('');
      } else if (micActive && !botSpeaking) {
        // Keep active looping state alive without crashing
        setTimeout(() => {
          if (micActive && !botSpeaking && sessionActive) {
            try {
              recognitionRef.current.start();
            } catch (e) {}
          }
        }, 500);
      }
    };

    recognitionRef.current = recInstance;
    
    try {
      recInstance.start();
    } catch (e) {}
  };

  const toggleMicrophoneControl = () => {
    if (micActive) {
      setMicActive(false);
      setUserSpeaking(false);
      setStatusMsg('Microphone muted. Tap mic to resume.');
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    } else {
      setMicActive(true);
      startMicrophoneCapture();
    }
  };

  // Core dialog dispatcher: sends audio transcript text to backend Gemini astrology agent
  const processUserAstrologyQuery = async (queryText: string) => {
    if (!queryText.trim()) return;

    setStatusMsg(`${agent.name} ध्यानपूर्वक सुन रहे हैं... (${agent.name} is listening deeply...)`);

    // Append user input immediately to dialog display feeding
    const formattedDuration = `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`;
    const userMsgNode = { sender: 'user' as const, text: queryText, time: formattedDuration };
    setDialogFeed((prev) => [...prev, userMsgNode]);

    const startTime = Date.now();

    try {
      // Step 1: Start calculating in parallel
      const responsePromise = fetch('/api/astrology/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent.id,
          agentName: agent.name,
          personality: agent.personality,
          promptHistory: dialogFeed.map(node => ({ sender: node.sender, text: node.text })),
          userMessage: queryText,
        }),
      });

      // Step 2: Simulate thoughtful human contemplation
      setStatusMsg(`${agent.name} आपके प्रश्न पर विचार कर रहे हैं... (${agent.name} is reflecting...)`);
      await new Promise(resolve => setTimeout(resolve, 1200));

      setStatusMsg(`${agent.name} गोचर और कुंडली के ग्रहों की स्थिति देख रहे हैं... (reading planetary degrees...)`);
      await new Promise(resolve => setTimeout(resolve, 1200));

      setStatusMsg(`${agent.name} ज्योतिषीय उपाय व मार्गदर्शन तैयार कर रहे हैं... (recalling celestial remedies...)`);

      const response = await responsePromise;
      if (!response.ok) {
        throw new Error('Connection broke. Solar flare disruption.');
      }

      const outText = await response.json();
      const botResponse = outText.text;

      // Ensure at least 3.6 seconds of total contemplation elapsed for that human touch
      const elapsed = Date.now() - startTime;
      const minDelay = 3600;
      if (elapsed < minDelay) {
        await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
      }

      setStatusMsg(`${agent.name} बोल रहे हैं... (${agent.name} is speaking...)`);

      // Append bot response and speak aloud
      setDialogFeed((prev) => [...prev, { sender: 'ai' as const, text: botResponse, time: formattedDuration }]);
      speakAudio(botResponse);
    } catch (error: any) {
      setStatusMsg('किन्हीं कारणों से गणना स्पष्ट नहीं है। कृपया पुनः प्रयास करें। (Failed to process. Please retry.)');
      console.error(error);
    }
  };

  const handleKeyboardInputSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const textVal = data.get('keyboard_input') as string;
    
    if (textVal && textVal.trim()) {
      processUserAstrologyQuery(textVal);
      e.currentTarget.reset();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-slate-950/80 border border-yellow-500/20 rounded-3xl p-6 shadow-2xl relative z-10 text-slate-100 flex flex-col justify-between max-h-[85vh]">
      {/* Session Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-900 border border-yellow-400/35 flex items-center justify-center overflow-hidden text-lg shadow-md shadow-yellow-500/5 flex-shrink-0">
            {agent.avatar.startsWith('http') ? (
              <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              agent.avatar
            )}
          </div>
          <div>
            <h3 className="text-sm font-sans font-semibold text-yellow-101 text-yellow-100">{agent.name}</h3>
            <p className="text-[10px] text-emerald-400 font-mono tracking-tight flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> Live Vocal Transit Session
            </p>
          </div>
        </div>

        {/* Real-time counters */}
        <div className="text-right">
          <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">Accrued Cost</p>
          <p className="text-sm font-sans font-extrabold text-yellow-300">
            {user.free_trial_remaining_seconds > 0 ? (
              <span className="text-[10px] bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/15">
                FREE TRIAL ACTIVE
              </span>
            ) : (
              `₹${cost.toFixed(2)}`
            )}
          </p>
        </div>
      </div>

      {/* Main Wave animation view */}
      <div className="flex-1 flex flex-col items-center justify-center py-6 min-h-[160px]">
        {/* Pulsing Visualizer Circle */}
        <div className="relative w-36 h-36 flex items-center justify-center mb-5 select-none">
          {/* Radial animated expansion ripples based on speech */}
          <div
            className={`absolute inset-0 rounded-full bg-yellow-500/5 border border-yellow-500/10 transition-all duration-300 ${
              botSpeaking ? 'scale-125 animate-ping opacity-30' : ''
            } ${userSpeaking ? 'scale-150 animate-ping opacity-40 border-cyan-400/20' : ''}`}
          ></div>
          <div
            className={`absolute inset-2 rounded-full bg-slate-900 border border-yellow-500/20 flex items-center justify-center transition-all ${
              botSpeaking ? 'shadow-lg shadow-yellow-500/20 border-yellow-400' : ''
            } ${userSpeaking ? 'shadow-lg shadow-cyan-400/20 border-cyan-400' : ''}`}
          ></div>

          {/* Central Astrological Seal icon */}
          <div className="absolute text-3xl z-10 bg-slate-800 rounded-full w-20 h-20 flex items-center justify-center overflow-hidden border border-yellow-400/20">
            {agent.avatar.startsWith('http') ? (
              <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              agent.avatar
            )}
          </div>

          {/* Miniature blinking speech mode labels */}
          {botSpeaking && (
            <span className="absolute bottom-2 text-[8px] bg-yellow-500 text-slate-950 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest flex items-center gap-1 z-20">
              <Volume2 className="w-2.5 h-2.5 animate-bounce" /> Speaking
            </span>
          )}
          {userSpeaking && (
            <span className="absolute bottom-2 text-[8px] bg-cyan-500 text-slate-950 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest flex items-center gap-1 z-20">
              <Mic className="w-2.5 h-2.5 animate-pulse" /> Your Ask
            </span>
          )}
        </div>

        {/* Dynamic Speech Wave Transcript Preview */}
        <div className="text-center max-w-sm px-4">
          <p className="text-xs text-slate-400 italic mb-2 leading-relaxed">
            {currentTranscript ? `“${currentTranscript}...”` : `“${statusMsg}”`}
          </p>
          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 font-mono">
            <span>SESSION TIME: {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}</span>
            <span>•</span>
            <span>₹{agent.price_per_minute}/min</span>
          </div>
        </div>
      </div>

      {/* Scrollable Conversation Logs Feed (Crucial client-side reference) */}
      <div className="h-28 overflow-y-auto mb-4 bg-slate-950/70 rounded-2xl border border-slate-900 p-3 space-y-2 scrollbar-thin">
        <p className="text-[9px] text-slate-500 uppercase font-mono tracking-widest flex items-center gap-1 mb-2">
          <MessageCircle className="w-3 h-3 text-yellow-500" /> Astral Transcript Feed
        </p>
        
        {dialogFeed.map((item, index) => (
          <div key={index} className={`flex flex-col ${item.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`p-2.5 rounded-xl text-xs max-w-[85%] ${
              item.sender === 'user' 
                ? 'bg-yellow-500/10 text-yellow-100 rounded-tr-none border border-yellow-500/10' 
                : 'bg-slate-900 text-slate-300 rounded-tl-none border border-slate-800'
            }`}>
              <p className="leading-relaxed">{item.text}</p>
            </div>
            <span className="text-[8px] text-slate-600 mt-0.5 px-1 font-mono">{item.time}</span>
          </div>
        ))}
      </div>

      {/* Danger & Low Balance warning popup overlays */}
      {showLowBalanceWarning && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-300 p-3 rounded-2xl text-xs flex items-center gap-2 animate-pulse">
          <ShieldAlert className="w-4 h-4 text-red-405 flex-shrink-0" />
          <div className="flex-1">
            <span className="font-bold">Dangerous balance levels detected!</span> Wallet capital is almost exhausted. Tap below to avoid sudden hanging calls.
          </div>
          <button
            onClick={() => {
              setSessionActive(false);
              completeSessionLogger();
              onHangUp();
              onRequestRecharge();
            }}
            className="bg-red-500 text-white font-bold px-2 py-1 rounded text-[10px] uppercase tracking-wide cursor-pointer hover:bg-red-600"
          >
            Recharge
          </button>
        </div>
      )}

      {/* Astrological upselling feature */}
      {duration > 15 && duration < 35 && (
        <div className="mb-4 bg-slate-900 border border-yellow-500/25 p-3 rounded-2xl text-xs flex items-center justify-between text-slate-200 animate-scale-in">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-yellow-500 animate-spin-slow" />
            <p className="text-[10px] leading-snug">
              Get an extensive chart printed instantly. <span className="text-yellow-400 font-bold">Kundli analysis report for ₹99!</span>
            </p>
          </div>
          <button
            onClick={() => {
              setSessionActive(false);
              completeSessionLogger();
              onHangUp();
              // Trigger kundli modal (parent handler)
              (window as any)._openKundliTrigger?.();
            }}
            className="text-[10px] bg-yellow-500 hover:bg-yellow-600 text-slate-950 px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition"
          >
            Calculate Chart <Sparkles className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Interactive controls and Mute options */}
      <div className="flex items-center justify-between gap-3 border-t border-slate-800 pt-4">
        {/* Toggle Speech recog */}
        <button
          onClick={toggleMicrophoneControl}
          className={`p-3 rounded-full border transition-all cursor-pointer ${
            micActive 
              ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-yellow-400' 
              : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
          }`}
          title={micActive ? 'Mute Mic' : 'Unmute Mic'}
        >
          {micActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        {/* Text Input fall-back form */}
        <form onSubmit={handleKeyboardInputSubmit} className="flex-1 flex gap-2">
          <input
            type="text"
            name="keyboard_input"
            placeholder="Type your ask instead..."
            className="flex-1 bg-slate-900/60 border border-slate-800 focus:border-yellow-400/50 rounded-full px-4 py-2 text-xs text-slate-200 outline-none transition"
          />
        </form>

        {/* Red Disconnect button */}
        <button
          onClick={handleManualHangup}
          className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all cursor-pointer shadow-lg shadow-red-500/10 flex items-center justify-center"
          title="Disconnect Astral Call"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
