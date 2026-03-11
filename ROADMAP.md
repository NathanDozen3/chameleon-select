# Chameleon Select — Roadmap

## v1.0 — Ship Criteria
*Things that should be resolved before calling it stable.*

* **Public API** — `Chameleon.init(container)`, `Chameleon.destroy(el)`, `Chameleon.refresh(el)`. Required for SPA use and unlocks the data-attribute work below.
* **Fix refInput.focus() side-effect** — Config option to skip focus-style sniffing, or internal default styles as a fallback when no reference input exists.
* **Programmatic change detection** — If a framework updates `selectedIndex` directly, the UI won't reflect it. Watch the native select's attributes or patch the setter.
* **ESM + UMD builds** — Proper `package.json` exports field for npm/bundler consumers; UMD for CDN/script-tag users.
* **Basic test suite** — Playwright or Vitest covering keyboard navigation, ARIA state, blur/click race, and optgroup rendering. Needed before any public release.

## v1.1 — UX & Configuration
* **Type-ahead search** — Single keypress jump for short lists; filter input for long ones (country selectors, etc.). Probably a config option rather than always-on.
* **Data-attribute API** — `data-chameleon="false"` to opt out, `data-ch-theme` for overrides.
* **Mobile native fallback** — Option to pass through to native UI below a configurable breakpoint. iOS/Android wheels are genuinely better on touch.
* **Internal default styles** — Kick in when no reference input is found, replacing the current circular fallback.

## v1.2 — Reliability & Edge Cases
* **Shadow DOM support** — `document.querySelector` won't pierce shadow roots. Needs a root option or a `getRootNode()`-aware query strategy.
* **position: fixed menus** — For selects inside `overflow: hidden` containers where absolute positioning breaks.
* **Performance audit** — `getComputedStyle` in a loop on init with 100 selects is a known layout thrash risk. Batch reads, or defer non-critical style sniffing.
* **Programmatic <option> changes** — If options are added/removed after init, the menu needs to rebuild. The `MutationObserver` currently watches for new `<select>` elements but not mutations to existing ones.

## v2.0 — Major Features
* **Multi-select** — `<select multiple>` with a tags/chips UI. Different enough from single-select that it warrants its own design pass.
* **Framework wrappers** — React and Vue packages that expose the lifecycle through hooks/composables rather than DOM observation.
* **Theming system** — Structured theme objects or CSS custom property sets as an alternative to style inheritance.

## Ongoing
* **Accessibility audit** — Test against NVDA/VoiceOver on each minor release.
* **Semver discipline** — Strict adherence to semantic versioning from v1.0 onward.
* **CDN publishing** — Distribution with subresource integrity (SRI) hashes.