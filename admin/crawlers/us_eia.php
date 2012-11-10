<?php
/*
 * Created by Mark Elbert 5/17/12
 * Copyright, all rights reserved MashableData.com
 *
 */

/* clear db for retry
truncate eventlog;
truncate apirunjobs;
delete from mapsets where mapsetid>1880;
delete from pointsets where pointsetid>0;
delete from categories where catid>94769;
delete from catcat where parentid>94769 or childid>94769;
delete from categoryseries where catid>94769;
delete from captures where captureid>709374;
delete from series where seriesid>580785;
*/

 $event_logging = true;
 $sql_logging = true;

/* This is the plugin for the offical EIA API.  This and other API specific plugins
 * are included by /admin/crawlers/index.php and invoke by the admin panel /admin
 * All returns are JSON objects. Supports the standard MD API functions:
 *
 * command: Get | Update | Crawl
 *   search
 *   periodicity
 * command: Crawl
 *   exhaustive crawl starting at cat_id=0
 * command:  Update
 *   periodicity:  D|M|A|ALL.  If missing, smartupdate  algorythme
 *   since: datetime; if missing smartupdate algorythme
*/
$eai_api_key = '2A4EA0048A8ED2FB578E31467DACD950';     //key registered to mark.elbert@eia.gov
$threadjobid="null";  //used to track of execution thread

function ApiCrawl($catid, $api_row){ //initiates a WB crawl
    global $db, $threadjobid;
    set_time_limit(60); //

    // 1. create a job record
    $runid = $api_row["runid"];
    $result=runQuery("select apicatid from categories where catid=".($catid==0?$api_row["rootcatid"]:$catid));
    $row=$result->fetch_assoc();
    $apicatid = $row["apicatid"];

    $config = array("runid"=>$runid, "apiid"=>$api_row["apiid"], "type"=>"category", "apicatid"=>$apicatid);
    //create job record for start category
    $sql = "insert into apirunjobs (runid, jobjson, tries, status, startdt) values (".$runid.",'".json_encode($config)."',0,'Q',now())";
    runQuery($sql);
    $jobid  = $db->insert_id;
    $threadjobid = $jobid;

    //2. call executer
    return ApiExecuteJobs($runid);
}


function ApiExecuteJobs($runid, $jobid="ALL"){//runs all queued jobs in a single single api run until no more
    global $db, $indicators, $topics, $iso2to3, $threadjobid;
    $sql="SELECT a.apiid, a.name, a.l1domain, a.l2domain, r.* , j.jobid, j.jobjson"
        . " FROM apis a, apiruns r, apirunjobs j"
        . " WHERE a.apiid = r.apiid AND r.runid = j.runid AND r.runid=".$runid
        . " AND " . ($jobid=="ALL"?"STATUS =  'Q'":"jobid=".$jobid)
        . " LIMIT 0 , 1";
    $result = runQuery($sql);
    if($result === false || mysqli_num_rows($result)==0){
        return(array("status"=>"unable to find queued jobs for run ".$runid));
    } else {
        $api_row = $result->fetch_assoc();
    }

    //reusable SQL statements
    $next_job_sql = "select * from apirunjobs where status='Q' and runid =".$runid." limit 0,1";

    //UPDATE THE RUN'S FINISH DATE
    runQuery("update apiruns set finishdt=now() where runid = " . $runid);

    //MASTER LOOP
    $check = true;
    $job_count = 0;
    while($check){
        if($jobid!="ALL"){
            $result = runQuery($next_job_sql);
        }  else {
            $result = runQuery($next_job_sql);
        }
        if($result===false || $result->num_rows!=1){
            $check = false;
        } else {
            set_time_limit(60);
            $job_row = $result->fetch_assoc();
            if($threadjobid=="null") $threadjobid=$job_row["jobid"];
            $sql = "update apirunjobs set startdt=now(), tries=tries+1, threadjobid=".$threadjobid.", status='R' where jobid =".$job_row["jobid"];   //closed in ExecuteJob
            runQuery($sql);
            //$api_row["jobjson"] = $job_row["jobjson"];
            $api_row["jobid"] = $job_row["jobid"];
            //print("job ".$job_row["jobid"]. ": ".$job_row["jobjson"]);
            //print("<br><br>");
            //var_dump($job_row);
            //print("<br><br>");
            $statusObject = ExecuteJob(array_merge($api_row, $job_row));

            runQuery("update apiruns set scanned=scanned+".$statusObject["scanned"]
                . ", added=added+".$statusObject["added"]
                . ", updated=updated+".$statusObject["updated"]
                . ", failed=failed+".$statusObject["failed"]
                . ", finishdt=now() where runid = " . $runid);
            runQuery("update apirunjobs set enddt=now(), status='S' where jobid =".$job_row["jobid"]);

            $job_count++;
        }
        if($jobid!="ALL") $check = false; //call parameters either specify a single jobid or none, whereby jobid defaults ot "ALL"
    }
    $output = array("status"=>"ok", "runid"=>$runid, "jobs_executed"=> $job_count);
    return $output;
}

function ExecuteJob($api_row){
    global $eai_api_key, $db, $timezone;
    $status = array("updated"=>0,"added"=>0,"scanned"=>0,"failed"=>0);
    //only a single job type is supported for us_eia API = "category"
    $jobconfig = json_decode($api_row["jobjson"], true);
    //var_dump($jobconfig);
    if($jobconfig["type"]!="category"){
        die("unrecognized command");
    }
    $apicatid = $jobconfig["apicatid"];
    $url = "http://api.eia.gov/category?api_key=".$eai_api_key."&category_id=".$apicatid."&out=json";
    logEvent("eia api fetch", $url);
    $get = httpGet($url);
    if($get===false) {
        //TERMINATE CURRENT JOB
        throw new Exception("unable to get ". $url);
    }
    $eia_cat_out = json_decode($get, true);
    var_dump($eia_cat_out["category"]["name"]);print("<BR>");

    //find and insert if necessary category corresponding to the apicatid
    $sql = "select * from categories where apiid=".$api_row["apiid"]
        ." and apicatid=".$eia_cat_out["category"]["category_id"];
    $result = runQuery($sql);
    if($result->num_rows!=1){
        die("error: category should already exist");
    }
    $row = $result->fetch_assoc();
    $parentcatid = $row["catid"];

    //tag descendants of electricity and of power plants for special treatment
    if($eia_cat_out["category"]["name"]=="Electricity")$jobconfig["electricity"] = true;
    if($eia_cat_out["category"]["name"]=="Power Plant Level Data")$jobconfig["power plants"] = true;

    //categories loop = insert categories (no updating!) and catcat records if needed; create new jobs
    foreach($eia_cat_out["category"]["childcategories"] as $childCategory){
        $sql = "select * from categories where apicatid=" . safeStringSQL($childCategory["category_id"])
            . " and apiid=".$api_row["apiid"];
        $result = runQuery($sql);
        if($result->num_rows!=1){
            $sql="insert into categories (apiid, apicatid, name) values(" . $api_row["apiid"]. "," . safeStringSQL($childCategory["category_id"]).",".safeStringSQL($childCategory["name"]).")";
            runQuery($sql);
            $childcatid = $db->insert_id;
        } else {
            $row = $result->fetch_assoc();
            $childcatid =$row["catid"];
        }
        $sql="insert into catcat (parentid, childid) values(" . $parentcatid . "," . $childcatid .") ON DUPLICATE KEY UPDATE childid=" . $childcatid;
        runQuery($sql);
        $jobconfig["apicatid"] = $childCategory["category_id"]; //store the childcatid in the run -> will be the next run's parent apicatid
        $sql = "insert into apirunjobs (runid, jobjson, tries, status, startdt) values ("
            .$api_row["runid"].",".safeStringSQL(json_encode($jobconfig)).",0,'Q',null)";
        runQuery($sql);
    }

    //series loop = fetch and process series
    foreach($eia_cat_out["category"]["childseries"] as $childserie){
        $status["scanned"] += 1;
        if(!isset($jobconfig["power plants"]) || strpos($childserie["name"], "All Primemovers")){  //do harvest turbine level series
            $sql = "select * from series where skey=".safeStringSQL($childserie["series_id"])
                . " and  apiid=".$api_row["apiid"];
            $result = runQuery($sql);
            if($result->num_rows==1){
                $serie_row = $result->fetch_assoc();
                $seriesid = $serie_row["seriesid"];
                $captureid = $serie_row["captureid"];
                $saved_update_dt = new DateTime($serie_row["apidt"]);
                $update_dt =  new DateTime($childserie["updated"]);
                $needCapture = ($saved_update_dt<$update_dt);
            } else {
                $url = "http://api.eia.gov/series?api_key=".$eai_api_key."&series_id=".$childserie["series_id"]."&out=json";
                logEvent("eia api fetch", $url);
                $get = httpGet($url);
                if($get===false){
                    $sql = "update apirunjobs set status='F' where jobid=".$api_row["jobid"];
                    runQuery($sql);
                    die('{"status":"fetch failed for '.$url.'"}');
                }
                $eia_series_header_out = json_decode($get,true);
                $serie_header = $eia_series_header_out["series"][0];
                $mapsetid = 'null';
                $pointsetid = 'null';
                $geoid = 'null';
                if(isset($jobconfig["power plants"])){
                    $seriesName = str_replace(" : All Primemovers", "", $serie_header["name"]);
                } else {
                    $seriesName = $serie_header["name"];
                }
                if(strlen($serie_header["iso3166"])>0){
                    //either mapset or pointset
                    $sql = "select geoid, regexes from geographies where iso3166=".safeStringSQL($serie_header["iso3166"]);
                    $result = runQuery($sql);
                    if($result->num_rows==1){ //only make part of mapset if we can recognize the geography
                        $geography = $result->fetch_assoc();
                        $geoid =   $geography["geoid"];
                        if(isset($jobconfig["power plants"])){
                            $nameSegments = explode(" : ", $serie_header["name"]);
                            $setName = "U.S. Power Plants : " . $nameSegments[0] . " : " . $nameSegments[2];
                        } elseif (isset($jobconfig["electricity"])){
                            $nameSegments = explode(" : ", $serie_header["name"]);
                            implode(" : ", array_splice($nameSegments, count($nameSegments)-2, 1));
                            $setName = implode(" : ", $nameSegments);
                        } else { // default
                            $setName =  str_ireplace($geography["regexes"], "", $serie_header["name"]);
                        }
                        if(strlen($serie_header["lat"])==0){
                            //mapset
                            $mapsetid = getMapSet($setName, $api_row["apiid"], $serie_header["f"], $serie_header["units"]);

                        } else {
                            //pointset
                            $pointsetid = getPointSet($setName, $api_row["apiid"], $serie_header["f"], $serie_header["units"]);
                        }
                    }
                }
                $sql = "insert into series (name, namelen, src, url, units, units_abbrev, periodicity, skey, title, notes, apiid, apidt, mapsetid, pointsetid, geoid, lat, lon, l1domain, l2domain) values ("
                    . safeStringSQL( $serie_header["name"]) . ","
                    . strlen( $serie_header["name"]) . ","
                    . "'U.S. Energy Information Administration'" . ","
                    . "'http://www.eia.gov/',"
                    . safeStringSQL( $serie_header["units"]) . ","
                    . safeStringSQL( $serie_header["unitsshort"]) . ","
                    . safeStringSQL( $serie_header["f"]) . ","
                    . safeStringSQL( $serie_header["series_id"]) . ","
                    . safeStringSQL( $eia_cat_out["category"]["name"]) . ","
                    . safeStringSQL( $serie_header["description"]) . ","
                    . $api_row["apiid"] . ","
                    . safeStringSQL( $serie_header["updated"]) . ","
                    . $mapsetid  . ","
                    . $pointsetid . ","
                    . $geoid  . ","
                    . safeStringSQL($serie_header["lat"])  . ","
                    . safeStringSQL($serie_header["lon"]). ","
                    . "'gov','eia')";
                runQuery($sql);
                $seriesid = $db->insert_id;
                $captureid = null;
                $needCapture = true;
            }
            if($needCapture){
                $url = "http://api.eia.gov/series/data?api_key=".$eai_api_key."&series_id=".$childserie["series_id"]."&out=json";
                logEvent("eia api fetch", $url);
                $get = httpGet($url);
                if($get===false){
                    $sql = "update apirunjobs set status='F' where jobid=".$api_row["jobid"];
                    runQuery($sql);
                    die('{"status":"fetch failed for '.$url.'"}');
                }
                $eia_series_data_out = json_decode($get, true);
                $aryData = $eia_series_data_out["series_data"][0]["data"];
                $mashabledata = "";
                $realPointCount = 0;
                for($i=0;$i<count($aryData);$i++){
                    $point = $aryData[$i];
                    switch($childserie["f"]){
                        case "A":
                            $mddate = $point[0];
                            $jsdate = strtotime ($point[0]. "-01-01 UTC") * 1000;
                            break;
                        case "M":
                            $jsdate = strtotime (substr($point[0],0,4) ."-".substr($point[0],4,2)." UTC") * 1000;
                            $mddate = substr($point[0],0,4) . sprintf("%02d", intval(substr($point[0],4,2))-1);
                            break;
                        case "Q":
                            $jsdate = strtotime (substr($point[0],0,4) ."-". sprintf("%02d", (intval(substr($point[0],4,2))*3)-2) . " UTC") * 1000;
                            $mddate = substr($point[0],0,4) . sprintf("%02d", (intval(substr($point[0],4,2))-1)*3);
                            break;
                        default:
                            die('{"status":"unrecognized f"}');
                    }
                    $mashabledata = $mddate . '|' . (is_numeric($point[1])?$point[1]:'null')  . ((strlen($mashabledata)==0)?'':'||') . $mashabledata;
                    $realPointCount += is_numeric($point[1])?1:0;
                    if($i==0) $last_date_js = $jsdate;
                }
                $first_date_js = $jsdate;
                if($realPointCount>0){
                    if($captureid===null){
                        $sql = "INSERT INTO captures(seriesid, userid, data, hash, firstdt, lastdt, points, capturedt, processdt, lastchecked, isamerge, capturecount, privategraphcount, publicgraphcount) "
                            . "VALUES (" . $seriesid
                            . ",null, '" . $mashabledata . "'"
                            . ",'" . sha1($mashabledata) . "'"
                            . "," . $first_date_js
                            . "," . $last_date_js
                            . "," . $realPointCount
                            . ", NOW()"
                            . ", NOW()"
                            . ", NOW()"
                            . ",'N'"
                            . ",1,0,0"
                            . ")";
                        runQuery($sql);
                        $sql = "update series set captureid=".$db->insert_id." where seriesid=".$seriesid;
                        runQuery($sql);
                        $status["added"] += 1;
                    } else {
                        $sql = "update captures set "
                        . " data = ". safeStringSQL($mashabledata)
                        . ", hash='" . sha1($mashabledata)
                            . "', firstdt = ". $first_date_js
                            . ", lastdt = ". $last_date_js
                            . ", points = ". $realPointCount
                            . ", lastchecked=NOW()"
                            . " where captureid=" . $captureid;
                        runQuery($sql);
                        $status["updated"] += 1;
                    }
                    $sql="insert into categoryseries (catid, seriesid) values(" . $parentcatid . "," . $seriesid .") ON DUPLICATE KEY UPDATE seriesid=" . $seriesid;
                    runQuery($sql);
                } else {   // don't allow series of empty arrays to clog up the DB
                    $sql = "delete from series where seriesid=".$seriesid;
                    runQuery($sql);
                    $status["failed"] += 1;
                }
            }
        }
    }
    return $status;
}

function ApiGet($sourcekeys, $api_row){
    $return = array("status"=>"ok", "apiid"=>$api_row["apiid"], "count" => count($sourcekeys));
    $in_skeys="";
    foreach($sourcekeys as $skey) $in_skeys .= ((strlen($in_skeys)==0?"":",") . "'" . $skey . "'");
    $sql = "select s.seriesid, c.captureid, skey, name, title, notes, s.url, units, units_abbrev, src, periodicity, apidt, data, 0 as catid " .
        "from series s left join captures c " .
        " on s.captureid = c.captureid where s.skey in (" .
        $in_skeys .  ") and apiid = " . $api_row["apiid"] . " and l1domain='" . $api_row["l1domain"] .
        "' and l2domain = '" . $api_row["l2domain"] . "' order by periodicity";
    logEvent("FRED API: GetSeries", $sql);
    $series_recordset = mysql_query($sql);

    $seriesHeaders = array();
    while ($serie = mysql_fetch_assoc($series_recordset)) {
        $seriesHeaders[$serie["skey"]]=$serie;
    }

    $output = getSeriesDataFromFred($seriesHeaders, $api_row);
    foreach($return as $a => $b){$output[$a]=$b;}
    return $return;
}

?>