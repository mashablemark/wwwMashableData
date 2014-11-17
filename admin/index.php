<?php
    $event_logging = false;
    $sql_logging = false;
    include_once("../global/php/common_functions.php");
    date_default_timezone_set('UTC');
?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>MashableData Admin Dashboard</title>


    <!--Google API JavaScript files-->
    <script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js"></script>
    <script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jqueryui/1.9.2/jquery-ui.min.js"></script>

    <link  rel="stylesheet" href="/workbench/css/smoothness/jquery-ui-1.9.2.custom.css" />
    <link  rel="stylesheet" href="/global/css/datatables/jquery.dataTables.css" />
    <script type="text/javascript" src="/global/js/datatables/jquery.dataTables.1.9.4.min.js"></script>
    <script type="text/javascript" src="/global/js/fancybox/jquery.fancybox-1.3.4.pack.js"></script>
    <link rel="stylesheet" href="/workbench/css/fancybox/jquery.fancybox-1.3.4.css" type="text/css">


<style>
    table{
        width: 1800px;
        border: thin solid #000000;
    }
    thead{background-color: #00bfff}
    tr:nth-child(even) {background: #CCC}

</style>
</head>

<body>
<script type="text/javascript">
$(document).ready(function(){
    loadApiTable();
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
                    {"mDataProp": null, "sTitle": 'last run', fnRender: function(obj){return obj.aData.finishdt+ ' (' + obj.aData.command + '[' + obj.aData.freq + "] => added:" +  obj.aData.added+ "; updated:" +  obj.aData.updated+ "; failed:" +  obj.aData.failed + ")"}},
                    {"mDataProp": null, "sTitle": 'Update',
                        fnRender: function(obj){
                            return '<input class="api-since" value=""> <select class="api-period"><option>all</option><option>Y</option><option>M</option><option>W</option><option>D</option></select><button class="api-update" onclick="runApiUpdate(this)">Start Batch Update</button>'
                        }
                    },
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
        var freq = $(btn).closest("td").find(".api-period").val();
        var since = $(btn).closest("td").find(".api-since").val();
        apiRuns["api_"+apiid] = {
            command: "Update",
            btn: btn,
            apiid: apiid,
            freq: freq,
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
                callApi({command: apiRuns["api_"+apiid].command, apiid: parseInt(apiid), runid: apiRuns["api_"+apiid].runid, since: apiRuns["api_"+apiid].since, freq: apiRuns["api_"+apiid].freq},
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
            } else console.info(results);
        },
        error: function(results, textStatus, jqXH){
            console.info(results);
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
            } else console.info(results);
        },
        error: function(results, textStatus, jqXH){
            console.info(results);
        }
    });
}



</script>


<div class="err-js"><fieldset><legend>Recent JavaScript Errors</legend>
<?php
    $sql = "select eventid, eventdt as 'time stamp', data from eventlog where event = 'javaScript error' order by eventid desc limit 0,20";
    $result = runQuery($sql);
    $writeHeader = true;
    if($result->num_rows>0){
        print("<table border=\"1\">");
        while ($aRow = $result->fetch_assoc()) {
            if($writeHeader){
                print("<thead><tr>");
                foreach($aRow as $fld=>$val){
                    print("<th>".$fld."</th>");
                }
                print("</tr></thead>");

                $writeHeader = false;
            }
            foreach($aRow as $fld=>$val){
                /*if($fld=="data"){
                    $params = json_decode($val, true);  //php does not seem to be able to decode this...  Chrome can!
                    print("<td>");
                    var_dump($params);
                    foreach($params as $param=>$s){
                        print("<pre>".$param.": ".$s."</pre><br>");
                    }
                    print("</td>");
                } else */
                    print("<td>".$val."</td>");
            }
            print("</tr>");
        }
        print("</table>");
    } else {
        print("no records found");
    }
?>
</fieldset></div>
<div class="err-sql"><fieldset>
<legend>Recent SQL Errors</legend>
    <?php
    $sql = "select eventid, eventdt as 'time stamp', data from eventlog where event = 'bad query' order by eventid desc limit 0,20";
    $result = runQuery($sql);
    $writeHeader = true;
    if($result->num_rows>0){
        print("<table>");
        while ($aRow = $result->fetch_assoc()) {
            if($writeHeader){
                print("<thead><tr>");
                foreach($aRow as $fld=>$val){
                    print("<th>".$fld."</th>");
                }
                print("</tr></thead>");

                $writeHeader = false;
            }
            foreach($aRow as $fld=>$val){
                print("<td>".$val."</td>");
            }
            print("</tr>");
        }
        print("</table>");
    } else {
        print("no records found");
    }
    ?>
</fieldset></div>

<div class="captures"><fieldset>
<legend>Current users (today)</legend>


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
