<?php
/*
 * Created by Mark Elbert 5/17/12
 * Copyright, all rights reserved MashableData.com
 *
 */

 $event_logging = true;
/* This is the plugin for the St Louis Federal Reserve API.  This and other API specific plugins
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
$fred_api_key = '975171546acb193c402f70777c4eb46d';

function ApiBatchUpdate($since,$periodicity, $api_row){
    $batch_get_limit = 10;
    $sql = 'select seriesid, skey, periodicity from series where apiid = ' . $api_row['apiid']
        . ' and l1domain=' . safeStringSQL($api_row['l1domain'])
        . ' and l2domain=' . safeStringSQL($api_row['l2domain'])
        . ' and (apidt is null or apidt < ' . $since . ') ';
    if(in_array($periodicity, array('A','M','W','D'))){
        $sql .= ' periodicity=' . safeStringSQL($periodicity);
    }
    $sql .= ' LIMIT 0 , ' . $batch_get_limit;
    logEvent("FRED API: ApiBatchUpdate", $sql);
    $series_recordset = mysql_query($sql);
    $skeys = array();
    while ($serie = mysql_fetch_assoc($series_recordset)) {
        array_push($skeys, $serie["skey"]);
    }
    return ApiGet($skeys,$api_row);
}

function ApiCrawl($catid, $api_row){ //returns series and child categories.
    global $fred_api_key, $con;
// 1. get the children of the category that we are crawling (we already have info about the parent category from previous crawl call)
    //file get
    if($catid==0 && $api_row["rootcatid"] !== null){
        $catid = $api_row["rootcatid"];
    }
    $sql = "select * from categories where catid=".$catid;
    $result = mysql_query($sql);
    if(mysql_num_rows($result)!=1){ //parent record is expected to be there.  For new APIs, manually insert root cat
        return array("status"=>"error: unable to find parent category for catid=".$catid);
    }
    $parent = mysql_fetch_assoc($result);
    $xcats = simplexml_load_string(httpGet("http://api.stlouisfed.org/fred/category/children?category_id=" . $parent["apicatid"] . "&api_key=" . $fred_api_key));
    $output = array("status"=>"ok", "catid"=> $catid, "name" => $parent["name"], "children" => array());
    //loop through <category> tags reading the tags attributes (FRED put all info in attributes)
    foreach($xcats->category as $child){
        //check to see if child cat is in DB, else insert
        $sql = "select * from categories where apicatid=" . safeStringSQL((string) $child["id"]) . " and apiid=".$api_row["apiid"];
        logEvent("FRED API: check cat", $sql);
        $result = mysql_query($sql);
        if(mysql_num_rows($result)!=1){
            $sql="insert into categories (apiid, apicatid, name) values(" . $api_row["apiid"]. "," . safeStringSQL((string) $child["id"]).",".safeStringSQL((string) $child["name"]).")";
            logEvent("FRED API: insert cat", $sql);
            mysql_query($sql);
            $childid = mysql_insert_id($con);
        } else {
            $row = mysql_fetch_assoc($result);
            $childid =$row["catid"];
        }

        //check to see if relationship is in DB, else insert
        $sql = "select * from catcat where parentid=" . $catid . " and childid=" . $childid;
        logEvent("FRED API: check catcat", $sql);
        $results = mysql_query($sql);
        if(mysql_num_rows($results)!=1){
            if(catInChain($catid, $childid)){  //recursive chekc up catcat ancester to make sure cat is not circular
                return array("status"=>"error: circular category reference for API_cat=".$apicatid);
            }
            $sql="insert into catcat (parentid, childid) values(" . $catid . "," . $childid .")";
            logEvent("FRED API: insert catcat", $sql);
            mysql_query($sql);
        }
        array_push($output["children"], array("catid"=> $childid, "apicatid"=> (string) $child["id"], "name" => (string) $child["name"]));    //unread attribute "parent_id" is the parent cat id, which is the same for all of these children
    }
// 2. get the header info of any series belonging to the crawled category (but not of the children cat, which must be the focus of a subsequent recursive crawl)
    $xseries = simplexml_load_string(httpGet($target = "http://api.stlouisfed.org/fred/category/series?category_id=" . $parent["apicatid"] . "&api_key=" . $fred_api_key));
/* return limit is 1000 series.  Currently highest series in any one cat is 994.  May need to incorporate pagination logic.  To check:
    SELECT c.name, c.apicatid, COUNT( cs.seriesid )
    FROM categories c, categoryseries cs
    WHERE c.catid = cs.catid
    AND cs.seriesid = cs.seriesid
    GROUP BY c.name, c.apicatid
    ORDER BY COUNT( cs.seriesid ) DESC
*/
    $seriesHeaders = array();
    //loop through series and read header info into PHP structure.
    //(Note: series data is not in header and require a separate FRED API call to /series/observations.)
    $skipped = array();
    foreach($xseries->series as $serie){
        //see if we have a current series & capture (note: more efficient to have this check in getSeriesDataFromFred, but (1) ony add 1ms per series and (2) want to be able to use get series to force a read
        $sql = "select s.seriesid, c.captureid, skey, c.capturedt, name, title, notes, s.url, units, units_abbrev, src, periodicity, apidt, data, 0 as catid "
        . "from series s left join captures c "
        . " on s.captureid = c.captureid where s.skey = "
        . safeStringSQL((string) $serie["id"]) .  " and apiid = " . $api_row["apiid"] . " and l1domain='" . $api_row["l1domain"]
        . "' and l2domain = '" . $api_row["l2domain"] . "'";
        logEvent("FRED API: check series", $sql);
        $result = mysql_query($sql);
        $found = mysql_num_rows($result);
        if($found==1){
            $series_in_md = mysql_fetch_assoc($result);
            $captime =  strtotime($series_in_md["capturedt"]);
            $last_updated =  strtotime((string) $serie["last_updated"]);
            logEvent("FRED API: datetime check", "capturedt:".$series_in_md["capturedt"].";strtotime:".$captime.";last_updated:".(string) $serie["last_updated"].";strtotime:".$last_updated.";test:".(($captime>=$last_updated)?"skip":"capture"));
            if($captime>=$last_updated){
                $sql="update captures set lastchecked=NOW() where captureid=".$series_in_md["captureid"];
                logEvent("FRED API: skipping", $sql);
                mysql_query($sql);
                $sql="update series s set s.notes=".safeStringSQL(((string) $serie["seasonal_adjustment"]) .".  ". ((string) $serie["notes"])) .", s.title= where seriesid=".$series_in_md["seriesid"];
                logEvent("FRED API: skipping", $sql);
                mysql_query($sql);
                array_push($skipped, array((string) $serie["id"]=>"skipped"));
            } else {
                $found=0;
            }
            catSeries($catid, $series_in_md["seriesid"]); //inserts as necessary to create the category - series relationship
        } elseif($found>1){
            return array("status"=>"error: multiple series found API ID=".$api_row["apiid"]." for key=" . (string) $serie["id"]);
        }
        if($found==0){
            $seriesHeaders[(string) $serie["id"]] = array("skey"=>(string) $serie["id"]
            , "name"=>(string) $serie["title"], "start"=>(string) $serie["start"], "end"=>(string) $serie["end"], "periodicity"=>(string) $serie["frequency_short"]
            , "notes"=>(string) $serie["notes"] . ((strlen((string) $serie["seasonal_adjustment"])>0)?" (".(string) $serie["seasonal_adjustment"].")":"")
            , "units"=>(string) $serie["units"], "units_abbrev"=>(string) $serie["units_short"]
            , "last_updated"=>(string) $serie["last_updated"], "catid"=> $catid
            , "seriesid"=> null, "captureid"=> null, "data"=> null);
        }
    };
    $results =  getSeriesDataFromFred($seriesHeaders, $api_row);  //header
    //var_dump($output);
    //print("<br>");
    foreach($results as $a => $b){
        $output[$a]=$b;
    }
    $output["count"]=$output["count"]+count($skipped);
    $output["results"] = array_merge( $output["results"], $skipped);
    return $output;
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

function getSeriesDataFromFred($seriesHeaders, $api_row ){
    global $con, $user_id, $fred_api_key;
    $status = array("results"=> array(), "count"=>count($seriesHeaders), "added"=>0, "updated"=>0, "failed"=>0) ;
//master loop through seriesHeaders
    foreach($seriesHeaders as $skey => $seriesHeader){
        //if the seriesid was not in the header, fetch it from MDdB, adding a series if it does not exist
        if($seriesHeader["seriesid"] == null){
            //get/update the series info (name, title, .. ) excluding the apidt of captureid, which are updated later.
            $sql = "select s.seriesid, c.captureid, data "
            . " from series s left outer join captures c on s.captureid=c.captureid  where skey='" . $skey . "'  and apiid = " . $api_row["apiid"];
            logEvent("FRED API: fetch series if exists in MD", $sql);
            $recordSet= mysql_query($sql);
            if(mysql_num_rows($recordSet)==0){
                //series does not exist in MDdB:  insert it and get the autoincremented seriesid
                $sql = "insert into series (name, namelen, src, url, units, units_abbrev, periodicity, skey, title, notes, apiid, l1domain, l2domain) values ("
                    . safeStringSQL( $seriesHeader["name"]) . ","
                    . strlen( $seriesHeader["name"]) . ","
                    . "'St. Louis Federal Reserve'" . ","
                    . "'http://research.stlouisfed.org/fred2/graph/?id=" . $skey . "',"
                    . safeStringSQL( $seriesHeader["units"]) . ","
                    . safeStringSQL( $seriesHeader["units_abbrev"]) . ","
                    . safeStringSQL(  FredPeriodToMdPeriod($seriesHeader["periodicity"])) . ","
                    . safeStringSQL( $seriesHeader["skey"]) . ","
                    . safeStringSQL( $seriesHeader["title"]) . ","
                    . safeStringSQL( $seriesHeader["notes"]) . ","
                    . $api_row["apiid"] . ","
                    . "'org','stlouisfed')";
                logEvent("FRED API: NewSeries", $sql);
                mysql_query($sql);
                $seriesHeader["seriesid"]  = mysql_insert_id($con);
                $status["results"][$skey] = "new_series";
                $status["added"]++;
            } else {
                //series exists in MDdB, get its MDdB's  seriesid ...
                $MdSeries = mysql_fetch_assoc($recordSet);
                $seriesHeader["seriesid"]  = $MdSeries["seriesid"];
                $seriesHeader["captureid"]  = $MdSeries["captureid"];
                $seriesHeader["data"]  = $MdSeries["data"];
            }
        }
        //get and process the observations (=data) for each series, one at a time
        $content = httpGet("http://api.stlouisfed.org/fred/series/observations?series_id=" . $skey . "&api_key=" . $fred_api_key);
        if(strpos($content,"Bad Request.")===false){
            $xobservations = simplexml_load_string($content);
            $data = "";
            $point_count = 0;
            $first_date = (string)  $xobservations->observation[0]["date"];
            $last_date = (string)  $xobservations->observation[count($xobservations->observation)-1]["date"];
            foreach($xobservations->observation as $observation){
                $date = (string) $observation["date"];
                $y = (string) $observation["value"];
                if($y==".")$y="null";
                switch(FredPeriodToMdPeriod($seriesHeader["periodicity"])){
                    case "A":
                        $x = date_format(new DateTime($date), 'Y');
                        break;
                    case "Q":
                    case "M":
                    case "SA":
                        $x = date_format(new DateTime($date), 'Y') . sprintf ("%02d",date_format(new DateTime($date), 'm')-1);
                        break;
                    case "D":
                    case "W":
                        $x = date_format(new DateTime($date), 'Y') . sprintf ("%02d",date_format(new DateTime($date), 'm')-1) . date_format(new DateTime($date), 'd');
                        break;
                }
                //echo $x.",".$y.":".$data."<br>";
                $data .= (($data=="")?"":"||") . $x . "|" . $y;
                $point_count++;
            }
           /* var_dump($data);
            echo("<BR>");
            var_dump($seriesHeader["data"]);*/
            //is this a new capture?
            //logEvent("data compare for ".$skey,$seriesHeader["data"]." vs " .$data);
            if($seriesHeader["data"]!=$data){
                $first_date_js = strtotime($first_date . ' UTC') * 1000;
                $last_date_js = strtotime($last_date . ' UTC') * 1000;
                //logEvent("FRED API: end date", $last_date );
                $sql = "INSERT INTO captures(seriesid, userid, data, hash, firstdt, lastdt, points, capturedt, processdt, lastchecked, isamerge, capturecount, privategraphcount, publicgraphcount) "
                . "VALUES (" . $seriesHeader["seriesid"]
                . ",". $user_id.", '" . $data . "'"
                . ",'" . sha1($data) . "'"
                . "," . $first_date_js
                . "," . $last_date_js
                . "," . $point_count
                . ", NOW()"
                . ", NOW()"
                . ", NOW()"
                . ",'N'"
                . ",1,0,0"
                . ")";
                logEvent("FRED API: insert capture", $sql);
                mysql_query($sql);
                $seriesHeader["captureid"] = mysql_insert_id($con);
                $status["results"][$skey] = "new_capture";
                if(mysql_num_rows($recordSet)==1)$status["updated"]++;
            } else {
                $sql = "update captures set capturecount=capturecount+1, lastchecked=NOW()"
                . " where captureid=" . $seriesHeader["captureid"];
                logEvent("FRED API: updating capture",$sql);
                mysql_query($sql);
                $status["results"][$skey] = "confirmed";
            }
            $sql = "update series set ";
            if(array_key_exists("name",$seriesHeader)){
                if(strlen($seriesHeader["name"])>0){ //...and see if we have the need updating
                    $sql .= " name=" . safeStringSQL($seriesHeader["name"])
                    . ", namelen=" . strlen($seriesHeader["name"])
                    . ", units=" . safeStringSQL($seriesHeader["units"])
                    . ", units_abbrev=" . safeStringSQL($seriesHeader["units_abbrev"])
                    . ", periodicity=" . safeStringSQL(FredPeriodToMdPeriod($seriesHeader["periodicity"]))
                    . ", title=" . safeStringSQL($seriesHeader["title"])
                    . ", notes=" . safeStringSQL($seriesHeader["notes"])
                    . ", ";
                }
            }
            $sql .= "captureid=".$seriesHeader["captureid"].", apidt=NOW() where seriesid=".$seriesHeader["seriesid"];
            logEvent("FRED API: update series", $sql);
            mysql_query($sql);
        } else {
            $sql = "update series set apidt='2025-01-01 00:00:00' where seriesid=".$seriesHeader["seriesid"];
            logEvent("FRED API: update series for failure", $sql);
            mysql_query($sql);
            $status["results"][$skey] = "failure";
            $status["failed"]++;
        }
        catSeries($seriesHeader["catid"], $seriesHeader["seriesid"]); //inserts as necessary to create the category - series relationship
    }
    return $status;
}

function catSeries($catid, $seriesid){
    if($catid==0 || $seriesid==0) return false;
    $sql = "select seriesid from categoryseries where seriesid=" . $seriesid . " and catid = " . $catid;
    logEvent("FRED API: check for CatSeries relationship", $sql);
    $temp= mysql_query($sql);
    if(mysql_num_rows($temp)==0){
        $sql = "insert into categoryseries (catid, seriesid) values (" . $catid . "," . $seriesid . " )";
        logEvent("FRED API: create CatSeries relationship", $sql);
        mysql_query($sql);
        $sql = "UPDATE series s, (SELECT seriesid, GROUP_CONCAT( c.name ) AS category "
        . " FROM categoryseries cs INNER JOIN categories c ON cs.catid = c.catid "
        . " where seriesid=" . $seriesid . " GROUP BY s.name) cat "
        . " SET s.title = cat.category WHERE s.seriesid = cat.seriesid  ";
        logEvent("FRED API: set series.title", $sql);
        mysql_query($sql);
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

function FredPeriodToMdPeriod($FredPeriodicity){
    $MdPeriod = strtoupper($FredPeriodicity);
    return  ($MdPeriod=='BW')?"D":$MdPeriod;
}

?>