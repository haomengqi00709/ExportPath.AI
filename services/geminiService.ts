import { GoogleGenAI, Type } from "@google/genai";
import { DashboardData, ExportInput, ImageAnalysisResult, ProductSuggestion, Language, OptimizationStrategy, SearchSource } from "../types";

const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
const modelName = "gemini-2.5-flash";

const LANGUAGE_NAMES: Record<Language, string> = {
  en: "English",
  zh: "Simplified Chinese",
  tw: "Traditional Chinese",
  fr: "French",
  de: "German",
  es: "Spanish"
};

// Helper to handle API errors gracefully
const handleGeminiError = (error: any): never => {
  console.error("Gemini API Error:", error);
  const msg = error.message || JSON.stringify(error);
  
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
    throw new Error("⚠️ API Rate Limit Exceeded. The Google Gemini free quota has been exhausted. Please wait a minute and try again.");
  }
  
  if (msg.includes('503') || msg.includes('overloaded')) {
    throw new Error("⚠️ AI Service Overloaded. Please try again in a moment.");
  }

  throw new Error("AI Service Error: " + (error.message || "Unknown error occurred"));
};

export const analyzeProductImage = async (
  imageFile: File, 
  destinationCountry: string, 
  currency: string,
  language: Language
): Promise<ImageAnalysisResult> => {
  try {
    // Convert File to Base64
    const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(imageFile);
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });

    // Simplified prompt for identification only
    const prompt = `
        Analyze this product image for export purposes.
        1. Identify the Product Name clearly.
        2. Determine the most accurate HS Code (6 digits).
        3. Provide the official Short Description for this HS Code (e.g. "Cycles fitted with auxiliary electric motor").
        4. Identify the standard trading Unit (e.g., 'pcs', 'set', 'kg', 'ton').
        5. Write a detailed "Product Description" describing its material, usage, and key visual features.
        
        IMPORTANT: Respond in ${LANGUAGE_NAMES[language]} language.

        Return strict JSON.
    `;

    const response = await genAI.models.generateContent({
        model: modelName,
        contents: {
        parts: [
            { inlineData: { mimeType: imageFile.type, data: base64Data } },
            { text: prompt }
        ]
        },
        config: {
        temperature: 0.1, // Low temperature for consistent identification
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
            detectedName: { type: Type.STRING },
            hsCode: { type: Type.STRING },
            hsCodeDescription: { type: Type.STRING },
            visualDescription: { type: Type.STRING },
            unit: { type: Type.STRING },
            },
            required: ["detectedName", "hsCode", "hsCodeDescription", "visualDescription", "unit"]
        }
        }
    });

    const text = response.text;
    if (!text) throw new Error("Failed to analyze image");
    return JSON.parse(text) as ImageAnalysisResult;
  } catch (error) {
    handleGeminiError(error);
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
        Please act as a trade assistant and suggest:
        1. The most likely HS Code (6-digit format).
        2. The official HS Code Description.
        3. A realistic Base Cost (Ex-Works) in ${currency} for a generic version of this product.
        4. The standard unit of measure for trading this product.
        5. A short description of standard features.
        
        IMPORTANT: Respond in ${LANGUAGE_NAMES[language]} language.

        Return strict JSON.
    `;

    const response = await genAI.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
            hsCode: { type: Type.STRING },
            hsCodeDescription: { type: Type.STRING },
            estimatedBaseCost: { type: Type.NUMBER },
            unit: { type: Type.STRING },
            description: { type: Type.STRING }
            },
            required: ["hsCode", "hsCodeDescription", "estimatedBaseCost", "unit", "description"]
        }
        }
    });

    const text = response.text;
    if (!text) throw new Error("Failed to get suggestions");
    return JSON.parse(text) as ProductSuggestion;
  } catch (error) {
    handleGeminiError(error);
  }
};

export const analyzeExportRoutes = async (input: ExportInput, language: Language): Promise<DashboardData> => {
  try {
    let researchText = "";
    let searchSources: SearchSource[] = [];

    // --- STEP 1: RESEARCH (CONDITIONAL) ---
    // Only perform Google Search if useSearch is TRUE
    if (input.useSearch) {
        const researchPrompt = `
            Act as an international trade researcher.
            Find the SPECIFIC and CURRENT 2024-2025 import duty data for "${input.productName}" (HS Code: ${input.hsCode}) 
            from ${input.originCountry} to ${input.destinationCountry}.

            CRITICAL SEARCH INSTRUCTIONS (Global Trade Detective):
            1. **Standard Duty**: Search for the "Third Country Duty" or "MFN Tariff" applied by ${input.destinationCountry}. Note: For Furniture (HS 94) or IT, check if it is Duty-Free (0%).
            2. **Trade Defense Instruments (TDIs)**: ACTIVELY search for "Anti-Dumping Duties" (AD), "Countervailing Duties" (CVD), or "Safeguard Measures" currently active against "${input.originCountry}" for this specific product.
            3. **Bilateral Tensions**: Search for "trade war tariffs", "retaliatory tariffs", or recent "Section 301" style actions between ${input.originCountry} and ${input.destinationCountry} in 2024-2025.
            4. **Non-Tariff Barriers**: Identify key import restrictions, bans, or specific taxes (e.g. MPF/HMF in USA, Excise Tax).
            5. **VAT**: Find the standard VAT rate in ${input.destinationCountry}.
            6. **Competitors & Pricing**: Find 3 actual competitor products sold in ${input.destinationCountry} matching: "${input.productNotes || input.productName}". ACTIVELY SEARCH FOR PRICE TAGS, MSRP, or RETAIL LISTINGS (e.g. "price of ${input.productName} in ${input.destinationCountry}").
            
            If the data indicates "Free" or "0%", explicitly state it. Do not guess a 10% average.
        `;

        const researchResponse = await genAI.models.generateContent({
            model: modelName,
            contents: researchPrompt,
            config: {
            temperature: 0.1, 
            tools: [{ googleSearch: {} }],
            }
        });

        researchText = researchResponse.text || "";
        
        // Extract verified sources from grounding metadata
        const groundingChunks = researchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        searchSources = groundingChunks
            .map((chunk: any) => {
                if (chunk.web) {
                    return { title: chunk.web.title, uri: chunk.web.uri };
                }
                return null;
            })
            .filter((s: SearchSource | null) => s !== null) as SearchSource[];
    } else {
        // STANDARD MODE: Use internal knowledge base
        researchText = `
            (INTERNAL KNOWLEDGE MODE ACTIVE - NO GOOGLE SEARCH PERFORMED)
            Based on your internal training data up to 2024, estimate the trade conditions.
            Assume standard WTO/MFN rates unless major trade wars (like US-China Section 301) are well-known historical facts.
            Estimate market prices based on standard economic indicators for ${input.destinationCountry}.
        `;
    }

    // --- STEP 2: ANALYSIS & SYNTHESIS (JSON Generation) ---
    const analysisPrompt = `
        Act as a senior International Trade Consultant.
        Perform a comprehensive market and feasibility study based on the provided CONTEXT and INPUT DATA.

        CONTEXT (${input.useSearch ? 'Real-time verified data' : 'Internal Knowledge Estimation'}):
        ${researchText}

        INPUT DATA:
        Product: "${input.productName}"
        HS Code: "${input.hsCode || 'Unknown'}"
        Origin: "${input.originCountry}"
        Target Destination: "${input.destinationCountry}"
        Base Cost: ${input.baseCost} ${input.currency}
        Benchmark Retail Price: ${input.benchmarkPrice ? input.benchmarkPrice + ' ' + input.currency : 'Not provided'}
        Details: ${input.productNotes || input.hsCodeDescription}

        EXECUTION RULES:
        1. **Tariff Accuracy**: Base tariffs on MFN rates found in context.
        2. **SECTOR SPECIFIC OVERRIDES**:
           - **Furniture (HS 94xx)**: The MFN Duty in major economies (US, EU, UK, CA, JP, AU) is typically **0% (Free)**. If context says "average 10%", IGNORE IT. Use 0% unless you found specific Anti-Dumping or Trade War (Section 301) tariffs.
           - **Electronics (HS 84/85)**: Often 0% under ITA.
        
        3. **Dynamic Punitive Tariffs**: If context mentions specific Anti-Dumping (AD), Countervailing (CVD), or Retaliatory tariffs (Section 301) for this specific Origin-Destination pair, add them.
           - Example: MFN 0% + Section 301 25% = 25%.
           
        4. **USA Specifics**: If Destination is USA, add MPF/HMF (~0.5%) if not included.
        
        5. **Furniture Scope Logic**:
           - **Wooden Bedroom Furniture** from China to USA often has high Anti-Dumping duties.
           - **Dining/Living Room Furniture** often DOES NOT have AD duties, only Section 301 (25%).
           - Be specific about the scope based on the product name.

        6. **Prices (CRITICAL)**: Derive Wholesale Price (B2B) from the Market Retail Price found in context.
           - **FALLBACK PRICE LOGIC**: If specific pricing data is NOT found (common in Standard Mode), **ESTIMATE** a realistic market retail price based on internal knowledge. **NEVER return 0**.
           
        7. **Logistics Reality Check**: 
           - For **Furniture/Large items**: Shipping is driven by VOLUME. A large table CANNOT ship internationally for $50-$70. Realistically $200-$500.

        8. **Conservative Valuation**: 
           - Do not compare a generic Base Cost item to a Luxury Brand unless specified. Apply "Unbranded Discount".

        9. **DEEP DIVE STRATEGY (Optimization)**:
           - Provide specific strategies for Tax, Legal, and Logistics.
           - **Regulatory Checks**: Check UFLPA/Forced Labor, EUDR (Deforestation), CBAM, Lacey Act, CPSC/CE standards.
           - **Tax**: Suggest FTAs or duty suspension if applicable.

        IMPORTANT: Respond in ${LANGUAGE_NAMES[language]} language.

        Return strict JSON.
    `;

    // Schema Definitions
    const competitorSchema = {
        type: Type.OBJECT,
        properties: {
        name: { type: Type.STRING },
        price: { type: Type.NUMBER },
        features: { type: Type.STRING },
        url: { type: Type.STRING },
        platform: { type: Type.STRING }
        }
    };

    const optimizationStrategySchema = {
        type: Type.OBJECT,
        properties: {
          country: { type: Type.STRING },
          taxStrategy: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              details: { type: Type.ARRAY, items: { type: Type.STRING } },
              potentialSavings: { type: Type.STRING }
            },
            required: ["title", "details", "potentialSavings"]
          },
          vatHandling: {
            type: Type.OBJECT,
            properties: {
              rate: { type: Type.STRING },
              mechanism: { type: Type.STRING },
              advice: { type: Type.STRING }
            },
            required: ["rate", "mechanism", "advice"]
          },
          complianceDeepDive: {
            type: Type.OBJECT,
            properties: {
              certificationsRequired: { type: Type.ARRAY, items: { type: Type.STRING } },
              legalPitfalls: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["certificationsRequired", "legalPitfalls"]
          },
          logisticsStrategy: {
            type: Type.OBJECT,
            properties: {
              bestRoute: { type: Type.STRING },
              alternativeRoute: { type: Type.STRING },
              estimatedTransitTime: { type: Type.STRING }
            },
            required: ["bestRoute", "alternativeRoute", "estimatedTransitTime"]
          }
        },
        required: ["country", "taxStrategy", "vatHandling", "complianceDeepDive", "logisticsStrategy"]
    };

    const marketAnalysisSchema = {
        type: Type.OBJECT,
        properties: {
        country: { type: Type.STRING },
        isoCode: { type: Type.STRING },
        localMarketPrice: { type: Type.NUMBER, description: "Wholesale Price B2B" },
        currency: { type: Type.STRING },
        landedCost: { type: Type.NUMBER },
        profitMargin: { type: Type.NUMBER },
        roiPercentage: { type: Type.NUMBER },
        tariffRate: { type: Type.NUMBER, description: "Decimal format (e.g. 0.05 for 5%)" },
        tariffNote: { type: Type.STRING, description: "Explanation of rate (e.g. 'MFN 0% + Sec 301 25%')"},
        vatRate: { type: Type.NUMBER, description: "Decimal format (e.g. 0.20 for 20%)" },
        complianceRisk: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
        complianceNotes: { type: Type.STRING },
        tradebarriers: { type: Type.STRING },
        reasoning: { type: Type.STRING },
        breakdown: {
            type: Type.OBJECT,
            properties: {
            baseCost: { type: Type.NUMBER },
            shipping: { type: Type.NUMBER },
            tariffs: { type: Type.NUMBER },
            vat: { type: Type.NUMBER },
            compliance: { type: Type.NUMBER }
            },
            required: ["baseCost", "shipping", "tariffs", "vat", "compliance"]
        },
        optimizationStrategy: optimizationStrategySchema,
        strategyHints: {
            type: Type.OBJECT,
            properties: {
                tax: { type: Type.STRING },
                logistics: { type: Type.STRING },
                legal: { type: Type.STRING }
            },
            required: ["tax", "logistics", "legal"]
        }
        },
        required: ["country", "isoCode", "localMarketPrice", "landedCost", "profitMargin", "roiPercentage", "tariffRate", "tariffNote", "vatRate", "complianceRisk", "complianceNotes", "tradebarriers", "reasoning", "breakdown", "currency", "strategyHints", "optimizationStrategy"]
    };

    const response = await genAI.models.generateContent({
        model: modelName,
        contents: analysisPrompt,
        config: {
        temperature: 0.1,
        systemInstruction: "You are a trade expert. Use the provided research context to fill the schema accurately. If prices are missing in context, ESTIMATE them based on internal knowledge to avoid 0 values. Return rates as decimals.",
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
            marketIntelligence: {
                type: Type.OBJECT,
                properties: {
                competitors: { type: Type.ARRAY, items: competitorSchema },
                priceRange: {
                    type: Type.OBJECT,
                    properties: {
                    min: { type: Type.NUMBER },
                    max: { type: Type.NUMBER },
                    average: { type: Type.NUMBER }
                    }
                },
                currency: { type: Type.STRING },
                unit: { type: Type.STRING },
                descriptionUsed: { type: Type.STRING }
                },
                required: ["competitors", "priceRange", "currency", "unit"]
            },
            primaryAnalysis: marketAnalysisSchema,
            alternatives: {
                type: Type.ARRAY,
                items: marketAnalysisSchema
            }
            },
            required: ["marketIntelligence", "primaryAnalysis", "alternatives"]
        }
        }
    });

    const text = response.text;
    if (!text) {
        throw new Error("No response from AI");
    }

    const parsedData = JSON.parse(text) as DashboardData;
    
    // Attach the search sources from the research step to the final data
    parsedData.searchSources = searchSources;

    return parsedData;
  } catch (error) {
    handleGeminiError(error);
  }
};