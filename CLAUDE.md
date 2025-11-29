# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pocket TC (Pocket Trade Commissioner) is an international trade route analysis tool that uses Google's Gemini AI to provide export feasibility analysis. It analyzes product exports between countries, calculating costs (tariffs, VAT, shipping, compliance), profit margins, competitor pricing, and provides optimization strategies.

**Stack:**
- Frontend: React 19 + TypeScript + Vite
- Backend: Express.js (Node.js) with Gemini AI integration
- Database: Prisma (planned RAG database for caching verified trade routes)
- Styling: Tailwind CSS (inline classes)
- AI: Google Gemini 2.5 Flash with grounding search capabilities

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment instructions to Vercel (frontend) and Railway (backend).

## Development Commands

### Frontend (Root Directory)
```bash
# Install dependencies
npm install

# Run development server (port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Backend (backend/ Directory)
```bash
# Install dependencies
cd backend && npm install

# Generate Prisma client
npm run postinstall  # or: npx prisma generate

# Start backend server (port 8080)
npm start  # or: node server.js
```

### Environment Setup
- Frontend: Create `.env.local` with `GEMINI_API_KEY=your_key`
- Backend: Create `.env` with `GOOGLE_API_KEY=your_key`
- Backend optional: `DEMO_SECRET=secret_key` for rate limit bypass

## Architecture Overview

### Data Flow (Two-Stage AI Analysis)
1. **User Input** → InputForm → App state
2. **Research Phase** (if Deep Search enabled):
   - Client sends `researchPrompt` to backend `/api/analyze-route`
   - Backend uses Gemini with Google Search grounding
   - Extracts search sources and raw research text
3. **Synthesis Phase**:
   - Backend combines research context + `analysisPrompt`
   - Returns structured JSON (DashboardData) via response schema
4. **RAG Database** (Planned):
   - Backend checks database for verified routes before AI calls
   - Saves new analysis as PENDING in `analysisLog`
   - Admin verification converts to `tradeRoute` with VERIFIED status

### Key Components Structure
- **App.tsx**: Main orchestrator, manages analysis state, freemium logic, paywall
- **InputForm.tsx**: Product configuration, image upload, country selection, search mode toggle
- **SingleRouteAnalysis.tsx**: Primary route display (cost breakdown, optimization strategies)
- **CompetitorAnalysis.tsx**: Market intelligence (competitor pricing, charts)
- **services/geminiService.ts**: All API calls to backend proxy
  - `analyzeProductImage()` - Image → product specs
  - `suggestProductDetails()` - Text → HS code suggestions
  - `analyzeExportRoutes()` - Main analysis endpoint
- **backend/server.js**: Express proxy handling Gemini API calls, rate limiting, RAG lookup

### Type System (types.ts)
Core interfaces:
- **ExportInput**: User form data (product, origin, dest, HS code, cost, currency)
- **DashboardData**: Complete analysis result
  - `primaryAnalysis`: MarketAnalysis (primary route)
  - `marketIntelligence`: Competitor data
  - `alternatives`: Other recommended countries
- **MarketAnalysis**: Cost breakdown, tariffs, VAT, compliance risk, optimization strategies
- **OptimizationStrategy**: Tax strategies, VAT handling, compliance deep dive, logistics routes

### Freemium Model
- Default: 3 analyses per day (localStorage tracking by date)
- Pro Mode: Unlimited access
- Bypass: Click logo 5x OR run `window.enableProMode()` in console
- Paywall modal shown when limit reached
- No backend validation (client-side only demonstration)

### Backend API Endpoints
- `POST /api/analyze-image`: Vision analysis (product photo → specs)
- `POST /api/suggest`: Text-based product suggestions
- `POST /api/analyze-route`: Main RAG-enabled analysis
  - Check database for verified routes first
  - Fall back to live AI (research + synthesis)
  - Save result to `analysisLog` as PENDING

### Rate Limiting
- Backend: 20 requests per minute per IP
- Bypass: Send `x-demo-secret` header matching env var
- Frontend errors: Shows "⚠️ API Rate Limit Exceeded" message

### Internationalization
6 languages supported via `translations.ts`:
- English (en), Simplified Chinese (zh), Traditional Chinese (tw)
- French (fr), German (de), Spanish (es)
- Language passed to Gemini prompts for localized responses
- All UI text keyed by language code

### Response Schema Construction
The frontend constructs a detailed JSON schema (services/geminiService.ts:151-199) that enforces structured output from Gemini, ensuring type safety between AI response and TypeScript interfaces.

## Common Tasks

### Adding New Analysis Fields
1. Update `MarketAnalysis` interface in types.ts
2. Add field to response schema in geminiService.ts (analysisConfig)
3. Update `analysisPrompt` to request new data
4. Display in SingleRouteAnalysis.tsx

### Modifying AI Behavior
- Research prompt: geminiService.ts:116-128 (search instructions)
- Analysis prompt: geminiService.ts:130-146 (synthesis rules)
- Temperature/config: geminiService.ts:152 and backend/server.js

### Backend URL Configuration
- Development: `http://localhost:8080` (automatic)
- Production: Update BACKEND_URL in geminiService.ts:6

### Testing Search vs Internal Mode
Toggle "Deep Search" switch in InputForm to control `useSearch` parameter:
- ON: Gemini searches web for current tariff data
- OFF: Uses internal training knowledge only

### Database Schema
When Prisma schema exists, run migrations:
```bash
cd backend
npx prisma migrate dev
npx prisma studio  # View/edit database
```

## Important Notes

- All monetary calculations happen in AI synthesis (not frontend math)
- Country ISO codes use 2-letter codes for flag display (`fi fi-{code}` class)
- Image uploads limited to 10MB (backend express.json limit)
- Print functionality: Uses CSS classes `.no-print` to hide UI controls
- Cancellation: Uses `requestRef` to track active request and ignore stale results
- Deep Search incurs 2 Gemini API calls (Research + Synthesis); Standard mode uses 1
