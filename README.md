# 🦎 Chameleon Select

**A zero-config, ultra-lightweight JavaScript utility that transforms native `<select>` elements into fully stylable, accessible dropdowns that automatically inherit your site's existing UI theme.**



## ✨ Why Chameleon?

Most custom select libraries require you to manually define CSS for heights, colors, borders, and focus states. **Chameleon Select** does the work for you by "sniffing" the styles of neighboring text inputs to ensure your dropdowns look native to your specific design system without writing a single line of component CSS.

* **Zero Dependencies:** Pure Vanilla JS (approx. 5KB minified).
* **Auto-Theming:** Inherits borders, colors, border-radius, and focus-ring styles from your existing inputs.
* **Accessibility First:** Full WAI-ARIA 1.2 compliance (Combobox pattern).
* **Smart Positioning:** Automatically detects screen edges to flip the menu upward if space is limited.
* **Native Sync:** Automatically updates the hidden native `<select>` and dispatches `change` events for seamless form compatibility.
* **Dynamic Support:** Uses `MutationObserver` to handle elements added via AJAX/SPAs automatically.

---

## 🚀 Quick Start

Just include the script at the end of your `<body>`. It will automatically find and transform all `<select>` elements on the page.

```html
<script src="chameleon-select.min.js"></script>
```

Currently, Chameleon Select is a **zero-config auto-initializer**. Just include the script at the end of your `<body>`, and it will handle the rest. 

*Note: A manual Public API for fine-grained control is coming in v1.0.*

### Framework & SPA Compatibility
Chameleon monitors the DOM. If you inject new selects via React, Vue, or HTMX, they will be transformed instantly without needing a manual re-initialization.

---

## 🛠️ How it Works

Chameleon Select uses a "style-sniffing" technique at initialization:

1.  **Context Discovery:** It identifies a reference input (like a text field) in the same form or container.
2.  **Focus Mirroring:** It briefly captures the `:focus` state of your inputs to replicate your site's specific focus-ring (box-shadow/outline) exactly.
3.  **Variable Injection:** It maps these values to CSS Custom Properties (`--ch-bg`, `--ch-border`, etc.) scoped to each dropdown instance.



---

## ♿ Accessibility

This isn't just a visual skin. We’ve implemented the full [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/):

* **Role Mapping:** `role="combobox"` with `aria-activedescendant` for item tracking.
* **Label Forwarding:** Automatically links to existing `<label>` elements via `aria-labelledby`.
* **Keyboard Navigation:**
    * `Enter` / `Space`: Open/Close menu.
    * `ArrowUp` / `ArrowDown`: Navigate options (intelligently skips disabled items).
    * `Esc`: Close menu.
* **Optgroups:** Supports `<optgroup>` rendering as non-interactive, semantic headers.



---

## 🎨 Customizing Styles

While Chameleon handles the "heavy lifting" of matching your theme, you can easily override specific behaviors using CSS variables:

```css
/* Customizing all instances */
.chameleon-wrapper {
  --ch-max-height: 300px; /* Limit menu height */
}

/* Customizing the hover/highlight state of items */
.chameleon-select-item:hover,
.chameleon-select-item.is-highlighted {
  background-color: #3498db !important;
  color: #ffffff !important;
}

/* Customizing Optgroup headers */
.chameleon-group-label {
  text-transform: uppercase;
  letter-spacing: 1px;
}
```

---

## 🗺️ Roadmap

We are currently working toward a stable **v1.0** release. Key priorities include:

* **Public API:** Adding `init()`, `destroy()`, and `refresh()` methods for SPA compatibility.
* **Programmatic Sync:** Ensuring the UI updates automatically when the native select is changed via JavaScript.
* **Testing:** Implementing a Playwright suite for cross-browser accessibility and interaction testing.

For a detailed look at upcoming features like **Multi-select**, **Type-ahead**, and **Framework Wrappers**, please see our [Full Roadmap](./ROADMAP.md).

---

## 🤝 Contributing

Chameleon Select is an open-source project. If you'd like to help us reach our v1.0 milestones, feel free to open an issue or submit a pull request!

---

## 📄 License

MIT. Free for personal and commercial use.