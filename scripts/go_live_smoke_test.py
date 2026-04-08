#!/usr/bin/env python3
"""Basic post-deploy smoke test for the production stack."""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request


def fetch_json(url: str) -> tuple[int, object]:
    req = urllib.request.Request(url, headers={"User-Agent": "idx-ai-trader-smoke-test"})
    with urllib.request.urlopen(req, timeout=15) as response:
        body = response.read().decode("utf-8")
        return response.status, json.loads(body)


def fetch_text(url: str) -> tuple[int, str]:
    req = urllib.request.Request(url, headers={"User-Agent": "idx-ai-trader-smoke-test"})
    with urllib.request.urlopen(req, timeout=15) as response:
        return response.status, response.read().decode("utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Run basic production smoke checks.")
    parser.add_argument("--base-url", required=True, help="Base URL such as https://your-domain.com")
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")
    checks: list[tuple[str, bool, str]] = []

    try:
        status, payload = fetch_json(f"{base_url}/health")
        checks.append(("Backend health", status == 200 and payload.get("status") == "healthy", str(payload)))
    except Exception as exc:
        checks.append(("Backend health", False, str(exc)))

    try:
        status, text = fetch_text(f"{base_url}/healthz")
        checks.append(("Gateway health", status == 200 and text.strip().lower() == "ok", text.strip()))
    except Exception as exc:
        checks.append(("Gateway health", False, str(exc)))

    try:
        status, payload = fetch_json(f"{base_url}/api/subscription/plans")
        plans_ok = status == 200 and isinstance(payload, dict) and len(payload.get("plans", [])) >= 2
        checks.append(("Subscription plans", plans_ok, f"plans={len(payload.get('plans', [])) if isinstance(payload, dict) else 0}"))
    except Exception as exc:
        checks.append(("Subscription plans", False, str(exc)))

    try:
        status, text = fetch_text(base_url)
        checks.append(("Frontend root", status == 200 and "<!doctype html" in text.lower(), "root page loaded"))
    except Exception as exc:
        checks.append(("Frontend root", False, str(exc)))

    failed = [check for check in checks if not check[1]]
    for name, ok, detail in checks:
        label = "PASS" if ok else "FAIL"
        print(f"[{label}] {name}: {detail}")

    if failed:
        return 1
    print("All smoke checks passed.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except urllib.error.URLError as exc:
        print(f"Smoke test failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
