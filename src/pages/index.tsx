import { useEffect, useState } from "react";
import Chat from "@/components/Chat";
import MobileSiderbar from "@/components/MobileSidebar";
import Sidebar from "@/components/Sidebar";
import useAnalytics from "@/hooks/useAnalytics";
import { useUser, SignInButton } from "@clerk/nextjs";

export default function Home() {
  const [isComponentVisible, setIsComponentVisible] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const { trackEvent } = useAnalytics();
  const { isSignedIn } = useUser();

  useEffect(() => {
    trackEvent("page.view", { page: "home" });
  }, []);

  const toggleComponentVisibility = () => {
    setIsComponentVisible(!isComponentVisible);
  };

  const ensureThread = async () => {
    if (!isSignedIn) return null;
    if (activeThreadId) return activeThreadId;
    const res = await fetch('/api/threads', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      setActiveThreadId(data._id);
      return data._id as string;
    }
    return null;
  };

  return (
    <main className="w-full h-screen flex bg-[#343541]">
      {isComponentVisible ? (
        <MobileSiderbar
          toggleComponentVisibility={toggleComponentVisibility}
          activeThreadId={activeThreadId}
          onCreateThread={(id: string) => setActiveThreadId(id)}
          onSelectThread={(id: string) => setActiveThreadId(id)}
        />
      ) : null}
      <div className="hidden md:flex md:w-[260px] md:flex-col bg-[#202123] border-r border-[#343541]">
        <Sidebar
          activeThreadId={activeThreadId}
          onCreateThread={(id: string) => setActiveThreadId(id)}
          onSelectThread={(id: string) => setActiveThreadId(id)}
        />
      </div>
      <Chat
        toggleComponentVisibility={toggleComponentVisibility}
        activeThreadId={activeThreadId}
        ensureThread={ensureThread}
        onRequireSignIn={() => { }}
      />
    </main>
  );
}
