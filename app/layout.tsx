import type { Metadata, Viewport } from "next";
import { Onest, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavigationWrapper from "@/components/NavigationWrapper";
import Providers from "@/components/Providers";
import PageTransition from "@/components/PageTransition";
import SplashScreen from "@/components/SplashScreen";
import ServiceWorkerUpdateListener from "@/components/ServiceWorkerUpdateListener";

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
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2563eb" },
    { media: "(prefers-color-scheme: dark)", color: "#2563eb" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `if(window.matchMedia('(display-mode: standalone)').matches||navigator.standalone){document.documentElement.classList.add('pwa-standalone');}`,
          }}
        />
        <meta name="theme-color" content="#2563eb" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
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
          <ServiceWorkerUpdateListener />
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
