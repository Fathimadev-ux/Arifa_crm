"use client";

import { useCallback } from "react";
import { can } from "@/config/roles";
import { useStaff } from "@/lib/api/crm";
import { useSession } from "@/store/session";

/** Turns a staff id into a name. Sales can't list colleagues, so they see their own name and "Staff". */
export function useStaffNames() {
  const { user, role } = useSession();
  const { data: staff } = useStaff(can(role, "LIST_STAFF"));

  const nameOf = useCallback(
    (id: string | null) => {
      if (!id) return "Unassigned";
      if (id === user?.id) return user.full_name;
      return staff?.find((member) => member.id === id)?.full_name ?? "Staff";
    },
    [user, staff],
  );

  return { nameOf, staff };
}
