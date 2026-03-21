import React, { useState, useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';

interface Props {
  lang: string;
  muted: boolean;
}

const SHORTCUTS = [
  { key: 'Space', descEn: 'Launch / Pause simulation', descAr: 'إطلاق / إيقاف المحاكاة', descFr: 'Lancer / Pause simulation' },
  { key: 'R', descEn: 'Reset simulation', descAr: 'إعادة تعيين المحاكاة', descFr: 'Reinitialiser simulation' },
  { key: 'G', descEn: 'Toggle grid', descAr: 'تبديل الشبكة', descFr: 'Basculer la grille' },
  { key: 'F', descEn: 'Toggle fullscreen', descAr: 'ملء الشاشة', descFr: 'Plein ecran' },
  { key: '3', descEn: 'Toggle 3D view', descAr: 'تبديل العرض ثلاثي الأبعاد', descFr: 'Basculer vue 3D' },
  { key: '+', descEn: 'Zoom in', descAr: 'تكبير', descFr: 'Zoom avant' },
  { key: '-', descEn: 'Zoom out', descAr: 'تصغير', descFr: 'Zoom arriere' },
  { key: 'Ctrl+Z', descEn: 'Undo parameter change', descAr: 'تراجع عن التغيير', descFr: 'Annuler le changement' },
  { key: 'Ctrl+Y', descEn: 'Redo parameter change', descAr: 'إعادة التغيير', descFr: 'Retablir le changement' },
  { key: 'M', descEn: 'Toggle mute', descAr: 'كتم/تشغيل الصوت', descFr: 'Activer/desactiver le son' },
  { key: 'N', descEn: 'Toggle night mode', descAr: 'الوضع الليلي', descFr: 'Mode nuit' },
  { key: '?', descEn: 'Show this help', descAr: 'عرض هذه المساعدة', descFr: 'Afficher cette aide' },
];

export default function KeyboardShortcutsHelp({ lang }: Props) {
  const [open, setOpen] = useState(false);
  const isAr = lang === 'ar';
  const isFr = lang === 'fr';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  if (!open) return null;

  const title = isAr ? 'اختصارات لوحة المفاتيح' : isFr ? 'Raccourcis clavier' : 'Keyboard Shortcuts';

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setOpen(false)}>
      <div
        className="bg-background border border-border rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
        dir={isAr ? 'rtl' : 'ltr'}
      >
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between z-10">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Keyboard className="w-4 h-4" />
            {title}
          </h2>
          <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-1">
          {SHORTCUTS.map(({ key, descEn, descAr, descFr }) => (
            <div key={key} className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-secondary/50 transition-colors">
              <span className="text-xs text-muted-foreground">
                {isAr ? descAr : isFr ? descFr : descEn}
              </span>
              <kbd className="px-2 py-1 text-[11px] font-mono bg-secondary border border-border rounded-md text-foreground min-w-[40px] text-center">
                {key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="border-t border-border p-3 text-center">
          <span className="text-[10px] text-muted-foreground">
            {isAr ? 'اضغط ? أو Esc للإغلاق' : isFr ? 'Appuyez sur ? ou Esc pour fermer' : 'Press ? or Esc to close'}
          </span>
        </div>
      </div>
    </div>
  );
}
