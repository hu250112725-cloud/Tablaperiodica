import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import type { ChemicalElement } from '../data/elements';
import { categoryColors, categoryLabels } from './theme';

interface ElementModalProps {
  element: ChemicalElement | null;
  onClose: () => void;
  onAskQuimibot: (element: ChemicalElement) => void;
}

const TABS = ['Propiedades', 'Historia', 'Usos', 'Curiosidades'] as const;
type Tab = (typeof TABS)[number];

function buildShells(n: number): number[] {
  const caps = [2, 8, 18, 32, 32, 18, 8];
  let rem = n;
  const shells: number[] = [];
  for (const cap of caps) {
    if (rem <= 0) break;
    const e = Math.min(rem, cap);
    shells.push(e);
    rem -= e;
  }
  return shells.slice(0, 5);
}

const STATE_ES: Record<string, string> = {
  solid: 'Sólido',
  liquid: 'Líquido',
  gas: 'Gas',
  unknown: 'Desconocido',
};

function BohrModel({ element }: { element: ChemicalElement }) {
  const shells = useMemo(() => buildShells(element.atomicNumber), [element.atomicNumber]);
  const color = categoryColors[element.category];

  const SIZE = 232;
  const maxR = SIZE / 2 - 12;
  const baseR = shells.length <= 2 ? 34 : shells.length <= 3 ? 28 : shells.length <= 4 ? 22 : 17;
  const step = shells.length > 1 ? (maxR - baseR) / (shells.length - 1) : 0;

  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
      {/* Nucleus */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full font-orbitron text-xs font-bold text-white"
        style={{ width: 32, height: 32, background: `radial-gradient(circle, ${color}cc, ${color}55)`, boxShadow: `0 0 18px ${color}aa, 0 0 36px ${color}33` }}
      >
        {element.symbol}
      </div>

      {shells.map((electronCount, shellIdx) => {
        const radius = Math.round(baseR + shellIdx * step);
        const duration = 3.5 + shellIdx * 1.8;
        const perOrbit = Math.min(electronCount, 8);
        return (
          <div key={shellIdx}>
            {/* Orbit ring */}
            <div
              className="absolute left-1/2 top-1/2 rounded-full border border-slate-400/15"
              style={{ width: radius * 2, height: radius * 2, transform: 'translate(-50%,-50%)' }}
            />
            {/* Electrons */}
            {Array.from({ length: perOrbit }).map((_, eIdx) => (
              <motion.div
                key={eIdx}
                className="absolute left-1/2 top-1/2"
                style={{ width: radius * 2, height: radius * 2, marginLeft: -radius, marginTop: -radius }}
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, ease: 'linear', duration, delay: -(duration * eIdx) / perOrbit }}
              >
                <div
                  className="absolute rounded-full"
                  style={{ width: 6, height: 6, top: -3, left: radius - 3, background: '#67e8f9', boxShadow: '0 0 7px #67e8f9, 0 0 14px #0891b2' }}
                />
              </motion.div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function PropBar({ label, value, max, unit, color }: { label: string; value: number; max: number; unit: string; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="font-orbitron" style={{ color }}>{value || '–'}{value ? ` ${unit}` : ''}</span>
      </div>
      <div className="prop-bar-track">
        <motion.div
          className="prop-bar-fill"
          style={{ background: `linear-gradient(to right, ${color}88, ${color})` }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

export function ElementModal({ element, onClose, onAskQuimibot }: ElementModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('Propiedades');
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (element) { setActiveTab('Propiedades'); setImgError(false); }
  }, [element?.atomicNumber]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      {element && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6"
          style={{ background: 'rgba(2,8,24,0.82)', backdropFilter: 'blur(6px)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl glass text-slate-100"
            style={{ border: `1px solid ${categoryColors[element.category]}55`, boxShadow: `0 0 60px ${categoryColors[element.category]}22, 0 30px 80px rgba(0,0,0,.7)`, maxHeight: '92vh' }}
            initial={{ y: 60, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Watermark */}
            <div className="pointer-events-none absolute right-0 top-0 select-none font-orbitron font-black leading-none"
              style={{ fontSize: 180, opacity: 0.04, color: categoryColors[element.category], lineHeight: 1 }}>
              {element.symbol}
            </div>

            <div className="relative overflow-y-auto" style={{ maxHeight: '92vh' }}>
              {/* Header */}
              <div className="relative px-5 pt-5 pb-4"
                style={{ background: `linear-gradient(135deg, ${categoryColors[element.category]}12 0%, transparent 60%)` }}>
                <button type="button" onClick={onClose}
                  className="absolute right-4 top-4 rounded-full border border-slate-600 bg-slate-900/60 px-3 py-1 text-xs text-slate-300 hover:text-white transition">
                  ✕ Cerrar
                </button>
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl border font-orbitron text-3xl font-black"
                    style={{ borderColor: categoryColors[element.category], background: `${categoryColors[element.category]}18`, color: categoryColors[element.category], boxShadow: `0 0 22px ${categoryColors[element.category]}55` }}>
                    {element.atomicNumber}
                  </div>
                  <div>
                    <h2 className="font-orbitron text-2xl font-bold text-white md:text-3xl">{element.name}</h2>
                    <p className="mt-0.5 text-sm text-slate-300">
                      <span className="font-orbitron text-base" style={{ color: categoryColors[element.category] }}>{element.symbol}</span>
                      {' · '}Masa atómica: <strong className="text-white">{element.atomicMass.toFixed(4)}</strong>
                    </p>
                    <span className="mt-1.5 inline-flex rounded-full border px-2.5 py-0.5 text-xs"
                      style={{ borderColor: `${categoryColors[element.category]}60`, color: categoryColors[element.category], background: `${categoryColors[element.category]}18` }}>
                      {categoryLabels[element.category]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="grid gap-4 px-5 pb-5 md:grid-cols-[260px_1fr]">
                {/* Image + Bohr */}
                <div className="flex flex-col gap-3">
                  <div className="overflow-hidden rounded-xl border" style={{ borderColor: `${categoryColors[element.category]}40` }}>
                    <img
                      src={imgError ? `https://images-of-elements.com/s/${element.name.toLowerCase()}.jpg` : element.imageUrl}
                      alt={element.name}
                      onError={() => setImgError(true)}
                      className="h-[160px] w-full object-cover"
                      style={{ background: '#050f23' }}
                    />
                  </div>
                  <div className="rounded-xl border p-3"
                    style={{ borderColor: `${categoryColors[element.category]}30`, background: `${categoryColors[element.category]}08` }}>
                    <p className="mb-2 text-center font-orbitron text-[10px] uppercase tracking-widest text-slate-500">
                      Modelo de Bohr
                    </p>
                    <BohrModel element={element} />
                  </div>
                </div>

                {/* Tabs */}
                <div>
                  <div className="mb-3 flex flex-wrap gap-1">
                    {TABS.map((tab) => (
                      <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                        className="rounded-full border px-3 py-1 text-xs transition-all"
                        style={{
                          borderColor: activeTab === tab ? categoryColors[element.category] : 'rgba(255,255,255,.1)',
                          color: activeTab === tab ? '#fff' : '#94a3b8',
                          background: activeTab === tab ? `${categoryColors[element.category]}28` : 'transparent',
                          boxShadow: activeTab === tab ? `0 0 12px ${categoryColors[element.category]}44` : 'none',
                        }}>
                        {tab}
                      </button>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div key={activeTab}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}>

                      {activeTab === 'Propiedades' && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {([
                              { label: 'Grupo',   value: element.group || '–' },
                              { label: 'Período', value: element.period },
                              { label: 'Estado',  value: STATE_ES[element.state] ?? element.state },
                              { label: 'Electroneg.', value: element.electronegativity || '–' },
                            ] as const).map(({ label, value }) => (
                              <div key={label} className="flex items-center justify-between gap-2 rounded-lg border border-slate-700/50 bg-slate-900/40 px-3 py-1.5">
                                <span className="text-slate-400">{label}</span>
                                <span className="font-orbitron text-xs text-slate-100">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="space-y-3 rounded-xl border border-slate-700/40 bg-slate-900/30 p-3">
                            <PropBar label="Punto de fusión"      value={element.meltingPoint}      max={5800} unit="K" color={categoryColors[element.category]} />
                            <PropBar label="Punto de ebullición"  value={element.boilingPoint}      max={5800} unit="K" color={categoryColors[element.category]} />
                            <PropBar label="Electronegatividad"   value={element.electronegativity} max={4.0}  unit=""  color={categoryColors[element.category]} />
                          </div>
                          <div className="rounded-xl border border-slate-700/40 bg-slate-900/30 px-3 py-2 text-xs text-slate-300">
                            <span className="text-slate-500">Conf. electrónica: </span>
                            <code className="font-mono" style={{ color: categoryColors[element.category] }}>{element.electronConfiguration}</code>
                          </div>
                        </div>
                      )}

                      {activeTab === 'Historia' && (
                        <div className="space-y-3">
                          <div className="flex gap-3">
                            <div className="flex-1 rounded-xl border border-slate-700/40 bg-slate-900/30 p-3 text-sm">
                              <p className="mb-0.5 text-slate-400">Descubierto por</p>
                              <p className="font-semibold text-white">{element.discoveredBy}</p>
                            </div>
                            <div className="w-28 rounded-xl border border-slate-700/40 bg-slate-900/30 p-3 text-center text-sm">
                              <p className="mb-0.5 text-slate-400">Año</p>
                              <p className="font-orbitron text-lg font-bold" style={{ color: categoryColors[element.category] }}>
                                {element.yearDiscovered > 0 ? element.yearDiscovered : '—'}
                              </p>
                            </div>
                          </div>
                          <div className="rounded-xl border border-slate-700/40 bg-slate-900/30 p-3 text-sm leading-relaxed text-slate-300">
                            {element.description}
                          </div>
                        </div>
                      )}

                      {activeTab === 'Usos' && (
                        <ul className="space-y-2">
                          {element.uses.map((use, i) => (
                            <li key={i} className="flex gap-2 rounded-xl border border-slate-700/40 bg-slate-900/30 p-3 text-sm text-slate-300">
                              <span style={{ color: categoryColors[element.category] }} className="flex-shrink-0 font-orbitron">→</span>
                              <span>{use}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {activeTab === 'Curiosidades' && (
                        <div className="space-y-2 text-sm">
                          {[
                            `${element.name} pertenece a la familia de los ${categoryLabels[element.category].toLowerCase()}, en el período ${element.period}.`,
                            `Con número atómico ${element.atomicNumber}, tiene ${element.atomicNumber} protones y generalmente ${element.atomicNumber} electrones en su forma neutra.`,
                            `Su configuración electrónica "${element.electronConfiguration}" determina su reactividad química y sus propiedades de enlace.`,
                            element.electronegativity
                              ? `Con electronegatividad de ${element.electronegativity} (Pauling), ${element.electronegativity > 3 ? 'atrae fuertemente los electrones en los enlaces' : element.electronegativity > 2 ? 'tiene tendencia moderada a atraer electrones' : 'suele ceder electrones en reacciones'}.`
                              : `Su electronegatividad no está bien documentada, común en metales de transición y elementos sintéticos.`,
                          ].map((fact, i) => (
                            <div key={i} className="flex gap-2 rounded-xl border border-slate-700/40 bg-slate-900/30 p-3 text-slate-300">
                              <span className="text-base" style={{ color: categoryColors[element.category] }}>◆</span>
                              <span>{fact}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-slate-700/50 px-5 py-3">
                <button type="button" onClick={() => onAskQuimibot(element)}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border py-2.5 text-sm font-semibold transition-all"
                  style={{ borderColor: categoryColors[element.category], color: categoryColors[element.category], background: `${categoryColors[element.category]}15` }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 24px ${categoryColors[element.category]}55`; e.currentTarget.style.background = `${categoryColors[element.category]}28`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = `${categoryColors[element.category]}15`; }}>
                  <div className="atom-loader" style={{ width: 18, height: 18 }} />
                  Preguntarle a QuimiBot sobre {element.name}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
