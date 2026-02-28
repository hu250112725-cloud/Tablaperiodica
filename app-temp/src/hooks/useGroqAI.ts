import OpenAI from 'openai';
import { useCallback, useMemo, useState } from 'react';

const SYSTEM_PROMPT = `
Eres QuimiBot, un asistente educativo especializado en química para
estudiantes universitarios. Tu personalidad es amigable y casual,
hablas como un compañero inteligente, no como un libro de texto.
Siempre respondes en español.

TUS CAPACIDADES:

1. EXPLICAR ELEMENTOS: Cuando pregunten por un elemento da:
   - Propiedades físicas y químicas con valores exactos
   - Historia y descubrimiento (quién, cuándo, cómo)
   - Usos en la industria con ejemplos concretos y modernos
   - Dato curioso que sorprenda al estudiante
   Usa emojis ocasionalmente ⚗️🔬

2. COMPARAR ELEMENTOS: Analiza diferencias y similitudes en:
   - Propiedades, reactividad, electronegatividad
   - Posición en la tabla periódica y qué implica
   - Usos y aplicaciones industriales
   Usa tablas markdown cuando sea útil para comparar.

3. RESOLVER EJERCICIOS:
   - Nunca des solo la respuesta, explica cada paso
   - Usa formato numerado para los pasos
   - Si el estudiante se equivoca, corrígelo con amabilidad
   - Nivel universitario: usa terminología correcta y explícala

ESTILO:
- Casual y cercano ("¡Buena pregunta!", "Mira, esto es interesante...")
- Usa analogías del mundo real para conceptos difíciles
- Respuestas estructuradas pero no aburridas
- Si preguntan algo fuera de química: "Eso está fuera de mi área ⚗️,
  pero en química podemos hablar de..."

FORMATO DE RESPUESTA (MUY IMPORTANTE):
- Responde breve, directo y solo con lo necesario
- Máximo 4-6 líneas por respuesta normal
- Usa viñetas cortas cuando ayuden a entender rápido
- Solo da explicaciones largas si el usuario las pide explícitamente
- Evita introducciones largas o repetir contexto
- No uses frases de relleno como "¡Buena pregunta!" o similares

RESTRICCIONES:
- Solo química y tabla periódica
- Si no sabes algo con certeza, dilo honestamente
- Nivel universitario, no simplifiques en exceso
`;

type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

const MAX_RESPONSE_LINES = 6;
const MAX_RESPONSE_CHARS = 520;
const MAX_TABLE_CHARS = 2400;

const DEFAULT_MODEL = 'llama-3.1-8b-instant';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (/API key|permission|unauthorized|forbidden|invalid api key/i.test(error.message)) {
      return 'API key inválida o sin permisos en Groq.';
    }
    if (/quota|429|rate/i.test(error.message)) {
      return 'Límite de cuota alcanzado. Espera un momento e inténtalo de nuevo.';
    }
    return error.message;
  }

  return 'Ocurrió un error inesperado con Groq.';
}

function trimDanglingConnector(text: string): string {
  return text
    .replace(/\s+(de|del|y|e|o|u|con|para|por|en|a|que)$/i, '')
    .trim();
}

function truncateAtSentenceBoundary(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return trimDanglingConnector(text);
  }

  const chunk = text.slice(0, maxChars).trimEnd();
  const lastPunctuation = Math.max(
    chunk.lastIndexOf('.'),
    chunk.lastIndexOf('!'),
    chunk.lastIndexOf('?'),
    chunk.lastIndexOf(';'),
    chunk.lastIndexOf(':'),
  );

  if (lastPunctuation >= Math.floor(maxChars * 0.55)) {
    return trimDanglingConnector(chunk.slice(0, lastPunctuation + 1));
  }

  const lastSpace = chunk.lastIndexOf(' ');
  if (lastSpace > 0) {
    return `${trimDanglingConnector(chunk.slice(0, lastSpace))}…`;
  }

  return `${trimDanglingConnector(chunk)}…`;
}

export function useGroqAI() {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [loadingStatus, setLoadingStatus] = useState<string>('');

  const apiKey = useMemo(() => (import.meta.env.VITE_GROQ_API_KEY ?? '').trim(), []);
  const modelName = useMemo(() => {
    const v = (import.meta.env.VITE_GROQ_MODEL ?? '').trim();
    return v || DEFAULT_MODEL;
  }, []);

  const sendMessage = useCallback(
    async (message: string, elementContext?: string) => {
      if (!apiKey) {
        throw new Error('Falta configurar VITE_GROQ_API_KEY.');
      }

      const contextualMessage = elementContext
        ? `[Contexto: El usuario está viendo el elemento ${elementContext}] ${message}`
        : message;

      const messages: ChatMessage[] = [
        ...history,
        { role: 'user', content: contextualMessage },
      ];

      setLoadingStatus(`💬 Pensando con ${modelName} (Groq)...`);

      try {
        const client = new OpenAI({
          apiKey,
          baseURL: GROQ_BASE_URL,
          dangerouslyAllowBrowser: true,
        });

        const completion = await client.chat.completions.create({
          model: modelName,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages.map((msg) => ({ role: msg.role, content: msg.content })),
          ],
          max_tokens: 900,
          temperature: 0.35,
        });

        const rawReply = completion.choices[0]?.message?.content?.trim() || '(sin respuesta)';
        const reply = makeConciseReply(rawReply);

        setHistory((prev) => [
          ...prev,
          { role: 'user', content: contextualMessage },
          { role: 'assistant', content: reply },
        ]);

        setLoadingStatus('');
        return reply;
      } catch (error) {
        setLoadingStatus('');
        throw new Error(toErrorMessage(error));
      }
    },
    [history, apiKey, modelName],
  );

  const clearHistory = useCallback(() => setHistory([]), []);

  return {
    sendMessage,
    history,
    clearHistory,
    hasApiKey: Boolean(apiKey),
    loadingStatus,
  };
}

function makeConciseReply(text: string): string {
  const withoutFillerOpeners = text
    .replace(/^(¡?buena pregunta!?\s*)/i, '')
    .replace(/^(mira,?\s*esto es interesante\.?\s*)/i, '')
    .trim();

  // If the response contains a markdown table, don't truncate by line count.
  // Enforce a generous char limit and trim at a complete table row boundary.
  const hasTable = /^\|.+\|/m.test(withoutFillerOpeners);
  if (hasTable) {
    if (withoutFillerOpeners.length <= MAX_TABLE_CHARS) {
      // Remove any trailing partial table row (no closing pipe)
      return withoutFillerOpeners.replace(/\n\|[^\n]*$/m, (m) =>
        m.trimEnd().endsWith('|') ? m : '',
      );
    }
    // Truncate at the last complete line ending with |
    const chunk = withoutFillerOpeners.slice(0, MAX_TABLE_CHARS);
    const lastCompleteRow = chunk.lastIndexOf('|\n');
    if (lastCompleteRow > 0) {
      return chunk.slice(0, lastCompleteRow + 1);
    }
    return chunk;
  }

  const lines = withoutFillerOpeners
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_RESPONSE_LINES);

  const compact = lines.join('\n');
  return truncateAtSentenceBoundary(compact, MAX_RESPONSE_CHARS);
}
