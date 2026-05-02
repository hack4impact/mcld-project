document.addEventListener( 'DOMContentLoaded', () => {
	document
		.querySelectorAll( '.wp-block-mcld-mcld-services' )
		.forEach( ( block ) => {
			const apiUrl = block.dataset.apiUrl;
			if ( ! apiUrl ) return;

			fetch( `${ apiUrl.replace( /\/$/, '' ) }/api/public/services` )
				.then( ( r ) => r.json() )
				.then( ( services ) => {
					if ( ! services.length ) {
						block.innerHTML = '<p>No active services available.</p>';
						return;
					}
					block.innerHTML = `
						<div class="mcld-services-grid">
							${ services
								.map(
									( s ) => `
								<div class="mcld-service-card">
									<h3>${ s.title ?? '' }</h3>
									${ s.description ? `<p>${ s.description }</p>` : '' }
									${ s.priceCents != null ? `<p class="mcld-service-price">${ ( s.priceCents / 100 ).toFixed( 2 ) } ${ ( s.priceCurrency ?? '' ).toUpperCase() }</p>` : '' }
								</div>
							`
								)
								.join( '' ) }
						</div>
					`;
				} )
				.catch( () => {
					block.innerHTML = '<p>Could not load services.</p>';
				} );
		} );
} );
