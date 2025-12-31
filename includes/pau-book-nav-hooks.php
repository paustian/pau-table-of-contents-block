<?php
/**
 * This file monitors for the creation of Table of Contents Blocks in posts. If a new TOC block is created,
 * The code finds and saves the structures of chapters and articles. This TOC structure is saved. Any time a
 * post is rendered a filter function checks to see if the post is part of a TOC. If it is, previous and next
 * nav lengths are added to it.
 *
 * @package PaustianCreateTableOfContentsBlock
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Register Rest API.
 *
 * Register a REST API endpoint to retrieve saved TOC structures.
 * Path: /wp-json/pau-toc/v1/get-toc?root_id=123.
 *
 * @return void
 */

add_action(
	'rest_api_init',
	function () {
		register_rest_route(
			'pau-toc/v1',
			'/get-toc',
			array(
				'methods'             => 'GET',
				'callback'            => 'pau_get_saved_toc_data',
				'permission_callback' => function () {
					return current_user_can( 'edit_posts' );
				},
			)
		);
	}
);

/**
 * A callback for JavaScripts (Edit.js) to use to get any stored chapter data.
 *
 * @param string $request - the request passed from the JavaScript.
 *
 * @return array|false[]|WP_Error
 */
function pau_get_saved_toc_data( $request ) {
	$root_id = $request->get_param( 'root_id' );
	if ( ! $root_id ) {
		return new WP_Error( 'no_id', 'Missing Root ID', array( 'status' => 400 ) );
	}

	$option_key = 'pau_book_order_' . $root_id;
	$saved_data = get_option( $option_key );

	if ( ! $saved_data ) {
		return array( 'exists' => false );
	}
	$post_order = (object) $saved_data['postOrder']; // Ensure it's an object for JS.
	return array(
		'exists'       => true,
		'chapterOrder' => $saved_data['chapterOrder'],
		'postOrder'    => $post_order,
	);
}

/**
 * Extract TOC data
 *
 * Scan an array of blocks and if any of them are TOC blocks remeber them. Finally,
 * return the found array of TOC blocks to the caller
 *
 * @param array $blocks The blocks in the post.
 *
 * @return array Those blocks that are TOC blocks.
 */
function pau_extract_toc_data( $blocks ) {
	$found_ids = array();
	foreach ( $blocks as $block ) {
		if ( 'create-block/pau-table-of-contents-block' === $block['blockName'] ) {
			$found_ids[] = (int) $block['attrs']['category'];
		}
	}
	return $found_ids;
}

/**
 * Listen and save the order attributes of any TOC blocks if they exist on a page
 *
 * Fires when a post is saved. Scans the post content for the TOC block
 * and saves its custom order attributes to a WordPress transient.
 * This transient is used by the content filter to determine if prev
 * and next links need to be added to a post.
 *
 * @param   int    $post_id The ID of the post being saved.
 * @param   object $post_after The modified post.
 * @param   object $post_before The post before modification.
 */
function pau_cache_book_order_on_save( $post_id, $post_after, $post_before ) {
	// Check if this is a valid post to check (autosaves, revisions, etc.).
	// if not, we don't want to save it.
	if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
		return;
	}
	$old_content = $post_before->post_content;
	$old_blocks  = parse_blocks( $old_content );

	// 2. Get the NEW blocks
	$new_content = $post_after->post_content;
	$new_blocks  = parse_blocks( $new_content );

	// Now you can compare them!
	$old_tocs = pau_extract_toc_data( $old_blocks );
	$new_tocs = pau_extract_toc_data( $new_blocks );

	// extract the old and new TOCs and see if there is a difference.
	$old_ids      = pau_extract_toc_data( $old_blocks );
	$new_ids      = pau_extract_toc_data( $new_blocks );
	$deleted_tocs = array_diff_assoc( $old_ids, $new_ids );
	$added_tocs   = array_diff_assoc( $new_ids, $old_ids );

	$current_tocs = get_option( 'pau_book_tocs' );
	// There are TOCs to delete, delete them.
	if ( count( $deleted_tocs ) > 0 ) {
		foreach ( $deleted_tocs as $deleted_toc ) {
			$toc_id = 'pau_book_order_' . $deleted_toc;
			if ( 1 === $current_tocs[ $toc_id ] ) {
				// remove the item from the array.
				unset( $current_tocs[ $toc_id ] );
			} else {
				$current_tocs[ $toc_id ] = $current_tocs[ $toc_id ] - 1;
			}
		}
	}

	// There are TOCs to add, add them.
	if ( count( $added_tocs ) > 0 ) {
		foreach ( $added_tocs as $deleted_toc ) {
			$toc_id = 'pau_book_order_' . $deleted_toc;
			if ( isset( $current_tocs[ $toc_id ] ) ) {
				$current_tocs[ $toc_id ] = $current_tocs[ $toc_id ] + 1;
			} else {
				$current_tocs[ $toc_id ] = 1;
			}
		}
	}

	// now walk through the blocks and look for a pau-table-of-contents-block.
	// if one is found cache the structure to use in the content block.
	$new_tocs = array();
	$blocks   = parse_blocks( $post_after->post_content );
	foreach ( $blocks as $block ) {
		// look for the pau-table-of-contents-block.
		if ( 'create-block/pau-table-of-contents-block' === $block['blockName'] ) {
			// Found the block. Get its attributes.
			$attrs = $block['attrs'];
			// Ensure all required attributes are set.
			if ( ! empty( $attrs['category'] ) && ! empty( $attrs['chapterOrder'] ) && ! empty( $attrs['postOrder'] ) ) {

				$root_category_id = (int) $attrs['category'];

				// Sanitize the data just in case and store it in a structure array.
				$structure_to_cache = array(
					'root_id'      => $root_category_id,
					'chapterOrder' => (array) $attrs['chapterOrder'],
					'postOrder'    => (array) $attrs['postOrder'],
				);

				// Create a unique option key based on the root category ID.
				// This allows for multiple "books" on one site. However it only allows for one TOC per root category.
				// If you create two TOCs from the same book they will share the root category.
				$option_key = 'pau_book_order_' . $root_category_id;

				$new_tocs[ $option_key ] = $structure_to_cache;
			}
		}
	}
	update_option( 'pau_book_tocs', $current_tocs );
	// now we can add our new TOCs. We only want to add each sturcture once.
	$unique_tocs = array_unique( $new_tocs );
	foreach ( $unique_tocs as $new_toc_id => $new_toc_structure ) {
		update_option( $new_toc_id, $new_toc_structure );
	}
}

/**
 *  Inject nav links into posts
 *
 * Injects Previous/Next navigation links into the post content of any post that is part of a TOC. This makes
 * it easy for the user to navigate a book.
 *
 * @param string $content The original post content.
 * @return string The modified post content with nav links.
 */
function pau_inject_nav_links( $content ) {
	// Only run this on the front-end for singular posts.
	if ( ! is_singular() ) {
		return $content;
	}
	// needed globals for the method.
	global $post;
	$current_post_id = $post->ID;

	// grab all our know TOCs.
	$tocs = get_option( 'pau_book_tocs' );

	// if there are no TOCs, no TOC has been established and we can.
	// just return the content.
	if ( empty( $tocs ) ) {
		return $content;
	}

	// we have keys and a single post. Now walk through the post and see if it's part of any TOC.
	$book_structure = null;
	$current_chap   = null;
	foreach ( $tocs as $key => $value ) {

		$toc_structure = get_option( $key );
		if ( ! $toc_structure ) {
			continue;
		}
		$post_order_map = (array) $toc_structure['postOrder'];

		// Check all chapters in this book.
		foreach ( $post_order_map as $chapter_id => $post_ids ) {
			if ( in_array( $current_post_id, (array) $post_ids, true ) ) {
				// Found it! This post is part of this book.
				$book_structure = $toc_structure;
				$current_chap   = $chapter_id;
				break 2; // Break out of both loops.
			}
		}
	}
	// If no book structure was found that contains this post, return original content.
	if ( ! $book_structure ) {
		return $content;
	}
	// Find the previous and next links.
	$chapter_order = (array) $book_structure['chapterOrder'];
	$post_order    = (array) $book_structure['postOrder'];

	$prev_post_id = null;
	$next_post_id = null;

	// Get the post order for the current post's chapter.
	$posts_in_this_chapter = (array) $post_order[ $current_chap ];
	// Find the index of the current post in this chapter. We that the post was in the chapter above.
	$current_post_index = array_search( $current_post_id, $posts_in_this_chapter, true );

	// 1. Find Previous Post ID.
	if ( $current_post_index > 0 ) {
		// Easy case: It's the previous post in the same chapter.
		$prev_post_id = $posts_in_this_chapter[ $current_post_index - 1 ];
	} else {
		// Chapter Transition: Find the previous chapter.
		$current_chapter_index = array_search( (int) $current_chap, $chapter_order, true );
		if ( $current_chapter_index > 0 ) {
			// Get the ID of the previous chapter.
			$prev_chapter_id       = $chapter_order[ $current_chapter_index - 1 ];
			$posts_in_prev_chapter = (array) $post_order[ $prev_chapter_id ];
			// Get the last post of that previous chapter.
			$prev_post_id = end( $posts_in_prev_chapter );
		}
	}

	// 2. Find Next Post ID. This is the same logic as above.
	$last_post_index_in_chapter = count( $posts_in_this_chapter ) - 1;
	if ( $current_post_index < $last_post_index_in_chapter ) {
		// Easy case: It's the next post in the same chapter.
		$next_post_id = $posts_in_this_chapter[ $current_post_index + 1 ];
	} else {
		// Chapter Transition: Find the next chapter.
		$current_chapter_index = array_search( (int) $current_chap, $chapter_order, true );
		$last_chapter_index    = count( $chapter_order ) - 1;
		if ( $current_chapter_index < $last_chapter_index ) {
			// Get the ID of the next chapter.
			$next_chapter_id       = $chapter_order[ $current_chapter_index + 1 ];
			$posts_in_next_chapter = (array) $post_order[ $next_chapter_id ];
			// Get the first post of that next chapter.
			$next_post_id = $posts_in_next_chapter[0] ?? null;
		}
	}
	// now that we have found the previous and next posts, create the urls to them.
	$nav_html = '';

	if ( $prev_post_id ) {
		$prev_title = wp_kses_data( get_the_title( $prev_post_id ) );
		$prev_link  = esc_url( get_permalink( $prev_post_id ) );
		$nav_html  .= "<div class='pau-book-nav-prev' style='float:left; width: 48%; text-align: left;'>";
		$nav_html  .= "<a href='{$prev_link}' rel='prev'>&laquo; {$prev_title}</a>";
		$nav_html  .= '</div>';
	}

	if ( $next_post_id ) {
		$next_title = wp_kses_data( get_the_title( $next_post_id ) );
		$next_link  = esc_url( get_permalink( $next_post_id ) );
		$nav_html  .= "<div class='pau-book-nav-next' style='float:right; width: 48%; text-align: right;'>";
		$nav_html  .= "<a href='{$next_link}' rel='next'>{$next_title} &raquo;</a>";
		$nav_html  .= '</div>';
	}

	if ( ! empty( $nav_html ) ) {
		// Append the navigation links after the post content.
		$content .= "<nav class='pau-book-navigation' style='clear:both; display:block; width:100%; margin-top: 2em; padding-top: 1em; border-top: 1px solid #eee;'>{$nav_html}</nav>";
		// Add a clearing div to ensure layout is correct.
		$content .= "<div style='clear:both;'></div>";
	}

	return $content;
}

/**
 * Set up an action and filter hooks
 * Action hook: Listen for post saves and check if a new TOC block has been
 * created.
 * Filter hook: Filter any content and see if the pages are part of a TOC block that we saved above
 * If they are, then add navication links.
 */
function pau_setup_book_nav_hooks() {
	// Hook into the save process to update a global variable any time.
	// There is a save event from a TOC Gutenberg block (which this plugin implements).
	add_action( 'post_updated', 'pau_cache_book_order_on_save', 10, 3 );

	// Hook into the content to create nav links between posts that are.
	// part of the book.
	add_filter( 'the_content', 'pau_inject_nav_links' );
}

pau_setup_book_nav_hooks();
