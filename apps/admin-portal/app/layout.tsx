import type { Metadata } from "next";
import "@narada/ui/styles";
import "./globals.css";

export const metadata: Metadata = {
  title: "Narada LMS - Admin Portal",
  description: "Administrative portal for managing courses and students",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
