import { Router, Request, Response, NextFunction } from 'express';
import {
  getNewsFeed,
  getPersonalizedNews,
  getNewsByTicker,
  getNewsById,
  incrementViews,
} from './news.service';

const router = Router();

/**
 * @swagger
 * /news/feed:
 *   get:
 *     summary: Get paginated news feed
 *     description: Returns news articles filtered by tab/category with pagination. Sorted by publishedAt desc, or by views desc for the "popular" tab.
 *     tags: [News]
 *     parameters:
 *       - in: query
 *         name: tab
 *         schema:
 *           type: string
 *           enum: [hot, latest, critical, popular]
 *         description: News tab filter (takes precedence over category)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Category override when tab is not specified
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Paginated news list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedNewsResponse'
 */
router.get('/feed', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tab, category, page = '1', limit = '20' } = req.query as Record<string, string>;
    const result = await getNewsFeed({
      tab,
      category,
      page: Math.max(1, parseInt(page, 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 20)),
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /news/personalized:
 *   get:
 *     summary: Get personalized news for a user's watchlist
 *     description: Returns news articles filtered by the user's stored watchlist tickers, or an explicit override list.
 *     tags: [News]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: User ID to look up stored watchlist preferences
 *       - in: query
 *         name: tickers
 *         schema:
 *           type: string
 *         description: Comma-separated IDX ticker codes to override user watchlist (e.g. BBCA,GOTO)
 *     responses:
 *       200:
 *         description: Personalized news list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/NewsItem'
 */
router.get('/personalized', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, tickers } = req.query as Record<string, string>;
    const tickerList = tickers
      ? tickers.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean)
      : [];
    const data = await getPersonalizedNews(userId, tickerList);
    res.json(data);
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /news/ticker/{code}:
 *   get:
 *     summary: Get all news for a specific IDX ticker code
 *     tags: [News]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[A-Z]{1,5}$'
 *         description: IDX ticker code (1-5 uppercase letters, e.g. BBCA)
 *         example: BBCA
 *     responses:
 *       200:
 *         description: News articles mentioning this ticker
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/NewsItem'
 *       400:
 *         description: Invalid ticker format
 */
router.get('/ticker/:code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = req.params.code.toUpperCase();
    if (!/^[A-Z]{1,5}$/.test(code)) {
      return res.status(400).json({ error: 'Invalid ticker code format' });
    }
    res.json(await getNewsByTicker(code));
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /news/{id}:
 *   get:
 *     summary: Get a single news article by UUID
 *     tags: [News]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: NewsItem UUID
 *     responses:
 *       200:
 *         description: Single news item
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NewsItem'
 *       404:
 *         description: Article not found
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await getNewsById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Article not found' });
    incrementViews(req.params.id);
    res.json(item);
  } catch (e) {
    next(e);
  }
});

export { router as newsRouter };
