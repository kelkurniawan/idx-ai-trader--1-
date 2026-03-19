/**
 * usePortfolio Hook
 *
 * Central state management for portfolio holdings, trades, cash, and stats.
 * All mutations refetch relevant data after API calls.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  portfolioApi,
  PortfolioSummary,
  TradeEntry,
  TradeStats,
  HoldingCreate,
  HoldingUpdate,
  TradeCreate,
} from '../services/portfolioApi';

export function usePortfolio() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [trades, setTrades] = useState<TradeEntry[]>([]);
  const [tradeStats, setTradeStats] = useState<TradeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      const data = await portfolioApi.getSummary();
      setSummary(data);
    } catch (err: any) {
      console.error('fetchSummary error:', err);
      setError(err.message || 'Failed to load portfolio');
    }
  }, []);

  const fetchTrades = useCallback(async (params?: { status?: string; ticker?: string; limit?: number; offset?: number }) => {
    try {
      const data = await portfolioApi.getTrades(params);
      setTrades(data);
    } catch (err: any) {
      console.error('fetchTrades error:', err);
      setError(err.message || 'Failed to load trades');
    }
  }, []);

  const fetchTradeStats = useCallback(async () => {
    try {
      const data = await portfolioApi.getTradeStats();
      setTradeStats(data);
    } catch (err: any) {
      console.error('fetchTradeStats error:', err);
      setError(err.message || 'Failed to load trade stats');
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchSummary(), fetchTrades(), fetchTradeStats()]);
    } finally {
      setLoading(false);
    }
  }, [fetchSummary, fetchTrades, fetchTradeStats]);

  // Initial load
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // ── Holdings mutations ──

  const addHolding = useCallback(async (data: HoldingCreate) => {
    try {
      await portfolioApi.addHolding(data);
      await fetchSummary();
    } catch (err: any) {
      console.error('addHolding error:', err);
      setError(err.message || 'Failed to add holding');
      throw err;
    }
  }, [fetchSummary]);

  const updateHolding = useCallback(async (id: number, data: HoldingUpdate) => {
    try {
      await portfolioApi.updateHolding(id, data);
      await fetchSummary();
    } catch (err: any) {
      console.error('updateHolding error:', err);
      setError(err.message || 'Failed to update holding');
      throw err;
    }
  }, [fetchSummary]);

  const deleteHolding = useCallback(async (id: number) => {
    try {
      await portfolioApi.deleteHolding(id);
      await fetchSummary();
    } catch (err: any) {
      console.error('deleteHolding error:', err);
      setError(err.message || 'Failed to delete holding');
      throw err;
    }
  }, [fetchSummary]);

  // ── Cash mutation ──

  const updateCash = useCallback(async (balance: number) => {
    try {
      await portfolioApi.updateCash(balance);
      await fetchSummary();
    } catch (err: any) {
      console.error('updateCash error:', err);
      setError(err.message || 'Failed to update cash');
      throw err;
    }
  }, [fetchSummary]);

  // ── Trade mutations ──

  const addTrade = useCallback(async (data: TradeCreate) => {
    try {
      await portfolioApi.addTrade(data);
      await Promise.all([fetchTrades(), fetchTradeStats()]);
    } catch (err: any) {
      console.error('addTrade error:', err);
      setError(err.message || 'Failed to add trade');
      throw err;
    }
  }, [fetchTrades, fetchTradeStats]);

  const updateTrade = useCallback(async (id: number, data: Partial<TradeCreate>) => {
    try {
      await portfolioApi.updateTrade(id, data);
      await Promise.all([fetchTrades(), fetchTradeStats()]);
    } catch (err: any) {
      console.error('updateTrade error:', err);
      setError(err.message || 'Failed to update trade');
      throw err;
    }
  }, [fetchTrades, fetchTradeStats]);

  const deleteTrade = useCallback(async (id: number) => {
    try {
      await portfolioApi.deleteTrade(id);
      await Promise.all([fetchTrades(), fetchTradeStats()]);
    } catch (err: any) {
      console.error('deleteTrade error:', err);
      setError(err.message || 'Failed to delete trade');
      throw err;
    }
  }, [fetchTrades, fetchTradeStats]);

  return {
    summary,
    trades,
    tradeStats,
    loading,
    error,
    addHolding,
    updateHolding,
    deleteHolding,
    updateCash,
    addTrade,
    updateTrade,
    deleteTrade,
    refreshAll,
  };
}
