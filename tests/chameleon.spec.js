const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Chameleon Select v1.0.5 - Stability Suite', () => {

  test.beforeEach(async ({ page }) => {
    // Capture page errors to ensure no silent failures in patched descriptors
    page.on('pageerror', (err) => {
      throw new Error(`Page Error: ${err.message}`);
    });

    await page.setContent(`
      <form id="test-form" style="margin: 50px;">
        <select id="hero-select">
          <option value="1">Option 1</option>
          <option value="2" disabled>Disabled Option</option>
          <optgroup label="Group A">
            <option value="3">Option 3</option>
          </optgroup>
        </select>
        <input type="text" id="ref-input" />
      </form>
    `);
    await page.addScriptTag({ path: path.resolve(__dirname, '../chameleon-select.js') });
  });

  test('Keyboard Navigation: Skips disabled options', async ({ page }) => {
    const wrapper = page.locator('.chameleon-wrapper');
    const native = page.locator('#hero-select');

    await expect(native).toHaveValue('1');
    await wrapper.focus();
    await page.keyboard.press('Enter'); // Open menu

    // Should jump over 'Disabled Option' directly to 'Option 3'
    await page.keyboard.press('ArrowDown');
    await expect(native).toHaveValue('3');
  });

  test('Optgroups: Labels are rendered and non-interactive', async ({ page }) => {
    const wrapper = page.locator('.chameleon-wrapper');
    await wrapper.click();

    const groupLabel = page.locator('.chameleon-group-label');
    await expect(groupLabel).toHaveText('Group A');

    // Ensure it's not an 'option' role
    await expect(groupLabel).not.toHaveAttribute('role', 'option');

    // Clicking label should NOT change selection or close menu
    await groupLabel.dispatchEvent('click');
    await expect(wrapper).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#hero-select')).toHaveValue('1');
  });

  test('Interaction: Disabled items prevent selection on mousedown', async ({ page }) => {
    const wrapper = page.locator('.chameleon-wrapper');
    const native = page.locator('#hero-select');

    await wrapper.click();
    const disabledItem = page.locator('.chameleon-select-item.is-disabled');

    // The library blocks on 'mousedown'.
    // If the block fails, the change event would trigger.
    await disabledItem.dispatchEvent('mousedown');

    await expect(native).toHaveValue('1');
    await expect(wrapper).toHaveAttribute('aria-expanded', 'true');
  });

  test('Lifecycle: refresh() forwards options and prevents duplicates', async ({ page }) => {
    const focusHappened = await page.evaluate(() => {
      let focused = false;
      document.getElementById('ref-input').onfocus = () => { focused = true; };

      const el = document.getElementById('hero-select');
      el.options[0].text = "New Label";
      // This will fail to prevent focus if 'refresh' doesn't forward the option
      window.Chameleon.refresh(el, { sniff: false });
      return focused;
    });

    expect(focusHappened).toBe(false);
    await expect(page.locator('.chameleon-text')).toHaveText('New Label');
    await expect(page.locator('.chameleon-wrapper')).toHaveCount(1);
  });

  test('Lifecycle: destroy() is total and leaves no stale listeners', async ({ page }) => {
    await page.evaluate(() => {
      const el = document.getElementById('hero-select');
      window.Chameleon.destroy(el);

      // Triggering the setter.
      // If the patch was not deleted, this would call syncFromNative
      // and throw because the wrapper is gone.
      el.selectedIndex = 2;
    });

    await expect(page.locator('.chameleon-wrapper')).toHaveCount(0);
    // page.on('pageerror') above will catch it if el.selectedIndex triggers a ghost sync
  });

  test('Interaction: Outside click closes the menu', async ({ page }) => {
    const wrapper = page.locator('.chameleon-wrapper');
    await wrapper.click();
    await expect(wrapper).toHaveAttribute('aria-expanded', 'true');

    // Click top-left of the viewport
    await page.mouse.click(0, 0);
    await expect(wrapper).toHaveAttribute('aria-expanded', 'false');
  });
});
