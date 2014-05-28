<?php
/**
 * Created by JetBrains PhpStorm.
 * User: mark
 * Date: 9/14/12
 * Time: 12:10 PM
 * To change this template use File | Settings | File Templates.
 */

$laptop = (strpos($_SERVER["SERVER_NAME"],"mashabledata.")===false);
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
/*    var_dump($val);
    debug_print_backtrace();
    print("<br>");*/
    if(($val == NULL  || $val === NULL) && $val != ''){  //removed "|| $val==''" test
        return 'NULL';
    } else {
        return "'" . str_replace("'", "''", $val) . "'";
    }
}

function getConnection(){
    global $db, $laptop;
    if($laptop){
        $db = new mysqli("localhost","root","");
    }else{
        $db = new mysqli("localhost","mashabledata","UxH3XERJ");
    }
    if (!$db) die("status: 'db connection error'");
    $db->select_db("melbert_mashabledata");
    //$db->query("SET NAMES 'utf8'");
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
    global $orgid, $laptop;
    $uid = intval($_POST["uid"]);
    if($uid==0){
        closeConnection();
        die('{"status": "This function requires you to be logged in.  Create a free account or user your FaceBook account."}');
    }
    $sql = "select count(*), orgid from users where userid = " . $uid . ($laptop?'':" and accesstoken=" . safeSQLFromPost("accessToken"))." group by orgid";
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
    global $laptop;
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
            $sql = "update users set ".$counter."=".$counter."+1 where userid = " . $uid . ($laptop?"":" and accesstoken=" . safeSQLFromPost("accessToken"));
            runQuery($sql);
            $sql = "select ".$counter.", subscription from users where userid = " . $uid . ($laptop?"":" and accesstoken=" . safeSQLFromPost("accessToken"));
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


function setCategoryByName($apiid, $name, $parentid){ //insert categories and catcat records as needed; return catid
    //ASSUMES SIBLINGS HAVE UNIQUE NAMES
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
function setCategoryById($apiid, $apicatid, $name, $apiparentid){ //insert categories and catcat records as needed; return catid
    global $db;
    $sql = "select * from categories where apicatid=" . safeStringSQL($apicatid) . " and apiid=" . $apiid;
    $result = runQuery($sql, "check cat");
    if($result->num_rows==0){
        $sql="insert into categories (apiid, apicatid, name) values(" . $apiid . "," . safeStringSQL($apicatid).",".safeStringSQL($name).")";
        if(!runQuery($sql, "insert cat")) return array("status"=>"error: unable to insert category: ".$sql);;
        $catid = $db->insert_id;
    } else {
        $row = $result->fetch_assoc();
        $catid = $row["catid"];
    }

    $sql = "insert ignore into catcat (parentid, childid) select catid, $catid from categories where apiid=$apiid and apicatid=".safeStringSQL($apiparentid);
    $result = runQuery($sql);
    return $catid;
}

function setThemeByName($apiid, $themeName){
    global $db;
    $sql = "select themeid from themes where apiid=$apiid and name='$themeName'";
    $result = runQuery($sql, "theme fetch");
    if($result->num_rows==0){
        $sql="insert into themes (apiid, name) values($apiid,'$themeName')";
        if(!runQuery($sql, "insert theme")) throw new Exception("error: unable to insert theme $themeName for apiid $apiid");
        return $db->insert_id;
    } else {
        $row = $result->fetch_assoc();
        return $row["themeid"];
    }
}

function setCubeByDimensions($themeid, $cubeDimensions, $units){
    //save the cube and its dimensions if DNE
    //return an assc array with cube name and id
    global $db;
    $names = [];
    for($i=0;$i<count($cubeDimensions);$i++){
        array_push($names, $cubeDimensions[$i]["dimension"]);
    }
    $cubeName = count($cubeDimensions)==0?"total":"by ".implode($names, ", ");
    $sql = "select cubeid from cubes where themeid=$themeid and name='$cubeName' and units='$units'";
    $result = runQuery($sql, "cube fetch");
    if($result->num_rows==0){
        $sql="insert into cubes (themeid, name, units) values($themeid,'$cubeName','$units')";
        if(!runQuery($sql, "insert cube")) throw new Exception("error: unable to insert cube $cubeName for themeid $themeid");
        $cubeid = $db->insert_id;
    } else {
        $row = $result->fetch_assoc();
        $cubeid =$row["cubeid"];
    }
    for($i=0;$i<count($cubeDimensions);$i++){
        $dimName = $cubeDimensions[$i]["dimension"];
        $sql = "select dimid from cubedims where cubeid=$cubeid and name='$dimName'";
        $result = runQuery($sql, "cube fetch");
        if($result->num_rows==0){
            $list = [];
            for($j=0;$j<count($cubeDimensions[$i]["list"]);$j++){
                $item = $cubeDimensions[$i]["list"][$j];
                if(!isset($item["sumWithNext"])){
                    $listItem = ["name"=>$item["name"]];
                    if(isset($item["short"])) $listItem["short"] = $item["short"];
                    if(isset($item["color"])) $listItem["short"] = $item["color"];
                    array_push($list, $listItem);
                }

            }
            $dimjson = json_encode($list);
            $sql="insert into cubedims (cubeid, name, json, dimorder) values($cubeid, '$dimName',".safeStringSQL($dimjson).",$i)";
            if(!runQuery($sql, "insert cubedim")) throw new Exception("error: unable to insert dimension $dimName for cubeid $cubeid");
        }
    }
    return ["name"=>$cubeName, "id"=>$cubeid];
}


function updateSeries(&$status, $jobid, $key, $name, $src, $url, $period, $units, $units_abbrev, $notes, $title, $apiid, $apidt, $firstdt, $lastdt, $data, $geoid, $mapsetid, $pointsetid, $lat, $lon, $themeid=null){ //inserts or archive & update a series as needed.  Returns seriesid.
    global $db;
    $sql = "select * from series where skey = " . safeStringSQL($key) . " and apiid=" . $apiid;
    $result = runQuery($sql);
    if($result->num_rows==1){
        $series = $result->fetch_assoc();
        if($series["units"]!=$units
            || $series["periodicity"]!=$period
            || $series["notes"]!=$notes
            || $series["name"]!=$name
            || $series["data"]!=$data
            || ($geoid != null && is_numeric ($geoid) && $geoid != $series["geoid"])
            || ($mapsetid != null && is_numeric($mapsetid) && $series["mapsetid"]!=$mapsetid)
            || ($pointsetid != null && is_numeric($pointsetid) && $series["pointsetid"]!=$pointsetid)
        ){
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
                ."apifailures=0,"
                ."updatets=now(),"
                ."jobid=".$jobid;
            if($title!="") $sql .= ", title=".safeStringSQL($title);
            if($geoid != null && is_numeric ($geoid)) $sql .= ", geoid=".$geoid;
            if($mapsetid != null  && is_numeric ($mapsetid)) $sql .= ", mapsetid=".$mapsetid;
            if($pointsetid != null && is_numeric ($pointsetid)) $sql .= ", pointsetid=".$pointsetid;
            if($themeid != null && is_numeric ($themeid)) $sql .= ", themeid=".$themeid;
            if($lat != null && is_numeric ($lat)) $sql .= ", lat=".$lat;
            if($lon != null && is_numeric ($lon)) $sql .= ", lon=".$lon;
            $sql .= " where seriesid=".$series["seriesid"];
            $queryStatus = runQuery($sql);
            if($queryStatus){
                $status["updated"]++;
                //print($status["updated"] . ". updating series " .$key .": ".$name."<br>");
            } else {
                runQuery("update series set apifailures=apifailures+1, updatets=now(), jobid=".$jobid." where seriesid=".$series["seriesid"]);
                $status["failed"]++;
                print($status["failed"] . ". failed series update for " .$key .": ".$name."<br>");
            }
        } else{
            runQuery("update series set apifailures=0, jobid=$jobid where seriesid=".$series["seriesid"]);
            $status["skipped"]++;
            //print($status["skipped"] . ". skipping series " .$key .": ".$name."<br>");
        }
        return $series["seriesid"];
    } elseif($result->num_rows==0) {
        $sql = "insert into series (skey, name, namelen, src, units, units_abbrev, periodicity, title, url, notes, data, hash, apiid, firstdt, lastdt, geoid, mapsetid, pointsetid, themeid, lat, lon) "
            . " values (".safeStringSQL($key).",".safeStringSQL($name).",".strlen($name).",".safeStringSQL($src).",".safeStringSQL($units).",".safeStringSQL($units_abbrev).",".safeStringSQL($period).",".safeStringSQL($title).",".safeStringSQL($url).",".safeStringSQL($notes).",".safeStringSQL($data).",".safeStringSQL(sha1($data)).",".$apiid.",".$firstdt.",".$lastdt.",".($geoid===null?"null":$geoid).",". ($mapsetid===null?"null":$mapsetid) .",". ($pointsetid===null?"null":$pointsetid).",". ($themeid===null?"null":$themeid).",".($lat===null?"null":safeStringSQL($lat)).",". ($lon===null?"null":safeStringSQL($lon)).")";
        $queryStatus = runQuery($sql);
        if($queryStatus ){
            $status["added"]++;
            //print($status["added"] . ". adding series " .$key .": ".$name."<br>");
        } else {
            print("failed inserting series " .$key .": ".$name."<br>");
            $status["failed"]++;
        }
        return $db->insert_id;
    } else {
        runQuery("update series set apifailures=apifailures+1, updatets=now(), jobid=".$jobid." where skey = " . safeStringSQL($key) . " and apiid=" . $apiid);
        $status["failed"]++;
        print($status["failed"] . ". failed series update for " .$key .": ".$name."<br>");
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
function freqSets($apiid = "all"){
    /*
     * The looping is more complex then you would think necessary.  Unfortunately, mySql only matches the first is in the WHERE IN
     *   clause.  This is actually reasonably efficient, running in under 2 minutes
    */
    if($apiid == "all"){
        $apiFilter = "apiid is not null";
    } else {
        $apiFilter = "apiid = ".intval($apiid);
    }
    //updates the freqset field in series, mapsets, pointsets table after a crawl.  takes about 3 minutes of heavy mysql time
    $truncate = "truncate temp";
    $shift = "update temp set text1= mid(text1, instr(text1, ',') +1) ";
    $reduce = "delete from temp where text1 not like '%,%'";

    runQuery($truncate, "freqSets");
//TODO:  this structure craps out for series = too intensive
    //series
    $makeSeriesFreqSets = "
        insert into temp (id1, text1, text2) (SELECT min(seriesid), group_concat(seriesid SEPARATOR ',') as ids, group_concat(concat('\"', periodicity,'\":\"S', seriesid, '\"') SEPARATOR ',') as freqset
        FROM series
        WHERE $apiFilter
        group by apiid, units, name
        having count(*)>1)
";
    $updateSeries = "update series s, temp set s.freqset = temp.text2 where s.seriesid in (temp.text1)";
    runQuery($makeSeriesFreqSets, "freqSets");
    runQuery($updateSeries, "freqSets");
    for($i=0;$i<5;$i++){
        runQuery($shift, "freqSets");
        runQuery($updateSeries, "freqSets");
        runQuery($reduce, "freqSets");
    }
    runQuery($truncate, "freqSets");

    //mapsets
    $makeSeriesFreqSets = "
        insert into temp (id1, text1, text2) (SELECT min(mapsetid), group_concat(mapsetid SEPARATOR ',') as ids, group_concat(concat('\"', periodicity,'\":\"M', mapsetid, '\"') SEPARATOR ',') as freqset
        FROM mapsets
        WHERE $apiFilter
        group by apiid, units, name
        having count(*)>1);
";
    $updateMapSets = "update mapsets m, temp set m.freqset = temp.text2 where m.mapsetid in (temp.text1)";
    runQuery($makeSeriesFreqSets, "freqSets");
    runQuery($updateMapSets, "freqSets");
    for($i=0;$i<5;$i++){
        runQuery($shift, "freqSets");
        runQuery($updateMapSets, "freqSets");
        runQuery($reduce, "freqSets");
    }
    runQuery($truncate, "freqSets");

    //pointsets
    $makeSeriesFreqSets = "
        insert into temp (id1, text1, text2) (SELECT min(pointsetid), group_concat(pointsetid SEPARATOR ',') as ids, group_concat(concat('\"', periodicity,'\":\"X', pointsetid, '\"') SEPARATOR ',') as freqset
        FROM pointsets
        WHERE $apiFilter
        group by apiid, units, name
        having count(*)>1);
";
    $updatePointSets = "update pointsets x, temp set x.freqset = temp.text2 where x.pointsetid in (temp.text1)";
    runQuery($makeSeriesFreqSets, "freqSets");
    runQuery($updatePointSets, "freqSets");
    for($i=0;$i<5;$i++){
        runQuery($shift, "freqSets");
        runQuery($updatePointSets, "freqSets");
        runQuery($reduce, "freqSets");
    }
    runQuery($truncate, "freqSets");
    return array("status" => "ok");
}


function printNow($msg){ //print with added carriage return and flushes buffer so messages appears as there are created instead all at once after entire process completes
    print($msg . "<br />");
    ob_flush();
    flush();
}

function encyptAcctInfo($value){

}
function decryptAcctInfo($encyptedString){

}

function mdDateFromUnix($iDateUnix, $period){
    $uDate = new DateTime($iDateUnix);
    $jsMonth = intval($uDate->format("n"))-1;
    switch($period){
        case "A":
            return $uDate->format("Y");
        case "S":
            return $uDate->format("Y")."S".intval($jsMonth/6+1);
        case "Q":
            return $uDate->format("Y")."Q".intval($jsMonth/3+1);
        case "M":
            return $uDate->format("Y").sprintf("%02d", $jsMonth);
        case "W":
        case "D":
        return $uDate->format("Y").sprintf("%02d", $jsMonth).$uDate->format("d");
            break;
        default:
            return false;
    }
}

function unixDateFromMd($mdDate){
    $len = strlen($mdDate);
    if($len==4) {
        $uDate = new DateTime($mdDate."01-01");
        return $uDate->getTimestamp();
    }
    if($len==6){
        switch(substr($mdDate,4,1)){
            case "S":
                $uDate = new DateTime(substr($mdDate,0,4)."-0". (substr($mdDate,5,1)==1?"1":"7") ."-01");
                return $uDate->getTimestamp();
            case "Q":
                $uDate = new DateTime(substr($mdDate,0,4)."-0". sprintf("%02d", intval(substr($mdDate,5,1))*3-2) ."-01");
                return $uDate->getTimestamp();
            default:  //month
                $uDate = new DateTime(substr($mdDate,0,4)."-". substr($mdDate,4,2)."-01");
                return $uDate->getTimestamp();
        }
    }
    if($len==8){
        $uDate = new DateTime(substr($mdDate,0,4)."-". substr($mdDate,4,2)."-".substr($mdDate,6,2));
        return $uDate->getTimestamp();
    }
    return false;
}

