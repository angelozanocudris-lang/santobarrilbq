import { useEffect, useState, useCallback } from "react";
import { checkAdminSession } from "@/lib/admin-auth.functions";

export function useAdminAuth() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await checkAdminSession();
      setIsAdmin(!!res?.authenticated);
    } catch {
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { loading, isAdmin, refresh };
}
