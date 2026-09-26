<?php
/** Recreate a real Elementor page automatically for each preview session. */
require '/wordpress/wp-load.php';
require_once ABSPATH . 'wp-admin/includes/plugin.php';
wp_set_current_user( 1 );
foreach ( array( 'elementor/elementor.php', 'mcld-services/mcld-services.php' ) as $plugin ) {
	$result = activate_plugin( $plugin );
	if ( is_wp_error( $result ) ) {
		throw new RuntimeException( $result->get_error_message() );
	}
}
$services = mcld_services_fetch( MCLD_PREVIEW_API_URL );
if ( is_wp_error( $services ) ) {
	throw new RuntimeException( $services->get_error_message() . ' Check the Next.js server and dashboard API URL.' );
}
update_option( 'blogname', 'MCLD Local Preview' );
update_option( 'blog_public', 0 );
$page = wp_insert_post( array(
	'post_title' => 'MCLD Services', 'post_type' => 'page', 'post_status' => 'publish',
), true );
if ( is_wp_error( $page ) ) {
	throw new RuntimeException( $page->get_error_message() );
}
update_post_meta( $page, '_elementor_edit_mode', 'builder' );
update_post_meta( $page, '_elementor_template_type', 'wp-page' );
update_post_meta( $page, '_wp_page_template', 'elementor_canvas' );
update_post_meta( $page, '_elementor_version', ELEMENTOR_VERSION );
update_post_meta( $page, '_elementor_data', wp_slash( wp_json_encode( array(
	array( 'id' => 'mcldcontainer', 'elType' => 'container', 'settings' => array( 'content_width' => 'boxed' ), 'elements' => array(
		array( 'id' => 'mcldheading', 'elType' => 'widget', 'widgetType' => 'heading', 'settings' => array( 'title' => 'MCLD Services' ), 'elements' => array() ),
		array( 'id' => 'mcldservices', 'elType' => 'widget', 'widgetType' => 'mcld-services', 'settings' => array( 'api_url' => MCLD_PREVIEW_API_URL ), 'elements' => array() ),
	) ),
) ) ) );
update_option( 'show_on_front', 'page' );
update_option( 'page_on_front', $page );
echo 'Created an Elementor page with ' . count( $services ) . ' services from Next.js.' . PHP_EOL;
