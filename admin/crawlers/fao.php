<?php
$event_logging = true;
$sql_logging = false;
$downloadFiles = true;  //SET THIS TRUE TO GET THE LATEST FAO; ELSE WILL ONLY DOWN IF FILE DOES NOT EXIST LOCALLY



/* This is the plugin for the St Louis Federal Reserve API.  This and other API specific plugins
 * are included by /admin/crawlers/index.php and invoke by the admin panel /admin
 * All returns are JSON objects. Supports the standard MD API functions:
 *
 * command: Get | Update | Crawl
 *   search
 *   freq
 * command: Crawl
 *   exhaustive crawl starting at cat_id=0
 * command:  Update
 *   freq:  D|M|A|ALL.  If missing, smartupdate  algorithm
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
//$treeJson = '{"Production":{"Crops":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Production_Crops_E_All_Data.zip","updated":"2013-08-08"},"Crops processed":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Production_CropsProcessed_E_All_Data.zip","updated":"2013-08-08"},"Live Animals":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Production_Livestock_E_All_Data.zip","updated":"2013-08-21"},"Livestock Primary":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Production_LivestockPrimary_E_All_Data.zip","updated":"2013-08-08"},"Livestock Processed":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Production_LivestockProcessed_E_All_Data.zip","updated":"2013-08-08"},"Production Indices":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Production_Indices_E_All_Data.zip","updated":"2013-08-08"},"Value of Agricultural<br> Production":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Value_of_Production_E_All_Data.zip","updated":"2013-09-20"}},"Trade":{"Crops and livestock<br> products":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Trade_Crops_Livestock_E_All_Data.zip","updated":"2013-08-30"},"Live animals":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Trade_LiveAnimals_E_All_Data.zip","updated":"2013-08-30"},"Trade Indices":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Trade_Indices_E_All_Data.zip","updated":"2013-02-07"}},"Food Supply":{"Crops Primary<br> Equivalent":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/FoodSupply_Crops_E_All_Data.zip","updated":"2013-02-14"},"Livestock and Fish<br> Primary Equivalent":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/FoodSupply_LivestockFish_E_All_Data.zip","updated":"2013-02-14"}},"Commodity Balances":{"Crops Primary<br> Equivalent":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/CommodityBalances_Crops_E_All_Data.zip","updated":"2013-02-14"},"Livestock and Fish<br> Primary Equivalent":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/CommodityBalances_LivestockFish_E_All_Data.zip","updated":"2013-02-14"}},"Food Balance Sheets":{"Food Balance Sheets":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/FoodBalanceSheets_E_All_Data.zip","updated":"2013-03-14"}},"Prices":{"Producer Prices -<br> Monthly":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Prices_Monthly_E_All_Data.zip","updated":"2013-09-19"},"Producer Prices -<br> Annual":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Prices_E_All_Data.zip","updated":"2013-09-19"},"Producer Prices -<br> Archive":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/PricesArchive_E_All_Data.zip","updated":"2013-03-07"},"Producer Price Indices<br> - Annual":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Price_Indices_E_All_Data.zip","updated":"2013-02-11"}},"Resources":{"Fertilizers":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Resources_Fertilizers_E_All_Data.zip","updated":"2013-08-12"},"Fertilizers archive":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Resources_FertilizersArchive_E_All_Data.zip","updated":"2013-02-06"},"Fertilizers - Trade<br> Value":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Resources_FertilizersTradeValues_E_All_Data.zip","updated":"2013-02-06"},"Pesticides (use)":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Resources_Pesticides_Use_E_All_Data.zip","updated":"2013-08-22"},"Pesticides (trade)":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Resources_Pesticides_Trade_E_All_Data.zip","updated":"2013-02-06"},"Land":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Resources_Land_E_All_Data.zip","updated":"2013-05-14"}},"Population":{"Annual population":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Population_E_All_Data.zip","updated":"2013-02-05"}},"Investment":{"Capital Stock":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Investment_CapitalStock_E_All_Data.zip","updated":"2013-02-11"},"Machinery":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Investment_Machinery_E_All_Data.zip","updated":"2013-02-06"},"Machinery Archive":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Investment_MachineryArchive_E_All_Data.zip","updated":"2013-03-07"}},"Agri-Environmental<br> Indicators":{"Air and climate change":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Environment_AirClimateChange_E_All_Data.zip","updated":"2013-10-09"},"Energy":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Environment_Energy_E_All_Data.zip","updated":"2013-06-25"},"Fertilizers":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Environment_Fertilizers_E_All_Data.zip","updated":"2013-06-25"},"Land":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Environment_Land_E_All_Data.zip","updated":"2013-06-25"},"Livestock":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Environment_Livestock_E_All_Data.zip","updated":"2013-06-25"},"Pesticides":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Environment_Pesticides_E_All_Data.zip","updated":"2013-06-25"},"Soil":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Environment_Soil_E_All_Data.zip","updated":"2013-06-25"},"Water":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Environment_Water_E_All_Data.zip","updated":"2013-06-25"}},"Emissions - Agriculture":{"Agriculture Total":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Agriculture_total_E_All_Data.zip","updated":"2013-02-05"},"Enteric Fermentation":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Enteric_Fermentation_E_All_Data.zip","updated":"2013-02-05"},"Manure Management":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Manure_Management_E_All_Data.zip","updated":"2013-02-05"},"Rice Cultivation":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Rice_Cultivation_E_All_Data.zip","updated":"2013-02-05"},"Synthetic Fertilizers":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Synthetic_Fertilizers_E_All_Data.zip","updated":"2013-02-05"},"Manure applied to soils":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Manure_applied_to_soils_E_All_Data.zip","updated":"2013-02-05"},"Manure left on pasture":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Manure_left_on_pasture_E_All_Data.zip","updated":"2013-02-05"},"Crop Residues":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Crop_Residues_E_All_Data.zip","updated":"2013-02-05"},"Cultivated Organic<br> Soils":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Cultivated_Organic_Soils_E_All_Data.zip","updated":"2013-02-05"},"Burning Crop Residues":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Agriculture_Burning_crop_residues_E_All_Data.zip","updated":"2013-02-05"}},"Emissions - Land Use":{"Forest Land":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Land_Use_Forest_Land_E_All_Data.zip","updated":"2013-02-05"},"Cropland":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Emissions_Land_Use_Cropland_E_All_Data.zip","updated":"2013-02-05"}},"Forestry":{"Forestry Production and<br> Trade":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/Forestry_E_All_Data.zip","updated":"2013-07-26"},"Forestry Trade Flows":{"link":"http://faostat.fao.org/Portals/_Faostat/Downloads/zip_files/ForestryTradeFlows_E_2.zip","updated":"2012-07-13"}},"ASTI R&amp;D Indicators":{}}';


//fetched Jul 22, 2015
$treeJson = '{"Food Security":{"Suite of Food Security<br> Indicators":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Food_Security_Data_E_All_Data.zip","updated":null}},"Production":{"Crops":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Production_Crops_E_All_Data.zip","updated":null},"Crops processed":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Production_CropsProcessed_E_All_Data.zip","updated":null},"Live Animals":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Production_Livestock_E_All_Data.zip","updated":null},"Livestock Primary":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Production_LivestockPrimary_E_All_Data.zip","updated":null},"Livestock Processed":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Production_LivestockProcessed_E_All_Data.zip","updated":null},"Production Indices":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Production_Indices_E_All_Data.zip","updated":null},"Value of Agricultural<br> Production":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Value_of_Production_E_All_Data.zip","updated":null}},"Trade":{"Crops and livestock<br> products":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Trade_Crops_Livestock_E_All_Data.zip","updated":null},"Live animals":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Trade_LiveAnimals_E_All_Data.zip","updated":null},"Detailed trade matrix":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Trade_DetailedTradeMatrix_E_All_Data.zip","updated":null},"Trade Indices":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Trade_Indices_E_All_Data.zip","updated":null}},"Food Balance":{"Commodity Balances -<br> Crops Primary Equivalent":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/CommodityBalances_Crops_E_All_Data.zip","updated":null},"Commodity Balances -<br> Livestock and Fish Primary Equivalent":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/CommodityBalances_LivestockFish_E_All_Data.zip","updated":null},"Food Supply - Crops<br> Primary Equivalent":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/FoodSupply_Crops_E_All_Data.zip","updated":null},"Food Supply - Livestock<br> and Fish Primary Equivalent":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/FoodSupply_LivestockFish_E_All_Data.zip","updated":null}},"Prices":{"Producer Prices -<br> Annual":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Prices_E_All_Data.zip","updated":null},"Producer Prices -<br> Monthly":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Prices_Monthly_E_All_Data.zip","updated":null},"Producer Price Indices<br> - Annual":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Price_Indices_E_All_Data.zip","updated":null},"Producer Prices -<br> Archive":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/PricesArchive_E_All_Data.zip","updated":null},"Consumer Price Indices":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/ConsumerPriceIndices_E_All_Data.zip","updated":null}},"Inputs":{"Fertilizers":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Inputs_Fertilizers_E_All_Data.zip","updated":null},"Fertilizers archive":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Resources_FertilizersArchive_E_All_Data.zip","updated":null},"Fertilizers - Trade<br> Value":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Resources_FertilizersTradeValues_E_All_Data.zip","updated":null},"Pesticides (use)":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Inputs_Pesticides_Use_E_All_Data.zip","updated":null},"Pesticides (trade)":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Inputs_Pesticides_Trade_E_All_Data.zip","updated":null},"Land":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Inputs_Land_E_All_Data.zip","updated":null}},"Population":{"Annual population":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Population_E_All_Data.zip","updated":null}},"Investment":{"Capital Stock":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Investment_CapitalStock_E_All_Data.zip","updated":null},"Machinery":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Investment_Machinery_E_All_Data.zip","updated":null},"Machinery Archive":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Investment_MachineryArchive_E_All_Data.zip","updated":null},"Government Expenditure":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Investment_GovernmentExpenditure_E_All_Data.zip","updated":null},"Credit to Agriculture":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Investment_CreditAgriculture_E_All_Data.zip","updated":null}},"Macro-Statistics":{"Key Indicators":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Macro-Statistics_Key_Indicators_E_All_Data.zip","updated":null}},"Agri-Environmental<br> Indicators":{"Air and climate change":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Environment_AirClimateChange_E_All_Data.zip","updated":null},"Energy":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Environment_Energy_E_All_Data.zip","updated":null},"Fertilizers":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Environment_Fertilizers_E_All_Data.zip","updated":null},"Land":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Environment_Land_E_All_Data.zip","updated":null},"Livestock":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Environment_Livestock_E_All_Data.zip","updated":null},"Pesticides":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Environment_Pesticides_E_All_Data.zip","updated":null},"Soil":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Environment_Soil_E_All_Data.zip","updated":null},"Water":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Environment_Water_E_All_Data.zip","updated":null}},"Emissions - Agriculture":{"Agriculture Total":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Emissions_Agriculture_Agriculture_total_E_All_Data.zip","updated":null},"Enteric Fermentation":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Emissions_Agriculture_Enteric_Fermentation_E_All_Data.zip","updated":null},"Manure Management":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Emissions_Agriculture_Manure_Management_E_All_Data.zip","updated":null},"Rice Cultivation":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Emissions_Agriculture_Rice_Cultivation_E_All_Data.zip","updated":null},"Synthetic Fertilizers":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Emissions_Agriculture_Synthetic_Fertilizers_E_All_Data.zip","updated":null},"Manure applied to Soils":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Emissions_Agriculture_Manure_applied_to_soils_E_All_Data.zip","updated":null},"Manure left on Pasture":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Emissions_Agriculture_Manure_left_on_pasture_E_All_Data.zip","updated":null},"Crop Residues":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Emissions_Agriculture_Crop_Residues_E_All_Data.zip","updated":null},"Cultivation of Organic<br> Soils":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Emissions_Agriculture_Cultivated_Organic_Soils_E_All_Data.zip","updated":null},"Burning - Savanna":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Emissions_Agriculture_Burning_Savanna_E_All_Data.zip","updated":null},"Burning - Crop Residues":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Emissions_Agriculture_Burning_crop_residues_E_All_Data.zip","updated":null},"Energy Use":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Emissions_Agriculture_Energy_E_All_Data.zip","updated":null}},"Emissions - Land Use":{"Land Use Total":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Emissions_Land_Use_Land_Use_Total_E_All_Data.zip","updated":null},"Forest Land":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Emissions_Land_Use_Forest_Land_E_All_Data.zip","updated":null},"Cropland":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Emissions_Land_Use_Cropland_E_All_Data.zip","updated":null},"Grassland":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Emissions_Land_Use_Grassland_E_All_Data.zip","updated":null},"Burning - Biomass":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Emissions_Land_Use_Burning_Biomass_E_All_Data.zip","updated":null}},"Forestry":{"Forestry Production and<br> Trade":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Forestry_E_All_Data.zip","updated":null},"Forestry Trade Flows":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Forestry_Trade_Flows_E_All_Data.zip","updated":null}},"ASTI R&amp;D Indicators":{"ASTI-Researchers by<br> Agency Type":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/ASTI_ResearchersAgency_E_All_Data.zip","updated":null},"ASTI-Researchers by<br> Gender and Degree Level":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/ASTI_ResearchersGenderDegree_E_All_Data.zip","updated":null},"ASTI-Expenditures":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/ASTI_Expenditures_E_All_Data.zip","updated":null}},"Emergency Response":{"Food Aid Shipments<br> (WFP)":{"link":"http://faostat3.fao.org/faostat-bulkdownloads/Food_Aid_Shipments_WFP_E_All_Data.zip","updated":null}}}';

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
to refetch tree with last updated dates: */
//1. hhttp://faostat3.fao.org/download/Q/*/E
/*
2. run:
    $('ul#root li span.jqx-tree-item-arrow-collapse-faostat').click(); //expands the entire tree;  MAY NEED TO CLICK OIN TREE BEFORE STEP 2
3. after tree is open, run:
    var tree = {};
    $('ul#root>li').each(function(){
        var branch = $(this).find("div").html();
        tree[branch]={};
    });
    var sublists=$('ul#root>li li');
    var md_index = 0, skipIndexes = [13]; //food balance page causes error + dataset covers only 42 countries.
    var subTimer = setInterval(
        function(){
            $(sublists[md_index]).find('div').click(); //load the right pane and get the title
            var branch = $(sublists[md_index]).closest("ul").closest("li").children('div').html();
            setTimeout(function(){  //allow right pane to load
                    var sub = $(sublists[md_index]).find('div').html();
                    F3DWLD.showBulkDownloads();  //$('#bulk-downloads-menu li').mousedown();  //load the bulk download menu
                    setTimeout(function(){  //allow the bulkdownload menu to load
                            console.info('branch: '+branch+', sub: '+sub);
                            $('#bulk-downloads-menu ul ul li a').each(function(){
                                if($(this).attr('href').toUpperCase().indexOf('_ALL_DATA.ZIP')>0) {
                                    tree[branch][sub]={link: $(this).attr('href').trim(), updated: null}
                                }
                            });
                            if(!tree[branch][sub]) console.info('all data zip file not found!!!!!!');
                        },
                        1500);
                    if(++md_index>sublists.length) clearInterval(subTimer);
                    if(skipIndexes.indexOf(md_index)!==-1) md_index++;
                },
                1500);
        },
        3200
    );
3.  JSON.stringify(tree);
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

function ApiExecuteJob($api_run_job_row){//runs all queued jobs in a single single api run until no more
    global $MAIL_HEADER, $db;
    $jobid = $api_run_job_row["jobid"];
    $runid = $api_run_job_row["runid"];
    $apiid = $api_run_job_row["apiid"];

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

    $branchInfo = json_decode($api_run_job_row['jobjson'], true);
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
                            $thisSetId = saveSet($apiid, $thisSetKey, $thisSetName, $thisSetUnits, "UNFAO", "http://faostat3.fao.org/home/E", "Data from ".$branchInfo["link"]);
                            //note: do not save setid for series in SLC because the set is actually multiple sets by currency
                        } else {
                            $thisSetId = saveSet($apiid, $setKey, $set["name"], $set["units"], "UNFAO", "http://faostat3.fao.org/home/E", "Data from ".$branchInfo["link"]);
                            if(!$thisSetId) emailAdminFatal("error ingesting FAO", "unable to save set: $setKey $set[name] $set[units]");
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
                    saveSetData($status, $thisSetId, $apiid, null, "A", $geo["geoid"], "", $data, date("Y-m-d"));
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
    setGhandlesFreqsFirstLast($api_run["apiid"]);
    set_time_limit(200);
    setMapsetCounts("all", $api_run["apiid"]);
    set_time_limit(200);
    prune($api_run["apiid"]);  //remove empty categories
}

function faoCountryLookup($faoCountry){
    //does not currently handle FAO regions
    static $countries = "null";  //filled with db.geographies
    static $faoMatches = []; //speeds up search for something that must be done 500,000 times per complete FAO ingest
    static $matchesByGhandle = []; //helper array to find potential errors
    //1-time database read of geographies into static $countries
    if($countries=="null"){
        $countries = array();
        $result = runQuery("select geoid, name, coalesce(currency, 'local currency unit') as currency, regexes, exceptex from geographies where geoset='countries' and regexes is not null order by length(name) desc");
        while($row=$result->fetch_assoc()){
            $countries[] = $row;
        }
    }
    //Only allow World, EU, and Africa totals; skip the others (e.g. "Eastern Asia + (Total)")
    if($faoCountry == "World + (Total)") {
        $faoCountry = "World";
    } elseif($faoCountry == "European Union + (Total)"){
        $faoCountry = "European Union";
    } elseif($faoCountry == "Africa + (Total)"){
        $faoCountry = "Africa";
    } elseif (strpos($faoCountry, " + (Total)")!==false) return null;

    if(array_key_exists($faoCountry, $faoMatches)){
        return $faoMatches[$faoCountry];  //found in cache!
    } else {
        for($i=0;$i<count($countries);$i++){
            $regex = "#( for | in | from )?". $countries[$i]["regexes"]."#";
            if($countries[$i]["name"]==$faoCountry || ($regex && preg_match($regex, $faoCountry, $matches)==1)){
                $exceptex = $countries[$i]["exceptex"];
                if($exceptex==null || preg_match("#".$exceptex."#", $faoCountry, $matches)==0){
                    $faoMatches[$faoCountry] = $countries[$i];
                    if(isset($matchesByGhandle["G".$countries[$i]["geoid"]])) {
                        $event = "FAO ingest duplicate country detected";
                        $eventMsg = "G".$countries[$i]["geoid"].": ".$matchesByGhandle["G".$countries[$i]["geoid"]]." vs. ". $faoCountry;
                        print($event . " = " . $eventMsg);
                        logEvent($event, $eventMsg);
                    }
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

