import type { Student, Company, Job, Application, Interview, Offer, Notification } from '@/lib/supabase';
import { calculateReadiness } from '@/lib/ai-engine';
import { Users, Building2, Briefcase, TrendingUp, AlertTriangle, Calendar, FileText, Bell, ArrowRight, Trophy, Target, Clock } from 'lucide-react';

type Props = {
  students: Student[];
  companies: Company[];
  jobs: Job[];
  applications: Application[];
  interviews: Interview[];
  offers: Offer[];
  notifications: Notification[];
  onNavigate: (tab: string) => void;
};

export default function OverviewTab({ students, companies, jobs, applications, interviews, offers, notifications, onNavigate }: Props) {
  const placed = students.filter(s => s.status === 'placed');
  const placementRate = students.length > 0 ? Math.round((placed.length / students.length) * 100) : 0;
  const avgPackage = placed.length > 0 ? (placed.reduce((a, s) => a + (s.placed_package || 0), 0) / placed.length).toFixed(1) : '0';
  const highestPackage = Math.max(...students.map(s => s.placed_package || 0), 0);
  const atRisk = students.filter(s => {
    const readiness = calculateReadiness(s);
    return readiness.riskLevel === 'high' || readiness.riskLevel === 'medium';
  });
  const upcomingInterviews = interviews.filter(i => i.status === 'scheduled' && new Date(i.scheduled_at) > new Date());
  const pendingOffers = offers.filter(o => o.status === 'pending');
  const unsentNotifications = notifications.filter(n => !n.sent);

  const stats = [
    { label: 'Total Students', value: students.length, icon: <Users className="w-5 h-5" />, color: 'yellow' },
    { label: 'Placed', value: placed.length, sub: `${placementRate}% rate`, icon: <Trophy className="w-5 h-5" />, color: 'green' },
    { label: 'Companies', value: companies.length, icon: <Building2 className="w-5 h-5" />, color: 'blue' },
    { label: 'Active Drives', value: jobs.filter(j => j.status === 'active').length, icon: <Briefcase className="w-5 h-5" />, color: 'yellow' },
    { label: 'Avg Package', value: `₹${avgPackage}L`, icon: <TrendingUp className="w-5 h-5" />, color: 'green' },
    { label: 'Highest Package', value: `₹${highestPackage}L`, icon: <Target className="w-5 h-5" />, color: 'yellow' },
  ];

  const insights = [
    { icon: <AlertTriangle className="w-5 h-5" />, text: `${atRisk.length} students have elevated placement risk`, action: 'View Students', tab: 'students', color: 'red' },
    { icon: <Calendar className="w-5 h-5" />, text: `${upcomingInterviews.length} upcoming interviews/tests scheduled`, action: 'View Schedule', tab: 'scheduler', color: 'yellow' },
    { icon: <FileText className="w-5 h-5" />, text: `${pendingOffers.length} offer letters pending to be sent`, action: 'Send Offers', tab: 'offers', color: 'yellow' },
    { icon: <Bell className="w-5 h-5" />, text: `${unsentNotifications.length} notifications not yet sent to students`, action: 'View Notifications', tab: 'overview', color: 'red' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-yellow-400/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                stat.color === 'yellow' ? 'bg-yellow-400/10 text-yellow-400' :
                stat.color === 'green' ? 'bg-green-400/10 text-green-400' :
                'bg-blue-400/10 text-blue-400'
              }`}>
                {stat.icon}
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            {stat.sub && <p className="text-xs text-yellow-400/60 mt-0.5">{stat.sub}</p>}
          </div>
        ))}
      </div>

      {/* AI Insights */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-yellow-400/20 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-yellow-400/10 flex items-center justify-center text-yellow-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">AI Placement Insights</h3>
          <span className="ml-auto px-2 py-0.5 text-[10px] bg-yellow-400 text-black font-bold rounded-full">LIVE</span>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {insights.map((insight, i) => (
            <div key={i} className="flex items-center gap-4 bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                insight.color === 'red' ? 'bg-red-400/10 text-red-400' : 'bg-yellow-400/10 text-yellow-400'
              }`}>
                {insight.icon}
              </div>
              <p className="text-sm text-gray-300 flex-1">{insight.text}</p>
              <button
                onClick={() => onNavigate(insight.tab)}
                className="text-yellow-400 text-sm font-medium hover:underline flex items-center gap-1 shrink-0"
              >
                {insight.action}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent applications */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Recent Applications</h3>
          <div className="space-y-3">
            {applications.slice(0, 5).map(app => (
              <div key={app.id} className="flex items-center gap-3 py-2 border-b border-zinc-800 last:border-0">
                <div className="w-9 h-9 rounded-full bg-yellow-400/10 flex items-center justify-center text-yellow-400 text-sm font-bold shrink-0">
                  {app.student?.name.charAt(0) || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate">{app.student?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{app.job?.title} at {app.job?.company?.name}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-yellow-400">{app.fit_score}%</span>
                  <span className={`px-2 py-0.5 text-[10px] rounded-full font-medium ${
                    app.status === 'selected' ? 'bg-green-400/10 text-green-400' :
                    app.status === 'shortlisted' ? 'bg-yellow-400/10 text-yellow-400' :
                    'bg-zinc-800 text-gray-400'
                  }`}>
                    {app.status}
                  </span>
                </div>
              </div>
            ))}
            {applications.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No applications yet</p>}
          </div>
        </div>

        {/* Upcoming interviews */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Upcoming Interviews & Tests</h3>
          <div className="space-y-3">
            {upcomingInterviews.slice(0, 5).map(interview => (
              <div key={interview.id} className="flex items-center gap-3 py-2 border-b border-zinc-800 last:border-0">
                <div className="w-9 h-9 rounded-lg bg-yellow-400/10 flex items-center justify-center text-yellow-400 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate">{interview.student?.name}</p>
                  <p className="text-xs text-gray-500">{interview.type} · {interview.venue}</p>
                </div>
                <p className="text-xs text-yellow-400/70 shrink-0">
                  {new Date(interview.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  {' '}
                  {new Date(interview.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
            {upcomingInterviews.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No upcoming interviews</p>}
          </div>
        </div>
      </div>

      {/* Placement by branch */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-5">Placement Rate by Branch</h3>
        <div className="space-y-4">
          {Object.entries(
            students.reduce((acc, s) => {
              const branch = s.branch || 'Unknown';
              if (!acc[branch]) acc[branch] = { total: 0, placed: 0 };
              acc[branch].total++;
              if (s.status === 'placed') acc[branch].placed++;
              return acc;
            }, {} as Record<string, { total: number; placed: number }>)
          ).map(([branch, data]) => {
            const rate = Math.round((data.placed / data.total) * 100);
            return (
              <div key={branch}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-gray-300">{branch}</span>
                  <span className="text-sm text-yellow-400 font-medium">{rate}% ({data.placed}/{data.total})</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-500"
                    style={{ width: `${rate}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
