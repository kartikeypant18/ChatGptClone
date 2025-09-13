import { useState, useEffect, useRef, useCallback } from "react";
import useAnalytics from "@/hooks/useAnalytics";
import useAutoResizeTextArea from "@/hooks/useAutoResizeTextArea";
import { DEFAULT_OPENAI_MODEL } from "@/shared/Constants";

export default function useChatLogic(props: any) {
  const { toggleComponentVisibility, ensureThread, activeThreadId } = props;
  const selectedModel = DEFAULT_OPENAI_MODEL;

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showEmptyChat, setShowEmptyChat] = useState(true);
  const [conversation, setConversation] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<{ url: string; type: 'image' | 'document' }[]>([]);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [editingTurnId, setEditingTurnId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<string>("");

  const { trackEvent } = useAnalytics();
  const textAreaRef = useAutoResizeTextArea();
  const bottomOfChatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShowEmptyChat(conversation.length === 0);
  }, [conversation]);

  const sendMessage = useCallback(async (e?: React.FormEvent | React.KeyboardEvent) => {
    e?.preventDefault?.();
    if (!message.trim()) {
      setErrorMessage("Please enter a message.");
      return;
    }
    setErrorMessage("");
    const userMessage = message;
    setMessage("");
    setAttachments([]);
    setIsLoading(true);
    setConversation(prev => [...prev, { role: 'assistant', content: '...', isLoading: true }]);
    try {
      let threadId = activeThreadId;
      if (!threadId) {
        const res = await fetch('/api/threads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: message.slice(0, 60) }) });
        if (!res.ok) throw new Error("Failed to create new chat.");
        const data = await res.json();
        threadId = data._id;
        props.onCreateThread?.(data._id);
      }
      const userTurnRes = await fetch(`/api/chat-history`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: userMessage, role: "user", threadId, model: selectedModel?.id }) });
      if (!userTurnRes.ok) throw new Error("Failed to save your message.");
      const userTurn = await userTurnRes.json();
      setConversation(prev => [...prev, { role: "user", content: userMessage, turnId: userTurn._id, versions: userTurn.versions, currentVersion: userTurn.currentVersion }]);
      setShowEmptyChat(false);
      const aiRes = await fetch(`/api/openai`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [...conversation, { content: userMessage, role: "user" }], model: selectedModel, attachments }) });
      if (!aiRes.ok) throw new Error("Failed to get AI response");
      const aiData = await aiRes.json();
      setConversation(prev => [...prev, { role: "assistant", content: aiData.message, turnId: userTurn._id }]);
      const saveRes = await fetch(`/api/chat-history`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: aiData.message, role: "assistant", threadId, model: selectedModel?.id, turnId: userTurn._id }) });
      if (saveRes.ok) window.dispatchEvent(new Event('threads:refresh'));
    } catch (error: any) {
      setErrorMessage(error.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [message, activeThreadId, conversation, attachments, props, selectedModel]);

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = "24px";
      textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
    }
  }, [message, textAreaRef]);

  useEffect(() => {
    if (bottomOfChatRef.current) {
      bottomOfChatRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversation]);

  useEffect(() => {
    async function loadHistory() {
      if (!activeThreadId) {
        setConversation([]);
        return;
      }
      try {
        const res = await fetch(`/api/chat-history?threadId=${encodeURIComponent(activeThreadId)}`);
        if (!res.ok) return;
        const turns = await res.json();
        const msgs: any[] = [];
        for (const t of turns) {
          if (t.userContent) msgs.push({ role: "user", content: t.userContent, versions: t.versions, currentVersion: t.currentVersion, turnId: t._id });
          if (t.assistantContent) msgs.push({ role: "assistant", content: t.assistantContent, turnId: t._id });
        }
        setConversation(msgs);
      } catch {}
    }
    loadHistory();
  }, [activeThreadId]);

  const handleKeypress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.key === 'Enter' || e.code === 'Enter' || e.keyCode === 13) && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  const refreshConversation = useCallback(async () => {
    if (!activeThreadId) return;
    try {
      const res = await fetch(`/api/chat-history?threadId=${encodeURIComponent(activeThreadId)}`);
      if (!res.ok) return;
      const turns = await res.json();
      const msgs: any[] = [];
      for (const t of turns) {
        msgs.push({ role: "user", content: t.userContent, versions: t.versions, currentVersion: t.currentVersion, turnId: t._id });
        msgs.push({ role: "assistant", content: t.assistantContent, turnId: t._id, userContent: t.userContent });
      }
      setConversation(msgs);
      setShowEmptyChat(msgs.length === 0);
    } catch (err: any) {
      setErrorMessage("Failed to refresh conversation");
    }
  }, [activeThreadId]);

  const beginEdit = (msg: any) => {
    if (!msg?.turnId) return;
    setEditingTurnId(msg.turnId);
    setEditingDraft(msg.content || "");
  };
  const cancelEdit = () => {
    setEditingTurnId(null);
    setEditingDraft("");
  };
  const saveEdit = async () => {
    const turnId = editingTurnId;
    const newContent = editingDraft;
    if (!activeThreadId || !turnId) return;
    if (!newContent?.trim()) return;
    setIsLoading(true);
    setErrorMessage("");
    try {
      const patchRes = await fetch(`/api/chat-history`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ turnId, threadId: activeThreadId, content: newContent }) });
      if (!patchRes.ok) throw new Error("Failed to save edited message");
      const aiRes = await fetch(`/api/openai`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: newContent }], model: selectedModel }) });
      if (!aiRes.ok) throw new Error("Failed to get AI response");
      const aiData = await aiRes.json();
      await fetch(`/api/chat-history`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: aiData.message, role: "assistant", threadId: activeThreadId, model: selectedModel?.id, turnId }) });
      await refreshConversation();
      cancelEdit();
      window.dispatchEvent(new Event('threads:refresh'));
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save edit");
    } finally {
      setIsLoading(false);
    }
  };
  const handleVersionNav = async (msg: any, direction: "prev" | "next") => {
    if (!activeThreadId || !msg?.turnId) return;
    const versions = msg.versions || [];
    const current = msg.currentVersion ?? (versions.length - 1);
    const nextIndex = direction === "prev" ? current - 1 : current + 1;
    if (nextIndex < 0 || nextIndex >= versions.length) return;
    try {
      const res = await fetch(`/api/chat-history`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ turnId: msg.turnId, threadId: activeThreadId, version: nextIndex }) });
      if (!res.ok) throw new Error("Failed to switch version");
      await refreshConversation();
      window.dispatchEvent(new Event('threads:refresh'));
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to switch version");
    }
  };
  const handleRetry = async (msg: any) => {
    if (!activeThreadId || !msg?.turnId) return;
    const userMsg = conversation.find(m => m.role === 'user' && m.turnId === msg.turnId);
    const userContent = userMsg?.content || msg.userContent;
    if (!userContent) return;
    setIsLoading(true);
    setErrorMessage("");
    try {
      const aiRes = await fetch(`/api/openai`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: userContent }], model: selectedModel }) });
      if (!aiRes.ok) throw new Error("Failed to get AI response");
      const aiData = await aiRes.json();
      await fetch(`/api/chat-history`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: aiData.message, role: "assistant", threadId: activeThreadId, model: selectedModel?.id, turnId: msg.turnId }) });
      await refreshConversation();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to retry");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    errorMessage,
    showEmptyChat,
    conversation,
    message,
    setMessage,
    attachments,
    setAttachments,
    isAttachMenuOpen,
    setIsAttachMenuOpen,
    editingTurnId,
    editingDraft,
    setEditingDraft,
    textAreaRef,
    bottomOfChatRef,
    sendMessage,
    handleKeypress,
    beginEdit,
    cancelEdit,
    saveEdit,
    handleVersionNav,
    handleRetry,
  };
}
