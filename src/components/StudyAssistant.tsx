import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface StudyAssistantProps {
  onJoinSession?: (session: any) => void;
}

export const StudyAssistant: React.FC<StudyAssistantProps> = ({ onJoinSession }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: "Hi! I'm StudySpot AI. Ask me what subjects are active right now or tell me where you want to study!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userQuery = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userQuery }]);
    setLoading(true);

    try {
      // 1. Fetch live sessions from Supabase
      const { data: sessions, error: dbError } = await supabase
        .from('sessions')
        .select('*, profiles(full_name)');

      if (dbError) throw new Error('Database Error: ' + dbError.message);

      // 2. Prepare prompt
      const systemPrompt = `You are StudySpot AI, a campus assistant for MIT-WPU students.
Your goal is to guide students to the best active study session based on their question.
Live Sessions JSON: ${JSON.stringify(sessions || [])}

Instructions:
1. If there are no sessions, inform the user it's quiet and suggest they host one.
2. If there's no match for their subject, tell them and suggest they host it.
3. If there is a match, tell them the 'location_name', 'subject', and host's name.
4. Keep it highly concise, friendly, and direct (max 2 short paragraphs). Use markdown.
5. EXTREMELY IMPORTANT: If the user explicitly asks to JOIN or GO TO a specific session in the list, you MUST append a special tag at the very end of your response exactly like this: [ACTION:JOIN:session_id_here]. Be sure to replace session_id_here with the actual UUID.`;

      // 3. Call Groq directly using the key from .env.local
      const apiKey = import.meta.env.VITE_RANDOM_HACK_KEY;
      if (!apiKey) throw new Error("VITE_RANDOM_HACK_KEY is missing from .env.local");

      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userQuery }
          ],
          temperature: 0.6,
          max_tokens: 300,
        }),
      });

      if (!groqRes.ok) {
        throw new Error(`Groq API Error: ${await groqRes.text()}`);
      }

      const groqData = await groqRes.json();
      let reply: string = groqData.choices[0].message.content;

      // Check for Join Action trigger
      const joinMatch = reply.match(/\[ACTION:JOIN:([a-f0-9-]+)\]/i);
      if (joinMatch && onJoinSession) {
        const targetId = joinMatch[1];
        const targetSession = sessions?.find(s => s.id === targetId);
        if (targetSession) {
          onJoinSession(targetSession);
        }
        // Remove the ugly tag from the user's view
        reply = reply.replace(/\[ACTION:JOIN:[a-f0-9-]+\]/i, '').trim();
      }

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `**Error:** ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <div className="p-6 border-b border-white/60 flex items-center gap-4 bg-white/40 backdrop-blur-md">
        <div className="p-3 bg-gradient-to-br from-primary to-secondary rounded-2xl shadow-lg shadow-primary/20">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-black text-sm text-on-surface flex items-center gap-2 headline-font uppercase tracking-tight">
            Study Guide AI <Sparkles className="w-3 h-3 text-amber-500" />
          </h3>
          <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-[0.2em] opacity-60">Adaptive Campus Assistant</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5 min-h-[300px] max-h-[450px]">
        <AnimatePresence>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div 
                className={`max-w-[90%] p-4 rounded-[1.5rem] text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-primary text-white rounded-tr-none shadow-md' 
                    : 'bg-white/60 text-on-surface border border-white/80 rounded-tl-none font-medium'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm prose-slate">
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
            <div className="bg-white/60 p-4 rounded-[1.5rem] rounded-tl-none border border-white/80 flex items-center gap-3">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
              <span className="text-xs font-bold text-on-surface-variant opacity-60 uppercase tracking-widest">Scanning campus...</span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-5 bg-white/40 backdrop-blur-md border-t border-white/60">
        <form onSubmit={handleSend} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Ask where to study..."
            className="w-full bg-white/60 border border-white/80 rounded-2xl py-4 pl-5 pr-14 text-sm font-medium text-on-surface focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-outline-variant disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 top-2 bottom-2 aspect-square bg-primary hover:bg-primary/90 text-white rounded-xl flex items-center justify-center transition-all shadow-lg shadow-primary/20 disabled:opacity-50 active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
