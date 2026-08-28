import { env } from '@narada/env'

import { startVerification, checkVerification } from './twilio'

const DEV_CODE_LENGTH = 6
const DEV_OTP_TTL_MS = 5 * 60 * 1000

// Twilio Verify owns code generation and verification in production, so there's nothing local to
// check against when USE_TWILIO_API is off. This dev-only store stands in for that so sign-in
// works locally without a real Twilio account.
const devCodesByPhoneNumber = new Map<string, { code: string; expiresAt: number }>()

function generateDevCode(): string {
  return Math.floor(Math.random() * 10 ** DEV_CODE_LENGTH)
    .toString()
    .padStart(DEV_CODE_LENGTH, '0')
}

export async function sendOtpMessage(phoneNumber: string): Promise<void> {
  if (!env.USE_TWILIO_API) {
    const code = generateDevCode()
    devCodesByPhoneNumber.set(phoneNumber, { code, expiresAt: Date.now() + DEV_OTP_TTL_MS })
    // TODO: inject logger interface to allow Pino logging from app.
    console.log(`[otp] USE_TWILIO_API is false, not sending — OTP ${code} for ${phoneNumber}`)
    return
  }

  await startVerification(phoneNumber, {
    accountSid: env.TWILIO.ACCOUNT_SID,
    authToken: env.TWILIO.AUTH_TOKEN,
    verifyServiceSid: env.TWILIO.VERIFY_SERVICE_SID,
  })
}

export async function verifyOtpCode(phoneNumber: string, code: string): Promise<boolean> {
  if (!env.USE_TWILIO_API) {
    const entry = devCodesByPhoneNumber.get(phoneNumber)
    if (!entry || entry.expiresAt < Date.now()) return false
    const isMatch = entry.code === code
    if (isMatch) devCodesByPhoneNumber.delete(phoneNumber)
    return isMatch
  }

  return checkVerification(phoneNumber, code, {
    accountSid: env.TWILIO.ACCOUNT_SID,
    authToken: env.TWILIO.AUTH_TOKEN,
    verifyServiceSid: env.TWILIO.VERIFY_SERVICE_SID,
  })
}
