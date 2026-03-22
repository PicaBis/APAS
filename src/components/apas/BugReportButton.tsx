import React, { useState } from 'react';
import { Bug } from 'lucide-react';
import AboutModal from './AboutModal';

interface BugReportButtonProps {
  lang: string;
}

const BugReportButton: React.FC<BugReportButtonProps> = ({ lang }) => {
  const [showReport, setShowReport] = useState(false);
  const isAr = lang === 'ar';
  const isFr = lang === 'fr';

  return (
    <>
      <button
        onClick={() => setShowReport(true)}
        className="fixed bottom-4 left-4 z-50 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card/90 backdrop-blur-md shadow-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-foreground/20 transition-all duration-200 group"
        title={isAr ? 'الإبلاغ عن مشكل' : isFr ? 'Signaler un bug' : 'Report a Bug'}
      >
        <Bug className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform duration-200" />
        <span className="hidden sm:inline">{isAr ? 'إبلاغ عن مشكل' : 'Bugs'}</span>
      </button>

      <AboutModal
        open={showReport}
        onClose={() => setShowReport(false)}
        lang={lang}
        defaultTab="report"
      />
    </>
  );
};

export default BugReportButton;
