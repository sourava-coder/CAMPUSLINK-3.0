import type { Student, Job, Application, Offer } from '@/lib/supabase';
import { calculateReadiness } from '@/lib/ai-engine';
import { TrendingUp, Users, Award, AlertTriangle, Target, BarChart3, DollarSign, Brain } from 'lucide-react';

type Props = {
  students: Student[];
  jobs: Job[];
  applications: Application[];
  offers: Offer[];
};

export default function AnalyticsTab({ students, jobs, applications, offers }: Props) {
  const placed = students.filter(s => s.status === 'placed');
  const placementRate = students.length > 0 ? Math.round((placed.length / students.length) * 100) : 0;
  const avgPackage = placed.length > 0 ? (placed.reduce((a, s) => a + (s.placed_package || 0), 0) / placed.length).toFixed(1) : '0';
  const highestPackage = Math.max(...students.map(s => s.placed_package || 0), 0);
  const atRisk = students.filter(s => calculateReadiness(s).riskLevel === 'high');
  const mediumRisk = students.filter(s => calculateReadiness(s).riskLevel === 'medium');

  // Branch-wise placement
  const branchData = Object.entries(
    students.reduce((acc, s) => {
      const branch = s.branch || 'Unknown';
      if (!acc[branch]) acc[branch] = { total: 0, placed: 0, avgCgpa: 0 };
      acc[branch].total++;
      acc[branch].avgCgpa += s.cgpa;
      if (s.status === 'placed') acc[branch].placed++;
      return acc;
    }, {} as Record<string, { total: number; placed: number; avgCgpa: number }>)
  ).map(([branch, data]) => ({
    branch,
    total: data.total,
    placed: data.placed,
    rate: Math.round((data.placed / data.total) * 100),
    avgCgpa: (data.avgCgpa / data.total).toFixed(1),
  }));

  // Skill demand
  const skillDemand: Record<string, number> = {};
  jobs.forEach(j => {
    j.required_skills.forEach(s => { skillDemand[s] = (skillDemand[s] || 0) + 1; });
    j.preferred_skills.forEach(s => { skillDemand[s] = (skillDemand[s] || 0) + 0.5; });
  });
  const topSkills = Object.entries(skillDemand).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Skill supply (students who have each skill)
  const skillSupply: Record<string, number> = {};
  students.forEach(s => s.skills.forEach(sk => { skillSupply[sk] = (skillSupply[sk] || 0) + 1; }));
  const topSupply = Object.entries(skillSupply).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Application status distribution
  const statusCounts: Record<string, number> = {};
  applications.forEach(a => { statusCounts[a.status] = (statusCounts[a.status] || 0) + 1; });

  // Package distribution
  const packageRanges = [
    { label: '0-5 LPA', min: 0, max: 5, count: 0 },
    { label: '5-10 LPA', min: 5, max: 10, count: 0 },
    { label: '10-20 LPA', min: 10, max: 20, count: 0 },
    { label: '20-30 LPA', min: 20, max: 30, count: 0 },
    { label: '30+ LPA', min: 30, max: Infinity, count: 0 },
  ];
  placed.forEach(s => {
    const pkg = s.placed_package || 0;
    packageRanges.forEach(r => { if (pkg >= r.min && pkg < r.max) r.count++; });
  });

  // Readiness distribution
  const readinessBuckets = { low: 0, medium: 0, high: 0 };
  students.forEach(s => {
    const r = calculateReadiness(s);
    readinessBuckets[r.riskLevel]++;
  });

  return (
    <div className="space-y-6">
      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Placement Rate" value={`${placementRate}%`} icon={<TrendingUp className="w-5 h-5" />} sub={`${placed.length}/${students.length} placed`} color="green" />
        <MetricCard label="Avg Package" value={`₹${avgPackage}L`} icon={<DollarSign className="w-5 h-5" />} sub="per annum" color="yellow" />
        <MetricCard label="Highest Package" value={`₹${highestPackage}L`} icon={<Award className="w-5 h-5" />} sub="this year" color="yellow" />
        <MetricCard label="At-Risk Students" value={`${atRisk.length + mediumRisk.length}`} icon={<AlertTriangle className="w-5 h-5" />} sub={`${atRisk.length} high · ${mediumRisk.length} medium`} color="red" />
      </div>

      {/* Branch-wise placement */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-yellow-400" />
          Placement Rate by Branch
        </h3>
        <div className="space-y-4">
          {branchData.map(b => (
            <div key={b.branch}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-300 font-medium">{b.branch}</span>
                  <span className="text-xs text-gray-500">Avg CGPA {b.avgCgpa}</span>
                </div>
                <span className="text-sm text-yellow-400 font-medium">{b.rate}% ({b.placed}/{b.total})</span>
              </div>
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-500"
                  style={{ width: `${b.rate}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Skill demand */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
            <Target className="w-5 h-5 text-yellow-400" />
            Most Demanded Skills (Recruiters)
          </h3>
          <div className="space-y-3">
            {topSkills.map(([skill, demand]) => {
              const maxDemand = topSkills[0][1];
              return (
                <div key={skill}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-300">{skill}</span>
                    <span className="text-xs text-gray-500">{Math.round(demand)} mentions</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full" style={{ width: `${(demand / maxDemand) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Skill supply */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
            <Users className="w-5 h-5 text-yellow-400" />
            Student Skill Distribution
          </h3>
          <div className="space-y-3">
            {topSupply.map(([skill, count]) => {
              const maxCount = topSupply[0][1];
              return (
                <div key={skill}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-300">{skill}</span>
                    <span className="text-xs text-gray-500">{count} students</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-400 to-yellow-400 rounded-full" style={{ width: `${(count / maxCount) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Package distribution */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-yellow-400" />
          Package Distribution
        </h3>
        <div className="flex items-end gap-4 h-48">
          {packageRanges.map(r => {
            const maxCount = Math.max(...packageRanges.map(p => p.count), 1);
            const height = (r.count / maxCount) * 100;
            return (
              <div key={r.label} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-sm text-white font-medium">{r.count}</span>
                <div className="w-full bg-zinc-800 rounded-t-lg overflow-hidden flex-1 flex items-end">
                  <div
                    className="w-full bg-gradient-to-t from-yellow-500 to-yellow-400 rounded-t-lg transition-all duration-500"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 text-center">{r.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Predictive insights */}
      <div className="bg-gradient-to-br from-yellow-400/5 to-transparent border border-yellow-400/20 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
          <Brain className="w-5 h-5 text-yellow-400" />
          AI Predictive Insights
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-zinc-900 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-red-400/10 flex items-center justify-center text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <p className="text-sm text-gray-300 font-medium">Risk Distribution</p>
            </div>
            <div className="space-y-2 mt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-red-400">High Risk</span>
                <span className="text-white">{readinessBuckets.high}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-yellow-400">Medium Risk</span>
                <span className="text-white">{readinessBuckets.medium}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-400">Low Risk</span>
                <span className="text-white">{readinessBuckets.low}</span>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-yellow-400/10 flex items-center justify-center text-yellow-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-sm text-gray-300 font-medium">Application Pipeline</p>
            </div>
            <div className="space-y-2 mt-3">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 capitalize">{status}</span>
                  <span className="text-white">{count}</span>
                </div>
              ))}
              {Object.keys(statusCounts).length === 0 && <p className="text-xs text-gray-600">No applications</p>}
            </div>
          </div>

          <div className="bg-zinc-900 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-green-400/10 flex items-center justify-center text-green-400">
                <Award className="w-5 h-5" />
              </div>
              <p className="text-sm text-gray-300 font-medium">Offer Stats</p>
            </div>
            <div className="space-y-2 mt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Total Offers</span>
                <span className="text-white">{offers.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Sent</span>
                <span className="text-white">{offers.filter(o => o.status === 'sent' || o.status === 'accepted').length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Accepted</span>
                <span className="text-white">{offers.filter(o => o.status === 'accepted').length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, sub, color }: {
  label: string; value: string; icon: React.ReactNode; sub: string; color: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
        color === 'green' ? 'bg-green-400/10 text-green-400' :
        color === 'red' ? 'bg-red-400/10 text-red-400' : 'bg-yellow-400/10 text-yellow-400'
      }`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
      <p className="text-xs text-gray-600 mt-0.5">{sub}</p>
    </div>
  );
}
