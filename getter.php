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

//print(urlencode('http://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?n=PET&s=RL2R9911NUS_1&f=A'));
print($content);
?>