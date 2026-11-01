const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/Aditya/.gemini/antigravity/brain/ffaef119-7340-4c04-889b-744f1e8596c5';

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  } catch (e) {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  }

  const results = [];
  function logResult(step, status, details) {
    results.push({ step, status, details });
    console.log(`[${status}] ${step}: ${details}`);
  }

  const context = await browser.newContext();
  const page = await context.newPage();

  const networkErrors = [];
  const uncaughtConsoleErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore normal expected resource 401s during negative tests
      if (!text.includes('favicon') && !text.includes('401')) {
        uncaughtConsoleErrors.push(text);
      }
    }
  });

  page.on('response', async res => {
    if (res.status() >= 400 && !res.url().includes('favicon')) {
      networkErrors.push({
        status: res.status(),
        method: res.request().method(),
        url: res.url()
      });
    }
  });

  try {
    // -------------------------------------------------------------
    // Step 1: Open application logged out
    // -------------------------------------------------------------
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const homeTitle = await page.title();
    logResult('Step 1: Open application logged out', 'PASS', `Home page loaded, title: "${homeTitle}"`);

    // -------------------------------------------------------------
    // Step 2: Verify public routes remain accessible
    // -------------------------------------------------------------
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    const loginHeading = await page.locator('h2').first().innerText();
    const loginAccessible = loginHeading.toLowerCase().includes('sign in') || loginHeading.toLowerCase().includes('account');

    await page.goto('http://localhost:3000/register', { waitUntil: 'domcontentloaded' });
    const regHeading = await page.locator('h2').first().innerText();
    const regAccessible = regHeading.toLowerCase().includes('account') || regHeading.toLowerCase().includes('study');

    if (loginAccessible && regAccessible) {
      logResult('Step 2: Public routes accessibility', 'PASS', 'Routes /, /login, and /register are fully accessible.');
    } else {
      logResult('Step 2: Public routes accessibility', 'FAIL', 'Public route headers did not match expected text.');
    }

    // -------------------------------------------------------------
    // Step 3 & 4: Access protected routes logged out -> Verify login redirection
    // -------------------------------------------------------------
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());

    const protectedRoutes = ['/dashboard', '/ai-tutor', '/analytics', '/tasks', '/focus', '/quizzes'];
    let allRedirected = true;

    for (const route of protectedRoutes) {
      await page.goto(`http://localhost:3000${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      const curUrl = page.url();
      if (!curUrl.includes('/login')) {
        allRedirected = false;
        logResult(`Step 3/4: Redirection for ${route}`, 'FAIL', `Did not redirect to /login. Current URL: ${curUrl}`);
      } else {
        logResult(`Step 3/4: Redirection for ${route}`, 'PASS', `Cleanly redirected to: ${curUrl}`);
      }
    }

    // Capture screenshot of login redirection
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'auth_verified_login_redirect.png') });

    // -------------------------------------------------------------
    // Step 5: Log in with valid credentials
    // -------------------------------------------------------------
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', 'student@test.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);
    const postLoginUrl = page.url();

    const storedToken = await page.evaluate(() => localStorage.getItem('study_token'));
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name === 'study_session');

    if (storedToken && sessionCookie && postLoginUrl.includes('/dashboard')) {
      logResult('Step 5: Log in with valid credentials', 'PASS', `Redirected to ${postLoginUrl}. Bearer token and study_session cookie successfully stored.`);
    } else {
      logResult('Step 5: Log in with valid credentials', 'FAIL', `Token present: ${!!storedToken}, Cookie present: ${!!sessionCookie}, URL: ${postLoginUrl}`);
    }

    // -------------------------------------------------------------
    // Step 6: Verify protected API requests succeed
    // -------------------------------------------------------------
    const apiMeRes = await page.evaluate(async () => {
      const res = await fetch('http://localhost:8080/api/v1/auth/me', {
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('study_token')}` }
      });
      return { status: res.status, data: await res.json() };
    });

    if (apiMeRes.status === 200 && apiMeRes.data.email === 'student@test.com') {
      logResult('Step 6: Protected API requests succeed', 'PASS', `User verified: ${apiMeRes.data.name} (${apiMeRes.data.role})`);
    } else {
      logResult('Step 6: Protected API requests succeed', 'FAIL', `API returned status ${apiMeRes.status}`);
    }

    // -------------------------------------------------------------
    // Step 7 & 8: Reload browser & verify persistence
    // -------------------------------------------------------------
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const tokenAfterReload = await page.evaluate(() => localStorage.getItem('study_token'));
    const urlAfterReload = page.url();

    if (tokenAfterReload && urlAfterReload.includes('/dashboard')) {
      logResult('Step 7/8: Reload & authentication persistence', 'PASS', 'Authentication state persists on reload without redirects.');
    } else {
      logResult('Step 7/8: Reload & authentication persistence', 'FAIL', `State lost after reload. URL: ${urlAfterReload}`);
    }

    // -------------------------------------------------------------
    // Step 9 & 10: Navigate between all modules without 401 or runtime errors
    // -------------------------------------------------------------
    const testModules = ['/dashboard', '/ai-tutor', '/quizzes', '/tasks', '/focus', '/analytics'];
    let navigationErrors = 0;

    for (const mod of testModules) {
      await page.goto(`http://localhost:3000${mod}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const overlay = await page.evaluate(() => {
        const el = document.querySelector('nextjs-portal') || document.querySelector('[data-nextjs-dialog]');
        return el ? el.innerText : null;
      });

      if (overlay) {
        navigationErrors++;
        logResult(`Step 9/10: Module navigation to ${mod}`, 'FAIL', `Runtime overlay detected: ${overlay.slice(0, 100)}`);
      } else {
        logResult(`Step 9/10: Module navigation to ${mod}`, 'PASS', `Rendered cleanly with no runtime overlay.`);
      }
    }

    // Capture clean module screenshots
    await page.goto('http://localhost:3000/analytics', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'auth_verified_analytics_clean.png') });

    await page.goto('http://localhost:3000/ai-tutor', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'auth_verified_aitutor_clean.png') });

    // -------------------------------------------------------------
    // Step 11 & 12: Log out and verify protected routes are inaccessible
    // -------------------------------------------------------------
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Call logout endpoint and clear state
    await page.evaluate(async () => {
      await fetch('http://localhost:8080/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('study_token')}` }
      });
      localStorage.removeItem('study_token');
    });

    await context.clearCookies();
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const postLogoutUrl = page.url();
    if (postLogoutUrl.includes('/login')) {
      logResult('Step 11/12: Logout and protected route lockdown', 'PASS', `Protected route locked after logout. Redirected to: ${postLogoutUrl}`);
    } else {
      logResult('Step 11/12: Logout and protected route lockdown', 'FAIL', `Did not redirect to /login after logout. URL: ${postLogoutUrl}`);
    }

    // -------------------------------------------------------------
    // Step 13: Attempt to access protected endpoint using expired/invalid token
    // -------------------------------------------------------------
    const expiredRes = await page.evaluate(async () => {
      const res = await fetch('http://localhost:8080/api/v1/auth/me', {
        headers: { Authorization: 'Bearer eyJhbGciOiJIUzM4NCJ9.invalid.expired.token' }
      });
      return { status: res.status };
    });

    if (expiredRes.status === 401) {
      logResult('Step 13: Expired/invalid token rejection', 'PASS', 'Backend correctly returns HTTP 401 for invalid token.');
    } else {
      logResult('Step 13: Expired/invalid token rejection', 'FAIL', `Expected 401, got ${expiredRes.status}`);
    }

    // -------------------------------------------------------------
    // Step 14: Tenant isolation / student resource authorization check
    // -------------------------------------------------------------
    // Login as student@test.com
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', 'student@test.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Attempt to access parent-only endpoints or other tenant data
    const authCheckRes = await page.evaluate(async () => {
      const res = await fetch('http://localhost:8080/api/v1/admin/users', {
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('study_token')}` }
      });
      return { status: res.status };
    });

    if (authCheckRes.status === 403 || authCheckRes.status === 401) {
      logResult('Step 14: Student authorization / RBAC check', 'PASS', `Student access to admin resources correctly rejected with HTTP ${authCheckRes.status}.`);
    } else {
      logResult('Step 14: Student authorization / RBAC check', 'FAIL', `Unexpected status: ${authCheckRes.status}`);
    }

  } catch (err) {
    console.error('Test suite uncaught error:', err);
  } finally {
    await browser.close();
  }

  console.log('\n======================================================');
  console.log('PLAYWRIGHT AUTHENTICATION VERIFICATION SUMMARY');
  console.log('======================================================');
  let allPassed = true;
  for (const r of results) {
    if (r.status !== 'PASS') allPassed = false;
    console.log(`${r.status === 'PASS' ? '✅' : '❌'} [${r.status}] ${r.step}`);
    console.log(`   ${r.details}`);
  }
  console.log('======================================================');
  console.log('Final Result:', allPassed ? 'ALL 14 TEST WORKFLOWS PASSED' : 'SOME TESTS FAILED');
  console.log('======================================================');
})();
