import { useState } from 'react';
import type { Company, Job, Student } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { dbService } from '@/lib/db-service';
import { Building2, Plus, X, MapPin, DollarSign, Calendar, Briefcase, Users, Target, Trash2, AlertTriangle, Pencil } from 'lucide-react';

type Props = {
  companies: Company[];
  jobs: Job[];
  students: Student[];
  onDataChanged?: () => void;
};

export default function CompaniesTab({ companies, jobs, students, onDataChanged }: Props) {
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [showAddJob, setShowAddJob] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [editTarget, setEditTarget] = useState<Company | null>(null);
  const [editJobTarget, setEditJobTarget] = useState<Job | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-gray-400 text-sm">{companies.length} companies · {jobs.length} active jobs</p>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            onClick={() => setShowAddCompany(true)}
            className="flex w-full items-center justify-center gap-2 px-4 py-2 bg-yellow-400 text-black font-medium rounded-lg text-sm hover:bg-yellow-300 transition-all sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            Add Company
          </button>
          <button
            onClick={() => setShowAddJob(true)}
            className="flex w-full items-center justify-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 text-white font-medium rounded-lg text-sm hover:border-yellow-400/30 transition-all sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            Post Job
          </button>
        </div>
      </div>

      {/* Companies grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {companies.map(company => {
          const companyJobs = jobs.filter(j => j.company_id === company.id);
          return (
            <div
              key={company.id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-yellow-400/30 transition-all"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 border border-yellow-400/20 flex items-center justify-center text-yellow-400 shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-white font-semibold truncate">{company.name}</h4>
                  <p className="text-xs text-gray-500">{company.industry}</p>
                </div>
                <button
                  onClick={() => setDeleteTarget(company)}
                  title={`Delete ${company.name}`}
                  className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button onClick={() => setEditTarget(company)} title={`Edit ${company.name}`} className="p-2 text-gray-500 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
              </div>
              {company.description && (
                <p className="text-sm text-gray-400 mb-3 line-clamp-2">{company.description}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> {companyJobs.length} jobs</span>
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {company.contact_email}</span>
              </div>
              <div className="space-y-2">
                {companyJobs.map(job => (
                  <div key={job.id} className="bg-zinc-950 rounded-lg p-3 border border-zinc-800">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-sm text-white font-medium">{job.title}</p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditJobTarget(job)}
                          title={`Edit ${job.title}`}
                          className="p-1.5 text-gray-500 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-md transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs text-yellow-400 font-bold">₹{job.package_lpa}L</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location}</span>
                      <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {job.required_skills.length} required</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {showAddCompany && <AddCompanyForm onClose={() => setShowAddCompany(false)} />}
      {showAddJob && <AddJobForm companies={companies} onClose={() => setShowAddJob(false)} />}
      {deleteTarget && <DeleteCompanyModal company={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={() => { setDeleteTarget(null); onDataChanged?.(); }} />}
      {editTarget && <EditCompanyForm company={editTarget} onClose={() => setEditTarget(null)} onSaved={() => { setEditTarget(null); onDataChanged?.(); }} />}
      {editJobTarget && <EditJobForm job={editJobTarget} companies={companies} onClose={() => setEditJobTarget(null)} onSaved={() => { setEditJobTarget(null); onDataChanged?.(); }} />}
    </div>
  );
}

function EditCompanyForm({ company, onClose, onSaved }: { company: Company; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: company.name, industry: company.industry || '', website: company.website || '', contact_email: company.contact_email || '', contact_phone: company.contact_phone || '', description: company.description || '' });
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  async function save(e: React.FormEvent) { e.preventDefault(); setSaving(true); setError(''); const { error: updateError } = await dbService.updateCompany(company.id, form); if (updateError) { setError(updateError.message); setSaving(false); return; } onSaved(); }
  return <Modal title="Edit Recruiter" onClose={onClose}><form onSubmit={save} className="space-y-4"><Input label="Company Name" value={form.name} onChange={v => update('name', v)} required /><Input label="Industry" value={form.industry} onChange={v => update('industry', v)} /><Input label="Website" value={form.website} onChange={v => update('website', v)} /><Input label="Contact Email" value={form.contact_email} onChange={v => update('contact_email', v)} /><Input label="Contact Phone" value={form.contact_phone} onChange={v => update('contact_phone', v)} /><TextArea label="Description" value={form.description} onChange={v => update('description', v)} />{error && <p className="text-red-400 text-sm">{error}</p>}<button type="submit" disabled={saving} className="w-full py-2.5 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-300 disabled:opacity-50">{saving ? 'Saving...' : 'Save changes'}</button></form></Modal>;
}

function DeleteCompanyModal({ company, onClose, onDeleted }: { company: Company; onClose: () => void; onDeleted: () => void }) {
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function deleteCompany() {
    if (confirmation !== 'DELETE') return;
    setDeleting(true); setError('');
    const { error: deleteError } = await dbService.deleteCompany(company.id);
    if (deleteError) { setError(deleteError.message); setDeleting(false); return; }
    onDeleted();
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="absolute inset-0 bg-black/70" />
    <div className="relative w-full max-w-md bg-zinc-950 border border-red-500/30 rounded-2xl p-6" onClick={e => e.stopPropagation()}>
      <div className="flex items-start gap-3"><AlertTriangle className="w-6 h-6 text-red-400 shrink-0" /><div><h3 className="text-lg font-bold text-white">Delete recruiter?</h3><p className="text-sm text-gray-400 mt-1">Deleting <span className="text-white font-semibold">{company.name}</span> also deletes its jobs and related applications.</p></div></div>
      <label className="block text-sm text-gray-400 mt-5">Type <span className="text-red-400 font-bold">DELETE</span> to continue<input value={confirmation} onChange={e => setConfirmation(e.target.value)} className="mt-2 w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white" autoFocus /></label>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      <div className="flex justify-end gap-3 mt-5"><button onClick={onClose} className="px-4 py-2 text-sm text-gray-400">Cancel</button><button onClick={deleteCompany} disabled={deleting || confirmation !== 'DELETE'} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-bold disabled:opacity-40"><Trash2 className="w-4 h-4" />{deleting ? 'Deleting...' : 'Delete recruiter'}</button></div>
    </div>
  </div>;
}

function AddCompanyForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: '', industry: '', website: '', contact_email: '', contact_phone: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error } = await dbService.addCompany(form);
    if (error) setError(error.message);
    else onClose();
    setSaving(false);
  };

  return (
    <Modal title="Add Company" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Company Name" value={form.name} onChange={v => setForm({ ...form, name: v })} required />
        <Input label="Industry" value={form.industry} onChange={v => setForm({ ...form, industry: v })} />
        <Input label="Website" value={form.website} onChange={v => setForm({ ...form, website: v })} />
        <Input label="Contact Email" value={form.contact_email} onChange={v => setForm({ ...form, contact_email: v })} />
        <Input label="Contact Phone" value={form.contact_phone} onChange={v => setForm({ ...form, contact_phone: v })} />
        <TextArea label="Description" value={form.description} onChange={v => setForm({ ...form, description: v })} />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={saving} className="w-full py-2.5 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-300 disabled:opacity-50">
          {saving ? 'Saving...' : 'Add Company'}
        </button>
      </form>
    </Modal>
  );
}

function EditJobForm({ job, companies, onClose, onSaved }: { job: Job; companies: Company[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    company_id: job.company_id,
    title: job.title,
    description: job.description || '',
    required_skills: job.required_skills.join(', '),
    preferred_skills: job.preferred_skills.join(', '),
    min_cgpa: String(job.min_cgpa),
    package_lpa: String(job.package_lpa),
    location: job.location || '',
    deadline: job.deadline || '',
    status: job.status,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error: updateError } = await dbService.updateJob(job.id, {
      company_id: form.company_id,
      title: form.title,
      description: form.description,
      required_skills: form.required_skills.split(',').map(s => s.trim()).filter(Boolean),
      preferred_skills: form.preferred_skills.split(',').map(s => s.trim()).filter(Boolean),
      min_cgpa: parseFloat(form.min_cgpa) || 0,
      package_lpa: parseFloat(form.package_lpa) || 0,
      location: form.location,
      deadline: form.deadline || null,
      status: form.status,
    });

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    onSaved();
  };

  return (
    <Modal title="Edit Job" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1.5">Company</label>
          <select
            value={form.company_id}
            onChange={e => setForm({ ...form, company_id: e.target.value })}
            className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-yellow-400/50"
          >
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <Input label="Job Title" value={form.title} onChange={v => setForm({ ...form, title: v })} required />
        <TextArea label="Description" value={form.description} onChange={v => setForm({ ...form, description: v })} />
        <Input label="Required Skills (comma-separated)" value={form.required_skills} onChange={v => setForm({ ...form, required_skills: v })} placeholder="Java, SQL, Python" />
        <Input label="Preferred Skills (comma-separated)" value={form.preferred_skills} onChange={v => setForm({ ...form, preferred_skills: v })} placeholder="AWS, Docker" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Min CGPA" value={form.min_cgpa} onChange={v => setForm({ ...form, min_cgpa: v })} type="number" />
          <Input label="Package (LPA)" value={form.package_lpa} onChange={v => setForm({ ...form, package_lpa: v })} type="number" />
        </div>
        <Input label="Location" value={form.location} onChange={v => setForm({ ...form, location: v })} />
        <Input label="Deadline" value={form.deadline} onChange={v => setForm({ ...form, deadline: v })} type="date" />
        <div>
          <label className="block text-sm text-gray-300 mb-1.5">Status</label>
          <select
            value={form.status}
            onChange={e => setForm({ ...form, status: e.target.value })}
            className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-yellow-400/50"
          >
            <option value="active">Active</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={saving} className="w-full py-2.5 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-300 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </form>
    </Modal>
  );
}

function AddJobForm({ companies, onClose }: { companies: Company[]; onClose: () => void }) {
  const [form, setForm] = useState({
    company_id: companies[0]?.id || '',
    title: '',
    description: '',
    required_skills: '',
    preferred_skills: '',
    min_cgpa: '7.0',
    package_lpa: '0',
    location: '',
    deadline: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error } = await dbService.addJob({
      company_id: form.company_id,
      title: form.title,
      description: form.description,
      required_skills: form.required_skills.split(',').map(s => s.trim()).filter(Boolean),
      preferred_skills: form.preferred_skills.split(',').map(s => s.trim()).filter(Boolean),
      min_cgpa: parseFloat(form.min_cgpa) || 0,
      package_lpa: parseFloat(form.package_lpa) || 0,
      location: form.location,
      deadline: form.deadline || null,
      status: 'active',
    });
    if (error) setError(error.message);
    else onClose();
    setSaving(false);
  };

  return (
    <Modal title="Post New Job" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1.5">Company</label>
          <select
            value={form.company_id}
            onChange={e => setForm({ ...form, company_id: e.target.value })}
            className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-yellow-400/50"
          >
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <Input label="Job Title" value={form.title} onChange={v => setForm({ ...form, title: v })} required />
        <TextArea label="Description" value={form.description} onChange={v => setForm({ ...form, description: v })} />
        <Input label="Required Skills (comma-separated)" value={form.required_skills} onChange={v => setForm({ ...form, required_skills: v })} placeholder="Java, SQL, Python" />
        <Input label="Preferred Skills (comma-separated)" value={form.preferred_skills} onChange={v => setForm({ ...form, preferred_skills: v })} placeholder="AWS, Docker" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Min CGPA" value={form.min_cgpa} onChange={v => setForm({ ...form, min_cgpa: v })} type="number" />
          <Input label="Package (LPA)" value={form.package_lpa} onChange={v => setForm({ ...form, package_lpa: v })} type="number" />
        </div>
        <Input label="Location" value={form.location} onChange={v => setForm({ ...form, location: v })} />
        <Input label="Deadline" value={form.deadline} onChange={v => setForm({ ...form, deadline: v })} type="date" />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={saving} className="w-full py-2.5 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-300 disabled:opacity-50">
          {saving ? 'Posting...' : 'Post Job'}
        </button>
      </form>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70" onClick={onClose}>
      <div className="flex min-h-full items-start justify-center p-4 sm:p-6">
        <div className="relative w-full max-w-lg bg-zinc-950 border border-yellow-400/20 rounded-2xl my-4 sm:my-8" onClick={e => e.stopPropagation()}>
          <div className="sticky top-0 bg-zinc-950 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-6 max-h-[calc(100vh-8rem)] overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm text-gray-300 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400/50"
      />
    </div>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm text-gray-300 mb-1.5">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={3}
        className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400/50 resize-none"
      />
    </div>
  );
}
