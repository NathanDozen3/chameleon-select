(function() {
	const init = () => {
		if (document.getElementById('chameleon-select-styles')) return;

		const style = document.createElement('style');
		style.id = 'chameleon-select-styles';
		style.textContent = `
			.chameleon-wrapper { position: relative; cursor: pointer; display: inline-block; vertical-align: middle; width: var(--ch-width, 200px); font-family: var(--ch-font-family, inherit); }
			.chameleon-wrapper:focus { outline: none; }
			
			/* Mimic the refInput focus style dynamically */
			.chameleon-wrapper.is-focused .chameleon-trigger { 
				outline: var(--ch-focus-outline);
				outline-offset: var(--ch-focus-offset);
				box-shadow: var(--ch-focus-shadow);
				border-color: var(--ch-focus-border) !important;
			}

			.chameleon-trigger { display: flex; align-items: center; justify-content: space-between; background-color: var(--ch-bg); border: var(--ch-border); border-radius: var(--ch-border-radius); padding: var(--ch-padding); font-size: var(--ch-font-size); height: var(--ch-height); line-height: var(--ch-line-height); box-sizing: border-box; color: var(--ch-color); transition: border-color 0.2s, box-shadow 0.2s; }
			.chameleon-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; pointer-events: none; }
			.chameleon-arrow { margin-left: 8px; opacity: 0.5; font-size: 0.8em; pointer-events: none; }
			.chameleon-menu { position: absolute; top: 100%; left: 0; right: 0; z-index: 9999; display: none; max-height: 250px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.1); background-color: var(--ch-bg-fallback, #fff); border: var(--ch-border); border-radius: 0 0 var(--ch-border-radius) var(--ch-border-radius); }
			.chameleon-menu::-webkit-scrollbar { width: 4px; }
			.chameleon-menu::-webkit-scrollbar-thumb { background: #ccc; border-radius: 10px; }
			.chameleon-select-item { padding: var(--ch-padding); color: var(--ch-color-item); transition: background 0.2s; }
			.chameleon-select-item:hover, .chameleon-select-item.is-highlighted { background-color: rgba(0,0,0,0.05) !important; }
		`;
		document.head.appendChild(style);

		const transform = (selectEl) => {
			const parentForm = selectEl.closest('form');
			if (!parentForm || selectEl.dataset.chameleonLoaded) return;
			selectEl.dataset.chameleonLoaded = "true";
			
			const refInput = parentForm.querySelector('input[type="text"], textarea, input:not([type])') || selectEl;
			
			// 1. Capture Normal Styles
			const refStyle = window.getComputedStyle(refInput);
			
			// 2. Capture Focus Styles (The Trick)
			// We temporarily focus the refInput to see what happens to it
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
			window.scrollTo(0, originalScroll); // Just in case

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
			wrapper.className = 'chameleon-wrapper';
			wrapper.tabIndex = 0; 

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

			// Set Variables (Including Focus Props)
			const styles = {
				'--ch-width': (selectEl.offsetWidth || 200) + 'px',
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
				'--ch-bg-fallback': (refStyle.backgroundColor.includes('rgba(0,0,0,0)') ? '#fff' : refStyle.backgroundColor),
				// Focus styles
				'--ch-focus-outline': focusProps.outline,
				'--ch-focus-offset': focusProps.outlineOffset,
				'--ch-focus-shadow': focusProps.boxShadow,
				'--ch-focus-border': focusProps.borderColor
			};
			for (const [key, value] of Object.entries(styles)) { wrapper.style.setProperty(key, value); }
			
			const items = Array.from(selectEl.options).map((opt, index) => {
				const item = document.createElement('div');
				item.className = 'chameleon-select-item';
				item.textContent = opt.text;
				item.onclick = (e) => {
					e.stopPropagation();
					selectByIndex(index);
					menu.style.display = 'none';
					wrapper.classList.remove('is-focused');
				};
				menu.appendChild(item);
				return item;
			});

			const selectByIndex = (index) => {
				const opt = selectEl.options[index];
				selectEl.selectedIndex = index;
				textSpan.textContent = opt.text;
				wrapper.style.setProperty('--ch-color', activeColor);
				selectEl.dispatchEvent(new Event('change', { bubbles: true }));
				items.forEach(i => i.classList.remove('is-highlighted'));
				items[index].classList.add('is-highlighted');
			};
			
			const toggleMenu = (e) => {
				e.stopPropagation();
				const isOpen = menu.style.display === 'block';
				document.querySelectorAll('.chameleon-menu').forEach(m => m.style.display = 'none');
				menu.style.display = isOpen ? 'none' : 'block';
				if (!isOpen) wrapper.classList.add('is-focused');
			};

			trigger.onclick = toggleMenu;
			
			// Manage Focus Classes
			wrapper.onfocus = () => wrapper.classList.add('is-focused');
			wrapper.onblur = () => {
				wrapper.classList.remove('is-focused');
				menu.style.display = 'none';
			}

			// Keyboard Nav
			wrapper.onkeydown = (e) => {
				const isOpen = menu.style.display === 'block';
				let currIndex = selectEl.selectedIndex;
				switch(e.key) {
					case 'Enter': case ' ': e.preventDefault(); toggleMenu(e); break;
					case 'ArrowDown': e.preventDefault(); if(!isOpen) menu.style.display='block'; if(currIndex < items.length - 1) selectByIndex(currIndex + 1); break;
					case 'ArrowUp': e.preventDefault(); if(!isOpen) menu.style.display='block'; if(currIndex > 0) selectByIndex(currIndex - 1); break;
					case 'Escape': menu.style.display = 'none'; break;
				}
			};
			
			selectEl.style.display = 'none';
			trigger.append(textSpan, arrow);
			wrapper.append(trigger, menu);
			selectEl.parentNode.insertBefore(wrapper, selectEl);
		};
		
		document.querySelectorAll('select').forEach(transform);
		
		const observer = new MutationObserver(mutations => {
			mutations.forEach(m => m.addedNodes.forEach(node => {
				if (node.nodeName === 'SELECT') transform(node);
				else if (node.querySelectorAll) node.querySelectorAll('select').forEach(transform);
			}));
		});
		observer.observe(document.body, { childList: true, subtree: true });
	};
	
	document.addEventListener('click', (e) => {
		if (!e.target.closest('.chameleon-wrapper')) {
			document.querySelectorAll('.chameleon-menu').forEach(m => m.style.display = 'none');
			document.querySelectorAll('.chameleon-wrapper').forEach(w => w.classList.remove('is-focused'));
		}
	});
	
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
	else init();
})();