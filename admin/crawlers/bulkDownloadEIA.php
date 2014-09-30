<?php
/**
 * EIA Bulk file ingest to sets
 * User: Mark Elbert
 * Date: 10/7/13
 *
 *
 */

$event_logging = true;
$sql_logging = false;
$localBulkFolder = "bulkfiles/eia/";
$minSetSize = 5;  //detected sets smaller than this
$freqRegex = "#( : |, |)(Quarterly|Annual|Yearly|Monthly|Weekly|Daily)#i";

function ApiCrawl($catid, $api_row){ //initiates a EIA data file download and ingestion
    global $localBulkFolder, $db;
    ini_set("default_socket_timeout", 6000);

    //$bulkCategoryFilter = ["Petroleum","Natural Gas","State Energy Data System (SEDS)"];  //example of a filter to only monitor two files.  Names must match the bulk category name exactly (case sensitive).
    //$bulkCategoryFilter = ["State Energy Data System (SEDS)"];  //no filter = monitor all
    $bulkCategoryFilter = [];

    $status= [];
    $eiaBulkDownloadWebDirectory = "http://api.eia.gov/bulk/";  //"http://www.eia.gov/beta/api/bulkdownloads/";

//0. create initial job
    $insertInitialRun = "insert into apirunjobs (runid, jobjson, tries, status, startdt, enddt) values(".$api_row["runid"] .",'{\"startCrawl\":true}',1,'R', now(), now())";
    $result = runQuery($insertInitialRun);
    $jobid = $db->insert_id;

//1.  fetch the latest manifest from EIA
    $manifestFile = "manifest.txt";
    try{
        $manifestText = file_get_contents($eiaBulkDownloadWebDirectory.$manifestFile);
    } catch(Exception $ex){
        die("unable to fetch the API's bulk download manifest from ".$localBulkFolder.$manifestFile);
    }
    $newManifest = json_decode($manifestText, true);
    //var_dump($newManifest);
//2.  fetch the manifest from the last download.  It is important to save the EIA manifest after each successful update.  This allows subsequent bulk downloads to intelligently only fetch and process updated and new data, rather then all 2+ million series.
//creates an associative array if exists, else false if this is the initial run / no manifest has been saved
    if(file_exists($localBulkFolder.$manifestFile)){
        $oldManifestText = fread(fopen($localBulkFolder.$manifestFile, "r"),10000);
        $oldManifest = json_decode($oldManifestText, true);
    } else {
        $oldManifest = false;
    }
//3. loop through the current manifest and check against the saved manifest and the $bulkCategoryFilter
    foreach($newManifest["dataset"] as $datasetKey => $datasetInfo){
        $bulkCategoryName = $datasetInfo["name"];
        if(count($bulkCategoryFilter)==0 || array_search($bulkCategoryName, $bulkCategoryFilter)!==false){

            printNow("checking dataset ".$datasetKey."<br>");
            if(!$oldManifest || $datasetInfo["last_updated"]!=$oldManifest["dataset"][$datasetKey]["last_updated"] || !file_exists($localBulkFolder.$datasetKey.".txt")){  //only download and process the EIA bulk download file if it is newer than last ingestion
                //3a.  get bulk file and unzip it
                $eia_uri =  $datasetInfo["accessURL"];
                printNow("downloading to $eia_uri<br>");
                set_time_limit(300);  //downloading may take a couple of minutes
                //$fp = fopen($eiaBulkDownloadWebDirectory.$datasetKey."zip", 'r');
                /*CURL
                                $client = curl_init($eiaBulkDownloadWebDirectory.$datasetKey."zip");
                                curl_setopt($client, CURLOPT_RETURNTRANSFER, 1);  //fixed this line
                                $fileData = curl_exec($client);
                                file_put_contents($localBulkFolder.$datasetKey.".zip", $fileData);*/
                error_reporting(E_ALL);
                ini_set('display_errors', 'On');

                /*                $contents = file_get_contents($eiaBulkDownloadWebDirectory.$datasetKey."zip");
                                file_put_contents($localBulkFolder.$datasetKey.".zip", $contents);*/

                $feia = @fopen($eia_uri, 'r');
                $fzip = @fopen($localBulkFolder.$datasetKey.".zip", 'w');
                stream_copy_to_stream ($feia, $fzip);
                fclose($feia);
                fclose($fzip);


                set_time_limit(300);  //unzipping may take a minute or so
                $zip = new ZipArchive();
                if(file_exists($localBulkFolder.$datasetKey.".zip")) printNow("zip file exists<br>");
                $zip->open($localBulkFolder.$datasetKey.".zip");
                $zip->extractTo("./".$localBulkFolder);
                $zip->close();
                unlink($localBulkFolder.$datasetKey.".zip");  //delete the ZIP file after extracting its .txt files
                //rename($localBulkFolder."bulkFiles/".$datasetKey.".txt", $localBulkFolder.$datasetKey.".txt");
                //rmdir($localBulkFolder."bulkFiles");  //delete the ZIP file after extracting its .txt files

                printNow("extracted to ".$localBulkFolder.$datasetKey.".txt");

                if(file_exists($localBulkFolder.$datasetKey.".txt")){
                    print("creating job for ".$datasetKey."<br>");
                    flush();
                    ob_flush();
                    //queue the job after the file is downloaded and unzipped
                    $sql = "insert DELAYED into apirunjobs (runid, jobjson, tries, status) values(".$api_row["runid"] .",".safeStringSQL(json_encode($datasetInfo)).",0,'Q')";
                    runQuery($sql);
                }
            }
            runQuery("update apiruns set finishdt=now() where runid=".$api_row["runid"]);
            runQuery("update apirunjobs set enddt=now() where jobid=".$jobid);
        } else {
            printNow("skipping $bulkCategoryName<br>");
        }
    }
    runQuery("update apiruns set finishdt=now() where runid=".$api_row["runid"]);
    runQuery("update apirunjobs set enddt=now(), status='S' where jobid=".$jobid);
    file_put_contents($localBulkFolder.$manifestFile, $manifestText);
}

function ApiExecuteJob($api_run, $job_row){//runs all queued jobs in a single single api run until no more
    global $MAIL_HEADER, $db, $freqRegex;
    global $localBulkFolder, $minSetSize;
    $status = array("updated"=>0,"failed"=>0,"skipped"=>0, "added"=>0);
    $jobid = $job_row["jobid"];


    //reusable SQL
    $update_job = "update apirunjobs set enddt = now() where jobid=$jobid";
    $jobInfo = json_decode($job_row["jobjson"],true);
    $datasetKey = $jobInfo["data_set"];
    $bulkCategoryName = $jobInfo["name"];
    $fp = fopen($localBulkFolder.$datasetKey.".txt","r");
    set_time_limit(60);
    /*
     * need to run through the bulk file twice:
     *
     * first pass = detect sets loop:
     *       1. skip if forced set (elect and coal) else detect geoid and setname
     *       2. build series[skey] = [setName=>   , geoid=>  ]
     *       3. build sets[setname][units][f] = [skey]
     * second pass = detect geo and setname
     *      1. check to see if table already
     *          A. if source key exists in DB (setdata.skey):
     *              -> get setname, geoid, setid, settype (S|M|X)
     *              -> logEvent if detected geoid or detected setname differs from db AND set type is M
     *              -> logEvent if sets type is S but detected type is M
     *              -> update sets.metadata, setdata.periodicity, setdata.geoid, setdata.latlon, sets.latlon, setdata.data
     *          B. if source key not in DB (setdata.skey):
     *              -> create set as set if forceSet or count(sets[setname][units][f])>5) else create sets for each freqset (collapsing f, not geo)
     *              -> for elect and coal, set sets.setkey too
     *              -> insert setdata records
     *      2. for forced sets, insert/update sets record by setkey, then insert/update setdata records by sourcekey
     *
     * */
    $sets = [];
    if($datasetKey!="ELEC"||$datasetKey!="COAL"){
        while(!feof($fp)){
            $line = fgets ($fp);
            $oEIA = json_decode($line, true);  //each line of the file is a separate JSON encoded string

            if(isset($oEIA["series_id"])){
                //1. remove frequency from name
                $oEIA["name"] = preg_replace($freqRegex, "", $oEIA["name"]);
                //2. remove geo from name
                if(isset($oEIA["geography"]) && !isset($oEIA["latlon"])){
                    if(($datasetKey=="PET"||$datasetKey=="NG")&&strpos($oEIA["name"],"PADD")!==false) $oEIA["geography"] = "PADD:".$oEIA["geography"];
                    $geo = isoLookup($oEIA["geography"]);  //returns null is not found
                    if($geo!==null){
                        $oEIA["geoid"] = $geo["geoid"];
                        if(!isset($series["latlon"])){
                            $setName = preg_replace("#".$geo["regexes"]."#", "", $series["name"]);
                            $setName = preg_replace("#\s*:\s*:\s*#", " : ", $setName);
                            if(!isset($sets[$setName][$oEIA["f"]])) $sets[$setName] = $oEIA["f"];
                            foreach($sets[$setName][$oEIA["f"]] as $series_id => $geoid){
                                if($geo["geoid"]==$geoid) logEvent("EIA set dup", $geo["name"]." occurs twice in set: ".$setName);
                                $sets[$setName]["error"] = true;
                            }
                            $sets[$setName][$oEIA["f"]][$oEIA["series_id"]] = $geo["geoid"];
                        }
                    } else {
                        //skip city detection (gasoline prices = 10 cities
                    }
                }

            }
        }
    }
    //warn of irregular sets
    foreach($sets as $setName=>&$set){
        $setCount = 0;
        foreach($set as $f=>&$series){
            $thisCount = count($series);
            if($setCount!=0 && $setCount!=$thisCount){
                logEvent("EIA irregular set warning", $setName);
            } else {
                $setCount = $thisCount;
            }
        }
    }

    //4. second loop through the unzipped bulk file
    $seriesCount = 0;
    $categoryCount = 0;
    fseek($fp, 0); //reset the pointer to the start
    while(!feof($fp)){
        if(($seriesCount+$categoryCount)%1000 == 0) runQuery($update_job); //no need to update timestamp on disk every line!
        set_time_limit(10);
        $line = fgets ($fp);
        $oEIA = json_decode($line, true);  //each line of the file is a separate JSON encoded string
        //var_dump($oEIA);
        //some series of daily spot prices are > 150KB
        //objects are either series or categories.  The series are in the first half of the file.  The categories are in the second half.
        //Categories are in hierarchical order so that top level categories are earlier in the file than descendant categories.
        //This permits single pass ingestion and creation of series records followed by category records and category-series relationship records.
        if(isset($oEIA["series_id"])){
            //4a. process series
            $skip = false;
            //skip the individual movers; all prime-movers = plant total
            if(strPos($oEIA["series_id"],"ELEC.PLANT.")===0 && strpos($oEIA["name"], "All Primemovers")===false) $skip = true;
            //skip the individual mine to plant shipments:
            if(strPos($oEIA["series_id"],"COAL.SHIPMENT_")===0) $skip = true;

            if(!$skip){
                $oEIA["name"] = preg_replace($freqRegex, "", $oEIA["name"]); //remove frequency indicators from name
                $oEIA["settype"] = "S";  //default
                if(isset($oEIA["geography"])){
                    if(!isset($oEIA["latlon"])){
                        if(($datasetKey=="PET" || $datasetKey=="NG") && strpos($oEIA["name"],"PADD")!==false) $oEIA["geography"] = "PADD:".$oEIA["geography"];
                        $geo = isoLookup($oEIA["geography"]);  //returns null is not found
                        if($geo!==null){
                            $oEIA["geoid"] = $geo["geoid"];

                            $setName = preg_replace("#".$geo["regexes"]."#", "", $oEIA["name"]);
                            $setName = preg_replace("#\s*:\s*:\s*#", " : ", $setName);
                            if(isset($sets[$setName][$oEIA["f"]]) && !isset($sets[$setName]["error"])  && count($sets[$setName][$oEIA["f"]])>$minSetSize) {
                                $oEIA["setname"] = $setName;
                                $oEIA["settype"] = "M©S";
                            }
                            $sets[$setName][$oEIA["f"]][$oEIA["series_id"]] = $geo["geoid"];
                        }
                    } else {
                        $oEIA["settype"] = "X©S";
                        //power plants and coal mines are only two EIA sets


                    }
                }

                insertOrUpdateSeries($oEIA, $api_run["apiid"], $job_row["jobid"], $datasetKey, $status);
                if(round(++$seriesCount/1000)*1000==$seriesCount) printNow(date("H:i:s").": processed $seriesCount $datasetKey series");
            }
        }
        if(isset($oEIA["category_id"])){
            //4b. process category
            //use a break; here if your application does not need to save EIA's category hierarchy (note: all series JSON lines occur before any category JSON lines)
            insertOrUpdateCategory($oEIA, $api_run, $job_row);
            if(round(++$categoryCount/1000)*1000==$categoryCount) printNow(date("H:i:s").": processed $categoryCount $datasetKey categories");
        }
    }
    printNow(date("H:i:s").": processed $categoryCount $datasetKey categories");
    return $status;
}

function ApiRunFinished($api_run){
    set_time_limit(200);
    setMapsetCounts("all", $api_run["apiid"]);
    set_time_limit(200);
    setPointsetCounts("all", $api_run["apiid"]);
    set_time_limit(200);
    freqSets($api_run["apiid"]);
    set_time_limit(200);
    prune($api_run["apiid"]);
}

function insertOrUpdateSeries($series, $apiid, $jobid, $dataset, &$status){
    try{

        $propsToFields = [  //maps the properties to database fields in the series table
            "series_id" => "skey",
            "name" => "name",
            "units" => "units",
            "f" => "periodicity",
            "unitsshort" => "units_abbrev",
            "description" => "notes",
            "source" => "source",
            "lat" => "lat",
            "lon" => "lon",
            "last_updated" => "apidt",
            //the following props do not exist in the $series assoc object obtained from EIA: they must be added
            "apiid" => "apiid",
            "start" => "start",
            "end" => "end",
            "JSONdata" => "data",
            "namelen" => "namelen",
            "url" => "url",
            "geoid" => "geoid"
        ];
        $setName = $series["setname"];
        $nameSegments = explode(" : ", $series["name"]);
        if(strPos($series["series_id"],"ELEC.PLANT.")===0){ //single mover series already skipped
            $series["setname"] = "U.S. Power Plants : " . $nameSegments[2] . " : " . $nameSegments[0];
            $series["name"] = "U.S. Power Plants : " . $nameSegments[1] . " : " . $nameSegments[2] . " : " . $nameSegments[0];
        } elseif(strPos($series["series_id"],"COAL.MINE.")===0){ //individual mine to plant series already skipped
            $series["setname"] = "United States : " . $nameSegments[0] . " : " . $nameSegments[2]. " : " . $nameSegments[3];
            $series["name"] = "United States " . $series["name"];
        }

        //format & sort data
        foreach($series["data"] as $i => $point){
            $series["data"][$i] = $point[0].":".(is_numeric($point[1])?$point[1]:"null");
        }
        so
        //first and last dates

        //1. select setdata by series key
        $result = runQuery("select s.setid, sd.f, sd.geoid, sd.latlon, sd.aliasid from setdata sd join sets s on sd.setid=s.setid where sd.skey ='$series[series_id]'");
        if($setExists = ($result->num_rows==1)) {
            $set = $result->fetch_assoc();
            //2. if found and db setname matches: update set data
            if($set["name"]==$series["name"] && $set["units"]==$series["units"]){
                runQuery("update setdata set data= periodicity=$series[f], geoid=$series[geoid], latlon=$series[latlon] where setid=$set[setid] and skey=$series[series_id]");

            }

            //3. if found and db setname/units mismatch: delete setdata & logEvent + ...


        }

        //4. if setdata not found or mismatch: create/get set by name & units and create setdata

        //5.

        //set / update set
        //setname and map/pointsetid
        if(isset($series["lat"]) && strlen($series["lat"])!=0){
            //pointset
            $pointsetid = getPointSet($setName, $apiid, $series["f"], $series["units"]);
        } elseif($series["geoid"]) {
            //mapset
            $mapsetid = getMapSet($setName, $apiid, $series["f"], $series["units"]);
        }

        //note:  EIA and MD month date formats now align
        $mddata = [];
        for($i=0;$i<count($series["data"]);$i++){
            array_push($mddata, $series["data"][$i][0].':'.(is_numeric($series["data"][$i][1])?floatval($series["data"][$i][1]):"null"));
        }
        $mddata = sort($mddata);

        //create the start and end js time;
        $ed = $series["data"][count($series["data"])-1][0];
        $sd = $series["data"][0][0];

        switch($series["f"]){
            case "M":
                $start = new DateTime(substr($sd,0,4).'-'.substr($sd,4,2).'-01 UTC');
                $end = new DateTime(substr($ed,0,4).'-'.substr($ed,4,2).'-01 UTC');
                break;
            case "Q":
                $start = new DateTime(substr($sd,0,4).'-'. ((substr($sd,5,1)-1)*3+1) .'-01 UTC');
                $end = new DateTime(substr($ed,0,4).'-'.((substr($ed,5,1)-1)*3+1) .'-01 UTC');
                break;
            case "A":
                $start = new DateTime($sd.'-01-01 UTC');
                $end = new DateTime($ed.'-01-01 UTC');
                break;
            case "4":
                $series["f"] = "W";
            case "W":
            case "D":
                $start = new DateTime($sd.' UTC');
                $end = new DateTime($ed.' UTC');
                break;
            default:
                printNow("Error: unrecognized frequency ".$series["f"]);
                var_dump($series);
                die();
        }


        //set the props missing from EIA
        $series["start100k"] = date_timestamp_get($start) / 100; //js
        $series["end100k"] = date_timestamp_get($end) / 100;
        $series["apiid"] = $apiid;
        //$series["JSONdata"] = json_encode($series["data"]);
        $series["namelen"] = strlen($series["name"]);
        switch($dataset){
            case "ELECT":
                $series["url"] = "http://www.eia.gov/electricity/data/browser";
                break;
            case "PET":
                $series["url"] = "http://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?n=PET&s=".substr($series["series_id"],4,count($series["series_id"])-6)."&f=".substr($series["series_id"],-1,1);
                break;
            case "NG":
                $series["url"] = "http://www.eia.gov/dnav/ng/hist/".strtolower(substr($series["series_id"],3,count($series["series_id"])-4).substr($series["series_id"],-1,1)).".htm";
                break;
            case "SEDS":
                $series["url"] = "http://www.eia.gov/state/seds/seds-data-complete.cfm";
                break;
            case "TOTAL":
                $series["url"] = "http://www.eia.gov/totalenergy/data/browser/";
                break;
            case "STEO":
                $series["url"] = "http://www.eia.gov/STEO";
                break;
            case "AEO":
                $series["url"] = "http://www.eia.gov/AEO";
                break;
            default:
                $series["url"] = "http://www.eia.gov";
        }
        /*
            //create and execute the update statement
            $fields = array();
            $values = array();
            $updates = array();
            foreach($propsToFields as $prop => $field){
                array_push($fields, $field);
                array_push($values, safeSQL($series[$prop]));
                array_push($updates, $prop . "=". safeSQL($series[$prop]));
            }
            $sql = "insert into series (". implode(",", $fields) . ") values (". implode(",", $values) .") "
                . " on duplicate key update " . implode(", ", $updates);
            runQuery($sql);
            */
        //updateSeries(&$status, $key, $name, $src, $url, $period, $units, $units_abbrev, $notes, $title, $apiid, $apidt, $firstdt, $lastdt, $data, $geoid, $mapsetid, $pointsetid, $lat, $lon)
        updateSeries($status,
            $jobid,
            $series["series_id"],
            $series["name"],
            "U.S. Energy Information Administration",
            $series["url"],
            $series["f"], // $period,
            $series["units"], // $units,
            isset($series["unitsshort"])?$series["unitsshort"]:null, // $units_abbrev,
            isset($series["description"])?$series["description"]:null, //$notes,
            null, //$title,
            $apiid,  //$apiid,
            $series["last_updated"],  // $apidt,
            $series["start"], //  $firstdt,
            $series["end"],   //$lastdt,
            implode("|", $mddata),  //  $data,
            $series["geoid"],  //  $geoid,
            $mapsetid,
            $pointsetid,
            isset($series["lat"])?$series["lat"]:null, //lat
            isset($series["lon"])?$series["lon"]:null  //lon
        );
    } catch(Exception $ex){
        $status["failed"]++;
        logEvent("error","processing ".$series["series_id"]);
        printNow("error processing ".$series["series_id"]);
    }
}

function insertOrUpdateCategory($cat, $apirow, $job){
    //get the local catid of the cat; inserting a new category record as needed
    $catid = setCategoryById($apirow["apiid"], $cat["category_id"], $cat["name"], $cat["parent_category_id"]);
    //loop through children series and add them
    for($i=0;$i<count($cat["childseries"]);$i++){
        $series_id = $cat["childseries"][$i];
        $result = runQuery("select seriesid from series where apiid=".$apirow["apiid"]." and skey=".safeStringSQL($series_id));
        if($result->num_rows==1){
            $row = $result->fetch_assoc();
            $sid = $row["seriesid"];
            runQuery("insert ignore into categoryseries value($catid, $sid)");
        } elseif(
            $series_id!="TOTAL..A"
            && $series_id != "TOTAL..M"
            && !(strPos($series_id,"ELEC.PLANT.")===0 && strPos($series_id,"-ALL.")!==false)
            && !(strPos($series_id,"COAL.SHIPMENT_")===0)
        ) {
            printNow("unable to find series for skey=". $series_id);
            logEvent("error", "unable to find series for EIA skey=". $series_id);
        }
    }
}


class series{
    private $connection;
    public $debug = false;
    public $data = false;
    public $escapedData = false;
    private $propsToFields = array(  //maps the properties to database fields in the series table
        "series_id" => "skey",
        "name" => "name",
        "units" => "units",
        "f" => "periodicity",
        "unitsshort" => "units_abbrev",
        "description" => "notes",
        "copyright" => "copyright",
        "source" => "source",
        "geography" => "geography",
        "lat" => "",
        "lon" => "",
        "start" => "",
        "end" => "",
        "last_updated" => "apidt",

        "data" => "data"
    );


    public function series($series_properties = false, $cn = false){
        if($cn) $this->connection = $cn;
        foreach($this->propsToFields as $prop => $field){ //initialize properties to NULL
            $this[$prop] = null;
        }
        if($series_properties) { //set pass in valued
            foreach($series_properties as $prop => $value){
                $this[$prop] = $value;
            }
            $this->data = $series_properties;
        }
    }
    public function load($series_id, $cn = false){
        if($cn) $this->connection = $cn;
        $fields = array();
        foreach($this->propsToFields as $prop => $field){
            array_push($fields, $field . " as \"$prop\" ");
        }
        $sql = "select ". implode(",", $fields) . " from series where skey = '$series_id'";
        $result = $this->query($sql);
        if($result->num_rows==1){
            $row = $result->fetch_assoc();
            foreach($row as $prop => $val){
                if($prop=="data"){
                    $this[$prop] = json_decode($val, true);
                } else {
                    $this[$prop] = $val;
                }
            }
        } else {
            throw(new Exception("unable to find series for id = ".$series_id));
        }
    }

    public function save($cn = false){
        $fields = array();
        $values = array();
        $updates = array();
        if($cn) $this->connection = $cn;
        foreach($this->propsToFields as $prop => $field){
            array_push($fields, $field . " as \"$prop\" ");
            array_push($values, "'". str_replace("'", "''", $this[$prop]) . "'");
            array_push($updates, $prop . "='". str_replace("'", "''", $this[$prop]) . "'");

        }
        $sql = "insert into series (". implode(",", $fields) . ") values (". implode(",", $values) .") "
            . " on duplicate key update " . implode(", ", $updates);
        $this->query($sql);
    }

    private function query($sql){
        if(!$this->connection) throw(new Exception("database connection not supplied"));
        return $this->connection->query($sql);
    }
}

