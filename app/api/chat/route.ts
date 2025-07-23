import { createClient } from '@/utils/supabase/server';
import { NextRequest } from 'next/server';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { messages, conversationId } = await req.json();

    if (!messages || !Array.isArray(messages) || !conversationId) {
      return new Response('Invalid request body', { status: 400 });
    }

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
      headers: {
        'HTTP-Referer': req.headers.get('referer') || 'http://localhost:3000',
        'X-Title': 'CoverNow Chat'
      }
    });

    const result = await streamText({
      model: openrouter.chat('google/gemini-2.5-flash'),
      messages: messages,
      async onFinish({ text }) {
        // Save the complete message to the database
        await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: text,
            tool_calls: null
          });
      }
    });

    return result.toDataStreamResponse();

  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}