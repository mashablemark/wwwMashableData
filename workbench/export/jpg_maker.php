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
define ('BATIK_PATH', 'batik-rasterizer.jar');  // full path /usr/batik/batik-1.7/batik-rasterizer.jar  

///////////////////////////////////////////////////////////////////////////////
ini_set('magic_quotes_gpc', 'off');

$type = $_POST['type'];
$svg = (string) $_POST['svg'];
$filename = (string) $_POST['filename'];

// prepare variables
if (!$filename) $filename = 'chart';
if (get_magic_quotes_gpc()) {  //magic_quotes are off for the Hostgator masbledata.com site
	$svg = stripslashes($svg);	
}

echo "<br>who:<br>";
system("who", $retval);
echo "<br>groups:<br>";
system("groups", $retval);
echo "<br>ls:<br>";
system("ls", $retval);
echo "<br>whoami:<br>";
system("whoami", $retval);
echo "<br>ls /home/melbert/public_html/chart_jpgs:<br>";
 system("ls /home/melbert/public_html/chart_jpgs", $retval);

//	$output = shell_exec("java -jar ". BATIK_PATH ." $typeString -d $outfile $width temp/$tempName.svg");
//$output = shell_exec("java -jar /usr/batik/batik-1.7/batik-rasterizer.jar -m image/jpeg -w 800 -q 0.99 -d /home/melbert/public_html/workbench/export/temp/hc.jpg  /home/melbert/public_html/workbench/export/hc.svg");
echo "<br>sudo version:<br>";
$output = system(escapeshellcmd("/usr/java/bin/java -version"), $retval); 
var_dump($retval);
var_dump($output);
echo escapeshellcmd("/usr/java/bin/java -version");
system("/usr/java/bin/java -jar /home/melbert/public_html/batik/batik-rasterizer.jar -m image/jpeg -w 800 -q 0.99 -d /home/melbert/public_html/workbench/export/temp  /home/melbert/public_html/workbench/export/hc.svg", $retval);
echo $retval;
echo "<br>java:<br><pre>" . $output . "</pre>";
$output = shell_exec('ls -lart temp');
echo "ls:<br><pre>" . $output . "</pre>";
phpinfo();

/*

$tempName = md5(rand());

// allow no other than predefined types
if ($type == 'image/png') {
	$typeString = '-m image/png';
	$ext = 'png';
	
} elseif ($type == 'image/jpeg') {
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
	if (!file_put_contents("temp/$tempName.svg", $svg)) { 
		die("Couldn't create temporary file. Check that the directory permissions for
			the /temp directory are set to 777.");
	}
	
	// do the conversion
	$output = shell_exec("java -jar ". BATIK_PATH ." $typeString -d $outfile $width temp/$tempName.svg");
	
	// catch error
	if (!is_file($outfile) || filesize($outfile) < 10) {
		echo "<pre>$output</pre>";
		echo "Error while converting SVG";		
	} 
	
	// stream it
	else {
		header("Content-Disposition: attachment; filename=$filename.$ext");
		header("Content-Type: $type");
		echo file_get_contents($outfile);
	}
	
	// delete it
	unlink("temp/$tempName.svg");
	unlink($outfile);

// SVG can be streamed directly back
} else if ($ext == 'svg') {
	header("Content-Disposition: attachment; filename=$filename.$ext");
	header("Content-Type: $type");
	echo $svg;
	
} else {
	echo "Invalid type";
}
*/
?>
