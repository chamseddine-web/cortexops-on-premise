import { ShieldCheck, Lock, Trash2 } from 'lucide-react';

export function PrivacyBanner() {
  return (
    <div className="bg-gradient-to-r from-emerald-900/30 to-cyan-900/30 border border-emerald-500/30 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <ShieldCheck className="text-emerald-400" size={24} />
        </div>
        <div className="flex-1">
          <h3 className="text-emerald-400 font-semibold mb-2 flex items-center gap-2">
            <Lock size={16} />
            Zero Data Retention
          </h3>
          <p className="text-slate-300 text-sm mb-3">
            Vos requêtes sont traitées exclusivement en mémoire vive et jamais stockées sur nos serveurs.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <Trash2 size={14} className="text-emerald-500" />
              <span>Prompts effacés après traitement</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Lock size={14} className="text-emerald-500" />
              <span>Aucun log permanent</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>Conforme RGPD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PrivacyBadge() {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-900/20 border border-emerald-500/30 rounded-full text-xs text-emerald-400">
      <ShieldCheck size={14} />
      <span>Zero Data Retention</span>
    </div>
  );
}
