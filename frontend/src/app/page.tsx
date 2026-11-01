"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  FileCheck,
  FileText,
  Layers,
  Menu,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";

interface QuizOption {
  text: string;
  correct: boolean;
}

interface DemoTopic {
  id: string;
  subject: string;
  title: string;
  document: string;
  citation: string;
  citationExcerpt: string;
  question: string;
  options: QuizOption[];
  explanation: string;
}

const DEMO_TOPICS: DemoTopic[] = [
  {
    id: "os",
    subject: "Operating Systems",
    title: "Process Synchronization & Mutexes",
    document: "Operating Systems — Silberschatz (Unit 2).pdf",
    citation: "Chapter 6: Synchronization Tools · Page 142",
    citationExcerpt:
      "A mutex lock enforces mutual exclusion by acquiring a boolean lock before the critical section and releasing it afterward. Hardware-supported atomic operations ensure that only one thread executes in the critical region at any instant.",
    question:
      "Which condition must hold for a deadlock to occur when every process holds a resource and waits for another held by the next process in sequence?",
    options: [
      { text: "Resource Preemption", correct: false },
      { text: "Circular Wait", correct: true },
      { text: "Mutual Exclusion Relinquishment", correct: false },
      { text: "Independent Thread Execution", correct: false },
    ],
    explanation:
      "Circular wait requires a closed chain of processes where each holds at least one resource and waits to acquire a resource held by the next process in the chain.",
  },
  {
    id: "dbms",
    subject: "Database Systems",
    title: "ACID Properties & Transaction Durability",
    document: "Database System Concepts — Korth (Unit 4).pdf",
    citation: "Chapter 14: Transactions · Section 14.1, Page 633",
    citationExcerpt:
      "Durability ensures that once a transaction completes successfully and issues a COMMIT, all database updates persist across subsequent power outages, hardware failures, or system crashes via write-ahead logging.",
    question:
      "Which ACID property guarantees that all operations within a database transaction complete successfully or none take effect?",
    options: [
      { text: "Atomicity (All-or-Nothing)", correct: true },
      { text: "Consistency Preservation", correct: false },
      { text: "Serial Isolation", correct: false },
      { text: "Durability Ledger", correct: false },
    ],
    explanation:
      "Atomicity guarantees that a transaction is treated as an indivisible unit of work: either every operation succeeds, or the transaction is aborted and rolled back entirely.",
  },
  {
    id: "dsa",
    subject: "Data Structures",
    title: "Binary Search Trees & Balancing",
    document: "Data Structures & Algorithms — Cormen (Unit 3).pdf",
    citation: "Chapter 12: Binary Search Trees · Page 289",
    citationExcerpt:
      "The binary-search-tree property guarantees that keys in a left subtree are ≤ the root, and keys in a right subtree are ≥ the root. In an unbalanced BST, degenerate insertion order degrades tree height to O(N).",
    question:
      "What is the worst-case time complexity of searching for a key in an unbalanced Binary Search Tree with N nodes?",
    options: [
      { text: "O(1) Constant Time", correct: false },
      { text: "O(log N) Logarithmic Time", correct: false },
      { text: "O(N) Linear Time", correct: true },
      { text: "O(N log N) Quasilinear Time", correct: false },
    ],
    explanation:
      "When keys are inserted in sorted order, an unbalanced binary search tree degenerates into a linear linked list of height N, resulting in O(N) worst-case search complexity.",
  },
];

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Interactive Demo State
  const [selectedTopicId, setSelectedTopicId] = useState<string>("os");
  const [quizSelection, setQuizSelection] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);

  const activeTopic = DEMO_TOPICS.find((t) => t.id === selectedTopicId) || DEMO_TOPICS[0];

  function handleSelectTopic(topicId: string) {
    setSelectedTopicId(topicId);
    setQuizSelection(null);
    setQuizSubmitted(false);
  }

  function handleAnswerSelect(index: number) {
    if (quizSubmitted) return;
    setQuizSelection(index);
    setQuizSubmitted(true);
  }

  function handleResetQuiz() {
    setQuizSelection(null);
    setQuizSubmitted(false);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#080D1A] text-[#F1F5F9] selection:bg-[#8999FF]/25 selection:text-white overflow-x-hidden">
      {/* =========================================================================
          1. NAVIGATION (STRETCHED FULL WIDTH)
          ========================================================================= */}
      <header className="sticky top-0 z-50 w-full border-b border-[#1E2D4A]/60 bg-[#080D1A]/95 backdrop-blur-md h-14">
        <div className="w-full px-6 sm:px-10 lg:px-12 xl:px-16 2xl:px-20 h-full flex items-center justify-between">
          {/* Brand Identity */}
          <Link href="/" className="flex items-center gap-2.5 group" aria-label="Smart Edu Home">
            <Logo size={26} textSize="text-[15px] font-bold tracking-tight text-[#F1F5F9]" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 lg:gap-10 text-[13px] font-medium text-[#94A3B8]" aria-label="Primary Navigation">
            <a href="#features" className="hover:text-white transition-colors duration-150">
              Features
            </a>
            <a href="#product-demo" className="hover:text-white transition-colors duration-150">
              Product Demo
            </a>
            <a href="#how-it-works" className="hover:text-white transition-colors duration-150">
              How It Works
            </a>
            <a href="#interactive-demo" className="hover:text-white transition-colors duration-150">
              Interactive Quiz
            </a>
            <a href="#faq" className="hover:text-white transition-colors duration-150">
              FAQ
            </a>
          </nav>

          {/* Desktop Account Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-[13px] font-medium text-[#94A3B8] hover:text-white px-3.5 py-1.5 rounded-lg hover:bg-[#111B30] transition-colors duration-150"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 px-4.5 py-1.5 rounded-lg text-[13px] font-semibold bg-[#8999FF] text-[#080D1A] hover:bg-[#9CA8FF] active:scale-[0.98] transition-all shadow-[0_1px_12px_rgba(137,153,255,0.25)]"
            >
              <span>Get Started</span>
              <ArrowRight size={14} className="shrink-0" />
            </Link>
          </div>

          {/* Mobile Hamburger Toggle */}
          <div className="flex md:hidden items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#94A3B8] hover:text-white focus:outline-none focus:ring-1 focus:ring-[#8999FF] rounded-md"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-[#1E2D4A] bg-[#0B1326] px-4 pt-3 pb-5 space-y-3 animate-in fade-in duration-150 shadow-2xl">
            <nav className="flex flex-col space-y-2 text-sm font-medium text-[#94A3B8]">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md hover:bg-[#111B30] hover:text-white"
              >
                Features
              </a>
              <a
                href="#product-demo"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md hover:bg-[#111B30] hover:text-white"
              >
                Product Demo
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md hover:bg-[#111B30] hover:text-white"
              >
                How It Works
              </a>
              <a
                href="#interactive-demo"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md hover:bg-[#111B30] hover:text-white"
              >
                Interactive Quiz
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md hover:bg-[#111B30] hover:text-white"
              >
                FAQ
              </a>
            </nav>
            <div className="pt-3 border-t border-[#1E2D4A]/60 flex flex-col gap-2">
              <Link
                href="/login"
                className="w-full text-center py-2 text-sm font-medium text-[#94A3B8] hover:text-white rounded-lg border border-[#1E2D4A] bg-[#111B30]"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="w-full text-center py-2 text-sm font-medium bg-[#8999FF] text-[#080D1A] rounded-lg font-semibold shadow-sm"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* =========================================================================
          MAIN CONTENT
          ========================================================================= */}
      <main id="main-content" className="flex-1">
        {/* =========================================================================
            2. HERO SECTION — ENTIRE WINDOW SIZE (Fits 100vh cleanly, Stretched Wide)
            ========================================================================= */}
        <section className="relative h-[calc(100vh-56px)] min-h-[660px] flex flex-col justify-between border-b border-[#1E2D4A]/40 overflow-hidden bg-[#080D1A]">
          {/* Subtle ambient lighting */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_25%_20%,rgba(137,153,255,0.08),transparent_70%)]" />

          {/* Centered Hero Body (Expansive left-to-right grid) */}
          <div className="w-full px-6 sm:px-10 lg:px-12 xl:px-16 2xl:px-20 my-auto py-4 lg:py-6 relative z-10 flex-1 flex items-center">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-center w-full">
              {/* LEFT FLANK: Editorial Value Proposition */}
              <div className="lg:col-span-5 xl:col-span-5 flex flex-col items-start text-left space-y-5">
                {/* Eyebrow Label */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#1E2D4A] bg-[#111B30]/80 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-[#8999FF]" />
                  <span className="text-xs font-mono tracking-widest uppercase text-[#8999FF] font-medium">
                    Your Personal Academic Workspace
                  </span>
                </div>

                {/* Main Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-5xl xl:text-6xl 2xl:text-[70px] font-bold tracking-tight text-[#F1F5F9] leading-[1.08] font-heading">
                  Understand more.
                  <br />
                  Memorise less.
                  <br />
                  <span className="text-[#8999FF]">Learn with clarity.</span>
                </h1>

                {/* Subtitle */}
                <p className="text-base sm:text-lg xl:text-xl text-[#94A3B8] leading-relaxed max-w-xl font-normal">
                  Turn your course materials into a connected learning experience. Ask questions, understand difficult
                  concepts, practise with grounded quizzes and track your progress.
                </p>

                {/* Action CTAs */}
                <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto pt-1">
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center gap-2 px-8 h-12 rounded-xl text-sm sm:text-base font-semibold bg-[#8999FF] text-[#080D1A] hover:bg-[#9CA8FF] active:scale-[0.98] transition-all shadow-[0_1px_16px_rgba(137,153,255,0.25)]"
                  >
                    <span>Start learning</span>
                    <ArrowRight size={16} className="shrink-0" />
                  </Link>
                  <a
                    href="#product-demo"
                    className="inline-flex items-center justify-center gap-2 px-6 h-12 rounded-xl text-sm sm:text-base font-medium border border-[#1E2D4A] bg-[#111B30] text-[#F1F5F9] hover:bg-[#17243A] hover:border-[#2C3F63] transition-colors"
                  >
                    <span>Explore the product</span>
                  </a>
                </div>

                {/* Supporting Link */}
                <div className="flex items-center gap-2 text-xs sm:text-sm font-mono text-[#64748B] pt-1">
                  <span>Syllabus-focused study methodology</span>
                  <span className="text-[#1E2D4A]">·</span>
                  <a href="#how-it-works" className="text-[#8999FF] hover:underline flex items-center gap-1 font-medium">
                    See how it works &rarr;
                  </a>
                </div>
              </div>

              {/* RIGHT FLANK: Authentic Product Showcase (Stretched Wide) */}
              <div className="lg:col-span-7 xl:col-span-7 relative w-full">
                <div className="rounded-2xl border border-[#1E2D4A] bg-[#111B30] shadow-2xl overflow-hidden w-full">
                  {/* Window Title Bar */}
                  <div className="px-5 sm:px-6 py-3 border-b border-[#1E2D4A] bg-[#0D1527] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]/70" />
                        <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]/70" />
                        <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]/70" />
                      </div>
                      <span className="ml-2.5 text-xs sm:text-sm font-mono text-[#94A3B8] truncate max-w-[240px] sm:max-w-md">
                        Operating Systems — Silberschatz (Unit 2).pdf
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono text-[#62C9D6] bg-[#62C9D6]/10 border border-[#62C9D6]/25">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#62C9D6]" />
                      <span>Illustrative Sample Preview</span>
                    </div>
                  </div>

                  {/* Showcase Dialogue Content */}
                  <div className="p-5 sm:p-6 space-y-3.5">
                    {/* Student Question */}
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-md bg-[#1E2D4A] flex items-center justify-center text-xs font-mono font-bold text-[#8999FF] shrink-0 mt-0.5">
                        Q
                      </div>
                      <div className="flex-1 rounded-xl border border-[#1E2D4A] bg-[#17243A]/80 p-3.5 text-xs sm:text-sm text-[#F1F5F9] leading-relaxed">
                        Can you explain how a mutex lock prevents race conditions during process synchronization?
                      </div>
                    </div>

                    {/* AI Tutor Explanation */}
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-md bg-[#8999FF]/15 border border-[#8999FF]/30 flex items-center justify-center text-xs font-mono font-bold text-[#8999FF] shrink-0 mt-0.5">
                        AI
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="rounded-xl border border-[#1E2D4A] bg-[#0D1527] p-3.5 sm:p-4 text-xs sm:text-sm text-[#CBD5E1] leading-relaxed">
                          A <strong>mutex lock</strong> enforces mutual exclusion to protect critical sections. A thread
                          must call <code className="text-[#62C9D6] font-mono text-xs">acquire()</code> before entering
                          and <code className="text-[#62C9D6] font-mono text-xs">release()</code> upon exiting. If the
                          lock is held, incoming threads block atomically until it is freed, preventing concurrent memory
                          corruption.
                        </div>

                        {/* Verified Citation Box */}
                        <div className="rounded-xl border border-[#62C9D6]/30 bg-[#080D1A] p-3.5 text-xs sm:text-sm space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono text-[#62C9D6] flex items-center gap-1.5 font-medium">
                              <FileCheck size={14} className="text-[#62C9D6]" />
                              Unit 2: Process Synchronization.pdf · Page 142
                            </span>
                            <span className="text-[10px] font-mono text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded border border-[#10B981]/25">
                              Sample Excerpt
                            </span>
                          </div>
                          <p className="text-[#94A3B8] italic text-xs leading-relaxed">
                            &ldquo;A mutex lock provides mutual exclusion via boolean availability. All calls to
                            acquire() and release() must be executed as atomic hardware operations.&rdquo;
                          </p>
                        </div>

                        {/* Active Recall Mini Check */}
                        <div className="rounded-xl border border-[#1E2D4A] bg-[#17243A]/50 p-3.5 text-xs sm:text-sm">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-medium text-[#F1F5F9] text-xs flex items-center gap-1.5">
                              <Brain size={13} className="text-[#8999FF]" /> Active Recall Check
                            </span>
                            <span className="text-[11px] font-mono text-[#8999FF]">Self-Evaluation</span>
                          </div>
                          <p className="text-[#94A3B8] mb-2.5 text-xs">
                            Which system primitive atomically decrements a semaphore counter?
                          </p>
                          <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
                            <div className="px-3 py-2 rounded-lg border border-[#10B981]/40 bg-[#10B981]/10 text-[#10B981] font-medium flex items-center justify-between">
                              <span>wait() / P()</span>
                              <CheckCircle2 size={13} className="text-[#10B981]" />
                            </div>
                            <div className="px-3 py-2 rounded-lg border border-[#1E2D4A] bg-[#0D1527] text-[#64748B]">
                              signal() / V()
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Anchored Trust & Capability Strip at bottom of 100vh */}
          <div className="border-t border-[#1E2D4A]/50 bg-[#0B1326] py-3.5 text-xs sm:text-sm font-mono text-[#94A3B8] w-full shrink-0">
            <div className="w-full px-6 sm:px-10 lg:px-12 xl:px-16 2xl:px-20">
              <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-8 text-center sm:text-left">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#8999FF]" />
                  <span className="text-[#F1F5F9] font-medium">Local AI Learning</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#62C9D6]" />
                  <span className="text-[#F1F5F9] font-medium">Document-Grounded Answers</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                  <span className="text-[#F1F5F9] font-medium">Source Citations</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#8999FF]" />
                  <span className="text-[#F1F5F9] font-medium">Active Recall</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#62C9D6]" />
                  <span className="text-[#F1F5F9] font-medium">Focus Tracking</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            3. PRODUCT DEMONSTRATION SECTION — ENTIRE WINDOW SIZE (min-h-screen, Stretched Wide)
            ========================================================================= */}
        <section id="product-demo" className="min-h-screen flex flex-col justify-center py-12 lg:py-16 border-b border-[#1E2D4A]/40 bg-[#080D1A]">
          <div className="w-full px-6 sm:px-10 lg:px-12 xl:px-16 2xl:px-20">
            {/* Section Header */}
            <div className="max-w-4xl mx-auto text-center mb-8 lg:mb-10">
              <span className="text-xs font-mono tracking-widest uppercase text-[#8999FF] block mb-2 font-medium">
                Product Demonstration
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#F1F5F9] mb-3 font-heading">
                Learning that starts with your own material.
              </h2>
              <p className="text-base sm:text-lg text-[#94A3B8] leading-relaxed max-w-2xl mx-auto">
                Upload your course notes, ask questions with contextual precision, and receive structured explanations
                backed by exact document citations.
              </p>
            </div>

            {/* Split Screen Workspace Preview (Stretched to Full Width) */}
            <div className="rounded-2xl border border-[#1E2D4A] bg-[#111B30] shadow-2xl overflow-hidden w-full">
              {/* Workspace Top Toolbar */}
              <div className="px-6 sm:px-8 py-3.5 border-b border-[#1E2D4A] bg-[#0D1527] flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-[#F1F5F9] flex items-center gap-2">
                    <BookOpen size={16} className="text-[#8999FF]" />
                    Academic Workspace Preview
                  </span>
                  <span className="text-[#1E2D4A]">|</span>
                  <span className="text-[#94A3B8] font-mono">Student Account: alex@example.test</span>
                </div>
                <div className="text-xs font-mono text-[#62C9D6] bg-[#62C9D6]/10 px-3 py-1 rounded border border-[#62C9D6]/20">
                  Illustrative Preview · Sample Engineering Data (General Textbook Notes)
                </div>
              </div>

              {/* Split Screen Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#1E2D4A]">
                {/* LEFT FLANK: Course Materials Explorer */}
                <div className="lg:col-span-4 xl:col-span-4 p-6 sm:p-8 bg-[#0E172B] space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#1E2D4A]">
                    <span className="text-xs sm:text-sm font-mono uppercase tracking-wider text-[#94A3B8] font-semibold">
                      Course Documents (3 Active)
                    </span>
                    <span className="text-xs font-mono text-[#10B981] flex items-center gap-1.5 font-medium">
                      <CheckCircle2 size={14} /> Index Ready
                    </span>
                  </div>

                  {/* Document List */}
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl border border-[#8999FF]/40 bg-[#17243A] text-xs sm:text-sm transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-[#F1F5F9] flex items-center gap-2 truncate">
                          <FileText size={16} className="text-[#8999FF] shrink-0" />
                          Operating Systems — Silberschatz.pdf
                        </span>
                        <span className="text-[11px] font-mono text-[#8999FF] bg-[#8999FF]/10 px-2 py-0.5 rounded shrink-0">
                          Active
                        </span>
                      </div>
                      <p className="text-xs text-[#94A3B8] font-mono pl-6">
                        Unit 2: Process Synchronization · 42 pages parsed
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-[#1E2D4A] bg-[#111B30]/60 text-xs sm:text-sm text-[#94A3B8]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-[#CBD5E1] flex items-center gap-2 truncate">
                          <FileText size={16} className="text-[#64748B] shrink-0" />
                          Database System Concepts — Korth.pdf
                        </span>
                        <span className="text-[11px] font-mono text-[#64748B]">Ready</span>
                      </div>
                      <p className="text-xs text-[#64748B] font-mono pl-6">
                        Unit 4: Transaction Management · 38 pages parsed
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-[#1E2D4A] bg-[#111B30]/60 text-xs sm:text-sm text-[#94A3B8]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-[#CBD5E1] flex items-center gap-2 truncate">
                          <FileText size={16} className="text-[#64748B] shrink-0" />
                          Computer Networks — Tanenbaum.pdf
                        </span>
                        <span className="text-[11px] font-mono text-[#64748B]">Ready</span>
                      </div>
                      <p className="text-xs text-[#64748B] font-mono pl-6">
                        Unit 3: Data Link Layer & Framing · 56 pages parsed
                      </p>
                    </div>
                  </div>

                  {/* Document Excerpt Panel */}
                  <div className="mt-4 p-4 sm:p-5 rounded-xl border border-[#1E2D4A] bg-[#091020] text-xs sm:text-sm space-y-2">
                    <span className="text-xs font-mono text-[#94A3B8] block font-medium">
                      Retrieved Passage · Page 145:
                    </span>
                    <p className="text-[#94A3B8] leading-relaxed italic">
                      &ldquo;A counting semaphore integer value can range over an unrestricted domain. Binary semaphores
                      can range only between 0 and 1, providing equivalent functionality to mutex locks on systems without
                      hardware spinlocks.&rdquo;
                    </p>
                  </div>
                </div>

                {/* RIGHT FLANK: AI Tutor Grounded Explanation */}
                <div className="lg:col-span-8 xl:col-span-8 p-6 sm:p-8 bg-[#111B30] space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#1E2D4A]">
                    <span className="text-xs sm:text-sm font-mono uppercase tracking-wider text-[#94A3B8] font-semibold">
                      AI Tutor Explanation & Citations
                    </span>
                    <span className="text-xs font-mono text-[#62C9D6]">Model: smartstudy-tutor</span>
                  </div>

                  {/* Query */}
                  <div className="p-4 sm:p-5 rounded-xl border border-[#1E2D4A] bg-[#17243A] text-sm sm:text-base text-[#F1F5F9]">
                    <span className="text-xs font-mono text-[#8999FF] block mb-1 font-semibold">
                      Student Question:
                    </span>
                    How do counting semaphores differ from binary semaphores in resource allocation?
                  </div>

                  {/* Detailed Grounded Answer */}
                  <div className="p-5 sm:p-6 rounded-xl border border-[#1E2D4A] bg-[#0D1527] text-sm sm:text-base text-[#CBD5E1] space-y-3 leading-relaxed">
                    <p>Based on your uploaded course notes from <strong>Operating Systems (Unit 2)</strong>:</p>
                    <ul className="space-y-2.5 pl-4 list-disc marker:text-[#8999FF]">
                      <li>
                        <strong>Counting Semaphores</strong>: Initialized to the number of available resource instances
                        (e.g., N). Each <code className="text-[#62C9D6] font-mono text-sm">wait()</code> decrements
                        the count, and each <code className="text-[#62C9D6] font-mono text-sm">signal()</code> increments
                        it. Processes block only when the value drops to zero.
                      </li>
                      <li>
                        <strong>Binary Semaphores</strong>: Restricted strictly to values 0 and 1. They serve as mutual
                        exclusion locks (mutexes) where only a single process can access the guarded section at a time.
                      </li>
                    </ul>
                  </div>

                  {/* Source Provenance Citation */}
                  <div className="p-4 sm:p-5 rounded-xl border border-[#62C9D6]/30 bg-[#080D1A] text-xs sm:text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[#62C9D6] font-medium flex items-center gap-1.5">
                        <FileCheck size={15} />
                        Operating Systems — Silberschatz.pdf · Section 6.5, Page 145
                      </span>
                      <span className="text-[11px] font-mono text-[#10B981] font-semibold">Illustrative Sample</span>
                    </div>
                    <p className="text-xs text-[#94A3B8]">
                      Sample semantic match from illustrative textbook notes. Real ingestion occurs when you upload your course files.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            4. CORE CAPABILITIES SECTION — ENTIRE WINDOW SIZE (min-h-screen, Stretched Wide)
            ========================================================================= */}
        <section id="features" className="min-h-screen flex flex-col justify-center py-12 lg:py-16 border-b border-[#1E2D4A]/40 bg-[#0B1326]">
          <div className="w-full px-6 sm:px-10 lg:px-12 xl:px-16 2xl:px-20">
            {/* Section Header */}
            <div className="max-w-4xl mx-auto text-center mb-10 lg:mb-12">
              <span className="text-xs font-mono tracking-widest uppercase text-[#8999FF] block mb-2 font-medium">
                Academic Capabilities
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#F1F5F9] mb-3 font-heading">
                Designed for technical depth and rigorous retention.
              </h2>
              <p className="text-base sm:text-lg text-[#94A3B8] leading-relaxed max-w-2xl mx-auto">
                Four interconnected capabilities engineered to turn dense course syllabi into long-term conceptual mastery.
              </p>
            </div>

            {/* 4 Cards Grid - Full Width 4 Columns on Desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 xl:gap-8 w-full">
              {/* Capability 1 */}
              <div className="p-8 sm:p-9 rounded-2xl border border-[#1E2D4A] bg-[#111B30] hover:border-[#8999FF]/40 transition-colors duration-200 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#8999FF]/10 border border-[#8999FF]/20 flex items-center justify-center text-[#8999FF] mb-6">
                    <BookOpen size={24} />
                  </div>
                  <span className="text-xs font-mono text-[#8999FF] tracking-wider uppercase block mb-2 font-semibold">
                    Capability 01
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#F1F5F9] mb-3 font-heading">
                    Document-Grounded Learning
                  </h3>
                  <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed mb-6 font-normal">
                    Upload syllabus PDFs, lecture slides, and personal course notes. Every question searches your private
                    document store to deliver answers anchored in verified course passages rather than generic web models.
                  </p>
                </div>
                <div className="pt-4 border-t border-[#1E2D4A] flex items-center justify-between text-xs font-mono text-[#64748B]">
                  <span>Supports PDF, DOCX, PPTX, TXT</span>
                  <span className="text-[#8999FF] font-medium">Strict Isolation</span>
                </div>
              </div>

              {/* Capability 2 */}
              <div className="p-8 sm:p-9 rounded-2xl border border-[#1E2D4A] bg-[#111B30] hover:border-[#62C9D6]/40 transition-colors duration-200 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#62C9D6]/10 border border-[#62C9D6]/20 flex items-center justify-center text-[#62C9D6] mb-6">
                    <Brain size={24} />
                  </div>
                  <span className="text-xs font-mono text-[#62C9D6] tracking-wider uppercase block mb-2 font-semibold">
                    Capability 02
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#F1F5F9] mb-3 font-heading">
                    Adaptive AI Tutor
                  </h3>
                  <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed mb-6 font-normal">
                    Work through challenging engineering algorithms, examine code implementations, and resolve conceptual
                    doubts step-by-step. Ask follow-up questions with complete conversational memory across your session.
                  </p>
                </div>
                <div className="pt-4 border-t border-[#1E2D4A] flex items-center justify-between text-xs font-mono text-[#64748B]">
                  <span>Local LLM Inference</span>
                  <span className="text-[#62C9D6] font-medium">Multi-Turn</span>
                </div>
              </div>

              {/* Capability 3 */}
              <div className="p-8 sm:p-9 rounded-2xl border border-[#1E2D4A] bg-[#111B30] hover:border-[#10B981]/40 transition-colors duration-200 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center text-[#10B981] mb-6">
                    <FileCheck size={24} />
                  </div>
                  <span className="text-xs font-mono text-[#10B981] tracking-wider uppercase block mb-2 font-semibold">
                    Capability 03
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#F1F5F9] mb-3 font-heading">
                    Active Recall Quizzes
                  </h3>
                  <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed mb-6 font-normal">
                    Generate multiple-choice evaluations directly from your course files. Every question provides
                    verified citations, immediate answer explanations, and distractor rationale to reinforce retention.
                  </p>
                </div>
                <div className="pt-4 border-t border-[#1E2D4A] flex items-center justify-between text-xs font-mono text-[#64748B]">
                  <span>Topic & Notes Modes</span>
                  <span className="text-[#10B981] font-medium">Full Rationale</span>
                </div>
              </div>

              {/* Capability 4 */}
              <div className="p-8 sm:p-9 rounded-2xl border border-[#1E2D4A] bg-[#111B30] hover:border-[#8999FF]/40 transition-colors duration-200 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#8999FF]/10 border border-[#8999FF]/20 flex items-center justify-center text-[#8999FF] mb-6">
                    <Clock size={24} />
                  </div>
                  <span className="text-xs font-mono text-[#8999FF] tracking-wider uppercase block mb-2 font-semibold">
                    Capability 04
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#F1F5F9] mb-3 font-heading">
                    Focused Study & Analytics
                  </h3>
                  <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed mb-6 font-normal">
                    Structure study sessions with integrated Pomodoro timers tied to specific tasks. Review daily study
                    minutes, task completion velocity, and learning consistency on your real-time analytics dashboard.
                  </p>
                </div>
                <div className="pt-4 border-t border-[#1E2D4A] flex items-center justify-between text-xs font-mono text-[#64748B]">
                  <span>Pomodoro Intervals</span>
                  <span className="text-[#8999FF] font-medium">Parent Ledger</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            5. HOW IT WORKS — ENTIRE WINDOW SIZE (min-h-screen, Stretched Wide)
            ========================================================================= */}
        <section id="how-it-works" className="min-h-screen flex flex-col justify-center py-12 lg:py-16 border-b border-[#1E2D4A]/40 bg-[#080D1A]">
          <div className="w-full px-6 sm:px-10 lg:px-12 xl:px-16 2xl:px-20">
            {/* Section Header */}
            <div className="max-w-4xl mx-auto text-center mb-10 lg:mb-12">
              <span className="text-xs font-mono tracking-widest uppercase text-[#8999FF] block mb-2 font-medium">
                The Study Method
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#F1F5F9] mb-3 font-heading">
                A simple, repeatable cycle for course mastery.
              </h2>
              <p className="text-base sm:text-lg text-[#94A3B8] leading-relaxed max-w-2xl mx-auto">
                Transform raw syllabus files into genuine conceptual understanding through three focused stages.
              </p>
            </div>

            {/* 3 Step Connected Cards (Full Width) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 xl:gap-8 w-full">
              {/* Step 1 */}
              <div className="p-8 sm:p-10 rounded-2xl border border-[#1E2D4A] bg-[#111B30] relative space-y-4 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#1E2D4A] flex items-center justify-center font-mono text-base font-bold text-[#8999FF] mb-5">
                    01
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#F1F5F9] font-heading mb-3">
                    Add Your Materials
                  </h3>
                  <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed">
                    Upload syllabus PDFs, lecture slides, and notes. Files are securely converted and indexed into your
                    private local vector store with strict local tenant isolation.
                  </p>
                </div>
                <div className="pt-4 border-t border-[#1E2D4A]/60 text-xs font-mono text-[#64748B]">
                  Stage: Document Extraction & Ingestion
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-8 sm:p-10 rounded-2xl border border-[#1E2D4A] bg-[#111B30] relative space-y-4 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#1E2D4A] flex items-center justify-center font-mono text-base font-bold text-[#62C9D6] mb-5">
                    02
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#F1F5F9] font-heading mb-3">
                    Learn and Practise
                  </h3>
                  <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed">
                    Ask deep conceptual questions to unpack difficult derivations, then generate active-recall quizzes to
                    test your retention against cited textbook excerpts.
                  </p>
                </div>
                <div className="pt-4 border-t border-[#1E2D4A]/60 text-xs font-mono text-[#64748B]">
                  Stage: Grounded Tutor & Active Recall
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-8 sm:p-10 rounded-2xl border border-[#1E2D4A] bg-[#111B30] relative space-y-4 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#1E2D4A] flex items-center justify-center font-mono text-base font-bold text-[#10B981] mb-5">
                    03
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#F1F5F9] font-heading mb-3">
                    Track Your Learning
                  </h3>
                  <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed">
                    Log focused Pomodoro sessions, complete scheduled revision tasks, and review study velocity and quiz
                    accuracy on your personal analytics dashboard.
                  </p>
                </div>
                <div className="pt-4 border-t border-[#1E2D4A]/60 text-xs font-mono text-[#64748B]">
                  Stage: Habit Ledger & Mastery Analytics
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            6. INTERACTIVE DEMO — ENTIRE WINDOW SIZE (min-h-screen, Stretched Wide)
            ========================================================================= */}
        <section id="interactive-demo" className="min-h-screen flex flex-col justify-center py-12 lg:py-16 border-b border-[#1E2D4A]/40 bg-[#0B1326]">
          <div className="w-full px-6 sm:px-10 lg:px-12 xl:px-16 2xl:px-20">
            {/* Section Header */}
            <div className="max-w-4xl mx-auto text-center mb-8 lg:mb-10">
              <span className="text-xs font-mono tracking-widest uppercase text-[#8999FF] block mb-2 font-medium">
                Interactive Preview
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#F1F5F9] mb-3 font-heading">
                Experience source-grounded active recall.
              </h2>
              <p className="text-base sm:text-lg text-[#94A3B8] leading-relaxed max-w-2xl mx-auto">
                Test how practice questions are generated and verified against real engineering textbook syllabi.
              </p>
            </div>

            {/* Widescreen Interactive Workbench Card (Spanning full width) */}
            <div className="rounded-2xl border border-[#1E2D4A] bg-[#111B30] shadow-2xl overflow-hidden w-full">
              <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#1E2D4A]">
                {/* LEFT FLANK: Subject Selector & Topic Context */}
                <div className="lg:col-span-4 xl:col-span-4 p-6 sm:p-8 bg-[#0D1527] flex flex-col justify-between space-y-5">
                  <div>
                    <span className="text-xs sm:text-sm font-mono text-[#8999FF] uppercase tracking-wider block mb-3 font-semibold">
                      Select Academic Domain
                    </span>

                    {/* Subject Selector Buttons */}
                    <div className="space-y-2.5 mb-5">
                      {DEMO_TOPICS.map((topic) => {
                        const isActive = topic.id === selectedTopicId;
                        return (
                          <button
                            key={topic.id}
                            onClick={() => handleSelectTopic(topic.id)}
                            className={`w-full text-left p-3.5 rounded-xl text-sm font-medium transition-all flex items-center justify-between cursor-pointer ${
                              isActive
                                ? "bg-[#8999FF] text-[#080D1A] font-semibold shadow-md"
                                : "bg-[#111B30] text-[#94A3B8] border border-[#1E2D4A] hover:text-white hover:bg-[#17243A]"
                            }`}
                          >
                            <span>{topic.subject}</span>
                            <ArrowRight size={14} className={isActive ? "text-[#080D1A]" : "text-[#64748B]"} />
                          </button>
                        );
                      })}
                    </div>

                    {/* Active Topic Summary */}
                    <div className="p-4 rounded-xl border border-[#1E2D4A] bg-[#080D1A] space-y-1.5 text-xs sm:text-sm">
                      <span className="text-[11px] font-mono text-[#62C9D6] uppercase tracking-wider block font-semibold">
                        Active Course Unit
                      </span>
                      <p className="font-semibold text-[#F1F5F9] text-sm sm:text-base">
                        {activeTopic.title}
                      </p>
                      <p className="text-[#94A3B8] font-mono text-xs">
                        {activeTopic.document}
                      </p>
                    </div>
                  </div>

                  {/* Reset Controls */}
                  <div className="pt-3 border-t border-[#1E2D4A] flex items-center justify-between text-xs sm:text-sm text-[#94A3B8]">
                    <span>Illustrative Sample (Preview Only)</span>
                    {quizSubmitted && (
                      <button
                        onClick={handleResetQuiz}
                        className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#8999FF] hover:underline cursor-pointer"
                      >
                        <RotateCcw size={14} />
                        <span>Try again</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* RIGHT FLANK: Interactive Question Stem & Evaluation */}
                <div className="lg:col-span-8 xl:col-span-8 p-6 sm:p-8 bg-[#111B30] space-y-5">
                  {/* Question Header Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#1E2D4A]">
                    <div>
                      <span className="text-xs sm:text-sm font-mono text-[#8999FF] uppercase tracking-wider block mb-0.5">
                        {activeTopic.subject} Evaluation
                      </span>
                      <span className="text-xs text-[#64748B] font-mono">{activeTopic.document}</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono text-[#62C9D6] bg-[#62C9D6]/10 border border-[#62C9D6]/20">
                      <Sparkles size={13} />
                      <span>Illustrative Sample (Preview Only)</span>
                    </div>
                  </div>

                  {/* Question Stem */}
                  <div className="p-4 sm:p-5 rounded-xl bg-[#0D1527] border border-[#1E2D4A]">
                    <p className="text-base sm:text-lg font-medium text-[#F1F5F9] leading-relaxed">
                      {activeTopic.question}
                    </p>
                  </div>

                  {/* Options */}
                  <div className="space-y-3">
                    {activeTopic.options.map((option, idx) => {
                      const isSelected = quizSelection === idx;
                      let cardClasses =
                        "border-[#1E2D4A] bg-[#17243A]/70 text-[#CBD5E1] hover:border-[#2C3F63] hover:bg-[#1C2C47]";

                      if (quizSubmitted) {
                        if (option.correct) {
                          cardClasses = "border-[#10B981] bg-[#10B981]/15 text-[#D1FAE5] font-semibold";
                        } else if (isSelected && !option.correct) {
                          cardClasses = "border-[#EF4444] bg-[#EF4444]/15 text-[#FEE2E2]";
                        } else {
                          cardClasses = "border-[#1E2D4A]/50 bg-[#0D1527]/50 text-[#64748B] opacity-50";
                        }
                      } else if (isSelected) {
                        cardClasses = "border-[#8999FF] bg-[#8999FF]/15 text-white";
                      }

                      return (
                        <button
                          key={option.text}
                          onClick={() => handleAnswerSelect(idx)}
                          disabled={quizSubmitted}
                          className={`w-full text-left p-3.5 sm:p-4 rounded-xl border transition-all flex items-center justify-between text-sm sm:text-base cursor-pointer ${cardClasses}`}
                        >
                          <div className="flex items-center gap-3.5">
                            <span className="w-8 h-8 rounded-lg bg-[#0D1527] text-xs font-mono font-bold text-[#8999FF] border border-[#1E2D4A] flex items-center justify-center shrink-0">
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span>{option.text}</span>
                          </div>
                          {quizSubmitted && option.correct && (
                            <CheckCircle2 size={18} className="text-[#10B981] shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Citation & Rationale Feedback */}
                  {quizSubmitted && (
                    <div className="p-4 sm:p-5 rounded-xl border border-[#10B981]/40 bg-[#080D1A] space-y-2.5 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between text-xs sm:text-sm font-mono">
                        <span className="text-[#10B981] font-semibold flex items-center gap-2">
                          <FileCheck size={16} /> Grounded Syllabus Citation
                        </span>
                        <span className="text-[#64748B]">{activeTopic.citation}</span>
                      </div>
                      <p className="text-sm sm:text-base text-[#94A3B8] italic leading-relaxed">
                        &ldquo;{activeTopic.citationExcerpt}&rdquo;
                      </p>
                      <div className="pt-2 border-t border-[#1E2D4A]/60 text-xs sm:text-sm text-[#CBD5E1]">
                        <strong>Explanation:</strong> {activeTopic.explanation}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            7. FREQUENTLY ASKED QUESTIONS — ENTIRE WINDOW SIZE (min-h-screen, Stretched Wide)
            ========================================================================= */}
        <section id="faq" className="min-h-screen flex flex-col justify-center py-12 lg:py-16 border-b border-[#1E2D4A]/40 bg-[#080D1A]">
          <div className="w-full px-6 sm:px-10 lg:px-12 xl:px-16 2xl:px-20">
            {/* Section Header */}
            <div className="max-w-4xl mx-auto text-center mb-10 lg:mb-12">
              <span className="text-xs font-mono tracking-widest uppercase text-[#8999FF] block mb-2 font-medium">
                Frequently Asked Questions
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#F1F5F9] mb-3 font-heading">
                Questions & Answers
              </h2>
              <p className="text-base sm:text-lg text-[#94A3B8] leading-relaxed max-w-2xl mx-auto">
                Clear details about how Smart Edu processes documents, runs local models, and preserves student privacy.
              </p>
            </div>

            {/* 2-Column Responsive FAQ Accordion Grid (Full Width) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 w-full">
              {[
                {
                  q: "Does Smart Edu require a paid AI API or cloud subscription?",
                  a: "No. Smart Edu runs local AI inference using Ollama with models like Llama 3.2. All document embeddings and query reasoning run securely on your machine with zero external cloud dependencies or recurring API costs.",
                },
                {
                  q: "How does document-grounded learning work?",
                  a: "When you upload course notes, they are processed and indexed into a private local vector database. When you ask a question, the AI retrieves relevant passages from your actual files and synthesizes an explanation with verifiable citations showing the exact document name and page number.",
                },
                {
                  q: "Which document formats are supported?",
                  a: "Smart Edu supports PDF (with OCR fallback for scanned pages), Microsoft Word (DOCX), Microsoft PowerPoint (PPTX), and plain text (TXT).",
                },
                {
                  q: "Can students upload their own personal notes?",
                  a: "Yes. You can upload lecture slides, personal study notes, textbook chapters, and past exam papers. Documents remain strictly isolated to your authenticated student account.",
                },
                {
                  q: "How does quiz generation work?",
                  a: "You can generate quizzes from uploaded notes or specific curriculum topics. The system formulates multiple-choice questions, plausible distractors, and source citations with explanations for why the correct answer is right.",
                },
                {
                  q: "How does parent progress monitoring work?",
                  a: "Parents can link to student accounts to view high-level study hours, task completion, and quiz accuracy through a privacy-first progress dashboard without intruding on day-to-day study sessions.",
                },
                {
                  q: "Is student study data kept private?",
                  a: "Yes. Student accounts, documents, notes, focus history, and quiz attempts are isolated with strict tenant security and stored in your private database.",
                },
              ].map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-[#1E2D4A] bg-[#111B30] overflow-hidden transition-colors"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full p-5 sm:p-6 text-left flex items-center justify-between text-base sm:text-lg font-semibold text-[#F1F5F9] hover:text-[#8999FF] transition-colors cursor-pointer"
                      aria-expanded={isOpen}
                    >
                      <span>{item.q}</span>
                      {isOpen ? (
                        <ChevronUp size={20} className="text-[#8999FF] shrink-0 ml-2" />
                      ) : (
                        <ChevronDown size={20} className="text-[#64748B] shrink-0 ml-2" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-sm sm:text-base text-[#94A3B8] leading-relaxed border-t border-[#1E2D4A]/60 pt-4">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* =========================================================================
            8. FINAL CALL TO ACTION — ENTIRE WINDOW SIZE (min-h-screen with Footer, Stretched Wide)
            ========================================================================= */}
        <section className="min-h-screen flex flex-col justify-between pt-12 pb-6 bg-[#0B1326] relative overflow-hidden">
          <div className="w-full px-6 sm:px-10 lg:px-12 xl:px-16 2xl:px-20 my-auto relative z-10">
            <div className="p-10 sm:p-14 xl:p-18 rounded-3xl border border-[#1E2D4A] bg-[#111B30] shadow-2xl w-full text-center">
              <span className="text-xs font-mono tracking-widest uppercase text-[#8999FF] block mb-3 font-semibold">
                Start Today
              </span>
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#F1F5F9] mb-4 font-heading">
                Make every study session count.
              </h2>
              <p className="text-base sm:text-lg xl:text-xl text-[#94A3B8] mb-8 max-w-2xl mx-auto leading-relaxed">
                Bring your course materials, questions and learning goals into one focused academic workspace.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 h-13 rounded-xl text-base font-semibold bg-[#8999FF] text-[#080D1A] hover:bg-[#9CA8FF] active:scale-[0.98] transition-all shadow-[0_1px_16px_rgba(137,153,255,0.25)]"
                >
                  <span>Get started</span>
                  <ArrowRight size={16} className="shrink-0" />
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-8 h-13 rounded-xl text-base font-medium text-[#94A3B8] hover:text-white transition-colors"
                >
                  Already have an account? Sign in &rarr;
                </Link>
              </div>
            </div>
          </div>

          {/* Integrated Full-Width Footer */}
          <footer className="border-t border-[#1E2D4A]/60 py-8 bg-[#080D1A] text-xs sm:text-sm text-[#94A3B8] w-full mt-8">
            <div className="w-full px-6 sm:px-10 lg:px-12 xl:px-16 2xl:px-20">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-6">
                {/* Brand Col */}
                <div className="md:col-span-2 space-y-3">
                  <Link href="/" className="inline-block group" aria-label="Smart Edu Home">
                    <Logo size={26} textSize="text-base font-bold text-[#F1F5F9]" />
                  </Link>
                  <p className="text-[#64748B] text-xs sm:text-sm max-w-sm leading-relaxed">
                    The source-grounded academic technology platform designed for engineering and computer science students.
                  </p>
                </div>

                {/* Links Col 1: Workspace */}
                <div className="space-y-2.5">
                  <span className="font-semibold text-[#F1F5F9] font-mono text-xs uppercase tracking-wider block">
                    Workspace
                  </span>
                  <ul className="space-y-1.5 text-xs sm:text-sm">
                    <li>
                      <Link href="/dashboard" className="hover:text-white transition-colors">
                        Dashboard
                      </Link>
                    </li>
                    <li>
                      <Link href="/ai-tutor" className="hover:text-white transition-colors">
                        AI Tutor
                      </Link>
                    </li>
                    <li>
                      <Link href="/quizzes" className="hover:text-white transition-colors">
                        Practice Quizzes
                      </Link>
                    </li>
                    <li>
                      <Link href="/tasks" className="hover:text-white transition-colors">
                        Study Tasks
                      </Link>
                    </li>
                    <li>
                      <Link href="/focus" className="hover:text-white transition-colors">
                        Focus Mode
                      </Link>
                    </li>
                    <li>
                      <Link href="/analytics" className="hover:text-white transition-colors">
                        Learning Analytics
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Links Col 2: Account & Access */}
                <div className="space-y-2.5">
                  <span className="font-semibold text-[#F1F5F9] font-mono text-xs uppercase tracking-wider block">
                    Account & Portals
                  </span>
                  <ul className="space-y-1.5 text-xs sm:text-sm">
                    <li>
                      <Link href="/login" className="hover:text-white transition-colors">
                        Sign In
                      </Link>
                    </li>
                    <li>
                      <Link href="/register" className="hover:text-white transition-colors">
                        Create Account
                      </Link>
                    </li>
                    <li>
                      <Link href="/parent" className="hover:text-white transition-colors">
                        Parent Portal
                      </Link>
                    </li>
                    <li>
                      <Link href="/admin" className="hover:text-white transition-colors">
                        Admin Portal
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-5 border-t border-[#1E2D4A]/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
                <p>&copy; 2026 Smart Study Portal. Source-grounded academic learning.</p>
                <div className="flex items-center gap-6">
                  <span>Local AI Inference</span>
                  <span>Document Isolation</span>
                  <span>Verifiable Citations</span>
                </div>
              </div>
            </div>
          </footer>
        </section>
      </main>
    </div>
  );
}
