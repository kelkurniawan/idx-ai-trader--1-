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
  tickers: string[];             // IDX ticker codes mentioned/affected
  groqTokensUsed: number;
}

const VALID_IMPACTS: ImpactLevel[] = ['breaking', 'high', 'medium', 'low'];

/** Coerce any model output into a valid ImpactLevel (defaults to 'medium'). */
function normalizeImpact(raw: unknown): ImpactLevel {
  const v = String(raw ?? '').toLowerCase().trim() as ImpactLevel;
  return VALID_IMPACTS.includes(v) ? v : 'medium';
}

/** Keep only well-formed IDX ticker codes (1-5 uppercase letters), deduped, max 5. */
function normalizeTickers(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw) {
    const code = String(t ?? '').toUpperCase().trim();
    if (/^[A-Z]{1,5}$/.test(code) && !seen.has(code)) {
      seen.add(code);
      out.push(code);
      if (out.length >= 5) break;
    }
  }
  return out;
}

// ─── System prompt (stable — not regenerated per call) ────────
const SYSTEM_PROMPT = `You are a financial news analyst for the Indonesian stock exchange (IDX/BEI).
Your job is to: (1) summarize the news article in Bahasa Indonesia in max 200 characters,
(2) score how relevant it is to Indonesian equities on a scale of 0.0 to 1.0,
(3) determine if it is finance-related at all,
(4) classify its market impact level,
(5) extract the IDX ticker codes of listed companies named or clearly affected.

ALWAYS return valid JSON only, no markdown, no explanation:
{
  "summary": "<string, max 200 chars, Bahasa Indonesia>",
  "relevanceScore": <float 0.0-1.0>,
  "isFinanceRelated": <boolean>,
  "impactLevel": "<breaking|high|medium|low>",
  "tickers": ["<IDX ticker code, 4 uppercase letters>"]
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
- "low":      tangential or non-finance news

tickers guidance:
- Use the official 4-letter IDX code, e.g. Bank Central Asia -> BBCA, Telkom -> TLKM,
  Bank Rakyat Indonesia -> BBRI, GoTo -> GOTO, Astra International -> ASII.
- Only include companies actually named or unambiguously the subject of the article.
- Return an empty array [] when no specific listed company is involved (macro/sector news).
- Max 5 tickers, most relevant first. Do NOT guess or invent codes.`;

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
      tickers: normalizeTickers(parsed.tickers),
      groqTokensUsed: tokensUsed,
    };
  } catch (err) {
    console.error('[Groq] Error processing article:', article.headline, err);
    return null;
  }
}
