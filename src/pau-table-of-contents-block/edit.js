/**
 * Retrieves the required components from the WordPress packages.
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
	// RichText is kept only as a disabled placeholder for dynamic block info
	AlignmentToolbar,
	BlockControls,
	InspectorControls
} from '@wordpress/block-editor';
import { ToolbarGroup, PanelBody, SelectControl, Button, Dashicon, Spinner } from '@wordpress/components';
import { useState, useEffect } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
/**
 * Lets webpack process CSS, SASS or SCSS files referenced in JavaScript files.
 * Those files can contain any CSS code that gets applied to the editor.
 *
 * @see https://www.npmjs.com/package/@wordpress/scripts#using-css
 */
import './editor.scss';

// Helper function to decode HTML entities in titles
const decodeHTMLEntities = (text) => {
	// Use a temporary textarea element to leverage the browser's DOM parser
	const textarea = document.createElement('textarea');
	textarea.innerHTML = text;
	return textarea.value;
};

/**
 * Defines the edit function for the block.
 *
 * @param {Object} props
 * @param {Object} props.attributes The block's attributes.
 * @param {Function} props.setAttributes The function to update attributes.
 * @returns {JSX.Element} The editor interface.
 */
export default function Edit( { className, attributes: attr, setAttributes } ) {
	// UPDATED: Destructuring to include new chapterOrder attribute
	const { category, postOrder, chapterOrder } = attr;

	// State for data fetched from the WordPress REST API
	const [categories, setCategories] = useState([]);         // All top-level categories (Books)
	const [childCategories, setChildCategories] = useState([]); // Child categories of the selected root (Chapters)
	const [postsByChapter, setPostsByChapter] = useState({});   // Posts associated with each chapter ID
	const [isLoading, setIsLoading] = useState(false);

	const onChangeAlignment = ( newAlignment ) => {
		setAttributes( {
			alignment: newAlignment === undefined ? 'none' : newAlignment,
		} );
	};

	const onChangeCategory = ( newCat ) => {
		// Reset post and chapter order and clear data when root category changes
		setAttributes( {
			category: newCat === '' ? '' : newCat,
			postOrder: {},
			chapterOrder: [], // NEW: Reset chapterOrder
		} );
	};

	// 1. Fetch Root Categories (Parent=0) for the initial dropdown
	useEffect(() => {
		apiFetch({ path: '/wp/v2/categories?parent=0&per_page=100' })
			.then((data) => setCategories(data))
			.catch((error) => console.error("Error fetching top-level categories:", error));
	}, []);


	// 2. Fetch Child Categories (Chapters) when the root category changes
	useEffect(() => {
		if (category && category !== '') {
			setIsLoading(true);
			const parentId = parseInt(category, 10);
			const path = `/wp/v2/categories?parent=${parentId}&per_page=100`;

			apiFetch({ path })
				.then((data) => {
					setChildCategories(data);

					// NEW: Initialize chapterOrder attribute
					const fetchedChapterIds = data.map(chapter => chapter.id);

					if (chapterOrder.length === 0 || chapterOrder.some(id => !fetchedChapterIds.includes(id))) {
						// Initialize or sanitize chapterOrder if it's empty or contains invalid IDs
						setAttributes({
							chapterOrder: fetchedChapterIds
						});
					}
				})
				.catch((error) => {
					console.error(`Error fetching child categories for parent ${parentId}:`, error);
					setChildCategories([]);
					setIsLoading(false);
				});
		} else {
			setChildCategories([]);
			setPostsByChapter({});
			setIsLoading(false);
		}
	}, [category]); // Depend on category attribute

	// 3. Fetch Posts for all Child Categories and initialize/sanitize Post Order
	useEffect(() => {
		if (childCategories.length === 0) {
			setPostsByChapter({});
			setIsLoading(false);
			return;
		}

		// Start fetching posts
		setIsLoading(true);
		const fetchPromises = childCategories.map(chapter => {
			// Fetch posts associated with this chapter category ID
			// Use 'include' filter on post status to ensure public posts are fetched
			return apiFetch({
				path: `/wp/v2/posts?categories=${chapter.id}&per_page=100&orderby=date&order=asc&_fields=id,title,link&status=publish,future`
			}).then(posts => ({ chapterId: chapter.id, posts }));
		});

		Promise.all(fetchPromises)
			.then(results => {
				const newPostsByChapter = {};
				let newPostOrder = { ...postOrder };
				let postOrderChanged = false;

				results.forEach(({ chapterId, posts }) => {
					const chapterIdStr = String(chapterId);
					newPostsByChapter[chapterIdStr] = posts;

					// Get a list of IDs of posts currently found by the API
					const fetchedPostIds = posts.map(post => post.id);

					if (!newPostOrder[chapterIdStr] || newPostOrder[chapterIdStr].length === 0) {
						// Case 1: Initialize order using the API's default sort (date)
						newPostOrder[chapterIdStr] = fetchedPostIds;
						postOrderChanged = true;
					} else {
						// Case 2: Sanitize and update existing custom order

						// 1. Filter out deleted/unpublished posts from the saved order
						const existingOrder = newPostOrder[chapterIdStr].filter(id => fetchedPostIds.includes(id));

						// 2. Add new posts (found by API but not in saved order) to the end
						const missingPosts = fetchedPostIds.filter(id => !existingOrder.includes(id));

						const finalOrder = [...existingOrder, ...missingPosts];

						if (JSON.stringify(newPostOrder[chapterIdStr]) !== JSON.stringify(finalOrder)) {
							newPostOrder[chapterIdStr] = finalOrder;
							postOrderChanged = true;
						}
					}
				});

				setPostsByChapter(newPostsByChapter);

				// Update postOrder attribute only if a change was detected
				if (postOrderChanged) {
					setAttributes({ postOrder: newPostOrder });
				}

				setIsLoading(false);
			})
			.catch(error => {
				console.error("Error fetching posts for chapters:", error);
				setIsLoading(false);
				setPostsByChapter({});
			});

	}, [childCategories, postOrder]); // Added postOrder dependency to re-run sanitization if a user changes it

	// 4. Article Reordering Handler
	const handleMovePost = ( chapterIdStr, postId, direction ) => {
		const currentPostOrder = postOrder[chapterIdStr];
		if (!currentPostOrder) return;

		const currentIndex = currentPostOrder.indexOf( postId );
		let newIndex = currentIndex + ( direction === 'up' ? -1 : 1 );

		// Ensure the new index is within bounds
		if ( newIndex >= 0 && newIndex < currentPostOrder.length ) {
			const newChapterOrder = [ ...currentPostOrder ];
			// Swap elements
			[ newChapterOrder[ currentIndex ], newChapterOrder[ newIndex ] ] = [ newChapterOrder[ newIndex ], newChapterOrder[ currentIndex ] ];

			// Update the block attribute with the new structure
			setAttributes({
				postOrder: {
					...postOrder,
					[chapterIdStr]: newChapterOrder
				}
			});
		}
	};

	// NEW: 5. Chapter Reordering Handler
	const handleMoveChapter = ( chapterId, direction ) => {
		const currentIndex = chapterOrder.indexOf( chapterId );
		let newIndex = currentIndex + ( direction === 'up' ? -1 : 1 );

		if ( newIndex >= 0 && newIndex < chapterOrder.length ) {
			const newChapterOrder = [ ...chapterOrder ];
			// Swap elements
			[ newChapterOrder[ currentIndex ], newChapterOrder[ newIndex ] ] = [ newChapterOrder[ newIndex ], newChapterOrder[ currentIndex ] ];

			// Update the block attribute
			setAttributes({ chapterOrder: newChapterOrder });
		}
	};

	const getPostTitle = (chapterIdStr, postId) => {
		const posts = postsByChapter[chapterIdStr] || [];
		// Find the post by its ID in the local state copy
		const post = posts.find(p => p.id === postId);
		// Use the raw title for display in the editor, and decode HTML entities
		return post ? decodeHTMLEntities(post.title.rendered) : `[Post ID ${postId} - Title Not Found]`;
	};

	const getPostLink = (chapterIdStr, postId) => {
		const posts = postsByChapter[chapterIdStr] || [];
		const post = posts.find(p => p.id === postId);
		return post ? post.link : `#`;
	};

	const getChapterName = (chapterId) => {
		const chapterIdInt = parseInt(chapterId, 10);

		// Find the root category name (optional, mainly for the H2 title)
		const root = categories.find(c => c.id === parseInt(category, 10));
		if (root && root.id === chapterIdInt) {
			return root.name;
		}

		// Find the child category (chapter) name
		const childChapter = childCategories.find(c => c.id === chapterIdInt);
		return childChapter ? decodeHTMLEntities(childChapter.name) : `[Category ID ${chapterId} - Name Not Found]`;
	}

	const blockProps = useBlockProps({
		className: 'wp-block-toc-editor p-4 border border-gray-200 rounded-lg bg-gray-50'
	});

	// Helper to get ordered list of chapter objects
	const getOrderedChapters = () => {
		// Filter out any chapter IDs that may be in the order but not in the fetched list
		return chapterOrder.map(chapterId => {
			return childCategories.find(c => c.id === chapterId);
		}).filter(Boolean); // Filter out undefined if a category was deleted
	};

	const orderedChapters = getOrderedChapters();

	return(
		<div {...blockProps}>
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
						value = {category}
						options={ [
							{ label: __('Select a root category', 'pau-table-of-contents-block'), value: '' },
							...categories.map( (cat) => ({
								label: cat.name,
								value: String(cat.id),
							}))
						] }
						onChange={onChangeCategory}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			{/* Visual Editor Preview and Reordering Interface */}
			<div className="toc-preview-container" style={ { textAlign: attr.alignment } }>
				<h2 className="text-xl font-bold mb-4">
					{ category ? getChapterName(category) : 'Table of Contents Preview (Select Root Category)' }
				</h2>

				{ isLoading && (
					<div className="flex items-center space-x-2 p-3 bg-indigo-100 text-indigo-800 rounded">
						<Spinner />
						<p>Loading chapters and articles...</p>
					</div>
				)}

				{ !isLoading && category && orderedChapters.length > 0 && (
					<ol className="list-decimal list-inside space-y-4 pl-0 ml-4">
						{/* NEW: Loop over the custom ordered list of chapter IDs */}
						{orderedChapters.map((chapter, chapterIndex) => {
							const chapterIdStr = String(chapter.id);
							// Use the custom post order from attributes, falling back to an empty array
							const orderedPostIds = postOrder[chapterIdStr] || [];
							const isFirstChapter = chapterIndex === 0;
							const isLastChapter = chapterIndex === orderedChapters.length - 1;

							return (
								<li key={chapter.id} className="font-semibold text-gray-700 p-2 border border-blue-100 bg-blue-50 rounded">
									<div className="flex items-center justify-between">
										<span>{getChapterName(chapter.id)}</span>
										{/* NEW: Chapter Reordering Controls */}
										<div className="flex space-x-1">
											<Button
												icon={ <Dashicon icon="arrow-up-alt2" /> }
												label={ __( 'Move Chapter Up', 'toc-block' ) }
												onClick={ () => handleMoveChapter( chapter.id, 'up' ) }
												disabled={ isFirstChapter }
												isSmall
											/>
											<Button
												icon={ <Dashicon icon="arrow-down-alt2" /> }
												label={ __( 'Move Chapter Down', 'toc-block' ) }
												onClick={ () => handleMoveChapter( chapter.id, 'down' ) }
												disabled={ isLastChapter }
												isSmall
											/>
										</div>
									</div>

									{orderedPostIds.length > 0 && (
										<ul className="list-none space-y-1 mt-2 border-l-2 border-gray-200 pl-4 pt-1">
											{orderedPostIds.map((postId, index) => (
												<li key={postId} className="flex items-center justify-between p-2 bg-white border border-gray-100 rounded text-sm font-normal shadow-sm">
                                        <span className="text-gray-600 flex-grow pr-2">
                                           <a href={getPostLink(chapterIdStr, postId)} onClick={(e) => e.preventDefault()}>
                                                {getPostTitle(chapterIdStr, postId)}
                                           </a>
                                        </span>
													<div className="flex space-x-1">
														<Button
															icon={ <Dashicon icon="arrow-up-alt2" /> }
															label={ __( 'Move Article Up', 'toc-block' ) }
															onClick={ () => handleMovePost( chapterIdStr, postId, 'up' ) }
															disabled={ index === 0 }
															isSmall
														/>
														<Button
															icon={ <Dashicon icon="arrow-down-alt2" /> }
															label={ __( 'Move Article Down', 'toc-block' ) }
															onClick={ () => handleMovePost( chapterIdStr, postId, 'down' ) }
															disabled={ index === orderedPostIds.length - 1 }
															isSmall
														/>
													</div>
												</li>
											))}
										</ul>
									)}

									{orderedPostIds.length === 0 && (
										<p className="text-xs text-gray-500 mt-1 pl-4">(No articles found in this chapter.)</p>
									)}
								</li>
							);
						})}
					</ol>
				)}

				{ !isLoading && category && orderedChapters.length === 0 && (
					<p className="p-3 bg-yellow-100 text-yellow-800 rounded">No chapters (child categories) found for this root category.</p>
				)}
			</div>

			{/* Hidden RichText placeholder to satisfy the block editor structure */}
			<p className="sr-only">
				{ 'TOC Block: Content generated dynamically by PHP using selected category and post order.' }
			</p>
		</div>
	)
}
