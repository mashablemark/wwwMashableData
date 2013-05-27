<?php
$event_logging = true;
/* This is the plugin for the St Louis Federal Reserve API.  This and other API specific plugins
 * are included by /admin/crawlers/index.php and invoke by the admin panel /admin
 * All returns are JSON objects. Supports the standard MD API functions:
 *
 * command: Get | Update | Crawl
 *   search
 *   periodicity
 * command: Crawl
 *   exhaustive crawl starting at cat_id=0
 * command:  Update
 *   periodicity:  D|M|A|ALL.  If missing, smartupdate  algorithm
 *   since: datetime; if missing smartupdate algorithm
*/

/*to start a run or queued jobs
http://www.mashabledata.com/admin/crawlers/start_apirun.php?apiid=3&uid=1&command=ExecuteJobs&runid=396
*/

/* clear db for retry
delete from catcat where parentid>=5507 or childid>=5507 or parentid=5505;
truncate eventlog;
truncate apirunjobs;
truncate mapsets;
delete from categories where catid>=5507;
delete from captures where captureid>301636;
delete from series where seriesid>173120;

*/
$indicators = array();
$topics = array();
$iso2to3 = array();
$threadjobid="null";  //used to track of execution thread

//last fetched May 22, 2013
$treeJson = '{"Production":{"Crops":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Production_Crops_E_All_Data.zip","updated":"2013-02-06"},"Crops processed":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Production_Crops_E_All_Data.zip","updated":"2013-02-06"},"Live Animals":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Production_Livestock_E_All_Data.zip","updated":"2013-02-06"},"Livestock Primary":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Production_LivestockPrimary_E_All_Data.zip","updated":"2013-02-06"},"Livestock Processed":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Production_LivestockPrimary_E_All_Data.zip","updated":"2013-02-06"},"Production Indices":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Production_Indices_E_All_Data.zip","updated":"2013-02-06"},"Value of Agricultural<br>Production":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Value_of_Production_E_All_Data.zip","updated":"2013-03-12"}},"Trade":{"Crops and livestock<br>products":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Trade_Crops_Livestock_E_All_Data.zip","updated":"2013-04-22"},"Live animals":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Trade_LiveAnimals_E_All_Data.zip","updated":"2013-04-22"},"Trade Indices":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Trade_Indices_E_All_Data.zip","updated":"2013-02-07"}},"Food Supply":{"Crops Primary Equivalent":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/FoodSupply_Crops_E_All_Data.zip","updated":"2013-02-14"},"Livestock and Fish<br>Primary Equivalent":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/FoodSupply_LivestockFish_E_All_Data.zip","updated":"2013-02-14"}},"Commodity Balances":{"Crops Primary Equivalent":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/CommodityBalances_Crops_E_All_Data.zip","updated":"2013-02-14"},"Livestock and Fish<br>Primary Equivalent":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/CommodityBalances_LivestockFish_E_All_Data.zip","updated":"2013-02-14"}},"Food Balance Sheets":{"Food Balance Sheets":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/FoodBalanceSheets_E_All_Data.zip","updated":"2013-03-14"}},"Prices":{"Producer Prices -<br>Annual":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Prices_E_All_Data.zip","updated":"2013-02-11"},"Producer Prices -<br>Monthly":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Prices_Monthly_E_All_Data.zip","updated":"2013-02-06"},"Producer Prices -<br>Archive":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/PricesArchive_E_All_Data.zip","updated":"2013-03-07"},"Producer Price Indices<br>- Annual":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Price_Indices_E_All_Data.zip","updated":"2013-02-11"}},"Resources":{"Fertilizers":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Resources_Fertilizers_E_All_Data.zip","updated":"2013-02-06"},"Fertilizers archive":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Resources_FertilizersArchive_E_All_Data.zip","updated":"2013-02-06"},"Fertilizers - Trade<br>Value":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Resources_FertilizersTradeValues_E_All_Data.zip","updated":"2013-02-06"},"Pesticides (use)":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Resources_Pesticides_Use_E_All_Data.zip","updated":"2013-02-06"},"Pesticides (trade)":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Resources_Pesticides_Trade_E_All_Data.zip","updated":"2013-02-06"},"Land":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Resources_Land_E_All_Data.zip","updated":"2013-05-14"}},"Population":{"Annual population":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Population_E_All_Data.zip","updated":"2013-02-05"}},"Investment":{"Capital Stock":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Investment_CapitalStock_E_All_Data.zip","updated":"2013-02-11"},"Machinery":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Investment_Machinery_E_All_Data.zip","updated":"2013-02-06"},"Machinery Archive":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Investment_MachineryArchive_E_All_Data.zip","updated":"2013-03-07"}},"Emissions - Agriculture":{"Agriculture Total":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Agriculture_total_E_All_Data.zip","updated":"2013-02-05"},"Enteric Fermentation":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Agriculture_total_E_All_Data.zip","updated":"2013-02-05"},"Manure Management":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Enteric_Fermentation_E_All_Data.zip","updated":"2013-02-05"},"Rice Cultivation":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Rice_Cultivation_E_All_Data.zip","updated":"2013-02-05"},"Synthetic Fertilizers":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Synthetic_Fertilizers_E_All_Data.zip","updated":"2013-02-05"},"Manure applied to<br>soils":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Manure_applied_to_soils_E_All_Data.zip","updated":"2013-02-05"},"Manure left on<br>pasture":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Manure_left_on_pasture_E_All_Data.zip","updated":"2013-02-05"},"Crop Residues":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Crop_Residues_E_All_Data.zip","updated":"2013-02-05"},"Cultivated Organic Soils":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Cultivated_Organic_Soils_E_All_Data.zip","updated":"2013-02-05"},"Burning Crop Residues":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Burning_crop_residues_E_All_Data.zip","updated":"2013-02-05"}},"Emissions - Land Use":{"Forest Land":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Land_Use_Forest_Land_E_All_Data.zip","updated":"2013-02-05"},"Cropland":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Land_Use_Cropland_E_All_Data.zip","updated":"2013-02-05"}},"Forestry":{"Forestry Production and<br>Trade":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Forestry_E_All_Data.zip","updated":"2013-02-05"},"Forestry Trade Flows":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/ForestryTradeFlows_E_2.zip","updated":"2012-07-13"}}}';

/* rerunning file ingestion:
truncate eventlog;
delete from series where apiid=5;
delete from mapsets where apiid=5;
delete from categories where catid>130305;
delete from categoryseries where catid>130305;
delete from catcat where parentid>130305;
truncate apirunjobs;

*/

/*
to refetch tree with last updated dates:
1. go to http://faostat3.fao.org/home/index.html#DOWNLOAD
2. run:
    $('ul#groupList li span').click(); //expands the entire tree
3. after tree is open, run:
    tree = {};
    $('ul#groupList>li').each(function(){
        branch = $(this).find("div").html();
        tree[branch]={};
    });
    sublis=$('ul#groupList>li li');
    i=0;
    $(sublis[i]).find('div').click();
    subTimer = setInterval(
        function(){
            sub = $(sublis[i]).find('div').html();
            branch = $(sublis[i]).closest("ul").closest("li").children('div').html();
            console.info('branch: '+branch+', sub: '+sub);
            if($('#domainNameTitle').html()){
                lastUpdated = $('#domainNameTitle').html().match(/\(([^\)]+)/)[1];
                tree[branch][sub]={link: $('#bulkDownloadsList li:last a').attr('href'), updated: lastUpdated};
            }
            if(++i>sublis.length)clearInterval(subTimer); else $(sublis[i]).find('div').click();
        },
        5000
    );
*/

function ApiCrawl($catid, $api_row){ //initiates a FAO crawl
    global $treeJson;
    global $db, $indicators, $topics, $iso2to3, $threadjobid;
    $ROOT_FAO_CATID = $api_row["rootcatid"];
    $baseCats = json_decode($treeJson, true);
    //first build the base categories:
    var_dump($api_row);
    foreach($baseCats as $primeCategory=>$subTree){
        $primeCatid = setCategory($api_row['apiid'], $primeCategory, $ROOT_FAO_CATID);
        foreach($subTree as $branchName=>$branchInfo){
            set_time_limit(300);
            $catid = setCategory($api_row['apiid'], $branchName, $primeCatid);
            $branchInfo["catid"] = $catid;
            $branchInfo["name"] = $branchName;
            $fileName = substr_replace(substr($branchInfo["link"], strrpos($branchInfo["link"],"/")),"",-4);
            $branchInfo["file"] = $fileName.'.csv';
            print('downloading '.$branchInfo["link"].' to '."bulkfiles/fao/".$fileName.".zip".'<br>');
            file_put_contents("bulkfiles/fao/".$fileName.".zip", fopen($branchInfo["link"], 'r'));
            print('unzipping '.$fileName.'.zip<br>');
            $zip = new ZipArchive;
            $zip->open("bulkfiles/fao/".$fileName.".zip");
            $zip->extractTo('./bulkfiles/fao/');
            $zip->close();
            unlink("bulkfiles/fao/".$fileName.".zip");  //delete the zip file
            print('downloading '.$fileName.'.zip<br>');

            //queue the job after the file is downloaded and unzipped
            $sql = "insert DELAYED into apirunjobs (runid, jobjson, tries, status) values(".$api_row["runid"] .",".safeStringSQL(json_encode($branchInfo)).",0,'Q')";
            runQuery($sql);
            runQuery("update apiruns set finishdt=now() where runid=".$api_row["runid"]);
        }
    }
}

function ApiExecuteJobs($runid, $jobid="ALL"){//runs all queued jobs in a single single api run until no more
    global $MAIL_HEADER, $db;
    $status = array("updated"=>0,"failed"=>0,"skipped"=>0, "added"=>0);
    $sql="SELECT a.name, a.l1domain, a.l2domain, r.* , j.jobid, j.jobjson"
        . " FROM apis a, apiruns r, apirunjobs j"
        . " WHERE a.apiid = r.apiid AND r.runid = j.runid AND r.runid=".$runid
        . " AND " . ($jobid=="ALL"?"STATUS =  'Q'":"jobid=".$jobid)
        . " LIMIT 0 , 1";
    $result = runQuery($sql);
    if($result === false || mysqli_num_rows($result)==0){
        return(array("status"=>"unable to find queued jobs for run ".$runid));
    } else {
        $api_row = $result->fetch_assoc();
    }

    //reusable SQL statements
    $next_job_sql = "select * from apirunjobs where status='Q' and runid =".$runid." limit 0,1";
    $update_run_sql = "update apiruns set finishdt=now() where runid = " . $runid;

    //UPDATE THE RUN'S FINISH DATE
    runQuery($update_run_sql);

    //MASTER LOOP
    $check = true;
    $threadjobid = "null";
    $job_count = 0;
    while($check){
        if($jobid!="ALL"){
            $result = runQuery("select * from apirunjobs where jobid=". intval($jobid));
            $check = false; //just run this one job; don't loop
        }  else {
            $result = runQuery($next_job_sql);
        }
        if($result===false || $result->num_rows!=1){
            $check = false;
            setMapsetCounts();
        } else {
            set_time_limit(60);
            $job = $result->fetch_assoc();
            if($threadjobid=="null") $threadjobid=$job["jobid"];
            $sql = "update apirunjobs set startdt=now(), tries=tries+1, threadjobid=".$threadjobid.", status='R' where jobid =".$job["jobid"];   //closed in ExecuteJob
            runQuery($sql);
          /*  $api_row["jobjson"] = $job["jobjson"];
            $api_row["jobid"] = $job["jobid"];*/
            $jobconfig = json_decode($job["jobjson"], true);

            $HEADER = '"CountryCode","Country","ItemCode","Item","ElementGroup","ElementCode","Element","Year","Unit","Value","Flag"';
            $colCountryCode = 0;
            $colCountry = 1;
            $colItemCode = 2;
            $colItem = 3;
            $colElementGroup = 4;
            $colElementCode	= 5;
            $colElement	= 6;
            $colYear = 7;
            $colUnit = 8;
            $colValue = 9;
            $colFlag = 10;
            $updateJobSql = "update apirunjobs set status = 'R', finished=now() where jobid=".$api_row["runid"];
            $updateRunSql = "update apiruns set finishdt=now() where runid=".$api_row["runid"];

            $sql="SELECT a.name, a.l1domain, a.l2domain, r.* , j.jobid, j.jobjson"
                . " FROM apis a, apiruns r, apirunjobs j"
                . " WHERE a.apiid = r.apiid AND r.runid = j.runid AND r.runid=".$runid
                . " AND " . ($jobid=="ALL"?"STATUS =  'Q'":"jobid=".$jobid)
                . " LIMIT 0 , 1";
            $result = runQuery($sql);
            if($result === false || mysqli_num_rows($result)==0){
                return(array("status"=>"unable to find queued jobs for run ".$runid));
            } else {
                $api_row = $result->fetch_assoc();
                runQuery($updateJobSql);
                runQuery($updateRunSql);
            }
            $branchInfo = json_decode($api_row['jobjson'], true);
            $csv=fopen("bulkfiles/fao".$branchInfo["file"],"r");
            $header = fgets($csv);  //throw away the header line
            if($HEADER==trim($header)){ //know file format
                $line = json_decode("[". $header . "]");
                $initial = true;
                $series_header = array(0,1,2,3,4,5,6,7,8,9,10); //dummy data for first check
                while(!feof($csv)){
                    $line = json_decode("[". fgets($csv) . "]");
                    if(count($line)==11){
                        if($line[$colItem]!=$series_header[$colItem] || $line[$colCountry]!=$series_header[$colCountry] || $line[$colElement]!=$series_header[$colElement]){ //series
                            if(!$initial){
                                saveSeries($status, $api_row, $series_header, $branchInfo, $lastLine, $data);
                            } else {
                                $initial = false;
                            }
                            //start series
                            set_time_limit(60);
                            $series_header = $line;
                            $lastLine = $line;
                            $data = $line[$colYear]."|".$line[$colValue];
                        } else { //another point in current series
                            $data .= "||".$line[$colYear]."|".$line[$colValue];
                            $lastLine = $line;
                        }
                    }
                }
                saveSeries($status, $api_row, $series_header, $branchInfo, $lastLine, $data);
                $updatedJobJson = json_encode(array_merge($status, $branchInfo));
                runQuery( "update apirunjobs set status = 'S', jobjson=".safeStringSQL($updatedJobJson). " enddt=now() where jobid=".$api_row["runid"]);
                runQuery($updateRunSql);
            } else { //unknown file format
                print($header."X<br>");
                print($HEADER."X<br>");
                runQuery( "update apirunjobs set status = 'F', finished=now() where jobid=".$api_row["runid"]);
                runQuery($updateRunSql);
            }
        }
    }
    return $status;
}
function saveSeries($status, $api_row, $series_header, $branchInfo, $line, $data){
    $colCountryCode = 0;
    $colCountry = 1;
    $colItemCode = 2;
    $colItem = 3;
    $colElementGroup = 4;
    $colElementCode	= 5;
    $colElement	= 6;
    $colYear = 7;
    $colUnit = 8;
    $colValue = 9;
    $colFlag = 10;

    $thisCatId = setCategory($api_row["apiid"], $series_header[$colItem], $branchInfo["catid"]);
    $geoid = countryLookup($line[$colCountry]);
    $skey = $line[$colCountryCode]."-".$line[$colElementCode]."-".$line[$colItemCode];
    $setName = $series_header[$colElement] .": ". $series_header[$colItem];
    if($geoid!==null) {
        $mapSetId = getMapSet($setName, $api_row["apiid"], "A", $series_header[$colUnit]);
    } else {
        $mapSetId = null;
    }
    $seriesid = updateSeries($status, $skey, $setName.": ".$series_header[$colCountry],"FAO","http://faostat3.fao.org/home/index.html","A",
        $series_header[$colUnit], $series_header[$colUnit],
        "For methodology, classification, local currency units, and abreviations visit http://faostat3.fao.org/home/index.html#METADATA_METHODOLOGY. Data from ".$branchInfo["link"],
        $branchInfo["name"],$api_row["apiid"],$branchInfo["updated"],
        strtotime($series_header[$colYear]."-01-01 UTC")*1000,
        strtotime($line[$colYear]."-01-01 UTC")*1000,
        $data, $geoid, $mapSetId,
        null, null, null);
    catSeries($thisCatId, $seriesid);
}

function countryLookup($country){
    static $countries = "null";
    if($countries=="null"){
        $countries = array();
        $result = runQuery("select geoid, name, regexes from geographies where geoset='all'");
        while($row=$result->fetch_assoc()){
            array_push($countries, $row);
        }
    }
    for($i=0;$i<count($countries);$i++){
        $regex = "#( for | in | from )?". $countries[$i]["regexes"]."#";
        if(preg_match($regex, $country, $matches)==1){
            return $countries[$i]["geoid"];
        }
    }
    return null;
}
