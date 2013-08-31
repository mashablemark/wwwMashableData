<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1" />
    <link rel="shortcut icon" href="/favicon.ico" />
    <meta http-equiv="X-UA-Compatible" content="IE=9">
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
    <link rel="stylesheet" href="/global/js/slickgrid/slick.grid.css" type="text/css">

    <!--Google API JavaScript files-->
    <script src="//ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js"></script>
    <script src="//ajax.googleapis.com/ajax/libs/jqueryui/1.9.2/jquery-ui.min.js"></script>

    <!--domestic JavaScript files-->
    <!--script type="text/javascript" src="/global/js/jquery/jquery-1.8.3.js"></script-->
    <!--script type="text/javascript" src="/global/js/jqueryui/jquery-ui-1.9.2.custom.min.js"></script-->
    <script type="text/javascript" src="/global/js/datatables/jquery.dataTables.1.9.4.js"></script><!-- latest version is 1.9.4-->
    <script type="text/javascript" src="/global/js/sparklines/jquery.sparkline.js"></script><!-- version 2.1-->
    <script type="text/javascript" src="js/fancybox/jquery.fancybox-1.3.4.pack.js"></script>
    <script type="text/javascript" src="/global/js/loadmask/jquery.loadmask.min.js"></script>
    <script type="text/javascript" src="/global/js/highcharts/js/highcharts.3.0.2.min.js"></script>
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
    <script type="text/javascript" src="/global/js/slickgrid/jquery.event.drag-2.0.min.js"></script>
    <script type="text/javascript" src="/global/js/slickgrid/slick.core.js"></script>
    <script type="text/javascript" src="/global/js/slickgrid/slick.grid.js"></script>

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

    <script type="text/javascript">
        var mapsList={"Africa":{"map":"Africa","name":"Africa","geographycount":"58","bunny":null,"jvectormap":"africa_mill_en","legend":"BL"},"Alabama":{"map":"Alabama","name":"Alabama","geographycount":"67","bunny":"250","jvectormap":"usal_merc_en","legend":"BR"},"Alaska":{"map":"Alaska","name":"Alaska","geographycount":"27","bunny":"251","jvectormap":"usak_merc_en","legend":"TR"},"Arizona":{"map":"Arizona","name":"Arizona","geographycount":"15","bunny":"252","jvectormap":"usaz_merc_en","legend":"BR"},"Arkansas":{"map":"Arkansas","name":"Arkansas","geographycount":"74","bunny":"253","jvectormap":"usar_merc_en","legend":"BR"},"California":{"map":"California","name":"California","geographycount":"58","bunny":"254","jvectormap":"usca_merc_en","legend":"TR"},"Colorado":{"map":"Colorado","name":"Colorado","geographycount":"64","bunny":"255","jvectormap":"usco_merc_en","legend":"BR"},"Connecticut":{"map":"Connecticut","name":"Connecticut","geographycount":"8","bunny":"256","jvectormap":"usct_merc_en","legend":"BR"},"Delaware":{"map":"Delaware","name":"Delaware","geographycount":"3","bunny":"257","jvectormap":"usde_merc_en","legend":"TR"},"District of Columbia":{"map":"District of Columbia","name":"District of Columbia","geographycount":"2","bunny":"694","jvectormap":"usdc_merc_en","legend":"BR"},"European Union":{"map":"European Union","name":"European Union","geographycount":"27","bunny":"307","jvectormap":"europe_mill_en","legend":"BL"},"Florida":{"map":"Florida","name":"Florida","geographycount":"67","bunny":"258","jvectormap":"usfl_merc_en","legend":"BL"},"Georgia":{"map":"Georgia","name":"Georgia","geographycount":"159","bunny":"259","jvectormap":"usga_merc_en","legend":"TR"},"Hawaii":{"map":"Hawaii","name":"Hawaii","geographycount":"4","bunny":"260","jvectormap":"ushi_merc_en","legend":"BL"},"Idaho":{"map":"Idaho","name":"Idaho","geographycount":"44","bunny":"261","jvectormap":"usid_merc_en","legend":"TR"},"Illinois":{"map":"Illinois","name":"Illinois","geographycount":"102","bunny":"262","jvectormap":"usil_merc_en","legend":"BL"},"Indiana":{"map":"Indiana","name":"Indiana","geographycount":"92","bunny":"263","jvectormap":"usin_merc_en","legend":"BR"},"Iowa":{"map":"Iowa","name":"Iowa","geographycount":"99","bunny":"264","jvectormap":"usia_merc_en","legend":"BR"},"Kansas":{"map":"Kansas","name":"Kansas","geographycount":"105","bunny":"265","jvectormap":"usks_merc_en","legend":"BR"},"Kentucky":{"map":"Kentucky","name":"Kentucky","geographycount":"120","bunny":"266","jvectormap":"usky_merc_en","legend":"TL"},"Louisiana":{"map":"Louisiana","name":"Louisiana","geographycount":"64","bunny":"267","jvectormap":"usla_merc_en","legend":"TR"},"Maine":{"map":"Maine","name":"Maine","geographycount":"16","bunny":"268","jvectormap":"usme_merc_en","legend":"TR"},"Maryland":{"map":"Maryland","name":"Maryland","geographycount":"24","bunny":"269","jvectormap":"usmd_merc_en","legend":"BL"},"Massachusetts":{"map":"Massachusetts","name":"Massachusetts","geographycount":"14","bunny":"270","jvectormap":"usma_merc_en","legend":"BL"},"Michigan":{"map":"Michigan","name":"Michigan","geographycount":"83","bunny":"271","jvectormap":"usmi_merc_en","legend":"BL"},"Minnesota":{"map":"Minnesota","name":"Minnesota","geographycount":"87","bunny":"272","jvectormap":"usmn_merc_en","legend":"BR"},"Mississippi":{"map":"Mississippi","name":"Mississippi","geographycount":"82","bunny":"273","jvectormap":"usms_merc_en","legend":"BR"},"Missouri":{"map":"Missouri","name":"Missouri","geographycount":"115","bunny":"274","jvectormap":"usmo_merc_en","legend":"TR"},"Montana":{"map":"Montana","name":"Montana","geographycount":"56","bunny":"275","jvectormap":"usmt_merc_en","legend":"BR"},"Nebraska":{"map":"Nebraska","name":"Nebraska","geographycount":"93","bunny":"276","jvectormap":"usne_merc_en","legend":"BL"},"Nevada":{"map":"Nevada","name":"Nevada","geographycount":"17","bunny":"277","jvectormap":"usnv_merc_en","legend":"BR"},"New Hampshire":{"map":"New Hampshire","name":"New Hampshire","geographycount":"10","bunny":"278","jvectormap":"usnh_merc_en","legend":"TL"},"New Jersey":{"map":"New Jersey","name":"New Jersey","geographycount":"21","bunny":"279","jvectormap":"usnj_merc_en","legend":"BR"},"New Mexico":{"map":"New Mexico","name":"New Mexico","geographycount":"33","bunny":"280","jvectormap":"usnm_merc_en","legend":"BR"},"New York":{"map":"New York","name":"New York","geographycount":"62","bunny":"281","jvectormap":"usny_merc_en","legend":"TL"},"North Carolina":{"map":"North Carolina","name":"North Carolina","geographycount":"100","bunny":"282","jvectormap":"usnc_merc_en","legend":"BR"},"North Dakota":{"map":"North Dakota","name":"North Dakota","geographycount":"53","bunny":"283","jvectormap":"usnd_merc_en","legend":"BR"},"Ohio":{"map":"Ohio","name":"Ohio","geographycount":"88","bunny":"284","jvectormap":"usoh_merc_en","legend":"BR"},"Oklahoma":{"map":"Oklahoma","name":"Oklahoma","geographycount":"77","bunny":"285","jvectormap":"usok_merc_en","legend":"BR"},"Oregon":{"map":"Oregon","name":"Oregon","geographycount":"36","bunny":"286","jvectormap":"usor_merc_en","legend":"BR"},"Pennsylvania":{"map":"Pennsylvania","name":"Pennsylvania","geographycount":"67","bunny":"287","jvectormap":"uspa_merc_en","legend":"BR"},"Rhode Island":{"map":"Rhode Island","name":"Rhode Island","geographycount":"5","bunny":"288","jvectormap":"usri_merc_en","legend":"BR"},"South Carolina":{"map":"South Carolina","name":"South Carolina","geographycount":"46","bunny":"289","jvectormap":"ussc_merc_en","legend":"BR"},"South Dakota":{"map":"South Dakota","name":"South Dakota","geographycount":"66","bunny":"290","jvectormap":"ussd_merc_en","legend":"BR"},"Tennessee":{"map":"Tennessee","name":"Tennessee","geographycount":"95","bunny":"291","jvectormap":"ustn_merc_en","legend":"BR"},"Texas":{"map":"Texas","name":"Texas","geographycount":"254","bunny":"292","jvectormap":"ustx_merc_en","legend":"TL"},"US states":{"map":"US states","name":"US states","geographycount":"51","bunny":"235","jvectormap":"us_aea_en","legend":"BR"},"Utah":{"map":"Utah","name":"Utah","geographycount":"29","bunny":"293","jvectormap":"usut_merc_en","legend":"BR"},"Vermont":{"map":"Vermont","name":"Vermont","geographycount":"14","bunny":"294","jvectormap":"usvt_merc_en","legend":"BR"},"Virginia":{"map":"Virginia","name":"Virginia","geographycount":"136","bunny":"295","jvectormap":"usva_merc_en","legend":"TL"},"Washington":{"map":"Washington","name":"Washington","geographycount":"39","bunny":"296","jvectormap":"uswa_merc_en","legend":"BR"},"West Virginia":{"map":"West Virginia","name":"West Virginia","geographycount":"55","bunny":"297","jvectormap":"uswv_merc_en","legend":"BR"},"Wisconsin":{"map":"Wisconsin","name":"Wisconsin","geographycount":"72","bunny":"298","jvectormap":"uswi_merc_en","legend":"BL"},"world":{"map":"world","name":"world","geographycount":"172","bunny":"321","jvectormap":"world_mill_en","legend":"BL"},"Wyoming":{"map":"Wyoming","name":"Wyoming","geographycount":"23","bunny":"299","jvectormap":"uswy_merc_en","legend":"BR"}};    </script>
</head>
<!--[if IE]>  <body onresize="resizeCanvas();" class="ie"> <![endif]-->
<!--[if !IE]><!--> <body onresize="resizeCanvas();">             <!--<![endif]-->

<div id="fb-root"></div>
<div id="wrapper" class="wrapper">
    <div id="title-bar" class="title-bar">
        <a href="/" target="_blank"><img height="56px" width="258px" style="margin:0 50px 0 10px;" src="/global/images/logo/md_logo.png"></a>
        <!--span style="font-size:20px;color:white;margin: 10px 13px 2px 13px;">Workbench</span-->
        <div id="pickers" class="ui-tabs ui-widget ui-widget-content ui-corner-all">
            <!--PICKER TABS-->
            <ul id="series-tabs" class="ui-tabs-nav ui-helper-reset ui-helper-clearfix ui-widget-header ui-corner-all">
                <li class="local-series ui-state-default ui-corner-top ui-tabs-selected ui-state-active"><a data="#local-series">My Series</a></li>
                <li class="cloud-series ui-state-default ui-corner-top"><a data="#cloud-series">Public Series</a></li>
                <li class="my-graphs ui-state-default ui-corner-top"><a data="#myGraphs">My Graphs</a></li>
                <li class="public-graphs ui-state-default ui-corner-top"><a data="#publicGraphs">Public Graphs</a></li>
            </ul>
        </div>
        <button style="position:absolute;left: 920px;top: 25px;display: none;" id="show-hide-pickers" onclick="showHideGraphEditor();setPanelHash()"><b>show graphs&nbsp;&nbsp;</b> </button>
        <!--account and help menu-->
        <span id="title-bar-buttons">
            <button id="menu-help" class="prov-float-btn">Help</button>
            <button id="menu-account" class="prov-float-btn">Sign in</button>
        </span>
    </div>
    <div id="picker-divs" class="show-hide"><!-- BEGIN PICKER DATATABLES -->
        <!--BEGIN LOCAL SERIES-->
        <div id="local-series" class="picker">
            <div id="edit-user-series">
                <div id="data-editor" class="hands-on-table dataTable" style="overflow:scroll;"></div>
                <button class="series-edit-geoset">make a geographic set</button> <button class="series-edit-cancel right">cancel</button> <!--button class="series-edit-save-as right" onclick="saveSeriesEditor(true)">save as copy</button--> <button class="series-edit-save right">save</button> <button class="series-edit-preview right">preview</button>
            </div>
            <div id="local-series-header" class="md-DS_title">
                <span id="series-bar-controls" style="margin:5px, 2px, 0px, 5px; padding:0px"></span>
                    <span id="main-graph-buttons-top" class="right">
                        <button class="new-series">new series</button>
                    </span>
            </div>
            <div>
                <table id="series-table" class="md-table"></table>
            </div>
        </div>
        <!--BEGIN PUBLIC SERIES DATATABLE-->
        <div id="cloud-series" class="picker">
            <div id="cloud-series-header" class="md-DS_title">
                <div id="cloud-series-search">
                    <input maxlength="100" style="width:300px;" id="series_search_text" class="series-search grey-italics" />
                    <select id="series_search_periodicity"  onchange="seriesCloudSearch()"><option selected="selected" value="all">all frequencies</option><option value="D">daily</option><option value="W">weekly</option><option value="M">monthly</option><option value="Q">quarterly</option><option value="SA">semi-annual</option><option value="A">annual</option></select>
                    <select title="filter results by source" width="50px" id="series_search_source" onchange="seriesCloudSearch()"><option value="ALL">all sources</option><option value="1">petroleum and NG data from EIA</option><option value="6">Joint Oil Data Initiative</option><option value="2">St. Louis Federal Reserve</option><option value="5">U.N. Food and Agricultural Organization</option><option value="4">US Energy Information Administration</option><option value="3">World Bank Indicators</option><option value="7">time conversions</option></select>
                    <div id="public-mapset-radio"><input type="radio" id="public-all-series" name="public-mapset-radio"  value="all" checked><label for="public-all-series" value="all">all</label><input type="radio" id="public-mapset-only" name="public-mapset-radio" value="mapsets"><label for="public-mapset-only">map sets <span class="ui-icon ui-icon-mapset" title="Show only series that are part of a map set."></span></label><input type="radio" id="public-pointset-only" name="public-mapset-radio" value="pointsets"><label for="public-pointset-only">marker sets <span class="ui-icon ui-icon-pointset" title="Show only series that are part of a set series, each having defined a longitude and latitude."></span></label></div>
                    <button id="series-search-button" onclick="seriesCloudSearch()" style="background-color: orange;background: orange;">search</button>
                    <!--fieldset class="search-box">
                        <legend style="color: #444;font-size: 12px;">Search MashableData server for series</legend>
                    </fieldset-->
                </div>
                <div id="cloud_series_bar_controls" style="display:inline;margin:5px, 2px, 0px, 5px; padding:0px;color:white;">
                    <span id="public-series-buttons-top" class="right">
                        <button id="cloud-series-browse">browse</button>
                        <button class="new-series">new series</button>
                    </span>
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
                <span id="graphs-bar-controls" style="margin:5px, 2px, 0px, 5px; padding:0px">
                </span>
            </div>
            <table id="my_graphs_table" class="md-table graphs-table scrollable series-table">
            </table>
        </div>
        <!--BEGIN COMMUNITY GRAPHS DATATABLE-->
        <div id="publicGraphs" class="picker">
            <div id="publicGraphsHeader" class="md-DS_title">
                <div id="public_graphs_search" style="display:inline;margin:5px, 2px, 0px, 5px; padding:0px;">
                    <input maxlength="200" id="graphs_search_text" class="long grey-italics"/>
                    <button id="graphs-search-button" style="background-color: orange;background: orange;" onclick="graphsCloudSearch(event)">search</button>
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
                <button class="quick-view-maps" onclick="quickViewToMap(this)">map set</button>
                <button id="quick-view-to-graph" onclick="quickViewToChart(this)">chart series</button>
            </fieldset>
            <button id="edit-my-series">edit</button>
            <button id="quick-view-to-series" onclick="quickViewToSeries(this)">add to My Series</button>
            <button id="quick-view-delete-series" onclick="deleteMySeries()">delete from My Series</button>
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