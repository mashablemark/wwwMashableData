<?php
/*
 * Created by Mark Elbert 5/17/12
 * Copyright, all rights reserved
 *
 */

$event_logging = true;
$sql_logging = false;

/* This is the plugin for the St Louis Federal Reserve API.  This and other API specific plugins
 * are included by /admin/crawlers/index.php and invoke by the admin panel /admin
 * All returns are JSON objects. Supports the standard MD API functions:
 *
 * command: Get | Update | Crawl
 *   search
 *   freq
 * command: Crawl
 *   exhaustive crawl starting at cat_id=0
 * command:  Update
 *   freq:  D|M|A|ALL.  If missing, smartupdate  algorythme
 *   since: datetime; if missing smartupdate algorythme
*/
$fred_api_key = '975171546acb193c402f70777c4eb46d';
$bulkFolder = "bulkfiles/fred/";


function ApiExecuteJob($runid, $apirunjob){
//jobs only used by category crawler getCategoryChildren()
    global $MAIL_HEADER, $db;
    $jobid = $apirunjob["jobid"];

    $job_count = 0;
    set_time_limit(60);
    $jobconfig = json_decode($apirunjob["jobjson"], true);
    switch($jobconfig["type"]){
        case "CatCrawl":
            $status = getCategoryChildren($jobconfig["catid"], $apirunjob);
            break;
        default:
            die("unknown job type");
    }
    return $status;
}

function ApiBatchUpdate($since,$periodicity, $api_row){
//uses the FRED series/updates commend to update/insert series (cats updated with full crawl)
    global $fred_api_key;
    $apiid = $api_row["apiid"];
    $status = ["skipped"=>0, "added"=>0, "failed"=>0,"updated"=>0];

    //ignore $periodicity (uses FRED's update command to get the series with the latest rows)
    $batch_get_limit = 100;
    $offset = 0;
    $needUpdates = true;
    while($needUpdates){
        $updatedSeriesCommand = "http://api.stlouisfed.org/fred/series/updates?api_key=$fred_api_key&file_type=json&limit=$batch_get_limit&offset=$offset";
        $updates = json_decode(httpGet($updatedSeriesCommand), true);
        for($i=0;$i<count($updates["seriess"]);$i++){
            $update = $updates["seriess"][$i];
            $update["last_updated"] = substr($update["last_updated"], 0, 10);
            $id = $update["id"];
            $result = runQuery("select * from series where apiid=$apiid and skey='$id'");
            if($result->num_rows==1){
                $serie = $result->fetch_assoc();
                if($serie["apidt"]==$update["last_updated"]){
                    $needUpdates = false;  //all caught up!
                    break;
                }
            }
            //get data
            $dataOffset = 0;
            $dataLimit = 10000;
            $data = [];
            do{
                $serieDataCommand = "http://api.stlouisfed.org/fred/series/observations?api_key=$fred_api_key&series_id=$id&limit=$dataLimit&offset=$dataOffset&file_type=json";
                $serieData = json_decode(httpGet($serieDataCommand), true);
                for($d=0;$d<count($serieData["observations"]);$d++){
                    $ob = $serieData["observations"][$d];
                    if($ob["value"]==".") $ob["value"] = "null";
                    array_unshift($data, mdDateFromISO($ob["date"], $update["frequency"]).':'.$ob["value"]);
                }
                $dataOffset += $dataLimit;
            } while($dataOffset<$serieData["count"]);


            $sa = $update["seasonal_adjustment_short"];
            $seriesId = updateSeries(
                $status,
                $api_row["runid"],
                $update["id"],
                $update["title"] . ($sa=="SA" || $sa=="SSA" || $sa=="SSAR" ? " (".$update["seasonal_adjustment"].")" : ""),
                'St. Louis Federal Reserve',
                "http://research.stlouisfed.org/fred2/graph/?id=" . $update["id"],
                FredPeriodToMdPeriod($update["frequency_short"]),
                $update["units"],
                $update["units_short"],
                $update["notes"],
                "",  //title field updated in catSeries call
                $api_row["apiid"],
                $update["last_updated"],
                strtotime($update["observation_start"]." UTC")*1000,
                strtotime($update["observation_end"]." UTC")*1000,
                implode("|", $data),
                null, null, null, null, null  //geoid, set ids, lat, & lat
            );

            /*print($serieDataCommand."<BR>");
            print($serie["data"]."<BR>");
            print($serie["apidt"].":".substr($update["last_updated"],0,10));
            die();*/
        }
        $offset += $batch_get_limit;
    }
}


function ApiCrawl($catid, $api_row){
    global $bulkFolder;
//1. use the bulk file to perform a complete ingestion of all series
//2. use the API to read the entire category tree and assign cat series

    //1A. get the bulk file and unzip it
 /*   $runid = $api_row["runid"];
    $update_run_sql = "update LOW_PRIORITY apiruns set finishdt=now() where runid = $runid";
    $fr = fopen("http://research.stlouisfed.org/fred2/downloaddata/FRED2_txt_2.zip", 'r');
    file_put_contents($bulkFolder."FRED.zip", $fr);
    fclose($fr);

    runQuery($update_run_sql);
    rmdir($bulkFolder."FRED2_txt_2");
    runQuery($update_run_sql);
    $zip = new ZipArchive;
    $zip->open($bulkFolder."FRED.zip");
    $zip->extractTo('./'.$bulkFolder);
    $zip->close();
    runQuery($update_run_sql);
    unlink($bulkFolder."FRED.zip");  //delete the zip file*/

    //1B. process the bulk file
    $list = new FredList();
    $list->bulkFolderRoot = $bulkFolder;
    $list->api_row = $api_row;
    $list->IngestAll();
    $added = $list->status;["added"];
    $updated = $list->status;["updated"];
    $failed = $list->status;["failed"];
    runQuery("update LOW_PRIORITY apiruns set finishdt=now(), added=$added, updated = $updated, failed=$failed where runid = $runid");

    //2. queue the job to process the categories
    queueJob($api_row["runid"], array("type"=>"CatCrawl", "deep"=>true, "catid"=>$api_row["rootcatid"]));  //ignore the $catid passed in; from root
    //ApiExecuteJob will be launch by chron
    return $list->status;
}


function ApiRunFinished($api_run){
    global $MAIL_HEADER;

    set_time_limit(600);
    findSets($api_run["apiid"]);

    set_time_limit(600);
    setMapsetCounts("all", $api_run["apiid"]);

    $runId = $api_run["runid"];
    $sql = <<<EOS
        select count(jobid) as jobs_executed, j.status, r.startdt, r.finishdt, r.scanned, r.updated, r.added, r.failed
        from apiruns r left outer join apirunjobs j on r.runid=j.runid
        where r.runid=$runId group by j.status, r.startdt, r.finishdt, r.scanned, r.updated, r.added, r.failed
EOS;
    $result = runQuery($sql,"FRED run summary");
    $msg="";
    while($row=$result->fetch_assoc()){
        $msg .= json_encode($row);
    }
    mail("admin@mashabledata.com","Fred API run report", $msg, $MAIL_HEADER);
}

class FredList
{
    // property declaration
    public $bulkFolderRoot = 'esdata/';
    public $listFile = "README_TITLE_SORT.txt";
    public $zipFolder = "FRED2_txt_2/";
    public $api_row;
    public $status = ["skipped"=>0, "added"=>0, "failed"=>0,"updated"=>0];

    // method declaration
    public function IngestAll($Since = false) {  //process all series in the list with LastUpdate > Since is Since is provided
        $path = $this->bulkFolderRoot.$this->zipFolder.$this->listFile;
        if(!file_exists($path)) return false;

        $fp = fopen($path, 'r');
        $fields = [];
        while(!feof($fp) && count($fields)!=6){ //queue up the first line
            $fields = fgetcsv($fp, 9999, ";", "\"");
        }
        $this->trimFields($fields);
        if($fields[0]=="File"){
            $fields = fgetcsv($fp, 9999, ";", "\"");  //queue up first data line
        } else {
            return false;
        }

        while(!feof($fp) && count($fields)==6){ //queue up the first line
            $this->trimFields($fields);
            $this->processLine($fields, $Since);
            $processed = $this->status["added"] + $this->status["updated"] + $this->status["skipped"];
            if(intval($processed/1000)*1000==$processed) {
                print("$processed. ". strftime ("%r")." ");
                var_dump($fields);
                printNow("<br>");
            }
            $fields = fgetcsv($fp, 9999, ";", "\"");
        }
        fclose($fp);
    }

    public function Update($code){
        $path = $this->bulkFolderRoot.$this->zipFolder.$this->listFile;
        if(!file_exists($path)) {
            print("$path not found");
            return false;
        }
        $fp = fopen($path, 'r');
        $fields = [];
        while(!feof($fp) && count($fields)!=6){ //queue up the first line
            $fields = fgetcsv($fp, 9999, ";", "\"");
        }
        $this->trimFields($fields);
        if($fields[0]=="File"){
            $fields = fgetcsv($fp, 9999, ";", "\""); //queue up first data line
        } else {
            print(implode($fields)."no value");
            return false;
        }

        while(!feof($fp) && count($fields)==6){ //queue up the first line
            $this->trimFields($fields);
            if(strpos($fields[0], $code)!==false){
                $seriesId = $this->processLine($fields);
                break;
            }
            $fields = fgetcsv($fp, 9999, ";", "\"");
        }
        fclose($fp);
        return $seriesId;
    }

    private function trimFields(&$fields){
        for($i=0;$i<count($fields);$i++){
            $fields[$i] = trim($fields[$i]);
        }
    }

    private function processLine($trimFields, $Since = false){
        $fieldNames = ["File"=>0, "Title"=>1, "Units"=>2, "Frequency"=>3,"Seasonal Adjustment"=>4,"Last Updated"=>5];
        if(strpos($trimFields[$fieldNames["Title"]], "DISCONTINUED SERIES")) {
            $this->status["failed"] =+ 1;
            return false;
        }
        $fpText = fopen($this->bulkFolderRoot.$this->zipFolder."data/".str_replace("\\", "/", $trimFields[$fieldNames["File"]]), 'r');
        $headers = ["Title:","Series ID:","Source:","Release:","Seasonal Adjustment:","Frequency:","Units:","Date Range:","Last Updated:","Notes:","DATE"];
        $series = [];
        $line = fgets($fpText);
        for($i=0;$i<count($headers);$i++){
            if(strpos($line,$headers[$i])!==0) {
                return false;
            }
            if($headers[$i]=="DATE") {
                break;
            }  //queue up the date (DATE - VALUES) section perfectly
            $series[$headers[$i]] = trim(substr($line, strlen($headers[$i])));

            do{
                $line = fgets($fpText);
                if(strpos($line," ")===0)  $series[$headers[$i]] .= " " . trim($line);
            } while(strlen($line)<=2 || strpos($line," ")===0);
            //print($i.$headers[$i].$series[$headers[$i]]."<BR>");
        }
        $data = [];
        try{
            while(!feof($fpText)){
                $line = fgets($fpText);
                if(strlen($line)>5){
                    if(strpos($line," ")===0)  $series[$headers[$i]] .= " " . trim($line);
                    $DATE_LEN = 10;
                    $date = mdDateFromISO(substr($line, 0, $DATE_LEN), $series["Frequency:"]);
                    $value = trim(substr($line, $DATE_LEN));
                    if($value=="."  || !is_numeric($value)) $value = "null";
                    array_unshift($data, $date.":".$value);
                }
            }
        } catch (Exception $ex){
            print($ex->getMessage());
            die($trimFields[$fieldNames["File"]]);
        }
        $series["data"] = implode("|", $data);
        fclose($fpText);

        $sa = $trimFields[$fieldNames["Seasonal Adjustment"]];
        $dateRange = $series["Date Range:"];
        $firstLast = explode(" to ", $dateRange);

        $skey = $series["Series ID:"];
        $seriesId = updateSeries(
            $this->status,
            $this->api_row["runid"],
            $skey,
            $trimFields[$fieldNames["Title"]] . ($sa=="SA" || $sa=="SSA" || $sa=="SSAR" ? " (".$series["Seasonal Adjustment:"].")" : ""),
            'St. Louis Federal Reserve',
            "http://research.stlouisfed.org/fred2/graph/?id=" . $skey,
            FredPeriodToMdPeriod($series["Frequency:"]),
            $series["Units:"],
            $trimFields[$fieldNames["Units"]],
            $series["Notes:"],
            "",  //title field updated in catSeries call
            $this->api_row["apiid"],
            substr($series["Last Updated:"], 0, 10), //date part ony because FRED varies the rest
            strtotime($firstLast[0]." UTC")*1000,
            strtotime($firstLast[1]." UTC")*1000,
            $series["data"],
            null, null, null, null, null  //geoid, set ids, lat, & lat
        );

        return $seriesId;
    }
}

function mdDateFromISO($isoDate, $frequency){
//isoDate = "YYY-MM-DD"
    $date = substr($isoDate,0,4);
    switch(substr($frequency,0,1)){
        case "Annual":
        case "A":
            break;
        case "Semiannual":
        case "S":
            $date .= "S". (substr($isoDate,5,2)=="01"?"1":"2");
            break;
        case "Quarterly":
        case "Q":
            $date .= "Q". sprintf("d", intval((intval(substr($isoDate,5,2))-1)/3)+1);
            break;
        case "Monthly":
        case "M":
            $date .= sprintf("%02d", intval(substr($isoDate,5,2))-1);
            break;
        case "Bi-Weekly":
        case "B":
        case "Weekly":
        case "W":
        case "Daily":
        case "D":
        case "Not Applicable":
        case "NA":
            $date .= sprintf("%02d", intval(substr($isoDate,5,2))-1);
            $date .= substr($isoDate,8,2);
            break;
        default:
            throw new Exception("unrecongized frequency: $frequency");
    }
    return $date;
}

function getCategoryChildren($api_row, $job_row){
    global $fred_api_key;
    static $count = 0;

    $apiid = $api_row["apiid"];
    $job_config = json_decode($job_row["jobjson"]);
    $deep = $job_config ["deep"];
    $catid = $job_config ["catid"];

    //1. fetch apicatid from db (assumes the current apicat exist in MD)
    $result = runQuery("select apicatid from categories where apiid=$apiid and catid=$catid");
    if($result->num_rows==0) {
        runQuery("update apirunjobs set status='F' where jobid=".$job_row["jobid"]);
        return false;
    }
    $row = $result->fetch_assoc();
    $apicatid = $row["apicatid"];

    //2. fetch children series from FRED
    $offset = 0;
    do{
        $catSeriesCommand = "http://api.stlouisfed.org/fred/category/series?category_id=$apicatid&api_key=$fred_api_key&file_type=json&limit=1000&offset=$offset";
        $catSeries = json_decode(httpGet($catSeriesCommand), true);
        $offset += 1000;
        for($i=0; $i<count($catSeries["seriess"]);$i++){
            $count++;
            $sourceKey = $catSeries["seriess"][$i]["id"];

            $sql = "insert into categoryseries (catid, seriesid) (select $catid, seriesid from series where apiid=$apiid and key='$sourceKey') on duplicate key update catid = $catid ";
            $result = runQuery($sql);
            if($result===false) {
                runQuery("update apirunjobs set status='F' where jobid=".$job_row["jobid"]);
                return false;
            }
        }
    } while($catSeries["count"]>$offset);

    //3. fetch children categories from FRED
    $catChildrenCommand = "http://api.stlouisfed.org/fred/category/children?category_id=$apicatid&api_key=$fred_api_key&file_type=json";
    $childCats = json_decode(httpGet($catChildrenCommand), true);
    for($i=0; $i<count($childCats["categories"]);$i++){ //no limit on the returned cat children (therefor no offset or do loop needed)
        $name = $childCats["categories"][$i]["name"];
        $sqlName = safeStringSQL($name);
        $apichildid = $childCats["categories"][$i]["id"];
        $sql = "insert in categories (name, apicatid, apiid) values ($sqlName, '$apichildid', $apiid) on duplicate key update name = $sqlName";
        runQuery($sql);
        $childId = setCategoryById($apiid, $apichildid, $name, $apicatid);
        if($deep) {
            queueJob($api_row["runid"], array("type"=>"CatCrawl", "deep"=>true, "catid"=>$childId));  //ignore the $catid passed in; from root
        }
    }
    return ["skipped"=>0, "added"=>0, "failed"=>0,"updated"=>$count];
}


function FredPeriodToMdPeriod($FredPeriodicity){
    if($FredPeriodicity=="NA" || $FredPeriodicity=="Not Applicable"){
        return "D";
    } else {
        return substr(strtoupper($FredPeriodicity), 0, 1);
    }
}

?>