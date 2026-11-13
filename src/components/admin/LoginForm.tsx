"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { DEMO_LOGIN, logIn, useWebsiteStore } from "@/store/website-store";
import { GlassBackdrop } from "@/components/GlassBackdrop";
import { INPUT } from "@/components/website/form-kit";
import { SiteImage } from "@/components/site/site-ui";

export function LoginForm() {
  const { isReady, isLoggedIn, published } = useWebsiteStore();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (isReady && isLoggedIn) router.replace("/admin");
  }, [isReady, isLoggedIn, router]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setHasError(!logIn(username, password));
  };

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <GlassBackdrop />
      <form onSubmit={handleSubmit} className="animate-enter panel w-full max-w-sm p-8">
        <SiteImage src={published.settings.logo} alt={published.settings.brandName} width={64} height={64} className="mx-auto size-16 object-contain" />
        <h1 className="mt-4 text-center text-3xl font-light tracking-tight">CMS Login</h1>

        <div className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-1.5 block px-1 text-xs text-neutral-500">Username</span>
            <input autoFocus required value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" className={INPUT} />
          </label>
          <label className="block">
            <span className="mb-1.5 block px-1 text-xs text-neutral-500">Password</span>
            <input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" className={INPUT} />
          </label>
          {hasError && <p className="text-sm font-medium text-black">Wrong username or password.</p>}
          <button type="submit" className="press h-11 w-full rounded-full bg-black text-sm font-medium text-white shadow-md hover:bg-neutral-800">
            Log in
          </button>
        </div>

        <p className="glass mt-6 rounded-full px-3 py-2 text-center text-xs text-neutral-500">
          Demo login: <span className="font-medium text-black">{DEMO_LOGIN.username}</span> / <span className="font-medium text-black">{DEMO_LOGIN.password}</span>
        </p>
      </form>
    </main>
  );
}
