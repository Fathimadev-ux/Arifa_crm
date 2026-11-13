"use client";

/**
 * Sign-in (CRM_API.md §3): email and password, then a code from the authenticator app or by email.
 * Also covers a forgotten password and the forced change of a new user's one-time password.
 */
import { useRouter } from "next/navigation";
import { type FormEvent, type InputHTMLAttributes, type ReactNode, useState } from "react";
import { ApiError, setAccessToken } from "@/lib/api/client";
import { clearApiCache } from "@/lib/api/use-api";
import {
  type Challenge,
  MIN_PASSWORD_LENGTH,
  type Tokens,
  changePassword,
  finishPasswordReset,
  sendEmailCode,
  startLogin,
  startPasswordReset,
  verifyAppCode,
  verifyEmailCode,
} from "@/lib/api/auth";
import { GlassBackdrop } from "@/components/GlassBackdrop";

type Step =
  | { name: "SIGN_IN" }
  | { name: "CODE"; challenge: Challenge; method: "totp" | "email" }
  | { name: "NEW_PASSWORD" }
  | { name: "FORGOT" }
  | { name: "RESET" };

const TITLES: Record<Step["name"], string> = {
  SIGN_IN: "Log in",
  CODE: "Verify it's you",
  NEW_PASSWORD: "Set a new password",
  FORGOT: "Reset password",
  RESET: "Reset password",
};

const INPUT = "glass h-11 w-full rounded-full px-4 text-sm shadow-sm outline-none transition-all placeholder:text-neutral-400 hover:bg-white/80 focus:bg-white focus:shadow-md";
const LINK = "press rounded-full px-3 py-1.5 text-xs font-medium text-neutral-500 hover:bg-black/5 hover:text-black";

function Field({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-xs text-neutral-500">{label}</span>
      <input required className={INPUT} {...props} />
    </label>
  );
}

function SubmitButton({ isBusy, children }: { isBusy: boolean; children: ReactNode }) {
  return (
    <button type="submit" disabled={isBusy} className="press h-11 w-full rounded-full bg-black text-sm font-medium text-white shadow-md hover:bg-neutral-800 disabled:bg-neutral-400">
      {isBusy ? "Please wait…" : children}
    </button>
  );
}

export function LoginScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ name: "SIGN_IN" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const goTo = (next: Step, note = "") => {
    setStep(next);
    setCode("");
    setMessage(note);
  };

  /** Runs one step; a refusal shows the backend's message under the form. */
  const submit = (action: () => Promise<void>) => async (event: FormEvent) => {
    event.preventDefault();
    setIsBusy(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Can't reach the server");
    } finally {
      setIsBusy(false);
    }
  };

  const openCrm = () => {
    clearApiCache();
    router.replace("/");
  };

  const signedIn = (tokens: Tokens) => {
    setAccessToken(tokens.access_token);
    if (tokens.must_change_password) goTo({ name: "NEW_PASSWORD" });
    else openCrm();
  };

  const askForEmailCode = async (challenge: Challenge) => {
    await sendEmailCode(challenge);
    goTo({ name: "CODE", challenge, method: "email" }, `We sent a code to ${email}`);
  };

  const handleSignIn = submit(async () => {
    const challenge = await startLogin(email.trim(), password);
    // The authenticator app comes first; the email code is the fallback (and the only way before it is set up).
    if (challenge.methods.includes("totp")) goTo({ name: "CODE", challenge, method: "totp" });
    else await askForEmailCode(challenge);
  });

  const handleCode = (challenge: Challenge, method: "totp" | "email") =>
    submit(async () => signedIn(method === "totp" ? await verifyAppCode(challenge, code) : await verifyEmailCode(challenge, code)));

  const handleNewPassword = submit(async () => {
    await changePassword(password, newPassword);
    openCrm();
  });

  const handleForgot = submit(async () => {
    await startPasswordReset(email.trim());
    goTo({ name: "RESET" }, `If ${email} has an account, a code is on its way`);
  });

  const handleReset = submit(async () => {
    await finishPasswordReset(email.trim(), code, newPassword);
    setPassword("");
    setNewPassword("");
    goTo({ name: "SIGN_IN" }, "Password changed. Log in with the new one.");
  });

  const codeField = <Field label="6-digit code" autoFocus value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} inputMode="numeric" autoComplete="one-time-code" minLength={6} maxLength={10} />;
  const newPasswordField = (
    <Field label={`New password (at least ${MIN_PASSWORD_LENGTH} characters)`} type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} />
  );

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <GlassBackdrop />
      <div className="animate-enter panel w-full max-w-sm p-8">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-black text-lg font-bold text-white">A</span>
        <h1 className="mt-4 text-center text-3xl font-light tracking-tight">{TITLES[step.name]}</h1>

        {step.name === "SIGN_IN" && (
          <form onSubmit={handleSignIn} className="mt-8 space-y-4">
            <Field label="Work email" type="email" autoFocus value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" />
            <Field label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
            {message && <p className="text-sm font-medium">{message}</p>}
            <SubmitButton isBusy={isBusy}>Continue</SubmitButton>
            <button type="button" onClick={() => goTo({ name: "FORGOT" })} className={`${LINK} mx-auto block`}>
              Forgot password?
            </button>
          </form>
        )}

        {step.name === "CODE" && (
          <form onSubmit={handleCode(step.challenge, step.method)} className="mt-8 space-y-4">
            <p className="text-center text-sm text-neutral-500">{step.method === "totp" ? "Enter the code from your authenticator app." : "Enter the code from your email."}</p>
            {codeField}
            {message && <p className="text-sm font-medium">{message}</p>}
            <SubmitButton isBusy={isBusy}>Log in</SubmitButton>
            <div className="flex justify-center gap-1">
              {step.method === "totp" && step.challenge.methods.includes("email") && (
                <button type="button" disabled={isBusy} onClick={submit(() => askForEmailCode(step.challenge))} className={LINK}>
                  Email me a code
                </button>
              )}
              <button type="button" onClick={() => goTo({ name: "SIGN_IN" })} className={LINK}>
                Back
              </button>
            </div>
          </form>
        )}

        {step.name === "NEW_PASSWORD" && (
          <form onSubmit={handleNewPassword} className="mt-8 space-y-4">
            <p className="text-center text-sm text-neutral-500">Replace your one-time password before you start.</p>
            {newPasswordField}
            {message && <p className="text-sm font-medium">{message}</p>}
            <SubmitButton isBusy={isBusy}>Save and continue</SubmitButton>
          </form>
        )}

        {step.name === "FORGOT" && (
          <form onSubmit={handleForgot} className="mt-8 space-y-4">
            <Field label="Work email" type="email" autoFocus value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" />
            {message && <p className="text-sm font-medium">{message}</p>}
            <SubmitButton isBusy={isBusy}>Send code</SubmitButton>
            <button type="button" onClick={() => goTo({ name: "SIGN_IN" })} className={`${LINK} mx-auto block`}>
              Back
            </button>
          </form>
        )}

        {step.name === "RESET" && (
          <form onSubmit={handleReset} className="mt-8 space-y-4">
            {message && <p className="text-center text-sm text-neutral-500">{message}</p>}
            {codeField}
            {newPasswordField}
            <SubmitButton isBusy={isBusy}>Change password</SubmitButton>
            <button type="button" onClick={() => goTo({ name: "SIGN_IN" })} className={`${LINK} mx-auto block`}>
              Back
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
