import React, { useState, useEffect, useRef } from 'react';
import { Bot, User, Send, Paperclip, X, MoreVertical } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

interface LuminaChatbotProps {
  onClose?: () => void;
}

export default function LuminaChatbot({ onClose }: LuminaChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '¡Hola! Soy Lumina AI, tu asistente dental. ¿En qué puedo ayudarte hoy para que tu sonrisa brille más?',
      time: '10:24 AM'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  const suggestionChips = [
    'Ver mis citas',
    'Precios de implantes',
    '¿Cómo reservar?'
  ];

  useEffect(() => {
    // Auto scroll to bottom of chat thread when a new message arrives
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // 1. Append user message locally
    const newUserMessage: Message = {
      role: 'user',
      content: textToSend,
      time: currentTime
    };

    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      // Convert history for API (express endpoint `/api/chat` expects history as array of { role, content })
      const historyPayload = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // 2. Fetch answer from our proxy Express API safely (which uses Gemini server-side!)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload
        })
      });

      const data = await response.json();
      
      const botResponse: Message = {
        role: 'assistant',
        content: data.text || 'Disculpa, no he podido procesar esa solicitud dental.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botResponse]);

    } catch (err) {
      console.error(err);
      const errorMsg: Message = {
        role: 'assistant',
        content: 'Hubo un inconveniente al conectar con Lumina AI. Te recordamos que la Limpieza Dental cuesta 65€, Ortodoncia Invisalign desde 2400€ e Implantes de Titanio desde 850€.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col bg-slate-50 dark:bg-slate-900 w-full h-full text-slate-800 dark:text-slate-100 relative transition-all duration-300">
      
      {/* Premium Assistant Header */}
      <header className="h-16 md:h-20 px-4 md:px-6 flex items-center justify-between bg-slate-900 dark:bg-slate-950 text-white shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-indigo-500/30 flex items-center justify-center bg-indigo-600">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full animate-pulse"></span>
          </div>
          <div>
            <h1 className="font-bold text-sm md:text-base leading-tight">Lumina AI</h1>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">En línea</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400">
          <button className="p-1.5 hover:bg-white/10 hover:text-white rounded-full transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
          {onClose && (
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 hover:text-white rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Message scroll thread thread */}
      <section className="flex-grow overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar bg-gradient-to-b from-slate-50 to-indigo-50/20 dark:from-slate-900 dark:to-slate-950/40">
        
        {/* Time Divider Indicator */}
        <div className="flex justify-center my-2">
          <span className="bg-slate-200/60 dark:bg-slate-800 px-3 py-1 rounded-full text-[10px] font-bold text-slate-500 dark:text-slate-400">
            Hoy
          </span>
        </div>

        {/* Dynamic Messages Render */}
        {messages.map((msg, idx) => (
          <div 
            key={idx}
            className={`flex items-start gap-3 max-w-[85%] ${
              msg.role === 'user' ? 'flex-row-reverse ml-auto' : ''
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
              msg.role === 'user' ? 'bg-slate-800 text-white' : 'bg-indigo-600 text-white'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div className={`p-3.5 rounded-2xl shadow-sm ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200/50 dark:border-slate-700/30'
            }`}>
              <p className="text-xs md:text-sm leading-relaxed whitespace-pre-line">{msg.content}</p>
              <span className={`block text-[9px] mt-1.5 ${
                msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'
              }`}>{msg.time}</span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-3 max-w-[85%]">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl rounded-tl-none border border-slate-200/50 dark:border-slate-700/30 shadow-sm">
              <div className="flex gap-1 items-center py-1">
                <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce delay-100"></span>
                <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce delay-200"></span>
              </div>
            </div>
          </div>
        )}

        <div ref={threadEndRef}></div>
      </section>

      {/* Suggestion Chips */}
      {messages.length === 1 && (
        <div className="flex flex-wrap gap-2 px-4 py-2 shrink-0 bg-white/40 dark:bg-slate-900/40">
          {suggestionChips.map((chip, i) => (
            <button
              key={i}
              onClick={() => sendMessage(chip)}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:text-indigo-500 rounded-full text-[11px] font-bold shadow-sm transition-all cursor-pointer active:scale-95"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input Form Area */}
      <footer className="p-3 bg-white dark:bg-slate-950 border-t border-slate-200/50 dark:border-slate-800/50 shrink-0">
        <form onSubmit={handleFormSubmit} className="relative flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
          <button 
            type="button"
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Escribe tu mensaje..."
            className="flex-1 bg-transparent border-none text-xs md:text-sm text-slate-900 dark:text-white outline-none focus:ring-0 p-1.5"
          />

          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-9 h-9 flex items-center justify-center bg-indigo-600 text-white rounded-xl hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-40 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="text-center text-[10px] text-slate-400 mt-2 font-semibold">
          Lumina Dental usa IA para asistirte. Revisa la Política de Privacidad.
        </p>
      </footer>

    </div>
  );
}
