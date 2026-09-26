<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
$tabs = array(
	'services'   => __( 'Services', 'mcld-services' ),
	'membership' => __( 'Membership', 'mcld-services' ),
	'donations'  => __( 'Donations', 'mcld-services' ),
);
?>
<div class="mcld-services" data-api-url="<?php echo is_wp_error( $base_url ) ? '' : esc_attr( $base_url ); ?>">
	<?php if ( is_wp_error( $services ) ) : ?>
		<p class="mcld-services-error" role="status"><?php echo esc_html( $services->get_error_message() ); ?></p>
	<?php else : ?>
		<div class="mcld-tabs" role="tablist" aria-label="<?php esc_attr_e( 'MCLD services and support', 'mcld-services' ); ?>">
			<?php foreach ( $tabs as $tab => $label ) : ?>
				<button type="button" id="<?php echo esc_attr( "$instance-tab-$tab" ); ?>"
					class="mcld-tab<?php echo 'services' === $tab ? ' is-active' : ''; ?>"
					role="tab" aria-selected="<?php echo 'services' === $tab ? 'true' : 'false'; ?>"
					tabindex="<?php echo 'services' === $tab ? '0' : '-1'; ?>"
					aria-controls="<?php echo esc_attr( "$instance-panel-$tab" ); ?>" data-tab="<?php echo esc_attr( $tab ); ?>">
					<?php echo esc_html( $label ); ?>
				</button>
			<?php endforeach; ?>
		</div>
		<div id="<?php echo esc_attr( "$instance-panel-services" ); ?>" class="mcld-panel" data-panel="services" role="tabpanel" aria-labelledby="<?php echo esc_attr( "$instance-tab-services" ); ?>">
			<div class="mcld-services-list">
				<?php if ( empty( $services ) ) : ?>
					<p class="mcld-services-empty"><?php esc_html_e( 'No active services available.', 'mcld-services' ); ?></p>
				<?php else : ?>
					<div class="mcld-services-grid">
						<?php foreach ( $services as $service ) : ?>
							<button type="button" class="mcld-service-card" data-service-id="<?php echo esc_attr( $service['id'] ); ?>">
								<span class="mcld-service-title"><?php echo esc_html( $service['title'] ); ?></span>
								<?php if ( null !== $service['priceCents'] ) : ?>
									<span class="mcld-service-price"><?php echo esc_html( number_format( $service['priceCents'] / 100, 2, '.', '' ) . ' ' . $service['priceCurrency'] ); ?></span>
								<?php endif; ?>
							</button>
						<?php endforeach; ?>
					</div>
				<?php endif; ?>
			</div>
			<div class="mcld-services-detail" hidden>
				<button type="button" class="mcld-back-button"><?php esc_html_e( '← Back', 'mcld-services' ); ?></button>
				<h3 class="mcld-detail-title" tabindex="-1"></h3>
				<p class="mcld-detail-description"></p>
				<p class="mcld-detail-price"></p>
				<a class="mcld-register-button"><?php esc_html_e( 'Register', 'mcld-services' ); ?></a>
			</div>
		</div>
		<?php foreach ( array( 'membership', 'donations' ) as $tab ) : ?>
			<div id="<?php echo esc_attr( "$instance-panel-$tab" ); ?>" class="mcld-panel" data-panel="<?php echo esc_attr( $tab ); ?>" role="tabpanel" aria-labelledby="<?php echo esc_attr( "$instance-tab-$tab" ); ?>" hidden>
				<p><?php esc_html_e( 'Coming soon.', 'mcld-services' ); ?></p>
			</div>
		<?php endforeach; ?>
		<script type="application/json" class="mcld-services-data"><?php echo wp_json_encode( $services, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT ); ?></script>
	<?php endif; ?>
</div>
