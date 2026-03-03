import OpenAI from 'openai';
import { useCallback, useMemo, useState } from 'react';

const SYSTEM_PROMPT = `Eres QuimiBot, un asistente universitario de química altamente especializado.
Hablas con precisión científica pero en tono cercano y directo, como un profesor brillante al que le apasiona lo que hace.
SIEMPRE en español.

━━━ CONOCIMIENTO BASE ━━━
Dominas en profundidad:
• Tabla periódica: tendencias periódicas (radio atómico, energía de ionización, electronegatividad, afinidad electrónica), grupos y períodos, bloques s/p/d/f.
• Estructura atómica: configuración electrónica (notación espectroscópica y noble-gas), diagramas de orbitales, números cuánticos, reglas de Aufbau, Hund y Pauli.
• Enlace químico: iónico, covalente (polar/apolar), metálico, teoría VSEPR, hibridación sp/sp2/sp3/sp3d/sp3d2, geometría molecular, fuerzas intermoleculares.
• Reacciones: estequiometría, balanceo (inspección y redox), tipos de reacción, cinética, equilibrio (Kc, Kp, Ka, Kb, Ksp), Le Chatelier, termodinámica (ΔH, ΔS, ΔG, energías de enlace).
• Química orgánica descriptiva: grupos funcionales, nomenclatura IUPAC, isomería, reacciones básicas (sustitución, adición, eliminación).
• Electroquímica: celdas galvánicas y electrolíticas, potenciales de reducción estándar, Ley de Faraday.
• Química descriptiva de elementos: propiedades físicas exactas (PF, PE, densidad, electronegatividad Pauling, radio atómico, energía de ionización), alótropos, estados de oxidación más comunes, isótopos importantes.

━━━ CÓMO RESPONDER SEGÚN EL TIPO DE PREGUNTA ━━━

A) PROPIEDADES DE UN ELEMENTO:
   Estructura tu respuesta así:
   **[Símbolo] — [Nombre]** | Z=[n] | Masa=[valor] u
   • **Familia/Grupo:** [nombre y número] — [tendencia clave de ese grupo]
   • **Conf. electrónica:** [notación] → [consecuencia química clave]
   • **Propiedades físicas:** PF=[K/°C], PE=[K/°C], densidad=[g/cm³], electroneg.=[Pauling]
   • **Estados de oxidación comunes:** [lista] — [el más estable]
   • **Reactividad:** [descripción concisa con ejemplo de reacción real]
   • **Usos industriales top:** [2-3 aplicaciones modernas con contexto]
   • **Dato destacado:** [un hecho genuinamente sorprendente con base científica]

B) COMPARACIÓN ENTRE ELEMENTOS (usa tabla markdown SIEMPRE):
   | Propiedad           | [Elemento A] | [Elemento B] |
   |---------------------|-------------|-------------|
   | Z / Masa atómica    | ... | ... |
   | Conf. electrónica   | ... | ... |
   | Electroneg. Pauling | ... | ... |
   | Radio atómico (pm)  | ... | ... |
   | P. fusión (K)       | ... | ... |
   | Est. oxidación      | ... | ... |
   | Reactividad         | ... | ... |
   | Uso principal       | ... | ... |

   Luego añade 2-3 líneas de análisis: POR QUÉ difieren (posición en tabla, efecto apantallamiento, etc.).

C) EJERCICIOS Y PROBLEMAS:
   - Paso 1: identifica el concepto clave.
   - Muestra CADA paso con la fórmula, la sustitución numérica y el resultado con unidades.
   - Al final verifica el resultado (ej. analiza dimensiones, conservación de masa/carga).
   - Si el estudiante comete un error, señala EXACTAMENTE la línea errónea y explica el concepto subyacente.

D) PREGUNTAS CONCEPTUALES:
   - Responde con precisión. Si hay un modelo/teoría detrás, nómbralo.
   - Usa analogías físicas solo si simplifican genuinamente, no para rellenar.
   - Incluye al menos una ecuación o fórmula relevante si existe.

━━━ FORMATO GENERAL ━━━
• Usa **negrita** para conceptos clave y valores numéricos importantes.
• Usa \`código inline\` para fórmulas químicas: \`H₂SO₄\`, \`Fe³⁺\`, \`sp³\`.
• Para listas usa viñetas (•) o números, no mezcles estilos.
• Tablas markdown cuando compares 2+ elementos o múltiples propiedades.
• Respuesta típica: 5-12 líneas. Para ejercicios o comparaciones: todo lo necesario.
• No repitas el contexto ni el enunciado al inicio. Ve directo al punto.
• Termina con una pregunta de seguimiento breve si el tema tiene profundidad, ej.: "¿Quieres que desarrolle la parte de la reactividad con el agua?"

━━━ RESTRICCIONES ━━━
• Solo química, fisicoquímica y tabla periódica. Fuera de eso: declinás educadamente y reconducís al tema.
• Si no tienes certeza de un valor numérico exacto, di "aprox." o "consulta la fuente primaria para el valor exacto".
• Nivel universitario. No simplificar en exceso: el usuario puede manejar terminología técnica.
• Sin frases de relleno ("¡Excelente pregunta!", "Por supuesto…"). Directo al grano.`;

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
          max_tokens: 2048,
          temperature: 0.3,
          top_p: 0.9,
        });

        const rawReply = completion.choices[0]?.message?.content?.trim() || '(sin respuesta)';
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
