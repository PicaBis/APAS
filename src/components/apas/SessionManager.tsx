import React, { useState, useEffect } from 'react';
import { Save, FolderOpen, Trash2, ChevronDown, Download, Upload, X } from 'lucide-react';
import { playClick, playUIClick, playSectionToggle } from '@/utils/sound';

export interface SessionData {
  name: string;
  timestamp: number;
  params: {
    velocity: number;
    angle: number;
    height: number;
    gravity: number;
    airResistance: number;
    mass: number;
    windSpeed: number;
    environmentId: string;
    nightMode: boolean;
    integrationMethod: string;
    enableBounce: boolean;
    bounceCoefficient: number;
  };
}

const STORAGE_KEY = 'apas_sessions';

function loadSessions(): SessionData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSessions(sessions: SessionData[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

interface Props {
  lang: string;
  muted: boolean;
  velocity: number;
  angle: number;
  height: number;
  gravity: number;
  airResistance: number;
  mass: number;
  windSpeed: number;
  environmentId: string;
  nightMode: boolean;
  integrationMethod: string;
  enableBounce: boolean;
  bounceCoefficient: number;
  onLoad: (session: SessionData) => void;
}

export default function SessionManager({
  lang, muted, velocity, angle, height, gravity, airResistance, mass,
  windSpeed, environmentId, nightMode, integrationMethod, enableBounce, bounceCoefficient, onLoad,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [sessionName, setSessionName] = useState('');
  const isAr = lang === 'ar';

  useEffect(() => { setSessions(loadSessions()); }, []);

  const handleSave = () => {
    const name = sessionName.trim() || `${isAr ? 'جلسة' : 'Session'} ${sessions.length + 1}`;
    const session: SessionData = {
      name,
      timestamp: Date.now(),
      params: { velocity, angle, height, gravity, airResistance, mass, windSpeed, environmentId, nightMode, integrationMethod, enableBounce, bounceCoefficient },
    };
    const updated = [session, ...sessions].slice(0, 20);
    saveSessions(updated);
    setSessions(updated);
    setSessionName('');
    playUIClick(muted);
  };

  const handleDelete = (index: number) => {
    const updated = sessions.filter((_, i) => i !== index);
    saveSessions(updated);
    setSessions(updated);
    playClick(muted);
  };

  const handleLoad = (session: SessionData) => {
    onLoad(session);
    playUIClick(muted);
  };

  const handleExportAll = () => {
    const blob = new Blob([JSON.stringify(sessions, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'APAS_Sessions.json'; a.click();
    URL.revokeObjectURL(url);
    playClick(muted);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const imported = JSON.parse(reader.result as string) as SessionData[];
          if (Array.isArray(imported)) {
            const merged = [...imported, ...sessions].slice(0, 50);
            saveSessions(merged);
            setSessions(merged);
            playUIClick(muted);
          }
        } catch { /* ignore invalid files */ }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden bg-card/60 backdrop-blur-sm shadow-lg shadow-black/5 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
      <button
        onClick={() => { setExpanded(!expanded); playSectionToggle(muted); }}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-primary/5 transition-all duration-300"
      >
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-tight flex items-center gap-2">
          <Save className="w-3.5 h-3.5 text-primary" />
          {isAr ? 'حفظ واستعادة الجلسات' : lang === 'fr' ? 'Sessions' : 'Sessions'}
        </h3>
        <div className="flex items-center gap-2">
          {!expanded && sessions.length > 0 && (
            <span className="text-[10px] text-muted-foreground font-mono">
              {sessions.length} {isAr ? 'جلسة' : 'saved'}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-border space-y-2 pt-2 animate-slideDown">
          {/* Save new session */}
          <div className="flex gap-1.5">
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder={isAr ? 'اسم الجلسة...' : 'Session name...'}
              className="flex-1 text-xs px-2 py-1.5 rounded border border-border bg-secondary/30 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
              dir={isAr ? 'rtl' : 'ltr'}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            />
            <button
              onClick={handleSave}
              className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors flex items-center gap-1"
            >
              <Save className="w-3 h-3" />
              {isAr ? 'حفظ' : 'Save'}
            </button>
          </div>

          {/* Import/Export */}
          <div className="flex gap-1.5">
            <button onClick={handleImport} className="flex-1 text-[10px] py-1.5 px-2 rounded border border-border hover:bg-secondary transition-colors flex items-center justify-center gap-1 text-muted-foreground hover:text-foreground">
              <Upload className="w-3 h-3" /> {isAr ? 'استيراد' : 'Import'}
            </button>
            <button onClick={handleExportAll} disabled={sessions.length === 0} className="flex-1 text-[10px] py-1.5 px-2 rounded border border-border hover:bg-secondary transition-colors flex items-center justify-center gap-1 text-muted-foreground hover:text-foreground disabled:opacity-40">
              <Download className="w-3 h-3" /> {isAr ? 'تصدير الكل' : 'Export All'}
            </button>
          </div>

          {/* Session list */}
          {sessions.length === 0 ? (
            <p className="text-[10px] text-muted-foreground text-center py-2">{isAr ? 'لا توجد جلسات محفوظة' : 'No saved sessions'}</p>
          ) : (
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {sessions.map((s, i) => (
                <div key={s.timestamp + i} className="flex items-center gap-1.5 p-2 rounded-lg bg-secondary/30 hover:bg-secondary/60 transition-colors group">
                  <button onClick={() => handleLoad(s)} className="flex-1 text-left min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{s.name}</p>
                    <p className="text-[9px] text-muted-foreground font-mono">
                      v={s.params.velocity} θ={s.params.angle}° h={s.params.height} • {formatTime(s.timestamp)}
                    </p>
                  </button>
                  <button onClick={() => handleDelete(i)} className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
