"use client";

import { useEffect, useState } from "react";
import type { Feed, FeedEvent } from "@/lib/types";

/** Events from subscribed calendars for a date range. Refetches when the range or feeds change. */
export function useFeedEvents(feeds: Feed[], from: string, to: string) {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const key = feeds.map((f) => f.id).join(",");

  useEffect(() => {
    if (!key) {
      setEvents([]);
      setErrors({});
      return;
    }
    let alive = true;
    setLoading(true);
    fetch(`/api/feeds/events?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        setEvents(j.events ?? []);
        setErrors(j.errors ?? {});
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [key, from, to]);

  return { events, errors, loading };
}
