import Groq from 'groq-sdk';
import { RawArticle } from './scraper';

// Lazy client: instantiate on first use, not at import time, so a missing
// GROQ_API_KEY does not crash the whole server at boot. A missing key only
// fails the (try/catch-wrapped) call below, which returns null for that article.
let _groq: Groq | null = null;
function getGroq(): Groq {
  if (!_groq) {
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' });
  }
  return _groq;
}

// ─── Types ────────────────────────────────────────────────────
export type ImpactLevel = 'breaking' | 'high' | 'medium' | 'low';

export interface GroqResult {
  summary: string;               // Max 200 chars, Bahasa Indonesia
  relevanceScore: number;        // 0.0 – 1.0
  isFinanceRelated: boolean;
  impactLevel: ImpactLevel;      // market impact, classified by Groq
  groqTokensUsed: number;
}

const VALID_IMPACTS: ImpactLevel[] = ['breaking', 'high', 'medium', 'low'];

/** Coerce any model output into a valid ImpactLevel (defaults to 'medium'). */
function normalizeImpact(raw: unknown): ImpactLevel {
  const v = String(raw ?? '').toLowerCase().trim() as ImpactLevel;
  return VALID_IMPACTS.includes(v) ? v : 'medium';
}

// ─── System prompt (stable — not regenerated per call) ────────
const SYSTEM_PROMPT = `You are a financial news analyst for the Indonesian stock exchange (IDX/BEI).
Your job is to: (1) summarize the news article in Bahasa Indonesia in max 200 characters,
(2) score how relevant it is to Indonesian equities on a scale of 0.0 to 1.0,
(3) determine if it is finance-related at all,
(4) classify its market impact level.

ALWAYS return valid JSON only, no markdown, no explanation:
{
  "summary": "<string, max 200 chars, Bahasa Indonesia>",
  "relevanceScore": <float 0.0-1.0>,
  "isFinanceRelated": <boolean>,
  "impactLevel": "<breaking|high|medium|low>"
}

Score guidance:
- 0.9-1.0: directly impacts specific IDX tickers (earnings, dividends, M&A, regulatory)
- 0.7-0.8: macroeconomic news affecting IDX broadly (BI rate, Rupiah, GDP)
- 0.5-0.6: regional/global financial news with indirect IDX impact
- < 0.5:   unrelated to finance or IDX

impactLevel guidance:
- "breaking": urgent market-moving event right now (halt, default, major M&A, regulatory shock)
- "high":     clearly affects specific tickers (earnings beat/miss, dividends, guidance, sanctions)
- "medium":   relevant context, sector/macro news, ordinary corporate updates
- "low":      tangential or non-finance news`;

// ─── Groq summarizer ─────────────────────────────────────────
export async function summarizeAndScore(
  article: RawArticle
): Promise<GroqResult | null> {
  try {
    const resp = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      max_tokens: 300,
      temperature: 0.2, // low temp for consistent scoring
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Headline: ${article.headline}\n\nContent: ${article.rawContent.slice(0, 800)}`,
        },
      ],
    });

    const tokensUsed = resp.usage?.total_tokens ?? 0;
    let parsed: any = {};

    try {
      parsed = JSON.parse(resp.choices[0]?.message?.content ?? '{}');
    } catch {
      return null;
    }

    return {
      summary: String(parsed.summary ?? '').slice(0, 250),
      relevanceScore: Math.min(1, Math.max(0, Number(parsed.relevanceScore ?? 0))),
      isFinanceRelated: Boolean(parsed.isFinanceRelated ?? false),
      impactLevel: normalizeImpact(parsed.impactLevel),
      groqTokensUsed: tokensUsed,
    };
  } catch (err) {
    console.error('[Groq] Error processing article:', article.headline, err);
    return null;
  }
}
