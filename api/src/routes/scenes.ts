import { Router } from 'express'
import type { Request, Response } from 'express'
import { prisma } from '../db.js'

export const scenesRouter = Router()

// GET /api/scenes — list all scenes (newest first)
scenesRouter.get('/', async (_req: Request, res: Response) => {
  const scenes = await prisma.scene.findMany({
    select: { id: true, name: true, updatedAt: true, createdAt: true },
    orderBy: { updatedAt: 'desc' },
  })
  res.json(scenes)
})

// GET /api/scenes/:id — download raw binary
scenesRouter.get('/:id', async (req: Request, res: Response) => {
  const scene = await prisma.scene.findUnique({ where: { id: req.params.id } })
  if (!scene) { res.status(404).json({ error: 'Scene not found' }); return }

  res.setHeader('Content-Type', 'application/octet-stream')
  res.setHeader('X-Scene-Name', encodeURIComponent(scene.name))
  res.setHeader('Content-Length', scene.data.length)
  res.send(scene.data)
})

// PUT /api/scenes/:id — create or replace
scenesRouter.put('/:id', async (req: Request, res: Response) => {
  const name = req.headers['x-scene-name']
    ? decodeURIComponent(req.headers['x-scene-name'] as string)
    : 'Untitled'

  const chunks: Buffer[] = []
  req.on('data', (chunk: Buffer) => chunks.push(chunk))
  req.on('end', async () => {
    const data = Buffer.concat(chunks)
    const scene = await prisma.scene.upsert({
      where: { id: req.params.id },
      create: { id: req.params.id, name, data },
      update: { name, data },
      select: { id: true, name: true, updatedAt: true },
    })
    res.json(scene)
  })
})

// PATCH /api/scenes/:id — rename only
scenesRouter.patch('/:id', async (req: Request, res: Response) => {
  const { name } = req.body as { name?: string }
  if (!name) { res.status(400).json({ error: 'name required' }); return }
  const scene = await prisma.scene.update({
    where: { id: req.params.id },
    data: { name },
    select: { id: true, name: true, updatedAt: true },
  })
  res.json(scene)
})

// DELETE /api/scenes/:id
scenesRouter.delete('/:id', async (req: Request, res: Response) => {
  await prisma.scene.delete({ where: { id: req.params.id } })
  res.status(204).end()
})
