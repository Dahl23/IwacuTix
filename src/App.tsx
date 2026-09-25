import { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useLocation, useNavigate, Location } from 'react-router-dom';
import { AppProvider } from './AppContext';
import { PhoneContainer } from './components/PhoneContainer';
import { PurchaseCardOverlay, isPurchaseRoute } from './components/PurchaseCardOverlay';

// Import all modular pages
import { SplashPage } from './pages/SplashPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { HomePage } from './pages/HomePage';
import { MyTicketsPage } from './pages/MyTicketsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SearchPage } from './pages/SearchPage';
import { CreateEventPage } from './pages/CreateEventPage';
import { DashboardPage } from './pages/DashboardPage';
import { OrganizerHubPage } from './pages/OrganizerHubPage';
import { OrganizerKycPage } from './pages/OrganizerKycPage';
import { ScannerPage } from './pages/ScannerPage';
import { SuperAdminPage } from './pages/SuperAdminPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';


function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();

  // Maintain the last discovery / main location to keep it active in the background
  const [backgroundLocation, setBackgroundLocation] = useState<Location | { pathname: string }>({ pathname: '/home' });

  const isPurchase = isPurchaseRoute(location.pathname);

  // When browsing non-purchase main pages, keep the background updated
  useEffect(() => {
    if (!isPurchase && location.pathname !== '/onboarding' && location.pathname !== '/splash') {
      setBackgroundLocation(location);
    }
  }, [location, isPurchase]);

  // Handler to close the detached purchase card and return to the main discovery page
  const handleClosePurchaseCard = () => {
    const targetPath = (backgroundLocation && 'pathname' in backgroundLocation && backgroundLocation.pathname)
      ? backgroundLocation.pathname
      : '/home';
    navigate(targetPath);
  };

  // If in purchase flow, render background discovery page underneath
  const renderedLocation = isPurchase ? backgroundLocation : location;

  return (
    <>
      <PhoneContainer>
        <Routes location={renderedLocation}>
          {/* 1. Main discovery home screen (direct landing on announcements) */}
          <Route path="/" element={<HomePage />} />
          <Route path="/home" element={<HomePage />} />
          
          {/* 2. Optional splash and onboard routes */}
          <Route path="/splash" element={<SplashPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          
          {/* 3. List of purchased digital passes */}
          <Route path="/mes-billets" element={<MyTicketsPage />} />
          
          {/* 4. Buyer profile & support details */}
          <Route path="/profil" element={<ProfilePage />} />
          
          {/* 5. Query match & city filtration */}
          <Route path="/recherche" element={<SearchPage />} />

          {/* 6. Organizer CNI & Email KYC verification */}
          <Route path="/organisateur/verification" element={<OrganizerKycPage />} />

          {/* 7. Organizer Hub (exclusive management of events attached to the organizer) */}
          <Route path="/organisateur" element={<OrganizerHubPage />} />

          {/* 8. Partner Event Creation form */}
          <Route path="/organisateur/creer" element={<CreateEventPage />} />

          {/* 9. Partner Event Sales & Ticket Scanning Dashboard for a specific event */}
          <Route path="/organisateur/dashboard/:id" element={<DashboardPage />} />

          {/* 10. Specialized Access Control & Ticket Scanner (Section 4 & 8) */}
          <Route path="/scan" element={<ScannerPage />} />

          {/* 11. SuperAdmin Platform Parameters & KYC Supervision (Section 3 & 5) */}
          <Route path="/admin/superadmin" element={<SuperAdminPage />} />

          {/* 12. Email verification (lien ?code= reçu par email) */}
          <Route path="/verifier-email" element={<VerifyEmailPage />} />

          {/* 13. Lost password flows (demande + confirmation ?code=&email=) */}
          <Route path="/mot-de-passe-oublie" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Catch-all fallback */}
          <Route path="*" element={<HomePage />} />
        </Routes>
      </PhoneContainer>

      {/* Floating Detached Purchase Card over the main page */}
      {isPurchase && (
        <PurchaseCardOverlay onClose={handleClosePurchaseCard} />
      )}
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AppProvider>
  );
}

