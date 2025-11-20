# Deployment Guide - IKAS Bildirimlerim

## Docker Deployment

### Quick Start

```bash
docker-compose up -d
```

### Manual Docker Build

```bash
docker build -t ikas-bildirimlerim .

docker run -d \
  --name ikas-bildirimlerim \
  -p 3000:3000 \
  --env-file .env \
  ikas-bildirimlerim
```

### Check Logs

```bash
docker logs -f ikas-bildirimlerim
```

### Stop & Remove

```bash
docker-compose down
```

---

## VPS Deployment (Ubuntu/Debian)

### 1. Prerequisites

```bash
sudo apt update
sudo apt install -y nodejs npm git
```

### 2. Clone & Setup

```bash
git clone <your-repo-url> ikas-bildirimlerim
cd ikas-bildirimlerim
npm install
cp .env.example .env
nano .env
```

### 3. Run with PM2

```bash
npm install -g pm2
pm2 start src/server.js --name ikas-bildirimlerim
pm2 save
pm2 startup
```

### 4. Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Heroku Deployment

### 1. Create Heroku App

```bash
heroku create ikas-bildirimlerim
```

### 2. Set Environment Variables

```bash
heroku config:set TELEGRAM_BOT_TOKEN=your_token
heroku config:set TELEGRAM_CHAT_ID=your_chat_id
heroku config:set LANGUAGE=tr
heroku config:set MIN_ORDER_AMOUNT=0
```

### 3. Deploy

```bash
git push heroku main
```

### 4. Check Logs

```bash
heroku logs --tail
```

---

## DigitalOcean App Platform

### 1. Connect Repository

- Go to DigitalOcean Dashboard
- Create New App
- Connect your GitHub/GitLab repo

### 2. Configure

- **Build Command:** `npm install`
- **Run Command:** `npm start`
- **Port:** 3000

### 3. Environment Variables

Add in App Platform settings:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `LANGUAGE`
- `MIN_ORDER_AMOUNT`

---

## Railway Deployment

### 1. Create New Project

- Go to railway.app
- Create new project from GitHub

### 2. Set Variables

Add environment variables in Railway dashboard

### 3. Deploy

Railway auto-deploys on git push

---

## Environment Variables Reference

```env
PORT=3000
LANGUAGE=tr
MIN_ORDER_AMOUNT=100
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_CHAT_ID=chat1,chat2,chat3
```

---

## IKAS Webhook Configuration

### 1. Get Your Public URL

After deployment, note your public URL:
- Heroku: `https://your-app.herokuapp.com`
- Railway: `https://your-app.up.railway.app`
- DigitalOcean: `https://your-app.ondigitalocean.app`
- VPS: `https://your-domain.com`

### 2. Configure in IKAS

Go to IKAS Panel → Settings → Webhooks:

```
URL: https://your-domain.com/webhook/order
Method: POST
Events: Order Created
```

### 3. Test

Create a test order in IKAS and check:
- Telegram notification received
- Server logs show webhook received

---

## Health Check

Test your deployment:

```bash
curl https://your-domain.com/health
```

Expected response:
```json
{"status":"OK"}
```

---

## Monitoring

### Check Logs

**Docker:**
```bash
docker logs -f ikas-bildirimlerim
```

**PM2:**
```bash
pm2 logs ikas-bildirimlerim
```

**Heroku:**
```bash
heroku logs --tail
```

### Restart Service

**Docker:**
```bash
docker-compose restart
```

**PM2:**
```bash
pm2 restart ikas-bildirimlerim
```

---

## Troubleshooting

### Telegram Not Working

1. Check bot token and chat ID
2. Verify bot is started (send `/start`)
3. Check server logs for errors

### Webhook Not Received

1. Test health endpoint
2. Check IKAS webhook configuration
3. Verify firewall/security groups allow port 3000
4. Check server logs

### High Memory Usage

1. Restart service
2. Check for memory leaks in logs
3. Increase container/VPS memory

---

## Security Best Practices

1. Use HTTPS for production
2. Set `MIN_ORDER_AMOUNT` to filter spam
3. Keep dependencies updated: `npm update`
4. Use strong tokens
5. Enable firewall rules
6. Regular backups of configuration

---

## Auto-Updates

### GitHub Actions (CI/CD)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: |
          # Your deployment script
```

---

## Support

For issues:
- Check logs first
- Verify environment variables
- Test health endpoint
- Review IKAS webhook logs
