<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>MashableData Secure LocalStorage Transfer Protocol</title>
</head>
<body>
 <div id="header">
    <h1><a href="/"><img src="/images/md_logo.png"  alt="MashableData"/></a></h1>
    <h4 style="color:#CCCCCC">Sharing data and visualizations across the web</h4>
  </div>
  This page securely performs a one-way transfer of data series to the localStorage assigned to www.mashabledata.com by HTML5 compliant browsers at your request to the MashableData chart plugin.  No data is transmitted by this page across the internet or stored externally to this computer by ths script.
<script language="javascript" type="text/javascript">
// Add ECMA262-5 Array methods if not supported natively
//  indexOf not native to IE8
if (!('indexOf' in Array.prototype)) {
    Array.prototype.indexOf= function(find, i /*opt*/) {
        if (i===undefined) i= 0;
        if (i<0) i+= this.length;
        if (i<0) i= 0;
        for (var n= this.length; i<n; i++)
            if (i in this && this[i]===find)
                return i;
        return -1;
    };
}

var maxLocalSeries = 100;

//create listener for...
if (window.addEventListener){  //standard compliant browsers (Chrome, FireFire, Safari...)
    window.addEventListener('message', receiveMessage, false);
} else if (window.attachEvent){  //Internet Explorer
     window.attachEvent('message', receiveMessage);
}


function receiveMessage(event) {
/* entry point for incoming series */
	//double check the authorized state
	if(window.localStorage.getItem("authorized") == 'no'){
        replyWithId(false)
    } else {
        //console.info("message recieved:  " + event.data);
        var serieJSON = event.data;
        var serie = JSON.parse(serieJSON);
        var page = serie.url.replace(/(http|https):\/\//i, '');
        var domain = page.substr(0, page.indexOf('/'));
        var storageKey = domain + '|' + (serie.key || serie.md_key);
        //get the seriesIndex from local storage and make an array (empty array if
        var seriesIndex = JSON.parse(localStorage.getItem('newSeries')||'[]');
        localStorage.setItem(storageKey, serieJSON);
        var currentIndex = seriesIndex.indexOf(storageKey);
        if(currentIndex==-1){
            if(seriesIndex.length>maxLocalSeries){
                window.localStorage.removeItem(seriesIndex.pop());
            }
            window.localStorage.setItem(storageKey,serieJSON);
        } else {
            seriesIndex.splice(currentIndex,1);
        }
        seriesIndex.unshift(storageKey);
        replyWithId(storageKey);  // notify calling window of success with the lId
        window.localStorage.setItem('newSeries', JSON.stringify(seriesIndex));
    }
    function replyWithId(reply){
        event.source.postMessage(reply, event.origin);
    }
}


</script>
<?php
	//phpinfo()
	print("<p>HTTP_REFERER:  " . $_SERVER["HTTP_REFERER"]) //the domain can be checked against registered domains for compliance/abusive
?>
<div id="footer">
<p>all rights reserved MashableData.com</p>
</div>
</html>
