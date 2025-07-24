'use client'

import { useState, useEffect, useRef, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { User } from '@supabase/supabase-js'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'
import { Message as AiMessage } from 'ai/react'
import { useChat } from '@ai-sdk/react'

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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const [user, setUser] = useState<User | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [isMicOn, setIsMicOn] = useState(false)
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  const [showTokenLimitModal, setShowTokenLimitModal] = useState(false)
  
  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages: setChatMessages, error } = useChat({
    api: '/api/chat',
    maxSteps: 15, // Match the server-side maxSteps
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
    initialMessages: [],
  })

  // Check auth and load conversations
  useEffect(() => {
    checkAuth()
    loadConversations()
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/auth')
      } else if (event === 'SIGNED_IN' && session) {
        setUser(session.user)
        // Create new conversation on sign in
        setCurrentConversation(null)
        setChatMessages([])
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
        createdAt: new Date(msg.created_at)
      }))
      setChatMessages(cleanedMessages)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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

      handleSubmit(e, {
        body: {
          conversationId: conversationId
        }
      })
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
  }

  const deleteConversation = async (convId: string) => {
    await supabase.from('conversations').delete().eq('id', convId)
    await loadConversations()
    if (currentConversation?.id === convId) {
      setCurrentConversation(null)
      setChatMessages([])
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
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <div className="w-20 h-20 mb-8 relative">
                {/* Smooth round orb */}
                <div className="w-full h-full bg-gradient-to-br from-orange-400 to-pink-500 rounded-full animate-pulse"></div>
              </div>
              <h2 className="text-3xl font-light mb-2">What's on your mind tonight?</h2>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-8 px-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`mb-6 ${message.role === 'assistant' ? '' : 'flex justify-end'}`}
                >
                  {message.role === 'assistant' ? (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold">AI</span>
                      </div>
                      <div className="flex-1">
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
                        {isLoading && messages[messages.length - 1].id === message.id && (
                          <div className="mt-2">
                            <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse inline-block"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-[70%]">
                      <div className="bg-gray-700 text-white px-4 py-2 rounded-2xl">
                        {message.content}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
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
                placeholder={currentConversation?.token_count && currentConversation.token_count >= 120000 
                  ? "Context limit reached. Start a new chat to continue." 
                  : "How can I help you today?"}
                className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none"
                disabled={isLoading || !!currentConversation?.token_count && currentConversation.token_count >= 120000}
              />

              {/* Send button */}
              <button
                type="submit"
                disabled={isLoading || !input.trim() || !!currentConversation?.token_count && currentConversation.token_count >= 120000}
                className={`p-2 rounded-lg transition-colors ${
                  input.trim() && !isLoading && (!currentConversation || !currentConversation.token_count || currentConversation.token_count < 120000)
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
                <h3 className="text-lg font-semibold text-white">Context Limit Reached</h3>
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
              This conversation has reached its context limit. Please start a new chat to continue.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setCurrentConversation(null)
                  setChatMessages([])
                  setShowTokenLimitModal(false)
                }}
                className="flex-1 bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors font-medium"
              >
                Start New Chat
              </button>
              <button
                onClick={() => setShowTokenLimitModal(false)}
                className="flex-1 bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                Stay Here
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}