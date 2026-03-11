# Authentication Upgrade - Task Breakdown

## Phase 1: Backend ✅ COMPLETE
- [x] Install new Python dependencies (PyJWT, bcrypt, pyotp, qrcode, google-auth)
- [x] Add auth config settings to [config.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/config.py)
- [x] Create [User](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/models/user.py#20-49) + [RememberMeToken](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/models/user.py#51-68) models in [models/user.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/models/user.py)
- [x] Create auth Pydantic schemas in [schemas/auth.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/schemas/auth.py)
- [x] Implement [auth_service.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/services/auth_service.py) (password hash, JWT, HTTP-only cookies)
- [x] Implement [mfa_service.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/services/mfa_service.py) (TOTP, OTP with in-memory store, Redis-ready)
- [x] Implement [recaptcha_service.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/services/recaptcha_service.py) (dev mock + prod ready)
- [x] Create auth router [routers/auth.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/routers/auth.py) (9 endpoints)
- [x] Wire router into [main.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/main.py)
- [x] Update [.env.example](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/.env.example) with all new variables
- [x] Create [AUTH_DEV_GUIDE.md](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/AUTH_DEV_GUIDE.md)
- [x] Verify: register ✅, login ✅, /me ✅, HTTP-only cookies ✅

## Phase 2: Frontend ✅ COMPLETE
- [x] Create `authApi.ts` service
- [x] Update [Auth.tsx](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/components/Auth.tsx) with real API calls, reCAPTCHA, Remember Me
- [x] Create `ProfileSetup.tsx`
- [x] Create `MfaSetup.tsx` + `MfaVerify.tsx`
- [x] Update [App.tsx](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/App.tsx) auth flow
- [x] Update [User](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/models/user.py#20-49) type in [types.ts](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/types.ts)
