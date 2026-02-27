'use client'

import { useState } from 'react'
import type { MLProfile } from '../dashboard/page'

export type SharedProfile = {
  archetype: { name: string; emoji: string; description: string }
  mainstream: { score: number; label: string }
  era: { dominant_decade: string }
  diversity: { label: string; score: number }
  top_genres: { genre: string; pct: number; count: number }[]
  username: string
}

function computeCompatibility(
  genresA: { genre: string; pct: number }[],
  genresB: { genre: string; pct: number }[],
): { score: number; label: string; description: string } {
  const mapA = Object.fromEntries(genresA.map((g) => [g.genre, g.pct]))
  const mapB = Object.fromEntries(genresB.map((g) => [g.genre, g.pct]))
  const all = new Set([...Object.keys(mapA), ...Object.keys(mapB)])

  let dot = 0, magA = 0, magB = 0
  for (const g of all) {
    const a = mapA[g] ?? 0
    const b = mapB[g] ?? 0
    dot += a * b
    magA += a * a
    magB += b * b
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  const score = denom > 0 ? Math.round((dot / denom) * 100) : 0

  if (score >= 75) return { score, label: 'Musical Soulmates',       description: "You're practically listening to the same playlist. Uncanny." }
  if (score >= 50) return { score, label: 'Overlapping Tastes',      description: "Solid common ground — you'd have a great time sharing music." }
  if (score >= 25) return { score, label: 'Different but Curious',   description: "Your sounds don't fully overlap, but there's interesting crossover." }
  return               { score, label: 'Musical Opposites',          description: "You live on opposite ends of the genre map." }
}

export default function ShareView({ profile }: { profile: SharedProfile }) {
  const [comparing, setComparing] = useState(false)
  const [compat, setCompat] = useState<ReturnType<typeof computeCompatibility> | null>(null)
  const [authNeeded, setAuthNeeded] = useState(false)

  const handleCompare = async () => {
    setComparing(true)
    try {
      const res = await fetch('/api/ml-profile?range=medium_term')
      if (res.status === 401) {
        setAuthNeeded(true)
        return
      }
      if (res.ok) {
        const myData: MLProfile = await res.json()
        setCompat(computeCompatibility(profile.top_genres, myData.top_genres))
      }
    } finally {
      setComparing(false)
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-8 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <p className="text-pink-500 text-xs font-mono uppercase tracking-widest">Music Taste DNA</p>
        <a href="/" className="text-gray-500 hover:text-white text-xs transition-colors">
          Get yours →
        </a>
      </div>

      {/* Archetype card */}
      <div className="bg-gradient-to-br from-pink-950/60 to-gray-900 border border-pink-900/40 rounded-2xl p-6 mb-4">
        <p className="text-pink-500 text-xs font-mono uppercase tracking-widest mb-3">
          {profile.username}'s Archetype
        </p>
        <div className="flex items-start gap-4">
          <span className="text-5xl leading-none">{profile.archetype.emoji}</span>
          <div>
            <h1 className="text-2xl font-bold mb-1">{profile.archetype.name}</h1>
            <p className="text-gray-300 text-sm leading-relaxed">{profile.archetype.description}</p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-gray-900 rounded-2xl p-4">
          <p className="text-pink-500 text-xs font-mono uppercase tracking-widest mb-1">Mainstream</p>
          <p className="text-2xl font-bold">{profile.mainstream.score}</p>
          <p className="text-gray-600 text-xs mt-0.5">{profile.mainstream.label}</p>
        </div>
        <div className="bg-gray-900 rounded-2xl p-4">
          <p className="text-pink-500 text-xs font-mono uppercase tracking-widest mb-1">Era</p>
          <p className="text-2xl font-bold">{profile.era.dominant_decade}</p>
        </div>
        <div className="bg-gray-900 rounded-2xl p-4">
          <p className="text-pink-500 text-xs font-mono uppercase tracking-widest mb-1">Diversity</p>
          <p className="text-2xl font-bold text-base leading-tight pt-1">{profile.diversity.label}</p>
        </div>
      </div>

      {/* Top genres */}
      {profile.top_genres.length > 0 && (
        <div className="bg-gray-900 rounded-2xl p-5 mb-6">
          <p className="text-pink-500 text-xs font-mono uppercase tracking-widest mb-3">Top Genres</p>
          <div className="space-y-2">
            {profile.top_genres.slice(0, 6).map(({ genre, pct }) => (
              <div key={genre}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-300 capitalize">{genre}</span>
                  <span className="text-gray-600">{pct}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5">
                  <div className="bg-pink-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compatibility section */}
      <div className="bg-gray-900 rounded-2xl p-6">
        <p className="text-pink-500 text-xs font-mono uppercase tracking-widest mb-1">
          Taste Compatibility
        </p>
        <p className="text-gray-500 text-xs mb-4">
          Compare your music taste with {profile.username}'s
        </p>

        {compat ? (
          <div>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-4xl font-bold">{compat.score}</span>
              <span className="text-gray-500 text-sm mb-1">/ 100</span>
              <span className="ml-auto text-xs font-medium text-pink-400 bg-pink-950/50 px-2 py-0.5 rounded-full">
                {compat.label}
              </span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-1.5 mb-3">
              <div className="bg-pink-500 h-1.5 rounded-full" style={{ width: `${compat.score}%` }} />
            </div>
            <p className="text-gray-500 text-xs">{compat.description}</p>
          </div>
        ) : authNeeded ? (
          <div>
            <p className="text-gray-400 text-sm mb-3">
              Connect your Spotify to see your compatibility with {profile.username}.
            </p>
            <a
              href="/"
              className="inline-block bg-green-500 hover:bg-green-400 text-black font-semibold text-sm px-5 py-2 rounded-full transition-colors"
            >
              Connect with Spotify
            </a>
          </div>
        ) : (
          <button
            onClick={handleCompare}
            disabled={comparing}
            className="bg-pink-500 hover:bg-pink-400 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-full transition-colors"
          >
            {comparing ? 'Comparing…' : 'Compare with my profile'}
          </button>
        )}
      </div>
    </main>
  )
}
