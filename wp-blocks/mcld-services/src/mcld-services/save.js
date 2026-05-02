import { useBlockProps } from '@wordpress/block-editor';

export default function save( { attributes } ) {
	const { apiUrl } = attributes;
	return (
		<div { ...useBlockProps.save() } data-api-url={ apiUrl }>
			Loading…
		</div>
	);
}
