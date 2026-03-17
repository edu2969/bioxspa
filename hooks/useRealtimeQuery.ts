import { useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type UseRealtimeQueryOptions = {
  channelName: string;
  table: string;
  schema?: string;
  filter?: string;
  queryKeys: unknown[][];
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  enabled?: boolean;
};

export function useRealtimeQuery({
  channelName,
  table,
  schema = "public",
  filter,
  queryKeys,
  event = "*",
  enabled = true,
}: UseRealtimeQueryOptions) {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const queryKeysRef = useRef(queryKeys);
  const lastStatusRef = useRef<string | null>(null);

  useEffect(() => {
    queryKeysRef.current = queryKeys;
  }, [queryKeys]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    lastStatusRef.current = null;
    const normalizedFilter = filter?.trim();

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event,
          schema,
          table,
          ...(normalizedFilter ? { filter: normalizedFilter } : {}),
        } as any,
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          console.log(`[Realtime] ${table}:`, payload);
          queryKeysRef.current.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        }
      )
      .subscribe((status) => {
        if (lastStatusRef.current === status) {
          return;
        }

        lastStatusRef.current = status;

        if (status === "SUBSCRIBED") {
          // Sync inicial/reconexion para evitar UI stale si hubo eventos perdidos.
          queryKeysRef.current.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(`[Realtime] Channel ${channelName} status: ${status}`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, table, schema, filter, event, enabled, queryClient, supabase]);
}