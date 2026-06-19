# Deprocast

Aplicación Next.js para ingesta de audio, transcripción, purificación con Vertex AI y grafo de conocimiento.

## Desarrollo local

```bash
npm install
cp .env.example .env
# Completá las credenciales GCP en .env
npx prisma migrate deploy
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## Subir a GitHub

```bash
git add .
git commit -m "Preparar despliegue en Vercel"
git push origin main
```

No subas `.env` ni los archivos `*.json` de cuentas de servicio (ya están en `.gitignore`).

## Desplegar en Vercel

1. Importá el repo en [vercel.com/new](https://vercel.com/new).
2. Framework: **Next.js** (detectado automáticamente).
3. Build Command: `npm run vercel-build`
4. Variables de entorno (Settings → Environment Variables):

| Variable | Descripción |
|----------|-------------|
| `GCP_SPEECH_CREDENTIALS_JSON` | JSON completo de la cuenta de servicio Speech-to-Text |
| `GOOGLE_CLOUD_PROJECT` | ID del proyecto GCP Speech |
| `VERTEX_CREDENTIALS_JSON` | JSON completo de la cuenta de servicio Vertex AI |
| `GOOGLE_CLOUD_PROJECT2` | ID del proyecto Vertex (varonapi) |
| `VERTEX_LOCATION` | `europe-west1` |
| `VERTEX_MODEL` | `gemini-2.5-flash` |
| `GCP_SPEECH_LOCATION` | `us-central1` |
| `GCP_SPEECH_MODEL` | `chirp_2` |
| `GCP_SPEECH_LANGUAGE` | `es-ES` |

Opcional: `DATABASE_URL` (por defecto usa SQLite en `/tmp` en Vercel).

5. Deploy.

### Rutas de la app

| Ruta | Módulo |
|------|--------|
| `/` | Dashboard |
| `/ingesta` | Captura multimodal |
| `/diario` | Diario |
| `/validar` | Revisión HITL |
| `/calibrador` | Calibrador de vibe |
| `/proyectos` | Proyectos |
| `/grafo` | Grafo de conocimiento |
| `/laboral` | Desafíos laborales |
| `/audio/[id]` | Detalle de audio |

Los audios subidos en Vercel se sirven por `/api/uploads/[filename]` (en local siguen en `/uploads/`).

### Limitaciones en Vercel

- Los datos (SQLite, journal, documentos, uploads) viven en `/tmp` y **no persisten** entre cold starts ni entre instancias. Es adecuado para demo; para producción conviene Turso/Postgres y almacenamiento externo (S3, Vercel Blob).
- Las rutas de API con procesamiento largo requieren plan **Pro** (`maxDuration: 120`).
