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
        className="group flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary px-2 sm:px-3 py-1.5 rounded-lg hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all duration-300"
        title={isAr ? 'صلاحيات المطور' : 'Developer Privileges'}
      >
        <Shield className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
        <span className="hidden sm:inline">{isAr ? 'صلاحيات المطور' : 'Dev Access'}</span>
      </button>

      {showModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div
            ref={popupRef}
            className="absolute top-full mt-2 right-0 z-50 bg-card border border-border rounded-xl shadow-2xl p-6 w-80"
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
