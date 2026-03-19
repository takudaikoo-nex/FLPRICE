import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kbifluukpqhbjmhhvbgg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiaWZsdXVrcHFoYmptaGh2YmdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MTIwNjMsImV4cCI6MjA4MDI4ODA2M30.ZTO6mJOVHohzd0isGrXI_K0tr0V1E9So_Ut1mXxZoBw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
