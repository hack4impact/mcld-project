<?php
$api_url = isset($attributes['apiUrl']) ? $attributes['apiUrl'] : '';

$wrapper_attrs = get_block_wrapper_attributes([
	'data-api-url' => esc_attr($api_url),
]);

if (empty($api_url)) { ?>
	<div <?= $wrapper_attrs ?>>
		<p><?= esc_html__('Set the Dashboard API URL in the block settings.', 'mcld-services') ?></p>
	</div>
	<?php return;
}

$base_url = rtrim($api_url, '/');
$transient_key = 'mcld_services_' . md5($base_url);
$services = get_transient($transient_key);

if (false === $services) {
	$response = wp_remote_get($base_url . '/api/public/services');

	if (is_wp_error($response) || 200 !== wp_remote_retrieve_response_code($response)) {
		$services = [];
	} else {
		$services = json_decode(wp_remote_retrieve_body($response), true);
		if (!is_array($services)) {
			$services = [];
		}
		set_transient($transient_key, $services, 60);
	}
}

$services_json = wp_json_encode($services);
?>

<div <?= $wrapper_attrs ?>>
	<div class="mcld-tabs" role="tablist">
		<button
			type="button"
			class="mcld-tab is-active"
			role="tab"
			aria-selected="true"
			data-tab="services"
		>
			<?= esc_html__('Services', 'mcld-services') ?>
		</button>
		<button
			type="button"
			class="mcld-tab"
			role="tab"
			aria-selected="false"
			data-tab="membership"
		>
			<?= esc_html__('Membership', 'mcld-services') ?>
		</button>
		<button
			type="button"
			class="mcld-tab"
			role="tab"
			aria-selected="false"
			data-tab="donations"
		>
			<?= esc_html__('Donations', 'mcld-services') ?>
		</button>
	</div>

	<div class="mcld-panel" data-panel="services" role="tabpanel">
		<div class="mcld-services-list">
			<?php if (empty($services)): ?>
				<p class="mcld-services-empty"><?= esc_html__('No active services available.', 'mcld-services') ?></p>
			<?php else: ?>
				<div class="mcld-services-grid">
					<?php foreach ($services as $service):
						$id = isset($service['id']) ? $service['id'] : '';
						$title = isset($service['title']) ? $service['title'] : '';
						$price_cents = isset($service['priceCents']) ? $service['priceCents'] : null;
						$currency = isset($service['priceCurrency']) ? strtoupper($service['priceCurrency']) : '';
					?>
						<button
							type="button"
							class="mcld-service-card"
							data-service-id="<?= esc_attr($id) ?>"
						>
							<h3><?= esc_html($title) ?></h3>
							<?php if ($price_cents !== null): ?>
								<p class="mcld-service-price">
									<?= esc_html(number_format($price_cents / 100, 2) . ' ' . $currency) ?>
								</p>
							<?php endif; ?>
						</button>
					<?php endforeach; ?>
				</div>
			<?php endif; ?>
		</div>

		<div class="mcld-services-detail" hidden>
			<button type="button" class="mcld-back-button">
				<?= esc_html__('&larr; Back', 'mcld-services') ?>
			</button>
			<h3 class="mcld-detail-title"></h3>
			<p class="mcld-detail-description"></p>
			<p class="mcld-detail-price"></p>
			<a class="mcld-register-button" href="#">
				<?= esc_html__('Register', 'mcld-services') ?>
			</a>
		</div>
	</div>

	<div class="mcld-panel" data-panel="membership" role="tabpanel" hidden>
		<p><?= esc_html__('Coming soon.', 'mcld-services') ?></p>
	</div>

	<div class="mcld-panel" data-panel="donations" role="tabpanel" hidden>
		<p><?= esc_html__('Coming soon.', 'mcld-services') ?></p>
	</div>

	<script type="application/json" class="mcld-services-data">
		<?= $services_json ?>
	</script>
</div>
