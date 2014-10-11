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

function safeStringSQL($val, $nullable = true){  //needed with mysql_fetch_array, but not with mysql_fetch_assoc
    if($nullable && ($val === NULL || strtoupper($val) == "NULL"  || $val == '')){  //removed "|| $val==''" test
        return "NULL";
    } else {
        return "'" . str_replace("'", "''", ($val===null?"":$val)) . "'";
    }
}

function getConnection(){
    global $db, $laptop;
    if($laptop){
        $db = new mysqli("localhost","root","");
    }else{
        if(isset($_REQUEST["db"]) && $_REQUEST["db"]=="dev"){  //allow testing of crawlers in alternate DB
            $db = new mysqli("localhost","mashabledatadev","wbuserg4bmyLl890e0");
            if (!$db) die("status: 'db connection error'");
            $selectSuccess = $db->select_db("mashabledatadev");
            if(!$selectSuccess) die("database selection failed");
        } else {
            $db = new mysqli("localhost","mashabledata","wbuserg4bmyLl890e0");
            if (!$db) die("status: 'db connection error'");
            $db->select_db("mashabledata");
        }
    }
    $db->query("SET NAMES 'utf8'");
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

function getMapSet($name, $apiid, $periodicity, $units, $meta=null, $themeid=null, $msKey=null){ //get a mapset id, creating a record if necessary
    global $db;
    if($msKey){
        $sql = "select mapsetid  from mapsets where apiid=$apiid and mskey=".safeStringSQL($msKey);
    } else {
        $sql = "select mapsetid  from mapsets where name='".$db->escape_string($name)."' and  periodicity='".$db->escape_string($periodicity)."'  and apiid=".$apiid
            ." and units ". (($units==null)?" is NULL":"=".safeStringSQL($units));
    }
    $result = runQuery($sql, "getMapSet select");
    if($result->num_rows==1){
        $row = $result->fetch_assoc();
        return $row["mapsetid"];
    } else {
        $sql = "insert into mapsets set name='".$db->escape_string($name)."', periodicity='".$db->escape_string($periodicity)
            ."', units=".(($units==null)?"NULL":safeStringSQL($units)).", apiid=".$apiid
            .", meta=".safeStringSQL($meta).", themeid=".safeStringSQL($themeid).", mskey=".safeStringSQL($msKey);
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

function getTheme($apiid, $themeName, $meta = null, $tkey = null){
    global $db;
    $sql = "select * from themes where apiid=$apiid and ";
    if($tkey) $sql .= "tkey='$tkey'"; else $sql .= "name='$themeName'";
    $result = runQuery($sql, "theme fetch");
    if($result->num_rows==0){
        $sql = "insert into themes (apiid, name, meta, tkey)
        values($apiid,'$themeName',".safeStringSQL($meta).",".safeStringSQL($tkey).")";
        if(!runQuery($sql, "insert theme"))
            throw new Exception("error: unable to insert theme $themeName for apiid $apiid");
        $themeid= $db->insert_id;
        $synthetic_row = ["name"=> $themeName, "themeid"=>$themeid, "meta"=>$meta, "tkey"=> $tkey, "apidt"=>null];
        return $synthetic_row;
    } else {
        $row = $result->fetch_assoc();
        return $row;
    }
}

function setCubeByDimensions($themeid, $cubeDimensions, $units){
    //save the cube and its dimensions if DNE
    //return an assc array with cube name and id
    global $db;
    if(count($cubeDimensions)==0) return false;  //don't insert cube for "totals"
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
    $dimensions = [];
    foreach($cubeDimensions as $i=>$dimension){
        switch($i){
            case 0:
                $dimensions["bar"]=$cubeDimensions[0]["list"];
                break;
            case 1:
                if(strtolower($cubeDimensions[1]["dimension"])=="sex"){
                    $dimensions["side"]=$cubeDimensions[1]["list"];
                } else {
                    $dimensions["stack"]=$cubeDimensions[1]["list"];
                }
                break;
            case 2:
                $dimensions["side"]=$cubeDimensions[2]["list"];
        }
    }
    runQuery("update cubes set dimnames = ".safeStringSQL(json_encode($dimensions))." where cubeid=$cubeid");
    /*for($i=0;$i<count($cubeDimensions);$i++){
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
    }*/
    return ["name"=>$cubeName, "id"=>$cubeid];
}

function printNow($msg){ //print with added carriage return and flushes buffer so messages appears as there are created instead all at once after entire process completes
    print($msg . "<br />");
    ob_flush();
    flush();
}

function timeOut($msg){
    printNow(microtime(true)."ms: ".$msg);
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
        $uDate = new DateTime($mdDate."-01-01");
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

//function for sets-based structures
function setCatSet($catid, $setid, $geoid = 0){
    if($catid==0 || $setid==0) return false;
    $sql = "select setid from categorysets where setid=$setid and catid = $catid and geoid=$geoid";
    $temp= runQuery($sql, "check for CatSets relationship");
    if($temp->num_rows==0){
        $sql = "insert into categorysets (catid, setid, geoid) values ($catid, $setid, $geoid)";
        runQuery($sql, "create CatSets relationship");
        $sql = "UPDATE sets s, (SELECT setid, GROUP_CONCAT(distinct c.name ) AS category
            FROM categorysets cs INNER JOIN categories c ON cs.catid = c.catid
            where setid=$setid and cs.geoid=$geoid) cat
            SET s.titles = cat.category WHERE s.setid = cat.setid  ";
        runQuery($sql, "set sets.title");
    }

    /*    to update all sets titles:     (run nightly!!!)
        UPDATE sets s,
            (SELECT setid, GROUP_CONCAT( c.name separator "; " ) AS category
            FROM categorysets cs INNER JOIN categories c ON cs.catid = c.catid
        group by setid) cats
        set s.title= category
        where cats.setid=s.setid
    */
    return true;
}

function setGhandlesPeriodicitiesFirstLast($apiid = "all"){
    runQuery("SET SESSION group_concat_max_len = 50000;","setGhandlesPeriodicities");
    runQuery("truncate temp;","setGhandles");
    $sql = "insert into temp (id1, text1, text2, `int1`, `int2`)
    select sd.setid, group_concat(distinct concat('G©',geoid)), group_concat(distinct concat('F©', sd.periodicity)), min(sd.firstdt100k), max(sd.lastdt100k)
    from setdata sd ";
    if($apiid == "all"){
        $sql .=" group by sd.setid;";
    } else {
        $sql .=" join sets s on sd.setid=s.setid where s.apiid=$apiid group by s.setid;";
    }

    runQuery($sql, "setGhandlesPeriodicitiesFirstLast");
    runQuery("update sets s join temp t on s.setid=t.id1 set s.ghandles = t.text1, s.periodicities = t.text2, s.firstsetdt100k = t.int1, s.lastsetdt100k = t.int2;", "setGhandlesPeriodicities");
}

function setMapsetCounts($setid="all", $apiid){
    //1.  update set.maps of all mapsets
    runQuery("truncate temp;","setMapsetCounts");
    runQuery("SET SESSION group_concat_max_len = 8000;");
    $subQuery = "select s.setid, concat('\"M©',mg.map, '\":', count(distinct sd.geoid)) as mapcount FROM sets s join setdata sd on  s.setid=sd.setid join mapgeographies mg on sd.geoid=mg.geoid where sd.latlon='' and sd.geoid<>0 ";
    if($apiid != "all") $subQuery .= " and s.apiid=".$apiid;
    if($setid != "all") $subQuery .= " and sd.setid=".$setid;
    $subQuery .= " and map <>'worldx' group by s.setid, map";

    runQuery("insert into temp (id1, text1) select setid, group_concat(mapcount) from ($subQuery) mc group by setid;","setMapsetCounts");
    runQuery("update sets s join temp t on s.setid=t.id1 set s.maps=t.text1;","setMapsetCounts");
    runQuery("truncate temp;","setMapsetCounts");
}

function setPointsetCounts($setid="all", $apiid = "all"){
    //update mastersets
    runQuery("truncate temp;","setPointsetCounts");
    runQuery("SET SESSION group_concat_max_len = 4000;","setPointsetCounts");

    //find maps for which points' geoids is a component (e.g. USA)
    $subQuery1 = "select setid, concat('\"M©',mg.map, '\":',count(distinct sd.geoid, latlon)) as mapcount FROM sets s join setdata sd on s.setid=sd.setid join mapgeographies mg on sd.geoid=mg.geoid  where sd.latlon<>'' ";
    if($apiid != "all") $subQuery1 .= " and apiid=".$apiid;
    if($setid != "all") $subQuery1 .= " and setid=".$setid;
    $subQuery1 .= " and map <>'worldx' group by setid, map";

    //find maps whose bunny = points' geoids (e.g. Virginia)
    $subQuery2 = "select sd.setid, concat('\"M©',m.map, '\":',count(distinct sd.geoid, latlon)) as mapcount FROM sets s join setdata sd on s.setid=sd.setid join sd join maps m on sd.geoid=m.bunny ";

    runQuery("insert into temp (id1, text1) select setid, group_concat(mapcount) from ($subQuery1 UNION $subQuery2 $subFilter) mc group by setid;","setPointsetCounts");
    runQuery("update sets s join temp t on s.setid=t.id1 set s.maps=t.text1;", "setPointsetCounts");
    runQuery("truncate temp;","setPointsetCounts");

    //update the points' maps

    $subQuery1 = "select setid, geoid, concat('\"M©',mg.map, '\":',count(distinct sd.geoid, latlon)) as mapcount FROM setdata sd join mapgeographies mg on sd.geoid=mg.geoid ";
    $subQuery2 = "select setid, geoid, concat('\"M©',mg.map, '\":',count(distinct sd.geoid, latlon)) as mapcount FROM setdata sd join maps m on sd.geoid=m.bunny ";
    runQuery("insert into temp (id1, id2, text1) select setid, geoid, group_concat(mapcount) from ($subQuery1 $subFilter, geoid UNION $subQuery2 $subFilter, geoid) mc group by setid, geoid;","setPointsetCounts");
    runQuery("update temp t join setdata sd on t.id1=sd.setid and t.id2=sd.geoid join sets s on s.mastersetid=t.id1 and sd.latlon=s.latlon  set s.maps=t.text1;", "setPointsetCounts");
    runQuery("truncate temp;","setPointsetCounts");
}


function saveSet($apiid, $setKey=null, $name, $units, $src, $url, $metadata='', $apidt='', $themeid='null', $latlon='', $lasthistoricaldt=null, $mastersetid=null){
    global $db;
    if($setKey){
        $sql = "select s.* from sets where s.apiid=$apiid and s.setkey=".safeStringSQL($setKey)
        ." union DISTINCT "
        ."select distinct s.* from sets join setdata sd on s.setid=sd.setid where apiid=$apiid and sd.skey=".safeStringSQL($setKey);
    } else {
        $sql = "select * from sets where apiid=$apiid and name=".safeStringSQL($name, true)." and units =".safeStringSQL($units,false);
    }
    $result = runQuery($sql, "getSet select");
    if($result->num_rows==1){
        $row = $result->fetch_assoc();
        if($row["name"]!=$name || $row["apidt"]!=$apidt || $row["units"]!=$units || $row["latlon"]!=$latlon
            || $row["lasthistoricaldt"]!=$lasthistoricaldt || $row["themeid"]!=$themeid || $row["metadata"]!=$metadata || $row["src"]!=$src  || $row["url"]!=$url ){
            $sql = "update sets set name = " .  safeStringSQL($name)
                . ", apidt = " .  safeStringSQL($apidt)
                . ", units = " .  safeStringSQL($units, false)
                . ", latlon = " .  safeStringSQL($latlon, false)
                . ", lasthistoricaldt = " .  safeStringSQL($lasthistoricaldt)
                . ", themeid = " .  $themeid
                . ", metadata = " .  safeStringSQL($metadata)
                . ", src = " .  safeStringSQL($src)
                . ", url = " .  safeStringSQL($url)
                . ", mastersetid = " .  safeStringSQL($mastersetid)
                . " where setid=". $row["setid"];
            runQuery($sql, "getSet update");
        }
        return $row["setid"];
    } elseif($result->num_rows==0) {
//      printNow(safeStringSQL($apiid));printNow(safeStringSQL($setKey));printNow(safeStringSQL($name));printNow(safeStringSQL($apidt));printNow(safeStringSQL($units));printNow(safeStringSQL($latlon));printNow(safeStringSQL($lasthistoricaldt));printNow(safeStringSQL($metadata));printNow(safeStringSQL($src));printNow(safeStringSQL($url));
        $sql = "insert into sets (apiid, setkey, name, apidt, units, latlon, lasthistoricaldt, themeid, metadata, src, url, mastersetid) VALUES ("
            . $apiid
            . ", " . safeStringSQL($setKey)
            . ", " . safeStringSQL($name)
            . ", " . safeStringSQL($apidt)
            . ", " . safeStringSQL($units, false)
            . ", " . safeStringSQL($latlon, false)
            . ", " . safeStringSQL($lasthistoricaldt)
            . ", " . $themeid
            . ", " . safeStringSQL($metadata)
            . ", " . safeStringSQL($src)
            . ", " . safeStringSQL($url)
            . ", " . safeStringSQL($mastersetid)
            . ")";
        $result = runQuery($sql, "getSet insert");
        if($result!==false){
            $setId = $db->insert_id;
            return $setId;
        }
        return false;
    }else{
        if($apiid===null) $apiid = "null";
        if($setKey===null) $setKey = "null";
        logEvent("saveSet found dup set / key", "apiid: $apiid, setKey $setKey, name: $name, units: $units");
        return false;
    }
}

function saveSetData(&$status, $setid, $apiid = null, $key = null, $periodicity, $geoid=0, $latlon="", $arrayData, $apidt=null, $metadata= false, $logAs="save / update setdata"){
    if(!$apidt) $apidt =  date("Ymd");
    sort($arrayData);
    $firstPoint = explode(":", $arrayData[0]);
    $lastPoint = explode(":", $arrayData[count($arrayData)-1]);
    $firstDate100k = unixDateFromMd($firstPoint[0])/100;
    $lastDate100k = unixDateFromMd($lastPoint[0])/100;
    $data = implode("|", $arrayData);
    if($key && $apiid){ //if source or set key is given, that is used over the setid
        $result = runQuery("select sd.setid, sd.periodicity, sd.geoid, sd.latlon, sd.data
        from setdata sd join sets s on sd.setid=s.setid
        where s.apiid = $apiid and (s.setkey='$key' or sd.skey='$key') and sd.periodicity='$periodicity' and sd.geoid=$geoid and sd.latlon=".safeStringSQL($latlon, false));
    } else {
        $result = runQuery("select data from setdata where setid=$setid and periodicity='$periodicity' and geoid=$geoid and latlon=".safeStringSQL($latlon, false));
    }
    if($result->num_rows==0){
        $status["added"]++;
    } else {
        $setData = $result->fetch_assoc();
        if($setData["data"]==$data){
            //printNow("skipping setid: $setid, geoid:$geoid");
            $status["skipped"]++;
        } else {
            //printNow("updating setid: $setid, geoid:$geoid");
            $status["updated"]++;
        }
        if($key && ($setData["setid"]!=$setid || $setData["periodicity"]!=$periodicity || $setData["geoid"]!=$geoid || $setData["latlon"]!=$latlon)){
            //in the off chance that the identifying data for source key (such as latlon) has been updated, delete record and reinsert below
            runQuery("delete from setdata where setid='$setData[setid]' and periodicity='$setData[periodicity]' and geoid=$setData[geoid] and latlon='$setData[latlon]'");
        }
    }

    $sql = "insert into setdata (setid, periodicity, geoid, latlon, ".($metadata===false?"":"metadata, ")." data, firstdt100k, lastdt100k, apidt, skey)"
        ." values($setid, '$periodicity', $geoid, '$latlon'".($metadata===false?"":safeStringSQL($metadata).","). ", '$data', $firstDate100k, $lastDate100k, '$apidt')"
        ." on duplicate key update data=".safeStringSQL($data).($metadata===false?"":", metadata=".safeStringSQL($metadata).", apidt='$apidt', skey=".safeStringSQL($key));
    return runQuery($sql, $logAs);
}

function updateSetdataMetadata($setid, $periodicity, $geoid=0, $latlon="", $metadata, $logAs="save SetMetadata"){
    $sql = "update setdata set metadata = ".  safeStringSQL($metadata)
        ." where setid=$setid and periodicity='$periodicity' and geoid=$geoid and latlon='$latlon'";
    return runQuery($sql, $logAs);
}