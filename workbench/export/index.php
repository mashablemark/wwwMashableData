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

$type = $_POST['type'];
$svg = (string) $_POST['svg'];
$filename = (string) $_POST['filename'];

// prepare variables
if (!$filename) $filename = 'chart';
if (get_magic_quotes_gpc()) {
	$svg = stripslashes($svg);	
}



$tempName = md5(rand());

// allow no other than predefined types
if ($type == 'image/png') {
	$typeString = '-m image/png';
	$ext = 'png';
	
} elseif ($type == 'image/jpeg'  || $type == 'FB') {
	$typeString = '-m image/jpeg';
	$ext = 'jpg';

} elseif ($type == 'application/pdf') {
	$typeString = '-m application/pdf';
	$ext = 'pdf';

} elseif ($type == 'image/svg+xml') {
	$ext = 'svg';	
}
$outfile = "temp/$tempName.$ext";

if ($typeString) {
	
	// size
	if ($_POST['width']) {
		$width = (int)$_POST['width'];
		if ($width) $width = "-w $width";
	}

	// generate the temporary file
	if (!file_put_contents("./temp/$tempName.svg", $svg)) {
		die("Couldn't create temporary file. Check that the directory permissions for
			the /temp directory are set to 777.");
	}
	
	// do the conversion
    $cmd = "/usr/java/bin/java -jar ". BATIK_PATH ." $typeString -d $outfile -q 0.999 $width temp/$tempName.svg";
    $cmd = "/usr/java/bin/java -jar /home/melbert/batik/". BATIK_PATH ." $typeString -d /home/melbert/public_html/workbench/export/temp -q 0.999 $width /home/melbert/public_html/workbench/export/temp/$tempName.svg";
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
