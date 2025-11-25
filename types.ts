import { translations } from './translations';

export type Language = keyof typeof translations;

export interface ExportInput {
  productName: string;
  originCountry: string;
  destinationCountry: string;
  baseCost: number;
  currency: string;
  hsCode?: string;
  hsCodeDescription?: string; // Added description
  unit: string;
  productNotes?: string; // Renamed to "Product Description" in UI
  benchmarkPrice?: number; // Retail price from image analysis to guide wholesale calculation
  useSearch?: boolean; // Toggle for Deep Search (Live Data) vs Standard (Internal Knowledge)
}

export interface CostBreakdown {
  baseCost: number;
  shipping: number;
  tariffs: number;
  vat: number;
  compliance: number;
}

export interface Competitor {
  name: string;
  price: number;
  features: string;
  url?: string;
  platform?: string;
}

export interface PriceRange {
  min: number;
  max: number;
  average: number;
}

export interface ImageAnalysisResult {
  detectedName: string;
  hsCode: string;
  hsCodeDescription: string; // Added description
  visualDescription: string;
  unit: string;
}

export interface ProductSuggestion {
  hsCode: string;
  hsCodeDescription: string; // Added description
  estimatedBaseCost: number;
  unit: string;
  description: string;
}

export interface MarketIntelligence {
  competitors: Competitor[];
  priceRange: PriceRange;
  currency: string;
  unit: string;
  descriptionUsed: string; // To show what context was used
}

export interface OptimizationStrategy {
  country: string;
  taxStrategy: {
    title: string;
    details: string[];
    potentialSavings: string;
  };
  vatHandling: {
    rate: string;
    mechanism: string;
    advice: string;
  };
  complianceDeepDive: {
    certificationsRequired: string[];
    legalPitfalls: string[];
  };
  logisticsStrategy: {
    bestRoute: string;
    alternativeRoute: string;
    estimatedTransitTime: string;
  };
}

export interface MarketAnalysis {
  country: string;
  isoCode: string; // 2 letter code for flags/maps
  localMarketPrice: number;
  currency: string;
  landedCost: number;
  profitMargin: number;
  roiPercentage: number;
  tariffRate: number; // percentage
  tariffNote?: string; // Short explanation of the rate (e.g. "MFN 0% + Sec 301 25%")
  vatRate: number; // percentage
  complianceRisk: 'Low' | 'Medium' | 'High';
  complianceNotes: string;
  tradebarriers: string;
  breakdown: CostBreakdown;
  reasoning: string;
  optimizationStrategy: OptimizationStrategy; // Integrated directly
  strategyHints?: { // Kept for backward compatibility or summary view if needed
    tax: string;
    logistics: string;
    legal: string;
  }
}

export interface SearchSource {
  title: string;
  uri: string;
}

export interface DashboardData {
  primaryAnalysis: MarketAnalysis;
  marketIntelligence: MarketIntelligence;
  alternatives: MarketAnalysis[];
  searchSources?: SearchSource[];
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}