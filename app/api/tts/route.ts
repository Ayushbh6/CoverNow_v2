import { NextRequest } from 'next/server';
import { experimental_generateSpeech as generateSpeech } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    let text;
    try {
      const body = await req.json();
      text = body.text;
    } catch (parseError) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    
    const result = await generateSpeech({
      model: openai.speech('gpt-4o-mini-tts'),
      text: text,  // Just the text, no system prompt
      voice: 'alloy',
      providerOptions: {
        openai: {
          response_format: 'mp3',
          speed: 1.0
        }
      }
    });
    
    
    // According to the Vercel AI SDK docs, the audio is in the 'audio' property
    // and it has base64 and uint8Array properties
    const audioFile = result.audio;
    
    if (!audioFile) {
      return new Response('No audio data generated', { status: 500 });
    }
    
    // The audio object has uint8Array property for binary data
    return new Response(audioFile.uint8Array, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate audio', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}