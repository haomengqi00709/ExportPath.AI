import React, { useState, useRef } from 'react';
import InputForm from './components/InputForm';
import SingleRouteAnalysis from './components/SingleRouteAnalysis';
import CompetitorAnalysis from './components/CompetitorAnalysis';
import { ExportInput, DashboardData, AnalysisStatus, ImageAnalysisResult, Language } from './types';
import { translations } from './translations';
import { analyzeExportRoutes } from './services/geminiService';
import { Ship, LayoutDashboard, AlertTriangle, ArrowRight, Sparkles, Globe } from 'lucide-react';
import ComplianceBadge from './components/ComplianceBadge';

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('en');
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentInput, setCurrentInput] = useState<ExportInput | null>(null);
  const [formKey, setFormKey] = useState(0); 
  
  const [imageIdentified, setImageIdentified] = useState(false);
  
  // Track the current active request ID to handle cancellation
  const requestRef = useRef<number>(0);

  const t = translations[language];

  const handleAnalysis = async (input: ExportInput) => {
    setStatus(AnalysisStatus.LOADING);
    setError(null);
    setCurrentInput(input);
    
    // Increment request ID. 
    // If handleCancel is called, status goes IDLE. 
    // If a promise returns later, we check if requestId matches current before updating state.
    const requestId = Date.now();
    requestRef.current = requestId;

    try {
      // Trigger main analysis (2 API calls: Research + Synthesis)
      const result = await analyzeExportRoutes(input, language);
      
      // Check if this request is still the active one (hasn't been cancelled)
      if (requestRef.current === requestId) {
          setData(result);
          setStatus(AnalysisStatus.SUCCESS);
      }

      // NOTE: Removed generateOptimizationStrategy call here to save API quota.
      // It is now lazy-loaded inside SingleRouteAnalysis when the user clicks a card.

    } catch (e: any) {
      if (requestRef.current === requestId) {
          console.error(e);
          setError(e.message || "An unexpected error occurred while analyzing routes.");
          setStatus(AnalysisStatus.ERROR);
      }
    }
  };

  const handleCancel = () => {
    // Invalidate the current request ID so any pending promises are ignored
    requestRef.current = 0;
    setStatus(AnalysisStatus.IDLE);
    // Optional: Keep currentInput to allow user to edit, or clear it. Keeping it is better UX.
  };

  const handleImageAnalysisResult = (result: ImageAnalysisResult) => {
      setImageIdentified(true);
  };

  const handleRecommendationClick = (countryName: string) => {
    if (!currentInput) return;
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const newInput = { ...currentInput, destinationCountry: countryName };
    setCurrentInput(newInput);
    handleAnalysis(newInput);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 p-2 rounded-lg">
              <Ship className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              {t.appTitle}
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-sm text-slate-500 hidden md:flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-emerald-500" />
                {t.subtitle}
            </div>
            <div className="relative group h-full flex items-center">
                <div className="absolute top-full pt-2 w-full h-4 bg-transparent"></div> {/* Bridge gap */}
                <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors py-2">
                    <Globe className="w-4 h-4" />
                    <span className="uppercase">{language}</span>
                </button>
                <div className="absolute right-0 top-full pt-2 w-32 hidden group-hover:block z-50">
                    <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-xl overflow-hidden">
                        {(['en', 'zh', 'tw', 'fr', 'de', 'es'] as Language[]).map(lang => (
                            <button
                                key={lang}
                                onClick={() => setLanguage(lang)}
                                className={`block w-full text-left px-4 py-2 text-sm hover:bg-slate-800 transition-colors ${language === lang ? 'text-emerald-400 bg-slate-800' : 'text-slate-400'}`}
                            >
                                {lang === 'en' && 'English'}
                                {lang === 'zh' && '中文 (简体)'}
                                {lang === 'tw' && '繁體中文'}
                                {lang === 'fr' && 'Français'}
                                {lang === 'de' && 'Deutsch'}
                                {lang === 'es' && 'Español'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Sidebar: Controls */}
          <div className="lg:col-span-3 space-y-6">
            <InputForm 
              key={formKey}
              language={language}
              onSubmit={handleAnalysis}
              onCancel={handleCancel}
              isLoading={status === AnalysisStatus.LOADING} 
              initialValues={currentInput || undefined}
              onImageAnalyzed={handleImageAnalysisResult}
            />
            
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
              <h3 className="text-sm font-semibold text-slate-400 mb-2">{t.input.howItWorksTitle}</h3>
              <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-line">
                {t.input.howItWorksDesc}
              </p>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-9 space-y-6">
            
            {status === AnalysisStatus.ERROR && (
               <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl flex items-center gap-3 animate-in fade-in">
                 <AlertTriangle className="w-6 h-6" />
                 <p>{error}</p>
               </div>
            )}

            {status === AnalysisStatus.IDLE && (
              <div className="h-96 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-xl">
                <LayoutDashboard className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg">{t.results.selectPrompt}</p>
              </div>
            )}

            {/* PRIMARY ANALYSIS VIEW */}
            {status === AnalysisStatus.SUCCESS && data && currentInput && (
              <>
                 {/* Competitor Analysis - Market Intelligence First */}
                 <CompetitorAnalysis data={data.marketIntelligence} language={language} />

                <SingleRouteAnalysis 
                  data={data.primaryAnalysis} 
                  alternatives={data.alternatives}
                  input={currentInput}
                  language={language}
                  // No preloadedStrategy anymore, it will fetch on click
                />
              </>
            )}

            {/* ALTERNATIVES SECTION (The Garnish) */}
            {status === AnalysisStatus.SUCCESS && data && data.alternatives.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 pt-6 border-t border-slate-800/50">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        {t.results.otherMarkets}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {data.alternatives.map((alt) => (
                            <div 
                                key={alt.country} 
                                onClick={() => handleRecommendationClick(alt.country)}
                                className="group cursor-pointer bg-slate-900 border border-slate-800 p-5 rounded-xl hover:border-emerald-500/50 hover:bg-slate-800 transition-all shadow-lg"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <h4 className="font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">{alt.country}</h4>
                                    <span className={`fi fi-${alt.isoCode.toLowerCase()} rounded shadow-sm opacity-80`}></span>
                                </div>
                                <div className="space-y-1 mb-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">{t.results.margin}</span>
                                        <span className="text-emerald-400 font-medium">{alt.currency} {alt.profitMargin.toFixed(0)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">{t.results.risk}</span>
                                        <ComplianceBadge level={alt.complianceRisk} language={language} />
                                    </div>
                                </div>
                                <div className="flex items-center text-xs text-blue-400 font-medium group-hover:translate-x-1 transition-transform">
                                    {t.results.analyzeRoute} <ArrowRight className="w-3 h-3 ml-1" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
};

export default App;