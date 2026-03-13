// Mock Supabase Client tailored for easy swap out later
export const supabase = {
  auth: {
    signInWithPassword: async ({ email, password }) => {
      console.log('Mock sign in:', email);
      return { data: { user: { id: 'user_mock', email } }, error: null };
    },
    signUp: async ({ email, password }) => {
      console.log('Mock sign up:', email);
      return { data: { user: { id: 'user_mock', email } }, error: null };
    },
    signOut: async () => {
      console.log('Mock sign out');
      return { error: null };
    },
    getSession: async () => {
       // Currently sets session to null so user can see login screen
       return { data: { session: null }, error: null };
    },
    onAuthStateChange: (callback) => {
       // In a real app this fires on auth events
       // We just return a dummy unsubscribe
       return { data: { subscription: { unsubscribe: () => {} } } };
    }
  },
  from: (table) => ({
    insert: async (data) => {
      console.log(`Mock insert saving data to ${table}:`, data);
      return { data, error: null };
    },
    select: () => ({
      eq: async (column, value) => {
          console.log(`Mock fetch from ${table} where ${column} = ${value}`);
          return { data: [], error: null };
      }
    }),
  })
};
