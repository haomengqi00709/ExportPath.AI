import React from 'react';
import { MarketIntelligence, Language } from '../types';
import { translations } from '../translations';
import { Tag, TrendingUp, Info, ExternalLink, Sparkles } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

interface CompetitorAnalysisProps {
  data: MarketIntelligence;
  language: Language;
}

const CompetitorAnalysis: React.FC<CompetitorAnalysisProps> = ({ data, language }) => {
  const t = translations[language].competitor;

  // Format data for simple visualization
  const rangeData = [
    { name: 'Min', value: data.priceRange.min, color: '#94a3b8' },
    { name: 'Avg', value: data.priceRange.average, color: '#3b82f6' },
    { name: 'Max', value: data.priceRange.max, color: '#94a3b8' },
  ];

  const getFallbackUrl = (name: string, platform?: string) => {
    const query = encodeURIComponent(`${name} ${platform || ''} price`);
    return `https://www.google.com/search?q=${query}&tbm=shop`;
  };

  const isValidProductUrl = (url: string | undefined): boolean => {
    if (!url) return false;
    try {
      const urlObj = new URL(url);
      // Filter out invalid URLs: relative paths, current domain, localhost, placeholder URLs
      if (urlObj.hostname.includes('localhost') ||
          urlObj.hostname.includes('vercel.app') ||
          urlObj.hostname.includes('railway.app') ||
          url.includes('pocket-tc') ||
          url.includes('exportpath')) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-blue-400" />
            {t.title}
            </h3>
            <p className="text-xs text-slate-500">{t.subtitle} {data.currency}</p>
        </div>
      </div>

      {/* Description Context Section */}
      <div className="bg-slate-950/50 rounded-lg p-3 mb-6 border border-slate-800 flex items-start gap-3">
        <div className="bg-emerald-500/10 p-1.5 rounded text-emerald-400 mt-0.5">
            <Sparkles className="w-4 h-4" />
        </div>
        <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{t.contextUsed}</h4>
            <p className="text-sm text-slate-300 leading-relaxed italic">"{data.descriptionUsed || 'Standard search'}"</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Competitor List */}
        <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-300 mb-2">{t.topSimilar}</h4>
            {data.competitors.map((comp, idx) => {
                const linkUrl = isValidProductUrl(comp.url) ? comp.url : getFallbackUrl(comp.name, comp.platform);
                return (
                    <div key={idx} className="bg-slate-950 border border-slate-800 p-3 rounded-lg flex justify-between items-center group hover:border-blue-500/30 transition-colors">
                        <div className="flex-1 min-w-0 mr-4">
                            <div className="flex items-center gap-2">
                                <p className="text-sm text-slate-200 font-medium truncate group-hover:text-blue-300 transition-colors">{comp.name}</p>
                                {comp.platform && (
                                    <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">{comp.platform}</span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 truncate">{comp.features}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-emerald-400 font-bold font-mono whitespace-nowrap">{data.currency} {comp.price} / {data.unit || 'unit'}</span>
                            <a 
                                href={linkUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-1.5 bg-slate-800 hover:bg-blue-600 rounded text-slate-400 hover:text-white transition-colors"
                                title="View Product Source"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </div>
                    </div>
                );
            })}
        </div>

        {/* Price Range Visual */}
        <div className="flex flex-col">
            <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> {t.marketRetailPrice}
            </h4>
            <div className="flex-1 bg-slate-950/50 rounded-lg p-2 border border-slate-800 relative">
                <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={rangeData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                        <XAxis type="number" hide domain={[0, 'auto']} />
                        <YAxis dataKey="name" type="category" stroke="#64748b" width={30} tick={{fontSize: 12}} />
                        <Tooltip 
                            cursor={{fill: 'transparent'}}
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px' }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                             {rangeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
                
                {/* Custom Overlay for context */}
                <div className="absolute bottom-2 right-4 text-right">
                    <span className="text-xs text-slate-500">{t.estAverage}</span>
                    <p className="text-lg font-bold text-blue-400">{data.currency} {data.priceRange.average}</p>
                </div>
            </div>
            <div className="mt-2 flex items-start gap-2 text-xs text-slate-500">
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <p>{t.retailRangeInfo}</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default CompetitorAnalysis;