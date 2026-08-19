# ORACUL Security & Deployment Guide

## 🔐 Security Overview

ORACUL is a Telegram Mini App for analyzing and trading meme coins on Solana and TON. This document explains the security architecture and deployment best practices.

### Key Security Principles:
- ✅ **Private keys never touch the backend** - All signing done client-side via Phantom/TON Connect
- ✅ **No user authentication database** - Stateless API (but rate-limited)
- ✅ **Frontend-only configuration** - Language, theme, preferences stored locally
- ⚠️ **API keys protected** - Groq API key backend-only, never exposed to frontend

---

## 🛡️ Threat Model & Mitigations

### 1. API Key Exposure
**Threat**: Groq API key leaked → attacker makes expensive AI calls on your quota

**Mitigations Implemented**:
- ✅ API key stored only in server environment variables
- ✅ CORS whitelist prevents cross-site requests
- ✅ Rate limiting: 20 messages per hour per IP
- ✅ Input validation on message length and structure

**Deployment Rules**:
- NEVER commit `.env` file with real keys to git
- Use `.env.example` as template
- Set env vars in Vercel/deployment platform only
- Rotate GROQ_API_KEY monthly

### 2. Unauthorized API Access
**Threat**: Anyone can call `/api/chat`, `/api/swap/quote` from any origin

**Mitigations Implemented**:
- ✅ CORS whitelist: only `https://web.telegram.org`, `https://t.me`, localhost
- ✅ Global rate limit: 50 requests per minute per IP
- ✅ Chat-specific rate limit: 20 messages per hour per IP
- ✅ Origin validation with security logging

**For Production**:
```javascript
// In .env:
ALLOWED_ORIGINS_CUSTOM=https://yourdomain.vercel.app
```

### 3. Private Key Theft
**Threat**: Attacker steals wallet private keys

**Current Status**: ✅ NOT VULNERABLE
- Private keys stored in Phantom wallet browser extension
- Backend never sees private keys
- All transactions signed by Phantom SDK, not custom code

**Why It's Safe**:
- `wallet.js:280` - Uses `window.solana.signAndSendTransaction()`
- Keys never leave Phantom browser extension
- Transactions signed locally before sending

### 4. Transaction Manipulation
**Threat**: MITM attack intercepts and modifies swap transaction

**Mitigations**:
- ✅ Use HTTPS only in production (Vercel enforces this)
- ✅ User reviews transaction before signing
- ✅ Jupiter API validates transaction structure

**Note**: Even if modified, transaction requires user signature - can't auto-execute

### 5. XSS (Cross-Site Scripting)
**Threat**: Attacker injects malicious JS → steals localStorage data or auth tokens

**Current Exposure**:
- localStorage stores non-critical: language, theme, wallet address (public)
- Potentially sensitive: `oracul_following` (trader list), `oracul_ton_swaps` (history)

**Mitigations**:
- ✅ No user input rendered directly (all via text nodes)
- ✅ No eval() or innerHTML with untrusted data
- ✅ Content Security Policy in production (recommended)

**To Implement CSP**:
```javascript
// In server.js middleware:
res.setHeader('Content-Security-Policy', 
  "default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://api.groq.com https://api.jupiter.ag https://*.solana.com");
```

### 6. User Enumeration
**Threat**: Attacker queries `/api/traders/:address/txns` to find all users

**Current Status**: ⚠️ MEDIUM RISK (but acceptable)
- Addresses returned are on-chain public anyway
- No sensitive data (only public blockchain transactions)
- Doesn't reveal user's own address or holdings

**Mitigation**: Rate limit trader queries (already done with global limit)

---

## 📦 Safe Deployment Checklist

### Before Going to Production:

- [ ] **1. Set Environment Variables on Vercel**
  - Go to Vercel dashboard → Project Settings → Environment Variables
  - Add: `GROQ_API_KEY` (from https://console.groq.com/keys)
  - Add: `FEE_ACCOUNT` (your Solana wallet address)
  - Add: `ALLOWED_ORIGINS_CUSTOM` (your production domain)
  - ⚠️ Do NOT paste values in terminal or share in screenshots

- [ ] **2. Remove .env from Git**
  ```bash
  # Ensure .env is in .gitignore
  echo ".env" >> .gitignore
  echo ".env.local" >> .gitignore
  git rm --cached .env
  git commit -m "Remove .env from git tracking"
  ```

- [ ] **3. Add .env.example to Git** (no secrets)
  ```bash
  git add .env.example
  git commit -m "Add .env.example template"
  ```

- [ ] **4. Enable HTTPS**
  - Vercel auto-enables HTTPS ✓
  - Never use HTTP in production

- [ ] **5. Configure CORS for Your Domain**
  - If hosting on custom domain (e.g., `oracul.yoursite.com`):
  ```
  ALLOWED_ORIGINS_CUSTOM=https://oracul.yoursite.com,https://web.telegram.org
  ```

- [ ] **6. Monitor API Usage**
  - Check Groq API usage dashboard weekly
  - Set budget alerts in Vercel → Usage
  - Monitor rate limit logs for attacks

- [ ] **7. Rotate API Keys Every Month**
  - Generate new GROQ_API_KEY in console.groq.com
  - Update in Vercel env vars
  - Old key automatically becomes inactive

---

## 🔑 API Key Management

### Where API Keys Live:

| Key | Where | Visibility | Rotation |
|-----|-------|-----------|----------|
| GROQ_API_KEY | Vercel env vars only | ✅ Hidden from frontend | Monthly |
| FEE_ACCOUNT | Vercel env vars + code | ⚠️ Can be hardcoded | N/A |
| Phantom Private Keys | Browser extension | ✅ Never leaves device | N/A |

### Best Practices:

1. **Groq API Key**:
   - ❌ Never commit to git
   - ❌ Never log or console.log
   - ✅ Store only in Vercel Environment Variables
   - ✅ Rotate monthly
   - ✅ Use separate keys for dev/prod

2. **FEE_ACCOUNT (Solana Address)**:
   - ✅ Can be seen in code (it's public)
   - ✅ Can be in .env or hardcoded
   - ✅ Update if compromised (redirect future fees)

3. **Private Keys (User's)**:
   - ✅ Managed by Phantom/TON Connect
   - ❌ Your backend NEVER sees them
   - ✅ Encrypted in browser extension

---

## 🚀 Vercel Deployment Steps

### Step 1: Connect Git Repository
```bash
# Push code to GitHub
git remote add origin https://github.com/yourusername/oracul-app.git
git push -u origin main
```

### Step 2: Create Vercel Project
1. Go to https://vercel.com/new
2. Import GitHub repository
3. Select "Node.js" as framework
4. Configure build settings:
   - Build Command: `npm install` (or skip if just static)
   - Output Directory: `.` (or public folder)

### Step 3: Set Environment Variables
In Vercel Dashboard → Project Settings → Environment Variables:
```
GROQ_API_KEY = [paste your actual key]
GROQ_MODEL = openai/gpt-oss-20b
FEE_ACCOUNT = [your Solana wallet address]
PORT = 3000
ALLOWED_ORIGINS_CUSTOM = https://yourdomain.com
```

### Step 4: Deploy
- Vercel auto-deploys on `git push`
- Your app is live at: `https://oracul-app.vercel.app`
- Or custom domain: `https://yourdomain.com`

---

## 🔍 Security Checklist - Code Review

### Rate Limiting ✓
- [x] Global limit: 50 req/min per IP
- [x] Chat limit: 20 msg/hr per IP
- [x] Limits apply to expensive endpoints

### Input Validation ✓
- [x] Messages max length: 5000 chars
- [x] History max length: 50 messages
- [x] Message role must be 'user' or 'assistant'

### CORS ✓
- [x] Whitelist: web.telegram.org, t.me, localhost
- [x] Rejects requests from unknown origins
- [x] Logs rejected origins for security monitoring

### Error Handling ✓
- [x] Never expose internal error details to client
- [x] Log errors server-side for debugging
- [x] Return generic error messages

### Data Storage ✓
- [x] No private keys stored
- [x] No passwords stored
- [x] localStorage used only for non-critical data
- [x] Wallet address stored (it's public)

---

## 🛠️ Monitoring & Alerts

### Set Up Alerts (Vercel):

1. **Budget Alert**: Go to Billing → Usage Limits
   - Set monthly limit (e.g., $100)

2. **Uptime Monitoring**: Use https://betterstack.com or https://www.updown.io
   - Monitor: `https://yourdomain.com/`
   - Alert on downtime

3. **API Key Rotation Reminder**: Calendar reminder monthly

### Log Suspicious Activity:

The app logs rejected CORS requests:
```
[SECURITY] Rejected request from origin: https://evil.com
```

Monitor these in Vercel Logs:
1. Go to Vercel Dashboard → Project → Deployments → Logs
2. Filter for `[SECURITY]`
3. Review weekly

---

## 🚨 Incident Response

### If API Key is Compromised:

1. **Immediate**: Revoke key in console.groq.com
2. **Within 1 hour**: Generate new key
3. **Update Vercel**: Set new `GROQ_API_KEY` env var
4. **Redeploy**: Vercel auto-redeploys on env var change
5. **Monitor**: Check Groq usage dashboard for unauthorized calls

### If Fee Account is Compromised:

1. Create new Solana wallet
2. Update `FEE_ACCOUNT` in Vercel
3. Migrate funds from old wallet to new
4. Redeploy

### If Server is Hacked:

1. Immediately revoke all API keys (Groq)
2. Generate new Groq API key
3. Update in Vercel
4. Check Groq usage for unauthorized API calls
5. Review git logs for commits from others
6. Consider account security audit

---

## 🔐 Frontend Security (Client-Side)

### What's Safe in Client Code:
- ✓ Language/theme preferences
- ✓ Wallet address display
- ✓ Public data (coin prices, historical data)

### What Should NOT Be in Client Code:
- ❌ API keys (use backend proxy)
- ❌ Private keys (use Phantom SDK)
- ❌ Secrets/passwords

### Client-Side Best Practices:
1. Use HTTPS only
2. Enable CSP headers (server-side)
3. Don't log sensitive data to console
4. Sanitize user input (already done)
5. Use secure random generators (crypto.getRandomValues)

---

## 📋 Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                     ORACUL Architecture                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Frontend (React/JS - Browser)                              │
│  ├─ UI/UX components                                        │
│  ├─ localStorage (language, theme, address)                │
│  ├─ Phantom wallet connection (client-side signing)        │
│  └─ No private keys, no API keys                           │
│                                                              │
│  ↓ ↑ HTTPS (encrypted)                                     │
│                                                              │
│  Backend (Node.js/Express - Vercel)                        │
│  ├─ Rate limiting (50 req/min global, 20 msg/hr chat)     │
│  ├─ CORS whitelist (web.telegram.org only)                │
│  ├─ Input validation (message length, structure)           │
│  ├─ Groq API integration (API key server-only)            │
│  ├─ Jupiter/Solana RPC calls                              │
│  └─ Error handling & logging                              │
│                                                              │
│  ↓ External APIs (HTTPS)                                   │
│                                                              │
│  ├─ Groq AI (API key protected) ✅                         │
│  ├─ Jupiter Protocol (public)                             │
│  ├─ Solana RPC (public, rate-limited)                     │
│  └─ DexScreener (public)                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## ❓ FAQ

**Q: Can someone steal my private key?**
A: No. Private keys stay in Phantom wallet extension. Your backend never sees them.

**Q: Can someone spam my API and waste my quota?**
A: We have rate limits (20 messages/hour per IP), but sophisticated attackers with multiple IPs could still cause issues. Monitor Groq usage dashboard.

**Q: What if someone finds my .env file?**
A: If you committed it to git, revoke the API key immediately and generate a new one. Don't commit .env files.

**Q: Is my wallet address visible to others?**
A: Yes, it's stored in browser localStorage (non-critical data). Addresses are public on blockchain anyway.

**Q: How do I handle HTTPS on custom domain?**
A: Vercel provides free HTTPS certificates. Just point your domain's DNS to Vercel, they auto-provision certificates.

**Q: Can I run this locally?**
A: Yes: `npm start`. Set local .env with `PORT=3000`. For CORS to work, use `http://localhost:3000` (dev only).

**Q: How often should I rotate API keys?**
A: Monthly minimum. More frequently if you suspect compromise.

---

## 📞 Support & Reporting

If you discover a security vulnerability:
1. DO NOT post it publicly
2. DO NOT commit details to git
3. Email: [security contact] with details
4. Allow 48 hours for response

---

## ✅ Compliance

- ✓ No user data stored server-side
- ✓ No cookies or tracking
- ✓ No ads or analytics
- ✓ Open-source security model
- ✓ CORS restrictions
- ✓ Rate limiting
- ✓ Input validation

---

Last Updated: August 2026
Version: 1.0
