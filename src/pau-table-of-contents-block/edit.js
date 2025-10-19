/**
 * Retrieves the translation of text.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-i18n/
 */
import { __ } from '@wordpress/i18n';

/**
 * React hook that is used to mark the block wrapper element.
 * It provides all the necessary props like the class name.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-editor/#useblockprops
 */
import {
	useBlockProps,
	RichText,
	AlignmentToolbar,
	BlockControls,
	InspectorControls
} from '@wordpress/block-editor';
import { ToolbarGroup, PanelBody, SelectControl } from '@wordpress/components';
import { useState, useEffect } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
/**
 * Lets webpack process CSS, SASS or SCSS files referenced in JavaScript files.
 * Those files can contain any CSS code that gets applied to the editor.
 *
 * @see https://www.npmjs.com/package/@wordpress/scripts#using-css
 */
import './editor.scss';

/**
 * The edit function describes the structure of your block in the context of the
 * editor. This represents what the editor will render when the block is used.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#edit
 *
 * @return {Element} Element to render.
 */
export default function Edit( { className, attributes: attr, setAttributes } ) {

	// Existing state for top-level categories
	const [categories, setCategories] = useState([]);
	// New state to hold categories that have the selected category as a parent
	const [childCategories, setChildCategories] = useState([]);

	const onChangeContent = ( newContent ) => {
		setAttributes( { content: newContent } );
	};

	const onChangeAlignment = ( newAlignment ) => {
		setAttributes( {
			alignment: newAlignment === undefined ? 'none' : newAlignment,
		} );
	};

	// This function is no longer called directly from SelectControl.
	// The SelectControl now calls onChangeCategory, which sets the attribute.
	// The useEffect below handles the fetching.
	const onChangeCategory = ( newCat ) => {
		setAttributes( {
			category: newCat === undefined ? 'none' : newCat,
		} );
	};

	const updateTOC = (catID, catArray) => {
		// Note: In a proper React/Gutenberg environment, you generally
		// shouldn't use document.getElementById for rendering block content.
		// Instead, render elements based on state/attributes.
		const TOC_div = document.getElementById('pau-toc-content');
		// Example of using the childCategories state for content:
		if (TOC_div) {
			TOC_div.innerHTML = `Category: ${catID} . Child Count: ${catArray.length}`;
		}
	};

	// useEffect to fetch *top-level* categories (parent=0) for the dropdown
	useEffect(() => {
		apiFetch({ path: '/wp/v2/categories?parent=0&per_page=100' })
			.then((data) => setCategories(data))
			.catch((error) => console.error("Error fetching top-level categories:", error));
	}, []);

	// ----------------------------------------------------------------------
	// NEW FUNCTIONALITY: useEffect to fetch child categories
	// ----------------------------------------------------------------------
	useEffect(() => {
		// Only proceed if a category is selected (i.e., not the empty string)
		if (attr.category && attr.category !== 'none') {
			// The REST API endpoint to get children of the selected category
			const parentId = parseInt(attr.category, 10);
			const path = `/wp/v2/categories?parent=${parentId}&per_page=100`;

			apiFetch({ path })
				.then((data) => {
					// Update the state with the fetched child categories
					setChildCategories(data);
					// You might want to call updateTOC here to react to the new data
					updateTOC(attr.category, data);
				})
				.catch((error) => {
					console.error(`Error fetching child categories for parent ${parentId}:`, error);
					setChildCategories([]); // Clear on error
				});
		} else {
			// Clear child categories if no parent is selected
			setChildCategories([]);
		}
		// Dependency array: runs every time attr.category changes
	}, [attr.category]);

	return( <div {...useBlockProps()}>
		<BlockControls>
			<ToolbarGroup>
				<AlignmentToolbar
					value={ attr.alignment }
					onChange={ onChangeAlignment }
				/>
			</ToolbarGroup>
		</BlockControls>
		<InspectorControls>
			<PanelBody title={__("Settings", 'pau-table-of-contents-block')}>
				<SelectControl
					label={ __('Root Category', 'pau-table-of-contents-block')}
					value = {attr.category}
					options={ [
						{ label: __('Select a category', 'pau-table-of-contents-block'), value: '' },
						...categories.map( (cat) => ({
							label: cat.name,
							value: String(cat.id),
						}))
					] }
					// Call onChangeCategory to update the block attribute
					onChange={onChangeCategory}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
			</PanelBody>
		</InspectorControls>
		<RichText
			id = 'pau-toc-content'
			className={ className }
			style={ { textAlign: attr.alignment } }
			tagName="p"
			onChange={ onChangeContent }
			value={ attr.content }
		/>
	</div>)
}

