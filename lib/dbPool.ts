import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/types/supabase';

let instance: SupabaseClient<Database> | null = null;

const DEFAULT_POOL_CONFIG = {
  maxConnections: process.env.PG_POOL_MAX ? parseInt(process.env.PG_POOL_MAX) : 20,
  connectionTimeout: 2000,
  idleTimeout: 30000,
  retryAttempts: 3,
  retryDelay: 500,
};

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!instance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Append pgbouncer parameter for connection pooling if using Supabase
    const connectionString = `${supabaseUrl}${supabaseUrl.includes('?') ? '&' : '?'}pgbouncer=true`;

    instance = createClient<Database>(connectionString, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: true,
      },
      db: {
        schema: 'public',
      },
      global: {
        fetch: (url, init) => {
          // Add custom headers or modify fetch behavior if needed
          return fetch(url, {
            ...init,
            headers: {
              ...init?.headers,
              'x-connection-pool': 'true',
            },
          });
        },
      },
    });
  }

  return instance;
}

// Helper for transactions
export async function withTransaction<T>(
  callback: (client: SupabaseClient<Database>) => Promise<T>
): Promise<T> {
  const client = getSupabaseClient();
  
  try {
    await client.rpc('begin_transaction');
    const result = await callback(client);
    await client.rpc('commit_transaction');
    return result;
  } catch (error) {
    await client.rpc('rollback_transaction');
    throw error;
  }
}

// Example usage:
// const result = await withTransaction(async (client) => {
//   const { data: bill } = await client.from('bills').insert([...]);
//   const { data: payment } = await client.from('payments').insert([...]);
//   return { bill, payment };
// });