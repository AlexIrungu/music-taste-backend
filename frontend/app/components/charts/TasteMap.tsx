'use client'

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

type ArtistPoint = {
  name: string
  x: number
  y: number
  image: string | null
  genres: string[]
}

type Props = {
  points: ArtistPoint[]
}

function CustomDot(props: any) {
  const { cx, cy, payload } = props
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill="#ec4899" fillOpacity={0.8} />
      <text
        x={cx}
        y={cy - 10}
        textAnchor="middle"
        fill="#d1d5db"
        fontSize={10}
      >
        {payload.name.length > 16 ? payload.name.slice(0, 15) + '…' : payload.name}
      </text>
    </g>
  )
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const point: ArtistPoint = payload[0].payload
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs">
      <p className="text-white font-semibold mb-1">{point.name}</p>
      {point.genres.length > 0 && (
        <p className="text-gray-400">{point.genres.join(', ')}</p>
      )}
    </div>
  )
}

export default function TasteMap({ points }: Props) {
  if (points.length < 2) {
    return (
      <p className="text-gray-500 text-sm text-center py-8">
        Not enough artist data to render taste map. Listen to more varied artists to unlock this.
      </p>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ScatterChart margin={{ top: 20, right: 20, bottom: 10, left: 10 }}>
        <XAxis
          type="number"
          dataKey="x"
          tick={false}
          axisLine={{ stroke: '#1f2937' }}
          tickLine={false}
          label={{ value: '← genre space →', position: 'insideBottom', fill: '#4b5563', fontSize: 10, dy: 8 }}
        />
        <YAxis
          type="number"
          dataKey="y"
          tick={false}
          axisLine={{ stroke: '#1f2937' }}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Scatter data={points} shape={<CustomDot />}>
          {points.map((_, i) => (
            <Cell key={i} fill="#ec4899" />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  )
}
