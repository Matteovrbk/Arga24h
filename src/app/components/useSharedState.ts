import { useState, useEffect, useCallback, useRef } from "react";
import type { AppState } from "./types";
import { INITIAL_BIKE_STATE, INITIAL_SCOUTS, DEFAULT_EVENT_CONFIG } from "./types";
import { toast } from "sonner";
import { db } from "../lib/firebase";
import { ref, onValue, set } from "firebase/database";

const STORAGE_KEY = "sp51_state";
const CHANNEL_NAME = "sp51_sync";
const FIREBASE_PATH = "sp51/state";

function mergeBike(parsed?: Partial<import("./types").BikeState>): import("./types").BikeState {
  return {
    ...INITIAL_BIKE_STATE,
    ...parsed,
    queue: Array.isArray(parsed?.queue) ? parsed.queue : [],
    queuePlannedLaps: Array.isArray(parsed?.queuePlannedLaps) ? parsed.queuePlannedLaps : [],
  };
}

function mergeWithDefaults(parsed: Partial<AppState>): AppState {
  return {
    scouts: Array.isArray(parsed.scouts) ? parsed.scouts : [...INITIAL_SCOUTS],
    bike1: mergeBike(parsed.bike1),
    bike2: mergeBike(parsed.bike2),
    bike3: mergeBike(parsed.bike3),
    lapRecords: Array.isArray(parsed.lapRecords) ? parsed.lapRecords : [],
    eventStartTime: parsed.eventStartTime ?? Date.now(),
    eventConfig: parsed.eventConfig ?? DEFAULT_EVENT_CONFIG,
    commentary: Array.isArray(parsed.commentary) ? parsed.commentary : [],
    lapFlags: parsed.lapFlags && typeof parsed.lapFlags === "object" ? parsed.lapFlags : {},
    raceStarted: parsed.raceStarted ?? true,
  };
}

function loadState(): AppState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return mergeWithDefaults(JSON.parse(stored));
  } catch {}
  return mergeWithDefaults({});
}

function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      toast.error("Stockage local plein ! Données non sauvegardées.", {
        description: "Exportez vos données et videz le cache navigateur.",
        duration: 10000,
      });
    }
  }
}

export function useSharedState(readonly = false) {
  const [state, setState] = useState<AppState>(loadState);
  // Track if this tab is currently writing to Firebase to avoid echo
  const isWritingRef = useRef(false);

  // Broadcast channel for cross-tab sync (same device)
  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event) => {
      if (event.data?.type === "state_update") {
        setState(event.data.state);
      }
    };
    return () => channel.close();
  }, []);

  // Listen to storage events for cross-origin tabs (same device)
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setState(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // Firebase real-time sync (multi-device)
  useEffect(() => {
    if (!db) return;
    const stateRef = ref(db, FIREBASE_PATH);
    const unsubscribe = onValue(stateRef, (snapshot) => {
      // Skip if we just wrote this value ourselves
      if (isWritingRef.current) return;
      const data = snapshot.val();
      if (data) {
        const merged = mergeWithDefaults(data);
        setState(merged);
        saveState(merged);
        try {
          const channel = new BroadcastChannel(CHANNEL_NAME);
          channel.postMessage({ type: "state_update", state: merged });
          channel.close();
        } catch {}
      }
    });
    return () => unsubscribe();
  }, []);

  // For spectator without Firebase: poll localStorage every 500ms
  useEffect(() => {
    if (!readonly || db) return;
    const interval = setInterval(() => {
      setState(loadState());
    }, 500);
    return () => clearInterval(interval);
  }, [readonly]);

  const updateState = useCallback((updater: (prev: AppState) => AppState) => {
    setState((prev) => {
      let next = updater(prev);
      if (next.commentary.length > 100) {
        next = { ...next, commentary: next.commentary.slice(-100) };
      }
      saveState(next);
      // Broadcast to same-device tabs
      try {
        const channel = new BroadcastChannel(CHANNEL_NAME);
        channel.postMessage({ type: "state_update", state: next });
        channel.close();
      } catch {}
      // Push to Firebase for multi-device sync
      if (db) {
        isWritingRef.current = true;
        set(ref(db, FIREBASE_PATH), JSON.parse(JSON.stringify(next)))
          .catch(() => {})
          .finally(() => {
            // Give onValue a moment to fire before we start listening again
            setTimeout(() => { isWritingRef.current = false; }, 200);
          });
      }
      return next;
    });
  }, []);

  return { state, updateState };
}
