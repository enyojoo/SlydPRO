import RecentPresentationsClient from "./RecentPresentationsClient"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Recent Presentations - SlydPRO",
  description:
    "SlydPRO is a platform that lets you design pitch decks and presentation slides by chatting with AI to save time and create something presentable.",
}

export default function RecentPresentationsPage() {
  return <RecentPresentationsClient />
}
