import React, { useState } from 'react';
import { HeartHandshake } from 'lucide-react';
import SupportModal from './SupportModal';

interface SupportButtonProps {
  lang: string;
}

const SupportButton: React.FC<SupportButtonProps> = ({ lang }) => {
  const [open, setOpen] = useState(false);
  const isAr = lang === 'ar';
  const isFr = lang === 'fr';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card/90 backdrop-blur-md shadow-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-foreground/20 transition-all duration-200 group"
        title={isAr ? 'دعم المطور أو الاشتراك' : isFr ? 'Soutenir le développeur' : 'Support the developer'}
      >
        <HeartHandshake className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform duration-200" />
        <span className="hidden sm:inline">{isAr ? 'دعم' : isFr ? 'Soutien' : 'Support'}</span>
      </button>

      <SupportModal open={open} onClose={() => setOpen(false)} lang={lang} />
    </>
  );
};

export default SupportButton;
