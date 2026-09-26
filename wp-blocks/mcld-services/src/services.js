const selector = '.mcld-services';
const initialized = new WeakSet();
let elementorHookRegistered = false;

function activateTab(widget, name) {
	widget.querySelectorAll('.mcld-tab').forEach((tab) => {
		const active = tab.dataset.tab === name;
		tab.classList.toggle('is-active', active);
		tab.setAttribute('aria-selected', String(active));
		tab.tabIndex = active ? 0 : -1;
	});
	widget.querySelectorAll('.mcld-panel').forEach((panel) => {
		panel.hidden = panel.dataset.panel !== name;
	});
	showList(widget);
}

function showList(widget) {
	const list = widget.querySelector('.mcld-services-list');
	const detail = widget.querySelector('.mcld-services-detail');
	if (list) list.hidden = false;
	if (detail) detail.hidden = true;
}

function readServices(widget) {
	try {
		const data = JSON.parse(widget.querySelector('.mcld-services-data')?.textContent || '[]');
		return Array.isArray(data) ? data : [];
	} catch {
		return [];
	}
}

function initWidget(widget) {
	if (initialized.has(widget)) return;
	initialized.add(widget);
	let lastCard;
	// Delegation also handles Elementor replacing a widget's inner markup.
	widget.addEventListener('click', (event) => {
		if (event.target.closest(selector) !== widget) return;
		const tab = event.target.closest('.mcld-tab');
		if (tab) {
			activateTab(widget, tab.dataset.tab);
			return;
		}
		if (event.target.closest('.mcld-back-button')) {
			showList(widget);
			if (lastCard?.isConnected) lastCard.focus();
			return;
		}
		const card = event.target.closest('.mcld-service-card');
		if (!card) return;
		const service = readServices(widget).find((item) => item.id === card.dataset.serviceId);
		const detail = widget.querySelector('.mcld-services-detail');
		if (!service || !detail) return;
		lastCard = card;
		detail.querySelector('.mcld-detail-title').textContent = service.title || '';
		detail.querySelector('.mcld-detail-description').textContent = service.description || '';
		detail.querySelector('.mcld-detail-price').textContent = service.priceCents == null
			? '' : `${(service.priceCents / 100).toFixed(2)} ${service.priceCurrency || ''}`.trim();
		detail.querySelector('.mcld-register-button').href =
			`${widget.dataset.apiUrl.replace(/\/$/, '')}/checkout/${encodeURIComponent(service.id)}`;
		widget.querySelector('.mcld-services-list').hidden = true;
		detail.hidden = false;
		detail.querySelector('.mcld-detail-title').focus();
	});
	widget.addEventListener('keydown', (event) => {
		const tab = event.target.closest('.mcld-tab');
		if (!tab || tab.closest(selector) !== widget) return;
		const tabs = [...widget.querySelectorAll('.mcld-tab')];
		let index = tabs.indexOf(tab);
		if (event.key === 'ArrowRight') index = (index + 1) % tabs.length;
		else if (event.key === 'ArrowLeft') index = (index - 1 + tabs.length) % tabs.length;
		else if (event.key === 'Home') index = 0;
		else if (event.key === 'End') index = tabs.length - 1;
		else return;
		event.preventDefault();
		activateTab(widget, tabs[index].dataset.tab);
		tabs[index].focus();
	});
}

function initScope(scope) {
	if (scope.matches?.(selector)) initWidget(scope);
	scope.querySelectorAll(selector).forEach(initWidget);
}

function registerElementorHook() {
	if (elementorHookRegistered || !window.elementorFrontend?.hooks) return;
	elementorHookRegistered = true;
	window.elementorFrontend.hooks.addAction('frontend/element_ready/mcld-services.default', ($scope) => {
		initScope($scope[0]);
	});
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => initScope(document), { once: true });
} else {
	initScope(document);
}
// The dependency can be loaded either before frontend init or on demand in the editor.
window.jQuery?.(window).on('elementor/frontend/init.mcldServices', registerElementorHook);
registerElementorHook();
