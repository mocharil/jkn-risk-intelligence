import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "JKN Risk Intelligence — BPJS Kesehatan AI Suite",
  description: "AI-Powered Healthcare Claim Risk Detection & Investigation Platform for Indonesia",
  icons: {
    icon: "/arsa_logo.png",
    shortcut: "/arsa_logo.png",
    apple: "/arsa_logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link rel="icon" href="/arsa_logo.png" sizes="any" />
      </head>
      <body className={`${plusJakarta.className} antialiased selection:bg-bpjs/20 selection:text-bpjs-dark`}>
        {children}
      </body>
    </html>
  );
}
