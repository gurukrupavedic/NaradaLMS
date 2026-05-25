import { Router } from 'express'
import { z } from 'zod'

import { parseBody, parseParams } from '../utils/validate'
import { notFound } from '../error'
import ChapterService, { createChapterSchema, updateChapterSchema } from '../services/chapter'

const router = Router()

router.get('/:chapterId', async (req, res) => {
  const { db, authClient } = res.locals
  const { chapterId } = parseParams(z.object({ chapterId: z.uuid() }), req)

  await authClient.ensureSchoolPermissions({ content: ['read'] })
  const includeDrafts = await authClient.hasSchoolPermissions({ draft: ['read'] })
  const chapter = await ChapterService.findById(db, chapterId, includeDrafts)
  if (!chapter) {
    throw notFound()
  }

  res.status(200).json({ ok: true, data: chapter })
})

router.post('/', async (req, res) => {
  const { db, authClient } = res.locals
  const data = parseBody(createChapterSchema, req)

  await authClient.ensureSchoolPermissions({ content: ['create'] })
  const created = await ChapterService.create(db, data)
  res.status(201).json({ ok: true, data: created })
})

router.patch('/:chapterId', async (req, res) => {
  const { db, authClient } = res.locals
  const { chapterId } = parseParams(z.object({ chapterId: z.uuid() }), req)
  const updates = parseBody(updateChapterSchema, req)

  await authClient.ensureSchoolPermissions({ content: ['update'] })
  const existing = await ChapterService.findById(db, chapterId, true)
  if (!existing) {
    throw notFound()
  }

  const updated = await ChapterService.update(db, chapterId, updates)
  res.status(200).json({ ok: true, data: updated })
})

export default router
