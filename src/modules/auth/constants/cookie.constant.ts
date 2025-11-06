/**
 * Cookie configuration for authentication
 */
export const COOKIE_CONFIG = {
  /**
   * Name of the authentication cookie
   */
  AUTH_COOKIE_NAME: "access_token",

  /**
   * Cookie options for production
   */
  COOKIE_OPTIONS: {
    httpOnly: true, // Prevent XSS attacks
    secure: true, // Only send over HTTPS (set to false in dev)
    sameSite: "strict" as const, // CSRF protection
    maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    path: "/", // Cookie available for all routes
  },

  /**
   * Cookie options for development (less strict)
   */
  COOKIE_OPTIONS_DEV: {
    httpOnly: true,
    secure: false, // Allow HTTP in development
    sameSite: "lax" as const,
    maxAge: 24 * 60 * 60 * 1000,
    path: "/",
  },
} as const;
