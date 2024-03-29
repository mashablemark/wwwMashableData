<?php $workbenchVersion="0.1" ?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1" />
    <link rel="shortcut icon" href="/favicon.ico" />
    <meta http-equiv="X-UA-Compatible" content="IE=9">
    <title>Workbench - MashableData</title>

    <!--CSS files-->
    <link  rel="stylesheet" href="/global/css/smoothness/jquery-ui-1.11.css?v=<?=$workbenchVersion?>" />
    <link  rel="stylesheet" href="/global/css/datatables/datatable.css?v=<?=$workbenchVersion?>" />
    <!--link  rel="stylesheet" href="css/ColVis.css" /-->
    <link  rel="stylesheet" href="/global/css/colorPicker.css?v=<?=$workbenchVersion?>" />

    <link  rel="stylesheet" href="/global/js/handsontable/handsontable.0.14.1.full.min.css" />
    <link rel="stylesheet" media="screen" href="/global/js/contextMenu/jquery.contextMenu.1.6.6.css?v=<?=$workbenchVersion?>">
    <link rel="stylesheet" media="screen" href="/global/css/jquery-jvectormap-2.0.1.css">
    <link rel="stylesheet" href="/global/js/fancybox/jquery.fancybox-1.3.4.css" type="text/css">
    <link  rel="stylesheet" href="workbench.css?v=<?=$workbenchVersion?>" />
    <link rel="stylesheet" href="/global/js/loadmask/jquery.loadmask.css?v=<?=$workbenchVersion?>" type="text/css">
    <?php if(false&&strrpos ($_SERVER["REQUEST_URI"], 'workbenchdev')!==FALSE){ ?>
        <!--domestic JavaScript files-->
        <script type="text/javascript" src="/global/js/jquery/jquery-1.8.3.js"></script>
        <script type="text/javascript" src="/global/js/jqueryui/jquery-ui-1.9.2.custom.min.js"></script>
    <?php } else { ?>
        <!--Google API JavaScript files-->
        <script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js"></script>
        <script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jqueryui/1.11.4/jquery-ui.min.js"></script>
    <?php }  ?>
    <!-- testing IE compatibility-->
    <!--script type="text/javascript" src="//cdnjs.cloudflare.com/ajax/libs/jquery-ajaxtransport-xdomainrequest/1.0.1/jquery.xdomainrequest.min.js"></script--->

    <script type="text/javascript" src="/global/js/datatables/jquery.dataTables.1.9.4.js"></script><!-- latest version is 1.9.4-->
    <script type="text/javascript" src="/global/js/flot/jquery.flot.min.js"></script><!-- version 0.8.3-->
    <script type="text/javascript" src="/global/js/flot/excanvas.min.js"></script>
    <script type="text/javascript" src="/global/js/fancybox/jquery.fancybox-1.3.4.pack.js"></script>
    <script type="text/javascript" src="/global/js/loadmask/jquery.loadmask.min.js"></script>
    <script type="text/javascript" src="/global/js/highcharts/js/highcharts.3.0.10.min.js"></script>
    <script type="text/javascript" src="/global/js/signals/signals.min.js"></script>
    <script type="text/javascript" src="/global/js/hasher/hasher.min.js"></script>
    <?php if(strrpos ($_SERVER["REQUEST_URI"], 'workbenchdev')!==FALSE){ ?>
        <script type="text/javascript" src="/workbenchdev/js/globals.js?v=<?=$workbenchVersion?>"></script>
        <script type="text/javascript" src="/workbenchdev/js/common.js?v=<?=$workbenchVersion?>"></script>
        <script type="text/javascript" src="/workbenchdev/js/set.js?v=<?=$workbenchVersion?>"></script>
        <script type="text/javascript" src="/workbenchdev/js/plot.js?v=<?=$workbenchVersion?>"></script>
        <script type="text/javascript" src="/workbenchdev/js/graph.js?v=<?=$workbenchVersion?>"></script>
        <script type="text/javascript" src="/workbenchdev/js/maps.js?v=<?=$workbenchVersion?>"></script>
        <script type="text/javascript" src="/workbenchdev/js/grapher.js?v=<?=$workbenchVersion?>"></script>
        <script type="text/javascript" src="/workbenchdev/js/jstat.js?v=<?=$workbenchVersion?>"></script>
        <script type="text/javascript" src="/workbenchdev/js/shims.js?v=<?=$workbenchVersion?>"></script>
        <script type="text/javascript" src="/workbenchdev/js/workbench.js?v=<?=$workbenchVersion?>"></script>
        <script type="text/javascript" src="/workbenchdev/js/cat_browser.js?v=<?=$workbenchVersion?>"></script>
        <script type="text/javascript" src="/workbenchdev/js/account.js?v=<?=$workbenchVersion?>"></script>
        <script type="text/javascript" src="/workbenchdev/js/annotator.js?v=<?=$workbenchVersion?>"></script>
        <script type="text/javascript" src="/workbenchdev/js/provenance.js?v=<?=$workbenchVersion?>"></script>
        <script type="text/javascript" src="/workbenchdev/js/treemap.js?v=<?=$workbenchVersion?>"></script>
    <?php } else { ?>
        <script type="text/javascript" src="/workbench/js/workbench.min.js?v=<?=$workbenchVersion?>"></script>
    <?php }  ?>
    <script type="text/javascript" src="/global/js/require/require.2.1.1.js"></script>

    <!--immediate dynamic loading
    <script type="text/javascript" src="js/highcharts.js"></script>
    <script type="text/javascript" src="js/exporting.src.js"></script>
    <script type="text/javascript" src="js/jquery.colorPicker.js"></script>
    <script type="text/javascript" src="/global/js/colour/Colour.js"></script>
    //Group for user series edit
    <script type="text/javascript" src="js/jquery.handsontable.0.14.1.full.min.js"></script>
    >> no longer needed (=included in handsontable) <script  type="text/javascript" src="js/jquery.contextMenu.js"></script>
    <script  type="text/javascript" src="js/jquery-jvectormap-2.0.1.min.js"></script>
    -->

    <!--dynamic loading of maps by REQUIRES as needed-->
    <script type="text/javascript">
        var ipAddress = "<?= $_SERVER['REMOTE_ADDR'] ?>";
        var workbenchVersion="<?=$workbenchVersion?>";
    </script>
</head>
<!--[if IE]>  <body class="ie"> <![endif]-->
<!--[if !IE]><!--> <body>             <!--<![endif]-->

<div id="fb-root"></div>
<div id="wrapper" class="wrapper">
    <div id="title-bar" class="title-bar">
        <a href="http://www.mashabledata.com" target="_blank"><img height="56px" width="258px" style="margin:0 50px 0 10px;" src="/global/images/logo/md_logo.png"></a>
        <!--span style="font-size:20px;color:white;margin: 10px 13px 2px 13px;">Workbench</span-->
        <div id="pickers" class="ui-tabs ui-widget ui-widget-content ui-corner-all">
            <!--PICKER TABS-->
            <ul id="series-tabs" class="ui-tabs-nav ui-helper-reset ui-helper-clearfix ui-widget-header ui-corner-all">
                <li class="local-series ui-state-default ui-corner-top ui-tabs-selected ui-state-active"><a data="#local-series">My Data</a></li>
                <li class="cloud-series ui-state-default ui-corner-top"><a data="#cloud-series">Find Data</a></li>
                <li class="my-graphs ui-state-default ui-corner-top"><a data="#myGraphs">My Graphs</a></li>
                <li class="public-graphs ui-state-default ui-corner-top"><a data="#publicGraphs">Public Graphs</a></li>
            </ul>
        </div>
        <button style="position:absolute;left: 920px;top: 25px;display: none;" id="show-hide-pickers"><b>show graphs&nbsp;&nbsp;</b> </button>
        <!--account and help menu-->
        <span id="title-bar-buttons">
            <button id="menu-help">Help</button>
            <button id="menu-account">Sign in</button>
        </span>
    </div>
    <div id="picker-divs" class="show-hide"><!-- BEGIN PICKER PANEL AND DATATABLES -->
        <!--BEGIN "MY DATA" PANEL-->
        <div id="local-series" class="picker">
            <!--BEGIN "MY DATA" EDITOR SUBPANEL-->
            <div id="edit-user-series">
                <button class="series-edit-geoset">make a geographic set</button> <button class="series-edit-cancel right">cancel</button> <!--button class="series-edit-save-as right" onclick="saveSeriesEditor(true)">save as copy</button--> <button class="series-edit-save right">save</button> <button class="series-edit-preview right">preview</button>
                <br /><span class="set-header-label">frequency:</span><select id="set_freq"></select> <span id="set_freq_format"></span>
                <div id="set-edit-header">
                    <span class="set-header-label">set name:</span><input id="set_name" maxlength="500" /><br />
                    <span class="set-header-label">set units:</span><input id="set_units" maxlength="100" /><br />
                    <span class="set-header-label">set notes:</span><textarea id="set_notes" maxlength="1000"></textarea><br />
                </div>
                <div id="data-editor" class="hands-on-table dataTable" style="overflow:hidden;"></div>
            </div>
            <!--BEGIN "MY DATA" TABLE SUBPANEL-->
            <div id="local-series-header" class="md-DS_title">
                <span id="series-bar-controls" style="margin:5px, 2px, 0px, 5px; padding:0px"></span>
                    <span id="main-graph-buttons-top" class="right">
                        <button class="new-data">new series</button>
                    </span>
            </div>
            <div>
                <table id="series-table" class="md-table"></table>
            </div>
        </div>
        <!--BEGIN "FIND DATA" PANEL-->
        <div id="cloud-series" class="picker">
            <!--BEGIN "API BROWSER" SUBPANEL-->
            <div id="browse-api">
                <div  id="browse-api-header">
                    <span style="padding:5px;">Click below to expand sibling and child categories.  Categories containing series are shown as links.  Note that a series can be in more than one category.</span>
                    <button id="browse-close" class="right">close</button>
                </div>
                <div id="api-cats">
                    <ol id="cat-browser"><div></div></ol>
                </div>
            </div>
            <!--BEGIN DEFAULT "PUBLIC DATA SEARCH" SUBPANEL-->
            <div id="cloud-series-header" class="md-DS_title">
                <div id="cloud-series-search">
                    <input maxlength="100" style="width:300px;" id="series_search_text" class="series-search grey-italics" />
                    <div id="public-settype-radio">
                        <input type="radio" id="public-all-series" name="public-mapset-radio"  value="all" checked><label for="public-all-series" value="all">all</label>
                        <input type="radio" id="public-mapset-only" name="public-mapset-radio" value="M"><label for="public-mapset-only" title="Show only sets that can be mapped as countries, states, or regions">map sets <span class="ui-icon ui-icon-mapset"></span></label>
                        <input type="radio" id="public-pointset-only" name="public-mapset-radio" value="X"><label for="public-pointset-only" title="Show sets that can mapped as point markers, each having defined a longitude and latitude">marker sets <span class="ui-icon ui-icon-pointset"></span></label></div>
                    <select id="find-data-map"><option value="none">no map filter</option> </select>
                    <select id="series_search_freq">
                        <option selected="selected" value="all">all&nbsp;&nbsp;(all frequencies)</option>
                        <option value="D">D&nbsp;&nbsp;(daily)</option>
                        <option value="W">W&nbsp;&nbsp;(weekly)</option>
                        <option value="M">M&nbsp;&nbsp;(monthly)</option>
                        <option value="Q">Q&nbsp;&nbsp;(quarterly)</option>
                        <option value="S">S&nbsp;&nbsp;(semi-annual)</option>
                        <option value="A">A&nbsp;&nbsp;(annual)</option>
                    </select>
                    <select title="filter results by source" id="series_search_source">
                        <option value="ALL">all sources</option>
                        <option value="9">European Union Statistics (Eurostats)</option>
                        <option value="6">Joint Oil Data Initiative</option>
                        <option value="2">St. Louis Federal Reserve</option>
                        <option value="10">U.N. Commodities Trade Statistics</option>
                        <option value="5">U.N. Food and Agricultural Organization</option>
                        <option value="8">US Census Bureau</option>
                        <option value="4">US Energy Information Administration</option>
                        <option value="3">World Bank Indicators</option>
                        <option value="7">time conversions</option>
                    </select>
                    <div id="public-settype-radio" style="display:none;"><input type="radio" id="public-all-series" name="public-settype-radio"  value="all" checked><label for="public-all-series" value="all">all</label><input type="radio" id="public-mapset-only" name="public-settype-radio" value="MS"><label for="public-mapset-only">map sets <span class="ui-icon ui-icon-mapset" title="Show only series that are part of a map set."></span></label><input type="radio" id="public-pointset-only" name="public-settype-radio" value="XS"><label for="public-pointset-only">marker sets <span class="ui-icon ui-icon-pointset" title="Show only series that are part of a set series, each having defined a longitude and latitude."></span></label></div>
                    <button id="series-search-button">search</button>
                </div>
                <div id="cloud_series_bar_controls" style="display:inline;margin:5px, 2px, 0px, 5px; padding:0px;color:white;">
                    <span id="public-series-buttons-top" class="right">
                        <button id="cloud-series-browse">browse</button>
                        <button class="new-data">new series</button>
                    </span>
                </div>
                <div id="cloud_series_info" style="display:inline;font-size:8px;"></div>
            </div>
            <div id="cloudSeriesTableDiv" class="series-table">
                <table id="tblPublicSeries" class="md-table">
                </table>
            </div>
        </div>
        <!--BEGIN MY GRAPHS DATATABLE-->
        <div id="myGraphs" class="picker">
            <div id="myGraphsHeader" class="md-DS_title">
                <span id="graphs-bar-controls" style="margin:5px, 2px, 0px, 5px; padding:0px">
                </span>
            </div>
            <table id="my_graphs_table" class="md-table graphs-table scrollable series-table">
            </table>
        </div>
        <!--BEGIN COMMUNITY GRAPHS DATATABLE-->
        <div id="publicGraphs" class="picker">
            <div id="publicGraphsHeader" class="md-DS_title">
                <div id="public_graphs_search" style="display:inline; margin-left:5px; padding:7px; background-color: lightyellow;">
                    <input maxlength="200" id="graphs_search_text" class="long grey-italics"/>
                    <button id="graphs-search-button">search</button>
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
<div id="dialog" style="display:none;z-index:1200;"></div>
<!--quick view html used by fancy box-->
<a class="show-graph-link" href="#outer-show-graph-div"></a>
<div id="dwrap" style="display:none;width:100%;height:90%;">
    <div id="outer-show-graph-div" style="width:100%;height:100%;position:relative;background-color:white;">
        <div id="highcharts-div" style="width:92%;height:60%;position:static;"></div>
        <br />
        <span class="right">
            <select id="quick-view-change-freq" class="ui-widget ui-state-default" style="font-size: 10px; margin-bottom: 5px;margin-right: 100px; width: 133px;padding: 3px;"></select><br>
            <button id="quick-view-change-geo">change geography</button>
            <div class="widget" style="margin-right: 33px">
                <select id="quick-view-geo-select"></select>
            </div>
        </span>
        <div id="qv-info"></div>
        <br />
        <div id="quick-view-controls" class="no_print">
            <div id="quick-view-controls-add">
                <select id="quick-view-to-graphs"></select>
                <div id="quick-view-chart-or-map" style="display: inline-block">
                    <input type="radio" class="chart-or-map" name="chart-or-map" id="quick-view-chart" value="chart"><label for="quick-view-chart">chart</label>
                    <input type="radio" class="chart-or-map" name="chart-or-map" id="quick-view-chart-and-map" value="chart-and-map"><label for="quick-view-chart-and-map">chart &amp; map</label>
                    <input type="radio" class="chart-or-map" name="chart-or-map" id="quick-view-map" checked="checked" value="map"><label for="quick-view-map">map</label>
                </div>
                <select id="quick-view-maps"></select><span id="quick-view-no-map">does not map to <span id="quick-view-graph-map"></span></span>
                <select id="quick-view-select-viz" style="max-width: 300px;"></select>
                <button id="quick-view-add-to-graph">add to graph</button>
            </div>
            <button id="quick-view-close" class="right">close</button>
            <button id="edit-my-series" class="right">edit this data</button>
            <button id="quick-view-to-series" class="right">add to My Data</button>
            <button id="quick-view-delete-series" class="right">delete from My Data</button>
        </div>
    </div>
</div>
</body>
</html>