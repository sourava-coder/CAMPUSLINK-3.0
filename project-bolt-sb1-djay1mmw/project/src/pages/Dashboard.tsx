import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase, type Student, type Company, type Job, type Application, type Interview, type Offer, type Notification, type AdminSettings } from '@/lib/supabase';
import { dbService } from '@/lib/db-service';
import { calculateReadiness } from '@/lib/ai-engine';

function inferCountFromResume(resumeText: string | null, patterns: RegExp[]): number {
  if (!resumeText) return 0;

  for (const pattern of patterns) {
    const match = resumeText.match(pattern);
    if (match) {
      return Math.max(0, Number(match[1] || 0));
    }
  }

  return 0;
}

function inferSkillsFromResume(resumeText: string | null): string[] {
  if (!resumeText) return [];

  const skillMatch = resumeText.match(/skill[s]?\s*[:\-]?\s*([^]+)/i);
  const source = skillMatch ? skillMatch[1] : resumeText;

  const extracted = source
    .split(/[\n,]+/)
    .map(part => part.trim().replace(/[.;]+$/, ''))
    .filter(part => part && !/^\d+$/.test(part))
    .map(part => part.replace(/^[\W_]+|[\W_]+$/g, ''))
    .filter(part => part && part.length > 1)
    .map(part => part.replace(/\s+/g, ' '));

  const exclude = new Set([
    'and', 'in', 'on', 'the', 'a', 'for', 'with', 'to', 'of', 'computer', 'science', 'experience', 'year',
    'years', 'project', 'projects', 'complete', 'completed', 'btech', 'skill', 'skills', 'work'
  ]);

  return [...new Set(
    extracted
      .filter(item => !exclude.has(item.toLowerCase()))
      .map(item => item.replace(/\s+/g, ' '))
  )];
}

function normalizeStudent(student: any): Student {
  const resumeText = typeof student.resume_text === 'string' ? student.resume_text : '';

  const inferredSkills = Array.isArray(student.skills) && student.skills.length > 0
    ? student.skills
    : inferSkillsFromResume(resumeText);

  const inferredProjects = Number(student.projects ?? 0) || inferCountFromResume(resumeText, [
    /\b(\d+)\s+projects?\b/i,
    /\b(\d+)\s+project\b/i,
  ]);

  const inferredInternships = Number(student.internships ?? 0) || inferCountFromResume(resumeText, [
    /\b(\d+)\s+internships?\b/i,
    /\b(\d+)\s+internship\b/i,
    /\b(\d+)\s+industrial\s+training\b/i,
    /\b(\d+)\s+training(?:s)?\b/i,
  ]);

  const normalizedSkills = inferredSkills;
  const normalizedCertifications = Array.isArray(student.certifications) ? student.certifications : [];
  const normalizedSkillLevels = student.skill_levels ?? {};
  const normalizedStudent = {
    ...student,
    skills: normalizedSkills,
    skill_levels: normalizedSkillLevels,
    certifications: normalizedCertifications,
    projects: inferredProjects,
    internships: inferredInternships,
    backlogs: Number(student.backlogs ?? 0),
    aptitude_score: Number(student.aptitude_score ?? 0),
    communication_score: Number(student.communication_score ?? 0),
    resume_quality: Number(student.resume_quality ?? 0),
    interview_readiness: Number(student.interview_readiness ?? 0),
    cgpa: Number(student.cgpa ?? 0),
    risk_level: 'low',
  } as Student;

  normalizedStudent.risk_level = calculateReadiness(normalizedStudent).riskLevel;
  return normalizedStudent;
}
import {
  GraduationCap, LayoutDashboard, Users, Building2, Brain, Calendar,
  FileText, Bell, LogOut, Sparkles, Menu, X, Settings, RefreshCw
} from 'lucide-react';
import OverviewTab from '@/components/tabs/OverviewTab';
import StudentsTab from '@/components/tabs/StudentsTab';
import CompaniesTab from '@/components/tabs/CompaniesTab';
import AIMatchingTab from '@/components/tabs/AIMatchingTab';
import SchedulerTab from '@/components/tabs/SchedulerTab';
import OffersTab from '@/components/tabs/OffersTab';
import AnalyticsTab from '@/components/tabs/AnalyticsTab';
import CopilotTab from '@/components/tabs/CopilotTab';
import SettingsTab from '@/components/tabs/SettingsTab';

type Tab = 'overview' | 'students' | 'companies' | 'matching' | 'scheduler' | 'offers' | 'analytics' | 'copilot' | 'settings';

export default function Dashboard() {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    const [
      { data: studentsData },
      { data: companiesData },
      { data: jobsData },
      { data: applicationsData },
      { data: interviewsData },
      { data: offersData },
      { data: notifData },
      { data: settingsData },
    ] = await Promise.all([
      dbService.getStudents(),
      dbService.getCompanies(),
      dbService.getJobs(),
      dbService.getApplications(),
      dbService.getInterviews(),
      dbService.getOffers(),
      dbService.getNotifications(),
      dbService.getAdminSettings(),
    ]);

    const normalizedStudents = (studentsData || []).map(normalizeStudent);

    setStudents(normalizedStudents);
    setCompanies(companiesData || []);
    setJobs(jobsData || []);
    setApplications(applicationsData || []);
    setInterviews(interviewsData || []);
    setOffers(offersData || []);
    setNotifications(notifData || []);
    setSettings(settingsData);
    setLoading(false);
  }

  const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'students', label: 'Students', icon: <Users className="w-5 h-5" /> },
    { id: 'companies', label: 'Recruiters', icon: <Building2 className="w-5 h-5" /> },
    { id: 'matching', label: 'AI Matching', icon: <Brain className="w-5 h-5" /> },
    { id: 'scheduler', label: 'Smart Scheduler', icon: <Calendar className="w-5 h-5" /> },
    { id: 'offers', label: 'Offer Tracker', icon: <FileText className="w-5 h-5" /> },
    { id: 'analytics', label: 'Analytics', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'copilot', label: 'AI Copilot', icon: <Sparkles className="w-5 h-5" /> },
    { id: 'settings', label: 'Admin Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-black flex">
      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-zinc-950 border-r border-yellow-400/10 z-50 transition-transform campuslink-sidebar-in ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center gap-3 px-6 h-16 border-b border-yellow-400/10">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shrink-0 campuslink-logo-glow">
            <GraduationCap className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-lg font-black text-yellow-400 tracking-tight">CAMPUSLINK</h1>
            <p className="text-yellow-400/40 text-[10px] font-mono">AI PLACEMENT OS</p>
          </div>
        </div>

        <nav className="px-3 py-4 space-y-1 overflow-y-auto h-[calc(100vh-4rem-4rem)]">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === item.id
                  ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20'
                  : 'text-gray-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              {item.icon}
              {item.label}
              {item.id === 'copilot' && (
                <span className="ml-auto px-2 py-0.5 text-[9px] bg-yellow-400 text-black font-bold rounded-full">AI</span>
              )}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-yellow-400/10">
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-x-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-30 min-h-16 bg-zinc-950/80 backdrop-blur-xl border-b border-yellow-400/10 flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-400 hover:text-white">
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-base sm:text-lg font-semibold text-white truncate">
              {navItems.find(n => n.id === activeTab)?.label}
            </h2>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
            <button
              type="button"
              onClick={loadAllData}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-yellow-400/20 bg-yellow-400/5 text-yellow-400 hover:bg-yellow-400/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="text-xs font-medium">Refresh</span>
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-400/10 border border-green-400/20 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-400 text-xs font-medium">System Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-black font-bold text-sm">
                A
              </div>
              <span className="hidden sm:block text-sm text-gray-300">Admin</span>
            </div>
          </div>
        </header>

        {/* Tab content */}
        <div key={activeTab} className="p-4 sm:p-6 campuslink-content-in">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-10 h-10 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {activeTab === 'overview' && <OverviewTab students={students} companies={companies} jobs={jobs} applications={applications} interviews={interviews} offers={offers} notifications={notifications} onNavigate={setActiveTab as (t: string) => void} />}
              {activeTab === 'students' && <StudentsTab students={students} jobs={jobs} onDataChanged={loadAllData} />}
              {activeTab === 'companies' && <CompaniesTab companies={companies} jobs={jobs} students={students} onDataChanged={loadAllData} />}
              {activeTab === 'matching' && <AIMatchingTab students={students} jobs={jobs} applications={applications} />}
              {activeTab === 'scheduler' && <SchedulerTab interviews={interviews} students={students} onDataChanged={loadAllData} />}
              {activeTab === 'offers' && <OffersTab offers={offers} students={students} jobs={jobs} applications={applications} />}
              {activeTab === 'analytics' && <AnalyticsTab students={students} jobs={jobs} applications={applications} offers={offers} />}
              {activeTab === 'copilot' && <CopilotTab students={students} jobs={jobs} applications={applications} />}
              {activeTab === 'settings' && <SettingsTab settings={settings} onSaved={loadAllData} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
