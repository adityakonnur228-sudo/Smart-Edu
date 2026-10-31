"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  Sparkles,
  Upload,
  Brain,
  FileText,
  Clock,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Play,
  Calendar,
  Layers,
  HelpCircle,
  Loader2,
  BookOpen,
  ArrowRight,
  Settings,
  Sliders,
  Cpu,
  Server,
  Check,
  Key,
  Eye,
  EyeOff,
  ExternalLink,
  Zap,
  X,
} from "lucide-react";
import { Navbar } from "../navbar";
import {
  PageHeader,
  Button,
  ConfirmDialog,
  EmptyState,
  Skeleton,
} from "@/components/ui";

type Material = {
  id: number;
  title: string;
  fileName?: string;
  fileSize?: number;
  status: string;
  createdAt?: string;
};

type Quiz = {
  id: number;
  title: string;
  materialId?: number;
  createdAt: string;
  questionCount?: number;
  bestScore?: number;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

const TOPIC_SUGGESTIONS = [
  "Operating Systems Concurrency",
  "Database Normalization",
  "TCP/IP Networking",
  "Cellular Respiration",
  "Data Structures & Trees",
];

export default function QuizzesPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyState, setBusyState] = useState<string | number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "material" | "quiz";
    id: number;
    title: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Topic input state
  const [topicInput, setTopicInput] = useState("");
  const [questionCount, setQuestionCount] = useState(5);

  // AI Model & Key Configuration State
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("nvidia/nemotron-3-ultra-550b-a55b:free");
  const [showAiModal, setShowAiModal] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [showKeyText, setShowKeyText] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [serverHasKey, setServerHasKey] = useState(false);
  const [testResult, setTestResult] = useState<{
    valid: boolean;
    message?: string;
    error?: string;
    provider?: string;
    model?: string;
  } | null>(null);

  // Load server config and client key on mount
  useEffect(() => {
    async function initAiConfig() {
      try {
        const storedKey = localStorage.getItem("smartstudy_llm_api_key");
        const storedModel = localStorage.getItem("smartstudy_llm_model");
        const envKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || "";
        const envModel = process.env.NEXT_PUBLIC_OPENROUTER_MODEL || "nvidia/nemotron-3-ultra-550b-a55b:free";

        let serverKeyFound = false;
        let serverDefaultModel = envModel;
        try {
          const cfgRes = await fetch(`${API}/quizzes/config`);
          if (cfgRes.ok) {
            const cfg = await cfgRes.json();
            serverKeyFound = !!cfg.hasServerKey;
            if (cfg.defaultModel) serverDefaultModel = cfg.defaultModel;
          }
        } catch {}

        setServerHasKey(serverKeyFound);

        const effectiveKey = storedKey || (serverKeyFound ? "" : envKey);
        const effectiveModel = storedModel && storedModel !== "openrouter/free" ? storedModel : serverDefaultModel;

        setApiKey(effectiveKey);
        setKeyInput(storedKey || envKey);
        setSelectedModel(effectiveModel);
      } catch {}
    }
    void initAiConfig();
  }, []);

  async function testConnection(keyToTest: string, modelToTest: string) {
    setTestingKey(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API}/quizzes/test-key`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: keyToTest.trim() || undefined,
          model: modelToTest,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.valid === false) {
        setTestResult({
          valid: false,
          error: data.error || data.message || `Verification failed (HTTP ${res.status})`,
        });
      } else {
        setTestResult({
          valid: true,
          message: data.message || `Connected to ${data.provider ?? "AI"} (${data.model ?? modelToTest})`,
          provider: data.provider,
          model: data.model,
        });
      }
    } catch (e) {
      setTestResult({
        valid: false,
        error: e instanceof Error ? e.message : "Failed to reach test endpoint",
      });
    } finally {
      setTestingKey(false);
    }
  }

  function saveAiSettings() {
    const trimmed = keyInput.trim();
    setApiKey(trimmed);
    try {
      if (trimmed) {
        localStorage.setItem("smartstudy_llm_api_key", trimmed);
      } else {
        localStorage.removeItem("smartstudy_llm_api_key");
      }
      localStorage.setItem("smartstudy_llm_model", selectedModel);
    } catch {}
    setShowAiModal(false);
    setNotice(`AI engine configured with model "${selectedModel}".`);
  }



  const loadData = useCallback(async () => {
    try {
      const [materialsRes, quizzesRes] = await Promise.all([
        fetch(`${API}/materials`, { credentials: "include" }),
        fetch(`${API}/quizzes`, { credentials: "include" }),
      ]);

      if (materialsRes.status === 401 || materialsRes.status === 403) {
        router.push("/login");
        return;
      }

      if (materialsRes.ok) {
        const rawMaterials = await materialsRes.json();
        setMaterials(Array.isArray(rawMaterials) ? rawMaterials : (rawMaterials?.content ?? []));
      }

      if (quizzesRes.ok) {
        const rawQuizzes = await quizzesRes.json();
        setQuizzes(Array.isArray(rawQuizzes) ? rawQuizzes : (rawQuizzes?.content ?? []));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load quizzes and materials.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  // Generate quiz by custom topic
  async function generateByTopic(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formTopic = topicInput.trim();
    if (!formTopic) return;

    setBusyState("topic");
    setError("");
    setNotice("");

    try {
      const res = await fetch(`${API}/quizzes/generate-by-topic`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "X-LLM-Api-Key": apiKey, "X-OpenRouter-Api-Key": apiKey } : {}),
          ...(selectedModel ? { "X-LLM-Model": selectedModel } : {}),
        },
        body: JSON.stringify({
          topic: formTopic,
          count: questionCount,
          model: selectedModel,
          apiKey: apiKey || undefined,
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || body.error || "Quiz generation failed.");

      setNotice(`Quiz generated successfully on topic "${formTopic}".`);
      setTopicInput("");
      if (body?.id) {
        router.push(`/quizzes/${body.id}`);
      } else {
        void loadData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate topic quiz.");
    } finally {
      setBusyState(null);
    }
  }

  // Generate quiz from material
  async function generateFromMaterial(materialId: number) {
    setBusyState(materialId);
    setError("");
    setNotice("");

    try {
      const res = await fetch(`${API}/quizzes/generate/${materialId}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "X-LLM-Api-Key": apiKey, "X-OpenRouter-Api-Key": apiKey } : {}),
          ...(selectedModel ? { "X-LLM-Model": selectedModel } : {}),
        },
        body: JSON.stringify({
          count: questionCount,
          model: selectedModel,
          apiKey: apiKey || undefined,
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || body.error || "Quiz generation failed.");

      setNotice("Active recall quiz generated from note.");
      if (body?.id) {
        router.push(`/quizzes/${body.id}`);
      } else {
        void loadData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quiz generation failed.");
    } finally {
      setBusyState(null);
    }
  }

  // Upload notes and generate quiz immediately
  async function handleNotesUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    setNotice("");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const uploadRes = await fetch(`${API}/materials`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const material = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(material.message || material.error || "Upload failed.");

      setNotice(`Uploaded "${material.title}". Indexing context for quiz questions...`);
      setMaterials((curr) => [material, ...curr]);

      setTimeout(() => {
        void loadData();
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  // Execute deletion
  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      const endpoint = deleteTarget.type === "material" ? `/materials/${deleteTarget.id}` : `/quizzes/${deleteTarget.id}`;
      const res = await fetch(`${API}${endpoint}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Could not delete ${deleteTarget.type}.`);

      if (deleteTarget.type === "material") {
        setMaterials((curr) => curr.filter((m) => m.id !== deleteTarget.id));
      } else {
        setQuizzes((curr) => curr.filter((q) => q.id !== deleteTarget.id));
      }
      setNotice(`Deleted "${deleteTarget.title}".`);
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete action failed.");
    } finally {
      setIsDeleting(false);
    }
  }

  const readyMaterials = materials.filter((m) => m.status === "COMPLETED");
  const filteredQuizzes = quizzes.filter((q) =>
    searchQuery ? q.title.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  return (
    <div className="min-h-screen flex flex-col bg-brand-primary text-brand-neutral">
      <Navbar />

      <main id="main-content" className="app-container page-wrapper flex-1 py-8">
        {/* Page Header */}
        <PageHeader
          eyebrow="Active Recall Engine"
          eyebrowIcon={<Sparkles size={13} className="text-brand-neutral" />}
          title="Practice Quizzes"
          description="Source-grounded evaluations generated from your notes with verified citations and rationale."
          actions={
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowAiModal(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0F1A36] border border-border-subtle/80 text-xs text-[#C4CEE4] hover:border-brand-neutral/40 transition-colors cursor-pointer"
                title="Configure AI Model & API Key"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ADEA6] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4ADEA6]" />
                </span>
                <span className="font-medium text-white">
                  {selectedModel === "smartstudy-tutor"
                    ? "SmartStudy Tutor"
                    : selectedModel.includes("nemotron-3-ultra")
                    ? "Nemotron 3 Ultra 550B"
                    : selectedModel.includes("nemotron-3.5")
                    ? "Nemotron 3.5 Lightning"
                    : selectedModel.includes("gemma")
                    ? "Gemma 4 26B"
                    : "OpenRouter AI"}
                </span>
                <span className="text-[10px] text-[#55D6E8] bg-[#55D6E8]/10 px-1.5 py-0.5 rounded border border-[#55D6E8]/20 font-mono">
                  Active
                </span>
                <Sliders size={13} className="text-brand-muted hover:text-brand-light ml-0.5" />
              </button>
              <Button
                variant="secondary"
                onClick={() => setShowAiModal(true)}
                icon={<Settings size={14} />}
              >
                Configure AI
              </Button>
              <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                icon={<Upload size={14} />}
              >
                {uploading ? "Uploading..." : "Upload Notes"}
              </Button>
            </div>
          }
        />

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleNotesUpload}
          accept=".pdf,.txt,.docx"
          className="hidden"
        />

        {/* Feedback alerts */}
        {notice && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 text-xs font-medium mb-6 animate-fade-in"
          >
            <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
            <span>{notice}</span>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-rose-950/40 border border-rose-500/20 text-rose-300 text-xs font-medium mb-6 animate-fade-in"
          >
            <AlertCircle size={15} className="shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Synthesis in progress banner */}
        {busyState && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-3 px-4 py-3.5 rounded-lg bg-brand-accent/20 border border-brand-neutral/20 mb-6 text-xs text-brand-light animate-pulse"
          >
            <Loader2 size={16} className="animate-spin text-brand-neutral shrink-0" />
            <div>
              <span className="font-semibold text-brand-light">Generating Active Recall Quiz</span>
              <p className="text-brand-neutral text-[11px] mt-0.5">
                Formulating questions, verifying distractors, and attaching citations...
              </p>
            </div>
          </div>
        )}

        {/* Section 1: Generate Quiz by Topic Card */}
        <section className="bg-brand-secondary border border-brand-neutral/20 rounded-xl p-5 sm:p-6 mb-8">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-brand-light">Generate Quiz by Topic</h2>
            <p className="text-xs text-brand-neutral mt-0.5">
              Enter any concept, historical event, or syllabus chapter to synthesize multiple-choice questions.
            </p>
          </div>

          <form onSubmit={generateByTopic} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
            <div className="flex-1">
              <label htmlFor="topic-input" className="block text-xs font-medium text-brand-neutral mb-1.5">
                Topic or Subject
              </label>
              <input
                id="topic-input"
                type="text"
                required
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="e.g. Operating Systems Concurrency, Photosynthesis, Binary Search Trees..."
                className="w-full bg-brand-raised border border-brand-neutral/25 rounded-lg px-3.5 py-2 text-sm text-brand-light placeholder:text-brand-muted focus:outline-none focus:border-brand-neutral/40 transition-colors"
              />
            </div>

            <div className="w-full sm:w-36">
              <label htmlFor="question-count-select" className="block text-xs font-medium text-brand-neutral mb-1.5">
                Questions
              </label>
              <select
                id="question-count-select"
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full bg-brand-raised border border-brand-neutral/25 rounded-lg px-3 py-2 text-sm text-brand-light focus:outline-none focus:border-brand-neutral/40 transition-colors cursor-pointer"
              >
                <option value={3}>3 Questions</option>
                <option value={5}>5 Questions</option>
                <option value={10}>10 Questions</option>
              </select>
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={busyState === "topic"}
              className="h-[38px] px-5 text-xs font-medium"
            >
              Generate Quiz
            </Button>
          </form>

          {/* Quick suggestions */}
          <div className="mt-3.5 flex flex-wrap items-center gap-1.5 pt-3 border-t border-brand-neutral/20">
            <span className="text-[11px] text-brand-muted mr-1">Suggestions:</span>
            {TOPIC_SUGGESTIONS.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => setTopicInput(topic)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                  topicInput === topic
                    ? "bg-brand-accent/20 border-brand-neutral/40 text-brand-light"
                    : "bg-brand-raised border-brand-neutral/25 text-brand-neutral hover:text-brand-neutral hover:border-brand-neutral/30"
                }`}
              >
                + {topic}
              </button>
            ))}
          </div>
        </section>

        {/* Section 2: Grounded Quiz from Uploaded Materials */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <h2 className="text-sm font-semibold text-brand-neutral">
                Generate from Uploaded Notes ({readyMaterials.length})
              </h2>
              <p className="text-xs text-brand-muted">Practice questions citing your course documents</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">
              <Skeleton height="56px" />
              <Skeleton height="56px" />
            </div>
          ) : readyMaterials.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No processed study notes available"
              description="Upload notes to automatically create source-grounded practice questions."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  icon={<Upload size={13} />}
                >
                  Upload Study Note
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {readyMaterials.map((mat) => (
                <article
                  key={mat.id}
                  className="flex items-center justify-between gap-4 p-3.5 rounded-lg bg-brand-secondary border border-brand-neutral/20 hover:border-brand-neutral/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-md bg-brand-accent/20 text-brand-neutral flex items-center justify-center shrink-0">
                      <BookOpen size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs font-medium text-brand-neutral truncate">{mat.title}</h3>
                      <p className="text-[11px] text-brand-muted truncate mt-0.5">
                        {mat.fileName || "Course Document"} &bull; Ready for quiz generation
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void generateFromMaterial(mat.id)}
                      loading={busyState === mat.id}
                      icon={<Award size={13} className="text-amber-400" />}
                      className="text-xs py-1 px-3"
                    >
                      Generate
                    </Button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ type: "material", id: mat.id, title: mat.title })}
                      aria-label={`Delete ${mat.title}`}
                      className="w-8 h-8 rounded-md flex items-center justify-center text-brand-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Section 3: Saved Quizzes */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-brand-neutral">
                Saved Quizzes ({quizzes.length})
              </h2>
              <p className="text-xs text-brand-muted">Take and review active recall rounds</p>
            </div>

            {quizzes.length > 3 && (
              <div className="relative w-full sm:w-64">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search quizzes..."
                  className="w-full bg-brand-raised border border-brand-neutral/25 rounded-lg pl-8 pr-3 py-1.5 text-xs text-brand-neutral placeholder:text-brand-muted focus:outline-none focus:border-brand-neutral/40 transition-colors"
                />
              </div>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Skeleton height="120px" />
              <Skeleton height="120px" />
              <Skeleton height="120px" />
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <EmptyState
              icon={Award}
              title={searchQuery ? "No matching quizzes found" : "No practice quizzes yet"}
              description={
                searchQuery
                  ? "Try searching with a different term."
                  : "Generate your first quiz above by entering a topic or selecting an uploaded note."
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredQuizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="flex flex-col justify-between p-4 rounded-xl bg-brand-secondary border border-brand-neutral/20 hover:border-brand-neutral/30 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] text-brand-muted flex items-center gap-1 font-mono">
                        <Calendar size={11} /> {new Date(quiz.createdAt).toLocaleDateString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget({ type: "quiz", id: quiz.id, title: quiz.title })}
                        aria-label={`Delete ${quiz.title}`}
                        className="w-6 h-6 rounded flex items-center justify-center text-brand-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    <h3 className="text-sm font-semibold text-brand-light line-clamp-2 leading-snug">
                      {quiz.title}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-brand-neutral/20">
                    <span className="text-[11px] text-brand-muted">Active Recall</span>
                    <Button
                      variant="primary"
                      size="sm"
                      href={`/quizzes/${quiz.id}`}
                      icon={<Play size={12} />}
                      className="text-xs py-1 px-3"
                    >
                      Start Quiz
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>


      {/* AI Engine & API Key Configuration Modal */}
      {showAiModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-lg rounded-2xl bg-brand-secondary border border-brand-neutral/20 shadow-2xl p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-brand-neutral/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Cpu size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-brand-light">AI Quiz Generation Engine</h3>
                  <p className="text-xs text-brand-muted">Select frontier model and configure OpenRouter API access</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-brand-muted hover:text-brand-light hover:bg-brand-raised transition-colors"
                aria-label="Close modal"
              >
                <X size={15} />
              </button>
            </div>

            {/* Model Selection Options */}
            <div className="mt-4 space-y-2">
              <label className="block text-xs font-medium text-brand-neutral mb-1">
                Select Model
              </label>

              {/* Option 1: Nemotron 3 Ultra 550B */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSelectedModel("nvidia/nemotron-3-ultra-550b-a55b:free")}
                onKeyDown={(e) => e.key === "Enter" && setSelectedModel("nvidia/nemotron-3-ultra-550b-a55b:free")}
                className={`w-full p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  selectedModel === "nvidia/nemotron-3-ultra-550b-a55b:free"
                    ? "bg-[#0F1A36] border-[#4ADEA6] shadow-sm shadow-[#4ADEA6]/10"
                    : "bg-brand-primary/40 border-brand-neutral/15 hover:border-brand-neutral/30"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 font-medium text-xs text-brand-light">
                    <Zap size={13} className="text-[#4ADEA6]" />
                    <span>NVIDIA Nemotron 3 Ultra (550B)</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#4ADEA6]/15 text-[#4ADEA6] border border-[#4ADEA6]/30 font-semibold font-mono">
                    Recommended Free
                  </span>
                </div>
                <p className="text-[11px] text-brand-muted pl-5">
                  550B flagship foundation model. Excellent accuracy, 4 distinct distractors, and zero dummy options.
                </p>
              </div>

              {/* Option 2: Nemotron 3.5 Lightning */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSelectedModel("nvidia/nemotron-3.5-lightning:free")}
                onKeyDown={(e) => e.key === "Enter" && setSelectedModel("nvidia/nemotron-3.5-lightning:free")}
                className={`w-full p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  selectedModel === "nvidia/nemotron-3.5-lightning:free"
                    ? "bg-[#0F1A36] border-[#55D6E8] shadow-sm shadow-[#55D6E8]/10"
                    : "bg-brand-primary/40 border-brand-neutral/15 hover:border-brand-neutral/30"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 font-medium text-xs text-brand-light">
                    <Zap size={13} className="text-[#55D6E8]" />
                    <span>NVIDIA Nemotron 3.5 Lightning</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#55D6E8]/15 text-[#55D6E8] border border-[#55D6E8]/30 font-semibold font-mono">
                    Ultra Fast
                  </span>
                </div>
                <p className="text-[11px] text-brand-muted pl-5">
                  Low-latency OpenRouter free tier. Generates full 5-question exams in under 4 seconds.
                </p>
              </div>

              {/* Option 3: Gemma 4 26B */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSelectedModel("google/gemma-4-26b-a4b-it:free")}
                onKeyDown={(e) => e.key === "Enter" && setSelectedModel("google/gemma-4-26b-a4b-it:free")}
                className={`w-full p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  selectedModel === "google/gemma-4-26b-a4b-it:free"
                    ? "bg-[#0F1A36] border-[#A78BFA] shadow-sm shadow-[#A78BFA]/10"
                    : "bg-brand-primary/40 border-brand-neutral/15 hover:border-brand-neutral/30"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 font-medium text-xs text-brand-light">
                    <Sparkles size={13} className="text-[#A78BFA]" />
                    <span>Google Gemma 4 (26B)</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#A78BFA]/15 text-[#A78BFA] border border-[#A78BFA]/30 font-semibold font-mono">
                    Google Free
                  </span>
                </div>
                <p className="text-[11px] text-brand-muted pl-5">
                  Google instruction-tuned language model with strong active recall framing.
                </p>
              </div>

              {/* Option 4: Local Ollama GPU */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSelectedModel("smartstudy-tutor")}
                onKeyDown={(e) => e.key === "Enter" && setSelectedModel("smartstudy-tutor")}
                className={`w-full p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  selectedModel === "smartstudy-tutor"
                    ? "bg-[#0F1A36] border-emerald-400/50 shadow-sm"
                    : "bg-brand-primary/40 border-brand-neutral/15 hover:border-brand-neutral/30"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 font-medium text-xs text-brand-light">
                    <Server size={13} className="text-emerald-400" />
                    <span>SmartStudy Tutor (Local Ollama GPU)</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold font-mono">
                    100% Offline
                  </span>
                </div>
                <p className="text-[11px] text-brand-muted pl-5">
                  Runs directly on localhost:11434 with zero internet requests or external API calls.
                </p>
              </div>
            </div>

            {/* API Key Input */}
            {selectedModel !== "smartstudy-tutor" && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-brand-neutral flex items-center gap-1.5">
                    <Key size={12} className="text-brand-muted" /> OpenRouter API Key
                  </label>
                  {serverHasKey && !keyInput && (
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-mono border border-emerald-500/20">
                      Server Key Configured
                    </span>
                  )}
                </div>
                <div className="relative flex items-center">
                  <input
                    type={showKeyText ? "text" : "password"}
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder={serverHasKey ? "Using configured server key (or enter custom sk-or-...)" : "sk-or-v1-..."}
                    className="w-full bg-brand-raised border border-brand-neutral/25 rounded-lg pl-3 pr-10 py-2 text-xs text-brand-light placeholder:text-brand-muted focus:outline-none focus:border-brand-neutral/40 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeyText(!showKeyText)}
                    className="absolute right-2.5 text-brand-muted hover:text-brand-light transition-colors cursor-pointer"
                    aria-label={showKeyText ? "Hide key" : "Show key"}
                  >
                    {showKeyText ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            )}

            {/* Test Connection & Actions */}
            <div className="mt-4 pt-3 border-t border-brand-neutral/20 flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void testConnection(keyInput, selectedModel)}
                  disabled={testingKey}
                  className="text-xs"
                >
                  {testingKey ? (
                    <>
                      <Loader2 size={12} className="animate-spin mr-1.5" /> Testing Key...
                    </>
                  ) : (
                    "Test Connection"
                  )}
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAiModal(false)}
                    className="text-xs text-brand-muted hover:text-brand-light"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={saveAiSettings}
                    className="text-xs"
                  >
                    Save & Apply
                  </Button>
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                    testResult.valid
                      ? "bg-emerald-950/40 border border-emerald-500/25 text-emerald-300"
                      : "bg-rose-950/40 border border-rose-500/25 text-rose-300"
                  }`}
                >
                  {testResult.valid ? (
                    <CheckCircle2 size={14} className="shrink-0 text-emerald-400 mt-0.5" />
                  ) : (
                    <AlertCircle size={14} className="shrink-0 text-rose-400 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{testResult.valid ? "Verified & Ready!" : "Verification Failed"}</p>
                    <p className="text-[11px] opacity-90 mt-0.5">{testResult.message || testResult.error}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={deleteTarget?.type === "material" ? "Delete Study Note?" : "Delete Quiz?"}
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger={true}
        loading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      </div>
  );
}
