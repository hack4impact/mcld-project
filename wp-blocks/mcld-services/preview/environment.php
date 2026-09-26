<?php
/** Settings for the disposable development site only; excluded from the plugin ZIP. */
if ( ! defined( 'ABSPATH' ) || ! defined( 'MCLD_PREVIEW_API_URL' ) ) {
	exit;
}
add_filter( 'elementor/frontend/print_google_fonts', '__return_false' );
add_filter( 'pre_http_request', function ( $pre, $args, $url ) {
	if ( MCLD_PREVIEW_API_URL . '/api/public/services' === $url ) {
		return $pre; // Use PHP's real HTTP transport to the Next.js API.
	}
	return new WP_Error( 'local_preview', 'Optional external requests are disabled in this preview.' );
}, 10, 3 );
// Refreshes show current service data during development. The shipped plugin still caches for five minutes.
add_action( 'init', function () {
	delete_transient( 'mcld_services_v2_' . md5( MCLD_PREVIEW_API_URL ) );
} );
