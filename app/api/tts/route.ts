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
    
    // Fix Indian currency pronunciation for all formats
    const processedText = text.replace(/₹([\d,]+)/g, (match: string, amount: string) => {
      const number = parseInt(amount.replace(/,/g, ''));
      if (number >= 10000000) {
        return `₹${(number / 10000000).toFixed(1).replace('.0', '')} crores`;
      } else if (number >= 100000) {
        return `₹${(number / 100000).toFixed(1).replace('.0', '')} lakhs`;
      }
      return match;
    });
    
    const result = await generateSpeech({
      model: openai.speech('gpt-4o-mini-tts'),
      text: processedText,  // Use processed text with Indian currency fixes
      voice: 'alloy',
      instructions: "Speak with a natural Indian English accent, using Indian number formats like lakhs and crores naturally. Pronounce ages and amounts in a conversational, friendly manner.",
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