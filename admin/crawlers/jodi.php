<?php
/**
 * Created by JetBrains PhpStorm.
 */

/*To clean JODI API, leaving only the 3 root cats:
    DELETE FROM series WHERE apiid = 6;
    DELETE FROM categories WHERE apiid=6 AND catid >= 318252;
    DELETE FROM catcat WHERE parentidid > 318249;
    DELETE FROM catseries WHERE catid >= 318249;
*/

$JODI_FILES = array(
    "secondary petroleum products" => array(
        "url" => "http://www.jodidata.org/_resources/files/downloads/data/world_secondary_csv1.zip",
        "filename" => "world_Secondary_CSV",
        "filenum"=> 2

    ),
    "primary petroleum products" => array(
        "url" => "http://www.jodidata.org/_resources/files/downloads/data/world_primary_csv1.zip",
        "filename" => "world_Primary_CSV",
        "filenum"=> 1
    )
);

$jodi_codes = array(
    "primary petroleum products"=> array(
        //products
        "CRUDEOIL" => "Crude oil",
        "NGL" =>"Natural Gas Liquids (NGL)",
        "OTHERCRUDE" =>"other crude",
        "TOTCRUDE" =>"total Crude",
        //flows
        "PRODREFOUT" => "Production",
        "OTHSOURCES" => "From other sources",
        "TOTIMPSB" => "Imports",
        "TOTEXPSB" => "Exports",
        "PTRANSFBF" => "Products transferred",
        "DIRECTUSE" => "Direct use",
        "STCHANAT" => "Stock change STCHANAT Stock change",
        "STATDIFF" => "Statistical difference STATDIFF Statistical difference",
        "REFOBSDEM" => "Refinery intake",
        "CSNATTER" => "Closing Stocks"
        ),
    "secondary petroleum products"=> array( //secondary = refined
        //products
        "LPG" => "LPG (Liquefied petroleum gases)",
        "NAPHTHA" => "Naphtha",
        "GASOLINE" => "Motor and aviation gasoline",
        "KEROSENE" => "Kerosene (all)",
        "JETKERO" => "kerosene, jet fuel type",
        "GASDIES" => "Gas/Diesel Oil",
        "RESFUEL" => "Fuel oil",
        "ONONSPEC" => "Other oil products",
        "TOTPRODSC" => "Total oil products",
        //flow
        "PRODREFOUT" => "Refinery output",
        "PRECEIPTS" => "Receipts",
        "TOTIMPSB" => "Imports",
        "TOTEXPSB" => "Exports",
        "TRANSF" => "Products transferred/Backflows",
        "INTPRODTRANSF" => "Interproduct transfers",
        "STCHANAT" => "Stock change STCHANAT Stock change",
        "STATDIFF" => "Statistical difference STATDIFF Statistical difference",
        "REFOBSDEM" => "Refinery intake",
        "CSNATTER" => "Closing Stocks"
        ),
    "unit" => array(
        "KBD" => "Thousand Barrels per day (kb/d)",
        "KBBL" => "Thousand Barrels (kbbl)",
        "KL" => "Thousand Kilolitres (kl)",
        "TONS" => "Thousand Metric Tons (kmt)",
        "CONVBBL" => "Conversion factor barrels/ktons"
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
    $downloadFiles = true;  //SET THIS TRUE TO GET THE LATEST FAO; ELSE USE PREVIOUSLY DOWNLOADED FILES TO DEBUG
    $ROOT_JODI_CATID = $api_row["rootcatid"];
    //first build the two base categories and download and unzip the associated csv files:
    foreach($JODI_FILES as $primeCategory=>$jobInfo){
        $fileCatid = setCategory($api_row['apiid'], $primeCategory, $ROOT_JODI_CATID);
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
}


function ApiExecuteJobs($runid, $jobid="ALL"){//runs one queued job as kicked off by api queue master

    global $jodi_codes, $HEADER, $COL_COUNTRY, $COL_PRODUCT, $COL_FLOW, $COL_UNIT, $COL_DATE, $COL_VALUE;
    global $db;
    static $MONTHS = array(
        "JAN"=>"00",
        "FEB"=>"01",
        "MAR"=>"02",
        "APR"=>"03",
        "MAY"=>"04",
        "JUN"=>"05",
        "JUL"=>"06",
        "AUG"=>"07",
        "SEP"=>"08",
        "OCT"=>"09",
        "NOV"=>"10",
        "DEC"=>"11"
    );
    global $MAIL_HEADER, $db;
    $status = array("updated"=>0,"failed"=>0,"skipped"=>0, "added"=>0);
    $sql="SELECT a.name, a.l1domain, a.l2domain, r.* , j.jobid, j.jobjson"
        . " FROM apis a, apiruns r, apirunjobs j"
        . " WHERE a.apiid = r.apiid AND r.runid = j.runid AND r.runid=".$runid
        . " AND " . ($jobid=="ALL"?"STATUS =  'Q'":"jobid=".$jobid)
        . " LIMIT 0 , 1";
    $result = runQuery($sql);
    if($result === false || mysqli_num_rows($result)==0) return(array("status"=>"unable to find queued jobs for run ".$runid." / jobid=".$jobid));
    $apirunjob = $result->fetch_assoc();

    //grab the job
    $sql = "update apirunjobs set startdt=now(), enddt=now(), tries=tries+1, status='R' where jobid =".$apirunjob["jobid"];
    runQuery($sql);

    //reusable update SQL
    $timestamp_run_sql = "update apiruns set finishdt=now() where runid = " . $runid;    //UPDATE THE RUN'S FINISH DATE
    $timestamp_job_sql = "update apirunjobs set enddt=now(), status='R' where jobid =".$apirunjob["jobid"];
    runQuery($timestamp_run_sql);
    runQuery($timestamp_job_sql);

    set_time_limit(60);
    $jobInfo = json_decode($apirunjob["jobjson"], true);

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
                    set_time_limit(60);
                    if(!$initial){
                        updateTempJodi($jobInfo["filenum"], $series_header, $data);
                        runQuery($timestamp_run_sql);
                        runQuery($timestamp_job_sql);
                    } else {
                        $initial = false;
                    }
                    //start series
                    $series_header = $aryLine;
                    $data = $mdDate."|".($aryLine[$COL_VALUE]==""?"null":$aryLine[$COL_VALUE]);
                } else { //another point in current series
                    $data .= "," . $mdDate ."|".($aryLine[$COL_VALUE]==""?"null":$aryLine[$COL_VALUE]);
                }
            }
            $i++;
            if($i/100 == intval($i/100)){
                runQuery($timestamp_run_sql);
                runQuery($timestamp_job_sql);
            }
        }
        updateTempJodi($jobInfo["filenum"], $series_header, $data);


        $jodi_records = runQuery("select * from temp_jodi where file=" . $jobInfo["filenum"]);
        while ($aRow = $jodi_records->fetch_assoc()){
            $line = $aRow["keypart"]; //double quotes not used
            $aryLine = explode(",", $line);

            $i++;
            if($i/100 == intval($i/100)){
                runQuery($timestamp_run_sql);
                runQuery($timestamp_job_sql);
            }

            $parentCatId = setCategory($apirunjob["apiid"], $jodi_codes[$jobInfo["name"]][$aryLine[$COL_PRODUCT]], $jobInfo["catid"]);
            $flowCatId = setCategory($apirunjob["apiid"], $jodi_codes[$jobInfo["name"]][$aryLine[$COL_FLOW]], $parentCatId);

            $countryRow = countryLookup($aryLine[$COL_COUNTRY]);
            $skey = $countryRow["iso3166"]."-".$aryLine[$COL_PRODUCT]."-".$aryLine[$COL_FLOW]."-".$aryLine[$COL_UNIT];
            $setName = $jodi_codes[$jobInfo["name"]][$aryLine[$COL_PRODUCT]] .": ". $jodi_codes[$jobInfo["name"]][$aryLine[$COL_FLOW]];
            if($countryRow["geoid"]!==null) {
                $mapSetId = getMapSet($setName, $apirunjob["apiid"], "M", $jodi_codes["unit"][$aryLine[$COL_UNIT]]);
            } else {
                $mapSetId = null;
            }
            $arydata = explode(",", $aRow["data"]);
            sort($arydata);
            $data = implode("||", $arydata);
            $aryFirstPoint= explode("|", $arydata[0]);
            $aryLastPoint= explode("|", $arydata[count($arydata)-1]);
            $firstDate = strtotime(substr($aryFirstPoint[0],0,4) . "-" . (substr($aryFirstPoint[0],4,2)+1) . "-1 UTC")*1000;
            $lastDate = strtotime(substr($aryLastPoint[0],0,4) . "-" . (substr($aryFirstPoint[0],4,2)+1) . "-1 UTC")*1000;

            $seriesid = updateSeries($status, $skey, $setName.": ".$countryRow["name"],"Joint Oil Data Initiative","http://www.jodidata.org/database/data-downloads.aspx","M",
                $jodi_codes["unit"][$aryLine[$COL_UNIT]], $jodi_codes["unit"][$aryLine[$COL_UNIT]],
                "For methodology and data visit http://http://www.jodidata.org/database/data-downloads.aspx. For codes, see http://www.jodidata.org/_resources/files/downloads/resources/jodi-wdb-short-long-names.pdf",
                $setName, $apirunjob["apiid"], date("Y-m-d"),
                $firstDate,
                $lastDate,
                $data, $countryRow["geoid"], $mapSetId,
                null, null, null);
            catSeries($flowCatId, $seriesid);
        }
        $updatedJobJson = json_encode(array_merge($status, $jobInfo));
        runQuery( "update apirunjobs set status = 'S', jobjson=".safeStringSQL($updatedJobJson). ", enddt=now() where jobid=".$apirunjob["jobid"]);
        runQuery($timestamp_run_sql);

        setMapsetCounts($apirunjob["apiid"]);
    } else { //unknown file format
        print("Header Format mismatch:<br>");
        print("actual header:".$header."<br>");
        print("expected header:".$HEADER."<br>");
        runQuery( "update apirunjobs set status = 'F', enddt=now() where jobid=".$apirunjob["jobid"]);
        runQuery($timestamp_run_sql);
    }
    return $status;
}

function updateTempJodi($filenum, $aryLine, $data){
    static $i=0;
    $i++;
    global $jodi_codes, $COL_COUNTRY, $COL_PRODUCT, $COL_FLOW, $COL_UNIT, $COL_DATE, $COL_VALUE;
    $keys = implode(array_slice($aryLine, 0, $COL_UNIT+1), ",");
    $sql = "insert into temp_jodi values(".$filenum.",'".$keys."','".$data."') on duplicate key update data=concat(data,',','" . $data . "')";
    if($keys=="") die($i.": ".implode(",", $aryLine));
    runQuery($sql);
}

function saveSeries(&$status, $api_row, $jobInfo, $aryFirstLine, $aryLastLine, $arydata){
    global $jodi_codes, $COL_COUNTRY, $COL_PRODUCT, $COL_FLOW, $COL_UNIT, $COL_DATE, $COL_VALUE;
    //find catid and create categories as needed



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
        "GUATEMAL" => array("iso3166"=>"GTM"),
        "HONGKONG" => array("iso3166"=>"HKG"),
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
    if(!isset($countries[$country])){
        $result = runQuery("select geoid, name, iso3166, regexes from geographies where geoset='all' and name like '". $country ."%'");
        if($result->num_rows != 1) die("unable to find country = ". $country);  //or found more than one!
        $geo = $result->fetch_assoc();
        $countries[$country] = array("name"=>$geo["name"], "geoid"=>$geo["geoid"], "iso3166"=>$geo["iso3166"]);
    } elseif(!isset($countries[$country]["geoid"])) {
        $result = runQuery("select geoid, name, iso3166, regexes from geographies where geoset='all' and iso3166 = '". $countries[$country]["iso3166"] ."'");
        if($result->num_rows != 1) die("unable to find country = ". $country);  //or found more than one!
        $geo = $result->fetch_assoc();
        $countries[$country] = array("name"=>$geo["name"], "geoid"=>$geo["geoid"], "iso3166"=>$geo["iso3166"]);
    }
    return $countries[$country];
}

