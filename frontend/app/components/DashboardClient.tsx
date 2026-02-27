'use client'

import { useEffect, useRef, useState } from 'react'
import type { PipelineData, MLProfile } from '../dashboard/page'
import GenreRadarChart from './charts/RadarChart'
import TasteMap from './charts/TasteMap'
import MusicPassport from './cards/MusicPassport'

declare global {
  interface Window {
    Spotify: {
      Player: new (options: {
        name: string
        getOAuthToken: (cb: (token: string) => void) => void
        volume?: number
      }) => SpotifyPlayerInstance
    }
    onSpotifyWebPlaybackSDKReady: () => void
  }
}

interface SpotifyPlayerInstance {
  connect: () => Promise<boolean>
  disconnect: () => void
  togglePlay: () => Promise<void>
  nextTrack: () => Promise<void>
  previousTrack: () => Promise<void>
  addListener: (event: string, cb: (data: any) => void) => boolean
  removeListener: (event: string) => boolean
}

type NowPlaying = {
  id: string
  name: string
  artists: string[]
  image: string | null
}

type TimeRange = 'short_term' | 'medium_term' | 'long_term'

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  short_term: 'Last 4 weeks',
  medium_term: 'Last 6 months',
  long_term: 'All time',
}

export default function DashboardClient({
  data,
  mlProfile,
  token,
}: {
  data: PipelineData
  mlProfile: MLProfile | null
  token: string
}) {
  const [timeRange, setTimeRange] = useState<TimeRange>('medium_term')
  const [pipelineData, setPipelineData] = useState<PipelineData>(data)
  const [mlData, setMlData] = useState<MLProfile | null>(mlProfile)
  const [loading, setLoading] = useState(false)

  const { profile } = pipelineData
  const { tracks, top_artists } = pipelineData
  const avatar = profile.images?.[0]?.url

  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null)
  const [isPaused, setIsPaused] = useState(true)
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null)
  const playerRef = useRef<SpotifyPlayerInstance | null>(null)

  const switchRange = async (range: TimeRange) => {
    if (range === timeRange || loading) return
    setLoading(true)
    setTimeRange(range)
    try {
      const [pipelineRes, mlRes] = await Promise.all([
        fetch(`/api/pipeline?range=${range}`),
        fetch(`/api/ml-profile?range=${range}`),
      ])
      if (pipelineRes.ok) setPipelineData(await pipelineRes.json())
      if (mlRes.ok) setMlData(await mlRes.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: 'Music Taste DNA',
        getOAuthToken: (cb) => cb(token),
        volume: 0.5,
      })

      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        setDeviceId(device_id)
      })

      player.addListener('player_state_changed', (state: any) => {
        if (!state) return
        const t = state.track_window.current_track
        setNowPlaying({
          id: t.id,
          name: t.name,
          artists: t.artists.map((a: any) => a.name),
          image: t.album.images[0]?.url ?? null,
        })
        setActiveTrackId(t.id)
        setIsPaused(state.paused)
      })

      player.connect()
      playerRef.current = player
    }

    const script = document.createElement('script')
    script.src = 'https://sdk.scdn.co/spotify-player.js'
    script.async = true
    document.body.appendChild(script)

    return () => {
      playerRef.current?.disconnect()
      if (document.body.contains(script)) document.body.removeChild(script)
    }
  }, [token])

  const playTrack = async (trackId: string) => {
    if (!deviceId) return
    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris: [`spotify:track:${trackId}`] }),
    })
  }

  const handleTrackClick = async (trackId: string) => {
    if (activeTrackId === trackId) {
      await playerRef.current?.togglePlay()
    } else {
      await playTrack(trackId)
    }
  }

  // Genre frequency map from track data (for the fingerprint bars)
  const genreCount: Record<string, number> = {}
  for (const track of tracks) {
    for (const genre of track.genres) {
      genreCount[genre] = (genreCount[genre] ?? 0) + 1
    }
  }
  const topGenres = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
  const maxGenreCount = topGenres[0]?.[1] ?? 1

  return (
    <main className="min-h-screen bg-black text-white p-8 pb-28">

      {/* Header */}
      <div className="flex items-center gap-4 mb-10">
        {avatar && (
          <img src={avatar} alt={profile.display_name} className="w-12 h-12 rounded-full" />
        )}
        <div>
          <p className="text-gray-400 text-sm">Logged in as</p>
          <h1 className="text-xl font-semibold">{profile.display_name}</h1>
        </div>
        <div className="ml-auto flex flex-col items-end gap-2">
          <p className="text-pink-500 text-xs font-mono uppercase tracking-widest">Music Taste DNA</p>
          {/* Time range toggle */}
          <div className="flex gap-1 bg-gray-900 rounded-full p-1">
            {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => switchRange(range)}
                disabled={loading}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${
                  timeRange === range
                    ? 'bg-pink-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {TIME_RANGE_LABELS[range]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl px-8 py-5 text-center">
            <p className="text-pink-500 text-xs font-mono uppercase tracking-widest mb-1">Updating</p>
            <p className="text-white text-sm">{TIME_RANGE_LABELS[timeRange]}</p>
          </div>
        </div>
      )}

      {/* ── ML Profile ── */}
      {mlData && (
        <div className="mb-6 space-y-4">

          {/* Archetype card */}
          <div className="bg-gradient-to-br from-pink-950/60 to-gray-900 border border-pink-900/40 rounded-2xl p-6">
            <p className="text-pink-500 text-xs font-mono uppercase tracking-widest mb-3">Your Archetype</p>
            <div className="flex items-start gap-4">
              <span className="text-5xl leading-none">{mlData.archetype.emoji}</span>
              <div>
                <h2 className="text-2xl font-bold mb-1">{mlData.archetype.name}</h2>
                <p className="text-gray-300 text-sm leading-relaxed">{mlData.archetype.description}</p>
                {mlData.archetype.confidence > 0 && (
                  <p className="text-gray-600 text-xs mt-2">
                    {mlData.archetype.confidence}% genre match
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Stat cards row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* Mainstream score */}
            <div className="bg-gray-900 rounded-2xl p-5">
              <p className="text-pink-500 text-xs font-mono uppercase tracking-widest mb-2">Mainstream Score</p>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-3xl font-bold">{mlData.mainstream.score}</span>
                <span className="text-gray-500 text-sm mb-1">/ 100</span>
                <span className="ml-auto text-xs font-medium text-pink-400 bg-pink-950/50 px-2 py-0.5 rounded-full">
                  {mlData.mainstream.label}
                </span>
              </div>
              {/* Score bar */}
              <div className="w-full bg-gray-800 rounded-full h-1.5 mb-3">
                <div
                  className="bg-pink-500 h-1.5 rounded-full"
                  style={{ width: `${mlData.mainstream.score}%` }}
                />
              </div>
              <p className="text-gray-500 text-xs">{mlData.mainstream.description}</p>
            </div>

            {/* Era profile */}
            <div className="bg-gray-900 rounded-2xl p-5">
              <p className="text-pink-500 text-xs font-mono uppercase tracking-widest mb-2">Era Profile</p>
              <p className="text-3xl font-bold mb-1">{mlData.era.dominant_decade}</p>
              <p className="text-gray-500 text-xs mb-3">{mlData.era.description}</p>
              <div className="space-y-1.5">
                {Object.entries(mlData.era.distribution).map(([decade, pct]) => (
                  <div key={decade} className="flex items-center gap-2">
                    <span className="text-gray-500 text-xs w-12 shrink-0">{decade}</span>
                    <div className="flex-1 bg-gray-800 rounded-full h-1">
                      <div
                        className="bg-pink-500/70 h-1 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-gray-600 text-xs w-8 text-right">{pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Diversity */}
            <div className="bg-gray-900 rounded-2xl p-5">
              <p className="text-pink-500 text-xs font-mono uppercase tracking-widest mb-2">Taste Diversity</p>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-3xl font-bold">{Math.round(mlData.diversity.score * 100)}</span>
                <span className="text-gray-500 text-sm mb-1">/ 100</span>
                <span className="ml-auto text-xs font-medium text-pink-400 bg-pink-950/50 px-2 py-0.5 rounded-full">
                  {mlData.diversity.label}
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1.5 mb-3">
                <div
                  className="bg-pink-500 h-1.5 rounded-full"
                  style={{ width: `${mlData.diversity.score * 100}%` }}
                />
              </div>
              <p className="text-gray-500 text-xs">{mlData.diversity.description}</p>
            </div>

          </div>
        </div>
      )}

      {/* ── Tracks + Artists ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Top Tracks */}
        <div className="bg-gray-900 rounded-2xl p-6">
          <h2 className="text-pink-500 font-semibold text-sm uppercase tracking-widest mb-5">
            Top Tracks
          </h2>
          <ul className="space-y-3">
            {tracks.slice(0, 10).map((track, i) => {
              const isActive = activeTrackId === track.id
              return (
                <li key={track.id} className="flex items-center gap-3 group">
                  <span className="text-gray-600 text-xs w-4 text-right shrink-0">{i + 1}</span>
                  <button
                    onClick={() => handleTrackClick(track.id)}
                    disabled={!deviceId}
                    className="relative shrink-0 w-9 h-9 disabled:cursor-not-allowed"
                  >
                    {track.image && (
                      <img src={track.image} alt={track.album} className="w-9 h-9 rounded" />
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/60 rounded opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs pointer-events-none">
                      {isActive && !isPaused ? '⏸' : '▶'}
                    </span>
                  </button>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${isActive ? 'text-pink-400' : ''}`}>
                      {track.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{track.artists.join(', ')}</p>
                  </div>
                  <span className="ml-auto text-xs text-gray-600 shrink-0">{track.popularity}</span>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Top Artists */}
        <div className="bg-gray-900 rounded-2xl p-6">
          <h2 className="text-pink-500 font-semibold text-sm uppercase tracking-widest mb-5">
            Top Artists
          </h2>
          <ul className="space-y-3">
            {top_artists.slice(0, 10).map((artist, i) => (
              <li key={artist.id} className="flex items-center gap-3">
                <span className="text-gray-600 text-xs w-4 text-right shrink-0">{i + 1}</span>
                {artist.image && (
                  <img src={artist.image} alt={artist.name} className="w-9 h-9 rounded-full shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{artist.name}</p>
                  <p className="text-xs text-gray-400 truncate">{artist.genres.slice(0, 2).join(', ')}</p>
                </div>
                <span className="ml-auto text-xs text-gray-600 shrink-0">{artist.popularity}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Genre Fingerprint ── */}
      <div className="bg-gray-900 rounded-2xl p-6">
        <h2 className="text-pink-500 font-semibold text-sm uppercase tracking-widest mb-1">
          Genre Fingerprint
        </h2>
        <p className="text-gray-500 text-xs mb-5">Based on your top {tracks.length} tracks</p>
        {topGenres.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {topGenres.map(([genre, count]) => (
              <div key={genre}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-300 capitalize">{genre}</span>
                  <span className="text-gray-500">{count} tracks</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5">
                  <div
                    className="bg-pink-500 h-1.5 rounded-full"
                    style={{ width: `${(count / maxGenreCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No genre data available for your top tracks.</p>
        )}
      </div>

      {/* ── Phase 3 Visualisations ── */}
      {mlData && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="bg-gray-900 rounded-2xl p-6">
              <h2 className="text-pink-500 font-semibold text-sm uppercase tracking-widest mb-1">
                Genre DNA Radar
              </h2>
              <p className="text-gray-500 text-xs mb-4">Your genre fingerprint as a shape</p>
              <GenreRadarChart genres={mlData.top_genres} />
            </div>

            <div className="bg-gray-900 rounded-2xl p-6">
              <h2 className="text-pink-500 font-semibold text-sm uppercase tracking-widest mb-1">
                Artist Taste Map
              </h2>
              <p className="text-gray-500 text-xs mb-4">Your top artists in 2D genre space (PCA)</p>
              <TasteMap points={mlData.taste_map} />
            </div>
          </div>

          <div className="mt-6 bg-gray-900 rounded-2xl p-6">
            <h2 className="text-pink-500 font-semibold text-sm uppercase tracking-widest mb-1">
              Music Passport
            </h2>
            <p className="text-gray-500 text-xs mb-6">Your shareable music identity card</p>
            <MusicPassport mlProfile={mlProfile} username={profile.display_name} />
          </div>
        </>
      )}

      {/* Mini Player */}
      {deviceId && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur border-t border-gray-800 px-6 py-3 flex items-center gap-4 z-50">
          {nowPlaying ? (
            <>
              {nowPlaying.image && (
                <img src={nowPlaying.image} alt="" className="w-10 h-10 rounded shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{nowPlaying.name}</p>
                <p className="text-xs text-gray-400 truncate">{nowPlaying.artists.join(', ')}</p>
              </div>
            </>
          ) : (
            <p className="flex-1 text-xs text-gray-500">Click a track to play</p>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={() => playerRef.current?.previousTrack()}
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              ⏮
            </button>
            <button
              onClick={() => playerRef.current?.togglePlay()}
              className="w-8 h-8 rounded-full bg-pink-500 hover:bg-pink-400 flex items-center justify-center text-white transition-colors text-xs"
            >
              {isPaused ? '▶' : '⏸'}
            </button>
            <button
              onClick={() => playerRef.current?.nextTrack()}
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              ⏭
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
