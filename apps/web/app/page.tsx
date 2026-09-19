import { RootRedirect } from '@/components/root-redirect'

/**
 * `/` — the front door. Nobody lives here: it sends a signed-in person to their course (or asks which,
 * if they have several). proxy.ts sends anyone without a session to /login before this renders.
 */
export default function RootPage() {
  return <RootRedirect />
}
