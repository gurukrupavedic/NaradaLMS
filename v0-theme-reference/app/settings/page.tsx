import type { Metadata } from "next"
import Content from "@/components/settings/content"
import Layout from "@/components/cmsfullform/layout"

export const metadata: Metadata = {
  title: "CMSFullForm Dashboard - OpenSource CMS",
  description: "CmsFullForm dashboard build with Next.js and Tailwind CSS",
}

export default function SettingsPage() {
  return (
    <Layout>
      <Content />
    </Layout>
  )
}
