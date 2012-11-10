
function graphTableData(dataTableId, metaDatatableId){
	var units = "";
	var seriesName = document.getElementById(dataTableId).rows[0].cells[1].innerHTML;
	var graphType = "line";
	var charttitle =  document.getElementById(dataTableId).rows[0].cells[1].innerHTML;
	var units =  document.getElementById("units").innerHTML;
	
	var	jschart = {
		chart: 
		{ 
			renderTo: 'HighChartsDiv',
			defaultSeriesType: graphType,
			zoomType: 'xy'
		},
		legend: { },
		credits: {
        	enabled: false
		},
		title: {
        	text: charttitle  
    	},
		series: [],		
		xAxis: {
			type: 'datetime'
			//maxZoom: 10 * 365 * 24 * 3600 * 1000
		},
		yAxis: {
	        title: {
				text: units
			}
    	}
	};
	var oDataSeries = {
		name: seriesName,
		data: []
	}
//loop through the data rows	
	$("table#" + dataTableId + " tr:gt(0)").each(function(){
		oDataSeries.data.push([Date.parse("January 1, " + this.cells[0].innerHTML), parseInt(this.cells[1].innerHTML)]);
	});
	
	jschart.series.push(oDataSeries);
	
	//console.info(jschart);
	chart = new Highcharts.Chart(jschart);
	
	$('#showGraphLink').click();
}


$(document).ready(function(){
	$("body").prepend('<a id="showGraphLink" href="#HighChartsDiv" title="MashbleData.com: Cross Internet Data Sharing and Visualizations"></a>' +
		'<div id="outerShowGraphDiv" style="display:none;">' +
		'  <div id="HighChartsDiv" style="width:75%;height:75%;">Loading the chart.  Please wait...</div>' +
		'</div>');
/*	$("body").prepend('<a id="showSaveLoadLink" href="#saveLoadSeriesDiv" title="MashbleData.com: Cross Internet Data Sharing and Visualizations">loadLink</a>' +
		'<div id="outerLoadSeriesDiv" style="display:nonex;">' +
		'  <div id="saveLoadSeriesDiv"></div>' +
		'</div>');*/
	$("#showGraphLink").fancybox({
		'titlePosition'		: 'inside',
		'transitionIn'		: 'none',
		'transitionOut'		: 'none'
	});
});