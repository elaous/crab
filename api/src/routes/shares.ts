import { Router } from 'express'
import type { Request, Response } from 'express'
import { prisma } from '../db.js'

export const sharesRouter = Router({ mergeParams: true })

// GET /api/scenes/:sceneId/shares
sharesRouter.get('/', async (req: Request, res: Response) => {
  const shares = await prisma.share.findMany({
    where: { sceneId: req.params.sceneId },
    select: { id: true, token: true, permission: true, expiresAt: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(shares)
})

// POST /api/scenes/:sceneId/shares
sharesRouter.post('/', async (req: Request, res: Response) => {
  const { permission = 'view', expiresAt } = req.body as { permission?: string; expiresAt?: string }
  const scene = await prisma.scene.findUnique({ where: { id: req.params.sceneId }, select: { id: true } })
  if (!scene) { res.status(404).json({ error: 'Scene not found' }); return }

  const VALID_PERMISSIONS = ['viewer', 'editor', 'owner']
  const share = await prisma.share.create({
    data: {
      sceneId: req.params.sceneId,
      permission: VALID_PERMISSIONS.includes(permission) ? permission : 'viewer',
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
    select: { id: true, token: true, permission: true, expiresAt: true, createdAt: true },
  })
  res.status(201).json(share)
})

// DELETE /api/scenes/:sceneId/shares/:id
sharesRouter.delete('/:id', async (req: Request, res: Response) => {
  await prisma.share.deleteMany({
    where: { id: req.params.id, sceneId: req.params.sceneId },
  })
  res.status(204).end()
})
