# Authentication Dev/Prod Guide

Quick reference for setting up auth features in development (free/mocked) and production.

## Dev vs Prod Feature Matrix

| Feature | Dev (Zero Budget) | Production |
|---------|------------------|------------|
| **Email OTP** | Console log (printed to terminal) | SendGrid / Amazon SES SMTP |
| **WhatsApp OTP** | Console log | Meta Graph API (WhatsApp Business) |
| **reCAPTCHA** | Google test keys (always pass) | Real reCAPTCHA v2/v3 keys |
| **Google OAuth** | Mock mode (any token accepted) | Real Google Cloud OAuth Client ID |
| **Profile Avatar** | Local disk `./uploads/avatars/` | Cloud storage (S3/GCS) |
| **JWT Secret** | Hardcoded dev key | Cryptographically random 256-bit key |
| **OTP Store** | In-memory Python dict | Redis |
| **Database** | SQLite | PostgreSQL |

## Dev Setup (Zero Config)

1. Copy `.env.example` to `.env` (or use defaults — everything works without a .env file)
2. Start backend: `cd backend && python -m uvicorn app.main:app --reload`
3. All OTPs print to the backend console
4. reCAPTCHA always passes with Google test keys
5. Google login always succeeds with mock data

## Production Migration Checklist

### 1. JWT Secret
```bash
# Generate a secure key:
python -c "import secrets; print(secrets.token_hex(32))"
# Set it in .env:
JWT_SECRET_KEY=<generated-key>
```

### 2. reCAPTCHA
1. Go to https://www.google.com/recaptcha/admin
2. Register your domain for reCAPTCHA v2 (Invisible)
3. Set `RECAPTCHA_SECRET_KEY` and `RECAPTCHA_SITE_KEY` in `.env`

### 3. Email OTP (SMTP)
Choose one provider:

**SendGrid (Free tier: 100 emails/day):**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.your_api_key_here
SMTP_FROM=noreply@yourdomain.com
```

**Amazon SES (Free tier: 3,000/month with EC2):**
```env
SMTP_HOST=email-smtp.ap-southeast-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your_ses_access_key
SMTP_PASSWORD=your_ses_secret_key
SMTP_FROM=noreply@yourdomain.com
```

### 4. WhatsApp OTP (Meta Graph API)
1. Create Meta Developer account: https://developers.facebook.com
2. Create an App → Add WhatsApp product
3. Set up a WhatsApp Business phone number
4. Create an OTP message template (must be approved by Meta)
5. Generate a permanent access token
```env
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_permanent_token
```

### 5. Google OAuth
1. Go to https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorized origins and redirect URIs
```env
GOOGLE_OAUTH_CLIENT_ID=your_client_id.apps.googleusercontent.com
```

### 6. Redis for OTP Store
```env
OTP_STORE_BACKEND=redis
REDIS_URL=redis://your-redis-host:6379/0
```
Don't forget to uncomment `redis>=5.0.0` in `requirements.txt`.

### 7. Database
Switch from SQLite to PostgreSQL:
```env
DATABASE_URL=postgresql://user:password@host:5432/idx_trader
```

### 8. File Uploads
Consider migrating `UPLOAD_DIR` to cloud storage (AWS S3, GCS, Azure Blob).
