"use client";

import { useState } from "react";

const PREDEFINED_PROFILES = [
  {
    id: "custom",
    label: "Personalizzato (Manuale)",
    data: null
  },
  {
    id: "assiduo",
    label: "Ascoltatore Assiduo",
    data: { nextsong: 1007, thumbs_up: 40, thumbs_down: 5, add_to_playlist: 32, roll_advert: 1, skip_rate: 0.05 }
  },
  {
    id: "sporadico",
    label: "Ascoltatore Sporadico",
    data: { nextsong: 214, thumbs_up: 14, thumbs_down: 3, add_to_playlist: 4, roll_advert: 1, skip_rate: 0.2 }
  },
  {
    id: "frustrato",
    label: "Ascoltatore Frustrato",
    data: { nextsong: 518, thumbs_up: 23, thumbs_down: 8, add_to_playlist: 12, roll_advert: 42, skip_rate: 0.75 }
  },
  {
    id: "pubblicita",
    label: "Ascoltatore Interrotto (Eccesso di Ad)",
    data: { nextsong: 1481, thumbs_up: 74, thumbs_down: 33, add_to_playlist: 31, roll_advert: 74, skip_rate: 0.4 }
  }
];

export default function Home() {
  const [formData, setFormData] = useState({
    nextsong: 0,
    thumbs_up: 0,
    thumbs_down: 0,
    add_to_playlist: 0,
    roll_advert: 0,
    minutes_listened: 0.0,
    skip_rate: 0.0,
  });

  const [selectedProfile, setSelectedProfile] = useState("custom");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    churn_prediction: boolean;
    confidence: number;
    verdict: string;
    explanations?: { feature: string; value: number; impact: number }[];
  } | null>(null);

  const [error, setError] = useState<string | null>(null);

  const handleProfileChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const profileId = e.target.value;
    setSelectedProfile(profileId);
    
    if (profileId === "custom") return;
    
    const profile = PREDEFINED_PROFILES.find(p => p.id === profileId);
    if (profile && profile.data) {
      setFormData(prev => {
        const updated = { ...prev, ...profile.data };
        const fullSongs = updated.nextsong * (1 - updated.skip_rate);
        const skippedSongs = updated.nextsong * updated.skip_rate;
        updated.minutes_listened = parseFloat(((fullSongs * 3.5) + (skippedSongs * 1.0)).toFixed(2));
        return updated;
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedProfile("custom");
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: (name === "minutes_listened" || name === "skip_rate") ? parseFloat(value) || 0.0 : parseInt(value, 10) || 0,
      };
      
      if (name === "nextsong" || name === "skip_rate") {
        const currentNextsong = name === "nextsong" ? (parseInt(value, 10) || 0) : prev.nextsong;
        const currentSkipRate = name === "skip_rate" ? (parseFloat(value) || 0.0) : prev.skip_rate;
        
        // Assumiamo: brano intero = 3.5 min, brano skippato = 1.0 min
        const fullSongs = currentNextsong * (1 - currentSkipRate);
        const skippedSongs = currentNextsong * currentSkipRate;
        
        updated.minutes_listened = parseFloat(((fullSongs * 3.5) + (skippedSongs * 1.0)).toFixed(2));
      }
      
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    if (formData.thumbs_up + formData.thumbs_down > formData.nextsong) {
      setError("Il numero di 'Mi piace' e 'Non mi piace' sommati non può superare il numero di brani ascoltati.");
      setLoading(false);
      return;
    }

    if (formData.add_to_playlist > formData.nextsong) {
      setError("Il numero di brani aggiunti alla playlist non può superare il numero di brani ascoltati.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        let errorMsg = "Errore durante la connessione al server.";
        try {
          const errorData = await response.json();
          errorMsg = errorData.detail || errorMsg;
        } catch (e) {
          // Fallback se il json non è valido
        }
        throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
      }

      const data = await response.json();
      // Simulate slight delay for the cool vinyl animation
      setTimeout(() => {
        setResult(data);
        setLoading(false);
      }, 1500);

    } catch (err: any) {
      setError(err.message || "Errore sconosciuto");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]">

      {/* Header */}
      <div className="w-full max-w-5xl mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center shadow-[0_0_15px_#1DB954]">
            <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Churn<span className="text-[#1DB954]">Predictor</span></h1>
        </div>
      </div>

      <div className="max-w-5xl w-full metallic-bg rounded-2xl p-8 md:p-12 flex flex-col lg:flex-row gap-12 relative overflow-hidden">

        {/* Subtle top glare for metallic effect */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>

        {/* Left Form Section */}
        <div className="flex-1 z-10">
          <h2 className="text-2xl font-bold mb-2">Dati Ascoltatore (Ultimi 30 gg)</h2>
          <p className="text-gray-400 mb-6 text-sm">
            Inserisci le statistiche per calcolare la probabilità che l'utente annulli il suo abbonamento.
          </p>

          <div className="mb-8">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Seleziona Profilo Predefinito
            </label>
            <div className="relative">
              <select 
                value={selectedProfile}
                onChange={handleProfileChange}
                className="w-full bg-[#1e1e1e] border border-[#282828] rounded-md p-3 text-white focus:outline-none focus:border-[#1DB954] focus:ring-1 focus:ring-[#1DB954] transition shadow-inner appearance-none cursor-pointer pr-10 font-medium"
              >
                {PREDEFINED_PROFILES.map(p => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="group">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 group-focus-within:text-[#1DB954] transition-colors">
                  Brani Ascoltati
                </label>
                <input type="number" name="nextsong" min="0" value={formData.nextsong} onChange={handleChange} className="w-full bg-[#121212] border border-[#282828] rounded-md p-3 text-white focus:outline-none focus:border-[#1DB954] focus:ring-1 focus:ring-[#1DB954] transition shadow-inner" required />
              </div>
              <div className="group">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 transition-colors">
                  Minuti Totali d'Ascolto
                </label>
                <input type="number" step="0.1" name="minutes_listened" min="0" value={formData.minutes_listened} readOnly className="w-full bg-[#121212] border border-[#282828] rounded-md p-3 text-gray-500 focus:outline-none transition shadow-inner cursor-not-allowed" />
              </div>
              <div className="group">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 group-focus-within:text-[#1DB954] transition-colors">
                  Mi Piace
                </label>
                <input type="number" name="thumbs_up" min="0" value={formData.thumbs_up} onChange={handleChange} className="w-full bg-[#121212] border border-[#282828] rounded-md p-3 text-white focus:outline-none focus:border-[#1DB954] focus:ring-1 focus:ring-[#1DB954] transition shadow-inner" required />
              </div>
              <div className="group">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 group-focus-within:text-[#1DB954] transition-colors">
                  Non Mi Piace
                </label>
                <input type="number" name="thumbs_down" min="0" value={formData.thumbs_down} onChange={handleChange} className="w-full bg-[#121212] border border-[#282828] rounded-md p-3 text-white focus:outline-none focus:border-[#1DB954] focus:ring-1 focus:ring-[#1DB954] transition shadow-inner" required />
              </div>
              <div className="group">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 group-focus-within:text-[#1DB954] transition-colors">
                  Aggiunte a Playlist
                </label>
                <input type="number" name="add_to_playlist" min="0" value={formData.add_to_playlist} onChange={handleChange} className="w-full bg-[#121212] border border-[#282828] rounded-md p-3 text-white focus:outline-none focus:border-[#1DB954] focus:ring-1 focus:ring-[#1DB954] transition shadow-inner" required />
              </div>
              <div className="group">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 group-focus-within:text-[#1DB954] transition-colors">
                  Pubblicità Ricevute
                </label>
                <input type="number" name="roll_advert" min="0" value={formData.roll_advert} onChange={handleChange} className="w-full bg-[#121212] border border-[#282828] rounded-md p-3 text-white focus:outline-none focus:border-[#1DB954] focus:ring-1 focus:ring-[#1DB954] transition shadow-inner" required />
              </div>
              <div className="group">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 group-focus-within:text-[#1DB954] transition-colors">
                  Tasso di Skip (0 - 1)
                </label>
                <input type="number" step="0.01" name="skip_rate" min="0" max="1" value={formData.skip_rate} onChange={handleChange} className="w-full bg-[#121212] border border-[#282828] rounded-md p-3 text-white focus:outline-none focus:border-[#1DB954] focus:ring-1 focus:ring-[#1DB954] transition shadow-inner" required />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-8 metallic-button text-black font-bold text-sm tracking-widest uppercase py-4 rounded-full disabled:opacity-70 flex justify-center items-center gap-2"
            >
              {loading ? "Analisi Modello in Corso..." : "Genera Predizione"}
            </button>
          </form>
        </div>

        {/* Right Result Section */}
        <div className="flex-1 flex flex-col justify-center items-center bg-[#0a0a0a]/60 rounded-xl p-8 border border-white/5 relative z-10 shadow-2xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center animate-pulse-ring rounded-full p-4">
              {/* Vinyl Record Loading Animation */}
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-gray-900 to-gray-700 p-1 shadow-2xl vinyl-loader border border-gray-600">
                <div className="w-full h-full rounded-full border-[4px] border-gray-800 flex items-center justify-center bg-gray-900 relative">
                  <div className="absolute inset-2 rounded-full border border-gray-700/50"></div>
                  <div className="absolute inset-4 rounded-full border border-gray-700/50"></div>
                  <div className="absolute inset-6 rounded-full border border-gray-700/50"></div>
                  <div className="w-8 h-8 rounded-full bg-[#1DB954] border-2 border-black flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  </div>
                </div>
              </div>
              <p className="mt-6 font-bold text-[#1DB954] tracking-widest text-sm uppercase">Caricamento...</p>
            </div>
          ) : error ? (
            <div className="text-red-500 text-center flex flex-col items-center">
              <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              <p className="font-semibold">{error}</p>
            </div>
          ) : result ? (
            <div className="text-center w-full animate-in fade-in zoom-in duration-500">
              <div className="relative inline-block mb-6">
                {/* Inner neon glow based on result */}
                <div className={`absolute inset-0 blur-2xl rounded-full ${result.churn_prediction ? 'bg-red-500/30' : 'bg-[#1DB954]/30'}`}></div>

                <div className={`relative flex justify-center items-center w-28 h-28 rounded-full border-4 ${result.churn_prediction ? "border-red-500 text-red-500 bg-red-950" : "border-[#1DB954] text-[#1DB954] bg-[#0a1f11]"}`}>
                  {result.churn_prediction ? (
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                  ) : (
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                  )}
                </div>
              </div>

              <h2 className="text-3xl font-extrabold mb-2 tracking-tight text-white">{result.verdict}</h2>
              <p className="text-gray-400 mb-8 text-sm font-medium">Predizione basata sul modello Random Forest</p>

              <div className="text-left">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Rischio Stimato</span>
                  <span className="text-xl font-bold text-white">{(result.confidence * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-[#282828] rounded-full h-2 mb-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-1000 ease-out ${result.churn_prediction ? "bg-red-500" : "bg-[#1DB954]"}`}
                    style={{ width: `${(result.confidence * 100).toFixed(0)}%` }}
                  ></div>
                </div>
              </div>

              {/* XAI Explanations */}
              {result.explanations && result.explanations.length > 0 && (
                <div className="mt-8 text-left border-t border-[#282828] pt-6">
                  <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-6 flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#1DB954]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    Analisi Impatto Feature (AI)
                  </h3>
                  <div className="space-y-4">
                    {result.explanations
                      .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
                      .map((exp, idx) => {
                        const isChurnDriver = exp.impact > 0;
                        const colorClass = isChurnDriver ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.7)]" : "bg-[#1DB954] shadow-[0_0_10px_rgba(29,185,84,0.7)]";
                        const textColorClass = isChurnDriver ? "text-red-400" : "text-[#1DB954]";
                        const maxImpact = Math.max(...result.explanations!.map(e => Math.abs(e.impact)));
                        const widthPct = Math.max(5, (Math.abs(exp.impact) / maxImpact) * 100);

                        return (
                          <div key={idx} className="relative flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 150}ms`, animationFillMode: "both" }}>
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-medium text-gray-300 capitalize">{exp.feature.replace(/_/g, ' ')}</span>
                              <span className={`font-bold ${textColorClass}`}>
                                {isChurnDriver ? "+" : ""}{exp.impact.toFixed(3)}
                              </span>
                            </div>
                            <div className="w-full bg-[#1e1e1e] rounded-full h-1.5 overflow-hidden flex">
                              <div
                                className={`h-1.5 rounded-full transition-all duration-1000 ease-out ${colorClass}`}
                                style={{ width: `${widthPct}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                  <div className="mt-6 flex justify-between text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                    <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#1DB954] shadow-[0_0_5px_#1DB954]"></span> Spinge verso Retention</span>
                    <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_#ef4444]"></span> Spinge verso Abbandono</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center opacity-40">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#282828] flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
                </svg>
              </div>
              <p className="text-lg font-medium">Nessuna predizione attiva</p>
              <p className="text-sm text-gray-400 mt-2">Compila i dati e avvia il calcolo.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
