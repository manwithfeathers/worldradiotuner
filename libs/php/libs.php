<?php

function curl_check($url) {
    $executionStartTime = microtime(true);
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_URL,$url);
    curl_setopt($ch, CURLOPT_USERAGENT, "a.d.parkinson@gmail.com");

    $result=curl_exec($ch);
    $cURLERROR = curl_errno($ch);
    $code = curl_getinfo($ch)["http_code"];
    

    curl_close($ch);
    if ($cURLERROR) {
    // if we get a curl error, record it, pass it to json    

        $output['status']['code'] = $cURLERROR;
        $output['status']['name'] = "Failure - cURL";
        $output['status']['description'] = curl_strerror($cURLERROR);
        $output['status']['seconds'] = number_format((microtime(true) - $executionStartTime), 3);
        $output['data'] = null;
        return $output;    
        
    } 
    if (strval($code)[0] != "2" ) {
    // if we don't get an http success code, we record http failure
        $output['status']['code'] = $code;
        $output['status']['name'] = "Failure - HTTP";
        $output['status']['description'] = "HTTP Error $code";
        $output['status']['seconds'] = number_format((microtime(true) - $executionStartTime), 3);
        $output['data'] = null;
        return $output;

    }

    $results_json = json_decode($result, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        
        $output['status']['code'] = json_last_error();
        $output['status']['name'] = "Failure - JSON";
        $output['status']['description'] = json_last_error_msg();
        $output['status']['seconds'] = number_format((microtime(true) - $executionStartTime), 3);
        $output['data'] = null;
        return $output;           
    }   
    $output['status']['code'] = $code;
    $output['status']['seconds'] = number_format((microtime(true) - $executionStartTime), 3);
    $output['data'] = $results_json;
    return $output;
    }  
?>