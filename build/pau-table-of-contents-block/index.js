/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/pau-table-of-contents-block/block.json":
/*!****************************************************!*\
  !*** ./src/pau-table-of-contents-block/block.json ***!
  \****************************************************/
/***/ ((module) => {

module.exports = /*#__PURE__*/JSON.parse('{"$schema":"https://schemas.wp.org/trunk/block.json","apiVersion":3,"name":"create-block/pau-table-of-contents-block","version":"0.5.0","title":"Table of Contents","category":"design","icon":"list-view","description":"Generates a Table of Contents based on a root category (book) and its subcategories (chapters)","attributes":{"alignment":{"type":"string","default":"none"},"category":{"type":"string","default":""},"postOrder":{"type":"object","default":{}},"chapterOrder":{"type":"array","default":[]}},"example":{},"supports":{"color":{"background":true,"text":true},"html":false,"typography":{"fontSize":true}},"textdomain":"pau-table-of-contents-block","editorScript":"file:./index.js","editorStyle":"file:./index.css","style":"file:./style-index.css","render":"file:./render.php"}');

/***/ }),

/***/ "./src/pau-table-of-contents-block/edit.js":
/*!*************************************************!*\
  !*** ./src/pau-table-of-contents-block/edit.js ***!
  \*************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ Edit)
/* harmony export */ });
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/block-editor */ "@wordpress/block-editor");
/* harmony import */ var _wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @wordpress/api-fetch */ "@wordpress/api-fetch");
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _editor_scss__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./editor.scss */ "./src/pau-table-of-contents-block/editor.scss");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__);
/**
* Retrieves the required components from the WordPress packages.
*/

/**
 * React hook that is used to mark the block wrapper element.
 * It provides all the necessary props like the class name.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-editor/#useblockprops
 */




/**
 * Lets webpack process CSS, SASS or SCSS files referenced in JavaScript files.
 * Those files can contain any CSS code that gets applied to the editor.
 *
 * @see https://www.npmjs.com/package/@wordpress/scripts#using-css
 */


// Helper function to decode HTML entities in titles

const decodeHTMLEntities = text => {
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
function Edit({
  className,
  attributes: attr,
  setAttributes
}) {
  // Destructuring to include all necessary attributes
  const {
    category,
    postOrder,
    chapterOrder
  } = attr;

  // State for data fetched from the WordPress REST API
  const [categories, setCategories] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_3__.useState)([]); // All top-level categories (Books)
  const [childCategories, setChildCategories] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_3__.useState)([]); // Child categories of the selected root (Chapters)
  const [postsByChapter, setPostsByChapter] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_3__.useState)({}); // Posts associated with each chapter ID
  const [isLoading, setIsLoading] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_3__.useState)(false);

  // NEW: Local state to track which chapters are open/closed in the editor preview
  const [openChapters, setOpenChapters] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_3__.useState)({});
  const onChangeAlignment = newAlignment => {
    setAttributes({
      alignment: newAlignment === undefined ? 'none' : newAlignment
    });
  };
  const onChangeCategory = newCat => {
    // Reset state and attributes when root category changes
    setAttributes({
      category: newCat === '' ? '' : newCat,
      postOrder: {},
      chapterOrder: []
    });
    setOpenChapters({}); // Reset accordion state
  };

  // NEW: Toggle function for the editor preview accordion
  const handleToggleChapter = chapterIdStr => {
    setOpenChapters(prevOpen => ({
      ...prevOpen,
      [chapterIdStr]: !prevOpen[chapterIdStr]
    }));
  };

  // 1. Fetch Root Categories (Parent=0) for the initial dropdown
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_3__.useEffect)(() => {
    _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_4___default()({
      path: '/wp/v2/categories?parent=0&per_page=100'
    }).then(data => setCategories(data)).catch(error => console.error("Error fetching top-level categories:", error));
  }, []);

  // 2. Fetch Child Categories (Chapters) when the root category changes
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_3__.useEffect)(() => {
    if (category && category !== '') {
      setIsLoading(true);
      const parentId = parseInt(category, 10);
      const path = `/wp/v2/categories?parent=${parentId}&per_page=100`;
      _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_4___default()({
        path
      }).then(data => {
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
      }).catch(error => {
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
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_3__.useEffect)(() => {
    if (childCategories.length === 0) {
      setPostsByChapter({});
      setIsLoading(false);
      return;
    }

    // Start fetching posts
    setIsLoading(true);
    const fetchPromises = childCategories.map(chapter => {
      // Fetch posts associated with this chapter category ID
      return _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_4___default()({
        path: `/wp/v2/posts?categories=${chapter.id}&per_page=100&orderby=date&order=asc&_fields=id,title,link&status=publish,future`
      }).then(posts => ({
        chapterId: chapter.id,
        posts
      }));
    });
    Promise.all(fetchPromises).then(results => {
      const newPostsByChapter = {};
      let newPostOrder = {
        ...postOrder
      };
      let postOrderChanged = false;
      results.forEach(({
        chapterId,
        posts
      }) => {
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
        setAttributes({
          postOrder: newPostOrder
        });
      }
      setIsLoading(false);
    }).catch(error => {
      console.error("Error fetching posts for chapters:", error);
      setIsLoading(false);
      setPostsByChapter({});
    });

    // FIX: Removed 'postOrder' from dependencies. This hook should only run when chapters change.
    // Changes to postOrder itself are handled by handleMovePost and should not trigger a re-fetch/re-sanitization
    // unless 'childCategories' has changed.
  }, [childCategories]);

  // 4. Article Reordering Handler
  const handleMovePost = (chapterIdStr, postId, direction) => {
    const currentPostOrder = postOrder[chapterIdStr];
    if (!currentPostOrder) return;
    const currentIndex = currentPostOrder.indexOf(postId);
    let newIndex = currentIndex + (direction === 'up' ? -1 : 1);

    // Ensure the new index is within bounds
    if (newIndex >= 0 && newIndex < currentPostOrder.length) {
      const newChapterOrder = [...currentPostOrder];
      // Swap elements
      [newChapterOrder[currentIndex], newChapterOrder[newIndex]] = [newChapterOrder[newIndex], newChapterOrder[currentIndex]];

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
  const handleMoveChapter = (chapterId, direction) => {
    const currentIndex = chapterOrder.indexOf(chapterId);
    let newIndex = currentIndex + (direction === 'up' ? -1 : 1);
    if (newIndex >= 0 && newIndex < chapterOrder.length) {
      const newChapterOrder = [...chapterOrder];
      // Swap elements
      [newChapterOrder[currentIndex], newChapterOrder[newIndex]] = [newChapterOrder[newIndex], newChapterOrder[currentIndex]];

      // Update the block attribute
      setAttributes({
        chapterOrder: newChapterOrder
      });
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
  const getChapterName = chapterId => {
    const chapterIdInt = parseInt(chapterId, 10);

    // Find the root category name (optional, mainly for the H2 title)
    const root = categories.find(c => c.id === parseInt(category, 10));
    if (root && root.id === chapterIdInt) {
      return root.name;
    }

    // Find the child category (chapter) name
    const childChapter = childCategories.find(c => c.id === chapterIdInt);
    return childChapter ? decodeHTMLEntities(childChapter.name) : `[Category ID ${chapterId} - Name Not Found]`;
  };
  const blockProps = (0,_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__.useBlockProps)({
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
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
    ...blockProps,
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__.BlockControls, {
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToolbarGroup, {
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__.AlignmentToolbar, {
          value: attr.alignment,
          onChange: onChangeAlignment
        })
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__.InspectorControls, {
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelBody, {
        title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)("Settings", 'pau-table-of-contents-block'),
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Root Category', 'pau-table-of-contents-block'),
          value: category,
          options: [{
            label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Select a root category', 'pau-table-of-contents-block'),
            value: ''
          }, ...categories.map(cat => ({
            label: cat.name,
            value: String(cat.id)
          }))],
          onChange: onChangeCategory,
          __next40pxDefaultSize: true,
          __nextHasNoMarginBottom: true
        })
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
      className: "toc-preview-container",
      style: {
        textAlign: attr.alignment
      },
      children: [isLoading && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
        className: "flex items-center space-x-2 p-3 bg-indigo-100 text-indigo-800 rounded",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Spinner, {}), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
          children: "Loading chapters and articles..."
        })]
      }), !isLoading && category && orderedChapters.length > 0 && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("div", {
        className: "wp-block-pau-table-of-contents-block-list",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("ul", {
          children: orderedChapters.map((chapter, chapterIndex) => {
            const chapterIdStr = String(chapter.id);
            // Use the custom post order from attributes, falling back to an empty array
            const orderedPostIds = postOrder[chapterIdStr] || [];
            const isFirstChapter = chapterIndex === 0;
            const isLastChapter = chapterIndex === orderedChapters.length - 1;

            // NEW: Check if this chapter is currently open in the editor preview
            const isChapterOpen = openChapters[chapterIdStr] || false;
            return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("li", {
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
                className: "flex items-center justify-between",
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
                  className: "chapter-toggle-button" // Add class for styling/targeting
                  ,
                  onClick: () => handleToggleChapter(chapterIdStr),
                  isTertiary: true,
                  "aria-expanded": isChapterOpen,
                  style: {
                    padding: 0,
                    margin: 0
                  },
                  children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Dashicon, {
                    icon: isChapterOpen ? "arrow-down" : "arrow-right",
                    style: {
                      marginRight: 8
                    }
                  }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
                    children: getChapterName(chapter.id)
                  })]
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
                  className: "flex space-x-1",
                  children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
                    icon: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Dashicon, {
                      icon: "arrow-up-alt2"
                    }),
                    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Move Chapter Up', 'toc-block'),
                    onClick: () => handleMoveChapter(chapter.id, 'up'),
                    disabled: isFirstChapter,
                    isSmall: true
                  }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
                    icon: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Dashicon, {
                      icon: "arrow-down-alt2"
                    }),
                    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Move Chapter Down', 'toc-block'),
                    onClick: () => handleMoveChapter(chapter.id, 'down'),
                    disabled: isLastChapter,
                    isSmall: true
                  })]
                })]
              }), isChapterOpen && orderedPostIds.length > 0 && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("ul", {
                children: orderedPostIds.map((postId, index) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("li", {
                  children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
                    className: "text-gray-600 flex-grow pr-2 text-sm",
                    children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("a", {
                      href: getPostLink(chapterIdStr, postId),
                      onClick: e => e.preventDefault(),
                      children: getPostTitle(chapterIdStr, postId)
                    })
                  }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
                    className: "flex space-x-1",
                    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
                      icon: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Dashicon, {
                        icon: "arrow-up-alt2"
                      }),
                      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Move Article Up', 'toc-block'),
                      onClick: () => handleMovePost(chapterIdStr, postId, 'up'),
                      disabled: index === 0,
                      isSmall: true
                    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
                      icon: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Dashicon, {
                        icon: "arrow-down-alt2"
                      }),
                      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Move Article Down', 'toc-block'),
                      onClick: () => handleMovePost(chapterIdStr, postId, 'down'),
                      disabled: index === orderedPostIds.length - 1,
                      isSmall: true
                    })]
                  })]
                }, postId))
              }), isChapterOpen && orderedPostIds.length === 0 && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
                className: "text-xs text-gray-500 mt-1 pl-4",
                children: "(No articles found in this chapter.)"
              })]
            }, chapter.id);
          })
        })
      }), !isLoading && category && orderedChapters.length === 0 && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
        className: "p-3 bg-yellow-100 text-yellow-800 rounded",
        children: "No chapters (child categories) found for this root category."
      })]
    })]
  });
}

/***/ }),

/***/ "./src/pau-table-of-contents-block/editor.scss":
/*!*****************************************************!*\
  !*** ./src/pau-table-of-contents-block/editor.scss ***!
  \*****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
// extracted by mini-css-extract-plugin


/***/ }),

/***/ "./src/pau-table-of-contents-block/index.js":
/*!**************************************************!*\
  !*** ./src/pau-table-of-contents-block/index.js ***!
  \**************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _wordpress_blocks__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/blocks */ "@wordpress/blocks");
/* harmony import */ var _wordpress_blocks__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_blocks__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _style_scss__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./style.scss */ "./src/pau-table-of-contents-block/style.scss");
/* harmony import */ var _edit__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./edit */ "./src/pau-table-of-contents-block/edit.js");
/* harmony import */ var _save__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./save */ "./src/pau-table-of-contents-block/save.js");
/* harmony import */ var _block_json__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./block.json */ "./src/pau-table-of-contents-block/block.json");
/**
 * Registers a new block provided a unique name and an object defining its behavior.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-registration/
 */


/**
 * Lets webpack process CSS, SASS or SCSS files referenced in JavaScript files.
 * All files containing `style` keyword are bundled together. The code used
 * gets applied both to the front of your site and to the editor.
 *
 * @see https://www.npmjs.com/package/@wordpress/scripts#using-css
 */


/**
 * Internal dependencies
 */




/**
 * Every block starts by registering a new block type definition.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-registration/
 */
(0,_wordpress_blocks__WEBPACK_IMPORTED_MODULE_0__.registerBlockType)(_block_json__WEBPACK_IMPORTED_MODULE_4__.name, {
  /**
   * @see ./edit.js
   */
  edit: _edit__WEBPACK_IMPORTED_MODULE_2__["default"],
  /**
   * @see ./save.js
   */
  save: _save__WEBPACK_IMPORTED_MODULE_3__["default"]
});

/***/ }),

/***/ "./src/pau-table-of-contents-block/save.js":
/*!*************************************************!*\
  !*** ./src/pau-table-of-contents-block/save.js ***!
  \*************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ save)
/* harmony export */ });
/* harmony import */ var _wordpress_block_editor__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/block-editor */ "@wordpress/block-editor");
/* harmony import */ var _wordpress_block_editor__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__);
/**
 * React hook that is used to mark the block wrapper element.
 * It provides all the necessary props like the class name.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-editor/#useblockprops
 */


/**
 * The save function defines the way in which the different attributes should
 * be combined into the final markup, which is then serialized by the block
 * editor into `post_content`.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#save
 *
 * @return {Element} Element to render.
 */

function save() {
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("p", {
    ..._wordpress_block_editor__WEBPACK_IMPORTED_MODULE_0__.useBlockProps.save(),
    children: ''
  });
}

/***/ }),

/***/ "./src/pau-table-of-contents-block/style.scss":
/*!****************************************************!*\
  !*** ./src/pau-table-of-contents-block/style.scss ***!
  \****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
// extracted by mini-css-extract-plugin


/***/ }),

/***/ "@wordpress/api-fetch":
/*!**********************************!*\
  !*** external ["wp","apiFetch"] ***!
  \**********************************/
/***/ ((module) => {

module.exports = window["wp"]["apiFetch"];

/***/ }),

/***/ "@wordpress/block-editor":
/*!*************************************!*\
  !*** external ["wp","blockEditor"] ***!
  \*************************************/
/***/ ((module) => {

module.exports = window["wp"]["blockEditor"];

/***/ }),

/***/ "@wordpress/blocks":
/*!********************************!*\
  !*** external ["wp","blocks"] ***!
  \********************************/
/***/ ((module) => {

module.exports = window["wp"]["blocks"];

/***/ }),

/***/ "@wordpress/components":
/*!************************************!*\
  !*** external ["wp","components"] ***!
  \************************************/
/***/ ((module) => {

module.exports = window["wp"]["components"];

/***/ }),

/***/ "@wordpress/element":
/*!*********************************!*\
  !*** external ["wp","element"] ***!
  \*********************************/
/***/ ((module) => {

module.exports = window["wp"]["element"];

/***/ }),

/***/ "@wordpress/i18n":
/*!******************************!*\
  !*** external ["wp","i18n"] ***!
  \******************************/
/***/ ((module) => {

module.exports = window["wp"]["i18n"];

/***/ }),

/***/ "react/jsx-runtime":
/*!**********************************!*\
  !*** external "ReactJSXRuntime" ***!
  \**********************************/
/***/ ((module) => {

module.exports = window["ReactJSXRuntime"];

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/chunk loaded */
/******/ 	(() => {
/******/ 		var deferred = [];
/******/ 		__webpack_require__.O = (result, chunkIds, fn, priority) => {
/******/ 			if(chunkIds) {
/******/ 				priority = priority || 0;
/******/ 				for(var i = deferred.length; i > 0 && deferred[i - 1][2] > priority; i--) deferred[i] = deferred[i - 1];
/******/ 				deferred[i] = [chunkIds, fn, priority];
/******/ 				return;
/******/ 			}
/******/ 			var notFulfilled = Infinity;
/******/ 			for (var i = 0; i < deferred.length; i++) {
/******/ 				var [chunkIds, fn, priority] = deferred[i];
/******/ 				var fulfilled = true;
/******/ 				for (var j = 0; j < chunkIds.length; j++) {
/******/ 					if ((priority & 1 === 0 || notFulfilled >= priority) && Object.keys(__webpack_require__.O).every((key) => (__webpack_require__.O[key](chunkIds[j])))) {
/******/ 						chunkIds.splice(j--, 1);
/******/ 					} else {
/******/ 						fulfilled = false;
/******/ 						if(priority < notFulfilled) notFulfilled = priority;
/******/ 					}
/******/ 				}
/******/ 				if(fulfilled) {
/******/ 					deferred.splice(i--, 1)
/******/ 					var r = fn();
/******/ 					if (r !== undefined) result = r;
/******/ 				}
/******/ 			}
/******/ 			return result;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			"pau-table-of-contents-block/index": 0,
/******/ 			"pau-table-of-contents-block/style-index": 0
/******/ 		};
/******/ 		
/******/ 		// no chunk on demand loading
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		__webpack_require__.O.j = (chunkId) => (installedChunks[chunkId] === 0);
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		var webpackJsonpCallback = (parentChunkLoadingFunction, data) => {
/******/ 			var [chunkIds, moreModules, runtime] = data;
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0;
/******/ 			if(chunkIds.some((id) => (installedChunks[id] !== 0))) {
/******/ 				for(moduleId in moreModules) {
/******/ 					if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 						__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 					}
/******/ 				}
/******/ 				if(runtime) var result = runtime(__webpack_require__);
/******/ 			}
/******/ 			if(parentChunkLoadingFunction) parentChunkLoadingFunction(data);
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(__webpack_require__.o(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 					installedChunks[chunkId][0]();
/******/ 				}
/******/ 				installedChunks[chunkId] = 0;
/******/ 			}
/******/ 			return __webpack_require__.O(result);
/******/ 		}
/******/ 		
/******/ 		var chunkLoadingGlobal = globalThis["webpackChunkpau_table_of_contents_block"] = globalThis["webpackChunkpau_table_of_contents_block"] || [];
/******/ 		chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(null, 0));
/******/ 		chunkLoadingGlobal.push = webpackJsonpCallback.bind(null, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module depends on other loaded chunks and execution need to be delayed
/******/ 	var __webpack_exports__ = __webpack_require__.O(undefined, ["pau-table-of-contents-block/style-index"], () => (__webpack_require__("./src/pau-table-of-contents-block/index.js")))
/******/ 	__webpack_exports__ = __webpack_require__.O(__webpack_exports__);
/******/ 	
/******/ })()
;
//# sourceMappingURL=index.js.map