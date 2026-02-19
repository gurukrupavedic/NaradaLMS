import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@narada/ui/src/globals.css"; // Use shared globals
import "./globals.css"; // Local globals (Fonts)
import { Providers } from "@/components/providers";
import { SkipLink } from "@narada/ui";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Narada LMS | Operations",
  description: "Operations Portal for Narada LMS",
  icons: {
    icon: [
      { url: '/favicon-symbol-light.svg', media: '(prefers-color-scheme: light)' },
      { url: '/favicon-symbol-dark.svg', media: '(prefers-color-scheme: dark)' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SkipLink />
        <Providers>
          <main id="main-content">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
