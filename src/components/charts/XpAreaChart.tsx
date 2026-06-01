"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { xpPerWeek } from "@/data/mockStats";

/** Gráfico de XP por semana (Recharts) — usado em /progress. */
export function XpAreaChart() {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={xpPerWeek} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="xpFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A855F7" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#A855F7" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="week"
            stroke="#94A3B8"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ stroke: "#8B5CF6", strokeWidth: 1, strokeDasharray: "4 4" }}
            contentStyle={{
              background: "#0D0D16",
              border: "1px solid rgba(139,92,246,0.3)",
              borderRadius: "0.75rem",
              color: "#F8FAFC",
              fontSize: 12,
            }}
            labelStyle={{ color: "#94A3B8" }}
          />
          <Area
            type="monotone"
            dataKey="xp"
            stroke="#A855F7"
            strokeWidth={2.5}
            fill="url(#xpFill)"
            dot={{ fill: "#C084FC", r: 3 }}
            activeDot={{ r: 5, fill: "#C084FC" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
