import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import DashboardClient from "../components/DashboardClient"

const BACKEND_URL = process.env.BACKEND_URL!

export type Track = {
  id: string
  name: string
  artists: string[]
  album: string
  release_date: string
  image: string | null
  popularity: number
  explicit: boolean
  preview_url: string | null
  genres: string[]
}

export type Artist = {
  id: string
  name: string
  genres: string[]
  popularity: number
  image: string | null
}

export type Profile = {
  display_name: string
  images: { url: string }[]
}

export type PipelineData = {
  profile: Profile
  tracks: Track[]
  top_artists: Artist[]
}

export type MLProfile = {
  archetype: {
    name: string
    emoji: string
    description: string
    top_genres: string[]
    confidence: number
  }
  mainstream: {
    score: number
    label: string
    description: string
  }
  era: {
    dominant_decade: string
    distribution: Record<string, number>
    description: string
  }
  diversity: {
    score: number
    label: string
    description: string
  }
  top_genres: { genre: string; count: number; pct: number }[]
  taste_map: { name: string; x: number; y: number; image: string | null; genres: string[] }[]
}

async function getPipelineData(token: string): Promise<PipelineData | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/spotify/data-pipeline`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

async function getMLProfile(token: string): Promise<MLProfile | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/ml/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get("access_token")?.value

  if (!accessToken) redirect("/")

  // Fetch both in parallel
  const [data, mlProfile] = await Promise.all([
    getPipelineData(accessToken),
    getMLProfile(accessToken),
  ])

  if (!data) redirect("/?error=data_fetch_failed")

  return <DashboardClient data={data} mlProfile={mlProfile} token={accessToken} />
}
