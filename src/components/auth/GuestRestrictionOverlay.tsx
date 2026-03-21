import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  featureName: string;
  lang?: string;
  onClose?: () => void;
}

export default function GuestRestrictionOverlay({ featureName, lang = 'en', onClose }: Props) {
  const navigate = useNavigate();
  const { isGuest, isApproved, isRestricted, user } = useAuth();
  const isAr = lang === 'ar';

  // Guest mode message
  if (isGuest) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-card border border-border rounded-xl shadow-2xl p-6 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
          <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-bold mb-2">
            {isAr ? 'وضع الزائر' : 'Guest Mode'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {isAr
              ? `أنت في وضع الزائر. ميزة "${featureName}" غير متاحة للزوار. سجل حسابك للوصول الكامل.`
              : `You are in guest mode. "${featureName}" is not available for guests. Register to access all features.`
            }
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            {isAr ? 'إنشاء حساب' : 'Register Now'}
          </button>
        </div>
      </div>
    );
  }

  // Registered but not approved
  if (user && !isApproved) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-card border border-border rounded-xl shadow-2xl p-6 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
          <Lock className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold mb-2">
            {isAr ? 'في انتظار الموافقة' : 'Pending Approval'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {isAr
              ? 'يرجى الانتظار حتى يوافق المطور على حسابك لاستخدام هذه الأدوات المقفلة.'
              : 'Please wait for developer approval to use these locked tools.'
            }
          </p>
          {onClose && (
            <button onClick={onClose} className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
              {isAr ? 'إغلاق' : 'Close'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Restricted user
  if (user && isRestricted) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-card border border-border rounded-xl shadow-2xl p-6 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
          <Lock className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold mb-2">
            {isAr ? 'وصول محدود' : 'Access Restricted'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {isAr
              ? 'تم تقييد وصولك إلى هذه الميزة. تواصل مع المسؤول لمزيد من المعلومات.'
              : 'Your access to this feature has been restricted. Contact the administrator for more information.'
            }
          </p>
          {onClose && (
            <button onClick={onClose} className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
              {isAr ? 'إغلاق' : 'Close'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
