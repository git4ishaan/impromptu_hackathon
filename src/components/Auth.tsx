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
        
        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              full_name: fullName,
            });
          if (profileError) console.error('Profile creation error:', profileError);
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred during authentication';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center min-h-[70vh] w-full max-w-md mx-auto p-4"
    >
      <div className="w-full bg-slate-900/90 border border-slate-800 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl shadow-black/80 relative overflow-hidden backdrop-blur-xl">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl"></div>

        <div className="mb-8 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-2 headline-font tracking-tight">
            {isSignUp ? 'Join StudySpot' : 'Welcome Back'}
          </h2>
          <p className="text-slate-400 font-medium text-xs sm:text-sm">
            {isSignUp ? 'Create your MIT-WPU study account.' : 'Sign in to coordinate with peers on campus.'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5 relative z-10">
          <AnimatePresence mode="wait">
            {isSignUp && (
              <motion.div 
                key="name"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="relative"
              >
                <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-500/10 rounded-lg">
                  <User className="w-4 h-4 text-indigo-400" />
                </div>
                <input
                  type="text"
                  placeholder="Full Name"
                  required
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-2xl py-4 pl-14 pr-4 text-slate-100 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all placeholder:text-slate-500"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-500/10 rounded-lg">
              <Mail className="w-4 h-4 text-indigo-400" />
            </div>
            <input
              type="email"
              placeholder="Campus Email (e.g. name@mitwpu.edu)"
              required
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-2xl py-4 pl-14 pr-4 text-slate-100 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all placeholder:text-slate-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-500/10 rounded-lg">
              <Lock className="w-4 h-4 text-indigo-400" />
            </div>
            <input
              type="password"
              placeholder="Password"
              required
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-2xl py-4 pl-14 pr-4 text-slate-100 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all placeholder:text-slate-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-semibold"
            >
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold flex items-center justify-center gap-2.5 transition-all shadow-xl shadow-indigo-600/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group uppercase tracking-widest text-xs headline-font"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center relative z-10">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs font-bold text-slate-400 hover:text-indigo-400 transition-colors uppercase tracking-wider"
          >
            {isSignUp ? 'Already have an account? Sign in' : "New to StudySpot? Create account"}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
