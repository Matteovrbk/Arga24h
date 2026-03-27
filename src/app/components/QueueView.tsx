import { useState, useEffect } from "react";
import { useSharedState } from "./useSharedState";
import {
  bikeName,
  bikeColor,
  troupeColor,
  formatTimeShort,
  formatDuration,
} from "./types";
import type { BikeState, AppState } from "./types";

const SHARE_URL = "https://www.ungapura24h.xyz/";

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Average lap time in seconds from the last N records */
function avgLapTime(lapRecords: AppState["lapRecords"], bikeId: 1 | 2 | 3, n = 10): number {
  const relevant = lapRecords
    .filter((r) => r.bikeId === bikeId)
    .slice(-n);
  if (relevant.length === 0) return 600; // default 10 min
  const sum = relevant.reduce((acc, r) => acc + r.lapTime, 0);
  return sum / relevant.length;
}

interface QueueEntry {
  scoutId: string;
  scoutName: string;
  troupe: string;
  plannedLaps: number;
  /** wait in milliseconds from now before this person starts riding */
  waitMs: number;
  /** expected start timestamp */
  expectedStartTs: number;
}

function buildQueueEntries(
  bike: BikeState,
  scouts: AppState["scouts"],
  lapRecords: AppState["lapRecords"],
  bikeId: 1 | 2 | 3,
  now: number
): { current: (QueueEntry & { elapsedSec: number; expectedLapSec: number }) | null; queue: QueueEntry[] } {
  const avg = avgLapTime(lapRecords, bikeId);

  // Remaining time for current rider
  let remainingMs = 0;
  let current: (QueueEntry & { elapsedSec: number; expectedLapSec: number }) | null = null;

  if (bike.currentRiderId && bike.lapStartTime) {
    const elapsed = (now - bike.lapStartTime) / 1000;
    const remaining = Math.max(0, avg - elapsed);
    remainingMs = remaining * 1000;

    const scout = scouts.find((s) => s.id === bike.currentRiderId);
    current = {
      scoutId: bike.currentRiderId,
      scoutName: scout?.name ?? bike.currentRiderId,
      troupe: scout?.troupe ?? "",
      plannedLaps: 1,
      waitMs: 0,
      expectedStartTs: bike.lapStartTime,
      elapsedSec: elapsed,
      expectedLapSec: avg,
    };
  }

  // Build queue entries
  let cumulativeMs = remainingMs;
  const queue: QueueEntry[] = bike.queue.map((scoutId, i) => {
    const scout = scouts.find((s) => s.id === scoutId);
    const planned = bike.queuePlannedLaps?.[i] ?? 1;
    const startMs = cumulativeMs;
    const entry: QueueEntry = {
      scoutId,
      scoutName: scout?.name ?? scoutId,
      troupe: scout?.troupe ?? "",
      plannedLaps: planned,
      waitMs: startMs,
      expectedStartTs: now + startMs,
    };
    cumulativeMs += planned * avg * 1000;
    return entry;
  });

  return { current, queue };
}

function formatExpectedTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("fr-BE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface BikeQueueCardProps {
  bikeId: 1 | 2 | 3;
  state: AppState;
  now: number;
}

function BikeQueueCard({ bikeId, state, now }: BikeQueueCardProps) {
  const bike = bikeId === 1 ? state.bike1 : bikeId === 2 ? state.bike2 : state.bike3;
  const color = bikeColor(bikeId);
  const { current, queue } = buildQueueEntries(bike, state.scouts, state.lapRecords, bikeId, now);

  const elapsedPct = current && current.expectedLapSec > 0
    ? Math.min(100, (current.elapsedSec / current.expectedLapSec) * 100)
    : 0;

  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden border"
      style={{ borderColor: color + "55" }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{ backgroundColor: color + "22" }}
      >
        <span
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="font-bold text-white text-lg">{bikeName(bikeId)}</span>
        <span className="ml-auto text-[#888] text-sm font-['Roboto_Mono']">
          {queue.length + (current ? 1 : 0)} personne{queue.length + (current ? 1 : 0) !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Current rider */}
      {current ? (
        <div className="px-4 py-3 border-b border-[#333]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#888]">En cours</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: color }}
              />
              <span className="font-bold text-white">{current.scoutName}</span>
              {current.troupe && (
                <span
                  className="text-xs font-semibold"
                  style={{ color: troupeColor(current.troupe) }}
                >
                  {current.troupe}
                </span>
              )}
            </div>
            <span className="font-['Roboto_Mono'] text-sm text-[#ccc]">
              {formatTimeShort(current.elapsedSec)}
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-1.5 rounded-full bg-[#333] overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${elapsedPct}%`, backgroundColor: color }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-[#666] font-['Roboto_Mono']">
            <span>{formatTimeShort(current.elapsedSec)}</span>
            <span>~{formatTimeShort(current.expectedLapSec)}</span>
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 border-b border-[#333] text-[#555] text-sm italic">
          Aucun cycliste en cours
        </div>
      )}

      {/* Queue list */}
      <div className="flex flex-col divide-y divide-[#222]">
        {queue.length === 0 ? (
          <div className="px-4 py-4 text-[#555] text-sm italic text-center">
            File d'attente vide
          </div>
        ) : (
          queue.map((entry, i) => (
            <div key={entry.scoutId + i} className="px-4 py-2.5 flex items-center gap-3">
              {/* Position */}
              <span className="w-5 text-center text-[#666] text-xs font-['Roboto_Mono'] shrink-0">
                {i + 1}
              </span>
              {/* Name & troupe */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[#ddd] truncate">{entry.scoutName}</div>
                {entry.troupe && (
                  <div
                    className="text-[11px] font-medium"
                    style={{ color: troupeColor(entry.troupe) }}
                  >
                    {entry.troupe}
                  </div>
                )}
              </div>
              {/* Planned laps */}
              <div className="text-[11px] text-[#666] font-['Roboto_Mono'] shrink-0">
                {entry.plannedLaps} tour{entry.plannedLaps > 1 ? "s" : ""}
              </div>
              {/* Wait time */}
              <div className="text-right shrink-0">
                <div className="text-white font-bold font-['Roboto_Mono'] text-sm">
                  {formatExpectedTime(entry.expectedStartTs)}
                </div>
                <div className="text-[11px] text-[#666] font-['Roboto_Mono']">
                  ~{formatDuration(entry.waitMs)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function QueueView() {
  const { state } = useSharedState(true);
  const now = useNow(1000);

  // Event countdown / elapsed
  const eventElapsedMs = state.raceStarted ? now - state.eventStartTime : 0;
  const durationMs = state.eventConfig?.durationMs ?? 86400000;
  const remainingMs = Math.max(0, durationMs - eventElapsedMs);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#222] bg-[#111]">
        <div>
          <div className="font-bold text-white text-base">
            {state.eventConfig?.eventName ?? "24H Vélo"}
          </div>
          <div className="text-[11px] text-[#888] font-['Roboto_Mono']">
            {state.raceStarted ? (
              <>Temps restant : <span className="text-[#eee]">{formatDuration(remainingMs)}</span></>
            ) : (
              "Course non démarrée"
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[10px] text-[#555]">File d'attente</span>
          <span className="text-[11px] text-[#888] font-['Roboto_Mono']">
            {new Date(now).toLocaleTimeString("fr-BE")}
          </span>
        </div>
      </header>

      {/* Legend */}
      <div className="px-4 pt-3 pb-1 text-[11px] text-[#666] flex gap-4 flex-wrap">
        <span>Les horaires sont estimés d'après la vitesse moyenne des tours précédents.</span>
      </div>

      {/* Bike queue cards */}
      <main className="flex-1 px-4 py-4 grid gap-4 sm:grid-cols-1 md:grid-cols-3 content-start">
        <BikeQueueCard bikeId={1} state={state} now={now} />
        <BikeQueueCard bikeId={2} state={state} now={now} />
        <BikeQueueCard bikeId={3} state={state} now={now} />
      </main>

      {/* Footer */}
      <footer className="px-4 py-3 border-t border-[#1a1a1a] text-center text-[10px] text-[#444]">
        {SHARE_URL} — vue file d'attente (lecture seule)
      </footer>
    </div>
  );
}
