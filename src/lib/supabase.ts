import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://smawnhsfntekjvtvnrwg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtYXduaHNmbnRla2p2dHZucndnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMzEzMjIsImV4cCI6MjA5MjkwNzMyMn0.gFnqoa01NPv72fc4K4-7TLcVNd2JGFWkwwSYby5l6K8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
