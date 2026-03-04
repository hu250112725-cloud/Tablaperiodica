import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import type { ChemicalElement } from '../data/elements';
import { elements } from '../data/elements';
import { categoryColors } from './theme';
import type { TrendKey } from './FilterBar';

const TREND_META: Record<Exclude<TrendKey, 'none'>, { label: string; unit: string; icon: string }> = {
  electronegativity: { label: 'Electronegatividad (Pauling)', unit: '', icon: '⚡' },
  meltingPoint:      { label: 'Punto de Fusión', unit: 'K', icon: '🔥' },
  boilingPoint:      { label: 'Punto de Ebullición', unit: 'K', icon: '♨️' },
  atomicMass:        { label: 'Masa Atómica', unit: 'u', icon: '⚖️' },
};

const TREND_KEYS = Object.keys(TREND_META) as Exclude<TrendKey, 'none'>[];

interface Props {
  open: boolean;
  onClose: () => void;
  onElementClick: (el: ChemicalElement) => void;
  initialTrend?: Exclude<TrendKey, 'none'>;
}

function buildBars(key: Exclude<TrendKey, 'none'>) {
  const withValue = elements
    .filter((el) => (el[key] as number) > 0)
    .sort((a, b) => (a[key] as number) - (b[key] as number));
  const max = Math.max(...withValue.map((el) => el[key] as number));
  return { bars: withValue, max };
}

const BAR_HEIGHT = 26;
const LEFT_LABEL_W = 52;
const RIGHT_LABEL_W = 72;
const MAX_BAR_W = 340;

export function TrendChart({ open, onClose, onElementClick, initialTrend = 'electronegativity' }: Props) {
  const [trend, setTrend] = useState<Exclude<TrendKey, 'none'>>(initialTrend);
  const [hovered, setHovered] = useState<number | null>(null);

  const { bars, max } = useMemo(() => buildBars(trend), [trend]);
  const meta = TREND_META[trend];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6"
          style={{ background: 'rgba(2,8,24,0.82)', backdropFilter: 'blur(6px)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-2xl overflow-hidden rounded-2xl text-slate-100"
            style={{ background: 'rgba(12,11,22,0.98)', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 30px 80px rgba(0,0,0,.8)', maxHeight: '90vh' }}
            initial={{ y: 40, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 40, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
              <div>
                <h2 className="font-orbitron text-sm font-medium text-slate-200">📊 Gráficas de Tendencias</h2>
                <p className="text-[11px] text-slate-600 mt-0.5">Haz clic en una barra para ver el elemento</p>
              </div>
              <button type="button" onClick={onClose}
                className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-1 text-xs text-slate-400 hover:text-white transition">
                ✕
              </button>
            </div>

            {/* Trend selector */}
            <div className="flex flex-wrap gap-1.5 border-b border-white/[0.06] px-5 py-3">
              {TREND_KEYS.map((key) => {
                const m = TREND_META[key];
                const active = trend === key;
                return (
                  <button key={key} type="button" onClick={() => setTrend(key)}
                    className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                      active ? 'border-indigo-400/40 bg-indigo-500/15 text-indigo-200' : 'border-white/[0.06] text-slate-500 hover:border-white/15 hover:text-slate-300'
                    }`}>
                    <span>{m.icon}</span><span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Chart */}
            <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: 'calc(90vh - 140px)' }}>
              <p className="mb-3 text-[11px] text-slate-500">
                {meta.icon} <strong className="text-slate-300">{meta.label}</strong>
                {meta.unit && <span> ({meta.unit})</span>}
                <span className="ml-2 text-slate-600">· {bars.length} elementos con datos</span>
              </p>

              <div style={{ position: 'relative' }}>
                {bars.map((el, i) => {
                  const val = el[trend] as number;
                  const pct = val / max;
                  const barW = Math.max(4, Math.round(pct * MAX_BAR_W));
                  const barColor = categoryColors[el.category];
                  const isHov = hovered === el.atomicNumber;

                  return (
                    <motion.div
                      key={el.atomicNumber}
                      className="flex items-center gap-2 mb-0.5 cursor-pointer group"
                      style={{ height: BAR_HEIGHT }}
                      onMouseEnter={() => setHovered(el.atomicNumber)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => { onElementClick(el); onClose(); }}
                      title={`${el.name}: ${val}${meta.unit ? ' ' + meta.unit : ''}`}
                    >
                      {/* Element label */}
                      <div className="flex-shrink-0 text-right" style={{ width: LEFT_LABEL_W }}>
                        <span className="font-orbitron text-[10px]" style={{ color: isHov ? '#e2e8f0' : barColor, opacity: isHov ? 1 : 0.7 }}>
                          {el.symbol}
                        </span>
                        <span className="text-[9px] text-slate-600 ml-1">{el.atomicNumber}</span>
                      </div>

                      {/* Bar */}
                      <div className="flex-1 relative" style={{ height: 14 }}>
                        <div className="absolute inset-y-0 left-0 rounded-r-sm" style={{ width: '100%', background: 'rgba(255,255,255,0.03)', borderRadius: 3 }} />
                        <motion.div
                          className="absolute inset-y-0 left-0 rounded-r-sm"
                          style={{ background: `linear-gradient(to right, ${barColor}55, ${barColor})`, boxShadow: isHov ? `0 0 8px ${barColor}88` : 'none', borderRadius: 3 }}
                          initial={{ width: 0 }}
                          animate={{ width: barW }}
                          transition={{ duration: 0.5, delay: i * 0.002, ease: 'easeOut' }}
                        />
                      </div>

                      {/* Value */}
                      <div className="flex-shrink-0 text-right" style={{ width: RIGHT_LABEL_W }}>
                        <span className="font-orbitron text-[10px] text-slate-400">
                          {val}{meta.unit ? ` ${meta.unit}` : ''}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
