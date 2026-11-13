/** The sign-in steps of CRM_API.md §3. Each one throws an ApiError with the backend's message when refused. */
import { api, unwrap, type Schemas } from "./client";

export type Challenge = Schemas["ChallengeOut"];
export type Tokens = Schemas["TokenOut"];

export const MIN_PASSWORD_LENGTH = 12;

/** Step 1: email and password. The answer says which second steps are on offer. */
export async function startLogin(email: string, password: string): Promise<Challenge> {
  return unwrap(await api.POST("/v1/auth/login", { body: { email, password } }));
}

/** Step 2 with the authenticator app: a full session (approvals allowed). */
export async function verifyAppCode(challenge: Challenge, code: string): Promise<Tokens> {
  return unwrap(await api.POST("/v1/auth/mfa/totp", { body: { challenge_token: challenge.challenge_token, code } }));
}

export async function sendEmailCode(challenge: Challenge): Promise<void> {
  unwrap(await api.POST("/v1/auth/mfa/email/send", { body: { challenge_token: challenge.challenge_token } }));
}

/** Step 2 with the emailed code: signed in, but approvals wait for the authenticator app. */
export async function verifyEmailCode(challenge: Challenge, code: string): Promise<Tokens> {
  return unwrap(await api.POST("/v1/auth/mfa/email/verify", { body: { challenge_token: challenge.challenge_token, code } }));
}

/** A new user's one-time password must be replaced before anything else. */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  unwrap(await api.POST("/v1/auth/password", { body: { current_password: currentPassword, new_password: newPassword } }));
}

export async function startPasswordReset(email: string): Promise<void> {
  unwrap(await api.POST("/v1/auth/password/reset/start", { body: { email } }));
}

export async function finishPasswordReset(email: string, code: string, newPassword: string): Promise<void> {
  unwrap(await api.POST("/v1/auth/password/reset/finish", { body: { email, code, new_password: newPassword } }));
}
