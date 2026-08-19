# ORACUL Deployment Guide - Vercel

## Quick Start (5 minutes)

### Prerequisites:
1. GitHub account with your code pushed
2. Groq API key from https://console.groq.com/keys
3. Solana wallet address (for fee account)
4. Vercel account (free at https://vercel.com)

---

## Step 1: Prepare Your Code

### Ensure .env is NOT committed:
```bash
# Check if .env is in git
git ls-files .env

# If yes, remove it:
git rm --cached .env
git commit -m "remove .env from tracking"

# Add to .gitignore (should already be there):
echo ".env" >> .gitignore
```

### Verify .gitignore has .env:
```bash
cat .gitignore | grep .env
```

---

## Step 2: Deploy to Vercel

### Option A: Vercel Dashboard (Easiest)

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your GitHub repo (yanartem6-max/oracul-app)
4. Framework: Select "Other" (Node.js + Static)
5. Click "Deploy"

### Option B: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts, link to GitHub repo
```

---

## Step 3: Set Environment Variables

### In Vercel Dashboard:

1. Go to: https://vercel.com/dashboard → Select "oracul-app"
2. Go to: **Settings** → **Environment Variables**
3. Add each variable:

#### Variable 1: GROQ_API_KEY
- **Name**: `GROQ_API_KEY`
- **Value**: (paste your key from console.groq.com)
- **Environments**: Production, Preview, Development

#### Variable 2: GROQ_MODEL
- **Name**: `GROQ_MODEL`
- **Value**: `openai/gpt-oss-20b`
- **Environments**: All

#### Variable 3: FEE_ACCOUNT
- **Name**: `FEE_ACCOUNT`
- **Value**: (your Solana wallet address)
- **Environments**: All

#### Variable 4: PORT
- **Name**: `PORT`
- **Value**: `3000`
- **Environments**: All

#### Variable 5: ALLOWED_ORIGINS_CUSTOM (if custom domain)
- **Name**: `ALLOWED_ORIGINS_CUSTOM`
- **Value**: `https://yourdomain.com,https://www.yourdomain.com`
- **Environments**: Production

4. Click "Save"
5. Vercel auto-redeploys with new env vars

---

## Step 4: Verify Deployment

### Check if app is live:

```bash
# Your app URL will be:
# https://oracul-app.vercel.app
# or
# https://oracul.yourteam.vercel.app

# Test it:
curl https://oracul-app.vercel.app/

# Should return HTML of the app
```

### Test API endpoint:
```bash
curl -X POST https://oracul-app.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'

# Should return: {"reply": "..."}
```

### Test CORS protection:
```javascript
// In browser console on DIFFERENT domain (evil.com):
fetch('https://oracul-app.vercel.app/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages: [] })
})

// Should fail with CORS error:
// Access to XMLHttpRequest blocked by CORS policy
```

✅ If CORS fails from unknown origin = **GOOD** (means security is working)

---

## Step 5: Custom Domain (Optional)

### Connect custom domain in Vercel:

1. Vercel Dashboard → Project → Settings → Domains
2. Add your domain (e.g., `oracul.yourcompany.com`)
3. Follow DNS instructions (add CNAME record)
4. Vercel auto-provisions HTTPS certificate

### Update Telegram Bot Settings:

1. Go to BotFather on Telegram
2. Edit your bot → Web App → Set URL: `https://oracul.yourcompany.com`

---

## Step 6: Monitor & Maintain

### Weekly Tasks:

- [ ] Check Groq API usage: https://console.groq.com/usage
- [ ] Check Vercel logs for errors: https://vercel.com/dashboard → Deployments → Logs
- [ ] Look for `[SECURITY] Rejected` warnings
- [ ] Check uptime status

### Monthly Tasks:

- [ ] Rotate GROQ_API_KEY
  1. Generate new key at console.groq.com
  2. Update GROQ_API_KEY env var in Vercel
  3. Delete old key
  
- [ ] Review deploy logs for anomalies
- [ ] Update dependencies: `npm update`
- [ ] Test from multiple origins to verify CORS

### Quarterly Tasks:

- [ ] Security audit (re-read SECURITY.md)
- [ ] Check for new vulnerabilities in dependencies
- [ ] Review rate limiting stats

---

## 🚨 Troubleshooting

### Problem: "502 Bad Gateway"

**Cause**: Backend error
**Fix**:
1. Check Vercel logs: https://vercel.com/dashboard → Deployments → Logs
2. Verify env vars are set (especially GROQ_API_KEY)
3. Restart deployment

```bash
# In Vercel Dashboard:
# Deployments → Click Latest → "Redeploy"
```

---

### Problem: "GROQ_API_KEY not set"

**Cause**: Environment variable not set

**Fix**:
1. Go to Vercel Settings → Environment Variables
2. Verify GROQ_API_KEY exists
3. Verify it's set for "Production" environment
4. Redeploy

---

### Problem: "CORS error" when calling from Telegram

**Cause**: Origin not whitelisted

**Fix**:
1. Check what origin Telegram Web App is using
2. Add to ALLOWED_ORIGINS_CUSTOM in Vercel env vars
3. Example:
   ```
   ALLOWED_ORIGINS_CUSTOM=https://web.telegram.org,https://t.me,https://twa.dev
   ```
4. Redeploy

---

### Problem: Rate limit errors (429)

**Cause**: Too many requests from same IP

**Expected**: Users can send max 20 messages per hour

**Fix**:
1. If legitimate user: wait 1 hour, limits reset
2. If attacker: you're protected! ✅
3. Monitor in Vercel logs for patterns

---

## 📊 Monitoring Dashboard

### Create Vercel Monitoring:

1. **Usage Alerts**: https://vercel.com/dashboard → Settings → Billing
   - Set "Monthly Spending Limit" to $100 (example)
   - Get email alert if exceeded

2. **Uptime Monitoring** (optional):
   - Use https://betterstack.com (free tier)
   - Monitor: `https://yourdomain.com/`
   - Get SMS/email if down

3. **Log Monitoring**:
   - Check Vercel Logs weekly
   - Look for errors and `[SECURITY]` warnings

---

## ✅ Production Checklist

Before going live:

- [ ] Code pushed to GitHub
- [ ] .env is NOT in git (verify with `git ls-files .env`)
- [ ] .env.example file exists in repo
- [ ] Deployed to Vercel
- [ ] Environment variables set (GROQ_API_KEY, FEE_ACCOUNT)
- [ ] HTTPS working (Vercel default)
- [ ] CORS whitelist correct
- [ ] Tested API endpoints
- [ ] Tested from different origins (CORS working)
- [ ] Rate limiting tested (20 msg/hr limit)
- [ ] Groq API key working
- [ ] Solana RPC responding
- [ ] Telegram bot webhook pointing to your domain
- [ ] Logging configured
- [ ] Budget alerts set up
- [ ] Team access granted (if applicable)

---

## 🔄 Update Process

### To deploy code changes:

```bash
# Make changes locally
git add .
git commit -m "feature: add something"
git push origin main

# Vercel auto-deploys!
# Check: https://vercel.com/dashboard → Deployments
```

### To update environment variables:

1. Vercel Dashboard → Settings → Environment Variables
2. Edit the variable
3. Save
4. Vercel auto-redeploys

---

## 🔐 Security Reminders

1. **Never paste API keys in Slack/Discord/GitHub**
2. **Never commit .env file**
3. **Never share Vercel dashboard access** lightly
4. **Rotate GROQ_API_KEY monthly**
5. **Monitor usage weekly**
6. **Check logs for `[SECURITY]` warnings**

---

## 📞 Support

### If something goes wrong:

1. Check Vercel logs first
2. Verify environment variables
3. Check GitHub commits (did something break?)
4. Redeploy: Vercel Dashboard → Deployments → "Redeploy"
5. If still broken, rollback to previous deployment

### Useful Links:

- Vercel Dashboard: https://vercel.com/dashboard
- Groq API Usage: https://console.groq.com/usage
- GitHub Repo: https://github.com/yanartem6-max/oracul-app
- SECURITY.md: See security best practices
- VULNERABILITIES_FIXED.md: Security audit details

---

## 🎉 Done!

Your ORACUL app is now live and secure! 

- 🚀 Production URL: `https://oracul-app.vercel.app`
- 🔐 API keys: Protected in Vercel
- ✅ CORS: Whitelisted
- 🛡️ Rate limited: Protected from abuse
- 📊 Monitored: Check logs weekly

Congratulations! 🎊

---

**Version**: 1.0
**Last Updated**: August 2026
**Status**: Production Ready ✅
