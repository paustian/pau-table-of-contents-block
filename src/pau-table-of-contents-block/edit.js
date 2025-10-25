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
	// Destructuring to include all necessary attributes
	const { category, postOrder, chapterOrder } = attr;

	// State for data fetched from the WordPress REST API
	const [categories, setCategories] = useState([]);         // All top-level categories (Books)
	const [childCategories, setChildCategories] = useState([]); // Child categories of the selected root (Chapters)
	const [postsByChapter, setPostsByChapter] = useState({});   // Posts associated with each chapter ID
	const [isLoading, setIsLoading] = useState(false);

	// NEW: Local state to track which chapters are open/closed in the editor preview
	const [openChapters, setOpenChapters] = useState({});

	const onChangeAlignment = ( newAlignment ) => {
		setAttributes( {
			alignment: newAlignment === undefined ? 'none' : newAlignment,
		} );
	};

	const onChangeCategory = ( newCat ) => {
		// Reset state and attributes when root category changes
		setAttributes( {
			category: newCat === '' ? '' : newCat,
			postOrder: {},
			chapterOrder: [],
		} );
		setOpenChapters({}); // Reset accordion state
	};

	// NEW: Toggle function for the editor preview accordion
	const handleToggleChapter = (chapterIdStr) => {
		setOpenChapters(prevOpen => ({
			...prevOpen,
			[chapterIdStr]: !prevOpen[chapterIdStr]
		}));
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

					// Initialize chapterOrder attribute
					const fetchedChapterIds = data.map(chapter => chapter.id);

					if (chapterOrder.length === 0 || chapterOrder.some(id => !fetchedChapterIds.includes(id))) {
						// Initialize or sanitize chapterOrder if it's empty or contains invalid IDs
						// NOTE: We only update chapterOrder here if a change is needed to avoid unnecessary attribute saves.
						const existingOrder = chapterOrder.filter(id => fetchedChapterIds.includes(id));
						const missingIds = fetchedChapterIds.filter(id => !existingOrder.includes(id));
						const finalOrder = [...existingOrder, ...missingIds];

						if (JSON.stringify(chapterOrder) !== JSON.stringify(finalOrder)) {
							setAttributes({
								chapterOrder: finalOrder
							});
						}
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

					// --- Sanitization and Initialization ---
					// We use the existing postOrder to sanitize it, but we MUST compare before saving.
					const existingOrder = newPostOrder[chapterIdStr] || [];

					// 1. Filter out deleted/unpublished posts from the saved order
					const filteredOrder = existingOrder.filter(id => fetchedPostIds.includes(id));

					// 2. Add new posts (found by API but not in filtered order) to the end
					const missingPosts = fetchedPostIds.filter(id => !filteredOrder.includes(id));

					const finalOrder = [...filteredOrder, ...missingPosts];

					if (JSON.stringify(existingOrder) !== JSON.stringify(finalOrder)) {
						newPostOrder[chapterIdStr] = finalOrder;
						postOrderChanged = true;
					}
				});

				setPostsByChapter(newPostsByChapter);

				// Update postOrder attribute only if a change was detected during sanitization
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

		// FIX: Removed 'postOrder' from dependencies. This hook should only run when chapters change.
		// Changes to postOrder itself are handled by handleMovePost and should not trigger a re-fetch/re-sanitization
		// unless 'childCategories' has changed.
	}, [childCategories]);


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

	// 5. Chapter Reordering Handler
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
				{ isLoading && (
					<div className="flex items-center space-x-2 p-3 bg-indigo-100 text-indigo-800 rounded">
						<Spinner />
						<p>Loading chapters and articles...</p>
					</div>
				)}

				{ !isLoading && category && orderedChapters.length > 0 && (
					<div className="wp-block-pau-table-of-contents-block-list">
					<ul>
						{/* Loop over the custom ordered list of chapter IDs */}
						{orderedChapters.map((chapter, chapterIndex) => {
							const chapterIdStr = String(chapter.id);
							// Use the custom post order from attributes, falling back to an empty array
							const orderedPostIds = postOrder[chapterIdStr] || [];
							const isFirstChapter = chapterIndex === 0;
							const isLastChapter = chapterIndex === orderedChapters.length - 1;

							// NEW: Check if this chapter is currently open in the editor preview
							const isChapterOpen = openChapters[chapterIdStr] || false;

							return (
								<li key={chapter.id}>
									<div className="flex items-center justify-between">
										{/* Chapter Title and Toggle Button */}
										<Button
											className="chapter-toggle-button" // Add class for styling/targeting
											onClick={() => handleToggleChapter(chapterIdStr)}
											isTertiary
											aria-expanded={isChapterOpen}
											style={{ padding: 0, margin: 0 }}
										>
											<Dashicon icon={isChapterOpen ? "arrow-down" : "arrow-right"} style={{ marginRight: 8 }} />
											<span>{getChapterName(chapter.id)}</span>
										</Button>

										{/* Chapter Reordering Controls */}
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


									{isChapterOpen && orderedPostIds.length > 0 && (
										<ul>
											{orderedPostIds.map((postId, index) => (
												<li key={postId}>
                                        	<span className="text-gray-600 flex-grow pr-2 text-sm">
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

									{isChapterOpen && orderedPostIds.length === 0 && (
										<p className="text-xs text-gray-500 mt-1 pl-4">(No articles found in this chapter.)</p>
									)}
								</li>
							);
						})}
					</ul>
					</div>
				)}

				{ !isLoading && category && orderedChapters.length === 0 && (
					<p className="p-3 bg-yellow-100 text-yellow-800 rounded">No chapters (child categories) found for this root category.</p>
				)}
			</div>
		</div>
	)
}
