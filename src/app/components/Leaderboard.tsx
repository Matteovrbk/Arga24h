import { Clock, TrendingUp } from "lucide-react";
import { useState } from "react";
import type { LapRecord, Scout } from "./types";

interface LeaderboardProps {
  lapRecords: LapRecord[];
  scouts: Scout[];
}

export function Leaderboard({ lapRecords, scouts }: LeaderboardProps) {
  const [tab, setTab] = useState<"best" | "average">("best");

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, "0")}.${ms}`;
  };

  // Best lap times
  const bestTimes = new Map<string, { time: number; name: string; troupe: string }>();
  lapRecords.forEach((r) => {
    const existing = bestTimes.get(r.scoutId);
    if (!existing || r.lapTime < existing.time) {
      bestTimes.set(r.scoutId, {
        time: r.lapTime,
        name: r.scoutName,
        troupe: r.troupe,
      });
    }
  });
  const bestTimesArray = Array.from(bestTimes.entries())
    .map(([id, data]) => ({ scoutId: id, ...data }))
    .sort((a, b) => a.time - b.time);

  // Average times
  const avgMap = new Map<string, { total: number; count: number; name: string; troupe: string }>();
  lapRecords.forEach((r) => {
    const existing = avgMap.get(r.scoutId);
    if (existing) {
      existing.total += r.lapTime;
      existing.count += 1;
    } else {
      avgMap.set(r.scoutId, {
        total: r.lapTime,
        count: 1,
        name: r.scoutName,
        troupe: r.troupe,
      });
    }
  });
  const avgTimesArray = Array.from(avgMap.entries())
    .map(([id, data]) => ({
      scoutId: id,
      name: data.name,
      troupe: data.troupe,
      avg: data.total / data.count,
      laps: data.count,
    }))
    .sort((a, b) => a.avg - b.avg);

  return (
    <div className="flex flex-col gap-3 font-['Inter']">
      <div className="flex gap-2">
        <button
          onClick={() => setTab("best")}
          className={`flex-1 px-3 py-1.5 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-widest font-bold rounded transition-colors ${
            tab === "best"
              ? "bg-[#22c55e] text-black"
              : "bg-[#222] text-[#888] hover:bg-[#333]"
          }`}
        >
          <Clock className="w-3 h-3" />
          Meilleur Tour
        </button>
        <button
          onClick={() => setTab("average")}
          className={`flex-1 px-3 py-1.5 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-widest font-bold rounded transition-colors ${
            tab === "average"
              ? "bg-[#3b82f6] text-black"
              : "bg-[#222] text-[#888] hover:bg-[#333]"
          }`}
        >
          <TrendingUp className="w-3 h-3" />
          Temps Moyen
        </button>
      </div>

      <div className="bg-[#0a0a0a] border border-[#222] rounded overflow-hidden">
        <div className="grid grid-cols-[30px_1fr_60px] md:grid-cols-[40px_1fr_80px] bg-[#151515] border-b border-[#222] px-2 py-1.5 text-[9px] uppercase tracking-widest text-[#666]">
          <div className="text-center">Pos</div>
          <div>Cycliste</div>
          <div className="text-right">Temps</div>
        </div>
        <div className="max-h-[220px] overflow-y-auto custom-scrollbar p-1 space-y-1">
          {tab === "best" && (
            <>
              {bestTimesArray.length === 0 && (
                <div className="text-center text-[#555] py-6 text-[10px] uppercase tracking-widest font-['Roboto_Mono']">
                  AUCUNE DONNÉE
                </div>
              )}
              {bestTimesArray.map((entry, i) => (
                <div
                  key={entry.scoutId}
                  className="grid grid-cols-[30px_1fr_60px] md:grid-cols-[40px_1fr_80px] items-center bg-[#111] border border-[#222] rounded px-2 py-1.5 hover:border-[#444]"
                >
                  <div className="text-center font-['Roboto_Mono'] text-[10px] font-bold text-[#888]">
                    {i + 1}
                  </div>
                  <div className="min-w-0 pr-2">
                    <div className="text-[11px] font-bold text-[#ddd] uppercase truncate">{entry.name}</div>
                    <div className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: entry.troupe === "Ungava" ? "#3b82f6" : "#ef4444" }}>
                      {entry.troupe}
                    </div>
                  </div>
                  <div className="font-['Roboto_Mono'] text-[11px] text-right text-[#22c55e] font-bold">
                    {formatTime(entry.time)}
                  </div>
                </div>
              ))}
            </>
          )}

          {tab === "average" && (
            <>
              {avgTimesArray.length === 0 && (
                <div className="text-center text-[#555] py-6 text-[10px] uppercase tracking-widest font-['Roboto_Mono']">
                  AUCUNE DONNÉE
                </div>
              )}
              {avgTimesArray.map((entry, i) => (
                <div
                  key={entry.scoutId}
                  className="grid grid-cols-[30px_1fr_60px] md:grid-cols-[40px_1fr_80px] items-center bg-[#111] border border-[#222] rounded px-2 py-1.5 hover:border-[#444]"
                >
                  <div className="text-center font-['Roboto_Mono'] text-[10px] font-bold text-[#888]">
                    {i + 1}
                  </div>
                  <div className="min-w-0 pr-2">
                    <div className="text-[11px] font-bold text-[#ddd] uppercase truncate">{entry.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                       <span className="text-[9px] uppercase tracking-widest" style={{ color: entry.troupe === "Ungava" ? "#3b82f6" : "#ef4444" }}>
                         {entry.troupe}
                       </span>
                       <span className="text-[9px] text-[#555] font-['Roboto_Mono']">
                         {entry.laps} TOURS
                       </span>
                    </div>
                  </div>
                  <div className="font-['Roboto_Mono'] text-[11px] text-right text-[#3b82f6] font-bold">
                    {formatTime(entry.avg)}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}