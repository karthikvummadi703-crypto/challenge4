/**
 * Floating AI chat assistant for the volunteer dashboard.
 *
 * Renders a collapsed toggle button in the bottom-right corner.  When opened,
 * shows a chat panel with shortcut buttons and a text input.  Replies are
 * generated locally by `getLocalReply` — no backend call is made — so the
 * assistant works even without network access.  Keyword routing covers route
 * guidance, food pickups, and medical emergencies.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send } from 'lucide-react';

const SHORTCUTS = ['Tunnel guide', 'Medical route', 'Section B pickup'];

function getLocalReply(query: string): string {
  const q = query.toLowerCase();
  if (q.includes('route') || q.includes('go') || q.includes('way')) {
    return 'Avoid Tunnel C4. High traffic. Use Gate D service stairs for direct access to Level 2.';
  }
  if (q.includes('food') || q.includes('popcorn') || q.includes('drink')) {
    return 'The main food stalls are in Section B. Your delivery ticket is pre-paid. Pickup in Row 3.';
  }
  if (q.includes('medical') || q.includes('chest') || q.includes('emergency')) {
    return 'URGENT: Proceed with emergency kit immediately. Sector C paramedics are informed and on standby.';
  }
  return "I'm charting a route. Please proceed to the main concourse.";
}

export default function VolunteerAIChat() {
  const [showChat, setShowChat] = useState(false);
  const [aiText, setAiText] = useState('');
  const [chatLogs, setChatLogs] = useState<Array<{ sender: 'vol' | 'ai'; text: string }>>([
    { sender: 'ai', text: "Hello! I am Nexus AI. I'll route you through the optimal tunnels for your current tasks." }
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiText.trim()) return;
    const query = aiText;
    setChatLogs(prev => [...prev, { sender: 'vol', text: query }]);
    setAiText('');
    setTimeout(() => {
      setChatLogs(prev => [...prev, { sender: 'ai', text: getLocalReply(query) }]);
    }, 600);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ scale: 0.9, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 15, opacity: 0 }}
            className="absolute bottom-16 right-0 w-80 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-96"
          >
            <div className="p-3 bg-slate-950 border-b border-slate-850 flex items-center justify-between">
              <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">Tunnel Navigator AI</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            </div>

            <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs font-sans">
              {chatLogs.map((log, i) => (
                <div key={i} className={`flex ${log.sender === 'vol' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-2.5 rounded-xl max-w-[85%] ${log.sender === 'vol' ? 'bg-emerald-500 text-black font-semibold' : 'bg-slate-950 text-slate-200 border border-slate-850'}`}>
                    {log.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-2 bg-slate-950/60 border-t border-slate-850/50 flex space-x-1 overflow-x-auto whitespace-nowrap">
              {SHORTCUTS.map((item, index) => (
                <button key={index} onClick={() => setAiText(item)}
                  className="text-[9px] font-semibold bg-slate-950 text-emerald-400 border border-emerald-500/10 hover:border-emerald-500/30 px-2 py-0.5 rounded-full cursor-pointer shrink-0">
                  {item}
                </button>
              ))}
            </div>

            <form onSubmit={handleSend} className="p-2 bg-slate-950 border-t border-slate-850 flex items-center space-x-2">
              <label htmlFor="vol-ai-input" className="sr-only">Ask route guide</label>
              <input id="vol-ai-input" type="text" required placeholder="Ask route guide..."
                value={aiText} onChange={(e) => setAiText(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 text-xs px-2.5 py-1.5 rounded-lg text-white focus:outline-none" />
              <button type="submit" aria-label="Send message" className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black cursor-pointer">
                <Send className="h-3 w-3" aria-hidden="true" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowChat(!showChat)}
        aria-label={showChat ? 'Close route guide assistant' : 'Open route guide assistant'}
        aria-expanded={showChat}
        className="h-12 w-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center shadow-xl cursor-pointer z-50 border-2 border-slate-950"
      >
        <MessageSquare className="h-5 w-5" aria-hidden="true" />
      </motion.button>
    </div>
  );
}
