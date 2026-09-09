import { AuthProvider, useAuth } from './lib/auth';
import { useEffect, useState } from 'react';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';

function AppContent() {
  const { session, loading } = useAuth();
  const [authVerified, setAuthVerified] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setAuthVerified(true);
    } else {
      setAuthVerified(false);
    }
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
          <p className="text-yellow-400 font-mono text-sm tracking-widest">CAMPUSLINK</p>
        </div>
      </div>
    );
  }

  if (!session || !authVerified) {
    return <AuthPage />;
  }

  return <Dashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
