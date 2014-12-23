<?php

$fetchNew = false; //TODO: true for production : if local file exists, do not fetch latest from Eurostat again
$dataFolder = "bulkfiles/eurostat/";
$dsdFolder = "bulkfiles/eurostat/dsd/";
$tsvFolder = "bulkfiles/eurostat/tsv/";
$tocFile = "table_of_contents.xml";
$tocURL = "http://epp.eurostat.ec.europa.eu/NavTree_prod/everybody/BulkDownloadListing?sort=1&file=".$tocFile;
$dsdRootUrl = "http://ec.europa.eu/eurostat/SDMX/diss-web/rest/datastructure/ESTAT/DSD_";
$processedCodes = [];
$explicitUnitCount = 0;
$clUnitsCount = 0;
$currencyUnitsCount = 0;
$geoCount = 0;

include_once("es_config.php"); //set the $ingest associative array.  Also sets the $cl_config and $skip_codes.

//get TOC
if($fetchNew || !file_exists($dataFolder.$tocFile) || isset($_REQUEST["refresh"])){
    set_time_limit(300);
    print('downloading '.$tocURL."<br>");
    file_put_contents($dataFolder. $tocFile, fopen($tocURL, 'r'));
}

//read the TOC file and parse xml
$fileArray = file($dataFolder.$tocFile);
$fileString = str_replace("</nt:","</", str_replace("<nt:","<",implode("\n", $fileArray)));  //remove obnoxious "nt" namespace!!!
$xmlTOC = simplexml_load_string($fileString);

function ApiCrawl($catid, $api_row){ //$catid unused. Refactor out??
    global $ingest, $xmlTOC;
    $apiid = $api_row["apiid"];
    $runid = $api_row["runid"];
    $user_id = $api_row["userid"];

    foreach($ingest as $themeCodes => $settings){
        $tKey = implode("+", $themeCodes);

        //1.  see if ES theme exists in the mashabledata DB
        $themeRow = getTheme($apiid, false, null, $tKey); //return false is DNE and themename (2nd paramater passed in) was false (if themename not false, getThem will create the theme record)

        //2. get api date
        $leaves = $xmlTOC->xpath("//leaf[code='$themeCodes[0]']");
        if(count($leaves)===0){
            print("TOC leaf for $themeCodes[0] not found");
            return false;
        }
        $firstLeaf = $leaves[0];
        $apiDate = (string) $firstLeaf->xpath("lastModified")[0];

        //3.  if theme doe not exist or apidate is different, create a queued job
        if(!$themeRow || $themeRow["apidt"]!=$apiDate){
            queueJob($runid, array("type"=>"themeIngest", "tKey"=>$tKey, "apiDate"=>$apiDate));
            //ApiExecuteJob will be launch by chron
        }
    }
    runQuery("update LOW_PRIORITY apiruns set finishdt=now() where runid = $runid");
}

function ApiExecuteJob($runid, $apirunjob){ //called by master thread loop to excute queued jobs
    $jobid = $apirunjob["jobid"];
    $jobconfig = json_decode($apirunjob["jobjson"], true);
    if(isset($jobconfig["type"])&&$jobconfig["type"]=="themIngest"){ //only theme ingests jobs supported
        $themeCodes = explode("+", $jobconfig["tKey"]);
        $status = ApiBatchUpdate(null, null, $apirunjob, $themeCodes);
        return $status; //TODO: master loop needs to interprete $status = message string (instead of an array) as a run failure
    } else return false;
}

function ApiBatchUpdate($since, $periodicity, $api_row, $themeCodes = false){
//excutes a single theme ingest (usually one code/TSV, but may combine several) without regard to apidt (apidt already tested in ApiCrawl)
    global $ingest, $xmlTOC, $fetchNew, $dsdFolder, $tsvFolder;

    $apiid = $api_row["apiid"];
    $jobid = isset($api_row["jobid"])?$api_row["jobid"]:null;

    //1. determine code
    //also allow a single variable group to be ingested from the command line for debugging
    if(!$themeCodes && isset($_REQUEST["code"])) $themeCodes = [$_REQUEST["code"]];
    if($themeCodes === false) return "no theme code(s) requested"; //error msg

    //2. find configuration for the requested code in $ingest (master assoc array set in es_config.php)
    $themeConfig = false;
    for($i=0;$i<count($ingest);$i++){
        if(in_array($themeCodes[0], $ingest[$i]["codes"])){
            $themeConfig = $ingest[$i];
            break;
        }
    }
    if($themeConfig === false) return "themeCodes ". implode("+", $themeCodes)." not found in master config"; //error msg

    //themConfig starts as a copy of the ingest control branch, and will be added to throughout the BatchUpdate procedure to hold data, sets, and cubes
    $themeConfig["sets"] = []; //setkey = $leafcode . ":" . dim values excluding geo and freq => setid

    //Keeping an area of sets avoids unnecessary calls to saveSet
    $themeConfig["unitsUsed"] = [];  //used to run cubes for each unit

    $dsdCodeLists = [];  //association array built over all the code's DSD with [code][list][val] structure

    $hasNegatives = false;

    $themeConfig["tKey"] = implode("+", $themeConfig["codes"]);

    //2. loop through codes
    foreach($themeConfig["codes"] as $code){
        //2a. get the code leaf in TOC
        $leaves = $xmlTOC->xpath("//leaf[code='$code']"); //$leaves (not just $firstLeaf will be used to set categories 
        if(count($leaves)===0){
            logEvent("EuroStat ingest error", "TOC leaf for $code not found");
            return false;
        }
        $firstLeaf = $leaves[0];
        $lastModifiedDate = (string) $firstLeaf->xpath("lastModified")[0];
        $title = (string) $firstLeaf->xpath("title[@language='en']")[0];
        $metadataLink = (string) $firstLeaf->xpath("metadata[@format='html']")[0];
        $tsvLink = (string) $firstLeaf->xpath("downloadLink[@format='tsv']")[0];
        $tocUnits = (string) $firstLeaf->xpath("unit[@language='en']")[0]; //note: units is almost always blank in the table of contents XML doc
        $tsvPeriod = false;
        $nonNumericCodes = [];  //for debugging

        //get / set the themeid
        $themeName = isset($themeConfig["theme_name"])?$themeConfig["theme_name"]: $title;
        $themeConfig["theme"] = getTheme($apiid, $themeName, "For complete metadata, see <a target=\"_blank\" href=\"$metadataLink\">$metadataLink</a>", $themeConfig["tKey"]);

        //2b. get the DSD = DIMENSIONS AND PARSE CODELISTS
        if($fetchNew || !file_exists($dsdFolder.$code.".dsd.xml")){
            getDsd($code);
        }

        //remove pesky namespaces and parse DSD XML
        $fileArray = file($dsdFolder.$code.".dsd.xml");
        $dsdString = implode("\n", $fileArray);
        $dsdString = str_replace("</str:","</", str_replace("<str:","<",$dsdString));
        $dsdString = str_replace("</mes:","</", str_replace("<mes:","<",$dsdString));
        $dsdString = str_replace("</com:","</", str_replace("<com:","<",$dsdString));
        $dsdString = str_replace("xml:lang","lang", $dsdString);
        $xmlDsd = simplexml_load_string($dsdString);
        if($xmlDsd===false){
            return "unable to parse $code.dsd.xml file"; //error msg
        }

        //load the dataset's dimensions (code lists) from the DSD into a single associative array $dsdCodeLists
        $xDimensions = $xmlDsd->xpath("//Dimension");
        for($d=0;$d<count($xDimensions);$d++){
            $dimension = (string) $xDimensions[$d]->attributes()["id"];  //uppercase listname without "CL_" prefix (e.g. "SEX")
            if($dimension!="FREQ"){
                $refNode = $xDimensions[$d]->xpath("LocalRepresentation/Enumeration/Ref")[0];
                $codeListId = (string) $refNode->attributes()["id"];  //uppercase listname with "CL_" prefex (e.g. "CL_SEX")
                $listCodes = $xmlDsd->xpath("//Codelist[@id='$codeListId']/Code");

                //print_r($dimension);die();
                if(!isset($dsdCodeLists[$dimension])) $dsdCodeLists[$dimension] = ["allCodes"=>[]]; //accumulate codes (such as partial sex lists) across datasets grouped into this theme
                for($j=0;$j<count($listCodes);$j++){
                    $listCode = (string) $listCodes[$j]->attributes()["id"];
                    $name = (string) ($listCodes[$j]->xpath("Name[@lang='en']")[0]);
                    $dsdCodeLists[$dimension]["allCodes"][$listCode] = $name;
                }
                //check for any manual name overrides

            }
        }

        //2c. get the TSV data file and detect the codelist order across and down
        getTSV($code, $fetchNew);
        $gz = gzopen($tsvFolder . $code.".tsv.gz", "r");
        //fetch the first row and decode the dimension
        $headerLine = gzgets($gz);
        $headerFields = explode("\t", $headerLine);
        $cellA1 = strtoupper($headerFields[0]);
        $sideAndTop = explode("\\", $cellA1);  // \\ = escaped \

        //set tsv dimensions and index variables
        $topDim = $sideAndTop[1]; //mostly "TIME" and "GEO", but could be any list
        $sideDims = explode(",", $sideAndTop[0]);
        $tsvDims = $sideDims; array_push($tsvDims, $topDim);
        $themeConfig["tsvDims"] = $tsvDims;
        if(!in_array("TIME", $tsvDims)){
            printNow("$code does not have a time dimension");
            return false;
        }
        //index of geo, freq, units, and lookup table
        $timeIndex = array_search("TIME", $tsvDims);
        $themeConfig["timeIndex"] = $timeIndex;
        $geoIndex = array_search("GEO", $tsvDims);
        $themeConfig["geoIndex"] = $geoIndex;

        $setDims = $tsvDims;
        array_splice($setDims, $timeIndex, 1); //but not the TIME code
        if($geoIndex!==false) array_splice($setDims, $geoIndex<$timeIndex?$geoIndex:$geoIndex-1, 1);
        $themeConfig["setDims"] = $setDims;

        //determine units:
        //units priority: 1. explicit settings (either fixed string or array of codes and codelist), 2. master TOC, 3. CL_UNIT, 4. CL_CURRENCY
        $fixedUnits = (isset($themeConfig["units"])&&!is_array($themeConfig["units"]))?$themeConfig["units"]:$tocUnits;
        $themeConfig["unitListName"] = false;
        $themeConfig["unitIndex"] = false;
        if(!$fixedUnits && !isset($themeConfig["units"])){
            if(array_key_exists("UNIT", $dsdCodeLists)){
                if(in_array("UNIT", $tsvDims)){
                    $themeConfig["unitIndex"] = array_search("UNIT", $tsvDims);
                    $themeConfig["timeIndex"] = $timeIndex;
                } else {
                    if(count($dsdCodeLists["UNIT"])!=1) {
                        printNow("UNIT codelist is not a TSV dimension, but has more than one code");
                        return false;
                    }
                }
                $themeConfig["unitListName"] = "UNIT";
            } elseif(array_key_exists("CURRENCY", $dsdCodeLists)){
                if(in_array("CURRENCY", $tsvDims)){
                    $themeConfig["unitIndex"] = array_search("CURRENCY", $tsvDims);
                    $themeConfig["timeIndex"] = $timeIndex;
                } else {
                    if(count($dsdCodeLists["CURRENCY"])!=1) return "CURRENCY codelist is not a TSV dimension, but has more than one code";
                }
                $themeConfig["unitListName"] = "CURRENCY";
            }
            if($themeConfig["unitListName"] && count($dsdCodeLists[$themeConfig["unitListName"]])==1) {
                foreach($dsdCodeLists[$themeConfig["unitListName"]] as $listCode=>$val) $fixedUnits = $val; //simply treat as fixed units
            }
        }

        //global $cl_config;print("<pre>"); print_r(array_merge([],$cl_config["CL_ICD10:hlth_cd_acdr"])); print("</pre>"); die();
        //print("<pre>"); print_r($dsdCodeLists); print("</pre>");die();
        mergeConfig($themeConfig, $dsdCodeLists); //also makes any name changes
        //print("<pre>"); print_r($dsdCodeLists); print("</pre>"); die();

        //2d.  parse the TSV into the $themeConfig["sets"] array of skeys => [name, data, mskey]
        while($gz && !gzeof($gz)){  //loop through the non-header rows and ingest the series
            $dataLine = gzgets($gz);
            $dataFields = explode("\t", $dataLine);
            $lineCodes = explode(",", $dataFields[0]);
            $hasData = false;
            for($c=1;$c<count($dataFields);$c++){
                //point codes = all tsv codes (side & top) that uniquely determine the point (includes TIME code)
                $pointCodes = array_merge($lineCodes, [$headerFields[$c]]);
                //determine the unique facet and codes for this set.  If TIME is not the dimension across the page, this must be done for each point, else once per line
                if($c==1 || $topDim!="TIME"){
                    //codes are more permissive, and can include unit codes
                    $seriesCodes = $pointCodes;
                    array_splice($seriesCodes, $timeIndex, 1); //but not the TIME code
                    //set codes are the series codes - geocode
                    $setCodes = $seriesCodes;
                    if($geoIndex!==false) array_splice($setCodes, $geoIndex<$timeIndex?$geoIndex:$geoIndex-1, 1);
                    //facets are the english language equivalents, and exclude units (since units has its own special field and display)
                    $setFacets = [];
                    $unit = $fixedUnits; //default.  Chenaged in loop if using a units code list
                    $geoId = 0;
                    foreach($tsvDims as $index=>$tsvDim){
                        if($index!==$timeIndex){ //skip TIME dim
                            if($index===$geoIndex){
                                $iso2 = $pointCodes[$index];  //Eurostats uses 2 letter iso codes for countries
                                $geo = iso2Lookup($iso2);
                                if($geo){
                                    $geoName = $geo["name"];
                                    $geoId = $geo["geoid"]; //either int or "null" (string)
                                } else {
                                    //if(!isset($iso2)) return "geocode $iso2 not found in GEO codelist";
                                    $geoName = $dsdCodeLists["GEO"]["allCodes"][$iso2];
                                    $geoId = 0;
                                }
                            } elseif ($index===$themeConfig["unitIndex"] && !$fixedUnits) {
                                //unit logic priority (continued): 1. explicit settings, 2. master TOC, 3. CL_UNIT, 4. CL_CURRENCY
                                $unit = $dsdCodeLists[$tsvDims[$index]]["allCodes"][$pointCodes[$index]];
                            } else {
                                //set's name excludes GEO and units (series name = set name with geoname appended)
                                $facet = $dsdCodeLists[$tsvDim]["allCodes"][$pointCodes[$index]];
                                if($facet!="") array_push($setFacets, $facet);
                            }
                            //note:  set name excludes units and geo
                            //if($geoIndex!==false) array_push($seriesFacets, geoLookup($pointCodes[$geoIndex]));
                        }
                    }
                    $setKey = $themeConfig["tKey"] . ":" . implode(",", $geoId==0?$seriesCodes:$setCodes);
                    if(!isset($themeConfig["sets"][$setKey])){
                        //add mastersetkey if part of larger set
                        $themeConfig["sets"][$setKey] = [
                            "name" =>  $themeName.": ".implode("; ", $setFacets). ($geoId!=0 ? "" : " - ".$geoName),
                            "units" => $unit,
                            "freqs" => [],
                            "masterkey" => ($geoId==0 && $geoIndex!==false)? $themeConfig["tKey"] . ":" . implode(",", $seriesCodes) : null
                        ];
                    }
                    if(!in_array($unit, $themeConfig["unitsUsed"])) array_push($themeConfig["unitsUsed"], $unit);

                }
                //only process non-empty points
                $value = explode(" ",trim($dataFields[$c]));
                $value = $value[0];  //eliminate the observation flag (MashableData does not support point metadata at this time)
                if(is_numeric($value)){ //if no points have data, the set header never gets written!!
                    //process point
                    $hasData = true;
                    $geoHandle = "G".$geoId;
                    $time = $pointCodes[$timeIndex];
                    if(!$tsvPeriod) $tsvPeriod = mdFreqFromEsDate($time);
                    if(!isset($themeConfig["sets"][$setKey]["freqs"][$tsvPeriod])) $themeConfig["sets"][$setKey]["freqs"][$tsvPeriod] = [];
                    if(!isset($themeConfig["sets"][$setKey]["freqs"][$tsvPeriod][$geoHandle])) $themeConfig["sets"][$setKey]["freqs"][$tsvPeriod][$geoHandle] = [];
                    $mdDate = mdDateFromEsDate($time, $tsvPeriod);

                    $themeConfig["sets"][$setKey]["freqs"][$tsvPeriod][$geoHandle][]  = $mdDate.':'.$value;
                    if($value<0) $hasNegatives = true;
                } else {
                    if(!in_array($dataFields[$c], $nonNumericCodes)) $nonNumericCodes[] = $dataFields[$c];
                }
            }
            //if(!$hasData){ print("$dataLine<pre>"); print_r($dataFields); print("</pre>"); die(); }
        }
        //print("<pre>");print_r($nonNumericCodes);print_r($themeConfig["sets"]);print("</pre>");die();
    }

    //3. finished reading all TSVs ->>> save/get the sets and set data!
    $status =  ["updated"=>0, "failed"=>0, "skipped"=>0, "added" =>0];
    //first, all the mastersets
    foreach($themeConfig["sets"] as $setKey => &$set){
        if(!$set["masterkey"]){
            if(!isset($set["setid"])){
                $set["setid"] = saveSet($apiid, $setKey, $set["name"], $set["units"], null, null, null, $lastModifiedDate, $themeConfig["theme"]["themeid"], "", null);
                //note: metadata, src and url to be stored in apis table and meatadata in themes table to avoid repetition and bloat
            }

            foreach($set["freqs"] as $freq => &$geoSet){
                foreach($geoSet as $gHandle => $data){
                    saveSetData($status, $set["setid"], null, null, $freq, intval(substr($gHandle,1)), "", $data);
                }
            }
            unset($set["freqs"]);  //free up memory
        }
    }
    //then, all the slavesets
    foreach($themeConfig["sets"] as $setKey => &$set){
        if($set["masterkey"]){
            if(!isset($set["setid"])){
                $mastsetid = $themeConfig["sets"][$set["masterkey"]]["setid"];
                $set["setid"] = saveSet($apiid, $setKey, $set["name"], $set["units"], null, null, null, $lastModifiedDate, $themeConfig["theme"]["themeid"], "", null, $mastsetid);
                //note: metadata, src and url to be stored in apis table and meatadata in themes table to avoid repetition and bloat
            }
            foreach($set["freqs"] as $freq => &$geoSet){
                foreach($geoSet as $gHandle => $data){
                    saveSetData($status, $set["setid"], null, null, $freq, intval(substr($gHandle,1)), "", $data);
                }
            }
            unset($set["freqs"]);  //free up memory
        }
    }
    //finished saving sets and setdata

    //4.  make the cubes and cube-components
    /* $themeConfig structure:
            unitIndex
            timeIndex
            geoIndex
            cubes: ckey => {cubeid, name, components: {}}
            cubable: T/F
            candidates: {barOnly:[], barStack:[]}
            mapping
            unitIndex int
            sexTotal: T/F
            sexMF: T/F
            tsvDims: []
    */
    //ADD CUBES (im memory)
    if($themeConfig["cubable"]){  //set in master $config or calculated in mergeConfig()

// the distinction of bar v. stack blurs:  what is needed is a local total (v. root total) to be a stacked (2nd dimension)
// AddCubeSets recursively crawls bars hierarchy to detect local totals and detail cubes

        //main cube set loop
        $barableDims = array_merge($themeConfig["candidates"]["barOnly"], $themeConfig["candidates"]["barStack"]);
        foreach($barableDims as $barDim){
            //ADD 1D cubes = dimension with siblings!
            addCubeSet($themeConfig, $dsdCodeLists, $barDim);  //1D cube

            foreach($themeConfig["candidates"]["barStack"] as $stackDim){
                //2D cubes: second dimension must be stackble (i.e. has a rootCode)
                if($barDim!=$stackDim){
                    if($stackDim=="SEX" && !$hasNegatives){
                        //show SEX as a side dim rather than a stack dim
                        $barBranch = null;
                        addCubeSet($themeConfig, $dsdCodeLists, $barDim, $barBranch, null, $stackDim); //2D cube
                    } else {
                        //simple 2D stack
                        $barBranch = null;
                        addCubeSet($themeConfig, $dsdCodeLists, $barDim, $barBranch, $stackDim); //2D cube
                    }
                    if($barDim!="SEX" && $stackDim!="SEX" && $themeConfig["sexTotal"]){
                        //sexy cube!
                        $barBranch = null;
                        addCubeSet($themeConfig, $dsdCodeLists, $barDim, $barBranch, $stackDim, "SEX"); //3D cube
                    }
                }
            }
        }

        /*foreach(){ //no bar; stack only
            for($b=0;$b<count($themeConfig["candidates"]["barStack"]);$b++){
                addCubes($themeConfig, $dsdCodeLists, $themeConfig["candidates"]["barStack"][$b]);  //1D cube
                for($s=$b+1;$s<count($themeConfig["candidates"]["barStack"]);$s++){
                    $switch = widest($themeConfig["candidates"]["barStack"][$s])>widest($themeConfig["candidates"]["barStack"][$b]);
                    addCubes($themeConfig, $dsdCodeLists, $themeConfig["candidates"]["barStack"][$switch?$s:$b], $themeConfig["candidates"]["barStack"][$switch?$s:$b]); //2D cube
                }
            }
        }*/

    }
    //note: when a theme has multiple codes, each of the TSVs must have the same dimensions
    //combining codes is used when Eurostats splits the NUTS levels or male, female, and totals across several codes

    preprint($themeConfig["cubes"]);
    //5. save the cubes their  components
    updateCubes($themeConfig, $dsdCodeLists);

    //6.save category tree and categorysets
    $catIds = getCatidsFromEsCodes($themeConfig["codes"], $api_row);
    foreach($themeConfig["sets"] as $setKey => &$set){
        foreach($catIds as $catId){
            setCatSet($catId, $set["setid"]);
        }
    }

    return $status;
}

function ApiRunFinished($api_run){
    setMapsetCounts("all", $api_run["apiid"]);
    //freqSets($api_run["apiid"]);
}

function getTSV($code, $force = false){
    global $tsvFolder;
//GET TSV DATA FILE
    if($force || !file_exists($tsvFolder.$code.".tsv.gz")){
        set_time_limit(300);
        file_put_contents($tsvFolder . $code.".tsv.gz", fopen("http://epp.eurostat.ec.europa.eu/NavTree_prod/everybody/BulkDownloadListing?file=data/$code.tsv.gz", 'r'));
    }
}

function getDsd($code){
    global $dsdFolder, $dsdRootUrl;
    set_time_limit(300); // unlimited max execution time
    $url = $dsdRootUrl.$code;
    $outputfile = $dsdFolder.$code.".dsd.xml";
    $cmd = "wget -q \"$url\" -O $outputfile";
    exec($cmd);
}

function mdFreqFromEsDate($esDate){
    $esDate = trim($esDate);
    if(strlen($esDate)==4 && is_numeric($esDate)) return "A";
    if(strlen($esDate)==9 && substr($esDate, 4, 1)=="-") return "A"; //range of years
    if(strlen($esDate)==7 && substr($esDate, 4, 1)=="M") return "M";
    if(strlen($esDate)==6 && substr($esDate, 4, 1)=="Q") return "Q";
    if(strlen($esDate)==6 && substr($esDate, 4, 1)=="H") return "S";
    if(strlen($esDate)==7 && substr($esDate, 4, 1)=="-" && substr($esDate, 7, 1)=="-") return "D";
    die("unknown date format: '$esDate'");
}

function mdDateFromEsDate($esDate, $freq){
    switch($freq){
        case "A":
            return trim($esDate);
        case "M":
            return substr(trim($esDate), 0, 4) . substr($esDate, 5, 2);
        case "W":
            //TODO: verify Eurostats weekly (and Q and H and D) format correct the formula below
            return substr(trim($esDate), 0, 4) . sprintf("%20d", intval(substr($esDate, 5, 2)));
        case "Q":
            return trim($esDate);
        case "H":
            return substr(trim($esDate), 0, 4) . "S" . substr($esDate, 5, 1);
        default:  //"D"
            return substr(trim($esDate), 0, 4) . substr($esDate, 5, 2). sprintf("%20d", intval(substr($esDate, 5, 2)));
    }
}

function mergeConfig(&$themeConfig, &$dimensions){ // merges configuration in DSD derived $dimension assoc array + set themeconfig flag set root, hierarchy, and sex flags
    global $cl_config;
    $themeConfig["candidates"] = ["barOnly"=>[], "barStack"=>[]];
    $tsvDims = $themeConfig["tsvDims"];
    foreach($dimensions as $cl_name => $cl){

        //1. get code list hierarchies (inline or pointer or global)
        if(isset($themeConfig["mapping"]["CL_".$cl_name])){
            if(is_array($themeConfig["mapping"]["CL_".$cl_name])){
                //1a. array = inline configuration
                $dimensions[$cl_name] = array_merge($dimensions[$cl_name], $themeConfig["mapping"]["CL_".$cl_name]);
            } else {
                //1b. string = for lookup in $cl_config
                $clVersion =  "CL_".$cl_name.":".$themeConfig["mapping"]["CL_".$cl_name];
                //foreach($cl_config[$clVersion] as $attribute=>$value) $dimensions[$cl_name][$attribute] = $value;
                $dimensions[$cl_name] = array_merge($dimensions[$cl_name], $cl_config[$clVersion]); //should copy structure
            }
        } elseif(isset($cl_config["CL_".$cl_name])){ //3. else check for generic cl_config
            //foreach($cl_config[$cl_name] as $attribute=>$value) $dimensions[$cl_name][$attribute] = $value;
            $dimensions[$cl_name] = array_merge($dimensions[$cl_name], $cl_config["CL_".$cl_name]);
        }
        if(isset($dimensions[$cl_name]["renames"])) $dimensions[$cl_name]["allCodes"] = array_merge($dimensions[$cl_name]["allCodes"], $dimensions[$cl_name]["renames"]);
/* "rootCode" vs. "hierarchy"?  Either are valid ways to describe codeList structure in the config file
    >> "rootCode" is simpler, required a single code value.  May be used in combination with a ex(clude) array for excluding
    >> "hierarchy" allow more complex description and is definitive (excludes are ignored)

*/
        //check for rootCode if not already defined in (1) hierarchy or (2) as TOTAL code
        if(!isset($dimensions[$cl_name]["rootCode"])){
            if(isset($dimensions[$cl_name]["hierarchy"]) && count($dimensions[$cl_name]["hierarchy"])==1){
                foreach($dimensions[$cl_name]["hierarchy"] as $rootCode => $h2){ //just want the key = root code
                    $dimensions[$cl_name]["rootCode"] = $rootCode;
                }
            } elseif(array_key_exists ("TOTAL",$dimensions[$cl_name]["allCodes"])) {
                $dimensions[$cl_name]["rootCode"] = "TOTAL";
            }
        }
        //name DNE, create
        if(!isset($dimensions[$cl_name]["name"])) $dimensions[$cl_name]["name"] = strtolower($cl_name);

        //if $rootCode DNE create as null
        if(!isset($dimensions[$cl_name]["rootCode"])) $dimensions[$cl_name]["rootCode"] = null;

        //make hierarchy if DNE
        if(!isset($dimensions[$cl_name]["hierarchy"])){
            if($dimensions[$cl_name]["rootCode"]){
                $dimensions[$cl_name]["hierarchy"] = [$dimensions[$cl_name]["rootCode"] => [] ];

                $list =& $dimensions[$cl_name]["hierarchy"][$dimensions[$cl_name]["rootCode"]];
            } else {
                $dimensions[$cl_name]["hierarchy"] = [];
                $list =& $dimensions[$cl_name]["hierarchy"];
            }
            foreach($dimensions[$cl_name]["allCodes"] as $code=>$value){
                if(!(isset($dimensions[$cl_name]["ex"])&&in_array($code, $dimensions[$cl_name]["ex"]) || $dimensions[$cl_name]["rootCode"]==$code)){
                    array_push($list, $code);
                }
            }
        }
        //is this dimension a bar or a stack candidate?
        if(in_array($cl_name, $tsvDims) && $cl_name!="TIME" && $cl_name!="GEO" && $cl_name!="SEX"){ //lots of weird unused code lists in the DSD: don't process these or the time or geography dimensions; sex dimension handled below
            $index = array_search($cl_name, $tsvDims);
            if($themeConfig["unitIndex"]!==$index){  //
                if($dimensions[$cl_name]["rootCode"]!==null){
                    if(count($dimensions[$cl_name]["hierarchy"][$dimensions[$cl_name]["rootCode"]])>1)  array_push($themeConfig["candidates"]["barStack"], $cl_name);
                } else {
                    if(count($dimensions[$cl_name]["hierarchy"])>4) array_push($themeConfig["candidates"]["barOnly"], $cl_name);
                }
            }
        }
    }

    //set SEX related flags
    if(in_array("SEX", $tsvDims)){
        $themeConfig["sexTotal"] = isset($dimensions["SEX"]["allCodes"]["T"]);
        $themeConfig["sexMF"] = isset($dimensions["SEX"]["allCodes"]["M"]) && isset($dimensions["SEX"]["allCodes"]["F"]);
    } else {
        $themeConfig["sexTotal"] = false;
        $themeConfig["sexMF"] = false;
    }

    //determine cubable
    if(count($themeConfig["candidates"]["barOnly"])+count($themeConfig["candidates"]["barStack"])==0 && !$themeConfig["sexMF"]) {
        $themeConfig["cubable"] = false;  //overrides if user set to true
    } else {
        if(!isset($themeConfig["cubable"])) $themeConfig["cubable"] = true;  //do not overide if user has set to false
    }
    $themeConfig["dimDefs"] = [];
    $themeConfig["cubes"] = [];
}

//addCubeSet adds all the cubes having the passed dimensions (i.e. the cube is fully sexed when called).
//A cube will be added for every "left out" dimensions' combination of values
//A cube will be added for every bar-branch in the bar dim's hierarchy (the stack dim is not crawled)
function addCubeSet(&$themeConfig, &$dimensions, $barDim, &$barBranch = null, $stackDim=false, $sideDim=false) {
    if(!$barBranch){ //this is a initial call (i.e. not a recursive call)
        $barBranch = $dimensions[$barDim]["hierarchy"];
    }
    $barRootCode = false;
    if(count($barBranch)==1){
        //we have a total code (root or local)...
        foreach($barBranch as $barRootCode=>$subBranch){

        }
        $barBranch = $subBranch; //go up the hierarchy one level
    }
    if(count($barBranch)>1){
        //have cubeSet: add it!

        //add dimDefs

        $barDimKey = $themeConfig["tKey"] . ":" . $barDim . ($barRootCode?">".$barRootCode:"");
        //$cubeSetKey = $barDimKey . ($stackDim?",".$stackDim:"") . ($sideDim?",".$sideDim:"");
        //$cubedBy = "by ".$dimensions[$barDim]["name"].($stackDim?" by ".$dimensions[$stackDim]["name"]:"").($sideDim?" by ".$dimensions[$sideDim]["name"]:"");
        //preprint($barDim);
        //preprint($dimensions[$barDim]);

        $cubedBy = "by ". $dimensions[$barDim]["name"].($stackDim?($sideDim?", ":" and ").$dimensions[$stackDim]["name"]:"").($sideDim?" and ".$dimensions[$sideDim]["name"]:"");

        //build cube code lists
        $bar_codes = [];
        foreach($barBranch as $key=>$val) {
            $bar_codes[] = is_integer($key)?$val:$key;
            if(!is_integer($key) && count($val)>1){
                //RECURSE for each sub-branch!!
                $subBranch = [$key => $val];
                addCubeSet($themeConfig, $dimensions, $barDim, $subBranch, $stackDim, $sideDim);
            }
        }
        $stack_codes = [];
        if($stackDim){ //stack must be a hierarchy (local or root) and must be passed as a assoc. branch
            $stackL1  = $dimensions[$stackDim]["hierarchy"][$dimensions[$stackDim]["rootCode"]];
            //foreach($stack_branch as $stack_local_root=>$stack_leaves);
            foreach($stackL1 as $key=>$val) $stack_codes[] = is_integer($key)?$val:$key;
        }
        $side_codes = [];
        if($sideDim){
            $sideL1  = $dimensions[$sideDim]["hierarchy"][$dimensions[$sideDim]["rootCode"]];
            //foreach($stack_branch as $stack_local_root=>$stack_leaves);
            foreach($sideL1 as $key=>$val) $side_codes[] = is_integer($key)?$val:$key;
        }

        //determine the left out dims and the set dims that determine a set key.  (note: set dims = tsv dim - geo and time dims)
        $left_out_dims = [];
        foreach($themeConfig["tsvDims"] as $dimIndex=>$tsvdim){
            if($dimIndex!==$themeConfig["geoIndex"] && $dimIndex!==$themeConfig["timeIndex"]){
                //unitsIndex will be in there, but gets special treatment // && $dimIndex!==$themeConfig["unitIndex"]){
                if($tsvdim!==$barDim && $tsvdim!==$stackDim && $tsvdim!==$sideDim){
                    $left_out_dims[$tsvdim] = null;
                }
            }
        }

        $qualifiers = [];
        //bar qualifier if not dim root (note: stack and side are only root/ground level and are never up the tree)
        if($barRootCode && $barRootCode!=$dimensions[$barDim]["rootCode"]) $qualifiers[] = $dimensions[$barDim]["allCodes"][$barRootCode];

        //add dimDefs
        $barDimKey = $barDim . ($barRootCode?">".$barRootCode:"");
        if(!isset($themeConfig["dimDefs"][$barDimKey])) {
            $themeConfig["dimDefs"][$barDimKey] = makeDimDef($dimensions, $barDim, $bar_codes);
        }
        if($stackDim){
            $stackDimKey = $stackDim . ">" . $dimensions[$stackDim]["rootCode"];
            if(!isset($themeConfig["dimDefs"][$stackDimKey])){
                $themeConfig["dimDefs"][$stackDimKey] = makeDimDef($dimensions, $stackDim, $stack_codes);
            }
        } else $stackDimKey = "";
        if($sideDim){
            $sideDimKey = $stackDim . ">" . $dimensions[$sideDim]["rootCode"];
            if(!isset($themeConfig["dimDefs"][$sideDimKey])){
                $themeConfig["dimDefs"][$sideDimKey] = makeDimDef($dimensions, $sideDim, $side_codes);
            }
        } else $sideDimKey = "";

        addCubesOverLeftOuts($themeConfig, $dimensions, $qualifiers, $cubedBy,
            $barDim, $barDimKey, $bar_codes, $barRootCode,
            $stackDim, $stackDimKey, $stack_codes,
            $sideDim, $sideDimKey, $side_codes, $left_out_dims);

    } else { printNow("unitary barbranch"); }
}

//addLeftOutCubes adds a cube for each combination of left out dimension's values (if any).
//The parameters fully described the cube's dimensions and code list snippets
//Each left out will be used to add qualifiers to the cube name (derived from theme name) if not a root total or a units list
function addCubesOverLeftOuts(&$themeConfig, &$dimensions, $qualifiers, $cubedBy,
                              $barDim, $barDimKey, $bar_codes, $barRootCode,
                              $stackDim, $stackDimKey, $stack_codes,
                              $sideDim, $sideDimKey, $side_codes, $left_out_dims){
    $leftOutKeys = [];
    $componentSetKeyCodes = [];
    $totSetCodes = [];
    $setDims = $themeConfig["setDims"];
    foreach($left_out_dims as $left_out_dim => $code){
        if($code==null){
            //loop through codes
            foreach($dimensions[$left_out_dim]["allCodes"] as $left_out_code=>$left_out_value){
                $left_out_dims[$left_out_dim] = $left_out_code;
                addCubesOverLeftOuts($themeConfig, $dimensions, $qualifiers, $cubedBy, $barDim, $barDimKey, $bar_codes, $barRootCode, $stackDim, $stackDimKey, $stack_codes, $sideDim, $sideDimKey, $side_codes, $left_out_dims);
            }
            return;
        } else {
            if($dimensions[$left_out_dim]["rootCode"]!=$code && (!isset($themeConfig["unitIndex"]) || $themeConfig["tsvDims"][$themeConfig["unitIndex"]]!=$left_out_dim)){
                $qualifiers[] = $dimensions[$left_out_dim]["allCodes"][$code];
            }
            $leftOutKeys[] = $left_out_dim . "=" . $code;
            $index = array_search($left_out_dim, $setDims);
            $componentSetKeyCodes[$index] = $code;
            $totSetCodes[$index] = $code;
        }
    }

    //all left out dimensions are filled in (through the magic of recursion!) if executing this code (i.e. did not execute a return above) 

    //finally:  add a single cube! (note:  dimensions already added in addCubeSet)
    $units = false;
    $localCubeKey = $barDimKey.",".$stackDimKey.",".$sideDimKey.":".implode(",", $leftOutKeys);
    if(isset($themeConfig["cubes"][$localCubeKey])){
        logEvent("Eurostats ingest error", "cube for key ".$localCubeKey." already exists in memory");
        die("cube for key ".$localCubeKey." already exists in memory");
    }

    $localCubeName = (count($qualifiers)==0?"":implode(", ", $qualifiers) . " detailed ").$cubedBy.

        //finish computing totSetKey
        $barDimIndex = array_search($barDim, $setDims);
    if($stackDim) $stackDimIndex = array_search($stackDim, $setDims);
    if($sideDim) $sideDimIndex = array_search($sideDim, $setDims);
    if($barRootCode){ //totSet!!
        $totSetCodes[$barDimIndex] = $barRootCode;
        if($stackDim) $totSetCodes[$stackDimIndex] = $dimensions[$stackDim]["rootCode"];
        if($sideDim) $totSetCodes[$sideDimIndex] = $dimensions[$sideDim]["rootCode"];
        $totSetKey = $themeConfig["tKey"] . ":" . implode(",", $totSetCodes); //$themeConfig["tKey"] . ":"  prefix not added to setkeys to save memory
    } else $totSetKey = false;
    $themeConfig["cubes"][$localCubeKey] = [
        "by"=> $cubedBy,
        "qualifiers"=> implode(", ", $qualifiers),
        "units"=> false,
        "barDimKey"=>$barDimKey,
        "stackDimKey"=>$stackDimKey,
        "sideDimKey"=>$sideDimKey,
        "localTotSetKey" => $totSetKey,
        //"dimNames" => "",
        "components"=>[]
    ];
    printNow($localCubeKey);
    $dimNames = [[],[],[]];
    //loop through the bar, stack and side codes and add ordered arrays of localSetKeys
    $components = []; $stackLabeled = false; $sideLabeled = false;
    foreach($bar_codes as $barCode){
        $dimNames[0][] = $dimensions[$barDim]["allCodes"][$barCode];
        $componentSetKeyCodes[$barDimIndex] = $barCode;
        if($stackDim){
            $bar = [];
            foreach($stack_codes as $stackCode){
                $componentSetKeyCodes[$stackDimIndex] = $stackCode;
                if(!$stackLabeled) $dimNames[1][] = $dimensions[$stackDim]["allCodes"][$stackCode];
                if($sideDim){
                    $stack = [];
                    foreach($side_codes as $sideCode){
                        $componentSetKeyCodes[$sideDimIndex] = $sideCode;
                        if(!$sideLabeled) $dimNames[2][] = $dimensions[$sideDim]["allCodes"][$sideCode];
                        ksort($componentSetKeyCodes);
                        $setKey = $themeConfig["tKey"] . ":" . implode(",", $componentSetKeyCodes);
                        if(!isset($themeConfig["sets"][$setKey])){
                            unset($themeConfig["cubes"][$localCubeKey]);
                            return;
                        }
                        $stack[] = $setKey;
                    }
                    $sideLabeled = true;
                } else {
                    ksort($componentSetKeyCodes);
                    $setKey = $themeConfig["tKey"] . ":" . implode(",", $componentSetKeyCodes);
                    if(!isset($themeConfig["sets"][$setKey])){
                        unset($themeConfig["cubes"][$localCubeKey]);
                        return;
                    }
                    $stack = $setKey;
                }
                $bar[] = $stack;
            }
            $stackLabeled = true;
        } elseif($sideDim){
            $side = [];
            foreach($side_codes as $sideCode){
                $componentSetKeyCodes[$sideDimIndex] = $sideCode;
                if(!$sideLabeled) $dimNames[2][] = $dimensions[$sideDim]["allCodes"][$sideCode];
                ksort($componentSetKeyCodes);
                $setKey = $themeConfig["tKey"] . ":" . implode(",", $componentSetKeyCodes);
                if(!isset($themeConfig["sets"][$setKey])){
                    unset($themeConfig["cubes"][$localCubeKey]);
                    return;
                }
                $side[] = $setKey;
            }
            $sideLabeled = true;
            $components[] = $side;
        } else {
            //1D cube
            ksort($componentSetKeyCodes);
            $setKey = $themeConfig["tKey"] . ":" . implode(",", $componentSetKeyCodes);
            if(!isset($themeConfig["sets"][$setKey])){
                unset($themeConfig["cubes"][$localCubeKey]);
                return;
            }
            $components[] = $setKey;
        }
    }
    $themeConfig["cubes"][$localCubeKey]["components"] = $components;
    //$themeConfig["cubes"][$localCubeKey]["dimNames"] = json_encode($dimNames);
}

function makeDimDef(&$dimensions, $dim, $list){
    $names = [];
    foreach($list as $code) $names[] = str_replace("\"","'", $dimensions[$dim]["allCodes"][$code]);
    return json_encode($names);
}



function shortenName($code_name){
    $code_name = preg_replace("#\(.+\)#" , "", $code_name);  //all parentheticals
    $code_name = preg_replace("#(from)? (\d+) to (\d+)#i" , "$1 - $2", $code_name);
    $code_name = preg_replace("#greater than .+ equal[ to](\d+)#i" , "&#8805;$1", $code_name);
    $code_name = preg_replace("#greater than (\d+)#i", "&gt;$1", $code_name);
    $code_name = preg_replace("#less(er)? than .+ equal[ to] (\d+)#i" , "&#8804;$1", $code_name);
    $code_name = preg_replace("#(\d+)( \S+) or over#i", "&#8804;$1", $code_name);
    $code_name = trim(preg_replace("#less(er)? than (\d+)#" , "&lt;$1", $code_name));
    return $code_name;
}

function getCatidsFromEsCodes($esCodes, $api_row){  //returns array of catids and create cats as needed
    global $xmlTOC;
    $catids = [];
    foreach($esCodes as $code){
        $leaves = $xmlTOC->xpath("//leaf[code='$code']");
        for($j=0;$j<count($leaves);$j++){  //multiple leaves can have same code = multihoming!
            $catids = array_merge($catids, getEsCatId($leaves[$j], $api_row));
        }
    }
    return $catids;
}

function getEsCatId($node, $api_row){
    global $xmlTOC;
    $apiid = $api_row{"apiid"};
    $codeNodes = $node->xpath("code");
    if(count($codeNodes)!==1) throw new Exception("XML node does not have one and only one code node");
    $code = (string) $codeNodes[0];

    //check if catCode exists
    if($catids = fetchCat($api_row, $code)) return $catids;


    //if not, get info needed to insert the category
    $titleNodes =  $node->xpath("title[@language='en']");
    if(count($titleNodes)!==1)  throw new Exception("unable to find category title");
    $catTitle = (string) $titleNodes[0];

    $parentNodes =  $node->xpath("../..");
    if(count($parentNodes)!==1) throw new Exception("XML node does not have one and only one parent node");
    $parentNode = $parentNodes[0];

    $parentCodeNodes = $parentNode->xpath("code");
    if(count($parentCodeNodes)!==1) throw new Exception("unable to find code of parent node");
    $parentCode = (string) $parentCodeNodes[0];


    $parentCatid = getEsCatId($parentNode, $api_row);
    if($parentCatid){
        return fetchCat($api_row, $code, $catTitle, $parentCode);
    } else {
        return false;
    }
}

function fetchCat($api_row, $code, $title=false, $parentCatId=false){
    global $db;
    $apiid = $api_row["apiid"];
    //1. check if exists, return catid
    $sql = "select * from categories where apicatid='$code' and apiid=$apiid";
    $result = runQuery($sql);
    if($result->num_rows!=0){
        $catids = [];
        while($cat_row = $result->fetch_assoc())
            $catids[] = $cat_row["catid"];
        return $catids;
    } else {
        //otherwise
        if($parentCatId&&$title){
            //  2a.insert if title and parentCatid passed
            $title = safeStringSQL($title);
            $parentCatId = safeStringSQL($parentCatId);
            $sql = "insert into categories (apiid, name, apicatid) values($apiid, $title, $parentCatId)";
            $result = runQuery($sql);
            if($result===false) throw new Exception("unable to insert catcat");
            $catId = $db->insert_id;
            $sql = "insert into catcat (parentid, childid) values($parentCatId, $catId)";
            $result = runQuery($sql);
            if($result===false) throw new Exception("unable to insert catcategory");
            return [$catId]; //get all catids
        } else {
            //  2.b return false
            return false;
        }
    }
}


function iso2Lookup($iso2LetterCode, $set = "ALL"){
    static $geos = "null";
    if($geos=="null"){
        $geos = array();
        $geos_sql = "select geoid, name, iso3166_2 from geographies where iso3166_2 is not null";
        $result = runQuery($geos_sql);

        while($row=$result->fetch_assoc()){
            $geos[$row["iso3166_2"]] = ["name"=>$row["name"], "geoid"=>$row["geoid"]];
        }
        //special cases where Eurostats does not follow ISO country standards (NUTS will be different too)
        $geos["EL"] = $geos["GR"];  //Greece
        $geos["UK"] = $geos["GB"];  //Great Britain
    }
    $iso2LetterCode = preg_replace ("#0+\b#","",$iso2LetterCode);  //eliminate trailing zeros for lower level NTUS region which are equavilent to higher level regions
    if(isset($geos[$iso2LetterCode])){
        return $geos[$iso2LetterCode];
    } else {
        return null;
    }
}

//TODO: move to crawlers/index.php
function  updateCubes(&$themeConfig, &$dimensions, $deleteOldCubes = true){
    global $db;
    $themeId  = $themeConfig["theme"]["themeid"];
    $cubes =& $themeConfig["cubes"];
    $dimDefs =& $themeConfig["dimDefs"];
    $tKey = $themeConfig["tKey"];
    $cubes =& $themeConfig["cubes"];
    foreach($cubes as $localCubeKey=> &$cube){
        $sqlName = safeStringSQL($cube["name"]);
        $sqlUnits = safeStringSQL($cube["units"]);
        $sqlCkey = safeStringSQL($tKey . ":" . $localCubeKey);


        /*$themeConfig["cubes"][$localCubeKey] = [
            "by"=> $cubedBy,
            "qualifiers"=> implode(", ", $qualifiers),
            "units"=> false,
            "barDimKey"=>$barDimKey,
            "stackDimKey"=>$stackDimKey,
            "sideDimKey"=>$sideDimKey,
            "localTotSetKey" => $totSetKey,
            //"dimNames" => "",
            "components"=>[]
        ];*/

        //save Dimension definitions:
        //bar (required)
        $barDimKeyParts = explode(">", $cube["barDimKey"])[0];
        $barDim = $barDimKeyParts[0];
        $barDimId = saveDimDef($themeId, $cube["barDimKey"], $dimensions[$barDim]["name"], $dimDefs);
        //stack (optional)
        if($cube["stackDimKey"]){
            $stackDimKeyParts = explode(">", $cube["stackDimKey"]);
            $stackDim = $stackDimKeyParts[0];
            $stackDimId = saveDimDef($themeId, $cube["stackDimKey"], $dimensions[$stackDim]["name"], $dimDefs);
        } else {
            $stackDim = false;
            $stackDimId = "null";
        }
        //side (optional)
        if($cube["sideDimKey"]){
            $sideDimKeyParts = explode(">", $cube["sideDimKey"]);
            $sideDim = $sideDimKeyParts[0];
            $sideDimId = saveDimDef($themeId, $cube["stackDimKey"], $dimensions[$sideDim]["name"], $dimDefs);
        } else {
            $sideDim = false;
            $sideDimId = "null";
        }
        if($cube["localTotSetKey"]){
            $totsetid = $themeConfig["sets"][$cube["localTotSetKey"]]["setid"];
        } else {
            $sideDim = false;
            $totsetid = "null";
        }
        //$sqlDimJson = safeStringSQL($cube["dimNames"]);

        $sql = "select * from cubes where themeid=$themeId and ckey=$sqlCkey";
        $result = runQuery($sql);
        if($result->num_rows==1){
            $row = $result->fetch_assoc();
            $cubeid = $row["cubeid"];
            $sql = "update cubes set themeid=$themeId, totsetid=$totsetid, name=$sqlName, units=$sqlUnits where cubeid=$cubeid";
            runQuery($sql);
        } else {
            $sql = "insert into cubes (themeid, totsetid, ckey, name, units, bardimid, stackdimid, sidedimid)
            values ($themeId, $totsetid, $sqlCkey, $sqlName, $sqlUnits, $barDimId, $stackDimId, $sideDimId)";
            $result = runQuery($sql);

            if($result) {
                $cubeid = $db->insert_id;
            } else throw new Exception("unable to insert cube");
        }
        $cube["cubeid"] = $cubeid;
        $stackOrder = 0;
        $sideOrder = 0;


        foreach($cube["components"] as $barOrder => &$bar){
            if(is_array($bar)){
                foreach($bar as $stackOrder => &$stack){
                    if(is_array($stack)){
                        foreach($stack as $sideOrder => $side){
                            saveComponent($cubeid, $side, $barOrder, $stackOrder, $sideOrder);
                        }
                    } else {
                        saveComponent($cubeid, $stack, $barOrder, $stackOrder, $sideOrder);
                    }
                }
            } else {
                saveComponent($cubeid, $bar, $barOrder, $stackOrder, $sideOrder);
            }
        }
        $componentCleanUpSql = "delete * from cubecomponents
                where cubeid=$cubeid
                and barorder>$barOrder
                and stackorder>$stackOrder
                and sideorder>$sideOrder";
        $result = runQuery($componentCleanUpSql);
    }
    //delete any left over cubes that should no longer exist
    if($deleteOldCubes){
        $result = runQuery("select ckey, cubeid from cubes where themeid=$themeId");
        while ($row = $result->fetch_assoc()){
            if(!isset($cubes[$row["ckey"]])){
                //cube is in the database that is not in our cubes array
                runQuery("delete from cubecomponenets where cubeid=".$row["cubeid"]);
                runQuery("delete from cubes where cubeid=".$row["cubeid"]);
            }
        }
    }
    function saveComponent($cubeid, $setid, $barOrder, $stackOrder, $sideOrder){
        $sql="insert into cubecomponents (cubeid, setid, barorder, stackorder, side) values($cubeid, $setid, $barOrder, $stackOrder, $sideOrder)
                on duplicate key
                update cubecomponents set setid=$setid";
        $result = runQuery($sql);
    }
}

function saveDimDef($themeId, $dimKey, $dimName, &$dimDefs){
    //save / updates the dimension definition, and saves the dimid to memory for fast future use.  Returns the dimid
    if(is_numeric($dimDefs[$dimKey])) return $dimDefs[$dimKey];
    $sqlName = safeStringSQL($dimName);
    $sqlKey = safeStringSQL($dimKey);
    $sqlJSON = safeStringSQL($dimDefs[$dimKey]);
    $sql = "insert into cubedims (themeid, dimkey, name, json) values ($themeId, $sqlKey, $sqlName, $sqlJSON) on duplicate key set name= $sqlName, json = $sqlJSON;";
    runQuery($sql);
    $result = runQuery("select dimid from cubedims where themeid=$themeId and dimkey=$sqlKey");
    $row = $result->fetch_assoc();
    $dimDefs[$dimKey] = $row["dimid"];
    return $row["dimid"];
}