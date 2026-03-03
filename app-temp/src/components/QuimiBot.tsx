import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import type { ChemicalElement } from '../data/elements';
import { useGroqAI } from '../hooks/useGroqAI';

interface QuimiBotProps {
  open: boolean;
  onClose: () => void;
  elementContext?: ChemicalElement | null;
  compareContext?: [ChemicalElement, ChemicalElement] | null;
}

interface UIMessage {
  id: number;
  role: 'user' | 'bot';
  text: string;
}

let msgCounter = 0;

function renderMarkdownTable(block: string): string {
  // Keep only complete rows (start AND end with |)
  const rows = block.trim().split('\n')
    .map((r) => r.trim())
    .filter((r) => r.startsWith('|') && r.endsWith('|'));
  if (rows.length < 2) return block;
  const [header, , ...body] = rows; // skip separator row (index 1)
  const cells = (row: string) =>
    row.split('|').map((c) => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1);
  const th = cells(header).map((c) => `<th>${c}</th>`).join('');
  const trs = body.map((r) => `<tr>${cells(r).map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
  return `<table class="qb-table"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`;
}

function formatBotText(text: string): string {
  // Escape HTML entities first
  let out = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Drop any partial table row at the very end (no closing pipe)
  out = out.replace(/\n\|[^\n|]*$/m, '');

  // Convert markdown tables before other formatting
  out = out.replace(/((?:^\|.+\|\n?)+)/gm, (match) => renderMarkdownTable(match));

  return out
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^#{1,3}\s+(.+)$/gm, '<strong style="font-size:1.05em">$1</strong>')
    .replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*?<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br/>')
    .replace(/^(.+)$/, '<p>$1</p>');
}

const QUICK: Array<{ icon: string; label: string; msg: string }> = [
  { icon: '⚗️', label: 'Explícame',      msg: 'Explícame las propiedades más importantes y datos curiosos de este elemento' },
  { icon: '⚖️', label: 'Similitudes',   msg: '¿Con qué elementos es más similar y cuáles son las diferencias clave?' },
  { icon: '🧪', label: 'Quiz',          msg: 'Dame un ejercicio universitario sobre este elemento o la tabla periódica' },
  { icon: '🏭', label: 'Industria',     msg: '¿Cuáles son los principales usos industriales y aplicaciones modernas?' },
];

function useIsMobile() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 639px)').matches;
}

export function QuimiBot({ open, onClose, elementContext, compareContext }: QuimiBotProps) {
  const isMobile = useIsMobile();
  const { sendMessage, hasApiKey, loadingStatus } = useGroqAI();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<UIMessage[]>([
    { id: 0, role: 'bot', text: '¡Hola! Soy **QuimiBot** ⚗️ Tu asistente de química universitaria.\nPuedo explicarte cualquier elemento, comparar dos entre sí, o ayudarte con ejercicios. ¿Por dónde empezamos?' },
  ]);
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  // Keep a ref to the latest submit so the auto-compare effect always
  // calls the current version (avoids stale-closure issues with StrictMode)
  const submitRef = useRef<((text: string) => Promise<void>) | undefined>(undefined);

  // Build context labels
  const contextLabel = compareContext
    ? `${compareContext[0].name} (${compareContext[0].symbol}) vs ${compareContext[1].name} (${compareContext[1].symbol})`
    : elementContext
    ? `${elementContext.name} (${elementContext.symbol})`
    : undefined;

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 100)}px`;
  }, [input]);

  // Auto-send comparison query when opened in compare mode
  // Uses a `cancelled` flag instead of a persistent ref-key so that
  // React StrictMode's double-invoke doesn't swallow the timeout.
  useEffect(() => {
    if (!open || !compareContext) return;
    const [a, b] = compareContext;
    const prompt = `Compara ${a.name} (${a.symbol}, nº${a.atomicNumber}) con ${b.name} (${b.symbol}, nº${b.atomicNumber}): diferencias y similitudes en propiedades, reactividad, electronegatividad y usos.`;
    let cancelled = false;
    const t = setTimeout(() => {
      if (!cancelled) submitRef.current?.(prompt);
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [open, compareContext]);

  const addMsg = (role: UIMessage['role'], text: string) => {
    msgCounter += 1;
    setMessages((p) => [...p, { id: msgCounter, role, text }]);
  };

  const submit = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    addMsg('user', trimmed);
    setInput('');

    if (!hasApiKey) {
      addMsg('bot', 'Para activar QuimiBot, configura **VITE_GROQ_API_KEY** en `.env` con tu API key de Groq.');
      return;
    }
    setLoading(true);
    try {
      const res = await sendMessage(trimmed, contextLabel);
      addMsg('bot', res);
    } catch (err) {
      const msg = (err as Error).message ?? String(err);
      addMsg('bot', `❌ **Error:** \`${msg}\`\n\n*Si el error es de cuota, espera un momento y vuelve a intentar.*`);
    } finally {
      setLoading(false);
    }
  };

  // Always keep ref in sync so the auto-compare effect uses the latest version
  submitRef.current = submit;

  const handleSubmit = (e: FormEvent) => { e.preventDefault(); submit(input); };
  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(input); } };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40"
            style={{ background: 'rgba(2,8,24,0.65)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} />

          <motion.aside
            className={
              isMobile
                ? 'fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl border-t border-white/[0.08]'
                : 'fixed right-0 top-0 z-50 flex h-[100dvh] w-full max-w-[420px] flex-col border-l border-white/[0.07]'
            }
            style={{
              background: 'rgba(10, 9, 20, 0.97)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              ...(isMobile ? { height: '90dvh' } : {}),
            }}
            initial={isMobile ? { y: '100%' } : { x: '100%' }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: '100%' } : { x: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
          >
            {/* Drag handle (mobile only) */}
            {isMobile && (
              <div className="flex justify-center pt-2.5 pb-1">
                <div className="h-1 w-10 rounded-full bg-slate-600/70" />
              </div>
            )}

            {/* Header */}
            <header className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="atom-loader" />
                <div>
                  <h2 className="font-orbitron text-sm font-medium text-slate-200">QuimiBot</h2>
                  <p className="text-[10px] text-slate-600">Groq · Química universitaria</p>
                </div>
              </div>
              <button type="button" onClick={onClose}
                className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-1.5 text-xs text-slate-400 transition hover:border-white/15 hover:text-white">
                ✕
              </button>
            </header>

            {/* Context chip */}
            {contextLabel && (
              <div className="border-b border-white/[0.05] px-4 py-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wider text-slate-600">
                    {compareContext ? 'Comparando' : 'Contexto'}
                  </span>
                  {compareContext ? (
                    <>
                      <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-xs text-slate-300">
                        {compareContext[0].name} ({compareContext[0].symbol})
                      </span>
                      <span className="text-xs text-slate-600">vs</span>
                      <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-xs text-slate-300">
                        {compareContext[1].name} ({compareContext[1].symbol})
                      </span>
                    </>
                  ) : (
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-xs text-slate-300">
                      {contextLabel}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="border-b border-white/[0.05] px-4 py-2">
              <div className="flex flex-wrap gap-1.5">
                {QUICK.map((q) => (
                  <button key={q.label} type="button" disabled={loading} onClick={() => submit(q.msg)}
                    className="flex items-center gap-1 rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[11px] text-slate-400 transition hover:border-white/15 hover:bg-white/[0.06] hover:text-slate-200 disabled:opacity-30">
                    <span>{q.icon}</span><span>{q.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" style={{ WebkitOverflowScrolling: 'touch' }}>
              {messages.map((msg) => (
                <motion.div key={msg.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'bot' && (
                    <div className="mr-2 mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xs">
                      ⚗️
                    </div>
                  )}
                  <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'bot'
                      ? 'bot-message rounded-tl-sm border border-white/[0.07] bg-white/[0.05] text-slate-200'
                      : 'rounded-tr-sm border border-white/10 bg-white/[0.08] text-slate-100'
                  }`}>
                    {msg.role === 'bot'
                      ? <div dangerouslySetInnerHTML={{ __html: formatBotText(msg.text) }} />
                      : msg.text
                    }
                  </div>
                </motion.div>
              ))}

              {loading && (
                <div className="flex items-start gap-2">
                  <div className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xs">⚗️</div>
                  <div className="rounded-2xl rounded-tl-sm border border-white/[0.07] bg-white/[0.05] px-4 py-3 space-y-1.5">
                    <div className="typing"><span /><span /><span /></div>
                    <p className="text-[10px] text-slate-600 animate-pulse">{loadingStatus || 'Pensando...'}</p>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit}
              className="border-t border-white/[0.07] p-3"
              style={{ paddingBottom: isMobile ? 'max(12px, env(safe-area-inset-bottom))' : undefined }}
            >
              <div className="flex items-end gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] p-2 transition-all focus-within:border-white/20">
                <textarea
                  ref={taRef} rows={1} value={input}
                  onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey}
                  placeholder="Pregunta sobre química..."
                  className="flex-1 resize-none bg-transparent text-slate-200 outline-none placeholder:text-slate-600"
                  style={{ minHeight: 28, maxHeight: 100, fontSize: 16 }}
                />
                <button type="submit" disabled={loading || !input.trim()}
                  className="flex-shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:bg-white/15 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
                  ↑
                </button>
              </div>
              {!isMobile && <p className="mt-1.5 text-center text-[10px] text-slate-700">Shift+Enter para nueva línea</p>}
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
