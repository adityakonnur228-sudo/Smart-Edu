"use client";

import { useState, useEffect, useRef, useMemo, type MouseEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  Sparkles,
  Plus,
  Search,
  Trash2,
  MessageSquare,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Conversation = {
  id: string;
  title: string;
  lastActive: string;
  messages: any[];
};

interface TutorSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  conversations: Conversation[];
  activeConvId: string;
  setActiveConvId: (id: string) => void;
  startNewChat: () => void;
  deleteConversationHandler: (id: string, e: MouseEvent) => void;
  handleClearAllConversations: (e: MouseEvent) => void;
  searchConv?: string;
  setSearchConv?: (search: string) => void;
  hasMorePages?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

export function TutorSidebar({
  sidebarOpen,
  setSidebarOpen,
  conversations,
  activeConvId,
  setActiveConvId,
  startNewChat,
  deleteConversationHandler,
  handleClearAllConversations,
  searchConv = "",
  setSearchConv,
  hasMorePages = false,
  isLoadingMore = false,
  onLoadMore,
}: TutorSidebarProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchInput, setSearchInput] = useState(searchConv);
  const [debouncedQuery, setDebouncedQuery] = useState(searchConv);
  const [isMac] = useState(() => {
    if (typeof window !== "undefined") {
      return /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent);
    }
    return false;
  });

  // Debounce search input by 250ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput);
      if (setSearchConv) {
        setSearchConv(searchInput);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchInput, setSearchConv]);

  const isDebouncing = searchInput !== debouncedQuery;

  // Global Ctrl+K / Cmd+K shortcut listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        const target = e.target as HTMLElement | null;
        const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
        // Do not intercept if typing in another input (e.g. chat textarea)
        if (isInput && target !== searchInputRef.current) {
          return;
        }

        e.preventDefault();
        if (!sidebarOpen) {
          setSidebarOpen(true);
        }
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [sidebarOpen, setSidebarOpen]);

  // Handle Escape key in search input
  const handleInputKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (searchInput) {
        setSearchInput("");
        setDebouncedQuery("");
        if (setSearchConv) setSearchConv("");
      } else {
        searchInputRef.current?.blur();
      }
    }
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setDebouncedQuery("");
    if (setSearchConv) setSearchConv("");
    searchInputRef.current?.focus();
  };

  // Filter conversations by title and message content
  const filteredConversations = useMemo(() => {
    const query = debouncedQuery.trim().toLowerCase();
    if (!query) return conversations;

    return conversations.filter((c) => {
      // Title match
      if (c.title && c.title.toLowerCase().includes(query)) {
        return true;
      }
      // Content match where conversation data is loaded
      if (Array.isArray(c.messages)) {
        return c.messages.some((m) => {
          const content = typeof m === "string" ? m : m?.content;
          return typeof content === "string" && content.toLowerCase().includes(query);
        });
      }
      return false;
    });
  }, [conversations, debouncedQuery]);

  const closeMobileDrawer = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Panel */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] bg-brand-secondary border-r border-brand-neutral/20 flex flex-col transition-transform duration-200 ease-in-out
          md:static md:z-20 md:max-w-none md:transition-all
          ${sidebarOpen ? "translate-x-0 md:w-64 md:translate-x-0" : "-translate-x-full md:w-0 md:-ml-64 md:translate-x-0"}
          overflow-hidden
        `}
      >
        {/* Header: Title, Mobile Close, New Chat & Search */}
        <div className="p-3 border-b border-brand-neutral/20 space-y-2.5 shrink-0 bg-brand-sidebar">
          {/* AI Tutor Heading */}
          <div className="flex items-center justify-between pb-0.5">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-brand-accent shrink-0" />
              <span className="text-xs font-semibold text-brand-light">AI Tutor</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1 rounded text-brand-neutral hover:text-brand-light hover:bg-brand-raised transition-colors cursor-pointer"
              aria-label="Close sidebar drawer"
            >
              <X size={15} />
            </button>
          </div>

          {/* New Conversation Button */}
          <Button
            variant="primary"
            size="default"
            onClick={() => {
              startNewChat();
              closeMobileDrawer();
            }}
            icon={<Plus size={15} className="shrink-0" />}
            className="w-full h-10 font-semibold shadow-[0_0_12px_rgba(113,133,255,0.25)]"
          >
            New Conversation
          </Button>

          {/* Premium Search Conversations Input */}
          <div className="relative w-full" role="search">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted shrink-0 pointer-events-none"
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              type="text"
              aria-label="Search conversations"
              placeholder="Search conversations..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
              className="w-full h-10 pl-9.5 pr-14 bg-brand-primary/90 border border-brand-neutral/20 rounded-lg text-xs sm:text-[13px] text-brand-light placeholder:text-zinc-500 placeholder:text-xs focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/30 transition-all duration-200"
            />

            {/* Right Action: Loading Spinner, Clear Button, or Shortcut Hint */}
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
              {isDebouncing ? (
                <Loader2 size={13} className="animate-spin text-brand-muted shrink-0" />
              ) : searchInput ? (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="p-1 rounded-md text-brand-muted hover:text-brand-light hover:bg-brand-raised/50 transition-colors cursor-pointer"
                  aria-label="Clear search query"
                  title="Clear search (Esc)"
                >
                  <X size={14} />
                </button>
              ) : (
                <kbd
                  className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium text-brand-muted bg-brand-raised/60 rounded border border-brand-neutral/20 select-none pointer-events-none"
                  title={`Press ${isMac ? "⌘K" : "Ctrl+K"} to search`}
                >
                  {isMac ? "⌘K" : "Ctrl K"}
                </kbd>
              )}
            </div>
          </div>
        </div>

        {/* Previous Conversations List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
          {/* List Section Header */}
          <div className="flex items-center justify-between px-2.5 py-1.5 text-[11px] font-medium text-brand-muted uppercase tracking-wider select-none">
            <span>
              {debouncedQuery.trim()
                ? `Results (${filteredConversations.length})`
                : `Conversations (${conversations.length})`}
            </span>
            {debouncedQuery.trim() ? (
              <button
                type="button"
                onClick={handleClearSearch}
                className="text-[10px] text-brand-accent hover:underline cursor-pointer transition-colors lowercase"
                title="Clear active filter"
              >
                clear
              </button>
            ) : filteredConversations.length > 0 ? (
              <button
                type="button"
                onClick={handleClearAllConversations}
                className="text-[10px] text-brand-muted hover:text-rose-400 cursor-pointer transition-colors lowercase"
                title="Clear all conversations"
              >
                clear all
              </button>
            ) : null}
          </div>

          {/* Conversations Items */}
          {filteredConversations.map((c) => {
            const isActive = c.id === activeConvId;
            return (
              <div
                key={c.id}
                onClick={() => {
                  setActiveConvId(c.id);
                  closeMobileDrawer();
                }}
                className={`group flex items-center justify-between px-2.5 py-2 rounded-md text-xs transition-colors cursor-pointer ${
                  isActive
                    ? "bg-brand-primary text-brand-light font-medium border-l-2 border-brand-accent shadow-sm"
                    : "text-brand-neutral hover:text-brand-light hover:bg-brand-primary/50"
                }`}
              >
                <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                  <MessageSquare
                    size={13}
                    className={isActive ? "text-brand-accent shrink-0" : "text-brand-muted shrink-0"}
                  />
                  <span className="truncate">{c.title}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => deleteConversationHandler(c.id, e)}
                  aria-label={`Delete conversation ${c.title}`}
                  className="opacity-0 group-hover:opacity-100 p-1 text-brand-muted hover:text-rose-400 rounded transition-all shrink-0 ml-1.5 cursor-pointer"
                  title="Delete conversation"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}

          {/* Pagination: Load More Button */}
          {!debouncedQuery.trim() && hasMorePages && (
            <div className="pt-2 pb-1 px-1 text-center">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="w-full py-1.5 px-3 text-[11px] font-medium text-brand-neutral hover:text-brand-light bg-brand-primary/40 hover:bg-brand-primary/80 border border-brand-neutral/20 rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 size={12} className="animate-spin text-brand-accent shrink-0" />
                    <span>Loading conversations...</span>
                  </>
                ) : (
                  <span>Load more conversations</span>
                )}
              </button>
            </div>
          )}

          {/* Empty State: No search results */}
          {filteredConversations.length === 0 && debouncedQuery.trim() && (
            <div className="py-10 px-4 text-center space-y-2.5">
              <div className="w-9 h-9 rounded-full bg-brand-primary/60 border border-brand-neutral/15 flex items-center justify-center mx-auto text-brand-muted">
                <Search size={15} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-brand-light">No matching conversations found.</p>
                <p className="text-[11px] text-brand-muted leading-relaxed">
                  No conversations matched &ldquo;{debouncedQuery}&rdquo;
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearSearch}
                className="text-xs text-brand-accent hover:underline font-medium inline-block pt-1 cursor-pointer"
              >
                Clear search
              </button>
            </div>
          )}

          {/* Empty State: Initial conversation list is empty */}
          {conversations.length === 0 && !debouncedQuery.trim() && (
            <div className="px-3 py-8 text-center text-xs text-brand-muted">
              No conversations yet
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
