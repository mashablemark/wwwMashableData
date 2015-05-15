/** workbench.js
 * Created with JetBrains PhpStorm.
 * User: mark
 * Date: 2/18/13
 * Time: 9:04 PM
 */

/* UglifyJS workbench NODEJS seting in PhpStorm
 Program: C:\wamp\www\node_modules\.bin\uglifyjs.cmd
 Arguments: globals.js common.js set.js plot.js graph.js maps.js grapher.js jstat.js shims.js workbench.js cat_browser.js  account.js  annotator.js provenance.js treemap.js -o workbench.min.js -m toplevel,eval
 Working Dir: $FileDir$
 Output paths: workbench.min.js
 */

//shortcuts:
var MD = MashableData, globals = MD.globals, grapher = MD.grapher, common = MD.common;
var
    themeCubes = globals.themeCubes,
    iconsHMTL = globals.iconsHMTL,
    panelGraphs = globals.panelGraphs,
    oMySets = globals.MySets,
    oMyGraphs = globals.MyGraphs,
    hcColors = globals.hcColors,
    colorsPlotBands = globals.colorsPlotBands;

var dateFromMdDate = common.dateFromMdDate,
    callApi = common.callApi;

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
    freq: 45,
    linkIcon: 30,
    src: 150,
    drillIcon: 35,
    count: 60,
    scrollbarWidth: 35,
    padding: 9
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
//Datatable variables set after onReady calls to setupMyDataTable, setupFindDataTable, and setupMyGraphsTable, and setupPublicGraphsTable
var $dtMyData; //...setupMyDataTable
var $dtFindDataTable;  //...setupFindDataTable
var $dtMyGraphs;    //...setupMyGraphsTable
var $dtPublicGraphs;   //...setupPublicGraphsTable
var searchCatId = 0;  //set on API browser selection in hash, cleared on public series search text change
var searchCatName = false;
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

    //now that FB library is loaded and our app identified, see if user is already logged in
    FB.getLoginStatus(function(response) {
        account.signInFB(response);
        FB.Event.subscribe('auth.login', function(response) { //react to future log ins
            account.signInFB(response);
        });
    });
};

// Load the Facebook SDK Asynchronously
function initFacebook(){  //normally called when document is ready (ie. when page loads)
    var js, id = 'facebook-jssdk'; if (document.getElementById(id)) {return;}
    js = document.createElement('script'); js.id = id; js.async = true;
    js.src = "//connect.facebook.net/en_US/all.js";  //calls fbAsyncInit above when loaded
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
    //load all the necessary files that were not loaded at startup for fast initial load speed (not charts and maps loaded from grapher.js)
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

    $('#quick-view-add-to-graph').button().click(quickViewToGraph);
    $quickViewChangeGeo = $('#quick-view-change-geo').button().click(quickViewFetchGeos);
    $('#quick-view-close').button({icons: {secondary: "ui-icon-close"}}).click(quickViewClose);

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
    setupMyDataTable();
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
                    $dtMyData.fnFilter('');
                    $dtMyData.fnSort([[MY_SERIES_DATE, 'asc']]);
                }
            }
            event.bubbles = true;
            return true;
        });

    setupFindDataTable();
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
    //TODO uncomment after testing!!!
    /*window.onbeforeunload = function() {
     return "Your work will be lost.";
     };
     */
    $('body').resize(resizeCanvas);
    $('#series-search-button').click(seriesCloudSearch);
    $('#show-hide-pickers').click(function(){
        showHideGraphEditor();
        setPanelHash();
    });

    require(globals.graphScriptFiles, function(){
        $.fn.colorPicker.defaults.colors.splice(-1,0,hcColors, colorsPlotBands);
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
            case 'cs': //cloud series = find data tab
                $('#series-tabs').find('li.cloud-series a').click();
                $search = $('#series_search_text');
                searchCatId == oH.cat||0;
                $('#series_search_freq').val(oH.f||'all'); //search executes on freq change
                $('#series_search_source').val(oH.api||'all'); //search executes on API change
                var map = oH.map||'none';
                $('#find-data-map').html('<option value="'+map+'" selected>'+MashableData.globals.maps[map].name+'</option>');
                $('#public-settype-radio').find('input[value='+(oH.sets||'all')+']').click(); //search executes on sets change
                if(searchCatId!=0){
                    $search.val("category" + (searchCatName?': ' + searchCatName:''));
                    seriesCloudSearch();
                } else {
                    if(decodeURI(oH.s)!=$search.val()){
                        if(oH.s) $search.click().val(decodeURI(oH.s)); //the click event will remove the grey-ghost class and click and focus events on first call
                        seriesCloudSearch();  //to exec search
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

    //datatables
    layoutDimensions.widths.canvas = $("#canvas").innerWidth();
    //mySeries
    layoutDimensions.widths.mySeriesTable.table = layoutDimensions.widths.canvas-8*colWidths.padding-colWidths.scrollbarWidth;
    var remainingInnerWidths =  layoutDimensions.widths.mySeriesTable.table - (colWidths.freq + 2*colWidths.shortDate  + colWidths.src + colWidths.shortDate);
    layoutDimensions.widths.mySeriesTable.columns.units = parseInt(remainingInnerWidths * 0.15);
    layoutDimensions.widths.mySeriesTable.columns.maps = parseInt(remainingInnerWidths * 0.10);
    layoutDimensions.widths.mySeriesTable.columns.series = parseInt(remainingInnerWidths * 0.55);
    layoutDimensions.widths.mySeriesTable.columns.category = parseInt(remainingInnerWidths * 0.20);
    $('#series-table_wrapper').find('thead').find('th.title').width(layoutDimensions.widths.mySeriesTable.columns.series+'px')
        .end().find('th.units').width(layoutDimensions.widths.mySeriesTable.columns.units+'px')
        .end().find('th.cat').width(layoutDimensions.widths.mySeriesTable.columns.category+'px');
    //Find Data
    layoutDimensions.widths.publicSeriesTable.table = layoutDimensions.widths.canvas-9*colWidths.padding-colWidths.scrollbarWidth;
    remainingInnerWidths =  layoutDimensions.widths.publicSeriesTable.table - (colWidths.map + colWidths.freq + colWidths.src + 3*colWidths.mmmyyyy);
    layoutDimensions.widths.publicSeriesTable.columns.series = remainingInnerWidths * 0.5;
    layoutDimensions.widths.publicSeriesTable.columns.units = remainingInnerWidths * 0.25;
    layoutDimensions.widths.publicSeriesTable.columns.category = remainingInnerWidths * 0.25;
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
function setupMyDataTable(){

    $dtMyData = $('#series-table').html('')
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
                { "mData": "name", "sTitle": "Set Name<span></span>", "sClass": 'title', "bSortable": true, "sWidth": layoutDimensions.widths.mySeriesTable.columns.series + "px",
                    "mRender": function(value, type, obj){
                        return ((obj.settype=='M')?iconsHMTL.mapset:'')
                            + ((obj.settype=='X')?iconsHMTL.pointset:'')
                            + ((obj.themeid)?iconsHMTL.hasCubeViz:'')
                            + value
                            + '<span class="handle">' + obj.handle + '</span>';
                    }
                },
                { "mData": "units", "sTitle": "Units<span></span>", "sClass": "units", "bSortable": true, "sWidth": layoutDimensions.widths.mySeriesTable.columns.units + "px",  "mRender": function(value, type, obj){return value}},
                { "mData": "maps", "sTitle": "Maps to<span></span>", "sClass": "maps-to", "bSortable": true, "sWidth": layoutDimensions.widths.mySeriesTable.columns.maps + "px",  "mRender": function(value, type, obj){return spanWithTitle(obj.mapList())}},
                { "mData": "freqs", "sTitle": "f<span></span>", "sClass": 'dt-freq', "bSortable": true, "sWidth": colWidths.freq + "px",
                    "mRender": function(value, type, obj){return formatFreqWithSpan(obj.freqs.join(' '))}
                },
                { "mData":"firstsetdt", "sTitle": "from<span></span>", "sClass": "dte", "sWidth": colWidths.shortDate+"px", "bSortable": true, sType: "numeric", "asSorting":  [ 'desc','asc'],
                    "mRender": function(value, type, obj){if(type=='sort') return parseInt(value); else return MD.grapher.formatDateByPeriod(value, obj.period);}
                },
                { "mData":"lastsetdt", "sTitle": "to<span></span>", "sClass": "dte", "sWidth": colWidths.shortDate+"px", "bSortable": true, sType: "numeric", "asSorting":  [ 'desc','asc'], "resize": false,
                    "mRender": function(value, type, obj){if(type=='sort') return parseInt(value); else return MD.grapher.formatDateByPeriod(value, obj.period);}
                },
                { "mData": "categories",  "sTitle": "Category<span></span>", "sClass": "cat", "bSortable": true, "sWidth": layoutDimensions.widths.mySeriesTable.columns.category + "px", "mRender": function(value, type, obj){return value}},
                { "mData": null,  "sTitle": "Source<span></span>", "sClass": 'dt-source',  "bSortable": false, "sWidth": colWidths.src + "px", "resize": false,
                    "mRender": function(value, type, obj){
                        if(obj.url) {
                            return formatAsUrl(obj.url,  obj.src) ;
                        } else {
                            return '<span class=" ui-icon ui-icon-person" title="user sets"></span> ' +  obj.username||'';
                        }
                    }
                },
                { "mData": "savedt",  "sTitle": "added<span></span>", "bSortable": true, sType: "numeric",  "sWidth": colWidths.shortDate + "px", "resize": false,
                    "mRender": function(value, type, obj){ if(type=='sort') return parseInt(value); else return timeOrDate(value);}
                }//
            ]
        })
        .click(function(e){
            var $td = $(e.target).closest('td');
            if($td.hasClass('title') || $td.hasClass('units') || $td.hasClass('dt-freq') || $td.hasClass('dte')){
                $dtMyData.find('tr.ui-selected').removeClass('ui-selected');
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

    $('.new-data').button().click(function(){showSeriesEditor()});
    $('#series-table_info').appendTo('#local-series-header');

}
function setupFindDataTable(){
    $dtFindDataTable =  $('#tblPublicSeries').html('').dataTable({
        "sDom": "frti", //TODO: style the components (http://datatables.net/blog/Twitter_Bootstrap) and avoid jQuery calls to append/move elements
        "bServerSide": true,
        "oLanguage": {"sEmptyTable": "Please use the form above to search the MashableData servers for public data"},
        "fnServerData": function ( sSource, aoData, fnCallback ) {
            var thisSearch =  $("#tblPublicSeries_filter input").val();
            aoData.push({name: "command", value: "NewSearchSeries"});
            aoData.push({name: "uid", value: getUserId()});
            aoData.push({name: "accessToken", value: account.info.accessToken});
            aoData.push({name: "mapfilter", value: $("#find-data-map").val()});
            aoData.push({name: "freq", value: $("#series_search_freq").val()});
            aoData.push({name: "apiid", value: $("#series_search_source").val()});
            aoData.push({name: "settype", value: $("#public-settype-radio input:checked").val()});
            aoData.push({name: "catid", value: searchCatId});
            aoData.push({name: "lastSearch", value: lastSeriesSearch});
            aoData.push({name: "search", value: thisSearch});
            if(lastSeriesSearch!=thisSearch) {
                lastSeriesSearch = thisSearch;
                $dtFindDataTable.fnSort([]);   //this clear sort order and triggers a fnServerData call
                return;  //the server call trigger by the previous line will correctly load the data, therefore abort
            }
            var startSearchTime = new Date();
            $.ajax( {
                "dataType": 'json',
                "type": "POST",
                "url": "api.php",
                "data": aoData,
                "success": function(data, textStatus, jqXHR){
                    var endSearchTime = new Date();
                    console.log(data.command+" ("+data.search+"): "+data.exec_time+' ('+(endSearchTime.getTime()-startSearchTime.getTime()) +'ms)');
                    if(data.status=='ok') {
                        data.aaData = common.setFactory(data.aaData);
                        fnCallback(data, textStatus, jqXHR);
                    } else dialogShow('server error', data.status);
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
            { "mData":"name", "sTitle": "Set Name<span></span>", "bSortable": true, "sWidth": layoutDimensions.widths.publicSeriesTable.columns.series + "px", "sClass": "title",
                "mRender": function(value, type, obj){
                    return ((obj.settype=='M')?iconsHMTL.mapset:'')
                        + ((obj.settype=='X')?iconsHMTL.pointset:'')
                        + ((obj.themeid)?iconsHMTL.hasCubeViz:'')
                        + spanWithTitle(value)
                        + '<span class="handle">' + obj.handle() + '</span>';
                }},
            { "mData":"units", "sTitle": "Units<span></span>", "sClass": "units", "sWidth": layoutDimensions.widths.publicSeriesTable.columns.units+"px", "bSortable": true, "mRender": function(value, type, obj){return spanWithTitle(value)}},
            { "mData":"elements", "sTitle": "Set size<span></span>", "sClass": "set-size", "sWidth": colWidths.mmmyyyy+"px", "bSortable": true, "mRender": function(value, type, obj){return value==0?'':value}},
            { "mData": "maps", "sTitle": "Maps to<span></span>", "sClass": "maps-to", "bSortable": false, "sWidth": layoutDimensions.widths.mySeriesTable.columns.maps + "px",  "mRender": function(maps, type, obj){return spanWithTitle(obj.mapList())}},
            { "mData":null, "sTitle": "f<span></span>", "sWidth": colWidths.freq+"px", "bSortable": false, "sClass": "dt-freq", "mRender": function(value, type, obj){return formatFreqWithSpan(obj.freqs)} },
            { "mData":"firstdt", "sTitle": "from<span></span>", "sClass": "dte",  "sWidth": colWidths.mmmyyyy+"px", "bSortable": true, "asSorting":  [ 'desc','asc'], "mRender": function(value, type, obj){
                return (parseInt(obj.firstdt)&&parseInt(obj.lastdt))?spanWithTitle(MD.grapher.formatDateByPeriod(value, obj.freqs[0])):'';
            }},
            { "mData":"lastdt", "sTitle": "to<span></span>",  "sClass": "dte", "sWidth": colWidths.mmmyyyy+"px",  "bSortable": true, "asSorting":  [ 'desc','asc'], "resize": false,"mRender": function(value, type, obj){
                return (parseInt(obj.firstdt)&&parseInt(obj.lastdt))?spanWithTitle(MD.grapher.formatDateByPeriod(value, obj.freqs[0])):'';}},
            { "mData":"titles", "sTitle": "Category (click to browse)<span></span>", "sClass": "cat", "sWidth": layoutDimensions.widths.publicSeriesTable.columns.category+"px", "bSortable": true,
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
            $dtFindDataTable.find('tr.ui-selected').removeClass('ui-selected');
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

    $('#public-settype-radio').buttonset().find("input").change(seriesCloudSearch);
    $('#find-data-map').click(common.selectMap);
    $('#series_search_freq').change(seriesCloudSearch);
    $('#series_search_source').change(seriesCloudSearch);

    $('#series_search_text')
        .val('enter search keywords (-keyword to exclude)')
        .keyup(function(event){ seriesCloudSearchKey(event)})
        .on('click keydown',function(e){
            $(this).removeClass('grey-italics').val('').off('click keydown');
        });
    $('#cloud-series-browse').button({icons: {secondary: "ui-icon-circle-triangle-e"}}).click(function(){browseFromSeries()});
}
function setupMyGraphsTable(){
    $dtMyGraphs = $('#my_graphs_table').html(' ').dataTable({
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
                    return (obj.plottypes.indexOf('M')!=-1?(obj.mapconfig.mapMode=='bubbles' || obj.mapconfig.mapMode=='change-bubbles' || (obj.mapconfig.indexOf && obj.mapconfig.indexOf('bubble')>0)?iconsHMTL.hasBubbleMap:iconsHMTL.hasHeatMap):'')
                        + (obj.plottypes.indexOf('X')!=-1?iconsHMTL.hasMarkerMap:'')
                        + ((obj.cubeid)?iconsHMTL.hasCubeViz:'')
                        + spanWithTitle(globals.maps[value].name)
                }
            },
            {"mData":"analysis", "sTitle": "Analysis<span></span>", "bSortable": true, "sClass":"analysis", "sWidth": layoutDimensions.widths.myGraphsTable.columns.analysis+"px", "mRender": function(value, type, obj){return spanWithTitle((value||'').trim())}},
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
        $dtMyGraphs.find('tr.ui-selected').removeClass('ui-selected');
        var $tr = $td.closest('tr');
        var rowObject = $dtMyGraphs.fnGetData($tr.get(0));
        if(rowObject) {
            $tr.addClass('ui-selected');
            viewGraph(rowObject.ghash);
        }
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
    $dtPublicGraphs = $('#tblPublicGraphs').dataTable({
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
//            aoData.push({ "name": "freq", "value": $("#").value });
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
            $dtPublicGraphs.find('tr.ui-selected').removeClass('ui-selected');
            var rowObject = $dtPublicGraphs.fnGetData($td.closest('tr').addClass('ui-selected').get(0));
            var $graphRow = $dtPublicGraphs.find('tr.ui-selected');
            if($graphRow.length==1){
                var rowObject = $dtPublicGraphs.fnGetData($graphRow.get(0));
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
        searchText = '+' + searchText.replace(/\s+/g,' +');
        searchText = searchText.replace('+-', '-');
    }
    $('#tblPublicSeries_filter input').val(searchText);
    $dtFindDataTable.fnFilter(searchText);
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
        $dtPublicGraphs.fnFilter(searchText);
        setPanelHash();
    }
}
function formatFreqWithSpan(period){
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
    if(!url) return txt || '';
    txt = txt ||url.replace(/\b(http(s)*:\/\/)*(www.)*/gi,'').replace('/', ' /');
    return '<a href="' + url + '" target="_blank" title="' + url + '"><span class=" ui-icon ui-icon-extlink">' + url + '</span>'+txt+'</a>';
}
function viewGraph(ghash){
    MD.grapher.createMyGraph(ghash);
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
            mySerie.data = MD.common.mashableDataString(mySerie);

            if(account.loggedIn()) {          // ...add to MySeries in cloud
                params.series.push(mySerie);
                seriesTree[mySerie.handle] = mySerie;
            } else {
                oMySets[mySerie.handle] = mySerie;
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
                    addMySeriesRow($.extend({},seriesTree[localHandle])); //this will update or add the series as needed and add it to the oMySets object
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
    $quickViewRows = $dtMyData.find('tr.ui-selected').each(function(){
        series.push($dtMyData.fnGetData(this));
    });
    if(series.length==0){
        for(var handle in oMySets){
            hasMySeries = true;
            break;
        }
        if(hasMySeries) dialogShow('no series selected', dialogues.noSeriesSelected); else dialogShow('no series selected', dialogues.noMySeries);
    } else {

        preview(series, false, false);
    }
}
function previewPublicSeries(){
    var series = [], hasMySeries = false, mapFilter;
    $('#series_search_text').focus(); //deselect anything table text accidentally selected through double-clicking
    $dtFindDataTable.find('tr.ui-selected').each(function(){
        series.push($dtFindDataTable.fnGetData(this));
    });
    if(series.length==0){
        dialogShow('selection required', dialogues.noSeriesSelected);
    } else {
        var map = $("#find-data-map").val();
        if(map=='none') map = false;
        preview(series, map, true);      //GetMashableData takes basic set info, fills in missing freq and geo and fetches the series
    }
}

//QUICK VIEW FUNCTIONS
function preview(series, map, showAddSeries){ //series is an array of Set objects which may be missing freq, geo, and latlon info
    //if(notLoggedInWarningDisplayed()) return false;     // need to allow some playing before forcing a signup
    var needData=false, seriesNeedingData={}, serie, handle, i;
    for(i=0;i<series.length;i++){
        serie = series[i];
        if(!serie.data){ //note:  if L, it *must* have its own data
            handle = serie.handle();
            seriesNeedingData[handle] = {
                setid: serie.mastersetid || serie.setid,
                freq: serie.preferedFreq(),
                geoid: serie.geoid,
                latlon: serie.latlon
            };
            needData = true;
        }
    }
    if(needData){
        callApi(
            {
                command:  'GetSeries',
                series: seriesNeedingData,
                map: (map ? {code: map, bunny: globals.maps[map].bunny} : false)
            },
            function(jsoData, textStatus, jqXH){
                for(i=0;i<series.length;i++){
                    handle = series[i].handle();
                    if(jsoData.series[handle]){
                        var newSerie = new MD.Set(jsoData.series[handle]);
                        if(map) newSerie.preferredMap = map;
                    }
                    if(oMySets[newSerie.handle()]){ //if this happens to be in mySeries...
                        oMySets[handle] = newSerie;
                    }
                    series.splice(i,1, newSerie);
                }
                quickGraph(series, map, showAddSeries);
            }
        )
    } else {
        quickGraph(series, map, showAddSeries);
    }
}
function quickGraph(obj, map, showAddSeries){   //obj can be a series object, an array of series objects, or a complete graph object
    var qGraph, aoSeries, i, j, someNewSeries = [], someMySeries = [], themeids=[], setids=[];
    var setMaps = [], sets = [];
    var $mapSelect =  $('#quick-view-maps');
    $('#quick-view-geo-select').hide().html('').off().change(function(){
        console.log($(this).val());
    });
    if(obj.plots){ // a graphs object was passed in
        qGraph = obj; // everything including title should be set by caller
        oQuickViewSeries = obj; //store in global var <<BAD FORM!!
        var $qvChangeFreq = $('#quick-view-change-freq').hide();
        if($qvChangeFreq.selectmenu) $qvChangeFreq.selectmenu('destroy');
        $quickViewChangeGeo.hide();
    } else { //obj is either an array of series or a single series
        if(obj instanceof Array) aoSeries = obj; else aoSeries = [obj];
        oQuickViewSeries = aoSeries; //aoSeries is guarented to be an array of series

        //allow geo switching on a single series only
        $('#quick-view-geo-select').hide();  //hide the autocomplete

        if(aoSeries.length==1 && aoSeries[0].settype!='S'){
            $quickViewChangeGeo.show(); //show the autocomplete fill button
            $('#outer-show-graph-div .ui-autocomplete').remove();
        } else {
            $('#quick-view-change-freq').hide().selectmenu('destroy');
            $quickViewChangeGeo.hide();
        }

        qGraph = new MD.Graph();
        var allFreqs = [], allFreq = [];
        for(i=0;i<aoSeries.length;i++){
            qGraph.addPlot([new MD.Component(aoSeries[i])]);
            if(allFreq.indexOf(aoSeries[i].freq)===-1) allFreq.push(aoSeries[i].freq);
            if(aoSeries[i].freqs && allFreqs.indexOf(aoSeries[i].freqs.toString())===-1) allFreqs.push(aoSeries[i].freqs.toString());
        }
        if(allFreqs.length==1 && allFreq.length==1){
            var options = '';
            $.each(aoSeries[0].freqs, function(f, freq){ //previous test guarantees that all aoSeries have identical freq and freqs
                options += '<option value="'+freq+'" '+(freq==aoSeries[0].freq?'selected':'')+'>'+globals.period.name[freq]+'</option>';
            });
            $('#quick-view-change-freq').html(options).off().change(function(){
                var newF = this.value;
                $.each(aoSeries, function(){
                    this.freq = newF;
                    delete this.data;
                }).selectmenu();
                preview(aoSeries, map, showAddSeries);
            });
        } else {
            $('#quick-view-change-freq').hide().selectmenu('destroy');
        }
    }

    var quickChartOptions = grapher.makeChartOptionsObject(qGraph);

    qGraph.eachComponent(function(){
        if(globals.MySets[this.handle()]) someMySeries.push(globals.MySets[this.handle()]);
        if(!globals.MySets[this.handle()]) someNewSeries.push(qGraph.assets[this.handle()]);
    });

    delete quickChartOptions.chart.height;
    if(aoSeries instanceof Array){
        if(aoSeries.length==1){
            quickChartOptions.title = {text: aoSeries[0].name()};
            quickChartOptions.legend = {enabled: false};
        } else {
            delete quickChartOptions.title;
        }
        for(i=0;i<aoSeries.length;i++){
            if(aoSeries[i].themeid) {
                themeids.push(aoSeries[i].themeid);
                if(setids.indexOf(aoSeries[i].setid)===-1) setids.push(aoSeries[i].setid);
            }
        }
    }
    quickChartOptions.chart.borderWidth = 2;
    quickChartOptions.chart.renderTo = 'highcharts-div';
    quickChart = new Highcharts.Chart(quickChartOptions);

    //set the notes and fill the map selector
    var serie, qvNotes='';
    if(!obj.plots){ //only if single series
        if(aoSeries.length==1){
            serie = aoSeries[0];
            //this are the series info added to the quickView panel.  Could be more complete & styled
            if(serie.setmetadata) qvNotes += '<tr><td>Set notes:</td><td>' + serie.setmetadata + '</td></tr>';
            if(serie.seriesmetadata) qvNotes += '<tr><td>Series notes:</td><td>' + serie.seriesmetadata + '</td></tr>';
            if(serie.categories) qvNotes += '<tr><td>Categories:</td><td>' + serie.categories + '</td></tr>';
            if(serie.src) qvNotes += '<tr><td>API Source:</td><td><a href="'+serie.url+'" target="_blank">' + serie.src + (serie.sourcekey?' (source key: '+serie.sourcekey +') ':'') +'</a></td></tr>';
            //if(serie.sourcekey) qvNotes += '<tr><td>API Source Key:</td><td>' + serie.sourcekey + '</td></tr>';
            if(qvNotes) qvNotes = '<table>' + qvNotes + '</table>';
            qvNotes = '<span class="right">'+serie.setid+'</span>'+qvNotes;
        }

        //determine whether and which maps to show in the selector
        var mapList = globals.orderedMapList, maps = globals.maps, minMapCount = serie.settype=='X'? 0 : 1;
        if(serie.maps){
            for(i=0;i<mapList.length;i++){ //primary loop = use ordered mapList to preserve order in eventual selector
                for(j=0;j<aoSeries.length;j++){  //synthetic series will get their mapsets' map property
                    serie = aoSeries[j];
                    if(serie.maps[mapList[i].map] > minMapCount){ //this map is match!
                        setMaps.push('<option value="'+mapList[i].map+'"'+ (serie.preferredMap=mapList[i].map?' selected':'')+'">'+mapList[i].name +' ('+serie.maps[mapList[i].map]+(serie.settype=='X'?' points':'%')+')</option>');
                        break;
                    }
                }
            }
        }
    }
    $('#qv-info').html(qvNotes);

    //initial map and/or chart buttonset visibility + map selector fill
    if(setMaps.length){ //make sure we have maps to show
        $('#quick-view-chart-or-map').show().find('input').off().click(_showHideMapSelector);
        map = $mapSelect.html(setMaps.join('')).val(map).val();  //if no passed in map preference, set it to the first map = used in determining graph capatilibity
        _showHideMapSelector();
    } else {
        $mapSelect.hide();
        $('#quick-view-chart-or-map').hide();
    }

    if(showAddSeries && someNewSeries){
        $('#quick-view-to-series').show();
    } else {
        $('#quick-view-to-series').hide();
    }
    if(someMySeries.length>0){
        $('#quick-view-delete-series').show();
    } else {
        $('#quick-view-delete-series').hide();
    }
    //populate the graph selector
    var currentGraphId = MD.grapher.visiblePanelId(), graphOptions = '<option value="new">new graph</option>';
    $('div.graph-panel').each(function(){
        var $tabLink = $("ul#graph-tabs li a[href='#"+this.id+"']");
        graphOptions+='<option value="'+this.id+'">'+$tabLink.html()+'</option>'; //initial selection set below
    });

    //populate the cube selector
    fillCubeSelector($('#quick-view-select-viz'), setids, themeids);

    //program the "add to graph" button
    var addTo = currentGraphId && panelGraphs[currentGraphId].map && map && panelGraphs[currentGraphId].map==map?currentGraphId:'new';
    $('#quick-view-to-graphs').html(graphOptions).val(addTo)
        .off()
        .click(function(){
            $('#quick-view-add-to-graph').find('.ui-button-text').html(($(this).val()=='new')?'create graph':'add to graph');
        })
        .click(); //set the button text
    $('.show-graph-link').click();

    function _showHideMapSelector (){
        var show = ($('#quick-view-chart-or-map input:checked').val()!='chart');
        var shown = $mapSelect.css("display")!='none';
        if(show&&!shown || !show&&shown) $mapSelect.animate({width: 'toggle'});  //the complete function is sync insurance
    }
}
function quickViewToSeries(btn){ //called from button. to add series shown in active quickView to MySeries
    $(btn).button("disable");
    for(var i=0;i<oQuickViewSeries.length;i++){
        oQuickViewSeries[i].savedt = new Date().getTime();
        var serieskey = addMySeriesRow(oQuickViewSeries[i]);  //table and oMySets add/update
        updateMySeries(oQuickViewSeries[i]); //cloud update
    }
    dialogShow('My Series', 'series added.',[]);
    $('#dialog').closest('.ui-dialog').fadeOut(1000, function(){ $('#dialog').dialog('close')});
    //quickView not closed automatically, user can subsequently chart or close
}
function quickViewFetchGeos(){
    if(oQuickViewSeries.length==1 && oQuickViewSeries[0].geoid && oQuickViewSeries[0].geoid>0){
        var qvSet = oQuickViewSeries[0],
            params = {command: 'GetSetGeographies'},
            options = '',
            geo,
            isQvSet;
        if(qvSet.settype=='X') params.mastersetid = qvSet.setid || qvSet.mastersetid;
        if(qvSet.settype=='M') params.setid = qvSet.setid;
        callApi(params, function(jso){
            for(var i=0;i<jso.geographies.length;i++){
                geo = jso.geographies[i];
                if(jso.mastersetid){
                    isQvSet =  geo.latlon == qvSet.latlon;
                    options += '<option value="'+geo.latlon+'" '+(isQvSet?'selected':'')+'>'+geo.name+'</option>';
                }  else {
                    isQvSet =  geo.geoid == qvSet.geoid;
                    options += '<option value="'+geo.geoid+'" '+(isQvSet?'selected':'')+'>'+geo.name+'</option>';
                }
            }
            $quickViewChangeGeo.slideUp();
            var $geoSelect = $('#quick-view-geo-select').html(options).off().slideDown().change(function(){
                console.log($(this).val());
            });

            //autocomplete widget
            $geoSelect.combobox();

        });
    } else {
        dialogShow("change geography", "Expecting to change geography of a single series in geoset. Problems encountered.");
    }
}

//create the autocomplete widget factory
(function( $ ) {
    $.widget( "custom.combobox", {
        _create: function() {
            this.wrapper = $( "<span>" )
                .addClass( "custom-combobox" )
                .insertAfter( this.element );

            this.element.hide();
            this._createAutocomplete();
            this._createShowAllButton();
        },

        _createAutocomplete: function() {
            var selected = this.element.children( ":selected" ),
                value = selected.val() ? selected.text() : "";
            var widget = this;
            this.input = $( "<input>" )
                .appendTo( this.wrapper )
                .val( value )
                .attr( "title", "" )
                .focus(function(){$(this).select(); })
                .keyup(function(event){
                    var keyCode = ('which' in event) ? event.which : event.keyCode;
                    if(keyCode == 13 || keyCode == 9) {  //return or tab keys
                        //TRYING TO GRAB FIRST ITEM FROM UL, BUT SOMEWHAT CHALLENGING
                        // var firstItem = widget.element.children( "li:first a");
                        //this.val(firstItem.html());
                    }
                })
                .addClass( "custom-combobox-input ui-widget ui-widget-content ui-state-default ui-corner-left" )
                .autocomplete({
                    delay: 0,
                    position: {
                        my: "right bottom",
                        at: "right top",
                        //collision: "flipfit",
                        within: "#fancybox-content"
                    },
                    minLength: 0,
                    source: $.proxy( this, "_source" )
                })
                .tooltip({
                    tooltipClass: "ui-state-highlight",
                    content: "search or select from list"
                });

            this._on( this.input, {
                autocompleteselect: function( event, ui ) {
                    ui.item.option.selected = true;
                    this._trigger( "select", event, {
                        item: ui.item.option
                    });
                },

                autocompletechange: "_removeIfInvalid"
            });
        },

        _createShowAllButton: function() {
            var input = this.input,
                wasOpen = false;

            $( "<a>" )
                .attr( "tabIndex", -1 )
                .attr( "title", "Show All Items" )
                .tooltip()
                .appendTo( this.wrapper )
                .button({
                    icons: {
                        primary: "ui-icon-triangle-1-s"
                    },
                    text: false
                })
                .removeClass( "ui-corner-all" )
                .addClass( "custom-combobox-toggle ui-corner-right" )
                .mousedown(function() {
                    wasOpen = input.autocomplete( "widget" ).is( ":visible" );
                })
                .click(function() {
                    input.focus();

                    // Close if already visible
                    if ( wasOpen ) {
                        return;
                    }

                    // Pass empty string as value to search for, displaying all results
                    input.autocomplete( "search", "" );
                });
        },

        _source: function( request, response ) {
            var matcher = new RegExp( $.ui.autocomplete.escapeRegex(request.term), "i" );
            response( this.element.children( "option" ).map(function() {
                var text = $( this ).text();
                if ( this.value && ( !request.term || matcher.test(text) ) )
                    return {
                        label: text,
                        value: text,
                        option: this
                    };
            }) );
        },

        _removeIfInvalid: function( event, ui ) {

            // Selected an item, nothing to do
            if ( ui.item ) {
                _fetchSerieForNewGeo($(ui.item.option).val());
                return;
            }

            // Search for a match (case-insensitive)
            var value = this.input.val(),
                valueLowerCase = value.toLowerCase(),
                valid = false,
                geoid;
            this.element.children( "option" ).each(function() {
                if ( $( this ).text().toLowerCase() === valueLowerCase ) {
                    this.selected = valid = true;
                    geoid = $(this).val();
                    _fetchSerieForNewGeo(geoid);
                    return false;
                }
            });

            // Found a match, nothing to do
            if ( valid ) {
                return;
            }

            // Remove invalid value
            this.input
                .val( "" )
                .attr( "title", value + " didn't match any item" )
                .tooltip( "open" );
            this.element.val( "" );
            this._delay(function() {
                this.input.tooltip( "close" ).attr( "title", "" );
            }, 2500 );
            this.input.autocomplete( "instance" ).term = "";


            //private function to fetch and show new serie
            function _fetchSerieForNewGeo(newGeoid){
                //fire a change of geo here if geoid != oQuickViewSeries[0].geoid
                if(oQuickViewSeries.length==1 && oQuickViewSeries[0].geoid != geoid){
                    var serie = oQuickViewSeries[0];
                    callApi(
                        {
                            command:  'GetSeries',
                            series: {
                                "newgeo": {
                                    setid: serie.mastersetid || serie.setid,
                                    freq: serie.freq,
                                    geoid: newGeoid, //from autocomplete!!
                                    latlon: serie.latlon
                                }
                            }
                        },
                        function(jsoData, textStatus, jqXH){
                            var newSerie = new MD.Set(jsoData.series['newgeo']);
                            if(oQuickViewSeries[0].preferredMap) newSerie.preferredMap = oQuickViewSeries[0].preferredMap;
                            oQuickViewSeries[0] = newSerie;
                            quickChart.get('P0').remove();
                            quickChart.addSeries({
                                color: globals.hcColors[0],
                                dashStyle: 'solid',
                                data: newSerie.chartData(),
                                name: newSerie.name(),
                                freq: newSerie.freq,
                                id: 'P0'
                            });
                            quickChart.setTitle({text: newSerie.name()});
                        }
                    );
                }
            }
        },

        _destroy: function() {
            this.wrapper.remove();
            this.element.show();
        }
    });
})( jQuery );


function quickViewToGraph(){
    var panelId =  $('#quick-view-to-graphs').val();
    var mapped=false, charted=false;
    if($('#quick-view-chart-or-map:visible').length){
        switch($('#quick-view-chart-or-map input:radio:checked').val()){
            case 'map':
                mapped = true;
                break;
            case 'chart-and-map':
                mapped = charted = true;
                break;
            default:
                charted = true;
        }
    } else {
        charted = true; //default when selector is hidden
    }

    if(mapped){ //performs compatibility checks
        var map = $("#quick-view-maps").val();
        if( panelGraphs[panelId]   //this graph already exists
            && panelGraphs[panelId].map // ... and it already has a map
            && ( //but its map and the map requested or the map/pointplot frequencies are different...
            panelGraphs[panelId].map!=map || panelGraphs[panelId].mapFreq() != oQuickViewSeries[0].freq)
        ){
            dialogShow("Map Error","This graph already has a "+panelGraphs[panelId].map+" map.  Additional maps and map data can be added, but must use the same base map and frequency.");
            return null;
        }
        if(map=='other'){
            dialogShow("selection required","Please select a base map to graph this set.");
            return null;
        }
    }

    var oGraph;
    if(panelId=="new"){
        oGraph = new MD.Graph();
    } else {
        oGraph = panelGraphs[panelId];
        oGraph.controls.provenance.commitChanges(false);
    }
    if(mapped) {
        oGraph.map = map;
        oGraph.mapconfig.legendLocation = globals.maps[map].legend;
        oGraph.fetchMap(); //preload
    }
    var themeids = [], setids = [];
    if(oQuickViewSeries.plots){
        if(charted){
            if(!oGraph.plots) oGraph.plots = [];
            for(var p=0;p<oQuickViewSeries.plots.length;p++){
                oGraph.plots.push(oQuickViewSeries.plots[p]);
            }
        }
    } else {
        for(var s=0;s<oQuickViewSeries.length;s++){
            var serie = oQuickViewSeries[s], seriesComp = new MD.Component(serie); //truely a series, as quickview does not support mapping
            if(charted) oGraph.addPlot([seriesComp]);
            if(mapped){
                if(serie.maps && serie.maps[map]){  //final check in case of multiple series in quickview
                    var mapComp = new MD.Component(serie);
                    delete mapComp.geoid;
                    delete mapComp.geoname;
                    delete mapComp.latlon;
                    delete mapComp.data;
                    if(mapComp.themeid) {
                        themeids.push(mapComp.themeid);
                        setids.push(mapComp.setid);
                    }
                    if(mapComp.isMapSet()){
                        oGraph.addMapPlot([mapComp]);
                    }
                    if(mapComp.isPointSet()){
                        oGraph.addPointPlot([mapComp]);
                    }
                }
            }
        }
    }
    //if no cube active and cubes are available, see if we want to add one
    var cubeSelection = $('#quick-view-select-viz').val();
    if(cubeSelection!=""){
        if(isNaN(cubeSelection)){
            oGraph.mapconfig.mapViz = cubeSelection;
        } else {
            oGraph.cubeid = cubeSelection;
        }
    }
    oGraph.fetchAssets(function(){
        oGraph.fetchMap(function(){ //blocking map fetch
            oGraph.title = oGraph.title || (oGraph.mapsets?oGraph.mapsets[0].name():oGraph.pointsets?oGraph.pointsets[0].name():oGraph.plots[0].name());
            if(panelId=="new"){
                MD.grapher.buildGraphPanel(oGraph);
            } else {
                $("ul#graph-tabs li a[href='#"+panelId+"']").click(); //show the graph first = ensures correct sizing
                oGraph.controls.redraw();
            }
            mask('drawing');
            setPanelHash();
        });
    });
    hideGraphEditor();
    quickViewClose();
}

//used by quickview and by the graph editor
function fillCubeSelector($cubeSelector, setids, themeids, graph){
    //1. if no themeids passed and a graph is, try to make a list of graph's map and pointsetids that are part of a theme (only these can be part of cubes)
    if(!themeids.length && graph){
        setids = [];
        graph.eachComponent(function(){
            if((this.isMapSet() || this.isPointSet()) && this.themeid) {
                if(setids.indexOf(this.setid)===-1) setids.push(this.setid);
                if(themeids.indexOf(this.themeid)===-1) themeids.push(this.themeid);
            }
        });
        setids.sort(); //ensure the array joins to a predictable string
    }

    //fetch a list of applicable cubes (if they have not already been fetched for these setids)
    var possibleCubes = graph ? graph.possibleCubes : false;
    if(setids.length>0 && !(possibleCubes && possibleCubes.setsids==setids.join())) {
        callApi({command: "GetCubeList", setids: setids, themeids: themeids},
            function(jsoData, textStatus, jqXH){
                possibleCubes = {  //save on the main graph to ensure availibility betweeon prove panel ops.
                    setsids: setids.join(),
                    cubes: jsoData.cubes
                };
                if(graph) graph.possibleCubes = possibleCubes;
                _fillSelector();
            });
    } else _fillSelector();

    function _fillSelector(){
        var cubeOptions = '<option value="none">none </option>' +
            '<optgroup class="non-cube-vizes"  label="visualizations with mouseover interactions">' +
            '<option value="scatter">scatter plot of maps with linear regression and correlation coefficient</option>' +
            '<option value="line">line chart of highlighted geographies</option>' +
            '<option value="line-bunnies">line chart with national data of highlighted geographies</option>' +
            '<option value="components-bar">bar chart of map&rsquo;s components of selected geographies</option>' +
            '<option value="components-line">line chart of map&rsquo;s components of selected geographies</option>' +
            '<option value="components-area">stacked area chart of map&rsquo;s components for selected geography</option>' +
            '<option value="list-asc">ordered list (ascending)</option>' +
            '<option value="list-desc">ordered list (descending)</option>' +
            '</optgroup>';
        var i, currentCubeAccountedFor = false, cube, type = false;
        if(possibleCubes&&possibleCubes.cubes.length){
            for(i=0;i<possibleCubes.cubes.length;i++){
                cube = possibleCubes.cubes[i];
                if(type!=cube.type){
                    cubeOptions += (type?'</optgroup>':'') + '<optgroup class="cubes" label="show supplementary data '+cube.type+' on geography click">';
                    type = cube.type;
                }
                cubeOptions += '<option value="'+cube.cubeid+'"'+(graph&&cube.cubeid==graph.cubeid?' selected':'')+'>'+cube.name+'</option>';
                if(graph&&cube.cubeid==graph.cubeid) currentCubeAccountedFor = true;
            }
            cubeOptions += '</optgroup>'
        }
        if(!currentCubeAccountedFor && graph && graph.cubeid) cubeOptions = '<select value="' + graph.cubeid + '" selected>' + graph.cubename || 'data cube' + '</select>' + cubeOptions;
        $cubeSelector.html(cubeOptions);
        if(graph && graph.mapconfig && !graph.cubeid) $cubeSelector.val(graph.mapconfig.mapViz);
        $cubeSelector.show();
    }
    return possibleCubes;
}

function quickViewClose(){
    quickChart.destroy();
    delete $quickViewRows;
    $('#fancybox-close').click();
}

//series editor
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
                    mapOptions+='<option value="'+key+':'+mapsList[key].jvectormap+'">'+key+' ('+serie.geocounts[key].set+')</option>';
                }
                $select.html(mapOptions);
            } else {
                callApi({command: "GetAvailableMaps", mapsetid: serie.mapsetid, pointsetid: serie.pointsetid, geoid: serie.geoid}, function(jsoData, textStatus, jqXH){
                    for(var i=0;i<jsoData.maps.length;i++){
                        mapOptions+='<option value="'+jsoData.maps[i].name+':'+jsoData.maps[i].file+'">'+jsoData.maps[i].name+' ('+jsoData.maps[i].count+')</option>';
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
            callApi({command: 'GetSet', mapsetid: parseInt(set.substr(1)), map: map.split(':')[0], modal: 'persist'}, function(jsoData, textStatus, jqXH){
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
                        seriesData = setData.geographies[i].data.split('|');
                        seriesData.sort(); //this should not be necessary is series were properly ordered
                        for(j=0;j<seriesData.length;j++){
                            point = seriesData[j].split(':');
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
            callApi({command: 'GetPointSets', pointsetids: [parseInt(set.substr(1))], map: map.split(':')[0], modal: 'persist'}, function(jsoData, textStatus, jqXH){
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
                        seriesData = setData.data[latlon].data.split('|');
                        seriesData.sort(); //this should not be necessary is series were properly ordered
                        for(j=0;j<seriesData.length;j++){
                            point = seriesData[j].split(':');
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
            if(arySeries) quickGraph(arySeries, false, false);
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
                                        $editor.handsontable('setDataAtCell', r, 0, MD.grapher.formatDateByPeriod(nextDate(precedingDate,periodOfEdits),periodOfEdits));
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
                 $editor.handsontable('setDataAtCell', changes[i][0], 0, MD.grapher.formatDateByPeriod(nextDate(precedingDate,periodOfEdits),periodOfEdits));
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
                        data = oSerie.data.split('|').sort();
                        for(i=0;i<data.length;i++){
                            data[i] = data[i].split(':');
                            data[i][0]=MD.grapher.formatDateByPeriod(dateFromMdDate(data[i][0]).getTime(), oSerie.period);
                        }
                        data.unshift(["name", oSerie.name],["units",oSerie.units],["notes",oSerie.notes],["handle",oSerie.handle],["date","value"]);
                        $editor.attr("data",handle).handsontable("loadData", data);
                        $editor.find('table.htCore tr').show().filter(':eq('+rows.U.handle+')').hide();
                    } else {
                        var sids = [], usids=[];
                        if(handle.charAt(0)=="U") usids.push(parseInt(handle.substr(1))); else sids.push(parseInt(handle.substr(1)));
                        callApi({command: 'GetMashableData', sids:  sids, usids: usids},
                            function(jsoData, textStatus, jqXH){
                                //showSeriesInEditor()
                                oSerie.data = jsoData.series[handle].data;
                                oSerie.notes = jsoData.series[handle].notes;
                                var data = jsoData.series[handle].data.split('|').sort();
                                for(var i=0;i<data.length;i++){
                                    data[i] = data[i].split(':');
                                    data[i][0]=MD.grapher.formatDateByPeriod(dateFromMdDate(data[i][0]).getTime(),oSerie.period);
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
                 data.push([MD.grapher.formatDateByPeriod(mapDates[i].dt.getTime(), mapset.period)]);
                 }
                 for(var i=0;i<jsoData.geographies.length;i++){ //write the columns
                 data[rows.M.geoid].push(jsoData.geographies[i].geoid);
                 data[rows.M.name].push(jsoData.geographies[i].name);
                 if(mapset.data[jsoData.geographies[i].code]){ //map code matched one of the mapset's series
                 var j, k=0, serie = mapset.data[jsoData.geographies[i].code], point;
                 data[rows.M.handle][i+1] = serie.handle;
                 var serieData = serie.data.split('|');
                 for(j=0;j<mapDates.length;j++){
                 point = serieData[k].split([':']);
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
                 data = mapset.data[jvmCode].data.split('|');
                 for(i=0;i<data.length;i++){
                 oDates[data[i].split(':')[0]] = true;
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
            for(var map in globals.maps){
                mapsAsOptions += '<option value="'+map+'">'+globals.maps[map].name+'</option>';
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
                            savedt: new Date().getTime()
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
                            savedt: new Date().getTime()
                        };
                        headerRow = rows.X.header;
                        break;
                    default:
                        uSerie = {
                            handle: gridData[rows.U.handle][c],
                            name:gridData[rows.U.name][c],
                            units:gridData[rows.U.units][c],
                            notes:gridData[rows.U.notes][c],
                            savedt: new Date().getTime()
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
                            mdata += ('|' + xDate.getUTCFullYear() + ':' + pointArray[datapoint].y);
                            break;
                        case 'W':
                        case 'D':
                            mdata += ('|' + xDate.getUTCFullYear() + ((xDate.getUTCMonth()<=9)?"0":"") + xDate.getUTCMonth() + ((xDate.getUTCDate()<=9)?"0":"") + xDate.getUTCDate() + ':' + pointArray[datapoint].y);
                            break;
                        case 'M':
                        case 'Q':
                        case 'SA':
                            mdata += ('|' + xDate.getUTCFullYear() + ((xDate.getUTCMonth()<=9)?"0":"") + xDate.getUTCMonth() + ':' + pointArray[datapoint].y);
                            break;
                        case 'N':
                            mdata += ('|' + xDate.getUTCFullYear() + ((xDate.getUTCMonth()<=9)?"0":"") + xDate.getUTCMonth() + ((xDate.getUTCDate()<=9)?"0":"") + xDate.getUTCDate() + " " + xDate.getUTCHours() + ":" + xDate.getUTCHours() + ":" + xDate.getUTCMinutes() + ':' + pointArray[datapoint].y);
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
                            $dtMyData.find('span.handle:contains('+arySeries[i].handle+')').each(function(){
                                if($(this).html()==arySeries[i].handle) $dtMyData.fnDeleteRow($(this).closest("tr").get(0));
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
                        $dtMyData.fnAddData(arySeries[i]);
                        oMySets[arySeries[i].handle]=arySeries[i];  //over-write as needed
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
    for(handle in oMySets){
        if(handle[0]=='L'){
            params.series.push(oMySets[handle]);
        }
    }
    //1B.  local series found -> save to server
    if(params.series.length>0){
        callApi(params, function(results, textStatus, jqXH){
            for(oldHandle in results.handles){
                //1C. update oMySets, mySeries table, and in any graphs and graph assets
                newHandle = results.handles[oldHandle]
                serie = oMySets[oldHandle];
                serie.handle = newHandle;
                serie.sid = newHandle.substr(1);

                delete oMySets[oldHandle];
                oMySets[newHandle] = serie;

                //$('#series-table').find("td.quick-view button[data='"+oldHandle+"']").attr('data',serie.handle);

                for(tab in panelGraphs){
                    updateHandles(panelGraphs[tab],oldHandle, serie);
                }
                for(var graph in oMyGraphs){
                    updateHandles(oMyGraphs[graph], oldHandle, serie);
                }
            }
            getMySets();  //if uploading series, ensure this happens after they are registered on My Series (note: modal is persisted)
        });
    } else {
        getMySets();
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
        graph.eachComponent(function(){if(this.handle==oldHandle) this.handle = serie.handle});
    }

// note: series cleared from localStorage when they were read


//  B. My Graphs
    console.info("syncMyAccount run");
    callApi({'command':	'GetMyGraphs'},  //modal is closed
        function(results, textStatus, jqXH){
            for(var key in results.graphs){
                oMyGraphs[key]=results.graphs[key];
                $dtMyGraphs.fnAddData(oMyGraphs[key]);
            }
        }
    );
}

function getMySets(){
    callApi({'command':	'GetMySets', modal:"persist"},
        function(results, textStatus, jqXH){
            var sets=[], set;
            for(var sHandle in results.sets){
                results.sets[sHandle].savedt = parseInt(results.sets[sHandle].savedt);
                set = new MD.Set(results.sets[sHandle]); //if exists, it will be overwritten with new data
                oMySets[sHandle] = set;
                sets.push(set);  //takes an array or object, not an object
            }
            $dtMyData.fnClearTable();
            $dtMyData.fnAddData(sets);
        }
    );
}

//TODO:  updateMySeries should be eliminated because either token will provide direct access to user account or MD will wait until user is logged in to load to cloud
function updateMySeries(oSeries){   //add or deletes to MySeries db
    if(notLoggedInWarningDisplayed()) return false;
    callApi({
            command:	'ManageMySeries',
            modal: "none",
            jsts: oSeries.savedt,
            handle:  oSeries.handle,
            to:		oSeries.save  //"H" for history, "S" for saved, null to remove
        },
        function(results, textStatus, jqXH){}
    );
}

function addMySeriesRow(oMD){  //add to table and to oMySets
    //TODO:  need to update existing panelGraphs if update.  Note new oPanelGraph objects should always be created using the freshest oMySets.');
    if(oMD.handle){
        if(oMD.savedt) oMD.savedt = parseInt(oMD.savedt);
        if(oMySets[oMD.handle]){
            //still need to check if it is a row.  There are lots of things in the oMySets trunk...
            var $trSeries = $dtMyData.find("button[data='" + oMD.handle + "']").closest('tr');
            if($trSeries.length==1){
                //$dtMyData.fnUpdate(oMD, trSeries); < problem will the delete cell.   easrier just to delete and add
                $dtMyData.fnDeleteRow($trSeries.get(0));
            }
        }
        $dtMyData.fnAddData(oMD);
        oMySets[oMD.handle] = oMD; //if exists, overwrite with new
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

//GRAPHING FUNCTIONS (note:  most graphing routines are in grapher.js)

function deleteMySeries(){  //remove all series in quickView from users MySeries
    //$quickViewRows array is only filled when previewing MySeries
    var obj;
    dialogShow("confirm deletion",
        dialogues.deleteMySeries,
        [
            {text: 'delete',id:'btn-delete',
                click:  function() {
                    for(var i=0;i<$quickViewRows.length;i++){
                        obj = $dtMyData.fnGetData($quickViewRows.get(i));
                        if(account.loggedIn()){
                            obj.save = null;
                            updateMySeries(obj);  //delete from DB
                        }
                        delete oMySets[obj.handle];
                        $dtMyData.fnDeleteRow($quickViewRows.get(i));
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
function removeTab(evt){ //accept either the span event object or the panel
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
                return encodeURI('t=cs'+($search.hasClass(gi)?'':'&s='+$search.val()+'&f='+$('#series_search_freq').val())+'&api='+$('#series_search_source').val()+'&sets='+$('#public-settype-radio').find('input:checked').val()+'&map='+$('#find-data-map').val());
            }
        case '#myGraphs':
            $search = $('#my_graphs_table_filter input');
            return encodeURI('t=mg'+($search.hasClass(gi)?'':'&s='+$search.val()));
        case '#publicGraphs':
            $search =$('#public_graphs_search input');
            return encodeURI('t=cg'+($search.hasClass(gi)?'':'&s='+$search.val()));
        default:
            var visiblePanel = MD.grapher.visiblePanelId();
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

function downloadMap(panelID, format){
    //format = 'image/jpeg';  //'application/pdf',
    var svg = $('#'+ panelID + ' div.mashabledata_jvmap div').html();
    var mapBackground = panelGraphs[panelID].mapconfig.mapBackground || globals.mapBackground;
    svg = cleanMapSVG(svg, mapBackground);
    downloadMadeFile({
        type: format,
        filename: 'MashableDataMap',
        width: 2000,
        svg: svg,
        url: 'https://www.mashabledata.com/workbench/export/index.php'
    });

}

function cleanMapSVG(svg, mapBackground){
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

function downloadGraphData(panelId){
    var grids = [], oGraph = panelGraphs[panelId];
    if(oGraph.plots) grids.push({name: 'chart', grid: makeDataGrid(panelId, 'chart', oGraph.calculatedMapData)});
    if(oGraph.mapsets){ //calculatedMapData must already be made for each mapplot
        for(var i=0; oGraph.mapsets.length;i++){
            grids.push({name: 'regions '+i, grid: makeDataGrid(panelId, 'regions', oGraph.mapsets[i].calculatedMapData, oGraph.mapsets[i])});
        }
    }
    if(oGraph.pointsets) grids.push({name: 'markers', grid: makeDataGrid(panelId, 'markers', oGraph.calculatedMapData)});
    console.info(grids);
    //do the highcharts trick to download a file
    downloadMadeFile({
        filename: oGraph.title,
        data: JSON.stringify(grids),
        url: 'excel.php'  //page of server that use PHPExcel library to create a workbook
    });
}

function makeDataGrid(panelId, type, mapData, mapPlot){  //create tables in data tab of data behind the chart, the map regions, and the map markers
    var hasMap, hasChart, m, r, i, p, c, plot, component, d, row, compData, serie, jsdt, mdPoint, mdDate;
    var oGraph = panelGraphs[panelId];
    var assets = oGraph.assets;
    var rowPosition = globals.rowPosition;
    var regionCode, region, dt, regions = [], freq;
    if(oGraph.plots){
        var chart = oGraph.controls.chart;
        hasChart = true;
    } else {
        hasChart = false;
    }
    if(oGraph.map){
        hasMap = true;
        var $map = $('#' + panelId + ' .mashabledata_jvmap').vectorMap('get', 'mapObject');
    } else {
        hasMap = false;
    }
    /*
     strategy:
     1.  separate tables (tabs) for chart, map regions, map markers
     2.  build array of arrays on the fly, each plot at a time
     2.  each row contains the full set of assets and calculated data
     3.  header:  name, units, symbol, source
     4.  skip the calculated column when formula = A & no unit or name changes
     5.  insert row where date DNE
     */

    //create a structure to put all data and results into
    var grid = [
        ['name:'],     //name of component or plot (plot names are bolded); component column removed if straight through plot
        ['units:'],
        ['source:'],
        ['notes:'],
        ['region code:'], //row deleted if empty at func end
        ['lat, lon:'],  //row deleted if empty at func end
        ['date:']   // for successive columns:  formula for plot or variable (e.g.: "a") for component
    ];

    switch(type){
        case 'chart':

            for(p=0;p<oGraph.plots.length;p++){
                plot = oGraph.plots[p];
                serie = chart.get('P'+p);

                var showComponentsAndPlot = plot.components.length>1 || (plot.formula().length>1) || plot.options.units || plot.options.name;
                for(c=0;c<plot.components.length;c++){
                    component = plot.components[c];
                    grid[rowPosition.name].push((showComponentsAndPlot?'':'<b>') + component.name() + (showComponentsAndPlot?'':'</b>'));
                    grid[rowPosition.units].push(component.units);
                    grid[rowPosition.source].push('<a href="'+ component.url +'">' + component.src + '</a>');
                    grid[rowPosition.notes].push(component.notes);
                    grid[rowPosition.region].push(component.geoname?component.geoname:'');
                    grid[rowPosition.lat_lon].push(component.latlon);
                    grid[rowPosition.date].push(showComponentsAndPlot?plot.compSymbol(c):'values');
                    makeSquare();
                    compData = component.data;
                    for(d=0;d<compData.length;d++){
                        mdPoint = compData[d].split(':');
                        jsdt = dateFromMdDate( mdPoint[0], component.freq);
                        mdDate = MD.grapher.formatDateByPeriod(jsdt.getTime(), serie.options.freq);
                        if((!oGraph.start || oGraph.start<=jsdt) && (!oGraph.end || oGraph.end>=jsdt)){
                            //search to see if this date is in gridArray
                            for(row=rowPosition.dataStart;row<grid.length;row++){
                                if(grid[row][0].dt.getTime() == jsdt.getTime()) {
                                    break;
                                }
                                if(grid[row][0].dt.getTime() > jsdt.getTime()){
                                    grid.splice(row,0,new Array(grid[0].length));
                                    grid[row][0] = {dt: jsdt, s: mdDate};
                                    break;
                                }
                            }
                            if(row==grid.length) {
                                grid.push(new Array(grid[0].length));
                                grid[row][0] = {dt: jsdt, s: mdDate};
                            }
                            if(grid[row][0].s.length<mdDate.length) grid[row][0].s = mdDate;  //replace year with month or longer formatted output
                            grid[row][grid[0].length-1] = mdPoint[1];  //actually set the value!
                        }
                    }
                }
                if(showComponentsAndPlot){
                    grid[rowPosition.name].push('<b>' + serie.name + '</b>');
                    grid[rowPosition.units].push(serie.yAxis.axisTitle.text);
                    grid[rowPosition.source].push('calculated');
                    grid[rowPosition.notes].push('');
                    grid[rowPosition.region].push('');
                    grid[rowPosition.lat_lon].push('');
                    grid[rowPosition.date].push((plot.formula()));
                    makeSquare();
                    for(d=0;d<serie.data.length;d++){
                        mdDate = MD.grapher.formatDateByPeriod(serie.data[d].x, serie.options.freq);
                        //search to see if this date is in gridArray
                        if((!oGraph.start || oGraph.start<=serie.data[d].x) && (!oGraph.end || oGraph.end>=serie.data[d].x)){
                            for(row=rowPosition.dataStart;row<grid.length;row++){
                                if(grid[row][0].dt.getTime() == serie.data[d].x) break;
                                if(grid[row][0].dt.getTime() > serie.data[d].x){
                                    grid.splice(row,0,new Array(grid[0].length));
                                    grid[row][0] = {dt: serie.data[d].x, s: mdDate};
                                    break;
                                }
                            }
                            if(row==grid.length){
                                grid.push(new Array(grid[0].length));
                                grid[row][0] = {dt: serie.data[d].x, s: mdDate};
                            }
                            if(grid[row][0].s.length<mdDate.length) grid[row][0].s = mdDate;  //replace year with month or longer formatted output
                            grid[row][grid[0].length-1] = serie.data[d].y;  //actually set the value!
                        }
                    }
                }
            }
            break;
//REGIONS
        case 'regions':
            freq = mapData.freq;
            var regionName;
            for(dt in mapData.regionData){
                for(regionCode in mapData.regionData[dt]){
                    try{  //bunnies not in jVectmap and getRegionName function does not handle these gracefully!
                        regionName = $map.getRegionName(regionCode)
                        regions.push({"regionCode": regionCode, "name": regionName});
                    } catch(ex){
                        //try to get the geoname from the assets
                        regionName = false;
                        oGraph.eachComponent(function(){
                            if(!regionName) return;
                            if(this.isMapSet() && this.data && this.data[regionCode] && this.data[regionCode].geoname){
                                regionName = this.data[regionCode].geoname;
                                regions.push({"regionCode": regionCode, "name": regionName});
                            }
                        });
                    }
                }
                regions.sort(function(a,b){  //should the sort be by code or by region name?  Code would lump region under the country
                    return a.name > b.name?1:-1;  //alphabetize by region name
                });
                break;  //only need first set to get all of the regions (note: all regions element present for each data object (i.e this is a square data set))
            }
            console.info(regions);
            var showComponents = mapPlot.components.length>1 || (mapPlot.formula().length>1) || mapPlot.options.units;
            for(r in regions){ //main loop (like plot loop for chart data)
                region = regions[r];
                for(c=0;c<mapPlot.components.length;c++){
                    component = mapPlot.components[c];
                    if(component.isMapSet()){
                        freq = assets[component.handle()].freq;
                        var asset = assets[component.handle()].data[region.regionCode];
                        if(asset){   //mapsets may be not have all regions
                            grid[rowPosition.units].push(assets[component.handle()].units);
                            grid[rowPosition.source].push('');  //TODO: src and url for mapset series
                            grid[rowPosition.notes].push('');  //TODO: note for mapset series
                            grid[rowPosition.region].push(region.regionCode);
                        }
                    } else {
                        asset = assets[component.handle()];
                        freq = asset.freq;
                        grid[rowPosition.units].push(asset.units);
                        grid[rowPosition.source].push('<a href="'+ asset.url +'">' + asset.src + '</a>');
                        grid[rowPosition.notes].push(asset.notes);
                        grid[rowPosition.region].push(asset.iso1366?asset.iso1366:'');
                    }
                    if(asset){  //mapsets may be not have all regions
                        makeSquare();
                        //grid[rowPosition.lat_lon].push((asset.lat)?'"' + asset.lat + ', ' + asset.lon + '"':'');
                        grid[rowPosition.name].push((showComponents?'':'<b>') + component.setname);
                        grid[rowPosition.date].push(showComponents?String.fromCharCode('a'.charCodeAt(0)+c):'values');
                        compData = asset.data.split('|');
                        for(d=0;d<compData.length;d++){
                            mdPoint = compData[d].split(':');
                            jsdt = dateFromMdDate( mdPoint[0], freq);
                            mdDate = MD.grapher.formatDateByPeriod(jsdt.getTime(), freq);
                            for(row=rowPosition.dataStart;row<grid.length;row++){  //find the row on which the dates line up
                                if(grid[row][0].dt.getTime() == jsdt.getTime()) break;
                                if(grid[row][0].dt.getTime() > jsdt.getTime()){  //need to insert new row
                                    grid.splice(row,0,new Array(grid[0].length));
                                    grid[row][0] = {dt: jsdt, s: mdDate};
                                    break;
                                }
                            }
                            if(row==grid.length){  //need to append new row
                                grid.push(new Array(grid[0].length));
                                grid[row][0] = {dt: jsdt, s: mdDate};
                            }
                            if(grid[row][0].s.length<mdDate.length) grid[row][0].s = mdDate;  //replace year with month or longer formatted output
                            grid[row][grid[0].length-1] = mdPoint[1];  //actually set the value!
                        }
                    }
                }
                if(showComponents){  //need to show calculated values
                    grid[rowPosition.units].push(mapPlot.options.units || assets[mapPlot.components[0].handle].units);
                    grid[rowPosition.source].push('calculated');
                    grid[rowPosition.notes].push('');
                    grid[rowPosition.region].push(region.regionCode);
                    grid[rowPosition.lat_lon].push('');
                    grid[rowPosition.name].push('<b>' + 'calculated' + '</b>');
                    grid[rowPosition.date].push(mapPlot.formula() || 'y = a');
                    makeSquare();
                    for(i=0;i<mapData.dates.length;i++){
                        if(mapData.regionData[mapData.dates[i].s]) {
                            jsdt = mapData.dates[i].dt;
                            mdDate = mapData.dates[i].s;
                            for(row=rowPosition.dataStart;row<grid.length;r++){  //find the row on which the dates line up
                                if(grid[row][0].dt.getTime() == jsdt.getTime()) break;
                                if(grid[row][0].dt.getTime() > jsdt.getTime()){  //need to insert new row
                                    grid.splice(row,0,new Array(grid[0].length));
                                    grid[row][0] = {dt: jsdt, s: mdDate};
                                    break;
                                }
                            }
                            if(row==grid.length){  //need to append new row
                                grid.push(new Array(grid[0].length));
                                grid[row][0] = {dt: jsdt, s: mdDate};
                            }
                            if(grid[row][0].s.length<mdDate.length) grid[row][0].s = mdDate;  //replace year with month or longer formatted output
                            grid[row][grid[0].length-1] = mapData.regionData[mapData.dates[i].s][region.regionCode];  //actually set the value!
                        }
                    }
                }
            }
            break;
        case 'markers':
            freq  = mapData.freq;
            var vectors = [];
            for(p=0;p<oGraph.pointsets.length;p++){
                for(c=0;c<oGraph.pointsets[p].components.length;c++){
                    if(vectorPattern.test(oGraph.pointsets[p].components[c].handle)) vectors.push(oGraph.pointsets[p].components[c].handle);
                }
            }
            for(var v=0;v<vectors.length;v++){
                asset = oGraph.assets[vectors[v]];
                grid[rowPosition.name].push(asset.geoid);
                grid[rowPosition.units].push(asset.units);
                grid[rowPosition.source].push(asset.source);
                grid[rowPosition.notes].push(asset.notes);
                grid[rowPosition.region].push(asset.geoname);
                grid[rowPosition.lat_lon].push(asset.lat ? asset.lat + ', ' + asset.lon : '' );
                grid[rowPosition.date].push(vectors[v]);
                addDataToGrid(asset.data, asset.freq);  // everything happens here!
            }
            var markers = [];  //used to order from East to West
            for(m in mapData.markers) {
                markers.push({marker: m, lon: mapData.markers[m].latLng[1]});
            }
            markers.sort(function(a,b){return a.lon- b.lon});
            for(m=0; m<markers.length; m++){
                markerKey = markers[m].marker; //this can be a complex handle
                handles =  markerKey.match(handlePattern);
                for(i=0; i<handles.length;i++){
                    if(vectors.indexOf(handles[i]) == -1){ //make sure series is in pointset and not a 1D vector
                        for(var key in oGraph.assets){
                            if(key[0]=='X'){
                                if(oGraph.assets[key].data[handles[i]]){
                                    grid[rowPosition.name].push(oGraph.assets[key].data[handles[i]].name);
                                    grid[rowPosition.units].push(oGraph.assets[key].units);
                                    grid[rowPosition.source].push('');
                                    grid[rowPosition.notes].push('');
                                    grid[rowPosition.region].push('');//TODO: get geoname from db when fetching asset
                                    grid[rowPosition.lat_lon].push(oGraph.assets[key].coordinates[handles[i]].latLng ? oGraph.assets[key].coordinates[handles[i]].latLng[0] + ', ' + oGraph.assets[key].coordinates[handles[i]].latLng[1] : '' );
                                    grid[rowPosition.date].push('values');
                                    addDataToGrid(oGraph.assets[key].data[handles[i]].data, oGraph.assets[key].freq);  // everything else happens here!
                                    break;
                                }
                            }
                            if(key[0]=='M'){
                                //TODO: add mapset search code here
                            }
                        }
                    }
                }
                if(handles.length>1 || markerKey!=handles[0]){ //this is a calculated series (not a director single-series) therefore show the final value.
                    grid[rowPosition.name].push(mapData.markers[markerKey].name);
                    //grid[rowPosition.units].push(oGraph.assets[key].units);
                    grid[rowPosition.source].push('');
                    grid[rowPosition.notes].push('');
                    grid[rowPosition.region].push('');//TODO: get geoname from db when fetching asset
                    grid[rowPosition.lat_lon].push(mapData.markers[markerKey].latLng[0] + ', ' + mapData.markers[markerKey].latLng[1]);
                    grid[rowPosition.date].push(markerKey);
                    makeSquare();
                    for(date in mapData.markerData){
                        addPointToGrid(date + '|' + mapData.markerData[date][markerKey], mapData.freq);  // everything else happens here!
                    }
                }
            }
            break;
    }
    for(row=rowPosition.dataStart;row<grid.length;row++){
        grid[row][0] = grid[row][0].s;  //replace the object with its MDdate string
    }
    return grid;

    //helper functions
    function addDataToGrid(mdData, freq){  //helper function for
        makeSquare();
        var d, mdPoint, row, jsdt, mdDate;
        var dataArray = mdData.split('|');
        for(d=0; d<dataArray.length; d++){
            addPointToGrid(gdataArray[d], freq);
        }
    }

    function makeSquare(){
        var length = grid[0].length;
        for(var row=1;row<grid.length;row++){
            if(grid[row].length<length)grid[row].push('');  //even out array to ensure the grid is square 2-D array of arrays
        }
    }

    function addPointToGrid(point, freq){
        var jsdt, mdDate, row;
        mdPoint = point.split(':');
        jsdt = dateFromMdDate(mdPoint[0], freq);
        mdDate = MD.grapher.formatDateByPeriod(jsdt.getTime(), freq);
        for(row=rowPosition.dataStart;row<grid.length;row++){  //find the row on which the dates line up
            if(grid[row][0].dt.getTime() == jsdt.getTime()) break;
            if(grid[row][0].dt.getTime() > jsdt.getTime()){  //need to insert new row
                grid.splice(row,0,new Array(grid[0].length));
                grid[row][0] = {dt: jsdt, s: mdDate};
                break;
            }
        }
        if(row==grid.length){  //need to append new row
            grid.push(new Array(grid[0].length));
            grid[row][0] = {dt: jsdt, s: mdDate};
        }
        if(grid[row][0].s.length<mdDate.length) grid[row][0].s = mdDate;  //replace year with month or longer formatted output
        grid[row][grid[0].length-1] = mdPoint[1];  //actually set the value!
    }
}
