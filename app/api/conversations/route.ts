import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      throw error;
    }

    return Response.json(conversations || []);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        title: 'New conversation'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return Response.json(conversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    return new Response('Internal server error', { status: 500 });
  }
}