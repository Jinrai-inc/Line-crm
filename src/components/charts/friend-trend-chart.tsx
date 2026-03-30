"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

type FriendTrendData = {
  month: string
  count: number
}

type FriendTrendChartProps = {
  data: FriendTrendData[]
}

export function FriendTrendChart({ data }: FriendTrendChartProps) {
  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="month"
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
            formatter={(value) => [`${value}人`, "友だち数"]}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#06C755"
            strokeWidth={2}
            dot={{ fill: "#06C755", r: 4 }}
            activeDot={{ r: 6, fill: "#06C755" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
