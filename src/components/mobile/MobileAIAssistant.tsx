import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { X, Send, Loader2, Trash2, Sparkles } from 'lucide-react';
import ApasLogo from '@/components/apas/ApasLogo';
import { toast } from 'sonner';
import { cleanLatex } from '@/utils/cleanLatex';

type Msg = { role: 'user' | 'assistant'; content: string };

interface MobileAIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  lang: string;
  velocity: number;
  angle: number;
  height: number;
  gravity: number;
  airResistance: number;
  mass: number;
  prediction: {
    range: number;
    maxHeight: number;
    timeOfFlight: number;
    finalVelocity: number;
    impactAngle: number;
    rangeError: number;
    maxHeightError: number;
    timeError: number;
  } | null;
  isAnimating: boolean;
  trajectoryLength: number;
}

const EDGE_TUTOR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/physics-tutor`;

/* ---- Local fallbacks to save quota ---- */
const LOCAL_FALLBACKS: Record<string, { ar: string; en: string }> = {
  '\u0645\u0642\u0630\u0648\u0641': {
    ar: '**\u0627\u0644\u0645\u0642\u0630\u0648\u0641** \u0647\u0648 \u062c\u0633\u0645 \u064a\u064f\u0637\u0644\u0642 \u0641\u064a \u0627\u0644\u0647\u0648\u0627\u0621 \u0648\u064a\u062a\u062d\u0631\u0643 \u062a\u062d\u062a \u062a\u0623\u062b\u064a\u0631 \u0627\u0644\u062c\u0627\u0630\u0628\u064a\u0629 \u0641\u0642\u0637.\n\n- \u0627\u0644\u0633\u0631\u0639\u0629 \u0627\u0644\u0623\u0641\u0642\u064a\u0629: vx = v0 * cos(theta)\n- \u0627\u0644\u0633\u0631\u0639\u0629 \u0627\u0644\u0631\u0623\u0633\u064a\u0629: vy = v0 * sin(theta) - g * t\n- \u0627\u0644\u0645\u062f\u0649: R = v0^2 * sin(2 * theta) / g\n- \u0623\u0642\u0635\u0649 \u0627\u0631\u062a\u0641\u0627\u0639: H = v0^2 * sin^2(theta) / (2 * g)',
    en: '**A projectile** is an object launched into the air moving under gravity only.\n\n- Horizontal velocity: vx = v0 * cos(theta)\n- Vertical velocity: vy = v0 * sin(theta) - g * t\n- Range: R = v0^2 * sin(2 * theta) / g\n- Max height: H = v0^2 * sin^2(theta) / (2 * g)'
  },
  'projectile': {
    ar: '**\u0627\u0644\u0645\u0642\u0630\u0648\u0641** \u0647\u0648 \u062c\u0633\u0645 \u064a\u064f\u0637\u0644\u0642 \u0641\u064a \u0627\u0644\u0647\u0648\u0627\u0621 \u0648\u064a\u062a\u062d\u0631\u0643 \u062a\u062d\u062a \u062a\u0623\u062b\u064a\u0631 \u0627\u0644\u062c\u0627\u0630\u0628\u064a\u0629 \u0641\u0642\u0637.',
    en: '**A projectile** is an object launched into the air moving under gravity only.\n\n- Horizontal velocity: vx = v0 * cos(theta)\n- Vertical velocity: vy = v0 * sin(theta) - g * t\n- Range: R = v0^2 * sin(2 * theta) / g\n- Max height: H = v0^2 * sin^2(theta) / (2 * g)'
  },
  '\u0632\u0627\u0648\u064a\u0629 45': {
    ar: '\u0632\u0627\u0648\u064a\u0629 **45\u00b0** \u062a\u0639\u0637\u064a \u0623\u0642\u0635\u0649 \u0645\u062f\u0649.\n\n- \u0627\u0644\u0633\u0628\u0628: sin(2 * 45\u00b0) = sin(90\u00b0) = 1\n- \u0627\u0644\u0645\u0639\u0627\u062f\u0644\u0629: R = v0^2 * sin(2 * theta) / g',
    en: 'An angle of **45\u00b0** gives maximum range.\n\n- Reason: sin(2 * 45\u00b0) = sin(90\u00b0) = 1\n- Formula: R = v0^2 * sin(2 * theta) / g'
  },
};

function getLocalFallback(text: string, lang: string): string | null {
  const lower = text.toLowerCase().trim();
  for (const [key, val] of Object.entries(LOCAL_FALLBACKS)) {
    if (lower.includes(key.toLowerCase())) return lang === 'ar' ? val.ar : val.en;
  }
  return null;
}

function getGracefulFallback(lang: string) {
  return lang === 'ar'
    ? '\u0623\u0641\u0647\u0645 \u0633\u0624\u0627\u0644\u0643.\n\n- \u064a\u0628\u062f\u0648 \u0623\u0646 \u0627\u062a\u0635\u0627\u0644 AI \u0645\u0634\u063a\u0648\u0644 \u0627\u0644\u0622\u0646.\n- \u0623\u0639\u062f \u0625\u0631\u0633\u0627\u0644 \u0646\u0641\u0633 \u0627\u0644\u0633\u0624\u0627\u0644 \u062e\u0644\u0627\u0644 \u062b\u0648\u0627\u0646\u064d.'
    : 'I understand your question.\n\n- AI is temporarily busy right now.\n- Please resend the same question in a few seconds.';
}

async function consumeAIStream(
  body: ReadableStream<Uint8Array>,
  onChunk: (content: string) => void,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  for (;;) {
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
        // Line is complete (has \n delimiter) but contains invalid JSON — skip it
        // rather than retrying forever and blocking subsequent valid lines.
      }
    }
  }
}

const SUGGESTIONS: Record<string, string[]> = {
  ar: [
    '\u0644\u0645\u0627\u0630\u0627 \u0632\u0627\u0648\u064a\u0629 45\u00b0 \u062a\u0639\u0637\u064a \u0623\u0642\u0635\u0649 \u0645\u062f\u0649\u061f',
    '\u0645\u0627 \u062a\u0623\u062b\u064a\u0631 \u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u0647\u0648\u0627\u0621\u061f',
    '\u0643\u064a\u0641 \u0623\u0633\u062a\u062e\u062f\u0645 \u0627\u0644\u062a\u0635\u0648\u064a\u0631 \u0627\u0644\u0645\u062a\u0639\u0627\u0642\u0628\u061f',
  ],
  en: [
    'Why does 45\u00b0 give max range?',
    'How does air resistance affect the path?',
    'How do I use stroboscopic mode?',
  ],
};

const MobileAIAssistant: React.FC<MobileAIAssistantProps> = ({
  isOpen,
  onClose,
  lang,
  velocity,
  angle,
  height,
  gravity,
  airResistance,
  mass,
  prediction,
}) => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingDots, setThinkingDots] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isRTL = lang === 'ar';

  const t = lang === 'ar' ? {
    title: '\u0627\u0633\u0623\u0644 APAS',
    placeholder: '\u0627\u0633\u0623\u0644 \u0639\u0646 \u0627\u0644\u0641\u064a\u0632\u064a\u0627\u0621 \u0623\u0648 \u0627\u0644\u062a\u0637\u0628\u064a\u0642...',
    clearChat: '\u0645\u0633\u062d \u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0629',
    thinking: '\u064a\u0641\u0643\u0631',
  } : lang === 'fr' ? {
    title: 'Demandez APAS',
    placeholder: 'Posez une question sur la physique...',
    clearChat: 'Effacer le chat',
    thinking: 'R\u00e9fl\u00e9chit',
  } : {
    title: 'Ask APAS',
    placeholder: 'Ask about physics or the app...',
    clearChat: 'Clear chat',
    thinking: 'Thinking',
  };

  const simulationContext = React.useMemo(() => ({
    velocity, angle, height, gravity, airResistance, mass,
    range: prediction?.range.toFixed(2),
    maxHeight: prediction?.maxHeight.toFixed(2),
    flightTime: prediction?.timeOfFlight.toFixed(2),
  }), [velocity, angle, height, gravity, airResistance, mass, prediction]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!isLoading) { setThinkingDots(''); return; }
    const interval = setInterval(() => {
      setThinkingDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 400);
    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    const fallback = getLocalFallback(text, lang);
    if (fallback) {
      setIsLoading(true);
      let typed = '';
      const words = fallback.split(' ');
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      for (let i = 0; i < words.length; i++) {
        typed += (i > 0 ? ' ' : '') + words[i];
        const snapshot = typed;
        await new Promise(r => setTimeout(r, 50));
        setMessages(prev => prev.map((m, idx) => idx === prev.length - 1 ? { ...m, content: snapshot } : m));
      }
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let assistantSoFar = '';
    const allMessages = [...messages, userMsg];

    const systemPrompt = `You are APAS Assistant \u2014 an expert physics teacher AND application guide for the APAS projectile motion simulator.

LANGUAGE: Respond ONLY in ${lang === 'ar' ? 'Arabic' : 'English'}.

Roles: Physics Tutor + App Guide.

FORMAT: **bold** key terms, bullet lists, ## headings, concise mobile-friendly text.
EQUATIONS: Never LaTeX. Use: vy = v0 * sin(theta) - g * t

APAS Features: Left Panel (params, equations, export, display options), Simulation Controls (Play/Pause/Reset/Speed/Zoom), Smart Vision, Export (PNG/PDF/QR).

${simulationContext ? `Current sim: v=${simulationContext.velocity}m/s, \u03b8=${simulationContext.angle}\u00b0, h=${simulationContext.height}m, g=${simulationContext.gravity}m/s\u00b2, drag=${simulationContext.airResistance}, m=${simulationContext.mass}kg${simulationContext.range ? `, R=${simulationContext.range}m` : ''}${simulationContext.maxHeight ? `, H=${simulationContext.maxHeight}m` : ''}${simulationContext.flightTime ? `, T=${simulationContext.flightTime}s` : ''}` : ''}`;

    const upsertAssistant = (content: string) => {
      assistantSoFar += content;
      const snapshot = assistantSoFar;
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
      try {
        const resp = await fetch(EDGE_TUTOR_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ messages: allMessages, simulationContext, systemPrompt }),
        });
        if (resp.ok && resp.body) {
          await consumeAIStream(resp.body, upsertAssistant);
          handled = true;
        }
      } catch (edgeErr) {
        console.warn('Edge function failed:', edgeErr);
      }

      if (!handled) {
        const graceful = getGracefulFallback(lang);
        setMessages(prev => [...prev, { role: 'assistant', content: graceful }]);
        toast.warning(lang === 'ar' ? 'AI \u0645\u0634\u063a\u0648\u0644 \u062d\u0627\u0644\u064a\u0627\u064b' : 'AI is busy right now');
      }
    } catch (e) {
      console.error(e);
      const graceful = getGracefulFallback(lang);
      setMessages(prev => [...prev, { role: 'assistant', content: graceful }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, lang, messages, simulationContext]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] md:hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="absolute bottom-0 left-0 right-0 h-[85vh] bg-background/95 backdrop-blur-xl border-t border-border/50 rounded-t-3xl shadow-2xl animate-slideUp flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-primary/20 border border-amber-500/20">
              <ApasLogo size={22} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{t.title}</h3>
              <p className="text-[10px] text-muted-foreground">
                {isLoading ? `${t.thinking}${thinkingDots}` : 'APAS AI'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="p-2 rounded-xl hover:bg-secondary active:scale-90 transition-all touch-manipulation"
                title={t.clearChat}
              >
                <Trash2 className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary active:scale-90 transition-all touch-manipulation">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-primary/10 border border-amber-500/20 mb-4">
                <ApasLogo size={40} />
              </div>
              <h3 className="text-base font-bold text-foreground mb-1">{t.title}</h3>
              <p className="text-xs text-muted-foreground mb-5">
                {lang === 'ar' ? '\u0627\u0633\u0623\u0644\u0646\u064a \u0639\u0646 \u0623\u064a \u0645\u0641\u0647\u0648\u0645 \u0641\u064a\u0632\u064a\u0627\u0626\u064a \u0623\u0648 \u0643\u064a\u0641\u064a\u0629 \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0627\u0644\u062a\u0637\u0628\u064a\u0642' : 'Ask me about any physics concept or how to use the app'}
              </p>
              <div className="w-full space-y-2">
                {(SUGGESTIONS[lang] || SUGGESTIONS.en).map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => send(suggestion)}
                    className="w-full text-start px-3.5 py-2.5 rounded-xl border border-border/50 bg-secondary/30 hover:bg-secondary/60 text-xs text-foreground transition-all active:scale-[0.98] touch-manipulation"
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      {suggestion}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-secondary/60 text-foreground border border-border/30 rounded-bl-md'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-xs dark:prose-invert max-w-none [&_p]:my-1 [&_li]:my-0.5 [&_ul]:my-1 [&_ol]:my-1 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-xs [&_h3]:font-semibold [&_strong]:text-foreground">
                      <ReactMarkdown>{cleanLatex(msg.content)}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))
          )}
          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex justify-start">
              <div className="bg-secondary/60 border border-border/30 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">{t.thinking}{thinkingDots}</span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-border/30 px-3 py-3 bg-background/80 backdrop-blur-sm">
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.placeholder}
              disabled={isLoading}
              className="flex-1 bg-secondary/50 border border-border/50 rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 disabled:opacity-50 transition-all"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2.5 rounded-xl bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 active:scale-90 transition-all touch-manipulation shrink-0"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MobileAIAssistant;
