import React, { useState, useRef } from 'react';
import { Shield, X, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Props {
  lang?: string;
}

export default function DevPrivilegesButton({ lang = 'en' }: Props) {
  const { isAdmin, activateDevPrivileges } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const isAr = lang === 'ar';
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  if (isAdmin) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = activateDevPrivileges(code);
    if (success) {
      toast.success(isAr ? 'تم تفعيل صلاحيات المطور بنجاح!' : 'Developer privileges activated!');
      setShowModal(false);
      setCode('');
    } else {
      setError(isAr ? 'الرمز غير صحيح. حاول مرة أخرى.' : 'Invalid code. Please try again.');
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setShowModal(true)}
        className="group flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary p-1.5 sm:px-3 sm:py-1.5 rounded-lg hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all duration-300"
        title={isAr ? 'صلاحيات المطور' : 'Developer Privileges'}
      >
        <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-300 group-hover:scale-110" />
        <span className="hidden sm:inline">{isAr ? 'صلاحيات المطور' : 'Dev Access'}</span>
      </button>

      {showModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div
            ref={popupRef}
            className="fixed sm:absolute top-1/2 sm:top-full left-1/2 sm:left-auto -translate-x-1/2 sm:translate-x-0 -translate-y-1/2 sm:translate-y-0 sm:mt-2 sm:right-0 z-50 bg-card border border-border rounded-xl shadow-2xl p-5 sm:p-6 w-[calc(100vw-2rem)] sm:w-80 max-w-80"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold">{isAr ? 'صلاحيات المطور' : 'Developer Privileges'}</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {isAr ? 'أدخل رمز المطور للحصول على صلاحيات الإدارة الكاملة.' : 'Enter the developer code to gain full admin privileges.'}
            </p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <label htmlFor="dev-code" className="sr-only">{isAr ? 'رمز المطور' : 'Developer code'}</label>
              <input
                id="dev-code"
                name="dev-code"
                type="password"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder={isAr ? 'رمز المطور' : 'Developer code'}
                required
                autoFocus
                autoComplete="off"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all"
              >
                {isAr ? 'تفعيل' : 'Activate'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
