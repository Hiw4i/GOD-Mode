import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import { APP_VERSION } from "@/lib/version";
import "lenis/dist/lenis.css";
import "./globals.css";

const spaceGrotesk = localFont({
  src: "./fonts/space-grotesk-latin.woff2",
  variable: "--font-space",
  display: "swap",
  weight: "300 700",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "GOD Mode — Free Premium Forever",
  description: "A cinematic deep-focus system built to protect your attention.",
  icons: { icon: "/sources/Icon_rounded.png" },
  openGraph: {
    type: "website",
    title: "GOD Mode — Deep Focus System",
    description: "A cinematic deep-focus system built to protect your attention.",
    images: [{ url: "/og-god-mode.png", width: 1200, height: 630, alt: "GOD MODE — Deep Focus System" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "GOD Mode — Deep Focus System",
    description: "A cinematic deep-focus system built to protect your attention.",
    images: ["/og-god-mode.png"],
  },
  other: {
    "application-version": APP_VERSION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetBrainsMono.variable}`} data-app-version={APP_VERSION}>
      <body>
        <Script id="weak-device-detect" strategy="beforeInteractive">
          {`try{var n=navigator,c=n.hardwareConcurrency||8,m=n.deviceMemory||8;if(c<=2||(c<=4&&m<=4)){document.documentElement.setAttribute('data-no-blur','')}}catch(e){}`}
        </Script>
        {children}
      </body>
    </html>
  );
}
