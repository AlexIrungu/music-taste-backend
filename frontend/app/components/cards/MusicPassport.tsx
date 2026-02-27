'use client'

import { useRef, useState } from 'react'
import type { MLProfile } from '../../dashboard/page'
import type { SharedProfile } from '../ShareView'

type Props = {
  mlProfile: MLProfile
  username: string
}

function drawPassport(
  canvas: HTMLCanvasElement,
  mlProfile: MLProfile,
  username: string,
) {
  const ctx = canvas.getContext('2d')!
  const W = canvas.width   // 600
  const H = canvas.height  // 340

  // Background
  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, W, H)

  // Top pink accent bar
  ctx.fillStyle = '#ec4899'
  ctx.fillRect(0, 0, W, 3)

  // Bottom pink accent bar
  ctx.fillStyle = '#ec4899'
  ctx.fillRect(0, H - 3, W, 3)

  // Header label
  ctx.fillStyle = '#ec4899'
  ctx.font = '600 10px monospace'
  ctx.textAlign = 'left'
  ctx.fillText('MUSIC TASTE DNA', 28, 30)

  // Year
  ctx.fillStyle = '#374151'
  ctx.font = '10px monospace'
  ctx.textAlign = 'right'
  ctx.fillText(new Date().getFullYear().toString(), W - 28, 30)

  // Emoji
  ctx.font = '52px serif'
  ctx.textAlign = 'center'
  ctx.fillText(mlProfile.archetype.emoji, W / 2, 102)

  // Archetype name
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 26px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(mlProfile.archetype.name, W / 2, 145)

  // Username
  ctx.fillStyle = '#9ca3af'
  ctx.font = '13px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`@${username}`, W / 2, 168)

  // Divider
  ctx.strokeStyle = '#1f2937'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(28, 186)
  ctx.lineTo(W - 28, 186)
  ctx.stroke()

  // Stats row
  const stats = [
    { label: 'MAINSTREAM', value: `${mlProfile.mainstream.score}` },
    { label: 'ERA', value: mlProfile.era.dominant_decade },
    { label: 'DIVERSITY', value: mlProfile.diversity.label.toUpperCase() },
  ]
  const colW = (W - 56) / 3
  stats.forEach((stat, i) => {
    const x = 28 + colW * i + colW / 2
    ctx.fillStyle = '#ec4899'
    ctx.font = '600 9px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(stat.label, x, 212)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 15px sans-serif'
    ctx.fillText(stat.value, x, 234)
  })

  // Genre tags
  const genres = mlProfile.top_genres.slice(0, 4).map((g) => g.genre)
  const tagH = 22
  const tagPadX = 12
  ctx.font = '10px monospace'

  // Measure total width to centre the row
  const tagWidths = genres.map((g) => {
    const label = g.length > 13 ? g.slice(0, 12) + '…' : g
    return ctx.measureText(label).width + tagPadX * 2
  })
  const gap = 8
  const totalW = tagWidths.reduce((a, b) => a + b, 0) + gap * (genres.length - 1)
  let tagX = (W - totalW) / 2

  genres.forEach((genre, i) => {
    const label = genre.length > 13 ? genre.slice(0, 12) + '…' : genre
    const tw = tagWidths[i]
    const tagY = 256

    ctx.strokeStyle = '#4b5563'
    ctx.lineWidth = 1
    ctx.strokeRect(tagX, tagY, tw, tagH)

    ctx.fillStyle = '#9ca3af'
    ctx.textAlign = 'center'
    ctx.fillText(label, tagX + tw / 2, tagY + 14)

    tagX += tw + gap
  })

  // Watermark
  ctx.fillStyle = '#1f2937'
  ctx.font = '10px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('music-taste-dna', W / 2, H - 12)
}

export default function MusicPassport({ mlProfile, username }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState(false)

  const handleShare = () => {
    const shareData: SharedProfile = {
      archetype: {
        name: mlProfile.archetype.name,
        emoji: mlProfile.archetype.emoji,
        description: mlProfile.archetype.description,
      },
      mainstream: { score: mlProfile.mainstream.score, label: mlProfile.mainstream.label },
      era: { dominant_decade: mlProfile.era.dominant_decade },
      diversity: { label: mlProfile.diversity.label, score: mlProfile.diversity.score },
      top_genres: mlProfile.top_genres.slice(0, 8).map(({ genre, pct, count }) => ({ genre, pct, count })),
      username,
    }
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(shareData))))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    const url = `${window.location.origin}/share?d=${encoded}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    drawPassport(canvas, mlProfile, username)
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `music-passport-${username}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  return (
    <div>
      {/* Visible card preview (HTML/CSS version) */}
      <div className="relative bg-[#0a0a0a] border border-gray-800 rounded-2xl overflow-hidden w-full max-w-lg mx-auto">
        {/* Top bar */}
        <div className="h-0.5 bg-pink-500 w-full" />

        <div className="p-7 text-center">
          <div className="flex justify-between items-center mb-6">
            <span className="text-pink-500 text-xs font-mono tracking-widest">MUSIC TASTE DNA</span>
            <span className="text-gray-700 text-xs font-mono">{new Date().getFullYear()}</span>
          </div>

          <div className="text-6xl mb-3">{mlProfile.archetype.emoji}</div>
          <h3 className="text-2xl font-bold text-white mb-1">{mlProfile.archetype.name}</h3>
          <p className="text-gray-500 text-sm mb-6">@{username}</p>

          <div className="border-t border-gray-800 pt-5 grid grid-cols-3 gap-4 mb-5">
            <div>
              <p className="text-pink-500 text-xs font-mono mb-1">MAINSTREAM</p>
              <p className="text-white font-bold">{mlProfile.mainstream.score}</p>
            </div>
            <div>
              <p className="text-pink-500 text-xs font-mono mb-1">ERA</p>
              <p className="text-white font-bold">{mlProfile.era.dominant_decade}</p>
            </div>
            <div>
              <p className="text-pink-500 text-xs font-mono mb-1">DIVERSITY</p>
              <p className="text-white font-bold text-sm">{mlProfile.diversity.label}</p>
            </div>
          </div>

          {/* Genre tags */}
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {mlProfile.top_genres.slice(0, 4).map(({ genre }) => (
              <span
                key={genre}
                className="border border-gray-700 text-gray-400 text-xs px-3 py-1 rounded-sm font-mono capitalize"
              >
                {genre}
              </span>
            ))}
          </div>

          <p className="text-gray-800 text-xs font-mono">music-taste-dna</p>
        </div>

        {/* Bottom bar */}
        <div className="h-0.5 bg-pink-500 w-full" />
      </div>

      {/* Hidden canvas used only for PNG export */}
      <canvas ref={canvasRef} width={600} height={340} className="hidden" />

      {/* Download button */}
      <div className="flex justify-center gap-3 mt-4">
        <button
          onClick={handleShare}
          className="flex items-center gap-2 border border-pink-500 text-pink-400 hover:bg-pink-500 hover:text-white text-sm font-semibold px-6 py-2.5 rounded-full transition-colors"
        >
          {copied ? 'Link copied!' : 'Copy Share Link'}
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 bg-pink-500 hover:bg-pink-400 text-white text-sm font-semibold px-6 py-2.5 rounded-full transition-colors"
        >
          Download Passport
        </button>
      </div>
    </div>
  )
}
