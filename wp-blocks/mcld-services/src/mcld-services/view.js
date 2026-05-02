function createServiceCard(s) {
	const card = document.createElement('div');
	card.className = 'mcld-service-card';

	const title = document.createElement('h3');
	title.textContent = s.title ?? '';
	card.appendChild(title);

	if (s.description) {
		const desc = document.createElement('p');
		desc.textContent = s.description;
		card.appendChild(desc);
	}

	if (s.priceCents != null) {
		const price = document.createElement('p');
		price.className = 'mcld-service-price';
		price.textContent = `${(s.priceCents / 100).toFixed(2)} ${(s.priceCurrency ?? '').toUpperCase()}`;
		card.appendChild(price);
	}

	return card;
}

document.addEventListener('DOMContentLoaded', () => {
	document
		.querySelectorAll('.wp-block-mcld-mcld-services')
		.forEach((block) => {
			const apiUrl = block.dataset.apiUrl;
			if (!apiUrl) return;

			fetch(`${apiUrl.replace(/\/$/, '')}/api/public/services`)
				.then((r) => r.json())
				.then((services) => {
					block.innerHTML = '';

					if (!services.length) {
						const msg = document.createElement('p');
						msg.textContent = 'No active services available.';
						block.appendChild(msg);
						return;
					}

					const grid = document.createElement('div');
					grid.className = 'mcld-services-grid';
					services.forEach((s) => grid.appendChild(createServiceCard(s)));
					block.appendChild(grid);
				})
				.catch(() => {
					block.innerHTML = '';
					const msg = document.createElement('p');
					msg.textContent = 'Could not load services.';
					block.appendChild(msg);
				});
		});
});
