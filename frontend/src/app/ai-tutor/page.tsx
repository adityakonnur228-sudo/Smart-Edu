"use client";

import { useRef, useState, useEffect, useCallback, type FormEvent, type KeyboardEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Paperclip,
  Send,
  Trash2,
  Copy,
  Check,
  Search,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp,
  Eye,
  MessageSquare,
  Shield,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  AlertCircle,
} from "lucide-react";
import { Navbar } from "../navbar";
import { Button } from "@/components/ui/button";
import { MarkdownView } from "@/components/ui/markdown-view";
import { TutorSidebar } from "./tutor-sidebar";
import {
  useTutorConversations,
  useCreateTutorConversation,
  useAskTutor,
  useAskTutorGrounded,
  useDeleteTutorConversation,
  useClearAllTutorConversations,
  useRenameTutorConversation,
  useTutorHealth,
  type TutorAskResponse,
  type TutorSource,
  type TutorConversationPage,
} from "@/hooks/useTutor";
import { useMaterials, useUploadMaterial } from "@/hooks/useMaterials";
import {  api , API } from "@/lib/api";

type ChatMessage = {
  id: string | number;
  role: "USER" | "TUTOR";
  content: string;
  timestamp: string;
  sources?: TutorSource[];
  grounded?: boolean;
  attachment?: {
    name: string;
    size: string;
  };
  attachments?: Array<{
    id?: number;
    name?: string;
    size?: string;
    type?: string;
    status?: string;
  }>;
};

type AttachedDocState = {
  file: File;
  name: string;
  size: string;
  materialId?: number;
  status: "uploading" | "indexing" | "ready" | "failed";
  error?: string;
};

type Conversation = {
  id: string;
  title: string;
  lastActive: string;
  messages: ChatMessage[];
};

type DocumentItem = {
  id: number;
  title: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  status: string;
  summary: string | null;
  createdAt?: string | null;
};

const STARTER_PROMPTS = [
  "Summarize key concepts from my notes",
  "Generate 5 active recall questions",
  "Explain the core arguments in this document",
  "What are the main definitions and formulas?",
];

export default function TutorPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auth verification
  useEffect(() => {
    fetch(`${API}/auth/me`, { credentials: "include" })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          router.push("/login?redirect=/ai-tutor");
        }
      })
      .catch(() => {});
  }, [router]);

  // Data fetching
  const [conversationPage, setConversationPage] = useState(0);
  const { data: conversationsData = { content: [], totalElements: 0, totalPages: 0 }, refetch: refetchConversations, isFetching: isFetchingConversations } = useTutorConversations(conversationPage, 20);
  const { data: materialsData = { content: [] }, refetch: refetchMaterials } = useMaterials();
  const { data: healthData } = useTutorHealth();

  const totalPages = conversationsData?.totalPages ?? 0;
  const hasMorePages = conversationPage + 1 < totalPages;
  const isLoadingMore = isFetchingConversations && conversationPage > 0;

  const handleLoadMore = () => {
    if (hasMorePages && !isLoadingMore) {
      setConversationPage((p) => p + 1);
    }
  };

  // Mutations
  const createConversation = useCreateTutorConversation();
  const askTutor = useAskTutor();
  const askTutorGrounded = useAskTutorGrounded();
  const deleteConversation = useDeleteTutorConversation();
  const clearAllConversations = useClearAllTutorConversations();
  const renameConversation = useRenameTutorConversation();
  const uploadMaterial = useUploadMaterial();

  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>("");
  const [inputText, setInputText] = useState("");
  const [attachedDoc, setAttachedDoc] = useState<AttachedDocState | null>(null);
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | number | null>(null);
  const [searchConv, setSearchConv] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 768;
    }
    return true;
  });
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<number[]>([]);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [showSourceModal, setShowSourceModal] = useState<{ source: TutorSource; messageId: string | number } | null>(null);
  const [loadingConvId, setLoadingConvId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ai_tutor_model") || "smartstudy-tutor";
    }
    return "smartstudy-tutor";
  });

  const handleModelChange = (m: string) => {
    setSelectedModel(m);
    localStorage.setItem("ai_tutor_model", m);
  };

  // Sync conversations list from server without wiping already-loaded messages or active local chats
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const serverConversations = conversationsData?.content || [];
      if (!serverConversations || serverConversations.length === 0) {
        if (conversationPage === 0) {
          setConversations((prev) => prev.filter((c) => c.id.startsWith("conv-")));
        }
        return;
      }
      setConversations((prev) => {
        const prevMap = new Map(prev.map((c) => [c.id, c]));
        const localConvs = prev.filter((c) => c.id.startsWith("conv-"));
        const serverConvs = serverConversations.map((c: any) => {
          const idStr = String(c.id);
          const existing = prevMap.get(idStr);
          return {
            id: idStr,
            title: c.title,
            lastActive: c.createdAt,
            messages: existing && existing.messages && existing.messages.length > 0 ? existing.messages : [],
          };
        });

        if (conversationPage === 0) {
          return [...localConvs, ...serverConvs];
        } else {
          const existingIds = new Set(prev.map((c) => c.id));
          const toAdd = serverConvs.filter((c: any) => !existingIds.has(c.id));
          return [...prev, ...toAdd];
        }
      });
      setActiveConvId((curr) => {
        if (!curr && serverConversations.length > 0) {
          return String(serverConversations[0].id);
        }
        return curr;
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [conversationsData, conversationPage]);

  // Load conversation messages whenever activeConvId changes
  useEffect(() => {
    if (!activeConvId || activeConvId.startsWith("conv-")) return;
    const numId = parseInt(activeConvId, 10);
    if (isNaN(numId)) return;

    let isSubscribed = true;
    const timeoutId = window.setTimeout(() => {
      setLoadingConvId(activeConvId);
      void api.get<{ conversation: any; messages: any[] }>(`/tutor/conversations/${numId}`)
      .then((res) => {
        if (!isSubscribed || !res) return;
        const fetchedMessages: ChatMessage[] = (res.messages || []).map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.createdAt
            ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "Just now",
          sources: m.sources,
          grounded: Array.isArray(m.sources) && m.sources.length > 0,
          attachments: m.attachments,
        }));

        setConversations((prev) => {
          const exists = prev.some((c) => c.id === activeConvId);
          if (exists) {
            return prev.map((c) =>
              c.id === activeConvId
                ? {
                    ...c,
                    title: res.conversation?.title || c.title,
                    messages: fetchedMessages,
                  }
                : c
            );
          } else if (res.conversation) {
            return [
              {
                id: String(res.conversation.id),
                title: res.conversation.title,
                lastActive: res.conversation.createdAt,
                messages: fetchedMessages,
              },
              ...prev,
            ];
          }
          return prev;
        });
      })
      .catch((err) => {
        console.error("Failed to load conversation details:", err);
      })
      .finally(() => {
        if (isSubscribed) setLoadingConvId(null);
      });
    }, 0);

    return () => {
      isSubscribed = false;
      window.clearTimeout(timeoutId);
    };
  }, [activeConvId]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations, activeConvId, isTyping]);

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const messages = activeConv?.messages || [];
  const documents: DocumentItem[] = (materialsData.content || []) as unknown as DocumentItem[];
  const availableDocuments = documents.filter((d) => d.status === "COMPLETED");
  const isOllamaHealthy = Boolean((healthData as any)?.ollama?.server === "healthy");

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    const sizeStr = `${sizeMb === "0.0" ? "< 0.1" : sizeMb} MB`;

    setAttachedDoc({
      file,
      name: file.name,
      size: sizeStr,
      status: "uploading",
    });

    try {
      const uploadedMat = await uploadMaterial.mutateAsync(file);
      if (!uploadedMat?.id) {
        throw new Error("Material upload did not return an ID.");
      }

      const matId = uploadedMat.id;
      setAttachedDoc({
        file,
        name: file.name,
        size: sizeStr,
        materialId: matId,
        status: "indexing",
      });

      // Poll until document is indexed in ChromaDB or completed
      let isReady = false;
      for (let attempt = 0; attempt < 60; attempt++) {
        await new Promise((r) => setTimeout(r, 700));
        try {
          const res = await api.get<{ status: string; ready?: boolean; processingError?: string }>(`/materials/${matId}`);
          if (res?.status === "INDEXED" || res?.status === "COMPLETED" || res?.ready === true) {
            isReady = true;
            break;
          }
          if (res?.status === "FAILED") {
            throw new Error(res.processingError || "Document processing failed.");
          }
        } catch (pollErr: any) {
          if (pollErr?.message && (pollErr.message.includes("failed") || pollErr.message.includes("Failed"))) {
            throw pollErr;
          }
        }
      }

      if (isReady) {
        setAttachedDoc({
          file,
          name: file.name,
          size: sizeStr,
          materialId: matId,
          status: "ready",
        });
        setSelectedMaterialIds([matId]);
        refetchMaterials();
      } else {
        throw new Error("Indexing timed out. Please try sending your query or re-uploading.");
      }
    } catch (err: any) {
      console.error("Document upload/indexing error:", err);
      setAttachedDoc((prev) =>
        prev
          ? {
              ...prev,
              status: "failed",
              error: err?.message || "Failed to process document",
            }
          : null
      );
    }
  };

  const handleSendMessage = useCallback(async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query && !attachedDoc) return;
    if (attachedDoc && attachedDoc.status !== "ready") return;

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const currentAttached = attachedDoc;
    const currentQuery = query;
    const currentSelectedMaterials = [...selectedMaterialIds];
    let currentConvId = activeConvId;

    const userAttachments = currentAttached && currentAttached.materialId ? [{
      id: currentAttached.materialId,
      name: currentAttached.name,
      size: currentAttached.size,
      status: currentAttached.status,
    }] : undefined;

    const userMsg: ChatMessage = {
      id: Date.now(),
      role: "USER",
      content: query || `Uploaded document: ${currentAttached?.name}`,
      timestamp: now,
      attachment: currentAttached ? { name: currentAttached.name, size: currentAttached.size } : undefined,
      attachments: userAttachments,
    };

    setInputText("");
    setAttachedDoc(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    // If no active conversation exists, generate a new conversation entry immediately
    if (!currentConvId || !conversations.some((c) => c.id === currentConvId)) {
      currentConvId = `conv-${Date.now()}`;
      setActiveConvId(currentConvId);
      const newConv: Conversation = {
        id: currentConvId,
        title: query ? (query.length > 28 ? query.slice(0, 28) + "..." : query) : (currentAttached?.name || "Study Chat"),
        lastActive: "Just now",
        messages: [userMsg],
      };
      setConversations((prev) => [newConv, ...prev.filter((c) => c.id !== currentConvId)]);
    } else {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === currentConvId) {
            return {
              ...c,
              lastActive: "Just now",
              messages: [...c.messages, userMsg],
            };
          }
          return c;
        })
      );
    }

    setIsTyping(true);

    try {
      let targetMaterialIds: number[] = [];
      let payloadAttachments: any[] = [];

      if (currentAttached && currentAttached.materialId) {
        targetMaterialIds = [currentAttached.materialId];
        payloadAttachments = [{
          id: currentAttached.materialId,
          name: currentAttached.name,
          size: currentAttached.size,
        }];
      } else if (currentSelectedMaterials.length > 0) {
        targetMaterialIds = [...currentSelectedMaterials];
      }

      const dbConvId = currentConvId && !currentConvId.startsWith("conv-") && !isNaN(Number(currentConvId))
        ? parseInt(currentConvId, 10)
        : undefined;

      let result: TutorAskResponse;
      if (targetMaterialIds.length > 0) {
        result = await askTutorGrounded.mutateAsync({
          question: currentQuery || `Summarize key concepts from: ${currentAttached?.name}`,
          materialIds: targetMaterialIds,
          attachments: payloadAttachments,
          conversationId: dbConvId,
          model: selectedModel,
        });
      } else {
        result = await askTutor.mutateAsync({
          question: currentQuery || `Hello!`,
          conversationId: dbConvId,
          grounded: true,
          model: selectedModel,
        });
      }

      const tutorReply: ChatMessage = {
        id: Date.now() + 1,
        role: "TUTOR",
        content: result.messages[result.messages.length - 1]?.content || "No response generated.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        sources: result.messages[result.messages.length - 1]?.sources,
        grounded: result.grounded,
      };

      const finalConvId = result.conversationId ? String(result.conversationId) : currentConvId;
      if (currentConvId !== finalConvId) {
        setActiveConvId(finalConvId);
      }

      setConversations((prev) => {
        const found = prev.some((c) => c.id === currentConvId || c.id === finalConvId);
        if (!found) {
          return [
            {
              id: finalConvId,
              title: currentQuery ? (currentQuery.length > 28 ? currentQuery.slice(0, 28) + "..." : currentQuery) : "Study Chat",
              lastActive: "Just now",
              messages: [userMsg, tutorReply],
            },
            ...prev,
          ];
        }
        return prev.map((c) => {
          if (c.id === currentConvId || c.id === finalConvId) {
            return {
              ...c,
              id: finalConvId,
              messages: [...c.messages, tutorReply],
            };
          }
          return c;
        });
      });

      refetchConversations();
    } catch (error: any) {
      const status = error?.status;
      const code = error?.code;
      const rawMsg = error?.message || "An unexpected error occurred.";

      let contentMsg = `**Error**: ${rawMsg}`;
      if (status === 401 || status === 403 || code === "UNAUTHORIZED" || code === "FORBIDDEN" || rawMsg.includes("403") || rawMsg.includes("401")) {
        contentMsg = `**Session Expired / Authentication Required**\n\nYour login session has expired or you are not currently signed in.\n\nPlease **[Click here to Log In](/login?redirect=/ai-tutor)** to continue your conversation.`;
      } else if (status === 422 || code === "VALIDATION_ERROR") {
        contentMsg = `**Input Validation**: ${rawMsg.replace(/HTTP 422:?\s*/i, "")}`;
      } else if (status === 400 || status === 404 || code === "MODEL_ERROR") {
        contentMsg = `**Model Configuration**: ${rawMsg.replace(/HTTP (400|404):?\s*/i, "")}`;
      } else if (status === 504 || code === "TIMEOUT_ERROR") {
        contentMsg = `**Request Timeout**: The local AI engine took too long to complete generation. Try asking a more specific question or using a shorter context.`;
      } else if (status === 503 || code === "SERVICE_UNAVAILABLE" || rawMsg.includes("Connection refused") || rawMsg.includes("Failed to fetch")) {
        contentMsg = `**AI Inference Unavailable**: Could not connect to the configured AI inference endpoint. Please check that the AI service is online and accessible.`;
      } else if (status === 409) {
        contentMsg = `**Document Processing**: ${rawMsg}`;
      }

      const tutorReply: ChatMessage = {
        id: Date.now() + 1,
        role: "TUTOR",
        content: contentMsg,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        grounded: false,
      };

      setConversations((prev) => {
        const found = prev.some((c) => c.id === currentConvId);
        if (!found) {
          return [
            {
              id: currentConvId,
              title: currentQuery ? (currentQuery.length > 28 ? currentQuery.slice(0, 28) + "..." : currentQuery) : "Study Chat",
              lastActive: "Just now",
              messages: [userMsg, tutorReply],
            },
            ...prev,
          ];
        }
        return prev.map((c) => {
          if (c.id === currentConvId) {
            return {
              ...c,
              messages: [...c.messages, tutorReply],
            };
          }
          return c;
        });
      });
    } finally {
      setIsTyping(false);
    }
  }, [inputText, attachedDoc, activeConvId, selectedMaterialIds, selectedModel, askTutor, askTutorGrounded, refetchMaterials, refetchConversations, conversations]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startNewChat = () => {
    const newId = `conv-${Date.now()}`;
    const newConv: Conversation = {
      id: newId,
      title: "New Conversation",
      lastActive: "Just now",
      messages: [],
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConvId(newId);
  };

  const deleteConversationHandler = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = conversations.filter((c) => c.id !== id);
    setConversations(remaining);
    if (activeConvId === id) {
      setActiveConvId(remaining.length > 0 ? remaining[0].id : "");
    }
    const cleanId = id.replace("conv-", "");
    const numId = parseInt(cleanId, 10);
    if (!isNaN(numId)) {
      try {
        await deleteConversation.mutateAsync(numId);
        refetchConversations();
      } catch (err) {
        console.error("Failed to delete conversation:", err);
      }
    }
  };

  const handleClearAllConversations = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations([]);
    setActiveConvId("");
    try {
      await clearAllConversations.mutateAsync();
      refetchConversations();
    } catch (err) {
      console.error("Failed to clear all conversations:", err);
    }
  };

  const toggleSourceExpanded = (sourceId: string) => {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      if (next.has(sourceId)) next.delete(sourceId);
      else next.add(sourceId);
      return next;
    });
  };

  const copyToClipboard = (id: string | number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-screen bg-brand-primary text-brand-light overflow-hidden">
      <Navbar />

      <div className="flex flex-1 overflow-hidden relative">
        {/* SIDEBAR: Simple, Minimal Conversation Drawer */}
        <TutorSidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          conversations={conversations}
          activeConvId={activeConvId}
          setActiveConvId={setActiveConvId}
          startNewChat={startNewChat}
          deleteConversationHandler={deleteConversationHandler}
          handleClearAllConversations={handleClearAllConversations}
          searchConv={searchConv}
          setSearchConv={setSearchConv}
          hasMorePages={hasMorePages}
          isLoadingMore={isLoadingMore}
          onLoadMore={handleLoadMore}
        />

        {/* MAIN CHAT AREA */}
        <main className="flex-1 flex flex-col h-full bg-brand-primary overflow-hidden">
          {/* Chat Header Bar */}
          <div className="h-11 px-4 border-b border-brand-neutral/20 flex items-center justify-between bg-brand-secondary/50 shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen((o) => !o)}
                className="p-1 rounded text-brand-neutral hover:text-brand-neutral hover:bg-brand-secondary transition-colors cursor-pointer"
                title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
              >
                {sidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
              </button>
              <h2 className="text-xs font-medium text-brand-neutral truncate max-w-xs">
                {activeConv?.title || "AI Tutor"}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              {/* Grounded Notes Indicator & Selector Toggle */}
              <button
                type="button"
                onClick={() => setShowDocPicker((prev) => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border transition-colors cursor-pointer ${
                  selectedMaterialIds.length > 0
                    ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20"
                    : "border-brand-neutral/20 bg-brand-primary/40 text-brand-muted hover:text-brand-light"
                }`}
                title="Select notes to ground AI answers"
              >
                <FileText size={12} />
                <span>
                  {selectedMaterialIds.length > 0
                    ? `${selectedMaterialIds.length} Note${selectedMaterialIds.length > 1 ? "s" : ""} Grounded`
                    : "Ground with Notes"}
                </span>
              </button>

              {/* Small Local Model Indicator */}
              <div className="flex items-center gap-1.5 text-[11px] text-brand-muted">
                <span className={`w-1.5 h-1.5 rounded-full ${isOllamaHealthy ? "bg-emerald-400" : "bg-red-400"}`} />
                <span>smartstudy-tutor (Local)</span>
              </div>
            </div>
          </div>

          {/* Document Picker Dropdown / Panel */}
          {showDocPicker && (
            <div className="p-3 border-b border-brand-neutral/20 bg-brand-secondary/95 backdrop-blur-md text-xs space-y-2 z-10 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-brand-light">Select Notes to Ground Answers</span>
                <div className="flex items-center gap-2">
                  {selectedMaterialIds.length > 0 && (
                    <button
                      onClick={() => setSelectedMaterialIds([])}
                      className="text-[11px] text-brand-muted hover:text-red-400 cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  )}
                  <button
                    onClick={() => setShowDocPicker(false)}
                    className="p-1 hover:text-white cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>

              {availableDocuments.length === 0 ? (
                <p className="text-zinc-400 py-1">No completed study notes found. Use the paperclip icon below to upload new notes.</p>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                  {availableDocuments.map((doc) => {
                    const isSelected = selectedMaterialIds.includes(doc.id);
                    return (
                      <label
                        key={doc.id}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-colors ${
                          isSelected
                            ? "bg-indigo-600/20 border-indigo-500/40 text-brand-light"
                            : "bg-brand-primary/40 border-brand-neutral/10 text-zinc-300 hover:bg-brand-primary/70"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMaterialIds((prev) => [...prev, doc.id]);
                              } else {
                                setSelectedMaterialIds((prev) => prev.filter((id) => id !== doc.id));
                              }
                            }}
                            className="rounded border-zinc-700 text-indigo-600 focus:ring-0"
                          />
                          <span className="truncate font-medium">{doc.title}</span>
                        </div>
                        <span className="text-[10px] text-zinc-400 shrink-0">
                          {(doc.fileSize / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {loadingConvId === activeConvId ? (
              <div className="max-w-lg mx-auto py-16 text-center space-y-3">
                <Loader2 size={24} className="animate-spin text-brand-neutral mx-auto" />
                <p className="text-xs text-brand-neutral">Loading conversation history...</p>
              </div>
            ) : (messages.length === 0 && !isTyping) ? (
              <div className="max-w-lg mx-auto py-12 text-center">
                <div className="grid w-10 h-10 place-items-center rounded-xl bg-brand-accent/20 border border-brand-neutral/20 text-brand-neutral mx-auto mb-3">
                  <Sparkles size={20} />
                </div>
                <h3 className="text-base font-semibold text-brand-light mb-1">
                  How can I help with your studies today?
                </h3>
                <p className="text-xs text-brand-neutral leading-relaxed mb-6">
                  Select documents from the sidebar to ground answers in verified course materials.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleSendMessage(prompt)}
                      className="p-3 rounded-lg border border-brand-neutral/20 bg-brand-secondary hover:border-brand-neutral/30 text-xs text-brand-neutral hover:text-brand-light transition-colors cursor-pointer"
                    >
                      &ldquo;{prompt}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === "USER";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start"} w-full`}
                  >
                    <div className="flex items-center gap-2 mb-1 text-[11px] text-brand-muted px-1">
                      <span className="font-medium text-brand-neutral">
                        {isUser ? "You" : msg.grounded ? "Smart Study AI (Grounded)" : "Smart Study AI"}
                      </span>
                      <span>·</span>
                      <span>{msg.timestamp}</span>
                    </div>

                    <div
                      className={`rounded-xl px-4 py-3 text-sm leading-relaxed max-w-[94%] sm:max-w-[88%] ${
                        isUser
                          ? "bg-brand-accent text-brand-light"
                          : "bg-brand-secondary border border-brand-neutral/20 text-brand-light shadow-sm"
                      }`}
                    >
                      {/* Attachments */}
                      {(msg.attachments && msg.attachments.length > 0 ? msg.attachments : msg.attachment ? [msg.attachment] : []).map((att: any, idx: number) => (
                        <div key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-brand-primary/40 border border-white/10 text-xs mb-2 mr-2">
                          <Paperclip size={12} className="text-brand-light shrink-0" />
                          <span className="font-medium text-brand-light">{att.name}</span>
                          {att.size && <span className="opacity-70 text-[10px]">({att.size})</span>}
                        </div>
                      ))}

                      <MarkdownView content={msg.content} />

                      {/* Source Citations */}
                      {msg.sources && msg.sources.length > 0 && !isUser && (
                        <div className="mt-3 pt-3 border-t border-brand-neutral/20">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-brand-neutral mb-2">
                            <Shield size={13} />
                            <span>Verified Sources ({msg.sources.length})</span>
                          </div>

                          <div className="space-y-1.5">
                            {msg.sources.map((source, idx) => {
                              const sId = `${msg.id}-${idx}`;
                              const isExp = expandedSources.has(sId);
                              const meta = source.metadata;
                              const citation =
                                source.citation ||
                                (meta
                                  ? `[${meta.filename}${meta.page ? `, page ${meta.page}` : ""}]`
                                  : `Source ${idx + 1}`);

                              return (
                                <div
                                  key={sId}
                                  className="rounded-lg border border-brand-neutral/20 bg-brand-primary/60 overflow-hidden text-xs"
                                >
                                  <button
                                    onClick={() => toggleSourceExpanded(sId)}
                                    className="w-full flex items-center justify-between p-2 text-left hover:bg-brand-secondary/40 transition-colors cursor-pointer"
                                  >
                                    <span className="font-mono text-brand-neutral text-[11px] truncate">
                                      {citation}
                                    </span>
                                    {isExp ? <ChevronUp size={12} className="text-brand-muted shrink-0" /> : <ChevronDown size={12} className="text-brand-muted shrink-0" />}
                                  </button>
                                  {isExp && (
                                    <div className="p-2.5 border-t border-brand-neutral/20 bg-brand-primary/30 text-brand-neutral text-xs leading-relaxed">
                                      <p className="italic">{source.text}</p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {!isUser && (
                        <div className="flex justify-end mt-2 pt-2 border-t border-brand-neutral/20">
                          <button
                            onClick={() => copyToClipboard(msg.id, msg.content)}
                            className="flex items-center gap-1 text-[11px] text-brand-muted hover:text-brand-neutral transition-colors cursor-pointer"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check size={11} className="text-emerald-400" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy size={11} /> Copy
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {isTyping && (
              <div className="flex items-center gap-2 w-full text-xs text-brand-muted p-2">
                <Loader2 size={13} className="animate-spin text-brand-neutral" />
                <span>Generating response with smartstudy-tutor (Qwen 3.5)...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Input */}
          <div className="p-3 sm:p-4 border-t border-brand-neutral/20 bg-brand-secondary/80 backdrop-blur-sm shrink-0">
            <div className="w-full">
              {attachedDoc && (
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs mb-2 transition-all"
                  style={{
                    backgroundColor:
                      attachedDoc.status === "failed"
                        ? "rgba(239, 68, 68, 0.15)"
                        : attachedDoc.status === "ready"
                        ? "rgba(16, 185, 129, 0.15)"
                        : "rgba(99, 102, 241, 0.15)",
                    borderColor:
                      attachedDoc.status === "failed"
                        ? "rgba(239, 68, 68, 0.3)"
                        : attachedDoc.status === "ready"
                        ? "rgba(16, 185, 129, 0.3)"
                        : "rgba(99, 102, 241, 0.3)",
                    color: "#f3f4f6",
                  }}
                >
                  {attachedDoc.status === "uploading" && (
                    <>
                      <Loader2 size={13} className="animate-spin text-indigo-400 shrink-0" />
                      <span className="truncate max-w-xs">{attachedDoc.name}</span>
                      <span className="text-zinc-400 text-[11px]">• Uploading ({attachedDoc.size})...</span>
                    </>
                  )}
                  {attachedDoc.status === "indexing" && (
                    <>
                      <Loader2 size={13} className="animate-spin text-indigo-400 shrink-0" />
                      <span className="truncate max-w-xs">{attachedDoc.name}</span>
                      <span className="text-zinc-400 text-[11px]">• Vector indexing (ChromaDB)...</span>
                    </>
                  )}
                  {attachedDoc.status === "ready" && (
                    <>
                      <Check size={13} className="text-emerald-400 shrink-0" />
                      <span className="truncate max-w-xs font-medium">{attachedDoc.name}</span>
                      <span className="text-emerald-400 text-[11px] font-medium">• Ready for Q&A</span>
                      <button
                        onClick={() => {
                          setAttachedDoc(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="p-0.5 hover:text-red-400 cursor-pointer ml-1"
                        title="Remove attachment"
                      >
                        <X size={13} />
                      </button>
                    </>
                  )}
                  {attachedDoc.status === "failed" && (
                    <>
                      <AlertCircle size={13} className="text-red-400 shrink-0" />
                      <span className="truncate max-w-xs">{attachedDoc.name}</span>
                      <span className="text-red-400 text-[11px]">• {attachedDoc.error || "Failed"}</span>
                      <button
                        onClick={() => {
                          setAttachedDoc(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="p-0.5 hover:text-white cursor-pointer ml-1"
                        title="Dismiss"
                      >
                        <X size={13} />
                      </button>
                    </>
                  )}
                </div>
              )}

              <div className="relative flex items-end gap-2 rounded-xl border border-brand-neutral/20 bg-brand-primary/90 p-2 focus-within:border-brand-neutral/30 focus-within:ring-1 focus-within:ring-brand-neutral">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-icon btn-icon-sm rounded-lg text-text-muted hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Attach study document"
                  aria-label="Attach study document"
                >
                  <Paperclip size={16} className="shrink-0" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".pdf,.docx,.xlsx,.xlsm,.pptx,.txt,.csv,.md"
                />

                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    selectedMaterialIds.length > 0
                      ? "Ask a question about the selected documents..."
                      : availableDocuments.length > 0
                      ? "Ask about your notes (e.g., scholarship details, deadlines, eligibility)..."
                      : "Ask anything, or attach a document for grounded Q&A..."
                  }
                  className="flex-1 max-h-32 bg-transparent text-sm text-brand-light placeholder-zinc-500 resize-none border-0 focus:outline-none focus:ring-0 py-1.5"
                />

                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={isTyping || (attachedDoc !== null && attachedDoc.status !== "ready") || (!inputText.trim() && !attachedDoc)}
                  className="btn-icon btn-icon-sm rounded-lg bg-[#7185FF] hover:bg-[#899AFF] text-[#080D1C] disabled:opacity-40 transition-colors cursor-pointer shrink-0 shadow-sm"
                  aria-label="Send message"
                >
                  <Send size={15} className="shrink-0" />
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-brand-muted mt-1.5 px-1">
                <span>Enter to send · Shift+Enter for newline</span>
                <span>Ollama local RAG active</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
