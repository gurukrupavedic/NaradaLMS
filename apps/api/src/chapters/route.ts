import { Router } from 'express'
import * as z from 'zod'

import { optionalProfileRoute } from '../naradaRoute'
import { parse } from '../utils/validate'
import { createChapter, findByIdForReader, updateChapter } from './service'
import { CreateChapterSchema, UpdateChapterSchema } from './schema'

const router = Router()

const chapterIdParams = z.object({ chapterId: z.uuid() })

router.get(
  '/:chapterId',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { chapterId } = await parse(chapterIdParams, req.params)
    const view = access.getContentReadView()
    const chapter = await findByIdForReader({ db }, chapterId, view, access)
    res.status(200).json({ data: chapter })
  }),
)

router.post(
  '/',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    access.requireCanUpdateContent()
    const data = await parse(CreateChapterSchema, req.body)
    const chapter = await createChapter({ db }, data)
    res.status(201).json({ data: chapter })
  }),
)

router.patch(
  '/:chapterId',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { chapterId } = await parse(chapterIdParams, req.params)
    access.requireCanUpdateContent()
    const data = await parse(UpdateChapterSchema, req.body)
    const chapter = await updateChapter({ db }, chapterId, data)
    res.status(200).json({ data: chapter })
  }),
)

export default router
