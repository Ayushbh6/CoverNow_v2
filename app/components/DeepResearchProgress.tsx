'use client'

import { useEffect, useState } from 'react'
import { DeepResearchResponse } from '@/app/api/chat/tools/deepResearch'

interface DeepResearchProgressProps {
  query: string
  phase?: 'reconnaissance' | 'level1' | 'level2' | 'synthesis'
  progressData?: {
    insights: number
    totalSearches: number
  }
  onComplete?: (result: DeepResearchResponse) => void
}

interface ResearchUpdate {
  phase: 'reconnaissance' | 'level1' | 'level2' | 'synthesis'
  currentQuery?: string
  status: string
  progress: number
  insights: number
  timestamp: number
}

interface ResearchNode {
  id: string
  query: string
  level: number
  status: 'pending' | 'searching' | 'analyzing' | 'completed'
  parent?: string
  children: string[]
}

export default function DeepResearchProgress({ query, phase = 'reconnaissance', progressData, onComplete }: DeepResearchProgressProps) {
  const [updates, setUpdates] = useState<ResearchUpdate[]>([])
  const [currentUpdate, setCurrentUpdate] = useState<ResearchUpdate | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [researchTree, setResearchTree] = useState<ResearchNode[]>([
    {
      id: 'root',
      query: query,
      level: 0,
      status: 'pending',
      children: []
    }
  ])
  
  // Track actual insights and searches
  const [actualInsights, setActualInsights] = useState(0)
  const [actualSearches, setActualSearches] = useState(0)

  // Update progress data when it changes
  useEffect(() => {
    if (progressData) {
      setActualInsights(progressData.insights)
      setActualSearches(progressData.totalSearches)
    }
  }, [progressData])

  // Simulate progress updates (in real implementation, these would come from the tool)
  useEffect(() => {
    const startTime = Date.now()
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    // Set initial update based on the phase prop
    const phaseDetails = {
      'reconnaissance': {
        status: 'Gathering current information...',
        progress: 5
      },
      'level1': {
        status: 'Conducting informed searches...',
        progress: 30
      },
      'level2': {
        status: 'Deep diving into key findings...',
        progress: 60
      },
      'synthesis': {
        status: 'Generating comprehensive report...',
        progress: 85
      }
    }
    
    // Calculate simulated values based on phase if no real data
    let simulatedInsights = actualInsights
    let simulatedSearches = actualSearches
    
    if (!progressData) {
      // Simulate incremental progress based on phase
      switch (phase) {
        case 'reconnaissance':
          simulatedSearches = 1
          simulatedInsights = 0
          break
        case 'level1':
          simulatedSearches = 4
          simulatedInsights = 2
          break
        case 'level2':
          simulatedSearches = 7
          simulatedInsights = 5
          break
        case 'synthesis':
          simulatedSearches = 7
          simulatedInsights = 5
          break
      }
    }

    setCurrentUpdate({
      phase: phase,
      status: phaseDetails[phase].status,
      progress: phaseDetails[phase].progress,
      insights: simulatedInsights,
      timestamp: Date.now()
    })

    return () => clearInterval(timer)
  }, [query, phase, progressData, actualInsights, actualSearches])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'reconnaissance':
        return 'from-blue-500 to-cyan-500'
      case 'level1':
        return 'from-purple-500 to-pink-500'
      case 'level2':
        return 'from-orange-500 to-red-500'
      case 'synthesis':
        return 'from-green-500 to-emerald-500'
      default:
        return 'from-gray-500 to-gray-600'
    }
  }

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'reconnaissance':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        )
      case 'level1':
      case 'level2':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        )
      case 'synthesis':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl border border-gray-800 p-6 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Deep Research in Progress</h3>
              <p className="text-sm text-gray-400 mt-1">{query}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono text-white">{formatTime(elapsedTime)}</div>
            <div className="text-xs text-gray-500">Elapsed Time</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
              style={{ width: `${currentUpdate?.progress || 0}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>0s</span>
            <span>30s</span>
            <span>60s</span>
            <span>90s</span>
          </div>
        </div>
      </div>

      {/* Current Activity */}
      {currentUpdate && (
        <div className="bg-[#2a2a2a] rounded-xl border border-gray-800 p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 bg-gradient-to-br ${getPhaseColor(currentUpdate.phase)} rounded-lg flex items-center justify-center text-white`}>
              {getPhaseIcon(currentUpdate.phase)}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-white capitalize">
                  {currentUpdate.phase.replace(/([A-Z])/g, ' $1').trim()} Phase
                </h4>
                <span className="text-xs text-gray-500">{currentUpdate.insights} insights found</span>
              </div>
              <p className="text-sm text-gray-400 mt-1">{currentUpdate.status}</p>
              {currentUpdate.currentQuery && (
                <p className="text-xs text-gray-500 mt-2 font-mono bg-gray-800/50 rounded px-2 py-1 inline-block">
                  {currentUpdate.currentQuery}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Research Tree Visualization */}
      <div className="bg-[#2a2a2a] rounded-xl border border-gray-800 p-6">
        <h4 className="text-sm font-medium text-gray-400 mb-4">Research Path</h4>
        
        {/* Tree visualization would go here */}
        <div className="space-y-4">
          {/* Root node */}
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full" />
            <div className="flex-1">
              <p className="text-sm text-white">{query}</p>
              <p className="text-xs text-gray-500">Initial Query</p>
            </div>
          </div>

          {/* Dynamic tree nodes based on phase */}
          <div className="ml-6 border-l-2 border-gray-700 pl-6 space-y-3">
            {phase === 'reconnaissance' && (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <p className="text-xs text-gray-400">Performing reconnaissance search...</p>
              </div>
            )}
            {(phase === 'level1' || phase === 'level2' || phase === 'synthesis') && (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <p className="text-xs text-gray-300">Reconnaissance completed</p>
                </div>
                {phase === 'level1' && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                    <p className="text-xs text-gray-400">Conducting Level 1 informed searches...</p>
                  </div>
                )}
              </>
            )}
            {(phase === 'level2' || phase === 'synthesis') && (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <p className="text-xs text-gray-300">Level 1 research completed</p>
                </div>
                {phase === 'level2' && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                    <p className="text-xs text-gray-400">Deep diving with Level 2 research...</p>
                  </div>
                )}
              </>
            )}
            {phase === 'synthesis' && (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <p className="text-xs text-gray-300">Level 2 research completed</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <p className="text-xs text-gray-400">Synthesizing findings into comprehensive report...</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="bg-[#2a2a2a] rounded-lg border border-gray-800 p-3 text-center">
          <div className="text-2xl font-semibold text-white">{progressData?.insights ?? currentUpdate?.insights ?? 0}</div>
          <div className="text-xs text-gray-500">Key Insights</div>
        </div>
        <div className="bg-[#2a2a2a] rounded-lg border border-gray-800 p-3 text-center">
          <div className="text-2xl font-semibold text-white">
            {progressData?.totalSearches ?? (currentUpdate?.insights !== undefined ? 
              (phase === 'reconnaissance' ? 1 : phase === 'level1' ? 4 : phase === 'level2' ? 7 : 7) : 0)}
          </div>
          <div className="text-xs text-gray-500">Searches Completed</div>
        </div>
        <div className="bg-[#2a2a2a] rounded-lg border border-gray-800 p-3 text-center">
          <div className="text-2xl font-semibold text-white">
            {elapsedTime}s
          </div>
          <div className="text-xs text-gray-500">Time Elapsed</div>
        </div>
      </div>
    </div>
  )
}