<?php
/**
 * Created by Mark Elbert 5/5/12
 * Copyright, all rights reserved MashableData.com
 *
 */

 $event_logging = true;

/* This is the sole API for the MashableData Admin panel (http://www.mashabledata.com/admin) application connecting
 * the client application to the cloud.  All returns are JSON objects. Supports the following:
 *
 * command: [Get|Crawl|Update]
 * apiid: required by all commands
 * since: required by "Update" command
 * periodicity:  required by "Update" command
*/
$time_start = microtime(true);
$command =  $_POST['command'];
if(strlen($command)==0) $command = $_GET['command'];
$api_id =  intval($_POST['apiid']);
if($api_id==0) $api_id = intval($_GET['apiid']);
$since =  $_POST['since'];
if(strlen($since)==0) $since = $_GET['since'];
$periodicity =  $_POST['periodicity'];
if(strlen($periodicity)==0) $periodicity = $_GET['periodicity'];
if(strlen($periodicity)==0) $periodicity = 'all';
$user_id =  intval($_POST['uid']);
if($user_id==0) $user_id =  intval($_GET['uid']);
$access_token=  $_POST['accesstoken'];
$catid =  intval($_POST['catid']);
if($catid==0) $catid = intval($_GET['catid']);
$runid =  intval($_POST['runid']);
if($runid==0) $runid = intval($_GET['runid']);

$con = getConnection();


$sql = "select * from apis where apiid=" .  $api_id;
logEvent("AdminPanel: GetAPI", $sql);
$api_result = mysql_query($sql);
if(mysql_num_rows($api_result) == 0){
    die(json_encode(array("status" => "API does not exist")));
}
$api_row =   mysql_fetch_assoc( $api_result );

if($command == "Update" || $command == "Crawl"){ // these require a user permissions check
    //TODO:  add accesstoken check
    $sql = "select * from users where userid=" .  $user_id . " and (permission='su' or (permission='admin' and l1domain=" .
        safeStringSQL($api_row["l1domain"])  ." and l2domain=" . safeStringSQL($api_row["l2domain"])  ." ))";
    logEvent("AdminPanel: GetUser", $sql);
    $user_result = mysql_query($sql);
    if(mysql_num_rows($user_result) == 0){
        die(json_encode(array("status" => "insuffient permissions")));
    }
    $user_row =   mysql_fetch_assoc( $user_result );

    if($runid==0){ //Updates and Crawls must be part of a apirun
        $sql = "insert into apiruns (apiid, command, periodicity, since, userid, added, updated, failed, startdt) "
            . " values (" . $api_id . "," . safeStringSQL($command) . "," . safeStringSQL($periodicity) . ","
            . safeStringSQL($since) . "," . $user_id . ",0,0,0, NOW())";
        logEvent("NewApiRun", $sql);
        $result = mysql_query($sql);
        $runid = mysql_insert_id ($con);
    }
}
include_once($api_row["file"]);
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
        $result = mysql_query($sql);

        $sql = "select * from apiruns where runid=" . $runid;
        logEvent("RefetchApiRun", $sql);
        $result = mysql_query($sql);

        if(mysql_num_rows($result)==1){
            $aRow = mysql_fetch_assoc($result);  //should have one and only on row
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
        //update the apirun record and run totals
        $sql = "select * from apiruns where runid=" . $runid;
        logEvent("RefetchApiRun", $sql);
        $result = mysql_query($sql);
        if(mysql_num_rows($result)==1){
            $api_run = mysql_fetch_assoc($result);
            $output["added"] += intval($api_run["added"]);
            $output["updated"] += intval($api_run["updated"]);
            $output["failed"] += intval($api_run["failed"]);
            $output["scanned"] =   $output["count"] + intval($api_run["scanned"]);
            $sql = "update apiruns set added=" . $output["added"] . ", updated=" . $output["updated"] . ", failed=" . $output["failed"] . ", scanned=" . $output["scanned"] . ", finishdt = NOW() "
                . " where runid=" . $runid;
            logEvent("UpdateApiRun", $sql);
            $result = mysql_query($sql);
        }

        break;
    case "Get":  //anonymous allowed
        $skeys = $_POST['skeys'];
        if(strlen($skeys)==0) $skeys = explode(",",$_GET['skeys']);

        $output = ApiGet($skeys, $api_row);
        break;
    case "RecalcAllFirstLastDts":
// temp function to correct for the first and last dt values
        $sql = "select c.captureid, data from captures c"
            . " where isamerge=1 "
            . ' LIMIT 0 , 100000';
        $captures = mysql_query($sql);
        $updated=0;
        while ($capture = mysql_fetch_assoc($captures)) {
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
            mysql_query($sql);
            $updated++;
        }
        $output = array("updated"=> $updated);
        break;
    case "FixFredNulls":
        // corrects y value of "." in captures to "null"
        $sql = "select captureid, data from captures "
            . " where data like '%|.||%'"
            . " LIMIT 0 , 10000";
        $captures = mysql_query($sql);
        $updated=0;
        while ($capture = mysql_fetch_assoc($captures)) {
            $newdata = str_replace("|.||", "|null||", $capture["data"]);
            $hash = sha1($newdata);
            $captureid = $capture["captureid"];
            $sql="update captures set data = " .safeStringSQL($newdata).", hash=".safeStringSQL($hash)
                . " where captureid=". $captureid;
            mysql_query($sql);
            $updated++;
        }
        $output = array("updated"=> $updated, "lastcaptureid"=> $captureid);
        break;
    case "FixUserSeriesNulls":
        // corrects y value of "." in captures to "null"
        $sql = "select captureid, data from userseries us, series s, captures c "
            . " where data like '%|.||%'"
            . " LIMIT 0 , 10000";
        $captures = mysql_query($sql);
        $updated=0;
        while ($capture = mysql_fetch_assoc($captures)) {
            $newdata = str_replace("|.||", "|null||", $capture["data"]);
            $hash = sha1($newdata);
            $captureid = $capture["captureid"];
            $sql="update captures set data = " .safeStringSQL($newdata).", hash=".safeStringSQL($hash)
                . " where captureid=". $captureid;
            mysql_query($sql);
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
mysql_close($con);

//API functions
function catInChain($parentcatids, $childcatid){
    $sql = "select * from catcat where childid in (".$parentcatids.")";
    logEvent("API catInChain",$sql);
    $result = mysql_query($sql);
    $next_parent_ids = array();
    while($catcat = mysql_fetch_assoc($result)){
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

//helper functions
function MdToPhpDate($strDt){
    if(strlen($strDt)==4){
        return ("01-01-" . $strDt);
    } elseif (strlen($strDt)==6){
        return ("01-" . sprintf((intval(substr($strDt,4,2))+1),"%02d") . "-" . substr($strDt,0,4));
    } elseif (strlen($strDt)==8){
        return (substr($strDt,6,2) ."-" . sprintf((intval(substr($strDt,4,2))+1),"%02d") . "-" . substr($strDt,0,4));
    } else return null;

}
function logEvent($command, $sql){
    global $event_logging;
    if($event_logging){
        $log_sql = "insert into eventlog(event, data) values('" . $command . "','" . mysql_real_escape_string($sql) . "')";
        $event = mysql_query($log_sql);
    }
}

function safeStringSQL($key){  //needed with mysql_fetch_array, but not with mysql_fetch_assoc
    if($key=='' || $key == NULL  || $key === NULL){
        return 'NULL';
    } else {
        return "'" . str_replace("'", "''", $key) . "'";
    }
}
function getConnection(){
    $con = mysql_connect("localhost","melbert_admin","g4bmyLl890e0");
    if (!$con)
    {
        die("status: 'db connection error'");
    }
    mysql_select_db("melbert_mashabledata", $con);
    return $con;
}

function md_nullhandler($val){
    if($val=='' || $val == NULL){
        return 'null';
    } else {
        return $val;
    }
}

function httpGet($target){
    //print($target . "<br>");
    $fp = fopen( $target, 'r' );
    $content = "";
    while( !feof( $fp ) ) {
        $buffer = trim( fgets( $fp, 4096 ) );
        $content .= $buffer;
    }
    fclose($fp);
    return $content;
}

?>
