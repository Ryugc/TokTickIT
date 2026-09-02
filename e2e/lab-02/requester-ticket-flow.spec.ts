import { test, expect } from '@playwright/test';

test.describe('Requester Ticket Flow (Lab 2 End-to-End)', () => {
  test('Full requester flow: Select Requester -> Create Ticket -> View in My Tickets -> Ticket Detail & Soft Attachment Removal', async ({ page }) => {
    // 1. Navigate to main portal
    await page.goto('/');

    // 2. Select Development Requester if modal is displayed or via selector button
    const selectRequesterBtn = page.locator('#dev-requester-select-btn, #my-tickets-select-requester-btn');
    if (await selectRequesterBtn.isVisible()) {
      await selectRequesterBtn.first().click();
      await page.locator('#dev-requester-modal select, select#requester-select').selectOption({ index: 1 });
      await page.locator('#confirm-requester-btn, button:has-text("Confirm Identity")').click();
    }

    // 3. Create Ticket Form Submission
    const summaryText = `E2E Test Ticket: ${Date.now()}`;
    await page.fill('#ticket-summary-input, input[name="summary"]', summaryText);
    await page.fill('#ticket-description-input, textarea[name="description"]', 'Detailed description for Playwright E2E automated test suite.');
    await page.selectOption('#ticket-category-select, select[name="categoryId"]', { index: 1 });
    await page.selectOption('#ticket-system-select, select[name="relatedSystemId"]', { index: 1 });
    await page.selectOption('#ticket-priority-select, select[name="requestedPriority"]', 'HIGH');

    // Attach sample file if upload input present
    const fileInput = page.locator('#ticket-attachment-input, input[type="file"]');
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles({
        name: 'e2e-sample-attachment.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('Playwright E2E Sample PDF Content'),
      });
    }

    await page.click('#submit-ticket-btn, button[type="submit"]:has-text("Submit Ticket")');

    // 4. Verify ticket appears in My Tickets list
    await page.waitForTimeout(1000);
    const ticketRow = page.locator(`tr:has-text("${summaryText}"), div:has-text("${summaryText}")`).first();
    await expect(ticketRow).toBeVisible();

    // 5. Open Ticket Detail View by clicking ticket row
    await ticketRow.click();

    // 6. Verify Ticket Detail elements
    await expect(page.locator('#ticket-detail-summary')).toContainText(summaryText);
    await expect(page.locator('#ticket-detail-priority-badge')).toBeVisible();

    // 7. Soft Attachment Removal (if attachment exists)
    const removeAttachmentBtn = page.locator('button:has-text("Soft Remove")').first();
    if (await removeAttachmentBtn.isVisible()) {
      await removeAttachmentBtn.click();

      // Soft removal modal opens
      await expect(page.locator('#soft-removal-modal')).toBeVisible();

      // Submit without reason first to verify validation
      await page.click('#confirm-removal-btn');
      await expect(page.locator('#removal-reason-error')).toBeVisible();

      // Provide mandatory reason and confirm
      await page.fill('#removal-reason-input', 'Attachment uploaded by error during automated test');
      await page.click('#confirm-removal-btn');

      // Verify soft removal status and disabled download button
      await expect(page.locator('#soft-removal-modal')).not.toBeVisible();
      await expect(page.locator('button:has-text("Download Unavailable (Removed)")')).toBeVisible();
    }
  });
});
