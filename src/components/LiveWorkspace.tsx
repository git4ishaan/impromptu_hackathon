import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { SeatMapper } from './SeatMapper';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  CheckCircle2, Plus, Trash2, MapPin, X, Loader2, Shield, Users, 
  UserMinus, UserCheck, Bot, Send, Sparkles, Power, Library, Upload, 
  FileText, File as FileIcon, ArrowLeft, Clock, Compass
} from 'lucide-react';

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
  session_id: string;
  status: 'pending' | 'approved' | 'kicked';
  profiles?: { full_name: string };
}

interface LiveWorkspaceProps {
  session: Session;
  userId: string;
  onClose: () => void;
}

interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const LiveWorkspace: React.FC<LiveWorkspaceProps> = ({ session, userId, onClose }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskContent, setNewTaskContent] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Access Control State
  const [memberStatus, setMemberStatus] = useState<string>('none');
  const [members, setMembers] = useState<Member[]>([]);
  
  // Session AI Chat State
  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>([
    {
      role: 'assistant',
      content: `Hello! I'm your AI study partner for **${session.subject}**. How can I help with your session today?`,
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showMapModal, setShowMapModal] = useState(false);

  // Document Upload State
  interface SharedFile {
    name: string;
    size: number;
    url?: string;
    textContent?: string;
  }
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const isHost = session.host_id === userId;
  const requireApproval = session.is_private && !isHost;
  const isLockedOut = requireApproval && memberStatus !== 'approved';

  const fetchTasks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: true });
      if (!error && data) setTasks(data);
    } catch (err) {
      console.error('[StudySpot] Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [session.id]);

  const fetchMembers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('session_members')
        .select('*, profiles(full_name)')
        .eq('session_id', session.id);
      if (!error && data) {
        setMembers(data as Member[]);
        const me = data.find(m => m.user_id === userId);
        if (me) setMemberStatus(me.status);
        else setMemberStatus('none');
      }
    } catch (err) {
      console.error('[StudySpot] Error fetching members:', err);
    }
  }, [session.id, userId]);

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
  }, [session.id, fetchTasks, fetchMembers]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [chatMessages, chatLoading]);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskContent.trim() || isLockedOut) return;

    const { error } = await supabase.from('tasks').insert({ session_id: session.id, task_content: newTaskContent.trim() });
    if (!error) {
      setNewTaskContent('');
      fetchTasks();
    }
  };

  const toggleTask = async (task: Task) => {
    if (isLockedOut) return;
    await supabase.from('tasks').update({ is_completed: !task.is_completed }).eq('id', task.id);
    fetchTasks();
  };

  const deleteTask = async (id: string) => {
    if (isLockedOut) return;
    await supabase.from('tasks').delete().eq('id', id);
    fetchTasks();
  };

  const handleRequestJoin = async () => {
    const { data, error } = await supabase
      .from('session_members')
      .upsert(
        { session_id: session.id, user_id: userId, status: 'pending' },
        { onConflict: 'session_id,user_id' }
      )
      .select();
    
    if (error) {
      alert('Failed to send request: ' + error.message);
    } else if (data) {
      setMemberStatus('pending');
      fetchMembers();
    }
  };

  const updateMemberStatus = async (memberId: string, status: 'approved' | 'kicked') => {
    const { error } = await supabase.from('session_members').update({ status }).eq('id', memberId);
    if (error) {
      alert('Failed to update: ' + error.message);
    } else {
      fetchMembers();
    }
  };

  const deleteMember = async (memberId: string) => {
    const { error } = await supabase.from('session_members').delete().eq('id', memberId);
    if (!error) {
      fetchMembers();
    }
  };

  const handleEndSession = useCallback(async () => {
    if (!confirm('Are you sure you want to end this session? This will remove it for everyone.')) return;
    
    const { error: taskErr } = await supabase.from('tasks').delete().eq('session_id', session.id);
    if (taskErr) console.error('[StudySpot] Task delete failed:', taskErr);
    
    const { error: memberErr } = await supabase.from('session_members').delete().eq('session_id', session.id);
    if (memberErr) console.error('[StudySpot] Member delete failed:', memberErr);
    
    const { error: sessionErr } = await supabase.from('sessions').delete().eq('id', session.id);
    if (sessionErr) {
      alert('Failed to end session: ' + sessionErr.message);
      return;
    }
    
    onClose();
  }, [session.id, onClose]);

  // File Upload Handler
  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map((item: unknown) => (item as { str?: string }).str || '').join(' ') + '\n';
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

      const filePath = `session-${session.id}/${Date.now()}-${file.name}`;
      await supabase.storage.from('session-files').upload(filePath, file);
      const { data: urlData } = supabase.storage.from('session-files').getPublicUrl(filePath);

      const newFile: SharedFile = {
        name: file.name,
        url: urlData?.publicUrl || '#',
        textContent: textContent || undefined,
        size: file.size,
      };

      setSharedFiles(prev => [...prev, newFile]);
    } catch (err: unknown) {
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
      const fileContextParts = sharedFiles
        .filter(f => f.textContent)
        .map(f => `--- File: ${f.name} ---\n${f.textContent}`);
      const fileContext = fileContextParts.length > 0
        ? `\n\nUploaded Study Materials & Notes:\n${fileContextParts.join('\n\n')}`
        : '';

      const systemPrompt = `You are a dedicated AI study tutor for an active study group at MIT-WPU.
Current Subject: "${session.subject}"
Location: ${session.location_name}
${session.duration_minutes ? `Session Duration: ${session.duration_minutes} minutes` : ''}

Live Task Checklist for this session:
${taskList || '(No tasks added yet)'}
${fileContext}

Instructions:
1. Help explain concepts, solve problems, create roadmaps, or generate sample exam questions based on the tasks and notes above.
2. Keep explanations clear, structured, and helpful using Markdown.
3. Be encouraging and concise.`;

      const apiKey = import.meta.env.VITE_RANDOM_HACK_KEY;

      if (apiKey && !apiKey.includes('placeholder')) {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'groq/compound-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              ...chatMessages.slice(-6).map(m => ({ role: m.role, content: m.content })),
              { role: 'user', content: userQuery }
            ],
            temperature: 0.6,
            max_tokens: 500,
          }),
        });

        if (!groqRes.ok) {
          const errText = await groqRes.text();
          throw new Error(`Groq API Error: ${errText}`);
        }

        const groqData = await groqRes.json();
        const reply = groqData.choices[0].message.content;
        setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      } else {
        await new Promise(r => setTimeout(r, 800));
        let fallbackReply = `Here are some recommendations for **${session.subject}**:\n\n1. **Focus Area**: Break your current checklist into 25-minute Pomodoro sprints.\n2. **Review**: Check off tasks as you complete them to track live group progress!`;
        if (userQuery.toLowerCase().includes('exam') || userQuery.toLowerCase().includes('question')) {
          fallbackReply = `### 📝 Practice Concept Question for ${session.subject}\n\n**Q:** Explain the core fundamental principles of this topic and list two real-world engineering applications.\n\n*Try writing down your thoughts or explaining them out loud!*`;
        }
        setChatMessages(prev => [...prev, { role: 'assistant', content: fallbackReply }]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Chat error';
      setChatMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Error connecting to AI tutor (${message}).`,
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Locked out screen for private sessions
  if (isLockedOut) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 min-h-[70vh]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl backdrop-blur-xl"
        >
          <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto border border-indigo-500/20">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white headline-font tracking-tight">{session.subject}</h2>
            <p className="text-xs font-semibold text-slate-400 mt-1">This is a private study session hosted at {session.location_name}.</p>
          </div>

          {memberStatus === 'none' && (
            <button 
              onClick={handleRequestJoin} 
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-95 text-xs uppercase tracking-widest"
            >
              Request to Join Session
            </button>
          )}
          {memberStatus === 'pending' && (
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-center gap-3 text-indigo-400 text-xs font-bold">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Waiting for Host Approval...</span>
            </div>
          )}
          {memberStatus === 'kicked' && (
            <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20 text-red-400 text-xs font-bold">
              You cannot join this session right now.
            </div>
          )}

          <button onClick={onClose} className="text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-wider">
            Back to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  const completedCount = tasks.filter(t => t.is_completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  // ---------------- MAIN CLEAN WORKSPACE VIEW ----------------
  return (
    <div className="flex-1 flex flex-col relative z-10 pb-16 space-y-6">
      {/* 1. TOP NAV / ACTION BAR */}
      <div className="sticky top-3 z-40 mx-4 sm:mx-6 mt-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3 min-w-0">
            <button 
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all shrink-0"
              title="Back to Campus"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black headline-font tracking-tight text-white truncate">
                  {session.subject}
                </h1>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Room
                </span>
                {session.is_private && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 uppercase tracking-widest">
                    Private
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 font-medium mt-0.5">
                <span className="flex items-center gap-1 text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                  {session.location_name}
                </span>
                {session.duration_minutes && (
                  <span className="flex items-center gap-1 text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {session.duration_minutes} min duration
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {isHost && (
              <button 
                onClick={handleEndSession}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-red-500/15 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 rounded-xl text-xs font-bold transition-all active:scale-95"
              >
                <Power className="w-3.5 h-3.5" />
                <span>End Session</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all active:scale-95"
            >
              Exit
            </button>
          </div>
        </div>
      </div>

      {/* 2. SUB-HEADER COMPACT PROGRESS BAR */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-slate-400 font-semibold w-full sm:w-auto">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Goal Checklist Progress</span>
            <span className="text-white font-extrabold ml-1">
              {completedCount} / {tasks.length} Done ({progressPercent}%)
            </span>
          </div>
          <div className="w-full sm:w-72 h-2.5 bg-slate-950 rounded-full border border-slate-800 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              className="h-full bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-500 rounded-full"
              transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            />
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE 3-COLUMN GRID */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Tasks & Goals (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900/85 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h3 className="font-extrabold text-sm text-white headline-font uppercase tracking-wide">
                  Shared Tasks
                </h3>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {tasks.length} {tasks.length === 1 ? 'Goal' : 'Goals'}
              </span>
            </div>

            {/* Quick Add Form */}
            <form onSubmit={addTask} className="relative">
              <input 
                type="text"
                placeholder="Add a checklist task..."
                className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl py-3 pl-4 pr-12 text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all placeholder:text-slate-500"
                value={newTaskContent}
                onChange={(e) => setNewTaskContent(e.target.value)}
              />
              <button 
                type="submit"
                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center justify-center transition-all shadow-md shadow-indigo-600/30 active:scale-95"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>

            {/* Task Item List */}
            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
              {loading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-800 rounded-2xl p-4">
                  <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-medium">No tasks set for this session yet.</p>
                  <p className="text-[10px] text-slate-500 mt-1">Add key items to keep everyone aligned.</p>
                </div>
              ) : (
                tasks.map((task) => (
                  <motion.div 
                    layout
                    key={task.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800/90 hover:border-slate-700 transition-all group"
                  >
                    <div className="flex items-center gap-3 cursor-pointer flex-1 min-w-0" onClick={() => toggleTask(task)}>
                      <div className={`w-5 h-5 flex items-center justify-center rounded-md border transition-all shrink-0 ${
                        task.is_completed 
                          ? 'bg-emerald-500 text-slate-950 border-emerald-500' 
                          : 'border-slate-700 hover:border-indigo-400 bg-slate-900'
                      }`}>
                        {task.is_completed && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <span className={`text-xs font-semibold truncate transition-all ${
                        task.is_completed 
                          ? 'text-slate-500 line-through' 
                          : 'text-slate-200'
                      }`}>
                        {task.task_content}
                      </span>
                    </div>
                    <button 
                      onClick={() => deleteTask(task.id)} 
                      className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/15 text-slate-500 hover:text-red-400 rounded-lg transition-all"
                      title="Delete Task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: AI Tutor Chat (5 cols) */}
        <div className="lg:col-span-5">
          <div className="bg-slate-900/85 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl flex flex-col h-[580px]">
            {/* AI Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl shadow-md shadow-indigo-600/30">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white headline-font flex items-center gap-1.5">
                    StudySpot AI Tutor
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Context-Aware Companion
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 uppercase tracking-widest">
                AI Active
              </span>
            </div>

            {/* Message Stream */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              <AnimatePresence>
                {chatMessages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div 
                      className={`max-w-[92%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                        msg.role === 'user' 
                          ? 'bg-indigo-600 text-white rounded-tr-none font-medium' 
                          : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none font-normal'
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
              
              {chatLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start">
                  <div className="bg-slate-950 p-3 rounded-2xl rounded-tl-none border border-slate-800 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                    <span className="text-[11px] font-semibold text-slate-400">Tutor is drafting response...</span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Prompt Chips & Input */}
            <div className="border-t border-slate-800 bg-slate-950/80 p-3 space-y-2">
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                <button 
                  onClick={() => { setChatInput('Generate 3 practice exam questions for this session'); }} 
                  className="whitespace-nowrap text-[10px] px-2.5 py-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-semibold rounded-lg transition-all"
                >
                  📝 Practice Qs
                </button>
                <button 
                  onClick={() => { setChatInput('Create a step-by-step study roadmap from our task list'); }} 
                  className="whitespace-nowrap text-[10px] px-2.5 py-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-semibold rounded-lg transition-all"
                >
                  🗺️ Roadmap
                </button>
                <button 
                  onClick={() => { setChatInput('Explain the key fundamental concepts we need to know'); }} 
                  className="whitespace-nowrap text-[10px] px-2.5 py-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-semibold rounded-lg transition-all"
                >
                  💡 Core Concepts
                </button>
                <button 
                  onClick={() => { setChatInput('Summarize the main takeaways from our study session'); }} 
                  className="whitespace-nowrap text-[10px] px-2.5 py-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-semibold rounded-lg transition-all"
                >
                  📄 Summary
                </button>
              </div>

              <form onSubmit={handleChatSend} className="relative flex items-center">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={chatLoading}
                  placeholder="Ask a question or explain a concept..."
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2.5 pl-3.5 pr-11 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || chatLoading}
                  className="absolute right-1.5 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all disabled:opacity-40 active:scale-90"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Unified Sidebar (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* 1. Location & Interactive Blueprint */}
          <div className="bg-slate-900/85 border border-slate-800 rounded-3xl p-5 shadow-2xl backdrop-blur-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-indigo-400" /> Location Pin
              </h4>
              <button 
                onClick={() => setShowMapModal(true)} 
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider"
              >
                Expand
              </button>
            </div>

            <div 
              className="rounded-2xl border border-slate-800 overflow-hidden relative group cursor-pointer hover:border-indigo-500/40 transition-all bg-slate-950 h-36"
              onClick={() => setShowMapModal(true)}
            >
              <SeatMapper 
                readonly 
                pins={session.coordinates ? [{ ...session.coordinates, label: session.subject }] : []}
              />
              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-[10px] font-bold text-white bg-indigo-600 px-3 py-1.5 rounded-lg shadow-lg">
                  View Full Map
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 font-semibold truncate flex items-center gap-1">
              <Library className="w-3 h-3 text-slate-500 shrink-0" />
              {session.location_name}
            </p>
          </div>

          {/* 2. Students in Session & Requests */}
          <div className="bg-slate-900/85 border border-slate-800 rounded-3xl p-5 shadow-2xl backdrop-blur-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" /> Students
              </h4>
              <span className="text-[10px] text-slate-500 font-semibold">
                {1 + members.filter(m => m.status === 'approved').length} Active
              </span>
            </div>

            {/* Host item */}
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              <div className="flex items-center gap-3 p-2.5 bg-slate-950/70 rounded-xl border border-slate-800/80">
                <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0">
                  {session.profiles?.full_name?.[0]?.toUpperCase() || 'H'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">{session.profiles?.full_name || 'Host'}</p>
                  <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest">Session Host</p>
                </div>
              </div>

              {/* Approved Members */}
              {members.filter(m => m.status === 'approved').map(m => (
                <div key={m.id} className="flex items-center justify-between gap-2 p-2.5 bg-slate-950/70 rounded-xl border border-slate-800/80">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 bg-slate-800 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-300 shrink-0">
                      {(m.profiles?.full_name || 'A')[0].toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-slate-300 truncate">{m.profiles?.full_name || 'Anonymous'}</span>
                  </div>
                  {isHost && (
                    <button 
                      onClick={() => updateMemberStatus(m.id, 'kicked')} 
                      className="p-1 hover:bg-red-500/15 text-slate-500 hover:text-red-400 rounded-md transition-colors" 
                      title="Kick student"
                    >
                      <UserMinus className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}

              {/* Host pending moderation requests */}
              {isHost && members.filter(m => m.status === 'pending').map(m => (
                <div key={m.id} className="flex items-center justify-between gap-2 p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
                  <span className="text-xs font-bold text-indigo-300 truncate">{m.profiles?.full_name || 'Anonymous'}</span>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => updateMemberStatus(m.id, 'approved')} 
                      className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-all"
                      title="Approve"
                    >
                      <UserCheck className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => deleteMember(m.id)} 
                      className="p-1 bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white rounded-md transition-all"
                      title="Decline"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Shared Notes & Uploads */}
          <div className="bg-slate-900/85 border border-slate-800 rounded-3xl p-5 shadow-2xl backdrop-blur-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" /> Shared Notes
              </h4>
              <span className="text-[10px] text-slate-500 font-semibold">{sharedFiles.length} files</span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".txt,.md,.csv,.pdf,.docx"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-950 hover:bg-slate-800 border border-dashed border-slate-700 hover:border-indigo-500 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-indigo-400" />}
              <span>{uploading ? 'Scanning Text...' : 'Upload Notes / PDF'}</span>
            </button>

            {/* File List */}
            <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
              {sharedFiles.length === 0 ? (
                <p className="text-[11px] text-slate-500 text-center py-2">No notes shared yet.</p>
              ) : (
                sharedFiles.map((f, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 p-2 bg-slate-950/70 border border-slate-800 rounded-xl group">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="text-xs text-slate-300 truncate font-medium">{f.name}</span>
                    </div>
                    <button
                      onClick={() => setSharedFiles(prev => prev.filter((_, i) => i !== idx))}
                      className="p-1 opacity-0 group-hover:opacity-100 hover:text-red-400 text-slate-500 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Fullscreen Map Modal */}
      <AnimatePresence>
        {showMapModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4 sm:p-8"
            onClick={() => setShowMapModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-white headline-font">Campus Blueprint Coordinates</h3>
                    <p className="text-xs text-slate-400 font-semibold">{session.location_name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowMapModal(false)} 
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 bg-slate-950/40">
                <SeatMapper 
                  readonly 
                  pins={session.coordinates ? [{ ...session.coordinates, label: session.subject + ' (Current Session)' }] : []}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
