'use client';

import type { DailyStat } from '@/db/queries/entries';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface StatsChartsProps {
  data: DailyStat[];
}

export function StatsCharts({ data }: StatsChartsProps) {
  const formatted = data.map((d) => ({
    date: d.entry_date.slice(5), // MM-DD
    mood: d.avg_mood !== null ? Math.round(d.avg_mood * 10) / 10 : null,
    energy: d.avg_energy !== null ? Math.round(d.avg_energy * 10) / 10 : null,
  }));

  return (
    <div className='space-y-8'>
      <div className='space-y-2'>
        <p className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
          Mood
        </p>
        <ResponsiveContainer width='100%' height={180}>
          <LineChart data={formatted} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray='3 3' stroke='hsl(var(--border))' />
            <XAxis
              dataKey='date'
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              interval='preserveStartEnd'
            />
            <YAxis
              domain={[1, 5]}
              ticks={[1, 2, 3, 4, 5]}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: 12,
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              itemStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(v) => [v, 'Mood']}
            />
            <Line
              type='monotone'
              dataKey='mood'
              stroke='hsl(142 71% 45%)'
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className='space-y-2'>
        <p className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
          Energy
        </p>
        <ResponsiveContainer width='100%' height={180}>
          <LineChart data={formatted} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray='3 3' stroke='hsl(var(--border))' />
            <XAxis
              dataKey='date'
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              interval='preserveStartEnd'
            />
            <YAxis
              domain={[1, 5]}
              ticks={[1, 2, 3, 4, 5]}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: 12,
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              itemStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(v) => [v, 'Energy']}
            />
            <Line
              type='monotone'
              dataKey='energy'
              stroke='hsl(217 91% 60%)'
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
