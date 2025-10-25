<?php

defined( 'ABSPATH' ) || exit;
function pau_setup_book_nav_hooks() {
    // Hook into the save process to update a global variable any time
    //there is a save event from a TOC gutenberg block (which this plugin implements)
    add_action( 'save_post', 'pau_cache_book_order_on_save' );

    //Hook into the content to create nav links between posts that are
    //part of the book
    add_filter( 'the_content', 'pau_inject_nav_links' );
}

/**
 * STEP 1: Caching Logic
 *
 * Fires when a post is saved. Scans the post content for the TOC block
 * and saves its custom order attributes to a WordPress transient.
 * This transient is used by the content filter to determine if prev
 * and next links need to be added to a post.
 *
 * @param int $post_id The ID of the post being saved.
 * @param WP_Post $post The post object.
 */

function pau_cache_book_order_on_save( $post_id ) {
    // Check if this is a valid post to check (autosaves, revisions, etc.)
    //if not, we don't want to save it
    if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
        return;
    }
    // Get the post content
    $post = get_post( $post_id );
    if ( ! $post || ! has_blocks( $post->post_content ) ) {
        return;
    }
    //now walk through the blocks and look for a pau-table-of-contents-block
    //if one is found cache the structure to use in the content block
    $blocks = parse_blocks( $post->post_content );
    foreach ( $blocks as $block ) {
        // look for the pau-table-of-contents-block
        if ( 'create-block/pau-table-of-contents-block' === $block['blockName'] ) {
            // Found the block. Get its attributes.
            $attrs = $block['attrs'];

            // Ensure all required attributes are set
            if ( ! empty( $attrs['category'] ) && ! empty( $attrs['chapterOrder'] ) && ! empty( $attrs['postOrder'] ) ) {

                $root_category_id = (int) $attrs['category'];

                // Sanitize the data just in case and store it in a structure array
                $structure_to_cache = array(
                    'root_id'      => $root_category_id,
                    'chapterOrder' => (array) $attrs['chapterOrder'],
                    'postOrder'    => (array) $attrs['postOrder'],
                );

                // Create a unique transient key based on the root category ID.
                // This allows for multiple "books" on one site.
                $transient_key = 'pau_book_order_' . $root_category_id;

                // Save the data to the transient.
                // Set to 0 for no expiration (it will only update on save).
                set_transient( $transient_key, $structure_to_cache, 0 );
            }
        }
    }
}

/**
 *  Now walk through the post and see if it is part of a TOC
 *
 * Injects Previous/Next navigation links into the post content.
 *
 * @param string $content The original post content.
 * @return string The modified post content with nav links.
 */
function pau_inject_nav_links( $content ) {
    // Only run this on the front-end for singular posts.
    if ( ! is_singular() ) {
        return $content;
    }
    //needed globals for the method.
    global $wpdb, $post;
    $current_post_id = $post->ID;

    //grab all cached transients
    $transient_keys = $wpdb->get_col( "SELECT option_name FROM $wpdb->options WHERE option_name LIKE '_transient_pau_book_order_%'" );

    //if there are no transient keys, not TOC has been established and we can
    //just return the content.
    if ( empty( $transient_keys ) ) {
        return $content;
    }

    //we have keys and a single post. Now walk through the post and see if it's part of any TOC
    $book_structure = null;
    $current_chap   = null;

    // Iterate through all cached books to see if this post belongs to one
    foreach ( $transient_keys as $key ) {
        $transient_key  = str_replace( '_transient_', '', $key );
        $structure      = get_transient( $transient_key );
        $post_order_map = (array) $structure['postOrder'];

        // Check all chapters in this book
        foreach ( $post_order_map as $chapter_id => $post_ids ) {
            if ( in_array( $current_post_id, (array) $post_ids, true ) ) {
                // Found it! This post is part of this book.
                $book_structure = $structure;
                $current_chap   = $chapter_id;
                break 2; // Break out of both loops
            }
        }
    }
    // If no book structure was found that contains this post, return original content.
    if ( ! $book_structure ) {
        return $content;
    }
    //Find the previous and next links
    $chapter_order = (array) $book_structure['chapterOrder'];
    $post_order    = (array) $book_structure['postOrder'];

    $prev_post_id = null;
    $next_post_id = null;

    // Get the post order for the current post's chapter
    $posts_in_this_chapter = (array) $post_order[ $current_chap ];
    //Find the index of the current post in this chapter. We that the post was in the chapter above
    $current_post_index    = array_search( $current_post_id, $posts_in_this_chapter, true );

    // 1. Find Previous Post ID
    if ( $current_post_index > 0 ) {
        // Easy case: It's the previous post in the same chapter.
        $prev_post_id = $posts_in_this_chapter[ $current_post_index - 1 ];
    } else {
        // Chapter Transition: Find the previous chapter
        $current_chapter_index = array_search( (int) $current_chap, $chapter_order, true );
        if ( $current_chapter_index > 0 ) {
            // Get the ID of the previous chapter
            $prev_chapter_id       = $chapter_order[ $current_chapter_index - 1 ];
            $posts_in_prev_chapter = (array) $post_order[ $prev_chapter_id ];
            // Get the last post of that previous chapter
            $prev_post_id = end( $posts_in_prev_chapter );
        }
    }

    // 2. Find Next Post ID. This is the same logic as above
    $last_post_index_in_chapter = count( $posts_in_this_chapter ) - 1;
    if ( $current_post_index < $last_post_index_in_chapter ) {
        // Easy case: It's the next post in the same chapter.
        $next_post_id = $posts_in_this_chapter[ $current_post_index + 1 ];
    } else {
        // Chapter Transition: Find the next chapter
        $current_chapter_index = array_search( (int) $current_chap, $chapter_order, true );
        $last_chapter_index    = count( $chapter_order ) - 1;
        if ( $current_chapter_index < $last_chapter_index ) {
            // Get the ID of the next chapter
            $next_chapter_id       = $chapter_order[ $current_chapter_index + 1 ];
            $posts_in_next_chapter = (array) $post_order[ $next_chapter_id ];
            // Get the first post of that next chapter
            $next_post_id = $posts_in_next_chapter[0] ?? null;
        }
    }
    //now that we have found the previous and next posts, create the urls to them.
    $nav_html = '';

    if ( $prev_post_id ) {
        $prev_title = esc_html( get_the_title( $prev_post_id ) );
        $prev_link  = esc_url( get_permalink( $prev_post_id ) );
        $nav_html  .= "<div class='pau-book-nav-prev' style='float:left; width: 48%; text-align: left;'>";
        $nav_html  .= "<a href='{$prev_link}' rel='prev'>&laquo; {$prev_title}</a>";
        $nav_html  .= '</div>';
    }

    if ( $next_post_id ) {
        $next_title = esc_html( get_the_title( $next_post_id ) );
        $next_link  = esc_url( get_permalink( $next_post_id ) );
        $nav_html  .= "<div class='pau-book-nav-next' style='float:right; width: 48%; text-align: right;'>";
        $nav_html  .= "<a href='{$next_link}' rel='next'>{$next_title} &raquo;</a>";
        $nav_html  .= '</div>';
    }

    if ( ! empty( $nav_html ) ) {
        // Append the navigation links after the post content
        $content .= "<nav class='pau-book-navigation' style='clear:both; display:block; width:100%; margin-top: 2em; padding-top: 1em; border-top: 1px solid #eee;'>{$nav_html}</nav>";
        // Add a clearing div to ensure layout is correct
        $content .= "<div style='clear:both;'></div>";
    }

    return $content;
}


pau_setup_book_nav_hooks();