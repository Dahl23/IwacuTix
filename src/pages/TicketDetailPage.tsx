import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { ChevronLeft, Share2, Calendar, MapPin, ShieldCheck, User, CreditCard, FileText, FileImage, Smartphone, QrCode as QrIcon } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { parseEventDate, getGoogleCalendarUrl, downloadIcal } from '../utils/calendar';

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, tickets } = useApp();
  const [isExporting, setIsExporting] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Find the ticket by ID
  const ticket = tickets.find((t) => t.id === id);

  useEffect(() => {
    if (!ticket) return;
    const rawQrContent = ticket.qr_code_hash || ticket.qrCodeValue || `${ticket.id}.hmac_sec_2026`;
    QRCode.toDataURL(rawQrContent, {
      width: 280,
      margin: 1,
      color: {
        dark: '#020617',
        light: '#FFFFFF',
      },
    }).then(setQrCodeDataUrl).catch(console.error);
  }, [ticket]);

  if (!ticket) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#F8FAFC] h-full">
        <p className="text-sm text-slate-500">Billet introuvable</p>
        <button
          onClick={() => navigate('/mes-billets')}
          className="mt-6 px-4 py-2 bg-brand-primary text-white rounded-xl text-xs uppercase"
        >
          Retour au portefeuille
        </button>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    if (price === 0) return 'Gratuit';
    return `${price.toLocaleString('fr-FR')} FBu`;
  };

  const handleShare = () => {
    alert(`Billet ${ticket.id} copié dans le presse-papier !`);
  };

  const downloadPNG = async () => {
    const element = document.getElementById('ticket-card-element');
    if (!element) return;
    setIsExporting(true);
    try {
      // Small timeout to allow UI update if any
      await new Promise((resolve) => setTimeout(resolve, 150));
      const canvas = await html2canvas(element, {
        scale: 3, // Premium quality
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `iwacutix-${ticket.id}.png`;
      link.href = image;
      link.click();
    } catch (err) {
      console.error('Error exporting PNG:', err);
      alert('Une erreur est survenue lors de la génération de l\'image.');
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
      
      const imgWidth = 140; // centered and clean
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pageHeight = 297;
      const pageWidth = 210;
      const xPosition = (pageWidth - imgWidth) / 2;
      const yPosition = 35; // clean margin from title
      
      // Top header of PDF
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.setTextColor(249, 115, 22); // brand orange
      pdf.text('IWACUTIX BURUNDI', pageWidth / 2, 18, { align: 'center' });
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      pdf.text('Billet d\'Accès Électronique Certifié Homologué FFB & CNECB', pageWidth / 2, 24, { align: 'center' });
      
      // Divider
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.5);
      pdf.line(20, 28, pageWidth - 20, 28);
      
      // Draw image
      pdf.addImage(imgData, 'PNG', xPosition, yPosition, imgWidth, imgHeight);
      
      // Footer text
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text('Ce billet est infalsifiable et unique. Ne le partagez avec personne d\'autre.', pageWidth / 2, pageHeight - 20, { align: 'center' });
      pdf.text('IwacuTix Burundi • Service Support Client: support@iwacutix.bi', pageWidth / 2, pageHeight - 15, { align: 'center' });
      
      pdf.save(`iwacutix-${ticket.id}.pdf`);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert('Une erreur est survenue lors de la génération du PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC]">
      
      {/* Top Header */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-30 border-b border-slate-200/80 shadow-sm">
        <button
          id="btn-ticket-detail-back"
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer border border-slate-200/40"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-display font-bold text-slate-800">Mon Billet Digital</span>
        <button
          onClick={handleShare}
          className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer border border-slate-200/40"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      <div className="p-6 flex-1 flex flex-col justify-center overflow-y-auto">
        {/* Ticket Physical Card Simulation */}
        <div id="ticket-card-element" className="bg-white rounded-[2rem] border border-slate-200 shadow-xl relative overflow-hidden flex flex-col">
          
          {/* Header stub - Cover representation */}
          <div className="p-5 bg-slate-50/70 space-y-2 border-b border-slate-100 relative">
            {/* Top decorative micro dots */}
            <div className="absolute top-2 left-5 right-5 flex justify-between text-[7px] font-mono text-slate-400">
              <span className="font-bold text-orange-600">IWACUTIX DIGITAL PASS</span>
              <span>100% VALIDATED</span>
            </div>

            <div className="pt-2 flex justify-between items-start gap-4">
              <div className="space-y-1 min-w-0">
                <span className="text-[8px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100">
                  {ticket.eventCategory ? ticket.eventCategory.toUpperCase() : 'SPORT'}
                </span>
                <h3 className="font-display font-bold text-base text-slate-900 tracking-tight leading-snug truncate mt-1">
                  {ticket.eventTitle}
                </h3>
              </div>
            </div>

            {/* Event Time details */}
            <div className="space-y-1.5 text-xs text-slate-600 pt-1">
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-700 font-medium">
                <Calendar className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                <span>{ticket.eventDate} à {ticket.eventTime}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] truncate">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{ticket.eventLocation.split(',')[0]}</span>
              </div>
            </div>
          </div>

          {/* Symmetrical Left and Right Notch cutouts (mimicking a torn ticket stub) */}
          <div className="absolute top-[164px] -left-3.5 w-7 h-7 bg-[#F8FAFC] rounded-full border border-slate-200 z-20"></div>
          <div className="absolute top-[164px] -right-3.5 w-7 h-7 bg-[#F8FAFC] rounded-full border border-slate-200 z-20"></div>
          
          {/* Dashed Tear Line dividing stub header from body */}
          <div className="h-0 border-t-2 border-dashed border-slate-200 mx-5 relative z-10 my-[13px]"></div>

          {/* Ticket Body - QR Code Section */}
          <div className="p-6 flex-1 flex flex-col items-center justify-center text-center space-y-6">
            
            {/* QR Code Container */}
            <div className="p-3 bg-white rounded-3xl border border-slate-200 shadow-md relative group flex items-center justify-center">
              {qrCodeDataUrl ? (
                <img 
                  src={qrCodeDataUrl} 
                  alt={`QR Code ${ticket.id}`} 
                  className="w-44 h-44 object-contain rounded-xl select-none"
                />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center bg-slate-50 rounded-xl">
                  <QrIcon className="w-8 h-8 text-slate-400 animate-pulse" />
                </div>
              )}
            </div>

            {/* Validation Badge */}
            <div className="space-y-1">
              <span className={`inline-flex items-center gap-1.5 text-xs font-mono font-bold tracking-widest px-4 py-1.5 rounded-full border ${
                ticket.status === 'valide'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                <span className={`w-2 h-2 rounded-full ${ticket.status === 'valide' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                {ticket.status === 'valide' ? 'BILLET VALIDE' : 'BILLET UTILISÉ'}
              </span>
              <p className="text-[10px] text-slate-400 font-mono pt-1">SCALABLE UNIQUE IDENTIFIER : {ticket.id}</p>
            </div>

            {/* If recipient has no phone, show printable helper badge */}
            {ticket.isGift && ticket.recipientHasNoPhone && (
              <div className="w-full p-3 bg-amber-50 border border-amber-200 rounded-2xl text-left text-[11px] text-amber-800 space-y-1 shadow-sm">
                <span className="font-bold uppercase tracking-wider text-[9px] text-amber-700 block">FORMAT IMPRIMABLE CERTIFIÉ (SANS PORTABLE)</span>
                <p className="leading-normal font-normal">
                  Ce billet est associé au nom de <strong>{ticket.recipientName}</strong>. Veuillez le télécharger ci-dessous pour lui remettre en main propre.
                </p>
              </div>
            )}

            {/* Breakdown Metadata Table */}
            <div className="w-full pt-4 border-t border-slate-100 grid grid-cols-2 gap-y-3.5 gap-x-4 text-left text-[11px]">
              <div className="space-y-0.5">
                <span className="text-slate-400 font-mono text-[9px] uppercase tracking-wider block font-semibold">Acheteur</span>
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-brand-primary" />
                  {user.name}
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-400 font-mono text-[9px] uppercase tracking-wider block font-semibold">Bénéficiaire</span>
                <span className="font-bold text-indigo-700 flex items-center gap-1 truncate block">
                  <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate">{ticket.isGift ? ticket.recipientName : "Moi-même"}</span>
                </span>
              </div>
              {ticket.isGift && !ticket.recipientHasNoPhone && ticket.recipientPhone && (
                <div className="space-y-0.5 col-span-2">
                  <span className="text-slate-400 font-mono text-[9px] uppercase tracking-wider block font-semibold">Tél. Bénéficiaire</span>
                  <span className="font-mono font-bold text-slate-800 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    {ticket.recipientPhone}
                  </span>
                </div>
              )}
              <div className="space-y-0.5">
                <span className="text-slate-400 font-mono text-[9px] uppercase tracking-wider block font-semibold">Catégorie</span>
                <span className="font-bold text-slate-800 truncate block">{ticket.categoryName}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-400 font-mono text-[9px] uppercase tracking-wider block font-semibold">Moyen de Pay.</span>
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                  <span className="truncate">{ticket.paymentMethod || 'Lumicash'}</span>
                </span>
              </div>
              <div className="space-y-0.5 col-span-2 pt-1.5 border-t border-slate-50 flex justify-between items-center">
                <span className="text-slate-400 font-mono text-[9px] uppercase tracking-wider block font-semibold">Prix d'achat</span>
                <span className="font-mono font-bold text-sm text-brand-primary">{formatPrice(ticket.price)}</span>
              </div>
            </div>

          </div>

          {/* Secure lock banner footer */}
          <div className="p-3 bg-emerald-50 border-t border-emerald-100 flex items-center justify-center gap-1.5 text-[9px] font-mono text-emerald-800 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>CERTIFIÉ INFALSIFIABLE • IWACUTIX DIGITAL</span>
          </div>

        </div>

        {/* Ajouter à l'agenda / Calendrier */}
        <div className="mt-5 p-4 bg-white border border-slate-200/80 rounded-[24px] space-y-3.5 shadow-sm text-left">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Ajouter à mon agenda</h4>
              <p className="text-[10px] text-slate-500">Ne manquez pas l'événement ! Enregistrez-le dans votre calendrier.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2.5 pt-0.5">
            <a
              href={getGoogleCalendarUrl(
                ticket.eventTitle,
                `Billet de réservation IwacuTix Burundi\nBillet ID : ${ticket.id}\nCatégorie : ${ticket.categoryName}\nBénéficiaire : ${ticket.isGift ? ticket.recipientName : 'Moi-même'}\nLieu : ${ticket.eventLocation}`,
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
                `Billet de réservation IwacuTix Burundi\nBillet ID : ${ticket.id}\nCatégorie : ${ticket.categoryName}\nBénéficiaire : ${ticket.isGift ? ticket.recipientName : 'Moi-même'}\nLieu : ${ticket.eventLocation}`,
                ticket.eventLocation,
                parseEventDate(ticket.eventDate, ticket.eventTime),
                ticket.id
              )}
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-[11px] text-slate-700 cursor-pointer active:scale-95 transition-all"
            >
              <svg className="w-3.5 h-3.5 fill-current text-slate-800 shrink-0" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.09 2.48-1.36.03-1.8-.8-3.36-.8-1.56 0-2.04.77-3.34.82-1.33.05-2.35-1.32-3.19-2.53-1.72-2.48-3.03-7-1.26-10.07.88-1.53 2.45-2.5 4.16-2.53 1.3-.02 2.52.88 3.32.88.8 0 2.27-.1 3.81.47 1.48.55 2.64 1.7 3.25 3.13-3.1 1.86-2.6 5.86.53 7.12-.66 1.66-1.5 3.33-2.38 5zM15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.56 2.95-1.39z"/>
              </svg>
              <span>Apple / iCal</span>
            </button>
          </div>
        </div>

        {/* Download & Action buttons */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <button
            id="btn-download-png"
            onClick={downloadPNG}
            disabled={isExporting}
            className="flex items-center justify-center gap-2 py-3.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl font-bold text-xs text-slate-700 cursor-pointer active:scale-95 transition-all shadow-sm disabled:opacity-50"
          >
            <FileImage className="w-4 h-4 text-orange-600 shrink-0" />
            {isExporting ? 'Génération...' : 'Télécharger PNG'}
          </button>
          
          <button
            id="btn-download-pdf"
            onClick={downloadPDF}
            disabled={isExporting}
            className="flex items-center justify-center gap-2 py-3.5 px-4 bg-iwacu-gradient hover:opacity-95 text-white rounded-xl font-btn text-xs cursor-pointer active:scale-95 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50"
          >
            <FileText className="w-4 h-4 shrink-0" />
            {isExporting ? 'Génération...' : 'Télécharger PDF'}
          </button>
        </div>

      </div>

    </div>
  );
};
