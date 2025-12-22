import type { Metadata } from "next"
import { AuthBrandSection } from "@/components/auth/auth-brand-section"
import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = {
  title: "CMSFullForm Dashboard - OpenSource CMS",
  description: "CmsFullForm dashboard build with Next.js and Tailwind CSS",
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      <AuthBrandSection />
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
