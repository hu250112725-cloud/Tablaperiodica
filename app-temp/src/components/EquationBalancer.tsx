import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState } from 'react';

const EXAMPLES = [
  'H2 + O2 → H2O',
  'Fe + O2 → Fe2O3',
  'C3H8 + O2 → CO2 + H2O',
  'KMnO4 + HCl → MnCl2 + Cl2 + H2O + KCl',
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSendToQuimibot: (text: string) => void;
}

export function EquationBalancer({ open, onClose, onSendToQuimibot }: Props) {
  const [equation, setEquation] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const eq = equation.trim();
    if (!eq) return;
    const prompt = `Balancea la siguiente ecuación química paso a paso, mostrando el método algebraico o por tanteo según conveniencia. Muestra la ecuación balanceada final de forma clara:\n\n${eq}`;
    onSendToQuimibot(prompt);
    onClose();
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
                <h2 className="font-orbitron text-sm font-medium text-slate-200">⚗️ Balanceador de Ecuaciones</h2>
                <p className="text-[11px] text-slate-600 mt-0.5">QuimiBot resuelve el balance paso a paso</p>
              </div>
              <button type="button" onClick={onClose}
                className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-1 text-xs text-slate-400 hover:text-white transition">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Input */}
              <div>
                <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-slate-600">
                  Escribe la ecuación sin balancear
                </label>
                <textarea
                  ref={inputRef}
                  value={equation}
                  onChange={(e) => setEquation(e.target.value)}
                  placeholder="H2 + O2 → H2O"
                  rows={2}
                  className="w-full resize-none rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 py-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-white/20 focus:bg-white/[0.06] transition"
                />
                <p className="mt-1 text-[10px] text-slate-700">
                  Usa → o = para separar reactivos y productos. Ej: KMnO4 + HCl → MnCl2 + Cl2 + H2O
                </p>
              </div>

              {/* Examples */}
              <div>
                <p className="mb-1.5 text-[11px] uppercase tracking-wider text-slate-600">Ejemplos rápidos</p>
                <div className="flex flex-wrap gap-1.5">
                  {EXAMPLES.map((ex) => (
                    <button key={ex} type="button"
                      onClick={() => { setEquation(ex); inputRef.current?.focus(); }}
                      className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[11px] text-slate-400 transition hover:border-white/15 hover:text-slate-200">
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              {/* Send */}
              <button
                type="button"
                disabled={!equation.trim()}
                onClick={handleSend}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-indigo-500/20 border border-indigo-400/30 py-3 text-sm font-medium text-indigo-200 transition hover:bg-indigo-500/30 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <div className="atom-loader" style={{ width: 16, height: 16 }} />
                Balancear con QuimiBot
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
