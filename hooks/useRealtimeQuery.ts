import { useEffect } from "react";
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
};

export function useRealtimeQuery({
  channelName,
  table,
  schema = "public",
  filter,
  queryKeys,
  event = "*",
}: UseRealtimeQueryOptions) {
  const queryClient = useQueryClient();
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event,
          schema,
          table,
          ...(filter ? { filter } : {}),
        } as any,
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          console.log(`[Realtime] ${table}:`, payload);
          queryKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, table, schema, filter, event]);
}