"use client";

/**
 * The signed-in staff member. Right after login the token is already in memory; on a fresh page load the
 * refresh cookie gets one. Then /auth/me says who this is. With no session, the person goes to /login.
 */
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { type Role, toRole } from "@/config/roles";
import { ApiError, api, handleSessionEnded, hasAccessToken, renewSession, setAccessToken, unwrap, type StaffUser } from "@/lib/api/client";
import { clearApiCache, useApi } from "@/lib/api/use-api";

interface SessionValue {
  user: StaffUser | undefined;
  role: Role;
  logOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

async function loadCurrentUser(): Promise<StaffUser> {
  if (!hasAccessToken() && !(await renewSession())) throw new ApiError(401, "Signed out");
  return unwrap(await api.GET("/v1/auth/me"));
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: user, error } = useApi("me", loadCurrentUser);

  const leave = useCallback(() => {
    setAccessToken(null);
    clearApiCache();
    router.replace("/login");
  }, [router]);

  useEffect(() => handleSessionEnded(leave), [leave]);
  useEffect(() => {
    if (error?.status === 401) leave();
  }, [error, leave]);

  const logOut = useCallback(async () => {
    await api.POST("/v1/auth/logout");
    leave();
  }, [leave]);

  const value = useMemo<SessionValue>(() => ({ user, role: toRole(user?.role ?? ""), logOut }), [user, logOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/** A content editor works in the CMS only (18 Nov): the CRM shows them a note and Log out instead of the deal screens. */
export function CrmOnly({ children }: { children: React.ReactNode }) {
  const { role, logOut } = useSession();
  if (role !== "content_editor") return children;
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="panel w-full max-w-sm space-y-4 p-8 text-center">
        <h1 className="text-2xl font-light tracking-tight">This account uses the CMS</h1>
        <p className="text-sm text-neutral-500">Content editors edit the website in the CMS. The CRM is for the sales team.</p>
        <button onClick={() => void logOut()} className="press h-11 w-full rounded-full bg-black text-sm font-medium text-white">
          Log out
        </button>
      </div>
    </main>
  );
}

export function useSession(): SessionValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside <SessionProvider>");
  return context;
}
