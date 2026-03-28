import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useSharedState } from "./useSharedState";
import { useSpectatorChat } from "./useSpectatorChat";
import { CircuitSVG } from "./CircuitSVG";
import {
  BIKE1_COLOR,
  BIKE2_COLOR,
  BIKE3_COLOR,
  formatTimeFull,
  formatTimeShort,
  formatDuration,
  bikeShortLabel,
  bikeColor as getBikeColor,
} from "./types";
import type { LapRecord } from "./types";
import { ArrowLeft, Clock, Activity, Maximize, Send, Bell, BellOff } from "lucide-react";
import { useIsMobile } from "./ui/use-mobile";
import QRCode from "react-qr-code";

const SHARE_URL = "https://www.ungapura24h.xyz/";

export function SpectatorView() {
  const { state } = useSharedState(true);
  const { messages: chatMessages, sendMessage, isConnected: chatConnected, suspended: chatSuspended } = useSpectatorChat();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(Date.now() / 1000);
  const [bike1MapPos] = useState(0);
  const [bike2MapPos] = useState(0);
  const [bike3MapPos] = useState(0);
  const [flashLap, setFlashLap] = useState<LapRecord | null>(null);
  const [spectatorFilter, setSpectatorFilter] = useState<"all" | "bike1" | "bike2" | "bike3" | "Ungava" | "Argapura" | "CuPiDon">("all");
  const [rightTab, setRightTab] = useState<"leaderboard" | "chat">("leaderboard");
  const [unreadChat, setUnreadChat] = useState(0);
  const [lastSeenChatCount, setLastSeenChatCount] = useState(0);
  const [chatText, setChatText] = useState("");
  const [chatAuthor, setChatAuthor] = useState(() => sessionStorage.getItem("sp51_chat_name") || "");
  const [showQR, setShowQR] = useState(false);
  const isMobile = useIsMobile();
  const [flashEnabled, setFlashEnabled] = useState(true);
  const [showMobileExtra, setShowMobileExtra] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now() / 1000), 100);
    return () => clearInterval(interval);
  }, []);

  // Real map progress: elapsed / avg lap time
  const _bike1RecentLaps = state.lapRecords.filter((r) => r.bikeId === 1).slice(-10);
  const _bike1AvgLap = _bike1RecentLaps.length > 0 ? _bike1RecentLaps.reduce((s, r) => s + r.lapTime, 0) / _bike1RecentLaps.length : 0;
  const _bike2RecentLaps = state.lapRecords.filter((r) => r.bikeId === 2).slice(-10);
  const _bike2AvgLap = _bike2RecentLaps.length > 0 ? _bike2RecentLaps.reduce((s, r) => s + r.lapTime, 0) / _bike2RecentLaps.length : 0;
  const _bike3RecentLaps = state.lapRecords.filter((r) => r.bikeId === 3).slice(-10);
  const _bike3AvgLap = _bike3RecentLaps.length > 0 ? _bike3RecentLaps.reduce((s, r) => s + r.lapTime, 0) / _bike3RecentLaps.length : 0;
  const _bike1Elapsed = state.bike1.lapStartTime !== null ? currentTime - state.bike1.lapStartTime : 0;
  const _bike2Elapsed = state.bike2.lapStartTime !== null ? currentTime - state.bike2.lapStartTime : 0;
  const _bike3Elapsed = state.bike3.lapStartTime !== null ? currentTime - state.bike3.lapStartTime : 0;
  const realBike1Pos = _bike1AvgLap > 0 && state.bike1.lapStartTime !== null ? Math.min(0.99, _bike1Elapsed / _bike1AvgLap) : bike1MapPos;
  const realBike2Pos = _bike2AvgLap > 0 && state.bike2.lapStartTime !== null ? Math.min(0.99, _bike2Elapsed / _bike2AvgLap) : bike2MapPos;
  const realBike3Pos = _bike3AvgLap > 0 && state.bike3.lapStartTime !== null ? Math.min(0.99, _bike3Elapsed / _bike3AvgLap) : bike3MapPos;

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Flash new laps (disabled on mobile)
  const [lastLapCount, setLastLapCount] = useState(state.lapRecords.length);
  useEffect(() => {
    if (isMobile || !flashEnabled) {
      setLastLapCount(state.lapRecords.length);
      return;
    }
    if (state.lapRecords.length > lastLapCount) {
      const newLap = state.lapRecords[state.lapRecords.length - 1];
      setFlashLap(newLap);
      const t = setTimeout(() => setFlashLap(null), 4000);
      setLastLapCount(state.lapRecords.length);
      return () => clearTimeout(t);
    }
    setLastLapCount(state.lapRecords.length);
  }, [state.lapRecords.length, state.lapRecords, isMobile, flashEnabled]);

  // Unread chat counter
  useEffect(() => {
    if (rightTab === "chat") {
      setLastSeenChatCount(chatMessages.length);
      setUnreadChat(0);
    } else {
      const newCount = Math.max(0, chatMessages.length - lastSeenChatCount);
      setUnreadChat(newCount);
    }
  }, [chatMessages.length, rightTab, lastSeenChatCount]);

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

  const rider1 = state.scouts.find((s) => s.id === state.bike1.currentRiderId);
  const rider2 = state.scouts.find((s) => s.id === state.bike2.currentRiderId);
  const rider3 = state.scouts.find((s) => s.id === state.bike3.currentRiderId);

  const elapsed1 =
    state.bike1.lapStartTime !== null ? currentTime - state.bike1.lapStartTime : 0;
  const elapsed2 =
    state.bike2.lapStartTime !== null ? currentTime - state.bike2.lapStartTime : 0;
  const elapsed3 =
    state.bike3.lapStartTime !== null ? currentTime - state.bike3.lapStartTime : 0;

  const totalLaps = state.bike1.totalLaps + state.bike2.totalLaps + state.bike3.totalLaps;

  const SPECTATOR_FILTERS = [
    { key: "all" as const,      label: "TOUS",       color: "#888"      },
    { key: "bike1" as const,    label: "V1",         color: BIKE1_COLOR },
    { key: "bike2" as const,    label: "V2",         color: BIKE2_COLOR },
    { key: "bike3" as const,    label: "VPi",        color: BIKE3_COLOR },
    { key: "Ungava" as const,   label: "UNGAVA",     color: "#3b82f6"   },
    { key: "Argapura" as const, label: "ARGAPURA",   color: "#ef4444"   },
    { key: "CuPiDon" as const,  label: "CUPIDON",    color: "#a855f7"   },
  ];

  const filteredRecords = state.lapRecords.filter((r) => {
    if (spectatorFilter === "bike1") return r.bikeId === 1;
    if (spectatorFilter === "bike2") return r.bikeId === 2;
    if (spectatorFilter === "bike3") return r.bikeId === 3;
    if (spectatorFilter === "Ungava" || spectatorFilter === "Argapura" || spectatorFilter === "CuPiDon") return r.troupe === spectatorFilter;
    return true;
  });

  const bestTimesMap = new Map<string, { time: number; name: string; troupe: string; bikeId: 1 | 2 | 3; laps: number }>();
  filteredRecords.forEach((r) => {
    const existing = bestTimesMap.get(r.scoutId);
    if (!existing || r.lapTime < existing.time) {
      bestTimesMap.set(r.scoutId, { time: r.lapTime, name: r.scoutName, troupe: r.troupe, bikeId: r.bikeId as 1 | 2 | 3, laps: 0 });
    }
  });
  filteredRecords.forEach((r) => {
    const e = bestTimesMap.get(r.scoutId);
    if (e) e.laps++;
  });

  const filteredBestTimes = Array.from(bestTimesMap.entries())
    .map(([id, data]) => ({ scoutId: id, ...data }))
    .sort((a, b) => a.time - b.time);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  };

  return (
    <div className="h-dvh md:h-screen bg-[#050505] text-[#eee] overflow-hidden font-['Inter'] selection:bg-[#333] flex flex-col">
      {/* Top Timing Bar */}
      <header className="bg-[#111] border-b border-[#222] sticky top-0 z-10">
        {/* Mobile header */}
        <div className="flex md:hidden flex-col px-3 py-2 gap-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-[#e11d48]" />
              <span className="text-[11px] font-bold text-[#fff] uppercase">24hSaintPaul</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="font-['Roboto_Mono'] text-[#fff] text-xs">
                {String(eventHours).padStart(2, "0")}:{String(eventMins).padStart(2, "0")}:{String(eventSecs).padStart(2, "0")}
              </div>
              <div className="font-['Roboto_Mono'] text-[#22c55e] text-xs">{totalLaps} T</div>
              {remaining !== null && remaining > 0 && (
                <div className="font-['Roboto_Mono'] text-[#e11d48] text-xs">{formatDuration(remaining)}</div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="font-['Roboto_Mono'] text-[#22c55e] text-[10px]">
              {(totalLaps * (state.eventConfig?.circuitLengthKm ?? 2.61)).toFixed(1)} km parcourus
            </div>
            <button
              onClick={() => navigate("/attente")}
              className="text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded border border-[#333] text-[#aaa] active:bg-[#222] transition-colors"
            >
              File d'attente →
            </button>
          </div>
        </div>
        {/* Desktop header */}
        <div className="hidden md:flex h-[40px] items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/admin")}
              className="text-[#666] hover:text-[#fff] transition-colors flex items-center gap-1 text-[10px] uppercase tracking-widest"
            >
              <ArrowLeft className="w-3 h-3" />
              Admin
            </button>
            <div className="w-px h-4 bg-[#333]" />
            <button
              onClick={() => navigate("/attente")}
              className="text-[#666] hover:text-[#fff] transition-colors text-[10px] uppercase tracking-widest"
            >
              File d'attente
            </button>
            <div className="w-px h-4 bg-[#333]" />
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#e11d48]" />
              <span className="text-[11px] font-bold tracking-widest text-[#fff] uppercase">
                24hSaintPaul — Chronométrage Direct
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-[#666] uppercase tracking-widest">TEMPS: </span>
              <div className="font-['Roboto_Mono'] text-[#fff] text-sm">
                {String(eventHours).padStart(2, "0")}:
                {String(eventMins).padStart(2, "0")}:
                {String(eventSecs).padStart(2, "0")}
              </div>
            </div>
            <div className="w-px h-4 bg-[#333]" />
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-[#666] uppercase tracking-widest">TOURS: </span>
              <div className="font-['Roboto_Mono'] text-[#fff] text-sm">
                {totalLaps}
              </div>
            </div>
            <div className="w-px h-4 bg-[#333]" />
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-[#666] uppercase tracking-widest">DIST: </span>
              <div className="font-['Roboto_Mono'] text-[#22c55e] text-sm">
                {(totalLaps * (state.eventConfig?.circuitLengthKm ?? 2.61)).toFixed(1)} km
              </div>
            </div>
            {remaining !== null && remaining > 0 && (
              <>
                <div className="w-px h-4 bg-[#333]" />
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-[#666] uppercase tracking-widest">RESTANT: </span>
                  <div className="font-['Roboto_Mono'] text-[#e11d48] text-sm">
                    {formatDuration(remaining)}
                  </div>
                </div>
              </>
            )}
            <div className="w-px h-4 bg-[#333]" />
            <button
              onClick={() => setFlashEnabled((v) => !v)}
              className="transition-colors p-1"
              style={{ color: flashEnabled ? "#22c55e" : "#555" }}
              title={flashEnabled ? "Désactiver les notifications" : "Activer les notifications"}
            >
              {flashEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleFullscreen}
              className="text-[#666] hover:text-[#fff] transition-colors p-1"
              title="Plein écran (F11)"
            >
              <Maximize className="w-4 h-4" />
            </button>
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

      {/* Flash Notification — desktop only, dismissable */}
      {!isMobile && flashEnabled && flashLap && (
        <div className="absolute top-16 right-4 z-50 animate-in fade-in slide-in-from-right-8 duration-300">
          <div className="bg-[#111] border border-[#333] p-3 shadow-2xl min-w-[300px] flex items-stretch">
            <div
              className="w-1.5 flex-shrink-0"
              style={{ backgroundColor: getBikeColor(flashLap.bikeId as 1 | 2 | 3) }}
            />
            <div className="ml-3 flex-1">
              <div className="text-[10px] text-[#888] uppercase tracking-widest mb-1">Nouveau Tour Terminé</div>
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-[#fff] text-sm uppercase">{flashLap.scoutName}</span>
                <span className="font-['Roboto_Mono'] text-[#eab308] text-base">
                  {formatTimeFull(flashLap.lapTime)}
                </span>
              </div>
            </div>
            <button
              onClick={() => setFlashLap(null)}
              className="ml-2 text-[#555] hover:text-[#fff] transition-colors self-start text-xs leading-none"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-[1920px] mx-auto w-full flex flex-col md:flex-row overflow-hidden">

        {/* LEFT COLUMN: Track Status & Map */}
        <div className="w-full md:w-[400px] flex-shrink-0 border-r border-[#222] flex flex-col bg-[#080808] overflow-y-auto md:overflow-y-hidden">
          {/* Section Header */}
          <div className="h-[30px] bg-[#111] flex items-center px-3 border-b border-[#222]">
            <span className="text-[10px] text-[#888] uppercase tracking-widest font-semibold flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
              En Piste
            </span>
          </div>

          {/* Bike 1 Box */}
          <div className="p-3 border-b border-[#222] relative overflow-hidden">
            <div className="flex justify-between items-start mb-1">
              <div className="flex items-center gap-2">
                <div className="bg-[#16a34a] text-black w-5 h-5 flex items-center justify-center font-bold font-['Roboto_Mono'] text-[10px]">
                  1
                </div>
                <span className="text-xs font-bold text-[#ccc] tracking-widest uppercase">
                  Vélo 1
                </span>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-[#666] tracking-widest uppercase">Tours</div>
                <div className="font-['Roboto_Mono'] text-[#fff] text-sm">{state.bike1.totalLaps}</div>
              </div>
            </div>
            <div className="flex justify-between items-end">
              <div className="text-lg font-bold tracking-tight text-[#fff] uppercase truncate">
                {rider1 ? rider1.name : "—"}
              </div>
              <div className="font-['Roboto_Mono'] text-[#eab308]">
                {rider1 ? formatTimeShort(elapsed1) : "--:--"}
              </div>
            </div>
          </div>

          {/* Bike 2 Box */}
          <div className="p-3 border-b border-[#222] relative overflow-hidden">
            <div className="flex justify-between items-start mb-1">
              <div className="flex items-center gap-2">
                <div className="bg-[#ea580c] text-black w-5 h-5 flex items-center justify-center font-bold font-['Roboto_Mono'] text-[10px]">
                  2
                </div>
                <span className="text-xs font-bold text-[#ccc] tracking-widest uppercase">
                  Vélo 2
                </span>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-[#666] tracking-widest uppercase">Tours</div>
                <div className="font-['Roboto_Mono'] text-[#fff] text-sm">{state.bike2.totalLaps}</div>
              </div>
            </div>
            <div className="flex justify-between items-end">
              <div className="text-lg font-bold tracking-tight text-[#fff] uppercase truncate">
                {rider2 ? rider2.name : "—"}
              </div>
              <div className="font-['Roboto_Mono'] text-[#eab308]">
                {rider2 ? formatTimeShort(elapsed2) : "--:--"}
              </div>
            </div>
          </div>

          {/* Bike Pi Box */}
          <div className="p-3 border-b border-[#222] relative overflow-hidden">
            <div className="flex justify-between items-start mb-1">
              <div className="flex items-center gap-2">
                <div className="bg-[#dc2626] text-black w-5 h-5 flex items-center justify-center font-bold font-['Roboto_Mono'] text-[10px]">
                  Pi
                </div>
                <span className="text-xs font-bold text-[#ccc] tracking-widest uppercase">
                  Vélo Pi
                </span>
                <span className="text-[8px] text-[#666] uppercase tracking-widest">CuPiDon</span>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-[#666] tracking-widest uppercase">Tours</div>
                <div className="font-['Roboto_Mono'] text-[#fff] text-sm">{state.bike3.totalLaps}</div>
              </div>
            </div>
            <div className="flex justify-between items-end">
              <div className="text-lg font-bold tracking-tight text-[#fff] uppercase truncate">
                {rider3 ? rider3.name : "—"}
              </div>
              <div className="font-['Roboto_Mono'] text-[#eab308]">
                {rider3 ? formatTimeShort(elapsed3) : "--:--"}
              </div>
            </div>
          </div>

          {/* Mobile: toggle carte & stats */}
          <button
            onClick={() => setShowMobileExtra((v) => !v)}
            className="flex md:hidden items-center justify-center gap-2 px-3 py-2.5 border-b border-[#222] bg-[#0d0d0d] text-[10px] text-[#888] uppercase tracking-widest font-semibold active:bg-[#111] transition-colors"
          >
            {showMobileExtra ? "Masquer carte & stats \u25B2" : "Voir carte & stats \u25BC"}
          </button>

          {/* Mini Track Map in Left Column */}
          <div className={`${showMobileExtra ? "flex" : "hidden"} md:flex md:flex-1 flex-col min-h-0 border-b border-[#222]`}>
            <div className="h-[30px] bg-[#111] flex items-center px-3 border-b border-[#222] flex-shrink-0">
              <span className="text-[10px] text-[#888] uppercase tracking-widest font-semibold">
                Suivi GPS
              </span>
            </div>
            <div className="p-4 bg-[#0a0a0a] flex items-center justify-center relative h-[200px] md:flex-1 md:min-h-[250px]">
              <div className="absolute inset-0 opacity-20 pointer-events-none"
                   style={{ backgroundImage: "radial-gradient(#333 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
              <div className="relative z-10 w-full">
                <CircuitSVG
                  bike1Progress={realBike1Pos}
                  bike2Progress={realBike2Pos}
                  bike3Progress={realBike3Pos}
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
          </div>

          {/* Pace Predictions */}
          <div className={`${showMobileExtra ? "block" : "hidden"} md:block p-3 border-b border-[#222] bg-[#080808]`}>
            <div className="text-[10px] text-[#888] uppercase tracking-widest font-semibold mb-2">
              Prédictions (rythme actuel)
            </div>
            {(() => {
              const recentLaps = state.lapRecords.slice(-10);
              if (recentLaps.length < 2) return (
                <div className="text-[10px] text-[#555] font-['Roboto_Mono'] uppercase">
                  PAS ASSEZ DE DONNÉES
                </div>
              );
              const avgLapTime = recentLaps.reduce((s, r) => s + r.lapTime, 0) / recentLaps.length;
              const elapsedMs = Date.now() - state.eventStartTime;
              const totalDuration = state.eventConfig?.durationMs ?? 86400000;
              const remainingMs = Math.max(0, (state.eventConfig ? state.eventConfig.startTime + totalDuration - Date.now() : totalDuration - elapsedMs));
              const predictedRemainingLaps = Math.floor(remainingMs / 1000 / avgLapTime);
              const predictedTotalLaps = totalLaps + predictedRemainingLaps;
              const predictedKm = (predictedTotalLaps * (state.eventConfig?.circuitLengthKm ?? 2.61)).toFixed(1);

              return (
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-[#666] uppercase">Tours prévus</span>
                    <span className="text-[11px] font-['Roboto_Mono'] text-[#fff] font-bold">{predictedTotalLaps}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-[#666] uppercase">Distance prévue</span>
                    <span className="text-[11px] font-['Roboto_Mono'] text-[#22c55e] font-bold">{predictedKm} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-[#666] uppercase">Moy. tour</span>
                    <span className="text-[11px] font-['Roboto_Mono'] text-[#eab308]">{formatTimeShort(avgLapTime)}</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Share URL + QR */}
          <div className={`${showMobileExtra ? "block" : "hidden"} md:block p-3 bg-[#080808] border-t border-[#222]`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[#888] uppercase tracking-widest font-semibold">Partager</span>
              <button
                onClick={() => setShowQR((v) => !v)}
                className="text-[10px] uppercase tracking-widest text-[#555] hover:text-[#aaa] transition-colors"
              >
                {showQR ? "Masquer QR" : "QR Code"}
              </button>
            </div>
              <div className="flex items-center gap-2">
              <code className="flex-1 text-[10px] font-['Roboto_Mono'] text-[#aaa] bg-[#111] border border-[#222] rounded px-2 py-1.5 truncate">
                {SHARE_URL}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(SHARE_URL)}
                className="px-2 py-1.5 bg-[#222] hover:bg-[#333] border border-[#333] rounded text-[10px] uppercase tracking-widest text-[#aaa] hover:text-white transition-colors shrink-0"
              >
                Copier
              </button>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Timing Tower */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#000] relative overflow-hidden">

          {/* Header + Filtres */}
          <div className="bg-[#111] border-b border-[#222] px-3 py-2 flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-[#555]" />
              <span className="text-[10px] text-[#888] uppercase tracking-widest font-semibold flex-1">Temps / Meilleurs Tours</span>
            </div>
            <div className="flex gap-1 flex-wrap">
              {SPECTATOR_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setSpectatorFilter(f.key)}
                  className="px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[9px] uppercase tracking-widest font-bold rounded border transition-all"
                  style={
                    spectatorFilter === f.key
                      ? { backgroundColor: f.color, borderColor: f.color, color: "#000" }
                      : { backgroundColor: "transparent", borderColor: "#333", color: "#666" }
                  }
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Leaderboard */}
          {rightTab === "leaderboard" && (
            <>
              {/* Table Header */}
              <div className="grid grid-cols-[24px_1fr_60px_40px] md:grid-cols-[30px_1fr_55px_80px_80px_55px] items-center text-[10px] uppercase tracking-widest text-[#666] bg-[#080808] border-b border-[#222] h-[28px]">
                <div className="text-center">Pos</div>
                <div className="px-2">Cycliste</div>
                <div className="hidden md:block text-center">Vélo</div>
                <div className="text-right pr-2 md:pr-4">Meilleur</div>
                <div className="hidden md:block text-right pr-4">Écart</div>
                <div className="text-right pr-2">Tours</div>
              </div>

              {/* Table Body */}
              <div className="flex-1 overflow-y-auto">
                {filteredBestTimes.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-[#555] font-['Roboto_Mono'] text-xs uppercase tracking-widest">
                    EN ATTENTE DES TEMPS...
                  </div>
                ) : (
                  filteredBestTimes.slice(0, 20).map((entry, i) => {
                    const fastestLap = filteredBestTimes[0].time;
                    const gap = i === 0 ? "" : `+${formatTimeFull(entry.time - fastestLap)}`;
                    const podiumColors = ["#ffd700", "#c0c0c0", "#cd7f32"];
                    const podiumColor = i < 3 ? podiumColors[i] : null;
                    const bColor = getBikeColor(entry.bikeId);

                    return (
                      <div
                        key={entry.scoutId}
                        className={`grid grid-cols-[24px_1fr_60px_40px] md:grid-cols-[30px_1fr_55px_80px_80px_55px] items-center border-b border-[#1a1a1a] transition-colors ${
                          i === 0 ? "bg-[#0d0d0d]" : "hover:bg-[#0a0a0a]"
                        }`}
                        style={i === 0 ? { boxShadow: `inset 3px 0 0 ${bColor}` } : {}}
                      >
                        {/* Position */}
                        <div className="text-center py-2.5">
                          <span className="font-['Roboto_Mono'] font-bold text-[11px]" style={{ color: podiumColor ?? "#555" }}>
                            {i + 1}
                          </span>
                        </div>

                        {/* Name */}
                        <div className="flex items-center gap-2 overflow-hidden px-2 py-2.5">
                          <div className="w-1 h-[14px] flex-shrink-0 rounded-sm" style={{ backgroundColor: bColor }} />
                          <span
                            className={`font-semibold tracking-wide uppercase truncate ${i === 0 ? "text-white text-sm" : "text-[#aaa] text-xs"}`}
                          >
                            {entry.name.substring(0, 3).toUpperCase()}
                            <span className="font-normal opacity-60">{entry.name.substring(3)}</span>
                          </span>
                          {i === 0 && (
                            <span className="hidden md:inline text-[8px] bg-[#ffd700] text-black px-1 py-0.5 rounded font-bold uppercase tracking-widest ml-1 flex-shrink-0 animate-pulse">
                              LEADER
                            </span>
                          )}
                        </div>

                        {/* Bike — hidden on mobile */}
                        <div className="hidden md:block text-center py-2.5">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: bColor + "22", color: bColor }}>
                            {bikeShortLabel(entry.bikeId)}
                          </span>
                        </div>

                        {/* Best time */}
                        <div className={`font-['Roboto_Mono'] text-right pr-2 md:pr-4 py-2.5 text-[11px] ${i === 0 ? "font-bold" : ""}`}
                          style={{ color: podiumColor ?? "#fff" }}>
                          {formatTimeFull(entry.time)}
                        </div>

                        {/* Gap — hidden on mobile */}
                        <div className="hidden md:block font-['Roboto_Mono'] text-[#555] text-right pr-4 py-2.5 text-[10px]">
                          {i === 0 ? "\u2014" : gap}
                        </div>

                        {/* Laps */}
                        <div className="font-['Roboto_Mono'] text-[#444] text-right pr-2 py-2.5 text-[10px]">
                          {entry.laps}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* Chat Tab */}
          {rightTab === "chat" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 space-y-2">
                {chatMessages.length === 0 && (
                  <div className="text-center text-[#444] py-8 text-[10px] uppercase tracking-widest">
                    Aucun message — sois le premier !
                  </div>
                )}
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="flex flex-col gap-0.5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] font-bold text-[#e2a03f]">{msg.author}</span>
                      <span className="text-[8px] text-[#444] font-['Roboto_Mono']">
                        {new Date(msg.timestamp).toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#ccc] bg-[#0d0d0d] border border-[#1a1a1a] rounded px-2 py-1.5">
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="border-t border-[#222] p-3 space-y-2 bg-[#080808]">
                {chatSuspended ? (
                  <div className="text-center text-[#f97316] text-[10px] uppercase tracking-widest font-bold py-2">
                    Chat suspendu par les organisateurs
                  </div>
                ) : (
                  <>
                    <input
                      value={chatAuthor}
                      onChange={(e) => { setChatAuthor(e.target.value); sessionStorage.setItem("sp51_chat_name", e.target.value); }}
                      placeholder="Ton prénom..."
                      maxLength={30}
                      className="w-full bg-[#111] border border-[#222] rounded px-3 py-1.5 text-[11px] text-white placeholder-[#444] focus:outline-none focus:border-[#e2a03f]"
                    />
                    <form
                      onSubmit={(e) => { e.preventDefault(); sendMessage(chatText, chatAuthor || "Spectateur"); setChatText(""); }}
                      className="flex gap-2"
                    >
                      <input
                        value={chatText}
                        onChange={(e) => setChatText(e.target.value)}
                        placeholder={chatConnected ? "Écris un message..." : "Chat hors-ligne"}
                        maxLength={200}
                        disabled={!chatConnected}
                        className="flex-1 bg-[#111] border border-[#222] rounded px-3 py-1.5 text-[11px] text-white placeholder-[#444] focus:outline-none focus:border-[#3b82f6] disabled:opacity-40"
                      />
                      <button
                        type="submit"
                        disabled={!chatConnected || !chatText.trim()}
                        className="px-3 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] rounded text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-[11px]"
                      >
                        <Send className="w-3 h-3" />
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Bottom: Tabs + Commentary */}
          <div className="border-t border-[#222] flex-shrink-0">
            {/* Tab switcher */}
            <div className="flex border-b border-[#1a1a1a]">
              <button
                onClick={() => setRightTab("leaderboard")}
                className={`flex-1 py-1.5 text-[10px] uppercase tracking-widest font-bold transition-colors flex items-center justify-center gap-1.5 ${
                  rightTab === "leaderboard" ? "bg-[#111] text-[#fff]" : "bg-[#080808] text-[#555] hover:text-[#888]"
                }`}
              >
                Classement
              </button>
              <button
                onClick={() => { setRightTab("chat"); setUnreadChat(0); setLastSeenChatCount(chatMessages.length); }}
                className={`flex-1 py-1.5 text-[10px] uppercase tracking-widest font-bold transition-colors flex items-center justify-center gap-1.5 ${
                  rightTab === "chat" ? "bg-[#111] text-[#fff]" : "bg-[#080808] text-[#555] hover:text-[#888]"
                }`}
              >
                Chat
                {unreadChat > 0 && (
                  <span className="bg-[#ef4444] text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                    {unreadChat > 9 ? "9+" : unreadChat}
                  </span>
                )}
              </button>
            </div>

            {/* Commentary marquee */}
            <div className="h-[32px] bg-[#0d0d0d] overflow-hidden flex items-center">
              <div className="bg-[#222] text-[#fff] text-[10px] uppercase tracking-widest px-3 h-full flex items-center font-bold z-10 relative shadow-[10px_0_10px_#0d0d0d] flex-shrink-0">
                DIRECT
              </div>
              <div className="flex-1 overflow-hidden relative flex items-center">
                <div className="flex gap-8 px-4 animate-[marquee_20s_linear_infinite] whitespace-nowrap">
                  {(state.commentary ?? []).slice(-3).map((msg) => (
                    <div key={msg.id} className="flex items-center gap-2">
                      <span className={`text-[10px] font-['Roboto_Mono'] ${msg.type === "system" ? "text-[#22c55e]" : "text-[#eab308]"}`}>
                        {msg.type === "system" ? "SYS" : "MSG"}
                      </span>
                      <span className="text-[#ccc] text-xs">{msg.text}</span>
                    </div>
                  ))}
                  {state.lapRecords.slice(-5).map((lap, i) => (
                    <div key={`lap-${i}`} className="flex items-center gap-2">
                      <span className="text-[#888] text-[10px] font-['Roboto_Mono']">{bikeShortLabel(lap.bikeId as 1 | 2 | 3)}</span>
                      <span className="font-semibold text-[#ddd] uppercase text-xs">{lap.scoutName}</span>
                      <span className="font-['Roboto_Mono']" style={{ color: getBikeColor(lap.bikeId as 1 | 2 | 3) }}>
                        {formatTimeFull(lap.lapTime)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>

      </main>

      {/* QR Code Modal */}
      {showQR && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setShowQR(false)}
        >
          <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <QRCode value={SHARE_URL} size={200} />
            <p className="text-black text-xs font-['Roboto_Mono'] text-center max-w-[200px] break-all">{SHARE_URL}</p>
            <button
              onClick={() => setShowQR(false)}
              className="text-[11px] uppercase tracking-widest text-[#666] hover:text-black transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}
