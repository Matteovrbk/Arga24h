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
  bikeId: 1 | 2;
  lapTime: number; // in seconds
  timestamp: number;
}

export interface BikeState {
  queue: string[]; // scout ids
  currentRiderId: string | null;
  lapCount: number;
  lapStartTime: number | null;
  totalLaps: number;
}

export interface EventConfig {
  eventName: string;
  startTime: number; // timestamp ms
  durationMs: number; // 24h = 86400000
  circuitLengthKm: number; // 2.2
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
};

export const INITIAL_SCOUTS: Scout[] = [];

export const BIKE1_COLOR = "#16a34a";
export const BIKE2_COLOR = "#ea580c";

export const DEFAULT_EVENT_CONFIG: EventConfig = {
  eventName: "24H Vélo — Saint-Paul 51",
  startTime: Date.now(),
  durationMs: 86400000,
  circuitLengthKm: 2.2,
};

export const LAP_VALIDATION_THRESHOLDS = {
  tooFastSeconds: 120,  // 2 min
  tooSlowSeconds: 1200, // 20 min
};

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
