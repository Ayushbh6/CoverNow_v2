import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1'
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }

    // Use the exact syntax from OpenAI documentation
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'openai/whisper-1',
      response_format: 'json'
    })

    // Normalize common variations of "Aria"
    let normalizedText = transcription.text
    
    // Replace common variations (case-insensitive, word boundaries)
    const ariaVariations = [
      /\bArya\b/gi,
      /\bAriya\b/gi,
      /\bAreya\b/gi,
      /\bAriah\b/gi
    ]
    
    ariaVariations.forEach(variation => {
      normalizedText = normalizedText.replace(variation, 'Aria')
    })

    return NextResponse.json({ 
      text: normalizedText
    })
  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    )
  }
}