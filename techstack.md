# SahamGue IDX AI Trader Tech Stack

This project uses a dual-backend monorepo architecture leveraging modern web technologies. 

## Frontend
- **Framework:** React 19 (managed via Vite)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (v4) + Vanilla CSS (`index.css`)
- **Icons:** Lucide React
- **Charting & Visualization:**
  - Lightweight Charts (TradingView)
  - Recharts (General data visualization)

## Python Backend (Core API)
Handles primary user interactions, authentication, profile management, and direct AI analysis.
- **Framework:** FastAPI
- **Language:** Python 3.12
- **Database ORM:** SQLAlchemy (asyncpg)
- **Migrations:** Alembic
- **Pydantic:** Data validation and settings
- **Authentication:** PyJWT, passlib (bcrypt), pyotp (MFA/TOTP)
- **AI Integration:** Google Generative AI (`google-generativeai`)
- **Data Processing:** Pandas, NumPy

## Node.js Backend (AI News Microservice)
Handles scheduled background jobs, LLM scraping, and the news pipeline.
- **Framework:** Express.js
- **Language:** TypeScript
- **Database ORM:** Prisma
- **Queue System:** BullMQ (backed by Redis)
- **AI Integration:**
  - Anthropic Claude (`@anthropic-ai/sdk`)
  - Groq (`groq-sdk`)
- **Utilities:** `node-cron` (scheduling), `rss-parser`
- **Documentation:** Swagger UI (`swagger-jsdoc`, `swagger-ui-express`)

## Infrastructure & DevOps
- **Database:** PostgreSQL (shared across both backends)
- **Cache / Message Broker:** Redis
- **Reverse Proxy / API Gateway:** Caddy (`Caddyfile` configuration)
- **Containerization:** Docker (`Dockerfile.frontend`, `Dockerfile.python`, `Dockerfile.node`)
