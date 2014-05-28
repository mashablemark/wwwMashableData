<?php

//$thisFolder = dirname(__FILE__);
$dataFolder = "bulkfiles/eurostat/";
$tocFile = "table_of_contents.xml";
$tocURL = "http://epp.eurostat.ec.europa.eu/NavTree_prod/everybody/BulkDownloadListing?sort=1&file=".$tocFile;
$dsdRootUrl = "http://ec.europa.eu/eurostat/SDMX/diss-web/rest/datastructure/ESTAT/DSD_";
$apiid = "undefined";


//get TOC
if(!file_exists($dataFolder.$tocFile) || isset($_REQUEST["refresh"])){
    set_time_limit(300);
    print('downloading '.$tocURL."<br>");
    file_put_contents($dataFolder. $tocFile, fopen($tocURL, 'r'));
}

//read the TOC file and parse xml
$fileArray = file($dataFolder.$tocFile);
$fileString = str_replace("</nt:","</", str_replace("<nt:","<",implode("\n", $fileArray)));  //remove obnoxious "nt" namespace!!!
$xmlTOC = simplexml_load_string($fileString);
if(!isset($_REQUEST["codes"])){
    //download all DSDd and TSVs
    $allCodeLists = [];  //keep track of unique codelists by id (and by dataset code, because codelist id are shared between similarly themed code lists!!)

    $allLeaves = $xmlTOC->xpath("branch[code='data']//leaf/code");
    for($i=0; $i < count($allLeaves);$i++){
        $code = (string) $allLeaves[$i];
        //get DSD (must use CURL because of headers/redirect confuses fopen and related functions
        if(!file_exists($dataFolder.$code.".dsd.xml")){
            getDsd($code);
        }
        //READ DSD'S DIMENSIONS AND PARSE CODELISTS
        $fileArray = file($dataFolder.$code.".dsd.xml");
        $dsdString = implode("\n", $fileArray);
        if(strpos($dsdString,"Error code: ")===0  || strpos($dsdString,"Not Found")===0 ||  strpos($dsdString,"<big>Access Denied </big><br><br>")!==false){
            unlink($dataFolder.$code.".dsd.xml");
            print("Error loading $i. <a href=\"$dsdRootUrl$code\">$code</a><br>: $dsdString<br>");
        } else {
            print($dataFolder.$code.".dsd.xml".strpos($dsdString,"Error code: ").strpos($dsdString,"Not Found"));
            print("loading $i. <a href=\"?codes=$code\" target=\"$code\">$code</a><br>");
            if(simplexml_load_string(implode("\n", $fileArray))===false){ //download once again if unable to parse
                getDsd($code);
                $fileArray = file($dataFolder.$code.".dsd.xml");
            }
            $dsdString = str_replace("</str:","</", str_replace("<str:","<",implode("\n", $fileArray)));
            $dsdString = str_replace("</mes:","</", str_replace("<mes:","<",$dsdString));
            $dsdString = str_replace("</com:","</", str_replace("<com:","<",$dsdString));
            $dsdString = str_replace("xml:lang","lang", $dsdString);
            $xmlDsd = simplexml_load_string($dsdString);
            $dimensions = $xmlDsd->xpath("//Dimension");
            for($k=0;$k<count($dimensions);$k++){
                $dimension = $dimensions[$k]->attributes()["id"];
                if($dimension!="GEO" && $dimension!="FREQ"){
                    $refNode = $dimensions[$k]->xpath("LocalRepresentation/Enumeration/Ref")[0];
                    $codeListId = (string) $refNode->attributes()["id"];
                    $listCodes = $xmlDsd->xpath("//Codelist[@id='$codeListId']/Code");
                    $codePairs = [];
                    for($j=0;$j<count($listCodes);$j++){
                        $listCode = (string) $listCodes[$j]->attributes()["id"];
                        $name = (string) ($listCodes[$j]->xpath("Name[@lang='en']")[0]);
                        //print("$listCode => $name<br>");
                        $codePairs[$listCode] = $name;
                    }
                    $jsonCodeList = json_encode($codePairs);

                    $found = false;
                    if(isset($allCodeLists[$codeListId])){
                        foreach ($allCodeLists[$codeListId] as $refCode => $refJson) {
                            if($refJson==$jsonCodeList){
                                $found = true;
                                break;
                            }
                        }
                    }
                    if(!isset($allCodeLists[$codeListId]) || !$found) {
                        if(!isset($allCodeLists[$codeListId])) $allCodeLists[$codeListId] = [];
                        $allCodeLists[$codeListId][$code] = $jsonCodeList;
                        print("$i. $codeListId ($code) = $jsonCodeList <br>");
                    }
                }
            }
        }
    }
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

            //GET TSV DATA FILE
            set_time_limit(300);
            file_put_contents($dataFolder. $code.".tsv.gz", fopen($tsvLink[0], 'r'));
            $gz = gzopen($dataFolder. $code.".tsv.gz", "r");
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
            if(!file_exists($dataFolder.$code.".dsd.xml")){
                getDsd($code);
            }

            //READ DSD'S DIMENSIONS AND PARSE CODELISTS
            $fileArray = file($dataFolder.$code.".dsd.xml");
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

function getDsd($code){
    global $dataFolder, $dsdRootUrl;
    set_time_limit(300); // unlimited max execution time
    $fp = fopen($dataFolder.$code.".dsd.xml", "w");
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