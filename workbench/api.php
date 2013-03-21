<?php
$event_logging = true;
$sql_logging = true;
include_once("../global/php/common_functions.php");
date_default_timezone_set('UTC');


//$usageTracking = trackUsage("count_datadown");



/* This is the sole API for the MashableData Workbench application connecting
 * the client application to the cloud.  All returns are JSON objects. Supports the following:
 *
 * command: SearchSeries  (anonymous permitted)
 *   search
 *   periodicity
 * command: SearchGraphs  (anonymous permitted)
 *   search
 * command: GetSeriesData > data, sid, & cid in an array "seriesData"   (anonymous permitted)
 *   sids:
 *   cids:
 *
 * command: GetPublicGraph     (anonymous permitted)
 *   g: hash of public graph requested, returning graph object with complete series objects
 *
 * command: GetApis     (anonymous permitted)
 *   returning array of API names and ids
 *
 * command: GetMyGraphs
 *   uid
 * command: GetMySeries
 *   uid
 * command: MyCaptures
 *
 * command: ManageMyGraphs > status=OK
 *   required:  title, analysis, published, type, intervallastdt, interval, intervalcount,
 *              series [(sid, cid, transform, transformstart, transformend)]
 *   optional: gid, start, end
 *
 * COMMENTED OUT: ManageMyComposites > status=OK
 *   uid: required
 *   sid: required
 *   cid: required
 *   jsts: javascript time stamp of when this happened
 *   to: 'H' | 'S' | anything else to delete (required)
 *
 * command: ManageMySeries > status=OK
 *   uid: required
 *   sid: required
 *   cid: required
 *   jsts: javascript time stamp of when this happened
 *   to: 'H' | 'S' | anything else to delete (required)
 * command: GetUserId
 *   accounttype:  required
 *   accesstoken (for Facebook accounts)
 *   expires (for Facebook account)
 *   username: required
 *   name: required
 *   email: required, but can be ''
 *   company: required, but can be ''
 * command: UploadMyMashableData
 *   the entire md metadata as object properties
 * command: GetMashableData -> the entire mashabledata as object, with points as string property "data"
 *   sid:  either series id (sid) or capture id (cid) must be submitted
 *   cid:  cid takes precedence
 * command: GetAnnotations    (anonymous permitted for standard only)
 *   type: M|S (my or standard
 * command: GetAnnotation     (anonymous permitted)
 *   annoid:
*/
$time_start = microtime(true);
$command =  $_REQUEST['command'];
$con = getConnection();
switch($command){
    case "SearchSeries":
        if(isset($_POST["uid"])  && intval($_POST["uid"])>0 && $_POST["uid"]!=null){
            $usageTracking = trackUsage("count_seriessearch");
        }
/*        if(!$usageTracking["approved"]){
            $output = array("status"=>$usageTracking["msg"]);
            break;
        }
*/
        $search =  rawurldecode($_POST['search']);
        $periodicity =  $_POST['periodicity'];
        $apiid =  $_POST['apiid'];
        $catid =  intVal($_POST['catid']);
        $mapset =  $_POST['mapset'];

        if(count($search) == 0 || count($periodicity)== 0) die("invalid call.  Err 101");
        
        $sLimit = " ";
       if ( isset( $_POST['iDisplayStart'] ) && $_POST['iDisplayLength'] != '-1' ) {
           $sLimit = " LIMIT ".$db->real_escape_string( $_POST['iDisplayStart'] ).", "
                . $db->real_escape_string( $_POST['iDisplayLength'] );
       }

        $aColumns=array("s.seriesid", "name", "units", "periodicity", "title", "url", "firstdt", "lastdt", "updated");

        $sql = "SELECT SQL_CALC_FOUND_ROWS s.seriesid, mapsetid, pointsetid, name, units, periodicity as period, title, src, url, "
        . " firstdt, lastdt, apiid"
        . " FROM series s ";

        if($catid>0){
            $sql = $sql . " INNER JOIN categoryseries cs on s.seriesid = cs.seriesid "
            . " WHERE catid=" . $catid;
        } else {
            $sql = $sql . " WHERE 1 ";
            if(strpos($search,'title:"')===0){ //ideally, use a regex like s.match(/(title|name|skey):"[^"]+"/i)
                $title = substr($search, strlen("title")+2,strlen($search)-strlen("title")-3);
                $sql .= " AND title = " . safeStringSQL($title);
            } elseif($search!='+ +') {
                $sql .= " AND match(name,title,units) against ('" . $search . "' IN BOOLEAN MODE)";
            }
            if(is_numeric($apiid)) {
                 $sql .= " AND apiid = " . intval($apiid);
            } elseif ($apiid == "org") { //for security, the orgid is not passed in.  rather, if it is fetched from the users account
                requiresLogin(); //sets $orgid.  Dies if not logged in
                $sql .= " AND orgid = " . $orgid;

            } else {  //open search = must filter out orgs series that are not my org
                if(isset($_POST["uid"]) && intval($_POST["uid"])>0){
                    requiresLogin(); //sets $orgid.  Dies if not logged in, but we should be because a uid was passed in
                    $sql .= " AND (orgid is null or orgid = " . $orgid . ") ";
                } else {
                    $sql .= " AND orgid is null ";
                }

            }
        }
        if($periodicity != "all") {
            $sql = $sql . " AND periodicity='" . $periodicity . "'";
        };
        if($mapset=='mapsets'){
            $sql = $sql . " AND mapsetid is not null ";
        }
        if($mapset=='pointsets'){
            $sql = $sql . " AND pointsetid is not null ";
        }
        /*
         * Ordering
         */
        $sOrder = '';
        if ( isset( $_POST['iSortCol_0'] ) )
        {
            $sOrder = " ORDER BY  ";
            for ( $i=0 ; $i<intval( $_POST['iSortingCols'] ) ; $i++ )
            {
                if ( $_POST[ 'bSortable_'.intval($_POST['iSortCol_'.$i]) ] == "true" )
                {
                    $sOrder .= $aColumns[ intval( $_POST['iSortCol_'.$i] ) ]." ".$db->real_escape_string( $_POST['sSortDir_'.$i] ) .", ";
                }
            }
            $sOrder = substr_replace( $sOrder, "", -2 );

            if(strlen($search)>0 && $sOrder == " ORDER BY") {  // show shortest results first, but only if the user actually entered keywords
                $sOrder = " ORDER BY namelen asc ";
            }
        }
        if(strlen($search)>0 && $sOrder == "") {  // show shortest results first, but only if the user actually entered keywords
            if($catid==0){
                $sOrder = " ORDER BY namelen asc ";
            } else {
                $sOrder = " ORDER BY name asc ";
            }
        }
        $sql = $sql . $sOrder . $sLimit;

/*        $log="";
        foreach($_POST as $key => $value){$log = $log . $key.": ".$value.';'; };
        logEvent("SearchSeries POST", $log);*/

        logEvent("SearchSeries", $sql);
        $result = runQuery($sql);

        /* Data set length after filtering */
        $sQuery = "
            SELECT FOUND_ROWS()
        ";
         //echo($sQuery . "<br>");
        $rResultFilterTotal = runQuery( $sQuery) or die($db->error());
        $aResultFilterTotal = $rResultFilterTotal->fetch_array();
        $iFilteredTotal = $aResultFilterTotal[0];

        /* Total data set length */
       $sQuery = "SELECT COUNT(seriesid)FROM series";

       //echo($sQuery . "<br>");
       $rResultTotal = runQuery( $sQuery ) or die($db->error());
       $aResultTotal = $rResultTotal->fetch_array();
       $iTotal = $aResultTotal[0];
       $output = array("status"=>"ok",
            "sEcho" => intval($_POST['sEcho']),
            "iTotalRecords" => $iTotal,
            "iTotalDisplayRecords" => $iFilteredTotal,
            "search"=>$search,
            "aaData" => array()
       );
        if(isset($usageTracking["msg"])) $output["msg"] = $usageTracking["msg"];
       while ($aRow = $result->fetch_assoc()) {
            $output['aaData'][] = $aRow;  
       }
       break;
    case "SearchGraphs":
        $usageTracking = trackUsage("count_graphssearch");
        if(!$usageTracking["approved"]){
            $output = array("status"=>$usageTracking["msg"]);
            break;
        }
        $search =  $_POST['search'];
        //$periodicity =  $_POST['period'];
        //$user_id =  intval($_POST['uid']);
        if(count($search) == 0) die("invalid call.  Err 106");
        $sLimit = " ";
        if ( isset( $_POST['iDisplayStart'] ) && $_POST['iDisplayLength'] != '-1' ) {
           $sLimit = " LIMIT ".$db->real_escape_string( $_POST['iDisplayStart'] ).", "
                . $db->real_escape_string( $_POST['iDisplayLength'] );
        }
        $aColumns=array("g.graphid", "g.title", "g.text", "g.serieslist", "ifnull(g.fromdt, min(c.firstdt))", "ifnull(g.todt ,max(c.lastdt))", "views", "ifnull(g.updatedt , g.createdt)");

        $sql = "SELECT g.graphid, g.title, text as analysis, "
       . "   serieslist, map, ghash,  ifnull(g.fromdt, min(s.firstdt)) as fromdt, ifnull(g.todt ,max(s.lastdt)) as todt, views, ifnull(updatedt, createdt) as modified"
       . " FROM graphs g, graphplots gp, plotcomponents pc, series s "
       . " WHERE g.graphid=gp.graphid and gp.plotid=pc.plotid and pc.objid=s.seriesid and (pc.objtype='S' or pc.objtype='U') and g.graphid is not null and published='Y'";
        if($search!='+ +'){
            $sql .= "   and  match(g.title, g.text, g.serieslist, g.map) against ('" . $search . "' IN BOOLEAN MODE) ";
        }
/*        if($periodicity != "all") {
            $sql = $sql . " and periodicity='" . $periodicity . "'";
        }
*/
        /*
         * Ordering
         */
        if ( isset( $_POST['iSortCol_0'] ) )
        {
            $sOrder = "ORDER BY  ";
            for ( $i=0 ; $i<intval( $_POST['iSortingCols'] ) ; $i++ )
            {
                if ( $_POST[ 'bSortable_'.intval($_POST['iSortCol_'.$i]) ] == "true" )
                {
                    $sOrder .= $aColumns[ intval( $_POST['iSortCol_'.$i] ) ]." ".$db->real_escape_string( $_POST['sSortDir_'.$i] ) .", ";
                }
            }

            $sOrder = substr_replace( $sOrder, "", -2 );
            if ( $sOrder == "ORDER BY" )
            {
                $sOrder = " ORDER BY createdt desc ";
            }
        } else {
               $sOrder = " ORDER BY createdt desc ";
           }

       $sql = $sql . $sOrder . $sLimit;

       $log="";
       foreach($_POST as $key => $value){$log = $log . $key.": ".$value.';'; };
       logEvent("SearchGraphs POST", $log);

       logEvent("SearchGraphs", $sql);
       $result = runQuery($sql);

       /* Data set length after filtering */
       $sQuery = "
           SELECT FOUND_ROWS()
       ";
        //echo($sQuery . "<br>");
       $rResultFilterTotal = runQuery( $sQuery) or die($db->error());
       $aResultFilterTotal = $rResultFilterTotal->fetch_array();
       $iFilteredTotal = $aResultFilterTotal[0];

       /* Total data set length */
/*      $sQuery = "SELECT COUNT(graphid) FROM graphs";
      $rResultTotal = runQuery( $sQuery ) or die($db->error());
      $aResultTotal = $rResultTotal->fetch_array();
      $iTotal = $aResultTotal[0];*/
        $iTotal = 0;  //don't bother fetching this value as it is not displayed or otherwise used

      $output = array("status"=>"ok",
         "sEcho" => intval($_POST['sEcho']),
         "iTotalRecords" => $iTotal,
         "iTotalDisplayRecords" => $iFilteredTotal,
         "aaData" => array()
      );
      if(isset($usageTracking["msg"])) $output["msg"] = $usageTracking["msg"];
      while ($aRow = $result->fetch_assoc()) {
          $output['aaData'][] = $aRow;
      }
      break;
	case "GetSeriesData": 
		$seriesIds =  $_POST['sids'];
		if(count($seriesIds) == 0){
            $output = array("status" =>"invalid GetSeriesData call.  Err 104");
            break;
		}
		$sql = "SELECT s.data, s.seriesid as sid, s.captureid as cid, s.captureid as lastestcid "
			. " FROM series s where  s.seriesid in (" . $seriesIds . ")";
        $result = runQuery($sql);
		$output = array_merge($output, array("status" => "ok", "seriesData" => array()));
        while ($aRow = $result->fetch_assoc()) {
                    $output['seriesData'][] = $aRow;
                }
		break;

    case "GetMyGraphs":   //get only skeleton.  To view graph, will require call to GetMyGraph
        requiresLogin();
        $user_id =  intval($_POST['uid']);
        $output = getGraphs($user_id, '');
        break;

       /* requiresLogin();
    	$user_id =  intval($_POST['uid']);
        $sql = "SELECT g.graphid as gid, g.userid, g.title, text as analysis, "
            . " serieslist, ghash,  g.fromdt, g.todt,  g.published, views, ifnull(updatedt,createdt) as updatedt, "
            . " intervaldt, intervalspan, intervalcount, type, annotations "
            . " from graphs g "
            . " where g.userid=" . $user_id;

        $result = runQuery($sql);
        $output = array("status"=>"ok","graphs" => array());
        while ($aRow = $result->fetch_assoc()){
            $gid = $aRow['gid'];
            $output['graphs']['G' . $gid] = array(
                "gid" =>  $gid,
                "userid" =>  $aRow["userid"],
                "title" =>  $aRow["title"],
                "analysis" =>  $aRow["analysis"],
                "serieslist" =>  $aRow["serieslist"],
                "ghash" =>  $aRow["ghash"],
                "start" =>  $aRow["fromdt"],
                "end" =>  $aRow["todt"],
                "type" =>  $aRow["type"],
                "published" =>  $aRow["published"],
                "views" =>  $aRow["views"],
                "updatedt" =>  $aRow["updatedt"],
                "annotations" =>  $aRow["annotations"],
                "interval" =>  array(
                    "selecteddt" => $aRow["intervaldt"],
                    "span" => $aRow["intervalspan"],
                    "count" => $aRow["intervalcount"]
                ),
                "map"=>  $aRow["map"],
                "mapconfig"=>  $aRow["mapconfig"]
            );
        }
        break;*/
    case "GetPublicGraph":  //data and all: the complete protein!
        $ghash =  $_POST['ghash'];
        if(strlen($ghash)>0){
            $output = getGraphs(0, $ghash); //gets everything except the mapset data

            foreach($output['graphs'] as $ghandle => $oGraph){
                if($oGraph["map"]!=null && $oGraph["map"]!=""){
                    $mapsets = getGraphMapSets($oGraph["gid"], $oGraph["map"]);
                    if($mapsets) $output['graphs'][$ghandle]['mapsets'] = $mapsets;
                    $pointsets = getPointSets($oGraph["gid"], $oGraph["map"]);
                    if($pointsets) $output['graphs'][$ghandle]['pointsets'] = $pointsets;
                }
            }
        } else {
            $output = array("status"=>"The graph requested not available.  The author may have unpublished or deleted it.");
        }
        break;
    case "GetGraphMapSet":
        $gid =  intval($_POST['gid']);
        $uid = intval($_POST["uid"]);
        $sql="select map, mapsetid from graphmapsets gms, graphs "
        . " where gms.graphid=g.graphid and g.userid=" . $uid;
        $result = runQuery($sql);
        if($result->num_rows>0){
            $row = $result->fetch_assoc();
            $mapsets = getGraphMapSets($gid,$row["map"]);
            $output = array("status"=>"OK", "mapsets"=>$mapsets);
        } else {
            $output = array("status"=>"Error:  Requested map sets not found.");
        }
        break;
    case "GetMapSets":  //USED IN QUICKVIEW TO MAP
        $usageTracking = trackUsage("count_graphsave");
        $map = $_POST["map"];
        $output = array("status"=>"ok", "mapsets"=>getMapSets($map,cleanIdArray($_POST["mapsetids"]), true));
        break;
    case "GetPointSets": //USED IN QUICKVIEW TO MAP
        $usageTracking = trackUsage("count_graphsave");
        $map = $_POST["map"];
        $output = array("status"=>"ok", "pointsets"=>getPointSets($map,cleanIdArray($_POST["pointsetids"])));
        break;
    case "GetAvailableMaps":
        $mapsetid = intval($_POST["mapsetid"]);
        $pointsetid = intval($_POST["pointsetid"]);
        if(isset($_POST["geoid"])){
            $geoid = intval($_POST["geoid"]);
        } else {
            $geoid = 0;
        }
        $sql = "select m.name, geographycount, count(s.geoid) as setcount "
            . " from series s, maps m, mapgeographies mg "
            . " where m.map=mg.map and mg.geoid=s.geoid";
        if($mapsetid>0) $sql .= " and s.mapsetid=".$mapsetid;
        if($pointsetid>0) $sql .= " and s.pointsetid=".$pointsetid;
        if($geoid>0) $sql .= " and m.map in (select map from mapgeographies where geoid = " . $geoid . ")";
        $sql .= " group by m.name, geographycount order by count(s.geoid)/geographycount desc";
        $output = array("status"=>"ok", "maps"=>array());
        $result = runQuery($sql);
        while($row = $result->fetch_assoc()){
            array_push($output["maps"], array("name"=>$row["name"], "count"=>($mapsetid!=0)?$row["setcount"]." of ".$row["geographycount"]:$row["setcount"]." locations"));
        }
        break;
    case 'GetBunnySeries':
        $mapsetids = $_POST["mapsetids"];
        if(!isset($_POST["geoid"]) || intval($_POST["geoid"])==0){
            $sql = "select bunny from maps where name = " . safeSQLFromPost("mapname");
            $result = runQuery($sql,"GetBunnySeries map");
            if($result->num_rows==1){
                $row = $result->fetch_assoc();
                $geoid = $row["bunny"];
            } else {
                return (array("status"=>"unable to find map"));
            }
        } else {
            $geoid = intval($_POST["geoid"]);
        }
        $output = array("status"=>"ok", "allfound"=>true, "assets"=>array());
        for($i=0;$i<count($mapsetids);$i++){
            $sql = "SELECT s.name, s.mapsetid, s.pointsetid, s.notes, s.skey, s.seriesid as id, lat, lon, geoid,  s.userid, "
            . "s.title as graph, s.src, s.url, s.units, s.data, periodicity as period, 'S' as save, 'datetime' as type, firstdt, "
            . "lastdt, hash as datahash, myseriescount, s.privategraphcount + s.publicgraphcount as graphcount "
            . " FROM series s "
            . " where mapsetid = " . intval($mapsetids[$i]) . " and geoid = " . $geoid;
            $result = runQuery($sql,"GetBunnySeries");
            if($result->num_rows==1){
                $row = $result->fetch_assoc();
                if(intval($row["userid"])>0){
                    requiresLogin();
                    if(intval($_POST["uid"])==$row["userid"] || ($orgId==$row["ordig"] &&  $orgId!=0)){
                        $row["handle"] = "U".$row["seriesid"];
                        $output["assets"]["M".$mapsetids[$i]] = $row;
                    } else {
                        $output["allfound"]=false;
                        $output["assets"]=false; //no need to transmit series as it will not be used
                        break;
                    }
                } else {
                    $row["handle"] = "S".$row["seriesid"];
                    $output["assets"]["M".$mapsetids[$i]] = $row;
                }
                $geoid = $row["bunny"];
            } else {
                $output["allfound"]=false;
                $output["assets"]=false; //no need to transmit series as it will not be used
                break;
            }
        }
        break;
    case "GetApis":
        $sql = "select apiid, name from apis";
        $result = runQuery($sql);
        $apis = array();
        while($api = $result->fetch_assoc()) array_push($apis, $api);
        $output =  array("status"=>"ok","sources" => $apis);
        break;
    case "CardSelects":
        $sql = "SELECT iso3166 AS code, name FROM mapgeographies mg, geographies g WHERE g.geoid = mg.geoid AND mg.map =  'world' ORDER BY name";
        $result = runQuery($sql);
        $countries = array();
        while($country = $result->fetch_assoc()) array_push($countries, $country);
        $output =  array("status"=>"ok","countries" => $countries, "years" => array());
        $assoc_date = getdate();
        for($i=$assoc_date["year"];$i<$assoc_date["year"]+10;$i++){
            array_push($output["years"], $i);
        }
        break;
    case "Subscribe":
        $validRegCode = false;
        $uid=0;
        $orgId = null;
        if(isset($_POST["uid"])) { //new accounts do not have to be logged in, but if user claims a userid, verify accesstoken
            requiresLogin();
            $uid = intval($_POST["uid"]);
        }
        if(isset($_POST["regCode"]) && count($_POST["regCode"])>0){
            $sql = "select * from users where email=".safeSQLFromPost("email")." and regcode=".safeSQLFromPost("regCode");
            $result = runQuery($sql);
            if($result->num_rows==1){
                $user = $result->fetch_assoc();
                if($uid>0 && $uid!=$user["userid"]){ //logged account different from invitation account
                    if($user[""]){

                    }
                    //delete invitation user and transfer
                }
                $validRegCode = true;
                $orgId = $user["orgid"];
                $sql = "update users set emailverify = now() where email=".safeSQLFromPost("email")." and regcode=".safeSQLFromPost("regCode") . " and emailverify is null";
                runQuery($sql); //only stamp it verified the first time
            } else {
                die('{"status":"The registration code is invalid or did not match the primary email address provided."}');
            }
        } elseif(isset($_POST["uid"]) && intval($_POST["uid"])>0){
            $sql = "select * from users where email=".safeSQLFromPost("email")." and userid<>".intval($_POST["uid"]);
            $result = runQuery($sql);
            if($result->num_rows==1){
                die('{"status":"An account already exists for '. $_POST["email"] .'.  If this is your account, please sign in to manage it."}');
            }
        }






        break;
/*
        command: 'Subscribe',
                    name: $screen.find('input.uname').val().trim(),
                    email: $screen.find('input.email').val().trim(),
                    auth: $screen.find('input[name=auth]:checked').val(),
                    pwd: $screen.find('pwd').val().trim(),
                    fbemail: $screen.find('input[name=account-fb]:checked').val()=='fbdiff'?$screen.find('input#account-fbemail').val().trim():$screen.find('input.email').val().trim(),
                    twitemail: $screen.find('input[name=account-twit]:checked').val()=='twitdiff'?$screen.find('input#account-twitemail').val().trim():$screen.find('input.email').val().trim(),
                    accountLevel: accountLevel,
                    regCode: $screen.find('input.regcode').val(),
                    accountJoinMode: $screen.find('input[name=account-join]:checked').val(),
                    cardNum: $screen.find('input.cardNum').val(),
                    cardMonth: $screen.find('input.cardMonth').val(),
                    cardYear: $screen.find('input.cardYear').val(),
                    cardCCV: $screen.find('input.cardCCV').val(),
                    cardName: $screen.find('input.cardName').val(),
                    cardAddress: $screen.find('input.cardAddress').val(),
                    cardCity: $screen.find('input.cardCity').val(),
                    cardStateProv: $screen.find('input.cardStateProv').val(),
                    cardPostal: $screen.find('input.cardPostal').val(),
                    cardCountry: $screen.find('input.cardCountry').val()*/

    case "GetMySeries":
        requiresLogin();
        $user_id =  intval($_POST['uid']);
        $sql = "SELECT  s.userid, mapsetid, pointsetid, name, skey, s.seriesid as id, "
        . " title as graph, s.notes, saved as save, null as 'decimal', src, s.url, s.units,"
        . " updatets, adddt as save_dt, 'datetime' as type, periodicity as period, firstdt, lastdt,"
        . " hash as datahash"
        . " FROM series s, myseries ms "
        . " WHERE s.seriesid=ms.seriesid and ms.userid=" . $user_id;
        $result = runQuery($sql);
        $output = array("status"=>"ok","series" => array());
        while ($aRow = $result->fetch_assoc()){
            if($aRow["userid"]==null){
                $aRow["handle"] = 'S' . $aRow["id"];
                $aRow["sid"] = $aRow["id"];
            } else {
                $aRow["handle"] = 'U' . $aRow["id"];
                $aRow["usid"] = $aRow["id"];
            }
            unset($aRow["id"]);
            $output['series'][$aRow["handle"]] = $aRow;
        }
        break;
    /*case "MyCaptures":
        requiresLogin();
        $user_id =  intval($_POST['uid']);
        $accessToken =  intval($_POST['accessToken']);
        $cids =  $_POST['cids'];
        $addDt =  intval($_POST['jsts']);
        $clean_cids = array();
        foreach($cids as $cid){
            array_push($clean_cids, intval($cid));
        }
        if(count($clean_cids)>0){
            //claim ownership of anonymous uploads performed by user before loggin in
            $sql = "update captures set userid = " . $user_id
                . " where userid is null and cid in (" . implode($clean_cids,",") . ")";
            logEvent("MyCaptures: update captures", $sql);
            runQuery($sql);
            //make sure we don't have duplicate series, regardless of CID
            $sql = "delete from myseries where userid = " . $user_id
                . " and seriesid in (select seriesid from captures where captureid in (" . implode($clean_cids,",") . "))";
            logEvent("MyCaptures: delete existing myseries records", $sql);
            runQuery($sql);
            //insert the myseries records
            $sql = "insert into myseries (userid, seriesid, captureid, saved, adddt) "
            . " select ".$user_id.", seriesid, captureid , 'H', 'Y', ". $addDt ." from captures where captureid in (" . implode($clean_cids,",") . ")";
            logEvent("MyCaptures: insert myseries records", $sql);
            runQuery($sql);
            $output = array("status" => "ok", "cids" => implode($clean_cids,","));
        }
        else{
            $output = array("status" => "invalid call.  Err 201");
        }
        break;*/
    case "GetCatChains":
        $seriesid = intval($_POST["sid"]);
        $sql = "SELECT c.catid, c.name, COUNT(DISTINCT cs2.seriesid ) AS scount "
        . ", COUNT(DISTINCT childid ) AS children   "
        . " FROM categories c "
        . " INNER JOIN categoryseries cs ON  c.catid = cs.catid "
        . " INNER JOIN categoryseries cs2 ON  c.catid = cs2.catid "
        . " LEFT OUTER JOIN catcat cc ON c.catid = cc.parentid "
        . " WHERE cs.seriesid = " . $seriesid
        . " GROUP BY c.catid, c.apicatid, c.name";
        logEvent("GetCatChains: get series cats", $sql);
        $catrs = runQuery($sql);
        $chains = array();
        while($catinfo = $catrs->fetch_array()){
            $chains["C".$catinfo["catid"]] = array(array("catid"=>$catinfo["catid"], "name"=>$catinfo["name"], "scount"=>$catinfo["scount"], "children"=>$catinfo["children"]));
        }
        while(BuildChainLinks($chains)){}  //work occurs in BuildChains (note: $chains passed by ref)
        foreach($chains as $name => $chain){
            array_pop($chain); // get rid of terminal cats added in BuildChainLinks
        }
        $output = array("chains"=>$chains);
        $output["sid"] = $seriesid;
        $output["status"] = "ok";
        break;
    case "GetCatSiblings":
        $catid = intval($_POST["catid"]);
        $sql = "SELECT c.catid, c.name, COUNT(DISTINCT cs.seriesid ) AS scount "
            . ", COUNT(DISTINCT kids.childid ) AS children   "
            . " FROM catcat parent "
            . " INNER JOIN catcat siblings ON siblings.parentid = parent.parentid "
            . " INNER JOIN  categories c  ON c.catid = siblings.childid "
            . " LEFT OUTER JOIN categoryseries cs ON  siblings.childid = cs.catid "
            . " LEFT OUTER JOIN catcat kids ON siblings.childid = kids.parentid "
            . " WHERE parent.childid = " . $catid
            . " GROUP BY c.catid, c.name"
            . " ORDER BY c.name";
        logEvent("GetCatSiblings", $sql);
        $catrs = runQuery($sql);
        $output = array("status" => "ok", "siblings"=>array());
        while($sibling = $catrs->fetch_array()){
            array_push($output["siblings"], $sibling);
        }
        break;
    case "GetCatChildren":
        $catid = intval($_POST["catid"]);
        $sql = "SELECT c.catid, c.name, COUNT(DISTINCT cs.seriesid ) AS scount "
            . ", COUNT(DISTINCT kids.childid ) AS children   "
            . " FROM catcat siblings "
            . " INNER JOIN  categories c  ON c.catid = siblings.childid "
            . " LEFT OUTER JOIN categoryseries cs ON  siblings.childid = cs.catid "
            . " LEFT OUTER JOIN catcat kids ON siblings.childid = kids.parentid "
            . " WHERE siblings.parentid = " . $catid
            . " GROUP BY c.catid, c.name"
            . " ORDER BY c.name";
        logEvent("GetCatChildren", $sql);
        $catrs = runQuery($sql);
        $output = array("status" => "ok", "children"=>array());
        while($child = $catrs->fetch_array()){
            array_push($output["children"], $child);
        }
        break;
    case "DeleteMyGraphs":
        requiresLogin();
        $gids =  $_POST['gids'];
        $clean_gids = array();
        foreach($gids as $gid){
            array_push($clean_gids, intval($gid));
        }
        if(count($clean_gids)>0){
            $user_id =  intval($_POST['uid']);
            //multitable delete
            $sql = "delete g, gp, ps from graphs g, graphplots gp, plotcomponents ps "
            . " where g.graphid=gp.graphid and gp.plotid=ps.plotid "
            . " and g.userid = " . $user_id . " and g.graphid in (" . implode($clean_gids,",") .")";
            logEvent("DeleteMyGraphs: delete graph and dependencies", $sql);
            runQuery($sql);
            $output = array("status" => "ok", "gids" => implode($clean_gids,","));
        } else {
            $output = array("status" => "fail: no gids to delete");
        }
        break;
    case "resetGhash":
        requiresLogin();
        $gid = intval($_POST["gid"]);
        $uid = intval($_POST["uid"]);
        $ghash = setGhash($gid, $uid);
        $output = array("status" => "ok", "gid" => $gid, "ghash"=> $ghash);
        break;
    case "ManageMyGraphs":
        requiresLogin();
        $usageTracking = trackUsage("count_graphsave");
        if(!$usageTracking["approved"]){
            $output = array("status"=>$usageTracking["msg"]);
            break;
        }
        $gid =  (isset($_POST['gid']))?intval($_POST['gid']):0;
        $user_id =  intval($_POST['uid']);
        //TODO:  eliminate useLatest field altogether
        if($_POST['published']=='Y'){$published = "Y";} else  {$published = "N";}
        $createdt = isset($_POST['createdt'])?intval($_POST['createdt']/1000)*1000:null;
        $updatedt = isset($_POST['updatedt'])?intval($_POST['updatedt']/1000)*1000:null;
        $intervals = isset($_POST['intervals'])?intval($_POST['intervals']):'null';
        $from = (isset($_POST['start']) && is_numeric($_POST['start']))?intval($_POST['start']/1000)*1000:'null';
        $to = (isset($_POST['end']) && is_numeric($_POST['end']))?intval($_POST['end']/1000)*1000:'null';
        switch($_POST['type']){
            case "auto":
            case "area":
            case "area-percent":
            case "logarithmic":
            case "area-percent":
            case "percent-line":
            case "column":
            case "stacked-column":
            case "pie":
            case "normalized-line":
                $type = $_POST['type'];
                break;
            default:
                $type = "line";
        }

        //table structure = graphs <-> graphplots <-> plotcomponents

        if(count($gid) == 0 || $gid==0){
            $ghash = makeGhash($uid);  //ok to use uid instead of gid as ghash is really just a random number
            $sql = "insert into graphs (userid, published, title, text, type, "
            . " intervalcount, fromdt, todt, annotations, map, mapconfig, views, createdt, ghash) values ("
            . $user_id . ", '" . $published . "',". safeSQLFromPost("title") . "," . safeSQLFromPost("analysis")
            . ", '" . $type . "', " . $intervals
            . ", " . $from . ", ". $to . ", ". safeSQLFromPost("annotations")
                . ", " . safeSQLFromPost("map") . ", " . safeSQLFromPost("mapconfig")   . ", 0, ".$createdt.",'". $ghash . "')";
            if(!runQuery($sql, "ManageMyGraphs: insert graphs record")){$output = array("status" => "fail on graph record insert", "post" => $_POST);break;}
            $gid = $db->insert_id;
        } else {
            $sql = "update graphs set userid=" . $user_id . ", published='" . $published . "', title=". safeSQLFromPost("title")
                . ", text=" . safeSQLFromPost("analysis") . ", type='" . $type . "', intervalcount="
                . $intervals . " , fromdt=" . $from
                . ", todt=" . $to . ", annotations=" . safeSQLFromPost("annotations") . ", updatedt=".$updatedt
                . ", map=" . safeSQLFromPost("map") . ", mapconfig=" . safeSQLFromPost("mapconfig")
                . " where graphid = " . $gid . " and userid=" . $user_id;
            if(!runQuery($sql,"ManageMyGraphs: update graphs record")){$output = array("status" => "fail on graph record update");break;}
            $result = runQuery("select ghash from graphs where graphid = " . $gid . " and userid=" . $user_id,"ManageMyGraphs: read the ghash when updating");
            $row = $result->fetch_assoc();
            $ghash = $row["ghash"];
            //clear plots and componenets for fresh insert
            $sql = "delete gp, pc from graphplots gp, plotcomponents pc where gp.plotid=pc.plotid and gp.graphid = " . $gid;
            runQuery($sql);
        }
        $output = array("status" => "ok", "gid" => $gid, "ghash"=> $ghash);

        //insert plot and plot components records
        if(isset($_POST['plots'])){
            $plots = $_POST['plots'];
            for($i=0;$i<count($plots);$i++){
                $plot = $plots[$i];
                $sql = "insert into graphplots (graphid, type, options, legendorder) "
                    . " values (".$gid.",'T',".safeStringSQL($plot["options"]).",".($i+1).")";
                runQuery($sql, "ManageMyGraphs: insert new graphplots record");
                $thisPlotId = $db->insert_id;
                for($j=0;$j<count($plot["components"]);$j++){
                    $component = $plot["components"][$j];
                    $sql="insert into plotcomponents (plotid, comporder, objtype, objid, options) values "
                        . "(".$thisPlotId.",".($j+1).",'".substr($component["handle"],0,1)."',"
                        . intval(substr($component["handle"],1)).",".safeStringSQL($component["options"]).")";
                    runQuery($sql,"ManageMyGraphs: insert plotcomponents record");
                }
            }
        }

        //insert mapset and component records
        if(isset($_POST['mapsets']['components'])){
            $sql = "insert into graphplots (graphid, type, options, legendorder) "
                . " values (".$gid.",'M',".safeStringSQL($_POST['mapsets']["options"]).",1)"; //only 1 mapset per graph
            runQuery($sql, "ManageMyGraphs: mapsets into graphplots");
            $thisPlotId = $db->insert_id;
            for($j=0;$j<count($_POST['mapsets']["components"]);$j++){
                $component = $_POST['mapsets']["components"][$j];
                $sql="insert into plotcomponents (plotid, comporder, objtype, objid, options) values "
                    . "(".$thisPlotId.",".($j+1).",'".substr($component["handle"],0,1)."',"
                    . intval(substr($component["handle"],1)).",".safeStringSQL($component["options"]).")";
                runQuery($sql,"ManageMyGraphs: mapset into plotcomponents");
            }
        }
        //insert pointsets and component records
        if(isset($_POST['pointsets'])){
            $xsets = $_POST['pointsets'];
            for($i=0;$i<count($xsets);$i++){
                $xset = $xsets[$i];
                $sql = "insert into graphplots (graphid, type, options, legendorder) "
                    . " values (".$gid.",'X',".safeStringSQL($xset["options"]).",".($i+1).")";
                runQuery($sql, "ManageMyGraphs: pointset into graphplots");
                $thisXSetId = $db->insert_id;
                for($j=0;$j<count($xset["components"]);$j++){
                    $component = $xset["components"][$j];
                    $sql="insert into plotcomponents (plotid, comporder, objtype, objid, options) values "
                        . "(".$thisXSetId.",".($j+1).",'".substr($component["handle"],0,1)."',"
                        . intval(substr($component["handle"],1)).",".safeStringSQL($component["options"]).")";
                    runQuery($sql,"ManageMyGraphs: pointset into plotcomponents");
                }
            }
        }

    //annotation should use P0, P1, P2, P3... to refer to the relevant ordered plot rather than a hard DB id
/*        if(count($output["newplotids"])>0){
            $annotations = $_POST["annotations"];
            foreach ($output["newplotids"] as $oldPlotId => $newPlotId){
                $annotations = str_replace($oldPlotId,$newPlotId, $annotations);
            }
            if($annotations!=$_POST["annotations"]){
                $sql="update graphs set annotations = " . safeStringSQL($annotations) . " where graphid = " . intval($gid);
                runQuery($sql);
                $output["updatedAnnotations"] = $annotations;
            }
        }*/

        $sql = "update graphs g  inner join "
        . " (select graphid, group_concat(s.name SEPARATOR  '; ') as serieslist "
        . " from series s  inner join plotcomponents pc on s.seriesid=pc.objid inner join graphplots gp on pc.plotid=gp.plotid where gp.graphid=" . $gid  . " and (objtype='S' or objtype='U') order by pc.comporder)  sl "
        . " on g.graphid = sl.graphid "
        . " set g.serieslist = sl.serieslist "
        . " WHERE g.graphid=" . $gid;
        if(!runQuery($sql, "ManageMyGraphs: update graphs.serieslist")){$output = array("status" => "fail on graph update");break;}
        if(isset($usageTracking["msg"])) $output["msg"] = $usageTracking["msg"];

        break;
	case "ManageMySeries":
        requiresLogin();
		$user_id =  intval($_POST['uid']);
		$type=  substr($_POST['handle'],0,1);
        $id = intval(substr($_POST['handle'],1));
        $addDt = intval($_POST['jsts']/1000)*1000;
		$to =  $_POST['to'];
		if(count($user_id) == 0 || count($id) == 0){
			$output = array("status" => "invalid call.  Err 103");
			break;
		}


        if($type=="S"){    //series

            $sql = "select * from myseries where seriesid = " . $id . " and userid = " . $user_id;
            $result = runQuery($sql);
            $from = "";
            if($result->num_rows==1){
                $row = $result->fetch_assoc();
                $from = $row["saved"];
                if($from == $to){
                    $output = array("status" => "error: from and to save status are identical");
                    break;
                }
                $sql = "update myseries set saved=" . safeStringSQL($to) . ", adddt=". $addDt ." where seriesid = " . $id . " and userid = " . $user_id;
                logEvent("ManageMySeries: add", $sql);
                runQuery($sql);
            } else {
                if($to=="H" || $to=="S"){ //if not assigned to "saved" or "history" then command is to delete
                    $sql = "insert into myseries (userid, seriesid, saved, adddt) VALUES (" . $user_id . "," . $id . "," . safeStringSQL($to) . "," . $addDt . ")";
                    logEvent("ManageMySeries: add", $sql);
                    runQuery($sql);
                    //TODO:  delete history in excess of 100 series
                }
            }
            if($to == 'S'){
                $sql = "update series set myseriescount= myseriescount+1 where seriesid = " . $id;
                runQuery($sql);
            }elseif($from == 'S' && $to == 'H'){
                $sql = "update series set myseriescount= myseriescount-1 where seriesid = " . $id;
                runQuery($sql);
            }
            if($to!="H" && $to!="S"){
                $sql = "delete from myseries where seriesid = " . $id . " and userid = " . $user_id;
                logEvent("ManageMySeries: delete", $sql);
                runQuery($sql);
            }
        } elseif($type=="U"){
            if($to!="S"){   //can only delete here.  nothing else to manage.
                //TODO: check for graph dependencies and organizational usage
                $sql = "delete from series where seriesid=". $id . " and userid=". $user_id;
                runQuery($sql);
            }
        }

        $output = array("status" => "ok");
		break;
	case "GetUserId":
		$username =  $_REQUEST['username'];
		$accesstoken =  $_REQUEST['accesstoken'];
        $email =  $_REQUEST['email'];
        $expires =  $_REQUEST['expires'];
        $authmode = $_REQUEST['authmode'];   //currently, FB (Facebook) and MD (MashableData) are supported
		//get account type
        if(strlen($username)==0){
            $output = array("status" => "invalid user name");
            break;
        }

        if($authmode=='FB'){
            $fb_command = "https://graph.facebook.com/".$username."/permissions?access_token=".(($accesstoken==null)?'null':$accesstoken);
            logEvent("GetUserId: fb call", $fb_command);
            $fbstatus = json_decode(httpGet($fb_command));
            if(array_key_exists ("data", $fbstatus)){
                $sql = "select u.userid, o.orgid, orgname from users u left outer join organizations o on u.orgid=o.orgid "
                    . " where u.authmode = " . safeSQLFromPost('authmode')
                    . " and u.username = '" . $db->real_escape_string($username) . "'";
                logEvent("GetUserId: lookup user", $sql);
                $result = runQuery($sql);
                if($result->num_rows==1){
                    $row = $result->fetch_assoc();
                    $sql = "update users set accesstoken = '" . $db->real_escape_string($accesstoken) . "' where userid=" .  $row["userid"];
                    runQuery($sql, "GetUserId: update accesstoken");
                    $output = array("status" => "ok", "userId" => $row["userid"], "orgId" => $row["orgid"], "orgName" => $row["orgname"]);
                } else {
                    $sql = "INSERT INTO users(username, accesstoken, name, email, authmode, company) VALUES ("
                        . safeSQLFromPost("username") . ","
                        . safeSQLFromPost("accesstoken") . ","
                        . safeSQLFromPost("name") . ","
                        . safeSQLFromPost("email") . ","
                        . safeSQLFromPost('authmode') . ","
                        . safeSQLFromPost("company") . ")";
                    $result = runQuery($sql, "GetUserId: create new user record");
                    $output = array("status" => "ok", "userid" => $db->insert_id);
                }
            } else {
                $output = array("status" => "error:  Facebook validation failed", "facebook"=> $fbstatus["error"]["message"]);
            }
        }
        if($authmode=='MD'){
            //todo: add MD authentication
        }
		break;
    /*case "UploadMyMashableData":
        requiresLogin();
        $user_id =  intval($_POST['uid']);
        $series_name = $_POST['name'];
        $graph_title =  $_POST['graph'];
        $units = $_POST['units'];
        $skey = $_POST['skey'];
        $url = $_POST['url'];
        $src = $_POST['src'];
        $periodicity = $_POST['period'];
        $hash = $_POST['datahash'];
        $capture_dt = $_POST['save_dt'];
        $data = $_POST['data'];
        $save = $_POST['save'];
        if($save!='H' && $save !='S') $save='H';

        $lid = $_POST['lid'];  //any, but not all three, of these ids (lid,cid,sid) may be 'null'
        $cid = $_POST['cid'];
        $sid = $_POST['sid'];

        $working_url = preg_replace('/http[s]*:\/\//','',$url);
        $first_slash = strpos($working_url,'/');
        $full_domain = substr($working_url, 0, $first_slash);
        $period = strrpos($full_domain, ".");
        $l1domain = substr($full_domain, $period+1);
        $l2domain = substr($full_domain, 0, $period);
        $period = strrpos($l2domain,".");
        if($period){$l2domain = substr($l2domain, $period+1);}

        $newCapture = false;

        $sql = "SELECT * FROM userseries WHERE name='" . $db->real_escape_string ($series_name) . "' and title = '" . $db->real_escape_string ($graph_title)
        	. "' and url = '" . $db->real_escape_string ($url) . "' and periodicity = '" . $db->real_escape_string ($periodicity)
        	. "' and units = '" . $db->real_escape_string ($units) . "'";
        logEvent("uploadMetaData: series find by", $sql);
        $result = runQuery($sql);
        if($result->num_rows == 0){
            if($sid!="null"){

                logEvent("uploadMetaData: error", "no matching series found for sid=" . $sid . " & cid=" . $cid);
                $output = array("status" => "error:  no matching series found for known sid/cid");
                break;
            }
            if(count($data)==0){ //need to insert records, but we do not have the data > issue data request
                $output = array("status" => "request_data");
                break;
            }
            //new series: need to insert a series record, a captures record, and a myseries record
            $sql = "INSERT INTO userseries (userid, name, skey, url, src, title, units, periodicity, l1domain, l2domain) "
                   . "VALUES (" . $user_id . ",'"
                   . $db->real_escape_string($series_name) . "','"
                   . $db->real_escape_string($skey) . "','"
                   . $db->real_escape_string($url) . "','"
                   . $db->real_escape_string($src) . "','"
                   . $db->real_escape_string($graph_title) . "','"
                   . $db->real_escape_string ($units) . "','"
                   . $db->real_escape_string($periodicity) . "','"
                   . $db->real_escape_string($l1domain) . "','"
                   . $db->real_escape_string($l2domain) . "')";
            logEvent("uploadMetaData: insert series", $sql);
            $insert = runQuery($sql);
            $usid = $db->insert_id;
        } else { //series exists in the cloud
            $seriesrow = $result->fetch_assoc();
            $seriesid = $seriesrow['seriesid'];
            if($usid!="null" && $usid != $usid){
                logEvent("uploadMetaData: error", "matching series found, but sid = " . $usid . " does not match seriesid = " . $seriesid);
                $output = array("status" => "error:  matching series found, but sid = " . $usid . " does not match seriesid = " . $seriesid);
                break;
            }
        }

        //check for hash match
        $sql = "SELECT * from captures where seriesid = " . $usid . " and hash = '"  . $db->real_escape_string($hash) . "'";
        $capture = runQuery($sql);
        if($capture->num_rows==0){ //need to insert capture record and update/insert myseries record
            if(count($data)==0){ //if we do not have the data > issue data request
                $output = array("status" => "request_data");
                break;
            }
            if (sha1($data) != $hash) { //check that reported an calculated hashes match.  Should never be a problem
                logEvent("uploadMetaData: error", "hash mismatch for seriesid = " . $seriesid);
                $output = array("status" => "error: datax signature error. SHA1 of " . $data . " is " . sha1($data));
                break;
            }
            $sql = "INSERT INTO captures(seriesid, url, data, hash, firstdt, lastdt, points, capturedt, processdt, lastchecked, isamerge, capturecount, privategraphcount, publicgraphcount) "
            . "VALUES (" . $seriesid
            . ",'" . $db->real_escape_string($url) . "'"
            . ",'" . $db->real_escape_string($data) . "'"
            . ",'" . $db->real_escape_string($hash) . "'"
            . "," . $db->real_escape_string( $_POST['firstdt'])
            . "," . $db->real_escape_string($_POST['lastdt'])
            . "," . $db->real_escape_string($_POST['points'])
            . ", FROM_UNIXTIME(" . $capture_dt . "/1000)"
            . ", NOW()"
            . ", FROM_UNIXTIME(" . $capture_dt . "/1000)"
            . ",'N'"
            . ",1,0,0"
            . ")";
            logEvent("uploadMetaData: insert capture", $sql);
            $capture = runQuery($sql);
            $captureid = $db->insert_id;
            $sql = "update series set captureid=".$captureid." where seriesid=". $seriesid;
            logEvent("uploadMetaData: update series with new captureid", $sql);
            runQuery($sql);
            $newCapture = true;
        } else { //update existing capture
            $capturerow = $capture->fetch_assoc();
            $captureid = $capturerow["captureid"];
            $sql = "UPDATE captures SET lastchecked='" . $db->real_escape_string($capture_dt) . "',capturecount=capturecount+1"
            . " WHERE captureid=" . $captureid;
            logEvent("uploadMetaData: updates capture", $sql);
            $capture = runQuery($sql);
        }
        if($user_id != null){
            $sql = "select count(*) from myseries where userid=" . $user_id . " and seriesid=" . $seriesid ;
            $myseries =  runQuery($sql);
            if($myseries->num_rows==0){
                $sql = "insert into myseries (userid, seriesid, captureid, saved) "
                    . "values (" . $user_id . "," . $seriesid  . "," . $captureid . ",'" . $save ."')";
                logEvent("uploadMetaData: add myseries", $sql);
                runQuery($sql);
            } else {
                $sql = "update myseries set captureid=" . $captureid . ", saved='" . $save ."' "
                    . " where userid=" . $user_id . " and seriesid=" . $seriesid;
                logEvent("uploadMetaData: updates myseries", $sql);
                runQuery($sql);
            }
        }
        $output = array("status" => "ok",
            "cid" => $captureid,
            "sid" => $seriesid,
            "lid" => $lid,
            "newCapture" => $newCapture);
        break;*/

    case "SaveUserSeries":
        requiresLogin();  //sets global $orgid
        $usageTracking = trackUsage("count_userseries");
        if(!$usageTracking["approved"]){
            $output = array("status"=>$usageTracking["msg"]);
            break;
        }
        $user_id =  intval($_POST['uid']);
        $series_name = $_POST['name'];
        $graph_title =  '';
        $units = $_POST['units'];
        $skey = '';
        $url = '';
        $description = $_POST['notes'];
        $periodicity = $_POST['period'];
        $data = $_POST['data'];
        //$orgid = intval($_POST['orgid']);
        $usid = (isset($_POST['usid']))?intval($_POST['usid']):0;
        $src =  (isset($_POST['src']))?$_POST['src']:null;

        if(count($data)==0){ //need to insert records, but we do not have the data > issue data request
            $output = array("status" => "Error:  no data provided");
            break;
        }
        if($usid>0){
            $sql = "update series set name=".safeSQLFromPost("name")
                . ", namelen=". strlen($_POST["name"])
                . ", units=".safeSQLFromPost("units")
                . ", notes=".safeSQLFromPost("notes")
                . ", period=".safeSQLFromPost("periodicity")
                . ", data='" . $db->real_escape_string($data) . "'"
                . ", hash='" . sha1($data)  . "'"
                . ", firstdt=" . intval( $_POST['firstdt']/1000)*1000
                . ", lastdt=" . intval($_POST['lastdt']/1000)*1000
                . " WHERE userid=".$user_id." and seriesid=".$usid;
            runQuery($sql);
            $sql = "UPDATE myseries SET adddt=".intval($_POST["save_dt"]/1000)*1000 . " WHERE userid=".$user_id." and seriesid=".$usid;
        } else {
            $sql = "select COALESCE(u.name, u.email, o.orgname) as owner "
            . " FROM users u left outer join organizations o on u.orgid=o.orgid "
            . " WHERE u.userid=".$user_id;
            $result = runQuery($sql);
            $aUser = $result->fetch_assoc();
            $src = $aUser["owner"];
            $sql = "insert into series (name, namelen, units, notes, periodicity, data, hash, firstdt, lastdt, userid, orgid, src) values ("
                . safeSQLFromPost("name") . ","
                . strlen($_POST["name"]) . ","
                . safeSQLFromPost("units") . ","
                . safeSQLFromPost("notes") . ","
                . safeSQLFromPost("period") . ","
                . "'" . $db->real_escape_string($data) . "',"
                . safeStringSQL(sha1($data)) . ","
                . intval( $_POST['firstdt']/1000)*1000 . ","
                . intval($_POST['lastdt']/1000)*1000 . ","
                . $user_id . ","
                . (($orgid==0)?"null":$orgid). ","
                . safeStringSQL($src) .")";
            runQuery($sql, "userseries insert");
            $usid = $db->insert_id;
            $sql="insert into myseries (userid, seriesid, adddt) values (".$user_id.",".$usid.",".intval($_POST["save_dt"]/1000)*1000 .")";
            runQuery($sql, "myseries insert for new user series");
        }
        $output = array("status" => "ok",
            "usid" => $usid,
            "src"=> $src
        );
        if(isset($usageTracking["msg"])) $output["msg"] = $usageTracking["msg"];
        break;

    case "GetMashableData":
        $usageTracking = trackUsage("count_seriesview");
        if(!$usageTracking["approved"]){
            $output = array("status"=>$usageTracking["msg"]);
            break;
        }
        $sids = (isset($_POST['sids']))? $_POST['sids']:array();
        $usids = (isset($_POST['usids']))? $_POST['usids']:array(); //must be owner or belong to same org as owner or series will not be returned
        $user_id =  intval($_POST['uid']);

		if(count($sids) == 0 && count($usids) == 0){
            $output = array("status" => "invalid call.  Err 102");
            break;
        }
        $clean_seriesids = array();
        if(count($sids) > 0){
            foreach($sids as $sid){
                array_push($clean_seriesids, intval($sid));
            }
        }
        if(count($usids) > 0){
            requiresLogin();   //also set the global $orgid var
            foreach($usids as $usid){
                array_push($clean_seriesids, intval($usid));
            }
        }
        $output = array("status" => "ok", "series" => array());
        if(count($clean_seriesids)>0){
            $sql = "SELECT s.name, s.mapsetid, s.pointsetid, s.notes, s.skey, s.seriesid as id, lat, lon, geoid,  s.userid, "
            . "s.title as graph, s.src, s.url, s.units, s.data, periodicity as period, 'S' as save, 'datetime' as type, firstdt, "
            . "lastdt, hash as datahash, myseriescount, s.privategraphcount + s.publicgraphcount as graphcount "
            . " FROM series s "
            . " WHERE s.seriesid in (" . implode($clean_seriesids,",") .") and (userid is null or userid = " . $user_id . " or orgid=".$orgid.")";
            logEvent("GetMashableData series", $sql);
            $result = runQuery($sql);

            while ($aRow = $result->fetch_assoc()) {
                if($aRow["userid"]==null){
                    $aRow["handle"] =  "S".$aRow["id"];
                    $aRow["sid"] =  $aRow["id"];
                } else {
                    $aRow["handle"] =  "U".$aRow["id"];
                    $aRow["usid"] =  $aRow["id"];
                }
                unset($aRow["id"]);
                $output["series"][$aRow["handle"]] = $aRow;
            }
        }
        if(isset($usageTracking["msg"])) $output["msg"] = $usageTracking["msg"];
		break;
    case  "GetAnnotations":
        if($_POST['whose']=="M"){
            requiresLogin();
            $anno_userid = intval($_POST["uid"]);
        } else {
            $anno_userid = 1;
        }
        $sql = "SELECT annoid, name, description from annotations where userid=".$anno_userid;
        logEvent($command,$sql);
        $result = runQuery($sql);
        $output = array("status" => "ok", "annotations" => array());
        while ($aRow = $result->fetch_assoc()) {
            array_push($output["annotations"], $aRow);
        }
        break;
    case  "GetAnnotation":
        $sql = "SELECT annoid, name, description, annotation from annotations where annoid=". intval($_POST['annoid']);
        logEvent($command,$sql);
        $result = runQuery($sql);
        $output = array("status" => "annotation not found");
        while ($aRow = $result->fetch_assoc()) {
            $output = array("status" => "ok","annoid"=>$aRow["annoid"],"name"=>$aRow["name"],"description"=>$aRow["description"],"annotation"=>$aRow["annotation"]);
        }
        break;
	default:
		$output = array("status" => "invalid command");
}
$time_elapsed =  (microtime(true) - $time_start)*1000;
$output["exec_time"] = $time_elapsed . 'ms';
$output["command"] = $command;
echo json_encode($output);
closeConnection();

//shared routines
function BuildChainLinks(&$chains){
    $recurse = false;
    foreach($chains as $name => $chain){
        $lastcat = $chain[count($chain)-1];
        if($lastcat["catid"]!=0){
            $sql = "SELECT c.catid, c.name, COUNT(DISTINCT childrenseries.seriesid ) AS scount "
            . ", COUNT(DISTINCT childrencats.childid ) AS children   "
            //. ", COUNT(DISTINCT silbingcats.childid ) AS sbilings   "
            . " FROM catcat current "
            . " INNER JOIN categories c ON c.catid = current.parentid "
            . " LEFT OUTER JOIN categoryseries childrenseries ON c.catid = childrenseries.catid "
            . " LEFT OUTER JOIN catcat childrencats ON c.catid = childrencats.parentid "
            //. " LEFT OUTER JOIN catcat parentcat ON c.catid = parentcat.childid "
            //. " LEFT OUTER JOIN catcat silbingcats ON parentcat.parentid = silbingcats.childid "
            . " WHERE current.childid =" . $lastcat["catid"]
            . " GROUP BY c.catid, c.name limit 0, 1";
            logEvent("BuildChainLinks", $sql);
            $children  = runQuery($sql);
            $firstrow = true;
            if($children->num_rows==0){
                array_push($chain, array("catid"=>0));
            } else {
                $recurse = true;
                while($row = $children->fetch_array()){
                    array_push($chains[$name], array("catid"=>$row["catid"], "name"=>$row["name"], "scount"=>$row["scount"],  "children"=>$row["children"]));
                }
            }
        }
    }
    return $recurse;
}
function makeGhash($gid){
    return md5($gid . "mashrocks".microtime());
}
function setGhash($gid){  //does not check permissions!
    $newHash = makeGhash($gid);
    $sql = "update graphs set ghash = '" . $newHash . "' where graphid = " . $gid;
    runQuery($sql, "setGhash");
    return $newHash;
};

function getGraphs($userid, $ghash){
//if $userid = 0, must be a public graph; otherwise must own graph
//note that series data is returned only if ghash is specified (i.e. a single graph request)
//mapset data is not returned.  Requires a call to getGraphMapSets
    if(strlen($ghash)==0 && intval($userid)==0){
        die('{"status":"Must provide valid a hash or user credentials."}');
    }
    $sql = "SELECT g.graphid as gid, g.userid, g.title, text as analysis, "
        . " map, mapconfig, "
        . " serieslist, s.name, s.units, skey, s.firstdt, s.lastdt, s.periodicity, data, "
        . " ghash,  g.fromdt, g.todt,  g.published, views, ifnull(updatedt,createdt) as updatedt, "
        . " gp.plotid, gp.type as plottype, gp.options as plotoptions, legendorder, pc.objtype as comptype, objid, "
        . " pc.options as componentoptions, pc.comporder, intervalcount, g.type, annotations "
        . " from graphs g, graphplots gp, plotcomponents pc left outer join series s on pc.objid=s.seriesid  "
        . " where g.graphid=gp.graphid and gp.plotid=pc.plotid ";
    if(strlen($ghash)>0){
        $sql .=  " and ghash=".safeStringSQL($ghash);
    }
    if(intval($userid)>0){
        requiresLogin();
        $sql .= " and g.userid=" . intval($userid);  //used by GetMyGraphs
    } else {
        $sql .= " and g.published='Y'"; //used by GetPublicGraph
    }
    $sql .= " order by gid, plottype, legendorder, comporder";

    logEvent("GetGraphs subfunc", $sql);
    $result = runQuery($sql);
    if($result->num_rows==0){
        die('{"status":"no graphs."}');
    }
    $output = array("status"=>"ok","graphs" => array());
    $gid = 0;
    $plotid = 0;
    while ($aRow = $result->fetch_assoc()){
        if($gid != $aRow['gid']){ //avoid repeats due to the joined SQL recordset
            $gid = $aRow['gid'];
            $output['graphs']['G' . $gid] = array(
                "gid" =>  $aRow["gid"],
                "userid" =>  $aRow["userid"],
                "title" =>  $aRow["title"],
                "analysis" =>  $aRow["analysis"],
                "serieslist" =>  $aRow["serieslist"],
                "ghash" =>  $aRow["ghash"],
                "start" =>  $aRow["fromdt"],
                "end" =>  $aRow["todt"],
                "type" =>  $aRow["type"],
                "published" =>  $aRow["published"],
                "views" =>  $aRow["views"],
                "updatedt" =>  $aRow["updatedt"],
                "annotations" =>  $aRow["annotations"],
                "intervals" => $aRow["intervalcount"]
            );
            //if($aRow["map"]!=null){
                $output['graphs']['G' . $gid]["map"] = $aRow["map"];
                $output['graphs']['G' . $gid]["mapconfig"] = $aRow["mapconfig"];
            //}
        }
        //each record represents a new graph.plots.components object which are handle differently depending on whether it is a Line, Mapset or Pointset
        switch($aRow['plottype']){  //note: a region plot may have series in its calculation and therefore components ->  plottype <> objtype!
            case 'T':   //timeseries plot
                if($plotid!=$aRow['plotid']){ //avoid repeats due to the joined SQL recordset
                    $plotid =  $aRow['plotid'];
                    if(!isset($output['graphs']['G' . $gid]["plots"])){$output['graphs']['G' . $gid]["plots"]=array();}

                    array_push($output['graphs']['G' . $gid]["plots"], array(
                        "handle"=>"P".$plotid,
                        //"name" =>   $aRow["plotname"],
                        "options"=> $aRow["plotoptions"],
                        "components" => array()
                    ));
                }
                $thisPlotIndex = count($output['graphs']['G' . $gid]["plots"]) - 1;
                array_push($output['graphs']['G' . $gid]["plots"][$thisPlotIndex]["components"], array(
                        "handle"=> $aRow["comptype"].$aRow["objid"],
                        //"op"=> $aRow["op"],
                        //"k" => $aRow["k"],
                        "options"=> $aRow["componentoptions"]
                    )
                );
                break;
            case 'M':  //regions plot (map set)
                if($plotid!=$aRow['plotid']){
                    $plotid =  $aRow['plotid'];
                    $output['graphs']['G' . $gid]["mapsets"] = array(
                        "handle"=>"P".$plotid,
//                        "name" =>   $aRow["plotname"],
                        "options"=> $aRow["plotoptions"],
                        "components" => array()
                    );
                }
                array_push($output['graphs']['G' . $gid]["mapsets"]["components"], array(
                    "handle"=> $aRow["comptype"].$aRow["objid"],
//                    "op"=> $aRow["op"],
//                    "k" => $aRow["k"],
                    "options"=> $aRow["componentoptions"]
                    )
                );
                break;
            case 'X':  //marker plot (point set)
                 if($plotid!=$aRow['plotid']){
                     $plotid =  $aRow['plotid'];
                     if(!isset($output['graphs']['G' . $gid]["pointsets"])){$output['graphs']['G' . $gid]["pointsets"]=array();}

                     array_push($output['graphs']['G' . $gid]["pointsets"], array(
                         "handle"=>"P".$plotid,
//                         "name" =>   $aRow["plotname"],
                         "options"=> $aRow["plotoptions"],
                         "components" => array()
                     ));
                 }
                 $thisSetIndex = count($output['graphs']['G' . $gid]["pointsets"])-1;
                 array_push($output['graphs']['G' . $gid]["pointsets"][$thisSetIndex]["components"], array(
                         "handle"=> $aRow["comptype"].$aRow["objid"],
//                         "op"=> $aRow["op"],
//                         "k" => $aRow["k"],
                         "options"=> $aRow["componentoptions"]
                     )
                 );
                break;
            default:
                return(array("status"=>"unknown plot type"));
        }

        //each may create a new series asset. Repeated assets simply get overwritten and output only once.
        if(strlen($ghash)>0){
            $output['graphs']['G' . $gid]["assets"] = array();
            if($aRow["comptype"]=='S'||$aRow["comptype"]=='U'){
                $output['graphs']['G' . $gid]["assets"][$aRow["comptype"].$aRow["objid"]] = array(
                    "handle"=>$aRow["comptype"].$aRow["objid"],
                    "name"=>$aRow["name"],
                    "units"=>$aRow["units"],
                    "firstdt"=> $aRow["firstdt"],
                    "lastdt"=> $aRow["lastdt"],
                    "period"=> $aRow["periodicity"],
                    "data" => $aRow["data"]
                );
                if($aRow["comptype"]=='S'){
                    $output['graphs']['G' . $gid]["assets"][$aRow["comptype"].$aRow["objid"]]["sid"] = $aRow["objid"];
                }  else {
                    $output['graphs']['G' . $gid]["assets"][$aRow["comptype"].$aRow["objid"]]["usid"] = $aRow["objid"];
                }
            } elseif($aRow["comptype"]=='M'){
            //map assets created separately
                $output['graphs']['G' . $gid]["assets"][$aRow["comptype"].$aRow["objid"]] = getMapSets($aRow["map"] ,array($aRow["objid"]));
            } elseif($aRow["comptype"]=='X'){
                $output['graphs']['G' . $gid]["assets"][$aRow["comptype"].$aRow["objid"]] = getPointSets($aRow["map"]  ,array($aRow["objid"]));
            }
        }
    }
    return $output;
}

function getMapSets($map,$aryMapsetIds, $mustBeOwner = false){   //"GetMapSet" command (from QuickViewToMap and getGraphMapSets()
    global $db, $orgid;
    $mapout = array();
    $sql = "SELECT ms.mapsetid, ms.name, s.name as seriesname, ms.units, ms.periodicity as period, "
    . " g.jvectormap as map_code, s.seriesid, s.userid, s.orgid, s.geoid, g.name as geoname, s.data, s.firstdt, s.lastdt "
    . " FROM mapsets ms, series s, geographies g, mapgeographies mg, maps m "
    . " WHERE ms.mapsetid = s.mapsetid and s.mapsetid in (" . implode($aryMapsetIds, ",") . ")"
    . " and m.map  = " . safeStringSQL($map)
    . " and g.geoid=s.geoid and mg.geoid=s.geoid and mg.map=" . safeStringSQL($map)
    . " and mg.map=m.map "
    . " and ms.mapsetid in (" . implode($aryMapsetIds, ",") . ")  ";
    if($mustBeOwner){
        $sql .= " and (s.userid is null or s.userid= " . intval($_POST["uid"]) . " or orgid=" . $orgid . ")"; //assumes requiresLogin already run
    }
    $sql .= " ORDER by mapsetid";
    $result = runQuery($sql);
    $currentMapSetId = 0;
    while($row = $result->fetch_assoc()){
        if($currentMapSetId!=$row["mapsetid"]){ //new mapset = need header
            $currentMapSetId=$row["mapsetid"];
            $mapout["M".$currentMapSetId] = array(
                "mapsetid"=>$currentMapSetId,
                "name"=>$row["name"],
                "units"=>$row["units"],
                "period"=>$row["period"],
                "data"=>array()
            );
        }
        $mapout["M".$currentMapSetId]["data"][$row["map_code"]] = array(
            "handle"=>"S".$row["seriesid"],
            "geoid"=>$row["geoid"],
            "geoname"=>$row["geoname"],
            "name"=>$row["seriesname"],
            "data"=>$row["data"],
            "firstdt"=>$row["firstdt"],
            "lastdt"=>$row["lastdt"]
        );
    }
    for($i=0;$i<count($aryMapsetIds);$i++){$mapout["M".$aryMapsetIds[$i]]["order"]=$i+1;}
    return $mapout;
}


function getPointSets($map,$aryPointsetIds, $mustBeOwner = false){
    global $db, $orgid;
    $mapout = array();
    $sql = "select ps.pointsetid, ps.name, ps.units, ps.periodicity as period, "
        . " g.jvectormap as map_code, s.seriesid, s.userid, s.orgid, s.geoid, s.lat, s.lon, s.name as seriesname, s.data, s.firstdt, s.lastdt "
        . " from pointsets ps, series s, geographies g, mapgeographies mg, maps m "
        . " where ps.pointsetid = s.pointsetid and s.pointsetid in (" . implode($aryPointsetIds, ",") . ")"
        . " and m.map  = " . safeStringSQL($map)
        . " and g.geoid=s.geoid and mg.geoid=s.geoid and mg.map =" . safeStringSQL($map)
        . " and mg.map=m.map "
        . " and ps.pointsetid in (" . implode($aryPointsetIds, ",") . ")";
    if($mustBeOwner){
        $sql .= " and (userid is null or userid= " . intval($_POST["uid"]) . " or orgid=" . $orgid . ")"; //assumes requiresLogin already run
    }
    $sql .= " order by pointsetid";
    $result = runQuery($sql);
    $currentPointSetId = 0;
    while($row = $result->fetch_assoc()){
        if($currentPointSetId!=$row["pointsetid"]){ //new mapset = need header
            $currentPointSetId=$row["pointsetid"];
            $mapout["X".$currentPointSetId] = array(
                "handle"=>"X".$currentPointSetId,
                "name"=>$row["name"],
                "units"=>$row["units"],
                "period"=>$row["period"],
                "data"=>array()
            );
        }
        $mapout["X".$currentPointSetId]["coordinates"]["S".$row["seriesid"]] = array("latLng"=>array($row["lat"], $row["lon"]));
        $mapout["X".$currentPointSetId]["data"]["S".$row["seriesid"]] = array(
            "handle"=>"S".$row["seriesid"],
            "name"=>$row["seriesname"],
            "data"=>$row["data"],
            "firstdt"=>$row["firstdt"],
            "lastdt"=>$row["lastdt"]
        );
    }
    return $mapout;
}


function getGraphMapSets($gid, $map){
    $mapsets = array();
    $mapsetids = array();
    $sql="select * from graphmapsets where graphid=".$gid . " order by comporder";
    $result=runQuery($sql);
    if($result->num_rows==0) return false;
    while($row = $result->fetch_assoc()){
        $mapsets["M".$row["mapsetid"]] = array(
            "order" => $row["comporder"],
            "k" => $row["k"],
            "op" => $row["op"],
            "options" => $row["options"]
        );
        array_push($mapsetids,$row["mapsetid"]);
    }
    $mapsetdata = getMapSets($map, $mapsetids); //get the data only
    foreach($mapsets as $mhandle => $header){ //add in the graph specific configuration info
        if(isset($mapsetdata[$mhandle])){
            $mapsetdata[$mhandle]["order"]=$header["order"];
            $mapsetdata[$mhandle]["op"]=$header["op"];
            $mapsetdata[$mhandle]["k"]=$header["k"];
            $mapsetdata[$mhandle]["option"]=$header["option"];
        }
    }
    return $mapsetdata;
}
