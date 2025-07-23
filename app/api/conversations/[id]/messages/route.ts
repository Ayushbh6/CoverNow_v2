import { createClient } from '@/utils/supabase/server';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', params.id)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return Response.json(messages || []);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { content } = await req.json();

    if (!content) {
      return new Response('Content is required', { status: 400 });
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: params.id,
        role: 'user',
        content: content
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    const { error: updateError } = await supabase
      .from('conversations')
      .update({ 
        updated_at: new Date().toISOString(),
        title: content.substring(0, 50) + (content.length > 50 ? '...' : '')
      })
      .eq('id', params.id)
      .is('title', null);

    return Response.json(message);
  } catch (error) {
    console.error('Error creating message:', error);
    return new Response('Internal server error', { status: 500 });
  }
}