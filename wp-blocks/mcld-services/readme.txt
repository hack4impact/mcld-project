=== MCLD Services ===
Contributors:      MCLD
Tags:              elementor, services
Requires at least: 6.8
Requires PHP:      7.4
Tested up to:      6.8
Stable tag:        0.2.0
License:           GPL-2.0-or-later
License URI:       https://www.gnu.org/licenses/gpl-2.0.html

Elementor 3.24+ widget displaying services from Next.js, Supabase, and Stripe.
Checkout uses a separate dashboard login. Membership and Donations are placeholders.

== Installation ==

1. Build with Node.js 22+ from the repository root:

       cd wp-blocks/mcld-services
       npm ci
       npm run plugin-zip

2. With Elementor active and permission to install plugins, upload
   mcld-services.zip through Plugins > Add New > Upload Plugin and activate it.
3. Add MCLD Services in Elementor. Set Dashboard API URL to your deployed Next.js
   public HTTPS base URL, without /api/public/services. Save and preview the page.

== Local development ==

Configure Next.js credentials as described in the root README; keep them out of
WordPress. With Node.js 24.18+ and npm 11.16+, run from the repository root:

    pnpm dev                 # Terminal 1
    pnpm wordpress:preview   # Terminal 2

Open http://127.0.0.1:9463. WordPress, Elementor, and the widget page are set up
automatically using the real Next.js API. WordPress data resets on restart;
refresh fetches current services. See the root README for ports and rebuilds.

For an existing local WordPress site, set this once in wp-config.php:

    define( 'WP_ENVIRONMENT_TYPE', 'local' );

Use http://localhost:3000 as Dashboard API URL. Both servers must share the host
network; otherwise use a reachable public HTTPS Next.js URL.

Run npm test and npm run build from the plugin directory for tests and assets.

== Notes ==

Installed copies cache services for five minutes; page/CDN caches may last longer.
Existing Gutenberg blocks must be replaced manually with this Elementor widget.
