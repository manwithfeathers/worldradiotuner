<?php
    include 'libs.php';

	// remove for production

	ini_set('display_errors', 'On');
	error_reporting(E_ALL);

    // set the return header

    header('Content-Type: application/json; charset=UTF-8');
    header('Access-Control-Allow-Origin: *');


	$url='http://de2.api.radio-browser.info/json/stations/bycountrycodeexact/' . $_REQUEST['name'];
	

	$response = curl_check($url);
 
    if (is_null($response['data'])) {
        echo json_encode($response); 
        exit;
    } 

    if (!isset($response['data']) || count($response["data"]) === 0){
        $output['status'] = $response['status'];
		$output['status']['name'] = "Failure - API";
		$output['status']['description'] = "Error retrieving data from Radio Browser API";
		$output['data'] = null;
		echo json_encode($output); 
		exit;

    }


    $output['status'] = $response['status'];
    $output['status']['name'] = "ok";
    $output['status']['description'] = "success";
    $output['data'] = $response['data'];
    echo json_encode($output); 
    

?>

