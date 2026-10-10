import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vhubdozlyjqpvpqcacdv.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZodWJkb3pseWpxcHZwcWNhY2R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NTc2MzksImV4cCI6MjEwNzAzMzYzOX0.SJCXi2CLCcyz7NtOl9IVmJBbHVxKoGHa9jES4rThUFM";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
