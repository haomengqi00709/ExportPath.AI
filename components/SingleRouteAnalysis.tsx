import React, { useState } from 'react';
import { MarketAnalysis, Language, ExportInput, OptimizationStrategy, SearchSource } from '../types';
import { translations } from '../translations';
import CostBreakdown from './CostBreakdown';
import ComplianceBadge from './ComplianceBadge';
import { Scale, Lightbulb, Ship, Landmark, BookOpen, DollarSign, Info, MousePointerClick, Globe, Link, Newspaper, CheckCircle2, Printer, Loader2 } from 'lucide-react';
import StrategyModal from './StrategyModal';

interface SingleRouteAnalysisProps {
  data: MarketAnalysis & { searchSources?: SearchSource[] };
  alternatives: MarketAnalysis[];
  input: ExportInput;
  language: Language;
}

const SingleRouteAnalysis: React.FC<SingleRouteAnalysisProps> = ({ data, alternatives, input, language }) => {
  const t = translations[language].analysis;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'tax' | 'logistics' | 'legal'>('tax');
  const [isPrinting, setIsPrinting] = useState(false);

  // Client-side math to ensure total consistency
  const totalLandedCost = 
    data.breakdown.baseCost + 
    data.breakdown.shipping + 
    data.breakdown.tariffs + 
    data.breakdown.vat + 
    data.breakdown.compliance;

  const calculatedNetProfit = data.localMarketPrice - totalLandedCost;
  const calculatedRoi = (calculatedNetProfit / totalLandedCost) * 100;

  const handleStrategyClick = (section: 'tax' | 'logistics' | 'legal') => {
    setActiveSection(section);
    setIsModalOpen(true);
  };
  
  const handlePrint = () => {
      setIsPrinting(true);
      
      // Update title for a nice PDF filename
      const originalTitle = document.title;
      document.title = `ExportPath_${input.productName}_${input.destinationCountry}_Report`;

      // Small timeout to allow UI update and title change
      setTimeout(() => {
          try {
              window.print();
          } catch (e) {
              console.error("Print blocked:", e);
              alert("Print dialog blocked by preview environment. Please press Ctrl+P (Cmd+P) manually, or deploy the app to use this feature.");
          } finally {
              // Reset state after a delay (assuming print dialog pauses JS in real browsers)
              setTimeout(() => {
                  setIsPrinting(false);
                  document.title = originalTitle;
              }, 1000);
          }
      }, 500);
  };

  // Helper to format percentages safely (handles 0.19 and 19 correctly)
  const formatPercent = (val: number) => {
    if (val === 0) return "0%";
    if (val > 1) {
        // Assume it's already a percentage (e.g. 19 for 19%)
        return val.toFixed(1) + '%';
    }
    // Assume it's a decimal (e.g. 0.19 for 19%)
    return (val * 100).toFixed(1) + '%';
  };

    // Helper to determine source credibility based on domain
  const getSourceCredibility = (url: string) => {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        
        // Tier 1: Government & International Orgs (Highest Trust)
        if (hostname.includes('.gov') || 
            hostname.includes('europa.eu') || 
            hostname.includes('wto.org') || 
            hostname.includes('un.org') || 
            hostname.includes('worldbank.org') ||
            hostname.includes('oecd.org') ||
            hostname.includes('customs') ||
            hostname.includes('ministry')) {
            return { level: 'Official', icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
        }
        
        // Tier 2: Major News, Logistics, Industry Leaders (High Trust)
        if (hostname.includes('reuters.com') || 
            hostname.includes('bloomberg.com') || 
            hostname.includes('ft.com') || 
            hostname.includes('flexport') || 
            hostname.includes('freightos') ||
            hostname.includes('statista') || 
            hostname.includes('mckinsey') ||
            hostname.includes('deloitte')) {
            return { level: 'Trusted', icon: Newspaper, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
        }

        // Tier 3: General Web
        return { level: 'Web', icon: Link, color: 'text-slate-400 bg-slate-800 border-slate-700' };
    } catch (e) {
        return { level: 'Link', icon: Link, color: 'text-slate-400 bg-slate-800 border-slate-700' };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* Strategy Modal */}
      {data.optimizationStrategy && (
          <StrategyModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            strategy={data.optimizationStrategy}
            countryName={data.country}
            activeSection={activeSection}
          />
      )}

      {/* Export / Print Button Toolbar - Top Level for Clickability */}
      <div className="flex justify-end no-print relative z-50">
        <button 
            type="button"
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex items-center gap-2 bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white px-4 py-2 rounded-lg transition-all shadow border border-slate-700 font-medium text-xs uppercase tracking-wider group cursor-pointer disabled:opacity-70 disabled:cursor-wait"
        >
            {isPrinting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <Printer className="w-4 h-4 group-hover:scale-110 transition-transform" />
            )}
            <span>{isPrinting ? "Processing..." : "Download PDF Report"}</span>
        </button>
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
             <span className={`fi fi-${data.isoCode.toLowerCase()} text-9xl`}></span>
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-2 py-0.5 rounded uppercase tracking-wider font-bold">{t.primaryRoute}</span>
                    <span className="text-slate-500 text-xs">{t.updated}</span>
                </div>
                <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                   {input.originCountry} <span className="text-slate-500 text-xl">➔</span> {data.country}
                </h2>
                <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                    <span className="flex items-center gap-1"><Ship className="w-4 h-4"/> {t.logisticsActive}</span>
                    <span className="flex items-center gap-1"><Landmark className="w-4 h-4"/> {t.duty}: {formatPercent(data.tariffRate)}</span>
                </div>
            </div>

            <div className="flex gap-4">
                 <div className="text-right">
                    <p className="text-slate-400 text-sm">{t.netProfit} / {input.unit}</p>
                    <p className={`text-3xl font-bold ${calculatedNetProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {data.currency} {calculatedNetProfit.toFixed(2)}
                    </p>
                 </div>
                 <div className="w-px bg-slate-700 h-12 hidden md:block"></div>
                 <div className="text-right">
                    <p className="text-slate-400 text-sm">{t.roi}</p>
                    <p className={`text-3xl font-bold ${calculatedRoi >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                      {calculatedRoi.toFixed(1)}%
                    </p>
                 </div>
            </div>
        </div>
      </div>

      {/* Financial Deep Dive (Moved Top) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Cost Visualization */}
        <div className="lg:col-span-4 min-h-[400px]">
           <CostBreakdown item={data} language={language} />
        </div>

        {/* Right: Detailed Economics Table */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500"/> {t.unitEconomics} ({t.per} {input.unit})
            </h3>
            
            <div className="flex-1 flex flex-col justify-center">
                <div className="space-y-4">
                    {/* Revenue Line */}
                    <div className="flex items-center justify-between p-3 bg-slate-950/50 rounded-lg border border-slate-800/50">
                        <div>
                          <span className="text-slate-300 font-medium flex items-center gap-1.5">
                            {t.targetWholesale}
                            <div className="group relative no-print">
                              <Info className="w-3.5 h-3.5 text-slate-500 cursor-help" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-xs text-slate-300 rounded shadow-xl border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                {t.wholesaleTooltip}
                              </div>
                            </div>
                          </span>
                        </div>
                        <span className="text-slate-200 font-bold font-mono text-lg">{data.currency} {data.localMarketPrice.toFixed(2)}</span>
                    </div>

                    {/* Minus Costs */}
                    <div className="pl-4 space-y-3 border-l-2 border-slate-800">
                        <div className="flex justify-between text-sm group">
                            <span className="text-slate-500 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span> {t.baseCost}
                            </span>
                            <span className="text-slate-400 font-mono">- {data.currency} {data.breakdown.baseCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm group">
                            <span className="text-slate-500 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> {t.logisticsShipping}
                            </span>
                            <span className="text-slate-400 font-mono">- {data.currency} {data.breakdown.shipping.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm group">
                            <span className="text-slate-500 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> {t.tariffsDuty} ({formatPercent(data.tariffRate)})
                            </span>
                            <div className="flex items-center gap-2">
                                {data.tariffNote && (
                                    <span className="text-[10px] bg-amber-900/40 text-amber-400 px-1.5 py-0.5 rounded border border-amber-900/50 max-w-[150px] truncate" title={data.tariffNote}>
                                        {data.tariffNote}
                                    </span>
                                )}
                                <span className="text-red-400/80 font-mono">- {data.currency} {data.breakdown.tariffs.toFixed(2)}</span>
                            </div>
                        </div>
                         <div className="flex justify-between text-sm group">
                            <span className="text-slate-500 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> {t.complianceCerts}
                            </span>
                            <span className="text-slate-400 font-mono">- {data.currency} {data.breakdown.compliance.toFixed(2)}</span>
                        </div>
                         <div className="flex justify-between text-sm group">
                            <span className="text-slate-500 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> {t.vatEstimate} ({formatPercent(data.vatRate)})
                            </span>
                            <span className="text-red-400/80 font-mono">- {data.currency} {data.breakdown.vat.toFixed(2)}</span>
                        </div>
                        
                        {/* Subtotal Line */}
                         <div className="flex justify-between text-sm pt-2 mt-1 border-t border-slate-800/50">
                            <span className="text-slate-400 font-semibold">{t.totalLandedCost}</span>
                            <span className="text-red-400 font-mono font-semibold">- {data.currency} {totalLandedCost.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Final Margin */}
                    <div className="flex items-center justify-between p-4 bg-emerald-500/5 rounded-lg border border-emerald-500/20 mt-4">
                        <div>
                            <span className="text-emerald-400 font-bold block">{t.netProfitMargin}</span>
                            <span className="text-xs text-emerald-500/60">{t.wholesaleMinusLanded}</span>
                        </div>
                        <span className="text-2xl font-bold text-emerald-400 font-mono">{data.currency} {calculatedNetProfit.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Strategic Insights Cards (Clickable) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
          <button 
             onClick={() => handleStrategyClick('tax')}
             className="text-left bg-slate-900 border border-slate-800 p-5 rounded-xl hover:bg-slate-800 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-900/10 transition-all group relative overflow-hidden"
          >
              <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <MousePointerClick className="w-4 h-4 text-slate-500" />
              </div>
              <div className="flex items-center gap-2 mb-3 text-amber-400 group-hover:text-amber-300">
                  <Lightbulb className="w-5 h-5" />
                  <h4 className="font-bold text-sm">{t.taxOptimization}</h4>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed line-clamp-3 group-hover:text-slate-300">{data.strategyHints?.tax}</p>
              <div className="mt-3 text-xs text-amber-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                  Click for Deep Dive Strategy &rarr;
              </div>
          </button>
          
           <button 
             onClick={() => handleStrategyClick('logistics')}
             className="text-left bg-slate-900 border border-slate-800 p-5 rounded-xl hover:bg-slate-800 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-900/10 transition-all group relative overflow-hidden"
           >
              <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <MousePointerClick className="w-4 h-4 text-slate-500" />
              </div>
              <div className="flex items-center gap-2 mb-3 text-blue-400 group-hover:text-blue-300">
                  <Ship className="w-5 h-5" />
                  <h4 className="font-bold text-sm">{t.logisticsStrategy}</h4>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed line-clamp-3 group-hover:text-slate-300">{data.strategyHints?.logistics}</p>
              <div className="mt-3 text-xs text-blue-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                  Click for Route Details &rarr;
              </div>
          </button>

           <button 
             onClick={() => handleStrategyClick('legal')}
             className="text-left bg-slate-900 border border-slate-800 p-5 rounded-xl hover:bg-slate-800 hover:border-red-500/50 hover:shadow-lg hover:shadow-red-900/10 transition-all group relative overflow-hidden"
           >
              <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <MousePointerClick className="w-4 h-4 text-slate-500" />
              </div>
              <div className="flex items-center gap-2 mb-3 text-red-400 group-hover:text-red-300">
                  <BookOpen className="w-5 h-5" />
                  <h4 className="font-bold text-sm">{t.legalCompliance}</h4>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed line-clamp-3 group-hover:text-slate-300">{data.strategyHints?.legal}</p>
              <div className="mt-3 text-xs text-red-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                  Click for Compliance Check &rarr;
              </div>
          </button>
      </div>

      {/* Compliance & Details */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Scale className="w-5 h-5 text-slate-400"/> {t.regulatoryLandscape}
            </h3>
            <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-lg border border-slate-800">
                <span className="text-sm text-slate-400">{t.riskAssessment}:</span>
                <ComplianceBadge level={data.complianceRisk} language={language} />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t.barriersCerts}</p>
                  <div className="text-sm text-slate-300 bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 leading-relaxed h-full">
                      {data.complianceNotes}
                  </div>
              </div>
               <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t.agreementsPolitics}</p>
                  <div className="text-sm text-slate-300 bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 leading-relaxed h-full">
                      {data.tradebarriers}
                  </div>
              </div>
          </div>
      </div>

      {/* Verified Data Sources */}
      {data.searchSources && data.searchSources.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-md font-semibold text-white flex items-center gap-2 mb-4">
                  <Globe className="w-4 h-4 text-blue-400" /> Verified Data Sources
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.searchSources.map((source, idx) => {
                      const credibility = getSourceCredibility(source.uri);
                      const Icon = credibility.icon;
                      
                      return (
                      <a 
                          key={idx} 
                          href={source.uri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-start gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800 transition-all group"
                      >
                          <div className={`p-1.5 rounded transition-colors ${credibility.color}`}>
                              <Icon className="w-3 h-3" />
                          </div>
                          <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                  <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${credibility.color} bg-opacity-10 border-opacity-20`}>
                                      {credibility.level}
                                  </span>
                              </div>
                              <p className="text-sm text-slate-300 font-medium truncate group-hover:text-white transition-colors mt-1">{source.title}</p>
                              <p className="text-xs text-slate-500 truncate mt-0.5">{new URL(source.uri).hostname}</p>
                          </div>
                      </a>
                  )})}
              </div>
          </div>
      )}

    </div>
  );
};

export default SingleRouteAnalysis;