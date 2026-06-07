/** Standard error response returned by AllExceptionsFilter. */
export interface ErrorResponse {
  status: number;
  error: string;
  message: string;
  /** ISO-8601 timestamp */
  timestamp: string;
  path: string;
}
