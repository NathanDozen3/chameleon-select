(function() {
	let activeChameleons = [];
	let instanceCount = 0;

	const init = () => {
		if (document.getElementById('chameleon-select-styles')) return;

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

			.chameleon-wrapper:focus {
				outline: none;
			}
			
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

			.chameleon-wrapper.is-focused .chameleon-arrow {
				transform: rotate(180deg);
			}

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

			.chameleon-menu::-webkit-scrollbar {
				width: 4px;
			}

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

			.chameleon-select-item:hover,
			.chameleon-select-item.is-highlighted {
				background-color: rgba(0,0,0,0.05) !important;
			}

			.chameleon-select-item.is-disabled {
				cursor: not-allowed;
				opacity: 0.4;
			}

			.chameleon-group-label {
				background: rgba(0,0,0,0.02);
				font-weight: bold;
				font-size: 0.85em;
				opacity: 0.7;
				padding: var(--ch-padding);
				pointer-events: none;
			}
		`;
		document.head.appendChild(style);

		const transform = (selectEl) => {
			const parentForm = selectEl.closest('form') || document.body;
			if (selectEl.dataset.chameleonLoaded) return;
			selectEl.dataset.chameleonLoaded = "true";
			
			const instanceId = ++instanceCount;
			const menuId = `chameleon-menu-${instanceId}`;
			
			const refInput = parentForm.querySelector('input[type="text"], textarea, input:not([type])') || selectEl;
			const refStyle = window.getComputedStyle(refInput);
			
			/** * Style Sniffing: We momentarily focus a sibling input to capture the active 
			 * focus ring styles (outline, shadow, border) so the custom select perfectly 
			 * matches the site's theme. originalScroll/preventScroll prevent jarring jumps.
			 */
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
			if (window.scrollY !== originalScroll) window.scrollTo(0, originalScroll);

			/** * Placeholder Color: Since ::placeholder pseudo-elements aren't directly 
			 * accessible via getComputedStyle, we append a temporary input to the local 
			 * form context to inherit context-specific placeholder styles.
			 */
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

			// Fallback to white if background is transparent (standard for absolute menus)
			const isTransparent = refStyle.backgroundColor === 'transparent' || 
				refStyle.backgroundColor === 'rgba(0, 0, 0, 0)' || 
				refStyle.backgroundColor === 'initial';

			const highestZ = (() => {
				let max = 1;
				parentForm.querySelectorAll('*').forEach(el => {
					const z = parseInt(window.getComputedStyle(el).zIndex);
					if (!isNaN(z) && z > max) max = z;
				});
				return max + 1;
			})();

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
				'--ch-bg': refStyle.backgroundColor,
				'--ch-bg-fallback': isTransparent ? '#ffffff' : refStyle.backgroundColor,
				'--ch-border': refStyle.border,
				'--ch-border-radius': refStyle.borderRadius,
				'--ch-color': isPlaceholder ? placeholderColor : activeColor,
				'--ch-color-item': activeColor,
				'--ch-focus-border': focusProps.borderColor,
				'--ch-focus-offset': focusProps.outlineOffset,
				'--ch-focus-outline': focusProps.outline,
				'--ch-focus-shadow': focusProps.boxShadow,
				'--ch-font-family': refStyle.fontFamily,
				'--ch-font-size': refStyle.fontSize,
				'--ch-height': refStyle.height,
				'--ch-line-height': refStyle.lineHeight,
				'--ch-max-height': '250px',
				'--ch-padding': refStyle.padding,
				'--ch-width': selectEl.offsetWidth ? selectEl.offsetWidth + 'px' : '100%',
				'--ch-z-index': highestZ
			};
			for (const [key, value] of Object.entries(styles)) { wrapper.style.setProperty(key, value); }
			
			const itemRefs = [];
			const createItem = (opt, index) => {
				const item = document.createElement('div');
				item.className = 'chameleon-select-item';
				item.id = `${menuId}-opt-${index}`;
				item.textContent = opt.text;
				item.setAttribute('role', 'option');
				item.setAttribute('aria-selected', selectEl.selectedIndex === index);
				
				if (opt.disabled) {
					item.classList.add('is-disabled');
					item.setAttribute('aria-disabled', 'true');
				}

				/**
				 * Use onmousedown + preventDefault to beat the 'blur' event.
				 * This ensures the menu doesn't vanish before the click/selection 
				 * logic finishes processing.
				 */
				item.onmousedown = (e) => {
					if (opt.disabled) return e.preventDefault();
					e.preventDefault(); 
					selectByIndex(index);
					closeMenu();
				};
				menu.appendChild(item);
				itemRefs.push(item);
			};

			const buildMenu = () => {
				menu.innerHTML = '';
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

			const selectByIndex = (index) => {
				const opt = selectEl.options[index];
				if (!opt || opt.disabled) return;

				selectEl.selectedIndex = index;
				textSpan.textContent = opt.text;
				wrapper.style.setProperty('--ch-color', activeColor);
				wrapper.setAttribute('aria-activedescendant', itemRefs[index].id);
				itemRefs.forEach((item, i) => item.setAttribute('aria-selected', i === index));
				
				selectEl.dispatchEvent(new Event('change', { bubbles: true }));
				itemRefs.forEach(i => i.classList.remove('is-highlighted'));
				itemRefs[index].classList.add('is-highlighted');
				
				if (menu.style.display === 'block') {
					itemRefs[index].scrollIntoView({ block: 'nearest' });
				}
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
					const dynamicMaxHeight = calculatePositioning();
					wrapper.style.setProperty('--ch-max-height', dynamicMaxHeight + 'px');
					menu.style.display = 'block';
					wrapper.classList.add('is-focused');
					wrapper.setAttribute('aria-expanded', 'true');
					wrapper.setAttribute('aria-activedescendant', itemRefs[selectEl.selectedIndex].id);
				} else {
					closeMenu();
				}
			};

			buildMenu();
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
				const currIndex = selectEl.selectedIndex;
				switch(e.key) {
					case 'Enter': case ' ': e.preventDefault(); toggleMenu(e); break;
					case 'ArrowDown': {
						e.preventDefault(); 
						if(!isOpen) toggleMenu(e); 
						// Skip over disabled options
						let next = currIndex + 1;
						while(next < itemRefs.length && selectEl.options[next].disabled) next++;
						if(next < itemRefs.length) selectByIndex(next);
						break;
					}
					case 'ArrowUp': {
						e.preventDefault(); 
						if(!isOpen) toggleMenu(e); 
						// Skip over disabled options
						let prev = currIndex - 1;
						while(prev >= 0 && selectEl.options[prev].disabled) prev--;
						if(prev >= 0) selectByIndex(prev);
						break;
					}
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
			mutations.forEach(m => {
				m.addedNodes.forEach(node => {
					if (node.nodeName === 'SELECT') transform(node);
					else if (node.querySelectorAll) node.querySelectorAll('select').forEach(transform);
				});
				
				m.removedNodes.forEach(node => {
					const findAndPrune = (el) => {
						const index = activeChameleons.findIndex(item => item.selectEl === el);
						if (index !== -1) {
							const { wrapper } = activeChameleons[index];
							if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
							activeChameleons.splice(index, 1);
						}
					};

					if (node.nodeName === 'SELECT') findAndPrune(node);
					else if (node.querySelectorAll) node.querySelectorAll('select').forEach(findAndPrune);
				});
			});
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
		if (!e.target.closest('.chameleon-wrapper') && activeChameleons.length) {
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