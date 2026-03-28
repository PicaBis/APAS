import React from 'react';

/**
 * Shared ReportRenderer — renders markdown-like report with equation blocks.
 * Used by ApasVisionButton and ApasVideoButton.
 */

function isEquationLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const hasEquals = trimmed.includes('=');
  const hasMathSymbols = /[+\-*/\u221A\u00B2\u00B3\u03B1\u03B2\u03B3\u03B8\u03C0\u0394\u03A9\u2248\u2264\u2265\u00B1\u00D7\u00F7]/.test(trimmed);
  const startsWithMathVar = /^[a-zA-Z][\s_\u2080-\u2089]*[\s(=]/.test(trimmed);
  if (hasEquals && hasMathSymbols) return true;
  if (hasEquals && startsWithMathVar) return true;
  if (/^[xyRHTvVaghmFKE][\s_\u2080-\u2082]*([\s(=])/.test(trimmed)) return true;
  if (trimmed.startsWith('$$') || (trimmed.startsWith('$') && trimmed.endsWith('$') && trimmed.length > 2)) return true;
  return false;
}

export default function ReportRenderer({ text }: { text: string }) {
  // Enhanced renderer to catch mathematical expressions and wrap them in nice cards
  const renderContent = () => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      // Check if line is a LaTeX formula (often starts with $ or contains \ or equations)
      const isFormula = line.trim().startsWith('$') || line.includes('\\') || line.includes('=');
      const isHeader = line.trim().match(/^\d+\./) || line.trim().startsWith('#');

      if (isFormula && !isHeader) {
        return (
          <div key={i} className="my-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm text-center font-mono text-sm overflow-x-auto scrollbar-hide">
            <span className="text-primary/90">{line.replace(/\$/g, '')}</span>
          </div>
        );
      }

      if (isHeader) {
        return <h4 key={i} className="text-sm font-black text-foreground mt-6 mb-3 uppercase tracking-wider">{line}</h4>;
      }

      return <p key={i} className="text-[13px] leading-relaxed text-muted-foreground mb-2">{line}</p>;
    });
  };

  return (
    <div className="report-content animate-in fade-in duration-500">
      {renderContent()}
    </div>
  );
}
