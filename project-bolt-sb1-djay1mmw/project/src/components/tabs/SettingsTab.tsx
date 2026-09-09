import { useEffect, useState } from 'react';
import { AlertTriangle, Save, Settings, Trash2 } from 'lucide-react';
import { supabase, type AdminSettings } from '@/lib/supabase';

type Props = {
  settings: AdminSettings | null;
  onSaved: () => void;
};

export default function SettingsTab({ settings, onSaved }: Props) {
  const [form, setForm] = useState({ college_name: '', placement_cell_email: '', sender_name: '', default_email_footer: '' });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (settings) setForm({
      college_name: settings.college_name || '',
      placement_cell_email: settings.placement_cell_email || '',
      sender_name: settings.sender_name || '',
      default_email_footer: settings.default_email_footer || '',
    });
  }, [settings]);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setNotice('');
    const { error } = await supabase.from('admin_settings').upsert({ id: true, ...form, updated_at: new Date().toISOString() });
    setNotice(error ? error.message : 'Admin settings saved.');
    if (!error) onSaved();
    setSaving(false);
  }

  async function clearDemoData() {
    if (confirmText !== 'DELETE ALL DATA') return;
    setClearing(true); setNotice('');
    const results = await Promise.all([
      supabase.from('notifications').delete().neq('id', ''),
      supabase.from('offers').delete().neq('id', ''),
      supabase.from('interviews').delete().neq('id', ''),
      supabase.from('applications').delete().neq('id', ''),
      supabase.from('jobs').delete().neq('id', ''),
      supabase.from('companies').delete().neq('id', ''),
      supabase.from('students').delete().neq('id', ''),
      supabase.from('emails').delete().neq('id', ''),
    ]);
    const error = results.find(result => result.error)?.error;
    setNotice(error ? `Could not clear data: ${error.message}` : 'All placement data and email logs were deleted.');
    setConfirmText(''); setClearing(false);
    if (!error) onSaved();
  }

  return <div className="max-w-3xl space-y-6">
    <div><p className="text-xs uppercase tracking-[0.2em] text-yellow-400/70">Administration</p><h3 className="text-2xl font-bold text-white mt-1">Admin settings</h3><p className="text-gray-500 mt-1">Control the placement cell identity and student communication defaults.</p></div>
    <form onSubmit={saveSettings} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-3 mb-2"><Settings className="w-5 h-5 text-yellow-400" /><h4 className="font-semibold text-white">Email identity</h4></div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="College name" value={form.college_name} onChange={value => setForm({ ...form, college_name: value })} />
        <Field label="Placement cell Gmail" type="email" value={form.placement_cell_email} onChange={value => setForm({ ...form, placement_cell_email: value })} />
        <Field label="Sender name" value={form.sender_name} onChange={value => setForm({ ...form, sender_name: value })} />
      </div>
      <label className="block text-sm text-gray-400">Default email footer<textarea value={form.default_email_footer} onChange={e => setForm({ ...form, default_email_footer: e.target.value })} rows={3} className="mt-1 w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white" /></label>
      <button disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 text-black text-sm font-bold disabled:opacity-50"><Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save settings'}</button>
    </form>

    <section className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
      <div className="flex items-start gap-3"><AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" /><div><h4 className="font-semibold text-white">Remove demo data</h4><p className="text-sm text-gray-400 mt-1">Permanently deletes students, companies, jobs, applications, interviews, offers, notifications and email logs. This cannot be undone.</p></div></div>
      <div className="mt-4 flex flex-col sm:flex-row gap-3"><input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="Type DELETE ALL DATA" className="flex-1 px-3 py-2 bg-zinc-950 border border-red-500/20 rounded-lg text-white text-sm" /><button onClick={clearDemoData} disabled={clearing || confirmText !== 'DELETE ALL DATA'} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-bold disabled:opacity-40"><Trash2 className="w-4 h-4" /> {clearing ? 'Deleting...' : 'Delete data'}</button></div>
    </section>
    {notice && <p className={`text-sm ${notice.toLowerCase().includes('could not') || notice.toLowerCase().includes('error') ? 'text-red-400' : 'text-green-400'}`}>{notice}</p>}
  </div>;
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="block text-sm text-gray-400">{label}<input type={type} value={value} onChange={e => onChange(e.target.value)} className="mt-1 w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white" /></label>;
}
