function formatPrice(service) {
	if (service.priceCents == null) return '';
	const amount = (service.priceCents / 100).toFixed(2);
	const currency = (service.priceCurrency || '').toUpperCase();
	return `${amount} ${currency}`.trim();
}

function readServices(block) {
	const node = block.querySelector('.mcld-services-data');
	if (!node) return [];
	try {
		const parsed = JSON.parse(node.textContent.trim());
		return Array.isArray(parsed) ? parsed : [];
	} catch (e) {
		return [];
	}
}

function activateTab(block, tabName) {
	block.querySelectorAll('.mcld-tab').forEach((tab) => {
		const isActive = tab.dataset.tab === tabName;
		tab.classList.toggle('is-active', isActive);
		tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
	});
	block.querySelectorAll('.mcld-panel').forEach((panel) => {
		panel.hidden = panel.dataset.panel !== tabName;
	});
}

function showList(block) {
	block.querySelector('.mcld-services-list').hidden = false;
	block.querySelector('.mcld-services-detail').hidden = true;
}

function showDetail(block, service, apiUrl) {
	const detail = block.querySelector('.mcld-services-detail');
	detail.querySelector('.mcld-detail-title').textContent = service.title || '';
	detail.querySelector('.mcld-detail-description').textContent = service.description || '';
	detail.querySelector('.mcld-detail-price').textContent = formatPrice(service);

	const registerLink = detail.querySelector('.mcld-register-button');
	const base = (apiUrl || '').replace(/\/$/, '');
	registerLink.setAttribute(
		'href',
		`${base}/checkout/${encodeURIComponent(service.id)}`,
	);

	block.querySelector('.mcld-services-list').hidden = true;
	detail.hidden = false;
}

function initBlock(block) {
	const apiUrl = block.dataset.apiUrl || '';
	const services = readServices(block);
	const servicesById = new Map(services.map((s) => [s.id, s]));

	block.querySelectorAll('.mcld-tab').forEach((tab) => {
		tab.addEventListener('click', () => {
			activateTab(block, tab.dataset.tab);
			showList(block);
		});
	});

	block.querySelectorAll('.mcld-service-card').forEach((card) => {
		card.addEventListener('click', () => {
			const service = servicesById.get(card.dataset.serviceId);
			if (service) showDetail(block, service, apiUrl);
		});
	});

	const backButton = block.querySelector('.mcld-back-button');
	if (backButton) {
		backButton.addEventListener('click', () => showList(block));
	}
}

document.addEventListener('DOMContentLoaded', () => {
	document
		.querySelectorAll('.wp-block-mcld-mcld-services')
		.forEach(initBlock);
});
