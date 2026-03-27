export interface Scout {
  id: string;
  name: string;
  troupe: "Ungava" | "Argapura";
  role: "scout" | "animateur";
}

export interface LapRecord {
  scoutId: string;
  scoutName: string;
  troupe: string;
  bikeId: 1 | 2 | 3;
  lapTime: number; // in seconds
  timestamp: number;
}

export interface BikeState {
  queue: string[]; // scout ids
  currentRiderId: string | null;
  lapCount: number;
  lapStartTime: number | null;
  totalLaps: number;
  queuePlannedLaps: number[]; // planned laps per queue entry (parallel to queue)
}

export interface EventConfig {
  eventName: string;
  startTime: number; // timestamp ms
  durationMs: number; // 24h = 86400000
  circuitLengthKm: number; // 2.61
}

export interface LapFlag {
  type: "valid" | "too-fast" | "too-slow";
  threshold?: number;
}

export interface CommentaryMessage {
  id: string;
  text: string;
  timestamp: number;
  type: "system" | "manual";
}

export interface AppState {
  scouts: Scout[];
  bike1: BikeState;
  bike2: BikeState;
  bike3: BikeState;
  lapRecords: LapRecord[];
  eventStartTime: number;
  eventConfig?: EventConfig;
  commentary: CommentaryMessage[];
  lapFlags: Record<string, LapFlag>;
  raceStarted?: boolean;
}

export const INITIAL_BIKE_STATE: BikeState = {
  queue: [],
  currentRiderId: null,
  lapCount: 0,
  lapStartTime: null,
  totalLaps: 0,
  queuePlannedLaps: [],
};

export const INITIAL_SCOUTS: Scout[] = [];

export const BIKE1_COLOR = "#16a34a";
export const BIKE2_COLOR = "#ea580c";
export const BIKE3_COLOR = "#dc2626";

export const DEFAULT_EVENT_CONFIG: EventConfig = {
  eventName: "24H Vélo — Saint-Paul 51",
  startTime: Date.now(),
  durationMs: 86400000,
  circuitLengthKm: 2.61,
};

export const LAP_VALIDATION_THRESHOLDS = {
  tooFastSeconds: 120,  // 2 min
  tooSlowSeconds: 1200, // 20 min
};

export function bikeName(bikeId: 1 | 2 | 3): string {
  if (bikeId === 3) return "Vélo \u03C0";
  return `Vélo ${bikeId}`;
}

export function bikeShortLabel(bikeId: 1 | 2 | 3): string {
  if (bikeId === 3) return "V\u03C0";
  return `V${bikeId}`;
}

export function bikeColor(bikeId: 1 | 2 | 3): string {
  if (bikeId === 1) return BIKE1_COLOR;
  if (bikeId === 2) return BIKE2_COLOR;
  return BIKE3_COLOR;
}

export function formatTimeFull(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${mins}:${secs.toString().padStart(2, "0")}.${ms}`;
}

export function formatTimeShort(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function formatDuration(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
