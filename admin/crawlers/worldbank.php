<?php
/**
 * Created by JetBrains PhpStorm.
 * User: mark
 * Date: 8/25/12
 * Time: 7:17 AM
 * To change this template use File | Settings | File Templates.
 */

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

function ApiCrawl($catid, $api_row){ //initiates a WB crawl
    global $db, $indicators, $topics, $iso2to3, $threadjobid;
    set_time_limit(60); //
    try{
        $countriesAdded = 0;
        $incomeLevelsAdded = 0;
        $regionsAdded = 0;

        // 1. create a job record
        $runid = $api_row["runid"];
        $config = array("runid"=>$runid, "apiid"=>$api_row["apiid"]);
        //create job record
        $sql = "insert into apirunjobs (runid, jobjson, tries, status, startdt) values (".$runid.",'".json_encode($config)."',1,'R',now())";
        runQuery($sql);
        $jobid  = $db->insert_id;
        $threadjobid = $jobid;
        //GET config

//1. TOPICS
        //$indicators is a global variable
        //$xRaw = new SimpleXMLElement(httpGet("http://api.worldbank.org/topics?per_page=1000"));
        $topics["ALL"] = array("id"=>"ALL", "name"=>"All indicators", "description"=>"");
        $xRaw = simplexml_load_string(httpGet("http://api.worldbank.org/topics?per_page=1000"));
        $xTopics = $xRaw->children("wb", true);
        foreach($xTopics->topic as $xTopic){
            $att = $xTopic->attributes();
            $apicatid = "T".  (string) $att["id"];
            $name = (string) $xTopic->value;
            $description = (string) $xTopic->sourceNote;
            $topics[$apicatid] = array("id"=>$apicatid, "name"=>$name, "description"=>$description);
        }
        $config["topics"] = $topics;
        //var_dump(($config));
        //update the job id record as we go
        $sql = "update apirunjobs set jobjson='".$db->escape_string(json_encode($config))."' where jobid=".$jobid;
        //var_dump(($sql));
        runQuery($sql);
//2. INDICATORS
        //$indicators is a global variable
        $xRaw = new SimpleXMLElement(httpGet("http://api.worldbank.org/indicators?per_page=10000"));  //10seconds to get but perhaps too big to process
        $xIndicators = $xRaw->children("wb", true);
        foreach($xIndicators->indicator as $xIndicator){
            $name = (string) $xIndicator->name;
            $att = $xIndicator->attributes();
            $id = (string)$att["id"];
            //print($name.": ".$id." <br>");
            if(preg_match("(^\d+\.)", $name)==0){  //skip the sectional indicator which do not return valid results
                $matches = array();
                preg_match("#(.+) \(([^\(]+)\)$#",trim($name),$matches);
                if(count($matches)==3){
                    $name = trim($matches[1]);
                    $units = $matches[2];
                } else {
                    $units = null;
                }

                $description = (string) $xIndicator->sourceNote;
                $topicIds = array("ALL");
                foreach($xIndicator->topics->topic as $topic){
                    $att = $topic->attributes();
                    array_push($topicIds, "T" . (string) $att["id"]);
                }
                array_push($indicators, array("id"=>$id, "name"=>$name, "units"=> $units, "description"=>$description, "topics"=>$topicIds));
            }
        }
        $config["indicators"] = $indicators;
        //update the job id record as we go
        $sql = "update apirunjobs set jobjson='".$db->escape_string(json_encode($config))."' where jobid=".$jobid;
        runQuery($sql);


//3. REGIONS
        $regions = array();
        //ROOT "REGIONS" CATEGORY
        $sql = "insert into categories (apiid, apicatid, name) values (".$api_row["apiid"].",'regions','Regions')";
        $result = runQuery($sql);
        if($result!==false){
            $newCatId  = $db->insert_id;
            $sql = "insert into catcat values (". $api_row["rootcatid"] .",".$newCatId.")";
            runQuery($sql);
        }
        //REGION LOOP
        $xRaw = new SimpleXMLElement(httpGet("http://api.worldbank.org/regions?per_page=1000"));
        $xRegions = $xRaw->children("wb", true);
        foreach($xRegions->region as $xRegion){
            $name = (string)$xRegion->name;
            $iso3166 = (string)$xRegion->code;
            //GEOGRAPHY insert
            $sql = "insert into geographies (name, iso3166, regexes) values (".safeStringSQL($name).", ".safeStringSQL($iso3166). ",".safeStringSQL($name).")";
            runQuery($sql);
            //REGION insert
            $sql = "insert into categories (apiid, apicatid, name) values (".$api_row["apiid"].",'".$iso3166."',".safeStringSQL($name).")";
            $result = runQuery($sql);
            if($result!==false){
                $newCatId  = $db->insert_id;
                $regionsAdded++;
                $sql = "insert into catcat  (parentid, childid)  "
                    . "(select pc.catid,".$newCatId." from categories pc where pc.apicatid='regions' and pc.apiid=".$api_row["apiid"].")";
                runQuery($sql);
            }
            //Create "region-countries" category.  (Region-topic categories will be created as region job is run)
            $sql = "insert into categories (apiid, apicatid, name) values (".$api_row["apiid"].",'".$iso3166."-countries','Countries')";
            $result = runQuery($sql);
            if($result!==false){
                $newCatId  = $db->insert_id;
                $sql = "insert into catcat  (parentid, childid)  "
                    . "(select pc.catid,".$newCatId." from categories pc where pc.apicatid='".$iso3166."' and pc.apiid=".$api_row["apiid"].")";
                runQuery($sql);
            }
            //ADD REGIONS TOPIC SUB-CATEGORIES
            insertTopicCats($iso3166, $name, $api_row["apiid"]);
            array_push($regions, array("name"=>$name, "iso3166"=>$iso3166));
        }

//4.incomeLevels
        $incomeLevels = array();
        //ROOT CATEGORY
        $sql = "insert into categories (apiid, apicatid, name) values (".$api_row["apiid"].",'incomeLevels','Income Levels')";
        $result = runQuery($sql);
        if($result!==false){
            $newCatId  = $db->insert_id;
            $sql = "insert into catcat values (". $api_row["rootcatid"] .",".$newCatId.")";
            runQuery($sql);
        }
        $xRaw = new SimpleXMLElement(httpGet("http://api.worldbank.org/incomeLevels?per_page=1000"));
        $xIncomeLevels = $xRaw->children("wb", true);
        foreach($xIncomeLevels->incomeLevel as $xIncomeLevel){
            $name = (string)$xIncomeLevel;
            $att = $xIncomeLevel->attributes();
            $iso3166 = (string)$att["id"];

            //GEOGRAPHY
            $sql = "insert into geographies (name, iso3166, regexes) values (".safeStringSQL($name).", ".safeStringSQL($iso3166). ",".safeStringSQL($name).")";
            runQuery($sql);
            //INCOME LEVEL category insert
            $sql = "insert into categories (apiid, apicatid, name) values (".$api_row["apiid"].",'".$iso3166."',".safeStringSQL($name).")";
            $result = runQuery($sql);
            if($result!==false){
                $incomeLevelsAdded++;
                $newCatId  = $db->insert_id;
                $sql = "insert into catcat  (parentid, childid)  "
                    . "(select pc.catid,".$newCatId." from categories pc where pc.apicatid='incomeLevels' and pc.apiid=".$api_row["apiid"].")";
                runQuery($sql);
            }
            //Create "incomeLevels-countries" category.  (incomeLevels-topic categories will be created as region job is run)
            $sql = "insert into categories (apiid, apicatid, name) values (".$api_row["apiid"].",'".$iso3166."-countries','Countries')";
            $result = runQuery($sql);
            if($result!==false){
                $newCatId  = $db->insert_id;
                $sql = "insert into catcat  (parentid, childid) "
                    . "(select pc.catid,".$newCatId." from categories pc where pc.apicatid='".$iso3166."' and pc.apiid=".$api_row["apiid"].")";
                runQuery($sql);
            }
            //ADD incomeLevels TOPIC SUB-CATEGORIES
            insertTopicCats($iso3166, $name, $api_row["apiid"]);
            array_push($incomeLevels, array("name"=>$name, "iso3166"=>$iso3166));
        }

//5. countries
        $countries = array();
        //$iso2to3 is a global array
        //ROOT CATEGORY
        $sql = "insert into categories (apiid, apicatid, name) values (".$api_row["apiid"].",'countries','All Countries')";
        $result = runQuery($sql);
        if($result!==false){
            $newCatId  = $db->insert_id;
            $sql = "insert into catcat values (". $api_row["rootcatid"] .",".$newCatId.")";
            runQuery($sql);
        }

        $xRaw = new SimpleXMLElement(httpGet("http://api.worldbank.org/countries?per_page=1000"));
        $xcountries = $xRaw->children("wb", true);
        foreach($xcountries->country as $xcountry){
            $name = (string)$xcountry->name;
            $att = $xcountry->attributes();
            $iso3166 = (string)$att["id"];
            $iso2Code = (string)$xcountry->iso2Code;
            $iso2to3[$iso2Code] = array("iso3166" => $iso3166, "name" => $name);
            if((string)$xcountry->region!="Aggregates"){ //WLD will be loaded in regions

                //print($name." <br>");
                //GEOGRAPHY
                $sql = "insert into geographies (name, iso3166, regexes) values (".safeStringSQL($name).", ".safeStringSQL($iso3166). ",".safeStringSQL($name).")";
                runQuery($sql);
                //COUNTRY category insert
                $sql = "insert into categories (apiid, apicatid, name) values (".$api_row["apiid"].",'".$iso3166."',".safeStringSQL($name).")";
                $result = runQuery($sql);
                if($result!==false)$countriesAdded++;
                //PRIMARY CATCAT
                $sql = "insert into catcat (parentid, childid) "
                    . "(select pc.catid, cc.catid from categories pc, categories cc where pc.apicatid='countries'"
                    . " and cc.apicatid='". $iso3166."' and pc.apiid=".$api_row["apiid"]." and cc.apiid=".$api_row["apiid"].")";
                runQuery($sql);
                //REGION: SECOND COUNTRY HOME:
                $att =  $xcountry->region->attributes();
                $sql = "insert into catcat (parentid, childid) "
                    . "(select pc.catid, cc.catid from categories pc, categories cc where pc.apicatid='".(string)$att["id"]."-countries'"
                    ." and cc.apicatid='". $iso3166 . "' and pc.apiid=".$api_row["apiid"]." and cc.apiid=".$api_row["apiid"].")";
                $result = runQuery($sql);
                //if($result!==false)$regionsAdded++;
                //INCOMELEVEL: THIRD COUNTRY HOME:
                $att =  $xcountry->incomeLevel->attributes();
                $sql = "insert into catcat (parentid, childid) "
                    . "(select pc.catid, cc.catid from categories pc, categories cc where pc.apicatid='".(string)$att["id"]."-countries'"
                    . " and cc.apicatid='". $iso3166 ."' and pc.apiid=".$api_row["apiid"]." and cc.apiid=".$api_row["apiid"].")";
                runQuery($sql);
                //ADMIREGION: FOURTH COUNTRY HOME:
                $att =  $xcountry->adminregion->attributes();
                if(strlen((string)$att["id"])==3){
                    //ADMIREGION: FOURTH COUNTRY HOME:
                    $sql = "insert into catcat (parentid, childid) "
                        . "(select pc.catid, cc.catid from categories pc, categories cc where pc.apicatid='".(string)$att["id"]."-countries'"
                        . " and  cc.apicatid='" . $iso3166 ."' and pc.apiid=".$api_row["apiid"]." and cc.apiid=".$api_row["apiid"].")";
                    runQuery($sql);
                }
                //ADD COUNTRY TOPIC SUB-CATEGORIES
                insertTopicCats($iso3166, $name, $api_row["apiid"]);
                array_push($countries, array("name"=>$name, "iso3166"=>$iso3166));
            }
        }

        $config["iso2to3"] = $iso2to3;
        //update the job id record as we go
        $sql = "update apirunjobs set jobjson='".$db->escape_string(json_encode($config))."' where jobid=".$jobid;
        runQuery($sql);

//CREATE ~7000 JOBS (for each indicator)
        set_time_limit(60);
        foreach($indicators as $indicator){
            $run_config = array("basejobid"=> $jobid,"runid"=>$runid, "apiid"=>$api_row["apiid"], "skey"=>$indicator["id"]
            , "name"=>$indicator["name"],"units"=> $indicator["units"], "description"=>$indicator["description"]
            , "topicsIds"=>$indicator["topics"], "type"=>"Indicator");
            $sql = "insert DELAYED into apirunjobs (runid, jobjson, tries, status) values(".$runid.",".safeStringSQL(json_encode($run_config)).",0,'Q')";
            runQuery($sql);
        }
        /* OLD:  CREATE ~290 RUN JOBS (for each country, region & incomeLevel)
        foreach($countries as $country){
            $run_config = array("basejobid"=> $jobid,"runid"=>$runid, "apiid"=>$api_row["apiid"], "name"=>$country["name"], "iso3166" => $country["iso3166"], "entity"=>"country", "type"=>"E");
            $sql = "insert DELAYED into apirunjobs (runid, jobjson, tries, status) values(".$runid.",".safeStringSQL(json_encode($run_config)).",0,'Q')";
            runQuery($sql);
        }
        foreach($regions as $region){
            $run_config = array("basejobid"=> $jobid,"runid"=>$runid, "apiid"=>$api_row["apiid"], "name"=>$region["name"], "iso3166" => $region["iso3166"], "entity"=>"region", "type"=>"E");
            $sql = "insert DELAYED into apirunjobs (runid, jobjson, tries, status) values(".$runid.",".safeStringSQL(json_encode($run_config)).",0,'Q')";
            runQuery($sql);
        }
        foreach($incomeLevels as $incomeLevel){
            $run_config = array("basejobid"=> $jobid,"runid"=>$runid, "apiid"=>$api_row["apiid"], "name"=>$incomeLevel["name"], "iso3166" => $incomeLevel["iso3166"], "entity"=>"incomeLevel", "type"=>"E");
            $sql = "insert DELAYED into apirunjobs (runid, jobjson, tries, status) values(".$runid.",".safeStringSQL(json_encode($run_config)).",0,'Q')";
            runQuery($sql);
        }*/
        //CLOSE THE BASEJOB
        $sql="update apirunjobs set status='S', threadjobid=".$threadjobid.", enddt=now() where jobid".$jobid;
        runQuery($sql);
        //START THE RUNS
        return ApiExecuteJobs($runid);
    }  catch(Exception $e){
        logEvent(($e->getMessage().": line ".$e->getLine()),$sql);
        return array("status"=>"fail", "error"=>$e->getMessage());
    }
}

function insertTopicCats($iso3166, $name, $apiid){
    global $topics, $db;
    foreach($topics as $topic){
        $sql = "insert into categories (apiid, apicatid, name, description) values (".$apiid.",'".$iso3166."-".$topic["id"]."'"
            . ",'".$topic["name"].(($topic["id"]=="ALL")?" for ":" in ").$db->escape_string($name)."'"
            .",".safeStringSQL($topic["description"]).")";
        runQuery($sql);
        $sql = "insert into catcat (parentid, childid) "
            . "(select pc.catid, cc.catid from categories pc, categories cc where pc.apicatid='".$iso3166."'"
            . " and cc.apicatid='" .$iso3166."-".$topic["id"]."' and pc.apiid=".$apiid." and cc.apiid=".$apiid.")";
        runQuery($sql);
    }
}

function getGeoId($iso3166){
    global $db;
    $sql = "select geoid from geographies where iso3166='".$iso3166."'";
    $result = runQuery($sql);
    if($result->num_rows==1){
        $row = $result->fetch_assoc();
        return $row["geoid"];
    }
    return "null";
}

function ApiExecuteJobs($runid, $jobid="ALL"){//runs all queued jobs in a single single api run until no more
    global $db, $indicators, $topics, $iso2to3, $threadjobid;
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

    if(count($indicators)==0){  //if this routine has been started by a chron (rather than ApiCrawl), need to fetch indicators and topics objects
        $job_config = json_decode($api_row["jobjson"],true);
        $sql = "select jobjson from apirunjobs where jobid=" . $job_config["basejobid"];
        $result = runQuery($sql);
        if($result === false || mysqli_num_rows($result)!=1){
            return(array("status"=>"unable to find base job for job ".$api_row["jobid"]));
        } else {
            $base_job_row = $result->fetch_assoc(); //there better be 1 and only 1 row returned!
            $base_config = json_decode($base_job_row["jobjson"],true);
            $topics = $base_config["topics"];
            $indicators = $base_config["indicators"];
            $iso2to3 = $base_config["iso2to3"];
        }
    }

    //reusable SQL statements
    $next_job_sql = "select * from apirunjobs where status='Q' and runid =".$runid." limit 0,1";
    $update_run_sql = "update apiruns set finishdt=now() where runid = " . $runid;

    //UPDATE THE RUN'S FINISH DATE
    runQuery($update_run_sql);

    //MASTER LOOP
    $check = true;
    $job_count = 0;
    while($check){
        if($jobid!="ALL"){
            $result = runQuery($next_job_sql);
        }  else {
            $result = runQuery($next_job_sql);
        }
        if($result===false || mysqli_num_rows($result)!=1){
            $check = false;
        } else {
            set_time_limit(60);
            $job = $result->fetch_assoc();
            if($threadjobid=="null") $threadjobid=$job["jobid"];
            $sql = "update apirunjobs set startdt=now(), tries=tries+1, threadjobid=".$threadjobid.", status='R' where jobid =".$job["jobid"];   //closed in ExecuteJob
            runQuery($sql);
            $api_row["jobjson"] = $job["jobjson"];
            $api_row["jobid"] = $job["jobid"];
            print("job ".$job["jobid"]. ": ".$job["jobjson"]);
            ExecuteJob($api_row);
            runQuery($update_run_sql);
            $job_count++;
        }
        if($jobid!="ALL") $check = false; //call parameters either specify a single jobid or none, whereby jobid defaults ot "ALL"
    }
    $output = array("status"=>"ok", "runid"=>$runid, "jobs_executed"=> $job_count);
    return $output;
}


function ExecuteJob($api_row){ //$api_row contains the joined apid, apiruns, and apirunjobs record
    global $db, $indicators, $iso2to3, $topics, $threadjobid;
    $frequencies = array("default", "M", "Q", "Y"); //WorldBank uses Y for yearly (MashableData uses "A" for annual)
    //get config
    try{
        $job_config = json_decode($api_row["jobjson"],true);
        $runid = $job_config["runid"];
        $job_status="S";  //success unless failure detected
        switch($job_config["type"]){
            case "Indicator":
                $indicator = $job_config["skey"];
                //print("<br/>".$job_config["name"]."<br>");
                //var_dump($indicator);
                $gotAnnual = false; //WB api returns annual data when monthly data is requested and monthly DNE
                $gotQuarterly = false;
                $gotMonthly = false;
                foreach($frequencies as $frequency){
                    set_time_limit(100); //
                    if($frequency=="default"||($frequency=="Y"&&!$gotAnnual)||($frequency=="Q"&&!$gotQuarterly)||($frequency=="M"&&!$gotMonthly)){
                        $detectedFrequency = "";
                        $page=0;
                        $pages=1;  //set again once we know
                        $iso3=""; //when this changes, we have a new series
                        $geoName="";
                        $first_date_js=null;
                        $last_date_js=null;
                        $point_count = 0;
                        $mashableData = "";
                        while($page!=$pages){  //$pages is read in the loop from the returned and the loop is immediately broken if "pages"=0
                            $page++;
                            if($frequency=="default"){
                                $url = "http://api.worldbank.org/countries/all/indicators/".$indicator."?per_page=10000&page=".$page;
                            } else {
                                $url = "http://api.worldbank.org/countries/all/indicators/".$indicator."?MRV=1000&frequency=".$frequency."&per_page=10000&page=".$page;
                            }
                            logEvent("world bank fetch", $url);
                            $get = httpGet($url);
                            if($get===false) {
                                //TERMINATE CURRENT JOB
                                throw new Exception("unable to get ". $url);
                            }
                            $xRaw = new SimpleXMLElement($get);
                            $att =  $xRaw->attributes();
                            $pages = intval((string) $att["pages"]);
                            //var_dump($att);
                            //print "pages: ".$pages."<br>";
                            if($pages==0)break;
                            $xDatas = $xRaw->children("wb", true);
                            foreach($xDatas as $xData){
                                $date= trim((string)$xData->date);
                                $att = $xData->country->attributes();
                                $iso2 = trim((string) $att["id"]);
                                if(isset($iso2to3[$iso2])){  //WorldBank kicks out a bunch of series for uncovered aggregates without iso codes
                                    if($iso3!=$iso2to3[$iso2]["iso3166"]&&$mashableData!=""){
                                        saveWB($mashableData, $detectedFrequency, $first_date_js, $last_date_js, $point_count, $geoName, $iso3, $job_config, $api_row, $url);
                                        print $iso3 . "-" . $point_count .  ";";
                                        $mashableData = "";
                                        $point_count = 0;
                                        $first_date_js=null;
                                        $last_date_js=null;
                                    }
                                    $iso3=$iso2to3[$iso2]["iso3166"];
                                    $geoName=$iso2to3[$iso2]["name"];
                                    $value = trim((string)$xData->value);
                                    if(strlen($value)>0){  //WorldBank also kicks out a ton of points with no values
                                        //if($detectedFrequency==""){  //assumption: all the point in a given call will have the same frequency format
                                        //first point in XML = last date
                                        if(strpos($date,"M")!==false){
                                            $detectedFrequency = "M";
                                            $date_js = strtotime(str_replace("M","-",$date)."-01 UTC")*1000;
                                            $gotMonthly = true;
                                        } elseif(strpos($date,"Q")!==false){
                                            $detectedFrequency = "Q";
                                            $date_js = strtotime(substr($date,0,4)."-".sprintf("%02d",(intval(substr($date,5,1))-1)*3+1) . "-01 UTC")*1000;
                                            $gotQuarterly = true;
                                        } else {
                                            $detectedFrequency = "A";  //MashableData uses "A" for annual
                                            $date_js = strtotime(trim($date)."-01-01 UTC")*1000;
                                            $gotAnnual = true;
                                        }
                                        if($first_date_js==null || $first_date_js>$date_js) $first_date_js=$date_js;
                                        if($last_date_js==null || $last_date_js<$date_js) $last_date_js=$date_js;

                                        if($detectedFrequency=="M"){ //Annual and Quarterly dates are good, but monthly needs a minor ajustment
                                            $date = substr($date,0,4).sprintf("%02d",intval(substr($date,5,2))-1);
                                        }
                                        //print $iso2.":[".$date.",".$value."]<br>";

                                        if(is_numeric($value)){
                                            $value = floatval($value);
                                        } else {
                                            $value = "null";
                                        }

                                        $mashableData = $mashableData . (($mashableData=="")?"":"||") . $date . "|" . $value;
                                        $point_count++;
                                    }
                                }
                            }
                        }
                        if($mashableData!=""){//final save
                            saveWB($mashableData, $detectedFrequency, $first_date_js, $last_date_js, $point_count, $geoName, $iso3, $job_config, $api_row,$url);
                            print $iso3 . "-" . $point_count;
                        }
                        print "<br>";
                    }
                }
                if(!$gotAnnual&&!$gotMonthly&&!$gotQuarterly){
                    $job_config["processed"]="none";
                } else {
                    $job_config["processed"]=($gotAnnual?"A":"").($gotQuarterly?"Q":"").($gotMonthly?"M":"");
                }
                $job_config["threadjobid"]= $threadjobid;
                $job_config["jobid"]= $api_row["jobid"];


                //GLOBAL STATUS (TEMPORARILY INSIDE THE LOOP TO SEE WHAT'S GOING ON)
                $esc_config = $db->escape_string( json_encode($job_config));
                $sql = "update globalstatus set status='".$esc_config."', modifieddt=now() where statuskey = 'apirun'";
                runQuery($sql);

                //TERMINATE CURRENT JOB
                $sql = "update apirunjobs set enddt=now(), status='".$job_status."', jobjson='".$esc_config."' where jobid = " . $api_row["jobid"];
                runQuery($sql);
                //die("here");
                break;
            case "E":  //type = "E" for entity
                //type country, region or incomeLevel -> create indicator jobs in groups of 50
                //TOPICS SUB-CATEGORIES
                $count=1;
                $indicatorsConfig = array("basejobid"=> $job_config["basejobid"],"runid"=>$runid, "apiid"=>$api_row["apiid"], "indicators"=>array(), "iso3166" => $job_config["iso3166"], "name"=> $job_config["name"], "entity"=>"country", "type"=>"I");
                foreach($indicators as $indicator){
                    if($count/10==intval($count/10)){ //cut 7000+ indicators into job of 10 at a time
                        $sql = "insert DELAYED into apirunjobs (runid, jobjson, tries, status) values(".$runid .",".safeStringSQL(json_encode($indicatorsConfig)).",0,'Q')";
                        runQuery($sql);
                        $count = 1;
                        $indicatorsConfig["indicators"] = array();
                    } else {
                        $count+=1;
                    }
                    array_push($indicatorsConfig["indicators"], $indicator);
                }
                $sql = "insert DELAYED into apirunjobs (runid, jobjson, tries, status) values(".$runid.",".safeStringSQL(json_encode($indicatorsConfig)).",0,'Q')";
                runQuery($sql);
                //TERMINATE CURRENT JOB
                $sql = "update apirunjobs set enddt=now(), status='".$job_status."' where jobid = " . $api_row["jobid"];
                runQuery($sql);
                break;
        }
        return array("status"=>"ok", "jobid"=>$api_row["jobid"]);
    }  catch(Exception $e){
        //GLOBAL STATUS (TEMPORARILY INSIDE THE LOOP TO SEE WHAT'S GOING ON)
        $job_config["error"] =  $e->getMessage();
        $esc_config = $db->escape_string( json_encode($job_config));
        $sql = "update globalstatus set status='".$esc_config."', modifieddt=now() where statuskey = 'apirun'";
        runQuery($sql);
        //TERMINATE CURRENT JOB
        $sql = "update apirunjobs set enddt=now(), status='F', jobjson='".$esc_config."' where jobid = " . $api_row["jobid"];
        runQuery($sql);
        return array("status"=>"fail", "error"=>$e->getMessage());
    }
}

function saveWB($mashableData, $detectedFrequency, $first_date_js, $last_date_js, $point_count, $geography, $iso3, $job_config, $api_row,$url){
    global $db, $indicators, $topics;
    if($point_count>0){
        $skey = $job_config["skey"]."-".$iso3."-".$detectedFrequency;
        $sql = "select * from series where skey=".safeStringSQL($skey)." and apiid=".$api_row["apiid"];
        $result = runQuery($sql);
        if(mysqli_num_rows($result)==1){
            $row = $result->fetch_assoc();
            $captureid = $row["captureid"];
            $sql = "update captures set data=".safeStringSQL($mashableData)
                . ", hash=" . safeStringSQL(sha1($mashableData))
                . ", firstdt=". $first_date_js
                . ", lastdt=". $last_date_js
                . ", points=". $point_count
                . ", capturedt=now()"
                . ", processdt=now()"
                . ", lastchecked=now()"
                . " where captureid =" . $captureid;
            runQuery($sql);
        } else {
            $mapsetid = getMapSet($job_config["name"],$api_row["apiid"],$detectedFrequency, $job_config["units"]);
            $geoid = getGeoId($iso3);
            $sql = "insert into series (name, namelen, src, url, units, units_abbrev, periodicity, skey, title, notes, apiid, geoid, mapsetid, l1domain, l2domain) values ("
                . safeStringSQL($job_config["name"] . ": ".$geography) . ","
                . strlen( $job_config["name"] . ": ".$geography). ","
                . safeStringSQL($api_row["name"]). ","
                . safeStringSQL(str_replace("&page=","&p",str_replace("/all/","/".$iso3."/", $url))). ","
                . (($job_config["units"]==null)?"NULL":safeStringSQL( $job_config["units"])) . ","  //World Bank does does not provide units for many series.  "null" will be used for now.
                . "null," //World Bank does not provide units abbrev.  will need manual effort
                . safeStringSQL($detectedFrequency) . ","
                . safeStringSQL($skey) . ","
                . "null,"  //title will be set below to category name
                . safeStringSQL($job_config["description"]) . ","
                . $api_row["apiid"] . ","
                . $geoid . ","
                . $mapsetid . ","
                . safeStringSQL($api_row["l1domain"]) . ","
                . safeStringSQL($api_row["l2domain"]) . ")";
            $result = runQuery($sql);
            if($result===false) die("<br><br>Bad query.  check event log");
            $seriesid =$db->insert_id;
            $sql = "INSERT INTO captures(seriesid, userid, data, hash, firstdt, lastdt, points, capturedt, processdt, lastchecked, isamerge, capturecount, privategraphcount, publicgraphcount) "
                . "VALUES (" . $seriesid
                . ", 1, '" . $mashableData . "'"
                . ",'" . sha1($mashableData) . "'"
                . "," . $first_date_js
                . "," . $last_date_js
                . "," . $point_count
                . ", NOW()"
                . ", NOW()"
                . ", NOW()"
                . ",'N'"
                . ",1,0,0"
                . ")";
            runQuery($sql);
            $captureid = $db->insert_id;
            $sql = "update series set captureid=".$captureid." where seriesid=".$seriesid;
            runQuery($sql);
            //create cat-series link records
            $topicId = null;
            foreach($job_config["topicsIds"] as $topicId){
                $sql="select catid, name from categories where apicatid='". $iso3 ."-".$topicId."' and apiid=". $api_row["apiid"];
                $result = runQuery($sql);
                $category = $result->fetch_assoc();
                $sql="insert into categoryseries (catid,seriesid) values (".$category["catid"].",".$seriesid.")";
                runQuery($sql);
            }
            $sql="update series set title=". safeStringSQL($category["name"])." where seriesid=".$seriesid;  // set the title to the last topic
            runQuery($sql);

        }
    }
}

function ApiGet($sourcekeys, $api_row){
    $return = array("status"=>"error: upsupported call for WorldBack", "apiid"=>$api_row["apiid"], "count" => 0);
    return $return;
}

function getSeriesDataFromWorldBank($seriesHeaders, $api_row ){
    global $db, $user_id, $fred_api_key;
    //move get operation to her
}
?>

