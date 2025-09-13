import { useEffect, useRef, useState } from "react";
import { FiSend } from "react-icons/fi";
import { BsPlus } from "react-icons/bs";
import { FiMic } from "react-icons/fi";
import { MdGraphicEq } from "react-icons/md";
import { BsChevronDown, BsPlusLg } from "react-icons/bs";
import { RxHamburgerMenu } from "react-icons/rx";
import useAnalytics from "@/hooks/useAnalytics";
import useAutoResizeTextArea from "@/hooks/useAutoResizeTextArea";
import Message from "./Message";
import { DEFAULT_OPENAI_MODEL } from "@/shared/Constants";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const Chat = (props: any) => {
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
  const uploadcareKey = process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY as string | undefined;

  useEffect(() => {
    console.log("Conversation updated:", conversation);
    setShowEmptyChat(conversation.length === 0);
  }, [conversation]);

  const sendMessage = async (e: any) => {
    e.preventDefault();
    
    if (!message.trim()) {
      setErrorMessage("Please enter a message.");
      return;
    }
    setErrorMessage("");

    const userMessage = message;
    setMessage("");
    setAttachments([]);
    setIsLoading(true);

    try {
      let threadId = await ensureThread?.();
      
      // Create new thread if one doesn't exist
      if (!threadId) {
        const res = await fetch('/api/threads', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: message.slice(0, 60) })
        });
        if (!res.ok) {
          throw new Error("Failed to create new chat.");
        }
        const data = await res.json();
        threadId = data._id;
      }

      // 1. Save user message and update UI
      const userTurnRes = await fetch(`/api/chat-history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMessage, role: "user", threadId, model: selectedModel?.id }),
      });

      if (!userTurnRes.ok) {
        throw new Error("Failed to save your message.");
      }
      
      const userTurn = await userTurnRes.json();
      setConversation(prev => [...prev, {
        role: "user",
        content: userMessage,
        turnId: userTurn._id,
        versions: userTurn.versions,
        currentVersion: userTurn.currentVersion
      }]);
      setShowEmptyChat(false);

      // 2. Get AI response
      const aiRes = await fetch(`/api/openai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...conversation, { content: userMessage, role: "user" }],
          model: selectedModel,
          attachments
        }),
      });

      if (!aiRes.ok) {
        throw new Error("Failed to get AI response");
      }

      const aiData = await aiRes.json();
      console.log("AI response received:", aiData);

      // 3. Update UI and save AI response
      setConversation(prev => [...prev, {
        role: "assistant",
        content: aiData.message,
        turnId: userTurn._id
      }]);

      const saveRes = await fetch(`/api/chat-history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: aiData.message,
          role: "assistant",
          threadId,
          model: selectedModel?.id,
          turnId: userTurn._id
        }),
      });

      if (saveRes.ok) {
        window.dispatchEvent(new Event('threads:refresh'));
      } else {
        console.error('Failed to save assistant response:', saveRes.status);
      }

    } catch (error: any) {
      console.error("Error in message flow:", error);
      setErrorMessage(error.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

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

  // Load chat history when a thread is selected
  useEffect(() => {
    async function loadHistory() {
      if (!activeThreadId) {
        setConversation([]);
        return;
      }
      try {
        console.log("Loading history for thread:", activeThreadId);
        const res = await fetch(`/api/chat-history?threadId=${encodeURIComponent(activeThreadId)}`);
        if (!res.ok) {
          console.error("Failed to load history:", res.status);
          return;
        }
        const turns = await res.json();
        console.log("Loaded turns:", turns);
        
        // Flatten turns into message list for the UI
        const msgs: any[] = [];
        for (const t of turns) {
          if (t.userContent) {
            msgs.push({ role: "user", content: t.userContent, versions: t.versions, currentVersion: t.currentVersion, turnId: t._id });
          }
          if (t.assistantContent) {
            msgs.push({ role: "assistant", content: t.assistantContent, turnId: t._id });
          }
        }
        console.log("Processed messages:", msgs);
        setConversation(msgs);
      } catch (error) {
        console.error("Error loading history:", error);
      }
    }
    loadHistory();
  }, [activeThreadId]);



  const handleKeypress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Triggers when pressing the enter key
    if (e.keyCode === 13 && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  // Helpers for editing and version navigation
  const refreshConversation = async () => {
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
      console.error("Error refreshing conversation:", err);
      setErrorMessage("Failed to refresh conversation");
    }
  };

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
      // Update user message
      const patchRes = await fetch(`/api/chat-history`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turnId, threadId: activeThreadId, content: newContent }),
      });
      if (!patchRes.ok) throw new Error("Failed to save edited message");

      // Get new AI response
      const aiRes = await fetch(`/api/openai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: [{ role: "user", content: newContent }],
          model: selectedModel
        }),
      });
      if (!aiRes.ok) throw new Error("Failed to get AI response");
      const aiData = await aiRes.json();

      // Save AI response
      await fetch(`/api/chat-history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          content: aiData.message,
          role: "assistant",
          threadId: activeThreadId,
          model: selectedModel?.id,
          turnId 
        }),
      });

      await refreshConversation();
      cancelEdit();
      window.dispatchEvent(new Event('threads:refresh'));
    } catch (err: any) {
      console.error("Edit failed:", err);
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
      const res = await fetch(`/api/chat-history`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          turnId: msg.turnId,
          threadId: activeThreadId,
          version: nextIndex 
        }),
      });
      if (!res.ok) throw new Error("Failed to switch version");
      
      await refreshConversation();
      window.dispatchEvent(new Event('threads:refresh'));
    } catch (err: any) {
      console.error("Version switch failed:", err);
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
      const aiRes = await fetch(`/api/openai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: [{ role: "user", content: userContent }],
          model: selectedModel 
        }),
      });
      if (!aiRes.ok) throw new Error("Failed to get AI response");
      
      const aiData = await aiRes.json();
      await fetch(`/api/chat-history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: aiData.message,
          role: "assistant",
          threadId: activeThreadId,
          model: selectedModel?.id,
          turnId: msg.turnId
        }),
      });

      await refreshConversation();
    } catch (err: any) {
      console.error("Retry failed:", err);
      setErrorMessage(err.message || "Failed to retry");
    } finally {
      setIsLoading(false);
    }
  };

  // Uploadcare helpers
  const waitForUploadcare = async (timeoutMs = 3000) => {
    const start = Date.now();
    return await new Promise<any>((resolve, reject) => {
      const tick = () => {
        // @ts-ignore
        if (typeof uploadcare !== 'undefined') return resolve((window as any).uploadcare);
        if (Date.now() - start > timeoutMs) return reject(new Error('Upload widget failed to load'));
        requestAnimationFrame(tick);
      };
      tick();
    });
  };

  const openUploadDialog = async (opts: any): Promise<string | null> => {
    try {
      const uc = await waitForUploadcare();
      const settings = { publicKey: uploadcareKey, multiple: false, ...opts };
      const dialog = uc.openDialog(null, settings);
      return await new Promise<string | null>((resolve) => {
        dialog.done((file: any) => {
          file.done((info: any) => resolve(info?.cdnUrl || (info?.cdnUrlModifiers ? info.cdnUrl + info.cdnUrlModifiers : null)));
        });
        dialog.fail(() => resolve(null));
      });
    } catch {
      return null;
    }
  };

  return (
    <div className="flex max-w-full flex-1 flex-col bg-chatgpt-bg min-h-screen">
      {/* Mobile Top Bar */}
      <div className="sticky top-0 z-10 flex items-center border-b border-chatgpt-border bg-chatgpt-bg pl-1 pt-1 text-white sm:pl-3 md:hidden">
        <Button variant="ghost" size="icon" className="-ml-0.5 -mt-0.5 h-10 w-10" onClick={toggleComponentVisibility}>
          <span className="sr-only">Open sidebar</span>
          <RxHamburgerMenu className="h-6 w-6 text-white" />
        </Button>
        <h1 className="flex-1 text-center text-base font-normal">New chat</h1>
        <Button variant="ghost" size="icon" className="px-3">
          <BsPlusLg className="h-6 w-6" />
        </Button>
      </div>
      <div className="relative h-full w-full transition-width flex flex-col overflow-hidden items-stretch flex-1">
        <div className="flex-1 overflow-hidden">
          <div className="h-full bg-chatgpt-bg">
            <div>
              {!showEmptyChat ? (
                <div className="flex flex-col items-center text-sm bg-chatgpt-bg">
                  <div className="flex w-full items-center justify-center gap-1 border-b border-chatgpt-border bg-chatgpt-card py-2 text-gray-300 text-xs">
                    <span className="opacity-70">Model:</span> <span className="font-medium">{selectedModel.name}</span>
                  </div>
                  {/* Scrollable chat container */}
                  <div
                    className="w-full flex flex-col overflow-y-auto"
                    style={{ maxHeight: "calc(100vh - 220px)" }}
                  >
                    {conversation.map((message, index) => {
                      console.log("Rendering message:", message); // Debug log
                      return (
                        <Message
                          key={index}
                          message={message}
                          onEdit={message.role === 'user' ? beginEdit : undefined}
                          isEditing={message.role === 'user' && message.turnId === editingTurnId}
                          editingText={message.role === 'user' && message.turnId === editingTurnId ? editingDraft : undefined}
                          onEditingChange={(val: string) => setEditingDraft(val)}
                          onSaveEdit={saveEdit}
                          onCancelEdit={cancelEdit}
                          onPrevVersion={message.role === 'user' ? (m: any) => handleVersionNav(m, 'prev') : undefined}
                          onNextVersion={message.role === 'user' ? (m: any) => handleVersionNav(m, 'next') : undefined}
                          onRetry={message.role === 'assistant' ? handleRetry : undefined}
                          onCopy={(text: string) => navigator.clipboard?.writeText?.(text)}
                        />
                      );
                    })}
                    <div className="w-full h-32 md:h-48 flex-shrink-0"></div>
                    <div ref={bottomOfChatRef}></div>
                  </div>
                </div>
              ) : null}
              {showEmptyChat ? (
                <div className="py-10 relative w-full flex flex-col h-full">
                  <h1 className="text-3xl sm:text-5xl font-bold text-center text-white flex gap-2 items-center justify-center h-screen font-chatgpt drop-shadow-lg">
                    ChatGPT Clone
                  </h1>
                </div>
              ) : null}
              <div className="flex flex-col items-center text-sm bg-slate-900"></div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full border-t md:border-t-0 border-chatgpt-border md:border-transparent md:bg-gradient-to-t from-chatgpt-bg via-chatgpt-bg/80 to-transparent pt-2">
          <form className="stretch mx-2 flex flex-row gap-3 last:mb-2 md:mx-4 md:last:mb-6 lg:mx-auto lg:max-w-2xl xl:max-w-3xl">
            <div className="relative flex flex-col h-full flex-1 items-stretch md:flex-col">
              {errorMessage ? (
                <div className="mb-2 md:mb-0">
                  <div className="h-full flex ml-1 md:w-full md:m-auto md:mb-2 gap-0 md:gap-2 justify-center">
                    <span className="text-red-500 text-sm">{errorMessage}</span>
                  </div>
                </div>
              ) : null}
              <div className="flex items-center w-full py-2 flex-grow md:py-3 md:pl-4 relative">
                <div className="flex items-center w-full bg-[#2b2c2f] rounded-full px-4 py-2 gap-2">
                  <div className="relative">
                    <button type="button" aria-haspopup="menu" aria-expanded={isAttachMenuOpen} aria-controls="attach-menu"
                      className="flex items-center justify-center w-9 h-9 rounded-full bg-[#353740] text-gray-300 hover:bg-[#40414f] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                      onClick={() => setIsAttachMenuOpen((v) => !v)}
                    >
                      <BsPlus className="w-5 h-5" />
                    </button>
                    <div id="attach-menu" role="menu" aria-label="Attach menu" className={`${isAttachMenuOpen ? '' : 'hidden'} absolute bottom-12 left-0 z-20 w-56 rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-lg`}
                      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setIsAttachMenuOpen(false); } }}>
                      <button type="button" role="menuitem"
                        className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-[var(--hover)]"
                        onClick={async () => {
                          const cdnUrl = await openUploadDialog({ imagesOnly: true });
                          if (cdnUrl) {
                            try {
                              const res = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileUrl: cdnUrl, type: 'image' }) });
                              const data = await res.json();
                              if (res.ok) setAttachments((prev) => [...prev, { url: data.url, type: 'image' }]);
                            } catch { }
                          }
                          setIsAttachMenuOpen(false);
                        }}
                      >
                        Attach image
                      </button>
                      <button type="button" role="menuitem"
                        className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-[var(--hover)]"
                        onClick={async () => {
                          const cdnUrl = await openUploadDialog({});
                          if (cdnUrl) {
                            try {
                              const res = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileUrl: cdnUrl, type: 'document' }) });
                              const data = await res.json();
                              if (res.ok) setAttachments((prev) => [...prev, { url: data.url, type: 'document' }]);
                            } catch { }
                          }
                          setIsAttachMenuOpen(false);
                        }}
                      >
                        Attach document
                      </button>
                    </div>
                  </div>
                  <Textarea
                    ref={textAreaRef}
                    value={message}
                    tabIndex={0}
                    style={{
                      height: "24px",
                      maxHeight: "200px",
                      overflowY: "hidden",
                    }}
                    placeholder="Message ChatGPT"
                    className="flex-1 resize-none border-0 bg-transparent p-0 focus:ring-0 focus-visible:ring-0 text-white font-chatgpt text-base min-h-[24px] max-h-[120px]"
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
                    onKeyDown={handleKeypress}
                    aria-label="Message input"
                  />
                  <div className="absolute left-4 right-28 -top-10 flex gap-2 flex-wrap">
                    {attachments.map((a, idx) => (
                      <span key={idx} className="inline-flex items-center gap-2 rounded-full bg-[var(--hover)] px-3 py-1 text-xs text-slate-200">
                        {a.type === 'image' ? 'Image' : 'File'}
                        <button type="button" className="opacity-80 hover:opacity-100" onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}>×</button>
                      </span>
                    ))}
                  </div>
                  <button type="button" aria-label="Start voice input" className="flex items-center justify-center w-9 h-9 rounded-full bg-[#353740] text-gray-300 hover:bg-[#40414f] focus:outline-none mr-1">
                    <FiMic className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    disabled={isLoading || message?.length === 0}
                    onClick={sendMessage}
                    aria-label="Send message"
                    className="flex items-center justify-center w-9 h-9 rounded-full bg-[#353740] text-gray-300 hover:bg-[#40414f] focus:outline-none disabled:opacity-40"
                  >
                    <MdGraphicEq className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </form>
          <div className="px-3 pt-2 pb-3 text-center text-xs text-gray-400 md:px-4 md:pt-3 md:pb-6">
            <span>
              ChatGPT Clone may produce inaccurate information about people,
              places, or facts.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
