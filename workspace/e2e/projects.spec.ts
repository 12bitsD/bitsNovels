import { test, expect } from '@playwright/test';

test.describe('US-1.2 Project List & Dashboard', () => {
  test('dashboard renders after login with empty state', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/邮箱/i).fill('test@test.com');
    await page.getByLabel(/密码/i).fill('Test123');
    await page.getByRole('button', { name: /登录/i }).click();
    
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByText(/开始您的第一部作品/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /新建项目/i })).toBeVisible();
  });

  test('empty state shows start writing message', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/邮箱/i).fill('test@test.com');
    await page.getByLabel(/密码/i).fill('Test123');
    await page.getByRole('button', { name: /登录/i }).click();
    
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByText(/开始您的第一部作品/i)).toBeVisible();
    await expect(page.getByText(/新建项目/i)).toBeVisible();
  });
});

test.describe('US-1.3 Create Project', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/邮箱/i).fill('test@test.com');
    await page.getByLabel(/密码/i).fill('Test123');
    await page.getByRole('button', { name: /登录/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
  });

  test('opens create project modal', async ({ page }) => {
    await page.getByRole('link', { name: /新建项目/i }).click();
    await expect(page.getByText(/基本信息/i)).toBeVisible();
    await expect(page.getByLabel(/项目名称/i)).toBeVisible();
  });

  test('validates empty project name', async ({ page }) => {
    await page.getByRole('link', { name: /新建项目/i }).click();
    await page.getByRole('button', { name: /下一步/i }).click();
    await expect(page.getByText(/项目名称不能为空/i)).toBeVisible();
  });

  test('validates project name max length', async ({ page }) => {
    await page.getByRole('link', { name: /新建项目/i }).click();
    await page.getByLabel(/项目名称/i).fill('a'.repeat(51));
    await page.getByRole('button', { name: /下一步/i }).click();
    await expect(page.getByText(/不能超过 50 个字符/i)).toBeVisible();
  });

  test('navigates through all steps', async ({ page }) => {
    await page.getByRole('link', { name: /新建项目/i }).click();
    
    await expect(page.getByText(/基本信息/i)).toBeVisible();
    await page.getByLabel(/项目名称/i).fill('My Novel');
    await page.getByRole('button', { name: /下一步/i }).click();
    
    await expect(page.getByText(/项目结构/i)).toBeVisible();
    await page.getByRole('button', { name: /下一步/i }).click();
    
    await expect(page.getByText(/知识库初始化/i)).toBeVisible();
  });

  test('can go back from step 2 to step 1', async ({ page }) => {
    await page.getByRole('link', { name: /新建项目/i }).click();
    await page.getByLabel(/项目名称/i).fill('My Novel');
    await page.getByRole('button', { name: /下一步/i }).click();
    
    await expect(page.getByText(/项目结构/i)).toBeVisible();
    await page.getByRole('button', { name: /返回上一步/i }).click();
    await expect(page.getByText(/基本信息/i)).toBeVisible();
  });
});
