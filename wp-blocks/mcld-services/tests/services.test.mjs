import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const script = readFileSync(new URL('../src/services.js', import.meta.url), 'utf8');
const service = { id: 'service/one', title: 'Coaching', description: '<script>example</script>', priceCents: 12500, priceCurrency: 'CAD' };
function markup(id, data = [service]) {
	return `<div class="elementor-widget"><div class="mcld-services" data-api-url="https://dashboard.example.com">
		<div role="tablist">${['services', 'membership', 'donations'].map((name, i) => `<button class="mcld-tab" data-tab="${name}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${name}</button>`).join('')}</div>
		<div data-panel="services" class="mcld-panel"><div class="mcld-services-list"><button class="mcld-service-card" data-service-id="service/one">Coaching</button></div>
		<div class="mcld-services-detail" hidden><button class="mcld-back-button">Back</button><h3 class="mcld-detail-title" tabindex="-1"></h3><p class="mcld-detail-description"></p><p class="mcld-detail-price"></p><a class="mcld-register-button">Register</a></div></div>
		<div class="mcld-panel" data-panel="membership" hidden>Coming soon</div><div class="mcld-panel" data-panel="donations" hidden>Coming soon</div>
		<script class="mcld-services-data" type="application/json">${JSON.stringify(data).replaceAll('<', '\\u003c')}</script>
	</div></div>`;
}
function setup(html = markup(1), late = false) {
	const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://wordpress.example.com' });
	const { window } = dom;
	const hooks = [];
	let init;
	window.jQuery = () => ({ on: (event, callback) => { assert.equal(event, 'elementor/frontend/init.mcldServices'); init = callback; } });
	const frontend = { hooks: { addAction: (name, callback) => { assert.equal(name, 'frontend/element_ready/mcld-services.default'); hooks.push(callback); } } };
	if (!late) window.elementorFrontend = frontend;
	window.eval(script);
	window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
	return { window, hooks, close: () => window.close(), init: () => { window.elementorFrontend = frontend; init(); } };
}

test('services detail, encoded checkout, text safety, and back focus are independent per widget', () => {
	const env = setup(markup(1) + markup(2));
	try {
		const [first, second] = env.window.document.querySelectorAll('.mcld-services');
		const card = first.querySelector('.mcld-service-card');
		card.click();
		assert.equal(first.querySelector('.mcld-services-detail').hidden, false);
		assert.equal(second.querySelector('.mcld-services-detail').hidden, true);
		assert.equal(first.querySelector('.mcld-detail-price').textContent, '125.00 CAD');
		assert.equal(first.querySelector('.mcld-detail-description').textContent, service.description);
		assert.equal(first.querySelector('.mcld-detail-description script'), null);
		assert.equal(first.querySelector('.mcld-register-button').href, 'https://dashboard.example.com/checkout/service%2Fone');
		first.querySelector('.mcld-back-button').click();
		assert.equal(first.querySelector('.mcld-services-list').hidden, false);
		assert.equal(env.window.document.activeElement, card);
	} finally { env.close(); }
});

test('Elementor late initialization, repeated hooks, and replacement markup remain interactive', () => {
	const env = setup(markup(1), true);
	try {
		env.init(); env.init();
		assert.equal(env.hooks.length, 1);
		const scope = env.window.document.querySelector('.elementor-widget');
		for (let i = 0; i < 3; i++) env.hooks[0]([scope]);
		const root = scope.querySelector('.mcld-services');
		let focusCalls = 0;
		root.querySelector('.mcld-detail-title').focus = () => { focusCalls++; };
		root.querySelector('.mcld-service-card').click();
		assert.equal(focusCalls, 1, 'repeated hooks must not attach multiple click handlers');
		scope.innerHTML = markup(2, [{ ...service, title: 'Updated', priceCents: null }]);
		env.hooks[0]([scope]);
		scope.querySelector('.mcld-service-card').click();
		assert.equal(scope.querySelector('.mcld-detail-title').textContent, 'Updated');
		assert.equal(scope.querySelector('.mcld-detail-price').textContent, '');
	} finally { env.close(); }
});

test('tabs support keyboard navigation and reset the detail view', () => {
	const env = setup();
	try {
		const root = env.window.document.querySelector('.mcld-services');
		root.querySelector('.mcld-service-card').click();
		const tabs = root.querySelectorAll('.mcld-tab');
		tabs[0].dispatchEvent(new env.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
		assert.equal(tabs[1].getAttribute('aria-selected'), 'true');
		assert.equal(tabs[0].tabIndex, -1);
		assert.equal(env.window.document.activeElement, tabs[1]);
		assert.equal(root.querySelector('[data-panel="membership"]').hidden, false);
		tabs[0].click();
		assert.equal(root.querySelector('.mcld-services-detail').hidden, true);
		assert.equal(root.querySelector('.mcld-services-list').hidden, false);
	} finally { env.close(); }
});

test('empty/error widgets and malformed embedded data do not throw', () => {
	const env = setup('<div class="mcld-services"><p>Unavailable</p></div>' + markup(2));
	try {
		env.window.document.querySelector('.mcld-services-data').textContent = '{bad';
		env.window.document.querySelector('.mcld-service-card').click();
		assert.equal(env.window.document.querySelector('.mcld-services-detail').hidden, true);
	} finally { env.close(); }
});
