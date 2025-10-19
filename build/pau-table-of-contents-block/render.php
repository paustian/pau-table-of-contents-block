<?php
/**
 * Dynamic rendering callback for the Table of Contents block.
 *
 * This file generates the final front-end HTML for the block. It fetches chapters
 * and posts based on the saved attributes and applies the custom order for both
 * chapters and articles.
 *
 * @package pau-table-of-contents-block
 * @param array $attributes The block attributes.
 * @return string The rendered HTML.
 */

defined( 'ABSPATH' ) || exit;

// 1. Check for required attributes
$root_category_id = isset( $attributes['category'] ) ? (int) $attributes['category'] : 0;
$post_order       = isset( $attributes['postOrder'] ) ? (array) $attributes['postOrder'] : array();
$chapter_order    = isset( $attributes['chapterOrder'] ) ? (array) $attributes['chapterOrder'] : array();
$alignment        = isset( $attributes['alignment'] ) ? sanitize_key( $attributes['alignment'] ) : 'none';

// If no category is selected, or it's invalid, return early.
if ( ! $root_category_id ) {
	// Only show this message in the editor/debug mode
	if ( is_user_logged_in() && current_user_can( 'edit_posts' ) ) {
		return '<!-- Table of Contents Block: Select a root category in the editor to display content. -->';
	}
	return '';
}

// 2. Fetch all child categories (chapters)
$child_categories = get_categories( array(
	'parent'     => $root_category_id,
	'taxonomy'   => 'category',
	'hide_empty' => false,
	'orderby'    => 'include', // We will sort manually later
) );

if ( empty( $child_categories ) ) {
	return '<p class="wp-block-pau-table-of-contents-block-error">No chapters found for the selected category.</p>';
}

// 3. Apply Custom Chapter Order
// Map the fetched categories by ID for easy lookup
$categories_map = array();
foreach ( $child_categories as $cat ) {
	$categories_map[ $cat->term_id ] = $cat;
}

$ordered_chapters = array();

// Build the ordered list based on the chapterOrder array saved in attributes
if ( ! empty( $chapter_order ) ) {
	foreach ( $chapter_order as $cat_id ) {
		$cat_id = (int) $cat_id;
		if ( isset( $categories_map[ $cat_id ] ) ) {
			$ordered_chapters[] = $categories_map[ $cat_id ];
			// Remove from map to ensure only missing categories are appended later
			unset( $categories_map[ $cat_id ] );
		}
	}
	// Append any chapters that were fetched but were not in the saved chapterOrder
	$ordered_chapters = array_merge( $ordered_chapters, $categories_map );
} else {
	// Fallback: If chapterOrder is empty, use the default fetched order
	$ordered_chapters = $child_categories;
}

// 4. Start HTML output
$alignment_class = ( 'none' !== $alignment ) ? ' align' . esc_attr( $alignment ) : '';
$wrapper_attributes = get_block_wrapper_attributes( array(
	'class' => 'wp-block-pau-table-of-contents-block' . $alignment_class,
	'style' => ( 'none' !== $alignment ) ? 'text-align: ' . esc_attr( $alignment ) . ';' : '',
) );

echo '<div ' . $wrapper_attributes . '>';
echo '<h2 class="toc-root-title">' . esc_html( get_cat_name( $root_category_id ) ) . '</h2>';
echo '<ol class="toc-chapters-list">';

foreach ( $ordered_chapters as $chapter ) {
	$chapter_id_str = (string) $chapter->term_id;

	echo '<li class="toc-chapter">';
	echo '<a href="' . esc_url( get_category_link( $chapter->term_id ) ) . '" class="toc-chapter-link">' . esc_html( $chapter->name ) . '</a>';

	// 5. Determine Post Order for this Chapter
	$post_ids_to_fetch = array();

	// Check if a custom order exists for this chapter
	if ( isset( $post_order[ $chapter_id_str ] ) && is_array( $post_order[ $chapter_id_str ] ) ) {
		$post_ids_to_fetch = array_map( 'intval', $post_order[ $chapter_id_str ] );
	}

	// 6. Setup WP_Query arguments
	$args = array(
		'post_type'      => array( 'post', 'page' ), // Articles can be posts or pages
		'posts_per_page' => 100,
		'post_status'    => array( 'publish', 'future' ),
		'tax_query'      => array(
			array(
				'taxonomy' => 'category',
				'field'    => 'term_id',
				'terms'    => $chapter->term_id,
			),
		),
	);

	if ( ! empty( $post_ids_to_fetch ) ) {
		// If we have a custom order, fetch only those posts and order by that list
		$args['post__in'] = $post_ids_to_fetch;
		$args['orderby']  = 'post__in'; // Critical for maintaining the order from edit.js
	} else {
		// Fallback to default sorting (date)
		$args['orderby'] = 'date';
		$args['order']   = 'ASC';
	}

	$chapter_posts = new WP_Query( $args );

	if ( $chapter_posts->have_posts() ) {
		echo '<ul class="toc-article-list">';
		while ( $chapter_posts->have_posts() ) {
			$chapter_posts->the_post();

			// FIX: Ensure global post context is correct to use get_permalink()
			global $post;
			setup_postdata( $post );

			echo '<li class="toc-article">';
			echo '<a href="' . esc_url( get_permalink() ) . '">' . get_the_title() . '</a>';
			echo '</li>';
		}
		echo '</ul>';

		// FIX: Reset the global post data context after the loop to prevent conflicts
		wp_reset_postdata();

	}
	echo '</li>'; // End of toc-chapter
}

echo '</ol>';
echo '</div>';

// Return an empty string as is best practice when outputting via echo in a block render function
return '';
