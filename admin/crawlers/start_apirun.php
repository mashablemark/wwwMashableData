<?php
/**
 * Created by Mark Elbert 5/5/12
 * Copyright, all rights reserved MashableData.com
 *
 */

 $event_logging = true;
include_once("../../global/common_functions.php");

/* This is the sole API for the MashableData Admin panel (http://www.mashabledata.com/admin) application connecting
 * the client application to the cloud.  All returns are JSON objects. Supports the following:
 *
 * command: [Get|Crawl|Update]
 * apiid: required by all commands
 * since: required by "Update" command
 * periodicity:  required by "Update" command


to run as a cron (with no space between the * and /5):

* /5 * * * * php /home/melbert/public_html/admin/crawlers/start_apirun.php   > /dev/null

* /5 * * * * wget --user=partner --password='MDrock$' http://www.mashabledata.com/admin/crawlers/start_apirun.php?apiid=3&uid=1&command=ExecuteJobs&runid=402  >/dev/null 2>&1

*/
$time_start = microtime(true);

//GET INPUT PARAMETERS
$command =  $_REQUEST['command'];
$api_id =  intval($_REQUEST['apiid']);
$since =  $_REQUEST['since'];
$periodicity =  $_REQUEST['periodicity'];
if(strlen($periodicity)==0) $periodicity = 'all';
$user_id =  intval($_REQUEST['uid']);
$access_token=  $_REQUEST['accesstoken'];
$catid =  intval($_REQUEST['catid']);
$runid =  intval($_REQUEST['runid']);

error_reporting(E_ALL);

//OPEN GLOBAL DB CONNECTION
$db = getConnection();

//GET API (unless global ExecuteJobs cron is being run)
$sql = "select * from apis where apiid=" .  $api_id;
logEvent("AdminPanel: GetAPI", $sql);
$api_result = runQuery($sql);
if(mysqli_num_rows($api_result) == 0 and $command!="ExecuteJobs"){
    die(json_encode(array("status" => "API does not exist")));
} else {
    $api_row = $api_result->fetch_assoc();
    include_once($api_row["file"]);
}

if($command == "Update" || $command == "Crawl"){ // these require a user permissions check
    //TODO:  add accesstoken check
    $sql = "select * from users where userid=" .  $user_id . " and (permission='su' or (permission='admin' and l1domain=" .
        safeStringSQL($api_row["l1domain"])  ." and l2domain=" . safeStringSQL($api_row["l2domain"])  ." ))";
    logEvent("AdminPanel: GetUser", $sql);
    $user_result = runQuery($sql);
    if($user_result->num_rows == 0){
        die(json_encode(array("status" => "insuffient permissions")));
    }
    $user_row = $user_result ->fetch_assoc( );

    if($runid==0){ //Updates and Crawls must be part of a apirun
        $sql = "insert into apiruns (apiid, command, periodicity, since, userid, added, updated, failed, startdt) "
            . " values (" . $api_id . "," . safeStringSQL($command) . "," . safeStringSQL($periodicity) . ","
            . safeStringSQL($since) . "," . $user_id . ",0,0,0, NOW())";
        logEvent("NewApiRun", $sql);
        $result = runQuery($sql);
        $runid = $db->insert_id;
    }
    $api_row["userid"]=$user_id;
    $api_row["runid"]=$runid;
}
$skipped=0;
switch($command){
    case "Update":
        $output = ApiBatchUpdate($since, $periodicity, $api_row);
        $added = 0;
        $updated = 0;
        $failed = 0;
        foreach($output["results"] as $skey => $series_status){
             switch($series_status){
                 case "new_series":
                     $added++;
                     break;
                 case "new_capture":
                     $updated++;
                     break;
                 case "skipped":
                     $skipped=$skipped+1;
                     break;
                 case "failure":
                 case "not_in_api":
                     $failed++;
                     break;
                 case "confirmed":   //do nothing
             }
        }

        $sql = "update apiruns set added=added+" . intval($added) . ", updated=updated+" . $updated . ", failed=failed+" . $failed . ", scanned=scanned+" . $output["count"] . "+".$skipped.", finishdt = NOW() "
            . " where runid=" . $runid;
        logEvent("UpdateApiRun", $sql);
        $result = runQuery($sql);

        $sql = "select * from apiruns where runid=" . $runid;
        logEvent("RefetchApiRun", $sql);
        $result = runQuery($sql);

        if(mysqli_num_rows($result)==1){
            $aRow = $result->fetch_assoc();  //should have one and only on row
            $output["added"]= $aRow["added"];
            $output["updated"]= $aRow["updated"];
            $output["failed"]= $aRow["failed"];
            $output["scanned"]= $aRow["scanned"];
        } else {
            $output = array("status"=>"error reading apirun record");
        }
        $output["runid"] = $runid;

        break;
    case "Crawl":
        //echo "category: " . $category . "<br>";
        $output = ApiCrawl($catid, $api_row);  //returns series and child categories, actual series captures performed by Update routines
        $output["runid"] = $runid;
        break;
    case "ExecuteJobs":
        if(isset($_REQUEST["runid"])){
            $jobid = (isset($_REQUEST["jobid"]))?intVal($_REQUEST["jobid"]):$jobid="ALL";   //"ALL": execute all queued jobs for the given run until none left
            $output =ApiExecuteJobs(intVal($_REQUEST["runid"]), $jobid);
        } else {
            $sql = "select count(*) from apirunjobs where status = 'Q' or (status = 'F' and  tries<3) or (status = 'R' and  tries<3)";
            $result = runQuery($sql);
            if($result->num_rows > 0){ //there are jobs to be run
                $sql = "select jobid, runid from apirunjobs where status = 'R' and TIMESTAMPDIFF(MINUTE , startdt, NOW())<10";
                $result = runQuery($sql);
                if($result->num_rows < 4){  // max threadCount = 4!!!!
                    //so there are jobs to be run and the thread count is < 4
                    $sql="select * from apirunjobs where status = 'Q' and tries<3 limit 0,1";
                    $result = runQuery($sql);
                    if($result->num_rows==0){ //only try to rerun the failures after exhausting the queue
                        $sql="select * from apirunjobs where tries<3 and (status = 'F' or status = 'R') limit 0,1";
                        $result = runQuery($sql);
                    }
                    $job_row = $result->fetch_assoc();
                    $sql = "select * from apis where apiid = (select apiid from apiruns where runid = ".$job_row["runid"].")";
                    $result = runQuery($sql);
                    $api_row = $result->fetch_assoc(); //global
                    include_once($api_row["file"]);
                    if($job_row["tries"]==0){
                        $output = ApiExecuteJobs($job_row["runid"]); //create thread
                    } else {
                        $output = ApiExecuteJobs($job_row["runid"], $job_row["jobid"]); //single job only!
                    }

                }
            }
        }
        break;
    case "Get":  //anonymous allowed
        $skeys = $_REQUEST['skeys'];
        if(strlen($skeys)==0) $skeys = explode(",",$_GET['skeys']);

        $output = ApiGet($skeys, $api_row);
        break;
    case "FindSets":  //universal mapset and pintset finder
        /*reset SQL
            delete from mapsets where apiid=1;
            update series set mapsetid=null where apiid=1;
        */
        $result = runQuery("select geoid, containingid, lat, lon, type, regexes "
        . " from geographies where regexes is not null order by length(name) desc");  //try to find a match with the longest first (ie. "West Virginia" before "Virginia")
        //not available until PHP 5.3 $geographies = $result->fetch_all(MYSQLI_ASSOC);
        $geographies = array();
        while($geography = $result->fetch_assoc()){
            array_push($geographies, $geography);
        }
        $sql = "select seriesid, name, units, periodicity, lat, lon, geoid, pointsetid, mapsetid "
        . "from series where geoid is null and apiid=" . $api_row["apiid"]; // . " LIMIT 0 , 30";
        $result = runQuery($sql);
        $matches_found = false;
        $count = 0;
        while($serie = $result->fetch_assoc()){
            set_time_limit(60);
            $count++;
            //print("<br>NEW SERIES: ". $serie["name"] . "<br>");
            for($i=1;$i<count($geographies);$i++){
                $geography = $geographies[$i];
                $regex = "+( for | in | from )?". $geography["regexes"]."+";
                if(preg_match($regex, $serie["name"], $matches)==1){
                    $matches_found = ($matches_found>0)?$matches_found+1:1;  //match!
                    $setName = trim(str_replace($matches[0],"",$serie["name"]));
                    if($geography["type"]=="M"){
                        $mapSetId = getMapSet($setName, $api_row["apiid"], $serie["periodicity"], $serie["units"]);
                        $sql = "update series set mapsetid=".$mapSetId.",geoid=".$geography["geoid"]
                        . ", lat=".(($geography["lat"]==null)?"null":safeStringSQL($geography["lat"]))
                         .", lon=".(($geography["lon"]==null)?"null":safeStringSQL($geography["lon"]))
                        . " where seriesid=".$serie["seriesid"];
                        runQuery($sql);
                        //var_dump($matches);
                        //print("<br>MATCHES_FOUND: ". $matches_found ." SERIESNAME: ".$serie["name"]. " SET: ".$setName."<br>");
                        break;
                    } elseif($geography["type"]=="X") {  //this second test should be unnecessary, but safe + ready for
                        $pointSetId = getPointSet($setName, $api_row["apiid"], $serie["periodicity"], $serie["units"]);
                        $sql = "update series set pointsetid=".$pointSetId.", geoid=".$geography["containingid"].", lat=".$geography["lat"].", lon=".$geography["lon"]
                        . " where seriesid=".$serie["seriesid"];
                        runQuery($sql);
                        break;
                    }
                }
            }
        }
        //eliminate the mapsets with 5 or fewer point as these tend to be problematic.
        runQuery("truncate temp");  //need to use temp table because mySQL cannot figure out how to do this efficiently otherwise.
        runQuery("insert into temp (id1) select mapsetid from series where apiid = ". $api_row["apiid"] ." and mapsetid is not null group by mapsetid having count(*)<=5");
        runQuery("delete from mapsets using mapsets, temp where mapsets.mapsetid=temp.id1");
        //but keep detected geoid...
        runQuery("update series s, temp t set s.mapsetid = null where s.mapsetid=t.id1");
/*
--correct Georgies in apiid = 1
truncate temp;

insert into temp (id1)
select s.mapsetid
from series s, mapgeographies mg,
(select mapsetid, max(mapcounts) as xmc
from
(
    select s.mapsetid, map, count(*) as mapcounts
from series s, mapgeographies mg
where s.geoid = mg.geoid and s.geoid is not null and mapsetid is not null and apiid=1
group by s.mapsetid, map
order by s.mapsetid
) mapcounts
group by mapsetid
) maxcountmap
where s.geoid = mg.geoid and s.geoid is not null and s.mapsetid=maxcountmap.mapsetid and apiid=1
group by s.mapsetid, map, xmc
HAVING COUNT( * ) = xmc;

update series s, temp t set s.geoid=259 where s.geoid=81 and s.mapsetid=t.id1;

truncate temp;
*/

        //mapsets diagnostics:  select membercount, count(*) as number_of_set from (select mapsetid, count(*) as membercount from series where apiid = 1 and mapsetid is not null group by mapsetid) mc group by membercount
        //select seriesid, skey, s.name, s.mapsetid, s.geoid, s.periodicity, s.units from series s, (select mapsetid, count(*) as membercount from series where apiid = 1 and mapsetid is not null group by mapsetid having count(*)<=5) ms where s.mapsetid=ms.mapsetid
        $output["matches_found"] = $matches_found;
        $output["series_scanned"] = $count;
        break;
    case "RecalcAllFirstLastDts":
// temp function to correct for the first and last dt values
        $sql = "select c.captureid, data from captures c"
            . " where isamerge=1 "
            . ' LIMIT 0 , 100000';
        $captures = runQuery($sql);
        $updated=0;
        while ($capture = $captures->fetch_assoc()) {
            $points = explode("||",$capture["data"]);
            // echo $capture["data"] . "<br>";
            $first_point = $points[0];
            $first_point_ary =  explode("|",$first_point);
            $first_dt = $first_point_ary[0];

            $last_point = $points[(count($points)-1)];
            $last_point_ary =  explode("|",$last_point);
            $last_dt = $last_point_ary[0];


            $first_date_js = strtotime(MdToPhpDate($first_dt) . ' UTC')* 1000;
            $last_date_js = strtotime(MdToPhpDate($last_dt) . ' UTC')* 1000;

            $sql="update captures set firstdt = " .$first_date_js.", lastdt=".$last_date_js
                . ",isamerge=0 where captureid=".$capture["captureid"];
            runQuery($sql);
            $updated++;
        }
        $output = array("updated"=> $updated);
        break;
    case "FixFredNulls":
        // corrects y value of "." in captures to "null"
        $sql = "select captureid, data from captures "
            . " where data like '%|.||%'"
            . " LIMIT 0 , 10000";
        $captures = runQuery($sql);
        $updated=0;
        while ($capture = $captures->fetch_assoc()) {
            $newdata = str_replace("|.||", "|null||", $capture["data"]);
            $hash = sha1($newdata);
            $captureid = $capture["captureid"];
            $sql="update captures set data = " .safeStringSQL($newdata).", hash=".safeStringSQL($hash)
                . " where captureid=". $captureid;
            runQuery($sql);
            $updated++;
        }
        $output = array("updated"=> $updated, "lastcaptureid"=> $captureid);
        break;
    case "FixUserSeriesNulls":
        // corrects y value of "." in captures to "null"
        $sql = "select captureid, data from userseries us, series s, captures c "
            . " where data like '%|.||%'"
            . " LIMIT 0 , 10000";
        $captures = runQuery($sql);
        $updated=0;
        while ($capture = $captures->fetch_assoc()) {
            $newdata = str_replace("|.||", "|null||", $capture["data"]);
            $hash = sha1($newdata);
            $captureid = $capture["captureid"];
            $sql="update captures set data = " .safeStringSQL($newdata).", hash=".safeStringSQL($hash)
                . " where captureid=". $captureid;
            runQuery($sql);
            $updated++;
        }
        $output = array("updated"=> $updated, "lastcaptureid"=> $captureid);
        break;
    default:
        $output = array("status" => "insuffient permissions");
}
/* need to either incorporate this into each catseries insert or periodically run:
update series s2, (select s.seriesid, GROUP_CONCAT(c.name SEPARATOR '; ') as newtitle from series s, categoryseries cs, categories c
WHERE  s.seriesid=cs.seriesid and c.catid=cs.catid
group by seriesid) t set s2.title=t.newtitle  where s2.seriesid=t.seriesid
*/
$time_elapsed =  (microtime(true) - $time_start)*1000;
$output["exec_time"] = $time_elapsed . 'ms';
$output["command"] = $command;
echo json_encode($output);
mysqli_close($db);

//API functions
function catInChain($parentcatids, $childcatid){
    $sql = "select * from catcat where childid in (".$parentcatids.")";
    logEvent("API catInChain",$sql);
    $result = runQuery($sql);
    $next_parent_ids = array();
    while($catcat = $result->fetch_assoc()){
        if($catcat["parentid"]== $childcatid|| $catcat["childid"]== $childcatid){
            return true;
        }
        array_push($next_parent_ids,$catcat["parentid"]);
    }
    if(count($next_parent_ids)>0) {
        return catInChain(implode(",",$next_parent_ids),$childcatid);
    } else {
        return false;
    }
}

function archiveSeries($obj){ //accepts either an ID or a an array of all fields in the series to be archived
    if(is_array($obj)){
        $series = $obj;
    } else {
        $sql = "sekect * from series where seriesid = ".$obj;
        $result = runQuery($sql);
        $series = $result->fetch_assoc();
    }
    $fieldlist = array();
    $valuelist = array();

    foreach($series as $field=>$value){
        array_push($fieldlist, $field);
        array_push($valuelist, safeStringSQL($value));  //wraps integers as strings - mySQL will be fine
    }
    $sql = "insert into seriesarchive (". implode(",", $valuelist) .") values(". implode(",", $fieldlist) .")";
    runQuery($sql);
}

function updateSeries($key, $name, $src, $url, $period, $units, $units_abbrev, $notes, $title, $apiid, $apidt, $firstdt, $lastdt, $data, $geoid, $mapsetid, $pointsetid, $lat, $lon){ //inserts or archive & update a series as needed.  Returns seriesid.
    global $db;
    $sql = "select * from series where key = " . $key . " and apiid=" . $apiid;
    $result = runQuery($sql);
    if($result->num_rows==1){
        $series = $result->fetch_assoc();
        if($series["units"]!=$units || $series["period"]!=$period || $series["notes"]!=$notes || $series["name"]!=$name || $series["data"]!=$data){
            archiveSeries($series);
            $sql = "update series set "
                ."key=".safeStringSQL($key).","
                ."name=".safeStringSQL($name).","
                ."src=".safeStringSQL($src).","
                ."url=".safeStringSQL($url).","
                ."namelen=". strlen($name).","
                ."periodicity=".safeStringSQL($period).","
                ."units=".safeStringSQL($units).","
                ."units_abbrev=".safeStringSQL($units_abbrev).","
                ."notes=".safeStringSQL($notes).","
                ."title=".safeStringSQL($title).","
                ."data=".safeStringSQL($data).","
                ."hash=".safeStringSQL(sha1($data)).","
                ."apiid=".$apiid.","
                ."firstdt=".$firstdt.","
                ."lastdt=".$lastdt.","
                ."geoid=".$geoid.","
                ."mapsetid=".$mapsetid.","
                ."pointsetid=".$pointsetid.","
                ."lat=".$lat.","
                ."lon=".$lon
                ." where seriesid=".$series["seriesid"];
            runQuery($sql);
        }
        return $series["seriesid"];
    } else {
        $sql = "insert into series (key, name, namelen, units, units_abbrev, periodicity, notes, data, hash, apiid, firstdt, lastdt, geoid, mapsetid, pointsetid, lat, lon) "
            . " values (".safeStringSQL($key).",".safeStringSQL($name).",".strlen($name).",". safeStringSQL($period).",".safeStringSQL($units).",".safeStringSQL($units_abbrev).",".safeStringSQL($notes).",".safeStringSQL($data).",".safeStringSQL(sha1($data)).",".$apiid.",".$firstdt.",".$lastdt.",".$geoid.",". $mapsetid.",". $pointsetid.",".$lat.",". $lon.")";
        runQuery($sql);
        return $db->insert_id;
    }
}
function queueJob($runid, $config){  //return jobid
    global $db;
    $sql = "insert into apirunjobs (runid, jobjson, tries, status, startdt) values (".$runid.",'".json_encode($config)."',0,'Q',now())";
    runQuery($sql);
    return $db->insert_id;
}
function updateJob($jobid, $status, $options){

}
function setCategory($apiid, $name, $apicatid, $parentid){ //insert categories and catcat records as needed; return catid

}
function setCatSeries($catid, $seriesid){ //insert catSeries record if DNE

}


