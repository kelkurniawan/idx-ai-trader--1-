import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// ─── Types ────────────────────────────────────────────────────
export interface ArticleBatchInput {
  headline: string;
  summary: string;
  source: string;
}

export interface EstimatedImpact {
  ticker: string;
  low: number;
  high: number;
  direction: 'positive' | 'negative';
  timeframe: 'short' | 'medium' | 'long';
}

export interface ClaudeEnrichedItem {
  impactLevel: 'breaking' | 'high' | 'medium' | 'low' | 'fundamental' | 'regulatory';
  tickers: string[];
  aiConfidence: number;
  category: 'hot' | 'latest' | 'critical' | 'popular';
  whyRelevant: string[];
  estimatedImpact: EstimatedImpact[];
  relevanceReason?: string;
}

export interface ClaudeBatchResult {
  items: ClaudeEnrichedItem[];
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

// ─── System prompt – stable across all batch calls ───────────
const SYSTEM_PROMPT = `You are a senior equity analyst for the Indonesian stock market (IDX/BEI).
Analyze the provided news articles and return structured JSON enrichment data.

TICKER FORMAT: Use IDX 4-letter uppercase codes only (e.g. BBCA, GOTO, TLKM, BMRI).
Include IHSG if it's a macro/broad market event.
Max 5 tickers per article.

IMPACT LEVELS:
- "breaking": Breaking news requiring immediate attention (major earnings miss/beat, M&A, crisis)
- "high": Significant company/sector news
- "medium": Moderate relevance, indirect market impact
- "low": Minimal direct market impact
- "fundamental": Long-term business model / earnings quality
- "regulatory": Government policy, OJK, BI regulation

CATEGORIES:
- "hot": Trending, needs attention NOW
- "latest": Recent news, no special urgency
- "critical": Potential negative impact on investor positions
- "popular": High public interest

whyRelevant: 2-3 short Bahasa Indonesia bullets, each max 80 characters.
estimatedImpact: price range % (e.g. low: 0.5, high: 1.2 means +0.5% to +1.2%)
timeframe: "short" = 1-3 days, "medium" = 1-4 weeks, "long" = > 1 month

Always return a JSON array with EXACTLY the same number of items as the input, 
in the same order. Respond with ONLY the JSON array, no markdown.`;

// ─── Main enrichment function (COST RULE: batch up to 5 per call) ─
export async function enrichBatch(
  articles: ArticleBatchInput[]
): Promise<ClaudeBatchResult> {
  const articleList = articles
    .map(
      (a, i) =>
        `[${i}]\nHeadline: ${a.headline}\nSummary: ${a.summary}\nSource: ${a.source}`
    )
    .join('\n\n');

  const userPrompt = `Analyze these ${articles.length} articles and return a JSON array with exactly ${articles.length} enriched objects:\n\n${articleList}`;

  let items: ClaudeEnrichedItem[] = [];
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 3000,
      temperature: 0.1,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    inputTokens = resp.usage.input_tokens;
    outputTokens = resp.usage.output_tokens;

    const content = resp.content[0]?.type === 'text' ? resp.content[0].text : '[]';

    // Strip any accidental markdown code fences
    const cleaned = content.replace(/```(?:json)?/gi, '').trim();
    items = JSON.parse(cleaned);
  } catch (err) {
    console.error('[Claude] Batch enrichment failed:', err);
    // Return neutral fallback items so pipeline doesn't break
    items = articles.map(() => ({
      impactLevel: 'medium' as const,
      tickers: [],
      aiConfidence: 50,
      category: 'latest' as const,
      whyRelevant: [],
      estimatedImpact: [],
    }));
  }

  // Claude Sonnet pricing (verified 2025): $3/M input, $15/M output
  const estimatedCostUsd =
    (inputTokens / 1_000_000) * 3 + (outputTokens / 1_000_000) * 15;

  return { items, inputTokens, outputTokens, estimatedCostUsd };
}
