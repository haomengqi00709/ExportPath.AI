import React from 'react';
import { OptimizationStrategy } from '../types';
import { X, ShieldCheck, Scale, Truck, FileCheck, Landmark, AlertTriangle } from 'lucide-react';

interface StrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: OptimizationStrategy;
  countryName: string;
  activeSection: 'tax' | 'logistics' | 'legal';
}

const StrategyModal: React.FC<StrategyModalProps> = ({ isOpen, onClose, strategy, countryName, activeSection }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className={`fi fi-${strategy ? 'us' : 'xx'} hidden`}></span> {/* Flag placeholder */}
              {activeSection === 'tax' && "Duty & Tax Strategy"}
              {activeSection === 'logistics' && "Logistics & Route Strategy"}
              {activeSection === 'legal' && "Legal & Compliance Deep Dive"}
              <span className="text-slate-500 font-normal">for {countryName}</span>
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-900">
            <div className="w-full">
              
              {/* Tax Strategy Section */}
              {activeSection === 'tax' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-6 hover:border-emerald-500/30 transition-colors">
                        <div className="flex items-center gap-2 mb-4 text-emerald-400">
                        <Landmark className="w-6 h-6" />
                        <h3 className="font-bold text-xl">Tax Optimization</h3>
                        </div>
                        <div className="space-y-6">
                        <div>
                            <h4 className="text-sm font-semibold text-slate-200 mb-2">Strategic Approach</h4>
                            <p className="text-white text-lg font-medium leading-relaxed">{strategy.taxStrategy.title}</p>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-slate-200 mb-2">Actionable Steps</h4>
                            <ul className="list-disc list-inside text-slate-400 space-y-2 text-sm">
                            {strategy.taxStrategy.details.map((detail, idx) => (
                                <li key={idx} className="leading-relaxed">{detail}</li>
                            ))}
                            </ul>
                        </div>
                        <div className="bg-emerald-500/10 p-4 rounded-lg border border-emerald-500/20">
                            <span className="text-xs text-emerald-400 uppercase font-bold tracking-wide">Potential Savings</span>
                            <p className="text-emerald-100 text-lg font-semibold mt-1">{strategy.taxStrategy.potentialSavings}</p>
                        </div>
                        </div>
                    </div>

                    <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-6 hover:border-blue-500/30 transition-colors">
                        <div className="flex items-center gap-2 mb-4 text-blue-400">
                        <Scale className="w-6 h-6" />
                        <h3 className="font-bold text-xl">VAT & Cashflow</h3>
                        </div>
                        <div className="space-y-6">
                        <div className="flex justify-between border-b border-slate-800 pb-4">
                            <span className="text-slate-400">Standard VAT Rate</span>
                            <span className="text-white font-mono text-xl">{strategy.vatHandling.rate}</span>
                        </div>
                        <div>
                                <h4 className="text-sm font-semibold text-slate-200 mb-2">Handling Mechanism</h4>
                                <p className="text-slate-400 leading-relaxed">{strategy.vatHandling.mechanism}</p>
                        </div>
                            <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/20 mt-2">
                            <span className="text-xs text-blue-400 uppercase font-bold tracking-wide">Expert Advice</span>
                            <p className="text-blue-100 text-sm mt-1 leading-relaxed">{strategy.vatHandling.advice}</p>
                        </div>
                        </div>
                    </div>
                </div>
              )}

              {/* Legal / Compliance Section */}
              {activeSection === 'legal' && (
                  <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-8 hover:border-red-500/30 transition-colors">
                    <div className="flex items-center gap-3 mb-6 text-red-400 border-b border-slate-800 pb-4">
                    <ShieldCheck className="w-8 h-8" />
                    <h3 className="font-bold text-2xl">Legal & Compliance Deep Dive</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h4 className="text-md font-semibold text-slate-200 mb-4 flex items-center gap-2">
                                <FileCheck className="w-5 h-5 text-slate-500"/> Required Certifications
                            </h4>
                            <div className="flex flex-col gap-3">
                                {strategy.complianceDeepDive.certificationsRequired.map((cert, idx) => (
                                    <div key={idx} className="bg-slate-800 text-slate-300 p-3 rounded-lg border border-slate-700 flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                        {cert}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-md font-semibold text-slate-200 mb-4 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-500"/> Common Legal Pitfalls
                            </h4>
                            <ul className="space-y-3">
                            {strategy.complianceDeepDive.legalPitfalls.map((pit, idx) => (
                                <li key={idx} className="bg-red-500/5 text-red-200/80 p-3 rounded-lg border border-red-500/10 text-sm leading-relaxed">
                                    {pit}
                                </li>
                            ))}
                            </ul>
                        </div>
                    </div>
                </div>
              )}

              {/* Logistics Section */}
              {activeSection === 'logistics' && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 hover:border-purple-500/30 transition-colors">
                    <div className="flex items-center gap-3 mb-6 text-purple-400 border-b border-slate-800 pb-4">
                    <Truck className="w-8 h-8" />
                    <h3 className="font-bold text-2xl">Logistics & Route Optimization</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-6">
                            <div>
                                <h4 className="text-sm font-semibold text-slate-200 mb-2 uppercase tracking-wide">Recommended Route</h4>
                                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-emerald-100 text-lg leading-relaxed">
                                    {strategy.logisticsStrategy.bestRoute}
                                </div>
                            </div>
                             <div>
                                <h4 className="text-sm font-semibold text-slate-200 mb-2 uppercase tracking-wide">Cost-Saving Alternative</h4>
                                <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl text-slate-300">
                                    {strategy.logisticsStrategy.alternativeRoute}
                                </div>
                            </div>
                         </div>
                         
                         <div className="flex flex-col justify-center bg-slate-950/50 p-6 rounded-xl border border-slate-800/50">
                             <div className="text-center">
                                 <FileCheck className="w-12 h-12 text-purple-500 mx-auto mb-4 opacity-80" />
                                 <h4 className="text-slate-400 text-sm font-medium mb-1">Estimated Transit Time</h4>
                                 <p className="text-4xl font-bold text-white tracking-tight">{strategy.logisticsStrategy.estimatedTransitTime}</p>
                             </div>
                         </div>
                    </div>
                </div>
              )}

            </div>
        </div>
      </div>
    </div>
  );
};

export default StrategyModal;