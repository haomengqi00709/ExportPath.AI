import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ExportInput, ImageAnalysisResult, Language } from '../types';
import { translations } from '../translations';
import { Package, Globe, MapPin, Camera, Loader2, Sparkles, X, Wand2, StickyNote, Pencil, ChevronDown, Check, StopCircle, Zap, Globe2, HelpCircle } from 'lucide-react';
import { analyzeProductImage, suggestProductDetails } from '../services/geminiService';

interface InputFormProps {
  onSubmit: (data: ExportInput) => void;
  onCancel: () => void;
  isLoading: boolean;
  initialValues?: Partial<ExportInput>;
  onImageAnalyzed: (result: ImageAnalysisResult) => void;
  language: Language;
}

// ISO 3166-1 alpha-2 codes for top economies
const COMMON_COUNTRY_CODES = [
    "US", "CN", "DE", "JP", "IN", "GB", "FR", "IT", "BR", "CA", 
    "KR", "RU", "AU", "MX", "ES", "ID", "NL", "SA", "TR", "CH", 
    "VN", "PL", "SE", "BE", "TH", "SG", "MY", "AE", "EG", "ZA", 
    "AR", "CL", "PH"
].sort();

// Internal component for Search + Dropdown
const SearchableCountrySelect = ({ 
  label, 
  value, 
  onChange, 
  icon: Icon, 
  placeholder,
  options 
}: { 
  label: string; 
  value: string; 
  onChange: (val: string) => void; 
  icon: any; 
  placeholder: string;
  options: string[];
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update filter when value changes externally (e.g. from parent state)
  useEffect(() => {
      if (!isOpen) setFilter(value);
  }, [value, isOpen]);

  const filteredCountries = options.filter(c => 
    c.toLowerCase().includes(filter.toLowerCase())
  );

  const handleSelect = (country: string) => {
    onChange(country);
    setFilter(country);
    setIsOpen(false);
  };

  const handleFocus = () => {
      setIsOpen(true);
      setFilter(''); // Clear filter to show all options on focus
      setTimeout(() => inputRef.current?.select(), 0);
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-sm font-medium text-slate-400 mb-1 flex items-center gap-1">
        <Icon className="w-3 h-3"/> {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? filter : value}
          onChange={(e) => {
              setFilter(e.target.value);
              setIsOpen(true);
              onChange(e.target.value); // Allow free typing
          }}
          onFocus={handleFocus}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg h-10 pl-3 pr-8 text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
          placeholder={placeholder}
          required
        />
        <div 
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-slate-500 hover:text-slate-300"
            onClick={() => {
                if(isOpen) setIsOpen(false);
                else {
                    setIsOpen(true);
                    inputRef.current?.focus();
                }
            }}
        >
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
            {filteredCountries.length > 0 ? (
                filteredCountries.map(country => (
                    <div 
                        key={country}
                        onClick={() => handleSelect(country)}
                        className="px-4 py-2 hover:bg-slate-800 cursor-pointer flex items-center justify-between group"
                    >
                        <span className={`text-sm ${country === value ? 'text-emerald-400 font-medium' : 'text-slate-300'}`}>
                            {country}
                        </span>
                        {country === value && <Check className="w-3 h-3 text-emerald-500"/>}
                    </div>
                ))
            ) : (
                <div className="px-4 py-3 text-xs text-slate-500 text-center">
                    No matching countries
                </div>
            )}
            {/* Allow selecting what was typed even if not in list */}
            {filter && !filteredCountries.includes(filter) && (
                 <div 
                    onClick={() => { setIsOpen(false); }}
                    className="px-4 py-2 bg-slate-800/50 hover:bg-slate-800 cursor-pointer text-blue-400 text-sm italic border-t border-slate-700"
                >
                    Use "{filter}"
                </div>
            )}
        </div>
      )}
    </div>
  );
};


const InputForm: React.FC<InputFormProps> = ({ onSubmit, onCancel, isLoading, initialValues, onImageAnalyzed, language }) => {
  const [formState, setFormState] = useState<ExportInput>({
    productName: 'Electric Bicycle',
    originCountry: 'China',
    destinationCountry: 'Germany',
    baseCost: 450,
    currency: 'USD',
    hsCode: '8711.60',
    hsCodeDescription: 'Cycles fitted with auxiliary electric motor',
    unit: 'set',
    productNotes: '',
    benchmarkPrice: undefined,
    useSearch: true // Default to deep search
  });
  
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isHsEditable, setIsHsEditable] = useState(true); 
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[language].input;
  const unitLabels = translations[language].units;

  // Generate localized country list
  const localizedCountries = useMemo(() => {
    try {
        const regionNames = new Intl.DisplayNames([language], { type: 'region' });
        return COMMON_COUNTRY_CODES.map(code => regionNames.of(code) || code).sort((a, b) => a.localeCompare(b, language));
    } catch (e) {
        // Fallback if Intl is not supported or fails
        return COMMON_COUNTRY_CODES; 
    }
  }, [language]);

  // Helper to get currency label
  const getCurrencyLabel = (code: string) => {
      try {
          const currencyName = new Intl.DisplayNames([language], { type: 'currency' }).of(code);
          return `${code} - ${currencyName}`;
      } catch (e) {
          return code;
      }
  };

  useEffect(() => {
    if (initialValues) {
      setFormState(prev => ({ ...prev, ...initialValues }));
    }
  }, [initialValues]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'hsCode') {
        setFormState(prev => ({
          ...prev,
          hsCode: value,
          hsCodeDescription: ''
        }));
    } else {
        setFormState(prev => ({
          ...prev,
          [name]: name === 'baseCost' ? parseFloat(value) : value
        }));
    }
  };

  const handleCountryChange = (field: 'originCountry' | 'destinationCountry', value: string) => {
      setFormState(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log("📸 Image upload started:", file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);

    setIsAnalyzingImage(true);
    try {
        console.log("🔍 Calling analyzeProductImage API...");
        const result = await analyzeProductImage(file, formState.destinationCountry, formState.currency, language);
        console.log("✅ Image analysis result:", result);

        setFormState(prev => ({
            ...prev,
            productName: result.detectedName,
            hsCode: result.hsCode,
            hsCodeDescription: result.hsCodeDescription,
            unit: result.unit || prev.unit,
        }));
        setIsHsEditable(false);
        onImageAnalyzed(result);
    } catch (error: any) {
        console.error("❌ Image analysis failed:", error);
        setError(error.message || "Image analysis failed");
    } finally {
        setIsAnalyzingImage(false);
    }
  };

  const handleSuggestDetails = async () => {
    if (!formState.productName) return;
    console.log("✨ Magic wand clicked for:", formState.productName);
    setIsSuggesting(true);
    setError(null);
    try {
        console.log("🔍 Calling suggestProductDetails API...");
        const suggestion = await suggestProductDetails(formState.productName, formState.currency, language);
        console.log("✅ Suggestion result:", suggestion);
        setFormState(prev => ({
            ...prev,
            hsCode: suggestion.hsCode,
            hsCodeDescription: suggestion.hsCodeDescription,
            baseCost: suggestion.estimatedBaseCost,
            unit: suggestion.unit,
        }));
        setIsHsEditable(false);
    } catch (error: any) {
        console.error("❌ Suggestion failed:", error);
        setError(error.message || "Auto-fill failed");
    } finally {
        setIsSuggesting(false);
    }
  };

  const clearImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    onSubmit(formState);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
      <h2 className="text-xl font-semibold mb-4 text-emerald-400 flex items-center gap-2">
        <Package className="w-5 h-5" />
        {t.title}
      </h2>

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-xs">
            {error}
        </div>
      )}

      {/* Image Upload Area */}
      <div className="mb-6">
        {imagePreview ? (
            <div className="relative rounded-lg overflow-hidden border border-slate-700 group">
                <img src={imagePreview} alt="Product Preview" className="w-full h-40 object-cover opacity-80" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    {isAnalyzingImage ? (
                        <div className="flex flex-col items-center text-emerald-400 gap-2">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <span className="text-xs font-medium bg-slate-900/80 px-2 py-1 rounded backdrop-blur-sm">{t.identifying}</span>
                        </div>
                    ) : (
                        <div className="bg-emerald-500/20 backdrop-blur-md border border-emerald-500/40 px-3 py-1 rounded-full flex items-center gap-2 text-emerald-100">
                             <Sparkles className="w-4 h-4" /> {t.specsExtracted}
                        </div>
                    )}
                </div>
                <button 
                    onClick={clearImage}
                    className="absolute top-2 right-2 bg-slate-900/80 hover:bg-red-500/80 p-1.5 rounded-full text-white transition-colors"
                    title="Remove Image"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        ) : (
            <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all group"
            >
                <div className="bg-slate-800 p-2 rounded-full mb-2 group-hover:scale-110 transition-transform">
                    <Camera className="w-5 h-5 text-slate-400 group-hover:text-emerald-400" />
                </div>
                <p className="text-sm text-slate-400 font-medium">{t.uploadTitle}</p>
                <p className="text-xs text-slate-500 mt-1">{t.uploadDesc}</p>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageUpload}
                />
            </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Product Identity Section */}
        <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                {t.productIdentity}
            </h3>
            
            <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">{t.productName}</label>
                <div className="relative">
                    <input
                        type="text"
                        name="productName"
                        value={formState.productName || ''}
                        onChange={handleChange}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg h-10 pl-3 pr-10 text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                        required
                    />
                    <button
                        type="button"
                        onClick={handleSuggestDetails}
                        disabled={isSuggesting || !formState.productName}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded transition-colors disabled:opacity-50"
                        title="Auto-fill details with AI"
                    >
                        {isSuggesting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Wand2 className="w-4 h-4"/>}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                 <div className="col-span-1">
                    <label className="block text-xs font-medium text-slate-400 mb-1 whitespace-nowrap">{t.unit}</label>
                    <select
                        name="unit"
                        value={formState.unit}
                        onChange={handleChange}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg h-10 px-2 text-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                        <option value="pcs">{unitLabels.pcs}</option>
                        <option value="set">{unitLabels.set}</option>
                        <option value="kg">{unitLabels.kg}</option>
                        <option value="ton">{unitLabels.ton}</option>
                        <option value="liter">{unitLabels.liter}</option>
                        <option value="box">{unitLabels.box}</option>
                        <option value="meter">{unitLabels.meter}</option>
                        <option value="pair">{unitLabels.pair}</option>
                        <option value="dozen">{unitLabels.dozen}</option>
                    </select>
                </div>
                
                {/* HS Code with Lock/Edit Mode */}
                <div className="col-span-1 relative">
                    <label className="block text-xs font-medium text-slate-400 mb-1 whitespace-nowrap">{t.hsCode}</label>
                    
                    {!isHsEditable && formState.hsCodeDescription ? (
                        <div 
                            onClick={() => setIsHsEditable(true)}
                            className="w-full bg-slate-900 border border-emerald-500/40 rounded-lg h-10 px-2.5 flex items-center justify-between cursor-pointer group hover:bg-slate-800 transition-colors"
                            title="Click to edit HS Code"
                        >
                             <div className="flex flex-col justify-center overflow-hidden mr-1">
                                <span className="text-sm text-emerald-400 font-mono font-bold leading-tight">{formState.hsCode}</span>
                                <span className="text-sm text-slate-500 truncate leading-tight">{formState.hsCodeDescription}</span>
                             </div>
                             <div className="bg-slate-800 p-1 rounded group-hover:bg-slate-700">
                                <Pencil className="w-3 h-3 text-slate-400 group-hover:text-white" />
                             </div>
                        </div>
                    ) : (
                        <input
                            type="text"
                            name="hsCode"
                            value={formState.hsCode}
                            onChange={handleChange}
                            placeholder="0000.00"
                            autoFocus={isHsEditable}
                            className={`w-full bg-slate-900 border rounded-lg h-10 px-2 text-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none ${formState.hsCode ? 'border-slate-600' : 'border-slate-700'}`}
                        />
                    )}
                </div>

                 <div className="col-span-1">
                    <label className="block text-xs font-medium text-slate-400 mb-1 whitespace-nowrap">{t.costPerUnit}</label>
                    <input
                        type="number"
                        name="baseCost"
                        value={formState.baseCost}
                        onChange={handleChange}
                        min="0"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg h-10 px-2 text-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        required
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                    <StickyNote className="w-3 h-3"/> {t.description}
                </label>
                <textarea
                    name="productNotes"
                    value={formState.productNotes || ''}
                    onChange={handleChange}
                    placeholder={t.descriptionPlaceholder}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none min-h-[80px]"
                />
            </div>
        </div>

        {/* Route Section with Searchable Dropdowns */}
        <div className="grid grid-cols-2 gap-4">
          <SearchableCountrySelect 
             label={t.origin}
             icon={Globe}
             placeholder={t.selectOrType}
             value={formState.originCountry}
             options={localizedCountries}
             onChange={(val) => handleCountryChange('originCountry', val)}
          />
          <SearchableCountrySelect 
             label={t.destination}
             icon={MapPin}
             placeholder={t.selectOrType}
             value={formState.destinationCountry}
             options={localizedCountries}
             onChange={(val) => handleCountryChange('destinationCountry', val)}
          />
        </div>

         <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">{t.currency}</label>
            <select
              name="currency"
              value={formState.currency}
              onChange={handleChange}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg h-10 pl-3 text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="USD">{getCurrencyLabel('USD')}</option>
              <option value="EUR">{getCurrencyLabel('EUR')}</option>
              <option value="CNY">{getCurrencyLabel('CNY')}</option>
              <option value="GBP">{getCurrencyLabel('GBP')}</option>
            </select>
          </div>

        {/* Search Mode Toggle */}
        <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
            <div>
                <div className="flex items-center gap-1.5 text-slate-300 font-medium text-sm mb-0.5">
                    {t.searchMode}
                    <div className="group relative">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-500 cursor-help" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-slate-800 text-xs text-slate-300 rounded shadow-xl border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                            {t.searchTooltip}
                        </div>
                    </div>
                </div>
                <div className="text-xs text-slate-500">
                    {formState.useSearch ? (
                        <span className="flex items-center gap-1 text-emerald-400"><Globe2 className="w-3 h-3"/> {t.deepMode}</span>
                    ) : (
                        <span className="flex items-center gap-1 text-amber-400"><Zap className="w-3 h-3"/> {t.standardMode}</span>
                    )}
                </div>
            </div>
            
            <button
                type="button"
                onClick={() => setFormState(prev => ({ ...prev, useSearch: !prev.useSearch }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formState.useSearch ? 'bg-emerald-600' : 'bg-slate-700'}`}
            >
                <span
                    className={`${
                    formState.useSearch ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
            </button>
        </div>

        {/* Analyze / Cancel Button Group */}
        {isLoading ? (
             <div className="flex gap-2 mt-4">
                 <button
                    type="button"
                    disabled
                    className="flex-1 py-3 rounded-lg font-semibold bg-slate-800 text-slate-500 cursor-not-allowed flex items-center justify-center gap-2"
                >
                    <Loader2 className="animate-spin h-5 w-5" />
                    {t.analyzing}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-3 rounded-lg font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-colors flex items-center justify-center"
                    title="Cancel Analysis"
                >
                    <StopCircle className="w-5 h-5" />
                </button>
             </div>
        ) : (
            <button
                type="submit"
                disabled={isAnalyzingImage}
                className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 mt-4 shadow-lg disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed ${
                    formState.useSearch 
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20' 
                    : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/20'
                }`}
            >
                {t.analyzeButton}
            </button>
        )}

      </form>
    </div>
  );
};

export default InputForm;