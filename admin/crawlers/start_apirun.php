<?php
/*date_default_timezone_set("UTC");
    $regex = "#( in | for | from )?\bRichmond [cC]ity\, VA\b#";
print($regex);
     print(preg_match($regex, "Unemployment Rate in Richmond City, VA", $matches));
die();*/


/**
 * Created by Mark Elbert 5/5/12
 * Copyright, all rights reserved MashableData.com
 *
 */
$sql_logging = true;
$event_logging = true;
include_once("../../global/php/common_functions.php");

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
$api_id =  isset($_REQUEST['apiid'])?intval($_REQUEST['apiid']):0;
$since =  isset($_REQUEST['since'])?$_REQUEST['since']:'';
$periodicity =  isset($_REQUEST['periodicity'])?$_REQUEST['periodicity']:'all';
$user_id =  intval($_REQUEST['uid']);
$access_token=  isset($_REQUEST['accesstoken'])?$_REQUEST['accesstoken']:"";
$catid =  intval(isset($_REQUEST['catid'])?$_REQUEST['catid']:0);
$runid =  isset($_REQUEST['runid'])?intval($_REQUEST['runid']):0;

error_reporting(E_ALL);

//OPEN GLOBAL DB CONNECTION
$db = getConnection();

//GET API (unless global ExecuteJobs cron is being run)
if(isset($_REQUEST['apiid'])){
    $sql = "select * from apis where apiid=" .  $api_id;
    $api_result = runQuery($sql, "AdminPanel: GetAPI");
    if($api_result->num_rows == 0 || $api_id==0){
        die(json_encode(array("status" => "API does not exist")));
    } else {
        $api_row = $api_result->fetch_assoc();
        //print($api_row["file"]);
        include_once($api_row["file"]);
    }
}

if($command == "Update" || $command == "Crawl"){ // these require a user permissions check
    //TODO:  add accesstoken check
    $sql = "select * from users where userid=" .  $user_id . " and permission='su'";
    $user_result = runQuery($sql, "AdminPanel: GetUser");
    if($user_result->num_rows == 0){
        die(json_encode(array("status" => "insuffient permissions")));
    }
    $user_row = $user_result ->fetch_assoc( );

    if($runid==0){ //Updates and Crawls must be part of a apirun
        $sql = "insert into apiruns (apiid, command, periodicity, since, userid, added, updated, failed, startdt) "
            . " values (" . $api_id . "," . safeStringSQL($command) . "," . safeStringSQL($periodicity) . ","
            . safeStringSQL($since) . "," . $user_id . ",0,0,0, NOW())";
        $result = runQuery($sql, "NewApiRun");
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
        $result = runQuery($sql, "UpdateApiRun");

        $sql = "select * from apiruns where runid=" . $runid;
        $result = runQuery($sql, "RefetchApiRun");

        if($result->num_rows==1){
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

    case "SetCounts":
        setMapsetCounts();
        setPointsetCounts();
        break;
    case "Crawl":
        //echo "category: " . $category . "<br>";
        $output = ApiCrawl($catid, $api_row);  //returns series and child categories, actual series captures performed by Update routines
        $output["runid"] = $runid;
        break;
    case "ExecuteJobs":
        if(isset($_REQUEST["runid"])){
            //to execute a particular job:  http://www.mashabledata.com/admin/crawlers/start_apirun.php?uid=1&command=ExecuteJobs&jobid=XXX
            $jobid = (isset($_REQUEST["jobid"]))?intVal($_REQUEST["jobid"]):$jobid="ALL";   //"ALL": execute all queued jobs for the given run until none left
            $output =ApiExecuteJobs(intVal($_REQUEST["runid"]), $jobid);
        } else {
            $sql = "select count(*) as count from apirunjobs where status = 'Q' or (status = 'F' and  tries<3) or (status = 'R' and  tries<3 and TIMESTAMPDIFF(MINUTE , startdt, NOW())>10 and TIMESTAMPDIFF(MINUTE , enddt, NOW())>10)";
            //updating series print($sql);
            $result = $db->query($sql);
            $counts = $result->fetch_assoc();
            if($counts["count"] > 0){ //there are jobs to be run
                $sql = "select jobid, runid from apirunjobs where status = 'R' and TIMESTAMPDIFF(MINUTE , startdt, NOW()<10 and TIMESTAMPDIFF(MINUTE , enddt, NOW()<10";
                $result = runQuery($sql);
                if($result->num_rows < 4){  // max threadCount = 4!!!!
                    //so there are jobs to be run and the thread count is < 4
                    $sql="select * from apirunjobs where status = 'Q' and tries<3 limit 0,1";
                    $result = runQuery($sql);
                    if($result->num_rows==0){ //only try to rerun the failures after exhausting the queue
                        $sql="select * from apirunjobs where tries<3 and (status = 'F' or (status = 'R' and TIMESTAMPDIFF(MINUTE , startdt, NOW())<10 and TIMESTAMPDIFF(MINUTE , enddt, NOW())<10)) limit 0,1";
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
        findSets($api_row["apiid"]);
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
    case "Prune":
        $output = prune($api_id);
        break;
    default:
        $output = array("status" => "bad command");
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
$db->close();

//API functions
function prune($api_id = 0){
    $pruned = 0;
    $iterations = 0;
    $sql = "select c.catid "
        . " from categories c left outer join categoryseries cs on c.catid=cs.catid left outer join catcat cc on c.catid = cc.parentid "
        . " where cs.catid is null and cc.parentid is null ";
    if($api_id!=0) $sql .= " and c.apiid=".$api_id;
    do{
        $iterations++;
        $deadEnds = runQuery($sql);
        if(!$deadEnds) break;

        $deadEndCount = $deadEnds->num_rows;
        $pruned += $deadEndCount;
        if($deadEndCount>0){
            runQuery("delete c.* from categories c inner join (" . $sql . ") j on c.catid=j.catid "); //prune the deadend cat
        }
    } while($deadEndCount>0 && $iterations <10); //continue until no more dead end categories

    return array("status" => "ok", "pruned"=>$pruned, "iterations"=>$iterations);
}
function catInChain($parentcatids, $childcatid){
    $sql = "select * from catcat where childid in (".$parentcatids.")";
    $result = runQuery($sql, "API catInChain");
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
        $sql = "select * from series where seriesid = ".$obj;
        $result = runQuery($sql);
        $series = $result->fetch_assoc();
    }
    $fieldlist = array();
    $valuelist = array();

    foreach($series as $field=>$value){
        array_push($fieldlist, $field);
        array_push($valuelist, safeStringSQL($value));  //wraps integers as strings - mySQL will be fine
    }
    $sql = "insert into seriesarchive (". implode(",", $fieldlist) .") values(". implode(",", $valuelist) .")";
    runQuery($sql);
}

function updateSeries(&$status, $key, $name, $src, $url, $period, $units, $units_abbrev, $notes, $title, $apiid, $apidt, $firstdt, $lastdt, $data, $geoid, $mapsetid, $pointsetid, $lat, $lon){ //inserts or archive & update a series as needed.  Returns seriesid.
    global $db;
    $sql = "select * from series where skey = " . safeStringSQL($key) . " and apiid=" . $apiid;
    $result = runQuery($sql);
    if($result->num_rows==1){
        $series = $result->fetch_assoc();
        if($series["units"]!=$units || $series["periodicity"]!=$period || $series["notes"]!=$notes || $series["name"]!=$name || $series["data"]!=$data || $series["mapsetid"]!=$mapsetid || $series["pointsetid"]!=$pointsetid){
            archiveSeries($series);
            $sql = "update series set "
                ."skey=".safeStringSQL($key).","
                ."name=".safeStringSQL($name).","
                ."src=".safeStringSQL($src).","
                ."url=".safeStringSQL($url).","
                ."namelen=". strlen($name).","
                ."periodicity=".safeStringSQL($period).","
                ."units=".safeStringSQL($units).","
                ."units_abbrev=".safeStringSQL($units_abbrev).","
                ."notes=".safeStringSQL($notes).","
                ."data=".safeStringSQL($data).","
                ."hash=".safeStringSQL(sha1($data)).","
                ."apiid=".$apiid.","
                ."apidt=".safeStringSQL($apidt).","
                ."firstdt=".$firstdt.","
                ."lastdt=".$lastdt.","
                ."apifailures=0";
            if($title!="") $sql .= ", title=".safeStringSQL($title);
            if($geoid != null && is_numeric ($geoid)) $sql .= ", geoid=".$geoid;
            if($mapsetid != null  && is_numeric ($mapsetid)) $sql .= ", mapsetid=".$mapsetid;
            if($pointsetid != null && is_numeric ($pointsetid)) $sql .= ", pointsetid=".$pointsetid;
            if($lat != null && is_numeric ($lat)) $sql .= ", lat=".$lat;
            if($lon != null && is_numeric ($lon)) $sql .= ", lon=".$lon;
            $sql .= " where seriesid=".$series["seriesid"];
            $queryStatus = runQuery($sql);
            if($queryStatus){
                $status["updated"]++;
                print($status["updated"] . ". updating series " .$key .": ".$name."<br>");
            } else {
                $status["failed"]++;
                print($status["failed"] . ". failed series update for " .$key .": ".$name."<br>");
            }
        } else {
            $status["skipped"]++;
            print($status["skipped"] . ". skipping series " .$key .": ".$name."<br>");
        }
        return $series["seriesid"];
    } else {
        $sql = "insert into series (skey, name, namelen, src, units, units_abbrev, periodicity, title, url, notes, data, hash, apiid, firstdt, lastdt, geoid, mapsetid, pointsetid, lat, lon) "
            . " values (".safeStringSQL($key).",".safeStringSQL($name).",".strlen($name).",".safeStringSQL($src).",".safeStringSQL($units).",".safeStringSQL($units_abbrev).",".safeStringSQL($period).",".safeStringSQL($title).",".safeStringSQL($url).",".safeStringSQL($notes).",".safeStringSQL($data).",".safeStringSQL(sha1($data)).",".$apiid.",".$firstdt.",".$lastdt.",".($geoid===null?"null":$geoid).",". ($mapsetid===null?"null":$mapsetid) .",". ($pointsetid===null?"null":$pointsetid).",".($lat===null?"null":safeStringSQL($lat)).",". ($lon===null?"null":safeStringSQL($lon)).")";
        $queryStatus = runQuery($sql);
        if($queryStatus ){
            $status["added"]++;
            print($status["added"] . ". adding series " .$key .": ".$name."<br>");
        } else {
            print("failed inserting series " .$key .": ".$name."<br>");
            $status["failed"]++;
        }
        return $db->insert_id;
    }
}

function catSeries($catid, $seriesid){
    if($catid==0 || $seriesid==0) return false;
    $sql = "select seriesid from categoryseries where seriesid=" . $seriesid . " and catid = " . $catid;
    $temp= runQuery($sql, "check for CatSeries relationship");
    if($temp->num_rows==0){
        $sql = "insert into categoryseries (catid, seriesid) values (" . $catid . "," . $seriesid . " )";
        runQuery($sql, "FRED API: create CatSeries relationship");
        $sql = "UPDATE series s, (SELECT seriesid, GROUP_CONCAT( c.name ) AS category "
            . " FROM categoryseries cs INNER JOIN categories c ON cs.catid = c.catid "
            . " where seriesid=" . $seriesid . ") cat "
            . " SET s.title = cat.category WHERE s.seriesid = cat.seriesid  ";
        runQuery($sql, "set series.title");
    }

    /*    to update all series titles:     (run nightly!!!)
        UPDATE series s,
            (SELECT seriesid, GROUP_CONCAT( c.name separator "; " ) AS category
            FROM categoryseries cs INNER JOIN categories c ON cs.catid = c.catid
        group by seriesid) cats
        set s.title= category
        where cats.seriesid=s.seriesid
    */
    return true;
}
function queueJob($runid, $config){  //return jobid
    global $db;
    $sql = "insert into apirunjobs (runid, jobjson, tries, status, startdt) values (".$runid.",'".json_encode($config)."',0,'Q',now())";
    runQuery($sql);
    return $db->insert_id;
}

//checks if all active jobs for this run have ended.  If so, runs and emails the report and then runs findsets if added>0
function jobThreadEnded($runid){
    $sql = "select count(*) as activejobcount from apirunjobs where runid=".$runid." and status='R' and tries<3 and TIMESTAMPDIFF(MINUTE , startdt, NOW())<10)";
    $result = runQuery($sql,"activejobcount check");
    $row = $result->fetch_assoc();
    if($row["activejobcount"]==0){
        $sql = "select r.apiid, count(jobid) as jobs_executed, j.status, r.startdt, r.finishdt, r.scanned, r.updated, r.added, r.failed "
            . " from apiruns r left outer join apirunjobs j on r.runid=j.runid "
            . " where r.runid=".$runid." group by r.apiid, j.status, r.startdt, r.finishdt, r.scanned, r.updated, r.added, r.failed ";
        $result = runQuery($sql,"run summary report");
        $msg="";
        while($row=$result->fetch_assoc()){
            $msg .= json_encode($row);
            $apiid=$row["apiid"];
        }
        mail("admin@mashabledata.com","Fred API run report", $msg, $MAIL_HEADER);
        findSets($apiid);
    }
}

function findSets($apiid){

    /*reset SQL
        delete from mapsets where apiid=1;
        update series set mapsetid=null where apiid=1;
    */
    $result = runQuery("select geoid, containingid, lat, lon, type, regexes "
        . " from geographies where regexes is not null and geoset<>'uscounties' order by length(name) desc");  //try to find a match with the longest first (ie. "West Virginia" before "Virginia")
    //not available until PHP 5.3 $geographies = $result->fetch_all(MYSQLI_ASSOC);
    $geographies = array();
    while($geography = $result->fetch_assoc()){
        array_push($geographies, $geography);
    }
    $sql = "select seriesid, name, units, periodicity, lat, lon, geoid, pointsetid, mapsetid "
        . "from series where geoid is null and pointsetid is null and seriesid = 581935 and apiid=" . $apiid; // . " LIMIT 0 , 30";
    $result = runQuery($sql, "FindSets");
    $matches_found = false;
    $count = 0;
    while($serie = $result->fetch_assoc()){
        set_time_limit(60);
        $count++;
        $pos = strpos($serie["name"]," in ");
        if($pos!=false){
            $setName = trim(substr($serie["name"],0,$pos));;
            $sql = "select geoid, type, lat, lon from geographies where name=".safeStringSQL(trim(substr($serie["name"],$pos+4)));
            $gresult = runQuery($sql,"FindSets");
            if($gresult->num_rows>0){
                print($serie["name"].": ".trim(substr($serie["name"],$pos+4))."<BR>");
                $geography = $gresult->fetch_assoc();
                if($geography["type"]=="M"){
                    $mapSetId = getMapSet($setName, $api_row["apiid"], $serie["periodicity"], $serie["units"]);
                    $sql = "update series set mapsetid=".$mapSetId.",geoid=".$geography["geoid"]
                        . ", lat=".(($geography["lat"]==null)?"null":safeStringSQL($geography["lat"]))
                        .", lon=".(($geography["lon"]==null)?"null":safeStringSQL($geography["lon"]))
                        . " where seriesid=".$serie["seriesid"];
                    runQuery($sql);
                } elseif($geography["type"]=="X") {  //this second test should be unnecessary, but safe + ready for other types
                    $pointSetId = getPointSet($setName, $apiid, $serie["periodicity"], $serie["units"]);
                    $sql = "update series set pointsetid=".$pointSetId.", geoid=".$geography["containingid"].", lat=".$geography["lat"].", lon=".$geography["lon"]
                        . " where seriesid=".$serie["seriesid"];
                    runQuery($sql);
                }
            }
        } else {
            for($i=1;$i<count($geographies);$i++){
                $geography = $geographies[$i];
                $regex = "#( for | in | from )?". $geography["regexes"]."#";
                if(preg_match($regex, $serie["name"], $matches)==1){
                    $matches_found = ($matches_found>0)?$matches_found+1:1;  //match!
                    $setName = trim(preg_replace ($regex,"",$serie["name"]));
                    if($geography["type"]=="M"){
                        $mapSetId = getMapSet($setName, $apiid, $serie["periodicity"], $serie["units"]);
                        print($serie["name"]."|".$setName."|".$mapSetId."<BR>");
                        $sql = "update series set mapsetid=".$mapSetId.",geoid=".$geography["geoid"]
                            . ", lat=".(($geography["lat"]==null)?"null":safeStringSQL($geography["lat"]))
                            .", lon=".(($geography["lon"]==null)?"null":safeStringSQL($geography["lon"]))
                            . " where seriesid=".$serie["seriesid"];
                        runQuery($sql);
                        //var_dump($matches);
                        //print("<br>MATCHES_FOUND: ". $matches_found ." SERIESNAME: ".$serie["name"]. " SET: ".$setName."<br>");
                        break;
                    } elseif($geography["type"]=="X") {  //this second test should be unnecessary, but safe + ready for
                        $pointSetId = getPointSet($setName, $apiid, $serie["periodicity"], $serie["units"]);
                        $sql = "update series set pointsetid=".$pointSetId.", geoid=".$geography["containingid"].", lat=".$geography["lat"].", lon=".$geography["lon"]
                            . " where seriesid=".$serie["seriesid"];
                        runQuery($sql);
                        break;
                    }
                }
            }
        }
        //print("<br>NEW SERIES: ". $serie["name"] . "<br>");
    }
    //eliminate the mapsets with 5 or fewer point as these tend to be problematic.
    runQuery("truncate temp");  //need to use temp table because mySQL cannot figure out how to do this efficiently otherwise.
    runQuery("insert into temp (id1) select mapsetid from series where apiid = ". $apiid
        ." and mapsetid is not null group by mapsetid having count(*)<=5");
    runQuery("delete from mapsets using mapsets, temp where mapsets.mapsetid=temp.id1");
    //but keep detected geoid...
    runQuery("update series s, temp t set s.mapsetid = null where s.mapsetid=t.id1");
    runQuery("delete FROM mapsets using mapsets left outer join series s on mapsets.mapsetid=s.mapsetid WHERE s.mapsetid is null"); //clear out empty mapsets that have accumulated

    //correct Georgias in apiid = 1
    runQuery("truncate temp");

    runQuery("insert into temp (id1) "
    ." select s.mapsetid "
    ." from series s, mapgeographies mg, "
    ." (select mapsetid, max(mapcounts) as xmc "
    ." from "
    ." ( "
    ." select s.mapsetid, map, count(*) as mapcounts "
    ." from series s, mapgeographies mg "
    ." where s.geoid = mg.geoid and s.geoid is not null and mapsetid is not null and apiid=". $apiid
    ." group by s.mapsetid, map "
    ." order by s.mapsetid "
    ." ) mapcounts "
    ." group by mapsetid "
    ." ) maxcountmap "
    ." where s.geoid = mg.geoid and s.geoid is not null and s.mapsetid=maxcountmap.mapsetid and apiid=". $apiid
    ." group by s.mapsetid, map, xmc "
    ." HAVING COUNT( * ) = xmc;");

    runQuery("update series s, temp t set s.geoid=259 where s.geoid=81 and s.mapsetid=t.id1;");

    runQuery("truncate temp;");


    //mapsets diagnostics:  select membercount, count(*) as number_of_set from (select mapsetid, count(*) as membercount from series where apiid = 1 and mapsetid is not null group by mapsetid) mc group by membercount
    //select seriesid, skey, s.name, s.mapsetid, s.geoid, s.periodicity, s.units from series s, (select mapsetid, count(*) as membercount from series where apiid = 1 and mapsetid is not null group by mapsetid having count(*)<=5) ms where s.mapsetid=ms.mapsetid
    return array("geographies_found"=> $matches_found, "series_scanned_for_geo" => $count);
}
function updateJob($jobid, $status, $options){

}
//MOVE TO START_APIRUN
function setCategory($apiid, $name, $parentid){ //insert categories and catcat records as needed; return catid
    //ASSUME SIBLING HAVE UNIQUE NAMES
    global $db;
    $sql = "select * from categories c, catcat cc where c.catid=cc.childid and apiid = ".$apiid." and cc.parentid=".$parentid." and name=".safeStringSQL($name);
    $result = runQuery($sql);
    if($result->num_rows==1){
        $row = $result->fetch_assoc();
        return $row["catid"];
    } else {
        $sql = "insert into categories (apiid, name) values(".$apiid.",".safeStringSQL($name).")";
        $result = runQuery($sql);
        if($result == false) die("unable to create category in setCategory");
        $catid = $db->insert_id;
        $sql = "insert into catcat (parentid, childid) values(".$parentid.",".$catid.")";
        runQuery($sql);
        return $catid;
    }
}
function setCatSeries($catid, $seriesid){ //insert catSeries record if DNE

}


