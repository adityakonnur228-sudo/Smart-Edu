package edu.smartstudy.progress;

import edu.smartstudy.focus.*;
import edu.smartstudy.material.*;
import edu.smartstudy.planning.*;
import edu.smartstudy.quiz.*;
import edu.smartstudy.user.UserRepository;
import java.time.*;
import java.util.*;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/v1/progress", "/api/v1/analytics"})
public class ProgressController {

    private static final ZoneId DISPLAY_ZONE = ZoneId.of("Asia/Kolkata");

    private final UserRepository users;
    private final StudyTaskRepository tasks;
    private final FocusSessionRepository focus;
    private final QuizAttemptRepository attempts;
    private final QuizRepository quizzes;
    private final MaterialRepository materials;

    public ProgressController(
            UserRepository users,
            StudyTaskRepository tasks,
            FocusSessionRepository focus,
            QuizAttemptRepository attempts,
            QuizRepository quizzes,
            MaterialRepository materials) {
        this.users = users;
        this.tasks = tasks;
        this.focus = focus;
        this.attempts = attempts;
        this.quizzes = quizzes;
        this.materials = materials;
    }

    private Long owner(Authentication auth) {
        return users.findByEmailIgnoreCase(auth.getName()).orElseThrow().getId();
    }

    private <T> ResponseEntity<T> noStore(T body) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore().mustRevalidate())
                .header(HttpHeaders.PRAGMA, "no-cache")
                .header(HttpHeaders.EXPIRES, "0")
                .body(body);
    }

    @GetMapping({"/overview", "/summary"})
    public ResponseEntity<Map<String, Object>> overview(Authentication auth) {
        Long id = owner(auth);
        long totalTasks = tasks.countByStudentId(id);
        long done = tasks.countByStudentIdAndStatus(id, "COMPLETED");
        long pending = tasks.countByStudentIdAndStatus(id, "PENDING");

        List<QuizAttempt> history = attempts.findTop100ByStudentIdOrderBySubmittedAtDesc(id);
        int totalScored = history.stream().mapToInt(QuizAttempt::getScore).sum();
        int totalQuestions = history.stream().mapToInt(QuizAttempt::getTotalQuestions).sum();

        long verifiedSecs = focus.totalSeconds(id);

        // Real-time active / ongoing focus session
        Optional<FocusSession> activeSess = focus.findFirstByStudentIdAndStatusInOrderByStartedAtDesc(id, List.of("ACTIVE", "PAUSED"));
        boolean isFocusingNow = false;
        long activeSessionSeconds = 0;
        String activeStatus = "NONE";
        Long activeId = null;

        if (activeSess.isPresent()) {
            FocusSession s = activeSess.get();
            activeId = s.getId();
            activeStatus = s.getStatus();
            long ongoingSecs = s.getDurationSeconds();
            if ("ACTIVE".equals(s.getStatus()) && s.getActiveSince() != null) {
                long elapsed = Math.max(0, Duration.between(s.getActiveSince(), Instant.now()).getSeconds());
                ongoingSecs += Math.min(elapsed, 14400); // 4-hour safety cap
                isFocusingNow = true;
            }
            activeSessionSeconds = ongoingSecs;
        }

        long totalStudySeconds = verifiedSecs + activeSessionSeconds;
        long totalStudyMinutes = totalStudySeconds > 0 && totalStudySeconds < 60 ? 1 : (totalStudySeconds / 60);
        long verifiedStudyMinutes = verifiedSecs > 0 && verifiedSecs < 60 ? 1 : (verifiedSecs / 60);

        // Calculate 7-day activity days in Asia/Kolkata
        LocalDate today = LocalDate.now(DISPLAY_ZONE);
        Instant sevenDaysAgo = today.minusDays(6).atStartOfDay(DISPLAY_ZONE).toInstant();

        Set<LocalDate> activeDays = new HashSet<>();
        for (FocusSession s : focus.findByStudentIdAndStartedAtGreaterThanEqualOrderByStartedAtAsc(id, sevenDaysAgo)) {
            if ("COMPLETED".equals(s.getStatus()) && s.getStartedAt() != null) {
                activeDays.add(s.getStartedAt().atZone(DISPLAY_ZONE).toLocalDate());
            }
        }
        if (isFocusingNow || activeSessionSeconds > 0) {
            activeDays.add(today);
        }
        for (StudyTask t : tasks.findTop100ByStudentIdOrderByScheduledDateAscCreatedAtDesc(id)) {
            if (t.getCompletedAt() != null && !t.getCompletedAt().isBefore(sevenDaysAgo)) {
                activeDays.add(t.getCompletedAt().atZone(DISPLAY_ZONE).toLocalDate());
            }
        }
        for (QuizAttempt qa : history) {
            if (qa.getSubmittedAt() != null && !qa.getSubmittedAt().isBefore(sevenDaysAgo)) {
                activeDays.add(qa.getSubmittedAt().atZone(DISPLAY_ZONE).toLocalDate());
            }
        }

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("totalStudyMinutes", totalStudyMinutes);
        res.put("totalStudySeconds", totalStudySeconds);
        res.put("verifiedStudyMinutes", verifiedStudyMinutes);
        res.put("verifiedStudySeconds", verifiedSecs);
        res.put("isFocusingNow", isFocusingNow);
        res.put("activeSessionSeconds", activeSessionSeconds);
        res.put("activeSessionStatus", activeStatus);
        res.put("activeSessionId", activeId != null ? activeId : 0L);
        res.put("completedTasks", done);
        res.put("totalTasks", totalTasks);
        res.put("pendingTasks", pending);
        res.put("taskCompletionPercent", totalTasks == 0 ? 0 : Math.round(100.0 * done / totalTasks));
        res.put("quizAttempts", history.size());
        res.put("totalQuestionsAnswered", totalQuestions);
        res.put("totalCorrectAnswers", totalScored);
        res.put("quizAccuracyPercent", totalQuestions == 0 ? 0 : Math.round(100.0 * totalScored / totalQuestions));
        res.put("activePracticeDays", Math.min(7, activeDays.size()));
        res.put("serverTime", Instant.now().toString());
        res.put("timezone", DISPLAY_ZONE.getId());

        return noStore(res);
    }

    @GetMapping("/trends")
    public ResponseEntity<Map<String, Object>> trends(Authentication auth) {
        Long id = owner(auth);
        LocalDate today = LocalDate.now(DISPLAY_ZONE);
        Instant from = today.minusDays(6).atStartOfDay(DISPLAY_ZONE).toInstant();

        // Check for active ongoing session
        Optional<FocusSession> activeSess = focus.findFirstByStudentIdAndStatusInOrderByStartedAtDesc(id, List.of("ACTIVE", "PAUSED"));
        long liveElapsedSecs = 0;
        if (activeSess.isPresent() && "ACTIVE".equals(activeSess.get().getStatus()) && activeSess.get().getActiveSince() != null) {
            long elapsed = Math.max(0, Duration.between(activeSess.get().getActiveSince(), Instant.now()).getSeconds());
            liveElapsedSecs = activeSess.get().getDurationSeconds() + Math.min(elapsed, 14400);
        } else if (activeSess.isPresent()) {
            liveElapsedSecs = activeSess.get().getDurationSeconds();
        }

        Map<LocalDate, Long> dayCompletedSeconds = new TreeMap<>();
        for (int i = 0; i < 7; i++) {
            dayCompletedSeconds.put(today.minusDays(6 - i), 0L);
        }

        for (FocusSession s : focus.findByStudentIdAndStartedAtGreaterThanEqualOrderByStartedAtAsc(id, from)) {
            if ("COMPLETED".equals(s.getStatus()) && s.getStartedAt() != null) {
                LocalDate day = s.getStartedAt().atZone(DISPLAY_ZONE).toLocalDate();
                long duration = s.getDurationSeconds();
                dayCompletedSeconds.computeIfPresent(day, (k, v) -> v + duration);
            }
        }

        Map<LocalDate, Long> dayTasks = new TreeMap<>();
        Map<LocalDate, Long> dayQuizScores = new TreeMap<>();
        Map<LocalDate, Long> dayQuizTotals = new TreeMap<>();
        Map<LocalDate, Long> dayQuizAttempts = new TreeMap<>();

        for (int i = 0; i < 7; i++) {
            LocalDate date = today.minusDays(6 - i);
            dayTasks.put(date, 0L);
            dayQuizScores.put(date, 0L);
            dayQuizTotals.put(date, 0L);
            dayQuizAttempts.put(date, 0L);
        }

        for (StudyTask task : tasks.findTop100ByStudentIdOrderByScheduledDateAscCreatedAtDesc(id)) {
            if (task.getCompletedAt() != null && !task.getCompletedAt().isBefore(from)) {
                LocalDate day = task.getCompletedAt().atZone(DISPLAY_ZONE).toLocalDate();
                dayTasks.computeIfPresent(day, (k, v) -> v + 1);
            }
        }

        for (QuizAttempt attempt : attempts.findTop100ByStudentIdOrderBySubmittedAtDesc(id)) {
            if (attempt.getSubmittedAt() != null && !attempt.getSubmittedAt().isBefore(from)) {
                LocalDate day = attempt.getSubmittedAt().atZone(DISPLAY_ZONE).toLocalDate();
                dayQuizScores.computeIfPresent(day, (k, v) -> v + attempt.getScore());
                dayQuizTotals.computeIfPresent(day, (k, v) -> v + attempt.getTotalQuestions());
                dayQuizAttempts.computeIfPresent(day, (k, v) -> v + 1);
            }
        }

        List<Map<String, Object>> studyMinutesList = new ArrayList<>();
        List<Map<String, Object>> taskCompletionsList = new ArrayList<>();
        List<Map<String, Object>> quizAccuracyList = new ArrayList<>();
        List<Map<String, Object>> dailyBreakdownList = new ArrayList<>();

        long totalWeekCompletedSeconds = 0;

        for (LocalDate date : dayCompletedSeconds.keySet()) {
            boolean isToday = date.equals(today);
            long verifiedSecs = dayCompletedSeconds.get(date);
            totalWeekCompletedSeconds += verifiedSecs;

            long effectiveSecs = verifiedSecs + (isToday ? liveElapsedSecs : 0L);
            long effectiveMins = effectiveSecs > 0 && effectiveSecs < 60 ? 1L : (effectiveSecs / 60);

            Map<String, Object> sm = new LinkedHashMap<>();
            sm.put("date", date.toString());
            sm.put("minutes", effectiveMins);
            sm.put("seconds", effectiveSecs);
            sm.put("verifiedSeconds", verifiedSecs);
            sm.put("liveSeconds", isToday ? liveElapsedSecs : 0L);
            studyMinutesList.add(sm);

            long completedCount = dayTasks.get(date);
            taskCompletionsList.add(Map.of("date", date.toString(), "completed", completedCount));

            long qTotal = dayQuizTotals.get(date);
            long qScore = dayQuizScores.get(date);
            long qAttempts = dayQuizAttempts.get(date);

            Map<String, Object> qa = new LinkedHashMap<>();
            qa.put("date", date.toString());
            if (qTotal > 0) {
                qa.put("percent", Math.round(100.0 * qScore / qTotal));
                qa.put("questions", qTotal);
            }
            quizAccuracyList.add(qa);

            Map<String, Object> daily = new LinkedHashMap<>();
            daily.put("date", date.toString());
            daily.put("dayName", date.getDayOfWeek().toString());
            daily.put("focusMinutes", effectiveMins);
            daily.put("verifiedMinutes", verifiedSecs / 60);
            daily.put("liveSeconds", isToday ? liveElapsedSecs : 0L);
            daily.put("completedTasks", completedCount);
            daily.put("quizzesTaken", qAttempts);
            daily.put("quizAccuracy", qTotal > 0 ? Math.round(100.0 * qScore / qTotal) : null);
            daily.put("hasActivity", effectiveSecs > 0 || completedCount > 0 || qAttempts > 0);
            dailyBreakdownList.add(daily);
        }

        long totalWeekSeconds = totalWeekCompletedSeconds + liveElapsedSecs;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("studyMinutes", studyMinutesList);
        result.put("taskCompletions", taskCompletionsList);
        result.put("quizAccuracy", quizAccuracyList);
        result.put("dailyBreakdown", dailyBreakdownList);
        result.put("weekTotalSeconds", totalWeekSeconds);
        result.put("weekTotalMinutes", totalWeekSeconds / 60);
        result.put("weekVerifiedSeconds", totalWeekCompletedSeconds);
        result.put("serverTime", Instant.now().toString());

        return noStore(result);
    }

    @GetMapping({"/topic-mastery", "/topics"})
    public ResponseEntity<List<Map<String, Object>>> topicMastery(Authentication auth) {
        Long id = owner(auth);
        List<Quiz> userQuizzes = quizzes.findTop100ByOwnerIdOrderByCreatedAtDesc(id);
        List<QuizAttempt> userAttempts = attempts.findTop100ByStudentIdOrderBySubmittedAtDesc(id);

        // Preload materials for categorization
        Map<Long, Material> matMap = new HashMap<>();
        for (Quiz q : userQuizzes) {
            if (q.getMaterialId() != null && q.getMaterialId() > 0 && !matMap.containsKey(q.getMaterialId())) {
                materials.findByIdAndOwnerId(q.getMaterialId(), id).ifPresent(m -> matMap.put(q.getMaterialId(), m));
            }
        }

        // Group attempts by quiz
        Map<Long, List<QuizAttempt>> attemptsByQuiz = new HashMap<>();
        for (QuizAttempt att : userAttempts) {
            attemptsByQuiz.computeIfAbsent(att.getQuizId(), k -> new ArrayList<>()).add(att);
        }

        // Aggregate by normalized topic name
        Map<String, TopicStats> topicAgg = new LinkedHashMap<>();

        for (Quiz q : userQuizzes) {
            String topicName = q.getTitle().replaceFirst("(?i)^Quiz\\s+on\\s+", "").replaceFirst("(?i)^Practice:\\s*", "").trim();
            if (topicName.isBlank()) topicName = "Core Concepts";

            Material m = matMap.get(q.getMaterialId());
            boolean isWebMaterial = m != null && (
                    (m.getStorageKey() != null && m.getStorageKey().startsWith("web-")) ||
                    (m.getExtractedText() != null && m.getExtractedText().startsWith("Live web research quiz on:")));

            boolean hasTavilyQuestions = q.getQuestionsJson() != null && (
                    q.getQuestionsJson().contains("\"provider\":\"tavily\"") ||
                    q.getQuestionsJson().contains("\"provider\": \"tavily\"") ||
                    q.getQuestionsJson().contains("\"source_url\""));

            // Check known pop culture / non-academic keywords and external topics
            String lowerTopic = topicName.toLowerCase();
            boolean isKnownAcademicSubject = lowerTopic.contains("data structure") ||
                    lowerTopic.contains("algorithm") ||
                    lowerTopic.contains("operating system") ||
                    lowerTopic.contains("synchronization") ||
                    lowerTopic.contains("mutex") ||
                    lowerTopic.contains("semaphore") ||
                    lowerTopic.contains("database") ||
                    lowerTopic.contains("sql") ||
                    lowerTopic.contains("normalization") ||
                    lowerTopic.contains("network") ||
                    lowerTopic.contains("tcp") ||
                    lowerTopic.contains("biology") ||
                    lowerTopic.contains("cellular") ||
                    lowerTopic.contains("respiration") ||
                    lowerTopic.contains("microprocessor") ||
                    lowerTopic.contains("architecture") ||
                    lowerTopic.contains("compiler") ||
                    lowerTopic.contains("automata") ||
                    lowerTopic.contains("tree") ||
                    lowerTopic.contains("graph") ||
                    lowerTopic.contains("math") ||
                    lowerTopic.contains("calculus") ||
                    lowerTopic.contains("linear algebra") ||
                    lowerTopic.contains("virtualization") ||
                    lowerTopic.contains("cloud");

            boolean isPopCulture = lowerTopic.contains("samay raina") ||
                    lowerTopic.contains("wwe") ||
                    lowerTopic.contains("celebrity") ||
                    lowerTopic.contains("entertainment") ||
                    lowerTopic.contains("cricket") ||
                    lowerTopic.contains("football") ||
                    lowerTopic.contains("marvel") ||
                    lowerTopic.contains("movie") ||
                    lowerTopic.contains("karan aujla") ||
                    lowerTopic.contains("paul walker") ||
                    lowerTopic.contains("goldberg") ||
                    lowerTopic.contains("roman reigns") ||
                    lowerTopic.contains("gadag") ||
                    lowerTopic.contains("hubli") ||
                    lowerTopic.contains("karnataka") ||
                    lowerTopic.contains("singer") ||
                    lowerTopic.contains("actor") ||
                    lowerTopic.contains("music") ||
                    lowerTopic.contains("song");

            boolean isUploadedAcademicDoc = m != null &&
                    m.getFileName() != null &&
                    (m.getFileName().endsWith(".pdf") || m.getFileName().endsWith(".docx") || m.getFileName().endsWith(".pptx")) &&
                    !isWebMaterial;

            final boolean finalIsAcademic = (isUploadedAcademicDoc || isKnownAcademicSubject) && !isPopCulture && !isWebMaterial && !hasTavilyQuestions;
            final String finalCategory = finalIsAcademic ? "ACADEMIC_VTU" : "GENERAL_RESEARCH";

            TopicStats stats = topicAgg.computeIfAbsent(topicName, k -> new TopicStats(k, finalIsAcademic, finalCategory));

            List<QuizAttempt> quizAtts = attemptsByQuiz.getOrDefault(q.getId(), Collections.emptyList());
            for (QuizAttempt att : quizAtts) {
                stats.totalCorrect += att.getScore();
                stats.totalQuestions += att.getTotalQuestions();
                stats.attemptsCount++;
                if (stats.lastPracticed == null || (att.getSubmittedAt() != null && att.getSubmittedAt().isAfter(stats.lastPracticed))) {
                    stats.lastPracticed = att.getSubmittedAt();
                }
            }
        }

        List<Map<String, Object>> response = new ArrayList<>();
        for (TopicStats ts : topicAgg.values()) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("topic", ts.name);
            map.put("isAcademic", ts.isAcademic);
            map.put("category", ts.category);
            map.put("attempts", ts.attemptsCount);
            map.put("totalQuestions", ts.totalQuestions);
            map.put("totalCorrect", ts.totalCorrect);

            if (ts.totalQuestions > 0) {
                int accuracy = Math.round(100.0f * ts.totalCorrect / ts.totalQuestions);
                map.put("averageScore", accuracy);

                // Confidence threshold: at least 2 attempts required for verified mastery status
                if (ts.attemptsCount < 2) {
                    map.put("status", "INSUFFICIENT_DATA");
                    map.put("statusLabel", "Insufficient Data (1 Attempt)");
                } else if (accuracy >= 80) {
                    map.put("status", "MASTERED");
                    map.put("statusLabel", "Mastered");
                } else if (accuracy >= 60) {
                    map.put("status", "PRACTICING");
                    map.put("statusLabel", "Practicing");
                } else {
                    map.put("status", "NEEDS_REVIEW");
                    map.put("statusLabel", "Needs Review");
                }
            } else {
                map.put("averageScore", null);
                map.put("status", "NOT_ATTEMPTED");
                map.put("statusLabel", "Not Attempted");
            }
            map.put("lastPracticed", ts.lastPracticed != null ? ts.lastPracticed.toString() : null);
            response.add(map);
        }

        // Sort: Academic topics first, then by attempts desc, then accuracy
        response.sort((a, b) -> {
            boolean aAcad = Boolean.TRUE.equals(a.get("isAcademic"));
            boolean bAcad = Boolean.TRUE.equals(b.get("isAcademic"));
            if (aAcad != bAcad) return aAcad ? -1 : 1;
            int aAtt = (int) a.get("attempts");
            int bAtt = (int) b.get("attempts");
            return Integer.compare(bAtt, aAtt);
        });

        return noStore(response);
    }

    private static class TopicStats {
        final String name;
        final boolean isAcademic;
        final String category;
        int totalCorrect = 0;
        int totalQuestions = 0;
        int attemptsCount = 0;
        Instant lastPracticed = null;

        TopicStats(String name, boolean isAcademic, String category) {
            this.name = name;
            this.isAcademic = isAcademic;
            this.category = category;
        }
    }
}
