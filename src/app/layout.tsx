import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "VoteWise — The Voting Operating System",
    template: "%s · VoteWise",
  },
  description:
    "Verifiable, tamper-evident elections for any organization. Encrypted ballots, unlinkable receipts, real-time results, and a hash-chained audit trail.",
  keywords: [
    "VoteWise",
    "elections",
    "voting platform",
    "secure voting",
    "election management",
    "verifiable elections",
    "Africa elections",
  ],
  authors: [{ name: "VoteWise" }],
  openGraph: {
    title: "VoteWise — The Voting Operating System",
    description:
      "Verifiable, tamper-evident elections for any organization. Encrypted ballots, unlinkable receipts, real-time results.",
    type: "website",
    siteName: "VoteWise",
  },
  twitter: {
    card: "summary_large_image",
    title: "VoteWise",
    description: "Verifiable, tamper-evident elections for any organization.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            <a href="#main-content" className="skip-link">
              Skip to content
            </a>
            {children}
            <Toaster richColors closeButton position="bottom-right" />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
