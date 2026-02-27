'use client'

import {
  RadarChart as RechartsRadar,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

type Props = {
  genres: { genre: string; count: number; pct: number }[]
}

export default function GenreRadarChart({ genres }: Props) {
  // Take top 7 genres for readable axes
  const data = genres.slice(0, 7).map((g) => ({
    genre: g.genre.length > 14 ? g.genre.slice(0, 13) + '…' : g.genre,
    value: g.pct,
    fullName: g.genre,
  }))

  if (data.length < 3) {
    return (
      <p className="text-gray-500 text-sm text-center py-8">
        Not enough genre data to render radar chart.
      </p>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsRadar data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="#1f2937" />
        <PolarAngleAxis
          dataKey="genre"
          tick={{ fill: '#9ca3af', fontSize: 11 }}
        />
        <Radar
          dataKey="value"
          stroke="#ec4899"
          fill="#ec4899"
          fillOpacity={0.25}
          strokeWidth={2}
        />
        <Tooltip
          contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
          labelStyle={{ color: '#f9fafb', fontSize: 12 }}
          formatter={(value: number | undefined, _: string, props: any) => [
            value != null ? `${value}%` : '',
            props?.payload?.fullName ?? '',
          ]}
        />
      </RechartsRadar>
    </ResponsiveContainer>
  )
}
