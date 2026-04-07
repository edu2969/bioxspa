import { useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useOnVisibilityChange } from "./useOnVisibilityChange";

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
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
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
      .channel(channelName);

    channel.on(
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
          supabase.removeChannel(channel);     
          channel.subscribe();
          console.log(`[Realtime] Channel ${channelName} re-subscribed after error/timeout.`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, table, schema, filter, event, enabled, queryClient, supabase]);

  useEffect(() => {
    let subscription: RealtimeChannel

    const setupRealtimeSubscription = async () => {
      await unsubscribeRealtimeConnection()
      subscription = supabase
        .channel('list-all-channel')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'lists',
          },
          (payload) => {
            
          }
        )
        .subscribe((status) => {
          console.log('List Insert and Update Listener.... ', status)
        })
    }

    const unsubscribeRealtimeConnection = async () => {
      if (subscription) {
        const message = await subscription.unsubscribe()
        console.log(`${message} - List realtime listener removed.`)
      }
    }

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab is visible again.')
        if (subscription.state === 'closed') {
          console.log('SUBSCRIPTION IS CLOSED.')
          // Token refesh is important to prevent prevent reconnection failure
          const { data } = await supabase.auth.getSession()
          if (data.session) {
            supabase.realtime.setAuth(data.session?.access_token)
            setupRealtimeSubscription()
          }
        }
      }
    }

    // Set up initial subscription
    setupRealtimeSubscription()

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup
    return () => {
      unsubscribeRealtimeConnection()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, []);
}