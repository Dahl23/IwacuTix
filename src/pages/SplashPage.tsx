import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IwacuTixLogo } from '../components/IwacuTixLogo';
import { ArrowRight } from 'lucide-react';

export const SplashPage: React.FC = () => {
  const navigate = useNavigate();

  // Auto transition to onboarding after 4 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/onboarding');
    }, 4000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex-1 flex flex-col justify-between p-8 text-center bg-gradient-to-b from-[#090A0F] via-[#050608] to-[#020204] h-full text-white">
      {/* Spacer */}
      <div></div>

      {/* Center Brand */}
      <div className="flex flex-col items-center justify-center gap-6 my-auto animate-fade-in">
        {/* Sleek IwacuTix Badge Logo matching uploaded brand identity */}
        <div className="relative group">
          <div className="absolute -inset-2 bg-gradient-to-r from-amber-500/30 via-orange-600/40 to-rose-600/30 rounded-[2.5rem] blur-2xl opacity-60 group-hover:opacity-80 transition duration-1000 animate-pulse"></div>
          <IwacuTixLogo variant="badge" size="md" className="relative" showTagline={true} />
        </div>

        <p className="text-sm text-slate-300 max-w-[300px] mt-3 leading-relaxed font-normal">
          <span className="font-bold text-white">Tes tickets, tes événements.</span><br />
          <span className="text-xs text-slate-400">La billetterie mobile et digitale 100% sécurisée au Burundi.</span>
        </p>
      </div>

      {/* Footer Button and Credits */}
      <div className="flex flex-col items-center gap-6 mt-auto">
        <button
          id="btn-splash-start"
          onClick={() => navigate('/onboarding')}
          className="w-full py-4 px-6 rounded-2xl bg-iwacu-gradient hover:opacity-95 text-white font-btn text-base flex items-center justify-center gap-2 shadow-xl shadow-orange-500/25 transition-all active:scale-95 group cursor-pointer"
        >
          <span>Découvrir IwacuTix</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>

        <div className="space-y-1">
          <p className="text-[10px] text-slate-400 font-mono tracking-wider">
            VERSION PROTOTYPE 1.0 • IWACUTIX BURUNDI
          </p>
          <p className="text-[10px] text-orange-400 font-semibold tracking-wide">
            100% SECURE & TRACEABLE
          </p>
        </div>
      </div>
    </div>
  );
};

