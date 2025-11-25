import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { MarketAnalysis, Language } from '../types';
import { translations } from '../translations';

interface CostBreakdownProps {
  item: MarketAnalysis;
  language: Language;
}

const COLORS = ['#64748b', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

const CostBreakdown: React.FC<CostBreakdownProps> = ({ item, language }) => {
  const t = translations[language].costBreakdown;
  
  const data = [
    { name: t.baseCost, value: item.breakdown.baseCost },
    { name: t.shipping, value: item.breakdown.shipping },
    { name: t.tariffs, value: item.breakdown.tariffs },
    { name: t.vat, value: item.breakdown.vat },
    { name: t.compliance, value: item.breakdown.compliance },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg h-[400px] flex flex-col">
      <div className="mb-2">
        <h3 className="text-lg font-semibold text-slate-300">{t.title}: {item.country}</h3>
        <p className="text-xs text-slate-500">{t.subtitle}</p>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              fill="#8884d8"
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => item.currency + ' ' + value.toFixed(2)}
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f1f5f9' }}
              itemStyle={{ color: '#e2e8f0' }}
            />
            <Legend verticalAlign="bottom" height={36} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CostBreakdown;