import type { Metadata, Viewport } from "next";
import { Onest, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavigationWrapper from "@/components/NavigationWrapper";
import Providers from "@/components/Providers";
import PageTransition from "@/components/PageTransition";
import SplashScreen from "@/components/SplashScreen";

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Boodschapp",
  description: "Samen boodschappen doen met je huishouden",
  manifest: "/manifest.json",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#ffffff" },
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Boodschapp",
  },
  other: {
    // Resource hints for performance
    'preconnect-supabase': 'https://medmrhmuhghcozfydxov.supabase.co',
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <head>
        <link rel="preconnect" href="https://medmrhmuhghcozfydxov.supabase.co" />
        <link rel="dns-prefetch" href="https://medmrhmuhghcozfydxov.supabase.co" />
        <link rel="apple-touch-icon" href="/icon-180x180.png" sizes="180x180" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/icon-512x512.png" sizes="512x512" />
      </head>
      <body
        className={`${onest.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <SplashScreen />
          <PageTransition>
            {children}
          </PageTransition>
          <NavigationWrapper />
        </Providers>
      </body>
    </html>
  );
}
