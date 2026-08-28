import twilio from 'twilio'

export type TwilioConfig = {
  accountSid: string
  authToken: string
  verifyServiceSid: string
}

export async function startVerification(phoneNumber: string, config: TwilioConfig): Promise<void> {
  const client = twilio(config.accountSid, config.authToken)
  await client.verify.v2.services(config.verifyServiceSid).verifications.create({
    to: phoneNumber,
    channel: 'sms',
  })
}

// Twilio 404s (error code 20404) when there's no pending verification for the phone number —
// expired, already consumed, or never started — rather than reporting it as a failed check, so
// that case is treated the same as an incorrect code instead of propagating as a server error.
export async function checkVerification(
  phoneNumber: string,
  code: string,
  config: TwilioConfig,
): Promise<boolean> {
  const client = twilio(config.accountSid, config.authToken)
  try {
    const check = await client.verify.v2
      .services(config.verifyServiceSid)
      .verificationChecks.create({ to: phoneNumber, code })
    return check.status === 'approved'
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
      return false
    }
    throw error
  }
}
