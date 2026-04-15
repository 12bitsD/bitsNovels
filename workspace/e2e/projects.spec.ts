import { test, expect } from '@playwright/test';
import {
  createProjectViaApi,
  createUserViaApi,
  loginThroughUi,
  openProjectOutline,
  openProjectSettings,
} from './helpers';

async function createLoggedInUser(page: Parameters<typeof loginThroughUi>[0], request: Parameters<typeof createUserViaApi>[0]) {
  const credentials = await createUserViaApi(request);
  const auth = await loginThroughUi(page, credentials);
  return auth;
}

test.describe('US-1.2 Project List & Dashboard', () => {
  test('dashboard renders backend project list after login', async ({ page, request }) => {
    const { token } = await createLoggedInUser(page, request);
    const firstProjectName = `A-${Date.now()}`;
    const secondProjectName = `B-${Date.now()}`;
    await createProjectViaApi(request, token, firstProjectName);
    await createProjectViaApi(request, token, secondProjectName);

    const projectsResponsePromise = page.waitForResponse((response) =>
      new URL(response.url()).pathname === '/api/projects'
      && response.request().method() === 'GET',
    );

    await page.goto('/dashboard');

    const projectsResponse = await projectsResponsePromise;
    expect(projectsResponse.ok(), `GET /api/projects returned ${projectsResponse.status()}`).toBeTruthy();
    await expect(page.getByText(firstProjectName)).toBeVisible();
    await expect(page.getByText(secondProjectName)).toBeVisible();
    await expect(page.getByRole('link', { name: /新建项目/i })).toBeVisible();
  });

  test('dashboard can switch between card and list view with backend data', async ({ page, request }) => {
    const { token } = await createLoggedInUser(page, request);
    const projectName = `视图项目-${Date.now()}`;
    await createProjectViaApi(request, token, projectName);

    const projectsResponsePromise = page.waitForResponse((response) =>
      new URL(response.url()).pathname === '/api/projects'
      && response.request().method() === 'GET',
    );

    await page.goto('/dashboard');

    const projectsResponse = await projectsResponsePromise;
    expect(projectsResponse.ok(), `GET /api/projects returned ${projectsResponse.status()}`).toBeTruthy();

    await expect(page.getByTestId('card-view-container')).toBeVisible();
    await page.getByRole('button', { name: /列表视图/i }).click();
    await expect(page.getByTestId('list-view-container')).toBeVisible();
    await expect(page.getByText(projectName)).toBeVisible();
  });
});

test.describe('US-1.3 Create Project', () => {
  test('opens create project modal', async ({ page, request }) => {
    await createLoggedInUser(page, request);
    await page.getByRole('link', { name: /新建项目/i }).click();
    await expect(page.getByText(/基本信息/i)).toBeVisible();
    await expect(page.getByLabel(/项目名称/i)).toBeVisible();
  });

  test('validates empty project name', async ({ page, request }) => {
    await createLoggedInUser(page, request);
    await page.getByRole('link', { name: /新建项目/i }).click();
    await page.getByRole('button', { name: /下一步/i }).click();
    await expect(page.getByText(/项目名称不能为空/i)).toBeVisible();
  });

  test('validates project name max length', async ({ page, request }) => {
    await createLoggedInUser(page, request);
    await page.getByRole('link', { name: /新建项目/i }).click();
    await page.getByLabel(/项目名称/i).fill('a'.repeat(51));
    await page.getByRole('button', { name: /下一步/i }).click();
    await expect(page.getByText(/不能超过 50 个字符/i)).toBeVisible();
  });

  test('navigates through all steps', async ({ page, request }) => {
    await createLoggedInUser(page, request);
    await page.getByRole('link', { name: /新建项目/i }).click();

    await expect(page.getByText(/基本信息/i)).toBeVisible();
    await page.getByLabel(/项目名称/i).fill('My Novel');
    await page.getByRole('button', { name: /下一步/i }).click();

    await expect(page.getByText(/项目结构/i)).toBeVisible();
    await page.getByRole('button', { name: /下一步/i }).click();

    await expect(page.getByText(/知识库初始化/i)).toBeVisible();
  });

  test('can go back from step 2 to step 1', async ({ page, request }) => {
    await createLoggedInUser(page, request);
    await page.getByRole('link', { name: /新建项目/i }).click();
    await page.getByLabel(/项目名称/i).fill('My Novel');
    await page.getByRole('button', { name: /下一步/i }).click();

    await expect(page.getByText(/项目结构/i)).toBeVisible();
    await page.getByRole('button', { name: /返回上一步/i }).click();
    await expect(page.getByText(/基本信息/i)).toBeVisible();
  });

  test('creates project and persists it to the dashboard', async ({ page, request }) => {
    await createLoggedInUser(page, request);
    const projectName = `E2E Novel ${Date.now()}`;

    await page.getByRole('link', { name: /新建项目/i }).click();
    await page.getByLabel(/项目名称/i).fill(projectName);
    await page.getByRole('button', { name: /下一步/i }).click();
    await page.getByRole('button', { name: /下一步/i }).click();

    const createResponsePromise = page.waitForResponse((response) =>
      new URL(response.url()).pathname === '/api/projects'
      && response.request().method() === 'POST',
    );

    await page.getByRole('button', { name: /跳过并创建/i }).click();

    const createResponse = await createResponsePromise;
    expect(createResponse.status(), 'POST /api/projects should create a project').toBe(201);

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await expect(page.getByText(projectName)).toBeVisible();
  });
});

test.describe('US-1.4 Project Settings', () => {
  test('renders project settings page with basic tab', async ({ page, request }) => {
    const { token } = await createLoggedInUser(page, request);
    const projectName = `设置项目_${Date.now()}`;
    const projectId = await createProjectViaApi(request, token, projectName);

    await openProjectSettings(page, projectId);

    await expect(page.getByRole('heading', { name: /项目设置/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /基本信息/i })).toBeVisible();
    await expect(page.getByLabel(/项目名称/i)).toHaveValue(projectName);
  });

  test('renders all setting tabs', async ({ page, request }) => {
    const { token } = await createLoggedInUser(page, request);
    const projectId = await createProjectViaApi(request, token, `标签项目_${Date.now()}`);

    await openProjectSettings(page, projectId);

    await expect(page.getByRole('tab', { name: /基本信息/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /写作目标/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /AI 配置/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /备份与恢复/i })).toBeVisible();
  });

  test('tab navigation switches content', async ({ page, request }) => {
    const { token } = await createLoggedInUser(page, request);
    const projectId = await createProjectViaApi(request, token, `切换项目_${Date.now()}`);

    await openProjectSettings(page, projectId);

    await expect(page.getByLabel(/项目名称/i)).toBeVisible();

    await page.getByRole('tab', { name: /写作目标/i }).click();
    await expect(page.getByText(/每日写作目标/i)).toBeVisible();

    await page.getByRole('tab', { name: /AI 配置/i }).click();
    await expect(page.getByRole('heading', { name: /AI 配置/i })).toBeVisible();
    await expect(page.getByText(/续写风格/i)).toBeVisible();

    await page.getByRole('tab', { name: /备份与恢复/i }).click();
    await expect(page.getByRole('heading', { name: /导出项目/i })).toBeVisible();
  });

  test('renders danger zone section', async ({ page, request }) => {
    const { token } = await createLoggedInUser(page, request);
    const projectId = await createProjectViaApi(request, token, `危险区项目_${Date.now()}`);

    await openProjectSettings(page, projectId);

    await expect(page.getByText(/危险操作区/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /归档项目/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /删除项目/i })).toBeVisible();
  });

  test('edit project name and save successfully', async ({ page, request }) => {
    const { token } = await createLoggedInUser(page, request);
    const timestamp = Date.now();
    const newProjectName = `测试项目_${timestamp}`;
    const projectId = await createProjectViaApi(request, token, `待修改项目_${timestamp}`);

    await openProjectSettings(page, projectId);

    const nameInput = page.getByLabel(/项目名称/i);
    await nameInput.clear();
    await nameInput.fill(newProjectName);

    const saveResponsePromise = page.waitForResponse((response) =>
      new URL(response.url()).pathname === `/api/projects/${projectId}`
      && response.request().method() === 'PATCH',
    );

    await page.getByRole('button', { name: /保存更改/i }).click();

    const saveResponse = await saveResponsePromise;
    expect(saveResponse.ok(), `PATCH /api/projects/${projectId} returned ${saveResponse.status()}`).toBeTruthy();
    await expect(page.getByText(/项目信息已更新/i)).toBeVisible({ timeout: 5000 });
  });

  test('edited project name appears in dashboard', async ({ page, request }) => {
    const { token } = await createLoggedInUser(page, request);
    const timestamp = Date.now();
    const newProjectName = `仪表盘验证_${timestamp}`;
    const projectId = await createProjectViaApi(request, token, `仪表盘原始_${timestamp}`);

    await openProjectSettings(page, projectId);

    const nameInput = page.getByLabel(/项目名称/i);
    await nameInput.clear();
    await nameInput.fill(newProjectName);

    const saveResponsePromise = page.waitForResponse((response) =>
      new URL(response.url()).pathname === `/api/projects/${projectId}`
      && response.request().method() === 'PATCH',
    );

    await page.getByRole('button', { name: /保存更改/i }).click();

    const saveResponse = await saveResponsePromise;
    expect(saveResponse.ok(), `PATCH /api/projects/${projectId} returned ${saveResponse.status()}`).toBeTruthy();
    await expect(page.getByText(/项目信息已更新/i)).toBeVisible({ timeout: 5000 });

    const projectsResponsePromise = page.waitForResponse((response) =>
      new URL(response.url()).pathname === '/api/projects'
      && response.request().method() === 'GET',
    );

    await page.goto('/dashboard');

    const projectsResponse = await projectsResponsePromise;
    expect(projectsResponse.ok(), `GET /api/projects returned ${projectsResponse.status()}`).toBeTruthy();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(newProjectName)).toBeVisible();
  });
});

test.describe('US-1.5 Volume Outline', () => {
  test('renders volume outline page with backend empty state', async ({ page, request }) => {
    const { token } = await createLoggedInUser(page, request);
    const projectId = await createProjectViaApi(request, token, `大纲项目_${Date.now()}`);

    await openProjectOutline(page, projectId);

    await expect(page.getByText(/暂无卷章节/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /新建卷/i }).first()).toBeVisible();
    await expect(page.getByTestId('outline-error')).toHaveCount(0);
  });

  test('creates a volume through the backend outline flow', async ({ page, request }) => {
    const { token } = await createLoggedInUser(page, request);
    const projectId = await createProjectViaApi(request, token, `建卷项目_${Date.now()}`);

    await openProjectOutline(page, projectId);

    await page.getByRole('button', { name: /新建卷/i }).first().click();
    await expect(page.getByRole('heading', { name: /新建卷/i })).toBeVisible();
    await expect(page.getByLabel(/卷名称/i)).toBeVisible();

    const volumeName = `第一卷_${Date.now()}`;
    const createVolumeResponsePromise = page.waitForResponse((response) =>
      new URL(response.url()).pathname === `/api/projects/${projectId}/volumes`
      && response.request().method() === 'POST',
    );

    await page.getByLabel(/卷名称/i).fill(volumeName);
    await page.getByRole('button', { name: /创建/i }).click();

    const createVolumeResponse = await createVolumeResponsePromise;
    expect(createVolumeResponse.status(), `POST /api/projects/${projectId}/volumes should create a volume`).toBe(201);
    await expect(page.getByText(volumeName)).toBeVisible();
  });
});

test.describe('US-1.8 Project Archive', () => {
  test('archive button exists in danger zone', async ({ page, request }) => {
    const { token } = await createLoggedInUser(page, request);
    const projectId = await createProjectViaApi(request, token, `待归档项目_${Date.now()}`);

    await openProjectSettings(page, projectId);
    await expect(page.getByRole('button', { name: /归档项目/i })).toBeVisible();
  });

  test('clicking archive opens confirmation modal', async ({ page, request }) => {
    const { token } = await createLoggedInUser(page, request);
    const projectId = await createProjectViaApi(request, token, `归档弹窗_${Date.now()}`);

    await openProjectSettings(page, projectId);
    await page.getByRole('button', { name: /归档项目/i }).click();

    await expect(page.getByRole('heading', { name: /确认归档/i })).toBeVisible();
    await expect(page.getByText(/归档后项目将进入只读模式/i).first()).toBeVisible();
  });

  test('confirming archive sends success response and navigates to dashboard', async ({ page, request }) => {
    const timestamp = Date.now();
    const projectName = `已归档验证_${timestamp}`;
    const { token } = await createLoggedInUser(page, request);
    const projectId = await createProjectViaApi(request, token, projectName);

    await openProjectSettings(page, projectId);
    await page.getByRole('button', { name: /归档项目/i }).click();

    const archiveResponsePromise = page.waitForResponse((response) =>
      new URL(response.url()).pathname === `/api/projects/${projectId}/archive`
      && response.request().method() === 'POST',
    );
    const projectsResponsePromise = page.waitForResponse((response) =>
      new URL(response.url()).pathname === '/api/projects'
      && response.request().method() === 'GET',
    );

    await page.getByRole('button', { name: /确认归档/i }).click();

    const archiveResponse = await archiveResponsePromise;
    expect(archiveResponse.ok(), `POST /api/projects/${projectId}/archive returned ${archiveResponse.status()}`).toBeTruthy();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    const projectsResponse = await projectsResponsePromise;
    expect(projectsResponse.ok(), `GET /api/projects returned ${projectsResponse.status()}`).toBeTruthy();
    await expect(page.getByText(projectName)).not.toBeVisible();
  });
});
