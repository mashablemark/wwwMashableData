<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>MashableData Secure Transfer Protocol</title>
</head>
<body>
 <div id="header">
    <h1><a href="/"><img src="/images/md_logo.png"  alt="MashableData"/></a></h1>
    <h4 style="color:#CCCCCC">Sharing data and visualizations across the web</h4>
  </div>
  This page allow secure one way transfer of data series to the localStorage accorded to Mashable.Data.com by HTML5 compliant browsers.  No data is transmitted by this page across the internet or stored externally to this computer.
<!--div id="ls"></div-->
<script language="javascript" type="text/javascript">
var now = new Date();  //TODO: IMPORTANT:  replace clientside JavaScript with PHP constructed Date.UTC() function to dereive timestamp from from MD server
var maxLocalSeries = 100;
//check to see if the series is already a localSeries
//("running js on secure_xfer.php");
if(window.localStorage.getItem("authorized") != 'no'){
	if (window.addEventListener){  
		window.addEventListener('message', receiveMessage, false);   
	} else if (window.attachEvent){ 
		 window.attachEvent('message', receiveMessage);  
	}
}

//window.addEventListener("message", receiveMessage, false);  

function receiveMessage(event) {  
/* entry point for incoming series */ 
	//double check the authorized state
	if(window.window.localStorage.getItem("authorized") == 'no') 
		{return(false)}
  
	now = new Date();
	//console.info("message recieved:  " + event.data);
	var seriesData = event.data;
	var key = "localSeries";
	var lId = searchForSeries(seriesData, key);
	if(lId != null){
		updateSeries(seriesData,lId,key);
	} else {
/*NOTE:  SAVING ONLY POSSIBLE IN CLOUD WHEN LOGGED IN*/
		  lId = 'L' + fetchNextId();
		  addSeries(seriesData, lId,"localSeries");
		/*}*/
	}
	replyWithId(lId);  // notify calling window of success with the lId
  if(window.window.localStorage.getItem("authorized")){ //valid auth (not 'no')
	}
	//this is where the series pushed to the cloud get 
	return true;
}

function searchForSeries(seriesData, lsSeriesKey){  //lsSeriesKey either "localSeries" or "saved"
//returns lId if match (title, graph, url, period)
//TODO:  add "key" matching which should trump (title, graph, url, period) matching WITHIN A DOMAIN
	var seriesTitle = getMetaData("title", seriesData);
	var seriesGraph = getMetaData("graph", seriesData);
	var seriesUrl = getMetaData("url", seriesData); 
	var seriesPeriodicity = getMetaData("period", seriesData); 
	var lsSeries = window.localStorage.getItem(lsSeriesKey);
	if(lsSeries != null){
		if(lsSeries.length>0){
			var aryLsSeries = lsSeries.split("|");
			//console.info(lsSeriesKey + ':' + lsSeries + ':' + aryLsSeries.length);
			for(var i=0; i<aryLsSeries.length;i++){
				var lsSeriesMetaData = window.localStorage.getItem("meta" + aryLsSeries[i]);
				if(seriesTitle == getMetaData("title", lsSeriesMetaData) && seriesGraph == getMetaData("graph",lsSeriesMetaData) && seriesUrl == getMetaData("url",lsSeriesMetaData) && seriesPeriodicity == getMetaData("period", lsSeriesMetaData)){
					return aryLsSeries[i]; //series match when (series title, periodicity, graph title, URL) all match
				}
			}
		}
	}
	return(null) //no match found
}

function getMetaData(key, lsSeriesMetaData){
	//console.info(key);
	aryMetaData = lsSeriesMetaData.split("||");
	for(var i=0;i<aryMetaData.length;i++){
		if(aryMetaData[i].split("|")[0] == key){
		 return(aryMetaData[i].split("|")[1])
		}
	}
	return null;
}

function setMetaData(key, newValue, seriesMetaData){
	aryMetaData = seriesMetaData.split("||");
	for(var i=0;i<aryMetaData.length;i++){
		if(aryMetaData[i].split("|")[0] == key){
		 aryMetaData[i] = key + "|" + newValue;
		 return(aryMetaData.join("||"))
		}
	}
	return(seriesMetaData + "||" + key + "|" + newValue)
}

function fetchNextId(){
	var lId = window.localStorage.getItem("mdid");
	if(lId == null){
		lId = 1;
	} else {
		lId++;
	}
	window.localStorage.setItem("mdid", lId);
	return(lId);
}
 
function replyWithId(lId){
//IE HAS A PROBLEM WITH THE FOLLOWING LINE
	//window.postMessage(lId); 
}


function updateSeries(seriesData, lId, lsKey){
/*seriesData is complete md string
lId is the local ID of the existing object.  This function moves the lId to the top of the localSeries variable stack
and resaves/overwrites the meta and data strings.

Note: Sid & Cid are reset to null and cloud is not updated.  Workbench will update cloud.  AddSeries updates cloud first time this series is saved.   
TODO: add (1) validation of data format and (2) error catching for localStorage overflow */
	var keys = window.localStorage.getItem(lsKey);
	var aryKeys = keys.split("|");
	//console.info(aryKeys);
	for(var i=0;i<aryKeys.length;i++){
		if(aryKeys[i]==lId){
			aryKeys.splice(i,1);
			aryKeys.unshift(lId);
			keys = aryKeys.join("|");
			break;
		}
	}
	window.localStorage.setItem(lsKey, keys);
	var data = seriesData.substring(seriesData.indexOf("||datahash|") + 53); //53 is length of "||datahash|" + SHA-1 hash + "||"
	window.localStorage.setItem("data" + lId, data);
	var meta= seriesData.substring("metadata|begin||".length, seriesData.indexOf("||datahash|") + 51);
	meta=meta.replace('||lid|null|','||lid|' + lId + '|');
	window.localStorage.setItem("meta" + lId, meta);
}

function addSeries(seriesData, lId, lsKey){
// TODO: add (1) validation of data format and (2) error catching for localStorage overflow
    var newKeys;
	var keys = window.localStorage.getItem(lsKey);
	if(keys == null){
		 window.localStorage.setItem(lsKey, lId);
	} 
	else {
		keys = lId + "|" + keys;
		if(lsKey == "localSeries"){
			var aryKeys = keys.split("|");
			while(aryKeys.length > maxLocalSeries) { //max number of autosaved series is 100.  drop last if exceeded
				var deleteId = aryKeys.pop();
				window.localStorage.removeItem("meta" + deleteId);
				window.localStorage.removeItem("data" + deleteId);
				newKeys = window.localStorage.getItem('newSeries');
				if(newKeys != null){
					newKeys = ('|' + newKeys + '|').replace('|' + deleteId + '|', '|');
					newKeys = newKeys.substring(1,newKeys.length-1);
					window.localStorage.setItem('newSeries', newKeys);
				}
			}
			keys = aryKeys.join('|');
		}
		window.localStorage.setItem(lsKey, keys);
	}
	data = seriesData.substring(seriesData.indexOf("||datahash|") + 53); //52="|datahash|d0be2dc421be4fcd0172e5afceea3970e2f3d940||".length
	window.localStorage.setItem("data" + lId, data);
	meta= seriesData.substring("metadata|begin||".length, seriesData.indexOf("||datahash|") + 51);
	window.localStorage.setItem("meta" + lId, meta);
	
	newKeys = window.localStorage.getItem('newSeries'); // newSeries used by app when running to detect new series
	if(newKeys == null){
		 window.localStorage.setItem('newSeries', lId);
	} else { 
		 window.localStorage.setItem('newSeries', lId + "|" + newKeys);
	}
			
	if(window.window.localStorage.getItem('authorized') != null) {
	//TODO: require accesstoken & uid for cloud pushes
		if (window.XMLHttpRequest)
		{// code for IE7+, Firefox, Chrome, Opera, Safari
			xmlhttp=new XMLHttpRequest();
		}
		//document.getElementById("footer").innerHTML = meta;
		var params = "meta=" + escape(meta);
		xmlhttp.open("POST","http://www.mashabledata.com/update_series.php",true);
		xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		xmlhttp.setRequestHeader("Content-length", params.length);
		xmlhttp.setRequestHeader("Connection", "close");
		xmlhttp.onreadystatechange=function(){
			if (xmlhttp.readyState==4 && xmlhttp.status==200)
				//document.getElementById("footer").innerHTML=xmlhttp.responseText;
				//if(resultMeta.sid!=null) {meta = setMetaData("sid", resultMeta.sid, meta)}
			  //if(resultMeta.cid!=null) {meta = setMetaData("cid", resultMeta.cid, meta)}
			  //window.localStorage.setItem("meta" + lId, meta);

				{
					var md_response = xmlhttp.responseText;
					if(getMetaData("status", md_response)=="request_data" && first){
						//second send for full MD nested within first send
						first = false;
						var fullMashableData = "metadata|begin||" + meta + "||" + data;
						//console.info(fullMashableData);
						var params = "mashabledata=" + escape(fullMashableData);
						xmlhttp.open("POST","http://www.mashabledata.com/update_series.php",true);
						xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
						xmlhttp.setRequestHeader("Content-length", params.length);
						xmlhttp.setRequestHeader("Connection", "close");
						
						xmlhttp.onreadystatechange=function(){
							if (xmlhttp.readyState==4 && xmlhttp.status==200){
								updateIds(xmlhttp.responseText,lId)
							}
						};
						xmlhttp.send(params);
					} else if(getMetaData("status", md_response)=="ok") {
						updateIds(md_response,lId)
					}
				}
			};
		first = true;
		xmlhttp.send(params);
	}
}

//called on successful update
function updateIds(update_response,lId){
		var sId = getMetaData("sid", update_response);
		var cId = getMetaData("cid", update_response);
		if(!isNaN(sId) && !isNaN(cId)){
			var newMeta = setMetaData('sid', sId, meta);
			newMeta = setMetaData('cid', cId, newMeta);
			window.localStorage.setItem('meta' + lId, newMeta);
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
