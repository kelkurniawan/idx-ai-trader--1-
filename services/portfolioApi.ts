/**
 * Portfolio API Service
 *
 * Handles all calls to /api/portfolio/* endpoints.
 * Sessions are managed via HTTP-only cookies (same as authApi.ts).
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

export interface PortfolioHolding {
  id: number;
  ticker: string;
  avg_buy_price: number;
  current_price: number;
  lot: number;
  cost_basis: number;
  market_value: number;
  unrealized_pnl: number;
  unrealized_pct: number;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface HoldingCreate {
  ticker: string;
  avg_buy_price: number;
  current_price: number;
  lot: number;
  notes?: string;
}

export interface HoldingUpdate {
  avg_buy_price?: number;
  current_price?: number;
  lot?: number;
  notes?: string;
}

export interface TradeEntry {
  id: number;
  ticker: string;
  trade_type: 'BUY' | 'SELL';
  entry_price: number;
  exit_price: number | null;
  lot: number;
  strategy: string | null;
  notes: string | null;
  trade_date: string;
  realized_pnl: number | null;
  realized_pct: number | null;
  status: 'OPEN' | 'CLOSED';
  created_at: string;
}

export interface TradeCreate {
  ticker: string;
  trade_type: 'BUY' | 'SELL';
  entry_price: number;
  exit_price?: number;
  lot: number;
  strategy?: 'Swing' | 'Scalp' | 'Breakout' | 'Value' | 'Dividen';
  notes?: string;
  trade_date: string;
}

export interface BrokerCash {
  cash_balance: number;
  last_updated: string | null;
}

export interface PortfolioSummary {
  holdings: PortfolioHolding[];
  cash_balance: number;
  holdings_value: number;
  total_cost: number;
  unrealized_pnl: number;
  unrealized_pct: number;
  total_portfolio: number;
}

export interface TradeStats {
  total_trades: number;
  closed_trades: number;
  open_trades: number;
  total_pnl: number;
  win_count: number;
  loss_count: number;
  win_rate: number;
}

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

async function portfolioFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${API_BASE}/api/portfolio${path}`;
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return res;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Network error' }));
    throw new Error(error.detail || `Request failed with status ${res.status}`);
  }
  return res.json();
}

// ────────────────────────────────────────────────────────────────
// API Functions
// ────────────────────────────────────────────────────────────────

export const portfolioApi = {
  // Summary
  getSummary: async (): Promise<PortfolioSummary> => {
    const res = await portfolioFetch('/summary');
    return handleResponse<PortfolioSummary>(res);
  },

  // Holdings
  getHoldings: async (): Promise<PortfolioHolding[]> => {
    const res = await portfolioFetch('/holdings');
    return handleResponse<PortfolioHolding[]>(res);
  },

  addHolding: async (data: HoldingCreate): Promise<PortfolioHolding> => {
    const res = await portfolioFetch('/holdings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse<PortfolioHolding>(res);
  },

  updateHolding: async (id: number, data: HoldingUpdate): Promise<PortfolioHolding> => {
    const res = await portfolioFetch(`/holdings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return handleResponse<PortfolioHolding>(res);
  },

  deleteHolding: async (id: number): Promise<void> => {
    const res = await portfolioFetch(`/holdings/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Delete failed' }));
      throw new Error(error.detail || 'Delete failed');
    }
  },

  // Cash
  getCash: async (): Promise<BrokerCash> => {
    const res = await portfolioFetch('/cash');
    return handleResponse<BrokerCash>(res);
  },

  updateCash: async (balance: number): Promise<BrokerCash> => {
    const res = await portfolioFetch('/cash', {
      method: 'PUT',
      body: JSON.stringify({ cash_balance: balance }),
    });
    return handleResponse<BrokerCash>(res);
  },

  // Trades
  getTrades: async (params?: { status?: string; ticker?: string; limit?: number; offset?: number }): Promise<TradeEntry[]> => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.ticker) searchParams.set('ticker', params.ticker);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    const qs = searchParams.toString();
    const res = await portfolioFetch(`/trades${qs ? `?${qs}` : ''}`);
    return handleResponse<TradeEntry[]>(res);
  },

  getTradeStats: async (): Promise<TradeStats> => {
    const res = await portfolioFetch('/trades/stats');
    return handleResponse<TradeStats>(res);
  },

  addTrade: async (data: TradeCreate): Promise<TradeEntry> => {
    const res = await portfolioFetch('/trades', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse<TradeEntry>(res);
  },

  updateTrade: async (id: number, data: Partial<TradeCreate>): Promise<TradeEntry> => {
    const res = await portfolioFetch(`/trades/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return handleResponse<TradeEntry>(res);
  },

  deleteTrade: async (id: number): Promise<void> => {
    const res = await portfolioFetch(`/trades/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Delete failed' }));
      throw new Error(error.detail || 'Delete failed');
    }
  },
};
