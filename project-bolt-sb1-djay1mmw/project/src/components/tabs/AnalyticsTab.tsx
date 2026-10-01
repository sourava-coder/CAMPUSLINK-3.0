import type { Student, Job, Application, Offer } from '@/lib/supabase';
import { calculateReadiness } from '@/lib/ai-engine';
import { TrendingUp, Award, AlertTriangle, Target, BarChart3, DollarSign, Brain } from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';

const chartColors = ['#087f86', '#527da5', '#4d9572', '#d1785e', '#bf9748'];
const tooltipStyle = {
  border: '1px solid #d6e2e5',
  borderRadius: 10,
  backgroundColor: 'rgba(255, 255, 255, 0.96)',
  boxShadow: '0 8px 24px rgba(35, 69, 77, 0.12)',
};

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
  const skillNames = new Set([...topSkills.map(([skill]) => skill), ...topSupply.map(([skill]) => skill)]);
  const skillComparison = [...skillNames]
    .map(skill => ({ skill, demand: skillDemand[skill] || 0, students: skillSupply[skill] || 0 }))
    .sort((a, b) => b.demand + b.students - (a.demand + a.students))
    .slice(0, 8);

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

  const riskData = [
    { name: 'High risk', value: readinessBuckets.high, color: '#d1785e' },
    { name: 'Medium risk', value: readinessBuckets.medium, color: '#bf9748' },
    { name: 'Low risk', value: readinessBuckets.low, color: '#4d9572' },
  ].filter(item => item.value > 0);
  const applicationData = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));
  const offerStatusCounts: Record<string, number> = {};
  offers.forEach(offer => {
    offerStatusCounts[offer.status] = (offerStatusCounts[offer.status] || 0) + 1;
  });
  const offerData = Object.entries(offerStatusCounts).map(([status, count]) => ({ status, count }));

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
        {branchData.length === 0 ? <ChartEmptyState label="branch placement data" /> : (
          <div className="h-72 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchData} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }}>
                <CartesianGrid stroke="#dfe8ea" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tickFormatter={value => `${value}%`} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="branch" width={76} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={label => {
                    const branch = branchData.find(item => item.branch === label);
                    return `${label} · ${branch?.placed}/${branch?.total} placed · Avg CGPA ${branch?.avgCgpa}`;
                  }}
                  formatter={value => [`${value}%`, 'Placement rate']}
                />
                <Bar dataKey="rate" name="Placement rate" fill="#087f86" radius={[0, 5, 5, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
            <Target className="w-5 h-5 text-yellow-400" />
            Skill Demand vs Student Supply
          </h3>
          {skillComparison.length === 0 ? <ChartEmptyState label="skill demand and supply data" /> : (
            <div className="h-80 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={skillComparison} layout="vertical" margin={{ top: 4, right: 16, bottom: 20, left: 4 }}>
                  <CartesianGrid stroke="#dfe8ea" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="skill" width={104} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend verticalAlign="bottom" height={28} />
                  <Bar dataKey="demand" name="Recruiter demand (weighted)" fill="#087f86" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="students" name="Students with skill" fill="#658db2" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Package distribution */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-yellow-400" />
          Package Distribution
        </h3>
        {placed.length === 0 ? <ChartEmptyState label="package distribution data" /> : (
          <div className="h-64 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={packageRanges} margin={{ top: 12, right: 12, bottom: 4, left: -16 }}>
                <CartesianGrid stroke="#dfe8ea" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={value => [value, 'Students placed']} />
                <Bar dataKey="count" name="Students placed" radius={[5, 5, 0, 0]} maxBarSize={56}>
                  {packageRanges.map((range, index) => <Cell key={range.label} fill={chartColors[index % chartColors.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* AI Predictive insights */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
          <Brain className="w-5 h-5 text-yellow-400" />
          Placement Risk, Applications & Offers
        </h3>
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-red-400/10 flex items-center justify-center text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <p className="text-sm text-gray-300 font-medium">Risk Distribution</p>
            </div>
            {riskData.length === 0 ? <ChartEmptyState label="risk data" /> : (
              <>
                <div className="h-48 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={riskData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={3} stroke="none">
                        {riskData.map(item => <Cell key={item.name} fill={item.color} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">
                  {riskData.map(item => (
                    <span key={item.name} className="flex items-center gap-1.5 text-gray-500">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name}: {item.value}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-yellow-400/10 flex items-center justify-center text-yellow-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-sm text-gray-300 font-medium">Application Pipeline</p>
            </div>
            {applicationData.length === 0 ? <ChartEmptyState label="application data" /> : (
              <div className="h-56 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={applicationData} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
                    <CartesianGrid stroke="#dfe8ea" strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="status" width={76} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" name="Applications" fill="#087f86" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-green-400/10 flex items-center justify-center text-green-400">
                <Award className="w-5 h-5" />
              </div>
              <p className="text-sm text-gray-300 font-medium">Offer Status</p>
            </div>
            {offerData.length === 0 ? <ChartEmptyState label="offer data" /> : (
              <div className="h-56 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={offerData} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
                    <CartesianGrid stroke="#dfe8ea" strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="status" width={76} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" name="Offers" fill="#658db2" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartEmptyState({ label }: { label: string }) {
  return <div className="flex h-40 items-center justify-center text-sm text-gray-500">No {label} available yet</div>;
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
