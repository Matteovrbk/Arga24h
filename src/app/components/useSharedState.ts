import { useState, useEffect, useCallback, useRef } from "react";
import type { AppState, LapRecord, CommentaryMessage } from "./types";
import { INITIAL_BIKE_STATE, INITIAL_SCOUTS, DEFAULT_EVENT_CONFIG } from "./types";
import { toast } from "sonner";
import { db } from "../lib/firebase";
import { ref, onValue, update, get } from "firebase/database";
import type { Database } from "firebase/database";

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

function mergeWithDefaults(parsed: Partial<AppState> & { lapRecords?: unknown; commentary?: unknown }): AppState {
  // lapRecords can be:
  //   Old format (array): [r0, r1, r2] — Firebase stores as {"0":r0,"1":r1,...}
  //   New format (object): {"1711620150000": r0, "1711620200000": r1, ...}
  const lapRecordsRaw = parsed.lapRecords;
  let lapRecords: LapRecord[];
  if (Array.isArray(lapRecordsRaw)) {
    lapRecords = (lapRecordsRaw as LapRecord[]).filter(Boolean);
  } else if (lapRecordsRaw && typeof lapRecordsRaw === "object") {
    lapRecords = Object.values(lapRecordsRaw as Record<string, LapRecord>)
      .filter(Boolean)
      .sort((a, b) => a.timestamp - b.timestamp);
  } else {
    lapRecords = [];
  }

  // commentary can be old array format or new object format (keyed by UUID)
  const commentaryRaw = parsed.commentary;
  let commentary: CommentaryMessage[];
  if (Array.isArray(commentaryRaw)) {
    commentary = (commentaryRaw as CommentaryMessage[]).filter(Boolean);
  } else if (commentaryRaw && typeof commentaryRaw === "object") {
    commentary = Object.values(commentaryRaw as Record<string, CommentaryMessage>)
      .filter(Boolean)
      .sort((a, b) => a.timestamp - b.timestamp);
  } else {
    commentary = [];
  }

  return {
    scouts: Array.isArray(parsed.scouts) ? parsed.scouts : [...INITIAL_SCOUTS],
    bike1: mergeBike(parsed.bike1),
    bike2: mergeBike(parsed.bike2),
    bike3: mergeBike(parsed.bike3),
    lapRecords,
    eventStartTime: parsed.eventStartTime ?? Date.now(),
    eventConfig: parsed.eventConfig ?? DEFAULT_EVENT_CONFIG,
    commentary,
    lapFlags: parsed.lapFlags && typeof parsed.lapFlags === "object" ? parsed.lapFlags : {},
    raceStarted: parsed.raceStarted ?? true,
    maintenance: parsed.maintenance ?? undefined,
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

/**
 * Write only the fields that changed between prev and next.
 * Each bike gets its own Firebase path so two PCs can write simultaneously
 * without overwriting each other. lapRecords use timestamp as key so
 * concurrent appends from two PCs never collide at the same index.
 */
function diffAndWrite(database: Database, prev: AppState, next: AppState) {
  const updates: Record<string, unknown> = {};
  const P = FIREBASE_PATH;

  // Bike states — each has an independent path
  if (next.bike1 !== prev.bike1) updates[`${P}/bike1`] = next.bike1;
  if (next.bike2 !== prev.bike2) updates[`${P}/bike2`] = next.bike2;
  if (next.bike3 !== prev.bike3) updates[`${P}/bike3`] = next.bike3;

  // Scalar / object fields (rarely written from 2 PCs simultaneously)
  if (next.eventStartTime !== prev.eventStartTime)
    updates[`${P}/eventStartTime`] = next.eventStartTime;
  if (next.raceStarted !== prev.raceStarted)
    updates[`${P}/raceStarted`] = next.raceStarted ?? null;
  if (next.eventConfig !== prev.eventConfig)
    updates[`${P}/eventConfig`] = next.eventConfig ?? null;
  if (next.maintenance !== prev.maintenance)
    updates[`${P}/maintenance`] = next.maintenance ?? null;
  if (next.scouts !== prev.scouts)
    updates[`${P}/scouts`] = next.scouts;

  // lapRecords — keyed by timestamp so two PCs can append at the same time
  // without colliding (each lap has a unique ms timestamp)
  if (next.lapRecords !== prev.lapRecords) {
    const prevByTs = new Map(prev.lapRecords.map((r) => [r.timestamp, r]));
    const nextByTs = new Map(next.lapRecords.map((r) => [r.timestamp, r]));
    // New or modified records
    nextByTs.forEach((r, ts) => {
      const p = prevByTs.get(ts);
      if (!p || p.lapTime !== r.lapTime) {
        updates[`${P}/lapRecords/${ts}`] = r;
      }
    });
    // Deleted records (null = delete in Firebase)
    prevByTs.forEach((_, ts) => {
      if (!nextByTs.has(ts)) updates[`${P}/lapRecords/${ts}`] = null;
    });
  }

  // lapFlags — additive, keyed by "${timestamp}-${bikeId}" (unique per PC per lap)
  if (next.lapFlags !== prev.lapFlags) {
    const prevKeys = new Set(Object.keys(prev.lapFlags));
    Object.entries(next.lapFlags).forEach(([k, v]) => {
      if (!prevKeys.has(k)) updates[`${P}/lapFlags/${k}`] = v;
    });
    // Note: lapFlags are never deleted in the current code, so no removal needed
  }

  // commentary — keyed by UUID (unique across PCs even if written simultaneously)
  if (next.commentary !== prev.commentary) {
    const prevIds = new Set(prev.commentary.map((m) => m.id));
    const nextIds = new Set(next.commentary.map((m) => m.id));
    next.commentary.forEach((m) => {
      if (!prevIds.has(m.id)) updates[`${P}/commentary/${m.id}`] = m;
    });
    prev.commentary.forEach((m) => {
      if (!nextIds.has(m.id)) updates[`${P}/commentary/${m.id}`] = null;
    });
  }

  if (Object.keys(updates).length > 0) {
    update(ref(database), updates).catch(() => {});
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
      // Push only changed fields to Firebase (field-level writes prevent 2-PC conflicts)
      if (db) {
        isWritingRef.current = true;
        diffAndWrite(db, prev, next);
        setTimeout(() => {
          isWritingRef.current = false;
        }, 200);
      }
      return next;
    });
  }, []);

  return { state, updateState };
}
