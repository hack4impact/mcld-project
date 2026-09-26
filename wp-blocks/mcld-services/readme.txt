=== MCLD Services ===
Contributors:      MCLD
Tags:              elementor, services
Requires at least: 6.8
Requires PHP:      7.4
Tested up to:      6.8
Stable tag:        0.2.0
License:           GPL-2.0-or-later
License URI:       https://www.gnu.org/licenses/gpl-2.0.html

Native Elementor widget that displays services from the MCLD dashboard,
with tabs for Services, Membership, and Donations.

== Description ==

Requires Elementor 3.24 or newer (the free plugin is sufficient). The Services tab
lists active services from the MCLD dashboard via its public API. Clicking a
service shows its title, description, and price, and the Register button
links to /checkout/{serviceId} on the dashboard. Checkout requires a separate
signed-in dashboard session; WordPress login is not shared. Membership and
Donations remain placeholder tabs.
No MemberPress integration, shortcode, or Gutenberg block is included.

== Installation ==

1. Build the distributable with Node.js 22 or newer:

       cd wp-blocks/mcld-services
       npm ci
       npm run plugin-zip

   This creates mcld-services.zip with the PHP templates and compiled assets.
   Source files, tests, node_modules, and environment files are excluded.

2. On a staging WordPress site, install and activate Elementor. In Plugins >
   Add New > Upload Plugin, upload mcld-services.zip and activate MCLD Services.
   A WordPress administrator with permission to install plugins must do this.
   Alternatively, copy the built plugin into wp-content/plugins/mcld-services.

3. Open the page with Edit with Elementor. Search for MCLD Services in the
   widget panel and drag it into the desired container.

4. Under Content > Services, set Dashboard API URL to the public HTTPS base
   URL of the deployed dashboard, for example https://dashboard.example.com.
   Do not append /api/public/services or include credentials/query parameters.
   WordPress must be able to reach that URL. See Local development below for
   connecting to Next.js on the same computer.

5. Save the page, preview it, and test Services > a service > Register. Confirm
   the destination is the intended dashboard before replacing the live section.

== Local development with real services ==

For a disposable preview with no Elementor UI setup, use Node.js 24.18 or newer
(Playground dependencies declare npm 11.16 or newer for installation).
From the repository root, run pnpm dev in one terminal and pnpm wordpress:preview
in another. Open http://127.0.0.1:9463 after startup completes. The command installs
its build/preview dependencies, starts WordPress with Elementor, and creates the
widget page connected to the real Next.js API. No Local, Docker, or PHP install
is required. See the root README's Quick preview section for ports and rebuilding.
The preview clears the API cache on each page request; installed plugin copies
keep the five-minute cache described below. WordPress preview data resets on exit.

For an existing WordPress installation:

Run the Next.js app from the repository root with pnpm dev, using its existing
.env/.env.local Supabase and Stripe configuration. Check that
http://localhost:3000/api/public/services returns the active service catalog.
The widget always calls this Next.js endpoint; no database credentials belong
in WordPress. Next.js reads service records from Supabase/Postgres and enriches
the titles, descriptions, and prices from Stripe.

In the local WordPress wp-config.php, before WordPress is loaded, set:

    define( 'WP_ENVIRONMENT_TYPE', 'local' );

Then set the widget's Dashboard API URL to http://localhost:3000 (or
http://127.0.0.1:3000). Loopback HTTP/HTTPS addresses, including [::1], are accepted
only when WP_ENVIRONMENT_TYPE is local or development. Other private addresses
remain rejected, and loopback requests never follow redirects. Staging and
production still require a public HTTPS dashboard URL.

WordPress and Next.js must share the host network for localhost to work. For a
container or VM where localhost refers to a different machine, use a reachable
public HTTPS development URL. Keep both servers running while previewing. The
same five-minute API cache applies locally; after editing services, wait for it
to expire or clear the mcld_services_v2_* WordPress transients to refresh sooner.

== Upgrading from 0.1.0 ==

Version 0.2.0 replaces the Gutenberg implementation with Elementor only.
Existing mcld/mcld-services blocks are no longer registered or rendered.
There is no automatic conversion of saved block content. On staging, recreate
the services section with the Elementor widget, copy its dashboard base URL,
and remove the old block before deploying the updated page and plugin together.

== Data and caching ==

WordPress fetches GET {baseURL}/api/public/services server-side. No API key is
needed. The response must be a JSON array with a string id per service and
optional title, description, priceCents (nonnegative integer or null), and
priceCurrency (three-letter currency code or null). Text is escaped for display.

Successful responses, including empty lists, are cached for five minutes per
dashboard URL. Failures show an error and are not cached as an empty catalog.
An empty catalog displays "No active services available." A missing/invalid
dashboard URL displays a configuration message.

The widget opts out of Elementor's HTML output cache so it can refresh the API
data. Host, CDN, or full-page caching can still retain the entire page longer;
exclude this page or set an appropriate page-cache lifetime when timely service
updates matter. Purge those caches after deploying or changing dashboard URLs.

== Development and validation ==

Run npm test for browser-logic tests (multiple instances, editor re-renders,
keyboard tabs, safe text rendering, and checkout URLs). Run npm run build after
changing JS/SCSS. Assets load through Elementor's widget dependencies.

For integration checks, install the built plugin on a disposable WordPress site
with Elementor active, then run:

    wp eval-file wp-content/plugins/mcld-services/tests/wordpress.php

This test uses mocked public API responses and temporary transients. Tests are
available in the source checkout, not the distributable ZIP. It checks widget
registration, controls, rendering, validation, caching, and safe output. Repeat
with Elementor deactivated to verify the plugin's graceful dependency notice.

Manual acceptance checks:
* Add two widgets, set different dashboard URLs, save and reload the editor.
* Change a URL and confirm the preview re-renders and its cards still work.
* Verify tabs, service details, Back, and Register in editor and frontend.
* Check empty/error responses and the missing-URL message.
* Check narrow mobile containers and keyboard focus/arrow navigation.
* Confirm service updates appear after the five-minute API cache expires.
* Disable Elementor on staging: MCLD Services must not cause a fatal error.

Elementor integration references:
https://developers.elementor.com/docs/widgets/widget-dependencies/
https://developers.elementor.com/docs/widgets/widget-output-caching/
https://developers.elementor.com/docs/hooks/js/

== Changelog ==

= 0.2.0 =
* Replace the Gutenberg block with a native Elementor widget and API URL control.
* Support editor re-renders, independent instances, and keyboard tab navigation.
* Validate API data, distinguish empty/error states, and cache data for five minutes.
* Package a standalone installable plugin ZIP without Gutenberg dependencies.
* Allow loopback Next.js API URLs on local/development WordPress installations.

= 0.1.0 =
* Initial release: Services tab with list/detail view, Register redirect to
  dashboard Stripe Checkout, placeholder Membership and Donations tabs.
