import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavigationWrapper from "@/components/NavigationWrapper";
import Providers from "@/components/Providers";
import PageTransition from "@/components/PageTransition";
import SplashScreen from "@/components/SplashScreen";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap', // Prevent FOIT (Flash of Invisible Text)
  preload: true, // Preload critical font
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
  preload: false, // Not critical, don't preload
});

export const metadata: Metadata = {
  title: "Boodschapp - Slimme Boodschappen App",
  description: "Samen boodschappen doen met je huishouden",
  manifest: "/manifest.json",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9fafb" },
    { media: "(prefers-color-scheme: dark)", color: "#f9fafb" },
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
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
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
