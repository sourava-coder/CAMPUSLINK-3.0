import { useState } from 'react';
import type { Offer, Student, Job, Application, AdminSettings } from '@/lib/supabase';
import { supabase, buildWhatsAppLink } from '@/lib/supabase';
import { FileText, Send, CheckCircle2, Clock, X, Mail, DollarSign, Building2 } from 'lucide-react';

type Props = {
  offers: Offer[];
  students: Student[];
  jobs: Job[];
  applications: Application[];
  settings?: AdminSettings | null;
  onDataChanged?: () => void;
};

export default function OffersTab({ offers, students, jobs, applications, settings, onDataChanged }: Props) {
  const [showSendOffer, setShowSendOffer] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAcceptOffer = async (offer: Offer) => {
    const { error } = await supabase.from('offers')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', offer.id);

    if (error) {
      setSuccess(`Failed to mark accepted: ${error.message}`);
      return;
    }

    setSuccess(`Offer marked as accepted for ${students.find(s => s.id === offer.student_id)?.name || 'the student'}.`);
    onDataChanged?.();
  };

  const handleDeleteOffer = async (offer: Offer) => {
    if (!window.confirm('Delete this offer?')) return;

    const { error } = await supabase.from('offers').delete().eq('id', offer.id);

    if (error) {
      setSuccess(`Failed to delete offer: ${error.message}`);
      return;
    }

    setSuccess(`Offer deleted successfully.`);
    onDataChanged?.();
  };

  const handleSendOffer = async (offer: Offer, channel: 'email' | 'whatsapp' = 'email') => {
    setSending(true);
    const student = students.find(s => s.id === offer.student_id);
    if (!student) return;

    try {
      if (channel === 'whatsapp') {
        const whatsappLink = buildWhatsAppLink(student.phone, offer.offer_letter_text);

        if (!whatsappLink) {
          setSuccess(`WhatsApp unavailable for ${student.name}: add a phone number first.`);
          setSending(false);
          return;
        }

        window.open(whatsappLink, '_blank', 'noopener,noreferrer');
        const { error: updateError } = await supabase.from('offers')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', offer.id);

        if (updateError) {
          setSuccess(`Offer opened in WhatsApp, but status update failed: ${updateError.message}`);
          setSending(false);
          return;
        }

        setSuccess(`Offer letter opened in WhatsApp for ${student.name}.`);
        onDataChanged?.();
        setSending(false);
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: student.email,
          subject: `Offer Letter from ${offer.company_name} — CampusLink`,
          body: offer.offer_letter_text,
          type: 'offer',
        }),
      });

      if (response.ok) {
        const { error: updateError } = await supabase.from('offers')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', offer.id);

        if (updateError) {
          setSuccess(`Offer sent, but status update failed: ${updateError.message}`);
        } else {
          setSuccess(`Offer letter sent to ${student.name} at ${student.email}`);
          onDataChanged?.();
        }
      }
    } catch {
      setSuccess(null);
    }
    setSending(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-sm">{offers.length} offers · {offers.filter(o => o.status === 'sent').length} sent</p>
        <button
          onClick={() => setShowSendOffer(true)}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-black font-medium rounded-lg text-sm hover:bg-yellow-300 transition-all"
        >
          <Send className="w-4 h-4" />
          Create Offer
        </button>
      </div>

      {success && (
        <div className="bg-green-400/10 border border-green-400/20 rounded-xl px-4 py-3 text-green-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Offer pipeline */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { status: 'pending', label: 'Pending', icon: <Clock className="w-5 h-5" />, color: 'yellow' },
          { status: 'sent', label: 'Sent', icon: <Send className="w-5 h-5" />, color: 'blue' },
          { status: 'accepted', label: 'Accepted', icon: <CheckCircle2 className="w-5 h-5" />, color: 'green' },
        ].map(col => {
          const colOffers = offers.filter(o => o.status === col.status);
          return (
            <div key={col.status} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  col.color === 'yellow' ? 'bg-yellow-400/10 text-yellow-400' :
                  col.color === 'blue' ? 'bg-blue-400/10 text-blue-400' : 'bg-green-400/10 text-green-400'
                }`}>
                  {col.icon}
                </div>
                <h4 className="text-white font-semibold text-sm">{col.label}</h4>
                <span className="ml-auto text-xs text-gray-500">{colOffers.length}</span>
              </div>
              <div className="space-y-2">
                {colOffers.map(offer => {
                  const student = students.find(s => s.id === offer.student_id);
                  return (
                    <div key={offer.id} className="bg-zinc-950 rounded-lg p-3 border border-zinc-800">
                      <p className="text-sm text-white font-medium truncate">{student?.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500 truncate">{offer.company_name} · {offer.job_title}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-yellow-400 font-bold">₹{offer.package_lpa}L</span>
                        {col.status === 'pending' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleSendOffer(offer, 'email')}
                              disabled={sending}
                              className="flex items-center gap-1 px-2.5 py-1 bg-yellow-400/10 text-yellow-400 text-xs rounded-lg hover:bg-yellow-400/20 disabled:opacity-50"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              Email
                            </button>
                            <button
                              onClick={() => handleSendOffer(offer, 'whatsapp')}
                              disabled={sending || !student?.phone}
                              className="flex items-center gap-1 px-2.5 py-1 bg-green-500/10 text-green-400 text-xs rounded-lg hover:bg-green-500/20 disabled:opacity-50"
                            >
                              <Send className="w-3.5 h-3.5" />
                              WhatsApp
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {colOffers.length === 0 && <p className="text-xs text-gray-600 text-center py-4">No offers</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Offer details list */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">All Offers</h3>
        <div className="space-y-3">
          {offers.map(offer => {
            const student = students.find(s => s.id === offer.student_id);
            return (
              <div key={offer.id} className="flex items-center gap-4 py-3 border-b border-zinc-800 last:border-0">
                <div className="w-10 h-10 rounded-lg bg-yellow-400/10 flex items-center justify-center text-yellow-400 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white font-medium">{student?.name || 'Unknown'}</p>
                  <p className="text-xs text-gray-500">{offer.company_name} · {offer.job_title} · ₹{offer.package_lpa} LPA</p>
                </div>
                <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${
                  offer.status === 'accepted' ? 'bg-green-400/10 text-green-400' :
                  offer.status === 'sent' ? 'bg-blue-400/10 text-blue-400' : 'bg-yellow-400/10 text-yellow-400'
                }`}>
                  {offer.status}
                </span>
                {offer.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSendOffer(offer, 'email')}
                      disabled={sending}
                      className="flex items-center gap-1 px-3 py-1.5 bg-yellow-400 text-black text-xs font-medium rounded-lg hover:bg-yellow-300 disabled:opacity-50"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Email
                    </button>
                    <button
                      onClick={() => handleSendOffer(offer, 'whatsapp')}
                      disabled={sending || !student?.phone}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-500/10 text-green-400 border border-green-500/30 text-xs font-medium rounded-lg hover:bg-green-500/20 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      WhatsApp
                    </button>
                  </div>
                )}
                {offer.status === 'sent' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptOffer(offer)}
                      className="px-3 py-1.5 bg-green-500/10 text-green-400 border border-green-500/30 text-xs font-medium rounded-lg hover:bg-green-500/20"
                    >
                      Mark accepted
                    </button>
                    <button
                      onClick={() => handleDeleteOffer(offer)}
                      className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/30 text-xs font-medium rounded-lg hover:bg-red-500/20"
                    >
                      Delete
                    </button>
                  </div>
                )}
                {offer.status === 'accepted' && (
                  <button
                    onClick={() => handleDeleteOffer(offer)}
                    className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/30 text-xs font-medium rounded-lg hover:bg-red-500/20"
                  >
                    Delete
                  </button>
                )}
              </div>
            );
          })}
          {offers.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No offers yet</p>}
        </div>
      </div>

      {showSendOffer && (
        <SendOfferForm
          students={students}
          jobs={jobs}
          applications={applications}
          settings={settings}
          onClose={() => setShowSendOffer(false)}
          onSent={(msg) => { setSuccess(msg); setShowSendOffer(false); onDataChanged?.(); }}
        />
      )}
    </div>
  );
}

function SendOfferForm({ students, jobs, applications, settings, onClose, onSent }: {
  students: Student[];
  jobs: Job[];
  applications: Application[];
  settings?: AdminSettings | null;
  onClose: () => void;
  onSent: (msg: string) => void;
}) {
  const collegeName = settings?.college_name || 'CampusLink Placement Cell';
  const [studentId, setStudentId] = useState('');
  const [jobId, setJobId] = useState('');
  const [packageLpa, setPackageLpa] = useState('0');
  const [letterText, setLetterText] = useState('');
  const [channel, setChannel] = useState<'email' | 'whatsapp'>('email');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedStudent = students.find(s => s.id === studentId);
  const selectedJob = jobs.find(j => j.id === jobId);

  const generateLetter = () => {
    if (!selectedStudent || !selectedJob) return;
    const text = `Dear ${selectedStudent.name},

We are pleased to extend an offer for the position of ${selectedJob.title} at ${selectedJob.company?.name || 'our company'}.

Position: ${selectedJob.title}
Company: ${selectedJob.company?.name || ''}
Annual Compensation: Rs ${parseFloat(packageLpa || '0').toFixed(2)} Lakhs Per Annum
Location: ${selectedJob.location || 'To be confirmed'}
Joining Date: To be communicated

Please confirm your acceptance of this offer within 7 days by replying to this email.

Congratulations on your selection! We look forward to welcoming you to the team.

Best Regards,
${collegeName}`;
    setLetterText(text);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (!selectedStudent || !selectedJob) {
      setError('Please select a student and job');
      setSaving(false);
      return;
    }

    try {
      // Create offer record
      const { data: offer, error: insertError } = await supabase.from('offers').insert({
        student_id: studentId,
        job_id: jobId,
        application_id: applications.find(a => a.student_id === studentId && a.job_id === jobId)?.id || null,
        company_name: selectedJob.company?.name || '',
        job_title: selectedJob.title,
        package_lpa: parseFloat(packageLpa) || 0,
        offer_letter_text: letterText,
        status: 'pending',
      }).select().single();

      if (insertError) throw insertError;

      if (channel === 'whatsapp') {
        const whatsappLink = buildWhatsAppLink(selectedStudent.phone, letterText);

        if (!whatsappLink) {
          throw new Error('Student phone number not added. Add a phone number first to send WhatsApp messages.');
        }

        window.open(whatsappLink, '_blank', 'noopener,noreferrer');
      } else {
        // Send email via edge function
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: selectedStudent.email,
            subject: `Offer Letter from ${selectedJob.company?.name || 'Company'} — CampusLink`,
            body: letterText,
            type: 'offer',
            studentId: studentId,
          }),
        });
      }

      await supabase.from('offers')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', offer.id);

      onSent(channel === 'whatsapp'
        ? `Offer letter opened in WhatsApp for ${selectedStudent.name}.`
        : `Offer letter sent to ${selectedStudent.name} at ${selectedStudent.email}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send offer');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-yellow-400/20 rounded-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-zinc-950 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Create & Send Offer Letter</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Select Student</label>
            <select value={studentId} onChange={e => setStudentId(e.target.value)} required className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-yellow-400/50">
              <option value="">Choose a student...</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name} — {s.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Select Job</label>
            <select value={jobId} onChange={e => setJobId(e.target.value)} required className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-yellow-400/50">
              <option value="">Choose a job...</option>
              {jobs.map(j => (
                <option key={j.id} value={j.id}>{j.title} at {j.company?.name} (₹{j.package_lpa}L)</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Package (LPA)</label>
            <input type="number" step="0.1" value={packageLpa} onChange={e => setPackageLpa(e.target.value)} required className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-yellow-400/50" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm text-gray-300">Offer Letter Text</label>
              <button type="button" onClick={generateLetter} className="text-xs text-yellow-400 hover:underline">Auto-generate</button>
            </div>
            <textarea value={letterText} onChange={e => setLetterText(e.target.value)} required rows={10} className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-400/50 resize-none font-mono" />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Delivery channel</label>
            <select
              value={channel}
              onChange={e => setChannel(e.target.value as 'email' | 'whatsapp')}
              className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-yellow-400/50"
            >
              <option value="email">Gmail</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={saving} className="w-full py-2.5 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-300 disabled:opacity-50 flex items-center justify-center gap-2">
            <Send className="w-4 h-4" />
            {saving ? 'Sending...' : channel === 'whatsapp' ? 'Send Offer Letter via WhatsApp' : 'Send Offer Letter Email'}
          </button>
        </form>
      </div>
    </div>
  );
}
