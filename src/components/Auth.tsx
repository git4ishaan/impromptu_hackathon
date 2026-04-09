import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Mail, Lock, User, Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
        
        // No alert needed since email confirmation is disabled
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
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-md mx-auto p-4"
    >
      <div className="w-full glass-card p-10 rounded-[2.5rem] shadow-2xl shadow-primary/10 transition-all duration-500 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-secondary/5 rounded-full blur-3xl"></div>

        <div className="mb-10 text-center relative z-10">
          <h2 className="text-4xl font-black text-on-surface mb-3 headline-font leading-tight">
            {isSignUp ? 'Join the Hub' : 'Welcome Back'}
          </h2>
          <p className="text-on-surface-variant font-medium opacity-60">
            {isSignUp ? 'Start coordinating with students.' : 'Ready to find your focus spot?'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6 relative z-10">
          <AnimatePresence mode="wait">
            {isSignUp && (
              <motion.div 
                key="name"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="relative"
              >
                <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-primary/5 rounded-lg">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <input
                  type="text"
                  placeholder="Full Name"
                  required
                  className="w-full bg-white/40 border border-white/80 rounded-2xl py-4.5 pl-14 pr-4 text-on-surface font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-on-surface-variant/40"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-primary/5 rounded-lg">
              <Mail className="w-4 h-4 text-primary" />
            </div>
            <input
              type="email"
              placeholder="Email Address"
              required
              className="w-full bg-white/40 border border-white/80 rounded-2xl py-4.5 pl-14 pr-4 text-on-surface font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-on-surface-variant/40"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-primary/5 rounded-lg">
              <Lock className="w-4 h-4 text-primary" />
            </div>
            <input
              type="password"
              placeholder="Password"
              required
              className="w-full bg-white/40 border border-white/80 rounded-2xl py-4.5 pl-14 pr-4 text-on-surface font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-on-surface-variant/40"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-bold headline-font"
            >
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full tonal-gradient-btn font-black py-5 rounded-[1.5rem] flex items-center justify-center gap-3 transition-all headline-font shadow-xl shadow-primary/20 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed group uppercase tracking-widest text-sm"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {isSignUp ? 'Create Account' : 'Sign In'}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center relative z-10">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs font-black text-on-surface-variant hover:text-primary transition-all uppercase tracking-widest opacity-60 hover:opacity-100"
          >
            {isSignUp ? 'Already have an account? Log in' : "New to StudySpot? Create account"}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
