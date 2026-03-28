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
  params?: { velocity?: number; angle?: number; height?: number; mass?: number };
}

interface Props {
  lang: string;
  history: AnalysisEntry[];
  onClearHistory?: () => void;
  onDeleteEntry?: (id: number) => void;
}

export default function AnalysisHistory({ lang, history, onClearHistory, onDeleteEntry }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AnalysisEntry | null>(null);
  const [showMediaViewer, setShowMediaViewer] = useState(false);

  const isAr = lang === 'ar';

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

  // Split history into Subject (Lateral) and Others (Bottom)
  const subjectHistory = history.filter(e => e.type === 'subject');
  const otherHistory = history.filter(e => e.type !== 'subject');

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setShowModal(true)}
        className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border border-amber-500/20 hover:border-amber-500/40 text-foreground font-medium text-sm transition-all duration-300 relative"
      >
        <History className="w-4 h-4" />
        <span>{isAr ? 'سجل التحليلات' : 'Analysis Records'}</span>
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-sm">
          {history.length}
        </span>
      </button>

      {/* History Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => { setShowModal(false); setSelectedEntry(null); }}>
          <div
            className={`bg-card border border-border rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden transition-all duration-500 ${selectedEntry ? 'max-w-4xl h-[90vh]' : 'max-w-lg max-h-[85vh]'}`}
            dir={isAr ? 'rtl' : 'ltr'}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-500" />
                <h2 className="font-bold text-foreground">{isAr ? 'سجل التحليلات' : 'Analysis Records'}</h2>
                <span className="text-xs text-muted-foreground">({history.length})</span>
              </div>
              <div className="flex items-center gap-1">
                {onClearHistory && history.length > 0 && !selectedEntry && (
                  <button
                    onClick={onClearHistory}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors text-xs"
                    title={isAr ? 'مسح الكل' : 'Clear all'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => { setShowModal(false); setSelectedEntry(null); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <X className="w-4 h-4" />
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
                          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 text-center shadow-sm">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center mx-auto mb-3">
                              <span className="text-xl">🚀</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold block mb-1">{isAr ? 'السرعة' : 'Velocity'}</span>
                            <p className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">{selectedEntry.params.velocity}</p>
                            <span className="text-[10px] font-semibold text-blue-500/70 mt-1 block">m/s</span>
                          </div>
                        )}
                        {selectedEntry.params?.angle !== undefined && (
                          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 text-center shadow-sm">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                              <span className="text-xl">📐</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold block mb-1">{isAr ? 'الزاوية' : 'Angle'}</span>
                            <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">{selectedEntry.params.angle}°</p>
                            <span className="text-[10px] font-semibold text-emerald-500/70 mt-1 block">deg</span>
                          </div>
                        )}
                        {selectedEntry.params?.height !== undefined && (
                          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 text-center shadow-sm">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center mx-auto mb-3">
                              <span className="text-xl">📏</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold block mb-1">{isAr ? 'الارتفاع' : 'Height'}</span>
                            <p className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">{selectedEntry.params.height}</p>
                            <span className="text-[10px] font-semibold text-amber-500/70 mt-1 block">m</span>
                          </div>
                        )}
                        {selectedEntry.params?.mass !== undefined && (
                          <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 text-center shadow-sm">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center mx-auto mb-3">
                              <span className="text-xl">⚖️</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold block mb-1">{isAr ? 'الكتلة' : 'Mass'}</span>
                            <p className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400">{selectedEntry.params.mass}</p>
                            <span className="text-[10px] font-semibold text-purple-500/70 mt-1 block">kg</span>
                          </div>
                        )}
                      </div>

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
