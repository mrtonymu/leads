# Dignity Leads CRM - AI Features Design

## Overview

Integrate 8 AI features into the existing CRM using Gemini 2.0 Flash free API, with a shared system prompt that embodies Malaysian real estate advisor communication style.

## AI Features (Priority Order)

1. **AI Reply Suggestions** - Paste customer reply → AI gives 2-3 response options → Select → Fill into WhatsApp
2. **AI Message Generation** - Auto-generate personalized WhatsApp messages based on lead + project data
3. **AI Daily Summary** - Auto-summarize today's follow-up tasks with actionable suggestions
4. **AI Intent Analysis** - Auto-classify leads as Hot/Warm/Cold based on CRM data
5. **AI Follow-up Topic Suggestions** - Smart follow-up angles for Day 3/7 based on customer notes
6. **AI Objection Handling** - Handle objections (too expensive / still thinking / looking at competitors)
7. **AI Auto Tags** - Suggest tags based on lead data, user confirms before adding
8. **AI Brochure Analysis** - Upload sales kit/brochure → AI extracts selling points with altruistic framing

## System Prompt

```
ROLE:
You are an AI assistant for a Malaysian real estate Advisor (not an agent/salesperson).
You help the advisor communicate effectively with property buyers.
Position: Not a pusher. A consultant who helps clients make the best property decision.
Perspective: Always think from the client's point of view, not the seller's.
Tone: Professional but not cold. Like a knowledgeable friend giving advice.
Never say "buy" - say "own", "secure", "lock in".
Never say "sell to you" - say "help you analyze", "help you negotiate".

LANGUAGE RULES:
- Auto-detect customer language and match it
- Chinese (华语): Malaysian colloquial style. Use "你" not "您". Casual, local.
- English: Native casual. No formal business English.
- Malay: Use abbreviations and slang (xpe, dtg, blh, mcm mane, utk, boss, kakak)
- Style: WhatsApp chat, NOT email.

6 COMMUNICATION PRINCIPLES:
1. State facts objectively. Never blame or pressure.
2. Proactively offer an exit. Show subtle vulnerability.
3. Set boundaries. Demonstrate professional follow-through.
4. Minimize pressure. Cut risk for the client.
5. Self-reflect rather than blame externally.
6. Use emotional leverage, not hard selling.

ALTRUISTIC THINKING:
- Never talk about how good the product specs are
- Talk about what pain points it solves for the client
- Lead with the conclusion - first sentence shows core benefit

CORE SALES PHILOSOPHY:
- NEVER directly ask "have you decided?" or "how's your consideration?"
- Client not replying = they haven't found a compelling reason yet
- Your job: help clients discover their own pain points and timing:
  · Kids starting school? → School district urgency
  · Rent keeps increasing? → Calculate rent vs mortgage
  · Interest rates rising? → Lock in now
- Every follow-up must provide NEW value (new info, new angle, new calculation)
- Never repeat the same question
- Sales is not one conversation, it's continuous trust-building
- Many deals close on the 5th-7th follow-up

OUTPUT RULES:
- Short! Short! Short! Like a friend sending WhatsApp
- Replies: 1-3 sentences, max 3 lines
- Sending materials: Max 5 sentences, highlight key points
- Always end with a question (encourage reply)
- Max 1-2 emojis
- FORBIDDEN: Long essays, official tone, textbook-style replies
- FORBIDDEN: "Dear customer", "Thank you for your inquiry" type phrases
- Tone should be as natural as chatting with a friend
```

## Architecture

```
src/lib/ai.ts (Core AI Service)
├── SYSTEM_PROMPT (shared)
├── callGemini(prompt, context) → generic caller
├── generateReplySuggestions(customerReply, lead, timeline) → 3 options
├── generateMessage(lead, project, dayType) → message
├── generateDailySummary(leads, timeline) → summary
├── analyzeIntent(leads, timeline) → Hot/Warm/Cold per lead
├── suggestFollowUp(leads, timeline) → topic per lead
├── handleObjection(objection, lead, project) → 3 responses
├── suggestTags(lead, timeline) → tag suggestions
└── analyzeBrochure(file) → selling points
```

## UI Placement

| Feature | Page | Trigger |
|---------|------|---------|
| AI Reply Suggestions | Lead Detail | Manual button |
| AI Message Generation | Lead Detail | Manual button |
| AI Daily Summary | Dashboard (top) | Auto on open |
| AI Intent Analysis | Lead List | Auto on open |
| AI Follow-up Topics | Dashboard (per lead) | Auto on open |
| AI Objection Handling | Lead Detail (merged with Reply) | Manual button |
| AI Auto Tags | Lead Detail | Manual button |
| AI Brochure Analysis | Project Detail | Manual button |

## API Call Strategy

### Batching
- Dashboard: 1 call for daily summary + follow-up topics (batched)
- Lead List: 1 call for all intent analysis (batched)
- Manual features: 1 call per click

### Caching
- Dashboard: Cache 30 minutes, manual refresh available
- Lead List intent: Cache until lead data changes
- Manual features: No cache (input differs each time)

### Daily Usage Estimate
- Worst case (100 leads, busy day): ~72 calls/day
- Free tier limit: 1500 calls/day → More than enough

## API Security
- Set HTTP referrer restriction in Google AI Studio (only allow your domain)
- API key stored in environment variables (VITE_GEMINI_API_KEY)

## Decision Log

| # | Decision | Alternatives | Reason |
|---|----------|-------------|--------|
| 1 | Gemini 2.0 Flash free API | Paid API / Google One | Zero cost, sufficient quota |
| 2 | Unified AI service layer | Separate modules per feature | Shared prompt ensures style consistency |
| 3 | Merge reply suggestions + objection handling | Separate features | Same UX flow, AI auto-detects context |
| 4 | Batch API calls + caching | Individual calls | Save quota, faster response |
| 5 | Frontend direct Gemini calls | Backend proxy | Zero cost, no extra server |
| 6 | Advisor positioning in system prompt | Configurable | Core identity, prevents AI drift |
| 7 | 6 communication principles in prompt | Basic rules only | Elevates AI output quality |
| 8 | Tags require user confirmation | Full auto | Prevents AI mistakes, user stays in control |

## Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| API key exposed in frontend | Key could be misused | Set HTTP referrer restriction in Google AI Studio |
| AI output not local enough | Feels unnatural | User can edit before sending, iterative prompt tuning |
| Free tier reduced in future | Features limited | Current usage far below limit |
| Gemini slow response | User waits | Loading state + 10s timeout |

## Tech Details

- **Model**: Gemini 2.0 Flash (gemini-2.0-flash)
- **Existing dependency**: `@google/genai` already in package.json
- **API Key**: AIzaSyAp57LloBpYdV2_afA7s7sK3ZlOtOPDBUE (store in VITE_GEMINI_API_KEY)
- **Cost**: $0 (free tier: 15 RPM, 1500 RPD)
