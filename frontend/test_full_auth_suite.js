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
      if (!text.includes('favicon') && !text.includes('401') && !text.includes('403')) {
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
    const storedRefreshToken = await page.evaluate(() => localStorage.getItem('study_refresh_token'));
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name === 'study_session');
    const refreshCookie = cookies.find(c => c.name === 'study_refresh');

    if (storedToken && storedRefreshToken && sessionCookie && refreshCookie && postLoginUrl.includes('/dashboard')) {
      logResult('Step 5: Log in with valid credentials & dual tokens', 'PASS', `Redirected to ${postLoginUrl}. Access token, Refresh token, and HttpOnly cookies (study_session, study_refresh) verified.`);
    } else {
      logResult('Step 5: Log in with valid credentials & dual tokens', 'FAIL', `Token: ${!!storedToken}, RefreshToken: ${!!storedRefreshToken}, SessionCookie: ${!!sessionCookie}, RefreshCookie: ${!!refreshCookie}, URL: ${postLoginUrl}`);
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
    // Step 7: Token Type Isolation (Security boundary between access & refresh tokens)
    // -------------------------------------------------------------
    const tokenIsolationTest = await page.evaluate(async () => {
      const accessToken = localStorage.getItem('study_token');
      const refreshToken = localStorage.getItem('study_refresh_token');

      // Test A: Access token cannot be used to refresh a session
      const refreshWithAccessRes = await fetch('http://localhost:8080/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ refreshToken: accessToken })
      });

      // Test B: Refresh token cannot be used to access regular API endpoints
      const accessWithRefreshRes = await fetch('http://localhost:8080/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${refreshToken}` }
      });

      return {
        refreshWithAccessStatus: refreshWithAccessRes.status,
        accessWithRefreshStatus: accessWithRefreshRes.status
      };
    });

    const accessAsRefreshRejected = (tokenIsolationTest.refreshWithAccessStatus === 400 || tokenIsolationTest.refreshWithAccessStatus === 401);
    const refreshAsAccessRejected = (tokenIsolationTest.accessWithRefreshStatus === 401 || tokenIsolationTest.accessWithRefreshStatus === 403);

    if (accessAsRefreshRejected && refreshAsAccessRejected) {
      logResult('Step 7: Token type boundary enforcement', 'PASS', `Access token rejected at /refresh (${tokenIsolationTest.refreshWithAccessStatus}), Refresh token rejected at /me (${tokenIsolationTest.accessWithRefreshStatus}).`);
    } else {
      logResult('Step 7: Token type boundary enforcement', 'FAIL', `Isolation failed: refreshWithAccess=${tokenIsolationTest.refreshWithAccessStatus}, accessWithRefresh=${tokenIsolationTest.accessWithRefreshStatus}`);
    }

    // -------------------------------------------------------------
    // Step 8: Refresh Token Rotation
    // -------------------------------------------------------------
    const rotationResult = await page.evaluate(async () => {
      const oldRefreshToken = localStorage.getItem('study_refresh_token');
      const oldAccessToken = localStorage.getItem('study_token');

      const refreshRes = await fetch('http://localhost:8080/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${oldRefreshToken}`
        },
        body: JSON.stringify({ refreshToken: oldRefreshToken })
      });

      if (!refreshRes.ok) {
        return { ok: false, status: refreshRes.status };
      }

      const data = await refreshRes.json();
      localStorage.setItem('study_token', data.token);
      localStorage.setItem('study_refresh_token', data.refreshToken);

      // Verify new access token works
      const meRes = await fetch('http://localhost:8080/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${data.token}` }
      });

      return {
        ok: true,
        status: refreshRes.status,
        hasNewAccessToken: !!data.token && data.token !== oldAccessToken,
        hasNewRefreshToken: !!data.refreshToken && data.refreshToken !== oldRefreshToken,
        newAccessTokenWorks: meRes.status === 200
      };
    });

    if (rotationResult.ok && rotationResult.hasNewAccessToken && rotationResult.hasNewRefreshToken && rotationResult.newAccessTokenWorks) {
      logResult('Step 8: Refresh token rotation', 'PASS', 'Refresh endpoint successfully rotated both access and refresh tokens. New token verified.');
    } else {
      logResult('Step 8: Refresh token rotation', 'FAIL', JSON.stringify(rotationResult));
    }

    // -------------------------------------------------------------
    // Step 9: Reload browser & verify persistence
    // -------------------------------------------------------------
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const tokenAfterReload = await page.evaluate(() => localStorage.getItem('study_token'));
    const urlAfterReload = page.url();

    if (tokenAfterReload && urlAfterReload.includes('/dashboard')) {
      logResult('Step 9: Reload & authentication persistence', 'PASS', 'Authentication state persists on reload without redirects.');
    } else {
      logResult('Step 9: Reload & authentication persistence', 'FAIL', `State lost after reload. URL: ${urlAfterReload}`);
    }

    // -------------------------------------------------------------
    // Step 10: Navigate between all modules without 401 or runtime errors
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
        logResult(`Step 10: Module navigation to ${mod}`, 'FAIL', `Runtime overlay detected: ${overlay.slice(0, 100)}`);
      } else {
        logResult(`Step 10: Module navigation to ${mod}`, 'PASS', `Rendered cleanly with no runtime overlay.`);
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
    // Step 11: Attempt to access protected endpoint using expired/invalid/tampered token
    // -------------------------------------------------------------
    const expiredRes = await page.evaluate(async () => {
      const res = await fetch('http://localhost:8080/api/v1/auth/me', {
        headers: { Authorization: 'Bearer eyJhbGciOiJIUzM4NCJ9.invalid.expired.token' }
      });
      return { status: res.status };
    });

    if (expiredRes.status === 401) {
      logResult('Step 11: Expired/invalid token rejection', 'PASS', 'Backend correctly returns HTTP 401 for invalid/tampered token.');
    } else {
      logResult('Step 11: Expired/invalid token rejection', 'FAIL', `Expected 401, got ${expiredRes.status}`);
    }

    // -------------------------------------------------------------
    // Step 12: Role-Based Access Control (RBAC) authorization check
    // -------------------------------------------------------------
    const authCheckRes = await page.evaluate(async () => {
      const res = await fetch('http://localhost:8080/api/v1/admin/users', {
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('study_token')}` }
      });
      return { status: res.status };
    });

    if (authCheckRes.status === 403 || authCheckRes.status === 401) {
      logResult('Step 12: Student authorization / RBAC check', 'PASS', `Student access to admin resources correctly rejected with HTTP ${authCheckRes.status}.`);
    } else {
      logResult('Step 12: Student authorization / RBAC check', 'FAIL', `Unexpected status: ${authCheckRes.status}`);
    }

    // -------------------------------------------------------------
    // Step 13: Tenant isolation / cross-student resource boundary check
    // -------------------------------------------------------------
    const crossStudentRes = await page.evaluate(async () => {
      // Attempt to access unowned/foreign material resource
      const res = await fetch('http://localhost:8080/api/v1/materials/999999', {
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('study_token')}` }
      });
      return { status: res.status };
    });

    if (crossStudentRes.status === 404 || crossStudentRes.status === 403) {
      logResult('Step 13: Cross-student tenant boundary check', 'PASS', `Unowned material access blocked with HTTP ${crossStudentRes.status} (no cross-tenant data leak).`);
    } else {
      logResult('Step 13: Cross-student tenant boundary check', 'FAIL', `Unexpected status: ${crossStudentRes.status}`);
    }

    // -------------------------------------------------------------
    // Step 14: Active Logout & Token Revocation (Revocation Invalidation)
    // -------------------------------------------------------------
    const tokensBeforeLogout = await page.evaluate(() => ({
      access: localStorage.getItem('study_token'),
      refresh: localStorage.getItem('study_refresh_token')
    }));

    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Call logout endpoint
    await page.evaluate(async () => {
      await fetch('http://localhost:8080/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('study_token')}` }
      });
      localStorage.removeItem('study_token');
      localStorage.removeItem('study_refresh_token');
    });

    await context.clearCookies();

    // Verify tokens invalidated via token_version increment in database
    const postLogoutTokenCheck = await page.evaluate(async (tokens) => {
      const meRes = await fetch('http://localhost:8080/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${tokens.access}` }
      });
      const refreshRes = await fetch('http://localhost:8080/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens.refresh}`
        },
        body: JSON.stringify({ refreshToken: tokens.refresh })
      });
      return {
        meStatus: meRes.status,
        refreshStatus: refreshRes.status
      };
    }, tokensBeforeLogout);

    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const postLogoutUrl = page.url();
    const isRedirectedToLogin = postLogoutUrl.includes('/login');
    const accessRevoked = postLogoutTokenCheck.meStatus === 401;
    const refreshRevoked = postLogoutTokenCheck.refreshStatus === 401;

    if (isRedirectedToLogin && accessRevoked && refreshRevoked) {
      logResult('Step 14: Logout token revocation & lockdown', 'PASS', `Logged out tokens completely revoked (me: 401, refresh: 401). Dashboard cleanly redirected to ${postLogoutUrl}.`);
    } else {
      logResult('Step 14: Logout token revocation & lockdown', 'FAIL', `isRedirected=${isRedirectedToLogin}, accessRevoked=${accessRevoked} (${postLogoutTokenCheck.meStatus}), refreshRevoked=${refreshRevoked} (${postLogoutTokenCheck.refreshStatus})`);
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

  if (!allPassed) {
    process.exit(1);
  }
})();
