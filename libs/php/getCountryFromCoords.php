<?php
	include 'libs.php';

	// remove for production

	ini_set('display_errors', 'On');
	error_reporting(E_ALL);

	header('Content-Type: application/json; charset=UTF-8');
    header('Access-Control-Allow-Origin: *');
	
	// remove for production
    $API_KEY = "d3c050b9c286465b913fc745cb6bfa2a";


    $url= "https://api.opencagedata.com/geocode/v1/json?q=" . $_REQUEST['lat']."+". $_REQUEST['lng'] ."&key=d3c050b9c286465b913fc745cb6bfa2a";

	$response = curl_check($url);

	if (is_null($response['data'])) {
		echo json_encode($reponse); 
		exit;
	} 

	if (!isset($response['data']['results']) || count($response['data']['results']) === 0) {
		
		$output['status'] = $response['status'];
		$output['status']['name'] = "Failure - API";
		$output['status']['description'] = "error retrieving data from api";
		$output['data'] = null;
		echo json_encode($output); 
		exit;
	}
	
	$output['status'] = $response['status'];
	$output['status']['name'] = "ok";
	$output['status']['description'] = "success";
	$output['data']['country_code'] = $response['data']['results'][0]['components']['country_code'];
	$output['data']['name'] = $response['data']['results'][0]['components']['country'];

	echo json_encode($output); 	
	


?>

