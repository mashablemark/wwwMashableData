/**
 * Created with JetBrains PhpStorm.
 * User: mark__000
 * Date: 2/18/13
 * Time: 9:04 PM
 * To change this template use File | Settings | File Templates.
 */

//shortcuts:
var MD = MashableData, globals = MD.globals, grapher = MD.grapher;
var themeCubes = globals.themeCubes,
    iconsHMTL = globals.iconsHMTL,
    panelGraphs = globals.panelGraphs,
    oMySeries = globals.MySeries,
    oMyGraphs = globals.MyGraphs,
    hcColors = globals.hcColors,
    colorsPlotBands = globals.colorsPlotBands,
    graphScriptFiles = globals.graphScriptFiles;
var createMyGraph = grapher.createMyGraph,
    formatDateByPeriod = grapher.formatDateByPeriod,
    visiblePanelId = grapher.visiblePanelId,
    compSymbol = grapher.compSymbol;

//WORKBENCH TEMPLATES
var templates = {
    plot:  //functions needed: plot.color, component.opUI, plot.plotUnits, plot.plotPeriodicity, seriesname  EASIER???
        '<li class="plot ui-state-highlight" data="{{order}}">'
            +'<a class="edit-plot link" style="float:right;">edit <span class="ui-icon ui-icon-arrowthickstop-1-s" style="display: inline-block;"> edit</span></a>'
            +'<div class="line-sample" style="padding:0;margin:0 10px 10px 0;display:inline-block;border-width:0;background-color:{{color}};height:{{#options.lineWidth}}{{.}}{{/options.lineWidth}}{{^options.lineWidth}}2{{/options.lineWidth}}px;width:38px;">'
            +'<img src="images/{{options.lineStyle}}.png" height="{{#options.lineWidth}}{{.}}{{/options.lineWidth}}{{^options.lineWidth}}2{{/options.lineWidth}}px" width="{{imageWidth}}px"></div>'
            +'<div class="plot-info" style="display:inline-block;"><span class="plot-title">{{name}}</span> in {{plotUnits}} {{plotPeriodicity}}</div>'
            +'<ul class="series" style="list-style-type: none;" data="{{order}}">'
            +'{{#component}}<li class="serie ui-state-default" data="{{handle}}" plot="{{order}}"><span class="plot-op ui-icon {{opUI}}">operation</span> '
            + '{{seriesname}}<button class="edit-comp">edit</button></li>{{/component}}'
};
var dialogues = {
    noMySeries: 'Your My Series folder is empty.  Please search for Public Series, which can be graphed and added to your My Series folder for future quick reference.<br><br>You can also use the <button id="new-series" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only ui-state-hover" role="button" aria-disabled="false"><span class="ui-button-text">new series</span></button> feature to enter or upload your own data.',
    noSeriesSelected: 'Click on one or more series below to select them before previewing.<br><br>Alternatively, you can double-click on a series to quickly preview it.',
    editLimit: "Only one series or set can be edited at a time.",
    noGraphSelected: 'Click on a row in the table below to select a graph first.<br><br>As a shortcut, you can double-click on a graph to select and open it.',
    noMyGraphs: 'You have no My Graphs.  Graphs are built by searching for public series or upload your own data and building a graph. Saving graphs you build adds to them to your My Graphs folder.<br><br>You can also view a public graph and make a personal copy.<br><br>See the help (upper right after you close this dialogue) to learn more.',
    noPublicGraphs: 'First search for public graphs.  Note that a search with no keywords will return the most recent published graphs.',
    deleteMySeries: 'This action will remove the series from your My Series favorites. Public series will still be available through the Public Series finder.  Any uploads or edits will be lost.  Please confirm to delete.',
    signInRequired: 'You must be signed in to do this edit and create your own series.  Please use the sign in button to use your Facebook account.'
};
//WORKBENCH GLOBAL VARIABLES
var totalServerTime = 0;
var colWidths = {
    quickView: 50,
    views: 55,
    checkbox: 25,
    save: 25,
    shortDate: 74,
    mmmyyyy: 62,
    longDate: 125,
    deleteIcon: 35,
    map: 125,
    periodicity: 25,
    linkIcon: 30,
    src: 150,
    drillIcon: 35,
    count: 60,
    scrollbarWidth: 35,
    padding: 11
};
var layoutDimensions = {
    heights: {
//        graphTabsMinGap: 30,
        graphTabsGap: null,
        tableControls: 42,
        innerDataTable: null,
        scrollHeads: null,
        windowMinimum: 580
    },
    widths: {
        windowMinimum: 750,
        mySeriesTable: {columns:{}},
        publicSeriesTable: {columns: {}},
        myGraphsTable: {columns: {}},
        publicGraphTable: {columns: {}}

    }
};

var MY_SERIES_DATE = 7;  //important column indexes used for ordering
var nonWhitePattern = /\S/;  //handy pattern to check for non-whitespace
//Datatable variables set after onReady calls to... , setupMySeriesTable, setupMySeriesTable, and setupMySeriesTable,
var dtMySeries; //...setupMySeriesTable
var dtPublicSeries;  //...setupPublicSeriesTable
var dtMyGraphs;    //...setupMyGraphsTable
var dtPublicGraphs;   //...setupPublicGraphsTable
var searchCatId = 0;  //set on API browser selection in hash, cleared on public series search text change
var browsedCats = {}; //saves info of categories browsed to assist that function, cache db queries and provide name lookup cabilibilti for the category search function
var lastSeriesSearch="", lastGraphSearch=""; //kill column sorting on new searches.  Sort is by name length asc to show most concise (best fit) first

//variables used to keep track of datatables detail rows opened and closed with dt.fnopen() dt.fnclose() calls
var $quickViewRows = null; //used to remember jQuery set of rows being previewed in case user chooses to delete them

var editingPanelId = null;  //TODO:  phase out as global var.  (was used for editing a graph's series list via the MySeries panel.  Replaced by graph's series provenance panel and by add to graph from quickViews.
var mySeriesLoaded = false;

var $graphTabs;  //jQuery UI tabs object allows adding, remove, and reordering of visualized graphs
var tab_counter = 1; //incremented with each new $graphTabs and used to create unqiueID.  Not a count, as tab can be deleted!
var localSeriesIndex = 0;  //used to give localSeries from chart plugin unique handles when user is not logged in

var oQuickViewSeries; //global storage of last series quick-viewed.  Used by "Add to my Series" and "add to Graph" button functions.
var quickChart;
var lastTabAnchorClicked;  //when all graphs are deleted, this gets shown
var mapsArray = []; //sorted array of available maps created from mapsList object
var parsingHash = false;

window.fbAsyncInit = function() { //called by facebook auth library after it loads (loaded asynchronously from doc.ready)
    FB.init({
        appId      : '209270205811334', // App ID
        channelURL : '//www.mashabledata.com/fb_channel.php', // Channel File
        status     : true, // check login status
        cookie     : true, // enable cookies to allow the server to access the session
        oauth      : true, // enable OAuth 2.0
        xfbml      : true  // parse XFBML
    });

    FB.getLoginStatus(function(response) {
        account.signInFB(response);
        FB.Event.subscribe('auth.login', function(response) {
            account.signInFB(response);
        });
    });
};

// Load the Facebook SDK Asynchronously
function initFacebook(){
    var js, id = 'facebook-jssdk'; if (document.getElementById(id)) {return;}
    js = document.createElement('script'); js.id = id; js.async = true;
    js.src = "//connect.facebook.net/en_US/all.js";
    document.getElementsByTagName('head')[0].appendChild(js);
}

//INITIALIZATION ROUTINES
$(document).ready(function(){
    try{
        var x = window.localStorage.getItem('dummy');
    } catch(e){
        $('#dialog-top').html("MashableData Workbench requires a HTML 5 compliant browser.  The latest version of Internet Explorer, Chrome, Safari or Firefox are recommended.  Internet Explorer 8 users may experience slow rendering.<br><br>");
        $dialog = $('#dialog').dialog({
            modal: true,
            title: "Incompatible browser",
            width: 500});
        $('.ui-dialog-titlebar-close').remove();
        return false;  //no further executes
    }
    $(document).mouse({distance: 10});  //prevent jQuery from turning accidental mouse movement during a click into a dray event
    //load all the necessary files that were not loaded at startup for fast initial load speed (not charts and maps loaded from graph.js)
    requirejs.config({waitSeconds: 15});
    require(["/global/js/handsontable/jquery.handsontable.0.7.5.src.js","/global/js/contextMenu/jquery.contextMenu.1.5.14.src.js"]);

    addJQueryStringify();   // add extension after jQuery guaranteed to be loaded

    //setup the quickview controls
    $('#edit-my-series').button({icons: {secondary: "ui-icon-pencil"}}).click(function(){
        editSeries(oQuickViewSeries); //else dialogShow('warning',dialogues.editLimit);
    });
    $('#quick-view-to-series').button({icons: {secondary: "ui-icon-person"}}).click(function(){quickViewToSeries(this)});
    $('#quick-view-delete-series').button({icons: {secondary: "ui-icon-trash"}}).addClass('ui-state-error').click(function(){deleteMySeries(this)});
    $('#quick-view-chart-or-map').buttonset();
    $('#quick-view-map').button({icons: {secondary: "ui-icon-flag"}});
    $('#quick-view-chart').button({icons: {secondary: "ui-icon-image"}});

    $('#quick-view-add-to-graph').button().addClass('ui-state-active')
        .click(function(){
            if($('#quick-view-map:visible').length==1 &&  $('#quick-view-map:checked').length==1){
                quickViewToMap(this);
            } else {
                quickViewToChart(this);
            }
        });
    $('#quick-view-close').button({icons: {secondary: "ui-icon-close"}}).click(function(){quickViewClose()});

    $(".show-graph-link").fancybox({  //TODO: replace index html with dynamic FancyBox invocations per account.js
        'width'             :  '100%',
        'height'            : '100%',
        'autoScale'         : true,
        'showCloseButton'   : false,
        'scrolling'         : 'no',
        'transitionIn'		: 'none',
        'transitionOut'		: 'none'
    });

    jQuery.fancybox.center = function() {};  //KILLS fancybox.center() !!!
    $("#show-hide-pickers").button({icons: {secondary: "browse-rollup"}});
    $("#menu-account").button({icons: {secondary: "ui-icon-triangle-1-s"}})
        .click(function(){
            account.showSignInOut();
        });
    $("#menu-help").button({icons: {secondary: "ui-icon-help"}})
        .click(function(){
            $helpMenu  = account.showPanel('<div style="width:400px;height:300px;">'
                + '<ul>'
                + '<li><a target="help" title="Features" href="http://www.mashabledata.com/features/">Features and tour</a></li>'
                + '<li><a target="help" title="Searching and browsing for data" href="http://www.mashabledata.com/searching-and-browsing-for-data/">Searching and browsing for data</a></li>'
                + '<li><a target="help" title="Using series math to answer complex questions" href="http://www.mashabledata.com/using-series-math-to-answer-complex-questions/">Using series math to answer complex questions</a> (corn v. wheat)</li>'
                + '<li><a target="help" title="My Series &amp; Graphs" href="http://www.mashabledata.com/my-series-graphs/">My Series &amp; Graphs</a></li>'
                + '<li><a target="help" title="What are map sets and point sets?" href="http://www.mashabledata.com/what-are-map-sets-and-point-sets/">What are map sets and point sets?</a></li>'
                + '<li><a target="help" title="Creating maps" href="http://www.mashabledata.com/creating-maps/">Creating maps</a>'
                + '<ul>'
                + '<li><a target="help" title="Maps: Comparing against a regional average" href="http://www.mashabledata.com/creating-maps/maps-comparing-against-a-regional-average/">Comparing against a regional average</a> (Unemployment by state)</li>'
                + '<li><a target="help" title="Changing base maps" href="http://www.mashabledata.com/creating-maps/changing-base-maps/">Changing base maps</a></li>'
                + '<li><a target="help" title="Map colors (continuous, discrete and logarithmic)" href="http://www.mashabledata.com/workbench-help/creating-maps/map-colors-continuous-discrete-and-logarithmic/">Map colors (continuous, discrete and logarithmic)</a></li>'
                + '<li><a target="help" title="Bubble maps and user defined regions" href="http://www.mashabledata.com/workbench-help/creating-maps/bubble-maps-and-user-defined-regions/">Bubble maps and user defined regions</a></li>'
                + '</ul>'
                + '</li>'
                + '<li><a target="help" title="User series and the Highcharts plugin" href="http://www.mashabledata.com/workbench-help/user-series-and-the-highcharts-plugin/">User series and the Highcharts plugin</a></li>'
                + '<li><a target="help" title="Accounts: free, individual and corporate" href="http://www.mashabledata.com/workbench-help/accounts-free-individual-and-corporate/">Accounts: free, individual and corporate</a></li>'
                + '<li><a target="help" title="Publishing graphs and fair use" href="http://www.mashabledata.com/workbench-help/publishing-graphs-and-fair-use/">Publishing graphs and fair use</a></li>'
                + '</ul>'
                + '</div>', $('#menu-help'))
        });
    lastTabAnchorClicked = $("#series-tabs li a").click(function (){pickerPanel(this)}).filter("[data='#local-series']").get(0);
    layoutDimensions.heights.scrollHeads = $("div#local-series div.dataTables_scrollHead").height();
    resizeCanvas();
    setupMySeriesTable();
    loadMySeriesByKey();  //load everything in localStorage & updates userseries on server if logged
    setupMyGraphsTable(); //loaded on sync account.  No local storage for graphs.

    $('#series-table_filter input, #my_graphs_table_filter input').change(function(){
        setPanelHash();
    });

    // tabs init with a custom tab template and an "add" callback filling in the content
    $graphTabs = $('#canvas').tabs({
        tabTemplate: '<li class="graph-tab"><a href="#{href}">#{label}</a> <span class="ui-icon ui-icon-close">Remove Tab</span></li>',
        add: function(event, ui) {
            var tab_content = 'Loading graph.  Please wait.';
            $('#canvas li.graph-tab span.ui-icon-close').off().click(removeTab);
            return($(ui.panel).append('<p>'+tab_content + '</p>'));
        },
        activate: function(event, ui){
            setPanelHash();
        }
    });

    //TODO: remove this localhost workaround
    if(document.URL.indexOf('localhost')>=0){
        account.info.userId = 2;
        account.info.accessToken = 'paste token here';
        syncMyAccount();
    } else {
        initFacebook();  //intialized the FB JS SDK.  (Does not make user login, but will automatically authenticate a FB user who is (1) logged into FB and (2) has authorized FB to grant MashableData basic permissions
    }

    $(window)
        .bind("resize load", resizeCanvas())
        .bind("focus", function(event){
            if(mySeriesLoaded){
                if(loadMySeriesByKey()>0){
                    dtMySeries.fnFilter('');
                    dtMySeries.fnSort([[MY_SERIES_DATE, 'asc']]);
                }
            }
            event.bubbles = true;
            return true;
        });

    setupPublicSeriesTable();
    setupPublicGraphsTable();

    $('#tblPublicSeries_processing, #tblPublicGraphs_processing').html('searching the MashableData servers...');
    $("div.dataTables_scrollBody").height(layoutDimensions.heights.innerDataTable); //resizeCanvas already called, but need this after datatable calls

    $('#series-search-button, #graphs-search-button').addClass('ui-state-active').button({icons: {secondary: 'ui-icon-search'}});
    unmask();
    $('ul#series-tabs').click(function(){
        showGraphEditor()
    });

    hasher.changed.add(parseHash); //add hash change listener
    hasher.initialized.add(parseHash); //add initialized listener (to grab initial value in case it is already set)
    hasher.init(); //initialize hasher (start listening for history changes)
    window.onbeforeunload = function() {
        return "Your work will be lost.";
    };

    for(var map in mapsList) mapsArray.push(map);
    mapsArray.sort();

    $('body').resize(resizeCanvas);
    $('#series_search_periodicity, #series_search_source, #series-search-button').click(seriesCloudSearch);
    $('#show-hide-pickers').click(function(){
        showHideGraphEditor();
        setPanelHash();
    });

    require(graphScriptFiles, function(){
        $.fn.colorPicker.defaults.colors.splice(-1,0,hcColors, colorsPlotBands);
        Highcharts.setOptions({
            tooltip: {
                formatter: function(){  //shorten the data accord to period; add commas to number; show units
                    var tooltip = formatDateByPeriod(this.point.x, this.series.options.period) + '<br>'
                        + this.series.name.trim() + ':<br>'
                        + Highcharts.numberFormat(this.y,(parseInt(this.y)==this.y?0:3),'.',',') + ' ' + this.series.yAxis.options.title.text;
                    return tooltip;
                }
            }
        });
    });
    (function () {
        if(window.location.href.indexOf('workbenchdev')<0 && window.location.href.indexOf('nolog')<0 && !window.localStorage.getItem('nolog')){
            var temp = jQuery.event.dispatch;
            jQuery.event.dispatch = function () {
                try {
                    temp.apply(this, arguments);
                } catch (err) {
                    unmask();
                    var browser = window.nagivator?navigator.appName+' - '+ navigator.appCodeName+' - '+ navigator.appVersion:'undefined';
                    $.ajax({type: 'POST',
                        url: "api.php",
                        data: {
                            command: 'LogError',
                            browser: browser,
                            url: window.location.href,
                            message: err.message,
                            stack: err.stack,
                            uid: account.info.userId,
                            lang: navigator.language,
                            platform: navigator.platform,
                            version: workbenchVersion
                        },
                        dataType: 'json'
                    });
                    dialogShow('error','A error has occurred.  MashableData servers have logged the error and our technician have been alerted.');
                }
            }
        }
    }());
});

function parseHash(newHash, oldHash){
    parsingHash = true;
    var $search, oH={}, aryPair, aryH = newHash.split('&');
    for(var i=0;i<aryH.length;i++){
        aryPair = aryH[i].split('=');
        oH[aryPair[0]] = aryPair[1];
    }
    if(oH.t){
        switch(oH.t.toLowerCase()){
            case 'ms': //my series
                $('#series-tabs').find('li.local-series a').click();
                $search = $('#series-table_filter').find('input');
                if(oH.s && decodeURI(oH.s)!=$search.val()){
                    $search.click().val(decodeURI(oH.s)).keyup();  //the click event will remove the grey-ghost class and click and focus events on first call
                }
                if($graphTabs.find("li.graph-tab").length>0) $("#show-hide-pickers").show();
                break;
            case 'cs': //cloud series
                $('#series-tabs').find('li.cloud-series a').click();
                $search = $('#series_search_text');
                searchCatId == oH.cat||0;
                $('#series_search_periodicity').val(oH.f||'all'); //search executes on periodicity change
                $('#series_search_source').val(oH.api||'all'); //search executes on API change
                $('#public-mapset-radio').find('input[value='+(oH.sets||'all')+']').click(); //search executes on sets change
                if(searchCatId!=0){
                    $search.val("category: " + browsedCats[searchCatId].name);
                    seriesCloudSearch();
                } else {
                    if(oH.s && decodeURI(oH.s)!=$search.val()){
                        $search.click().val(decodeURI(oH.s)); //the click event will remove the grey-ghost class and click and focus events on first call
                        $('#series-search-button').click();  //to exec search
                    }
                }

                if($graphTabs.find("li.graph-tab").length>0) $("#show-hide-pickers").show();
                break;
            case 'mg': //my graphs
                $('#series-tabs').find('li.my-graphs a').click();
                $search = $('#my_graphs_table_filter').find('input');
                if(oH.s && decodeURI(oH.s)!=$search.val()){
                    $search.click().val(decodeURI(oH.s)).keyup();  //the click event will remove the grey-ghost class and click and focus events on first call
                }
                if($graphTabs.find("li.graph-tab").length>0) $("#show-hide-pickers").show();
                break;
            case 'cg': //cloud graphs
                $('#series-tabs').find('li.public-graphs a').click();
                $search = $('#public_graphs_search').find('input');
                if(oH.s && decodeURI(oH.s)!=$search.val()){
                    $search.click().val(decodeURI(oH.s));  //the click event will remove the grey-ghost class and click and focus events on first call
                    seriesCloudSearch(true);
                }
                if($graphTabs.find("li.graph-tab").length>0) $("#show-hide-pickers").show();
                break;
            default: //graphTab
                var $graphTab = $('#graph-tabs').find('a[href=#graphTab'+oH.t.substr(1)+']');
                if($graphTab.length==1) {
                    $graphTab.click();
                } else {
                    if(oH.graphcode){
                        for(var g in panelGraphs){
                            if(panelGraphs[g].ghash==oH.graphcode){
                                var $tab = $('#graph-tabs a[href=\'#'+g+'\']');
                                if($tab.length==1) {
                                    var found = true;
                                    $tab.click();
                                    break;
                                }
                            }
                        }
                        if(!found){
                            viewGraph(oH.graphcode);
                        }
                    }
                }
                $("#show-hide-pickers").hide();
        }
    }
    parsingHash = false;
}
function setHashSilently(hash){
    if(!parsingHash){
        hasher.changed.active = false; //disable changed signal
        hasher.setHash(hash); //set hash without dispatching changed signal
        hasher.changed.active = true; //re-enable signal
    }
}

function resizeCanvas(){
    var winHeight = Math.max($(window).innerHeight()-10, layoutDimensions.heights.windowMinimum);
    var winWidth = Math.max($(window).innerWidth()-10, layoutDimensions.widths.windowMinimum);
    $("div#wrapper").height(winHeight).width(winWidth);

    layoutDimensions.heights.menuBar = $("#title-bar").outerHeight(true);
    layoutDimensions.heights.canvas = winHeight - layoutDimensions.heights.menuBar - 2;
    layoutDimensions.heights.graphTabs = $("#graph-tabs").outerHeight(); // || layoutDimensions.heights.graphTabsMinGap; //if 0, use graphTabsMinGap

    $('div#canvas').height(layoutDimensions.heights.canvas);
    $('div.graph-panel').height(layoutDimensions.heights.canvas - layoutDimensions.heights.graphTabs).width(winWidth).css('margin','0').css('padding','0');

    layoutDimensions.heights.pickers = layoutDimensions.heights.canvas; //paddings
    $('div.picker').height(layoutDimensions.heights.pickers);
    layoutDimensions.heights.innerDataTable = layoutDimensions.heights.pickers  - layoutDimensions.heights.tableControls -  layoutDimensions.heights.scrollHeads -40;
    $("div.dataTables_scrollBody").height(layoutDimensions.heights.innerDataTable);

    //datatable
    layoutDimensions.widths.canvas = $("#canvas").innerWidth();
    //mySeries
    layoutDimensions.widths.mySeriesTable.table = layoutDimensions.widths.canvas-8*colWidths.padding-colWidths.scrollbarWidth;
    var remainingInnerWidths =  layoutDimensions.widths.mySeriesTable.table - (colWidths.periodicity + 2*colWidths.shortDate  + colWidths.src + colWidths.shortDate);
    layoutDimensions.widths.mySeriesTable.columns.units = parseInt(remainingInnerWidths * 0.20);
    layoutDimensions.widths.mySeriesTable.columns.series = parseInt(remainingInnerWidths * 0.55);
    layoutDimensions.widths.mySeriesTable.columns.category = parseInt(remainingInnerWidths * 0.25);
    $('#series-table_wrapper').find('thead').find('th.title').width(layoutDimensions.widths.mySeriesTable.columns.series+'px')
        .end().find('th.units').width(layoutDimensions.widths.mySeriesTable.columns.units+'px')
        .end().find('th.cat').width(layoutDimensions.widths.mySeriesTable.columns.category+'px');
    //publicSeries
    layoutDimensions.widths.publicSeriesTable.table = layoutDimensions.widths.canvas-7*colWidths.padding-colWidths.scrollbarWidth;
    remainingInnerWidths =  layoutDimensions.widths.publicSeriesTable.table - (colWidths.periodicity + colWidths.src + 2*colWidths.mmmyyyy);
    layoutDimensions.widths.publicSeriesTable.columns.series = remainingInnerWidths * 0.4;
    layoutDimensions.widths.publicSeriesTable.columns.units = remainingInnerWidths * 0.3;
    layoutDimensions.widths.publicSeriesTable.columns.category = remainingInnerWidths * 0.3;
    $('#tblPublicSeries_wrapper').find('thead').find('th.title').width(layoutDimensions.widths.publicSeriesTable.columns.series+'px')
        .end().find('th.units').width(layoutDimensions.widths.publicSeriesTable.columns.units+'px')
        .end().find('th.cat').width(layoutDimensions.widths.publicSeriesTable.columns.category+'px');
    //myGraphs
    layoutDimensions.widths.myGraphsTable.table = layoutDimensions.widths.canvas - 6*colWidths.padding - colWidths.scrollbarWidth;
    remainingInnerWidths =  layoutDimensions.widths.myGraphsTable.table - (colWidths.quickView + colWidths.shortDate + colWidths.map);
    layoutDimensions.widths.myGraphsTable.columns.title = remainingInnerWidths * 0.25;
    layoutDimensions.widths.myGraphsTable.columns.analysis = remainingInnerWidths * 0.5;
    layoutDimensions.widths.myGraphsTable.columns.series = remainingInnerWidths * 0.25;
    $('#my_graphs_table_wrapper').find('thead').find('th.title').width(layoutDimensions.widths.myGraphsTable.columns.title+'px')
        .end().find('th.analysis').width(layoutDimensions.widths.myGraphsTable.columns.analysis+'px')
        .end().find('th.series').width(layoutDimensions.widths.myGraphsTable.columns.series+'px');
    //publicGraphs
    layoutDimensions.widths.publicGraphTable.table = layoutDimensions.widths.canvas - 6*colWidths.padding - colWidths.scrollbarWidth;
    remainingInnerWidths =  layoutDimensions.widths.publicGraphTable.table - (colWidths.quickView + colWidths.shortDate + colWidths.map);
    layoutDimensions.widths.publicGraphTable.columns.title = remainingInnerWidths * 0.40;
    layoutDimensions.widths.publicGraphTable.columns.analysis = remainingInnerWidths * 0.35;
    layoutDimensions.widths.publicGraphTable.columns.series = remainingInnerWidths * 0.25;
    $('#tblPublicGraphs_wrapper').find('thead').find('th.title').width(layoutDimensions.widths.publicGraphTable.columns.title+'px')
        .end().find('th.analysis').width(layoutDimensions.widths.publicGraphTable.columns.analysis+'px')
        .end().find('th.series').width(layoutDimensions.widths.publicGraphTable.columns.series+'px');
}
function setupMySeriesTable(){

    dtMySeries = $('#series-table').html('')
        .dataTable({
            "bProcessing": true,
            "sDom": 'frti',
            "bPaginate": false,
            "bFilter": true,
            "bAutoWidth": false,
            "fnInfoCallback": function( oSettings, iStart, iEnd, iMax, iTotal, sPre ) {return 'showing ' + ((iMax==iTotal)?'':(iTotal + ' of ')) + iMax + ' series';},
            "oLanguage": {
                "sSearch": ""
            },
            "sScrollY": (layoutDimensions.heights.innerDataTable-140) + "px",
            //     "sScrollX": tableWidth + "px",
            "aaSorting": [[MY_SERIES_DATE,'desc']],
            "aoColumns": [
                { "mData": "name", "sTitle": "Series Name<span></span>", "sClass": 'title', "bSortable": true, "sWidth": layoutDimensions.widths.mySeriesTable.columns.series + "px",
                    "mRender": function(value, type, obj){
                        return ((obj.mapsetid)?iconsHMTL.mapset:'')
                            + ((obj.pointsetid)?iconsHMTL.pointset:'')
                            + ((obj.themeid)?iconsHMTL.hasCubeViz:'')
                            + value
                            + '<span class="handle">' + obj.handle + '</span>';
                    }
                },
                { "mData": "units", "sTitle": "Units<span></span>", "sClass": "units", "bSortable": true, "sWidth": layoutDimensions.widths.mySeriesTable.columns.units + "px",  "mRender": function(value, type, obj){return value}},
                { "mData": "period", "sTitle": "P<span></span>", "sClass": 'dt-freq', "bSortable": true, "sWidth": colWidths.periodicity + "px",
                    "mRender": function(value, type, obj){return formatPeriodWithSpan(obj.period)}
                },
                { "mData":"firstdt", "sTitle": "from<span></span>", "sClass": "dte", "sWidth": colWidths.shortDate+"px", "bSortable": true, sType: "numeric", "asSorting":  [ 'desc','asc'],
                    "mRender": function(value, type, obj){if(type=='sort') return parseInt(value); else return formatDateByPeriod(value, obj.period);}
                },
                { "mData":"lastdt", "sTitle": "to<span></span>", "sClass": "dte", "sWidth": colWidths.shortDate+"px", "bSortable": true, sType: "numeric", "asSorting":  [ 'desc','asc'], "resize": false,
                    "mRender": function(value, type, obj){if(type=='sort') return parseInt(value); else return formatDateByPeriod(value, obj.period);}
                },
                { "mData": "graph",  "sTitle": "Category<span></span>", "sClass": "cat", "bSortable": true, "sWidth": layoutDimensions.widths.mySeriesTable.columns.category + "px", "mRender": function(value, type, obj){return value}},
                { "mData": null,  "sTitle": "Source<span></span>", "sClass": 'dt-source',  "bSortable": false, "sWidth": colWidths.src + "px", "resize": false,
                    "mRender": function(value, type, obj){
                        if(obj.url) {
                            return formatAsUrl(obj.url,  obj.src) ;
                        } else {
                            return '<span class=" ui-icon ui-icon-person" title="user series"></span> ' +  obj.username||'';
                        }
                    }
                },
                { "mData": "save_dt",  "sTitle": "added<span></span>", "bSortable": true, sType: "numeric",  "sWidth": colWidths.shortDate + "px", "resize": false,
                    "mRender": function(value, type, obj){ if(type=='sort') return parseInt(value); else return timeOrDate(value);}
                }//
            ]
        })
        .click(function(e){
            var $td = $(e.target).closest('td');
            if($td.hasClass('title') || $td.hasClass('units') || $td.hasClass('dt-freq') || $td.hasClass('dte')){
                dtMySeries.find('tr.ui-selected').removeClass('ui-selected');
                $td.closest('tr').addClass('ui-selected');
                previewMySeries();
            }
            /* if($td.hasClass('url')){
             if(!$(e.target).hasClass('ui-icon-extlink')) $td.find('a').click();
             }*/
        });
    $('#series-table_filter')
        .appendTo('#series-bar-controls')
        .append('<span class="filterReset ui-icon ui-icon-circle-close-inactive" style="color:white;overflow:hidden;float:right;text-align:left;position:relative;top:3px;" onclick="$(\'#series-table_filter :input\').attr(\'value\',\'\').keyup();">clear filter</span>')
        .find('input')
        .val('enter key phrase to filter')
        .addClass('grey-italics')
        .on('click keydown', function(){
            $(this).removeClass('grey-italics').val('').off('click keydown');
        })
        .on('keyup change', seriesFilterChange);

    $('.new-series').button().click(function(){showSeriesEditor()});
    $('#series-table_info').appendTo('#local-series-header');
}
function setupPublicSeriesTable(){
    dtPublicSeries =  $('#tblPublicSeries').html('').dataTable({
        "sDom": "frti", //TODO: style the components (http://datatables.net/blog/Twitter_Bootstrap) and avoid jQuery calls to append/move elements
        "bServerSide": true,
        "oLanguage": {"sEmptyTable": "Please use the form above to search the MashableData servers for public series"},
        "fnServerData": function ( sSource, aoData, fnCallback ) {
            var thisSearch =  $("#tblPublicSeries_filter input").val();
            aoData.push({name: "command", value: "SearchSeries"});
            aoData.push({name: "uid", value: getUserId()});
            aoData.push({name: "accessToken", value: account.info.accessToken});
            aoData.push({name: "periodicity", value: $("#series_search_periodicity").val()});
            aoData.push({name: "apiid", value: $("#series_search_source").val()});
            aoData.push({name: "catid", value: searchCatId});
            aoData.push({name: "mapset", value: $("input:radio[name=public-mapset-radio]:checked").val()});
            aoData.push({name: "lastSearch", value: lastSeriesSearch});
            aoData.push({name: "search", value: thisSearch});
            if(lastSeriesSearch!=thisSearch) {
                lastSeriesSearch = thisSearch;
                dtPublicSeries.fnSort([]);   //this clear sort order and triggers a fnServerData call
                return;  //the server call trigger by the previous line will correctly load the data, therefore abort
            }
            $.ajax( {
                "dataType": 'json',
                "type": "POST",
                "url": "api.php",
                "data": aoData,
                "success": function(data, textStatus, jqXHR){
                    totalServerTime += parseFloat(data.exec_time);
                    console.log(data.command+" ("+data.search+"): "+data.exec_time+' ('+totalServerTime+'ms)');
                    if(data.status=='ok') fnCallback(data, textStatus, jqXHR); else dialogShow('server error', data.status);
                },
                "error": function(results){
                    console.log(results);
                }
            });
        },
        "fnInfoCallback": function( oSettings, iStart, iEnd, iMax, iTotal, sPre ) {
            return iTotal + " series";
        },
        "bAutoWidth": false,
        "bProcessing": true,
        //"bPaginate": false,  //defaults to true, but overridden by sScrollY and required for infinite scrolling
        //"bLengthChange": false, //do not display the pagination length dropdown selector.
        "bScrollInfinite": true,
        "iDisplayLength": 50,  //record fetch
        "iScrollLoadGap": 200, //in px         "bAutoWidth": true,  //TODO: why is this not working as expected
        "bDestroy": true, //"oColReorder": {"iFixedColumns": 0}, "sScrollY": "200px", // (layoutDimensions.heights.innerDataTable) + "px", //just scrolling div.  Total height must include header row
        "sScrollX": ($("#canvas").width()-55) + "px",
        "aaSorting": [],  //[[8,'desc']],  using namelen to show shortest first by default
        "iDeferLoading": 0,
        "aoColumns": [
            { "mData":"name", "sTitle": "Series Name<span></span>", "bSortable": true, "sWidth": layoutDimensions.widths.publicSeriesTable.columns.series + "px", "sClass": "title",
                "mRender": function(value, type, obj){
                    return ((obj.mapsetid)?iconsHMTL.mapset:'')
                        + ((obj.pointsetid)?iconsHMTL.pointset:'')
                        + ((obj.themeid)?iconsHMTL.hasCubeViz:'')
                        + spanWithTitle(value)
                        + '<span class="handle">' + (obj.userid?'U':'S') + obj.seriesid + '</span>';
                }},
            { "mData":"units", "sTitle": "Units<span></span>", "sClass": "units", "sWidth": layoutDimensions.widths.publicSeriesTable.columns.units+"px", "bSortable": true, "mRender": function(value, type, obj){return spanWithTitle(value)} },
            { "mData":null, "sTitle": "P<span></span>", "sWidth": colWidths.periodicity+"px", "bSortable": true, "sClass": "dt-freq", "mRender": function(value, type, obj){return formatPeriodWithSpan(obj.period)} },
            { "mData":"firstdt", "sTitle": "from<span></span>", "sClass": "dte",  "sWidth": colWidths.mmmyyyy+"px", "bSortable": true, "asSorting":  [ 'desc','asc'], "mRender": function(value, type, obj){return spanWithTitle(formatDateByPeriod(value, obj.period))}},
            { "mData":"lastdt", "sTitle": "to<span></span>",  "sClass": "dte", "sWidth": colWidths.mmmyyyy+"px",  "bSortable": true, "asSorting":  [ 'desc','asc'], "resize": false,"mRender": function(value, type, obj){return spanWithTitle(formatDateByPeriod(value, obj.period))}},
            { "mData":"title", "sTitle": "Category (click to browse)<span></span>", "sClass": "cat", "sWidth": layoutDimensions.widths.publicSeriesTable.columns.category+"px", "bSortable": true,
                "mRender": function(value, type, obj){
                    if(obj.apiid!=null&&obj.title!=null){
                        return '<span class="ui-icon browse-right">browse similar series</span> ' + spanWithTitle(value);
                    } else {
                        return spanWithTitle(value);
                    }
                }
            },
            { "mData":null, "sTitle": "Source<span></span>","bSortable": false, "sClass": 'url',  "sWidth": colWidths.src+"px", "resize": false,
                "mRender": function(value, type, obj){return formatAsUrl(obj.url, obj.src)}}
        ]
    }).click(function(e){
            var $td = $(e.target).closest('td');
            if($td.hasClass('title') || $td.hasClass('units') || $td.hasClass('dt-freq') || $td.hasClass('dte')){
                dtPublicSeries.find('tr.ui-selected').removeClass('ui-selected');
                $td.closest('tr').addClass('ui-selected');
                previewPublicSeries();
            }
            if($td.hasClass('cat')){
                var handle = $td.closest('tr').find('span.handle').html();
                if(handle) browseFromSeries(handle.substr(1));
            }
            /*if($td.hasClass('url')){
             $td.find('a').clone(false).click().remove();  //does not work...
             //the following causes an infinite loop: if(!$(e.target).hasClass('ui-icon-extlink')) $td.find('a').click();
             }*/
        });
    $('#tblPublicSeries_info').html('').appendTo('#cloud-series-search');
    $('#tblPublicSeries_filter').hide();
    $('#public-mapset-radio').buttonset().find("input").change(function(){seriesCloudSearch()});

    $('#series_search_text')
        .val('enter search keywords (-keyword to exclude)')
        .keyup(function(event){ seriesCloudSearchKey(event)})
        .on('click keydown',function(e){
            $(this).removeClass('grey-italics').val('').off('click keydown');
        });
    $('#cloud-series-browse').button({icons: {secondary: "ui-icon-circle-triangle-e"}}).click(function(){browseFromSeries()});
}
function setupMyGraphsTable(){
    dtMyGraphs = $('#my_graphs_table').html(' ').dataTable({
        "sDom": 'frti',
        "bFilter": true,
        "bPaginate": false,
        "bAutoWidth": false,
        "bProcessing": true,
        "bDestroy": true,
        "fnInfoCallback": function( oSettings, iStart, iEnd, iMax, iTotal, sPre ) {return ((iMax==iTotal)?'':'found ' + iTotal + ' of ') + iMax + ' graphs'+(iTotal>0?' <b>Click on a title to open</b>':'');},
        "oLanguage": {
            "sSearch": ""
        },
        "oColReorder": {"iFixedColumns": 2},
        "sScrollY": (layoutDimensions.heights.innerDataTable-120) + "px",
        "sScrollX": layoutDimensions.widths.myGraphsTable.table + "px",
        "aaSorting": [[5,'desc']],
        "aoColumns": [
            {"mData":"title", "sTitle": "Title<span></span>", "bSortable": true,  sClass: "wrap title", "sWidth": layoutDimensions.widths.myGraphsTable.columns.title+"px",
                "mRender": function(value, type, obj){return value.trim() + '<span class="handle" data="G' + obj.gid + '">G' + obj.gid + '</span> '}
            },
            {"mData":"map", "sTitle": "Map<span></span>", "bSortable": true,  "sWidth": colWidths.map+"px",
                "mRender": function(value, type, obj){
                    return (obj.mapsets?(obj.mapsets.options.mode=='bubble'?iconsHMTL.hasBubbleMap:iconsHMTL.hasHeatMap):'')
                        + (obj.pointsets?iconsHMTL.hasMarkerMap:'')
                        + ((obj.themeid)?iconsHMTL.hasCubeViz:'')
                        + spanWithTitle(value)
                }
            },
            {"mData":"analysis", "sTitle": "Analysis<span></span>", "bSortable": true, "sClass":"analysis", "sWidth": layoutDimensions.widths.myGraphsTable.columns.analysis+"px", "mRender": function(value, type, obj){return spanWithTitle(value.trim())}},
            {"mData":"serieslist", "sTitle": "Series ploted or mapped<span></span>", "bSortable": true,  "sClass":"series", "sWidth": layoutDimensions.widths.myGraphsTable.columns.series+"px", "mRender": function(value, type, obj){return spanWithTitle(value)}},
            {"mData":null, "sTitle": "Views<span></span>", "bSortable": true, "sClass": 'dt-count', "sWidth": colWidths.views + "px",
                "mRender": function(value, type, obj){
                    if(obj.published == 'N'){
                        return '<span class=" ui-icon ui-icon-locked" title="This graph has not been published.  You must publish your graphs from the graph editor">locked</span>';
                    } else {
                        return obj.views;
                    }
                }
            },
            {"mData":"updatedt", "sTitle": "Created<span></span>", "asSorting":  [ 'desc','asc'], sType: "numeric","sClass": 'dte', "sWidth": colWidths.shortDate + "px",
                "mRender": function(value, type, obj){if(type=='sort') return parseInt(value); else return timeOrDate(value);}
            }
        ]
    }).click(function(e){
            var $td = $(e.target).closest('td');
            /*if($td.hasClass('title')){*/
            dtMyGraphs.find('tr.ui-selected').removeClass('ui-selected');
            var rowObject = dtMyGraphs.fnGetData($td.closest('tr').addClass('ui-selected').get(0));
            viewGraph(rowObject.gid);
            /*}*/
        });
    $('#my_graphs_table_filter')
        .prependTo('#myGraphsHeader')
        .append('<span class="filterReset ui-icon ui-icon-circle-close-inactive" style="color:white;overflow:hidden;float:right;text-align:left;position:relative;top:3px;" onclick="$(\'#my_graphs_table_filter :input\').attr(\'value\',\'\').keyup();">clear filter</span>')
        .find('input')
        .val('search my graphs').addClass('grey-italics')
        .on('click keydown',function(e){
            $(this).removeClass('grey-italics').val('').off('click keydown');
        })
        .on('keyup change', seriesFilterChange);
    $('#my_graphs_table_info').appendTo('#myGraphsHeader');
}
function setupPublicGraphsTable(){
    dtPublicGraphs = $('#tblPublicGraphs').dataTable({
        //"aaData": md_search_results.aaData,
        "sDom": 'frti',
        "bPaginate": false,
        "bDestroy": true,
        "bAutoWidth": false,
        "bScrollInfinite": true,
        "iDisplayLength": 50,  //record fetch
        "iScrollLoadGap": 200, //in px         "bAutoWidth": true,  //TODO: why is this not working as expected
        "bProcessing": true,  //message customized by jQuery .html() after this function call
        "oLanguage": {"sEmptyTable": "Please use the form above to search the MashableData servers for public graphs"},
        "bServerSide": true,
        "fnServerData": function ( sSource, aoData, fnCallback ) {
            aoData.push({name: "command", value: "SearchGraphs"});
//            aoData.push({ "name": "periodicity", "value": $("#").value });
            aoData.push({name: "search", value: $("#tblPublicGraphs_filter input").val()});
            $.ajax( {
                "dataType": 'json',
                "type": "POST",
                url: "api.php",
                data: aoData,
                "success": function(data, textStatus, jqXHR){
                    if(data.status=='ok') fnCallback(data, textStatus, jqXHR); else dialogShow('server error', data.status);  //make sure completed command did not return an error code
                },
                "complete": function(results){
                    console.log(results);
                }
            });
        },
        "fnInfoCallback": function( oSettings, iStart, iEnd, iMax, iTotal, sPre ) {
            return iTotal + " graph"+((iTotal==1)?'s':'')+((iTotal>0)?' <b>click on title to view</b>':'');
        },
        "iDeferLoading": 0,
        "oColReorder": {"iFixedColumns": 2},
        //"sScrollY": (layoutDimensions.heights.innerDataTable-220) + "px",
        "sScrollX": layoutDimensions.widths.publicGraphTable.table + "px",
        "aaSorting": [[5,'desc']],
        "aoColumns": [
            {"mData":"title", "sTitle": "Title<span></span>", "bSortable": true, "sClass": 'title',  "sWidth":  layoutDimensions.widths.publicGraphTable.columns.title + 'px',
                "mRender": function(value, type, obj){return value + '<span class="handle">G'+obj.graphid+'</span>';}
            },
            {"mData":"map", "sTitle": "Map<span></span>", "bSortable": true,  "sWidth": colWidths.map+"px", "mRender": function(value, type, obj){
                return (obj.mapsets?iconsHMTL.hasHeatMap:'')
                    + (obj.pointsets?iconsHMTL.hasMarkerMap:'')
                    + ((obj.themeid)?iconsHMTL.hasCubeViz:'')
                    + spanWithTitle(value);
            }},
            {"mData":"analysis", "sTitle": "Analysis<span></span>", "bSortable": false, "sWidth":  layoutDimensions.widths.publicGraphTable.columns.analysis + 'px'},
            {"mData":"serieslist", "sTitle": "Series<span></span>", "bSortable": false, "sClass": 'series', "sWidth": layoutDimensions.widths.publicGraphTable.columns.series + 'px'},
            {"mData":"views", "sTitle": "Views<span></span>", "bSortable": true, "sClass": 'count', "sWidth": colWidths.views + 'px'},
            {"mData":"modified", "sTitle": "Modified<span></span>", "bSortable": true, sType: 'numeric', "asSorting":  [ 'desc','asc'], "sClass": 'dte', "sWidth": colWidths.shortDate + 'px',
                "mRender": function(value, type, obj){if(type=='sort') return parseInt(value); else return timeOrDate(value);}
            }
        ]
    })
        .click(function(e){
            var $td = $(e.target).closest('td');
            /*if($td.hasClass('title')){*/
            dtPublicGraphs.find('tr.ui-selected').removeClass('ui-selected');
            var rowObject = dtPublicGraphs.fnGetData($td.closest('tr').addClass('ui-selected').get(0));
            var $graphRow = dtPublicGraphs.find('tr.ui-selected');
            if($graphRow.length==1){
                var rowObject = dtPublicGraphs.fnGetData($graphRow.get(0));
                if(rowObject){
                    hasher.setHash(encodeURI('t=g&graphcode=' + rowObject.ghash));
                } else {
                    dialogShow('search for public graphs', dialogues.noPublicGraphs);
                }
            }
        });
    $('#tblPublicGraphs_info').appendTo('#public_graphs_search');
    $('#tblPublicGraphs_filter').hide();
    $('#graphs_search_text')
        .val('enter search terms or leave blank for latest graphs')
        .keyup(function(event){ graphsCloudSearch(event)})
        .on('click keydown',function(e){
            $(this).removeClass('grey-italics').val('').off('click keydown');
        });
    $('#graphs-search-button').click(graphsCloudSearch);
}

//DATATABLE HELPER FUNCTIONS
function seriesFilterChange(){
    var $filter = $(this);
    var $reset = $filter.closest('div').find('span.filterReset');
    if($filter.val().length == 0){
        $reset.removeClass('ui-icon-circle-close').addClass('ui-icon-circle-close-inactive')
    } else {
        $reset.removeClass('ui-icon-circle-close-inactive').addClass('ui-icon-circle-close')
    }
}
function timeOrDate(dateValue){
    var dt = new Date();
    var today = dt.toDateString();
    if(isNaN(dateValue)){
        dt.setTime( Date.parse(dateValue));
    } else {
        dt.setTime(dateValue);
    }
    if(dt.toDateString()== today){
        return '<span title="' + dt.toString().substr(4,20) + '">' + dt.toString().substr(16,5) + '</span>';
    } else {
        return '<span title="' + dt.toString().substr(4,20) + '">' + dt.toString().substr(4,11) + '</span>'
    }
}
function seriesCloudSearchKey(event){
    var keyCode = ('which' in event) ? event.which : event.keyCode;
    if(searchCatId){
        var $series_search_text = $('#series_search_text');
        $series_search_text.val($series_search_text.val().replace('category: ',''));
        searchCatId=0; //exit category browse mode
    }
    if((keyCode == 13 &&  event.target.id == 'series_search_text') || event.target.id != 'series_search_text') {
        seriesCloudSearch();
        event.preventDefault();
    }
}
function seriesCloudSearch(noHashChange){
    browseClose();
    var $series_search_text = $('#series_search_text');
    if(searchCatId  && $('#series_search_source').val()!='ALL'){
        $series_search_text.val($series_search_text.val().replace('category: ',''));
        searchCatId=0; //exit category browse mode
    }
    var searchText = $series_search_text.hasClass('grey-italics')?'':$series_search_text.val();
    if(searchText.match(/(title|name|skey):"[^"]+"/i)==null){
        searchText = (' ' + searchText + ' ').replace(/[\s]+/g,' ');
        //if(searchText==' ')return false; //no search on empty strings
        searchText = searchText.substring(1, searchText.length-1);
        searchText = '+' + searchText.replace(/ /g,' +');
    }
    $('#tblPublicSeries_filter input').val(searchText);
    dtPublicSeries.fnFilter(searchText);
    if(!noHashChange) setPanelHash();
}
function getPublicSeriesByCat(a){
    var titleSearch = 'title:"' + $(a).text() + '"';
    $('#series_search_text').val(titleSearch);
    seriesCloudSearch();
}
function graphsCloudSearch(event){
    var keyCode = ('which' in event) ? event.which : event.keyCode;
    if((keyCode == 13 &&  event.target.id == 'graphs_search_text') || event.target.innerHTML == 'search') {
        var searchText = $('#graphs_search_text').hasClass('grey-italics')?'':$('#graphs_search_text').val();
        searchText = (' ' + searchText + ' ').replace(/[\s]+/g,' ');  //eliminate extra spaces.
        searchText = searchText.substring(1, searchText.length-1);
        searchText = '+' + searchText.replace(/ /g,' +');
        $('#tblPublicGraphs_filter input').val(searchText);
        dtPublicGraphs.fnFilter(searchText);
        setPanelHash();
    }
}
function formatPeriodWithSpan(period){
    switch(period){
        case 'D':
            return '<span title="Daily data">D</span>';
        case 'W':
            return '<span title="Weekly data">W</span>';
        case 'M':
            return '<span title="Monthly data">M</span>';
        case 'Q':
            return '<span title="Quarterly data">Q</span>';
        case 'SA':
            return '<span title="Semi-annual data">SA</span>';
        case 'A':
            return '<span title="Annual data">A</span>';
        default:
            return period
    }
}
function spanWithTitle(val){
    return '<span title="' + ((val==null)?" ":val) + '">' + ((val==null)?" ":val) + '</span>';
}
function formatAsUrl(url, txt){
    txt = txt ||url.replace(/\b(http(s)*:\/\/)*(www.)*/gi,'').replace('/', ' /');
    return '<a href="' + url + '" target="_blank" title="' + url + '"><span class=" ui-icon ui-icon-extlink">' + url + '</span>'+txt+'</a>';
}
function viewGraph(gid){
    createMyGraph(gid);
    hideGraphEditor();
}
//DIALOG FUNCTIONS
var $dialog;
function showAuthorizeDialogue(){
    dialogShow('User Agreement',
        '<span id="dialog-top">MashableData is a free workbench to analyze and graph data series.  Data series viewed using our plugin have been securely cached in your browser\'s local storage.  To power the workbench, the data series must be shared with our servers.  Once sharing is enabled, you will be able to search and view series and public graphs on MashableData.com\'s servers.<br /><br />'
            + '<span id="dialog-learn"><i>To learn more, please read <a href="/" target="help">how MashableData works</a> and our <a href="/" target="help">privacy policy</a>.</i></span>'
            + '<br /><br />Ok to anonymously share the datasets you have browsed?</span>',
        [
            {
                text: 'Enable',
                id: 'btn-dia-enable',
                click: function() {
                    var now = new Date();
                    window.localStorage.setItem('authorized', now);
                    initFacebook(); //only log in after user has authorized
                    $(this).dialog('close');
                }
            },
            {
                text: 'Disable',
                id:'btn-dia-disable',
                click:  function() {
                    window.localStorage.clear();
                    window.localStorage.setItem('authorized', 'no');
                    $(this).dialog('close');
                    window.location = ".";
                }
            }
        ]);
}
function dialogShow(title, text, buttons){
    $('#dialog').html("<br><br>" + text + "<br><br>");
    if(!buttons){
        buttons =
            [{
                text: 'OK',
                id:'btn-OK',
                click:  function() {
                    $(this).dialog('close');
                }
            }];

    }
    $dialog = $('#dialog').dialog({
        modal: true,
        title: title,
        width: 500,
        buttons: buttons,
        open: function() {
            $("#btn-dia-enable").focus();
        },
        close: function(){}
    });
    $('.ui-dialog-titlebar-close').remove();
}

//LOCALSTORAGE HELPER FUNCTIONS  (LS also referenced from doc.ready, syncMyAccount
function loadMySeriesByKey(){ //called on document.ready and when page get focus
    var mySerie, seriesLoadCount=0, seriesTree= {}, localSeries = window.localStorage.getItem('newSeries'); //converted to a single master index from separate Saved and History indexes
    if(localSeries!=null){
        window.localStorage.removeItem('newSeries');  //used to indicate if the series table needs to be refreshed.
        var seriesKeys = JSON.parse(localSeries);
        var adddt = new Date();
        var params = {command: 'UploadMyMashableData', adddt: adddt.getTime(), series: []};
        for(var i=0;i<seriesKeys.length;i++){
            seriesLoadCount++;
            mySerie = JSON.parse(localStorage.getItem(seriesKeys[i]));
            localStorage.removeItem(seriesKeys[i]);
            mySerie.handle = 'L'+localSeriesIndex++;
            //reformat data as string
            mySerie.data = mashableDataString(mySerie);

            if(account.loggedIn()) {          // ...add to MySeries in cloud
                params.series.push(mySerie);
                seriesTree[mySerie.handle] = mySerie;
            } else {
                oMySeries[mySerie.handle] = mySerie;
                addMySeriesRow($.extend({}, mySerie));
            }
        }
        if(account.loggedIn()){
            callApi(params, function(results, textStatus, jqXH){
                var dbHandle;
                for(var localHandle in results.handles){
                    dbHandle = results.handles[localHandle];
                    seriesTree[localHandle].handle = dbHandle;
                    mySerie.usid = dbHandle.substr(1);
                    addMySeriesRow($.extend({},seriesTree[localHandle])); //this will update or add the series as needed and add it to the oMySeries object
                }
            });
        }
    }
    mySeriesLoaded = true;  //global var used to prevent this from firing when the window opens until we are ready
    return seriesLoadCount;
}
function removeIdFromStorageList(id, key){
    var ids = window.localStorage.getItem(key);
    var found = false;
    //console.log('saved: ' + window.localStorage.getItem('saved'));
    if(ids==null){
        //not found (will return false)
    } else {
        //remove from fromIds
        //console.log(fromIds);
        var aryIds = ids.split('|');
        for(var i=0;i<aryIds.length;i++){
            if(aryIds[i]==id){
                aryIds.splice(i,1);
                found = true;
                //break;  do a full sweep just in case
            }
        }
        if(aryIds.length ==0){
            window.localStorage.removeItem(key);
        } else {
            window.localStorage.setItem(key, aryIds.join('|'))
        }
    }
    return(found);
}

//UI HELPER FUNCTIONS
function showHideGraphEditor(){
//	$(".show-hide").slideToggle("slow", function(){  //callback fires 3 times, one for each .show-hide div
    var current = $("div.picker:visible").length;
    if(current==1){
        $(".show-hide").slideToggle(function(){ //callback prevents close click from tiggering a showGraphEditor
            var panelToDeactive = $("#series-tabs li.ui-tabs-selected").removeClass("ui-tabs-selected ui-state-active").find("a").attr("data");
            $(panelToDeactive).hide();
        });
        $("#show-hide-pickers").hide({complete: setPanelHash});
    } else {
        $(".show-hide").slideToggle(function(){

        });
        if($graphTabs.find("li.graph-tab").length>0) $("#show-hide-pickers").show();  //in revise layout, hide instead of state change: .html('show graphs <span class="ui-icon browse-rollup"></span>')
    }
}
function showGraphEditor(){
    if($("div.picker:visible").length==0) showHideGraphEditor();
}
function hideGraphEditor(){
    if($("div.picker:visible").length==1) showHideGraphEditor();
}

//EVENT FUNCTIONS
function titleChange(titleControl){
    var panelId = $(titleControl).closest("div.graph-panel").get(0).id;
    panelGraphs[panelId].controls.chart.setTitle({text:titleControl.value});
    panelGraphs[panelId].title = titleControl.value;
    if(titleControl.value.length==0){
        var noTitle= 'Graph'+panelId.substring(panelId.indexOf('-')+1);
        $('a[href=#'+panelId+']').html(noTitle).attr("title",noTitle);
    } else {
        $('a[href=#'+panelId+']').html(titleControl.value).attr("title",titleControl.value);
    }
    panelGraphs[panelId].controls.chart.redraw();
    //oMyGraphs & table synced only when user clicks save
}

function previewMySeries(){
    var series = [], hasMySeries = false;
    $('#local-series-header input').focus(); //deselect anything table text accidentally selected through double-clicking
    $quickViewRows = dtMySeries.find('tr.ui-selected').each(function(){
        series.push(dtMySeries.fnGetData(this));
    });
    if(series.length==0){
        for(var handle in oMySeries){
            hasMySeries = true;
            break;
        }
        if(hasMySeries) dialogShow('no series selected', dialogues.noSeriesSelected); else dialogShow('no series selected', dialogues.noMySeries);
    } else {

        preview(series, false);
    }
}
function previewPublicSeries(){
    var series = [], hasMySeries = false;
    $('#series_search_text').focus(); //deselect anything table text accidentally selected through double-clicking
    dtPublicSeries.find('tr.ui-selected').each(function(){
        series.push(dtPublicSeries.fnGetData(this));
    });
    if(series.length==0){
        dialogShow('selection required', dialogues.noSeriesSelected);
    } else {
        preview(series, true);
    }
}
//QUICK VIEW FUNCTIONS
function preview(series, showAddSeries){
    //if(notLoggedInWarningDisplayed()) return false;     // need to allow some playing before forcing a signup
    var sids = [], usids=[], handle, i;
    for(i=0;i<series.length;i++){
        if(!series[i].data){ //note:  if L, it *must* have its own data
            if(series[i].handle[0]=='S') sids.push(series[i].handle.substring(1));
            if(series[i].handle[0]=='U') usids.push(series[i].handle.substring(1));
        }
    }

    if(sids.length+usids.length==0){
        quickGraph(series, showAddSeries);
    } else {
        callApi({command:  'GetMashableData',
                sids: sids,
                usids: usids
            },
            function(jsoData, textStatus, jqXH){
                for(i=0;i<series.length;i++){
                    handle = series[i].handle;
                    if(oMySeries[handle]){ //if this happens to be in mySeries...
                        oMySeries[handle].data = jsoData.series[handle].data;
                        oMySeries[handle].notes = jsoData.series[handle].notes;
                        oMySeries[handle].geocounts = jsoData.series[handle].geocounts;
                    }
                    series.splice(i, 1, jsoData.series[handle]);
                }
                quickGraph(series, showAddSeries);
            }
        );
    }
}

function quickGraph(obj, showAddSeries){   //obj can be a series object, an array of series objects, or a complete graph object
    var quickGraph, aoSeries, i;
    var hasMaps = false, seriesMaps = [], otherMaps = [], sets = [];
    var $mapSelect =  $('#quick-view-maps');
    if($quickViewRows) $('#quick-view-delete-series').show(); else $('#quick-view-delete-series').hide();

    if(obj.plots){ // a graphs object was passed in
        quickGraph = obj; // everything including title should be set by caller
        oQuickViewSeries = obj; //store in global var
    } else {
        if(obj instanceof Array) aoSeries = obj; else aoSeries = [obj];
        oQuickViewSeries = aoSeries;
        quickGraph = emptyGraph();
        quickGraph.plots = [];
        var handles = [];
        for(i=0;i<aoSeries.length;i++){
            quickGraph.assets[aoSeries[i].handle] = aoSeries[i];
            quickGraph.plots.push({components:[{handle:aoSeries[i].handle, options:{k:1, op:'+'}}],  options:{}});
            handles.push(aoSeries[i].handle);
        }
    }

    var quickChartOptions = grapher.makeChartOptionsObject(quickGraph);
    delete quickChartOptions.chart.height;
    if(aoSeries instanceof Array){
        if(aoSeries.length==1){
            quickChartOptions.title = {text: aoSeries[0].name};
            quickChartOptions.legend = {enabled: false};
        } else {
            delete quickChartOptions.title;
        }
    }
    quickChartOptions.chart.borderWidth = 2;
    quickChartOptions.chart.renderTo = 'highcharts-div';
    quickChart = new Highcharts.Chart(quickChartOptions);

    var qvNotes='';
    if(!obj.plots){ //only if single series
        if(aoSeries.length==1 && aoSeries[0].notes){
            //this are the series info added to the quickView panel.  Could be more complete & styled
            qvNotes = '<table><tr><td width="20%">Graph title or API category:</td><td width="*">' + aoSeries[0].graph||'' + '</td></tr>'
                + '<tr><td>Series notes:</td><td>' + aoSeries[0].notes||'' + '</td></tr>'
                + '<tr><td>My Series count:</td><td>' + aoSeries[0].myseriescount||'' + '</td></tr>'
                + '<tr><td>Graphs (including unpublished) count:</td><td>' + aoSeries[0].graphcount||'' + '</td></tr>'
                + '<tr><td>Series key:</td><td>' + aoSeries[0].skey||'' + '</td></tr>'
                + '</table>';
        }
        //determine whether and which maps to show in the selector
        for(i=0;i<aoSeries.length;i++){
            if((aoSeries[i].mapsetid && sets.indexOf('M'+aoSeries[i].mapsetid)==-1) || (aoSeries[i].pointsetid && sets.indexOf('X'+aoSeries[i].pointsetid)==-1)){
                if(aoSeries[i].mapsetid) sets.push('M'+aoSeries[i].mapsetid); else sets.push('X'+aoSeries[i].pointsetid);
                for(var map in aoSeries[i].geocounts){
                    if(aoSeries[i].geocounts[map].set>1){
                        hasMaps = true;
                        if(aoSeries[i].geocounts[map].regions){
                            seriesMaps.push('<option value="'+map+'">'+map+' ('+aoSeries[i].geocounts[map].set+')</option>');
                        } else {
                            otherMaps.push('<option class="other-map" value="'+map+'">'+map+' ('+aoSeries[i].geocounts[map].set+')</option>');
                        }
                    }
                }
            }
        }
    }
    if(hasMaps){ //make sure we have maps to show
        seriesMaps.sort();
        otherMaps.sort();
        //$('button.quick-view-maps').button({icons: {secondary: sets[0][0]=='M'?"ui-icon-flag":"ui-icon-pin-s"}}).show();
        $('#quick-view-chart-or-map').show().find('input').off().click(showHideMapSelector );
        $mapSelect.html(seriesMaps.join('')+(otherMaps.length>0?'<option class="other-maps" value="other">other maps for this set:</option>'+otherMaps.join(''):''));
    } else {
        $mapSelect.hide();
        $('#quick-view-chart-or-map').hide();
    }
    $('#qv-info').html(qvNotes);
    function showHideMapSelector (){
        var show = ($('#quick-view-chart-or-map input:checked').val()!='chart');
        var shown = $mapSelect.css("display")!='none';
        if(show&&!shown || !show&&shown) $mapSelect.animate({width: 'toggle'});  //the complete function is sync insurance
    }
    showHideMapSelector();
    if(showAddSeries){
        $('#quick-view-to-series').button("disable").show();
        $('#quick-view-delete-series').hide();
    } else {
        $('#quick-view-to-series').hide();
        $('#quick-view-delete-series').show();
    }

    var graphOptions = '<option value="new">new graph</option>';
    $('div.graph-panel').each(function(){
        var $tabLink = $("ul#graph-tabs li a[href='#"+this.id+"']");
        graphOptions+='<option value="'+this.id+'"'+(($tabLink.closest("li").hasClass("ui-tabs-selected"))?' selected':'')+'>'+$tabLink.get(0).innerHTML+'</option>';
    });
    $('#quick-view-to-graphs').html(graphOptions).val(visiblePanelId())
        .off().click(function(){
            $('#quick-view-add-to-graph').find('.ui-button-text').html(($(this).val()=='new')?'create graph':'add to graph');
        })
        .click();
    //$('#quick-view-add-to-graph').button("enable");
    $('.show-graph-link').click();

}
function quickViewToSeries(btn){ //called from button. to add series shown in active quickView to MySeries
    $(btn).button("disable");
    for(var i=0;i<oQuickViewSeries.length;i++){
        oQuickViewSeries[i].save_dt = new Date().getTime();
        var serieskey = addMySeriesRow(oQuickViewSeries[i]);  //table and oMySeries add/update
        updateMySeries(oQuickViewSeries[i]); //cloud update
    }
    dialogShow('My Series', 'series added.',[]);
    $('#dialog').closest('.ui-dialog').fadeOut(1000, function(){ $('#dialog').dialog('close')});
    //quickView not closed automatically, user can subsequently chart or close
}
function quickViewToChart(btn){
    var graph, panelId =  $('#quick-view-to-graphs').val();
    if(oQuickViewSeries.plots){  //we have a complete graph object!
        if(panelId!='new') {
            var plots = oQuickViewSeries.plots, oGraph = panelGraphs[panelId];
            oGraph.controls.provenance.provOk(false); //commit any prov panel changes, but do not redraw graph
            if(!oGraph.plots) oGraph.plots=[];
            for(var p=0;p<plots.length;p++){
                oGraph.plots.push(plots[p]);
            }
            for(var asset in oQuickViewSeries.assets){
                panelGraphs[panelId].assets[asset] = panelGraphs[panelId].assets[asset] || oQuickViewSeries.assets[asset];
            }
            $("ul#graph-tabs li a[href='#"+panelId+"']").click(); //show the graph first = ensures correct sizing
            oGraph.controls.redraw();
        } else {
            buildGraphPanel(oQuickViewSeries);
        }
    } else {
        if(!(oQuickViewSeries instanceof  Array)) oQuickViewSeries = [oQuickViewSeries];
        if(panelId!='new'){
            graph = panelGraphs[panelId];
            graph.controls.provenance.provOk(false); //commit any prov changes but do not redraw
        } else {
            graph = emptyGraph();
        }
        if(!graph.plots)graph.plots=[];
        for(var i=0;i<oQuickViewSeries.length;i++){
            graph.assets[oQuickViewSeries[i].handle] = $.extend({save_dt: new Date().getTime()}, oQuickViewSeries[i]); //make copy
            graph.plots.push({
                components:
                    [{
                        handle:   oQuickViewSeries[i].handle,
                        options: {k:1.0, op:'+'}
                    }],
                options: {}
            });
        }
        if(panelId!='new'){
            $("ul#graph-tabs li a[href='#"+panelId+"']").click(); //show the graph first = ensures correct sizing

            graph.controls.redraw();
        } else {
            buildGraphPanel(graph);
        }
    }
    quickViewClose();
    hideGraphEditor();  //show graph instead My Series table of $('#local-series').click();
    setPanelHash();
}
function quickViewToMap(){
    var panelId =  $('#quick-view-to-graphs').val();
    var addedHandle;
    var map = $("#quick-view-maps").val();
    if(
        panelGraphs[panelId]
            && panelGraphs[panelId].map
            && (
            panelGraphs[panelId].map!=map
                || (panelGraphs[panelId].mapsets && oQuickViewSeries[0].period!=panelGraphs[panelId].assets[panelGraphs[panelId].mapsets.components[0].handle].period)
                ||(panelGraphs[panelId].pointsets && oQuickViewSeries[0].period!=panelGraphs[panelId].assets[panelGraphs[panelId].pointsets[0].components[0].handle].period)
            )
        ){
        dialogShow("Map Error","This graph already has a "+panelGraphs[panelId].map+" map.  Additional map data can be added, but must use the same base map <i>and</i> data set must have same frequecy.");
        return null;
    }
    if(map=='other'){
        dialogShow("selection required","Please select a base map to graph this set.");
        return null;
    }
    var oGraph;
    if(panelId=="new"){
        oGraph = emptyGraph()
    } else {
        oGraph = panelGraphs[panelId];
        oGraph.controls.provenance.provOk(false);
    }
    oGraph.map = map;
    oGraph.mapconfig.legendLocation = mapsList[map].legend;
    oGraph.mapFile = mapsList[map].jvectormap;
    require(['/global/js/maps/' +  oGraph.mapFile + '.js']); //preload it
    if(!oGraph.plots) oGraph.plots = [];

    for(var s=0;s<oQuickViewSeries.length;s++){
        serie = oQuickViewSeries[s];
        oGraph.plots.push({options:{}, components:[{handle: serie.handle, options: {k:1.0, op:'+'}}]});  //always plot the series in addition to any map
        if(serie.geocounts && serie.geocounts[map]){
            if(!isNaN(serie.mapsetid) && serie.mapsetid>0 && !hasMapset(serie.mapsetid)){
                if(!oGraph.mapsets) oGraph.mapsets = {options:{}, components:[]};
                addedHandle = 'M'+serie.mapsetid;
                oGraph.mapsets.components.push({handle: addedHandle, options:{k:1.0, op:(oGraph.mapsets.components.length==0?'+':'/')}});
            }
            if(!isNaN(serie.pointsetid) && serie.pointsetid>0 && !hasPointset(serie.pointsetid)){
                if(!oGraph.pointsets) oGraph.pointsets = [];
                addedHandle = 'X'+serie.pointsetid;
                oGraph.pointsets.push({options:{}, components:[{handle: addedHandle, options: {k:1.0, op:'+'} } ] } );
            }
        }
    }
    if(serie.themeid){
        if(themeCubes['T'+serie.themeid]) {
            selectCube(serie.themeid);
        } else {
            callApi({command: "GetCubeList", themeids: [serie.themeid]}, function(jsoData, textStatus, jqXH){
                themeCubes['T'+serie.themeid] = jsoData.themes['T'+serie.themeid];
                selectCube(serie.themeid);
            });
        }
    } else makeGraphAfterFetches();

    quickViewClose();

    function selectCube(themeid){
        var theme = themeCubes['T'+themeid];
        var html = '<div id="select-cube" style="width:330px;">'
            + '<h4>Map linked visualization available</h4>'
            + '<p>This series is part of a '+theme.name+'structure set that supports the following facetted vizualizations, which will be linked to the user\'s map clicks.</p><p>Please choose one.</p>'
            + '<select class="cubeSelector" size="'+theme.cubes.length+'">';
        for(var c=0;c<theme.cubes.length;c++){
            html += '<option value="'+theme.cubes[c].cubeid+'" '+(c==theme.cubes.length-1?'selected':'')+'>'+theme.cubes[c].name+'</option>';
        }
        html += '</select></label><br><br>'
            + '<button class="right" id="noViz">skip</button> <button class="right" id="vizSetOk">add linked visualization</button> '
            + '</div>';
        $.fancybox(html,
            {
                showCloseButton: false,
                autoScale: true,
                overlayOpacity: 0.5,
                hideOnOverlayClick: false
            });
        var $panel = $('#select-cube');
        $('#vizSetOk').button({icons: {secondary: 'ui-icon-cube'}}).click(function(){
            var cubeid = $panel.find('.cubeSelector').val();
            oGraph.mapconfig.cubeid = cubeid;
            close();
        });
        $('#noViz').button({icons: {secondary: 'ui-icon-close'}}).click(function(){
            close();
        });
        function close(){
            $.fancybox.close();
            makeGraphAfterFetches();
        }

    }
    function hasMapset(mapsetid){
        if(oGraph.mapsets){
            for(var c=0;c<oGraph.mapsets.components.length;c++){
                if(oGraph.mapsets.components.handle=='M'+mapsetid) return true;
            }
        }
        return false;
    }
    function hasPointset(pointsetid){
        if(oGraph.pointsets){
            for(var x= 0, len=oGraph.pointsets.length;x<len;x++){
                for(var c=0, len=oGraph.pointsets[x].components.length;c<len;c++){
                    if(oGraph.pointsets[x].components.handle=='X'+pointsetid) return true;
                }
            }
        }
        return false;
    }
    function makeGraphAfterFetches(){
        getAssets(oGraph, function(){
            require(['/global/js/maps/' + oGraph.mapFile + '.js'],function(){
                if(oGraph.title===null || oGraph.title==''){
                    oGraph.title = oGraph.mapsets?plotName(oGraph, oGraph.mapsets):plotName(oGraph, oGraph.pointsets[0]);
                }
                if(panelId=="new"){
                    buildGraphPanel(oGraph);
                } else {
                    $("ul#graph-tabs li a[href='#"+panelId+"']").click(); //show the graph first = ensures correct sizing
                    oGraph.controls.redraw();
                }
                mask('drawing');
                setPanelHash();
            });
            hideGraphEditor();
        });
    }
}
function quickViewClose(){
    quickChart.destroy();
    delete $quickViewRows;
    $('#fancybox-close').click();
}

function editSeries(series){//array of series to edit
    if($('#outer-show-graph-div:visible').length==1) quickViewClose();
    if(series.length==1){  //only can edit a series' set if we are editing a single series
        var serie = series[0];
        //see if user wants to edit the entire set or just this series
        if(serie.mapsetid||serie.pointsetid){ var html = '<div id="seriesOrSet" style="width:330px;">'
            + '<h4>This series is part of a set</h4>'
            + '<label><input type="radio" name="editSeriesOrSet" value="series" checked> edit just this series </label><br>'
            + '<label><input type="radio" name="editSeriesOrSet" value="set"> view and edit the set\'s series for the map:<br>'
            + '<select class="hidden" style="margin-top: 8px;margin-left: 25px"></select></label><br><br>'
            + '<button class="right" id="seriesOrSetCancel">cancel</button> <button class="right" id="seriesOrSetOk">OK</button>'
            + '</div>';
            $.fancybox(html,
                {
                    showCloseButton: false,
                    autoScale: true,
                    overlayOpacity: 0.5,
                    hideOnOverlayClick: false
                });
            var $panel = $('#seriesOrSet');
            var key, mapOptions='', $select = $panel.find('select').html('').show().click(function(){$panel.find('input:radio').removeAttr('checked').filter('[value="set"]').attr('checked','checked')});
            if(serie.geocounts){
                for(key in serie.geocounts){
                    mapOptions+='<option value="'+key+'|'+mapsList[key].jvectormap+'">'+key+' ('+serie.geocounts[key].set+')</option>';
                }
                $select.html(mapOptions);
            } else {
                callApi({command: "GetAvailableMaps", mapsetid: serie.mapsetid, pointsetid: serie.pointsetid, geoid: serie.geoid}, function(jsoData, textStatus, jqXH){
                    for(var i=0;i<jsoData.maps.length;i++){
                        mapOptions+='<option value="'+jsoData.maps[i].name+'|'+jsoData.maps[i].file+'">'+jsoData.maps[i].name+' ('+jsoData.maps[i].count+')</option>';
                    }
                    $select.html(mapOptions);
                });
            }

            $('#seriesOrSetOk').button({icons: {secondary: 'ui-icon-check'}}).click(function(){
                if($('input:radio[name=\'editSeriesOrSet\']:checked').val()=='series'){
                    showSeriesEditor(series);
                } else {
                    if(serie.pointsetid) showSeriesEditor('X'+serie.pointsetid, $select.val());
                    if(serie.mapsetid) showSeriesEditor('M'+serie.mapsetid, $select.val());
                }
                $.fancybox.close();
            });
            $('#seriesOrSetCancel').button({icons: {secondary: 'ui-icon-close'}}).click(function(){
                $.fancybox.close();
            });
        } else
            showSeriesEditor(series);
    } else
        showSeriesEditor(series);
}

function showSeriesEditor(toEdit, map){ //toEdit is either an array of series object or a Map/Pointset handle
    if(!account.loggedIn()) {
        dialogShow("account required", dialogues.signInRequired);
        return;
    }
    var $editor;  //set in intialize and used throughout
    var seriesEditorInitialised=false;
    var periodOfEdits=false;
    var editorCols = 2;
    var set = 'U';
    $('#series-tabs').find('li.local-series a').click();
    var requireModules = ["/global/js/handsontable/jquery.handsontable.0.7.5.src.js","/global/js/contextMenu/jquery.contextMenu.1.5.14.src.js"];
    var setid=null, rows = {
        U: {name: 0, units: 1, notes: 2, handle:3, header: 4},
        M: {name: 0, units: 1, notes: 2, geoid: 3, handle:4, header: 5},
        X: {name: 0, units: 1, notes: 2, geoid: 3, handle: 4, lat: 5, lon:6, header: 7}
    };
    if(toEdit && !Array.isArray(toEdit)){
        require(requireModules); //loading the require JS modules during the API call;
        if(toEdit[0]=='M'){ //MAPSET EDIT
            set = toEdit;
            callApi({command: 'GetSet', mapsetid: parseInt(set.substr(1)), map: map.split('|')[0], modal: 'persist'}, function(jsoData, textStatus, jqXH){
                require(requireModules,function(){userMapSet(jsoData.setData)});
            });
            function userMapSet(setData){
                //if(!seriesEditorInitialised)
                initializeSeriesEditor();
                var seriesData, point, i, j, row, grid = [["map set",setData.name],["units",setData.units],["notes",""],["geoid"],[set],["date"]];  //handle col will hold the set id
                for(i=0;i<setData.geographies.length;i++){
                    grid[rows.M.geoid].push(setData.geographies[i].geoid);
                    console.info("trying to set mapset's series handles");
                    grid[rows.M.handle].push(setData.geographies[i].handle);
                    grid[rows.M.header].push(setData.geographies[i].geoname);
                    /*if(i>1){
                     grid[rows.M.name].push("");
                     grid[rows.M.units].push("");
                     grid[rows.M.notes].push("");
                     }*/
                    row = rows.M.header+1;  //first data row
                    if(setData.geographies[i].data){
                        seriesData = setData.geographies[i].data.split('||');
                        seriesData.sort(); //this should not be necessary is series were properly ordered
                        for(j=0;j<seriesData.length;j++){
                            point = seriesData[j].split('|');
                            while(row<grid.length && grid[row][0]<point[0]) grid[row++].push('');
                            if(row==grid.length){
                                grid.push(makeRow());
                            } else {
                                if(grid[row][0]==point[0]) grid[row].push(point[1]);
                                if(grid[row][0]<point[0]) grid.splice(row,0,makeRow());
                            }
                            row++;
                        }
                    }
                    while(row<grid.length) grid[row++].push('');
                    function makeRow(){
                        var i, newRow = [point[0]];
                        for(i=1;i<grid[4].length-1;i++) newRow.push('');
                        newRow.push(point[1]);
                        return newRow;
                    }

                }
                editorCols = setData.geographies.length + 1;
                $("#data-editor").removeAttr("data")
                    .handsontable({
                        data: grid,
                        minCols: editorCols
                    }).
                    find('table.htCore tr').show().filter(':eq('+rows.M.handle+')').hide().end().filter(':eq('+rows.M.geoid+')').hide();
                unmask();
            }
        }
        if(toEdit[0]=='X'){ //MARKER SET EDIT
            set = toEdit;
            callApi({command: 'GetPointSets', pointsetids: [parseInt(set.substr(1))], map: map.split('|')[0], modal: 'persist'}, function(jsoData, textStatus, jqXH){
                require(requireModules,function(){userMarkerSet(jsoData.pointsets[set])});
            });
            function userMarkerSet(setData){
                initializeSeriesEditor();
                var seriesData, point, i, j, row, grid = [["marker set",setData.name],["units",setData.units],["notes",""],["geoid"],["lat"],["lon"],[set],["date"]]; //handle col will hold the set id
                for(var latlon in setData.data){
                    grid[rows.X.geoid].push(setData.data[latlon].geoid);
                    grid[rows.X.handle].push(setData.data[latlon].handle);
                    grid[rows.X.lat].push(setData.data[latlon].lat);
                    grid[rows.X.lon].push(setData.data[latlon].lon);
                    grid[rows.X.handle].push(setData.data[latlon].handle);
                    grid[rows.X.header].push(setData.data[latlon].name.replace(setData.name,'').trim());
                    row = rows.X.header+1;  //first data row
                    if(setData.data[latlon].data){
                        seriesData = setData.data[latlon].data.split('||');
                        seriesData.sort(); //this should not be necessary is series were properly ordered
                        for(j=0;j<seriesData.length;j++){
                            point = seriesData[j].split('|');
                            while(row<grid.length && grid[row][0]<point[0]) grid[row++].push('');
                            if(row==grid.length){
                                grid.push(makeRow());
                            } else {
                                if(grid[row][0]==point[0]) grid[row].push(point[1]);
                                if(grid[row][0]<point[0]) grid.splice(row,0,makeRow());
                            }
                            row++;
                        }
                    }
                    while(row<grid.length) grid[row++].push('');
                    function makeRow(){
                        var i, newRow = [point[0]];
                        for(i=1;i<grid[rows.X.header].length-1;i++) newRow.push('');
                        newRow.push(point[1]);
                        return newRow;
                    }

                }
                editorCols = setData.geographies.length + 1;
                $("#data-editor").removeAttr("data")
                    .handsontable({
                        data: grid,
                        minCols: editorCols
                    }).
                    find('table.htCore tr').show().filter(':eq('+rows.X.handle+')').hide().end().filter(':eq('+rows.X.geoid+')').hide();
                unmask();
            }
        }
    } else {
        require(requireModules, function(){seriesEditor(toEdit)});
    }
    function initializeSeriesEditor(){
        editorCols = 2;
        var lastRow= 0,lastCol=0;
        var $panel = $('div#edit-user-series').height($('div#local-series').height()).fadeIn();
        $editor = $("#data-editor").height($('div#local-series').height()-50).html('');
        $panel.find('button.series-edit-save').button({icons:{secondary:'ui-icon-disk'}}).off().click(function(){
            saveSeriesEditor();
        });
        $panel.find('button.series-edit-cancel').button({icons:{secondary:'ui-icon-close'}}).off().click(function(){
            closeSeriesEditor();
        });
        $panel.find('button.series-edit-preview').button({icons: {secondary: 'ui-icon-image'}}).off().click(function(){
            var arySeries = userSeriesFromEditor();
            if(arySeries) quickGraph(arySeries, false);
        });
        $panel.find('button.series-edit-geoset').button({icons:{secondary:'ui-icon-flag'}}).show().off().click(function(){
            showUserSetWizard();
        });
        $panel.find('button.series-edit-save-as').button({icons:{secondary:'ui-icon-copy'}});
        $editor.handsontable({
            minCols: 2,
            /*        rowHeaders: ["name","units","notes",1,2],
             colHeaders: ["date", "series 1", "series 2"],*/
            minSpareCols: -1,  //this allows the pasted changes to come through
            minSpareRows: 1, //always keep at least 1 spare row at the bottom
            autoWrapRow: true,
            contextMenu: ["row_above", "row_below", "col_right"],
            fillHandle: false,
            cells: function (row, col, prop) {
                var cellProperties = {};
                if ((row < rows[set[0]].header && col == 0)  || row == rows[set[0]].header) {
                    cellProperties.readOnly = true; //make cell read-only if it is first row or the text reads 'readOnly'
                }
                cellProperties.type = {renderer: handsOnCellRenderer};
                return cellProperties;
            },
            onSelection: function(r,c,r1,c1){
                if(r==r1&&c==c1){
                    var bgColor =  $($editor.handsontable('getCell', r, c)).css('background-color').toUpperCase();
                    if(bgColor=='RGB(224, 255, 255)'||bgColor=='#E0FFFF') $editor.handsontable('selectCell',r,c+1);
                    if(bgColor=='RGB(128, 128, 128)'||bgColor=='#808080') {
                        $editor.handsontable('selectCell',r+(lastCol==c&&(lastRow-r==1)?-1:1),c);
                    }
                    lastRow=r;lastCol=c;

                    if(r>4){ //not a header cell or the first data row (which has no preceeding date)
                        var myDate = $editor.handsontable('getDataAtCell', r, 0);
                        if(myDate==""||myDate==null){ //corresponding date cell is empty
                            var precedingDateEntry = ($editor.handsontable('getDataAtCell', r-1, 0)||'').toString();
                            if(precedingDateEntry.length>3){ //something is there.  Hopefully a valid MD date...
                                var precedingDate =  UTCFromReadableDate(precedingDateEntry);
                                if(precedingDate){  // UTCFromReadableDate returns false if it cannot decipher a date
                                    periodOfEdits = detectPeriodFromReadableDate(precedingDateEntry);
                                    if(periodOfEdits){
                                        $editor.handsontable('setDataAtCell', r, 0, formatDateByPeriod(nextDate(precedingDate,periodOfEdits),periodOfEdits));
                                    }
                                }
                            }
                        }
                    }
                }
            },
            onBeforeChange: function(changes){ //autoexpansion code for large pastes
                var maxCol = 0;
                for(var i=0;i<changes.length;i++){if(changes[i][1]>maxCol)maxCol=changes[i][1]}
                if(maxCol>=editorCols){
                    editorCols = maxCol+1;
                    $("#data-editor").handsontable('updateSettings', {"cols":editorCols});
                    for(i=2;i<editorCols;i++) $("#data-editor").handsontable('getCell', 3, i).innerHTML="value";
                }
                //validatePaste(changes);
            },
            onChange: function(changes, source){//autogen dates + delete empty col after last delete
                /*                if(source=="paste"||source=="edit"||source=="populateFromArray"){ //auto generate dates if needed
                 for(var i=0;i<changes.length;i++){
                 if(changes[i][0]>4){ //not a header cell or the first data row (which has no preceeding date)
                 var myDate = $editor.handsontable('getDataAtCell', changes[i][0], 0);
                 if(myDate==""||myDate==null){ //corresponding date cell is empty
                 var precedingDateEntry = $editor.handsontable('getDataAtCell', changes[i][0]-1, 0);
                 if(precedingDateEntry.length>3){ //something is there.  Hopefully a valid MD date...
                 var precedingDate =  UTCFromReadableDate(precedingDateEntry);
                 if(precedingDate){  // UTCFromReadableDate returns false if it cannot decipher a date
                 if(!periodOfEdits) periodOfEdits = detectPeriodFromReadableDate(precedingDateEntry);
                 if(periodOfEdits){
                 $editor.handsontable('setDataAtCell', changes[i][0], 0, formatDateByPeriod(nextDate(precedingDate,periodOfEdits),periodOfEdits));
                 }
                 }
                 }
                 }
                 }
                 }
                 }*/
                if(source=="edit"||source=="empty"){ //remove excess columns/rows
                    try{
                        var gridData = $editor.handsontable('getDataReference');
                        //check for empty columns
                        for(var c=gridData[0].length-1;c>1;c--){ //loop through columns right to left skipping the first two (date+first value column)
                            var totalChanges="";
                            for(var r=0;r<gridData.length;r++){
                                if(r!=3)totalChanges+=gridData[r][c]
                                if(nonWhitePattern.test(totalChanges)) break; //exit on first non-empty cell = fast
                            }
                            if(nonWhitePattern.test(totalChanges)) break; //exit main loop too
                            //empty right-most column found!!
                            $editor.handsontable('alter', 'remove_col', c, c+1); //remove it!!
                        }
                        //check for excess empty bottom rows
                        gridData = $editor.handsontable('getDataReference'); //get a fresh copy
                        for(var r=gridData.length-1;r>5;r--){  //loop through bottom heading up
                            var totalChanges="";
                            for(var c=0;c<gridData[0].length;c++){ //loop through all columns
                                if(r!=3)totalChanges+=gridData[r][c]
                            }
                            if(nonWhitePattern.test(totalChanges)) break; //exit main loop too
                            //empty bottomish row found!!
                            if(r<gridData.length-1) $editor.handsontable('alter', 'remove_row', r); //remove it if not absolute bottom!!
                        }
                    } catch(err){console.log(err)}

                }
            }
        });
        seriesEditorInitialised=true;
    }

    function handsOnCellRenderer(instance, td, row, col, prop, value, cellProperties){
        switch(set[0]){
            case 'U':
                Handsontable.TextCell.renderer.apply(this, arguments);
                if(row < rows.U.header && col == 0){
                    td.style.background = '#E0FFFF';
                    td.style.fontWeight = 'bold';
                }
                if(row == rows.U.header){
                    td.style.background = '#808080';
                    td.style.fontWeight = 'bold';
                }
                break;
            case 'M':
                Handsontable.TextCell.renderer.apply(this, arguments);
                if(row < rows.M.header){
                    if(col == 0){
                        td.style.background = '#E0FFFF';
                        td.style.fontWeight = 'bold';
                    } else {
                        if(col==1) {
                            td.colSpan = Math.min(5, editorCols -1);
                        } else {
                            $(td).addClass('hidden');
                        }
                    }
                }
                if(row == rows.M.header){
                    td.style.background = '#808080';
                    td.style.fontWeight = 'bold';
                }
        }
    }
    function seriesEditor(series){ //this is called if array of series object is to be edited
        if(!seriesEditorInitialised) initializeSeriesEditor();
        var data, i, $editor = $("#data-editor");
        $('button#series-edit-save').attr("disabled","disabled");
        if(series){
            //todo:  expand to edit all series passed in, not just the first
            var oSerie = series[0], handle = oSerie.handle;
            var type = handle[0];
            switch(type){
                case 'U':
                    $('button#series-edit-save').removeAttr("disabled");
                case 'S':
                    periodOfEdits = oSerie.period;
                    if(oSerie.data){
                        data = oSerie.data.split("||").sort();
                        for(i=0;i<data.length;i++){
                            data[i] = data[i].split("|");
                            data[i][0]=formatDateByPeriod(dateFromMdDate(data[i][0]).getTime(), oSerie.period);
                        }
                        data.unshift(["name", oSerie.name],["units",oSerie.units],["notes",oSerie.notes],["handle",oSerie.handle],["date","value"]);
                        $editor.attr("data",handle).handsontable("loadData", data);
                        $editor.find('table.htCore tr').show().filter(':eq('+rows.U.handle+')').hide();
                    } else {
                        var sids = [], usids=[];
                        if(handle.charAt(0)=="U")usids.push(parseInt(handle.substr(1))); else sids.push(parseInt(handle.substr(1)));
                        callApi({command:  'GetMashableData', sids:  sids, usids: usids},
                            function(jsoData, textStatus, jqXH){
                                //showSeriesInEditor()
                                oSerie.data = jsoData.series[handle].data;
                                oSerie.notes = jsoData.series[handle].notes;
                                var data = jsoData.series[handle].data.split("||").sort();
                                for(var i=0;i<data.length;i++){
                                    data[i] = data[i].split("|");
                                    data[i][0]=formatDateByPeriod(dateFromMdDate(data[i][0]).getTime(),oSerie.period);
                                }
                                data.unshift(["name", oSerie.name],["units",oSerie.units],["notes",oSerie.notes],["handle",oSerie.handle],["date","value"]);
                                $editor.attr("data",handle).handsontable("loadData", data);
                                $editor.find('table.htCore tr').show().filter(':eq('+rows.U.handle+')').hide();
                            }
                        );
                    }
                    break;
                /* case 'M':
                 callApi(
                 {command:"GetMapSets", mapsetids: [handle.substr(1)], map: map, modal: 'persist'},
                 function(jsoData, textStatus, jqXHR){
                 if(jsoData.mapsets[handle]){
                 var mapset = jsoData.mapsets[handle];
                 var oDates = {}, mapDates=[], jvmCode, mapDate;
                 callApi(
                 {command: 'GetMapGeographies', map: map},
                 function(jsoData, textStatus, jqXHR){
                 var data = [["map set"],["units"],["notes"],["geoid"],["handle"],["date"]];
                 for(i=0;i<mapDates.length;i++){ //write the left date list
                 data.push([formatDateByPeriod(mapDates[i].dt.getTime(), mapset.period)]);
                 }
                 for(var i=0;i<jsoData.geographies.length;i++){ //write the columns
                 data[rows.M.geoid].push(jsoData.geographies[i].geoid);
                 data[rows.M.name].push(jsoData.geographies[i].name);
                 if(mapset.data[jsoData.geographies[i].code]){ //map code matched one of the mapset's series
                 var j, k=0, serie = mapset.data[jsoData.geographies[i].code], point;
                 data[rows.M.handle][i+1] = serie.handle;
                 var serieData = serie.data.split('||');
                 for(j=0;j<mapDates.length;j++){
                 point = serieData[k].split(['|']);
                 if(k<serieData.length && point[0]==mapDates[j].s){
                 data[rows.M.header + j + 1].push(point[1]);
                 k++;
                 } else {
                 data[rows.M.header + j + 1].push('');
                 }
                 }

                 }

                 }
                 $editor.find('table.htCore tr').show().filter(':eq('+rows.M.handle+')').hide().end().filter(':eq('+rows.M.geoid+')').hide();
                 editorCols = jsoData.geographies.length + 1;
                 $("#data-editor").removeAttr("data").handsontable({
                 data: data,
                 minCols: editorCols
                 });
                 }
                 );
                 for(jvmCode in mapset.data){  //compute Mapdates while fetching GetMapGeographies
                 data = mapset.data[jvmCode].data.split('||');
                 for(i=0;i<data.length;i++){
                 oDates[data[i].split('|')[0]] = true;
                 }
                 }
                 for(mapDate in oDates){
                 mapDates.push({s: mapDate, dt: dateFromMdDate(mapDate)});
                 }
                 mapDates.sort(function(a,b){return a.dt.getTime() - b.dt.getTime()});
                 }
                 }
                 );*/
                default:
                    dialogShow('series editor','This option is not yet supported');
                    return;
            }
        }else {
            //no handle = new serie(s)
            $editor.handsontable("loadData", [["name", ""],["units",""],["notes",""],["handle","new"],["date","value"]]);
            $editor.find('table.htCore tr').show().filter(':eq('+rows.U.handle+')').hide();
            periodOfEdits = false;
        }
        $('div#edit-user-series').slideDown();
    }
    function showUserSetWizard(){
        showPanel();

        function showPanel(){
            var $panel, mapsAsOptions='', i;
            for(i=0;i<mapsArray.length;i++){
                mapsAsOptions += '<option value="'+mapsArray[i]+'">'+mapsArray[i]+'</option>';
            }
            var html = '<div id="setsWizard" style="width:330px;">'  //TODO: CSS entries
                +   '<h4>Create a set of series that can be mapped:</h4>'
                +   '<label><input name="setsWizardType" type="radio" value="M" checked /> as regions</label><br />'
                +   '<label><input name="setsWizardType" type="radio" value="X" /> as points (requires latitudes and longitudes)</label><br /><br />'
                +   '<select id="setsWizardMap" style="width: 300px;">'
                +     '<option value="nomap" class="nomap">select map</option>'
                +     mapsAsOptions
                +   '</select><br><br>'
                +   '<button class="right" id="setsWizardCancel">cancel</button><button class="right" id="setsWizardOk">OK</button>'
                + '</div>';
            $.fancybox(html,
                {
                    showCloseButton: false,
                    autoScale: true,  //($btn?false:true),
                    overlayOpacity: 0.5,
                    hideOnOverlayClick: false
                });
            $('#setsWizardMap').change(function(){
                if($(this).val()!='nomap'){
                    $('#setsWizardOk').button( "option", "disabled", false);
                    $(this).find('option[value=\'nomap\']').remove();
                }
            });
            $('#setsWizardOk').button({icons: {secondary: 'ui-icon-check'}, disabled: true}).click(function(){
                configureUserSet($('#setsWizardMap').val(),  $('#setsWizardMap').text(), $('input:radio[name=\'setsWizardType\']:checked').val());  //TODO: write configureUserSet routine!
                $.fancybox.close();
            });
            $('#setsWizardCancel').button({icons: {secondary: 'ui-icon-close'}}).click(function(){
                $.fancybox.close();
            });
        }
        function configureUserSet(map, mapName, type){  //type = [X|M] for pointset or mapset
            set = type;
            //1. if mapset: get maps's components from db
            // on callback:  separator (default ':') on top too + columns of: noneditable geoname headers
            // else pointset
            //2. clear and reconfigure grid with map name and editable set name and units name on top
            //2B. for pointsets:  columns of: noneditable geoname headers + editable green shaded cells for lat & lon
            //3. cell A1 = [name|map set| point set] will be
            if(type=='M') callApi({command: 'GetMapGeographies', map: map}, newUserMapSet);  //mapsets shown on callback
            else {
                var data = [["point set"],["units"],["notes"],["geoid"],["handle"],["date"]];
                for(var i=0;i<jsoData.geographies.length;i++){
                    data[rows.M.geoid].push(jsoData.geographies[i].geoid);
                    data[rows.M.name].push(jsoData.geographies[i].name);
                }
                $editor.find('table.htCore tr').show().filter(':eq('+rows.M.handle+')').hide().end().filter(':eq('+rows.M.geoid+')').hide();
                editorCols = jsoData.geographies.length + 1;
                $("#data-editor").removeAttr("data").handsontable({
                    data: data,
                    minCols: editorCols
                });
            }

        }
        function newUserMapSet(jsoData, textStatus, jqXH){
            var data = [["map set"],["units"],["notes"],["geoid"],["handle"],["date"]];
            for(var i=0;i<jsoData.geographies.length;i++){
                data[rows.M.geoid].push(jsoData.geographies[i].geoid);
                data[rows.M.header].push(jsoData.geographies[i].name);
            }
            $editor.find('table.htCore tr').show().filter(':eq('+rows.M.handle+')').hide().end().filter(':eq('+rows.M.geoid+')').hide();
            editorCols = jsoData.geographies.length + 1;
            $("#data-editor").removeAttr("data").handsontable({
                data: data,
                minCols: editorCols
            });
        }
    }
    function userSeriesFromEditor(){
        //build series and validate
        var $editor = $("#data-editor");
        $editor.handsontable('destroyEditor', false);  //exit cell edit mode and without reverting (ie. commit any edits)
        var gridData = $editor.data('handsontable').getData();
        var localSeriesindex= 1, userSeries = [];
        var uSerie, pointArray, seriesInfo, mdata, rowIndex = rows[set];
        var c, r, x, y, udt, hasData;
        for(c=1;c<gridData[0].length;c++){
            hasData = false;
            for(r=rows[set[0]].header+1;r<gridData.length;r++){ //does this column have any date?
                if(gridData[r][c]!==null && nonWhitePattern.test(gridData[r][c])){
                    if(set=='U' && (!nonWhitePattern.test(gridData[rows.U.name][c]) || (gridData[rows.U.name][c]===null) || !nonWhitePattern.test(gridData[rows.U.units][c]) || (gridData[rows.U.units][c]===null))){
                        dialogShow("Invalid Series","Name and units are required fields.");
                        return false;
                    }
                    hasData = true;
                    break; //exit on first non-empty cell = faster
                }
            }
            var headerRow;
            if(hasData) {   //don't try to save empty column
                switch(set[0]){
                    case 'M':
                        uSerie = {
                            handle: gridData[rows.M.handle][c],  //handles always blank unless editing existing user series
                            name: gridData[rows.M.name][1]+' - '+gridData[rows.M.header][c],
                            setname: gridData[rows.M.name][1],
                            units: gridData[rows.M.units][1],
                            notes: gridData[rows.M.geoid][c],
                            geoid: gridData[rows.M.geoid][c],
                            save_dt: new Date().getTime()
                        };
                        headerRow = rows.M.header;
                        break;
                    case 'X':
                        uSerie = {
                            handle: gridData[rows.X.handle][c],
                            name:gridData[rows.X.name][1] + ' ' + gridData[rows.M.header][c],
                            setname: gridData[rows.M.name][1],
                            units:gridData[rows.X.units][1],
                            notes:gridData[rows.X.notes][1],
                            geoid:gridData[rows.X.geoid][c],
                            lat:gridData[rows.X.lon][c],
                            lon:gridData[rows.X.lat][c],
                            save_dt: new Date().getTime()
                        };
                        headerRow = rows.X.header;
                        break;
                    default:
                        uSerie = {
                            handle: gridData[rows.U.handle][c],
                            name:gridData[rows.U.name][c],
                            units:gridData[rows.U.units][c],
                            notes:gridData[rows.U.notes][c],
                            save_dt: new Date().getTime()
                        };
                        headerRow = rows.U.header;
                        break;
                }
                if(!uSerie.handle){
                    uSerie.handle = 'L'+localSeriesindex++;
                }
                if(uSerie.name.length==0||uSerie.units.length==0){
                    dialogShow("Invalid Series","Name and units are required fields.");
                    return false;
                }
                pointArray=[];
                mdata = "";
                for(r=headerRow+1;r<gridData.length;r++){
                    if(gridData[r][c]!==null&&gridData[r][c].length>0){//if empty value, skip
                        if(isNaN(gridData[r][c]) && gridData[r][c].toLowerCase()!='null'){
                            dialogShow("Unreadable Values", "Value cells must be numbers, 'null', or blank.");
                            return false;
                        }
                        udt = UTCFromReadableDate(gridData[r][0]);
                        if(!udt){
                            dialogShow("Invalid Date Formats", "Valid date formats are required in the left column for non-empty values.");
                            return false;
                        }
                        pointArray.push({x:udt.getTime(),y:parseFloat(gridData[r][c])});
                    }
                }
                seriesInfo =  md_calcSeriesInfo(pointArray);
                pointArray.sort(function(a,b){return a.x - b.x});
                for(var datapoint in pointArray){
                    var xDate = new Date(pointArray[datapoint].x);
                    switch(seriesInfo.period){
                        case 'A':
                            mdata += ("||" + xDate.getUTCFullYear() + "|" + pointArray[datapoint].y);
                            break;
                        case 'W':
                        case 'D':
                            mdata += ("||" + xDate.getUTCFullYear() + ((xDate.getUTCMonth()<=9)?"0":"") + xDate.getUTCMonth() + ((xDate.getUTCDate()<=9)?"0":"") + xDate.getUTCDate() + "|" + pointArray[datapoint].y);
                            break;
                        case 'M':
                        case 'Q':
                        case 'SA':
                            mdata += ("||" + xDate.getUTCFullYear() + ((xDate.getUTCMonth()<=9)?"0":"") + xDate.getUTCMonth() + "|" + pointArray[datapoint].y);
                            break;
                        case 'N':
                            mdata += ("||" + xDate.getUTCFullYear() + ((xDate.getUTCMonth()<=9)?"0":"") + xDate.getUTCMonth() + ((xDate.getUTCDate()<=9)?"0":"") + xDate.getUTCDate() + " " + xDate.getUTCHours() + ":" + xDate.getUTCHours() + ":" + xDate.getUTCMinutes() + "|" + pointArray[datapoint].y);
                            break;
                    }
                }
                uSerie.data = mdata.substr(2);
                uSerie.period = seriesInfo.period;
                if(uSerie.data.trim().length>0){
                    userSeries.push(uSerie);
                    $.extend(uSerie, seriesInfo);
                }
            }
        }
        if(userSeries.length==0){
            dialogShow("No data","No date-value pairs found.");
            return false;
        }
        return userSeries;
    }
    function saveSeriesEditor(){
        var i, arySeries = userSeriesFromEditor();  //returns false if missing name or units or data
        //need to add geoid (of bunny for PointSets + setname)
        if(arySeries){
            callApi({command: "SaveUserSeries", series: arySeries, set: set, setname:arySeries[0].setname}, //set ie either 'U' or the handle of a mapset or pointset
                function(jsoData, textStatus, jqXH){
                    //add update MySeriesGrid on success
                    for(i=0;i<arySeries.length;i++){
                        if(arySeries[i].handle.substr(0,1)=='U' && arySeries[i].handle.substr(0,1)=='U'){  //update operation
                            //problems with the update on the manipulated cells.  Easier to delete and add.
                            dtMySeries.find('span.handle:contains('+arySeries[i].handle+')').each(function(){
                                if($(this).html()==arySeries[i].handle) dtMySeries.fnDeleteRow($(this).closest("tr").get(0));
                            });
                        }
                        //add to dataable and mySeries object
                        arySeries[i].handle = "U"+jsoData.series[i].usid;
                        arySeries[i].usid = jsoData.series[i].usid;
                        arySeries[i].mapsetid = jsoData.series[i].mapsetid;
                        arySeries[i].pointsetid = jsoData.series[i].pointsetid;
                        arySeries[i].graph = '';
                        arySeries[i].url = '';
                        arySeries[i].username = account.info.name || 'user';
                        arySeries[i].userid = account.info.userId || null;
                        dtMySeries.fnAddData(arySeries[i]);
                        oMySeries[arySeries[i].handle]=arySeries[i];  //over-write as needed
                    }
                }
            );
            closeSeriesEditor();
        }
        unmask();

    }
    function closeSeriesEditor(){
        var $de = $("#data-editor");
        $de.handsontable('destroy');  //handsontable does not support chaining
        $de.attr('style','overflow:scroll;');
        $('div#edit-user-series').fadeOut();
    }
}

/*
API SERIES BROWSE FUNCTIONS

    table#cat-chains
        tr
            td.cat-branch[.[expandable|.expanded]]
                div.[in-path|sibling] data=catid
                    span[.[ui-icon.browse-rolldown|ui-icon.ui-icon-stop]]
                    [a]cat name
                    span[.[ui-icon.browse-right|ui-icon.browsed-right]]

*/

function browseFromSeries(seriesId){ //initial chain-table build only
    callApi({command:'GetCatChains', sid: seriesId||0},function(jsoData, textStatus, jqXH){
        var chainCount = 0, i, maxHeight=0;
        var $chainTable = $('<table id="cat-chains">');
        //need to construct object tree structure from the rectangular recordset to effectively combine and sort chains
        var chainTree = {}, branch, nextLevel, parentid;
        console.log(jsoData.chains);
        for(var chain in jsoData.chains){ //chain is the category handle
            branch = chainTree;
            parentid = null;
            if(jsoData.chains[chain].length>maxHeight) maxHeight = jsoData.chains[chain].length; //each chain in chains contains an array of categories starting with the terminal descendant (same catid as the chain's handle)
            for(i=jsoData.chains[chain].length-1;i>=0;i--){ //start at the api root and work back to terminal descendant
                browsedCats[jsoData.chains[chain][i].catid] = jsoData.chains[chain][i];
                browsedCats[jsoData.chains[chain][i].catid].parentid = parentid; //root parentID is null
                if(parentid!==null){ //don't actually show the root cat
                    if(branch[jsoData.chains[chain][i].name]){
                        branch[jsoData.chains[chain][i].name].catProps.count++;  //essentially rowspan
                    } else {
                        branch[jsoData.chains[chain][i].name] = {catProps: jsoData.chains[chain][i]}; //initialize the category properties to be what comes out of the db
                        if(jsoData.chains[chain].length-1!=i)branch[jsoData.chains[chain][i].name].catProps.siblings=jsoData.chains[chain][i+1].children;
                        branch[jsoData.chains[chain][i].name].catProps.count = 1; //add to category properties the width or rowspan
                        branch[jsoData.chains[chain][i].name].catProps.parentid = parentid; //... and the parentid for future reference = 0 for top level categories = APIs
                    }
                    branch = branch[jsoData.chains[chain][i].name];  //branch climbs up the chainTree
                }
                parentid = jsoData.chains[chain][i].catid;  //the current category is the next level's parent
            }
            $chainTable.append('<tr></tr>');  //add a row for each chain = number of categories to which the browsed series belongs
            chainCount++;
        }
        //now that the chainTree object is created, make the table
        var terminated = false, $cell, props;
        var levelBranches = [], branchName, childless;
        for(branchName in chainTree){if(branchName!="catProps")levelBranches.push(chainTree[branchName])} //prime the tree climb
        while(!terminated){
            terminated = true;
            nextLevel= [];
            for(i=0;i<levelBranches.length;i++){

                //1. check if branch is terminated
                if(levelBranches[i]==null){
                    nextLevel.push(null);
                } else {  //2. if not: create cell, indicate not terminated. and provided new reference(s)
                    terminated = false;
                    childless=true;
                    for(branch in levelBranches[i]){
                        if(branch!="catProps"){ //catProps is mixed in with the children name (which is repeated it is catProps = awkward and inefficient!)
                            nextLevel.push(levelBranches[i][branch]);
                            childless=false;
                        }
                    }
                    if(childless) nextLevel.push(null);
                    props = levelBranches[i].catProps;
                    $cell = $('<td class="cat-branch'+(props.children>0?' expandable':'')+'" rowspan="'+props.count+'">'
                        + '<div class="in-path" data="'+ props.catid +'">'
                        + (props.siblings>1 && seriesId?'<span class="ui-icon browse-rolldown" title="show sibling categories"></span>':'')
                        + (parseInt(props.scount)>0?'<a title="Click to view the '+props.scount+' series in this category">'+ props.name+ ' (' + props.scount + ')</a>':'<span class="title">'+props.name+'</span>')
                        + (props.children>0?(childless?'<span class="ui-icon browse-right">show child categories</span>':'<span class="ui-icon browsed-right">child categories shown to right</span>'):'')
                        + '</div>'
                        + '</td>');
                    //$cell.find('.browse-rolldown').click(function(){showSiblingCats(this)});
                    //$cell.find('a').click(function(){publicCat($(this).closest('span.chain').attr('data'))});
                    //$cell.find('.browse-right').click(function(){showChildCats(this, $(this).attr('data'))});
                    $chainTable.find("tr:eq("+i+")").append($cell);
                }
            }
            levelBranches = nextLevel;
        }
/*        $chainTable.find('td.expandable').click(function(){
            var $td = $(this);
            if($td.hasClass('expandable')){
                showSiblingCats($td.find('span.chain'));
            }
        });*/
        $chainTable.click(chainTableClick);
        if($('#cloud-series:visible').length==1){
            $('div#browse-api').height($('#cloud-series').height()).width($('#cloud-series').width());
        }
        $('div#browse-api')
            .empty()
            .prepend('<span style="padding:5px;">Click below to expand sibling and child categories.  Categories containing series are shown as links.  Note that a series can be in more than one category.</span>'
            //+ '<button id="browse-reset">reset</button> '
            + '<button id="browse-close" class="right">close</button>')
            .append($chainTable)
            .fadeIn();
        //$('#browse-reset').button({icons: {secondary: 'ui-icon-arrowrefresh-1-s'}, disabled: true}).click(function(){browseFromSeries(seriesId);});
        $('#browse-close').button({icons: {secondary: 'ui-icon-close'}}).click(function(){browseClose();});
    });
}

function showSiblingCats(node){
    var catId, props, $tcat;
    var $div = $(node).closest('div');
    var $td = $div.closest('td');
    var isOpened = $div.find('span.ui-icon-stop').length==1;
    $tcat = $('#cat-chains'); //table
    $tcat.find('div.sibling').remove();  //remove siblings anywhere in table
    $tcat.find('.ui-icon.ui-icon-stop')
        .removeClass("ui-icon-stop")
        .addClass("browse-rolldown"); //revert the original cat's bullet with a roll-down
    var $tdOld = $tcat.find('td.expanded').removeClass('expanded').addClass("expandable");
/*        .remove('span.browse-right')
        .find('.ui-icon-stop').removeClass('ui-icon-stop')
        .end();*/
    if($tdOld.length==1 && $tdOld.html()=="") $tdOld.remove();
    if(isOpened)return; //don't fetch.  above code already removed the siblings

    catId = $td.addClass("expanded").removeClass("expandable").find('.browse-rolldown')
        .removeClass('browse-rolldown')
        .addClass('ui-icon-stop')
        .end().find('div').attr('data');
    var parent = browsedCats[browsedCats[catId].parentid];
    if(parent.childrenCats){
        buildSiblings(parent.childrenCats);
    } else {
        callApi({command: "GetCatSiblings", catid: catId}, function(jsoData, textStatus, jqXH){
            parent.childrenCats = [];
            for(var i=0;i<jsoData.siblings.length;i++){
                props = jsoData.siblings[i];
                parent.childrenCats.push(props.catid);
                if(!browsedCats[props.catid]) {
                    props.parentid = parent.catid;
                    browsedCats[props.catid] = props;
                }
            }
            buildSiblings(parent.childrenCats);
        });
    }
    function buildSiblings(siblings){
        var sibling, $newSibling;
        $div.find('browse-rolldown').removeClass('browse-rolldown').addClass('ui-icon-stop');
        for(var i=0;i<siblings.length;i++){
            sibling = browsedCats[siblings[i]];
            if(sibling.catid==catId){
                if(sibling.children>0){
                    $newSibling = $('<span class="ui-icon browse-right" title="show child categories" data="'+sibling.catid+'"></span>');
                    $newSibling.find('.browse-right').click(function(){showChildCats(this)});
                    $td.find("span.chain").append();
                }
            } else {
                $newSibling = $('<div class="sibling" data="'+sibling.catid+'">'
                    + ((sibling.children>0)?' <span class="ui-icon browse-right" title="show child categories">show children categories</span>':'' )
                    + '<span class="ui-icon ui-icon-stop"></span><span class="sibling">'
                    + (sibling.scount>0?'<a title="Click to view the '+sibling.scount+' series in this category">' + sibling.name +' (' + sibling.scount + ')</a>':sibling.name) + '</span>'
                    + '</div>');
                $newSibling.find('.browse-right').click(function(){showChildCats(this)});
                $td.append($newSibling);
            }
        }
    }
}

function showChildCats(node){
    var child, $currentTd;
    var parentId = $(node).closest('div').attr("data");
    if(browsedCats[parentId].childrenCats){
        buildChildren(browsedCats[parentId].childrenCats);
    } else {
        callApi({command: "GetCatChildren", catid: parentId}, function(jsoData, textStatus, jqXH){
            browsedCats[parentId].childrenCats = [];
            //console.info(jsoData.children);
            for(var i=0;i<jsoData.children.length;i++){
                child = jsoData.children[i];
                if(!browsedCats[child.catid]) {
                    child.parentid = parentId;
                    browsedCats[child.catid] = child;
                }
                browsedCats[parentId].childrenCats.push(child.catid);
            }
            buildChildren(browsedCats[parentId].childrenCats);
        });
    }
    function buildChildren(childrenCats){
        //rebuild the table root while fetching occurring, starting with clicked span working up
        var newTds='', nextCatId = parentId;

        while(browsedCats[nextCatId].parentid!==null){
            newTds = '<td class="cat-branch'+(browsedCats[nextCatId].children>0?' expandable':'')+'">'
                + '<div class="in-path">'
                + (browsedCats[nextCatId].siblings>0?'<span class="ui-icon browse-rolldown" title="show sibling categories"></span>':'')
                + (parseInt(browsedCats[nextCatId].scount)>0?'<a title="Click to view the '+browsedCats[nextCatId].scount+' series in this category" >' + browsedCats[nextCatId].name +' (' + browsedCats[nextCatId].scount + ')</a>':browsedCats[nextCatId].name)
                + '<span class="ui-icon browsed-right">child categories shown to right</span>'
                + '</div></td>'
                + newTds;
            nextCatId = browsedCats[nextCatId].parentid;
        }
        var $chainTable = $('#cat-chains').html("<tr>"+newTds+"</tr>");
        $chainTable.find('span.browse-rolldown').click(function(){showSiblingCats(this)});
        $currentTd = $('<td class="chain expanded"></td>');
        for(var i=0;i<childrenCats.length;i++){
            child = browsedCats[childrenCats[i]];

            $currentTd.append('<div data="' + child.catid + '">'
                + ((child.children>0)?' <span class="ui-icon browse-right" data="'+child.catid+'" title="show child categories"></span>':'' )
                + '<span class="ui-icon ui-icon-stop"></span>'
                + (parseInt(child.scount)>0?'<a title="Click to view the '+child.scount+' series in this category" >' + child.name +' (' + child.scount + ')</a>':child.name)
                + '</div>');
        }
        $chainTable.find('tr').append($currentTd);
        //$("button.browse-reset").button("enable");
       /* $chainTable.find('td.expandable').click(function(){
            var $td = $(this);
            if($td.hasClass('expandable')){
                showChildCats(this, $td.find('span.chain').attr('data'));
            }
        });*/
    }

}

function publicCat(catId){
    searchCatId = catId; //global var. reset on filter change
    hasher.replaceHash(panelHash()); //set the hash using the global searchCatID, which is then interpreted by the has listener parseHash()
}

function chainTableClick(evt){//unified click event = detect which object clicked and execute accordingly
    var target = evt.target;
    switch(target.nodeName){
        case 'A':  //
            publicCat($(target).closest('div').attr('data'));
            break;
        case 'TD':
            var children = $(target).children('DIV');
            if(children.length!=1) return; //only fall through to general DIV&SPAN handler if single DIV in TD
            target = $(children).get(0);
        case 'DIV':  // in-path | sibling
        case 'SPAN': // browse-right | browsed-right | browse-rolldown | ui-icon-stop
            if($(target).hasClass('browse-right')) return showChildCats(target); //expand and exit click handler
            if($(target).hasClass('browsed-rolldown')) return showSiblingCats(target); //
            var $div = $(target).closest('div');
            if($div.find('span.browse-right').length==1) return showChildCats(target);  //this order prioritizes showing children over showing siblings!
            if($div.find('span.browse-rolldown').length==1) return showSiblingCats(target);
            break; //nothing found at this point
    }
}


function browseClose(){
    $('div#browse-api').fadeOut(function(){$(this).empty()});
    //$('div#cloudSeriesTableDiv').fadeIn();
}

//USER ACCOUNT FUNCTIONS
function getUserId(){ //called by window.fbAsyncInit after FaceBook auth library loads and determines that user is authenticated
    if(account.loggedIn()) return account.info.userId;
    if(account.fb_user){
        var params = {
            'command':	'GetUserId',
            'authmode': 'FB',
            'username': account.fb_user.id,
            'name':  account.fb_user.name,
            'email':	account.fb_user.email,
            'company':	'',
            'accesstoken': account.fb_user.accessToken
        };
        $.ajax({type: 'POST',  //cannot use CallAPI -> infinite loop
            url: "api.php",
            data: params,
            dataType: 'json',
            success: function(md_getUserId_results, textStatus, jqXH){
                if(md_getUserId_results.status=='ok'){
                    console.info('GetUserId success');
                    $.extend(account.info, account.fb_user, md_getUserId_results);  //no further action required (assumes success)
                    //account.info.userId = account.info.userid;  //smoe capitalization problems coming out of the db
                    if(account.info.orgId&&account.info.orgName){$("#series_search_source").append('<option value="org">'+account.info.orgName+'</option>')};
                    $('#menu-account').find('.ui-button-text').html(account.info.name);
                    syncMyAccount();
                    if(account.subscribing) account.showSubscribe();
                } else {
                    console.log(md_getUserId_results);
                    dialogShow("Login Status", md_getUserId_results.status);
                }
            },
            error: function(results, textStatus, jqXH){
                console.log(results)
            }
        });
        return false;
    }
    return null;
}
function syncMyAccount(){ //called only after loggin and after initial report of new series
// 1. save local series
    var handle, oldHandle, newHandle, serie;
    //1A.look for localseries (handle prefixed with "L")
    var adddt = new Date();
    var params = {command: 'UploadMyMashableData', adddt: adddt.getTime(), series: []};
    for(handle in oMySeries){
        if(handle[0]=='L'){
            params.series.push(oMySeries[handle]);
        }
    }
    //1B.  local series found -> save to server
    if(params.series.length>0){
        callApi(params, function(results, textStatus, jqXH){
            for(oldHandle in results.handles){
                //1C. update oMySeries, mySeries table, and in any graphs and graph assets
                newHandle = results.handles[oldHandle]
                serie = oMySeries[oldHandle];
                serie.handle = newHandle;
                serie.sid = newHandle.substr(1);

                delete oMySeries[oldHandle];
                oMySeries[newHandle] = serie;

                //$('#series-table').find("td.quick-view button[data='"+oldHandle+"']").attr('data',serie.handle);

                for(tab in panelGraphs){
                    updateHandles(panelGraphs[tab],oldHandle, serie);
                }
                for(var graph in oMyGraphs){
                    updateHandles(oMyGraphs[graph], oldHandle, serie);
                }
            }
            getMySeries();  //if uploading series, ensure this happens after they are registered on My Series (note: modal is persisted)
        });
    } else {
        getMySeries();
    }

    function updateHandles(graph, oldHandle, serie){
        var i;
        if(graph.assets){
            if(graph.assets[oldHandle]){
                delete graph.assets[oldHandle];
                graph.assets[serie.handle] = serie;
            } else {
                return;
            }
        }
        eachComponent(graph, function(){if(this.handle==oldHandle) this.handle = serie.handle});
    }

// note: series cleared from localStorage when they were read


//  B. My Graphs
    console.info("syncMyAccount run");
    callApi({'command':	'GetMyGraphs'},  //modal is closed
        function(results, textStatus, jqXH){
            for(var key in results.graphs){
                oMyGraphs[key]=results.graphs[key];
                grapher.inflateGraph(oMyGraphs[key]);
                dtMyGraphs.fnAddData(oMyGraphs[key]);
            }
        }
    );
}

function getMySeries(){
    callApi({'command':	'GetMySeries', modal:"persist"},
        function(results, textStatus, jqXH){
            var series=[];
            for(var sHandle in results.series){
                /*                if(oMySeries[sHandle]){
                 var trSeries = dtMySeries.find("button[data='" + sHandle + "']").closest('tr').get(0);
                 //dtMySeries.fnUpdate(oMD, trSeries); < problem will the delete cell.   easrier just to delete and add
                 dtMySeries.fnDeleteRow(trSeries);
                 }*/
                results.series[sHandle].save_dt = parseInt(results.series[sHandle].save_dt)
                oMySeries[sHandle] = results.series[sHandle]; //if exists, it will be overwritten with new data
                series.push(results.series[sHandle]);  //takes an array or object, not an object
            }
            dtMySeries.fnClearTable();
            dtMySeries.fnAddData(series);
        }
    );
}
function saveGraph(oGraph, callback) {
//first save to db and than to dtMyGraphs and oMyGraphs once we have a gid
    if(oGraph.gid){
        oGraph.updatedt = (new Date()).getTime();
    } else {
        oGraph.createdt = (new Date()).getTime();
    }
    //create/update the series list
    oGraph.serieslist = [];
    eachComponent(oGraph, function(){oGraph.serieslist.push(oGraph.assets[this.handle].name)});
    oGraph.serieslist = oGraph.serieslist.join('; ');


    var assets = oGraph.assets; //no need to send up the data ("plots" objects contains all the selection and configuration info)
    var calculatedMapData = oGraph.calculatedMapData; //ditto
    var controls = oGraph.controls; //ditto
    delete oGraph.assets; //temporarily remove after making local reference
    delete oGraph.calculatedMapData; //ditto
    delete oGraph.controls; //ditto

    var params = {command: 'ManageMyGraphs'};
    var o = {}, nonTransmit = ['assts'];
    $.extend(true, params, oGraph);
    params.annotations = serializeAnnotations(oGraph);  // over write array of object with a single serialized field
    params.mapconfig = $.stringify(oGraph.mapconfig);
    var plot, comp;
    eachPlot(params, function(){
        this.options = $.stringify(this.options);
        $.each(this.components, function(){
            this.options = $.stringify(this.options);
        });
    });

    oGraph.assets = assets; //restore objects temporarily removed from oGraph
    oGraph.calculatedMapData = calculatedMapData;
    oGraph.controls = controls;

    callApi(params,
        function(jsoData, textStatus, jqXH){
            //first find to whether this is a new row or an update
            oGraph.gid = jsoData.gid; //has db id and should be in MyGraphs table...
            oGraph.ghash = jsoData.ghash;
            oGraph.isDirty = false;
            delete oGraph.assets; //but don't copy the potentially very large assets.   unattach and reattech instead
            delete oGraph.calculatedMapData; //ditto
            delete oGraph.controls; //ditto
            var objForDataTable = $.extend(true,{from: "", to: ""}, oGraph);
            oGraph.assets = assets; //restore objects temporarily removed from oGraph
            oGraph.calculatedMapData = calculatedMapData;
            oGraph.controls = controls;
            objForDataTable.updatedt = new Date().getTime();
            if(('G' + oGraph.gid) in oMyGraphs){
                var trMyGraph;
                trMyGraph = $(dtMyGraphs).find('span.handle[data=G' + oGraph.gid + ']').closest('tr').get(0);
                dtMyGraphs.fnUpdate(objForDataTable, trMyGraph);
            } else {
                dtMyGraphs.fnAddData(objForDataTable);
            }

            oMyGraphs['G'+oGraph.gid]=objForDataTable;
            panelGraphs[visiblePanelId()] =  oGraph;
            if(callback) callback();
        }
    );
}
function serializeAnnotations(mdGraph){  //called by saveGraph.  Couldn't use stringify because of logic
    var serialized = '[';
    for(var i=0;i<mdGraph.annotations.length;i++){
        serialized += '{"type":"' + mdGraph.annotations[i].type + '",';
        if(mdGraph.annotations[i].type=='point')serialized += '"series":"' + mdGraph.annotations[i].series + '",';
        if(mdGraph.annotations[i].type.substring(0,1)=='h')serialized += '"yAxis":"' + mdGraph.annotations[i].yAxis + '",';
        serialized += '"color":"' + mdGraph.annotations[i].color + '",';
        serialized += '"from":"' + mdGraph.annotations[i].from + '",';
        if(mdGraph.annotations[i].type.indexOf('band')>-1)serialized += '"to":"' + mdGraph.annotations[i].to + '",';
        serialized += '"text":"' + mdGraph.annotations[i].text + '"}';
        if(i<mdGraph.annotations.length-1)serialized += ',';
    }
    return serialized + ']';
}
//TODO:  updateMySeries should be eliminated because either token will provide direct access to user account or MD will wait until user is logged in to load to cloud
function updateMySeries(oSeries){   //add or deletes to MySeries db
    if(notLoggedInWarningDisplayed()) return false;
    callApi({
            command:	'ManageMySeries',
            modal: "none",
            jsts: oSeries.save_dt,
            handle:  oSeries.handle,
            to:		oSeries.save  //"H" for history, "S" for saved, null to remove
        },
        function(results, textStatus, jqXH){}
    );
}

function addMySeriesRow(oMD){  //add to table and to oMySeries
    //TODO:  need to update existing panelGraphs if update.  Note new oPanelGraph objects should always be created using the freshest oMySeries.');
    if(oMD.handle){
        if(oMD.save_dt) oMD.save_dt = parseInt(oMD.save_dt);
        if(oMySeries[oMD.handle]){
            //still need to check if it is a row.  There are lots of things in the oMySeries trunk...
            var $trSeries = dtMySeries.find("button[data='" + oMD.handle + "']").closest('tr');
            if($trSeries.length==1){
                //dtMySeries.fnUpdate(oMD, trSeries); < problem will the delete cell.   easrier just to delete and add
                dtMySeries.fnDeleteRow($trSeries.get(0));
            }
        }
        dtMySeries.fnAddData(oMD);
        oMySeries[oMD.handle] = oMD; //if exists, overwrite with new
    } else {
        console.log("Error loading series object: invalid series handle.")
    }
    return oMD.handle;
}

function md_calcSeriesInfo(PointArray){
    var oSeriesInfo = {
        firstdt: null,
        lastdt: null,
        minValue: null,
        maxValue: null,
        period: 'A',
        points: PointArray.length
    };
    var dayOfMonth = null;
    var dayOfWeek = null;
    var monthOfYear = null;
    var timeOfDay = null;
    var xDateTime;
    if(oSeriesInfo.points==1){ //Annual assumed
        xDateTime = new Date(PointArray[0].x);
        if(xDateTime.getUTCMonth()!=0) oSeriesInfo.period = 'M';
        if(xDateTime.getUTCDate()!=1) oSeriesInfo.period = 'D'; //no way to distinguish daily from weekly
        if(xDateTime.getUTCHours()+xDateTime.getUTCMinutes()+xDateTime.getUTCSeconds()!=0) oSeriesInfo.period = 'T';
    } else {
        for(var pointIndex=0;pointIndex<oSeriesInfo.points;pointIndex++){
            //console.info(pointIndex);
            var thisPoint = PointArray[pointIndex];
            if(oSeriesInfo.firstdt == null || oSeriesInfo.firstdt > thisPoint.x) oSeriesInfo.firstdt = thisPoint.x;
            if(oSeriesInfo.lastdt == null || oSeriesInfo.lastdt < thisPoint.x) oSeriesInfo.lastdt = thisPoint.x;
            if(oSeriesInfo.minValue == null || oSeriesInfo.minValue > thisPoint.y) oSeriesInfo.minValue = thisPoint.y;
            if(oSeriesInfo.maxValue == null || oSeriesInfo.maxValue < thisPoint.x) oSeriesInfo.maxValue = thisPoint.y;
            xDateTime = new Date(thisPoint.x);
            //console.info(xDateTime);
            if(timeOfDay == null){timeOfDay = xDateTime.getUTCHours() + ":" +  xDateTime.getUTCMinutes() + ":" +  xDateTime.getUTCSeconds() + "." + xDateTime.getUTCMilliseconds()}
            else if(timeOfDay !== true && timeOfDay != xDateTime.getUTCHours() + ":" +  xDateTime.getUTCMinutes() + ":" +  xDateTime.getUTCSeconds() + "." + xDateTime.getUTCMilliseconds()){timeOfDay = true}
            if(dayOfMonth == null){dayOfMonth = xDateTime.getUTCDate()}
            else if(dayOfMonth !== true && dayOfMonth != xDateTime.getUTCDate()){dayOfMonth = true}
            if(dayOfWeek == null){dayOfWeek = xDateTime.getUTCDay()}
            else if(dayOfWeek !== true && dayOfWeek != xDateTime.getUTCDay()){dayOfWeek = true}
            if(monthOfYear == null){monthOfYear = xDateTime.getUTCMonth()}
            else if(monthOfYear !== true && monthOfYear != xDateTime.getUTCMonth()){monthOfYear = true}
        }
        if(timeOfDay === true) {oSeriesInfo.period = 'T'}
        else if(dayOfWeek !== true) {oSeriesInfo.period = 'W'}
        else if(dayOfMonth === true) {oSeriesInfo.period = 'D'}
        else if(monthOfYear === true) {oSeriesInfo.period = 'M'}
        else {oSeriesInfo.period = 'A'}
    }


    return oSeriesInfo
}

//GRAPHING FUNCTIONS (note:  most graphing routines are in graph.js)

function deleteMySeries(){  //remove all series in quickView from users MySeries
    //$quickViewRows array is only filled when previewing MySeries
    var obj;
    dialogShow("confirm deletion",
        dialogues.deleteMySeries,
        [
            {text: 'delete',id:'btn-delete',
                click:  function() {
                    for(var i=0;i<$quickViewRows.length;i++){
                        obj = dtMySeries.fnGetData($quickViewRows.get(i));
                        if(account.loggedIn()){
                            obj.save = null;
                            updateMySeries(obj);  //delete from DB
                        }
                        delete oMySeries[obj.handle];
                        dtMySeries.fnDeleteRow($quickViewRows.get(i));
                    }
                    $(this).dialog('close');
                    quickViewClose();
                }
            },
            {text: 'cancel',id:'btn-cancel',click:  function() {$(this).dialog('close');}}
        ]
    );
}

// actual addTab function: adds new tab using the title input from the form above.  Also checks and sets the edit graph button
function addTab(title) {
    var tab_title =  (title.length==0)?'Graph '+tab_counter:title;
    var panelId = 'graphTab'+tab_counter++;
    var newTab = $graphTabs.tabs('add', '#'+panelId, tab_title);
    $('#'+panelId).addClass('graph-panel');
    //this causes problem when deleting tabs
    $( "#canvas" ).tabs().find( ".ui-tabs-nav" ).sortable({ axis: "x", distance: 10  });
    $graphTabs.tabs('select', $graphTabs.tabs('length') - 1);
    $(".ui-tabs-selected a").each(function(){$(this).attr("title", $(this).html())});
    resizeCanvas();
    $("#btnEditGraphTop").removeAttr("disabled");
    if($("#delete-my-series").attr("disabled")!="disabled"){
        $("button.add-to-graph").removeAttr("disabled");
    }
    //in revised layout, show only if graph tabs and search tables are shown  $("#show-hide-pickers").show();
    $('#graph-tabs a:last').click(function(){
        hideGraphEditor()
    });
    return panelId;
}
//run when a graph tab is deleted.  Also checks and sets the edit graph button and global variable
function removeTab(evt){
    var $span = $(evt.target);
    var panelRef = $span.parent().children("a").attr("href");
    var panelId = panelRef.substr(1);
    destroyChartMap(panelId);
    $(panelRef).remove();
    $span.parent().remove();
    delete panelGraphs[panelId];
    $graphTabs.tabs('refresh'); //tell JQUI to sync up
    if($graphTabs.find("li").length == 0){
        editingPanelId = null; //dissociate the chart from the this edit session
        $("#btnEditGraphTop").attr("disabled","disabled");
        $("button.add-to-graph").attr("disabled","disabled");
        lastTabAnchorClicked.click();
    } else  {
        $('#graph-tabs a:last').click();
    }
    $("#graph_title").attr('value','');
}

function destroyChartMap(panelId){
    if(panelGraphs[panelId] && panelGraphs[panelId].controls){
        var controls = panelGraphs[panelId].controls;
        if(controls.chart){
            controls.chart.destroy();
            delete controls.chart;
            $.contextMenu('destroy', '#' + panelId + ' div.chart');
        }
        if(controls.map){
            controls.map.remove();
            delete controls.map;
        }
        if(controls.vizChart){
            controls.vizChart.destroy();
            delete controls.vizChart;
        }
    }
}

function synthesizeTitle(titles){
    var synTitle = [];
    if(titles.length == 1){return(titles[0])}
    if(titles.length == 0){return("")}
    firstTitleWords = titles[0].split(" ");
    for(var i=0;i<firstTitleWords.length;i++){
        var bFoundInAll = true;
        for(var j=1;j<titles.length;j++){
            var searchIn = " " + titles[j] + " ";
            if(searchIn.indexOf(" " + firstTitleWords[i] + " ") == -1){
                bFoundInAll = false;
                break;
            }
        }
        if(bFoundInAll){synTitle.push(firstTitleWords[i])}
    }
    return(synTitle.join(" "));
}

function pickerPanel(anchorClicked){
    lastTabAnchorClicked = anchorClicked;
    var panelToDeactive = $("#series-tabs li.ui-tabs-selected").removeClass("ui-tabs-selected ui-state-active").find("a").attr("data");
    var panelToActivate = $(anchorClicked).attr("data");
    $(anchorClicked).parent().addClass("ui-tabs-selected ui-state-active");
    $(panelToDeactive).hide();
    $(panelToActivate).show().find(".dataTables_filter input,#series_search_text,#graphs_search_text").get(0).focus();
    setPanelHash();
    return false;
}

function panelHash(){
    var $search, picker = $("#series-tabs li.ui-tabs-selected a").attr('data'), gi='grey-italics';
    switch(picker){
        case '#local-series':
            $search = $('#series-table_filter input');
            return encodeURI('t=ms'+($search.hasClass(gi)?'':'&s='+$search.val()));
        case '#cloud-series':
            if(searchCatId!=0){
                return encodeURI('t=cs&cat='+searchCatId);
            } else {
                $search = $('#series_search_text');
                return encodeURI('t=cs'+($search.hasClass(gi)?'':'&s='+$search.val()+'&f='+$('#series_search_periodicity').val())+'&api='+$('#series_search_source').val()+'&sets='+$('#public-mapset-radio').find('input:checked').val());
            }
        case '#myGraphs':
            $search = $('#my_graphs_table_filter input');
            return encodeURI('t=mg'+($search.hasClass(gi)?'':'&s='+$search.val()));
        case '#publicGraphs':
            $search =$('#public_graphs_search input');
            return encodeURI('t=cg'+($search.hasClass(gi)?'':'&s='+$search.val()));
        default:
            var visiblePanel = visiblePanelId();
            if(visiblePanel && panelGraphs[visiblePanel]){
                return encodeURI('t=g'+visiblePanel.substr(8)+(panelGraphs[visiblePanel].ghash?'&graphcode='+panelGraphs[visiblePanel].ghash:''));
            }
    }
}
function setPanelHash(ghash, graphTabId){  //optionally, pass in known values rather than detecting = fix for delays in visability
    if(ghash){
        hash = 't=g'+graphTabId.replace('graphTab','')+'&graphcode='+ghash;
    } else {
        var hash = panelHash();
    }
    if(hash && hasher.getHash()!=hash) {
        if(hasher.getHash().search('t=g&graphcode=')==-1){
            setHashSilently(hash);
        } else {
            hasher.replaceHash(hash);
        }
    }
}

function notLoggedInWarningDisplayed(){
    if(!account.loggedIn()){
        $('#dialog').html('<span><p>You must be signed in to use this function.  You can sign into MashableData.com with your Facebook account.  (Google+ account federation coming soon!)</p>'
            + '<p>Logging in does <em>not</em> grant MashableData automatic access to your email or to post to your account.</p>' //  Using Facebook\'s secure <a href="http://developers.facebook.com/docs/authentication/" target="_blank">authorization service</a> means neither of us has to remember yet another username and password.</p>'
            + '</span><br>');

        $dialog = $('#dialog').dialog({
            modal: true,
            title: "Sign in required",
            width: 500,
            buttons: [
                {
                    text: 'Close',
                    id:'btn-dia-close',
                    click:  function() {
                        $(this).dialog('close');
                    }
                }
            ],
            open: function() {
                $("#btn-dia-close").focus();
            },
            close: function() {
            }
        });
        $('.ui-dialog-titlebar-close').remove();
    }
    return  (!account.loggedIn());
}
function callApi(params, callBack){ //modal waiting screen is shown by default. params.modal option can modify this behavior
    if(params.modal!='none')mask();
    $.ajax({type: 'POST',
        url: "api.php",
        encoding:"UTF-8",
        data:$.extend({uid: getUserId(), version: workbenchVersion, accessToken: account.info.accessToken}, params),
        dataType: 'json',
        success: function(jsoData, textStatus, jqXHR){
            if(jsoData.status=="ok"){
                totalServerTime += parseFloat(jsoData.exec_time);
                console.info(params.command+': '+jsoData.exec_time+' (total server time: '+totalServerTime+'ms)');
                callBack(jsoData, textStatus, jqXHR);
                if(params.modal!='persist')unmask();
                if(jsoData.msg) dialogShow('', jsoData.msg);
            } else {
                unmask();
                dialogShow('Connected to server, but the command failed.', jsoData.status+'<br><br>If this is a system error and continues to occur, please email <a href="mailto:support@mashabledata.com">support@mashabledata.com</a>.');
            }
        },
        error: function(jqXHR, textStatus, errorThrown){
            unmask();
            dialogShow(textStatus, "A system error occurred while trying to connect to the server.  Check your internet connectivity and try again later.");
            console.log(textStatus);
            console.log(jqXHR);}
    });
}
//function unmask(){$("div#modal").hide();}
function unmask(){
    $("#wrapper").unmask()
}
function mask(msg){
    $("#wrapper").mask(msg||"Loading...");
}

function detectPeriodFromReadableDate(dateString)       {
    var pat = /^\s*[0-9]{4}\s*$/i;
    if(pat.test(dateString)) return  "A";

    pat = /^\s*[0-9]{4}[ -]{1}[0-2]{0-1}[0-9]{1-2}\s*$/i;
    if(pat.test(dateString)) return  "M";
    pat = /^\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[ -]{1}[0-9]{4}\s*$/i;
    if(pat.test(dateString)) return  "M";
    pat = /^\s*[0-9]{4}[ -]{1}(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*$/i;
    if(pat.test(dateString)) return  "M";

    pat = /^\s*[0-9]{4}\s*$/i;
    if(pat.test(dateString)) return  "D";

    pat = /^\s*W[0-5]{0-1}[0-9]{1} [0-9]{4}\s*$/i;
    if(pat.test(dateString)) return  "W"; //unable to detect weekly

    pat = /^Q[1-4]{1}\s[0-9]{4}/i;
    if(pat.test(dateString)) return  "Q";

    pat = /^H[1-2]{1}\s[0-9]{4}/i;
    if(pat.test(dateString)) return  "H";
    return false; //no valid date format detected
}

function UTCFromReadableDate(dateString){
    var pat, dt = new Date(dateString + " UTC");  //this should work for year, month, day, and hours
    if(dt.toString()!="NaN")return dt;
    pat = /^W[0-5]{0-1}[0-9]{1}\s[0-9]{4}/i;
    if(pat.test(dateString)){
        dt = new Date(parseInt(dateString.substr(3))+' UTC');
        return dt.setUTCMonth((parseInt(dateString.charAt(1))-1)*3);
    }
    //quarter?
    pat = /^Q[1-4]{1}\s[0-9]{4}/i;
    if(pat.test(dateString)){
        dt = new Date(parseInt(dateString.substr(3))+' UTC');
        return dt.setUTCMonth((parseInt(dateString.charAt(1))-1)*3);
    }
    pat = /^H[1-2]{1}\s[0-9]{4}/i;
    if(pat.test(dateString)){
        dt = new Date(parseInt(dateString.substr(3))+' UTC');
        return dt.setUTCMonth((parseInt(dateString.charAt(1))-1)*6);
    }
    return false;
}

function nextDate(dt, period){ //return a Javascript date object
    switch(period){
        case 'A': return dt.setUTCFullYear(dt.getUTCFullYear()+1);
        case 'Q': return dt.setUTCMonth(dt.getUTCMonth()+3);
        case 'SA': return dt.setUTCMonth(dt.getUTCMonth()+6);
        case 'M': return dt.setUTCMonth(dt.getUTCMonth()+1);
        case 'W': return dt.setUTCDate(dt.getUTCDate()+6);
        case 'D': return dt.setUTCDate(dt.getUTCDate()+1);
        default: return null;
    }
}


//GRAPH AND MAP FUNCTIONS only used by WORKBENCH (not needed for embedded graph)

function makeSlickDataGrid(grid, panelId, $dataPanel){
    mask('creating grid');
    var type = $dataPanel.attr('data');
    var $container = $dataPanel.find('.slick-holder');
    if(grid) grid.destroy();  //allow show one SG at a time = too much for browsers to handle
    var graph = panelGraphs[panelId];
    var options = {
        enableCellNavigation: true,
        enableColumnReorder: false,
        defaultColumnWidth: 200,
        headerRowHeight: 100
    };
    switch(type){
        case 'chart':
            var chartDataObject = gridDataForChart(panelId);
            grid = new Slick.Grid($container, chartDataObject.rows, chartDataObject.columns, options);
            break;
        case 'regions':
            grid = new Slick.Grid($container, graph.calculatedMapData.regionGrid.data, graph.calculatedMapData.regionGrid.columns, options);
            break;
        case 'markers':
            grid = new Slick.Grid($container, graph.calculatedMapData.markerGrid.data, graph.calculatedMapData.markerGrid.columns, options);
            break;
    }
    unmask();
}

function gridDataForChart(panelId){  //create tables in data tab of data behind the chart, the map regions, and the map markers
    console.time("gridDataForChart");
    var p, c, plot, component, d, row, compData, serie, jsdt, mdPoint, readableDate, mdDate, found, r, pnt;
    var oGraph = panelGraphs[panelId];
    var assets = oGraph.assets;
    var region;
    if(oGraph.plots){
        var chart = oGraph.controls.chart;
    } else {
        throw "Chart does not exist; cannot make grid objects";
    }
    /*
     strategy:
     1.  separate slick grids (tabs) for chart, map regions, map markers
     2.  build array of arrays on the fly, each plot at a time
     2.  each row contains the full set of assets and calculated data
     3.  header:  name, units, symbol, source
     4.  skip the calculated column when formula = A & no unit or name changes
     5.  insert row where date DNE
     */

    //create a structure to put all data and results into
    var plotId, colId, rows = [];
    var  columns = [{
        id: 'date',
        field: 'date',
        name: 'name:<br>'      //name of component or plot (plot names are bolded); component column removed if straight through plot
            + 'units:<br>'
            + 'source:<br>'
            + 'notes:<br>'
            + 'region code:<br>' //row deleted if empty at func end
            + 'lat, lon:<br>'  //row deleted if empty at func end
            + 'formula:',
        cssClass: 'grid-date-column'
    }];
    for(p=0;p<oGraph.plots.length;p++){
        plot = oGraph.plots[p];
        plotId = 'P'+p;
        serie = chart.get(plotId);
        var showComponentsAndPlot = (plot.options.formula && plot.options.formula.formula.length>1) || (plot.formula && plot.formula.formula.length>1) || plot.options.units || plot.options.name;
        for(c=0;c<plot.components.length;c++){
            colId = 'P'+p+'-C'+c;
            component = assets[plot.components[c].handle];
            columns.push({
                    id: colId,
                    field: colId,
                    name:'<b>' + component.name + '</b><br>'
                        + (component.units||'') + '<br>'
                        + (component.src||'') + '<br>'
                        + (component.notes||'') + '<br>'
                        + (component.iso3166||'') + '<br>'
                        + (component.lat ? component.lat + ', ' + component.lon : '') + '<br>'
                        + '<br>component '+compSymbol(c),
                    cssClass: 'grid-series-column'}
            );


            //loop through the data, adding rows for new dates as needed and then setting the column values
            compData = component.data.split('||');
            for(d=0;d<compData.length;d++){
                mdPoint = compData[d].split('|');
                jsdt = dateFromMdDate( mdPoint[0]);
                readableDate = formatDateByPeriod(jsdt.getTime(), serie.options.period);
                if((!oGraph.start || oGraph.start<=jsdt) && (!oGraph.end || oGraph.end>=jsdt)){
                    //search to see if this date is in rows
                    for(found=false, r=0;r<rows.length;r++){ //see if date row exists, else add
                        if(rows[r].id == mdPoint[0]){
                            found = true;
                            break;
                        }
                    }
                    if(!found) rows.push({id: mdPoint[0], date: readableDate, order: jsdt});
                    rows[r][colId] = mdPoint[1]===null?'-':mdPoint[1];
                }
            }
        }
        if(showComponentsAndPlot){
            columns.push({
                    id: plotId,
                    field: plotId,
                    name:'<b>' + plotName(oGraph, plot) + '</b><br>'
                        + plotUnits(oGraph, plot) + '<br>'
                        + '<br>'
                        + '<br>'
                        + '<br>'
                        + '<br>'
                        + '<br>'+plot.formula.formula,
                    cssClass: 'grid-calculated-column'}
            );
            for(d=0;d<serie.options.data.length;d++){
                pnt = serie.options.data[d]
                readableDate = formatDateByPeriod(pnt[0], serie.options.period);
                mdDate = mashableDate(pnt[0], serie.options.period);
                //search to see if this date is in gridArray
                if((!oGraph.start || oGraph.start<=pnt[0]) && (!oGraph.end || oGraph.end>=pnt[0])){
                    //search to see if this date is in rows
                    for(found=false, r=0;r<rows.length;r++){ //see if date row exists, else add
                        if(rows[r].id == mdDate){
                            found = true;
                            break;
                        }
                    }
                    if(!found) rows.push({id: mdDate, date: readableDate, order: pnt[0]});
                    rows[r][plotId] = pnt[1]===null?'-':pnt[1];
                }
            }
        }
    }
    rows.sort(function(a,b){
        if(b.order!=a.order) {
            return b.order - a.order;
        } else {
            return b.id.length - a.id.length;
        }
    });  //guaranteed order because id is the getTime() of the row date
    console.timeEnd("gridDataForChart ");
    return {columns: columns, rows: rows};
}

/*function makeTableFromArray(grid){
 console.time("makeTableFromArray");
 var r, c;
 if(grid[rowPosition.lat_lon].join('')=='lat, lon:') grid.splice(rowPosition.lat_lon,1);
 if(grid[rowPosition.region].join('')=='region code:') grid.splice(rowPosition.region,1);
 for(r=0;r<grid.length;r++){
 grid[r] = '<tr><td>' + grid[r].join('</td><td>') + '</td></tr>';
 }
 console.timeEnd("makeTableFromArray");
 return '<table class="data-grid">' + grid.join('') + '</table>';
 }*/

function downloadMap(panelID, format){
    //format = 'image/jpeg';  //'application/pdf',
    var svg = $('#'+ panelID + ' div.jvmap div').html();
    svg = cleanMapSVG(svg);
    downloadMadeFile({
        type: format,
        filename: 'MashableDataMap',
        width: 2000,
        svg: svg,
        url: 'https://www.mashabledata.com/workbench/export/index.php'
    });

}

function cleanMapSVG(svg){
    //jvector map sanitize
    svg = svg.replace(/<div[^<]+<\/div>/gi, '');
    //svg = svg.replace(/ class="[^"]+"/gi, '');
    //svg = svg.replace(/ id="[^"]+"/gi, '');
    //svg = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.0//EN" "http://www.w3.org/TR/2001/REC-SVG-20010904/DTD/svg10.dtd">' + svg;
    svg = svg.replace(/<svg /gi, '<svg xmlns="http://www.w3.org/2000/svg"  version="1.1" ');


    svg = svg.replace(/<g><\/g>/gi, '');
    //svg = svg.replace(/<g [^>]+>/gi, '<g>');
    svg = svg.replace(/<g/,'<rect x="0" y="0" width="100%" height="100%" fill="'+mapBackground+'"></rect><g');
    // standard sanitize
    svg = svg
        .replace(/zIndex="[^"]+"/g, '')
        .replace(/isShadow="[^"]+"/g, '')
        .replace(/symbolName="[^"]+"/g, '')
        .replace(/jQuery[0-9]+="[^"]+"/g, '')
        .replace(/isTracker="[^"]+"/g, '')
        .replace(/url\([^#]+#/g, 'url(#')
        /*.replace(/<svg /, '<svg xmlns:xlink="http://www.w3.org/1999/xlink" ')
         .replace(/ href=/, ' xlink:href=')
         .replace(/preserveAspectRatio="none">/g, 'preserveAspectRatio="none"/>')*/
        /* This fails in IE < 8
         .replace(/([0-9]+)\.([0-9]+)/g, function(s1, s2, s3) { // round off to save weight
         return s2 +'.'+ s3[0];
         })*/

        // Replace HTML entities, issue #347
        .replace(/&nbsp;/g, '\u00A0') // no-break space
        .replace(/&shy;/g,  '\u00AD') // soft hyphen

        // IE specific
        .replace(/id=([^" >]+)/g, 'id="$1"')
        .replace(/class=([^" ]+)/g, 'class="$1"')
        .replace(/ transform /g, ' ')
        .replace(/:(path|rect)/g, '$1')
        .replace(/style="([^"]+)"/g, function (s) {
            return s.toLowerCase();
        });

    // IE9 beta bugs with innerHTML. Test again with final IE9.
    svg = svg.replace(/(url\(#highcharts-[0-9]+)&quot;/g, '$1')
        .replace(/&quot;/g, "'");
    if ((svg.match(/ xmlns="/g)) && svg.match(/ xmlns="/g).length === 2) {
        svg = svg.replace(/xmlns="[^"]+"/, '');
    }

    return svg;
}

function downloadMadeFile(options){
    var createElement = Highcharts.createElement;
    // create the form
    var form = createElement('form', {
            method: 'post',
            action: options.url
        }, {
            display: 'none'
        },
        document.body
    );

    for(var name in options){
        createElement('input', {
            type: 'hidden',
            name: name,
            value: options[name]
        }, null, form);
    }
    // submit
    form.submit();

    // clean up
    Highcharts.discardElement(form);
}