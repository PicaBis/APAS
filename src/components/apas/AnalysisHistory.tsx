import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { History, X, Camera, Video, Eye, Trash2, FileText, Mic } from 'lucide-react';
import ReportRenderer from './ReportRenderer';

interface AnalysisEntry {
  id: number;
  timestamp: Date;
  type: 'vision' | 'video' | 'subject' | 'voice';
  report: string;
  mediaSrc?: string;
  mediaType?: 'video' | 'image';
  params?: { velocity?: number; angle?: number; height?: number; mass?: number; isOutdoor?: boolean };
}

interface Props {
  lang: string;
  history: AnalysisEntry[];
  onClearHistory?: () => void;
  onDeleteEntry?: (id: number) => void;
  onApplyParams?: (params: NonNullable<AnalysisEntry['params']>) => void;
  forceOpenId?: number | null;
  onModalClose?: () => void;
}

const AnalysisHistory: React.FC<Props> = ({ lang, history, onClearHistory, onDeleteEntry, onApplyParams, forceOpenId, onModalClose }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AnalysisEntry | null>(null);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const isAr = lang === 'ar';

  useEffect(() => {
    if (forceOpenId) {
      const entry = history.find(e => e.id === forceOpenId);
      if (entry) {
        setSelectedEntry(entry);
        setShowModal(true);
      }
    }
  }, [forceOpenId, history]);

  const handleClose = () => {
    setShowModal(false);
    setSelectedEntry(null);
    onModalClose?.();
  };

  const typeLabel = (type: AnalysisEntry['type']) => {
    switch (type) {
      case 'vision': return isAr ? 'تحليل صورة' : 'Image Analysis';
      case 'video': return isAr ? 'تحليل فيديو' : 'Video Analysis';
      case 'subject': return isAr ? 'قراءة تمرين' : 'Exercise Reading';
      case 'voice': return isAr ? 'أمر صوتي' : 'Voice Command';
    }
  };

  const typeIcon = (type: AnalysisEntry['type']) => {
    switch (type) {
      case 'vision': return <Camera className="w-4 h-4 text-violet-500" />;
      case 'video': return <Video className="w-4 h-4 text-blue-500" />;
      case 'subject': return <FileText className="w-4 h-4 text-emerald-500" />;
      case 'voice': return <Mic className="w-4 h-4 text-purple-500" />;
    }
  };

  const typeColor = (type: AnalysisEntry['type']) => {
    switch (type) {
      case 'vision': return 'bg-violet-500/10 text-violet-600 dark:text-violet-400';
      case 'video': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'subject': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
      case 'voice': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (history.length === 0) return null;

  const subjectHistory = history.filter(e => e.type === 'subject');
  const otherHistory = history.filter(e => e.type !== 'subject');

  const handleApplyToSimulation = (entry: AnalysisEntry) => {
    if (entry.params) {
      onApplyParams?.(entry.params);
      handleClose();
      toast.success(isAr ? 'تم تطبيق المعطيات على المحاكاة بنجاح' : 'Parameters applied to simulation successfully');
    }
  };

  return (
    <>
      {/* Trigger Button - Bottom Position */}
      <div className="flex justify-center mt-8 mb-4">
        <button
          onClick={() => setShowModal(true)}
          className="w-full max-w-sm flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border border-amber-500/20 hover:border-amber-500/40 text-foreground font-black text-sm transition-all duration-300 relative shadow-xl shadow-amber-500/5 group"
        >
          <History className="w-5 h-5 text-amber-500 group-hover:rotate-180 transition-transform duration-500" />
          <span className="tracking-widest uppercase">{isAr ? 'سجل التحليلات الموحد' : 'Unified Analysis History'}</span>
          <span className="absolute -top-2.5 -right-2.5 w-7 h-7 bg-amber-500 text-white text-[11px] font-black rounded-full flex items-center justify-center shadow-lg border-2 border-background">
            {history.length}
          </span>
        </button>
      </div>

      {/* History Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={handleClose}>
          <div
            className={`bg-card border border-border/50 rounded-3xl shadow-2xl w-full flex flex-col overflow-hidden transition-all duration-500 ${selectedEntry ? 'max-w-5xl h-[92vh]' : 'max-w-xl max-h-[85vh]'}`}
            dir={isAr ? 'rtl' : 'ltr'}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border/30 bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <History className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h2 className="font-black text-foreground uppercase tracking-wider">{isAr ? 'سجل التحليلات' : 'Analysis Records'}</h2>
                  <p className="text-[10px] text-muted-foreground font-bold">{history.length} {isAr ? 'نموذج تم تحليله' : 'models analyzed'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onClearHistory && history.length > 0 && !selectedEntry && (
                  <button
                    onClick={onClearHistory}
                    className="p-2.5 rounded-xl hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all duration-300"
                    title={isAr ? 'مسح الكل' : 'Clear all'}
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                )}
                <button onClick={handleClose} className="p-2.5 rounded-xl hover:bg-muted transition-all duration-300 group">
                  <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {selectedEntry ? (
                /* Unified Detail View - Matches Analysis Result UI */
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setSelectedEntry(null)}
                      className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-lg transition-all"
                    >
                      {isAr ? '← العودة للقائمة' : '← Back to List'}
                    </button>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${typeColor(selectedEntry.type)}`}>
                        {typeLabel(selectedEntry.type)}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {formatTime(selectedEntry.timestamp)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Media & Report */}
                    <div className="space-y-4">
                      {selectedEntry.mediaSrc && (
                        <div className="relative rounded-2xl overflow-hidden border border-border/50 bg-black/5 shadow-inner group">
                          {selectedEntry.mediaType === 'video' ? (
                            <div className="aspect-video bg-black flex items-center justify-center">
                              <video
                                src={selectedEntry.mediaSrc}
                                controls
                                className="w-full h-full object-contain"
                                poster={selectedEntry.mediaSrc}
                              />
                            </div>
                          ) : (
                            <img
                              src={selectedEntry.mediaSrc}
                              alt="Analysis preview"
                              className="w-full max-h-[400px] object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                            />
                          )}
                        </div>
                      )}

                      <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
                        <h4 className="text-xs font-bold text-foreground mb-4 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          {isAr ? 'تقرير الأستاذ الفيزيائي' : 'Physics Expert Report'}
                        </h4>
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReportRenderer text={selectedEntry.report} />
                        </div>
                      </div>
                    </div>

                    {/* Right: Params & Physics */}
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-3">
                        {selectedEntry.params?.velocity !== undefined && (
                          <div className="p-4 rounded-2xl bg-white dark:bg-card border border-border/50 text-center shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
                              <span className="text-xl">🚀</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold block mb-1">{isAr ? 'السرعة' : 'Velocity'}</span>
                            <p className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">{selectedEntry.params.velocity}</p>
                            <span className="text-[10px] font-semibold text-blue-500/70 mt-1 block">m/s</span>
                          </div>
                        )}
                        {selectedEntry.params?.angle !== undefined && (
                          <div className="p-4 rounded-2xl bg-white dark:bg-card border border-border/50 text-center shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                              <span className="text-xl">📐</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold block mb-1">{isAr ? 'الزاوية' : 'Angle'}</span>
                            <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">{selectedEntry.params.angle}°</p>
                            <span className="text-[10px] font-semibold text-emerald-500/70 mt-1 block">deg</span>
                          </div>
                        )}
                        {selectedEntry.params?.height !== undefined && (
                          <div className="p-4 rounded-2xl bg-white dark:bg-card border border-border/50 text-center shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                              <span className="text-xl">📏</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold block mb-1">{isAr ? 'الارتفاع' : 'Height'}</span>
                            <p className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">{selectedEntry.params.height}</p>
                            <span className="text-[10px] font-semibold text-amber-500/70 mt-1 block">m</span>
                          </div>
                        )}
                        {selectedEntry.params?.mass !== undefined && (
                          <div className="p-4 rounded-2xl bg-white dark:bg-card border border-border/50 text-center shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center mx-auto mb-3">
                              <span className="text-xl">⚖️</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold block mb-1">{isAr ? 'الكتلة' : 'Mass'}</span>
                            <p className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400">{selectedEntry.params.mass}</p>
                            <span className="text-[10px] font-semibold text-purple-500/70 mt-1 block">kg</span>
                          </div>
                        )}
                      </div>

                      {/* Apply to Simulation Button */}
                      {selectedEntry.params && (
                        <button
                          onClick={() => handleApplyToSimulation(selectedEntry)}
                          className="w-full py-4 px-6 rounded-2xl bg-primary text-primary-foreground font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-3 group"
                        >
                          <span className="group-hover:rotate-12 transition-transform">🎯</span>
                          {isAr ? 'تطبيق على المحاكاة الآن' : 'Apply to Simulation Now'}
                        </button>
                      )}

                      {/* Physics Tips / Logic */}
                      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                        <p className="text-xs text-primary/80 italic leading-relaxed text-center">
                          {isAr ? '✦ تم تحليل هذا النموذج بدقة عالية وتطبيقه على المحرك الفيزيائي APAS Engine ✦' : '✦ Model analyzed with high precision and applied to APAS Physics Engine ✦'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Unified List View - Organized by Type */
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {/* Subject Records (Lateral) */}
                  {subjectHistory.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" />
                        {isAr ? 'تمارين تم تحليلها' : 'Analyzed Exercises'}
                      </h3>
                      <div className="grid grid-cols-1 gap-2">
                        {subjectHistory.map(entry => (
                          <div
                            key={entry.id}
                            className="group relative p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all duration-300 cursor-pointer overflow-hidden"
                            onClick={() => setSelectedEntry(entry)}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-xl">📝</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-bold text-foreground truncate">
                                    {isAr ? 'تحليل تمرين فيزيائي' : 'Physics Exercise Analysis'}
                                  </span>
                                  <span className="text-[9px] font-mono text-muted-foreground">{formatTime(entry.timestamp)}</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground line-clamp-1 opacity-70">
                                  {entry.report.replace(/#|\*|`/g, '').slice(0, 80)}...
                                </p>
                              </div>
                              {onDeleteEntry && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); onDeleteEntry(entry.id); }}
                                  className="p-2 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Other Records (Bottom) */}
                  {otherHistory.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                        <History className="w-3.5 h-3.5" />
                        {isAr ? 'سجلات الوسائط والأوامر' : 'Media & Voice Records'}
                      </h3>
                      <div className="space-y-2">
                        {otherHistory.map(entry => (
                          <div
                            key={entry.id}
                            className={`group relative p-3 rounded-2xl border border-border/50 bg-card hover:bg-secondary/50 transition-all duration-300 cursor-pointer`}
                            onClick={() => setSelectedEntry(entry)}
                          >
                            <div className="flex items-center gap-4">
                              {entry.mediaSrc ? (
                                <div className="w-14 h-14 rounded-xl overflow-hidden border border-border/30 bg-muted shrink-0">
                                  <img src={entry.mediaSrc} alt="" className="w-full h-full object-cover" />
                                </div>
                              ) : (
                                <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${typeColor(entry.type)}`}>
                                  {typeIcon(entry.type)}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${typeColor(entry.type)}`}>
                                    {typeLabel(entry.type)}
                                  </span>
                                  <span className="text-[9px] font-mono text-muted-foreground">{formatTime(entry.timestamp)}</span>
                                </div>
                                <p className="text-[11px] text-foreground font-medium truncate mb-1">
                                  {entry.params ? `v=${entry.params.velocity} θ=${entry.params.angle}° h=${entry.params.height}` : entry.report.slice(0, 50)}
                                </p>
                                <p className="text-[10px] text-muted-foreground line-clamp-1 opacity-60">
                                  {entry.report.replace(/#|\*|`/g, '').slice(0, 100)}...
                                </p>
                              </div>
                              {onDeleteEntry && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); onDeleteEntry(entry.id); }}
                                  className="p-2 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Full-screen Media Viewer */}
      {showMediaViewer && selectedEntry?.mediaSrc && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          onClick={() => setShowMediaViewer(false)}
        >
          <button
            onClick={() => setShowMediaViewer(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>
          {selectedEntry.mediaType === 'image' ? (
            <img
              src={selectedEntry.mediaSrc}
              alt="Full view"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <div className="max-w-full max-h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
              <video
                src={selectedEntry.mediaSrc}
                controls
                autoPlay
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
