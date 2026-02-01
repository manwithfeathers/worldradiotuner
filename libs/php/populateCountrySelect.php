<?php
    $str = file_get_contents('../data/countryBorders.geo.json');
    $json = json_decode($str, true);


    foreach ($json['features'] as $feature) {
        $name = $feature['properties']['name'];
        trim($name);
        $code = $feature['properties']['iso_a2'];
        $output['data'][$name] = $code;
    }

    
    
    ksort($output);
    $output["status"]['name'] = "ok";
	
	echo json_encode($output); 

?>

