import { useState } from 'react';
import { supabase, sendStudentEmail, type Student, type Job } from '@/lib/supabase';
import { dbService } from '@/lib/db-service';
import { calculateReadiness } from '@/lib/ai-engine';
import { Search, X, TrendingUp, AlertTriangle, Award, BookOpen, Briefcase, Mail, Plus, CheckCircle2, FileText, Send, Trash2, Pencil } from 'lucide-react';

type Props = {
  students: Student[];
  jobs: Job[];
  onDataChanged?: () => void;
};

export default function StudentsTab({ students, onDataChanged }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'placed' | 'unplaced' | 'high' | 'medium' | 'low'>('all');
  const [selected, setSelected] = useState<Student | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const filtered = students.filter(s => {
    const readiness = calculateReadiness(s);
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      (s.roll_number || '').toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all' ? true :
      filter === 'placed' ? s.status === 'placed' :
      filter === 'unplaced' ? s.status !== 'placed' :
      filter === 'high' ? readiness.riskLevel === 'high' :
      filter === 'medium' ? readiness.riskLevel === 'medium' :
      filter === 'low' ? readiness.riskLevel === 'low' : true;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-4">
      {/* Search & filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or roll number..."
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-yellow-400/50"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'placed', label: 'Placed' },
            { id: 'unplaced', label: 'Unplaced' },
            { id: 'high', label: 'High Risk' },
            { id: 'medium', label: 'Medium Risk' },
            { id: 'low', label: 'Low Risk' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as typeof filter)}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                filter === f.id ? 'bg-yellow-400 text-black' : 'bg-zinc-900 text-gray-400 hover:text-white border border-zinc-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-yellow-400 text-black text-sm font-bold hover:bg-yellow-300">
          <Plus className="w-4 h-4" /> Add student
        </button>
      </div>

      {/* Students grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(student => {
          const readiness = calculateReadiness(student);
          return (
            <button
              key={student.id}
              onClick={() => setSelected(student)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-left hover:border-yellow-400/30 transition-all group"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-black font-bold shrink-0">
                  {student.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white font-semibold truncate group-hover:text-yellow-400 transition-colors">{student.name}</p>
                  <p className="text-xs text-gray-500 truncate">{student.email}</p>
                </div>
                <span className={`px-2 py-0.5 text-[10px] rounded-full font-medium ${
                  student.status === 'placed' ? 'bg-green-400/10 text-green-400' : 'bg-zinc-800 text-gray-400'
                }`}>
                  {student.status}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                <span>{student.branch}</span>
                <span>·</span>
                <span>CGPA {student.cgpa}</span>
                <span>·</span>
                <span>{student.skills.length} skills</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      readiness.riskLevel === 'high' ? 'bg-red-400' :
                      readiness.riskLevel === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                    }`}
                    style={{ width: `${readiness.overall}%` }}
                  />
                </div>
                <span className={`text-xs font-medium ${
                  readiness.riskLevel === 'high' ? 'text-red-400' :
                  readiness.riskLevel === 'medium' ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {readiness.overall}%
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500">No students found</div>
      )}

      {/* Detail drawer */}
      {selected && (
        <StudentDetail student={selected} onClose={() => setSelected(null)} onDataChanged={onDataChanged} />
      )}
      {showCreate && <CreateStudent onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); onDataChanged?.(); }} />}
    </div>
  );
}

function StudentDetail({ student, onClose, onDataChanged }: { student: Student; onClose: () => void; onDataChanged?: () => void }) {
  const readiness = calculateReadiness(student);
  const [emailSubject, setEmailSubject] = useState('CampusLink placement update');
  const [emailBody, setEmailBody] = useState(`Hello ${student.name},\n\nHere is an update from the CampusLink Placement Cell.\n\nRegards,\nCampusLink Placement Cell`);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  async function sendEmail() {
    setSending(true);
    setMessage('');
    const result = await sendStudentEmail({ to: student.email, subject: emailSubject, body: emailBody, studentId: student.id });
    setMessage(result.error || 'Email sent and logged successfully.');
    setSending(false);
  }

  async function sendVerification() {
    setSending(true);
    const result = await sendStudentEmail({
      to: student.email,
      subject: 'Verify your CampusLink student email',
      body: `Hello ${student.name},\n\nPlease reply to this email or contact your placement cell to confirm that this Gmail address belongs to you. Your placement notifications and interview schedules will be sent here.\n\nRegards,\nCampusLink Placement Cell`,
      type: 'verification',
      studentId: student.id,
    });
    if (!result.error) {
      await supabase.from('students').update({ email_verification_sent_at: new Date().toISOString() }).eq('id', student.id);
      onDataChanged?.();
    }
    setMessage(result.error || 'Verification email sent.');
    setSending(false);
  }

  const readinessMetrics = [
    { label: 'Technical Skills', value: readiness.technical, icon: <BookOpen className="w-4 h-4" /> },
    { label: 'Aptitude', value: readiness.aptitude, icon: <Award className="w-4 h-4" /> },
    { label: 'Communication', value: readiness.communication, icon: <Mail className="w-4 h-4" /> },
    { label: 'Resume Quality', value: readiness.resume, icon: <Briefcase className="w-4 h-4" /> },
    { label: 'Interview Readiness', value: readiness.interview, icon: <TrendingUp className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-lg bg-zinc-950 border-l border-yellow-400/20 h-full overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-zinc-950 border-b border-zinc-800 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-lg font-bold text-white">Student Profile</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowDelete(true)} title="Delete student" className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
            <button onClick={() => setShowEdit(true)} title="Edit student" className="p-2 text-gray-500 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg"><Pencil className="w-4 h-4" /></button>
            <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-black font-bold text-2xl">
              {student.name.charAt(0)}
            </div>
            <div>
              <h4 className="text-xl font-bold text-white">{student.name}</h4>
              <p className="text-sm text-gray-400">{student.email}</p>
              <p className="text-xs text-gray-500">{student.roll_number} · {student.branch}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-3 py-1 text-xs rounded-full font-medium ${student.email_verified ? 'bg-green-400/10 text-green-400' : 'bg-orange-400/10 text-orange-400'}`}>
              {student.email_verified ? 'Gmail verified' : 'Gmail not verified'}
            </span>
            <button onClick={sendVerification} disabled={sending} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-yellow-400 border border-yellow-400/30 rounded-lg hover:bg-yellow-400/10 disabled:opacity-50">
              <CheckCircle2 className="w-4 h-4" /> Send verification
            </button>
          </div>

          {/* Status badges */}
          <div className="flex flex-wrap gap-2">
            <span className={`px-3 py-1 text-xs rounded-full font-medium ${
              student.status === 'placed' ? 'bg-green-400/10 text-green-400' : 'bg-zinc-800 text-gray-400'
            }`}>
              {student.status === 'placed' ? `Placed at ${student.placed_company}` : 'Unplaced'}
            </span>
            <span className={`px-3 py-1 text-xs rounded-full font-medium ${
              readiness.riskLevel === 'high' ? 'bg-red-400/10 text-red-400' :
              readiness.riskLevel === 'medium' ? 'bg-yellow-400/10 text-yellow-400' : 'bg-green-400/10 text-green-400'
            }`}>
              {readiness.riskLevel} risk
            </span>
            {student.placed_package && (
              <span className="px-3 py-1 text-xs rounded-full font-medium bg-yellow-400/10 text-yellow-400">
                ₹{student.placed_package} LPA
              </span>
            )}
          </div>

          {/* Academic info */}
          <div className="grid grid-cols-2 gap-3">
            <InfoCard label="CGPA" value={student.cgpa.toString()} />
            <InfoCard label="Backlogs" value={student.backlogs.toString()} />
            <InfoCard label="Projects" value={student.projects.toString()} />
            <InfoCard label="Internships" value={student.internships.toString()} />
          </div>

          {/* Skills */}
          <div>
            <h5 className="text-sm font-semibold text-gray-300 mb-3">Skills</h5>
            <div className="flex flex-wrap gap-2">
              {student.skills.map(skill => (
                <span key={skill} className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-gray-300">
                  {skill}
                  <span className="ml-2 text-xs text-yellow-400/60">{student.skill_levels[skill] || 'intermediate'}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Certifications */}
          {student.certifications.length > 0 && (
            <div>
              <h5 className="text-sm font-semibold text-gray-300 mb-3">Certifications</h5>
              <div className="flex flex-wrap gap-2">
                {student.certifications.map(cert => (
                  <span key={cert} className="px-3 py-1.5 bg-yellow-400/5 border border-yellow-400/20 rounded-lg text-sm text-yellow-400">
                    {cert}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <InfoCard label="Phone" value={student.phone || 'Not added'} />
            <InfoCard label="Graduation year" value={student.graduation_year?.toString() || 'Not added'} />
            <InfoCard label="LinkedIn" value={student.linkedin_url || 'Not added'} />
            <InfoCard label="GitHub" value={student.github_url || 'Not added'} />
          </div>
          {student.address && <div><h5 className="text-sm font-semibold text-gray-300 mb-2">Address</h5><p className="text-sm text-gray-400">{student.address}</p></div>}
          <div>
            <h5 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2"><FileText className="w-4 h-4 text-yellow-400" /> Resume</h5>
            {student.resume_url ? <a href={student.resume_url} target="_blank" rel="noreferrer" className="text-sm text-yellow-400 hover:underline">Open resume link</a> : <p className="text-sm text-gray-500">No resume link added</p>}
            {student.resume_text && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-400">{student.resume_text}</p>}
          </div>

          {/* Readiness scores */}
          <div>
            <h5 className="text-sm font-semibold text-gray-300 mb-3">AI Placement Readiness</h5>
            <div className="bg-zinc-900 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-bold text-lg">Overall: {readiness.overall}%</span>
                <span className={`text-sm font-medium ${
                  readiness.riskLevel === 'high' ? 'text-red-400' :
                  readiness.riskLevel === 'medium' ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {readiness.riskLevel.toUpperCase()} RISK
                </span>
              </div>
              {readinessMetrics.map(metric => (
                <div key={metric.label}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span className="text-yellow-400/60">{metric.icon}</span>
                      {metric.label}
                    </div>
                    <span className="text-sm text-white font-medium">{metric.value}%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        metric.value >= 75 ? 'bg-green-400' :
                        metric.value >= 60 ? 'bg-yellow-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${metric.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-5">
            <h5 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2"><Send className="w-4 h-4 text-yellow-400" /> Send email to student</h5>
            <div className="space-y-3">
              <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white" placeholder="Subject" />
              <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={5} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white resize-y" placeholder="Message" />
              <button onClick={sendEmail} disabled={sending || !emailSubject || !emailBody} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 text-black text-sm font-bold disabled:opacity-50"><Mail className="w-4 h-4" /> {sending ? 'Sending...' : `Send to ${student.email}`}</button>
              {message && <p className={`text-sm ${message.includes('error') || message.includes('failed') ? 'text-red-400' : 'text-green-400'}`}>{message}</p>}
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h5 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              AI Recommendations
            </h5>
            <div className="space-y-2">
              {readiness.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-400 bg-zinc-900 rounded-lg p-3">
                  <span className="text-yellow-400 font-bold shrink-0">{i + 1}.</span>
                  {rec}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {showDelete && <DeleteStudentModal student={student} onClose={() => setShowDelete(false)} onDeleted={() => { setShowDelete(false); onClose(); onDataChanged?.(); }} />}
      {showEdit && <EditStudent student={student} onClose={() => setShowEdit(false)} onSaved={() => { setShowEdit(false); onClose(); onDataChanged?.(); }} />}
    </div>
  );
}

function EditStudent({ student, onClose, onSaved }: { student: Student; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: student.name,
    email: student.email,
    roll_number: student.roll_number || '',
    branch: student.branch || '',
    phone: student.phone || '',
    graduation_year: student.graduation_year?.toString() || '',
    cgpa: student.cgpa.toString(),
    projects: student.projects.toString(),
    internships: student.internships.toString(),
    backlogs: student.backlogs.toString(),
    aptitude_score: student.aptitude_score.toString(),
    communication_score: student.communication_score.toString(),
    resume_quality: student.resume_quality.toString(),
    interview_readiness: student.interview_readiness.toString(),
    skills: student.skills.join(', '),
    certifications: student.certifications.join(', '),
    resume_url: student.resume_url || '',
    linkedin_url: student.linkedin_url || '',
    github_url: student.github_url || '',
    address: student.address || '',
    resume_text: student.resume_text || '',
  });
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('');

    const parsedSkills = form.skills.split(',').map(s => s.trim()).filter(Boolean);
    const parsedCertifications = form.certifications.split(',').map(s => s.trim()).filter(Boolean);

    const readiness = calculateReadiness({
      ...student,
      cgpa: Number(form.cgpa) || 0,
      projects: Number(form.projects) || 0,
      internships: Number(form.internships) || 0,
      backlogs: Number(form.backlogs) || 0,
      skills: parsedSkills,
      certifications: parsedCertifications,
      aptitude_score: Number(form.aptitude_score) || 0,
      communication_score: Number(form.communication_score) || 0,
      resume_quality: Number(form.resume_quality) || 0,
      interview_readiness: Number(form.interview_readiness) || 0,
      graduation_year: form.graduation_year ? Number(form.graduation_year) : null,
      phone: form.phone || null,
      address: form.address || null,
      resume_url: form.resume_url || null,
      linkedin_url: form.linkedin_url || null,
      github_url: form.github_url || null,
      resume_text: form.resume_text || null,
    });

    const { error: updateError } = await supabase.from('students').update({
      name: form.name,
      email: form.email,
      roll_number: form.roll_number || null,
      branch: form.branch || null,
      phone: form.phone || null,
      graduation_year: form.graduation_year ? Number(form.graduation_year) : null,
      cgpa: Number(form.cgpa) || 0,
      projects: Number(form.projects) || 0,
      internships: Number(form.internships) || 0,
      backlogs: Number(form.backlogs) || 0,
      skills: parsedSkills,
      certifications: parsedCertifications,
      aptitude_score: Number(form.aptitude_score) || 0,
      communication_score: Number(form.communication_score) || 0,
      resume_quality: Number(form.resume_quality) || 0,
      interview_readiness: Number(form.interview_readiness) || 0,
      resume_url: form.resume_url || null,
      linkedin_url: form.linkedin_url || null,
      github_url: form.github_url || null,
      address: form.address || null,
      resume_text: form.resume_text || null,
      risk_level: readiness.riskLevel,
    }).eq('id', student.id);

    if (updateError) { setError(updateError.message); setSaving(false); return; }
    onSaved();
  }
  const fields: [keyof typeof form, string, string][] = [['name', 'Full name', 'text'], ['email', 'Gmail address', 'email'], ['roll_number', 'Roll number', 'text'], ['branch', 'Branch', 'text'], ['phone', 'Phone', 'tel'], ['graduation_year', 'Graduation year', 'number'], ['cgpa', 'CGPA', 'number'], ['projects', 'Projects', 'number'], ['internships', 'Internships', 'number'], ['backlogs', 'Backlogs', 'number'], ['aptitude_score', 'Aptitude score', 'number'], ['communication_score', 'Communication score', 'number'], ['resume_quality', 'Resume quality', 'number'], ['interview_readiness', 'Interview readiness', 'number'], ['resume_url', 'Resume URL', 'url'], ['linkedin_url', 'LinkedIn URL', 'url'], ['github_url', 'GitHub URL', 'url']];
  return <div className="fixed inset-0 z-[55] flex items-center justify-center p-4" onClick={onClose}><div className="absolute inset-0 bg-black/80" /><form onSubmit={save} onClick={e => e.stopPropagation()} className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-950 border border-yellow-400/20 rounded-2xl p-6 space-y-4"><div className="flex items-center justify-between"><h3 className="text-xl font-bold text-white">Edit student profile</h3><button type="button" onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button></div><div className="grid sm:grid-cols-2 gap-3">{fields.map(([key, label, type]) => <label key={key} className="text-sm text-gray-400">{label}<input required={key === 'name' || key === 'email'} type={type} value={form[key]} onChange={e => update(key, e.target.value)} className="mt-1 w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white" /></label>)}</div><div className="space-y-4"><label className="block text-sm text-gray-400">Skills (comma separated)<input value={form.skills} onChange={e => update('skills', e.target.value)} className="mt-1 w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white" /></label><label className="block text-sm text-gray-400">Certifications (comma separated)<input value={form.certifications} onChange={e => update('certifications', e.target.value)} className="mt-1 w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white" /></label></div><label className="block text-sm text-gray-400">Address<textarea value={form.address} onChange={e => update('address', e.target.value)} rows={2} className="mt-1 w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white" /></label><label className="block text-sm text-gray-400">Resume details<textarea value={form.resume_text} onChange={e => update('resume_text', e.target.value)} rows={4} className="mt-1 w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white" /></label>{error && <p className="text-sm text-red-400">{error}</p>}<div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400">Cancel</button><button disabled={saving} className="px-4 py-2 rounded-lg bg-yellow-400 text-black text-sm font-bold disabled:opacity-50">{saving ? 'Saving...' : 'Save changes'}</button></div></form></div>;
}

function DeleteStudentModal({ student, onClose, onDeleted }: { student: Student; onClose: () => void; onDeleted: () => void }) {
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function deleteStudent() {
    if (confirmation !== 'DELETE') return;
    setDeleting(true); setError('');
    const { error: deleteError } = await supabase.from('students').delete().eq('id', student.id);
    if (deleteError) { setError(deleteError.message); setDeleting(false); return; }
    onDeleted();
  }

  return <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
    <div className="absolute inset-0 bg-black/80" />
    <div className="relative w-full max-w-md bg-zinc-950 border border-red-500/30 rounded-2xl p-6" onClick={e => e.stopPropagation()}>
      <div className="flex items-start gap-3"><AlertTriangle className="w-6 h-6 text-red-400 shrink-0" /><div><h3 className="text-lg font-bold text-white">Delete student?</h3><p className="text-sm text-gray-400 mt-1">Deleting <span className="text-white font-semibold">{student.name}</span> also deletes applications, interviews, offers and notifications linked to this student.</p></div></div>
      <label className="block text-sm text-gray-400 mt-5">Type <span className="text-red-400 font-bold">DELETE</span> to continue<input value={confirmation} onChange={e => setConfirmation(e.target.value)} className="mt-2 w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white" autoFocus /></label>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      <div className="flex justify-end gap-3 mt-5"><button onClick={onClose} className="px-4 py-2 text-sm text-gray-400">Cancel</button><button onClick={deleteStudent} disabled={deleting || confirmation !== 'DELETE'} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-bold disabled:opacity-40"><Trash2 className="w-4 h-4" />{deleting ? 'Deleting...' : 'Delete student'}</button></div>
    </div>
  </div>;
}

function CreateStudent({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    roll_number: '',
    branch: '',
    phone: '',
    graduation_year: '',
    cgpa: '',
    projects: '',
    internships: '',
    backlogs: '',
    aptitude_score: '',
    communication_score: '',
    resume_quality: '',
    interview_readiness: '',
    skills: '',
    certifications: '',
    resume_url: '',
    linkedin_url: '',
    github_url: '',
    address: '',
    resume_text: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const parsedSkills = form.skills.split(',').map(s => s.trim()).filter(Boolean);
    const parsedCertifications = form.certifications.split(',').map(s => s.trim()).filter(Boolean);

    const readiness = calculateReadiness({
      id: '',
      name: form.name,
      email: form.email,
      roll_number: form.roll_number || null,
      branch: form.branch || null,
      cgpa: Number(form.cgpa) || 0,
      skills: parsedSkills,
      skill_levels: {},
      projects: Number(form.projects) || 0,
      internships: Number(form.internships) || 0,
      backlogs: Number(form.backlogs) || 0,
      certifications: parsedCertifications,
      aptitude_score: Number(form.aptitude_score) || 0,
      communication_score: Number(form.communication_score) || 0,
      resume_quality: Number(form.resume_quality) || 0,
      interview_readiness: Number(form.interview_readiness) || 0,
      status: 'unplaced',
      risk_level: 'low',
      placed_company: null,
      placed_package: null,
      phone: form.phone || null,
      date_of_birth: null,
      gender: null,
      address: form.address || null,
      graduation_year: form.graduation_year ? Number(form.graduation_year) : null,
      linkedin_url: form.linkedin_url || null,
      github_url: form.github_url || null,
      resume_url: form.resume_url || null,
      resume_text: form.resume_text || null,
      email_verified: false,
      email_verification_sent_at: null,
      created_at: new Date().toISOString(),
    } as Student);

    const { error: insertError } = await dbService.addStudent({
      name: form.name,
      email: form.email,
      roll_number: form.roll_number || null,
      branch: form.branch || null,
      cgpa: Number(form.cgpa) || 0,
      projects: Number(form.projects) || 0,
      internships: Number(form.internships) || 0,
      backlogs: Number(form.backlogs) || 0,
      skills: parsedSkills,
      skill_levels: {},
      certifications: parsedCertifications,
      aptitude_score: Number(form.aptitude_score) || 0,
      communication_score: Number(form.communication_score) || 0,
      resume_quality: Number(form.resume_quality) || 0,
      interview_readiness: Number(form.interview_readiness) || 0,
      status: 'unplaced',
      risk_level: readiness.riskLevel,
      placed_company: null,
      placed_package: null,
      phone: form.phone || null,
      date_of_birth: null,
      gender: null,
      address: form.address || null,
      graduation_year: form.graduation_year ? Number(form.graduation_year) : null,
      linkedin_url: form.linkedin_url || null,
      github_url: form.github_url || null,
      resume_url: form.resume_url || null,
      resume_text: form.resume_text || null,
      email_verified: false,
      email_verification_sent_at: null,
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      onCreated();
    }

    setSaving(false);
  }

  const fields: [keyof typeof form, string, string][] = [['name', 'Full name', 'text'], ['email', 'Gmail address', 'email'], ['roll_number', 'Roll number', 'text'], ['branch', 'Branch', 'text'], ['phone', 'Phone', 'tel'], ['graduation_year', 'Graduation year', 'number'], ['cgpa', 'CGPA', 'number'], ['projects', 'Projects', 'number'], ['internships', 'Internships', 'number'], ['backlogs', 'Backlogs', 'number'], ['aptitude_score', 'Aptitude score', 'number'], ['communication_score', 'Communication score', 'number'], ['resume_quality', 'Resume quality', 'number'], ['interview_readiness', 'Interview readiness', 'number'], ['resume_url', 'Resume URL', 'url'], ['linkedin_url', 'LinkedIn URL', 'url'], ['github_url', 'GitHub URL', 'url']];

  return (
    <Modal title="Add student" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <p className="text-sm text-gray-500 -mt-1">Store the student profile and Gmail used for placement communication.</p>
        <div className="grid sm:grid-cols-2 gap-3">{fields.map(([key, label, type]) => <label key={key} className="text-sm text-gray-400">{label}<input required={key === 'name' || key === 'email'} type={type} value={form[key]} onChange={e => update(key, e.target.value)} className="mt-1 w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white" /></label>)}</div>
        <div className="space-y-4"><label className="block text-sm text-gray-400">Skills (comma separated)<input value={form.skills} onChange={e => update('skills', e.target.value)} className="mt-1 w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white" /></label><label className="block text-sm text-gray-400">Certifications (comma separated)<input value={form.certifications} onChange={e => update('certifications', e.target.value)} className="mt-1 w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white" /></label></div>
        <label className="block text-sm text-gray-400">Address<textarea value={form.address} onChange={e => update('address', e.target.value)} rows={2} className="mt-1 w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white" /></label>
        <label className="block text-sm text-gray-400">Resume details<textarea value={form.resume_text} onChange={e => update('resume_text', e.target.value)} rows={4} className="mt-1 w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white" placeholder="Education, experience, projects, skills..." /></label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400">Cancel</button><button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-yellow-400 text-black text-sm font-bold disabled:opacity-50">{saving ? 'Saving...' : 'Create student'}</button></div>
      </form>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-yellow-400/20 rounded-2xl my-8" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-zinc-950 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold text-white mt-1">{value}</p>
    </div>
  );
}
