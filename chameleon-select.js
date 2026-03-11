(function() {
	const activeChameleons = [];
	let instanceCount = 0;

	const init = () => {
		if (document.getElementById('chameleon-select-styles')) return;

		const style = document.createElement('style');
		style.id = 'chameleon-select-styles';
		style.textContent = `
			.chameleon-wrapper {
				position: relative;
				cursor: pointer;
				display: inline-block;
				vertical-align: middle;
				width: var(--ch-width, 100%);
				font-family: var(--ch-font-family, inherit);
			}

			.chameleon-wrapper:focus {
				outline: none;
			}
			
			.chameleon-wrapper.is-focused .chameleon-trigger {
				outline: var(--ch-focus-outline);
				outline-offset: var(--ch-focus-offset);
				box-shadow: var(--ch-focus-shadow);
				border-color: var(--ch-focus-border) !important;
			}

			.chameleon-trigger {
				display: flex;
				align-items: center;
				justify-content: space-between;
				background-color: var(--ch-bg);
				border: var(--ch-border);
				border-radius: var(--ch-border-radius);
				padding: var(--ch-padding);
				font-size: var(--ch-font-size);
				height: var(--ch-height);
				line-height: var(--ch-line-height);
				box-sizing: border-box;
				color: var(--ch-color);
				transition: border-color 0.2s, box-shadow 0.2s;
			}

			.chameleon-text {
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
				pointer-events: none;
			}

			.chameleon-arrow {
				margin-left: 8px;
				opacity: 0.5;
				font-size: 0.8em;
				pointer-events: none;
				transition: transform 0.2s;
			}

			.chameleon-menu {
				position: absolute;
				left: 0;
				right: 0;
				z-index: var(--ch-z-index, 1);
				display: none;
				max-height: var(--ch-max-height, 250px);
				overflow-y: auto;
				box-shadow: 0 4px 12px rgba(0,0,0,0.1);
				background-color: var(--ch-bg-fallback, #fff);
				border: var(--ch-border);
			}

			.chameleon-wrapper.open-down .chameleon-menu {
				top: 100%;
				border-radius: 0 0 var(--ch-border-radius) var(--ch-border-radius);
			}
			
			.chameleon-wrapper.open-up .chameleon-menu {
				bottom: 100%;
				border-radius: var(--ch-border-radius) var(--ch-border-radius) 0 0;
			}

			.chameleon-wrapper.is-focused.open-up .chameleon-arrow {
				transform: rotate(180deg);
			}

			.chameleon-menu::-webkit-scrollbar {
				width: 4px;
			}

			.chameleon-menu::-webkit-scrollbar-thumb {
				background: #ccc;
				border-radius: 10px;
			}

			.chameleon-select-item {
				padding: var(--ch-padding);
				color: var(--ch-color-item);
				transition: background 0.2s;
			}

			.chameleon-select-item:hover,
			.chameleon-select-item.is-highlighted {
				background-color: rgba(0,0,0,0.05) !important;
			}
		`;
		document.head.appendChild(style);

		const transform = (selectEl) => {
			const parentForm = selectEl.closest('form');
			if (!parentForm || selectEl.dataset.chameleonLoaded) return;
			selectEl.dataset.chameleonLoaded = "true";
			
			const instanceId = ++instanceCount;
			const menuId = `chameleon-menu-${instanceId}`;
			
			const refInput = parentForm.querySelector('input[type="text"], textarea, input:not([type])') || selectEl;
			const refStyle = window.getComputedStyle(refInput);
			
			const originalScroll = window.scrollY;
			refInput.focus({ preventScroll: true });
			const focusStyle = window.getComputedStyle(refInput);
			
			const focusProps = {
				outline: focusStyle.outline,
				outlineOffset: focusStyle.outlineOffset,
				boxShadow: focusStyle.boxShadow,
				borderColor: focusStyle.borderColor
			};
			refInput.blur();
			window.scrollTo(0, originalScroll);

			const getPlaceholderColor = () => {
				const temp = document.createElement('input');
				temp.placeholder = 't';
				temp.style.cssText = "position:fixed; opacity:0; pointer-events:none;";
				document.body.appendChild(temp);
				const pseudoColor = window.getComputedStyle(temp, '::placeholder').color;
				document.body.removeChild(temp);
				return (!pseudoColor || pseudoColor === refStyle.color) 
					? refStyle.color.replace('rgb', 'rgba').replace(')', ', 0.45)') 
					: pseudoColor;
			};
			
			const placeholderColor = getPlaceholderColor();
			const activeColor = refStyle.color;
			
			const wrapper = document.createElement('div');
			wrapper.className = 'chameleon-wrapper open-down';
			wrapper.tabIndex = 0;
			wrapper.setAttribute('role', 'combobox');
			wrapper.setAttribute('aria-haspopup', 'listbox');
			wrapper.setAttribute('aria-expanded', 'false');
			wrapper.setAttribute('aria-controls', menuId);

			const trigger = document.createElement('div');
			trigger.className = 'chameleon-trigger';
			const isPlaceholder = (selectEl.value === "" || selectEl.options[selectEl.selectedIndex].disabled);

			const textSpan = document.createElement('span');
			textSpan.className = 'chameleon-text';
			textSpan.textContent = selectEl.options[selectEl.selectedIndex].text;

			const arrow = document.createElement('span');
			arrow.className = 'chameleon-arrow';
			arrow.innerHTML = '&#9662;';

			const menu = document.createElement('div');
			menu.className = 'chameleon-menu';
			menu.id = menuId;
			menu.setAttribute('role', 'listbox');

			const isTransparent = refStyle.backgroundColor === 'transparent' || 
				refStyle.backgroundColor === 'rgba(0, 0, 0, 0)' || 
				refStyle.backgroundColor === 'initial';

			const getDynamicZIndex = () => {
				let highest = 1;
				const siblings = parentForm.querySelectorAll('*');
				siblings.forEach(el => {
					const z = parseInt(window.getComputedStyle(el).zIndex);
					if (!isNaN(z) && z > highest) highest = z;
				});
				return highest + 1;
			};

			const calculatePositioning = () => {
				const rect = wrapper.getBoundingClientRect();
				const spaceBelow = window.innerHeight - rect.bottom;
				const spaceAbove = rect.top;
				const threshold = 300;
				
				const shouldFlip = spaceBelow < threshold && spaceAbove > spaceBelow;
				wrapper.classList.toggle('open-up', shouldFlip);
				wrapper.classList.toggle('open-down', !shouldFlip);

				const availableSpace = shouldFlip ? spaceAbove : spaceBelow;
				return Math.max(availableSpace - 20, 150);
			};

			const styles = {
				'--ch-width': selectEl.offsetWidth ? selectEl.offsetWidth + 'px' : '100%',
				'--ch-font-family': refStyle.fontFamily,
				'--ch-bg': refStyle.backgroundColor,
				'--ch-border': refStyle.border,
				'--ch-border-radius': refStyle.borderRadius,
				'--ch-padding': refStyle.padding,
				'--ch-font-size': refStyle.fontSize,
				'--ch-height': refStyle.height,
				'--ch-line-height': refStyle.lineHeight,
				'--ch-color': isPlaceholder ? placeholderColor : activeColor,
				'--ch-color-item': activeColor,
				'--ch-bg-fallback': isTransparent ? '#ffffff' : refStyle.backgroundColor,
				'--ch-focus-outline': focusProps.outline,
				'--ch-focus-offset': focusProps.outlineOffset,
				'--ch-focus-shadow': focusProps.boxShadow,
				'--ch-focus-border': focusProps.borderColor,
				'--ch-z-index': getDynamicZIndex(),
				'--ch-max-height': '250px' 
			};
			for (const [key, value] of Object.entries(styles)) { wrapper.style.setProperty(key, value); }
			
			const items = Array.from(selectEl.options).map((opt, index) => {
				const item = document.createElement('div');
				item.className = 'chameleon-select-item';
				item.textContent = opt.text;
				item.setAttribute('role', 'option');
				item.setAttribute('aria-selected', selectEl.selectedIndex === index);
				
				item.onclick = (e) => {
					e.stopPropagation();
					selectByIndex(index);
					closeMenu();
				};
				menu.appendChild(item);
				return item;
			});

			const selectByIndex = (index) => {
				const opt = selectEl.options[index];
				selectEl.selectedIndex = index;
				textSpan.textContent = opt.text;
				wrapper.style.setProperty('--ch-color', activeColor);
				
				// Update ARIA selection
				items.forEach((item, i) => item.setAttribute('aria-selected', i === index));
				
				selectEl.dispatchEvent(new Event('change', { bubbles: true }));
				items.forEach(i => i.classList.remove('is-highlighted'));
				items[index].classList.add('is-highlighted');
			};

			const closeMenu = () => {
				menu.style.display = 'none';
				wrapper.classList.remove('is-focused');
				wrapper.setAttribute('aria-expanded', 'false');
			};
			
			const toggleMenu = (e) => {
				e.stopPropagation();
				const isOpen = menu.style.display === 'block';
				document.querySelectorAll('.chameleon-menu').forEach(m => {
					if (m !== menu) m.style.display = 'none';
				});
				
				if (!isOpen) {
					const dynamicMaxHeight = calculatePositioning();
					wrapper.style.setProperty('--ch-z-index', getDynamicZIndex());
					wrapper.style.setProperty('--ch-max-height', dynamicMaxHeight + 'px');
					menu.style.display = 'block';
					wrapper.classList.add('is-focused');
					wrapper.setAttribute('aria-expanded', 'true');
				} else {
					closeMenu();
				}
			};

			trigger.onclick = toggleMenu;
			
			wrapper.onfocus = () => {
				calculatePositioning();
				wrapper.classList.add('is-focused');
			};
			wrapper.onblur = () => {
				closeMenu();
			}

			wrapper.onkeydown = (e) => {
				const isOpen = menu.style.display === 'block';
				let currIndex = selectEl.selectedIndex;
				switch(e.key) {
					case 'Enter': case ' ': e.preventDefault(); toggleMenu(e); break;
					case 'ArrowDown': e.preventDefault(); if(!isOpen) toggleMenu(e); if(currIndex < items.length - 1) selectByIndex(currIndex + 1); break;
					case 'ArrowUp': e.preventDefault(); if(!isOpen) toggleMenu(e); if(currIndex > 0) selectByIndex(currIndex - 1); break;
					case 'Escape': closeMenu(); break;
				}
			};
			
			selectEl.style.display = 'none';
			trigger.append(textSpan, arrow);
			wrapper.append(trigger, menu);
			selectEl.parentNode.insertBefore(wrapper, selectEl);

			activeChameleons.push({ wrapper, selectEl });
		};
		
		document.querySelectorAll('select').forEach(transform);
		
		const observer = new MutationObserver(mutations => {
			mutations.forEach(m => m.addedNodes.forEach(node => {
				if (node.nodeName === 'SELECT') transform(node);
				else if (node.querySelectorAll) node.querySelectorAll('select').forEach(transform);
			}));
		});
		observer.observe(document.body, { childList: true, subtree: true });

		let resizeTimer;
		window.addEventListener('resize', () => {
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(() => {
				activeChameleons.forEach(({ wrapper, selectEl }) => {
					selectEl.style.display = 'inline-block';
					const newWidth = selectEl.offsetWidth;
					selectEl.style.display = 'none';
					wrapper.style.setProperty('--ch-width', newWidth ? newWidth + 'px' : '100%');
				});
			}, 150);
		});
	};
	
	document.addEventListener('click', (e) => {
		if (!e.target.closest('.chameleon-wrapper')) {
			document.querySelectorAll('.chameleon-menu').forEach(m => m.style.display = 'none');
			document.querySelectorAll('.chameleon-wrapper').forEach(w => {
				w.classList.remove('is-focused');
				w.setAttribute('aria-expanded', 'false');
			});
		}
	});
	
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
	else init();
})();