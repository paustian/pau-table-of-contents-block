<?php
// This file is generated. Do not modify it manually.
return array(
	'pau-table-of-contents-block' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'create-block/pau-table-of-contents-block',
		'version' => '0.5.0',
		'title' => 'Table of Contents',
		'category' => 'design',
		'icon' => 'list-view',
		'description' => 'Generates a Table of Contents based on a root category (book) and its subcategories (chapters)',
		'attributes' => array(
			'alignment' => array(
				'type' => 'string',
				'default' => 'none'
			),
			'category' => array(
				'type' => 'string',
				'default' => ''
			),
			'postOrder' => array(
				'type' => 'object',
				'default' => array(
					
				)
			),
			'chapterOrder' => array(
				'type' => 'array',
				'default' => array(
					
				)
			)
		),
		'example' => array(
			
		),
		'supports' => array(
			'color' => array(
				'background' => true,
				'text' => true
			),
			'html' => false,
			'typography' => array(
				'fontSize' => true
			)
		),
		'textdomain' => 'pau-table-of-contents-block',
		'editorScript' => 'file:./index.js',
		'editorStyle' => 'file:./index.css',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php'
	)
);
