import { useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Check,
  X,
  Search,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useSharedState } from "./useSharedState";
import { AdminLogin, isAdminAuthenticated } from "./AdminLogin";
import {
  bikeName,
  bikeColor,
  bikeShortLabel,
  formatTimeFull,
  troupeColor,
} from "./types";
import type { LapRecord } from "./types";
import { toast, Toaster } from "sonner";

// ── Auth gate ──────────────────────────────────────────────────
export function LapHistoryPage() {
  const [isAuth, setIsAuth] = useState(isAdminAuthenticated());
  if (!isAuth) {
    return <AdminLogin onSuccess={() => setIsAuth(true)} />;
  }
  return <LapHistoryInner />;
}

// ── Parse MM:SS or raw seconds ─────────────────────────────────
function parseTime(raw: string): number | null {
  const parts = raw.trim().split(":");
  if (parts.length === 2) {
    const mins = parseInt(parts[0]);
    const secs = parseFloat(parts[1]);
    if (!isNaN(mins) && !isNaN(secs)) return mins * 60 + secs;
  } else if (parts.length === 1 && raw.trim() !== "") {
    const secs = parseFloat(raw.trim());
    if (!isNaN(secs) && secs > 0) return secs;
  }
  return null;
}

// ── Bike key helper ────────────────────────────────────────────
function bikeKey(bikeId: 1 | 2 | 3): "bike1" | "bike2" | "bike3" {
  return `bike${bikeId}` as "bike1" | "bike2" | "bike3";
}

// ── Main component ─────────────────────────────────────────────
function LapHistoryInner() {
  const { state, updateState } = useSharedState();
  const navigate = useNavigate();

  // ── Filters ────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [bikeFilter, setBikeFilter] = useState<"all" | 1 | 2 | 3>("all");
  const [troupeFilter, setTroupeFilter] = useState<"all" | "Ungava" | "Argapura" | "CuPiDon">("all");

  // ── Sort ───────────────────────────────────────────────────
  const [sortField, setSortField] = useState<"timestamp" | "lapTime">("timestamp");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // ── Inline edit ────────────────────────────────────────────
  const [editingTs, setEditingTs] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");

  // ── Add modal ──────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [addScoutSearch, setAddScoutSearch] = useState("");
  const [addScoutId, setAddScoutId] = useState<string | null>(null);
  const [addBike, setAddBike] = useState<1 | 2 | 3>(1);
  const [addTime, setAddTime] = useState("");
  const [addTimestamp, setAddTimestamp] = useState(() => {
    const now = new Date();
    now.setSeconds(0, 0);
    return now.toISOString().slice(0, 16);
  });

  // ── Filtered + sorted records ──────────────────────────────
  const filtered = state.lapRecords
    .filter((r) => {
      if (bikeFilter !== "all" && r.bikeId !== bikeFilter) return false;
      if (troupeFilter !== "all" && r.troupe !== troupeFilter) return false;
      if (search && !r.scoutName.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      return (a[sortField] - b[sortField]) * mul;
    });

  const toggleSort = (field: "timestamp" | "lapTime") => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  // ── Edit lap time ──────────────────────────────────────────
  const startEdit = (r: LapRecord) => {
    setEditingTs(r.timestamp);
    const mins = Math.floor(r.lapTime / 60);
    const secs = String(Math.floor(r.lapTime % 60)).padStart(2, "0");
    setEditDraft(`${mins}:${secs}`);
  };

  const confirmEdit = (timestamp: number) => {
    const secs = parseTime(editDraft);
    if (secs !== null && secs > 0) {
      updateState((prev) => ({
        ...prev,
        lapRecords: prev.lapRecords.map((r) =>
          r.timestamp === timestamp ? { ...r, lapTime: secs } : r
        ),
      }));
      toast.success("Temps modifié");
    } else {
      toast.error("Format invalide — utilise MM:SS");
    }
    setEditingTs(null);
  };

  // ── Delete lap ─────────────────────────────────────────────
  const deleteLap = (r: LapRecord) => {
    if (!window.confirm(`Supprimer le tour de ${r.scoutName} (${formatTimeFull(r.lapTime)}) ?`)) return;
    const bKey = bikeKey(r.bikeId);
    updateState((prev) => ({
      ...prev,
      lapRecords: prev.lapRecords.filter((rec) => rec.timestamp !== r.timestamp),
      [bKey]: {
        ...prev[bKey],
        totalLaps: Math.max(0, prev[bKey].totalLaps - 1),
      },
    }));
    toast.success("Tour supprimé");
  };

  // ── Add lap ────────────────────────────────────────────────
  const handleAddLap = () => {
    if (!addScoutId) { toast.error("Sélectionne un cycliste"); return; }
    const secs = parseTime(addTime);
    if (!secs || secs <= 0) { toast.error("Format invalide — utilise MM:SS"); return; }
    const scout = state.scouts.find((s) => s.id === addScoutId);
    if (!scout) { toast.error("Cycliste introuvable"); return; }
    const ts = new Date(addTimestamp).getTime() || Date.now();
    const bKey = bikeKey(addBike);
    const newRecord: LapRecord = {
      scoutId: scout.id,
      scoutName: scout.name,
      troupe: scout.troupe,
      bikeId: addBike,
      lapTime: secs,
      timestamp: ts,
    };
    updateState((prev) => ({
      ...prev,
      lapRecords: [...prev.lapRecords, newRecord],
      [bKey]: {
        ...prev[bKey],
        totalLaps: prev[bKey].totalLaps + 1,
      },
    }));
    toast.success(`Tour ajouté pour ${scout.name}`);
    setShowAddModal(false);
    setAddScoutId(null);
    setAddScoutSearch("");
    setAddTime("");
  };

  const filteredScoutsForAdd = state.scouts.filter((s) =>
    !addScoutSearch || s.name.toLowerCase().includes(addScoutSearch.toLowerCase())
  );

  const SortIcon = ({ field }: { field: "timestamp" | "lapTime" }) =>
    sortField === field ? (
      sortDir === "asc" ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />
    ) : null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] font-['Inter']">
      <Toaster position="top-center" theme="dark" richColors />

      {/* ── Add Lap Modal ──────────────────────────────────────── */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-[#111] border border-[#333] rounded-lg p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-widest">Ajouter un Tour</h2>
              <button onClick={() => setShowAddModal(false)} className="text-[#666] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Scout search */}
              <div>
                <label className="text-[10px] text-[#888] uppercase tracking-widest block mb-1">Cycliste</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555] pointer-events-none" />
                  <input
                    type="text"
                    value={addScoutSearch}
                    onChange={(e) => { setAddScoutSearch(e.target.value); setAddScoutId(null); }}
                    placeholder="Rechercher..."
                    className="w-full pl-8 pr-3 py-2 bg-[#0a0a0a] border border-[#333] rounded text-sm text-white outline-none focus:border-[#666] placeholder-[#555]"
                  />
                </div>
                {addScoutSearch && !addScoutId && filteredScoutsForAdd.length > 0 && (
                  <div className="mt-1 bg-[#1a1a1a] border border-[#333] rounded shadow-xl max-h-[180px] overflow-y-auto">
                    {filteredScoutsForAdd.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => { setAddScoutId(s.id); setAddScoutSearch(s.name); }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#2a2a2a] text-left border-b border-[#222] last:border-0"
                      >
                        <div className="w-1 h-4 rounded-sm flex-shrink-0" style={{ backgroundColor: troupeColor(s.troupe) }} />
                        <div>
                          <div className="text-xs font-bold text-[#eee] uppercase">{s.name}</div>
                          <div className="text-[9px] uppercase tracking-widest" style={{ color: troupeColor(s.troupe) }}>{s.troupe}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {addScoutId && (
                  <div className="mt-1 text-[10px] text-[#22c55e] uppercase tracking-widest">
                    ✓ {state.scouts.find((s) => s.id === addScoutId)?.name}
                  </div>
                )}
              </div>

              {/* Bike selector */}
              <div>
                <label className="text-[10px] text-[#888] uppercase tracking-widest block mb-1">Vélo</label>
                <div className="flex gap-2">
                  {([1, 2, 3] as const).map((b) => (
                    <button
                      key={b}
                      onClick={() => setAddBike(b)}
                      className="flex-1 py-2 rounded border text-[11px] font-bold uppercase tracking-widest transition-all"
                      style={
                        addBike === b
                          ? { backgroundColor: bikeColor(b), borderColor: bikeColor(b), color: "#000" }
                          : { backgroundColor: "transparent", borderColor: "#333", color: "#555" }
                      }
                    >
                      {bikeShortLabel(b)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time */}
              <div>
                <label className="text-[10px] text-[#888] uppercase tracking-widest block mb-1">Temps (MM:SS)</label>
                <input
                  type="text"
                  value={addTime}
                  onChange={(e) => setAddTime(e.target.value)}
                  placeholder="ex: 8:30"
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded text-sm text-white outline-none focus:border-[#666] placeholder-[#555] font-['Roboto_Mono']"
                />
              </div>

              {/* Timestamp */}
              <div>
                <label className="text-[10px] text-[#888] uppercase tracking-widest block mb-1">Date &amp; heure</label>
                <input
                  type="datetime-local"
                  value={addTimestamp}
                  onChange={(e) => setAddTimestamp(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded text-sm text-white outline-none focus:border-[#666]"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleAddLap}
                className="flex-1 px-4 py-2.5 bg-[#22c55e] text-black text-xs font-bold uppercase tracking-widest rounded hover:bg-[#16a34a] transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Ajouter le Tour
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2.5 bg-[#222] border border-[#333] text-white text-xs uppercase tracking-widest rounded hover:bg-[#333] transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="bg-[#111] border-b border-[#222] px-4 md:px-6 py-3 sticky top-0 z-20">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/admin")}
              className="p-1.5 bg-[#222] hover:bg-[#333] border border-[#333] rounded text-[#888] hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-sm font-bold tracking-widest uppercase text-white leading-none">
                Historique des Tours
              </h1>
              <div className="text-[10px] uppercase tracking-widest text-[#888] mt-1">
                {state.lapRecords.length} tours enregistrés
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setAddScoutSearch("");
              setAddScoutId(null);
              setAddTime("");
              setAddTimestamp(() => {
                const now = new Date();
                now.setSeconds(0, 0);
                return now.toISOString().slice(0, 16);
              });
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-[#22c55e] text-black text-[11px] font-bold uppercase tracking-widest rounded hover:bg-[#16a34a] transition-colors flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Ajouter un Tour
          </button>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6">
        {/* ── Filters ────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555] pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un cycliste..."
              className="w-full pl-8 pr-3 py-1.5 rounded bg-[#111] border border-[#333] text-xs text-[#ddd] outline-none focus:border-[#666] placeholder-[#555]"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#aaa]">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Bike filter */}
          <div className="flex gap-1">
            {(["all", 1, 2, 3] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBikeFilter(b)}
                className="px-2.5 py-1.5 text-[10px] uppercase tracking-widest font-bold rounded border transition-all"
                style={
                  bikeFilter === b
                    ? { backgroundColor: b === "all" ? "#333" : bikeColor(b), borderColor: b === "all" ? "#333" : bikeColor(b), color: b === "all" ? "#fff" : "#000" }
                    : { backgroundColor: "transparent", borderColor: "#333", color: "#555" }
                }
              >
                {b === "all" ? "Tous" : bikeShortLabel(b)}
              </button>
            ))}
          </div>

          {/* Troupe filter */}
          <div className="flex gap-1">
            {([
              { key: "all" as const, label: "Tous", clr: "#888" },
              { key: "Ungava" as const, label: "UNG", clr: troupeColor("Ungava") },
              { key: "Argapura" as const, label: "ARG", clr: troupeColor("Argapura") },
              { key: "CuPiDon" as const, label: "CUP", clr: troupeColor("CuPiDon") },
            ]).map((f) => (
              <button
                key={f.key}
                onClick={() => setTroupeFilter(f.key)}
                className="px-2.5 py-1.5 text-[10px] uppercase tracking-widest font-bold rounded border transition-all"
                style={
                  troupeFilter === f.key
                    ? { backgroundColor: f.clr, borderColor: f.clr, color: f.key === "all" ? "#fff" : "#000" }
                    : { backgroundColor: "transparent", borderColor: "#333", color: "#555" }
                }
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="text-[10px] text-[#555] uppercase tracking-widest self-center font-['Roboto_Mono'] ml-auto">
            {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* ── Table ──────────────────────────────────────────────── */}
        <div className="bg-[#111] rounded-md border border-[#222] overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-0 border-b border-[#222] bg-[#151515] px-4 py-2 text-[9px] uppercase tracking-widest text-[#555] font-bold">
            <div>Cycliste / Troupe</div>
            <div
              className="w-20 text-center cursor-pointer hover:text-[#aaa] select-none"
              onClick={() => toggleSort("timestamp")}
            >
              Heure <SortIcon field="timestamp" />
            </div>
            <div className="w-12 text-center">Vélo</div>
            <div
              className="w-24 text-right cursor-pointer hover:text-[#aaa] select-none"
              onClick={() => toggleSort("lapTime")}
            >
              Temps <SortIcon field="lapTime" />
            </div>
            <div className="w-16" />
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-[#444] text-[10px] uppercase tracking-widest">
              Aucun tour trouvé
            </div>
          ) : (
            <div className="divide-y divide-[#1a1a1a]">
              {filtered.map((r) => (
                <div
                  key={r.timestamp}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-0 px-4 py-2.5 items-center group hover:bg-[#151515] transition-colors"
                >
                  {/* Name + troupe */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-1 h-5 rounded-sm flex-shrink-0" style={{ backgroundColor: troupeColor(r.troupe) }} />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#eee] uppercase truncate">{r.scoutName}</div>
                      <div className="text-[9px] uppercase tracking-widest" style={{ color: troupeColor(r.troupe) }}>{r.troupe}</div>
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="w-20 text-center font-['Roboto_Mono'] text-[10px] text-[#888]">
                    {new Date(r.timestamp).toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" })}
                  </div>

                  {/* Bike badge */}
                  <div className="w-12 flex justify-center">
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold font-['Roboto_Mono'] text-black"
                      style={{ backgroundColor: bikeColor(r.bikeId) }}
                    >
                      {bikeShortLabel(r.bikeId)}
                    </span>
                  </div>

                  {/* Lap time — editable */}
                  <div className="w-24 flex justify-end">
                    {editingTs === r.timestamp ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") confirmEdit(r.timestamp);
                            if (e.key === "Escape") setEditingTs(null);
                          }}
                          autoFocus
                          className="w-16 px-1.5 py-0.5 bg-[#0a0a0a] border border-[#555] rounded text-[11px] text-white outline-none font-['Roboto_Mono'] text-right"
                        />
                        <button onClick={() => confirmEdit(r.timestamp)} className="text-[#22c55e] hover:text-white p-0.5">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingTs(null)} className="text-[#555] hover:text-white p-0.5">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(r)}
                        className="font-['Roboto_Mono'] text-[11px] font-bold text-[#22c55e] hover:text-white hover:underline transition-colors"
                        title="Cliquer pour modifier"
                      >
                        {formatTimeFull(r.lapTime)}
                      </button>
                    )}
                  </div>

                  {/* Delete */}
                  <div className="w-16 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => deleteLap(r)}
                      className="p-1.5 hover:bg-red-900/40 rounded text-[#444] hover:text-red-400 transition-colors"
                      title="Supprimer ce tour"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Summary stats ───────────────────────────────────────── */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {([1, 2, 3] as const).map((b) => {
            const bLaps = state.lapRecords.filter((r) => r.bikeId === b);
            const best = bLaps.length > 0 ? Math.min(...bLaps.map((r) => r.lapTime)) : null;
            const avg = bLaps.length > 0 ? bLaps.reduce((s, r) => s + r.lapTime, 0) / bLaps.length : null;
            return (
              <div key={b} className="bg-[#111] rounded-md border border-[#222] p-3">
                <div
                  className="text-[10px] font-bold uppercase tracking-widest mb-2"
                  style={{ color: bikeColor(b) }}
                >
                  {bikeName(b)}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-[9px] text-[#555] uppercase tracking-widest">Tours</div>
                    <div className="font-['Roboto_Mono'] text-white font-bold text-sm mt-0.5">{bLaps.length}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-[#555] uppercase tracking-widest">Meilleur</div>
                    <div className="font-['Roboto_Mono'] text-[#22c55e] font-bold text-xs mt-0.5">
                      {best !== null ? formatTimeFull(best) : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-[#555] uppercase tracking-widest">Moyenne</div>
                    <div className="font-['Roboto_Mono'] text-[#3b82f6] font-bold text-xs mt-0.5">
                      {avg !== null ? formatTimeFull(avg) : "—"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .divide-y > * + * { border-top-width: 1px; }
      `}</style>
    </div>
  );
}
