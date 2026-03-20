import { useState } from "react";
import {
  Play,
  SkipForward,
  Plus,
  ChevronUp,
  ChevronDown,
  X,
  User,
} from "lucide-react";
import type { Scout, BikeState, LapRecord } from "./types";
import { formatTimeShort } from "./types";

interface BikeQueueProps {
  bikeId: 1 | 2;
  bikeState: BikeState;
  scouts: Scout[];
  onStartRide: () => void;
  onCountLap: () => void;
  onNextScout: () => void;
  onAddToQueue: (scoutId: string) => void;
  onRemoveFromQueue: (scoutId: string) => void;
  onMoveInQueue: (scoutId: string, direction: "up" | "down") => void;
  currentTime: number;
  color: string;
  lapRecords: LapRecord[];
}

export function BikeQueue({
  bikeId,
  bikeState,
  scouts,
  onStartRide,
  onCountLap,
  onNextScout,
  onAddToQueue,
  onRemoveFromQueue,
  onMoveInQueue,
  currentTime,
  color,
  lapRecords,
}: BikeQueueProps) {
  const [selectedScoutId, setSelectedScoutId] = useState("");

  const currentRider = scouts.find((s) => s.id === bikeState.currentRiderId);
  const queueScouts = bikeState.queue
    .map((id) => scouts.find((s) => s.id === id))
    .filter(Boolean) as Scout[];

  const availableScouts = scouts.filter(
    (s) =>
      s.id !== bikeState.currentRiderId && !bikeState.queue.includes(s.id)
  );

  const elapsedTime =
    bikeState.lapStartTime !== null ? currentTime - bikeState.lapStartTime : 0;

  // Calculate average lap time for ETA
  const bikeLaps = lapRecords.filter((r) => r.bikeId === bikeId);
  const recentLaps = bikeLaps.slice(-10);
  const avgLapTime = recentLaps.length > 0
    ? recentLaps.reduce((sum, r) => sum + r.lapTime, 0) / recentLaps.length
    : 0;

  const handleAddToQueue = () => {
    if (selectedScoutId) {
      onAddToQueue(selectedScoutId);
      setSelectedScoutId("");
    }
  };

  return (
    <div className="bg-[#111] rounded-md border border-[#222] overflow-hidden flex flex-col font-['Inter']">
      {/* Header */}
      <div
        className="px-4 py-2 flex items-center gap-2 border-b-2"
        style={{ borderColor: color, backgroundColor: "#151515" }}
      >
        <div 
          className="w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-bold font-['Roboto_Mono'] text-black"
          style={{ backgroundColor: color }}
        >
          {bikeId}
        </div>
        <h2 className="text-white text-xs font-bold uppercase tracking-widest m-0">Vélo {bikeId}</h2>
        <div className="ml-auto bg-[#222] border border-[#333] rounded px-2 py-0.5 text-[#aaa] text-[10px] font-['Roboto_Mono']">
          TOURS: <span className="text-white font-bold">{bikeState.totalLaps}</span>
        </div>
      </div>

      {/* Current Rider Box */}
      <div className="p-4 border-b border-[#222] bg-gradient-to-b from-[#151515] to-[#0a0a0a]">
        <div className="flex justify-between items-end mb-2">
           <div className="text-[10px] text-[#666] uppercase tracking-widest font-bold">Cycliste Actif</div>
           {currentRider && (
              <div className="flex items-center gap-1.5 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                <span className="text-[#22c55e] uppercase tracking-widest font-bold text-[10px]">EN PISTE</span>
              </div>
           )}
        </div>
        
        <div className="min-h-[60px] flex items-center justify-between mb-4">
          {currentRider ? (
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-white uppercase tracking-tight leading-none mb-1">
                {currentRider.name}
              </span>
              <span
                className="text-[10px] uppercase tracking-widest"
                style={{ color }}
              >
                {currentRider.troupe}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[#555]">
              <User className="w-5 h-5" />
              <span className="text-xs uppercase tracking-widest font-['Roboto_Mono']">AUCUN CYCLISTE</span>
            </div>
          )}

          {currentRider && (
            <div className="flex flex-col items-end">
              <div className="text-[10px] text-[#666] uppercase tracking-widest mb-1">Chrono en cours</div>
              <div className="flex items-center gap-1 text-2xl font-bold font-['Roboto_Mono'] tabular-nums leading-none text-[#eab308]">
                {formatTimeShort(elapsedTime)}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {!currentRider && queueScouts.length > 0 && (
            <button
              onClick={onStartRide}
              className="flex-1 px-3 py-2.5 rounded text-black font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity text-[11px] uppercase tracking-widest shadow-lg"
              style={{ backgroundColor: color }}
            >
              <Play className="w-4 h-4" />
              Démarrer le Cycliste
            </button>
          )}
          {currentRider && (
            <>
              <button
                onClick={onCountLap}
                className="flex-[1.5] px-3 py-2 rounded text-black font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity text-[10px] uppercase tracking-widest"
                style={{ backgroundColor: color }}
              >
                <Plus className="w-3.5 h-3.5" />
                Valider Tour
              </button>
              <button
                onClick={onNextScout}
                className="flex-1 px-3 py-2 rounded bg-[#222] border border-[#333] text-white flex items-center justify-center gap-1.5 hover:bg-[#333] transition-colors text-[10px] uppercase tracking-widest"
              >
                <SkipForward className="w-3.5 h-3.5" />
                Passer Relais
              </button>
            </>
          )}
        </div>
      </div>

      {/* Pit Queue */}
      <div className="p-4 flex-1 flex flex-col min-h-0 bg-[#0a0a0a]">
        <div className="flex justify-between items-center mb-3">
          <div className="text-[10px] text-[#666] uppercase tracking-widest font-bold">
            File d'Attente
          </div>
          <div className="flex items-center gap-2">
            {avgLapTime > 0 && (
              <div className="text-[9px] font-['Roboto_Mono'] text-[#eab308] bg-[#1a1500] border border-[#332d00] px-2 py-0.5 rounded">
                MOY: {formatTimeShort(avgLapTime)}
              </div>
            )}
            <div className="text-[10px] font-['Roboto_Mono'] text-[#aaa] bg-[#222] px-2 py-0.5 rounded">
              {queueScouts.length} EN ATTENTE
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <select
            value={selectedScoutId}
            onChange={(e) => setSelectedScoutId(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded bg-[#151515] border border-[#333] text-xs text-[#ddd] outline-none focus:border-[#666]"
          >
            <option value="">SÉLECTIONNER CYCLISTE...</option>
            {availableScouts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name.toUpperCase()} ({s.troupe.substring(0,3).toUpperCase()})
              </option>
            ))}
          </select>
          <button
            onClick={handleAddToQueue}
            disabled={!selectedScoutId}
            className="px-3 py-1.5 rounded text-black disabled:opacity-30 disabled:grayscale hover:opacity-90 transition-all font-bold"
            style={{ backgroundColor: color }}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5 overflow-y-auto flex-1 pr-1 custom-scrollbar">
          {queueScouts.map((scout, index) => (
            <div
              key={scout.id}
              className="group flex items-center gap-3 px-3 py-2 rounded border border-[#222] bg-[#111] hover:border-[#444] transition-colors"
            >
              <div className="text-[10px] font-['Roboto_Mono'] text-[#555] w-4 text-center">
                P{index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-[#eee] uppercase truncate">{scout.name}</div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] uppercase tracking-widest" style={{ color: scout.troupe === "Ungava" ? "#3b82f6" : "#ef4444" }}>
                    {scout.troupe}
                  </span>
                  {avgLapTime > 0 && (
                    <span className="text-[9px] font-['Roboto_Mono'] text-[#eab308]">
                      ~{formatTimeShort((index + 1) * avgLapTime + (currentRider ? elapsedTime > 0 ? Math.max(0, avgLapTime - elapsedTime) : avgLapTime : 0))}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onMoveInQueue(scout.id, "up")}
                  disabled={index === 0}
                  className="p-1 hover:bg-[#333] rounded text-[#aaa] disabled:opacity-0"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onMoveInQueue(scout.id, "down")}
                  disabled={index === queueScouts.length - 1}
                  className="p-1 hover:bg-[#333] rounded text-[#aaa] disabled:opacity-0"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-4 bg-[#333] self-center mx-0.5" />
                <button
                  onClick={() => onRemoveFromQueue(scout.id)}
                  className="p-1 hover:bg-red-900/50 rounded text-[#aaa] hover:text-red-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {queueScouts.length === 0 && (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-[#222] rounded mt-2">
              <span className="text-[#444] text-[10px] tracking-widest font-['Roboto_Mono'] uppercase">
                FILE VIDE
              </span>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}