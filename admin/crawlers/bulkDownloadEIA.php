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
    $apiid = $api_run["apiid"];


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
     *       2. build sets[setname][units][f] = [skey]
     * second pass = detect geo and setname
     *      1. check to see if table already
     *          A. if source key exists in DB (setdata.skey):
     *              -> get setname, geoid, setid, settype (S|M|X)
     *              -> logEvent if detected geoid or detected setname differs from db AND set type is M
     *              -> logEvent if sets type is S but detected type is M
     *              -> update sets.metadata, setdata.freq, setdata.geoid, setdata.latlon, sets.latlon, setdata.data
     *          B. if source key not in DB (setdata.skey):
     *              -> create set as set if forceSet or count(sets[setname][units][f])>5) else create sets for each freqset (collapsing f, not geo)
     *              -> for elect and coal, set sets.setkey too
     *              -> insert setdata records
     *      2. for forced sets, insert/update sets record by setkey, then insert/update setdata records by sourcekey
     *
     * */
    $sets = [];
    while(!feof($fp)){
        $line = fgets ($fp);
        $oEIA = json_decode($line, true);  //each line of the file is a separate JSON encoded string
        if(isset($oEIA["latlon"]) && is_array($oEIA["latlon"])) $oEIA["latlon"] = implode(",",$oEIA["latlon"]);
        if(isset($oEIA["series_id"])){
            //1. remove frequency from name
            $oEIA["name"] = preg_replace($freqRegex, "", $oEIA["name"]);
            //2. remove geo from name
            if(isset($oEIA["geography"]) && !isset($oEIA["latlon"])){
                if(($datasetKey=="PET"||$datasetKey=="NG")&&strpos($oEIA["name"],"PADD")!==false) $oEIA["geography"] = "PADD:".$oEIA["geography"];
                $geo = isoLookup($oEIA["geography"]);  //returns null is not found
                if($geo!==null){
                    $oEIA["geoid"] = $geo["geoid"];
                    if(!isset($oEIA["latlon"])){
                        $setName = preg_replace("#".$geo["regexes"]."#", "", $oEIA["name"]);
                        $setName = preg_replace("#\s*:\s*:\s*#", " : ", $setName);
                        $setNameUnits = $setName."|".$oEIA["units"];
                        if(!isset($sets[$setNameUnits][$oEIA["f"]])) $sets[$setNameUnits][$oEIA["f"]] = [];
                        foreach($sets[$setNameUnits][$oEIA["f"]] as $series_id => $geoid){
                            if($geo["geoid"]==$geoid) logEvent("EIA set dup", "$series_id $geo[name] in set $setNameUnits. New line: $line");
                            //too common at EIA!:  $sets[$setNameUnits]["error"] = true;
                        }
                        $sets[$setNameUnits][$oEIA["f"]][$oEIA["series_id"]] = $geo["geoid"];
                    }
                } else {
                    //skip city detection (gasoline prices = 10 cities)
                }
            }

        }
    }

    //warn of irregular sets w.r.t. subsets of different frequencies
    foreach($sets as $setNameUnits=>&$set){
        $setCount = 0;
        foreach($set as $f=>&$series){
            $thisCount = count($series);
            if($setCount!=0 && $setCount!=$thisCount){
                logEvent("EIA irregular set warning", $setNameUnits);
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
        if(isset($oEIA["latlon"]) && is_array($oEIA["latlon"])) $oEIA["latlon"] = implode(",",$oEIA["latlon"]);
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
                if(isset($oEIA["geography2"]) && isset($oEIA["latlon"]) && $oEIA["latlon"]) $oEIA["geography"] = $oEIA["geography2"];
                foreach($oEIA["data"] as $i=>$point){
                    $oEIA["data"][$i] = $point[0].":".(is_numeric($point[1])?$point[1]:"null");
                }
                $oEIA["name"] = preg_replace($freqRegex, "", $oEIA["name"]); //remove frequency indicators from name
                $oEIA["settype"] = "S";  //default
                $oEIA["apiid"] = $apiid;  //default
                $oEIA["namelen"] = strlen($oEIA["name"]);
                $oEIA["geoid"] = 0;
                $oEIA["source"] = null;


                switch($datasetKey){
                    case "ELECT":
                        $oEIA["url"] = "http://www.eia.gov/electricity/data/browser";
                        break;
                    case "PET":
                        $oEIA["url"] = "http://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?n=PET&s=".substr($oEIA["series_id"],4,count($oEIA["series_id"])-6)."&f=".substr($oEIA["series_id"],-1,1);
                        break;
                    case "NG":
                        $oEIA["url"] = "http://www.eia.gov/dnav/ng/hist/".strtolower(substr($oEIA["series_id"],3,count($oEIA["series_id"])-4).substr($oEIA["series_id"],-1,1)).".htm";
                        break;
                    case "SEDS":
                        $oEIA["url"] = "http://www.eia.gov/state/seds/seds-data-complete.cfm";
                        break;
                    case "TOTAL":
                        $oEIA["url"] = "http://www.eia.gov/totalenergy/data/browser/";
                        break;
                    case "STEO":
                        $oEIA["url"] = "http://www.eia.gov/STEO";
                        break;
                    case "AEO":
                        $oEIA["url"] = "http://www.eia.gov/AEO";
                        break;
                    default:
                        $oEIA["url"] = "http://www.eia.gov";
                }
                if(!isset($oEIA["geoid"])) $oEIA["geoid"]=0;
                if(!isset($oEIA["latlon"])) $oEIA["latlon"]="";
                if(isset($oEIA["geography"])){
                    if(($datasetKey=="PET" || $datasetKey=="NG") && strpos($oEIA["name"],"PADD")!==false) $oEIA["geography"] = "PADD:".$oEIA["geography"];

                    $geo = isoLookup($oEIA["geography"]);  //returns null is not found
                    if($geo) {
                        $oEIA["geoid"] = $geo["geoid"];
                        if($oEIA["latlon"] == ""){
                            $setName = preg_replace("#".$geo["regexes"]."#", "", $oEIA["name"]);
                            $setName = preg_replace("#\s*:\s*:\s*#", " : ", $setName);
                            $setNameUnits = $setName ."|".$oEIA["units"];
                            if(isset($sets[$setNameUnits][$oEIA["f"]])){
                                if(!isset($sets[$setNameUnits]["error"])){
                                    if(count($sets[$setNameUnits][$oEIA["f"]])>$minSetSize) {
                                        //save as mapset set
                                        $oEIA["setname"] = $setName;
                                        $oEIA["settype"] = "M";
                                        if(!isset($sets[$setNameUnits]["setid"])){
                                            $sets[$setNameUnits]["setid"] = saveEIASet($status, $oEIA);
                                        }
                                        $oEIA["setid"] = $sets[$setNameUnits]["setid"];
                                        saveEIASetData($status, $oEIA);
                                    } else {
                                        //save as a single series set
                                        $oEIA["geoid"] = 0; //ignore geography as it is often off + leads to strange search results
                                        $oEIA["setid"] = saveEIASet($status, $oEIA);
                                        saveEIASetData($status, $oEIA);
                                    }
                                }
                            } else {
                                preprint($sets[$setNameUnits]);
                                preprint($oEIA);
                                printNow("$setNameUnits $oEIA[f] not found!!");
                                die();
                            }
                        } else {
                            $nameSegments = explode(" : ", $oEIA["name"]);
                            //power plants and coal mines are only two EIA sets
                            if(strPos($oEIA["series_id"],"ELEC.PLANT.")===0){ //individual prime mover series already skipped
                                $oEIA["settype"] = "X";
                                $oEIA["setname"] = "U.S. Power Plants : " . $nameSegments[2] . " : " . $nameSegments[0];
                                $oEIA["name"] = "U.S. Power Plants : " . $nameSegments[1] . " : " . $nameSegments[2] . " : " . $nameSegments[0];
                            } elseif(strPos($oEIA["series_id"],"COAL.MINE.")===0){ //individual mine to plant series already skipped
                                $oEIA["settype"] = "X";
                                $oEIA["setname"] = "United States : " . $nameSegments[0] . " : " . $nameSegments[2]. " : " . $nameSegments[3];
                                $oEIA["name"] = "United States " . $oEIA["name"];
                            }
                            if($oEIA["settype"] == "X"){
                                $setNameUnits = $oEIA["setname"] ."|".$oEIA["units"];
                                if(!isset($sets[$setNameUnits])){
                                    $sets[$setNameUnits] = saveEIASet($status, $oEIA); //with setname, create the master set
                                    //$sets[$setNameUnits] = saveSet($apiid, null, $oEIA["setname"], $oEIA["units"], $oEIA["source"], $oEIA["url"], $oEIA["description"]); //settype (M|X|S) set in post processing
                                }
                                $oEIA["mastersetid"] = $sets[$setNameUnits];
                                $oEIA["setid"] = saveEIASet($status, $oEIA);  //with a mastersetid, create the point series set

                                //$oEIA["setid"] = saveSet($apiid,null, $oEIA["setname"], $oEIA["units"], $oEIA["source"], $oEIA["url"], $oEIA["description"], $oEIA["last_updated"], null, $oEIA["latlon"]);
                                saveEIASetData($status, $oEIA);
                                //saveSetData($status, $oEIA["setid"], $oEIA["series_id"], $oEIA["f"], $oEIA["geoid"],$oEIA["latlon"], $oEIA["geoid"], )
                            } else {
                                logEvent("EIA ingest warning","unknown point set series_id ".$oEIA["series_id"]);
                            }
                        }
                    }
                }
                if($oEIA["geoid"] == 0){
                    //needs it own insert
                    $oEIA["setid"] = saveEIASet($status, $oEIA);
                    saveEIASetData($status, $oEIA);
                }

                //insertOrUpdateSeries($oEIA, $api_run["apiid"], $job_row["jobid"], $datasetKey, $status);
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
    prune($api_run["apiid"]);
}

function saveEIASet(&$status, &$oEIA){
    if(!isset($oEIA["lastHistoricalPeriod"])) $oEIA["lastHistoricalPeriod"] = null;
    if(isset($oEIA["mastersetid"])){
        //if the mastersetid has been set, it is time to creates the series's set
        return saveSet($oEIA["apiid"], null, $oEIA["name"], $oEIA["units"], $oEIA["source"], $oEIA["url"], $oEIA["description"], $oEIA["last_updated"], 'null', $oEIA["latlon"], $oEIA["lastHistoricalPeriod"] , $oEIA["mastersetid"], $oEIA["settype"] );
    } else {
        return saveSet($oEIA["apiid"], null, isset($oEIA["setname"])?$oEIA["setname"]:$oEIA["name"], $oEIA["units"], $oEIA["source"], $oEIA["url"], $oEIA["description"], $oEIA["last_updated"], 'null', $oEIA["latlon"], null, null, $oEIA["settype"]);
    }
}

function saveEIASetData(&$status, &$oEIA){
    saveSetData($status, isset($oEIA["mastersetid"])?$oEIA["mastersetid"]:$oEIA["setid"], $oEIA["apiid"], $oEIA["series_id"], $oEIA["f"], $oEIA["geoid"], $oEIA["latlon"], $oEIA["data"]);
}

function insertOrUpdateCategory($cat, $apirow, $job){
    //get the local catid of the cat; inserting a new category record as needed
    $catid = setCategoryById($apirow["apiid"], $cat["category_id"], $cat["name"], $cat["parent_category_id"]);
    //loop through children series and add them
    for($i=0;$i<count($cat["childseries"]);$i++){
        $series_id = $cat["childseries"][$i];
        $result = runQuery("select coalesce(s.mastersetid, sd.setid) as setid, sd.freq, sd.geoid from setdata sd join sets s on sd.setid=s.setid where apiid=$apirow[apiid] and sd.skey=".safeStringSQL($series_id));
        if($result->num_rows==1){
            $row = $result->fetch_assoc();
            $catset = runQuery("select * from categorysets where catid=$catid and setid=$row[setid] and geoid=0");
            if($catset->num_rows==0){
                runQuery("insert ignore into categorysets value($catid, $row[setid], $row[geoid])");
            }
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


