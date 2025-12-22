import type { Metadata } from "next"
import { AllSiteSEOSettings } from "@/components/plugins/allsite-seo/settings"

export const metadata: Metadata = {
  title: "CMSFullForm Dashboard - OpenSource CMS",
  description: "CmsFullForm dashboard build with Next.js and Tailwind CSS",
}

export default function AllSiteSEOSettingsPage() {
  return <AllSiteSEOSettings />
}
