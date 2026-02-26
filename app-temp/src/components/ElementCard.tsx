import { motion } from 'framer-motion';
import type { ChemicalElement } from '../data/elements';
import { categoryColors } from './theme';

interface ElementCardProps {
  element: ChemicalElement;
  highlighted: boolean;
  dimmed: boolean;
  isCompareSelected: boolean;
  compareMode: boolean;
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
}: ElementCardProps) {
  const color = categoryColors[element.category];
  // Cascade delay capped at 0.45 s
  const delay = Math.min(element.atomicNumber * 0.006, 0.45);

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: dimmed ? 0.25 : 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ scale: 1.18, zIndex: 50 }}
      className="element-card relative flex h-full w-full flex-col overflow-hidden rounded-lg p-0 text-left text-slate-100"
      style={{
        background: `linear-gradient(145deg, rgba(5,15,35,0.92) 0%, ${color}18 100%)`,
        border: `1px solid ${color}70`,
        boxShadow: highlighted
          ? `0 0 0 2px #67e8f9, 0 0 20px ${color}88`
          : `0 0 8px ${color}30`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 0 28px ${color}cc, inset 0 0 22px ${color}22, 0 0 0 1px ${color}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = highlighted
          ? `0 0 0 2px #67e8f9, 0 0 20px ${color}88`
          : `0 0 8px ${color}30`;
      }}
      onClick={() => onClick(element)}
      type="button"
      aria-label={`Abrir ${element.name}`}
    >
      {/* Top left: atomic number */}
      <div className="absolute left-[5px] top-[3px] font-orbitron text-[9px] opacity-70"
        style={{ color }}>
        {element.atomicNumber}
      </div>

      {/* Top right: state */}
      <div className="absolute right-[4px] top-[3px] text-[9px] opacity-50"
        style={{ color }}>
        {stateSymbol[element.state]}
      </div>

      {/* Symbol – main focal point */}
      <div
        className="mt-4 text-center font-orbitron font-bold leading-none"
        style={{
          fontSize: 'clamp(14px, 1.45vw, 22px)',
          color,
          textShadow: `0 0 14px ${color}cc`,
        }}
      >
        {element.symbol}
      </div>

      {/* Name */}
      <div className="mt-[2px] truncate px-[3px] text-center text-[9px] text-slate-200/90"
        style={{ fontSize: 'clamp(7px, 0.62vw, 10px)' }}>
        {element.name}
      </div>

      {/* Atomic mass */}
      <div className="mb-[3px] text-center opacity-55"
        style={{ fontSize: 'clamp(7px, 0.55vw, 9px)', color }}>
        {element.atomicMass.toFixed(element.atomicMass < 100 ? 2 : 1)}
      </div>

      {/* Highlighted ring */}
      {highlighted && (
        <div className="pointer-events-none absolute inset-0 rounded-lg border-2 border-cyan-300/90" />
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
