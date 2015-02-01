<?php
/* Census demographic ingestor
*
* parses census xml, preserving info hierarchy and sum age segments to produce 5 year increments
*
*/

$sql_logging = false;
$event_logging = true;
include_once("../../global/php/common_functions.php");

//The Census API for SF1 cover the 1990, 2000 and the 2010 census, however the keys change from census to census!
//2000 and 2010 are simliar (extra 0) and the call can adjusted in the code.  The 1990 keys are completely different!
$years = array("2000","2010");
$apidt = date("Y-m-d");
$api_key = "b12bd9324e77b0a2edcb92e67d508e7e9e3d862b";  //registered to mark_c_elbert@yahoo.com

//create assoc. array of states and counties keyed by FIPS code
$sql = "SELECT DISTINCT g1.geoid, g1.name, SUBSTR( g2.jvectormap, 3, 2 ) AS fips
        FROM geographies g1, geographies g2
        WHERE g1.geoid = g2.containingid
        AND g2.geoset =  'US counties'
        UNION ALL
        SELECT geoid, name, SUBSTR( jvectormap, 3) AS fips
        FROM geographies
        WHERE geoset =  'US counties'";
$result = runQuery($sql);
$geographies = [];
while($row=$result->fetch_assoc()) {
    $geographies["F".$row["fips"]] = [
        "name"=>$row["name"],
        "geoid"=>$row["geoid"]
    ];
}

$themes = [
    "Hispanic population"=>[
        "name"=>"Hispanic population",
        "variables"=>[
            [
                "dimension"=>"age",
                "location"=>"variable",
                "list"=>[
                    ["pattern"=>"85 years and over", "short"=>"85 +"],
                    ["pattern"=>"80 to 84 years", "short"=>"80 - 84"],
                    ["pattern"=>"75 to 79 years", "short"=>"75 - 79"],
                    ["pattern"=>"70 to 74 years", "short"=>"70 - 74"],
                    ["pattern"=>"65 and 66 years", "sumWithNext"=>true],
                    ["pattern"=>"67 to 69 years", "translation"=>"65 to 69 years", "short"=>"65 - 69"],
                    ["pattern"=>"60 and 61 years", "sumWithNext"=>true],
                    ["pattern"=>"62 to 64 years", "translation"=>"60 to 64 years", "short"=>"60 - 64"],
                    ["pattern"=>"55 to 59 years", "short"=>"55 - 59"],
                    ["pattern"=>"50 to 54 years", "short"=>"50 - 54"],
                    ["pattern"=>"45 to 49 years", "short"=>"45 - 49"],
                    ["pattern"=>"40 to 44 years", "short"=>"40 - 44"],
                    ["pattern"=>"35 to 39 years", "short"=>"35 - 39"],
                    ["pattern"=>"30 to 34 years", "short"=>"30 - 24"],
                    ["pattern"=>"25 to 29 years", "short"=>"25 - 29"],
                    ["pattern"=>"21 years", "sumWithNext"=>true],
                    ["pattern"=>"22 to 24 years", "translation"=>"20 to 24 years", "short"=>"20 - 24"],
                    ["pattern"=>"20 years", "sumWithNext"=>true],
                    ["pattern"=>"15 to 17 years", "sumWithNext"=>true],
                    ["pattern"=>"18 and 19 years", "translation"=>"15 to 19 years", "short"=>"15 - 19"],
                    ["pattern"=>"10 to 14 years", "short"=>"10 - 14"],
                    ["pattern"=>"5 to 9 years", "short"=>"5 - 9"],
                    ["pattern"=>"Under 5 years", "short"=>"Under 5"]
                ]
            ],
            [
                "dimension"=>"sex",
                "location"=>"variable",
                "list"=>[
                    ["pattern"=>"Male", "color"=>"lightblue"],
                    ["pattern"=>"Female", "color"=>"pink"]
                ]
            ]
        ]
    ],
    "Population"=>[
        "name"=>"Population",
        "variables"=>[
            [
                "dimension"=>"age",
                "location"=>"variable",
                "list"=>[
                    ["pattern"=>"85 years and over", "short"=>"85 +"],
                    ["pattern"=>"80 to 84 years", "short"=>"80 - 84"],
                    ["pattern"=>"75 to 79 years", "short"=>"75 - 79"],
                    ["pattern"=>"70 to 74 years", "short"=>"70 - 74"],
                    ["pattern"=>"65 and 66 years", "sumWithNext"=>true],
                    ["pattern"=>"67 to 69 years", "translation"=>"65 to 69 years", "short"=>"65 - 69"],
                    ["pattern"=>"60 and 61 years", "sumWithNext"=>true],
                    ["pattern"=>"62 to 64 years", "translation"=>"60 to 64 years", "short"=>"60 - 64"],
                    ["pattern"=>"55 to 59 years", "short"=>"55 - 59"],
                    ["pattern"=>"50 to 54 years", "short"=>"50 - 54"],
                    ["pattern"=>"45 to 49 years", "short"=>"45 - 49"],
                    ["pattern"=>"40 to 44 years", "short"=>"40 - 44"],
                    ["pattern"=>"35 to 39 years", "short"=>"35 - 39"],
                    ["pattern"=>"30 to 34 years", "short"=>"30 - 24"],
                    ["pattern"=>"25 to 29 years", "short"=>"25 - 29"],
                    ["pattern"=>"21 years", "sumWithNext"=>true],
                    ["pattern"=>"22 to 24 years", "translation"=>"20 to 24 years", "short"=>"20 - 24"],
                    ["pattern"=>"20 years", "sumWithNext"=>true],
                    ["pattern"=>"15 to 17 years", "sumWithNext"=>true],
                    ["pattern"=>"18 and 19 years", "translation"=>"15 to 19 years", "short"=>"15 - 19"],
                    ["pattern"=>"10 to 14 years", "short"=>"10 - 14"],
                    ["pattern"=>"5 to 9 years", "short"=>"5 - 9"],
                    ["pattern"=>"Under 5 years", "short"=>"Under 5"]
                ]
            ],
            [
                "dimension"=>"race",
                "location"=>"concept",
                "list"=>[
                    ["pattern"=>"White", "color"=>"#2f7ed8"],
                    ["pattern"=>"Black Or African American", "short"=>"Black", "color"=>"#8bbc21"],
                    ["pattern"=>"Asian", "color"=>"#910000"],
                    ["pattern"=>"American Indian And Alaska Native", "short"=>"Native American", "color"=>"#1aadce"],
                    ["pattern"=>"Native Hawaiian And Other Pacific Islander", "short"=>"Pacific Islander", "color"=>"#492970"],
                    ["pattern"=>"Some Other Race", "short"=>"Other", "color"=>"#f28f43"],
                    ["pattern"=>"Two Or More Races", "short"=>"Multiracial", "color"=>"#77a1e5"]
                ]
            ],
            [
                "dimension"=>"sex",
                "location"=>"variable",
                "list"=>[
                    ["pattern"=>"Male", "color"=>"lightblue"],
                    ["pattern"=>"Female", "color"=>"pink"]
                ]
            ]
        ]
    ],
    "Median age"=>[
        "name"=>"Median age",
        "variables"=>[
            [
                "dimension"=>"sex",
                "location"=>"variable",
                "list"=>[
                    ["pattern"=>"Male", "color"=>"lightblue"],
                    ["pattern"=>"Female", "color"=>"pink"]
                ]
            ]
        ]
    ]
];

$apiid = 8;  //US Census
$result = runQuery("select * from apis where apiid =8;");
while($api_row=$result->fetch_assoc()) {
    $rootcatid = $api_row["rootcatid"];
}

$status = ["updated"=>0,"failed"=>0,"skipped"=>0, "added"=>0];
$firstDate100k = strtotime("2000-1-1 UTC")/100;
$lastDate100k = strtotime("2010-1-1 UTC")/100;

//read the xml file and parse
$fileArray = file("census.xml");
$xmlCensusConfig = simplexml_load_string(implode("\n", $fileArray));

foreach($xmlCensusConfig->theme as $xmlTheme){
    //timeout("start theme loop");
    $data = [];
    $sourceKeys = [];
    $rootSetId = null;
    $attribute = $xmlTheme->attributes();
    $themeName = (string)$attribute["name"];
    $units = (string)$attribute["units"];
    $theme_catid = setCategoryByName($apiid, $themeName, $rootcatid);
    $theme = $themes[$themeName];
    $variables = $theme["variables"];
    foreach($xmlTheme->concept as $xmlConcept){
        //process concept
        $attribute = $xmlConcept->attributes();
        $conceptName = (string) $attribute["name"];

        //process the concept's variable tags
        foreach($xmlConcept->variable as $xmlVariable){  //XML variable loop
            //timeout("top of variable loop");
            //detect dimensions
            $attribute = $xmlVariable->attributes();
            $key = $attribute["name"];
            $sourceKeys[] = $key;
            $sumWithNext = false;
            //determine this sets dimensions
            $cubeDimensions = [];
            $seriesDimensions = [];
            for($i=0;$i<count($variables);$i++){  //outer loop of PHP variables array for this theme
                $list = $variables[$i]["list"];
                for($j=0;$j<count($list);$j++){  //inner loop of variable.list ->  pattern matching
                    $searchText = $variables[$i]["location"]=="variable" ? (string)$xmlVariable : $conceptName;
                    //print($searchText.':'.' '.$list[$j]["pattern"].'<br>');
                    if(strpos($searchText, $list[$j]["pattern"])!==false){ //prevents partial word detection (eg. female detected as male)
                        //found a match between XML variable info and my array!!
                        //print('match!!');
                        if(isset($list[$j]["sumWithNext"])) {
                            $sumWithNext = $list[$j]["sumWithNext"];
                        } else {
                            $thisDimension = [
                                "dimension"=>$variables[$i]["dimension"],
                                "list"=>[]
                            ];
                            for($index=0;$index<count($list);$index++){
                                if(!isset($list[$index]["sumWithNext"])){
                                    $listItem = ["name"=>isset($list[$index]["translation"]) ? $list[$index]["translation"] : $list[$index]["pattern"]];
                                    if(isset($list[$index]["short"])) $listItem["short"] = $list[$index]["short"];
                                    if(isset($list[$index]["color"])) $listItem["color"] = $list[$index]["color"];
                                    $thisDimension["list"][] = $listItem;
                                }
                            }
                            $cubeDimensions[] = $thisDimension;
                            $seriesDimensions[] = isset($list[$j]["translation"]) ? $list[$j]["translation"] : $list[$j]["pattern"];
                        }

                    }
                }
            }
            //if($searchText=="Male: !! 25 to 29 years")die();
            //get states
            //timeout("start fetch");
            fetchData($data, "state", $key);
            //get counties
            fetchData($data, "county", $key);
            //timeout("finish fetch");

            if(!$sumWithNext) {
                saveData(implode($sourceKeys,"+"), $data, $themeName, $units, $cubeDimensions, $theme_catid, $seriesDimensions);
                //timeout("saved Data");
                unset($data);
                unset($sourceKeys);
                $data = [];
                $sourceKeys = [];
            }
        }
    }
    set_time_limit(200);
    setGhandlesFreqsFirstLast($apiid);
    set_time_limit(200);
    setMapsetCounts("all", $apiid);

}
preprint($status);

function fetchData(&$data, $location, $key){
    //turns $data into a keyed array if empty and sums if already filled
    global $years, $api_key;
    for($i=0;$i<count($years);$i++){
        $year = $years[$i];
        if(!($year=="1990" && substr($key,0,5)=="P0130")){  //median age not available in 1990 SF1
            $yearKey = $key;
            if($year=="2000" && substr($key,4,1)=="0") $yearKey = substr($key,0,4).substr($key,5);
            $url = "http://api.census.gov/data/$year/sf1?get=$yearKey&for=$location:*&key=$api_key";
            printNow($url);
            $rawData = file($url);
            $tries = 1;
            while(!$rawData && $tries<3){
                $tries++;
                printNow("retry to get $url!");
                $rawData = file($url);
            }
            if(!$rawData) throw new Exception("fatal error: unable to get $url after $tries tries.");
            $fetched = json_decode(implode($rawData,"\n"));
            for($j=1;$j<count($fetched);$j++){ //start with 1 to skip the header row
                if(count($fetched[$j])==3){
                    $locationCode = "F".str_pad($fetched[$j][1], 2, '0', STR_PAD_LEFT)  . str_pad($fetched[$j][2], 3, '0', STR_PAD_LEFT);
                } else {
                    $locationCode = "F".str_pad($fetched[$j][1], 2, '0', STR_PAD_LEFT);
                }
                if(!isset($data[$locationCode])){
                    $data[$locationCode] = [];
                }
                $summed = false;
                for($k=0;$k<count($data[$locationCode]);$k++){
                    if($data[$locationCode][$k][0]==$year){
                        $data[$locationCode][$k][1] +=  $fetched[$j][0];
                        $summed = true;
                        break;
                    }
                }
                if(!$summed) $data[$locationCode][] =[$year, $fetched[$j][0]];
            }
        }
    }
}

function saveData($sourceKey, $data, $themeName, $units, $cubeDimensions, $theme_catid, $seriesDimensions){
    global $rootSetId, $apiid, $geographies, $status, $apidt;
    printNow("themeName: $themeName");
    printNow("sourceKey: $sourceKey");
    printNow("cubeDimensions:");
    preprint($cubeDimensions);
    printNow("seriesDimensions:");
    preprint($seriesDimensions);
    //1. get themeid, saving as needed
    $themeid = setThemeByName($apiid, $themeName);

    //2. get cubeid, saving the cube and its dimensions as needed
    $cube = false;
    if(count($cubeDimensions)>0){
        $cube = setCubeByDimensions($themeid, $cubeDimensions, $units, $rootSetId);  //$cubeDimensions has already removed the "sumWithNext" element
        //3. insert/get CATEGORIES cube_catid
        $cube_catid = setCategoryByName($apiid, $themeName." ". $cube["name"], $theme_catid);
    }
    //4. get mapsetid and set_catid
    $setName = $themeName . (count($seriesDimensions)==0?"":" ".implode($seriesDimensions, " and ")); //. " in [geo]";
    printNow("setName: $setName");

    //insert SETS
    $setid = saveSet($apiid, $sourceKey, $setName, $units, "US Census Bureau","http://www.census.gov/developers/data/", "", $apidt, $themeid);
    if(count($cubeDimensions)==0){
        if(!$rootSetId){
            $rootSetId = $setid;
            runQuery("update themes set rootsetid = $rootSetId where themeid = $themeid");
        } else {
            throw new Exception("error: confusion on rootset $rootSetId vs. $setid for themeid $themeid");
        }
    }

    //insert CUBESETS
    if($cube){
        $stackOrder = 0;
        $barOrder = 0;
        $sideOrder = 0;
        for($i=0;$i<count($cubeDimensions);$i++){
            for($j=0;$j<count($cubeDimensions[$i]["list"]);$j++){
                if($seriesDimensions[$i]==$cubeDimensions[$i]["list"][$j]["name"]){
                    if($i==0){
                        $barOrder = $j;
                    } elseif($i==1 && $cubeDimensions[$i]["dimension"]!="sex"){
                        $stackOrder = $j;
                    } else {
                        $sideOrder = $j;
                    }
                }
            }
        }
        $cubeid = $cube["id"];
        runQuery("insert into cubecomponents (cubeid, setid, barorder, stackorder, sideorder)
        values($cubeid, $setid, $barOrder, $stackOrder, $sideOrder)
        on duplicate key update barorder=$barOrder, stackorder=$stackOrder, sideorder=$sideOrder");
    }

    //insert CATEGORYSETS
    setCatSet($cube?$cube_catid:$theme_catid, $setid);

    //5. loop through the dataset and save/update it
    foreach($data as $locationCode=>$dataArray){
        //determine geoid and insert series, categotySets
        if(isset($geographies[$locationCode])){
            //$geoname = $geographies[$locationCode]["name"];
            $geoid = $geographies[$locationCode]["geoid"];
            $mdData = [];
            for($j=0;$j<count($dataArray);$j++){
                $mdData[] = implode($dataArray[$j],':');
            }
            sort($mdData);
            //insert set
            saveSetData($status, $setid, null, null, "A", $geoid, "", $mdData);
        } else {
            if(substr($locationCode,0,3)!="F72") printNow("unable to insert for FIPS handle: ".$locationCode);  //puerto rico
            $status["failed"]++;
        }
    }
    printNow(date("Y-m-d H:i:s") .": processed set $setName ($units), part of the cube $themeName ". $cube["name"]);
}


function setCubeByDimensions($themeid, $cubeDimensions, $units, $rootSetId){
    //save the cube and its dimensions if DNE
    //return an assoc array with cube name and id
    global $db;
    if(count($cubeDimensions)==0) return false;  //don't insert cube for "totals"
    //1. insert / update the cubedim records
    $cubeDimIds = ["null", "null", "null"];
    $dimNames = [];
    foreach($cubeDimensions as $i => &$cubeDimension){
        $dimName = $cubeDimension["dimension"];
        $dimNames[] = $dimName;
        $sql = "select dimid from cubedims where themeid=$themeid and dimkey='$dimName'";
        $result = runQuery($sql, "cubeDim search");
        if($result->num_rows==0){
            $list = [];
            foreach($cubeDimension["list"] as $j=>&$item){
                if(!isset($item["sumWithNext"])){
                    $list[] = isset($item["short"]) ? $item["short"] : $item["name"];
                    /*$listItem = ["name"=>$item["name"]];
                    if(isset($item["short"])) $listItem["short"] = $item["short"];
                    if(isset($item["color"])) $listItem["short"] = $item["color"];
                    $list[] = $listItem;*/
                }
            }
            $sqlDimJson = safeStringSQL(json_encode($list));
            $sql="insert into cubedims (themeid, dimkey, name, json) values($themeid, '$dimName', '$dimName', $sqlDimJson) on duplicate key update name='$dimName', json= $sqlDimJson";
            if(!runQuery($sql, "insert cubedim")) throw new Exception("error: unable to insert dimension $dimName for themeid $themeid");
            $thisDimId = $db->insert_id;
        } else {
            $dim = $result->fetch_assoc();
            $thisDimId = $dim["dimid"];
        }
        if(strtolower($cubeDimensions[$i]["dimension"])=="sex" && $i==1){
            $cubeDimIds[2] = $thisDimId; //population pyramids
        } else {
            $cubeDimIds[$i] = $thisDimId;
        }
    }

    //2. insert / update the cube record
    $cubeName = count($cubeDimensions)==0?"total":"by ".implode($dimNames, ", ");
    $sql = "select cubeid from cubes where themeid=$themeid and name='$cubeName' and units='$units'";
    $result = runQuery($sql, "cube fetch");
    if($result->num_rows==0){
        $sql="insert into cubes (themeid, name, units, totsetid, bardimid, stackdimid, sidedimid) values($themeid,'$cubeName','$units', $rootSetId, $cubeDimIds[0], $cubeDimIds[1], $cubeDimIds[2])";
        if(!runQuery($sql, "insert cube")) throw new Exception("error: unable to insert cube $cubeName for themeid $themeid");
        $cubeid = $db->insert_id;
    } else {
        $row = $result->fetch_assoc();
        $cubeid = $row["cubeid"];
        runQuery("update cubes set totsetid = $rootSetId, bardimid=$cubeDimIds[0], stackdimid=$cubeDimIds[1], sidedimid=$cubeDimIds[2] where cubeid=$cubeid");
    }
    return ["name"=>$cubeName, "id"=>$cubeid];
}
