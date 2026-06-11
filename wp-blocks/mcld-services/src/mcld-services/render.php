<?php
$api_url = isset($attributes['apiUrl']) ? $attributes['apiUrl'] : '';

if (empty($api_url)) { ?>
	<div <?= get_block_wrapper_attributes() ?>>
		<p><?= esc_html__('Set the Dashboard API URL in the block settings.', 'mcld-services') ?></p>
	</div>
	<?php return;
}

$transient_key = 'mcld_services_' . md5($api_url);
$services = get_transient($transient_key);

if (false === $services) {
	$response = wp_remote_get(rtrim($api_url, '/') . '/api/public/services');

	if (is_wp_error($response) || 200 !== wp_remote_retrieve_response_code($response)) { ?>
		<div <?= get_block_wrapper_attributes() ?>>
			<p><?= esc_html__('Could not load services.', 'mcld-services') ?></p>
		</div>
		<?php return;
	}

	$services = json_decode(wp_remote_retrieve_body($response), true);
	set_transient($transient_key, $services, 60);
}

if (empty($services)) { ?>
	<div <?= get_block_wrapper_attributes() ?>>
		<p><?= esc_html__('No active services available.', 'mcld-services') ?></p>
	</div>
	<?php return;
}
?>

<div <?= get_block_wrapper_attributes() ?>>
	<div class="mcld-services-grid">
		<?php foreach ($services as $service): ?>
			<div class="mcld-service-card">
				<h3><?= esc_html($service['title'] ?? '') ?></h3>
				<?php if (!empty($service['description'])): ?>
					<p><?= esc_html($service['description']) ?></p>
				<?php endif; ?>
				<?php if (isset($service['priceCents']) && null !== $service['priceCents']): ?>
					<p class="mcld-service-price">
						<?= esc_html(number_format($service['priceCents'] / 100, 2) . ' ' . strtoupper($service['priceCurrency'] ?? '')) ?>
					</p>
				<?php endif; ?>
			</div>
		<?php endforeach; ?>
	</div>
</div>