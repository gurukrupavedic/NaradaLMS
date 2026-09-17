import { env } from '@narada/env'

import { startVerification } from './twilio'

const OTP_CODE_LENGTH = 6
const OTP_TTL_MS = 5 * 60 * 1000

// We generate and own the OTP code ourselves rather than letting Twilio Verify generate one, so
// there's a single comparison path in both dev (no Twilio account, never sent anywhere) and prod
// (same code, also sent via Twilio as a `customCode` SMS).
const pendingCodesByPhoneNumber = new Map<string, { code: string; expiresAt: number }>()

function generateOtpCode(): string {
  return Math.floor(Math.random() * 10 ** OTP_CODE_LENGTH)
    .toString()
    .padStart(OTP_CODE_LENGTH, '0')
}

export async function sendOtpMessage(phoneNumber: string): Promise<void> {
  const code = generateOtpCode()
  pendingCodesByPhoneNumber.set(phoneNumber, { code, expiresAt: Date.now() + OTP_TTL_MS })

  if (!env.USE_TWILIO_API) {
    // TODO: inject logger interface to allow Pino logging from app.
    console.log(`[otp] USE_TWILIO_API is false, not sending — OTP ${code} for ${phoneNumber}`)
    return
  }

  await startVerification(phoneNumber, code, {
    accountSid: env.TWILIO.ACCOUNT_SID,
    authToken: env.TWILIO.AUTH_TOKEN,
    verifyServiceSid: env.TWILIO.VERIFY_SERVICE_SID,
  })
}

export async function verifyOtpCode(phoneNumber: string, code: string): Promise<boolean> {
  const entry = pendingCodesByPhoneNumber.get(phoneNumber)
  if (!entry || entry.expiresAt < Date.now()) return false
  const isMatch = entry.code === code
  if (isMatch) pendingCodesByPhoneNumber.delete(phoneNumber)
  return isMatch
}
