import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { History, X, Camera, Video, Eye, Trash2 } from 'lucide-react';
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
      case 'subject': return <Camera className="w-4 h-4 text-emerald-500" />;
      case 'voice': return <Camera className="w-4 h-4 text-purple-500" />;
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
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
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
                {onClearHistory && history.length > 0 && (
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
            <div className="flex-1 overflow-y-auto">
              {selectedEntry ? (
                /* Detail View */
                <div className="p-4 space-y-4">
                  <button
                    onClick={() => setSelectedEntry(null)}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    ← {isAr ? 'رجوع للسجل' : 'Back to records'}
                  </button>

                  {/* Media Preview */}
                  {selectedEntry.mediaSrc && (
                    <div className="relative rounded-xl overflow-hidden border border-border/50 bg-muted/30">
                      {selectedEntry.mediaType === 'video' ? (
                        <div className="relative">
                          <img
                            src={selectedEntry.mediaSrc}
                            alt="Video thumbnail"
                            className="w-full max-h-48 object-contain cursor-pointer"
                            onClick={() => setShowMediaViewer(true)}
                          />
                          <button
                            onClick={() => setShowMediaViewer(true)}
                            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
                          >
                            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                              <Eye className="w-6 h-6 text-foreground" />
                            </div>
                          </button>
                        </div>
                      ) : (
                        <img
                          src={selectedEntry.mediaSrc}
                          alt="Analyzed image"
                          className="w-full max-h-64 object-contain cursor-pointer"
                          onClick={() => setShowMediaViewer(true)}
                        />
                      )}
                    </div>
                  )}

                  {/* Entry info */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${typeColor(selectedEntry.type)}`}>
                      {typeLabel(selectedEntry.type)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatTime(selectedEntry.timestamp)}
                    </span>
                  </div>

                  {/* Extracted Params */}
                  {selectedEntry.params && Object.keys(selectedEntry.params).length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {selectedEntry.params.velocity !== undefined && (
                        <div className="p-2 rounded-lg bg-secondary/50 border border-border/30">
                          <span className="text-[10px] text-muted-foreground">{isAr ? 'السرعة' : 'Velocity'}</span>
                          <p className="text-sm font-mono font-semibold text-foreground">{selectedEntry.params.velocity} m/s</p>
                        </div>
                      )}
                      {selectedEntry.params.angle !== undefined && (
                        <div className="p-2 rounded-lg bg-secondary/50 border border-border/30">
                          <span className="text-[10px] text-muted-foreground">{isAr ? 'الزاوية' : 'Angle'}</span>
                          <p className="text-sm font-mono font-semibold text-foreground">{selectedEntry.params.angle}°</p>
                        </div>
                      )}
                      {selectedEntry.params.height !== undefined && (
                        <div className="p-2 rounded-lg bg-secondary/50 border border-border/30">
                          <span className="text-[10px] text-muted-foreground">{isAr ? 'الارتفاع' : 'Height'}</span>
                          <p className="text-sm font-mono font-semibold text-foreground">{selectedEntry.params.height} m</p>
                        </div>
                      )}
                      {selectedEntry.params.mass !== undefined && (
                        <div className="p-2 rounded-lg bg-secondary/50 border border-border/30">
                          <span className="text-[10px] text-muted-foreground">{isAr ? 'الكتلة' : 'Mass'}</span>
                          <p className="text-sm font-mono font-semibold text-foreground">{selectedEntry.params.mass} kg</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Report */}
                  <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                    <h4 className="text-xs font-semibold text-foreground mb-2">{isAr ? 'تقرير التحليل' : 'Analysis Report'}</h4>
                    <ReportRenderer text={selectedEntry.report} />
                  </div>
                </div>
              ) : (
                /* List View */
                <div className="p-3 space-y-2">
                  {history.map(entry => (
                    <div
                      key={entry.id}
                      className="group relative p-3 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 cursor-pointer"
                      onClick={() => setSelectedEntry(entry)}
                    >
                      {/* Delete button */}
                      {onDeleteEntry && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteEntry(entry.id); }}
                          className="absolute top-2 end-2 p-1.5 rounded-md hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition-all duration-200 opacity-0 group-hover:opacity-100"
                          title={isAr ? 'حذف' : 'Delete'}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}

                      <div className="flex items-start gap-3">
                        {/* Thumbnail / Icon */}
                        <div className="shrink-0">
                          {entry.mediaSrc ? (
                            <div className="w-12 h-12 rounded-lg overflow-hidden border border-border/30 bg-muted/30">
                              <img src={entry.mediaSrc} alt="" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-secondary/50 border border-border/30">
                              {typeIcon(entry.type)}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${typeColor(entry.type)}`}>
                              {typeLabel(entry.type)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{formatTime(entry.timestamp)}</span>
                          </div>

                          {/* Show extracted params summary */}
                          {entry.params && Object.keys(entry.params).length > 0 && (
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                              {entry.params.velocity !== undefined && <span>v={entry.params.velocity}</span>}
                              {entry.params.angle !== undefined && <span>θ={entry.params.angle}°</span>}
                              {entry.params.height !== undefined && <span>h={entry.params.height}</span>}
                            </div>
                          )}

                          {/* Report preview */}
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {entry.report.replace(/```json[\s\S]*?```/g, '').replace(/[#*`]/g, '').trim().slice(0, 120)}...
                          </p>
                        </div>

                        {/* View indicator */}
                        <div className="shrink-0 flex items-center">
                          <Eye className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </div>
                  ))}
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
              <img
                src={selectedEntry.mediaSrc}
                alt="Video thumbnail"
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
