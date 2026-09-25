import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { ArrowRight, Ticket, ShieldCheck, Compass } from 'lucide-react';

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Découvrez les événements',
      description: 'Accédez facilement aux meilleurs matchs de foot, concerts live, grandes conférences religieuses et séminaires d\'affaires partout au Burundi.',
      icon: Compass,
      color: 'text-orange-600 bg-orange-50 border-orange-200/80',
      tag: 'EXPLORER'
    },
    {
      title: 'Payez avec Mobile Money',
      description: 'Achetez vos places instantanément en Francs Burundais (FBu) via Lumicash ou Bitcoin Lightning (Blink). Un processus 100% sécurisé et traçable.',
      icon: ShieldCheck,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200/80',
      tag: 'TRANSPARENCE'
    },
    {
      title: 'Billet digital infalsifiable',
      description: 'Plus de ticket papier perdu ni de file d\'attente sous le soleil du Burundi. Votre billet sécurisé par QR code est disponible directement dans votre téléphone.',
      icon: Ticket,
      color: 'text-orange-600 bg-amber-50 border-amber-200/80',
      tag: 'ZÉRO FRAUDE'
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      navigate('/home');
    }
  };

  const handleSkip = () => {
    navigate('/home');
  };

  const CurrentIcon = steps[currentStep].icon;

  return (
    <div className="flex-1 flex flex-col justify-between p-6 h-full bg-gradient-to-b from-[#F1F5F9] to-[#F8FAFC]">
      {/* Header section with Logo and Skip */}
      <div className="flex items-center justify-between z-10 pt-2">
        <Logo size="sm" showText={true} />
        <button
          id="btn-onboarding-skip"
          onClick={handleSkip}
          className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors py-1.5 px-3 rounded-full bg-white border border-slate-200/80 shadow-sm cursor-pointer"
        >
          Passer
        </button>
      </div>

      {/* Main Illustration & Content area */}
      <div className="my-auto py-6 flex flex-col items-center text-center animate-fade-in">
        {/* Dynamic visual representation */}
        <div className={`w-28 h-28 rounded-[2rem] border flex items-center justify-center mb-8 relative transition-all duration-300 ${steps[currentStep].color} shadow-md shadow-indigo-500/5`}>
          {/* Decorative ambient pulse */}
          <div className="absolute inset-0 bg-current opacity-[0.03] rounded-[2rem] blur-xl animate-pulse"></div>
          <CurrentIcon className="w-12 h-12 stroke-[1.5]" />
        </div>

        {/* Small Tag */}
        <span className="text-[10px] font-mono tracking-widest font-extrabold text-orange-600 bg-orange-50 border border-orange-200/80 px-3 py-1 rounded-full mb-3 uppercase">
          {steps[currentStep].tag}
        </span>

        {/* Text */}
        <h2 className="text-2xl font-display font-extrabold text-slate-900 tracking-tight leading-tight max-w-[280px]">
          {steps[currentStep].title}
        </h2>
        <p className="text-sm text-slate-600 mt-4 leading-relaxed max-w-[300px] font-normal">
          {steps[currentStep].description}
        </p>
      </div>

      {/* Bottom dots progress and button */}
      <div className="mt-auto space-y-6">
        {/* Progress indicators */}
        <div className="flex justify-center gap-2.5">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                index === currentStep ? 'w-8 bg-gradient-to-r from-orange-500 to-amber-500' : 'w-2 bg-slate-200'
              }`}
              aria-label={`Aller à la diapositive ${index + 1}`}
            ></button>
          ))}
        </div>

        {/* Navigation Action */}
        <button
          id="btn-onboarding-next"
          onClick={handleNext}
          className="w-full py-4 px-6 rounded-2xl bg-iwacu-gradient hover:opacity-95 text-white font-btn text-base flex items-center justify-center gap-2 shadow-xl shadow-orange-500/20 transition-all active:scale-95 group cursor-pointer"
        >
          <span>{currentStep === steps.length - 1 ? 'Commencer' : 'Continuer'}</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};
