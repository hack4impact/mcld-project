<?php
/** Run with wp eval-file on a disposable WordPress installation. */
if ( ! defined( 'ABSPATH' ) || ! function_exists( 'mcld_services_render' ) ) {
	throw new RuntimeException( 'Load WordPress with MCLD Services active before running this test.' );
}

$checks = 0;
$check = function ( $condition, $message ) use ( &$checks ) {
	if ( ! $condition ) {
		throw new RuntimeException( $message );
	}
	++$checks;
};

if ( ! mcld_services_elementor_available() ) {
	$check( ! class_exists( '\MCLD\Services_Widget', false ), 'Widget class must not load without compatible Elementor.' );
	wp_set_current_user( 1 );
	ob_start();
	mcld_services_admin_notice();
	$notice = ob_get_clean();
	$check( false !== strpos( $notice, 'requires Elementor 3.24' ), 'Administrator must see a dependency notice.' );
	echo "PASS: $checks checks without compatible Elementor.\n";
	return;
}

$manager = \Elementor\Plugin::instance()->widgets_manager;
$widget = $manager->get_widget_types( 'mcld-services' );
$check( $widget instanceof \MCLD\Services_Widget, 'Native widget must be registered.' );
$check( 'url' === $widget->get_controls( 'api_url' )['input_type'], 'Dashboard URL control must be available.' );
$dynamic = new ReflectionMethod( $widget, 'is_dynamic_content' );
$dynamic->setAccessible( true );
$check( $dynamic->invoke( $widget ), 'Elementor must not cache the widget HTML.' );
$check( ! WP_Block_Type_Registry::get_instance()->is_registered( 'mcld/mcld-services' ), 'Gutenberg block must not be registered.' );

foreach ( array( '', 'http://93.184.216.34', 'https://10.0.0.1', 'https://user:pass@example.com', 'https://93.184.216.34?token=secret', 'https://93.184.216.34/api/public/services', 'http://localhost:3000@10.0.0.1', 'http://localhost:3000/api/public/services', 'http://127.0.0.1:3000?token=secret', 'http://localhost.example.com:3000' ) as $invalid ) {
	$check( is_wp_error( mcld_services_base_url( $invalid ) ), 'Invalid or private dashboard URL accepted: ' . $invalid );
}

$is_local = in_array( wp_get_environment_type(), array( 'local', 'development' ), true );
foreach ( array( 'http://localhost:3000', 'http://127.0.0.1:3000', 'https://127.0.0.1', 'http://[::1]:3000' ) as $loopback ) {
	$check( $is_local === ! is_wp_error( mcld_services_base_url( $loopback ) ), 'Loopback access must depend on the WordPress environment.' );
}
if ( $is_local ) {
	$local_base = 'http://localhost:3000/mcld-test-' . wp_generate_uuid4();
	$local_mock = function ( $preempt, $args, $url ) use ( $local_base, $check ) {
		if ( $url !== $local_base . '/api/public/services' ) {
			return $preempt;
		}
		$check( 0 === $args['redirection'], 'Local API requests must not follow redirects.' );
		return array( 'response' => array( 'code' => 200 ), 'body' => '[]', 'headers' => array() );
	};
	add_filter( 'pre_http_request', $local_mock, 10, 3 );
	try {
		$check( array() === mcld_services_fetch( $local_base ), 'Local Next.js response must use the same service parser.' );
	} finally {
		remove_filter( 'pre_http_request', $local_mock, 10 );
		delete_transient( 'mcld_services_v2_' . md5( $local_base ) );
	}
}

// Use a public numeric host to avoid DNS during URL validation; HTTP is mocked.
$base = 'https://93.184.216.34/mcld-test-' . wp_generate_uuid4();
$check( $base === mcld_services_base_url( " $base/ " ), 'Public base URL must be normalized.' );
$cache_key = 'mcld_services_v2_' . md5( $base );
$calls = 0;
$body = '[{"id":"service/one","title":"</script><img src=x onerror=alert(1)>","description":"A & B","priceCents":1234,"priceCurrency":"cad"}]';
$code = 200;
$mock = function ( $preempt, $args, $url ) use ( &$calls, &$body, &$code, $base, $check ) {
	if ( $url !== $base . '/api/public/services' ) {
		return $preempt;
	}
	++$calls;
	$check( ! empty( $args['reject_unsafe_urls'] ), 'API requests must reject unsafe URLs.' );
	return is_wp_error( $body ) ? $body : array( 'response' => array( 'code' => $code ), 'body' => $body, 'headers' => array() );
};
add_filter( 'pre_http_request', $mock, 10, 3 );

try {
	$services = mcld_services_fetch( $base );
	$check( is_array( $services ) && 'CAD' === $services[0]['priceCurrency'], 'Public service response must be normalized.' );
	$check( $services === mcld_services_fetch( $base ) && 1 === $calls, 'Repeated render must use cached API data.' );
	$expires = get_option( '_transient_timeout_' . $cache_key );
	if ( ! wp_using_ext_object_cache() ) {
		$check( $expires > time() + 290 && $expires <= time() + 300, 'API cache must expire in five minutes.' );
	}
	ob_start();
	mcld_services_render( $base );
	mcld_services_render( $base );
	$html = ob_get_clean();
	$check( false === strpos( $html, '<img' ) && false !== strpos( $html, '&lt;img' ), 'Service text must be escaped.' );
	preg_match_all( '/\sid="([^"]+)"/', $html, $ids );
	$check( 12 === count( $ids[1] ) && count( $ids[1] ) === count( array_unique( $ids[1] ) ), 'Widget instances must have unique tab and panel IDs.' );
	preg_match( '#<script type="application/json" class="mcld-services-data">(.*?)</script>#s', $html, $json );
	$check( false === strpos( $json[1], '</script>' ) && $services === json_decode( $json[1], true ), 'Embedded JSON must be safe and lossless.' );

	$instance = \Elementor\Plugin::instance()->elements_manager->create_element_instance( array( 'id' => 'testwidget', 'elType' => 'widget', 'widgetType' => 'mcld-services', 'settings' => array( 'api_url' => $base ) ) );
	ob_start();
	$instance->render_content();
	$rendered = ob_get_clean();
	$check( false !== strpos( $rendered, 'data-api-url="' . $base . '"' ) && false !== strpos( $rendered, '12.34 CAD' ), 'Elementor must render the configured dashboard URL and data.' );
	$check( wp_script_is( 'mcld-services', 'registered' ) && wp_style_is( 'mcld-services', 'registered' ), 'Widget assets must be registered.' );

	delete_transient( $cache_key );
	$body = '[]';
	$check( array() === mcld_services_fetch( $base ), 'Empty catalog must be a successful response.' );
	$before = $calls;
	ob_start();
	mcld_services_render( $base );
	$empty = ob_get_clean();
	$check( $before === $calls && false !== strpos( $empty, 'No active services available.' ), 'Empty catalog must be cached and display the empty state.' );

	foreach ( array( '{"error":"unavailable"}', 'not json', '[null]', '[{"id":1}]', '[{"id":"a","priceCents":-1}]', '[{"id":"a","title":{}}]', new WP_Error( 'timeout', 'Timed out' ) ) as $invalid_body ) {
		delete_transient( $cache_key );
		$body = $invalid_body;
		$check( is_wp_error( mcld_services_fetch( $base ) ), 'Failed/malformed response must report an error.' );
		$check( false === get_transient( $cache_key ), 'Failed response must not be cached.' );
	}
	$body = '[]';
	$code = 503;
	ob_start();
	mcld_services_render( $base );
	$error_html = ob_get_clean();
	$check( false !== strpos( $error_html, 'Services could not be loaded.' ) && false === strpos( $error_html, 'No active services' ), 'HTTP errors must not appear as an empty catalog.' );

	ob_start();
	mcld_services_render( '' );
	$missing_html = ob_get_clean();
	$check( false !== strpos( $missing_html, 'Set the Dashboard API URL' ), 'Missing configuration must explain how to fix it.' );
} finally {
	remove_filter( 'pre_http_request', $mock, 10 );
	delete_transient( $cache_key );
}
echo "PASS: $checks WordPress/Elementor integration checks.\n";
