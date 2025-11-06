# Auth Module

The authentication module provides a complete authentication and authorization system with multiple authentication methods.

## Features

**Authentication Methods:**
- JWT (JSON Web Token) authentication with refresh tokens
- OAuth2 integration (Google, GitHub)
- Magic Link (passwordless email authentication)
- OTP (One-Time Password via email)
- Traditional username/password authentication

**Security Features:**
- Password hashing with bcrypt (salt rounds: 10)
- RSA256 asymmetric encryption for JWT tokens
- Refresh token rotation
- Security audit logging
- Failed login attempt tracking
- Cookie-based session management

**Authorization:**
- Role-based access control (RBAC)
- JWT guards for protected routes
- Role guards for role-specific endpoints
- Custom decorators for easy authorization

#### Module Structure

**Controllers:**
- `AccountController` - User account management (profile, settings, password changes)
- `GoogleOAuthController` - Google OAuth flow (initiate, callback)
- `GitHubOAuthController` - GitHub OAuth flow (initiate, callback)
- `MagicLinkController` - Magic link generation and validation
- `OtpController` - OTP generation, sending, and verification

**Services:**
- `JwtAuthService` - JWT token creation, verification, and refresh
- `AccountService` - User account operations (create, update, delete)
- `GoogleOAuthService` - Google OAuth token exchange and user info retrieval
- `GitHubOAuthService` - GitHub OAuth token exchange and user info retrieval
- `MagicLinkService` - Magic link generation, validation, and expiration handling
- `OtpService` - OTP generation, validation, and expiration handling
- `CookieService` - Cookie creation, validation, and removal

**Entities:**
- `UserEntity` - Core user information (email, username, profile data)
- `AccountEntity` - OAuth provider accounts linked to users
- `PasswordEntity` - Hashed password credentials
- `TokenEntity` - Refresh tokens with expiration tracking
- `MagicLinkEntity` - Magic link tokens with single-use validation
- `OtpEntity` - One-time password codes with expiration
- `SecurityLogEntity` - Security events (login, logout, failed attempts, password changes)

**Guards:**
- `JwtAuthGuard` - Validates JWT tokens and attaches user to request
- `RolesGuard` - Checks user roles against required roles for endpoints

**Decorators:**
- `@GetUser()` - Extracts authenticated user object from request
- `@GetUserId()` - Extracts user ID from JWT token
- `@Roles(...roles)` - Specifies required roles for endpoint access

**Interceptors:**
- `AuthCookieInterceptor` - Automatically sets authentication cookies on successful login/signup

## Usage Examples

**Protecting Routes:**
```typescript
@Controller('protected')
export class ProtectedController {
  // Require authentication
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@GetUser() user: AuthenticatedUser) {
    return user;
  }

  // Require specific roles
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  adminOnly() {
    return 'Admin content';
  }
}
```

**OAuth Flow:**
```typescript
// Initiate OAuth (redirects to provider)
GET /auth/google
GET /auth/github

// Callback (handles provider response)
GET /auth/google/callback?code=...
GET /auth/github/callback?code=...
```

**Magic Link Flow:**
```typescript
// Request magic link
POST /auth/magic-link/request
{
  "email": "user@example.com"
}

// User clicks link in email
GET /auth/magic-link/verify?token=...
```

**OTP Flow:**
```typescript
// Request OTP
POST /auth/otp/request
{
  "email": "user@example.com"
}

// Verify OTP
POST /auth/otp/verify
{
  "email": "user@example.com",
  "code": "123456"
}
```
