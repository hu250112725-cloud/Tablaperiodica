import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { elements } from '../data/elements';
import { categoryColors } from './theme';

// Build a fast symbol→{mass,color} lookup
const symbolMap = new Map(
  elements.map((el) => [el.symbol, { mass: el.atomicMass, color: categoryColors[el.category], name: el.name }]),
);

type ParseResult =
  | { ok: false; error: string }
  | { ok: true; counts: Record<string, number> };

function parseFormula(formula: string): ParseResult {
  const tokenize = (f: string, mult: number, acc: Record<string, number>) => {
    const re = /([A-Z][a-z]?)(\d*)|(\()|(\))(\d*)/g;
    const stack: Record<string, number>[] = [acc];
    let m: RegExpExecArray | null;
    while ((m = re.exec(f)) !== null) {
      const [, sym, num, open, , closeNum] = m;
      if (open) {
        stack.push({});
      } else if (closeNum !== undefined && !open) {
        const top = stack.pop();
        if (!top) return false;
        const n = parseInt(closeNum || '1', 10);
        for (const [k, v] of Object.entries(top)) {
          stack[stack.length - 1][k] = (stack[stack.length - 1][k] ?? 0) + v * n;
        }
      } else if (sym) {
        if (!symbolMap.has(sym)) return false;
        const n = parseInt(num || '1', 10);
        stack[stack.length - 1][sym] = (stack[stack.length - 1][sym] ?? 0) + n * mult;
      }
    }
    return stack.length === 1;
  };

  if (!formula.trim()) return { ok: false, error: '' };
  const rawFormula = formula.replace(/\s+/g, '');
  if (!/^[A-Za-z0-9()]+$/.test(rawFormula)) return { ok: false, error: 'Caracteres no válidos' };

  const acc: Record<string, number> = {};
  const ok = tokenize(rawFormula, 1, acc);
  if (!ok || Object.keys(acc).length === 0) return { ok: false, error: 'Fórmula no reconocida' };
  return { ok: true, counts: acc };
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MolarMassCalc({ open, onClose }: Props) {
  const [formula, setFormula] = useState('');
  const [history, setHistory] = useState<Array<{ formula: string; mass: number }>>([]);

  const result = useMemo(() => parseFormula(formula), [formula]);

  const totalMass = useMemo(() => {
    if (!result.ok) return 0;
    return Object.entries(result.counts).reduce((sum, [sym, n]) => {
      return sum + (symbolMap.get(sym)?.mass ?? 0) * n;
    }, 0);
  }, [result]);

  const handleSave = () => {
    if (!result.ok || totalMass === 0) return;
    setHistory((prev) => [{ formula, mass: totalMass }, ...prev].slice(0, 8));
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(2,8,24,0.78)', backdropFilter: 'blur(6px)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md overflow-hidden rounded-2xl text-slate-100"
            style={{ background: 'rgba(12,11,22,0.98)', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 30px 80px rgba(0,0,0,.8)' }}
            initial={{ y: 40, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 40, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 240, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
              <div>
                <h2 className="font-orbitron text-sm font-medium text-slate-200">🧮 Calculadora de Masa Molar</h2>
                <p className="text-[11px] text-slate-600 mt-0.5">Escribe una fórmula química · ej: H₂SO₄, Ca(OH)₂</p>
              </div>
              <button type="button" onClick={onClose}
                className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-1 text-xs text-slate-400 hover:text-white transition">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Input */}
              <div className="relative">
                <input
                  type="text"
                  value={formula}
                  onChange={(e) => setFormula(e.target.value)}
                  placeholder="H2SO4, Ca(OH)2, C6H12O6…"
                  className="w-full rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 py-3 font-orbitron text-base text-slate-200 outline-none placeholder:font-sans placeholder:text-slate-600 focus:border-white/20 focus:bg-white/[0.06] transition"
                  spellCheck={false}
                  autoComplete="off"
                />
                {formula && (
                  <button type="button" onClick={() => setFormula('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition text-xs">
                    ✕
                  </button>
                )}
              </div>

              {/* Result */}
              {result.ok && totalMass > 0 ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4 space-y-3"
                >
                  {/* Breakdown */}
                  <div className="space-y-1.5">
                    {Object.entries(result.counts).map(([sym, n]) => {
                      const info = symbolMap.get(sym);
                      if (!info) return null;
                      const contrib = info.mass * n;
                      return (
                        <div key={sym} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="w-6 text-center rounded font-orbitron text-xs font-bold"
                              style={{ color: info.color }}>{sym}</span>
                            <span className="text-slate-500">{info.name}</span>
                            {n > 1 && <span className="text-slate-600 text-xs">× {n}</span>}
                          </div>
                          <span className="font-orbitron text-xs text-slate-300">
                            {n > 1 ? `${info.mass.toFixed(4)} × ${n} = ` : ''}{contrib.toFixed(4)} g/mol
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Total */}
                  <div className="flex items-center justify-between rounded-lg border border-indigo-400/20 bg-indigo-500/10 px-3 py-2">
                    <span className="text-sm font-medium text-indigo-200">Masa molar total</span>
                    <span className="font-orbitron text-lg font-bold text-indigo-300">{totalMass.toFixed(4)} g/mol</span>
                  </div>

                  <button type="button" onClick={handleSave}
                    className="w-full rounded-lg border border-white/[0.07] bg-white/[0.04] py-1.5 text-xs text-slate-500 hover:text-slate-300 transition">
                    Guardar en historial
                  </button>
                </motion.div>
              ) : formula && !result.ok && result.error ? (
                <p className="text-center text-xs text-red-400">{result.error}</p>
              ) : null}

              {/* History */}
              {history.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] uppercase tracking-wider text-slate-600">Historial</p>
                  <div className="space-y-1">
                    {history.map((h, i) => (
                      <button key={i} type="button"
                        onClick={() => setFormula(h.formula)}
                        className="flex w-full items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-1.5 text-xs transition hover:bg-white/[0.05]">
                        <span className="font-orbitron text-slate-300">{h.formula}</span>
                        <span className="text-slate-500">{h.mass.toFixed(4)} g/mol</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
