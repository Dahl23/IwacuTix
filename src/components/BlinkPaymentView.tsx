import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  Zap, 
  Copy, 
  Check, 
  RefreshCw, 
  ExternalLink, 
  ShieldCheck, 
  Clock, 
  AlertCircle,
  Terminal,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { 
  createBlinkInvoice, 
  checkBlinkInvoiceStatus, 
  getBlinkRealtimePrice, 
  convertFbuToSatoshis,
  BlinkInvoiceResult
} from '../services/blinkService';

interface BlinkPaymentViewProps {
  totalFbu: number;
  eventName?: string;
  onPaymentSuccess: (details: { 
    paymentRequest: string; 
    satoshis: number; 
    paymentMethod: string;
    txHash: string;
  }) => void;
  onCancel?: () => void;
}

export const BlinkPaymentView: React.FC<BlinkPaymentViewProps> = ({
  totalFbu,
  eventName = 'Billetterie IwacuTix',
  onPaymentSuccess,
  onCancel
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [invoice, setInvoice] = useState<BlinkInvoiceResult | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [status, setStatus] = useState<'PENDING' | 'PAID' | 'EXPIRED'>('PENDING');
  const [timeLeft, setTimeLeft] = useState<number>(600); // 10 minutes (Section 5.1 / order.expires_at)
  const [btcPriceUsd, setBtcPriceUsd] = useState<number>(86500);
  const [satsAmount, setSatsAmount] = useState<number>(0);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [showConsole, setShowConsole] = useState<boolean>(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setConsoleLogs((prev) => [`[${time}] ${msg}`, ...prev.slice(0, 15)]);
  };

  // 1. Initialiser le taux BTC et générer la facture Lightning Blink
  useEffect(() => {
    let isMounted = true;

    async function initBlink() {
      setLoading(true);
      addLog('Connexion à l\'API Blink (https://api.blink.sv/graphql)...');

      try {
        // Taux temps réel
        const priceInfo = await getBlinkRealtimePrice();
        if (isMounted) {
          setBtcPriceUsd(priceInfo.btcPriceUsd);
          addLog(`Taux BTC/USD récupéré : $${priceInfo.btcPriceUsd.toLocaleString()}`);
        }

        // Calcul des Satoshis
        const calculatedSats = convertFbuToSatoshis(totalFbu, priceInfo.btcPriceUsd);
        if (isMounted) setSatsAmount(calculatedSats);
        addLog(`Montant calculé : ${totalFbu.toLocaleString()} FBu -> ${calculatedSats.toLocaleString()} Sats`);

        // Création de la facture Blink
        const memo = `IwacuTix: ${eventName.substring(0, 24)}`;
        addLog(`Génération facture Lightning (memo: "${memo}")...`);
        const invoiceRes = await createBlinkInvoice({
          amountSats: calculatedSats,
          memo,
        });

        if (isMounted) {
          setInvoice(invoiceRes);
          if (invoiceRes.isMock) {
            addLog('Mode atelier / démo actif (simulation facture BOLT11 conforme)');
          } else {
            addLog('Facture Lightning réelle créée avec succès sur Blink !');
          }

          // Génération du QR Code avec lightning:<paymentRequest> (Section 6)
          try {
            const lightningUri = `lightning:${invoiceRes.paymentRequest}`;
            const qrUrl = await QRCode.toDataURL(lightningUri, {
              width: 320,
              margin: 2,
              color: {
                dark: '#000000',
                light: '#FFFFFF',
              },
            });
            if (isMounted) setQrCodeDataUrl(qrUrl);
          } catch (qrErr) {
            console.error('Erreur génération QR Code:', qrErr);
          }
        }
      } catch (err: any) {
        addLog(`Erreur initialisation Blink : ${err.message}`);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initBlink();

    return () => {
      isMounted = false;
    };
  }, [totalFbu, eventName]);

  // 2. Compte à rebours de validité de la facture
  useEffect(() => {
    if (timeLeft <= 0) {
      setStatus('EXPIRED');
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // 3. Polling automatique régulier (toutes les 4 secondes)
  useEffect(() => {
    if (!invoice || status === 'PAID' || status === 'EXPIRED') return;

    const interval = setInterval(async () => {
      if (!invoice.isMock) {
        const res = await checkBlinkInvoiceStatus(invoice.paymentRequest);
        if (res.status === 'PAID') {
          handleSuccess();
        }
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [invoice, status]);

  const handleCopy = async () => {
    if (!invoice?.paymentRequest) return;
    try {
      await navigator.clipboard.writeText(invoice.paymentRequest);
      setCopied(true);
      addLog('Facture copiée dans le presse-papiers');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleManualCheck = async () => {
    if (!invoice) return;
    setIsChecking(true);
    addLog(`Vérification manuelle du statut (query lnInvoicePaymentStatus)...`);
    
    try {
      const res = await checkBlinkInvoiceStatus(invoice.paymentRequest);
      addLog(`Statut retourné par l'API : ${res.status}`);
      if (res.status === 'PAID') {
        handleSuccess();
      } else {
        // notification brève
        alert('Aucun paiement détecté sur le réseau pour l\'instant. Statut : En attente');
      }
    } finally {
      setIsChecking(false);
    }
  };

  const handleSimulatePayment = () => {
    addLog('Simulation de paiement Lightning reçue avec succès !');
    handleSuccess();
  };

  const handleSuccess = () => {
    setStatus('PAID');
    const randomHex = Math.random().toString(16).substring(2, 10).toUpperCase();
    const txHash = `BLINK-LN-${randomHex}`;
    
    setTimeout(() => {
      onPaymentSuccess({
        paymentRequest: invoice?.paymentRequest || 'lnbc-demo',
        satoshis: satsAmount,
        paymentMethod: 'Blink (Lightning ⚡)',
        txHash,
      });
    }, 800);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-[#F8FAFC] overflow-y-auto p-4 sm:p-5 select-none">
      
      {/* Top Blink Branding Header */}
      <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 rounded-2xl p-4 text-white shadow-md relative overflow-hidden shrink-0">
        {/* Decorative lightning background watermarks */}
        <Zap className="absolute -right-4 -bottom-4 w-24 h-24 text-white/10 rotate-12" />
        
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white text-orange-600 flex items-center justify-center shadow-md shrink-0">
              <Zap className="w-6 h-6 fill-current text-orange-500 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-black text-lg tracking-tight">Blink</span>
                <span className="text-[10px] font-mono font-bold bg-white/20 text-white px-2 py-0.5 rounded-full backdrop-blur-xs">
                  LIGHTNING ⚡
                </span>
              </div>
              <p className="text-[11px] text-white/90 font-medium">
                Paiement instantané Bitcoin (Réseau Lightning)
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[9px] font-mono text-white/80 block uppercase">Expiration</span>
            <span className="font-mono font-bold text-sm bg-black/20 px-2 py-0.5 rounded-lg">
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="my-auto py-12 flex flex-col items-center justify-center text-center space-y-3">
          <div className="relative w-14 h-14 flex items-center justify-center">
            <div className="absolute inset-0 border-3 border-orange-500/20 rounded-full"></div>
            <div className="absolute inset-0 border-3 border-t-orange-500 rounded-full animate-spin"></div>
            <Zap className="w-6 h-6 text-orange-500 fill-current animate-pulse" />
          </div>
          <p className="text-xs font-bold text-slate-700 font-display">
            Génération de la facture Lightning Blink...
          </p>
          <span className="text-[10px] font-mono text-slate-400">
            Connexion au nœud Blink (GraphQL)
          </span>
        </div>
      ) : (
        <div className="space-y-4 my-auto py-2">
          
          {/* Price Tag in Sats and FBu */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 text-center shadow-xs space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Montant à régler
            </span>
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl sm:text-3xl font-mono font-black text-orange-600 tracking-tight flex items-center gap-1">
                {satsAmount.toLocaleString('fr-FR')}
                <span className="text-base text-amber-500 font-bold">SATS</span>
                <Zap className="w-5 h-5 fill-current text-amber-500 -ml-0.5 inline" />
              </span>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium pt-0.5">
              <span>Équivalent :</span>
              <strong className="text-slate-800 font-mono font-bold">{totalFbu.toLocaleString('fr-FR')} FBu</strong>
              <span className="text-[10px] text-slate-400">• 1 BTC ≈ ${btcPriceUsd.toLocaleString()}</span>
            </div>
          </div>

          {/* QR Code Card */}
          <div className="bg-white border border-orange-200/80 rounded-3xl p-4 shadow-sm flex flex-col items-center text-center relative">
            <div className="relative p-2 bg-white rounded-2xl border border-slate-200/70 shadow-inner">
              {qrCodeDataUrl ? (
                <img 
                  src={qrCodeDataUrl} 
                  alt="QR Code Lightning BOLT11" 
                  className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center bg-slate-50 text-slate-400 text-xs">
                  Génération QR...
                </div>
              )}

              {/* Central Blink Icon Badge over QR */}
              <div className="absolute inset-0 m-auto w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-lg border-2 border-white pointer-events-none">
                <Zap className="w-5 h-5 fill-current text-yellow-300 stroke-[2.5]" />
              </div>
            </div>

            {/* Instruction scan */}
            <p className="text-[11px] text-slate-600 font-medium mt-3 max-w-[260px] leading-snug">
              Scannez avec <strong>Blink</strong>, Phoenix, Muun, Cash App ou tout wallet Lightning compatible.
            </p>

            {/* Status indicator pill */}
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              <span>EN ATTENTE DU PAIEMENT LIGHTNING...</span>
            </div>
          </div>

          {/* BOLT11 Invoice String & Copy actions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
              <span>Facture Lightning (BOLT11) :</span>
              <button
                onClick={handleCopy}
                className="text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1 cursor-pointer active:scale-95 transition-all text-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copié !' : 'Copier la facture'}</span>
              </button>
            </div>

            <div 
              onClick={handleCopy}
              className="p-2.5 bg-slate-100 hover:bg-orange-50/60 border border-slate-200 rounded-xl font-mono text-[10px] text-slate-600 break-all cursor-pointer transition-colors relative group line-clamp-2"
              title="Cliquer pour copier la facture BOLT11"
            >
              {invoice?.paymentRequest || 'lnbc...'}
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={`lightning:${invoice?.paymentRequest}`}
                className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 text-center"
              >
                <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                <span>Ouvrir Wallet</span>
              </a>

              <button
                onClick={handleManualCheck}
                disabled={isChecking}
                className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-orange-600 ${isChecking ? 'animate-spin' : ''}`} />
                <span>{isChecking ? 'Vérification...' : 'Vérifier statut'}</span>
              </button>
            </div>
          </div>

          {/* Test & Demo validation button (Crucial for bitlibera demo & bootcamp presentations) */}
          <div className="pt-2 border-t border-slate-200/80">
            <button
              id="btn-blink-simulate-payment"
              onClick={handleSimulatePayment}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-95 cursor-pointer transition-all"
            >
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span>Simuler paiement reçu (Test Immédiat)</span>
            </button>
            <p className="text-[10px] text-slate-400 text-center mt-1">
              Valide le paiement et émet le billet sans débourser de satoshis réels.
            </p>
          </div>

          {/* Collapsible Atelier Console (Inspired directly by the bitlibera-demo UI) */}
          <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 text-slate-300 text-xs">
            <button
              onClick={() => setShowConsole(!showConsole)}
              className="w-full px-3.5 py-2 flex items-center justify-between text-left text-[11px] font-mono text-orange-400 hover:bg-slate-800/80 cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                <span className="font-bold">Console Atelier BitLibera (Blink API)</span>
              </div>
              {showConsole ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showConsole && (
              <div className="p-3 bg-black/60 font-mono text-[10px] space-y-1.5 border-t border-slate-800">
                <div className="text-slate-400 pb-1 border-b border-slate-800 flex justify-between">
                  <span>Endpoint : https://api.blink.sv/graphql</span>
                  <span className="text-emerald-400">READY</span>
                </div>
                <div className="max-h-28 overflow-y-auto space-y-0.5 text-slate-300">
                  {consoleLogs.length === 0 ? (
                    <p className="text-slate-500">Prêt pour les tests...</p>
                  ) : (
                    consoleLogs.map((log, idx) => (
                      <p key={idx} className={log.includes('Erreur') ? 'text-rose-400' : 'text-emerald-300'}>
                        {log}
                      </p>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Security note */}
      <div className="mt-auto pt-3 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 shrink-0">
        <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
        <span>Réseau Bitcoin Lightning • Finalité instantanée et irréversible</span>
      </div>

    </div>
  );
};
