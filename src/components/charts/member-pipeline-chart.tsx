"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"

type PipelineData = {
  stage: string
  count: number
}

type MemberPipelineChartProps = {
  data: PipelineData[]
}

const STAGE_COLORS = [
  "#EC4899",
  "#F472B6",
  "#F9A8D4",
  "#FBCFE8",
  "#FCE7F3",
]

export function MemberPipelineChart({ data }: MemberPipelineChartProps) {
  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 60, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="stage"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
            width={70}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
            formatter={(value) => [`${value}人`, "人数"]}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={28}>
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={STAGE_COLORS[index % STAGE_COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
