import 'dotenv/config'
import express from 'express'
import type { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { requireAuth } from './middleware/auth.js'
import { scenesRouter } from './routes/scenes.js'
import { pluginsRouter } from './routes/plugins.js'
import { sharesRouter } from './routes/shares.js'
import { prisma } from './db.js'

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
app.get('/health', (_req: Request, res: Response) => res.json({ ok: true, ts: new Date().toISOString() }))

// ── Public shared scene endpoint (no auth) ────────────────────────────────────
app.get('/api/public/scenes/:token', async (req: Request, res: Response) => {
  const share = await prisma.share.findUnique({
    where: { token: req.params.token },
    include: { scene: true },
  })
  if (!share) { res.status(404).json({ error: 'Share not found or revoked' }); return }
  if (share.expiresAt && share.expiresAt < new Date()) {
    res.status(410).json({ error: 'Share link has expired' }); return
  }
  res.setHeader('Content-Type', 'application/octet-stream')
  res.setHeader('X-Scene-Name', encodeURIComponent(share.scene.name))
  res.setHeader('X-Share-Permission', share.permission)
  res.send(share.scene.data)
})

// ── API routes (all require auth unless CRABCAD_AUTH=false) ──────────────────
app.use('/api/scenes',                requireAuth, scenesRouter)
app.use('/api/scenes/:sceneId/shares', requireAuth, sharesRouter)
app.use('/api/plugins',               requireAuth, pluginsRouter)

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)
  res.status(500).json({ error: err.message })
})

app.listen(PORT, () => {
  console.log(`CrabCAD API  →  http://localhost:${PORT}`)
  console.log(`Auth: ${process.env.CRABCAD_AUTH === 'false' ? 'disabled' : 'enabled'}`)
})
