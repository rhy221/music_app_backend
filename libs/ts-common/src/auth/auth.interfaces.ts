/** Represents the authenticated user extracted from gateway-injected headers. */
export interface AuthUser {
  userId: string;
  role: string;
}
