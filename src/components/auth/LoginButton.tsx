import { initiateAuth } from "../../lib/auth/sso.js";

/** Renders the SSO login trigger — no password fields. */
export function LoginButton() {
  return (
    <button type="button" onClick={() => initiateAuth()}>
      Sign in with SSO
    </button>
  );
}
