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
    <div className="flex flex-col h-full bg-neutral-800/30 backdrop-blur-sm border border-neutral-700/50 rounded-3xl overflow-hidden relative">
      <div className="p-4 border-b border-neutral-700/50 flex items-center gap-3 bg-neutral-800/80">
        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-white flex items-center gap-1">
            Study Guide AI <Sparkles className="w-3 h-3 text-yellow-400" />
          </h3>
          <p className="text-[10px] text-neutral-400 uppercase tracking-widest">Powered by Groq</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[400px]">
        <AnimatePresence>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div 
                className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-sm' 
                    : 'bg-neutral-700/50 text-neutral-200 border border-neutral-600/50 rounded-tl-sm'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-invert prose-sm">
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
            <div className="bg-neutral-700/50 p-3 rounded-2xl rounded-tl-sm border border-neutral-600/50 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
              <span className="text-xs text-neutral-400">Scanning campus...</span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-neutral-800/80 border-t border-neutral-700/50">
        <form onSubmit={handleSend} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="e.g., Take me to the engineering physics guys."
            className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-3 pl-4 pr-12 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-neutral-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all disabled:opacity-50 disabled:bg-neutral-700"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
