import { useState, useRef, useEffect } from 'react';
import type { Student, Job, Application } from '@/lib/supabase';
import { generateCopilotResponse, type CopilotResponse } from '@/lib/ai-engine';
import { Sparkles, Send, Brain, Zap } from 'lucide-react';

type Props = {
  students: Student[];
  jobs: Job[];
  applications: Application[];
};

type Message = {
  role: 'user' | 'ai';
  text: string;
  data?: unknown;
};

export default function CopilotTab({ students, jobs, applications }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      text: `Hi! I'm your CampusLink AI Copilot. I can analyze your placement data in real-time. Try asking me:
• "Show me students at risk of not getting placed"
• "Which students are suitable for the Software Developer role?"
• "What are the most common skill gaps?"
• "Give me a placement overview"
• "How many active drives are there?"

What would you like to know?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const handleSend = async () => {
    if (!input.trim() || thinking) return;
    const userMessage: Message = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setThinking(true);

    // Simulate AI thinking for UX
    await new Promise(r => setTimeout(r, 400));

    const response: CopilotResponse = generateCopilotResponse(input, students, jobs, applications as never);
    setMessages(prev => [...prev, { role: 'ai', text: response.text, data: response.data }]);
    setThinking(false);
  };

  const suggestions = [
    'Show me students at risk',
    'Placement overview',
    'Common skill gaps',
    'Active placement drives',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-400/10 to-transparent border border-yellow-400/20 rounded-2xl p-4 mb-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-black">
          <Sparkles className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">CampusLink AI Copilot</h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <p className="text-xs text-green-400">Online · Analyzing {students.length} students, {jobs.length} jobs in real-time</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 overflow-y-auto space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              msg.role === 'ai' ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black' : 'bg-zinc-800 text-gray-400'
            }`}>
              {msg.role === 'ai' ? <Brain className="w-5 h-5" /> : <span className="text-sm font-bold">A</span>}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.role === 'ai' ? 'bg-zinc-800 text-gray-200' : 'bg-yellow-400 text-black'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-black shrink-0">
              <Brain className="w-5 h-5" />
            </div>
            <div className="bg-zinc-800 rounded-2xl px-4 py-3 flex items-center gap-1">
              <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 2 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {suggestions.map(s => (
            <button
              key={s}
              onClick={() => setInput(s)}
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-gray-400 hover:text-yellow-400 hover:border-yellow-400/30 transition-all"
            >
              <Zap className="w-3.5 h-3.5" />
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Ask me anything about your placement data..."
          disabled={thinking}
          className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-yellow-400/50 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={thinking || !input.trim()}
          className="px-5 py-3 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-300 disabled:opacity-50 flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          Send
        </button>
      </div>
    </div>
  );
}
