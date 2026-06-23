import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl, Spinner } from '@wordpress/components';
import { useState, useEffect } from '@wordpress/element';
import './editor.scss';

function formatPrice(service) {
	if (service.priceCents == null) return '';
	const amount = (service.priceCents / 100).toFixed(2);
	const currency = (service.priceCurrency || '').toUpperCase();
	return `${amount} ${currency}`.trim();
}

export default function Edit({ attributes, setAttributes }) {
	const { apiUrl } = attributes;
	const [services, setServices] = useState(null);
	const [error, setError] = useState(null);
	const [activeTab, setActiveTab] = useState('services');

	useEffect(() => {
		if (!apiUrl) {
			setServices(null);
			setError(null);
			return;
		}
		setError(null);
		setServices(null);
		fetch(`${apiUrl.replace(/\/$/, '')}/api/public/services`)
			.then(async (r) => {
				const data = await r.json().catch(() => null);
				if (!r.ok || !Array.isArray(data)) {
					throw new Error('mattia is cooked');
				}
				return data;
			})
			.then(setServices)
			.catch(() =>
				setError(__('Could not load services. Check the API URL.', 'mcld-services')),
			);
	}, [apiUrl]);

	const tabs = [
		{ id: 'services', label: __('Services', 'mcld-services') },
		{ id: 'membership', label: __('Membership', 'mcld-services') },
		{ id: 'donations', label: __('Donations', 'mcld-services') },
	];

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Settings', 'mcld-services')}>
					<TextControl
						label={__('Dashboard API URL', 'mcld-services')}
						help={__(
							'Base URL of your MCLD Next.js app, e.g. https://dashboard.example.com',
							'mcld-services',
						)}
						value={apiUrl}
						onChange={(val) => setAttributes({ apiUrl: val })}
					/>
				</PanelBody>
			</InspectorControls>
			<div {...useBlockProps()}>
				<div className="mcld-tabs" role="tablist">
					{tabs.map((tab) => (
						<button
							key={tab.id}
							type="button"
							id={`mcld-tab-${tab.id}`}
							className={`mcld-tab${activeTab === tab.id ? ' is-active' : ''}`}
							role="tab"
							aria-selected={activeTab === tab.id}
							aria-controls={`mcld-panel-${tab.id}`}
							onClick={() => setActiveTab(tab.id)}
						>
							{tab.label}
						</button>
					))}
				</div>

				{activeTab === 'services' && (
					<div
						id="mcld-panel-services"
						className="mcld-panel"
						data-panel="services"
						role="tabpanel"
						aria-labelledby="mcld-tab-services"
					>
						{!apiUrl && (
							<p>
								{__(
									'Set the Dashboard API URL in the block settings panel.',
									'mcld-services',
								)}
							</p>
						)}
						{apiUrl && !services && !error && <Spinner />}
						{error && <p className="mcld-services-error">{error}</p>}
						{services && services.length === 0 && (
							<p>{__('No active services found.', 'mcld-services')}</p>
						)}
						{services && services.length > 0 && (
							<div className="mcld-services-grid">
								{services.map((s) => (
									<div key={s.id} className="mcld-service-card">
										<h3>{s.title}</h3>
										{s.priceCents != null && (
											<p className="mcld-service-price">{formatPrice(s)}</p>
										)}
									</div>
								))}
							</div>
						)}
					</div>
				)}

				{activeTab === 'membership' && (
					<div
						id="mcld-panel-membership"
						className="mcld-panel"
						data-panel="membership"
						role="tabpanel"
						aria-labelledby="mcld-tab-membership"
					>
						<p>{__('Coming soon.', 'mcld-services')}</p>
					</div>
				)}

				{activeTab === 'donations' && (
					<div
						id="mcld-panel-donations"
						className="mcld-panel"
						data-panel="donations"
						role="tabpanel"
						aria-labelledby="mcld-tab-donations"
					>
						<p>{__('Coming soon.', 'mcld-services')}</p>
					</div>
				)}
			</div>
		</>
	);
}
