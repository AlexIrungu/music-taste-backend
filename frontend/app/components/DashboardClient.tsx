'use client'

import { useEffect, useRef, useState } from 'react'
import type { PipelineData, MLProfile } from '../dashboard/page'
import Sidebar, { type Section } from './Sidebar'
import GenreRadarChart from './charts/RadarChart'
import TasteMap from './charts/TasteMap'
import MusicPassport from './cards/MusicPassport'
import PlaylistCreator from './PlaylistCreator'

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
  const [activeSection, setActiveSection] = useState<Section>('overview')
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

  // Genre frequency map
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
    <div className="min-h-screen bg-black text-white">
      {/* Sidebar */}
      <Sidebar
        avatar={avatar}
        displayName={profile.display_name}
        activeSection={activeSection}
        onNavigate={setActiveSection}
        timeRange={timeRange}
        onTimeRangeChange={switchRange}
        loading={loading}
      />

      {/* Main content — offset for sidebar */}
      <main className="lg:ml-60 min-h-screen p-6 lg:p-8 pb-28 pt-16 lg:pt-8">

        {/* Loading overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 flex items-center justify-center">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl px-8 py-5 text-center">
              <p className="text-pink-500 text-xs font-mono uppercase tracking-widest mb-1">Updating</p>
              <p className="text-white text-sm">{TIME_RANGE_LABELS[timeRange]}</p>
            </div>
          </div>
        )}

        {/* ── OVERVIEW ── */}
        {activeSection === 'overview' && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h1 className="text-2xl font-bold mb-1">Welcome back, {profile.display_name}</h1>
              <p className="text-gray-500 text-sm">Here&apos;s your music identity — {TIME_RANGE_LABELS[timeRange]}</p>
            </div>

            {mlData ? (
              <>
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
              </>
            ) : (
              <div className="bg-gray-900 rounded-2xl p-8 text-center">
                <p className="text-gray-500 text-sm">
                  Not enough listening data to generate your profile yet.
                  <br />
                  Try switching to <strong>All time</strong> for more data, or keep listening!
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── TOP TRACKS ── */}
        {activeSection === 'tracks' && (
          <div className="animate-in fade-in">
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-1">Top Tracks</h1>
              <p className="text-gray-500 text-sm">{tracks.length} tracks — {TIME_RANGE_LABELS[timeRange]}</p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-6">
              <ul className="space-y-2">
                {tracks.map((track, i) => {
                  const isActive = activeTrackId === track.id
                  return (
                    <li key={track.id} className="flex items-center gap-3 group py-1 px-2 rounded-lg hover:bg-gray-800/50 transition-colors">
                      <span className="text-gray-600 text-xs w-6 text-right shrink-0 font-mono">{i + 1}</span>
                      <button
                        onClick={() => handleTrackClick(track.id)}
                        disabled={!deviceId}
                        className="relative shrink-0 w-10 h-10 disabled:cursor-not-allowed"
                      >
                        {track.image && (
                          <img src={track.image} alt={track.album} className="w-10 h-10 rounded" />
                        )}
                        <span className="absolute inset-0 flex items-center justify-center bg-black/60 rounded opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs pointer-events-none">
                          {isActive && !isPaused ? '⏸' : '▶'}
                        </span>
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium truncate ${isActive ? 'text-pink-400' : ''}`}>
                          {track.name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{track.artists.join(', ')}</p>
                      </div>
                      <span className="text-xs text-gray-600 shrink-0">{track.album}</span>
                      <span className="text-xs text-gray-600 shrink-0 w-8 text-right">{track.popularity}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        )}

        {/* ── TOP ARTISTS ── */}
        {activeSection === 'artists' && (
          <div className="animate-in fade-in">
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-1">Top Artists</h1>
              <p className="text-gray-500 text-sm">{top_artists.length} artists — {TIME_RANGE_LABELS[timeRange]}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {top_artists.map((artist, i) => (
                <div key={artist.id} className="bg-gray-900 rounded-2xl p-4 flex items-center gap-4 hover:bg-gray-800/70 transition-colors">
                  <span className="text-gray-600 text-lg font-mono w-6 text-right shrink-0">{i + 1}</span>
                  {artist.image ? (
                    <img src={artist.image} alt={artist.name} className="w-14 h-14 rounded-full shrink-0 object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gray-800 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{artist.name}</p>
                    <p className="text-xs text-gray-400 truncate">{artist.genres.slice(0, 3).join(', ') || 'No genres'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-gray-800 rounded-full h-1 max-w-[80px]">
                        <div className="bg-pink-500/70 h-1 rounded-full" style={{ width: `${artist.popularity}%` }} />
                      </div>
                      <span className="text-xs text-gray-600">{artist.popularity}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── GENRE DNA ── */}
        {activeSection === 'genres' && (
          <div className="animate-in fade-in">
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-1">Genre DNA</h1>
              <p className="text-gray-500 text-sm">Your genre fingerprint — {TIME_RANGE_LABELS[timeRange]}</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Genre Fingerprint bars */}
              <div className="bg-gray-900 rounded-2xl p-6">
                <h2 className="text-pink-500 font-semibold text-sm uppercase tracking-widest mb-1">
                  Genre Fingerprint
                </h2>
                <p className="text-gray-500 text-xs mb-5">Based on your top {tracks.length} tracks</p>
                {topGenres.length > 0 ? (
                  <div className="space-y-3">
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

              {/* Radar Chart */}
              <div className="bg-gray-900 rounded-2xl p-6">
                <h2 className="text-pink-500 font-semibold text-sm uppercase tracking-widest mb-1">
                  Genre DNA Radar
                </h2>
                <p className="text-gray-500 text-xs mb-4">Your genre fingerprint as a shape</p>
                {mlData ? (
                  <GenreRadarChart genres={mlData.top_genres} />
                ) : (
                  <p className="text-gray-500 text-sm text-center py-8">Not enough genre data to render radar chart.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── TASTE MAP ── */}
        {activeSection === 'tastemap' && (
          <div className="animate-in fade-in">
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-1">Taste Map</h1>
              <p className="text-gray-500 text-sm">Your top artists plotted in 2D genre space (PCA) — {TIME_RANGE_LABELS[timeRange]}</p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-6">
              {mlData ? (
                <TasteMap points={mlData.taste_map} />
              ) : (
                <p className="text-gray-500 text-sm text-center py-8">Not enough artist data to render taste map.</p>
              )}
            </div>
          </div>
        )}

        {/* ── PASSPORT ── */}
        {activeSection === 'passport' && (
          <div className="animate-in fade-in">
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-1">Music Passport</h1>
              <p className="text-gray-500 text-sm">Your shareable music identity card</p>
            </div>
            {mlData ? (
              <MusicPassport mlProfile={mlData} username={profile.display_name} />
            ) : (
              <div className="bg-gray-900 rounded-2xl p-8 text-center">
                <p className="text-gray-500 text-sm">
                  Not enough data to generate your passport yet.
                  <br />
                  Try switching to <strong>All time</strong> for more data.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── PLAYLIST CREATOR ── */}
        {activeSection === 'playlist' && (
          <div className="animate-in fade-in">
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-1">Playlist Creator</h1>
              <p className="text-gray-500 text-sm">Build a Spotify playlist from your top tracks — {TIME_RANGE_LABELS[timeRange]}</p>
            </div>
            <PlaylistCreator tracks={tracks} timeRangeLabel={TIME_RANGE_LABELS[timeRange]} />
          </div>
        )}
      </main>

      {/* Mini Player — shifted right for sidebar */}
      {deviceId && (
        <div className="fixed bottom-0 left-0 lg:left-60 right-0 bg-gray-900/95 backdrop-blur border-t border-gray-800 px-6 py-3 flex items-center gap-4 z-50">
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
    </div>
  )
}
