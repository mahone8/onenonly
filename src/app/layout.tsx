import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "ONENONLY — Premium Caps, Wallets, Bracelets, Glasses & Watches | Faisalabad",
  description:
    "One name, one standard. Shop a tightly edited collection of caps, wallets, bracelets, glasses and watches with cash on delivery across Pakistan. Free delivery over Rs 5,000.",
  keywords: [
    "caps",
    "wallets",
    "bracelets",
    "glasses",
    "sunglasses",
    "watches",
    "accessories",
    "men's fashion",
    "onenonly",
    "faisalabad",
    "cash on delivery",
    "pakistan",
  ],
  authors: [{ name: "ONENONLY" }],
  icons: {
    icon: [
      { url: "/icon.webp", type: "image/webp" },
    ],
    apple: "/icon.webp",
  },
  openGraph: {
    title: "ONENONLY — Details make the difference",
    description:
      "Premium caps, wallets, bracelets, glasses and watches. Cash on delivery across Pakistan, free delivery over Rs 5,000.",
    siteName: "ONENONLY",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster position="bottom-center" richColors />
      </body>
    </html>
  );
}
