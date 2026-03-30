"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

type SeminarStatsData = {
  name: string
  applied: number
  attended: number
}

type SeminarStatsChartProps = {
  data: SeminarStatsData[]
}

export function SeminarStatsChart({ data }: SeminarStatsChartProps) {
  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
            formatter={(value, name) => [
              `${value}人`,
              name === "applied" ? "申込数" : "参加数",
            ]}
          />
          <Legend
            formatter={(value: string) =>
              value === "applied" ? "申込数" : "参加数"
            }
          />
          <Bar dataKey="applied" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="attended" fill="#06C755" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
