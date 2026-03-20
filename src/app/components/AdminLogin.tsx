import { useState, useRef, useEffect } from "react";
import { ShieldCheck, Lock, AlertTriangle } from "lucide-react";

// Mot de passe admin — à changer selon vos besoins
const ADMIN_PASSWORD = "sp51";

const AUTH_KEY = "sp51_admin_auth";

export function isAdminAuthenticated(): boolean {
  return sessionStorage.getItem(AUTH_KEY) === "true";
}

export function logoutAdmin() {
  sessionStorage.removeItem(AUTH_KEY);
}

interface AdminLoginProps {
  onSuccess: () => void;
}

export function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current); }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, "true");
      onSuccess();
    } else {
      setError(true);
      setShake(true);
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = setTimeout(() => setShake(false), 500);
      setPassword("");
    }
  };

  return (
    <div className="dark min-h-screen bg-[#050505] flex items-center justify-center font-['Inter']">
      <div
        className={`w-full max-w-sm bg-[#111] border border-[#222] rounded-md shadow-2xl overflow-hidden ${
          shake ? "animate-[shake_0.5s_ease-in-out]" : ""
        }`}
      >
        {/* Header */}
        <div className="bg-[#151515] border-b border-[#222] px-6 py-4 flex items-center gap-3">
          <div className="bg-[#e11d48] p-2 rounded-md shadow-[0_0_15px_rgba(225,29,72,0.4)]">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-widest uppercase text-white m-0 leading-none">
              Accès Opérateur
            </h1>
            <div className="text-[10px] uppercase tracking-widest text-[#666] mt-1">
              SAINT-PAUL 51 &bull; RACE CONTROL
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#666] font-bold block mb-2">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                placeholder="ENTRER LE MOT DE PASSE..."
                autoFocus
                className="w-full pl-10 pr-4 py-3 rounded bg-[#0a0a0a] border border-[#333] text-sm font-bold text-[#eee] uppercase placeholder:text-[#444] placeholder:text-xs outline-none focus:border-[#e11d48] transition-colors font-['Roboto_Mono']"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-[#ef4444] text-[10px] uppercase tracking-widest">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="font-bold">Mot de passe incorrect</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-[#e11d48] hover:bg-[#be123c] text-white font-bold text-xs uppercase tracking-widest rounded transition-colors shadow-[0_0_20px_rgba(225,29,72,0.3)]"
          >
            Connexion
          </button>
        </form>

        {/* Footer */}
        <div className="px-6 pb-4">
          <div className="text-[9px] text-[#444] uppercase tracking-widest text-center font-['Roboto_Mono']">
            SESSION SÉCURISÉE &bull; EXPIRE À LA FERMETURE DU NAVIGATEUR
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
