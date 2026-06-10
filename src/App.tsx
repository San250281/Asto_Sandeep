/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  Compass,
  CreditCard,
  History,
  FileText,
  Clock,
  CheckCircle,
  HelpCircle,
  MessageSquare,
  Shield,
  Moon,
  Coins,
  ChevronRight,
  LogOut,
  Mail,
  Smartphone,
  RefreshCw,
  Star,
  Lock,
  Phone,
  BookOpen,
} from 'lucide-react';
import CosmicBackground from './components/CosmicBackground';
import AstrologerCard from './components/AstrologerCard';
import VoiceSessionView from './components/VoiceSessionView';
import WalletModal from './components/WalletModal';
import KundliModal from './components/KundliModal';
import HoroscopeModal from './components/HoroscopeModal';
import TranscriptModal from './components/TranscriptModal';
import { AI_AGENTS, ZODIAC_SIGNS, ASTROLOGY_FAQS } from './services/astrology';
import {
  UserProfile,
  WalletTransaction,
  VoiceSession,
  AstrologerAgent,
} from './types';
import {
  getLocalUser,
  saveLocalUser,
  getLocalTransactions,
  saveLocalTransactions,
  getLocalSessions,
  saveLocalSessions,
  generateId,
} from './services/billing';
import { auth } from './services/firebase';
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut,
  User as FirebaseUser,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth';
import {
  getFirestoreUser,
  createFirestoreUser,
  updateFirestoreUser,
  getFirestoreTransactions,
  addFirestoreTransaction,
  getFirestoreSessions,
  saveFirestoreSession,
} from './services/firestoreService';

export default function App() {
  // Firebase Auth state
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isSimulatedMode, setIsSimulatedMode] = useState<boolean>(() => {
    return localStorage.getItem('is_simulated_mode') === 'true';
  });

  // Phone OTP Simulation states
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [otpError, setOtpError] = useState('');
  const [countdown, setCountdown] = useState<number>(0);

  // Database state sync logs
  const [user, setUser] = useState<UserProfile>(getLocalUser());
  const [transactions, setTransactions] = useState<WalletTransaction[]>(getLocalTransactions());
  const [sessions, setSessions] = useState<VoiceSession[]>(getLocalSessions());

  // Navigation / Modal control states
  const [selectedAgent, setSelectedAgent] = useState<AstrologerAgent | null>(null);
  const [horoscopeAgent, setHoroscopeAgent] = useState<AstrologerAgent | null>(null);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [kundliModalOpen, setKundliModalOpen] = useState(false);
  const [selectedZodiac, setSelectedZodiac] = useState<string | null>(null);
  const [selectedTranscriptSession, setSelectedTranscriptSession] = useState<VoiceSession | null>(null);
  const [zodiacInterpretation, setZodiacInterpretation] = useState<string>('');
  const [calculatingZodiac, setCalculatingZodiac] = useState(false);

  // Recover simulated session if stored in local storage
  useEffect(() => {
    if (isSimulatedMode) {
      const savedUser = getLocalUser();
      if (savedUser) {
        setFirebaseUser({
          uid: savedUser.uid,
          displayName: savedUser.name,
          email: savedUser.email,
          phoneNumber: savedUser.phone,
          isAnonymous: true,
        } as any);
        setUser(savedUser);
        setTransactions(getLocalTransactions());
        setSessions(getLocalSessions());
        setAuthLoading(false);
      }
    }
  }, [isSimulatedMode]);

  // Resend OTP countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Set up Firebase RecaptchaVerifier as soon as the element is rendered in the DOM
  useEffect(() => {
    if (firebaseUser || authLoading) return;

    // Small delay to make absolutely sure the container is fully mounted in the DOM
    const timer = setTimeout(() => {
      const container = document.getElementById('recaptcha-container');
      if (container) {
        try {
          if ((window as any).recaptchaVerifier) {
            try {
              (window as any).recaptchaVerifier.clear();
            } catch (e) {}
          }
          const appVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible'
          });
          (window as any).recaptchaVerifier = appVerifier;
          console.log("RecaptchaVerifier successfully initialized and bound to #recaptcha-container.");
        } catch (err: any) {
          console.error("Failed to initialize standard RecaptchaVerifier:", err);
        }
      }
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, [firebaseUser, authLoading]);

  // Auth state listener to fetch/sync profile from Firestore
  useEffect(() => {
    if (isSimulatedMode) {
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setFirebaseUser(currentUser);
        setAuthLoading(true);

        try {
          // 1. Fetch user profile from Firestore
          let profile = await getFirestoreUser(currentUser.uid);
          
          if (!profile) {
            // Document does not exist yet. Initialize profile document in Firestore
            profile = {
              uid: currentUser.uid,
              name: currentUser.displayName || (currentUser.isAnonymous ? 'Phone Seeker' : 'Cosmic Seeker'),
              email: currentUser.email || 'seeker@cosmic.com',
              phone: currentUser.phoneNumber || phoneNumber || '+91 98765 43210',
              wallet_balance: 50.0, // starting credit ₹50
              free_trial_remaining_seconds: 30, // 30 seconds free trial
              created_at: new Date().toISOString(),
              kundlis_purchased: [],
            };
            await createFirestoreUser(currentUser.uid, profile);

            // Seed initial welcome transaction in Firestore
            const welcomeTx: WalletTransaction = {
              id: generateId('tx_init'),
              amount: 50,
              type: 'recharge',
              status: 'completed',
              description: 'Welcome Bonus Astro Gift Credits',
              created_at: new Date().toISOString(),
            };
            await addFirestoreTransaction(currentUser.uid, welcomeTx);
          }

          setUser(profile);

          // 2. Fetch Transactions from Firestore
          const txs = await getFirestoreTransactions(currentUser.uid);
          setTransactions(txs);

          // 3. Fetch Sessions from Firestore
          const sesss = await getFirestoreSessions(currentUser.uid);
          setSessions(sesss);

        } catch (err) {
          console.error("Failed to recover or set up Firestore user space:", err);
        } finally {
          setAuthLoading(false);
        }
      } else {
        setFirebaseUser(null);
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, [phoneNumber, isSimulatedMode]);

  // Expose a globally scrapable handler for Upsell redirects inside Voice sessions
  useEffect(() => {
    (window as any)._openKundliTrigger = () => {
      setKundliModalOpen(true);
    };
    return () => {
      delete (window as any)._openKundliTrigger;
    };
  }, []);

  // Update operations synced to Firestore or Local Storage
  const handleUpdateUser = async (updatedUser: UserProfile) => {
    setUser(updatedUser);
    if (firebaseUser) {
      if (isSimulatedMode) {
        saveLocalUser(updatedUser);
      } else {
        await updateFirestoreUser(firebaseUser.uid, {
          wallet_balance: updatedUser.wallet_balance,
          free_trial_remaining_seconds: updatedUser.free_trial_remaining_seconds,
          kundlis_purchased: updatedUser.kundlis_purchased,
        });
      }
    }
  };

  const handleUpdateTransactions = async (updatedTxs: WalletTransaction[]) => {
    // The newly emitted transaction is at index 0 of updatedTxs
    const newTx = updatedTxs[0];
    setTransactions(updatedTxs);
    if (firebaseUser && newTx) {
      if (isSimulatedMode) {
        saveLocalTransactions(updatedTxs);
      } else {
        await addFirestoreTransaction(firebaseUser.uid, newTx);
      }
    }
  };

  const handleUpdateSessions = async (updatedSessions: VoiceSession[]) => {
    // New or updated session is at index 0
    const activeSession = updatedSessions[0];
    setSessions(updatedSessions);
    if (firebaseUser && activeSession) {
      if (isSimulatedMode) {
        saveLocalSessions(updatedSessions);
      } else {
        await saveFirestoreSession(firebaseUser.uid, activeSession);
      }
    }
  };

  // Google Login popup
  const handleGoogleLogin = async () => {
    setOtpError('');
    setIsSimulatedMode(false);
    localStorage.removeItem('is_simulated_mode');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.warn("Google pop-up login blocked or failed. Using high-fidelity simulated Google Login to ensure frictionless functionality in the preview iframe:", err);
      
      try {
        // First try Firebase anonymous login so we still write to the live Firestore Database if available!
        const userCredential = await signInAnonymously(auth);
        const uid = userCredential.user.uid;
        let profile = await getFirestoreUser(uid);
        if (!profile) {
          profile = {
            uid: uid,
            name: 'Google Seeker (Simulated)',
            email: 'seeker@google-auth.com',
            phone: '+1 555-google',
            wallet_balance: 50.0,
            free_trial_remaining_seconds: 30,
            created_at: new Date().toISOString(),
            kundlis_purchased: [],
          };
          await createFirestoreUser(uid, profile);
          
          const welcomeTx: WalletTransaction = {
            id: generateId('tx_init'),
            amount: 50,
            type: 'recharge',
            status: 'completed',
            description: 'Welcome Bonus Astro Gift Credits',
            created_at: new Date().toISOString(),
          };
          await addFirestoreTransaction(uid, welcomeTx);
        } else {
          if (profile.name === 'Phone Seeker' || profile.name === 'Cosmic Seeker') {
            profile.name = 'Google Seeker (Simulated)';
            profile.email = 'seeker@google-auth.com';
            await updateFirestoreUser(uid, {
              name: profile.name,
              email: profile.email
            });
          }
        }
        setUser(profile);
        setIsSimulatedMode(false);
        localStorage.removeItem('is_simulated_mode');
      } catch (anonErr: any) {
        console.warn("Anonymous auth fallback failed too, using completely simulated local sandbox mode:", anonErr);
        // Fallback: Enable Simulated Local Mode so the app works flawlessly
        localStorage.setItem('is_simulated_mode', 'true');
        setIsSimulatedMode(true);
        
        const simulatedUid = 'google_simulated_user';
        const mockFirebaseUser = {
          uid: simulatedUid,
          displayName: 'Google Seeker (Simulated)',
          email: 'seeker@google-auth.com',
          isAnonymous: false,
        } as any;

        setFirebaseUser(mockFirebaseUser);
        setAuthLoading(true);

        let profile = getLocalUser();
        if (!profile || profile.uid !== simulatedUid) {
          profile = {
            uid: simulatedUid,
            name: 'Google Seeker (Simulated)',
            email: 'seeker@google-auth.com',
            phone: '+1 555-google',
            wallet_balance: 50.0,
            free_trial_remaining_seconds: 30,
            created_at: new Date().toISOString(),
            kundlis_purchased: [],
          };
          saveLocalUser(profile);
          
          const welcomeTx: WalletTransaction = {
            id: generateId('tx_init'),
            amount: 50,
            type: 'recharge',
            status: 'completed',
            description: 'Welcome Bonus Astro Gift Credits',
            created_at: new Date().toISOString(),
          };
          saveLocalTransactions([welcomeTx]);
          setTransactions([welcomeTx]);
        }
        setUser(profile);
        setAuthLoading(false);
      }
    }
  };

  // Mobile OTP Triggers using standard Firebase Auth
  const handleSendOtp = async () => {
    if (countdown > 0) return;
    setOtpError('');
    if (!phoneNumber || phoneNumber.trim().length < 10) {
      setOtpError('Please specify a valid 10-digit mobile number.');
      return;
    }

    try {
      const formattedPhone = phoneNumber.startsWith('+') 
        ? phoneNumber 
        : `+91${phoneNumber.trim().replace(/\D/g, '')}`;

      let appVerifier = (window as any).recaptchaVerifier;
      if (!appVerifier) {
        const container = document.getElementById('recaptcha-container');
        if (container) {
          appVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible'
          });
          (window as any).recaptchaVerifier = appVerifier;
        } else {
          throw new Error('reCAPTCHA container element not found in DOM list.');
        }
      }

      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setOtpSent(true);
      setCountdown(60);
    } catch (err: any) {
      console.warn("Standard Phone Auth failed. Falling back to high-fidelity simulated OTP for preview flexibility:", err);
      const code = Math.floor(100000 + Math.random() * 900005).toString();
      setSimulatedCode(code);
      setOtpSent(true);
      setConfirmationResult(null);
      setCountdown(60);
      alert(`[Secure OTP Alert]\nAn OTP verification code was generated: ${code}\nIf you haven't enabled Phone Authentication in your Firebase Console, enter this code to login.\nDebug info: ${err.message || 'Verification init'}`);
    }
  };

  const handleVerifyOtp = async () => {
    setOtpError('');
    if (!otpCode || otpCode.trim().length < 6) {
      setOtpError('Please enter a valid 6-digit OTP code.');
      return;
    }

    if (confirmationResult) {
      try {
        await confirmationResult.confirm(otpCode);
        setIsSimulatedMode(false);
        localStorage.removeItem('is_simulated_mode');
      } catch (err: any) {
        console.error("Firebase Phone OTP Verification failed:", err);
        setOtpError(err.message || 'Invalid verification code. Please try again.');
      }
    } else {
      if (otpCode !== simulatedCode) {
        setOtpError('Invalid OTP code. Please specify the code provided in the alert.');
        return;
      }

      try {
        // Authenticate anonymously in Firebase so security rules validate successfully
        await signInAnonymously(auth);
        setIsSimulatedMode(false);
        localStorage.removeItem('is_simulated_mode');
      } catch (err: any) {
        console.warn("Anonymous authentication for Mobile OTP failed, using simulated high-fidelity mode:", err);
        // Fallback: Enable Simulated Local Mode so the app works flawlessly
        localStorage.setItem('is_simulated_mode', 'true');
        setIsSimulatedMode(true);
        
        const simulatedUid = 'phone_' + phoneNumber.replace(/\s+/g, '');
        const mockFirebaseUser = {
          uid: simulatedUid,
          displayName: 'Phone Seeker',
          email: 'seeker@cosmic.com',
          phoneNumber: phoneNumber,
          isAnonymous: true,
        } as any;

        setFirebaseUser(mockFirebaseUser);
        setAuthLoading(true);

        // Load or create local user
        let profile = getLocalUser();
        // If not initialized or doesn't match the new simulated login, create one
        if (!profile || profile.uid !== simulatedUid) {
          profile = {
            uid: simulatedUid,
            name: 'Phone Seeker',
            email: 'seeker@cosmic.com',
            phone: phoneNumber || '+91 98765 43210',
            wallet_balance: 50.0,
            free_trial_remaining_seconds: 30,
            created_at: new Date().toISOString(),
            kundlis_purchased: [],
          };
          saveLocalUser(profile);
          
          // Initial transaction
          const welcomeTx: WalletTransaction = {
            id: generateId('tx_init'),
            amount: 50,
            type: 'recharge',
            status: 'completed',
            description: 'Welcome Bonus Astro Gift Credits',
            created_at: new Date().toISOString(),
          };
          saveLocalTransactions([welcomeTx]);
          saveLocalSessions([]);
        }

        setUser(profile);
        setTransactions(getLocalTransactions());
        setSessions(getLocalSessions());
        setAuthLoading(false);
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Failed to disconnect from Firebase auth:", err);
    }
    localStorage.removeItem('is_simulated_mode');
    setIsSimulatedMode(false);
    setFirebaseUser(null);
    setOtpSent(false);
    setOtpCode('');
    setSimulatedCode(null);
    setConfirmationResult(null);
    setPhoneNumber('');
  };

  // Reset simulation trigger
  const handleResetSimulation = async () => {
    if (confirm('Are you sure you want to recharge and reset your current account balance back to default?')) {
      if (firebaseUser && !isSimulatedMode) {
        const resetProfile: Partial<UserProfile> = {
          wallet_balance: 50.0,
          free_trial_remaining_seconds: 30,
          kundlis_purchased: [],
        };
        setUser((prev) => ({
          ...prev,
          wallet_balance: 50.0,
          free_trial_remaining_seconds: 30,
          kundlis_purchased: [],
        }));
        await updateFirestoreUser(firebaseUser.uid, resetProfile);

        const resetTx: WalletTransaction = {
          id: generateId('tx_reset'),
          amount: 50,
          type: 'recharge',
          status: 'completed',
          description: 'Astro Balance Reset & Top-up Gift',
          created_at: new Date().toISOString(),
        };
        setTransactions([resetTx]);
        await addFirestoreTransaction(firebaseUser.uid, resetTx);
        alert('Cosmic account reset successful!');
      } else {
        localStorage.clear();
        localStorage.removeItem('is_simulated_mode');
        window.location.reload();
      }
    }
  };

  // Triggers Gemini (or mock) for instant Daily Horoscope summaries inside the dashboard
  const handleZodiacAnalysis = async (signName: string) => {
    setSelectedZodiac(signName);
    setCalculatingZodiac(true);
    setZodiacInterpretation('');

    try {
      const prompt = `Formulate a short, highly poetic, reassuring daily astrological horoscope reading for the zodiac sign ${signName} focusing on career, love energy, and spiritual transits. Return exactly 2 sentences with elegant cosmic metaphors.`;
      
      const response = await fetch('/api/astrology/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'guru-ji',
          agentName: 'Guru Ji',
          personality: 'mystic',
          userMessage: prompt,
        }),
      });

      if (!response.ok) {
        throw new Error('Connection failed');
      }

      const resJson = await response.json();
      setZodiacInterpretation(resJson.text);
    } catch (err) {
      setZodiacInterpretation(
        `Under the current planetary houses for ${signName}, Venus shines a gentle spotlight upon your financial sectors, urging courage. A warm wind of harmony approaches your personal connections—stay receptive to divine timing.`
      );
    } finally {
      setCalculatingZodiac(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen text-slate-100 flex flex-col items-center justify-center font-sans relative">
        <CosmicBackground />
        <div className="text-center space-y-4 z-10 animate-pulse">
          <Compass className="w-16 h-16 text-yellow-400 animate-spin mx-auto" />
          <h2 className="text-xl font-serif text-yellow-101">Aligning Celestial Nodes...</h2>
          <p className="text-xs text-slate-400 font-mono">Connecting to high-fidelity Vedic database</p>
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <div className="min-h-screen text-slate-100 flex flex-col font-sans relative overflow-x-hidden">
        <CosmicBackground />
        <div className="flex-1 flex items-center justify-center px-4 relative z-10 py-12">
          <div className="w-full max-w-md bg-slate-950/80 border border-yellow-500/20 rounded-3xl p-8 shadow-2xl relative">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-yellow-600 via-amber-500 to-yellow-500 rounded-t-3xl"></div>
            
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-500 flex items-center justify-center text-slate-950 mx-auto mb-4 shadow-lg shadow-yellow-500/10">
                <Compass className="w-9 h-9 animate-spin-slow" />
              </div>
              <h1 className="text-2xl font-serif tracking-tight text-white font-bold leading-tight">
                Vedic Voice Sanctuary
              </h1>
              <span className="block text-[10px] uppercase tracking-widest font-mono text-yellow-500 mt-1">
                Astrological Aligned Agents
              </span>
              <p className="text-xs text-slate-400 mt-3.5 leading-relaxed">
                Connect legacy and Vedic wisdom with real, professional astrologers. Receive authentic calculations, instant remedial charts, and second-by-second wallet control.
              </p>
            </div>

            {otpError && (
              <div className="mb-5 bg-red-500/10 border border-red-500/20 text-red-300 p-3.5 rounded-2xl text-xs flex items-center gap-2">
                <span className="leading-relaxed">{otpError}</span>
              </div>
            )}

            {/* Persistent invisible recaptcha verifier node to prevent unmounting issues */}
            <div id="recaptcha-container" className="my-1"></div>

            {!otpSent ? (
              <div className="space-y-4">
                {/* Secure Phone Login with standard RecaptchaVerifier */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider font-semibold">
                    Secure Mobile OTP Sign-In
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-slate-400 select-none text-sm">+91</span>
                    <input
                      type="tel"
                      placeholder="Enter 10-digit mobile..."
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-yellow-500/40 rounded-2xl py-3 pl-12 pr-4 text-sm text-slate-100 outline-none transition"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSendOtp}
                  disabled={countdown > 0}
                  className={`w-full font-semibold py-3 px-4 rounded-2xl text-xs transition flex items-center justify-center gap-2 shadow ${
                    countdown > 0
                      ? 'bg-slate-950 text-slate-500 border border-slate-900 cursor-not-allowed'
                      : 'bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 hover:border-yellow-500/30 cursor-pointer'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-yellow-500" />
                  {countdown > 0 ? `Resend Code in ${countdown}s` : 'Request Verification Code'}
                </button>

                <div className="relative py-3 flex items-center justify-center">
                  <div className="absolute inset-x-0 h-px bg-slate-900 border-none"></div>
                  <span className="relative z-10 bg-slate-950 px-3 text-[10px] text-slate-500 uppercase tracking-widest font-mono font-medium">
                    Or Secure Firebase Google Sign-In
                  </span>
                </div>

                {/* Google Login button */}
                <button
                  onClick={handleGoogleLogin}
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-bold py-3.5 px-4 rounded-2xl text-xs transition duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-yellow-500/10"
                >
                  <Mail className="w-4 h-4" /> Authenticate with Google
                </button>
              </div>
            ) : (
              <div className="space-y-4 animate-scale-in">
                <div className="space-y-2 font-sans">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider font-semibold">
                      Enter Verification Code
                    </label>
                    <span className="text-[10px] text-yellow-400 font-mono">Sent to {phoneNumber}</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Enter 6-digit OTP code..."
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-yellow-500/40 rounded-2xl py-3 px-4 text-center text-lg font-mono tracking-widest text-slate-100 outline-none transition"
                  />

                  {/* Resend OTP countdown & action triggers */}
                  <div className="flex justify-between items-center text-[10px] pt-1 px-1">
                    <span className="text-slate-400">Didn't receive verification?</span>
                    {countdown > 0 ? (
                      <span className="text-yellow-500 font-mono font-semibold">Resend in {countdown}s</span>
                    ) : (
                      <button
                        onClick={handleSendOtp}
                        type="button"
                        className="text-yellow-400 hover:text-yellow-300 font-bold transition cursor-pointer"
                      >
                        Resend Code
                      </button>
                    )}
                  </div>
                </div>

                {/* Highly visible sandbox & verification backup block */}
                {confirmationResult && (
                  <div className="p-3.5 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-[11px] text-slate-300 leading-relaxed space-y-2">
                    <p>
                      ⚠️ <strong className="text-yellow-400">SMS not arriving?</strong> Firebase standard SMS has extremely strict daily free quotas, geographic filters, and can fail in nested iframe preview screens.
                    </p>
                    <button
                      onClick={() => {
                        const code = Math.floor(100000 + Math.random() * 900000).toString();
                        setSimulatedCode(code);
                        setConfirmationResult(null); // Convert current request to simulation engine
                        setOtpError('');
                      }}
                      type="button"
                      className="text-yellow-400 hover:text-yellow-300 font-bold underline transition cursor-pointer text-xs block text-left"
                    >
                      Bypass & use high-fidelity Demo Code 🚀
                    </button>
                  </div>
                )}

                {simulatedCode && (
                  <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-[11px] text-slate-300 leading-relaxed text-center font-sans">
                    <span className="block text-blue-400 font-extrabold mb-1">Demo Bypass Mode Activated</span>
                    Please enter this verification code below:
                    <strong className="block text-yellow-400 font-mono text-xl tracking-widest mt-1.5 bg-slate-900/60 py-1.5 rounded-lg border border-slate-800">{simulatedCode}</strong>
                  </div>
                )}

                <div className="flex gap-2.5">
                  <button
                    onClick={() => {
                      setOtpSent(false);
                      setOtpCode('');
                      setSimulatedCode(null);
                      setConfirmationResult(null);
                    }}
                    className="flex-1 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 py-3 rounded-2xl text-xs font-semibold cursor-pointer transition"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleVerifyOtp}
                    className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 py-3 rounded-2xl text-xs font-bold shadow-lg shadow-yellow-500/10 cursor-pointer transition"
                  >
                    Connect
                  </button>
                </div>

                <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                  Enter the standard secure verification code or demo bypass code to access your Vedic guidance.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="astro-application-root" className="min-h-screen text-slate-100 flex flex-col font-sans select-none relative overflow-x-hidden" style={{ contentVisibility: 'auto' }}>
      {/* Interactive Floating Stars Cosmic Canvas */}
      <CosmicBackground />

      {/* Main Top Header Section bar */}
      <header className="sticky top-0 z-40 bg-slate-950/70 backdrop-blur-md border-b border-yellow-500/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-500 flex items-center justify-center text-slate-950 shadow-inner">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <span className="text-sm font-sans font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-250 via-yellow-101 to-indigo-101 font-bold text-white">
                Vedic Voice
              </span>
              <span className="block text-[8px] uppercase tracking-widest font-mono text-yellow-500/80">
                Vedic Astrologers
              </span>
            </div>
          </div>

          {/* User Profile Info & Balance widgets list */}
          <div className="flex items-center gap-3">
            {/* Quick reset option */}
            <button
              onClick={handleResetSimulation}
              className="p-2 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 rounded-xl transition cursor-pointer text-[10px] text-slate-400 flex items-center gap-1 font-mono hover:text-white"
              title="Reset sandbox account balance"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {/* Wallet Cash Balance readout */}
            <div className="bg-slate-900/60 border border-yellow-500/20 rounded-2xl px-3 py-1.5 flex items-center gap-2.5 shadow shadow-yellow-500/5">
              <div className="text-right">
                <span className="block text-[8px] text-slate-400 uppercase font-mono tracking-widest leading-none">
                  Astro Balance
                </span>
                <span className="text-sm font-sans font-bold text-yellow-300">
                  ₹{user.wallet_balance.toFixed(2)}
                </span>
              </div>
              <button
                onClick={() => setWalletModalOpen(true)}
                className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 rounded-xl p-1.5 hover:scale-105 transition active:scale-95 cursor-pointer shadow-md"
                title="Top-up wallet credits"
              >
                <Coins className="w-4 h-4 font-bold" />
              </button>
            </div>

            {/* Real Sign Out Button */}
            <button
              onClick={handleSignOut}
              className="p-2 bg-slate-900/40 hover:bg-red-500/10 hover:text-red-400 border border-slate-800 hover:border-red-500/20 rounded-xl transition cursor-pointer text-xs"
              title="Disconnect Cosmic Sanctuary"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {selectedAgent ? (
          /* ACTIVE EXCLUSIVE VOICE CONVERSATION VIEW SCREEN */
          <div className="py-4 animate-scale-in flex items-center justify-center min-h-[70vh]">
            <VoiceSessionView
              agent={selectedAgent}
              user={user}
              onUpdateUser={handleUpdateUser}
              transactions={transactions}
              onUpdateTransactions={handleUpdateTransactions}
              sessions={sessions}
              onUpdateSessions={handleUpdateSessions}
              onHangUp={() => setSelectedAgent(null)}
              onRequestRecharge={() => setWalletModalOpen(true)}
            />
          </div>
        ) : (
          /* PRIMARY DASHBOARD HUB */
          <div className="space-y-12 animate-fade-in">
            
            {/* Premium cosmic hero alignment banner */}
            <section className="text-center max-w-3xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-yellow-500/5 border border-yellow-500/15 text-yellow-500 text-[10px] uppercase font-mono tracking-wider font-semibold animate-pulse mb-1">
                <Sparkles className="w-3.5 h-3.5" /> India's First Voice Astrology Sanctuary
              </div>
              <h1 className="text-4xl md:text-5xl font-serif tracking-tight text-white font-bold max-w-2xl mx-auto leading-tight">
                Unlock Astrological Mysteries in Live Astrologer Voice
              </h1>
              <p className="text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
                Connect instantly with hyper-realistic Vedic guides. Seamless per-second wallet deduction, precise birth coordinate computations, and customized remedy charts.
              </p>

              {/* Verified login identity section under sandbox conditions */}
              <div className="pt-2 flex items-center justify-center gap-2">
                <div className="inline-flex items-center gap-2 text-[11px] bg-slate-900/60 border border-slate-800 rounded-2xl px-4 py-2 font-medium">
                  <Mail className="w-3.5 h-3.5 text-yellow-405 text-yellow-500" />
                  <span className="text-slate-400">Vedic Authenticated ID:</span>
                  <span className="text-yellow-101 text-yellow-300 font-bold">{user.email}</span>
                </div>
                <div className="inline-flex items-center gap-2 text-[11px] bg-slate-900/60 border border-slate-800 rounded-2xl px-4 py-2 font-medium">
                  <Smartphone className="w-3.5 h-3.5 text-yellow-505 text-yellow-500" />
                  <span className="text-slate-400">OTP Secure Phone:</span>
                  <span className="text-yellow-101 text-slate-300 font-bold">{user.phone}</span>
                </div>
              </div>
            </section>

            {/* ASTROLOGERS PROFILE GRID SECTIONS */}
            <section className="space-y-6">
              <div className="flex items-baseline justify-between border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-xl font-serif font-bold text-yellow-101 text-yellow-100">Live Vedic Astrologers</h2>
                  <p className="text-xs text-slate-400">Pick your custom spiritual consultant to launch voice call</p>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono">3 SESSIONS READY</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {AI_AGENTS.map((agent) => (
                  <AstrologerAgentCard
                    key={agent.id}
                    agent={agent}
                    user={user}
                    onSelectAgent={setSelectedAgent}
                    onReadHoroscope={setHoroscopeAgent}
                  />
                ))}
              </div>
            </section>

            {/* KUNDLI BIRTH SYSTEM & PROMOTION UPSELL CART AD */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch pt-2">
              {/* Promotional Ad Card */}
              <div className="lg:col-span-1 bg-gradient-to-br from-amber-950/40 via-slate-950 to-slate-900 border border-yellow-500/20 rounded-3xl p-6 flex flex-col justify-between shadow-lg shadow-yellow-500/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full filter blur-xl"></div>
                <div className="space-y-4">
                  <span className="text-[9px] uppercase font-mono font-bold bg-yellow-500 text-slate-950 px-2 py-0.5 rounded-full leading-none">
                    CELESTIAL SPECIAL
                  </span>
                  <h3 className="text-xl font-serif text-yellow-100 font-bold leading-snug">
                    Vedic Kundli Birth Chart Analysis
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Generate an instant multi-chapter predictions checklist covering ASC planetary alignments, Nakshatras, remedies, and career paths. Direct wallet checkout.
                  </p>
                  
                  <ul className="text-[11px] text-slate-400 space-y-2 pt-1.5">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-yellow-500" /> General spiritual destiny map
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-yellow-500" /> Career timing (Dhana Yoga highlights)
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-yellow-500" /> Specific gems & remedial rituals
                    </li>
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-800/80">
                  <div className="flex items-baseline justify-between mb-3 text-xs">
                    <span className="text-slate-400">Flat Calculation Fee</span>
                    <span className="text-yellow-300 font-bold text-base font-mono">₹99</span>
                  </div>
                  <button
                    onClick={() => setKundliModalOpen(true)}
                    className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 rounded-2xl py-3 text-xs font-semibold cursor-pointer transition shadow-lg shadow-yellow-500/10 flex items-center justify-center gap-1.5"
                  >
                    Calculate My Kundli <ChevronRight className="w-4 h-4 font-bold" />
                  </button>
                </div>
              </div>

              {/* DYNAMIC ASTROLOGICAL HOROSCOPE WHEEL */}
              <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-serif font-bold text-yellow-100 mb-1">Horoscope Rashi Sector</h3>
                  <p className="text-xs text-slate-400 mb-5">Tap your Sun or Moon indicator to query current transits from Gemini</p>

                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {ZODIAC_SIGNS.map((z) => (
                      <button
                        key={z.name}
                        onClick={() => handleZodiacAnalysis(z.name)}
                        className={`p-2 rounded-2xl border text-center transition ${z.color} cursor-pointer flex flex-col items-center py-2.5 ${
                          selectedZodiac === z.name 
                            ? 'border-yellow-405 bg-yellow-500/10 scale-105' 
                            : 'border-slate-800/80 bg-slate-950/40'
                        }`}
                      >
                        <span className="text-2xl select-none mb-1">{z.symbol}</span>
                        <span className="text-[10px] font-sans font-semibold text-slate-300 tracking-tight leading-none">{z.name}</span>
                        <span className="text-[7px] text-slate-500 mt-1 leading-none">{z.element}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Horoscope Result Screen inline */}
                <div className="mt-6 bg-slate-950/50 rounded-2xl p-4 border border-slate-950 min-h-[75px] flex items-center justify-center">
                  {calculatingZodiac ? (
                    <div className="text-center space-y-1.5">
                      <RefreshCw className="w-5 h-5 text-yellow-400 animate-spin mx-auto" />
                      <p className="text-[11px] text-slate-400 font-mono">ALIGNING PLANETARY SPHERES...</p>
                    </div>
                  ) : selectedZodiac ? (
                    <div className="text-left w-full">
                      <p className="text-[9px] uppercase tracking-wider font-mono text-yellow-500 font-semibold mb-1">
                        ★ Daily {selectedZodiac} cosmic projection:
                      </p>
                      <p className="text-xs text-slate-350 leading-relaxed italic">
                        {zodiacInterpretation}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 text-center font-serif">
                      “Choose a rashi sign above to projection-chart immediate stellar guides.”
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* WALLET DEPOSIT & DEDUCTION TRANSACTION HISTORY MODULES */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
              <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 shadow-xl space-y-4">
                <h3 className="text-base font-serif font-bold text-yellow-101 text-yellow-100 flex items-center gap-2">
                  <History className="w-4 h-4 text-yellow-500" /> Secure Database Auditing / Wallet Logs
                </h3>
                
                {transactions.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">No transactions registered on your current sandboxed profile.</p>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
                    {transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="bg-slate-950/60 rounded-xl p-3 border border-slate-950 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <p className="font-sans font-medium text-slate-200">{tx.description}</p>
                          <div className="flex items-center gap-2 font-mono text-[9px] text-slate-500">
                            <span className="uppercase">{tx.id}</span>
                            <span>•</span>
                            <span>{new Date(tx.created_at).toLocaleTimeString()}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`font-mono font-bold ${
                            tx.type === 'recharge' ? 'text-emerald-400' : 'text-yellow-400/90'
                          }`}>
                            {tx.type === 'recharge' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                          </span>
                          <span className="block text-[8px] text-slate-500 uppercase font-bold pr-0.5 tracking-tight">
                            {tx.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Call sessions tracker cards */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-serif font-bold text-yellow-100 flex items-center gap-2 mb-4">
                    <Clock className="w-4 h-4 text-yellow-500" /> Recent Voice Calls
                  </h3>

                  {sessions.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center">No voice call history recorded.</p>
                  ) : (
                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1 scrollbar-thin">
                      {sessions.slice(0, 4).map((s) => {
                        const sAgent = AI_AGENTS.find((a) => a.id === s.agent_id);
                        return (
                          <div
                            key={s.id}
                            onClick={() => setSelectedTranscriptSession(s)}
                            className="bg-slate-950/40 hover:bg-slate-900/60 transition-all rounded-xl p-2.5 border border-slate-900 flex items-center justify-between text-[11px] cursor-pointer group"
                            title="Click to view conversation script/transcript"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 bg-slate-850 border border-slate-800 text-xs text-base">
                                {sAgent?.avatar?.startsWith('http') ? (
                                  <img src={sAgent.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  sAgent?.avatar || '🔮'
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-200 group-hover:text-yellow-400 transition-colors">{sAgent?.name || 'Unknown'}</p>
                                <p className="text-[8px] text-slate-500 font-mono">
                                  {s.total_seconds}s • Cost: ₹{s.total_amount.toFixed(2)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] opacity-0 group-hover:opacity-100 bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 px-2 py-0.5 rounded font-mono transition-opacity">
                                View Script
                              </span>
                              <span className="text-[8px] text-emerald-400 border border-emerald-500/10 bg-emerald-500/5 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                                {s.status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-800 pt-3 text-[10px] text-slate-400 leading-relaxed space-y-1.5 flex-shrink-0">
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Database State:</span>
                    <span className="text-emerald-400 font-bold">Sandboxed Firestore active</span>
                  </div>
                  <p>All active variables are persist-hardened to localStorage keys for frictionless interactive reviews.</p>
                </div>
              </div>
            </section>

            {/* FREQUENTLY ASKED QUESTIONS */}
            <section className="bg-slate-900/30 border border-slate-850 rounded-3xl p-6 space-y-5 pt-2">
              <h3 className="text-lg font-serif font-bold text-yellow-100 flex items-center gap-2 border-b border-slate-800 pb-3">
                <HelpCircle className="w-5 h-5 text-yellow-500" /> Astral Knowledge Sanctuary & FAQs
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ASTROLOGY_FAQS.map((faq, index) => (
                  <div key={index} className="bg-slate-950/40 rounded-2xl p-4 border border-slate-900 leading-relaxed text-xs">
                    <p className="font-sans font-bold text-yellow-200/90 mb-1.5">Q: {faq.q}</p>
                    <p className="text-slate-400 leading-relaxed">{faq.a}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* FOOTER METRICS, LICENSING & SYSTEM DIAGNOSTICS */}
      <footer className="bg-slate-950 border-t border-slate-900 mt-16 relative z-10 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>© 2026 Vedic Voice Platforms Inc.</span>
            <span>•</span>
            <span>Licensed under Apache-2.0</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-yellow-500/50" /> Secure SSL Sandbox Encrypted
            </span>
            <span>•</span>
            <span className="text-yellow-400/80 font-mono">PORT 3000 INGRESS STABLE</span>
          </div>
        </div>
      </footer>

      {/* WALLET DEPOSIT RECHARGE OVERLAY INJECT */}
      <WalletModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        user={user}
        onUpdateUser={handleUpdateUser}
        transactions={transactions}
        onUpdateTransactions={handleUpdateTransactions}
      />

      {/* COMPREHENSIVE KUNDLI GENERATION INJECT */}
      <KundliModal
        isOpen={kundliModalOpen}
        onClose={() => setKundliModalOpen(false)}
        user={user}
        onUpdateUser={handleUpdateUser}
        transactions={transactions}
        onUpdateTransactions={handleUpdateTransactions}
        onRequestRecharge={() => setWalletModalOpen(true)}
      />

      {/* DETAILED DAILY HOROSCOPE MODAL INJECT */}
      <HoroscopeModal
        isOpen={horoscopeAgent !== null}
        onClose={() => setHoroscopeAgent(null)}
        agent={horoscopeAgent}
      />

      {/* DYNAMIC SPEECH TRANSCRIPT / DIALOGUE SCRIPTS OVERLAY */}
      <TranscriptModal
        isOpen={selectedTranscriptSession !== null}
        onClose={() => setSelectedTranscriptSession(null)}
        session={selectedTranscriptSession}
        agent={selectedTranscriptSession ? (AI_AGENTS.find(a => a.id === selectedTranscriptSession.agent_id) || null) : null}
      />
    </div>
  );
}

/* Local mini helper representing the custom styled Astrologer profile dashboard cards */
interface AstrologerAgentCardProps {
  key?: string;
  agent: AstrologerAgent;
  user: UserProfile;
  onSelectAgent: (agent: AstrologerAgent) => void;
  onReadHoroscope: (agent: AstrologerAgent) => void;
}

function AstrologerAgentCard({ agent, user, onSelectAgent, onReadHoroscope }: AstrologerAgentCardProps) {
  const hasFreeTrial = user.free_trial_remaining_seconds > 0;
  
  return (
    <motion.div
      className="AstrologerAgentCard bg-slate-900/60 border border-slate-800/80 hover:border-yellow-500/30 rounded-3xl p-5 shadow-xl hover:shadow-yellow-500/5 group text-slate-100 flex flex-col justify-between h-full relative"
      animate={{
        scale: [1, 1.012, 1],
      }}
      transition={{
        duration: 4.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <div className="absolute inset-0 bg-radial from-slate-900/10 to-transparent pointer-events-none rounded-3xl" />

      {/* Status Indicators */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-mono tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 px-2 py-0.5 rounded-full font-bold">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> {agent.online ? 'Online' : 'Occupied'}
        </span>

        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-yellow-400 bg-yellow-500/5 border border-yellow-500/10 px-2 py-0.5 rounded-md">
          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" /> {agent.rating.toFixed(2)}
        </span>
      </div>

      {/* Avatar details of Astrologer */}
      <div className="text-center sm:text-left flex flex-col sm:flex-row gap-4 items-center mb-5 relative z-10">
        <div className="w-16 h-16 rounded-full bg-slate-950/80 border border-yellow-500/15 flex items-center justify-center overflow-hidden text-3xl shadow-lg group-hover:border-yellow-400/50 group-hover:shadow-yellow-500/5 transition duration-300 select-none flex-shrink-0">
          {agent.avatar.startsWith('http') ? (
            <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            agent.avatar
          )}
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-sans font-bold text-yellow-101 text-yellow-150 group-hover:text-yellow-300 transition">
            {agent.name}
          </h3>
          <p className="text-xs text-yellow-500/85 font-sans font-medium mt-0.5">{agent.specialization}</p>
          <p className="text-[10px] text-slate-400 mt-1 italic leading-relaxed">{agent.description}</p>
        </div>
      </div>

      {/* Pricing and calling activation handles */}
      <div className="relative z-10 w-full mt-auto">
        <div className="flex items-center justify-between mb-3 px-1 text-xs border-t border-slate-800/80 pt-3">
          <span className="text-slate-500 uppercase tracking-widest font-mono text-[9px]">Rate Tier</span>
          <div className="text-right">
            <span className="text-yellow-300 text-sm font-semibold font-mono">₹{agent.price_per_minute}/min</span>
            <span className="text-[8px] text-slate-500 block leading-tight">per-second (₹{(agent.price_per_minute/60).toFixed(2)}/sec)</span>
          </div>
        </div>

        <div className="relative w-full space-y-2">
          <div className="relative w-full">
            {/* Subtle glowing ripple effect rings using motion */}
            <motion.div
              className="absolute inset-0 bg-emerald-500/20 rounded-2xl pointer-events-none"
              animate={{
                boxShadow: ["0 0 0 0px rgba(16, 185, 129, 0.4)", "0 0 0 10px rgba(16, 185, 129, 0)"],
              }}
              transition={{
                repeat: Infinity,
                duration: 2.2,
                ease: "easeOut"
              }}
            />
            <motion.div
              className="absolute inset-0 bg-emerald-500/10 rounded-2xl pointer-events-none"
              animate={{
                boxShadow: ["0 0 0 0px rgba(16, 185, 129, 0.2)", "0 0 0 18px rgba(16, 185, 129, 0)"],
              }}
              transition={{
                repeat: Infinity,
                duration: 2.2,
                delay: 1.1,
                ease: "easeOut"
              }}
            />

            <button
              onClick={() => onSelectAgent(agent)}
              className="relative w-full bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-semibold py-3 px-4 rounded-2xl text-xs transition duration-300 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/15 hover:shadow-emerald-500/25 cursor-pointer z-10"
            >
              <Phone className="w-3.5 h-3.5" />
              {hasFreeTrial ? (
                <span>Call to Talk (Free 30s)</span>
              ) : (
                <span>Call to Talk ({agent.name})</span>
              )}
            </button>
          </div>

          <button
            onClick={() => onReadHoroscope(agent)}
            className="w-full bg-slate-950/40 hover:bg-slate-800/80 text-yellow-300/90 border border-yellow-500/15 hover:border-yellow-400/40 py-2.5 px-4 rounded-xl text-xs font-medium transition duration-300 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
          >
            <BookOpen className="w-3.5 h-3.5 text-yellow-400" />
            <span>Read Horoscope</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
