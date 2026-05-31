from datetime import datetime

from backend.app.services.price_ingest_service import parse_yahoo_chart


def _payload():
    return {
        "chart": {
            "error": None,
            "result": [
                {
                    "timestamp": [1_700_000_000, 1_700_086_400, 1_700_172_800],
                    "indicators": {
                        "quote": [
                            {
                                "open":   [100.0, 102.0, 104.0],
                                "high":   [105.0, 106.0, 108.0],
                                "low":    [ 99.0, 101.0, 103.0],
                                "close":  [104.0, None,  107.0],
                                "volume": [1000,  2000,  3000],
                            }
                        ]
                    },
                }
            ],
        }
    }


def test_parse_yahoo_chart_returns_rows_skipping_nulls():
    rows = parse_yahoo_chart(_payload())
    assert len(rows) == 2
    first = rows[0]
    assert isinstance(first["date"], datetime)
    assert first["open"] == 100.0
    assert first["high"] == 105.0
    assert first["low"] == 99.0
    assert first["close"] == 104.0
    assert first["volume"] == 1000.0


def test_parse_yahoo_chart_handles_empty_result():
    assert parse_yahoo_chart({"chart": {"error": None, "result": []}}) == []
    assert parse_yahoo_chart({"chart": {"error": "Not Found", "result": None}}) == []
