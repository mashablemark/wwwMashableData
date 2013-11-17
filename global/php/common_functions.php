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
$CRYPT_KEY = "jfdke4wm7nfew84i55vs";
$SUBSCRIPTION_RATE = 10.00;
$SUBSCRIPTION_MONTHS = 6;  //this will be reduced to 3 1 year after launch
$MAIL_HEADER = "From: admin@mashabledata.com\r\n"
 . "Reply-To: admin@mashabledata.com\r\n"
 . "Return-Path: sender@mashabledata.com\r\n";

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

function myEncrypt($data){
    global $CRYPT_KEY;
    return  base64_encode(mcrypt_encrypt(MCRYPT_RIJNDAEL_256, md5($CRYPT_KEY), $data, MCRYPT_MODE_CBC, md5(md5($CRYPT_KEY))));

}
function myDecrypt($encryption){
    global $CRYPT_KEY;
    return rtrim(mcrypt_decrypt(MCRYPT_RIJNDAEL_256, md5($CRYPT_KEY), base64_decode($encryption), MCRYPT_MODE_CBC, md5(md5($CRYPT_KEY))), "\0");
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

function safeRequest($key){
    if(isset($_REQUEST[$key])){
        $val = $_REQUEST[$key];
    } else {
        $val = "";
    }
    return $val;
}

function safeSQLFromPost($key){  //needed with mysql_fetch_array, but not with mysql_fetch_assoc
    return safeStringSQL(safePostVar($key));
}
function safePostVar($key){
    if(isset($_POST[$key])){
        $val = $_POST[$key];
    } else {
        $val = "";
    }
    return $val;
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
    if(strpos($_SERVER["SERVER_NAME"],"mashabledata.info")>=0){
        $db = new mysqli("localhost","mashabledata","UxH3XERJ");
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

function httpGet($target, $timeout = 15){
    $fp = false;
    $tryLimit = 3;
    $tries = 0;
    while($tries<$tryLimit && $fp===false){  //try up to 3 times to open resource
        $tries++;
        //$fp = @fsockopen($target, 80, $errNo, $errString, $timeout);
        $fp = @fopen( $target, 'r' );  //the @ suppresses a warning on failure
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

    if(isset($_POST["uid"])){ //if UID is truly required, it will be caught by requiresLogin()
        if(isset($limits[$counter])){
            $uid = intval($_POST["uid"]);
            $sql = "update users set ".$counter."=".$counter."+1 where userid = " . $uid . " and accesstoken=" . safeSQLFromPost("accessToken");
            runQuery($sql);
            $sql = "select ".$counter.", subscription from users where userid = " . $uid . " and accesstoken=" . safeSQLFromPost("accessToken");
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
    } else {
        return array("approved"=>true);
    }
}

function cleanIdArray($dirtyIds){
    $cleanIds = array();
    for($i=0;$i<count($dirtyIds);$i++){
        array_push($cleanIds, intval($dirtyIds[$i]));
    }
    return $cleanIds;
}

function getMapSet($name, $apiid, $periodicity, $units){ //get a mapset id, creating a record if necessary
    global $db;
    $sql = "select mapsetid  from mapsets where name='".$db->escape_string($name)."' and  periodicity='".$db->escape_string($periodicity)."'  and apiid=".$apiid
        ." and units ". (($units==null)?" is NULL":"=".safeStringSQL($units));
    $result = runQuery($sql, "getMapSet select");
    if($result->num_rows==1){
        $row = $result->fetch_assoc();
        return $row["mapsetid"];
    } else {
        $sql = "insert into mapsets set name='".$db->escape_string($name)."', periodicity='".$db->escape_string($periodicity)."', units=".(($units==null)?"NULL":safeStringSQL($units)).", apiid=".$apiid;
        $result = runQuery($sql, "getMapSet insert");
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
    $result = runQuery($sql, "getPointSet select");
    if($result->num_rows==1){
        $row = $result->fetch_assoc();
        return $row["pointsetid"];
    } else {
        $sql = "insert into pointsets set name='".$db->escape_string($name)."', periodicity='".$db->escape_string($periodicity)."', units=".(($units==null)?"NULL":safeStringSQL($units)).", apiid=".$apiid;
        $result = runQuery($sql, "getPointSet insert");
        if($result!==false){
            $pointSetId = $db->insert_id;
            return $pointSetId;
        }
        return false;
    }
}
function setMapsetCounts($mapsetid="all", $apiid = "all"){
    runQuery("truncate temp;");
    runQuery("SET SESSION group_concat_max_len = 4000;");
    runQuery(
        "insert into temp (id1, text1) select mapsetid, concat(group_concat(mapcount)) ".
        " from (select mapsetid, concat('\"',map, '\":{\"set\":', count(s.geoid),'}') as mapcount FROM series s join mapgeographies mg on s.geoid=mg.geoid ".
        " where ".($mapsetid=="all" ?"mapsetid is not null":"mapsetid=".$mapsetid).
        ($apiid=="all"?"":" and s.apiid=".$apiid).
        " and map <>'worldx' group by mapsetid, map) mc group by mapsetid;");
    runQuery("update mapsets ms join temp t on ms.mapsetid=t.id1 set ms.counts=t.text1;");
    runQuery("truncate temp;");
}
function setPointsetCounts($pointsetid="all", $apiid = "all"){
    runQuery("truncate temp;","setPointsetCounts");
    runQuery("SET SESSION group_concat_max_len = 4000;");
    runQuery("insert into temp (id1, text1) "
    . " select pointsetid , concat(group_concat(mapcount)) "
    . " from (".
        " select pointsetid , concat('\"',map, '\":{\"set\":', count(s.geoid),'}') as mapcount ".
        " FROM series s join mapgeographies mg on s.geoid=mg.geoid ".
        " where ".($pointsetid=="all" ?"pointsetid is not null":"pointsetid =".$pointsetid).
        ($apiid=="all"?"":" and s.apiid=".$apiid).
        " and map <>'worldx' ".
        " group by pointsetid, map".
        " UNION ".
        " select pointsetid , concat('\"',map, '\":{\"set\":', count(s.geoid),'}') as mapcount ".
        " FROM series s join maps m on s.geoid=m.bunny ".
        " where ".($pointsetid=="all" ?"pointsetid is not null":"pointsetid =".$pointsetid).
        " and map <>'worldx' ".
        " group by pointsetid, map"
    ." ) mc group by pointsetid;","setPointsetCounts");
    runQuery("update pointsets ps join temp t on ps.pointsetid=t.id1 set ps.counts=t.text1;","setPointsetCounts");
    //runQuery("truncate temp;");
}
function encyptAcctInfo($value){

}
function decryptAcctInfo($encyptedString){

}