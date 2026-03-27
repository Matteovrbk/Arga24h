import { useState, useCallback, memo } from "react";
import { UserPlus, Trash2, Upload, FileSpreadsheet, X, Shield, Users, Pencil, Check, Heart } from "lucide-react";
import * as XLSX from "xlsx";
import type { Scout } from "./types";
import { troupeColor } from "./types";

interface ScoutManagerProps {
  scouts: Scout[];
  onAddScout: (scout: Scout) => void;
  onRemoveScout: (id: string) => void;
  onImportScouts: (scouts: Scout[]) => void;
  onUpdateScout: (id: string, updates: Partial<Pick<Scout, "name" | "troupe" | "role">>) => void;
}

const TROUPE_OPTIONS: { value: Scout["troupe"]; label: string }[] = [
  { value: "Ungava", label: "UNGAVA" },
  { value: "Argapura", label: "ARGAPURA" },
  { value: "CuPiDon", label: "CUPIDON" },
];

const ROLE_OPTIONS: { value: Scout["role"]; label: string }[] = [
  { value: "scout", label: "SCOUT" },
  { value: "animateur", label: "ANIMATEUR" },
];

function TroupeBadge({ troupe }: { troupe: string }) {
  const color = troupeColor(troupe);
  return (
    <span
      className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded font-bold font-['Roboto_Mono'] shrink-0"
      style={{
        color,
        backgroundColor: color + "18",
        border: `1px solid ${color}33`,
      }}
    >
      {troupe === "CuPiDon" ? "CUP" : troupe.substring(0, 3)}
    </span>
  );
}

interface ScoutRowProps {
  s: Scout;
  editingId: string | null;
  editName: string;
  onSetEditName: (v: string) => void;
  onStartEdit: (scout: Scout) => void;
  onSaveEdit: (id: string) => void;
  onUpdateScout: (id: string, updates: Partial<Pick<Scout, "name" | "troupe" | "role">>) => void;
  onRemoveScout: (id: string) => void;
}

function ScoutRow({ s, editingId, editName, onSetEditName, onStartEdit, onSaveEdit, onUpdateScout, onRemoveScout }: ScoutRowProps) {
  const isEditing = editingId === s.id;
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-[#151515] border border-[#222] rounded group hover:border-[#333]">
      {isEditing ? (
        <input
          type="text"
          value={editName}
          onChange={(e) => onSetEditName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSaveEdit(s.id)}
          autoFocus
          className="flex-1 px-2 py-0.5 bg-[#0a0a0a] border border-[#444] rounded text-[11px] font-bold text-white uppercase outline-none focus:border-[#666] min-w-0"
        />
      ) : (
        <span className="text-[11px] font-bold text-[#ddd] uppercase truncate flex-1 min-w-0">{s.name}</span>
      )}
      <TroupeBadge troupe={s.troupe} />
      <select
        value={s.troupe}
        onChange={(e) => onUpdateScout(s.id, { troupe: e.target.value as Scout["troupe"] })}
        className="bg-[#0a0a0a] border border-[#333] rounded text-[9px] text-[#aaa] uppercase px-1 py-0.5 outline-none opacity-0 group-hover:opacity-100 transition-opacity w-[70px]"
      >
        {TROUPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <select
        value={s.role}
        onChange={(e) => onUpdateScout(s.id, { role: e.target.value as Scout["role"] })}
        className="bg-[#0a0a0a] border border-[#333] rounded text-[9px] text-[#aaa] uppercase px-1 py-0.5 outline-none opacity-0 group-hover:opacity-100 transition-opacity w-[65px]"
      >
        {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
      </select>
      {isEditing ? (
        <button onClick={() => onSaveEdit(s.id)} className="p-1 text-[#22c55e] hover:text-[#16a34a]">
          <Check className="w-3.5 h-3.5" />
        </button>
      ) : (
        <button onClick={() => onStartEdit(s)} className="p-1 text-[#555] hover:text-[#aaa] opacity-0 group-hover:opacity-100 transition-opacity">
          <Pencil className="w-3 h-3" />
        </button>
      )}
      <button
        onClick={() => onRemoveScout(s.id)}
        className="p-1 text-[#555] hover:text-[#ef4444] transition-colors opacity-0 group-hover:opacity-100"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export const ScoutManager = memo(function ScoutManager({ scouts, onAddScout, onRemoveScout, onImportScouts, onUpdateScout }: ScoutManagerProps) {
  const [name, setName] = useState("");
  const [troupe, setTroupe] = useState<Scout["troupe"]>("Ungava");
  const [role, setRole] = useState<Scout["role"]>("scout");
  const [isDragging, setIsDragging] = useState(false);
  const [importPreview, setImportPreview] = useState<Scout[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [filterTroupe, setFilterTroupe] = useState<"all" | Scout["troupe"]>("all");
  const [searchFilter, setSearchFilter] = useState("");

  const handleAdd = () => {
    if (!name.trim()) return;
    onAddScout({
      id: crypto.randomUUID(),
      name: name.trim(),
      troupe,
      role,
    });
    setName("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
  };

  const startEdit = (scout: Scout) => {
    setEditingId(scout.id);
    setEditName(scout.name);
  };

  const saveEdit = (id: string) => {
    if (editName.trim()) {
      onUpdateScout(id, { name: editName.trim() });
    }
    setEditingId(null);
  };

  const filteredScouts = scouts.filter((s) => {
    if (filterTroupe !== "all" && s.troupe !== filterTroupe) return false;
    if (searchFilter && !s.name.toLowerCase().includes(searchFilter.toLowerCase())) return false;
    return true;
  });

  const animateurs = filteredScouts.filter((s) => s.role === "animateur");
  const scoutsList = filteredScouts.filter((s) => s.role === "scout");

  const parseExcelFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        if (!workbook.SheetNames.length) throw new Error("Fichier Excel vide");
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

        const parsed: Scout[] = rows
          .filter((row) => {
            const nom = row["Nom"] || row["nom"] || row["Name"] || row["name"] || row["NOM"] || "";
            return nom.trim().length > 0;
          })
          .map((row) => {
            const nom = (row["Nom"] || row["nom"] || row["Name"] || row["name"] || row["NOM"] || "").trim();
            const rawTroupe = (row["Troupe"] || row["troupe"] || row["TROUPE"] || row["Groupe"] || row["groupe"] || "").trim().toLowerCase();
            const rawRole = (row["Role"] || row["role"] || row["Rôle"] || row["rôle"] || row["ROLE"] || row["Type"] || row["type"] || "").trim().toLowerCase();

            const troupe: Scout["troupe"] =
              rawTroupe.includes("cupi") || rawTroupe.includes("pion") ? "CuPiDon" :
              rawTroupe.includes("arga") ? "Argapura" : "Ungava";
            const role: Scout["role"] =
              rawRole.includes("anim") ? "animateur" : "scout";

            return { id: crypto.randomUUID(), name: nom, troupe, role };
          });

        if (parsed.length > 0) {
          setImportPreview(parsed);
        }
      } catch {
        // Silent fail — invalid file
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.name.endsWith(".csv"))) {
        parseExcelFile(file);
      }
    },
    [parseExcelFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) parseExcelFile(file);
      e.target.value = "";
    },
    [parseExcelFile]
  );

  const confirmImport = () => {
    if (importPreview) {
      onImportScouts(importPreview);
      setImportPreview(null);
    }
  };

  const ScoutRow = ({ s }: { s: Scout }) => {
    const isEditing = editingId === s.id;

    return (
      <div className="flex items-center gap-2 px-2 py-1.5 bg-[#151515] border border-[#222] rounded group hover:border-[#333]">
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveEdit(s.id)}
            autoFocus
            className="flex-1 px-2 py-0.5 bg-[#0a0a0a] border border-[#444] rounded text-[11px] font-bold text-white uppercase outline-none focus:border-[#666] min-w-0"
          />
        ) : (
          <span className="text-[11px] font-bold text-[#ddd] uppercase truncate flex-1 min-w-0">{s.name}</span>
        )}
        <TroupeBadge troupe={s.troupe} />
        {/* Troupe select */}
        <select
          value={s.troupe}
          onChange={(e) => onUpdateScout(s.id, { troupe: e.target.value as Scout["troupe"] })}
          className="bg-[#0a0a0a] border border-[#333] rounded text-[9px] text-[#aaa] uppercase px-1 py-0.5 outline-none opacity-0 group-hover:opacity-100 transition-opacity w-[70px]"
        >
          {TROUPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {/* Role select */}
        <select
          value={s.role}
          onChange={(e) => onUpdateScout(s.id, { role: e.target.value as Scout["role"] })}
          className="bg-[#0a0a0a] border border-[#333] rounded text-[9px] text-[#aaa] uppercase px-1 py-0.5 outline-none opacity-0 group-hover:opacity-100 transition-opacity w-[65px]"
        >
          {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        {/* Edit/Save name */}
        {isEditing ? (
          <button onClick={() => saveEdit(s.id)} className="p-1 text-[#22c55e] hover:text-[#16a34a]">
            <Check className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button onClick={() => startEdit(s)} className="p-1 text-[#555] hover:text-[#aaa] opacity-0 group-hover:opacity-100 transition-opacity">
            <Pencil className="w-3 h-3" />
          </button>
        )}
        {/* Delete */}
        <button
          onClick={() => onRemoveScout(s.id)}
          className="p-1 text-[#555] hover:text-[#ef4444] transition-colors opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  return (
    <div className="bg-[#111] border border-[#222] rounded-md p-4 space-y-4 font-['Inter'] shadow-lg">
      {/* Import Preview Modal */}
      {importPreview && (
        <div className="bg-[#0a0a0a] border border-[#333] rounded-md p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#22c55e]" />
              <span className="text-xs font-bold uppercase tracking-widest text-[#22c55e]">
                Apercu Import — {importPreview.length} personnes
              </span>
            </div>
            <button onClick={() => setImportPreview(null)} className="text-[#555] hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {importPreview.map((s, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1 bg-[#151515] border border-[#222] rounded text-[11px]">
                <span className="font-bold text-[#ddd] uppercase flex-1 truncate">{s.name}</span>
                <TroupeBadge troupe={s.troupe} />
                <span
                  className="text-[9px] uppercase px-1.5 py-0.5 rounded font-['Roboto_Mono']"
                  style={{ color: s.role === "animateur" ? "#eab308" : "#888" }}
                >
                  {s.role === "animateur" ? "ANIM" : "SCOUT"}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={confirmImport}
              className="flex-1 px-4 py-2 bg-[#22c55e] text-black text-xs font-bold uppercase tracking-widest rounded hover:bg-[#16a34a] transition-colors"
            >
              Confirmer l'import
            </button>
            <button
              onClick={() => setImportPreview(null)}
              className="px-4 py-2 bg-[#222] border border-[#333] text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-[#333] transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-md p-4 text-center transition-all cursor-pointer ${
          isDragging
            ? "border-[#22c55e] bg-[#22c55e]/5"
            : "border-[#333] hover:border-[#555]"
        }`}
        onClick={() => document.getElementById("excel-input")?.click()}
      >
        <input
          id="excel-input"
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileInput}
          className="hidden"
        />
        <Upload className={`w-5 h-5 mx-auto mb-2 ${isDragging ? "text-[#22c55e]" : "text-[#555]"}`} />
        <div className={`text-[10px] uppercase tracking-widest font-bold ${isDragging ? "text-[#22c55e]" : "text-[#666]"}`}>
          Glisser un fichier Excel ici ou cliquer pour importer
        </div>
        <div className="text-[9px] text-[#444] uppercase tracking-wider mt-1 font-['Roboto_Mono']">
          Colonnes : Nom, Troupe (Ungava/Argapura/CuPiDon), Role (Scout/Animateur)
        </div>
      </div>

      {/* Manual Add */}
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="NOM DU CYCLISTE..."
          className="flex-1 px-3 py-2 rounded bg-[#151515] border border-[#333] text-xs font-bold text-[#eee] uppercase placeholder:text-[#555] outline-none focus:border-[#666]"
        />
        <select
          value={troupe}
          onChange={(e) => setTroupe(e.target.value as Scout["troupe"])}
          className="px-3 py-2 rounded bg-[#151515] border border-[#333] text-xs font-bold text-[#eee] uppercase outline-none focus:border-[#666]"
        >
          {TROUPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Scout["role"])}
          className="px-3 py-2 rounded bg-[#151515] border border-[#333] text-xs font-bold text-[#eee] uppercase outline-none focus:border-[#666]"
        >
          {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-[#222] border border-[#333] text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-[#333] transition-colors flex items-center gap-2"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Ajouter
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 pt-2 border-t border-[#222]">
        <input
          type="text"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          placeholder="Filtrer par nom..."
          className="flex-1 px-3 py-1.5 rounded bg-[#0a0a0a] border border-[#222] text-[11px] text-[#ddd] outline-none focus:border-[#444] placeholder:text-[#555]"
        />
        <div className="flex gap-1">
          {[{ key: "all" as const, label: "TOUS", color: "#888" }, ...TROUPE_OPTIONS.map(t => ({ key: t.value, label: t.label.substring(0, 3), color: troupeColor(t.value) }))].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterTroupe(f.key as typeof filterTroupe)}
              className="px-2 py-1 text-[9px] uppercase tracking-widest font-bold rounded border transition-all"
              style={
                filterTroupe === f.key
                  ? { backgroundColor: f.color, borderColor: f.color, color: "#000" }
                  : { backgroundColor: "transparent", borderColor: "#333", color: "#666" }
              }
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-[#555] font-['Roboto_Mono'] shrink-0">
          {filteredScouts.length}/{scouts.length}
        </span>
      </div>

      {/* Lists: Animateurs + Scouts */}
      <div className="grid grid-cols-2 gap-4">
        {/* Animateurs */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#eab308]" />
              <h3 className="text-xs uppercase tracking-widest font-bold text-[#eab308] m-0">Animateurs</h3>
            </div>
            <span className="text-[10px] text-[#555] font-['Roboto_Mono']">{animateurs.length} TOTAL</span>
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar pr-1">
            {animateurs.map((s) => (
              <ScoutRow key={s.id} s={s} editingId={editingId} editName={editName} onSetEditName={setEditName} onStartEdit={startEdit} onSaveEdit={saveEdit} onUpdateScout={onUpdateScout} onRemoveScout={onRemoveScout} />
            ))}
            {animateurs.length === 0 && (
              <div className="text-[10px] uppercase tracking-widest font-['Roboto_Mono'] text-[#444] text-center py-4 border border-dashed border-[#222] rounded">
                AUCUN ANIMATEUR
              </div>
            )}
          </div>
        </div>

        {/* Scouts */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#888]" />
              <h3 className="text-xs uppercase tracking-widest font-bold text-[#ccc] m-0">Scouts</h3>
            </div>
            <span className="text-[10px] text-[#555] font-['Roboto_Mono']">{scoutsList.length} TOTAL</span>
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar pr-1">
            {scoutsList.map((s) => (
              <ScoutRow key={s.id} s={s} editingId={editingId} editName={editName} onSetEditName={setEditName} onStartEdit={startEdit} onSaveEdit={saveEdit} onUpdateScout={onUpdateScout} onRemoveScout={onRemoveScout} />
            ))}
            {scoutsList.length === 0 && (
              <div className="text-[10px] uppercase tracking-widest font-['Roboto_Mono'] text-[#444] text-center py-4 border border-dashed border-[#222] rounded">
                AUCUN SCOUT
              </div>
            )}
          </div>
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
});
