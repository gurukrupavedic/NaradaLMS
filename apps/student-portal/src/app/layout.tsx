import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@narada/ui/src/globals.css"; // Use shared globals
import "./globals.css"; // Local globals (Fonts)
import { SkipLink } from "@narada/ui";
import Providers from "@/components/providers";
import { getTenantMetadata } from "@/lib/tenant";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = getTenantMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
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
