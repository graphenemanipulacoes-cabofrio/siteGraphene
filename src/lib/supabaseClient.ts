
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ctuuxrtthiiytnyonqri.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0dXV4cnR0aGlpeXRueW9ucXJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3NTA0ODIsImV4cCI6MjA4MTMyNjQ4Mn0.BUyUt_BUPYFk4_X-Ws_F6CWV2DUBdigwZ4pBwTydl9Y'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
