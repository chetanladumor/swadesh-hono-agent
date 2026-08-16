import React, { useState, useEffect } from "react";
import type { Conversation, ChatMessage, AgentInfo, AgentType } from "@swadesh/shared";
import { apiClient, setCurrentUser, type UserProfile } from "./api/client";
import { Sidebar } from "./components/Sidebar";
import { ChatArea } from "./components/ChatArea";
import { AgentCapabilitiesModal } from "./components/AgentCapabilitiesModal";

export const App: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUserState] = useState<UserProfile | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingThought, setLoadingThought] = useState("");

  // Load initial data: users & agents
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const userList = await apiClient.listUsers();
      setUsers(userList);
      if (userList.length > 0) {
        const initial = userList[0];
        setCurrentUserState(initial);
        setCurrentUser(initial.id);
        await loadConversationsForUser(initial.id);
      }
      loadAgents();
    } catch (e) {
      console.error("Failed to load initial data:", e);
    }
  };

  const loadConversationsForUser = async (userId: string) => {
    try {
      const list = await apiClient.listConversations(userId);
      setConversations(list);
      if (list.length > 0) {
        await selectConversation(list[0].id);
      } else {
        setActiveConversationId(null);
        setMessages([]);
      }
    } catch (e) {
      console.error("Failed to load conversations:", e);
      setActiveConversationId(null);
      setMessages([]);
    }
  };

  const handleSwitchUser = async (userId: string) => {
    const selected = users.find((u) => u.id === userId);
    if (selected) {
      // 1. Immediately reset active chat state to avoid showing previous user chat
      setActiveConversationId(null);
      setMessages([]);
      setConversations([]);
      setCurrentUserState(selected);
      setCurrentUser(selected.id);

      // 2. Load conversations strictly for the new user
      await loadConversationsForUser(selected.id);
    }
  };

  const loadAgents = async () => {
    try {
      const list = await apiClient.listAgents();
      setAgents(list);
    } catch (e) {
      console.error("Failed to load agents:", e);
    }
  };

  const selectConversation = async (id: string) => {
    setActiveConversationId(id);
    try {
      const conv = await apiClient.getConversation(id);
      setMessages(conv.messages || []);
    } catch (e) {
      console.error("Failed to load conversation messages:", e);
      setMessages([]);
    }
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await apiClient.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        handleNewChat();
      }
    } catch (e) {
      console.error("Failed to delete conversation:", e);
    }
  };

  const handleSendMessage = async (content: string, preferredAgent?: AgentType) => {
    const tempUserMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      conversationId: activeConversationId || "",
      role: "user",
      content,
      agentType: "ROUTER",
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setIsLoading(true);

    setLoadingThought("Router Agent analyzing query & customer session...");
    const t1 = setTimeout(() => setLoadingThought("Delegating to specialized sub-agent..."), 600);
    const t2 = setTimeout(() => setLoadingThought("Executing live database tools..."), 1200);

    try {
      const response = await apiClient.sendMessage({
        conversationId: activeConversationId || undefined,
        content,
        preferredAgent,
        userId: currentUser?.id,
      });

      clearTimeout(t1);
      clearTimeout(t2);

      if (!activeConversationId) {
        setActiveConversationId(response.conversationId);
        if (currentUser) {
          apiClient.listConversations(currentUser.id).then(setConversations);
        }
      }

      setMessages((prev) => [...prev, response.message]);
    } catch (e: any) {
      console.error("Chat error:", e);
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        conversationId: activeConversationId || "",
        role: "assistant",
        content: `❌ Error: ${e.message || "Failed to process request."} Please ensure the backend is running.`,
        agentType: "FALLBACK",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setLoadingThought("");
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden">
      <Sidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelectConversation={selectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onOpenAgentModal={() => setIsAgentModalOpen(true)}
        agentsCount={agents.length}
        users={users}
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
      />

      <ChatArea
        messages={messages}
        isLoading={isLoading}
        loadingThought={loadingThought}
        onSendMessage={handleSendMessage}
      />

      <AgentCapabilitiesModal
        agents={agents}
        isOpen={isAgentModalOpen}
        onClose={() => setIsAgentModalOpen(false)}
      />
    </div>
  );
};
