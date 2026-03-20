import { useState, useCallback } from "react";
import { UserPlus, Trash2, Upload, FileSpreadsheet, X, Shield, Users } from "lucide-react";
import * as XLSX from "xlsx";
import type { Scout } from "./types";

interface ScoutManagerProps {
  scouts: Scout[];
  onAddScout: (scout: Scout) => void;
  onRemoveScout: (id: string) => void;
  onImportScouts: (scouts: Scout[]) => void;
}

export function ScoutManager({ scouts, onAddScout, onRemoveScout, onImportScouts }: ScoutManagerProps) {
  const [name, setName] = useState("");
  const [troupe, setTroupe] = useState<"Ungava" | "Argapura">("Ungava");
  const [role, setRole] = useState<"scout" | "animateur">("scout");
  const [isDragging, setIsDragging] = useState(false);
  const [importPreview, setImportPreview] = useState<Scout[] | null>(null);

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

  const animateurs = scouts.filter((s) => s.role === "animateur");
  const scoutsList = scouts.filter((s) => s.role === "scout");

  const parseExcelFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
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

            const troupe: "Ungava" | "Argapura" =
              rawTroupe.includes("arga") ? "Argapura" : "Ungava";
            const role: "scout" | "animateur" =
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

  const ScoutRow = ({ s }: { s: Scout }) => (
    <div
      className="flex items-center justify-between px-2 py-1.5 bg-[#151515] border border-[#222] rounded group hover:border-[#333]"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[11px] font-bold text-[#ddd] uppercase truncate">{s.name}</span>
        <span
          className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded font-bold font-['Roboto_Mono'] shrink-0"
          style={{
            color: s.troupe === "Ungava" ? "#3b82f6" : "#ef4444",
            backgroundColor: s.troupe === "Ungava" ? "rgba(59,130,246,0.1)" : "rgba(239,68,68,0.1)",
            border: `1px solid ${s.troupe === "Ungava" ? "rgba(59,130,246,0.2)" : "rgba(239,68,68,0.2)"}`,
          }}
        >
          {s.troupe.substring(0, 3)}
        </span>
      </div>
      <button
        onClick={() => onRemoveScout(s.id)}
        className="text-[#555] hover:text-[#ef4444] transition-colors opacity-0 group-hover:opacity-100"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  return (
    <div className="bg-[#111] border border-[#222] rounded-md p-4 space-y-4 font-['Inter'] shadow-lg">
      {/* Import Preview Modal */}
      {importPreview && (
        <div className="bg-[#0a0a0a] border border-[#333] rounded-md p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#22c55e]" />
              <span className="text-xs font-bold uppercase tracking-widest text-[#22c55e]">
                Aperçu Import — {importPreview.length} personnes
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
                <span
                  className="text-[9px] uppercase px-1.5 py-0.5 rounded font-['Roboto_Mono']"
                  style={{ color: s.troupe === "Ungava" ? "#3b82f6" : "#ef4444" }}
                >
                  {s.troupe.substring(0, 3)}
                </span>
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
          Colonnes : Nom, Troupe (Ungava/Argapura), Rôle (Scout/Animateur)
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
          onChange={(e) => setTroupe(e.target.value as "Ungava" | "Argapura")}
          className="px-3 py-2 rounded bg-[#151515] border border-[#333] text-xs font-bold text-[#eee] uppercase outline-none focus:border-[#666]"
        >
          <option value="Ungava">UNGAVA</option>
          <option value="Argapura">ARGAPURA</option>
        </select>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "scout" | "animateur")}
          className="px-3 py-2 rounded bg-[#151515] border border-[#333] text-xs font-bold text-[#eee] uppercase outline-none focus:border-[#666]"
        >
          <option value="scout">SCOUT</option>
          <option value="animateur">ANIMATEUR</option>
        </select>
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-[#222] border border-[#333] text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-[#333] transition-colors flex items-center gap-2"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Ajouter
        </button>
      </div>

      {/* Lists: Animateurs + Scouts */}
      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#222]">
        {/* Animateurs */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#eab308]" />
              <h3 className="text-xs uppercase tracking-widest font-bold text-[#eab308] m-0">Animateurs</h3>
            </div>
            <span className="text-[10px] text-[#555] font-['Roboto_Mono']">{animateurs.length} TOTAL</span>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
            {animateurs.map((s) => (
              <ScoutRow key={s.id} s={s} />
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
          <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
            {scoutsList.map((s) => (
              <ScoutRow key={s.id} s={s} />
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
}
