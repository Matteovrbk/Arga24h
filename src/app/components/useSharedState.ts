import { useState, useEffect, useCallback } from "react";
import type { AppState } from "./types";
import { INITIAL_BIKE_STATE, INITIAL_SCOUTS } from "./types";
import { toast } from "sonner";

const STORAGE_KEY = "sp51_state";
const CHANNEL_NAME = "sp51_sync";

function loadState(): AppState {
  const defaults: AppState = {
    scouts: INITIAL_SCOUTS,
    bike1: INITIAL_BIKE_STATE,
    bike2: INITIAL_BIKE_STATE,
    lapRecords: [],
    eventStartTime: Date.now(),
    commentary: [],
    lapFlags: {},
  };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaults, ...parsed };
    }
  } catch {}
  return defaults;
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

  // Broadcast channel for cross-tab sync
  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event) => {
      if (event.data?.type === "state_update") {
        setState(event.data.state);
      }
    };
    return () => channel.close();
  }, []);

  // Also listen to storage events for cross-origin tabs
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

  // For spectator: poll localStorage every 500ms for updates
  useEffect(() => {
    if (!readonly) return;
    const interval = setInterval(() => {
      setState(loadState());
    }, 500);
    return () => clearInterval(interval);
  }, [readonly]);

  const updateState = useCallback((updater: (prev: AppState) => AppState) => {
    setState((prev) => {
      const next = updater(prev);
      saveState(next);
      try {
        const channel = new BroadcastChannel(CHANNEL_NAME);
        channel.postMessage({ type: "state_update", state: next });
        channel.close();
      } catch {}
      return next;
    });
  }, []);

  return { state, updateState };
}
