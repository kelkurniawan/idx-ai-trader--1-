#!/usr/bin/env python3
"""Pre-deploy checks that catch common production configuration mistakes."""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def run(command: list[str]) -> tuple[bool, str]:
    completed = subprocess.run(
        command,
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        shell=False,
    )
    return completed.returncode == 0, completed.stdout.strip()


def check_git_clean_enough() -> tuple[bool, str]:
    ok, output = run(["git", "status", "--short"])
    if not ok:
        return False, output
    risky = []
    for line in output.splitlines():
        if not any(name in line for name in ("backend/.env", ".env.production", "idx_trader.db")):
            continue
        status = line[:2]
        if status.strip() == "D":
            continue
        risky.append(line)
    if risky:
        return False, "Sensitive/runtime files still appear in git status:\n" + "\n".join(risky)
    return True, "No sensitive/runtime files are staged for commit."


def check_no_tracked_runtime_files() -> tuple[bool, str]:
    ok, output = run(["git", "ls-files"])
    if not ok:
        return False, output
    blocked = []
    for line in output.splitlines():
        normalized = line.replace("\\", "/")
        if normalized.endswith((".pyc", ".db", ".sqlite", ".sqlite3")):
            blocked.append(line)
        if "/__pycache__/" in normalized:
            blocked.append(line)
        if normalized in {".env.production", "backend/.env"}:
            blocked.append(line)
    if blocked:
        return False, "Tracked runtime files found:\n" + "\n".join(blocked)
    return True, "No tracked env/database/cache artifacts."


def check_required_env() -> tuple[bool, str]:
    required = [
        "ENVIRONMENT",
        "DATABASE_URL",
        "JWT_SECRET_KEY",
        "MFA_ENCRYPTION_KEY",
        "CLERK_PUBLISHABLE_KEY",
        "CLERK_SECRET_KEY",
        "CLERK_ISSUER",
        "GEMINI_API_KEY",
        "RECAPTCHA_SECRET_KEY",
        "REDIS_URL",
        "XENDIT_SECRET_KEY",
        "XENDIT_WEBHOOK_TOKEN",
        "CORS_ORIGINS",
        "VITE_CLERK_PUBLISHABLE_KEY",
        "APP_SITE_ADDRESS",
    ]
    missing = [name for name in required if not os.environ.get(name)]
    if missing:
        return False, "Missing deployment environment variables: " + ", ".join(missing)
    if os.environ.get("ENVIRONMENT") != "production":
        return False, "ENVIRONMENT must be production."
    if "localhost" in os.environ.get("CORS_ORIGINS", ""):
        return False, "CORS_ORIGINS must not contain localhost."
    if not os.environ.get("VITE_CLERK_PUBLISHABLE_KEY", "").startswith("pk_live_"):
        return False, "VITE_CLERK_PUBLISHABLE_KEY must be a live Clerk key."
    return True, "Required deployment environment variables are present."


def main() -> int:
    parser = argparse.ArgumentParser(description="Run production preflight checks.")
    parser.add_argument("--skip-env", action="store_true", help="Skip live deployment environment checks.")
    args = parser.parse_args()

    checks = [
        ("Git sensitive-file status", check_git_clean_enough),
        ("Tracked runtime artifacts", check_no_tracked_runtime_files),
    ]
    if not args.skip_env:
        checks.append(("Deployment environment", check_required_env))

    failures = []
    for name, check in checks:
        ok, detail = check()
        print(f"[{'PASS' if ok else 'FAIL'}] {name}: {detail}")
        if not ok:
            failures.append(name)

    if failures:
        return 1
    print("Production preflight passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
