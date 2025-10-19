<?php
// This file is generated. Do not modify it manually.
return array(
	'pau-table-of-contents-block' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'create-block/pau-table-of-contents-block',
		'version' => '0.1.0',
		'title' => 'Table of Contents',
		'category' => 'widgets',
		'icon' => 'list-view',
		'description' => 'List a table of contents by picking a top-level category.',
		'attributes' => array(
			'content' => array(
				'type' => 'string',
				'source' => 'html',
				'selector' => 'p'
			),
			'alignment' => array(
				'type' => 'string',
				'default' => 'none'
			),
			'category' => array(
				'type' => 'boolean'
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
		'viewScript' => 'file:./view.js'
	)
);
