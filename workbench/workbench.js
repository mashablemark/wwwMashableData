/**
 * Created with JetBrains PhpStorm.
 * User: mark__000
 * Date: 2/18/13
 * Time: 9:04 PM
 * To change this template use File | Settings | File Templates.
 */
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


//ERASE AFTER TESTING
var hexcase=0;var b64pad="";function hex_sha1(a){return rstr2hex(rstr_sha1(str2rstr_utf8(a)))}function hex_hmac_sha1(a,b){return rstr2hex(rstr_hmac_sha1(str2rstr_utf8(a),str2rstr_utf8(b)))}function sha1_vm_test(){return hex_sha1("abc").toLowerCase()=="a9993e364706816aba3e25717850c26c9cd0d89d"}function rstr_sha1(a){return binb2rstr(binb_sha1(rstr2binb(a),a.length*8))}function rstr_hmac_sha1(c,f){var e=rstr2binb(c);if(e.length>16){e=binb_sha1(e,c.length*8)}var a=Array(16),d=Array(16);for(var b=0;b<16;b++){a[b]=e[b]^909522486;d[b]=e[b]^1549556828}var g=binb_sha1(a.concat(rstr2binb(f)),512+f.length*8);return binb2rstr(binb_sha1(d.concat(g),512+160))}function rstr2hex(c){try{hexcase}catch(g){hexcase=0}var f=hexcase?"0123456789ABCDEF":"0123456789abcdef";var b="";var a;for(var d=0;d<c.length;d++){a=c.charCodeAt(d);b+=f.charAt((a>>>4)&15)+f.charAt(a&15)}return b}function str2rstr_utf8(c){var b="";var d=-1;var a,e;while(++d<c.length){a=c.charCodeAt(d);e=d+1<c.length?c.charCodeAt(d+1):0;if(55296<=a&&a<=56319&&56320<=e&&e<=57343){a=65536+((a&1023)<<10)+(e&1023);d++}if(a<=127){b+=String.fromCharCode(a)}else{if(a<=2047){b+=String.fromCharCode(192|((a>>>6)&31),128|(a&63))}else{if(a<=65535){b+=String.fromCharCode(224|((a>>>12)&15),128|((a>>>6)&63),128|(a&63))}else{if(a<=2097151){b+=String.fromCharCode(240|((a>>>18)&7),128|((a>>>12)&63),128|((a>>>6)&63),128|(a&63))}}}}}return b}function rstr2binb(b){var a=Array(b.length>>2);for(var c=0;c<a.length;c++){a[c]=0}for(var c=0;c<b.length*8;c+=8){a[c>>5]|=(b.charCodeAt(c/8)&255)<<(24-c%32)}return a}function binb2rstr(b){var a="";for(var c=0;c<b.length*32;c+=8){a+=String.fromCharCode((b[c>>5]>>>(24-c%32))&255)}return a}function binb_sha1(v,o){v[o>>5]|=128<<(24-o%32);v[((o+64>>9)<<4)+15]=o;var y=Array(80);var u=1732584193;var s=-271733879;var r=-1732584194;var q=271733878;var p=-1009589776;for(var l=0;l<v.length;l+=16){var n=u;var m=s;var k=r;var h=q;var f=p;for(var g=0;g<80;g++){if(g<16){y[g]=v[l+g]}else{y[g]=bit_rol(y[g-3]^y[g-8]^y[g-14]^y[g-16],1)}var z=safe_add(safe_add(bit_rol(u,5),sha1_ft(g,s,r,q)),safe_add(safe_add(p,y[g]),sha1_kt(g)));p=q;q=r;r=bit_rol(s,30);s=u;u=z}u=safe_add(u,n);s=safe_add(s,m);r=safe_add(r,k);q=safe_add(q,h);p=safe_add(p,f)}return Array(u,s,r,q,p)}function sha1_ft(e,a,g,f){if(e<20){return(a&g)|((~a)&f)}if(e<40){return a^g^f}if(e<60){return(a&g)|(a&f)|(g&f)}return a^g^f}function sha1_kt(a){return(a<20)?1518500249:(a<40)?1859775393:(a<60)?-1894007588:-899497514}function safe_add(a,d){var c=(a&65535)+(d&65535);var b=(a>>16)+(d>>16)+(c>>16);return(b<<16)|(c&65535)}function bit_rol(a,b){return(a<<b)|(a>>>(32-b))};

var iconsHMTL= {
    mapset: '<span class="ui-icon ui-icon-mapset" title="This series is part of a map set."></span>',
    pointset: '<span class="ui-icon ui-icon-pointset" title="This series is part of a point set."></span>'
};
//GLOBAL VARIABLES
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
    count: 60
};
var layoutDimensions= {
    heights: {
//        graphTabsMinGap: 30,
        graphTabsGap: null,
        tableControls: 42,
        innerDataTable: null,
        scrollHeads: null,
        windowMinimum: 580
    },
    widths: {
        windowMinimum: 750
    }
};
var MY_SERIES_DATE = 9, MY_SERIES_CHECK_COL = 1;  //important column indexes used for ordering
var nonWhitePattern = /\S/;  //handy pattern to check for non-whitespace
//Datatable variables set after onReady calls to... , setupMySeriesTable, setupMySeriesTable, and setupMySeriesTable,
var dtMySeries = null; //...setupMySeriesTable
var dtPublicSeries = null;  //...setupPublicSeriesTable
var dtMyGraphs = null;    //...setupMyGraphsTable
var dtPublicGraphs = null;   //...setupPublicGraphsTable
var checkedCount = 0;  //record of how many MySeries are checked
var searchCatId=0;  //set on API browser selection, clear on public series search text change
var lastSeriesSearch="", lastGraphSearch=""; //kill column sorting on new searches.  Sort is by name length asc to show most concise (best fit) first
//var activeSeriesSearch=false; //used to avoid double search when clearing sort order
//These 2 master objects contain representations of MySeries and MyGraphs.  They are filled by API calls and in turn are used populate the datatables
var oMySeries = {};  //referenced by 'S'+seriesid (i.e. oMySeries['S173937']). Filled from localstatoraged, API.getMySeries (header only; no data for speed), and when series is added from PublicSeries viewer.  Data fetched as needed.  Used to populate graph data (and vice-versa ) as possible.
//var oPublicSeries = {}; //NOT USED. DataTables fetches directly from API.SearchSeries = endless scroll style fetch
var oMyGraphs = {};  //complete fetch from API.GetMyGraphs.  Kept in sync with cloud by API.ManageMyGraphs and API.DeleteMyGraphs
//var oPublicGraphs = {};  //NOT USED.  DataTables fetches directly from API.SearchGraphs = endless scroll style fetch TODO: show button not programmed

var oPanelGraphs = {}; //oMyGraphs objects are copied and referenced by the tab's panelID (i.e. oPanelGraphs['graphTab1']).  Kept in sync by UI events.  Used by save/publish operations.
var oHighCharts = {}; //contained objects return by Highcharts.chart call referenced by panelID as per oPanelGraphs

//variables used to keep track of datatables detail rows opened and closed with dt.fnopen() dt.fnclose() calls
var anOpenRowsMySeries = []; //used in obselete OpenCloseMySeries (calling writeDrilldownMySreies).  Future state: allows investigation and navigation of series source api (i.e. FRED or World Bank) categories one row at a time
//var anOpenRowsPublicSeries = []; //not coded up
//var anOpenRowsMyGraphs = [];     //not coded up
//var anOpenRowsPublicGraphs = []; //not coded up

var editingPanelId = null;  //TODO:  phase out as global var.  (was used for editing a graph's series list via the MySeries panel.  Replaced by graph's series provenance panel and by add to graph from quickViews.
var mySeriesLoaded = false;
var apis = false;

var $graphTabs;  //jQuery UI tabs object allows adding, remove, and reordering of visualized graphs
var tab_counter = 1; //incremented with each new $graphTabs and used to create unqiueID.  Not a count, as tab can be deleted!
var localSeriesIndex = 0;  //used to give localSeries from chart plugin unique handles when user is not logged in

var oQuickViewSeries; //global storage of last series quick-viewed.  Used by "Add to my Series" and "add to Graph" button functions.
var quickChart;
var newPlotIDCounter = -1; //new plots get negative ids (i.e. 'P-8-') which get positive DB identifers on save (the trailing '-' prevents search and replace confusion
//authentication variables
var myPreferences = {uselatest: 'N'};
var lastTabAnchorClicked;  //when all graphs are deleted, this gets shown

var parsingHash = false;

if(typeof console == 'undefined') console = {info: function(m){}, log: function(m){}, time: function(m){}, timeEnd: function(m){}};  //prevents IE from breaking

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
    //load all the necessary files that were not loaded at startup for fast initial load speed (not charts and maps loaded from graph.js)
    require(["/global/js/handsontable/jquery.handsontable.0.7.5.src.js","/global/js/contextMenu/jquery.contextMenu.1.5.14.src.js"]);

    addJQueryStringify();   // add extension after jQuery guaranteed to be loaded
    $('#quick-view-to-series').button({icons: {secondary: "ui-icon-person"}});
    $('button.quick-view-maps').button({icons: {secondary: "ui-icon-flag"}});
    $('#quick-view-to-graph').button({icons: {secondary: "ui-icon-image"}});
    $('#quick-view-close').button({icons: {secondary: "ui-icon-close"}});

    $(".show-graph-link").fancybox({
        'width'             :  '100%',
        'height'            : '100%',
        'autoScale'         : true,
        'showCloseButton'   : false,
        //'overlayOpacity'    : 0,
        'transitionIn'		: 'none',
        'transitionOut'		: 'none'
    });
    jQuery.fancybox.center = function() {};  //KILLS fancybox.center() !!!
    $(".showTitleEditor").fancybox({
        'height'            : '35px',
        'left'              : '55px',
        'top'               : '55px',
        'autoDimensions'    : false,
        'autoScale'         : false,
        'showCloseButton'   : false,
        'transitionIn'		: 'none',
        'transitionOut'		: 'none'
    });
    $("#show-hide-pickers").button({icons: {secondary: "browse-rollup"}});
    $("#menu-account").button({icons: {secondary: "ui-icon-triangle-1-s"}})
        .click(function(){
            account.showSignInOut();
        });
    $("#menu-help").button({icons: {secondary: "ui-icon-help"}})
        .click(function(){

        });
    lastTabAnchorClicked = $("#series-tabs li a").click(function (){seriesPanel(this)}).filter("[data='#local-series']").get(0);
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
        tabTemplate: '<li class="graph-tab"><a href="#{href}">#{label}</a> <span class="ui-icon ui-icon-close" onclick="removeTab(this)">Remove Tab</span></li>',
        add: function(event, ui) {
            var tab_content = 'Loading graph.  Please wait.';
            return($(ui.panel).append('<p>'+tab_content + '</p>'));
        },
        activate: function(event, ui){
            setPanelHash();
        }
    });

    //TODO: remove this localhost workaround
    if(document.URL.indexOf('localhost')>=0){
        account.info.userId = 2;
        account.info.accessToken = 'AAACZBVIRHioYBAKJp0bvvwdDKYmnUAwYcjRn4dCeCZCriYZAiDIU85IucIt0pDrEK7wvIqRAImAvbQdbltGhcvbGxZCUDusDFdw6BSt5wwZDZD';
        syncMyAccount();
    } else {
        initFacebook();  //intialized the FB JS SDK.  (Does not make user login, but will automatically authenticate a FB user who is (1) logged into FB and (2) has authorized FB to grant MashableData basic permissions
    }

    $(window).bind("resize load", resizeCanvas()).bind("focus", function(event){
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
    //$("div.dataTables_scrollBody").height(layoutDimensions.heights.innerDataTable);  //set within resize() too

    $("div.dataTables_scrollBody").height(layoutDimensions.heights.innerDataTable); //resizeCanvas already called, but need this after datatable calls

    $('#seriesSearchBtn, #graphsSearchBtn').addClass('ui-state-active').button({icons: {secondary: 'ui-icon-search'}});
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
                    $search.val(decodeURI(oH.s));
                }
                break;
            case 'cs': //cloud series
                $('#series-tabs').find('li.cloud-series a').click();
                $search = $('#series_search_text');
                if(oH.s && decodeURI(oH.s)!=$search.val()){
                    $search.val(decodeURI(oH.s));
                    $('#seriesSearchBtn').click();  //to exec search
                }
                $('#series_search_periodicity').val(oH.f||'all'); //search executes on periodicity change
                $('#series_search_source').val(oH.api||'all'); //search executes on API change
                $('#public-mapset-radio').find('input[value='+(oH.sets||'all')+']').click(); //search executes on sets change
                break;
            case 'mg': //my graphs
                $('#series-tabs').find('li.my-graphs a').click();
                $search = $('#my_graphs_table_filter').find('input');
                if(oH.s && decodeURI(oH.s)!=$search.val()){
                    $search.val(decodeURI(oH.s));
                }
                break;
            case 'cg': //cloud graphs
                $('#series-tabs').find('li.public-graphs a').click();
                $search = $('#public_graphs_search').find('input');
                if(oH.s && decodeURI(oH.s)!=$search.val()){
                    $search.val(decodeURI(oH.s));
                    seriesCloudSearch(true);
                }
                break;
            default: //graphTab
                var $graphTab = $('#graph-tabs').find('a[href=#graphTab'+oH.t.substr(1)+']');
                if($graphTab.length==1) {
                    $graphTab.click();
                } else {
                    if(oH.graphcode){
                        for(var g in oPanelGraphs){
                            if(oPanelGraphs[g].ghash==oH.graphcode){
                                var $tab = $('#graph-tabs a[href=\'#'+oH.graphcode+'\']');
                                if($tab.length==1) {
                                    var found = true;
                                    $tab.click();
                                }
                            }
                        }
                        if(!found){
                            viewGraph(oH.graphcode);
                        }
                    }
                }
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
    var winHeight = Math.max(window.innerHeight-10, layoutDimensions.widths.windowMinimum);
    var winWidth = Math.max(window.innerWidth-10, layoutDimensions.widths.windowMinimum);
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
    //dtPublicSeries.height((layoutDimensions.heights.canvas-layoutDimensions.heights.graphTabsGap)-layoutDimensions.heights.tableControls-$("div#cloud-series div.dataTables_scrollHead").height());

}
function setupMySeriesTable(){
    var tableWidth = $("#canvas").width()-160;
    var remainingWidth =  tableWidth - (colWidths.quickView + colWidths.checkbox + colWidths.periodicity + 2*colWidths.shortDate  + colWidths.src + colWidths.shortDate);
    var unitsColWidth = parseInt(remainingWidth * 0.20);
    var seriesColWidth = parseInt(remainingWidth * 0.55);
    var graphColWidth = parseInt(remainingWidth * 0.25);

    dtMySeries = $('#series-table').html('').dataTable({
        "bProcessing": true,
        "sDom": 'frti',
        "bPaginate": false,
        "bFilter": true,
        "bAutoWidth": false,
        /*"oColReorder": {"iFixedColumns": 2},*/
        "fnInfoCallback": function( oSettings, iStart, iEnd, iMax, iTotal, sPre ) {return 'showing ' + ((iMax==iTotal)?'':(iTotal + ' of ')) + iMax + ' series';},
        /*        "oColVis": {
         "bRestore": true,
         "aiExclude": [ 0,1]
         },*/
        "oLanguage": {
            "sSearch": ""
        },
        "sScrollY": (layoutDimensions.heights.innerDataTable-120) + "px", //extra for graph title
        "sScrollX": tableWidth + "px",
        "aaSorting": [[MY_SERIES_DATE,'desc']],
        "aoColumns": [
            { "mDataProp":null, "sTitle": "View", "sClass": "quick-view", "bSortable": true, "sWidth": colWidths.quickView + "px", "resize": false,
                "fnRender": function(obj) {
                    return '<button data="' + obj.aData.handle + '" onclick="getQuickViewData(this)">View</button>'
                }
            },
            {"mDataProp": "selected", "sTitle": "<span></span>", "sClass": 'dt-vw', "bSortable": true, "sWidth": colWidths.checkbox + "px", "resize": false,
                "fnRender": function(obj){
                    if(obj.aData.selected) {
                        return '<a class="select_cell md-checked rico" onclick="clickMySeriesCheck(this)" title="select series to graph"> Series selected (order ' + obj.aData.selected + '</a>';
                    } else {
                        return '<a class="select_cell md-check rico" onclick="clickMySeriesCheck(this)"  title="select series to graph">Not selected</a>';
                    }
                }
            },
            { "mDataProp": "name", "sTitle": "Series Name<span></span>", "sClass": 'sn', "bSortable": true, "sWidth": seriesColWidth + "px",
                "fnRender": function(obj){
                    return ((obj.aData.mapsetid)?iconsHMTL.mapset:'')
                        + ((obj.aData.pointsetid)?iconsHMTL.pointset:'')
                        + getValue(obj);
                }
            },
            { "mDataProp": "units", "sTitle": "Units<span></span>", "sClass": "units", "bSortable": true, "sWidth": unitsColWidth + "px",  "fnRender": function(obj){return getValue(obj)}},
            { "mDataProp": "period", "sTitle": "P<span></span>", "sClass": 'dt-freq', "bUseRendered":false, "bSortable": true, "sWidth": colWidths.periodicity + "px", "fnRender": function(obj){return formatPeriodWithSpan(obj.aData.period)}},
            { "mDataProp":"firstdt", "sTitle": "from<span></span>",  "sClass": "dte", "bUseRendered":false, "sWidth": colWidths.shortDate+"px", "bSortable": true, "asSorting":  [ 'desc','asc'],
                "fnRender": function(obj){return formatObjDate(obj)}
            },
            { "mDataProp":"lastdt", "sTitle": "to<span></span>",  "sClass": "dte", "bUseRendered":false, "sWidth": colWidths.shortDate+"px",  "bSortable": true, "asSorting":  [ 'desc','asc'], "resize": false,"fnRender": function(obj){return formatObjDate(obj)} },
            { "mDataProp": "graph", "sTitle": "Category<span></span>",  "bSortable": true, "sWidth": graphColWidth + "px", "fnRender": function(obj){return getValue(obj)}},
            { "mDataProp": null, "sTitle": "Source<span></span>", "sClass": 'dt-source',  "bSortable": false, "sWidth": colWidths.src + "px", "resize": false,
                "fnRender": function(obj){
                    if(obj.aData.handle[0]=='S') {
                        return formatAsUrl(obj.aData.url) + obj.aData.src;
                    } else {
                        return '<span class=" ui-icon ui-icon-person" title="user series"></span> ' +  obj.aData.src;
                    }
                }
            },
            { "mDataProp": "save_dt", "sTitle": "added<span></span>", "bSortable": true, "bUseRendered": false, "asSorting":  [ 'desc','asc'],  "sWidth": colWidths.shortDate + "px", "resize": false,
                "fnRender": function(obj){ return timeOrDate(getValue(obj))}
            }
        ]
    });
    $('#series-table_filter').appendTo('#series-bar-controls');
    $('#series-table_filter').append('<span id="filterReset" class="ui-icon ui-icon-circle-close-inactive" style="color:white;overflow:hidden;float:right;text-align:left;position:relative;top:3px;" onclick="$(\'#series-table_filter :input\').attr(\'value\',\'\').keyup();">clear filter</span>');
    $('#series-table_filter :input').keyup(function(){seriesFilterChange()}).css('width','300px');
    //$('#local-series .ColVis').parent().appendTo('#local-series-header fieldset:first');
    $('#series-table_info').appendTo('#local-series-header fieldset:first');
}
function setupPublicSeriesTable(){
    var tableWidth = $("#canvas").width()-8*11-40; //padding/borders/margins + scroll
    var remainingWidth =  tableWidth - (colWidths.quickView + colWidths.periodicity + colWidths.src + 2*colWidths.mmmyyyy);
    var seriesColWidth = remainingWidth * 0.4;
    var unitsColWidth = remainingWidth * 0.3;
    var graphColWidth = remainingWidth * 0.3;

    $('#tblPublicSeries').html('');
    dtPublicSeries =  $('#tblPublicSeries').dataTable({
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
                    console.log(data.command+" ("+data.search+"): "+data.exec_time);

                    fnCallback(data, textStatus, jqXHR);
                    //dtPublicSeries.selectable({filter: 'tr'});
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
            { "mDataProp":null, "sTitle": "View", "bSortable": false, "sWidth": colWidths.quickView + "px", "resize": false,
                "fnRender": function(obj) {
                    return '<button class="view" data="S' + obj.aData.seriesid + '" onclick="getQuickViewData(this)">View</button>'
                }
            },
            { "mDataProp":"name", "sTitle": "Series Name<span></span>", "bSortable": true, "sWidth": seriesColWidth + "px", "fnRender": function(obj){
                return ((obj.aData.mapsetid)?iconsHMTL.mapset:'')
                    + ((obj.aData.pointsetid)?iconsHMTL.pointset:'')
                    + formatAsSpanWithTitle(obj)
            }},
            { "mDataProp":"units", "sTitle": "Units<span></span>", "sWidth": unitsColWidth+"px", "bSortable": true, "fnRender": function(obj){return formatAsSpanWithTitle(obj)} },
            { "mDataProp":null, "sTitle": "P<span></span>", "sWidth": colWidths.periodicity+"px", "bSortable": true, "sClass": "dt-freq", "fnRender": function(obj){return formatPeriodWithSpan(obj.aData.period)} },
            { "mDataProp":"firstdt", "sTitle": "from<span></span>", "sClass": "dte",  "sWidth": colWidths.mmmyyyy+"px", "bSortable": true, "asSorting":  [ 'desc','asc'], "fnRender": function(obj){return spanWithTitle(formatObjDate(obj))}},
            { "mDataProp":"lastdt", "sTitle": "to<span></span>",  "sClass": "dte", "sWidth": colWidths.mmmyyyy+"px",  "bSortable": true, "asSorting":  [ 'desc','asc'], "resize": false,"fnRender": function(obj){return spanWithTitle(formatObjDate(obj))}},
            { "mDataProp":"title", "sTitle": "Category<span></span>", "sWidth": graphColWidth+"px", "bSortable": true,
                "fnRender": function(obj){
                    if(obj.aData.apiid!=null&&obj.aData.title!=null){
                        return '<span class="ui-icon browse-right" onclick="browseFromSeries('+ obj.aData.seriesid +')">browse similar series</span> ' + formatAsSpanWithTitle(obj);
                    } else {
                        return '<a class="link" onclick="getPublicSeriesByCat(this)">' + formatAsSpanWithTitle(obj) + '</a>'
                    }
                }
            },
            { "mDataProp":null, "sTitle": "Source<span></span>","bSortable": false, "sClass": 'url',  "sWidth": colWidths.src+"px", "resize": false, "fnRender": function(obj){return formatAsUrl(obj.aData.url) + obj.aData.src}}
            //{ "mDataProp":"capturedt", "sTitle": "Date Captured<span></span>",  "sWidth": colWidths.longDate+"px", "asSorting":  [ 'desc','asc'],  "sType": 'date'}
        ]
    });
    $('#tblPublicSeries_info').html('').appendTo('#cloud-series-search');
    $('#tblPublicSeries_filter').hide();
    $('#public-mapset-radio').buttonset().find("input").change(function(){seriesCloudSearch()});
    //dtPublicSeries.fnAdjustColumnSizing();
}
function setupMyGraphsTable(){
    var tableWidth = $("#canvas").width()-7*11-40;
    var remainingWidth =  tableWidth - (2*colWidths.quickView + colWidths.shortDate + colWidths.map);
    var titleColWidth = parseInt(remainingWidth * 0.25);
    var analysisColWidth = parseInt(remainingWidth * 0.50);
    var seriesColWidth = parseInt(remainingWidth * 0.25);
    dtMyGraphs = $('#my_graphs_table').html(' ').dataTable({
        "sDom": 'frti',
        "bFilter": true,
        "bPaginate": false,
        "bAutoWidth": false,
        "bProcessing": true,
        "bDestroy": true,
        "oLanguage": {
            "sSearch": ""
        },
        "oColReorder": {"iFixedColumns": 2},
        "oColVis": {
            "bRestore": true,
            "aiExclude": [ 0,1,2]
        },
        "sScrollY": (layoutDimensions.heights.innerDataTable-120) + "px",
        "sScrollX": tableWidth + "px",
        "aaSorting": [[9,'desc']],
        "aoColumns": [
            {"mDataProp":null, "bSortable": false, "sClass": 'show', "sWidth": colWidths.quickView + "px", "resize": false,
                "fnRender": function(obj) {
                    return '<button data="G' + obj.aData.gid + '" onclick="viewGraph(' + obj.aData.gid + ')">open</button>'}
            },
            {"mDataProp":"title", "sTitle": "Title<span></span>", "bSortable": true,  sClass: "wrap", "sWidth": titleColWidth+"px", "fnRender": function(obj){
                return getValue(obj)
            }},
            {"mDataProp":"analysis", "sTitle": "Analysis<span></span>", "bSortable": true, "sWidth": analysisColWidth+"px", "fnRender": function(obj){return formatAsSpanWithTitle(obj)} },
            {"mDataProp":"serieslist", "sTitle": "Series<span></span>", "bSortable": true,  "sWidth": seriesColWidth+"px", "fnRender": function(obj){return formatAsSpanWithTitle(obj)}},
            {"mDataProp":"map", "sTitle": "Map<span></span>", "bSortable": true,  "sWidth": colWidths.map+"px",
                "fnRender": function(obj){
                    return formatAsSpanWithTitle(obj)
                }
            },
            /* {"mDataProp":"from", "sTitle": "from<span></span>", "bSortable": true, "sType": 'date', "asSorting":  [ 'desc','asc'], "sClass": 'dte',  "sWidth": colWidths.shortDate + "px",
             "fnRender": function(obj){
             if(obj.aData.start==0 || obj.aData.start == null){
             var minFromSeries = null;
             for(var key in obj.aData.series){
             if(minFromSeries == null) minFromSeries =obj.aData.series[key];
             else if(obj.aData.series[key].firstdt<minFromSeries.firstdt) minFromSeries =obj.aData.series[key];
             }
             return formatDateByPeriod(minFromSeries.firstdt, minFromSeries.period);
             } else {
             return formatDateByPeriod(obj.aData.start,'M');
             }
             }
             },
             {"mDataProp":"to", "sTitle": "to<span></span>",  "bSortable": true,  "sType": 'date', "asSorting":  [ 'desc','asc'], "sClass": 'dte',  "sWidth": colWidths.shortDate + "px",
             "fnRender": function(obj){
             if(obj.aData.end==0 || obj.aData.end == null){
             var maxToSeries = null;
             for(var key in obj.aData.series){
             if(maxToSeries == null)maxToSeries =obj.aData.series[key];
             else if(obj.aData.series[key].lastdt>maxToSeries.lastdt) maxToSeries =obj.aData.series[key];
             }
             return formatDateByPeriod(maxToSeries.lastdt, maxToSeries.period);
             } else {
             return formatDateByPeriod(obj.aData.end,'M');
             }
             }
             },*/
            {"mDataProp":null, "sTitle": "Views<span></span>", "bSortable": true, "sClass": 'dt-count', "sWidth": colWidths.views + "px",
                "fnRender": function(obj){
                    if(obj.aData.published == 'N'){
                        return '<span class=" ui-icon ui-icon-locked" title="This graph has not been published.  You must publish your graphs from the graph editor">locked</span>';
                    } else {
                        return '<a href="view.php?g='+obj.aData.ghash+'">' + obj.aData.views + '</a>';
                    }
                }
            },
            {"mDataProp":"updatedt", "sTitle": "Created<span></span>", "bUseRendered": false, "asSorting":  [ 'desc','asc'], "sClass": 'dte', "sWidth": colWidths.shortDate + "px", "fnRender": function(obj){return  timeOrDate(getValue(obj))}}
        ]
    });
    $('#my_graphs_table_filter').appendTo('#myGraphsHeader fieldset:first');
    $('#my_graphs_table_filter').append('<span class="filterReset ui-icon ui-icon-circle-close-inactive" style="color:white;overflow:hidden;float:right;text-align:left;position:relative;top:3px;" onclick="$(\'#my_graphs_table_filter :input\').attr(\'value\',\'\').keyup();">clear filter</span>');
    $('#my_graphs_table_info').appendTo('#myGraphsHeader fieldset:first');
    $('#myGraphs .showhidecol').appendTo('#myGraphsHeader fieldset:first');
}
function setupPublicGraphsTable(){
    var tableWidth = $("#canvas").width()-6*11-40;
    var remainingWidth =  tableWidth - (colWidths.views + 1*colWidths.shortDate + colWidths.map);
    var titleColWidth = parseInt(remainingWidth * 0.40);
    var analysisColWidth = parseInt(remainingWidth * 0.35);
    var seriesColWidth = parseInt(remainingWidth * 0.25);
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
                "success": fnCallback,
                "complete": function(results){
                    console.log(results)
                }
            });
        },
        "fnInfoCallback": function( oSettings, iStart, iEnd, iMax, iTotal, sPre ) {
            return iTotal + " series";
        },
        "oColVis": {
            "bRestore": true,
            "aiExclude": [ 0,1,2]
        },
        "iDeferLoading": 0,
        "oColReorder": {"iFixedColumns": 2},
        //"sScrollY": (layoutDimensions.heights.innerDataTable-220) + "px",
        "sScrollX": tableWidth + "px",
        "aaSorting": [[6,'desc']],
        "aoColumns": [
            /*            {"mDataProp": null, "sTitle": "Show", "bSortable": false, "sClass": 'show', "sWidth": colWidths.quickView + "px", "resize": false,
             "fnRender": function(obj) {
             var gId = obj.aData.gid;
             return '<button data="G' + gId + '" onclick="createGraph(' + gId + ')">View</button>'
             }
             },*/
            {"mDataProp":null, "sTitle": "Title (click to view)<span></span>", "bSortable": false, "sClass": 'sn',  "sWidth":  titleColWidth + 'px',
                "fnRender": function(obj){
                    return '<a href="http://www.mashabledata.com/workbench/view.php?g='+obj.aData.ghash+'" target="graph_viewer">'+obj.aData.title+'</a>'

                }
            },
            {"mDataProp":"analysis", "sTitle": "Analysis<span></span>", "bSortable": false, "sWidth":  analysisColWidth + 'px'},
            {"mDataProp":"serieslist", "sTitle": "Series<span></span>", "bSortable": false, "sClass": 'series', "sWidth": seriesColWidth + 'px'},
            {"mDataProp":"map", "sTitle": "Map<span></span>", "bSortable": true,  "sWidth": colWidths.map+"px", "fnRender": function(obj){return formatAsSpanWithTitle(obj)}},
            /*            {"mDataProp":"fromdt", "sTitle": "from<span></span>", "bSortable": true, "sType": 'date', "asSorting":  [ 'desc','asc'], "sWidth": colWidths.shortDate + 'px',
             "fnRender": function(obj){return formatDateByPeriod(getValue(obj),'M');}
             },
             {"mDataProp":"todt", "sTitle": "to<span></span>",  "bSortable": true,  "sType": 'date', "asSorting":  [ 'desc','asc'], "sClass": 'dte', "resize": false, "sWidth": colWidths.shortDate + 'px',
             "fnRender": function(obj){return formatDateByPeriod(getValue(obj),'M')}
             },*/
            {"mDataProp":"views", "sTitle": "Views<span></span>", "bSortable": true, "sClass": 'count', "sWidth": colWidths.views + 'px'},
            {"mDataProp":"modified", "sTitle": "Modified<span></span>", "bSortable": true,  "asSorting":  [ 'desc','asc'], "sClass": 'dte', "sWidth": colWidths.shortDate + 'px',
                "fnRender": function(obj){return timeOrDate(getValue(obj));}
            }
        ]
    });
    $('#publicGraphs .ColVis').parent().css("float","right").appendTo('#publicGraphsHeader');
    $('#tblPublicGraphs_info').appendTo('#public_graphs_search');
    $('#tblPublicGraphs_filter').hide();
}

//DATATABLE HELPER FUNCTIONS
function seriesFilterChange(){ //
    if($('#series-table_filter :input').attr('value').length != 0){
        $('#filterReset').removeClass('ui-icon-circle-close-inactive').addClass('ui-icon-circle-close')
    } else {
        $('#filterReset').removeClass('ui-icon-circle-close').addClass('ui-icon-circle-close-inactive')
    }
}
function OpenCloseMySeries(img){  //NOT CURRENTLY USED
// to be modified to get and show category chains for API series, show siblings/children on request and fetch series in category
    var nTr = img.parentNode.parentNode;
    var i = $.inArray( nTr, anOpenRowsMySeries );

    if ( i === -1 ) {
        $(img).attr( 'src', "images/details_close.png" );
        var nDetailsRow = dtMySeries.fnOpen( nTr, writeDrilldownMySreies(dtMySeries, nTr), 'details' );
        $('div.innerDetails', nDetailsRow).slideDown();
        anOpenRowsMySeries.push( nTr );
    }
    else {
        $(img).attr( 'src', "images/details_open.png" );
        $('div.innerDetails', $(nTr).next()[0]).slideUp( function () {
            dtMySeries.fnClose( nTr );
            anOpenRowsMySeries.splice( i, 1 );
        });
    }
}
function writeDrilldownMySreies( oTable, nTr ){
    var oData = oTable.fnGetData( nTr );
    var sOut =
        '<div class="innerDetails">'+
            '<table cellpadding="5" cellspacing="0" border="0" style="padding-left:50px;">'+
            '<tr><td><b>Series date range:</b> '+oData.firstdt+ ' to ' + oData.lastdt + '&nbsp;&nbsp;&nbsp;&nbsp; Number of data points:'+ oData.points +'</td></tr>';
    if(oData.skey != undefined){
        if(oData.skey.length>0){
            sOut += '<tr><td><b>Series key:</b> ' + oData.skey + '</td></tr>';
        }
    }
    if(oData.lastestCid != oData.cid && !isNaN(oData.lastestCid)){
        sOut += '<tr><td>A newer capture is available.  <button onclick="useLastest(oData)">Compare</button></td></tr>';
    }
    sOut += '<tr><td><b>From Graph entitled:</b> '+oData.graph+'&nbsp;&nbsp;&nbsp;&nbsp; Source graph credit:'+ oData.source +'</td></tr>'+
        '</table>'+
        '</div>';
    return sOut;
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
    searchCatId=0; //exit category browse mode
    if((keyCode == 13 &&  event.target.id == 'series_search_text') || event.target.id != 'series_search_text') {
        seriesCloudSearch();
    }
}
function seriesCloudSearch(noHashChange){
    browseClose();
    var searchText = $("#series_search_text").val();
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
    if((keyCode == 13 &&  event.target.id == 'graphs_search_text') || event.target.id == 'graphsSearchBtn') {
        var searchText = $("#graphs_search_text").val();
        searchText = (' ' + searchText + ' ').replace(/[\s]+/g,' ');
        //if(searchText==' ')return false; //no search on empty strings
        searchText = searchText.substring(1, searchText.length-1);
        searchText = '+' + searchText.replace(/ /g,' +');
        $('#tblPublicGraphs_filter input').val(searchText);
        dtPublicGraphs.fnFilter(searchText);
        setPanelHash();
    }
}
function getValue(obj){
    return obj.aData[ obj.oSettings.aoColumns[obj.iDataColumn].mDataProp ];
}
function formatAsSpanWithTitle(obj){
    return spanWithTitle(getValue(obj));
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
function formatAsUrl(url){
    return '<a href="' + url + '" target="_blank" title="' + url + '"><span class=" ui-icon ui-icon-extlink">' + url + '</span></a>';
}
function formatObjDate(obj) { //helper function for the data tables
    var val = getValue(obj);
    return formatDateByPeriod(val,obj.aData.period);
}
function viewGraph(gid){
    createMyGraph(gid);
    hideGraphEditor();
}
function clickMySeriesCheck(node){  //called when the series selection box is checked or unchecked
    var trSeries = $(node).closest('tr').get(0);
    var tdView = $(trSeries).children('.dt-vw').get(0);
    var obj = dtMySeries.fnGetData(trSeries);
    checkedCount = $("#series-table td.dt-vw a.md-checked").length;
    if($(trSeries).find("a.md-checked").length==1){
        checkedCount -= 1;
        dtMySeries.fnUpdate(false,trSeries, tdView.cellIndex, false);
    } else {
        checkedCount += 1;
        //obj.selected = checkedCount;
        dtMySeries.fnUpdate(checkedCount,trSeries, tdView.cellIndex, true);
    }
    if(checkedCount==0){
        $(".series-checked,.add-to-graph").attr("disabled","disabled");
    } else {
        $(".series-checked").removeAttr("disabled");
        if($("ul#graph-tabs li").length>0)$(".add-to-graph").removeAttr("disabled");
    }
}
function clickSave(anchorSave){  //called when the save icon is clicked
    if(!notLoggedInWarningDisplayed()){
        var tdSave = anchorSave.parentNode;
        var oTableMD = dtMySeries.fnGetData(tdSave.parentNode);
        var oMD = oMySeries['S' + oTableMD.sid]; //oTableMD is a copy, not a reference
        oMD.save = (oMD.save=='S')?'H':'S';
        updateMySeries(oMD); //need to have a reference to revert on call failure
        dtMySeries.fnUpdate(oMD.save, tdSave.parentNode, tdSave.cellIndex, false);
    }
}
function clearChecksMySeries(){
    $('#series-table_filter :input').attr('value','').keyup();
    seriesFilterChange();
    $("td.dt-vw a.md-checked").each(function(){
        $(this).removeClass("md-checked").addClass("md-check").html("Graph");
        var cellHTML = $(this).parent().html();  //dataTable overwrites
        var tdView = this.parentNode;
        //console.log(cellHTML)
        dtMySeries.fnUpdate("Graph", dtMySeries.fnGetPosition(tdView.parentNode), tdView.cellIndex);
        $(tdView).html(cellHTML); //rewrite the link
    });
    $(".series-checked,.add-to-graph").attr("disabled","disabled");
    dtMySeries.fnSort([[MY_SERIES_DATE, 'desc']]);
}
function rowDblClick(evt){ //executed on dblClick of a datatable row
    $(evt.target).closest("tr").find("button").click();
    //evt.stopPropogation();
}
//DIALOG FUNCTIONS
var $dialog;
function showAuthorizeDialogue(){
    dialogShow('User Agreement',
        '<span id="dialog-top">MashableData is a free workbench to analyze and graph data series.  Data series viewed using our plugin have been securely cached in your browser\'s local storage.  To power the workbench, the data series must be shared with our servers.  Once sharing is enabled, you will be able to search and view series and public graphs on MashableData.com\'s servers.<br /><br />'
            + '<span id="dialog-learn"><i>To learn more, please read <a href="/" target="_blank">how MashableData works</a> and our <a href="/" target="_blank">privacy policy</a>.</i></span>'
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

//LOCALSTORAGE HELPER FUNCTIONS  (LS also referenced from doc.ready, syncMyAccount, deleteCheckedSeries
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
    oHighCharts[panelId].setTitle({text:titleControl.value});
    oPanelGraphs[panelId].title = titleControl.value;
    if(titleControl.value.length==0){
        var noTitle= 'Graph'+panelId.substring(panelId.indexOf('-')+1);
        $('a[href=#'+panelId+']').html(noTitle).attr("title",noTitle);
    } else {
        $('a[href=#'+panelId+']').html(titleControl.value).attr("title",titleControl.value);
    }
    oHighCharts[panelId].redraw();
    //oMyGraphs & table synced only when user clicks save
}

//QUICK VIEW FUNCTIONS
function getQuickViewData(btn){
    //if(notLoggedInWarningDisplayed()) return false;     // need to allow some playing before forcing a signup
    $("#quick-view-controls button").removeAttr("disabled");
    var tableId = $(btn).closest('table').attr("id");
    var sHandle = $(btn).attr('data'); //could be L or S or U prefixed depending on log in state and whether this is a public or user series
    var canAddSeries = (tableId == dtPublicSeries.attr("id"));
    if(!canAddSeries){ //assumption: if not PublicSeries, this is from MySeries and maybe it already has data
        if(oMySeries[sHandle].data){ //if L, it *must* have its own data
            quickGraph(oMySeries[sHandle],canAddSeries);
            return;
        }
    }
    var sids = [], usids=[];
    if(sHandle.charAt(0)=="U")usids.push(parseInt(sHandle.substr(1))); else sids.push(parseInt(sHandle.substr(1)));

    getQuickData();

    function getQuickData(){
        callApi({command:  'GetMashableData',
                sids: sids,
                usids: usids
            },
            function(jsoData, textStatus, jqXH){
                if(oMySeries[sHandle]){ //if this happens to be in mySeries...
                    oMySeries[sHandle].data = jsoData.series[sHandle].data;
                    oMySeries[sHandle].notes = jsoData.series[sHandle].notes;
                    oMySeries[sHandle].geocounts = jsoData.series[sHandle].geocounts;
                }
                quickGraph(jsoData.series[sHandle],canAddSeries)
            }
        );
    }
}
function quickGraph(obj, showAddSeries){   //obj can be a series object, an arra of series objects, or a complete grpah object
    oQuickViewSeries = obj; //store in global var
    var quickGraph;
    //quickGraph.title = 'Selected data series from the map';

    if(obj instanceof Array){
        quickGraph = emptyGraph();
        quickGraph.plots = [];
        var handles = [];
        for(var i=0;i<obj.length;i++){
            quickGraph.assets[obj[i].handle] = obj[i];
            quickGraph.plots.push({components:[{handle:obj[i].handle, options:{k:1, op:'+'}}],  options:{}});
            handles.push(obj[i].handle);
            $('#quick-view-controls').attr('data', handles.join(","));
        }
    } else {
        if(obj.plots){ //a graphs object was passed in
            quickGraph = obj; //everything including title should be set by caller
        } else {
            quickGraph = emptyGraph();
            quickGraph.assets[obj.handle] = obj;
            quickGraph.title = obj.name;
            quickGraph.plots = [{components:[{handle:obj.handle, options:{k:1, op:'+'}}],  options:{}}];
            $('#quick-view-controls').attr('data', obj.handle);
        }
    }
    var quickChartOptions = makeChartOptionsObject(quickGraph);
    delete quickChartOptions.chart.height;
    quickChartOptions.chart.borderWidth = 2;
    quickChartOptions.chart.renderTo = 'highcharts-div';

    quickChart = new Highcharts.Chart(quickChartOptions);
    //this are the series info added to the quickView panel.  Could be more complete & styled
    var qvNotes='';
    if(!(obj instanceof Array) && !obj.plots){ //only if single series
        qvNotes = '<table><tr><td width="20%">Graph title or API category:</td><td width="*">' + obj.graph + '</td></tr>'
            + '<tr><td>Series notes:</td><td>' + obj.notes + '</td></tr>'
            + '<tr><td>My Series count:</td><td>' + obj.myseriescount + '</td></tr>'
            + '<tr><td>Graphs (including unpublished) count:</td><td>' + obj.graphcount + '</td></tr>'
            + '<tr><td>Series key:</td><td>' + obj.skey + '</td></tr>'
            + '</table>';
        var hasMaps = false, seriesMaps = [], otherMaps = [];
        var $mapSelect =  $('select.quick-view-maps');
        if(obj.mapsetid || obj.pointsetid){
            for(var map in obj.geocounts){
                if(obj.geocounts[map].set>1){
                    hasMaps = true;
                    if(obj.geocounts[map].regions){
                        seriesMaps.push('<option value="'+map+'">'+map+' ('+obj.geocounts[map].set+')</option>');
                    } else {
                        otherMaps.push('<option class="other-map" value="'+map+'">'+map+' ('+obj.geocounts[map].set+')</option>');
                    }
                }
            }
        }
        if(hasMaps){ //make sure we have maps to show
            seriesMaps.sort();
            otherMaps.sort();
            $mapSelect.html(seriesMaps.join('')+(otherMaps.length>0?'<option class="other-maps" value="other">other maps for this set:</option>'+otherMaps.join(''):'')).show();
        } else {
            $mapSelect.hide();
        }
    } else $('.quick-view-maps').hide();
    $('#qv-info').html(qvNotes);

    if(showAddSeries){
        $('#quick-view-to-series').show();
    } else {
        $('#quick-view-to-series').hide();
    }

    var graphOptions = '<option value="new">new graph</option>';
    $('div.graph-panel').each(function(){
        var $tabLink = $("ul#graph-tabs li a[href='#"+this.id+"']");
        graphOptions+='<option value="'+this.id+'"'+(($tabLink.closest("li").hasClass("ui-tabs-selected"))?' selected':'')+'>'+$tabLink.get(0).innerHTML+'</option>';
    });
    $('#quick-view-to-graphs').html(graphOptions).val(visiblePanelId());
    $('#quick-view-to-graph').removeAttr("disabled");
    $('.show-graph-link').click();
}
function quickViewToSeries(btn){ //called from button. to add series shown in active quickView to MySeries
    $(btn).attr("disabled","disabled");
    oQuickViewSeries.save_dt = new Date().getTime();
    var serieskey = addMySeriesRow(oQuickViewSeries);  //table and oMySeries add/update
    updateMySeries(oQuickViewSeries); //cloud update
    //$('#fancybox-close').click(); < explicitly close it
    return serieskey;
}
function quickViewToChart(btn){
    $(btn).attr("disabled","disabled");
    var panelId =  $('#quick-view-to-graphs').val();
    if(oQuickViewSeries.plots){  //we have a complete graph object!
        if(panelId!='new') {
            var plots = oQuickViewSeries.plots;
            if(!oPanelGraphs[panelId].plots)oPanelGraphs[panelId].plots=[];
            for(var p=0;p<plots.length;p++){
                oPanelGraphs[panelId].plots.push(plots[p]);
            }
            for(var asset in oQuickViewSeries.assets){
                oPanelGraphs[panelId].assets[asset] = oPanelGraphs[panelId].assets[asset] || oQuickViewSeries.assets[asset];
            }
            $("ul#graph-tabs li a[href='#"+panelId+"']").click(); //show the graph first = ensures correct sizing
            $('#' + panelId + ' .graph-type').change();
        } else {
            buildGraphPanel(oQuickViewSeries);
        }
    } else {
        if(!(oQuickViewSeries instanceof  Array)) oQuickViewSeries = [oQuickViewSeries];
        if(panelId!='new') {
            if(!oPanelGraphs[panelId].plots)oPanelGraphs[panelId].plots=[];
            for(var i=0;i<oQuickViewSeries.length;i++){
                oPanelGraphs[panelId].assets[oQuickViewSeries[i].handle] = $.extend({save_dt: new Date().getTime()}, oQuickViewSeries[i]); //make copy
                oPanelGraphs[panelId].plots.push({
                    components:
                        [{
                            handle:   oQuickViewSeries[i].handle,
                            options: {k:1.0, op:'+'}
                        }],
                    options: {}
                });

                //not sure what the role of MySeries should be going forward...
                var rowInMySeries = dtMySeries.find('button[data="' + oQuickViewSeries[i].handle + '"]');
                if(rowInMySeries.legnth==1) clickMySeriesCheck(rowInMySeries[0]); //check the newly added series
            }

            $("ul#graph-tabs li a[href='#"+panelId+"']").click(); //show the graph first = ensures correct sizing
            $('#' + panelId + ' .graph-type').change();
        } else {
            createUpdateGraphFromMySeries(buildGraphPanel, undefined, oQuickViewSeries);
        }
    }
    quickViewClose();
    hideGraphEditor();  //show graph instead My Series table of $('#local-series').click();
    setPanelHash();
}
function quickViewToMap(){
    var mapsetid = oQuickViewSeries.mapsetid;
    var pointsetid = oQuickViewSeries.pointsetid;
    var panelId =  $('#quick-view-to-graphs').val();
    var addedHandle;
    var map = $("select.quick-view-maps").val();
    if(oPanelGraphs[panelId] && oPanelGraphs[panelId].map && oPanelGraphs[panelId].map!=map){
        dialogShow("Map Error","This graph already has a "+oPanelGraphs[panelId].map+"map.  Additional map data can be added, but must use the same base map.")
        return null;
    }
    var oGraph = (panelId=="new")?emptyGraph():oPanelGraphs[panelId];
    oGraph.map = map;
    oGraph.mapconfig.legendLocation = mapsList[map].legend;
    oGraph.mapconfig.legendLocation = mapsList[map].legend;
    oGraph.mapFile = mapsList[map].jvectormap;
    require(['js/maps/' +  oGraph.mapFile + '.js']); //preload it
    if(!isNaN(mapsetid) && mapsetid>0){
        if(!oGraph.mapsets) oGraph.mapsets = {options:{}, components:[]};
        addedHandle = 'M'+mapsetid;
        oGraph.mapsets.components.push({handle: addedHandle, options:{} });
    }
    if(!isNaN(pointsetid) && pointsetid>0){
        if(!oGraph.pointsets) oGraph.pointsets = [];
        addedHandle = 'X'+pointsetid;
        oGraph.pointsets.push({options:{}, components:[{handle: addedHandle, options:{} } ] } );
    }

    getAssets(oGraph, function(){
        require(['js/maps/' + oGraph.mapFile + '.js'],function(){
            if(oGraph.title===null || oGraph.title=='') oGraph.title = oGraph.assets[addedHandle].name;
            if(panelId=="new"){
                buildGraphPanel(oGraph);
            } else {
                $("ul#graph-tabs li a[href='#"+panelId+"']").click(); //show the graph first = ensures correct sizing
                /*var $makeMapButton= $('#' + panelId + ' .make-map');
                 if($makeMapButton.length==1) $makeMapButton.click(); else*/
                $('#' + panelId + ' .graph-type').change();
            }
        });
        unmask();
        hideGraphEditor();
        setPanelHash();
    });
    quickViewClose();
}
function quickViewClose(){
    quickChart.destroy();
    $('#fancybox-close').click();
}

//API SERIES BROWSE FUNCTIONS
function browseFromSeries(seriesId){
    callApi({command:'GetCatChains', sid: seriesId},function(jsoData, textStatus, jqXH){
        var chainCount = 0, i, maxHeight=0;
        var cell={};
        var $chainTable = $('<table id="cat-chains">');
        //need to construct object tree structure to effectively combine and sort chains
        var chainTree = {}, branch, branchingCount, nextLevel, parentid;
        console.log(jsoData.chains);
        for(var chain in jsoData.chains){
            branch = chainTree;
            parentid = 0;
            if(jsoData.chains[chain].length>maxHeight) maxHeight = jsoData.chains[chain].length;
            for(i=jsoData.chains[chain].length-2;i>=0;i--){
                if(branch[jsoData.chains[chain][i].name]){
                    branch[jsoData.chains[chain][i].name].catProps.count++;
                } else {
                    branch[jsoData.chains[chain][i].name] = {catProps: jsoData.chains[chain][i]};
                    if(jsoData.chains[chain].length-1!=i)branch[jsoData.chains[chain][i].name].catProps.siblings=jsoData.chains[chain][i+1].children;
                    branch[jsoData.chains[chain][i].name].catProps.count = 1;
                    branch[jsoData.chains[chain][i].name].catProps.parentid = parentid;
                }
                parentid = branch[jsoData.chains[chain][i].name].catProps.catid;
                branch = branch[jsoData.chains[chain][i].name];
            }
            $chainTable.append('<tr></tr>');
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
                    $cell = $("<td></td>");
                    nextLevel.push(null);
                } else {  //2. if not: create cell, indicate not terminated. and provided new reference(s)
                    terminated = false;
                    childless=true;
                    for(branch in levelBranches[i]){
                        if(branch!="catProps"){
                            nextLevel.push(levelBranches[i][branch]);
                            childless=false;
                        }
                    }
                    if(childless) nextLevel.push(null);
                    props = levelBranches[i].catProps;
                    $cell = $('<td class="cat-branch" rowspan="'+props.count+'" data="'+ props.catid +'" parentid="'+ props.parentid +'">'
                        + '<span class="chain" data="'+ props.catid +'">' + ((props.siblings>1)?'<span class="ui-icon browse-rolldown" onclick="showSiblingCats(this)">show sibling categories</span>':'')
                        + (parseInt(props.scount)>0?'<a title="Click to view the '+props.scount+' series in this category" onclick="publicCat(\''+props.name+'\','+props.catid+')">'+ props.name+ '(' + props.scount + ')</a>': props.name)+'</span>'
                        + ((props.children>0 && childless)?'<span class="ui-icon browse-right" data="'+ props.catid +'" onclick="showChildCats(this)">show child categories</span>':'')
                        + '</td>');

                }
                $chainTable.find("tr:eq("+i+")").append($cell);
            }
            levelBranches = nextLevel;
        }
        if($('div#tblPublicSeries_wrapper:visible').length==1){
            $('div#browse-api').height($('div#tblPublicSeries_wrapper').height()).width($('div#tblPublicSeries_wrapper').width());
        }
        $('div#browse-api').html('').append($chainTable).show();
        $('div#browse-api').prepend('Below are category heirarchy for the series selected. Note that a series can be in more than one category.<br><br>'
            + '<button class="browse-reset" disabled="disabled" onclick="browseFromSeries('+ seriesId +')">reset</button> <button onclick="browseClose()">close</button><br><br>');

        $('div#cloudSeriesTableDiv').hide();
    });
}
function editCheckedSeries(){//edit the first visible
    var sHandle = $("td.dt-vw a.md-checked:first").closest("tr").find("td.quick-view button").attr("data");
    if(sHandle) {
        var $select, serie = oMySeries[sHandle];
        if(serie.mapsetid||serie.pointsetid){
            //see if user wants to edit the entire set or just this series
            callApi({command: "GetAvailableMaps", mapsetid: serie.mapsetid, pointsetid: serie.pointsetid, geoid: serie.geoid}, function(jsoData, textStatus, jqXH){
                var mapOptions='';
                for(var i=0;i<jsoData.maps.length;i++){
                    mapOptions+='<option value="'+jsoData.maps[i].name+'|'+jsoData.maps[i].file+'">'+jsoData.maps[i].name+' ('+jsoData.maps[i].count+')</option>';
                }
                $select = $panel.find('select').html(mapOptions).show();
            });
            var html = '<div id="seriesOrSet" style="width:330px;">'
                + '<h4>This series is part of a set</h4>'
                + '<label><input type="radio" name="editSeriesOrSet" value="series" checked> edit just this series </label><br>'
                + '<label><input type="radio" name="editSeriesOrSet" value="set"> view and edit the set\'s series for the map:<br>'
                + '<select class="hidden"></select></label><br><br>'
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
            $('#seriesOrSetOk').button({icons: {secondary: 'ui-icon-check'}}).click(function(){
                if($('input:radio[name=\'editSeriesOrSet\']:checked').val()=='series'){
                    showSeriesEditor(sHandle);
                } else {
                    if(serie.pointsetid) showSeriesEditor('X'+serie.pointsetid, $select.val());
                    if(serie.mapsetid) showSeriesEditor('M'+serie.mapsetid, $select.val());
                }
                $.fancybox.close();
            });
            $('#seriesOrSetCancel').button({icons: {secondary: 'ui-icon-close'}}).click(function(){
                $.fancybox.close();
            });


        } else showSeriesEditor(sHandle);
    }
}

function validatePaste(changes){}
function showSeriesEditor(handle, map){
    var seriesEditorInitialised=false;
    var periodOfEdits=false;
    var editorCols = 2;
    var set = 'U';
    var requireModules = ["/global/js/handsontable/jquery.handsontable.0.7.5.src.js","/global/js/contextMenu/jquery.contextMenu.1.5.14.src.js"];
    var setid=null, rows = {
        S: {name: 0, units: 1, notes: 2, handle:3, header: 4},
        M:  {name: 0, units: 1, notes: 2, geoid: 3, iso3166: 4, handle:5, header: 6},
        X: {name: 0, units: 1, notes: 2, geoid: 3, iso3166: 4, handle: 5, lat: 6, lon:7, header: 8}
    };
    if(handle && handle[0]=='M'){
        require(requireModules); //loading the require JS modules during the API call;
        set = handle[0];
        callApi({command: 'GetSet', mapsetid: parseInt(handle.substr(1)), map: map.split('|')[0], modal: 'persist'}, function(jsoData, textStatus, jqXH){
            require(requireModules,function(){userMapSet(jsoData.setData)});
        });
        function userMapSet(setData){
            //if(!seriesEditorInitialised)
            initializeSeriesEditor();
            var seriesData, point, i, j, row, grid = [["map set",setData.name],["units",setData.units],["notes",""],["geoid"],["date"]];
            for(i=0;i<setData.geographies.length;i++){
                grid[3].push(setData.geographies[i].geoid);
                grid[4].push(setData.geographies[i].geoname);
                if(i>1){
                    grid[0].push("");
                    grid[1].push("");
                    grid[2].push("");
                }
                row=5;  //first data row
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
            $("#data-editor").removeAttr("data").handsontable({
                data: grid,
                minCols: editorCols
            });
            unmask();
        }
    } else {
        require(requireModules, function(){seriesEditor(handle)});
    }
    function initializeSeriesEditor(){
        editorCols = 2;
        var lastRow= 0,lastCol=0;
        var $panel = $('div#edit-user-series').show().height($('div#local-series').height());
        var $editor = $("#data-editor").height($('div#local-series').height()-50).html('');
        $panel.find('button.series-edit-save').button({icons:{secondary:'ui-icon-disk'}}).off().click(function(){
            saveSeriesEditor(false);
        });
        $panel.find('button.series-edit-cancel').button({icons:{secondary:'ui-icon-close'}}).off().click(function(){
            closeSeriesEditor();
        });
        $panel.find('button.series-edit-preview').button({icons: {secondary: 'ui-icon-image'}}).off().click(function(){
            var arySeries = userSeriesFromEditor();
            quickGraph(arySeries, false);
        });
        $panel.find('button.series-edit-geoset').button({icons:{secondary:'ui-icon-flag'}}).off().click(function(){
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
                if ((row < 3 && col == 0)  || row == 3) {
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
        switch(set){
            case 'U':
                Handsontable.TextCell.renderer.apply(this, arguments);
                if(row < 3 && col == 0){
                    td.style.background = '#E0FFFF';
                    td.style.fontWeight = 'bold';
                }
                if(row == 3){
                    td.style.background = '#808080';
                    td.style.fontWeight = 'bold';
                }
                break;
            case 'M':
                Handsontable.TextCell.renderer.apply(this, arguments);
                if(row <=2){
                    if(col == 0){
                        td.style.background = '#E0FFFF';
                        td.style.fontWeight = 'bold';
                    } else {
                        if(col==1) {
                            td.colSpan = Math.min(5,editorCols -1);
                        } else {
                            $(td).addClass('hidden');
                        }
                    }
                }
                //if(row == 3) $(td).closest('tr').addClass('hidden');
                if(row == 4){
                    if(col == 0){
                        td.style.background = '#E0FFFF';
                    } else {
                        td.style.background = '#808080';
                    }
                    td.style.fontWeight = 'bold';
                }
        }
    }
    function seriesEditor(series_handle){
        if(!seriesEditorInitialised) initializeSeriesEditor();

        /*    if($('div#local-series:visible').length==1){
         // var h = $('div#edit-user-series').width($('div#local-series').width()).height($('div#local-series').height());
         }*/

        $('div#edit-user-series').slideDown();
        $('button#series-edit-save').attr("disabled","disabled");
        if(series_handle){
            if(series_handle.charAt(0)=='U') $('button#series-edit-save').removeAttr("disabled");
            var oSerie = oMySeries[series_handle];
            periodOfEdits = oSerie.period;
            if(oSerie.data){
                var data = oSerie.data.split("||").sort();
                for(var i=0;i<data.length;i++){
                    data[i] = data[i].split("|");
                    data[i][0]=formatDateByPeriod(dateFromMdDate(data[i][0]).getTime(),oSerie.period);
                }
                data.unshift(["name", oSerie.name],["units",oSerie.units],["notes",oSerie.notes],["date","value"]);
                $("#data-editor").attr("data",series_handle).handsontable("loadData", data);
            } else {
                var sids = [], usids=[];
                if(series_handle.charAt(0)=="U")usids.push(parseInt(series_handle.substr(1))); else sids.push(parseInt(series_handle.substr(1)));
                callApi({command:  'GetMashableData', sids:  sids, usids: usids},
                    function(jsoData, textStatus, jqXH){
                        //showSeriesInEditor()
                        oSerie.data = jsoData.series[series_handle].data;
                        oSerie.notes = jsoData.series[series_handle].notes;
                        var data = jsoData.series[series_handle].data.split("||").sort();
                        for(var i=0;i<data.length;i++){
                            data[i] = data[i].split("|");
                            data[i][0]=formatDateByPeriod(dateFromMdDate(data[i][0]).getTime(),oSerie.period);
                        }
                        data.unshift(["name", oSerie.name],["units",oSerie.units],["notes",oSerie.notes],["date","value"]);
                        $("#data-editor").attr("data",series_handle).handsontable("loadData", data);
                    }
                );
            }
        }else {
            $("#data-editor").handsontable("loadData", [["name", ""],["units",""],["notes",""],["date","value"]]);
            periodOfEdits = false;
        }
    }
    function showUserSetWizard(){
        showPanel();

        function showPanel(){
            var $panel, mapsAsOptions='', i;
            for(i=0;i<mapsList.length;i++){
                mapsAsOptions += '<option value="'+mapsList[i].map+'">'+mapsList[i].name+'</option>';
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

            }

        }
        function newUserMapSet(jsoData, textStatus, jqXH){
            var data = [["map set"],["units"],["notes"],["geoid"],["date"]];
            for(var i=0;i<jsoData.geographies.length;i++){
                /*data[0].push('');
                 data[1].push('');
                 data[2].push('');*/
                data[3].push(jsoData.geographies[i].geoid);
                data[4].push(jsoData.geographies[i].name);
            }
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
        var gridData = $editor.data('handsontable').getData();
        var localSeriesindex= 1, userSeries = [];
        var uSerie, pointArray, seriesInfo, mdata, rowIndex = rows[set];
        var c, r, x, y, udt;
        for(c=1;c<gridData[0].length;c++){
            var totalChanges="";
            for(r=0;r<gridData.length;r++){ //does this column have anything?
                if(r!=3)totalChanges+=gridData[r][c];
                if(nonWhitePattern.test(totalChanges)) break; //exit on first non-empty cell = fast
            }
            if(nonWhitePattern.test(totalChanges)) {   //don't try to save empty column
                switch(set){
                    case 'M':
                        uSerie = {
                            handle: gridData[rows.M.handle][c],  //handles always blank unless editing existing user series
                            name: gridData[rows.M.header][1]+' - '+gridData[rows.M.name][c],
                            units: gridData[rows.M.units][1],
                            notes: gridData[rows.M.geoid][c],
                            geoid: gridData[rows.M.geoid][c],
                            save_dt: new Date().getTime()
                        };
                        break;
                    case 'X':
                        uSerie = {
                            handle: gridData[rows.X.handle][c],
                            name:gridData[rows.X.header][c],
                            units:gridData[rows.X.units][1],
                            notes:gridData[rows.X.notes][1],
                            geoid:gridData[rows.X.geoid][c],
                            lat:gridData[rows.X.lon][c],
                            lon:gridData[rows.X.lat][c],
                            save_dt: new Date().getTime()
                        };
                        break;
                    default:
                        uSerie = {
                            handle: gridData[rows.S.handle][c],
                            name:gridData[rows.S.header][c],
                            units:gridData[rows.S.header][c],
                            notes:gridData[rows.S.header][c],
                            save_dt: new Date().getTime()
                        };
                        break;
                }
                if(!uSerie.handle){
                    uSerie.handle = 'L'+localSeriesindex++;
                }
                if(uSerie.name.length==0||uSerie.units.length==0){
                    dialogShow("Unable to Save","Name and units are required fields.");
                    return false;
                }
                pointArray=[];
                mdata = "";
                for(r=4;r<gridData.length;r++){
                    if(gridData[r][c]!==null&&gridData[r][c].length>0){//if empty value, skip
                        if(isNaN(gridData[r][c]) && gridData[r][c].toLowerCase()!='null'){
                            dialogShow("Unreadable Values","Value cells must be numbers, 'NULL', or blank.");
                            return false;
                        }
                        udt = UTCFromReadableDate(gridData[r][0]);
                        if(!udt){
                            dialogShow("Invalid Date Formats","Valid date formats are required in the left column for non-empty values.");
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
                $.extend(uSerie, seriesInfo);
                userSeries.push(uSerie);
            }
        }
        return userSeries;
    }
    function saveSeriesEditor(){
        var arySeries = userSeriesFromEditor();
        if(arySeries){
            for(var i=0;i<arySeries.length;i++){
                $.extend(arySeries[i], {command: "SaveUserSeries", modal:"persist"});
                callApi(arySeries[i],
                    function(jsoData, textStatus, jqXH){
                        //add update MySeriesGrid on success
                        if(arySeries[i].handle.substr(0,1)=='U' && arySeries[i].handle.substr(0,1)=='U'){  //update operation
                            var trSerie = dtMySeries.find("button[data='"+arySeries[i].handle+"']").closest("tr").get(0);
                            dtMySeries.fnDeleteRow(trSerie); //problems with the update on the manipulated cells.  Easier to delete and add.
                        } else { //insert new operation
                            arySeries[i].handle = "U"+jsoData.usid;
                            arySeries[i].usid = jsoData.usid;
                        }
                        dtMySeries.fnAddData(arySeries[i]);
                        oMySeries[arySeries[i].handle]=arySeries[i];  //over-write
                    }
                );
            }
            unmask();
            closeSeriesEditor();
        }
    }
    function closeSeriesEditor(){
        var $de = $("#data-editor");
        $de.handsontable('destroy');  //handsontable does not support chaining
        $de.attr('style','overflow:scroll;');
        $('div#edit-user-series').slideUp();
    }
}

function addMySeriesToCurrentGraph(){
    alert("not implemented yet");
}

function browseClose(){
    $('div#browse-api').hide();
    $('div#cloudSeriesTableDiv').show();
}
function showSiblingCats(spn){
    var catId, props, isOpened;
    var $td;
    $td = $(spn).closest('td');
    isOpened = $(spn).hasClass('browse-rollup');
    var $tcat;
    $tcat = $('table#cat-chains');
    $tcat.find('span.sibling').closest('div').remove();
    $tcat.find('span.italics').removeClass("italics");
    $tcat.find('td').children('br').remove();
    $tcat.find('.browse-rollup').removeClass("browse-rollup").addClass("browse-rolldown");
    $tcat.find('td.expanded').removeClass('expanded');
    if(isOpened)return; //don't fetch.  above code already removed the siblings

    catId = $td.addClass("expanded").attr('data');
    callApi({command: "GetCatSiblings", catid: catId}, function(jsoData, textStatus, jqXH){
        $(spn).addClass("browse-rollup").removeClass("browse-rolldown");
        $td.find('span.chain').addClass("italics");
        for(var i=0;i<jsoData.siblings.length;i++){
            props = jsoData.siblings[i];
            if(props.catid==catId){
                if(props.children>0){
                    $td.find("span.chain").append('<span class="ui-icon browse-right" onclick="showChildCats(this)">show child categories</span>');
                }
            } else {
                $td.append('<div><span class="ui-icon ui-icon-triangle-1-e"></span><span class="sibling" data="'+ props.catid +'">'
                    + (parseInt(props.scount)>0?'<a title="Click to view the '+props.scount+' series in this category" onclick="publicCat(\''+props.name+'\','+props.catid+')">' + props.name +' (' + props.scount + ')</a>':props.name) + '</span>'
                    + ((props.children>0)?' <span class="ui-icon browse-right" onclick="showChildCats(this)">show child categories</span>':'')
                    + '</div>');
            }

        }
    })
}
function showChildCats(spn){
    var newTds, props, $currentTd, nextCatId;
    var $catSpan = $(spn).closest('div').find("span.sibling, span.chain");
    var catid = $catSpan.attr("data");

    callApi({command: "GetCatChildren", catid: catid}, function(jsoData, textStatus, jqXH){
        $currentTd = $('<td class="sibling expanded"  parentid="'+catid+'"></td>');
        $("table#cat-chains tr").append($currentTd);
        for(var i=0;i<jsoData.children.length;i++){
            props = jsoData.children[i];
            $currentTd.append('<div><span class="ui-icon ui-icon-triangle-1-e"></span><span class="sibling" data="'+ props.catid +'" parentid="'+ catid +'">'
                + (parseInt(props.scount)>0?'<a title="Click to view the '+props.scount+' series in this category" onclick="publicCat(\''+props.name+'\','+props.catid+')">' + props.name + ' (' + props.scount + ')</a>':props.name)+'</span>'
                + ((props.children>0)?'<span class="ui-icon browse-right" onclick="showChildCats(this)">show child categories</span>':'')
                + '</div>').addClass("expanded");
        }
    });
    //rebuild the table root while fetching occurring, starting with clicked span working up
    nextCatId = $(spn).closest("td").attr('parentid');
    $catSpan.removeClass("sibling").addClass("chain").find(".browse-right, .browse-rollup").remove();
    newTds = '<td class="chain" data="'+ $catSpan.attr('data') +'" parentid="'+ nextCatId +'"><span class="chain">'
        + '<span class="ui-icon browse-rolldown" onclick="showSiblingCats(this)" data="'+catid+'">show sibling categories</span>'
        + $catSpan.get(0).innerHTML + '</span><td>';

    while(nextCatId!=0){
        $currentTd =  $("table#cat-chains td[data='" + nextCatId + "']");
        newTds = $currentTd.get(0).outerHTML + newTds;
        nextCatId = $currentTd.attr('parentid');
    }
    $("table#cat-chains").html("<tr>"+newTds+"</tr>").find('td').removeAttr("rowspan");
    $("button.browse-reset").removeAttr("disabled");
}
function publicCat(catName, catId, apiId){
    //$('input#search-cat-id').val(catId);
    $('input#series_search_text').val("category: "+catName);
    searchCatId = catId; //global var. reset on filter change
    //$('select#series_search_periodicity').val("all"); //
    $('input#series_search_source').val('ALL');
    $("#series_search_periodicity").val("all");
    seriesCloudSearch();
}

//USER ACCOUNT FUNCTIONS
function getUserId(){ //called by window.fbAsyncInit after FaceBook auth library loads and determines that user is authenticated
    if(account.loggedIn()) return account.info.userId;
    if(account.fb_user){
        console.trace();
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
    var params = {command: 'UploadMyMashableData', series: []};
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

                $('#series-table').find("td.quick-view button[data='"+oldHandle+"']").attr('data',serie.handle);

                for(tab in oPanelGraphs){
                    updateHandles(oPanelGraphs[tab],oldHandle, serie);
                }
                for(var graph in oMyGraphs){
                    updateHandles(oMyGraphs[graph], oldHandle, serie);
                }
            }
        });
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
        if(graph.plots){
            for(i=0;i<graph.plots.length;i++){
                replaceSeries(graph.plots[i]);
            }
        }
        if(graph.pointsets){
            for(i=0;i<graph.pointsets.length;i++){
                replaceSeries(graph.plots[i]);
            }
        }
        if(graph.mapsets){
            replaceSeries(graph.mapsets);
        }
        function replaceSeries(plot){
            var i;
            for(i=0;i<plot.components.length;i++){
                if(plot.components[i].handle == oldHandle){
                    //update handle!
                    plot.components[i].handle = serie.handle;
                }
            }
        }
    }

// note: series cleared from localStorage when they were read

//  download my account objects
    getMySeries();  //modal is persisted

//  B. My Graphs
    console.info("syncMyAccount run");
    callApi({'command':	'GetMyGraphs'},  //modal is closed
        function(results, textStatus, jqXH){
            for(var key in results.graphs){
                oMyGraphs[key]=results.graphs[key];
                inflateGraph(oMyGraphs[key]);
                dtMyGraphs.fnAddData(oMyGraphs[key]);
            }
        }
    );
}


function inflateGraph(graph){
    if(graph.annotations){
        graph.annotations=safeParse(graph.annotations,[]);
    } else {
        graph.annotations=[];
    }
    for(var plot in graph.plots){
        graph.plots[plot].options = safeParse(graph.plots[plot].options, {});
        for(var comp in graph.plots[plot].components){
            graph.plots[plot].components[comp].options = safeParse(graph.plots[plot].components[comp].options, {});
        }
    }
    for(var plot in graph.pointsets){
        graph.pointsets[plot].options = safeParse(graph.pointsets[plot].options, {});
        for(var comp in graph.pointsets[plot].components){
            graph.pointsets[plot].components[comp].options = safeParse(graph.pointsets[plot].components[comp].options, {});
        }
    }
    graph.mapconfig = safeParse(graph.mapconfig, {});

    if(graph.mapsets){
        graph.mapsets.options = safeParse(graph.mapsets.options, {});
        for(var comp in graph.mapsets.components){
            graph.mapsets.components[comp].options = safeParse(graph.mapsets.components[comp].options, {});
        }
    }

    function safeParse(jsonString, emptyValue){
        try{
            return JSON.parse(jsonString);
        }
        catch(e){
            return emptyValue;
        }
    }
}

function getMySeries(){
    callApi({'command':	'GetMySeries', modal:"persist"},
        function(results, textStatus, jqXH){
            var series=[];
            for(var sHandle in results.series){
                if(oMySeries[sHandle]){
                    var trSeries = dtMySeries.find("button[data='" + sHandle + "']").closest('tr').get(0);
                    //dtMySeries.fnUpdate(oMD, trSeries); < problem will the delete cell.   easrier just to delete and add
                    dtMySeries.fnDeleteRow(trSeries);
                }
                oMySeries[sHandle] = results.series[sHandle]; //if exists, it will be overwritten with new data
                series.push(results.series[sHandle]);  //takes an array or object, not an object
            }
            dtMySeries.fnAddData(series);
        }
    );
}
function saveGraph(oGraph) {
//first save to db and than to dtMyGraphs and oMyGraphs once we have a gid
    if(oGraph.gid){
        oGraph.updatedt = (new Date()).getTime();
    } else {
        oGraph.createdt = (new Date()).getTime();
    }
    var params = {command: 'ManageMyGraphs'};
    $.extend(true, params, oGraph);
    params.annotations = serializeAnnotations(oGraph);  // over write array of object with a single serialized field
    params.mapconfig = $.stringify(oGraph.mapconfig);
    var plot, comp;
    for(plot in oGraph.plots){
        params.plots[plot].options = $.stringify(params.plots[plot].options);
        for(comp in  params.plots[plot].components){
            params.plots[plot].components[comp].options = $.stringify(params.plots[plot].components[comp].options);
        }
    }
    if(oGraph.mapsets){
        params.mapsets.options = $.stringify(params.mapsets.options);
        for(comp in oGraph.mapsets.components){
            params.mapsets.components[comp].options = $.stringify(params.mapsets.components[comp].options);
        }
    }
    for(plot in oGraph.pointsets){
        params.pointsets[plot].options = $.stringify(params.pointsets[plot].options);
        for(comp in  params.pointsets[plot].components){
            params.pointsets[plot].components[comp].options = $.stringify(params.pointsets[plot].components[comp].options);
        }
    }
    delete params.assets; //no need to send up the data ("plots" objects contains all the selection and configuration info)
    delete params.calculatedMapData; //ditto
    callApi(params,
        function(jsoData, textStatus, jqXH){
            //first find to whether this is a new row or an update
            oGraph.gid = jsoData.gid; //has db id and should be in MyGraphs table...
            oGraph.ghash = jsoData.ghash;
            oGraph.isDirty = false;
            var objForDataTable = $.extend(true,{from: "", to: ""}, oGraph);
            delete objForDataTable.assets;
            objForDataTable.updatedt = new Date().getTime();
            if(('G' + oGraph.gid) in oMyGraphs){
                var trMyGraph;
                trMyGraph = $(dtMyGraphs).find('button[data=G' + oGraph.gid + ']').closest('tr').get(0);
                dtMyGraphs.fnUpdate(objForDataTable, trMyGraph);
            } else {
                dtMyGraphs.fnAddData(objForDataTable);
            }
            //update the graph and the Highchart objects
            if(jsoData.updatedAnnotations)oGraph.annotations= jQuery.parseJSON(jsoData.updatedAnnotations);

            oMyGraphs['G'+oGraph.gid]=$.extend(true,{}, oGraph);
            oPanelGraphs[visiblePanelId()] =  oGraph;
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
            cid:	oSeries.cid,
            to:		oSeries.save  //"H" for history, "S" for saved, null to remove
        },
        function(results, textStatus, jqXH){}
    );
}

function deleteMyGraph(panelID){
    //TODO: rewire this function to be executed from the graph editor
    var gid = oPanelGraphs[panelID].gid;
    var tabAnchor = $('a[href=#' + panelID + ']');
    var trGraph = dtMyGraphs.find('button[data=G' + gid + ']').closest('tr').get(0);
    callApi({command: 'DeleteMyGraphs',
            gids: [gid]
        },
        function(jsoData, textStatus, jqXH){
            removeTab(tabAnchor);  //destroy Highchart, panel, tab and cleans oPanelGraphs
            delete oMyGraphs['G' + gid];
            dtMyGraphs.fnDeleteRow(trGraph);
        }
    );
}
function addMySeriesRow(oMD){  //add to table and to oMySeries
    //TODO:  need to update existing oPanelGraphs if update.  Note new oPanelGraph objects should always be created using the freshest oMySeries.');
    if(oMD.handle){
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

    for(var pointIndex in PointArray){
        //console.info(pointIndex);
        var thisPoint = PointArray[pointIndex];
        if(oSeriesInfo.firstdt == null || oSeriesInfo.firstdt > thisPoint.x) oSeriesInfo.firstdt = thisPoint.x;
        if(oSeriesInfo.lastdt == null || oSeriesInfo.lastdt < thisPoint.x) oSeriesInfo.lastdt = thisPoint.x;
        if(oSeriesInfo.minValue == null || oSeriesInfo.minValue > thisPoint.y) oSeriesInfo.minValue = thisPoint.y;
        if(oSeriesInfo.maxValue == null || oSeriesInfo.maxValue < thisPoint.x) oSeriesInfo.maxValue = thisPoint.y;
        var xDateTime = new Date(thisPoint.x);
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
    /*
     console.info("timeOfDay: " + timeOfDay);
     console.info("dayOfWeek: " + dayOfWeek);
     console.info(dayOfWeek !== true);
     console.info("monthOfYear: " + monthOfYear);
     console.info("dayOfMonth: " + dayOfMonth);
     */
    if(timeOfDay === true) {oSeriesInfo.period = 'T'}
    else if(dayOfWeek !== true) {oSeriesInfo.period = 'W'}
    else if(dayOfMonth === true) {oSeriesInfo.period = 'D'}
    else if(monthOfYear === true) {oSeriesInfo.period = 'M'}
    else {oSeriesInfo.period = 'A'}

    return oSeriesInfo
}

//GRAPHING FUNCTIONS (note:  most graphing routines are in graph.js)
function createUpdateGraphFromMySeries(graphBuilder, panelId, quickViewSeries){ //optional oserie used to create new graph from quickview
    var oGraph;
    mask();
    if(panelId===undefined){
        var oGraph = emptyGraph();
        oGraph.plots = [];
    } else {
        oGraph = oPanelGraphs[panelId];
    }
    if(quickViewSeries){
//building from quickViewSeries
        if(!(quickViewSeries instanceof Array)){
            quickViewSeries = [quickViewSeries];
        }
        oGraph.seriesCount = quickViewSeries.length;
        for(var i=0;i<quickViewSeries.length;i++){
            var handle = quickViewSeries[i].handle;
            oGraph.assets[handle] = $.extend(true, {}, quickViewSeries[i]); //make copy
            oGraph.plots.push({components: [{handle: handle, options: {k: 1.0, op: '+'}}],options: {}});
        }
    }  else {
//building from MySeriesTable
//the jQuery will only find unfiltered rows, therefore...
        $('#series-table_filter :input').attr('value','').keyup();
        seriesFilterChange();
        dtMySeries.fnSort([[MY_SERIES_CHECK_COL, 'asc']]);
//build an object of the checked series
        var checkedSeries = {};
        oGraph.seriesCount = 0;
        $("#series-table a.md-checked.select_cell").each(function(){
            var tblObj = dtMySeries.fnGetData($(this).closest('tr').get(0));
            var key = $(this).closest('tr').find('td.quick-view button').attr('data'); //button data will be prefixed with L or S (or eventually U) ...
            checkedSeries[key] = oMySeries[key];  // ... and will be keep in sync with oMySeries
            oGraph.seriesCount++;
        });
        //this is needed when updating graph series based on checks.  Will be replaced by series provenance table and quickAdd functionality
        for(var existingKey in oGraph.assets){ //
            if(!(existingKey in checkedSeries)){delete oGraph.assets[existingKey]}
        }

        for(var handle in checkedSeries){
            oGraph.plots.push({components: [{handle: handle, options: {k: 1.0, op: '+'}, options: {}}]});
        }
    }
    //got all the data?  If not, fetch before creating graph
    getAssets(oGraph,
        function(jsoData, textStatus, jqXH){
            if(jsoData){
                for(var i=0;i<jsoData.seriesData.length;i++){
                    //Local series will always have data.  Eventually, add support for 'U' series
                    if(jsoData.seriesData[i].cid==jsoData.seriesData[i].lastestcid){
                        //graph may not being using the latest, but mySeries always will
                        oMySeries['S'+jsoData.seriesData[i].sid].data = jsoData.seriesData[i].data;
                    }
                    oGraph.assets['S'+jsoData.seriesData[i].sid].data = jsoData.seriesData[i].data;
                }
            }
            graphBuilder(oGraph, panelId);
            unmask();
        }
    );
}

function deleteCheckedSeries(){
    //show checked series
    $('#series-table_filter :input').attr('value','').keyup();
    seriesFilterChange();
    dtMySeries.fnSort([[1, 'asc']]);
//build an object of the checked series
    var checkedSeries = {};
    $("#series-table a.md-checked.select_cell").each(function(){
        var trSeries = $(this).closest('tr').get(0);  //this is the checked table cell
        delete oMySeries[$(trSeries).find("td.dt-vw a").attr("data")]; //delete from oMySeries
        var obj = dtMySeries.fnGetData(trSeries);
        if(account.loggedIn()){
            obj.save = null;
            updateMySeries(obj);  //delete from DB
        }
        dtMySeries.fnDeleteRow(trSeries); //delete from "My Series" dataTable
    });
}

// actual addTab function: adds new tab using the title input from the form above.  Also checks and sets the edit graph button
function addTab(title) {
    var tab_title =  (title.length==0)?'Graph '+tab_counter:title;
    var newTab = $graphTabs.tabs('add', '#graphTab'+tab_counter, tab_title);
    $('#graphTab'+tab_counter).addClass('graph-panel');
    //this causes problem when deleting tabs
    $( "#canvas" ).tabs().find( ".ui-tabs-nav" ).sortable({ axis: "x" });
    $graphTabs.tabs('select', $graphTabs.tabs('length') - 1);
    $(".ui-tabs-selected a").each(function(){$(this).attr("title", $(this).html())});
    tab_counter++;
    resizeCanvas();
    $("#btnEditGraphTop").removeAttr("disabled");
    if($("#delete-my-series").attr("disabled")!="disabled"){
        $("button.add-to-graph").removeAttr("disabled");
    }
    //in revised layout, show only if graph tabs and search tables are shown  $("#show-hide-pickers").show();
    $('#graph-tabs a:last').click(function(){
        hideGraphEditor()
    });
    /*    $('#canvas .graph-panel:last div.chart').dblclick(function(){
     editGraph(); todo: modify the graph's plots by adding from quickViews or by deleting form graphs's series provenance panel
     });*/
    return($('#canvas .graph-panel:last').attr('id'));
}
//run when a graph tab is deleted.  Also checks and sets the edit graph button and global variable
function removeTab(span){
    var panelRef = $(span).parent().children("a").attr("href");
    var panelId = panelRef.substr(1);
    $(panelRef).remove();
    $(span).parent().remove();
    destroyChartObject(panelId);
    delete oPanelGraphs[panelId];
    $graphTabs.tabs('refresh'); //tell JQUI to sync up
    if($graphTabs.find("li").length == 0){
        editingPanelId = null; //dissociate the chart from the this edit session
        $("#btnEditGraphTop").attr("disabled","disabled");
        $("button.add-to-graph").attr("disabled","disabled");
        clearChecksMySeries(); //set up panels
        lastTabAnchorClicked.click();
    } else  {
        $('#graph-tabs a:last').click();
    }
    $("#graph_title").attr('value','');
    $(".series-checked").attr('disabled','disabled');
}



/*
 function editGraph(){    //no longer called.  This used to be how the series could be added or deleted to an chart by checking / unchecking MySeries.
 // TODO:  Add series from quickViews and deleting them from graph's series provenance panel

 var activePanelId = $graphTabs.find(".ui-tabs-selected").find("a").attr("href");  //this finds the li/a that is active and gets it href
 editingPanelId = activePanelId.substr(1);
 var oGraph = oPanelGraphs[editingPanelId];
 //    $("#graph_title").attr("value",chart.options.title.text);

 //clear filter and checkboxes, and sort on (checked, date)
 $('#series-table_filter :input').attr('value','').keyup();
 seriesFilterChange();

 $(".update-graph").removeAttr("disabled");
 showGraphEditor();

 //did not work:  dtMySeries.fnSort([-1,'asc']);
 $(dtMySeries).find("td.dt-vw a.md-checked").each(function(){
 clickMySeriesCheck(this);
 });
 var allSeriesFound = true;
 for(var key in oGraph.assets){
 var thisSeriesFound = checkSeriesById(oGraph.assets[key]);
 allSeriesFound = allSeriesFound && thisSeriesFound;
 if(thisSeriesFound!=true){
 alert("Error: Unable to find series '" + oGraph.assets[key].name + '" in My Series.');
 }
 }
 dtMySeries.fnSort([[1,'asc'],[MY_SERIES_DATE, 'desc']]);
 $('a[data=#localSeries]').click();
 }
 */

function checkSeriesById(ogSeries){
//only checks visible series, therefore filter must be off
    var id;
    id = (ogSeries.localId)? ogSeries.localId : 'S' + ogSeries.sid;
    var btn = dtMySeries.find("button[data='" + id + "']").closest('tr').find("td.dt-vw a");
    if(btn.length==1){
        clickMySeriesCheck(btn.get(0));
        return(true);
    }else{
        return(false);
    }
}

function destroyChartObject(key){
    if(oHighCharts[key]){
        oHighCharts[key].destroy();
        delete oHighCharts[key];
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

function seriesPanel(anchorClicked){
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
    var picker = $("#series-tabs li.ui-tabs-selected a").attr('data');
    switch(picker){
        case '#local-series':
            return encodeURI('t=ms&s='+$('#series-table_filter input').val());
        case '#cloud-series':
            return encodeURI('t=cs&s='+$('#series_search_text').val()+'&f='+$('#series_search_periodicity').val()+'&api='+$('#series_search_source').val()+'&sets='+$('#public-mapset-radio').find('input:checked').val());
        case '#myGraphs':
            return encodeURI('t=mg&s='+$('#my_graphs_table_filter input').val());
        case '#publicGraphs':
            return encodeURI('t=cg&s='+$('#public_graphs_search input').val());
        default:
            var visiblePanel = visiblePanelId();
            if(visiblePanel && oPanelGraphs[visiblePanel]){
                return encodeURI('t=g'+visiblePanel.substr(8)+(oPanelGraphs[visiblePanel].ghash?'&graphcode='+oPanelGraphs[visiblePanel].ghash:''));
            }
    }
}
function setPanelHash(){
    var hash = panelHash();
    if(hash && hasher.getHash()!=hash) setHashSilently(hash);
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
        data:$.extend({uid: getUserId(),accessToken: account.info.accessToken}, params),
        dataType: 'json',
        success: function(jsoData, textStatus, jqXHR){
            if(jsoData.status=="ok"){
                console.info(params.command+': '+jsoData.exec_time);
                callBack(jsoData, textStatus, jqXHR);
                if(params.modal!='persist')unmask();
                if(jsoData.msg) dialogShow('', jsoData.msg);
            } else {
                unmask();
                dialogShow('Connected to server, but the command failed.', jsoData.status+'<br><br>If this occurs again, please email <a href="mailto:support@mashabledata.com">support@mashabledata.com</a>.');
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
