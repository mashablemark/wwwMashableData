<?php
/**
 * Created by JetBrains PhpStorm.
 */

$event_logging = true;
$sql_logging = false;

/*To clean JODI API, leaving only the 3 root cats:
rerunning import... Jun 2013
    DELETE FROM series WHERE apiid = 6;
    DELETE FROM categories WHERE apiid=6 AND catid >= 318252;
    DELETE FROM catcat WHERE parentidid > 318249;
    DELETE FROM catseries WHERE catid >= 318249;
*/

$JODI_FILES = array(
    "secondary petroleum products" => array(
        "url" => "https://www.jodidata.org/_resources/files/downloads/oil-data/world_primary_csv.zip",
        //"url" => "http://www.jodidata.org/_resources/files/downloads/data/world_secondary_csv1.zip",
        "filename" => "world_Secondary_CSV",
        "filenum"=> 2

    ),
    "primary petroleum products" => array(
        "url" => "https://www.jodidata.org/_resources/files/downloads/oil-data/world_secondary_csv.zip",
        //"url" => "http://www.jodidata.org/_resources/files/downloads/data/world_primary_csv1.zip",
        "filename" => "world_Primary_CSV",
        "filenum"=> 1
    )
);
//JODI_Gas_world_CSV20140826.csv header in jodi-gas_csv.zip = "Country,Product,Flow,Date,Quantity,Code"

/*JODI GAS
file = JODI_Gas_world_CSV20140826.csv in jodi-gas_csv.zip
csv header = "Country,Product,Flow,Date,Quantity,Code"

JODI gas product codes:
    "LNGMT" =>["name"=>"Natural Gas (in form of LNG) in 1000 metric tons", "meta"=> "Natural gas is defined as a mixture of gaseous hydrocarbons, primarily methane, but generally also including ethane, propane and higher hydrocarbons in much smaller amounts and some non-combustible gases such as nitrogen and carbon dioxide. It includes both non-associated gas and associated gas. Colliery gas, coal seam gas and shale gas are included while manufactured gas and biogas are excluded except when blended with natural gas for final consumption. Natural gas liquids are excluded.<BR>When natural gas is liquefied and traded, the default unit of measurement is often the metric ton. In order to allow countries to report any LNG trade data in this unit, the JODI-Gas Questionnaire provides the option of reporting LNG trade data (and only LNG trade data) in metric tons."],
    "NATGASCM" =>["name"=>"Natural Gas in Million m3", "meta"=> "Natural gas is defined as a mixture of gaseous hydrocarbons, primarily methane, but generally also including ethane, propane and higher hydrocarbons in much smaller amounts and some non-combustible gases such as nitrogen and carbon dioxide. It includes both non-associated gas and associated gas. Colliery gas, coal seam gas and shale gas are included while manufactured gas and biogas are excluded except when blended with natural gas for final consumption. Natural gas liquids are excluded."],
    "NATGASTJ =>["name"=>"Natural Gas in Terajoules", "meta"=> "Natural gas is defined as a mixture of gaseous hydrocarbons, primarily methane, but generally also including ethane, propane and higher hydrocarbons in much smaller amounts and some non-combustible gases such as nitrogen and carbon dioxide. It includes both non-associated gas and associated gas. Colliery gas, coal seam gas and shale gas are included while manufactured gas and biogas are excluded except when blended with natural gas for final consumption. Natural gas liquids are excluded."],

JODI gas flow codes:
    "INDPROD" =>["name"=>"Production", "meta"=> "Dry marketable production within national boundaries, including offshore production, measured after purification and extraction of NGL and sulphur. Production does not include quantities reinjected, extraction losses or quantities vented or fl ared. It should include quantities used within the natural gas industry, in gas extraction, pipeline systems and processing plants."],
    "OTHSOURCES" =>["name"=>"Receipts from Other Sources", "meta"=> "Gas from energy products that have been already accounted for in the production of other energy products. Examples include petroleum gases or biogases that have been blended with natural gas."],
    "TOTIMPSB" =>["name"=>"total imports", "meta"=> "Amounts are considered imported or exported when they have crossed the physical boundaries of the country, whether customs clearance has taken place or not. Goods in transit and goods temporarily admitted/withdrawn are excluded but re-imports, that is domestic goods exported but subsequently readmitted, are included (same for reexports). Deliveries for international bunkers should be excluded."],
    "IMPLNG" =>["name"=>"liquefied natural gas (LNG) imports", "meta"=> "The import/export of  natural gas (LNG) through ocean tankers, to be reported in TJ, million cubic metres or metric tons (always on a re-gasified equivalent basis)."],
    "IMPPIP" =>["name"=>"Pipeline Imports", "meta"=> "The import/export of gaseous natural gas through pipelines, to be reported in TJ and million cubic metres."],
    "TOTEXPSB" =>["name"=>"total natural gas exports", "meta"=> "Amounts are considered imported or exported when they have crossed the physical boundaries of the country, whether customs clearance has taken place or not. Goods in transit and goods temporarily admitted/withdrawn are excluded but re-imports, that is domestic goods exported but subsequently readmitted, are included (same for reexports). Deliveries for international bunkers should be excluded."],
    "EXPLNG" =>["name"=>"liquefied natural gas (LNG) exports", "meta"=> "The import/export of liquefied natural gas (LNG) through ocean tankers, to be reported in TJ, million cubic metres or metric tons (always on a re-gasified equivalent basis)."],
    "EXPPIP" =>["name"=>"natural gas exports via pipeline", "meta"=> "The import/export of gaseous natural gas through pipelines, to be reported in TJ and million cubic metres."],
    "STCHANAT" =>["name"=>"stock change", "meta"=> "Stock Change should reflect the difference between the closing stock level and the opening stock level of recoverable gas, already extracted.<br>A stock build is shown as a positive number, and a stock draw as a negative number."],
    "GDINCTRO" =>["name"=>"Gross Inland Deliveries (calculated)", "meta"=> "This is defined as: Production + Receipts from Other Sources + Imports - Exports - Stock Change."],
    "STATDIFF" =>["name"=>"Statistical Difference (Calculated)", "meta"=> "This is the difference between the Calculated and Observed Gross Inland Deliveries."],
    "DEMAND" =>["name"=>"Gross Inland Deliveries (observed)", "meta"=> "This category represents deliveries of marketable gas to the inland market, including gas used by the gas industry for heating and operation of their equipment (i.e. consumption in gas extraction, in the pipeline system and in processing plants). Losses in distribution should also be included. Deliveries to international marine and aviation bunkers should be included."],
    "POWERGEN" =>["name"=>"Of which: Electricity and Heat Generation", "meta"=> "This covers the deliveries of natural gas for the generation of electricity and heat in power plants. Both main-activity and autoproducer plants are included."],
    "CSNATTER" =>["name"=>"closing stocks", "meta"=> "Closing Stocks refer to the stock level held on the national territory on the last day of the reference month."],
*/

$jodi_codes = array(
    "primary petroleum products"=> array(
        //products
        "CRUDEOIL" =>["name"=> "Crude oil",  "meta"=> "Including lease condensate"],
        "NGL" =>["name"=>"Natural Gas Liquids (NGL)",  "meta"=> "Liquid or liquefied hydrocarbons recovered from gas separation plants and gas processing facilities"],
        "OTHERCRUDE" =>["name"=>"other crude", "meta"=> "Refinery feedstocks + additives/oxygenates + other hydrocarbons"],
        "TOTCRUDE" =>["name"=>"total Crude", "meta"=> "Total = Crude oil + NGL + Other"],
        //flows
        "PRODREFOUT" =>["name"=> "Production",  "meta"=> "Production of Crude Oil only. Production: Crude Oil - Indigenous Production<br>Marketed production, after removal of impurities but including quantities consumed by the producer in the production process."],
        "OTHSOURCES" =>["name"=> "From other sources", "meta"=> "Inputs of additives, biofuels and other hydrocarbons that are produced from non-oil sources such as: coal, natural gas or renewables"],
        "TOTIMPSB" =>["name"=> "Imports", "meta"=> "Goods having physically crossed the national boundaries excluding transit trade, international marine and aviation bunkers."],
        "TOTEXPSB" =>["name"=> "Exports", "meta"=> "Goods having physically crossed the national boundaries excluding transit trade, international marine and aviation bunkers.<br>Exports should exclude international marine and aviation bunkers."],
        "PTRANSFBF" =>["name"=> "Products transferred", "meta"=> "Sum of Products transferred and Backflows from the petrochemical industry"],
        "DIRECTUSE" =>["name"=> "Direct use", "meta"=> "Refers to crude oil, NGL and Other which are used directly, without being processed in oil refineries, for example: crude oil burned for electricity generation"],
        "STCHANAT" =>["name"=> "Stock change", "meta"=> "Closing stock level (end of month) minus opening stock level (start of month). A positive number corresponds to a stock build, a negative number corresponds to a stock draw."],
        "STATDIFF" =>["name"=> "Statistical difference", "meta"=> "Differences between observed supply flows and Refinery intake or Demand"],
        "REFOBSDEM" =>["name"=> "Refinery intake", "meta"=> "Observed refinery throughputs."],
        "CSNATTER" =>["name"=> "Closing Stocks", "meta"=> "Represents the primary stock level at the end of the month within national territories. This includes stocks held by importers, refiners, stock holding organisations and governments."],
        ),
    "secondary petroleum products"=> array( //secondary = refined
        //products
        "LPG" =>["name"=> "LPG (Liquefied petroleum gases)", "meta"=> "Comprises propane and butane"],
        "NAPHTHA" =>["name"=> "Naphtha", "meta"=> "Comprises naphtha used as feedstocks for producing high octane gasoline and also as feedstock for the chemical/petrochemical industries"],
        "GASOLINE" =>["name"=> "Motor and aviation gasoline", "meta"=> "Comprises motor gasoline and aviation gasoline.  OLADE includes Naphtha propotion in Motor and aviation gasoline prior to use of extended JODI Oil questionnaire format."],
        "KEROSENE" =>["name"=> "Kerosene (all)", "meta"=> "Comprises kerosene type jet kerosene and other kerosene"],
        "JETKERO" =>["name"=> "kerosene, jet fuel type", "meta"=> "Aviation fuel used for aviation turbine power units. This amount is a subset of the amount reported under Kerosenes"],

        "GASDIES" =>["name"=> "Gas/Diesel Oil", "meta"=> "For automotive and other purposes"],
        "RESFUEL" =>["name"=> "Fuel oil", "meta"=> "Heavy residual oil/boiler oil, including bunker oil"],
        "ONONSPEC" =>["name"=> "Other oil products", "meta"=> "Refinery gas, ethane, petroleum coke, lubricants, white spirit & SPB, bitumen, paraffin waxes and other oil products Demand for Total products includes direct use of Crude oil, NGL and Other. Demand for Total oil products includes direct use of crude oil, NGL and Other.<br>Other products before January 2009 includes Naphtha. Other products before January 2009 is set to be N/A due to the definitional differences. Other products can be calculated by: Total oil products - sum of LPG, Motor and aviation gasoline, Kerosenes, Gas/diesel oil and Fuel oil."],
        "TOTPRODSC" =>["name"=> "Total oil products", "meta"=> "Sum of LPG, Naphtha, Motor and aviation gasoline, Kerosenes, Gas/Diesel Oil, Fuel oil, and Other oil products."],
        //flows
        "PRODREFOUT" =>["name"=> "Refinery output", "meta"=> "Gross Refinery Output of Finished Products only (including refinery fuel)."],
        "PRECEIPTS" =>["name"=> "Receipts", "meta"=> "Primary product receipts (quantities of oil used directly without processing in a refinery) + recycled products receipts for Other oil products include direct use of crude oil and NGL"],
        "TOTIMPSB" =>["name"=> "Imports", "meta"=> "Goods having physically crossed the national boundaries, excluding transit trade, international marine and aviation bunkers."],
        "TOTEXPSB" =>["name"=> "Exports", "meta"=> "Goods having physically crossed the national boundaries, excluding transit trade, international marine and aviation bunkers."],
        "TRANSF" =>["name"=> "Products transferred/Backflows", "meta"=> false],
        "INTPRODTRANSF" =>["name"=> "Interproduct transfers", "meta"=> "Imported petroleum products which are reclassified as feedstocks for further processing in the refinery, without delivery to final consumers"],
        "STCHANAT" =>["name"=> "Stock change STCHANAT Stock change", "meta"=> "Closing stock level (end of month) minus opening stock level (start of month). A positive number corresponds to a stock build, a negative number corresponds to a stock draw."],
        "STATDIFF" =>["name"=> "Statistical difference", "meta"=> "Differences between observed supply flows and Refinery intake or Demand"],
        "REFOBSDEM" =>["name"=> "demand (refinery intake)", "meta"=> "Demand of finished products: Deliveries or sales to the inland market (domestic consumption) plus Refinery Fuel plus International Marine and Aviation Bunkers.  Demand for Other oil products includes direct use of Crude oil, NGL, and Other."],
        "CSNATTER" =>["name"=> "Closing Stocks", "meta"=> "Represents the primary stock level at the end of the month within national territories.  This includes stocks held by importers, refiners, stock holding organisations and governments."]
        ),
    "unit" => array(
        "KBD" => ["full"=> "Thousand Barrels per day", "short"=> "kb/d", "meta"=> "Data collected by OLADE and OPEC are in thousand barrels. Data for APEC is made available in thousand kilolitres and has been converted to thousand barrels using 6.2898 as conversion factor. Data of IEA/OECD, Eurostat, and UNSD are originally collected in thousand metric tons and converted into thousand barrels using general conversion factors by country (see dimension element 'Conversion factor barrels/ktons')."],
        "KBBL" => ["full"=>"Thousand Barrels", "short"=>"kbbl", "meta"=> "Data collected by OLADE and OPEC are in thousand barrels. Data for APEC is made available in thousand kilolitres and has been converted to thousand barrels using 6.2898 as conversion factor. Data of IEA/OECD, Eurostat, and UNSD are originally collected in thousand metric tons and converted into thousand barrels using general conversion factors by country (see dimension element 'Conversion factor barrels/ktons')."],
        "KL" => ["full"=>"Thousand Kilolitres", "short"=>"kl", "meta"=> "Data for APEC is made available in thousand kilolitres. All other organisation's data in thousand kilolitres have been converted from thousand barrels using a conversion factor of 6.2898."],
        "TONS" => ["full"=>"Thousand Metric Tons", "short"=>"kmt", "meta"=> "Data collected by IEA/OECD, Eurostat, and UNSD are in thousand tons. Data for APEC is made available in thousand kilolitres, and data collected by OLADE and OPEC are in thousand barrels. These have been converted into thousand metric tons using general conversion factors by country (see dimension element 'Conversion factor barrels/ktons')."],
        "CONVBBL" => ["full"=>"Conversion factor barrels/ktons", "short"=>"", "meta"=> "Data collected by IEA/OECD, Eurostat, and UNSD are in mass units (thousand tons), while data for OLADE, OPEC and APEC are collected in volume units (thousand barrels or thousand kilolitres). In order to convert between mass and volume, the shown general conversion factors are used. For volume units, the following formula is used to convert barrels into kilolitres: 1 kilolitre = 6.2898 barrels."],
        ),
    "code" => array(
        "1" => "Results of the assessment show reasonable levels of comparability",
        "2" => "Consult metadata/Use with caution",
        "3" => "Data has not been assessed",
        "4" => "Data under verification"
        )
);

$HEADER = 'country,product,flow,unit,date,quantity,code,Qualifier';

$COL_COUNTRY = 0;
$COL_PRODUCT = 1;
$COL_FLOW = 2;
$COL_UNIT = 3;
$COL_DATE = 4;
$COL_VALUE = 5;


function ApiCrawl($catid, $api_row){ //initiates a JODI data file download and ingestion
    ini_set("default_socket_timeout", 6000);
    global $JODI_FILES;
    global $db;
    $downloadFiles = true;  //SET THIS TRUE TO GET THE LATEST JODI FILES; ELSE USE PREVIOUSLY DOWNLOADED FILES TO DEBUG
    $ROOT_JODI_CATID = $api_row["rootcatid"];
    //first build the two base categories and download and unzip the associated csv files:
    $sql = "insert into apirunjobs (runid, jobjson, startdt, tries, status) values(".$api_row["runid"] .",'{\"crawl\": \"download JODI files\"}',now(),1,'R')";
    $result = runQuery($sql);
    $thisJobId = $db->insert_id;
    foreach($JODI_FILES as $primeCategory=>$jobInfo){
        $fileCatid = setCategoryByName($api_row['apiid'], $primeCategory, $ROOT_JODI_CATID);
        $jobInfo["catid"] = $fileCatid;
        $jobInfo["name"] = $primeCategory;
        set_time_limit(300);
        $zip = new ZipArchive;
        if($downloadFiles){
            print('downloading '.$jobInfo["url"].' to '."bulkfiles/jodi/<br>");
            file_put_contents("bulkfiles/jodi/".$jobInfo["filename"].".zip", fopen($jobInfo["url"], 'r'));
            print('unzipping '.$jobInfo["filename"].'.zip<br>');
            $zip->open("bulkfiles/jodi/".$jobInfo["filename"].".zip");
            print('zip file opened<br>');
            $zip->extractTo('bulkfiles/jodi/');
            $zip->close();
            unlink("bulkfiles/jodi/".$jobInfo["filename"].".zip");  //delete the zip file
            print('csv extracted.  deleting '.$jobInfo["filename"].'.zip<br>');
        }

        //queue the job after the file is downloaded and unzipped
        $sql = "insert DELAYED into apirunjobs (runid, jobjson, tries, status) values(".$api_row["runid"] .",".safeStringSQL(json_encode($jobInfo)).",0,'Q')";
        runQuery($sql);
        runQuery("update apiruns set finishdt=now() where runid=".$api_row["runid"]);
    }
    $result = runQuery("update apirunjobs set enddt=now(), status='S' where jobid=$thisJobId");
}

function ApiExecuteJob($api_run_row, $job_row){//runs one queued job as kicked off by api queue master

    global $jodi_codes, $HEADER, $COL_COUNTRY, $COL_PRODUCT, $COL_FLOW, $COL_UNIT, $COL_DATE, $COL_VALUE;
    static $MONTHS = array(
        "JAN"=>"01",
        "FEB"=>"02",
        "MAR"=>"03",
        "APR"=>"04",
        "MAY"=>"05",
        "JUN"=>"06",
        "JUL"=>"07",
        "AUG"=>"08",
        "SEP"=>"09",
        "OCT"=>"10",
        "NOV"=>"11",
        "DEC"=>"12"
    );
    $unrecognized = [];
    global $MAIL_HEADER, $db;
    $jobid = $job_row["jobid"];
    $runid = $api_run_row["runid"];
    $apiid = $api_run_row["apiid"];
    $status = array("updated"=>0,"failed"=>0,"skipped"=>0, "added"=>0);

    //reusable update SQL
    $timestamp_run_sql = "update apiruns set finishdt=now() where runid = " . $runid;    //UPDATE THE RUN'S FINISH DATE
    $timestamp_job_sql = "update apirunjobs set enddt=now(), status='R' where jobid =".$jobid;
    runQuery($timestamp_run_sql);
    runQuery($timestamp_job_sql);

    set_time_limit(60);
    $jobInfo = json_decode($job_row["jobjson"], true);

    $csv = fopen("bulkfiles/jodi/".$jobInfo["filename"].".csv", "r");
    $header = fgets($csv);  //throw away the header line
    set_time_limit(300);
    if($HEADER==trim($header)){ //confirm file format
        runQuery("delete from temp_jodi where file = " . $jobInfo["filenum"], "clear jodi processing table");
        $initial = true;
        $series_header = explode(",", $header);
        $i=0;
        while(!feof($csv)){
            $line = fgets($csv); //double quotes not used
            $aryLine = explode(",", $line);
            if(count($aryLine)==8){
                $mdDate = substr($aryLine[$COL_DATE], 3) . $MONTHS[substr($aryLine[$COL_DATE], 0, 3)];
                $aryLine[$COL_DATE] = $mdDate;
                if($aryLine[$COL_COUNTRY]!=$series_header[$COL_COUNTRY] || $aryLine[$COL_PRODUCT]!=$series_header[$COL_PRODUCT] || $aryLine[$COL_FLOW]!=$series_header[$COL_FLOW] || $aryLine[$COL_UNIT]!=$series_header[$COL_UNIT]){ //series
                    set_time_limit(600);
                    if(!$initial){
                        updateTempJodi($jobInfo["filenum"], $series_header, $data);
                        runQuery($timestamp_run_sql);
                        runQuery($timestamp_job_sql);
                    } else {
                        $initial = false;
                    }
                    //start series
                    $series_header = $aryLine;
                    $data = $mdDate.":".($aryLine[$COL_VALUE]==""?"null":$aryLine[$COL_VALUE]);
                } else { //another point in current series
                    $data .= "," . $mdDate .":".($aryLine[$COL_VALUE]==""?"null":$aryLine[$COL_VALUE]);
                }
            }
            $i++;
            if($i/100 == intval($i/100)){
                runQuery($timestamp_run_sql);
                runQuery($timestamp_job_sql);
            }
        }
        updateTempJodi($jobInfo["filenum"], $series_header, $data);
        print("STARTING JODI JOBID ".$jobid."<br>"."\r\n");


        $jodi_records = runQuery("select * from temp_jodi where file=" . $jobInfo["filenum"]);
        while ($aRow = $jodi_records->fetch_assoc()){
            set_time_limit(10);
            $line = $aRow["keypart"]; //double quotes not used
            $aryLine = explode(",", $line);

            $i++;
            if($i/100 == intval($i/100)){
                runQuery($timestamp_run_sql);
                runQuery($timestamp_job_sql);
            }
            if(isset($jodi_codes[$jobInfo["name"]][$aryLine[$COL_PRODUCT]]["name"])){
                $parentCatId = setCategoryByName($apiid, $jodi_codes[$jobInfo["name"]][$aryLine[$COL_PRODUCT]]["name"], $jobInfo["catid"]);
            } else {
                if(!isset($unrecognized[$aryLine[$COL_PRODUCT]])){
                    $unrecognized[$aryLine[$COL_PRODUCT]] = true;
                    logEvent("JODI ingest error", "unrecognized product code ".$aryLine[$COL_PRODUCT]);
                }
                $status["failed"]++;
                $parentCatId = false;
            }


            if(isset($jodi_codes[$jobInfo["name"]][$aryLine[$COL_FLOW]]["name"])){
                $flowCatId = setCategoryByName($apiid, $jodi_codes[$jobInfo["name"]][$aryLine[$COL_FLOW]]["name"], $parentCatId);
            } else {
                if(!isset($unrecognized[$aryLine[$COL_FLOW]])){
                    $unrecognized[$aryLine[$COL_FLOW]] = true;
                    logEvent("JODI ingest error", "unrecognized flow code ".$aryLine[$COL_FLOW]);
                }
                $status["failed"]++;
                $flowCatId = false;
            }
            if($flowCatId && $parentCatId){
                $countryRow = countryLookup($aryLine[$COL_COUNTRY]); //if country not found, processing terminates
                $setKey = $aryLine[$COL_PRODUCT]."-".$aryLine[$COL_FLOW]."-".$aryLine[$COL_UNIT];
                //$skey = $setKey.":".$countryRow["iso3166"];
                $setName = $jodi_codes[$jobInfo["name"]][$aryLine[$COL_PRODUCT]]["name"] .": ". $jodi_codes[$jobInfo["name"]][$aryLine[$COL_FLOW]]["name"];
                $setMeta = $jodi_codes[$jobInfo["name"]][$aryLine[$COL_PRODUCT]]["meta"] ." ". $jodi_codes[$jobInfo["name"]][$aryLine[$COL_FLOW]]["meta"] ." ". $jodi_codes["unit"][$aryLine[$COL_UNIT]]["meta"];

                $aryData = explode(",", $aRow["data"]);
                sort($aryData);
                $setId = saveSet($apiid, $setKey, $setName, $jodi_codes["unit"][$aryLine[$COL_UNIT]]["full"], "Joint Oil Data Initiative","http://www.jodidata.org/oil/database/data-downloads.aspx", $setMeta);

                saveSetData($status, $setId, "M", $countryRow["geoid"], "", $aryData, false, "JODI set save", date("Y-m-d"));
                setCatSet($flowCatId, $setId);
            }
        }
        $updatedJobJson = json_encode(array_merge($status, $jobInfo));
        print("COMPLETE JODI JOBID ".$jobid."<br>"."\r\n");

    } else { //unknown file format
        print("Header Format mismatch:<br>");
        print("actual header:".$header."<br>");
        print("expected header:".$HEADER."<br>");
        runQuery("update apirunjobs set status = 'F', enddt=now() where jobid=$jobid");
        runQuery($timestamp_run_sql);
    }
    return $status;
}

function ApiRunFinished($api_run){
    set_time_limit(200);
    setGhandlesPeriodicitiesFirstLast($api_run["apiid"]);
    set_time_limit(200);
    setMapsetCounts("all", $api_run["apiid"]);
}

function updateTempJodi($filenum, $aryLine, $data){
    static $i=0;
    $i++;
    global $jodi_codes, $COL_COUNTRY, $COL_PRODUCT, $COL_FLOW, $COL_UNIT, $COL_DATE, $COL_VALUE;
    $keys = implode(array_slice($aryLine, 0, $COL_UNIT+1), ",");
    $sql = "insert into temp_jodi values(".$filenum.",'".$keys."','".$data."') on duplicate key update data=concat(data,',','" . $data . "')";
    if($keys=="") fatal_error("unable to insert temp_jodi record #".$i.": ".implode(",", $aryLine));
    runQuery($sql);
}

function countryLookup($country){
    static $countries = array(
        "ANGOLALL" => array("iso3166"=>"AGO"),
        "ARGENTIN" => array("iso3166"=>"ARG"),
        "AUSTRALI" => array("iso3166"=>"AUS"),
        "COSTARIC" => array("iso3166"=>"CRI"),
        "DOMINICANR" => array("iso3166"=>"DOM"),
        "ECUADALL" => array("iso3166"=>"ECU"),
        "ELSALVADOR" => array("iso3166"=>"SLV"),
        "FYR OF MACEDONIA" => array("iso3166"=>"MKD"),
        "GUATEMAL" => array("iso3166"=>"GTM"),
        "HONGKONG" => array("iso3166"=>"HKG"),
        "IRAN" => ["iso3166"=>"IRN"],
        "LUXEMBOU" => array("iso3166"=>"LUX"),
        "MYANUNSD" => array("iso3166"=>"MMR"),
        "NETHLAND" => array("iso3166"=>"NLD"),
        "NZ" => array("iso3166"=>"NZL"),
        "PAPUANG" => array("iso3166"=>"PNG"),
        "PERUAPEC" => array("iso3166"=>"PER"),
        "PHILIPP" => array("iso3166"=>"PHL"),
        "SAFRICA" => array("iso3166"=>"ZAF"),
        "SARABIA" => array("iso3166"=>"SAU"),
        "SINGAPOR" => array("iso3166"=>"SGP"),
        "SWITLAND" => array("iso3166"=>"CHE"),
        "TAIPEI" => array("iso3166"=>"TWN"),
        "UAE" => array("iso3166"=>"ARE"),
        "UK" => array("iso3166"=>"GBR"),
        "USA" => array("iso3166"=>"USA"),
        "KOREA" => array("iso3166"=>"KOR"),
        "VIETNAM" => array("iso3166"=>"VNM"),
        "VENEZOPEC" => array("iso3166"=>"VEN")
        );
    $country = strtoupper($country);
    if(!isset($countries[$country])){
        $result = runQuery("select geoid, name, iso3166, regexes from geographies where geoset='countries' and name like '". $country ."%'");
        if($result->num_rows != 1) fatal_error("unable to find country = ". $country);  //or found more than one!
        $geo = $result->fetch_assoc();
        $countries[$country] = array("name"=>$geo["name"], "geoid"=>$geo["geoid"], "iso3166"=>$geo["iso3166"]);
    } elseif(!isset($countries[$country]["geoid"])) {
        $result = runQuery("select geoid, name, iso3166, regexes from geographies where geoset='countries' and iso3166 = '". $countries[$country]["iso3166"] ."'");
        if($result->num_rows != 1) fatal_error("unable to find country = ". $country);  //or found more than one!
        $geo = $result->fetch_assoc();
        $countries[$country] = array("name"=>$geo["name"], "geoid"=>$geo["geoid"], "iso3166"=>$geo["iso3166"]);
    }
    return $countries[$country];
}

function fatal_error($msg){
    global $MAIL_HEADER;
    logEvent("JODI ingest error", $msg);
    if(isset($_POST["email"])){
        mail($_POST["email"],
            "fatal error during JODI api run",
            $msg,
            $MAIL_HEADER
        );
    }
    die($msg);
}
