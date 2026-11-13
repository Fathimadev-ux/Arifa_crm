"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { useWebsiteStore } from "@/store/website-store";
import { LoadingState } from "@/components/ui";

/** Sends anyone who is not logged in to the login page. */
export function AdminGuard({ children }: { children: ReactNode }) {
  const { isReady, isLoggedIn } = useWebsiteStore();
  const router = useRouter();

  useEffect(() => {
    if (isReady && !isLoggedIn) router.replace("/admin/login");
  }, [isReady, isLoggedIn, router]);

  // Keep the page rendered (hidden) until we know, so Next.js can still check the route for instant navigation.
  if (!isReady || !isLoggedIn) {
    return (
      <div className="p-4 md:p-8">
        <LoadingState />
        <div hidden>{children}</div>
      </div>
    );
  }
  return children;
}
