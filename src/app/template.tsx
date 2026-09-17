"use client"

import { usePathname } from "next/navigation"
import { PageTransition } from "@/components/ielts/page-transition"
import type { ReactNode } from "react"

export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return <PageTransition transitionKey={pathname}>{children}</PageTransition>
}
