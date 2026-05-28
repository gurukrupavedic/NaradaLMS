import { z } from 'zod'

export const userIdSchema = z.string().min(1)
