import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../db.js'

const AUTH_DISABLED = process.env.FACET3D_AUTH === 'false'

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (AUTH_DISABLED) { next(); return }

  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Bearer token' })
    return
  }

  const token = header.slice(7)
  const record = await prisma.apiToken.findUnique({ where: { token } })

  if (!record) {
    res.status(401).json({ error: 'Invalid token' })
    return
  }

  if (record.expiresAt && record.expiresAt < new Date()) {
    res.status(401).json({ error: 'Token expired' })
    return
  }

  // Attach token owner to request for downstream use
  res.locals.tokenId = record.id
  next()
}
