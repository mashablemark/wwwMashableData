<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:fb="http://ogp.me/ns/fb#">
<head>
    <link rel="shortcut icon" href="/favicon.ico" />
    <meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1" />
    <title>MashableData Workbench</title>
    <!--link rel="stylesheet" href="/global/styles/prettify.css" type="text/css" /-->
    <!--link rel="stylesheet" href="/global/styles/screen.css" type="text/css" /-->
    <!--link rel="stylesheet" href="/global/styles/global.css" type="text/css" /-->
    <link  rel="stylesheet" href="css/smoothness/jquery-ui-1.8.16.custom.css" />
    <link  rel="stylesheet" href="md_workbench.css" />
    <script type="text/javascript" src="graph.js"></script>
    <script type="text/javascript" src="js/jquery.min.js"></script>
    <script type="text/javascript" src="js/jquery-ui-1.8.16.custom.min.js"></script>
    <script type="text/javascript" src="js/highcharts.js"></script>
    <script type="text/javascript" src="js/exporting.src.js"></script>
    <script type="text/javascript" src="js/fancybox/jquery.fancybox-1.3.4.pack.js"></script>
    <link rel="stylesheet" href="js/fancybox/jquery.fancybox-1.3.4.css" type="text/css">
    <!--script type="text/javascript" src="workbench.js"></script-->

</head>
<script language="javascript" type="text/javascript">
//ERASE AFTER TESTING
var hexcase=0;var b64pad="";function hex_sha1(a){return rstr2hex(rstr_sha1(str2rstr_utf8(a)))}function hex_hmac_sha1(a,b){return rstr2hex(rstr_hmac_sha1(str2rstr_utf8(a),str2rstr_utf8(b)))}function sha1_vm_test(){return hex_sha1("abc").toLowerCase()=="a9993e364706816aba3e25717850c26c9cd0d89d"}function rstr_sha1(a){return binb2rstr(binb_sha1(rstr2binb(a),a.length*8))}function rstr_hmac_sha1(c,f){var e=rstr2binb(c);if(e.length>16){e=binb_sha1(e,c.length*8)}var a=Array(16),d=Array(16);for(var b=0;b<16;b++){a[b]=e[b]^909522486;d[b]=e[b]^1549556828}var g=binb_sha1(a.concat(rstr2binb(f)),512+f.length*8);return binb2rstr(binb_sha1(d.concat(g),512+160))}function rstr2hex(c){try{hexcase}catch(g){hexcase=0}var f=hexcase?"0123456789ABCDEF":"0123456789abcdef";var b="";var a;for(var d=0;d<c.length;d++){a=c.charCodeAt(d);b+=f.charAt((a>>>4)&15)+f.charAt(a&15)}return b}function str2rstr_utf8(c){var b="";var d=-1;var a,e;while(++d<c.length){a=c.charCodeAt(d);e=d+1<c.length?c.charCodeAt(d+1):0;if(55296<=a&&a<=56319&&56320<=e&&e<=57343){a=65536+((a&1023)<<10)+(e&1023);d++}if(a<=127){b+=String.fromCharCode(a)}else{if(a<=2047){b+=String.fromCharCode(192|((a>>>6)&31),128|(a&63))}else{if(a<=65535){b+=String.fromCharCode(224|((a>>>12)&15),128|((a>>>6)&63),128|(a&63))}else{if(a<=2097151){b+=String.fromCharCode(240|((a>>>18)&7),128|((a>>>12)&63),128|((a>>>6)&63),128|(a&63))}}}}}return b}function rstr2binb(b){var a=Array(b.length>>2);for(var c=0;c<a.length;c++){a[c]=0}for(var c=0;c<b.length*8;c+=8){a[c>>5]|=(b.charCodeAt(c/8)&255)<<(24-c%32)}return a}function binb2rstr(b){var a="";for(var c=0;c<b.length*32;c+=8){a+=String.fromCharCode((b[c>>5]>>>(24-c%32))&255)}return a}function binb_sha1(v,o){v[o>>5]|=128<<(24-o%32);v[((o+64>>9)<<4)+15]=o;var y=Array(80);var u=1732584193;var s=-271733879;var r=-1732584194;var q=271733878;var p=-1009589776;for(var l=0;l<v.length;l+=16){var n=u;var m=s;var k=r;var h=q;var f=p;for(var g=0;g<80;g++){if(g<16){y[g]=v[l+g]}else{y[g]=bit_rol(y[g-3]^y[g-8]^y[g-14]^y[g-16],1)}var z=safe_add(safe_add(bit_rol(u,5),sha1_ft(g,s,r,q)),safe_add(safe_add(p,y[g]),sha1_kt(g)));p=q;q=r;r=bit_rol(s,30);s=u;u=z}u=safe_add(u,n);s=safe_add(s,m);r=safe_add(r,k);q=safe_add(q,h);p=safe_add(p,f)}return Array(u,s,r,q,p)}function sha1_ft(e,a,g,f){if(e<20){return(a&g)|((~a)&f)}if(e<40){return a^g^f}if(e<60){return(a&g)|(a&f)|(g&f)}return a^g^f}function sha1_kt(a){return(a<20)?1518500249:(a<40)?1859775393:(a<60)?-1894007588:-899497514}function safe_add(a,d){var c=(a&65535)+(d&65535);var b=(a>>16)+(d>>16)+(c>>16);return(b<<16)|(c&65535)}function bit_rol(a,b){return(a<<b)|(a>>>(32-b))};

//GLOBAL VARIABLES

var layoutDimensions= {
    heights: {
        graphTabsMinGap: 30,
        graphTabsGap: null,
        tableControls: 42,
        innerDataTable: null,
        scrollHeads: 0,
        windowMinimum: 580,
        FaceBookPanel: 85
    },
    widths: {
        windowMinimum: 750
    }
};

var periodValue = {
    N: 1,
    D: 2,
    W: 3,
    M: 4,
    Q: 5,
    SA: 6,
    Y: 7
};
var standardAnnotations = [];
var dtMySeries = null;
var oMySeries = {};
var anOpenRowsMySeries = [];
var dtPublicSeries = null;
var oPublicSeries = {};
var anOpenRowsPublicSeries = [];
var dtMyGraphs = null;
var oMyGraphs = {};
var oPanelGraphs = {}; //MyGraph objects by panelID allows easy access to oMyCharts
var oHighCharts = {}; //highchart objects by panelID
var anOpenRowsMyGraphs = [];
var dtPublicGraphs = null;
var oPublicGraphs = {};
var anOpenRowsPublicGraphs = [];

//may want to add FB like and such to viewer
var fb_user = null;
var fbAppId = '209270205811334';
var md_userId = null;
var accessToken = null;
var expiresIn = null;

//view.php global vars
var ghash = null;
//INITIALIZATION ROUTINES
$(document).ready(function(){
    //if SDK does not handle everything behind the scenes, initFacebook() here to enable liking and comments
    var js, id = 'facebook-jssdk'; if (document.getElementById(id)) {return;}
    js = document.createElement('script'); js.id = id; js.async = true;
    js.src = "//connect.facebook.net/en_US/all.js";
    document.getElementsByTagName('head')[0].appendChild(js);

    resizeCanvas();
    $(window).bind("resize load", resizeCanvas());
    Highcharts.setOptions({  //replace with MashableData Highcharts theme
        tooltip: {
            formatter: function(){  //shorten the data accord to period; add commas to number; show units
                var tooltip = formatDateByPeriod(this.point.x, this.series.options.period) + '<br>'
                    + this.series.name + ':<br>'
                    + Highcharts.numberFormat(this.y,'','.',',') + ' ' + this.series.yAxis.options.title.text;
                return tooltip;
            }
        }
    });
    createInitialGraph();
});

window.fbAsyncInit = function() { //called by facebook auth library after it loads (loaded asynchronously from doc.ready)
    FB.init({
        appId      : fbAppId, // App ID
        channelURL : '//www.mashabledata.com/fb_channel.php', // Channel File
        status     : true, // check login status
        cookie     : true, // enable cookies to allow the server to access the session
        oauth      : true, // enable OAuth 2.0
        xfbml      : true  // parse XFBML
    });
};

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
        ]
    );
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


function resizeCanvas(){
    var winHeight = window.innerHeight-10;
    if(winHeight<layoutDimensions.widths.windowMinimum)winHeight=layoutDimensions.widths.windowMinimum;
    var winWidth = window.innerWidth-10;
    if(winWidth<layoutDimensions.widths.windowMinimum)winWidth=layoutDimensions.widths.windowMinimum;
    $("div#wrapper").height(winHeight).width(winWidth);
    layoutDimensions.heights.canvas = winHeight - $("div#title-bar").height() - layoutDimensions.heights.FaceBookPanel;
    $("div#canvas").height(layoutDimensions.heights.canvas);
    $("div.ui-tabs-panel").height(layoutDimensions.heights.canvas);
    $("div#fb").height(layoutDimensions.heights.FaceBookPanel);
}

function createInitialGraph(){ //called onReady to read URL, get public graph object and series, call shared graphing routine, and perform any post processing
    //1. detect query string variable 'g'
    ghash = getParameterByName('g');
    if(ghash){
        callApi({
            'command':	'GetPublicGraph',
            'ghash': ghash,
            'accessToken': accessToken
        },
        function(results, textStatus, jqXHR){
            for(var key in results.graphs){
                oMyGraphs[key]=results.graphs[key];
                if(oMyGraphs[key].annotations){
                    oMyGraphs[key].annotations=jQuery.parseJSON(results.graphs[key].annotations);
                } else {
                    oMyGraphs[key].annotations=[];
                }
                for(var plot in oMyGraphs[key].plots){oMyGraphs[key].plots[plot].transform = jQuery.parseJSON(oMyGraphs[key].plots[plot].transform)}
                createMyGraph(oMyGraphs[key].gid,function(){
                    //postpocessing callback to remove editing feature added for the Workbench implementation
                    $('.graph-type, .crop-tool, .ui-icon-trash, .graph-publish, .graph-save-preview, .graph-save, .graph-post, .graph-close, .graph-delete').remove();
                    $('div.annotations select').closest('tr').remove();
                    $('div.annotations').height(layoutDimensions.heights.canvas-250).find('input').each(function(){
                        $(this).replaceWith($(this).val());
                    });
                    $('.graph-analysis').closest('div').html(oMyGraphs[key].analysis).css('margin','10px');
                });
            }
        }); //call to graph.js shared function
    } else {
        $('div#chart-panel').html("<h2>No valid graph found.  The graph author may have deleted or unpublished this presentation.</h2>")
    }
}

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\?&]" + name + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(window.location.search);
    if(results == null)
        return "";
    else
        return decodeURIComponent(results[1].replace(/\+/g, " "));
}

function addTab(dummy){ //this is a dummy routine called by the common graph library
    return 'chart-panel';  //for the viewer, always chart here
}
function hideGraphEditor(){} //another dummy function

function callApi(params, callBack){
    $.ajax({type: 'POST',
        url: "http://www.mashabledata.com/workbench/api.php",
        data:$.extend({uid: null, accessToken: accessToken}, params),
        dataType: 'json',
        success: function(jsoData, textStatus, jqXHR){
            if(jsoData.status=="ok"){
                callBack(jsoData, textStatus, jqXHR);
            } else {
                dialogShow("Command failed", jsoData.status);
            }
        },
        error: function(jqXHR, textStatus, errorThrown){
            dialogShow(textStatus, "A system error occurred while trying to connect to the server.  Check internet connectivity and try again later.");
            debug(textStatus);
            debug(jqXHR);}
    });
}

function destroyChartObject(key){
    if(oHighCharts[key]){
        oHighCharts[key].destroy();
        delete oHighCharts[key];
    }else {
        alert("Internal error in destroyChartObject");
    }
}


function debug(obj){
    if(navigator.userAgent.toLowerCase().indexOf('chrome') > -1) console.info(obj);
}

</script>

<body onresize="resizeCanvas();">
<div id="fb-root"></div>
<div id="wrapper" class="wrapper">
    <div id="title-bar" class="title-bar" style="background-color:#000;">
        <span style="font-size:20px;color:white;margin: 10px 13px 2px 13px;">Chart Viewer</span> <span style="font-size:8px;color:white;">powered by</span>  <a href="/" target="_blank"><img height="26px" src="/images/md_logo_sm.png"></a>
        <!--main menu-->
        <ul id="jsddm" class="menu" style="list-style-type: none;float:right;">
            <li><a href="./">Workbench</a></li>
        </ul>
    </div>
    <div id="canvas">
        <div id="chart-panel" class="ui-tabs-panel">alsdkfj</div>
    </div>
    <div id="fb">
        <fb:like send="true" width="450" show_faces="true" />
    </div>
</div>

<div id="dialog" style="display:none;">
    text
</div>
</body>
</html>