<?php
$event_logging = true;
$sql_logging = false;
$downloadFiles = false;  //SET THIS TRUE TO GET THE LATEST WB; ELSE WILL ONLY DOWN IF FILE DOES NOT EXIST LOCALLY


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
            "DataFile_CountryNameColumn" => 0,
            "DataFile_CountryCodeColumn" => 1,
            "DataFile_SeriesCodeColumn" => 3,
            "DataFile_DataColumn" => 4,
        ],
        "ADI"=>[
            "filePrefix" => "ADI",
            "CountrySeriesSuffix" => false,
            "setKey" => "SeriesCode",
            "name" => "Indicator Name",
            "metaData" => ["Short definition","Long definition","Source","Limitations and exceptions","General comments"],
            "subcategories" => "Topic",
            "DataFile_CountryNameColumn" => 0,
            "DataFile_CountryCodeColumn" => 1,
            "DataFile_SeriesCodeColumn" => 3,
            "DataFile_DataColumn" => 4,
        ],
        "EdStats"=>[
            "filePrefix"=>"EDStats",
            "CountrySeriesSuffix"=>"_Country-Series",
            "dataFile" => "Edstat_Data",
            "setKey"=>"Series Code",
            "name"=>"Indicator Name",  //if split(":").length>1, first part = category
            "metaData"=>["Short definition","Long definition","Source","Limitations and exceptions","General comments"],
            "subcategories"=>"Topic", //blank for over a thousand series
            //"freq"=>"Periodicity",  blank for edstats, but data is annual + projected to 2050
            "DataFile_CountryNameColumn" => 0,
            "DataFile_CountryCodeColumn" => 1,
            "DataFile_SeriesCodeColumn" => 3,
            "DataFile_DataColumn" => 4,
        ],
        "GenderStats"=>[
            "filePrefix"=>"Gender",
            "CountrySeriesSuffix"=>"_Country-Series",
            "setKey"=>"Series Code",
            "name"=>"Indicator Name",
            "metaData"=>["Short definition","Long definition","Source","Derivation method","Aggregation method","Limitations and exceptions","Notes from original source","General comments"],
            "subcategories"=>"Topic",
            "DataFile_CountryNameColumn" => 0,
            "DataFile_CountryCodeColumn" => 1,
            "DataFile_SeriesCodeColumn" => 3,
            "DataFile_DataColumn" => 4,
        ],
        "IDS"=>[ //
            "filePrefix"=>"IDS",
            "CountrySeriesSuffix"=>"_Country-Series",
            "setKey"=>"SeriesCode",
            "name"=>"Indicator Name",
            "metaData"=>["Short definition","Long definition","Source","General comments"],
            "subcategories"=>"Topic",
            "DataFile_CountryNameColumn" => 1,
            "DataFile_CountryCodeColumn" => 2,
            "DataFile_SeriesCodeColumn" => 7,
            "DataFile_DataColumn" => 8
        ],
        "HNP Stats"=>[
            "filePrefix"=>"HNP",
            "CountrySeriesSuffix"=>"_Country-Series",
            "setKey"=>"SeriesCode",
            "name"=>"Indicator Name",
            "metaData"=>["Short definition","Long definition","Source","Notes from original source","Limitations and exceptions","General comments"],
            "subcategories"=>"Topic",
            "DataFile_CountryNameColumn" => 0,
            "DataFile_CountryCodeColumn" => 1,
            "DataFile_SeriesCodeColumn" => 3,
            "DataFile_DataColumn" => 4,
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
                $datasets[$acronym]["freq"] = substr($newDataSet["freq"], 0, 1);
                preg_match("#http:\S+csv\.zip#i",  $newDataSet["bulkdownload"], $matches);
                $datasets[$acronym]["bulkdownload"] = $matches[0];
                $datasets[$acronym]["category"] = $newDataSet["name"];
                $datasets[$acronym]["themeMetadata"] = $newDataSet["description"];
                $datasets[$acronym]["lastrevisiondate"] = $newDataSet["lastrevisiondate"];
                $index = array_search($acronym, $acronyms);
                array_splice($acronyms, $index, 1);
            };
        }
    }
    if(count($acronyms)>0){
        $msg = "unable to find (".implode(",",$acronyms).") in data catalog.";
        logEvent("World Bank ingest error", $msg);
        print($msg."<br>");
    }

    //first build the base categories:
    $insertInitialRun = "insert into apirunjobs (runid, jobjson, tries, status, startdt) values(".$api_row["runid"] .",'{\"startCrawl\":true}',1,'R', now())";
    $result = runQuery($insertInitialRun);
    $jobid = $db->insert_id;

    foreach($datasets as $acronym=>$dataset){

        set_time_limit(300);

        //$branchInfo["catid"] = $catid;
        //$branchInfo["name"] = $branchName;

        $theme = getTheme($api_row["apiid"], $dataset["datasetName"], $dataset["themeMetadata"], $acronym);
        if($theme["apidt"] !== $dataset["lastrevisiondate"]){ //create a job iff new lastrevisiondate
            $url = $dataset["bulkdownload"];
            $parts = explode("/", $url);
            $fileName =  $parts[count($parts)-1];
            if($downloadFiles || !file_exists("bulkfiles/wb/".$dataset["filePrefix"]."_Series.csv")){
                printNow("downloading ".$url." to bulkfiles/wb/".$dataset["filePrefix"].".zip<br>");
                $fr = fopen($url, 'r');
                file_put_contents("bulkfiles/wb/".$dataset["filePrefix"].".zip", $fr);
                fclose($fr);
                print('unzipping '.$dataset["filePrefix"].'.zip<br>');
                $zip = new ZipArchive;
                $zip->open("bulkfiles/wb/".$dataset["filePrefix"].".zip");
                $zip->extractTo('./bulkfiles/wb/');
                $zip->close();
                unlink("bulkfiles/wb/".$dataset["filePrefix"].".zip");  //delete the zip file
                print('downloaded '.$dataset["filePrefix"].'.zip<br>');
            }
            if(file_exists("bulkfiles/wb/".$dataset["filePrefix"]."_Data.csv")){
                $jobJSON = json_encode($dataset);
                printNow("creating job for ".$acronym.": ".$jobJSON."<br>");
                //queue the job after the file is downloaded and unzipped
                $sql = "insert into apirunjobs (runid, jobjson, tries, status) values(".$api_row["runid"] .",".safeStringSQL($jobJSON).",0,'Q')";
                runQuery($sql);
            }
            runQuery("update apiruns set finishdt=now() where runid=".$api_row["runid"]);
            runQuery("update apirunjobs set enddt=now() where jobid=".$jobid);
        }


    }
    runQuery("update apirunjobs set status='S' where jobid=".$jobid);
}

//2. write execute jobs to
//  (c) create dataset root cat


function ApiExecuteJob($api_run_job_row){//runs all queued jobs in a single single api run until no more
    $skipCountries = [  //all regional WB aggregates shown; commented out = ingest!
        "ARB"=>"Arab World",
        "CSS"=>"Caribbean small states",
        "CEB"=>"Central Europe and the Baltics",
        //"EAS"=>"East Asia & Pacific (all income levels)",
        "EAP"=>"East Asia & Pacific (developing only)",
        "CEA"=>"East Asia and the Pacific (IFC classification)",
        "EMU"=>"Euro area",
        //"ECS"=>"Europe & Central Asia (all income levels)",
        "ECA"=>"Europe & Central Asia (developing only)",
        "CEU"=>"Europe and Central Asia (IFC classification)",
        //"EUU"=>"European Union",
        "FCS"=>"Fragile and conflict affected situations",
        "HPC"=>"Heavily indebted poor countries (HIPC)",
        "HIC"=>"High income",
        //"NOC"=>"High income: nonOECD",
        //"OEC"=>"High income: OECD",
        //"LCN"=>"Latin America & Caribbean (all income levels)",
        "LAC"=>"Latin America & Caribbean (developing only)",
        "CLA"=>"Latin America and the Caribbean (IFC classification)",
        "LDC"=>"Least developed countries: UN classification",
        "LMY"=>"Low & middle income",
        //"LIC"=>"Low income",
        "LMC"=>"Lower middle income",
        //"MEA"=>"Middle East & North Africa (all income levels)",
        "MNA"=>"Middle East & North Africa (developing only)",
        "CME"=>"Middle East and North Africa (IFC classification)",
        "MIC"=>"Middle income",
        //"NAC"=>"North America",
        //"OED"=>"OECD members",
        "OSS"=>"Other small states",
        "PSS"=>"Pacific island small states",
        "SST"=>"Small states",
        //"SAS"=>"South Asia",
        "CSA"=>"South Asia (IFC classification)",
        //"SSF"=>"Sub-Saharan Africa (all income levels)",
        "SSA"=>"Sub-Saharan Africa (developing only)",
        "CAA"=>"Sub-Saharan Africa (IFC classification)",
        //"UMC"=>"Upper middle income",
        //"WLD"=>"World",
    ];

    $apidt = date("Y-m-d");
    global $MAIL_HEADER, $db;
    $jobid = $api_run_job_row["jobid"];
    $runid = $api_run_job_row["runid"];
    $apiid = $api_run_job_row["apiid"];
    $src = $api_run_job_row["name"];

    $CountrySeriesFile_CountryCodeColumn=0;  //column A
    $CountrySeriesFile_SetCodeColumn=1;  //column B
    $CountrySeriesFile_SetDataMetaData=2;  //column C


//  (a) create dataset root_cat
    $ROOT_WB_CATID = $api_run_job_row["rootcatid"];
    $datasetInfo = json_decode($api_run_job_row['jobjson'], true);
    $acronym = $datasetInfo["acronym"];
    $datasetRootCatId = setCategoryById($api_run_job_row['apiid'], $acronym, $datasetInfo["category"], $ROOT_WB_CATID);

    $DataFile_CountryNameColumn = $datasetInfo["DataFile_CountryNameColumn"];
    $DataFile_CountryCodeColumn = $datasetInfo["DataFile_CountryCodeColumn"];
    $DataFile_SeriesCodeColumn = $datasetInfo["DataFile_SeriesCodeColumn"];
    $DataFile_DataColumn = $datasetInfo["DataFile_DataColumn"];

//  (b) create theme
    $theme = getTheme($apiid, $datasetInfo["datasetName"], $datasetInfo["themeMetadata"], $acronym);
    $themeId = $theme["themeid"];
    //reusable SQL statements
    $updateRunSql = "update apiruns set finishdt=now() where runid=".$runid;
    $updateJobSql = "update apirunjobs set status = 'R', enddt=now() where jobid=$jobid";

    //UPDATE THE RUN'S FINISH DATE
    runQuery($updateRunSql);

//  (c) loop through series and create sets, cats, and catsets

    //$result is a pointer to the job to run
    set_time_limit(60);

    $datasetName = $datasetInfo['datasetName'];
    $sets = []; //used to store set headers in memory until data file ingested to solve LCU series problem
    print("STARTING WB : $datasetName (job $jobid)<br>\r\n");

    $seriesFilePointer=fopen("bulkfiles/wb/".$datasetInfo["filePrefix"]."_Series.csv","r");
    $columns = fgetcsv($seriesFilePointer);  //header line
    $initial = true;
    $opCount = 0;
    while(!feof($seriesFilePointer)){
        $opCount++;
        if($opCount == intval($opCount/100)*100){
            runQuery($updateRunSql);
            runQuery($updateJobSql);
            set_time_limit(60);
        }
        $values = fgetcsv($seriesFilePointer);
        if(count($values)>5){  //don't try to injest blank line(s) at bottom of file
            $catId = $datasetRootCatId;
            $subCats =    explode(":", $values[array_search($datasetInfo["subcategories"], $columns)]);
            foreach($subCats as $cat){
                if(strlen(trim($cat))>0){
                    $catId = setCategoryByName($apiid, $cat, $catId);
                }
            }
            $setKey = $acronym.":".$values[$CountrySeriesFile_CountryCodeColumn];
            $setName = $values[array_search($datasetInfo["name"], $columns)];
            $metaColumns = $datasetInfo["metaData"];
            $setMeta = "";
            foreach($metaColumns as $metaColumn){
                $metaPart = $values[array_search($metaColumn, $columns)];
                if(strlen(trim($metaPart))>0 && strpos($setMeta, trim($metaPart))===false) $setMeta .= " ".$metaPart;
            }
            $setMeta = trim($setMeta);
            preg_match_all("#\(([^\)]+)\)#", $setName, $matches);
            if(count($matches[0])>0){
                //var_dump($matches);
                $setUnits = $matches[1][count($matches[1])-1];  //last match, exclusive of parentheses
                $setName = str_replace($matches[0][count($matches[0])-1], "", $setName);
                //remove sources conflated with units and cleanup
                $setUnits = str_replace("FAO, ","", $setUnits);
                $setUnits = str_replace("metric tons","metric tonnes", $setUnits);

            } else {
                $setUnits = "";
            }
            if(strpos($setUnits, "LCU")===false){
                $setId = saveSet($apiid, $setKey, $setName, $setUnits, $src, $datasetInfo["url"], $setMeta, $apidt, $themeId);
                $sets[$setKey] = ["setid"=>$setId];
                setCatSet($catId, $setId);
                $sets[$setKey] = [
                    "setid"=>$setId
                ];
                //printNow("$setId ($setKey): $setName");
            } else {
                $sets[$setKey] = [
                    "name"=>$setName,
                    "units"=>$setUnits,
                    "src"=>$src,
                    "meta"=>$setMeta,
                    "catid"=>$catId,
                    "setid"=> false
                ];
            }
        }
    }
    fclose($seriesFilePointer);

//  (e) loop through series data and create / update setdata records

    print("INGEST WB DATA : $datasetName (job $jobid)<br>\r\n");
    $status = array("updated"=>0,"failed"=>0,"skipped"=>0, "added"=>0);
    $dataFilePath = isset($datasetInfo["dataFile"])?$datasetInfo["dataFile"]:"bulkfiles/wb/".$datasetInfo["filePrefix"]."_Data.csv";
    $dataFilePointer = fopen($dataFilePath, "r");
    $columns = fgetcsv($dataFilePointer);  //header line
    $loggedCountryCodes = [];
    $loggedSetKeys = [];
    while(!feof($dataFilePointer)){
        $opCount++;
        if($opCount == intval($opCount/100)*100){ //don't update every time = too much unnecessary overhead
            runQuery($updateRunSql);
            runQuery($updateJobSql);
        }

        $values = fgetcsv($dataFilePointer);
        $countyCode = $values[$DataFile_CountryCodeColumn];
        $wbCountryName = $values[$DataFile_CountryNameColumn];
        if(!array_key_exists($countyCode, $skipCountries)){
            if($countyCode=="ADO" && $wbCountryName=="Andorra") $countyCode = "AND";  //Andorra's ISO code is wrong in
            if($countyCode=="ZAR" && ($wbCountryName=="Dem. Rep. Congo" || $wbCountryName=="Congo, Dem. Rep.")) $countyCode = "COD";  //WB still using old Zaire code
            if($countyCode=="IMY" && $wbCountryName=="Isle of Man") $countyCode = "IMN";  //proposed ISO
            if($countyCode=="ROM" && $wbCountryName=="Romania") $countyCode = "ROU";  //not sure why WB had wrong code...
            if($countyCode=="TMP" && $wbCountryName=="Timor-Leste") $countyCode = "TLS";  //Andorra's ISO code is wrong in
            if($countyCode=="WBG" && $wbCountryName=="West Bank and Gaza") $countyCode = "PSE";  //WB prob under pressure not to recognize Palestine ISO

            $setKey = $acronym . ":" . $values[$DataFile_SeriesCodeColumn];
            $data = [];
            for($c=$DataFile_DataColumn;$c<count($values);$c++){
                if(is_numeric($values[$c])){
                    $yearMatches = [];
                    preg_match("#\d{4}#", $columns[$c], $yearMatches);
                    $data[] = $yearMatches[0] .":". floatval($values[$c]);  //TODO: monthly data may require formatting $column values
                }
            }
            if(count($data)>0){
                $geo = isoLookup($countyCode);
                if($geo){
                    if(isset($sets[$setKey])){
                        $geoId = $geo["geoid"];
                        if($sets[$setKey]["setid"]){
                            $setId = $sets[$setKey]["setid"];
                        } else {
                            //LCU
                            $lcuSetKey = $setKey . ":" . $geo["currency"];
                            if(isset($sets[$lcuSetKey])){
                                $setId = $sets[$lcuSetKey]["setid"];
                            } else {
                                $lcuSetUnits = str_replace("LCU", $geo["currency"], $sets[$setKey]["units"]);
                                $setName = $sets[$setKey]["name"];
                                $setMeta = $sets[$setKey]["meta"];
                                $src = $sets[$setKey]["src"];
                                $setId = saveSet($apiid, $lcuSetKey, $setName, $lcuSetUnits, $src, $datasetInfo["url"], $sets[$setKey]["meta"], $apidt, $themeId);
                                if($setId){
                                    setCatSet($sets[$setKey]["catid"], $setId);
                                    $sets[$lcuSetKey]["setid"] = $setId;
                                }
                            }
                        }
                        if($setId) {
                            saveSetData($status, $setId, $apiid, null, $datasetInfo["freq"], $geoId, "", $data);
                        } else {
                            print("unable to insert data for:  ");
                            var_dump($values);
                            logEvent("WB ingest warning", "unable to find/insert World Bank Series for setkey $setKey in $acronym");
                        }
                    } else {
                        if(array_search($setKey, $loggedSetKeys)===false){
                            array_push($loggedSetKeys, $setKey);
                            logEvent("WB ingest warning", "missing series header for $setKey");
                        }
                    }
                } else {
                    if(array_search($countyCode, $loggedCountryCodes)===false){
                        array_push($loggedCountryCodes, $countyCode);
                        logEvent("WB ingest warning", "$countyCode ($wbCountryName) is not a recognized country code in $acronym");
                    }
                }
            }
        }

    }
    fclose($dataFilePointer);
//  (f) if exists, loop through country-series and update setdata.metadata

    if($datasetInfo["CountrySeriesSuffix"] && file_exists("bulkfiles/wb/".$datasetInfo["filePrefix"].$datasetInfo["CountrySeriesSuffix"])){
        $countrySeries_csv = fopen("bulkfiles/wb/".$datasetInfo["filePrefix"].$datasetInfo["CountrySeriesSuffix"].".csv","r");
        $columns = fgetcsv($countrySeries_csv);  //header line
        while(!feof($countrySeries_csv)){
            $values = fgetcsv($countrySeries_csv);
            $CountrySeriesFile_CountryCodeColumn=0;  //column A
            $CountrySeriesFile_SetCodeColumn=1;  //column B
            $CountrySeriesFile_SetDataMetaData=2;  //column C
            $setKey = $acronym . ":" . $values[$CountrySeriesFile_SetCodeColumn];
            $countyCode = $values[$CountrySeriesFile_CountryCodeColumn];
            $geo = isoLookup($countyCode);
            if($geo){
                $geoId = $geo["geoid"];
                if(isset($set[$setKey]["setid"])){
                    updateSetdataMetadata($set[$setKey]["setid"], $datasetInfo["freq"], $geoId, "", $values[$CountrySeriesFile_SetDataMetaData]);
                } elseif(isset($set[$setKey.":".$geo["currency"]]["setid"])){
                    updateSetdataMetadata($set[$setKey]["setid"], $datasetInfo["freq"], $geoId, "", $values[$CountrySeriesFile_SetDataMetaData]);
                }
            }
        }
        fclose($countrySeries_csv);
    }

    $updatedJobJson = json_encode(array_merge($datasetInfo, $status));
    runQuery("update apirunjobs set status = 'S', jobjson=".safeStringSQL($updatedJobJson). ", enddt=now() where jobid=$jobid");
    runQuery($updateRunSql);
    /*runQuery( "update apiruns set scanned=scanned+".$status["skipped"]."+".$status["added"]."+".$status["failed"]."+".$status["updated"]
        .", added=added+".$status["added"]
        .", updated=updated+".$status["updated"]
        .", failed=failed+".$status["failed"]
        ." where runid=$runid");*/

    print("ENDING WB: file="."bulkfiles/wb/".$datasetInfo["filePrefix"]."_Series.csv"." (job $jobid)<br>\r\n");
    return $status;
}

function ApiRunFinished($api_run){
    set_time_limit(200);
    setGhandlesPeriodicitiesFirstLast($api_run["apiid"]);
    set_time_limit(200);
    setMapsetCounts("all", $api_run["apiid"]);
    //freqSets($api_run["apiid"]);
    /*    set_time_limit(200);
        pruneSets($api_run["apiid"]);*/
}
