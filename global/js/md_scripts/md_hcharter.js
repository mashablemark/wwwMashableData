/*MashableData Plugin for Highcharts  Copyright 2012.  All rights reserved.  Visit MashableData.com for usage guidelines.

 */
defaultMashableDataSharing = true; //change this variable if your site will authorize sharing on a per graphor series basis.
//Setting chart.mashableDataSharing = true or false overrides the defaultMashableDataSharing setting
//Setting chart.series[x].mashableDataSharing = true or false overrides both the chart level and the global MashableDataSharing setting


//mashableData theme
var md_version = { version: "0.1"};  //start of namespace.  Ultimately, make as mush of this configurable as possible
var md_iframe_loaded = false;  //plumbing along with function md_iframe_load() to make sure message don't get sent before the iFrame is ready.
var md_aMsg = []; //if md_secure_xfer iFrame not ready, msg stored here instead of being posted. iFrame onload event fires md_iframe_load() which then post the satores messages

$(document).ready(function(){								 
//add the iFrame
$('body').append('<div id="md_frame_holder" name="md_frame_holder" style="display:nonex"><iframe id="md_secure_xfer"  onload="md_iframe_load()" src="http://www.mashabledata.com/secure_xfer.php"></iframe></div>');
									
	var btnHeight = 20;
	var btnsWidth = 24;
	var btnsX = 10;
	var btnsY = 10;

	var currentTheme =  Highcharts.setOptions({});
	
	mashableDataHcTheme = {
		chart: {
			events: {
            load: function(event) {
                md_postSeries (this);
            }
        }
		},
		exporting: {
			buttons:{
				printButton: {
					enabled: true,
					onclick:  function() {window.open("http://www.mashabledata.com/workbench","mashabledata")},
					symbol: "gear"
				}
			}
		}
	};
	
  var highchartsOptions = Highcharts.setOptions(mashableDataHcTheme);
	
	$.extend(Highcharts.Renderer.prototype.symbols, {
    gear: function() {
			var innerR =5;
			var outterR=7;
			var offset=11;
			var teeth=7;
			var i=0;
            var angle;
			gearCommands = ['M',offset,offset-outterR];
			for(i=0;i<teeth;i++){
			  angle = (2*Math.PI / teeth * i) + (2*Math.PI / (teeth*4));
			  gearCommands.push('L');
			  gearCommands.push(Math.sin(angle)*outterR + offset);
			  gearCommands.push(offset-Math.cos(angle)*outterR);
			  gearCommands.push('L');
			  gearCommands.push(Math.sin(angle)*innerR + offset);
			  gearCommands.push(offset-Math.cos(angle)*innerR);
			  angle = (2*Math.PI / teeth * i) + 3* (2*Math.PI / (teeth*4));
			  gearCommands.push('L');
			  gearCommands.push(Math.sin(angle)*innerR + offset);
			  gearCommands.push(offset-Math.cos(angle)*innerR);
			  gearCommands.push('L');
			  gearCommands.push(Math.sin(angle)*outterR + offset);
			  gearCommands.push(offset-Math.cos(angle)*outterR);
			}
			gearCommands.push('Z');
			return gearCommands;
    }
	});
});

function md_postSeries(thischart){
	for(series in thischart.series){
		var permission = thischart.series[series].options.mashableDataSharing;
		if(!permission){
			permission = thischart.options.chart.mashableDataSharing;
			if(!permission){permission = defaultMashableDataSharing;}
		}

		if(permission==true){
			var thisSeries = thischart.series[series];
			var seriesInfo = md_calcSeriesInfo(thisSeries.data);
			var timestamp = new Date();
			var msg = ("metadata|begin||name|" + thisSeries.name);
			msg += ("||description|" +  md_propValue(thisSeries.description));
			msg += ("||skey|" + md_propValue(thisSeries.skey));
			msg += ("||sid|" + "null");
			msg += ("||cid|" + "null");
			msg += ("||useLatest|null");
			msg += ("||graph|" +  thischart.options.title.text);
			msg += ("||save|" + "H");
			msg += ("||decimal|" + "0");
			msg += ("||credit|" + thischart.options.credits.text);
			msg += ("||url|" + window.location.href);
			msg += ("||unit_nom|" + thisSeries.yAxis.options.title.text);
			msg += ("||unit_denom|" + "null");
			msg += ("||save_dt|" + timestamp.getTime());
			msg += ("||type|" + thisSeries.type);
			msg += ("||period|" + seriesInfo.perodicity);
			msg += ("||points|" + thisSeries.data.length);
			msg += ("||firstdt|" + seriesInfo.minDate);
			msg += ("||lastdt|" + seriesInfo.maxDate);
			var dataPortion = "";
			for(var datapoint in thisSeries.data){
				var xDate = new Date(thisSeries.data[datapoint].x);
				switch(seriesInfo.perodicity){
					case 'A':
						dataPortion += ("||" + xDate.getUTCFullYear() + "|" + thisSeries.data[datapoint].y);
						break;
					case 'W':
					case 'D':
						dataPortion += ("||" + xDate.getUTCFullYear() + ((xDate.getUTCMonth()<=9)?"0":"") + xDate.getUTCMonth() + ((xDate.getUTCDate()<=9)?"0":"") + xDate.getUTCDate() + "|" + thisSeries.data[datapoint].y);
						break;
					case 'M':
					case 'Q':
					case 'SA':
						dataPortion += ("||" + xDate.getUTCFullYear() + ((xDate.getUTCMonth()<=9)?"0":"") + xDate.getUTCMonth() + "|" + thisSeries.data[datapoint].y);
						break;
					case 'N':
						dataPortion += ("||" + xDate.getUTCFullYear() + ((xDate.getUTCMonth()<=9)?"0":"") + xDate.getUTCMonth() + ((xDate.getUTCDate()<=9)?"0":"") + xDate.getUTCDate() + " " + xDate.getUTCHours() + ":" + xDate.getUTCHours() + ":" + xDate.getUTCMinutes() + "|" + thisSeries.data[datapoint].y);
						break;
				}
			}
		}
		msg += ("||datahash|" + hex_sha1(dataPortion.substr(2)) + dataPortion);
		var mdFrame = document.getElementById("md_secure_xfer").contentWindow; //document.getElementById("md_frame_holder");

		if(md_iframe_loaded){ // this handles slow iFrame loads.  If not loaded, than store message until md_iframe_load fires
			mdFrame.postMessage(msg, 'http://www.mashabledata.com/secure_xfer.php');
		} else {
			md_aMsg.push(msg)
		}

	}
}

function md_iframe_load(){  //post any backlogged messages and indicate state
	var mdFrame = document.getElementById("md_secure_xfer").contentWindow; //document.getElementById("md_frame_holder");
	for(var i=0;i<md_aMsg.length;i++){
		mdFrame.postMessage(md_aMsg[i], 'http://www.mashabledata.com/secure_xfer.php');
	}
	md_iframe_loaded = true; //global variable to indicate state
}

function md_calcSeriesInfo(PointArray){
	var oSereiesInfo = {
		minDate: null,
		maxDate: null,
		minValue: null,
		maxValue: null,
		perodicity: 'A'
	};
	var dayOfMonth = null;
	var dayOfWeek = null;
	var monthOfYear = null;
	var timeOfDay = null;

	for(var pointIndex in PointArray){
		//console.info(pointIndex);
		var thisPoint = PointArray[pointIndex];
		if(oSereiesInfo.minDate == null || oSereiesInfo.minDate > thisPoint.x) {oSereiesInfo.minDate = thisPoint.x};
		if(oSereiesInfo.maxDate == null || oSereiesInfo.maxDate < thisPoint.x) {oSereiesInfo.maxDate = thisPoint.x};
		if(oSereiesInfo.minValue == null || oSereiesInfo.minValue > thisPoint.y) {oSereiesInfo.minValue = thisPoint.y};
		if(oSereiesInfo.maxValue == null || oSereiesInfo.maxValue < thisPoint.x) {oSereiesInfo.maxValue = thisPoint.y};
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
	if(timeOfDay === true) {oSereiesInfo.perodicity = 'T'}
	  else if(dayOfWeek !== true) {oSereiesInfo.perodicity = 'W'}
	  else if(dayOfMonth === true) {oSereiesInfo.perodicity = 'D'}
	  else if(monthOfYear === true) {oSereiesInfo.perodicity = 'M'}
		else {oSereiesInfo.perodicity = 'A'}
	
	return oSereiesInfo
}
function md_propValue(val){
    if(typeof val === "undefined"){return "null"} else {return val}
}


/*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
 * in FIPS 180-1
 * Version 2.2 Copyright Paul Johnston 2000 - 2009.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for details.
 */
var hexcase=0;var b64pad="";function hex_sha1(a){return rstr2hex(rstr_sha1(str2rstr_utf8(a)))}function hex_hmac_sha1(a,b){return rstr2hex(rstr_hmac_sha1(str2rstr_utf8(a),str2rstr_utf8(b)))}function sha1_vm_test(){return hex_sha1("abc").toLowerCase()=="a9993e364706816aba3e25717850c26c9cd0d89d"}function rstr_sha1(a){return binb2rstr(binb_sha1(rstr2binb(a),a.length*8))}function rstr_hmac_sha1(c,f){var e=rstr2binb(c);if(e.length>16){e=binb_sha1(e,c.length*8)}var a=Array(16),d=Array(16);for(var b=0;b<16;b++){a[b]=e[b]^909522486;d[b]=e[b]^1549556828}var g=binb_sha1(a.concat(rstr2binb(f)),512+f.length*8);return binb2rstr(binb_sha1(d.concat(g),512+160))}function rstr2hex(c){try{hexcase}catch(g){hexcase=0}var f=hexcase?"0123456789ABCDEF":"0123456789abcdef";var b="";var a;for(var d=0;d<c.length;d++){a=c.charCodeAt(d);b+=f.charAt((a>>>4)&15)+f.charAt(a&15)}return b}function str2rstr_utf8(c){var b="";var d=-1;var a,e;while(++d<c.length){a=c.charCodeAt(d);e=d+1<c.length?c.charCodeAt(d+1):0;if(55296<=a&&a<=56319&&56320<=e&&e<=57343){a=65536+((a&1023)<<10)+(e&1023);d++}if(a<=127){b+=String.fromCharCode(a)}else{if(a<=2047){b+=String.fromCharCode(192|((a>>>6)&31),128|(a&63))}else{if(a<=65535){b+=String.fromCharCode(224|((a>>>12)&15),128|((a>>>6)&63),128|(a&63))}else{if(a<=2097151){b+=String.fromCharCode(240|((a>>>18)&7),128|((a>>>12)&63),128|((a>>>6)&63),128|(a&63))}}}}}return b}function rstr2binb(b){var a=Array(b.length>>2);for(var c=0;c<a.length;c++){a[c]=0}for(var c=0;c<b.length*8;c+=8){a[c>>5]|=(b.charCodeAt(c/8)&255)<<(24-c%32)}return a}function binb2rstr(b){var a="";for(var c=0;c<b.length*32;c+=8){a+=String.fromCharCode((b[c>>5]>>>(24-c%32))&255)}return a}function binb_sha1(v,o){v[o>>5]|=128<<(24-o%32);v[((o+64>>9)<<4)+15]=o;var y=Array(80);var u=1732584193;var s=-271733879;var r=-1732584194;var q=271733878;var p=-1009589776;for(var l=0;l<v.length;l+=16){var n=u;var m=s;var k=r;var h=q;var f=p;for(var g=0;g<80;g++){if(g<16){y[g]=v[l+g]}else{y[g]=bit_rol(y[g-3]^y[g-8]^y[g-14]^y[g-16],1)}var z=safe_add(safe_add(bit_rol(u,5),sha1_ft(g,s,r,q)),safe_add(safe_add(p,y[g]),sha1_kt(g)));p=q;q=r;r=bit_rol(s,30);s=u;u=z}u=safe_add(u,n);s=safe_add(s,m);r=safe_add(r,k);q=safe_add(q,h);p=safe_add(p,f)}return Array(u,s,r,q,p)}function sha1_ft(e,a,g,f){if(e<20){return(a&g)|((~a)&f)}if(e<40){return a^g^f}if(e<60){return(a&g)|(a&f)|(g&f)}return a^g^f}function sha1_kt(a){return(a<20)?1518500249:(a<40)?1859775393:(a<60)?-1894007588:-899497514}function safe_add(a,d){var c=(a&65535)+(d&65535);var b=(a>>16)+(d>>16)+(c>>16);return(b<<16)|(c&65535)}function bit_rol(a,b){return(a<<b)|(a>>>(32-b))};