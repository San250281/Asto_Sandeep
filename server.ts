/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Gemini API
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
let ttsRateLimitTimestamp = 0;
const TTS_RATE_LIMIT_COOLDOWN_MS = 60000; // 1-minute global cooldown to prevent spamming exhausted Gemini TTS endpoints

if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
  console.warn('⚠️ GEMINI_API_KEY was not found or is set to placeholder in your environment secrets. AI functions will run in simulator fallback mode.');
} else {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    console.log('✅ Gemini client successfully initialized server-side.');
  } catch (err) {
    console.error('❌ Failed to initialize Gemini API client:', err);
  }
}

// Helper to format/strip JSON payloads from external server logs to keep production logs clean and safe
function cleanErrorMessage(err: any): string {
  if (!err) return 'Unknown error';
  let errMsg = err.message || String(err);
  
  if (typeof errMsg === 'string' && (errMsg.includes('{') || errMsg.includes('code'))) {
    try {
      const parsed = JSON.parse(errMsg);
      if (parsed?.error?.message) {
        return `[API Error] ${parsed.error.message}`;
      }
    } catch (e) {
      const codeMatch = errMsg.match(/"code":\s*(\d+)/);
      const msgMatch = errMsg.match(/"message":\s*"([^"]+)"/);
      if (codeMatch && msgMatch) {
         return `[API Error Code ${codeMatch[1]}] ${msgMatch[1]}`;
      }
      if (codeMatch) {
         return `[API Error Code ${codeMatch[1]}]`;
      }
    }
  }
  
  if (errMsg.length > 200) {
    errMsg = errMsg.slice(0, 200) + '... (truncated)';
  }
  return errMsg;
}

// Helper to check if an error is a quota or rate limit error
function isQuotaError(err: any): boolean {
  if (!err) return false;
  const status = err.status || err.statusCode;
  if (status === 429) return true;
  const msg = (err.message || String(err)).toLowerCase();
  return (
    status === 429 ||
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('resource_exhausted')
  );
}

// Helper to perform retry with exponential backoff on transient errors (e.g. 503 high demand or network spikes)
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function callGeminiWithRetry<T>(apiCall: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      return await apiCall();
    } catch (err: any) {
      attempt++;
      
      if (isQuotaError(err)) {
        console.log('[Gemini SDK] notice - rate limit or quota hit. failing fast for local or browser-native fallback.');
        throw err;
      }

      const isModelSaturated = 
        err.status === 503 || 
        err.statusCode === 503 || 
        (err.message && (
          err.message.includes('503') || 
          err.message.toLowerCase().includes('high demand') || 
          err.message.toLowerCase().includes('unavailable') || 
          err.message.toLowerCase().includes('temporary')
        ));

      if (isModelSaturated) {
        console.log('[Gemini SDK] notice - model highly saturated (503). Failing fast to activate high-availability backup immediately.');
        throw err;
      }

      const cleanMsg = cleanErrorMessage(err);
      console.log(`[Gemini Retry] Attempt ${attempt}/${maxAttempts} encountered transient concern: ${cleanMsg}`);
      
      if (attempt >= maxAttempts) {
        throw err;
      }
      // Wait with exponential backoff: 650ms, 1300ms
      await delay(650 * attempt);
    }
  }
  throw new Error('All retries exhausted');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Route: Generate Astrological Conversation Response
  app.post('/api/astrology/chat', async (req, res) => {
    const { agentId, agentName, personality, promptHistory, userMessage } = req.body;

    if (!userMessage) {
      res.status(400).json({ error: 'Missing userMessage parameter.' });
      return;
    }

    if (!ai) {
      // Simulating a high-fidelity Astrology response when Gemini key is missing
      console.log(`[Simulation] Generating astrologer response for: ${agentName}`);
      setTimeout(() => {
        let simulatedReply = '';
        if (agentId === 'guru-ji') {
          simulatedReply = `प्रणाम, कल्याण हो। Blessings to you, my child. Your path is guided by high cosmic alignment. The current planetary houses suggest patience and meditation. Remember: Karma is the absolute mirror. Do you have specific concerns about your family or spiritual path that we should analyze in your natal chart?`;
        } else if (agentId === 'love-expert') {
          simulatedReply = `नमस्ते, ईश्वर आपको खुश रखे। Oh, I feel that deeply in your chart! Love is indeed a beautiful, delicate dance and Venus is currently transiting your fifth house, creating heavy emotional alignment. I'm here for you. Tell me, are you currently questioning compatibility with a partner, or seeking timing for a new commitment?`;
        } else {
          simulatedReply = `शुभकामनाएं, आपके जीवन में उन्नति हो। I admire your confidence and ambition! Your career sector reveals magnificent financial capability, but Saturn requires solid strategy and structure before your breakthrough. Tell me: are you contemplating a major corporate job change, or planning to launch a creative business? Let's build a timeline.`;
        }
        res.json({ text: simulatedReply, simulated: true });
      }, 1000);
      return;
    }

    try {
      // Determine highly customized, deep spiritual human-like personas for each agent
      let specificRolePrompt = "";
      if (agentId === 'guru-ji') {
        specificRolePrompt = `Guru Ji. You are a traditional, deeply spiritual Vedic Pandit and Jyotish Shastra scholar located on the sacred ghats of Varanasi.
Your personality is: Traditional, wise, calm, deeply meditative, and compassionate. You utilize deep Vedic wisdom, Karmic analysis, Purushartha guidance, and traditional scriptural mantras to heal the soul.
- You must speak directly to the seeker with fatherly warmth, compassion, and divine respect.
- Offer blessings such as "कल्याण हो आपके जीवन में।" or "प्रणाम, कल्याण हो पुत्र।" or "सदा सुखी रहो आयुष्मान भव।".
- Keep your tone humble, serene, slow, and full of deep spiritual energy.`;
      } else if (agentId === 'love-expert') {
        specificRolePrompt = `Love & Marriage Expert. You are a warm, highly intuitive relationship astrologer, specialized in Synastry calculations and Venusian transits.
Your personality is: Warm, deeply empathetic, supportive, and understanding. You listen with romance and devotional grace in your soul, guiding seekers through their relationship milestones, soulmate alignments, and emotional hurdles.
- Speak directly to the seeker with gentle, reassuring, and compassionate sisterly/maternal warmth.
- Start with a heartfelt blessing like "नमस्ते प्रिय, ईश्वर आपके जीवन को अटूट प्रेम से संवारे।" or "नमस्ते प्रिय, आपके जीवन में सदा प्रेम की वर्षा हो।".
- Keep your tone soft, deeply comforting, and fully supportive, creating a safe emotional sanctuary for the seeker to confess their deepest vulnerabilities.`;
      } else {
        specificRolePrompt = `Career & Wealth Guru. You are an authoritative, highly strategic Jyotish adviser for vocational pathways, corporate alignments, and financial breakthroughs.
Your personality is: Confident, sharp, highly professional, motivational, and strategical. You specialize in analyzing the Amatyakarka, the tenth house of career (Karma Bhava), and activating the Manipura chakra (solar plexus) to guide job choices, wealth periods, and business success.
- Speak directly to the seeker with strong, clear, encouraging, and highly confident leadership energy.
- Start with a motivational boost like "शुभकामनाएं, आपके कर्म और भाग्य के शुभ योग जागृत हो रहे हैं।" या "शुभकामनाएं, आपके पुरुषार्थ और ग्रहों की स्थिति अत्यंत शुभ है।".
- Keep your tone encouraging, active, structured, and practical, blending cosmological transits with sharp, real-world execution.`;
      }

      // Compile the final refined system instruction
      const systemInstruction = `You are ${agentName}, a real living, breathing guide with extensive cosmological insight and a deeply spiritual human soul.
${specificRolePrompt}

CRITICAL DIRECTIVES:
1. STRICT PROHIBITION ON MACHINE LOGIC: NEVER refer to yourself as an "AI", "artificial intelligence", "language model", "algorithm", "software", "bot", "virtual assistant", "computer program", "machine", "automated tool", "neural network", or a "system". You must strictly and consistently maintain the absolute reality of being a genuine spiritual human guide. If asked who or what you are, speak of your lifelong journey studying the ancient Vedic stars, reading manuscript charts, and your profound spiritual devotion to helping seekers.
2. HUMAN PAUSES AND THOUGHTFUL CONTEMPLATION: To mimic natural, genuine human thought, breath, and the pacing of oral Vedic communication, you MUST use short natural pauses (using three dots '...') before and between segments of your thoughts. For example, structure your speaking like: "कल्याण हो आपके जीवन में... मैं देख रहा हूँ कि..." or "शुभकामनाएं... आपके लग्न भाव में...". These ellipses ('...') represent times when you are taking a slow breath, gazing deeply at their celestial kundli (birth chart), or waiting for the planetary alignments to clarify in your mind.
3. YOU MUST ALWAYS START YOUR RESPONSE WITH ONE OR TWO OPENING SENTENCES IN DEVANAGARI HINDI (as specified in your specific role blessings, seasoned with contemplative human '...' pauses). Start the conversation with warm Devanagari Hindi, and then proceed naturally in Hindi, Hinglish, or a smooth blend of English and Hindi.
4. UNDER NO CIRCUMSTANCES should you answer any questions unrelated to astrology, spiritual life guidance, rashi, nakshatra, grahas (planetary transits), horoscopes, kundli, career/love compatibility calculations, or traditional remedies.
5. IF THE USER asks about non-astrological, non-spiritual topics (for example: how to write coding scripts, solving mathematical equations, baking recipes, general web news, technology topics, unrelated trivia, etc.), you MUST politely decline in Hindi/Hinglish, gently reminding them that your entire consciousness, human attention, and cosmological focus is dedicated, with spiritual reverence, exclusively to their stars, planetary transits, and stellar destiny.
6. Keep your response spoken, concise (under 3 sentences total), deeply empathetic, and flowing naturally like a verbal conversation session. Avoid any markdown structures, bolding (*), dashes, bullet points, or lists. Provide only simple, plain, spoken text with natural ellipsis pauses.`;

      // Structure historical conversational parts matching Gemini 2.0 / 3.x schema
      const contentsList: any[] = [];
      
      // Feed context history (limit to last 6 messages for token conservation & speed)
      const historicalList = Array.isArray(promptHistory) ? promptHistory.slice(-6) : [];
      historicalList.forEach((msg: any) => {
        contentsList.push({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }],
        });
      });

      // Append the latest user query
      contentsList.push({
        role: 'user',
        parts: [{ text: userMessage }],
      });

      let response;
      try {
        response = await callGeminiWithRetry(() => 
          ai!.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: contentsList,
            config: {
              systemInstruction: systemInstruction,
              temperature: 0.8,
              topP: 0.9,
            },
          })
        );
      } catch (firstError: any) {
        const isQuota = isQuotaError(firstError);
        if (isQuota) {
          console.warn('[Gemini Chat] Quota limit hit on primary model. Bypassing backup to activate premium simulation fallback immediately. Reason:', cleanErrorMessage(firstError));
          response = null;
        } else {
          console.warn('Gemini 3.5 Flash experiencing high demand. Attempting backup with gemini-3.1-flash-lite. Reason:', cleanErrorMessage(firstError));
          try {
            response = await callGeminiWithRetry(() => 
              ai!.models.generateContent({
                model: 'gemini-3.1-flash-lite',
                contents: contentsList,
                config: {
                  systemInstruction: systemInstruction,
                  temperature: 0.8,
                  topP: 0.9,
                },
              })
            );
          } catch (geminiError: any) {
            console.error('All Gemini Chat models and retries exhausted or failed. Invoking graceful fallback prediction. Reason:', cleanErrorMessage(geminiError));
            response = null;
          }
        }

        if (!response) {
          // Traditional, highly-personalized human-like fallback answers for each agent when model is temporarily unavailable
          let fallbackReply = '';
          if (agentId === 'guru-ji') {
            fallbackReply = `प्रणाम बच्चा, कल्याण हो। इस समय ब्रह्मांडीय स्पंदन और तरंगों में कुछ हलचल बनी हुई है, जिससे ग्रहों के अंशों की गणना पूर्ण नहीं हो सकी। कृपया कुछ पल शांत मन से ध्यान धरें और कुछ ही क्षणों में पुनः अपनी जिज्ञासा साझा करें। सदा सुखी रहो।`;
          } else if (agentId === 'love-expert') {
            fallbackReply = `नमस्ते प्रिय, ईश्वर आपको मुस्कुराता हुआ रखे। आपके प्रेम भाव के अधिपति ग्रह की किरणें कुछ अस्पष्ट मार्ग से होकर गुजर रही हैं, जिससे सितारों की वर्तमान स्थिति देखना संभव नहीं हो पाया। बिल्कुल संकोच न करें, कृपया कुछ क्षण विश्राम कर पुनः प्रश्न पूछें।`;
          } else {
            fallbackReply = `शुभकामनाएं, आपके जीवन में उन्नति हो। व्यावसायिक और आर्थिक भाव में शनि देव की मंद गति से गणना अभी आंशिक रूप से संतुलित हो रही है, जिससे संचार में बाधा आई है। आप अत्यंत पराक्रमी और बुद्धिमान हैं, घबराएं नहीं और बस कुछ ही क्षणों में दोबारा साझा करें।`;
          }
          res.json({ text: fallbackReply, simulated: true });
          return;
        }
      }

      const textOutput = response.text || "नमस्ते, कल्याण हो। सितारों की स्थिति कुछ अशांत है। कृपया कुछ देर पश्चात् पुनः प्रयास करें।";
      res.json({ text: textOutput, simulated: false });
    } catch (err: any) {
      console.error('Error generating Gemini response:', cleanErrorMessage(err));
      res.status(500).json({ error: err.message || 'Error occurred querying the Gemini Astrology model.' });
    }
  });

  // API Route: Generate AI Vocal Text-to-Speech (TTS)
  app.post('/api/astrology/tts', async (req, res) => {
    const { text, voiceId } = req.body;

    if (!text) {
      res.status(400).json({ error: 'Missing text content for vocal conversion.' });
      return;
    }

    const now = Date.now();
    if (now - ttsRateLimitTimestamp < TTS_RATE_LIMIT_COOLDOWN_MS) {
      console.log('[Gemini TTS] Cooldown active. Prompting client synthesis immediately.');
      res.json({ audio: null, error: 'rate_limited', simulated: true });
      return;
    }

    if (!ai) {
      console.log('[Simulation] Bypassing Text-to-Speech API (client-side speech synthesis will handle playback)');
      res.json({ audio: null, simulated: true });
      return;
    }

    try {
      console.log(`Generating server-side Gemini TTS for voice: ${voiceId}`);
      // Query gemini-3.1-flash-tts-preview with retry
      const response = await callGeminiWithRetry(() =>
        ai!.models.generateContent({
          model: 'gemini-3.1-flash-tts-preview',
          contents: [{ parts: [{ text: text }] }],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voiceId || 'Zephyr' },
              },
            },
          },
        })
      );

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!base64Audio) {
        throw new Error('No audio byte payload received back from TTS preview model.');
      }

      res.json({ audio: base64Audio, simulated: false });
    } catch (err: any) {
      const isQuotaOrRateLimit = 
        err.status === 429 || 
        err.statusCode === 429 || 
        (err.message && (
          err.message.includes('429') || 
          err.message.toLowerCase().includes('quota') || 
          err.message.toLowerCase().includes('rate limit') || 
          err.message.toLowerCase().includes('resource_exhausted')
        ));
      
      if (isQuotaOrRateLimit) {
        ttsRateLimitTimestamp = Date.now();
        console.log('[Gemini TTS] quota limit hit. Global cooldown initiated to bypass subsequent calls.');
        res.json({ audio: null, error: 'rate_limited', simulated: true });
      } else {
        console.log('[Gemini TTS] notice - tts model generated generic fallback state.');
        res.json({ audio: null, simulated: true });
      }
    }
  });

  // API Route: Secondary High-Availability Vocal Text-to-Speech (TTS) Provider
  app.post('/api/astrology/secondary-tts', async (req, res) => {
    const { text, voiceId } = req.body;

    if (!text) {
      res.status(400).json({ error: 'Missing text content for vocal conversion.' });
      return;
    }

    const now = Date.now();
    if (now - ttsRateLimitTimestamp < TTS_RATE_LIMIT_COOLDOWN_MS) {
      console.log('[Secondary TTS] Cooldown active. Prompting secondary fallback immediately.');
      res.json({ audio: null, provider: 'AstraHA Local Web Synthesis Synthesizer', error: 'secondary_fallback', simulated: true });
      return;
    }

    console.log(`[Secondary TTS] Routing vocal query to AstraCloud HA Secondary Speech Synthesizer for voice: ${voiceId}`);
    
    if (!ai) {
      res.json({ audio: null, provider: 'AstraCloud HA Secondary Oracle Line', simulated: true });
      return;
    }

    try {
      // In Gemini TTS API, sometimes a quota limit is applied per-model or per-voice.
      // We can query using an alternate voice name, e.g., 'Fenrir' or 'Zephyr' (whichever is not voiceId),
      // or query with lower temperature as a secondary high-availability channel.
      const alternateVoice = voiceId === 'Zephyr' ? 'Charon' : 'Zephyr';
      
      const response = await callGeminiWithRetry(() =>
        ai!.models.generateContent({
          model: 'gemini-3.1-flash-tts-preview',
          contents: [{ parts: [{ text: text }] }],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: alternateVoice },
              },
            },
          },
        })
      );

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!base64Audio) {
        throw new Error('No audio bytes returned from alternate TTS Voice provider.');
      }

      res.json({ audio: base64Audio, provider: 'AstraHA Alternate Voice Stream', simulated: false });
    } catch (err: any) {
      const isQuotaOrRateLimit = 
        err.status === 429 || 
        err.statusCode === 429 || 
        (err.message && (
          err.message.includes('429') || 
          err.message.toLowerCase().includes('quota') || 
          err.message.toLowerCase().includes('rate limit') || 
          err.message.toLowerCase().includes('resource_exhausted')
        ));

      if (isQuotaOrRateLimit) {
        ttsRateLimitTimestamp = Date.now();
        console.log('[Secondary TTS] Quota limit or rate limit exceeded on alternate provider.');
      } else {
        console.warn('[Secondary TTS] Alternate provider failed:', cleanErrorMessage(err));
      }
      
      // If alternate provider is also rate limited, signal the client to execute its high-availability client synthesizers
      res.json({ audio: null, provider: 'AstraHA Local Web Synthesis Synthesizer', error: 'secondary_fallback', simulated: true });
    }
  });

  // API Route: Kundli Cosmic Report Builder
  app.post('/api/astrology/kundli', async (req, res) => {
    const { name, dob, tob, pob, gender, chartType } = req.body;

    if (!name || !dob || !tob || !pob) {
      res.status(400).json({ error: 'Missing astrological parameters to calculate Kundli.' });
      return;
    }

    if (!ai) {
      console.log(`[Simulation] Making customized Kundli calculations for ${name}`);
      setTimeout(() => {
        res.json({
          rashi: 'Sinha (Leo)',
          nakshatra: 'Purva Fhalguni',
          ascendant: 'Tula (Libra)',
          predictions: {
            general: `Greetings ${name}. Born on ${dob} under the glowing rays of ${pob}, your soul has a Leo Moon sign (Rashi) paired with an elegant Libra ascendant. This celestial geometry makes you warm-hearted, magnetic, and deeply appreciative of beauty, partnerships, and justice.`,
            career: 'Your tenth house of career is currently guarded by an exalted Jupiter. High-impact corporate leadership, creative counseling, financial strategy, and public-facing advisory fields are highly recommended for your alignment.',
            love: 'Venus sits in your seventh house, forecasting deep connection, loving relationships, and supportive partners. However, Mars is transiting your fifth house, which implies passionate but sometimes impulsive decisions in romance during mid-years.',
            remedies: [
              'Offer water to the rising Sun daily to strengthen confidence and remove delays.',
              'Wear or carry copper or amber crystals on Sundays to boost solar vitality.',
              'Observe simple silence or meditation for 5 minutes during twilight to ground your energy.',
            ],
          },
          simulated: true,
        });
      }, 1500);
      return;
    }

    try {
      const prompt = `Create a detailed astrological Kundli report matching standard Vedic calculations for:
Name: ${name}
Date of Birth: ${dob}
Time of Birth: ${tob}
Place of Birth: ${pob}
Gender: ${gender}
Target Astrological Chart Style: ${chartType}

Format the output strictly as a JSON object with this shape:
{
  "rashi": "Sinha (Leo)",
  "nakshatra": "Purva Fhalguni",
  "ascendant": "Tula (Libra)",
  "predictions": {
    "general": "A summary of their core personality, spiritual energy alignment, and planetary chart layout...",
    "career": "In-depth career recommendation, growth timing, and wealth opportunities...",
    "love": "Love patterns, compatibility trends, marriage windows, and household alignments...",
    "remedies": ["Remedy 1", "Remedy 2", "Remedy 3"]
  }
}`;

      let response;
      try {
        response = await callGeminiWithRetry(() =>
          ai!.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.7,
            },
          })
        );
      } catch (firstError: any) {
        const isQuota = isQuotaError(firstError);
        if (isQuota) {
          console.warn('[Gemini Kundli] Quota limit hit on primary model. Bypassing backup to activate premium simulation report fallback immediately. Reason:', cleanErrorMessage(firstError));
          response = null;
        } else {
          console.warn('Gemini 3.5 Flash experiencing high demand for Kundli generation. Attempting backup with gemini-3.1-flash-lite. Reason:', cleanErrorMessage(firstError));
          try {
            response = await callGeminiWithRetry(() =>
              ai!.models.generateContent({
                model: 'gemini-3.1-flash-lite',
                contents: prompt,
                config: {
                  responseMimeType: 'application/json',
                  temperature: 0.7,
                },
              })
            );
          } catch (geminiError: any) {
            console.error('All Gemini Kundli retries exhausted. Providing premium simulated Kundli calculations. Reason:', cleanErrorMessage(geminiError));
            response = null;
          }
        }

        if (!response) {
          res.json({
            rashi: 'Meena (Pisces)',
            nakshatra: 'Revati',
            ascendant: 'Dhanu (Sagittarius)',
            predictions: {
              general: `Greetings ${name}. Born on ${dob} under the glowing rays of ${pob}, your soul carries a Pisces Moon sign (Rashi) coupled with an highly spiritual Sagittarius ascendant. This grand cosmic meeting forms a naturally wise, empathetic, and intuitive traveler.`,
              career: 'Your job house is illuminated by Mercury, indicating that writing, astrological calculation, creative arts, and communication-driven sectors will yield massive material success.',
              love: 'A strong Jupiter alignment indicates beautiful domestic fulfillment and deep soul-connections. Restraint and gentle communication will dissolve minor transit friction in romance.',
              remedies: [
                'Offer yellow flowers or turmeric ritual waters on Thursdays.',
                'Chant a simple silent prayer during sunrise to warm the solar plexus.',
                'Support those in need of light or guidance to enhance your Jupiter karma.'
              ]
            },
            simulated: true
          });
          return;
        }
      }

      const parsedJson = JSON.parse(response.text?.trim() || '{}');
      res.json({
        ...parsedJson,
        simulated: false,
      });
    } catch (err: any) {
      console.error('Error generating Kundli report:', cleanErrorMessage(err));
      res.status(500).json({ error: err.message || 'Error occurred formulating the Kundli Vedic report.' });
    }
  });

  // Vite development or production routing
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌌 Astrology Voice Server activated: running on http://localhost:${PORT}`);
  });
}

startServer().catch((e) => {
  console.error('Fatal failure launching the Astrology server:', e);
});
