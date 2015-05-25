<?php
$event_logging = true;
$sql_logging = true;
$ft_join_char = "_";
$web_root = "/var/www/vhosts/mashabledata.com/httpdocs";
$cacheRoot = "/var/www/vhosts/mashabledata.com/cache/";  //outside the webroot = cannot be surfed
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
 *              series [(sid, transform, transformstart, transformend)]
 *   optional: gid, start, end
 *
 * COMMENTED OUT: ManageMyComposites > status=OK
 *   uid: required
 *   sid: required
 *   jsts: javascript time stamp of when this happened
 *   to: 'H' | 'S' | anything else to delete (required)
 *
 * command: ManageMySeries > status=OK
 *   uid: required
 *   sid: required
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
 *   setid:
 * command: GetAnnotations    (anonymous permitted for standard only)
 *   type: M|S (my or standard
 * command: GetAnnotation     (anonymous permitted)
 *   annoid:
*/
$time_start = microtime(true);
if(isset($_REQUEST['command']))
$command =  isset($_REQUEST['command'])?$_REQUEST['command']:(isset($command)?$command:"");
$con = getConnection();
switch($command) {
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
        $output = array("status" => "logged");
        break;
    case "NewSearchSeries":
        if (isset($_POST["uid"]) && intval($_POST["uid"]) > 0 && $_POST["uid"] != null) {
            $usageTracking = trackUsage("count_seriessearch");
        }
        $search = rawurldecode($_POST['search']);
        $freq = str_replace("'", "''", $_POST['freq']);
        $mapFilter = str_replace("'", "''", $_POST['mapfilter']);
        $apiid = $_POST['apiid'];
        $catid = intVal($_POST['catid']);
        $setType = $_POST['settype'];
        if (count($search) == 0 || count($freq) == 0) die("invalid call.  Err 101");
        $sLimit = " ";
        $foundGeos = [];
        if (isset($_POST['iDisplayStart']) && $_POST['iDisplayLength'] != '-1') {
            $sLimit = " LIMIT " . $db->real_escape_string($_POST['iDisplayStart']) . ", "
                . $db->real_escape_string($_POST['iDisplayLength']);
        }
        $aColumns = array("name", "units", "elements", "firstdt", "lastdt");
        //$sql = "SELECT SQL_CALC_FOUND_ROWS ifnull(concat('U',s.userid), concat('S',s.setid)) as handle , s.setid, s.userid, mapsetid, pointsetid, name, units, freq as freq, title, src, url, ";
        $sql = "SELECT SQL_CALC_FOUND_ROWS
        left(s.settype,1) as settype, s.setid, s.latlon, s.mastersetid, s.userid, s.name, s.units,
        replace(coalesce(s2.freqs, s.freqs),'F_','') as freqs, s.titles, coalesce(s.src, a.name) as src,
        coalesce(s.url, a.url) as url, s.firstsetdt100k*100000 as firstdt, s.lastsetdt100k* 100000 as lastdt,
        s.apiid, replace(coalesce(s2.maps, s.maps),'M_','') as maps, s.ghandles, s.elements
        FROM sets s left outer join apis a on s.apiid=a.apiid left outer join sets s2 on s.mastersetid=s2.setid ";
        //problem: the url may be stored at the setdata level = too costly to join on every search THEREFORE  move URL link to quick view
        //handle may be modified in read loop depending on detected geographies and
        if ($catid > 0) {
            //1. if category search, this is simple
            $sql .= " INNER JOIN categorysets cs on s.setid = cs.setid WHERE catid=$catid";
        } else {
            //2. look for geo matching and search sets if
            if ($search != '+ +') {
                $geoSearch = str_replace("+", "", $search);
                $geoSQL = "select geoid, name, keywords, confirmwords, exceptex,
                    match(keywords) against ('$geoSearch' IN BOOLEAN MODE) as keyrel,
                    match(confirmwords) against ('$geoSearch' IN BOOLEAN MODE) as confirmrel
                    from geographies
                    where match(keywords) against ('$geoSearch' IN BOOLEAN MODE) and type <> 'X'
                    order by match(keywords) against ('$geoSearch' IN BOOLEAN MODE) desc, match(confirmwords) against ('$geoSearch' IN BOOLEAN MODE) desc";
                $result = runQuery($geoSQL);
                $keyRel = null;
                $confirmRel = null;
                //$searchWords = explode(" ", preg_replace("#\s{2,}#"," ", preg_replace("#[^\D\d-]#"," ",$geoSearch)));
                while ($aRow = $result->fetch_assoc()) {
                    if ($keyRel === null) {
                        $keyRel = $aRow["keyrel"];
                        $confirmRel = $aRow["confirmrel"];
                    } elseif ($keyRel != $aRow["keyrel"] || $confirmRel != $aRow["confirmrel"]) {
                        break;
                    }
                    //2. top matching geo(s)
                    $geoWords = explode(" ", preg_replace("#[;,:-]#", " ", strtolower($aRow["name"] . " " . $aRow["keywords"] . " " . $aRow["confirmwords"])));
                    $searchWords = $search . " ";
                    foreach ($geoWords as $geoWord) {
                        $searchWords = str_replace("+" . $geoWord . " ", " ", $searchWords);
                    }
                    $foundGeos["G_" . $aRow["geoid"]] = [
                        "seachWords" => $searchWords,
                        "name" => $aRow["name"]
                    ];
                }
            }
            //SEARCH AND FILTER SECTION
            $sql = $sql . " WHERE 1 ";
            //2. search for sets with matching geo or all
            if (strpos($search, 'title:"') === 0) { //ideally, use a regex like s.match(/(title|name|skey):"[^"]+"/i)
                $title = substr($search, strlen("title") + 2, strlen($search) - strlen("title") - 3);
                $sql .= " AND title = " . safeStringSQL($title);
            } elseif ($search != '+ +' || $mapFilter <> "none" || $freq != "all" || $setType != "all") {
                $periodTerm = $freq == "all" ? "" : " +F_" . $freq;
                $mapTerm = $mapFilter == "none" ? "" : " +M_" . $mapFilter;
                $setTypeTerm = $setType == "all" ? "" : " +" . $setType . "S_";
                $mainBooleanSearch = "($search $periodTerm $mapTerm $setTypeTerm)";
                foreach ($foundGeos as $ghandle => $geoSearchDetails) {
                    $geoSearchWords = $geoSearchDetails["seachWords"];
                    $mainBooleanSearch .= " ($geoSearchWords $periodTerm $setTypeTerm $mapTerm +$ghandle)"; //OR implied
                }
                $sql .= " AND match(s.name, s.units, s.titles, s.ghandles, s.maps, s.settype, s.freqs) against ('-not_searchable $mainBooleanSearch' IN BOOLEAN MODE) ";  //straight search with all keywords
                //freqs field default to 'not_searchable' on insert and gets set after ingestion when setCounts and
            }
            if (is_numeric($apiid)) {
                $sql .= " AND s.apiid = " . intval($apiid);
            } elseif ($apiid == "org") { //for security, the orgid is not passed in.  rather, if it is fetched from the users account
                requiresLogin(); //sets $orgid.  Dies if not logged in
                $sql .= " AND orgid = " . $orgid;
            } else {  //open search = must filter out orgs series that are not my org
                if (isset($_POST["uid"]) && intval($_POST["uid"]) > 0) {
                    requiresLogin(); //sets $orgid.  Dies if not logged in, but we should be because a uid was passed in
                    $sql .= " AND (s.orgid is null or s.orgid = " . $orgid . ") ";
                } else {
                    $sql .= " AND s.orgid is null ";
                }
            }
        }
        /*
         * Ordering
         */
        $sOrder = '';
        if (isset($_POST['iSortCol_0'])) {
            $sOrder = " ORDER BY  ";
            for ($i = 0; $i < intval($_POST['iSortingCols']); $i++) {
                if ($_POST['bSortable_' . intval($_POST['iSortCol_' . $i])] == "true") {
                    $sOrder .= $aColumns[intval($_POST['iSortCol_' . $i])] . " " . $db->real_escape_string($_POST['sSortDir_' . $i]) . ", ";
                }
            }
            $sOrder = substr_replace($sOrder, "", -2);
            if (strlen($search) > 0 && $sOrder == " ORDER BY") {  // show shortest results first, but only if the user actually entered keywords
                $sOrder = " ORDER BY s.namelen asc ";
            }
        }
        if ($search != '+ +' && $sOrder == "") {  // show shortest results first, but only if the user actually entered keywords
            if ($catid == 0) {
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
        $rResultFilterTotal = runQuery($sQuery) or die($db->error());
        $aResultFilterTotal = $rResultFilterTotal->fetch_array();
        $iFilteredTotal = $aResultFilterTotal[0];
        /* Total data set length */
        /* $sQuery = "SELECT COUNT(setid)FROM series";
         $rResultTotal = runQuery( $sQuery ) or die($db->error());
         $aResultTotal = $rResultTotal->fetch_array();
         $iTotal = $aResultTotal[0];*/
        $iTotal = 10000000;  // no need to run the count everytime as the workbench does not display it
        $output = array("status" => "ok",
            "sEcho" => intval($_POST['sEcho']),
            "iTotalRecords" => $iTotal,
            "iTotalDisplayRecords" => $iFilteredTotal,
            "search" => $search,
            "aaData" => array()
        );
        if (isset($usageTracking["msg"])) $output["msg"] = $usageTracking["msg"];
        $aRows = [];
        $searchWords = trim(str_replace("+", "", $search));
        $searchWords = count($searchWords) == 0 ? false : explode(" ", $searchWords);
        $geoSearched = count($foundGeos) > 0;
        while ($aRow = $result->fetch_assoc()) { //handle, setid, mastersetid, userid, name, units, freq, title, src, url, firstdt, lastdt, apiid, maps, ghandles
            $found = false;
            if ($geoSearched) {
                //two pass output if geosearched = check for straight set match followed by check for ghandle match
                $aRows[] = $aRow;
                $straightMatch = true;
                $textFields = $aRow["name"] . " " . $aRow["units"] . " " . $aRow["titles"];
                foreach ($searchWords as $searchWord) {
                    if (stripos($textFields, $searchWord) === false) {
                        $straightMatch = false;
                        break;
                    }
                }
                if ($straightMatch == true) {
                    unset($aRow["ghandles"]);
                    $output['aaData'][] = $aRow;
                }
            } else {
                unset($aRow["ghandles"]);
                $output['aaData'][] = $aRow;
            }
        }
        if ($geoSearched) {
            foreach ($aRows as $aRow) {
                foreach ($foundGeos as $ghandle => $geoSearchDetails) {
                    if (strpos($aRow["ghandles"] . ",", "$ghandle,") !== false) {
                        $thisRow = $aRow; //copy
                        unset($thisRow["ghandles"]);
                        $thisRow["name"] .= ": " . $geoSearchDetails["name"];
                        $thisRow["geoid"] = intval(str_replace("G_", "", $ghandle));
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
        if (!$usageTracking["approved"]) {
            $output = array("status" => $usageTracking["msg"]);
            break;
        }
        $search = $_POST['search'];
        //$freq =  $_POST['freq'];
        //$user_id =  intval($_POST['uid']);
        if (count($search) == 0) die("invalid call.  Err 106");
        $sLimit = " ";
        if (isset($_POST['iDisplayStart']) && $_POST['iDisplayLength'] != '-1') {
            $sLimit = " LIMIT " . $db->real_escape_string($_POST['iDisplayStart']) . ", "
                . $db->real_escape_string($_POST['iDisplayLength']);
        }
        $aColumns = array("g.title", "g.map", "g.text", "g.serieslist", "views", "ifnull(g.updatedt , g.createdt)");
        $sql = "SELECT g.graphid, g.title, map, text as analysis, g.cubeid, serieslist, ghash, views, "
            //not used and cause problems for empty results = row of nulls returned. "  ifnull(g.fromdt, min(s.firstdt)) as fromdt, ifnull(g.todt ,max(s.lastdt)) as todt, "
            . " ifnull(updatedt, createdt) as modified "
            . ", mapsets, pointsets "
            . " FROM graphs g "
            . " left outer join (select graphid, count(type) as mapsets from graphplots where  type='M' group by graphid) gpm on g.graphid=gpm.graphid "
            . " left outer join (select graphid, count(type) as pointsets from graphplots where type='X' group by graphid) gpx on g.graphid=gpx.graphid "
            . " WHERE published='Y' ";
        if ($search != '+ +') {
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
        if (isset($_POST['iSortCol_0'])) {
            $sOrder = "ORDER BY  ";
            for ($i = 0; $i < intval($_POST['iSortingCols']); $i++) {
                if ($_POST['bSortable_' . intval($_POST['iSortCol_' . $i])] == "true") {
                    $sOrder .= $aColumns[intval($_POST['iSortCol_' . $i])] . " " . $db->real_escape_string($_POST['sSortDir_' . $i]) . ", ";
                }
            }
            $sOrder = substr_replace($sOrder, "", -2);
            if ($sOrder == "ORDER BY") {
                $sOrder = " ORDER BY createdt desc ";
            }
        } else {
            $sOrder = " ORDER BY createdt desc ";
        }
        $sql = $sql . $sOrder . $sLimit;
        $log = "";
        foreach ($_POST as $key => $value) {
            $log = $log . $key . ": " . $value . ';';
        };
        logEvent("SearchGraphs POST", $log);
        $result = runQuery($sql, "SearchGraphs");
        /* Data set length after filtering */
        $sQuery = "
           SELECT FOUND_ROWS()
       ";
        //echo($sQuery . "<br>");
        $rResultFilterTotal = runQuery($sQuery) or die($db->error());
        $aResultFilterTotal = $rResultFilterTotal->fetch_array();
        $iFilteredTotal = $aResultFilterTotal[0];
        /* Total data set length */
        /*      $sQuery = "SELECT COUNT(graphid) FROM graphs";
              $rResultTotal = runQuery( $sQuery ) or die($db->error());
              $aResultTotal = $rResultTotal->fetch_array();
              $iTotal = $aResultTotal[0];*/
        $iTotal = 0;  //don't bother fetching this value as it is not displayed or otherwise used
        $output = array("status" => "ok",
            "sEcho" => intval($_POST['sEcho']),
            "iTotalRecords" => $iTotal,
            "iTotalDisplayRecords" => $iFilteredTotal,
            "aaData" => array()
        );
        if (isset($usageTracking["msg"])) $output["msg"] = $usageTracking["msg"];
        while ($aRow = $result->fetch_assoc()) {
            $output['aaData'][] = $aRow;
        }
        break;
    case "GetMySets":
        requiresLogin();
        $user_id = intval($_POST['uid']);
        $sql = "SELECT  s.userid, u.name as username, s.name, setkey as sourcekey, s.setid, left(s.settype,1) as settype,
            maps, titles as categories, s.metadata as setmetadata, null as 'decimal', src, s.url, s.units,
            savedt, ms.preferredmap, freqs, firstsetdt100k*100000 as firstsetdt, lastsetdt100k*100000 as lastsetdt
            FROM sets s
            inner join  mysets ms on s.setid=ms.setid
            left outer join users u on s.userid=u.userid
            WHERE ms.userid=" . $user_id;
        $result = runQuery($sql);
        $output = array("status" => "ok", "series" => array());
        while ($aRow = $result->fetch_assoc()) {
            $aRow["rawmaps"] = $aRow["maps"];
            $aRow["maps"] = mapsFieldCleanup($aRow["maps"]);
            $aRow["freqs"] = freqsFieldToArray($aRow["freqs"]);
            $output["sets"][handle($aRow)] = $aRow;
        }
        break;
    case "GetMyGraphs":   //get only skeleton.  To view graph, will require call to GetGraph
        requiresLogin();
        $user_id = intval($_POST['uid']);
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
        $output = ["status" => "ok", "graphs" => []];
        while ($aRow = $result->fetch_assoc()) $output["graphs"]["G" . $aRow["gid"]] = $aRow;
        break;
    case "GetFullGraph":  //data and all: the complete protein!
        $ghash = $_REQUEST['ghash'];
        if (strlen($ghash) > 0) {
            //1. fetch
            $output = getGraphs(0, $ghash);
            //2. check credential
            if (isset($_POST["uid"]) && isset($output['userid']) && $output['userid'] == intval(safePostVar("uid"))) {
                requiresLogin();  //login not required, but if claiming to be the author then verify the token
            } else {
                $output['userid'] = null;  //cannot save graph; only save as a copy
            }
        } else {
            $output = array("status" => "The graph requested not available.  The author may have unpublished or deleted it.");
        }
        break;
    case "GetEmbeddedGraph":  //data and all: the complete protein!
        //embedded graphs make requests to /graph_data which checks the cache first
        //so if here, the cache is old or missing!
        if(!isset($ghash)) $ghash = $_REQUEST['ghash'];
        if (strlen($ghash) > 0) {
            $ghash_var = safeStringSQL($ghash);
            //2. fetch if not in cache or needs refreshing
            $output = getGraphs(0, $ghash);
            //trim data based on graph end, start and interval dates using dataSliver()
            foreach ($output["graphs"] as $ghandle => &$graph) {
                foreach ($graph["assets"] as $ahandle => &$asset) {
                    unset($asset["maps"]);
                    unset($asset["freqs"]);
                    if($graph["start"] || $graph["end"] || $graph["intervals"]) {
                        $parts = explode("G", $ahandle);
                        if(count($parts)==1) {
                            foreach ($asset["data"] as $key => &$series) {
                                $output["graphs"][$ghandle]["assets"][$ahandle]["data"][$key]["data"] = dataSliver($series["data"], $asset["freq"], $series["firstdt"], $series["lastdt"], $graph["start"], $graph["end"], $graph["intervals"]);
                            }
                        } else {
                            $asset["data"] = dataSliver($asset["data"], $asset["freq"], $asset["firstdt"], $asset["lastdt"], $graph["start"], $graph["end"], $graph["intervals"]);
                        }
                    }
                }

                //2. check uid...
                if(isset($_POST["uid"]) && isset($graph['userid']) && $graph['userid'] == intval(safePostVar("uid"))) {
                    requiresLogin();  //login not required, but if claiming to be the author then verify the token
                } else {
                    $graph['userid'] = null;  //cannot save graph; only save as a copy
                    $graph['gid'] = null;
                }
                //3. create / update cache file

                $cacheSubPath = substr($ghash, 0, 2) . "/" . substr($ghash, 2, 2) . "/";
                if (!is_dir($cacheRoot . $cacheSubPath)) {
                    mkdir($cacheRoot . $cacheSubPath, 0755, true);
                }
                $cacheFile = "MashableData.globals.graphBluePrints['".$ghash."'] = ".json_encode($output["graphs"][$ghandle], JSON_HEX_QUOT);
                $cfp = fopen($cacheRoot . $cacheSubPath . $ghash.".js", 'w');
                if (flock($cfp, LOCK_EX)) {
                    fwrite($cfp, $cacheFile);
                }
                fclose($cfp);
                flushCloudFlare($ghash);
            }
        } else {
            $output = ["status" => "The graph requested not available.  The author may have unpublished or deleted it."];
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
        $output = ["status" => "ok", "assets" => []];
        if ($series = (isset($_POST["series"]) && count($_POST["series"]) > 0) ? $_POST["series"] : false) {
            $sql = "select s.metadata as setmetadata, s.name, sd.setid, sd.geoid, sd.freq, s.freqs, sd.latlon, s.maps, g.name as geoname
            from sets s join setdata on s.setid=sd.setid left outer join geographies on sd.geoid=g.geoid where ";
            $filters = [];
            foreach ($series as $serie) {
                $filter = "(s.setid= $serie[setid] and sd.freq=$serie[freq]";
                if (isset($serie["geoid"])) $filter .= " and sd.geoid=$serie[geoid]";
                if (isset($serie["latlon"])) $filter .= " and sd.latlon=$serie[latlon]";
                elseif (!isset($serie["geoid"])) $filter .= " and sd.geoid=0";  //cannot have a series without a defining geo or latlon
                $filter .= ")";
                $filters[] = $filter;
            }
            $sql .= implode(" OR ", $filters);
            $result = runQuery($sql, "GetSets: series");
            while ($row = $result->fetch_assoc()) {
                $handle = $row["type"] . $row["setid"] . $row["freq"] . "G" . $row["setid"] . ($row["latlon"] ? "L" . $row["latlon"] : "");
                $output["assets"][$handle] = $row;
            }
        }
        if ($map = isset($_POST["map"]) ? $_POST["map"] : false) {
            $output["map"] = $map;
            if ($mapSets = (isset($_POST["mapSets"]) && count($_POST["mapSets"]) > 0) ? $_POST["mapSets"] : false) {
                getMapSets($output["assets"], $map, $mapSets, true, true);
            }
            if ($pointSets = (isset($_POST["pointSets"]) && count($_POST["pointSets"]) > 0) ? $_POST["pointSets"] : false) {
                getPointSets($output["assets"], $map, $pointSets, true);
            }
        }
        break;
    case "GetAvailableMaps":
        $mapsetid = intval($_POST["mapsetid"]);
        $pointsetid = intval($_POST["pointsetid"]);
        if (isset($_POST["geoid"])) {
            $geoid = intval($_POST["geoid"]);
        } else {
            $geoid = 0;
        }
        $sql = "select m.name, jvectormap, geographycount, count(s.geoid) as setcount "
            . " from series s, maps m, mapgeographies mg "
            . " where m.map=mg.map and mg.geoid=s.geoid";
        if ($mapsetid > 0) $sql .= " and s.mapsetid=" . $mapsetid . " and s.pointsetid is null";
        if ($pointsetid > 0) $sql .= " and s.pointsetid=" . $pointsetid . " and s.mapsetid is null";
        if ($geoid > 0) $sql .= " and m.map in (select map from mapgeographies where geoid = " . $geoid . ")";
        $sql .= " group by m.name, geographycount ";
        if ($pointsetid > 0 && $geoid > 0) {
            $sql .= " union select m.name, jvectormap, geographycount, count(s.geoid) as setcount  from series s, maps m where bunny=s.geoid and s.pointsetid=" . $pointsetid . " and s.geoid = " . $geoid;
        } else {
            $sql .= " order by count(s.geoid)/geographycount desc";
        }
        $output = array("status" => "ok", "maps" => array());
        $result = runQuery($sql, "GetAvailableMaps");
        while ($row = $result->fetch_assoc()) {
            array_push($output["maps"], array("name" => $row["name"], "file" => $row["jvectormap"], "count" => ($mapsetid != 0) ? $row["setcount"] . " of " . $row["geographycount"] : $row["setcount"] . " locations"));
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
        $result = runQuery($sql, "GetMapsList");
        $output = array("status" => "ok", "maps" => array());
        while ($row = $result->fetch_assoc()) {
            $row["name"] = utf8_encode($row["name"]);  //this is an unsatisfying band-aid, not a global solution
            $output["maps"][$row['map']] = $row;
        }
        break;
    case "GetMapGeographies":  //used by user sets to get a list of geographies
        //get map bunny and the map's geographies' containers to allow user to show tracking data in supplementary map vizes
        //for pointsets, do not return counties or NUTS.  Just states / countries
        $type = $_REQUEST["settype"];
        $sqlMap = safeSQLFromPost('map');
        //bunny
        // + intermediate containing geos

        // + detailed geogeos (if map or not contained or container not map bunny)
        //1. map bunny (always get)
        $sql1 = "select 'bunny' as type, g.geoid, g.name, 'A' as jvorder
          from geographies g join maps m on g.geoid=m.bunny
          where map=$sqlMap";

        //2. intermediates (avoid member that have not containing id (e.g. latvia) for mapset as that will be capture by $sql3
        $sql2 = "select distinct 'region' as type, coalesce(cg.geoid, g.geoid) as geoid, coalesce(cg.name, g.name) as name, coalesce(cg.jvsort, cg.jvectormap, g.jvsort, g.jvectormap) as jvorder
          from maps m join mapgeographies mg on m.map=mg.map join geographies g on mg.geoid=g.geoid left outer join geographies cg on g.containingid = cg.geoid
          where m.map=$sqlMap ";
        if($type == "X")
            $sql2 .= " order by name ";
        else
            $sql2 .= " and g.containingid is not null";
        $sql = $sql1 . " UNION DISTINCT " . $sql2;

        //3. for mapsets, grab all the mapgeographies
        if($type == "M") $sql .=
            " UNION DISTINCT
                select distinct 'sub' as type, g.geoid, g.name, coalesce(g.jvsort, g.jvectormap) as jvorder
                from mapgeographies mg join geographies g on mg.geoid=g.geoid
                where mg.map=$sqlMap
            order by jvorder ";  //used as a ordering code to group countries/states with their sub-admiistrative districts

        $result = runQuery($sql, "GetMapGeographies");
        $output = ["status" => "ok", "geographies" => []];
        while ($row = $result->fetch_assoc()) {
            $row["name"] = utf8_encode($row["name"]);  //this is an unsatisfying band-aid, not a global solution
            $output["geographies"][] = $row;
        }
        break;
    case "GetCubeList":
        if (!isset($_POST["themeids"]) || !isset($_POST["setids"])) {
            $output = ["status" => "must provide  valid set and theme id"];
            break;
        }
        $setids = implode(",", cleanIdArray($_POST["setids"]));
        $themeids = implode(",", cleanIdArray($_POST["themeids"]));
        $output = ["status" => "ok", "cubes" => []];
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
        $result = runQuery($sql, "GetCubeList root totals");
        while ($row = $result->fetch_assoc()) {
            $output["cubes"][] = ["name" => $row["name"], "units" => $row["units"], "cubeid" => $row["cubeid"], "type" => $row["relation"]];  //organize by setid because they will be attached to components and available for graph level op
        }
        break;
    case "GetCubeSeries":
        if (!isset($_REQUEST["geokey"]) || !isset($_REQUEST["cubeid"])) {
            $output = ["status" => "invalid cube id or geography"];
        } else {
            $cubeid = intval($_REQUEST["cubeid"]);
            $geokey = $_REQUEST["geokey"];
            $freq = safeSQLFromPost("freq");
            //1. check cache
            $currentmt = microtime(true);
            $ghash_var = safeStringSQL($cubeid . ":" . $geokey);
            $sql = "select createmtime, coalesce(refreshmtime, createmtime) as lastrefreshtime, graphjson from graphcache where ghash=$ghash_var";
            $result = runQuery($sql);
            if ($result->num_rows == 1) {
                $row = $result->fetch_assoc();
                $age = $currentmt - $row['createmtime'];
                if ($age < $cache_TTL * 60 * 1000 && ($row['lastrefreshtime'] == null || $currentmt - $row['lastrefreshtime'] < 60 * 1000)) { //TTL = 15 minutes, with a 60 second refresh lock
                    //cache good! (or another refresh in progress...)
                    $cube_json = (string)$row["graphjson"];
                    $output = json_decode($cube_json, true, 512, JSON_HEX_QUOT);
                    $output["cache_age"] = $age / 1000 . "s";
                } else {
                    //cache needs refreshing (give this thread 10 seconds to create new object and update db below
                    runQuery("update graphcache set refreshmtime = coalesce(refreshmtime, createmtime)+10000 where ghash=$ghash_var");
                }
            }
            if (!isset($output)) {
                //2. fetch if not in cache or needs refreshing
                $output = ["status" => "ok", "cubeid" => $cubeid, "geokey" => $geokey];
                //todo:  check for latlon geokey and geoid geokey. For now, aussume jvectormap code
                if (is_numeric($geokey)) {
                    $geoid = $geokey;
                } else {
                    $sql = "select geoid from geographies where jvectormap=" . safeStringSQL($geokey)
                        . " order by geoid";  //HACK!!! France (76) ahead of metropolitan France (6255)
                    $result = runQuery($sql);
                    if ($result->num_rows > 0) {  //FR has two:  return FRA (76) not metropolitan France (6255)
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
            if (isset($_REQUEST["host"]) && strpos($_REQUEST["host"], "mashabledata.com") === false) {
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
            . " where g1.geoid=$fromGeoId and g2.geoid=$toGeoId";
        $result = runQuery($sql, "ChangeMaps: get bunny regex");
        $output = $result->fetch_assoc();
        $output["status"] = "ok";
        if (isset($_POST["sets"]["series"])) {
            $output["bunnies"] = [];
            foreach ($bunnies as $oldBunnyHandle => $set) {
                $setid = intval($set["setid"]);
                $freq = intval($set["freq"]);
                $sql = "SELECT sd.*  FROM setdata sd WHERE setid=$setid and freq='$freq' and geoid=$toGeoId and latlon=''";  //todo: add security here and to GetSeries to either be the owner or org or be part of a graph whose owner/org
                $result = runQuery($sql, "ChangeMaps: get series data");
                if ($result->num_rows == 1) {
                    $output["bunnies"][$oldBunnyHandle] = $result->fetch_assoc();
                }
            }
        }
        $output["assets"] = [];
        if (isset($_POST["sets"]["mapSets"])) {
            foreach ($_POST["sets"]["mapSets"] as $handle => $set) {
                getMapSets($output["assets"], $_POST["map"], [["setid" => $set["setid"], "freq" => $set["freq"]]], false, true);
            }
        }
        if (isset($_POST["sets"]["pointSets"])) {
            foreach ($_POST["sets"]["pointSets"] as $handle => $set) {
                getPointSets($output["assets"], $_POST["map"], [["setid" => $set["setid"], "freq" => $set["freq"]]]);
            }
        }
        break;
    case 'GetBunnySeries':
        $setids = $_POST["setids"];
        $freq = safeSQLFromPost("freq");
        if (!isset($_POST["geoid"]) || intval($_POST["geoid"]) == 0) {
            $sql = "select bunny from maps where map = " . safeSQLFromPost("map");
            $result = runQuery($sql, "GetBunnySeries map");
            if ($result->num_rows == 1) {
                $row = $result->fetch_assoc();
                $geoid = $row["bunny"];
            } else {
                return (array("status" => "unable to find map"));
            }
        } else {
            $geoid = intval($_POST["geoid"]);
        }
        $output = array("status" => "ok", "allfound" => true, "assets" => array());
        for ($i = 0; $i < count($setids); $i++) {
            $sql = "SELECT s.setid, left(s.settype,1) as settype, s.name as setname, g.name as geoname,
                s.metadata as setmetadata, s.themeid, sd.latlon, sd.geoid,  s.userid,
                s.titles as categories, s.src, s.url, s.units, sd.data, freq, firstdt100k*100*1000 as firstdt,
                lastdt100k*100*1000 as lastdt, coalesce(s.src, a.name) as src,
                coalesce(sd.url, s.url, a.url) as url, coalesce(sd.skey, s.setkey) as sourcekey,
                s.maps as maps, s.freqs as freqs
                FROM sets s join setdata sd on s.setid=sd.setid join geographies g on sd.geoid=g.geoid left outer join apis a on s.apiid=a.apiid
                where sd.geoid = $geoid and sd.latlon ='' and sd.freq = $freq and s.setid = " . intval($setids[$i]);
            $result = runQuery($sql, "GetBunnySeries");
            if ($result->num_rows == 1) {
                $row = $result->fetch_assoc();
                if (intval($row["userid"]) > 0) {
                    requiresLogin();
                    if (intval($_POST["uid"]) == $row["userid"] || ($orgId == $row["ordig"] && $orgId != 0)) {
                        $output["assets"]["M" . $setids[$i]] = $row;
                    } else {
                        $output["allfound"] = false;
                        $output["assets"] = false; //no need to transmit series as it will not be used
                        break;
                    }
                } else {
                    $output["assets"]["M" . $setids[$i]] = $row;
                }
            } else {
                $output["allfound"] = false;
                $output["assets"] = false; //no need to transmit series as it will not be used
                break;
            }
        }
        break;
    case "GetApis":
        $sql = "select apiid, name from apis";
        $result = runQuery($sql);
        $apis = array();
        while ($api = $result->fetch_assoc()) array_push($apis, $api);
        $output = array("status" => "ok", "sources" => $apis);
        break;
    case "CheckEmailForOrgInv":
        //1. check for existing invitation
        $sql = "select invid from invitations i, organizations o where i.orgid=o.orgid and i.email = " . safeSQLFromPost("email");
        $result = runQuery($sql, "CheckEmailForOrgInv");
        if ($result->num_rows == 1) {
            //1A.  matched to a valid emailed root!
            $row = $result->fetch_assoc();
            $output = array("status" => "ok", "invited" => true, "orgname" => $row["orgname"], "date" => $row["invdate"]);
            $userid = isset($_POST["uid"]) ? intval($_POST["uid"]) : 0;
            emailAdminInvite($_POST["email"]);  //invitation record exist.  NOte: first time call to emailAdminInvite needs additional params
            break;
        }
        //2. check for emailroot match to org with autosignup enabled
        $mailParts = explode("@", $_POST["email"]);
        if (count($mailParts) == 2) {
            $sql = "select o.orgid, orgname, name from organizations o, users u where o.userid=u.userid and joinbyemail='T' and emailroot = " . safeStringSQL($mailParts[1]);
            $result = runQuery($sql, "CheckEmailForOrgInv");
            if ($result->num_rows == 1) {
                $row = $result->fetch_assoc();
                $userid = isset($_POST["uid"]) ? intval($_POST["uid"]) : 0;
                //no longer needed:  emailRootInvite($_POST["email"], $row["orgid"], $row["orgname"], $row["name"], $userid);
                //note: validationCode was sent as soon as an unknown email address was enter in the subscription form
                $output = array("status" => "ok", "eligible" => true, "orgname" => $row["orgname"]);
                break;
            }
        }
        //3. nothing found
        $output = array("status" => "ok", "invited" => false, "eligible" => false);
        break;
    case "EmailVerify":
        $validEmailCode = validationCode($_POST["email"]);
        if ($validEmailCode == $_POST["verification"]) {
            $output = array("status" => "ok", "verfied" => true);
        } else {
            $output = array("status" => "ok",
                "verfied" => false,
                "sent" => (mail($_POST["email"],
                    "email verification code from MashableData",
                    "To validate this email address, please enter the following code into the MashableData email verification box when requested:\n\n" . $validEmailCode,
                    $MAIL_HEADER
                ))
            );
        }
        break;
    case "CardSelects":
        $sql = "SELECT iso3166 AS code, name FROM mapgeographies mg, geographies g WHERE g.geoid = mg.geoid AND mg.map =  'world' ORDER BY name";
        $result = runQuery($sql);
        $countries = array();
        while ($country = $result->fetch_assoc()) array_push($countries, $country);
        $output = array("status" => "ok", "countries" => $countries, "years" => array());
        $assoc_date = getdate();
        for ($i = $assoc_date["year"]; $i < $assoc_date["year"] + 10; $i++) {
            array_push($output["years"], $i);
        }
        break;
    case "Subscribe":
        $validRegCode = false;
        $uid = 0;
        $orgId = null;
        if (isset($_POST["uid"]) && $_POST["uid"] != null) { //new accounts do not have to be logged in, but if user claims a userid, verify accesstoken
            requiresLogin();
            $uid = intval($_POST["uid"]);
        }
        if (isset($_POST["regCode"]) && count($_POST["regCode"]) > 0) {
            $sql = "select * from invitations where email=" . safeSQLFromPost("email") . " and regcode=" . safeSQLFromPost("regCode");
            $result = runQuery($sql);
            if ($_POST["regCode"] == validationCode($_POST["email"])) {
                $user = $result->fetch_assoc();
                if ($uid > 0 && $uid != $user["userid"]) { //logged account different from invitation account
                    if ($user[""]) {
                    }
                    //delete invitation user and transfer
                }
                $validRegCode = true;
                $orgId = $user["orgid"];
                $sql = "update users set emailverify = now() where email=" . safeSQLFromPost("email") . " and regcode=" . safeSQLFromPost("regCode") . " and emailverify is null";
                runQuery($sql); //only stamp it verified the first time
            } else {
                die('{"status":"The registration code is invalid for the primary email address provided."}');
            }
        } elseif (isset($_POST["uid"]) && intval($_POST["uid"]) > 0) {
            $sql = "select * from users where email=" . safeSQLFromPost("email") . " and userid<>" . intval($_POST["uid"]);
            $result = runQuery($sql);
            if ($result->num_rows == 1) {
                die('{"status":"An account already exists for ' . $_POST["email"] . '.  If this is your account, please sign in to manage it."}');
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

    case "GetCatChain":  //gets a single chain (even if set is multihomed) with all siblings at each level
        $setid = intval($_POST["setid"]);
        $geoid = isset($_POST["geoid"]) ? intval($_POST["geoid"]) : 0;

        $parentId = false;
        if ($setid > 0) { //try to get the starting cat
            $result = runQuery("select catid, parentid from categorysets cs join catcat cc on cs.catid=cc.childid where setid=$setid and geoid=$geoid");
            if ($result->num_rows > 0) {
                $row = $result->fetch_assoc();
                $catid = $row["catid"];
                $parentId = $row["parentid"];
            }
        }

        if (!$parentId) {
            $setid = 0;
            $catid = 0;
            $parentId = 1;  //root cat
        }

        $chain = [];
        $maxLevels = 20; //safety counter to avoid infinite loops
        while ($parentId && count($chain) < $maxLevels) {
            $children = getCatChildren($parentId);
            foreach ($children as $i => &$category) {
                if ($category["catid"] == $catid) {
                    $category["in-path"] = true;
                    break;
                }
            }
            $level = [
                "children" => $children,
                "catid" => $parentId
            ];
            array_unshift($chain, $level);
            $result = runQuery("select parentid from catcat where childid=$parentId");
            if ($result->num_rows > 0) {
                $row = $result->fetch_assoc();
                $catid = $parentId;
                $parentId = $row["parentid"];
            } else {
                $parentId = false;
            }
        }
        $output = [
            "chain" => $chain,
            "setid" => $setid,
            "geoid" => $geoid,
            "status" => "ok"
        ];
        break;
    case "GetCatChildren":
        $catid = intval($_POST["catid"]);
        $output = [
            "children" => getCatChildren($catid),
            "catid" => $catid,
            "status" => "ok"
        ];
        break;
    case "DeleteMyGraphs":
        requiresLogin();
        $gids = $_POST['gids'];
        $clean_gids = array();
        foreach ($gids as $gid) {
            array_push($clean_gids, intval($gid));
        }
        if (count($clean_gids) > 0) {
            $user_id = intval($_POST['uid']);
            $gid_list = implode($clean_gids, ",");
            //multi-table delete
            $sql = "delete g, gp, pc from graphs g, graphplots gp, plotcomponents pc
                where g.graphid=gp.graphid and g.graphid=pc.graphid
                and g.userid = $user_id and g.graphid in ( $gid_list )";
            logEvent("DeleteMyGraphs: delete graph and dependencies", $sql);
            runQuery($sql);
            $output = array("status" => "ok", "gids" => implode($clean_gids, ","));
        } else {
            $output = array("status" => "fail: no gids to delete");
        }
        break;
    case "ResetGhash":
        requiresLogin();
        $gid = intval($_POST["gid"]);
        $uid = intval($_POST["uid"]);
        $ghash = setGhash($gid, $uid);
        $output = array("status" => "ok", "gid" => $gid, "ghash" => $ghash);
        break;
    case "ManageMyGraphs":
        requiresLogin();
        $usageTracking = trackUsage("count_graphsave");
        if (!$usageTracking["approved"]) {
            $output = array("status" => $usageTracking["msg"]);
            break;
        }
        $gid = (isset($_POST['gid'])) ? intval($_POST['gid']) : 0;
        $user_id = isset($_POST['uid']) ? intval($_POST['uid']) : 0;
        if ($_POST['published'] == 'Y') {
            $published = "Y";
        } else {
            $published = "N";
        }
        $intervals = isset($_POST['intervals']) ? intval($_POST['intervals']) : 'null';
        $from = (isset($_POST['start']) && is_numeric($_POST['start'])) ? intval($_POST['start'] / 1000) * 1000 : 'null';
        $to = (isset($_POST['end']) && is_numeric($_POST['end'])) ? intval($_POST['end'] / 1000) * 1000 : 'null';
        $cubeid = (isset($_POST['cubeid']) && is_numeric($_POST['cubeid'])) ? intval($_POST['cubeid']) : 'null';
        switch ($_POST['type']) {
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
        if ($gid == 0) {
            $ghash = makeGhash($user_id);  //ok to use uid instead of gid as ghash is really just a random number
            $sql = "INSERT INTO graphs
              (userid, published, title, text, type, intervalcount, fromdt, todt, annotations, serieslist, map,
              mapconfig, cubeid, views, createdt, updatedt, ghash)
            values (
              $user_id, '$published',$title, $analysis, '$type', $intervals, $from, $to, $annotations, $serieslist, $map,
              $mapconfig, $cubeid, 0, $modifieddt, $modifieddt,'$ghash')";
            if (!runQuery($sql, "ManageMyGraphs: insert graphs record")) {
                $output = array("status" => "fail on graph record insert", "post" => $_POST);
                break;
            }
            $gid = $db->insert_id;
        } else {
            $sql = "UPDATE graphs
            SET userid=$user_id, published='$published ', title=$title, text=$analysis, type='$type', intervalcount=$intervals,
            fromdt=$from, todt=$to, annotations=$annotations, updatedt=$modifieddt, serieslist=$serieslist, map=$map, mapconfig=$mapconfig
            WHERE graphid = " . $gid . " and userid=" . $user_id;
            if (!runQuery($sql, "ManageMyGraphs: update graphs record")) {
                $output = array("status" => "fail on graph record update");
                break;
            }
            $result = runQuery("select ghash from graphs where graphid = " . $gid . " and userid=" . $user_id, "ManageMyGraphs: read the ghash when updating");
            $row = $result->fetch_assoc();
            $ghash = $row["ghash"];
            //clear plots and components for fresh insert (note:  wastful of plotids
            $sql = "delete gp, pc from graphplots gp, plotcomponents pc where gp.graphid=pc.graphid and gp.graphid = " . $gid;
            runQuery($sql);
        }
        $output = array("status" => "ok", "gid" => $gid, "ghash" => $ghash);
        //insert plot and plot components records
        if (isset($_POST['allplots'])) {  //allplots contains the seriesplots, mapplots and pointplots
            $allPlots = $_POST['allplots'];
            foreach ($allPlots as $plotOrder => $plot) {  //plot order is global; does not restart at 0 for each plot type (mapplots/pointplots/seriesplots)
                $plotType = safeStringSQL($plot["type"]);
                $plotOptions = safeStringSQL($plot["options"]);
                $sql = "insert into graphplots (graphid, plotorder, plottype, options)
                    values ($gid, $plotOrder, $plotType, $plotOptions)";
                runQuery($sql, "ManageMyGraphs: insert graphplots record");
                foreach ($plot["components"] as $compOrder => $component) {
                    $setid = intval($component["setid"]);
                    $freq = safeStringSQL($component["freq"]);
                    $geoid = isset($component["geoid"]) && is_numeric($component["geoid"]) ? intval($component["geoid"]) : "NULL";  //must be null if empty
                    $latlon = isset($component["latlon"]) ? safeStringSQL($component["latlon"], false) : "''";
                    $options = safeStringSQL($component["options"]);
                    $sql = "insert into plotcomponents (graphid, plotorder, comporder, setid, freq, geoid, latlon, options) values "
                        . "($gid, $plotOrder, $compOrder, $setid, $freq, $geoid, $latlon, $options)";
                    runQuery($sql, "ManageMyGraphs: insert plotcomponents record");
                }
            }
        }
        //clear the cache when a graph is saved (if new or not previously cached, nothing gets deleted)
        $cacheSubPath = substr($ghash, 0, 2) . "/" . substr($ghash, 2, 2) . "/";
        shell_exec("rm -f " . $cacheRoot . $cacheSubPath . $ghash . "*");
        flushCloudFlare($ghash);
        runQuery("delete from graphcache where ghash='$ghash'");
        break;
    case "ManageMySeries":
        requiresLogin();
        $user_id = intval($_POST['uid']);
        $type = substr($_POST['handle'], 0, 1);
        $id = intval(substr($_POST['handle'], 1));
        $addDt = intval($_POST['jsts'] / 1000) * 1000;
        $to = $_POST['to'];
        if (count($user_id) == 0 || count($id) == 0) {
            $output = array("status" => "invalid call.  Err 103");
            break;
        }
        if ($type == "S") {    //series
            $sql = "select * from mysets where setid = " . $id . " and userid = " . $user_id;
            $result = runQuery($sql);
            $from = "";
            if ($result->num_rows == 1) {
                $row = $result->fetch_assoc();
                $from = $row["saved"];
                if ($from == $to) {
                    $output = array("status" => "error: from and to save status are identical");
                    break;
                }
                $sql = "update mysets set savedt=" . $addDt . " where setid = " . $id . " and userid = " . $user_id;
                logEvent("ManageMySeries: add", $sql);
                runQuery($sql);
            } else {
                if ($to == "H" || $to == "S") { //if not assigned to "saved" or "history" then command is to delete
                    $sql = "insert into mysets (userid, setid, savedt) VALUES ($user_id, $id, $addDt)";
                    logEvent("ManageMySeries: add", $sql);
                    runQuery($sql);
                    //TODO:  delete history in excess of 100 series
                }
            }
            if ($to == 'S') {
                $sql = "update series set myseriescount= myseriescount+1 where setid = " . $id;
                runQuery($sql);
            } elseif ($from == 'S' && $to == 'H') {
                $sql = "update series set myseriescount= myseriescount-1 where setid = " . $id;
                runQuery($sql);
            }
            if ($to != "H" && $to != "S") {
                $sql = "delete from mysets where setid = " . $id . " and userid = " . $user_id;
                logEvent("ManageMySeries: delete", $sql);
                runQuery($sql);
            }
        } elseif ($type == "U") {
            if ($to != "S") {   //can only delete here.  nothing else to manage.
                //TODO: check for graph dependencies and organizational usage
                $sql = "delete from series where setid=" . $id . " and userid=" . $user_id;
                runQuery($sql);
            }
        }
        $output = array("status" => "ok");
        break;
    case "GetUserId":
        $username = safePostVar('username');
        $accesstoken = safePostVar('accesstoken');
        //$email =  $_REQUEST['email'];
        //$expires =  $_REQUEST['expires'];
        $authmode = safePostVar('authmode');   //currently, FB (Facebook) and MD (MashableData) are supported
        //get account type
        if (strlen($username) == 0) {
            $output = array("status" => "invalid user name");
            break;
        }
        if ($authmode == 'FB') {
            $fb_command = "https://graph.facebook.com/" . $username . "/permissions?access_token=" . (($accesstoken == null) ? 'null' : $accesstoken);
            logEvent("GetUserId: fb call", $fb_command);
            $fbstatus = json_decode(httpGet($fb_command));
            if (array_key_exists("data", $fbstatus)) {
                $sqlGetUser = "select u.*, o.orgid, orgname from users u left outer join organizations o on u.orgid=o.orgid "
                    . " where u.authmode = " . safeSQLFromPost('authmode')
                    . " and u.username = '" . $db->real_escape_string($username) . "'";
                $result = runQuery($sqlGetUser, "GetUserId: lookup user");
                if ($result->num_rows == 1) {
                    $row = $result->fetch_assoc();
                    $sql = "update users set accesstoken = '" . $db->real_escape_string($accesstoken) . "' where userid=" . $row["userid"];
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
                    "subscription" => $row["subscription"], "subexpires" => $row["expires"], "company" => $row["company"],
                    "ccaddresss" => $row["ccaddresss"], "cccity" => $row["cccity"], "ccstateprov" => $row["ccstateprov"],
                    "ccpostal" => $row["ccpostal"], "cccountry" => $row["cccountry"], "ccnumber" => substr($row["ccnumber"], -4),
                    "ccexpiration" => $row["ccexpiration"], "ccv" => $row["ccv"], "ccname" => $row["ccname"], "permission" => $row["permission"]);
                setcookie("md_auth", myEncrypt($row["userid"] . ":" . $row["orgid"] . ":" . $row["orgname"] . ":" . $row["permission"] . ":" . $row["subscription"]));
            } else {
                $output = array("status" => "error:  Facebook validation failed", "facebook" => $fbstatus["error"]["message"]);
            }
        }
        if ($authmode == 'MD') {
            //todo: add MD authentication
        }
        break;
    case "UploadMyMashableData":
        global $orgid;
        requiresLogin();
        $user_id = intval($_POST['uid']);
        $series = $_POST['series'];
        $output = array(
            "status" => "ok",
            "handles" => array()
        );
        for ($i = 0; $i < count($series); $i++) {
            //get parameters for this user series
            $local_handle = $series[$i]['handle'];
            $series_name = $series[$i]['name'];
            $graph_title = $series[$i]['graph'];
            $units = isset($series[$i]['units']) ? $series[$i]['units'] : '';
            $skey = isset($series[$i]['skey']) ? $series[$i]['skey'] : '';
            $url = $series[$i]['url'];
            $freq = $series[$i]['freq'];
            $capture_dt = $series[$i]['savedt'];
            $data = $series[$i]['data'];
            $firstdt = intval($series[$i]['firstdt']);
            $lastdt = intval($series[$i]['lastdt']);
            if (isset($series[$i]["geoid"])) {
                $geoid = intval($series[$i]["geoid"]);
            } else {
                $geoid = null;
            }
            if (isset($series[$i]["mapsetid"])) {
                $mapsetid = intval($series[$i]["mapsetid"]);
            } else {
                $mapsetid = null;
            }
            if (isset($series[$i]["pointsetid"])) {
                $pointsetid = intval($series[$i]["pointsetid"]);
            } else {
                $pointsetid = null;
            }
            if (isset($series[$i]["lat"])) {
                $lat = intval($series[$i]["lat"]);
                $lon = intval($series[$i]["lin"]);
            } else {
                $lat = null;
                $lon = null;
            }
            //strip out certain acts of the URL
            $working_url = preg_replace('/http[s]*:\/\//', '', $url);
            $first_slash = strpos($working_url, '/');
            $full_domain = substr($working_url, 0, $first_slash);
            $period = strrpos($full_domain, ".");
            $l1domain = substr($full_domain, $period + 1);
            $l2domain = substr($full_domain, 0, $period);
            $period = strrpos($l2domain, ".");
            if ($period) {
                $l2domain = substr($l2domain, $period + 1);
            }
            $src = isset($series[$i]['src']) ? $series[$i]['src'] : $l2domain . "." . $l1domain;
            //see if user has already uploaded this one:
            $sql = "SELECT setid, data FROM series WHERE name='" . $db->real_escape_string($series_name) . "' and title = '" . $db->real_escape_string($graph_title)
                . "' and url = '" . $db->real_escape_string($url) . "' and freq = '" . $db->real_escape_string($freq)
                . "' and units = '" . $db->real_escape_string($units) . "' and userid=" . $user_id;
            $result = runQuery($sql, "uploadMashableData: search whether this user series exists");
            if ($result->num_rows != 0) {
                $row = $result->fetch_assoc();
                $setid = $row["setid"];
                if ($data != $row["data"]) {
                    $sql = "update series set data='" . $db->real_escape_string($data) . "', firstdt=" . $firstdt . ", lastdt=" . $lastdt . " where setid=" . $setid;
                    runQuery($sql, $command);
                }
                $sql = "update mysets set savedt = " . intval($_POST["savedt"]) . " where setid=" . $setid . " and userid=" . $user_id;
                runQuery($sql, $command);
            } else {
                $sql = "insert into series (userid, skey, name, namelen, src, units, units_abbrev, freq, title, url, notes, data, hash, apiid, firstdt, lastdt, geoid, mapsetid, pointsetid, lat, lon) "
                    . " values (" . $user_id . "," . safeStringSQL($skey) . "," . safeStringSQL($series_name) . "," . strlen($series_name) . "," . safeStringSQL($src) . "," . safeStringSQL($units) . "," . safeStringSQL($units) . "," . safeStringSQL($freq) . "," . safeStringSQL($graph_title) . "," . safeStringSQL($url) . ",'private user series acquired through via a chart using the MashableData chart plugin'," . safeStringSQL($data) . "," . safeStringSQL(sha1($data)) . ",null," . $firstdt . "," . $lastdt . "," . ($geoid === null ? "null" : $geoid) . "," . ($mapsetid === null ? "null" : $mapsetid) . "," . ($pointsetid === null ? "null" : $pointsetid) . "," . ($lat === null ? "null" : safeStringSQL($lat)) . "," . ($lon === null ? "null" : safeStringSQL($lon)) . ")";
                $queryStatus = runQuery($sql, $command);
                if ($queryStatus !== false) {
                    $setid = $db->insert_id;
                    $output["handles"][$local_handle] = 'U' . $setid;
                    runQuery("insert into mysets (setid, userid, savedt) values (" . $setid . "," . $user_id . "," . intval($capture_dt) . ")", $command);
                } else {
                    $output["status"] = "error adding local series";
                    break;
                }
            }
            $output['handles'][$local_handle] = 'U' . $setid;
        }
        break;
    case "SaveUserSets":
        requiresLogin();  //sets global $orgid & $username
        $usageTracking = trackUsage("count_userseries");
        if (!$usageTracking["approved"]) {
            $output = array("status" => $usageTracking["msg"]);
            break;
        }
        $set = $_REQUEST['set'];  //either "U" or a mapset or pointset handle
        $setid = (strlen($set) > 1) ? intval(substr($set, 1)) : 0;
        $user_id = intval($_REQUEST['uid']);
        $setType = substr($set, 0, 1);
        $arySeries =& $_REQUEST['setdata'];
        $output = array(
            "status" => "ok",
        );
        $sqlName = safeSQLFromPost("setname");
        $sqlUnits = safeSQLFromPost("units");
        $sqlFreq = safeSQLFromPost("freq");
        if(strpos("''A'S'Q'M'W'D'H'T'", $sqlFreq) === false) die('"status":"Invalid set parameters.  Please contact MashableData tech support if you feel this is an error."');
        if(strpos("SMX", $setType) === false) die('"status":"Invalid set parameters.  Please contact MashableData tech support if you feel this is an error."');

        $sql = "select * from sets where setid=$setid and userid=$user_id and apiid is null";
        $result = runQuery($sql);
        if ($result->num_rows == 1) {
            //update
            $set = $result->fetch_assoc();
            if ($set["name"] != $_POST['setname'] || $set["units"] != $set['units'] || $set["freq"] != $set['freq']) {
                $sql = "update sets set name=$sqlName, units=$sqlUnits, freq=$sqlFreq where setid=$setid";
                runQuery($sql);
            }

        } else {
            //insert new
            $nameLen = strlen($sqlName) - 2;
            $setTypeField = ($setype=="S" ? "S" : $setype . "S_"); //"S", "MS_" or "XS_"
            $sql = "insert into sets (name, namelen, settype, freq, units, userid, orgid, src, apidt) values ($sqlName, $nameLen, '$setTypeField', $sqlFreq,  $sqlUnits, $user_id, $orgid, '$saveTs'" . safeStringSQL($username) . ")";
            runQuery($sql);
            $setid = $db->insert_id;
        }
        //delete set data and resave
        $status = ["updated" => 0, "failed" => 0, "skipped" => 0, "added" => 0];
        $saveTs = intval($_REQUEST["savedt"] / 1000) * 1000;
        for ($i = 0; $i < count($arySeries); $i++) {
            saveSetData($status, $setid, null, null, $freq, $arySeries[$i]["geoid"], $arySeries[$i]["latlon"], $arySeries[$i]["data"], '$saveTs', $arySeries[$i]["notes"]);
            $usid = $db->insert_id;
        }
        //remove any old setdata that wasn't udated (+ deleted on user's end)
        $sql = "delete from setdata where setid=$setid and apidt<>'$saveTs'";
        runQuery($sql);

        $preferredMap = safeSQLFromPost("map");
        $sql = "insert into mysets (userid, setid, preferredmap, savedt) values ($userid, $setid, $preferredMap, $saveTs) on duplicate key update preferredmap=$preferredMap, savedt=$saveTs";
        runQuery($sql, "mysets insert/update for user series");
        if($setid>0) {
            setGhandlesFreqsFirstLast("all", "all", $setid);

            if($setType=="M") setMapsetCounts($setid);
            if($setType=="X") setPointsetCounts($setid);
        }
        if(isset($usageTracking["msg"])) $output["msg"] = $usageTracking["msg"];
        $output["updated"] = $status["updated"];
        $output["added"] = $status["added"];
        $output["deleted"] = $deleted;
        $output["setid"] = $setid;
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
            if(!isset($serie["geoid"]) && (!isset($serie["latlon"])||$serie["latlon"]=="")){
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
              left(s.settype,1) as settype, s.setid, s.name as setname, s.themeid, s.metadata as setmetadata, s.titles as categories, s.userid, s.units,
              sd.latlon, sd.geoid, sd.data, sd.freq, sd.firstdt100k*100000 as firstdt, lastdt100k*100000 as lastdt,
              coalesce(s.src, a.name) as src,
              coalesce(sd.url, s.url, a.url) as url,
              coalesce(sd.skey, s.setkey) as sourcekey,
              coalesce(s.maps, xs.maps) as maps,
              coalesce(s.freqs, xs.freqs) as freqs,
              sd.metadata as seriesmetadata,
              xs.name as seriesname,
              if(isnull(xs.name), g.name, null) as geoname,
              concat(IFNULL(s.metadata ,''),' ',IFNULL(a.metadata,''),' ', IFNULL(t.meta,'')) as setmetadata
            FROM sets s join setdata sd on s.setid = sd.setid
              left outer join apis a on s.apiid=a.apiid
              left outer join themes t on s.themeid=t.themeid
              left outer join geographies g on sd.geoid=g.geoid
              left outer join sets xs on xs.mastersetid=s.setid and xs.latlon=sd.latlon
            WHERE
              s.setid = $serie[setid] and sd.freq = '$serie[freq]' and sd.latlon = '$serie[latlon]'";
            if(isset($serie["geoid"])) $sql .= " and sd.geoid = $serie[geoid]";
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
        $result = runQuery($sql);
        $output = array("status" => "annotation not found");
        while ($aRow = $result->fetch_assoc()) {
            $output = array("status" => "ok","annoid"=>$aRow["annoid"],"name"=>$aRow["name"],"description"=>$aRow["description"],"annotation"=>$aRow["annotation"]);
        }
        break;
    case "GetSetGeographies":
        //provides a list of geographies in set when user wants to switch geography for a particular series
        //input param: setid or mastersetid
        if(isset($_POST["setid"])){ //mapset
            $setid = intval($_POST["setid"]);
            $output = [
                "status" => "ok",
                "setid" => $setid,
                "geographies" => []
            ];
            $sql = "select distinct g.name, g.geoid
                from setdata sd
                join geographies g on g.geoid=sd.geoid
                where setid = $setid
                order by g.name";
            $result = runQuery($sql);
            while($row = $result->fetch_assoc()){
                $output["geographies"][] = $row;
            }
        } elseif(isset($_POST["mastersetid"])){ //pointset
            $mastersetid = intval($_POST["mastersetid"]);
            $output = [
                "status" => "ok",
                "mastersetid" => $mastersetid,
                "geographies" => []
            ];
            $sql = "select s.name, s.setid, s.latlon
                    from sets s
                    where mastersetid = $mastersetid
                    order by s.name";
            $result = runQuery($sql);
            $firstNameWords = false;
            $matchingWordCount = 999; //impossibly high
            while($row = $result->fetch_assoc()){
                $output["geographies"][] = $row;
                if(!$firstNameWords){
                    $firstNameWords = explode(" ", $row["name"]);
                    $wordCount = count($firstNameWords);
                } else {
                    $thisNameWords = explode(" ", $row["name"]);
                    for($i=0;$i<$wordCount;$i++){
                        if($firstNameWords[$i]!=$thisNameWords[$i]){
                            if($matchingWordCount>$i) $matchingWordCount = $i;
                            break;
                        }
                    }
                }
            }
            $matchingWords = array_slice($firstNameWords, 0, $matchingWordCount);
            $prefix = implode(" ", $matchingWords);
            $trimPos = strlen($prefix);
            if($matchingWordCount>0 && $matchingWordCount<999){
                foreach($output["geographies"] as $i=>$geography){
                    $placeName = substr($geography["name"], $trimPos);
                    $output["geographies"][$i]["name"] = $placeName;
                }
            }
        } else {
            $output = ["status" => "invalid parameters"];
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
function getCatChildren($parentId){  //used by the category browser routines
    $sql = "SELECT
            c.catid, c.name, COUNT(DISTINCT cs.setid ) AS scount, COUNT(DISTINCT kids.childid ) AS children
            FROM catcat siblings
            INNER JOIN  categories c  ON c.catid = siblings.childid
            LEFT OUTER JOIN categorysets cs ON  siblings.childid = cs.catid
            LEFT OUTER JOIN catcat kids ON siblings.childid = kids.parentid
            WHERE siblings.parentid =  $parentId
            GROUP BY c.catid, c.name
            ORDER BY c.name";
    $result = runQuery($sql);
    $catChildren = [];
    while($child = $result->fetch_assoc()){
        $catChildren[] = $child;
    }
    return $catChildren;
}

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
    global $ft_join_char, $command;
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
    //mapsPrefix = $ft_join_char; allow empty components for missing sets (setid will be null)
    $sql = "SELECT g.graphid as gid, g.userid, g.title, g.text as analysis,
        g.map, g.mapconfig,  g.cubeid,  g.serieslist, g.intervalcount, g.type, g.annotations,
        g.ghash,  g.fromdt, g.todt,  g.published, g.views, ifnull(g.updatedt, g.createdt) as updatedt,
        m.jvectormap, m.bunny, m.legend,
        s.name as setname, left(s.settype,1) as settype, s.units, s.metadata as setmetadata,
        s.latlon, s.firstsetdt100k*1000000 as firstsetdt, s.lastsetdt100k*100000 as lastsetdt, s.mastersetid,
        gp.plotorder, gp.plottype, gp.options as plotoptions,
        pc.comporder, s.setid, pc.freq, pc.geoid, pc.latlon, pc.options as componentoptions,
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
          LEFT OUTER JOIN sets s ON pc.setid=s.setid
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
                "cubeid" =>  $aRow["cubeid"],
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
            $decodedMapconfig = json_decode($mapconfig, true); //also used to detect bunnies
            if($aRow["legend"]){
                $decodedMapconfig["legendLocation"] = $aRow["legend"] ? $aRow["legend"] : "TR";  //why??
                $mapconfig = json_encode($decodedMapconfig);
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
                $getBunnies = $command!="GetEmbeddedGraph" || (isset($decodedMapconfig["mapViz"]) && $decodedMapconfig["mapViz"]=="line-bunnies");
                getMapSets($output['graphs']['G' . $gid]["assets"], $aRow["map"], [["setid"=>$aRow["setid"], "freq"=>$aRow["freq"]]], false, $getBunnies);
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

function getMapSets(&$assets, $map, $requestedSets, $mustBeOwnerOrPublic = false, $getBunnies = false){
//used by:
//    "GetSet" command from workbench.QuickViewToMap and workbench.getGraphMapSets()
//    "GetFullGraph" command (api.getGraphs()) from grapher.createMyGraph() only
//    "GetEmbeddedGraph" command (api.getGraphs()) from grapher.createMyGraph() only

    global $db, $orgid, $command;
    $setFilters = [];
    //print_r($requestedSets);
    for($i=0;$i<count($requestedSets);$i++){
        $setFilters[] = "(s.setid=".$requestedSets[$i]["setid"]." AND sd.setid=".$requestedSets[$i]["setid"]." AND sd.freq='".$requestedSets[$i]["freq"]."')";
    }
    $bunnies = []; //associative array of geoids for secondary fetch if requested
    $mapCode = safeStringSQL($map);
    $sql = "SELECT s.setid, left(s.settype,1) as settype, s.name as setname, s.maps, s.freqs, s.apiid, s.themeid,
      coalesce(s.metadata,t.meta) as setmetadata, coalesce(s.src, a.name) as src, coalesce(s.url, a.url) as url, s.units,
      g.jvectormap as map_code, g.containingid, concat(g.lat, ',', g.lon) as latlon, m.bunny, s.userid, s.orgid, sd.geoid, g.name as geoname,
      sd.freq, sd.data, sd.metadata as seriesmetadata, sd.lastdt100k, sd.firstdt100k, sd.url as seriesurl
    FROM sets s JOIN setdata sd on s.setid=sd.setid
      JOIN geographies g on sd.geoid=g.geoid
      JOIN mapgeographies mg on sd.geoid = mg.geoid and mg.geoid=g.geoid
      JOIN maps m on mg.map=m.map
      LEFT OUTER JOIN themes t on s.themeid = t.themeid
      LEFT OUTER JOIN apis a on s.apiid = a.apiid
    WHERE (" . implode(" OR ", $setFilters) . ")
      and mg.map  = $mapCode and m.map = $mapCode";
    if($mustBeOwnerOrPublic){
        $sql .= " and (s.userid is null or s.userid= " . intval($_POST["uid"]) . " or orgid=" . $orgid . ")"; //assumes requiresLogin already run
    }
    $sql .= " ORDER by  setid";
    $result = runQuery($sql, "getMapSets");
    $currentMapSetId = false;
    $currentFreq = false;
    $handle = false;
    while($row = $result->fetch_assoc()){
        if($currentMapSetId!=$row["setid"]){
            if($getBunnies  && $currentMapSetId>0) getBunnies($assets[$handle]["data"], $currentMapSetId, $currentFreq, $bunnies);
            $bunnies = [];  //clear
            //new mapset = need header
            $currentMapSetId=$row["setid"];
            $currentFreq=$row["freq"];
            $handle = "M".$currentMapSetId.$row["freq"];
            $assets[$handle] = array(
                "setid"=>$currentMapSetId,
                "maps"=>array(),
                "setname"=>$row["setname"],
                "units"=>$row["units"],
                "freq"=>$row["freq"],
                "src"=>$row["src"],
                "apiid"=>$row["apiid"],
                "themeid"=>$row["themeid"],
                "setmetadata"=>$row["setmetadata"],
                "settype"=>$row["settype"],
                "firstdt"=>$row["firstdt100k"]*100000,
                "lastdt"=>$row["lastdt100k"]*100000,
                "data"=>array()
            );
            if($command != "GetEmbeddedGraph"){
                $assets[$handle]["freqs"] = freqsFieldToArray($row["freqs"]);
                $assets[$handle]["maps"] = mapsFieldCleanup($row["maps"]);
            }
            if($getBunnies && $row["bunny"] && !in_array($row["bunny"], $bunnies)) $bunnies[] = $row["bunny"];
        }
        $assets[$handle]["data"][$row["map_code"]] = [
            "handle"=>"S".$row["setid"].$row["freq"]."G".$row["geoid"],
            "geoid"=>$row["geoid"],
            "cg"=>$row["containingid"],
            "geoname"=>$row["geoname"],
            "data"=>$row["data"],
            "firstdt"=>$row["firstdt100k"]*100000,
            "lastdt"=>$row["lastdt100k"]*100000
        ];
        if($row["seriesmetadata"]!=null) $assets[$handle]["data"][$row["map_code"]]["metadata"] = $row["seriesmetadata"];
        if($row["seriesurl"]!=null) $assets[$handle]["data"][$row["map_code"]]["url"] = $row["seriesurl"];
        if($row["latlon"]!=null) $assets[$handle]["data"][$row["map_code"]]["latlon"] = $row["latlon"];
        $assets[$handle]["firstdt"] = min($assets[$handle]["firstdt"], $row["firstdt100k"]*100000);
        $assets[$handle]["lastdt"] = max($assets[$handle]["lastdt"], $row["lastdt100k"]*100000);
        if($getBunnies && $row["containingid"] && !in_array($row["containingid"], $bunnies)) $bunnies[] = $row["containingid"];
    }

    if($getBunnies && $currentMapSetId>0) getBunnies($assets[$handle]["data"], $currentMapSetId, $currentFreq, $bunnies);
}

function getBunnies(&$data, $setId, $freq, $bunnies){
    if(count($bunnies)>0){  //get the map's bunny plus the containing ids
        $sql = "select setid, freq, g.geoid, data, firstdt100k, lastdt100k, g.name as geoname, g.containingid, g.jvectormap as map_code
            from setdata sd inner join geographies g on sd.geoid = g.geoid
            where sd.setid=$setId and sd.freq = '$freq' and sd.latlon='' and sd.geoid in (".implode(",",$bunnies).")";
        $result = runQuery($sql);
        while($row = $result->fetch_assoc()){
            $data["G".$row["geoid"]] = [
                "handle"=>"S".$row["setid"].$row["freq"]."G".$row["geoid"],
                "geoid"=>$row["geoid"],
                "geoname"=>$row["geoname"],
                "cg"=>$row["containingid"],
                "data"=>$row["data"],
                "firstdt"=>$row["firstdt100k"]*100000,
                "lastdt"=>$row["lastdt100k"]*100000,
                "isBunny"=>true
            ];
        }
    }
}

function getPointSets(&$assets, $map, $requestedSets, $mustBeOwnerOrPublic = false){
    //note: works for us state map, but not us county map.  But that's fine because such a map (of a NUTS map of Europe) with markers would be too crowded and slow
    global $db, $orgid, $command;
    $uid = intval($_POST["uid"]);
    $setFilters = [];
    for($i=0;$i<count($requestedSets);$i++){
        $setFilters[] = "(s.setid=".$requestedSets[$i]["setid"]." AND sd.setid=".$requestedSets[$i]["setid"]." AND sd.freq='".$requestedSets[$i]["freq"]."')";
    }
    $setFilter = implode(" OR ", $setFilters);
    $safeMap = safeStringSQL($map);
    $sql = "SELECT s.setid, left(s.settype,1) as settype, s.name as setname, s.maps, s.freqs, s.themeid,
      s.metadata as setmetadata, s.lastsetdt100k, s.firstsetdt100k,
      s.src, s.url, s.units, s.userid, s.orgid, sd.geoid, alias.name as seriesname, sd.freq, sd.data,
      sd.metadata as seriesmetadata, sd.latlon, sd.lastdt100k, sd.firstdt100k, sd.url as seriesurl
        FROM sets s, setdata sd, sets alias, mapgeographies mg, maps m
        WHERE s.setid=sd.setid and alias.mastersetid =s.setid and alias.latlon=sd.latlon and  ($setFilter)
        and m.map  = $safeMap
        and mg.geoid=sd.geoid and ((mg.map=$safeMap and mg.map=m.map) or m.bunny=sd.geoid)";
    if($mustBeOwnerOrPublic){
        $sql .= " and (s.userid is null or s.userid= $uid or s.orgid=$orgid)"; //assumes requiresLogin already run
    }
    $sql .= " order by s.setid";
    logEvent("getPointSets", $sql);
    $result = runQuery($sql);
    $currentMasterSetId = 0;
    while($row = $result->fetch_assoc()){
        if($currentMasterSetId!=$row["setid"]){ //new pointset = need header
            $currentMasterSetId=$row["setid"];
            $handle = "X".$currentMasterSetId.$row["freq"];
            $assets[$handle] = [
                "setid"=>$currentMasterSetId,
                "maps"=>[],
                "setname"=>$row["setname"],
                "units"=>$row["units"],
                "freq"=>$row["freq"],
                "src"=>$row["src"],
                "themeid"=>$row["themeid"],
                "setmetadata"=>$row["setmetadata"],
                "settype"=>$row["settype"],
                "firstdt"=>$row["firstsetdt100k"]*100000,
                "lastdt"=>$row["lastsetdt100k"]*100000,
                "data"=>[]
            ];
            if($command != "GetEmbeddedGraph") {
                $assets[$handle]["freqs"] = freqsFieldToArray($row["freqs"]);
                $assets[$handle]["maps"] = mapsFieldCleanup($row["maps"]);
            }
        }
        $assets[$handle]["data"][$row["latlon"]] = [
            "handle"=>"S$row[setid]$row[freq]G$row[geoid]L$row[latlon]",
            "geoid"=>$row["geoid"],
            "latlon"=>$row["latlon"],
            "seriesname"=>$row["seriesname"],
            "data"=>$row["data"],
            "firstdt"=>$row["firstdt100k"]*100000,
            "lastdt"=>$row["lastdt100k"]*100000
        ];
        if($row["seriesmetadata"]!=null) $assets[$handle]["data"][$row["latlon"]]["metadata"] = $row["seriesmetadata"];
        if($row["seriesurl"]!=null) $assets[$handle]["data"][$row["latlon"]]["url"] = $row["seriesurl"];
        $assets[$handle]["firstdt"] = min($assets[$handle]["firstdt"], $row["firstdt100k"]*100000);
        $assets[$handle]["lastdt"] = max($assets[$handle]["lastdt"], $row["lastdt100k"]*100000);
    }
}

function freqsFieldToArray($freqs){
    global $ft_join_char;
    if(!$freqs) return [];
    return explode(",", str_replace("F".$ft_join_char, "", $freqs));
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
                $data = substr($data, $startFound+1);
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

function flushCloudFlare($ghash){
    $cloudFlareApiUrl = "https://www.cloudflare.com/api_json.html";
    $cloudFlareVars = [
        "a"=> "zone_file_purge",
        "tkn" => "2f92b26e13db9ce6943264cdf9be1d1e75b42",
        "email" => "mark_c_elbert@yahoo.com",
        "z" => "mashabledata.com",
        "url" => "http://www.mashabledata.com/graph_data/".$ghash.".js"
    ];
    //url-ify the data for the POST
    $fieldVars = [];
    foreach($cloudFlareVars as $key=>$value) { $fieldVars[] = $key . '=' . urlencode($value); }

    //open connection
    $ch = curl_init();

//set the url, number of POST vars, POST data
    curl_setopt($ch, CURLOPT_URL, $cloudFlareApiUrl);
    curl_setopt($ch, CURLOPT_POST, count($fieldVars));
    curl_setopt($ch, CURLOPT_POSTFIELDS, implode("&", $fieldVars));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER , true);

//execute post
    $result = curl_exec($ch);

//close connection
    curl_close($ch);
}