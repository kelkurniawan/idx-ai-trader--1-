import OpenAI from 'openai';
import { ArticleBatchInput, ClaudeBatchResult, ClaudeEnrichedItem } from './claude';

const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY || '',
});

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

export async function enrichBatchDeepSeek(
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
    const resp = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 3000,
    });

    inputTokens = resp.usage?.prompt_tokens ?? 0;
    outputTokens = resp.usage?.completion_tokens ?? 0;

    const content = resp.choices[0]?.message?.content || '[]';
    
    // Attempt to extract the JSON array if there's surrounding text
    const jsonMatch = content.match(/\[([\s\S]*?)\]/);
    let cleaned = content;
    if (jsonMatch && jsonMatch[0]) {
      cleaned = jsonMatch[0];
    } else {
        // Assume it's an object containing an array, maybe under an 'items' key
        try {
            const parsedObj = JSON.parse(content);
            if (!Array.isArray(parsedObj)) {
                // If the LLM returned { "items": [...] } due to json_object format requirements
                const key = Object.keys(parsedObj).find(k => Array.isArray(parsedObj[k]));
                if (key) {
                    cleaned = JSON.stringify(parsedObj[key]);
                }
            }
        } catch {
            cleaned = content.replace(/```(?:json)?/gi, '').trim();
        }
    }
        
    items = JSON.parse(cleaned);

    // Validate array length matches inputs
    if (!Array.isArray(items) || items.length !== articles.length) {
        throw new Error(`Expected exactly ${articles.length} items but got ${Array.isArray(items) ? items.length : 'none'}`);
    }

  } catch (err) {
    console.error('[DeepSeek] Batch enrichment failed:', err);
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

  // DeepSeek V3 pricing is highly competitive: ~$0.14/M input, ~$0.28/M output cache miss
  const estimatedCostUsd =
    (inputTokens / 1_000_000) * 0.14 + (outputTokens / 1_000_000) * 0.28;

  return { items, inputTokens, outputTokens, estimatedCostUsd };
}
