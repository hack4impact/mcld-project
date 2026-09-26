<?php
/**
 * Plugin Name: MCLD Services
 * Description: Native Elementor widget displaying services from the MCLD dashboard.
 * Version: 0.2.0
 * Requires at least: 6.8
 * Requires PHP: 7.4
 * Author: MCLD
 * License: GPL-2.0-or-later
 * Text Domain: mcld-services
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'MCLD_SERVICES_VERSION', '0.2.0' );
define( 'MCLD_SERVICES_ELEMENTOR_MIN_VERSION', '3.24.0' );

require_once __DIR__ . '/includes/services.php';

function mcld_services_elementor_available() {
	return did_action( 'elementor/loaded' )
		&& defined( 'ELEMENTOR_VERSION' )
		&& version_compare( ELEMENTOR_VERSION, MCLD_SERVICES_ELEMENTOR_MIN_VERSION, '>=' );
}

function mcld_services_admin_notice() {
	if ( ! current_user_can( 'activate_plugins' ) ) {
		return;
	}
	if ( ! mcld_services_elementor_available() ) {
		echo '<div class="notice notice-warning"><p>' . esc_html__( 'MCLD Services requires Elementor 3.24 or newer to be installed and activated.', 'mcld-services' ) . '</p></div>';
	} elseif ( ! file_exists( __DIR__ . '/build/services.js' ) || ! file_exists( __DIR__ . '/build/services.css' ) ) {
		echo '<div class="notice notice-error"><p>' . esc_html__( 'MCLD Services assets are missing. Install the built plugin ZIP or run npm run build in the plugin directory.', 'mcld-services' ) . '</p></div>';
	}
}
add_action( 'admin_notices', 'mcld_services_admin_notice' );

function mcld_services_register_assets() {
	wp_register_script( 'mcld-services', plugins_url( 'build/services.js', __FILE__ ), array( 'jquery', 'elementor-frontend' ), MCLD_SERVICES_VERSION, true );
	wp_register_style( 'mcld-services', plugins_url( 'build/services.css', __FILE__ ), array(), MCLD_SERVICES_VERSION );
}

function mcld_services_register_widget( $widgets_manager ) {
	if ( ! mcld_services_elementor_available() ) {
		return;
	}
	mcld_services_register_assets();
	require_once __DIR__ . '/includes/class-services-widget.php';
	$widgets_manager->register( new \MCLD\Services_Widget() );
}
add_action( 'elementor/widgets/register', 'mcld_services_register_widget' );
add_action( 'wp_enqueue_scripts', 'mcld_services_register_assets' );
