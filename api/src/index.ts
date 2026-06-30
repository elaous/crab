import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { requireAuth } from './middleware/auth.js'
import { scenesRouter } from './routes/scenes.js'
import { pluginsRouter } from './routes/plugins.js'

const app = express()
const PORT = Number(process.env.PORT ?? 3001)

// ── Security & parsing ────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({
  origin: process.env.CORS_ORIGIN ?? '*',
  exposedHeaders: ['X-Scene-Name'],
}))
app.use(express.json({ limit: '10mb' }))

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }))

// ── API routes (all require auth unless CRABCAD_AUTH=false) ──────────────────
app.use('/api/scenes',  requireAuth, scenesRouter)
app.use('/api/plugins', requireAuth, pluginsRouter)

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ error: err.message })
})

app.listen(PORT, () => {
  console.log(`CrabCAD API  →  http://localhost:${PORT}`)
  console.log(`Auth: ${process.env.CRABCAD_AUTH === 'false' ? 'disabled' : 'enabled'}`)
})
