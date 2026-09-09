import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { GraduationCap, Mail, Lock, User, ArrowRight, CheckCircle2, Zap, Brain, BarChart3 } from 'lucide-react';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'verify'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password);
      if (error) {
        setError(error);
      } else {
        setSuccess('Account created! Check your email for verification, then sign in.');
        setMode('verify');
      }
      setLoading(false);
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error);
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex">
      {/* Left side — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 via-transparent to-yellow-600/5" />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(250,204,21,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(245,158,11,0.1) 0%, transparent 50%)',
        }} />
        <div className="relative z-10 flex flex-col justify-center px-16 py-12">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-400/30">
              <GraduationCap className="w-8 h-8 text-black" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-yellow-400 tracking-tight">CAMPUSLINK</h1>
              <p className="text-yellow-400/60 text-sm font-mono">AI Placement Platform</p>
            </div>
          </div>

          <h2 className="text-4xl font-bold text-white leading-tight mb-6">
            The AI-powered<br />
            <span className="text-yellow-400">campus-to-corporate</span><br />
            intelligence platform
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed mb-10 max-w-md">
            Predict student readiness, match candidates with AI, automate placement operations, and send offer letters — all from one platform.
          </p>

          <div className="space-y-4 max-w-md">
            <Feature icon={<Brain className="w-5 h-5" />} title="AI Candidate Matching" desc="Explainable fit scores with skill gap analysis" />
            <Feature icon={<Zap className="w-5 h-5" />} title="AI Copilot Assistant" desc="Chat with your placement data in natural language" />
            <Feature icon={<BarChart3 className="w-5 h-5" />} title="Predictive Analytics" desc="Identify at-risk students before it's too late" />
          </div>
        </div>
      </div>

      {/* Right side — auth form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-400/5 rounded-full blur-3xl" />
        <div className="w-full max-w-md relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-black" />
            </div>
            <h1 className="text-2xl font-black text-yellow-400 tracking-tight">CAMPUSLINK</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">
              {mode === 'login' && 'Admin Login'}
              {mode === 'register' && 'Create Admin Account'}
              {mode === 'verify' && 'Verify Your Email'}
            </h2>
            <p className="text-gray-400">
              {mode === 'login' && 'Sign in to manage your placement cell'}
              {mode === 'register' && 'Register as a placement officer'}
              {mode === 'verify' && 'Check your inbox for the verification link'}
            </p>
          </div>

          {mode === 'verify' ? (
            <div className="space-y-6">
              <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-6 flex flex-col items-center text-center gap-4">
                <CheckCircle2 className="w-16 h-16 text-yellow-400" />
                <p className="text-white text-lg font-semibold">Registration Successful</p>
                <p className="text-gray-400">{success || 'Check your email for a verification link. Click it to activate your account, then sign in below.'}</p>
              </div>
              <button
                onClick={() => setMode('login')}
                className="w-full py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold rounded-xl hover:from-yellow-300 hover:to-yellow-400 transition-all shadow-lg shadow-yellow-400/20"
              >
                Proceed to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@college.edu"
                    className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/30 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/30 transition-all"
                  />
                </div>
              </div>

              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/30 transition-all"
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold rounded-xl hover:from-yellow-300 hover:to-yellow-400 transition-all shadow-lg shadow-yellow-400/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Please wait...' : (
                  <>
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <div className="text-center text-sm text-gray-400">
                {mode === 'login' ? (
                  <>
                    Don't have an account?{' '}
                    <button type="button" onClick={() => { setMode('register'); setError(null); }} className="text-yellow-400 font-semibold hover:underline">
                      Register here
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button type="button" onClick={() => { setMode('login'); setError(null); }} className="text-yellow-400 font-semibold hover:underline">
                      Sign in
                    </button>
                  </>
                )}
              </div>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
            <p className="text-xs text-gray-600">Built for Hackathon 2026 · CampusLink AI Placement Platform</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-lg bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400 shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-white font-semibold">{title}</p>
        <p className="text-gray-500 text-sm">{desc}</p>
      </div>
    </div>
  );
}
