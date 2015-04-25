<?php
/**
 * Created 4/12/2014
 * Copyright MashableData.com, all rights reserved
 *
 * embedded graphs on www.mashabledata.com use the /workbenchdev/api.php, all others get /workbench/api.php
 *
 * SPRING 2015 UPGRADES:
 * 1. DONE: move from /globals/js/map to /graph_data
 * 2. save graph_objects in /graph_data/cache two level deep directory system, each level names after chars 0-1 and 2-3 of ghash = 256^2 = 65,000 folders capable of handling millions of files
 * 3. use PHP's filemtime() to determine is file is fresh to serve
 * 4. log hits by appending to log.txt file
 * 4. if cached file is too old, use PHP's touch() to add 100 seconds to cached files freshness while new graph or cube object is generated and updated
 * 5. create hourly cron process to mv log.txt to last_log.txt, process 1000 lines at a time and save results to db
 * 6. only include api.php (with overhead and connection) when creating or updating a graph or cube object
 *
 */
if(!isset($_REQUEST["command"])||!isset($_REQUEST["host"])) die("no fishing");
$command = $_REQUEST["command"];
$web_root = "/var/www/vhosts/mashabledata.com/httpdocs";
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: PUT, GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: *");

if(strpos("|GetFullGraph|GetCubeSets|GetMashableData|GetEmbeddedGraph|", $command)===false) die("unknown/invalid command");
//note: $_SERVER['HTTP_ORIGIN'] is supported only by Chrome
if(isset($_SERVER['HTTP_ORIGIN']) && strpos($_SERVER['HTTP_ORIGIN'], $_REQUEST["host"])===false) {
    print("HTTP_ORIGIN: ".$_SERVER['HTTP_ORIGIN']."<br>");
    print("host: ".$_REQUEST["host"]."<br>");
    die("host mismatch");
}
//for  see if graph data exists is the cache file tree
if(isset($_REQUEST["ghash"]) && strlen($_REQUEST["ghash"])==32){
    $ghash = $_REQUEST["ghash"];
} else {
    die("valid ghash required");
}
$cacheRoot = "/var/www/vhosts/mashabledata.com/cache/";  //outside the webroot = cannot be surfed
$cacheSubPath = substr($ghash,0,2) . "/" . substr($ghash, 2, 2) . "/";
$logFile = "embed.log";
$maxAge = 24 * 60 * 60;  //1 day (counted in seconds)

if($command=='GetEmbeddedGraph' || $command=='GetCubeSets'){
    //1. log request
    $now = time();
    if (!is_dir($cacheRoot))
    {
        mkdir($cacheRoot, 0755, true);
    }
    $lp = fopen($cacheRoot.$logFile, "a");
    fwrite($lp, $command . "," . $ghash . "," . (isset($_REQUEST["logonly"])?'log':'fetch') . "," . $now . "," . $_REQUEST["host"]);
    fclose($lp);

    //2. data requested???? or just logging if data embedded
    if(isset($_REQUEST["logonly"])){
        //no request => done!
        echo json_encode(["status"=>"ok"]);
        exit();
    }

    //3. is graph cached?
    $cacheFile = $cacheRoot . $cacheSubPath . $ghash . ($command=='GetCubeSets'? "_cube". $_REQUEST["cubeid"] . "_" . $_REQUEST["geokey"] . "_" . $_REQUEST["freq"] : "") . ".json";
    if(file_exists($cacheFile)){
        $modifiedTime = filemtime($cacheFile);
        //4. is the cache fresh?
        if($modifiedTime > $now - $maxAge){
            //fresh cache! => echo the cached graph to the browser and terminate
            readfile($cacheFile);
            exit(); //terminate
        } else {
            touch($cacheFile, $now - $maxAge + 100);  //refresh the mod data for another 100 seconds of freshness (for subsequent call) while the database is queried
            //no exit(), so the database fetch will be executed below
        }
    }
}


if($_REQUEST["host"]=="www.mashabledata.com"){
    include_once($web_root."/workbenchdev/api.php");
} else {
    include_once($web_root."/workbench/api.php");
}
