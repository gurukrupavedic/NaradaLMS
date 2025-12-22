import type { Metadata } from "next"
import { DashboardSaasLayout } from "@/components/dashboard-saas"

export const metadata: Metadata = {
  title: "CMSFullForm Dashboard - OpenSource CMS",
  description: "CmsFullForm dashboard build with Next.js and Tailwind CSS",
}

export default function DashboardSaasPage() {
  return <DashboardSaasLayout />
}
