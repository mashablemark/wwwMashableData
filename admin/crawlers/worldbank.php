<?php
$event_logging = true;
$sql_logging = false;
$downloadFiles = true;  //SET THIS TRUE TO GET THE LATEST WB; ELSE WILL ONLY DOWN IF FILE DOES NOT EXIST LOCALLY


function ApiCrawl($catid, $api_row){ //initiates a FAO crawl
    global $downloadFiles;
    global $db;

    $catalogURL = "http://api.worldbank.org/v2/datacatalog?format=json&per_page=250";
    $catalogRaw = json_decode(file_get_contents($catalogURL), true)["datacatalog"];
    $catalog = [];

    $datasets = [
        "WDI"=>[  //data file headers always Country_Name_attr,Country__attrCode,Indicator_Name,Indicator_Code, years
            "filePrefix"=>"WDI",
            "CountrySeriesSuffix"=>"_CS_Notes",
            "setKey"=>"Series Code",
            "name"=>"Indicator Name",
            "metaData"=>["Short definition","Long definition","Source","Other notes","Derivation method","Aggregation method","Limitations and exceptions","Notes from original source","General comments","Statistical concept and methodology"],
            "subcategories"=>"Topic",
        ],
        "ADI"=>[
            "filePrefix" => "ADI",
            "CountrySeriesSuffix" => false,
            "setKey" => "SeriesCode",
            "name" => "Indicator Name",
            "metaData" => ["Short definition","Long definition","Source","Limitations and exceptions","General comments"],
            "subcategories" => "Topic",
        ],
        "EdStats"=>[
            "filePrefix"=>"EdStats",
            "CountrySeriesSuffix"=>"_Country-Series",
            "setKey"=>"Series Code",
            "name"=>"Indicator Name",  //if split(":").length>1, first part = category
            "metaData"=>["Short definition","Long definition","Source","Limitations and exceptions","General comments"],
            "subcategories"=>"Topic", //blank for over a thousand series
            //"periodicity"=>"Periodicity",  blank for edstats, but data is annual + projected to 2050
        ],
        "GenderStats"=>[
            "filePrefix"=>"Gender",
            "CountrySeriesSuffix"=>"_Country-Series",
            "setKey"=>"Series Code",
            "name"=>"Indicator Name",
            "metaData"=>["Short definition","Long definition","Source","Derivation method","Aggregation method","Limitations and exceptions","Notes from original source","General comments"],
            "subcategories"=>"Topic",
        ],
        "IDS"=>[
            "filePrefix"=>"IDS",
            "CountrySeriesSuffix"=>"_Country-Series",
            "setKey"=>"SeriesCode",
            "name"=>"Indicator Name",
            "metaData"=>["Short definition","Long definition","Source","General comments"],
            "subcategories"=>"Topic",
        ],
        "Health Stats"=>[
            "filePrefix"=>"HPN",
            "CountrySeriesSuffix"=>"_Country-Series",
            "setKey"=>"SeriesCode",
            "name"=>"Indicator Name",
            "metaData"=>["Short definition","Long definition","Source","Notes from original source","Limitations and exceptions","General comments"],
            "subcategories"=>"Topic",
        ]
    ];
    $acronyms = array_keys($datasets);
    for($i=0;$i<count($catalogRaw);$i++){
        $newDataSet = [];
        for($j=0;$j<count($catalogRaw[$i]["metatype"]);$j++){
            //var_dump($catalogRaw[$i]["metatype"][$j]["id"]);
            $newDataSet[(string) $catalogRaw[$i]["metatype"][$j]["id"]] = $catalogRaw[$i]["metatype"][$j]["value"];
        }
        if(isset($newDataSet["acronym"])){
            $acronym = $newDataSet["acronym"];
            if(in_array($acronym, $acronyms)){
                $datasets[$acronym]["acronym"] = $acronym;
                $datasets[$acronym]["datasetName"] = $newDataSet["name"];
                $datasets[$acronym]["url"] = $newDataSet["url"];
                $datasets[$acronym]["periodicity"] = substr($newDataSet["periodicity"], 0, 1);
                preg_match("#http:\S+csv\.zip#i",  $newDataSet["bulkdownload"], $matches);
                $datasets[$acronym]["bulkdownload"] = $matches[0];
                $datasets[$acronym]["category"] = $newDataSet["name"];
                $datasets[$acronym]["themeMetadata"] = $newDataSet["description"];
            }
        }
    }

    //first build the base categories:
    $insertInitialRun = "insert into apirunjobs (runid, jobjson, tries, status, startdt) values(".$api_row["runid"] .",'{\"startCrawl\":true}',1,'R', now())";
    $result = runQuery($insertInitialRun);
    $jobid = $db->insert_id;

    foreach($datasets as $acronym=>$dataset){

        set_time_limit(300);

        //$branchInfo["catid"] = $catid;
        //$branchInfo["name"] = $branchName;


        $url = $dataset["bulkdownload"];
        $parts = explode("/", $url);
        $fileName =  $parts[count($parts)-1];
        if($downloadFiles || !file_exists("bulkfiles/wb/".$acronym."_Series.csv") || !file_exists("bulkfiles/wb/".$acronym."_Data.csv")){
            printNow("downloading ".$url." to bulkfiles/wb/".$acronym.".zip<br>");
            $fr = fopen($url, 'r');
            file_put_contents("bulkfiles/wb/".$acronym.".zip", $fr);
            fclose($fr);
            print('unzipping '.$acronym.'.zip<br>');
            $zip = new ZipArchive;
            $zip->open("bulkfiles/wb/".$acronym.".zip");
            $zip->extractTo('./bulkfiles/wb/');
            $zip->close();
            unlink("bulkfiles/wb/".$acronym.".zip");  //delete the zip file
            print('downloaded '.$acronym.'.zip<br>');
        }
        if(file_exists("bulkfiles/wb/".$acronym."_Data.csv")){
            $jobJSON = json_encode($dataset);
            printNow("creating job for ".$acronym.": ".$jobJSON."<br>");
            //queue the job after the file is downloaded and unzipped
            $sql = "insert into apirunjobs (runid, jobjson, tries, status) values(".$api_row["runid"] .",".safeStringSQL($jobJSON).",0,'Q')";
            runQuery($sql);
        }
        runQuery("update apiruns set finishdt=now() where runid=".$api_row["runid"]);
        runQuery("update apirunjobs set enddt=now() where jobid=".$jobid);
    }
    runQuery("update apirunjobs set status='S' where jobid=".$jobid);
}

//2. write execute jobs to
//  (c) create dataset root cat


function ApiExecuteJob($api_run_row, $job_row){//runs all queued jobs in a single single api run until no more
    $apidt = date("Y-m-d");
    global $MAIL_HEADER, $db;
    $jobid = $job_row["jobid"];
    $runid = $api_run_row["runid"];
    $apiid = $api_run_row["apiid"];
    $src = $api_run_row["name"];
    $DataFile_CountryCodeColumn=1;  //column B
    $DataFile_SeriesCodeColumn=3;  //column D
    $DataFile_DataColumn=4;  //column E

    $CountrySeriesFile_CountryCodeColumn=0;  //column A
    $CountrySeriesFile_SetCodeColumn=1;  //column B
    $CountrySeriesFile_SetDataMetaData=2;  //column C


//  (a) create dataset root_cat
    $ROOT_WB_CATID = $api_run_row["rootcatid"];
    $datasetInfo = json_decode($job_row['jobjson'], true);
    $acronym = $datasetInfo["acronym"];
    $datasetRootCatId = setCategoryById($api_run_row['apiid'], $acronym, $datasetInfo["category"], $ROOT_WB_CATID);


//  (b) create theme
    $themeId = getTheme($apiid, $datasetInfo["datasetName"], $datasetInfo["themeMetadata"], $acronym);

    //reusable SQL statements
    $updateRunSql = "update apiruns set finishdt=now() where runid=".$runid;
    $updateJobSql = "update apirunjobs set status = 'R', enddt=now() where jobid=$jobid";

    //UPDATE THE RUN'S FINISH DATE
    runQuery($updateRunSql);

//  (c) loop through series and create sets, cats, and catsets

    //$result is a pointer to the job to run
    set_time_limit(60);

    $setName = $datasetInfo['name'];
    $sets = []; //used to store set headers in memory until data file ingested to solve LCU series problem
    print("STARTING WB : $setName (job $jobid)<br>\r\n");

    $csv=fopen("bulkfiles/wb/".$datasetInfo["filePrefix"]."_Series.csv","r");
    $columns = fgetcsv($csv);  //header line
    $initial = true;
    while(!feof($csv)){
        $values = fgetcsv($csv);
        if(count($values)>5){  //don't try to injest blank line(s) at bottom of file
            $catId = $datasetRootCatId;
            $subCats =    explode(":", $values[array_search($datasetInfo["subcategories"], $columns)]);
            foreach($subCats as $cat){
                if(strlen(trim($cat))>0){
                    $catId = setCategoryByName($apiid, $cat, $catId);
                }
            }
            $setKey = $acronym.":".$values[0];
            $setName = $values[array_search($datasetInfo["name"], $columns)];
            $metaColumns = $datasetInfo["metaData"];
            $setMeta = "";
            foreach($metaColumns as $metaColumn){
                $meta = $values[array_search($metaColumn, $columns)];
                if(strlen(trim($meta))>0 && strpos($setMeta, trim($meta))===false) $setMeta .= " ".$meta;
            }
            $setMeta = trim($setMeta);
            if(preg_match_all("#\([^\)]+\)#", $setName, $matches)>0){
                $setUnits = $matches[1][count($matches[1]-1)];  //last match, exclusive of parentheses
                $setName = str_replace($matches[0][count($matches[0]-1)], "", $setName);
                //remove sources conflated with units and cleanup
                $setUnits = str_replace("FAO, ","", $setUnits);
                $setUnits = str_replace("metric tons","metric tonnes", $setUnits);

            } else {
                $setUnits = "";
            }
            if(strpos($setUnits, "LCU")===false){
                $setId = updateSetMetadata($apiid, $setKey, $setName, $setUnits, $src, $datasetInfo["url"], $setMeta, $apidt);
                $sets[$setKey] = ["setid"=>$setId];
                setCatSet($catId, $setId);
                $sets[$setKey] = [
                    "setid"=>$setId
                ];
            } else {
                $sets[$setKey] = [
                    "name"=>$setName,
                    "units"=>$setUnits,
                    "src"=>$src,
                    "meta"=>$setMeta,
                    "catid"=>$catId
                ];
            }
        }
    }
    fclose($csv);

//  (e) loop through series data and create / update setdata records

    print("INGEST WB DATA : $setName (job $jobid)<br>\r\n");
    $status = array("updated"=>0,"failed"=>0,"skipped"=>0, "added"=>0);
    $csv = fopen("bulkfiles/wb/".$datasetInfo["filePrefix"]."_Data.csv","r");
    $columns = fgetcsv($csv);  //header line
    while(!feof($csv)){
        $values = fgetcsv($csv);
        $countyCode = $values[$DataFile_CountryCodeColumn];
        $setKey = $acronym . ":" . $values[$DataFile_SeriesCodeColumn];
        $data = [];
        for($c=$DataFile_DataColumn;$c<count($values);$c++){
            if($values[$c]){
                $data[] = $columns[$c].":".$values[$c];
            }
        }
        if(count($data)>0){
            $geo = isoLookup($countyCode);
            $geoId = $geo["geoid"];
            if(isset($sets[$setKey]["setid"])){
                $setId = $sets[$setKey]["setid"];
            } else {
                //LCU
                $lcuSetKey = $setKey . ":" . $geo["currency"];
                if(isset($sets[$lcuSetKey])){
                    $setId = $sets[$lcuSetKey]["setid"];
                } else {
                    $lcuSetUnits = str_replace("LCU", $geo["currency"], $sets[$setKey]["units"]);
                    $setId = updateSet($apiid, $lcuSetKey, $setName, $lcuSetUnits, $src, $datasetInfo["url"], $sets[$setKey]["meta"], $apidt);
                    setCatSet($sets[$setKey]["catid"], $setId);
                    $sets[$lcuSetKey]["setid"] = $setId;
                }
            }
            saveSetData($status, $setId, $datasetInfo["periodicity"], $geoId, "", $data);
        }
    }
    fclose($csv);
//  (f) if exists, loop through country-series and update setdata.metadata

    if($datasetInfo["CountrySeriesSuffix"] && file_exists("bulkfiles/wb/".$acronym.$datasetInfo["CountrySeriesSuffix"])){
        $countrySeries_csv = fopen("bulkfiles/wb/".$acronym.$datasetInfo["CountrySeriesSuffix"].".csv","r");
        $columns = fgetcsv($countrySeries_csv);  //header line
        while(!feof($countrySeries_csv)){
            $values = fgetcsv($countrySeries_csv);
            $CountrySeriesFile_CountryCodeColumn=0;  //column A
            $CountrySeriesFile_SetCodeColumn=1;  //column B
            $CountrySeriesFile_SetDataMetaData=2;  //column C
            $setKey = $acronym . ":" . $values[$CountrySeriesFile_SetCodeColumn];
            $countyCode = $values[            $CountrySeriesFile_CountryCodeColumn];
            $geo = isoLookup($countyCode);
            $geoId = $geo["geoid"];
            if(isset($set[$setKey]["setid"])){
                saveSetdataMetadata($set[$setKey]["setid"], $datasetInfo["periodicity"], $geoId, "", $values[$CountrySeriesFile_SetDataMetaData]);
            } elseif(isset($set[$setKey.":".$geo["currency"]]["setid"])){
                saveSetdataMetadata($set[$setKey]["setid"], $datasetInfo["periodicity"], $geoId, "", $values[$CountrySeriesFile_SetDataMetaData]);
            }
        }
        fclose($countrySeries_csv);
    }


    $updatedJobJson = json_encode(array_merge($datasetInfo, $status));
    runQuery( "update apirunjobs set status = 'S', jobjson=".safeStringSQL($updatedJobJson). ", enddt=now() where jobid=$jobid");
    runQuery($updateRunSql);
    runQuery( "update apiruns set scanned=scanned+".$status["skipped"]."+".$status["added"]."+".$status["failed"]."+".$status["updated"]
        .", added=added+".$status["added"]
        .", updated=updated+".$status["updated"]
        .", failed=failed+".$status["failed"]
        ." where runid=$runid");

    print("ENDING WB $setName: ".$datasetInfo["file"]." (job $jobid)<br>\r\n");
    return $status;
}

function ApiRunFinished($api_run){
    set_time_limit(200);
    setGhandlesPeriodicities($api_run["apiid"]);
    set_time_limit(200);
    setMapsetCounts("all", $api_run["apiid"]);
    freqSets($api_run["apiid"]);
/*    set_time_limit(200);
    pruneSets($api_run["apiid"]);*/
}


//TODO: MOVE TO INDEX and add © to search on ghandles and mhandles
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

function setGhandlesPeriodicities($apiid = "all"){
    runQuery("SET SESSION group_concat_max_len = 50000;","setGhandlesPeriodicities");
    runQuery("truncate temp;","setGhandles");
    $sql = "insert into temp (id1, text1, text2) select mapsetid, group_concat(concat('G©',geoid)), group_concat(distinct concat('F©', sd.periodicity))
    from setdata sd inner join sets s
    where ". ($apiid == "all"?"":" apiid=$apiid and "). //set the Periodicities for single series too, so don't " sd.geoid <> 0
        "group by s.setid;";
    runQuery($sql, "setGhandlesPeriodicities");
    runQuery("update sets s join temp t on s.setid=t.id1 set s.ghandles = t.text1, s.periodicities = t.text2;", "setGhandlesPeriodicities");
}

function setMapsetCounts($setid="all", $apiid = "all"){
    //1.  update set.maps of all mapsets
    runQuery("truncate temp;","setMapsetCounts");
    runQuery("SET SESSION group_concat_max_len = 8000;");
    $subQuery = "select setid, concat('\"M_',mg.map, '\":',count(distinct s.geoid)) as mapcount FROM setdata sd join mapgeographies mg on sd.geoid=mg.geoid ";
    if($apiid != "all") {
        $subQuery .= " inner join sets s on s.setid=sd.setid and s.geoid=sd.geoid where 1 ";
        if($apiid != "all") $subQuery .= " and apiid=".$apiid;
    } else {
        $subQuery .= " where sd.latlon='' ";
    }
    if($setid != "all") $subQuery .= " and setid=".$setid;
    $subQuery .= " and map <>'worldx' group by setid, map";


    runQuery("insert into temp (id1, text1) select setid, group_concat(mapcount) from ($subQuery) mc group by setid;","setMapsetCounts");
    runQuery("update sets s join temp t on s.setid=t.id1 set s.counts=t.text1;","setMapsetCounts");
    runQuery("truncate temp;","setMapsetCounts");

}

function setPointsetCounts($setid="all", $apiid = "all"){
    //update mastersets
    runQuery("truncate temp;","setPointsetCounts");
    runQuery("SET SESSION group_concat_max_len = 4000;","setPointsetCounts");

    //find maps for which points' geoids is a component (e.g. USA)
    $subQuery1 = "select setid, concat('\"M_',mg.map, '\":',count(distinct sd.geoid, latlon)) as mapcount FROM setdata sd join mapgeographies mg on sd.geoid=mg.geoid ";
    if($apiid != "all") {
        $subFilter = " inner join sets s on s.setid=sd.setid where sd.latlon<>'' and s.latlon<>'' and apiid=".$apiid;
    } else {
        $subFilter = " where sd.latlon<>'' ";
    }
    if($setid != "all") $subFilter .= " and setid=".$setid;
    $subFilter .= " and map <>'worldx' group by setid, map";

    //find maps whose bunny = points' geoids (e.g. Virginia)
    $subQuery2 = "select setid, concat('\"M_',m.map, '\":',count(distinct sd.geoid, latlon)) as mapcount FROM setdata sd join maps m on sd.geoid=m.bunny ";

    runQuery("insert into temp (id1, text1) select setid, group_concat(mapcount) from ($subQuery1 $subFilter UNION $subQuery2 $subFilter) mc group by setid;","setPointsetCounts");
    runQuery("update sets s join temp t on s.setid=t.id1 set s.maps=t.text1;", "setPointsetCounts");
    runQuery("truncate temp;","setPointsetCounts");

    //update the points' maps

    $subQuery1 = "select setid, geoid, concat('\"M_',mg.map, '\":',count(distinct sd.geoid, latlon)) as mapcount FROM setdata sd join mapgeographies mg on sd.geoid=mg.geoid ";
    $subQuery2 = "select setid, geoid, concat('\"M_',mg.map, '\":',count(distinct sd.geoid, latlon)) as mapcount FROM setdata sd join maps m on sd.geoid=m.bunny ";
    runQuery("insert into temp (id1, id2, text1) select setid, geoid, group_concat(mapcount) from ($subQuery1 $subFilter, geoid UNION $subQuery2 $subFilter, geoid) mc group by setid, geoid;","setPointsetCounts");
    runQuery("update temp t join setdata sd on t.id1=sd.setid and t.id2=sd.geoid join sets s on s.mastersetid=t.id1 and sd.latlon=s.latlon  set s.maps=t.text1;", "setPointsetCounts");
    runQuery("truncate temp;","setPointsetCounts");
}


function updateSet($apiid, $setKey=null, $name, $units, $src, $url, $metadata='', $adpidt='', $themeid='null', $latlon='', $lasthistoricaldt=null){ //get a mapset id, creating a record if necessary
    global $db;

    if($setKey){
        $sql = "select * from sets where apiid=$apiid and setkey=".safeStringSQL($setKey);
    } else {
        $sql = "select * from sets where name=".safeStringSQL($name)." and apiid=".$apiid
            ." and units ".safeStringSQL($units);
    }
    $result = runQuery($sql, "getSet select");
    if($result->num_rows==1){
        $row = $result->fetch_assoc();
        if($row["name"]!=$name || $row["adpidt"]!=$adpidt || $row["units"]!=$units || $row["latlon"]!=$$latlon
            || $row["lasthistoricaldt"]!=$lasthistoricaldt || $row["themeid"]!=$themeid || $row["metadata"]!=$metadata || $row["src"]!=$src  || $row["url"]!=$url ){
            $sql = "update sets set name = " .  safeStringSQL($name)
                . ", set adpidt = " .  safeStringSQL($adpidt)
                . ", set units = " .  safeStringSQL($units)
                . ", set latlon = " .  safeStringSQL($latlon)
                . ", set lasthistoricaldt = " .  safeStringSQL($lasthistoricaldt)
                . ", set themeid = " .  $themeid
                . ", set metadata = " .  safeStringSQL($metadata)
                . ", set src = " .  safeStringSQL($src)
                . ", set url = " .  safeStringSQL($url)
                . " where setid=". $row["setid"];
            runQuery($sql, "getSet update");
        }
        return $row["setid"];
    } else {
        $sql = "insert into sets (apiid, setkey, name, apidt, units, latlon, lasthistoricaldt, themeid, metadata, src, url) VALUES ("
            . $apiid.",".safeStringSQL($setKey)
            . ", " .  safeStringSQL($name)
            . ", " .  safeStringSQL($adpidt)
            . ", " .  safeStringSQL($units)
            . ", " .  safeStringSQL($latlon)
            . ", " .  safeStringSQL($lasthistoricaldt)
            . ", " .  $themeid
            . ", " .  safeStringSQL($metadata)
            . ", " .  safeStringSQL($src)
            . ", " .  safeStringSQL($url);

        $result = runQuery($sql, "getSet insert");
        if($result!==false){
            $setId = $db->insert_id;
            return $setId;
        }
        return false;
    }
}

function saveSetData(&$status, $setid, $periodicity, $geoid=0, $latlon="", $arrayData, $metadata= false, $logAs="save / update setdata", $apidt=null){
    if(!$apidt) $apidt =  date("Ymd");
    $firstMdDate = explode(":", $arrayData[0]);
    $lastMdDate = explode(":", $arrayData[count($arrayData)-1]);
    $firstDate100k = unixDateFromMd($firstMdDate)/100;
    $lastDate100k = unixDateFromMd($firstMdDate)/100;
    $data = implode("|", $arrayData);
    $result = runQuery("select data from setdata where setid=$setid and periodicity='$periodicity' and geoid=$geoid and latlon=$latlon");
    if($result->num_rows==0){
        $status["added"]++;
    } else {
        $row = $result->fetch_assoc();
        if($row["data"]==$data){
            $status["skipped"]++;
        } else {
            $status["updated"]++;
        }
    }
    $sql = "insert into setdata (setid, periodicity, geoid, latlon, ".($metadata===false?"":"metadata, ")." data, firstdt100k, lastdt100k, apidt)"
        ." values($setid, '$periodicity', $geoid, '$latlon'".($metadata===false?"":safeStringSQL($metadata).","). ", '$data', $firstDate100k, $lastDate100k, 'Sapidt')"
        ." on duplicate key update set data=".safeStringSQL($data).($metadata===false?"":", metadata=".safeStringSQL($metadata).", apidt='$apidt'");
    return runQuery($sql, $logAs);
}

function saveSetdataMetadata($setid, $periodicity, $geoid=0, $latlon="", $metadata, $logAs="save SetMetadata"){
    $sql = "update setdata set metadata = ".  safeStringSQL($metadata)
    ." where setid=$setid and periodicity='$periodicity' and geoid=$geoid and latlon='$latlon'";
    return runQuery($sql, $logAs);
}