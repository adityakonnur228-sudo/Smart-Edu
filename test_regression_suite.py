import requests
import json
import sys

BASE_URL = "http://localhost:8080/api/v1"
FRONTEND_URL = "http://localhost:3000"

def run_regression_tests():
    print("==================================================")
    print("RUNNING FULL SYSTEM REGRESSION TEST SUITE")
    print("==================================================")
    session = requests.Session()
    
    # 1. AUTH LOGIN
    print("\n[1] Testing Authentication...")
    login_resp = session.post(
        f"{BASE_URL}/auth/login",
        json={"email": "student@test.com", "password": "Password123!"},
        timeout=10
    )
    assert login_resp.status_code == 200, f"Login failed: {login_resp.status_code} {login_resp.text}"
    user_data = login_resp.json()
    print(f"    [PASS] Login successful: User ID {user_data.get('id')}, Name: {user_data.get('name')}, Role: {user_data.get('role')}")

    # Me check
    me_resp = session.get(f"{BASE_URL}/auth/me", timeout=5)
    assert me_resp.status_code == 200, f"Auth me failed: {me_resp.status_code}"
    print(f"    [PASS] Auth verification (/auth/me): OK")

    # 2. DASHBOARD / PROGRESS
    print("\n[2] Testing Dashboard & Progress...")
    prog_resp = session.get(f"{BASE_URL}/progress/summary", timeout=10)
    assert prog_resp.status_code == 200, f"Progress summary failed: {prog_resp.status_code}"
    print(f"    [PASS] Progress summary (/progress/summary): HTTP 200 - {prog_resp.json()}")

    # 3. QUIZZES
    print("\n[3] Testing Quizzes...")
    quiz_cfg = session.get(f"{BASE_URL}/quizzes/config", timeout=5)
    assert quiz_cfg.status_code == 200, f"Quiz config failed: {quiz_cfg.status_code}"
    print(f"    [PASS] Quiz config (/quizzes/config): HTTP 200 - Provider: {quiz_cfg.json().get('provider')}")

    quizzes_resp = session.get(f"{BASE_URL}/quizzes", timeout=10)
    assert quizzes_resp.status_code == 200, f"Quizzes list failed: {quizzes_resp.status_code}"
    quizzes = quizzes_resp.json()
    quiz_count = len(quizzes) if isinstance(quizzes, list) else 0
    print(f"    [PASS] Quizzes list (/quizzes): HTTP 200 - Found {quiz_count} quizzes")

    # 4. TASKS
    print("\n[4] Testing Study Tasks...")
    tasks_resp = session.get(f"{BASE_URL}/tasks", timeout=10)
    assert tasks_resp.status_code == 200, f"Tasks failed: {tasks_resp.status_code}"
    tasks = tasks_resp.json()
    task_count = len(tasks) if isinstance(tasks, list) else 0
    print(f"    [PASS] Study tasks (/tasks): HTTP 200 - Found {task_count} tasks")

    # 5. FOCUS SESSIONS
    print("\n[5] Testing Focus Sessions...")
    focus_resp = session.get(f"{BASE_URL}/focus/sessions", timeout=10)
    assert focus_resp.status_code == 200, f"Focus sessions failed: {focus_resp.status_code}"
    print(f"    [PASS] Focus sessions (/focus/sessions): HTTP 200 - Found {len(focus_resp.json())} sessions")

    # 6. MATERIALS
    print("\n[6] Testing Materials...")
    mat_resp = session.get(f"{BASE_URL}/materials", timeout=10)
    assert mat_resp.status_code == 200, f"Materials failed: {mat_resp.status_code}"
    materials = mat_resp.json()
    print(f"    [PASS] Materials (/materials): HTTP 200 - Found {len(materials)} materials")

    # 7. AI TUTOR (LOCAL OLLAMA INFERENCE)
    print("\n[7] Testing AI Tutor Local Inference...")
    tutor_payload = {
        "question": "What is virtual memory in operating systems?",
        "materialIds": []
    }
    tutor_resp = session.post(f"{BASE_URL}/tutor/ask", json=tutor_payload, timeout=60)
    assert tutor_resp.status_code == 200, f"Tutor ask failed: {tutor_resp.status_code} {tutor_resp.text}"
    tutor_data = tutor_resp.json()
    print(f"    [PASS] AI Tutor (/tutor/ask): HTTP 200")
    print(f"           Model: {tutor_data.get('model')}, Provider: {tutor_data.get('provider')}")
    print(f"           Response preview: {tutor_data.get('answer', '')[:120]}...")

    # 8. FRONTEND ENDPOINTS
    print("\n[8] Testing Next.js Frontend Routes...")
    routes = ["/", "/dashboard", "/quizzes", "/tasks", "/focus", "/analytics", "/ai-tutor"]
    for r in routes:
        f_resp = requests.get(f"{FRONTEND_URL}{r}", timeout=10)
        assert f_resp.status_code == 200, f"Route {r} failed with {f_resp.status_code}"
        print(f"    [PASS] Route {r:15} -> HTTP 200")

    print("\n==================================================")
    print("ALL MODULES REGRESSION-TESTED AND FUNCTIONAL!")
    print("==================================================")

if __name__ == "__main__":
    try:
        run_regression_tests()
    except Exception as e:
        print(f"\n[FAIL] Regression test error: {e}")
        sys.exit(1)

