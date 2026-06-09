/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Sparkles, Compass, MapPin, Calendar, Clock, Lock, BookOpen, AlertCircle, RefreshCw } from 'lucide-react';
import { UserProfile, WalletTransaction, KundliProfile } from '../types';
import { generateId } from '../services/billing';

interface KundliModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUpdateUser: (updatedUser: UserProfile) => void;
  transactions: WalletTransaction[];
  onUpdateTransactions: (updatedTxs: WalletTransaction[]) => void;
  onRequestRecharge: () => void;
}

export default function KundliModal({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  transactions,
  onUpdateTransactions,
  onRequestRecharge,
}: KundliModalProps) {
  const [profile, setProfile] = useState<KundliProfile>({
    name: '',
    dob: '',
    tob: '',
    pob: '',
    gender: 'Male',
    chart_type: 'North Indian',
  });

  const [loading, setLoading] = useState(false);
  const [purchasedReport, setPurchasedReport] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const KUNDLI_PRICE = 99;

  const handleCalculateKundli = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!profile.name || !profile.dob || !profile.tob || !profile.pob) {
      setErrorMsg('All cosmological coordinates are required.');
      return;
    }

    // Check if user has sufficient astrology capital
    if (user.wallet_balance < KUNDLI_PRICE) {
      setErrorMsg(`Insufficient balance. High-fidelity Kundli calculation requires ₹${KUNDLI_PRICE}. Please top up your wallet.`);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/astrology/kundli', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      if (!response.ok) {
        throw new Error('Connection to Vedic computing node failed.');
      }

      const reportData = await response.json();

      // Deduct balance and register transactions
      const updatedUser: UserProfile = {
        ...user,
        wallet_balance: user.wallet_balance - KUNDLI_PRICE,
        kundlis_purchased: [...user.kundlis_purchased, profile.name],
      };

      const newTx: WalletTransaction = {
        id: generateId('tx_kundli'),
        amount: KUNDLI_PRICE,
        type: 'kundli_purchase',
        status: 'completed',
        description: `Vedic Kundli Birth Chart Report (${profile.name})`,
        created_at: new Date().toISOString(),
      };

      onUpdateUser(updatedUser);
      onUpdateTransactions([newTx, ...transactions]);
      setPurchasedReport(reportData);
    } catch (err: any) {
      setErrorMsg(err.message || 'Celestial calculations failed. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl bg-slate-900 border border-yellow-500/25 rounded-3xl overflow-hidden shadow-2xl text-slate-100 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Border header */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-yellow-600 via-amber-500 to-yellow-500"></div>

        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 bg-slate-800 hover:bg-slate-700/80 p-2 rounded-full transition z-20"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 overflow-y-auto flex-1 scrollbar-thin">
          {!purchasedReport ? (
            <div>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500/10 text-yellow-400 mb-3 border border-yellow-500/15">
                  <Compass className="w-6 h-6 animate-spin-slow" />
                </div>
                <h2 className="text-2xl font-serif text-yellow-105 font-bold text-yellow-100 mb-1">
                  Vedic Natal Chart & Kundli Builder
                </h2>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Enter your exact birth parameters. Our system employs astronomical equations and Gemini engine to decipher your planets.
                </p>
              </div>

              {/* Price Tag & Wallet Status Tag */}
              <div className="bg-slate-950/70 rounded-2xl p-4 border border-slate-800 flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-yellow-500/10 p-2.5 rounded-xl text-yellow-400 border border-yellow-500/20 text-xs font-mono font-bold">
                    ₹{KUNDLI_PRICE}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-200">Full Premium Vedic Report</h4>
                    <p className="text-[10px] text-slate-400">Deducted from your wallet balance on success</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[10px] text-slate-500">Your Current balance</p>
                  <p className={`text-sm font-bold ${user.wallet_balance >= KUNDLI_PRICE ? 'text-yellow-300' : 'text-red-400'}`}>
                    ₹{user.wallet_balance.toFixed(2)}
                  </p>
                </div>
              </div>

              {errorMsg && (
                <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-300 p-3 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                  {user.wallet_balance < KUNDLI_PRICE && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onRequestRecharge();
                      }}
                      className="ml-auto underline font-bold cursor-pointer hover:text-white"
                    >
                      Recharge Now
                    </button>
                  )}
                </div>
              )}

              {loading ? (
                <div className="p-12 text-center flex flex-col items-center justify-center">
                  <RefreshCw className="w-12 h-12 text-yellow-400 animate-spin mb-4" />
                  <h4 className="text-lg font-serif font-medium text-yellow-100">Consulting Ephemerides Nodes...</h4>
                  <p className="text-xs text-slate-400 mt-2 max-w-xs">
                    Aligning planetary transits of Mars, Jupiter, Venus, Rahu & Ketu in our computational astrolabe.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleCalculateKundli} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="E.g., Priya Sharma"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        className="w-full bg-slate-950/60 border border-slate-800 focus:border-yellow-400/50 rounded-xl px-4 py-2 text-sm text-slate-100 outline-none transition"
                      />
                    </div>

                    {/* Gender Selection */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Gender</label>
                      <select
                        value={profile.gender}
                        onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                        className="w-full bg-slate-950/60 border border-slate-800 focus:border-yellow-400/50 rounded-xl px-4 py-2 text-sm text-slate-100 outline-none transition"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Non-Binary">Non-Binary</option>
                      </select>
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-yellow-500" /> Date of Birth</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={profile.dob}
                        onChange={(e) => setProfile({ ...profile, dob: e.target.value })}
                        className="w-full bg-slate-950/60 border border-slate-800 focus:border-yellow-400/50 rounded-xl px-4 py-2 text-sm text-slate-100 outline-none transition"
                      />
                    </div>

                    {/* Time of Birth */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-yellow-500" /> Time of Birth</span>
                      </label>
                      <input
                        type="time"
                        required
                        value={profile.tob}
                        onChange={(e) => setProfile({ ...profile, tob: e.target.value })}
                        className="w-full bg-slate-950/60 border border-slate-800 focus:border-yellow-400/50 rounded-xl px-4 py-2 text-sm text-slate-100 outline-none transition"
                      />
                    </div>

                    {/* Place of Birth */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-yellow-500" /> Place of Birth (City, Country)</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="E.g., New Delhi, India"
                        value={profile.pob}
                        onChange={(e) => setProfile({ ...profile, pob: e.target.value })}
                        className="w-full bg-slate-950/60 border border-slate-800 focus:border-yellow-400/50 rounded-xl px-4 py-2 text-sm text-slate-100 outline-none transition"
                      />
                    </div>

                    {/* Chart Style */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Vedic Chart Projection Type</label>
                      <div className="grid grid-cols-2 gap-3">
                        {['North Indian', 'South Indian'].map((style) => (
                          <button
                            key={style}
                            type="button"
                            onClick={() => setProfile({ ...profile, chart_type: style })}
                            className={`p-3 rounded-xl border text-sm text-center transition-all ${
                              profile.chart_type === style
                                ? 'border-yellow-500 bg-yellow-500/10 text-yellow-200'
                                : 'border-slate-800 bg-slate-950/40 text-slate-400'
                            }`}
                          >
                            {style} style
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-sans font-semibold py-3 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/5 cursor-pointer mt-6"
                  >
                    <Lock className="w-3.5 h-3.5" /> Deduct ₹99 & Retrieve Cosmic Report
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="animate-scale-in">
              <div className="text-center mb-6 border-b border-slate-800 pb-5">
                <span className="text-[10px] uppercase font-mono bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-3 py-1 rounded-full font-bold">
                  🕉️ Verified Vedic Chart Analysis
                </span>
                <h2 className="text-2xl font-serif text-yellow-101 font-semibold text-yellow-100 mt-3 mb-1">
                  Cosmic Chart: {profile.name}
                </h2>
                <p className="text-[10px] text-slate-400">
                  Calculated: {profile.dob} • {profile.tob} • {profile.pob} ({profile.chart_type})
                </p>
              </div>

              {/* Ephemerides Quick Highlights */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 text-center">
                  <p className="text-[10px] text-slate-500">MOON SIGN (RASHI)</p>
                  <p className="text-xs font-semibold text-yellow-200 mt-1">{purchasedReport.rashi}</p>
                </div>
                <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 text-center">
                  <p className="text-[10px] text-slate-500">CONSTELLATION (NAKSHATRA)</p>
                  <p className="text-xs font-semibold text-yellow-200 mt-1">{purchasedReport.nakshatra}</p>
                </div>
                <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 text-center">
                  <p className="text-[10px] text-slate-500">ASCENDANT (LAGNA)</p>
                  <p className="text-xs font-semibold text-yellow-200 mt-1">{purchasedReport.ascendant}</p>
                </div>
              </div>

              {/* Detailed Predictions Tabs */}
              <div className="space-y-4">
                {/* General Forecast */}
                <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
                  <h4 className="font-serif text-yellow-100 text-sm font-semibold mb-1 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-yellow-500" /> Celestial Alignment Summary
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{purchasedReport.predictions?.general}</p>
                </div>

                {/* Career and Wealth Forecast */}
                <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
                  <h4 className="font-serif text-yellow-100 text-sm font-semibold mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-400" /> Career & Wealth Alignment (Dhana Yoga)
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{purchasedReport.predictions?.career}</p>
                </div>

                {/* Love and Marriage Forecast */}
                <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
                  <h4 className="font-serif text-yellow-101 text-sm font-semibold mb-1 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-pink-400" /> Love Dynamics & Marriage Window (Synastry)
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{purchasedReport.predictions?.love}</p>
                </div>

                {/* Astrological Vedic Remedies (Upayas) */}
                <div className="bg-slate-950/70 p-4 rounded-2xl border border-yellow-500/10">
                  <h4 className="font-serif text-yellow-400 text-sm font-semibold mb-2">
                    🕉️ Recommended Celestial Remedies (Upayas)
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-300">
                    {purchasedReport.predictions?.remedies?.map((remedy: string, index: number) => (
                      <li key={index} className="flex gap-2">
                        <span className="text-yellow-400 font-mono select-none">[{index + 1}]</span>
                        <span>{remedy}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Control panel buttons */}
              <div className="mt-8 flex gap-3 justify-center">
                <button
                  onClick={() => setPurchasedReport(null)}
                  className="px-5 py-2.5 bg-slate-800 text-slate-300 hover:text-slate-100 rounded-xl text-xs font-semibold hover:bg-slate-700 transition"
                >
                  Generate Another Report
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-950 rounded-xl text-xs font-bold shadow hover:from-yellow-600 transition"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
