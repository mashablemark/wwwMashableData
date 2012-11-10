<?php
/* This file is currently call from the iframe created by md_hccharter.js and loaded
 * with secure_xfer.php.  It is called with either the 'meta' or the 'mashabledata'
 * variable set.
 * Copy of this function(ality) migrated to workbench/api.php's command: 'uploadMashableData'
 * which takes a JSON argument

*/
$time_start = microtime(true);
$metadata =  $_POST['meta'];
$mashabledata =  $_POST['mashabledata'];

if(count($mashabledata) == 0)
	{
	if(count($metadata)== 0)
		{
		die("invalid call.  Err 100");
		}
	}
else
	{
	
	//print("making metadata from mashabledata<br>");
	$metadata = substr($mashabledata, 0, (strpos($mashabledata, "||datahash|") + 51));
	}
	
$con = mysql_connect("localhost","melbert_admin","g4bmyLl890e0");
if (!$con)
  {
  die("status: 'mySQL connection error'");
  }

mysql_select_db("melbert_mashabledata", $con);

$log_sql = "insert into eventlog(event, data) values('metadata','" . mysql_real_escape_string($metadata) . "')";
$event = mysql_query($log_sql);

$series_name = getMashableDataMeta("name", $metadata);
$graph_title = getMashableDataMeta("graph", $metadata);
$units = getMashableDataMeta("unit_nom", $metadata);
$skey = getMashableDataMeta("skey", $metadata);
$url = getMashableDataMeta("url", $metadata);
$src = getMashableDataMeta("credit", $metadata);
$periodicity = getMashableDataMeta("period", $metadata);
$hash = getMashableDataMeta("datahash", $metadata);
$capture_dt = getMashableDataMeta("save_dt", $metadata);

//print("src_url: " . $src_url ."<br>");
$working_url = preg_replace('/http[s]*:\/\//','',$url);
//print("working_url: " . $working_url ."<br>");
$first_slash = strpos($working_url,'/');
$full_domain = substr($working_url, 0, $first_slash);
//print("full_domain: " . $full_domain ."<br>");
$period = strrpos($full_domain, ".");
$l1domain = substr($full_domain, $period+1);
$l2domain = substr($full_domain, 0, $period);
//print("l2domain: " . $l2domain ."<br>");
$period = strrpos($l2domain,".");
//print("period: " . $period ."<br>");
if($period) {$l2domain = substr($l2domain, $period+1);}
//print("SQL: ");
$sql = "SELECT * FROM series WHERE name='" . mysql_real_escape_string ($series_name) . "' and title = '" . mysql_real_escape_string ($graph_title) 
	. "' and url = '" . mysql_real_escape_string ($url) . "' and periodicity = '" . mysql_real_escape_string ($periodicity)
	. "' and units = '" . mysql_real_escape_string ($units) . "'";
$log_sql = "insert into eventlog(event, data) values('series search on (name, graph, url, period)','" . mysql_real_escape_string($sql) . "')";
$event = mysql_query($log_sql);
	
//print("l1domain: " . $l1domain ."<br>");
//print("l2domain: " . $l2domain ."<br>");
//print($sql . "<br>");
//print("SQL END<br>");
$result = mysql_query($sql);
//$result = mysql_fetch_array($result);
if(mysql_num_rows($result) == 0)
		{//SERIES DOES NOT EXIST!!
    if(count($mashabledata) != 0) //only upload if the data + metadata are present
        {
        $sql = "INSERT INTO series(name, skey, url, src, title, units, periodicity, l1domain, l2domain) "
        . "VALUES ('" . mysql_real_escape_string($series_name) . "','"
        . mysql_real_escape_string($skey) . "','"
        . mysql_real_escape_string($url) . "','"
        . mysql_real_escape_string($src) . "','"
        . mysql_real_escape_string($graph_title) . "','"
        . mysql_real_escape_string ($units) . "','"
        . mysql_real_escape_string($periodicity) . "','"
        . mysql_real_escape_string($l1domain) . "','"
        . mysql_real_escape_string($l2domain) . "')";
        $log_sql = "insert into eventlog(event, data) values('series insert sql','" . mysql_real_escape_string($sql) . "')";
        $event = mysql_query($log_sql);

        $insert = mysql_query($sql);
        $seriesid = mysql_insert_id ($con);  //capture inserted below
        }
    else
        {
        mysql_close($con);
				$time_elapsed =  (microtime(true) - $time_start)*1000;
        die("status|request_data||exec_time|" . $time_elapsed . "ms"); //data not preseent.  request whole enchilada (md string broken in 'meta' and 'mashabledata' components
        }
		}
else
		{//SERIES FOUND!!!
		$seriesrow = mysql_fetch_array($result);
		$seriesid = $seriesrow['seriesid'];
		}
		//print("hash: " . $hash . "<BR>");
		//print("mysql_real_escape_string($hash): " . mysql_real_escape_string($hash) . "<BR>");
		//print("seriesid: " . $seriesid . "<BR>");
		

$sql = "SELECT * from captures where seriesid = " . $seriesid . " and hash = '"  . mysql_real_escape_string($hash) . "'";
$capture = mysql_query($sql);
if(mysql_num_rows($capture)==0)
		{ //make sure we have the full $mashabledata before proceeding
		if(count($mashabledata) == 0)
				{
				mysql_close($con);
				$time_elapsed =  (microtime(true) - $time_start)*1000;
        die("status|request_data||exec_time|" . $time_elapsed . "ms"); //data not preseent.  request whole enchilada (md string broken in 'meta' and 'mashabledata' components
				}
		//from here on, we have both meta and data
		if(sha1(substr($mashabledata, (strpos($mashabledata, "||datahash|") + 53))) != $hash)
				{
						$log_sql = "insert into eventlog(event, data) values('hash mismatch', " . mysql_real_escape_string($mashabledata) . "')";
						$event = mysql_query($log_sql);
						die("status: 'data signature error' " . $mashabledata . ' ' . substr($mashabledata, (strpos($mashabledata, "||datahash|") + 51)));
				}
		$sql = "INSERT INTO captures(seriesid, url, data, hash, firstdt, lastdt, points, capturedt, processdt, lastchecked, isamerge, capturecount, privategraphcount, publicgraphcount) "
		. "VALUES (" . $seriesid
		. ",'" . mysql_real_escape_string(getMashableDataMeta("url", $metadata)) . "'"
		. ",'" . mysql_real_escape_string(substr($mashabledata, (strpos($mashabledata, "||datahash|") + 53))) . "'"
		. ",'" . mysql_real_escape_string(getMashableDataMeta("datahash", $metadata)) . "'"
		. "," . mysql_real_escape_string(getMashableDataMeta("firstdt", $metadata))
		. "," . mysql_real_escape_string(getMashableDataMeta("lastdt", $metadata))
		. "," . mysql_real_escape_string(getMashableDataMeta("points", $metadata))
		. ", FROM_UNIXTIME(" . $capture_dt . "/1000)"
		. ", NOW()"
		. ", FROM_UNIXTIME(" . $capture_dt . "/1000)"
		. ",'N'"
		. ",1,0,0"
		. ")";
		$log_sql = "insert into eventlog(event, data) values('capture insert sql','" . mysql_real_escape_string($sql) . "')";
		$event = mysql_query($log_sql);

		$capture = mysql_query($sql);
		$captureid = mysql_insert_id($con);
		$sql = "update series set captureid = " . $captureid . " where seriesid = " . $seriesid;

		$log_sql = "insert into eventlog(event, data) values('series captureid update sql','" . mysql_real_escape_string($sql) . "')";
		$event = mysql_query($log_sql);

		mysql_query($sql);
		}
else
		{ //update existing capture
				$capturerow = mysql_fetch_array($capture);
				$captureid = $capturerow["captureid"];
				$sql = "UPDATE captures SET lastchecked='" . mysql_real_escape_string($capture_dt) . "',capturecount=capture+1"
				. " WHERE captureid=" . $captureid;
				$capture = mysql_query($sql);
				$sql = "UPDATE series SET capturecount=capturecount+1"
				. " WHERE seriesid=" . $seriesid;
				mysql_query($sql);
		}
$time_elapsed =  (microtime(true) - $time_start)*1000;
print("status|ok||cid|" . $captureid . "||sid|" . $seriesid . "||exec_time|" . $time_elapsed . "ms"); //no jQuery > no JSON
mysql_close($con);


//helper functions
function getMashableDataMeta($keyValue, $metadata){
	$aryMeta =  explode("||", $metadata);
	for($i=0; $i < count($aryMeta); $i++)
  {
		$aryKeyValuePair = explode("|", $aryMeta[$i]);
		if($keyValue == $aryKeyValuePair[0])
		{
			return($aryKeyValuePair[1]);
		}
	}
	print('status|fail:' . $keyValue . ' not in ' . $metadata); //no jQuery, no JSON
}


//print($content);
?>