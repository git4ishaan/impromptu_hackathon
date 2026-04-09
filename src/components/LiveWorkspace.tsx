import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { CheckCircle2, Circle, Plus, Trash2, MapPin, X, Loader2, Link as LinkIcon } from 'lucide-react';

interface Task {
  id: string;
  task_content: string;
  is_completed: boolean;
}

interface Session {
  id: string;
  subject: string;
  location_name: string;
}

interface LiveWorkspaceProps {
  session: Session;
  onClose: () => void;
}

export const LiveWorkspace: React.FC<LiveWorkspaceProps> = ({ session, onClose }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskContent, setNewTaskContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();

    // Subscribe to task changes
    const subscription = supabase
      .channel(`session:${session.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tasks',
        filter: `session_id=eq.${session.id}` 
      }, () => {
        fetchTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [session.id]);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true });

    if (!error) {
      setTasks(data);
    }
    setLoading(false);
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskContent.trim()) return;

    const { error } = await supabase
      .from('tasks')
      .insert({
        session_id: session.id,
        task_content: newTaskContent.trim(),
        is_completed: false
      });

    if (!error) {
      setNewTaskContent('');
    }
  };

  const toggleTask = async (task: Task) => {
    await supabase
      .from('tasks')
      .update({ is_completed: !task.is_completed })
      .eq('id', task.id);
  };

  const deleteTask = async (id: string) => {
    await supabase
      .from('tasks')
      .delete()
      .eq('id', id);
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-neutral-900 animate-in fade-in zoom-in duration-300">
      <header className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-2xl">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{session.subject}</h2>
            <p className="text-sm text-neutral-400 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {session.location_name}
            </p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-3 hover:bg-neutral-800 rounded-full transition-all text-neutral-400 hover:text-white"
        >
          <X className="w-6 h-6" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full grid gap-8 md:grid-cols-12">
        {/* Checklist Column */}
        <div className="md:col-span-8 space-y-6">
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-3xl p-6 shadow-xl">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
               Shared Task List
               <span className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30 uppercase tracking-widest font-black">Syncing</span>
            </h3>

            <form onSubmit={addTask} className="mb-8 relative">
              <input 
                type="text"
                placeholder="What are we working on? (e.g. Solve Chapter 4 problems)"
                className="w-full bg-neutral-950 border border-neutral-700 rounded-2xl py-4 pl-5 pr-14 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-neutral-600 shadow-inner"
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

            <div className="space-y-3">
              {loading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                </div>
              ) : tasks.length === 0 ? (
                <p className="text-center text-neutral-500 py-8 text-sm italic">No tasks created yet.</p>
              ) : (
                tasks.map((task) => (
                  <div 
                    key={task.id}
                    className="flex items-center justify-between p-4 bg-neutral-900/50 border border-neutral-700/50 rounded-2xl hover:border-emerald-500/30 transition-all group"
                  >
                    <div 
                      className="flex items-center gap-4 cursor-pointer flex-1"
                      onClick={() => toggleTask(task)}
                    >
                      {task.is_completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/10" />
                      ) : (
                        <Circle className="w-5 h-5 text-neutral-600 group-hover:text-emerald-500 transition-colors" />
                      )}
                      <span className={`text-sm transition-all ${task.is_completed ? 'text-neutral-500 line-through' : 'text-neutral-200'}`}>
                        {task.task_content}
                      </span>
                    </div>
                    <button 
                      onClick={() => deleteTask(task.id)}
                      className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-neutral-600 hover:text-red-400 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Info Column */}
        <div className="md:col-span-4 space-y-6">
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-3xl p-6 shadow-xl">
             <h3 className="text-sm font-bold text-neutral-400 mb-4 uppercase tracking-widest">Resources</h3>
             <div className="flex flex-col gap-3">
               <div className="flex items-center gap-3 p-3 bg-neutral-900/50 border border-neutral-800 rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer group">
                 <LinkIcon className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                 <span className="text-xs text-neutral-300">Shared Drive Notes</span>
               </div>
               <div className="flex items-center gap-3 p-3 bg-neutral-900/50 border border-neutral-800 rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer group">
                 <LinkIcon className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                 <span className="text-xs text-neutral-300">Previous Exam Papers</span>
               </div>
             </div>
          </div>
        </div>
      </main>

      <footer className="p-6 border-t border-neutral-800 text-center text-[10px] text-neutral-600 uppercase tracking-widest bg-neutral-900/80 backdrop-blur-md">
        Synced via Supabase Realtime Logic
      </footer>
    </div>
  );
};
