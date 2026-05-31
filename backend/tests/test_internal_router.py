from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.app.routers import internal


def _app(monkeypatch, secret="s3cret"):
    monkeypatch.setattr(internal.settings, "INTERNAL_API_SECRET", secret)

    async def fake_ingest(db):
        return {"updated": 3, "failed": 0, "failed_tickers": [], "total": 3}

    monkeypatch.setattr(internal, "ingest_all", fake_ingest)

    async def fake_db():
        yield None

    app = FastAPI()
    app.dependency_overrides[internal.get_db] = fake_db
    app.include_router(internal.router, prefix="/api/internal")
    return app


def test_refresh_prices_rejects_missing_secret(monkeypatch):
    client = TestClient(_app(monkeypatch))
    resp = client.post("/api/internal/refresh-prices")
    assert resp.status_code == 401


def test_refresh_prices_rejects_wrong_secret(monkeypatch):
    client = TestClient(_app(monkeypatch))
    resp = client.post("/api/internal/refresh-prices", headers={"X-Internal-Secret": "nope"})
    assert resp.status_code == 401


def test_refresh_prices_runs_with_correct_secret(monkeypatch):
    client = TestClient(_app(monkeypatch))
    resp = client.post("/api/internal/refresh-prices", headers={"X-Internal-Secret": "s3cret"})
    assert resp.status_code == 200
    assert resp.json()["updated"] == 3
