<?php
/**
 * Created by JetBrains PhpStorm.
 * User: mark
 * Date: 9/14/12
 * Time: 12:10 PM
 * To change this template use File | Settings | File Templates.
 */

$db = getConnection(); //establishes a db connection as a global variable on include
date_default_timezone_set("UTC");

//helper functions
function runQuery($sql, $log_name = 'sql logging'){
    global $db, $sql_logging;
    if($sql_logging===true){ //need to get first so as not to trip up the insert_id reads
        logEvent($log_name, $sql);
    }
    $result = $db->query($sql);
    if($result===false){
        logEvent('bad query', $sql);
    }
    return $result;
}

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
    global $event_logging, $db;
    if($event_logging){
        $log_sql = "insert into eventlog(event, data) values('" . $command . "','" . $db->escape_string($sql) . "')";
        $db->query($log_sql);
    }
}

function safeSQLFromPost($key){  //needed with mysql_fetch_array, but not with mysql_fetch_assoc
    $val = $_POST[$key];
    return safeStringSQL($val);
}
function safeStringSQL($val){  //needed with mysql_fetch_array, but not with mysql_fetch_assoc
    if(($val == NULL  || $val === NULL) && $val != ''){  //removed "|| $val==''" test
        return NULL;
    } else {
        return "'" . str_replace("'", "''", $val) . "'";
    }
}

function getConnection(){
    global $db;
    if($_SERVER["SERVER_NAME"]=="www.mashabledata.com"){
        $db = new mysqli("localhost","melbert_admin","g4bmyLl890e0");
    } else {
        $db = new mysqli("127.0.0.1:3306","root","");
    }
    if (!$db) die("status: 'db connection error'");
    $db->select_db("melbert_mashabledata");
    return $db;
}
function closeConnection(){
    global $db;
    $db->close();
}

function md_nullhandler($val){
    if($val=='' || $val == NULL){
        return 'null';
    } else {
        return $val;
    }
}

function httpGet($target){
    $fp = false;
    $tries = 0;
    while($tries<3 && $fp===false){  //try up to 3 times to open resource
        $tries++;
        $fp = fopen( $target, 'r' );
    }
    if($fp===false){  //failed (after 3 tries)
        $content = false;
        logEvent("httpGet failed", $target);
    } else { //success
        $content = "";
        while( !feof( $fp ) ) {
            $buffer = trim( fgets( $fp, 4096 ) );
            $content .= $buffer;
        }
        fclose($fp);
    }
    return $content;
}

$orgid = 0;  //global var
function requiresLogin(){
    global $orgid;
    $uid = intval($_POST["uid"]);
    if($uid==0){
        closeConnection();
        die('{"status": "This function requires you to be logged in.  Create a free account or user your FaceBook account."}');
    }
    $sql = "select count(*), orgid from users where userid = " . $uid . " and accesstoken=" . safeSQLFromPost("accessToken")." group by orgid";
    $result = runQuery($sql);
    if($result->num_rows==0){
        closeConnection();
        die('{"status": "Invalid userid accesstoken pair"}');
    } else {
        $aRow = $result->fetch_assoc();
        $orgid = intval($aRow["orgid"]);  //global var for use elsewhere as needed
    }
    //eventually will check for valid userID/accesstoken combo.  If not present, return status with error
}
function trackUsage($counter){
    $limits = array(
        "count_seriessearch" => array("name"=>"cloud searches", "warn"=>9, "max"=>80),
        "count_graphssearch" => array("name"=>"graph searches", "warn"=>40, "max"=>50),
        "count_seriesview" => array("name"=>"series views", "warn"=>30, "max"=>40),
        "count_graphsave" => array("name"=>"graph creations", "warn"=>10, "max"=>15),
        "count_userseries" => array("name"=>"user series", "warn"=>10, "max"=>15),
        "count_datadown" => array("name"=>"data downloads", "warn"=>4, "max"=>6)
    );
    if(isset($limits[$counter])){
        $uid = intval($_POST["uid"]);
        $sql = "update users set ".$counter."=".$counter."+1 where userid = " . $uid . " and accesstoken=" . safeSQLFromPost("accessToken");
        runQuery($sql);
        $sql = "select ".$counter.", subscriptionlevel from users where userid = " . $uid . " and accesstoken=" . safeSQLFromPost("accessToken");
        $result = runQuery($sql);
        $aRow = $result->fetch_assoc();

        if($aRow[$counter]==$limits[$counter]["warn"]&&$aRow[$counter]=="F"){
            return array(
                "approved"=>true,
                "msg"=>"You are approaching the limit for free trial ".$limits[$counter]["name"]
                    .".  Please consider subscribing.  At only $10 per half a year, joining is easy on your wallet and will support acquiring new data sets and features."
            );
        } elseif($aRow[$counter]>=$limits[$counter]["max"]&&$aRow[$counter]=="F"){
            return array(
                "approved"=>false,
                "msg"=>"You have reached the limit for free trial ".$limits[$counter]["name"]
                    .".  Please consider subscribing.  At only $10 per half a year, joining is easy on your wallet and will support acquiring new data sets and features."
            );
        } else {
            return array("approved"=>true);
        }
    } else die('{"status":"Internal error: invalid usage counter"}');
}


function getMapSet($name, $apiid, $periodicity, $units){ //get a mapset id, creating a record if necessary
    global $db;
    $sql = "select mapsetid  from mapsets where name='".$db->escape_string($name)."' and  periodicity='".$db->escape_string($periodicity)."'  and apiid=".$apiid
        ." and units ". (($units==null)?" is NULL":"=".safeStringSQL($units));
    //logEvent("getMapSet select",$sql);
    $result = runQuery($sql);
    if($result->num_rows==1){
        $row = $result->fetch_assoc();
        return $row["mapsetid"];
    } else {
        $sql = "insert into mapsets set name='".$db->escape_string($name)."', periodicity='".$db->escape_string($periodicity)."', units=".(($units==null)?"NULL":safeStringSQL($units)).", apiid=".$apiid;
        //logEvent("getMapSet insert",$sql);
        $result = runQuery($sql);
        if($result!==false){
            $mapSetId = $db->insert_id;
            return $mapSetId;
        }
        return false;
    }
}


function getPointSet($name, $apiid, $periodicity, $units){ //get a mapset id, creating a record if necessary
    global $db;
    $sql = "select pointsetid  from pointsets where name='".$db->escape_string($name)."' and  periodicity='".$db->escape_string($periodicity)."'  and apiid=".$apiid
        ." and units ". (($units==null)?" is NULL":"=".safeStringSQL($units));
    logEvent("getPointSet select",$sql);
    $result = runQuery($sql);
    if($result->num_rows==1){
        $row = $result->fetch_assoc();
        return $row["pointsetid"];
    } else {
        $sql = "insert into pointsets set name='".$db->escape_string($name)."', periodicity='".$db->escape_string($periodicity)."', units=".(($units==null)?"NULL":safeStringSQL($units)).", apiid=".$apiid;
        logEvent("getPointSet insert",$sql);
        $result = runQuery($sql);
        if($result!==false){
            $pointSetId = $db->insert_id;
            return $pointSetId;
        }
        return false;
    }
}

