import React, { useState, useRef, useEffect } from 'react';
import InputForm from './components/InputForm';
import SingleRouteAnalysis from './components/SingleRouteAnalysis';
import CompetitorAnalysis from './components/CompetitorAnalysis';
import { ExportInput, DashboardData, AnalysisStatus, ImageAnalysisResult, Language } from './types';
import { translations } from '../translations';
import { analyzeExportRoutes } from './services/geminiService';
import { Ship, LayoutDashboard, AlertTriangle, ArrowRight, Sparkles, Globe, Crown, Lock } from 'lucide-react';
import ComplianceBadge from './components/ComplianceBadge';

declare global {
  interface Window {
    enableProMode: () => void;
  }
}

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('en');
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentInput, setCurrentInput] = useState<ExportInput | null>(null);
  const [formKey, setFormKey] = useState(0); 
  
  const [imageIdentified, setImageIdentified] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [secretClicks, setSecretClicks] = useState(0);
  
  // Track the current active request ID to handle cancellation
  const requestRef = useRef<number>(0);

  const t = translations[language];

  // FREEMIUM LOGIC
  const checkUsageLimit = () => {
      const isPro = localStorage.getItem('exportPath_isPro') === 'true';
      if (isPro) return true;

      const today = new Date().toISOString().split('T')[0];
      const lastUsageDate = localStorage.getItem('exportPath_date');
      let count = parseInt(localStorage.getItem('exportPath_count') || '0');

      if (lastUsageDate !== today) {
          // Reset for new day
          count = 0;
          localStorage.setItem('exportPath_date', today);
      }

      if (count >= 3) {
          setShowPaywall(true);
          return false;
      }

      localStorage.setItem('exportPath_count', (count + 1).toString());
      return true;
  };

  // Backdoor for Demos: Type window.enableProMode() in console or click Logo 5 times
  useEffect(() => {
      window.enableProMode = () => {
          localStorage.setItem('exportPath_isPro', 'true');
          alert("💎 PRO MODE ENABLED: Usage limits removed for this browser.");
          setShowPaywall(false);
      };
  }, []);

  const handleSecretClick = () => {
      const newCount = secretClicks + 1;
      setSecretClicks(newCount);
      console.log(`Secret Click: ${newCount}/5`);
      
      if (newCount === 5) {
          localStorage.setItem('exportPath_isPro', 'true');
          alert("💎 PRO MODE ACTIVATED! Unlimited Access Unlocked.");
          setShowPaywall(false);
          setSecretClicks(0);
      }
  };

  const handleAnalysis = async (input: ExportInput) => {
    // Check limit before starting
    if (!checkUsageLimit()) return;

    setStatus(AnalysisStatus.LOADING);
    setError(null);
    setCurrentInput(input);
    setData(null); // Clear previous data to prevent chart errors
    
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
    } catch (e: any) {
      if (requestRef.current === requestId) {
          console.error(e);
          setError(e.message || "An unexpected error occurred while analyzing routes.");
          setStatus(AnalysisStatus.ERROR);
      }
    }
  };

  const handleCancel = () => {
    requestRef.current = 0;
    setStatus(AnalysisStatus.IDLE);
  };

  const handleImageAnalysisResult = (result: ImageAnalysisResult) => {
      setImageIdentified(true);
  };

  const handleRecommendationClick = (countryName: string) => {
    if (!currentInput) return;
    
    // Check limit again for recommendation clicks
    if (!checkUsageLimit()) return;

    window.scrollTo({ top: 0, behavior: 'smooth' });
    const newInput = { ...currentInput, destinationCountry: countryName };
    setCurrentInput(newInput);
    handleAnalysis(newInput);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30 flex flex-col">
      
      {/* Paywall Modal */}
      {showPaywall && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-8 text-center shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-purple-500 to-emerald-500"></div>
                  <div className="bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Lock className="w-8 h-8 text-amber-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Free Limit Reached</h2>
                  <p className="text-slate-400 mb-8">
                      You've used your 3 free analysis credits for today. Upgrade to Pro for unlimited Deep Search analysis and PDF exports.
                  </p>
                  <button className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold rounded-xl shadow-lg shadow-amber-900/20 transition-all transform hover:scale-[1.02]">
                      Upgrade to Pro - $29/mo
                  </button>
                  <button 
                    onClick={() => setShowPaywall(false)}
                    className="mt-4 text-sm text-slate-500 hover:text-slate-300 underline"
                  >
                      Close Preview
                  </button>
                  <div className="mt-6 text-xs text-slate-600">
                      Demo User? Contact sales for an unlock key.
                  </div>
              </div>
          </div>
      )}

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={handleSecretClick}>
            <div className="bg-emerald-600 p-2 rounded-lg group-active:scale-95 transition-transform">
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Sidebar: Controls (Hidden in Print) */}
          <div className="lg:col-span-3 space-y-6 input-form-container">
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
                />
              </>
            )}

            {/* ALTERNATIVES SECTION (Hidden in Print) */}
            {status === AnalysisStatus.SUCCESS && data && data.alternatives.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 pt-6 border-t border-slate-800/50 no-print">
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

      {/* Legal Footer (Visible on Screen & Print) */}
      <footer className="max-w-7xl mx-auto px-4 py-6 text-center text-xs text-slate-600 border-t border-slate-800/50 mt-12 w-full">
         <p>© 2024 ExportPath AI. All rights reserved.</p>
         <p className="mt-2 text-slate-700">
            Disclaimer: This tool provides AI-generated estimates for informational purposes only. 
            It does not constitute professional legal, tax, or logistics advice. 
            Please verify all rates and regulations with licensed customs brokers.
         </p>
      </footer>
    </div>
  );
};

export default App;