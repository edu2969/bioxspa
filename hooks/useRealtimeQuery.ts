import { useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";

import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";

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

  const supabase = useMemo(
    () => createSupabaseBrowserClient(),
    []
  );

  const queryKeysRef = useRef(queryKeys);

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    queryKeysRef.current = queryKeys;
  }, [queryKeys]);

  useEffect(() => {

    if (!enabled) {
      return;
    }

    let channel: RealtimeChannel | null = null;

    let destroyed = false;

    const normalizedFilter = filter?.trim();

    const invalidateQueries = () => {
      queryKeysRef.current.forEach((key) => {
        queryClient.invalidateQueries({
          queryKey: key,
        });
      });
    };

    const cleanupChannel = async () => {

      if (!channel) {
        return;
      }

      try {

        await supabase.removeChannel(channel);

      } catch (error) {

        console.error(
          `[Realtime] Error removing channel ${channelName}`,
          error
        );

      } finally {

        channel = null;

      }
    };

    const subscribe = async () => {

      if (destroyed) {
        return;
      }

      await cleanupChannel();

      console.log(
        `[Realtime] Creating channel ${channelName}`
      );

      channel = supabase
        .channel(`${channelName}-${crypto.randomUUID()}`)
        .on(
          "postgres_changes",
          {
            event,
            schema,
            table,
            ...(normalizedFilter
              ? { filter: normalizedFilter }
              : {}),
          } as any,
          (
            payload: RealtimePostgresChangesPayload<
              Record<string, unknown>
            >
          ) => {

            console.log(
              `[Realtime] ${table} change detected`,
              payload
            );

            invalidateQueries();

          }
        )
        .subscribe(async (status) => {

          console.log(
            `[Realtime] ${channelName} status:`,
            status
          );

          if (destroyed) {
            return;
          }

          switch (status) {

            case "SUBSCRIBED":

              invalidateQueries();

              break;

            case "CHANNEL_ERROR":

            case "TIMED_OUT":

            case "CLOSED":

              console.warn(
                `[Realtime] ${channelName} disconnected (${status}), reconnecting...`
              );

              if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
              }

              reconnectTimeoutRef.current = setTimeout(
                async () => {

                  try {

                    const { data } =
                      await supabase.auth.getSession();

                    if (data.session?.access_token) {

                      supabase.realtime.setAuth(
                        data.session.access_token
                      );

                    }

                    await subscribe();

                  } catch (error) {

                    console.error(
                      `[Realtime] Failed to reconnect ${channelName}`,
                      error
                    );

                  }

                },
                1500
              );

              break;
          }
        });
    };

    subscribe();

    const handleVisibilityChange = async () => {

      if (
        document.visibilityState !== "visible"
      ) {
        return;
      }

      console.log(
        `[Realtime] Tab visible again (${channelName})`
      );

      try {

        const { data } =
          await supabase.auth.getSession();

        if (data.session?.access_token) {

          supabase.realtime.setAuth(
            data.session.access_token
          );

        }

        await subscribe();

      } catch (error) {

        console.error(
          `[Realtime] Visibility reconnect failed`,
          error
        );

      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {

      destroyed = true;

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      cleanupChannel();
    };

  }, [
    channelName,
    table,
    schema,
    filter,
    event,
    enabled,
    queryClient,
    supabase,
  ]);
}