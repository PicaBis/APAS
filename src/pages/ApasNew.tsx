import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  Upload, Play, ArrowLeft, Gauge, Target, Mountain, Ruler,
  Clock, TrendingUp, Zap, Wind, Brain, ChevronDown, ChevronUp,
  BarChart3, FileJson, Sparkles, Loader2, AlertTriangle, CheckCircle,
  Video, RefreshCw,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  analyzeVideo,
  generateAIInsights,
  type PhysicsReport,
  type AnalysisProgress,
  type AnalysisConfig,
} from '@/utils/apasNewEngine';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ScatterChart, Scatter, Legend,
} from 'recharts';

type Lang = 'ar' | 'en';

// ═══════════════════════════════════════════════════════════════
// STAGE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

const STAGES = [
  { id: 'extract', icon: '1', label: { ar: 'استخراج الإطارات', en: 'Extracting Frames' }, color: '#22d3ee' },
  { id: 'track', icon: '2', label: { ar: 'تتبع الكائن', en: 'Tracking Object' }, color: '#a78bfa' },
  { id: 'noise', icon: '3', label: { ar: 'تنقية البيانات', en: 'Noise Reduction' }, color: '#34d399' },
  { id: 'launch', icon: '4', label: { ar: 'كشف الإطلاق', en: 'Launch Detection' }, color: '#fbbf24' },
  { id: 'calibrate', icon: '5', label: { ar: 'المعايرة', en: 'Calibration' }, color: '#f97316' },
  { id: 'physics', icon: '6', label: { ar: 'محرك الفيزياء', en: 'Physics Engine' }, color: '#ec4899' },
];

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

const ApasNew: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [lang, setLang] = useState<Lang>(() => {
    try { return (localStorage.getItem('apas_lang') as Lang) || 'ar'; } catch { return 'ar'; }
  });
  const [file, setFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [report, setReport] = useState<PhysicsReport | null>(null);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [referenceMeters, setReferenceMeters] = useState<string>('');
  const [sensitivity, setSensitivity] = useState(50);
  const isAr = lang === 'ar';

  // Cleanup video URL on unmount
  useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    };
  }, [videoPreviewUrl]);

  // Handle file selection
  const handleFileSelect = useCallback((selectedFile: File) => {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setFile(selectedFile);
    setVideoPreviewUrl(URL.createObjectURL(selectedFile));
    setReport(null);
    setAiInsights(null);
    setError(null);
  }, [videoPreviewUrl]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('video/')) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleFileSelect(selected);
  }, [handleFileSelect]);

  // Run analysis
  const runAnalysis = useCallback(async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setError(null);
    setReport(null);
    setAiInsights(null);

    const config: AnalysisConfig = {
      sensitivity,
      referenceMeters: referenceMeters ? parseFloat(referenceMeters) : undefined,
    };

    try {
      const result = await analyzeVideo(file, setProgress, config);
      setReport(result);
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [file, sensitivity, referenceMeters]);

  // Generate AI insights
  const fetchAiInsights = useCallback(async () => {
    if (!report) return;
    setAiLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
      const insights = await generateAIInsights(report, lang, supabaseUrl, supabaseKey);
      setAiInsights(insights);
    } catch {
      setAiInsights(
        isAr
          ? 'تعذر الحصول على تحليل الذكاء الاصطناعي. يرجى المحاولة مرة أخرى.'
          : 'Could not fetch AI insights. Please try again.'
      );
    } finally {
      setAiLoading(false);
    }
  }, [report, lang, isAr]);

  // Reset
  const handleReset = useCallback(() => {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setFile(null);
    setVideoPreviewUrl(null);
    setReport(null);
    setAiInsights(null);
    setError(null);
    setProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [videoPreviewUrl]);

  // ═══════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════════════════════════════

  const renderMetricCard = (
    icon: React.ReactNode,
    label: string,
    value: string,
    unit: string,
    color: string,
    delay: number,
  ) => (
    <div
      className="relative group"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `radial-gradient(circle at center, ${color}15, transparent 70%)` }} />
      <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all duration-300 hover:translate-y-[-2px]">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-xl" style={{ background: `${color}20` }}>
            {icon}
          </div>
          <span className="text-sm text-gray-400 font-medium">{label}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-white tracking-tight">{value}</span>
          <span className="text-sm text-gray-500 font-medium">{unit}</span>
        </div>
      </div>
    </div>
  );

  const renderProgressPipeline = () => {
    if (!progress) return null;
    return (
      <div className="space-y-4">
        {STAGES.map((stage, idx) => {
          const isActive = progress.stageIndex === idx;
          const isCompleted = progress.stageIndex > idx;
          const isPending = progress.stageIndex < idx;

          return (
            <div key={stage.id} className="flex items-center gap-4">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  isCompleted
                    ? 'bg-green-500/20 text-green-400 border-2 border-green-500/50'
                    : isActive
                      ? 'border-2 animate-pulse text-white'
                      : 'bg-white/5 text-gray-600 border-2 border-white/10'
                }`}
                style={isActive ? { borderColor: stage.color, color: stage.color } : {}}
              >
                {isCompleted ? <CheckCircle size={18} /> : stage.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${
                    isPending ? 'text-gray-600' : isActive ? 'text-white' : 'text-green-400'
                  }`}>
                    {stage.label[lang]}
                  </span>
                  {isActive && (
                    <span className="text-xs text-gray-400">{progress.progress}%</span>
                  )}
                </div>
                {isActive && (
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${progress.progress}%`, background: stage.color }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div
      className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/home')}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                APAS NEW
              </h1>
              <p className="text-sm text-gray-500">
                {isAr ? 'محلل فيزياء الفيديو المستقل' : 'Standalone Video Physics Analyzer'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language toggle */}
            <div className="flex bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <button
                onClick={() => setLang('ar')}
                className={`px-3 py-1.5 text-sm font-medium transition-all ${
                  lang === 'ar' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                عربي
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-3 py-1.5 text-sm font-medium transition-all ${
                  lang === 'en' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Upload & Config */}
          <div className="space-y-6">
            {/* Upload Zone */}
            <div
              className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer ${
                file
                  ? 'border-cyan-500/40 bg-cyan-500/5'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
              }`}
              onClick={() => !isAnalyzing && fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
                className="hidden"
                onChange={handleInputChange}
              />

              {!file ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 flex items-center justify-center">
                    <Upload size={28} className="text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white">
                      {isAr ? 'ارفع فيديو المقذوف' : 'Upload Projectile Video'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {isAr ? 'MP4, MOV, WebM — اسحب وأفلت أو انقر' : 'MP4, MOV, WebM — Drag & drop or click'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-3">
                    <Video size={20} className="text-cyan-400" />
                    <span className="text-sm font-medium text-white truncate max-w-[200px]">{file.name}</span>
                    <span className="text-xs text-gray-500">
                      ({(file.size / (1024 * 1024)).toFixed(1)} MB)
                    </span>
                  </div>
                  {videoPreviewUrl && (
                    <video
                      src={videoPreviewUrl}
                      className="w-full max-h-48 rounded-xl object-contain bg-black/50"
                      controls
                      muted
                    />
                  )}
                </div>
              )}
            </div>

            {/* Advanced Settings */}
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-all"
              >
                <span className="text-sm font-medium text-gray-400">
                  {isAr ? 'إعدادات متقدمة' : 'Advanced Settings'}
                </span>
                {showAdvanced ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
              </button>

              {showAdvanced && (
                <div className="px-4 pb-4 space-y-4 border-t border-white/5">
                  <div className="pt-4">
                    <label className="block text-xs text-gray-500 mb-2">
                      {isAr ? 'الطول المرجعي (متر) — اختياري' : 'Reference Length (meters) — optional'}
                    </label>
                    <input
                      type="number"
                      value={referenceMeters}
                      onChange={(e) => setReferenceMeters(e.target.value)}
                      placeholder={isAr ? 'مثال: 1.8 (طول شخص)' : 'e.g., 1.8 (person height)'}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">
                      {isAr ? `حساسية الكشف: ${sensitivity}%` : `Detection Sensitivity: ${sensitivity}%`}
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={sensitivity}
                      onChange={(e) => setSensitivity(Number(e.target.value))}
                      className="w-full accent-cyan-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={runAnalysis}
                disabled={!file || isAnalyzing}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {isAr ? 'جاري التحليل...' : 'Analyzing...'}
                  </>
                ) : (
                  <>
                    <Play size={18} />
                    {isAr ? 'تحليل الفيديو' : 'Analyze Video'}
                  </>
                )}
              </button>

              {(file || report) && (
                <button
                  onClick={handleReset}
                  disabled={isAnalyzing}
                  className="px-4 py-3.5 rounded-2xl text-sm font-medium bg-white/5 border border-white/10 hover:bg-white/10 transition-all disabled:opacity-40"
                >
                  <RefreshCw size={18} />
                </button>
              )}
            </div>

            {/* Processing Pipeline */}
            {isAnalyzing && progress && (
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-cyan-400" />
                  {isAr ? 'خط أنابيب المعالجة' : 'Processing Pipeline'}
                </h3>
                {renderProgressPipeline()}
                <div className="mt-4">
                  <Progress value={(progress.stageIndex / progress.totalStages) * 100} className="h-2" />
                  <p className="text-xs text-gray-500 mt-2">{progress.message}</p>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle size={20} className="text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-400">
                    {isAr ? 'خطأ في التحليل' : 'Analysis Error'}
                  </p>
                  <p className="text-xs text-red-400/70 mt-1">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right: Results */}
          <div className="space-y-6">
            {!report && !isAnalyzing && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-4 py-20">
                  <div className="w-20 h-20 mx-auto rounded-full bg-white/5 flex items-center justify-center">
                    <BarChart3 size={32} className="text-gray-600" />
                  </div>
                  <p className="text-gray-600 text-sm">
                    {isAr ? 'النتائج ستظهر هنا بعد التحليل' : 'Results will appear here after analysis'}
                  </p>
                </div>
              </div>
            )}

            {report && (
              <>
                {/* Confidence badge */}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">
                    {isAr ? 'نتائج التحليل' : 'Analysis Results'}
                  </h2>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                    report.confidence > 0.8
                      ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                      : report.confidence > 0.5
                        ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                        : 'bg-red-500/15 text-red-400 border border-red-500/30'
                  }`}>
                    <CheckCircle size={12} />
                    {isAr ? 'الثقة' : 'Confidence'}: {(report.confidence * 100).toFixed(0)}%
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {renderMetricCard(
                    <Gauge size={18} className="text-cyan-400" />,
                    isAr ? 'السرعة الابتدائية' : 'Initial Velocity',
                    report.initialVelocity.toFixed(2),
                    'm/s',
                    '#22d3ee',
                    0,
                  )}
                  {renderMetricCard(
                    <Target size={18} className="text-violet-400" />,
                    isAr ? 'زاوية الإطلاق' : 'Launch Angle',
                    report.launchAngle.toFixed(1),
                    '°',
                    '#a78bfa',
                    100,
                  )}
                  {renderMetricCard(
                    <Mountain size={18} className="text-emerald-400" />,
                    isAr ? 'الارتفاع الأقصى' : 'Max Height',
                    report.maxHeight.toFixed(2),
                    'm',
                    '#34d399',
                    200,
                  )}
                  {renderMetricCard(
                    <Ruler size={18} className="text-amber-400" />,
                    isAr ? 'المدى' : 'Range',
                    report.range.toFixed(2),
                    'm',
                    '#fbbf24',
                    300,
                  )}
                  {renderMetricCard(
                    <Clock size={18} className="text-orange-400" />,
                    isAr ? 'زمن التحليق' : 'Time of Flight',
                    report.timeOfFlight.toFixed(2),
                    's',
                    '#f97316',
                    400,
                  )}
                  {renderMetricCard(
                    <TrendingUp size={18} className="text-pink-400" />,
                    isAr ? 'سرعة الاصطدام' : 'Impact Velocity',
                    report.impactVelocity.toFixed(2),
                    'm/s',
                    '#ec4899',
                    500,
                  )}
                </div>

                {/* Trajectory Equation */}
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp size={16} className="text-cyan-400" />
                    <span className="text-sm font-semibold text-white">
                      {isAr ? 'معادلة المسار' : 'Trajectory Equation'}
                    </span>
                  </div>
                  <div className="bg-black/30 rounded-xl px-4 py-3 font-mono text-sm text-cyan-300 overflow-x-auto">
                    {report.trajectory}
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span>R² = {report.rSquared.toFixed(4)}</span>
                    <span>{isAr ? 'نقاط:' : 'Points:'} {report.pointsUsed}</span>
                    <span>{isAr ? 'إطارات:' : 'Frames:'} {report.framesAnalyzed}</span>
                    <span>{isAr ? 'وقت:' : 'Time:'} {(report.processingTimeMs / 1000).toFixed(1)}s</span>
                  </div>
                </div>

                {/* Trajectory Chart */}
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <BarChart3 size={16} className="text-violet-400" />
                    {isAr ? 'رسم المسار' : 'Trajectory Plot'}
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                        <XAxis
                          dataKey="x"
                          type="number"
                          stroke="#666"
                          fontSize={11}
                          label={{ value: 'x (m)', position: 'bottom', fill: '#666', fontSize: 11 }}
                        />
                        <YAxis
                          dataKey="y"
                          type="number"
                          stroke="#666"
                          fontSize={11}
                          label={{ value: 'y (m)', angle: -90, position: 'insideLeft', fill: '#666', fontSize: 11 }}
                        />
                        <Tooltip
                          contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: '12px', fontSize: '12px' }}
                          labelStyle={{ color: '#888' }}
                        />
                        <Legend />
                        <Scatter
                          name={isAr ? 'نقاط مرصودة' : 'Observed Points'}
                          data={report.rawTrajectory}
                          fill="#22d3ee"
                          fillOpacity={0.7}
                          r={4}
                        />
                        <Scatter
                          name={isAr ? 'منحنى ملائم' : 'Fitted Curve'}
                          data={report.smoothedTrajectory}
                          fill="#a78bfa"
                          fillOpacity={0.5}
                          r={2}
                          line={{ stroke: '#a78bfa', strokeWidth: 2 }}
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Velocity Over Time */}
                {report.rawTrajectory.length > 2 && (
                  <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                      <Zap size={16} className="text-amber-400" />
                      {isAr ? 'السرعة مع الزمن' : 'Velocity vs Time'}
                    </h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={report.rawTrajectory.slice(1).map((pt, i) => {
                            const prev = report.rawTrajectory[i];
                            const dt = pt.t - prev.t;
                            const dx = pt.x - prev.x;
                            const dy = pt.y - prev.y;
                            const speed = dt > 0 ? Math.sqrt(dx * dx + dy * dy) / dt : 0;
                            return { t: pt.t.toFixed(2), speed: parseFloat(speed.toFixed(2)) };
                          })}
                          margin={{ top: 5, right: 20, bottom: 20, left: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                          <XAxis dataKey="t" stroke="#666" fontSize={11} label={{ value: 't (s)', position: 'bottom', fill: '#666', fontSize: 11 }} />
                          <YAxis stroke="#666" fontSize={11} label={{ value: 'v (m/s)', angle: -90, position: 'insideLeft', fill: '#666', fontSize: 11 }} />
                          <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: '12px', fontSize: '12px' }} />
                          <Line type="monotone" dataKey="speed" stroke="#fbbf24" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Additional Info */}
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">{isAr ? 'Vx₀' : 'Vx₀'}</span>
                      <p className="text-white font-medium">{report.vx0.toFixed(2)} m/s</p>
                    </div>
                    <div>
                      <span className="text-gray-500">{isAr ? 'Vy₀' : 'Vy₀'}</span>
                      <p className="text-white font-medium">{report.vy0.toFixed(2)} m/s</p>
                    </div>
                    <div>
                      <span className="text-gray-500">{isAr ? 'مقاومة الهواء' : 'Air Drag'}</span>
                      <p className="text-white font-medium flex items-center gap-1">
                        <Wind size={14} className="text-gray-400" />
                        {report.dragEstimate === 'none'
                          ? (isAr ? 'لا يوجد' : 'None')
                          : report.dragEstimate === 'slight'
                            ? (isAr ? 'طفيف' : 'Slight')
                            : (isAr ? 'كبير' : 'Significant')}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">{isAr ? 'المعايرة' : 'Calibration'}</span>
                      <p className="text-white font-medium text-xs">{report.calibrationSource}</p>
                    </div>
                  </div>
                </div>

                {/* AI Insights */}
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Brain size={16} className="text-fuchsia-400" />
                      {isAr ? 'تحليل الذكاء الاصطناعي' : 'AI Insights'}
                    </h3>
                    <button
                      onClick={fetchAiInsights}
                      disabled={aiLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30 hover:bg-fuchsia-500/20 transition-all disabled:opacity-50"
                    >
                      {aiLoading ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          {isAr ? 'جاري...' : 'Loading...'}
                        </>
                      ) : (
                        <>
                          <Sparkles size={12} />
                          {isAr ? 'تحليل ذكي' : 'Generate'}
                        </>
                      )}
                    </button>
                  </div>

                  {aiInsights ? (
                    <div className="prose prose-invert prose-sm max-w-none text-gray-300">
                      <ReactMarkdown>{aiInsights}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-600">
                      {isAr
                        ? 'انقر "تحليل ذكي" للحصول على رؤى من الذكاء الاصطناعي'
                        : 'Click "Generate" for AI-powered analysis insights'}
                    </p>
                  )}
                </div>

                {/* JSON Export */}
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setShowJson(!showJson)}
                    className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-all"
                  >
                    <span className="text-sm font-medium text-gray-400 flex items-center gap-2">
                      <FileJson size={16} />
                      {isAr ? 'البيانات الخام (JSON)' : 'Raw Data (JSON)'}
                    </span>
                    {showJson ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                  </button>

                  {showJson && (
                    <div className="px-4 pb-4 border-t border-white/5">
                      <pre className="mt-3 bg-black/40 rounded-xl p-4 text-xs text-green-400 overflow-x-auto max-h-64 font-mono">
                        {JSON.stringify({
                          initial_velocity: parseFloat(report.initialVelocity.toFixed(2)),
                          launch_angle: parseFloat(report.launchAngle.toFixed(1)),
                          max_height: parseFloat(report.maxHeight.toFixed(2)),
                          range: parseFloat(report.range.toFixed(2)),
                          time_of_flight: parseFloat(report.timeOfFlight.toFixed(2)),
                          trajectory: report.trajectory,
                          confidence: parseFloat(report.confidence.toFixed(2)),
                          vx0: parseFloat(report.vx0.toFixed(2)),
                          vy0: parseFloat(report.vy0.toFixed(2)),
                          impact_velocity: parseFloat(report.impactVelocity.toFixed(2)),
                          drag_estimate: report.dragEstimate,
                          r_squared: parseFloat(report.rSquared.toFixed(4)),
                          points_used: report.pointsUsed,
                          frames_analyzed: report.framesAnalyzed,
                          processing_time_ms: Math.round(report.processingTimeMs),
                          calibration_source: report.calibrationSource,
                        }, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-xs text-gray-700 pb-4">
          APAS NEW v1.0 — {isAr ? 'محلل فيزياء الفيديو المستقل' : 'Standalone Video Physics Analyzer'}
        </footer>
      </div>
    </div>
  );
};

export default ApasNew;
