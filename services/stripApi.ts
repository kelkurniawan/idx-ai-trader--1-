/**
 * Strip API Client
 *
 * Fetches hybrid strip data (movers + headlines).
 * Public endpoint — no authentication required.
 */

import type { StripData } from '../types/strip';

const API_BASE = import.meta.env.VITE_API_URL || '';

export async function fetchStripData(): Promise<StripData> {
  try {
    const res = await fetch(`${API_BASE}/api/strip/data`);
    if (!res.ok) {
      return { movers: [], headlines: [] };
    }
    return await res.json();
  } catch {
    return { movers: [], headlines: [] };
  }
}
