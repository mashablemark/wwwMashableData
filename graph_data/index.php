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
http_response_code(200);
header("Content-Type: text/javascript");

//FIRST:  detect if this is from a redirected .js request intended to fool CloudFlare into caching our dynamic content
$url = $_SERVER["SCRIPT_URL"];
$uri = $_SERVER["SCRIPT_URI"];
$fromRedirect = false;
if(preg_match("/\/graph_data\/([A-F]|[a-f]|[0-9]){32}\.js/", $url)) {
    $command = "GetEmbeddedGraph";
    $ghash = substr($url,  12, 32);
    $fromRedirect = true;
} elseif(!isset($_REQUEST["command"])||!isset($_REQUEST["host"])) {
    die("no fishing");
} else {
    $command = $_REQUEST["command"];
}

$web_root = "/var/www/vhosts/mashabledata.com/httpdocs";
$cacheRoot = "/var/www/vhosts/mashabledata.com/cache/";  //outside the webroot = cannot be surfed
$logFile = "embed.log";
$processingFile = "temp.log";

$maxAge = 24 * 60 * 60;  //1 day (in seconds)
$logFields = [
    "command",
    "ghash",
    "log/fetch",
    "Unix timestamp",
    "host"
];

//these headers should be set by .htaccess, but for good measure
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
//for see if graph data exists is the cache file tree
if(!$fromRedirect){
    if(isset($_REQUEST["ghash"]) && strlen($_REQUEST["ghash"])==32){
        $ghash = $_REQUEST["ghash"];
    } else {
        die("valid ghash required");
    }
}

$cacheSubPath = substr($ghash, 0, 2) . "/" . substr($ghash, 2, 2) . "/";
if($command=='GetEmbeddedGraph' || $command=='GetCubeSets'){
    //1. log request
    $now = time();
    $logValues = [
        $command,
        $ghash,
        (isset($_REQUEST["logonly"])?'log':'get'),
        $now,
        (isset($_REQUEST["host"])?$_REQUEST["host"]:"")  //document.referrer
    ];
    if (!is_dir($cacheRoot))
    {
        mkdir($cacheRoot, 0755, true);
    }

    $lp = fopen($cacheRoot.$logFile, "a");

    fputcsv($lp, $logValues);
    fclose($lp);

    //2. data requested???? or just logging if data embedded
    if(isset($_REQUEST["logonly"])){
        //no request => done!
        echo json_encode(["status"=>"ok"]);
        exit();
    }

    //3. is graph cached?
    $cacheFile = $cacheRoot . $cacheSubPath . $ghash . ($command=='GetCubeSets'? "_cube". $_REQUEST["cubeid"] . "_" . $_REQUEST["geokey"] . "_" . $_REQUEST["freq"] : "") . ".js";
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
if($command=="ProcessLog"){
    $sql_logging = false;
    include_once($web_root."/global/php/common_functions.php");
    //1.rename the log file to "tmp.log"
    rename($cacheRoot.$logFile, $cacheRoot.$processingFile);
    //2. open "tmp.log" and loop through, saving to associative array $processedLog as [ghash][yyy-mm date][host][page=> qlog=>, qfetch=>, rlog=>, rfetch=>]
    $processedLog = [];
    $fldCommand = 0;
    $fldGhash = 1;
    $fldType = 2;
    $fldTimestamp = 3;
    $fldUrl = 4;

    $fp = fopen($cacheRoot.$processingFile, "r");
    while(!feof($fp)){
        $logFields = fgetcsv($fp);
        $ghash = $logFields[$fldGhash];
        $date =  date("Y-m-d", $logFields[$fldTimestamp]);
        $url = $logFields[$fldUrl] || 'unknown';
        $urlParts = explode("/", $url);
        $host = count($urlParts)>2 ? $urlParts[2] : "unknown";
        if(!isset($processedLog[$ghash])) $processedLog[$ghash] = [];
        if(!isset($processedLog[$ghash][$date])) $processedLog[$ghash][$date] = [];
        if(!isset($processedLog[$ghash][$date][$host])) $processedLog[$ghash][$date][$host] = [
            "url" => $url,
            "getG" => 0, //graph, full fetch
            "getR" => 0, //graph, log only
            "logG" => 0, //relation click, data fetch
            "logR" => 0, //relation click log only (not programmed as yet!)
        ];
        switch($logFields[$fldCommand]){
            case "GetEmbeddedGraph":
                $processedLog[$ghash][$date][$host][$logFields[$fldType]."G"]++;
                break;
            case"GetCubeSets":
                $processedLog[$ghash][$date][$host][$logFields[$fldType]."R"]++;
                break;
        }
    }
    fclose($fp);
    unlink($cacheRoot.$processingFile);
    //3. loop through condense processed log and insert / update log records
    /*TODO    REWORK!!!   embedlog (
                          `host` int(11) NOT NULL COMMENT 'remote domain',
                          obj int(11) NOT NULL COMMENT 'graphcode or "series"',
                          objfetches int(11) NOT NULL DEFAULT '0' COMMENT 'count of fetch of the graph or number of series',
                          cubefecthes int(11) NOT NULL DEFAULT '0' COMMENT 'for graphs, the count of user cube fetches',
                          PRIMARY KEY (`host`,obj)
    )
    */

    //TODO: check for second unnecessary call to $conn = getConnection() in api.php after $db = getConnection() in common.php

    foreach($processedLog as $ghash => &$ghashLog){
        foreach($ghashLog as $date => &$dayLog){
            foreach($dayLog as $host => &$log){

                $sql = "insert into embedlog (viewdate, host, url, graphget, graphlog, relationget, relationlog)
                value ('$date', , , $log[getG], $log[logG], $log[getR], $log[logR])
                on duplicate key update graphget = graphget + $log[getG], graphlog = graphlog + $log[logG], relationget = relationget + $log[getR], relationlog = relationlog + $log[logR]";
                runQuery($sql);
            }
        }
    }

    exit();
}
//embedded file created below
if(strpos($_SERVER["REQUEST_URI"], "dev")){
    include_once($web_root."/workbenchdev/api.php");
} else {
    include_once($web_root."/workbench/api.php");
}
