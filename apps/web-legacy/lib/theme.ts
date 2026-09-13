import { cookies } from 'next/headers'

import { THEME_COOKIE } from '@/lib/constants'
import type { Theme } from '@/components/theme-provider'

export async function readStoredTheme(): Promise<Theme> {
  const cookieStore = await cookies()
  const theme = cookieStore.get(THEME_COOKIE)
  return theme?.value === 'dark' ? 'dark' : 'light'
}
