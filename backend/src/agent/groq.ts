import Groq from 'groq-sdk';
import { RawArticle } from './scraper';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

// ─── Types ────────────────────────────────────────────────────
export interface GroqResult {
  summary: string;               // Max 200 chars, Bahasa Indonesia
  relevanceScore: number;        // 0.0 – 1.0
  isFinanceRelated: boolean;
  groqTokensUsed: number;
}

// ─── System prompt (stable — not regenerated per call) ────────
const SYSTEM_PROMPT = `You are a financial news analyst for the Indonesian stock exchange (IDX/BEI).
Your job is to: (1) summarize the news article in Bahasa Indonesia in max 200 characters, 
(2) score how relevant it is to Indonesian equities on a scale of 0.0 to 1.0,
(3) determine if it is finance-related at all.

ALWAYS return valid JSON only, no markdown, no explanation:
{
  "summary": "<string, max 200 chars, Bahasa Indonesia>",
  "relevanceScore": <float 0.0-1.0>,
  "isFinanceRelated": <boolean>
}

Score guidance:
- 0.9-1.0: directly impacts specific IDX tickers (earnings, dividends, M&A, regulatory)
- 0.7-0.8: macroeconomic news affecting IDX broadly (BI rate, Rupiah, GDP)
- 0.5-0.6: regional/global financial news with indirect IDX impact
- < 0.5:   unrelated to finance or IDX`;

// ─── Groq summarizer ─────────────────────────────────────────
export async function summarizeAndScore(
  article: RawArticle
): Promise<GroqResult | null> {
  try {
    const resp = await groq.chat.completions.create({
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
      groqTokensUsed: tokensUsed,
    };
  } catch (err) {
    console.error('[Groq] Error processing article:', article.headline, err);
    return null;
  }
}
