/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { CreditCard, Shield, X, Sparkles, CheckCircle, ArrowRight } from 'lucide-react';
import { UserProfile, WalletTransaction } from '../types';
import { generateId } from '../services/billing';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUpdateUser: (updatedUser: UserProfile) => void;
  transactions: WalletTransaction[];
  onUpdateTransactions: (updatedTxs: WalletTransaction[]) => void;
}

const RECHARGE_PLANS = [
  { amount: 49, bonus: 0, tag: 'Starter Pack', detail: 'Ideal for 1 quick question' },
  { amount: 99, bonus: 10, tag: 'Best Value', detail: 'Try multiple astrologers', popular: true },
  { amount: 199, bonus: 25, tag: 'Cosmic Seeker', detail: 'Comes with ₹25 extra credit' },
  { amount: 499, bonus: 75, tag: 'Spiritual Guru', detail: 'Comes with ₹75 extra credit' },
  { amount: 999, bonus: 200, tag: 'Infinite Karma', detail: 'Comes with ₹200 extra credit + Priority' },
];

export default function WalletModal({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  transactions,
  onUpdateTransactions,
}: WalletModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<typeof RECHARGE_PLANS[0] | null>(RECHARGE_PLANS[1]);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [customAmount, setCustomAmount] = useState<string>('');

  if (!isOpen) return null;

  const handleRecharge = () => {
    let rechargeAmount = 0;
    let bonusAmount = 0;

    if (selectedPlan) {
      rechargeAmount = selectedPlan.amount;
      bonusAmount = selectedPlan.bonus;
    } else {
      rechargeAmount = parseFloat(customAmount);
      if (isNaN(rechargeAmount) || rechargeAmount <= 0) {
        alert('Please enter a valid recharge amount');
        return;
      }
    }

    setPaymentStatus('processing');

    // Simulate high-fidelity premium Razorpay custom overlay
    setTimeout(() => {
      const totalCredit = rechargeAmount + bonusAmount;
      const updatedUser: UserProfile = {
        ...user,
        wallet_balance: user.wallet_balance + totalCredit,
      };

      const newTx: WalletTransaction = {
        id: generateId('tx_rzp'),
        amount: rechargeAmount,
        type: 'recharge',
        status: 'completed',
        description: `Wallet recharge (₹${rechargeAmount}${bonusAmount > 0 ? ` + ₹${bonusAmount} Bonus` : ''})`,
        created_at: new Date().toISOString(),
      };

      onUpdateUser(updatedUser);
      onUpdateTransactions([newTx, ...transactions]);
      setPaymentStatus('success');
    }, 2000);
  };

  const handleCustomFocus = () => {
    setSelectedPlan(null);
  };

  const handleClose = () => {
    setPaymentStatus('idle');
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={handleClose}
    >
      <div 
        className="relative w-full max-w-xl bg-slate-900 border border-yellow-500/30 rounded-3xl overflow-hidden shadow-2xl shadow-yellow-500/5 animate-fade-in text-slate-100 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header decoration */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600"></div>

        {/* Modal Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 bg-slate-800 hover:bg-slate-700/80 p-2 rounded-full transition-all z-20"
          title="Cancel and Close"
        >
          <X className="w-5 h-5" />
        </button>

        {paymentStatus === 'idle' && (
          <div className="p-6 overflow-y-auto flex-1 scrollbar-thin">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500/10 text-yellow-400 mb-3 border border-yellow-500/20">
                <CreditCard className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-sans tracking-tight text-yellow-100 font-semibold mb-1">
                Cosmic Wallet Recharge
              </h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Secure immediate pay-per-second astro credits. Guaranteed safe checkout backed by verified cloud protocols.
              </p>
            </div>

            {/* Current Wallet Balance Status */}
            <div className="bg-gradient-to-r from-slate-950/70 to-slate-900 border border-yellow-500/10 rounded-2xl p-4 flex items-center justify-between mb-6">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-widest">Available Balance</p>
                <p className="text-3xl font-sans tracking-tight font-bold text-yellow-300">
                  ₹{user.wallet_balance.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full font-mono font-medium border border-emerald-500/15">
                  ● SANDBOX INSTANT SUCCESS
                </span>
                <p className="text-[10px] text-slate-400 mt-1">Trial credits activated</p>
              </div>
            </div>

            {/* Grid of Recharge Proposals */}
            <div className="space-y-3 mb-6">
              <p className="text-xs text-slate-300 font-medium">Select Celestial Package:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {RECHARGE_PLANS.map((plan) => (
                  <button
                    key={plan.amount}
                    onClick={() => {
                      setSelectedPlan(plan);
                      setCustomAmount('');
                    }}
                    className={`relative p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      selectedPlan?.amount === plan.amount
                        ? 'border-yellow-400 bg-yellow-500/5 shadow-lg shadow-yellow-500/5'
                        : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute top-2 right-2 text-[8px] bg-yellow-500 text-slate-950 px-1.5 py-0.5 rounded-full font-sans font-bold flex items-center gap-1">
                        <Sparkles className="w-2 h-2" /> POPULAR
                      </span>
                    )}

                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-yellow-100">₹{plan.amount}</span>
                        {plan.bonus > 0 && (
                          <span className="text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            +₹{plan.bonus} Bonus
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-300 font-sans mt-0.5 font-medium">{plan.tag}</p>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-2">{plan.detail}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom recharge option */}
            <div className="mb-6">
              <label className="block text-xs text-slate-300 font-medium mb-2">Custom Package (₹):</label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-400 font-medium select-none text-sm">₹</span>
                <input
                  type="number"
                  placeholder="Enter custom recharge amount..."
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setSelectedPlan(null);
                  }}
                  onFocus={handleCustomFocus}
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-yellow-500/60 rounded-xl py-2.5 pl-8 pr-4 text-sm text-slate-100 outline-none transition"
                />
              </div>
            </div>

            {/* Submit Action */}
            <button
              onClick={handleRecharge}
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-sans font-semibold py-3 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/10 cursor-pointer"
            >
              Confirm Recharge & Pay via Razorpay <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center gap-4 mt-4 text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-yellow-500/50" /> 256-bit encryption
              </span>
              <span>•</span>
              <span>Instant Refund Protection</span>
            </div>
          </div>
        )}

        {paymentStatus === 'processing' && (
          <div className="p-10 text-center flex flex-col items-center justify-center flex-1">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-yellow-500/20 border-t-yellow-400 animate-spin"></div>
              <div className="absolute inset-2 bg-slate-900 rounded-full flex items-center justify-center">
                <img
                  src="https://cdn.razorpay.com/logo.svg"
                  alt="Razorpay"
                  className="w-8 filter invert contrast-200"
                />
              </div>
            </div>
            <h3 className="text-xl font-medium text-slate-200 font-sans tracking-tight">Starting Razorpay Security Channel...</h3>
            <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
              Authorized and licensed by banking nodes. Do not refresh or exit this transaction window.
            </p>
            <button
              onClick={() => setPaymentStatus('idle')}
              className="mt-6 px-5 py-2 bg-slate-800 hover:bg-slate-700/80 hover:text-rose-400 text-slate-300 rounded-xl text-xs transition duration-200 font-semibold cursor-pointer border border-slate-700"
            >
              Cancel Transaction
            </button>
          </div>
        )}

        {paymentStatus === 'success' && (
          <div className="p-8 text-center flex flex-col items-center justify-center flex-1 animate-scale-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-serif text-emerald-100 font-semibold mb-1">
              Recharge Authenticated!
            </h3>
            <p className="text-xs text-slate-400 mb-6 max-w-sm">
              Cosmic credits have been deposited to your local wallet successfully. Your planetary path is now fully unlocked.
            </p>

            <div className="w-full bg-slate-950/60 rounded-2xl border border-slate-800 p-4 text-left font-mono text-xs text-slate-300 space-y-1 mb-6 max-w-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">PROVIDER:</span>
                <span>RAZORPAY SECURE LTD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">TRANSACTION ID:</span>
                <span className="text-yellow-400">{transactions[0]?.id || 'TX_SIM_883'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">MOCK AMOUNT:</span>
                <span>₹{transactions[0]?.amount}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-1 mt-1">
                <span className="text-slate-500">NEW WALLET BALANCE:</span>
                <span className="text-emerald-400 font-bold">₹{user.wallet_balance.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setPaymentStatus('idle');
                onClose();
              }}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs transition"
            >
              Return to Astral Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
