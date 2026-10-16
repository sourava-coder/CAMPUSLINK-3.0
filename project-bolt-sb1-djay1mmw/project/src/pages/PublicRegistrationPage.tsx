import { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { QrEntityType } from '@/components/RegistrationQRDialog';

type RegistrationField = { name: string; label: string; type?: string; required?: boolean; multiline?: boolean };

const fields: Record<QrEntityType, RegistrationField[]> = {
  student: [
    { name: 'name', label: 'Full name', required: true },
    { name: 'email', label: 'Email address', type: 'email', required: true },
    { name: 'roll_number', label: 'Roll number' },
    { name: 'branch', label: 'Branch / department' },
    { name: 'phone', label: 'Phone number', type: 'tel' },
    { name: 'graduation_year', label: 'Graduation year', type: 'number' },
    { name: 'linkedin_url', label: 'LinkedIn profile', type: 'url' },
    { name: 'github_url', label: 'GitHub profile', type: 'url' },
    { name: 'portfolio_url', label: 'Portfolio / personal website', type: 'url' },
  ],
  recruiter: [
    { name: 'name', label: 'Company name', required: true },
    { name: 'email', label: 'Work email', type: 'email', required: true },
    { name: 'industry', label: 'Industry' },
    { name: 'website', label: 'Company website', type: 'url' },
    { name: 'contact_phone', label: 'Contact phone', type: 'tel' },
    { name: 'description', label: 'About the company', multiline: true },
  ],
  job: [
    { name: 'name', label: 'Company name', required: true },
    { name: 'email', label: 'Company contact email', type: 'email', required: true },
    { name: 'industry', label: 'Industry' },
    { name: 'website', label: 'Company website', type: 'url' },
    { name: 'contact_phone', label: 'Company phone', type: 'tel' },
    { name: 'description', label: 'About the company', multiline: true },
    { name: 'title', label: 'Job title', required: true },
    { name: 'job_description', label: 'Job description', multiline: true },
    { name: 'required_skills', label: 'Required skills (comma-separated)' },
    { name: 'preferred_skills', label: 'Preferred skills (comma-separated)' },
    { name: 'min_cgpa', label: 'Minimum CGPA', type: 'number' },
    { name: 'package_lpa', label: 'Package (LPA)', type: 'number' },
    { name: 'location', label: 'Job location' },
    { name: 'job_type', label: 'Job type' },
    { name: 'deadline', label: 'Application deadline', type: 'date' },
  ],
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return 'Please try again.';
}

export default function PublicRegistrationPage({ token }: { token: string }) {
  const [entityType, setEntityType] = useState<QrEntityType | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  useEffect(() => {
    let active = true;
    async function loadRegistrationType() {
      try {
        const { data, error: rpcError } = await supabase.rpc('get_registration_qr_type', { p_token: token });
        if (!active) return;
        if (rpcError) setError(`Could not load the registration form: ${rpcError.message}`);
        else if (data !== 'student' && data !== 'recruiter' && data !== 'job') setError('This registration QR code is invalid or has been revoked.');
        else {
          setEntityType(data);
          if (data === 'job') {
            setValues(current => ({ ...current, min_cgpa: '0', package_lpa: '0', job_type: 'full-time' }));
          }
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error
          ? `Could not load the registration form: ${loadError.message}`
          : 'Could not load the registration form.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadRegistrationType();
    return () => { active = false; };
  }, [token]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (entityType === 'student' && resumeFile) {
        const form = new FormData();
        form.append('token', token);
        form.append('payload', JSON.stringify(values));
        form.append('resume', resumeFile);
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/qr-student-resume`, {
          method: 'POST',
          headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
          body: form,
        });
        const result = await response.json() as { error?: string };
        if (!response.ok) throw new Error(result.error || 'Resume upload or registration failed.');
      } else {
        const { error: submitError } = await supabase.rpc('submit_registration_qr', {
          p_token: token,
          p_payload: values,
        });
        if (submitError) throw submitError;
      }
      setSubmitted(true);
    } catch (submitError) {
      const message = getErrorMessage(submitError);
      setError(message.includes('valid or has been revoked')
        ? 'This registration link is invalid or has been revoked.'
        : `Submission failed: ${message}`);
    } finally {
      setSubmitting(false);
    }
  }

  const heading = entityType === 'student' ? 'Student registration' : entityType === 'job' ? 'Job posting' : 'Recruiter registration';
  return (
    <main data-theme="light" className="campuslink-theme min-h-screen px-4 py-8 sm:py-12">
      <section className="mx-auto w-full max-w-xl overflow-hidden rounded-2xl border border-yellow-400/20 bg-zinc-950 shadow-xl">
        <header className="flex items-center gap-3 border-b border-zinc-800 px-5 py-4 sm:px-7">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-400"><GraduationCap className="h-6 w-6 text-black" /></span>
          <div><p className="text-xs font-bold tracking-widest text-yellow-400">CAMPUSLINK</p><h1 className="font-bold text-white">{loading ? 'Loading registration' : heading}</h1></div>
        </header>
        <div className="p-5 sm:p-7">
          {loading ? <p role="status" className="text-gray-400">Loading registration form...</p> : null}
          {!loading && error && !entityType ? <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">{error}</p> : null}
          {submitted ? (
            <div role="status" className="space-y-2 rounded-xl border border-green-400/20 bg-green-400/10 p-5">
              <h2 className="text-lg font-bold text-white">{entityType === 'job' ? 'Job posted successfully' : 'Registration successful'}</h2>
              <p className="text-sm text-gray-300">{entityType === 'job' ? 'The company and job details have been added to CampusLink.' : 'Your details have been added to CampusLink. Thank you!'}</p>
            </div>
          ) : entityType && (
            <form onSubmit={submit} className="space-y-4">
              <p className="mb-5 text-sm text-gray-400">
                {entityType === 'job'
                  ? 'Enter the company and job details. The company and job will be added to the placement system when you submit.'
                  : 'Enter your details below. Your record will be added to the placement system when you submit.'}
              </p>
              {fields[entityType].map(field => (
                <label key={field.name} className="block text-sm font-medium text-gray-300">
                  {field.label}{field.required ? ' *' : ''}
                  {field.multiline ? (
                    <textarea value={values[field.name] || ''} onChange={event => setValues(current => ({ ...current, [field.name]: event.target.value }))} rows={3} className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-white" />
                  ) : field.name === 'job_type' ? (
                    <select value={values[field.name] || 'full-time'} onChange={event => setValues(current => ({ ...current, [field.name]: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-white">
                      <option value="full-time">Full-time</option>
                      <option value="internship">Internship</option>
                      <option value="contract">Contract</option>
                      <option value="part-time">Part-time</option>
                    </select>
                  ) : (
                    <input type={field.type || 'text'} required={field.required} value={values[field.name] || ''} onChange={event => setValues(current => ({ ...current, [field.name]: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-white" />
                  )}
                </label>
              ))}
              {entityType === 'student' && (
                <label className="block text-sm font-medium text-gray-300">
                  Resume PDF (optional, max 5 MB)
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={event => setResumeFile(event.target.files?.[0] || null)}
                    className="mt-1.5 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-white file:mr-3 file:rounded-md file:border-0 file:bg-yellow-400 file:px-3 file:py-1 file:font-semibold file:text-black"
                  />
                </label>
              )}
              {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</p>}
              <button type="submit" disabled={submitting} className="w-full rounded-xl bg-yellow-400 px-4 py-3 font-bold text-black disabled:opacity-50">
                {submitting ? 'Submitting...' : entityType === 'job' ? 'Post job' : 'Submit registration'}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
