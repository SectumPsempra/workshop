/** Emits structured auth failure logs without PII or token contents. */
export function logAuthFailure(reason: string): void {
  console.error(JSON.stringify({ event: "auth_failure", reason }));
}
