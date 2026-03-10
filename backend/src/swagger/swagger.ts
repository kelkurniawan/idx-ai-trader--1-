import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SahamGue News API',
      version: '1.0.0',
      description: `AI-powered IDX financial news backend for SahamGue retail trading app.
      
**AI Pipeline:**
- 🆓 **Groq (llama-3.3-70b)** — summarization + relevance scoring (free tier)  
- 💰 **Claude Sonnet** — impact analysis, ticker tagging, confidence scoring (paid, batched ×5)

**Cron:** Every 15 min during IDX market hours (Mon–Fri 08:45–16:15 WIB)`,
      contact: {
        name: 'SahamGue API',
        email: 'dev@sahamgue.com',
      },
    },
    servers: [
      { url: 'http://localhost:3001', description: 'Development' },
      { url: 'https://api.sahamgue.com', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token with `{ userId, role }` payload. Role `admin` required for agent routes.',
        },
      },
      schemas: {
        EstimatedImpact: {
          type: 'object',
          properties: {
            ticker:    { type: 'string', example: 'BBCA' },
            low:       { type: 'number', example: 0.5, description: 'Minimum price change %' },
            high:      { type: 'number', example: 1.8, description: 'Maximum price change %' },
            direction: { type: 'string', enum: ['positive', 'negative'] },
            timeframe: { type: 'string', enum: ['short', 'medium', 'long'] },
          },
        },
        NewsItem: {
          type: 'object',
          properties: {
            id:              { type: 'string', format: 'uuid' },
            headline:        { type: 'string', example: 'BBCA Catat Laba Bersih Q4 2025 Tumbuh 8% YoY' },
            summary:         { type: 'string', description: 'AI-generated summary in Bahasa Indonesia' },
            source:          { type: 'string', example: 'REUTERS ID' },
            publishedAt:     { type: 'string', format: 'date-time' },
            relativeTime:    { type: 'string', example: '2 mnt lalu' },
            isLive:          { type: 'boolean' },
            category:        { type: 'string', enum: ['hot', 'latest', 'critical', 'popular'] },
            impactLevel:     { type: 'string', enum: ['breaking', 'high', 'medium', 'low', 'fundamental', 'regulatory'] },
            tickers:         { type: 'array', items: { type: 'string', example: 'BBCA' } },
            aiConfidence:    { type: 'integer', minimum: 0, maximum: 100, example: 94 },
            estimatedImpact: { type: 'array', items: { $ref: '#/components/schemas/EstimatedImpact' } },
            whyRelevant:     { type: 'array', items: { type: 'string' } },
            relevanceReason: { type: 'string', nullable: true },
            personalized:    { type: 'boolean' },
            views:           { type: 'integer' },
            trendRank:       { type: 'integer', nullable: true },
          },
        },
        PaginatedNewsResponse: {
          type: 'object',
          properties: {
            data:       { type: 'array', items: { $ref: '#/components/schemas/NewsItem' } },
            total:      { type: 'integer', example: 120 },
            page:       { type: 'integer', example: 1 },
            limit:      { type: 'integer', example: 20 },
            totalPages: { type: 'integer', example: 6 },
          },
        },
        AgentRun: {
          type: 'object',
          properties: {
            id:                  { type: 'string', format: 'uuid' },
            startedAt:           { type: 'string', format: 'date-time' },
            finishedAt:          { type: 'string', format: 'date-time', nullable: true },
            status:              { type: 'string', enum: ['running', 'success', 'failed', 'skipped'] },
            agentType:           { type: 'string', example: 'scheduled' },
            articlesFound:       { type: 'integer' },
            articlesSaved:       { type: 'integer' },
            articlesDuped:       { type: 'integer' },
            groqTokensUsed:      { type: 'integer' },
            claudeInputTokens:   { type: 'integer' },
            claudeOutputTokens:  { type: 'integer' },
            estimatedCostUsd:    { type: 'number', example: 0.0234 },
            errorMessage:        { type: 'string', nullable: true },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  },
  // Scan all route files for @swagger JSDoc
  apis: ['./src/api/**/*.ts'],
};

export function setupSwagger(app: Application): void {
  const spec = swaggerJsdoc(options);

  // Swagger UI available with no auth at /api/docs
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(spec, {
      customSiteTitle: 'SahamGue News API Docs',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
      },
    })
  );

  // Also expose raw spec JSON at /api/docs.json
  app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(spec);
  });

  console.log('[Swagger] Docs available at /api/docs');
}
