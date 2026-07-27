/**
 * Prosopógrafo — prompt-cuestionario Matriz 6×6 para LLMs externos (Gemini, etc.).
 * Deprocast no llama al LLM: el Observador copia este texto y pega el JSON de vuelta.
 */

export const PROSOPOGRAFO_SCHEMA_VERSION = "1.0.0";

export function buildProsopografoPrompt(): string {
  return `# Prosopógrafo · Deprocast — Cuestionario CRM Persona (Matriz 6×6)

Sos un extractor de fichas de persona para el CRM Deprocast.
A partir de la conversación / notas / contexto que el usuario te dé, devolvé **ÚNICAMENTE JSON válido** (sin markdown, sin fences \`\`\`, sin comentarios).

## Forma de salida (obligatoria)

Un objeto con array \`personas\` (aunque haya una sola):

\`\`\`
{
  "personas": [
    {
      "nombrePrincipal": "string (OBLIGATORIO)",
      "aliases": ["string"],
      "notasGenerales": "string",
      "relationToOperator": "string — vínculo con el Operador (ej. Mentor, Cliente, Socio)",
      "crm": {
        "identity": {
          "documento": "string",
          "fechaNacimiento": "string (YYYY-MM-DD o edad)",
          "nacionalidad": "string",
          "tipoPersona": "fisica | juridica",
          "vinculoOperador": "string"
        },
        "contacto": {
          "telefono": "string",
          "email": "string",
          "sitioWeb": "string",
          "linkedin": "string",
          "x": "string",
          "instagram": "string",
          "aparicionesPublicas": "string (links multilinea)",
          "presupuesto": "bajo | medio | alto | inversor"
        },
        "proyectos": {
          "rolProyecto": "responsable | colaborador | cliente | asesor | otro",
          "hardSkills": ["string"],
          "softSkills": ["string"],
          "frecuencia": "diaria | semanal | mensual | latente",
          "capital": 1
        },
        "red": {
          "empresas": "string",
          "naturalezaVinculo": "laboral | personal | estrategico | academico",
          "canalPreferido": "presencial | audio | texto",
          "avales": "string",
          "historialAsaltos": "string"
        },
        "oportunidades": {
          "busca": "string",
          "ofrece": "string",
          "oportunidadActiva": "string",
          "estadoRelacion": "prospecto | aliado | cliente | mentorizado",
          "proximaAccion": "string",
          "historialIntercambios": "string"
        },
        "telemetria": {
          "origenIngesta": "string",
          "universoBabel": "string",
          "etiquetas": ["string"],
          "notasTranscripciones": "string",
          "impactoVibe": "sube | baja | neutro",
          "estadoRegistro": "verificado | candidato"
        }
      },
      "connectionsByName": [
        {
          "targetKind": "persona | proyecto",
          "targetName": "nombre exacto si lo conocés",
          "relationContext": "contexto del vínculo (obligatorio si hay connection)",
          "relationType": "string opcional"
        }
      ]
    }
  ]
}
\`\`\`

## Reglas

1. \`nombrePrincipal\` es el **único campo obligatorio**. Omití keys vacías.
2. \`capital\` es entero 1–12 si aplica.
3. No inventes emails/teléfonos si no están en el contexto; dejá el campo fuera.
4. \`connectionsByName\`: solo si el contexto menciona personas o proyectos por nombre. \`relationContext\` obligatorio por ítem.
5. Si el usuario habla de varias personas, incluí una entrada por cada una en \`personas\`.
6. Respondé **solo** el JSON. Nada de preámbulos ni explicaciones.

## Ejemplo mínimo

{"personas":[{"nombrePrincipal":"Ana Pérez","aliases":["Ana P."],"relationToOperator":"Colaboradora estratégica","crm":{"identity":{"tipoPersona":"fisica","vinculoOperador":"Colaboradora estratégica"},"contacto":{"email":"ana@example.com","presupuesto":"medio"},"oportunidades":{"estadoRelacion":"aliado","proximaAccion":"Enviar propuesta el viernes"},"telemetria":{"origenIngesta":"prosopografo","estadoRegistro":"verificado"}}}]}

---

Schema version: ${PROSOPOGRAFO_SCHEMA_VERSION}

Pegá debajo el contexto / conversación / notas sobre la(s) persona(s) a fichar:
`;
}
