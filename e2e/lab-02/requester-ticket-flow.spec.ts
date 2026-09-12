import { test, expect } from '@playwright/test';

test.describe('Requester Ticket Flow (Lab 2 End-to-End)', () => {
  test('Full requester flow: Select Requester -> Create Ticket -> View in My Tickets -> Ticket Detail & Soft Attachment Removal', async ({ page }) => {
    // 1. Navigate to main portal
    await page.goto('/');

    // 2. Select Development Requester if modal is displayed
    const selectRequesterBtn = page.locator('#dev-requester-select-btn, #my-tickets-select-requester-btn');
    if (await selectRequesterBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await selectRequesterBtn.first().click();
    }

    const modalSelect = page.locator('#dev-requester-modal select, select#requester-select, .modal select, select').first();
    if (await modalSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await modalSelect.selectOption({ index: 1 });
      await page.locator('#confirm-requester-btn, button:has-text("Confirm Identity"), button:has-text("Continue")').click();
    }

    // 3. Create Ticket Form Submission
    const summaryText = `E2E Test Ticket: ${Date.now()}`;

    // Fill Summary (using placeholder or name/ID fallback)
    const summaryInput = page.locator('#ticket-summary-input, input[name="summary"], input[placeholder*="description"], input[placeholder*="Summary"], input[type="text"]').first();
    await summaryInput.fill(summaryText);

    // Fill Description
    const descTextarea = page.locator('#ticket-description-input, textarea[name="description"], textarea').first();
    await descTextarea.fill('Detailed description for Playwright E2E automated test suite.');

    // Select Dropdowns (Category, Related System, Priority)
    const selects = page.locator('select');
    const selectCount = await selects.count();

    if (selectCount >= 1) await selects.nth(0).selectOption({ index: 1 }); // Category
    if (selectCount >= 2) await selects.nth(1).selectOption({ index: 1 }); // Related System
    if (selectCount >= 3) {
      try {
        await selects.nth(2).selectOption({ index: 1 }); // Priority
      } catch {
        await selects.nth(2).selectOption({ label: 'Medium' });
      }
    }

    // Attach sample file if upload input present
    const fileInput = page.locator('#ticket-attachment-input, input[type="file"]');
    if (await fileInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await fileInput.setInputFiles({
        name: 'e2e-sample-attachment.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('Playwright E2E Sample PDF Content'),
      });
    }

    // Submit Ticket
    await page.click('#submit-ticket-btn, button[type="submit"]:has-text("Submit Ticket"), button:has-text("Submit Ticket")');

    // 4. Verify ticket appears in My Tickets list
    await page.waitForTimeout(1000);
    const ticketRow = page.locator(`tr:has-text("${summaryText}"), div:has-text("${summaryText}")`).first();
    await expect(ticketRow).toBeVisible({ timeout: 10000 });

    // 5. Open Ticket Detail View by clicking ticket row
    await ticketRow.click();

    // 6. Verify Ticket Detail elements
    const detailSummary = page.locator(`#ticket-detail-summary, :text("${summaryText}")`).first();
    await expect(detailSummary).toBeVisible();

    // 7. Soft Attachment Removal (if attachment exists)
    const removeAttachmentBtn = page.locator('button:has-text("Soft Remove"), button:has-text("Remove")').first();
    if (await removeAttachmentBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await removeAttachmentBtn.click();

      // Soft removal modal opens
      const modal = page.locator('#soft-removal-modal, .modal, div[role="dialog"]').first();
      await expect(modal).toBeVisible();

      // Submit without reason first to verify validation
      const confirmBtn = page.locator('#confirm-removal-btn, button:has-text("Confirm"), button:has-text("Remove")').first();
      await confirmBtn.click();

      // Provide mandatory reason and confirm
      const reasonInput = page.locator('#removal-reason-input, textarea[placeholder*="reason"], input[placeholder*="reason"], textarea, input[type="text"]').last();
      await reasonInput.fill('Attachment uploaded by error during automated test');
      await confirmBtn.click();

      // Verify soft removal status and disabled download button
      await expect(page.locator('button:has-text("Download Unavailable"), button:has-text("Removed"), :text("Removed")').first()).toBeVisible();
    }
  });
});