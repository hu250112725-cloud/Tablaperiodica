import { motion } from 'framer-motion';
import type { ChemicalElement } from '../data/elements';
import { categoryColors } from './theme';

interface ElementCardProps {
  element: ChemicalElement;
  highlighted: boolean;
  dimmed: boolean;
  isCompareSelected: boolean;
  compareMode: boolean;
  trendValue?: number; // normalized 0-1 for trend overlay
  onClick: (element: ChemicalElement) => void;
}

const stateSymbol: Record<string, string> = {
  solid: '■', liquid: '~', gas: '○', unknown: '?',
};

export function ElementCard({
  element,
  highlighted,
  dimmed,
  onClick,
  compareMode,
  isCompareSelected,
  trendValue,
}: ElementCardProps) {
  const color = categoryColors[element.category];
  const isTouchDevice = typeof window !== 'undefined'
    && window.matchMedia('(hover: none), (pointer: coarse)').matches;
  const delay = Math.min(element.atomicNumber * 0.007, 0.5);
  const defaultShadow = highlighted
    ? `0 0 0 2px rgba(165,180,252,0.7), 0 0 14px rgba(129,140,248,0.3)`
    : `0 2px 8px rgba(0,0,0,0.4)`;

  // Compute trend overlay color: cool blue (low) → warm orange (high)
  const trendOverlay = trendValue !== undefined
    ? (() => {
        const t = trendValue; // 0-1
        const r = Math.round(30 + t * 220);
        const g = Math.round(120 - t * 70);
        const b = Math.round(200 - t * 170);
        return `rgba(${r},${g},${b},0.28)`;
      })()
    : null;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: dimmed ? 0.2 : 1, scale: 1 }}
      transition={{ duration: 0.25, delay }}
      whileHover={isTouchDevice ? undefined : { scale: 1.12, zIndex: 50 }}
      className={`element-card relative flex h-full w-full flex-col overflow-hidden rounded-lg p-0 text-left text-slate-100 ${isTouchDevice ? 'element-card-mobile' : ''}`}
      style={{
        background: `rgba(14, 12, 24, 0.9)`,
        border: `1px solid ${color}30`,
        boxShadow: defaultShadow,
      }}
      onMouseEnter={(e) => {
        if (isTouchDevice) return;
        e.currentTarget.style.background = `rgba(20, 18, 34, 0.95)`;
        e.currentTarget.style.boxShadow = `0 4px 24px rgba(0,0,0,.6), 0 0 0 1px ${color}55`;
      }}
      onMouseLeave={(e) => {
        if (isTouchDevice) return;
        e.currentTarget.style.background = `rgba(14, 12, 24, 0.9)`;
        e.currentTarget.style.boxShadow = defaultShadow;
      }}
      onClick={() => onClick(element)}
      type="button"
      aria-label={`Abrir ${element.name}`}
    >
      {/* Trend overlay */}
      {trendOverlay && (
        <div
          className="pointer-events-none absolute inset-0 rounded-lg z-0 transition-colors duration-500"
          style={{ background: trendOverlay }}
        />
      )}

      {/* Top left: atomic number */}
      <div className={`absolute left-[5px] top-[3px] font-orbitron opacity-50 ${isTouchDevice ? 'text-[10px]' : 'text-[9px]'}`}
        style={{ color }}>
        {element.atomicNumber}
      </div>

      {/* Top right: state */}
      <div className={`absolute right-[4px] top-[3px] opacity-30 ${isTouchDevice ? 'text-[10px]' : 'text-[9px]'}`}
        style={{ color }}>
        {stateSymbol[element.state]}
      </div>

      {/* Symbol – main focal point */}
      <div
        className="mt-4 text-center font-orbitron font-medium leading-none"
        style={{
          fontSize: isTouchDevice ? '18px' : 'clamp(14px, 1.45vw, 22px)',
          color,
          letterSpacing: '-0.01em',
        }}
      >
        {element.symbol}
      </div>

      {/* Name */}
      <div className="mt-[2px] truncate px-[3px] text-center text-slate-400/80"
        style={{ fontSize: isTouchDevice ? '9px' : 'clamp(7px, 0.62vw, 10px)', fontWeight: 400 }}>
        {element.name}
      </div>

      {/* Atomic mass */}
      <div className="mb-[3px] text-center opacity-40"
        style={{ fontSize: isTouchDevice ? '8px' : 'clamp(7px, 0.55vw, 9px)', color }}>
        {element.atomicMass.toFixed(element.atomicMass < 100 ? 2 : 1)}
      </div>

      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-[1px]"
        style={{ background: `${color}50` }}
      />

      {/* Highlighted ring */}
      {highlighted && (
        <div className="pointer-events-none absolute inset-0 rounded-lg border border-indigo-300/70" />
      )}

      {/* Compare indicator */}
      {compareMode && (
        <div
          className="absolute bottom-[4px] right-[4px] h-2.5 w-2.5 rounded-full border transition-all"
          style={{
            background: isCompareSelected ? '#67e8f9' : 'transparent',
            borderColor: isCompareSelected ? '#e0f7ff' : '#67e8f960',
            boxShadow: isCompareSelected ? '0 0 6px #67e8f9' : 'none',
          }}
        />
      )}

      {/* Active selected glow */}
      {isCompareSelected && (
        <div
          className="pointer-events-none absolute inset-0 rounded-lg"
          style={{ background: `${color}14`, border: `2px solid ${color}` }}
        />
      )}
    </motion.button>
  );
}
