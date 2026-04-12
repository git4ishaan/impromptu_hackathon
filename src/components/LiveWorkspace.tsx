import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { CheckCircle2, Plus, MapPin, X, Loader2, Link as LinkIcon } from 'lucide-react';

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
    <div className="fixed inset-0 z-[60] flex flex-col bg-surface-container-lowest border-4 border-on-surface animate-in fade-in zoom-in duration-300">
      <header className="p-6 border-b-4 border-on-surface flex justify-between items-center bg-primary-fixed sticky top-0 z-10 shadow-hard-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-canvas border-2 border-on-surface shadow-hard-sm">
            <CheckCircle2 className="w-8 h-8 text-on-surface stroke-[3]" />
          </div>
          <div>
            <h2 className="text-3xl font-display font-black text-on-surface uppercase tracking-tighter">{session.subject}</h2>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-2 mt-1">
              <MapPin className="w-4 h-4 stroke-[3]" /> {session.location_name}
            </p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="bg-canvas border-2 border-on-surface p-2 shadow-hard hover:bg-error-container hover:shadow-hard-sm hover:translate-x-1 hover:translate-y-1 transition-all"
        >
          <X className="w-6 h-6 stroke-[3] text-on-surface" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-6 md:p-12 max-w-6xl mx-auto w-full grid gap-12 md:grid-cols-12 bg-surface-container-lowest">
        {/* Checklist Column */}
        <div className="md:col-span-8 flex flex-col pt-8">
          <div className="bg-canvas border-2 border-on-surface shadow-hard relative p-8 mt-2">
            <div className="absolute top-0 right-0 -m-0 bg-secondary-container border-l-2 border-b-2 border-on-surface px-4 py-1">
               <span className="text-[10px] uppercase font-black text-white tracking-widest">Shared Scope</span>
            </div>
            
            <h3 className="text-3xl font-display font-black mb-8 uppercase tracking-tighter flex items-center gap-4">
               Task List
               <span className="text-[10px] px-3 py-1 bg-surface-container-high border-2 border-on-surface shadow-hard-sm text-on-surface font-black uppercase tracking-widest">Syncing</span>
            </h3>

            <form onSubmit={addTask} className="mb-10 relative flex gap-2">
              <input 
                type="text"
                placeholder="What are we working on? (e.g. Solve Chapter 4 problems)"
                className="w-full bg-surface-container-highest border-2 border-on-surface rounded-none py-4 px-4 text-on-surface font-bold focus:outline-none focus:bg-primary-fixed focus:shadow-hard transition-all placeholder:text-on-surface-variant"
                value={newTaskContent}
                onChange={(e) => setNewTaskContent(e.target.value)}
              />
              <button 
                type="submit"
                className="bg-primary-container border-2 border-on-surface text-on-surface font-black shadow-hard px-6 flex items-center justify-center hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
              >
                <Plus className="w-6 h-6 stroke-[3]" />
              </button>
            </form>

            <div className="space-y-4">
              {loading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : tasks.length === 0 ? (
                <p className="text-center font-bold text-on-surface-variant py-8 border-2 border-dashed border-outline bg-surface-container-low">NO TASKS CREATED YET.</p>
              ) : (
                tasks.map((task) => (
                  <div 
                    key={task.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-canvas border-2 border-on-surface shadow-hard-sm transition-all group gap-4 sm:gap-2 hover:-translate-y-1 hover:shadow-hard"
                  >
                    <div 
                      className="flex items-center gap-4 cursor-pointer flex-1 w-full"
                      onClick={() => toggleTask(task)}
                    >
                      <div className="shrink-0 flex items-center justify-center border-2 border-on-surface w-8 h-8 bg-surface-container-highest">
                        {task.is_completed && <CheckCircle2 className="w-8 h-8 text-on-surface fill-primary-container" />}
                      </div>
                      <span className={`text-lg font-bold uppercase transition-all overflow-hidden ${task.is_completed ? 'text-outline line-through' : 'text-on-surface'}`}>
                        {task.task_content}
                      </span>
                    </div>
                    <button 
                      onClick={() => deleteTask(task.id)}
                      className="shrink-0 px-4 py-2 border-2 border-on-surface bg-canvas hover:bg-error-container text-on-surface font-black uppercase tracking-widest text-xs transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Info Column */}
        <div className="md:col-span-4 flex flex-col pt-8">
          <div className="bg-canvas border-2 border-on-surface shadow-hard relative p-6 mt-2 h-full min-h-[300px]">
            <div className="absolute top-0 right-0 -m-0 bg-primary-container border-l-2 border-b-2 border-on-surface px-4 py-1">
               <span className="text-[10px] uppercase font-black text-on-primary-fixed tracking-widest">Resources</span>
            </div>
            
             <div className="flex flex-col gap-4 mt-8">
               <div className="flex items-center gap-4 p-4 border-2 border-on-surface bg-surface-container-low hover:bg-surface-container-high hover:-translate-y-0.5 transition-transform cursor-pointer shadow-hard-sm group">
                 <LinkIcon className="w-5 h-5 text-on-surface stroke-[3]" />
                 <span className="text-sm font-black uppercase tracking-wider text-on-surface">Shared Drive Notes</span>
               </div>
               <div className="flex items-center gap-4 p-4 border-2 border-on-surface bg-surface-container-low hover:bg-surface-container-high hover:-translate-y-0.5 transition-transform cursor-pointer shadow-hard-sm group">
                 <LinkIcon className="w-5 h-5 text-on-surface stroke-[3]" />
                 <span className="text-sm font-black uppercase tracking-wider text-on-surface">Previous Exam Papers</span>
               </div>
             </div>
          </div>
        </div>
      </main>

      <footer className="p-4 border-t-4 border-on-surface text-center font-bold text-xs text-on-surface uppercase tracking-widest bg-primary-fixed shadow-hard-sm">
        Synced Workspace &bull; StudySpot Platform
      </footer>
    </div>
  );
};
