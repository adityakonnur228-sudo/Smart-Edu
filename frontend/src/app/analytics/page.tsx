"use client";
import { API } from "@/lib/api";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  CheckCircle2,
  TrendingUp,
  Award,
  ArrowRight,
  Flame,
  AlertTriangle,
  Brain,
  Eye,
  EyeOff,
  Play,
  Pause,
  Square,
  RefreshCw,
  BookOpen,
  Globe,
  Sparkles,
} from "lucide-react";
import { Navbar } from "../navbar";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import {
  useProgressOverview,
  useProgressTrends,
  useTopicMastery,
  useInvalidateAnalytics,
} from "@/hooks/useProgress";

// Using centralized API endpoint from @/lib/api

export default function AnalyticsPage() {
  const router = useRouter();
  const invalidateAnalytics = useInvalidateAnalytics();

  const {
    data: overview,
    isFetching: isOverviewFetching,
    isError: isOverviewError,
    error: overviewError,
    refetch: refetchOverview,
    dataUpdatedAt: overviewUpdatedAt,
  } = useProgressOverview();

  const {
    data: trend,
    isFetching: isTrendFetching,
    isError: isTrendError,
    error: trendError,
    refetch: refetchTrends,
  } = useProgressTrends();

  const {
    data: topicMasteryList = [],
    isFetching: isTopicsFetching,
    isError: isTopicsError,
    refetch: refetchTopics,
  } = useTopicMastery();

  const [activeTooltipDay, setActiveTooltipDay] = useState<string | null>(null);
  const [hideEmptyDays, setHideEmptyDays] = useState<boolean>(true);
  const [topicCategoryFilter, setTopicCategoryFilter] = useState<"ALL" | "ACADEMIC" | "RESEARCH">("ALL");
  const [actionBusy, setActionBusy] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string>("");

  // Cross-component and cross-tab mutation event listeners
  useEffect(() => {
    const handleMutationEvent = () => {
      void refetchOverview();
      void refetchTrends();
      void refetchTopics();
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === "smartstudy:last_mutation") {
        void refetchOverview();
        void refetchTrends();
        void refetchTopics();
      }
    };

    window.addEventListener("smartstudy:mutation", handleMutationEvent);
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      window.removeEventListener("smartstudy:mutation", handleMutationEvent);
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, [refetchOverview, refetchTrends, refetchTopics]);

  const activeElapsedSeconds = overview?.activeSessionSeconds ?? 0;

  const totalStudyMinutesCalculated = useMemo(() => {
    if (!overview) return 0;
    const baseSecs = overview.verifiedStudySeconds ?? (overview.totalStudyMinutes * 60);
    const totalSecs = baseSecs + activeElapsedSeconds;
    return totalSecs > 0 && totalSecs < 60 ? 1 : Math.floor(totalSecs / 60);
  }, [overview, activeElapsedSeconds]);

  // Manual refresh handler
  const handleManualRefresh = useCallback(async () => {
    await Promise.all([refetchOverview(), refetchTrends(), refetchTopics()]);
  }, [refetchOverview, refetchTrends, refetchTopics]);

  // Quick Session Controls directly from Analytics
  async function handleQuickStart() {
    setActionBusy(true);
    setActionError("");
    try {
      const res = await fetch(`${API}/focus/sessions/start`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || "Failed to start session.");
      }
      invalidateAnalytics();
      await handleManualRefresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to start session.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleQuickTogglePause() {
    if (!overview?.activeSessionId) return;
    setActionBusy(true);
    setActionError("");
    try {
      const actionName = overview.activeSessionStatus === "PAUSED" ? "resume" : "pause";
      const res = await fetch(`${API}/focus/sessions/${overview.activeSessionId}/${actionName}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Action failed.");
      invalidateAnalytics();
      await handleManualRefresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to toggle pause.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleQuickStop() {
    if (!overview?.activeSessionId) return;
    setActionBusy(true);
    setActionError("");
    try {
      const res = await fetch(`${API}/focus/sessions/${overview.activeSessionId}/stop`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to stop session.");
      invalidateAnalytics();
      await handleManualRefresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to stop session.");
    } finally {
      setActionBusy(false);
    }
  }

  const isToday = (dateStr: string) => {
    if (!dateStr) return false;
    const now = new Date();
    const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return dateStr === localToday;
  };

  const totalWeekMinutes = useMemo(() => {
    if (trend?.weekTotalMinutes !== undefined) return trend.weekTotalMinutes;
    const baseSecs = trend?.studyMinutes?.reduce((acc, curr) => acc + (curr.seconds ?? (curr.minutes * 60)), 0) ?? 0;
    return Math.floor(baseSecs / 60);
  }, [trend]);

  const maxMinutesInWeek = useMemo(() => {
    const dayMins = (trend?.studyMinutes ?? []).map((x) => x.minutes);
    return Math.max(30, ...dayMins);
  }, [trend?.studyMinutes]);

  function formatBarDuration(secs: number, isLive: boolean): string {
    if (isLive) {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${m}m ${String(s).padStart(2, "0")}s`;
    }
    if (secs <= 0) return "0m";
    if (secs < 60) return `${secs}s`;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (s === 0 || m >= 10) return `${m}m`;
    return `${m}m ${s}s`;
  }

  // Filtered Topic Mastery List
  const filteredTopics = useMemo(() => {
    if (topicCategoryFilter === "ACADEMIC") {
      return topicMasteryList.filter((t) => t.isAcademic);
    }
    if (topicCategoryFilter === "RESEARCH") {
      return topicMasteryList.filter((t) => !t.isAcademic);
    }
    return topicMasteryList;
  }, [topicMasteryList, topicCategoryFilter]);

  // Daily activity rows from backend dailyBreakdown
  const activityRows = useMemo(() => {
    if (trend?.dailyBreakdown && trend.dailyBreakdown.length > 0) {
      return trend.dailyBreakdown.filter((row) => (hideEmptyDays ? row.hasActivity || isToday(row.date) : true));
    }
    if (!trend?.studyMinutes) return [];
    return trend.studyMinutes
      .map((day, i) => {
        const completedCount = trend.taskCompletions[i]?.completed ?? 0;
        const quizAcc = trend.quizAccuracy[i]?.percent;
        const todayMatch = isToday(day.date);
        const liveSecs = todayMatch && overview?.isFocusingNow ? activeElapsedSeconds : 0;
        const effectiveMins = day.minutes + Math.floor(liveSecs / 60);
        const hasActivity = effectiveMins > 0 || completedCount > 0 || (quizAcc !== undefined && quizAcc !== null);
        return {
          date: day.date,
          dayName: new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" }),
          focusMinutes: effectiveMins,
          liveSeconds: liveSecs % 60,
          completedTasks: completedCount,
          quizzesTaken: quizAcc !== undefined ? 1 : 0,
          quizAccuracy: quizAcc ?? null,
          hasActivity,
        };
      })
      .filter((row) => (hideEmptyDays ? row.hasActivity || isToday(row.date) : true));
  }, [trend, hideEmptyDays, overview?.isFocusingNow, activeElapsedSeconds]);

  const isGlobalFetching = isOverviewFetching || isTrendFetching || isTopicsFetching;
  const isGlobalError = isOverviewError || isTrendError || isTopicsError;

  const lastSyncedTime = useMemo(() => {
    if (!overviewUpdatedAt) return "Connecting...";
    return new Date(overviewUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }, [overviewUpdatedAt]);

  return (
    <div className="min-h-screen flex flex-col bg-brand-primary text-brand-neutral">
      <Navbar />

      <main className="app-container page-wrapper flex-1 py-8">
        <PageHeader
          eyebrow="Performance Telemetry"
          eyebrowIcon={<TrendingUp size={13} className="text-brand-neutral" />}
          title="Progress & Analytics"
          description="Real-time verified study intervals, schedule velocity, and topic retention across all modules."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {/* Honest Freshness Status Badge */}
              <div
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono border transition-all ${
                  isGlobalError
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                    : isGlobalFetching
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                    : overview?.isFocusingNow
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                    : "bg-brand-secondary border-emerald-500/30 text-emerald-300"
                }`}
              >
                {isGlobalError ? (
                  <>
                    <AlertTriangle size={12} className="text-rose-400 shrink-0" />
                    <span className="uppercase font-bold tracking-wider">Connection Error</span>
                  </>
                ) : isGlobalFetching ? (
                  <>
                    <RefreshCw size={12} className="animate-spin text-amber-400 shrink-0" />
                    <span className="uppercase font-bold tracking-wider">Syncing...</span>
                  </>
                ) : overview?.isFocusingNow ? (
                  <>
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="uppercase font-bold tracking-wider">Live Focus Active</span>
                  </>
                ) : (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="uppercase font-bold tracking-wider">Live Telemetry</span>
                  </>
                )}
                <span className="text-[10px] text-brand-muted hidden sm:inline border-l border-brand-neutral/20 pl-2">
                  {lastSyncedTime}
                </span>
              </div>

              {/* Manual Refresh Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleManualRefresh}
                disabled={isGlobalFetching || actionBusy}
                icon={<RefreshCw size={12} className={isGlobalFetching ? "animate-spin shrink-0" : "shrink-0"} />}
                className="text-xs px-2.5"
                title="Refresh Analytics Telemetry"
              >
                Refresh
              </Button>

              {!overview?.isFocusingNow && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleQuickStart}
                  disabled={actionBusy}
                  icon={<Play size={13} className="text-emerald-400 shrink-0" />}
                  className="text-xs border-emerald-500/30 hover:border-emerald-500/60"
                >
                  Start Focus
                </Button>
              )}

              <Link href="/focus">
                <Button variant="secondary" size="sm" icon={<Clock size={13} className="shrink-0" />} className="text-xs">
                  Focus Mode
                </Button>
              </Link>
              <Link href="/tasks">
                <Button variant="primary" size="sm" icon={<CheckCircle2 size={13} className="shrink-0" />} className="text-xs">
                  Tasks
                </Button>
              </Link>
            </div>
          }
        />

        {/* Real-time Focus Session Active Notification Banner */}
        {overview?.isFocusingNow && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 mb-6 rounded-xl bg-gradient-to-r from-emerald-950/40 via-brand-secondary to-brand-raised border border-emerald-500/40 shadow-sm animate-pulse">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-3.5 h-3.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Real-Time Focus Session Active</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    LIVE TICKER
                  </span>
                </div>
                <p className="text-xs text-brand-neutral mt-0.5">
                  Recording elapsed:{" "}
                  <span className="font-mono font-bold text-emerald-300 text-sm">
                    +{Math.floor(activeElapsedSeconds / 60)}m{" "}
                    {String(activeElapsedSeconds % 60).padStart(2, "0")}s
                  </span>
                  . Metrics increment automatically without page refresh.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleQuickTogglePause}
                disabled={actionBusy}
                icon={overview.activeSessionStatus === "PAUSED" ? <Play size={12} className="shrink-0" /> : <Pause size={12} className="shrink-0" />}
                className="text-xs"
              >
                {overview.activeSessionStatus === "PAUSED" ? "Resume" : "Pause"}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleQuickStop}
                disabled={actionBusy}
                icon={<Square size={12} className="text-white fill-current shrink-0" />}
                className="text-xs bg-emerald-700 hover:bg-emerald-600 border-none text-white"
              >
                Finish & Save
              </Button>
              <Link href="/focus">
                <Button variant="ghost" size="sm" icon={<Clock size={12} className="shrink-0" />} className="text-xs text-emerald-200">
                  Full Timer
                </Button>
              </Link>
            </div>
          </div>
        )}

        {actionError && (
          <div role="alert" className="px-4 py-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs mb-6 flex items-center justify-between">
            <span>{actionError}</span>
            <button onClick={() => setActionError("")} className="text-rose-400 hover:text-rose-200 text-xs">Dismiss</button>
          </div>
        )}

        {isGlobalError && !overview && (
          <div role="alert" className="px-4 py-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs mb-6">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-rose-400 shrink-0" />
              <span>Could not load live analytics from server. Database or authentication check failed.</span>
            </div>
            <Button variant="secondary" size="sm" onClick={handleManualRefresh} className="mt-2 text-xs">
              Retry Connection
            </Button>
          </div>
        )}

        {overview && (
          <>
            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-8">
              <StatCard
                label="Study Time Recorded"
                value={
                  overview.isFocusingNow
                    ? `${totalStudyMinutesCalculated}m ${activeElapsedSeconds % 60}s`
                    : `${overview.totalStudyMinutes}`
                }
                unit={overview.isFocusingNow ? "" : "min"}
                icon={Clock}
                iconColor="#7692FF"
                subtext={
                  overview.isFocusingNow ? (
                    <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      Live: +{Math.floor(activeElapsedSeconds / 60)}m{" "}
                      {String(activeElapsedSeconds % 60).padStart(2, "0")}s active
                    </span>
                  ) : totalWeekMinutes > 0 ? (
                    `${totalWeekMinutes}m verified this week · ${overview.totalStudyMinutes}m total`
                  ) : (
                    "0m verified this week · Start a focus session"
                  )
                }
              />

              <StatCard
                label="Tasks Completed"
                value={`${overview.completedTasks}/${overview.totalTasks}`}
                icon={CheckCircle2}
                iconColor="#10b981"
                progressPercent={overview.taskCompletionPercent}
                subtext={
                  overview.totalTasks > 0
                    ? `${overview.taskCompletionPercent}% schedule velocity (${overview.pendingTasks ?? 0} pending)`
                    : "0% velocity · Plan tasks in schedule"
                }
              />

              <StatCard
                label="Active Practice Days"
                value={`${overview.activePracticeDays ?? 0}/7`}
                unit="days"
                icon={Flame}
                iconColor="#f59e0b"
                progressPercent={Math.round(((overview.activePracticeDays ?? 0) / 7) * 100)}
                subtext={
                  (overview.activePracticeDays ?? 0) >= 4
                    ? "Consistent momentum this week"
                    : "Aim for 4+ study days weekly"
                }
              />

              <StatCard
                label="Quiz Accuracy"
                value={overview.quizAttempts > 0 ? `${overview.quizAccuracyPercent}%` : "—"}
                icon={Award}
                iconColor="#ABD2FA"
                subtext={
                  overview.quizAttempts > 0
                    ? `${overview.quizAttempts} test attempt${overview.quizAttempts === 1 ? "" : "s"} (${overview.totalCorrectAnswers ?? 0}/${overview.totalQuestionsAnswered ?? 0} correct)`
                    : "Take quizzes to test recall"
                }
              />
            </div>

            {/* 7-Day Study Time Distribution Chart */}
            <section className="p-5 sm:p-6 rounded-xl bg-brand-secondary border border-brand-neutral/20 mb-8 shadow-lg shadow-[#091540]/40">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-brand-light">Study Time Distribution</h2>
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#1B2CC1]/20 text-[#ABD2FA] border border-[#7692FF]/30">
                      7-Day Telemetry (Asia/Kolkata)
                    </span>
                  </div>
                  <p className="text-xs text-brand-muted mt-0.5">Daily verified focus minutes and active session intervals</p>
                </div>
                <div className="flex items-center gap-2">
                  {overview.isFocusingNow ? (
                    <div className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono shadow-sm shadow-emerald-500/20">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>Live Active: {formatBarDuration(activeElapsedSeconds, true)}</span>
                    </div>
                  ) : (
                    <div className="hidden sm:flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded bg-[#102161]/60 border border-[#7692FF]/20 text-[#ABD2FA] font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7692FF]" />
                      Database Grounded
                    </div>
                  )}
                  <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-brand-raised border border-brand-neutral/25 text-xs">
                    <span className="text-brand-muted">Week Total:</span>
                    <span className="font-semibold text-brand-neutral font-mono text-[#ABD2FA]">
                      {totalWeekMinutes > 0 ? `${totalWeekMinutes}m` : "0m"}
                    </span>
                  </div>
                </div>
              </div>

              {trend && (
                <div className="relative">
                  {totalWeekMinutes === 0 && !overview.isFocusingNow ? (
                    <div className="py-10 text-center rounded-lg bg-brand-raised border border-dashed border-brand-neutral/25">
                      <Clock size={24} className="text-brand-muted mx-auto mb-2" />
                      <h3 className="text-xs font-semibold text-brand-neutral mb-1">No Study Minutes Recorded This Week</h3>
                      <p className="text-xs text-brand-muted max-w-sm mx-auto mb-3">
                        Start a focused study block using the Focus Timer to log verified intervals automatically.
                      </p>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleQuickStart}
                        icon={<Play size={13} />}
                        className="text-xs"
                      >
                        Start Live Session
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-end h-52 gap-2 sm:gap-3 pt-8 pb-3 relative">
                      {/* Gridlines */}
                      <div className="absolute left-10 right-0 top-8 border-t border-dashed border-brand-neutral/15" />
                      <div className="absolute left-10 right-0 top-24 border-t border-dashed border-brand-neutral/15" />
                      <div className="absolute left-10 right-0 bottom-9 border-t border-brand-neutral/25" />

                      {/* Y-Axis Labels */}
                      <div className="w-8 h-full flex flex-col justify-between pb-9 text-[10px] font-mono text-brand-muted text-right select-none">
                        <span>{maxMinutesInWeek}m</span>
                        <span>{Math.round(maxMinutesInWeek / 2)}m</span>
                        <span>0m</span>
                      </div>

                      {/* Bars Container */}
                      <div className="flex-1 flex justify-around items-end h-full relative pl-2">
                        {trend.studyMinutes.map((day, idx) => {
                          const todayMatch = isToday(day.date);
                          const liveSecs = todayMatch && overview?.isFocusingNow ? activeElapsedSeconds : 0;
                          const effectiveSeconds = (day.verifiedSeconds ?? (day.minutes * 60)) + liveSecs;
                          const maxSecs = Math.max(1800, maxMinutesInWeek * 60);
                          const heightPct =
                            effectiveSeconds > 0
                              ? Math.max(14, Math.min(100, Math.round((effectiveSeconds / maxSecs) * 82)))
                              : 4;
                          const dayTasks = trend.taskCompletions[idx]?.completed ?? 0;
                          const dayQuizAcc = trend.quizAccuracy[idx]?.percent;
                          const isHovered = activeTooltipDay === day.date;
                          const dayDateObj = new Date(`${day.date}T12:00:00`);

                          return (
                            <div
                              key={day.date}
                              onMouseEnter={() => setActiveTooltipDay(day.date)}
                              onMouseLeave={() => setActiveTooltipDay(null)}
                              className="flex flex-col items-center flex-1 h-full justify-end relative cursor-pointer group"
                            >
                              {/* Hover Tooltip */}
                              {isHovered && (
                                <div
                                  className="absolute left-1/2 -translate-x-1/2 bg-[#091540] border border-[#7692FF]/40 rounded-lg p-2.5 text-[11px] whitespace-nowrap z-30 shadow-2xl pointer-events-none animate-in fade-in zoom-in-95"
                                  style={{ bottom: `${heightPct + 36}%` }}
                                >
                                  <div className="font-semibold text-brand-light flex items-center gap-1.5">
                                    <span>
                                      {dayDateObj.toLocaleDateString(undefined, {
                                        weekday: "short",
                                        month: "short",
                                        day: "numeric",
                                      })}
                                    </span>
                                    {todayMatch && (
                                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#1B2CC1]/40 text-[#ABD2FA] border border-[#7692FF]/40">
                                        TODAY
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[#ABD2FA] font-mono font-medium mt-1">
                                    {formatBarDuration(effectiveSeconds, Boolean(todayMatch && overview?.isFocusingNow))} verified
                                    {todayMatch && liveSecs > 0 && (
                                      <span className="text-emerald-400 ml-1.5">(+{liveSecs}s active)</span>
                                    )}
                                  </div>
                                  {dayTasks > 0 && (
                                    <div className="text-emerald-400 font-mono mt-0.5">{dayTasks} task(s) completed</div>
                                  )}
                                  {dayQuizAcc !== undefined && dayQuizAcc !== null && (
                                    <div className="text-[#7692FF] font-mono mt-0.5">{dayQuizAcc}% quiz score</div>
                                  )}
                                </div>
                              )}

                              {/* Value Label above Bar */}
                              <div className="flex flex-col items-center mb-1.5 transition-transform duration-200 group-hover:-translate-y-0.5">
                                {todayMatch && overview?.isFocusingNow ? (
                                  <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-400/50 px-1.5 py-0.5 rounded-full shadow-sm shadow-emerald-500/20 animate-pulse whitespace-nowrap">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    {formatBarDuration(effectiveSeconds, true)}
                                  </span>
                                ) : effectiveSeconds > 0 ? (
                                  <span className="text-[11px] font-mono font-semibold text-[#ABD2FA] bg-[#102161]/80 px-1.5 py-0.5 rounded border border-[#7692FF]/30 whitespace-nowrap shadow-sm">
                                    {formatBarDuration(effectiveSeconds, false)}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-mono text-brand-muted/40 font-medium">0m</span>
                                )}
                              </div>

                              {/* Bar */}
                              <div
                                className={`w-9 sm:w-11 rounded-t-md transition-all duration-300 ${
                                  todayMatch && overview?.isFocusingNow
                                    ? "bg-gradient-to-t from-[#1B2CC1] to-[#7692FF] ring-2 ring-[#7692FF]/80 shadow-lg shadow-[#1B2CC1]/50 animate-pulse"
                                    : effectiveSeconds > 0
                                    ? todayMatch
                                      ? "bg-gradient-to-t from-[#1B2CC1] to-[#7692FF] ring-1 ring-[#ABD2FA]/50 shadow-md shadow-[#1B2CC1]/40"
                                      : "bg-gradient-to-t from-[#0D1E5B] to-[#1B2CC1] hover:from-[#1B2CC1] hover:to-[#7692FF] border border-[#7692FF]/30 shadow-sm"
                                    : "bg-[#102161]/40 border-t border-[#7692FF]/20"
                                }`}
                                style={{ height: `${heightPct}%` }}
                              />

                              {/* Day Label */}
                              <div className="flex flex-col items-center mt-2">
                                <span
                                  className={`text-[11px] font-mono ${
                                    todayMatch
                                      ? "text-[#ABD2FA] font-bold"
                                      : "text-brand-muted font-medium"
                                  }`}
                                >
                                  {todayMatch
                                    ? "Today"
                                    : dayDateObj.toLocaleDateString(undefined, {
                                        weekday: "short",
                                      })}
                                </span>
                                <span className="text-[9px] font-mono text-brand-muted/60 mt-0.5">
                                  {dayDateObj.toLocaleDateString(undefined, {
                                    month: "numeric",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Bottom Two-Column Section: Topic Mastery & Daily Activity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Topic Mastery */}
              <section className="p-5 sm:p-6 rounded-xl bg-brand-secondary border border-brand-neutral/20">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-brand-light flex items-center gap-1.5">
                      <Brain size={15} className="text-[#7692FF]" />
                      Topic Mastery & Retention
                    </h2>
                    <p className="text-xs text-brand-muted mt-0.5">Categorized by academic curriculum and web research</p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 bg-brand-raised p-0.5 rounded-lg border border-brand-neutral/20 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setTopicCategoryFilter("ALL")}
                      className={`px-2 py-1 rounded transition-colors ${
                        topicCategoryFilter === "ALL"
                          ? "bg-[#1B2CC1] text-white font-medium"
                          : "text-brand-muted hover:text-brand-neutral"
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setTopicCategoryFilter("ACADEMIC")}
                      className={`px-2 py-1 rounded transition-colors ${
                        topicCategoryFilter === "ACADEMIC"
                          ? "bg-[#1B2CC1] text-white font-medium"
                          : "text-brand-muted hover:text-brand-neutral"
                      }`}
                    >
                      VTU Syllabus
                    </button>
                    <button
                      type="button"
                      onClick={() => setTopicCategoryFilter("RESEARCH")}
                      className={`px-2 py-1 rounded transition-colors ${
                        topicCategoryFilter === "RESEARCH"
                          ? "bg-[#1B2CC1] text-white font-medium"
                          : "text-brand-muted hover:text-brand-neutral"
                      }`}
                    >
                      Web Research
                    </button>
                  </div>
                </div>

                {filteredTopics.length === 0 ? (
                  <div className="py-8 text-center rounded-lg bg-brand-raised border border-dashed border-brand-neutral/20">
                    <p className="text-xs text-brand-muted mb-2">
                      {topicCategoryFilter === "ALL"
                        ? "No quiz topic data recorded yet."
                        : `No topics recorded for category: ${topicCategoryFilter}.`}
                    </p>
                    <Link href="/quizzes">
                      <Button variant="ghost" size="sm" icon={<ArrowRight size={13} className="shrink-0" />} className="text-xs">
                        Take a Quiz
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                    {filteredTopics.map((ti) => (
                      <div
                        key={ti.topic}
                        className={`flex items-center justify-between gap-3 p-3 rounded-lg border transition-colors ${
                          ti.status === "NEEDS_REVIEW"
                            ? "bg-rose-950/20 border-rose-500/20"
                            : ti.status === "MASTERED"
                            ? "bg-emerald-950/20 border-emerald-500/20"
                            : "bg-brand-raised border-brand-neutral/20"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {ti.status === "NEEDS_REVIEW" && <AlertTriangle size={12} className="text-rose-400 shrink-0" />}
                            <h4 className="text-xs font-medium text-brand-neutral truncate">{ti.topic}</h4>
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                                ti.isAcademic
                                  ? "bg-blue-500/10 text-blue-300 border-blue-500/30"
                                  : "bg-purple-500/10 text-purple-300 border-purple-500/30"
                              }`}
                            >
                              {ti.isAcademic ? "VTU Academic" : "Web Research"}
                            </span>
                          </div>
                          <p className="text-[11px] text-brand-muted mt-0.5">
                            {ti.attempts} quiz attempt{ti.attempts === 1 ? "" : "s"} · {ti.totalCorrect}/{ti.totalQuestions} questions correct
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              ti.status === "MASTERED"
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : ti.status === "PRACTICING"
                                ? "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                                : ti.status === "NEEDS_REVIEW"
                                ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {ti.statusLabel ?? (ti.status === "INSUFFICIENT_DATA" ? "1 Attempt (Needs More)" : ti.status)}
                          </span>
                          <span className="text-xs font-semibold font-mono text-brand-neutral w-9 text-right">
                            {ti.averageScore !== null ? `${ti.averageScore}%` : "—"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Right Column: Daily Activity Table */}
              <section className="p-5 sm:p-6 rounded-xl bg-brand-secondary border border-brand-neutral/20">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-brand-light">Daily Breakdown</h2>
                    <p className="text-xs text-brand-muted mt-0.5">7-day verified sessions, tasks, and accuracy</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHideEmptyDays((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 text-[11px] text-brand-neutral hover:text-brand-neutral px-2.5 py-1.5 rounded-lg bg-brand-raised border border-brand-neutral/25 transition-colors cursor-pointer shrink-0"
                  >
                    {hideEmptyDays ? <Eye size={12} className="shrink-0" /> : <EyeOff size={12} className="shrink-0" />}
                    <span>{hideEmptyDays ? "Show all" : "Hide inactive"}</span>
                  </button>
                </div>

                {activityRows.length === 0 ? (
                  <p className="text-xs text-brand-muted text-center py-6">No activity recorded in this period.</p>
                ) : (
                  <div className="space-y-1.5">
                    {activityRows.map((row) => {
                      const todayMatch = isToday(row.date);
                      const formattedDate = new Date(`${row.date}T12:00:00`).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      });

                      return (
                        <div
                          key={row.date}
                          className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${
                            todayMatch
                              ? "bg-brand-accent/10 border-brand-neutral/20 text-brand-neutral"
                              : "bg-brand-raised border-brand-neutral/20 text-brand-neutral"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={todayMatch ? "font-semibold text-brand-neutral" : "text-brand-neutral"}>
                              {formattedDate}
                            </span>
                            {todayMatch && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-brand-accent/20 text-brand-light font-mono">
                                Today
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs">
                            <span className={row.focusMinutes > 0 || (row.liveSeconds ?? 0) > 0 ? "text-brand-neutral font-mono" : "text-brand-muted font-mono"}>
                              {row.focusMinutes}m{(row.liveSeconds ?? 0) > 0 ? ` +${row.liveSeconds}s` : ""}
                            </span>
                            <span className={row.completedTasks > 0 ? "text-emerald-400" : "text-brand-muted"}>
                              {row.completedTasks} task{row.completedTasks === 1 ? "" : "s"}
                            </span>
                            {row.quizAccuracy !== null && row.quizAccuracy !== undefined ? (
                              <span className="text-brand-neutral font-mono">{row.quizAccuracy}% quiz</span>
                            ) : (
                              <span className="text-brand-muted font-mono">—</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
