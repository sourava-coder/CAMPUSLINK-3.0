import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Student = {
  id: string;
  name: string;
  email: string;
  roll_number: string | null;
  branch: string | null;
  cgpa: number;
  skills: string[];
  skill_levels: Record<string, string>;
  projects: number;
  internships: number;
  backlogs: number;
  certifications: string[];
  aptitude_score: number;
  communication_score: number;
  resume_quality: number;
  interview_readiness: number;
  status: string;
  risk_level: string;
  placed_company: string | null;
  placed_package: number | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  graduation_year: number | null;
  linkedin_url: string | null;
  github_url: string | null;
  resume_url: string | null;
  resume_text: string | null;
  email_verified: boolean;
  email_verification_sent_at: string | null;
  created_at: string;
};

export type AdminSettings = {
  id: boolean;
  college_name: string;
  placement_cell_email: string | null;
  sender_name: string;
  default_email_footer: string;
  updated_at: string;
};

export type Company = {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  description: string | null;
  created_at: string;
};

export type Job = {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  required_skills: string[];
  preferred_skills: string[];
  min_cgpa: number;
  package_lpa: number;
  location: string | null;
  job_type: string;
  deadline: string | null;
  status: string;
  created_at: string;
  company?: Company;
};

export type Application = {
  id: string;
  student_id: string;
  job_id: string;
  status: string;
  fit_score: number;
  fit_breakdown: Record<string, number>;
  skill_gaps: string[];
  applied_at: string;
  updated_at: string;
  student?: Student;
  job?: Job;
};

export type Interview = {
  id: string;
  application_id: string;
  student_id: string;
  type: string;
  scheduled_at: string;
  duration_minutes: number;
  venue: string | null;
  round: number;
  status: string;
  created_at: string;
  student?: Student;
};

export type Offer = {
  id: string;
  application_id: string;
  student_id: string;
  job_id: string;
  company_name: string;
  job_title: string;
  package_lpa: number;
  offer_letter_text: string;
  status: string;
  sent_at: string | null;
  accepted_at: string | null;
  created_at: string;
  student?: Student;
};

export type Notification = {
  id: string;
  student_id: string;
  title: string;
  message: string;
  type: string;
  sent: boolean;
  sent_at: string | null;
  created_at: string;
  student?: Student;
};

export function buildWhatsAppLink(phone: string | null | undefined, message: string) {
  const normalized = (phone || '').replace(/\D/g, '');

  if (!normalized) return null;

  const text = encodeURIComponent((message || '').trim() || 'Hello');
  return `https://wa.me/${normalized}?text=${text}`;
}

export async function sendStudentEmail({
  to,
  subject,
  body,
  type = 'notification',
  studentId,
}: {
  to: string;
  subject: string;
  body: string;
  type?: string;
  studentId?: string;
}) {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: { to, subject, body, type, studentId },
  });
  if (error) {
    const response = 'context' in error && error.context instanceof Response ? error.context : null;
    if (response) {
      try {
        const details = await response.json();
        if (details?.message === 'Requested function was not found') {
          return { data: null, error: 'send-email Edge Function deploy नहीं हुई है। Supabase में function deploy करें।' };
        }
        if (details?.error) return { data: null, error: details.error };
        if (details?.message) return { data: null, error: details.message };
      } catch {
        // Keep the SDK error when the response is not JSON.
      }
    }
    return { data: null, error: error.message || 'Email function failed' };
  }
  if (data?.error) return { data: null, error: data.error };
  return { data, error: null };
}
