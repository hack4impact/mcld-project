<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** Permit loopback development servers only on explicitly local/development sites. */
function mcld_services_is_local_url( $url ) {
	$parts = wp_parse_url( $url );
	return in_array( wp_get_environment_type(), array( 'local', 'development' ), true )
		&& is_array( $parts ) && isset( $parts['scheme'], $parts['host'] )
		&& in_array( strtolower( $parts['scheme'] ), array( 'http', 'https' ), true )
		&& in_array( strtolower( $parts['host'] ), array( 'localhost', '127.0.0.1', '[::1]' ), true )
		&& ! isset( $parts['user'] ) && ! isset( $parts['pass'] )
		&& ! isset( $parts['query'] ) && ! isset( $parts['fragment'] );
}

/** Validate the base URL before WordPress makes a server-side request. */
function mcld_services_base_url( $value ) {
	if ( ! is_string( $value ) || '' === trim( $value ) ) {
		return new WP_Error( 'missing_url', __( 'Set the Dashboard API URL in the Elementor widget settings.', 'mcld-services' ) );
	}
	$url   = rtrim( trim( $value ), '/' );
	$parts = wp_parse_url( $url );
	$local = mcld_services_is_local_url( $url );
	if ( ! $parts || empty( $parts['host'] ) || ! isset( $parts['scheme'] )
		|| isset( $parts['user'] ) || isset( $parts['pass'] ) || isset( $parts['query'] ) || isset( $parts['fragment'] )
		|| preg_match( '#/api/public/services$#i', $url )
		|| ( ! $local && ( 'https' !== strtolower( $parts['scheme'] ) || ! wp_http_validate_url( $url ) ) ) ) {
		return new WP_Error( 'invalid_url', __( 'Enter a dashboard base URL without credentials, query parameters, or /api/public/services. Use public HTTPS, or localhost on a local/development WordPress site.', 'mcld-services' ) );
	}
	if ( $local ) {
		return esc_url_raw( $url, array( 'http', 'https' ) );
	}
	// WordPress permits its own host even on a private network; this setting is public-only.
	$address = gethostbyname( $parts['host'] );
	if ( ! filter_var( $address, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE ) ) {
		return new WP_Error( 'invalid_url', __( 'The dashboard URL must resolve to a public internet address.', 'mcld-services' ) );
	}
	return esc_url_raw( $url, array( 'https' ) );
}

/** Return a validated list or a WP_Error. Failed responses are never cached as empty lists. */
function mcld_services_fetch( $base_url ) {
	$base_url = mcld_services_base_url( $base_url );
	if ( is_wp_error( $base_url ) ) {
		return $base_url;
	}
	$key    = 'mcld_services_v2_' . md5( $base_url );
	$cached = get_transient( $key );
	if ( false !== $cached ) {
		return $cached;
	}
	$error = new WP_Error( 'services_unavailable', __( 'Services could not be loaded. Please try again later.', 'mcld-services' ) );
	$local = mcld_services_is_local_url( $base_url );
	$args = array(
		'timeout'             => 10,
		// A loopback exception must never follow redirects to other internal hosts.
		'redirection'         => $local ? 0 : 3,
		'limit_response_size' => 1024 * 1024,
		'headers'            => array( 'Accept' => 'application/json' ),
	);
	$endpoint = $base_url . '/api/public/services';
	$response = $local ? wp_remote_get( $endpoint, $args ) : wp_safe_remote_get( $endpoint, $args );
	if ( is_wp_error( $response ) || 200 !== wp_remote_retrieve_response_code( $response ) ) {
		return $error;
	}
	// Decode objects as objects so an API error object cannot masquerade as a list.
	$rows = json_decode( wp_remote_retrieve_body( $response ) );
	if ( JSON_ERROR_NONE !== json_last_error() || ! is_array( $rows ) ) {
		return $error;
	}
	$services = array();
	foreach ( $rows as $row ) {
		if ( ! is_object( $row ) || ! isset( $row->id ) || ! is_string( $row->id ) || '' === $row->id
			|| ( isset( $row->title ) && ! is_string( $row->title ) )
			|| ( isset( $row->description ) && ! is_string( $row->description ) )
			|| ( isset( $row->priceCents ) && ( ! is_int( $row->priceCents ) || $row->priceCents < 0 ) )
			|| ( isset( $row->priceCurrency ) && ( ! is_string( $row->priceCurrency ) || ! preg_match( '/^[a-z]{3}$/i', $row->priceCurrency ) ) ) ) {
			return $error;
		}
		$services[] = array(
			'id'            => $row->id,
			'title'         => isset( $row->title ) ? $row->title : '',
			'description'   => isset( $row->description ) ? $row->description : '',
			'priceCents'    => isset( $row->priceCents ) ? $row->priceCents : null,
			'priceCurrency' => isset( $row->priceCurrency ) ? strtoupper( $row->priceCurrency ) : '',
		);
	}
	set_transient( $key, $services, 5 * MINUTE_IN_SECONDS );
	return $services;
}

function mcld_services_render( $value ) {
	$base_url = mcld_services_base_url( $value );
	$services = is_wp_error( $base_url ) ? $base_url : mcld_services_fetch( $base_url );
	// UUIDs also prevent collisions between separate Elementor AJAX render requests.
	$instance = 'mcld-services-' . wp_generate_uuid4();
	require __DIR__ . '/../templates/services.php';
}
