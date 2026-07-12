import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { sendAICommand as sendAICommandRequest } from '../../services/apiClient';

export interface FanChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

interface FanAIChatProps {
  /** Controlled chat log — lifted to parent so action handlers can append acknowledgements */
  chatLogs: FanChatMessage[];
  onAppendMessage: (msg: FanChatMessage) => void;
}

const QUICK_QUERIES = [
  'Where is the nearest food court?',
  'Where is the nearest washroom?',
  'What gate is Gate C?',
  'Order popcorn and 1 coke',
];

export default function FanAIChat({ chatLogs, onAppendMessage }: FanAIChatProps) {
  const [chatInput, setChatInput] = useState('');
  const [isAiAnswering, setIsAiAnswering] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLogs]);

  const askAI = useCallback((text: string) => {
    if (!text.trim() || isAiAnswering) return;
    onAppendMessage({ sender: 'user', text });
    setIsAiAnswering(true);
    sendAICommandRequest(text)
      .then(data => onAppendMessage({ sender: 'ai', text: data.response }))
      .catch(() => onAppendMessage({ sender: 'ai', text: 'Error communicating with operational intelligence.' }))
      .finally(() => setIsAiAnswering(false));
  }, [isAiAnswering, onAppendMessage]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    askAI(chatInput);
    setChatInput('');
  }, [askAI, chatInput]);

  return (
    <aside className="w-full lg:w-80 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800/80 flex flex-col h-[600px] lg:h-auto overflow-hidden shrink-0">
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="font-sans font-black text-xs text-white uppercase tracking-wider">Nexus AI Assistant</h3>
        </div>
        <Sparkles className="h-4 w-4 text-emerald-400" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
        {chatLogs.map((log, i) => (
          <div key={i} className={`flex ${log.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-3.5 rounded-2xl max-w-[85%] ${log.sender === 'user' ? 'bg-emerald-500 text-black font-semibold' : 'bg-slate-950 text-slate-200 border border-slate-850'}`}>
              {log.text}
            </div>
          </div>
        ))}
        {isAiAnswering && (
          <div className="flex justify-start">
            <div className="bg-slate-950 text-slate-500 px-3 py-1.5 rounded-xl animate-pulse font-mono text-[10px]">
              Nexus thinking...
            </div>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      <div className="p-3 bg-slate-950/40 border-t border-slate-850/50 space-y-1.5">
        <span className="text-[9px] text-slate-500 font-mono uppercase font-bold">Ask Quick Queries:</span>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_QUERIES.map((shortcut, index) => (
            <button key={index} onClick={() => askAI(shortcut)}
              className="text-[10px] font-semibold bg-slate-950 hover:bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 hover:border-emerald-500/30 px-2 py-0.5 rounded-full transition-all text-left max-w-full truncate cursor-pointer">
              {shortcut}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-3 bg-slate-950 border-t border-slate-850 flex items-center space-x-2">
        <label htmlFor="fan-ai-input" className="sr-only">Ask AI assistant</label>
        <input id="fan-ai-input" type="text" required placeholder="Ask AI assistant..."
          value={chatInput} onChange={(e) => setChatInput(e.target.value)}
          className="flex-1 bg-slate-900 border border-slate-800 text-xs px-3 py-2 rounded-xl text-white focus:outline-none transition-all focus:border-emerald-500 placeholder:text-slate-650" />
        <button type="submit" aria-label="Send message" className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black transition-all cursor-pointer">
          <Send className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </form>
    </aside>
  );
}
