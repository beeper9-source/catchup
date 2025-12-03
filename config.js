// Supabase 설정
const SUPABASE_URL = 'https://nqwjvrznwzmfytjlpfsk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2p2cnpud3ptZnl0amxwZnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNzA4NTEsImV4cCI6MjA3Mzk0Njg1MX0.R3Y2Xb9PmLr3sCLSdJov4Mgk1eAmhaCIPXEKq6u8NQI';

// OpenAI 설정
const OPENAI_API_KEY = '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';

// Supabase 클라이언트 초기화
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
