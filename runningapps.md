# Guide to Running IDX AI Trader Locally

This project uses a modern dual-backend monorepo architecture. To run the complete application locally, you will need to start three separate servers (and optionally, the Caddy API Gateway).

Here are the step-by-step instructions. It is recommended to open **3 or 4 separate terminal windows**.

---

## 1. Python Backend (Core API)

The core API handles authentication, profiles, and standard stock analysis. It runs on `localhost:8000`.

**In Terminal 1:**
```bash
# Navigate to the backend directory
cd backend

# Activate the virtual environment (Windows)
venv\Scripts\activate

# (Optional: If you are on Mac/Linux, use: source venv/bin/activate)

# Install requirements (if not done already)
pip install -r requirements.txt

# Start the FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## 2. Node.js Backend (AI News Microservice)

The Node.js backend handles the scheduling, scraping, and AI analysis for news. It runs on `localhost:3001`.

**In Terminal 2:**
```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install

# Start the Node.js TSX dev server
npm run dev
```

---

## 3. Frontend (React / Vite)

The frontend application provides the UI for the IDX AI Trader. It runs on `localhost:3000`.

**In Terminal 3:**
```bash
# Ensure you are in the root directory
# cd .. (if you were previously in the backend folder)

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

---

## 4. API Gateway (Optional but Recommended)

For the frontend to successfully communicate with both backends without CORS issues on a single port, the application uses **Caddy** as a reverse proxy. 

**In Terminal 4:**
```bash
# Ensure you are in the root directory where the Caddyfile is located
# Start the Caddy server
caddy run --config Caddyfile
```

*Note: Once Caddy is running, the unified application (Frontend + Gateway APIs) can be accessed at `http://localhost:8080`.*
