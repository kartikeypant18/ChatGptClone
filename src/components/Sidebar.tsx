import React, { useEffect, useState } from "react";
import { AiOutlinePlus, AiOutlineSetting } from "react-icons/ai";
import { FiMessageSquare, FiTrash2 } from "react-icons/fi";
import { BiLinkExternal } from "react-icons/bi";
import { MdLogout } from "react-icons/md";
import { Button } from "@/components/ui/button";
import { useUser, SignInButton, UserButton } from "@clerk/nextjs";

const Sidebar = (props: any) => {
  const { onSelectThread, onCreateThread, activeThreadId } = props;
  const { isSignedIn, isLoaded, user } = useUser();
  const [threads, setThreads] = useState<any[]>([]);
  const [confirming, setConfirming] = useState<{ id: string; title: string } | null>(null);

  const loadThreads = async () => {
    if (!isSignedIn) {
      setThreads([]);
      return;
    }
    try {
      const res = await fetch('/api/threads', { 
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setThreads(data);
      } else {
        console.error('Failed to load threads:', res.status);
      }
    } catch (error) {
      console.error('Error loading threads:', error);
    }
  };

  const handleDelete = async (threadId: string) => {
    try {
      const res = await fetch('/api/threads', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ threadId }) });
      if (!res.ok) throw new Error('Failed to delete');
      if (activeThreadId === threadId) {
        onSelectThread?.(null);
      }
      await loadThreads();
      try { window.dispatchEvent(new Event('threads:refresh')); } catch { }
    } catch { }
  };

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      loadThreads();
    } else if (isLoaded && !isSignedIn) {
      setThreads([]);
    }
  }, [isLoaded, isSignedIn]);

  // Refresh thread list when other parts of the app signal updates
  useEffect(() => {
    let isSubscribed = true;
    
    async function handleRefresh() {
      if (isSubscribed) {
        await loadThreads();
      }
    }

    const handleFocus = async () => {
      if (isSubscribed && document.hasFocus()) {
        await loadThreads();
      }
    };

    const handleVisibility = async () => {
      if (isSubscribed && document.visibilityState === 'visible') {
        await loadThreads();
      }
    };

    window.addEventListener('threads:refresh', handleRefresh as any);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isSubscribed = false;
      window.removeEventListener('threads:refresh', handleRefresh as any);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isSignedIn]);
  return (
    <aside role="navigation" aria-label="Conversations" className="flex flex-col h-full w-[260px] bg-[var(--sidebar)] border-r border-[var(--border)] select-none">
      {/* Top: New Chat */}
      <div className="p-2">
        <Button onClick={async () => {
          if (!isSignedIn) return;
          const res = await fetch('/api/threads', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
          if (res.ok) {
            const data = await res.json();
            onCreateThread?.(data._id, data);
            await loadThreads();
          }
        }} className="w-full flex items-center gap-3 rounded-full bg-[var(--background)] text-white border-0 hover:bg-[var(--card)] px-4 py-3 h-12 shadow-none" aria-label="New chat">
          <AiOutlinePlus className="h-5 w-5" />
          <span className="font-medium text-base">New chat</span>
        </Button>
      </div>
      {/* Middle: Conversation List */}
      <div className="flex-1 flex flex-col gap-1 px-2 overflow-y-auto">
        {threads.map((t) => (
          <div key={t._id} className="group relative">
            <Button onClick={() => onSelectThread?.(t._id, t)} variant={activeThreadId === t._id ? "default" : "ghost"} className={`flex items-center gap-3 rounded-lg px-3 py-3 w-full justify-start ${activeThreadId === t._id ? 'bg-[var(--card)] text-white' : 'text-slate-200 hover:bg-[var(--hover)]'}`} aria-label={`Open conversation ${t.title || 'Untitled'}`}>
              <FiMessageSquare className="h-5 w-5" />
              <span className="flex-1 text-ellipsis max-h-5 overflow-hidden break-all relative text-sm">{t.title || 'Untitled'}</span>
            </Button>
            <button
              title="Delete chat"
              aria-label="Delete chat"
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded hover:bg-[var(--hover)] text-slate-300"
              onClick={(e) => { e.stopPropagation(); setConfirming({ id: t._id, title: t.title || 'Untitled' }); }}
            >
              <FiTrash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      {/* ChatGPT-like confirmation modal */}
      {confirming ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-desc">
          <div className="absolute inset-0 bg-black/60"></div>
          <div className="relative w-full max-w-sm rounded-lg bg-[var(--background)] border border-[var(--border)] shadow-xl mx-4">
            <div className="px-4 pt-4 pb-2">
              <h3 id="delete-title" className="text-base font-semibold text-white">Delete chat?</h3>
              <p id="delete-desc" className="mt-1 text-[13px] text-chatgpt-muted">“{confirming.title}” and all its messages will be permanently removed.</p>
            </div>
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--border)]">
              <Button variant="ghost" className="text-slate-200 hover:bg-[var(--hover)]" onClick={() => setConfirming(null)} aria-label="Cancel delete">Cancel</Button>
              <Button className="bg-red-600 hover:bg-red-500 text-white" onClick={async () => { await handleDelete(confirming.id); setConfirming(null); }} aria-label="Confirm delete">Delete</Button>
            </div>
          </div>
        </div>
      ) : null}
      {/* Bottom: Profile/Settings/Help/Logout */}
      <div className="flex flex-col gap-1 p-2 border-t border-[var(--border)]">
        {isSignedIn ? (
          <div className="flex items-center gap-3 px-3 py-3">
            <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: 'w-9 h-9', userButtonPopoverCard: 'bg-[var(--background)] text-white' } }} />
            <span className="flex-1 text-left text-sm font-semibold text-white">{user?.fullName || user?.username || user?.primaryEmailAddress?.emailAddress || "User"}</span>
          </div>
        ) : (
          <SignInButton mode="modal">
            <Button variant="ghost" className="flex items-center gap-3 rounded-lg text-slate-200 hover:bg-[var(--hover)] px-3 py-3 w-full justify-start">
              <span className="w-7 h-7 rounded-full bg-[#40414f] flex items-center justify-center text-xs font-semibold text-white">?</span>
              <span className="flex-1 text-left text-sm">Sign in</span>
            </Button>
          </SignInButton>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
