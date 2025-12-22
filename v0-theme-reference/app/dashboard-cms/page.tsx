import type { Metadata } from "next"
import Content from "@/components/dashboard-cms/content"
import Layout from "@/components/cmsfullform/layout"

export const metadata: Metadata = {
  title: "CMSFullForm Dashboard - OpenSource CMS",
  description: "CmsFullForm dashboard build with Next.js and Tailwind CSS",
}

export default function DashboardCMSPage() {
  return (
    <Layout>
      <Content />
    </Layout>
  )
}
