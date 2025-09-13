import React from "react";
import { IoMdClose } from "react-icons/io";
import Sidebar from "./Sidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface MobileSidebarProps {
  toggleComponentVisibility: () => void;
  onSelectThread: (threadId: string) => void;
  onCreateThread: () => void;
  activeThreadId: string | null;
}

const MobileSiderbar = (props: MobileSidebarProps) => {
  const { toggleComponentVisibility, onSelectThread, onCreateThread, activeThreadId } = props;
  return (
    <Sheet open onOpenChange={toggleComponentVisibility}>
      <SheetContent side="left" className="p-0 bg-[#202123] border-none w-[260px]">
        <div className="flex flex-col h-full">
          <button
            type="button"
            className="ml-auto mt-2 mr-2 flex h-10 w-10 items-center justify-center focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            tabIndex={0}
            onClick={toggleComponentVisibility}
          >
            <span className="sr-only">Close sidebar</span>
            <IoMdClose className="h-6 w-6 text-white" />
          </button>
          <Sidebar onSelectThread={onSelectThread} onCreateThread={onCreateThread} activeThreadId={activeThreadId} />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileSiderbar;
