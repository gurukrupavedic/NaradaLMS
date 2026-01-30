import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import "@narada/ui/styles";
import "./globals.css";

export const metadata: Metadata = {
  title: "Narada LMS - Student Portal",
  description: "Learning Management System for Vedic Studies",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Runtime environment injection (populated by Docker entrypoint) */}
        <script src="/env-config.js" async />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
