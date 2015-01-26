<?php
/*
 * Created by Mark Elbert 5/17/12
 * Copyright, all rights reserved
 *
 */

$event_logging = true;
$sql_logging = false;
$debug = true;  //no file fetch

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
        case "Update":
            //just updates data; does not add new sets or series.  Therefore no need to update cats or maps or ghandles field
            break;
        default:
            die("unknown job type");
    }
    return $status;
}

function ApiBatchUpdate($since,$periodicity, $api_row){
//uses the FRED series/updates RESTful command to update series (new series and cats updated with full crawl)
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
        foreach($updates["seriess"] as $i => &$update){
            $update["last_updated"] = substr($update["last_updated"], 0, 10); //use date part only.  Time part not store in bulk file
            $id = $update["id"];
            //$mdFreq = FredFreqToMdFreq($update["frequency_short"]);
            $result = runQuery("select s.name, s.units, s.setid, sd.freq, sd.geoid, sd.latlon, sd.apidt
                from setdata sd join sets s on sd.setid=s.setid
                where apiid=$apiid and sd.skey=". safeStringSQL($id));
            if($result->num_rows==1){
                $dbSerie = $result->fetch_assoc();
                if($dbSerie["apidt"]==$update["last_updated"]){
                    $needUpdates = false;  //all caught up!
                    break;
                }
                //get data
                $dataOffset = 0;
                $dataLimit = 10000;
                $arrayData = [];
                do{
                    $serieDataCommand = "http://api.stlouisfed.org/fred/series/observations?api_key=$fred_api_key&series_id=$id&limit=$dataLimit&offset=$dataOffset&file_type=json";
                    $serieData = json_decode(httpGet($serieDataCommand), true);
                    for($d=0;$d<count($serieData["observations"]);$d++){
                        $ob = $serieData["observations"][$d];
                        if($ob["value"]==".") $ob["value"] = "null";
                        $arrayData[] = mdDateFromISO($ob["date"], $update["frequency"]).':'.$ob["value"];
                    }
                    $dataOffset += $dataLimit;
                } while($dataOffset<$serieData["count"]);
                $firstDate100k = strtotime($update["observation_start"]." UTC")*1000;
                $lastDate100k =  strtotime($update["observation_end"]." UTC")*1000;
                $sqlData = safeStringSQL(implode("|", $arrayData));
                //update the setdata
                runQuery("update setdata
                set data=$sqlData, apidt='$update[last_updated]', firstdt100k = $firstDate100k, lastdt100k = $lastDate100k
                where setid=$dbSerie[setid] and geoid=$dbSerie[geoid] and freq='$dbSerie[freq]' and latlon='$dbSerie[latlon]' and skey='$id'");
                //update the sets first and last dates
                runQuery("update sets
                set firstdt100k = if(firstdt100k<$firstDate100k, firstdt100k , $firstDate100k), lastdt100k = if(lastdt100k>$lastDate100k, lastdt100k, $lastDate100k)
                where setid = $dbSerie[setid]");
            }
        }
        $offset += $batch_get_limit;
    }
}


function ApiCrawl($catid, $api_row){
    global $bulkFolder, $debug;
//1. use the bulk file to perform a complete ingestion of all series
//2. use the API to read the entire category tree and assign cat series

    //1A. get the bulk file and unzip it
    if(!$debug){  //speed things up for reruns
        if(isset($api_row["runid"]))
            $update_run_sql = "update LOW_PRIORITY apiruns set finishdt=now() where runid = $api_row[runid]";
        else
            $update_run_sql = false;
        $fr = fopen("http://research.stlouisfed.org/fred2/downloaddata/FRED2_txt_2.zip", 'r');
        file_put_contents($bulkFolder."FRED.zip", $fr);
        fclose($fr);

        if($update_run_sql) runQuery($update_run_sql);
        if(file_exists($bulkFolder."FRED2_txt_2")) rmdir($bulkFolder."FRED2_txt_2");
        runQuery($update_run_sql);
        $zip = new ZipArchive;
        $zip->open($bulkFolder."FRED.zip");
        $zip->extractTo('./'.$bulkFolder);
        $zip->close();
        if($update_run_sql) runQuery($update_run_sql);
        unlink($bulkFolder."FRED.zip");  //delete the zip file
    }

    //1B. process the bulk file
    $list = new FredList();
    $list->bulkFolderRoot = $bulkFolder;
    $list->api_row = $api_row;
    $list->IngestAll();
    $added = $list->status;["added"];
    $updated = $list->status;["updated"];
    $failed = $list->status;["failed"];
    if(isset($api_row["runid"])) runQuery("update LOW_PRIORITY apiruns set finishdt=now(), added=$added, updated = $updated, failed=$failed where runid = $api_row[runid]");

    //2. queue the job to process the categories
    queueJob($api_row["runid"], array("type"=>"CatCrawl", "deep"=>true, "catid"=>$api_row["rootcatid"]));  //ignore the $catid passed in; from root
    //ApiExecuteJob will be launch by chron
    return $list->status;
}


function ApiRunFinished($api_run){
    global $MAIL_HEADER;

    set_time_limit(600);
    setMapsetCounts("all", $api_run["apiid"]);

    set_time_limit(600);
    setPointsetCounts("all", $api_run["apiid"]);

    set_time_limit(600);
    setGhandlesFreqsFirstLast($api_run["apiid"]);

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
    public $dupTrueCount = 0;
    public $dupProblemCount = 0;
    public $dupFile = false;
    /*$listFile format:
    FRED: All Data Series
    Link: http://research.stlouisfed.org/fred2/
    README File Created: 2015-01-21
    FRED (Federal Reserve Economic Data)
    Economic Research Division
    Federal Reserve Bank of St. Louis

    Series files in the data directory sorted by title:

    File                                    ;Title; Units; Frequency; Seasonal Adjustment; Last Updated
    A\U\AUD10MD156N.csv                     ;10-Month London Interbank Offered Rate (LIBOR), based on Australian Dollar (DISCONTINUED SERIES)Â©; %; D; NSA; 2013-06-07
    G\B\GBP10MD156N.csv                     ;10-Month London Interbank Offered Rate (LIBOR), based on British Pound (DISCONTINUED SERIES)Â©; %; D; NSA; 2013-06-07
    C\A\D\CAD10MD156N.csv                   ;10-Month London Interbank Offered Rate (LIBOR), based on Canadian Dollar (DISCONTINUED SERIES)Â©; %; D; NSA; 2013-06-07
    ...
    ...

    Abbreviations:

    Frequency
       A = Annual
       SA = Semiannual
       Q = Quarterly
       M = Monthly
       BW = Bi-Weekly
       W = Weekly
       D = Daily
    Seasonal Adjustment
       SA = Seasonally Adjusted
       NSA = Not Seasonally Adjusted
       SAAR = Seasonally Adjusted Annual Rate
       SSA = Smoothed Seasonally Adjusted
       NA = Not Applicable

    Directories are limited to 1000 files or less.
    Subdirectories are created recursively for each character in a series ID until 1000 or fewer series IDs match a substring.
    Most zip files contain less than 1000 files and do not contain additional subdirectories.*/

    public $zipFolder = "FRED2_txt_2/";
    public $api_row;
    public $status = ["skipped"=>0, "added"=>0, "failed"=>0,"updated"=>0];
    public $sets = [];  //setname=>units=>freq=>geoid:latlon => [file, copyright, setid, skey, apidt, update=>true/false, title]


    // method declaration
    public function IngestAll($Since = false) {  //process all series in the list with LastUpdate > Since if Since is provided
        global $debug;
        $path = $this->bulkFolderRoot.$this->zipFolder.$this->listFile;
        if(!file_exists($path)) return false;  //bulk file must already be downloaded and unzipped

        //1. open the bulk file and queue up first series info (see format above)
        $fp = fopen($path, 'r');
        $headerFields = [];
        while(!feof($fp) && count($headerFields)!=6){ //queue up the first line
            $headerFields = fgetcsv($fp, 9999, ";", "\"");
        }
        $this->trimFields($headerFields);
        if($headerFields[0]=="File"){
            $headerFields = fgetcsv($fp, 9999, ";", "\"");  //queue up first data line
        } else {
            return false;
        }

        //2. loop through bulk header file and read into $this->sets
        $fieldNames = ["File"=>0, "Title"=>1, "Units"=>2, "Frequency"=>3,"Seasonal Adjustment"=>4,"Last Updated"=>5]; //key to $seriesHeader fields
        $line = 0;
        $this->dupTrueCount = 0;
        $this->dupProblemCount = 0;
        $this->dupFile = fopen($this->bulkFolderRoot."FRED_duplicates.txt", 'w');
        while(!feof($fp) && count($headerFields)==6){
            $this->trimFields($headerFields);
            $this->processLine($headerFields, $Since);
            $line++;
            if($debug && intval($line/1000)*1000==$line) printNow("read $line lines. ". strftime ("%r")." ");
            $headerFields = fgetcsv($fp, 9999, ";", "\"");
        }
        fclose($fp);
        fwrite($this->dupFile, "Summary: $this->dupTrueCount duplicates with matching data and $this->dupProblemCount duplicates with mismatching data found.");
        fclose($this->dupFile);
        $this->dupFile = false;
        printNow("preprocessed file. $this->dupTrueCount duplicates with matching data and $this->dupProblemCount duplicates with mismatching data found.");

        //save $this->sets to database
        $minSetSize = 5;
        $apiid = $this->api_row["apiid"];
        $processedForSave = 0;
        foreach($this->sets as $setName => &$multiUnitSets){
            foreach($multiUnitSets as $units => &$set){
                foreach($set as $freq => &$setFreqBranch){
                    $setid = false;
                    $masterSetid = null;
                    $setSize = count($setFreqBranch);
                    //get all the data and notes first (need to determine if metadata is at the set or series level
                    $setMetaData = null;
                    foreach($setFreqBranch as $geoKey => &$setInfo){
                        if(!$setInfo["data"]) $this->getData($setInfo);
                        if($setMetaData !== false){
                            if($setMetaData === null) {
                                $setMetaData = $setInfo["notes"];
                            }
                            elseif($setMetaData != $setInfo["notes"]){
                                $setMetaData = false;
                            }
                        }
                    }
                    foreach($setFreqBranch as $geoKey => &$setInfo){
                        $processedForSave++;
                        if($debug && intval($processedForSave/1000)*1000==$processedForSave) printNow("Save $processedForSave series. ". strftime ("%r")." ");
                        if($setInfo["setid"]){
                            $setid = $setInfo["setid"];
                        } else {
                            //is a point, save/get its mastersetid
                            if($setSize>=$minSetSize && $setInfo["latlon"]!="" && $masterSetid!==null){
                                $masterSetid = saveSet(
                                    $apiid,
                                    null,
                                    $setInfo["geoid"]==0?$setInfo["title"]:$setInfo["name"],
                                    $units,
                                    "St. Louis Federal Reserve",
                                    "http://research.stlouisfed.org/fred2/graph/?id=" . $setInfo["skey"],
                                    $setMetaData || $setInfo["isCopyrighted"]?"copyrighted":"",
                                    "",
                                    'null',
                                    "",
                                    null,
                                    null,
                                    "X");
                            }
                            //save/get the set
                            if(!$setid || $setSize<$minSetSize  || $setInfo["geoid"]==0)
                                $setid = saveSet(
                                    $apiid,
                                    null,
                                    $setMetaData || $setInfo["geoid"]==0?$setInfo["title"]:$setInfo["name"],
                                    $units,
                                    "St. Louis Federal Reserve",
                                    "",
                                    $setInfo["isCopyrighted"]?"copyrighted":"",
                                    "",
                                    'null',
                                    $setInfo["latlon"],
                                    null,
                                    $masterSetid,
                                    $setInfo["latlon"]==""?($setInfo["geoid"]==0?"M":"S"):"X"
                                );
                        }
                        saveSetData($status, $setid, $apiid, $setInfo["skey"], $freq, $setInfo["geoid"], $setInfo["latlon"], $setInfo["data"], $setInfo["apidt"], $setMetaData? "http://research.stlouisfed.org/fred2/graph/?id=" . $setInfo["skey"] : $setInfo["notes"]);
                    }
                    $set[$freq] = [];  //make available for trash collection
                }
            }
        }
        print("IngestAll end");
    }

    public function Update($code){
        $path = $this->bulkFolderRoot.$this->zipFolder.$this->listFile;
        if(!file_exists($path)) {
            print("$path not found");
            return false;
        }
        $fp = fopen($path, 'r');
        $headerFields = [];
        while(!feof($fp) && count($headerFields)!=6){ //queue up the header line
            $headerFields = fgetcsv($fp, 9999, ";", "\"");
        }
        $this->trimFields($headerFields);
        if(implode(",", $headerFields) == "File,Title,Units,Frequency,Seasonal Adjustment,Last Updated"){
            $seriesFields = fgetcsv($fp, 9999, ";", "\""); //read and parse header
        } else {
            print(implode($headerFields)." is not a valid header");
            return false;
        }

        while(!feof($fp) && count($seriesFields)==6){ //queue up the first line
            $this->trimFields($seriesFields);
            if(strpos($seriesFields[0], $code)!==false){
                $this->processLine($seriesFields);
            }
            $seriesFields = fgetcsv($fp, 9999, ";", "\"");
        }
        fclose($fp);
        return $seriesId;
    }

    private function trimFields(&$headerFields){
        for($i=0;$i<count($headerFields);$i++){
            $headerFields[$i] = trim($headerFields[$i]);
        }
    }

    private function processLine($seriesHeader, $Since = false){
        //column of $seriesHeader and other declarations
        $file = $seriesHeader[0];
        $isCopyrighted = strpos($seriesHeader[1], "©")!==false;
        $title =  str_replace("©", "", $seriesHeader[1]);
        $units = $seriesHeader[2];
        $frequency = FredFreqToMdFreq($seriesHeader[3]);
        $saCode = strtoupper($seriesHeader[4]);
        $updatedDt = $seriesHeader[5];
        $skey = substr(str_replace(".txt", "" ,$file),strrpos($file, "\\")+1);
        $apiid = $this->api_row["apiid"];

        $seasonalAdjustments = [
            "SA" => " (Seasonally Adjusted)",
            "NSA" => " (Not Seasonally Adjusted)",
            "SAAR" => " (Seasonally Adjusted Annual Rate)",
            "SSA" => " (Smoothed Seasonally Adjusted)",
            "NA" => "" // = "Not Applicable" but don't add this to the set name!
        ];
        static $geographies = false;
        if(!$geographies ){
            $result = runQuery("select geoid, geoset, containingid, lat, lon, type, regexes
            from geographies
            where regexes is not null and geoset<>'uscounties' and geoset not like 'nuts%'
            order by length(name) desc");  //try to find a match with the longest first (ie. "West Virginia" before "Virginia")
            while($geography = $result->fetch_assoc()) $geographies[] =  $geography;
        }
        $setInfo = false;  //will be added to $this->sets once filled out
        //1. skip discontinued series
        if(strpos($title, "DISCONTINUED SERIES")) {
            $this->status["failed"] =+ 1;
            return false;
        }

        //2. check if to see if already exists as in db
        $result = runQuery("select s.name, s.units, s.setid, sd.freq, sd.geoid, sd.latlon, sd.apidt, g.geoset
        from setdata sd join sets s on sd.setid=s.setid left outer join geographies g on sd.geoid=g.geoid
        where apiid=$apiid and sd.skey=". safeStringSQL($skey));
        if($result->num_rows==1){
            //this series is in the database already!!
            $set = $result->fetch_assoc();
            $dbSetName = $set["name"];
            $dbSetUnits = $set["units"];
            $dbSetFeq = $set["freq"];
            if($dbSetFeq!=$frequency || $dbSetUnits!=$units) die("mismatch freq or units for $file");
            $setInfo = [
                "name" => $set["name"],
                "units" => $units,
                "latlon" => $set["latlon"],
                "geoid" => $set["geoid"],
                "freq" => $frequency,
                "setid" => $set["setid"],
                "skey" => $skey,
                "file" => $file,
                "apidt" => $updatedDt,
                "dbUpdateDT" => $set["apidt"],
                "isCopyrighted" => $isCopyrighted,
                "title" => $title.$seasonalAdjustments[$saCode],
                "geoset" => $set["geoset"],
            ];
        }
        //preprint($setInfo);
        if(!$setInfo){
            //3. check exact name match for
            $regex = "#( for | in | from )#";
            if(preg_match($regex, $title, $matches)==1){
                //think we have a geoName...
                $separator = $matches[0];
                $nameParts = explode($separator, $title);
                if(count($nameParts)==2){
                    $geoName = trim($nameParts[1]);
                    $setName = trim($nameParts[0]).$seasonalAdjustments[$saCode]."$separator &hellip;";
                    $sql = "select geoid, type, lat, lon, geoset, containingid
                        from geographies
                        where name=".safeStringSQL($geoName );
                    $result = runQuery($sql,"FindSets");
                    if($result->num_rows>0){
                        $geography = $result->fetch_assoc();
                        /* tried to determine Georgia the country v. state, but had problems with mapset and popintset of the same cube
                         * if(isset($this->sets[$setName][$units][$frequency])){   //try to determine Georgia the country vs.
                            foreach($this->sets[$setName][$units][$frequency] as $geoKey=>$seriesInfo){
                                $siblingGeoset = $seriesInfo["geoset"];
                                break;
                            }
                            while($geography["geoset"]!=$siblingGeoset && $geography) $geography = $result->fetch_assoc();
                        }
                        if(!$geography) {
                            preprint($this->sets[$setName][$units][$frequency]);
                            printNow($title);
                            die("sibling not found for $title");
                        }*/
                        $setInfo = [
                            "name" => $setName,
                            "units" => $units,
                            "latlon" => $geography["type"]=="X"?$geography["lat"].",".$geography["lon"]:"",
                            "geoid" => $geography["type"]=="M"?$geography["geoid"]:$geography["containingid"],
                            "freq" => $frequency,
                            "setid" => null,
                            "skey" => $skey,
                            "file" => $file,
                            "apidt" => $updatedDt,
                            "dbUpdateDT" => null,
                            "isCopyrighted" => $isCopyrighted,
                            "title" => $title.$seasonalAdjustments[$saCode],
                            "geoset" => $geography["geoset"],
                        ];
                    } else {
                        //loop through the geographies and try to find a match
                        foreach($geographies as $i=>$geography){
                            $regex = "#". $geography["regexes"]."#";
                            if(preg_match($regex, $title, $matches)==1){
                                //match!
                                $setName = trim(preg_replace ($regex," &hellip;",$title.$seasonalAdjustments[$saCode]));
                                $latlon = $geography["type"]=="X"?$geography["lat"].",".$geography["lon"]:"";
                                $setInfo = [
                                    "name" => $setName,
                                    "units" => $units,
                                    "latlon" => $latlon,
                                    "geoid" => $geography["type"]=="M"?$geography["geoid"]:$geography["containingid"],
                                    "freq" => $frequency,
                                    "setid" => null,
                                    "skey" => $skey,
                                    "file" => $file,
                                    "apidt" => $updatedDt,
                                    "dbUpdateDT" => null,
                                    "isCopyrighted" => $isCopyrighted,
                                    "title" => $title.$seasonalAdjustments[$saCode],
                                    "geoset" => $geography["geoset"],
                                ];
                                break;
                            }
                        }
                    }
                }
            }
            if(!$setInfo){ //not part of a geoset:
                $setInfo = [
                    "name" => $title.$seasonalAdjustments[$saCode],
                    "units" => $units,
                    "latlon" => "",
                    "geoid" => 0,
                    "freq" => $frequency,
                    "setid" => null,
                    "skey" => $skey,
                    "file" => $file,
                    "apidt" => $updatedDt,
                    "dbUpdateDT" => null,
                    "isCopyrighted" => $isCopyrighted,
                    "title" => $title.$seasonalAdjustments[$saCode],
                    "geoset" => null,
                ];

            }
            if(!isset($this->sets[$setInfo["name"]])) $this->sets[$setInfo["name"]] = [];
            if(!isset($this->sets[$setInfo["name"]][$units])) $this->sets[$setInfo["name"]][$units] = [];
            if(!isset($this->sets[$setInfo["name"]][$units][$frequency])) $this->sets[$setInfo["name"]][$units][$frequency] = [];
            $geoKey = $setInfo["geoid"].":".$setInfo["latlon"];
            if(isset($this->sets[$setInfo["name"]][$units][$frequency][$geoKey])) {
                $this->dupCount++;
                $this->getData($setInfo);
                $this->getData($this->sets[$setInfo["name"]][$units][$frequency][$geoKey]);
                $firstSkey = $this->sets[$setInfo["name"]][$units][$frequency][$geoKey]["skey"];
                if(json_encode($setInfo["data"])==json_encode($this->sets[$setInfo["name"]][$units][$frequency][$geoKey]["data"])){
                    fwrite($this->dupFile, "series_ids with duplicate title, SA, units, and data: $setInfo[skey], $firstSkey: $setInfo[title] in $setInfo[units]");
                    $this->dupTrueCount++;
                } else {
                    $this->dupProblemCount++;
                    fwrite($this->dupFile, "duplicate title, SA, units, but mismatching data: $setInfo[skey], $firstSkey: $setInfo[title] in $setInfo[units]". PHP_EOL);
                }

                //printNow("duplicate geo $geoKey for $title (units: $units; frequency: $frequency) for series_id $setInfo[skey] and ".$this->sets[$setInfo["name"]][$units][$frequency][$geoKey]["skey"]);
            };
            $this->sets[$setInfo["name"]][$units][$frequency][$geoKey] = $setInfo;
            return $setInfo;
        }
    }

    private function getData(&$seriesInfo){
        /* data file format:
Title:               OECD based Recession Indicators for Four Big European Countries from the Period following the Peak through the Trough
Series ID:           4BIGEUROREC
Source:              Federal Reserve Bank of St. Louis
Release:             Recession Indicators Series (Not a Press Release)
Seasonal Adjustment: Not Seasonally Adjusted
Frequency:           Monthly
Units:               +1 or 0
Date Range:          1962-05-01 to 2014-03-01
Last Updated:        2014-04-02 6:08 AM CDT
Notes:               The second interpretation, known as the trough method, is to show a
                     recession from the period following the peak through the trough (i.e.
                     the peak is not included in the recession shading, but the trough is).
                      For daily data, the recession begins on the first day of the first
                     month following the peak and ends on the last day of the month of the
                     trough.  Daily data is a disaggregation of monthly data.  The trough
                     method is used when displaying data on FRED graphs.  The trough method
                     is used for this series.

                     Zones aggregates of the CLIs and the reference series are calculated
                     as weighted averages of the corresponding zone member series (i.e.
                     CLIs and IIPs).

                     OECD data should be cited as follows: OECD Composite Leading
                     Indicators, "Composite Leading Indicators: Reference Turning Points
                     and Component Series", www.oecd.org/std/cli (Accessed on date)

DATE       VALUE
1962-05-01     0
1962-06-01     1
1962-07-01     1
        */
        $path = $this->bulkFolderRoot.$this->zipFolder."data/".str_replace("\\", "/", $seriesInfo["file"]);
        $fpText = fopen($path, 'r');
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
                if(strpos($line," ")===0)  $series[$headers[$i]] .= trim($line)=="" ? "</p><p>" : " ".trim($line);
            } while(strlen($line)<=2 || strpos($line," ")===0);
        }
        $seriesInfo["notes"] = substr($series["Notes:"],-3)=="<p>"?"<p>".substr($series["Notes:"],0,-3):"<p>".$series["Notes:"]."</p>";
        $seriesInfo["data"] = [];
        try{
            while(!feof($fpText)){
                $line = fgets($fpText);
                if(strlen($line)>5){
                    if(strpos($line," ")===0)  $series[$headers[$i]] .= " " . trim($line);
                    $DATE_LEN = 10;
                    $date = mdDateFromISO(substr($line, 0, $DATE_LEN), $seriesInfo["freq"]);
                    $value = trim(substr($line, $DATE_LEN));
                    if($value=="."  || !is_numeric($value)) $value = "null";
                    $seriesInfo["data"][] = $date.":" . $value;
                }
            }
        } catch (Exception $ex){
            printNow($ex->getMessage());
            die($seriesInfo["file"]);
        }
        fclose($fpText);
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
            $date .= "Q". sprintf("%d", intval((intval(substr($isoDate,5,2))-1)/3)+1); //should be single digit
            break;
        case "Monthly":
        case "M":
            $date .= sprintf("%02d", intval(substr($isoDate,5,2))); //force a leading zero
            break;
        case "Bi-Weekly":
        case "B":
        case "Weekly":
        case "W":
        case "Daily":
        case "D":
        case "Not Applicable":
        case "NA":
            $date .= sprintf("%02d", intval(substr($isoDate,5,2)));
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


function FredFreqToMdFreq($FredPeriodicity){
    if($FredPeriodicity=="NA" || $FredPeriodicity=="Not Applicable") return "D";
    if($FredPeriodicity=="BW") return "W";
    if($FredPeriodicity=="5Y") return "A";
    return substr(strtoupper($FredPeriodicity), 0, 1);
}

?>