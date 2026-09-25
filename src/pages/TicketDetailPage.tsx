import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { 
  ChevronLeft, 
  Share2, 
  Calendar, 
  MapPin, 
  ShieldCheck, 
  User, 
  CreditCard, 
  FileText, 
  FileImage, 
  Smartphone, 
  QrCode as QrIcon, 
  Check, 
  Copy, 
  Maximize2, 
  X, 
  Download, 
  Info,
  Loader2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { parseEventDate, getGoogleCalendarUrl, downloadIcal } from '../utils/calendar';

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, tickets, refreshTicketsFromApi } = useApp();
  const [isExporting, setIsExporting] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [qrUnavailable, setQrUnavailable] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);

  // Rechercher le billet par ID
  const ticket = tickets.find((t) => t.id === id);

  // Si le billet n'est pas encore en mémoire, tenter un rechargement depuis le backend
  useEffect(() => {
    if (!ticket && id) {
      setLoadingInitial(true);
      refreshTicketsFromApi().finally(() => {
        setLoadingInitial(false);
      });
    }
  }, [ticket, id, refreshTicketsFromApi]);

  // Générer le QR code avec haute définition et tolérance d'erreur
  useEffect(() => {
    if (!ticket) return;
    setQrCodeDataUrl('');
    // Contenu officiel du QR code émis par le backend (/api/tickets/mes-billets/ → qr_code_hash)
    const rawQrContent = ticket.qr_code_hash || ticket.qrCodeValue || ticket.id;
    if (!rawQrContent) {
      setQrUnavailable(true);
      return;
    }
    setQrUnavailable(false);
    QRCode.toDataURL(rawQrContent, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then(setQrCodeDataUrl)
      .catch((err) => {
        console.error('[TicketDetailPage] Erreur génération QR :', err);
        setQrUnavailable(true);
      });
  }, [ticket]);

  const showNotice = (message: string, type: 'success' | 'error' = 'success') => {
    setStatusNotice({ message, type });
    setTimeout(() => setStatusNotice(null), 4000);
  };

  const handleCopyTicketRef = () => {
    if (!ticket) return;
    const refToCopy = ticket.qr_code_hash || ticket.id;
    navigator.clipboard.writeText(refToCopy);
    setCopyFeedback('Référence copiée dans le presse-papier !');
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Gratuit';
    return `${price.toLocaleString('fr-FR')} FBu`;
  };

  const downloadPNG = async () => {
    const element = document.getElementById('ticket-card-element');
    if (!element) return;
    setIsExporting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 150));
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `iwacutix-billet-${ticket?.id || 'officiel'}.png`;
      link.href = image;
      link.click();
      showNotice('Image PNG téléchargée avec succès !');
    } catch (err) {
      console.error('Error exporting PNG:', err);
      showNotice('Impossible de générer l\'image PNG.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const downloadPDF = async () => {
    const element = document.getElementById('ticket-card-element');
    if (!element) return;
    setIsExporting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 150));
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png', 1.0);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 140;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pageWidth = 210;
      const pageHeight = 297;
      const xPosition = (pageWidth - imgWidth) / 2;
      const yPosition = 35;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.setTextColor(249, 115, 22);
      pdf.text('IWACUTIX BURUNDI', pageWidth / 2, 18, { align: 'center' });

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      pdf.text('Billet d\'Accès Électronique Certifié Homologué FFB & CNECB', pageWidth / 2, 24, { align: 'center' });

      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.5);
      pdf.line(20, 28, pageWidth - 20, 28);

      pdf.addImage(imgData, 'PNG', xPosition, yPosition, imgWidth, imgHeight);

      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text('Ce billet est infalsifiable et unique. Ne le partagez avec personne d\'autre.', pageWidth / 2, pageHeight - 20, { align: 'center' });
      pdf.text('IwacuTix Burundi • Service Support Client : support@iwacutix.bi', pageWidth / 2, pageHeight - 15, { align: 'center' });

      pdf.save(`iwacutix-${ticket?.id || 'billet'}.pdf`);
      showNotice('Billet PDF téléchargé avec succès !');
    } catch (err) {
      console.error('Error exporting PDF:', err);
      showNotice('Impossible de générer le document PDF.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  if (!ticket) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#F8FAFC] h-full space-y-4">
        {loadingInitial ? (
          <>
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            <p className="text-sm font-semibold text-slate-700">Chargement de votre billet officiel...</p>
            <p className="text-xs text-slate-400">Interrogation sécurisée de la billetterie IwacuTix</p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <QrIcon className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Billet introuvable</h3>
            <p className="text-xs text-slate-500 max-w-xs">
              Ce billet n'apparaît pas dans vos réservations récentes. Vérifiez que vous êtes connecté avec le bon compte acheteur.
            </p>
            <button
              onClick={() => navigate('/mes-billets')}
              className="mt-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer hover:opacity-95"
            >
              Retour à mon portefeuille
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC]">
      {/* Notification Toast */}
      {statusNotice && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top ${
          statusNotice.type === 'success' 
            ? 'bg-emerald-600 text-white shadow-emerald-500/20' 
            : 'bg-red-600 text-white shadow-red-500/20'
        }`}>
          {statusNotice.type === 'success' ? <Check className="w-4 h-4" /> : <Info className="w-4 h-4" />}
          <span>{statusNotice.message}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-30 border-b border-slate-200/80 shadow-xs">
        <button
          id="btn-ticket-detail-back"
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer border border-slate-200/60"
          title="Retour"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <span className="text-xs font-mono font-bold text-orange-600 uppercase tracking-widest block">
            IWACUTIX PASS
          </span>
          <span className="text-sm font-display font-extrabold text-slate-900">
            Billet d'Accès Officiel
          </span>
        </div>

        <button
          onClick={handleCopyTicketRef}
          className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer border border-slate-200/60 relative"
          title="Copier la référence"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-start overflow-y-auto max-w-lg mx-auto w-full space-y-4">
        
        {/* Ticket Physical Card Simulation */}
        <div 
          id="ticket-card-element" 
          className="bg-white rounded-[2rem] border border-slate-200/90 shadow-xl relative overflow-hidden flex flex-col"
        >
          {/* Header stub - Cover representation */}
          <div className="p-5 bg-gradient-to-b from-slate-50 to-white space-y-2 border-b border-slate-100 relative">
            {/* Top decorative micro dots */}
            <div className="flex justify-between items-center text-[8px] font-mono text-slate-400 pb-1 border-b border-slate-100">
              <span className="font-extrabold text-orange-600 tracking-wider">IWACUTIX DIGITAL ACCESS</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                100% HOMOLOGUÉ
              </span>
            </div>

            <div className="pt-1.5 flex justify-between items-start gap-4">
              <div className="space-y-1 min-w-0">
                <span className="text-[8.5px] font-mono font-bold bg-orange-100 text-orange-800 px-2 py-0.5 rounded-md border border-orange-200 uppercase">
                  {ticket.eventCategory ? ticket.eventCategory.toUpperCase() : 'ÉVÉNEMENT'}
                </span>
                <h3 className="font-display font-black text-lg text-slate-900 tracking-tight leading-snug mt-1">
                  {ticket.eventTitle}
                </h3>
              </div>
            </div>

            {/* Event Time & Venue details */}
            <div className="space-y-1.5 text-xs text-slate-700 pt-1">
              <div className="flex items-center gap-2 font-mono text-xs text-slate-800 font-bold">
                <Calendar className="w-4 h-4 text-orange-600 shrink-0" />
                <span>{ticket.eventDate} à {ticket.eventTime || 'Heure à confirmer'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-medium">{ticket.eventLocation}</span>
              </div>
            </div>
          </div>

          {/* Symmetrical Left and Right Notch cutouts (mimicking a physical perforated ticket stub) */}
          <div className="absolute top-[166px] -left-4 w-8 h-8 bg-[#F8FAFC] rounded-full border border-slate-200 z-20"></div>
          <div className="absolute top-[166px] -right-4 w-8 h-8 bg-[#F8FAFC] rounded-full border border-slate-200 z-20"></div>
          
          {/* Dashed Tear Line dividing stub header from body */}
          <div className="h-0 border-t-2 border-dashed border-slate-200 mx-5 relative z-10 my-[13px]"></div>

          {/* Ticket Body - QR Code Section */}
          <div className="p-6 flex-1 flex flex-col items-center justify-center text-center space-y-5">
            
            {/* Scannable QR Code Frame */}
            <div className="relative group">
              <div className="p-3 bg-white rounded-3xl border-2 border-slate-200 shadow-md flex items-center justify-center relative">
                {qrUnavailable ? (
                  <div className="w-48 h-48 flex flex-col items-center justify-center gap-2 bg-red-50 rounded-2xl border border-red-100 px-4 text-center">
                    <ShieldCheck className="w-8 h-8 text-red-500" />
                    <p className="text-xs font-bold text-red-700">QR code indisponible</p>
                    <p className="text-[10px] text-red-500">
                      Ce billet n'a pas encore de signature valide.
                    </p>
                  </div>
                ) : qrCodeDataUrl ? (
                  <div className="relative">
                    <img 
                      src={qrCodeDataUrl} 
                      alt={`QR Code Billet ${ticket.id}`} 
                      className="w-48 h-48 object-contain rounded-2xl select-none"
                    />
                    {/* Zoom button on QR */}
                    <button
                      type="button"
                      onClick={() => setShowQrModal(true)}
                      className="absolute bottom-1 right-1 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white shadow-md transition-all active:scale-95 cursor-pointer"
                      title="Agrandir le QR Code pour le scanneur"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center bg-slate-50 rounded-2xl">
                    <QrIcon className="w-10 h-10 text-slate-400 animate-pulse" />
                  </div>
                )}
              </div>
            </div>

            {/* Instruction pour le jour J */}
            <div className="space-y-1">
              <span className={`inline-flex items-center gap-1.5 text-xs font-mono font-bold tracking-widest px-4 py-1.5 rounded-full border ${
                ticket.status === 'valide'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                <span className={`w-2 h-2 rounded-full ${ticket.status === 'valide' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                {ticket.status === 'valide' ? 'BILLET VALIDE • PRÊT AU SCAN' : 'BILLET UTILISÉ'}
              </span>
              <p className="text-[10px] text-slate-500 font-mono pt-1">
                Présentez ce QR Code devant l'agent scanneur officiel à l'entrée
              </p>
            </div>

            {/* If recipient has no phone, show printable helper badge */}
            {ticket.isGift && ticket.recipientHasNoPhone && (
              <div className="w-full p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-left text-xs text-amber-900 space-y-1 shadow-xs">
                <span className="font-bold uppercase tracking-wider text-[10px] text-amber-800 block">
                  FORMAT IMPRIMABLE CERTIFIÉ (SANS SMARTPHONE)
                </span>
                <p className="leading-relaxed font-normal">
                  Ce billet est réservé au nom de <strong>{ticket.recipientName}</strong>. Téléchargez le PDF ci-dessous pour lui remettre en main propre.
                </p>
              </div>
            )}

            {/* Detailed Breakdown Metadata Table */}
            <div className="w-full pt-4 border-t border-slate-100 grid grid-cols-2 gap-y-3.5 gap-x-4 text-left text-xs">
              <div className="space-y-0.5">
                <span className="text-slate-400 font-mono text-[9px] uppercase tracking-wider block font-bold">
                  Titulaire du compte
                </span>
                <span className="font-bold text-slate-900 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-orange-600" />
                  {user.name}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-slate-400 font-mono text-[9px] uppercase tracking-wider block font-bold">
                  Bénéficiaire d'accès
                </span>
                <span className="font-bold text-indigo-700 flex items-center gap-1 truncate block">
                  <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate">{ticket.isGift ? ticket.recipientName : 'Moi-même'}</span>
                </span>
              </div>

              {ticket.isGift && !ticket.recipientHasNoPhone && ticket.recipientPhone && (
                <div className="space-y-0.5 col-span-2">
                  <span className="text-slate-400 font-mono text-[9px] uppercase tracking-wider block font-bold">
                    Téléphone Bénéficiaire
                  </span>
                  <span className="font-mono font-bold text-slate-800 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    {ticket.recipientPhone}
                  </span>
                </div>
              )}

              <div className="space-y-0.5">
                <span className="text-slate-400 font-mono text-[9px] uppercase tracking-wider block font-bold">
                  Place / Catégorie
                </span>
                <span className="font-bold text-slate-900 truncate block">
                  {ticket.categoryName}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-slate-400 font-mono text-[9px] uppercase tracking-wider block font-bold">
                  Règlement
                </span>
                <span className="font-bold text-slate-900 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                  <span className="truncate">{ticket.paymentMethod || 'Lumicash'}</span>
                </span>
              </div>

              <div className="space-y-0.5 col-span-2 pt-2 border-t border-slate-100 flex justify-between items-center">
                <span className="text-slate-500 font-mono text-[10px] uppercase tracking-wider block font-bold">
                  Montant payé
                </span>
                <span className="font-mono font-black text-base text-orange-600">
                  {formatPrice(ticket.price)}
                </span>
              </div>

              {/* Identifiant unique */}
              <div className="col-span-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span className="truncate">Réf : {ticket.id}</span>
                <button
                  type="button"
                  onClick={handleCopyTicketRef}
                  className="text-orange-600 hover:text-orange-700 flex items-center gap-1 font-bold cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  {copyFeedback ? 'Copié !' : 'Copier'}
                </button>
              </div>
            </div>

          </div>

          {/* Secure lock banner footer */}
          <div className="p-3 bg-emerald-50 border-t border-emerald-100 flex items-center justify-center gap-1.5 text-[10px] font-mono text-emerald-800 font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>CERTIFIÉ INFALSIFIABLE • SIGNATURE CRYPTOGRAPHIQUE</span>
          </div>
        </div>

        {/* Ajouter à l'agenda / Calendrier */}
        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl space-y-3 shadow-xs text-left">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-50 text-orange-600 border border-orange-100">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Enregistrer dans votre calendrier</h4>
              <p className="text-[10px] text-slate-500">Recevez un rappel avant le début de l'événement.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2.5 pt-0.5">
            <a
              href={getGoogleCalendarUrl(
                ticket.eventTitle,
                `Billet de réservation officiel IwacuTix Burundi\nBillet ID : ${ticket.id}\nCatégorie : ${ticket.categoryName}\nBénéficiaire : ${ticket.isGift ? ticket.recipientName : 'Moi-même'}\nLieu : ${ticket.eventLocation}`,
                ticket.eventLocation,
                parseEventDate(ticket.eventDate, ticket.eventTime)
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-red-50 hover:bg-red-100/70 border border-red-100 rounded-xl font-bold text-[11px] text-red-700 cursor-pointer active:scale-95 transition-all"
            >
              <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 1.56-1.56 2.95-3.18 3.5v2.88h5.09c2.97-2.72 4.68-6.73 4.68-11.61 0-.6-.05-1.18-.15-1.7H21.35z" fill="#4285F4"/>
                <path d="M12.18 21.43c2.75 0 5.06-.91 6.75-2.47l-5.09-2.88c-1.41.95-3.21 1.51-5.18 1.51-3.98 0-7.36-2.69-8.56-6.32H1.05v2.98c2.14 4.25 6.55 7.18 11.13 7.18z" fill="#34A853"/>
                <path d="M3.62 11.27c-.28-.85-.44-1.76-.44-2.69 0-.93.16-1.84.44-2.69V2.91H1.05C.38 4.25 0 5.75 0 7.33s.38 3.08 1.05 4.42l2.57-2.03z" fill="#FBBC05"/>
                <path d="M12.18 3.19c1.94 0 3.51.67 4.88 1.98l3.65-3.65C18.49.52 15.62 0 12.18 0 7.6 0 3.19 2.93 1.05 7.18l2.57 2.03c1.2-3.63 4.58-6.32 8.56-6.32z" fill="#EA4335"/>
              </svg>
              <span>Google Calendar</span>
            </a>
            
            <button
              onClick={() => downloadIcal(
                ticket.eventTitle,
                `Billet de réservation officiel IwacuTix Burundi\nBillet ID : ${ticket.id}\nCatégorie : ${ticket.categoryName}\nBénéficiaire : ${ticket.isGift ? ticket.recipientName : 'Moi-même'}\nLieu : ${ticket.eventLocation}`,
                ticket.eventLocation,
                parseEventDate(ticket.eventDate, ticket.eventTime),
                ticket.id
              )}
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-[11px] text-slate-700 cursor-pointer active:scale-95 transition-all"
            >
              <svg className="w-3.5 h-3.5 fill-current text-slate-800 shrink-0" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.09 2.48-1.36.03-1.8-.8-3.36-.8-1.56 0-2.04.77-3.34.82-1.33.05-2.35-1.32-3.19-2.53-1.72-2.48-3.03-7-1.26-10.07.88-1.53 2.45-2.5 4.16-2.53 1.3-.02 2.52.88 3.32.88.8 0 2.27-.1 3.81.47 1.48.55 2.64 1.7 3.25 3.13-3.1 1.86-2.6 5.86.53 7.12-.66 1.66-1.5 3.33-2.38 5zM15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.56 2.95-1.39z"/>
              </svg>
              <span>Apple Calendar</span>
            </button>
          </div>
        </div>

        {/* Boutons Téléchargement PNG & PDF */}
        <div className="grid grid-cols-2 gap-3 pb-6">
          <button
            id="btn-download-png"
            onClick={downloadPNG}
            disabled={isExporting}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl font-bold text-xs text-slate-800 cursor-pointer active:scale-95 transition-all shadow-xs disabled:opacity-50"
          >
            <FileImage className="w-4 h-4 text-orange-600 shrink-0" />
            {isExporting ? 'Génération...' : 'Télécharger Image'}
          </button>
          
          <button
            id="btn-download-pdf"
            onClick={downloadPDF}
            disabled={isExporting}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-95 text-white rounded-xl font-bold text-xs cursor-pointer active:scale-95 transition-all shadow-md shadow-orange-500/20 disabled:opacity-50"
          >
            <FileText className="w-4 h-4 shrink-0" />
            {isExporting ? 'Génération...' : 'Télécharger PDF'}
          </button>
        </div>

      </div>

      {/* QR Code Zoom Modal for easy scanning */}
      {showQrModal && qrCodeDataUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-orange-600 uppercase">
                Contrôle d'accès IwacuTix
              </span>
              <h3 className="text-base font-black text-slate-900 truncate">
                {ticket.eventTitle}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {ticket.categoryName} • {ticket.isGift ? ticket.recipientName : user.name}
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl border-2 border-slate-200 inline-block shadow-inner">
              <img 
                src={qrCodeDataUrl} 
                alt={`QR Code plein écran ${ticket.id}`} 
                className="w-64 h-64 object-contain select-none"
              />
            </div>

            <p className="text-[11px] text-slate-600 font-mono">
              Présentez cet écran sous la caméra de l'agent scanneur
            </p>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

