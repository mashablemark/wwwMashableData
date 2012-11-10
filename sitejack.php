<?php
$url = "http://www.eia.gov/";
if(array_key_exists("sj",$_GET) && strlen($_GET["sj"])>0){
	$target = "http://" . urldecode($_GET["sj"]);
} else {
	$target = $url;
}

//print($url) . "<br>";
//$url = "http://www.eia.gov/";

$fp = fopen( $target, 'r' );
$content = "";
    while( !feof( $fp ) ) {
       $buffer = trim( fgets( $fp, 4096 ) );
       $content .= $buffer;
    }
if(strpos($target, "/dnav/pet/")) {
	$nav = "dnav/pet/"; }
elseif(strpos($target, "/dnav/ng/")) {
	$nav = "dnav/ng/"; }
else {
	$nav = "";
}


$content = str_ireplace( '"/' , '"' . $url, $content);
$content = str_ireplace( '"Styles/' , '"' . $url . $nav . 'Styles/', $content);
$content = str_ireplace( "'../Styles/" , "'" . $url . $nav . 'Styles/', $content);
$content = str_ireplace( "'../includes/" , "'" . $url . $nav . 'includes/', $content);
$content = str_ireplace( "href='/" , "href='" . $url, $content);
$content = str_ireplace( "src='/" , "src='" . $url, $content);
$content = str_ireplace( '"./hist/' , '"' . $url . $nav . 'hist/', $content);
$content = str_ireplace( 'http://www.eia.gov/styles/eia_header.js' , '/sj_header.js', $content);
if(strpos($target, "/dnav/ng/hist/")){
		$content = str_ireplace( '<!--/ Header Script -->' , 
		'<script type="text/javascript" src="/global/md_scripts/md_hcharter.js"></script><!--/ Header Script -->', $content);
}
print('This site is for testing the MashableData interactive graphing workbench only.  If you landed here by accident, please go the official EIA web page at <a href="' . $target . '">' . $target . '</a>');
if(strpos($target, "/dnav/pet/hist/LeafHandler.ashx")){
		$content = str_ireplace( '</html>' , '<script type="text/javascript" src="/global/md_scripts/md_hcharter.js"></script>'
		. '<script language="javascript">$(document).ready(processLeafChart);</script></html>', $content);
}
preg_match_all( '#a href="http://www.eia.gov/[^"]+#' , $content, $matches);
foreach($matches as $match){
	foreach($match as $m){
		$replacement = 'a href="sitejack.php?sj=' . urlencode(substr($m, 15));
		//print($m . " " . $replacement . "<br>");
		$content = str_replace( $m , $replacement, $content);
	}
	
}
//print(urlencode('http://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?n=PET&s=RL2R9911NUS_1&f=A'));
print($content);
?>