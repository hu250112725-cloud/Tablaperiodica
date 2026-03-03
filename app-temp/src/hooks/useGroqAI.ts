import OpenAI from 'openai';
import { useCallback, useMemo, useState } from 'react';

const SYSTEM_PROMPT = `Eres QuimiBot, asistente universitario de química. Español siempre. Sin frases de relleno. Directo al punto.

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
- Responde todo lo necesario para que la respuesta sea completa. No cortes listas a medias.
- Si no tienes certeza de un valor exacto, escribe "aprox." antes del número.

RESTRICCIÓN: Solo química y tabla periódica. Nivel universitario.`;

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

      // Enriquecer el contexto con el nombre del elemento para que el modelo tenga base
      const contextualMessage = elementContext
        ? `[El usuario está consultando: ${elementContext}]\n${message}`
        : message;

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

        const completion = await client.chat.completions.create({
          model: modelName,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages.map((msg) => ({ role: msg.role, content: msg.content })),
          ],
          max_tokens: 4096,
          temperature: 0.3,
          top_p: 0.9,
        });

        const choice = completion.choices[0];
        let rawReply = choice?.message?.content?.trim() || '(sin respuesta)';

        // Si el modelo paró porque alcanzó el límite de tokens, avisamos
        if (choice?.finish_reason === 'length') {
          rawReply += '\n\n*(Respuesta cortada por límite de tokens. Escribe "continúa" para seguir.)*';
        }

        const reply = makeConciseReply(rawReply);

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
    return clean.replace(/\n\|[^\n]*$/m, (m) =>
      m.trimEnd().endsWith('|') ? m : '',
    );
  }

  return clean;
}
