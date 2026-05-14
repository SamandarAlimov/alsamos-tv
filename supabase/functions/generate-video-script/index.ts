import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, type, style } = await req.json();
    
    console.log('Generating content for:', { prompt, type, style });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build system prompt based on content type
    let systemPrompt = "";
    switch (type) {
      case 'script':
        systemPrompt = `You are a professional screenwriter. Generate a detailed video script based on the user's prompt. Include:
        - Scene descriptions
        - Dialogue (if applicable)
        - Camera directions
        - Timing suggestions
        Format the output as a professional screenplay.`;
        break;
      case 'thumbnail':
        systemPrompt = `You are a creative director specializing in video thumbnails. Generate a detailed description for a compelling YouTube-style thumbnail. Include:
        - Visual composition
        - Text overlays
        - Color scheme
        - Emotional appeal elements
        Make it attention-grabbing and click-worthy.`;
        break;
      case 'voiceover':
        systemPrompt = `You are a professional voice-over scriptwriter. Generate a natural, engaging voice-over script for video narration. Include:
        - Natural speech patterns
        - Emphasis cues (in brackets)
        - Pause indicators
        - Tone directions
        Make it sound conversational yet professional.`;
        break;
      case 'music':
        systemPrompt = `You are a music director. Describe the perfect background music for the video. Include:
        - Genre and style
        - Tempo and mood
        - Instrument suggestions
        - Key moments for music changes
        Provide specific music cues for different sections.`;
        break;
      case 'video':
        systemPrompt = `You are an AI video generation prompt engineer. Create a detailed, optimized prompt for AI video generation based on the user's request. Include:
        - Visual scene description (be very specific)
        - Camera movements and angles
        - Lighting and atmosphere
        - Style references (cinematic, documentary, etc.)
        - Duration suggestions
        Format it as a step-by-step storyboard with timestamps.`;
        break;
      default:
        systemPrompt = `You are a creative AI assistant helping with video content creation. Provide helpful, detailed, and creative responses.`;
    }

    if (style) {
      systemPrompt += `\n\nStyle preference: ${style}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add more credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    console.log('Generated content successfully');

    return new Response(JSON.stringify({ 
      content,
      type,
      prompt 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in generate-video-script:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
