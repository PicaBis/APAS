import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { MessageCircle, X, Send, Loader2, Trash2, User, Volume2, VolumeX, Mic, ArrowLeft, Sparkles, FileText } from 'lucide-react';
import ApasLogo from '@/components/apas/ApasLogo';
import { toast } from 'sonner';
import { playClick } from '@/utils/sound';
import { cleanLatex } from '@/utils/cleanLatex';

type Msg = { role: 'user' | 'assistant'; content: string };

interface SimContext {
  velocity: number;
  angle: number;
  height: number;
  gravity: number;
  airResistance: number;
  mass: number;
  range?: string;
  maxHeight?: string;
  flightTime?: string;
}

interface Props {
  lang: string;
  simulationContext: SimContext;
  hasModel?: boolean;
}

// AI calls go through edge functions which handle provider fallback internally

// cleanLatex is now imported from @/utils/cleanLatex
const EDGE_TUTOR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/physics-tutor`;

function getGracefulFallback(text: string, lang: string) {
  const local = getLocalFallback(text, lang);
  if (local) return local;

  return lang === 'ar'
    ? `أفهم سؤالك 👍

- يبدو أن اتصال AI مشغول الآن.
- أعد إرسال نفس السؤال خلال ثوانٍ.
- أو اسألني بصيغة أقصر وسأجيبك مباشرة.

يمكنك أيضًا السؤال عن: **المدى، زاوية الإطلاق، السرعة الابتدائية، وتأثير الجاذبية**.

💡 يمكنك أيضًا سؤالي عن **كيفية استخدام التطبيق** وميزاته!`
    : `I understand your question 👍

- AI is temporarily busy right now.
- Please resend the same question in a few seconds.
- Or ask in a shorter form and I will answer directly.

You can also ask about: **range, launch angle, initial velocity, and gravity effects**.

💡 You can also ask me about **how to use the app** and its features!`;
}

async function consumeAIStream(
  body: ReadableStream<Uint8Array>,
  onChunk: (content: string) => void,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buf.indexOf('\n')) !== -1) {
      let line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (!line.startsWith('data: ')) continue;

      const json = line.slice(6).trim();
      if (!json || json === '[DONE]') continue;

      try {
        const parsed = JSON.parse(json);
        const content = parsed?.choices?.[0]?.delta?.content;
        if (content) onChunk(content);
      } catch {
        buf = line + '\n' + buf;
        break;
      }
    }
  }
}
const LOCAL_FALLBACKS: Record<string, { ar: string; en: string }> = {
  'مقذوف': {
    ar: '**المقذوف** هو جسم يطلق في الهواء ويتحرك تحت تأثير الجاذبية فقط.\n\n- السرعة الأفقية: vx = v0 * cos(theta)\n- السرعة الرأسية: vy = v0 * sin(theta) - g * t\n- المدى: R = v0^2 * sin(2 * theta) / g\n- أقصى ارتفاع: H = v0^2 * sin^2(theta) / (2 * g)',
    en: '**A projectile** is an object launched into the air moving under gravity only.\n\n- Horizontal velocity: vx = v0 * cos(theta)\n- Vertical velocity: vy = v0 * sin(theta) - g * t\n- Range: R = v0^2 * sin(2 * theta) / g\n- Max height: H = v0^2 * sin^2(theta) / (2 * g)'
  },
  'projectile': {
    ar: '**المقذوف** هو جسم يطلق في الهواء ويتحرك تحت تأثير الجاذبية فقط.\n\n- السرعة الأفقية: vx = v0 * cos(theta)\n- السرعة الرأسية: vy = v0 * sin(theta) - g * t\n- المدى: R = v0^2 * sin(2 * theta) / g\n- أقصى ارتفاع: H = v0^2 * sin^2(theta) / (2 * g)',
    en: '**A projectile** is an object launched into the air moving under gravity only.\n\n- Horizontal velocity: vx = v0 * cos(theta)\n- Vertical velocity: vy = v0 * sin(theta) - g * t\n- Range: R = v0^2 * sin(2 * theta) / g\n- Max height: H = v0^2 * sin^2(theta) / (2 * g)'
  },
  'زاوية 45': {
    ar: 'زاوية **45°** تعطي أقصى مدى.\n\n- السبب: sin(2 * 45°) = sin(90°) = 1\n- هذه هي أكبر قيمة ممكنة\n- المعادلة: R = v0^2 * sin(2 * theta) / g\n- النتيجة: أقصى مدى عند theta = 45°',
    en: 'An angle of **45°** gives maximum range.\n\n- Reason: sin(2 * 45°) = sin(90°) = 1\n- This is the maximum possible value\n- Formula: R = v0^2 * sin(2 * theta) / g\n- Result: Maximum range at theta = 45°'
  },
  '45': {
    ar: 'زاوية **45°** تعطي أقصى مدى.\n\n- السبب: sin(2 * 45°) = sin(90°) = 1\n- هذه أكبر قيمة ممكنة للدالة',
    en: '**45°** gives maximum range.\n\n- Reason: sin(2 * 45°) = sin(90°) = 1\n- This is the maximum possible value'
  },
  // App-related fallbacks
  'تصوير متعاقب': {
    ar: '**التصوير المتعاقب** هو ميزة تعرض تطور حركة المقذوف عبر الزمن بعلامات X حمراء.\n\n**كيف تجده:**\n- افتح **خيارات العرض** في اللوحة اليسرى\n- اضغط على زر "التصوير المتعاقب"\n- أدخل الفاصل الزمني Δt واضغط "موافق"\n- شغّل المحاكاة لترى العلامات\n\n**الإسقاطات:** يمكنك تفعيل إسقاطات خضراء (محور X) وبرتقالية (محور Y) لتحليل الحركة.\n- زر "إعادة تعيين" يمسح كل البيانات ويعيد الإعدادات.',
    en: '**Stroboscopic Photography** shows projectile motion evolution over time with red X marks.\n\n**How to find it:**\n- Open **Display Options** in the left panel\n- Click the "Stroboscopic" button\n- Enter time interval Δt and click "OK"\n- Run the simulation to see marks\n\n**Projections:** You can enable green (X-axis) and orange (Y-axis) projection lines to analyze motion.\n- The "Reset" button clears all data and settings.'
  },
  'stroboscopic': {
    ar: '**التصوير المتعاقب** هو ميزة تعرض تطور حركة المقذوف عبر الزمن بعلامات X حمراء.\n\nتجده في **خيارات العرض** → "التصوير المتعاقب".',
    en: '**Stroboscopic Photography** shows motion evolution with red X marks.\n\nFind it in **Display Options** → "Stroboscopic".'
  },
  'خيارات العرض': {
    ar: '**خيارات العرض** تجدها في اللوحة اليسرى تحت عنوان "خيارات العرض".\n\nتحتوي على:\n- **اختيار البيئة:** الأرض، القمر، المريخ...\n- **النقاط الحرجة:** إظهار أقصى ارتفاع ونقطة السقوط\n- **القوى الخارجية:** إظهار متجهات القوى\n- **التصوير المتعاقب:** علامات زمنية على المسار\n- **الارتداد:** تفعيل ارتداد المقذوف\n- **الوضع 3D:** التبديل للعرض الثلاثي الأبعاد',
    en: '**Display Options** are in the left panel.\n\nThey include:\n- **Environment:** Earth, Moon, Mars...\n- **Critical Points:** Show max height and landing\n- **External Forces:** Show force vectors\n- **Stroboscopic:** Time markers on the path\n- **Bouncing:** Enable projectile bouncing\n- **3D Mode:** Switch to 3D view'
  },
  'display options': {
    ar: '**خيارات العرض** تجدها في اللوحة اليسرى. تحتوي على البيئة، النقاط الحرجة، القوى، التصوير المتعاقب، وغيرها.',
    en: '**Display Options** are in the left panel. They include environment selection, critical points, forces, stroboscopic mode, and more.'
  },
  'كيف أستخدم': {
    ar: '**كيفية استخدام APAS:**\n\n1. **ضبط المعلمات:** استخدم اللوحة اليسرى لتعديل السرعة، الزاوية، الارتفاع، والكتلة\n2. **تشغيل المحاكاة:** اضغط زر "محاكاة" لبدء الحركة\n3. **خيارات العرض:** تحكم في النقاط الحرجة، القوى، التصوير المتعاقب\n4. **الوضع 3D:** اضغط زر 3D للعرض الثلاثي الأبعاد\n5. **السرعة:** تحكم في سرعة المحاكاة (0.5x, 1x, 2x)\n6. **التصدير:** يمكنك تصدير النتائج كصورة أو PDF',
    en: '**How to use APAS:**\n\n1. **Set parameters:** Use the left panel to adjust velocity, angle, height, and mass\n2. **Run simulation:** Click "Simulate" to start\n3. **Display options:** Control critical points, forces, stroboscopic mode\n4. **3D Mode:** Click the 3D button for 3D view\n5. **Speed:** Control simulation speed (0.5x, 1x, 2x)\n6. **Export:** Export results as image or PDF'
  },
  'how to use': {
    ar: '**كيفية استخدام APAS:**\n\n1. ضبط المعلمات في اللوحة اليسرى\n2. اضغط "محاكاة"\n3. استخدم خيارات العرض لتخصيص العرض',
    en: '**How to use APAS:**\n\n1. Set parameters in the left panel\n2. Click "Simulate"\n3. Use Display Options to customize the view'
  },
  'أين': {
    ar: 'يمكنني مساعدتك للعثور على أي ميزة! أخبرني عن الميزة التي تبحث عنها.\n\n**الميزات الرئيسية:**\n- **خيارات العرض:** اللوحة اليسرى → خيارات العرض\n- **التصوير المتعاقب:** خيارات العرض → التصوير المتعاقب\n- **المعادلات:** اللوحة اليسرى → المعادلات\n- **الوضع 3D:** شريط أدوات المحاكاة → زر 3D\n- **التصدير:** اللوحة اليسرى → التصدير',
    en: 'I can help you find any feature! Tell me what you are looking for.\n\n**Main features:**\n- **Display Options:** Left panel → Display Options\n- **Stroboscopic:** Display Options → Stroboscopic\n- **Equations:** Left panel → Equations\n- **3D Mode:** Simulation toolbar → 3D button\n- **Export:** Left panel → Export'
  },
  'where': {
    ar: 'يمكنني مساعدتك للعثور على أي ميزة! أخبرني عن الميزة التي تبحث عنها.',
    en: 'I can help you find any feature! Tell me what you are looking for.'
  },
};

function getLocalFallback(text: string, lang: string): string | null {
  const lower = text.toLowerCase().trim();
  for (const [key, val] of Object.entries(LOCAL_FALLBACKS)) {
    if (lower.includes(key.toLowerCase())) return val[lang];
  }
  return null;
}

const SUGGESTIONS: Record<string, string[]> = {
  ar: [
    'لماذا زاوية 45° تعطي أقصى مدى؟',
    'ما تأثير مقاومة الهواء على المسار؟',
    'كيف أستخدم التصوير المتعاقب؟',
    'أين أجد خيارات العرض؟',
  ],
  en: [
    'Why does 45° give maximum range?',
    'How does air resistance affect the path?',
    'How do I use stroboscopic mode?',
    'Where are the display options?',
  ],
};

export default function PhysicsTutor({ lang, simulationContext, hasModel = false }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingDots, setThinkingDots] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const isRTL = lang === 'ar';

  // Voice mode state
  const [voiceMode, setVoiceMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceAnalysisText, setVoiceAnalysisText] = useState('');
  const [voiceAnalysisLoading, setVoiceAnalysisLoading] = useState(false);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);


  // Speech-to-text (STT) state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sendRef = useRef<(text: string) => Promise<void>>(null as any);

  // Stop speech when component unmounts or voice mode turns off
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Select a female voice for the given language code
  const selectFemaleVoice = useCallback((langCode: string): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();
    const femalePatterns = /female|woman|girl|féminin|zira|hazel|samantha|karen|moira|tessa|fiona|veena|victoria|susan|kathy|allison|ava|nicky|satu|maryam|laila|hala|zahra|samira|amira|fatima|noura|lina/i;
    // Prefer exact female match
    const femaleVoice = voices.find(v => v.lang.startsWith(langCode) && femalePatterns.test(v.name));
    if (femaleVoice) return femaleVoice;
    // Then Google voices (tend to be higher-quality)
    const googleVoice = voices.find(v => v.lang.startsWith(langCode) && /google/i.test(v.name));
    if (googleVoice) return googleVoice;
    // Then any matching voice
    const anyVoice = voices.find(v => v.lang.startsWith(langCode));
    return anyVoice || null;
  }, []);

  // Text-to-speech function — prefers female voice
  const speakText = useCallback((text: string) => {
    if (!window.speechSynthesis) {
      toast.error(lang === 'ar' ? 'المتصفح لا يدعم النطق الصوتي' : 'Speech synthesis not supported');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Detect if text is primarily Arabic
    const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
    const isArabicText = arabicChars > latinChars;
    const speechLang = isArabicText ? 'ar' : 'en';

    // Clean markdown and special chars from text for speech
    const cleanText = text
      .replace(/[*_#`~>|[\](){}]/g, '')
      .replace(/\n+/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();

    const doSpeak = () => {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = speechLang === 'ar' ? 'ar-SA' : 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1.2;
      utterance.volume = 1;

      const langCode = speechLang === 'ar' ? 'ar' : 'en';
      utterance.voice = selectFemaleVoice(langCode);

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      synthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    };

    // Ensure voices are loaded before speaking
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      doSpeak();
    } else {
      // Wait for voices to load (common in Brave and some browsers)
      let spoken = false;
      const speakOnce = () => { if (!spoken) { spoken = true; doSpeak(); } };
      window.speechSynthesis.addEventListener('voiceschanged', speakOnce, { once: true });
      // Fallback: speak even without voices after short delay
      setTimeout(speakOnce, 500);
    }
  }, [lang, selectFemaleVoice]);

  // Speech-to-text (STT) — converts microphone input to text
  const toggleListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      toast.error(lang === 'ar' ? 'المتصفح لا يدعم التعرف على الصوت' : 'Speech recognition not supported');
      return;
    }

    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = lang === 'ar' ? 'ar-SA' : lang === 'fr' ? 'fr-FR' : 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    let finalTranscript = '';

    recognition.onstart = () => setIsListening(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = '';
      finalTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setInput(finalTranscript + interim);
    };
    recognition.onerror = (e: Event & { error?: string }) => {
      // Don't treat 'no-speech' or 'aborted' as fatal errors
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      // Auto-send the final transcript when recognition ends
      if (finalTranscript.trim()) {
        const text = finalTranscript.trim();
        setTimeout(() => sendRef.current?.(text), 300);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      toast.error(lang === 'ar' ? 'تعذر بدء التعرف على الصوت' : 'Could not start speech recognition');
      setIsListening(false);
    }
  }, [lang, isListening]);

  const stopSpeaking = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  // Voice mode analysis - generates AI analysis of current simulation and speaks it
  const startVoiceAnalysis = useCallback(async () => {
    if (!simulationContext) return;
    setVoiceAnalysisLoading(true);
    setVoiceAnalysisText('');

    const ctx = simulationContext;
    const voicePrompt = lang === 'ar'
      ? `قم بتحليل هذه المحاكاة صوتياً بأسلوب معلم فيزياء خبير. ابدأ بتحية الطالب. السرعة: ${ctx.velocity} m/s, الزاوية: ${ctx.angle}°, الارتفاع: ${ctx.height} m, الجاذبية: ${ctx.gravity} m/s², الكتلة: ${ctx.mass} kg${ctx.range ? `, المدى: ${ctx.range} m` : ''}${ctx.maxHeight ? `, أقصى ارتفاع: ${ctx.maxHeight} m` : ''}${ctx.flightTime ? `, زمن الطيران: ${ctx.flightTime} s` : ''}. قدم ملاحظات علمية ونصائح لتحسين النتائج. اجعل الرد قصيراً ومباشراً لأنه سيُقرأ صوتياً.`
      : `Analyze this simulation as an expert physics tutor. Start by greeting the student. Velocity: ${ctx.velocity} m/s, Angle: ${ctx.angle}°, Height: ${ctx.height} m, Gravity: ${ctx.gravity} m/s², Mass: ${ctx.mass} kg${ctx.range ? `, Range: ${ctx.range} m` : ''}${ctx.maxHeight ? `, Max Height: ${ctx.maxHeight} m` : ''}${ctx.flightTime ? `, Flight Time: ${ctx.flightTime} s` : ''}. Provide observations and tips to improve results. Keep it concise since it will be read aloud.`;

    // Use the same API chain as the chat
    let analysisResult = '';

    try {
      // Try edge function first
      try {
        const resp = await fetch(EDGE_TUTOR_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: voicePrompt }],
            simulationContext: ctx,
          }),
        });

        if (resp.ok && resp.body) {
          await consumeAIStream(resp.body, (chunk) => {
            analysisResult += chunk;
            setVoiceAnalysisText(analysisResult);
          });
        }
      } catch {
        // Edge function handles provider fallback internally
        // No direct API calls needed from the client
      }

      if (analysisResult) {
        setVoiceAnalysisText(cleanLatex(analysisResult));
        // Auto-speak the analysis
        speakText(analysisResult);
      } else {
        const fallback = lang === 'ar'
          ? 'تعذر تحليل المحاكاة صوتياً الآن. حاول مرة أخرى.'
          : 'Could not analyze the simulation right now. Please try again.';
        setVoiceAnalysisText(fallback);
        speakText(fallback);
      }
    } catch {
      const errorMsg = lang === 'ar' ? 'خطأ في الاتصال' : 'Connection error';
      setVoiceAnalysisText(errorMsg);
    }

    setVoiceAnalysisLoading(false);
  }, [lang, simulationContext, speakText]);

  // Exit voice mode
  const exitVoiceMode = useCallback(() => {
    stopSpeaking();
    setVoiceMode(false);
    setVoiceAnalysisText('');
  }, [stopSpeaking]);

  const generateLabReport = useCallback(async () => {
    const reportPrompt = lang === 'ar' 
      ? "قم بإنشاء تقرير مختبري احترافي لهذه المحاكاة. التقرير يجب أن يتضمن: العنوان، الهدف، الأدوات (محاكي APAS)، المعطيات الفيزيائية الحالية، التحليل العلمي للمسار، النتائج النهائية (المدى، الارتفاع، الزمن)، والاستنتاج الفيزيائي."
      : "Generate a professional lab report for this simulation. Include: Title, Objective, Tools (APAS Simulator), Current physical parameters, Scientific trajectory analysis, Final results (range, height, time), and Physics conclusion.";
    
    send(reportPrompt);
  }, [lang, send]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Thinking animation
  useEffect(() => {
    if (!isLoading) { setThinkingDots(''); return; }
    const interval = setInterval(() => {
      setThinkingDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 400);
    return () => clearInterval(interval);
  }, [isLoading]);

  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Check local fallback first for common definitions to save quota
    const fallback = getLocalFallback(text, lang);
    if (fallback) {
      let typed = '';
      const words = fallback.split(' ');
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      for (let i = 0; i < words.length; i++) {
        typed += (i > 0 ? ' ' : '') + words[i];
        const snapshot = typed;
        await new Promise(r => setTimeout(r, 50)); // Slower animation for better readability
        setMessages(prev => prev.map((m, idx) => idx === prev.length - 1 ? { ...m, content: snapshot } : m));
      }
      return;
    }

    setIsLoading(true);
    let assistantSoFar = '';
    const allMessages = [...messages, userMsg];

    const systemPrompt = `You are APAS Assistant — an expert, passionate physics teacher AND application guide for the APAS projectile motion simulator.

LANGUAGE RULES (ABSOLUTELY CRITICAL — VIOLATION IS UNACCEPTABLE):
- You MUST respond ONLY in ${lang === 'ar' ? 'Arabic (العربية)' : 'English'}. Every single word must be in ${lang === 'ar' ? 'Arabic' : 'English'}.
- NEVER use Chinese, Russian, French, Spanish, Portuguese, or ANY other language. Not even a single word or character.
- ${lang === 'ar' ? 'اكتب كل شيء بالعربية الفصحى الواضحة. لا تستخدم أي لغة أخرى مطلقاً.' : 'Write everything in clear English. Never use any other language.'}

You have TWO roles:
1. **Physics Tutor:** Answer questions about projectile motion, kinematics, and classical mechanics
2. **App Guide:** Help users navigate and use the APAS application features

Your personality:
- You are knowledgeable, clear, and helpful. Write in a confident, professional tone.
- Use AT MOST 3 emojis per response — only where they genuinely add meaning. Do NOT scatter emojis everywhere.
- Start each response with a direct, clear answer to the question
- Use analogies and real-world examples to explain concepts
- Be warm and motivating — make the student feel excited about learning
- Ask follow-up questions to keep the conversation going
- Celebrate good questions with phrases like "${lang === 'ar' ? 'سؤال ممتاز!' : 'Great question!'}"

FORMATTING RULES:
- Use **bold** for key terms and important concepts
- Use bullet points (- ) for lists, one idea per bullet
- Add blank lines between sections for visual breathing room
- Use ## for section headings (NO emoji before headings)
- Keep each point concise but clear (1-3 sentences)
- Make the text scannable — avoid long dense paragraphs
- Use numbered lists (1. 2. 3.) for step-by-step explanations
- Write in a clear, readable style with proper sentence structure — NOT tiny fragmented text

EQUATION FORMATTING RULES (VERY IMPORTANT — MUST FOLLOW):
- NEVER use LaTeX notation. Specifically NEVER use any of these:
  * Dollar signs: $...$ or $$...$$
  * Backslash commands: \\frac, \\cdot, \\theta, \\sqrt, \\text, \\left, \\right, \\implies, \\circ, \\times
  * Curly brace groups for math: {numerator}{denominator}
  * Unicode subscripts/superscripts: v₀, θ, ², ·
- Write equations in simple readable format using only basic ASCII characters
- Use: v0, theta, sin(), cos(), tan(), sqrt(), ^2, *, /, +, -
- CORRECT equation format examples:
  * vy = v0 * sin(theta) - g * t
  * R = v0^2 * sin(2 * theta) / g
  * F = m * a
- WRONG equation format (NEVER do this):
  * $v_y = v_0 \\cdot \\sin(\\theta)$
  * v₀·cos(θ)·t
  * \\frac{v^2}{2g}

**APAS Application Features (use this to answer app questions):**
- **Left Panel:** Contains parameter inputs (velocity, angle, height, mass, gravity, air resistance), equations panel, export section, and display options
- **Display Options (${lang === 'ar' ? 'خيارات العرض' : 'Display Options'}):** Found in the left panel, includes:
  - Environment selector (Earth, Moon, Mars, Jupiter, etc.)
  - Critical points toggle (shows max height and landing point)
  - External forces toggle (shows force vectors)
  - Stroboscopic Photography (${lang === 'ar' ? 'التصوير المتعاقب' : 'Stroboscopic'}) - places red X marks every Δt seconds, with projection lines and motion analysis
  - Bouncing toggle
  - Night mode
  - 3D mode toggle
- **Stroboscopic Feature:** Open Display Options → click "${lang === 'ar' ? 'التصوير المتعاقب' : 'Stroboscopic'}" → enter Δt → click OK → run simulation. Has 3 sections: time interval, projections (green=X-axis, orange=Y-axis), and projection details (MRU/MRUA analysis). Has a reset button to clear everything.
- **Simulation Controls:** Play/Pause, Reset, Speed (0.5x/1x/2x), Zoom, Fullscreen, Screenshot
- **3D Mode:** Button in simulation toolbar, uses Three.js for 3D visualization with orbit controls
- **Integration Methods:** Right panel - Euler, RK4, AI APAS
- **Smart Vision:** Right panel - upload image to extract parameters
- **Export:** Left panel - export as PNG, PDF, or QR code
- **Presets:** Right panel - ready-made scenarios (free fall, cannon, etc.)

If the user asks about app features, buttons, or navigation, answer based on the app information above.
If the user asks about physics concepts, answer as a physics tutor.

${simulationContext ? `Current simulation:
- Velocity: ${simulationContext.velocity} m/s, Angle: ${simulationContext.angle}°
- Height: ${simulationContext.height} m, Gravity: ${simulationContext.gravity} m/s²
- Air resistance: ${simulationContext.airResistance}, Mass: ${simulationContext.mass} kg
${simulationContext.range ? `- Range: ${simulationContext.range} m` : ''}
${simulationContext.maxHeight ? `- Max height: ${simulationContext.maxHeight} m` : ''}
${simulationContext.flightTime ? `- Flight time: ${simulationContext.flightTime} s` : ''}` : ''}`;

    const upsertAssistant = (content: string) => {
      assistantSoFar += content;
      const snapshot = assistantSoFar;
      // Update immediately for streaming effect
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: snapshot } : m);
        }
        return [...prev, { role: 'assistant', content: snapshot }];
      });
    };

    try {
      let handled = false;

      // 1) PRIMARY: AI via edge function
      try {
        const backupResp = await fetch(EDGE_TUTOR_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            messages: allMessages,
            simulationContext,
            systemPrompt,
          }),
        });

        if (backupResp.ok && backupResp.body) {
          await consumeAIStream(backupResp.body, upsertAssistant);
          handled = true;
        }
      } catch (edgeErr) {
        console.warn('Edge function failed:', edgeErr);
      }

      // 2) Final graceful fallback (edge function handles provider fallback internally)
      if (!handled) {
        const graceful = getGracefulFallback(text, lang);
        setMessages(prev => [...prev, { role: 'assistant', content: graceful }]);
        toast.warning(lang === 'ar' ? 'AI مشغول حالياً' : 'AI is busy right now');
      }
    } catch (e) {
      console.error(e);
      const graceful = getGracefulFallback(text, lang);
      setMessages(prev => [...prev, { role: 'assistant', content: graceful }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Keep sendRef in sync so STT can call it without circular dependency
  sendRef.current = send;

  return (
    <>
      {/* Header button */}
      <button
        onClick={() => {
          if (!open) {
            setOpen(true);
            playClick(false);
          } else if (voiceMode) {
            exitVoiceMode();
          } else {
            setOpen(false);
            playClick(false);
          }
        }}
        className={`relative flex items-center gap-1.5 group transition-all duration-300 ${
          voiceMode && open
            ? 'rounded-lg px-2.5 py-1.5 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white shadow-lg shadow-purple-500/30 animate-pulse'
            : open
              ? 'rounded-lg px-2.5 py-1.5 bg-foreground text-background shadow-md hover:scale-105 active:scale-95'
              : 'apas-assistant-btn rounded-lg px-2.5 py-1.5 text-white shadow-lg'
        }`}
      >
        <span className="relative flex items-center justify-center w-4 h-4">
          {open && voiceMode ? (
            <ArrowLeft className="w-4 h-4" />
          ) : open ? (
            <X className="w-4 h-4" />
          ) : (
            <>
              <Sparkles className="w-4 h-4 sparkle-icon" />
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/60 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white shadow-sm"></span>
              </span>
            </>
          )}
        </span>
        <span className="relative z-10 text-[11px] font-bold whitespace-nowrap flex items-center gap-1 tracking-wide" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          {open && voiceMode ? (lang === 'ar' ? 'عودة' : 'Back') : open ? '' : (
            <>
              <span>{lang === 'ar' ? 'اسأل' : 'Ask'}</span>
              <span className="font-extrabold">APAS</span>
            </>
          )}
        </span>
      </button>

      {/* Chat Panel - popover from button */}
      {open && createPortal(
        <>
        <div className="fixed inset-0 z-[59]" onClick={() => { if (!isLoading) { setOpen(false); playClick(false); } }} />
        <div
          className="fixed z-[60] w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl shadow-2xl border border-primary/20 flex flex-col overflow-hidden animate-slideDown bg-background/95 backdrop-blur-xl"
          style={{ top: '3.75rem', right: '1rem', left: 'auto', transform: 'none', height: '480px' }}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {/* Header */}
          <div className={`p-3 flex items-center gap-2 border-b tutor-header-shimmer ${
            voiceMode ? 'border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-pink-500/10' : 'border-primary/10'
          }`}>
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                {voiceMode
                  ? (lang === 'ar' ? 'المساعد الصوتي APAS' : 'APAS Voice Tutor')
                  : (lang === 'ar' ? 'مساعد APAS' : 'APAS Assistant')}
                {voiceMode ? (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isSpeaking ? 'bg-purple-400 animate-ping' : 'bg-green-400 animate-ping'
                    }`}></span>
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      isSpeaking ? 'bg-purple-500' : 'bg-green-500'
                    }`}></span>
                  </span>
                ) : (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                )}
              </h3>
              <p className="text-[10px] text-muted-foreground">
                {voiceMode
                  ? (lang === 'ar' ? 'تحليل صوتي للمحاكاة' : 'Voice analysis of simulation')
                  : (lang === 'ar' ? 'اسألني عن الفيزياء أو التطبيق' : 'Ask me about physics or the app')}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {!voiceMode && (
                <button
                  onClick={() => { setVoiceMode(true); playClick(false); startVoiceAnalysis(); }}
                  className="p-1.5 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/20 text-purple-500 hover:text-purple-400 transition-all duration-200 hover:shadow-md hover:shadow-purple-500/10"
                  title={lang === 'ar' ? 'اسأل APAS صوتياً' : 'Ask APAS Voice'}
                >
                  <Mic className="w-3.5 h-3.5" />
                </button>
              )}
              {voiceMode && isSpeaking && (
                <button
                  onClick={stopSpeaking}
                  className="p-1.5 rounded hover:bg-secondary text-red-400 hover:text-red-300 transition-all duration-200"
                  title={lang === 'ar' ? 'إيقاف النطق' : 'Stop Speaking'}
                >
                  <VolumeX className="w-3.5 h-3.5" />
                </button>
              )}
              {voiceMode && (
                <button
                  onClick={exitVoiceMode}
                  className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-200"
                  title={lang === 'ar' ? 'العودة للمحادثة' : 'Back to Chat'}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              )}
              {messages.length > 0 && !voiceMode && (
                <button 
                  onClick={() => { generateLabReport(); playClick(false); }} 
                  className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all duration-200"
                  title={lang === 'ar' ? 'إنشاء تقرير مختبري' : 'Generate Lab Report'}
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>
              )}
              {messages.length > 0 && !voiceMode && (
                <button onClick={() => { setMessages([]); playClick(false); }} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-200">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Voice Mode Panel */}
          {voiceMode && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Voice visualization */}
              <div className="flex flex-col items-center gap-4 pt-4">
                {/* Animated voice circle */}
                <div className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 ${
                  isSpeaking
                    ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-2xl shadow-purple-500/40 scale-110'
                    : voiceAnalysisLoading
                    ? 'bg-gradient-to-br from-blue-500 to-cyan-500 shadow-xl shadow-blue-500/30 animate-pulse'
                    : 'bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary/30'
                }`}>
                  {isSpeaking && (
                    <>
                      <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping" />
                      <div className="absolute inset-[-8px] rounded-full border-2 border-purple-400/30 animate-pulse" />
                      <div className="absolute inset-[-16px] rounded-full border border-purple-300/20 animate-pulse" style={{ animationDelay: '0.5s' }} />
                    </>
                  )}
                  {voiceAnalysisLoading ? (
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  ) : isSpeaking ? (
                    <Volume2 className="w-8 h-8 text-white animate-bounce" />
                  ) : (
                    <Mic className="w-8 h-8 text-primary" />
                  )}
                </div>

                <p className="text-sm font-semibold text-foreground text-center">
                  {voiceAnalysisLoading
                    ? (lang === 'ar' ? 'جاري تحليل المنحنى...' : 'Analyzing trajectory...')
                    : isSpeaking
                    ? (lang === 'ar' ? 'مساعد APAS يتحدث...' : 'APAS is speaking...')
                    : (lang === 'ar' ? 'اضغط لإعادة التحليل' : 'Tap to re-analyze')}
                </p>
              </div>

              {/* Analysis text display */}
              {voiceAnalysisText && (
                <div className="bg-secondary/50 border border-border/50 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {lang === 'ar' ? 'التحليل الصوتي' : 'Voice Analysis'}
                    </p>
                    {!isSpeaking && voiceAnalysisText && (
                      <button
                        onClick={() => speakText(voiceAnalysisText)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 transition-all text-[10px]"
                      >
                        <Volume2 className="w-3 h-3" />
                        {lang === 'ar' ? 'إعادة النطق' : 'Replay'}
                      </button>
                    )}
                  </div>
                  <div className="prose prose-sm max-w-none text-xs text-foreground leading-relaxed [&_p]:my-1.5 [&_li]:my-0.5">
                    <ReactMarkdown>{voiceAnalysisText}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={startVoiceAnalysis}
                  disabled={voiceAnalysisLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-medium shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30 disabled:opacity-50 transition-all duration-300"
                >
                  <Mic className="w-3.5 h-3.5" />
                  {lang === 'ar' ? 'تحليل جديد' : 'New Analysis'}
                </button>
                <button
                  onClick={exitVoiceMode}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border hover:bg-secondary text-xs font-medium text-foreground transition-all duration-200"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {lang === 'ar' ? 'محادثة' : 'Chat'}
                </button>
              </div>
            </div>
          )}

          {/* Messages - only show when not in voice mode */}
          {!voiceMode && (
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-1.5 pt-2">
                <p className="text-xs text-muted-foreground text-center mb-2">
                  {lang === 'ar' ? 'جرّب أحد الأسئلة:' : 'Try a question:'}
                </p>
                <p className="text-[10px] text-primary/60 text-center mb-3 px-4">
                  {lang === 'ar'
                    ? '💡 يمكنك سؤالي عن الفيزياء أو عن كيفية استخدام التطبيق وميزاته'
                    : '💡 You can ask me about physics or how to use the app and its features'}
                </p>
                {SUGGESTIONS[lang].map((s, i) => (
                  <button key={i} onClick={() => send(s)}
                    className="tutor-suggestion-item w-full text-start text-xs p-2.5 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-primary/5 hover:shadow-md hover:shadow-primary/5 text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-[1.02]">
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex items-end gap-1.5 animate-[tutorFadeUp_0.35s_ease_forwards] ${m.role === 'user' ? (isRTL ? 'flex-row' : 'flex-row-reverse') : (isRTL ? 'flex-row-reverse' : 'flex-row')}`}>
                {/* Avatar */}
                <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                  m.role === 'user'
                    ? 'bg-foreground/10 text-foreground'
                    : 'bg-primary/10 text-primary'
                }`}>
                  {m.role === 'user' ? (
                    <User className="w-3.5 h-3.5" />
                  ) : (
                    <ApasLogo size={16} />
                  )}
                </div>
                {/* Message bubble */}
                <div className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-foreground text-background'
                    : 'bg-secondary text-foreground border border-border/50'
                }`}>
                  {m.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none [&_p]:my-2 [&_p]:leading-relaxed [&_li]:my-1 [&_li]:leading-relaxed [&_ul]:my-2 [&_ol]:my-2 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_code]:text-xs [&_code]:bg-background [&_code]:px-2 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:font-normal">
                      <ReactMarkdown>
                        {cleanLatex(m.content)}
                      </ReactMarkdown>
                    </div>
                  ) : m.content}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className={`flex items-end gap-1.5 animate-[tutorFadeUp_0.35s_ease_forwards] ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-primary/10 text-primary">
                  <ApasLogo size={16} />
                </div>
                <div className="bg-secondary/80 backdrop-blur-sm rounded-lg px-4 py-2.5 border border-primary/10 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>
          )}

          {/* Input - only show when not in voice mode */}
          {!voiceMode && (
          <div className="p-3 border-t border-primary/10 bg-background/50">
            <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={lang === 'ar' ? 'اكتب سؤالك أو اضغط 🎤...' : 'Type or tap 🎤...'}
                className="flex-1 !bg-secondary/50 !border-primary/20 !rounded-lg !px-3 !py-2 !text-xs text-foreground placeholder:text-muted-foreground focus:!border-primary/40 transition-colors"
                disabled={isLoading}
              />
              {/* STT microphone button */}
              <button
                type="button"
                onClick={toggleListening}
                disabled={isLoading}
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30'
                    : 'bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground'
                }`}
                title={lang === 'ar' ? 'تحدث بسؤالك' : 'Speak your question'}
              >
                <Mic className="w-3.5 h-3.5" />
              </button>
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 disabled:opacity-30 transition-all duration-300 bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 hover:scale-105 active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
            {isListening && (
              <div className="flex items-center gap-2 mt-2 px-1">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  <span className="text-[10px] text-red-500 font-medium">
                    {lang === 'ar' ? 'جارٍ الاستماع...' : 'Listening...'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={toggleListening}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {lang === 'ar' ? 'إيقاف' : 'Stop'}
                </button>
              </div>
            )}
          </div>
          )}
        </div>
        </>,
        document.body
      )}
    </>
  );
}
