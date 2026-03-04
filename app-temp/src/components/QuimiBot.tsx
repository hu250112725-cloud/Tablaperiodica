import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import type { ChemicalElement } from '../data/elements';
import { useGroqAI } from '../hooks/useGroqAI';

const INITIAL_MSG = { id: 0, role: 'bot' as const, text: '__system__Puedo ayudarte con:\n- Propiedades de elementos y compuestos\n- Estructura atómica y enlace químico\n- Reacciones químicas y estequiometría\n- Equilibrio químico y constantes de equilibrio (Kc, Kp, Ka, Kb, Ksp)\n- Cinética y termodinámica química\n- Electroquímica\n- Química orgánica descriptiva\nTambién puedo resolver ejercicios y problemas de química paso a paso, y proporcionar explicaciones conceptuales sobre diferentes temas de la química. ¿Hay algo específico en lo que necesitas ayuda?' };

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

function normalizeBotText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\*\*|\*|`|_/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[¡!¿?.,;:()\[\]{}"']/g, '')
    .trim();
}

function dedupeMessages(list: UIMessage[]): UIMessage[] {
  if (list.length < 2) return list;
  const output: UIMessage[] = [];
  // Track all bot texts seen so far (normalized) → original msg
  const seenBotTexts = new Map<string, UIMessage>();

  for (const msg of list) {
    if (msg.role !== 'bot') {
      output.push(msg);
      continue;
    }

    const norm = normalizeBotText(msg.text);
    if (!norm) { output.push(msg); continue; }

    // Check against every previously seen bot message
    let duplicate = false;
    for (const [seenNorm, seenMsg] of seenBotTexts) {
      if (
        seenNorm === norm ||
        (norm.length > 30 && seenNorm.includes(norm)) ||
        (seenNorm.length > 30 && norm.includes(seenNorm))
      ) {
        // Keep the longer version in place
        if (msg.text.length > seenMsg.text.length) {
          const idx = output.indexOf(seenMsg);
          if (idx !== -1) output[idx] = msg;
          seenBotTexts.delete(seenNorm);
          seenBotTexts.set(norm, msg);
        }
        duplicate = true;
        break;
      }
    }

    if (!duplicate) {
      output.push(msg);
      seenBotTexts.set(norm, msg);
    }
  }

  return output;
}

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
  // 1. Escape HTML entities
  let out = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 2. Drop partial table row at end
  out = out.replace(/\n\|[^\n|]*$/m, '');

  // 3. Convert markdown tables first
  out = out.replace(/((?:^\|.+\|\n?)+)/gm, (match) => renderMarkdownTable(match));

  // 4. Split into lines and process each
  const lines = out.split('\n');
  const result: string[] = [];
  let inUl = false;
  let inOl = false;

  for (const raw of lines) {
    const line = raw
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^#{1,3}\s+(.+)$/, '<strong class="block text-slate-100 mt-1 mb-0.5" style="font-size:1.05em">$1</strong>');

    // Unordered list item
    const ulMatch = line.match(/^[-•]\s+(.+)$/);
    if (ulMatch) {
      if (!inUl) { result.push('<ul>'); inUl = true; }
      if (inOl)  { result.push('</ol>'); inOl = false; }
      result.push(`<li>${ulMatch[1]}</li>`);
      continue;
    }

    // Ordered list item
    const olMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (olMatch) {
      if (!inOl) { result.push('<ol>'); inOl = true; }
      if (inUl)  { result.push('</ul>'); inUl = false; }
      result.push(`<li>${olMatch[2]}</li>`);
      continue;
    }

    // Close any open lists
    if (inUl) { result.push('</ul>'); inUl = false; }
    if (inOl) { result.push('</ol>'); inOl = false; }

    if (line.trim() === '') {
      result.push('<div class="mb-2"></div>');
    } else {
      result.push(`<p>${line}</p>`);
    }
  }

  if (inUl) result.push('</ul>');
  if (inOl) result.push('</ol>');

  return result.join('');
}

const QUICK: Array<{ icon: string; label: string; msg: string }> = [
  { icon: '⚗️', label: 'Propiedades',  msg: 'Dame las propiedades físicas y químicas completas: PF, PE, densidad, electronegatividad, radio atómico, energía de ionización, estados de oxidación y configuración electrónica.' },
  { icon: '🔍', label: 'Similares',    msg: '¿Con cuáles elementos es más similar atendiendo a grupo, electronegatividad y reactividad? Usa una tabla comparativa.' },
  { icon: '🧪', label: 'Ejercicio',    msg: 'Plantea y resuelve paso a paso un problema universitario real sobre este elemento: puede ser de estequiometría, enlace, equilibrio o redox.' },
  { icon: '🏭', label: 'Aplicaciones', msg: '¿Cuáles son sus 3 aplicaciones industriales y tecnológicas más relevantes hoy en día? Incluye el proceso químico involucrado.' },
];

function useIsMobile() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 639px)').matches;
}

export function QuimiBot({ open, onClose, elementContext, compareContext }: QuimiBotProps) {
  const isMobile = useIsMobile();
  const { sendMessage, clearHistory, hasApiKey, loadingStatus } = useGroqAI();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<UIMessage[]>([INITIAL_MSG]);
  const [loading, setLoading] = useState(false);
  const [streamingId, setStreamingId] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const submitRef = useRef<((text: string) => Promise<void>) | undefined>(undefined);
  const compareAutoSentRef = useRef<string | null>(null);
  const submittingRef = useRef(false);
  const msgCounterRef = useRef(0);

  // Build context labels
  const contextLabel = compareContext
    ? `${compareContext[0].name} (${compareContext[0].symbol}) vs ${compareContext[1].name} (${compareContext[1].symbol})`
    : elementContext
    ? `${elementContext.name} (${elementContext.symbol})`
    : undefined;

  const visibleMessages = useMemo(() => dedupeMessages(messages), [messages]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 100)}px`;
  }, [input]);

  // Auto-send comparison query when opened in compare mode
  useEffect(() => {
    if (!open || !compareContext) return;
    const [a, b] = compareContext;
    const compareKey = `${a.atomicNumber}-${b.atomicNumber}`;
    if (compareAutoSentRef.current === compareKey) return;
    compareAutoSentRef.current = compareKey;
    const prompt = `Compara ${a.name} (${a.symbol}, nº${a.atomicNumber}) con ${b.name} (${b.symbol}, nº${b.atomicNumber}): diferencias y similitudes en propiedades, reactividad, electronegatividad y usos.`;
    let cancelled = false;
    const t = setTimeout(() => {
      if (!cancelled) submitRef.current?.(prompt);
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [open, compareContext]);

  useEffect(() => {
    if (!open || compareContext) return;
    compareAutoSentRef.current = null;
  }, [open, compareContext]);

  const addMsg = (role: UIMessage['role'], text: string) => {
    msgCounterRef.current += 1;
    const id = msgCounterRef.current;
    setMessages((p) => [...p, { id, role, text }]);
  };

  const handleReset = () => {
    clearHistory();
    msgCounterRef.current = 0;
    setMessages([INITIAL_MSG]);
    setInput('');
    setLoading(false);
    setStreamingId(null);
  };

  const submit = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading || submittingRef.current) return;
    submittingRef.current = true;
    addMsg('user', trimmed);
    setInput('');

    if (!hasApiKey) {
      addMsg('bot', 'Para activar QuimiBot, configura **VITE_GROQ_API_KEY** en `.env` con tu API key de Groq.');
      submittingRef.current = false;
      return;
    }

    // Create the bot streaming placeholder
    msgCounterRef.current += 1;
    const botId = msgCounterRef.current;
    setMessages((p) => [...p, { id: botId, role: 'bot', text: '' }]);
    setStreamingId(botId);
    setLoading(true);

    try {
      const finalReply = await sendMessage(
        trimmed,
        contextLabel,
        (accumulated) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === botId ? { ...m, text: accumulated } : m)),
          );
        },
        elementContext ?? null,
      );
      // Apply final processed text (makeConciseReply applied inside hook)
      setMessages((prev) =>
        prev.map((m) => (m.id === botId ? { ...m, text: finalReply } : m)),
      );
    } catch (err) {
      const msg = (err as Error).message ?? String(err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === botId
            ? { ...m, text: `❌ **Error:** \`${msg}\`\n\n*Si el error es de cuota, espera un momento y vuelve a intentar.*` }
            : m,
        ),
      );
    } finally {
      setLoading(false);
      setStreamingId(null);
      submittingRef.current = false;
    }
  };

  submitRef.current = submit;

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleSend = () => { submit(input); };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      submit(input);
    }
  };

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
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleReset} title="Reiniciar conversación"
                  className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-1.5 text-xs text-slate-500 transition hover:border-white/15 hover:text-slate-300">
                  ↺
                </button>
                <button type="button" onClick={onClose}
                  className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-1.5 text-xs text-slate-400 transition hover:border-white/15 hover:text-white">
                  ✕
                </button>
              </div>
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
              {visibleMessages.map((msg) => {
                const isStreaming = msg.role === 'bot' && msg.id === streamingId;
                const isSystemMsg = msg.role === 'bot' && msg.text.startsWith('__system__');

                // Render system/initial message as a distinct info panel (not a chat bubble)
                if (isSystemMsg) {
                  const lines = msg.text.replace('__system__', '').trim().split('\n');
                  return (
                    <motion.div key={msg.id}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs text-slate-500">
                      <p className="mb-2 font-medium text-slate-400">⚗️ QuimiBot · Asistente de química universitaria</p>
                      {lines.map((line, i) => {
                        const ulMatch = line.match(/^[-•]\s+(.+)$/);
                        return ulMatch
                          ? <p key={i} className="pl-3 before:mr-1.5 before:content-['·']">{ulMatch[1]}</p>
                          : line.trim() ? <p key={i}>{line}</p> : null;
                      })}
                    </motion.div>
                  );
                }

                return (
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
                      {msg.role === 'bot' ? (
                        msg.text === '' && isStreaming ? (
                          <div className="space-y-1.5">
                            <div className="typing"><span /><span /><span /></div>
                            <p className="text-[10px] text-slate-600 animate-pulse">{loadingStatus || 'Pensando...'}</p>
                          </div>
                        ) : (
                          <>
                            <div dangerouslySetInnerHTML={{ __html: formatBotText(msg.text) }} />
                            {isStreaming && (
                              <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse rounded-sm bg-slate-400/60 align-middle" />
                            )}
                          </>
                        )
                      ) : (
                        msg.text
                      )}
                    </div>
                  </motion.div>
                );
              })}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleFormSubmit}
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
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
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
