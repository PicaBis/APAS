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
    // If text contains $ symbols or LaTeX commands, clean them before rendering
    const cleanText = text
      .replace(/\\\w+(\{.*?\})?/g, (match) => {
        // Simple mapping for common LaTeX to plain text
        if (match.includes('\\sin')) return 'sin';
        if (match.includes('\\cos')) return 'cos';
        if (match.includes('\\alpha')) return 'θ';
        if (match.includes('\\theta')) return 'θ';
        if (match.includes('\\sqrt')) return 'sqrt';
        if (match.includes('\\frac{1}{2}')) return '½';
        if (match.includes('\\cdot')) return '·';
        if (match.includes('\\times')) return '·';
        if (match.includes('\\circ')) return '°';
        return match.replace(/\\/g, '');
      })
      .replace(/\$/g, '');

    const sections = cleanText.split(/\n(?=\d+\.)/);
    
    return sections.map((section, sectionIdx) => {
      const lines = section.split('\n');
      const header = lines[0].match(/^\d+\./) ? lines[0] : null;
      const contentLines = header ? lines.slice(1) : lines;

      return (
        <div key={sectionIdx} className="mb-8 last:mb-0">
          {header && (
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                {header.split('.')[0]}
              </div>
              <h4 className="text-sm font-black text-foreground uppercase tracking-wider">
                {header.split('.').slice(1).join('.').trim()}
              </h4>
            </div>
          )}
          
          <div className="space-y-3 pl-2 border-l-2 border-slate-100 dark:border-slate-800 ml-4">
            {contentLines.map((line, i) => {
              if (!line.trim()) return null;

              // Check if line is a formula
              const isFormula = line.trim().startsWith('$') || 
                               line.includes('\\') || 
                               (line.includes('=') && !line.includes(':'));
              
              const isBullet = line.trim().startsWith('-') || line.trim().startsWith('•');

              if (isFormula) {
                return (
                  <div key={i} className="my-4 p-5 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-sm text-center font-mono text-sm overflow-x-auto scrollbar-hide">
                    <span className="text-primary font-bold">{line.replace(/\$/g, '').trim()}</span>
                  </div>
                );
              }

              if (isBullet) {
                return (
                  <div key={i} className="flex gap-3 text-[13px] leading-relaxed text-muted-foreground">
                    <span className="text-primary mt-1.5">•</span>
                    <span>{line.trim().substring(1).trim()}</span>
                  </div>
                );
              }

              return <p key={i} className="text-[13px] leading-relaxed text-muted-foreground">{line.trim()}</p>;
            })}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="report-content animate-in fade-in duration-500 max-w-full overflow-hidden">
      {renderContent()}
    </div>
  );
}
