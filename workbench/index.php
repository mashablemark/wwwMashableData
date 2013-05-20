<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <link rel="shortcut icon" href="/favicon.ico" />
    <meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1" />
    <title>MashableData Workbench</title>

    <!--CSS files-->
    <link  rel="stylesheet" href="css/smoothness/jquery-ui-1.9.2.custom.css" />
    <link  rel="stylesheet" href="/global/css/datatables/datatable.css" />
    <!--link  rel="stylesheet" href="css/ColVis.css" /-->
    <link  rel="stylesheet" href="/global/css/colorPicker.css" />
    <link  rel="stylesheet" href="/global/js/handsontable/jquery.handsontable.0.7.5.css" />
    <link rel="stylesheet" media="screen" href="/global/css/jquery.contextMenu.css">
    <link rel="stylesheet" media="screen" href="/global/css/jquery-jvectormap-1.2.2.css">
    <link  rel="stylesheet" href="md_workbench.css" />
    <link rel="stylesheet" href="js/fancybox/jquery.fancybox-1.3.4.css" type="text/css">
    <link rel="stylesheet" href="/global/js/loadmask/jquery.loadmask.css" type="text/css">


    <!--JavaScript files-->
    <script type="text/javascript" src="/global/js/jquery/jquery-1.8.3.js"></script><!-- latest verions is 1.8.3-->
    <script type="text/javascript" src="/global/js/jqueryui/jquery-ui-1.9.2.custom.min.js"></script>
    <script type="text/javascript" src="/global/js/datatables/jquery.dataTables.1.8.2.min.js"></script><!-- latest version is 1.9.4-->
    <script type="text/javascript" src="/global/js/sparklines/jquery.sparkline.js"></script><!-- version 2.1-->
    <script type="text/javascript" src="js/fancybox/jquery.fancybox-1.3.4.pack.js"></script>
    <script type="text/javascript" src="/global/js/loadmask/jquery.loadmask.min.js"></script>
    <script type="text/javascript" src="/global/js/signals/signals.min.js"></script>
    <script type="text/javascript" src="/global/js/hasher/hasher.min.js"></script>
    <script type="text/javascript" src="workbench.js"></script>
    <script type="text/javascript" src="graph.js"></script>
    <script type="text/javascript" src="common.js"></script>
    <script type="text/javascript" src="shims.js"></script>
    <script type="text/javascript" src="account.js"></script>
    <script type="text/javascript" src="annotations.js"></script>
    <script type="text/javascript" src="provenance.js"></script>

    <script type="text/javascript" src="/global/js/require/require.2.1.1.js"></script>

    <!--immediate dynamic loading
    //Group for graph creation
    <script type="text/javascript" src="js/highcharts.js"></script>
    <script type="text/javascript" src="js/exporting.src.js"></script>
    <script type="text/javascript" src="js/jquery.colorPicker.js"></script>
    //Group for user series edit
    <script type="text/javascript" src="js/jquery.handsontable.js"></script>
    <script  type="text/javascript" src="js/jquery.contextMenu.js"></script>
    <script  type="text/javascript" src="js/jquery-jvectormap-1.1.1.min.js"></script>
    -->
    <!--dynamic loading of maps by REQUIRES as needed
    <script  type="text/javascript" src="js/maps/jquery_jvectormap_world_mill_en.js"></script>
    <script  type="text/javascript" src="js/maps/jquery_jvectormap_europe_mill_en.js"></script>
    <script  type="text/javascript" src="js/maps/jquery_jvectormap_us_aea_en.js"></script>
    -->

    <!--script type="text/javascript" src="templates.js"></script-->

</head>
<script type="text/javascript">
</script>
<?php
    if (apc_exists('app:mapsList') !== false)
    {
        $data = apc_get('app:mapsList');
    }
    else
    {
        include_once("/global/php/common_functions.php");
        $result = runQuery("select * from maps order by name", "application mapsList");
        $data = array();
        while($row = $result->fetch_assoc()){
            array_push($data, $row);
        }
        apc_store('app:mapsList', $data);
    }
print("var mapsList=".json_encode($data).";");
?>


<body onresize="resizeCanvas();">
<div id="fb-root"></div>
<div id="wrapper" class="wrapper">
    <div id="title-bar" class="title-bar">
        <a href="/" target="_blank"><img height="32px" width="132px" style="margin:0 10px 0 20px;" src="/global/images/logo/md_logo_sm.png"></a>
        <!--span style="font-size:20px;color:white;margin: 10px 13px 2px 13px;">Workbench</span-->
        <div id="pickers" class="ui-tabs ui-widget ui-widget-content ui-corner-all">
            <!--PICKER TABS-->
            <ul id="series-tabs" class="ui-tabs-nav ui-helper-reset ui-helper-clearfix ui-widget-header ui-corner-all" style="background:none;border:0; display:inline-block; position:relative; top:2px;">
                <li class="local-series ui-state-default ui-corner-top ui-tabs-selected ui-state-active"><a data="#local-series">My Series</a></li>
                <li class="cloud-series ui-state-default ui-corner-top"><a data="#cloud-series">Public Series</a></li>
                <li class="my-graphs ui-state-default ui-corner-top"><a data="#myGraphs">My Graphs</a></li>
                <li class="public-graphs ui-state-default ui-corner-top"><a data="#publicGraphs">Public Graphs</a></li>
            </ul>
        </div>
        <button style="position:absolute;left:650px;top:5px;display: none;" id="show-hide-pickers" onclick="showHideGraphEditor()"><b>show graphs&nbsp;&nbsp;</b> </button>
        <!--account and help menu--><fb:login>
            <button id="menu-help" class="prov-float-btn">Help</button>
            <button id="menu-account" class="prov-float-btn">Sign in</button>
    </div>
    <div id="picker-divs" class="show-hide"><!-- BEGIN PICKER DATATABLES -->
        <!--BEGIN LOCAL SERIES-->
        <div id="local-series" class="picker">
            <div id="edit-user-series">
                <div id="data-editor" class="hands-on-table dataTable" style="overflow:scroll;"></div>
                <button class="series-edit-geoset">make a geographic set</button> <button class="series-edit-cancel right">cancel</button> <!--button class="series-edit-save-as right" onclick="saveSeriesEditor(true)">save as copy</button--> <button class="series-edit-save right">save</button> <button class="series-edit-preview right">preview</button>
            </div>
            <div id="local-series-header" class="md-DS_title">
                <fieldset class="tight-fieldset"><legend>Filter</legend>
                        <span id="series-bar-controls" style="margin:5px, 2px, 0px, 5px; padding:0px">
                        </span>
                </fieldset>
                    <span id="main-graph-buttons-top">
                        <fieldset style="padding: 1px 5px;"><legend>Graph</legend>
                            <button disabled="disabled" class="series-checked" onclick="createUpdateGraphFromMySeries(buildGraphPanel)">create</button>
                            <button disabled="disabled" class="add-to-graph" onclick="addMySeriesToCurrentGraph()">add to current</button>
                        </fieldset>
                         <fieldset style="padding: 1px 5px;"><legend>Series</legend>
                             <button disabled="disabled" class="series-checked" onclick="clearChecksMySeries()">uncheck all</button>
                             <button class="" onclick="showSeriesEditor()">new</button>
                             <button disabled="disabled" class="series-checked" onclick="editCheckedSeries()">edit</button>
                             <button id="delete-my-series" disabled="disabled" class="series-checked" onclick="deleteCheckedSeries()">delete</button>
                         </fieldset>
                    </span>
            </div>
            <div>
                <table id="series-table" class="md-table"></table>
            </div>
        </div>
        <!--BEGIN COMMUNITY SERIES DATATABLE-->
        <div id="cloud-series" class="picker">
            <div id="cloud-series-header" class="md-DS_title">
                <div id="cloud-series-search" style="display:inline;margin:5px, 2px, 0px, 5px; padding:0px;">
                    <fieldset class="search-box">
                        <legend style="color: #444;font-size: 12px;">Search MashableData server for series</legend>
                        <input maxlength="100" style="width:300px;" id="series_search_text" class="series-search" onkeyup="seriesCloudSearchKey(event)" />
                        <select id="series_search_periodicity"  onchange="seriesCloudSearch()"><option selected="selected" value="all">all frequencies</option><option value="D">daily</option><option value="W">weekly</option><option value="M">monthly</option><option value="Q">quarterly</option><option value="SA">semi-annual</option><option value="A">annual</option></select>
                        <select title="filter results by source" width="50px" id="series_search_source" onchange="seriesCloudSearch()"><option value="ALL">all sources</option></select>
                        <div id="public-mapset-radio"><input type="radio" id="public-all-series" name="public-mapset-radio"  value="all" checked><label for="public-all-series" value="all">all</label><input type="radio" id="public-mapset-only" name="public-mapset-radio" value="mapsets"><label for="public-mapset-only">map sets <span class="ui-icon ui-icon-mapset" title="Show only series that are part of a map set."></span></label><input type="radio" id="public-pointset-only" name="public-mapset-radio" value="pointsets"><label for="public-pointset-only">point sets <span class="ui-icon ui-icon-pointset" title="Show only series that are part of a point set."></span></label></div>
                        <button id="seriesSearchBtn" onclick="seriesCloudSearch()">search</button>
                    </fieldset>
                </div>
                <div id="cloud_series_bar_controls" style="display:inline;margin:5px, 2px, 0px, 5px; padding:0px;color:white;">
                </div>
                <div id="cloud_series_info" style="display:inline;font-size:8px;"></div>
            </div>
            <div id="cloudSeriesTableDiv" class="series-table">
                <table id="tblPublicSeries" class="md-table">
                </table>
            </div>
            <div id="browse-api" class="scrollable" style="display:none; border: 1px solid black;"></div>
        </div>
        <!--BEGIN MY GRAPHS DATATABLE-->
        <div id="myGraphs" class="picker">
            <div id="myGraphsHeader" class="md-DS_title">
                <fieldset class="tight-fieldset"><legend>Search and Display</legend>
                        <span id="graphs-bar-controls" style="margin:5px, 2px, 0px, 5px; padding:0px">
                        </span>
                </fieldset>
                <!--div id="graphs_bar_controls" style="display:inline;margin:5px, 2px, 0px, 5px; padding:0px">
                </div-->
            </div>
            <table id="my_graphs_table" class="md-table graphs-table scrollable series-table">
            </table>
        </div>
        <!--BEGIN COMMUNITY GRAPHS DATATABLE-->
        <div id="publicGraphs" class="picker">
            <div id="publicGraphsHeader" class="md-DS_title">
                <div id="public_graphs_search" style="display:inline;margin:5px, 2px, 0px, 5px; padding:0px;">
                    <fieldset class="search-box">
                        <legend>Search MashableData server for published graphs</legend>
                        <input maxlength="200" id="graphs_search_text" class="long" onkeyup="graphsCloudSearch(event)" /> <button id="graphsSearchBtn" onclick="graphsCloudSearch(event)">search</button>
                    </fieldset>
                </div>
                <div id="public_graphs_bar_controls" style="display:inline;margin:5px, 2px, 0px, 5px; padding:0px;color:white;">
                </div>
            </div>
            <div id="publicGraphsTableDiv" class="series-table">
                <table id="tblPublicGraphs" class="md-table">
                </table>
            </div>
            <!-- LOWER GRAPH EDITOR -->
        </div>
    </div><!-- END PICKERS DATATABLES-->
    <div id="canvas">
        <ul id="graph-tabs">
        </ul>
    </div>
</div>
<!--POP UP DIVS-->
<!--modal dialog html used by jqueryUI-->
<div id="dialog" style="display:none;"></div>
<!--quick view html used by fancy box-->
<a class="show-graph-link" href="#outer-show-graph-div"></a>
<div id="dwrap" style="display:none;width:100%;height:90%;">
    <div id="outer-show-graph-div" style="width:100%;height:100%;position:relative;background-color:white;">
        <div id="highcharts-div" style="width:92%;height:60%;position:static;"></div>
        <br />
        <div id="qv-info"></div>
        <br />
        <div id="quick-view-controls" class="no_print">
            <fieldset class="tight-fieldset"><legend>graph</legend>
                <select id="quick-view-to-graphs"></select>
                <select class="quick-view-maps"></select>
                <button class="quick-view-maps" onclick="quickViewToMap(this)">map entire set</button>
                <button id="quick-view-to-graph" onclick="quickViewToChart(this)">chart series</button>
            </fieldset>
            <button id="quick-view-to-series" onclick="quickViewToSeries(this)">add to My Series</button>
            <button id="quick-view-close" class="right" onclick="quickViewClose()">Close</button>
        </div>
    </div>
</div>
<a class="show-link-options" href="#link-options-div"></a>
<div id="dwrap" style="display:none;width:100%;height:90%;">
    <div id="link-options-div" style="background-color:white;">
        link options
    </div>
</div>

<!--graph title editor div used by fancy box-->
<a class="showTitleEditor" href="#titleEditor"></a>
<div id="dwrap2" style="display:none;position:absolute;top:50px;left:0px;width:75%;height:35px;">
    <div id="titleEditor">
        <input type="text" width="300px" onkeyup="if(event.keyCode==13)graphTitle.changeOk()" name="title" /> <button onclick="graphTitle.changeOk()">OK</button> <button onclick="graphTitle.changeCancel()">cancel</button>
    </div>
</div>
</body>
</html>