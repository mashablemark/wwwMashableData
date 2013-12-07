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
$sql_logging = false;
$event_logging = true;
$maxTries = 3;
$maxJobRunMinutes = 20;
$maxJobThreads = 4;

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

//check user permissions
//TODO:  add accesstoken check
$sql = "select * from users where userid=" .  $user_id . " and permission='su'";
$user_result = runQuery($sql, "AdminPanel: GetUser");
if($user_result->num_rows == 0) die(json_encode(array("status" => "insuffient permissions")));
$user_row = $user_result ->fetch_assoc( );

//GET API (unless global ExecuteJobs cron is being run)
if(isset($_REQUEST['apiid'])){
    $sql = "select * from apis where apiid=" .  $api_id;
    $api_result = runQuery($sql, "AdminPanel: GetAPI");
    if($api_result->num_rows == 0 || $api_id==0){
        logEvent("api error","api_id to crawl does not exist");
        die(json_encode(array("status" => "ERROR: API does not exist")));
    } else {
        $api_row = $api_result->fetch_assoc();
        //print($api_row["file"]);
        include_once($api_row["file"]);
    }
}
switch($command){
    case "Crawl":
    case "Update":
        if($api_id==0) {
            logEvent("api error","api_id to crawl not specified");
            die("error");
        }
        $sql = "insert into apiruns (apiid, command, since, userid, added, updated, failed, startdt) "
            . " values (" . $api_id . "," . safeStringSQL($command) . ",". safeStringSQL($since) . "," . $user_id . ",0,0,0, NOW())";
        $result = runQuery($sql, "NewApiRun");
        $runid = $db->insert_id;
        $api_row["runid"]=$runid;
        $api_row["userid"]=$user_id;
        if($command=="Crawl"){
            $output = ApiCrawl($catid, $api_row);  //creates apirunjobs which are run by an ExecuteJobs cron = out of process
        } else {
            $output = ApiBatchUpdate($since, $periodicity, $api_row);
        }
        $output["runid"] = $runid;
        break;
    case "ExecuteJobs":
        try{
            $findJobSQL = <<<END
                    select * from apirunjobs
                    where (status = 'Q'
                    or (status = 'R' and  tries<$maxTries and TIMESTAMPDIFF(MINUTE , enddt, NOW())>$maxJobRunMinutes)
                    or (status = 'F' and  tries<$maxTries))
END;
            if($runid!=0) { //further define
                $findJobSQL .= " and runid = " . $runid;
            }
            if(isset($_REQUEST["jobid"])) {  //and limit to just this job if jobid defined (thread of one!)
                $findJobSQL .= " and 0=1 or jobid = " . intval($_REQUEST["jobid"]);
                $loop = false;  //once through
            } else {
                $loop = true;
            }
            $jobResults = runQuery($findJobSQL ." order by status DESC limit 0,1", "ExecuteJobs: inititial find jobs");
            if($jobResults->num_rows==1){
                $output = array("updated"=>0,"failed"=>0,"skipped"=>0, "added"=>0);
                $job_row = $jobResults->fetch_assoc();
                $threadid = $job_row["jobid"];
                $output["threadid"] = $threadid;
                if($runid==0) $runid = $job_row["runid"];

                //get api and run info:
                $result = runQuery("select a.*, runid from apis a inner join apiruns r on a.apiid=r.apiid and r.runid = $runid");
                $api_run = $result->fetch_assoc();
                $output["api"] = $api_run["name"];
                include_once($api_run["file"]);

                //reusable SQL statements
                $findJobSQL .= " and runid =".$runid." order by status DESC limit 0,1";
                $update_run_sql = "update LOW_PRIORITY apiruns set finishdt=now() where runid = " . $runid;

                do {
                    $thisJob = $job_row["jobid"];
                    runQuery($update_run_sql);
                    runQuery("update apirunjobs set tries=tries+1, threadjobid = $threadid, startdt=now(), enddt=now(), status = 'R' where jobid = $thisJob");
                    //****
                    $status = ApiExecuteJob($api_run, $job_row); //execute this API's job routine
                    //****
                    runQuery( "update apiruns set finishdt=now(), scanned=scanned+".$status["skipped"]."+".$status["added"]."+".$status["failed"]."+".$status["updated"].", added=added+".$status["added"].", updated=updated+".$status["updated"].", failed=failed+".$status["failed"]." where runid=".$api_run["runid"]);
                    $output["updated"] += $status["updated"];
                    $output["failed"] += $status["failed"];
                    $output["skipped"] += $status["skipped"];
                    $output["added"] += $status["added"];
                    runQuery("update apirunjobs set enddt=now(), status = 'S' where jobid = $thisJob");
                    //finished with this job, check fot the next job
                    $nextJobResults = runQuery($findJobSQL);
                    if($nextJobResults->num_rows==1){
                        $job_row = $nextJobResults->fetch_assoc();
                    } else {
                        $loop = false;
                    }
                } while($loop);
                //this thread is terminating successfully
                runQuery($update_run_sql);
                //if all jobs completed, than execute the crawler's tiddy-up routine
                $running_jobs_sql = "select * from apirunjobs where (status='R' or status='Q') and runid =$runid limit 0,1";
                $running_jobs = runQuery($running_jobs_sql);
                if($running_jobs->num_rows==0){
                    //****
                    ApiRunFinished($api_run);
                    //****
                }
            }
        }
        catch(Exception $e)
        {
            logEvent('API job error', $e->getMessage());
            die($e->getMessage());
        }
        break;

    case "SetCounts":
        setMapsetCounts();
        setPointsetCounts();
        break;

    case "FindSets":  //universal mapset and pointset finder
        findSets($api_row["apiid"]);
        break;

    case "Prune":
        $output = prune($api_id);
        break;

    case "FreqSets":
        $output = freqSets($api_id);
        break;

    /*case "RecalcAllFirstLastDts":  // temp function to correct for the first and last dt values
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
        break;*/
/*    case "FixFredNulls":  // corrects y value of "." in captures to "null"
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
        break;*/

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

//API HOUSE KEEPING functions
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
    //clean out any dangling category series records
    runQuery("delete from cs.* USING categoryseries cs left outer join series s on cs.seriesid=s.seriesid where s.seriesid is null");
    runQuery("delete from  cs.* USING categoryseries cs left outer join categories c on cs.catid=c.catid where c.catid  is null");

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
    $sql = "select count(*) as activejobcount from apirunjobs where runid=".$runid." and status='R' and tries<$maxTries and TIMESTAMPDIFF(MINUTE , startdt, NOW())<10)";
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

function setCatSeries($catid, $seriesid){ //insert catSeries record if DNE

}


