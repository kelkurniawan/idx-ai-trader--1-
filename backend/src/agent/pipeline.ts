import { prisma } from '../db/prisma';
import { scrapeAllFeeds } from './scraper';
import { summarizeAndScore } from './groq';
import { enrichBatch } from './provider';
import { isNewUrl, isBatchDup } from './dedup';

const RELEVANCE_THRESHOLD = parseFloat(process.env.RELEVANCE_THRESHOLD ?? '0.6');
const CLAUDE_BATCH_SIZE = parseInt(process.env.CLAUDE_BATCH_SIZE ?? '5', 10);

/**
 * Full pipeline: Scrape → Groq → Relevance Gate → Claude (batched) → DB
 * Called by the BullMQ worker for each agent run.
 */
export async function runAgentPipeline(agentRunId: string): Promise<void> {
  let groqTokensTotal = 0;
  let claudeInputTotal = 0;
  let claudeOutputTotal = 0;
  let estimatedCostTotal = 0;
  let articlesSaved = 0;
  let articlesDuped = 0;

  try {
    // ── Step 1: Scrape all RSS feeds ─────────────────────────
    console.log(`[Pipeline ${agentRunId}] Step 1: Scraping feeds...`);
    const rawArticles = await scrapeAllFeeds();

    await prisma.agentRun.update({
      where: { id: agentRunId },
      data: { articlesFound: rawArticles.length },
    });

    if (rawArticles.length === 0) {
      console.warn(`[Pipeline ${agentRunId}] No articles scraped, exiting.`);
      await prisma.agentRun.update({
        where: { id: agentRunId },
        data: { status: 'skipped', finishedAt: new Date() },
      });
      return;
    }

    // ── Step 2: URL dedup via Redis ──────────────────────────
    console.log(`[Pipeline ${agentRunId}] Step 2: Deduplicating ${rawArticles.length} articles...`);
    const dedupResults = await Promise.all(
      rawArticles.map(async (a) => ({ a, isNew: await isNewUrl(a.originalUrl) }))
    );
    const freshArticles = dedupResults.filter((r) => r.isNew).map((r) => r.a);
    articlesDuped = rawArticles.length - freshArticles.length;
    console.log(`[Pipeline ${agentRunId}] After dedup: ${freshArticles.length} new, ${articlesDuped} duplicates`);

    if (freshArticles.length === 0) {
      await prisma.agentRun.update({
        where: { id: agentRunId },
        data: { status: 'success', finishedAt: new Date(), articlesDuped },
      });
      return;
    }

    // ── Step 3: Groq pass (FREE) – summarize + relevance score ─
    console.log(`[Pipeline ${agentRunId}] Step 3: Running Groq on ${freshArticles.length} articles...`);
    const groqResults = await Promise.all(
      freshArticles.map(async (article) => {
        const result = await summarizeAndScore(article);
        if (result) groqTokensTotal += result.groqTokensUsed;
        return { article, groq: result };
      })
    );

    // ── Step 4: Filter by relevance threshold (COST GATE) ────
    const relevant = groqResults.filter(
      (r) =>
        r.groq !== null &&
        r.groq.isFinanceRelated === true &&
        r.groq.relevanceScore >= RELEVANCE_THRESHOLD
    );

    console.log(
      `[Pipeline ${agentRunId}] Step 4: ${relevant.length}/${freshArticles.length} passed relevance gate (>= ${RELEVANCE_THRESHOLD})`
    );

    if (relevant.length === 0) {
      await prisma.agentRun.update({
        where: { id: agentRunId },
        data: {
          status: 'success',
          finishedAt: new Date(),
          articlesDuped,
          groqTokensUsed: groqTokensTotal,
        },
      });
      return;
    }

    // ── Step 5: Chunk into batches of CLAUDE_BATCH_SIZE ──────
    const batches: typeof relevant[] = [];
    for (let i = 0; i < relevant.length; i += CLAUDE_BATCH_SIZE) {
      batches.push(relevant.slice(i, i + CLAUDE_BATCH_SIZE));
    }

    console.log(
      `[Pipeline ${agentRunId}] Step 5: Sending ${batches.length} batch(es) to Claude Sonnet...`
    );

    // ── Step 6: Claude enrichment + DB save ──────────────────
    for (const batch of batches) {
      const batchInput = batch.map((r) => ({
        headline: r.article.headline,
        summary: r.groq!.summary,
        source: r.article.source,
      }));

      const claudeResult = await enrichBatch(batchInput);
      claudeInputTotal += claudeResult.inputTokens;
      claudeOutputTotal += claudeResult.outputTokens;
      estimatedCostTotal += claudeResult.estimatedCostUsd;

      for (let i = 0; i < batch.length; i++) {
        const { article, groq } = batch[i];
        const enriched = claudeResult.items[i];
        if (!enriched) continue;

        // COST RULE: skip ticker+headline duplicates to avoid re-storing same story
        let isDup = false;
        for (const ticker of enriched.tickers ?? []) {
          if (await isBatchDup(ticker, article.headline)) {
            isDup = true;
            break;
          }
        }
        if (isDup) { articlesDuped++; continue; }

        try {
          await prisma.newsItem.upsert({
            where: { originalUrl: article.originalUrl },
            update: {},  // idempotent – don't overwrite existing records
            create: {
              headline: article.headline,
              summary: groq!.summary,
              originalUrl: article.originalUrl,
              source: article.source,
              publishedAt: article.publishedAt,
              rawContent: article.rawContent,
              isLive: false,
              isActive: true,
              category: enriched.category ?? 'latest',
              impactLevel: enriched.impactLevel ?? 'medium',
              tickers: enriched.tickers ?? [],
              aiConfidence: enriched.aiConfidence ?? 50,
              whyRelevant: enriched.whyRelevant ?? [],
              estimatedImpact: (enriched.estimatedImpact as any) ?? [],
              relevanceReason: enriched.relevanceReason ?? null,
              agentRunId,
              views: 0,
            },
          });
          articlesSaved++;
        } catch (err) {
          console.error('[Pipeline] Failed to save article:', article.headline, err);
        }
      }
    }

    // ── Step 7: Finalize AgentRun record ──────────────────────
    await prisma.agentRun.update({
      where: { id: agentRunId },
      data: {
        status: 'success',
        finishedAt: new Date(),
        articlesSaved,
        articlesDuped,
        groqTokensUsed: groqTokensTotal,
        claudeInputTokens: claudeInputTotal,
        claudeOutputTokens: claudeOutputTotal,
        estimatedCostUsd: estimatedCostTotal,
      },
    });

    console.log(
      `[Pipeline ${agentRunId}] ✅ Done. Saved: ${articlesSaved}, Duped: ${articlesDuped}, ` +
      `Cost: $${estimatedCostTotal.toFixed(4)}`
    );
  } catch (err: any) {
    console.error(`[Pipeline ${agentRunId}] ❌ Fatal error:`, err);
    await prisma.agentRun.update({
      where: { id: agentRunId },
      data: {
        status: 'failed',
        finishedAt: new Date(),
        errorMessage: err?.message ?? String(err),
        articlesSaved,
        articlesDuped,
        groqTokensUsed: groqTokensTotal,
        claudeInputTokens: claudeInputTotal,
        claudeOutputTokens: claudeOutputTotal,
        estimatedCostUsd: estimatedCostTotal,
      },
    });
    throw err;
  }
}
