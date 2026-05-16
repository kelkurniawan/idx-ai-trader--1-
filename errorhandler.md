# Error Handling Guide

This document maps the production-facing error handling now used by the web app and FastAPI backend.

## Backend Error Contract

All handled API errors return this shape:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Please check the highlighted fields and try again.",
    "request_id": "uuid"
  }
}
```

The `X-Request-ID` response header carries the same request id. Use it to connect user reports to backend logs and ops alerts.

## Error Mapping

| Status | Code | User message behavior |
| --- | --- | --- |
| 400 | `bad_request` | Show the backend message and keep the user on the current form. |
| 401 | `unauthenticated` | Ask the user to sign in again. |
| 403 | `forbidden` or `forbidden_origin` | Show an access denied screen or message. |
| 404 | `not_found` | Show a not-found state for the requested record or screen. |
| 409 | `conflict` | Show the conflict message, usually duplicate account/data. |
| 422 | `validation_error` | Show field-level validation guidance. |
| 429 | `rate_limited` | Show a retry-later message and respect `Retry-After` when present. |
| 500 | `internal_error` | Show a friendly retry screen and page support with the request id. |

Unhandled backend exceptions are logged and sent to `OPS_ALERT_WEBHOOK_URL` as critical API failures.

## Frontend Error Screens

The React app is wrapped in `components/AppErrorBoundary.tsx`. If a screen crashes while rendering, users see a custom recovery screen with a refresh action instead of a blank page.

Existing auth setup failures still show their dedicated Clerk/local-profile sync error screen, including the latest backend message.

## Request Protection

The backend now applies:

- `TrustedHostMiddleware` using `TRUSTED_HOSTS`
- Strict CORS using `CORS_ORIGINS`
- Origin/referrer blocking for browser API requests outside configured app origins
- Global per-client API rate limiting
- Route-level limits on high-risk auth, AI, billing, and webhook paths

Important note: domain restriction is a browser control, not a replacement for authentication. Sensitive routes still require user sessions, admin checks, webhook tokens, or provider signatures as appropriate.

## Reset Password Errors

Password reset links are single-use and expire after `PASSWORD_RESET_EXPIRE_MINUTES` minutes. Invalid, reused, or expired reset links return:

```text
400 bad_request: This password reset link is invalid or expired.
```

The forgot-password endpoint always returns a generic success message to avoid leaking whether an email exists.

## Alert Routing

Critical backend failures call `send_ops_alert()` and include:

- request id
- path and method
- exception message
- background job failure context, when applicable

Configure `OPS_ALERT_WEBHOOK_URL` and optional `OPS_ALERT_WEBHOOK_BEARER` in production to route these alerts to Slack, Teams, Discord, PagerDuty, Better Stack, or another webhook receiver.
