import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Smartphone, Play, Square, Trash2, Download, X, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface SensorReading {
  t: number;
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
}

interface Props {
  lang: string;
  muted: boolean;
  onDataCollected?: (data: SensorReading[]) => void;
}

export default function SensorLab({ lang, muted, onDataCollected }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sensorData, setSensorData] = useState<SensorReading[]>([]);
  const [currentReading, setCurrentReading] = useState<SensorReading | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'accel' | 'gyro' | 'both'>('both');
  const startTimeRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const isAr = lang === 'ar';

  const requestPermission = useCallback(async () => {
    // Check if DeviceMotionEvent requires permission (iOS 13+)
    if (typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
      try {
        const permission = await (DeviceMotionEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
        setHasPermission(permission === 'granted');
        if (permission !== 'granted') {
          toast.error(isAr ? 'تم رفض إذن المستشعرات' : 'Sensor permission denied');
        }
      } catch {
        toast.error(isAr ? 'خطأ في طلب الإذن' : 'Permission request error');
        setHasPermission(false);
      }
    } else {
      // Non-iOS or older APIs — assume permission granted
      setHasPermission(true);
    }
  }, [isAr]);

  const handleMotionEvent = useCallback((event: DeviceMotionEvent) => {
    const accel = event.accelerationIncludingGravity;
    const gyro = event.rotationRate;
    if (!accel || !gyro) return;

    const reading: SensorReading = {
      t: (Date.now() - startTimeRef.current) / 1000,
      ax: accel.x ?? 0,
      ay: accel.y ?? 0,
      az: accel.z ?? 0,
      gx: gyro.alpha ?? 0,
      gy: gyro.beta ?? 0,
      gz: gyro.gamma ?? 0,
    };

    setCurrentReading(reading);
    setSensorData(prev => [...prev, reading]);
  }, []);

  const startRecording = useCallback(() => {
    setSensorData([]);
    startTimeRef.current = Date.now();
    setIsRecording(true);
    window.addEventListener('devicemotion', handleMotionEvent);
  }, [handleMotionEvent]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    window.removeEventListener('devicemotion', handleMotionEvent);
    if (sensorData.length > 0 && onDataCollected) {
      onDataCollected(sensorData);
    }
  }, [handleMotionEvent, sensorData, onDataCollected]);

  // Draw real-time chart
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Background
      ctx.fillStyle = 'rgba(0,0,0,0.02)';
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = 'rgba(128,128,128,0.15)';
      ctx.lineWidth = 1;
      const midY = H / 2;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(W, midY);
      ctx.stroke();

      if (sensorData.length < 2) {
        animFrameRef.current = requestAnimationFrame(draw);
        return;
      }

      // Show last 200 points
      const visibleData = sensorData.slice(-200);
      const tMin = visibleData[0].t;
      const tMax = visibleData[visibleData.length - 1].t;
      const tRange = Math.max(tMax - tMin, 0.1);

      const drawLine = (getValue: (d: SensorReading) => number, color: string, maxVal: number) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        for (let i = 0; i < visibleData.length; i++) {
          const x = ((visibleData[i].t - tMin) / tRange) * W;
          const val = getValue(visibleData[i]);
          const y = midY - (val / maxVal) * (H / 2 - 10);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };

      if (activeTab === 'accel' || activeTab === 'both') {
        drawLine(d => d.ax, '#ef4444', 20); // Red - X
        drawLine(d => d.ay, '#22c55e', 20); // Green - Y
        drawLine(d => d.az, '#3b82f6', 20); // Blue - Z
      }

      if (activeTab === 'gyro' || activeTab === 'both') {
        drawLine(d => d.gx, '#f59e0b', 360); // Amber - Alpha
        drawLine(d => d.gy, '#8b5cf6', 360); // Violet - Beta
        drawLine(d => d.gz, '#ec4899', 360); // Pink - Gamma
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isOpen, sensorData, activeTab]);

  const exportCSV = () => {
    if (sensorData.length === 0) return;
    const header = 'time,ax,ay,az,gx,gy,gz\n';
    const rows = sensorData.map(d => `${d.t.toFixed(4)},${d.ax.toFixed(4)},${d.ay.toFixed(4)},${d.az.toFixed(4)},${d.gx.toFixed(2)},${d.gy.toFixed(2)},${d.gz.toFixed(2)}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sensor_data_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(isAr ? 'تم تصدير البيانات' : 'Data exported');
  };

  const getMagnitude = (x: number, y: number, z: number) =>
    Math.sqrt(x * x + y * y + z * z);

  return (
    <>
      <button
        onClick={() => { setIsOpen(true); if (hasPermission === null) requestPermission(); }}
        className="w-full text-sm font-semibold py-3 px-4 rounded-xl flex items-center gap-3 text-foreground hover:bg-primary/5 border border-border/40 hover:border-border/60 transition-all duration-300 bg-card/50 backdrop-blur-sm"
      >
        <Smartphone className="w-5 h-5 text-primary" />
        <div className="text-left rtl:text-right">
          <div className="font-semibold">{isAr ? 'مختبر المستشعرات' : 'Sensor Lab'}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{isAr ? 'مقياس التسارع + الجيروسكوب' : 'Accel + Gyro'}</div>
        </div>
      </button>

      {isOpen && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm" onClick={() => { if (!isRecording) setIsOpen(false); }}>
          <div
            className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-slideDown"
            dir={isAr ? 'rtl' : 'ltr'}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">{isAr ? 'مختبر المستشعرات' : 'Sensor Lab'}</h3>
                {isRecording && (
                  <span className="flex items-center gap-1 text-[10px] text-red-500 font-medium">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    {isAr ? 'تسجيل...' : 'Recording...'}
                  </span>
                )}
              </div>
              {!isRecording && (
                <button onClick={() => setIsOpen(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-200">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Permission check */}
              {hasPermission === false && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-center">
                  <p className="text-red-600 dark:text-red-400 mb-2">{isAr ? 'لم يتم منح إذن المستشعرات' : 'Sensor permission not granted'}</p>
                  <button onClick={requestPermission} className="px-3 py-1 bg-primary text-primary-foreground rounded text-xs">
                    {isAr ? 'طلب إذن' : 'Request Permission'}
                  </button>
                </div>
              )}

              {/* Tab selector */}
              <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg">
                {([
                  { id: 'accel' as const, label: isAr ? 'التسارع' : 'Accelerometer' },
                  { id: 'gyro' as const, label: isAr ? 'الجيروسكوب' : 'Gyroscope' },
                  { id: 'both' as const, label: isAr ? 'الكل' : 'Both' },
                ]).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 text-xs py-2 rounded-md transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'hover:bg-secondary text-muted-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Current reading */}
              {currentReading && (
                <div className="grid grid-cols-2 gap-3">
                  {(activeTab === 'accel' || activeTab === 'both') && (
                    <div className="p-3 rounded-lg border border-border bg-secondary/20">
                      <p className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                        {isAr ? 'التسارع (m/s²)' : 'Acceleration (m/s²)'}
                      </p>
                      <div className="space-y-1 text-xs font-mono">
                        <div className="flex justify-between">
                          <span className="text-red-500">X:</span>
                          <span className="text-foreground">{currentReading.ax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-500">Y:</span>
                          <span className="text-foreground">{currentReading.ay.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-500">Z:</span>
                          <span className="text-foreground">{currentReading.az.toFixed(2)}</span>
                        </div>
                        <div className="pt-1 border-t border-border flex justify-between">
                          <span className="text-muted-foreground">|a|:</span>
                          <span className="font-semibold text-foreground">
                            {getMagnitude(currentReading.ax, currentReading.ay, currentReading.az).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {(activeTab === 'gyro' || activeTab === 'both') && (
                    <div className="p-3 rounded-lg border border-border bg-secondary/20">
                      <p className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                        {isAr ? 'الدوران (°/s)' : 'Rotation (°/s)'}
                      </p>
                      <div className="space-y-1 text-xs font-mono">
                        <div className="flex justify-between">
                          <span className="text-amber-500">α:</span>
                          <span className="text-foreground">{currentReading.gx.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-violet-500">β:</span>
                          <span className="text-foreground">{currentReading.gy.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-pink-500">γ:</span>
                          <span className="text-foreground">{currentReading.gz.toFixed(2)}</span>
                        </div>
                        <div className="pt-1 border-t border-border flex justify-between">
                          <span className="text-muted-foreground">|ω|:</span>
                          <span className="font-semibold text-foreground">
                            {getMagnitude(currentReading.gx, currentReading.gy, currentReading.gz).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Real-time chart */}
              <div className="border border-border rounded-lg overflow-hidden bg-secondary/10">
                <canvas ref={canvasRef} width={480} height={200} className="w-full h-[200px]" />
                {/* Legend */}
                <div className="flex flex-wrap gap-2 px-3 py-2 border-t border-border text-[9px]">
                  {(activeTab === 'accel' || activeTab === 'both') && (
                    <>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />aX</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />aY</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />aZ</span>
                    </>
                  )}
                  {(activeTab === 'gyro' || activeTab === 'both') && (
                    <>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />α</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500" />β</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-500" />γ</span>
                    </>
                  )}
                </div>
              </div>

              {/* Stats summary */}
              {sensorData.length > 0 && !isRecording && (
                <div className="p-3 rounded-lg border border-border bg-gradient-to-br from-primary/5 to-transparent">
                  <p className="text-xs font-semibold text-foreground mb-2">{isAr ? 'ملخص التسجيل' : 'Recording Summary'}</p>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div className="text-center bg-background/60 rounded p-1.5">
                      <p className="text-muted-foreground">{isAr ? 'النقاط' : 'Points'}</p>
                      <p className="font-mono font-semibold text-foreground">{sensorData.length}</p>
                    </div>
                    <div className="text-center bg-background/60 rounded p-1.5">
                      <p className="text-muted-foreground">{isAr ? 'المدة' : 'Duration'}</p>
                      <p className="font-mono font-semibold text-foreground">{sensorData[sensorData.length - 1].t.toFixed(1)}s</p>
                    </div>
                    <div className="text-center bg-background/60 rounded p-1.5">
                      <p className="text-muted-foreground">{isAr ? 'أقصى تسارع' : 'Peak Accel'}</p>
                      <p className="font-mono font-semibold text-foreground">
                        {Math.max(...sensorData.map(d => getMagnitude(d.ax, d.ay, d.az))).toFixed(1)} m/s²
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Controls footer */}
            <div className="p-4 border-t border-border bg-secondary/20 flex items-center gap-2">
              {!isRecording ? (
                <>
                  <button
                    onClick={startRecording}
                    disabled={hasPermission === false}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-medium text-xs shadow-lg shadow-red-500/20 hover:shadow-xl hover:shadow-red-500/30 transition-all duration-300 disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5" />
                    {isAr ? 'بدء التسجيل' : 'Start Recording'}
                  </button>
                  {sensorData.length > 0 && (
                    <>
                      <button onClick={exportCSV} className="p-2.5 rounded-lg border border-border hover:bg-secondary transition-all" title={isAr ? 'تصدير CSV' : 'Export CSV'}>
                        <Download className="w-3.5 h-3.5 text-foreground" />
                      </button>
                      <button onClick={() => { setSensorData([]); setCurrentReading(null); }} className="p-2.5 rounded-lg border border-border hover:bg-secondary transition-all" title={isAr ? 'مسح' : 'Clear'}>
                        <Trash2 className="w-3.5 h-3.5 text-foreground" />
                      </button>
                    </>
                  )}
                </>
              ) : (
                <button
                  onClick={stopRecording}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-lg font-medium text-xs shadow-lg transition-all duration-300"
                >
                  <Square className="w-3.5 h-3.5" />
                  {isAr ? 'إيقاف التسجيل' : 'Stop Recording'}
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
