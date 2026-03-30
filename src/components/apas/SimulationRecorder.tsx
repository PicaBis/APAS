import React, { useState, useRef, useCallback } from 'react';
import { Download, Loader2, X } from 'lucide-react';
import { playUIClick } from '@/utils/sound';

interface Props {
  lang: string;
  muted: boolean;
  canvasContainerRef: React.RefObject<HTMLDivElement>;
  onStartAnimation: () => void;
}

/**
 * Compact "Rec" button designed to sit in the canvas toolbar.
 * When recording, shows a blinking red dot.
 * After recording, shows a dropdown with video preview & download.
 */
export default function SimulationRecorder({ lang, muted, canvasContainerRef, onStartAnimation }: Props) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [recordedURL, setRecordedURL] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isAr = lang === 'ar';
  const isFr = lang === 'fr';

  const t = (ar: string, en: string, fr?: string) => isAr ? ar : isFr ? (fr || en) : en;

  const startRecording = useCallback(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const canvas = container.querySelector('canvas');
    if (!canvas) return;

    try {
      const stream = canvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : 'video/mp4';

      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        setProcessing(true);
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setRecordedURL(url);
        setProcessing(false);
        setRecording(false);
        setShowPreview(true);
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordedURL(null);
      setShowPreview(false);

      // Auto-start animation
      onStartAnimation();
      playUIClick(muted);
    } catch (err) {
      console.error('Recording failed:', err);
    }
  }, [canvasContainerRef, muted, onStartAnimation]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    playUIClick(muted);
  }, [muted]);

  const downloadRecording = () => {
    if (!recordedURL) return;
    const a = document.createElement('a');
    a.href = recordedURL;
    a.download = `APAS_Recording_${Date.now()}.webm`;
    a.click();
    playUIClick(muted);
  };

  const handleClick = () => {
    if (recording) {
      stopRecording();
    } else if (recordedURL && !recording) {
      setShowPreview(!showPreview);
    } else {
      startRecording();
    }
  };

  // Auto-stop recording after 15s
  React.useEffect(() => {
    if (!recording) return;
    const timeout = setTimeout(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    }, 15000);
    return () => clearTimeout(timeout);
  }, [recording]);

  return (
    <div className="relative">
      {/* Compact Rec button */}
      <button
        onClick={handleClick}
        className={`group p-1.5 rounded-lg border transition-all duration-300 flex items-center gap-1 ${
          recording
            ? 'bg-red-500/15 text-red-500 border-red-500/30 hover:bg-red-500/25'
            : recordedURL
              ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/15'
              : 'hover:bg-primary/10 text-muted-foreground hover:text-primary border-transparent hover:border-primary/20 hover:shadow-md'
        }`}
        title={recording ? t('إيقاف التسجيل', 'Stop Recording', 'Arrêter') : t('تسجيل المحاكاة', 'Record Simulation', 'Enregistrer')}
      >
        {/* Red dot - blinking when recording */}
        <span className={`w-2 h-2 rounded-full ${
          recording ? 'bg-red-500 animate-pulse' : recordedURL ? 'bg-primary' : 'bg-muted-foreground group-hover:bg-primary'
        } transition-colors`} />
        <span className={`text-[10px] font-bold tracking-wider ${
          recording ? 'text-red-500' : ''
        }`}>
          {processing ? '...' : 'Rec'}
        </span>
      </button>

      {/* Video preview dropdown */}
      {showPreview && recordedURL && !recording && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-xl shadow-black/20 z-[9999] animate-slideDown overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {t('التسجيل', 'Recording', 'Enregistrement')}
            </p>
            <button
              onClick={() => setShowPreview(false)}
              className="p-0.5 rounded hover:bg-secondary transition-colors"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
          <div className="p-2 space-y-2">
            <video
              src={recordedURL}
              controls
              className="w-full rounded-lg border border-border"
              style={{ maxHeight: '180px' }}
            />
            <div className="flex gap-1.5">
              <button
                onClick={downloadRecording}
                className="flex-1 py-1.5 text-[11px] font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3 h-3" />
                {t('تحميل', 'Download', 'Telecharger')}
              </button>
              <button
                onClick={() => {
                  setRecordedURL(null);
                  setShowPreview(false);
                  startRecording();
                }}
                className="flex-1 py-1.5 text-[11px] font-medium bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {t('تسجيل جديد', 'New Rec', 'Nouveau')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Processing indicator */}
      {processing && (
        <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-xl z-50 flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          <span className="text-[11px] text-muted-foreground">{t('جاري المعالجة...', 'Processing...', 'Traitement...')}</span>
        </div>
      )}
    </div>
  );
}
