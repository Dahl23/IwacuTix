import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp, PersonaType } from '../AppContext';
import { ShieldCheck, Building2, User, QrCode, Sliders, ChevronDown, Check, Info, Sparkles, ArrowRight } from 'lucide-react';

export const RoleSwitcherBanner: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentPersona, switchPersona, user, scanneurAssignments } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const personas: {
    key: PersonaType;
    label: string;
    sublabel: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    bgColor: string;
    targetRoute: string;
  }[] = [
    {
      key: 'ACHETEUR',
      label: 'Acheteur (B2C)',
      sublabel: 'Compte allégé vérifié par OTP SMS, achat sans mot de passe',
      icon: User,
      accentColor: 'text-amber-700',
      bgColor: 'bg-amber-50 border-amber-200',
      targetRoute: '/home'
    },
    {
      key: 'ORGANISATEUR',
      label: 'Organisateur (SaaS)',
      sublabel: 'Organisation vérifiée KYC, gestion des jauges, scanneurs & portefeuilles',
      icon: Building2,
      accentColor: 'text-emerald-700',
      bgColor: 'bg-emerald-50 border-emerald-200',
      targetRoute: '/organisateur/dashboard/evt-vital-o-vs-le-messager'
    },
    {
      key: 'SCANNEUR',
      label: 'Scanneur Assigné',
      sublabel: 'Capacité de scan activée via ScanneurAssignment(user_id, event_id)',
      icon: QrCode,
      accentColor: 'text-cyan-700',
      bgColor: 'bg-cyan-50 border-cyan-200',
      targetRoute: '/scan'
    },
    {
      key: 'SUPERADMIN',
      label: 'SuperAdmin IwacuTix',
      sublabel: 'Validation KYC, ParametrePlateforme, supervision des reversements',
      icon: ShieldCheck,
      accentColor: 'text-purple-700',
      bgColor: 'bg-purple-50 border-purple-200',
      targetRoute: '/admin'
    }
  ];

  const currentConfig = personas.find(p => p.key === currentPersona) || personas[0];
  const CurrentIcon = currentConfig.icon;

  const handleSelectPersona = (personaKey: PersonaType, route: string) => {
    switchPersona(personaKey);
    setIsOpen(false);
    navigate(route);
  };

  return (
    <div className="relative z-40 bg-slate-900 text-white border-b border-slate-800 text-xs shadow-md">
      {/* Quick bar */}
      <div className="px-3.5 py-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 shrink-0">
            Rôle Actif :
          </span>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 font-semibold text-white hover:text-brand-terracotta transition-colors truncate"
          >
            <CurrentIcon className="w-3.5 h-3.5 text-brand-primary shrink-0" />
            <span className="truncate">{currentConfig.label}</span>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            title="Consulter le cahier des charges du backend"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
          </button>

          {currentPersona === 'ORGANISATEUR' && (
            <button
              onClick={() => navigate('/organisateur/dashboard/evt-vital-o-vs-le-messager')}
              className="text-[10px] px-2 py-0.5 rounded bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 font-medium flex items-center gap-1 border border-emerald-500/30"
            >
              Dashboard <ArrowRight className="w-2.5 h-2.5" />
            </button>
          )}

          {currentPersona === 'SCANNEUR' && (
            <button
              onClick={() => navigate('/scan')}
              className="text-[10px] px-2 py-0.5 rounded bg-cyan-600/30 hover:bg-cyan-600/40 text-cyan-300 font-medium flex items-center gap-1 border border-cyan-500/30"
            >
              Poste de Scan <ArrowRight className="w-2.5 h-2.5" />
            </button>
          )}

          {currentPersona === 'SUPERADMIN' && (
            <button
              onClick={() => navigate('/admin')}
              className="text-[10px] px-2 py-0.5 rounded bg-purple-600/30 hover:bg-purple-600/40 text-purple-300 font-medium flex items-center gap-1 border border-purple-500/30"
            >
              Supervision <ArrowRight className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>

      {/* Explanation drawer according to specs */}
      {showExplanation && (
        <div className="px-3.5 py-2.5 bg-slate-950 text-slate-300 text-[11px] border-t border-slate-800 space-y-1.5 leading-relaxed">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Conformité Cahier des Charges Backend
            </span>
            <button 
              onClick={() => setShowExplanation(false)}
              className="text-[10px] text-slate-400 hover:text-white"
            >
              Fermer
            </button>
          </div>
          <p className="text-slate-400">
            Cette architecture sépare strictement les comptes :
          </p>
          <ul className="list-disc pl-4 space-y-1 text-slate-300 text-[10px]">
            <li><strong className="text-amber-300">Acheteur :</strong> Compte allégé créé lors du 1er achat, vérifié par SMS OTP, sans mot de passe obligatoire.</li>
            <li><strong className="text-emerald-300">Organisateur :</strong> Compte pro vérifié (KYC), gestion multi-événements, jauge des places, et reversement automatique (Mobile Money + Lightning).</li>
            <li><strong className="text-cyan-300">Scanneur :</strong> N'est PAS un rôle global en base ! Capacité conférée par un <code>ScanneurAssignment(user_id, event_id)</code> actif.</li>
            <li><strong className="text-purple-300">SuperAdmin :</strong> Supervise la plateforme, valide les dossiers KYC et configure les reversements (<code>ParametrePlateforme</code>).</li>
          </ul>
        </div>
      )}

      {/* Persona dropdown selection modal/drawer */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 bg-white text-slate-900 border-b border-slate-200 shadow-xl p-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold px-1">
            Sélectionner un type de compte :
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {personas.map((p) => {
              const Icon = p.icon;
              const isSelected = p.key === currentPersona;
              return (
                <button
                  key={p.key}
                  onClick={() => handleSelectPersona(p.key, p.targetRoute)}
                  className={`flex items-start gap-2.5 p-2 rounded-xl text-left border transition-all ${
                    isSelected 
                      ? `${p.bgColor} ring-2 ring-brand-primary/40` 
                      : 'border-slate-100 bg-slate-50/70 hover:bg-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg bg-white shadow-xs ${p.accentColor}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-900">{p.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-brand-primary shrink-0" />}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{p.sublabel}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
