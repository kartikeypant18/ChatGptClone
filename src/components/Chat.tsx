import { FiSend } from "react-icons/fi";
import { BsPlus, BsChevronDown, BsPlusLg } from "react-icons/bs";
import { RxHamburgerMenu } from "react-icons/rx";
import Message from "./Message";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import useChatLogic from "@/hooks/useChatLogic";
import useUploadcare from "@/hooks/useUploadcare";


const Chat = (props: any) => {
  const uploadcareKey = process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY as string | undefined;
  const chat = useChatLogic(props);
  const { openUploadDialog } = useUploadcare(uploadcareKey);

  return (
    <div className="flex max-w-full flex-1 flex-col bg-chatgpt-bg min-h-screen">
      {/* Mobile Top Bar */}
      <div className="sticky top-0 z-10 flex items-center border-b border-chatgpt-border bg-chatgpt-bg pl-1 pt-1 text-white sm:pl-3 md:hidden">
        <Button variant="ghost" size="icon" className="-ml-0.5 -mt-0.5 h-10 w-10" onClick={props.toggleComponentVisibility}>
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
              {!chat.showEmptyChat ? (
                <div className="flex flex-col items-center text-sm bg-chatgpt-bg">
                  <div className="flex w-full items-center justify-center gap-1 border-b border-chatgpt-border bg-chatgpt-card py-2 text-gray-300 text-xs">
                    <span className="opacity-70">Model:</span> <span className="font-medium">ChatGPT-3.5</span>
                  </div>
                  {/* Scrollable chat container */}
                  <div
                    className="w-full flex flex-col overflow-y-auto"
                    style={{ maxHeight: "calc(100vh - 220px)" }}
                  >
                    {chat.conversation.map((message, index) => (
                      <div className="message-appear hover-message" key={index}>
                        <Message
                          message={message}
                          onEdit={message.role === 'user' ? chat.beginEdit : undefined}
                          isEditing={message.role === 'user' && message.turnId === chat.editingTurnId}
                          editingText={message.role === 'user' && message.turnId === chat.editingTurnId ? chat.editingDraft : undefined}
                          onEditingChange={chat.setEditingDraft}
                          onSaveEdit={chat.saveEdit}
                          onCancelEdit={chat.cancelEdit}
                          onPrevVersion={message.role === 'user' ? (m: any) => chat.handleVersionNav(m, 'prev') : undefined}
                          onNextVersion={message.role === 'user' ? (m: any) => chat.handleVersionNav(m, 'next') : undefined}
                          onRetry={message.role === 'assistant' ? chat.handleRetry : undefined}
                          onCopy={(text: string) => navigator.clipboard?.writeText?.(text)}
                        />
                      </div>
                    ))}
                    <div className="w-full h-32 md:h-48 flex-shrink-0"></div>
                    <div ref={chat.bottomOfChatRef}></div>
                  </div>
                </div>
              ) : null}
              {chat.showEmptyChat ? (
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
              {chat.errorMessage ? (
                <div className="mb-2 md:mb-0">
                  <div className="h-full flex ml-1 md:w-full md:m-auto md:mb-2 gap-0 md:gap-2 justify-center">
                    <span className="text-red-500 text-sm">{chat.errorMessage}</span>
                  </div>
                </div>
              ) : null}
              <div className="flex items-center w-full py-2 flex-grow md:py-3 md:pl-4 relative">
                <div className="flex items-center w-full bg-[#2b2c2f] rounded-full px-4 py-2 gap-2">
                  <div className="relative">
                    <button type="button" aria-haspopup="menu" aria-expanded={chat.isAttachMenuOpen} aria-controls="attach-menu"
                      className="flex items-center justify-center w-9 h-9 rounded-full bg-[#353740] text-gray-300 hover:bg-[#40414f] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                      onClick={() => chat.setIsAttachMenuOpen((v) => !v)}
                    >
                      <BsPlus className="w-5 h-5" />
                    </button>
                    <div id="attach-menu" role="menu" aria-label="Attach menu" className={`${chat.isAttachMenuOpen ? '' : 'hidden'} absolute bottom-12 left-0 z-20 w-56 rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-lg`}
                      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); chat.setIsAttachMenuOpen(false); } }}>
                      <button type="button" role="menuitem"
                        className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-[var(--hover)]"
                        onClick={async () => {
                          const cdnUrl = await openUploadDialog({ imagesOnly: true });
                          if (cdnUrl) {
                            try {
                              const res = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileUrl: cdnUrl, type: 'image' }) });
                              const data = await res.json();
                              if (res.ok) chat.setAttachments((prev) => [...prev, { url: data.url, type: 'image' }]);
                            } catch { }
                          }
                          chat.setIsAttachMenuOpen(false);
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
                              if (res.ok) chat.setAttachments((prev) => [...prev, { url: data.url, type: 'document' }]);
                            } catch { }
                          }
                          chat.setIsAttachMenuOpen(false);
                        }}
                      >
                        Attach document
                      </button>
                    </div>
                  </div>
                  <Textarea
                    ref={chat.textAreaRef}
                    value={chat.message}
                    tabIndex={0}
                    style={{
                      height: "24px",
                      maxHeight: "200px",
                      overflowY: "hidden",
                    }}
                    placeholder="Message ChatGPT"
                    className="flex-1 resize-none border-0 bg-transparent p-0 focus:ring-0 focus-visible:ring-0 text-white font-chatgpt text-base min-h-[24px] max-h-[120px]"
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => chat.setMessage(e.target.value)}
                    onKeyDown={chat.handleKeypress}
                    aria-label="Message input"
                  />
                  <div className="absolute left-4 right-28 -top-10 flex gap-2 flex-wrap">
                    {chat.attachments.map((a, idx) => (
                      <span key={idx} className="inline-flex items-center gap-2 rounded-full bg-[var(--hover)] px-3 py-1 text-xs text-slate-200">
                        {a.type === 'image' ? 'Image' : 'File'}
                        <button type="button" className="opacity-80 hover:opacity-100" onClick={() => chat.setAttachments((prev) => prev.filter((_, i) => i !== idx))}>×</button>
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={chat.isLoading || chat.message?.length === 0}
                    onClick={chat.sendMessage}
                    aria-label="Send message"
                    className="flex items-center justify-center w-9 h-9 rounded-full bg-[#353740] text-gray-300 hover:bg-[#40414f] focus:outline-none disabled:opacity-40"
                  >
                    <FiSend className="w-5 h-5" />
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
