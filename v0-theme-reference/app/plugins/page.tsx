import type { Metadata } from "next"
import Layout from "@/components/cmsfullform/layout"
import Content from "@/components/plugins/content"

export const metadata: Metadata = {
  title: "CMSFullForm Dashboard - OpenSource CMS",
  description: "CmsFullForm dashboard build with Next.js and Tailwind CSS",
}

export default function PluginsPage() {
  return (
    <Layout>
      <Content />
    </Layout>
  )
}
