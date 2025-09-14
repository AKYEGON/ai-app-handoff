import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Brain, Zap, Search, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  timestamp: string;
  tokens?: number;
}

interface ChatModeInfo {
  name: string;
  description: string;
  thinking_enabled: boolean;
  temperature: number;
  use_cases: string[];
}

interface ChatResponse {
  success: boolean;
  message_id?: string;
  response?: string;
  thinking?: string;
  mode: string;
  session_id: string;
  context_length?: number;
  tokens_used?: number;
  error?: string;
  error_type?: string;
  retry_after?: number;
}

const ChatInterface: React.FC = () => {
  // State management
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [chatMode, setChatMode] = useState<string>('fast_code');
  const [availableModes, setAvailableModes] = useState<Record<string, ChatModeInfo>>({});
  const [showThinking, setShowThinking] = useState(false);
  const [error, setError] = useState<string>('');
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat modes and create session on mount
  useEffect(() => {
    initializeChat();
  }, []);

  const initializeChat = async () => {
    try {
      // Load available modes
      const modesResponse = await fetch('/api/chat/modes');
      if (modesResponse.ok) {
        const modesData = await modesResponse.json();
        setAvailableModes(modesData.modes);
      }

      // Create new session
      const sessionResponse = await fetch('/api/chat/session', {
        method: 'POST',
      });
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        setSessionId(sessionData.session_id);
      }
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      setError('Failed to initialize chat. Please refresh the page.');
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setError('');
    setIsLoading(true);

    // Add user message to UI immediately
    const userMsgObj: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsgObj]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          session_id: sessionId,
          mode: chatMode,
        }),
      });

      const data: ChatResponse = await response.json();

      if (data.success && data.response) {
        // Add assistant response
        const assistantMsg: ChatMessage = {
          id: data.message_id || `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.response,
          thinking: data.thinking,
          timestamp: new Date().toISOString(),
          tokens: data.tokens_used,
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        // Handle errors
        setError(data.error || 'Failed to get response');
        
        if (data.error_type === 'rate_limit' && data.retry_after) {
          setError(`Rate limited. Please wait ${data.retry_after} seconds before trying again.`);
        } else if (data.error_type === 'auth_error') {
          setError('Authentication failed. Please check your API key configuration.');
        } else if (data.error_type === 'timeout') {
          setError('Request timed out. The AI service might be overloaded. Please try again.');
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = async () => {
    try {
      if (sessionId) {
        await fetch(`/api/chat/session/${sessionId}`, {
          method: 'DELETE',
        });
      }
      
      setMessages([]);
      setError('');
      
      // Create new session
      const sessionResponse = await fetch('/api/chat/session', {
        method: 'POST',
      });
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        setSessionId(sessionData.session_id);
      }
    } catch (error) {
      console.error('Failed to clear chat:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'fast_code': return <Zap className="w-4 h-4" />;
      case 'deep_reasoning': return <Brain className="w-4 h-4" />;
      case 'code_review': return <Search className="w-4 h-4" />;
      default: return <Bot className="w-4 h-4" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <Bot className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold">DukaFiti AI Assistant</h2>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={chatMode} onValueChange={setChatMode}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(availableModes).map(([key, mode]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center space-x-2">
                    {getModeIcon(key)}
                    <span>{mode.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" onClick={clearChat}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Mode Info */}
      {availableModes[chatMode] && (
        <div className="p-3 bg-blue-50 border-b">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">
                {availableModes[chatMode].name}
              </p>
              <p className="text-xs text-blue-700">
                {availableModes[chatMode].description}
              </p>
            </div>
            {availableModes[chatMode].thinking_enabled && (
              <Badge variant="secondary" className="text-xs">
                <Brain className="w-3 h-3 mr-1" />
                Thinking Mode
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <Bot className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Welcome to DukaFiti AI Assistant</p>
              <p className="text-sm">
                Ask me anything about your shop management, code, or business operations!
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  } rounded-lg p-3`}
                >
                  <div className="flex items-start space-x-2">
                    {message.role === 'assistant' && (
                      <Bot className="w-5 h-5 mt-0.5 text-blue-600" />
                    )}
                    {message.role === 'user' && (
                      <User className="w-5 h-5 mt-0.5" />
                    )}
                    
                    <div className="flex-1">
                      <div className="prose prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap font-sans text-sm">
                          {message.content}
                        </pre>
                      </div>
                      
                      {message.thinking && (
                        <div className="mt-3 pt-3 border-t border-gray-300">
                          <button
                            onClick={() => setShowThinking(!showThinking)}
                            className="flex items-center space-x-1 text-xs text-gray-600 hover:text-gray-800"
                          >
                            <Brain className="w-3 h-3" />
                            <span>
                              {showThinking ? 'Hide' : 'Show'} Thinking Process
                            </span>
                          </button>
                          
                          {showThinking && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                              <pre className="whitespace-pre-wrap">
                                {message.thinking}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                        <span>{formatTimestamp(message.timestamp)}</span>
                        {message.tokens && (
                          <span>{message.tokens} tokens</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
                <div className="flex items-center space-x-2">
                  <Bot className="w-5 h-5 text-blue-600" />
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-gray-600">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <Input
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about your shop, code, or business..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || !inputMessage.trim()}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>{messages.length} messages in session</span>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;