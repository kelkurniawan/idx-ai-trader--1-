# Xendit Launch Checklist

Use this checklist before switching the product from test mode to paid production.

## 1. Environment Readiness

- Set `ENVIRONMENT=production` in `backend/.env`.
- Set a strong `JWT_SECRET_KEY`.
- Set a strong `MFA_ENCRYPTION_KEY`.
- Replace all test reCAPTCHA keys with live keys.
- Set `XENDIT_SECRET_KEY` to the live secret key.
- Set `XENDIT_WEBHOOK_TOKEN` to the exact token configured in Xendit Dashboard.
- Set `XENDIT_ENVIRONMENT=LIVE`.
- Set `XENDIT_SUCCESS_URL` and `XENDIT_FAILURE_URL` to production frontend URLs.
- Set `CORS_ORIGINS` to production domains only.
- Set SMTP credentials for support emails and OTP delivery.
- If running more than one backend instance, move rate limiting and OTP state to Redis before launch.

## 2. Xendit Dashboard Setup

- Confirm your live account is activated and allowed to collect the payment methods you plan to offer.
- Configure the invoice webhook URL to point to `/api/webhooks/xendit/invoice`.
- Set the webhook verification token and copy the same value into `XENDIT_WEBHOOK_TOKEN`.
- Confirm `success_redirect_url` and `failure_redirect_url` routes render properly in production.
- Verify support staff know that invoice refunds still need to be processed in Xendit Dashboard first.

## 3. End-to-End Billing Test

- Create a real or sandbox user account.
- Start a free trial and confirm the payment method becomes active before the trial is granted.
- Buy a paid plan through the hosted invoice page.
- Confirm the webhook marks the invoice `PAID` and the user entitlement changes immediately.
- Run the admin billing reconciliation screen and confirm there are no anomalies.
- Disable auto-renew from the profile page and verify the saved payment method is cleared.
- Use the admin billing support panel to inspect the payment and confirm the support detail looks correct.
- Record a refund support action in admin after processing a refund in Xendit Dashboard.

## 4. Monitoring

- Watch backend logs for webhook token mismatches, amount mismatches, and reconciliation anomalies.
- Watch for `PAID` payments without `subscription_id`.
- Watch for users with paid plans and no active entitlement.
- Watch for spikes in login, MFA verify, and subscription route throttling.
- Track daily counts for pending invoices, successful payments, refund requests, and cancelled auto-renew.

## 5. Support Operations

- Create a canned support response for failed payments.
- Create a canned support response for refund requests.
- Decide your refund policy in writing before launch.
- Decide whether refunds revoke access immediately or at period end.
- Make sure admins know this app records refund state internally, but the actual refund still happens in Xendit Dashboard.

## 6. Security Sanity Check

- Force HTTPS end-to-end in production.
- Verify secure cookies are enabled in production.
- Confirm production CORS does not include localhost origins.
- Confirm there are no dev/test secrets left in `.env.production` or deployment settings.
- Plan the migration from in-memory rate limiting to Redis if you expect more than one app instance.

## 7. Nice-To-Have Next

- Add Redis-backed rate limiting.
- Add provider-side refund automation only after choosing the exact Xendit payment primitives you will support.
- Add alerting for webhook failures and reconciliation anomalies.
- Add admin audit logs for billing actions.
- Add customer-facing billing history and invoice download links.
