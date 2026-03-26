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
  const lines = text.split('\n');
  const blocks: { type: 'text' | 'equation' | 'heading' | 'json'; content: string }[] = [];
  let currentText: string[] = [];
  let inJson = false;
  let jsonLines: string[] = [];

  const flushText = () => {
    if (currentText.length > 0) {
      blocks.push({ type: 'text', content: currentText.join('\n') });
      currentText = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '```json' || trimmed === '```') {
      if (inJson) {
        flushText();
        blocks.push({ type: 'json', content: jsonLines.join('\n') });
        jsonLines = [];
        inJson = false;
      } else if (trimmed === '```json') {
        flushText();
        inJson = true;
      }
      continue;
    }
    if (inJson) { jsonLines.push(line); continue; }
    if (/^[|\s\-:]+$/.test(trimmed) && trimmed.includes('-')) continue;
    if (trimmed.startsWith('#')) {
      flushText();
      blocks.push({ type: 'heading', content: trimmed });
    } else if (trimmed.startsWith('|')) {
      const cells = trimmed.split('|').map(c => c.trim()).filter(c => c.length > 0);
      if (cells.length > 0) currentText.push(cells.join(' : '));
    } else if (isEquationLine(line)) {
      flushText();
      blocks.push({ type: 'equation', content: trimmed });
    } else {
      currentText.push(line);
    }
  }
  flushText();

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {blocks.map((block, i) => {
        if (block.type === 'heading') {
          const level = block.content.match(/^#+/)?.[0].length || 1;
          const text = block.content.replace(/^#+\s*/, '');
          if (level === 1) return <h2 key={i} className="text-lg font-bold text-primary mt-4 mb-2">{text}</h2>;
          if (level === 2) return <h3 key={i} className="text-base font-semibold text-foreground mt-3 mb-1.5">{text}</h3>;
          return <h4 key={i} className="text-sm font-semibold text-foreground mt-2 mb-1">{text}</h4>;
        }
        if (block.type === 'equation') {
          return (
            <div key={i} className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 font-mono text-xs text-primary">
              {block.content}
            </div>
          );
        }
        if (block.type === 'json') {
          return (
            <details key={i} className="group">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                JSON Data
              </summary>
              <pre className="mt-1 bg-muted/50 rounded-lg p-2 text-xs overflow-x-auto max-h-40">{block.content}</pre>
            </details>
          );
        }
        return (
          <div key={i} className="text-muted-foreground whitespace-pre-wrap">
            {block.content.split('\n').map((line, j) => {
              const t = line.trim();
              if (t.startsWith('**') && t.endsWith('**')) return <p key={j} className="font-semibold text-foreground">{t.slice(2, -2)}</p>;
              if (t.startsWith('- ') || t.startsWith('* ')) return <p key={j} className="pl-3">{'\u2022'} {t.slice(2)}</p>;
              if (!t) return <br key={j} />;
              return <p key={j}>{line}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}
