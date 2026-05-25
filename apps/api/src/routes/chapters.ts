import { Router } from 'express'
import { z } from 'zod'

import AuthClient from '../utils/auth'
import { parseBody, parseParams } from '../utils/validate'
import { notFound } from '../error'
import ChapterService, { createChapterSchema, updateChapterSchema } from '../services/chapter'

const router = Router()

router.get('/:chapterId', async (req, res) => {
  const { chapterId } = parseParams(z.object({ chapterId: z.uuid() }), req)

  const db = res.locals.db
  const authClient = new AuthClient(req, db)
  await authClient.ensureSchoolPermissions({ content: ['read'] })
  const includeDrafts = await authClient.hasSchoolPermissions({ content: ['create'] })
  const chapter = await ChapterService.findById(db, chapterId, includeDrafts)
  if (!chapter) {
    throw notFound()
  }

  res.status(200).json({ ok: true, data: chapter })
})

router.post('/', async (req, res) => {
  const data = parseBody(createChapterSchema, req)

  const db = res.locals.db
  const authClient = new AuthClient(req, db)
  await authClient.ensureSchoolPermissions({ content: ['create'] })
  const created = await ChapterService.create(db, data)
  res.status(201).json({ ok: true, data: created })
})

router.patch('/:chapterId', async (req, res) => {
  const { chapterId } = parseParams(z.object({ chapterId: z.uuid() }), req)
  const updates = parseBody(updateChapterSchema, req)

  const db = res.locals.db
  const authClient = new AuthClient(req, db)
  await authClient.ensureSchoolPermissions({ content: ['update'] })
  const existing = await ChapterService.findById(db, chapterId, true)
  if (!existing) {
    throw notFound()
  }

  const updated = await ChapterService.update(db, chapterId, updates)
  res.status(200).json({ ok: true, data: updated })
})

export default router
