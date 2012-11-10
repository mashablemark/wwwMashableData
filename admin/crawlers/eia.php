<?php
/**
 * Created by Mark Elbert 5/5/12
 * Copyright, all rights reserved MashableData.com
 *
 */

 $event_logging = true;
 $sql_logging = false;

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
function ApiBatchUpdate($from,$to,$periodicity){

}
function ApiCrawl($category){ //returns series and child categories.

}
function ApiGet($sids){
    $clean_sids = array();
    foreach($sids as $sid){  //make sure no hacker slips anything in
        array_push($clean_sids, intval($sid));
    }
    $sql = "select s.seriesid, name, url, units, src, periodicity, data " .
        "from series s, captures c " .
        " where s.capureid = c.capureid(+) and  s.seriesid in (" .
        implode($clean_sids,",") .  ") and apiid = " & $api_id & " and l1domain=" . $api_row["l1domain"] .
        " and l2domain = " . $api_row["l2domain"] . " order by periodicity";
    logEvent("EIA API: GetSeries", $sql);
    $series_result = mysql_query($sql);
    $all_series = array();
    $these_series = array();
    $these_seriesids = array();
    $this_periodicity = "";
    while ($series = mysql_fetch_assoc($series_result)) {
        if($this_periodicity = "") $this_periodicity = $series["periodicity"];
        if($this_periodicity != $series["periodicity"]) {
            getSeriesFromEIA($these_seriesids, $this_periodicity, $these_series);
            $this_periodicity =  $series["periodicity"];
            $these_series[$series["skey"].".".$series["periodicity"]][]= $series;
        }
        array_push($these_seriesids, $series["seriesid"]);
        $these_series['aaData'][] = $series;

    }
    }
    foreach ( as $graphseries){
    $series_row =   mysql_fetch_assoc( $user_result );




}

function getSeriesFromEIA($periodicity, &$seriesids, &$mddb_series){
//this function performs an http GET as the EIA PET/NG API and compares and update the series and capture records as needed
    $target = "http://www.eia.gov/petroleum/get_series2.cfm?srckeys=" . implode($seriesids,",") . "&freq=" . $periodicity;
    $fp = fopen( $target, 'r' );
    $content = "";
    while( !feof( $fp ) ) {
        $buffer = trim( fgets( $fp, 4096 ) );
        $content .= $buffer;
    }
    $eia = json_decode($content);
    foreach($eia["KEYS"] as $key => $eia_serie){
        if(count($eia_serie["DATA"])>0){ //EIA api will return a header but no data if key exist but not for requested freq.  This guards against
            $new_serie = false;
            if(array_key_exists($key,$mddb_series)) {
                $mddb_serie =  $mddb_series[$key];  //this is the
            }  elseif(array_key_exists($key . "." . $periodicity, $mddb_series)) {
                $mddb_serie =  $mddb_series[$key . "." . $periodicity];
            }  else { //series does not exist in the database => insert it
                $sql = "insert into series (name, src, url, units, periodicity, skey) values (" . safeStringSQL($eia_serie["NAME"])
                    . "," . safeStringSQL($eia_serie["SOURCE"]) . "," . safeStringSQL($eia_serie["URL"]) . ","
                    . safeStringSQL($eia_serie["UNITS"]) . "," . safeStringSQL($periodicity) . "," . safeStringSQL($eia_serie["KEY"]) . ")";
                logEvent("EIA API: NewSeries", $sql);
                $result = mysql_query($sql);
                $mddb_serie = ["seriesid"=>mysql_insert_id($con),"name"=>"","src"=>"","url"=>"","units"=>"","data"=>""];
            }
            $data = ""; //rebuild the data string in the MD format
            foreach($eia_serie["DATA"] as $x => $y){
                if($data != "") $data .= "||";
                switch(strtoupper ($periodicity)){
                    case "A":
                        $data .=  substr($x,0,4) . "|" . $y;
                        break;
                    case "M":
                        $data .=  substr($x,0,4) . sprintf("%02d",(intval(substr($x,4,2))-1)) . "|" . $y;
                        break;
                    default:
                        $data .=  substr($x,0,4) . sprintf("%02d",(intval(substr($x,4,2))-1)) .
                            substr($x,6,2) . "|" . $y;
                }
            }
            if($data!=$mddb_serie["data"]){  //new capture!
                $point_count = count($eia_serie["DATA"]);
                switch(strtoupper ($periodicity)){
                    case "A":
                        $first_date =  substr($mddb_serie["data"][0][0],0,4) . "-01-01 00:00:00";
                        $last_date = substr($mddb_serie["data"][$point_count-1][0],0,4) . "-01-01 00:00:00";
                        break;
                    case "M":
                        $first_date =  substr($mddb_serie["data"][0][0],0,4) . "-" . sprintf("%02d",intval(substr($mddb_serie["data"][0][0],4,2))) . "-01 00:00:00";
                        $last_date =  substr($mddb_serie["data"][$point_count-1][0],0,4) . "-" . sprintf("%02d",intval(substr($mddb_serie["data"][$point_count-1][0],4,2))) . "-01 00:00:00";
                        break;
                    default:
                        $first_date =  substr($mddb_serie["data"][0][0],0,4) . "-" . sprintf("%02d",intval(substr($mddb_serie["data"][0][0],4,2))) . "-" .
                            substr($mddb_serie["data"][0][0],6,2) . " 00:00:00";
                        $last_date =  substr($mddb_serie["data"][$point_count-1][0],0,4) . "-" . sprintf("%02d",intval(substr($mddb_serie["data"][$point_count-1][0],4,2))) . "-" .
                            substr($mddb_serie["data"][$point_count-1][0],6,2) . " 00:00:00";
                }
                date_default_timezone_set('UTC');
                $first_date_js = (strtotime($first_date) * 1000) - (strtotime('02-01-1970 00:00:00') * 1000);
                $last_date_js = (strtotime($last_date) * 1000) - (strtotime('02-01-1970 00:00:00') * 1000);
                $sql = "INSERT INTO captures(seriesid, data, hash, firstdt, lastdt, points, capturedt, processdt, lastchecked, isamerge, capturecount, privategraphcount, publicgraphcount) "
                    . "VALUES (" . $mddb_serie["seriesid"]
                    . ",'" . $data . "'"
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
            } else { //update the lat checked date
                $sql = "update captures set lastchecked = NOW() where captureid =" . $mddb_serie["captureid"];
                logEvent("EIA API: update lastchecked of capture", $sql);
                mysql_query($sql);
            }
            if($mddb_serie["name"]!=$eia_serie["NAME"] || $mddb_serie["url"]!=$eia_serie["URL"]
            || $mddb_serie["units"]!=$eia_serie["UNITS"] // $mddb_serie[""]!=$eia_serie["UNITSABBREV"] ||
            || $mddb_serie["src"]!=$eia_serie["SOURCE"] || $data!=$mddb_serie["data"]){
                $sql = "update series set  name=" . safeStringSQL($eia_serie["NAME"])
                    . ", url=" . safeStringSQL($eia_serie["URL"]) . ", units=" . safeStringSQL($eia_serie["UNITS"])
                    . ", src=" . safeStringSQL($eia_serie["SOURCE"]);
                if($data!=$mddb_serie["data"]) $sql.= ", captureid=" . $captureid;
                $sql.=" where seriesid=" . $mddb_serie["seriesid"];
                logEvent("EIA API: update series", $sql);
                mysql_query($sql);
            }
        }
    }
    $these_series = array();
}

?>