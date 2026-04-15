import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/dist/esm/wrapper.mjs';

// استبدل هذه القيم ببيانات مشروعك من Supabase
const SUPABASE_URL = 'https://oefnpkaotuhgabkzytzr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lZm5wa2FvdHVoZ2Fia3p5dHpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNjM0ODYsImV4cCI6MjA5MTgzOTQ4Nn0.yoglJweMF1AjbYrw9wIXQX9rVzZDVf5eL2gW2yq-Ag0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// دالة مساعدة للحصول على المستخدم الحالي
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

// دالة للحصول على بيانات المشرف من جدول admins
export async function getCurrentAdmin() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('admins')
    .select('*')
    .eq('id', user.id)
    .single();
  if (error) return null;
  return data;
}