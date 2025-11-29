const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');
const rateLimit = require('express-rate-limit');
// const { PrismaClient } = require('@prisma/client'); // Commented out for local testing without DB
require('dotenv').config();

const app = express();
// const prisma = new PrismaClient(); // Commented out for local testing without DB

// Configure CORS
app.use(cors({
    origin: '*', 
    methods: ['POST', 'GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-demo-secret']
}));

app.use(express.json({ limit: '10mb' }));

// SECURITY: Rate Limiting
app.set('trust proxy', 1);
const apiLimiter = rateLimit({
	windowMs: 1 * 60 * 1000, 
	limit: 20, // Increased limit slightly for testing
	standardHeaders: 'draft-7', 
	legacyHeaders: false,
    skip: (req) => req.headers['x-demo-secret'] === process.env.DEMO_SECRET,
    message: { error: "Too many requests. Please try again in a minute." }
});
app.use('/api', apiLimiter);

const apiKey = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenAI({ apiKey });
const modelName = "gemini-2.5-flash";

const handleError = (res, error) => {
    console.error("Backend Error:", error);
    const msg = error.message || "Unknown server error";
    if (msg.includes('429') || msg.includes('quota')) {
        return res.status(429).json({ error: "API Rate Limit Exceeded. Please try again later." });
    }
    res.status(500).json({ error: msg });
};

// 1. Analyze Image Endpoint (with proper schema)
app.post('/api/analyze-image', async (req, res) => {
    try {
        const { base64Data, mimeType, prompt } = req.body;

        const schema = {
            type: 'OBJECT',
            properties: {
                detectedName: { type: 'STRING', description: 'Product name identified from image' },
                hsCode: { type: 'STRING', description: '6-digit HS Code' },
                hsCodeDescription: { type: 'STRING', description: 'Official short description of HS Code' },
                unit: { type: 'STRING', description: 'Standard trading unit (e.g., pcs, kg, set)' },
                visualDescription: { type: 'STRING', description: 'Detailed product description from image' }
            },
            required: ['detectedName', 'hsCode', 'hsCodeDescription', 'unit', 'visualDescription']
        };

        const response = await genAI.models.generateContent({
            model: modelName,
            contents: {
                parts: [
                    { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64Data } },
                    { text: prompt }
                ]
            },
            config: {
                temperature: 0.1,
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });
        res.json({ text: response.text });
    } catch (error) { handleError(res, error); }
});

// 2. Suggest Details Endpoint (with proper schema)
app.post('/api/suggest', async (req, res) => {
    try {
        const { prompt } = req.body;

        const schema = {
            type: 'OBJECT',
            properties: {
                hsCode: { type: 'STRING', description: '6-digit HS Code' },
                hsCodeDescription: { type: 'STRING', description: 'Official short description of HS Code' },
                estimatedBaseCost: { type: 'NUMBER', description: 'Estimated base cost in specified currency' },
                unit: { type: 'STRING', description: 'Standard trading unit (e.g., pcs, kg, set)' },
                description: { type: 'STRING', description: 'Product description' }
            },
            required: ['hsCode', 'hsCodeDescription', 'estimatedBaseCost', 'unit', 'description']
        };

        const response = await genAI.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
                temperature: 0.1,
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });
        res.json({ text: response.text });
    } catch (error) { handleError(res, error); }
});

// 3. RAG MAIN ENDPOINT: Analyze Route
app.post('/api/analyze-route', async (req, res) => {
    try {
        const { useSearch, researchPrompt, analysisPrompt, analysisConfig, metadata } = req.body;
        const { originCountry, destinationCountry, hsCode, productName } = metadata || {};

        // --- STEP 1: CHECK DATABASE (The "Gold Standard") ---
        // Temporarily disabled for local testing without database
        /*
        if (originCountry && destinationCountry && hsCode) {
            try {
                const cachedRoute = await prisma.tradeRoute.findFirst({
                    where: {
                        originCountry,
                        destCountry: destinationCountry,
                        hsCode,
                        status: 'VERIFIED'
                    }
                });

                if (cachedRoute) {
                    console.log(`💎 RAG HIT: Serving verified data for ${originCountry}->${destinationCountry} (${hsCode})`);
                    return res.json({
                        text: cachedRoute.data,
                        searchSources: [],
                        source: 'DATABASE_VERIFIED'
                    });
                }
            } catch (dbError) {
                console.warn("DB Read Error (Proceeding to Live API):", dbError.message);
            }
        }
        */

        // --- STEP 2: LIVE AI EXECUTION (The "Harvesting") ---
        let researchText = "";
        let searchSources = [];

        if (useSearch) {
            console.log("🔍 Starting Google Search...");
            const researchResponse = await genAI.models.generateContent({
                model: modelName,
                contents: researchPrompt,
                config: { temperature: 0.1, tools: [{ googleSearch: {} }] }
            });
            researchText = researchResponse.text || "";
            const groundingChunks = researchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
            searchSources = groundingChunks
                .map(chunk => chunk.web ? { title: chunk.web.title, uri: chunk.web.uri } : null)
                .filter(s => s !== null);
        } else {
            researchText = "(INTERNAL KNOWLEDGE MODE - NO SEARCH)";
        }

        console.log("🧠 Starting Synthesis...");
        const finalPrompt = `RESEARCH CONTEXT:\n${researchText}\n\n${analysisPrompt}`;
        const synthesisResponse = await genAI.models.generateContent({
            model: modelName,
            contents: finalPrompt,
            config: analysisConfig
        });

        const resultText = synthesisResponse.text;

        // --- STEP 3: SAVE TO DATABASE (The "Pending Queue") ---
        // Temporarily disabled for local testing without database
        /*
        if (originCountry && destinationCountry && hsCode && resultText) {
            try {
                prisma.analysisLog.create({
                    data: {
                        originCountry,
                        destCountry: destinationCountry,
                        hsCode,
                        productName: productName || 'Unknown',
                        aiResult: resultText,
                        searchSources: JSON.stringify(searchSources),
                        status: 'PENDING'
                    }
                }).then(() => console.log("📝 Log saved to DB as PENDING"))
                  .catch(e => console.error("Failed to save log:", e.message));
            } catch (e) {
                // Ignore save errors
            }
        }
        */

        res.json({ text: resultText, searchSources, source: 'LIVE_AI' });

    } catch (error) {
        handleError(res, error);
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});