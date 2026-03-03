import { useRef } from 'react';
import type { ElementCategory, MatterState } from '../data/elements';
import { categoryColors, categoryLabels } from './theme';

export type TrendKey = 'none' | 'electronegativity' | 'meltingPoint' | 'boilingPoint' | 'atomicMass';

const TREND_OPTIONS: Array<{ value: TrendKey; label: string; icon: string }> = [
  { value: 'none',             label: 'Sin tendencia',     icon: '—' },
  { value: 'electronegativity',label: 'Electronegatividad',icon: '⚡' },
  { value: 'meltingPoint',     label: 'P. Fusión',         icon: '🔥' },
  { value: 'boilingPoint',     label: 'P. Ebullición',     icon: '♨️' },
  { value: 'atomicMass',       label: 'Masa atómica',      icon: '⚖️' },
];

interface FilterBarProps {
  search: string;
  selectedCategory: ElementCategory | 'all';
  selectedState: MatterState | 'all';
  compareMode: boolean;
  selectedTrend: TrendKey;
  onSearchChange: (value: string) => void;
  onCategoryChange: (category: ElementCategory | 'all') => void;
  onStateChange: (state: MatterState | 'all') => void;
  onToggleCompare: () => void;
  onTrendChange: (trend: TrendKey) => void;
}

const stateOptions: Array<{ value: MatterState | 'all'; label: string; icon: string }> = [
  { value: 'all',     label: 'Todos',   icon: '◈' },
  { value: 'solid',   label: 'Sólido',  icon: '■' },
  { value: 'liquid',  label: 'Líquido', icon: '~' },
  { value: 'gas',     label: 'Gas',     icon: '○' },
  { value: 'unknown', label: '?',       icon: '?' },
];

export function FilterBar({
  search,
  selectedCategory,
  selectedState,
  compareMode,
  selectedTrend,
  onSearchChange,
  onCategoryChange,
  onStateChange,
  onToggleCompare,
  onTrendChange,
}: FilterBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const categories = Object.entries(categoryLabels) as Array<[ElementCategory, string]>;

  return (
    <div
      className="sticky top-0 z-40 space-y-2.5 rounded-xl border border-white/[0.07] bg-[rgba(10,9,20,0.85)] px-4 py-3 backdrop-blur-2xl"
      style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.45)' }}
    >
      {/* ── Row 1: search · states · compare ── */}
      <div className="flex flex-wrap items-center gap-2">

        {/* Search */}
        <div className="relative flex-1" style={{ minWidth: 180 }}>
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-cyan-400/50"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar elemento…"
            className="w-full rounded-lg border border-white/[0.07] bg-white/[0.04] py-2 pl-8 pr-8 text-slate-200 outline-none transition-all placeholder:text-slate-600 focus:border-white/20 focus:bg-white/[0.06]"
            style={{ fontSize: 16 }}
          />
          {search && (
            <button
              type="button"
              onClick={() => { onSearchChange(''); inputRef.current?.focus(); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* State pills */}
        <div className="flex items-center gap-0.5 rounded-lg border border-white/[0.07] bg-white/[0.03] p-0.5">
          {stateOptions.map((opt) => {
            const active = selectedState === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onStateChange(opt.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? 'bg-white/10 text-slate-100'
                    : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-300'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Compare */}
        <button
          type="button"
          onClick={onToggleCompare}
          className={`flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${`
            compareMode
              ? 'border-white/20 bg-white/10 text-slate-100'
              : 'border-white/[0.07] bg-white/[0.03] text-slate-400 hover:border-white/15 hover:text-slate-200'
          }`}
        >
          {compareMode ? '⊗' : '⊕'} Comparar
          {compareMode && (
            <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] text-slate-300">ON</span>
          )}
        </button>
      </div>

      {/* ── Row 2: category chips ── */}
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => onCategoryChange('all')}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
            selectedCategory === 'all'
              ? 'border-white/20 bg-white/10 text-slate-100'
              : 'border-white/[0.06] bg-transparent text-slate-500 hover:border-white/15 hover:text-slate-300'
          }`}
        >
          Todas
        </button>

        {categories.map(([key, label]) => {
          const color = categoryColors[key];
          const active = selectedCategory === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onCategoryChange(active ? 'all' : key)}
              className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all"
              style={{
                borderColor: active ? `${color}55` : `${color}22`,
                background: active ? `${color}15` : 'transparent',
                color: active ? '#e2e8f0' : `${color}90`,
              }}
            >
              <span
                className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                style={{ background: color, boxShadow: active ? `0 0 6px ${color}` : 'none' }}
              />
              {label}
            </button>
          );
        })}
      </div>
      {/* ── Row 3: trend selector ── */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5 border-t border-white/[0.04]">
        <span className="text-[10px] uppercase tracking-wider text-slate-600 mr-1">Tendencia</span>
        {TREND_OPTIONS.map((opt) => {
          const active = selectedTrend === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onTrendChange(opt.value)}
              className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                active
                  ? 'border-indigo-400/40 bg-indigo-500/15 text-indigo-200'
                  : 'border-white/[0.06] bg-transparent text-slate-500 hover:border-white/15 hover:text-slate-300'
              }`}
            >
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
