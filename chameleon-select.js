/**
 * Chameleon Select v1.1.1
 * A zero-config, style-sniffing custom select utility.
 * Author: Nathan Johnson
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Chameleon = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** @type {Map<HTMLSelectElement, { wrapper: HTMLElement, selectEl: HTMLSelectElement, syncFromNative: Function, options: Object }>} */
  const activeChameleons = new Map();
  /** @type {Map<Node, MutationObserver>} */
  const activeObservers = new Map();

  let instanceCount = 0;
  let globalListenersInitialized = false;
  let isStylesInjected = false;

  const injectStyles = () => {
    if (document.getElementById('chameleon-select-styles') || isStylesInjected) return;
    const style = document.createElement('style');
    style.id = 'chameleon-select-styles';
    style.textContent = `
      .chameleon-wrapper {
        cursor: pointer;
        display: inline-block;
        font-family: var(--ch-font-family, inherit);
        position: relative;
        user-select: none;
        vertical-align: middle;
        width: var(--ch-width, 100%);
      }
      .chameleon-wrapper:focus { outline: none; }
      .chameleon-wrapper.is-focused .chameleon-trigger {
        border-color: var(--ch-focus-border) !important;
        box-shadow: var(--ch-focus-shadow);
        outline: var(--ch-focus-outline);
        outline-offset: var(--ch-focus-offset);
      }
      .chameleon-trigger {
        align-items: center;
        background-color: var(--ch-bg);
        border: var(--ch-border);
        border-radius: var(--ch-border-radius);
        box-sizing: border-box;
        color: var(--ch-color);
        display: flex;
        font-size: var(--ch-font-size);
        height: var(--ch-height);
        justify-content: space-between;
        line-height: var(--ch-line-height);
        padding: var(--ch-padding);
        transition: border-color 0.2s, box-shadow 0.2s;
      }
      .chameleon-text {
        overflow: hidden;
        pointer-events: none;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .chameleon-arrow {
        font-size: 0.8em;
        margin-left: 8px;
        opacity: 0.5;
        pointer-events: none;
        transition: transform 0.2s ease;
      }
      .chameleon-wrapper.is-focused .chameleon-arrow { transform: rotate(180deg); }
      .chameleon-menu {
        background-color: var(--ch-bg-fallback, #fff);
        border: var(--ch-border);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        display: none;
        left: 0;
        max-height: var(--ch-max-height, 250px);
        overflow-y: auto;
        position: absolute;
        right: 0;
        z-index: var(--ch-z-index, 1);
      }
      .chameleon-wrapper.open-down .chameleon-menu {
        border-radius: 0 0 var(--ch-border-radius) var(--ch-border-radius);
        top: 100%;
      }
      .chameleon-wrapper.open-up .chameleon-menu {
        bottom: 100%;
        border-radius: var(--ch-border-radius) var(--ch-border-radius) 0 0;
      }
      .chameleon-menu::-webkit-scrollbar { width: 4px; }
      .chameleon-menu::-webkit-scrollbar-thumb {
        background: #ccc;
        border-radius: 10px;
      }
      .chameleon-select-item {
        color: var(--ch-color-item);
        cursor: pointer;
        padding: var(--ch-padding);
        transition: background 0.1s;
      }
      .chameleon-select-item:hover, .chameleon-select-item.is-highlighted {
        background-color: rgba(0,0,0,0.05) !important;
      }
      .chameleon-select-item.is-disabled {
        cursor: not-allowed;
        opacity: 0.4;
      }
      .chameleon-group-label {
        background: rgba(0,0,0,0.02);
        font-size: 0.85em;
        font-weight: bold;
        opacity: 0.7;
        padding: var(--ch-padding);
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
    isStylesInjected = true;
  };

  const initInstance = (selectEl, options = {}) => {
    const { mobileBreakpoint = 768 } = options;
    if (window.innerWidth < mobileBreakpoint) return;

    if (selectEl.dataset.chameleonLoaded) return;

    const { sniff = true } = options;
    const parentForm = selectEl.closest('form') || document.body;
    const instanceId = ++instanceCount;
    const menuId = `chameleon-menu-${instanceId}`;

    const refInput = parentForm.querySelector('input[type="text"], textarea, input:not([type])') || selectEl;
    const refStyle = window.getComputedStyle(refInput);

    let focusProps = {
      borderColor: 'rgba(0,0,0,0.1)',
      boxShadow: 'none',
      outline: '1px solid currentColor',
      outlineOffset: '2px'
    };

    if (sniff) {
      const originalScroll = window.scrollY;
      refInput.focus({ preventScroll: true });
      const focusStyle = window.getComputedStyle(refInput);
      focusProps = {
        borderColor: focusStyle.borderColor,
        boxShadow: focusStyle.boxShadow,
        outline: focusStyle.outline,
        outlineOffset: focusStyle.outlineOffset
      };
      refInput.blur();
      if (window.scrollY !== originalScroll) window.scrollTo(0, originalScroll);
    }

    const placeholderColor = (() => {
      const temp = document.createElement('input');
      temp.placeholder = 't';
      temp.style.cssText = "position:fixed; opacity:0; pointer-events:none;";
      parentForm.appendChild(temp);
      const color = window.getComputedStyle(temp, '::placeholder').color;
      parentForm.removeChild(temp);
      if (!color || color === refStyle.color) {
        const rgb = refStyle.color.match(/\d+/g);
        return rgb ? `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.45)` : 'rgba(0,0,0,0.45)';
      }
      return color;
    })();

    const activeColor = refStyle.color;
    const wrapper = document.createElement('div');
    wrapper.className = 'chameleon-wrapper open-down';
    wrapper.tabIndex = 0;
    wrapper.setAttribute('role', 'combobox');
    wrapper.setAttribute('aria-haspopup', 'listbox');
    wrapper.setAttribute('aria-expanded', 'false');
    wrapper.setAttribute('aria-controls', menuId);

    const nativeLabel = selectEl.labels && selectEl.labels[0];
    if (nativeLabel) {
      if (!nativeLabel.id) nativeLabel.id = `chameleon-label-${instanceId}`;
      wrapper.setAttribute('aria-labelledby', nativeLabel.id);
    }

    const trigger = document.createElement('div');
    trigger.className = 'chameleon-trigger';
    const textSpan = document.createElement('span');
    textSpan.className = 'chameleon-text';
    const arrow = document.createElement('span');
    arrow.className = 'chameleon-arrow';
    arrow.innerHTML = '&#9662;';

    const menu = document.createElement('div');
    menu.className = 'chameleon-menu';
    menu.id = menuId;
    menu.setAttribute('role', 'listbox');

    const styles = {
      '--ch-bg': refStyle.backgroundColor,
      '--ch-bg-fallback': (refStyle.backgroundColor === 'transparent' || refStyle.backgroundColor.includes('rgba(0, 0, 0, 0)')) ? '#fff' : refStyle.backgroundColor,
      '--ch-border': refStyle.border,
      '--ch-border-radius': refStyle.borderRadius,
      '--ch-color-item': activeColor,
      '--ch-focus-border': focusProps.borderColor,
      '--ch-focus-offset': focusProps.outlineOffset,
      '--ch-focus-outline': focusProps.outline,
      '--ch-focus-shadow': focusProps.boxShadow,
      '--ch-font-family': refStyle.fontFamily,
      '--ch-font-size': refStyle.fontSize,
      '--ch-height': refStyle.height,
      '--ch-line-height': refStyle.lineHeight,
      '--ch-padding': refStyle.padding,
      '--ch-width': selectEl.offsetWidth ? selectEl.offsetWidth + 'px' : '100%',
      '--ch-z-index': 999
    };
    for (const [key, value] of Object.entries(styles)) { wrapper.style.setProperty(key, value); }

    const itemRefs = [];

    const syncFromNative = () => {
      const index = selectEl.selectedIndex;
      const opt = selectEl.options[index];
      if (!opt) return;

      textSpan.textContent = opt.text;
      const isPlaceholder = opt.disabled || selectEl.value === "";
      wrapper.style.setProperty('--ch-color', isPlaceholder ? placeholderColor : activeColor);
      wrapper.setAttribute('aria-activedescendant', itemRefs[index]?.id || '');

      itemRefs.forEach((item, i) => {
        item.setAttribute('aria-selected', i === index ? 'true' : 'false');
        item.classList.toggle('is-highlighted', i === index);
        if (i === index && menu.style.display === 'block') {
          item.scrollIntoView({ block: 'nearest' });
        }
      });
    };

    const createItem = (opt, index) => {
      const item = document.createElement('div');
      item.className = 'chameleon-select-item';
      item.id = `${menuId}-opt-${index}`;
      item.textContent = opt.text;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', 'false');
      if (opt.disabled) {
        item.classList.add('is-disabled');
        item.setAttribute('aria-disabled', 'true');
      }
      item.onmousedown = (e) => {
        if (opt.disabled) return e.preventDefault();
        e.preventDefault();
        selectEl.selectedIndex = index;
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        closeMenu();
      };
      menu.appendChild(item);
      itemRefs.push(item);
    };

    const buildMenu = () => {
      menu.innerHTML = '';
      itemRefs.length = 0;
      let flatIndex = 0;
      Array.from(selectEl.children).forEach(child => {
        if (child.tagName === 'OPTGROUP') {
          const label = document.createElement('div');
          label.className = 'chameleon-group-label';
          label.textContent = child.label;
          menu.appendChild(label);
          Array.from(child.children).forEach(opt => createItem(opt, flatIndex++));
        } else {
          createItem(child, flatIndex++);
        }
      });
    };

    const closeMenu = () => {
      menu.style.display = 'none';
      wrapper.classList.remove('is-focused');
      wrapper.setAttribute('aria-expanded', 'false');
    };

    const toggleMenu = (e) => {
      e.stopPropagation();
      const isOpen = menu.style.display === 'block';
      if (!isOpen) {
        const rect = wrapper.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const threshold = 300;
        const shouldFlip = spaceBelow < threshold && spaceAbove > spaceBelow;
        wrapper.classList.toggle('open-up', shouldFlip);
        wrapper.classList.toggle('open-down', !shouldFlip);
        wrapper.style.setProperty('--ch-max-height', (Math.max(shouldFlip ? spaceAbove : spaceBelow, 150) - 20) + 'px');

        menu.style.display = 'block';
        wrapper.classList.add('is-focused');
        wrapper.setAttribute('aria-expanded', 'true');
        syncFromNative();
      } else {
        closeMenu();
      }
    };

    let searchBuffer = '';
    let searchTimer = null;

    const handleTypeAhead = (key) => {
      clearTimeout(searchTimer);
      searchBuffer += key.toLowerCase();
      searchTimer = setTimeout(() => { searchBuffer = ''; }, 500);

      const matchIndex = Array.from(selectEl.options).findIndex((opt, idx) => {
        return !opt.disabled && opt.text.toLowerCase().startsWith(searchBuffer);
      });

      if (matchIndex !== -1) {
        selectEl.selectedIndex = matchIndex;
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };

    const originalDescriptors = {
      selectedIndex: Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'selectedIndex'),
      value: Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')
    };

    ['selectedIndex', 'value'].forEach(prop => {
      Object.defineProperty(selectEl, prop, {
        get() { return originalDescriptors[prop].get.call(this); },
        set(val) {
          originalDescriptors[prop].set.call(this, val);
          syncFromNative();
        },
        configurable: true
      });
    });

    selectEl.addEventListener('change', syncFromNative);

    buildMenu();
    syncFromNative();

    trigger.onclick = toggleMenu;
    wrapper.onfocus = () => wrapper.classList.add('is-focused');
    wrapper.onblur = closeMenu;

    wrapper.onkeydown = (e) => {
      const isOpen = menu.style.display === 'block';
      const currIndex = selectEl.selectedIndex;

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && e.key !== ' ') {
        handleTypeAhead(e.key);
        return;
      }

      switch(e.key) {
        case 'Enter': case ' ': e.preventDefault(); toggleMenu(e); break;
        case 'ArrowDown': {
          e.preventDefault();
          if(!isOpen) toggleMenu(e);
          let next = currIndex + 1;
          while(next < itemRefs.length && selectEl.options[next].disabled) next++;
          if(next < itemRefs.length) {
            selectEl.selectedIndex = next;
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));
          }
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          if(!isOpen) toggleMenu(e);
          let prev = currIndex - 1;
          while(prev >= 0 && selectEl.options[prev].disabled) prev--;
          if(prev >= 0) {
            selectEl.selectedIndex = prev;
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));
          }
          break;
        }
        case 'Escape': closeMenu(); break;
      }
    };

    selectEl.style.display = 'none';
    trigger.append(textSpan, arrow);
    wrapper.append(trigger, menu);
    selectEl.parentNode.insertBefore(wrapper, selectEl);

    selectEl.dataset.chameleonLoaded = "true";
    activeChameleons.set(selectEl, { wrapper, selectEl, syncFromNative, options });
  };

  const destroyInstance = (selectEl) => {
    const instance = activeChameleons.get(selectEl);
    if (instance) {
      instance.wrapper.remove();
      selectEl.style.display = '';
      delete selectEl.dataset.chameleonLoaded;
      delete selectEl.selectedIndex;
      delete selectEl.value;
      selectEl.removeEventListener('change', instance.syncFromNative);
      activeChameleons.delete(selectEl);
    }
  };

  const setupGlobalListeners = () => {
    if (globalListenersInitialized) return;

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        activeChameleons.forEach((inst, selectEl) => {
          const { mobileBreakpoint = 768 } = inst.options;

          // Breakpoint logic: toggle custom UI based on width
          if (window.innerWidth < mobileBreakpoint) {
             destroyInstance(selectEl);
          } else {
             // If it's desktop width but the custom UI isn't loaded, load it.
             if (!selectEl.dataset.chameleonLoaded) {
               initInstance(selectEl, inst.options);
             } else {
               // Normal resize width update
               inst.selectEl.style.display = 'inline-block';
               const newWidth = inst.selectEl.offsetWidth;
               inst.selectEl.style.display = 'none';
               inst.wrapper.style.setProperty('--ch-width', newWidth ? newWidth + 'px' : '100%');
             }
          }
        });
      }, 150);
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.chameleon-wrapper')) {
        activeChameleons.forEach(inst => {
          inst.wrapper.querySelector('.chameleon-menu').style.display = 'none';
          inst.wrapper.classList.remove('is-focused');
          inst.wrapper.setAttribute('aria-expanded', 'false');
        });
      }
    });

    globalListenersInitialized = true;
  };

  const api = {
    version: '1.1.1',
    init: function(container = document, options = {}) {
      const { watch = true } = options;
      injectStyles();
      setupGlobalListeners();
      const targets = container instanceof HTMLSelectElement ? [container] : container.querySelectorAll('select');

      targets.forEach(t => {
        if (t.dataset.chameleon === 'false') return;
        initInstance(t, options);
      });

      if (watch) {
        const watchTarget = container instanceof HTMLSelectElement ? (container.parentNode || container) : container;
        if (activeObservers.has(watchTarget)) activeObservers.get(watchTarget).disconnect();
        const obs = new MutationObserver(mutations => {
          mutations.forEach(m => {
            m.addedNodes.forEach(n => {
              if (n.nodeName === 'SELECT' && n.dataset.chameleon !== 'false') initInstance(n, options);
              else if (n.querySelectorAll) n.querySelectorAll('select:not([data-chameleon="false"])').forEach(sel => initInstance(sel, options));
            });
            m.removedNodes.forEach(n => {
              if (n.nodeName === 'SELECT') destroyInstance(n);
              else if (n.querySelectorAll) n.querySelectorAll('select').forEach(destroyInstance);
            });
          });
        });
        obs.observe(watchTarget, { childList: true, subtree: true });
        activeObservers.set(watchTarget, obs);
      }
    },
    destroy: destroyInstance,
    refresh: (el, options = {}) => { destroyInstance(el); api.init(el, options); }
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => api.init());
    } else {
      api.init();
    }
  }

  return api;
}));
