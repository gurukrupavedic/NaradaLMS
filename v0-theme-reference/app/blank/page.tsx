import type { Metadata } from "next"
import Layout from "@/components/cmsfullform/layout"
import { BlankContent } from "@/components/blank"

export const metadata: Metadata = {
  title: "CMSFullForm Dashboard - OpenSource CMS",
  description: "CmsFullForm dashboard build with Next.js and Tailwind CSS",
}

export default function BlankPage() {
  return (
    <Layout>
      <BlankContent />
    </Layout>
  )
}
