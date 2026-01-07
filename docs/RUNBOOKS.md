# Cloud-Code Incident Runbooks

## Overview

This document contains runbooks for common incidents that may occur with the Cloud-Code service.

## Severity Levels

| Level | Name | Response Time | Examples |
|-------|------|---------------|----------|
| P0 | Critical | Immediate | Complete outage, data loss |
| P1 | High | Within 15 min | Degraded service, webhooks failing |
| P2 | Medium | Within 1 hour | Feature broken, performance issues |
| P3 | Low | Within 1 day | Documentation issues, minor bugs |

---

## Runbook: Complete Outage

### Detection
- Health check returns non-200
- All requests failing
- Dashboard unreachable

### Diagnosis Steps
```bash
# 1. Check worker status
curl https://cloud-code.finhub.workers.dev/health

# 2. Check recent deployments
npx wrangler versions list

# 3. View real-time logs
npx wrangler tail

# 4. Check Cloudflare status
curl https://www.cloudflarestatus.com/api/v2/summary.json
```

### Resolution
```bash
# If recent deployment caused issues:
npx wrangler versions list
npx wrangler versions rollback <version-id>

# If container issue:
npx wrangler versions list
# Deploy previous stable container image
```

### Verification
```bash
# Test health endpoint
curl https://cloud-code.finhub.workers.dev/health

# Test webhook endpoint
curl -X POST https://cloud-code.finhub.workers.dev/webhooks/github \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

---

## Runbook: GitHub Webhooks Failing

### Detection
- GitHub shows webhook delivery failures
- Issues not being processed
- Webhook errors in logs

### Diagnosis Steps
```bash
# 1. Check webhook status
curl https://cloud-code.finhub.workers.dev/gh-status

# 2. Verify GitHub App configuration
# Check GitHub App settings page

# 3. Test webhook signature verification
# The /webhooks/github endpoint validates HMAC-SHA256 signatures

# 4. Check for rate limiting
curl -I https://cloud-code.finhub.workers.dev/webhooks/github \
  | grep -i "x-ratelimit"
```

### Common Causes & Fixes

| Cause | Fix |
|-------|-----|
| Webhook secret mismatch | Update secret: `npx wrangler secret put ENCRYPTION_KEY --env staging` |
| Webhook URL changed | Update GitHub App settings |
| Rate limit exceeded | Check `X-RateLimit-*` headers |
| Container not spawning | Check container logs: `npx wrangler tail` |

---

## Runbook: Container Failures

### Detection
- Interactive sessions failing
- Issue processing stuck
- High error rate in logs

### Diagnosis Steps
```bash
# 1. Check container health
curl https://cloud-code.finhub.workers.dev/metrics | jq '.containers'

# 2. View container logs
npx wrangler tail --format pretty

# 3. Check DO status
curl https://cloud-code.finhub.workers.dev/metrics | jq '.durableObjects'
```

### Common Causes & Fixes

| Cause | Fix |
|-------|-----|
| Container timeout | Increase timeout or optimize operation |
| Out of memory | Check container limits, consider upgrade |
| API quota exceeded | Check Anthropic API quota |
| Git clone failures | Verify GitHub token validity |

---

## Runbook: High Error Rate

### Detection
- Error rate >5% in metrics
- Alerts from monitoring system
- User reports

### Diagnosis Steps
```bash
# 1. Check current error rate
curl https://cloud-code.finhub.workers.dev/metrics | jq '.errorRate'

# 2. Check recent logs for error patterns
npx wrangler tail --format pretty | grep ERROR

# 3. Identify problematic routes
curl https://cloud-code.finhub.workers.dev/metrics | jq '.requests.byStatus'
```

### Resolution

1. **If specific route failing**: Check route handler for bugs
2. **If widespread**: Check dependencies and configuration
3. **If rate limit errors**: Consider increasing limits
4. **If API errors**: Check Anthropic/GitHub API status

---

## Runbook: Performance Degradation

### Detection
- P95 latency >30 seconds
- Slow interactive sessions
- User complaints

### Diagnosis Steps
```bash
# 1. Check response times
curl -w "@-" -o /dev/null -s https://cloud-code.finhub.workers.dev/health <<'EOF'
    time_namelookup:  %{time_namelookup}\n
       time_connect:  %{time_connect}\n
    time_appconnect:  %{time_appconnect}\n
   time_pretransfer:  %{time_pretransfer}\n
      time_redirect:  %{time_redirect}\n
 time_starttransfer:  %{time_starttransfer}\n
                    ----------\n
         time_total:  %{time_total}\n
EOF

# 2. Check average response time
curl https://cloud-code.finhub.workers.dev/metrics | jq '.averageResponseTime'

# 3. Check container spawn time
curl https://cloud-code.finhub.workers.dev/metrics | jq '.containerStartupTime'
```

### Common Causes & Fixes

| Cause | Fix |
|-------|-----|
| Container cold starts | Enable Smart Placement in wrangler.jsonc |
| Large repository clones | Use shallow clones, optimize git operations |
| High concurrent requests | Increase `max_instances` for containers |
| Database/DO slow queries | Check DO storage size, consider cleanup |

---

## Runbook: Security Incident

### Detection
- Unauthorized access attempts
- Suspicious activity in logs
- Security vulnerability disclosure

### Immediate Actions
```bash
# 1. Enable additional logging
# Set LOG_LEVEL=debug

# 2. Rotate secrets
npx wrangler secret put ENCRYPTION_KEY
# Update GitHub App webhook secret

# 3. Review recent access logs
npx wrangler tail --format pretty | grep -i "auth\|token\|secret"

# 4. Check for unusual patterns
curl https://cloud-code.finhub.workers.dev/metrics | jq '.requests.byRoute'
```

### Recovery Steps
1. Rotate all secrets
2. Review audit logs
3. Patch vulnerability
4. Review access controls
5. Document lessons learned

---

## Rollback Procedure

### When to Rollback
- New deployment causing errors
- Critical bug introduced
- Performance regression

### Steps
```bash
# 1. List recent versions
npx wrangler versions list

# 2. Identify last known good version
npx wrangler versions view <version-id>

# 3. Rollback
npx wrangler versions rollback <version-id>

# 4. Verify rollback
curl https://cloud-code.finhub.workers.dev/health
```

### Post-Rollback
1. Investigate root cause
2. Create fix in separate branch
3. Test thoroughly in staging
4. Deploy fix when ready

---

## Communication Templates

### P0 Incident (Users Affected)
```
🚨 We're currently experiencing an outage affecting [service].

Impact: [what's broken]
Started: [time]
Working on: [fix details]
Next update: [time]

We apologize for the disruption.
```

### P1 Incident (Degraded Service)
```
⚠️ We're currently experiencing degraded performance.

Some users may experience [symptom].
Our team is investigating.
```

### Resolved
```
✅ The incident has been resolved.

Root cause: [summary]
Prevention: [what we're doing to prevent recurrence]

Thank you for your patience.
```

---

## Escalation Contacts

| Role | Contact | Hours |
|------|---------|-------|
| On-Call Engineer | [contact] | 24/7 |
| Engineering Lead | [contact] | Business hours |
| Product Manager | [contact] | Business hours |

---

## Maintenance Commands

### View Logs
```bash
# Real-time logs
npx wrangler tail --format pretty

# With filter
npx wrangler tail --format pretty | grep ERROR
```

### Deployments
```bash
# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy
```

### Configuration
```bash
# Set secret
npx wrangler secret put SECRET_NAME --env [staging|production]

# View variables
npx wrangler vars list --env [staging|production]
```

---

## Post-Incident Checklist

- [ ] Root cause identified
- [ ] Fix implemented and tested
- [ ] Post-mortem document created
- [ ] Monitoring updated if needed
- [ ] Runbooks updated if needed
- [ ] Stakeholders notified
- [ ] Timeline documented
