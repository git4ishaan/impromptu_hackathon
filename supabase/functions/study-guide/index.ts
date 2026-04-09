import "jsr:@supabase/functions-js/edge-runtime.js"
import { createClient } from "npm:@supabase/supabase-js@2.45.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const groqApiKey = Deno.env.get('GROQ_API_KEY') || '';

    if (!groqApiKey) {
      throw new Error("Missing GROQ_API_KEY secret.");
    }

    // Initialize Supabase Client bypassing RLS to quickly read all global sessions
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch active sessions with host names
    const { data: sessions, error: dbError } = await supabase
      .from('sessions')
      .select('subject, location_name, created_at, profiles(full_name)');

    if (dbError) throw dbError;

    // Build the Prompt for Groq
    const systemPrompt = `You are an intelligent campus assistant for MIT-WPU students named 'StudySpot AI'. 
Your goal is to guide students to the best active study session based on their question.
Here is the live JSON data of all currently active study sessions on campus: 
${JSON.stringify(sessions)}

Instructions:
1. If there are no sessions, politely inform the user that it's quiet on campus and they should host the first session themselves.
2. If the user asks for a subject that has no active session, accurately tell them it's not active right now and suggest they host it.
3. If there is a match, tell them the specific 'location_name' and the 'subject', and mention the host's 'full_name' if available.
4. Keep your response highly concise, friendly, and direct (max 2 short paragraphs). Use markdown formatting.`;

    // Call Groq API via standard Fetch
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192', // Fast model perfect for simple queries
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query || 'What is happening on campus right now?' }
        ],
        temperature: 0.6,
        max_tokens: 300,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      throw new Error(`Groq API Error: ${errText}`);
    }

    const groqData = await groqRes.json();
    const reply = groqData.choices[0].message.content;

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
