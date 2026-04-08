"""Helpers for the Google Gen AI SDK."""

import base64

from ..config import get_settings

settings = get_settings()

_client = None


def _import_genai():
    try:
        from google import genai
        from google.genai import types
    except ImportError as exc:
        raise RuntimeError(
            "google-genai package is not installed. Run: pip install google-genai>=1.0.0"
        ) from exc
    return genai, types


def get_genai_client():
    global _client
    if _client is not None:
        return _client
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not set in environment.")

    genai, _ = _import_genai()
    _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


def _build_config(response_mime_type: str | None = None, use_google_search: bool = False):
    _, types = _import_genai()
    config_kwargs = {}
    if response_mime_type:
        config_kwargs["response_mime_type"] = response_mime_type
    if use_google_search:
        config_kwargs["tools"] = [types.Tool(google_search=types.GoogleSearch())]
    return types.GenerateContentConfig(**config_kwargs)


async def async_generate_content(
    *,
    model: str,
    prompt: str,
    response_mime_type: str | None = None,
    use_google_search: bool = False,
    image_base64: str | None = None,
):
    client = get_genai_client()
    _, types = _import_genai()
    config = _build_config(response_mime_type=response_mime_type, use_google_search=use_google_search)

    contents: object = prompt
    if image_base64:
        raw = image_base64.split(",")[-1]
        image_part = types.Part.from_bytes(
            data=base64.b64decode(raw),
            mime_type="image/png",
        )
        contents = [prompt, image_part]

    return await client.aio.models.generate_content(
        model=model,
        contents=contents,
        config=config,
    )


def response_text(response) -> str:
    return getattr(response, "text", "") or ""
