'use client'

import { useState } from 'react'

export type Section =
  | 'overview'
  | 'tracks'
  | 'artists'
  | 'genres'
  | 'tastemap'
  | 'passport'
  | 'playlist'

type NavItem = {
  id: Section
  label: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: '◈' },
  { id: 'tracks', label: 'Top Tracks', icon: '♫' },
  { id: 'artists', label: 'Top Artists', icon: '★' },
  { id: 'genres', label: 'Genre DNA', icon: '◉' },
  { id: 'tastemap', label: 'Taste Map', icon: '⊛' },
  { id: 'passport', label: 'Passport', icon: '▣' },
  { id: 'playlist', label: 'Playlist', icon: '⊕' },
]

type TimeRange = 'short_term' | 'medium_term' | 'long_term'

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  short_term: '4 weeks',
  medium_term: '6 months',
  long_term: 'All time',
}

type Props = {
  avatar: string | undefined
  displayName: string
  activeSection: Section
  onNavigate: (section: Section) => void
  timeRange: TimeRange
  onTimeRangeChange: (range: TimeRange) => void
  loading: boolean
}

export default function Sidebar({
  avatar,
  displayName,
  activeSection,
  onNavigate,
  timeRange,
  onTimeRangeChange,
  loading,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const navContent = (
    <>
      {/* Profile */}
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center gap-3 mb-4">
          {avatar && (
            <img src={avatar} alt={displayName} className="w-10 h-10 rounded-full" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{displayName}</p>
            <p className="text-pink-500 text-[10px] font-mono uppercase tracking-widest">Music Taste DNA</p>
          </div>
        </div>

        {/* Time range selector */}
        <div className="space-y-1">
          {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => onTimeRangeChange(range)}
              disabled={loading}
              className={`w-full text-left text-xs px-3 py-1.5 rounded-lg transition-colors ${
                timeRange === range
                  ? 'bg-pink-500/15 text-pink-400 font-medium'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
              }`}
            >
              {TIME_RANGE_LABELS[range]}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              onNavigate(item.id)
              setMobileOpen(false)
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
              activeSection === item.id
                ? 'bg-pink-500/15 text-pink-400 font-medium'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            <span>{item.label}</span>
            {activeSection === item.id && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-pink-500" />
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <a
          href="/"
          className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          <span>←</span>
          <span>Sign out</span>
        </a>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-gray-900 border border-gray-800 rounded-xl p-2.5 text-gray-400 hover:text-white transition-colors"
        aria-label="Toggle menu"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          {mobileOpen ? (
            <path d="M5 5l10 10M15 5L5 15" />
          ) : (
            <path d="M3 5h14M3 10h14M3 15h14" />
          )}
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — desktop: always visible, mobile: slide in */}
      <aside
        className={`fixed top-0 left-0 h-full w-60 bg-gray-950 border-r border-gray-800 flex flex-col z-40 transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {navContent}
      </aside>
    </>
  )
}
