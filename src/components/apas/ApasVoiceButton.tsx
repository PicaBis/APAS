import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Mic, MicOff, Loader2, X, Volume2, CheckCircle, History } from 'lucide-react';
import { toast } from 'sonner';

const EDGE_VOICE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-process`;

interface Props {
  lang: string;
  onUpdateParams: (params: { velocity?: number; angle?: number; height?: number; mass?: number; gravity?: number }) => void;
  simulationContext?: {
    velocity: number;
    angle: number;
    height: number;
    gravity: number;
    airResistance: number;
    mass: number;
  };
  autoOpen?: boolean;
  onDismiss?: () => void;
}

interface ExtractedParams {
  velocity?: number;
  angle?: number;
  height?: number;
  mass?: number;
  gravity?: number;
}

interface VoiceHistoryEntry {
  id: number;
  timestamp: Date;
  transcript: string;
  params: ExtractedParams | null;
  aiMessage: string;
  applied: boolean;
}

export default function ApasVoiceButton({ lang, onUpdateParams, simulationContext, autoOpen, onDismiss }: Props) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [extractedParams, setExtractedParams] = useState<ExtractedParams | null>(null);
  const [applied, setApplied] = useState(false);
  const [history, setHistory] = useState<VoiceHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const isAr = lang === 'ar';

  // Auto-start listening when autoOpen prop is set (for mobile header direct access)
  const autoOpenTriggered = useRef(false);
  useEffect(() => {
    if (autoOpen && !autoOpenTriggered.current) {
      autoOpenTriggered.current = true;
      startListening();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen]);

  const parseParamsFromAI = useCallback((text: string): { params: ExtractedParams | null; missing: string[]; message: string } => {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
    const cleanText = text.replace(/```json[\s\S]*?```\s*/, '').trim();
    let missing: string[] = [];

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim());
        if (parsed && typeof parsed === 'object') {
          const params: ExtractedParams = {};
          if (typeof parsed.velocity === 'number') params.velocity = parsed.velocity;
          if (typeof parsed.angle === 'number') params.angle = parsed.angle;
          if (typeof parsed.height === 'number') params.height = parsed.height;
          if (typeof parsed.mass === 'number') params.mass = parsed.mass;
          if (typeof parsed.gravity === 'number') params.gravity = parsed.gravity;
          if (Array.isArray(parsed.missing)) missing = parsed.missing;
          const hasParams = Object.keys(params).length > 0;
          return { params: hasParams ? params : null, missing, message: cleanText };
        }
      } catch { /* ignore */ }
    }

    // Fallback: try to extract params from natural language
    const params: ExtractedParams = {};
    const velocityMatch = text.match(/(?:velocity|سرعة|vitesse)[:\s]*(\d+(?:\.\d+)?)/i);
    const angleMatch = text.match(/(?:angle|زاوية|angle)[:\s]*(\d+(?:\.\d+)?)/i);
    const heightMatch = text.match(/(?:height|ارتفاع|hauteur)[:\s]*(\d+(?:\.\d+)?)/i);
    const massMatch = text.match(/(?:mass|كتلة|masse)[:\s]*(\d+(?:\.\d+)?)/i);
    const gravityMatch = text.match(/(?:gravity|جاذبية|gravité)[:\s]*(\d+(?:\.\d+)?)/i);

    if (velocityMatch) params.velocity = parseFloat(velocityMatch[1]);
    if (angleMatch) params.angle = parseFloat(angleMatch[1]);
    if (heightMatch) params.height = parseFloat(heightMatch[1]);
    if (massMatch) params.mass = parseFloat(massMatch[1]);
    if (gravityMatch) params.gravity = parseFloat(gravityMatch[1]);

    const hasParams = Object.keys(params).length > 0;
    return { params: hasParams ? params : null, missing, message: cleanText };
  }, []);

  const [aiMessage, setAiMessage] = useState('');
  const [missingParams, setMissingParams] = useState<string[]>([]);

  const processVoiceInput = useCallback(async (spokenText: string) => {
    setIsProcessing(true);
    setExtractedParams(null);
    setApplied(false);
    setAiMessage('');
    setMissingParams([]);

    try {
      const resp = await fetch(EDGE_VOICE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          transcript: spokenText,
          lang,
          simulationContext,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        const aiText = data.text || '';
        const result = parseParamsFromAI(aiText);

        setAiMessage(result.message);
        setMissingParams(result.missing);

        if (result.params) {
          setExtractedParams(result.params);
          onUpdateParams(result.params);
          setApplied(true);
          setHistory(prev => [{
            id: Date.now(),
            timestamp: new Date(),
            transcript: spokenText,
            params: result.params,
            aiMessage: result.message,
            applied: true,
          }, ...prev].slice(0, 20));
          toast.success(isAr ? 'تم تطبيق الأوامر الصوتية على المحاكاة' : 'Voice commands applied to simulation');
        } else if (result.missing.length > 0) {
          toast.info(result.message || (isAr ? 'بعض المعطيات ناقصة' : 'Some parameters are missing'));
        } else {
          // Try direct number extraction from transcript
          const directResult = parseParamsFromAI(spokenText);
          if (directResult.params) {
            setExtractedParams(directResult.params);
            onUpdateParams(directResult.params);
            setApplied(true);
            setHistory(prev => [{
              id: Date.now(),
              timestamp: new Date(),
              transcript: spokenText,
              params: directResult.params,
              aiMessage: '',
              applied: true,
            }, ...prev].slice(0, 20));
            toast.success(isAr ? 'تم تطبيق القيم' : 'Values applied');
          } else {
            setHistory(prev => [{
              id: Date.now(),
              timestamp: new Date(),
              transcript: spokenText,
              params: null,
              aiMessage: '',
              applied: false,
            }, ...prev].slice(0, 20));
            toast.info(isAr ? 'لم أتمكن من استخراج قيم فيزيائية من الكلام' : 'Could not extract physics values from speech');
          }
        }
      } else {
        // Fallback: try direct extraction from transcript
        const directResult = parseParamsFromAI(spokenText);
        if (directResult.params) {
          setExtractedParams(directResult.params);
          onUpdateParams(directResult.params);
          setApplied(true);
          setHistory(prev => [{
            id: Date.now(),
            timestamp: new Date(),
            transcript: spokenText,
            params: directResult.params,
            aiMessage: '',
            applied: true,
          }, ...prev].slice(0, 20));
          toast.success(isAr ? 'تم تطبيق القيم' : 'Values applied');
        } else {
          setHistory(prev => [{
            id: Date.now(),
            timestamp: new Date(),
            transcript: spokenText,
            params: null,
            aiMessage: '',
            applied: false,
          }, ...prev].slice(0, 20));
          toast.error(isAr ? 'تعذر معالجة الأمر الصوتي' : 'Could not process voice command');
        }
      }
    } catch {
      toast.error(isAr ? 'خطأ في المعالجة' : 'Processing error');
    }
    setIsProcessing(false);
  }, [isAr, lang, onUpdateParams, parseParamsFromAI, simulationContext]);

  const startListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      toast.error(isAr ? 'المتصفح لا يدعم التعرف على الصوت' : 'Speech recognition not supported');
      return;
    }

    setShowModal(true);
    setTranscript('');
    setExtractedParams(null);
    setApplied(false);

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = lang === 'ar' ? 'ar-SA' : lang === 'fr' ? 'fr-FR' : 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    let finalTranscript = '';
    let lastInterim = '';
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    // Clean up repeated/broken characters common in Arabic speech recognition
    const cleanTranscript = (text: string): string => {
      if (!text) return text;
      // Remove consecutive duplicate words
      const words = text.split(/\s+/);
      const cleaned: string[] = [];
      for (let i = 0; i < words.length; i++) {
        if (i === 0 || words[i] !== words[i - 1]) {
          cleaned.push(words[i]);
        }
      }
      // Remove consecutive duplicate characters (more than 2)
      return cleaned.join(' ').replace(/(.)\1{2,}/g, '$1$1');
    };

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

      // Apply cleaning to both final and interim transcripts
      const cleanedFinal = cleanTranscript(finalTranscript);
      const cleanedInterim = cleanTranscript(interim);

      // Debounce interim updates to avoid rapid flickering
      if (cleanedInterim !== lastInterim) {
        lastInterim = cleanedInterim;
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          setTranscript(cleanedFinal + (cleanedInterim ? ' ' + cleanedInterim : ''));
        }, 150);
      }

      // Always update immediately when we get final results
      if (finalTranscript) {
        if (debounceTimer) clearTimeout(debounceTimer);
        setTranscript(cleanedFinal + (cleanedInterim ? ' ' + cleanedInterim : ''));
      }
    };
    recognition.onerror = (e: Event & { error?: string }) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      setIsListening(false);
      recognitionRef.current = null;
      toast.error(isAr ? 'خطأ في التعرف على الصوت' : 'Speech recognition error');
    };
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      if (debounceTimer) clearTimeout(debounceTimer);
      const cleaned = cleanTranscript(finalTranscript).trim();
      if (cleaned) {
        processVoiceInput(cleaned);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      toast.error(isAr ? 'تعذر بدء التعرف على الصوت' : 'Could not start speech recognition');
      setIsListening(false);
    }
  }, [isAr, lang, processVoiceInput]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }
    setIsListening(false);
  }, []);

  const closeModal = () => {
    stopListening();
    setShowModal(false);
    setTranscript('');
    setExtractedParams(null);
    setApplied(false);
    setAiMessage('');
    setMissingParams([]);
    onDismiss?.();
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          onClick={startListening}
          disabled={isProcessing}
          className="group flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-foreground/30 bg-secondary/50 hover:bg-secondary transition-all duration-200 hover:shadow-md disabled:opacity-60 w-full"
          title={isAr ? 'الأوامر الصوتية' : 'Voice Commands'}
        >
          <Mic className="w-4 h-4 text-foreground transition-transform duration-200 group-hover:scale-110" />
          <span className="text-[10px] sm:text-xs font-semibold text-foreground">APAS Voice</span>
          <span className="text-[9px] text-muted-foreground ms-auto">{isAr ? 'الأوامر الصوتية' : 'Voice Commands'}</span>
        </button>

        {history.length > 0 && (
          <button
            onClick={() => setShowHistory(true)}
            className="p-2 rounded-lg border border-border hover:border-foreground/30 bg-secondary/50 hover:bg-secondary transition-all duration-200 relative"
            title={isAr ? 'سجل الأوامر الصوتية' : 'Voice History'}
          >
            <History className="w-3.5 h-3.5 text-foreground" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-foreground text-background text-[8px] font-bold rounded-full flex items-center justify-center">
              {history.length}
            </span>
          </button>
        )}
      </div>

      {/* Voice History Modal */}
      {showHistory && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowHistory(false)}>
          <div
            className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden animate-slideDown"
            dir={isAr ? 'rtl' : 'ltr'}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-foreground" />
                <h3 className="text-sm font-semibold text-foreground">{isAr ? 'سجل الأوامر الصوتية' : 'Voice Command History'}</h3>
              </div>
              <button onClick={() => setShowHistory(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {history.map(entry => (
                <div
                  key={entry.id}
                  className="w-full text-start p-3 rounded-lg border border-border hover:bg-secondary/50 hover:shadow-sm transition-all duration-200 relative group"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); e.preventDefault();
                      setHistory(prev => prev.filter(h => h.id !== entry.id));
                    }}
                    className="absolute top-2 end-2 z-10 p-2 -m-1 rounded-md hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition-all duration-200 opacity-0 group-hover:opacity-100"
                    title={isAr ? 'حذف' : 'Delete'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (entry.params) {
                        onUpdateParams(entry.params);
                        toast.success(isAr ? 'تم تطبيق القيم' : 'Values applied');
                      }
                      setShowHistory(false);
                    }}
                    className="w-full text-start pe-6"
                  >
                    <div className="flex items-start gap-2">
                      <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-purple-500/10">
                        <Volume2 className="w-4 h-4 text-purple-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1 pe-5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${entry.applied ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                            {entry.applied ? (isAr ? 'مُطبّق' : 'Applied') : (isAr ? 'لم يُطبّق' : 'Not applied')}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {entry.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs text-foreground truncate mb-1">"{entry.transcript}"</p>
                        {entry.params && (
                          <div className="grid grid-cols-2 gap-1.5 text-[9px]">
                            {Object.entries(entry.params).filter(([, v]) => v != null).map(([key, value]) => (
                              <div key={key} className="bg-secondary/50 rounded p-1 text-center">
                                <span className="text-muted-foreground">{key}: </span>
                                <span className="font-mono font-medium text-foreground">{value}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {!entry.params && (
                          <span className="text-[10px] text-muted-foreground">{isAr ? 'لم تُستخرج قيم' : 'No values extracted'}</span>
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Voice Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => { if (!isListening && !isProcessing) closeModal(); }}>
          <div
            className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-slideDown"
            dir={isAr ? 'rtl' : 'ltr'}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-purple-500" />
                <h3 className="text-sm font-semibold text-foreground">APAS Voice</h3>
                {isListening && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                )}
              </div>
              {!isListening && !isProcessing && (
                <button onClick={closeModal} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-200">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 flex flex-col items-center">
              {/* Voice visualization */}
              <div className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 ${
                isListening
                  ? 'bg-gradient-to-br from-red-500 to-pink-500 shadow-2xl shadow-red-500/40 scale-110'
                  : isProcessing
                  ? 'bg-gradient-to-br from-purple-500 to-blue-500 shadow-xl shadow-purple-500/30 animate-pulse'
                  : applied
                  ? 'bg-gradient-to-br from-green-500 to-emerald-500 shadow-xl shadow-green-500/30'
                  : 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500/30'
              }`}>
                {isListening && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                    <div className="absolute inset-[-8px] rounded-full border-2 border-red-400/30 animate-pulse" />
                  </>
                )}
                {isListening ? (
                  <Mic className="w-8 h-8 text-white" />
                ) : isProcessing ? (
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                ) : applied ? (
                  <CheckCircle className="w-8 h-8 text-white" />
                ) : (
                  <Mic className="w-8 h-8 text-purple-500" />
                )}
              </div>

              {/* Status text */}
              <p className="text-sm font-semibold text-foreground text-center">
                {isListening
                  ? (isAr ? 'جاري الاستماع... تحدث الآن' : 'Listening... speak now')
                  : isProcessing
                  ? (isAr ? 'جاري معالجة الأمر...' : 'Processing command...')
                  : applied
                  ? (isAr ? 'تم تطبيق الأوامر!' : 'Commands applied!')
                  : (isAr ? 'اضغط للتحدث' : 'Tap to speak')}
              </p>

              {/* Hint text */}
              {!transcript && !isProcessing && !applied && (
                <p className="text-[10px] text-muted-foreground text-center max-w-[250px]">
                  {isAr
                    ? 'قل مثلاً: "السرعة 50 متر في الثانية والزاوية 30 درجة والارتفاع 2 متر"'
                    : 'Say something like: "Velocity 50 m/s, angle 30 degrees, height 2 meters"'}
                </p>
              )}

              {/* AI feedback message */}
              {aiMessage && !isProcessing && (
                <div className="w-full bg-secondary/50 border border-border/50 rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    {isAr ? 'رد المعالج' : 'AI Response'}
                  </p>
                  <p className="text-xs text-foreground">{aiMessage}</p>
                </div>
              )}

              {/* Missing params warning */}
              {missingParams.length > 0 && !isProcessing && (
                <div className="w-full bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
                    {isAr ? 'معطيات ناقصة' : 'Missing Parameters'}
                  </p>
                  <p className="text-xs text-foreground">
                    {missingParams.join(', ')}
                  </p>
                </div>
              )}

              {/* Live transcript */}
              {transcript && (
                <div className="w-full bg-secondary/50 border border-border/50 rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    {isAr ? 'ما سمعته' : 'What I heard'}
                  </p>
                  <p className="text-xs text-foreground">{transcript}</p>
                </div>
              )}

              {/* Extracted params */}
              {extractedParams && (
                <div className="w-full grid grid-cols-2 gap-2">
                  {Object.entries(extractedParams).filter(([, v]) => v != null).map(([key, value]) => {
                    const labels: Record<string, string> = isAr
                      ? { velocity: 'السرعة', angle: 'الزاوية', height: 'الارتفاع', mass: 'الكتلة', gravity: 'الجاذبية' }
                      : { velocity: 'Velocity', angle: 'Angle', height: 'Height', mass: 'Mass', gravity: 'Gravity' };
                    const units: Record<string, string> = { velocity: 'm/s', angle: '°', height: 'm', mass: 'kg', gravity: 'm/s²' };
                    return (
                      <div key={key} className="border border-green-500/30 rounded-lg p-2 text-center bg-green-500/5">
                        <p className="text-[9px] text-muted-foreground">{labels[key] || key}</p>
                        <p className="text-xs font-semibold font-mono text-foreground">{value} {units[key] || ''}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border flex gap-2">
              {isListening ? (
                <button
                  onClick={stopListening}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-all"
                >
                  <MicOff className="w-3.5 h-3.5" />
                  {isAr ? 'إيقاف' : 'Stop'}
                </button>
              ) : (
                <>
                  <button
                    onClick={startListening}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-medium shadow-lg hover:shadow-xl disabled:opacity-50 transition-all"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    {isAr ? 'تحدث مرة أخرى' : 'Speak Again'}
                  </button>
                  <button
                    onClick={closeModal}
                    disabled={isProcessing}
                    className="flex-1 text-xs py-2.5 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-all disabled:opacity-50"
                  >
                    {isAr ? 'إغلاق' : 'Close'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
