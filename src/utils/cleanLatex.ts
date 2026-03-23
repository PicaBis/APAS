/**
 * Shared utility to strip LaTeX artifacts from AI responses.
 * Converts LaTeX math notation into simple, readable ASCII format
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

  // \sqrt[n]{...} → root_n(...)
  s = s.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, 'root_$1($2)');
  // \sqrt{...} → sqrt(...)
  s = s.replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)');

  // \vec{X} → X
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
  s = s.replace(/\\cdot/g, '*');
  s = s.replace(/\\times/g, '*');
  s = s.replace(/\\div/g, '/');
  s = s.replace(/\\pm/g, '+/-');
  s = s.replace(/\\mp/g, '-/+');
  s = s.replace(/\\implies/g, '=>');
  s = s.replace(/\\Rightarrow/g, '=>');
  s = s.replace(/\\rightarrow/g, '->');
  s = s.replace(/\\leftarrow/g, '<-');
  s = s.replace(/\\Leftrightarrow/g, '<=>');
  s = s.replace(/\\approx/g, '≈');
  s = s.replace(/\\neq/g, '!=');
  s = s.replace(/\\leq/g, '<=');
  s = s.replace(/\\geq/g, '>=');
  s = s.replace(/\\le\b/g, '<=');
  s = s.replace(/\\ge\b/g, '>=');
  s = s.replace(/\\infty/g, 'infinity');
  s = s.replace(/\\circ/g, '°');
  s = s.replace(/\\degree/g, '°');
  s = s.replace(/\\sum/g, 'sum');
  s = s.replace(/\\int/g, 'integral');
  s = s.replace(/\\partial/g, 'd');
  s = s.replace(/\\nabla/g, 'nabla');
  s = s.replace(/\\Delta/g, 'delta');
  s = s.replace(/\\delta/g, 'delta');

  // Greek letters
  s = s.replace(/\\theta/g, 'theta');
  s = s.replace(/\\alpha/g, 'alpha');
  s = s.replace(/\\beta/g, 'beta');
  s = s.replace(/\\gamma/g, 'gamma');
  s = s.replace(/\\omega/g, 'omega');
  s = s.replace(/\\mu/g, 'mu');
  s = s.replace(/\\lambda/g, 'lambda');
  s = s.replace(/\\sigma/g, 'sigma');
  s = s.replace(/\\rho/g, 'rho');
  s = s.replace(/\\epsilon/g, 'epsilon');
  s = s.replace(/\\phi/g, 'phi');
  s = s.replace(/\\psi/g, 'psi');
  s = s.replace(/\\pi/g, 'pi');
  s = s.replace(/\\tau/g, 'tau');
  s = s.replace(/\\eta/g, 'eta');
  s = s.replace(/\\nu/g, 'nu');
  s = s.replace(/\\Omega/g, 'Omega');
  s = s.replace(/\\Sigma/g, 'Sigma');
  s = s.replace(/\\Pi/g, 'Pi');

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

  // Subscript and superscript braces: x_{0} → x_0, x^{2} → x^2
  s = s.replace(/([a-zA-Z0-9])_\{([^}]+)\}/g, '$1_$2');
  s = s.replace(/([a-zA-Z0-9])\^\{([^}]+)\}/g, '$1^$2');
  // Standalone _{...} and ^{...}
  s = s.replace(/_\{([^}]+)\}/g, '_$1');
  s = s.replace(/\^\{([^}]+)\}/g, '^$1');

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

  // Replace Unicode math symbols with ASCII equivalents
  s = s.replace(/·/g, '*');
  s = s.replace(/×/g, '*');
  s = s.replace(/÷/g, '/');
  s = s.replace(/θ/g, 'theta');
  s = s.replace(/α/g, 'alpha');
  s = s.replace(/β/g, 'beta');
  s = s.replace(/γ/g, 'gamma');
  s = s.replace(/π/g, 'pi');
  s = s.replace(/ω/g, 'omega');
  s = s.replace(/μ/g, 'mu');
  s = s.replace(/λ/g, 'lambda');
  s = s.replace(/ρ/g, 'rho');
  s = s.replace(/σ/g, 'sigma');
  s = s.replace(/Δ/g, 'delta');
  s = s.replace(/²/g, '^2');
  s = s.replace(/³/g, '^3');
  s = s.replace(/⁴/g, '^4');
  s = s.replace(/₀/g, '0');
  s = s.replace(/₁/g, '1');
  s = s.replace(/₂/g, '2');
  s = s.replace(/₃/g, '3');
  s = s.replace(/ₓ/g, 'x');
  s = s.replace(/ᵧ/g, 'y');
  s = s.replace(/∞/g, 'infinity');
  s = s.replace(/≈/g, '~=');
  s = s.replace(/≠/g, '!=');
  s = s.replace(/≤/g, '<=');
  s = s.replace(/≥/g, '>=');
  s = s.replace(/→/g, '->');
  s = s.replace(/⇒/g, '=>');
  s = s.replace(/±/g, '+/-');

  // Clean up any remaining backslash commands we missed
  s = s.replace(/\\([a-zA-Z]+)/g, '$1');

  // Clean up excessive whitespace
  s = s.replace(/  +/g, ' ');
  s = s.replace(/\n{3,}/g, '\n\n');

  return s.trim();
}
