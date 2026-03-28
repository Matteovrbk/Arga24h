import { Clock, TrendingUp } from "lucide-react";
import { useState } from "react";
import type { LapRecord, Scout } from "./types";
import { BIKE1_COLOR, BIKE2_COLOR, BIKE3_COLOR, bikeName, bikeColor as getBikeColor } from "./types";

interface LeaderboardProps {
  lapRecords: LapRecord[];
  scouts: Scout[];
}

type FilterMode = "all" | "bike1" | "bike2" | "bike3" | "Ungava" | "Argapura";

const FILTERS: { key: FilterMode; label: string; color: string }[] = [
  { key: "all",      label: "Tous",       color: "#888"       },
  { key: "bike1",    label: "V\u00e9lo 1", color: BIKE1_COLOR  },
  { key: "bike2",    label: "V\u00e9lo 2", color: BIKE2_COLOR  },
  { key: "bike3",    label: "V\u00e9lo Pi", color: BIKE3_COLOR  },
  { key: "Ungava",   label: "Ungava",     color: "#3b82f6"    },
  { key: "Argapura", label: "Argapura",   color: "#ef4444"    },
];

export function Leaderboard({ lapRecords, scouts }: LeaderboardProps) {
  const [tab, setTab] = useState<"best" | "average">("best");
  const [filter, setFilter] = useState<FilterMode>("all");

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, "0")}.${ms}`;
  };

  const filtered = lapRecords.filter((r) => {
    if (r.lapTime < 195) return false; // sub 3:15 physiquement impossible
    if (filter === "bike1") return r.bikeId === 1;
    if (filter === "bike2") return r.bikeId === 2;
    if (filter === "bike3") return r.bikeId === 3;
    if (filter === "Ungava" || filter === "Argapura") return r.troupe === filter;
    return true;
  });

  // Best lap times
  const bestTimes = new Map<string, { time: number; name: string; bikeId: 1 | 2 | 3; troupe: string }>();
  filtered.forEach((r) => {
    const existing = bestTimes.get(r.scoutId);
    if (!existing || r.lapTime < existing.time) {
      bestTimes.set(r.scoutId, { time: r.lapTime, name: r.scoutName, bikeId: r.bikeId, troupe: r.troupe });
    }
  });
  const bestTimesArray = Array.from(bestTimes.entries())
    .map(([id, data]) => ({ scoutId: id, ...data }))
    .sort((a, b) => a.time - b.time);

  // Average times
  const avgMap = new Map<string, { total: number; count: number; name: string; troupe: string; bike1: number; bike2: number; bike3: number }>();
  filtered.forEach((r) => {
    const existing = avgMap.get(r.scoutId);
    if (existing) {
      existing.total += r.lapTime;
      existing.count += 1;
      if (r.bikeId === 1) existing.bike1++;
      else if (r.bikeId === 2) existing.bike2++;
      else existing.bike3++;
    } else {
      avgMap.set(r.scoutId, {
        total: r.lapTime,
        count: 1,
        name: r.scoutName,
        troupe: r.troupe,
        bike1: r.bikeId === 1 ? 1 : 0,
        bike2: r.bikeId === 2 ? 1 : 0,
        bike3: r.bikeId === 3 ? 1 : 0,
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
      mainBike: (data.bike1 >= data.bike2 && data.bike1 >= data.bike3 ? 1 : data.bike2 >= data.bike3 ? 2 : 3) as 1 | 2 | 3,
    }))
    .sort((a, b) => a.avg - b.avg);

  const bikeLabel = (bikeId: 1 | 2 | 3) => bikeName(bikeId);
  const bikeClr = (bikeId: 1 | 2 | 3) => getBikeColor(bikeId);

  return (
    <div className="flex flex-col gap-3 font-['Inter']">
      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("best")}
          className={`flex-1 px-3 py-1.5 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-widest font-bold rounded transition-colors ${
            tab === "best" ? "bg-[#22c55e] text-black" : "bg-[#222] text-[#888] hover:bg-[#333]"
          }`}
        >
          <Clock className="w-3 h-3" />
          Meilleur Tour
        </button>
        <button
          onClick={() => setTab("average")}
          className={`flex-1 px-3 py-1.5 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-widest font-bold rounded transition-colors ${
            tab === "average" ? "bg-[#3b82f6] text-black" : "bg-[#222] text-[#888] hover:bg-[#333]"
          }`}
        >
          <TrendingUp className="w-3 h-3" />
          Temps Moyen
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-1 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-2 py-0.5 text-[9px] uppercase tracking-widest font-bold rounded border transition-colors ${
              filter === f.key
                ? "text-black border-transparent"
                : "bg-transparent text-[#666] border-[#333] hover:border-[#555]"
            }`}
            style={filter === f.key ? { backgroundColor: f.color, borderColor: f.color } : {}}
          >
            {f.label}
          </button>
        ))}
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
                  <div className="text-center font-['Roboto_Mono'] text-[10px] font-bold text-[#888]">{i + 1}</div>
                  <div className="min-w-0 pr-2">
                    <div className="text-[11px] font-bold text-[#ddd] uppercase truncate">{entry.name}</div>
                    <div className="text-[9px] uppercase tracking-widest mt-0.5 font-bold" style={{ color: bikeClr(entry.bikeId) }}>
                      {bikeLabel(entry.bikeId)}
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
                  <div className="text-center font-['Roboto_Mono'] text-[10px] font-bold text-[#888]">{i + 1}</div>
                  <div className="min-w-0 pr-2">
                    <div className="text-[11px] font-bold text-[#ddd] uppercase truncate">{entry.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] uppercase tracking-widest font-bold" style={{ color: bikeClr(entry.mainBike) }}>
                        {bikeLabel(entry.mainBike)}
                      </span>
                      <span className="text-[9px] text-[#555] font-['Roboto_Mono']">{entry.laps} TOURS</span>
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
