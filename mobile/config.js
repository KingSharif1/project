// Configuration for mobile apps
// Environment-based configuration using Expo Constants
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || {};

export const CONFIG = {
  SUPABASE_URL: extra.supabaseUrl || 'https://ocjqsnocuqyumoltighi.supabase.co',
  SUPABASE_ANON_KEY: extra.supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9janFzbm9jdXF5dW1vbHRpZ2hpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MjE5ODUsImV4cCI6MjA3MDA5Nzk4NX0.V05Bv2bHsnoWbd5AjhPrLMV63-3lP0SQtW3bZ4S8iEg',
  API_BASE: extra.apiUrl || 'http://192.168.1.129:3000/api/mobile',
  ENVIRONMENT: extra.environment || 'development',
};
