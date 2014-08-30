<?php
/**
 * This file is part of the exporting module for Highcharts JS.
 * www.highcharts.com/license
 * 
 *  
 * Available POST variables:
 *
 * $tempName string The desired filename without extension
 * $type string The MIME type for export. 
 * $width int The pixel width of the exported raster image. The height is calculated.
 * $svg string The SVG source code to convert.
 */

// Options
define ('BATIK_PATH', 'batik-rasterizer.jar');

///////////////////////////////////////////////////////////////////////////////
//ini_set('magic_quotes_gpc', 'off');

$type = $_POST['type']; //required
$svg = (string) $_POST['svg']; //required
$filename = isset($_POST['filename'])? (string) $_POST['filename'] : 'chart'; //optional

// prepare variables
if (get_magic_quotes_gpc()) {
	$svg = stripslashes($svg);	
}

$tempName = md5(rand());

// allow no other than predefined types
if ($type == 'image/png'  || $type == 'FB') {
	$typeString = '-m image/png';
	$ext = 'png';
	
} elseif ($type == 'image/jpeg') { //this output format is throwing error on the OVH server running Batik 1.7 (vs. 1.6)
	$typeString = '-m image/jpeg';
	$ext = 'jpg';

} elseif ($type == 'application/pdf') {
	$typeString = '-m application/pdf';
	$ext = 'pdf';

} elseif ($type == 'image/svg+xml') {
	$ext = 'svg';	
}
$outfile = "temp/$tempName.$ext";

if (isset($typeString)) {
	
	// size
	if (isset($_POST['width']) && intVal($_POST['width'])>0) {
		$width = "-w " .  intVal($_POST['width']);
	} else $width = "";

	// generate the temporary file
    //print($svg);
	if (!file_put_contents("./temp/$tempName.svg", $svg)) {
		die("Couldn't create temporary file. Check that the directory permissions for
			the /temp directory are set to 777.");
	}
	
	// do the conversion (from some reason, cannot convert to JPG on new server with Batik 1.7)
    //$cmd = "/usr/java/bin/java -jar ". BATIK_PATH ." $typeString -d $outfile -q 0.999 $width temp/$tempName.svg";
    $cmd = "java -jar /etc/batik/batik-1.7/". BATIK_PATH ." $typeString -d /var/www/vhosts/mashabledata.com/httpdocs/workbench/export/temp/$tempName.$ext $width /var/www/vhosts/mashabledata.com/httpdocs/workbench/export/temp/$tempName.svg";
    //echo $cmd;
    $output = shell_exec($cmd);
	
	// catch error
	if (!is_file($outfile) || filesize($outfile) < 10) {
		echo "<pre>$output</pre>";
		echo "Error while converting SVG";		
	} 
	
	// stream it
	else {
        if($type == 'FB'){
            echo '{"status": "ok","imageURL": "http://www.mashabledata.com/workbench/export/'.$outfile.'"}';
        } else {
            header("Content-Disposition: attachment; filename=$filename.$ext");
            header("Content-Type: $type");
            echo file_get_contents($outfile);
        }

	}
	
	// delete it
	unlink("temp/$tempName.svg");
    if($type != 'FB'){unlink($outfile);}


// SVG can be streamed directly back
} else if ($ext == 'svg') {
    header("Content-Disposition: attachment; filename=$filename.$ext");
	header("Content-Type: $type");
	echo $svg;
} else {
    echo '<br>type:';
    echo $_POST['type'];
	echo "Invalid type";
    echo '<br>svg:';
    echo $svg;
    var_dump($_POST);
    var_dump($_GET);
    var_dump($_COOKIE);
}
?>
