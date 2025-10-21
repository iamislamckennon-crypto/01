# Deployment Guide

This guide walks through deploying the Cloudflare Dice Platform to production.

## Prerequisites

- Cloudflare account with Workers enabled
- Wrangler CLI installed (`npm install -g wrangler`)
- Domain configured in Cloudflare (optional but recommended)
- Turnstile site configured

## Step 1: Configure Cloudflare Account

1. **Create Turnstile Site**
   - Go to Cloudflare Dashboard → Turnstile
   - Click "Add Site"
   - Configure domain and settings
   - Save site key and secret key

2. **Enable Workers**
   - Navigate to Workers & Pages
   - Ensure Workers are enabled for your account

3. **Create R2 Bucket (Optional)**
   - For analytics export in future
   - Navigate to R2
   - Create bucket named `dice-platform-analytics`

## Step 2: Configure Secrets

Set sensitive configuration using Wrangler secrets:

```bash
# Set Turnstile secret
wrangler secret put TURNSTILE_SECRET
# Enter your secret key when prompted

# Optional: Set other secrets
wrangler secret put DATABASE_URL
wrangler secret put API_KEY
```

## Step 3: Update wrangler.toml

Edit `wrangler.toml` for production:

```toml
name = "dice-platform-prod"
main = "cloudflare/src/index.js"
compatibility_date = "2024-01-01"

# Production environment variables
[vars]
ORIGIN_ALLOWED = "https://yourdomain.com,https://www.yourdomain.com"
MAX_ROLLS_PER_MINUTE = "60"
MIN_FAIRNESS_SAMPLE_SIZE = "30"
FAIRNESS_ALPHA = "0.05"
SUSPENSION_THRESHOLD = "3"

# Durable Objects
[[durable_objects.bindings]]
name = "GAMEROOM"
class_name = "GameRoomDurable"
script_name = "dice-platform-prod"

# Add R2 bucket binding (optional)
[[r2_buckets]]
binding = "ANALYTICS_BUCKET"
bucket_name = "dice-platform-analytics"

# Migrations
[[migrations]]
tag = "v1"
new_classes = ["GameRoomDurable"]
```

## Step 4: Deploy Worker

Deploy the Worker script:

```bash
cd /path/to/01
wrangler deploy
```

Output should show:
```
⛅️ wrangler 3.x.x
--------------------
Uploaded dice-platform-prod (x.xx sec)
Published dice-platform-prod (x.xx sec)
  https://dice-platform-prod.youraccount.workers.dev
```

## Step 5: Deploy Static Assets (Cloudflare Pages)

Two options:

### Option A: Wrangler Pages Deploy

```bash
wrangler pages deploy cloudflare/public --project-name=dice-platform
```

### Option B: Git Integration

1. Push code to GitHub
2. In Cloudflare Dashboard → Pages
3. Click "Create a project"
4. Connect to GitHub repo
5. Configure build settings:
   - Build command: (leave empty)
   - Build output directory: `cloudflare/public`
6. Deploy

## Step 6: Configure Custom Domain (Recommended)

### For Worker:

1. In Cloudflare Dashboard → Workers → dice-platform-prod
2. Click "Triggers" tab
3. Click "Add Custom Domain"
4. Enter: `api.yourdomain.com`
5. Save

### For Pages:

1. In Cloudflare Dashboard → Pages → dice-platform
2. Click "Custom domains"
3. Click "Set up a custom domain"
4. Enter: `yourdomain.com` or `app.yourdomain.com`
5. Save

DNS records are created automatically.

## Step 7: Configure WAF Rules

Set up Web Application Firewall rules:

1. Navigate to Security → WAF
2. Create custom rules:

**Rule 1: Rate Limit Registration**
```
(http.request.uri.path eq "/api/register") and (rate > 10/1m)
→ Block
```

**Rule 2: Rate Limit Create Room**
```
(http.request.uri.path eq "/api/gameroom/create") and (rate > 20/1m)
→ Block
```

**Rule 3: Bot Challenge**
```
(http.request.uri.path contains "/api/") and (cf.bot_management.score lt 30)
→ Managed Challenge
```

## Step 8: Configure SSL/TLS

1. Navigate to SSL/TLS
2. Set SSL/TLS encryption mode: **Full (strict)**
3. Enable Always Use HTTPS
4. Enable HTTP Strict Transport Security (HSTS)

## Step 9: Test Deployment

Test all endpoints:

```bash
# Test registration
curl -X POST https://api.yourdomain.com/api/register \
  -H "Content-Type: application/json" \
  -d '{"playerId":"test123","turnstileToken":"dummy"}'

# Test create room
curl -X POST https://api.yourdomain.com/api/gameroom/create

# Test WebSocket (using websocat or browser)
websocat wss://api.yourdomain.com/api/gameroom/ROOM_ID/stream
```

## Step 10: Configure Monitoring

### Workers Analytics

1. Navigate to Workers → dice-platform-prod → Metrics
2. Enable Real-time logs
3. Set up alerts:
   - Error rate > 5%
   - CPU time > 50ms p95
   - Requests > threshold

### Logpush (Optional)

Set up log shipping to external service:

```bash
wrangler tail --format=json | your-log-aggregator
```

Or configure Logpush in dashboard for:
- S3
- Datadog
- Splunk
- etc.

## Step 11: Verify Production Checklist

Go through [USER_TASKS.md](USER_TASKS.md) and complete all items.

## Rollback Procedure

If issues occur:

```bash
# List deployments
wrangler deployments list

# Rollback to previous version
wrangler rollback --message "Rolling back due to issue"
```

## Scaling Considerations

### Durable Objects

- Each game room is a separate Durable Object
- Automatically distributed globally
- No manual scaling needed

### Workers

- Automatically scale to handle traffic
- No configuration needed
- Pay per request

### Rate Limits

Monitor and adjust in `wrangler.toml`:

```toml
[vars]
MAX_ROLLS_PER_MINUTE = "120"  # Increase if needed
```

Redeploy after changes.

## Monitoring Endpoints

Add health check endpoint (already implemented):

```
GET https://api.yourdomain.com/api/health
```

Set up external monitoring (Pingdom, StatusCake, etc.) to check this endpoint every 1-5 minutes.

## Troubleshooting

### Issue: Durable Object not found

**Solution**: Run migration:
```bash
wrangler migrations apply
```

### Issue: CORS errors

**Solution**: Verify `ORIGIN_ALLOWED` includes your domain:
```bash
wrangler tail  # Check logs
```

Update `wrangler.toml` and redeploy.

### Issue: WebSocket connection fails

**Solution**: Ensure custom domain is configured correctly and SSL is enabled.

### Issue: High error rate

**Solution**: 
1. Check Wrangler logs: `wrangler tail`
2. Review Workers Analytics dashboard
3. Check for Durable Object errors
4. Verify secrets are set correctly

## Cost Estimation

Based on Cloudflare Workers pricing:

- Workers: $5/month for 10M requests
- Durable Objects: $5/month for 1M requests
- R2 Storage: $0.015/GB/month
- Pages: Free (unlimited bandwidth)

Estimated cost for 100K MAU: $20-50/month

## Post-Deployment

1. ✅ Monitor error rates for 24 hours
2. ✅ Run load test (see `USER_TASKS.md`)
3. ✅ Set up on-call rotation
4. ✅ Document incident response procedures
5. ✅ Schedule first backup verification

## Support

For issues:
1. Check Cloudflare Community: https://community.cloudflare.com/
2. Cloudflare Support (Enterprise): support.cloudflare.com
3. GitHub Issues: https://github.com/iamislamckennon-crypto/01/issues
