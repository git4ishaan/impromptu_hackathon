import { supabase } from '../supabaseClient';

export const seedDemoSessions = async (userId: string) => {
  const demoSessions = [
    {
      subject: 'Intro to Machine Learning',
      location_name: 'Library F4 - Research Wing',
      host_id: userId,
      coordinates: { x: 35.5, y: 22.8 },
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    },
    {
      subject: 'CS 101 Final Prep',
      location_name: 'F1 - Collaborative Zone',
      host_id: userId,
      coordinates: { x: 68.2, y: 45.1 },
      created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    },
    {
      subject: 'Thermodynamics Sprint',
      location_name: 'Level 2 - Silent Area',
      host_id: userId,
      coordinates: { x: 22.1, y: 78.4 },
      created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    },
    {
      subject: 'Modern Art History Disc.',
      location_name: 'Cafe Area - Main Hall',
      host_id: userId,
      coordinates: { x: 50.0, y: 15.0 },
      created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
    }
  ];

  const { error } = await supabase.from('sessions').insert(demoSessions);
  
  if (error) {
    console.error('Seeding error:', error);
    return false;
  }
  return true;
};
