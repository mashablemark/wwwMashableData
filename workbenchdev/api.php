<?php
$event_logging = true;
$sql_logging = true;
$ft_join_char = "_";
$web_root = "/var/www/vhosts/mashabledata.com/httpdocs";
$cache_TTL = 60; //public_graph and cube cache TTL in minutes
include_once($web_root . "/global/php/common_functions.php");
date_default_timezone_set('UTC');
header('Content-type: text/html; charset=utf-8');
//$usageTracking = trackUsage("count_datadown");
/* This is the sole API for the MashableData Workbench application connecting
 * the client application to the cloud.  All returns are JSON objects. Supports the following commands:
 *
 *
exclusive Graph commands:
	GetSet: Graph.fetchAssets()
	ChangeMaps:  Graph.changeMap()
	ManageMyGraphs: Graph.save()
exclusive Set command:
    GetMashableData: Set.
GetSeries:  workbench.preview
GetCubeList	:  workbench.quickViewToMap
workbench data editing:
GetAvailableMaps:  workbench.editSeries
GetSet:  workbench.showSeriesEditor
GetPointSets:  workbench.showSeriesEditor
GetMashableData:  workbench.seriesEditor, Set.fetchData()
GetMapGeographies:  workbench.configureUserSet
SaveUserSeries:  workbench.saveSeriesEditor
UploadMyMashableData:  workbench.loadMySeriesByKey, workbench.syncMyAccount
browse by category:
GetCatChains:  workbench.browseFromSeries
GetCatSiblings:  workbench.showSiblingCats
GetCatChildren:  workbench.showChildCats
GetMyGraphs:  workbench.syncMyAccount
GetMySets:  workbench.getMySets
UNTESTED:
ManageMySeries:  workbench.updateMySeries
 *
 * command: SearchSeries  (anonymous permitted)
 *   search
 *   freq
 * command: SearchGraphs  (anonymous permitted)
 *   search
 *
 * command: GetFullGraph     (anonymous permitted)
 *   g: hash of public graph requested, returning graph object with complete series objects
 *
 * command: GetApis     (anonymous permitted)
 *   returning array of API names and ids
 *
 * command: GetMyGraphs
 *   uid
 * command: GetMySets
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
 * command: GetSeries -> the entire mashabledata as object, with points as string property "data"
 *   sid:  either series id (sid) or capture id (cid) must be submitted
 *   cid:  cid takes precedence
 * command: GetAnnotations    (anonymous permitted for standard only)
 *   type: M|S (my or standard
 * command: GetAnnotation     (anonymous permitted)
 *   annoid:
*/
$time_start = microtime(true);
$command =  isset($_REQUEST['command'])?$_REQUEST['command']:'';
$con = getConnection();
switch($command){
    case "LogError":
        logEvent("javascript error", safeStringSQL(json_encode($_POST)));
        /*                        browser: browser,
                                url: window.location.href,
                                message: err.message,
                                stack: err.stack,
                                uid: account.info.userId,
                                lang: navigator.language,
                                platform: navigator.platform,
                                version: mashableVersion*/
        $output = array("status"=>"logged");
        break;
    case "NewSearchSeries":
        if(isset($_POST["uid"])  && intval($_POST["uid"])>0 && $_POST["uid"]!=null){
            $usageTracking = trackUsage("count_seriessearch");
        }
        $search =  rawurldecode($_POST['search']);
        $freq =  str_replace("'", "''", $_POST['freq']);
        $mapFilter =  str_replace("'", "''", $_POST['mapfilter']);
        $apiid =  $_POST['apiid'];
        $catid =  intVal($_POST['catid']);
        $setType =  $_POST['settype'];
        if(count($search) == 0 || count($freq)== 0) die("invalid call.  Err 101");
        $sLimit = " ";
        $foundGeos = [];
        if ( isset( $_POST['iDisplayStart'] ) && $_POST['iDisplayLength'] != '-1' ) {
            $sLimit = " LIMIT ".$db->real_escape_string( $_POST['iDisplayStart'] ).", "
                . $db->real_escape_string( $_POST['iDisplayLength'] );
        }
        $aColumns=array("name", "units", "firstdt", "lastdt");
        //$sql = "SELECT SQL_CALC_FOUND_ROWS ifnull(concat('U',s.userid), concat('S',s.setid)) as handle , s.setid, s.userid, mapsetid, pointsetid, name, units, freq as freq, title, src, url, ";
        $sql = "SELECT SQL_CALC_FOUND_ROWS
        s.settype, s.setid, s.latlon, s.mastersetid, s.userid, s.name, s.units, replace(s.freqs,'F_','') as freqs,
        s.titles, coalesce(s.src, a.name) as src, coalesce(s.url, a.url) as url,
        s.firstsetdt100k*100000 as firstdt, s.lastsetdt100k* 100000 as lastdt, s.apiid, replace(coalesce(s2.maps, s.maps),'M_','') as maps, s.ghandles
        FROM sets s left outer join apis a on s.apiid=a.apiid left outer join sets s2 on s.mastersetid=s2.setid ";
        //problem: the url may be stored at the setdata level = too costly to join on every search THEREFORE  move URL link to quick view
        //handle may be modified in read loop depending on detected geographies and
        if($catid>0){
            //1. if category search, this is simple
            $sql .= " INNER JOIN categorysets cs on s.setid = cs.setid WHERE catid=$catid";
        } else {
            //2. look for geo matching and search sets if
            if($search!='+ +') {
                $geoSearch = str_replace("+", "", $search);
                $geoSQL = "select geoid, name, keywords, confirmwords, exceptex,
                    match(keywords) against ('$geoSearch' IN BOOLEAN MODE) as keyrel,
                    match(confirmwords) against ('$geoSearch' IN BOOLEAN MODE) as confirmrel
                    from geographies
                    where match(keywords) against ('$geoSearch' IN BOOLEAN MODE)
                    order by match(keywords) against ('$geoSearch' IN BOOLEAN MODE) desc, match(confirmwords) against ('$geoSearch' IN BOOLEAN MODE) desc";
                $result = runQuery($geoSQL);
                $keyRel = null;
                $confirmRel = null;
                //$searchWords = explode(" ", preg_replace("#\s{2,}#"," ", preg_replace("#[^\D\d-]#"," ",$geoSearch)));
                while ($aRow = $result->fetch_assoc()){
                    if($keyRel===null){
                        $keyRel = $aRow["keyrel"];
                        $confirmRel = $aRow["confirmrel"];
                    } elseif($keyRel != $aRow["keyrel"] || $confirmRel != $aRow["confirmrel"]){
                        break;
                    }
                    //2. top matching geo(s)
                    $geoWords =  explode(" ", preg_replace("#[;,:-]#"," ",strtolower($aRow["name"]." ".$aRow["keywords"]." ".$aRow["confirmwords"])));
                    $searchWords = $search." ";
                    foreach($geoWords as $geoWord){
                        $searchWords = str_replace("+".$geoWord." ", " ", $searchWords);
                    }
                    $foundGeos["G_".$aRow["geoid"]] = [
                        "seachWords"=>$searchWords,
                        "name"=>$aRow["name"]
                    ];
                }
            }
            //SEARCH AND FILTER SECTION
            $sql = $sql . " WHERE 1 ";
            //2. search for sets with matching geo or all
            if(strpos($search,'title:"')===0){ //ideally, use a regex like s.match(/(title|name|skey):"[^"]+"/i)
                $title = substr($search, strlen("title")+2,strlen($search)-strlen("title")-3);
                $sql .= " AND title = " . safeStringSQL($title);
            } elseif($search!='+ +' || $mapFilter<>"none" || $freq != "all") {
                $periodTerm = $freq == "all"?"":" +F_".$freq;
                $mapTerm = $mapFilter == "none"?"":" +M_".$mapFilter;
                $mainBooleanSearch = "($search $periodTerm $mapTerm)";
                foreach($foundGeos as $ghandle => $geoSearchDetails){
                    $geoSearchWords  = $geoSearchDetails["seachWords"];
                    $mainBooleanSearch .= " ($geoSearchWords $periodTerm $mapTerm +$ghandle)"; //OR implied
                }
                $sql .= " AND match(s.name, s.units, s.titles, s.ghandles, s.maps, s.settype, s.freqs) against ('$mainBooleanSearch' IN BOOLEAN MODE) ";  //straight search with all keywords
            }
            if(is_numeric($apiid)) {
                $sql .= " AND s.apiid = " . intval($apiid);
            } elseif ($apiid == "org") { //for security, the orgid is not passed in.  rather, if it is fetched from the users account
                requiresLogin(); //sets $orgid.  Dies if not logged in
                $sql .= " AND orgid = " . $orgid;
            } else {  //open search = must filter out orgs series that are not my org
                if(isset($_POST["uid"]) && intval($_POST["uid"])>0){
                    requiresLogin(); //sets $orgid.  Dies if not logged in, but we should be because a uid was passed in
                    $sql .= " AND (s.orgid is null or s.orgid = " . $orgid . ") ";
                } else {
                    $sql .= " AND s.orgid is null ";
                }
            }
        }
        //type of set detection = done by additional field
        $mapsSearch = isset($_POST['map']) && strlen($_POST['map'])>0 ? "+".$_POST['map'] : "";
        if($setType!="all") $mapsSearch .= " +".$setType;  //setType = S|MS|XS
        if($mapsSearch){
            $sql = $sql . " AND match(s.maps, s.settype) against('$mapsSearch' IN BOOLEAN MODE)";
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
                if ( $_POST[ 'bSortable_'.intval($_POST['iSortCol_'.$i]) ] == "true")
                {
                    $sOrder .= $aColumns[ intval( $_POST['iSortCol_'.$i] ) ]." s.".$db->real_escape_string( $_POST['sSortDir_'.$i] ) .", ";
                }
            }
            $sOrder = substr_replace($sOrder, "", -2 );
            if(strlen($search)>0 && $sOrder == " ORDER BY") {  // show shortest results first, but only if the user actually entered keywords
                $sOrder = " ORDER BY s.namelen asc ";
            }
        }
        if($search!='+ +' && $sOrder == "") {  // show shortest results first, but only if the user actually entered keywords
            if($catid==0){
                $sOrder = " ORDER BY s.namelen asc ";
            } else {
                $sOrder = " ORDER BY s.name asc ";
            }
        }
        $sql = $sql . $sOrder . $sLimit;
        $result = runQuery($sql, "SearchSeries");
        /* Data set length after filtering */
        $sQuery = "
            SELECT FOUND_ROWS()
        ";
        $rResultFilterTotal = runQuery( $sQuery) or die($db->error());
        $aResultFilterTotal = $rResultFilterTotal->fetch_array();
        $iFilteredTotal = $aResultFilterTotal[0];
        /* Total data set length */
        /* $sQuery = "SELECT COUNT(setid)FROM series";
         $rResultTotal = runQuery( $sQuery ) or die($db->error());
         $aResultTotal = $rResultTotal->fetch_array();
         $iTotal = $aResultTotal[0];*/
        $iTotal = 10000000;  // no need to run the count everytime as the workbench does not display it
        $output = array("status"=>"ok",
            "sEcho" => intval($_POST['sEcho']),
            "iTotalRecords" => $iTotal,
            "iTotalDisplayRecords" => $iFilteredTotal,
            "search"=>$search,
            "aaData" => array()
        );
        if(isset($usageTracking["msg"])) $output["msg"] = $usageTracking["msg"];
        $aRows = [];
        $searchWords = trim(str_replace("+", "", $search));
        $searchWords = count($searchWords)==0 ? false: explode(" ", $searchWords);
        $geoSearched = count($foundGeos)>0;
        while ($aRow = $result->fetch_assoc()) { //handle, setid, mastersetid, userid, name, units, freq, title, src, url, firstdt, lastdt, apiid, maps, ghandles
            $found = false;
            if($geoSearched) {
                //two pass output if geosearched = check for straight set match followed by check for ghandle match
                $aRows[] = $aRow;
                $straightMatch = true;
                $textFields = $aRow["name"]." ".$aRow["units"]." ".$aRow["titles"];
                foreach($searchWords as $searchWord){
                    if(stripos($textFields, $searchWord)===false){
                        $straightMatch = false;
                        break;
                    }
                }
                if($straightMatch == true){
                    unset($aRow["ghandles"]);
                    $output['aaData'][] = $aRow;
                }
            } else {
                unset($aRow["ghandles"]);
                $output['aaData'][] = $aRow;
            }
        }
        if($geoSearched){
            foreach($aRows as $aRow){
                foreach($foundGeos as $ghandle => $geoSearchDetails){
                    if(strpos($aRow["ghandles"].",", "$ghandle,")!==false){
                        $thisRow = $aRow; //copy
                        unset($thisRow["ghandles"]);
                        $thisRow["name"] .= ": ".$geoSearchDetails["name"];
                        $thisRow["geoid"] =  intval(str_replace("G_", "", $ghandle));
                        //series object creates its own handle   $thisRow["handle"] = "S" . $thisRow["setid"] . str_replace("_","", $ghandle);
                        $output['aaData'][] = $thisRow;
                        $found = true;
                    }
                }
            }
        }
        break;
    case "SearchGraphs":
        $usageTracking = trackUsage("count_graphssearch");
        if(!$usageTracking["approved"]){
            $output = array("status"=>$usageTracking["msg"]);
            break;
        }
        $search =  $_POST['search'];
        //$freq =  $_POST['freq'];
        //$user_id =  intval($_POST['uid']);
        if(count($search) == 0) die("invalid call.  Err 106");
        $sLimit = " ";
        if ( isset( $_POST['iDisplayStart'] ) && $_POST['iDisplayLength'] != '-1' ) {
            $sLimit = " LIMIT ".$db->real_escape_string( $_POST['iDisplayStart'] ).", "
                . $db->real_escape_string( $_POST['iDisplayLength'] );
        }
        $aColumns=array("g.title", "g.map", "g.text", "g.serieslist", "views", "ifnull(g.updatedt , g.createdt)");
        $sql = "SELECT g.graphid, g.title, map, text as analysis, g.cubeid, serieslist, ghash, views, "
            //not used and cause problems for empty results = row of nulls returned. "  ifnull(g.fromdt, min(s.firstdt)) as fromdt, ifnull(g.todt ,max(s.lastdt)) as todt, "
            . " ifnull(updatedt, createdt) as modified "
            . ", mapsets, pointsets "
            . " FROM graphs g "
            . " left outer join (select graphid, count(type) as mapsets from graphplots where  type='M' group by graphid) gpm on g.graphid=gpm.graphid "
            . " left outer join (select graphid, count(type) as pointsets from graphplots where type='X' group by graphid) gpx on g.graphid=gpx.graphid "
            . " WHERE published='Y' ";
        if($search!='+ +'){
            $sql .= "   and  match(g.title, g.text, g.serieslist, g.map) against ('" . $search . "' IN BOOLEAN MODE) ";
        }
        $sql .= " group by graphid, g.title, g.map, g.text, g.serieslist, ghash, views, ifnull(g.updatedt , g.createdt) ";
        /*        if($freq != "all") {
                    $sql = $sql . " and freq='" . $freq . "'";
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
        $result = runQuery($sql, "SearchGraphs");
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
    case "GetMyGraphs":   //get only skeleton.  To view graph, will require call to GetGraph
        requiresLogin();
        $user_id =  intval($_POST['uid']);
        $sql = "SELECT g.graphid as gid, g.userid, g.title, g.text as analysis,
          g.map, g.mapconfig,  g.cubeid,  g.serieslist, g.intervalcount, g.type,
          g.ghash,  g.fromdt, g.todt,  g.published, g.views, ifnull(g.updatedt, g.createdt) as updatedt,
          group_concat(gp.plottype) as plottypes
        FROM graphs g INNER JOIN graphplots gp ON g.graphid=gp.graphid
        WHERE userid=$user_id
        GROUP BY g.graphid, g.userid, g.title, g.text,
          g.map, g.mapconfig,  g.cubeid,  g.serieslist, g.intervalcount, g.type,
          g.ghash,  g.fromdt, g.todt,  g.published, g.views, ifnull(g.updatedt, g.createdt)
        ORDER BY updatedt desc, title";
        $result = runQuery($sql, "GetMyGraphs select");
        $output = ["status"=>"ok","graphs" => []];
        while ($aRow = $result->fetch_assoc()) $output["graphs"]["G".$aRow["gid"]] = $aRow;
        break;
    case "GetFullGraph":  //data and all: the complete protein!
        $ghash =  $_REQUEST['ghash'];
        if(strlen($ghash)>0){
            //1. fetch
            $output = getGraphs(0, $ghash);
            //2. check credential
            if(isset($_POST["uid"]) && isset($output['userid']) && $output['userid'] == intval(safePostVar("uid"))){
                requiresLogin();  //login not required, but if claiming to be the author then verify the token
            } else {
                $output['userid'] = null;  //cannot save graph; only save as a copy
            }
        } else {
            $output = array("status"=>"The graph requested not available.  The author may have unpublished or deleted it.");
        }
        break;
    case "GetEmbeddedGraph":  //data and all: the complete protein!
        $ghash =  $_REQUEST['ghash'];
        if(strlen($ghash)>0){
            $ghash_var = safeStringSQL($ghash);
            $currentmt = microtime(true);
            //1. check cache
            $sql = "select createmtime, coalesce(refreshmtime, createmtime) as lastrefreshtime, graphjson from graphcache where ghash=$ghash_var";
            $result = runQuery($sql);
            if($result->num_rows==1){
                $row = $result->fetch_assoc();
                $age = $currentmt-$row['createmtime'];
                if($age<$cache_TTL*60*1000 && ($row['lastrefreshtime']==null || $currentmt-$row['lastrefreshtime']<60*1000)){ //TTL = 15 minutes, with a 60 second refresh lock
                    //cache good! (or another refresh in progress...)
                    $graph_json = (string) $row["graphjson"];
                    $output = json_decode($graph_json, true, 512, JSON_HEX_QUOT);
                    //$output = ["json"=>$graph_json];
                    $output["cache_age"] =  $age / 1000 . "s";
                } else {
                    //cache needs refreshing
                    runQuery("update graphcache set lastrefreshtime = $currentmt where ghash=$ghash_var");
                }
            }
            if(!isset($output)){
                //2. fetch if not in cache or needs refreshing
                $output = getGraphs(0, $ghash);
                //trim data based on graph end, start and interval dates using dataSliver()
                foreach($output["graphs"] as $ghandle => $graph){
                    foreach($graph["assets"] as $ahandle => $asset){
                        unset($output["graphs"][$ghandle]["assets"][$ahandle]["maps"]);
                        if($graph["start"] || $graph["end"] || $graph["intervals"]){
                            $atype = (substr($ahandle, 0, 1));
                            switch($atype){
                                case "M":
                                    foreach($asset["data"] as $geo => $series){
                                        $output["graphs"][$ghandle]["assets"][$ahandle]["data"][$geo]["data"] = dataSliver($series["data"], $asset["freq"], $series["firstdt"], $series["lastdt"], $graph["start"], $graph["end"], $graph["intervals"]);
                                        /*                                        $output["freq"]= $asset["freq"];
                                                                                $output["firstdt"]=$series["firstdt"];
                                                                                $output["lastdt"]=$series["lastdt"];
                                                                                $output["start"]=$graph["start"];
                                                                                $output["end"]=$graph["end"];
                                                                                $output["intervals"]=$graph["intervals"];
                                                                                $output["sliver"] = $series["data"];*/
                                    }
                                    break;
                                case "U":
                                case "S":
                                    $asset["data"] = dataSliver($asset["data"], $asset["freq"], $asset["firstdt"], $asset["lastdt"], $graph["start"], $graph["end"], $graph["intervals"]);
                                    break;
                                case "X":
                                    foreach($asset["data"] as $latlon => $series){
                                        $series["data"] = dataSliver($series["data"], $asset["freq"], $series["firstdt"], $series["lastdt"], $graph["start"], $graph["end"], $graph["intervals"]);
                                    }
                                    break;
                            }
                        }
                    }
                }
                //3. insert or update cache
                $global_sql_logging = $sql_logging;  //don't log these massive inserts
                $sql_logging = false;
                $cache_var = safeStringSQL(json_encode($output, JSON_HEX_QUOT));
                $sql = "insert into graphcache (ghash, createmtime, graphjson) values ($ghash_var, $currentmt, $cache_var)";
                //two steps instead of 'on duplicate key' to void submitting massive json string twice in one SQL statement
                runQuery("delete from graphcache where ghash=$ghash_var");
                runQuery($sql);
                $sql_logging = $global_sql_logging;
            }
            //4. log embedded usage
            //if(isset($_REQUEST["host"]) && strpos($_REQUEST["host"],"mashabledata.com")===false){
            if(isset($_REQUEST["host"])){
                $host = safeStringSQL(trim(strtolower($_REQUEST["host"])));
                $sql = "
                    insert into embedlog (host, obj, objfetches) values ($host, $ghash_var, 1)
                    on duplicate key
                    update embedlog set objfetches=objfetches+1 where host=$host and obj=$ghash_var
                ";
                runQuery($sql);
            }
            //5. carry on...
            if(isset($_POST["uid"]) && isset($output['userid']) && $output['userid'] == intval(safePostVar("uid"))){
                requiresLogin();  //login not required, but if claiming to be the author then verify the token
            } else {
                $output['userid'] = null;  //cannot save graph; only save as a copy
            }
        } else {
            $output = array("status"=>"The graph requested not available.  The author may have unpublished or deleted it.");
        }
        break;
    /*    case "GetGraphMapSet":
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
            break;*/
    case "GetSets": //used by Graph.fetchAssets() only get all types of asset in a single call (no ambiguous sets; for that use GetSeries)
        $output = ["status"=>"ok", "assets"=>[]];
        if($series = (isset($_POST["series"]) && count($_POST["series"])>0) ? $_POST["series"] : false){
            $sql = "select s.metadata as setmetadata, s.name, sd.setid, sd.geoid, sd.freq, s.freqs, sd.latlon, s.maps, g.name as geoname
            from sets s join setdata on s.setid=sd.setid left outer join geographies on sd.geoid=g.geoid where ";
            $filters = [];
            foreach($series as $serie){
                $filter = "(s.setid= $serie[setid] and sd.freq=$serie[freq]";
                if(isset($serie["geoid"])) $filter .= " and sd.geoid=$serie[geoid]";
                if(isset($serie["latlon"])) $filter .= " and sd.latlon=$serie[latlon]";
                elseif(!isset($serie["geoid"])) $filter .= " and sd.geoid=0"; //cannot havea  series without a defining geo or latlon
                $filter .= ")";
                $filters[] = $filter;
            }
            $sql .= implode(" OR ", $filters);
            $result  = runQuery($sql, "GetSets: series");
            while($row=$result->fetch_assoc()){
                $handle = $row["type"].$row["setid"].$row["freq"]."G".$row["setid"].($row["latlon"]?"L".$row["latlon"]:"");
                $output["assets"][$handle] = $row;
            }
        }
        if($map = isset($_POST["map"]) ? $_POST["map"] : false){
            $output["map"] = $map;
            if($mapSets = (isset($_POST["mapSets"]) && count($_POST["mapSets"])>0) ? $_POST["mapSets"] : false){
                getMapSets($output["assets"], $map, $mapSets, true);
            }
            if($pointSets = (isset($_POST["pointSets"]) && count($_POST["pointSets"])>0) ? $_POST["pointSets"] : false){
                getPointSets($output["assets"], $map, $pointSets, true);
            }
        }
        break;
    /*   case "GetPointSets": //workbench.showSeriesEditor() only
           $usageTracking = trackUsage("count_graphsave");
           $map = $_POST["map"];
           $output = array("status"=>"ok", "map"=>$map, "pointsets"=>getMarkerSets($map, cleanIdArray($_POST["pointsetids"]), true));
           break;
       case "GetSet":  //called only in workbench.showSeriesEditor()
           $mapsetid = intval($_POST["mapsetid"]);
           $sqlHeader = "select * from mapsets where mapsetid = ".$mapsetid;
           $sqlSetSeries = "select g.geoid, g.name as geoname, g.iso3166, concat(if(isnull(s.userid),'S','U'), setid) as handle, setid, s.name, s.units, s.userid, s.units_abbrev, title, data, notes"
               . " from mapgeographies mg join geographies g on mg.geoid=g.geoid "
               . " left outer join (select * from series s where mapsetid=".$mapsetid." and pointsetid is null) s on g.geoid=s.geoid "
               . " where mg.map = ".safeSQLFromPost("map")." order by s.mapsetid desc";
           $headerResult = runQuery($sqlHeader,"GetSet: header");
           $setResult = runQuery($sqlSetSeries,"GetSet: series");
           $output = array("status"=>"ok");
           try{
               $output["setData"] = $headerResult->fetch_assoc();
               $output["setData"]["geographies"] = array();
               while($row=$setResult->fetch_assoc()){
                   array_push($output["setData"]["geographies"], $row);
               }
           } catch(Exception $e){
               $output["status"] = "failed to get set for editing";
           }
           break;*/
    case "GetAvailableMaps":
        $mapsetid = intval($_POST["mapsetid"]);
        $pointsetid = intval($_POST["pointsetid"]);
        if(isset($_POST["geoid"])){
            $geoid = intval($_POST["geoid"]);
        } else {
            $geoid = 0;
        }
        $sql = "select m.name, jvectormap, geographycount, count(s.geoid) as setcount "
            . " from series s, maps m, mapgeographies mg "
            . " where m.map=mg.map and mg.geoid=s.geoid";
        if($mapsetid>0) $sql .= " and s.mapsetid=".$mapsetid." and s.pointsetid is null";
        if($pointsetid>0) $sql .= " and s.pointsetid=".$pointsetid." and s.mapsetid is null";
        if($geoid>0) $sql .= " and m.map in (select map from mapgeographies where geoid = " . $geoid . ")";
        $sql .= " group by m.name, geographycount ";
        if($pointsetid>0&&$geoid>0) {
            $sql .= " union select m.name, jvectormap, geographycount, count(s.geoid) as setcount  from series s, maps m where bunny=s.geoid and s.pointsetid=".$pointsetid." and s.geoid = ".$geoid;
        } else {
            $sql .= " order by count(s.geoid)/geographycount desc";
        }
        $output = array("status"=>"ok", "maps"=>array());
        $result = runQuery($sql,"GetAvailableMaps");
        while($row = $result->fetch_assoc()){
            array_push($output["maps"], array("name"=>$row["name"], "file"=>$row["jvectormap"], "count"=>($mapsetid!=0)?$row["setcount"]." of ".$row["geographycount"]:$row["setcount"]." locations"));
        }
        break;
    case 'GetMapsList':
        /*    to add new maps found on http://jvectormap.com/:
            1.  in the console, run: $.each($('div.panes .jvectormap:nth(0)').vectorMap('get', 'mapObject').mapData.paths, function(key,value){console.info("insert into geographies (geoset, name, jvectormap) values('regions','"+value.name+"','"+key+"');")})
            2. after inserting these records:
                insert into maps
                (SELECT name,  name, geographycount, geoid, concat(lower(ccode),'_mill_en'), 'BR'
                from `geographies` g1, (select count(*) as geographycount, left(jvectormap,2) ccode FROM `geographies` where jvectormap like '__-%' group by left(jvectormap,2)) g2
                where ccode = jvectormap and ccode = 'XX')
            3. insert into mapgeographies (SELECT  geoid, map from geographies g, maps m where g.jvectormap like '__-%' and g.jvectormap not like 'US-%' and m.jvectormap like concat(left(g.jvectormap,2),'__%')  )
        */
        $sql = "select * from maps order by map";
        $result = runQuery($sql,"GetMapsList");
        $output = array("status"=>"ok", "maps"=>array());
        while($row = $result->fetch_assoc()){
            $row["name"] = utf8_encode($row["name"]);  //this is an unsatisfying bandaid, not a global solution
            $output["maps"][$row['map']]= $row;
        }
        break;
    case "GetMapGeographies":
        $sql = "select g.geoid, g.name, g.iso3166 from mapgeographies mg, geographies g where g.geoid=mg.geoid and map=".safeSQLFromPost('map')." order by g.name";
        $result = runQuery($sql,"GetMapGeographies");
        $output = array("status"=>"ok", "geographies"=>array());
        while($row = $result->fetch_assoc()){
            $row["name"] = utf8_encode($row["name"]);  //this is an unsatisfying bandaid, not a global solution
            array_push($output["geographies"], $row);
        }
        break;
    case "GetCubeList":
        if(!isset($_POST["themeids"]) || !isset($_POST["setids"])){
            $output = ["status"=>"must provide  valid set and theme id"];
            break;
        }
        $setids = implode(",", cleanIdArray($_POST["setids"]));
        $themeids = implode(",", cleanIdArray($_POST["themeids"]));
        $output = ["status"=>"ok", "cubes"=>[]];
        //totset cubes UNION sibling cubes
        $sql = "(select totsetid as setid, 'series breakdown' as relation, t.themeid, t.name as themename, c.cubeid, c.name, c.units
        from cubes c inner join themes t on t.themeid=c.themeid
        where c.totsetid in ($setids)
        order by themename, c.name, c.units)
        UNION ALL
        (select distinct setid, 'series context' as relation,  t.themeid, t.name as themename, c.cubeid, c.name, c.units
        from cubes c inner join themes t on t.themeid=c.themeid join cubecomponents cc on cc.cubeid=c.cubeid
        where cc.setid in ($setids)
        order by themename, c.name, c.units)
        UNION ALL
        (select distinct rootsetid, 'set information' as relation,  t.themeid, t.name as themename, c.cubeid, c.name, c.units
        from cubes c inner join themes t on t.rootsetid = c.totsetid
        where t.themeid in ($themeids)
        order by themename, c.name, c.units)
        ";
        $result = runQuery($sql,"GetCubeList root totals");
        while($row = $result->fetch_assoc()){
            $output["cubes"][] = ["name"=>$row["name"], "units"=>$row["units"],  "cubeid"=>$row["cubeid"], "type"=>$row["relation"]];  //organize by setid because they will be attached to components and available for graph level op
        }
        break;
    case "GetCubeSeries":
        if(!isset($_REQUEST["geokey"]) || !isset($_REQUEST["cubeid"])){
            $output = ["status"=>"invalid cube id or geography"];
        } else {
            $cubeid = intval($_REQUEST["cubeid"]);
            $geokey = $_REQUEST["geokey"];
            $freq = safeSQLFromPost("freq");
            //1. check cache
            $currentmt = microtime(true);
            $ghash_var = safeStringSQL($cubeid.":".$geokey);
            $sql = "select createmtime, coalesce(refreshmtime, createmtime) as lastrefreshtime, graphjson from graphcache where ghash=$ghash_var";
            $result = runQuery($sql);
            if($result->num_rows==1){
                $row = $result->fetch_assoc();
                $age = $currentmt-$row['createmtime'];
                if($age<$cache_TTL*60*1000 && ($row['lastrefreshtime']==null || $currentmt-$row['lastrefreshtime']<60*1000)){ //TTL = 15 minutes, with a 60 second refresh lock
                    //cache good! (or another refresh in progress...)
                    $cube_json = (string) $row["graphjson"];
                    $output = json_decode($cube_json, true, 512, JSON_HEX_QUOT);
                    $output["cache_age"] =  $age / 1000 . "s";
                } else {
                    //cache needs refreshing
                    runQuery("update graphcache set lastrefreshtime = $currentmt where ghash=$ghash_var");
                }
            }
            if(!isset($output)){
                //2. fetch if not in cache or needs refreshing
                $output = ["status"=>"ok", "cubeid"=>$cubeid, "geokey"=>$geokey];
                //todo:  check for latlon geokey and geoid geokey. For now, aussume jvectormap code
                if(is_numeric($geokey)){
                    $geoid = $geokey;
                } else {
                    $sql = "select geoid from geographies where jvectormap=".safeStringSQL($geokey)
                        ." order by geoid";  //HACK!!! France (76) ahead of metropolitan France (6255)
                    $result = runQuery($sql);
                    if($result->num_rows>0){  //FR has two:  return FRA (76) not metropolitan France (6255)
                        $row = $result->fetch_assoc();
                        $geoid = $row["geoid"];
                    } else {
                        $geoid = 0;
                    }
                }
                getCubeSeries($output, $cubeid, $geoid, $freq);
                //3. insert or update cache
                $global_sql_logging = $sql_logging;  //don't log these massive inserts
                $sql_logging = false;
                $cache_var = safeStringSQL(json_encode($output, JSON_HEX_QUOT));
                $sql = "insert into graphcache (ghash, createmtime, graphjson) values ($ghash_var, $currentmt, $cache_var)";
                //two steps instead of 'on duplicate key' to void submitting massive json string twice in one SQL statement
                runQuery("delete from graphcache where ghash=$ghash_var");
                runQuery($sql);
                $sql_logging = $global_sql_logging;
            }
            //4. log embedded usage
            if(isset($_REQUEST["host"]) && strpos($_REQUEST["host"],"mashabledata.com")===false){
                $host = safeStringSQL(trim(strtolower($_REQUEST["host"])));
                $ghash_var = safeSQLFromPost("ghash");
                $sql = "
                    update embedlog set cubefecthes = cubefecthes + 1 where host=$host and obj=$ghash_var
                ";
                runQuery($sql);
            }
        }
        break;
    case "ChangeMaps":
        /*        parameters:
                    "map": mapCode string,
                    "fromgeoid": int,
                    "togeoid":  int,
                    "sets" => [
                        "series" => [
                            handle1 => ["setid"=> int, "geoid"=> nowgeoid (different from handle) int, "freq"=> string ], ...
                        ],
                        "mapSets"=>[
                            handle3=> ["setid"=> int, "freq"=> char], ...
                        ],
                        "pointSets"=>[
                            handle4=> ["setid"=> int, "freq"=> char], ...
                        ]
                    ]*/
        $fromGeoId = intval($_POST["fromgeoid"]);
        $toGeoId = intval($_POST["togeoid"]);
        $sql = "select g1.regexes as regex, g2.name as replacement from geographies g1, geographies g2 "
            ." where g1.geoid=$fromGeoId and g2.geoid=$toGeoId";
        $result = runQuery($sql, "ChangeMaps: get bunny regex");
        $output = $result->fetch_assoc();
        $output["status"] = "ok";
        if(isset($_POST["sets"]["series"])){
            $output["bunnies"] = [];
            foreach($bunnies as $oldBunnyHandle=>$set){
                $setid = intval($set["setid"]);
                $freq = intval($set["freq"]);
                $sql = "SELECT sd.*  FROM setdata sd WHERE setid=$setid and freq='$freq' and geoid=$toGeoId and latlon=''";  //todo: add security here and to GetSeries to either be the owner or org or be part of a graph whose owner/org
                $result = runQuery($sql, "ChangeMaps: get series data");
                if($result->num_rows==1){
                    $output["bunnies"][$oldBunnyHandle] = $result->fetch_assoc();
                }
            }
        }
        $output["assets"] = [];
        if(isset($_POST["sets"]["mapSets"])){
            foreach($_POST["sets"]["mapSets"] as $handle=>$set){
                getMapSets($output["assets"], $_POST["map"], [["setid"=>$set["setid"], "freq"=>$set["freq"]]]);
            }
        }
        if(isset($_POST["sets"]["pointSets"])){
            foreach($_POST["sets"]["pointSets"] as $handle=>$set){
                getPointSets($output["assets"], $_POST["map"], [["setid"=>$set["setid"], "freq"=>$set["freq"]]]);
            }
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
            $sql = "SELECT s.name, s.mapsetid, s.pointsetid, s.notes, s.skey, s.setid as id, lat, lon, geoid,  s.userid, "
                . "s.title as graph, s.src, s.url, s.units, s.data, freq as freq, 'S' as save, 'datetime' as type, firstdt, "
                . "lastdt, hash as datahash "
                . " FROM series s "
                . " where mapsetid = " . intval($mapsetids[$i]) . " and pointsetid is null and geoid = " . $geoid;
            $result = runQuery($sql,"GetBunnySeries");
            if($result->num_rows==1){
                $row = $result->fetch_assoc();
                if(intval($row["userid"])>0){
                    requiresLogin();
                    if(intval($_POST["uid"])==$row["userid"] || ($orgId==$row["ordig"] &&  $orgId!=0)){
                        $row["handle"] = "U".$row["id"];
                        $output["assets"]["M".$mapsetids[$i]] = $row;
                    } else {
                        $output["allfound"]=false;
                        $output["assets"]=false; //no need to transmit series as it will not be used
                        break;
                    }
                } else {
                    $row["handle"] = "S".$row["id"];
                    $output["assets"]["M".$mapsetids[$i]] = $row;
                }
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
    case "CheckEmailForOrgInv":
        //1. check for existing invitation
        $sql = "select invid from invitations i, organizations o where i.orgid=o.orgid and i.email = " . safeSQLFromPost("email");
        $result = runQuery($sql, "CheckEmailForOrgInv");
        if($result->num_rows==1){
            //1A.  matched to a valid emailed root!
            $row = $result->fetch_assoc();
            $output =  array("status"=>"ok", "invited"=>true, "orgname"=>$row["orgname"], "date"=>$row["invdate"]);
            $userid = isset($_POST["uid"])?intval($_POST["uid"]):0;
            emailAdminInvite($_POST["email"]);  //invitation record exist.  NOte: first time call to emailAdminInvite needs additional params
            break;
        }
        //2. check for emailroot match to org with autosignup enabled
        $mailParts = explode("@", $_POST["email"]);
        if(count($mailParts)==2){
            $sql = "select o.orgid, orgname, name from organizations o, users u where o.userid=u.userid and joinbyemail='T' and emailroot = " . safeStringSQL($mailParts[1]);
            $result = runQuery($sql, "CheckEmailForOrgInv");
            if($result->num_rows==1){
                $row = $result->fetch_assoc();
                $userid = isset($_POST["uid"])?intval($_POST["uid"]):0;
                //no longer needed:  emailRootInvite($_POST["email"], $row["orgid"], $row["orgname"], $row["name"], $userid);
                //note: validationCode was sent as soon as an unknown email address was enter in the subscription form
                $output =  array("status"=>"ok", "eligible"=>true, "orgname"=>$row["orgname"]);
                break;
            }
        }
        //3. nothing found
        $output =  array("status"=>"ok", "invited"=>false, "eligible"=>false);
        break;
    case "EmailVerify":
        $validEmailCode = validationCode($_POST["email"]);
        if($validEmailCode == $_POST["verification"]){
            $output =  array("status"=>"ok","verfied" => true);
        } else {
            $output =  array("status"=>"ok",
                "verfied" => false,
                "sent"=>(mail($_POST["email"],
                        "email verification code from MashableData",
                        "To validate this email address, please enter the following code into the MashableData email verification box when requested:\n\n".$validEmailCode,
                        $MAIL_HEADER
                    ))
            );
        }
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
        if(isset($_POST["uid"]) && $_POST["uid"]!=null) { //new accounts do not have to be logged in, but if user claims a userid, verify accesstoken
            requiresLogin();
            $uid = intval($_POST["uid"]);
        }
        if(isset($_POST["regCode"]) && count($_POST["regCode"])>0){
            $sql = "select * from invitations where email=".safeSQLFromPost("email")." and regcode=".safeSQLFromPost("regCode");
            $result = runQuery($sql);
            if($_POST["regCode"] == validationCode($_POST["email"])){
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
                die('{"status":"The registration code is invalid for the primary email address provided."}');
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
    case "GetMySets":
        requiresLogin();
        $user_id =  intval($_POST['uid']);
        $sql = "SELECT  s.userid, u.name as username, s.name, setkey as sourcekey, s.setid, s.settype, maps,
            titles as categories, s.metadata as setmetadata, null as 'decimal', src, s.url, s.units,
            savedt, ms.preferredmap, freqs, firstsetdt100k*100000 as firstsetdt, lastsetdt100k*100000 as lastsetdt
            FROM sets s
            inner join  mysets ms on s.setid=ms.setid
            left outer join users u on s.userid=u.userid
            WHERE ms.userid=" . $user_id;
        $result = runQuery($sql);
        $output = array("status"=>"ok","series" => array());
        while ($aRow = $result->fetch_assoc()){
            $aRow["rawmaps"] = $aRow["maps"] ;
            $aRow["maps"] = mapsFieldCleanup($aRow["maps"]);
            $aRow["freqs"] = freqsFieldToArray($aRow["freqs"]);
            $output["sets"][handle($aRow)] = $aRow;
        }
        break;
    case "GetCatChains":
        $setid = intval($_POST["sid"]);
        if($setid == 0){ //get list of APIs to browse = select children of root category
            $sql = "SELECT c.catid, c.name, COUNT( DISTINCT cs2.setid ) AS scount, COUNT( DISTINCT cc2.childid ) AS children
                FROM categories c
                INNER JOIN catcat cc ON c.catid = cc.childid
                LEFT OUTER JOIN categorysets cs2 ON c.catid = cs2.catid
                LEFT OUTER JOIN catcat cc2 ON cc.childid = cc2.parentid
                WHERE cc.parentid =1
                GROUP BY c.catid, c.apicatid, c.name";
        } else {
            $sql = "SELECT c.catid, c.name, COUNT(DISTINCT cs2.setid ) AS scount,
             COUNT(DISTINCT childid ) AS children
            FROM categories c
              INNER JOIN categorysets cs ON  c.catid = cs.catid
              INNER JOIN categorysets cs2 ON  c.catid = cs2.catid
              LEFT OUTER JOIN catcat cc ON c.catid = cc.parentid
            WHERE cs.setid = $setid and c.catid<>1
            GROUP BY c.catid, c.apicatid, c.name";
            //don't get the root category (catid=1)
        }
        logEvent("GetCatChains: get series cats", $sql);
        $catrs = runQuery($sql);
        $chains = array();
        while($catinfo = $catrs->fetch_assoc()){
            $chains["C".$catinfo["catid"]] = array(array("catid"=>$catinfo["catid"], "name"=>$catinfo["name"], "scount"=>$catinfo["scount"], "children"=>$catinfo["children"]));
        }
        while(BuildChainLinks($chains)){}  //work occurs in BuildChains (note: $chains passed by ref)
        $output = array("chains"=>$chains);
        $output["sid"] = $setid;
        $output["status"] = "ok";
        break;
    case "GetCatSiblings":
        $catid = intval($_POST["catid"]);
        $sql = "SELECT c.catid, c.name, COUNT(DISTINCT cs.setid ) AS scount
            , COUNT(DISTINCT kids.childid ) AS children
            FROM catcat parent
            INNER JOIN catcat siblings ON siblings.parentid = parent.parentid
            INNER JOIN  categories c  ON c.catid = siblings.childid
            LEFT OUTER JOIN categorysets cs ON  siblings.childid = cs.catid
            LEFT OUTER JOIN catcat kids ON siblings.childid = kids.parentid
            WHERE parent.childid =  $catid
            GROUP BY c.catid, c.name
            ORDER BY c.name";
        logEvent("GetCatSiblings", $sql);
        $catrs = runQuery($sql);
        $output = array("status" => "ok", "siblings"=>array());
        while($sibling = $catrs->fetch_assoc()){
            array_push($output["siblings"], $sibling);
        }
        break;
    case "GetCatChildren":
        $catid = intval($_POST["catid"]);
        $sql = "SELECT
            c.catid, c.name, COUNT(DISTINCT cs.setid ) AS scount, COUNT(DISTINCT kids.childid ) AS children
            FROM catcat siblings
            INNER JOIN  categories c  ON c.catid = siblings.childid
            LEFT OUTER JOIN categorysets cs ON  siblings.childid = cs.catid
            LEFT OUTER JOIN catcat kids ON siblings.childid = kids.parentid
            WHERE siblings.parentid =  $catid
            GROUP BY c.catid, c.name
            ORDER BY c.name";
        logEvent("GetCatChildren", $sql);
        $catrs = runQuery($sql);
        $output = array("status" => "ok", "children"=>array());
        while($child = $catrs->fetch_assoc()){
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
            $gid_list = implode($clean_gids,",");
            //multi-table delete
            $sql = "delete g, gp, pc from graphs g, graphplots gp, plotcomponents pc
                where g.graphid=gp.graphid and g.graphid=pc.graphid
                and g.userid = $user_id and g.graphid in ( $gid_list )";
            logEvent("DeleteMyGraphs: delete graph and dependencies", $sql);
            runQuery($sql);
            $output = array("status" => "ok", "gids" => implode($clean_gids,","));
        } else {
            $output = array("status" => "fail: no gids to delete");
        }
        break;
    case "ResetGhash":
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
        $user_id =  isset($_POST['uid']) ? intval($_POST['uid']) : 0;
        if($_POST['published']=='Y'){$published = "Y";} else  {$published = "N";}
        $intervals = isset($_POST['intervals'])?intval($_POST['intervals']):'null';
        $from = (isset($_POST['start']) && is_numeric($_POST['start']))?intval($_POST['start']/1000)*1000:'null';
        $to = (isset($_POST['end']) && is_numeric($_POST['end']))?intval($_POST['end']/1000)*1000:'null';
        $cubeid = (isset($_POST['cubeid']) && is_numeric($_POST['cubeid']))?intval($_POST['cubeid']):'null';
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
        $annotations = safeSQLFromPost("annotations");
        $serieslist = safeSQLFromPost("serieslist");
        $map = safeSQLFromPost("map");
        $mapconfig = safeSQLFromPost("mapconfig");
        $title = safeSQLFromPost("title");
        $analysis = safeSQLFromPost("analysis");
        $modifieddt = intval($_POST["modifieddt"]);
        //table structure = graphs <-> graphplots <-> plotcomponents
        if($gid==0){
            $ghash = makeGhash($user_id);  //ok to use uid instead of gid as ghash is really just a random number
            $sql = "INSERT INTO graphs
              (userid, published, title, text, type, intervalcount, fromdt, todt, annotations, serieslist, map,
              mapconfig, cubeid, views, createdt, updatedt, ghash)
            values (
              $user_id, '$published',$title, $analysis, '$type', $intervals, $from, $to, $annotations, $serieslist, $map,
              $mapconfig, $cubeid, 0, $modifieddt, $modifieddt,'$ghash')";
            if(!runQuery($sql, "ManageMyGraphs: insert graphs record")){$output = array("status" => "fail on graph record insert", "post" => $_POST);break;}
            $gid = $db->insert_id;
        } else {
            $sql = "UPDATE graphs
            SET userid=$user_id, published='$published ', title=$title, text=$analysis, type='$type', intervalcount=$intervals,
            fromdt=$from, todt=$to, annotations=$annotations, updatedt=$updatedt, serieslist=$serieslist, map=$map, mapconfig=$mapconfig
            WHERE graphid = " . $gid . " and userid=" . $user_id;
            if(!runQuery($sql,"ManageMyGraphs: update graphs record")){$output = array("status" => "fail on graph record update");break;}
            $result = runQuery("select ghash from graphs where graphid = " . $gid . " and userid=" . $user_id,"ManageMyGraphs: read the ghash when updating");
            $row = $result->fetch_assoc();
            $ghash = $row["ghash"];
            //clear plots and components for fresh insert (note:  wastful of plotids
            $sql = "delete gp, pc from graphplots gp, plotcomponents pc where gp.graphid=pc.graphid and gp.graphid = " . $gid;
            runQuery($sql);
        }
        $output = array("status" => "ok", "gid" => $gid, "ghash"=> $ghash);
        //insert plot and plot components records
        if(isset($_POST['allplots'])){  //allplots contains the seriesplots, mapplots and pointplots
            $allPlots = $_POST['allplots'];
            foreach($allPlots as $plotOrder => $plot){  //plot order is global; does not restart at 0 for each plot type (mapplots/pointplots/seriesplots)
                $plotType = safeStringSQL($plot["type"]);
                $plotOptions = safeStringSQL($plot["options"]);
                $sql = "insert into graphplots (graphid, plotorder, plottype, options)
                    values ($gid, $plotOrder, $plotType, $plotOptions)";
                runQuery($sql, "ManageMyGraphs: insert graphplots record");
                foreach($plot["components"] as $compOrder=>$component){
                    $setid = intval($component["setid"]);
                    $freq = safeStringSQL($component["freq"]);
                    $geoid = isset($component["geoid"]) && is_numeric($component["geoid"])?intval($component["geoid"]):"NULL";  //must be null if empty
                    $latlon = isset($component["latlon"])? safeStringSQL($component["latlon"],false): "''";
                    $options = safeStringSQL($component["options"]);
                    $sql="insert into plotcomponents (graphid, plotorder, comporder, setid, freq, geoid, latlon, options) values "
                        . "($gid, $plotOrder, $compOrder, $setid, $freq, $geoid, $latlon, $options)";
                    runQuery($sql,"ManageMyGraphs: insert plotcomponents record");
                }
            }
        }
        //clear the cache when a graph is saved (if new or not previously cached, nothing gets deleted)
        runQuery("delete from graphcache where ghash='$ghash'");
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
            $sql = "select * from mysets where setid = " . $id . " and userid = " . $user_id;
            $result = runQuery($sql);
            $from = "";
            if($result->num_rows==1){
                $row = $result->fetch_assoc();
                $from = $row["saved"];
                if($from == $to){
                    $output = array("status" => "error: from and to save status are identical");
                    break;
                }
                $sql = "update mysets set savedt=". $addDt ." where setid = " . $id . " and userid = " . $user_id;
                logEvent("ManageMySeries: add", $sql);
                runQuery($sql);
            } else {
                if($to=="H" || $to=="S"){ //if not assigned to "saved" or "history" then command is to delete
                    $sql = "insert into mysets (userid, setid, savedt) VALUES ($user_id, $id, $addDt)";
                    logEvent("ManageMySeries: add", $sql);
                    runQuery($sql);
                    //TODO:  delete history in excess of 100 series
                }
            }
            if($to == 'S'){
                $sql = "update series set myseriescount= myseriescount+1 where setid = " . $id;
                runQuery($sql);
            }elseif($from == 'S' && $to == 'H'){
                $sql = "update series set myseriescount= myseriescount-1 where setid = " . $id;
                runQuery($sql);
            }
            if($to!="H" && $to!="S"){
                $sql = "delete from mysets where setid = " . $id . " and userid = " . $user_id;
                logEvent("ManageMySeries: delete", $sql);
                runQuery($sql);
            }
        } elseif($type=="U"){
            if($to!="S"){   //can only delete here.  nothing else to manage.
                //TODO: check for graph dependencies and organizational usage
                $sql = "delete from series where setid=". $id . " and userid=". $user_id;
                runQuery($sql);
            }
        }
        $output = array("status" => "ok");
        break;
    case "GetUserId":
        $username =  safePostVar('username');
        $accesstoken =  safePostVar('accesstoken');
        //$email =  $_REQUEST['email'];
        //$expires =  $_REQUEST['expires'];
        $authmode = safePostVar('authmode');   //currently, FB (Facebook) and MD (MashableData) are supported
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
                $sqlGetUser = "select u.*, o.orgid, orgname from users u left outer join organizations o on u.orgid=o.orgid "
                    . " where u.authmode = " . safeSQLFromPost('authmode')
                    . " and u.username = '" . $db->real_escape_string($username) . "'";
                $result = runQuery($sqlGetUser, "GetUserId: lookup user");
                if($result->num_rows==1){
                    $row = $result->fetch_assoc();
                    $sql = "update users set accesstoken = '" . $db->real_escape_string($accesstoken) . "' where userid=" .  $row["userid"];
                    runQuery($sql, "GetUserId: update accesstoken");
                } else {
                    $sql = "INSERT INTO users(username, accesstoken, name, email, authmode, company) VALUES ("
                        . safeSQLFromPost("username") . ","
                        . safeSQLFromPost("accesstoken") . ","
                        . safeSQLFromPost("name") . ","
                        . safeSQLFromPost("email") . ","
                        . safeSQLFromPost('authmode') . ","
                        . safeSQLFromPost("company") . ")";
                    runQuery($sql, "GetUserId: create new user record");
                    $result = runQuery($sqlGetUser, "GetUserId: lookup user afater insert");
                    $row = $result->fetch_assoc();
                }
                $output = array("status" => "ok", "userId" => $row["userid"], "orgId" => $row["orgid"], "orgName" => $row["orgname"],
                    "subscription"=> $row["subscription"], "subexpires"=> $row["expires"], "company"=> $row["company"],
                    "ccaddresss"=> $row["ccaddresss"], "cccity"=> $row["cccity"], "ccstateprov"=> $row["ccstateprov"],
                    "ccpostal"=> $row["ccpostal"], "cccountry"=> $row["cccountry"], "ccnumber"=> substr($row["ccnumber"],-4),
                    "ccexpiration"=> $row["ccexpiration"],"ccv"=>$row["ccv"],"ccname"=> $row["ccname"],"permission"=> $row["permission"]);
                setcookie("md_auth",myEncrypt($row["userid"].":".$row["orgid"].":".$row["orgname"].":".$row["permission"].":".$row["subscription"]));
            } else {
                $output = array("status" => "error:  Facebook validation failed", "facebook"=> $fbstatus["error"]["message"]);
            }
        }
        if($authmode=='MD'){
            //todo: add MD authentication
        }
        break;
    case "UploadMyMashableData":
        global $orgid;
        requiresLogin();
        $user_id =  intval($_POST['uid']);
        $series = $_POST['series'];
        $output = array(
            "status" => "ok",
            "handles" => array()
        );
        for($i=0;$i<count($series);$i++){
            //get parameters for this user series
            $local_handle = $series[$i]['handle'];
            $series_name = $series[$i]['name'];
            $graph_title =  $series[$i]['graph'];
            $units = isset($series[$i]['units'])?$series[$i]['units']:'';
            $skey = isset($series[$i]['skey'])?$series[$i]['skey']:'';
            $url = $series[$i]['url'];
            $freq = $series[$i]['freq'];
            $capture_dt = $series[$i]['savedt'];
            $data = $series[$i]['data'];
            $firstdt = intval( $series[$i]['firstdt']);
            $lastdt = intval($series[$i]['lastdt']);
            if(isset($series[$i]["geoid"])){
                $geoid = intval($series[$i]["geoid"]);
            } else {
                $geoid = null;
            }
            if(isset($series[$i]["mapsetid"])){
                $mapsetid = intval($series[$i]["mapsetid"]);
            } else {
                $mapsetid = null;
            }
            if(isset($series[$i]["pointsetid"])){
                $pointsetid = intval($series[$i]["pointsetid"]);
            } else {
                $pointsetid = null;
            }
            if(isset($series[$i]["lat"])){
                $lat = intval($series[$i]["lat"]);
                $lon = intval($series[$i]["lin"]);
            } else {
                $lat = null;
                $lon = null;
            }
            //strip out certain acts of the URL
            $working_url = preg_replace('/http[s]*:\/\//','',$url);
            $first_slash = strpos($working_url,'/');
            $full_domain = substr($working_url, 0, $first_slash);
            $period = strrpos($full_domain, ".");
            $l1domain = substr($full_domain, $period+1);
            $l2domain = substr($full_domain, 0, $period);
            $period = strrpos($l2domain,".");
            if($period){$l2domain = substr($l2domain, $period+1);}
            $src = isset($series[$i]['src'])?$series[$i]['src']:$l2domain.".".$l1domain;
            //see if user has already uploaded this one:
            $sql = "SELECT setid, data FROM series WHERE name='" . $db->real_escape_string ($series_name) . "' and title = '" . $db->real_escape_string ($graph_title)
                . "' and url = '" . $db->real_escape_string ($url) . "' and freq = '" . $db->real_escape_string ($freq)
                . "' and units = '" . $db->real_escape_string ($units) . "' and userid=".$user_id;
            $result = runQuery($sql, "uploadMashableData: search whether this user series exists");
            if($result->num_rows!=0){
                $row = $result->fetch_assoc();
                $setid = $row["setid"];
                if($data!=$row["data"]){
                    $sql = "update series set data='".$db->real_escape_string ($data)."', firstdt=".$firstdt.", lastdt=".$lastdt." where setid=".$setid;
                    runQuery($sql, $command);
                }
                $sql = "update mysets set savedt = ".intval($_POST["savedt"])." where setid=".$setid." and userid=".$user_id;
                runQuery($sql, $command);
            } else {
                $sql = "insert into series (userid, skey, name, namelen, src, units, units_abbrev, freq, title, url, notes, data, hash, apiid, firstdt, lastdt, geoid, mapsetid, pointsetid, lat, lon) "
                    . " values (".$user_id.",".safeStringSQL($skey).",".safeStringSQL($series_name).",".strlen($series_name).",".safeStringSQL($src).",".safeStringSQL($units).",".safeStringSQL($units).",".safeStringSQL($freq).",".safeStringSQL($graph_title).",".safeStringSQL($url).",'private user series acquired through via a chart using the MashableData chart plugin',".safeStringSQL($data).",".safeStringSQL(sha1($data)).",null,".$firstdt.",".$lastdt.",".($geoid===null?"null":$geoid).",". ($mapsetid===null?"null":$mapsetid) .",". ($pointsetid===null?"null":$pointsetid).",".($lat===null?"null":safeStringSQL($lat)).",". ($lon===null?"null":safeStringSQL($lon)).")";
                $queryStatus = runQuery($sql, $command);
                if($queryStatus!==false){
                    $setid = $db->insert_id;
                    $output["handles"][$local_handle] = 'U'.$setid;
                    runQuery("insert into mysets (setid, userid, savedt) values (".$setid.",".$user_id.",".intval($capture_dt).")", $command);
                }
                else {
                    $output["status"] = "error adding local series";
                    break;
                }
            }
            $output['handles'][$local_handle] = 'U'.$setid;
        }
        break;
    case "SaveUserSeries":
        requiresLogin();  //sets global $orgid
        $usageTracking = trackUsage("count_userseries");
        if(!$usageTracking["approved"]){
            $output = array("status"=>$usageTracking["msg"]);
            break;
        }
        $set = $_POST['set'];  //either "U" or a mapset or pointset handle
        $setid = (strlen($set)>1) ? intval(substr($set,1)) : 0;
        $user_id =  intval($_POST['uid']);
        $setType = substr($set, 0, 1);
        $arySeries = $_POST['series'];
        $output = array(
            "status" => "ok",
            "series" => array()
        );
        if($setType=="X"){
            $pointSet = false;
            $sql = "select * from pointsets where pointsetid=$setid and userid=$user_id and apiid is null";
            $result = runQuery($sql);
            if($result->num_rows==1) {
                $pointSet = $result->fetch_assoc();
                if($pointSet["name"]!=$_POST['setname'] || $pointSet["units"]!=$arySeries[0]['units'] || $pointSet["freq"]!=$arySeries[0]['freq']){
                    $pointSet = false;
                }
            }
            if(!$pointSet){
                $sql = "insert into pointsets (name, units, freq, userid) "
                    ." values(".safeSQLFromPost("setname").",".safeSQLFromPost("units").",".safeSQLFromPost("freq").",$user_id)";
                runQuery($sql);
                $setid = $db->insert_id;
            }
        }
        if($setType=="M"){
            $mapSet = false;
            $sql = "select * from mapsets where mapsetid=$setid and userid=$user_id and apiid is null";
            $result = runQuery($sql);
            if($result->num_rows==1) {
                $mapSet = $result->fetch_assoc();
                if($mapSet["name"]!=$_POST['setname'] || $mapSet["units"]!=$arySeries[0]['units'] || $mapSet["freq"]!=$arySeries[0]['freq']){
                    $mapSet = false;
                }
            }
            if(!$mapSet){
                $sql = "insert into mapsets (name, units, freq, userid) "
                    ." values(".safeSQLFromPost("setname").",".safeSQLFromPost("units").",".safeSQLFromPost("freq").",$user_id)";
                runQuery($sql);
                $setid = $db->insert_id;
            }
        }
        for($i=0;$i<count($arySeries);$i++){
            $series_name = $arySeries[$i]['name'];
            $graph_title =  '';
            $units = $arySeries[$i]['units'];
            $skey = '';
            $url = '';
            $description = $arySeries[$i]['notes'];
            $freq = $arySeries[$i]['freq'];
            $data = isset($arySeries[$i]["data"])?$arySeries[$i]["data"]:"";
            //$orgid = intval($_POST['orgid']);
            $usid = isset($arySeries[$i]['handle'])&&substr($arySeries[$i]['handle'],0,1)=="U"?intval(substr($arySeries[$i]['handle'],1)):0;
            $src =  isset($arySeries[$i]['src'])?$arySeries[$i]['src']:null;
            if(count($data)==0){ //need to insert records, but we do not have the data > issue data request
                $output = array("status" => "Error:  no data provided");
                break;
            }
            if($usid>0){
                $sql = "update series set name=".safeStringSQL(isset($arySeries[$i]["name"])?$arySeries[$i]["name"]:"")
                    . ", namelen=". strlen(isset($arySeries[$i]["name"])?$arySeries[$i]["name"]:"")
                    . ", units=".safeStringSQL(isset($arySeries[$i]["units"])?$arySeries[$i]["units"]:"")
                    . ", notes=".safeStringSQL(isset($arySeries[$i]["notes"])?$arySeries[$i]["notes"]:"")
                    . ", freq=".safeStringSQL(isset($arySeries[$i]["freq"])?$arySeries[$i]["freq"]:"")
                    . ", data='" . $db->real_escape_string($data) . "'"
                    . ", hash='" . sha1($data)  . "'"
                    . ", firstdt=" . intval($arySeries[$i]['firstdt']/1000)*1000
                    . ", lastdt=" . intval($arySeries[$i]['lastdt']/1000)*1000
                    . " WHERE userid=".$user_id." and setid=".$usid;
                runQuery($sql);
                $sql = "UPDATE mysets SET savedt=".intval($arySeries[$i]["savedt"]/1000)*1000 . " WHERE userid=".$user_id." and setid=".$usid;
            } else {
                $sql = "select COALESCE(u.name, u.email, o.orgname) as owner "
                    . " FROM users u left outer join organizations o on u.orgid=o.orgid "
                    . " WHERE u.userid=".$user_id;
                $result = runQuery($sql);
                $aUser = $result->fetch_assoc();
                $src = $aUser["owner"];
                $sql = "insert into series (name, namelen, units, notes, freq, geoid, mapsetid, pointsetid, data, hash, firstdt, lastdt, userid, orgid, src) values ("
                    . safeStringSQL(isset($arySeries[$i]["name"])?$arySeries[$i]["name"]:"") . ","
                    . strlen(isset($arySeries[$i]["name"])?$arySeries[$i]["name"]:"") . ","
                    . safeSQLFromPost(isset($arySeries[$i]["units"])?$arySeries[$i]["units"]:"") . ","
                    . safeSQLFromPost(isset($arySeries[$i]["notes"])?$arySeries[$i]["notes"]:"") . ","
                    . safeSQLFromPost(isset($arySeries[$i]["freq"])?$arySeries[$i]["freq"]:"") . ","
                    . (isset($arySeries[$i]["geoid"])?$arySeries[$i]["geoid"]:"null") . ","
                    . ($setType=="M"?$setid:"null") . ","
                    . ($setType=="P"?$setid:"null") . ","
                    . "'" . $db->real_escape_string($data) . "',"
                    . safeStringSQL(sha1($data)) . ","
                    . intval( $arySeries[$i]['firstdt']/1000)*1000 . ","  //because WAMP's intval is only 32 bit, even on a Windows 8 64bit machine!
                    . intval($arySeries[$i]['lastdt']/1000)*1000 . ","
                    . $user_id . ","
                    . (($orgid==0)?"null":$orgid). ","
                    . safeStringSQL($src) .")";
                runQuery($sql, "userseries insert");
                $usid = $db->insert_id;
                $sql="insert into mysets (userid, setid, savedt) values (".$user_id.",".$usid.",".intval($arySeries[$i]["savedt"]/1000)*1000 .")";
                runQuery($sql, "mysets insert for new user series");
            }
            array_push($output["series"],
                array(
                    "usid" => $usid,
                    "src"=> $src,
                    "mapsetid"=>($setType=="M") ? $setid : null,
                    "pointsetid"=>($setType=="X") ? $setid : null
                )
            );
        }
        if($setid>0) {
            if($setType=="M") setMapsetCounts($setid);
            if($setType=="X") setPointsetCounts($setid);
        }
        if(isset($usageTracking["msg"])) $output["msg"] = $usageTracking["msg"];
        break;
    case "GetSeries":  //formerly GetMashableData
        //takes sets and get a series in that set, guessing at geo and latlon as needed (note: workbench should already have guessed at freq
        $usageTracking = trackUsage("count_seriesview");
        if(!$usageTracking["approved"]){
            $output = array("status"=>$usageTracking["msg"]);
            break;
        }
        if(isset($_POST['series']) && count($_POST['series']) > 0){
            $series = $_POST['series'];
        } else {
            $output = ["status"=>"Empty data request"];
            break;
        }
        $fromMap = isset($_POST['map'])? $_POST['map'] : false;
        $user_id =  intval($_POST['uid']);
        $output = ["status"=>"ok", "series"=> []];
        foreach($series as $orginalHandle => $serie){
            if(!isset($serie["geoid"])){
                //1. see if a preferred map (and bunny)
                if($fromMap  && $fromMap!="false"){
                    //1a.  look for bunny
                    $sql = "select geoid, latlon from setdata where setid=$serie[setid] and freq='$serie[freq]' and geoid=$fromMap[bunny]";
                    $result = runQuery($sql);
                    if($result->num_rows>0){
                        $row = $result->fetch_assoc();
                        $serie["geoid"] = $row["geoid"];
                        $serie["latlon"] = $row["latlon"];
                    } else {
                        //1b. look for any series belonging to any of map's geographies
                        $sql = "select sd.geoid, sd.latlon
                            from setdata sd join mapgeographies mg on sd.geoid=mg.geoid
                            where sd.setid=$serie[setid] and sd.freq='$serie[freq]' and mg.map='$fromMap[code]'
                            limit 1";
                        $result = runQuery($sql);
                        if($result->num_rows>0){
                            $row = $result->fetch_assoc();
                            $serie["geoid"] = $row["geoid"];
                            $serie["latlon"] = $row["latlon"];
                        } else {
                            //1c. Geeze-louise! get anything in set!
                            $sql = "select geoid, latlon from setdata where setid=$serie[setid] and freq='$serie[freq]' limit 1";
                            $result = runQuery($sql);
                            if($result->num_rows>0){
                                $row = $result->fetch_assoc();
                                $serie["geoid"] = $row["geoid"];
                                $serie["latlon"] = $row["latlon"];
                            } else {
                                //I give up!
                                $output = ["status" => "unable to find any data for the set and frequency requested."];
                                break;
                            }
                        }
                    }
                } else {
                    //2. if no map as a guide, look for a prominent geography (world=321, africa=3837, europe=3841,307,306, us=235, china=44, uk=80)
                    $primeGeos = [321, 235, 306,307,3841,80,44,3837];
                    $sql = "select geoid, latlon
                            from setdata
                            where setid=$serie[setid] and freq='$serie[freq]' and geoid in (".implode(",", $primeGeos).")";
                    $result = runQuery($sql);
                    $bestRank = 1000;
                    if($result->num_rows>0){
                        while($row = $result->fetch_assoc()){
                            $rowRank = array_search($row["geoid"], $primeGeos);
                            if($rowRank<$bestRank){
                                $rowRank = $bestRank;
                                $serie["geoid"] = $row["geoid"];
                                $serie["latlon"] = $row["latlon"];
                            }
                        }
                    } else {
                        //2b. get anything in set!
                        $sql = "select geoid, latlon from setdata where setid=$serie[setid] and freq='$serie[freq]' limit 1";
                        $result = runQuery($sql);
                        if($result->num_rows>0){
                            $row = $result->fetch_assoc();
                            $serie["geoid"] = $row["geoid"];
                            $serie["latlon"] = $row["latlon"];
                        } else {
                            //I give up!
                            $output = ["status" => "unable to find any data for the set and frequency requested."];
                            break;
                        }
                    }
                }
            }
            //3.with accurate geoid and latlon => fetch series the whole thing!
            //  distributed metadata = setdata.metadata & (sets.metadata + apis.metadata + theme.meta)
            //  distributed src = sets.src > apis.name
            //  distributed url = setdata.url > sets.url > apis.url
            $sql = "
            SELECT
              s.settype, s.setid, s.name as setname, s.themeid, s.metadata as setmetadata, s.titles as categories, s.userid, s.units,
              sd.latlon, sd.geoid, sd.data, sd.freq, sd.firstdt100k*100000 as firstdt, lastdt100k*100000 as lastdt,
              coalesce(s.src, a.name) as src,
              coalesce(sd.url, s.url, a.url) as url,
              coalesce(sd.skey, s.setkey) as sourcekey,
              coalesce(s.maps, xs.maps) as maps,
              coalesce(s.freqs, xs.freqs) as freqs,
              sd.metadata as seriesmetadata,
              g.name as geoname,
              concat(IFNULL(s.metadata ,''),' ',IFNULL(a.metadata,''),' ', IFNULL(t.meta,'')) as setmetadata
            FROM sets s join setdata sd on s.setid = sd.setid
              left outer join apis a on s.apiid=a.apiid
              left outer join themes t on s.themeid=t.themeid
              left outer join geographies g on sd.geoid=g.geoid
              left outer join sets xs on xs.mastersetid=s.setid and xs.latlon=sd.latlon
            WHERE
              s.setid = $serie[setid] and sd.freq = '$serie[freq]' and sd.geoid = $serie[geoid] and sd.latlon = '$serie[latlon]'";
            $result = runQuery($sql, "GetSeries series");
            if($result->num_rows==1){
                $aRow = $result->fetch_assoc();
                $aRow["freqs"] = freqsFieldToArray($aRow["freqs"]);
                $aRow["maps"] = mapsFieldCleanup($aRow["maps"]);
                $output["series"][$orginalHandle] = $aRow;
            } else {
                $output = ["status" => "Unable to query data for the set and frequency requested."];
                break;
            }
        }
        //don't get cubes here
        if(isset($usageTracking["msg"])) $output["msg"] = $usageTracking["msg"];
        //log embedded usage
        if(isset($_REQUEST["host"]) && strpos($_REQUEST["host"],"mashabledata.com")===false){
            $host = safeStringSQL(trim(strtolower($_REQUEST["host"])));
            $sql = "
                    insert into embedlog (host, obj, objfetches) values ($host, 'series', 1)
                    on duplicate key
                    update embedlog set cubefecthes = cubefecthes + 1 where host=$host and obj='series'
                ";
            runQuery($sql);
        }
        break;
    case  "GetAnnotations":
        if(safePostVar('whose')=="M"){
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
            $sql = "SELECT c.catid, c.name, COUNT(DISTINCT childrensets.setid ) AS scount "
                . ", COUNT(DISTINCT childrencats.childid ) AS children   "
                //. ", COUNT(DISTINCT silbingcats.childid ) AS sbilings   "
                . " FROM catcat current "
                . " INNER JOIN categories c ON c.catid = current.parentid "
                . " LEFT OUTER JOIN categorysets childrensets ON c.catid = childrensets.catid "
                . " LEFT OUTER JOIN catcat childrencats ON c.catid = childrencats.parentid "
                //. " LEFT OUTER JOIN catcat parentcat ON c.catid = parentcat.childid "
                //. " LEFT OUTER JOIN catcat silbingcats ON parentcat.parentid = silbingcats.childid "
                . " WHERE current.childid =" . $lastcat["catid"]
                . " GROUP BY c.catid, c.name limit 0, 1";
            $children  = runQuery($sql, "BuildChainLinks");
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
}

function getGraphs($userid, $ghash){  //only called by "GetFullGraph" and "GetEmbeddedGraph"
    global $ft_join_char;
//if $userid = 0, must be a public graph; otherwise must own graph
//note that series data is returned only if ghash is specified (i.e. a single graph request)
//mapset data is not returned.  Requires a call to getGraphMapSets
    if(strlen($ghash)==0 && intval($userid)==0){
        die('{"status":"Must provide valid a hash or user credentials."}');
    }
    if(strlen($ghash)>0){
        $where =  " WHERE ghash=".safeStringSQL($ghash);  //used by GetFullGraph
    }else{
        requiresLogin();
        $where = " WHERE g.userid=" . intval($userid);  //used by GetMyGraphs
    }
    //mapsPrefix = $ft_join_char
    $sql = "SELECT g.graphid as gid, g.userid, g.title, g.text as analysis,
        g.map, g.mapconfig,  g.cubeid,  g.serieslist, g.intervalcount, g.type, g.annotations,
        g.ghash,  g.fromdt, g.todt,  g.published, g.views, ifnull(g.updatedt, g.createdt) as updatedt,
        m.jvectormap, m.bunny, m.legend,
        s.name as setname, s.settype, s.units, s.metadata as setmetadata, s.latlon, s.firstsetdt100k*1000000 as firstsetdt, s.lastsetdt100k*100000 as lastsetdt, s.mastersetid,
        gp.plotorder, gp.plottype, gp.options as plotoptions,
        pc.comporder, pc.setid, pc.freq, pc.geoid, pc.latlon, pc.options as componentoptions,
        sd.data, sd.firstdt100k, sd.lastdt100k,
        geo.name as geoname,
        coalesce(s.src, a.name) as src,
        coalesce(sd.url, s.url, a.url) as url,
        coalesce(sd.skey, s.setkey) as sourcekey,
        replace('M$ft_join_char', '', coalesce(s.maps, xs.maps)) as maps,
        replace('F$ft_join_char', '', coalesce(s.freqs, xs.freqs)) as freqs,
        concat(IFNULL(s.metadata ,''),' ',IFNULL(a.metadata,''),' ', IFNULL(t.meta,'')) as setmetadata
        FROM graphs g
          JOIN graphplots gp ON g.graphid=gp.graphid
          JOIN plotcomponents pc ON g.graphid=pc.graphid and gp.plotorder=pc.plotorder
          JOIN sets s ON pc.setid=s.setid
          LEFT OUTER JOIN maps m ON g.map=m.map
          LEFT OUTER JOIN setdata sd ON s.setid=sd.setid and pc.freq=sd.freq and pc.geoid=sd.geoid and pc.latlon=sd.latlon
          LEFT OUTER JOIN geographies geo ON pc.geoid=geo.geoid
          LEFT OUTER JOIN apis a ON s.apiid=a.apiid
          LEFT OUTER JOIN themes t ON s.themeid=t.themeid
          LEFT OUTER JOIN sets xs on s.setid=xs.mastersetid and sd.latlon=xs.latlon
        $where
        ORDER BY updatedt desc, gid, gp.plotorder, pc.comporder";
    $result = runQuery($sql, "GetGraphs main selected");
    if($result->num_rows==0 && strlen($ghash)>0){
        die('{"status":"No graph found. The author may have changed its code or deleted it."}');
    }
    $output = array("status"=>"ok","graphs" => array());
    $gid = 0;
    $plotorder = -1;
    while ($aRow = $result->fetch_assoc()){
        if($gid != $aRow['gid']){ //avoid repeats due to the joined SQL recordset
            //************* GRAPH OBJECT
            $gid = $aRow['gid'];
            $bunny = $aRow['gid'];
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
                "updatedt" =>  intval($aRow["updatedt"]),
                "annotations" =>  $aRow["annotations"],
                "intervals" => $aRow["intervalcount"],
                "allplots" => []  //added below (graph must have at least one plot
            );
            //if($aRow["map"]!=null){
            $output['graphs']['G' . $gid]["map"] = $aRow["map"];
            $output['graphs']['G' . $gid]["mapFile"] = $aRow["jvectormap"];
            $output['graphs']['G' . $gid]["bunny"] = $aRow["bunny"];
            $mapconfig = $aRow["mapconfig"];
            if($aRow["legend"]){
                $json = json_decode($mapconfig, true);
                $json["legendLocation"] = $aRow["legend"] ? $aRow["legend"] : "TR";  //why??  because embedded graphs will not have maplist
                $mapconfig = json_encode($json);
            }
            $output['graphs']['G' . $gid]["mapconfig"] = $mapconfig;
            $output['graphs']['G' . $gid]["mapFile"] = $aRow["jvectormap"];
            //}
            if(strlen($ghash)>0) $output['graphs']['G' . $gid]["assets"] = [];
        }
        if($plotorder!=$aRow['plotorder']){ //this check avoids repeatedly adding the same plot due to the joined SQL recordset
            $plotorder =  $aRow['plotorder'];  //add the plot
            //************* PLOT OBJECT
            $output['graphs']['G' . $gid]["allplots"][intval($plotorder)] =[
                "handle"=>"P".$plotorder,
                "options"=> $aRow["plotoptions"],
                "components" => []
            ];
        }
        $output['graphs']['G' . $gid]["allplots"][intval($plotorder)]["components"][] =[  //add the component (data and other properties will be in assets = only if we are getting the full graph
            "settype"=> $aRow["settype"],
            "setid"=> $aRow["setid"],
            "freq"=> $aRow["freq"],
            "geoid"=> $aRow["geoid"],
            "latlon"=> $aRow["latlon"],
            "options"=> $aRow["componentoptions"]
        ];
        //each may create a new series asset. Repeated assets simply get overwritten and output only once.
        if(strlen($ghash)>0){  //returns the assets too
            $handle = $aRow["settype"].$aRow["setid"].$aRow["freq"].(is_numeric($aRow["geoid"])?"G".$aRow["geoid"]:"").($aRow["latlon"]!=""?"L".$aRow["latlon"]:"");
            if($aRow["geoid"]||$aRow["latlon"]!=""){
                $output['graphs']['G' . $gid]["assets"][$handle] = array(
                    //don't overwrite Set.name()!  "handle"=>$handle,
                    "setid" => $aRow["setid"],
                    "settype" => $aRow["settype"],
                    "geoid" => $aRow["geoid"],
                    "latlon"=>$aRow["latlon"],
                    "setname"=>$aRow["setname"],
                    "units"=>$aRow["units"],
                    "src"=>$aRow["src"],
                    "geoname"=>$aRow["geoname"],
                    "setmetadata"=>$aRow["setmetadata"],
                    "firstdt"=> $aRow["firstdt100k"]*100*1000,
                    "lastdt"=> $aRow["lastdt100k"]*100*1000,
                    "freq"=> $aRow["freq"],
                    "url"=> $aRow["url"],
                    "mastersetid"=> $aRow["mastersetid"],
                    "data" => $aRow["data"],
                );
            } elseif($aRow["settype"]=='M' && $aRow["geoid"]===null && $aRow["latlon"]==""){
                //each pointSet asset created separately (note:  routine adds the data structure to $output.assets
                getMapSets($output['graphs']['G' . $gid]["assets"], $aRow["map"], [["setid"=>$aRow["setid"], "freq"=>$aRow["freq"]]]);
            } elseif($aRow["settype"]=='X' && $aRow["geoid"]===null && $aRow["latlon"]==""){
                //each pointSet asset created separately (note:  routine adds the data structure to $output.assets
                getPointSets($output['graphs']['G' . $gid]["assets"], $aRow["map"], [["setid"=>$aRow["setid"], "freq"=>$aRow["freq"]]]);
            }
        }
    }
    if(strlen($ghash)>0){
        $mapconfig = isset($output["graphs"]["G" . $gid]["mapconfig"])?json_decode($output["graphs"]["G" . $gid]["mapconfig"],true):null;
        if($mapconfig!==null){
            if(isset($mapconfig["cubeid"])){
                $output['graphs']['G' . $gid]["assets"]["cube"]=[];
                if(isset($mapconfig["cubegeoid"])){
                    $cubegeoid = $mapconfig["cubegeoid"];
                } elseif($bunny!==null) {
                    $cubegeoid = $bunny;
                } else {
                    $cubegeoid = 0;
                }

                if(isset($mapconfig["cubefreq"])){
                    $cubefreq = safeStringSQL($mapconfig["cubefreq"]);
                } else {
                    $cubegeoid = 0;
                }

                getCubeSeries($output['graphs']['G' . $gid]["assets"], $mapconfig["cubeid"], $cubegeoid);
            }
        }
    }
    return $output;
}

function getMapSets(&$assets, $map, $requestedSets, $mustBeOwnerOrPublic = false){
//used by:
//    "GetMapSet" command from workbench.QuickViewToMap and workbench.getGraphMapSets()
//    "GetFullGraph" command (api.getGraphs()) from grapher.createMyGraph() only
//    "GetEmbeddedGraph" command (api.getGraphs()) from grapher.createMyGraph() only
    global $db, $orgid;
    $setFilters = [];
    //print_r($requestedSets);
    for($i=0;$i<count($requestedSets);$i++){
        $setFilters[] = "(s.setid=".$requestedSets[$i]["setid"]." AND sd.setid=".$requestedSets[$i]["setid"]." AND sd.freq='".$requestedSets[$i]["freq"]."')";
    }
    $mapCode = safeStringSQL($map);
    $sql = "SELECT s.setid, s.settype, s.name as setname, s.maps, s.freqs, s.themeid, s.metadata as setmetadata, s.src, s.url, s.units,
      g.jvectormap as map_code, s.userid, s.orgid, sd.geoid, g.name as geoname,
      sd.freq, sd.data, sd.metadata as seriesmetadata, sd.latlon, sd.lastdt100k, sd.firstdt100k, sd.url as seriesurl
    FROM sets s JOIN setdata sd on s.setid=sd.setid
      JOIN geographies g on sd.geoid=g.geoid
      JOIN mapgeographies mg on sd.geoid = mg.geoid and mg.geoid=g.geoid
      JOIN maps m on mg.map=m.map
    WHERE (" . implode(" OR ", $setFilters) . ")
      and mg.map  = $mapCode and m.map = $mapCode";
    if($mustBeOwnerOrPublic){
        $sql .= " and (s.userid is null or s.userid= " . intval($_POST["uid"]) . " or orgid=" . $orgid . ")"; //assumes requiresLogin already run
    }
    $sql .= " ORDER by  setid";
    $result = runQuery($sql, "getMapSets");
    $currentMapSetId = 0;
    while($row = $result->fetch_assoc()){
        if($currentMapSetId!=$row["setid"]){
            //new mapset = need header
            $currentMapSetId=$row["setid"];
            $handle = "M".$currentMapSetId.$row["freq"];
            $assets[$handle] = array(
                "setid"=>$currentMapSetId,
                "maps"=>array(),
                "setname"=>$row["setname"],
                "units"=>$row["units"],
                "freq"=>$row["freq"],
                "src"=>$row["src"],
                "themeid"=>$row["themeid"],
                "setmetadata"=>$row["setmetadata"],
                "settype"=>$row["settype"],
                "firstdt"=>$row["firstdt100k"]*100000,
                "lastdt"=>$row["lastdt100k"]*100000,
                "data"=>array()
            );
            $assets[$handle]["freqs"] = freqsFieldToArray($row["freqs"]);
            $assets[$handle]["maps"] = mapsFieldCleanup($row["maps"]);
        }
        $assets[$handle]["data"][$row["map_code"]] = [
            "handle"=>"S".$row["setid"].$row["freq"]."G".$row["geoid"],
            "geoid"=>$row["geoid"],
            "geoname"=>$row["geoname"],
            "data"=>$row["data"],
            "firstdt"=>$row["firstdt100k"]*100000,
            "lastdt"=>$row["lastdt100k"]*100000
        ];
        if($row["seriesmetadata"]!=null) $assets[$handle][$row["map_code"]]["metadata"] = $row["seriesmetadata"];
        if($row["seriesurl"]!=null) $assets[$handle][$row["map_code"]]["url"] = $row["seriesurl"];
        if($row["latlon"]!=null) $assets[$handle][$row["map_code"]]["latlon"] = $row["latlon"];
        $assets[$handle]["firstdt"] = min($assets[$handle]["firstdt"], $row["firstdt100k"]*100000);
        $assets[$handle]["lastdt"] = max($assets[$handle]["lastdt"], $row["lastdt100k"]*100000);
    }
    /*//after reading the rows, indicate order (could be done client side...)
    for($i=0;$i<count($regionSets);$i++){
        $assets["M".$regionSets[$i]["setid"]."G".$regionSets[$i]["geoid"]]["order"]=$i+1;
    }*/
    //return $assets;
}

function getPointSets(&$assets, $map, $aryPointsetIds, $mustBeOwnerOrPublic = false){
    global $db, $orgid;
    $sql = "select ps.pointsetid, ps.name, ps.units, ps.freq, ps.freqset, ps.themeid, "
        . " s.setid, s.userid, s.orgid, s.geoid, s.src, s.lat, s.lon, s.name as seriesname, s.data, s.firstdt, s.lastdt "
        . " from pointsets ps, series s, mapgeographies mg, maps m "
        . " where ps.pointsetid = s.pointsetid and s.mapsetid is null  and s.pointsetid in (" . implode($aryPointsetIds, ",") . ")"
        . " and m.map  = " . safeStringSQL($map)
        . " and mg.geoid=s.geoid and ((mg.map =" . safeStringSQL($map). " and mg.map=m.map) or bunny=s.geoid)"
        . " and ps.pointsetid in (" . implode($aryPointsetIds, ",") . ")";
    if($mustBeOwnerOrPublic){
        $sql .= " and (s.userid is null or s.userid= " . intval($_POST["uid"]) . " or s.orgid=" . $orgid . ")"; //assumes requiresLogin already run
    }
    $sql .= " order by pointsetid";
    $result = runQuery($sql);
    $currentPointSetId = 0;
    while($row = $result->fetch_assoc()){
        if($currentPointSetId!=$row["pointsetid"]){ //new pointset = need header
            $currentPointSetId=$row["pointsetid"];
            $assets["X".$currentPointSetId] = array(
                "handle"=>"X".$currentPointSetId,
                "name"=>$row["name"],
                "units"=>$row["units"],
                "freq"=>$row["freq"],
                "src"=>$row["src"],
                "themeid"=>$row["themeid"],
                "data"=>array()
            );
        }
        if($row["freqset"]!==null){
            $freqset = '{"a":{'.$row["freqset"].'}}';
            $ary = json_decode($freqset, true);
            $assets["X".$currentPointSetId]["freqset"] = $ary["a"];
        }
        $latlon = $row["lat"].",".$row["lon"];
        $assets["X".$currentPointSetId]["coordinates"][$latlon] = array("latLng"=>array($row["lat"], $row["lon"]));
        $assets["X".$currentPointSetId]["data"][$latlon] = array(
            "handle"=>"S".$row["setid"],
            "name"=>$row["seriesname"],
            "data"=>$row["data"],
            "firstdt"=>$row["firstdt"],
            "lastdt"=>$row["lastdt"]
        );
    }
}

function freqsFieldToArray($freqs){
    global $ft_join_char;
    if(!$freqs) return [];
    return explode(" ", str_replace("F".$ft_join_char, "", $freqs));
}

function mapsFieldCleanup($mapsField){
    global $ft_join_char;
    if($mapsField) {
        return str_replace("M".$ft_join_char, "", $mapsField);
    } else {
        return null;
    }
}

function handle(&$obj){
    return $obj["settype"].$obj["setid"].(isset($obj["freq"])?$obj["freq"]:"").(isset($obj["geoid"])?"G".$obj["geoid"]:"").(isset($obj["latlon"])?"L".$obj["latlon"]:"");
}

function getCubeSeries(&$output, $cubeid, $geoid=0, $sqlFreq=false){
    //fetch cube and theme name (just in case)
    $sql = "select c.units, c.name as cubename, t.name as themename, cd1.name as baraxis, cd1.json as barnames, cd2.name as stackaxis, cd2.json as stacknames, cd3.name as sideaxis, cd3.json as sidenames
    from cubes c join themes t on t.themeid=c.themeid
    left outer join cubedims cd1 on cd1.dimid=c.bardimid
    left outer join cubedims cd2 on cd2.dimid=c.stackdimid
    left outer join cubedims cd3 on cd3.dimid=c.sidedimid
    where cubeid=$cubeid";
    $result = runQuery($sql,"GetCubeSeries cube and dimensions");
    while($row = $result->fetch_assoc()){
        $output["name"] = $row["cubename"];
        $output["theme"] = $row["themename"];
        $output["units"] = $row["units"];
        $output["baraxis"] = $row["baraxis"];
        $output["barnames"] = $row["barnames"];
        $output["stackaxis"] = $row["stackaxis"];
        $output["stacknames"] = $row["stacknames"];
        $output["sideaxis"] = $row["sideaxis"];
        $output["sidenames"] = $row["sidenames"];
    }
    //fetch cube series
    if(!is_numeric($geoid)) $geoid = 0;
    $output["series"] = [];
    $freqClause = $sqlFreq?"sd.freq=$sqlFreq":"sd.freq=substring(si.freqs, 3, 1)";  //first matching frequency after the 'F_'
    $sql = "select s.name, sd.data, barorder, stackorder, sideorder
    from cubecomponents cc
    inner join sets s on cc.setid=s.setid
    left outer join (
      select cci.setid, data
      from cubecomponents cci join sets si on cci.setid=si.setid join setdata sd on cci.setid=sd.setid
      where cci.cubeid=$cubeid and sd.geoid = $geoid and $freqClause
    ) sd on cc.setid=sd.setid
    where cc.cubeid=$cubeid
    order by stackorder, sideorder, barorder";
    $result = runQuery($sql,"GetCubeSeries data");
    while($row = $result->fetch_assoc()){
        $output["series"][] = $row;
    }
}

function dataSliver($data, $period, $firstDt, $lastDt, $start, $end, $intervals=false){ //call only if jsStart and jsEnd are valid
    if($intervals){
        $points = explode('|', $data);
        $count = count($points);
        if($count > intval($intervals)){
            return implode("|",array_slice($points, $count-intval($intervals)));
        } else {
            return $data;
        }
    }  else {
        if($start!==null && $firstDt<$start){
            //trim left
            $startFound = strpos($data, "|".mdDateFromUnix($start/1000, $period).":");
            if($startFound){
                $data = substr($data, $startFound+2);
            } else {
                //TODO: crawl data in cases where start point is missing from sequence
                $points = explode('|', $data);
                for($i=0;$i<count($points);$i++){
                    $point = explode($points[$i],":");
                    if(unixDateFromMd($point[0])>=$start/1000){
                        $data = implode("|",array_slice($points, $i));
                        break;
                    }
                }
            }
        }
        if($end!==null && $lastDt<$end){
            //trim right
            $endFound = strpos($data, "|".mdDateFromUnix($end/1000, $period).":");
            if($endFound){
                $next = strpos($data, "|", $endFound+1);
                if($next){
                    return substr($data, $endFound+1, $next - $endFound -1 );
                } else return $data; //this should never happen
            } else {
                //TODO: crawl data in cases where end point is missing from sequence
                $points = explode('|', $data);
                for($i=count($points)-1;$i>0;$i--){
                    $point = explode($points[$i],":");
                    if(unixDateFromMd($point[0])<=$end/1000){
                        $data = implode("|",array_slice($points, 0, $i+1));
                        break;
                    }
                }
            }
        }
    }
    return $data;
}
function validationCode($email){return md5('mashrocks'.$email."lsadljjsS_df!4323kPlkfs");}
function emailAdminInvite($email, $name='', $adminid=0, $orgid=0){
//resend invitation if exists, otherwise create and sends invitation.  To make, $adminid required
    global $db, $MAIL_HEADER;
    $msg = "";
    $sqlInvite = "select admin.name as admin, orgname, invdate, regcode,  "
        ." from invitations i, organizations o, users admin "
        ." where i.orgid=o.orgid and i.adminid=admin.userid and i.email = " . safeStringSQL($email);
    $result = runQuery($sqlInvite, "emailAdminInvite");
    if($result->num_rows==1){
        $msgRow = $result->fetch_assoc();
        $msg = "This notification was first sent ".$msgRow["invdate"].":\n\n";
    } else {
        /*DO NOT CREATE USER : THIS WILL GET CREATED WHEN
        //first check for user
        $sqlUser = "select * from users where email = ".safeSQLFromPost("email");
        $result = runQuery($sqlUser, "emailAdminInvite: check");
        if($result->num_rows==1){
            $row = $result->fetch_assoc();
            $userid = $row["userid"];
          } else {
            $sql = "insert into users (email, orgid, subscriptionlevel) values (".safeStringSQL($email).",".$orgid.",'C')";
            if(!runQuery($sql,"emailAdminInvite")){
                return false;
            }
            $userid = $db->insert_id;
        }*/
        if($adminid==0) return false;  //FAIL!
        $sql = "insert into invitations (email, name, regcode, orgid, adminid, invdate, status) values ("
            . safeStringSQL($email).","
            . safeStringSQL($name).","
            . "'".md5("mashrocks".microtime())."',"
            . $orgid.","
            . $adminid.", NOW(),'open')";
        if(!$result = runQuery($sql, "emailAdminInvite: insert invite")) return false;
        $invid = $db->insert_id;
        $result = runQuery($sqlInvite, "emailAdminInvite: second read");
        $msgRow = $result->fetch_assoc();
        if(!bill($adminid,0,$invid)) {
            return false;
        }
    }
    $msg .= "A MashableData.com account has been created for ".(strlen($msgRow["name"])>0?$msgRow["name"]:"you")." by "
        .(strlen($msgRow["admin"])>0?$msgRow["admin"]:"the administrator of the MashableData corporate account")." for "
        .$msgRow["orgname"].".  Go to http://wwwmashabledata.com/workbench and create an account using this email address.  When asked for a registration code, please use the following:/n/n"
        ."Registration code: ".$msgRow["regcode"]."/n/nTo learn more about the MashableData analysis and visualization capabilities, please visit http://www.mashabledata.com";
    return mail($msgRow['email'],"Registration code for MashableData", $msg, $MAIL_HEADER);
}
/*
function emailRootInvite($email, $orgid){
    if($makeUserAccount){
        //1. get info for admin and org based on userid = adminid  (not checking o.userid = billing account.  multiple admins possible)
        $sql = "select name, orgid, u.orgid, orgname from users u, organizations o where u.orgid=o.orgid and u.userid = ". $adminid;
        $result = runQuery($sql, "invite");
        if($result->num_rows!=1){
            return(array("status"=>"Admin lookup error"));
        }
        $adminRow = $result->fetch_assoc();
        $orgid = $adminRow["orgid"];
        $sql = "select * from users where orgid = ".$adminRow["orgid"] . " and email=".safeStringSQL($email);
        $userResult = runQuery($sql, "invite");
        if($userResult->num_rows==0){
            $sql = "insert into users (email, name, orgid) values(". safeStringSQL($email) .",". safeStringSQL($name) .",". $adminRow["orgid"].")";
            runQuery($sql,"invite");
            $userid = $db->insert_id;
            bill($userid, $orgid);  //bill newly created accounts immediately
        } else {
            $userRow = $userResult->fetch_assoc();
            $userid = $userRow["userid"];
        }
    }
    $sql = "insert into invitations (email, invdate, regcode) values ('".safeStringSQL("email")."', NOW(), '" . md5("mashrocks".microtime())."'";
    $result = runQuery($sql, "invite");
    mail()
    $msg =
}*/
function bill($payerid, $userid=0, $invid=0){  //adds a payments record if none open; adds a paymentdetails record, and either queue for nightly batch processing or call payBill() for immediately processing
    //note:  for ind, $userid and $payerid will be the same.
    //for an invitation, $userid will be null
    //extending the users subscription level and expiration date is done in payBill() if called.
    //Returns true on success; false on failure or if user has > 15 days left
    global $db, $SUBSCRIPTION_RATE;
    //1. get payerinfo:  if not payerid provided, userid is the payer
    $sql = "select userid, orgid, name, email, ccname, cctype, ccadresss, cccity, ccstateprov, ccpostal cccountry, ccnumber, ccexpiration, ccstatus "
        ." where userid = ".$payerid;
    $result = runQuery($sql, "bill");
    if($result->num_rows!=1) {
        logEvent("billing failure","payerid ".$payerid." does not exist");
        return false;
    }
    $payerInfo = $result->fetch_assoc();
    //2. if No card or 3 or more failures, do not create any records.  Return false.
    //  Note the when user modifies thier CC info, the ccstatus will be changed to 'U' for unverified.
    //  This will permit future payment attempts after the user is notifiied and changes thier CC info
    if($payerInfo["ccstatus"]=='N' || intval($payerInfo["ccstatus"])>2) {
        logEvent("billing failure","card with bad ccstatus attempted by payerid  ".$payerInfo["userid"]);
        return false;
    }elseif($payerInfo["ccnumber"]==null ) {
        logEvent("billing failure","no cc on record for payerid=".$payerInfo["userid"]);
        return false;
    }
    //3. get either user info or invite info...
    if($userid>0){ //  We are billing for a user > get user info
        //2. get user info
        $sql = "select subscriptionlevel, expires, o.orgid, o.userid as adminid "
            ." from users u left outter join organizations o on u.orgid=o.orgid "
            ." where u.userid=".$userid;
        $result = runQuery($sql, "bill");
        if($result->num_rows!=1) {
            logEvent("billing failure","attempted to bill payerid ".$payerInfo["userid"].", but userid supplied not found");
            return false;
        }
        $userInfo = $result->fetch_assoc();
        /*if(intval($userInfo["adminid"])>0){
            $payerid = $userInfo["adminid"];
            $corp = true;
        } else {
            $payerid = $userid;
            $corp = false;
        }*/
    } elseif($invid>0){ // We are billing for an invitation sent by an admin > get invite info
        $sql = "select * from invitations where invid = ".$invid;
        $result = runQuery($sql, "bill");
        if($result->num_rows!=1) {
            logEvent("billing failure","attempted to bill payerid ".$payerInfo["userid"]." but invid supplied not found");
            return false;
        }
        $invInfo = $result->fetch_assoc();
    } else {  //neither invid nor userid supplied
        logEvent("billing failure","attempted to bill payerid ".$payerInfo["userid"]." but no user or invite supplied");
        return false;
    }
    //4.get a payments record
    //4A. check to see if open payment record exists
    $sql = "select * from payments where userid = ".$payerInfo["userid"]." and status = 'open'";
    $result = runQuery($sql,"bill: get open payment header");
    if($result->num_rows!=0){
        $row = $result->fetch_assoc();
        $paymentid = $row["paymentid"];
    } else {
        //4B. no existing payments header record exists > create one
        $sql = "insert into payments "
            . " (orgid, userid, ip_address, name, email, cccardlast4, company, ccadresss, cccity, ccstateprov, ccpostal, cccountry, ccnumber, ccyear, ccname, cctype, status, charge) "
            . " values ("
            . (intval($payerInfo["orgid"])==0?"null":$payerInfo["orgid"]).","
            . safeStringSQL($payerInfo["userid"]).","
            . safeStringSQL($_SERVER["REMOTE_ADDR"]).","
            . safeStringSQL($payerInfo["name"]).","
            . safeStringSQL($payerInfo["email"]).","
            . safeStringSQL($payerInfo["cccardlast4"]).","
            . safeStringSQL($payerInfo["company"]).","
            . safeStringSQL($payerInfo["ccadresss"]).","
            . safeStringSQL($payerInfo["cccity"]).","
            . safeStringSQL($payerInfo["ccstateprov"]).","
            . safeStringSQL($payerInfo["ccpostal"]).","
            . safeStringSQL($payerInfo["cccountry"]).","
            . safeStringSQL($payerInfo["ccnumber"]).","
            . safeStringSQL($payerInfo["ccyear"]).","
            . safeStringSQL($payerInfo["ccname"]).","
            . safeStringSQL($payerInfo["cctype"]).","
            . "'open',"
            . $SUBSCRIPTION_RATE.")";
        $result = runQuery($sql,"bill: insert payment record");
        if(!$result) {
            logEvent("billing failure","payments header record insert failure for payerid  ".$payerInfo["userid"]);
            return false;
        }
        $paymentid = $db->insert_id;
    }
//TODO: check for duplicate paymentdetail recors
    //5. insert payment detail record
    $sql = "insert into paymentdetails (paymentid, orgid, userid, invid, name, email, subscription, subscriptionmonths, price) values "
        . $paymentid.","
        . (intval($userInfo["orgid"])==0?"null":$userInfo["orgid"]).","
        . ($userid>0?$userid:"null").","
        . ($invid>0?$invid:"null").","
        . ($userid>0?safeStringSQL($userInfo["name"]):safeStringSQL($invInfo["name"])).","
        . ($userid>0?safeStringSQL($userInfo["email"]):safeStringSQL($invInfo["email"])).","
        . (intval($userInfo["orgid"])==0?"'Corp'":"'Indiv'").","
        . "6,"
        . $SUBSCRIPTION_RATE . ")";
    $result = runQuery($sql,"bill: insert payment record");
    if(!$result) {
        logEvent("billing failure","paymentdetails record create failure for payerid  ".$payerInfo["userid"]);
        return false;
    }
    //6. process if individual or credit card is unverified or has prior failure
    if(intval($payerInfo["orgid"])==0 || $payerInfo["ccstatus"]!="U" || intval($payerInfo["ccstatus"])>0){
        return payBill($paymentid);
    }
    return true;
}
function payBill($paymentid){
    //TODO: merchant credit card processing here
    return true;
}