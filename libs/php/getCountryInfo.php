<?php


	include 'libs.php';

	
	// remove for production

	ini_set('display_errors', 'On');
	error_reporting(E_ALL);

	header('Content-Type: application/json; charset=UTF-8');
    header('Access-Control-Allow-Origin: *');
	

	$url='https://www.geonames.org/countryInfoJSON?lang=eng&country=' . $_REQUEST['name'] . "&username=adamparkinson";
	
	
	$response = curl_check(($url));

	if (is_null($response['data'])) {
		echo json_encode($response); 
		exit;
	}

	if (!isset($response['data']['geonames']) || count($response['data']['geonames']) === 0) {
		$output['status'] = $response['status'];
		$output['status']['name'] = "Failure - API";
		$output['status']['description'] = "Failure geocoding this location";
		$output['data'] = null;
		echo json_encode($output); 
		exit;
	}

	

	$output['status'] = $response['status'];
	$output['status']['name'] = "ok";
	$output['status']['description'] = "success";
	$output['data'] = $response['data']['geonames'];
	



	echo json_encode($output); 

?>

