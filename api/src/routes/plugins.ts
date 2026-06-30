import { Router } from 'express'
import type { Request, Response } from 'express'
import { prisma } from '../db.js'

export const pluginsRouter = Router()

// GET /api/plugins — list enabled plugins
pluginsRouter.get('/', async (_req: Request, res: Response) => {
  const plugins = await prisma.plugin.findMany({
    where: { enabled: true },
    select: { id: true, name: true, version: true, manifest: true, updatedAt: true },
    orderBy: { name: 'asc' },
  })
  res.json(plugins)
})

// GET /api/plugins/:id/code — download plugin source
pluginsRouter.get('/:id/code', async (req: Request, res: Response) => {
  const plugin = await prisma.plugin.findUnique({ where: { id: req.params.id } })
  if (!plugin) { res.status(404).json({ error: 'Plugin not found' }); return }
  res.setHeader('Content-Type', 'application/json')
  res.json({ manifest: plugin.manifest, code: plugin.code })
})

// POST /api/plugins — publish a plugin
pluginsRouter.post('/', async (req: Request, res: Response) => {
  const { name, version, code, manifest } = req.body as {
    name: string; version: string; code: string; manifest: unknown
  }
  if (!name || !version || !code || !manifest) {
    res.status(400).json({ error: 'name, version, code, manifest required' })
    return
  }
  const plugin = await prisma.plugin.create({
    data: { name, version, code, manifest },
    select: { id: true, name: true, version: true, updatedAt: true },
  })
  res.status(201).json(plugin)
})

// DELETE /api/plugins/:id — soft-delete (disable)
pluginsRouter.delete('/:id', async (req: Request, res: Response) => {
  await prisma.plugin.update({ where: { id: req.params.id }, data: { enabled: false } })
  res.status(204).end()
})
