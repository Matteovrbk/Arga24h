import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useSharedState } from "./useSharedState";
import { CircuitSVG } from "./CircuitSVG";
import {
  BIKE1_COLOR,
  BIKE2_COLOR,
  formatTimeFull,
  formatTimeShort,
  formatDuration,
} from "./types";
import type { LapRecord } from "./types";
import { ArrowLeft, Clock, Activity, Maximize } from "lucide-react";

export function SpectatorView() {
  const { state } = useSharedState(true);
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(Date.now() / 1000);
  const [bike1MapPos, setBike1MapPos] = useState(0);
  const [bike2MapPos, setBike2MapPos] = useState(0);
  const [flashLap, setFlashLap] = useState<LapRecord | null>(null);
  const [hideAnimateurs, setHideAnimateurs] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now() / 1000), 100);
    return () => clearInterval(interval);
  }, []);

  // Simulate GPS
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.bike1.currentRiderId) setBike1MapPos((p) => (p + 0.008) % 1);
      if (state.bike2.currentRiderId) setBike2MapPos((p) => (p + 0.006) % 1);
    }, 200);
    return () => clearInterval(interval);
  }, [state.bike1.currentRiderId, state.bike2.currentRiderId]);

  // Flash new laps
  const [lastLapCount, setLastLapCount] = useState(state.lapRecords.length);
  useEffect(() => {
    if (state.lapRecords.length > lastLapCount) {
      const newLap = state.lapRecords[state.lapRecords.length - 1];
      setFlashLap(newLap);
      const t = setTimeout(() => setFlashLap(null), 4000);
      setLastLapCount(state.lapRecords.length);
      return () => clearTimeout(t);
    }
    setLastLapCount(state.lapRecords.length);
  }, [state.lapRecords.length, state.lapRecords]);

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

  const elapsed1 =
    state.bike1.lapStartTime !== null ? currentTime - state.bike1.lapStartTime : 0;
  const elapsed2 =
    state.bike2.lapStartTime !== null ? currentTime - state.bike2.lapStartTime : 0;

  // Best Times Array
  const bestTimes = new Map<string, { time: number; name: string; troupe: string; bikeId: number }>();
  state.lapRecords.forEach((r) => {
    const existing = bestTimes.get(r.scoutId);
    if (!existing || r.lapTime < existing.time) {
      bestTimes.set(r.scoutId, { time: r.lapTime, name: r.scoutName, troupe: r.troupe, bikeId: r.bikeId });
    }
  });
  const bestTimesArray = Array.from(bestTimes.entries())
    .map(([id, data]) => ({ scoutId: id, ...data }))
    .sort((a, b) => a.time - b.time);

  const filteredBestTimes = hideAnimateurs
    ? bestTimesArray.filter((entry) => {
        const scout = state.scouts.find((s) => s.id === entry.scoutId);
        return !scout || scout.role !== "animateur";
      })
    : bestTimesArray;

  const getTroupeColor = (troupe: string) =>
    troupe === "Ungava" ? BIKE1_COLOR : BIKE2_COLOR;

  // Helper for F1 Style Table
  const renderF1TableRows = () => {
    if (filteredBestTimes.length === 0) {
      return (
        <div className="flex items-center justify-center h-32 text-[#555] font-['Roboto_Mono'] text-xs uppercase tracking-widest">
          EN ATTENTE DES TEMPS...
        </div>
      );
    }

    const fastestLap = filteredBestTimes[0]?.time || 0;

    return filteredBestTimes.slice(0, 15).map((entry, i) => {
      const gap = i === 0 ? "" : `+${formatTimeFull(entry.time - fastestLap)}`;
      const isFirst = i === 0;

      return (
        <div
          key={entry.scoutId}
          className="grid grid-cols-[30px_1fr_60px_80px_80px] md:grid-cols-[40px_1fr_100px_100px_100px] items-center text-xs md:text-sm border-b border-[#222] h-[34px] md:h-[40px]"
        >
          <div className="text-center font-['Roboto_Mono'] text-[#888]">{i + 1}</div>
          <div className="flex items-center gap-2 overflow-hidden px-2">
            <div
              className="w-1 h-[14px] flex-shrink-0"
              style={{ backgroundColor: entry.bikeId === 1 ? BIKE1_COLOR : BIKE2_COLOR }}
            />
            <span className="font-semibold text-[#ddd] tracking-wide uppercase truncate">
              {entry.name.substring(0, 3).toUpperCase()}{" "}
              <span className="font-normal opacity-70">{entry.name.substring(3)}</span>
            </span>
          </div>
          <div className="text-[#666] uppercase text-[10px] md:text-xs tracking-wider truncate">
            {entry.troupe.substring(0, 3)}
          </div>
          <div
            className={`font-['Roboto_Mono'] text-right pr-4 ${
              isFirst ? "text-[#a855f7] font-bold" : "text-[#fff]"
            }`}
          >
            {formatTimeFull(entry.time)}
          </div>
          <div className="font-['Roboto_Mono'] text-[#888] text-right pr-4">
            {isFirst ? "LEADER" : gap}
          </div>
        </div>
      );
    });
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#eee] overflow-hidden font-['Inter'] selection:bg-[#333]">
      {/* Top Timing Bar */}
      <header className="h-[40px] bg-[#111] border-b border-[#222] flex items-center justify-between px-4 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="text-[#666] hover:text-[#fff] transition-colors flex items-center gap-1 text-[10px] uppercase tracking-widest"
          >
            <ArrowLeft className="w-3 h-3" />
            Opérateur
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
              {state.bike1.totalLaps + state.bike2.totalLaps}
            </div>
          </div>
          <div className="w-px h-4 bg-[#333]" />
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[#666] uppercase tracking-widest">DIST: </span>
            <div className="font-['Roboto_Mono'] text-[#22c55e] text-sm">
              {((state.bike1.totalLaps + state.bike2.totalLaps) * (state.eventConfig?.circuitLengthKm ?? 2.61)).toFixed(1)} km
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
            onClick={toggleFullscreen}
            className="text-[#666] hover:text-[#fff] transition-colors p-1"
            title="Plein écran (F11)"
          >
            <Maximize className="w-4 h-4" />
          </button>
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

      {/* Flash Notification */}
      {flashLap && (
        <div className="absolute top-16 right-4 z-50 animate-in fade-in slide-in-from-right-8 duration-300">
          <div className="bg-[#111] border border-[#333] p-3 shadow-2xl min-w-[300px] flex items-stretch">
            <div
              className="w-1.5 flex-shrink-0"
              style={{ backgroundColor: flashLap.bikeId === 1 ? BIKE1_COLOR : BIKE2_COLOR }}
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
          </div>
        </div>
      )}

      <main className="max-w-[1920px] mx-auto h-[calc(100vh-40px)] flex flex-col md:flex-row">
        
        {/* LEFT COLUMN: Track Status & Map */}
        <div className="w-full md:w-[400px] flex-shrink-0 border-r border-[#222] flex flex-col bg-[#080808]">
          {/* Section Header */}
          <div className="h-[30px] bg-[#111] flex items-center px-3 border-b border-[#222]">
            <span className="text-[10px] text-[#888] uppercase tracking-widest font-semibold flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
              En Piste
            </span>
          </div>

          {/* Bike 1 Box */}
          <div className="p-4 border-b border-[#222] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl pointer-events-none" />
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <div className="bg-[#3b82f6] text-black w-6 h-6 flex items-center justify-center font-bold font-['Roboto_Mono'] text-xs">
                  1
                </div>
                <span className="text-sm font-bold text-[#ccc] tracking-widest uppercase">
                  Ungava
                </span>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-[#666] tracking-widest uppercase mb-0.5">Tours</div>
                <div className="font-['Roboto_Mono'] text-[#fff]">{state.bike1.totalLaps}</div>
              </div>
            </div>
            
            <div className="mt-4 flex flex-col gap-1">
              <div className="text-[10px] text-[#666] tracking-widest uppercase">Cycliste</div>
              <div className="text-2xl font-bold tracking-tight text-[#fff] uppercase truncate">
                {rider1 ? rider1.name : "AUCUN CYCLISTE"}
              </div>
            </div>

            <div className="mt-4 flex justify-between items-end">
              <div>
                <div className="text-[10px] text-[#666] tracking-widest uppercase mb-0.5">Temps en cours</div>
                <div className="font-['Roboto_Mono'] text-xl text-[#eab308]">
                  {rider1 ? formatTimeShort(elapsed1) : "--:--"}
                </div>
              </div>
            </div>
          </div>

          {/* Bike 2 Box */}
          <div className="p-4 border-b border-[#222] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl pointer-events-none" />
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <div className="bg-[#ef4444] text-black w-6 h-6 flex items-center justify-center font-bold font-['Roboto_Mono'] text-xs">
                  2
                </div>
                <span className="text-sm font-bold text-[#ccc] tracking-widest uppercase">
                  Argapura
                </span>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-[#666] tracking-widest uppercase mb-0.5">Tours</div>
                <div className="font-['Roboto_Mono'] text-[#fff]">{state.bike2.totalLaps}</div>
              </div>
            </div>
            
            <div className="mt-4 flex flex-col gap-1">
              <div className="text-[10px] text-[#666] tracking-widest uppercase">Cycliste</div>
              <div className="text-2xl font-bold tracking-tight text-[#fff] uppercase truncate">
                {rider2 ? rider2.name : "AUCUN CYCLISTE"}
              </div>
            </div>

            <div className="mt-4 flex justify-between items-end">
              <div>
                <div className="text-[10px] text-[#666] tracking-widest uppercase mb-0.5">Temps en cours</div>
                <div className="font-['Roboto_Mono'] text-xl text-[#eab308]">
                  {rider2 ? formatTimeShort(elapsed2) : "--:--"}
                </div>
              </div>
            </div>
          </div>

          {/* Mini Track Map in Left Column */}
          <div className="flex-1 flex flex-col min-h-0 border-b border-[#222]">
            <div className="h-[30px] bg-[#111] flex items-center px-3 border-b border-[#222] flex-shrink-0">
              <span className="text-[10px] text-[#888] uppercase tracking-widest font-semibold">
                Suivi GPS
              </span>
            </div>
            <div className="flex-1 p-4 bg-[#0a0a0a] flex items-center justify-center relative min-h-[250px]">
              <div className="absolute inset-0 opacity-20 pointer-events-none" 
                   style={{ backgroundImage: "radial-gradient(#333 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
              <div className="relative z-10 w-full">
                <CircuitSVG
                  bike1Progress={bike1MapPos}
                  bike2Progress={bike2MapPos}
                  bike1Active={!!rider1}
                  bike2Active={!!rider2}
                  bike1Rider={rider1?.name}
                  bike2Rider={rider2?.name}
                  dark
                />
              </div>
            </div>
          </div>

          {/* Pace Predictions */}
          <div className="p-3 border-b border-[#222] bg-[#080808]">
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
              const totalLaps = state.bike1.totalLaps + state.bike2.totalLaps;
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

          {/* Share URL */}
          <div className="p-3 bg-[#080808]">
            <div className="text-[10px] text-[#888] uppercase tracking-widest font-semibold mb-2">
              Partager
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[10px] font-['Roboto_Mono'] text-[#aaa] bg-[#111] border border-[#222] rounded px-2 py-1.5 truncate">
                {window.location.href}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                }}
                className="px-2 py-1.5 bg-[#222] hover:bg-[#333] border border-[#333] rounded text-[10px] uppercase tracking-widest text-[#aaa] hover:text-white transition-colors shrink-0"
              >
                Copier
              </button>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Timing Tower */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#000]">
          
          <div className="h-[30px] bg-[#111] flex items-center px-3 border-b border-[#222] justify-between">
            <span className="text-[10px] text-[#888] uppercase tracking-widest font-semibold flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Temps / Meilleurs Tours
            </span>
            <button
              onClick={() => setHideAnimateurs(!hideAnimateurs)}
              className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded transition-colors ${
                hideAnimateurs
                  ? "bg-[#eab308] text-black font-bold"
                  : "bg-[#222] text-[#888] hover:bg-[#333]"
              }`}
            >
              {hideAnimateurs ? "Animateurs masqués" : "Tous"}
            </button>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[30px_1fr_60px_80px_80px] md:grid-cols-[40px_1fr_100px_100px_100px] items-center text-[10px] uppercase tracking-widest text-[#666] bg-[#080808] border-b border-[#222] h-[30px]">
            <div className="text-center">Pos</div>
            <div className="px-2">Cycliste</div>
            <div>Trp</div>
            <div className="text-right pr-4">Meilleur</div>
            <div className="text-right pr-4">Écart</div>
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-y-auto">
            {renderF1TableRows()}
          </div>

          {/* Commentary & Recent Laps Footer */}
          <div className="h-[34px] border-t border-[#222] bg-[#111] overflow-hidden flex items-center">
            <div className="bg-[#222] text-[#fff] text-[10px] uppercase tracking-widest px-3 h-full flex items-center font-bold z-10 relative shadow-[10px_0_10px_#111]">
              DIRECT
            </div>
            <div className="flex-1 overflow-hidden relative flex items-center">
              <div className="flex gap-8 px-4 animate-[marquee_20s_linear_infinite] whitespace-nowrap">
                {(state.commentary ?? []).slice(-3).map((msg) => (
                  <div key={msg.id} className="flex items-center gap-2">
                    <span className={`text-[10px] font-['Roboto_Mono'] ${msg.type === "system" ? "text-[#22c55e]" : "text-[#eab308]"}`}>
                      {msg.type === "system" ? "SYS" : "MSG"}
                    </span>
                    <span className="text-[#ccc] text-xs">
                      {msg.text}
                    </span>
                  </div>
                ))}
                {state.lapRecords.slice(-5).map((lap, i) => (
                  <div key={`lap-${i}`} className="flex items-center gap-2">
                    <span className="text-[#888] text-[10px] font-['Roboto_Mono']">
                      V{lap.bikeId}
                    </span>
                    <span className="text-[#ccc] text-xs font-semibold uppercase">
                      {lap.scoutName}
                    </span>
                    <span className="text-[#a855f7] text-xs font-['Roboto_Mono']">
                      {formatTimeFull(lap.lapTime)}
                    </span>
                  </div>
                ))}
                {state.lapRecords.length === 0 && (state.commentary ?? []).length === 0 && (
                  <span className="text-[#555] text-[10px] tracking-widest uppercase font-['Roboto_Mono']">
                    AUCUN TOUR TERMINÉ
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

      </main>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}
