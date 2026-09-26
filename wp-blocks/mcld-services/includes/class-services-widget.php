<?php
namespace MCLD;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Services_Widget extends \Elementor\Widget_Base {
	public function get_name() {
		return 'mcld-services';
	}

	public function get_title() {
		return __( 'MCLD Services', 'mcld-services' );
	}

	public function get_icon() {
		return 'eicon-post-list';
	}

	public function get_categories() {
		return array( 'general' );
	}

	public function get_keywords() {
		return array( 'mcld', 'services', 'registration' );
	}

	public function get_script_depends() {
		return array( 'mcld-services' );
	}

	public function get_style_depends() {
		return array( 'mcld-services' );
	}

	protected function is_dynamic_content(): bool {
		// Cache the API data, never Elementor's rendered HTML.
		return true;
	}

	protected function register_controls() {
		$this->start_controls_section( 'services_settings', array(
			'label' => __( 'Services', 'mcld-services' ),
			'tab'   => \Elementor\Controls_Manager::TAB_CONTENT,
		) );
		$this->add_control( 'api_url', array(
			'label'       => __( 'Dashboard API URL', 'mcld-services' ),
			'type'        => \Elementor\Controls_Manager::TEXT,
			'input_type'  => 'url',
			'label_block' => true,
			'placeholder' => 'https://dashboard.example.com',
			'description' => __( 'Dashboard base URL, without /api/public/services. Use HTTPS in production; local/development WordPress sites also accept http://localhost:3000.', 'mcld-services' ),
			'default'     => '',
		) );
		$this->end_controls_section();
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		mcld_services_render( isset( $settings['api_url'] ) ? $settings['api_url'] : '' );
	}
}
