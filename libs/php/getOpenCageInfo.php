<?php

	// remove for production

	ini_set('display_errors', 'On');
	error_reporting(E_ALL);

	$executionStartTime = microtime(true);

	$url='https://api.opencagedata.com/geocode/v1/json?q=' . $_REQUEST['name'] . '&key=d3c050b9c286465b913fc745cb6bfa2a';
	//$url='http://api.geonames.org/findNearbyWikipediaJSON?lat=0&lng=0&radius=10&username=adamparkinson';
	
	$ch = curl_init();
	curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($ch, CURLOPT_URL,$url);

	$result=curl_exec($ch);

	curl_close($ch);

	$decode = json_decode($result,true);	

	$output['status']['code'] = "200";
	$output['status']['name'] = "ok";
	$output['status']['description'] = "success";
	$output['status']['returnedIn'] = intval((microtime(true) - $executionStartTime) * 1000) . " ms";
	$output['data'] = $decode['results'][0];
	
	header('Content-Type: application/json; charset=UTF-8');

	echo json_encode($output); 

?>

