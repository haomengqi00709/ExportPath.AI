import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { MarketAnalysis } from '../types';

interface ComparisonChartProps {
  data: MarketAnalysis[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 p-3 rounded shadow-xl">
        <p className="font-semibold text-slate-200">{label}</p>
        <p className="text-emerald-400 text-sm">
          Profit: {payload[0].value.toFixed(2)}
        </p>
        <p className="text-blue-400 text-sm">
          Landed Cost: {payload[1].value.toFixed(2)}
        </p>
      </div>
    );
  }
  return null;
};

const ComparisonChart: React.FC<ComparisonChartProps> = ({ data }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg h-[400px] flex flex-col">
      <h3 className="text-lg font-semibold text-slate-300 mb-4">Margin vs. Landed Cost Analysis</h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            layout="vertical"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
            <XAxis type="number" stroke="#94a3b8" />
            <YAxis dataKey="country" type="category" stroke="#94a3b8" width={100} />
            <Tooltip content={<CustomTooltip />} cursor={{fill: '#1e293b'}} />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Bar dataKey="profitMargin" name="Profit Margin" fill="#10b981" stackId="a" radius={[0, 4, 4, 0]} />
            <Bar dataKey="landedCost" name="Landed Cost" fill="#3b82f6" stackId="a" radius={[0, 0, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ComparisonChart;