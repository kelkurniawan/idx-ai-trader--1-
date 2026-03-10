-- CreateTable
CREATE TABLE "news_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rssUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_items" (
    "id" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "summary" TEXT,
    "originalUrl" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT NOT NULL,
    "impactLevel" TEXT NOT NULL,
    "tickers" TEXT[],
    "aiConfidence" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "trendRank" INTEGER,
    "whyRelevant" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "estimatedImpact" JSONB,
    "relevanceReason" TEXT,
    "rawContent" TEXT,
    "sourceId" TEXT,
    "agentRunId" TEXT NOT NULL,

    CONSTRAINT "news_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_runs" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'running',
    "agentType" TEXT NOT NULL,
    "articlesFound" INTEGER NOT NULL DEFAULT 0,
    "articlesSaved" INTEGER NOT NULL DEFAULT 0,
    "articlesDuped" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "groqTokensUsed" INTEGER NOT NULL DEFAULT 0,
    "claudeInputTokens" INTEGER NOT NULL DEFAULT 0,
    "claudeOutputTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0.0,

    CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_personalizations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "watchlistTickers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredSources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_personalizations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "news_sources_name_key" ON "news_sources"("name");

-- CreateIndex
CREATE UNIQUE INDEX "news_sources_rssUrl_key" ON "news_sources"("rssUrl");

-- CreateIndex
CREATE UNIQUE INDEX "news_items_originalUrl_key" ON "news_items"("originalUrl");

-- CreateIndex
CREATE INDEX "news_items_publishedAt_idx" ON "news_items"("publishedAt" DESC);

-- CreateIndex
CREATE INDEX "news_items_category_idx" ON "news_items"("category");

-- CreateIndex
CREATE INDEX "news_items_impactLevel_idx" ON "news_items"("impactLevel");

-- CreateIndex
CREATE INDEX "news_items_agentRunId_idx" ON "news_items"("agentRunId");

-- CreateIndex
CREATE INDEX "news_items_isActive_idx" ON "news_items"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "user_personalizations_userId_key" ON "user_personalizations"("userId");

-- AddForeignKey
ALTER TABLE "news_items" ADD CONSTRAINT "news_items_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "news_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_items" ADD CONSTRAINT "news_items_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "agent_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
