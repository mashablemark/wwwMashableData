<?php
/**
 * Created by JetBrains PhpStorm.
 * User: Mark Elbert
 * Date: 5/17/12
 * Time: 4:53 PM
 * This file provides the data service for the admin panel.
 * For all calls, uid and accesstoken are required.  Additional required parameters listed below
 *
 * command: GetApis
 *
 * command: GetApiHistory
 *   apiid:
 *
 */

$time_start = microtime(true);
$command =  $_POST['command'];
$con = getConnection();
switch($command){
    case "GetApis":
        $sql = "select a.apiid, name, file, l1domain, l2domain, path, runid, command, periodicity, added, updated, failed, startdt, finishdt "
            . " from apis a left outer join (select ar.* from apiruns ar, (select max(runid) maxrunid, apiid from apiruns group by apiid) as xr where ar.apiid=xr.apiid and xr.maxrunid = ar.runid) as r "
            . " on r.apiid=a.apiid ";
        logEvent("GetApis", $sql);
        $result = mysql_query($sql);
        $output = array("status"=>"ok","apis" => array());
        while ($aRow = mysql_fetch_assoc($result)){
            $output['apis'][] = $aRow;
        }
        break;
    case "GetApiHistory":
        $sql = "select * from apiruns where apiid=" . intval($_POST["apiid"]);
        logEvent("GetApiHistory", $sql);
        $result = mysql_query($sql);
        $output = array("status"=>"ok","runs" => array());
        while ($aRow = mysql_fetch_assoc($result)){
            $output['runs'][] = $aRow;
        }
        break;
 /*   case "NewApiRun":  moved to master /admin/crawlers/index.php page
        $sql = "insert into apiruns (command, periodicty, since, added, updated, failed) "
        . " values (" . safeStringSQL($_POST['command']) . "," . safeStringSQL($_POST['periodicity']) . "," . safeStringSQL($_POST['since']) . ",0,0,0)";
        logEvent("NewApiRun", $sql);
        $result = mysql_query($sql);
        $runid = mysql_insert_id ($con);
        $output = array("status"=>"ok","runid" => $runid);
        break;*/
 /*   case "UpdateApiRun":
        $sql = "update apiruns set added=added+" . intval($_POST['added']) . ", updated=updated+" . intval($_POST['updated']) . ", failed=failed+" . intval($_POST['failed']) . ", finishdt = NOW() "
            . " where runid=" . intval($_POST['runid']) ;
        logEvent("UpdateApiRun", $sql);
        $result = mysql_query($sql);
        $sql = "select * from apiruns where runid=" . intval($_POST['runid']) ;
        $result = mysql_query($sql);
        if(mysql_num_rows($capture)==1){
            $aRow = mysql_fetch_assoc($result);  //should have one and only on row
            $output = array("status"=>"ok", "runid"=>$aRow["runid"], "added"=>$aRow["added"], "updated"=>$aRow["updated"], "failed"=>$aRow["failed"], "finishdt"=>$aRow["finishdt"]);
        } else {
             $output = array("status"=>"error");
        }
        break;*/
    default:
        $output = array("status" => "invalid command");
}
$time_elapsed =  (microtime(true) - $time_start)*1000;
$output["exec_time"] = $time_elapsed . 'ms';
$output["command"] = $command;
echo json_encode($output);
mysql_close($con);


//helper functions
function logEvent($command,$sql){
    global $event_logging;
    if($event_logging){
        $log_sql = "insert into eventlog(event, data) values('" . $command . "','" . mysql_real_escape_string($sql) . "')";
        $event = mysql_query($log_sql);
    }
}
function safeStringSQL($key){  //needed with mysql_fetch_array, but not with mysql_fetch_assoc
    $val = $_POST[$key];
    if($val=='' || $val == NULL  || $val === NULL){
        return 'NULL';
    } else {
        return "'" . str_replace("'", "''", $val) . "'";
    }
}
function getConnection(){
    $con =  mysql_connect("localhost","melbert_admin","g4bmyLl890e0");
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

function requiresLogin(){
    //eventually will check for valid userID/accesstoken combo.  If not present, return status with error
}

?>