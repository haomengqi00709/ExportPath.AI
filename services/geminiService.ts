import { DashboardData, ExportInput, ImageAnalysisResult, ProductSuggestion, Language, OptimizationStrategy, SearchSource } from "../types";

// Configuration: Point this to your Railway/Vercel URL in production
// For local development, assume backend runs on port 8080
const BACKEND_URL = process.env.NODE_ENV === 'production' 
  ? "https://your-railway-app.up.railway.app" // CHANGE THIS TO YOUR REAL URL
  : "http://localhost:8080";

const LANGUAGE_NAMES: Record<Language, string> = {
  en: "English",
  zh: "Simplified Chinese",
  tw: "Traditional Chinese",
  fr: "French",
  de: "German",
  es: "Spanish"
};

// Type definition for Google GenAI Schema Type (simplified for client-side construction)
enum Type {
  OBJECT = 'OBJECT',
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  INTEGER = 'INTEGER',
  BOOLEAN = 'BOOLEAN',
  ARRAY = 'ARRAY'
}

// Helper to handle API errors
const handleApiError = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = errorData.error || response.statusText;
    
    if (response.status === 429) {
      throw new Error("⚠️ API Rate Limit Exceeded. Please try again later.");
    }
    throw new Error(`Service Error: ${msg}`);
  }
  return response.json();
};

export const analyzeProductImage = async (
  imageFile: File, 
  destinationCountry: string, 
  currency: string,
  language: Language
): Promise<ImageAnalysisResult> => {
  try {
    const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(imageFile);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });

    const prompt = `
        Analyze this product image for export purposes.
        1. Identify the Product Name clearly.
        2. Determine the most accurate HS Code (6 digits).
        3. Provide the official Short Description for this HS Code.
        4. Identify the standard trading Unit.
        5. Write a detailed "Product Description".
        IMPORTANT: Respond in ${LANGUAGE_NAMES[language]} language.
        Return strict JSON.
    `;

    const data = await handleApiError(await fetch(`${BACKEND_URL}/api/analyze-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            base64Data,
            mimeType: imageFile.type,
            prompt,
            language
        })
    }));

    if (!data.text) throw new Error("Failed to analyze image");
    return JSON.parse(data.text) as ImageAnalysisResult;
  } catch (error: any) {
    throw error;
  }
};

export const suggestProductDetails = async (
  productName: string, 
  currency: string,
  language: Language
): Promise<ProductSuggestion> => {
  try {
    const prompt = `
        I am planning to export a product named "${productName}".
        Please act as a trade assistant and suggest: HS Code, Description, Base Cost in ${currency}, Unit, Standard Description.
        IMPORTANT: Respond in ${LANGUAGE_NAMES[language]} language.
        Return strict JSON.
    `;

    const data = await handleApiError(await fetch(`${BACKEND_URL}/api/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, language })
    }));

    if (!data.text) throw new Error("Failed to get suggestions");
    return JSON.parse(data.text) as ProductSuggestion;
  } catch (error: any) {
    throw error;
  }
};

export const analyzeExportRoutes = async (input: ExportInput, language: Language): Promise<DashboardData> => {
  try {
    // Construct Prompts on Client Side (or move to backend fully)
    // We pass these to the backend to execute
    
    const researchPrompt = `
        Act as an international trade researcher.
        Find SPECIFIC 2024-2025 import duty data for "${input.productName}" (HS Code: ${input.hsCode}) 
        from ${input.originCountry} to ${input.destinationCountry}.
        
        Instructions:
        1. Search "Third Country Duty" / "MFN Tariff".
        2. Search "Anti-Dumping Duties" (AD) or "Section 301" for ${input.originCountry}.
        3. Search Non-Tariff Barriers (MPF, HMF, VAT).
        4. Search 3 Competitor Prices in ${input.destinationCountry}.
        
        Source Hierarchy: Prioritize .gov, .org, customs official sites. Ignore blogs.
    `;

    const analysisPrompt = `
        Act as a senior International Trade Consultant.
        Perform a feasibility study based on the provided RESEARCH CONTEXT.
        
        INPUT:
        Product: "${input.productName}", HS: "${input.hsCode}", Origin: "${input.originCountry}", Dest: "${input.destinationCountry}", Cost: ${input.baseCost} ${input.currency}.
        Retail Benchmark: ${input.benchmarkPrice || 'N/A'}.
        Details: ${input.productNotes || input.hsCodeDescription}.

        RULES:
        1. Tariff Stability: Use 0% MFN for Furniture (HS 94) unless specific AD/Trade War found.
        2. Prices: Estimate B2B price from Retail context. Never return 0.
        3. Strategy: Include Tax, Legal (UFLPA/EUDR), Logistics strategies.
        
        IMPORTANT: Respond in ${LANGUAGE_NAMES[language]} language.
        Return strict JSON.
    `;

    // Schema definition (simplified for passing to backend config)
    // Note: In a real app, define schema in backend to keep payload small. 
    // Here we replicate structure for compatibility.
    const analysisConfig = {
        temperature: 0.1,
        systemInstruction: "Trade expert. Estimate prices if missing. Return JSON.",
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                marketIntelligence: { type: Type.OBJECT, properties: {
                    competitors: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: {type:Type.STRING}, price: {type:Type.NUMBER}, features: {type:Type.STRING}, url: {type:Type.STRING}, platform: {type:Type.STRING} } } },
                    priceRange: { type: Type.OBJECT, properties: { min: {type:Type.NUMBER}, max: {type:Type.NUMBER}, average: {type:Type.NUMBER} } },
                    currency: { type: Type.STRING },
                    unit: { type: Type.STRING },
                    descriptionUsed: { type: Type.STRING }
                }},
                primaryAnalysis: { type: Type.OBJECT, properties: {
                    country: { type: Type.STRING },
                    isoCode: { type: Type.STRING },
                    localMarketPrice: { type: Type.NUMBER },
                    currency: { type: Type.STRING },
                    landedCost: { type: Type.NUMBER },
                    profitMargin: { type: Type.NUMBER },
                    roiPercentage: { type: Type.NUMBER },
                    tariffRate: { type: Type.NUMBER },
                    tariffNote: { type: Type.STRING },
                    vatRate: { type: Type.NUMBER },
                    complianceRisk: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
                    complianceNotes: { type: Type.STRING },
                    tradebarriers: { type: Type.STRING },
                    reasoning: { type: Type.STRING },
                    breakdown: { type: Type.OBJECT, properties: { baseCost: {type:Type.NUMBER}, shipping: {type:Type.NUMBER}, tariffs: {type:Type.NUMBER}, vat: {type:Type.NUMBER}, compliance: {type:Type.NUMBER} } },
                    optimizationStrategy: { type: Type.OBJECT, properties: {
                        country: { type: Type.STRING },
                        taxStrategy: { type: Type.OBJECT, properties: { title: {type:Type.STRING}, details: {type:Type.ARRAY, items:{type:Type.STRING}}, potentialSavings: {type:Type.STRING} } },
                        vatHandling: { type: Type.OBJECT, properties: { rate: {type:Type.STRING}, mechanism: {type:Type.STRING}, advice: {type:Type.STRING} } },
                        complianceDeepDive: { type: Type.OBJECT, properties: { certificationsRequired: {type:Type.ARRAY, items:{type:Type.STRING}}, legalPitfalls: {type:Type.ARRAY, items:{type:Type.STRING}} } },
                        logisticsStrategy: { type: Type.OBJECT, properties: { bestRoute: {type:Type.STRING}, alternativeRoute: {type:Type.STRING}, estimatedTransitTime: {type:Type.STRING} } }
                    }},
                    strategyHints: { type: Type.OBJECT, properties: { tax: {type:Type.STRING}, logistics: {type:Type.STRING}, legal: {type:Type.STRING} } }
                }},
                alternatives: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { 
                    country: { type: Type.STRING }, 
                    isoCode: { type: Type.STRING },
                    profitMargin: { type: Type.NUMBER }, 
                    complianceRisk: { type: Type.STRING },
                    currency: { type: Type.STRING }
                }}}
            }
        }
    };

    const data = await handleApiError(await fetch(`${BACKEND_URL}/api/analyze-route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            useSearch: input.useSearch,
            researchPrompt,
            analysisPrompt,
            analysisConfig,
            // METADATA FOR DATABASE INDEXING (RAG)
            metadata: {
                originCountry: input.originCountry,
                destinationCountry: input.destinationCountry,
                hsCode: input.hsCode,
                productName: input.productName
            }
        })
    }));

    if (!data.text) throw new Error("No response from AI");
    
    const parsedData = JSON.parse(data.text) as DashboardData;
    // Attach verified search sources from backend
    parsedData.searchSources = data.searchSources;
    
    return parsedData;

  } catch (error: any) {
    throw error;
  }
};