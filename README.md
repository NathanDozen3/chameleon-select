# 🦎 Chameleon Select

**A zero-config, ultra-lightweight JavaScript utility that transforms native `<select>` elements into fully stylable, accessible dropdowns that automatically inherit your site's existing UI theme.**

> **Current version: 1.1.4** — Stable public API available.

---

## ✨ Why Chameleon?

Most custom select libraries require you to manually define CSS for heights, colors, borders, and focus states. **Chameleon Select** does the work for you by "sniffing" the styles of neighboring text inputs to ensure your dropdowns look native to your specific design system without writing a single line of component CSS.

* **Zero Dependencies:** Pure Vanilla JS (approx. 5KB minified).
* **Auto-Theming:** Inherits borders, colors, border-radius, and focus-ring styles from your existing inputs.
* **Accessibility First:** Full WAI-ARIA 1.2 compliance (Combobox pattern).
* **Smart Positioning:** Automatically detects screen edges to flip the menu upward if space is limited.
* **Native Sync:** Automatically updates the hidden native `<select>` and dispatches `change` events for seamless form compatibility.
* **Programmatic Sync:** Setting `selectEl.value` or `selectEl.selectedIndex` via JavaScript updates the UI automatically.
* **Type-Ahead:** Users can jump to options by typing while the dropdown is focused.
* **Dynamic Support:** Uses `MutationObserver` to handle elements added via AJAX/SPAs automatically.
* **Mobile-Friendly:** Falls back to the native `<select>` below a configurable breakpoint (default: 768px).

---

## 🚀 Quick Start

### Auto-Initializer

Include the script at the end of your `<body>`. It will automatically find and transform all `<select>` elements on the page.

```html
<script src="chameleon-select.min.js"></script>
```

### Manual Initialization (Public API)

For more control, use the `Chameleon` global object directly:

```javascript
// Initialize all selects within a container
Chameleon.init(document, { watch: true });

// Initialize a single select element
const mySelect = document.querySelector('#my-select');
Chameleon.init(mySelect, { mobileBreakpoint: 1024 });

// Destroy a single instance (restores native select)
Chameleon.destroy(mySelect);

// Refresh a single instance (re-sniffs styles and rebuilds)
Chameleon.refresh(mySelect);
```

### Opting Out

To skip a specific `<select>`, add `data-chameleon="false"`:

```html
<select data-chameleon="false">...</select>
```

---

## ⚙️ Options

Options are passed as a second argument to `Chameleon.init()`:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mobileBreakpoint` | `number` | `768` | Width (px) below which Chameleon destroys itself and falls back to the native select. Restores automatically on resize. |
| `sniff` | `boolean` | `true` | Whether to sniff styles from a sibling input. Set to `false` to use Chameleon's built-in defaults. |
| `watch` | `boolean` | `true` | Whether to use a `MutationObserver` to auto-initialize selects added dynamically to the container. |

---

## 🛠️ How It Works

Chameleon Select uses a "style-sniffing" technique at initialization:

1. **Context Discovery:** It identifies a reference input (like a text field) in the same form or container.
2. **Focus Mirroring:** It briefly captures the `:focus` state of your inputs to replicate your site's specific focus-ring (box-shadow/outline) exactly.
3. **Variable Injection:** It maps these values to CSS Custom Properties (`--ch-bg`, `--ch-border`, etc.) scoped to each dropdown instance.

---

## ♿ Accessibility

Chameleon implements the full [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) Combobox pattern:

* **Role Mapping:** `role="combobox"` with `aria-activedescendant` for item tracking.
* **Label Forwarding:** Automatically links to existing `<label>` elements via `aria-labelledby`.
* **Keyboard Navigation:**
  * `Enter` / `Space`: Open/close menu.
  * `ArrowUp` / `ArrowDown`: Navigate options (intelligently skips disabled items).
  * `Esc`: Close menu.
  * **Any printable character:** Type-ahead — jumps to the first matching option and opens the menu if closed.
* **Optgroups:** Supports `<optgroup>` rendering as non-interactive, semantic headers.

---

## 🔄 Programmatic Updates

Chameleon intercepts `selectedIndex` and `value` property assignments on the native `<select>`, so the custom UI stays in sync when you update the select via JavaScript:

```javascript
const mySelect = document.querySelector('#my-select');

// Both of these will automatically update the Chameleon UI
mySelect.value = 'option-2';
mySelect.selectedIndex = 3;

// Dispatching a change event also syncs the UI
mySelect.dispatchEvent(new Event('change', { bubbles: true }));
```

---

## 🎨 Customizing Styles

While Chameleon handles the "heavy lifting" of matching your theme, you can override specific behaviors using CSS variables:

```css
/* Limit menu height for all instances */
.chameleon-wrapper {
  --ch-max-height: 300px;
}

/* Customize the hover/highlight state of items */
.chameleon-select-item:hover,
.chameleon-select-item.is-highlighted {
  background-color: #3498db !important;
  color: #ffffff !important;
}

/* Customize optgroup headers */
.chameleon-group-label {
  text-transform: uppercase;
  letter-spacing: 1px;
}
```

### Available CSS Variables

| Variable | Description |
|----------|-------------|
| `--ch-bg` | Trigger background color |
| `--ch-border` | Trigger border |
| `--ch-border-radius` | Trigger and menu border radius |
| `--ch-color` | Selected text color |
| `--ch-color-item` | Dropdown item text color |
| `--ch-focus-border` | Trigger border color on focus |
| `--ch-focus-shadow` | Trigger box-shadow on focus |
| `--ch-focus-outline` | Trigger outline on focus |
| `--ch-font-family` | Font family |
| `--ch-font-size` | Font size |
| `--ch-height` | Trigger height |
| `--ch-max-height` | Maximum height of the dropdown menu |
| `--ch-padding` | Padding for trigger and items |
| `--ch-width` | Wrapper width |
| `--ch-z-index` | Z-index of the dropdown menu |

---

## 🖥️ Framework & SPA Compatibility

Chameleon monitors the DOM via `MutationObserver`. If you inject new `<select>` elements via React, Vue, HTMX, or any other framework, they will be transformed automatically without needing a manual re-initialization call (as long as `watch: true`, which is the default).

For frameworks that fully control the DOM lifecycle, you can also use the manual API:

```javascript
// After your component mounts a new select
Chameleon.init(myNewSelect);

// Before your component unmounts
Chameleon.destroy(mySelect);
```

---

## 🤝 Contributing

Chameleon Select is an open-source project. Feel free to open an issue or submit a pull request!

---

## 📄 License

MIT. Free for personal and commercial use.
