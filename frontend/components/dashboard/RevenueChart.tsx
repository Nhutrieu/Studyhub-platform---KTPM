"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/format";

interface RevenueChartProps {
  data: Array<{ date: string; revenue: number }>;
}

export default function RevenueChart({ data }: RevenueChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-secondary-500">
        Chưa có dữ liệu
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
        <XAxis dataKey="date" stroke="#78716c" />
        <YAxis stroke="#78716c" />
        <Tooltip
          formatter={(value: number | undefined) => value ? formatCurrency(value) : ""}
        />
        <Line type="monotone" dataKey="revenue" stroke="#1c1917" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}

