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

function ApiCrawl($catid, $api_row){
    global $ingest;
    $apiid = $api_row["apiid"];
    foreach($ingest as $code => $settings){
        ApiBatchUpdate(null, "all", $api_row, $code, $settings);

    }

}
function ApiBatchUpdate($since, $periodicity, $api_row, $code = false, $settings = false){
    global $ingest, $xmlTOC, $fetchNew, $dsdFolder, $tsvFolder;

    $mapsets = []; //mskey => [name, units] : build as we ingest to avoid creating mapsets that do not need to exist
    $series = []; //INGESTED ASSOC ARRAY: skey => [seriesname, keys (array), geoid, mskey, units, data (MD formatted string)]
    $code_lists = []; //ingested from config files and/or DSD.  CL_code is main key.  Each code list is an assoc array with name, total, hierachy, widest
    $dsdCodeLists = [];  //association array built over all the code's DSD with [code][list][val] stucture

    $apiid = $api_row["apiid"];
    //1. determine code
    if(isset($_REQUEST["code"])){ //allow a single variable group to be ingested from the command line
        $code = $_REQUEST["code"];
    }
    if($code === false) return false;

    //1. find configuration in $ingest
    $themeConfig = false;
    for($i=0;$i<count($ingest);$i++){
        if(in_array($code, $ingest[$i]["codes"])){
            $themeConfig = $ingest[$i];
            break;
        }
    }
    if($themeConfig === false) return false;

    //get / set the themeid
    $themeName = isset($themeConfig["theme_name"])?$themeConfig["theme_name"]:$title;
    $tKey = implode("+", $themeConfig["codes"]);
    $themePeriod = false;
    $theme = getTheme($apiid, $themeName, "For complete metadata, see <a target=\"_blank\" href=\"$metadataLink\">$metadataLink</a>",$tKey);

    //2. loop through codes
    for($i=0;$i<count($themeConfig["codes"]);$i++){
        //2a. get the code leaf in TOC
        $leaves = $xmlTOC->xpath("//leaf[code='$code']");
        if(count($leaves)===0){
            print("TOC leaf for $code not found");
            return false;
        }
        $leaf = $leaves[0];
        $title = $leaf->xpath("title[@language='en']")[0];
        $metadataLink = $leaf->xpath("metadata[@format='html']")[0];
        $tsvLink = $leaf->xpath("downloadLink[@format='tsv']")[0];
        $tocUnits = $leaf->xpath("unit[@language='en']")[0];
        $unit = (isset($themeConfig["units"])&&!is_array($themeConfig["units"]))?$themeConfig["units"]:$tocUnits;  //unit logic priority: 1. explicit settings, 2. master TOC, 3. CL_UNIT, 4. CL_CURRENCY


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
            print("unable to parse DSD file");
            return false;
        }

        //load the dataset's dimensions (code lists) from the DSD into a single associative array $dsdCodeLists
        $dimensions = $xmlDsd->xpath("//Dimension");
        for($d=0;$d<count($dimensions);$d++){
            $dimension = $dimensions[$d]->attributes()["id"];
            if($dimension!="FREQ"){
                $refNode = $dimensions[$d]->xpath("LocalRepresentation/Enumeration/Ref")[0];
                $codeListId = (string) $refNode->attributes()["id"];
                $listCodes = $xmlDsd->xpath("//Codelist[@id='$codeListId']/Code");

                if(!isset($dsdCodeLists[$dimension])) $dsdCodeLists[$dimension] = ["allCodes"=>[]]; //acculuate codes (such as partial sex lists) across grouped datasets
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
        $topDim = $sideAndTop[1]; //mostly "time" and "geo", but could be any list
        $sideDims = explode(",", $sideAndTop[0]);
        $tsvDims = $sideDims; array_push($tsvDims, $topDim);
        if(!in_array("TIME", $tsvDims)){
            print("$code does not have a time dimension<br>");
            return false;
        }
        //index of geo, freq, and lookup table
        $timeIndex = array_search("TIME", $tsvDims);
        $geoIndex = array_search("GEO", $tsvDims);
        $unitIndex = null;
        $dimIndexLookup = [];
        for($j=0;$j<count($tsvDims);$j++){
            $dimIndexLookup[$tsvDims[$j]] = $j;
        }

        //2d.  parse the TSV into the $series array of skeys => [name, data, mskey]
        while($gz && !gzeof($gz)){  //loop through the non-header rows and ingest the series
            $dataLine = gzgets($gz);
            $dataFields = explode("\t", $dataLine);
            $lineCodes = explode(",", $dataFields[0]);
            for($c=1;$c<count($dataFields);$c++){
                //point codes = all tsv codes (side & top) that uniquely determine the point (includes TIME code)
                $pointCodes = $lineCodes; array_push($pointCodes, $headerFields[$c]);

                //determine the unique facet and codes for this series and mapset.  When TIME is not the dimension across the page, this must be done for each point
                if($c==1 || $topDim!="TIME"){
                    //codes are more permissive, including unit codes
                    $seriesCodes = $pointCodes; array_slice($seriesCodes, $timeIndex, 1);
                    $mapsetCodes = $seriesCodes;
                    if($geoIndex!==false) array_slice($mapsetCodes, $geoIndex<$timeIndex?$geoIndex:$geoIndex-1, 1);
                    //facets are the english language equivalents, and exclude units (since units has its own special field and display)
                    $setFacets = [];
                    $seriesFacets = [];

                    for($index=0;$index<count($tsvDims);$index++){
                        if($index!==$timeIndex){ //skip time
                            if($index===$geoIndex){
                                $geo = geoLookup($pointCodes[$index]);
                                $geoName = $geo["name"];
                                $geoId = $geo["id"]; //either int or "null" (string)
                            } else {
                                //unit logic priority (continued): 1. explicit settings, 2. master TOC, 3. CL_UNIT, 4. CL_CURRENCY
                                if(isset($themeConfig["units"])){  //note:  if $themeConfig["units"] is a string, it has already been set
                                    if(is_array($themeConfig["units"]) && isset($themeConfig["units"][$pointCodes[$index]])){
                                        $unit = $themeConfig["units"][$pointCodes[$index]];
                                    }
                                } elseif(in_array("UNIT", $tsvDims)){
                                    if($tsvDims[$index]=="UNIT"){
                                        $unitIndex = $index;
                                        $unit = $dsdCodeLists[$tsvDims[$index]][$pointCodes[$index]];
                                    }
                                } elseif(in_array("CURRENCY", $tsvDims)){
                                    if($tsvDims[$index]=="CURRENCY"){
                                        $unitIndex = $index;
                                        $unit = $dsdCodeLists[$tsvDims[$index]][$pointCodes[$index]];
                                    }
                                }
                                //mapset's name excludes GEO and units (series name = set name with geoname appended
                                if($unitIndex!==$index) array_push($setFacets, $dsdCodeLists[$tsvDims[$index]][$pointCodes[$index]]);
                            }
                            //set name excludes units and geo
                            //if($geoIndex!==false) array_push($seriesFacets, geoLookup($pointCodes[$geoIndex]));
                        }
                        $seriesCodesPart = implode(",", $seriesCodes);
                        $sKey = $tKey . ":" . $seriesCodesPart;
                        if(!isset($series[$sKey])){
                            $series[$sKey] = [
                                "name" =>  $themeName.": ".implode("; ", $setFacets),
                                "units" => $unit,
                                "data"=>"",
                                "geo" => null
                            ]; //firstdt, lastdt will be added as the points are appended to data
                            //add geo specific properties and modifiers to series + add mapset is not set
                            if($geoIndex!==false){
                                $msKey = $tKey.":".implode(",", $mapsetCodes);
                                $series[$sKey]["name"] .= " - " . $geoName;
                                $series[$sKey]["mskey"] = $msKey;
                                $series[$sKey]["geoid"] = $geoId;
                                if(!isset($mapsets[$msKey])){
                                    $mapsets[$msKey] = [
                                        "name" => $themeName.": ".implode("; ", $setFacets),
                                        "units" => $unit
                                    ];  //mapsetid added after entire tsv parsed into series and mapsets
                                }
                            }
                        }
                    }
                }
                //process point
                $time = $pointCodes[$timeIndex];
                if(!$themePeriod) $themePeriod = mdFreqFromEsDate($time);
                $mdDate = mdDateFromEsDate($time, $themePeriod);
                $unixDate = unixDateFromMd($mdDate);
                if(!isset($series[$sKey]["firstdt"])){
                    $series[$sKey]["firstdt"] = $unixDate * 1000;
                } else {
                    $series[$sKey]["data"] .= "||";
                }
                $series[$sKey]["data"] .= $mdDate."|".$dataFields[$c];
                $series[$sKey]["lastdt"] = $unixDate * 1000;
            }
        }
        //3.  save/get the mapsetids into the array structure for lookup
        foreach($mapsets as $msKey => $mapset){
            $mapsetid = getMapSet($mapset["name"], $apiid, $themePeriod, $mapset["units"], null, $theme["themeid"], $mapset["msKey"]);
            $mapsets[$msKey]["mapsetid"] = $mapsetid;
        }
        //4.  save/update the series (with mapsetid)
        foreach($series as $sKey => $serie){
            updateSeries(
                $status,
                $jobid,
                $serie["mskey"],
                $serie["name"],
                "Eurostats",
                "", //url
                $themePeriod,
                $serie["units"],
                $serie["units"],
                "",  //notes
                $themeName,
                $apiid,
                themeDate,
                $serie["firstdt"],
                $serie["lastdt"],
                $serie["data"],
                $serie["geoid"],
                isset($serie["mskey"])?$mapsets[$serie["mskey"]]["mapsetid"]:null,
                null, null, null, //pointsetid, lat, lon
                $theme["themeid"]
            );
        }
    }
    mergeConfig($themeConfig, $dimensions)
    //5.  save/update the cubes and cube-components
    //note: when a theme has multiple codes, each of the TSVs should have the same dimensions, such as when Eurostats split the geography nuts levels or male,female/total across several codes

    //5a. get the list of potential cube dims = TSV dims excluding time & geo
    array_splice($tsvDims, $timeIndex, 1);
    if($geoIndex!==false) array_slice($tsvDims, $geoIndex<$timeIndex?$geoIndex:$geoIndex-1, 1);

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
    $fp = fopen($dsdFolder.$code.".dsd.xml", "w");
    $options = array(
        CURLOPT_FILE    => $fp, //output to to window if not defined
        CURLOPT_TIMEOUT =>  200, // set this to 8 hours so we dont timeout on big files
        CURLOPT_URL     => $dsdRootUrl.$code
    );

    $ch = curl_init();
    curl_setopt_array($ch, $options);
    curl_exec($ch);
}

function getCatId($node){
    global $xmlTOC, $apiid;

    $codeNodes = $node->xpath("code");
    if(count($codeNodes)!==1) return false;
    $code = (string) $codeNodes[0];
    print(" > ".$code);

    //check if catCode exists
    if($catid = fetchCat($apiid, $code)) return $catid;


    //if not, get info needed to
    $titleNodes =  $node->xpath("title[@language='en']");
    if(count($titleNodes)!==1) return false;
    $catTitle = (string) $titleNodes[0];

    $parentNodes =  $node->xpath("../..");
    if(count($parentNodes)!==1) return false;
    $parentNode = $parentNodes[0];

    $parentCodeNodes = $parentNode->xpath("code");
    if(count($parentCodeNodes)!==1) return false;
    $parentCode = (string) $parentCodeNodes[0];


    $parentCatid = getCatId($parentNode);
    if($parentCatid){
        return fetchCat($apiid, $code, $catTitle, $parentCode);
    } else {
        return false;
    }


}

function fetchCat($apiid, $code, $title=false, $parentCatid=false){
    //1. check if exists, return catid
    if($code=="data") return 1234; //rootid
    //otherwise
    //  2a.insert if title and parentCatid passed
    //  2.b return false
    return $parentCatid;
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
            return substr(trim($esDate), 0, 4) . sprintf("%20d", intval(substr($esDate, 5, 2))-1);
        case "W":
            //TODO: verify Eurostats weekly (and Q and H and D) format correct the formula below
            return substr(trim($esDate), 0, 4) . sprintf("%20d", intval(substr($esDate, 5, 2)));
        case "Q":
            return trim($esDate);
        case "H":
            return substr(trim($esDate), 0, 4) . "S" . substr($esDate, 5, 1);
        default:  //"D"
            return substr(trim($esDate), 0, 4) . sprintf("%20d", intval(substr($esDate, 5, 2))-1). sprintf("%20d", intval(substr($esDate, 5, 2)));
    }
}

function mergeConfig(&$themeConfig, &$dimensions){ // merges config into dsdCL, searches for total…
    global $cl_config;
    $themeConfig["candidates"] = ["barOnly"=>[], "barStack"=>[]];
    foreach($dimensions as $cl_name => $cl){
        //1.check $themeConfig
        if(isset($themeConfig["mapping"][$cl_name])){
            if(is_array($themeConfig["mapping"][$cl_name])){
                //1a. inline configuration
                foreach($themeConfig["mapping"][$cl_name] as $attribute=>$value) $dimensions[$cl_name][$attribute] = $value;
            } else {
                //1b. version to lookup in $cl_config
                $clVersion =  $cl_name.":".$themeConfig["mapping"][$cl_name];
                foreach($cl_config[$clVersion] as $attribute=>$value) $dimensions[$cl_name][$attribute] = $value;
            }
        } elseif(isset($cl_config[$cl_name])){ //3. check for generic cl_config
            foreach($cl_config[$cl_name] as $attribute=>$value) $dimensions[$cl_name][$attribute] = $value;
        }
        //check for rootCode if not already defined in (1) hierarchy or (2) as TOTAL code
        if(!isset($dimensions[$cl_name]["rootCode"])){
            if(isset($dimensions[$cl_name]["hierarchy"]) && count($dimensions[$cl_name]["hierarchy"])==1){
                foreach($dimensions[$cl_name]["hierarchy"] as $rootCode => $h2){
                    $dimensions[$cl_name]["rootCode"] = $rootCode;
                }
            } elseif(in_array("TOTAL",$dimensions[$cl_name]["allCodes"])) {
                $dimensions[$cl_name]["rootCode"] = "TOTAL";
            }
        }
        if(!isset($dimensions[$cl_name]["rootCode"])) $dimensions[$cl_name]["rootCode"] = null;

        //make hierarchy if DNE
        if(!isset($dimensions[$cl_name]["hierarchy"])){
            if(isset($dimensions[$cl_name]["rootCode"])){
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
        //bar or stack?
        if($dimensions[$cl_name]["rootCode"]!==null){
            if(count($dimensions[$cl_name]["hierarchy"][0][$dimensions[$cl_name]["rootCode"]])>1)  array_push($themeConfig["candidates"]["barStack"], $cl_name);
        } else {
            if(count($dimensions[$cl_name]["hierarchy"])) array_push($themeConfig["candidates"]["barOnly"], $cl_name);
        }
    }
    if(count($themeConfig["candidates"]["barOnly"])>1 || count($themeConfig["candidates"]["barOnly"])+count($themeConfig["candidates"]["barStack"])>0 ) $themeConfig["cubable"] = false;
    $themeConfig["cubes"] = [];
    if(isset($mergedCL["CL_SEX"])){
        $themeConfig["sexTotal"] = in_array("T", $mergedCL["CL_SEX"]["allCodes"]);
        $themeConfig["sexMF"] = in_array("M", $mergedCL["CL_SEX"]["allCodes"]) && in_array("F", $mergedCL["CL_SEX"]["allCodes"]);
    } else {
        $themeConfig["sexTotal"] = false;
        $themeConfig["sexMF"] = false;
    }
}

function addCubes(&$themeConfig, &$dimensions, $barListName, $stackListName, $barParentCode = false) {  //adds a cube and/or sexed-cube with components array of msKeys to cubes array be cKey for each branch of the bar
    if(!$barParentCode){
        if($dimensions[$barListName][])

    } else {
        $barCodes = $dimensions[$barListName];
    }

}
function addCube(){
    $tsvDims = $themeConfig["tsv"];

}

function widestSet(&$mergedDsdCL, $CL){}  // ⇐ needed given NextLevel?
function nextLevel(&$mergedDsdCL, $CL, $parentCode=false) {  //ignores total code and excluded, returning array of codes or false

}
