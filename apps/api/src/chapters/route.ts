import { Router } from 'express'
import * as z from 'zod'

import { optionalProfileRoute } from '../naradaRoute'
import { parse } from '../utils/validate'
import {
  createAudioAsset,
  createAudioUpload,
  createChapter,
  deleteAudioAsset,
  findByIdForReader,
  setAudioMappings,
  updateChapter,
} from './service'
import {
  CreateAudioAssetSchema,
  CreateAudioUploadSchema,
  CreateChapterSchema,
  SetAudioMappingsSchema,
  UpdateChapterSchema,
} from './schema'

const router = Router()

const chapterIdParams = z.object({ chapterId: z.uuid() })
const audioIdParams = chapterIdParams.extend({ audioId: z.uuid() })

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

router.post(
  '/:chapterId/audio/presign',
  optionalProfileRoute(async ({ req, res, db, access, school, user }) => {
    const { chapterId } = await parse(chapterIdParams, req.params)
    access.requireCanUpdateContent()
    const data = await parse(CreateAudioUploadSchema, req.body)
    const result = await createAudioUpload({ db }, chapterId, user.id, school.slug, data)
    res.status(201).json({ data: result })
  }),
)

router.post(
  '/:chapterId/audio',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { chapterId } = await parse(chapterIdParams, req.params)
    access.requireCanUpdateContent()
    const data = await parse(CreateAudioAssetSchema, req.body)
    const asset = await createAudioAsset({ db }, chapterId, data)
    res.status(201).json({ data: asset })
  }),
)

router.put(
  '/:chapterId/audio/:audioId/mappings',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { chapterId, audioId } = await parse(audioIdParams, req.params)
    access.requireCanUpdateContent()
    const data = await parse(SetAudioMappingsSchema, req.body)
    const asset = await setAudioMappings({ db }, chapterId, audioId, data)
    res.status(200).json({ data: asset })
  }),
)

router.delete(
  '/:chapterId/audio/:audioId',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { chapterId, audioId } = await parse(audioIdParams, req.params)
    access.requireCanUpdateContent()
    await deleteAudioAsset({ db }, chapterId, audioId)
    res.status(204).send()
  }),
)

export default router
