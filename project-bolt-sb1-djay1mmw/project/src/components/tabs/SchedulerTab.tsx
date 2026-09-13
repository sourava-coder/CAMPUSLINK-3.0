import { useState } from 'react';
import { sendStudentEmail, buildWhatsAppLink, supabase, type Interview, type Student, type AdminSettings } from '@/lib/supabase';
import { Calendar, Clock, AlertTriangle, MapPin, CheckCircle2, X, ArrowRight, Mail, Plus, Pencil, Trash2, Send } from 'lucide-react';

type Props = {
  interviews: Interview[];
  students: Student[];
  settings?: AdminSettings | null;
  onDataChanged?: () => void;
};

type Conflict = {
  student: Student;
  interview1: Interview;
  interview2: Interview;
  overlapMinutes: number;
};

export default function SchedulerTab({ interviews, students, settings, onDataChanged }: Props) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);

  function closeScheduleForm() {
    setShowScheduleForm(false);
    setEditingInterview(null);
  }

  async function deleteSchedule(interview: Interview) {
    const student = students.find(s => s.id === interview.student_id);
    if (!window.confirm(`Delete this ${interview.type} schedule for ${student?.name || 'student'}?`)) return;

    const { error } = await supabase.from('interviews').delete().eq('id', interview.id);
    if (error) {
      setNotice(`Delete failed: ${error.message}`);
      return;
    }

    setNotice('Schedule deleted successfully');
    onDataChanged?.();
  }

  async function sendSchedule(interview: Interview, student: Student, channel: 'email' | 'whatsapp' = 'email') {
    setSendingId(interview.id); setNotice('');
    const collegeName = settings?.college_name || 'CampusLink Placement Cell';
    const date = new Date(interview.scheduled_at).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' });
    const message = `Hello ${student.name},\n\nYour ${collegeName} placement schedule is confirmed.\n\nType: ${interview.type}\nDate and time: ${date}\nDuration: ${interview.duration_minutes} minutes\nVenue / link: ${interview.venue || 'To be shared by the placement cell'}\nRound: ${interview.round}\n\nPlease be available 10 minutes early and keep your resume ready.\n\nRegards,\n${collegeName}`;

    if (channel === 'whatsapp') {
      const whatsappLink = buildWhatsAppLink(student.phone, message);
      if (!whatsappLink) {
        setNotice('WhatsApp unavailable: add a phone number for this student first.');
        setSendingId(null);
        return;
      }
      window.open(whatsappLink, '_blank', 'noopener,noreferrer');
      setNotice(`WhatsApp opened for ${student.name}.`);
      setSendingId(null);
      return;
    }

    const result = await sendStudentEmail({
      to: student.email,
      subject: `Interview schedule: ${interview.type} round ${interview.round}`,
      body: message,
      type: 'interview_schedule',
      studentId: student.id,
    });
    setNotice(result.error || `Schedule sent to ${student.email}`);
    setSendingId(null);
  }

  // Detect conflicts
  const conflicts: Conflict[] = [];
  const studentInterviews: Record<string, Interview[]> = {};
  interviews.forEach(i => {
    if (!studentInterviews[i.student_id]) studentInterviews[i.student_id] = [];
    studentInterviews[i.student_id].push(i);
  });

  Object.entries(studentInterviews).forEach(([sid, ivs]) => {
    const student = students.find(s => s.id === sid);
    if (!student) return;
    for (let i = 0; i < ivs.length; i++) {
      for (let j = i + 1; j < ivs.length; j++) {
        const a = ivs[i];
        const b = ivs[j];
        const aStart = new Date(a.scheduled_at).getTime();
        const aEnd = aStart + a.duration_minutes * 60000;
        const bStart = new Date(b.scheduled_at).getTime();
        const bEnd = bStart + b.duration_minutes * 60000;
        if (aStart < bEnd && bStart < aEnd) {
          const overlap = Math.round((Math.min(aEnd, bEnd) - Math.max(aStart, bStart)) / 60000);
          conflicts.push({ student, interview1: a, interview2: b, overlapMinutes: overlap });
        }
      }
    }
  });

  const upcoming = interviews
    .filter(i => i.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white">Interview and test schedule</h3>
          <p className="text-sm text-gray-500">Create and send schedules to students through Gmail and WhatsApp.</p>
        </div>
        <button onClick={() => setShowScheduleForm(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-yellow-400 text-black text-sm font-bold hover:bg-yellow-300">
          <Plus className="w-4 h-4" /> Schedule
        </button>
      </div>
      {/* Conflicts */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-400/10 flex items-center justify-center text-red-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Scheduling Conflicts Detected</h3>
            <p className="text-sm text-gray-400">{conflicts.length} conflict(s) found across student schedules</p>
          </div>
        </div>

        {conflicts.length === 0 ? (
          <div className="flex items-center gap-3 bg-zinc-900 rounded-xl p-4">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <p className="text-sm text-gray-400">No scheduling conflicts detected. All schedules are clear.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {conflicts.map((c, i) => (
              <div key={i} className="bg-zinc-900 border border-red-500/20 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-red-400/10 flex items-center justify-center text-red-400 font-bold text-sm">
                    {c.student.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-white font-medium">{c.student.name}</p>
                    <p className="text-xs text-red-400">{c.overlapMinutes} minutes overlap</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="bg-zinc-950 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-[10px] rounded-full ${c.interview1.type === 'test' ? 'bg-blue-400/10 text-blue-400' : 'bg-yellow-400/10 text-yellow-400'}`}>
                        {c.interview1.type}
                      </span>
                      <span className="text-xs text-gray-500">{c.interview1.venue}</span>
                    </div>
                    <p className="text-sm text-white">
                      {new Date(c.interview1.scheduled_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-xs text-gray-500">{c.interview1.duration_minutes} min</p>
                  </div>
                  <div className="bg-zinc-950 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-[10px] rounded-full ${c.interview2.type === 'test' ? 'bg-blue-400/10 text-blue-400' : 'bg-yellow-400/10 text-yellow-400'}`}>
                        {c.interview2.type}
                      </span>
                      <span className="text-xs text-gray-500">{c.interview2.venue}</span>
                    </div>
                    <p className="text-sm text-white">
                      {new Date(c.interview2.scheduled_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-xs text-gray-500">{c.interview2.duration_minutes} min</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-yellow-400">
                  <ArrowRight className="w-4 h-4" />
                  Suggested: Reschedule {c.interview2.type} to {new Date(new Date(c.interview1.scheduled_at).getTime() + c.interview1.duration_minutes * 60000 + 30 * 60000).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming schedule */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Upcoming Schedule</h3>
        <div className="space-y-2">
          {upcoming.map(interview => {
            const student = students.find(s => s.id === interview.student_id);
            return (
              <div key={interview.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  interview.type === 'test' ? 'bg-blue-400/10 text-blue-400' : 'bg-yellow-400/10 text-yellow-400'
                }`}>
                  {interview.type === 'test' ? <Clock className="w-6 h-6" /> : <Calendar className="w-6 h-6" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white font-medium truncate">{student?.name || 'Unknown'}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="capitalize">{interview.type}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {interview.venue}</span>
                    <span>·</span>
                    <span>Round {interview.round}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm text-white">
                    {new Date(interview.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                  <p className="text-xs text-yellow-400">
                    {new Date(interview.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {student && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => sendSchedule(interview, student, 'email')} disabled={sendingId === interview.id} title="Send schedule by email" className="p-2 text-yellow-400 hover:bg-yellow-400/10 rounded-lg disabled:opacity-50">
                      <Mail className="w-4 h-4" />
                    </button>
                    <button onClick={() => sendSchedule(interview, student, 'whatsapp')} disabled={sendingId === interview.id || !student.phone} title="Send schedule by WhatsApp" className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg disabled:opacity-50">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <button onClick={() => { setEditingInterview(interview); setShowScheduleForm(false); }} title="Edit schedule" className="p-2 text-gray-400 hover:bg-yellow-400/10 hover:text-yellow-400 rounded-lg">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => deleteSchedule(interview)} title="Delete schedule" className="p-2 text-gray-400 hover:bg-red-500/10 hover:text-red-400 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
          {upcoming.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No upcoming interviews scheduled</p>}
        </div>
        {notice && <p className={`mt-3 text-sm ${notice.includes('error') || notice.includes('failed') ? 'text-red-400' : 'text-green-400'}`}>{notice}</p>}
      </div>
      {(showScheduleForm || editingInterview) && <ScheduleForm
        students={students}
        settings={settings}
        initialInterview={editingInterview || undefined}
        onClose={closeScheduleForm}
        onCreated={() => { closeScheduleForm(); onDataChanged?.(); }}
      />}
    </div>
  );
}

function ScheduleForm({ students, settings, onClose, onCreated, initialInterview }: { students: Student[]; settings?: AdminSettings | null; onClose: () => void; onCreated: () => void; initialInterview?: Interview }) {
  const initialForm = {
    student_id: initialInterview?.student_id || students[0]?.id || '',
    type: initialInterview?.type || 'interview',
    scheduled_at: initialInterview ? (() => {
      const value = new Date(initialInterview.scheduled_at);
      const timezoneOffset = value.getTimezoneOffset() * 60000;
      return new Date(value.getTime() - timezoneOffset).toISOString().slice(0, 16);
    })() : '',
    duration_minutes: initialInterview?.duration_minutes?.toString() || '60',
    venue: initialInterview?.venue || '',
    round: initialInterview?.round?.toString() || '1',
  };

  const collegeName = settings?.college_name || 'CampusLink Placement Cell';
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [error, setError] = useState('');
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    const student = students.find(item => item.id === form.student_id);

    const payload = {
      student_id: form.student_id,
      application_id: initialInterview?.application_id ?? null,
      type: form.type,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      duration_minutes: Number(form.duration_minutes) || 60,
      venue: form.venue || null,
      round: Number(form.round) || 1,
      status: 'scheduled',
    };

    let result;
    if (initialInterview) {
      result = await supabase.from('interviews').update(payload).eq('id', initialInterview.id).select().single();
    } else {
      result = await supabase.from('interviews').insert(payload).select().single();
    }

    if (result.error) { setError(result.error.message); setSaving(false); return; }

    if (student && result.data) {
      const date = new Date(form.scheduled_at).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' });
      const message = `Hello ${student.name},\n\nYour ${form.type} is scheduled.\n\nDate and time: ${date}\nDuration: ${form.duration_minutes} minutes\nVenue / link: ${form.venue || 'To be shared by the placement cell'}\nRound: ${form.round}\n\nPlease be available 10 minutes early.\n\nRegards,\n${collegeName}`;

      if (sendEmail) {
        const emailResult = await sendStudentEmail({
          to: student.email,
          subject: `CampusLink ${form.type} schedule`,
          body: message,
          type: 'interview_schedule',
          studentId: student.id,
        });
        if (emailResult.error) { setError(`Schedule saved, but email failed: ${emailResult.error}`); setSaving(false); return; }
      }

      if (sendWhatsApp && student.phone) {
        const whatsappLink = buildWhatsAppLink(student.phone, message);
        if (whatsappLink) {
          window.open(whatsappLink, '_blank', 'noopener,noreferrer');
        }
      }
    }
    onCreated();
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="absolute inset-0 bg-black/70" />
    <form onSubmit={save} onClick={e => e.stopPropagation()} className="relative w-full max-w-lg bg-zinc-950 border border-yellow-400/20 rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between"><div><h3 className="text-xl font-bold text-white">{initialInterview ? 'Edit schedule' : 'Schedule interview or test'}</h3><p className="text-sm text-gray-500">The selected student can receive the schedule by email.</p></div><button type="button" onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button></div>
      <label className="block text-sm text-gray-400">Student<select required value={form.student_id} onChange={e => update('student_id', e.target.value)} className="mt-1 w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white">{students.map(student => <option key={student.id} value={student.id}>{student.name} - {student.email}</option>)}</select></label>
      <div className="grid grid-cols-2 gap-3"><label className="block text-sm text-gray-400">Type<select value={form.type} onChange={e => update('type', e.target.value)} className="mt-1 w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white"><option value="interview">Interview</option><option value="test">Test</option><option value="assessment">Assessment</option><option value="other">Other</option></select></label><label className="block text-sm text-gray-400">Round<input min="1" type="number" value={form.round} onChange={e => update('round', e.target.value)} className="mt-1 w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white" /></label></div>
      <div className="grid grid-cols-2 gap-3"><label className="block text-sm text-gray-400">Date and time<input required type="datetime-local" value={form.scheduled_at} onChange={e => update('scheduled_at', e.target.value)} className="mt-1 w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white" /></label><label className="block text-sm text-gray-400">Duration (minutes)<input min="1" required type="number" value={form.duration_minutes} onChange={e => update('duration_minutes', e.target.value)} className="mt-1 w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white" /></label></div>
      <label className="block text-sm text-gray-400">Venue or meeting link<input value={form.venue} onChange={e => update('venue', e.target.value)} placeholder="Room 204 or https://meet..." className="mt-1 w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white" /></label>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} className="accent-yellow-400" /> Send schedule to student Gmail now</label>
        <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={sendWhatsApp} onChange={e => setSendWhatsApp(e.target.checked)} className="accent-green-400" /> Send schedule to student WhatsApp now</label>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400">Cancel</button><button disabled={saving || !students.length} className="px-4 py-2 rounded-lg bg-yellow-400 text-black text-sm font-bold disabled:opacity-50">{saving ? (initialInterview ? 'Updating...' : 'Saving...') : (initialInterview ? 'Update schedule' : 'Save schedule')}</button></div>
    </form>
  </div>;
}
