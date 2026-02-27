import type { Metadata } from 'next'
import ShareView, { type SharedProfile } from '../components/ShareView'

type Props = { searchParams: Promise<{ d?: string }> }

function decodeProfile(encoded: string): SharedProfile | null {
  try {
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice((encoded.length * 3) % 4)
    const json = Buffer.from(padded, 'base64').toString('utf8')
    return JSON.parse(json)
  } catch {
    return null
  }
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { d } = await searchParams
  if (!d) return { title: 'Music Taste DNA' }

  const profile = decodeProfile(d)
  if (!profile) return { title: 'Music Taste DNA' }

  const genres = profile.top_genres.slice(0, 4).map((g) => g.genre).join(',')
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://127.0.0.1:3000'
  const ogUrl = `${baseUrl}/api/og?emoji=${encodeURIComponent(profile.archetype.emoji)}&name=${encodeURIComponent(profile.archetype.name)}&username=${encodeURIComponent(profile.username)}&score=${profile.mainstream.score}&era=${encodeURIComponent(profile.era.dominant_decade)}&diversity=${encodeURIComponent(profile.diversity.label)}&genres=${encodeURIComponent(genres)}`

  return {
    title: `${profile.username} is ${profile.archetype.name} — Music Taste DNA`,
    description: profile.archetype.description,
    openGraph: {
      title: `${profile.username} is ${profile.archetype.name}`,
      description: profile.archetype.description,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${profile.username} is ${profile.archetype.name}`,
      description: profile.archetype.description,
      images: [ogUrl],
    },
  }
}

export default async function SharePage({ searchParams }: Props) {
  const { d } = await searchParams

  if (!d) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-500">No profile data found in this link.</p>
      </main>
    )
  }

  const profile = decodeProfile(d)
  if (!profile) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-500">This link appears to be invalid or expired.</p>
      </main>
    )
  }

  return <ShareView profile={profile} />
}
