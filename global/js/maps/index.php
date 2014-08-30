<?php
/**
 * Created 4/12/2014
 * Copyright MashableData.com, all rights reserved
 *
 * embedded graphs on www.mashabledata.com use the /workbenchdev/api.php, all others get /workbench/api.php
 */
if(!isset($_REQUEST["command"])||!isset($_REQUEST["host"])) die("no fishing");
$command = $_REQUEST["command"];
$web_root = "/var/www/vhosts/mashabledata.com/httpdocs";

if(strpos("|GetPublicGraph|GetCubeSeries|GetMashableData|GetEmbeddedGraph|", $command)===false) die("unknown/invalid command");
//note: $_SERVER['HTTP_ORIGIN'] is supported only by Chrome
if(isset($_SERVER['HTTP_ORIGIN']) && strpos($_SERVER['HTTP_ORIGIN'], $_REQUEST["host"])===false) {
    print("HTTP_ORIGIN: ".$_SERVER['HTTP_ORIGIN']."<br>");
    print("host: ".$_REQUEST["host"]."<br>");
    die("host mismatch");
}
if($_REQUEST["host"]=="www.mashabledata.com"){
    include_once($web_root."/workbenchdev/api.php");
} else {
    include_once($web_root."/workbench/api.php");
}
