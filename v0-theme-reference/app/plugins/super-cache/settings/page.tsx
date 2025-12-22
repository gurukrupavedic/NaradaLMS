import type { Metadata } from "next"
import { SuperCacheSettings } from "@/components/plugins/super-cache/settings"

export const metadata: Metadata = {
  title: "CMSFullForm Dashboard - OpenSource CMS",
  description: "CmsFullForm dashboard build with Next.js and Tailwind CSS",
}

export default function SuperCacheSettingsPage() {
  return <SuperCacheSettings />
}
