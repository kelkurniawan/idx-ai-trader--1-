# Comprehensive Security Hardening Plan

This plan aims to lock down the IDX AI Trader web service against common threats including DDoS, unauthorized data access, Cross-Site Scripting (XSS), and automated brute-force attacks.

## User Review Required

> [!WARNING]
> Please review the rate limits proposed below. Setting rate limits too tight may block legitimate users if they navigate the platform very quickly. Let me know if you would like me to adjust the limits before proceeding.

## Proposed Changes

### Rate Limiting Integration (DDoS && Brute Force Protection)
To prevent malicious bots and hackers from spamming APIs or brute-forcing authentication, we will introduce `slowapi` (a RateLimiter compatible with FastAPI).
- Install `slowapi` into `backend/requirements.txt`.
- Add global rate-limiting infrastructure in `backend/app/main.py`.
- Apply strict limits to authentication endpoints in `backend/app/routers/auth.py` (e.g., 5 requests/minute for login/register).
- Apply moderate limits on data fetching and AI analysis endpoints to prevent automated scraping (e.g., 60 requests/minute).

### HTTP Security Headers Middleware
We will implement an HTTP middleware in FastAPI to inject defense-in-depth headers into every response. This prevents the browser from being manipulated by malicious scripts.
- **X-Frame-Options: DENY**: Prevents Clickjacking by disallowing the site from being embedded in an iframe.
- **X-Content-Type-Options: nosniff**: Prevents MIME-sniffing attacks.
- **Strict-Transport-Security (HSTS)**: Forces modern browsers to use HTTPS instead of HTTP.
- **Content-Security-Policy (CSP)** (API-Only Strategy): Restricts where resources can be loaded from.

### CORS Hardening
The current CORS configuration in `backend/app/main.py` uses `allow_methods=["*"]` and `allow_headers=["*"]`.
- We will restrict `allow_methods` to `["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]` to prevent execution of unusual HTTP verbs.

### Input Validation & Sanitization (Path Traversal & SVG XSS)
In `backend/app/main.py`, the avatar upload directory serves files statically. Hackers can sometimes upload `.svg` files containing embedded JavaScript (XSS) or `.php` payloads. 
- We will add explicit MIME-type validation to the profile avatar upload handling route (if it exists) to only accept `image/png`, `image/jpeg`, and `image/webp`.

## Open Questions

1. **Rate Limit Storage:** `slowapi` defaults to an in-memory dictionary. Given you have a Redis URL in your `.env`, should I hook up the rate limiter to use Redis if available, or keep it in-memory for simpler deployment?
2. **Additional Restrictions:** Do you want me to limit API access specifically to certain IP addresses (e.g. an Admin IP whitelist for the backend) or keep it open for public registration?

## Verification Plan

### Automated Tests
- Trigger 10 rapid requests to the `/api/auth/login` endpoint using an automated loop and assert that a `429 Too Many Requests` HTTP error code is returned.
- Send an `OPTIONS` flight request to inspect the response headers, verifying the presence of `X-Frame-Options` and `X-Content-Type-Options`.
