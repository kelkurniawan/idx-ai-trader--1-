/**
 * useStripData Hook
 *
 * Fetches strip data on mount and refreshes every 5 minutes.
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchStripData } from '../services/stripApi';
import type { StripData } from '../types/strip';

const REFRESH_INTERVAL = 300_000; // 5 minutes

export function useStripData() {
  const [data, setData] = useState<StripData>({ movers: [], headlines: [] });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const result = await fetchStripData();
    setData(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [load]);

  return { data, loading };
}
