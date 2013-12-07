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
$api_key = "b12bd9324e77b0a2edcb92e67d508e7e9e3d862b";  //registered to mark_c_elbert@yahoo.com

//get array of states and counties
$sql = <<<EOS
    SELECT DISTINCT g1.geoid, g1.name, SUBSTR( g2.jvectormap, 3, 2 ) AS fips
    FROM geographies g1, geographies g2
    WHERE g1.geoid = g2.containingid
    AND g2.geoset =  'uscounties'
    UNION ALL
    SELECT geoid, name, SUBSTR( jvectormap, 3) AS fips
    FROM geographies
    WHERE geoset =  'uscounties'
        UNION ALL
    SELECT geoid, name, SUBSTR( jvectormap, 3) AS fips
    FROM geographies
    WHERE geoset =  'uscounties'
EOS;
$result = runQuery($sql);
$geographies = [];
while($row=$result->fetch_assoc()) {
    $geographies["F".$row["fips"]] = [
        "name"=>$row["name"],
        "geoid"=>$row["geoid"]
    ];
}

$themes = array(
    "Population"=>array(
        "name"=>"Population",
        "variables"=>array(
            array(
                "dimension"=>"sex",
                "location"=>"variable",
                "list"=>array(
                    array("pattern"=>"Male", "color"=>"lightblue"),
                    array("pattern"=>"Female", "color"=>"pink")
                )
            ),
            array(
                "dimension"=>"age",
                "location"=>"variable",
                "list"=>array(
                    array("pattern"=>"Under 5 years"),
                    array("pattern"=>"5 to 9 years"),
                    array("pattern"=>"10 to 14 years"),
                    array("pattern"=>"15 to 17 years", "sumWithNext"=>true),
                    array("pattern"=>"18 and 19 years", "translation"=>"15 to 19 years"),
                    array("pattern"=>"20 years", "sumWithNext"=>true),
                    array("pattern"=>"21 years", "sumWithNext"=>true),
                    array("pattern"=>"22 to 24 years", "translation"=>"20 to 24 years"),
                    array("pattern"=>"25 to 29 years"),
                    array("pattern"=>"30 to 34 years"),
                    array("pattern"=>"35 to 39 years"),
                    array("pattern"=>"40 to 44 years"),
                    array("pattern"=>"45 to 49 years"),
                    array("pattern"=>"50 to 54 years"),
                    array("pattern"=>"55 to 59 years"),
                    array("pattern"=>"60 and 61 years", "sumWithNext"=>true),
                    array("pattern"=>"62 to 64 years", "translation"=>"60 to 64 years"),
                    array("pattern"=>"65 and 66 years", "sumWithNext"=>true),
                    array("pattern"=>"67 to 69 years", "translation"=>"65 to 69 years"),
                    array("pattern"=>"70 to 74 years"),
                    array("pattern"=>"75 to 79 years"),
                    array("pattern"=>"80 to 84 years"),
                    array("pattern"=>"85 years and over")
                )
            ),
            array(
                "dimension"=>"race",
                "location"=>"concept",
                "list"=>array(
                    array("pattern"=>"white", "color"=>"white"),
                    array("pattern"=>"black", "color"=>"black"),
                    array("pattern"=>"Asian", "color"=>"yellow"),
                    array("pattern"=>"American Indian And Alaska Native", "color"=>"red", "translation"=>"native American"),
                    array("pattern"=>"Pacific Islander", "color"=>"brown"),
                    array("pattern"=>"Some Other Race", "color"=>"green", "translation"=>"Other"),
                    array("pattern"=>"Two Or More Races", "color"=>"green", "translation"=>"Multiracial")
                )
            )
        )
    ),
    "Median age"=>array(
        "name"=>"Median age",
        "variables"=>array(
            array(
                "dimension"=>"sex",
                "location"=>"variable",
                "list"=>array(
                    array("pattern"=>"Male", "color"=>"lightblue"),
                    array("pattern"=>"Female", "color"=>"pink")
                )
            )
        )
    )
);

$apiid = 8;
$rootcatid = 692361;
$status = array("updated"=>0,"failed"=>0,"skipped"=>0, "added"=>0);
$firstDate = strtotime("2000-1-1 UTC")*1000;
$lastDate = strtotime("2010-1-1 UTC")*1000;

//read the xml file and parse
$fileArray = file("census.xml");
$xmlCensusConfig = simplexml_load_string(implode("\n", $fileArray));

foreach($xmlCensusConfig->theme as $xmlTheme){
    $data = array();
    $sourceKeys = array();
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
        foreach($xmlConcept->variable as $xmlVariable){
            //detect dimensions
            $attribute = $xmlVariable->attributes();
            $key = $attribute["name"];
            array_push($sourceKeys, $key);
            $sumWithNext = false;
            //determine this sets dimensions
            $cubeDimensions = [];
            $seriesDimensions = [];
            for($i=0;$i<count($variables);$i++){
                $list = $variables[$i]["list"];
                for($j=0;$j<count($list);$j++){
                    $searchText = $variables[$i]["location"]=="variable" ? (string)$xmlVariable : $conceptName;
                    if(strpos($searchText, $list[$j]["pattern"])!==false){
                        array_push($cubeDimensions, $variables[$i]);
                        array_push($seriesDimensions, isset($list[$j]["translation"]) ? $list[$j]["translation"] : $list[$j]["pattern"]);
                        if(isset($list[$j]["sumWithNext"])) $sumWithNext = $list[$j]["sumWithNext"];
                    }
                }
            }
            //get states
            fetchData($data, "state", $key);
            //get counties
            fetchData($data, "county", $key);


            if(!$sumWithNext) {
                saveData(implode($sourceKeys,"+"), $data, $themeName, $units, $cubeDimensions, $theme_catid, $seriesDimensions);
                $data = array();
                $sourceKeys = array();
            }
        }
    }
    var_dump($status);
}

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
            $fetched = json_decode(implode(file($url),"\n"));
            for($j=1;$j<count($fetched);$j++){ //start with 1 to skip the header row
                if(count($fetched[$j])==3){
                    $locationCode = "F".str_pad($fetched[$j][1], 2, '0', STR_PAD_LEFT)  . str_pad($fetched[$j][2], 3, '0', STR_PAD_LEFT);
                } else {
                    $locationCode = "F".str_pad($fetched[$j][1], 2, '0', STR_PAD_LEFT);
                }
                if(!isset($data[$locationCode])){
                    $data[$locationCode] = array();
                }
                $summed = false;
                for($k=0;$k<count($data[$locationCode]);$k++){
                    if($data[$locationCode][$k][0]==$year){
                        $data[$locationCode][$k][1] +=  $fetched[$j][0];
                        $summed = true;
                        break;
                    }
                }
                if(!$summed) array_push($data[$locationCode], array($year, $fetched[$j][0]));
            }
        }
    }
}

function saveData($sourceKey, $data, $themeName, $units, $cubeDimensions, $theme_catid, $seriesDimensions){
    global $apiid, $geographies, $status, $firstDate, $lastDate;
    //1. get themeid, saving as needed
    $themeid = setThemeByName($apiid, $themeName);
    //2. get cubeid, saving the cube and its dimensions as needed
    $cube = setCubeByDimensions($themeid, $cubeDimensions);
    //3. get cube_catid
    $cube_catid = setCategoryByName($apiid, $themeName." ". $cube["name"], $theme_catid);
    //4. get mapsetid and set_catid
    $setName = $themeName . (count($seriesDimensions)==0?"":" ".implode($seriesDimensions, " and "));
    $set_catid = setCategoryByName($apiid, $setName, $cube_catid);
    $mapsetid = getMapSet($setName, $apiid, "A", $units);
    //5. loop through the dataset and save/update it
    foreach($data as $locationCode=>$dataArray){
        //determine geoid and insert series, categoryseries
        if(isset($geographies[$locationCode])){
            $geoname = $geographies[$locationCode]["name"];
            $geoid = $geographies[$locationCode]["geoid"];
            $mdData = [];
            for($j=0;$j<count($dataArray);$j++){
                array_push($mdData, implode($dataArray[$j],"|"));
            }
            //printNow("$locationCode $geoname($geoid): $j");

            $sid = updateSeries($status, "null", $sourceKey."-".substr($locationCode, 1), $setName." in ".$geoname,
                "US Census Bureau","http://www.census.gov/developers/data/","A",
                $units,"null","null",$setName,$apiid,"",
                $firstDate,$lastDate,implode($mdData,"||"), $geoid, $mapsetid, null, null, null);
            runQuery("insert ignore into categoryseries (catid, seriesid) values($set_catid, $sid)");
        } else {
            if(substr($locationCode,0,3)!="F72") printNow($locationCode);  //puerto rico
            $status["failed"]++;
        }
    }
    setMapsetCounts($mapsetid, $apiid);
    printNow("processed set $setName ($units), part of the cube $themeName ". $cube["name"]);

}
