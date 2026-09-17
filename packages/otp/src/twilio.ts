import twilio from 'twilio'

export type TwilioConfig = {
  accountSid: string
  authToken: string
  verifyServiceSid: string
}

export async function startVerification(phoneNumber: string, code: string, config: TwilioConfig): Promise<void> {
  const client = twilio(config.accountSid, config.authToken)
  await client.verify.v2.services(config.verifyServiceSid).verifications.create({
    to: phoneNumber,
    channel: 'sms',
    customCode: code,
  })
}
