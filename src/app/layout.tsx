import type { Metadata } from "next"
import { Albert_Sans, Alumni_Sans, JetBrains_Mono } from "next/font/google"
import { PracticeNavbar } from "@/components/ielts/practice-navbar"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const albertSans = Albert_Sans({
  variable: "--font-albert-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
})

const alumniSans = Alumni_Sans({
  variable: "--font-alumni-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "IELTS Practice Documentation & System",
  description:
    "Developer-grade IELTS preparation platform with test catalogs, band conversion, instant feedback, and progress diagnostics.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${albertSans.variable} ${alumniSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground antialiased selection:bg-foreground selection:text-background">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PracticeNavbar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
