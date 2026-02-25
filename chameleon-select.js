
(function() {
	const init = () => {
		// 1. Inject minimal dynamic CSS for pseudo-classes
		if (!document.getElementById('chameleon-select-styles')) {
			const style = document.createElement('style');
			style.id = 'chameleon-select-styles';
			style.textContent = `
				.chameleon-select-item:hover { background-color: rgba(0,0,0,0.05) !important; }
				.chameleon-wrapper:focus { outline: none; }
				.chameleon-menu::-webkit-scrollbar { width: 6px; }
				.chameleon-menu::-webkit-scrollbar-thumb { background: #ccc; border-radius: 10px; }
			`;
			document.head.appendChild(style);
		}
		
		const transform = (selectEl) => {
			if (selectEl.dataset.chameleonLoaded) return;
			selectEl.dataset.chameleonLoaded = "true";
			
			const parentForm = selectEl.closest('form');
			const refInput = (parentForm ? parentForm.querySelector('input[type="text"], input:not([type])') : null) 
				|| document.querySelector('input[type="text"]') 
				|| document.createElement('input');
				
			const refStyle = window.getComputedStyle(refInput);
			
			const getPlaceholderColor = () => {
				const temp = document.createElement('input');
				temp.placeholder = 't';
				temp.style.cssText = "position:absolute; opacity:0; pointer-events:none;";
				document.body.appendChild(temp);
				const pseudoColor = window.getComputedStyle(temp, '::placeholder').color;
				document.body.removeChild(temp);
				if (!pseudoColor || pseudoColor === refStyle.color) {
					return refStyle.color.replace('rgb', 'rgba').replace(')', ', 0.45)');
				}
				return pseudoColor;
			};
			
			const placeholderColor = getPlaceholderColor();
			const activeColor = refStyle.color;
			
			const wrapper = document.createElement('div');
			wrapper.className = 'chameleon-wrapper';
			wrapper.tabIndex = 0; // Accessible
			wrapper.style.cssText = `
				position: relative; cursor: pointer; display: inline-block; vertical-align: middle;
				width: ${selectEl.offsetWidth || 200}px; font-family: ${refStyle.fontFamily};
			`;
			
			const trigger = document.createElement('div');
			const isPlaceholder = (selectEl.value === "" || selectEl.options[selectEl.selectedIndex].disabled);
			
			trigger.style.cssText = `
				display: flex; align-items: center; justify-content: space-between;
				background-color: ${refStyle.backgroundColor}; border: ${refStyle.border};
				border-radius: ${refStyle.borderRadius}; padding: ${refStyle.padding};
				font-size: ${refStyle.fontSize}; height: ${refStyle.height};
				line-height: ${refStyle.lineHeight}; box-sizing: border-box;
				color: ${isPlaceholder ? placeholderColor : activeColor};
			`;
			
			const textSpan = document.createElement('span');
			textSpan.style.cssText = "white-space:nowrap; overflow:hidden; text-overflow:ellipsis;";
			textSpan.textContent = selectEl.options[selectEl.selectedIndex].text;
			
			const arrow = document.createElement('span');
			arrow.innerHTML = '&#9662;';
			arrow.style.cssText = "margin-left:8px; opacity:0.5; font-size:0.8em;";
			
			const menu = document.createElement('div');
			menu.className = 'chameleon-menu';
			Object.assign(menu.style, {
				position: 'absolute', top: '100%', left: '0', right: '0', zIndex: '9999',
				display: 'none', maxHeight: '250px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
				backgroundColor: (refStyle.backgroundColor.includes('rgba(0,0,0,0)') ? '#fff' : refStyle.backgroundColor),
				border: refStyle.border, borderRadius: `0 0 ${refStyle.borderRadius} ${refStyle.borderRadius}`
			});
			
			Array.from(selectEl.options).forEach(opt => {
				const item = document.createElement('div');
				item.className = 'chameleon-select-item';
				item.textContent = opt.text;
				item.style.cssText = `padding: ${refStyle.padding}; color: ${activeColor}; transition: background 0.2s;`;
				item.onclick = (e) => {
					e.stopPropagation();
					selectEl.value = opt.value;
					textSpan.textContent = opt.text;
					trigger.style.color = activeColor;
					menu.style.display = 'none';
					selectEl.dispatchEvent(new Event('change', { bubbles: true }));
				};
				menu.appendChild(item);
			});
			
			trigger.onclick = (e) => {
				e.stopPropagation();
				const isOpen = menu.style.display === 'block';
				document.querySelectorAll('.chameleon-menu').forEach(m => m.style.display = 'none');
				menu.style.display = isOpen ? 'none' : 'block';
			};
			
			selectEl.style.display = 'none';
			trigger.append(textSpan, arrow);
			wrapper.append(trigger, menu);
			selectEl.parentNode.insertBefore(wrapper, selectEl);
		};
		
		// Run on existing selects
		document.querySelectorAll('select').forEach(transform);
		
		// Watch for new selects added dynamically
		const observer = new MutationObserver(mutations => {
			mutations.forEach(m => m.addedNodes.forEach(node => {
				if (node.nodeName === 'SELECT') transform(node);
				else if (node.querySelectorAll) node.querySelectorAll('select').forEach(transform);
			}));
		});
		observer.observe(document.body, { childList: true, subtree: true });
	};
	
	// Global click-to-close
	document.addEventListener('click', () => {
		document.querySelectorAll('.chameleon-menu').forEach(m => m.style.display = 'none');
	});
	
	// Handle Load Timing
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
