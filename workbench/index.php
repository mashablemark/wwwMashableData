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
    <link  rel="stylesheet" href="/global/css/jquery.handsontable.css" />
    <link rel="stylesheet" media="screen" href="/global/css/jquery.contextMenu.css">
    <link rel="stylesheet" media="screen" href="/global/css/jquery-jvectormap-1.1.1.css">
    <link  rel="stylesheet" href="md_workbench.css" />
    <link rel="stylesheet" href="js/fancybox/jquery.fancybox-1.3.4.css" type="text/css">
    <link rel="stylesheet" href="/global/js/loadmask/jquery.loadmask.css" type="text/css">


    <!--JavaScript files-->
    <script type="text/javascript" src="/global/js/jquery/jquery-1.8.3.js"></script><!-- latest verions is 1.8.3-->
    <!--script type="text/javascript" src="/global/js/jqueryui/jquery-ui-1.8.16.custom.min.js"></script-->
    <script type="text/javascript" src="/global/js/jqueryui/jquery-ui-1.9.2.custom.min.js"></script>
    <script type="text/javascript" src="/global/js/datatables/jquery.dataTables.1.8.2.min.js"></script><!-- latest version is 1.9.4-->
    <script type="text/javascript" src="/global/js/sparklines/jquery.sparkline.js"></script><!-- version 2.1-->
    <script type="text/javascript" src="common.js"></script>

    <!--script type="text/javascript" src="js/ColVis.min.js"></script-->
    <!--script type="text/javascript" src="js/ColReorder.min.js"></script-->
    <!--script type="text/javascript" src="js/ColReorderWithResize.js"></script-->
    <script type="text/javascript" src="js/fancybox/jquery.fancybox-1.3.4.pack.js"></script>
    <script type="text/javascript" src="/global/js/loadmask/jquery.loadmask.min.js"></script>
    <!--script  type="text/javascript" src="js/jquery-jvectormap-1.0.js"></script-->
    <script type="text/javascript" src="graph.js"></script>

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
<script type="unknown-mustche-template" id="mtemplate_quickAdd">
    <ul>
        {{#words}}
        <li>{{.}}</li>
        {{/words}}
    </ul>
</script>

<script language="javascript" type="text/javascript">
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
var standardAnnotations = [];  //filled by API call on first use
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
var tab_counter = 1; //incemented with each new $graphTabs and used to create unqiueID.  Not a count, as tab can be deleted!
//var $pickerTabs; ul#series-tabs ("My Series|Public Series|My Graphs|Public Graphs")  tabs are set and managed seriesPanel() (not ny jQuery UI)

var oQuickViewSeries; //global storage of last series quick-viewed.  Used by "Add to my Series" and "add ot Graph" button functions.
var quickChart;
var newPlotIDCounter = -1; //new plots get negative ids (i.e. 'P-8-') which get positive DB identifers on save (the trailing '-' prevents search and replace confusion
//authentication variables
var loggedIn = false;
var fb_user = null;
var fbAppId = '209270205811334';
var md_userId = null;
var orgId, orgName;
var accessToken; //set in doc.ready after check that browser has localStorage
var expiresIn = null;
var myPreferences = {uselatest: 'N'};
var lastTabAnchorClicked;  //when all graphs are deleted, this gets shown
//top menu variables and routines.  Currently ony used for logm, but could be expanded to help and setting/preferences
var ddmenuTimeout    = 500;
var ddmenuClosetimer = 0;
var ddmenuitem = 0;
function jsddm_open(){jsddm_canceltimer();jsddm_close();ddmenuitem = $(this).find('ul').css('visibility', 'visible');}
function jsddm_close(){  if(ddmenuitem) ddmenuitem.css('visibility', 'hidden');}
function jsddm_timer(){  ddmenuClosetimer = window.setTimeout(jsddm_close, ddmenuTimeout);}
function jsddm_canceltimer(){if(ddmenuClosetimer){window.clearTimeout(ddmenuClosetimer);ddmenuClosetimer = null;}}
document.onclick = jsddm_close;

if(typeof console == 'undefined') console = {info: function(m){}, log: function(m){}};

function addJQueryStringify(){ //stringify extension ensure stringify functionality for older browsers
    jQuery.extend({
        stringify  : function stringify(obj) {
            if ("JSON" in window) {
                return JSON.stringify(obj); //use the browser function whenever possible
            }
            var t = typeof (obj);
            if (t != "object" || obj === null) {
                // simple data type
                if (t == "string") obj = '"' + obj + '"';
                return String(obj);
            } else {
                // recurse array or object
                var n, v, json = [], arr = (obj && obj.constructor == Array);
                for (n in obj) {
                    v = obj[n];
                    t = typeof(v);
                    if (obj.hasOwnProperty(n)) {
                        if (t == "string") {
                            v = '"' + v + '"';
                        } else if (t == "object" && v !== null){
                            v = jQuery.stringify(v);
                        }
                        json.push((arr ? "" : '"' + n + '":') + String(v));
                    }
                }
                return (arr ? "[" : "{") + String(json) + (arr ? "]" : "}");
            }
        }
    });
}

window.fbAsyncInit = function() { //called by facebook auth library after it loads (loaded asynchronously from doc.ready)
    FB.init({
        appId      : fbAppId, // App ID
        channelURL : '//www.mashabledata.com/fb_channel.php', // Channel File
        status     : true, // check login status
        cookie     : true, // enable cookies to allow the server to access the session
        oauth      : true, // enable OAuth 2.0
        xfbml      : true  // parse XFBML
    });

    FB.getLoginStatus(function(response) {
        if (response.authResponse) {
            loggedIn = "Facebook";  //global variable
            accessToken = response.authResponse.accessToken; //TODO: save this in user account from //www.mashabledata.com/fb_channel.php and pass in all server requests
            expiresIn = response.authResponse.expiresIn;
            FB.api('/me', function(response) {
                fb_user = response;  //global variable
                getUserId();
            });
        }
    });
};

// Load the SDK Asynchronously
/*(function(d){
 var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
 if (d.getElementById(id)) {return;}
 js = d.createElement('script'); js.id = id; js.async = true;
 js.src = "//connect.facebook.net/en_US/all.js";
 ref.parentNode.insertBefore(js, ref);
 }(document));*/

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
    require(["/global/js/handsontable/jquery.handsontable.0.7.0.src.js","/global/js/contextMenu/jquery.contextMenu.1.5.14.src.js"]);

    addJQueryStringify();   // add extension after jQuery guarenteed to be loaded
    $(".show-graph-link").fancybox({
        'width'             :  '100%',
        'height'            : '100%',
        'autoScale'         : true,
        'showCloseButton'   : false,
        //'overlayOpacity'    : 0,
        'transitionIn'		: 'none',
        'transitionOut'		: 'none'
    });
    jQuery.fancybox.center = function() {};
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
            .click({
                account.showLogin
            });
    $("#menu-help").button({icons: {secondary: "ui-icon-help"}});
    $('#jsddm > li').bind('mouseover', jsddm_open);
    $('#jsddm > li').bind('mouseout',  jsddm_timer);
    lastTabAnchorClicked = $("#series-tabs li a").click(function (){seriesPanel(this)}).filter("[data='#local-series']").get(0);
    //$pickerTabs = $("#pickers" ).tabs();
    /*	$( "#graph_text" ).resizable({ minWidth: 705, maxWidth: 705,  minHeight: 30, maxHeight: 160, resize: function(event, ui) {
     console.log(ui.size.height + ":" + ui.originalSize.height);
     }
     }); */
    /*
     //handle the textarea resize
     var t = jQuery('#test');
     t.data('x', t.outerWidth());
     t.data('y', t.outerHeight());
     */

    layoutDimensions.heights.scrollHeads = $("div#local-series div.dataTables_scrollHead").height();
    resizeCanvas();
    setupMySeriesTable();
    //loadMySeriesByKey('localSeries');  //load everything in localStorage & updates to/from cloud as needed
    setupMyGraphsTable(); //loaded on sync account.  No local storage for graphs.

    var $tab_title_input = $('#tab_title'), $tab_content_input = $('#tab_content');


    // tabs init with a custom tab template and an "add" callback filling in the content
    $graphTabs = $('#canvas').tabs({
        tabTemplate: '<li class="graph-tab"><a href="#{href}">#{label}</a> <span class="ui-icon ui-icon-close" onclick="removeTab(this)">Remove Tab</span></li>',
        add: function(event, ui) {
            var tab_content = 'Loading graph.  Please wait.';
            return($(ui.panel).append('<p>'+tab_content + '</p>'));
        }
    });

    //authorization/log in sequence
    if(window.localStorage.getItem('authorized')==null){
        // modal dialog init: custom buttons and a "close" callback reseting the form inside
        showAuthorizeDialogue();
    } else {
        if(window.localStorage.getItem('authorized')=="no"){
            $('#dialog').prepend('<span style="color:red;">The MashableData service has been disabled on this computer. It must be enabled to use the workbench.</span><br><br>');
            showAuthorizeDialogue();
            $('#btn-dia-disable').remove();
        } else {
            //TODO: remove this localhost workaround
            if(document.URL.indexOf('localhost')>=0){
                loggedIn = true;
                md_userId = 2;
                accessToken = 'AAACZBVIRHioYBAKJp0bvvwdDKYmnUAwYcjRn4dCeCZCriYZAiDIU85IucIt0pDrEK7wvIqRAImAvbQdbltGhcvbGxZCUDusDFdw6BSt5wwZDZD';
                syncMyAccount();
            } else {
                initFacebook();  //intialized the FB JS SDK.  (Does not make user login, but will automatically authenticate a FB user who is (1) logged into FB and (2) has authorized FB to grant MashableData basic permissions
            }
        }
    }

    $(window).bind("resize load", resizeCanvas()).bind("focus", function(event){
        if(mySeriesLoaded){
            if(loadMySeriesByKey('newSeries')>0){
                dtMySeries.fnFilter('');
                dtMySeries.fnSort([[MY_SERIES_DATE, 'asc']]);
            }
        }
        event.bubbles = true;
        return true;
    });

    setupPublicSeriesTable();
    setupPublicGraphsTable();
    //$("div.dataTables_scrollBody").height(layoutDimensions.heights.innerDataTable);  //set within resize() too

    $("div.dataTables_scrollBody").height(layoutDimensions.heights.innerDataTable); //resizeCanvas already called, but need this after datatable calls
    unmask();
    loadSources();
    $('ul#series-tabs').click(function(){
        showGraphEditor()
    });
});
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
                    var sHandle;
                    if(obj.aData.usid) sHandle = "U"+obj.aData.usid;
                    else {if(obj.aData.sid) sHandle = "S"+obj.aData.sid;
                    else {if(obj.aData.lid) sHandle = "L"+obj.aData.lid;}}
                    return '<button data="' + sHandle + '" onclick="getQuickViewData(this)">View</button>'
                }
            },
            {"mDataProp": "selected", "sTitle": "<span></span>", "sClass": 'dt-vw', "bSortable": true, "sWidth": colWidths.checkbox + "px", "resize": false,
                "fnRender": function(obj){
                    var id =  (isNaN(parseInt(obj.aData.lid)))?"S"+obj.aData.sid:obj.aData.lid;
                    if(obj.aData.selected) {
                        return '<a class="select_cell md-checked rico" onclick="clickMySeriesCheck(this)" title="select series to graph"> Series selected (order ' + obj.aData.selected + '</a>';
                    } else {
                        return '<a class="select_cell md-check rico" onclick="clickMySeriesCheck(this)"  title="select series to graph">Not selected</a>';
                    }
                }
            },
            /*{ "mDataProp": "save", "sTitle": "<span></span>", "sClass": 'dt-sv',  "bSortable": true, "sType": "html", "sWidth": colWidths.save + "px", "resize": false,
             "fnRender": function(obj){
             if(obj.aData.save=='H'){
             return '<a class="save_cell md-save rico"  onclick="clickSave(this)" title="save permanently or only to local storage (space permitting)">Saved as my recent views.  This storage space is limited.  Click to mark to permanently store in my MashableData account.</a>';
             } else {
             return '<a class="save_cell  md-saved rico" onclick="clickSave(this)" title="save permanently or only to local storage (space permitting)">Saved to my MashableData account\'s permanent storage. Click to move to my accounts temporary working storage.</a>';
             }
             }
             },*/
            //{ "bSortable": false, "sClass": 'gt',  "sWidth": "120px"},
            { "mDataProp": "name", "sTitle": "Series Name<span></span>", "sClass": 'sn', "bSortable": true, "sWidth": seriesColWidth + "px",
                "fnRender": function(obj){
                    return ((obj.aData.mapsetid)?'<span class="ui-icon ui-icon-mapset" title="This series is part of a map set."></span>':'')
                            + ((obj.aData.pointsetid)?'<span class="ui-icon ui-icon-pointset" title="This series is part of a point set."></span>':'')
                            + formatAsSpanWithTitle(obj);
                }
            },
            { "mDataProp": "units", "sTitle": "Units<span></span>", "sClass": "units", "bSortable": true, "sWidth": unitsColWidth + "px",  "fnRender": function(obj){return formatAsSpanWithTitle(obj)}},
            { "mDataProp": "period", "sTitle": "P<span></span>", "sClass": 'dt-freq', "bUseRendered":false, "bSortable": true, "sWidth": colWidths.periodicity + "px", "fnRender": function(obj){return formatPeriodWithSpan(obj.aData.period)}},
            { "mDataProp":"firstdt", "sTitle": "from<span></span>",  "sClass": "dte", "bUseRendered":false, "sWidth": colWidths.shortDate+"px", "bSortable": true, "asSorting":  [ 'desc','asc'],
                "fnRender": function(obj){return formatObjDate(obj)}
            },
            { "mDataProp":"lastdt", "sTitle": "to<span></span>",  "sClass": "dte", "bUseRendered":false, "sWidth": colWidths.shortDate+"px",  "bSortable": true, "asSorting":  [ 'desc','asc'], "resize": false,"fnRender": function(obj){return formatObjDate(obj)} },
            { "mDataProp": "graph", "sTitle": "Category<span></span>",  "bSortable": true, "sWidth": graphColWidth + "px", "fnRender": function(obj){return formatAsSpanWithTitle(obj)}},
            { "mDataProp": null, "sTitle": "Source<span></span>", "sClass": 'dt-source',  "bSortable": false, "sWidth": colWidths.src + "px", "resize": false,
                "fnRender": function(obj){
                    if(obj.aData.sid) return formatAsUrl(obj.aData.url) + obj.aData.src;
                    if(obj.aData.usid) return '<span class=" ui-icon ui-icon-person" title="user series"></span> ' +  obj.aData.src;
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
        "fnServerData": function ( sSource, aoData, fnCallback ) {
            var thisSearch =  $("#tblPublicSeries_filter input").val();
            aoData.push({name: "command", value: "SearchSeries"});
            aoData.push({name: "uid", value: getUserId()});
            aoData.push({name: "accessToken", value: accessToken});
            aoData.push({name: "periodicity", value: $("#series_search_periodicity").val()});
            aoData.push({name: "apiid", value: $("#series_search_source").val()});
            aoData.push({name: "catid", value: searchCatId});
            aoData.push({name: "mapset", value: $("input:radio[name=public-mapset-radio]:checked").val()});
            aoData.push({name: "lastSearch", value: lastSeriesSearch});
            aoData.push({name: "search", value: thisSearch});
            aoData.push({name: "uid", value: getUserId()});
            aoData.push({name: "accessToken", value: accessToken});
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
                return ((obj.aData.mapsetid)?'<span class="ui-icon ui-icon-mapset" title="This series is part of a map set."></span>':'')
                        + ((obj.aData.pointsetid)?'<span class="ui-icon ui-icon-pointset" title="This series is part of a point set."></span>':'')
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
                    return '<button data="G' + obj.aData.gid + '" onclick="clickViewGraph(' + obj.aData.gid + ')">open</button>'}
            },
            {"mDataProp":"title", "sTitle": "Title<span></span>", "bSortable": true,  "sWidth": titleColWidth+"px", "fnRender": function(obj){
                return formatAsSpanWithTitle(obj)
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
        "bProcessing": true,
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
function seriesCloudSearch(){
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
function clickViewGraph(gid){
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
        close: function() {
        }
    });
    $('.ui-dialog-titlebar-close').remove();
}

//LOCALSTORAGE HELPER FUNCTIONS  (LS also referenced from doc.ready, syncMyAccount, deleteCheckedSeries
function loadMySeriesByKey(key){   //key is either 'newSeries' or 'localSeries'
    var localSeries = window.localStorage.getItem(key); //converted to a single master index from separate Saved and History indexes
    window.localStorage.removeItem('newSeries');  //used to indicate if the series table needs to be refreshed.
    var seriesLoadCount = 0;
    var mySerie;
    if(localSeries!=null){
        var aryIds = localSeries.split('|');
        for(var i=0;i<aryIds.length;i++){
            /*            try{*/
            mySerie = createMdoFromLS(aryIds[i]);
            if(mySerie.sid!=null){ //mySerie has already been captured
                if (loggedIn || accessToken) {          // ...add to MySeries in cloud
                    var params = {
                        command:'ManageMySeries',
                        jsts: new Date().getTime(),
                        handle:mySerie.handle,
                        cid:mySerie.cid,
                        to:mySerie.save
                    };

                    callApi(params,
                            function (oReturn, textStatus, jqXH) {
                                if (oReturn.newCapture) uploadCount += 1;
                                removeIdFromStorageList(mySerie.lid, 'localSeries');
                                window.localStorage.removeItem('meta' + mySerie.lid);
                                window.localStorage.removeItem('data' + mySerie.lid);
                            }
                    );
                } else {  // if not logged in, make sure it's localId is added to obj
                    mySerie.lid = aryIds[i];
                }
                mySerie.added =  mySerie.save_dt;  //different coming out of GetMySeries
                addMySeriesRow(mySerie);                 //will overwrite if series being loaded already in oMySeries
            } else { //cloud process before adding
                mySerie.lid = aryIds[i];
                var params = $.extend({command:  'UploadMyMashableData'},mySerie);
                callApi(params,
                        function(oReturn, textStatus, jqXH){
                            if(oReturn.newCapture) uploadCount+=1;
                            mySerie.sid = oReturn.sid;
                            mySerie.cid = oReturn.cid;
                            window.localStorage.setItem('meta' + mySerie.lid,window.localStorage.getItem('meta' + mySerie.lid).replace('||sid|null||','||sid|'+mySerie.sid+'||').replace('||cid|null||','||cid|'+mySerie.cid+'||'));
                            if(params.uid!=null){
                                removeIdFromStorageList(mySerie.lid, 'localSeries');
                                window.localStorage.removeItem('meta' + mySerie.lid);
                                window.localStorage.removeItem('data' + mySerie.lid);
                                delete mySerie.lid;
                            }
                            addMySeriesRow(mySerie);
                        }
                );
            }
            seriesLoadCount++;
            /*            } catch(ex){  //error handling when localSeries key does not have the whole thing
             window.localStorage.removeItem('meta'+aryIds[i]);
             window.localStorage.removeItem('data'+aryIds[i]);
             aryIds.splice(i,1);
             if(aryIds.length==0){
             window.localStorage.removeItem(key);
             } else {
             window.localStorage.setItem(key,aryIds.join('|'));
             }
             i--;
             }*/
        }
    }
    mySeriesLoaded = true;
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
function createMdoFromLS(id){
    var meta =  window.localStorage.getItem('meta' + id);
    var oMashableData = { };
    var aryMeta = meta.split('||');
    for(var i=0;i<aryMeta.length;i++){
        var kvPair = aryMeta[i].split('|');
        oMashableData[kvPair[0]] = (kvPair[1]=='null')?null:kvPair[1];
    }
    oMashableData.lid=id;
    if(oMashableData.uselatest == null)  oMashableData.uselatest = myPreferences.uselatest;
    oMashableData.selected=false;
    oMashableData.data = window.localStorage.getItem('data' + id);
    return oMashableData;
}

//UI HELPER FUNCTIONS
function showHideGraphEditor(){
//	$(".show-hide").slideToggle("slow", function(){  //callback fires 3 times, one for each .show-hide div
    var current = $("div.picker:visible").length;
    if(current==1){
        $(".show-hide").slideToggle(function(){ //callback prevents close click from tiggering a showGraphEditor
            //$("#graph-composer-header").on('click',function(evt){showGraphEditor()});
            var panelToDeactive = $("#series-tabs li.ui-tabs-selected").removeClass("ui-tabs-selected ui-state-active").find("a").attr("data");
            $(panelToDeactive).hide();
        });
/*        $(".graphEditorClosedControls").show();
        $("div.graph-composer-header").css("cursor","pointer");*/
        $("#show-hide-pickers").hide();  //html('<span class="ui-icon browse-rolldown">show search tables</span>');
    } else {
        $(".show-hide").slideToggle(function(){
        });
/*        $(".graphEditorClosedControls").hide();
        $("div.graph-composer-header").css("cursor","default");
        $("#graph-composer-header").off('click');*/
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

//CORE FUNCTIONS
function updateMetaData(meta, key, value){
    var aryKeyValue = meta.split('||');
    for(var i=0;i<aryKeyValue.length;i++){
        if(aryKeyValue[i].split('|')[0]==key){
            aryKeyValue[i] = aryKeyValue[i].split('|')[0] + '|' + value;
            break;
        }
    }
    return aryKeyValue.join('||');
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
    callApi({command:  'GetMashableData',
                sids: sids,
                usids: usids
            },
            function(jsoData, textStatus, jqXH){
                if(oMySeries[sHandle]){ //if this happens to be in mySeries...
                    oMySeries[sHandle].data = jsoData.series[sHandle].data;
                    oMySeries[sHandle].notes = jsoData.series[sHandle].notes;
                }
                quickGraph(jsoData.series[sHandle],canAddSeries)
            }
    );
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
        if(obj.plots){ //a grahps object was passed in
            quickGraph = obj; //everything including title should be set by caller
        } else {
            quickGraph = emptyGraph();
            quickGraph.assets[obj.handle] = obj;
            quickGraph.title = obj.name;
            quickGraph.plots = [{components:[{handle:obj.handle, options:{k:1, op:'+'}}],  options:{}}];
            $('#quick-view-controls').attr('data', obj.handle);
        }
    }
    var quickChartOptions = createChartObject(quickGraph);
    delete quickChartOptions.chart.height;
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
        if(obj.mapsetid || obj.pointsetid){
            var $mapSelect =  $('select.quick-view-maps').html("");
            var mapOptions = "";
            callApi({command: "GetAvailableMaps", mapsetid: obj.mapsetid, pointsetid: obj.pointsetid}, function(jsoData, textStatus, jqXH){
                for(var i=0;i<jsoData.maps.length;i++){
                    mapOptions+='<option value="'+jsoData.maps[i].name+'">'+jsoData.maps[i].name+' ('+jsoData.maps[i].count+')</option>';
                }
                $mapSelect.html(mapOptions);
            });

            $('.quick-view-maps').show();
        } else $('.quick-view-maps').hide();
    } else $('.quick-view-maps').hide();
    $('#qv-info').html(qvNotes);

    if(showAddSeries){
        $('#quick-view-to-series').show();
    } else {
        $('#quick-view-to-series').hide();
    }

    var graphOptions = '<option value="new">new graph</option>';
    var visiblePanel = visiblePanelId();
    $('div.graph-panel').each(function(){
        var $tabLink = $("ul#graph-tabs li a[href='#"+this.id+"']");
        graphOptions+='<option value="'+this.id+'"'+(($tabLink.closest("li").hasClass("ui-tabs-selected"))?' selected':'')+'>'+$tabLink.get(0).innerHTML+'</option>';
    });
    $('#quick-view-to-graphs').html(graphOptions);
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
                    name: null,
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
    require(['js/maps/jquery_jvectormap_' +  jVectorMapTemplates[oGraph.map] + '.js']); //preload it
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
        require(['js/maps/jquery_jvectormap_' + jVectorMapTemplates[oGraph.map] + '.js'],function(){
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
            for(i=jsoData.chains[chain].length-1;i>=0;i--){
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
                            + ((parseInt(props.scount)>0)?'<a title="Click to view the '+props.scount+' series in this category" onclick="publicCat(\''+props.name+'\','+props.catid+')">':'') + props.name +' (' + props.scount + ')'+ ((parseInt(props.scount)>0)?'</a>':'')
                            + ((props.children>0 && childless)?'<span class="ui-icon browse-right" data="'+ props.catid +'" onclick="showChildCats(this)">show child categories</span>':'')
                            + '</span></td>');

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
    if(sHandle) showSeriesEditor(sHandle); //make sure one is found
}

var seriesEditorInitialised=false;
var periodOfEdits=false;
var editorCols = 2;
function initializeSeriesEditor(){
    editorCols = 2;
    $('div#edit-user-series').show().height($('div#local-series').height());
    var $editor = $("#data-editor").height($('div#local-series').height()-100).html('');
    $editor.handsontable({
        rows: 5,
        cols: 2,
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
        legend:[
            {
                match: function(row, col, data) {return (row <= 2 && col ==0);}, //if it is first row
                style: {
                    "background-color": '#E0FFFF', //bold text on aqua background
                    fontWeight: 'bold'
                },
                readOnly: true
            },
            {
                match: function(row, col, data) {return (row == 3);}, //if it is first row
                style: {
                    "background-color": '#808080', // bold text on grey background
                    fontWeight: 'bold'
                },
                readOnly: true
            },
            {
                match: function(row, col, data) {  //number cell
                    return (row > 3 && col>0 && isNaN(data()[row][col]) && data()[row][col].toLowerCase()!="null");
                },
                style: {
                    color: '#FF0000' // red text
                },
                title:"Must be a number or 'NULL'"
            }
        ],
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
            if(source=="paste"||source=="edit"){ //auto generate dates if needed
                for(var i=0;i<changes.length;i++){
                    if(changes[i][1]>0&&changes[i][0]>4){ //not a date or a header cell or the first data row (which has no preceeding date)
                        var myDate = $editor.handsontable('getDataAtCell', changes[i][0], 0);
                        if(myDate==""){ //corresponding date cell is empty
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
            }
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
    Handsontable.TextCell.renderer.apply(this, arguments);
    if(row < 3 && col == 0){
        td.style.background = '#E0FFFF';
        td.style.fontWeight = 'bold';
    }
    if(row == 3){
        td.style.background = '#808080';
        td.style.fontWeight = 'bold';
    }
}
function validatePaste(changes){}
function showSeriesEditor(series_handle){
    require(["/global/js/handsontable/jquery.handsontable.0.7.0.src.js","/global/js/contextMenu/jquery.contextMenu.1.5.14.src.js"], function(){seriesEditor(series_handle)});
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
            var data = oSerie.data.split("||");
            for(var i=0;i<data.length;i++){
                data[i] = data[i].split("|");
                data[i][0]=formatDateByPeriod(dateFromMdDate(data[i][0],oSerie.period).getTime(),oSerie.period);
            }
            data.unshift(["name", oSerie.name],["units",oSerie.units],["notes",oSerie.notes],["date","value"]);
            $("#data-editor").attr("data",series_handle).handsontable("loadData", data);
        } else {
            var sids = [], usids=[];
            if(series_handle.charAt(0)=="U")usids.push(parseInt(series_handle.substr(1))); else sids.push(parseInt(series_handle.substr(1)));
            callApi({command:  'GetMashableData', sids:  sids, usids: usids},
                    function(jsoData, textStatus, jqXH){
                        oSerie.data = jsoData.series[series_handle].data;
                        oSerie.notes = jsoData.series[series_handle].notes;
                        var data = jsoData.series[series_handle].data.split("||");
                        for(var i=0;i<data.length;i++){
                            data[i] = data[i].split("|");
                            data[i][0]=formatDateByPeriod(dateFromMdDate(data[i][0],oSerie.period).getTime(),oSerie.period);
                        }
                        data.unshift(["name", oSerie.name],["units",oSerie.units],["notes",oSerie.notes],["date","value"]);
                        $("#data-editor").attr("data",series_handle).handsontable("loadData", data);
                    }
            );
        }
    }else {
        $("#data-editor").removeAttr("data").handsontable("loadData", [["name", ""],["units",""],["notes",""],["date","value"]]);
        periodOfEdits = false;
    }
}
function saveSeriesEditor(SaveCopy){
//build series and validate
    var $editor = $("#data-editor");
    var gridData = $editor.data('handsontable').getData();
    var userSeries = [];
    var uSerie, pointArray, seriesInfo, mdata;
    var c, r, x, y, udt;
    for(c=1;c<gridData[0].length;c++){
        var totalChanges="";
        for(r=0;r<gridData.length;r++){ //does this column have anything?
            if(r!=3)totalChanges+=gridData[r][c];
            if(nonWhitePattern.test(totalChanges)) break; //exit on first non-empty cell = fast
        }
        if(nonWhitePattern.test(totalChanges)) {   //don't try to save empty column

            uSerie = {
                "name":gridData[0][c],
                "units":gridData[1][c],
                "notes":gridData[2][c],
                "save_dt": new Date().getTime()
            };
            if(c==1&&!SaveCopy){ //first data column = series being edited if USID set
                var sHandle = $editor.attr("data");
                if(sHandle&&sHandle.charAt(0)=="U"){
                    uSerie["usid"]=sHandle.substr(1);
                    uSerie["handle"] = sHandle;
                }
            }
            if(uSerie.name.length==0||uSerie.units.length==0){
                dialogShow("Unable to Save","Name and units are required fields.");
                return false;
            }
            userSeries.push(uSerie);
            pointArray=[];
            mdata = "";
            for(r=4;r<gridData.length;r++){
                if(gridData[r][c]!==null&&gridData[r][c].length>0){//if empty value, skip
                    if(isNaN(gridData[r][c]) && gridData[r][c].toLowerCase()!='null'){
                        dialogShow("Unreadable Values","Values must be numbers or 'NULL' for non-empty values.");
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
            uSerie = userSeries[c-1];
            $.extend(uSerie, seriesInfo,{command: "SaveUserSeries"});
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
            callApi(uSerie,
                    function(jsoData, textStatus, jqXH){
                        //add update MySeriesGrid on success
                        if(uSerie.handle){  //update operation
                            var trSerie = dtMySeries.find("button[data='"+uSerie.handle+"']").closest("tr").get(0);
                            dtMySeries.fnDeleteRow(trSerie); //problems with the update on the manipulated cells.  Easier to detle and add.
                            uSerie.cid = jsoData.cid;
                        } else { //insert new operation
                            uSerie.handle = "U"+jsoData.usid;
                            uSerie.usid = jsoData.usid;
                            uSerie.cid = jsoData.cid;
                            uSerie.src = jsoData.src;
                        }
                        dtMySeries.fnAddData(uSerie);
                        oMySeries["U"+jsoData.usid]=uSerie;  //over-write
                    }
            );
        }
    }
    closeSeriesEditor();
}

function closeSeriesEditor(){
    $("#data-editor").handsontable('clear');
    $("#data-editor").handsontable('updateSettings', {"cols":2});
    $('div#edit-user-series').slideUp();
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
    $tcat.find('span.sibling, span.ui-icon-grip-dotted-vertical, span.browse-right').remove();
    $tcat.removeClass("italics");
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
                    $td.find("span.chain").append(' <span class="ui-icon browse-right" onclick="showChildCats(this)">show child categories</span>');
                }
            } else {
                $td.append('<br /><span class="ui-icon ui-icon-grip-dotted-vertical"></span><span class="sibling" data="'+ props.catid +'">'
                        + ((parseInt(props.scount)>0)?'<a title="Click to view the '+props.scount+' series in this category" onclick="publicCat(\''+props.name+'\','+props.catid+')">':'') + props.name +' (' + props.scount + ')'+ ((parseInt(props.scount)>0)?'</a>':'')
                        + ((props.children>0)?' <span class="ui-icon browse-right" onclick="showChildCats(this)">show child categories</span>':'')
                        + '</span>');
            }

        }
    })
}
function showChildCats(spn){
    var catid, newTds, props, $currentTd, nextCatId;
    catid = $(spn).closest("span.sibling, span.chain").attr("data");

    callApi({command: "GetCatChildren", catid: catid}, function(jsoData, textStatus, jqXH){
        $currentTd = $('<td class="sibling expanded"  parentid="'+catid+'"></td>');
        $("table#cat-chains tr").append($currentTd);
        for(var i=0;i<jsoData.children.length;i++){
            props = jsoData.children[i];
            $currentTd.append('<span class="sibling" data="'+ props.catid +'" parentid="'+ catid +'">'
                    + ((parseInt(props.scount)>0)?'<a title="Click to view the '+props.scount+' series in this category" onclick="publicCat(\''+props.name+'\','+props.catid+')">':'') + props.name +' (' + props.scount + ')'+ ((parseInt(props.scount)>0)?'</a>':'')
                    + ((props.children>0)?'<span class="ui-icon browse-right" onclick="showChildCats(this)">show child categories</span>':'')
                    + '</span><br />').addClass("expanded");
        }
    });
    //rebuild the table root while fetching occurring, starting with clicked span working up
    nextCatId = $(spn).closest("td").attr('parentid');
    $catSpan =  $(spn).closest('span.sibling, span.chain');
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
    if(md_userId != null) return md_userId;
    if(fb_user != null){
        var params = {
            'command':	'GetUserId',
            'accounttype': 'Facebook',
            'username': fb_user.id,
            'name':  fb_user.name,
            'email':	fb_user.email,
            'company':	'',
            'accesstoken': accessToken
        };
        $.ajax({type: 'POST',  //cannot use CallAPI -> infinite loop
            url: "api.php",
            data: params,
            dataType: 'json',
            success: function(md_getUserId_results, textStatus, jqXH){
                if(md_getUserId_results.status=='ok'){
                    md_userId = md_getUserId_results.userid;  //no further action required (assumes success)
                    orgId = md_getUserId_results.orgid;
                    orgName = md_getUserId_results.orgname;
                    if(orgId&&orgName){$("#series_search_source").append('<option value="org">'+orgName+'</option>')};
                    $("#menu-account .ui-button-text").html(fb_user.name);
                    //$("#mn_facebook").html("sign out");
                    syncMyAccount();
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
// 1. update any local series to cloud that have not already been captured
    //This now happens in loadmySeriesByKey
// 2. take credit for any anonymous captures and claim as MySeries
    var cids = [];
    var ids = [];
    var sids = [];
    for(var id in oMySeries){
        if(typeof id != "undefined"){
            if(typeof oMySeries[id].lid != "undefined"){ //if it is still in localStorage and has a CID...
                if(oMySeries[id].cid){
                    cids.push(oMySeries[id].cid);
                    ids.push(id);
                    sids.push(oMySeries[id].sid);
                }
            }
        }
    }
    var ssid = ',' + sids.valueOf() + ',';
    if(cids.length>0){
        apiCall({'command': 'MyCaptures',
                    'modal': 'persist',
                    'jsts': new Date().getTime(),
                    'uselatest': 'Y', //'Y'|'N' TODO: this should be driven by user preferences / user selection
                    'cids': cids,
                    'ids': ids
                },
                function(results, textStatus, jqXH){
// 3. clear series from localStorage and delete lid properties from oMySeries objects
                    if(results.status=='ok'){
                        for(var i in ids){
                            removeIdFromStorageList(oMySeries[ids[i]].lid, 'localSeries');
                            window.localStorage.removeItem('meta'+oMySeries[ids[i]].lid);
                            window.localStorage.removeItem('data'+oMySeries[ids[i]].lid);
                            delete oMySeries[ids[i]].lid;
                            //console.log("localSeries and all LS should be empty.  window.localStorage.getItem('localSeries')= " + window.localStorage.getItem('localSeries'));
                        }
                    }
                    // 4. clear oMySeries and the DataTable    *** not needed since everything is now SID based
                    //dtMySeries.fnClearTable();
                    //oMySeries = {};
// 6. download my account objects
//  A. My Series
                    getMySeries(ssid);
                }
        );
    } else {
        getMySeries("");  //modal is persisted
    }

//  B. My Graphs
    callApi({'command':	'GetMyGraphs'},  //modal is closed
            function(results, textStatus, jqXH){
                for(var key in results.graphs){
                    oMyGraphs[key]=results.graphs[key];
                    if(oMyGraphs[key].annotations){
                        oMyGraphs[key].annotations=jQuery.parseJSON(results.graphs[key].annotations);
                    } else {
                        oMyGraphs[key].annotations=[];
                    }
                    for(var plot in oMyGraphs[key].plots){
                        oMyGraphs[key].plots[plot].options = jQuery.parseJSON(oMyGraphs[key].plots[plot].options)
                        for(var comp in oMyGraphs[key].plots[plot].components){
                            oMyGraphs[key].plots[plot].components[comp].options = jQuery.parseJSON(oMyGraphs[key].plots[plot].components[comp].options);
                        }
                    }
                    for(var plot in oMyGraphs[key].pointsets){
                        oMyGraphs[key].pointsets[plot].options = jQuery.parseJSON(oMyGraphs[key].pointsets[plot].options)
                        for(var comp in oMyGraphs[key].pointsets[plot].components){
                            oMyGraphs[key].pointsets[plot].components[comp].options = jQuery.parseJSON(oMyGraphs[key].pointsets[plot].components[comp].options);
                        }
                    }
                    oMyGraphs[key].mapconfig = jQuery.parseJSON(oMyGraphs[key].mapconfig)

                    if(oMyGraphs[key].mapsets){
                        oMyGraphs[key].mapsets.options = jQuery.parseJSON(oMyGraphs[key].mapsets.options)
                        for(var comp in oMyGraphs[key].mapsets.components){
                            oMyGraphs[key].mapsets.components[comp].options = jQuery.parseJSON(oMyGraphs[key].mapsets.components[comp].options);
                        }
                    }


                    dtMyGraphs.fnAddData(oMyGraphs[key]);
                }
            }
    );
}
function loadSources(){
    callApi({command: "GetApis", modal: "none"},
            function(jsoData, textStatus, jqXH){
                apis = jsoData.sources;
                var options = '';
                for(var i=0;i<apis.length;i++) options+='<option value="'+apis[i]['apiid']+'">'+apis[i]['name']+'</option>';
                $("select#series_search_source").append(options);
            });
}

function getMySeries(existingSids){
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
    callApi(params,
            function(jsoData, textStatus, jqXH){
                //first find to whether this is a new row or an update
                oGraph.gid = jsoData.gid; //has db id and should be in MyGraphs table...
                oGraph.ghash = jsoData.ghash;
                oGraph.isDirty = false;
                var objForDataTable = $.extend(true,{from: "", to: ""}, oGraph);
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
    if(!isNaN(oMD.sid)||!isNaN(oMD.usid)||!oMD.handle){
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
        console.log("Error loading series object: invalid series id.")
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
            oGraph.plots.push({components: [{handle: handle, options: {k: 1.0, op: '+'}, options: {}}]});
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
            for(var i=0;i<jsoData.seriesData.length;i++){
                //Local series will always have data.  Eventually, add support for 'U' series
                if(jsoData.seriesData[i].cid==jsoData.seriesData[i].lastestcid){
                    //graph may not being using the latest, but mySeries always will
                    oMySeries['S'+jsoData.seriesData[i].sid].data = jsoData.seriesData[i].data;
                }
                oGraph.assets['S'+jsoData.seriesData[i].sid].data = jsoData.seriesData[i].data;
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
        if(loggedIn){
            obj.save = null;
            updateMySeries(obj);  //delete from DB
        }
        if(obj.lid) { //delete from localStorage
            removeIdFromStorageList(obj.lid, 'localSeries');
            window.localStorage.removeItem('meta' + obj.lid);
            window.localStorage.removeItem('data' + obj.lid);
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
    //in revised layout, show only if graph tabs and seardh tables are show  $("#show-hide-pickers").show();
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
    $(panelToActivate).show();
    return false;
}

function plotLinearRegressions(chart){  //COPIED DIRECTLY FROM md_hcharter.js.  NEEDS ADAPTING
    var i, hadLinearRegressions = false;
    for(i=chart.series.length-1;i>=0;i--){
        //wouldn't accept new property: chart.series[i].regression
        //console.log(chart.series[i].dashStyle);
        if(chart.series[i].name.indexOf("Linear regression of") != '-1'){
            //console.log('trying to remove ' + chart.series[i].name);
            chart.series[i].remove(false);
            hadLinearRegressions = true;
        }
    }
    if(!hadLinearRegressions){
        for(i=chart.series.length-1;i>=0;i--){
            if(chart.series[i].name.indexOf("Linear regression of") == '-1'){
                var newSeries = addLinearRegression(chart, chart.series[i])
            }
        }
    }
    chart.redraw()
}

function addLinearRegression(hChart, series){ //COPIED DIRECTLY FROM md_hcharter.js.  NEEDS ADAPTING
    var sumX = 0, minX = null, maxX = null;
    var sumY = 0, minY = null, maxY = null;
    var j, points = 0;
    //console.log(series);
    for(j=0;j<series.data.length;j++){
        if(series.data[j].x != null && series.data[j].y != null){
            sumX +=  series.data[j].x;
            sumY +=  series.data[j].y;
            if(minX == null){minX=series.data[j].x;}
            if(maxX == null){maxX=series.data[j].x;}
            if(minY == null){minY=series.data[j].y;}
            if(maxY == null){maxY=series.data[j].y;}
            if(minX>series.data[j].x){minX=series.data[j].x;}
            if(maxX<series.data[j].x){maxX=series.data[j].x;}
            if(minY>series.data[j].y){minY=series.data[j].y;}
            if(maxY<series.data[j].y){maxY=series.data[j].y;}
            points++;
        }
    }
    var avgX = sumX / points;
    var avgY = sumY / points;
    //console.log("avg y: " + avgY);
    var num = 0;
    var den = 0;
    for(j=0;j<series.data.length;j++){
        if(series.data[j].x != null && series.data[j].y != null){
            num += (series.data[j].x - avgX) * (series.data[j].y - avgY);
            den += (series.data[j].x - avgX)*(series.data[j].x - avgX);
        }
    }
    var b1 = num / den;  //sum((x_i-x_avg)*(y_i-y_avg)) / sum((x_i-x_avg)^2)
    //console.log(b1 + "=" + num + "/" + den);
    var b0 = avgY - b1 * avgX;

    var newSeries = {
        name:  "Linear regression of " + series.name,
        dashStyle: 'shortdot',
        color: series.color,
        data: [],
        regression: true
    };
    for(j=0;j<series.data.length;j++){
        if(series.data[j].x != null && series.data[j].y != null){
            newSeries.data.push([series.data[j].x , (b1*series.data[j].x  + b0)]);  //y = b1*x + b0
        }
    }
    //newSeries.data.push([minX, (b1*minX + b0)]);  //y = b1*x + b0
    return(hChart.addSeries(newSeries,false));
}

function loginout(){ //
    if(loggedIn){
        FB.logout(function(response) {
            localStorage.removeItem('token');  //remove the FB token
            window.location.reload();  // user is now logged out; reload will reset everything
            /*loggedIn = false;  //global variable
             fb_user = null;
             md_userId = null;
             $("#mn_facebook").html("Facebook");
             $("#login-display").html("sign in");*/
        });
    } else {
        FB.login(function(response) {
            if (response.authResponse) {
                loggedIn = "facebook";  //global variable
                accessToken =  response.authResponse.accessToken;
                localStorage.setItem('token', accessToken); //used for uploading when Workbench is not open but user is authorized and has logged in
                expiresIn = response.authResponse.expiresIn;
                FB.api('/me', function(response) {
                    fb_user = response;  //global variable
                    getUserId(); //trigger an account sync on first call
                });
            }
        });
    }
}
function notLoggedInWarningDisplayed(){
    if(!loggedIn){
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
    return  (!loggedIn);
}
function callApi(params, callBack){ //modal waiting screen is shown by default. params.modal option can modify this behavior
    if(params.modal!='none')mask();
    $.ajax({type: 'POST',
        url: "api.php",
        data:$.extend({uid: getUserId(),accessToken: accessToken}, params),
        dataType: 'json',
        success: function(jsoData, textStatus, jqXHR){
            if(jsoData.status=="ok"){
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
function mask(){
    $("#wrapper").mask("Loading...");
}

</script>

<body onresize="resizeCanvas();">
<div id="fb-root"></div>
<div id="wrapper" class="wrapper">
    <div id="title-bar" class="title-bar" style="background-color:#000;border:0px;">
        <a href="/" target="_blank"><img height="32px" style="margin:0 10px 0 20px;" src="/global/images/logo/md_logo_sm.png"></a>
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
        <!--account and help menu-->
        <button id="menu-help" class="prov-float-btn">Help</button>
        <button id="menu-account" class="prov-float-btn">Sign in</button>
    </div>
    <div id="picker-divs" class="show-hide"><!-- BEGIN PICKER DATATABLES -->
        <!--BEGIN LOCAL SERIES-->
        <div id="local-series" class="picker">
            <div id="edit-user-series" style="display:none; border: 1px solid black;position: absolute;z-index: 5;background-color: #FFFFFF;width:100%;">
                <div id="editor-chart" class="editor-chart" style="float:right;width:45%;">chart here</div>
                <div id="data-editor" class="hands-on-table dataTable" style="width:50%;overflow:scroll;"></div>
                <button class="series-edit-save" onclick="saveSeriesEditor(false)">save</button> <button class="series-edit-save-as" onclick="saveSeriesEditor(true)">save as copy</button> <button onclick="closeSeriesEditor()">cancel</button>
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
                    <fieldset style="display:inline;margin-left: 5px; padding: 0px 5px;margin: 1px;">
                        <legend style="color: #444;font-size: 12px;">Search MashableData server for series</legend>
                        <input maxlength="100" style="width:300px;" id="series_search_text" onkeyup="seriesCloudSearchKey(event)" />
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
                    Search terms: <input maxlength="200" width="200px" id="graphs_search_text" onkeyup="graphsCloudSearch(event)" /> <button id="graphsSearchBtn" onclick="graphsCloudSearch(event)">search</button>
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
        <div id="highcharts-div" style="width:90%;height:60%;position:static;"></div>
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
            <button onclick="quickViewClose()">Close</button>
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