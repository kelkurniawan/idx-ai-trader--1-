"""In-process operations metrics for the admin monitor."""

from __future__ import annotations

import time
from collections import defaultdict, deque
from dataclasses import dataclass
from threading import Lock


@dataclass
class RouteMetric:
    count: int = 0
    errors: int = 0
    total_ms: float = 0.0


class OpsMetrics:
    def __init__(self) -> None:
        self.started_at = time.time()
        self._lock = Lock()
        self._route_metrics: dict[str, RouteMetric] = defaultdict(RouteMetric)
        self._minute_buckets: deque[dict] = deque(maxlen=120)

    def record(self, path: str, status_code: int, duration_ms: float) -> None:
        now_minute = int(time.time() // 60) * 60
        route_key = self._route_key(path)
        with self._lock:
            metric = self._route_metrics[route_key]
            metric.count += 1
            metric.total_ms += duration_ms
            if status_code >= 500:
                metric.errors += 1

            if not self._minute_buckets or self._minute_buckets[-1]["timestamp"] != now_minute:
                self._minute_buckets.append(
                    {
                        "timestamp": now_minute,
                        "requests": 0,
                        "errors": 0,
                        "ai_requests": 0,
                        "total_ms": 0.0,
                    }
                )
            bucket = self._minute_buckets[-1]
            bucket["requests"] += 1
            bucket["total_ms"] += duration_ms
            if status_code >= 500:
                bucket["errors"] += 1
            if path.startswith("/api/ai"):
                bucket["ai_requests"] += 1

    def snapshot(self) -> dict:
        with self._lock:
            routes = []
            total_requests = 0
            total_errors = 0
            total_ms = 0.0
            for path, metric in self._route_metrics.items():
                avg_ms = metric.total_ms / metric.count if metric.count else 0
                routes.append(
                    {
                        "path": path,
                        "requests": metric.count,
                        "errors": metric.errors,
                        "avg_ms": round(avg_ms, 2),
                    }
                )
                total_requests += metric.count
                total_errors += metric.errors
                total_ms += metric.total_ms

            buckets = []
            for bucket in self._minute_buckets:
                avg_ms = bucket["total_ms"] / bucket["requests"] if bucket["requests"] else 0
                buckets.append(
                    {
                        "timestamp": bucket["timestamp"],
                        "requests": bucket["requests"],
                        "errors": bucket["errors"],
                        "ai_requests": bucket["ai_requests"],
                        "avg_ms": round(avg_ms, 2),
                    }
                )

        return {
            "uptime_seconds": int(time.time() - self.started_at),
            "total_requests": total_requests,
            "total_errors": total_errors,
            "error_rate": round(total_errors / total_requests, 4) if total_requests else 0,
            "avg_ms": round(total_ms / total_requests, 2) if total_requests else 0,
            "routes": sorted(routes, key=lambda item: item["requests"], reverse=True)[:20],
            "traffic": buckets,
        }

    @staticmethod
    def _route_key(path: str) -> str:
        if path.startswith("/api/ai"):
            return "/api/ai/*"
        if path.startswith("/api/auth"):
            return "/api/auth/*"
        if path.startswith("/api/subscription"):
            return "/api/subscription/*"
        if path.startswith("/api/portfolio"):
            return "/api/portfolio/*"
        if path.startswith("/api/webhooks"):
            return "/api/webhooks/*"
        if path.startswith("/api/"):
            parts = path.strip("/").split("/")
            return "/" + "/".join(parts[:2]) + "/*"
        return path or "/"


ops_metrics = OpsMetrics()
