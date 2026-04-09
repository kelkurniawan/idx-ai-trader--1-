import { ArticleBatchInput, ClaudeBatchResult, enrichBatch as enrichBatchClaude } from './claude';
import { enrichBatchDeepSeek } from './deepseek';

export async function enrichBatch(
  articles: ArticleBatchInput[]
): Promise<ClaudeBatchResult> {
  const provider = process.env.AI_ENRICHMENT_PROVIDER || 'deepseek';

  console.log(`[Provider] Routing enrichment to: ${provider}`);

  if (provider === 'deepseek') {
    if (!process.env.DEEPSEEK_API_KEY) {
      console.warn('[Provider] DEEPSEEK_API_KEY missing, falling back to Claude');
      return fallbackToClaude(articles);
    }
    try {
      return await enrichBatchDeepSeek(articles);
    } catch (e) {
      console.error('[Provider] DeepSeek failed, falling back to Claude:', e);
      return fallbackToClaude(articles);
    }
  }

  if (provider === 'claude') {
    return fallbackToClaude(articles);
  }

  console.warn(`[Provider] Unknown provider ${provider}, falling back to DeepSeek`);
  return await enrichBatchDeepSeek(articles);
}

async function fallbackToClaude(
  articles: ArticleBatchInput[]
): Promise<ClaudeBatchResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[Provider] ANTHROPIC_API_KEY missing! Returning neutral fallback items.');
    return {
      items: articles.map(() => ({
        impactLevel: 'medium',
        tickers: [],
        aiConfidence: 50,
        category: 'latest',
        whyRelevant: [],
        estimatedImpact: [],
      })),
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
    };
  }
  return await enrichBatchClaude(articles);
}
