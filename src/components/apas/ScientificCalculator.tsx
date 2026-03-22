import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Minus } from 'lucide-react';

interface ScientificCalculatorProps {
  open: boolean;
  onClose: () => void;
  lang: string;
}

const ScientificCalculator: React.FC<ScientificCalculatorProps> = ({ open, onClose, lang }) => {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [resetNext, setResetNext] = useState(false);
  const [memory, setMemory] = useState(0);
  const [history, setHistory] = useState('');
  const [isRadians, setIsRadians] = useState(false);
  const [isSecondFn, setIsSecondFn] = useState(false);

  // Dragging state
  const [position, setPosition] = useState({ x: -1, y: -1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // Initialize position to center of screen on first open
  useEffect(() => {
    if (open && position.x === -1) {
      setPosition({
        x: Math.max(50, (window.innerWidth - 340) / 2),
        y: Math.max(50, (window.innerHeight - 500) / 2),
      });
    }
  }, [open, position.x]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragOffset.current.y)),
      });
    };
    const handleUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging]);

  // Touch support for mobile dragging
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const touch = e.touches[0];
    setIsDragging(true);
    dragOffset.current = {
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    };
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;
    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 100, touch.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 50, touch.clientY - dragOffset.current.y)),
      });
    };
    const handleTouchEnd = () => setIsDragging(false);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  const t = (ar: string, en: string) => lang === 'ar' ? ar : en;

  const inputDigit = (digit: string) => {
    if (resetNext) {
      setDisplay(digit);
      setResetNext(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (resetNext) {
      setDisplay('0.');
      setResetNext(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setHistory('');
    setResetNext(false);
  };

  const toggleSign = () => {
    const val = parseFloat(display);
    setDisplay(String(-val));
  };

  const performOperation = (nextOp: string) => {
    const current = parseFloat(display);
    if (previousValue !== null && operation) {
      const result = calculate(previousValue, current, operation);
      setDisplay(formatNumber(result));
      setPreviousValue(result);
      setHistory(`${formatNumber(result)} ${getOpSymbol(nextOp)}`);
    } else {
      setPreviousValue(current);
      setHistory(`${display} ${getOpSymbol(nextOp)}`);
    }
    setOperation(nextOp);
    setResetNext(true);
  };

  const calculate = (a: number, b: number, op: string): number => {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b !== 0 ? a / b : NaN;
      case '^': return Math.pow(a, b);
      case 'mod': return a % b;
      default: return b;
    }
  };

  const getOpSymbol = (op: string): string => {
    switch (op) {
      case '+': return '+';
      case '-': return '−';
      case '*': return '×';
      case '/': return '÷';
      case '^': return '^';
      case 'mod': return 'mod';
      default: return '';
    }
  };

  const equals = () => {
    const current = parseFloat(display);
    if (previousValue !== null && operation) {
      const result = calculate(previousValue, current, operation);
      setHistory(`${formatNumber(previousValue)} ${getOpSymbol(operation)} ${display} =`);
      setDisplay(formatNumber(result));
      setPreviousValue(null);
      setOperation(null);
      setResetNext(true);
    }
  };

  const formatNumber = (n: number): string => {
    if (isNaN(n)) return 'Error';
    if (!isFinite(n)) return '∞';
    if (Math.abs(n) > 1e15 || (Math.abs(n) < 1e-10 && n !== 0)) {
      return n.toExponential(8);
    }
    const str = n.toPrecision(12);
    return parseFloat(str).toString();
  };

  const toAngle = (val: number): number => isRadians ? val : (val * Math.PI) / 180;
  const fromAngle = (val: number): number => isRadians ? val : (val * 180) / Math.PI;

  const scientificFn = (fn: string) => {
    const val = parseFloat(display);
    let result: number;
    switch (fn) {
      case 'sin': result = Math.sin(toAngle(val)); break;
      case 'cos': result = Math.cos(toAngle(val)); break;
      case 'tan': result = Math.tan(toAngle(val)); break;
      case 'asin': result = fromAngle(Math.asin(val)); break;
      case 'acos': result = fromAngle(Math.acos(val)); break;
      case 'atan': result = fromAngle(Math.atan(val)); break;
      case 'ln': result = Math.log(val); break;
      case 'log': result = Math.log10(val); break;
      case 'sqrt': result = Math.sqrt(val); break;
      case 'cbrt': result = Math.cbrt(val); break;
      case 'x2': result = val * val; break;
      case 'x3': result = val * val * val; break;
      case '1/x': result = val !== 0 ? 1 / val : NaN; break;
      case 'abs': result = Math.abs(val); break;
      case 'fact': result = factorial(val); break;
      case 'exp': result = Math.exp(val); break;
      case '10x': result = Math.pow(10, val); break;
      default: result = val;
    }
    setHistory(`${fn}(${display})`);
    setDisplay(formatNumber(result));
    setResetNext(true);
  };

  const factorial = (n: number): number => {
    if (n < 0 || !Number.isInteger(n)) return NaN;
    if (n > 170) return Infinity;
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
  };

  const insertConstant = (constant: string) => {
    switch (constant) {
      case 'pi': setDisplay(String(Math.PI)); break;
      case 'e': setDisplay(String(Math.E)); break;
    }
    setResetNext(true);
  };

  if (!open) return null;

  const btnBase = 'text-xs font-medium py-2 px-1 rounded-lg transition-all duration-150 active:scale-95 select-none';
  const btnNum = `${btnBase} bg-secondary/80 hover:bg-secondary text-foreground border border-border/30`;
  const btnOp = `${btnBase} bg-primary/15 hover:bg-primary/25 text-primary border border-primary/20`;
  const btnFn = `${btnBase} bg-card hover:bg-primary/10 text-muted-foreground hover:text-foreground border border-border/30 text-[10px]`;
  const btnEq = `${btnBase} bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border border-primary/50 shadow-md shadow-primary/20 col-span-2`;

  return (
    <div
      ref={panelRef}
      className="fixed z-[70] select-none"
      style={{
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      <div className="w-[320px] bg-card border border-border rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
        {/* Title bar - draggable */}
        <div
          className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-primary/10 to-transparent border-b border-border/30 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">🔢</span>
            <span className="text-xs font-bold text-foreground">
              {t('آلة حاسبة علمية', 'Scientific Calculator')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setPosition(prev => ({ ...prev, y: Math.min(window.innerHeight - 40, prev.y) }));
              }}
              className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Display */}
        <div className="px-3 py-2 bg-secondary/30">
          <div className="text-[9px] text-muted-foreground h-4 text-right font-mono truncate" dir="ltr">
            {history}
          </div>
          <div className="text-right text-xl font-mono font-bold text-foreground truncate min-h-[32px] leading-8" dir="ltr">
            {display}
          </div>
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRadians(!isRadians)}
                className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium"
              >
                {isRadians ? 'RAD' : 'DEG'}
              </button>
              <button
                onClick={() => setIsSecondFn(!isSecondFn)}
                className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${isSecondFn ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}
              >
                2nd
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => { setMemory(memory + parseFloat(display)); }} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">M+</button>
              <button onClick={() => { setMemory(memory - parseFloat(display)); }} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">M−</button>
              <button onClick={() => { setDisplay(String(memory)); setResetNext(true); }} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">MR</button>
              <button onClick={() => setMemory(0)} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">MC</button>
            </div>
          </div>
        </div>

        {/* Scientific functions */}
        <div className="px-2 pt-2 grid grid-cols-5 gap-1">
          <button className={btnFn} onClick={() => scientificFn(isSecondFn ? 'asin' : 'sin')}>{isSecondFn ? 'sin⁻¹' : 'sin'}</button>
          <button className={btnFn} onClick={() => scientificFn(isSecondFn ? 'acos' : 'cos')}>{isSecondFn ? 'cos⁻¹' : 'cos'}</button>
          <button className={btnFn} onClick={() => scientificFn(isSecondFn ? 'atan' : 'tan')}>{isSecondFn ? 'tan⁻¹' : 'tan'}</button>
          <button className={btnFn} onClick={() => scientificFn(isSecondFn ? 'exp' : 'ln')}>{isSecondFn ? 'eˣ' : 'ln'}</button>
          <button className={btnFn} onClick={() => scientificFn(isSecondFn ? '10x' : 'log')}>{isSecondFn ? '10ˣ' : 'log'}</button>

          <button className={btnFn} onClick={() => scientificFn('x2')}>x²</button>
          <button className={btnFn} onClick={() => scientificFn(isSecondFn ? 'cbrt' : 'x3')}>{isSecondFn ? '∛' : 'x³'}</button>
          <button className={btnFn} onClick={() => scientificFn('sqrt')}>√</button>
          <button className={btnFn} onClick={() => performOperation('^')}>xʸ</button>
          <button className={btnFn} onClick={() => scientificFn('1/x')}>1/x</button>

          <button className={btnFn} onClick={() => insertConstant('pi')}>π</button>
          <button className={btnFn} onClick={() => insertConstant('e')}>e</button>
          <button className={btnFn} onClick={() => scientificFn('abs')}>|x|</button>
          <button className={btnFn} onClick={() => scientificFn('fact')}>n!</button>
          <button className={btnFn} onClick={() => performOperation('mod')}>mod</button>
        </div>

        {/* Main keypad */}
        <div className="p-2 grid grid-cols-4 gap-1">
          <button className={`${btnBase} bg-red-500/15 hover:bg-red-500/25 text-red-500 border border-red-500/20`} onClick={clear}>AC</button>
          <button className={btnOp} onClick={toggleSign}>±</button>
          <button className={btnOp} onClick={() => {
            const val = parseFloat(display);
            setDisplay(formatNumber(val / 100));
            setResetNext(true);
          }}>%</button>
          <button className={btnOp} onClick={() => performOperation('/')}>÷</button>

          <button className={btnNum} onClick={() => inputDigit('7')}>7</button>
          <button className={btnNum} onClick={() => inputDigit('8')}>8</button>
          <button className={btnNum} onClick={() => inputDigit('9')}>9</button>
          <button className={btnOp} onClick={() => performOperation('*')}>×</button>

          <button className={btnNum} onClick={() => inputDigit('4')}>4</button>
          <button className={btnNum} onClick={() => inputDigit('5')}>5</button>
          <button className={btnNum} onClick={() => inputDigit('6')}>6</button>
          <button className={btnOp} onClick={() => performOperation('-')}>−</button>

          <button className={btnNum} onClick={() => inputDigit('1')}>1</button>
          <button className={btnNum} onClick={() => inputDigit('2')}>2</button>
          <button className={btnNum} onClick={() => inputDigit('3')}>3</button>
          <button className={btnOp} onClick={() => performOperation('+')}>+</button>

          <button className={btnNum} onClick={() => inputDigit('0')}>0</button>
          <button className={btnNum} onClick={inputDecimal}>.</button>
          <button className={btnEq} onClick={equals}>=</button>
        </div>
      </div>
    </div>
  );
};

export default ScientificCalculator;
