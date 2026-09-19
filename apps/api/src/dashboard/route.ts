import { Router } from 'express'

import { profileRoute } from '../naradaRoute'
import { getDashboardData } from './service'

const router = Router()

router.get(
  '/',
  profileRoute(async ({ res, db, profile, access, getCourse }) => {
    const course = await getCourse()
    // The dashboard carries the course's track catalogue, so it is course content: the caller has
    // to be part of the course the request names.
    await access.requireCanReadCourseContent(course.id)
    const data = await getDashboardData({ db }, profile.id, profile.name, course.id)
    res.status(200).json({ data })
  }),
)

export default router
