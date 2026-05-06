import { useState } from 'react';
import { Header, Footer, Navigation, Notifications } from './components/common';
import { LoginModal, SignupModal } from './components/modals';
import { Home, LandingPage } from './pages/Home';
import { DonorDashboard, BecomeDonor } from './pages/DonorDashboard';
import { RequestorDashboard } from './pages/RequestorDashboard';
import { HospitalPanel, HospitalList } from './pages/HospitalPanel';
import { Education } from './components/features/Education/Education';
import { FindBlood } from './components/features/FindBlood/FindBlood';
import { Profile } from './components/features/Profile/Profile';
import type { User } from './types';

type Page = 'home' | 'find-blood' | 'request-blood' | 'become-donor' | 'hospitals' | 'hospitals-list' | 'education' | 'donor-dashboard' | 'requestor-dashboard' | 'hospital-panel' | 'profile' | 'notifications';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (userData: User) => {
    setUser(userData);
    setShowLoginModal(false);
    // Navigate to appropriate dashboard based on role
    if (userData.role === 'donor') {
      setCurrentPage('donor-dashboard');
    } else if (userData.role === 'requestor') {
      setCurrentPage('requestor-dashboard');
    } else if (userData.role === 'hospital') {
      setCurrentPage('hospital-panel');
    }
  };

  const handleSignup = (userData: User) => {
    setUser(userData);
    setShowSignupModal(false);
    // Navigate to appropriate dashboard based on role
    if (userData.role === 'donor') {
      setCurrentPage('donor-dashboard');
    } else if (userData.role === 'requestor') {
      setCurrentPage('requestor-dashboard');
    } else if (userData.role === 'hospital') {
      setCurrentPage('hospital-panel');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentPage('home');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        user={user}
        onLogin={() => setShowLoginModal(true)}
        onSignup={() => setShowSignupModal(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1">
        {currentPage === 'home' && <LandingPage onNavigate={setCurrentPage} onLogin={() => setShowLoginModal(true)} />}
        {currentPage === 'find-blood' && <FindBlood />}
        {currentPage === 'request-blood' && <RequestorDashboard user={user} />}
        {currentPage === 'become-donor' && <BecomeDonor />}
        {currentPage === 'hospitals' && <HospitalList />}
        {currentPage === 'hospitals-list' && <HospitalList />}
        {currentPage === 'education' && <Education />}
        {currentPage === 'donor-dashboard' && <DonorDashboard user={user} />}
        {currentPage === 'requestor-dashboard' && <RequestorDashboard user={user} />}
        {currentPage === 'hospital-panel' && <HospitalPanel user={user} />}
        {currentPage === 'profile' && <Profile user={user} />}
        {currentPage === 'notifications' && <Notifications />}
      </main>

      <Footer />

      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLogin={handleLogin}
          onSwitchToSignup={() => {
            setShowLoginModal(false);
            setShowSignupModal(true);
          }}
        />
      )}

      {showSignupModal && (
        <SignupModal
          onClose={() => setShowSignupModal(false)}
          onSignup={handleSignup}
          onSwitchToLogin={() => {
            setShowSignupModal(false);
            setShowLoginModal(true);
          }}
        />
      )}
    </div>
  );
}