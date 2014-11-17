<?php
$event_logging = true;
$sql_logging = true;
$ft_join_char = "©";
$web_root = "/var/www/vhosts/mashabledata.com/httpdocs";
$cache_TTL = 60; //public_graph and cube cache TTL in minutes
include_once($web_root . "/global/php/common_functions.php");
date_default_timezone_set('UTC');
header('Content-type: text/html; charset=utf-8');

//$usageTracking = trackUsage("count_datadown");



/* This is the sole API for the MashableData Workbench application connecting
 * the client application to the cloud.  All returns are JSON objects. Supports the following:
 *
 * command: SearchSeries  (anonymous permitted)
 *   search
 *   freq
 * command: SearchGraphs  (anonymous permitted)
 *   search
 *
 * command: GetPublicGraph     (anonymous permitted)
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
 * command: GetMashableData -> the entire mashabledata as object, with points as string property "data"
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
        if ( isset( $_POST['iDisplayStart'] ) && $_POST['iDisplayLength'] != '-1' ) {
            $sLimit = " LIMIT ".$db->real_escape_string( $_POST['iDisplayStart'] ).", "
                . $db->real_escape_string( $_POST['iDisplayLength'] );
        }

        $aColumns=array("name", "units", "firstdt", "lastdt");

        //$sql = "SELECT SQL_CALC_FOUND_ROWS ifnull(concat('U',s.userid), concat('S',s.seriesid)) as handle , s.seriesid, s.userid, mapsetid, pointsetid, name, units, freq as period, title, src, url, ";


        $sql = "SELECT SQL_CALC_FOUND_ROWS
        concat(if(s.latlon='', left(s.settype,1),'S'), s.setid) as handle,
        concat(left(coalesce(s2.settype, s.settype),1), coalesce(s.mastersetid, s.setid)) as sethandle,
        s.setid, s.latlon, s.mastersetid, s.userid, s.name, s.units, s.freqs, s.titles, coalesce(s.src, a.name) as src, coalesce(s.url, a.url) as url,
        s.firstsetdt100k*100000 as firstdt, s.lastsetdt100k* 100000 as lastdt, s.apiid, replace(coalesce(s2.maps, s.maps),'F©','') as maps, s.ghandles
        FROM sets s left outer join apis a on s.apiid=a.apiid left outer join sets s2 on s.mastersetid=s2.setid ";
        //problem: the url may be stored at the setdata level = too costly to join on every search THEREFORE  move URL link to quick view
        //handle may be modified in read loop depending on detected geographies and
        if($catid>0){
            //1. if category search, this is simple
            $sql .= " INNER JOIN categoryseries cs on s.seriesid = cs.seriesid WHERE catid=$catid";
        } else {
            //2. look for geo matching and search sets if
            $foundGeos = [];
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
                    $foundGeos["G©".$aRow["geoid"]] = [
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
                $periodTerm = $freq == "all"?"":" +F©".$freq;
                $mapTerm = $mapFilter == "none"?"":" +M©".$mapFilter;
                $mainBooleanSearch = "($search $periodTerm $mapTerm)";
                foreach($foundGeos as $ghandle => $geoSearchDetails){
                    $geoSearchWords  = $geoSearchDetails["seachWords"];
                    $mainBooleanSearch .= " OR ($geoSearchWords $periodTerm $mapTerm +$ghandle)";
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
       /* $sQuery = "SELECT COUNT(seriesid)FROM series";
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
        while ($aRow = $result->fetch_assoc()) { //handle, setid, mastersetid, userid, name, units, period, title, src, url, firstdt, lastdt, apiid, maps, ghandles
            $found = false;
            $aRow["maps"] = str_replace("M©","", $aRow["maps"]);
            $aRow["freqs"] = str_replace("F©","", $aRow["freqs"]);
            foreach($foundGeos as $ghandle => $geoSearchDetails){
                if(strpos($aRow["ghandles"].",", "$ghandle,")!==false){
                    //logEvent("ghandle matched", $ghandle);
                    $thisRow = $aRow; //copy
                    unset($thisRow["ghandles"]);
                    $thisRow["name"] .= ": ".$geoSearchDetails["name"];
                    $thisRow["geoid"] =  intval(str_replace("G©", "", $ghandle));
                    $thisRow["handle"] = "S" . $thisRow["setid"] . str_replace("©","", $ghandle);
                    $output['aaData'][] = $thisRow;
                    $found = true;
                }
            }
            if(!$found){
                unset($aRow["ghandles"]);
                $output['aaData'][] = $aRow;
            }
        }
        break;
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
        $freq =  $_POST['freq'];
        $apiid =  $_POST['apiid'];
        $catid =  intVal($_POST['catid']);
        $mapset =  $_POST['mapset'];

        if(count($search) == 0 || count($freq)== 0) die("invalid call.  Err 101");

        $sLimit = " ";
        if ( isset( $_POST['iDisplayStart'] ) && $_POST['iDisplayLength'] != '-1' ) {
            $sLimit = " LIMIT ".$db->real_escape_string( $_POST['iDisplayStart'] ).", "
                . $db->real_escape_string( $_POST['iDisplayLength'] );
        }

        $aColumns=array("name", "units", "freq", "firstdt", "lastdt", "title");

        $sql = "SELECT SQL_CALC_FOUND_ROWS ifnull(concat('U',s.userid), concat('S',s.seriesid)) as handle , s.seriesid, s.userid, mapsetid, pointsetid, name, units, freq as period, title, src, url, "
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
        if($freq != "all") {
            $sql = $sql . " AND freq='" . $freq . "'";
        };
        if($mapset=='mapsets'){
            $sql = $sql . " AND mapsetid is not null AND pointsetid is null  ";
        }
        if($mapset=='pointsets'){
            $sql = $sql . " AND pointsetid is not null AND mapsetid is null";
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

        $result = runQuery($sql, "SearchSeries");

        /* Data set length after filtering */
        $sQuery = "
            SELECT FOUND_ROWS()
        ";
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
        //$freq =  $_POST['period'];
        //$user_id =  intval($_POST['uid']);
        if(count($search) == 0) die("invalid call.  Err 106");
        $sLimit = " ";
        if ( isset( $_POST['iDisplayStart'] ) && $_POST['iDisplayLength'] != '-1' ) {
            $sLimit = " LIMIT ".$db->real_escape_string( $_POST['iDisplayStart'] ).", "
                . $db->real_escape_string( $_POST['iDisplayLength'] );
        }
        $aColumns=array("g.title", "g.map", "g.text", "g.serieslist", "views", "ifnull(g.updatedt , g.createdt)");

        $sql = "SELECT g.graphid, g.title, map, text as analysis, serieslist, ghash, views, "
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

    case "GetMyGraphs":   //get only skeleton.  To view graph, will require call to GetMyGraph
        requiresLogin();
        $user_id =  intval($_POST['uid']);
        $output = getGraphs($user_id, '');
        break;
    case "GetPublicGraph":  //data and all: the complete protein!
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
            $sql = "select createmtime, coalesce(refreshmtime, createmtime) as lastrefresh, graphjson from graphcache where ghash=$ghash_var";
            $result = runQuery($sql);
            if($result->num_rows==1){
                $row = $result->fetch_assoc();
                $age = $currentmt-$row['createmtime'];
                if($age<$cache_TTL*60*1000 && ($row['lastrefresh']==null || $currentmt-$row['lastrefresh']<60*1000)){ //TTL = 15 minutes, with a 60 second refresh lock
                    //cache good! (or another refresh in progress...)
                    $graph_json = (string) $row["graphjson"];
                    $output = json_decode($graph_json, true, 512, JSON_HEX_QUOT);
                    //$output = ["json"=>$graph_json];
                    $output["cache_age"] =  $age / 1000 . "s";
                } else {
                    //cache needs refreshing
                    runQuery("update graphcache set lastrefresh = $currentmt where ghash=$ghash_var");
                }
            }
            if(!isset($output)){
                //2. fetch if not in cache or needs refreshing
                $output = getGraphs(0, $ghash);
                //trim data based on graph end, start and interval dates using dataSliver()
                foreach($output["graphs"] as $ghandle => $graph){
                    if($graph["start"] || $graph["end"] || $graph["intervals"]){
                        foreach($graph["assets"] as $ahandle => $asset){
                            $atype = (substr($ahandle, 0, 1));
                            switch($atype){
                                case "M":
                                    foreach($asset["data"] as $geo => $series){
                                        $output["graphs"][$ghandle]["assets"][$ahandle]["data"][$geo]["data"] = dataSliver($series["data"], $asset["period"], $series["firstdt"], $series["lastdt"], $graph["start"], $graph["end"], $graph["intervals"]);
                                        /*                                        $output["period"]= $asset["period"];
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
                                    $asset["data"] = dataSliver($asset["data"], $asset["period"], $asset["firstdt"], $asset["lastdt"], $graph["start"], $graph["end"], $graph["intervals"]);
                                    break;
                                case "X":
                                    foreach($asset["data"] as $laton => $series){
                                        $series["data"] = dataSliver($series["data"], $asset["period"], $series["firstdt"], $series["lastdt"], $graph["start"], $graph["end"], $graph["intervals"]);
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
                    insert into embedlog (host, obj, objfetches) values ($ghash_var, $host, 1)
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
    case "GetSets": //used to perform all asset and data fetches in a single call (no ambiguous sets; for that use GetMashableData)
        $output = ["status"=>"ok", "sets"=>[]];
        if($series = (isset($_POST["series"]) && count($_POST["series"])>0) ? $_POST["series"] : false){
            $sql = "select s.metadata as setmetadata, s.name, sd.setid, sd.geoid, sd.freq, s.freqs, sd.latlon, s.maps, g.name as geoname
            from sets s join setdata on s.setid=sd.setid left outer join geographies on sd.geoid=g.geoid where ";
            $filters = [];
            foreach($series as $serie){
                $filter = "(s.setid= $serie[setid] and sd.freq=$serie[freq]";
                if(isset($serie["geoid"])) $filter .= " and sd.geoid=$serie[geoid]";
                if(isset($serie["latlon"])) $filter .= " and sd.latlon=$serie[latlon]";
                $filter .= ")";
                $filters[] = $filter;
            }
            $sql .= implode(" OR ", $filters);
            $result  = runQuery($sql, "GetSets: series");
            while($row=$result->fetch_assoc()){
                $handle = $row["type"].$row["setid"].$row["freq"]."G".$row["setid"].($row["latlon"]?"L".$row["latlon"]:"");
                $output["series"][$handle] = $row;

            }
        }

        if($map = isset($_POST["map"]) ? $_POST["map"] : false){
            $output["map"] = $map;
            if($regionSets = (isset($_POST["regionSets"]) && count($_POST["regionSets"])>0) ? $_POST["regionSets"] : false){
                getRegionSets($output, $map, $regionSets, true);
            }
            if($markerSets = (isset($_POST["markerSets"]) && count($_POST["markerSets"])>0) ? $_POST["markerSets"] : false){
                getMarkerSets($output, $map, $markerSets, true);
            }
        }
        break;
    case "GetMapSets":  //called only by grapher.fetchAssets (commented out in seriesEditor)
        $usageTracking = trackUsage("count_graphsave");
        $map = $_POST["map"];
        $output = array("status"=>"ok", "map"=>$map, "mapsets"=>getRegionSets($map, cleanIdArray($_POST["mapsetids"]), true));
        break;
    case "GetPointSets": //called by workbench showSeriesEditor and by grapher.fetchAssets
        $usageTracking = trackUsage("count_graphsave");
        $map = $_POST["map"];
        $output = array("status"=>"ok", "map"=>$map, "pointsets"=>getMarkerSets($map, cleanIdArray($_POST["pointsetids"]), true));
        break;
    case "GetSet":  //called only in showSeriesEditor = left outer join to grab unused regions
        $mapsetid = intval($_POST["mapsetid"]);
        $sqlHeader = "select * from mapsets where mapsetid = ".$mapsetid;
        $sqlSetSeries = "select g.geoid, g.name as geoname, g.iso3166, concat(if(isnull(s.userid),'S','U'), seriesid) as handle, seriesid, s.name, s.units, s.userid, s.units_abbrev, title, data, notes"
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
        break;

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

        $sql = "select * from maps where map<>name order by map";
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
        if(!isset($_POST["themeids"]) && !isset($_POST["cubeid"])){
            $output = ["status"=>"must provide  valid cube or theme id"];
        } else {
            $cubeid = isset($_POST["cubeid"])?intval($_POST["cubeid"]):0;
            $themeids = isset($_POST["themeids"])?implode(",", cleanIdArray($_POST["themeids"])):0;
            $output = ["status"=>"ok", "themes"=>[]];

            $sql = "select t.themeid, t.name as themename, c.cubeid, c.name from cubes c inner join themes t on t.themeid=c.themeid where c.cubeid=$cubeid or (c.themeid in (".$themeids.") and c.name<>'total')";
            $result = runQuery($sql,"GetCubeList");
            while($row = $result->fetch_assoc()){
                if(!isset($output["themes"]["T".$row["themeid"]])) $output["themes"]["T".$row["themeid"]] = [
                    "themeid" => $row["themeid"],
                    "name" => $row["themename"],
                    "cubes" => []
                ];
                array_push($output["themes"]["T".$row["themeid"]]["cubes"], ["cubeid"=>$row["cubeid"], "name"=>$row["name"]]);
            }
        }
        break;
    case "GetCubeSeries":
        if(!isset($_REQUEST["geokey"]) || !isset($_REQUEST["cubeid"])){
            $output = ["status"=>"invalid cube id or geography"];
        } else {
            $cubeid = intval($_REQUEST["cubeid"]);
            $geokey = $_REQUEST["geokey"];

            //1. check cache
            $currentmt = microtime(true);
            $ghash_var = safeStringSQL($cubeid.":".$geokey);
            $sql = "select createmtime, coalesce(refreshmtime, createmtime) as lastrefresh, graphjson from graphcache where ghash=$ghash_var";
            $result = runQuery($sql);
            if($result->num_rows==1){
                $row = $result->fetch_assoc();
                $age = $currentmt-$row['createmtime'];
                if($age<$cache_TTL*60*1000 && ($row['lastrefresh']==null || $currentmt-$row['lastrefresh']<60*1000)){ //TTL = 15 minutes, with a 60 second refresh lock
                    //cache good! (or another refresh in progress...)
                    $cube_json = (string) $row["graphjson"];
                    $output = json_decode($cube_json, true, 512, JSON_HEX_QUOT);
                    $output["cache_age"] =  $age / 1000 . "s";
                } else {
                    //cache needs refreshing
                    runQuery("update graphcache set lastrefresh = $currentmt where ghash=$ghash_var");
                }
            }
            if(!isset($output)){
                //2. fetch if not in cache or needs refreshing
                $output = ["status"=>"ok", "cubeid"=>$cubeid, "geokey"=>$geokey];
                //todo:  check for latlon geokey and geoid geokey. For now, aussume jvectormap code

                if(is_numeric($geokey)){
                    $geoid = $geokey;
                } else {
                    $sql = "select geoid from geographies where jvectormap=".safeStringSQL($geokey);
                    $result = runQuery($sql);
                    if($result->num_rows==1){
                        $row = $result->fetch_assoc();
                        $geoid = $row["geoid"];
                    } else {
                        $output = ["status"=>"invalid geography key"];
                        break;
                    }
                }
                getCubeSeries($output, $cubeid, $geoid);


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
        $sql = "select g1.regexes as regex, g2.name as replacement from geographies g1, geographies g2 "
            ." where g1.geoid=".intval($_POST["fromgeoid"])." and g2.geoid=".intval($_POST["togeoid"]);
        $result = runQuery($sql, "ChangeMaps: get bunny regex");
        $output = $result->fetch_assoc();
        $output["status"] = "ok";
        $output["bunnies"] = array();
        $bunnies = isset($_POST["bunnies"])?$_POST["bunnies"]:[];
        foreach($bunnies as $bunny=>$set){
            $sid = substr($bunny,1); //remove the leading U or S
            $sql = "SELECT s.name, s.mapsetid, s.pointsetid, s.notes, s.skey, s.seriesid as id, lat, lon, geoid,  s.userid, "
                . "s.title as graph, s.src, s.url, s.units, s.data, s.freq as period, 'S' as save, 'datetime' as type, firstdt, "
                . "lastdt, hash as datahash, ms.counts as geocounts "
                . " FROM series s left outer join mapsets ms on s.mapsetid=ms.mapsetid "
                . " WHERE s.pointsetid is null and s.mapsetid =" . intval($set["mapsetid"])." and geoid=".intval($_POST["togeoid"]);  //todo: add security here and to GetMashableData to either be the owner or org or be part of a graph whose owner/org
            $result = runQuery($sql, "ChangeMaps: get series");
            if($result->num_rows==1){
                $output["bunnies"][$bunny] = $result->fetch_assoc();
                $output["bunnies"][$bunny]["handle"] = ($output["bunnies"][$bunny]["userid"]===null?"S":"U").$output["bunnies"][$bunny]["id"];
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
            $sql = "SELECT s.name, s.mapsetid, s.pointsetid, s.notes, s.skey, s.seriesid as id, lat, lon, geoid,  s.userid, "
                . "s.title as graph, s.src, s.url, s.units, s.data, freq as period, 'S' as save, 'datetime' as type, firstdt, "
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
        $sql = "SELECT  s.userid, u.name as username, s.name, setkey, s.setid, s.settype, maps,
            titles as categories, s.metadata as setmetadata, saved as save, null as 'decimal', src, s.url, s.units,
            adddt as save_dt, 'datetime' as type, freqs, firstsetdt100k*100000 as firstsetdt, lastsetdt100k*100000 as lastsetdt
            FROM sets s
            inner join  mysets ms on s.setid=ms.setid
            left outer join users u on s.userid=u.userid
            WHERE ms.userid=" . $user_id;
        $result = runQuery($sql);
        $output = array("status"=>"ok","series" => array());
        while ($aRow = $result->fetch_assoc()){
            $aRow["handle"] = handle($aRow);
            $aRow["rawmaps"] = $aRow["maps"] ;
            $aRow["maps"] = str_replace('M©', '' ,$aRow["maps"]);
            $aRow["freqs"] = freqsFieldToArray($aRow["freqs"]);
            $output["sets"][$aRow["handle"]] = $aRow;
        }
        break;
    case "GetCatChains":
        $seriesid = intval($_POST["sid"]);
        if($seriesid == 0){ //get list of APIs to browse = select children of root category
            $sql = <<<EOS
                SELECT c.catid, c.name, COUNT( DISTINCT cs2.seriesid ) AS scount, COUNT( DISTINCT cc2.childid ) AS children
                FROM categories c
                INNER JOIN catcat cc ON c.catid = cc.childid
                LEFT OUTER JOIN categoryseries cs2 ON c.catid = cs2.catid
                LEFT OUTER JOIN catcat cc2 ON cc.childid = cc2.parentid
                WHERE cc.parentid =5506
                GROUP BY c.catid, c.apicatid, c.name
EOS;
        } else {
            $sql = <<<EOS
            SELECT c.catid, c.name, COUNT(DISTINCT cs2.seriesid ) AS scount,
             COUNT(DISTINCT childid ) AS children
            FROM categories c
              INNER JOIN categoryseries cs ON  c.catid = cs.catid
              INNER JOIN categoryseries cs2 ON  c.catid = cs2.catid
              LEFT OUTER JOIN catcat cc ON c.catid = cc.parentid
            WHERE cs.seriesid = $seriesid and c.catid<>5506
            GROUP BY c.catid, c.apicatid, c.name
EOS;
//don't get the root category
        }
        logEvent("GetCatChains: get series cats", $sql);
        $catrs = runQuery($sql);
        $chains = array();
        while($catinfo = $catrs->fetch_assoc()){
            $chains["C".$catinfo["catid"]] = array(array("catid"=>$catinfo["catid"], "name"=>$catinfo["name"], "scount"=>$catinfo["scount"], "children"=>$catinfo["children"]));
        }
        while(BuildChainLinks($chains)){}  //work occurs in BuildChains (note: $chains passed by ref)
        /* foreach($chains as $name => $chain){
             array_pop($chain); // get rid of terminal cats added in BuildChainLinks
         }*/
        $output = array("chains"=>$chains);
        $output["sid"] = $seriesid;
        $output["status"] = "ok";
        break;
    case "GetCatSiblings":
        $catid = intval($_POST["catid"]);
        $sql = "SELECT c.catid, c.name, COUNT(DISTINCT cs.seriesid ) AS scount
            , COUNT(DISTINCT kids.childid ) AS children
            FROM catcat parent
            INNER JOIN catcat siblings ON siblings.parentid = parent.parentid
            INNER JOIN  categories c  ON c.catid = siblings.childid
            LEFT OUTER JOIN categoryseries cs ON  siblings.childid = cs.catid
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
            c.catid, c.name, COUNT(DISTINCT cs.seriesid ) AS scount, COUNT(DISTINCT kids.childid ) AS children
            FROM catcat siblings
            INNER JOIN  categories c  ON c.catid = siblings.childid
            LEFT OUTER JOIN categoryseries cs ON  siblings.childid = cs.catid
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
            $sql = "delete g, gp, ps from graphs g, graphplots gp, plotcomponents ps
                where g.graphid=gp.graphid and gp.plotid=ps.plotid
                and g.userid = $user_id and g.graphid in ( $gid_list )";
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
        $user_id =  isset($_POST['uid']) ? intval($_POST['uid']) : 0;
        if($_POST['published']=='Y'){$published = "Y";} else  {$published = "N";}
        $createdt = isset($_POST['createdt'])?intval($_POST['createdt']/1000)*1000:null;  //WAMP 16bit math compatibility
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

        if($gid==0){
            $ghash = makeGhash($user_id);  //ok to use uid instead of gid as ghash is really just a random number
            $sql = "insert into graphs (userid, published, title, text, type, "
                . " intervalcount, fromdt, todt, annotations, serieslist, map, mapconfig, views, createdt, ghash) values ("
                . $user_id . ", '" . $published . "',". safeSQLFromPost("title") . "," . safeSQLFromPost("analysis")
                . ", '" . $type . "', " . $intervals
                . ", " . $from . ", ". $to . ", ". safeSQLFromPost("annotations") . ", " . safeSQLFromPost("serieslist")
                . ", " . safeSQLFromPost("map") . ", " . safeSQLFromPost("mapconfig")   . ", 0, ".$createdt.",'". $ghash . "')";
            if(!runQuery($sql, "ManageMyGraphs: insert graphs record")){$output = array("status" => "fail on graph record insert", "post" => $_POST);break;}
            $gid = $db->insert_id;
        } else {
            $sql = "update graphs set userid=" . $user_id . ", published='" . $published . "', title=". safeSQLFromPost("title")
                . ", text=" . safeSQLFromPost("analysis") . ", type='" . $type . "', intervalcount="
                . $intervals . " , fromdt=" . $from
                . ", todt=" . $to . ", annotations=" . safeSQLFromPost("annotations") . ", updatedt=".$updatedt
                . ", serieslist=" . safeSQLFromPost("serieslist")
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
        if(isset($_POST['mapsets'])){
            $mapsets = $_POST['mapsets'];
            for($i=0;$i<count($mapsets);$i++){
                $mapset = $mapsets[$i];
                $sql = "insert into graphplots (graphid, type, options, legendorder) "
                    . " values (".$gid.",'M',".safeStringSQL($mapset["options"]).",".($i+1).")";
                runQuery($sql, "ManageMyGraphs: mapsets into graphplots");
                $thisPlotId = $db->insert_id;
                for($j=0;$j<count($mapset["components"]);$j++){
                    $component = $mapset["components"][$j];
                    $sql="insert into plotcomponents (plotid, comporder, objtype, objid, options) values "
                        . "(".$thisPlotId.",".($j+1).",'".substr($component["handle"],0,1)."',"
                        . intval(substr($component["handle"],1)).",".safeStringSQL($component["options"]).")";
                    runQuery($sql,"ManageMyGraphs: insert plotcomponents record");
                }
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
            $capture_dt = $series[$i]['save_dt'];
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
            $sql = "SELECT seriesid, data FROM series WHERE name='" . $db->real_escape_string ($series_name) . "' and title = '" . $db->real_escape_string ($graph_title)
                . "' and url = '" . $db->real_escape_string ($url) . "' and freq = '" . $db->real_escape_string ($freq)
                . "' and units = '" . $db->real_escape_string ($units) . "' and userid=".$user_id;
            $result = runQuery($sql, "uploadMashableData: search whether this user series exists");
            if($result->num_rows!=0){
                $row = $result->fetch_assoc();
                $seriesid = $row["seriesid"];
                if($data!=$row["data"]){
                    $sql = "update series set data='".$db->real_escape_string ($data)."', firstdt=".$firstdt.", lastdt=".$lastdt." where seriesid=".$seriesid;
                    runQuery($sql, $command);
                }
                $sql = "update myseries set adddt = ".intval($_POST["adddt"])." where seriesid=".$seriesid." and userid=".$user_id;
                runQuery($sql, $command);
            } else {
                $sql = "insert into series (userid, skey, name, namelen, src, units, units_abbrev, freq, title, url, notes, data, hash, apiid, firstdt, lastdt, geoid, mapsetid, pointsetid, lat, lon) "
                    . " values (".$user_id.",".safeStringSQL($skey).",".safeStringSQL($series_name).",".strlen($series_name).",".safeStringSQL($src).",".safeStringSQL($units).",".safeStringSQL($units).",".safeStringSQL($freq).",".safeStringSQL($graph_title).",".safeStringSQL($url).",'private user series acquired through via a chart using the MashableData chart plugin',".safeStringSQL($data).",".safeStringSQL(sha1($data)).",null,".$firstdt.",".$lastdt.",".($geoid===null?"null":$geoid).",". ($mapsetid===null?"null":$mapsetid) .",". ($pointsetid===null?"null":$pointsetid).",".($lat===null?"null":safeStringSQL($lat)).",". ($lon===null?"null":safeStringSQL($lon)).")";
                $queryStatus = runQuery($sql, $command);
                if($queryStatus!==false){
                    $seriesid = $db->insert_id;
                    $output["handles"][$local_handle] = 'U'.$seriesid;
                    runQuery("insert into myseries (seriesid, userid, adddt) values (".$seriesid.",".$user_id.",".intval($capture_dt).")", $command);
                }
                else {
                    $output["status"] = "error adding local series";
                    break;
                }
            }
            $output['handles'][$local_handle] = 'U'.$seriesid;

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
                    . ", period=".safeStringSQL(isset($arySeries[$i]["freq"])?$arySeries[$i]["freq"]:"")
                    . ", data='" . $db->real_escape_string($data) . "'"
                    . ", hash='" . sha1($data)  . "'"
                    . ", firstdt=" . intval($arySeries[$i]['firstdt']/1000)*1000
                    . ", lastdt=" . intval($arySeries[$i]['lastdt']/1000)*1000
                    . " WHERE userid=".$user_id." and seriesid=".$usid;
                runQuery($sql);
                $sql = "UPDATE myseries SET adddt=".intval($arySeries[$i]["save_dt"]/1000)*1000 . " WHERE userid=".$user_id." and seriesid=".$usid;
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
                $sql="insert into myseries (userid, seriesid, adddt) values (".$user_id.",".$usid.",".intval($arySeries[$i]["save_dt"]/1000)*1000 .")";
                runQuery($sql, "myseries insert for new user series");
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

    case "GetMashableData":
        $usageTracking = trackUsage("count_seriesview");
        if(!$usageTracking["approved"]){
            $output = array("status"=>$usageTracking["msg"]);
            break;
        }
        if(isset($_POST['handles'])){
            $shandles = $_POST['handles'];
        } else {
            $output = ["status"=>"Empty data request"];
            break;
        }

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
            $sql = "
            SELECT s.name, s.setid, s.pointsetid, s.themeid, s.freqset, s.notes, s.skey, s.seriesid as id, lat, lon, geoid,  s.userid,
            s.title as graph, s.src, s.url, s.units, s.data, s.freq as period, 'S' as save, 'datetime' as type, firstdt,
            lastdt, hash as datahash, ifnull(ms.counts, ps.counts) as geocounts
            FROM series s left outer join mapsets ms on s.mapsetid=ms.mapsetid left outer join pointsets ps on s.pointsetid=ps.pointsetid
            WHERE s.seriesid in (" . implode($clean_seriesids,",") .") and (s.userid is null or s.userid = $user_id or orgid=$orgid)";
            $result = runQuery($sql, "GetMashableData series");

            while ($aRow = $result->fetch_assoc()) {
                if($aRow["geocounts"]!==null) { //stored as JSON without final braces by /admin/crawlers/start_apirun?command=SetCounts
                    $ary = json_decode('{"a":{'.$aRow["geocounts"].'}}', true);
                    $aRow["geocounts"] = $ary["a"];
                    if($aRow["geoid"]!==null && ($aRow["mapsetid"]!==null || $aRow["pointsetid"]!==null)){
                        $sql = 'select m.map, geographycount from mapgeographies mg join maps m on mg.map=m.map where geoid='.$aRow["geoid"];
                        if($aRow["pointsetid"]){
                            $sql .= ' or bunny = '.$aRow["geoid"] . ' group by map';
                        }
                        $geoResult = runQuery($sql,"GetMashableData geographies");
                        while ($gRow = $geoResult->fetch_assoc()) {
                            if(isset($aRow["geocounts"][$gRow["map"]])){
                                $aRow["geocounts"][$gRow["map"]]["regions"] = intval($gRow["geographycount"]);
                            } else {
                                $aRow["geocounts"][$gRow["map"]] = array("regions"=>intval($gRow["geographycount"]));
                            }
                        }
                    }
                }

                if($aRow["freqset"]!==null){
                    $freqset = '{"a":{'.$aRow["freqset"].'}}';
                    $ary = json_decode($freqset, true);
                    $aRow["freqset"] = $ary["a"];
                }
                if($aRow["themeid"]!==null && intval($aRow["themeid"])!=0){
                    $cubeResults = runQuery("select c.cubeid, c.name from cubes c where c.themeid=".$aRow["themeid"]);
                    $aRow["cubes"] = [];
                    while($cubeRow = $cubeResults->fetch_assoc()){
                        array_push($aRow["cubes"], $cubeRow);
                    }
                    $aRow["handle"] =  "S".$aRow["id"];
                    $aRow["sid"] =  $aRow["id"];
                }
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
            $sql = "SELECT c.catid, c.name, COUNT(DISTINCT childrenseries.seriesid ) AS scount "
                . ", COUNT(DISTINCT childrencats.childid ) AS children   "
                //. ", COUNT(DISTINCT silbingcats.childid ) AS sbilings   "
                . " FROM catcat current "
                . " INNER JOIN categories c ON c.catid = current.parentid "
                . " LEFT OUTER JOIN categoryseries childrenseries ON c.catid = childrenseries.catid "
                . " LEFT OUTER JOIN catcat childrencats ON c.catid = childrencats.parentid "
                //. " LEFT OUTER JOIN catcat parentcat ON c.catid = parentcat.childid "
                //. " LEFT OUTER JOIN catcat silbingcats ON parentcat.parentid = silbingcats.childid "
                . " WHERE current.childid =" . $lastcat["catid"]  //."  and c.catid<>5506 " //don't select root cat
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
};

function getGraphs($userid, $ghash){
//if $userid = 0, must be a public graph; otherwise must own graph
//note that series data is returned only if ghash is specified (i.e. a single graph request)
//mapset data is not returned.  Requires a call to getGraphMapSets
    if(strlen($ghash)==0 && intval($userid)==0){
        die('{"status":"Must provide valid a hash or user credentials."}');
    }
    $sql = "SELECT g.graphid as gid, g.userid, g.title, g.text as analysis, "
        . " g.map, g.mapconfig,  g.serieslist, "
        . " g.ghash,  g.fromdt, g.todt,  g.published, g.views, ifnull(g.updatedt, g.createdt) as updatedt, "
        . " m.jvectormap, m.bunny, m.legend, "
        . " s.name, s.units, setkey, s.src, s.freqs, s.metadata as setmetadata, s.latlon, s.firstsetdt100k*1000000 as firstsetdt, s.lastsetdt100k*100000 as lastsetdt, "
        . " gp.plotid, gp.type as plottype, gp.options as plotoptions, gp.legendorder, pc.objtype as comptype, pc.setid, "
        . " pc.options as componentoptions, pc.comporder, intervalcount, g.type, annotations "
        . " from graphs g left outer join maps m on g.map=m.map, graphplots gp, plotcomponents pc left outer join sets s on pc.setid=s.setid "
        . " where g.graphid=gp.graphid and gp.plotid=pc.plotid ";
    if(strlen($ghash)>0){
        $sql .=  " and ghash=".safeStringSQL($ghash);  //used by GetPublicGraph
    }else{
        requiresLogin();
        $sql .= " and g.userid=" . intval($userid);  //used by GetMyGraphs
    }
    $sql .= " order by updatedt desc, gid, plottype, gp.legendorder, pc.comporder";

    $result = runQuery($sql, "GetGraphs subfunc");
    if($result->num_rows==0 && strlen($ghash)>0){
        die('{"status":"No graph found. The author may have changed its code or deleted it."}');
    }
    $output = array("status"=>"ok","graphs" => array());
    $gid = 0;
    $plotid = 0;
    while ($aRow = $result->fetch_assoc()){
        if($gid != $aRow['gid']){ //avoid repeats due to the joined SQL recordset
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
                "intervals" => $aRow["intervalcount"]
            );
            //if($aRow["map"]!=null){
            $output['graphs']['G' . $gid]["map"] = $aRow["map"];
            $output['graphs']['G' . $gid]["bunny"] = $aRow["bunny"];
            $mapconfig = $aRow["mapconfig"];
            if($aRow["legend"]){
                $json = json_decode($mapconfig, true);
                $json["legendLocation"] = $aRow["legend"] ? $aRow["legend"] : "TR";
                $mapconfig = json_encode($json);
            }
            $output['graphs']['G' . $gid]["mapconfig"] = $mapconfig;
            $output['graphs']['G' . $gid]["mapFile"] = $aRow["jvectormap"];
            //}
            if(strlen($ghash)>0) $output['graphs']['G' . $gid]["assets"] = array();
        }
        //each record represents a new graph.plots.components object which are handle differently depending on whether it is a Line, Mapset or Pointset
        switch($aRow['plottype']){  //note: a region plot may have series in its calculation and therefore components ->  plottype <> objtype!
            case 'T':   //timeseries plot
                if($plotid!=$aRow['plotid']){ //avoid repeats due to the joined SQL recordset
                    $plotid =  $aRow['plotid'];
                    if(!isset($output['graphs']['G' . $gid]["plots"])){$output['graphs']['G' . $gid]["plots"]=array();}

                    array_push($output['graphs']['G' . $gid]["plots"], array(
                        "handle"=>"P".$plotid,
                        "options"=> $aRow["plotoptions"],
                        "components" => array()
                    ));
                }
                $thisPlotIndex = count($output['graphs']['G' . $gid]["plots"]) - 1;
                array_push($output['graphs']['G' . $gid]["plots"][$thisPlotIndex]["components"], array(
                        "handle"=> $aRow["comptype"].$aRow["objid"],
                        "options"=> $aRow["componentoptions"]
                    )
                );
                break;
            case 'M':  //regions plot (map set)
                if($plotid!=$aRow['plotid']){
                    $plotid =  $aRow['plotid'];
                    if(!isset($output['graphs']['G' . $gid]["mapsets"] )) $output['graphs']['G' . $gid]["mapsets"]=[];


                    array_push($output['graphs']['G' . $gid]["mapsets"], array(
                        "handle"=>"P".$plotid,
                        "options"=> $aRow["plotoptions"],
                        "components" => array()
                    ));
                }
                $thisSetIndex = count($output['graphs']['G' . $gid]["mapsets"])-1;
                array_push($output['graphs']['G' . $gid]["mapsets"][$thisSetIndex]["components"], array(
                        "handle"=> $aRow["comptype"].$aRow["objid"],
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
                        "options"=> $aRow["plotoptions"],
                        "components" => array()
                    ));
                }
                $thisSetIndex = count($output['graphs']['G' . $gid]["pointsets"])-1;
                array_push($output['graphs']['G' . $gid]["pointsets"][$thisSetIndex]["components"], array(
                        "handle"=> $aRow["comptype"].$aRow["objid"],
                        "options"=> $aRow["componentoptions"]
                    )
                );
                break;
            default:
                return(array("status"=>"unknown plot type"));
        }

        //each may create a new series asset. Repeated assets simply get overwritten and output only once.
        if(strlen($ghash)>0){
            $handle = $aRow["comptype"].$aRow["objid"];
            if($aRow["comptype"]=='S'||$aRow["comptype"]=='U'){
                $output['graphs']['G' . $gid]["assets"][$handle] = array(
                    "handle"=>$handle,
                    "name"=>$aRow["name"],
                    "units"=>$aRow["units"],
                    "src"=>$aRow["src"],
                    "lat"=>$aRow["lat"],
                    "lon"=>$aRow["lon"],
                    "notes"=>$aRow["notes"],
                    "firstdt"=> $aRow["firstdt"],
                    "lastdt"=> $aRow["lastdt"],
                    "period"=> $aRow["freq"],
                    "data" => $aRow["data"],
                    "geoid" => $aRow["geoid"],
                    "mapsetid" => $aRow["mapsetid"]
                );
                if($aRow["freqset"]!==null){
                    $freqset = '{"a":{'.$aRow["freqset"].'}}';
                    $ary = json_decode($freqset, true);
                    $output['graphs']['G' . $gid]["assets"][$handle]["freqset"] = $ary["a"];
                }
                if($aRow["comptype"]=='S'){
                    $output['graphs']['G' . $gid]["assets"][$handle]["sid"] = $aRow["objid"];
                }  else {
                    $output['graphs']['G' . $gid]["assets"][$handle]["usid"] = $aRow["objid"];
                }
            } elseif($aRow["comptype"]=='M'){
                //map assets created separately;
                $mapAsset = getMapSets($aRow["map"], array($aRow["objid"]));
                $output['graphs']['G' . $gid]["assets"][$handle] = $mapAsset[$handle];
            } elseif($aRow["comptype"]=='X'){

                $mapAsset = getPointSets($aRow["map"], array($aRow["objid"]));
                $output['graphs']['G' . $gid]["assets"][$handle] = $mapAsset[$handle];
            }
        }
    }
    if(strlen($ghash)>0){
        $mapconfig = isset($output["graphs"]["G" . $gid]["mapconfig"])?json_decode($output['graphs']['G' . $gid]["mapconfig"],true):null;
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
                getCubeSeries($output['graphs']['G' . $gid]["assets"], $mapconfig["cubeid"], $cubegeoid);
            }
        }
    }
    return $output;
}

function getRegionSets(&$output, $map, $requestedSets, $mustBeOwnerOrPublic = false){   //"GetMapSet" command (from QuickViewToMap and getGraphMapSets()
    global $db, $orgid;
    $setFilters = [];
    for($i=0;$i<count($requestedSets);$i++){
        $setFilters[] = ["(s.setid=".$requestedSets[$i]["setid"]." AND sd.setid=".$requestedSets[$i]["setid"]." AND sd.freq='".$requestedSets[$i]["freq"]."')"];
    }
    $sql = "SELECT s.setid, s.type, s.name, s.counts, s.freqs, s.themeid, s.metdata as setmetadata, s.src, s.url, s.units,
    g.jvectormap as map_code, s.userid, s.orgid, sd.geoid, g.name as geoname,
    sd.freq, sd.data, sd.metadata as seriesmetadata, sd.latlon, sd.lastdt100k, sd.firstdt100k
    FROM sets s, setdata sd, geographies g, mapgeographies mg, maps m
    WHERE (" . implode($setFilters, " OR ") . ")
    and mg.map  = " . safeStringSQL($map)
    ." and mg.geoid=sd.geoid and mg.geoid=g.geoid and mg.map=" . safeStringSQL($map);
    if($mustBeOwnerOrPublic){
        $sql .= " and (s.userid is null or s.userid= " . intval($_POST["uid"]) . " or orgid=" . $orgid . ")"; //assumes requiresLogin already run
    }
    $sql .= " ORDER by mapsetid";
    $result = runQuery($sql, "getMapSets");
    $currentMapSetId = 0;
    while($row = $result->fetch_assoc()){
        if($currentMapSetId!=$row["setid"]){
            //new mapset = need header
            $currentMapSetId=$row["setid"];
            $handle = "M".$currentMapSetId.$row["freq"]."G".$row["geoid"];
            $output["sets"][$handle] = array(
                "setid"=>$currentMapSetId,
                "maps"=>array(),
                "name"=>$row["name"],
                "units"=>$row["units"],
                "freq"=>$row["freq"],
                "src"=>$row["src"],
                "themeid"=>$row["themeid"],
                "metadata"=>$row["metadata"],
                "firstdt"=>$row["firstdt100k"]*100000,
                "lastdt"=>$row["lastdt100k"]*100000,
                "data"=>array()
            );
            if($row["freqs"]!==null){
                $output["sets"][$handle]["freqs"] = freqsFieldToArray($row["freqs"]);
            }
            if($row["maps"]!==null) {
                $output["sets"][$handle]["maps"] = mapsFieldToArray($row["maps"]);
            }
        }
        $output["sets"][$handle]["data"][$row["map_code"]] = [
            "handle"=>"S".$row["seriesid"].$row["freq"]."G".$row["geoid"],
            "geoid"=>$row["geoid"],
            "geoname"=>$row["geoname"],
            "data"=>$row["data"],
            "metadata"=>$row["seriesmetdata"],
            "firstdt"=>$row["firstdt100k"]*100000,
            "lastdt"=>$row["lastdt100k"]*100000
        ];
        if($row["latlon"]!=null) $output["sets"][$handle][$row["map_code"]]["latlon"] = $row["latlon"];
        $output["sets"][$handle]["firstdt"] = min($output["sets"][$handle]["firstdt"], $row["firstdt100k"]*100000);
        $output["sets"][$handle]["lastdt"] = max($output["sets"][$handle]["lastdt"], $row["lastdt100k"]*100000);
    }
    /*//after reading the rows, indicate order (could be done client side...)
    for($i=0;$i<count($regionSets);$i++){
        $output["M".$regionSets[$i]["setid"]."G".$regionSets[$i]["geoid"]]["order"]=$i+1;
    }*/
    return $output;
}


function getPointSets($map,$aryPointsetIds, $mustBeOwnerOrPublic = false){
    global $db, $orgid;
    $sql = "select ps.pointsetid, ps.name, ps.units, ps.freq as period, ps.freqset, ps.themeid, "
        . " s.seriesid, s.userid, s.orgid, s.geoid, s.src, s.lat, s.lon, s.name as seriesname, s.data, s.firstdt, s.lastdt "
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
            $mapout["X".$currentPointSetId] = array(
                "handle"=>"X".$currentPointSetId,
                "name"=>$row["name"],
                "units"=>$row["units"],
                "period"=>$row["period"],
                "src"=>$row["src"],
                "themeid"=>$row["themeid"],
                "data"=>array()
            );
        }
        if($row["freqset"]!==null){
            $freqset = '{"a":{'.$row["freqset"].'}}';
            $ary = json_decode($freqset, true);
            $mapout["X".$currentPointSetId]["freqset"] = $ary["a"];
        }
        $latlon = $row["lat"].",".$row["lon"];
        $mapout["X".$currentPointSetId]["coordinates"][$latlon] = array("latLng"=>array($row["lat"], $row["lon"]));
        $mapout["X".$currentPointSetId]["data"][$latlon] = array(
            "handle"=>"S".$row["seriesid"],
            "name"=>$row["seriesname"],
            "data"=>$row["data"],
            "firstdt"=>$row["firstdt"],
            "lastdt"=>$row["lastdt"]
        );
    }
    return $mapout;
}

function freqsFieldToArray($freqs){
    global $ft_join_char;
    return explode(" ", str_replace("F".$ft_join_char, "", $freqs));
}
function mapsFieldToArray($mapsField){
    global $ft_join_char;
    if($mapsField) {
        $maps = json_decode('{"a":{'.str_replace("M".$ft_join_char, "", $mapsField).'}}', true);
        return $maps["a"];
    } else {
        return null;
    }
}
function handle(&$obj){
    return $obj["settype"].$obj["setid"].(isset($obj["freq"])?$obj["freq"]:"").(isset($obj["geoid"])?"G".$obj["geoid"]:"").(isset($obj["latlon"])?"L".$obj["latlon"]:"");
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
function getCubeSeries(&$output, $cubeid, $geoid=0){

    //fetch cube and theme name (just in case)
    $sql = "select c.units, c.name as cubename, t.name as themename from cubes c join themes t on t.themeid=c.themeid where cubeid=$cubeid";
    $result = runQuery($sql,"GetCubeSeries dimensions");
    while($row = $result->fetch_assoc()){
        $output["name"] = $row["cubename"];
        $output["theme"] = $row["themename"];
        $output["units"] = $row["units"];
    }

    $output["dimensions"] = [];
    //fetch cube dimensions (just in case)
    $sql = "select json from cubedims where cubeid=$cubeid order by dimorder";
    $result = runQuery($sql,"GetCubeSeries dimensions");
    $output["dimensions"] = [];
    while($row = $result->fetch_assoc()){
        array_push($output["dimensions"], ["list"=>json_decode($row["json"], true)]);
    }
    //fetch cube series
    if(intval($geoid)>0){
        $output["series"] = [];
        $sql = "select name, data from series s inner join cubeseries cs on s.seriesid=cs.seriesid where cs.geoid = $geoid and cs.cubeid=$cubeid";
        $result = runQuery($sql,"GetCubeSeries data");
        while($row = $result->fetch_assoc()){
            array_push($output["series"], $row);
        }
    } else {
        $output["status"] = "invalid geoid $geoid";
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