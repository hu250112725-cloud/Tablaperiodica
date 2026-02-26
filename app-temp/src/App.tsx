import { useMemo, useState } from 'react';
import { ElementModal } from './components/ElementModal';
import { FilterBar } from './components/FilterBar';
import { Particles } from './components/Particles';
import { PeriodicTable } from './components/PeriodicTable';
import { QuimiBot } from './components/QuimiBot';
import { categoryColors } from './components/theme';
import type { ChemicalElement, ElementCategory, MatterState } from './data/elements';
import { elements } from './data/elements';

function App() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ElementCategory | 'all'>('all');
  const [selectedState, setSelectedState] = useState<MatterState | 'all'>('all');
  const [selectedElement, setSelectedElement] = useState<ChemicalElement | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelected, setCompareSelected] = useState<number[]>([]);
  const [quimiBotOpen, setQuimiBotOpen] = useState(false);
  const [quimiBotContext, setQuimiBotContext] = useState<ChemicalElement | null>(null);
  const [quimiBotCompareContext, setQuimiBotCompareContext] = useState<[ChemicalElement, ChemicalElement] | null>(null);

  const filteredElements = useMemo(() => {
    return elements.filter((el) => {
      const q = search.toLowerCase().trim();
      const searchOk =
        !q ||
        el.name.toLowerCase().includes(q) ||
        el.symbol.toLowerCase().includes(q) ||
        String(el.atomicNumber).startsWith(q);
      const categoryOk = selectedCategory === 'all' || el.category === selectedCategory;
      const stateOk = selectedState === 'all' || el.state === selectedState;
      return searchOk && categoryOk && stateOk;
    });
  }, [search, selectedCategory, selectedState]);

  const handleElementClick = (el: ChemicalElement) => {
    if (!compareMode) { setSelectedElement(el); return; }
    setCompareSelected((cur) => {
      if (cur.includes(el.atomicNumber)) return cur.filter((id) => id !== el.atomicNumber);
      if (cur.length >= 2) return [cur[1], el.atomicNumber];
      return [...cur, el.atomicNumber];
    });
  };

  const compareElements = elements.filter((el) => compareSelected.includes(el.atomicNumber));
  const isFiltering = search.trim().length > 0 || selectedCategory !== 'all' || selectedState !== 'all';

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: '#020818' }}>
      <Particles />

      <div className="relative mx-auto w-full max-w-[1500px] px-3 py-4 md:px-6 md:py-6">

        {/* ── Header ──────────────────────────── */}
        <header className="mb-4 overflow-hidden rounded-2xl border border-cyan-400/20 glass">
          <div
            className="relative px-5 py-4 md:px-8 md:py-5"
            style={{ background: 'linear-gradient(135deg, rgba(0,180,255,0.1) 0%, rgba(224,64,251,0.07) 60%, transparent 100%)' }}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-10"
              style={{
                backgroundImage: `linear-gradient(rgba(0,229,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,.4) 1px, transparent 1px)`,
                backgroundSize: '48px 48px',
              }}
            />
            <div className="relative flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="font-orbitron text-2xl font-black leading-tight text-white md:text-3xl"
                  style={{ textShadow: '0 0 18px rgba(0,229,255,.7), 0 0 40px rgba(0,229,255,.35)' }}>
                  Tabla Periódica{' '}
                  <span
                    className="font-orbitron text-xl font-bold md:text-2xl"
                    style={{ background: 'linear-gradient(90deg, #00e5ff, #e040fb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                  >
                    Interactiva
                  </span>
                </h1>
                <p className="mt-1 text-xs text-slate-500">
                  118 elementos · QuimiBot IA
                </p>
              </div>

              {isFiltering && (
                <div className="rounded-xl border px-3 py-1.5 text-center"
                  style={{ borderColor: '#76ff0340', background: '#76ff030f' }}>
                  <div className="font-orbitron text-lg font-bold"
                    style={{ color: '#76ff03', textShadow: '0 0 12px #76ff0388' }}>{filteredElements.length}</div>
                  <div className="font-orbitron text-[8px] uppercase tracking-wider text-slate-400">filtrados</div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Filters ──────────────────────── */}
        <FilterBar
          search={search}
          selectedCategory={selectedCategory}
          selectedState={selectedState}
          compareMode={compareMode}
          onSearchChange={setSearch}
          onCategoryChange={setSelectedCategory}
          onStateChange={setSelectedState}
          onToggleCompare={() => { setCompareMode((p) => !p); setCompareSelected([]); }}
        />

        {/* ── Compare panel ────────────────── */}
        {compareMode && (
          <div className="mt-4 rounded-2xl border border-fuchsia-400/25 glass p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-orbitron text-sm text-fuchsia-200">
                ⊕ Modo Comparar
                <span className="ml-2 font-sans text-xs font-normal text-slate-400">
                  Haz clic en 2 elementos para comparar
                </span>
              </h2>
              {compareSelected.length > 0 && (
                <button type="button" onClick={() => setCompareSelected([])}
                  className="text-xs text-slate-500 hover:text-slate-300">
                  Limpiar
                </button>
              )}
            </div>

            {compareElements.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">
                Selecciona elementos en la tabla haciendo clic sobre ellos
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {compareElements.map((el) => {
                  const color = categoryColors[el.category];
                  return (
                    <div key={el.atomicNumber} className="relative overflow-hidden rounded-xl border p-4"
                      style={{ borderColor: `${color}50`, background: `${color}0a` }}>
                      <div className="pointer-events-none absolute right-2 top-2 font-orbitron text-5xl font-black opacity-10"
                        style={{ color }}>{el.symbol}</div>
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg font-orbitron text-xl font-black"
                          style={{ background: `${color}22`, color, border: `1px solid ${color}60`, boxShadow: `0 0 12px ${color}44` }}>
                          {el.symbol}
                        </div>
                        <div>
                          <p className="font-orbitron text-sm font-bold text-white">{el.name}</p>
                          <p className="text-xs text-slate-400">#{el.atomicNumber}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                        {([
                          { label: 'Grupo / Período',   value: `${el.group || '–'} / ${el.period}` },
                          { label: 'Masa atómica',      value: el.atomicMass.toFixed(3) },
                          { label: 'Electroneg.',       value: el.electronegativity || '–' },
                          { label: 'P. fusión (K)',     value: el.meltingPoint || '–' },
                          { label: 'P. ebullición (K)', value: el.boilingPoint || '–' },
                          { label: 'Estado',            value: ({ solid: 'Sólido', liquid: 'Líquido', gas: 'Gas', unknown: 'Desconocido' } as Record<string,string>)[el.state] ?? el.state },
                        ] as const).map(({ label, value }) => (
                          <div key={label} className="flex flex-col">
                            <span className="text-slate-500">{label}</span>
                            <span className="font-semibold text-slate-200">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {compareElements.length === 2 && (
                  <div className="flex justify-center md:col-span-2">
                    <button type="button"
                      onClick={() => {
                        setQuimiBotContext(null);
                        setQuimiBotCompareContext([compareElements[0], compareElements[1]]);
                        setQuimiBotOpen(true);
                      }}
                      className="rounded-xl border border-fuchsia-400/50 bg-fuchsia-500/10 px-5 py-2 text-sm text-fuchsia-100 transition hover:bg-fuchsia-500/20">
                      ⚗️ Comparar con QuimiBot
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Periodic Table ───────────────── */}
        <section className="mt-4 rounded-2xl border border-cyan-500/10 glass p-3 md:p-5">
          <PeriodicTable
            elements={filteredElements}
            allElements={elements}
            search={search}
            selectedCategory={selectedCategory}
            selectedState={selectedState}
            compareMode={compareMode}
            compareSelected={compareSelected}
            onElementClick={handleElementClick}
          />
        </section>

        <footer className="mt-4 pb-2 text-center font-orbitron text-[10px] uppercase tracking-widest text-slate-700">
          Tabla Periódica Interactiva · QuimiBot IA
        </footer>
      </div>

      {/* ── QuimiBot FAB ──────────────── */}
      <button
        type="button"
        onClick={() => { setQuimiBotContext(null); setQuimiBotOpen(true); }}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-2xl border border-cyan-300/40 bg-cyan-500/15 px-5 py-3 font-orbitron text-sm text-cyan-50 transition-all hover:bg-cyan-500/30"
        style={{ boxShadow: '0 0 30px rgba(0,229,255,.3), 0 8px 32px rgba(0,0,0,.5)' }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 45px rgba(0,229,255,.55), 0 8px 32px rgba(0,0,0,.5)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 30px rgba(0,229,255,.3), 0 8px 32px rgba(0,0,0,.5)'; }}
      >
        <div className="atom-loader" style={{ width: 20, height: 20 }} />
        QuimiBot
      </button>

      {/* ── Modals ────────────────────── */}
      <ElementModal
        element={selectedElement}
        onClose={() => setSelectedElement(null)}
        onAskQuimibot={(el) => { setSelectedElement(null); setQuimiBotContext(el); setQuimiBotOpen(true); }}
      />

      <QuimiBot
        open={quimiBotOpen}
        onClose={() => { setQuimiBotOpen(false); setQuimiBotCompareContext(null); }}
        elementContext={quimiBotContext}
        compareContext={quimiBotCompareContext}
      />
    </div>
  );
}

export default App;
