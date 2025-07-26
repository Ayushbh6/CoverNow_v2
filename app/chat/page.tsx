'use client'

import { useState, useEffect, useRef, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { User } from '@supabase/supabase-js'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'
import { Message as AiMessage, useChat } from '@ai-sdk/react'
import { ToolInvocation } from 'ai'
import SearchResults from '@/app/components/SearchResults'
import DeepResearchProgress from '@/app/components/DeepResearchProgress'
import LifeInsuranceForm from '@/app/components/LifeInsuranceForm'
import LifeInsuranceRecommendations from '@/app/components/LifeInsuranceRecommendations'
import { ThemeToggle } from '@/components/theme-toggle'
import AudioVisualizer from '@/app/components/AudioVisualizer'

interface Conversation {
  id: string
  created_at: string
  updated_at: string
  title?: string | null
  token_count: number
}

// Function to clean up garbled emojis and format bullet points
function cleanEmojis(text: string): string {
  return text
    .replace(/ðŸ˜Š/g, '😊')
    .replace(/٩\(◕‿◕｡\)۶/g, '😊')
    .replace(/ðŸ¤–/g, '🤖')
    .replace(/ðŸ'‹/g, '👋')
    .replace(/ðŸ™‹/g, '🙋')
    .replace(/ðŸ'€/g, '👀')
    .replace(/ðŸ˜„/g, '😄')
    .replace(/ðŸ˜ƒ/g, '😃')
    .replace(/ðŸ˜€/g, '😀')
    .replace(/ðŸ™‚/g, '🙂')
    .replace(/ðŸ˜‰/g, '😉')
    .replace(/ðŸ'/g, '👍')
    .replace(/âœ¨/g, '✨')
    .replace(/ðŸŽ‰/g, '🎉')
    .replace(/ðŸš€/g, '🚀')
    .replace(/ðŸ'¡/g, '💡')
    .replace(/ðŸ"§/g, '🔧')
    .replace(/ðŸ"š/g, '📚')
    .replace(/ðŸ'»/g, '💻')
    .replace(/ðŸŒŸ/g, '🌟')
    // Format bullet points to ensure they start on new lines
    .replace(/\s*•\s*/g, '\n\n• ')         // Replace any bullet with newlines and clean spacing
    .replace(/^\n\n•/, '•')                // Remove leading newlines from first bullet
    .replace(/\n\n\n+•/g, '\n\n•')         // Prevent excessive newlines
}


export default function ChatPage() {
  const router = useRouter()
  const supabase = createClient()
  
  // Chat scrolling refs and state
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isUserScrolling, setIsUserScrolling] = useState(false)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const lastScrollTop = useRef(0)
  
  const [user, setUser] = useState<User | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  // Audio recording state
  const [isRecording, setIsRecording] = useState(false)
  const [audioAnalyser, setAudioAnalyser] = useState<AnalyserNode | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const [showTokenLimitModal, setShowTokenLimitModal] = useState(false)
  const [rollingModeAcknowledged, setRollingModeAcknowledged] = useState(false)
  
  // Track when we're waiting for the initial AI response
  const [waitingForResponse, setWaitingForResponse] = useState(false)
  
  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages: setChatMessages, error, append, status } = useChat({
    api: '/api/chat',
    maxSteps: 15, // Match the server-side maxSteps
    headers: rollingModeAcknowledged ? {
      'x-rolling-mode-acknowledged': 'true'
    } : undefined,
    body: {
      conversationId: currentConversation?.id
    },
    onFinish: () => {
      loadConversations()
      setWaitingForResponse(false)
    },
    onError: (error) => {
      setWaitingForResponse(false)
      try {
        const errorData = JSON.parse(error.message)
        if (errorData.error === 'Token limit reached') {
          setShowTokenLimitModal(true)
        }
      } catch {
        console.error('Chat error:', error)
      }
    },
    onResponse: async (response) => {
      // Check for token limit warning
      if (response.status === 200) {
        // Don't try to parse streaming responses
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          try {
            const data = await response.clone().json()
            if (data.warning === 'token_limit_approaching') {
              setShowTokenLimitModal(true)
            }
          } catch {
            // Not a JSON response, continue normally
          }
        }
      }
    },
    initialMessages: [],
  })

  // Monitor status changes to clear waiting state when streaming starts
  useEffect(() => {
    if (status === 'streaming' || status === 'ready') {
      setWaitingForResponse(false)
    }
  }, [status])

  // Check auth and load conversations
  useEffect(() => {
    checkAuth()
    loadConversations()
    
    // Restore sidebar state from localStorage
    const savedSidebarState = localStorage.getItem('sidebarCollapsed')
    if (savedSidebarState !== null) {
      setSidebarCollapsed(JSON.parse(savedSidebarState))
    }
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        // Clear stored conversation on sign out
        sessionStorage.removeItem('currentConversationId')
        router.push('/auth')
      } else if (event === 'SIGNED_IN' && session) {
        setUser(session.user)
        // Only clear conversation if it's a fresh sign in (no stored conversation)
        const storedConvId = sessionStorage.getItem('currentConversationId')
        if (!storedConvId) {
          setCurrentConversation(null)
          setChatMessages([])
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Persist current conversation ID
  useEffect(() => {
    if (currentConversation) {
      sessionStorage.setItem('currentConversationId', currentConversation.id)
    }
  }, [currentConversation])

  // Restore conversation on mount
  useEffect(() => {
    if (conversations.length > 0) {
      const savedConversationId = sessionStorage.getItem('currentConversationId')
      if (savedConversationId) {
        const savedConversation = conversations.find(c => c.id === savedConversationId)
        if (savedConversation) {
          selectConversation(savedConversation)
        } else {
          // If the saved conversation no longer exists, clear it
          sessionStorage.removeItem('currentConversationId')
        }
      }
    }
  }, [conversations])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.email_confirmed_at) {
      router.push('/auth')
    } else {
      setUser(user)
    }
  }

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false })

    if (!error && data) {
      const conversationsWithMessages = []
      
      for (const conv of data) {
        const { data: messages } = await supabase
          .from('messages')
          .select('id')
          .eq('conversation_id', conv.id)
          .limit(1)
        
        if (messages && messages.length > 0) {
          conversationsWithMessages.push(conv)
        }
      }
      setConversations(conversationsWithMessages)
    }
  }

  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (!error && data) {
      const cleanedMessages: AiMessage[] = data.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: cleanEmojis(msg.content),
        createdAt: new Date(msg.created_at),
        // Map tool_calls from database to toolInvocations format
        toolInvocations: msg.tool_calls ? msg.tool_calls.map((toolCall: any) => ({
          toolCallId: toolCall.toolCallId,
          toolName: toolCall.toolName,
          args: toolCall.args,
          result: toolCall.result
        })) : undefined,
        // The 'parts' property is part of the new SDK, so we'll map to it
        // For now, we'll just put the content in a text part.
        // This will be enhanced later for proper tool rendering.
        parts: [{ type: 'text', text: cleanEmojis(msg.content) }] 
      }));
      setChatMessages(cleanedMessages)
    }
  }

  // Simple and direct scroll management
  const scrollToUserMessage = () => {
    const container = messagesContainerRef.current
    if (!container) return

    // Find the last user message element
    const messageElements = container.querySelectorAll('[data-message-role="user"]')
    const lastUserMessageElement = messageElements[messageElements.length - 1]
    
    if (lastUserMessageElement) {
      // Position the user message at the very top with minimal padding
      // This ensures maximum space below for AI streaming
      const containerRect = container.getBoundingClientRect()
      const messageRect = lastUserMessageElement.getBoundingClientRect()
      const targetScrollTop = container.scrollTop + messageRect.top - containerRect.top - 20 // Minimal padding to maximize AI response space
      
      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth'
      })
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const isNearBottom = () => {
    const container = messagesContainerRef.current
    if (!container) return true
    
    const threshold = 150 // pixels from bottom
    const { scrollTop, scrollHeight, clientHeight } = container
    return scrollHeight - scrollTop - clientHeight < threshold
  }

  const handleScroll = () => {
    const container = messagesContainerRef.current
    if (!container) return

    const currentScrollTop = container.scrollTop
    const nearBottom = isNearBottom()

    // Simple scroll state management
    setIsUserScrolling(!nearBottom)
    setShouldAutoScroll(nearBottom)

    lastScrollTop.current = currentScrollTop
  }

  // Direct scroll management for messages
  useEffect(() => {
    if (messages.length === 0) return

    const lastMessage = messages[messages.length - 1]

    // ALWAYS scroll user messages to top - this eliminates jarring
    if (lastMessage.role === 'user') {
      // Immediate scroll to ensure user message appears at top
      // Use requestAnimationFrame for smooth DOM updates
      requestAnimationFrame(() => {
        setTimeout(() => {
          scrollToUserMessage()
          // Mark that we're not manually scrolling since we positioned the user message
          setIsUserScrolling(false)
          setShouldAutoScroll(true)
        }, 10) // Minimal delay for DOM update
      })
    }
    // For AI responses, scroll to show the AI message starting right after user message
    else if (lastMessage.role === 'assistant') {
      const container = messagesContainerRef.current
      if (!container) return
      
      // Small delay to ensure DOM is updated with new message
      requestAnimationFrame(() => {
        setTimeout(() => {
          const aiMessageElements = container.querySelectorAll('[data-message-role="assistant"]')
          const lastAiMessageElement = aiMessageElements[aiMessageElements.length - 1] as HTMLElement
          
          if (lastAiMessageElement && shouldAutoScroll) {
            const containerRect = container.getBoundingClientRect()
            const messageRect = lastAiMessageElement.getBoundingClientRect()
            
            // Check if AI message is below the viewport
            if (messageRect.top > containerRect.bottom - 100) {
              // Scroll to show AI message with some padding from top
              const targetScrollTop = container.scrollTop + messageRect.top - containerRect.top - 40
              
              container.scrollTo({
                top: targetScrollTop,
                behavior: 'smooth'
              })
            }
            
            // For streaming responses, keep scrolling to bottom
            if (isLoading && shouldAutoScroll && !isUserScrolling) {
              scrollToBottom()
            }
          }
        }, 50) // Small delay for DOM update
      })
    }
  }, [messages, isLoading, shouldAutoScroll, isUserScrolling])

  // Separate effect for continuous scrolling during streaming
  useEffect(() => {
    if (!isLoading || !shouldAutoScroll || isUserScrolling) return
    
    // Set up interval to keep scrolling during streaming
    const scrollInterval = setInterval(() => {
      const container = messagesContainerRef.current
      if (container && shouldAutoScroll && !isUserScrolling) {
        // Check if we're near bottom before scrolling
        const nearBottom = isNearBottom()
        if (nearBottom) {
          scrollToBottom()
        }
      }
    }, 100) // Check every 100ms
    
    return () => clearInterval(scrollInterval)
  }, [isLoading, shouldAutoScroll, isUserScrolling])

  // Audio recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Create audio context and analyser for visualization
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      setAudioAnalyser(analyser)
      
      // Create media recorder - try different formats
      let mimeType = 'audio/webm;codecs=opus' // Default
      
      // Try to find the best supported format
      const mimeTypes = [
        'audio/mp4',
        'audio/mpeg',
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus'
      ]
      
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type
          break
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm'
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
        await transcribeAudio(audioBlob)
        
        // Clean up
        stream.getTracks().forEach(track => track.stop())
        audioContext.close()
      }
      
      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Could not access microphone. Please check your permissions.')
    }
  }
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setAudioAnalyser(null)
    }
  }
  
  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData()
      
      // Determine file extension based on mime type
      const mimeType = audioBlob.type
      let extension = 'webm'
      if (mimeType.includes('mp4')) extension = 'mp4'
      else if (mimeType.includes('mpeg')) extension = 'mp3'
      else if (mimeType.includes('ogg')) extension = 'ogg'
      
      formData.append('audio', audioBlob, `recording.${extension}`)
      
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error('Transcription failed')
      }
      
      const { text } = await response.json()
      
      // Set the transcribed text in the input field
      handleInputChange({ target: { value: text } } as any)
    } catch (error) {
      console.error('Error transcribing audio:', error)
      alert('Failed to transcribe audio. Please try again.')
    }
  }
  
  const handleMicClick = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    try {
      if (!user) {
        throw new Error('User not authenticated')
      }

      let conversationId = currentConversation?.id
      const userMessageContent = input

      // Create conversation if it doesn't exist (first message)
      if (!conversationId) {
        const conversationTitle = userMessageContent.slice(0, 50) + (userMessageContent.length > 50 ? '...' : '')
        
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({ 
            user_id: user.id,
            title: conversationTitle
          })
          .select()
          .single()

        if (convError) throw convError
        
        conversationId = newConv.id
        setCurrentConversation(newConv)
      }

      // Save the user's message to the database first
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'user',
          content: userMessageContent
        })

      if (msgError) throw msgError

      // Set waiting state when submitting
      setWaitingForResponse(true)

      // Check if we have form data to include
      const formData = (window as any).__tempFormData;
      if (formData) {
        // Clear the temp data
        delete (window as any).__tempFormData;
        
        handleSubmit(e, {
          body: {
            conversationId: conversationId,
            formData: formData
          }
        })
      } else {
        handleSubmit(e, {
          body: {
            conversationId: conversationId
          }
        })
      }
    } catch (error: any) {
      console.error('Error sending message:', error)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const form = (e.target as HTMLInputElement).form
      if (form) {
        form.requestSubmit()
      }
    }
  }

  const selectConversation = async (conv: Conversation) => {
    setCurrentConversation(conv)
    await loadMessages(conv.id)
    // Reset token limit modal when switching conversations
    setShowTokenLimitModal(false)
    setRollingModeAcknowledged(false) // Reset for new conversation
  }

  const deleteConversation = async (convId: string) => {
    await supabase.from('conversations').delete().eq('id', convId)
    await loadConversations()
    if (currentConversation?.id === convId) {
      setCurrentConversation(null)
      setChatMessages([])
      sessionStorage.removeItem('currentConversationId')
    }
    setShowDeleteConfirm(null)
  }

  const renameConversation = async (convId: string) => {
    if (!editingTitle.trim()) return
    
    const { error } = await supabase
      .from('conversations')
      .update({ title: editingTitle.trim() })
      .eq('id', convId)
    
    if (!error) {
      await loadConversations()
    }
    
    setEditingConversationId(null)
    setEditingTitle('')
  }

  const getConversationTitle = (conv: Conversation) => {
    return conv.title || 'New conversation'
  }

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed
    setSidebarCollapsed(newState)
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState))
  }

  const signOut = async () => {
    sessionStorage.removeItem('currentConversationId')
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <div className="flex h-screen bg-white dark:bg-[#1A1A1A] transition-colors">
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-0' : 'w-64'} bg-gray-50 dark:bg-[#2D2D2D] border-r border-gray-200 dark:border-gray-800/30 flex flex-col shadow-sm transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0`}>
        {/* Header with new chat button and theme toggle */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">CoverNow</h2>
            <ThemeToggle />
          </div>
          <button
            onClick={() => {
              setCurrentConversation(null)
              setChatMessages([])
              sessionStorage.removeItem('currentConversationId')
            }}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 bg-[#22C55E] text-white rounded-xl hover:bg-[#16A34A] transition-all duration-150 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm font-semibold">New chat</span>
          </button>
        </div>

        {/* Navigation */}
        <div className="px-4 space-y-1">
          <button className="w-full flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-150">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-sm font-medium">Chats</span>
          </button>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto mt-4">
          <div className="px-4 mb-2">
            <h3 className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wide">Recent</h3>
          </div>
          <div className="space-y-1 px-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group relative flex items-center gap-2 px-3 py-2 text-sm rounded-xl cursor-pointer transition-all duration-150 min-w-0 ${
                  currentConversation?.id === conv.id 
                    ? 'bg-[#22C55E]/10 dark:bg-[#22C55E]/20 text-[#22C55E] dark:text-[#22C55E] font-medium shadow-sm' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                }`}
              >
                {editingConversationId === conv.id ? (
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={() => renameConversation(conv.id)}
                    onKeyDown={(e) => e.key === 'Enter' && renameConversation(conv.id)}
                    className="flex-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1 rounded-lg text-sm border border-gray-200 dark:border-gray-600 focus:border-[#22C55E] focus:outline-none focus:ring-2 focus:ring-[#22C55E]/20"
                    autoFocus
                  />
                ) : (
                  <>
                    <div
                      className="flex-1 truncate min-w-0"
                      onClick={() => selectConversation(conv)}
                    >
                      {getConversationTitle(conv)}
                    </div>
                    <div className="hidden group-hover:flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingConversationId(conv.id)
                          setEditingTitle(getConversationTitle(conv))
                        }}
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-150"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(conv.id)}
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-150"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </>
                )}
                {showDeleteConfirm === conv.id && (
                  <div className="absolute right-0 top-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 z-10 shadow-lg">
                    <p className="text-xs mb-2 text-gray-700 dark:text-gray-300 font-medium">Delete this chat?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => deleteConversation(conv.id)}
                        className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors duration-150 font-medium"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(null)}
                        className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white text-xs rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-150 font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* User section */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700/50">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl transition-all duration-150"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-[#22C55E] to-[#16A34A] rounded-full flex items-center justify-center shadow-md">
              <span className="text-xs font-semibold text-white">{user?.email?.[0].toUpperCase()}</span>
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold text-gray-800 dark:text-gray-200">{user?.user_metadata?.first_name} {user?.user_metadata?.last_name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Sign out</div>
            </div>
          </button>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-[#1A1A1A] relative">
        {/* Sidebar toggle button */}
        <button
          onClick={toggleSidebar}
          className="absolute top-4 left-4 z-20 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md hover:shadow-lg transition-all duration-150 hover:bg-gray-50 dark:hover:bg-gray-700"
          title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {sidebarCollapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            )}
          </svg>
        </button>
        {/* Subtle texture overlay for premium feel */}
        <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        
        {/* Messages area */}
        <div 
          ref={messagesContainerRef}
          className={`flex-1 overflow-y-auto relative ${sidebarCollapsed ? 'pt-16' : 'pt-4'} transition-all duration-300`}
          onScroll={handleScroll}
        >
          {/* Extended conversation mode indicator */}
          {currentConversation && currentConversation.token_count >= 200000 && rollingModeAcknowledged && (
            <div className="sticky top-0 z-10 bg-amber-50 dark:bg-amber-900/20 backdrop-blur-sm border-b border-amber-200 dark:border-amber-800/50 px-4 py-2">
              <div className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1 max-w-5xl mx-auto">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>Extended conversation mode - older messages are being removed to maintain quality</span>
              </div>
            </div>
          )}
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="w-20 h-20 mb-8 relative">
                {/* Premium emerald circle with subtle shadow */}
                <div className="w-full h-full bg-gradient-to-br from-[#22C55E] to-[#16A34A] rounded-full shadow-xl transform transition-transform duration-300 hover:scale-105"></div>
                <div className="absolute inset-0 bg-white/20 rounded-full blur-xl"></div>
              </div>
              <h2 className="text-3xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
                {user?.user_metadata?.first_name 
                  ? `Hi ${user.user_metadata.first_name}! Say Hi to Aria` 
                  : "Hi! Say Hi to Aria"}
              </h2>
            </div>
          ) : (
            <div className="py-8">
              {messages.map((message) => {
                // Check if this message has web search results
                const hasWebSearch = message.role === 'assistant' && 
                  message.toolInvocations?.some(inv => inv.toolName === 'webSearchFast' && 'result' in inv && inv.result?.success);

                // Check if this message has a deep research tool invocation
                const hasDeepResearch = message.role === 'assistant' &&
                  message.toolInvocations?.some(inv => 
                    inv.toolName === 'deepResearchInit' || 
                    inv.toolName === 'deepResearchLevel1' || 
                    inv.toolName === 'deepResearchLevel2' || 
                    inv.toolName === 'deepResearchSynthesize'
                  );
                  
                // Check if this message has life insurance recommendations
                const hasLifeInsuranceRecommendations = message.role === 'assistant' &&
                  message.toolInvocations?.some(inv => 
                    inv.toolName === 'showLifeInsuranceRecommendations' && 
                    'result' in inv && 
                    inv.result?.status === 'ready'
                  );

                return (
                  <div
                    key={message.id}
                    data-message-role={message.role}
                    className={`mb-8 ${!hasWebSearch && !hasLifeInsuranceRecommendations ? 'max-w-5xl mx-auto px-6' : ''} ${message.role === 'assistant' ? '' : 'flex justify-end'}`}
                  >
                    {message.role === 'assistant' ? (
                      <>
                        <div className={`flex gap-4 ${hasWebSearch || hasLifeInsuranceRecommendations ? 'max-w-5xl mx-auto px-6' : ''}`}>
                          <div className="w-9 h-9 bg-gradient-to-br from-[#22C55E] to-[#16A34A] rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                            <span className="text-xs font-bold text-white">A</span>
                          </div>
                          <div className="flex-1">
                            {/* Only render message content if it's NOT showing deep research final results or life insurance recommendations */}
                            {!(hasDeepResearch && message.toolInvocations?.some(inv => 
                              inv.toolName === 'deepResearchSynthesize' && 'result' in inv && inv.result?.success
                            )) && !hasLifeInsuranceRecommendations && message.content && (
                              <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/30 text-gray-800 dark:text-gray-100 prose prose-sm prose-gray dark:prose-invert max-w-none
                                prose-p:leading-relaxed prose-pre:bg-gray-50 dark:prose-pre:bg-gray-900/50 prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700/50
                                prose-code:text-[#22C55E] prose-code:bg-gray-100 dark:prose-code:bg-gray-800/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:font-medium
                                prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-em:text-gray-700 dark:prose-em:text-gray-300
                                prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
                                prose-ul:list-disc prose-ol:list-decimal prose-li:marker:text-[#22C55E]
                                prose-blockquote:border-[#22C55E] prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400
                                prose-a:text-[#22C55E] prose-a:underline hover:prose-a:text-[#16A34A] prose-a:font-medium">
                                <ReactMarkdown 
                                  remarkPlugins={[remarkGfm]}
                                  rehypePlugins={[rehypeHighlight]}
                                >
                                  {cleanEmojis(message.content)}
                                </ReactMarkdown>
                              </div>
                            )}
                            {((isLoading && messages[messages.length - 1].id === message.id) || 
                              (message.role === 'assistant' && message.content === '')) && (
                              <div className="mt-3">
                                <div className="w-3 h-3 bg-[#22C55E] rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Render tool invocations outside of the max-width container for web search */}
                        {message.toolInvocations?.map((toolInvocation: ToolInvocation) => {
                          const toolCallId = toolInvocation.toolCallId;

                          // Render web search results
                          if (toolInvocation.toolName === 'webSearchFast') {
                            return 'result' in toolInvocation ? (
                              toolInvocation.result?.success ? (
                                <div key={toolCallId} className="mt-4">
                                  <SearchResults
                                    query={toolInvocation.result.query}
                                    results={toolInvocation.result.results}
                                    answer={toolInvocation.result.answer}
                                  />
                                </div>
                              ) : (
                                <div key={toolCallId} className="mt-2 max-w-5xl mx-auto px-6">
                                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <p className="text-sm text-red-400">
                                      Search failed: {toolInvocation.result?.error || 'Unknown error'}
                                    </p>
                                  </div>
                                </div>
                              )
                            ) : (
                              <div key={toolCallId} className="mt-2 max-w-5xl mx-auto px-6">
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                  <div className="w-4 h-4 bg-[#22C55E]/20 rounded-full flex items-center justify-center">
                                    <div className="w-2 h-2 bg-[#22C55E] rounded-full animate-pulse" />
                                  </div>
                                  <span className="font-medium">Aria is finding information...</span>
                                </div>
                              </div>
                            );
                          }

                          // Render deep research progress and results
                          if (toolInvocation.toolName === 'deepResearchInit') {
                            // Check if synthesis is complete for this message
                            const hasSynthesisComplete = message.toolInvocations?.some(inv => 
                              inv.toolName === 'deepResearchSynthesize' && 'result' in inv && inv.result?.success
                            );
                            
                            return 'result' in toolInvocation ? (
                              toolInvocation.result?.success ? (
                                !hasSynthesisComplete ? (
                                  <div key={toolCallId} className="mt-2 max-w-5xl mx-auto px-6">
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                      <div className="w-4 h-4 bg-[#22C55E]/20 rounded-full flex items-center justify-center">
                                        <div className="w-2 h-2 bg-[#22C55E] rounded-full animate-pulse" />
                                      </div>
                                      <span>Performing deep research...</span>
                                    </div>
                                  </div>
                                ) : null
                              ) : (
                                <div key={toolCallId} className="mt-2 max-w-5xl mx-auto px-6">
                                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <p className="text-sm text-red-400">
                                      Failed to start research: {toolInvocation.result?.error || 'Unknown error'}
                                    </p>
                                  </div>
                                </div>
                              )
                            ) : (
                              <div key={toolCallId} className="mt-4">
                                <DeepResearchProgress 
                                  query={toolInvocation.args?.query || 'Initializing research...'}
                                  phase="reconnaissance"
                                  progressData={'result' in toolInvocation && (toolInvocation.result as any).progress ? 
                                    { insights: (toolInvocation.result as any).progress.insights, totalSearches: (toolInvocation.result as any).progress.totalSearches } : 
                                    undefined}
                                />
                              </div>
                            );
                          }

                          if (toolInvocation.toolName === 'deepResearchLevel1' || toolInvocation.toolName === 'deepResearchLevel2') {
                            return 'result' in toolInvocation ? (
                              toolInvocation.result?.success ? null : (
                                <div key={toolCallId} className="mt-2 max-w-5xl mx-auto px-6">
                                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <p className="text-sm text-red-400">
                                      Research phase failed: {toolInvocation.result?.error || 'Unknown error'}
                                    </p>
                                  </div>
                                </div>
                              )
                            ) : (
                              <div key={toolCallId} className="mt-4">
                                <DeepResearchProgress 
                                  query={message.toolInvocations?.find(inv => inv.toolName === 'deepResearchInit')?.args?.query || 'Researching...'}
                                  phase={toolInvocation.toolName === 'deepResearchLevel1' ? 'level1' : 'level2'}
                                  progressData={'result' in toolInvocation && (toolInvocation.result as any).progress ? 
                                    { insights: (toolInvocation.result as any).progress.insights, totalSearches: (toolInvocation.result as any).progress.totalSearches } : 
                                    undefined}
                                />
                              </div>
                            );
                          }

                          if (toolInvocation.toolName === 'deepResearchSynthesize') {
                            return 'result' in toolInvocation ? (
                              toolInvocation.result?.success ? (
                                <div key={toolCallId} className="mt-4 max-w-4xl mx-auto px-4">
                                  {/* Show the final report in markdown */}
                                  <div className="prose prose-invert max-w-none
                                    prose-p:leading-relaxed prose-pre:bg-gray-800/50 prose-pre:border prose-pre:border-gray-700/50
                                    prose-code:text-[#22C55E] prose-code:bg-gray-800/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                                    prose-strong:text-[#22C55E] prose-em:text-[#22C55E]/80
                                    prose-headings:text-[#22C55E] prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
                                    prose-ul:list-disc prose-ol:list-decimal prose-li:marker:text-[#22C55E]
                                    prose-blockquote:border-[#22C55E] prose-blockquote:text-gray-300
                                    prose-a:text-[#22C55E] prose-a:underline hover:prose-a:text-[#22C55E]/80
                                    prose-table:border-collapse prose-table:w-full
                                    prose-th:border prose-th:border-gray-700/50 prose-th:px-3 prose-th:py-2 prose-th:bg-gray-800/50 prose-th:text-[#22C55E]
                                    prose-td:border prose-td:border-gray-700/50 prose-td:px-3 prose-td:py-2">
                                    <ReactMarkdown 
                                      remarkPlugins={[remarkGfm]}
                                      rehypePlugins={[rehypeHighlight]}
                                    >
                                      {toolInvocation.result.report}
                                    </ReactMarkdown>
                                  </div>
                                  
                                  {/* Show research stats */}
                                  <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-700/50">
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-gray-600 dark:text-gray-400">
                                        Research completed in {toolInvocation.result.duration}s
                                      </span>
                                      <span className="text-gray-600 dark:text-gray-400">
                                        {toolInvocation.result.totalSearches} searches • {toolInvocation.result.findings.keyInsights.length} insights
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {/* Show sources */}
                                  {toolInvocation.result.findings.sources && toolInvocation.result.findings.sources.length > 0 && (
                                    <div className="mt-6">
                                      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">Sources</h3>
                                      <div className="relative">
                                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
                                          {toolInvocation.result.findings.sources.map((source: any, idx: number) => (
                                            <div key={idx} className="flex-none w-80">
                                              <a 
                                                href={source.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="block p-4 bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-700/50 hover:border-emerald-500/50 dark:hover:border-emerald-500/30 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all h-full hover:shadow-lg hover:shadow-emerald-500/10 shadow-sm"
                                              >
                                                <div className="flex items-start justify-between mb-2">
                                                  <div className="flex items-center gap-2 flex-1">
                                                    <img 
                                                      src={`https://www.google.com/s2/favicons?domain=${new URL(source.url).hostname}&sz=16`} 
                                                      alt="" 
                                                      className="w-4 h-4 flex-shrink-0"
                                                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                                    />
                                                    <p className="text-xs text-gray-600 dark:text-gray-500 truncate">
                                                      {new URL(source.url).hostname}
                                                    </p>
                                                  </div>
                                                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                                                    {Math.round(source.relevance * 100)}%
                                                  </span>
                                                </div>
                                                <h4 className="text-sm font-medium text-[#22C55E] hover:text-[#22C55E]/80 line-clamp-2">
                                                  {source.title}
                                                </h4>
                                              </a>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div key={toolCallId} className="mt-2 max-w-5xl mx-auto px-6">
                                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <p className="text-sm text-red-400">
                                      Deep research failed: {toolInvocation.result?.error || 'Unknown error'}
                                    </p>
                                  </div>
                                </div>
                              )
                            ) : (
                              <div key={toolCallId} className="mt-4">
                                <DeepResearchProgress 
                                  query={message.toolInvocations?.find(inv => inv.toolName === 'deepResearchInit')?.args?.query || 'Synthesizing research...'}
                                  phase="synthesis"
                                  progressData={'result' in toolInvocation && (toolInvocation.result as any).progress ? 
                                    { insights: (toolInvocation.result as any).progress.insights, totalSearches: (toolInvocation.result as any).progress.totalSearches } : 
                                    undefined}
                                />
                              </div>
                            );
                          }

                          // Handle collectLifeInsuranceInfo tool
                          if (toolInvocation.toolName === 'collectLifeInsuranceInfo') {
                            return 'result' in toolInvocation ? (
                              toolInvocation.result?.status === 'needs_input' ? (
                                <div key={toolCallId} className="mt-4">
                                  <LifeInsuranceForm
                                    userData={toolInvocation.result.userData}
                                    fieldsToShow={toolInvocation.result.fieldsToShow || []}
                                    sessionId={toolInvocation.result.sessionId || ''}
                                    onSubmit={async (data) => {
                                      console.log('[LifeInsurance] Form submission with data:', data);
                                      
                                      // Save the data to the database
                                      const supabase = createClient();
                                      const { data: { user } } = await supabase.auth.getUser();
                                      
                                      if (user) {
                                        // Update user profile with the form data
                                        const { error } = await supabase
                                          .from('user_profile')
                                          .update({
                                            ...data.formData,
                                            updated_at: new Date().toISOString()
                                          })
                                          .eq('user_id', user.id);
                                          
                                        if (!error) {
                                          // Tell the AI to show recommendations
                                          append({
                                            role: 'user',
                                            content: "I've submitted my life insurance information. Please show me personalized recommendations."
                                          });
                                        } else {
                                          console.error('Error updating profile:', error);
                                        }
                                      }
                                    }}
                                  />
                                </div>
                              ) : toolInvocation.result?.status === 'ready' ? (
                                <div key={toolCallId} className="mt-4">
                                  <LifeInsuranceRecommendations
                                    recommendations={toolInvocation.result.recommendations || []}
                                    userData={toolInvocation.result.userData}
                                  />
                                </div>
                              ) : (
                                <div key={toolCallId} className="mt-2 max-w-5xl mx-auto px-6">
                                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <p className="text-sm text-red-400">
                                      Failed to process insurance request: {toolInvocation.result?.error || 'Unknown error'}
                                    </p>
                                  </div>
                                </div>
                              )
                            ) : (
                              <div key={toolCallId} className="mt-2 max-w-5xl mx-auto px-6">
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <div className="w-4 h-4 bg-[#22C55E]/20 rounded-full flex items-center justify-center">
                                    <div className="w-2 h-2 bg-[#22C55E] rounded-full animate-pulse" />
                                  </div>
                                  <span>Aria is preparing insurance quotes...</span>
                                </div>
                              </div>
                            );
                          }
                          
                          // Handle showLifeInsuranceRecommendations tool  
                          if (toolInvocation.toolName === 'showLifeInsuranceRecommendations') {
                            return 'result' in toolInvocation ? (
                              toolInvocation.result?.status === 'ready' ? (
                                <div key={toolCallId} className="mt-4">
                                  <LifeInsuranceRecommendations
                                    recommendations={toolInvocation.result.recommendations || []}
                                    userData={toolInvocation.result.userData}
                                  />
                                </div>
                              ) : toolInvocation.result?.status === 'incomplete_profile' ? (
                                <div key={toolCallId} className="mt-2 text-sm text-[#22C55E]">
                                  {toolInvocation.result.error}
                                </div>
                              ) : (
                                <div key={toolCallId} className="mt-2 text-sm text-red-400">
                                  Error: {toolInvocation.result?.error || 'Unknown error'}
                                </div>
                              )
                            ) : (
                              <div key={toolCallId} className="mt-2 text-sm text-gray-500">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                  Aria is generating your personalized recommendations...
                                </div>
                              </div>
                            );
                          }

                          // Other tools - show friendly status messages that hide after completion
                          const toolMessages: Record<string, { pending: string; completed: string }> = {
                            updateUserProfile: {
                              pending: 'Aria is updating your profile...',
                              completed: '✓ Profile updated'
                            },
                            manageUserIssues: {
                              pending: 'Aria is updating your health conditions...',
                              completed: '✓ Health conditions updated'
                            },
                            handleConfirmationResponse: {
                              pending: 'Processing your response...',
                              completed: '✓ Response processed'
                            },
                            deepResearchInit: {
                              pending: 'Aria is starting deep research...',
                              completed: '✓ Research initialized'
                            },
                            deepResearchLevel1: {
                              pending: 'Aria is conducting Level 1 research...',
                              completed: '✓ Level 1 research completed'
                            },
                            deepResearchLevel2: {
                              pending: 'Aria is conducting Level 2 deep dive...',
                              completed: '✓ Level 2 research completed'
                            },
                            deepResearchSynthesize: {
                              pending: 'Aria is generating comprehensive report...',
                              completed: '✓ Deep research completed'
                            },
                            collectLifeInsuranceInfo: {
                              pending: 'Aria is preparing your insurance form...',
                              completed: '✓ Insurance form ready'
                            },
                            showLifeInsuranceRecommendations: {
                              pending: 'Aria is analyzing your insurance needs...',
                              completed: '✓ Insurance recommendations ready'
                            },
                            calculator: {
                              pending: 'Aria is calculating...',
                              completed: '✓ Calculation completed'
                            }
                          };

                          const toolStatusMessages = toolMessages[toolInvocation.toolName] || {
                            pending: `Processing ${toolInvocation.toolName}...`,
                            completed: `✓ ${toolInvocation.toolName} completed`
                          };

                          // Only show tool status if this message is still loading (hide after AI responds)
                          const isMessageLoading = isLoading && messages[messages.length - 1].id === message.id;
                          if (!isMessageLoading && 'result' in toolInvocation) {
                            return null;
                          }

                          return (
                            <div key={toolCallId} className="max-w-5xl mx-auto px-6">
                              <div className={`mt-2 flex items-center gap-2 text-sm transition-opacity duration-300 ${
                                'result' in toolInvocation ? 'text-green-500' : 'text-gray-500'
                              }`}>
                                {'result' in toolInvocation ? (
                                  <>
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span>{toolStatusMessages.completed}</span>
                                  </>
                                ) : (
                                  <>
                                    <div className="w-4 h-4 bg-gray-600/20 rounded-full flex items-center justify-center">
                                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" />
                                    </div>
                                    <span>{toolStatusMessages.pending}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    ) : (
                      <div className="max-w-[70%]">
                        <div className="bg-gradient-to-br from-[#22C55E] to-[#16A34A] text-white px-5 py-3.5 rounded-2xl shadow-md">
                          <p className="text-[15px] font-medium leading-relaxed">{message.content}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Show loading orb immediately after user message when waiting for response */}
              {waitingForResponse && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                <div className="mb-10 max-w-5xl mx-auto px-6">
                  <div className="flex gap-4">
                    <div className="w-9 h-9 bg-gradient-to-br from-[#22C55E] to-[#16A34A] rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                      <span className="text-xs font-bold text-white">A</span>
                    </div>
                    <div className="flex-1">
                      <div className="mt-3">
                        <div className="w-3 h-3 bg-[#22C55E] rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
          
          {/* Scroll to bottom button */}
          {isUserScrolling && !shouldAutoScroll && (
            <div className="absolute bottom-4 right-4">
              <button
                onClick={() => {
                  setShouldAutoScroll(true)
                  setIsUserScrolling(false)
                  scrollToBottom()
                }}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-3 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-[#22C55E] dark:hover:border-[#22C55E] transition-all duration-150 shadow-lg hover:shadow-xl"
                title="Scroll to bottom"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-gray-200 dark:border-gray-800/30 p-5 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
          <form onSubmit={handleFormSubmit} className="max-w-5xl mx-auto">
            <div className="relative flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 shadow-md hover:shadow-lg transition-shadow duration-150">
              {/* Mic button */}
              <button
                type="button"
                onClick={handleMicClick}
                className={`p-2 rounded-xl transition-all duration-150 ${
                  isRecording ? 'bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white shadow-md animate-pulse' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>

              {/* Audio Visualizer or Text input */}
              {isRecording ? (
                <div className="flex-1 flex items-center gap-3">
                  <AudioVisualizer analyser={audioAnalyser} isRecording={isRecording} />
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-150"
                    title="Cancel recording"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <input
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={currentConversation?.token_count && currentConversation.token_count >= 200000 
                    ? "Context limit reached. Start a new chat to continue." 
                    : "Message Aria..."}
                  className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none text-[15px]"
                  disabled={isLoading || (!!currentConversation?.token_count && currentConversation.token_count >= 200000 && !rollingModeAcknowledged)}
                />
              )}

              {/* Send button */}
              <button
                type="submit"
                disabled={isLoading || !input.trim() || (!!currentConversation?.token_count && currentConversation.token_count >= 200000 && !rollingModeAcknowledged)}
                className={`p-2 rounded-xl transition-all duration-150 transform ${
                  input.trim() && !isLoading && (!currentConversation || !currentConversation.token_count || currentConversation.token_count < 200000 || rollingModeAcknowledged)
                    ? 'bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white hover:shadow-md active:scale-95'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
              Aria can make mistakes. Please double-check responses.
            </p>
          </form>
        </div>

        {/* Token Limit Modal */}
        {showTokenLimitModal && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full shadow-2xl transform transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 text-amber-600 dark:text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Conversation Limit Reached</h3>
              </div>
              <button
                onClick={() => setShowTokenLimitModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              You've reached the conversation limit. For best results, start a new chat.
              <br />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                You can also continue here (quality might suffer)
              </span>
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setCurrentConversation(null)
                  setChatMessages([])
                  setShowTokenLimitModal(false)
                  setRollingModeAcknowledged(false)
                  sessionStorage.removeItem('currentConversationId')
                }}
                className="flex-1 bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white py-2.5 px-4 rounded-xl hover:shadow-lg transition-all duration-150 font-semibold transform hover:scale-[1.02]"
              >
                Start New Chat
              </button>
              <button
                onClick={() => {
                  setRollingModeAcknowledged(true)
                  setShowTokenLimitModal(false)
                }}
                className="flex-1 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-2.5 px-4 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-150 font-medium"
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}