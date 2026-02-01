<?php
    $str = file_get_contents('../data/countryBorders.geo.json');
    $json = json_decode($str, true);

    $id = $_REQUEST['id'];

    foreach ($json['features'] as $feature) {
        if ($feature['properties']['iso_a2'] == $id || $feature['properties']['name'] == $id) {
            $output["status"]["name"] = "ok";
            $output['data'] = $feature['geometry'];
            echo json_encode($output); 
            break;
        };
    
    }

?>