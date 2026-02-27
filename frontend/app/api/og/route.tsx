import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams

  const emoji     = p.get('emoji')     ?? '🌀'
  const name      = p.get('name')      ?? 'Music Taste DNA'
  const username  = p.get('username')  ?? ''
  const score     = p.get('score')     ?? '—'
  const era       = p.get('era')       ?? '—'
  const diversity = p.get('diversity') ?? '—'
  const genres    = (p.get('genres') ?? '').split(',').filter(Boolean).slice(0, 4)

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#0a0a0a',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Top + bottom pink bars */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '5px', background: '#ec4899', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '5px', background: '#ec4899', display: 'flex' }} />

        {/* Header label */}
        <div
          style={{
            position: 'absolute', top: '40px', left: '60px',
            color: '#ec4899', fontSize: '13px',
            letterSpacing: '4px', textTransform: 'uppercase',
            display: 'flex',
          }}
        >
          MUSIC TASTE DNA
        </div>

        {/* Emoji */}
        <div style={{ fontSize: '96px', lineHeight: '1', marginBottom: '20px', display: 'flex' }}>
          {emoji}
        </div>

        {/* Archetype name */}
        <div
          style={{
            color: '#ffffff', fontSize: '54px', fontWeight: '700',
            marginBottom: '10px', display: 'flex',
          }}
        >
          {name}
        </div>

        {/* Username */}
        {username && (
          <div style={{ color: '#6b7280', fontSize: '22px', marginBottom: '44px', display: 'flex' }}>
            @{username}
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '64px', marginBottom: '44px' }}>
          {[
            { label: 'MAINSTREAM', value: score },
            { label: 'ERA', value: era },
            { label: 'TASTE', value: diversity },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ color: '#ec4899', fontSize: '11px', letterSpacing: '3px', marginBottom: '6px', display: 'flex' }}>
                {label}
              </div>
              <div style={{ color: '#ffffff', fontSize: '22px', fontWeight: '600', display: 'flex' }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Genre tags */}
        {genres.length > 0 && (
          <div style={{ display: 'flex', gap: '10px' }}>
            {genres.map((g) => (
              <div
                key={g}
                style={{
                  border: '1px solid #374151',
                  color: '#6b7280',
                  padding: '5px 16px',
                  fontSize: '13px',
                  display: 'flex',
                }}
              >
                {g}
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
