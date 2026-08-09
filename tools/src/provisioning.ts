import Enquirer from 'enquirer'

import { publicDb } from '@narada/db'

// A plain existence-and-flag check, not a live authentication challenge — the real authorization
// boundary is already having shell access to run these scripts (DATABASE_URL, decrypted .env).
// Deliberately independent of whichever end-user login mechanism (email/password, OTP) is
// currently live, so this can be adopted for CLI operator checks ahead of the rest of phone-based
// auth landing.
export async function requireSuperAdminByPhone(phoneNumber: string) {
  const row = await publicDb.query.user.findFirst({
    where: (t, { eq }) => eq(t.phoneNumber, phoneNumber),
  })

  if (!row?.isSuperAdmin) {
    throw new Error(`No super-admin account found for phone number: ${phoneNumber}`)
  }

  return row
}

export async function promptSuperAdminPhone(): Promise<string> {
  const { phoneNumber } = await Enquirer.prompt<{ phoneNumber: string }>([
    {
      type: 'input',
      name: 'phoneNumber',
      message: 'Super-admin phone number (E.164, e.g. +15551234567)',
      required: true,
      result: (v: string) => v.trim(),
    },
  ])

  return phoneNumber
}
