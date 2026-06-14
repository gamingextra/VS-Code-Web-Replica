# Security Policy

## Reporting Security Vulnerabilities

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please:
1. Email the maintainers directly (see repository settings for contact info)
2. Include a detailed description of the vulnerability
3. Provide steps to reproduce
4. Include potential impact assessment
5. Suggest a fix if you have one

We will acknowledge your report within 48 hours and aim to provide a fix within 7 days.

---

## Security Measures

### Authentication

- Login rate limiting: Maximum 5 attempts per 60-second window
- Exponential backoff on repeated login failures
- JWT token-based session management
- Local fallback authentication (password: `vscode`) when backend is unavailable

### Code Execution Sandbox

Code execution is isolated in Docker containers with strict security constraints:

| Security Measure | Default Value | Purpose |
|-----------------|---------------|---------|
| Memory Limit | 512 MB | Prevent resource exhaustion |
| CPU Quota | 100,000 (1 CPU) | Prevent CPU abuse |
| PID Limit | 100 | Prevent fork bombs |
| Network Mode | None | No network access |
| Root Filesystem | Read-only (except /tmp) | Prevent filesystem tampering |
| Execution Timeout | 30 seconds | Prevent infinite loops |
| Container Cleanup | Automatic | Remove containers after execution |

### Input Sanitization

- **Debug Console**: Uses `new Function()` with math-only filtering instead of `eval()`
- **Terminal Input**: Commands are validated before execution
- **File Paths**: Path traversal attacks prevented via normalization
- **Code Execution**: All code runs in isolated Docker containers

### WebSocket Security

- Socket.IO connections validated against authentication state
- Rate limiting on WebSocket message frequency
- Input validation on all incoming events

### Known Security Considerations

1. **Demo Credentials** — The default password (`vscode`) is intended for development only. Change it in production.
2. **No HTTPS by Default** — Use Caddy's automatic HTTPS or a reverse proxy in production.
3. **CORS** — Currently configured for development. Restrict origins in production.
4. **Docker Socket** — The sandbox service requires Docker socket access. Run with minimal privileges.
5. **Token Storage** — Auth tokens are stored in localStorage. Consider more secure storage for production.

---

## Security Best Practices for Deployment

1. **Change the default password** — Set a strong password via environment variables
2. **Enable HTTPS** — Use Caddy's automatic TLS or configure your reverse proxy
3. **Restrict CORS** — Set `ALLOWED_ORIGINS` to your actual domain
4. **Limit Docker access** — Use Docker rootless mode or restricted socket access
5. **Set resource limits** — Configure appropriate sandbox limits for your workload
6. **Enable audit logging** — Log all authentication and execution events
7. **Keep dependencies updated** — Regularly run `bun audit` and update packages
8. **Use secrets management** — Store sensitive values in environment variables, not code

---

## Vulnerability Disclosure Timeline

| Time | Action |
|------|--------|
| Day 0 | Vulnerability reported |
| Day 1 | Acknowledgment sent to reporter |
| Day 2-3 | Vulnerability confirmed, fix developed |
| Day 4-7 | Fix tested and reviewed |
| Day 7 | Patch released, CVE requested if applicable |
| Day 14 | Public disclosure (if reporter agrees) |

We appreciate responsible disclosure and will credit researchers who report vulnerabilities.
