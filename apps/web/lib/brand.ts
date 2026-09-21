/**
 * The wordmark copy shared by the coming-soon page (app/coming-soon/page.tsx) and the sign-in
 * cover (app/login/page.tsx), so the two say the same thing and can't drift apart — edit it here.
 */

/** The opening verse of the Rāmāyaṇa, one line per entry. */
export const SHLOKA = [
  'तपःस्वाध्यायनिरतं तपस्वी वाग्विदां वरम् ।',
  'नारदं परिपप्रच्छ वाल्मीकिर्मुनिपुङ्गवम् ॥',
] as const

/** Its translation — rendered between curly quotes by the caller. */
export const SHLOKA_TRANSLATION =
  'Sage Vālmīki approached Devarṣi Nārada—the great sage devoted to Tapas and Svādhyāya, and foremost among the wise.'

export const TAGLINE = 'Adhyayana, Anuṣṭhāna, Avagāhana · Est. 2017'
