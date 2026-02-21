import { test, expect } from '@playwright/test';

test.describe('Dashboard Metrics Validation', () => {
  test.beforeEach(async ({ request }) => {
    // Seed/reset demo data before each test
    await request.post('http://localhost:3000/api/seed'); // Update endpoint as needed
  });

  test('Task counts by status', async ({ page }) => {
    await page.goto('/dashboard');
    // Validate task counts by status
    const todoCount = await page.locator('[data-testid="task-count-todo"]').textContent();
    const inProgressCount = await page.locator('[data-testid="task-count-inprogress"]').textContent();
    const doneCount = await page.locator('[data-testid="task-count-done"]').textContent();
    // Fetch backend counts (mocked or via API)
    // Example: const backendCounts = await fetchBackendCounts();
    // expect(todoCount).toBe(backendCounts.todo);
    // ...repeat for other statuses
  });

  test('Recent messages', async ({ page }) => {
    await page.goto('/dashboard');
    // Validate recent messages
    const messages = await page.locator('[data-testid="recent-messages"] .message').allTextContents();
    // Fetch backend messages and compare
    // Example: const backendMessages = await fetchBackendMessages();
    // expect(messages).toEqual(backendMessages);
  });

  test('Online members', async ({ page }) => {
    await page.goto('/dashboard');
    // Validate online members
    const onlineMembers = await page.locator('[data-testid="online-members"] .member').allTextContents();
    // Fetch backend online members and compare
    // Example: const backendOnline = await fetchBackendOnlineMembers();
    // expect(onlineMembers).toEqual(backendOnline);
  });

  test('Verify numbers match source rows under concurrent updates', async ({ page }) => {
    await page.goto('/dashboard');
    // Simulate concurrent updates (move task, send message, toggle presence)
    // Example: await page.locator('[data-testid="move-task-btn"]').click();
    // Validate UI updates
    // Example: expect(await page.locator('[data-testid="task-count-inprogress"]').textContent()).toBe('expectedValue');
    // ...repeat for other metrics
  });
});
