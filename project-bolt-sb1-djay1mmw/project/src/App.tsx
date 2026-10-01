import { AuthProvider } from './lib/auth';
import { useAuth } from './lib/auth-context';
import { useEffect, useRef, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';

const MINIMUM_SPLASH_DURATION_MS = 5000;
const LOGIN_SPLASH_DURATION_MS = 2000;
const SPLASH_RING_CIRCUMFERENCE = 2 * Math.PI * 31;

function AppContent() {
  const { session, loading } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (
    window.localStorage.getItem('campuslink-theme') === 'dark' ? 'dark' : 'light'
  ));
  const [authVerified, setAuthVerified] = useState(false);
  const [splashElapsed, setSplashElapsed] = useState(false);
  const [splashProgress, setSplashProgress] = useState(1);
  const [splashMode, setSplashMode] = useState<'startup' | 'login'>('startup');
  const [splashCycle, setSplashCycle] = useState(0);
  const authInitialized = useRef(false);
  const previousSession = useRef(session);

  function toggleTheme() {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    window.localStorage.setItem('campuslink-theme', nextTheme);
    setTheme(nextTheme);
  }

  useEffect(() => {
    const duration = splashMode === 'login' ? LOGIN_SPLASH_DURATION_MS : MINIMUM_SPLASH_DURATION_MS;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      if (splashMode === 'startup') {
        setSplashProgress(Math.min(100, Math.floor((elapsed / duration) * 100) + 1));
      }

      if (elapsed >= duration) {
        if (splashMode === 'startup') setSplashProgress(100);
        setSplashElapsed(true);
        window.clearInterval(timer);
      }
    }, 50);

    return () => window.clearInterval(timer);
  }, [splashCycle, splashMode]);

  useEffect(() => {
    if (loading) return;

    if (!authInitialized.current) {
      authInitialized.current = true;
      previousSession.current = session;
      return;
    }

    if (!previousSession.current && session?.user) {
      setSplashMode('login');
      setSplashElapsed(false);
      setSplashProgress(1);
      setSplashCycle(cycle => cycle + 1);
    }

    previousSession.current = session;
  }, [loading, session]);

  useEffect(() => {
    setAuthVerified(Boolean(session?.user));
  }, [session]);

  if (loading || !splashElapsed) {
    return (
      <div data-theme={theme} className="campuslink-theme min-h-screen flex items-center justify-center px-6">
        <div className="campuslink-loading-screen">
          <div
            className="campuslink-loader-mark"
            role={splashMode === 'login' ? 'status' : 'progressbar'}
            aria-label={splashMode === 'login' ? 'Signing in' : 'Startup progress'}
            aria-valuemin={splashMode === 'startup' ? 0 : undefined}
            aria-valuemax={splashMode === 'startup' ? 100 : undefined}
            aria-valuenow={splashMode === 'startup' ? splashProgress : undefined}
            aria-valuetext={splashMode === 'startup' ? `${splashProgress}%` : undefined}
          >
            <svg className="campuslink-loader-svg" viewBox="0 0 72 72" aria-hidden="true">
              <circle className="campuslink-loader-track" cx="36" cy="36" r="31" />
              <circle
                className={splashMode === 'login' ? 'campuslink-loader-spinner-ring' : 'campuslink-loader-progress-ring'}
                cx="36"
                cy="36"
                r="31"
                strokeDasharray={splashMode === 'login' ? `${SPLASH_RING_CIRCUMFERENCE * 0.24} ${SPLASH_RING_CIRCUMFERENCE}` : SPLASH_RING_CIRCUMFERENCE}
                strokeDashoffset={splashMode === 'startup' ? SPLASH_RING_CIRCUMFERENCE * (1 - splashProgress / 100) : undefined}
              />
            </svg>
            <span className="campuslink-loader-icon" aria-hidden="true"><GraduationCap className="h-6 w-6" /></span>
          </div>
          <div className="text-center">
            <p className="campuslink-loading-brand">CampusLink</p>
            <p role="status" className="campuslink-loading-label">
              {splashMode === 'login' ? 'Signing you in' : 'Preparing your workspace'}
            </p>
            {splashMode === 'startup' && <p className="campuslink-loading-percent" aria-hidden="true">{splashProgress}%</p>}
          </div>
        </div>
      </div>
    );
  }

  if (!session || !authVerified) {
    return <AuthPage theme={theme} onToggleTheme={toggleTheme} />;
  }

  return <Dashboard theme={theme} onToggleTheme={toggleTheme} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
