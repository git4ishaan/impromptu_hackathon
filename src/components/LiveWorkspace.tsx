import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { SeatMapper } from './SeatMapper';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { CheckCircle2, Plus, Trash2, MapPin, X, Loader2, Shield, Users, UserMinus, UserCheck, Bot, Send, Sparkles, Power, Library, Upload, FileText, File as FileIcon } from 'lucide-react';

interface Task {
  id: string;
  task_content: string;
  is_completed: boolean;
}

interface Session {
  id: string;
  subject: string;
  location_name: string;
  host_id: string;
  is_private?: boolean;
  duration_minutes?: number;
  created_at?: string;
  coordinates?: { x: number; y: number };
  profiles?: { full_name: string };
}

interface Member {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'kicked';
  profiles: { full_name: string };
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface LiveWorkspaceProps {
  session: Session;
  userId: string;
  onClose: () => void;
}

export const LiveWorkspace: React.FC<LiveWorkspaceProps> = ({ session, userId, onClose }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskContent, setNewTaskContent] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Access Control State
  const [memberStatus, setMemberStatus] = useState<'none' | 'pending' | 'approved' | 'kicked'>('none');
  const [members, setMembers] = useState<Member[]>([]);
  
  // Session AI Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: `Hi! I'm your **${session.subject}** study assistant. I can help you:\n- 📋 Create a study roadmap from your tasks\n- ❓ Generate sample exam questions\n- 💡 Explain any concept you're stuck on\n\nWhat do you need help with?` }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Shared Resource Stash
  interface SharedFile {
    name: string;
    url: string;
    textContent?: string; // extracted text for AI context
    size: number;
  }
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const isHost = session.host_id === userId;
  const requireApproval = session.is_private && !isHost;
  const isLockedOut = requireApproval && memberStatus !== 'approved';

  useEffect(() => {
    fetchTasks();
    fetchMembers();

    const taskSub = supabase
      .channel(`session_tasks:${session.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `session_id=eq.${session.id}` }, () => {
        fetchTasks();
      })
      .subscribe();

    const memberSub = supabase
      .channel(`session_members:${session.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_members', filter: `session_id=eq.${session.id}` }, () => {
        fetchMembers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(taskSub);
      supabase.removeChannel(memberSub);
    };
  }, [session.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  const fetchTasks = async () => {
    const { data } = await supabase.from('tasks').select('*').eq('session_id', session.id).order('created_at', { ascending: true });
    if (data) setTasks(data);
    setLoading(false);
  };

  const fetchMembers = async () => {
    const { data } = await supabase.from('session_members').select('*, profiles(full_name)').eq('session_id', session.id);
    if (data) {
      setMembers(data as Member[]);
      const me = data.find(m => m.user_id === userId);
      if (me) setMemberStatus(me.status);
      else setMemberStatus('none');
    }
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskContent.trim() || isLockedOut) return;
    const { error } = await supabase.from('tasks').insert({ session_id: session.id, task_content: newTaskContent.trim() });
    if (!error) setNewTaskContent('');
  };

  const toggleTask = async (task: Task) => {
    if (isLockedOut) return;
    await supabase.from('tasks').update({ is_completed: !task.is_completed }).eq('id', task.id);
  };

  const deleteTask = async (id: string) => {
    if (isLockedOut) return;
    await supabase.from('tasks').delete().eq('id', id);
  };

  const handleRequestJoin = async () => {
    console.log('[StudySpot] Requesting to join session:', session.id, 'as user:', userId);
    const { data, error } = await supabase
      .from('session_members')
      .upsert(
        { session_id: session.id, user_id: userId, status: 'pending' },
        { onConflict: 'session_id,user_id' }
      )
      .select();
    
    if (error) {
      console.error('[StudySpot] Join request FAILED:', error);
      alert('Failed to send request: ' + error.message);
    } else {
      console.log('[StudySpot] Join request SUCCESS:', data);
      setMemberStatus('pending');
    }
  };

  const updateMemberStatus = async (memberId: string, status: 'approved' | 'kicked') => {
    console.log('[StudySpot] Updating member:', memberId, 'to', status);
    const { error } = await supabase.from('session_members').update({ status }).eq('id', memberId);
    if (error) {
      console.error('[StudySpot] Update FAILED:', error);
      alert('Failed to update: ' + error.message);
    } else {
      console.log('[StudySpot] Update SUCCESS');
      fetchMembers();
    }
  };

  const deleteMember = async (memberId: string) => {
    const { error } = await supabase.from('session_members').delete().eq('id', memberId);
    if (error) {
      console.error('[StudySpot] Delete FAILED:', error);
    } else {
      fetchMembers();
    }
  };

  const handleEndSession = async () => {
    if (!confirm('Are you sure you want to end this session? This will remove it for everyone.')) return;
    console.log('[StudySpot] Ending session:', session.id);
    
    // Delete in order: tasks → members → session (respecting FK constraints)
    const { error: taskErr } = await supabase.from('tasks').delete().eq('session_id', session.id);
    if (taskErr) console.error('[StudySpot] Task delete failed:', taskErr);
    
    const { error: memberErr } = await supabase.from('session_members').delete().eq('session_id', session.id);
    if (memberErr) console.error('[StudySpot] Member delete failed:', memberErr);
    
    const { error: sessionErr } = await supabase.from('sessions').delete().eq('id', session.id);
    if (sessionErr) {
      console.error('[StudySpot] Session delete FAILED:', sessionErr);
      alert('Failed to end session: ' + sessionErr.message);
      return;
    }
    
    console.log('[StudySpot] Session ended successfully');
    onClose();
  };

  // Auto-expiry: check if the session has exceeded its duration
  useEffect(() => {
    if (!session.duration_minutes || !session.created_at) return;
    
    const checkExpiry = () => {
      const createdAt = new Date(session.created_at).getTime();
      const expiresAt = createdAt + (session.duration_minutes! * 60 * 1000);
      const now = Date.now();
      
      if (now >= expiresAt) {
        if (isHost) {
          alert('⏰ Time is up! This session has expired.');
          handleEndSession();
        } else {
          alert('⏰ This session has expired. Returning to dashboard.');
          onClose();
        }
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [session.duration_minutes]);

  // File Upload Handler
  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      // Use the bundled worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) { // Max 10 pages
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map((item: any) => item.str).join(' ') + '\n';
      }
      return fullText.slice(0, 4000);
    } catch (err) {
      console.error('[StudySpot] PDF parse error:', err);
      return '';
    }
  };

  const extractTextFromDocx = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value.slice(0, 4000);
    } catch (err) {
      console.error('[StudySpot] DOCX parse error:', err);
      return '';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      let textContent: string | undefined;

      // Extract text based on file type
      if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
        textContent = await file.text();
        if (textContent.length > 4000) textContent = textContent.slice(0, 4000) + '\n... [truncated]';
      } else if (file.name.endsWith('.pdf') || file.type === 'application/pdf') {
        textContent = await extractTextFromPDF(file);
        if (textContent) textContent += '\n... [extracted from PDF]';
      } else if (file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        textContent = await extractTextFromDocx(file);
        if (textContent) textContent += '\n... [extracted from Word doc]';
      }

      // Upload to Supabase Storage
      const filePath = `session-${session.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('session-files').upload(filePath, file);
      if (uploadError) {
        console.warn('[StudySpot] Storage upload failed (bucket may not exist):', uploadError.message);
      }

      const { data: urlData } = supabase.storage.from('session-files').getPublicUrl(filePath);

      const newFile: SharedFile = {
        name: file.name,
        url: urlData?.publicUrl || '#',
        textContent: textContent || undefined,
        size: file.size,
      };

      setSharedFiles(prev => [...prev, newFile]);
      if (textContent) {
        console.log(`[StudySpot] Scanned ${file.name}: ${textContent.length} chars extracted`);
      }
    } catch (err: any) {
      console.error('[StudySpot] File upload error:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Session AI Chat
  const handleChatSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userQuery = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userQuery }]);
    setChatLoading(true);

    try {
      const taskList = tasks.map(t => `${t.is_completed ? '✅' : '⬜'} ${t.task_content}`).join('\n');

      // Build file context from uploaded text files
      const fileContextParts = sharedFiles
        .filter(f => f.textContent)
        .map(f => `--- File: ${f.name} ---\n${f.textContent}`);
      const fileContext = fileContextParts.length > 0 
        ? `\n\nUploaded Study Materials:\n${fileContextParts.join('\n\n')}` 
        : '';

      const systemPrompt = `You are an AI study tutor embedded inside a live study session for "${session.subject}" at MIT-WPU.

Current Task List:
${taskList || '(No tasks added yet)'}${fileContext}

Your capabilities:
1. **Study Roadmap**: If asked, create a step-by-step study plan to complete the pending tasks efficiently.
2. **Sample Exam Questions**: Generate realistic exam questions for "${session.subject}" based on the tasks/topics listed.
3. **Concept Explanation**: If a student asks about a concept related to "${session.subject}", explain it clearly with examples.
4. **General Help**: Answer any study-related question about the subject.

Rules:
- Keep answers concise (max 3 short paragraphs).
- Use markdown formatting (bold, lists, code blocks where appropriate).
- Be encouraging and supportive.
- Focus specifically on "${session.subject}".`;

      const apiKey = import.meta.env.VITE_RANDOM_HACK_KEY;
      if (!apiKey) throw new Error("VITE_RANDOM_HACK_KEY is missing");

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
            ...chatMessages.slice(-6).map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userQuery }
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!groqRes.ok) throw new Error(`Groq Error: ${await groqRes.text()}`);

      const groqData = await groqRes.json();
      const reply = groqData.choices[0].message.content;
      setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: `**Error:** ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  // ---------------- GATEKEEPER VIEW ----------------
  if (isLockedOut) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 relative">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="glass-card p-10 max-w-md w-full text-center space-y-8 rounded-[2rem] relative z-10 shadow-2xl shadow-primary/10"
        >
          <div className="w-20 h-20 bg-primary/10 rounded-3xl mx-auto flex items-center justify-center border border-primary/20">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-black headline-font text-on-surface leading-tight">{session.subject}</h2>
            <p className="text-on-surface-variant mt-3 font-medium opacity-80">This is a private study session.</p>
          </div>
          
          {memberStatus === 'none' && (
            <button 
              onClick={handleRequestJoin} 
              className="w-full py-4 tonal-gradient-btn font-bold rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all headline-font"
            >
              Request to Join
            </button>
          )}
          {memberStatus === 'pending' && (
            <div className="p-5 bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <p className="font-bold text-primary headline-font">Waiting for Host Approval...</p>
            </div>
          )}
          {memberStatus === 'kicked' && (
            <div className="p-5 bg-red-500/10 rounded-2xl border border-red-500/20 text-red-600 font-bold headline-font">
              You cannot join this session right now.
            </div>
          )}

          <button onClick={onClose} className="text-sm font-bold text-on-surface-variant hover:text-primary transition-colors uppercase tracking-widest opacity-60">
            Back to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  // ---------------- MAIN WORKSPACE VIEW ----------------
  return (
    <div className="flex-1 flex flex-col relative z-10 pb-20">
      {/* Top Header Card */}
      <div className="px-6 pt-6">
        <div className="glass-card rounded-[2rem] px-8 py-5 flex items-center justify-between shadow-xl shadow-primary/5">
          <div className="flex items-center gap-5">
            <div className={`p-4 rounded-3xl ${session.is_private ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
              {session.is_private ? <Shield className="w-7 h-7" /> : <CheckCircle2 className="w-7 h-7" />}
            </div>
            <div>
              <h2 className="text-3xl font-black headline-font text-on-surface flex items-center gap-3 leading-tight">
                {session.subject}
                {session.is_private && <span className="text-[10px] px-2.5 py-1 bg-indigo-500/10 text-indigo-500 rounded-full border border-indigo-500/20 uppercase tracking-[0.2em] font-black">Private</span>}
              </h2>
              <p className="text-sm font-bold text-on-surface-variant opacity-60 flex items-center gap-1.5 mt-1 headline-font">
                <MapPin className="w-3.5 h-3.5" /> 
                <span className="uppercase tracking-widest">{session.location_name}</span>
                {session.duration_minutes && (
                  <>
                    <span className="opacity-30 inline-block w-1 h-1 rounded-full bg-on-surface mx-1"></span>
                    <span className="flex items-center gap-1">⏱️ {session.duration_minutes} min limit</span>
                  </>
                )}
              </p>
            </div>
          </div>
          {isHost && (
            <button 
              onClick={handleEndSession}
              className="flex items-center gap-2 px-6 py-3 bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white border border-red-500/20 rounded-2xl text-sm font-black transition-all active:scale-95 headline-font uppercase tracking-widest"
            >
              <Power className="w-4 h-4" />
              End Session
            </button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full px-6 mt-4">
        <div className="bg-neutral-800/30 border border-neutral-800 rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-emerald-400" /> Session Progress
            </span>
            <span className="text-xs font-black text-white">
              {tasks.length > 0 ? Math.round((tasks.filter(t => t.is_completed).length / tasks.length) * 100) : 0}%
            </span>
          </div>
          <div className="h-3 bg-neutral-900 rounded-full border border-neutral-800 overflow-hidden p-0.5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${tasks.length > 0 ? (tasks.filter(t => t.is_completed).length / tasks.length * 100) : 0}%` }}
              className="h-full bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-neutral-500 font-medium">
             <span>{tasks.filter(t => t.is_completed).length} Tasks Completed</span>
             <span>{tasks.length} Total Goals</span>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full grid gap-8 md:grid-cols-12">
        {/* LEFT COLUMN: Tasks */}
        <div className="md:col-span-5 space-y-8">
          <div className="glass-card rounded-[2.5rem] p-8 shadow-2xl shadow-primary/5">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-black headline-font text-on-surface uppercase tracking-tight">
                   Shared Tasks
                </h3>
                <span className="px-2.5 py-1 bg-primary/10 text-primary font-black text-[10px] rounded-lg tracking-[0.2em] border border-primary/20">LIVE</span>
              </div>
            </div>

            <form onSubmit={addTask} className="mb-10 relative">
              <input 
                type="text"
                placeholder="Add a study task..."
                className="w-full bg-white/40 border border-white/80 rounded-2xl py-5 px-6 pr-16 text-on-surface text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-outline-variant shadow-sm"
                value={newTaskContent}
                onChange={(e) => setNewTaskContent(e.target.value)}
              />
              <button 
                type="submit"
                className="absolute right-2 top-2 bottom-2 aspect-square bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl flex items-center justify-center transition-all shadow-xl shadow-emerald-500/30 active:scale-90"
              >
                <Plus className="w-6 h-6" />
              </button>
            </form>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {loading ? (
                <div className="flex justify-center p-12">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : tasks.length === 0 ? (
                <p className="text-center text-on-surface-variant py-12 text-sm font-medium italic opacity-60">No goals set for this session yet.</p>
              ) : (
                tasks.map((task) => (
                  <motion.div 
                    layout
                    key={task.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center justify-between p-4 bg-white/40 border border-white/60 rounded-2xl hover:border-primary/30 transition-all group shadow-sm"
                  >
                    <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => toggleTask(task)}>
                      <div className={`w-6 h-6 flex items-center justify-center rounded-lg border-2 transition-all ${
                        task.is_completed 
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600' 
                          : 'border-outline-variant group-hover:border-primary'
                      }`}>
                        {task.is_completed && <CheckCircle2 className="w-4 h-4" />}
                      </div>
                      <span className={`text-sm font-bold headline-font transition-all ${task.is_completed ? 'text-on-surface-variant line-through opacity-50' : 'text-on-surface'}`}>{task.task_content}</span>
                    </div>
                    <button onClick={() => deleteTask(task.id)} className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-red-400 rounded-xl transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: AI Tutor Chat */}
        <div className="md:col-span-4">
          <div className="glass-card rounded-[2.5rem] shadow-2xl shadow-primary/5 flex flex-col h-[650px] overflow-hidden">
            <div className="p-6 border-b border-white/60 flex items-center gap-4 bg-white/40 backdrop-blur-md">
              <div className="p-3 bg-gradient-to-br from-primary to-secondary rounded-2xl shadow-lg shadow-primary/20">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-black text-sm text-on-surface flex items-center gap-2 headline-font uppercase tracking-tight">
                  AI Tutor <Sparkles className="w-3 h-3 text-amber-500" />
                </h3>
                <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-[0.2em] opacity-60">Personal Study Helper</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <AnimatePresence>
                {chatMessages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div 
                      className={`max-w-[90%] p-4 rounded-[1.5rem] text-sm leading-relaxed shadow-sm ${
                        msg.role === 'user' 
                          ? 'bg-primary text-white rounded-tr-none' 
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
              
              {chatLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start">
                  <div className="bg-white/60 p-4 rounded-[1.5rem] rounded-tl-none border border-white/80 flex items-center gap-3">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    <span className="text-xs font-bold text-on-surface-variant opacity-60 uppercase tracking-widest">Thinking...</span>
                  </div>
                </motion.div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-5 bg-white/40 backdrop-blur-md border-t border-white/60">
              <form onSubmit={handleChatSend} className="relative">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={chatLoading}
                  placeholder="Ask a question..."
                  className="w-full bg-white/60 border border-white/80 rounded-2xl py-4 pl-5 pr-14 text-sm font-medium text-on-surface focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-outline-variant disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || chatLoading}
                  className="absolute right-2 top-2 bottom-2 aspect-square bg-primary hover:bg-primary/90 text-white rounded-xl flex items-center justify-center transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:bg-surface-variant active:scale-90"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar">
                <button onClick={() => { setChatInput('Generate sample exam questions'); }} className="whitespace-nowrap text-[10px] px-3 py-1.5 bg-white/60 border border-white/80 hover:bg-white text-on-surface-variant font-bold rounded-full transition-all uppercase tracking-widest">
                  📝 Exam Qs
                </button>
                <button onClick={() => { setChatInput('Create a study roadmap from my tasks'); }} className="whitespace-nowrap text-[10px] px-3 py-1.5 bg-white/60 border border-white/80 hover:bg-white text-on-surface-variant font-bold rounded-full transition-all uppercase tracking-widest">
                  🗺️ Roadmap
                </button>
                <button onClick={() => { setChatInput('Explain the key concepts'); }} className="whitespace-nowrap text-[10px] px-3 py-1.5 bg-white/60 border border-white/80 hover:bg-white text-on-surface-variant font-bold rounded-full transition-all uppercase tracking-widest">
                  💡 Explain
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sidebar Widgets */}
        <div className="md:col-span-3 space-y-8">
          {/* Location & Map Widget */}
          <div className="glass-card rounded-[2.5rem] p-6 shadow-2xl shadow-primary/5 overflow-hidden">
            <h3 className="text-xs font-black text-on-surface-variant mb-6 uppercase tracking-[0.2em] flex items-center gap-3 opacity-60 headline-font">
              <MapPin className="w-4 h-4 text-primary" /> Location
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-white/40 rounded-2xl border border-white/80 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Library className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-on-surface headline-font">MIT-WPU Central Library</p>
                  <p className="text-[11px] font-bold text-on-surface-variant mt-1 opacity-60 uppercase tracking-widest leading-relaxed">
                    {session.location_name}
                  </p>
                </div>
              </div>

              <div 
                className="rounded-2xl border border-white/80 overflow-hidden relative group cursor-pointer hover:border-primary/50 transition-all shadow-sm"
                onClick={() => setShowMapModal(true)}
              >
                <div className="scale-[0.55] origin-top-left -mb-[45%]">
                  <SeatMapper 
                    readonly 
                    pins={session.coordinates ? [{ ...session.coordinates, label: 'YOU ARE HERE' }] : []}
                  />
                </div>
                {!session.coordinates && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center p-4 text-center">
                    <p className="text-xs font-bold text-on-surface-variant italic opacity-60">No map location pinned.</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="text-[10px] font-black text-white bg-primary px-4 py-2 rounded-full shadow-xl uppercase tracking-widest"> 
                    Expand Map
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Fullscreen Map Modal */}
          <AnimatePresence>
            {showMapModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-on-surface/20 backdrop-blur-xl flex items-center justify-center p-8"
                onClick={() => setShowMapModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="glass-card rounded-[3rem] shadow-[0_30px_60px_-15px_rgba(74,64,224,0.3)] max-w-4xl w-full overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-8 border-b border-white/60 flex items-center justify-between bg-white/40">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                        <MapPin className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-on-surface headline-font">Campus Floor Plan</h3>
                        <p className="text-sm font-bold text-on-surface-variant opacity-60 uppercase tracking-widest">{session.location_name}</p>
                      </div>
                    </div>
                    <button onClick={() => setShowMapModal(false)} className="w-12 h-12 flex items-center justify-center bg-white/60 hover:bg-white text-on-surface-variant hover:text-red-500 rounded-2xl transition-all active:scale-90">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="p-10 flex justify-center bg-white/20">
                    <div className="p-1 bg-white ring-1 ring-white/20 rounded-3xl shadow-inner">
                      <SeatMapper 
                        readonly 
                        pins={session.coordinates ? [{ ...session.coordinates, label: session.subject + ' — YOU ARE HERE' }] : []}
                      />
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Host Moderation Panel */}
          {isHost && (
            <div className="glass-card rounded-[2.5rem] p-8 shadow-2xl shadow-primary/5">
               <h3 className="text-xs font-black text-primary mb-6 uppercase tracking-[0.2em] flex items-center gap-3 headline-font">
                 <Shield className="w-4 h-4" /> Management
               </h3>
               
               <div className="space-y-6">
                 {members.filter(m => m.status === 'pending').length > 0 && (
                   <div className="space-y-3">
                     <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] opacity-60">Pending Requests</p>
                     {members.filter(m => m.status === 'pending').map(m => (
                       <div key={m.id} className="flex items-center justify-between p-4 bg-white/40 rounded-2xl border border-white/80 shadow-sm">
                         <span className="text-sm font-bold headline-font">{m.profiles?.full_name || 'Anonymous'}</span>
                         <div className="flex gap-2">
                           <button 
                             onClick={() => updateMemberStatus(m.id, 'approved')} 
                             className="p-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl transition-all active:scale-90 shadow-lg shadow-emerald-500/20"
                             title="Approve"
                           >
                             <UserCheck className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => deleteMember(m.id)} 
                             className="p-2 bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white rounded-xl transition-all active:scale-90"
                             title="Decline"
                           >
                             <X className="w-4 h-4" />
                           </button>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}

                 <div className="space-y-3">
                   <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] opacity-60">Active Members</p>
                   {members.filter(m => m.status === 'approved').map(m => (
                     <div key={m.id} className="flex items-center justify-between p-3 bg-white/40 rounded-2xl border border-white/60">
                       <span className="text-sm font-bold text-on-surface-variant headline-font">{m.profiles?.full_name || 'Anonymous'}</span>
                       <button onClick={() => updateMemberStatus(m.id, 'kicked')} className="p-2 bg-red-500/10 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all" title="Kick user">
                         <UserMinus className="w-4 h-4" />
                       </button>
                     </div>
                   ))}
                   {members.filter(m => m.status === 'approved').length === 0 && <p className="text-xs font-bold text-on-surface-variant italic opacity-40">No members yet.</p>}
                 </div>
               </div>
            </div>
          )}

          {/* People in Session Widget */}
          <div className="glass-card rounded-[2.5rem] p-8 shadow-2xl shadow-primary/5">
            <h3 className="text-xs font-black text-on-surface-variant mb-6 uppercase tracking-[0.2em] flex items-center gap-3 opacity-60 headline-font">
              <Users className="w-4 h-4 text-emerald-500" /> Students
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-4 p-3 bg-white/40 rounded-2xl border border-white/80 shadow-sm relative overflow-hidden group">
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-container rounded-full flex items-center justify-center text-xs font-black text-white shadow-lg relative z-10">
                  {session.profiles?.full_name?.[0]?.toUpperCase() || 'H'}
                </div>
                <div className="relative z-10">
                  <span className="text-sm font-black text-on-surface headline-font block">{session.profiles?.full_name || 'Host'}</span>
                  <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Session Host</span>
                </div>
              </div>
              {members.filter(m => m.status === 'approved').map(m => (
                <div key={m.id} className="flex items-center gap-4 p-3 bg-white/40 rounded-2xl border border-white/60 shadow-sm">
                  <div className="w-10 h-10 bg-gradient-to-br from-secondary to-secondary-container rounded-full flex items-center justify-center text-xs font-black text-white shadow-lg">
                    {(m.profiles?.full_name || 'A')[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-bold text-on-surface-variant headline-font">{m.profiles?.full_name || 'Anonymous'}</span>
                  <div className="ml-auto flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  </div>
                </div>
              ))}
              {members.filter(m => m.status === 'approved').length === 0 && (
                <p className="text-xs font-bold text-on-surface-variant italic opacity-40 text-center py-2">Working alone...</p>
              )}
            </div>
          </div>

          {/* Shared Resource Stash */}
          <div className="glass-card rounded-[2.5rem] p-8 shadow-2xl shadow-primary/5">
            <h3 className="text-xs font-black text-amber-600 mb-6 uppercase tracking-[0.2em] flex items-center gap-3 headline-font">
              <FileText className="w-4 h-4" /> Resources
            </h3>
            
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".txt,.md,.csv,.pdf,.docx,.png,.jpg,.jpeg"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-3 py-4 bg-white/40 hover:bg-white/80 border-2 border-dashed border-amber-500/30 hover:border-amber-500/60 rounded-2xl text-sm font-black text-amber-700 transition-all mb-6 disabled:opacity-50 active:scale-95 headline-font uppercase tracking-widest"
            >
              {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
              {uploading ? 'Scanning...' : 'Upload Notes'}
            </button>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {sharedFiles.length === 0 ? (
                <p className="text-xs font-bold text-on-surface-variant italic text-center py-4 opacity-40">No shared resources yet.</p>
              ) : (
                sharedFiles.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 bg-white/40 rounded-2xl border border-white/80 group hover:border-amber-500/30 transition-all shadow-sm">
                    <div className={`p-2.5 rounded-xl ${f.textContent ? 'bg-amber-500/10 text-amber-600' : 'bg-surface-variant/20 text-on-surface-variant'}`}>
                      {f.textContent ? <FileText className="w-5 h-5" /> : <FileIcon className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-on-surface truncate headline-font">{f.name}</p>
                      <p className="text-[10px] font-bold text-on-surface-variant opacity-60 uppercase tracking-widest mt-1">
                        {(f.size / 1024).toFixed(1)} KB
                        {f.textContent && <span className="text-amber-600 ml-2">• AI Scanned</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => setSharedFiles(prev => prev.filter((_, i) => i !== idx))}
                      className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-red-500 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>


      <footer className="p-6 border-t border-white/60 text-center text-[10px] text-on-surface-variant font-bold uppercase tracking-[0.2em] bg-white/40 backdrop-blur-md flex items-center justify-center gap-3">
        <Users className="w-3.5 h-3.5 text-primary" /> Synced securely via Supabase (MIT-WPU Floor Plan Hub)
      </footer>
    </div>
  );
};
