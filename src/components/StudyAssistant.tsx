import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Sparkles, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Session {
  id: string;
  subject: string;
  location_name: string;
  host_id: string;
  created_at?: string;
  coordinates?: { x: number; y: number };
  profiles?: { full_name: string };
}

interface StudyAssistantProps {
  onJoinSession?: (session: Session) => void;
}

export const StudyAssistant: React.FC<StudyAssistantProps> = ({ onJoinSession }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        "👋 **Hey! I'm StudySpot AI Copilot.** Ask me where to find a quiet desk, active peer groups for your subject, or real-time library telemetry!",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const suggestedPrompts = [
    'Where can I study quietly right now?',
    'Find me a group studying DSA',
    "What's the least crowded floor?",
    'Where should I study for 2 hours?',
  ];

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendPrompt = (promptText: string) => {
    setInput(promptText);
    executeChat(promptText);
  };

  const executeChat = async (userQuery: string) => {
    if (!userQuery.trim() || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userQuery }]);
    setLoading(true);

    try {
      // 1. Fetch live sessions from Supabase
      let sessions: Session[] = [];
      const { data: sessionData } = await supabase.from('sessions').select('*, profiles(full_name)');
      sessions = (sessionData as unknown as Session[]) || [];

      // 2. Prepare AI prompt
      const systemPrompt = `You are StudySpot AI Copilot, a helpful campus assistant for MIT-WPU students.
Your goal is to guide students to the best active study session or floor spot based on their question.
Live Sessions JSON: ${JSON.stringify(sessions || [])}

Floor Acoustics & Occupancy:
- F1: Collaborative Study Commons (Noise: 42 dB, 74% Occupied)
- F2: Silent Focus & Reading Deck (Noise: 18 dB, 42% Occupied - Whisper Quiet)
- F3: Engineering & Computing Wing (Noise: 28 dB, 61% Occupied)
- F4: Research Desks & Deep Focus (Noise: 20 dB, 35% Occupied)

Instructions:
1. Provide a crisp, friendly response using markdown formatting.
2. If the user asks for a quiet spot, recommend Floor 2 Silent Focus Deck (18 dB) or Floor 4 Research Wing.
3. If they ask for active subjects, match with any session in the Live Sessions JSON.
4. Keep answers concise (max 2 short paragraphs).
5. If the user wants to join a specific session, append [ACTION:JOIN:session_id] at the very end.`;

      // 3. Check for Groq API key or use smart offline fallback response
      const apiKey = import.meta.env.VITE_RANDOM_HACK_KEY;

      if (apiKey && !apiKey.includes('placeholder')) {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'groq/compound-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userQuery },
            ],
            temperature: 0.6,
            max_tokens: 350,
          }),
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          let reply: string = groqData.choices[0].message.content;

          // Check for join action
          const joinMatch = reply.match(/\[ACTION:JOIN:([a-zA-Z0-9_-]+)\]/i);
          if (joinMatch && onJoinSession) {
            const targetId = joinMatch[1];
            const targetSession = sessions.find((s) => s.id === targetId);
            if (targetSession) onJoinSession(targetSession);
            reply = reply.replace(/\[ACTION:JOIN:[a-zA-Z0-9_-]+\]/i, '').trim();
          }

          setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
          setLoading(false);
          return;
        }
      }

      // Offline intelligent simulation fallback
      await new Promise((resolve) => setTimeout(resolve, 600));
      const qLower = userQuery.toLowerCase();
      let fallbackReply = '';

      if (qLower.includes('quiet') || qLower.includes('silent') || qLower.includes('focus')) {
        fallbackReply =
          '🤫 **Floor 2 — Silent Focus Deck** is your best bet right now!\n\nIt is currently at **18 dB (whisper quiet)** with **42% occupancy** and plenty of individual window cubicles free.';
      } else if (qLower.includes('dsa') || qLower.includes('code') || qLower.includes('programming')) {
        const dsaSession = sessions.find(
          (s) => s.subject.toLowerCase().includes('dsa') || s.subject.toLowerCase().includes('cs')
        );
        if (dsaSession) {
          fallbackReply = `💻 There is an active group working on **${dsaSession.subject}** at **${dsaSession.location_name}** hosted by **${dsaSession.profiles?.full_name || 'a peer'}**! Click below to sync up with them.`;
        } else {
          fallbackReply =
            '💻 No active DSA groups right now, but **Floor 3 (Engineering Wing)** has strong WiFi and whiteboard tables ready for hosting your sprint!';
        }
      } else if (qLower.includes('crowd') || qLower.includes('least') || qLower.includes('empty')) {
        fallbackReply =
          '📊 **Floor 4 (Research Lab Desks)** is the least crowded right now with only **35% occupancy** and ultra-quiet acoustics (20 dB).';
      } else {
        fallbackReply = `✨ There are currently **${sessions.length} active sessions** on campus! **Floor 2** is optimal for individual deep work, while **Floor 1 Commons** is active for group collaborations.`;
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: fallbackReply }]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `💡 **Floor 2 (Silent Deck)** and **Floor 4 (Research Wing)** are currently optimal for studying! (${message})`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeChat(input);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/25">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-white headline-font tracking-tight flex items-center gap-1.5">
              StudySpot AI Copilot
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Campus Study Companion
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          Ready
        </div>
      </div>

      {/* Message Stream */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 min-h-[260px] max-h-[380px]">
        <AnimatePresence>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[92%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-md ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none font-medium'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-invert prose-xs max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start">
            <div className="bg-slate-900 p-3 rounded-2xl rounded-tl-none border border-slate-800 flex items-center gap-2.5">
              <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
              <span className="text-xs font-semibold text-slate-400">Copilot is analyzing campus spots...</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Suggested Prompt Chips */}
      <div className="px-4 py-2 bg-slate-950/40 border-t border-slate-800/60 overflow-x-auto no-scrollbar flex gap-1.5">
        {suggestedPrompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => handleSendPrompt(prompt)}
            disabled={loading}
            className="px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[11px] text-slate-400 hover:text-slate-200 font-medium whitespace-nowrap transition-colors flex items-center gap-1 shrink-0"
          >
            <Zap className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Field */}
      <div className="p-3 bg-slate-950/80 border-t border-slate-800">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Ask Copilot anything about campus..."
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2.5 pl-4 pr-12 text-xs sm:text-sm font-medium text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-1.5 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all shadow-md shadow-indigo-600/30 disabled:opacity-40 active:scale-95 flex items-center justify-center"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
