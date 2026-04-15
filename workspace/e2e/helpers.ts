import { expect, type APIRequestContext, type Page, type Response } from '@playwright/test';

export type UserCredentials = {
  email: string;
  password: string;
};

function matchesApiPath(response: Response, path: string, method: string) {
  return new URL(response.url()).pathname === path && response.request().method() === method;
}

async function expectOk(response: Response, label: string) {
  expect(response.ok(), `${label} returned ${response.status()}`).toBeTruthy();
}

export async function createUserViaApi(
  request: APIRequestContext,
  overrides: Partial<UserCredentials> = {},
) {
  const timestamp = Date.now();
  const credentials: UserCredentials = {
    email: overrides.email ?? `e2e-user-${timestamp}-${Math.random().toString(36).slice(2, 8)}@test.com`,
    password: overrides.password ?? 'StrongPass123',
  };

  const response = await request.post('/api/auth/register', {
    data: credentials,
  });

  await expectOk(response, 'POST /api/auth/register');
  return credentials;
}

export async function loginThroughUi(page: Page, credentials: UserCredentials) {
  await page.goto('/login');
  await page.getByLabel(/邮箱/i).fill(credentials.email);
  await page.getByLabel(/密码/i).fill(credentials.password);

  const loginResponsePromise = page.waitForResponse((response) =>
    matchesApiPath(response, '/api/auth/login', 'POST'),
  );
  const meResponsePromise = page.waitForResponse((response) =>
    matchesApiPath(response, '/api/auth/me', 'GET'),
  );
  const projectsResponsePromise = page.waitForResponse((response) =>
    matchesApiPath(response, '/api/projects', 'GET'),
  );

  await page.getByRole('button', { name: /登录/i }).click();

  const loginResponse = await loginResponsePromise;
  await expectOk(loginResponse, 'POST /api/auth/login');
  const loginBody = (await loginResponse.json()) as { token: string };

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

  const meResponse = await meResponsePromise;
  await expectOk(meResponse, 'GET /api/auth/me');

  const projectsResponse = await projectsResponsePromise;
  await expectOk(projectsResponse, 'GET /api/projects');

  await page.waitForLoadState('networkidle');

  return { token: loginBody.token };
}

export async function openProjectSettings(page: Page, projectId: string) {
  const settingsResponsePromise = page.waitForResponse((response) =>
    matchesApiPath(response, `/api/projects/${projectId}/settings`, 'GET'),
  );
  const goalsResponsePromise = page.waitForResponse((response) =>
    matchesApiPath(response, `/api/projects/${projectId}/goals`, 'GET'),
  );

  await page.goto(`/projects/${projectId}/settings`);

  const settingsResponse = await settingsResponsePromise;
  await expectOk(settingsResponse, `GET /api/projects/${projectId}/settings`);

  const goalsResponse = await goalsResponsePromise;
  await expectOk(goalsResponse, `GET /api/projects/${projectId}/goals`);

  await page.waitForLoadState('networkidle');
}

export async function openProjectOutline(page: Page, projectId: string) {
  const outlineResponsePromise = page.waitForResponse((response) =>
    matchesApiPath(response, `/api/projects/${projectId}/outline`, 'GET'),
  );

  await page.goto(`/projects/${projectId}/outline`);

  const outlineResponse = await outlineResponsePromise;
  await expectOk(outlineResponse, `GET /api/projects/${projectId}/outline`);

  await page.waitForLoadState('networkidle');
}

export async function createProjectViaApi(
  request: APIRequestContext,
  token: string,
  name: string,
) {
  const response = await request.post('/api/projects', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: {
      name,
      type: 'novel',
      tags: [],
      description: 'E2E generated project',
    },
  });

  await expectOk(response, 'POST /api/projects');
  const body = (await response.json()) as { projectId: string };
  return body.projectId;
}
