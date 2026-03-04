import OpenAI from 'openai';
import { useCallback, useMemo, useState } from 'react';
import type { ChemicalElement } from '../data/elements';

const SYSTEM_PROMPT = `Eres QuimiBot, asistente universitario de química creado por **Yean Carlo**. Español siempre.

PERSONALIDAD:
- Eres apasionado por la química pero también tienes sentido del humor.
- Si alguien te hace una broma, un meme, o algo informal, resíguele el juego con gracia y un toque químico. Ejemplo: si dicen "eres lo más rad(i)cal", puedes responder con algo sobre el Radio o los radicales libres.
- Si preguntan quién te creó, respondes que fue **Yean Carlo**, con orgullo y quizás un pequeño chiste relacionado con la química.
- Si alguien está frustrado con un ejercicio, animalos con energía positiva.
- Si alguien te lanza un chiste de química (bueno o malo), ríete y devüelve uno igual de quimico.
- Fuera de química puedes ser amigable y breve, pero siempre redirige con gracia al tema químico.

CONOCIMIENTO: tabla periódica, estructura atómica, enlace químico (VSEPR, hibridación), reacciones, estequiometría, equilibrio (Kc/Kp/Ka/Kb/Ksp), cinética, termodinámica (ΔH/ΔS/ΔG), electroquímica, química orgánica descriptiva.

REGLAS DE RESPUESTA:
1. Propiedades de un elemento → incluye siempre: conf. electrónica, electroneg. Pauling, radio atómico, PF/PE en K, densidad, estados de oxidación, reactividad clave, usos top.
2. Comparación → USA TABLA MARKDOWN obligatoriamente con columnas por elemento.
3. Ejercicio → resuelve CADA paso con fórmula + sustitución + resultado con unidades. Verifica al final.
4. Pregunta conceptual → nombra el modelo/teoría base, incluye ecuación si existe.

FORMATO:
- **negrita** para valores y conceptos clave.
- \`código\` para fórmulas químicas y configuraciones.
- Tablas markdown cuando compares ≥2 propiedades o elementos.
- Responde todo lo necesario. No cortes listas a medias.
- Si no tienes certeza de un valor exacto, escribe "aprox." antes del número.

IMPORTANTE: NUNCA empieces con "Bienvenido", "Hola", "¡Hola!", "Hey" ni frases de presentación. Responde DIRECTAMENTE.`;

type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

/** Máximo de turnos de historial que se envían al modelo (para evitar overflow de tokens) */
const MAX_HISTORY_TURNS = 10;

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

/** Builds a concise JSON context block from a ChemicalElement */
function buildElementContext(el: ChemicalElement): string {
  const data = {
    nombre: el.name,
    símbolo: el.symbol,
    Z: el.atomicNumber,
    masa: el.atomicMass,
    grupo: el.group,
    período: el.period,
    categoría: el.category,
    estado_std: el.state,
    electroneg: el.electronegativity,
    PF_K: el.meltingPoint,
    PE_K: el.boilingPoint,
    conf_electrónica: el.electronConfiguration,
    descubierto_por: el.discoveredBy,
    año: el.yearDiscovered,
  };
  return JSON.stringify(data);
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
    async (
      message: string,
      elementContext?: string,
      onChunk?: (accumulated: string) => void,
      elementData?: ChemicalElement | null,
    ) => {
      if (!apiKey) {
        throw new Error('Falta configurar VITE_GROQ_API_KEY.');
      }

      // Enriquecer el contexto: si tenemos el objeto completo, inyectamos los datos reales
      let contextualMessage = message;
      if (elementData) {
        contextualMessage = `[Datos del elemento consultado: ${buildElementContext(elementData)}]\n${message}`;
      } else if (elementContext) {
        contextualMessage = `[El usuario está consultando: ${elementContext}]\n${message}`;
      }

      // Capamos el historial a los últimos MAX_HISTORY_TURNS turnos (= mensajes user+assistant)
      const cappedHistory = history.slice(-MAX_HISTORY_TURNS * 2);

      const messages: ChatMessage[] = [
        ...cappedHistory,
        { role: 'user', content: contextualMessage },
      ];

      setLoadingStatus(`Consultando ${modelName}...`);

      try {
        const client = new OpenAI({
          apiKey,
          baseURL: GROQ_BASE_URL,
          dangerouslyAllowBrowser: true,
        });

        const stream = await client.chat.completions.create({
          model: modelName,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages.map((msg) => ({ role: msg.role, content: msg.content })),
          ],
          max_tokens: 4096,
          temperature: 0.3,
          top_p: 0.9,
          stream: true,
        });

        let accumulated = '';
        let hitLength = false;

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content ?? '';
          if (delta) {
            accumulated += delta;
            onChunk?.(accumulated);
          }
          if (chunk.choices[0]?.finish_reason === 'length') {
            hitLength = true;
          }
        }

        if (hitLength) {
          accumulated += '\n\n*(Respuesta cortada por límite de tokens. Escribe "continúa" para seguir.)*';
          onChunk?.(accumulated);
        }

        const reply = makeConciseReply(accumulated) || '(sin respuesta)';

        setHistory((prev) => [
          ...prev.slice(-MAX_HISTORY_TURNS * 2),
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
  // Solo eliminar frases de apertura vacías que el modelo a veces añade.
  // NO truncar: el system prompt ya instruye al modelo sobre la longitud.
  const clean = text
    .replace(/^(¡?(?:buena|excelente|gran)\s+pregunta!?\s*\.?\s*)/i, '')
    .replace(/^(¡?claro!?\s*(?:que\s+sí)?\.?\s*)/i, '')
    .replace(/^(¡?por\s+supuesto!?\s*\.?\s*)/i, '')
    .replace(/^(¡?con\s+mucho\s+gusto!?\s*\.?\s*)/i, '')
    .replace(/^(¡?vamos\s+a\s+ver\s*!?\s*\.?\s*)/i, '')
    .trim();

  // Para tablas: solo eliminar fila de tabla incompleta al final (sin | de cierre)
  const hasTable = /^\|.+\|/m.test(clean);
  if (hasTable) {
    const tableSafe = clean.replace(/\n\|[^\n]*$/m, (m) =>
      m.trimEnd().endsWith('|') ? m : '',
    );
    return dedupeReply(tableSafe);
  }

  return dedupeReply(clean);
}

function dedupeReply(text: string): string {
  const normalized = text.trim();
  if (!normalized) return normalized;

  const half = Math.floor(normalized.length / 2);
  if (
    normalized.length % 2 === 0 &&
    normalized.slice(0, half).trim() === normalized.slice(half).trim()
  ) {
    return normalized.slice(0, half).trim();
  }

  const blocks = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const compact: string[] = [];
  for (const block of blocks) {
    if (compact[compact.length - 1] !== block) {
      compact.push(block);
    }
  }

  return compact.join('\n\n').trim();
}
