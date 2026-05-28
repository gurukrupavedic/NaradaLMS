import { z } from 'zod'

import { proficiencyLevel } from '@narada/db'

export const proficiencyLevelSchema = z.enum(proficiencyLevel.enumValues)
