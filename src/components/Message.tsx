import { SiOpenai } from "react-icons/si";
import { HiUser } from "react-icons/hi";
import { TbCursorText } from "react-icons/tb";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FiThumbsUp, FiThumbsDown, FiCopy, FiRotateCcw, FiMoreHorizontal, FiChevronLeft, FiChevronRight, FiEdit3 } from "react-icons/fi";
import { Card } from "@/components/ui/card";

const Message = (props: any) => {
  const { message, onEdit, onPrevVersion, onNextVersion, onRetry, onCopy, isEditing, editingText, onEditingChange, onSaveEdit, onCancelEdit } = props;
  const { role, content: text, versions, currentVersion } = message;

  const isUser = role === "user";
  const displayText = text || "";  // Simplified content handling

  return (
    <div className={`w-full flex justify-center ${isUser ? "bg-[#343541]" : "bg-[#444654]"}`}>
      <div className={`w-full max-w-3xl flex flex-row gap-4 px-4 py-2`}>
        <div className="w-8 flex flex-col items-center pt-1">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${isUser ? "bg-[#19C37D]" : "bg-black"}`}>
            {isUser ? (
              <HiUser className="h-5 w-5 text-white" />
            ) : (
              <SiOpenai className="h-5 w-5 text-white" />
            )}
          </div>
        </div>
        <div className="flex-1 group">
          {isUser && Array.isArray(versions) && versions.length > 1 ? (
            <div className="flex items-center justify-start text-xs text-gray-400 mb-1 gap-2">
              <span className="rounded bg-[#2A2B32] px-2 py-0.5 text-[11px] uppercase tracking-wide">Edited</span>
              <span>{(typeof currentVersion === 'number' ? currentVersion + 1 : versions.length)} / {versions.length}</span>
            </div>
          ) : null}
          {isUser && isEditing ? (
            <div className="rounded-lg border border-[var(--border)] bg-[#343541]">
              <div className="px-3 pt-3 pb-1 text-[12px] text-chatgpt-muted">You are editing a message</div>
              <Textarea
                value={editingText}
                onChange={(e: any) => onEditingChange?.(e.target.value)}
                onKeyDown={(e: any) => {
                  if (e.key === 'Escape') { e.preventDefault(); onCancelEdit?.(); }
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSaveEdit?.(); }
                }}
                className="w-full resize-none border-0 bg-transparent p-3 text-white focus:ring-0 focus-visible:ring-0"
              />
              <div className="flex items-center gap-2 justify-end px-3 pb-3">
                <div className="mr-auto text-[11px] text-chatgpt-muted">Esc to cancel • Enter to save</div>
                <button className="px-3 py-1 text-sm rounded bg-[var(--hover)] text-slate-200" onClick={() => onCancelEdit?.()}>Cancel</button>
                <button className="px-3 py-1 text-sm rounded bg-[var(--primary)] text-black" onClick={() => onSaveEdit?.()}>Save & Submit</button>
              </div>
            </div>
          ) : (
            <div className={`rounded-lg px-5 py-3 whitespace-pre-wrap break-words text-base font-normal ${isUser ? "bg-[#343541] text-white" : "bg-[#444654] text-white"}`} style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              {!isUser && (text === null || text === undefined) ? (
                <TbCursorText className="h-6 w-6 animate-pulse" />
              ) : (
                <span>{displayText || ''}</span>
              )}
            </div>
          )}
          <div className="mt-2 flex items-center gap-3">
            <div className="ml-auto flex items-center gap-1 text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
              {isUser && onEdit ? (
                <button title="Edit" className="p-2 rounded hover:bg-[#2A2B32]" onClick={() => onEdit(message)}><FiEdit3 /></button>
              ) : null}
              <button title="Copy" className="p-2 rounded hover:bg-[#2A2B32]" onClick={() => onCopy?.(displayText)}><FiCopy /></button>
              {!isUser && (
                <>
                  <button title="Good response" className="p-2 rounded hover:bg-[#2A2B32]"><FiThumbsUp /></button>
                  <button title="Bad response" className="p-2 rounded hover:bg-[#2A2B32]"><FiThumbsDown /></button>
                  <button title="Regenerate" className="p-2 rounded hover:bg-[#2A2B32]" onClick={() => onRetry?.(message)}><FiRotateCcw /></button>
                </>
              )}
              {isUser && Array.isArray(versions) && versions.length > 1 ? (
                <div className="flex items-center gap-1 ml-1">
                  <button title="Previous" className="p-2 rounded hover:bg-[#2A2B32]" onClick={() => onPrevVersion?.(message)}><FiChevronLeft /></button>
                  <button title="Next" className="p-2 rounded hover:bg-[#2A2B32]" onClick={() => onNextVersion?.(message)}><FiChevronRight /></button>
                </div>
              ) : null}
              <button title="More" className="p-2 rounded hover:bg-[#2A2B32]"><FiMoreHorizontal /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Message;
