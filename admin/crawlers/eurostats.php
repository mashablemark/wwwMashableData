<?php
include_once("common.php");

$fetchNew = false; //if local file exists, do not fetch latest from Eurostat again
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

    //Keeping an area of sets avoids unnecessary calls to getSet
    $themeConfig["unitsUsed"] = [];  //used to run cubes for each unit

    $dsdCodeLists = [];  //association array built over all the code's DSD with [code][list][val] structure

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
            $dimension = $xDimensions[$d]->attributes()["id"];  //uppercase listname without "CL_" prefix (e.g. "SEX")
            if($dimension!="FREQ"){
                $refNode = $xDimensions[$d]->xpath("LocalRepresentation/Enumeration/Ref")[0];
                $codeListId = (string) $refNode->attributes()["id"];  //uppercase listname with "CL_" prefex (e.g. "CL_SEX")
                $listCodes = $xmlDsd->xpath("//Codelist[@id='$codeListId']/Code");

                if(!isset($dsdCodeLists[$dimension])) $dsdCodeLists[$dimension] = ["allCodes"=>[]]; //accumulate codes (such as partial sex lists) across datasets grouped into this theme
                for($j=0;$j<count($listCodes);$j++){
                    $listCode = (string) $listCodes[$j]->attributes()["id"];
                    $name = (string) ($listCodes[$j]->xpath("Name[@lang='en']")[0]);
                    $dsdCodeLists[$dimension]["allCodes"][$listCode] = $name;
                }
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

        //2d.  parse the TSV into the $themeConfig["sets"] array of skeys => [name, data, mskey]
        while($gz && !gzeof($gz)){  //loop through the non-header rows and ingest the series
            $dataLine = gzgets($gz);
            $dataFields = explode("\t", $dataLine);
            $lineCodes = explode(",", $dataFields[0]);
            for($c=1;$c<count($dataFields);$c++){
                //point codes = all tsv codes (side & top) that uniquely determine the point (includes TIME code)
                $pointCodes = array_merge($lineCodes, [$headerFields[$c]]);

                //determine the unique facet and codes for this set.  If TIME is not the dimension across the page, this must be done for each point, else once per line
                if($c==1 || $topDim!="TIME"){
                    //codes are more permissive, and can include unit codes
                    $seriesCodes = $pointCodes;
                    array_slice($seriesCodes, $timeIndex, 1); //but not the TIME code

                    //set codes are the series codes - geocode
                    $setCodes = $seriesCodes;
                    if($geoIndex!==false) array_slice($setCodes, $geoIndex<$timeIndex?$geoIndex:$geoIndex-1, 1);

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
                                    $geoId = $geo["id"]; //either int or "null" (string)
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
                                array_push($setFacets, $dsdCodeLists[$tsvDim][$pointCodes[$index]]);
                            }
                            //set name excludes units and geo
                            //if($geoIndex!==false) array_push($seriesFacets, geoLookup($pointCodes[$geoIndex]));
                        }
                    }
                    $setKey = $themeConfig["tKey"] . ":" . implode(",", $geoId==0?$seriesCodes:$setCodes);
                    if(!isset($themeConfig["sets"][$setKey])){
                        //add mastersetkey if part of larger set
                        $themeConfig["sets"][$setKey] = [
                            "name" =>  $themeName.": ".implode("; ", $setFacets). ($geoId==0 ? "" : " - ".$geoName),
                            "units" => $unit,
                            "freqs" => [],
                            "masterkey" => ($geoId==0 && $geoIndex!==false)? $themeConfig["tKey"] . ":" . implode(",", $seriesCodes) : null
                        ];
                    }
                    if(!in_array($unit, $themeConfig["unitsUsed"])) array_push($themeConfig["unitsUsed"], $unit);
                }

                //process point
                $geoHandle = "G".$geoId;
                $time = $pointCodes[$timeIndex];
                if(!$tsvPeriod) $tsvPeriod = mdFreqFromEsDate($time);
                if(!isset($themeConfig["sets"][$setKey]["freqs"][$tsvPeriod])) $themeConfig["sets"][$setKey]["freqs"][$tsvPeriod] = [];
                if(!isset($themeConfig["sets"][$setKey]["freqs"][$tsvPeriod][$geoHandle])) $themeConfig["sets"][$setKey]["freqs"][$tsvPeriod][$geoHandle] = [];
                $mdDate = mdDateFromEsDate($time, $tsvPeriod);
                if($dataFields[$c]!=""){ //
                    $themeConfig["sets"][$setKey]["freqs"][$tsvPeriod][$geoHandle][]  = $mdDate.':'.is_numeric($dataFields[$c])?$dataFields[$c]:"null";
                }
            }
        }
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
        }
    }
    //finished saving sets and setdata

    //4.  make the cubes and cube-components
    mergeConfig($themeConfig, $dsdCodeLists);
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

    if($themeConfig["cubable"]){  //set in master $config or calculated in mergeConfig()
// the distinction of bar v. stack blurs:  what is needed is a local total (v. root total) to be a stacked (2nd dimension)
// need to crawl hierarchy to detect local totals and cubes




        if(count($themeConfig["candidates"]["barOnly"])==1){ //note: there cannot be more than 1 and still be cubable
            addCubes($themeConfig, $dsdCodeLists, $themeConfig["candidates"]["barOnly"][0], null, false, $units, $themeConfig["unitsUsed"]);  //1D cube
            for($s=0;$s<count($themeConfig["candidates"]["barStack"]);$s++){
                addCubes($themeConfig, $units, $dsdCodeLists, $themeConfig["candidates"]["barOnly"][0], $themeConfig["candidates"]["barStack"][$s]); //2D cube
            }
        } else { //no bar; stack only
            for($b=0;$b<count($themeConfig["candidates"]["barStack"]);$b++){
                addCubes($themeConfig, $dsdCodeLists, $themeConfig["candidates"]["barStack"][$b]);  //1D cube
                for($s=$b+1;$s<count($themeConfig["candidates"]["barStack"]);$s++){
                    $switch = widest($themeConfig["candidates"]["barStack"][$s])>widest($themeConfig["candidates"]["barStack"][$b]);
                    addCubes($themeConfig, $dsdCodeLists, $themeConfig["candidates"]["barStack"][$switch?$s:$b], $themeConfig["candidates"]["barStack"][$switch?$s:$b]); //2D cube
                }
            }
        }

    }
    //note: when a theme has multiple codes, each of the TSVs must have the same dimensions
    //combining codes is used when Eurostats splits the NUTS levels or male, female, and totals across several codes

    //5. save the cubes their  components
    updateCubes($themeConfig["theme"]["themeid"], $themeConfig["cubes"]);

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
    if(strlen($esDate)==4 && is_numeric($esDate)) return "A";
    if(strlen($esDate)==9 && substr($esDate, 4, 1)=="-") return "A"; //range of years
    if(strlen($esDate)==7 && substr($esDate, 4, 1)=="M") return "M";
    if(strlen($esDate)==6 && substr($esDate, 4, 1)=="Q") return "Q";
    if(strlen($esDate)==6 && substr($esDate, 4, 1)=="H") return "S";
    if(strlen($esDate)==7 && substr($esDate, 4, 1)=="-" && substr($esDate, 7, 1)=="-") return "D";
    die("unknown date format: $esDate");
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

function mergeConfig(&$themeConfig, &$dimensions){ // merges dimension into themconfig and set root, hierarchy, and sex flags
    global $cl_config;
    $themeConfig["candidates"] = ["barOnly"=>[], "barStack"=>[]];
    $tsvDims = $themeConfig["tsvDims"];
    foreach($dimensions as $cl_name => $cl){

        //1. get code list hierarchies (inline or pointer or global)
        if(isset($themeConfig["mapping"][$cl_name])){
            if(is_array($themeConfig["mapping"][$cl_name])){
                //1a. inline configuration
                //foreach($themeConfig["mapping"][$cl_name] as $attribute=>$value) $dimensions[$cl_name][$attribute] = $value;
                $dimensions[$cl_name] = $themeConfig["mapping"][$cl_name]; //should copy over structure
            } else {
                //1b. version to lookup in $cl_config
                $clVersion =  $cl_name.":".$themeConfig["mapping"][$cl_name];
                //foreach($cl_config[$clVersion] as $attribute=>$value) $dimensions[$cl_name][$attribute] = $value;
                $dimensions[$cl_name] = $cl_config[$clVersion]; //should copy structure
            }
        } elseif(isset($cl_config[$cl_name])){ //3. check for generic cl_config
            //foreach($cl_config[$cl_name] as $attribute=>$value) $dimensions[$cl_name][$attribute] = $value;
            $dimensions[$cl_name] = $cl_config[$cl_name];
        }

        //check for rootCode if not already defined in (1) hierarchy or (2) as TOTAL code
        if(!isset($dimensions[$cl_name]["rootCode"])){
            if(isset($dimensions[$cl_name]["hierarchy"]) && count($dimensions[$cl_name]["hierarchy"])==1){
                foreach($dimensions[$cl_name]["hierarchy"] as $rootCode => $h2){ //just want the key = root code
                    $dimensions[$cl_name]["rootCode"] = $rootCode;
                }
            } elseif(in_array("TOTAL",$dimensions[$cl_name]["allCodes"])) {
                $dimensions[$cl_name]["rootCode"] = "TOTAL";
            }
        }
        //if $rootCode DNE create as null
        if(!isset($dimensions[$cl_name]["rootCode"])) $dimensions[$cl_name]["rootCode"] = null;

        //make hierarchy if DNE
        if(!isset($dimensions[$cl_name]["hierarchy"])){
            if($dimensions[$cl_name]["rootCode"]){
                $dimensions[$cl_name]["hierarchy"] = [$dimensions[$cl_name]["rootCode"] => [] ];
                $list =& $dimensions[$cl_name]["hierarchy"][0][$dimensions[$cl_name]["rootCode"]];
            } else {
                $dimensions[$cl_name]["hierarchy"] = [];
                $list =& $dimensions[$cl_name]["hierarchy"];
            }
            for($i=0;$i<count($dimensions[$cl_name]["allCodes"]);$i++){
                $code = $dimensions[$cl_name]["allCodes"][$i];
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
    //$themeConfig["dimensions"] = $dimensions;
    $themeConfig["cubes"] = [];
}

function addAllCubes(&$themeConfig, &$dimensions, $barListCode, $stackListCode = null, &$barBranch = false, $barParentCode = false, $units = null, $unitsCodeListName = null) {
//Adds cubes and/or sexed-cube to cubes array by setKey for bar/stack combination and for each branch of the bar.  Cube components are created as an associative sub-array of msKeys, shortname, and ordering info
//note:  must make a separate cube for each val in codeList[$themeConfig["indexUnit"]
//note:  cube units taken from first set's units
//a separate cube must be made for each val in unspoken for dimensions (excluding units, geo, and time)

    if(!$barParentCode){ //starting from the bottom
        $barBranch =& $dimensions[$barListCode]["hierarchy"];
    }
    if(count($barBranch)>1){
        //have cube: add it (and sexy cube if theme.sexMF)!
        $cKey = $themeConfig["tKey"].":".$barListCode.($barParentCode?"~".$barParentCode:"").($stackListCode?",".$stackListCode:"").",";
        $cubeName = "by ".$dimensions[$barListCode]["name"].($stackListCode?" by ".$dimensions[$stackListCode]["name"]:"");
        $themeConfig["cubes"][$cKey] = ["cKey"=>$cKey, "name"=> $cubeName, "components"=>[], "dimnames"=>["bar"=>[],"stack"=>[], "side"=>[]] ];
        if($themeConfig["sexMF"]){
            $themeConfig["cubes"][$cKey."sex"] = ["cKey"=>$cKey."sex", "name"=> $cubeName." by sex", "components"=>[], "dimnames"=>["bar"=>[],"stack"=>[], "side"=>[]] ];
        }
        //prep the mapset codes with rootCodes; bar and stack will be filled in / overwritten for each cube component
        $tsvDims = $themeConfig["tsvDims"];
        $msCodesTemplate = $tsvDims;
        for($i=0;$i<count($msCodesTemplate);$i++){ //
            if($msCodesTemplate[$i]!="TIME"&&$msCodesTemplate[$i]!="GEO"){
                if(count($dimensions[$msCodesTemplate[$i]]["hierarchy"])==1){
                    foreach($dimensions[$msCodesTemplate[$i]]["hierarchy"] as $key => $val){
                        $msCodesTemplate[$i] = is_array($val)?$key:$val;
                    }
                }
            }
        }
        $barIndex = array_search($barListCode, $tsvDims);
        $stackIndex = array_search($barListCode, $tsvDims);
        $sexIndex = array_search("SEX", $tsvDims);

        //add cube components by looping through bar and stack (if stack exists)
        $barOrder = 0;
        $stackOrder = "null";  //overwritten in stack loop if needed
        foreach($barListCode as $index => $val){
            $barCode = is_array($val)?$index:$val;  //code may be the or the value in a hierarchy
            //figure out the mapset codes (in order) to derive the msKey for binding the cube-component
            $msCodesTemplate[$barIndex] = $barCode;
            $barName = shortenName( $dimensions[$barListCode]["allCodes"]);
            $themeConfig["cubes"][$cKey]["dimnames"]["bar"][$barOrder] = $barName;
            if($themeConfig["cubes"][$cKey."sex"]){
                $themeConfig["cubes"][$cKey."sex"]["dimnames"]["bar"][$barOrder]= $barName;
                $themeConfig["cubes"][$cKey."sex"]["dimnames"]["side"][0]= $dimensions["CL_SEX"]["allCodes"]["M"];
                $themeConfig["cubes"][$cKey."sex"]["dimnames"]["side"][1]= $dimensions["CL_SEX"]["allCodes"]["F"];
            }
            if($stackListCode){
                $stackOrder = 0;
                $stackChildren =& $dimensions[$stackListCode]["hierarchy"][$dimensions[$stackListCode]["rootCode"]];
                foreach($stackChildren as $stackKey=>$stackVal){

                    $stackCode = is_array($stackVal)? $stackKey : $stackVal;
                    $msCodesTemplate[$stackIndex] = $stackCode;
                    $stackName = shortenName($dimensions[$stackListCode]["allCodes"][$stackCode]);
                    $themeConfig["cubes"][$cKey]["dimnames"]["bar"][$stackOrder]= $stackName;
                    if($themeConfig["cubes"][$cKey."sex"])$themeConfig["cubes"][$cKey."sex"]["dimnames"]["bar"][$stackOrder] = $stackName;

                    addCubeComponent($themeConfig, $cKey, $msCodesTemplate, $barOrder, $stackOrder, null);
                    if($themeConfig["sexMF"]){ //add sexy stacked cube components (M & F)
                        $msSexyCodes = $msCodesTemplate; //make a copy
                        $msSexyCodes[$sexIndex] = "M";
                        addCubeComponent($themeConfig, $cKey."sex", $msSexyCodes, $barOrder, $stackOrder, 0);
                        $msSexyCodes[$sexIndex] = "F";
                        addCubeComponent($themeConfig, $cKey."sex", $msSexyCodes, $barOrder, $stackOrder, 1);
                    }
                    $stackOrder++;
                }
            } else {
                //bar cube
                addCubeComponent($themeConfig, $cKey, $msCodesTemplate, $barOrder);
                if($themeConfig["sexMF"]){ //add sexy bar cube components (M & F)
                    $msSexyCodes = $msCodesTemplate; //make a copy
                    $msSexyCodes[$sexIndex] = "M";
                    addCubeComponent($themeConfig, $cKey."sex", $msSexyCodes, $barOrder, null, "L");
                    $msSexyCodes[$sexIndex] = "F";
                    addCubeComponent($themeConfig, $cKey."sex", $msSexyCodes, $barOrder, null, "R");
                }
            }
            $barOrder++;
        }
    }
    //check for sub hierarchies
    foreach($barBranch as &$val){
        //is key int or a code?
        if(is_array($val)){
            addCubes($themeConfig, $units, $dimensions, $barListCode, $stackListCode, $val, $index);  //call recursively until no more sub arrays
        }
    }
}

function addCubeSets(&$themeConfig, &$dimensions, $bar_dim, &$bar_branch, $stack_dim = false, &$stack_branch = false, $side_dim = false, &$side_branch = false){
    //add a single cube and all it components

    //determine $bar_codes, $stack_codes & sid
    if(count($bar_branch)==1){ //bars can be hierarchy (passed as assoc. branch) or non-hierarchy (passed as array)
        foreach($bar_branch as $bar_local_root=>$bar_leaves);
    } else {
        $bar_local_root = false;
        $bar_leaves = $bar_branch;
    }
    $bar_codes = [];
    foreach($bar_leaves as $key=>$val) {
        $bar_codes[] = is_integer($key)?$val:$key;
        if(!is_integer($key) && count($val)>1){
            //recurse for each sub-branch!!
            $subBranch = [$val => $key];
            addCubeSets($themeConfig, $bar_dim, $subBranch, $stack_dim, $stack_branch, $side_dim, $side_branch);
        }
    }

    if($stack_dim && $stack_branch){ //stack must be a hierarchy (local or root) and must be passed as a assoc. branch
        foreach($stack_branch as $stack_local_root=>$stack_leaves);
        $stack_codes = [];
        foreach($stack_leaves as $key=>$val) $stack_codes[] = is_integer($key)?$val:$key;

    }
    if($side_dim && $side_branch){
        if(count($side_branch)==1){ //sex can be hierarchy (passed as assoc. branch) or ["M","F"] array
            foreach($side_branch as $side_local_root=>$side_codes);
        } else {
            $side_local_root = false;
            $side_codes = $bar_branch;
        }
    }

    //determine the left out dims and the dims that determine a set key.
    $left_out_dims = []; $set_dims = [];
    foreach($themeConfig["tsvdims"] as $dimIndex=>$tsvdim){
        if($dimIndex!==$themeConfig["geoIndex"] && $dimIndex!==$themeConfig["timeIndex"]){  //unitsIndex will be in there, but gets special treatment // && $dimIndex!==$themeConfig["unitIndex"]){
            $set_dims[] = $tsvdim;
            if($tsvdim!==$bar_dim && $tsvdim!==$stack_dim && $tsvdim!==$side_dim){
                $left_out_dims[] = $tsvdim;
            }
        }
    }


    function addCubesOverLeftOutDims() use (&$themeConfig, &$dimensions, $bar_dim, $bar_local_root, $bar_code, $stack_dim, $stack_local_root, $stack_code, $side_dim, $side_local_root, $side_code, $left_out_dims) {
        //there will be an cube for each combination of left_out_dim codes
        if(count($left_out_dims)==0){
            //add cube as is
        } else {
            $firstLeftIndex = array_search($left_out_dims[0], $set_dims);
            foreach($dimensions[$left_out_dims[0]]["allCodes"] as $firstLeftOutCode){

            }
            if(count($left_out_dims)==1){
                //this cube
            } else {
                $secondLeftIndex = array_search($left_out_dims[1], $set_dims);
                foreach($dimensions[$left_out_dims[0]]["allCodes"] as $secondLeftOutCode){
                    if(count($left_out_dims)==2){
                        //this cube

                    } else {
                        //DO NOTHING:  CAN'T HANDLE BAR CUBE WITH 3 LEFT OUT DIMENSIONS!!!
                    }

                }
            }
        }
    }


    foreach($bar_codes as $bar_code){
        //fresh start!
        $totSetKeyParts = [];
        $cubeKeyParts = [];
        $cubeComponentParts = [];
        $cubeNameQualifiers = [];  //used list the non root qualifiers (different than the dimensions)

        //set bar_code
        $barIndex = array_search($bar_dim, $set_dims);
        $totSetKeyParts[$barIndex] = $bar_code;
        $cubeKeyParts[$barIndex] = $bar_dim;
        $cubeComponentParts[$barIndex] = $bar_code;
        if($bar_local_root){
            if($dimensions[$bar_dim]["rootCode"]!==$bar_local_root){
                $cubeKeyParts[$barIndex]  .=  ">" . $bar_local_root;
                $cubeNameQualifiers[$barIndex] = "; ". $dimensions[$bar_dim]["allCodes"][$bar_code];
            }
        } else {
            $totSetKeyParts = false;
            $cubeNameQualifiers[$barIndex] = "";
        }

        if($stack_dim){
            foreach($stack_codes as $stack_code){
                //set set code
                $stackIndex = array_search($stack_dim, $set_dims);
                if($totSetKeyParts) $totSetKeyParts[$stackIndex] = $stack_code;
                $cubeKeyParts[$stackIndex] = $stack_dim;
                $cubeComponentParts[$stackIndex] = $stack_code;
                if($dimensions[$stack_dim]["rootCode"] !== $stack_local_root){
                    $cubeKeyParts[$stackIndex] .= ">".$stack_local_root;
                    $cName =
                }
                if($side_dim){
                    //set side code
                    $side_index = array_search($side_dim, $set_dims);
                    $totSetKeyParts[$stackIndex] = $stack_code;
                    $cubeKeyParts[$stackIndex] = $stack_dim;
                    $cubeComponentParts[$stackIndex] = $stack_code . ($dimensions[$stack_dim]["rootCode"]===$stack_local_root?"":">".$stack_local_root);

                    //loop through left_outs and make cubes for BAR + STACK + SIDE
                    addCubesOverLeftOutDims();
                } else{
                    //loop through left_outs and make cubes for BAR + STACK
                    addCubesOverLeftOutDims();
                }
            }
        } elseif($side_dim){
            //set sex code

            //loop through left_outs and make cubes for BAR + SIDE
            addCubesOverLeftOutDims();
        } else {
            //loop through left_outs and make cubes for BAR
            addCubesOverLeftOutDims();
        }
    }

    foreach($set_dims as $i=>$set_dim){
        if(in_array($set_dim, $left_out_dims)){
            if($totSetKeyParts){
                if($dimensions[$set_dim][])
            }
            $totSetKeyParts[$i] = ;
            $cubeComponentParts[$i] = ;
        } elseif($set_dim==$bar_dim){

        } elseif($set_dim==$stack_dim){

        } elseif($set_dim==$side_dim){

        } else logEvent("Eurostat error", "$set_dim not found in dims in addCubeSet");
    }

    //determine starting cube name
    $cName = $themeConfig["theme"]["name"];
    $themeConfig["cubes"][$cKey] = ["name"]
    foreach($bar_codes as $bar_code){ //every cube must have a bar
        if($stack_dim&&$side_codes){
            foreach($stack_codes as $stack_code){
                if($side_dim&&$side_codes){

                }
            }
        } elseif($side_dim&&$side_codes){


        }
    }
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

function addCubeComponent(&$themeConfig, $cKey, $msCodes, $barOrder, $stackOrder=null, $side=null){
//adding a component
    $timeIndex = $themeConfig["timeIndex"];
    $geoIndex = $themeConfig["geoIndex"];
    array_slice($msCodes, $geoIndex, 1);
    array_slice($msCodes, $timeIndex<$geoIndex?$timeIndex:$timeIndex-1, 1);
    $mskey = $themeConfig["tKey"].":".implode(",", $msCodes);
    array_push($themeConfig["cubes"][$cKey]["components"],
        [
            "mapsetid"=>$themeConfig["mapsets"][$mskey]["mapsetid"],
            "mskey"=> $mskey,
            "barorder"=> $barOrder,
            "stackorder"=> $stackOrder,
            "side"=>$side
        ]
    );
}

function getCatidsFromEsCodes($esCodes, $api_row){  //returns array of catids and create cats as needed
    global $xmlTOC;
    $catids = [];
    foreach($esCodes as $code){
        $leaves = $xmlTOC->xpath("//leaf[code='$code']");
        for($j=0;$j<count($leaves);$j++){  //multiple leaves can have same code = multihoming!
            $catids = getEsCatId($leaves[$j], $api_row);
            array_push($catids, $catid);
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
    if($catids = fetchCat($apiid, $code)) return $catids;


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
        while($cat_row = $result->fetch_assoc()) array_push($catids, $cat_row["catid"]);
        return $catids;
    } else {
        //otherwise
        if(!$parentCatId&&!$title){
            //  2a.insert if title and parentCatid passed
            $title = safeSqlFromString($title);
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

function updateCategorySeries(&$series, $catids){  //does guarentee removal of invalid cat/series id pairs.
    foreach($series as $skey => &$serie){
        foreach($catids as $catid){
            $sql = "insert into categoryseries (catid, seriesid) values ($catid, $serie[seriesid]) on duplicate key update catid=$catid";
            runQuery($sql);
        }
    }
}

//TODO: move to crawlers/index.php
function iso2Lookup($iso2LetterCode, $set = "ALL"){
    static $geos = "null";
    if($geos=="null"){
        $geos = array();
        $geos_sql = "select geoid, name, iso3166_2 from geographies where iso3166_2 is not null";
        $result = runQuery($geos_sql);

        while($row=$result->fetch_assoc()){
            $geos[$row["iso3166_2"]] = ["name"=>$row["name"], "geoid"=>$row["geoid"]];
        }
    }

    if(isset($geos[$iso2LetterCode])){
        return $geos[$iso2LetterCode];
    } else {
        return null;
    }
}

//TODO: move to crawlers/index.php
function  updateCubes($themeid, &$cubes, $deleteOldCubes = true){
    global $db;
    foreach($cubes as $cKey=> &$cube){
        $sqlName = safeStringSQL($cube["name"]);
        $sqlUnits = safeStringSQL($cube["units"]);
        $sqlCkey = safeStringSQL($cube["ckey"]);
        $sqlDimJson = safeStringSQL(json_encode($cube["dimnames"]));

        $sql = "select * from cubes where themeid=$themeid and ckey=$$sqlCkey";
        $result = runQuery($sql);
        if($result->num_rows==1){
            $row = $result->fetch_assoc();
            $cubeid = $row["cubeid"];
            $sql = "update cubes set name=$themeid, units=$sqlUnits, dimnames==$sqlDimJson";
            runQuery($sql);
        } else {
            $sql = "insert into cubes (themeid, ckey, name, units, dimsjson) values ($themeid, $sqlCkey, $sqlName, $sqlUnits, $sqlDimJson)";
            $result = runQuery($sql);
            if($result) {
                $cubeid = $db->insert_id;
            } else throw new Exception("unable to insert cube");
        }
        $cube["cubeid"] = $cubeid;
        $cubeMapsets = [];
        foreach($cube["components"] as $component){
            $side = safeStringSQL($component["side"]);
            $sql="inssert into cubecomponents (cubeid, mapsetid, barorder, stackorder, side) values($cubeid, $component[mapsetid], $component[barorder], $component[stackorder], $side)
                on duplicate key
                update cubecomponents set barorder=, stackorder=$component[stackorder], side=$side  where cubeid=$cubeid and mapsetid=$component[mapsetid]";
            $result = runQuery($sql);
            array_push($cubeMapsets, $component["mapsetid"]);
        }
        $result = runQuery("select mapsetid from cubecomponents where cubeid=$cubeid");
        while($row = $result->fetch_assoc()){
            if(!in_array($row["mapsetid"], $cubeMapsets)){  //this cube component is not in our cubes array
                runQuery("delete from cubecomponenets where mapsetid=$row[mapsetid] and cubeid=$row[cubeid]");
            }
        }

    }
    //delete any left over cubes that should no longer exist
    if($deleteOldCubes){
        $result = runQuery("select ckey, cubeid from cube where themeid=$themeid");
        while ($row = $result->fetch_assoc()){
            if(!isset($cubes[$row["ckey"]])){
                //cube is in the database that is not in our cubes array
                runQuery("delete from cubecomponenets where cubeid=".$row["cubeid"]);
                runQuery("delete from cubes where cubeid=".$row["cubeid"]);
            }
        }
    }
}