import { supabase } from '../supabaseClient';

export const seedInitialSessions = async (userId: string) => {
  const initialSessions = [
    {
      subject: 'Intro to Machine Learning',
      location_name: 'Library F4 - Research Wing',
      host_id: userId,
      coordinates: { x: 35.5, y: 22.8 },
      is_private: false,
      duration_minutes: 120,
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
      subject: 'CS 101 Final Prep',
      location_name: 'F1 - Collaborative Zone',
      host_id: userId,
      coordinates: { x: 68.2, y: 45.1 },
      is_private: true,
      duration_minutes: 60,
      created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    },
    {
      subject: 'Thermodynamics Sprint',
      location_name: 'Level 2 - Silent Area',
      host_id: userId,
      coordinates: { x: 22.1, y: 78.4 },
      is_private: false,
      duration_minutes: 90,
      created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
    {
      subject: 'Modern Art History Disc.',
      location_name: 'Cafe Area - Main Hall',
      host_id: userId,
      coordinates: { x: 50.0, y: 15.0 },
      is_private: false,
      duration_minutes: 45,
      created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    }
  ];

  const { error } = await supabase.from('sessions').insert(initialSessions);
  
  if (error) {
    console.error('Seeding error:', error);
    return false;
  }
  return true;
};
