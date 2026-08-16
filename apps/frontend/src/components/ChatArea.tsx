import React, { useState, useRef, useEffect } from "react";
import type { ChatMessage, AgentType } from "@swadesh/shared";
import { Send, Bot, User, Sparkles, Loader2 } from "lucide-react";
import { AgentBadge } from "./AgentBadge";
import { ReasoningTimeline } from "./ReasoningTimeline";
import { ToolCallCard } from "./ToolCallCard";
import { SamplePrompts } from "./SamplePrompts";

interface ChatAreaProps {
  messages: ChatMessage[];
  isLoading: boolean;
  loadingThought: string;
  onSendMessage: (text: string, preferredAgent?: AgentType) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isLoading,
  loadingThought,
  onSendMessage,
}) => {
  const [input, setInput] = useState("");
  const [preferredAgent, setPreferredAgent] = useState<AgentType | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, loadingThought]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim(), preferredAgent);
    setInput("");
  };

  return (
    <main className="flex-1 flex flex-col h-full bg-slate-950 relative overflow-hidden">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 shadow-xl shadow-indigo-500/10">
              <Bot className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-100 mb-2">
              AI Multi-Agent Support System
            </h2>
            <p className="text-xs text-slate-400 max-w-md mb-8 leading-relaxed">
              Our Router Agent classifies your inquiry and coordinates with specialized Support, Order, and Billing sub-agents with live database tool execution.
            </p>
            <SamplePrompts onSelectPrompt={(prompt) => onSendMessage(prompt)} />
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === "user";

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"} animate-in fade-in slide-in-from-bottom-2 duration-200`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                    isUser
                      ? "bg-slate-700 text-slate-200"
                      : "bg-gradient-to-tr from-indigo-600 to-violet-500 text-white"
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Bubble Container */}
                <div className={`space-y-1.5 max-w-[85%] ${isUser ? "items-end" : "items-start"}`}>
                  {/* Agent Header for Assistant */}
                  {!isUser && (
                    <div className="flex items-center gap-2 mb-1">
                      <AgentBadge type={msg.agentType} size="sm" />
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  )}

                  {/* Multi-Agent Reasoning Chain (if present) */}
                  {!isUser && msg.reasoningSteps && msg.reasoningSteps.length > 0 && (
                    <ReasoningTimeline steps={msg.reasoningSteps} />
                  )}

                  {/* Content Bubble */}
                  <div
                    className={`px-4 py-3 rounded-2xl text-xs md:text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                      isUser
                        ? "bg-indigo-600 text-white rounded-tr-none font-medium"
                        : "bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none prose prose-invert max-w-none"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Real-time Thinking & Execution Indicator */}
        {isLoading && (
          <div className="flex gap-3 max-w-3xl mr-auto animate-in fade-in duration-200">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shrink-0">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3.5 rounded-2xl rounded-tl-none bg-slate-900/90 border border-indigo-900/50 shadow-xl space-y-2 max-w-md">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                <span className="text-xs font-semibold text-indigo-300">
                  {loadingThought || "Routing & Querying Multi-Agent System..."}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                <span>Executing database tools & synthesizing response...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box Area */}
      <div className="p-4 bg-slate-900/80 border-t border-slate-800 backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-2">
          {/* Agent override selector pills */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 mr-1">Routing:</span>
              <button
                type="button"
                onClick={() => setPreferredAgent(undefined)}
                className={`px-2 py-0.5 rounded-full text-[11px] border transition-all ${
                  preferredAgent === undefined
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                    : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
                }`}
              >
                Auto (Router Agent)
              </button>
              {(["ORDER", "BILLING", "SUPPORT"] as AgentType[]).map((agent) => (
                <button
                  key={agent}
                  type="button"
                  onClick={() => setPreferredAgent(agent)}
                  className={`px-2 py-0.5 rounded-full text-[11px] border transition-all ${
                    preferredAgent === agent
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                      : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
                  }`}
                >
                  Force {agent}
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about orders, tracking, refunds, invoices, or support policies..."
              disabled={isLoading}
              className="w-full px-4 py-3 pr-12 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-inner"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </main>
  );
};
