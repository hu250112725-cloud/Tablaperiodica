import { useMemo, useState } from 'react';
import { ElementModal } from './components/ElementModal';
import { FilterBar } from './components/FilterBar';
import type { TrendKey } from './components/FilterBar';
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
  const [selectedTrend, setSelectedTrend] = useState<TrendKey>('none');

  // Normalize trend values 0–1 across all elements (unknown/zero excluded from range)
  const trendMap = useMemo<Map<number, number> | undefined>(() => {
    if (selectedTrend === 'none') return undefined;
    const values = elements
      .map((el) => el[selectedTrend] as number)
      .filter((v) => v > 0);
    if (!values.length) return undefined;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const map = new Map<number, number>();
    elements.forEach((el) => {
      const v = el[selectedTrend] as number;
      if (v > 0) map.set(el.atomicNumber, (v - min) / range);
    });
    return map;
  }, [selectedTrend]);

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
    <div className="relative min-h-screen overflow-hidden" style={{ background: '#08080f' }}>
      <Particles />

      <div className="relative mx-auto w-full max-w-[1500px] px-3 py-4 md:px-6 md:py-6">

        {/* ── Header ──────────────────────────── */}
        <header className="mb-4 flex flex-wrap items-center justify-between gap-4 px-1 py-3">
          <div>
            <h1 className="font-orbitron text-xl font-medium tracking-tight text-white md:text-2xl">
              Tabla Periódica{' '}
              <span className="font-light text-slate-400">Interactiva</span>
            </h1>
            <p className="mt-0.5 text-xs text-slate-600">118 elementos · QuimiBot IA</p>
          </div>

          {isFiltering && (
            <div className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-1.5 text-center">
              <div className="font-orbitron text-base font-medium text-slate-200">{filteredElements.length}</div>
              <div className="text-[9px] uppercase tracking-widest text-slate-500">filtrados</div>
            </div>
          )}
        </header>

        {/* ── Filters ──────────────────────── */}
        <FilterBar
          search={search}
          selectedCategory={selectedCategory}
          selectedState={selectedState}
          compareMode={compareMode}
          selectedTrend={selectedTrend}
          onSearchChange={setSearch}
          onCategoryChange={setSelectedCategory}
          onStateChange={setSelectedState}
          onToggleCompare={() => { setCompareMode((p) => !p); setCompareSelected([]); }}
          onTrendChange={setSelectedTrend}
        />

        {/* ── Compare panel ────────────────── */}
        {compareMode && (
          <div className="mt-4 rounded-xl border border-white/8 glass p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-slate-300">
                Modo Comparar
                <span className="ml-2 text-xs font-normal text-slate-500">
                  Selecciona 2 elementos
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
                    <div key={el.atomicNumber} className="relative overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
                      <div className="pointer-events-none absolute right-2 top-2 font-orbitron text-5xl font-medium opacity-[0.05]"
                        style={{ color }}>{el.symbol}</div>
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg font-orbitron text-xl font-medium"
                          style={{ background: `${color}10`, color, border: `1px solid ${color}30` }}>
                          {el.symbol}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{el.name}</p>
                          <p className="text-xs text-slate-500">#{el.atomicNumber}</p>
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
                            <span className="text-slate-600">{label}</span>
                            <span className="font-medium text-slate-300">{String(value)}</span>
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
                      className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2 text-sm text-slate-300 transition hover:bg-white/[0.07] hover:text-white">
                      ⚗️ Comparar con QuimiBot
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Periodic Table ───────────────── */}
        <section className="mt-4 rounded-xl border border-white/[0.06] glass p-3 md:p-5">
          <PeriodicTable
            elements={filteredElements}
            allElements={elements}
            search={search}
            selectedCategory={selectedCategory}
            selectedState={selectedState}
            compareMode={compareMode}
            compareSelected={compareSelected}
            trendMap={trendMap}
            onElementClick={handleElementClick}
          />
        </section>

        <footer className="mt-4 pb-2 text-center text-[10px] uppercase tracking-[0.18em] text-slate-700">
          Tabla Periódica Interactiva · QuimiBot IA
        </footer>
      </div>

      {/* ── QuimiBot FAB ──────────────── */}
      <button
        type="button"
        onClick={() => { setQuimiBotContext(null); setQuimiBotOpen(true); }}
        className="fixed right-4 z-40 flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-slate-300 backdrop-blur-xl transition-all hover:bg-white/[0.09] hover:text-white sm:right-6"
        style={{
          bottom: 'max(1.25rem, calc(env(safe-area-inset-bottom) + 0.75rem))',
          boxShadow: '0 8px 32px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,0.05)',
        }}
      >
        <div className="atom-loader" style={{ width: 18, height: 18 }} />
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
