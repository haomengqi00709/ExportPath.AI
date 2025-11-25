const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const app = express();

// Configure CORS to allow requests from your frontend (Vercel)
app.use(cors({
    origin: '*', // For production, replace '*' with your Vercel domain
    methods: ['POST', 'GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

// Increase payload limit for base64 images
app.use(express.json({ limit: '10mb' }));

const apiKey = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenAI({ apiKey });
const modelName = "gemini-2.5-flash";

// Helper for error handling
const handleError = (res, error) => {
    console.error("Backend Error:", error);
    const msg = error.message || "Unknown server error";
    if (msg.includes('429') || msg.includes('quota')) {
        return res.status(429).json({ error: "API Rate Limit Exceeded. Please try again later." });
    }
    res.status(500).json({ error: msg });
};

// 1. Analyze Image Endpoint
app.post('/api/analyze-image', async (req, res) => {
    try {
        const { base64Data, mimeType, prompt, language } = req.body;
        
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
                // Note: Schema is handled by the model instruction in prompt or implicitly, 
                // but passing the schema object from frontend config is safer if complex.
                // For simplicity here, we assume the prompt enforces JSON.
            }
        });

        res.json({ text: response.text });
    } catch (error) {
        handleError(res, error);
    }
});

// 2. Suggest Details Endpoint
app.post('/api/suggest', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        const response = await genAI.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
                temperature: 0.1,
                responseMimeType: "application/json"
            }
        });

        res.json({ text: response.text });
    } catch (error) {
        handleError(res, error);
    }
});

// 3. Main Export Route Analysis Endpoint
app.post('/api/analyze-route', async (req, res) => {
    try {
        const { useSearch, researchPrompt, analysisPrompt, analysisConfig } = req.body;
        
        let researchText = "";
        let searchSources = [];

        // Step 1: Research (Server-side)
        if (useSearch) {
            console.log("Starting Google Search...");
            const researchResponse = await genAI.models.generateContent({
                model: modelName,
                contents: researchPrompt,
                config: {
                    temperature: 0.1,
                    tools: [{ googleSearch: {} }]
                }
            });

            researchText = researchResponse.text || "";
            
            // Extract sources
            const groundingChunks = researchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
            searchSources = groundingChunks
                .map(chunk => chunk.web ? { title: chunk.web.title, uri: chunk.web.uri } : null)
                .filter(s => s !== null);
        } else {
            // Standard mode fallback
            researchText = "(INTERNAL KNOWLEDGE MODE - NO SEARCH)";
        }

        // Step 2: Synthesis
        console.log("Starting Analysis...");
        
        // Inject the research text into the final prompt
        // Note: The frontend sends a template, but we need to inject the actual researchText here
        // Or simpler: The frontend sends the logic, we just execute.
        // To keep it robust: The frontend constructs the final prompt string assuming we inject context.
        // Let's assume the frontend sends the *full prompt* for analysis, but we need to inject the researchText.
        
        // BETTER APPROACH: The frontend sends specific params, backend constructs prompt.
        // But to minimize refactoring, we will assume the frontend sent the `analysisPrompt` string 
        // with a placeholder or we just append the context.
        
        // Let's reconstruct the final prompt here to be safe and secure.
        const finalPrompt = `
            RESEARCH CONTEXT:
            ${researchText}

            ${analysisPrompt} 
        `;

        const synthesisResponse = await genAI.models.generateContent({
            model: modelName,
            contents: finalPrompt,
            config: analysisConfig // Schema passed from frontend
        });

        res.json({ 
            text: synthesisResponse.text, 
            searchSources: searchSources 
        });

    } catch (error) {
        handleError(res, error);
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});