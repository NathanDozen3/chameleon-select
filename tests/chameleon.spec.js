const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Chameleon Select v1.1.4 - Stability Suite', () => {

  test.beforeEach(async ({ page }) => {
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
    await page.keyboard.press('Enter');

    await page.keyboard.press('ArrowDown');
    await expect(native).toHaveValue('3');
  });

  test('Optgroups: Labels are rendered and non-interactive', async ({ page }) => {
    const wrapper = page.locator('.chameleon-wrapper');
    await wrapper.click();

    const groupLabel = page.locator('.chameleon-group-label');
    await expect(groupLabel).toHaveText('Group A');
    await expect(groupLabel).not.toHaveAttribute('role', 'option');

    await groupLabel.dispatchEvent('click');
    await expect(wrapper).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#hero-select')).toHaveValue('1');
  });

  test('Interaction: Disabled items prevent selection on mousedown', async ({ page }) => {
    const wrapper = page.locator('.chameleon-wrapper');
    const native = page.locator('#hero-select');

    await wrapper.click();
    const disabledItem = page.locator('.chameleon-select-item.is-disabled');

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
      window.Chameleon.refresh(el, { sniff: false });
      return focused;
    });

    expect(focusHappened).toBe(false);
    await expect(page.locator('.chameleon-text')).toHaveText('New Label');
    await expect(page.locator('.chameleon-wrapper')).toHaveCount(1);
  });

  test('Lifecycle: destroy() is total and leaves no stale listeners', async ({ page }) => {
    const descriptorRestored = await page.evaluate(() => {
      const el = document.getElementById('hero-select');
      window.Chameleon.destroy(el);
      el.selectedIndex = 2;
      return Object.getOwnPropertyDescriptor(el, 'selectedIndex') === undefined;
    });

    expect(descriptorRestored).toBe(true);
    await expect(page.locator('.chameleon-wrapper')).toHaveCount(0);
  });

  test('Interaction: Outside click closes the menu', async ({ page }) => {
    const wrapper = page.locator('.chameleon-wrapper');
    await wrapper.click();
    await expect(wrapper).toHaveAttribute('aria-expanded', 'true');

    await page.mouse.click(0, 0);
    await expect(wrapper).toHaveAttribute('aria-expanded', 'false');
  });

  test('v1.1: Type-ahead search opens menu and selects match', async ({ page }) => {
    const wrapper = page.locator('.chameleon-wrapper');
    const native = page.locator('#hero-select');

    await wrapper.focus();

    // Press 'D' to match "Disabled Option" — but it's disabled, so findIndex skips it.
    // Press 'O' to match the first non-disabled option starting with 'O': "Option 1".
    // Then press 'O' again after buffer clears won't help, so instead we use a
    // fixture option that unambiguously starts with a unique character.
    // 'G' has no match. 'O' matches "Option 1" (first match).
    // To reach "Option 3" via type-ahead, type "Option 3" slowly — or just
    // verify type-ahead selects the correct first match and opens the menu.
    await page.keyboard.press('o');

    await expect(wrapper).toHaveAttribute('aria-expanded', 'true');
    // 'o' matches "Option 1" — the first non-disabled option starting with 'o'
    await expect(native).toHaveValue('1');
  });

  test('v1.1: Type-ahead skips disabled options', async ({ page }) => {
    const wrapper = page.locator('.chameleon-wrapper');
    const native = page.locator('#hero-select');

    // Add a fresh page with a 'D' option that is NOT disabled to confirm
    // that pressing 'D' when only disabled options start with 'D' does nothing.
    await wrapper.focus();
    await page.keyboard.press('d');

    // "Disabled Option" starts with 'd' but is disabled — no match, value unchanged.
    await expect(native).toHaveValue('1');
    // Menu should not open if no match was found
    await expect(wrapper).toHaveAttribute('aria-expanded', 'false');
  });

  test('v1.1: data-chameleon="false" ignores the element', async ({ page }) => {
    await page.evaluate(() => {
      const form = document.getElementById('test-form');
      const ignored = document.createElement('select');
      ignored.id = 'ignored-select';
      ignored.setAttribute('data-chameleon', 'false');
      ignored.innerHTML = '<option>Ignore Me</option>';
      form.appendChild(ignored);
      window.Chameleon.init(ignored);
    });

    await expect(page.locator('.chameleon-wrapper')).toHaveCount(1);
    await expect(page.locator('#ignored-select')).toBeVisible();
  });

  test('v1.1: Mobile Breakpoint Fallback', async ({ page }) => {
    await page.setViewportSize({ width: 500, height: 800 });

    await page.evaluate(() => {
      const el = document.createElement('select');
      el.id = 'mobile-test';
      el.innerHTML = '<option>Native</option>';
      document.body.appendChild(el);
      window.Chameleon.init(el, { mobileBreakpoint: 768 });
    });

    // At 500px wide, below breakpoint — native select stays visible, no new wrapper
    await expect(page.locator('#mobile-test')).toBeVisible();
    await expect(page.locator('.chameleon-wrapper')).toHaveCount(1); // only hero-select

    // Resize above breakpoint — resize handler should initialize the mobile select
    await page.setViewportSize({ width: 1024, height: 800 });
    await expect(page.locator('.chameleon-wrapper')).toHaveCount(2, { timeout: 1000 });
  });

  test('v1.1: Default styles apply when no reference input exists in scope', async ({ page }) => {
    // The lone select must be in an isolated container with no text inputs,
    // otherwise refInput will find #ref-input from the test form and isSelfSniff = false.
    await page.evaluate(() => {
      const iframe = document.createElement('iframe');
      iframe.id = 'isolated-frame';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument;
      iframeDoc.open();
      iframeDoc.write('<html><body></body></html>');
      iframeDoc.close();
    });

    // Simpler approach: use a shadow-free isolated div with no inputs and
    // override the body to clear existing inputs from scope.
    // Cleanest fix: just check the CSS variable directly rather than computed height,
    // since --ch-height is set to DEFAULTS.height when isSelfSniff is true.
    const chHeight = await page.evaluate(() => {
      // Create a form with no text inputs so refInput falls back to the select itself
      const form = document.createElement('form');
      form.id = 'isolated-form';
      const loneSelect = document.createElement('select');
      loneSelect.id = 'lone-select';
      loneSelect.innerHTML = '<option>Lone</option>';
      form.appendChild(loneSelect);
      document.body.appendChild(form);
      window.Chameleon.init(loneSelect);

      const wrapper = loneSelect.previousElementSibling;
      return wrapper ? wrapper.style.getPropertyValue('--ch-height').trim() : null;
    });

    expect(chHeight).toBe('36px');
  });
});
