=== Mcld Services ===
Contributors:      MCLD
Tags:              block
Tested up to:      6.8
Stable tag:        0.1.0
License:           GPL-2.0-or-later
License URI:       https://www.gnu.org/licenses/gpl-2.0.html

WordPress block that displays MCLD services pulled from the MCLD dashboard,
with tabs for Services, Membership, and Donations.

== Description ==

Renders a tabbed interface on the ldmontreal.com homepage. The Services tab
lists active services from the MCLD dashboard via its public API. Clicking a
service shows its title, description, and price, and the Register button
redirects the visitor to the dashboard's Stripe Checkout flow for that
service. Membership and Donations are placeholder tabs.

== Installation ==

1. Build the block:

       cd wp-blocks/mcld-services
       npm install
       npm run build

   This generates the `build/` directory the plugin loads from.

2. Copy or symlink `wp-blocks/mcld-services` into the LocalWP site's
   `wp-content/plugins/` directory and activate "Mcld Services" from the
   Plugins screen.

3. Edit the homepage in the WordPress block editor, delete the existing
   Amilia block, and insert the "Mcld Services" block in the same spot.

4. In the block's Inspector sidebar, set "Dashboard API URL" to the base
   URL of the MCLD Next.js dashboard (e.g. http://localhost:3000 when
   running it locally alongside LocalWP).

== Changelog ==

= 0.1.0 =
* Initial release: Services tab with list/detail view, Register redirect to
  dashboard Stripe Checkout, placeholder Membership and Donations tabs.
