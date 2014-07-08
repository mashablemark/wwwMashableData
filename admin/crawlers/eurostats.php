<?php

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
    global $ingest;
    global $xmlTOC, $fetchNew, $dsdFolder, $tsvFolder;
    $apiid = $api_row["apiid"];
    //1. determine code
    if(isset($_REQUEST["code"])){ //allow a single variable group to be ingested from the command line
        $code = $_REQUEST["code"];
    }
    if($code === false) return false;

    //1. find configuration in $ingest
    $setConfig = false;
    for($i=0;$i<count($ingest);$i++){
        if(in_array($code, $ingest[$i]["codes"])){
            $setConfig = $ingest[$i];
            break;
        }
    }
    if($setConfig === false) return false;

    //2. loop through codes
    $mapsets = []; //key = name+units : build as we ingest to avoid creating mapsets that do not need to exist
    $data = []; //INGESTED ASSOC ARRAY: [seriesname, keys (array), geoid, mapsetid, unit, data (MD formatted string)
    $dsdCodeLists = [];
    for($i=0;$i<count($setConfig["codes"]);$i++){
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
        $units = $leaf->xpath("unit[@language='en']")[0];


        $themeName = isset($setConfig["theme_name"])?$setConfig["theme_name"]:$title;
        getTheme($apiid, $themeName, "<a href=\"$metadataLink\">$metadataLink</a>",implode("+", $setConfig["codes"]));

        //2b. get the DSD = DIMENSIONS AND PARSE CODELISTS
        if($fetchNew || !file_exists($dsdFolder.$code.".dsd.xml")){
            getDsd($code);
        }
        //READ DSD'S DIMENSIONS AND PARSE CODELISTS
        if($fetchNew || !file_exists($dsdFolder.$code.".dsd.xml")){
            getDsd($code);
        }
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
        //2c. get the TSV data file and detect the codelist order across and down
        getTSV($code, $fetchNew);
        $gz = gzopen($tsvFolder . $code.".tsv.gz", "r");
        //fetch the first row and decode the dimension
        $headerLine = gzgets($gz);
        $headerFields = explode("\t", $headerLine);
        $cellA1 = strtoupper($headerFields[0]);
        $sideAndTop = explode("\\", $cellA1);  // \\ = escaped \
        $topDim = $sideAndTop[1]; //mostly "time" and "geo", but could be any list
        $sideDims = explode(",", $sideAndTop[0]);
        $tsvDims = $sideDims;
        array_push($tsvDims, $topDim);
        if(!in_array("TIME", $tsvDims)){
            print("$code does not have a time dimension<br>");
            return false;
        }
        $indexTime = array_search("TIME", $tsvDims);
        $indexGeo = array_search("GEO", $tsvDims);

        //load the dataset's dimensions (code lists) from the DSD into a single associative array $dsdCodeLists
        $dimensions = $xmlDsd->xpath("//Dimension");
        for($k=0;$k<count($dimensions);$k++){
            $dimension = $dimensions[$k]->attributes()["id"];
            if($dimension!="FREQ"){
                $refNode = $dimensions[$k]->xpath("LocalRepresentation/Enumeration/Ref")[0];
                $codeListId = (string) $refNode->attributes()["id"];
                $listCodes = $xmlDsd->xpath("//Codelist[@id='$codeListId']/Code");

                if(!isset($dsdCodeLists[$dimension])) $dsdCodeLists[$dimension] = []; //acculuate codes (such as partial sex lists) across grouped datasets
                for($j=0;$j<count($listCodes);$j++){
                    $listCode = (string) $listCodes[$j]->attributes()["id"];
                    $name = (string) ($listCodes[$j]->xpath("Name[@lang='en']")[0]);
                    $dsdCodeLists[$dimension][$listCode] = $name;
                }
            }
        }

        //2d.  parse the TSV into the $data array of codes[], points[] (detect /geo or /time)
        while($gz && !gzeof($gz)){  //loop through the non-header rows and ingest the series

            $dataLine = gzgets($gz);
            $dataFields = explode("\t", $dataLine);
            $lineCodes = explode(",", $dataFields[0]);
            for($c=1;$c<count($dataFields);$c++){
                $pointCodes = $lineCodes;
                array_push($pointCodes, $headerFields[$c]);
                if($c==1 || $topDim!="TIME"){
                    //determine the unique codelist code of this series = at start and for each point when time is not the dimension across the page
                    $mapsetCodes = [];
                    $seriesCodes = [];
                    $setFacets = [];
                    $seriesFacets = [];
                    //unit logic priority: CL_UNIT, explicit settings, CL_CURRENCY
                    $unit = (isset($setConfig["units"])&&!is_array($setConfig["units"]))?$setConfig["units"]:"";
                    for($index=0;$index<count($tsvDims);$index++){
                        if($index!==$indexTime){ //skip time
                            if($index===$indexGeo){
                                $geo = geoLookup($pointCodes[$index]);
                            } else {
                                array_push($mapsetCodes, $pointCodes[$index]);
                                //unit logic priority: CL_UNIT, then explicit settings, then CL_CURRENCY
                                if($tsvDims[$index]=="UNIT") {
                                    $unit =  $dsdCodeLists[$tsvDims[$index]][$pointCodes[$index]];
                                } elseif(!in_array("UNIT", $tsvDims)) {
                                    if(isset($setConfig["units"])){
                                        if(is_array($setConfig["units"]) && isset($setConfig["units"][$pointCodes[$index]])) $unit = $setConfig["units"][$pointCodes[$index]];
                                    } elseif($tsvDims[$index]=="CURRENCY") {
                                        $unit = $dsdCodeLists[$tsvDims[$index]][$pointCodes[$index]];
                                    }
                                }
                                array_push($seriesFacets, $dsdCodeLists[$tsvDims[$index]][$pointCodes[$index]]);
                                array_push($setFacets, $dsdCodeLists[$tsvDims[$index]][$pointCodes[$index]]);
                            }
                            array_push($seriesCodes, $tsvDims[$index]);
                        }
                        if($indexGeo!==false) array_push($seriesFacets, geoLookup($pointCodes[$indexGeo]));
                        $seriesCodesPart = implode(",", $seriesCodes);
                        $themeCodesPart = implode("+", $setConfig["codes"]);
                        if(!isset($data[$seriesCodesPart])){
                            //this is a new series: determine name, mapsetname, units, mapsetid
                            $data[$seriesCodesPart] = ["data" => ""];
                            $data[$seriesCodesPart]["seriesname"] = $themeName . ": " . implode(", ", $seriesFacets);
                            $data[$seriesCodesPart]["setname"] = $themeName . ": " . implode(", ", $setFacets);
                            $data[$seriesCodesPart]["skey"] = $themeCodesPart . ":" . $seriesCodesPart;
                            $data[$seriesCodesPart]["setid"] = $themeCodesPart . ":" . implode(",", $mapsetCodes);
                        }



                $pointCodes = $lineCodes; //copy the line codes array
                array_push($pointCodes, $headerFields[$c]); //append the top (line 0) code from the collumn header
                $time = $pointCodes[$indexTime];
                array_slice($pointCodes, $indexTime, 1); //ditch the TIME code...
                $seriesCodesPart = implode(",", $pointCodes); //...to get the series Codes
                if(!isset($data[$seriesCodesPart])){

                    $data[$seriesCodesPart]["name"] = $themeName . "";
                    if($indexGeo!==false){
                        $mapsetCodes = $pointCodes;
                        array_slice($mapsetCodes, $indexGeo>$indexTime?$indexGeo-1:$indexGeo, 1);









                    }

                }
                $skey = $code."-".implode($pointCodes);
            array_chunk()
                $seriesName
            }
            //2d-1.  save/get the mapsetids into the array structure for lookup

            //2d-2.  save/update the series (with mapsetid)

            //2d-3.  save/update the theme

            //2d-4.  save/update the cubes and cube-components

        }









        $leaves = $xmlTOC->xpath("//leaf[code='$code']");




        $title = $leaf->xpath("title[@language='en']")[0];
        $metadataLink = $leaf->xpath("metadata[@format='html']")[0];
        $tsvLink = $leaf->xpath("downloadLink[@format='tsv']")[0];
        $units = $leaf->xpath("unit[@language='en']")[0];
        //fetch/make theme and last update date
        $esUpdateDate = $leaf->xpath("last_updated")[0];
        $theme = getTheme($code, $apiid);
        if($theme["updatedt"]===$esUpdateDate) return $status;

        /
        //load the dataset's dimension (code lists) from the DSD into a single associative array $codeLists
        $codeLists = [];
        $dimensions = $xmlDsd->xpath("//Dimension");
        for($k=0;$k<count($dimensions);$k++){
            $dimension = $dimensions[$k]->attributes()["id"];
            if($dimension!="FREQ"){
                $refNode = $dimensions[$k]->xpath("LocalRepresentation/Enumeration/Ref")[0];
                $codeListId = (string) $refNode->attributes()["id"];
                $listCodes = $xmlDsd->xpath("//Codelist[@id='$codeListId']/Code");

                //alternative units coding (only 1 out of 4,853 datasets have a non-blank <unit> in their DSD!!!
                //if($dimension=="CURRENCY" && $units=="") $currencyUnitsCount++; //128 out of 4,853 datasets = 2.6%
                //if($dimension=="UNIT" && $units=="") $clUnitsCount++;  //2,930 out of 4,853 datasets = 60.4%

                if($dimension=="GEO"){
                    print("$codeListId enumerating ".count($listCodes)." geographies<br>");
                }

                $codePairs = [];
                for($j=0;$j<count($listCodes);$j++){
                    $listCode = (string) $listCodes[$j]->attributes()["id"];
                    $name = (string) ($listCodes[$j]->xpath("Name[@lang='en']")[0]);
                    //print("$listCode => $name<br>");
                    $codePairs[$listCode] = $name;
                }
                $codeLists[$dimension] = $codePairs;
            }
        }
        $hasBy = strrpos($title, " by ");
        $baseName = $hasBy?substr($title, 0, $hasBy+1):$title;

        //open the data file
        getTSV($code, $fetchNew);
        $gz = gzopen($tsvFolder . $code.".tsv.gz", "r");
        //fetch the first row and decode the dimension
        $headerLine = gzgets($gz);
        $headerFields = explode("\t", $headerLine);
        $cellA1 = str_replace("/time", "", strtoupper($headerFields[0]));
        if($cellA1==$headerFields[0]){
            //if time is not the row across, what is?
            print("unknown x dimension: $cellA1<BR>");
            return false;
        }
        $tsvDims = explode(",", $cellA1);
        //loop through the non-header rows and ingest the series
        while($gz && !gzeof($gz)){
            $seriesUnits = $units;
            $seriesName = $baseName;
            $mapsetName = $baseName;
            $seriesGeoId = null;
            $dataLine = gzgets($gz);
            $dataFields = explode("\t", $dataLine);
            $seriesCodes = explode(",", $dataFields[0]);
            $skey = $code."-".trim($dataFields[0]);
            $data = [];
            $freq = null;
            for($d=0;$d<count($seriesCodes);$d++){
                if($tsvDims[$d]=="GEO"){
                    //geo is a special cube dimension
                    $geo = jvmCodeLookup($seriesCodes[$d]);
                    if($geo !== null){
                        $seriesName .= ", " . $geo["name"];
                        $seriesGeoId = $geo["geoid"];
                    } else {
                        print("geo code ". $seriesCodes[$d]." not found<br>");
                        $seriesName .= ", " . $codeLists[$tsvDims[$d]][$seriesCodes[$d]];
                    }
                } elseif($tsvDims[$d]=="UNIT" || $tsvDims[$d]=="CURRENCY") {
                    //these are ersatz units dimensions
                    $newUnits = $codeLists[$tsvDims[$d]][$seriesCodes[$d]];
                    if($seriesUnits=="") {
                        $seriesUnits = $newUnits;
                    } else {
                        print("conflicting units: $seriesUnits vs. $newUnits");
                        $seriesUnits .= ", $newUnits";
                    }
                } else {
                    //normal cube dimension
                    $seriesName .= ", " . $codeLists[$tsvDims[$d]][$seriesCodes[$d]];
                    $mapsetName .= ", " . $codeLists[$tsvDims[$d]][$seriesCodes[$d]];
                }
                for($i=1;$i<count($dataFields);$i++){
                    if(is_numeric($dataFields[$i])){
                        $esDate = $headerFields[$i];
                        if($freq) $freq = mdFreqFromEsDate($esDate);
                        $mdDate = mdDateFromEsDate($esDate, $freq);
                        array_unshift($data, $mdDate."|".$dataFields[$i]);
                    }
                }
                updateSeries(
                    $status,
                    $api_row["runid"],
                    $skey,
                    $seriesName,
                    "Eurostats",
                    $tsvLink,
                    $freq,
                    $seriesUnits,
                    $seriesUnits,
                    "",  //no series notes; all eurostats metadata at the theme level
                    $title,
                    $apiid,





                )
            }
        }
        gzclose($gz);


        print("estimated series in set v. actual: $setSeriesCount v. $tsvLineCount<br>");
    }

}





    print("Eurostats total tsv count: $eurostatSeriesEstimate<br>");
    print("Set count with explicit unit value: $explicitUnitCount<br>");
    print("Set count with CL_UNIT dimension: $clUnitsCount<br>");
    print("Set count with CL_CURRENCY dimension: $currencyUnitsCount<br>");

} else {
    print("<h2>".($_REQUEST["codes"])."</h2>");
    $codes = explode(",", $_REQUEST["codes"]);
    for($i=0; $i < count($codes);$i++){
        $code = $codes[$i];
        $leaves = $xmlTOC->xpath("//leaf[code='$code']");
        if(count($leaves)===0){
            print("$code not found");
        } else {
            $title = [];
            $metadataLink = [];
            $tsvLink = [];
            $units = [];
            print("DSD: <a href=\"$dsdRootUrl$code\">$dsdRootUrl$code</a><br>");
            for($j=0;$j<count($leaves);$j++){  //multiple leaves can have same code = multihoming!
                //GET METADATA
                $title[$j] = $leaves[$j]->xpath("title[@language='en']")[0];
                $metadataLink[$j] = $leaves[$j]->xpath("metadata[@format='html']")[0];
                $tsvLink[$j] = $leaves[$j]->xpath("downloadLink[@format='tsv']")[0];
                $units[$j] = $leaves[$j]->xpath("unit[@language='en']")[0];

                //SHOW HEADER INFO
                if($j==0){
                    print("title: ".$title[0]."<br>");
                    print("metadataLink: ".$metadataLink[0]."<br>");
                    print("<iframe src=\"".$metadataLink[0]."\" style=\"width:100%;height: 300px;\"></iframe><br>");
                    print("tsvLink: ".$tsvLink[0]."<br>");
                } else {
                    if($title[0]!=$title[$j])print("title match "); else print("MISMATCH: ".$title[$j]."<br>");
                    if($metadataLink[0]!=$metadataLink[$j])print("metadataLink match "); else print("MISMATCH: ".$metadataLink[$j]."<br>");
                    if($tsvLink[0]!=$tsvLink[$j])print("tsvLink match <br>"); else print("MISMATCH: ".$tsvLink[$j]."<br>");
                }

                print("category hierarchy: ");
                getCatId($leaves[$j]);
                print("<BR>");

            }

            getTSV($code);
            $gz = gzopen($tsvFolder . $code.".tsv.gz", "r");
            $first_line = gzgets($gz);
            /*  output JSON:
                {
                    "codes": [""],  //REQUIRED: one or more codes that will be consolidated into a single theme and a single set of mapsets
                    "name": "asdf", //overrides the TOC name.  Default is the name of codes[0] with "NUTS" references removed
                    "cl_mapping": { //provide help when
                            "tsv_shortcode1": { //one or more CL abbreviations in the first cell of the first row whose default need defining
                                "cl": "CL_NAME as in DSD",  //default = "CL_".toUpper(CL abbreviation)
                            "total":  "all ages", //default = "total"
                            "ex": ["85+"]  //list of codes to exclude from the cube viz and from ingestion
                        }
                    },
                    "cl_unit": "CL_NAME as in DSD",  //when a dimension is actually a units field
                    "units": "unit overrides all"
                    "cube": false  //defaults to true
                }
            */
            print("{<br>");
            print("    \"codes\": [\"$code\"]<br>");
            print("    \"name\": \"".$title[0]."\"<br>");
            print("    \"cl_mapping\": {\"".$title[0]."\"]<br>");

            print("    \"units\": \"".$units[0]."\"<br>");



            print($first_line."<br>");
            $lineCount = 0;
            //print out the first ten lines for review
            while($gz && !gzeof($gz)&&$lineCount++<10){
                print(gzgets($gz)."<br>");
            }
            gzclose($gz);

            //GET DSD AS NEEDED (MUST USE CURL BECAUSE URL RETURNS FILE INSTEAD OF CONTENTS)
            if(!file_exists($dsdFolder.$code.".dsd.xml")){
                getDsd($code);
            }

            //READ DSD'S DIMENSIONS AND PARSE CODELISTS
            $fileArray = file($dsdFolder.$code.".dsd.xml");
            $dsdString = str_replace("</str:","</", str_replace("<str:","<",implode("\n", $fileArray)));
            $dsdString = str_replace("</mes:","</", str_replace("<mes:","<",$dsdString));
            $dsdString = str_replace("</com:","</", str_replace("<com:","<",$dsdString));
            $dsdString = str_replace("xml:lang","lang", $dsdString);

            $xmlDsd = simplexml_load_string($dsdString);
            $dimensions = $xmlDsd->xpath("//Dimension");
            for($k=0;$k<count($dimensions);$k++){
                $dimension = $dimensions[$k]->attributes()["id"];
                print($dimension.": ");
                $refNode = $dimensions[$k]->xpath("LocalRepresentation/Enumeration/Ref")[0];
                $codeList = $refNode->attributes()["id"];
                print ("$codeList<br>");
                $listCodes = $xmlDsd->xpath("//Codelist[@id='$codeList']/Code");
                for($j=0;$j<count($listCodes);$j++){
                    $code = $listCodes[$j]->attributes()["id"];

                    $name = (string) ($listCodes[$j]->xpath("Name[@lang='en']")[0]);
                    print(" - $code: $name<br>");
                }
            }

            //PARSE TSV


            //THEME NAME


            //LIST CUBES: NAME AND CONDITIONS

        }
    }
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