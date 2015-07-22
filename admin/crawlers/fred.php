<?php
/*
 * Created by Mark Elbert 5/17/12
 * Copyright, all rights reserved
 *
 */

$event_logging = true;
$sql_logging = false;
$debug = true;  //no file fetch
$fetchData = false;  //no file fetch

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
 *   freq:  D|M|A|ALL.  If missing, smartupdate  algorithm
 *   since: datetime; if missing smartupdate algorithm
*/

/* SQL to delete FRED sets and data:
    DELETE sets, setdata
    FROM sets inner join setdata on sets.setid = setdata.setid
    WHERE sets.apiid = 2;
    DELETE from sets WHERE sets.apiid = 2;
 */
$fred_api_key = '975171546acb193c402f70777c4eb46d';
$bulkFolder = "bulkfiles/fred/";
//apidid=2;


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
    global $bulkFolder, $debug, $fetchData;
    //zend.enable_gc();
//1. use the bulk file to perform a complete ingestion of all series
//2. use the API to read the entire category tree and assign cat series

    //1A. get the bulk file and unzip it
    if($fetchData){  //speed things up for reruns

        printNow(strftime ("%r").": fetching bulk file ");
        if(isset($api_row["runid"]))
            $update_run_sql = "update LOW_PRIORITY apiruns set finishdt=now() where runid = $api_row[runid]";
        else
            $update_run_sql = false;
        $fr = fopen("http://research.stlouisfed.org/fred2/downloaddata/FRED2_txt_2.zip", 'r');
        file_put_contents($bulkFolder."FRED.zip", $fr);
        fclose($fr);

        if($update_run_sql) runQuery($update_run_sql);

        printNow(strftime ("%r").": deleting file tree");
        if(file_exists($bulkFolder."FRED2_txt_2")) deleteDirectory($bulkFolder."FRED2_txt_2");
        runQuery($update_run_sql);
        printNow(strftime ("%r").": unzipping bulk file");
        $zip = new ZipArchive;
        $zip->open($bulkFolder."FRED.zip");
        $zip->extractTo('./'.$bulkFolder);
        $zip->close();
        if($update_run_sql) runQuery($update_run_sql);
        printNow(strftime ("%r").": deleting zip file");
        unlink($bulkFolder."FRED.zip");  //delete the zip file
    }

    //1B. process the bulk file
    $list = new FredList();
    $list->bulkFolderRoot = $bulkFolder;
    $list->api_row = $api_row;
    $list->IngestAll();  //all the work done here!
    $added = $list->status["added"];
    $updated = $list->status["updated"];
    $failed = $list->status["failed"];
    if(isset($api_row["runid"])){
        runQuery("update LOW_PRIORITY apiruns set finishdt=now(), added=$added, updated = $updated, failed=$failed where runid = $api_row[runid]");
    }
    ApiRunFinished($api_row);
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
    setGhandlesFreqsFirstLast($api_run["apiid"]);  //makes newly added sets search by updating sets.freqs

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
    public $separators = [" in "," from "," for "];
    public $geoSetConflicts = ["msas"=>[]];
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
    public $pointsets = [];
    public $histogram = [];
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
            $this->processLine($headerFields, $Since); //the parsing and in-memory set creation done here
            $line++;
            if($debug && intval($line/1000)*1000==$line) {
                printNow("read $line lines. ". strftime ("%r")." ");
                //break; //only read 1000 first lines in debug mode and than debug the save below
            }
            $headerFields = fgetcsv($fp, 9999, ";", "\"");
        }

        fclose($fp);
        fwrite($this->dupFile, "Summary: $this->dupTrueCount duplicates with matching data and $this->dupProblemCount duplicates with mismatching data found.");
        fclose($this->dupFile);
        $this->dupFile = false;

        if($debug) printNow("preprocessed file. $this->dupTrueCount duplicates with matching data and $this->dupProblemCount duplicates with mismatching data found.");

        preprint($this->geoSetConflicts);

        //save $this->sets to database
        $minSetSize = 5;
        $apiid = $this->api_row["apiid"];
        $processedForSave = 0;
        foreach($this->sets as $setName => &$multiUnitsFreqsSet){
            foreach($multiUnitsFreqsSet as $caseInsensitiveUnits => &$freqsBranch) {
                ksort($freqsBranch); //make save into setdata in order of PK (should be faster)
                foreach ($freqsBranch as $freq => $setFreqBranch) {  //referenced by value in hopes of not bloating $this->sets with data array
                    $setid = false;
                    $masterSetid = null;
                    $setSize = count($setFreqBranch);
                    if ($debug) printNow("$setName ($freq; $caseInsensitiveUnits): $setSize series @ " . strftime("%r"));

                    //get all the data and notes first (need to determine if metadata is at the set or series level)
                    $setMetaData = null;  //value: null = no metadata; false = different and must be saved at the series level; string = uniform set metadata should be saved at the set level
                    ksort($setFreqBranch); //make save into setdata in order of PK (should be faster)

                    //1. scan for updates in this branch, or set merges, or unit changes
                    $branchUpdates = false;
                    $newUnits = false;
                    foreach ($setFreqBranch as $geoKey => &$seriesInfo) {
                        if($seriesInfo["apidt"] != $seriesInfo["dbUpdateDT"]) {
                            $branchUpdates = true;
                        }
                        if(isset($seriesInfo["dbUnits"])){
                            if(!$newUnits){
                                $newUnits = $seriesInfo["units"];
                            } else {
                                if($newUnits != $seriesInfo["units"]) {
                                    preprint($setFreqBranch);
                                    emailAdminFatal("unable to change FRED set units", "units changed in setid $seriesInfo[setid] on geoid = $seriesInfo[geoid], not uniformly from '$seriesInfo[dbUnits]' to '$newUnits'");
                                }
                            }
                        }
                        if($seriesInfo["setid"]!==null){
                            if(!$setid){
                                $setid = $seriesInfo["setid"];
                            } else {
                                if($setid != $seriesInfo["setid"]) {
                                    preprint($setFreqBranch);
                                    emailAdminFatal("unable to merge FRED sets", "setid $seriesInfo[setid] ans $setid");
                                }
                            }
                        }
                    }

                    if($setid && $newUnits){  //units change for the set (note: an inconsistent units change errors out above.
                        if(!runQuery("update sets set units = ".safeStringSQL($newUnits)." where setid=$setid or mastersetid=$setid")) die("update units sql error");
                    }

                    //2. if any updates in branch, than we need to get metadata for all series so we can
                    //figure out if the metadata should be series or set based
                    $setid = false;
                    if($branchUpdates) {
                        foreach ($setFreqBranch as $geoKey => &$seriesInfo) {
                            if ($seriesInfo["apidt"] != $seriesInfo["dbUpdateDT"]) {
                                $this->getData($seriesInfo, false);
                            } elseif (!isset($seriesInfo["data"])) {
                                $this->getData($seriesInfo, true);  //only get the metadata
                            }
                            if($setMetaData !== false && (isset($seriesInfo["data"]) || isset($seriesInfo["notes"]))) {
                                if ($setMetaData === null) {
                                    $setMetaData = $seriesInfo["notes"];
                                } elseif ($setMetaData != $seriesInfo["notes"]) {
                                    $setMetaData = false;
                                }
                            }
                        }
                        if($setMetaData === null) {preprint($seriesInfo);die("no notes");}
                    }
                    foreach ($setFreqBranch as $geoKey => &$seriesInfo) {
                        if(isset($seriesInfo["lastDate100k"]) && $seriesInfo["lastDate100k"] > 0) { //FRED has a bunch of early 20th century series.  If they end before 1970 = 0 UNIX time, skip it!
                            if ($debug && intval(++$processedForSave / 1000) * 1000 == $processedForSave) printNow("Save $processedForSave series. " . strftime("%r") . " ");
                            //if($seriesInfo["setid"]!==null && $seriesInfo["latlon"]!="") {preprint($freqsBranch); die();}
                            /*if($seriesInfo["setid"]!==null){  //this could be a set or a masterset...
                                if($seriesInfo["latlon"]==""){
                                    $setid = $seriesInfo["setid"];
                                } else {
                                    $masterSetid = $seriesInfo["setid"]; //childset has been saved in a previous ingestion
                                }
                            } else { //this ELSE means that previous saved sets never get updated*/

                            //save/get the masterset
                            $breadCrumbs = "";
                            if ($seriesInfo["latlon"] != "" && $masterSetid === null) { //save the masterset
                                $breadCrumbs .= " > masterSet save";
                                $masterSetid = saveSet(
                                    $apiid,
                                    null,
                                    $seriesInfo["geoid"] == 0 ? $seriesInfo["title"] : $setName,
                                    $seriesInfo["units"],
                                    "St. Louis Federal Reserve",
                                    "http://research.stlouisfed.org/fred2/graph/?id=" . $seriesInfo["skey"],
                                    $setMetaData || $seriesInfo["isCopyrighted"] ? "copyrighted" : "",
                                    "",
                                    'null',
                                    "",
                                    null,
                                    null,
                                    "X");
                                if (!$masterSetid || ($seriesInfo["setid"] != null && $seriesInfo["setid"] != $masterSetid)) {
                                    preprint($seriesInfo);
                                    die("masterset not saved or not saved properly");
                                }

                            }
                            //save the set or slave-sets
                            //i.e. if (a) not yet set and large set; (2) its a point, or (3) its a single series set  (note:  $setid is set to false at start of each set branch)
                            if (!$setid || $seriesInfo["latlon"] != "" || $setSize < $minSetSize || $seriesInfo["geoid"] == 0) {
                                $breadCrumbs .= " > Set save";
                                $thissetid = saveSet(
                                    $apiid,
                                    null,
                                    ($seriesInfo["geoid"] == 0 || $setSize < $minSetSize || $seriesInfo["latlon"] != "") ? $seriesInfo["title"] : $setName,
                                    $seriesInfo["units"],
                                    "St. Louis Federal Reserve",
                                    "http://research.stlouisfed.org/fred2/graph/?id=" . $seriesInfo["skey"],
                                    $seriesInfo["isCopyrighted"] ? "Copyrighted. " : "" . $setMetaData || "",
                                    "",
                                    'null',
                                    $seriesInfo["latlon"],
                                    null,
                                    $seriesInfo["latlon"] == "" ? null : $masterSetid,
                                    $seriesInfo["latlon"] == "" ? ($seriesInfo["geoid"] == 0 || $setSize < $minSetSize ? "S" : "M") : "X"
                                );
                                if ($seriesInfo["latlon"] == "") $setid = $thissetid;  //some sets are mixed point / map
                            }
                            if ($seriesInfo["apidt"] != $seriesInfo["dbUpdateDT"]) {
                                if(!($seriesInfo["latlon"] == "" ? $setid : $masterSetid)){preprint($seriesInfo);die("setid ($setid) / masterSetid ($masterSetid) ID missing");}  //todo: remove
                                saveSetData($this->status, $seriesInfo["latlon"] == "" ? $setid : $masterSetid, $apiid, $seriesInfo["skey"], $freq, $setSize < $minSetSize && $seriesInfo["latlon"] == "" ? 0 : $seriesInfo["geoid"], $seriesInfo["latlon"], $seriesInfo["data"], $seriesInfo["apidt"], $setMetaData ? "http://research.stlouisfed.org/fred2/graph/?id=" . $seriesInfo["skey"] : $seriesInfo["notes"]);
                            } else {
                                $this->status["skipped"]++;
                            }
                        } else {
                            if (isset($seriesInfo["lastDate100k"]) && $seriesInfo["lastDate100k"] < 0) printNow("skipped due to age");
                            $this->status["skipped"]++;
                        }
                    }
                }
                unset($freqsBranch[$freq]);  //make available for trash collection
            }
        }
        printNow("IngestAll end");
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
        global $debug;
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
        static $foundGeoNames = [], $unmatchedGeoNames = [];
        if(!$geographies){
            $result = runQuery("select name, geoid, geoset, containingid, lat, lon, type, regexes, exceptex
            from geographies
            where regexes is not null and geoset<>'uscounties' and geoset not like 'nuts%'
            order by length(name) desc");  //try to find a match with the longest first (ie. "West Virginia" before "Virginia")
            while($geography = $result->fetch_assoc()) $geographies[$geography["name"]] =  $geography;
        }
        $seriesInfo = false;  //will be added to $this->sets once filled out
        //1. skip discontinued series
        if(strpos($title, "DISCONTINUED")||strpos($title, "Discontinued")) {
            $this->status["skipped"]++;
            return false;
        }

        //2. check if to see if this line already exists as in SETDATA table
        $result = runQuery("select s.name, s.units, s.setid, sd.freq, sd.geoid, sd.latlon, sd.apidt, g.geoset
        from setdata sd join sets s on sd.setid=s.setid left outer join geographies g on sd.geoid=g.geoid
        where apiid=$apiid and sd.skey=". safeStringSQL($skey));
        if($result->num_rows==1){
            //this series is in the database already!!
            $set = $result->fetch_assoc();
            $dbSetUnits = $set["units"];
            $dbSetFeq = $set["freq"];
            if($dbSetFeq!=$frequency){
                preprint($set);
                printNow("frequency: /$frequency/ ".($dbSetFeq==$frequency));
                die("mismatch freq for $file");
            }

            $seriesInfo = [
                "setid" => $set["setid"],  //$set is from DB
                "freq" => $frequency, //from FRED
                "units" => $units, //from FRED
                "latlon" => $set["latlon"],
                "geoid" => $set["geoid"],
                "skey" => $skey, //from FRED
                "file" => $file, //from FRED
                "apidt" => $updatedDt, //from FRED
                "dbUpdateDT" => $set["apidt"],
                "isCopyrighted" => $isCopyrighted,
                "title" => $title.$seasonalAdjustments[$saCode], //from FRED
                "geoset" => $set["geoset"], //from db
            ];
            if(strtolower($dbSetUnits)!=strtolower($units)) { //make case insensitive check
                $seriesInfo["dbUnits"] = $dbSetUnits;  //process at the set level
                printNow("db units do not match new data file units.  Will be processed in save routine ($units != $dbSetUnits)");
            }
            $setName = $set["name"];
        }
        //preprint($seriesInfo);

        //3. look for geo matches
        if(!$seriesInfo){
            //3a. check exact name match for
            //I would have thought that this would work, but PHP will find the first match (say "for") and lock on that ignore later matches of a different pattern (say "in")
            //$regex = "/( in | for | from )/";
            //if(preg_match($regex, $title, $matches)>0){
            $separator = false;
            $pointSet = false;
            $separatorPosition = -1;
            foreach($this->separators as $i=>$pattern){
                $position = strrpos($title, $pattern);
                if($position>$separatorPosition){
                    $separatorPosition = $position;
                    $separator = $pattern;
                }
            }

            if($separator){
                //think we have a geoName...
                $setName = trim(substr($title, 0, $separatorPosition)).$seasonalAdjustments[$saCode].$separator."&hellip;";
                $geoName = trim(substr($title, $separatorPosition+strlen($separator)));
                
                //this->geosets is to help understand the FRED data and is not persisted 
                if(preg_match("#\((.+)\)#", $geoName, $geoset)==1){
                    $geoset = $geoset[1];
                    $pointSet = strpos("MSA,MD,CSA,MSAD,NECTA Division,NECTA,CMSA,", $geoset.",")!==false;
                    if($pointSet){
                        $geoName = trim(str_replace(" (".$geoset.")","",$geoName)); //strip out the geoset
                    }
                    //combining certain geosets into single pointsets:
                    if($geoset == "MSA" || $geoset == "NECTA" || $geoset == "CSA" || $geoset == "CMSA") $geoset = "MSA/NECTA";
                    if($geoset == "MD" || $geoset == "MSAD" || $geoset == "NECTA Division") $geoset = "MD/NECTA Division";
                } else {
                    $geoset = false;
                    $pointSet = false;
                }
                $sql = "select geoset, geoid, type, lat, lon, geoset, containingid
                    from geographies
                    where name=".safeStringSQL($geoName );
                if($pointSet)
                    $sql .= " and geoset='msa'";  //this is necessary because FRED is so messed up with duplicates
                else
                    $sql .= " and geoset<>'msa'";

                $result = runQuery($sql, "FindSets");
                if($result->num_rows==1){
                    if($debug && !isset($foundGeoNames[$geoName])){
                        //printNow("match: $geoName");
                        $foundGeoNames[$geoName] = true;
                    }
                    $geography = $result->fetch_assoc();
                    $seriesInfo = [
                        "latlon" => $geography["type"]=="X"?$geography["lat"].",".$geography["lon"]:"",
                        "geoid" => $geography["type"]=="M"?$geography["geoid"]:$geography["containingid"],
                        "setid" => null,
                        "freq" => $frequency,
                        "units" => $units,
                        "skey" => $skey,
                        "file" => $file,
                        "apidt" => $updatedDt,
                        "dbUpdateDT" => null,
                        "isCopyrighted" => $isCopyrighted,
                        "title" => $title.$seasonalAdjustments[$saCode],
                        "geoset" => $pointSet ? $geoset : $geography["geoset"],
                    ];
                    if($pointSet) $setName .= " ($geoset)";
                } else {
                    //loop through the geographies and try to find a match
                    foreach($geographies as $name=>$geography){
                        //use msa geographies only for MSAs
                        if(($geography["geoset"]=="msa")==$pointSet){   //this is necessary because FRED is so messed up with duplicates
                            $regex = "#". $geography["regexes"]."#";
                            if(preg_match($regex, $geoName, $geoMatches)===1 && ($geography["exceptex"]==null || preg_match("#". $geography["exceptex"]."#", $geoName)==0 )){
                                //match!
                                if(strlen($geoMatches[0])>0.75*strlen($geoName)){ //must be tight match!!!
                                    //$setName = trim(preg_replace ($regex," &hellip;",$title.$seasonalAdjustments[$saCode]));
                                    $latlon = $geography["type"]=="X"?$geography["lat"].",".$geography["lon"]:"";
                                    $seriesInfo = [
                                        "latlon" => $latlon,
                                        "geoid" => $geography["type"]=="M"?$geography["geoid"]:$geography["containingid"],
                                        "freq" => $frequency,
                                        "units" => $units,
                                        "setid" => null,
                                        "skey" => $skey,
                                        "file" => $file,
                                        "apidt" => $updatedDt,
                                        "dbUpdateDT" => null,
                                        "isCopyrighted" => $isCopyrighted,
                                        "title" => $title.$seasonalAdjustments[$saCode],
                                        "geoset" => $pointSet?$geoset:$geography["geoset"],
                                    ];
                                    if($pointSet) $setName .= " ($geoset)";
                                    if(!isset($foundGeoNames[$geoName])){
                                        //printNow("found $geoName ($geoset) as $geography[name]");
                                        $foundGeoNames[$geoName] = true;
                                    }
                                } else {
                                    if($debug) printNow("rejected loose match: $geoMatches[0] IN $geoName");
                                }
                                break;
                            }
                        }
                    }
                    if(!isset($foundGeoNames[$geoName]) && !isset($unmatchedGeoNames[$geoName])){
                        if($pointSet && $seriesInfo && $seriesInfo["latlon"]==""){
                            printNow("unmatched possible statistical area:  $geoName ($geoset)");
                        } else {
                            //printNow("unmatched:  $geoName");
                        }
                        $unmatchedGeoNames[$geoName] = true;
                    }
                }
            } else {
                $setName = $title.$seasonalAdjustments[$saCode]; //use default if not even a separator (therefore no geomatch)
            }
            
            
            if(!$seriesInfo){ //if not part of a geoset or already in DB, use series values
                $seriesInfo = [
                    "latlon" => "",
                    "geoid" => 0,
                    "freq" => $frequency,
                    "units" => $units,
                    "setid" => null,
                    "skey" => $skey,
                    "file" => $file,
                    "apidt" => $updatedDt,
                    "dbUpdateDT" => null,
                    "isCopyrighted" => $isCopyrighted,
                    "title" => $title.$seasonalAdjustments[$saCode],
                    "geoset" => null,
                ];
                $setName = $title.$seasonalAdjustments[$saCode];  //use default if no geomatch
            }
        }
        $caseInsensitiveUnits = strtolower($units);
        if(!isset($this->sets[$setName])) $this->sets[$setName] = [];
        if(!isset($this->sets[$setName][$caseInsensitiveUnits])) $this->sets[$setName][$caseInsensitiveUnits] = [];
        if(!isset($this->sets[$setName][$caseInsensitiveUnits][$frequency])) $this->sets[$setName][$caseInsensitiveUnits][$frequency] = [];

        $geoKey = $seriesInfo["geoid"].":".$seriesInfo["latlon"];
        if(isset($this->sets[$setName][$caseInsensitiveUnits][$frequency][$geoKey])) {
            $this->dupCount++;

            $this->getData($seriesInfo); //data file is only read for the 10k or so duplicates
            $this->getData($this->sets[$setName][$caseInsensitiveUnits][$frequency][$geoKey]);
            $firstSkey = $this->sets[$setName][$caseInsensitiveUnits][$frequency][$geoKey]["skey"];
            if(json_encode($seriesInfo["data"])==json_encode($this->sets[$setName][$caseInsensitiveUnits][$frequency][$geoKey]["data"])){
                fwrite($this->dupFile, "series_ids with duplicate title, SA, units, f, and data: $seriesInfo[skey], $firstSkey: $seriesInfo[title] in $seriesInfo[units]". PHP_EOL);
                $this->dupTrueCount++;
                //if($dupPoint) printNow("duplicate point data!");
            } else {
                $this->dupProblemCount++;
                fwrite($this->dupFile, "duplicate title, SA, units, f, but mismatching data: $seriesInfo[skey], $firstSkey: $seriesInfo[title] in $seriesInfo[units]". PHP_EOL);
                if($seriesInfo["latlon"]!="" && $seriesInfo["title"]!=$this->sets[$setName][$caseInsensitiveUnits][$frequency][$geoKey]["title"]) {
                    //note: true duplicates (same data) are not conflicts.  They are freaking duplicates!
                    $geoSetConflict =  $seriesInfo["geoset"]." & ". $this->sets[$setName][$caseInsensitiveUnits][$frequency][$geoKey]["geoset"];
                    if(!isset($this->geoSetConflicts[$geoSetConflict])){
                        $this->geoSetConflicts[$geoSetConflict] = 1;
                        printNow("geoset conflict: $geoSetConflict");
                    } else {
                        $this->geoSetConflicts[$geoSetConflict]++;
                    }
                    printNow("$geoSetConflict conflict in $setName: $seriesInfo[title] and ".$this->sets[$setName][$caseInsensitiveUnits][$frequency][$geoKey]["title"]);
                }
                //many of the duplicate series are different historical period:  if so, grab teh latest
                if($seriesInfo["lastDate100k"]<$this->sets[$setName][$caseInsensitiveUnits][$frequency][$geoKey]["lastDate100k"]){
                    $seriesInfo = false; //if older data, don't replace existing series
                }
            }
        }
        if($seriesInfo) $this->sets[$setName][$caseInsensitiveUnits][$frequency][$geoKey] = $seriesInfo;
        /*if($seriesInfo["geoset"]=="msa") {
            if(!isset($this->geoSetConflicts["msas"][$geoName]))
                $this->geoSetConflicts["msas"][$geoName] = 1;
            else
                $this->geoSetConflicts["msas"][$geoName]++;
        }*/
        return $seriesInfo;
    }

    private function getData(&$seriesInfo, $metaDataOnly=false){
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
        if(!$metaDataOnly){
            $seriesInfo["data"] = [];
            try{
                while(!feof($fpText)){
                    $line = fgets($fpText);
                    if(strlen($line)>5){
                        if(strpos($line," ")===0)  $series[$headers[$i]] .= " " . trim($line);
                        $DATE_LEN = 10;
                        try{
                            $date = mdDateFromISO(substr($line, 0, $DATE_LEN), $seriesInfo["freq"]);
                        } catch(Exception $ex){
                            preprint($seriesInfo);
                        }
                        $value = trim(substr($line, $DATE_LEN));
                        if($value=="."  || !is_numeric($value)) $value = "null";
                        $seriesInfo["data"][] = $date.":" . $value;
                    }
                }
            } catch (Exception $ex){
                printNow($ex->getMessage());
                die($seriesInfo["file"]);
            }
            $seriesInfo["lastDate100k"] = unixDateFromMd($date)/100;
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