# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability within ServerPilot, please send an email to security@serverpilot.local. All security vulnerabilities will be promptly addressed.

**Please do not report security vulnerabilities through public GitHub issues.**

## Security Measures

### Authentication
- JWT tokens with short expiration (15 minutes)
- Refresh tokens with longer expiration (7 days)
- Password hashing with bcrypt (12 rounds)
- Rate limiting on login attempts

### Authorization
- Role-based access control (Admin, Reseller, User)
- Resource ownership validation
- API endpoint protection with guards

### Data Protection
- Sensitive data encryption at rest
- HTTPS enforcement in production
- CORS configuration
- Input validation and sanitization

### Server Security
- Command injection prevention
- File path traversal protection
- SQL injection prevention (Prisma ORM)
- XSS protection

### Infrastructure
- Regular security updates
- Firewall configuration
- SSH key authentication
- Database access restrictions

## Best Practices

1. **Keep dependencies updated**
   ```bash
   npm audit
   npm update
   ```

2. **Use environment variables**
   - Never commit `.env` files
   - Use different secrets for dev/prod

3. **Enable HTTPS**
   - Use Let's Encrypt for free SSL
   - Redirect HTTP to HTTPS

4. **Regular backups**
   - Automated daily backups
   - Test restoration procedures

5. **Monitor logs**
   - Track authentication attempts
   - Monitor API usage
   - Set up alerts for suspicious activity

## Security Checklist

- [ ] JWT secrets are strong and unique
- [ ] Database passwords are complex
- [ ] SSH uses key authentication
- [ ] Firewall is properly configured
- [ ] SSL certificates are valid
- [ ] Regular security updates applied
- [ ] Access logs are monitored
- [ ] Backup procedures tested
