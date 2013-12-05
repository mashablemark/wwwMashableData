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
    //ignore $periodicity and uses FRED's update command to get the series with the latest rows
    $batch_get_limit = 10;
    $sql = 'select seriesid, skey, periodicity from series where apiid = ' . $api_row['apiid']
        . ' and l1domain=' . safeStringSQL($api_row['l1domain'])
        . ' and l2domain=' . safeStringSQL($api_row['l2domain'])
        . ' and (apidt is null or apidt < ' . $since . ') ';
    if(in_array($periodicity, array('A','M','W','D'))){
        $sql .= ' periodicity=' . safeStringSQL($periodicity);
    }
    $sql .= ' LIMIT 0 , ' . $batch_get_limit;
    $series_recordset = runQuery($sql, "FRED API: ApiBatchUpdate");
    $skeys = array();
    while ($serie = $series_recordset->fetch_assoc()) {
        array_push($skeys, $serie["skey"]);
    }
    return ApiGet($skeys,$api_row);
}


function ApiCrawl($catid, $api_row){ //returns series and child categories.
    if($catid==0 && $api_row["rootcatid"] !== null){
        $catid = $api_row["rootcatid"];
    }
    queueJob($api_row["runid"], array("type"=>"CatCrawl", "deep"=>true, "catid"=>$catid));
    ApiExecuteJobs($api_row["runid"]);
}

function ApiExecuteJob($runid, $apirunjob){//runs all queued jobs in a single single api run until no more
    global $MAIL_HEADER, $db;
    $jobid = $apirunjob["jobid"];

    $job_count = 0;
    set_time_limit(60);
    $jobconfig = json_decode($apirunjob["jobjson"], true);
    switch($jobconfig["type"]){
        case "CatCrawl":
            $status = IngestCategory($jobconfig["catid"], $apirunjob);
            break;
        default:
            die("unknown job type");
    }
    return $status;
}


function ApiRunFinished($api_run){
    set_time_limit(600);
    setMapsetCounts("all", $api_run["apiid"]);
    $sql = <<<EOS
        select count(jobid) as jobs_executed, j.status, r.startdt, r.finishdt, r.scanned, r.updated, r.added, r.failed
        from apiruns r left outer join apirunjobs j on r.runid=j.runid
        where r.runid=".$runid." group by j.status, r.startdt, r.finishdt, r.scanned, r.updated, r.added, r.failed
EOS;
    $result = runQuery($sql,"FRED run summary");
    $msg="";
    while($row=$result->fetch_assoc()){
        $msg .= json_encode($row);
    }
    mail("admin@mashabledata.com","Fred API run report", $msg, $MAIL_HEADER);
}

function IngestCategory($catid, $api_row, $deep = true){ //ingest category's series and child categories.  If deep=true, create job for each child cat.
    global $fred_api_key, $db;
    set_time_limit(60);
    $status = array("status"=>"ok", "updated"=>0,"failed"=>0,"skipped"=>0, "added"=>0);
// 1. get the children of the category that we are crawling (we already have info about the parent category from previous crawl call)
// 1A. insert the childCats and relationships as needed
// 1B. if $deep=true, create ApiRunJobs for each childCat
    if($catid==0 && $api_row["rootcatid"] !== null){
        $catid = $api_row["rootcatid"];
    }
    $sql = "select * from categories where catid=".$catid;
    $result = runQuery($sql);
    if($result->num_rows!=1){ //parent record is expected to be there.  For new APIs, manually insert root cat
        $status["status"] = "error: unable to find parent category for catid=".$catid;
        return $status;
    }
    $parent = $result->fetch_assoc();
    $xcats = simplexml_load_string(httpGet("http://api.stlouisfed.org/fred/category/children?category_id=" . $parent["apicatid"] . "&api_key=" . $fred_api_key));
    $output = array("status"=>"ok", "catid"=> $catid, "name" => $parent["name"], "children" => array());
    //loop through <category> tags reading the tags attributes (FRED puts all info in attributes... what a pain!)
    foreach($xcats->category as $child){
        //check to see if child cat is in DB, else insert
        print("creating run for APICATID " .(string) $child["id"]." from parentid ".$parent["apicatid"]."<br>");
        $sql = "select * from categories where apicatid=" . safeStringSQL((string) $child["id"]) . " and apiid=".$api_row["apiid"];
        $result = runQuery($sql, "FRED API: check cat");
        if($result->num_rows!=1){
            $sql="insert into categories (apiid, apicatid, name) values(" . $api_row["apiid"]. "," . safeStringSQL((string) $child["id"]).",".safeStringSQL((string) $child["name"]).")";
            if(!runQuery($sql, "FRED API: insert cat")) return array("status"=>"error: unable to insert category: ".$sql);;
            $childid = $db->insert_id;
        } else {
            $row = $result->fetch_assoc();
            $childid = $row["catid"];
        }
        if($deep){
            queueJob($api_row["runid"], array("type"=>"CatCrawl", "deep"=>$deep, "catid"=>$childid, "catname"=>(string) $child["name"]));
        }

        //check to see if relationship is in DB, else insert
        $sql = "select * from catcat where parentid=" . $catid . " and childid=" . $childid;
        $results = runQuery($sql, "FRED API: check catcat");
        if($results->num_rows!=1){
            if(catInChain($catid, $childid)){  //recursive check up catcat ancestor chain to make sure cat is not circular
                $status["status"] = "error: circular category reference for API_cat=" . $child["id"] ." in parent API_cat ".$parent["apicatid"] ;
                return $status;
            }
            $sql="insert into catcat (parentid, childid) values(" . $catid . "," . $childid .")";
            runQuery($sql, "FRED API: insert catcat");
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
    foreach($xseries->series as $serie){
        //see if we have a current series & capture (note: more efficient to have this check in getSeriesDataFromFred, but (1) ony add 1ms per series and (2) want to be able to use get series to force a read
        $sql = "select seriesid, skey, name, title, notes, url, units, units_abbrev, src, periodicity, apidt, data, 0 as catid "
        . " from series s "
        . " where s.skey = " . safeStringSQL((string) $serie["id"]) .  " and apiid = " . $api_row["apiid"];
        $result = runQuery($sql, "FRED API: check series");
        $found = $result->num_rows;
        if($found==0){
            $readSeries = true;
        } elseif($found==1){ //decide on whether to get the data based on the last_update date
            $series_in_md = $result->fetch_assoc();
            $apidt = (string) $serie["last_updated"];
            $readSeries = ($apidt !=$series_in_md["apidt"]);
        } elseif($found>1){
            return array("status"=>"error: multiple series found API ID=".$api_row["apiid"]." for key=" . (string) $serie["id"]);
        }
        if($readSeries){
            //skey: {skey:, title:, start:, end:, periodicity: freq_short, notes:, units, units_abbrev, last_updated, catid (the API's):, ser
            $seriesHeaders[(string) $serie["id"]] = array("skey"=>(string) $serie["id"]
            , "name"=>(string) $serie["title"] . ((strlen((string) $serie["seasonal_adjustment"])>0) && ((string) $serie["seasonal_adjustment_short"]!="NSA") && ((string) $serie["frequency_short"]!="A")?" (".(string) $serie["seasonal_adjustment"].")":"")
            , "start"=>(string) $serie["start"], "end"=>(string) $serie["end"], "periodicity"=>(string) $serie["frequency_short"]
            , "notes"=>(string) $serie["notes"] . ((strlen((string) $serie["seasonal_adjustment"])>0)?" (".(string) $serie["seasonal_adjustment"].")":"")
            , "units"=>(string) $serie["units"], "units_abbrev"=>(string) $serie["units_short"]
            , "observation_start"=>(string) $serie["observation_start"], "observation_end"=>(string) $serie["observation_end"]
            , "last_updated"=>(string) $serie["last_updated"], "catid"=> $catid, "title"=>$parent["name"]
            );
        } else {
            print("skipped ". (string) $serie["id"] . "<br>");
            $status["skipped"] += 1;
            catSeries($catid, $series_in_md["seriesid"]); //even if series is up to date, make sure the category relation exists
        }
    };
    //3. the following function does all the data calls and series insert/updating based on the seriesHeaders array built above
    getSeriesDataFromFred($seriesHeaders, $api_row, $status);  //header
    return $status;
}

function ApiGet($sourcekeys, $api_row){
    $status = array("status"=>"ok", "apiid"=>$api_row["apiid"], "count" => count($sourcekeys));
    $in_skeys="";
    foreach($sourcekeys as $skey) $in_skeys .= ((strlen($in_skeys)==0?"":",") . "'" . $skey . "'");
    $sql = "select s.seriesid, skey, name, title, notes, s.url, units, units_abbrev, src, periodicity, apidt, data, 0 as catid "
        . "from series "
        . " where s.skey in ("
        . $in_skeys .  ") and apiid = " . $api_row["apiid"]
        . " order by periodicity";
    $series_recordset = runQuery($sql, "FRED API: GetSeries");

    $seriesHeaders = array();
    while ($serie = $series_recordset->fetch_assoc()) {
        $seriesHeaders[$serie["skey"]]=$serie;
    }
    getSeriesDataFromFred($seriesHeaders, $api_row, $status);
}

function getSeriesDataFromFred($seriesHeaders, $api_row, &$status){
    global $db, $user_id, $fred_api_key;
//master loop through seriesHeaders

    foreach($seriesHeaders as $skey => $seriesHeader){
        //get and process the observations (=data) for each series, one at a time
        $content = httpGet("http://api.stlouisfed.org/fred/series/observations?series_id=" . $skey . "&api_key=" . $fred_api_key);
        if(strpos($content,"Bad Request.")===false){
            $xobservations = simplexml_load_string($content);
            $data = "";
            $point_count = 0;
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
            $seriesId = updateSeries($status,
                $api_row["jobid"],
                $seriesHeader["skey"],
                $seriesHeader["name"],
                'St. Louis Federal Reserve',
                "http://research.stlouisfed.org/fred2/graph/?id=" . $skey,
                FredPeriodToMdPeriod($seriesHeader["periodicity"]),
                $seriesHeader["units"],
                $seriesHeader["units_abbrev"],
                $seriesHeader["notes"],
                $seriesHeader["title"],  //title field updated in catSeries call
                $api_row["apiid"],
                $seriesHeader["last_updated"],
                strtotime($seriesHeader["observation_start"]." UTC")*1000,
                strtotime($seriesHeader["observation_end"]." UTC")*1000,
                $data,
                null, null, null, null, null  //geoid, set ids, lat, & lat
            );
            catSeries($seriesHeader["catid"], $seriesId); //make sure the category relation exists and the titles field is up to date
        } else {
            $sql = "update series set apifailures=apifailures+1 where skey=".$seriesHeader["skey"]." and apidid = " . $api_row["apiid"];
            runQuery($sql, "FRED API: update series for failure");
            $status["failed"]++;
        }
    }
}

function FredPeriodToMdPeriod($FredPeriodicity){
    $MdPeriod = strtoupper($FredPeriodicity);
    return  (strpos($MdPeriod, "W")===false)?$MdPeriod:"W";
}

?>