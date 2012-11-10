<?php
/**
 * Created by Mark Elbert 5/5/12
 * Copyright, all rights reserved MashableData.com
 *
 */

 $event_logging = true;
/* This is the sole API for the MashableData Workbench application connecting
 * the client application to the cloud.  All returns are JSON objects. Supports the following:
 *
 * command: Get | crawl |
 *   search
 *   periodicity
 * command: Crawl
 *   not supported by this API
     * command:  Update
 *   periodicity:  D|M|A|ALL.  If missing, smartupdate  algorythme
 *   since: datetime; if missing smartupdate algorythme
*/
function ApiBatchUpdate($since,$periodicity, $api_row){
    $batch_get_limit = 10;
    $sql = 'select seriesid, skey, periodicity from series where apiid = ' . $api_row['apiid']
        . ' and l1domain=' . safeStringSQL($api_row['l1domain'])
        . ' and l2domain=' . safeStringSQL($api_row['l2domain'])
        . ' and (apidt is null or apidt < ' . safeStringSQL($since) . ') ';
    if(in_array($periodicity, array('A','M','W','D'))){
        $sql .= ' and periodicity=' . safeStringSQL($periodicity);
    }
    $sql .= ' LIMIT 0 , ' . $batch_get_limit;
    logEvent("EIA API: ApiBatchUpdate", $sql);
    $series_recordset = mysql_query($sql);
    $skeys = array();
    while ($serie = mysql_fetch_assoc($series_recordset)) {
        array_push($skeys, $serie["skey"]);
    }
    return ApiGet($skeys,$api_row);
}


function ApiCrawl($category){ //returns series and child categories.

}


function ApiGet($sourcekeys, $api_row){
    $return = array("status"=>"ok", "apiid"=>$api_row["apiid"], "results"=>array(), "count" => count($sourcekeys));
    if(count($sourcekeys)==0) return $return;
    $clean_sourcekeys = '';
    $root_by_freq = array();
    foreach($sourcekeys as $sourcekey){  //make sure no hacker slips anything in
        //$return["status"][$sourcekey] = "not found";
        $clean_sourcekeys .= ((strlen($clean_sourcekeys)==0)?"":",") . safeStringSQL(strtoupper($sourcekey));
        $split = explode(".",$sourcekey);
        if(count($split)==2){
            if(array_key_exists($split[1],$root_by_freq)){
                array_push($root_by_freq[$split[1]], $split[0]);
            } else {
                $root_by_freq[$split[1]] = array($split[0]);
            }
        }
    }


    $sql = "select s.seriesid, c.captureid, skey, name, s.url, units, src, periodicity, data " .
        "from series s left join captures c " .
        " on s.captureid = c.captureid where s.skey in (" .
        $clean_sourcekeys .  ") and apiid = " . $api_row["apiid"] . " and l1domain='" . $api_row["l1domain"] .
        "' and l2domain = '" . $api_row["l2domain"] . "' order by periodicity";


    logEvent("EIA API: GetSeries", $sql);
    $series_recordset = mysql_query($sql);

    $mddb_series = array();
    while ($serie = mysql_fetch_assoc($series_recordset)) {
        $mddb_series[$serie["skey"]]=$serie;
    }

    //var_dump($root_by_freq);

/*    var_dump($return);
    print("results<br>");*/
    foreach($root_by_freq as $freq => $roots){  //roots by freq is what is requested
        $subresults = getSeriesFromEIA($freq, $roots, $mddb_series, $api_row);  //mddb_series is the series records found for the root requested
/*        var_dump($subresults);
        print("<br>");*/
        foreach($subresults as $key => $result){$return["results"][$key]=$result;}
    }
/*  var_dump($results);
    print("<br>");*/
    return $return;
   /* foreach($mddb_series as $skey => $serie){
        if($this_periodicity == "") $this_periodicity = $series["periodicity"];
        if($this_periodicity != $serie["periodicity"]) {
            getSeriesFromEIA($root_by_freq, $this_periodicity, $these_series);
            $this_periodicity =  $serie["periodicity"];
            $these_series = array();
        }
        $these_series[$serie["skey"]][]= $serie;
    }
    }
    if(count()>0)getSeriesFromEIA($these_seriesids, $this_periodicity, $these_series);*/

}

function getSeriesFromEIA($periodicity, $skey_roots, $mddb_series, $api_row){
/* return a status array of full skey with a value of [failure|not_in_api|confirmed|new_capture|new_series] */
    $return = array();
    global $con;
    //this function performs an http GET to the EIA PET/NG API and compares and update the series and capture records as needed
    $API_call= "http://www.eia.gov/petroleum/get_series2.cfm?srckeys=" . implode($skey_roots,",") . "&freq=" . $periodicity;
    $tmp =  httpGet($API_call);
    $tmp = str_replace(",-.",",-0.",$tmp);  //API splits out some malformed negative numbers
    $eia = json_decode($tmp, true);
    logEvent("eia_crawl", $API_call);
   /* echo("\$eia: ");
    print("<br><br>");

    echo("\$skey_roots: ");
    var_dump($skey_roots);
    print("<br><br>");*/

//need to make sure all of the $skey_roots are in $eia.  If not, add a return code of 'not found' update the apidt if record exist in $mddb_series.  Note that the loop below will indicate not found only if header without data exists in $eia and the record exists in $mddb_series
    foreach($skey_roots as $skey_root){
        if(!array_key_exists($skey_root, $eia["KEYS"])){
            //if in mddb, set the apidt field to indicate failure, else simply not found
            /*echo("\$skey_root: ");
            var_dump($skey_root);
            print("<br><br>");
            echo("\$mddb_series: ");
            var_dump($mddb_series);
            print("<br><br>");*/
            if(array_key_exists(($skey_root . '.' . $periodicity),$mddb_series)){
                $sql = "update series set apidt='2025-01-01 00:00:00' where seriesid=" . $mddb_series[$skey_root . '.' . $periodicity]["seriesid"];
                logEvent("EIA API: update series for failure", $sql);
                mysql_query($sql);
                $return[$skey_root . '.' . $periodicity] = "failure";
            }     else {
                //return status as not found
                $return[$skey_root . '.' . $periodicity] = "not_in_api";
            }

        }
    }

    foreach($eia["KEYS"] as $root => $eia_serie){
        $mddb_serie =  $mddb_series[$eia_serie["KEY"]];
        if(count($eia_serie["DATA"])>0){ //EIA api will return a header but no data if key exist but not for requested freq.  This guards against
            if(array_key_exists($eia_serie["KEY"],$mddb_series)) {

                $return[$eia_serie["KEY"]] = "confirmed";  //will be upgrade to new_series or new_capture below if warrented
            }  else { //series does not exist in the database, so insert it and make a series template comlete with real seriesid

                $sql = "insert into series (name, src, url, units, periodicity, skey, l1domain, l2domain) values (" . safeStringSQL($eia_serie["NAME"])
                    . "," . safeStringSQL($eia_serie["SOURCE"]) . "," . safeStringSQL($eia_serie["URL"]) . ","
                    . safeStringSQL($eia_serie["UNITS"]) . "," . safeStringSQL($periodicity) . "," . safeStringSQL($eia_serie["KEY"]) . ",'gov','eia')";
                logEvent("EIA API: NewSeries", $sql);
                $result = mysql_query($sql);
                $mddb_serie = array("seriesid"=>mysql_insert_id($con),"name"=>"","src"=>"","url"=>"","units"=>"","data"=>"");
                $return[$eia_serie["KEY"]] = "new_series";
            }
            $data = ""; //rebuild the data string in the MD format
//var_dump($eia_serie["DATA"]);
            foreach($eia_serie["DATA"] as $point){
                if($data != "") $data .= "||";
                switch(strtoupper ($periodicity)){
                    case "A":
                        $data .=  substr($point[0],0,4) . "|" . $point[1];
                        break;
                    case "M":

//    var_dump($point);
                        $data .=  substr($point[0],0,4) . sprintf("%02d",(intval(substr($point[0],4,2))-1)) . "|" . $point[1];
                        break;
                    default:
                        $data .=  substr($point[0],0,4) . sprintf("%02d",(intval(substr($point[0],4,2))-1)) .
                            substr($point[0],6,2) . "|" . $point[1];
                }
            }

//            var_dump($data);
            if($data!=$mddb_serie["data"]){  //new capture!
                $point_count = count($eia_serie["DATA"]);
                switch(strtoupper ($periodicity)){
                    case "A":
                        $first_date =  substr($eia_serie["DATA"][0][0],0,4) . "-01-01 00:00:00";
                        $last_date = substr($eia_serie["DATA"][$point_count-1][0],0,4) . "-01-01 00:00:00";
                        break;
                    case "M":
                        $first_date =  substr($eia_serie["DATA"][0][0],0,4) . "-" . sprintf("%02d",intval(substr($eia_serie["DATA"][0][0],4,2))) . "-01 00:00:00";
                        $last_date =  substr($eia_serie["DATA"][$point_count-1][0],0,4) . "-" . sprintf("%02d",intval(substr($eia_serie["DATA"][$point_count-1][0],4,2))) . "-01 00:00:00";
                        break;
                    default:
                        $first_date =  substr($eia_serie["DATA"][0][0],0,4) . "-" . sprintf("%02d",intval(substr($eia_serie["DATA"][0][0],4,2))) . "-" .
                            substr($eia_serie["DATA"][0][0],6,2) . " 00:00:00";
                        $last_date =  substr($eia_serie["DATA"][$point_count-1][0],0,4) . "-" . sprintf("%02d",intval(substr($eia_serie["DATA"][$point_count-1][0],4,2))) . "-" .
                            substr($eia_serie["DATA"][$point_count-1][0],6,2) . " 00:00:00";
                }
                date_default_timezone_set('UTC');
                $first_date_js = strtotime($first_date . ' UTC') * 1000;
                $last_date_js = strtotime($last_date . ' UTC') * 1000;
                $sql = "INSERT INTO captures(seriesid, userid, data, hash, firstdt, lastdt, points, capturedt, processdt, lastchecked, isamerge, capturecount, privategraphcount, publicgraphcount) "
                    . "VALUES (" . $mddb_serie["seriesid"]
                    . ",1, '" . $data . "'"
                    . ",'" . sha1($data) . "'"
                    . "," . $first_date_js
                    . "," . $last_date_js
                    . "," . $point_count
                    . ", NOW()"
                    . ", NOW()"
                    . ", NOW()"
                    . ",'N'"
                    . ",1,0,0"
                    . ")";
                logEvent("EIA API: insert capture", $sql);
                mysql_query($sql);
                $captureid = mysql_insert_id($con);
                if($return[$eia_serie["KEY"]] != "new_series") $return[$eia_serie["KEY"]] = "new_capture";
            } else { //update the lat checked date
                $sql = "update captures set lastchecked = NOW() where captureid =" . $mddb_serie["captureid"];
                logEvent("EIA API: update lastchecked of capture", $sql);
                mysql_query($sql);
            }
            /* ALWAYS update because series.apidt must be updated
             *
             * if($mddb_serie["name"]!=$eia_serie["NAME"] || $mddb_serie["url"]!=$eia_serie["URL"]
            || $mddb_serie["units"]!=$eia_serie["UNITS"] // $mddb_serie[""]!=$eia_serie["UNITSABBREV"] ||
            || $mddb_serie["src"]!=$eia_serie["SOURCE"] || $data!=$mddb_serie["data"]){*/
                $sql = "update series set  name=" . safeStringSQL($eia_serie["NAME"])
                    . ", url=" . safeStringSQL($eia_serie["URL"]) . ", units=" . safeStringSQL($eia_serie["UNITS"])
                    . ", src=" . safeStringSQL($eia_serie["SOURCE"])
                    . ", apidt=NOW()"
                ;
                if($data!=$mddb_serie["data"]) $sql.= ", captureid=" . $captureid;
                $sql.=" where seriesid=" . $mddb_serie["seriesid"];
                logEvent("EIA API: update series", $sql);
                mysql_query($sql);
           /* }*/

        } else {
            /*print "$eia_serie:<br>";
            var_dump($eia_serie);*/
            $sql = "update series set apidt='2025-01-01 00:00:00' where seriesid=" . $mddb_serie["seriesid"];
            logEvent("EIA API: update series for not found", $sql);
            mysql_query($sql);
            $return[$eia_serie["KEY"]] = "failure";
        }
    }
    return $return;
}

?>