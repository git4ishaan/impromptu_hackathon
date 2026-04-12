import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Mail, Lock, User, Loader2, ArrowRight } from 'lucide-react';

export const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });
        if (signUpError) throw signUpError;
        
        // Profiles are handled by the SQL trigger/migration logic usually, 
        // but here we ensure the profile is created if the trigger didn't catch it.
        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              full_name: fullName,
            });
          if (profileError) console.error('Profile creation error:', profileError);
        }
        
        alert('Check your email for the confirmation link!');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] w-full max-w-md mx-auto p-4">
      <div className="w-full bg-surface-container-low border-2 border-on-surface p-8 shadow-hard transition-all duration-300 relative">
        <div className="absolute top-0 right-0 -m-0 bg-primary-container border-l-2 border-b-2 border-on-surface px-4 py-1">
          <span className="font-display font-black uppercase text-xs tracking-widest text-on-primary-fixed">Auth</span>
        </div>
        <div className="mb-8 text-center mt-4">
          <h2 className="text-4xl font-display font-black text-on-surface mb-2 uppercase">
            {isSignUp ? 'Create Student Account' : 'Welcome Back'}
          </h2>
          <p className="text-on-surface-variant font-bold uppercase tracking-wider text-sm mt-4 inline-block bg-canvas border-2 border-on-surface px-3 py-1 shadow-hard-sm">
            {isSignUp ? 'Join MIT-WPU Hub' : 'Log in to study'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          {isSignUp && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant stroke-[3]" />
              <input
                type="text"
                placeholder="Full Name"
                required
                className="w-full bg-canvas border-2 border-on-surface rounded-none py-3 pl-11 pr-4 text-on-surface focus:outline-none focus:bg-primary-fixed focus:border-on-surface transition-colors placeholder:text-on-surface-variant font-bold"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant stroke-[3]" />
            <input
              type="email"
              placeholder="Email Address"
              required
              className="w-full bg-canvas border-2 border-on-surface rounded-none py-3 pl-11 pr-4 text-on-surface focus:outline-none focus:bg-primary-fixed focus:border-on-surface transition-colors placeholder:text-on-surface-variant font-bold"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant stroke-[3]" />
            <input
              type="password"
              placeholder="Password"
              required
              className="w-full bg-canvas border-2 border-on-surface rounded-none py-3 pl-11 pr-4 text-on-surface focus:outline-none focus:bg-primary-fixed focus:border-on-surface transition-colors placeholder:text-on-surface-variant font-bold"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="p-3 bg-error-container border-2 border-on-surface text-on-surface font-bold text-sm shadow-hard-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-container border-2 border-on-surface text-on-primary-fixed font-black uppercase tracking-widest py-4 rounded-none flex items-center justify-center gap-2 shadow-hard transition-transform hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed group mt-4"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {isSignUp ? 'Sign Up' : 'Log In'}
                <ArrowRight className="w-6 h-6 stroke-[3] group-hover:translate-x-2 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center bg-canvas border-2 border-on-surface p-2 shadow-hard-sm">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm font-bold uppercase tracking-widest text-on-surface hover:bg-primary-fixed w-full py-2 transition-colors"
          >
            {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
};
