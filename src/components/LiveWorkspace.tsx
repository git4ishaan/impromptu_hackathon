import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { SeatMapper } from './SeatMapper';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { CheckCircle2, Circle, Plus, Trash2, MapPin, X, Loader2, Link as LinkIcon, BookOpen, Shield, Users, UserMinus, UserCheck, Bot, Send, Sparkles, Power, Library, Upload, FileText, File as FileIcon } from 'lucide-react';

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
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-neutral-900 border border-neutral-700 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-neutral-800 rounded-2xl mx-auto flex items-center justify-center">
            <Shield className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{session.subject}</h2>
            <p className="text-neutral-400 mt-2">This is a private study session.</p>
          </div>
          
          {memberStatus === 'none' && (
            <button onClick={handleRequestJoin} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-xl transition-all">
              Request to Join
            </button>
          )}
          {memberStatus === 'pending' && (
            <div className="p-4 bg-neutral-800 rounded-xl border border-neutral-700 flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
              <p className="font-bold text-neutral-300">Waiting for Host Approval...</p>
            </div>
          )}
          {memberStatus === 'kicked' && (
            <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20 text-red-400 font-bold">
              You cannot join this session right now.
            </div>
          )}

          <button onClick={onClose} className="text-sm text-neutral-500 hover:text-white transition-colors">
            Back to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  // ---------------- MAIN WORKSPACE VIEW ----------------
  return (
    <div className="flex-1 flex flex-col">
      <div className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${session.is_private ? 'bg-indigo-500/10' : 'bg-emerald-500/10'}`}>
              {session.is_private ? <Shield className="w-6 h-6 text-indigo-400" /> : <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                {session.subject}
                {session.is_private && <span className="text-[10px] px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded-full border border-indigo-500/30 uppercase tracking-widest font-black">Private</span>}
              </h2>
              <p className="text-sm text-neutral-400 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {session.location_name}
                {session.duration_minutes && (
                  <>
                    <span className="text-neutral-600 px-2">•</span>
                    <span className="flex items-center gap-1">⏱️ {session.duration_minutes} min limit</span>
                  </>
                )}
              </p>
            </div>
          </div>
          {isHost && (
            <button 
              onClick={handleEndSession}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 rounded-xl text-sm font-bold transition-all active:scale-95"
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
        <div className="md:col-span-5 space-y-6">
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-3xl p-6 shadow-xl">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
               Shared Task List
               <span className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30 uppercase tracking-widest font-black">Syncing</span>
            </h3>

            <form onSubmit={addTask} className="mb-6 relative">
              <input 
                type="text"
                placeholder="Add a task..."
                className="w-full bg-neutral-950 border border-neutral-700 rounded-2xl py-3.5 pl-5 pr-14 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-neutral-600 shadow-inner"
                value={newTaskContent}
                onChange={(e) => setNewTaskContent(e.target.value)}
              />
              <button 
                type="submit"
                className="absolute right-2 top-2 bottom-2 aspect-square bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center justify-center transition-all shadow-lg shadow-emerald-500/20 active:scale-90"
              >
                <Plus className="w-5 h-5" />
              </button>
            </form>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                </div>
              ) : tasks.length === 0 ? (
                <p className="text-center text-neutral-500 py-8 text-sm italic">No tasks created yet.</p>
              ) : (
                tasks.map((task) => (
                  <motion.div 
                    layout
                    key={task.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center justify-between p-3 bg-neutral-900/50 border border-neutral-700/50 rounded-xl hover:border-emerald-500/30 transition-all group"
                  >
                    <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => toggleTask(task)}>
                      {task.is_completed ? <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500/10" /> : <Circle className="w-4 h-4 text-neutral-600 group-hover:text-emerald-500 transition-colors" />}
                      <span className={`text-sm transition-all ${task.is_completed ? 'text-neutral-500 line-through' : 'text-neutral-200'}`}>{task.task_content}</span>
                    </div>
                    <button onClick={() => deleteTask(task.id)} className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-neutral-600 hover:text-red-400 rounded-lg transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: AI Tutor Chat */}
        <div className="md:col-span-4">
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-3xl shadow-xl flex flex-col h-[600px] overflow-hidden">
            <div className="p-4 border-b border-neutral-700/50 flex items-center gap-3 bg-neutral-800/80">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-1">
                  {session.subject} Tutor <Sparkles className="w-3 h-3 text-yellow-400" />
                </h3>
                <p className="text-[10px] text-neutral-400 uppercase tracking-widest">AI Study Helper</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <AnimatePresence>
                {chatMessages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div 
                      className={`max-w-[90%] p-3 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-purple-600 text-white rounded-tr-sm' 
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
              
              {chatLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start">
                  <div className="bg-neutral-700/50 p-3 rounded-2xl rounded-tl-sm border border-neutral-600/50 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                    <span className="text-xs text-neutral-400">Thinking...</span>
                  </div>
                </motion.div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-3 bg-neutral-800/80 border-t border-neutral-700/50">
              <form onSubmit={handleChatSend} className="relative">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={chatLoading}
                  placeholder="Ask about the subject..."
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-3 pl-4 pr-12 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-neutral-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || chatLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all disabled:opacity-50 disabled:bg-neutral-700"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <div className="flex gap-2 mt-2">
                <button onClick={() => { setChatInput('Generate sample exam questions'); }} className="text-[10px] px-2 py-1 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 rounded-lg transition-colors">
                  📝 Exam Qs
                </button>
                <button onClick={() => { setChatInput('Create a study roadmap from my tasks'); }} className="text-[10px] px-2 py-1 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 rounded-lg transition-colors">
                  🗺️ Roadmap
                </button>
                <button onClick={() => { setChatInput('Explain the key concepts'); }} className="text-[10px] px-2 py-1 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 rounded-lg transition-colors">
                  💡 Explain
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sidebar Widgets */}
        <div className="md:col-span-3 space-y-6">
          {/* Location & Map Widget */}
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-3xl p-6 shadow-xl overflow-hidden">
            <h3 className="text-sm font-bold text-neutral-400 mb-4 uppercase tracking-widest flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-400" /> Location & Map
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-neutral-900/50 rounded-xl border border-neutral-800">
                <Library className="w-5 h-5 text-emerald-400 mt-0.5" />
                <div>
                  <p className="text-xs font-black text-white uppercase tracking-wider">MIT-WPU Central Library</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">{session.location_name}</p>
                </div>
              </div>

              <div 
                className="rounded-2xl border border-neutral-700 overflow-hidden relative group cursor-pointer hover:border-blue-500/50 transition-all"
                onClick={() => setShowMapModal(true)}
              >
                <div className="scale-[0.6] origin-top-left -mb-[40%]">
                  <SeatMapper 
                    readonly 
                    pins={session.coordinates ? [{ ...session.coordinates, label: 'YOU ARE HERE' }] : []}
                  />
                </div>
                {!session.coordinates && (
                  <div className="absolute inset-0 bg-neutral-900/80 backdrop-blur-sm flex items-center justify-center p-4 text-center">
                    <p className="text-xs text-neutral-500 italic">No map location Pinned.</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-neutral-900/0 group-hover:bg-neutral-900/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="text-xs font-bold text-white bg-blue-600 px-3 py-1.5 rounded-full shadow-lg"> Click to expand</span>
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
                className="fixed inset-0 z-[100] bg-neutral-950/90 backdrop-blur-xl flex items-center justify-center p-8"
                onClick={() => setShowMapModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="bg-neutral-900 border border-neutral-700 rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-800/50">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-blue-400" />
                      <div>
                        <h3 className="font-bold text-white">Session Location</h3>
                        <p className="text-xs text-neutral-400">{session.location_name} — MIT-WPU Central Library</p>
                      </div>
                    </div>
                    <button onClick={() => setShowMapModal(false)} className="p-2 hover:bg-neutral-700 rounded-xl transition-colors text-neutral-400 hover:text-white">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-6">
                    <SeatMapper 
                      readonly 
                      pins={session.coordinates ? [{ ...session.coordinates, label: session.subject + ' — YOU ARE HERE' }] : []}
                    />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Host Moderation Panel */}
          {isHost && (
            <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-3xl p-6 shadow-xl">
               <h3 className="text-sm font-bold text-indigo-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                 <Shield className="w-4 h-4" /> Host Controls
               </h3>
               
               <div className="space-y-4">
                 {members.filter(m => m.status === 'pending').length > 0 && (
                   <div className="space-y-2">
                     <p className="text-xs text-neutral-400 uppercase font-bold">Pending Requests</p>
                     {members.filter(m => m.status === 'pending').map(m => (
                       <div key={m.id} className="flex items-center justify-between p-3 bg-neutral-900/50 rounded-xl border border-neutral-800">
                         <span className="text-sm font-medium">{m.profiles?.full_name || 'Anonymous'}</span>
                         <div className="flex gap-2">
                           <button 
                             onClick={() => updateMemberStatus(m.id, 'approved')} 
                             className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all active:scale-95"
                           >
                             ✓ Accept
                           </button>
                           <button 
                             onClick={() => deleteMember(m.id)} 
                             className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-xs font-bold rounded-lg transition-all active:scale-95"
                           >
                             ✕
                           </button>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}

                 <div className="space-y-2">
                   <p className="text-xs text-neutral-400 uppercase font-bold">Approved</p>
                   {members.filter(m => m.status === 'approved').map(m => (
                     <div key={m.id} className="flex items-center justify-between p-2 bg-neutral-900/50 rounded-lg border border-neutral-800">
                       <span className="text-sm text-neutral-300">{m.profiles?.full_name || 'Anonymous'}</span>
                       <button onClick={() => updateMemberStatus(m.id, 'kicked')} className="p-1.5 hover:bg-red-500/20 text-neutral-500 hover:text-red-400 rounded transition-all" title="Kick user">
                         <UserMinus className="w-4 h-4" />
                       </button>
                     </div>
                   ))}
                   {members.filter(m => m.status === 'approved').length === 0 && <p className="text-xs text-neutral-500 italic">No members yet.</p>}
                 </div>
               </div>
            </div>
          )}

          {/* People in Session Widget */}
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-3xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-neutral-400 mb-4 uppercase tracking-widest flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" /> People
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2 bg-neutral-900/50 rounded-lg border border-neutral-800">
                <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-[10px] font-black text-white">H</div>
                <span className="text-sm text-white font-medium">{session.profiles?.full_name || 'Host'}</span>
                <span className="ml-auto text-[9px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30 uppercase font-black">Host</span>
              </div>
              {members.filter(m => m.status === 'approved').map(m => (
                <div key={m.id} className="flex items-center gap-3 p-2 bg-neutral-900/50 rounded-lg border border-neutral-800">
                  <div className="w-7 h-7 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-[10px] font-black text-white">
                    {(m.profiles?.full_name || 'A')[0].toUpperCase()}
                  </div>
                  <span className="text-sm text-neutral-300">{m.profiles?.full_name || 'Anonymous'}</span>
                </div>
              ))}
              {members.filter(m => m.status === 'approved').length === 0 && (
                <p className="text-xs text-neutral-500 italic">Just the host so far.</p>
              )}
            </div>
          </div>


          {/* Shared Resource Stash */}
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-3xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-neutral-400 mb-4 uppercase tracking-widest flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" /> Resource Stash
            </h3>
            <p className="text-[10px] text-neutral-500 mb-3">Upload textbooks & notes. Text files are auto-scanned by the AI tutor.</p>

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
              className="w-full flex items-center justify-center gap-2 py-3 bg-neutral-900 hover:bg-neutral-700 border border-dashed border-neutral-600 hover:border-amber-500/50 rounded-xl text-sm text-neutral-400 hover:text-amber-400 transition-all mb-4 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'Uploading...' : 'Upload File'}
            </button>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {sharedFiles.length === 0 ? (
                <p className="text-xs text-neutral-500 italic text-center py-2">No files shared yet.</p>
              ) : (
                sharedFiles.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2.5 bg-neutral-900/50 rounded-xl border border-neutral-800 group hover:border-amber-500/30 transition-all">
                    <div className={`p-1.5 rounded-lg ${f.textContent ? 'bg-amber-500/10' : 'bg-neutral-700'}`}>
                      {f.textContent ? <FileText className="w-3.5 h-3.5 text-amber-400" /> : <FileIcon className="w-3.5 h-3.5 text-neutral-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-neutral-200 truncate">{f.name}</p>
                      <p className="text-[10px] text-neutral-500">
                        {(f.size / 1024).toFixed(1)} KB
                        {f.textContent && <span className="text-amber-400 ml-1">• AI-scanned</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => setSharedFiles(prev => prev.filter((_, i) => i !== idx))}
                      className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-neutral-600 hover:text-red-400 rounded transition-all"
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

      <footer className="p-4 border-t border-neutral-800 text-center text-[10px] text-neutral-600 uppercase tracking-widest bg-neutral-900/80 backdrop-blur-md flex items-center justify-center gap-2">
        <Users className="w-3 h-3" /> Synced securely via Supabase
      </footer>
    </div>
  );
};
