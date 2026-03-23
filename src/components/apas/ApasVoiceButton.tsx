import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Mic, MicOff, Loader2, X, Volume2, CheckCircle } from 'lucide-react';
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
}

interface ExtractedParams {
  velocity?: number;
  angle?: number;
  height?: number;
  mass?: number;
  gravity?: number;
}

export default function ApasVoiceButton({ lang, onUpdateParams, simulationContext }: Props) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [extractedParams, setExtractedParams] = useState<ExtractedParams | null>(null);
  const [applied, setApplied] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const isAr = lang === 'ar';

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
            toast.success(isAr ? 'تم تطبيق القيم' : 'Values applied');
          } else {
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
          toast.success(isAr ? 'تم تطبيق القيم' : 'Values applied');
        } else {
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
      setTranscript(finalTranscript + interim);
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
      if (finalTranscript.trim()) {
        processVoiceInput(finalTranscript.trim());
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
  };

  return (
    <>
      <button
        onClick={startListening}
        disabled={isProcessing}
        className="group flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-purple-500/30 bg-secondary/50 hover:bg-purple-500/10 transition-all duration-200 hover:shadow-md disabled:opacity-60 w-full"
        title={isAr ? 'الأوامر الصوتية' : 'Voice Commands'}
      >
        <Mic className="w-4 h-4 text-purple-500 transition-transform duration-200 group-hover:scale-110" />
        <span className="text-[10px] sm:text-xs font-semibold text-foreground">
          {isAr ? 'الأوامر الصوتية' : 'Voice Commands'}
        </span>
        <span className="text-[9px] text-purple-500 ms-auto font-medium">APAS Voice</span>
      </button>

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
