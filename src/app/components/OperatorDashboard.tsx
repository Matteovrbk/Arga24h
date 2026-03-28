import { useState, useEffect, useRef, useCallback } from "react";
import {
  Eye,
  Settings2,
  ShieldAlert,
  LogOut,
  Download,
  FileSpreadsheet,
  Volume2,
  VolumeX,
  BarChart3,
  X,
  MessageSquare,
  Trash2,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { BikeQueue } from "./BikeQueue";
import { CircuitSVG } from "./CircuitSVG";
import { Leaderboard } from "./Leaderboard";
import { ScoutManager } from "./ScoutManager";
import { useSharedState } from "./useSharedState";
import { useSpectatorChat } from "./useSpectatorChat";
import { AdminLogin, isAdminAuthenticated, logoutAdmin } from "./AdminLogin";
import { toast, Toaster } from "sonner";
import {
  BIKE1_COLOR,
  BIKE2_COLOR,
  BIKE3_COLOR,
  INITIAL_BIKE_STATE,
  DEFAULT_EVENT_CONFIG,
  LAP_VALIDATION_THRESHOLDS,
  formatTimeFull,
  formatDuration,
  bikeName,
  bikeShortLabel,
  bikeColor as getBikeColor,
} from "./types";
import type { Scout, CommentaryMessage } from "./types";
import { useNavigate } from "react-router";

// ── Sound helpers ──────────────────────────────────────────────
function playBeep(frequency: number, durationMs: number, count = 1) {
  try {
    const ctx = new AudioContext();
    for (let i = 0; i < count; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = frequency;
      osc.type = "sine";
      gain.gain.value = 0.3;
      const start = ctx.currentTime + i * (durationMs / 1000 + 0.15);
      osc.start(start);
      osc.stop(start + durationMs / 1000);
    }
  } catch {}
}

// ── Auth gate ──────────────────────────────────────────────────
export function OperatorDashboard() {
  const [isAuth, setIsAuth] = useState(isAdminAuthenticated());

  if (!isAuth) {
    return <AdminLogin onSuccess={() => setIsAuth(true)} />;
  }

  return (
    <OperatorDashboardInner
      onLogout={() => {
        logoutAdmin();
        setIsAuth(false);
      }}
    />
  );
}

// ── Main dashboard ─────────────────────────────────────────────
function OperatorDashboardInner({ onLogout }: { onLogout: () => void }) {
  const { state, updateState } = useSharedState();
  const { messages: chatMessages, deleteMessage, clearAllMessages, suspended: chatSuspended, setSuspended: setChatSuspended } = useSpectatorChat();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(Date.now() / 1000);
  const [bike1MapPos, setBike1MapPos] = useState(0);
  const [bike2MapPos, setBike2MapPos] = useState(0);
  const [bike3MapPos, setBike3MapPos] = useState(0);

  // Compute real map progress from elapsed time / avg lap time
  const bike1RecentLaps = state.lapRecords.filter((r) => r.bikeId === 1).slice(-10);
  const bike1AvgLap = bike1RecentLaps.length > 0 ? bike1RecentLaps.reduce((s, r) => s + r.lapTime, 0) / bike1RecentLaps.length : 0;
  const bike2RecentLaps = state.lapRecords.filter((r) => r.bikeId === 2).slice(-10);
  const bike2AvgLap = bike2RecentLaps.length > 0 ? bike2RecentLaps.reduce((s, r) => s + r.lapTime, 0) / bike2RecentLaps.length : 0;
  const bike3RecentLaps = state.lapRecords.filter((r) => r.bikeId === 3).slice(-10);
  const bike3AvgLap = bike3RecentLaps.length > 0 ? bike3RecentLaps.reduce((s, r) => s + r.lapTime, 0) / bike3RecentLaps.length : 0;
  const bike1Elapsed = state.bike1.lapStartTime !== null ? currentTime - state.bike1.lapStartTime : 0;
  const bike2Elapsed = state.bike2.lapStartTime !== null ? currentTime - state.bike2.lapStartTime : 0;
  const bike3Elapsed = state.bike3.lapStartTime !== null ? currentTime - state.bike3.lapStartTime : 0;
  const bike1Progress = bike1AvgLap > 0 && state.bike1.lapStartTime !== null ? Math.min(0.99, bike1Elapsed / bike1AvgLap) : bike1MapPos;
  const bike2Progress = bike2AvgLap > 0 && state.bike2.lapStartTime !== null ? Math.min(0.99, bike2Elapsed / bike2AvgLap) : bike2MapPos;
  const bike3Progress = bike3AvgLap > 0 && state.bike3.lapStartTime !== null ? Math.min(0.99, bike3Elapsed / bike3AvgLap) : bike3MapPos;
  const [showScoutManager, setShowScoutManager] = useState(false);
  const [showEventSetup, setShowEventSetup] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [showChatMod, setShowChatMod] = useState(false);
  const [selectedScoutHistory, setSelectedScoutHistory] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  // Inline lap-time editor: stores the timestamp of the record being edited + draft value
  const [editingLapTs, setEditingLapTs] = useState<number | null>(null);
  const [editingLapDraft, setEditingLapDraft] = useState("");

  // Event-setup form
  const [setupName, setSetupName] = useState(DEFAULT_EVENT_CONFIG.eventName);
  const [setupDuration, setSetupDuration] = useState("24");
  const [setupCircuit, setSetupCircuit] = useState("2.61");

  // Timer tick
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now() / 1000), 100);
    return () => clearInterval(interval);
  }, []);

  // Simulate GPS
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.bike1.currentRiderId) setBike1MapPos((p) => (p + 0.008) % 1);
      if (state.bike2.currentRiderId) setBike2MapPos((p) => (p + 0.006) % 1);
      if (state.bike3.currentRiderId) setBike3MapPos((p) => (p + 0.007) % 1);
    }, 200);
    return () => clearInterval(interval);
  }, [state.bike1.currentRiderId, state.bike2.currentRiderId, state.bike3.currentRiderId]);

  // ── Keyboard shortcuts ───────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bike1OpsRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bike2OpsRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bike3OpsRef = useRef<any>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      switch (e.key) {
        case "1":
          bike1OpsRef.current?.onCountLap();
          break;
        case "2":
          bike2OpsRef.current?.onCountLap();
          break;
        case "3":
          bike3OpsRef.current?.onCountLap();
          break;
        case "n":
        case "N":
          bike1OpsRef.current?.onNextScout();
          break;
        case "m":
        case "M":
          bike2OpsRef.current?.onNextScout();
          break;
        case ",":
          bike3OpsRef.current?.onNextScout();
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Derived values ───────────────────────────────────────────
  const eventElapsed = currentTime - state.eventStartTime / 1000;
  const eventHours = Math.floor(eventElapsed / 3600);
  const eventMins = Math.floor((eventElapsed % 3600) / 60);
  const eventSecs = Math.floor(eventElapsed % 60);

  const remaining = state.eventConfig
    ? state.eventConfig.startTime + state.eventConfig.durationMs - Date.now()
    : null;
  const progress = state.eventConfig
    ? Math.min(1, (Date.now() - state.eventConfig.startTime) / state.eventConfig.durationMs)
    : 0;
  const circuitKm = state.eventConfig?.circuitLengthKm ?? 2.61;
  const totalLaps = state.bike1.totalLaps + state.bike2.totalLaps + state.bike3.totalLaps;
  const totalDistance = (totalLaps * circuitKm).toFixed(1);

  // ── Bike operations ──────────────────────────────────────────
  const createBikeOps = (bikeKey: "bike1" | "bike2" | "bike3", bikeId: 1 | 2 | 3) => ({
    onStartRide: () => {
      const bike = state[bikeKey];
      if (bike.queue.length === 0) return;
      const [nextId, ...rest] = bike.queue;
      const [firstLaps, ...restLaps] = bike.queuePlannedLaps;
      updateState((prev) => ({
        ...prev,
        [bikeKey]: {
          ...prev[bikeKey],
          currentRiderId: nextId,
          queue: rest,
          queuePlannedLaps: restLaps,
          lapStartTime: Date.now() / 1000,
          currentRiderLapsRemaining: firstLaps ?? 1,
        },
      }));
      const scout = state.scouts.find((s) => s.id === nextId);
      if (scout) toast.success(`${scout.name} démarre sur ${bikeName(bikeId)}`);
    },

    onCountLap: () => {
      const bike = state[bikeKey];
      if (!bike.currentRiderId || bike.lapStartTime === null) return;
      const lapTime = Date.now() / 1000 - bike.lapStartTime;
      const scout = state.scouts.find((s) => s.id === bike.currentRiderId);

      const isTooFast = lapTime < LAP_VALIDATION_THRESHOLDS.tooFastSeconds;
      const isTooSlow = lapTime > LAP_VALIDATION_THRESHOLDS.tooSlowSeconds;

      if (isTooFast) {
        toast.warning(`Tour très rapide (${formatTimeFull(lapTime)}) !`, {
          description: "Vérifiez le comptage — tour enregistré",
        });
      } else if (isTooSlow) {
        toast.warning(`Tour très lent (${formatTimeFull(lapTime)})`, {
          description: "Tour enregistré — vérifiez le cycliste",
        });
      }

      if (soundEnabled) {
        if (isTooFast || isTooSlow) {
          playBeep(300, 300);
        } else {
          const bestForScout = state.lapRecords
            .filter((r) => r.scoutId === bike.currentRiderId)
            .reduce((min, r) => Math.min(min, r.lapTime), Infinity);
          if (lapTime < bestForScout) {
            playBeep(1200, 80, 2);
          } else {
            playBeep(880, 100);
          }
        }
      }

      const flagKey = `${Date.now()}-${bikeId}`;

      updateState((prev) => {
        const sysMsg: CommentaryMessage[] = scout
          ? [
              ...prev.commentary,
              {
                id: crypto.randomUUID(),
                text: `${scout.name} boucle un tour en ${formatTimeFull(lapTime)} (${bikeShortLabel(bikeId)})`,
                timestamp: Date.now(),
                type: "system",
              },
            ]
          : prev.commentary;

        return {
          ...prev,
          [bikeKey]: {
            ...prev[bikeKey],
            lapStartTime: Date.now() / 1000,
            totalLaps: prev[bikeKey].totalLaps + 1,
            currentRiderLapsRemaining: Math.max(0, prev[bikeKey].currentRiderLapsRemaining - 1),
          },
          lapRecords: scout
            ? [
                ...prev.lapRecords,
                {
                  scoutId: scout.id,
                  scoutName: scout.name,
                  troupe: scout.troupe,
                  bikeId,
                  lapTime,
                  timestamp: Date.now(),
                },
              ]
            : prev.lapRecords,
          lapFlags: {
            ...prev.lapFlags,
            [flagKey]: {
              type: isTooFast ? "too-fast" : isTooSlow ? "too-slow" : "valid",
              threshold: isTooFast
                ? LAP_VALIDATION_THRESHOLDS.tooFastSeconds
                : isTooSlow
                  ? LAP_VALIDATION_THRESHOLDS.tooSlowSeconds
                  : undefined,
            },
          },
          commentary: sysMsg,
        };
      });

      if (bikeId === 1) setBike1MapPos(0);
      else if (bikeId === 2) setBike2MapPos(0);
      else setBike3MapPos(0);

      if (scout && !isTooFast && !isTooSlow) {
        toast(`Tour: ${formatTimeFull(lapTime)}`, {
          description: `${scout.name} - ${bikeName(bikeId)}`,
        });
      }
    },

    onNextScout: () => {
      const bike = state[bikeKey];
      if (!bike.currentRiderId) return;

      let lapTime = 0;
      let isTooFast = false;
      let isTooSlow = false;
      const scout = state.scouts.find((s) => s.id === bike.currentRiderId);
      if (bike.lapStartTime !== null) {
        lapTime = Date.now() / 1000 - bike.lapStartTime;
        if (lapTime > 5) {
          isTooFast = lapTime < LAP_VALIDATION_THRESHOLDS.tooFastSeconds;
          isTooSlow = lapTime > LAP_VALIDATION_THRESHOLDS.tooSlowSeconds;
          if (isTooFast) {
            toast.warning(`Tour très rapide au relais (${formatTimeFull(lapTime)}) !`, { description: "Tour enregistré" });
          } else if (isTooSlow) {
            toast.warning(`Tour très lent au relais (${formatTimeFull(lapTime)})`, { description: "Tour enregistré" });
          }
          if (soundEnabled) {
            if (isTooFast || isTooSlow) playBeep(300, 300);
            else playBeep(880, 100);
          }
        }
      }

      const flagKey = `${Date.now()}-${bikeId}`;

      updateState((prev) => {
        const currentBike = prev[bikeKey];
        const shouldCountLap = currentBike.lapStartTime !== null && lapTime > 5 && scout;
        const newLapRecord = shouldCountLap
          ? {
              scoutId: scout.id,
              scoutName: scout.name,
              troupe: scout.troupe,
              bikeId,
              lapTime,
              timestamp: Date.now(),
            }
          : null;
        const newCommentary =
          shouldCountLap
            ? [
                ...prev.commentary,
                {
                  id: crypto.randomUUID(),
                  text: `${scout.name} passe le relais après ${formatTimeFull(lapTime)} (${bikeShortLabel(bikeId)})`,
                  timestamp: Date.now(),
                  type: "system" as const,
                },
              ]
            : prev.commentary;

        if (currentBike.queue.length > 0) {
          const [nextId, ...rest] = currentBike.queue;
          const [nextLaps, ...restLaps] = currentBike.queuePlannedLaps;
          const nextScout = prev.scouts.find((s) => s.id === nextId);
          if (nextScout) {
            toast.success(`${nextScout.name} prend le relais sur ${bikeName(bikeId)}`);
          }
          return {
            ...prev,
            [bikeKey]: {
              ...currentBike,
              currentRiderId: nextId,
              queue: rest,
              queuePlannedLaps: restLaps,
              lapStartTime: Date.now() / 1000,
              totalLaps: shouldCountLap ? currentBike.totalLaps + 1 : currentBike.totalLaps,
              currentRiderLapsRemaining: nextLaps ?? 1,
            },
            lapRecords: newLapRecord ? [...prev.lapRecords, newLapRecord] : prev.lapRecords,
            lapFlags: shouldCountLap
              ? { ...prev.lapFlags, [flagKey]: { type: isTooFast ? "too-fast" : isTooSlow ? "too-slow" : "valid" } }
              : prev.lapFlags,
            commentary: newCommentary,
          };
        } else {
          toast.info(`${bikeName(bikeId)}: plus personne dans la file`);
          return {
            ...prev,
            [bikeKey]: {
              ...currentBike,
              currentRiderId: null,
              lapStartTime: null,
              totalLaps: shouldCountLap ? currentBike.totalLaps + 1 : currentBike.totalLaps,
              currentRiderLapsRemaining: 0,
            },
            lapRecords: newLapRecord ? [...prev.lapRecords, newLapRecord] : prev.lapRecords,
            lapFlags: shouldCountLap
              ? { ...prev.lapFlags, [flagKey]: { type: isTooFast ? "too-fast" : isTooSlow ? "too-slow" : "valid" } }
              : prev.lapFlags,
            commentary: newCommentary,
          };
        }
      });
      if (bikeId === 1) setBike1MapPos(0);
      else if (bikeId === 2) setBike2MapPos(0);
      else setBike3MapPos(0);
    },

    onAddToQueue: (scoutId: string) => {
      updateState((prev) => ({
        ...prev,
        [bikeKey]: {
          ...prev[bikeKey],
          queue: [...prev[bikeKey].queue, scoutId],
          queuePlannedLaps: [...prev[bikeKey].queuePlannedLaps, 1],
        },
      }));
    },
    onRemoveFromQueue: (index: number) => {
      updateState((prev) => {
        const queue = [...prev[bikeKey].queue];
        const laps = [...prev[bikeKey].queuePlannedLaps];
        queue.splice(index, 1);
        laps.splice(index, 1);
        return { ...prev, [bikeKey]: { ...prev[bikeKey], queue, queuePlannedLaps: laps } };
      });
    },
    onMoveInQueue: (index: number, direction: "up" | "down") => {
      updateState((prev) => {
        const queue = [...prev[bikeKey].queue];
        const laps = [...prev[bikeKey].queuePlannedLaps];
        const swapIdx = direction === "up" ? index - 1 : index + 1;
        if (swapIdx < 0 || swapIdx >= queue.length) return prev;
        [queue[index], queue[swapIdx]] = [queue[swapIdx], queue[index]];
        [laps[index], laps[swapIdx]] = [laps[swapIdx], laps[index]];
        return { ...prev, [bikeKey]: { ...prev[bikeKey], queue, queuePlannedLaps: laps } };
      });
    },
    onSetPlannedLaps: (index: number, lapsCount: number) => {
      updateState((prev) => {
        const laps = [...prev[bikeKey].queuePlannedLaps];
        laps[index] = lapsCount;
        return { ...prev, [bikeKey]: { ...prev[bikeKey], queuePlannedLaps: laps } };
      });
    },
    onSetCurrentRiderLaps: (laps: number) => {
      updateState((prev) => ({
        ...prev,
        [bikeKey]: {
          ...prev[bikeKey],
          currentRiderLapsRemaining: Math.max(0, laps),
        },
      }));
    },
  });

  const bike1Ops = createBikeOps("bike1", 1);
  const bike2Ops = createBikeOps("bike2", 2);
  const bike3Ops = createBikeOps("bike3", 3);
  bike1OpsRef.current = bike1Ops;
  bike2OpsRef.current = bike2Ops;
  bike3OpsRef.current = bike3Ops;

  // ── Handlers (stable refs for ScoutManager memo) ────────────
  const stateRef = useRef(state);
  stateRef.current = state;

  const handleAddScout = useCallback((scout: Scout) => {
    updateState((prev) => ({ ...prev, scouts: [...prev.scouts, scout] }));
  }, [updateState]);
  const handleImportScouts = useCallback((newScouts: Scout[]) => {
    updateState((prev) => ({ ...prev, scouts: [...prev.scouts, ...newScouts] }));
    toast.success(`${newScouts.length} personnes importées`);
  }, [updateState]);
  const handleRemoveScout = useCallback((id: string) => {
    const st = stateRef.current;
    const isRiding = st.bike1.currentRiderId === id || st.bike2.currentRiderId === id || st.bike3.currentRiderId === id;
    const isInQueue = st.bike1.queue.includes(id) || st.bike2.queue.includes(id) || st.bike3.queue.includes(id);
    if (isRiding) {
      toast.error("Ce scout est en train de rouler ! Passez le relais d'abord.");
      return;
    }
    if (isInQueue) {
      if (!window.confirm("Ce scout est dans une file d'attente. Le retirer de la file ET le supprimer ?")) return;
    }
    updateState((prev) => {
      const removeFromBike = (bike: typeof prev.bike1) => {
        const indices = bike.queue.reduce<number[]>((acc, qId, i) => qId === id ? [...acc, i] : acc, []);
        if (indices.length === 0) return bike;
        const queue = bike.queue.filter((_, i) => !indices.includes(i));
        const laps = bike.queuePlannedLaps.filter((_, i) => !indices.includes(i));
        return { ...bike, queue, queuePlannedLaps: laps };
      };
      return {
        ...prev,
        scouts: prev.scouts.filter((s) => s.id !== id),
        bike1: removeFromBike(prev.bike1),
        bike2: removeFromBike(prev.bike2),
        bike3: removeFromBike(prev.bike3),
      };
    });
    toast.success("Scout supprime");
  }, [updateState]);
  const handleUpdateScout = useCallback((id: string, updates: Partial<Pick<Scout, "name" | "troupe" | "role">>) => {
    updateState((prev) => ({
      ...prev,
      scouts: prev.scouts.map((s) => s.id === id ? { ...s, ...updates } : s),
    }));
  }, [updateState]);
  const handleReset = () => {
    if (window.confirm("CONFIRMATION REQUISE\n\nRéinitialiser toutes les données de course ?\n\n\u2022 Tours, temps, commentaires : supprimés\n\u2022 Scouts importés : conservés\n\u2022 Configuration event : réinitialisée")) {
      updateState((prev) => ({
        ...prev,
        bike1: INITIAL_BIKE_STATE,
        bike2: INITIAL_BIKE_STATE,
        bike3: INITIAL_BIKE_STATE,
        lapRecords: [],
        eventStartTime: Date.now(),
        commentary: [],
        lapFlags: {},
        raceStarted: false,
        eventConfig: DEFAULT_EVENT_CONFIG,
      }));
      setBike1MapPos(0);
      setBike2MapPos(0);
      setBike3MapPos(0);
      toast.success("Course réinitialisée");
    }
  };

  // Backup JSON
  const handleBackup = () => {
    const now = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    const filename = `sp51_backup_${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}_${p(now.getHours())}${p(now.getMinutes())}.json`;
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup JSON sauvegardé");
  };

  // Export Excel
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const lapsData = state.lapRecords.map((r) => ({
      Heure: new Date(r.timestamp).toLocaleTimeString("fr-BE"),
      Cycliste: r.scoutName,
      Troupe: r.troupe,
      "Vélo": bikeName(r.bikeId),
      "Temps (s)": Math.round(r.lapTime * 10) / 10,
      Temps: formatTimeFull(r.lapTime),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lapsData), "Tours");

    const bestMap = new Map<string, { name: string; troupe: string; best: number; total: number; count: number }>();
    state.lapRecords.forEach((r) => {
      const e = bestMap.get(r.scoutId);
      if (e) {
        e.best = Math.min(e.best, r.lapTime);
        e.total += r.lapTime;
        e.count++;
      } else {
        bestMap.set(r.scoutId, { name: r.scoutName, troupe: r.troupe, best: r.lapTime, total: r.lapTime, count: 1 });
      }
    });
    const ranking = Array.from(bestMap.values())
      .sort((a, b) => a.best - b.best)
      .map((d, i) => ({
        Position: i + 1,
        Cycliste: d.name,
        Troupe: d.troupe,
        "Meilleur Tour": formatTimeFull(d.best),
        "Temps Moyen": formatTimeFull(d.total / d.count),
        "Nb Tours": d.count,
      }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ranking), "Classement");

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(state.scouts.map((s) => ({ Nom: s.name, Troupe: s.troupe, "Rôle": s.role }))),
      "Scouts",
    );

    XLSX.writeFile(wb, `sp51_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Export Excel généré");
  };

  // Commentary
  const handleAddCommentary = () => {
    if (!commentText.trim()) return;
    updateState((prev) => ({
      ...prev,
      commentary: [
        ...prev.commentary,
        { id: crypto.randomUUID(), text: commentText.trim(), timestamp: Date.now(), type: "manual" as const },
      ],
    }));
    setCommentText("");
    toast.success("Message envoyé");
  };

  // Event config save
  const handleSaveEventConfig = () => {
    updateState((prev) => ({
      ...prev,
      raceStarted: true,
      eventConfig: {
        eventName: setupName || DEFAULT_EVENT_CONFIG.eventName,
        startTime: prev.raceStarted ? prev.eventStartTime : Date.now(),
        durationMs: (parseFloat(setupDuration) || 24) * 3600000,
        circuitLengthKm: parseFloat(setupCircuit) || 2.61,
      },
      // Only reset start time on first launch, preserve it on reconfigure
      eventStartTime: prev.raceStarted ? prev.eventStartTime : Date.now(),
    }));
    setShowEventSetup(false);
    toast.success(state.raceStarted ? "Configuration sauvegardée !" : "Course lancée ! Bonne chance à tous !");
  };

  const handleUpdateLapTime = (timestamp: number, draft: string) => {
    // Accept MM:SS or M:SS or raw seconds
    const parts = draft.trim().split(":");
    let secs = 0;
    if (parts.length === 2) {
      secs = parseInt(parts[0]) * 60 + parseFloat(parts[1]);
    } else if (parts.length === 1 && draft.trim() !== "") {
      secs = parseFloat(draft.trim());
    }
    if (secs > 0) {
      updateState((prev) => ({
        ...prev,
        lapRecords: prev.lapRecords.map((r) =>
          r.timestamp === timestamp ? { ...r, lapTime: secs } : r
        ),
      }));
      toast.success("Temps modifié");
    }
    setEditingLapTs(null);
  };

  const handleLaunchRace = () => {
    updateState((prev) => ({
      ...prev,
      raceStarted: true,
      eventConfig: {
        eventName: setupName || DEFAULT_EVENT_CONFIG.eventName,
        startTime: Date.now(),
        durationMs: (parseFloat(setupDuration) || 24) * 3600000,
        circuitLengthKm: parseFloat(setupCircuit) || 2.61,
      },
      eventStartTime: Date.now(),
    }));
    toast.success("Course lancée ! Bonne chance à tous !");
  };

  const rider1 = state.scouts.find((s) => s.id === state.bike1.currentRiderId);
  const rider2 = state.scouts.find((s) => s.id === state.bike2.currentRiderId);
  const rider3 = state.scouts.find((s) => s.id === state.bike3.currentRiderId);

  // ── Charts data ──────────────────────────────────────────────
  const cumulativeData = (() => {
    if (state.lapRecords.length === 0) return [];
    let b1 = 0, b2 = 0, b3 = 0;
    return state.lapRecords.map((r) => {
      if (r.bikeId === 1) b1++;
      else if (r.bikeId === 2) b2++;
      else b3++;
      return { time: Math.round((r.timestamp - state.eventStartTime) / 60000), bike1: b1, bike2: b2, bike3: b3 };
    });
  })();

  const hourlyData = (() => {
    const hours: Record<number, number> = {};
    state.lapRecords.forEach((r) => {
      const h = new Date(r.timestamp).getHours();
      hours[h] = (hours[h] || 0) + 1;
    });
    return Object.entries(hours)
      .map(([h, count]) => ({ hour: `${h}h`, tours: count }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
  })();

  const lapDistData = (() => {
    const b: Record<string, number> = { "< 3min": 0, "3-5min": 0, "5-8min": 0, "8-12min": 0, "12-20min": 0, "> 20min": 0 };
    state.lapRecords.forEach((r) => {
      const m = r.lapTime / 60;
      if (m < 3) b["< 3min"]++;
      else if (m < 5) b["3-5min"]++;
      else if (m < 8) b["5-8min"]++;
      else if (m < 12) b["8-12min"]++;
      else if (m < 20) b["12-20min"]++;
      else b["> 20min"]++;
    });
    return Object.entries(b).map(([range, count]) => ({ range, count }));
  })();

  // Scout history
  const scoutHistoryData = selectedScoutHistory ? state.lapRecords.filter((r) => r.scoutId === selectedScoutHistory) : [];
  const scoutHistoryName = selectedScoutHistory
    ? (state.scouts.find((s) => s.id === selectedScoutHistory)?.name ??
       state.lapRecords.find((r) => r.scoutId === selectedScoutHistory)?.scoutName ??
       "Inconnu")
    : "";

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="dark min-h-screen bg-[#0a0a0a] text-[#ededed] font-['Inter']">
      <Toaster position="top-center" theme="dark" richColors />

      {/* ── Event Setup Dialog ──────────────────────────────── */}
      {showEventSetup && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111] border border-[#333] rounded-lg p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-white uppercase tracking-widest mb-1">Configuration</h2>
            <p className="text-[10px] text-[#888] uppercase tracking-widest mb-6">Paramétrez avant le départ</p>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-[#888] uppercase tracking-widest block mb-1">Nom de l'événement</label>
                <input
                  type="text"
                  value={setupName}
                  onChange={(e) => setSetupName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded text-sm text-white outline-none focus:border-[#666]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-[#888] uppercase tracking-widest block mb-1">Durée (heures)</label>
                  <input
                    type="number"
                    value={setupDuration}
                    onChange={(e) => setSetupDuration(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded text-sm text-white outline-none focus:border-[#666]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#888] uppercase tracking-widest block mb-1">Circuit (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={setupCircuit}
                    onChange={(e) => setSetupCircuit(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded text-sm text-white outline-none focus:border-[#666]"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveEventConfig}
                className="flex-1 px-4 py-2.5 bg-[#22c55e] text-black text-xs font-bold uppercase tracking-widest rounded hover:bg-[#16a34a] transition-colors"
              >
                Démarrer le Chrono
              </button>
              {state.eventConfig && (
                <button
                  onClick={() => setShowEventSetup(false)}
                  className="px-4 py-2.5 bg-[#222] border border-[#333] text-white text-xs uppercase tracking-widest rounded hover:bg-[#333] transition-colors"
                >
                  Annuler
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Scout History Dialog ────────────────────────────── */}
      {selectedScoutHistory && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedScoutHistory(null)}
        >
          <div
            className="bg-[#111] border border-[#333] rounded-lg p-6 w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-widest">{scoutHistoryName}</h2>
                <p className="text-[10px] text-[#888] uppercase tracking-widest mt-1">
                  {scoutHistoryData.length} tours enregistrés
                </p>
              </div>
              <button onClick={() => setSelectedScoutHistory(null)} className="text-[#666] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {scoutHistoryData.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-[#0a0a0a] border border-[#222] rounded p-2 text-center">
                  <div className="text-[9px] text-[#888] uppercase tracking-widest">Meilleur</div>
                  <div className="font-['Roboto_Mono'] text-[#22c55e] font-bold mt-1">
                    {formatTimeFull(Math.min(...scoutHistoryData.map((r) => r.lapTime)))}
                  </div>
                </div>
                <div className="bg-[#0a0a0a] border border-[#222] rounded p-2 text-center">
                  <div className="text-[9px] text-[#888] uppercase tracking-widest">Moyenne</div>
                  <div className="font-['Roboto_Mono'] text-[#3b82f6] font-bold mt-1">
                    {formatTimeFull(scoutHistoryData.reduce((s, r) => s + r.lapTime, 0) / scoutHistoryData.length)}
                  </div>
                </div>
                <div className="bg-[#0a0a0a] border border-[#222] rounded p-2 text-center">
                  <div className="text-[9px] text-[#888] uppercase tracking-widest">Nb Tours</div>
                  <div className="font-['Roboto_Mono'] text-white font-bold mt-1">{scoutHistoryData.length}</div>
                </div>
              </div>
            )}

            <div className="space-y-1">
              {(() => {
                const best = scoutHistoryData.length > 0 ? Math.min(...scoutHistoryData.map((x) => x.lapTime)) : Infinity;
                return scoutHistoryData.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-1.5 bg-[#0a0a0a] border border-[#222] rounded text-[11px]"
                  >
                    <span className="font-['Roboto_Mono'] text-[#888]">
                      {new Date(r.timestamp).toLocaleTimeString("fr-BE")}
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold font-['Roboto_Mono'] text-black"
                      style={{ backgroundColor: getBikeColor(r.bikeId) }}
                    >
                      {bikeShortLabel(r.bikeId)}
                    </span>
                    <span
                      className={`font-['Roboto_Mono'] font-bold ${r.lapTime === best ? "text-[#a855f7]" : "text-[#22c55e]"}`}
                    >
                      {formatTimeFull(r.lapTime)}
                    </span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── Chat Moderation Panel (side drawer) ────────────── */}
      {showChatMod && (
        <div
          className="fixed inset-0 z-[2000] flex justify-end bg-black/60"
          onClick={() => setShowChatMod(false)}
        >
          <div
            className="bg-[#111] border-l border-[#333] w-full max-w-md shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#222] bg-[#151515] flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-[#e11d48] p-1.5 rounded">
                    <MessageSquare className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest">Modération Chat</h2>
                    <p className="text-[10px] text-[#888] uppercase tracking-widest mt-0.5">
                      {chatMessages.length} message{chatMessages.length !== 1 ? "s" : ""} en direct
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowChatMod(false)} className="text-[#666] hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Actions bar */}
            <div className="px-5 py-2 border-b border-[#222] bg-[#0d0d0d] flex items-center justify-between flex-shrink-0">
              <span className="text-[9px] text-[#666] uppercase tracking-widest font-['Roboto_Mono']">
                {chatSuspended ? "Chat suspendu" : "Survolez un message pour le supprimer"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setChatSuspended(!chatSuspended);
                    toast.success(chatSuspended ? "Chat réactivé" : "Chat suspendu");
                  }}
                  className={`px-2.5 py-1 border rounded text-[9px] uppercase tracking-widest transition-colors flex items-center gap-1.5 ${
                    chatSuspended
                      ? "bg-[#052e16] hover:bg-[#14532d] border-[#14532d] text-[#22c55e] hover:text-white"
                      : "bg-[#451a03] hover:bg-[#7c2d12] border-[#7c2d12] text-[#f97316] hover:text-white"
                  }`}
                >
                  {chatSuspended ? "Réactiver" : "Suspendre"}
                </button>
                {chatMessages.length > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm("Supprimer TOUS les messages du chat ?")) {
                        clearAllMessages();
                        toast.success("Chat vidé");
                      }
                    }}
                    className="px-2.5 py-1 bg-[#450a0a] hover:bg-[#7f1d1d] border border-[#7f1d1d] rounded text-[9px] uppercase tracking-widest text-[#ef4444] hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3 h-3" />
                    Tout vider
                  </button>
                )}
              </div>
            </div>

            {/* Messages list */}
            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-[#555]">
                  <MessageSquare className="w-8 h-8 opacity-30" />
                  <span className="text-[10px] uppercase tracking-widest">Aucun message</span>
                </div>
              ) : (
                <div className="divide-y divide-[#1a1a1a]">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="flex items-start gap-3 px-5 py-3 group hover:bg-[#0a0a0a] transition-colors relative"
                    >
                      {/* Avatar */}
                      <div className="w-7 h-7 rounded-full bg-[#222] border border-[#333] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[9px] font-bold text-[#888] uppercase">
                          {msg.author.substring(0, 2)}
                        </span>
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[11px] font-bold text-[#e2a03f]">{msg.author}</span>
                          <span className="text-[8px] text-[#555] font-['Roboto_Mono']">
                            {new Date(msg.timestamp).toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </span>
                        </div>
                        <div className="text-[12px] text-[#ccc] break-words leading-relaxed">{msg.text}</div>
                      </div>
                      {/* Delete button */}
                      <button
                        onClick={() => {
                          deleteMessage(msg.id);
                          toast.success("Message supprimé");
                        }}
                        className="p-1.5 rounded bg-transparent hover:bg-red-900/40 text-[#444] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0 mt-0.5"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-[#222] bg-[#0d0d0d] flex-shrink-0">
              <div className="text-[9px] text-[#555] uppercase tracking-widest font-['Roboto_Mono'] text-center">
                Les messages supprimés disparaissent pour tous les spectateurs
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="bg-[#111] border-b border-[#222] px-4 md:px-6 py-2 sticky top-0 z-20">
        <div className="max-w-[1800px] mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="bg-[#e11d48] text-white p-1.5 rounded-md shadow-[0_0_10px_rgba(225,29,72,0.5)]">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-widest uppercase text-white m-0 leading-none">
                {state.eventConfig?.eventName ?? "Contrôle de Course"}
              </h1>
              <div className="text-[10px] uppercase tracking-widest text-[#888] mt-1">
                SAINT-PAUL 51 &bull; UNGAVA/ARGAPURA
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 md:gap-5">
            {remaining !== null && remaining > 0 && (
              <>
                <div className="flex flex-col items-end">
                  <div className="text-[10px] uppercase tracking-widest text-[#888]">Restant</div>
                  <div className="font-['Roboto_Mono'] text-lg font-bold text-[#e11d48] leading-none mt-1">
                    {formatDuration(remaining)}
                  </div>
                </div>
                <div className="w-px h-8 bg-[#333] hidden md:block" />
              </>
            )}

            <div className="flex flex-col items-end">
              <div className="text-[10px] uppercase tracking-widest text-[#888]">Écoulé</div>
              <div className="font-['Roboto_Mono'] text-lg font-bold text-[#22c55e] leading-none mt-1">
                {String(eventHours).padStart(2, "0")}:{String(eventMins).padStart(2, "0")}:
                {String(eventSecs).padStart(2, "0")}
              </div>
            </div>

            <div className="w-px h-8 bg-[#333] hidden md:block" />

            <div className="flex flex-col items-end">
              <div className="text-[10px] uppercase tracking-widest text-[#888]">Distance</div>
              <div className="font-['Roboto_Mono'] text-lg font-bold text-white leading-none mt-1">
                {totalDistance} <span className="text-xs text-[#888]">km</span>
              </div>
            </div>

            <div className="w-px h-8 bg-[#333] hidden md:block" />

            <div className="flex flex-col items-end">
              <div className="text-[10px] uppercase tracking-widest text-[#888]">Tours</div>
              <div className="font-['Roboto_Mono'] text-lg font-bold text-white leading-none mt-1">{totalLaps}</div>
            </div>

            <div className="w-px h-8 bg-[#333] hidden md:block" />

            {/* Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => navigate("/")}
                className="px-3 py-1.5 bg-[#222] hover:bg-[#333] border border-[#333] rounded text-[10px] uppercase tracking-widest transition-colors flex items-center gap-1.5 text-white"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Spectateur</span>
              </button>
              <button
                onClick={() => setShowScoutManager(!showScoutManager)}
                className="px-3 py-1.5 bg-[#222] hover:bg-[#333] border border-[#333] rounded text-[10px] uppercase tracking-widest transition-colors text-white"
              >
                Effectifs
              </button>
              <button
                onClick={() => setShowChatMod(true)}
                title="Modération Chat"
                className="p-1.5 bg-[#222] hover:bg-[#333] border border-[#333] rounded text-[#888] hover:text-white transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              <button
                onClick={handleBackup}
                title="Backup JSON"
                className="p-1.5 bg-[#222] hover:bg-[#333] border border-[#333] rounded text-white transition-colors"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={handleExportExcel}
                title="Export Excel"
                className="p-1.5 bg-[#222] hover:bg-[#333] border border-[#333] rounded text-white transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? "Son activé" : "Son désactivé"}
                className={`p-1.5 border rounded transition-colors ${soundEnabled ? "bg-[#22c55e]/20 border-[#22c55e]/50 text-[#22c55e]" : "bg-[#222] border-[#333] text-[#888]"}`}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setShowCharts(!showCharts)}
                title="Graphiques"
                className={`p-1.5 border rounded transition-colors ${showCharts ? "bg-[#3b82f6]/20 border-[#3b82f6]/50 text-[#3b82f6]" : "bg-[#222] border-[#333] text-[#888]"}`}
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowEventSetup(true)}
                title="Configuration"
                className="p-1.5 bg-[#222] hover:bg-[#333] border border-[#333] rounded text-[#888] hover:text-white transition-colors"
              >
                <Settings2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleReset}
                title="Réinitialiser"
                className="p-1.5 bg-[#450a0a] hover:bg-[#7f1d1d] border border-[#7f1d1d] rounded text-white transition-colors"
              >
                <ShieldAlert className="w-4 h-4" />
              </button>
              <button
                onClick={onLogout}
                title="Déconnexion"
                className="p-1.5 bg-[#222] hover:bg-[#333] border border-[#333] rounded text-[#888] hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      {state.eventConfig && (
        <div className="h-[3px] bg-[#111] w-full">
          <div
            className="h-full bg-gradient-to-r from-[#e11d48] to-[#22c55e] transition-all duration-1000"
            style={{ width: `${Math.min(100, progress * 100)}%` }}
          />
        </div>
      )}

      {/* Keyboard shortcuts bar */}
      <div className="bg-[#0a0a0a] border-b border-[#222] px-4 py-1 flex items-center justify-center gap-4 text-[9px] text-[#555] uppercase tracking-widest font-['Roboto_Mono']">
        <span>
          <kbd className="text-[#888] bg-[#222] px-1 rounded">1</kbd> Tour V1
        </span>
        <span>
          <kbd className="text-[#888] bg-[#222] px-1 rounded">2</kbd> Tour V2
        </span>
        <span>
          <kbd className="text-[#888] bg-[#222] px-1 rounded">3</kbd> Tour VPi
        </span>
        <span>
          <kbd className="text-[#888] bg-[#222] px-1 rounded">N</kbd> Relais V1
        </span>
        <span>
          <kbd className="text-[#888] bg-[#222] px-1 rounded">M</kbd> Relais V2
        </span>
        <span>
          <kbd className="text-[#888] bg-[#222] px-1 rounded">,</kbd> Relais VPi
        </span>
      </div>

      {/* ── Main content ───────────────────────────────────── */}
      <main className="max-w-[1800px] mx-auto p-4 space-y-4">
        {/* Race control bar — visible uniquement avant le lancement */}
        {!state.raceStarted && (
          <div className="bg-[#111] rounded-md border border-[#222] p-3 flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-[#888] uppercase tracking-widest">Course pas encore lancee</div>
              <div className="text-xs text-[#555] mt-0.5">Configurez l'evenement et lancez le chrono</div>
            </div>
            <button
              onClick={() => setShowEventSetup(true)}
              className="px-5 py-2.5 bg-[#22c55e] text-black text-xs font-bold uppercase tracking-widest rounded hover:bg-[#16a34a] transition-colors shadow-lg shadow-green-900/30 flex items-center gap-2"
            >
              <Settings2 className="w-4 h-4" />
              Configurer et Lancer
            </button>
          </div>
        )}

        {/* Scout manager panel */}
        {showScoutManager && (
          <div className="mb-6 p-4 bg-[#111] border border-[#222] rounded-md shadow-xl">
            <h2 className="text-xs uppercase tracking-widest text-[#888] mb-4">Gestion des Effectifs</h2>
            <ScoutManager
              scouts={state.scouts}
              onAddScout={handleAddScout}
              onRemoveScout={handleRemoveScout}
              onImportScouts={handleImportScouts}
              onUpdateScout={handleUpdateScout}
            />
          </div>
        )}

        {/* 3 bike queues */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          <div className="shadow-lg shadow-green-900/5">
            <BikeQueue
              bikeId={1}
              bikeState={state.bike1}
              scouts={state.scouts}
              currentTime={currentTime}
              color={BIKE1_COLOR}
              lapRecords={state.lapRecords}
              {...bike1Ops}
            />
          </div>
          <div className="shadow-lg shadow-orange-900/5">
            <BikeQueue
              bikeId={2}
              bikeState={state.bike2}
              scouts={state.scouts}
              currentTime={currentTime}
              color={BIKE2_COLOR}
              lapRecords={state.lapRecords}
              {...bike2Ops}
            />
          </div>
          <div className="shadow-lg shadow-red-900/5">
            <BikeQueue
              bikeId={3}
              bikeState={state.bike3}
              scouts={state.scouts}
              currentTime={currentTime}
              color={BIKE3_COLOR}
              lapRecords={state.lapRecords}
              {...bike3Ops}
            />
          </div>
        </div>

        {/* Map + Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Map */}
          <div className="hidden md:flex bg-[#111] rounded-md border border-[#222] overflow-hidden flex-col max-h-[380px]">
            <div className="px-4 py-2 border-b border-[#222] flex items-center justify-between bg-[#151515] flex-shrink-0">
              <h2 className="text-xs uppercase tracking-widest text-[#888] font-bold">Télémétrie Piste</h2>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: BIKE1_COLOR, opacity: rider1 ? 1 : 0.3 }} />
                  <span className="text-[10px] uppercase font-['Roboto_Mono'] text-[#ccc]">V1</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: BIKE2_COLOR, opacity: rider2 ? 1 : 0.3 }} />
                  <span className="text-[10px] uppercase font-['Roboto_Mono'] text-[#ccc]">V2</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: BIKE3_COLOR, opacity: rider3 ? 1 : 0.3 }} />
                  <span className="text-[10px] uppercase font-['Roboto_Mono'] text-[#ccc]">VPi</span>
                </div>
              </div>
            </div>
            <div className="p-4 bg-[#050505] min-h-[250px] flex items-center justify-center relative">
              <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "20px 20px" }}
              />
              <CircuitSVG
                bike1Progress={bike1Progress}
                bike2Progress={bike2Progress}
                bike3Progress={bike3Progress}
                bike1Active={!!rider1}
                bike2Active={!!rider2}
                bike3Active={!!rider3}
                bike1Rider={rider1?.name}
                bike2Rider={rider2?.name}
                bike3Rider={rider3?.name}
                dark
              />
            </div>
          </div>

          {/* Leaderboard */}
          <div className="bg-[#111] rounded-md border border-[#222] p-4 shadow-lg shadow-black/50">
            <h2 className="text-xs uppercase tracking-widest text-[#888] font-bold mb-3">Classements Généraux</h2>
            <Leaderboard lapRecords={state.lapRecords} scouts={state.scouts} />
          </div>
        </div>

        {/* ── Commentary input ─────────────────────────────── */}
        <div className="bg-[#111] rounded-md border border-[#222] p-3 flex items-center gap-3">
          <MessageSquare className="w-4 h-4 text-[#888] shrink-0" />
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddCommentary()}
            placeholder="Message de commentaire en direct..."
            className="flex-1 px-3 py-1.5 bg-[#0a0a0a] border border-[#222] rounded text-xs text-[#ddd] outline-none focus:border-[#666] placeholder:text-[#555]"
          />
          <button
            onClick={handleAddCommentary}
            disabled={!commentText.trim()}
            className="px-4 py-1.5 bg-[#eab308] text-black text-[10px] font-bold uppercase tracking-widest rounded hover:bg-[#ca8a04] transition-colors disabled:opacity-30"
          >
            Envoyer
          </button>
        </div>

        {/* ── Charts ───────────────────────────────────────── */}
        {showCharts && state.lapRecords.length > 0 && (
          <div className="bg-[#111] rounded-md border border-[#222] p-4">
            <h2 className="text-xs uppercase tracking-widest text-[#888] font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Statistiques
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Cumulative laps */}
              <div className="bg-[#0a0a0a] border border-[#222] rounded p-3">
                <div className="text-[10px] text-[#888] uppercase tracking-widest mb-2">Tours cumulés</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={cumulativeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis
                      dataKey="time"
                      stroke="#666"
                      tick={{ fontSize: 9 }}
                      label={{ value: "min", position: "insideBottomRight", offset: -5, fill: "#666", fontSize: 9 }}
                    />
                    <YAxis stroke="#666" tick={{ fontSize: 9 }} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "#111", border: "1px solid #333", fontSize: 11 }}
                    />
                    <Line type="monotone" dataKey="bike1" stroke={BIKE1_COLOR} strokeWidth={2} dot={false} name="Vélo 1" />
                    <Line type="monotone" dataKey="bike2" stroke={BIKE2_COLOR} strokeWidth={2} dot={false} name="Vélo 2" />
                    <Line type="monotone" dataKey="bike3" stroke={BIKE3_COLOR} strokeWidth={2} dot={false} name={"Vélo Pi"} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Hourly distribution */}
              <div className="bg-[#0a0a0a] border border-[#222] rounded p-3">
                <div className="text-[10px] text-[#888] uppercase tracking-widest mb-2">Tours par heure</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="hour" stroke="#666" tick={{ fontSize: 9 }} />
                    <YAxis stroke="#666" tick={{ fontSize: 9 }} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "#111", border: "1px solid #333", fontSize: 11 }}
                    />
                    <Bar dataKey="tours" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Lap time distribution */}
              <div className="bg-[#0a0a0a] border border-[#222] rounded p-3">
                <div className="text-[10px] text-[#888] uppercase tracking-widest mb-2">Distribution temps</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={lapDistData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="range" stroke="#666" tick={{ fontSize: 8 }} />
                    <YAxis stroke="#666" tick={{ fontSize: 9 }} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "#111", border: "1px solid #333", fontSize: 11 }}
                    />
                    <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── Lap History Table ─────────────────────────────── */}
        <div className="bg-[#111] rounded-md border border-[#222] flex flex-col">
          <div className="px-4 py-2 border-b border-[#222] bg-[#151515]">
            <h2 className="text-xs uppercase tracking-widest text-[#888] font-bold">Historique des Temps</h2>
          </div>
          <div className="overflow-x-auto p-0">
            <table className="w-full text-[11px] text-left uppercase tracking-wider">
              <thead className="bg-[#1a1a1a] text-[#666] border-b border-[#222]">
                <tr>
                  <th className="py-2 px-4 font-normal">Heure</th>
                  <th className="py-2 px-4 font-normal">Cycliste</th>
                  <th className="py-2 px-4 font-normal">Troupe</th>
                  <th className="py-2 px-4 font-normal">Vélo</th>
                  <th className="py-2 px-4 font-normal text-right">Temps au Tour</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {state.lapRecords.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#555] font-['Roboto_Mono'] tracking-widest">
                      SYSTÈME PRÊT - EN ATTENTE DES DONNÉES
                    </td>
                  </tr>
                )}
                {[...state.lapRecords]
                  .reverse()
                  .slice(0, 15)
                  .map((record, i) => (
                    <tr
                      key={`${record.timestamp}-${i}`}
                      className="hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                      onClick={() => setSelectedScoutHistory(record.scoutId)}
                    >
                      <td className="py-2 px-4 font-['Roboto_Mono'] text-[#888]">
                        {new Date(record.timestamp).toLocaleTimeString("fr-BE")}
                      </td>
                      <td className="py-2 px-4 font-bold text-[#ddd]">{record.scoutName}</td>
                      <td className="py-2 px-4">
                        <span style={{ color: record.troupe === "Ungava" ? "#3b82f6" : record.troupe === "CuPiDon" ? "#a855f7" : "#ef4444" }}>
                          {record.troupe}
                        </span>
                      </td>
                      <td className="py-2 px-4">
                        <span
                          className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[#000] font-bold font-['Roboto_Mono'] text-[9px]"
                          style={{ backgroundColor: getBikeColor(record.bikeId) }}
                        >
                          {bikeShortLabel(record.bikeId)}
                        </span>
                      </td>
                      <td
                        className="py-2 px-4 text-right"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingLapTs(record.timestamp);
                          const m = Math.floor(record.lapTime / 60);
                          const s = Math.floor(record.lapTime % 60);
                          setEditingLapDraft(`${m}:${String(s).padStart(2, "0")}`);
                        }}
                      >
                        {editingLapTs === record.timestamp ? (
                          <input
                            autoFocus
                            className="w-24 bg-[#222] border border-[#555] rounded px-2 py-0.5 font-['Roboto_Mono'] text-[#22c55e] text-xs text-right outline-none focus:border-[#22c55e]"
                            value={editingLapDraft}
                            onChange={(e) => setEditingLapDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleUpdateLapTime(record.timestamp, editingLapDraft);
                              if (e.key === "Escape") setEditingLapTs(null);
                            }}
                            onBlur={() => handleUpdateLapTime(record.timestamp, editingLapDraft)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="font-['Roboto_Mono'] text-[#22c55e] hover:text-white hover:underline cursor-text" title="Cliquer pour modifier">
                            {formatTimeFull(record.lapTime)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
