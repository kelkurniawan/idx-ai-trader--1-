import asyncio

import httpx

from backend.app.services import price_ingest_service as svc


def test_fetch_yahoo_history_builds_jk_symbol_and_parses(monkeypatch):
    captured = {}

    class FakeResponse:
        status_code = 200

        def json(self):
            return {
                "chart": {
                    "error": None,
                    "result": [
                        {
                            "timestamp": [1_700_000_000],
                            "indicators": {"quote": [{
                                "open": [10.0], "high": [11.0], "low": [9.0],
                                "close": [10.5], "volume": [123],
                            }]},
                        }
                    ],
                }
            }

        def raise_for_status(self):
            return None

    class FakeClient:
        def __init__(self, *a, **k):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def get(self, url, params=None, headers=None):
            captured["url"] = url
            captured["params"] = params
            return FakeResponse()

    monkeypatch.setattr(svc.httpx, "AsyncClient", FakeClient)

    rows = asyncio.run(svc.fetch_yahoo_history("BBCA"))
    assert captured["url"].endswith("/BBCA.JK")
    assert captured["params"]["range"] == "1y"
    assert captured["params"]["interval"] == "1d"
    assert len(rows) == 1
    assert rows[0]["close"] == 10.5


def test_fetch_yahoo_history_returns_empty_on_http_error(monkeypatch):
    class BoomClient:
        def __init__(self, *a, **k):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def get(self, *a, **k):
            raise httpx.ConnectError("boom")

    monkeypatch.setattr(svc.httpx, "AsyncClient", BoomClient)
    rows = asyncio.run(svc.fetch_yahoo_history("XXXX"))
    assert rows == []
