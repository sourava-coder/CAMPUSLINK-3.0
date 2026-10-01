import { supabase, type Student, type Company, type Job, type Application, type Interview, type Offer, type Notification, type AdminSettings } from './supabase';

type NewRecord<T, OptionalFields extends keyof T = never> = Omit<T, 'id' | 'created_at' | OptionalFields>
  & Partial<Pick<T, OptionalFields>>;
type UpdateRecord<T> = Partial<NewRecord<T>>;
type NewApplication = Omit<Application, 'id' | 'applied_at' | 'updated_at'>;
type UpdateApplication = Partial<NewApplication>;

/**
 * Database Service for User-Isolated Data
 * 
 * All operations automatically include the current user's ID
 * ensuring complete data isolation between users
 */

async function getCurrentAdminUserId(): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  return sessionData?.session?.user?.id ?? null;
}

export const dbService = {
  // ===== STUDENTS =====
  
  async getStudents() {
    const userId = await getCurrentAdminUserId();

    if (!userId) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('admin_user_id', userId)
      .order('created_at', { ascending: false });
    
    return { data, error };
  },

  async addStudent(student: NewRecord<Student>) {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;

    if (!userId) {
      return { data: null, error: new Error('Not authenticated') };
    }

    const { data, error } = await supabase
      .from('students')
      .insert([{ ...student, admin_user_id: userId }])
      .select();

    return { data, error };
  },

  async updateStudent(id: string, updates: UpdateRecord<Student>) {
    const { data, error } = await supabase
      .from('students')
      .update(updates)
      .eq('id', id)
      .select();

    return { data, error };
  },

  async deleteStudent(id: string) {
    const { data, error } = await supabase
      .from('students')
      .delete()
      .eq('id', id);

    return { data, error };
  },

  // ===== COMPANIES =====

  async getCompanies() {
    const userId = await getCurrentAdminUserId();

    if (!userId) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('admin_user_id', userId)
      .order('created_at', { ascending: false });

    return { data, error };
  },

  async addCompany(company: NewRecord<Company>) {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;

    if (!userId) {
      return { data: null, error: new Error('Not authenticated') };
    }

    const { data, error } = await supabase
      .from('companies')
      .insert([{ ...company, admin_user_id: userId }])
      .select();

    return { data, error };
  },

  async updateCompany(id: string, updates: UpdateRecord<Company>) {
    const { data, error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', id)
      .select();

    return { data, error };
  },

  async deleteCompany(id: string) {
    const { data, error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id);

    return { data, error };
  },

  // ===== JOBS =====

  async getJobs() {
    const userId = await getCurrentAdminUserId();

    if (!userId) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from('jobs')
      .select('*, company:companies(*)')
      .eq('admin_user_id', userId)
      .order('created_at', { ascending: false });

    return { data, error };
  },

  async addJob(job: NewRecord<Job, 'job_type'>) {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;

    if (!userId) {
      return { data: null, error: new Error('Not authenticated') };
    }

    const { data, error } = await supabase
      .from('jobs')
      .insert([{ ...job, admin_user_id: userId }])
      .select();

    return { data, error };
  },

  async updateJob(id: string, updates: UpdateRecord<Job>) {
    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', id)
      .select();

    return { data, error };
  },

  async deleteJob(id: string) {
    const { data, error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id);

    return { data, error };
  },

  // ===== APPLICATIONS =====

  async getApplications() {
    const { data, error } = await supabase
      .from('applications')
      .select('*, student:students(*), job:jobs(*, company:companies(*))')
      .order('applied_at', { ascending: false });

    return { data, error };
  },

  async addApplication(application: NewApplication) {
    const { data, error } = await supabase
      .from('applications')
      .insert([application])
      .select();

    return { data, error };
  },

  async updateApplication(id: string, updates: UpdateApplication) {
    const { data, error } = await supabase
      .from('applications')
      .update(updates)
      .eq('id', id)
      .select();

    return { data, error };
  },

  // ===== INTERVIEWS =====

  async getInterviews() {
    const { data, error } = await supabase
      .from('interviews')
      .select('*, student:students(*)')
      .order('scheduled_at');

    return { data, error };
  },

  async addInterview(interview: NewRecord<Interview>) {
    const { data, error } = await supabase
      .from('interviews')
      .insert([interview])
      .select();

    return { data, error };
  },

  async updateInterview(id: string, updates: UpdateRecord<Interview>) {
    const { data, error } = await supabase
      .from('interviews')
      .update(updates)
      .eq('id', id)
      .select();

    return { data, error };
  },

  // ===== OFFERS =====

  async getOffers() {
    const { data, error } = await supabase
      .from('offers')
      .select('*, student:students(*)')
      .order('created_at', { ascending: false });

    return { data, error };
  },

  async addOffer(offer: NewRecord<Offer>) {
    const { data, error } = await supabase
      .from('offers')
      .insert([offer])
      .select();

    return { data, error };
  },

  async updateOffer(id: string, updates: UpdateRecord<Offer>) {
    const { data, error } = await supabase
      .from('offers')
      .update(updates)
      .eq('id', id)
      .select();

    return { data, error };
  },

  // ===== NOTIFICATIONS =====

  async getNotifications() {
    const { data, error } = await supabase
      .from('notifications')
      .select('*, student:students(*)')
      .order('created_at', { ascending: false });

    return { data, error };
  },

  async addNotification(notification: NewRecord<Notification>) {
    const { data, error } = await supabase
      .from('notifications')
      .insert([notification])
      .select();

    return { data, error };
  },

  async updateNotification(id: string, updates: UpdateRecord<Notification>) {
    const { data, error } = await supabase
      .from('notifications')
      .update(updates)
      .eq('id', id)
      .select();

    return { data, error };
  },

  // ===== ADMIN SETTINGS =====

  async getAdminSettings() {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('*')
      .single();

    return { data, error };
  },

  async updateAdminSettings(updates: Partial<AdminSettings>) {
    const { data, error } = await supabase
      .from('admin_settings')
      .update(updates)
      .eq('id', true)
      .select()
      .single();

    return { data, error };
  },
};
