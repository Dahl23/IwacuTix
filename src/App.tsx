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
import { ScannerPage } from './pages/ScannerPage';
import { SuperAdminPage } from './pages/SuperAdminPage';
import { RoleSwitcherBanner } from './components/RoleSwitcherBanner';


function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();

  // Maintain the last discovery / main location to keep it active in the background
  const [backgroundLocation, setBackgroundLocation] = useState<Location | { pathname: string }>({ pathname: '/home' });

  const isPurchase = isPurchaseRoute(location.pathname);

  // When browsing non-purchase main pages, keep the background updated
  useEffect(() => {
    if (!isPurchase && location.pathname !== '/' && location.pathname !== '/onboarding') {
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
      <RoleSwitcherBanner />
      <PhoneContainer>
        <Routes location={renderedLocation}>
          {/* 1. Splash intro screen */}
          <Route path="/" element={<SplashPage />} />
          
          {/* 2. Three onboard slides */}
          <Route path="/onboarding" element={<OnboardingPage />} />
          
          {/* 3. Main discovery home screen */}
          <Route path="/home" element={<HomePage />} />
          
          {/* 4. List of purchased digital passes */}
          <Route path="/mes-billets" element={<MyTicketsPage />} />
          
          {/* 5. Buyer profile & support details */}
          <Route path="/profil" element={<ProfilePage />} />
          
          {/* 6. Query match & city filtration */}
          <Route path="/recherche" element={<SearchPage />} />

          {/* 7. Partner Event Creation form */}
          <Route path="/organisateur/creer" element={<CreateEventPage />} />

          {/* 8. Partner Event Sales & Ticket Scanning Dashboard */}
          <Route path="/organisateur/dashboard/:id" element={<DashboardPage />} />

          {/* 9. Specialized Access Control & Ticket Scanner (Section 4 & 8) */}
          <Route path="/scan" element={<ScannerPage />} />

          {/* 10. SuperAdmin Platform Parameters & KYC Supervision (Section 3 & 5) */}
          <Route path="/admin/superadmin" element={<SuperAdminPage />} />

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

