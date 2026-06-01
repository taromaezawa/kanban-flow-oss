# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

Only the latest release receives security patches.

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub Issues.**

Send an email to **taro@repeat.co.jp** with:

- Subject: `[SECURITY] kanban-flow-oss — <brief summary>`
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fix (optional)

### Response Timeline

| Stage | Timeframe |
| ----- | --------- |
| Initial acknowledgement | Within 48 hours |
| Triage / severity assessment | Within 5 business days |
| Fix or mitigation | Within 30 days (critical), 90 days (others) |
| Public disclosure | Coordinated with reporter after fix is released |

## Disclosure Policy

- We follow **responsible disclosure** (coordinated disclosure).
- We will notify you when a fix is released and credit you in the release notes (unless you prefer to remain anonymous).
- Please give us reasonable time to address the issue before public disclosure.

## Out of Scope

The following are **not** considered security vulnerabilities for this project:

- Vulnerabilities in third-party dependencies (report upstream)
- Self-XSS or issues requiring physical access to the device
- Denial-of-service via resource exhaustion on self-hosted infrastructure
- Missing security headers when deployed without a reverse proxy

## Security Best Practices for Self-Hosters

- Always set strong, unique passwords in `settei.json`
- Never commit real credentials — keep `.env.local` and `settei.json` in `.gitignore`
- Run behind HTTPS (Vercel provides this automatically)
- Rotate `SLACK_BOT_TOKEN` if it is ever exposed
