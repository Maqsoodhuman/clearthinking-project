import React, { useState, useEffect, useRef } from 'react';
import {
  Brain,
  User,
  Bot,
  Briefcase,
  Target,
  Tags,
  Sparkles,
  ChevronRight,
  Send,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2
} from 'lucide-react';

// --- CONFIGURATION ---
const API_URL = "https://g5klt6odopwpu33hg6n5pmnufi0thtuc.lambda-url.us-east-1.on.aws/";

function App() {
  // --- STATE ---
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');

  // Profile State
  const [userProfile, setUserProfile] = useState({
    userId: 'user_' + Math.random().toString(36).substr(2, 9),
    role: '',
    industry: '',
    traits: []
  });

  // Chat History
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'system',
      content: "Hello. I am your ClearThinking partner. I'm here to help you vet your decisions. Once we finish setup, tell me what you're wrestling with today.",
      status: 'neutral'
    }
  ]);

  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- ACTIONS ---

  const handleOnboarding = async () => {
    if (!userProfile.role || !userProfile.industry) return;

    // If API is connected, send init data
    if (API_URL) {
      await callBackend({
        action: 'initialize',
        data: { role: userProfile.role, industry: userProfile.industry }
      });
    }

    setOnboardingComplete(true);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    // 1. Add User Message
    const userText = input;
    setInput('');
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: userText }]);
    setLoading(true);

    // 2. Process Logic
    let response;
    try {
      if (API_URL) {
        response = await callBackend({ action: 'chat', message: userText });
      } else {
        response = await simulateBackend(userText);
      }
    } catch (error) {
      console.error(error);
      response = { reply: "Error processing request.", status: "red" };
    }

    // 3. Update UI with System Response
    setLoading(false);
    setMessages(prev => [...prev, {
      id: Date.now() + 1,
      role: 'system',
      content: response.reply || response.response,
      status: response.status
    }]);

    // 4. Update Traits
    if (response.new_traits && response.new_traits.length > 0) {
      setUserProfile(prev => {
        const uniqueTraits = new Set([...prev.traits, ...response.new_traits]);
        return { ...prev, traits: Array.from(uniqueTraits) };
      });
    }
  };

  // --- BACKEND LOGIC ---

  const callBackend = async (payload) => {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userProfile.userId, ...payload })
    });
    return await res.json();
  };

  const simulateBackend = async (text) => {
    await new Promise(r => setTimeout(r, 1000)); // Fake latency
    const lower = text.toLowerCase();

    let status = 'yellow';
    let reply = "I hear you. Can you elaborate on the risks?";
    let newTraits = [];

    if (lower.includes("hate") || lower.includes("feel") || lower.includes("worried")) {
      status = 'red';
      reply = `[Red Light] High emotion detected ("${lower.includes('hate') ? 'hate' : 'feel'}"). This suggests Affect Heuristic. Can you reframe this using only data?`;
      newTraits.push("Emotional");
    } else if (lower.includes("data") || lower.includes("percent") || lower.includes("cost")) {
      status = 'green';
      reply = `[Green Light] Strong reasoning. You cited data which aligns with your role as ${userProfile.role}. Proceed.`;
      newTraits.push("Data-Driven");
    } else {
      reply = `[Yellow Light] You have a point, but have you checked for 'Confirmation Bias'? Are you only looking for proof you are right?`;
      newTraits.push("Intuitive");
    }

    return { reply, status, new_traits: newTraits };
  };

  // --- RENDER HELPERS ---

  const getBubbleStyle = (msg) => {
    if (msg.role === 'user') {
      return 'bg-indigo-600 text-white rounded-br-none shadow-indigo-200 ml-auto';
    }

    let base = 'bg-white border border-slate-200 text-slate-700 rounded-bl-none mr-auto';
    if (msg.status === 'green') return `${base} border-l-4 border-l-emerald-500 bg-emerald-50/30`;
    if (msg.status === 'red') return `${base} border-l-4 border-l-rose-500 bg-rose-50/30`;
    if (msg.status === 'yellow') return `${base} border-l-4 border-l-amber-400 bg-amber-50/30`;
    return `${base} border-l-4 border-l-indigo-500`;
  };

  const getStatusLabel = (status) => {
    if (status === 'green') return <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-2 block border-b border-black/5 pb-2">Validation</span>;
    if (status === 'red') return <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 mb-2 block border-b border-black/5 pb-2">Bias Detected</span>;
    if (status === 'yellow') return <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-2 block border-b border-black/5 pb-2">Caution</span>;
    return null;
  };

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800 font-sans overflow-hidden">

      {/* ONBOARDING MODAL */}
      {!onboardingComplete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="bg-indigo-600 p-6 text-center">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <Brain className="text-white w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-white">Initialize Profile</h2>
              <p className="text-indigo-100 text-sm mt-2">Configure your AI Decision Coach.</p>
            </div>
            <div className="p-8 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Role</label>
                <input
                  type="text"
                  placeholder="e.g., CTO, Founder"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={userProfile.role}
                  onChange={(e) => setUserProfile({ ...userProfile, role: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Industry</label>
                <input
                  type="text"
                  placeholder="e.g., Fintech, Design"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={userProfile.industry}
                  onChange={(e) => setUserProfile({ ...userProfile, industry: e.target.value })}
                />
              </div>
              <button
                onClick={handleOnboarding}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 mt-4"
              >
                Start Session <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className="w-full md:w-80 bg-white border-r border-slate-200 flex-col z-10 hidden md:flex">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-bold text-lg flex items-center gap-2 text-slate-800">
            <Brain className="text-indigo-600 w-5 h-5" />
            Cognitive Profile
          </h2>
          <p className="text-xs text-slate-500 mt-1">Real-time context analysis.</p>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-8">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <User className="w-3 h-3" /> Identity
            </h3>
            <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Briefcase className="w-4 h-4" /></div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Role</p>
                  <p className="text-sm font-semibold text-slate-700">{userProfile.role || '--'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Target className="w-4 h-4" /></div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Industry</p>
                  <p className="text-sm font-semibold text-slate-700">{userProfile.industry || '--'}</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Tags className="w-3 h-3" /> Observed Traits
            </h3>
            <div className="flex flex-wrap gap-2">
              {userProfile.traits.length === 0 && <p className="text-xs text-slate-400 italic">Chat to generate traits...</p>}
              {userProfile.traits.map(trait => (
                <span key={trait} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full border border-indigo-100 animate-in fade-in shadow-sm">
                  #{trait}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-auto p-4 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl text-white shadow-lg">
            <div className="flex items-start gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <p className="font-bold text-sm">Pro Tip</p>
            </div>
            <p className="text-xs opacity-90 leading-relaxed">
              Give your logical reasoning, data and context to trigger a <span className="font-bold text-emerald-300">Green Light</span>. Emotional words trigger a <span className="font-bold text-rose-300">Red Light</span>.
            </p>
          </div>
        </div>
      </aside>

      {/* MAIN CHAT */}
      <main className="flex-1 flex flex-col relative bg-slate-50/50 h-full">
        <div className="md:hidden bg-white p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          <span className="font-bold flex items-center gap-2 text-slate-800">
            <Brain className="text-indigo-600 w-5 h-5" /> ClearThinker
          </span>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">{userProfile.traits.length} Traits</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-5 shadow-sm relative text-sm md:text-base leading-relaxed ${getBubbleStyle(msg)}`}>

                {/* Icons */}
                <div className={`absolute -bottom-6 w-8 h-8 rounded-full flex items-center justify-center border border-slate-200 shadow-sm bg-white z-10 ${msg.role === 'user' ? '-right-2 text-indigo-600' : '-left-2'}`}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> :
                    msg.status === 'green' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> :
                      msg.status === 'red' ? <XCircle className="w-4 h-4 text-rose-600" /> :
                        msg.status === 'yellow' ? <AlertTriangle className="w-4 h-4 text-amber-500" /> :
                          <Bot className="w-4 h-4 text-indigo-600" />
                  }
                </div>

                {msg.role === 'system' && getStatusLabel(msg.status)}
                <p>{msg.content}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="px-8 pb-4">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none p-4 shadow-sm inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
              <span className="text-xs text-slate-500 font-medium">Analyzing logic...</span>
            </div>
          </div>
        )}

        <div className="p-4 bg-white border-t border-slate-200 z-20">
          <div className="max-w-3xl mx-auto relative">
            <textarea
              placeholder="Describe your decision (e.g., 'I want to hire a sales VP...')"
              className="w-full bg-slate-50 border-slate-200 border rounded-xl pl-4 pr-12 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none max-h-32 shadow-inner text-slate-700 text-sm md:text-base"
              rows="1"
              style={{ minHeight: '60px' }}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              onClick={handleSend}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="max-w-3xl mx-auto mt-2 text-center">
            <p className="text-[10px] text-slate-400">
              ClearThinker • {API_URL ? <span className="text-emerald-500 font-bold">Live Connection</span> : <span className="text-indigo-400">Simulation Mode</span>}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;