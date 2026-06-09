/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Flame, Star, Zap, PhoneCall } from 'lucide-react';
import { AstrologerAgent } from '../types';

interface AstrologerCardProps {
  agent: AstrologerAgent;
  onSelectAgent: (agent: AstrologerAgent) => void;
  walletBalance: number;
  freeTrialSeconds: number;
}

export default function AstrologerCard({
  agent,
  onSelectAgent,
  walletBalance,
  freeTrialSeconds,
}: AstrologerCardProps) {
  const hasFreeTrial = freeTrialSeconds > 0;
  
  return (
    <div
      id={`astrologer-card-${agent.id}`}
      className="relative bg-slate-900/60 border border-slate-800/80 hover:border-yellow-500/30 rounded-3xl p-5 shadow-xl transition-all duration-300 hover:shadow-yellow-500/5 group text-slate-100 flex flex-col justify-between h-full"
    >
      {/* Background radial highlight */}
      <div className="absolute inset-0 bg-radial from-slate-900/10 to-transparent pointer-events-none rounded-3xl" />

      {/* Online / Status Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-mono tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 px-2 py-0.5 rounded-full font-bold">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulseEdge"></span> {agent.online ? 'Online' : 'Occupied'}
        </span>

        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-yellow-400 bg-yellow-500/5 border border-yellow-500/10 px-2 py-0.5 rounded-md">
          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {agent.rating.toFixed(2)}
        </span>
      </div>

      {/* Profile Details */}
      <div className="text-center sm:text-left flex flex-col sm:flex-row gap-4 items-center mb-5 relative z-10">
        {/* Avatar Circle */}
        <div className="w-16 h-16 rounded-full bg-slate-950/80 border border-yellow-500/15 flex items-center justify-center overflow-hidden text-3xl shadow-lg group-hover:border-yellow-400/50 group-hover:shadow-yellow-500/5 transition duration-300 select-none flex-shrink-0">
          {agent.avatar.startsWith('http') ? (
            <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            agent.avatar
          )}
        </div>

        {/* Name and specialty */}
        <div className="flex-1">
          <h3 className="text-lg font-sans font-bold text-yellow-100 group-hover:text-yellow-300 transition">
            {agent.name}
          </h3>
          <p className="text-xs text-yellow-500/85 font-sans font-medium mt-0.5">{agent.specialization}</p>
          <p className="text-[10px] text-slate-400 mt-1 italic leading-relaxed">{agent.description}</p>
        </div>
      </div>

      {/* Call Meta Specifications */}
      <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-950/80 mb-5 text-xs text-slate-400 space-y-1 relative z-10 flex-1">
        <div className="flex justify-between">
          <span>Personality:</span>
          <span className="text-slate-300 capitalize text-[11px] font-medium">{agent.id === 'guru-ji' ? 'Traditional' : agent.id === 'love-expert' ? 'Empathetic' : 'Consultant'}</span>
        </div>
        <div className="flex justify-between">
          <span>Voice Synthesis:</span>
          <span className="text-[10px] text-yellow-400/90 font-mono">{agent.id === 'guru-ji' ? 'Charon (Male)' : agent.id === 'love-expert' ? 'Kore (Female)' : 'Puck (Premium)'}</span>
        </div>
        <div className="flex justify-between">
          <span>Total Call Experience:</span>
          <span className="text-slate-300 font-mono text-[11px]">{agent.total_calls.toLocaleString()} mins</span>
        </div>
      </div>

      {/* CTA Activation Button */}
      <div className="relative z-10">
        {/* Rate pricing */}
        <div className="flex items-center justify-between mb-3 px-1 text-xs">
          <span className="text-slate-400">Rate Tier</span>
          <div className="text-right">
            <span className="text-yellow-300 text-sm font-semibold font-mono">₹{agent.price_per_minute}/min</span>
            <span className="text-[9px] text-slate-500 block">per-second billing (₹{ (agent.price_per_minute/60).toFixed(2) }/sec)</span>
          </div>
        </div>

        <button
          onClick={() => onSelectAgent(agent)}
          className="w-full bg-slate-950/40 hover:bg-gradient-to-r hover:from-amber-500 hover:to-yellow-500 hover:text-slate-950 border border-yellow-500/20 hover:border-transparent text-yellow-400 font-sans font-semibold py-3 px-4 rounded-2xl text-xs transition duration-300 flex items-center justify-center gap-2 shadow hover:shadow-yellow-500/10 cursor-pointer"
        >
          {hasFreeTrial ? (
            <>
              <Flame className="w-4 h-4 text-orange-500 animate-pulse fill-orange-500/10" /> Talk Free (30 Secs Tool Trial)
            </>
          ) : (
            <>
              <PhoneCall className="w-3.5 h-3.5" /> Establish Cosmic Voice Session
            </>
          )}
        </button>
      </div>
    </div>
  );
}
