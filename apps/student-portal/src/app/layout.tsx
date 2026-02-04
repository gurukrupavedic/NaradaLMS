import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@narada/ui/src/globals.css"; // Use shared globals
import "./globals.css"; // Local globals (Fonts)

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Narada LMS",
  description: "A comprehensive Vedic learning platform.",
  icons: {
    icon: [
      { url: '/favicon-symbol-light.svg', media: '(prefers-color-scheme: light)' },
      { url: '/favicon-symbol-dark.svg', media: '(prefers-color-scheme: dark)' },
    ],
  },
};

import Providers from "@/components/providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
