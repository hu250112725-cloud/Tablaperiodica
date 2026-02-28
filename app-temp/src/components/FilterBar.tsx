import { useRef } from 'react';
import type { ElementCategory, MatterState } from '../data/elements';
import { categoryColors, categoryLabels } from './theme';

interface FilterBarProps {
  search: string;
  selectedCategory: ElementCategory | 'all';
  selectedState: MatterState | 'all';
  compareMode: boolean;
  onSearchChange: (value: string) => void;
  onCategoryChange: (category: ElementCategory | 'all') => void;
  onStateChange: (state: MatterState | 'all') => void;
  onToggleCompare: () => void;
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
  onSearchChange,
  onCategoryChange,
  onStateChange,
  onToggleCompare,
}: FilterBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const categories = Object.entries(categoryLabels) as Array<[ElementCategory, string]>;

  return (
    <div
      className="sticky top-0 z-40 space-y-2 rounded-2xl border border-white/10 bg-slate-950/85 px-4 py-2.5 backdrop-blur-2xl"
      style={{ boxShadow: '0 4px 32px rgba(0,0,0,0.5)' }}
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
            className="w-full rounded-xl border border-white/10 bg-slate-900/70 py-1.5 pl-8 pr-8 text-slate-100 outline-none transition-all placeholder:text-slate-500 focus:border-cyan-400/60 focus:bg-slate-900 focus:shadow-[0_0_16px_rgba(0,229,255,.18)]"
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
        <div className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-slate-900/50 p-0.5">
          {stateOptions.map((opt) => {
            const active = selectedState === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onStateChange(opt.value)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                  active
                    ? 'bg-cyan-500/25 text-cyan-100 shadow-[inset_0_0_12px_rgba(0,229,255,.12)]'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
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
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold font-orbitron transition-all ${
            compareMode
              ? 'border-fuchsia-400/70 bg-fuchsia-500/20 text-fuchsia-200 shadow-[0_0_18px_rgba(224,64,251,.25)]'
              : 'border-white/10 bg-slate-900/50 text-slate-300 hover:border-fuchsia-400/50 hover:text-fuchsia-200'
          }`}
        >
          {compareMode ? '⊗' : '⊕'} Comparar
          {compareMode && (
            <span className="rounded-full bg-fuchsia-400/30 px-1.5 py-0.5 text-[9px] text-fuchsia-200">ON</span>
          )}
        </button>
      </div>

      {/* ── Row 2: category chips ── */}
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => onCategoryChange('all')}
          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-all ${
            selectedCategory === 'all'
              ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-100 shadow-[0_0_10px_rgba(0,229,255,.2)]'
              : 'border-white/10 bg-slate-900/40 text-slate-400 hover:border-white/25 hover:text-slate-200'
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
              className="flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-all"
              style={{
                borderColor: active ? color : `${color}40`,
                background: active ? `${color}25` : `${color}08`,
                color: active ? '#fff' : `${color}cc`,
                boxShadow: active ? `0 0 12px ${color}50` : 'none',
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
    </div>
  );
}

