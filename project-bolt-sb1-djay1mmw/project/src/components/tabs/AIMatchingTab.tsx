import { useState } from 'react';
import type { Student, Job, Application } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { calculateFitScore, generateLearningPath } from '@/lib/ai-engine';
import { Brain, Sparkles, Target, TrendingUp, BookOpen, X, CheckCircle2, AlertCircle, Zap } from 'lucide-react';

type Props = {
  students: Student[];
  jobs: Job[];
  applications: Application[];
};

export default function AIMatchingTab({ students, jobs }: Props) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [matching, setMatching] = useState(false);

  const activeJobs = jobs.filter(j => j.status === 'active');

  const handleMatch = async (job: Job) => {
    setSelectedJob(job);
    setMatching(true);

    // Calculate fit scores for all students
    const results = students
      .map(s => ({ student: s, result: calculateFitScore(s, job) }))
      .filter(m => m.result.fitScore >= 40)
      .sort((a, b) => b.result.fitScore - a.result.fitScore);

    // Upsert applications with fit scores
    for (const match of results.slice(0, 20)) {
      const existing = await supabase
        .from('applications')
        .select('id')
        .eq('student_id', match.student.id)
        .eq('job_id', job.id)
        .maybeSingle();

      if (!existing.data) {
        await supabase.from('applications').insert({
          student_id: match.student.id,
          job_id: job.id,
          status: 'matched',
          fit_score: match.result.fitScore,
          fit_breakdown: match.result.breakdown,
          skill_gaps: match.result.missingSkills,
        });
      } else {
        await supabase.from('applications')
          .update({
            fit_score: match.result.fitScore,
            fit_breakdown: match.result.breakdown,
            skill_gaps: match.result.missingSkills,
          })
          .eq('id', existing.data.id);
      }
    }

    setMatching(false);
  };

  if (selectedJob && selectedStudent) {
    return <MatchDetail student={selectedStudent} job={selectedJob} onClose={() => setSelectedStudent(null)} />;
  }

  if (selectedJob) {
    const results = students
      .map(s => ({ student: s, result: calculateFitScore(s, selectedJob) }))
      .filter(m => m.result.fitScore >= 40)
      .sort((a, b) => b.result.fitScore - a.result.fitScore);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedJob(null)} className="text-gray-400 hover:text-white text-sm">← Back to jobs</button>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-400/10 border border-yellow-400/20 rounded-full">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 text-xs font-medium">AI Matched {results.length} candidates</span>
          </div>
        </div>

        {/* Job header */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-yellow-400/20 rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-white">{selectedJob.title}</h3>
              <p className="text-gray-400 text-sm">{selectedJob.company?.name} · ₹{selectedJob.package_lpa} LPA · {selectedJob.location}</p>
            </div>
            <span className="px-3 py-1 bg-yellow-400/10 text-yellow-400 text-xs rounded-full font-medium">Active</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedJob.required_skills.map(s => (
              <span key={s} className="px-2.5 py-1 bg-red-400/10 text-red-400 text-xs rounded-full border border-red-400/20">{s} (required)</span>
            ))}
            {selectedJob.preferred_skills.map(s => (
              <span key={s} className="px-2.5 py-1 bg-yellow-400/10 text-yellow-400 text-xs rounded-full border border-yellow-400/20">{s} (preferred)</span>
            ))}
          </div>
        </div>

        {/* Ranked candidates */}
        <div className="space-y-3">
          {results.map((match, i) => (
            <button
              key={match.student.id}
              onClick={() => setSelectedStudent(match.student)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-left hover:border-yellow-400/30 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                  i === 0 ? 'bg-yellow-400 text-black' : 'bg-zinc-800 text-gray-400'
                }`}>
                  {i + 1}
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 flex items-center justify-center text-yellow-400 font-bold shrink-0">
                  {match.student.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white font-medium truncate">{match.student.name}</p>
                  <p className="text-xs text-gray-500">{match.student.branch} · CGPA {match.student.cgpa} · {match.student.skills.length} skills</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {match.result.missingSkills.length > 0 && (
                    <span className="hidden sm:flex items-center gap-1 text-xs text-orange-400">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {match.result.missingSkills.length} gaps
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          match.result.fitScore >= 85 ? 'bg-green-400' :
                          match.result.fitScore >= 70 ? 'bg-yellow-400' : 'bg-orange-400'
                        }`}
                        style={{ width: `${match.result.fitScore}%` }}
                      />
                    </div>
                    <span className={`text-lg font-bold ${
                      match.result.fitScore >= 85 ? 'text-green-400' :
                      match.result.fitScore >= 70 ? 'text-yellow-400' : 'text-orange-400'
                    }`}>
                      {match.result.fitScore}%
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-yellow-400/5 to-transparent border border-yellow-400/20 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center text-yellow-400">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">AI Candidate Matching</h3>
            <p className="text-sm text-gray-400">Select a job to run AI matching against all students</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeJobs.map(job => {
          const eligibleCount = students.filter(s => s.cgpa >= job.min_cgpa).length;
          return (
            <button
              key={job.id}
              onClick={() => handleMatch(job)}
              disabled={matching}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-left hover:border-yellow-400/30 transition-all group disabled:opacity-50"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-white font-semibold group-hover:text-yellow-400 transition-colors">{job.title}</h4>
                  <p className="text-xs text-gray-500">{job.company?.name}</p>
                </div>
                <span className="text-yellow-400 font-bold text-sm">₹{job.package_lpa}L</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                <span className="flex items-center gap-1"><Target className="w-3.5 h-3.5" /> {job.required_skills.length} required</span>
                <span>·</span>
                <span>{eligibleCount} eligible</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {job.required_skills.slice(0, 4).map(s => (
                  <span key={s} className="px-2 py-0.5 bg-zinc-800 text-gray-400 text-[10px] rounded-full">{s}</span>
                ))}
                {job.required_skills.length > 4 && <span className="px-2 py-0.5 text-gray-500 text-[10px]">+{job.required_skills.length - 4}</span>}
              </div>
              <div className="mt-4 flex items-center gap-2 text-yellow-400 text-sm font-medium">
                <Zap className="w-4 h-4" />
                Run AI Match
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MatchDetail({ student, job, onClose }: { student: Student; job: Job; onClose: () => void }) {
  const match = calculateFitScore(student, job);
  const learningPath = generateLearningPath(match.missingSkills);

  const breakdownItems = [
    { label: 'CGPA Requirement', value: match.breakdown.cgpa, max: 15 },
    { label: 'Skills Match', value: match.breakdown.skills, max: 50 },
    { label: 'Projects', value: match.breakdown.projects, max: 15 },
    { label: 'Internship', value: match.breakdown.internship, max: 10 },
    { label: 'Communication', value: match.breakdown.communication, max: 5 },
    { label: 'Certifications', value: match.breakdown.certifications, max: 5 },
    { label: 'Aptitude', value: match.breakdown.aptitude, max: 5 },
  ];

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 512,
          height: '100vh',
          marginLeft: 'auto',
          background: '#09090b',
          borderLeft: '1px solid rgba(250, 204, 21, 0.2)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#09090b',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            padding: '16px 24px',
          }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Explainable Fit Score</h3>
          <button onClick={onClose} style={{ color: '#9ca3af' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Score */}
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full border-4 ${
              match.fitScore >= 85 ? 'border-green-400' : match.fitScore >= 70 ? 'border-yellow-400' : 'border-orange-400'
            }`}>
              <div>
                <p className={`text-4xl font-black ${
                  match.fitScore >= 85 ? 'text-green-400' : match.fitScore >= 70 ? 'text-yellow-400' : 'text-orange-400'
                }`}>{match.fitScore}%</p>
                <p className="text-xs text-gray-500">FIT SCORE</p>
              </div>
            </div>
            <p className="text-white font-semibold mt-3">{student.name}</p>
            <p className="text-sm text-gray-400">for {job.title} at {job.company?.name}</p>
          </div>

          {/* Breakdown */}
          <div>
            <h5 className="text-sm font-semibold text-gray-300 mb-3">Score Breakdown</h5>
            <div className="space-y-3">
              {breakdownItems.map(item => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-400">{item.label}</span>
                    <span className="text-sm text-white">+{item.value} / {item.max}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${(item.value / item.max) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Matched skills */}
          {match.matchedSkills.length > 0 && (
            <div>
              <h5 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                Matched Skills
              </h5>
              <div className="flex flex-wrap gap-2">
                {match.matchedSkills.map(s => (
                  <span key={s} className="px-3 py-1.5 bg-green-400/10 border border-green-400/20 text-green-400 text-sm rounded-lg">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Skill gaps */}
          {match.missingSkills.length > 0 && (
            <div>
              <h5 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-400" />
                Skill Gaps
              </h5>
              <div className="flex flex-wrap gap-2 mb-4">
                {match.missingSkills.map(s => (
                  <span key={s} className="px-3 py-1.5 bg-orange-400/10 border border-orange-400/20 text-orange-400 text-sm rounded-lg">{s}</span>
                ))}
              </div>
              <div className="bg-zinc-900 rounded-xl p-4">
                <p className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Recommended Learning Path
                </p>
                <div className="space-y-2">
                  {learningPath.map((step, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-gray-400">
                      <span className="text-yellow-400 font-bold shrink-0">{i + 1}.</span>
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Explanation */}
          <div>
            <h5 className="text-sm font-semibold text-gray-300 mb-3">AI Explanation</h5>
            <div className="bg-zinc-900 rounded-xl p-4 space-y-1.5">
              {match.explanation.map((line, i) => (
                <p key={i} className="text-sm text-gray-400">{line}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
