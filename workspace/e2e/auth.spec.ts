import { test, expect } from '@playwright/test';
import { createUserViaApi, loginThroughUi } from './helpers';

test.describe('US-1.1 Authentication', () => {
  test('register page renders correctly', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /创建账号/i })).toBeVisible();
    await expect(page.getByLabel(/邮箱/i)).toBeVisible();
    await expect(page.getByLabel(/^密码/i)).toBeVisible();
    await expect(page.getByLabel(/确认密码/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /注册/i })).toBeVisible();
  });

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /欢迎回来/i })).toBeVisible();
    await expect(page.getByLabel(/邮箱/i)).toBeVisible();
    await expect(page.getByLabel(/密码/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /登录/i })).toBeVisible();
  });

  test('register flow returns success from the real backend', async ({ page }) => {
    const timestamp = Date.now();
    const email = `e2e${timestamp}@test.com`;

    await page.goto('/register');
    await page.getByLabel(/邮箱/i).fill(email);
    await page.getByLabel(/^密码/i).fill('StrongPass123');
    await page.getByLabel(/确认密码/i).fill('StrongPass123');

    const registerResponsePromise = page.waitForResponse((response) =>
      new URL(response.url()).pathname === '/api/auth/register'
      && response.request().method() === 'POST',
    );

    await page.getByRole('button', { name: /注册/i }).click();

    const registerResponse = await registerResponsePromise;
    expect(registerResponse.ok(), `POST /api/auth/register returned ${registerResponse.status()}`).toBeTruthy();
    await expect(page.getByText(/请查收您的验证邮件以激活账号/i)).toBeVisible({ timeout: 10000 });
  });

  test('login flow reaches dashboard with backend session', async ({ page, request }) => {
    const credentials = await createUserViaApi(request);
    const { token } = await loginThroughUi(page, credentials);

    expect(token).toBeTruthy();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('navigates from login to register via link', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /去注册/i }).click();
    await expect(page).toHaveURL(/\/register/);
    await expect(page.getByRole('heading', { name: /创建账号/i })).toBeVisible();
  });

  test('navigates from register to login via link', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('link', { name: /去登录/i }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: /欢迎回来/i })).toBeVisible();
  });

  test('register shows error on password mismatch', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel(/邮箱/i).fill('mismatch@test.com');
    await page.getByLabel(/^密码/i).fill('StrongPass123');
    await page.getByLabel(/确认密码/i).fill('DifferentPass456');
    await page.getByRole('button', { name: /注册/i }).click();

    await expect(page.getByText(/密码不一致/i)).toBeVisible();
  });
});
