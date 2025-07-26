'use client'

import { useEffect, useRef } from 'react'

interface AudioVisualizerProps {
  analyser: AnalyserNode | null
  isRecording: boolean
}

export default function AudioVisualizer({ analyser, isRecording }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()

  useEffect(() => {
    if (!analyser || !canvasRef.current || !isRecording) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.offsetWidth * window.devicePixelRatio
    canvas.height = canvas.offsetHeight * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw)
      
      analyser.getByteFrequencyData(dataArray)

      // Clear canvas
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)

      // Draw waveform bars
      const barWidth = 3
      const barGap = 2
      const barCount = Math.floor(canvas.offsetWidth / (barWidth + barGap))
      const startIdx = Math.floor((bufferLength - barCount) / 2)

      for (let i = 0; i < barCount; i++) {
        const dataIndex = startIdx + i
        const barHeight = (dataArray[dataIndex] / 255) * (canvas.offsetHeight * 0.8)
        
        const x = i * (barWidth + barGap)
        const y = (canvas.offsetHeight - barHeight) / 2

        // Create gradient for bars
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight)
        gradient.addColorStop(0, '#22C55E')
        gradient.addColorStop(1, '#16A34A')
        
        ctx.fillStyle = gradient
        ctx.fillRect(x, y, barWidth, barHeight)
      }
    }

    draw()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [analyser, isRecording])

  if (!isRecording) {
    return null
  }

  return (
    <canvas 
      ref={canvasRef}
      className="w-full h-12"
      style={{ maxWidth: '200px' }}
    />
  )
}