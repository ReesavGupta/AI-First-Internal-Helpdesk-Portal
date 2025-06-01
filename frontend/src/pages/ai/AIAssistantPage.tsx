'use client'

import type React from 'react'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Send, Bot, User, Lightbulb, Search, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { formatDistanceToNow } from 'date-fns'

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
  sources?: Array<string>
}

export function AIAssistantPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      content:
        "Hello! I'm your AI assistant. I can help you find answers to common questions, search through documentation, and provide guidance on using the helpdesk system. What would you like to know?",
      isUser: false,
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState('')

  const { data: aiStatus } = useQuery({
    queryKey: ['ai-status'],
    queryFn: apiClient.getAIStatus,
  })

  // Auto-scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Handle scroll position to show/hide scroll-to-bottom button
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
    setShowScrollButton(!isNearBottom && messages.length > 3)
  }

  const askAIMutation = useMutation({
    mutationFn: (question: string) => apiClient.askAI({ question }),
    onSuccess: (response, question) => {
      // Add user message
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        content: question,
        isUser: true,
        timestamp: new Date(),
      }

      // Add AI response
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        content: response.answer,
        isUser: false,
        timestamp: new Date(),
        sources: response.sources,
      }

      setMessages((prev) => [...prev, userMessage, aiMessage])
      setInputValue('')
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    askAIMutation.mutate(inputValue.trim())
  }

  const handleSuggestedQuestion = (question: string) => {
    setInputValue(question)
    // Auto-submit on mobile for better UX
    if (window.innerWidth < 768) {
      askAIMutation.mutate(question)
    }
  }

  const suggestedQuestions = [
    'How do I create a new ticket?',
    'What are the different ticket priorities?',
    'How can I track my ticket status?',
    'Who can I contact for urgent issues?',
    'How do I update my profile information?',
  ]

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">AI Assistant</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Get instant help and answers to your questions
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          {/* Chat Interface */}
          {/* <Card className="h-[calc(100vh-200px)] sm:h-[600px] flex flex-col"> */}
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center text-lg sm:text-xl">
              <Bot className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Chat with AI Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-3 sm:p-6 pt-0">
            {/* Messages Area */}
            <div className="flex-1 relative">
              <ScrollArea
                className="h-full pr-2 sm:pr-4"
                ref={scrollAreaRef}
                onScrollCapture={handleScroll}
              >
                <div className="space-y-3 sm:space-y-4 pb-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-start space-x-2 sm:space-x-3 ${
                        message.isUser ? 'flex-row-reverse space-x-reverse' : ''
                      }`}
                    >
                      <Avatar className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0">
                        {message.isUser ? (
                          <>
                            <AvatarImage
                              src={user?.avatarUrl || '/placeholder.svg'}
                            />
                            <AvatarFallback>
                              <User className="h-3 w-3 sm:h-4 sm:w-4" />
                            </AvatarFallback>
                          </>
                        ) : (
                          <AvatarFallback>
                            <Bot className="h-3 w-3 sm:h-4 sm:w-4" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div
                        className={`flex-1 max-w-[85%] sm:max-w-[80%] ${
                          message.isUser ? 'text-right' : ''
                        }`}
                      >
                        <div
                          className={`p-2 sm:p-3 rounded-lg text-sm sm:text-base ${
                            message.isUser
                              ? 'bg-primary text-primary-foreground ml-auto'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(message.timestamp, {
                            addSuffix: true,
                          })}
                        </p>
                        {message.sources && message.sources.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">
                              Sources:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {message.sources.map((source, index) => (
                                <Badge
                                  key={index}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {source}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {askAIMutation.isPending && (
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <Avatar className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0">
                        <AvatarFallback>
                          <Bot className="h-3 w-3 sm:h-4 sm:w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-muted p-2 sm:p-3 rounded-lg flex items-center">
                        <LoadingSpinner
                          size="sm"
                          className="mr-2"
                        />
                        <span className="text-xs sm:text-sm">
                          AI is thinking...
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Scroll to bottom button */}
              {showScrollButton && (
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute bottom-4 right-4 rounded-full p-2 shadow-lg"
                  onClick={scrollToBottom}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Suggested Questions - Responsive Layout */}
            <div className="border-t pt-3 sm:pt-4 mt-3 sm:mt-4">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-2 flex items-center">
                <Lightbulb className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Suggested Questions
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2 mb-3 sm:mb-4">
                {suggestedQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="text-xs h-auto py-2 px-3 text-left justify-start lg:whitespace-nowrap"
                    onClick={() => handleSuggestedQuestion(question)}
                  >
                    <span className="truncate sm:text-clip">{question}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Input Form */}
            <form
              onSubmit={handleSubmit}
              className="flex space-x-2"
            >
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask me anything..."
                disabled={askAIMutation.isPending}
                className="text-sm sm:text-base"
              />
              <Button
                type="submit"
                size="sm"
                disabled={askAIMutation.isPending || !inputValue.trim()}
                className="px-3 sm:px-4"
              >
                <Send className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </form>
          </CardContent>
          {/* </Card> */}
        </div>

        {/* Sidebar - Responsive */}
        <div className="space-y-4 sm:space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start h-auto p-2 sm:p-3 text-left"
                onClick={() =>
                  handleSuggestedQuestion('How do I create a new ticket?')
                }
              >
                <Search className="mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm">Create Ticket Help</span>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-auto p-2 sm:p-3 text-left"
                onClick={() =>
                  handleSuggestedQuestion('Show me my ticket status')
                }
              >
                <Search className="mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm">Check Ticket Status</span>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-auto p-2 sm:p-3 text-left"
                onClick={() =>
                  handleSuggestedQuestion('What are the support hours?')
                }
              >
                <Search className="mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm">Support Information</span>
              </Button>
            </CardContent>
          </Card>

          {/* AI Status */}
          {aiStatus && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">AI Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm">Status</span>
                  <Badge
                    variant={
                      aiStatus.status === 'OK' ? 'default' : 'destructive'
                    }
                  >
                    {aiStatus.status}
                  </Badge>
                </div>
                {aiStatus.usage_today && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm">Requests Today</span>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {aiStatus.usage_today.requests}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
