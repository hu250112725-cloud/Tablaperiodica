import type { ChemicalElement } from '../data/elements';
import { categoryColors, categoryLabels } from './theme';
import { ElementCard } from './ElementCard';

interface PeriodicTableProps {
  elements: ChemicalElement[];
  allElements: ChemicalElement[];
  search: string;
  selectedCategory: string;
  selectedState: string;
  compareMode: boolean;
  compareSelected: number[];
  onElementClick: (element: ChemicalElement) => void;
}

// Returns [col, row] in the visual 18-column grid (1-indexed)
function getGridPos(el: ChemicalElement): [number, number] {
  const n = el.atomicNumber;
  // Lanthanides: La(57)→col3..Lu(71)→col17, row 9
  if (n >= 57 && n <= 71) return [n - 54, 9];
  // Actinides:  Ac(89)→col3..Lr(103)→col17, row 10
  if (n >= 89 && n <= 103) return [n - 86, 10];
  return [el.group || 1, el.period];
}

const GROUPS = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18];
const PERIODS = [1,2,3,4,5,6,7];

export function PeriodicTable({
  elements,
  allElements,
  search,
  selectedCategory,
  selectedState,
  compareMode,
  compareSelected,
  onElementClick,
}: PeriodicTableProps) {
  const query = search.toLowerCase().trim();
  const isSearching = query.length > 0;
  const isCategoryFiltering = selectedCategory !== 'all';
  const isStateFiltering = selectedState !== 'all';
  const isFiltering = isSearching || isCategoryFiltering || isStateFiltering;

  // Build lookup: atomicNumber → isVisible
  const visibleNums = new Set(elements.map((e) => e.atomicNumber));

  return (
    <div className="overflow-x-auto">
      <div className="relative" style={{ minWidth: 1310, padding: '10px 10px 16px' }}>

        {/* ── Group numbers header ── */}
        <div className="mb-1 grid" style={{ gridTemplateColumns: 'repeat(18, 72px)', gap: '2px' }}>
          {GROUPS.map((g) => (
            <div key={g} className="text-center font-orbitron text-[9px] text-cyan-200/30 py-1">
              {g}
            </div>
          ))}
        </div>

        {/* ── Main grid: 18 cols × 10 rows (7 main + gap + 2 f-block) ── */}
        <div
          style={{
            display: 'grid',
            position: 'relative',
            overflow: 'visible',
            gridTemplateColumns: 'repeat(18, 72px)',
            gridTemplateRows: 'repeat(7, 78px) 28px repeat(2, 78px)',
            gap: '2px',
          }}
        >
          {/* Period number labels (rows 1-7) */}
          {PERIODS.map((p) => (
            <div
              key={`period-${p}`}
              className="pointer-events-none flex items-center font-orbitron text-[9px] text-cyan-200/30"
              style={{ gridColumn: 1, gridRow: p, paddingLeft: 2 }}
            >
              {p}
            </div>
          ))}

          {/* f-block separator label (row 8) */}
          <div
            className="pointer-events-none flex items-center"
            style={{ gridColumn: '3 / span 16', gridRow: 8 }}
          >
            <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-300/25 to-transparent" />
          </div>
          <div
            className="pointer-events-none flex items-center justify-start gap-3"
            style={{ gridColumn: '3 / span 2', gridRow: 8 }}
          >
            <span className="rounded border border-[#ff6e40]/40 px-1.5 py-0.5 font-orbitron text-[8px] text-[#ff6e40]/60">
              La–Lu
            </span>
          </div>
          <div
            className="pointer-events-none flex items-center"
            style={{ gridColumn: '5 / span 2', gridRow: 8 }}
          >
            <span className="rounded border border-[#ff1744]/40 px-1.5 py-0.5 font-orbitron text-[8px] text-[#ff1744]/60">
              Ac–Lr
            </span>
          </div>

          {/* La* and Ac* placeholders in main table at period 6/7, group 3 */}
          {[{ row: 6, label: '57–71', color: '#ff6e40' }, { row: 7, label: '89–103', color: '#ff1744' }].map(
            ({ row, label, color }) => (
              <div
                key={`fblock-placeholder-${row}`}
                className="flex items-center justify-center rounded-lg border"
                style={{
                  gridColumn: 3,
                  gridRow: row,
                  borderColor: `${color}40`,
                  background: `${color}08`,
                }}
              >
                <span className="font-orbitron text-[8px]" style={{ color: `${color}80` }}>
                  {label}
                </span>
              </div>
            ),
          )}

          {/* All 118 elements */}
          {allElements.map((el) => {
            const [col, row] = getGridPos(el);
            const isVisible = visibleNums.has(el.atomicNumber);

            // For text search: dim non-matching but keep visible (user sees context)
            // For category/state filter: fully hide non-matching elements
            const hideElement = isFiltering && !isVisible && (isCategoryFiltering || isStateFiltering);
            const highlighted = isSearching && isVisible;
            const dimmed = isSearching && !isVisible && !isCategoryFiltering && !isStateFiltering;

            return (
              <div
                key={el.atomicNumber}
                style={{
                  gridColumn: col,
                  gridRow: row,
                  overflow: 'visible',
                  position: 'relative',
                  visibility: hideElement ? 'hidden' : 'visible',
                  pointerEvents: hideElement ? 'none' : 'auto',
                }}
              >
                <ElementCard
                  element={el}
                  highlighted={highlighted}
                  dimmed={dimmed}
                  onClick={onElementClick}
                  compareMode={compareMode}
                  isCompareSelected={compareSelected.includes(el.atomicNumber)}
                />
              </div>
            );
          })}
        </div>

        {/* ── Category legend ── */}
        <div className="mt-5 flex flex-wrap gap-2">
          {(Object.entries(categoryColors) as [keyof typeof categoryColors, string][]).map(([key, color]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div
                className="h-2.5 w-2.5 rounded-sm"
                style={{ background: color, boxShadow: `0 0 5px ${color}` }}
              />
              <span className="text-[10px] text-slate-400">{categoryLabels[key]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
