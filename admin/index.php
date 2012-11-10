<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>MashableData Admin Dashboard</title>



    <link  rel="stylesheet" href="css/smoothness/jquery-ui-1.8.16.custom.css" />
    <link  rel="stylesheet" href="/global/datatables/jquery.dataTables.css" />
<!--    <link  rel="stylesheet" href="css/ColVis.css" />
    <link  rel="stylesheet" href="md_workbench.css" />-->
    <script type="text/javascript" src="/global/jquery/jquery-1.7.min.js"></script>
    <script type="text/javascript" src="/global/jquery-ui-1.8.16.custom.min.js"></script>
    <script type="text/javascript" src="/global/datatables/jquery.dataTables.min.js"></script>
<!--    <script type="text/javascript" src="js/ColVis.min.js"></script>
    <script type="text/javascript" src="js/ColReorder.min.js"></script>
    <script type="text/javascript" src="js/ColReorderWithResize.js"></script>
    <script type="text/javascript" src="js/highcharts-2.2.1.js"></script>
    <script type="text/javascript" src="js/exporting.src.js"></script-->
    <script type="text/javascript" src="/global/fancybox/jquery.fancybox-1.3.4.pack.js"></script>
    <link rel="stylesheet" href="/global/fancybox/jquery.fancybox-1.3.4.css" type="text/css">
</head>

<body>
<script type="text/javascript">
$(document).ready(function(){
    loadApiTable();
    addStringify();
});

var userid = 2;         //TODO: get actual userid via facebook
var accessToken = '';
var apiRuns = {};  //tracks/cancel batches in progress with run objects keyed under apiRuns.api_#

function loadApiTable(){
    var apis = adminData({command: "GetApis"},
        function(results){
            oApis = results;
            dtApis = $("#dt-apis").dataTable({
                "aoColumns": [
                    {"mDataProp": "apiid", "sTitle": 'id', sClass: "apiid"},
                    {"mDataProp": "name", "sTitle": 'name'},
                    {"mDataProp": null, "sTitle": 'domain', fnRender: function(obj){return obj.aData.l2domain + '.' + obj.aData.l1domain}},
                    {"mDataProp": null, "sTitle": 'last run', fnRender: function(obj){return obj.aData.finishdt+ ' (' + obj.aData.command + '[' + obj.aData.periodicity + "] => added:" +  obj.aData.added+ "; updated:" +  obj.aData.updated+ "; failed:" +  obj.aData.failed + ")"}},
                    {"mDataProp": null, "sTitle": 'Update', fnRender: function(obj){return '<input class="api-since" value="<?=date("Y-m-d") ?>"> <select class="api-period"><option>all</option><option>Y</option><option>M</option><option>W</option><option>D</option></select><button class="api-update" onclick="runApiUpdate(this)">Start Batch Update</button>'}},
                    {"mDataProp": null, "sTitle": 'Get', fnRender: function(obj){return 'Source Keys:  <input class="api-skeys"><button class="api-get" onclick="runApiGet(this)">Get</button>'}},
                    {"mDataProp": null, "sTitle": 'Full Crawl', fnRender: function(obj){return '<button class="api-crawl" onclick="runApiCrawl(this)">Crawl</button>'}}
                ]
            });
            for(var i=0;i<results.apis.length;i++){
                dtApis.fnAddData(results.apis[i]);
            }
        }
    );
}
function runApiGet(btn) {
    var apiid = $(btn).closest("tr").find(".apiid").html();
    var skeys = $(btn).closest("td").find(".api-skeys").val();
    skeys = skeys.match(/\S.+\S/)[0]; //trim whitespace
    var ary_skeys = skeys.split(/(\s*,\s*|\s+)/g);
    callApi({command: "Get", apiid: parseInt(apiid), skeys: ary_skeys},
        function(results){
            $(btn).closest("td").find('input').removeAttr('value'); // clear input box after processing
        }
    );
}


function runApiUpdate(btn) {
    var apiid = $(btn).closest("tr").find(".apiid").html();
    if(btn.innerHTML == "Start Batch Update"){
        $(btn).closest("tr").find("button.api-crawl").attr("disabled","disabled");
        $(btn).html("Stop Batch Update");
        var periodicity = $(btn).closest("td").find(".api-period").val();
        var since = $(btn).closest("td").find(".api-since").val();
        apiRuns["api_"+apiid] = {
            command: "Update",
            btn: btn,
            apiid: apiid,
            periodicity: periodicity,
            since: since,
            runid:0,
            added: 0,
            failed: 0,
            updated: 0,
            started: new Date()
        };
        apiBatchManager(apiid); //kick off the crawl!
    } else {
        restoreApiButtons(apiRuns["api_"+apiid]);
    }
}

function runApiCrawl(btn){
    var apiid = $(btn).closest("tr").find(".apiid").html();
    if(btn.innerHTML == "Crawl"){
        $(btn).closest("tr").find("button.api-update").attr("disabled","disabled");
        $(btn).html("Stop crawl");
        apiRuns["api_"+apiid] = {
            command: "Crawl",
            btn: btn,
            apiid: apiid,
            runid:0,
            added: 0,
            failed: 0,
            updated: 0,
            started: new Date(),
            crawled: {},
            stack: [{catid: '0',name: ''}]
        };
        apiBatchManager(apiid); //kick off the crawl!
    } else {
        restoreApiButtons(apiRuns["api_"+apiid]);
    }
}

function restoreApiButtons(run){
    $(run.btn).closest("tr").find("button").removeAttr("disabled").end().find("button.api-crawl").html("Crawl").end().find("button.api-update").html("Start Batch Update")
    delete apiRuns["api_"+run.apiid];
}

function apiBatchManager(apiid){
    if(apiRuns["api_"+apiid]){  //object will be deleted on user cancel
        if(apiRuns["api_"+apiid].timer){
            clearTimeout(apiRuns["api_"+apiid].timer);
        }
        switch(apiRuns["api_"+apiid].command){
            case "Update":
                callApi({command: apiRuns["api_"+apiid].command, apiid: parseInt(apiid), runid: apiRuns["api_"+apiid].runid, since: apiRuns["api_"+apiid].since, periodicity: apiRuns["api_"+apiid].periodicity},
                    function(results){
                        if(apiRuns["api_"+apiid]){  //make sure user has not canceled the Batch Job
                            clearTimeout(apiRuns["api_"+apiid].timer);
                            apiRuns["api_"+apiid].runid = results.runid;
                            apiRuns["api_"+apiid].added  = results.runid;
                            apiRuns["api_"+apiid].failed  = results.failed;
                            apiRuns["api_"+apiid].updated  = results.updated;
                            if(results.count>0){
                                apiBatchManager(apiid);
                            } else {  //the batch is finished when no more update found
                                restoreApiButtons(apiRuns["api_"+apiid]);
                                delete apiRuns["api_"+apiid];
                            }
                        }
                    }
                );
                break;
            case "Crawl":
                if(apiRuns["api_"+apiid].stack.length!=0){
                    var nextRun =  apiRuns["api_"+apiid].stack.pop();
                    callApi({
                            command: apiRuns["api_"+apiid].command,
                            apiid: parseInt(apiid),
                            runid: apiRuns["api_"+apiid].runid,
                            name: nextRun.name,
                            catid: parseInt(nextRun.catid)
                        },
                        function(results){
                            if(apiRuns["api_"+apiid]){  //make sure user has not canceled the Batch Job
                                clearTimeout(apiRuns["api_"+apiid].timer);
                                apiRuns["api_"+apiid].crawled[results.catid]=true;
                                for(var i=0;i<results.children.length;i++){
                                    var newRun  = {
                                        catid: parseInt(results.children[i].catid),
                                        name:  results.children[i].name
                                    };
                                    apiRuns["api_"+apiid].stack.push(newRun)
                                }
                                apiRuns["api_"+apiid].runid = results.runid;
                                apiRuns["api_"+apiid].added  = results.runid;
                                apiRuns["api_"+apiid].failed  = results.failed;
                                apiRuns["api_"+apiid].updated  = results.updated;
                                if(apiRuns["api_"+apiid].stack.length>0){
                                    apiBatchManager(apiid);
                                } else {  //the batch is finished when no more update found
                                    restoreApiButtons(apiRuns["api_"+apiid]);
                                    delete apiRuns["api_"+apiid];
                                }
                            }
                        }
                    );
                }
                break;
        }

        apiRuns["api_"+apiid].timer =  setTimeout(function(){apiBatchManager(apiid)}, 180000);   //try again in 3 minutes
    }
}

function adminData(params, callback){
    $.ajax({type: 'POST',
        url: "admindata.php",
        data: $.extend({uid: userid,'accessToken': accessToken},params),
        dataType: 'json',
        success: function(results, textStatus, jqXH){
            if(results.status=='ok'){
                callback(results);
            } else debug(results);
        },
        error: function(results, textStatus, jqXH){
            debug(results);
        }
    });
}

function callApi(params, callback){
/*generic caller to API with automatic status output before callback function invoke*/
    var extendedParams = $.extend({uid: userid,accessToken: accessToken},params);
    $.ajax({type: 'POST',
        url: "crawlers/index.php",
        data: extendedParams,
        dataType: 'json',
        success: function(results, textStatus, jqXH){
            //write results out to pane below API table
            var statusTable;
            for(key in results){
                statusTable += '<tr><td><b>' + key + '</b></td><td>' + $.stringify(results[key]).replace(/","/g,", ") + '</td></tr>';
            }
            $('#api-status').html('<table>' + statusTable + '</table>');
            if(results.status=='ok'){
                callback(results);
            } else debug(results);
        },
        error: function(results, textStatus, jqXH){
            debug(results);
        }
    });
}



function addStringify(){
    jQuery.extend({
        stringify  : function stringify(obj) {

            if ("JSON" in window) {
                return JSON.stringify(obj);
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
function debug(obj){
    if(navigator.userAgent.toLowerCase().indexOf('chrome') > -1) console.info(obj);
}

</script>


<div class="captures"><fieldset><legend>Captures</legend><table width="200" border="1">
  <tr>
    <th scope="col">CID</th>
    <th scope="col">series name</th>
      <th scope="col">domain</th>
    <th scope="col">UID</th>
    <th scope="col">new/updated</th>
    <th scope="col">date time</th>
  </tr>
  <tr>
    <td><a href="#">to CID chain</a></td>
    <td><a href="#">to source</a></td>
    <td><a href="#">user detail</a></td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
  </tr>
</table>
</fieldset></div>
<div class="captures"><fieldset>
<legend>alerts</legend>
<table width="200" border="1">
  <tr>
    <th scope="col">UID</th>
    <th scope="col">series name</th>
    <th scope="col">CID</th>
    <th scope="col">k (new+changed)/total</th>
    <th scope="col">date</th>
    <th scope="col">resolution</th>
  </tr>
  <tr>
    <td><p><a href="#">user detail</a></p>      </td>
    <td><a href="#">to source</a></td>
    <td><a href="#">to CID chain</a></td>
    <td>5% (1+0)/20</td>
    <td>alert date</td>
    <td><label>
      <textarea name="textfield" id="textfield">type notes here</textarea>
      ignore/revert/revert and block user</label></td>
  </tr>
  <tr>
    <td><a href="#">user detail</a></td>
    <td><a href="#">to source</a></td>
    <td><a href="#">to CID chain</a></td>
    <td>revert</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
  </tr>
  <tr>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
  </tr>
  <tr>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
  </tr>
  <tr>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
  </tr>
  <tr>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
  </tr>
</table>
</fieldset></div>
<div class="captures"><fieldset>
<legend>Duplicates</legend>
<table width="200" border="1">
  <tr>
    <th scope="col">ghash</th>
    <th scope="col">series name</th>
    <th scope="col">UID</th>
    <th scope="col">domain</th>
    <th scope="col">date</th>
    <th scope="col">?</th>
  </tr>
  <tr>
    <td>82349a799b999ab99975b68f</td>
    <td><a href="#">to source</a></td>
    <td><a href="#">to source</a></td>
    <td>syn/block</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
  </tr>
  <tr>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
  </tr>
  <tr>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
  </tr>
  <tr>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
  </tr>
  <tr>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
  </tr>
  <tr>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
  </tr>
</table>
</fieldset></div>


<div class="apis">
    <fieldset><legend>API</legend>
        <div><table width="100%" id="dt-apis"></table></div>
        <fieldset><legend>API Stats</legend>
            <div id="api-status" width="600px">No API runs are currently executing in this admin panel</div>
        </fieldset>
    </fieldset>

</div>

</body>
</html>
