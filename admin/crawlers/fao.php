<?php
$event_logging = true;
$sql_logging = false;
$downloadFiles = false;  //SET THIS TRUE TO GET THE LATEST FAO; ELSE WILL ONLY DOWN IF FILE DOES NOT EXIST LOCALLY


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

$indicators = array();
$topics = array();
$iso2to3 = array();
$threadjobid="null";  //used to track of execution thread

//fetched May 22, 2013
//$treeJson = '{"Production":{"Crops":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Production_Crops_E_All_Data.zip","updated":"2013-02-06"},"Crops processed":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Production_Crops_E_All_Data.zip","updated":"2013-02-06"},"Live Animals":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Production_Livestock_E_All_Data.zip","updated":"2013-02-06"},"Livestock Primary":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Production_LivestockPrimary_E_All_Data.zip","updated":"2013-02-06"},"Livestock Processed":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Production_LivestockPrimary_E_All_Data.zip","updated":"2013-02-06"},"Production Indices":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Production_Indices_E_All_Data.zip","updated":"2013-02-06"},"Value of Agricultural<br>Production":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Value_of_Production_E_All_Data.zip","updated":"2013-03-12"}},"Trade":{"Crops and livestock<br>products":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Trade_Crops_Livestock_E_All_Data.zip","updated":"2013-04-22"},"Live animals":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Trade_LiveAnimals_E_All_Data.zip","updated":"2013-04-22"},"Trade Indices":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Trade_Indices_E_All_Data.zip","updated":"2013-02-07"}},"Food Supply":{"Crops Primary Equivalent":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/FoodSupply_Crops_E_All_Data.zip","updated":"2013-02-14"},"Livestock and Fish<br>Primary Equivalent":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/FoodSupply_LivestockFish_E_All_Data.zip","updated":"2013-02-14"}},"Commodity Balances":{"Crops Primary Equivalent":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/CommodityBalances_Crops_E_All_Data.zip","updated":"2013-02-14"},"Livestock and Fish<br>Primary Equivalent":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/CommodityBalances_LivestockFish_E_All_Data.zip","updated":"2013-02-14"}},"Food Balance Sheets":{"Food Balance Sheets":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/FoodBalanceSheets_E_All_Data.zip","updated":"2013-03-14"}},"Prices":{"Producer Prices -<br>Annual":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Prices_E_All_Data.zip","updated":"2013-02-11"},"Producer Prices -<br>Monthly":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Prices_Monthly_E_All_Data.zip","updated":"2013-02-06"},"Producer Prices -<br>Archive":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/PricesArchive_E_All_Data.zip","updated":"2013-03-07"},"Producer Price Indices<br>- Annual":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Price_Indices_E_All_Data.zip","updated":"2013-02-11"}},"Resources":{"Fertilizers":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Resources_Fertilizers_E_All_Data.zip","updated":"2013-02-06"},"Fertilizers archive":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Resources_FertilizersArchive_E_All_Data.zip","updated":"2013-02-06"},"Fertilizers - Trade<br>Value":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Resources_FertilizersTradeValues_E_All_Data.zip","updated":"2013-02-06"},"Pesticides (use)":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Resources_Pesticides_Use_E_All_Data.zip","updated":"2013-02-06"},"Pesticides (trade)":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Resources_Pesticides_Trade_E_All_Data.zip","updated":"2013-02-06"},"Land":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Resources_Land_E_All_Data.zip","updated":"2013-05-14"}},"Population":{"Annual population":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Population_E_All_Data.zip","updated":"2013-02-05"}},"Investment":{"Capital Stock":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Investment_CapitalStock_E_All_Data.zip","updated":"2013-02-11"},"Machinery":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Investment_Machinery_E_All_Data.zip","updated":"2013-02-06"},"Machinery Archive":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Investment_MachineryArchive_E_All_Data.zip","updated":"2013-03-07"}},"Emissions - Agriculture":{"Agriculture Total":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Agriculture_total_E_All_Data.zip","updated":"2013-02-05"},"Enteric Fermentation":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Agriculture_total_E_All_Data.zip","updated":"2013-02-05"},"Manure Management":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Enteric_Fermentation_E_All_Data.zip","updated":"2013-02-05"},"Rice Cultivation":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Rice_Cultivation_E_All_Data.zip","updated":"2013-02-05"},"Synthetic Fertilizers":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Synthetic_Fertilizers_E_All_Data.zip","updated":"2013-02-05"},"Manure applied to<br>soils":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Manure_applied_to_soils_E_All_Data.zip","updated":"2013-02-05"},"Manure left on<br>pasture":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Manure_left_on_pasture_E_All_Data.zip","updated":"2013-02-05"},"Crop Residues":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Crop_Residues_E_All_Data.zip","updated":"2013-02-05"},"Cultivated Organic Soils":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Cultivated_Organic_Soils_E_All_Data.zip","updated":"2013-02-05"},"Burning Crop Residues":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Burning_crop_residues_E_All_Data.zip","updated":"2013-02-05"}},"Emissions - Land Use":{"Forest Land":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Land_Use_Forest_Land_E_All_Data.zip","updated":"2013-02-05"},"Cropland":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Land_Use_Cropland_E_All_Data.zip","updated":"2013-02-05"}},"Forestry":{"Forestry Production and<br>Trade":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Forestry_E_All_Data.zip","updated":"2013-02-05"},"Forestry Trade Flows":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/ForestryTradeFlows_E_2.zip","updated":"2012-07-13"}}}';

//fetched Nov 20, 2013
$treeJson = '{"Production":{"Crops":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Production_Crops_E_All_Data.zip","updated":"2013-08-08"},"Crops processed":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Production_CropsProcessed_E_All_Data.zip","updated":"2013-08-08"},"Live Animals":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Production_Livestock_E_All_Data.zip","updated":"2013-08-21"},"Livestock Primary":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Production_LivestockPrimary_E_All_Data.zip","updated":"2013-08-08"},"Livestock Processed":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Production_LivestockProcessed_E_All_Data.zip","updated":"2013-08-08"},"Production Indices":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Production_Indices_E_All_Data.zip","updated":"2013-08-08"},"Value of Agricultural<br> Production":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Value_of_Production_E_All_Data.zip","updated":"2013-09-20"}},"Trade":{"Crops and livestock<br> products":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Trade_Crops_Livestock_E_All_Data.zip","updated":"2013-08-30"},"Live animals":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Trade_LiveAnimals_E_All_Data.zip","updated":"2013-08-30"},"Trade Indices":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Trade_Indices_E_All_Data.zip","updated":"2013-02-07"}},"Food Supply":{"Crops Primary<br> Equivalent":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/FoodSupply_Crops_E_All_Data.zip","updated":"2013-02-14"},"Livestock and Fish<br> Primary Equivalent":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/FoodSupply_LivestockFish_E_All_Data.zip","updated":"2013-02-14"}},"Commodity Balances":{"Crops Primary<br> Equivalent":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/CommodityBalances_Crops_E_All_Data.zip","updated":"2013-02-14"},"Livestock and Fish<br> Primary Equivalent":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/CommodityBalances_LivestockFish_E_All_Data.zip","updated":"2013-02-14"}},"Food Balance Sheets":{"Food Balance Sheets":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/FoodBalanceSheets_E_All_Data.zip","updated":"2013-03-14"}},"Prices":{"Producer Prices -<br> Monthly":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Prices_Monthly_E_All_Data.zip","updated":"2013-09-19"},"Producer Prices -<br> Annual":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Prices_E_All_Data.zip","updated":"2013-09-19"},"Producer Prices -<br> Archive":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/PricesArchive_E_All_Data.zip","updated":"2013-03-07"},"Producer Price Indices<br> - Annual":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Price_Indices_E_All_Data.zip","updated":"2013-02-11"}},"Resources":{"Fertilizers":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Resources_Fertilizers_E_All_Data.zip","updated":"2013-08-12"},"Fertilizers archive":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Resources_FertilizersArchive_E_All_Data.zip","updated":"2013-02-06"},"Fertilizers - Trade<br> Value":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Resources_FertilizersTradeValues_E_All_Data.zip","updated":"2013-02-06"},"Pesticides (use)":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Resources_Pesticides_Use_E_All_Data.zip","updated":"2013-08-22"},"Pesticides (trade)":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Resources_Pesticides_Trade_E_All_Data.zip","updated":"2013-02-06"},"Land":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Resources_Land_E_All_Data.zip","updated":"2013-05-14"}},"Population":{"Annual population":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Population_E_All_Data.zip","updated":"2013-02-05"}},"Investment":{"Capital Stock":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Investment_CapitalStock_E_All_Data.zip","updated":"2013-02-11"},"Machinery":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Investment_Machinery_E_All_Data.zip","updated":"2013-02-06"},"Machinery Archive":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Investment_MachineryArchive_E_All_Data.zip","updated":"2013-03-07"}},"Agri-Environmental<br> Indicators":{"Air and climate change":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Environment_AirClimateChange_E_All_Data.zip","updated":"2013-10-09"},"Energy":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Environment_Energy_E_All_Data.zip","updated":"2013-06-25"},"Fertilizers":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Environment_Fertilizers_E_All_Data.zip","updated":"2013-06-25"},"Land":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Environment_Land_E_All_Data.zip","updated":"2013-06-25"},"Livestock":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Environment_Livestock_E_All_Data.zip","updated":"2013-06-25"},"Pesticides":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Environment_Pesticides_E_All_Data.zip","updated":"2013-06-25"},"Soil":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Environment_Soil_E_All_Data.zip","updated":"2013-06-25"},"Water":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Environment_Water_E_All_Data.zip","updated":"2013-06-25"}},"Emissions - Agriculture":{"Agriculture Total":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Agriculture_total_E_All_Data.zip","updated":"2013-02-05"},"Enteric Fermentation":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Enteric_Fermentation_E_All_Data.zip","updated":"2013-02-05"},"Manure Management":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Manure_Management_E_All_Data.zip","updated":"2013-02-05"},"Rice Cultivation":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Rice_Cultivation_E_All_Data.zip","updated":"2013-02-05"},"Synthetic Fertilizers":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Synthetic_Fertilizers_E_All_Data.zip","updated":"2013-02-05"},"Manure applied to soils":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Manure_applied_to_soils_E_All_Data.zip","updated":"2013-02-05"},"Manure left on pasture":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Manure_left_on_pasture_E_All_Data.zip","updated":"2013-02-05"},"Crop Residues":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Crop_Residues_E_All_Data.zip","updated":"2013-02-05"},"Cultivated Organic<br> Soils":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Cultivated_Organic_Soils_E_All_Data.zip","updated":"2013-02-05"},"Burning Crop Residues":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Burning_crop_residues_E_All_Data.zip","updated":"2013-02-05"}},"Emissions - Land Use":{"Forest Land":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Land_Use_Forest_Land_E_All_Data.zip","updated":"2013-02-05"},"Cropland":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Land_Use_Cropland_E_All_Data.zip","updated":"2013-02-05"}},"Forestry":{"Forestry Production and<br> Trade":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Forestry_E_All_Data.zip","updated":"2013-07-26"},"Forestry Trade Flows":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/ForestryTradeFlows_E_2.zip","updated":"2012-07-13"}},"ASTI R&amp;D Indicators":{}}';

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
1. http://faostat3.fao.org/faostat-gateway/go/to/download/C/CC/E and click on bulk downloads
2. run:
    $('ul#root li span.jqx-tree-item-arrow-collapse-faostat').click(); //expands the entire tree
3. after tree is open, run:
    tree = {};
    $('ul#root>li').each(function(){
        branch = $(this).find("div").html();
        tree[branch]={};
    });
    sublis=$('ul#root>li li');
    i=0;
    $(sublis[i]).find('div').click();
    FAOSTATDownload.bulkDownload();
    subTimer = setInterval(
         function(){
            FAOSTATDownload.bulkDownload();
            setTimeout(function(){
                sub = $(sublis[i]).find('div').html();
                branch = $(sublis[i]).closest("ul").closest("li").children('div').html();
                console.info('branch: '+branch+', sub: '+sub);
                if($('#domainNameTitle').html()){
                    lastUpdated = $('#domainNameTitle').html().match(/\(([^\)]+)/)[1];
                    tree[branch][sub]={link: $('#bulkDownloadsList li:last a').attr('href'), updated: lastUpdated};
                }
                if(++i>sublis.length)clearInterval(subTimer); else $(sublis[i]).find('div').click();
            },
            2500);
        },
        5000
    );
*/

function ApiCrawl($catid, $api_row){ //initiates a FAO crawl
    global $downloadFiles;
    global $treeJson;
    global $db;
    $ROOT_FAO_CATID = $api_row["rootcatid"];
    $baseCats = json_decode($treeJson, true);
    //first build the base categories:
    $insertInitialRun = "insert into apirunjobs (runid, jobjson, tries, status, startdt) values(".$api_row["runid"] .",'{\"startCrawl\":true}',1,'R', now())";
    $result = runQuery($insertInitialRun);
    $jobid = $db->insert_id;

    foreach($baseCats as $primeCategory=>$subTree){
        $primeCatid = setCategoryByName($api_row['apiid'], $primeCategory, $ROOT_FAO_CATID);
        foreach($subTree as $branchName=>$branchInfo){
            set_time_limit(300);
            if($branchName!="Producer Prices -<br> Monthly"){ //this is a different format;  only a few months given.  Maybe ingest if we can get a decade of prices
                $branchName = str_ireplace("<br>"," ",$branchName);
                $catid = setCategoryByName($api_row['apiid'], $branchName, $primeCatid);
                $branchInfo["catid"] = $catid;
                $branchInfo["name"] = $branchName;
                $fileName = substr_replace(substr($branchInfo["link"], strrpos($branchInfo["link"],"/")),"",-4);
                $branchInfo["file"] = $fileName.'.csv';
                $branchInfo["primeCategory"] = $primeCategory;
                $branchInfo["branchName"] = $branchName;
                if($downloadFiles || !file_exists("bulkfiles/fao/".$fileName.".csv")){
                    print('downloading '.$branchInfo["link"].' to '."bulkfiles/fao/".$fileName.".zip".'<br>');
                    flush();
                    ob_flush();
                    $fr = fopen($branchInfo["link"], 'r');
                    file_put_contents("bulkfiles/fao/".$fileName.".zip", $fr);
                    fclose($fr);
                    print('unzipping '.$fileName.'.zip<br>');
                    $zip = new ZipArchive;
                    $zip->open("bulkfiles/fao/".$fileName.".zip");
                    $zip->extractTo('./bulkfiles/fao/');
                    $zip->close();
                    unlink("bulkfiles/fao/".$fileName.".zip");  //delete the zip file
                    print('downloading '.$fileName.'.zip<br>');
                }
                if(file_exists("bulkfiles/fao/".$fileName.".csv")){
                    print("creating job for ".$branchName." > ".json_encode($branchInfo)."<br>");
                    flush();
                    ob_flush();
                    //queue the job after the file is downloaded and unzipped
                    $sql = "insert DELAYED into apirunjobs (runid, jobjson, tries, status) values(".$api_row["runid"] .",".safeStringSQL(json_encode($branchInfo)).",0,'Q')";
                    runQuery($sql);
                }
                runQuery("update apiruns set finishdt=now() where runid=".$api_row["runid"]);
                runQuery("update apirunjobs set enddt=now() where jobid=".$jobid);
            }
        }
    }
    runQuery("update apirunjobs set status='S' where jobid=".$jobid);
}

function ApiExecuteJob($api_run_row, $job_row){//runs all queued jobs in a single single api run until no more
    global $MAIL_HEADER, $db;
    $jobid = $job_row["jobid"];
    $runid = $api_run_row["runid"];
    $apiid = $api_run_row["apiid"];

    //reusable SQL statements
    $updateRunSql = "update apiruns set finishdt=now() where runid=$runid";
    $updateJobSql = "update apirunjobs set status = 'R', enddt=now() where jobid=$jobid";

    //UPDATE THE RUN'S FINISH DATE
    runQuery($updateRunSql);
    $status = array("updated"=>0,"failed"=>0,"skipped"=>0, "added"=>0);


    //$result is a pointer to the job to run
    set_time_limit(600);

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

    $branchInfo = json_decode($job_row['jobjson'], true);
    $branchName = $branchInfo['name'];
    $catid  = $branchInfo['catid'];
    print("STARTING FAO : $branchName (job $jobid)<br>\r\n");
    $time_start = microtime(true);
    $stats = []; //parse entire file into structured assoc. array (series not always ordered together in file!)
    $csv=fopen("bulkfiles/fao".$branchInfo["file"],"r");
    $header = fgets($csv);  //throw away the header line
    $lastLine = false;  //must have successfully read a line to merit the final saveFaoSeries
    if($HEADER==trim($header)){ //know file format
        $headers = json_decode("[". $header . "]");
        $lineCounter = 0;
        while(!feof($csv)){
            $line = json_decode("[". fgets($csv) . "]");
            if(count($line)==11){
                /*$lineCounter++;
                if(intval($lineCounter/1000)*1000==$lineCounter) {
                    $time_elapsed =  (microtime(true) - $time_start)*1000;
                    printNow($time_elapsed ."ms for last 1000 lines: " . $lineCounter);
                    $time_start = microtime(true);
                }*/
                $setKey = $line[$colElementCode]."-".$line[$colItemCode]."-". $line[$colUnit];
                if(!isset($stats[$setKey])){
                    $setName =  $line[$colElement] .": ". $line[$colItem];
                    //printNow("new set: $setName");
                    $stats[$setKey] = [
                        "name" => $setName,
                        "item" => $line[$colItem],
                        "units" => $line[$colUnit],
                        "series" => []
                    ];
                }
                //special country cases
                if($line[$colCountry] == "Ethiopia PDR") $line[$colCountry] = "Ethiopia";  //combine the two into a single series under geoid=72
                if($line[$colCountry] == "China") $line[$colCountry] = "XXhina";  //use "China, mainland" with Taiwan and HK separate

                if(faoCountryLookup($line[$colCountry])){
                    if(!isset($stats[$setKey]["series"][$line[$colCountry]])){
                        $stats[$setKey]["series"][$line[$colCountry]] = [];
                    }
                    $stats[$setKey]["series"][$line[$colCountry]][] = $line[$colYear].":".$line[$colValue];
                } //else  printNow("not found $line[$colCountry]");
            }
        }
        //finished reading file
        foreach($stats as $setKey => &$set){
            set_time_limit(600);
            foreach($set["series"] as $country => &$data){
                if(count($data)>0 && strpos($set["units"], "LCU")===false ){
                    $geo = faoCountryLookup($country);
                    if(!isset($set["setid"])){
                        //set with data & need to save/get the set from the db
                        if(strpos($set["units"], "SLC")!==false){
                            $thisSetKey = $setKey . ":" . $geo["currency"];
                            $thisSetName = str_ireplace("SLC",$geo["currency"], $set["name"]);
                            $thisSetName = str_ireplace("Standard Local Currency",$geo["currency"], $thisSetName);
                            $thisSetUnits = str_replace("SLC",$geo["currency"], $set["units"]);
                            $thisSetId = saveSet($apiid, $thisSetKey, $thisSetName, $thisSetUnits, "UNFAO", "http://faostat3.fao.org/home/index.html", "Data from ".$branchInfo["link"]);
                            //note: do not save setid for series in SLC because the set is actually multiple sets by currency
                        } else {
                            $thisSetId = saveSet($apiid, $setKey, $set["name"], $set["units"], "UNFAO", "http://faostat3.fao.org/home/index.html", "Data from ".$branchInfo["link"]);
                            if(!$thisSetId) die($setKey." ".$set["name"]." ".$set["units"]);
                            $set["setid"] = $thisSetId;  //save to only call db once
                        }
                    } else {
                        $thisSetId = $set["setid"];
                    }
                    if(isset($set["series"]["catid"])){
                        $thisCatId = $set["series"]["catid"];
                    } else {
                        $item = $set["item"];
                        $thisCatId = setCategoryByName($apiid, $item, $branchInfo["catid"]);
                        setCatSet($thisCatId, $thisSetId);
                    }
                    sort($data);
                    saveSetData($status, $thisSetId, $apiid, null, "A", $geo["geoid"], "", $data, $country==$geo["name"]?false:$country);
                }
            }
        }
        unset($stats);  //delete the massive assoc array from mem.
        $updatedJobJson = json_encode(array_merge($branchInfo, $status));
        runQuery( "update apirunjobs set status = 'S', jobjson=".safeStringSQL($updatedJobJson). ", enddt=now() where jobid=$jobid");
        /* runQuery($updateRunSql);
       runQuery( "update apiruns set scanned=scanned+".$status["skipped"]."+".$status["added"]."+".$status["failed"]."+".$status["updated"]
            .", added=added+".$status["added"]
            .", updated=updated+".$status["updated"]
            .", failed=failed+".$status["failed"]
            ." where runid=$runid");*/

    } else { //unknown file format
        print("mismatch between file header format and expected format<br>".$header."X<br>");
        print($HEADER."X<br>");
        runQuery( "update apirunjobs set status = 'F', enddt=now() where jobid=$jobid");
        runQuery($updateRunSql);
    }
    print("ENDING FAO $branchName: ".$branchInfo["file"]." (job $jobid)<br>\r\n");
    return $status;
}

function ApiRunFinished($api_run){
    set_time_limit(200);
    setGhandlesPeriodicitiesFirstLast($api_run["apiid"]);
    set_time_limit(200);
    setMapsetCounts("all", $api_run["apiid"]);
    set_time_limit(200);
    prune($api_run["apiid"]);  //remove empty categories
}
/*
function saveFaoSeries(&$status, $api_row, $jobid, $series_header, $branchInfo, $line, $aryData){
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

    static $unknownGeographies = [];
    static $setIds = [];
    $thisCatId = setCategoryByName($api_row["apiid"], $series_header[$colItem], $branchInfo["catid"]);
    $geo = faoCountryLookup($series_header[$colCountry]);
    if($geo){
        $geoid = $geo["geoid"];
        $setName = $series_header[$colElement] .": ". $series_header[$colItem];
        $setkey = $series_header[$colElementCode]."-".$series_header[$colItemCode]."-". $series_header[$colUnit];
        if(strpos("LCU", $series_header[$colUnit])!==false){
            $setkey .= $geo["currency"];
            $setName = preg_replace("LCU",$geo["currency"], $setName);
        }
        if(isset($setIds[$setkey])){
            $setId = $setIds[$setkey];
        } else {
            $setId = saveSet(
                $api_row["apiid"],
                $setkey,
                $setName,
                $series_header[$colUnit],
                "UNFAO",
                "http://faostat3.fao.org/home/index.html",
                "Data from ".$branchInfo["link"]
            );
            setCatSet($thisCatId, $setId);
            //TODO move url and note to api.url and api.metadata
            $setIds[$setkey] = $setId;
        }
        //$mapSetId = getMapSet($setName, $api_row["apiid"], "A", $series_header[$colUnit]);  //every series is part of a mapset, even if it not mappable

        $skey = $setkey .":".$series_header[$colCountryCode];
        saveSetData($status, $setId, "A", $geoid, "", $aryData, false, false, date("yyyymdd"));
        $seriesid = updateSeries(
            $status,
            $jobid,
            $skey,
            $setName.": ".$series_header[$colCountry],
            "FAO",
            "http://faostat3.fao.org/home/index.html",
            "A",
            $series_header[$colUnit],
            $series_header[$colUnit],
            "For methodology, classification, local currency units, and abbreviations visit http://faostat3.fao.org/home/index.html#METADATA_METHODOLOGY. Data from ".$branchInfo["link"],
            $branchInfo["name"],
            $api_row["apiid"],
            $branchInfo["updated"],
            strtotime($series_header[$colYear]."-01-01 UTC")*1000,
            strtotime($line[$colYear]."-01-01 UTC")*1000,
            $aryData,
            $geoid,
            $mapSetId,
            null, null, null);
        catSeries($thisCatId, $seriesid);
        return ["setid"=>$setId, "periodicity"=>"A", "geoid"=>$geoid, "latlon"=>""];
    } else {
        if(array_search($series_header[$colCountry], $unknownGeographies)===false){
            $unknownGeographies[] = $series_header[$colCountry];
            logEvent("unknown FAO geography", $series_header[$colCountry]." in ". $branchInfo["file"]);
        }
        $status["failed"]++;
        return false;
    }
}*/

function faoCountryLookup($faoCountry){
    //does not currently handle FAO regions
    static $countries = "null";
    static $faoMatches = []; //speeds up search for something tha must be done 500,000 times per complete FAO ingest
    static $matchesByGhandle = [];
    if($countries=="null"){
        $countries = array();
        $result = runQuery("select geoid, name, coalesce(currency, 'local currency unit') as currency, regexes, exceptex from geographies where geoset='countries' order by length(name) desc");
        while($row=$result->fetch_assoc()){
            $countries[] = $row;
        }
    }
    if($faoCountry == "World + (Total)") {
        $faoCountry = "World";
    } elseif($faoCountry == "European Union + (Total)"){
        $faoCountry = "European Union";
    } elseif (strpos($faoCountry, " + (Total)")!==false) return null;

    if(array_key_exists($faoCountry, $faoMatches)){
        return $faoMatches[$faoCountry];
    } else {
        for($i=0;$i<count($countries);$i++){
            $regex = "#( for | in | from )?". $countries[$i]["regexes"]."#";

            if(preg_match($regex, $faoCountry, $matches)==1){
                $exceptex = $countries[$i]["exceptex"];
                if($exceptex==null || preg_match("#".$exceptex."#", $faoCountry, $matches)==0){
                    $faoMatches[$faoCountry] = $countries[$i];
                    if(isset($matchesByGhandle["G".$countries[$i]["geoid"]])) logEvent("FAO ingest duplicate country detected","G".$countries[$i]["geoid"].": ".$matchesByGhandle["G".$countries[$i]["geoid"]]." vs. ". $faoCountry);
                    $matchesByGhandle["G".$countries[$i]["geoid"]] = $faoCountry;
                    //printNow("G".$countries[$i]["geoid"]." (".$countries[$i]["name"].") = ".$faoCountry);
                    return $faoMatches[$faoCountry];
                }
            }
        }
    }
    printNow("$faoCountry is not a recognized country");
    $faoMatches[$faoCountry] = null;
    return $faoMatches[$faoCountry];
}

