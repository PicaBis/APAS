/**
 * Shared utility to strip LaTeX artifacts from AI responses.
 * Converts LaTeX math notation into clean, readable Unicode format
 * that can be displayed clearly without a LaTeX renderer.
 *
 * Used across: PhysicsTutor, ApasSubjectReading, ApasRecommendations,
 *              ApasVisionButton, ApasVideoButton
 */
export function cleanLatex(text: string): string {
  let s = text;

  // Remove display-math and inline-math wrappers: $$...$$ and $...$
  s = s.replace(/\$\$([^$]+)\$\$/g, ' $1 ');
  s = s.replace(/\$([^$]+)\$/g, '$1');

  // Remove \[ ... \] and \( ... \) delimiters
  s = s.replace(/\\\[/g, '');
  s = s.replace(/\\\]/g, '');
  s = s.replace(/\\\(/g, '');
  s = s.replace(/\\\)/g, '');

  // Handle nested \frac first (up to 2 levels deep)
  for (let i = 0; i < 3; i++) {
    s = s.replace(/\\frac\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, '($1) / ($2)');
  }

  // \sqrt[n]{...} → ⁿ√(...)
  s = s.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, '$1√($2)');
  // \sqrt{...} → √(...)
  s = s.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');

  // \vec{X} → X⃗
  s = s.replace(/\\vec\{([^}]+)\}/g, '$1');
  // \overrightarrow{X} → X
  s = s.replace(/\\overrightarrow\{([^}]+)\}/g, '$1');
  // \hat{X} → X
  s = s.replace(/\\hat\{([^}]+)\}/g, '$1');
  // \bar{X} → X
  s = s.replace(/\\bar\{([^}]+)\}/g, '$1');
  // \dot{X} → X  and \ddot{X} → X
  s = s.replace(/\\d?dot\{([^}]+)\}/g, '$1');

  // \text{...} → content
  s = s.replace(/\\text\{([^}]+)\}/g, '$1');
  // \textbf{...} → **content**
  s = s.replace(/\\textbf\{([^}]+)\}/g, '**$1**');
  // \textit{...} → content
  s = s.replace(/\\textit\{([^}]+)\}/g, '$1');
  // \mathrm{...} → content
  s = s.replace(/\\mathrm\{([^}]+)\}/g, '$1');
  // \mathbf{...} → content
  s = s.replace(/\\mathbf\{([^}]+)\}/g, '$1');

  // Operators and symbols
  s = s.replace(/\\cdot/g, '·');
  s = s.replace(/\\times/g, '×');
  s = s.replace(/\\div/g, '÷');
  s = s.replace(/\\pm/g, '±');
  s = s.replace(/\\mp/g, '∓');
  s = s.replace(/\\implies/g, '⇒');
  s = s.replace(/\\Rightarrow/g, '⇒');
  s = s.replace(/\\rightarrow/g, '→');
  s = s.replace(/\\leftarrow/g, '←');
  s = s.replace(/\\Leftrightarrow/g, '⇔');
  s = s.replace(/\\approx/g, '≈');
  s = s.replace(/\\neq/g, '≠');
  s = s.replace(/\\leq/g, '≤');
  s = s.replace(/\\geq/g, '≥');
  s = s.replace(/\\le\b/g, '≤');
  s = s.replace(/\\ge\b/g, '≥');
  s = s.replace(/\\infty/g, '∞');
  s = s.replace(/\\circ/g, '°');
  s = s.replace(/\\degree/g, '°');
  s = s.replace(/\\sum/g, '∑');
  s = s.replace(/\\int/g, '∫');
  s = s.replace(/\\partial/g, '∂');
  s = s.replace(/\\nabla/g, '∇');
  s = s.replace(/\\Delta/g, 'Δ');
  s = s.replace(/\\delta/g, 'δ');

  // Greek letters → Unicode
  s = s.replace(/\\theta/g, 'θ');
  s = s.replace(/\\alpha/g, 'α');
  s = s.replace(/\\beta/g, 'β');
  s = s.replace(/\\gamma/g, 'γ');
  s = s.replace(/\\omega/g, 'ω');
  s = s.replace(/\\mu/g, 'μ');
  s = s.replace(/\\lambda/g, 'λ');
  s = s.replace(/\\sigma/g, 'σ');
  s = s.replace(/\\rho/g, 'ρ');
  s = s.replace(/\\epsilon/g, 'ε');
  s = s.replace(/\\phi/g, 'φ');
  s = s.replace(/\\psi/g, 'ψ');
  s = s.replace(/\\pi/g, 'π');
  s = s.replace(/\\tau/g, 'τ');
  s = s.replace(/\\eta/g, 'η');
  s = s.replace(/\\nu/g, 'ν');
  s = s.replace(/\\Omega/g, 'Ω');
  s = s.replace(/\\Sigma/g, 'Σ');
  s = s.replace(/\\Pi/g, 'Π');

  // Trig and common functions
  s = s.replace(/\\sin/g, 'sin');
  s = s.replace(/\\cos/g, 'cos');
  s = s.replace(/\\tan/g, 'tan');
  s = s.replace(/\\arcsin/g, 'arcsin');
  s = s.replace(/\\arccos/g, 'arccos');
  s = s.replace(/\\arctan/g, 'arctan');
  s = s.replace(/\\log/g, 'log');
  s = s.replace(/\\ln/g, 'ln');
  s = s.replace(/\\exp/g, 'exp');
  s = s.replace(/\\max/g, 'max');
  s = s.replace(/\\min/g, 'min');
  s = s.replace(/\\lim/g, 'lim');

  // Subscript braces: x_{0y} → x₀y, v_{0x} → v₀ₓ
  s = s.replace(/([a-zA-Z0-9])_\{([^}]+)\}/g, (_m, base: string, sub: string) => base + toSubscript(sub));
  // Superscript braces: x^{2} → x²
  s = s.replace(/([a-zA-Z0-9])\^\{([^}]+)\}/g, (_m, base: string, sup: string) => base + toSuperscript(sup));
  // Standalone _{...} and ^{...}
  s = s.replace(/_\{([^}]+)\}/g, (_m, sub: string) => toSubscript(sub));
  s = s.replace(/\^\{([^}]+)\}/g, (_m, sup: string) => toSuperscript(sup));

  // Simple subscript: x_0 x_1 etc (single char)
  s = s.replace(/([a-zA-Z])_([0-9])/g, (_m, base: string, d: string) => base + toSubscript(d));
  // Simple superscript: x^2 x^3 etc (single char)
  s = s.replace(/([a-zA-Z0-9)])\^([0-9])/g, (_m, base: string, d: string) => base + toSuperscript(d));

  // Spacing and formatting commands
  s = s.replace(/\\left/g, '');
  s = s.replace(/\\right/g, '');
  s = s.replace(/\\bigl?/g, '');
  s = s.replace(/\\bigr?/g, '');
  s = s.replace(/\\Bigl?/g, '');
  s = s.replace(/\\Bigr?/g, '');
  s = s.replace(/\\_/g, '_');
  s = s.replace(/\\,/g, ' ');
  s = s.replace(/\\;/g, ' ');
  s = s.replace(/\\!/g, '');
  s = s.replace(/\\quad/g, '  ');
  s = s.replace(/\\qquad/g, '    ');
  s = s.replace(/\\hspace\{[^}]*\}/g, ' ');
  s = s.replace(/\\vspace\{[^}]*\}/g, '');
  s = s.replace(/\\newline/g, '\n');
  s = s.replace(/\\\\/g, '\n');

  // Environment markers
  s = s.replace(/\\begin\{[^}]*\}/g, '');
  s = s.replace(/\\end\{[^}]*\}/g, '');

  // Clean up any remaining backslash commands we missed
  s = s.replace(/\\([a-zA-Z]+)/g, '$1');

  // Convert remaining ASCII patterns to Unicode
  // sqrt(...) → √(...)
  s = s.replace(/\bsqrt\(([^)]+)\)/g, '√($1)');
  // Standalone word "sqrt" followed by a number → √
  s = s.replace(/\bsqrt([0-9])/g, '√$1');

  // Convert spelled-out Greek to Unicode symbols (word boundaries)
  s = s.replace(/\balpha\b/g, 'α');
  s = s.replace(/\bbeta\b/g, 'β');
  s = s.replace(/\bgamma\b/g, 'γ');
  s = s.replace(/\btheta\b/g, 'θ');
  s = s.replace(/\bdelta\b/g, 'δ');
  s = s.replace(/\bDelta\b/g, 'Δ');
  s = s.replace(/\bomega\b/g, 'ω');
  s = s.replace(/\bOmega\b/g, 'Ω');
  s = s.replace(/\bpi\b/g, 'π');
  s = s.replace(/\bsigma\b/g, 'σ');
  s = s.replace(/\bSigma\b/g, 'Σ');
  s = s.replace(/\brho\b/g, 'ρ');
  s = s.replace(/\bmu\b/g, 'μ');
  s = s.replace(/\blambda\b/g, 'λ');
  s = s.replace(/\bepsilon\b/g, 'ε');
  s = s.replace(/\bphi\b/g, 'φ');
  s = s.replace(/\bpsi\b/g, 'ψ');
  s = s.replace(/\btau\b/g, 'τ');
  s = s.replace(/\beta\b/g, 'η');
  s = s.replace(/\bnu\b/g, 'ν');
  s = s.replace(/\bPi\b/g, 'Π');

  // Convert ^number to superscript Unicode (after all LaTeX processing)
  s = s.replace(/\^2/g, '²');
  s = s.replace(/\^3/g, '³');
  s = s.replace(/\^4/g, '⁴');
  s = s.replace(/\^0/g, '⁰');
  s = s.replace(/\^1/g, '¹');
  s = s.replace(/\^5/g, '⁵');
  s = s.replace(/\^6/g, '⁶');
  s = s.replace(/\^7/g, '⁷');
  s = s.replace(/\^8/g, '⁸');
  s = s.replace(/\^9/g, '⁹');
  s = s.replace(/\^n/g, 'ⁿ');
  s = s.replace(/\^\+/g, '⁺');
  s = s.replace(/\^-/g, '⁻');

  // Convert _number to subscript Unicode
  s = s.replace(/_0/g, '₀');
  s = s.replace(/_1/g, '₁');
  s = s.replace(/_2/g, '₂');
  s = s.replace(/_3/g, '₃');
  s = s.replace(/_4/g, '₄');
  s = s.replace(/_5/g, '₅');
  s = s.replace(/_6/g, '₆');
  s = s.replace(/_7/g, '₇');
  s = s.replace(/_8/g, '₈');
  s = s.replace(/_9/g, '₉');
  s = s.replace(/_x/g, 'ₓ');
  s = s.replace(/_y/g, 'y');
  s = s.replace(/_max/g, '_max');
  s = s.replace(/_min/g, '_min');

  // Preserve Unicode symbols that are already correct
  // (don't convert them to ASCII)

  // Clean up excessive whitespace
  s = s.replace(/  +/g, ' ');
  s = s.replace(/\n{3,}/g, '\n\n');

  return s.trim();
}

/* ------------------------------------------------------------------ */
/*  Unicode subscript / superscript helpers                            */
/* ------------------------------------------------------------------ */

const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  'n': 'ⁿ', 'i': 'ⁱ',
};

const SUBSCRIPT_MAP: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
  'a': 'ₐ', 'e': 'ₑ', 'o': 'ₒ', 'x': 'ₓ',
  'h': 'ₕ', 'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ',
  'n': 'ₙ', 'p': 'ₚ', 's': 'ₛ', 't': 'ₜ',
};

function toSuperscript(s: string): string {
  return s.split('').map(c => SUPERSCRIPT_MAP[c] || c).join('');
}

function toSubscript(s: string): string {
  return s.split('').map(c => SUBSCRIPT_MAP[c] || c).join('');
}
