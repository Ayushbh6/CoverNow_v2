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

interface Conversation {
  id: string
  created_at: string
  updated_at: string
  title?: string | null
  token_count: number
}

// Function to clean up garbled emojis
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
  const [isMicOn, setIsMicOn] = useState(false)
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  const [showTokenLimitModal, setShowTokenLimitModal] = useState(false)
  const [rollingModeAcknowledged, setRollingModeAcknowledged] = useState(false)
  
  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages: setChatMessages, error, append } = useChat({
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
    },
    onError: (error) => {
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

  // Check auth and load conversations
  useEffect(() => {
    checkAuth()
    loadConversations()
    
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

  const signOut = async () => {
    sessionStorage.removeItem('currentConversationId')
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <div className="flex h-screen bg-[#212121]">
      {/* Sidebar */}
      <div className="w-64 bg-[#171717] border-r border-gray-800 flex flex-col">
        {/* New chat button */}
        <div className="p-4">
          <button
            onClick={() => {
              setCurrentConversation(null)
              setChatMessages([])
              sessionStorage.removeItem('currentConversationId')
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm">New chat</span>
          </button>
        </div>

        {/* Navigation */}
        <div className="px-4 space-y-1">
          <button className="w-full flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-sm">Chats</span>
          </button>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto mt-4">
          <div className="px-4 mb-2">
            <h3 className="text-xs text-gray-500 uppercase">Recent</h3>
          </div>
          <div className="space-y-1 px-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group relative flex items-center gap-2 px-2 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg cursor-pointer transition-colors ${
                  currentConversation?.id === conv.id ? 'bg-gray-800' : ''
                }`}
              >
                {editingConversationId === conv.id ? (
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={() => renameConversation(conv.id)}
                    onKeyDown={(e) => e.key === 'Enter' && renameConversation(conv.id)}
                    className="flex-1 bg-gray-700 text-white px-2 py-1 rounded text-sm"
                    autoFocus
                  />
                ) : (
                  <>
                    <div
                      className="flex-1 truncate"
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
                        className="p-1 hover:bg-gray-700 rounded"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(conv.id)}
                        className="p-1 hover:bg-gray-700 rounded"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </>
                )}
                {showDeleteConfirm === conv.id && (
                  <div className="absolute right-0 top-0 bg-gray-900 border border-gray-700 rounded-lg p-2 z-10">
                    <p className="text-xs mb-2">Delete this chat?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => deleteConversation(conv.id)}
                        className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(null)}
                        className="px-2 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600"
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
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium">{user?.email?.[0].toUpperCase()}</span>
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium">{user?.user_metadata?.first_name} {user?.user_metadata?.last_name}</div>
              <div className="text-xs text-gray-500">Sign out</div>
            </div>
          </button>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-gray-800 flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            {currentConversation && (
              <span className="text-gray-400 text-sm">{getConversationTitle(currentConversation)}</span>
            )}
          </div>
        </div>

        {/* Messages area */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto relative"
          onScroll={handleScroll}
        >
          {/* Extended conversation mode indicator */}
          {currentConversation && currentConversation.token_count >= 200000 && rollingModeAcknowledged && (
            <div className="sticky top-0 z-10 bg-[#1a1a1a]/95 backdrop-blur-sm border-b border-gray-800 px-4 py-2">
              <div className="text-xs text-orange-400 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>Extended conversation mode - older messages are being removed to maintain quality</span>
              </div>
            </div>
          )}
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <div className="w-20 h-20 mb-8 relative">
                {/* Smooth round orb */}
                <div className="w-full h-full bg-gradient-to-br from-orange-400 to-pink-500 rounded-full animate-pulse"></div>
              </div>
              <h2 className="text-3xl font-light mb-2">
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
                    className={`mb-6 ${!hasWebSearch && !hasLifeInsuranceRecommendations ? 'max-w-3xl mx-auto px-4' : ''} ${message.role === 'assistant' ? '' : 'flex justify-end'}`}
                  >
                    {message.role === 'assistant' ? (
                      <>
                        <div className={`flex gap-3 ${hasWebSearch || hasLifeInsuranceRecommendations ? 'max-w-3xl mx-auto px-4' : ''}`}>
                          <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold">AI</span>
                          </div>
                          <div className="flex-1">
                            {/* Only render message content if it's NOT showing deep research final results or life insurance recommendations */}
                            {!(hasDeepResearch && message.toolInvocations?.some(inv => 
                              inv.toolName === 'deepResearchSynthesize' && 'result' in inv && inv.result?.success
                            )) && !hasLifeInsuranceRecommendations && message.content && (
                              <div className="text-white prose prose-invert max-w-none
                                prose-p:leading-relaxed prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-700
                                prose-code:text-orange-400 prose-code:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                                prose-strong:text-orange-400 prose-em:text-orange-300
                                prose-headings:text-orange-400 prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
                                prose-ul:list-disc prose-ol:list-decimal prose-li:marker:text-orange-400
                                prose-blockquote:border-orange-400 prose-blockquote:text-gray-300
                                prose-a:text-orange-400 prose-a:underline hover:prose-a:text-orange-300">
                                <ReactMarkdown 
                                  remarkPlugins={[remarkGfm]}
                                  rehypePlugins={[rehypeHighlight]}
                                >
                                  {cleanEmojis(message.content)}
                                </ReactMarkdown>
                              </div>
                            )}
                            {isLoading && messages[messages.length - 1].id === message.id && (
                              <div className="mt-2">
                                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse inline-block"></div>
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
                                <div key={toolCallId} className="mt-2 max-w-3xl mx-auto px-4">
                                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <p className="text-sm text-red-400">
                                      Search failed: {toolInvocation.result?.error || 'Unknown error'}
                                    </p>
                                  </div>
                                </div>
                              )
                            ) : (
                              <div key={toolCallId} className="mt-2 max-w-3xl mx-auto px-4">
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <div className="w-4 h-4 bg-blue-500/20 rounded-full flex items-center justify-center">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                  </div>
                                  <span>Aria is finding information...</span>
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
                                  <div key={toolCallId} className="mt-2 max-w-3xl mx-auto px-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                      <div className="w-4 h-4 bg-blue-500/20 rounded-full flex items-center justify-center">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                      </div>
                                      <span>Performing deep research...</span>
                                    </div>
                                  </div>
                                ) : null
                              ) : (
                                <div key={toolCallId} className="mt-2 max-w-3xl mx-auto px-4">
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
                                <div key={toolCallId} className="mt-2 max-w-3xl mx-auto px-4">
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
                                    prose-p:leading-relaxed prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-700
                                    prose-code:text-orange-400 prose-code:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                                    prose-strong:text-orange-400 prose-em:text-orange-300
                                    prose-headings:text-orange-400 prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
                                    prose-ul:list-disc prose-ol:list-decimal prose-li:marker:text-orange-400
                                    prose-blockquote:border-orange-400 prose-blockquote:text-gray-300
                                    prose-a:text-orange-400 prose-a:underline hover:prose-a:text-orange-300
                                    prose-table:border-collapse prose-table:w-full
                                    prose-th:border prose-th:border-gray-700 prose-th:px-3 prose-th:py-2 prose-th:bg-gray-800 prose-th:text-orange-400
                                    prose-td:border prose-td:border-gray-700 prose-td:px-3 prose-td:py-2">
                                    <ReactMarkdown 
                                      remarkPlugins={[remarkGfm]}
                                      rehypePlugins={[rehypeHighlight]}
                                    >
                                      {toolInvocation.result.report}
                                    </ReactMarkdown>
                                  </div>
                                  
                                  {/* Show research stats */}
                                  <div className="mt-6 p-4 bg-[#2a2a2a] rounded-lg border border-gray-800">
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-gray-400">
                                        Research completed in {toolInvocation.result.duration}s
                                      </span>
                                      <span className="text-gray-400">
                                        {toolInvocation.result.totalSearches} searches • {toolInvocation.result.findings.keyInsights.length} insights
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {/* Show sources */}
                                  {toolInvocation.result.findings.sources && toolInvocation.result.findings.sources.length > 0 && (
                                    <div className="mt-6">
                                      <h3 className="text-lg font-semibold text-gray-300 mb-4">Sources</h3>
                                      <div className="relative">
                                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
                                          {toolInvocation.result.findings.sources.map((source: any, idx: number) => (
                                            <div key={idx} className="flex-none w-80">
                                              <a 
                                                href={source.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="block p-4 bg-[#2a2a2a] rounded-lg border border-gray-800 hover:border-gray-700 hover:bg-[#333333] transition-all h-full"
                                              >
                                                <div className="flex items-start justify-between mb-2">
                                                  <div className="flex items-center gap-2 flex-1">
                                                    <img 
                                                      src={`https://www.google.com/s2/favicons?domain=${new URL(source.url).hostname}&sz=16`} 
                                                      alt="" 
                                                      className="w-4 h-4 flex-shrink-0"
                                                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                                    />
                                                    <p className="text-xs text-gray-500 truncate">
                                                      {new URL(source.url).hostname}
                                                    </p>
                                                  </div>
                                                  <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                                                    {Math.round(source.relevance * 100)}%
                                                  </span>
                                                </div>
                                                <h4 className="text-sm font-medium text-blue-400 hover:text-blue-300 line-clamp-2">
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
                                <div key={toolCallId} className="mt-2 max-w-3xl mx-auto px-4">
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
                                <div key={toolCallId} className="mt-2 max-w-3xl mx-auto px-4">
                                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <p className="text-sm text-red-400">
                                      Failed to process insurance request: {toolInvocation.result?.error || 'Unknown error'}
                                    </p>
                                  </div>
                                </div>
                              )
                            ) : (
                              <div key={toolCallId} className="mt-2 max-w-3xl mx-auto px-4">
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <div className="w-4 h-4 bg-orange-500/20 rounded-full flex items-center justify-center">
                                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
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
                                <div key={toolCallId} className="mt-2 text-sm text-orange-400">
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
                            <div key={toolCallId} className="max-w-3xl mx-auto px-4">
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
                        <div className="bg-gray-700 text-white px-4 py-2 rounded-2xl">
                          {message.content}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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
                className="bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-full p-3 text-white hover:bg-gray-700 transition-all duration-200 shadow-lg"
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
        <div className="border-t border-gray-800 p-4">
          <form onSubmit={handleFormSubmit} className="max-w-3xl mx-auto">
            <div className="relative flex items-center gap-2 bg-[#2a2a2a] rounded-2xl px-4 py-3">
              {/* Mic button */}
              <button
                type="button"
                onClick={() => setIsMicOn(!isMicOn)}
                className={`p-2 rounded-lg transition-colors ${
                  isMicOn ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>

              {/* Text input */}
              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={currentConversation?.token_count && currentConversation.token_count >= 200000 
                  ? "Context limit reached. Start a new chat to continue." 
                  : "How can I help you today?"}
                className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none"
                disabled={isLoading || (!!currentConversation?.token_count && currentConversation.token_count >= 200000 && !rollingModeAcknowledged)}
              />

              {/* Send button */}
              <button
                type="submit"
                disabled={isLoading || !input.trim() || (!!currentConversation?.token_count && currentConversation.token_count >= 200000 && !rollingModeAcknowledged)}
                className={`p-2 rounded-lg transition-colors ${
                  input.trim() && !isLoading && (!currentConversation || !currentConversation.token_count || currentConversation.token_count < 200000 || rollingModeAcknowledged)
                    ? 'bg-white text-black hover:bg-gray-200'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">
              AI can make mistakes. Please double-check responses.
            </p>
          </form>
        </div>
      </div>

      {/* Token Limit Modal */}
      {showTokenLimitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#212121] border border-gray-800 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">Conversation Limit Reached</h3>
              </div>
              <button
                onClick={() => setShowTokenLimitModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-gray-300 mb-6">
              You've reached the conversation limit. For best results, start a new chat.
              <br />
              <span className="text-sm">
                You can also continue here 
                <span className="text-gray-400"> (quality might suffer)</span>
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
                className="flex-1 bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors font-medium"
              >
                Start New Chat
              </button>
              <button
                onClick={() => {
                  setRollingModeAcknowledged(true)
                  setShowTokenLimitModal(false)
                }}
                className="flex-1 bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}