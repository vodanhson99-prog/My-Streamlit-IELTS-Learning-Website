import { Metadata } from "next"
import { SettingsPageComponent } from "@/components/settings/settings-page"

export const metadata: Metadata = {
  title: "Settings | IELTS with RBS",
  description: "Manage learning preferences, AI writing tutor options, and local data storage.",
}

export default function SettingsPage() {
  return <SettingsPageComponent />
}
