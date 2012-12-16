//GLOBAL VARIABLES mce
var hcColors = [
    '#4572A7',
    '#AA4643',
    '#89A54E',
    '#80699B',
    '#3D96AE',
    '#DB843D',
    '#92A8CD',
    '#A47D7C',
    '#B5CA92'];
var primeColors=['#008000', '#FF0000','#0000FF', '#FFFF00', '#FF9900', '#00FFFF', '#000000'];  //green, red, blue, yellow, orange, azure, black
var dashStyles = [
    'Solid',
    'Short Dash',
    'Short Dot',
    'Short Dash Dot',
    'Short Dash Dot Dot',
    'Dot',
    'Dash',
    'Long Dash',
    'Dash Dot',
    'Long Dash Dot',
    'Long Dash Dot Dot'
];
var periodValue = {
    N: 1,
    D: 2,
    W: 3,
    M: 4,
    Q: 5,
    SA: 6,
    A: 7
} ;
var periodName = {
    N: 'non period data',
    D: 'daily',
    W: 'weekly',
    M: 'monthly',
    Q: 'quarterly',
    SA: 'semiannual',
    A: 'annual'
} ;
var periodUnits = {
    'A': "years",
    'SA': "half-years",
    'Q': "quarters",
    'M': "months",
    'W': "weeks",
    'D': "days"
};
var oPanelGraphs = {}; //MyGraph objects by panelID allows easy access to oMyCharts
var oHighCharts = {}; //highchart objects by panelID
var newPlotsIndex = -1; //index to generate unqiue local ids of new plot objects
var opValues = {"+":1,"-":2,"*":3,"/":4};
var opUI = {"+":"op-addition","-":"op-subtraction","*":"op-multiply","/":"op-divide"};
var jVectorMapTemplates = {
    "European Union": "europe_mill_en",
    "US states": "us_aea_en",
    "world": "world_mil"
};

console = console || {log: function(msg){}};  //allow conole.log call without triggering errors in IE or FireFox w/o Firebug

//MAIN CHART OBJECT, CHART PANEL, AND MAP FUNCTION CODE
function chartPanel(node){
    var panelId = $(node).closest('div.graph-panel').get(0).id;
    if(oHighCharts[panelId]) oHighCharts[panelId].destroy();
    var oGraph = oPanelGraphs[panelId];
    var chart;
    var oChartOptions = createChartObject(oPanelGraphs[panelId]);
    var $chart = $('#' + panelId + ' div.chart');
    if(oChartOptions.series.length==0){
        $chart.hide();
        return void 0;
    }
    $chart.show().height();
    oChartOptions.chart.renderTo = $chart.get(0);
    oChartOptions.plotOptions.series.point = {
        events: {
            mouseOver: function(evt) {
                oHighCharts[panelId].mouseoverPoint = this;
                mouseOverHCPoint(evt, this);
                /* this.select();
                 */
            },
            mouseOut: function(evt) {
                delete oHighCharts[panelId].mouseoverPoint;
                /*                this.select(false);*/
                /*   var selectedPoints = this.series.chart.getSelectedPoints();
                 for(var i=0;i<selectedPoints.length;i++){
                 selectedPoints[i].select(false);
                 }*/
            }
        }
    };

    oChartOptions.chart.events={
        /*        click:   function(e) {
         console.info(Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', e.xAxis[0].value) + ", " + e.yAxis[0].value); //value only available during chart's click event
         },*/
        selection: function(event){
            var min;
            var max;
            if(event.resetSelection){
                if(chart.cropButton) chart.cropButton = chart.cropButton.destroy();
                oGraph.minZoom = (oGraph.start===null)?oGraph.firstdt:oGraph.start;
                oGraph.maxZoom = (oGraph.end===null)?oGraph.lastdt:oGraph.end;
            } else {
                //var chart = oHighCharts[panelId];
                var btnOptions = $.extend(true, {}, chart.options.chart.resetZoomButton);
                btnOptions.position.y += 30;
                var box = {
                    x: chart.plotLeft,
                    y: chart.plotTop,
                    width: chart.plotWidth,
                    height: chart.plotHeight
                };
                chart.cropButton = chart.renderer.button('Crop X-axis', null, null, function () { $('#'+ panelId + ' button.graph-crop').click()}, {zIndex:20}, null).attr({align: "right"})
                    .attr({
                        align: btnOptions.position.align,
                        title: 'Crop x-axis to current zoom level'
                    })
                    .add()
                    .align(btnOptions.position, false, box);
                var axisMin = event.xAxis[0].min;
                var axisMax = event.xAxis[0].max;
                for(var i=0;i<oChartOptions.series.length;i++){
                    var seriesData = oChartOptions.series[i].data;
                    min = closestDate(axisMin, seriesData, min);
                    max = closestDate(axisMax, seriesData, max);
                }
                oGraph.minZoom = min;
                oGraph.maxZoom = max;
            }
            $('#' + panelId + ' tr.graph-crop-row').click();
        }
    };
    chart = new Highcharts.Chart(oChartOptions);
    //for a highcharts div mouseover event that translates to X and Y axis coordinates:  http://highslide.com/forum/viewtopic.php?f=9&t=10204
    $('#' + panelId + ' div.chart').mouseover(function(e){
        if(banding){
            if(banding.substr(0,2)=='y-'){
                var chart = oHighCharts[visiblePanelId()];
                var isIE = /msie/i.test(navigator.userAgent) && !window.opera,
                    top = $(chart.container).offset().top,
                    left = $(chart.container).offset().left;
                var x = (isIE ? e.originalEvent.x : e.clientX - left) - chart.plotLeft,
                    y = (isIE ? e.originalEvent.y : e.pageY - top) - chart.plotTop;
                if(y >= 0 && y <= chart.plotSizeY ) {
                    for(var i=0;i<chart.yAxis.length;i++){
                        var axisValue =  chart.yAxis[i].translate(chart.plotHeight-y, true);
                        if(chart.yAxis[i].userOptions.title.text = banding.substr(2)){
                            chart.yAxis[i].removePlotBand('hb'+bandNo);
                            chart.yAxis[i].addPlotBand({
                                id: 'hb'+bandNo,
                                color: makeRGBA(colorsPlotBands[0]),
                                from: parseFloat(bandStartPoint),
                                to: axisValue,
                                label: {text: '', zIndex: 3}
                            });
                        }
                    }
                }
            }
        }
    });
    $.contextMenu({
        selector: '#' + panelId + ' div.chart',
        build: function($trigger, e) {  //menu is built or cancelled dynamically in build function startin on the following line
            var axisName, axisValue, userValue;
            var pointSelected = chart.mouseoverPoint;  //grab reference (set by a HighCharts' event) before point's mouseout event can delete it
            var onPoint = (typeof(chart.mouseoverPoint)!="undefined");
            if(banding){ // false if not actively x or y banding
                if(banding=='x-Time'){
                    if(onPoint){
                        banding = false;  //band was already drawn in the mouseOver event
                        bandNo++;
                        var panelId = visiblePanelId();
                        oPanelGraphs[panelId].annotations.push({
                            type:	'band',
                            text: 	'',
                            id: 'xb' + bandNo,
                            color: 	'#'+colorsPlotBands[0],
                            from: 	formatDateByPeriod(bandStartPoint.x,bandStartPoint.series.options.period),
                            to: formatDateByPeriod(pointSelected.x, pointSelected.series.options.period)
                        });
                        buildAnnotations(panelId,'table-only');  //redraw the annotation table only
                        return false;  //no need to show a menu
                    } else { //clicked to end time band, but not over point to provide xValue
                        return {items: {info: {name:"Mouse-over a series before right-clicking to terminate a vertical band.",callback: function(key, opt){ }}}}
                    }
                } else {
                    for(var i=0;i<chart.yAxis.length;i++){ //find the yAxis that we are banding
                        axisName = chart.yAxis[i].userOptions.title.text;
                        if(banding=='y-'+axisName){
                            var isIE = /msie/i.test(navigator.userAgent) && !window.opera,
                                top = $(chart.container).offset().top,
                                left = $(chart.container).offset().left;
                            var x = (isIE ? e.originalEvent.x : e.clientX - left) - chart.plotLeft,
                                y = (isIE ? e.originalEvent.y : e.pageY - top) - chart.plotTop;
                            if(y >= 0 && y <= chart.plotSizeY ) {
                                axisValue =  parseFloat(parseFloat(chart.yAxis[i].translate(chart.plotHeight-y, true).toPrecision(2))) ;
                                return {  //show the termination / cancel menu
                                    items: {
                                        axis: {
                                            name: '<b>'+ axisName + ':</b>',
                                            type: 'text',  //allow the user to edit the end value
                                            value: axisValue
                                        },
                                        ok: {
                                            name: '<button>ok</button>',
                                            callback: function(key, opt){
                                                userValue = $.contextMenu.getInputValues(opt)['axis']; //edited value
                                                banding = false;  //band was already drawn in the mouseOver event, but need to redraw it up in case user edited terminal value
                                                //do increment bandNo:  this was done at start of banding
                                                for(var i=0;i<chart.yAxis.length;i++){
                                                    if(chart.yAxis[i].userOptions.title.text = axisName){
                                                        chart.yAxis[i].removePlotBand('hb'+bandNo);
                                                        chart.yAxis[i].addPlotBand({
                                                            id: 'hb'+bandNo,
                                                            color: makeRGBA(colorsPlotBands[0]),
                                                            from: parseFloat(bandStartPoint),
                                                            to: parseFloat(userValue),
                                                            label: {text: '', zIndex: 3}
                                                        });
                                                        oGraph.annotations.push({
                                                            id: 'hb' + bandNo,
                                                            type:	'hband',
                                                            yAxis: axisName,
                                                            text: 	'',
                                                            color: 	'#'+colorsPlotBands[0],
                                                            from: 	bandStartPoint,
                                                            to: userValue
                                                        });
                                                        buildAnnotations(visiblePanelId(),'table-only');  //redraw the annotation table only
                                                    }
                                                }
                                            }
                                        },
                                        cancel: {
                                            name: '<button>cancel</button>',
                                            callback: function(key, opt){chart.yAxis[i].removePlotBand('hb'+bandNo);}
                                        }
                                    }
                                };
                            } else {
                                return false;
                            }
                        }
                    }
                }
            } else {
                var mnu = {
                    items: {
                        point: {name: "annotate point",
                            disabled: !onPoint,
                            callback: function(key, opt){ annotatePoint(pointSelected) } },
                        vline: {name: "add vertical line",
                            disabled: !onPoint,
                            callback: function(key, opt){ annotateXLine(pointSelected) } },
                        vband: {name: "start vertical band",
                            disabled: !onPoint,
                            callback: function(key, opt){ annotateXBandStart(pointSelected); } },
                        "sep1": "---------",
                        hline: {name: "add horizontal line", items:{} },
                        hband: {name: "start horizontal band", items:{} },
                        "sep2": "---------",
                        regression: {name: "add linear regression as zoomed",
                            disabled: !onPoint,
                            callback: function(key, opt){ alert("Clicked on " + key); } },
                        rolling: {name: "add rolling average",
                            disabled: !onPoint,
                            callback: function(key, opt){ alert("Clicked on " + key); } }
                    }
                };
                var isIE = /msie/i.test(navigator.userAgent) && !window.opera,
                    top = $(chart.container).offset().top,
                    left = $(chart.container).offset().left;
                var x = (isIE ? e.originalEvent.x : e.clientX - left) - chart.plotLeft,
                    y = (isIE ? e.originalEvent.y : e.pageY - top) - chart.plotTop;
                if(y >= 0 && y <= chart.plotSizeY ) {
                    for(var i=0;i<chart.yAxis.length;i++){
                        axisName = chart.yAxis[i].userOptions.title.text;
                        axisValue =  parseFloat(parseFloat(chart.yAxis[i].translate(chart.plotHeight-y, true).toPrecision(2))) ;
                        mnu.items.hline.items['hltext'+i] = {name: '<b>'+ axisName + ':</b>', type: 'text', value: axisValue};
                        mnu.items.hline.items['hladd'+i] = {
                            name: '<button>add</button>', callback: function(key, opt){
                                var value = parseFloat($.contextMenu.getInputValues(opt)['hltext'+key.substr(5)]);
                                chart.yAxis[parseInt(key.substr(5))].addPlotLine({
                                    color: '#FF0000',
                                    width: 2,
                                    value: value
                                });
                                lineNo++;
                                oGraph.annotations.push({
                                    id: 'hl' + lineNo,
                                    type: 'hline',
                                    color: '#FF0000',
                                    from:  value,
                                    yAxis: chart.yAxis[parseInt(key.substr(5))].userOptions.title.text,
                                    text: ''
                                });
                                buildAnnotations(visiblePanelId(), 'table-only');
                            }
                        };
                        mnu.items.hband.items['hbtext'+i] = {name: '<b>'+ axisName + ':</b>', type: 'text', value: axisValue};
                        mnu.items.hband.items['hbadd'+i] = {

                            name: '<button>start</button>',
                            callback: function(key, opt){
                                //START AN HBAND
                                bandNo++;
                                bandStartPoint = parseFloat($.contextMenu.getInputValues(opt)['hbtext'+key.substr(5)]);
                                banding = 'y-'+axisName;
                                chart.yAxis[parseInt(key.substr(5))].addPlotBand({
                                    id: 'hb'+bandNo,
                                    color: makeRGBA(colorsPlotBands[0]),
                                    from: bandStartPoint,
                                    to: bandStartPoint
                                });
                            }
                        };
                        if(i!=0) {
                            mnu.items.hline.items['yadd'+i+"sep"] = "---------";
                            mnu.items.hband.items['yadd'+i+"sep"] = "---------";
                        }
                    }
                } else {
                    if(!onPoint)
                        return false;  //nothing enabled therefore do not show
                    mnu.items.hline.disabled = true;
                    mnu.items.hband.disabled = true;
                }
                return mnu;
            }
        }
    });
    $('#' + panelId + ' .highcharts-title').click(function(){graphTitle.show(this)});
    return chart;
}
function setCropSlider(panelId){  //get closest point to recorded js dt
    var leftIndex, rightIndex, i, bestDelta, thisDelta;
    var oGraph = oPanelGraphs[panelId];
    var chartOptions = oHighCharts[panelId].options.chart;
    if(oGraph.start===null){
        leftIndex = 0;
    } else {
        i = chartOptions.x.indexOf(oGraph.start.toString());
        if(i>-1){
            leftIndex = i;
        } else { //start is a non-null number, but not point matches exactly.  We have to search for the closest
            bestDelta = null;
            for(i=0;i<chartOptions.x.length;i++){
                thisDelta = Math.abs(parseInt(chartOptions.x[i])-parseInt(oGraph.start));
                if(bestDelta===null || bestDelta>thisDelta){
                    bestDelta = thisDelta;
                    leftIndex = i;
                }
            }
        }
    }

    if(oGraph.end===null){
        rightIndex = chartOptions.x.length-1;
    } else {
        i = chartOptions.x.indexOf(oGraph.end.toString());
        if(i>-1){
            rightIndex = i;
        } else { //start is a non-null number, but not point matches exactly.  We have to search for the closest
            bestDelta = null;
            for(i=0;i<chartOptions.x.length;i++){
                thisDelta = Math.abs(parseInt(chartOptions.x[i])-parseInt(oGraph.end));
                if(bestDelta===null || bestDelta>thisDelta){
                    bestDelta = thisDelta;
                    rightIndex = i;
                }
            }
        }
    }

    $('#' + panelId + ' span.interval-crop-period').html(periodUnits[oGraph.largestPeriod]);
    $('#' + panelId + ' div.crop-slider')
        .slider("option", "max", chartOptions.x.length-1)
        .slider("option", "values", [leftIndex, rightIndex]);
}
function dateFromMdDate(dt, periodicity){
    var udt;
    udt = new Date(dt.substr(0,4) + ' UTC');
    switch(periodicity){
        case "N": {
            udt.setUTCHours(dt.substr(9,2));
            udt.setUTCMinutes(dt.substr(12,2));
            udt.setUTCSeconds(dt.substr(15,2));
        }
        case "W":
        case "D": {
            udt.setUTCDate(dt.substr(6,2));
        }
        case "Q":
        case "SA":
        case "M": {
            udt.setUTCMonth(dt.substr(4,2));
        }
    }
    return udt
}
function closestDate(nearbyDate, seriesData, closestYet){
    for(var i=0;i<seriesData.length;i++){
        if(Math.abs(nearbyDate-seriesData[i][0])<Math.abs(nearbyDate-closestYet) || closestYet===undefined) closestYet = seriesData[i][0];
    }
    return closestYet;
}
function getGraph(node){
    var panelID;
    panelID = $(node).closest("div.graph-panel").get(0).id;
    return oPanelGraphs[panelID];
}
function assetNeeded(handle, graph, assetsToFetch){
    graph.assets = graph.assets || {};
    if(!graph.assets[handle]){
        if(oMySeries&&oMySeries[handle]&&oMySeries[handle].data){
            graph.assets[handle] = $.extend({}, oMySeries[handle]);
        } else {
            assetsToFetch[handle.charAt(0)].push(handle.substr(1));
        }
    }
}
function getAssets(graph, callBack){
var assetsToFetch = {S:[],U:[], X:[], M:[]};
var p, c, handle;
    if(graph.plots){
        for(p=0;p<graph.plots.length;p++){
            for(c=0;c<graph.plots[p].components.length;c++){
                assetNeeded(graph.plots[p].components[c].handle, graph, assetsToFetch);
            }
        }
    }
    if(graph.mapsets){
        for(c=0;c<graph.mapsets.components.length;c++){
            assetNeeded(graph.mapsets.components[c].handle, graph, assetsToFetch);
        }
    }
    if(graph.pointsets){
        for(p=0;p<graph.pointsets.length;p++){
            for(c=0;c<graph.pointsets[p].components.length;c++){
                assetNeeded(graph.pointsets[p].components[c].handle, graph, assetsToFetch);
            }
        }
    }

    if(assetsToFetch.S.length>0 || assetsToFetch.U.length>0){
        callApi(
            {command:"GetMashableData", sids: assetsToFetch.S, usids: assetsToFetch.U, modal:'persist'},
            function(jsoData, textStatus, jqXHR){
                for(handle in jsoData.series) graph.assets[handle] = jsoData.series[handle];
                assetsToFetch.S = [];
                assetsToFetch.U = [];
                if(assetsToFetch.M.length+assetsToFetch.X.length+assetsToFetch.U.length+assetsToFetch.S.length==0) callBack();
            }
        );
    }

    if(assetsToFetch.M.length>0){
        callApi(
            {command:"GetMapSets", mapsetids: assetsToFetch.M, map: graph.map, modal:'persist'},
            function(jsoData, textStatus, jqXHR){
                for(handle in jsoData.mapsets) graph.assets[handle] = jsoData.mapsets[handle];
                assetsToFetch.M = [];
                if(assetsToFetch.M.length+assetsToFetch.X.length+assetsToFetch.U.length+assetsToFetch.S.length==0) callBack();
            }
        );
    }

    if(assetsToFetch.X.length>0){
        callApi(
            {command:"GetPointSets", pointsetids: assetsToFetch.X, map: graph.map, modal:'persist'},
            function(jsoData, textStatus, jqXHR){
                for(handle in jsoData.pointsets) graph.assets[handle] = jsoData.pointsets[handle];
                assetsToFetch.X = [];
                if(assetsToFetch.M.length+assetsToFetch.X.length+assetsToFetch.U.length+assetsToFetch.S.length==0) callBack();
            }
        );
    }
    if(assetsToFetch.M.length+assetsToFetch.X.length+assetsToFetch.U.length+assetsToFetch.S.length==0) callBack();
}
function createMyGraph(gid, onComplete){
    var oMyGraph = oMyGraphs['G' + gid];
    var fileAssets = ["/global/js/highcharts/js/highcharts.2.2.5.src.js","/global/js/highcharts/js/modules/exporting.2.1.6.src.js","/global/js/colorpicker/jquery.colorPicker.min.js","/global/js/jvectormap/jquery-jvectormap-1.1.1.min.js"];
    if(oMyGraph.map) fileAssets.push('js/maps/jquery_jvectormap_'+ jVectorMapTemplates[oMyGraph.map] +'.js');   //get the map too if needed
    require(fileAssets); //parallel load while getting db assets
    getAssets(oMyGraph, function(){
        require(fileAssets, function(){
            buildGraphPanel($.extend(true, {}, oMyGraph));
            unmask();
            if(onComplete) onComplete();
        }); //panelId not passed -> new panel
    });
}
function emptyGraph(){
    return  {
        annotations: [],
        title: '',
        type: 'line',
        assets: {},
        analysis: null,
        mapconfig: {},
        start: null,
        end: null,
        published: 'N'
    };
}
function createChartObject(oGraph){
    var i, j, allX = {};

    var	jschart = {
        chart:
        {
            animation: false,
            type: 'line',
            zoomType: 'x',
            //TODO:  use title, graph controls, and analysis box heights instead of fixed pixel heights
            height: ($('div.graph-panel').height()-70 - (oGraph.map?70:0)) * ((oGraph.mapsets||oGraph.pointsets)?0.4:1), //leave space for analysis textarea
            x: []
        },
        colors: hcColors,
        exporting: {enabled: false},  //don't show buttons.  Access through interface.
        plotOptions: {
            area: {stacking: 'normal'},
            scatter: {
                zIndex: 20,
                showInLegend: false //scatter used to show labels only
            },
            series: {
                zIndex: 10,
                //point: {events: {mouseOver: function(){mouseOverHCPoint(this)}}},
                //events: {click:  function(event){clickHCSeries(event)}},
                marker: {
                    enabled: true,
                    radius: 2,
                    symbol: 'circle',
                    fillColor: '#FFFFFF',
                    lineColor: null,
                    states: {
                        hover: {
                            enabled: true
                        }
                    }
                },
                shadow: false,
                dataLabels:{
                    align: 'center',
                    enabled:true,
                    color:'#ffffff',
                    formatter:function(){
                        if( typeof(this.point.id) != 'undefined' ){
                            return this.point.id;
                        }
                    },
                    y:5,
                    x:0
                }
            }
        },
        legend: { enabled : true},
        credits: {
            enabled: true,
            text: ""
        },
        series: [],
        title: {
            text: oGraph.title,
            style: {cursor: 'pointer'}
        }, // tooltip: {shared:true, crosshairs:[true,false]},
        xAxis: {
            type: 'datetime',
            min: (oGraph.start===null)?null:parseInt(oGraph.start),
            max: (oGraph.end===null)?null:parseInt(oGraph.end)
            //maxZoom: 10 * 365 * 24 * 3600 * 1000
        },
        yAxis: []
    };

    if(oGraph.title.length==0){
        jschart.title.text = 'untitled - click to edit';
        jschart.title.style.color= 'grey';
        jschart.title.style.font= 'italic'
    }
    //loop through the data rows
    var lineIndex = 0;

    for(i=0;i<oGraph.plots.length;i++){
        var oSerie = createSerieFromPlot(oGraph, i);
        var oDataSeries = {
            name: oSerie.name,
            marker: {enabled: false},
            id: 'P'+i,
            handle: oSerie.handle, //may need to change with addition of plot objects
            period: oSerie.period,
            data: [],
            yAxis: 0
        };
        var oPlot = oGraph.plots[i];
        if(oPlot.options.type){
            if(oPlot.options.type!='default') oDataSeries.type = oPlot.options.type;
        }
        if(oPlot.options.lineWidth) oDataSeries.lineWidth = oPlot.options.lineWidth;
        if(oPlot.options.lineStyle) oDataSeries.dashStyle  = oPlot.options.lineStyle;
        if(oPlot.options.lineColor) {
            jschart.colors.splice(i,1,oPlot.options.lineColor);
        }
        if(oGraph.type=='area' || oDataSeries.stack=='area'){
            oDataSeries.stack = oSerie.units; //TODO: (1) convert units
        }
        var aData = oSerie.data.split('||');
        var periodicity = oSerie.period;
        for(j=0;j<aData.length;j++){
            var mddt = aData[j].split('|')[0];
            var addPoint = true;
            /* this is not possible unless we calc the data ahead of time and store in a temp pen
            if(oGraph.type=='area'||oGraph.type=='area-percent'){
                for(var handle in oGraph.assets){
                    var dataString = '||' + oGraph.assets[handle].data;
                    if(dataString.indexOf('||' + mddt + '|')=="-1"){
                        addPoint = false;
                        break;
                    }
                }
            }*/

            var udt = dateFromMdDate(mddt, periodicity);
            var y = aData[j].split('|')[1];
            if(addPoint){
                //can not use objects& markers as Highcharts gets crazy slow for large series.  Markers are handled with shadow scatter plots.
                //oDataSeries.data.push({x: Date.parse(udt), y: (y=="null")?null:Number(y)});
                //oDataSeries.data.push({x: Date.parse(udt), y: (y=="null")?null:Number(y), marker: {enabled:false}});
                oDataSeries.data.push([Date.parse(udt), (y=="null")?null:Number(y)]);
                allX[Date.parse(udt)] = true;
            }
        }
        var units = oSerie.units;
        //axis:  first, existing or new multiple?
        var newAxis = {
            labels: {
                //formatter: function() {  return this.value + ' ' + units; },
                style: {
                    color: '#333333'
                }
            },
            title: {
                text: units,
                style: {
                    color: '#333333'
                }
            }
        };
        if(jschart.yAxis.length == 0) {
            jschart.yAxis.push(newAxis);  //series is already defaulted to the first yAxis
        } else {
            var bMatch = false;
            var iAxis;
            for(iAxis=0; iAxis<jschart.yAxis.length; iAxis++){
                if(jschart.yAxis[iAxis].title.text == units){
                    oDataSeries.yAxis = iAxis;
                    bMatch = true;
                    break;
                }
            }
            if(!bMatch){
                newAxis.title.style.color = hcColors[lineIndex];
                newAxis.labels.style.color = hcColors[lineIndex];

                jschart.yAxis[0].title.style.color = hcColors[0];
                jschart.yAxis[0].labels.style.color = hcColors[0];
                newAxis.opposite = true;
                jschart.yAxis.push(newAxis);

                oDataSeries.yAxis = iAxis;
            }
        }
        jschart.series.push(oDataSeries);
        lineIndex++
    }
    //these scatter plot series are used to show annotations
    for(var i=0;i<jschart.yAxis.length;i++){
        jschart.series.push({
            type: 'scatter',
            id: ('labelsY-' + i),
            yAxis: i,
            data: [],
            doNotShow: true
        });
    }
    // additional series object process for specialty charts
    switch(oGraph.type){
        case "pie":
            var oPieSeries = [{type: 'pie', data: []}];
            var timePoint = ((oGraph.end)?parseInt(oGraph.end):oGraph.lastdt);
            for(i=0;i<jschart.series.length;i++){
                var oSerie = jschart.series[i];
                for(j=oSerie.data.length-1;j>=0;j--){
                    if(oSerie.data[j][0]== timePoint){
                        oPieSeries[0].data.push([oSerie.name, oSerie.data[j][1]]);
                        break;
                    }
                }
            }
            jschart.series = oPieSeries; //replace with a pie configured
            jschart.chart.type = oGraph.type;
            break;
        case "stacked-column":
            jschart.plotOptions.column = {stacking: 'normal'};
            for(i=0;i<jschart.series.length;i++){
                jschart.series[i].stack="stacked";
            }
        case "column":
            /*var endingInterval = ((oGraph.end)?parseInt(oGraph.end):oGraph.lastdt);
             var categories = [];
             var colDates = [];*/
            jschart.yAxis.min = 0;
            /* var intervalCount = ((oGraph.interval.count)?parseInt(oGraph.interval.count):1);
             for(i=intervalCount-1;i>=0;i--){
             var colDate = new Date(endingInterval);
             switch(((oGraph.interval.span=='null')?oGraph.smallestPeriod:oGraph.interval.span)){
             case 'M':
             colDate.setUTCMonth(colDate.getUTCMonth()-i);
             break;
             case 'A':
             colDate.setUTCFullYear(colDate.getUTCFullYear()-i);
             break;
             }
             categories.push(formatDateByPeriod(colDate.valueOf(),oGraph.smallestPeriod));
             colDates.push(Date.parse(colDate));
             }
             var columnData;
             for(i=0;i<jschart.series.length;i++){
             columnData = [];
             var serie = jschart.series[i];
             var k = 0;
             for(j=0;j<colDates.length;j++){
             var datum;
             while(k<serie.data.length){
             datum = null;
             if(serie.data[k][0]==colDates[j]){
             datum = serie.data[k][1];
             break;
             }
             if(serie.data[k][0]>colDates[j]) {
             break;
             }
             k++;
             }
             columnData.push(datum);
             }
             serie.data = columnData;  //replace full linear time-value array with bar values
             }
             jschart.xAxis = {categories: categories};*/
            jschart.chart.type = 'column';
            break;
        case "area-percent":
            jschart.yAxis[0].title.text = 'percent';
            jschart.plotOptions.area.stacking="percent";
        case "area":
            jschart.chart.type = "area";
            break;
        case "auto":
            var maxPeriodWidth = -1;
            var minPeriodWidth = 1e12;
            for(var i=0;i<jschart.series.length;i++){
                if(jschart.series[i].period){
                    var rank = periodWidth(jschart.series[i].period);
                    if(minPeriodWidth > rank)minPeriodWidth = rank;
                    if(maxPeriodWidth < rank)maxPeriodWidth = rank;
                }
            }
            if(maxPeriodWidth != minPeriodWidth){
                for(var i=0;i<jschart.series.length;i++){
                    if(maxPeriodWidth == periodWidth(jschart.series[i].period)){
                        jschart.series[i].type = 'column';
                        jschart.series[i].zIndex = 8;
                        //jschart.series[i].lineWidth = null;
                        //jschart.series[i].pointPadding = 30*24*3600*1000;
                        //jschart.series[i].pointWidth = 10;  //TODO: change when next Highcharts release fixes bug
                        for(var j=0;j<jschart.series[i].data.length;j++){
                            jschart.series[i].data[j].x +=  maxPeriodWidth /2;
                        }
                        //jschart.series[i].pointPadding = 10; //365*24*60*60*1000;
                    }
                }
            }   //default is all lines if they have the same periodicity

            break;
        case "logarithmic":
            for(var i=0;i<jschart.yAxis.length;i++){jschart.yAxis[i].type='logarithmic'}
            break;
        case "normalized-line":

            var firstDate;
            if(oGraph.start){firstDate=oGraph.start;} else {firstDate= jschart.series[0].data[0][0];}
            var matched = false;
            while(!matched){
                matched = true;
                for(i=0; i<jschart.series.length;i++){
                    if(jschart.series[i].sid){
                        while(firstDate>jschart.series[i].data[0][0]){
                            jschart.series[i].data.splice(0,1);
                            if(jschart.series[i].data.length==0){
                                break;
                            }
                            if(firstDate<jschart.series[i].data[0][0]){

                                firstDate=jschart.series[i].data[0][0];
                            }
                        }
                        if(jschart.series[i].data.length==0){
                            jschart.title.text = "Error:  no common starting point for normalization";
                            for(j=0;j<jschart.series.length;j++) {
                                jschart.series[j].data=[];
                            }
                            matched = true;
                            break;
                        }
                        matched = matched && (firstDate==jschart.series[i].data[0][0]);
                    }
                }
            }

            //normalize
            for(i=0; i<jschart.series.length;i++){
                for(j=jschart.series[i].data.length-1;j>=0;j--){
                    jschart.series[i].data[j][1]=jschart.series[i].data[j][1]/jschart.series[i].data[0][1];
                }
                jschart.seriesyAxis=0;
            }


            jschart.yAxis = [{title:{text: 'Normalized to 1'}}];
    }
    for(var key in allX){
        jschart.chart.x.push(key);
    }
    jschart.chart.x.sort(function(a,b){return parseInt(a)-parseInt(b)});
    return jschart
}
function createSerieFromPlot(oGraph, plotIndex){
    var components, i, j, sHandle, plot, calculatedSeries, data, point, plotData=[], dateKey, oComponentData = {};
    //TODO: this is stub code for a single series plot.  Vector math and transform code to be added
    plot = oGraph.plots[plotIndex];
    calculatedSeries = {name: plot.name, units: plot.options.units};
    components = plot.components;

    //get the units in this order : plot > transformed series > raw series
    if(plot.options.units){
        calculatedSeries.units=plot.options.units
    }else{
        if(components[0].options.units){
            calculatedSeries.units = components[0].options.units;
        } else {
            calculatedSeries.units = oGraph.assets[components[0].handle].units;
        }
    }
    //same for frequency (note these work because the units and freq in a plot must be the same, either natively or through transformations
    if(plot.options.period){
        calculatedSeries.period=plot.options.period
    }else{
        if(components[0].options.period){
            calculatedSeries.period = components[0].options.period;
        } else {
            calculatedSeries.period = oGraph.assets[components[0].handle].period;
        }
    }
    //...and for name
    if(!plot.name && components.length==1) calculatedSeries.name =  oGraph.assets[components[0].handle].name;

    if(components.length==1){
        calculatedSeries.data = oGraph.assets[components[0].handle].data;
    } else {  //a whole lot of calculating!
        sortComponentsByOp(components);  //for good measure...
        //1. rearrange series data into single object by date keys
        for(i=0;i<components.length;i++ ){
            sHandle = components[i].handle;
            if(!components[i].k)components[i].k=1;
            //TODO: apply series transforms / down shifting here instead of just parroting series data
            data = oGraph.assets[sHandle].data.split("||");
            for(j=0; j<data.length; j++){
                point = data[j].split("|");
                if(!oComponentData[point[0].toString()]){
                    oComponentData[point[0].toString()] = {};
                }
                oComponentData[point[0].toString()][sHandle] = point[1];
            }
            if(!plot.name) plot.name = oGraph.assets[sHandle].name;
            if(!plot.units) plot.units = oGraph.assets[sHandle].units;
        }
        //2. calculate value for each date key (= grouped points)
        for(dateKey in oComponentData){
            var value = null;
            for(i=0;i<components.length;i++ ){
                if(oComponentData[dateKey][components[i].handle]){
                    if(value==null){
                        if(components[i].op!="/"){
                            value= parseFloat(oComponentData[dateKey][components[i].handle]);
                        } else {
                            break;
                        }
                    } else {
                        switch(components[i].op){
                            case "+":
                                value = value + (parseFloat(components[i].k) * parseFloat(oComponentData[dateKey][components[i].handle]));
                                break;
                            case "-":
                                value = value - (parseFloat(components[i].k) * parseFloat(oComponentData[dateKey][components[i].handle]));
                                break;
                            case "*":
                                value = value * (parseFloat(components[i].k) * parseFloat(oComponentData[dateKey][components[i].handle]));
                                break;
                            case "/":
                                if( parseFloat(oComponentData[dateKey][components[i].handle])==0){
                                    value = null;
                                } else {
                                    value = value / (parseFloat(components[i].k) * parseFloat(oComponentData[dateKey][components[i].handle]));
                                }
                                break;
                        }
                    }
                } else {
                    if(components[i].op=="*"||components[i].op=="/"||plot.options.missingAsZero!=true){
                        value = null;
                        break;
                    }
                }
            }
            plotData.push({"date":dateKey, "value": value})
        }
        //3. reconstruct an ordered MD data array
        for(i=0;i<plotData.length;i++){
            point = plotData[i];
            plotData[i] = point.date + "|" + point.value;
        }
        plotData.sort();
        calculatedSeries.data = plotData.join("||");
    }
    return calculatedSeries;
}
function plotFormula(plot){//returns a formula for eval, with lcase S & U and ucase for M & X objects; false if not period/unit problem
    var cmp, variable, lastOp=null, lastUnits=null, formula='';
    for(var i=0;i<plot.components.length;i++){
        cmp = plot.components[i];
        variable  = (cmp.handle.match(/MX/))?String.fromCharCode('A'.charCodeAt(0)+i):variable = String.fromCharCode('a'.charCodeAt(0)+i);
        if(formula.length==0){
            switch(cmp.op){
                case '/':
                    formula = (isNaN(cmp.k)||cmp.k==1)?'1/' + variable:'1/('+cmp.k.toString()+'*' + variable + ')';
                    break;
                case '-':
                    formula = (isNaN(cmp.k)||cmp.k==1)?'-' + variable:'-('+cmp.k.toString()+')*' + variable;
                    break;
                case '+':
                case '*':
                default:
                    formula = (isNaN(cmp.k)||cmp.k==1)?variable:'('+cmp.k.toString()+')*' + variable;
            }
        } else {
            switch(cmp.op){
                case "+":
                    if(lastOp!='+') return false;  //unordered!
                    formula += cmp.op + (isNaN(cmp.k)||cmp.k==1)?variable:'('+cmp.k.toString()+')*' + variable;
                    break;
                case '-':
                    if(lastOp!='+'&&lastOp!='-') return false;  //unordered!
                    formula += cmp.op + (isNaN(cmp.k)||cmp.k==1)?variable:'('+cmp.k.toString()+')*' + variable;
                    break;
                case '*':
                    if(lastOp=='/') return false;  //unordered!
                    if((lastOp=='+'&&lastOp!='-')&&i>1){
                        formula = '('+formula+')' + cmp.op + (isNaN(cmp.k)||cmp.k==1)?variable:'('+cmp.k.toString()+'*' + variable + ')';
                    } else {
                        formula += cmp.op + (isNaN(cmp.k)||cmp.k==1)?variable:'('+cmp.k.toString()+'*' + variable + ')';
                    }
                    break;
                case '/':
                    if((lastOp=='+'&&lastOp!='-')&&i>1){
                        formula = '('+formula+')' + cmp.op + (isNaN(cmp.k)||cmp.k==1)?variable:'('+cmp.k.toString()+'*' + variable + ')';
                    } else {
                        formula += cmp.op + (isNaN(cmp.k)||cmp.k==1)?variable:'('+cmp.k.toString()+'*' + variable + ')';
                    }
            }

        }
        lastOp = cmp.op;
    }
    return formula;

}

function makeDataTable(panelId, type){  //create tables in data tab of data behind the chart, the map regions, and the map markers
    var hasMap, hasChart, p, c, plot, component, d, row, compData, serie, jsdt, mdPoint, mdDate;
    var oGraph = oPanelGraphs[panelId];
    var assets = oGraph.assets;
    if(oGraph.plots){
        var chart = oHighCharts[panelId];
        hasChart = true;
    } else {
        hasChart = false;
    }
    if(oGraph.map){
        hasMap = true;
        var mapData = assets.mapData;
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

    var rowPosition = {
        name: 0,
        units: 1,
        source: 2,
        notes: 3,
        region: 4,
        lat_lon: 5,
        date: 6,
        dataStart: 7
    };

    if(type=='chart'){

        for(p=0;p<oGraph.plots.length;p++){
            plot = oGraph.plots[p];
            serie = chart.get('P'+p);

            var showComponentsAndPlot = plot.components.length>1 || (plot.options.formula && plot.options.formula.length>1) || plot.options.units || plot.options.name;
            for(c=0;c<plot.components.length;c++){
                component = assets[plot.components[c].handle];
                grid[rowPosition.name].push((showComponentsAndPlot?'':'<b>') + component.name + (showComponentsAndPlot?'':'</b>'));
                grid[rowPosition.units].push(component.units);
                grid[rowPosition.source].push('<a href="'+ component.url +'">' + component.src + '</a>');
                grid[rowPosition.notes].push(component.notes);
                grid[rowPosition.region].push(component.iso1366?component.iso1366:'');
                grid[rowPosition.lat_lon].push((component.lat)?'"' + component.lat + ', ' + component.lon + '"':'');
                grid[rowPosition.date].push(showComponentsAndPlot?String.fromCharCode('a'.charCodeAt(0)+c):'values');
                for(row=rowPosition.dataStart;row<grid.length;row++){
                    grid[row].push('');  //even out array to ensure the grid is square 2-D array of arrays
                }
                compData = component.data.split('||');
                for(d=0;d<compData.length;d++){
                    mdPoint = compData[d].split('|');
                    jsdt = dateFromMdDate( mdPoint[0], component.period);
                    mdDate = formatDateByPeriod(jsdt.getTime(), serie.options.period);
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
                grid[rowPosition.date].push((plot.options.formula?plot.options.formula:'y=a'));
                for(row=rowPosition.dataStart;row<grid.length;row++){
                    grid[row].push('');  //even out array to ensure the grid is square 2-D array of arrays
                }
                for(d=0;d<serie.data.length;d++){
                    mdDate = formatDateByPeriod(serie.data[d].x, serie.options.period);
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
        for(row=rowPosition.dataStart;row<grid.length;row++){
            grid[row][0] = grid[row][0].s;  //even out array to ensure the grid is square 2-D array of arrays
        }

        if(grid[rowPosition.lat_lon].join('')=='lat, lon:') grid.splice(rowPosition.lat_lon,1);
        if(grid[rowPosition.region].join('')=='region code:') grid.splice(rowPosition.region,1);
    }
    return(makeTableFromArray(grid));
}
function makeTableFromArray(grid){
    var r, c;
    for(r=0;r<grid.length;r++){
        grid[r] = '<tr><td>' + grid[r].join('</td><td>') + '</td></tr>';
    }
    return '<table class="data-grid">' + grid.join('') + '</table>';
}


//MAP FUNCTIONS
function calcMap(graph){
    //vars that will make up the return object
    var mapTitle, mapPeriod, mapUnits, aMapDates=[], markers={};
    var pointData = {}; //2D object array:  [mashable-date][shandle]=value
    var regionData = {};  //2D object array:  [mashable-date][region-code]=value

    //local vars
    var mapRegionNames = {};
    var mapMin=null, mapMax=null;
    var pointMin=null, pointMax=null;
    var oMapDates = {};
    if(graph.mapsets){
        var mapset;  //shortcut past the mapHandle into the the mapset
        for(var mapHandle in graph.mapsets.components){  //TODO:  only handles a single mapset right now
            mapset = graph.assets[graph.mapsets.components[mapHandle].handle];
            mapTitle = mapset.name;
            mapPeriod = mapset.period;
            mapUnits = mapset.units;
            for(var regionCode in mapset.data){
                mapRegionNames[regionCode] = mapset.data[regionCode].geoname;
                var points = mapset.data[regionCode].data.split("||");
                for(var i=0;i<points.length;i++){
                    var point = points[i].split("|");
                    if(!regionData[point[0]]) regionData[point[0]] = {};
                    regionData[point[0]][regionCode]= (point[1]=="null")?null:parseFloat(point[1]);
                    if(mapMin==null || (point[1]!='null' && mapMin>parseFloat(point[1])))
                        mapMin=parseFloat(point[1]);
                    if(mapMax==null || (point[1]!='null' && mapMax<parseFloat(point[1])))
                        mapMax=parseFloat(point[1]);
                    if(!oMapDates[point[0]]){
                        oMapDates[point[0]] = true;
                        aMapDates.push({s: point[0], dt: dateFromMdDate(point[0], mapset.period)});
                    }
                }
            }
            //fill holes in the matrix with nulls, otherwise jVectorMap leaves the last valid value when changing date
            for(var mddt in regionData){
                for(var map_code in mapRegionNames){
                    if(typeof regionData[mddt][map_code] == "undefined") regionData[mddt][map_code]=null;
                }
            }
        }
        aMapDates.sort(function(a,b){return a.dt - b.dt});

    }
    if(graph.pointsets){
        var index = 0, pointPlot, cmp;
        for(var i=0;i<graph.pointsets.length;i++){ //assemble the coordinates and colors for multiple mapsets
            pointPlot = graph.pointsets[i];
            cmp = pointPlot.components[0];  //TODO: allow for multiple components and compmath
            markers = $.extend(markers, graph.assets[cmp.handle].coordinates);
            for(var s in graph.assets[cmp.handle].coordinates){
                markers[s].name = graph.assets[cmp.handle].data[s].name;
                markers[s].style = {fill: primeColors[index]};
            }
            index++;

            for(var handle in graph.assets[cmp.handle].data){
                var points = graph.assets[cmp.handle].data[handle].data.split("||");
                for(var i=0;i<points.length;i++){
                    var point = points[i].split("|");
                    if(!pointData[point[0]]) pointData[point[0]] = {};
                    pointData[point[0]][handle]= (point[1]=="null")?null:parseFloat(point[1]);
                    if(pointMin==null || (point[1]!='null' && pointMin>parseFloat(point[1])))
                        pointMin=parseFloat(point[1]);
                    if(pointMax==null || (point[1]!='null' && pointMax<parseFloat(point[1])))
                        pointMax=parseFloat(point[1]);
                    if(!oMapDates[point[0]]){
                        oMapDates[point[0]] = true;
                        aMapDates.push({s: point[0], dt: dateFromMdDate(point[0], graph.assets[cmp.handle].period)});
                    }
                }
            }
            mapPeriod = graph.assets[cmp.handle].period; //overwrites <- OK becuase only single periodicity allowed!
            mapTitle = (mapTitle)? mapTitle+" : "+ graph.assets[cmp.handle].name : graph.assets[cmp.handle].name;
        }
        aMapDates.sort(function(a,b){return a.dt - b.dt});

        //fill holes in the matrix with nulls, otherwise jVectorMap leaves the last valid value when changing date
        for(var mddt in pointData){
            for(var handle in markers){
                if(typeof pointData[mddt][handle] == "undefined") pointData[mddt][handle]=null;
            }
        }
    }

    return {
        title: mapTitle,
        period: mapPeriod,
        units: mapUnits,
        markers: markers,
        markerData: pointData,
        dates: aMapDates,
        regionData: regionData,
        regionDataMin:mapMin,
        regionDataMax:mapMax,
        markerDataMin:pointMin,
        markerDataMax:pointMax
    }
}
function getMapDataByContainingDate(mapData,mdDate){ //tries exact date match and then step back if weekly->monthly->annual or if monthly->annual
//this allows mixed-periodicity mapsets and marker set to be display controlled via the slider
    while(mdDate.length>=4){
        if(mapData[mdDate]) return mapData[mdDate];
        mdDate = mdDate.substr(0,mdDate.length-2);
    }
}

function downloadMap(panelID, format){
    //format = 'image/jpeg';  //'application/pdf',
    var svg = $('#'+ panelID + ' div.jvmap div').html();
    //jvector map sanitize
    svg = svg.replace(/<div.+<\/div>/gi, '');
    //svg = svg.replace(/ class="[^"]+"/gi, '');
    //svg = svg.replace(/ id="[^"]+"/gi, '');
    svg = svg.replace(/<svg /gi, '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" ');
    //svg = svg.replace(/<g [^>]+>/gi, '<g>');

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

    var options = {
        type: format,
        filename: 'MashableDataMap',
        width: 800,
        svg: svg,
        url: 'export/index.php'
    };
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
    Highcharts.each(['filename', 'type', 'width', 'svg'], function (name) {
        createElement('input', {
            type: 'hidden',
            name: name,
            value: {
                filename: options.filename || 'chart',
                type: options.type,
                width: options.width,
                svg: svg
            }[name]
        }, null, form);
    });

    // submit
    form.submit();

    // clean up
    Highcharts.discardElement(form);
}
var buildGraphPanel = function(oGraph, panelId){ //all highcharts, jvm, and colorpicker files need must already be loaded
    var title;
    if(oGraph.title.length==0){
        var key, assetCount=0;
        for(key in oGraph.assets){
            assetCount++;
            if(assetCount>1) break;
        }
        if(assetCount==1) oGraph.title = oGraph.assets[key].name;
    }
    title = oGraph.title;
    if(oGraph.intervals==0) oGraph.intervals = null;
    if(!panelId){
        panelId = addTab(title);
    } else {
        $("#graph-tabs li").find("[href='#" + panelId + "']").html(title);
        destroyChartObject(panelId);
    }
    var $thisPanel = $('#' + panelId);
    $thisPanel.html(
        '<div class="graph-nav">' +
            '<ol class="graph-nav">' +
                '<li class="graph-nav-talk" data="graph-talk"></li>' +
                '<li class="graph-nav-data" data="graph-data"></li>' +
                '<li class="graph-nav-sources"  data="graph-sources"onclick="provenance();"></li>' +
                '<li class="graph-nav-active graph-nav-graph" data="graph-chart"></li>' +
            '</ol>' +
        '</div>'+
        '<div class="graph-talk graph-subpanel" style="display: none;">owner enables and reviews WordPress powered comments here</div>' +
        '<div class="graph-data graph-subpanel" style="display: none;">' +
            '<div class="graph-data-inner">' +
                '<ul>' +
                    '<li><a href="#data-chart-' + panelId + '">chart data</a></li>' +
                    '<li><a href="#data-region-' + panelId + '">map region data</a></li>' +
                    '<li><a href="#data-marker-' + panelId + '">map marker data</a></li>' +
                '</ul><button class="copy-to-clipboard ui-state-highlight" title="Copy table below to your clip board for easy pasting into Excel">Copy to clipboard&nbsp;</button>' +
                '<div id="data-chart-' + panelId + '" class="graph-data-subpanel" data="chart">c-d</div>' +
                '<div id="data-region-' + panelId + '" class="graph-data-subpanel" data="region">r-d</div>' +
                '<div id="data-marker-' + panelId + '" class="graph-data-subpanel" data="marker">m-d</div>' +
            '</div>' +
        '</div>' +
        '<div class="provenance graph-sources graph-subpanel" style="display: none;"></div>' +
        '<div class="graph-chart graph-subpanel">' +
            '<div class="graph_control_panel" style="font-size: 11px !important;">' +
                //'<button class="graph-series" onclick="provenance()">show and edit series sources and names</button>' +
                //'title:  <input class="graph-title" maxlength="200" length="150"/><br />' +
                '<div class="graph-type">default graph type ' +
                    '<select class="graph-type">' +
                    '<option value="line">line</option>' +
                    '<option value="auto">mixed line &amp; column</option>' +
                    '<option value="column">column</option>' +
                    '<option value="stacked-column">stacked column</option>' +
                    '<option value="area-percent">stacked percent</option>' +
                    '<option value="area">stacked area</option>' +
                    '<option value="logarithmic">logarithmic</option>' +
                    '<option value="normalized-line">normalized line</option>' +
                    '<option value="pie">pie</option>' +
                    '</select>' +
                '</div>' +
                '<div class="crop-tool"><fieldset><legend>Crop graph</legend>' +
                '<table>' +
                    '<tr><td><input type="radio" name="'+ panelId +'-rad-crop" id="'+ panelId +'-rad-no-crop" class="rad-no-crop"></td><td><label for="'+ panelId +'-rad-no-crop">no cropping (graph will expand as new data is gathered)</label></td></tr>' +
                    '<tr><td><input type="radio" name="'+ panelId +'-rad-crop" id="'+ panelId +'-rad-hard-crop" class="rad-hard-crop"></td><td>' +
                        '<div class="crop-dates"><i>select this option and slide endpoints for a fixed crop</i></div>' +
                        '<div class="crop-slider"></div>' +
                        '</td></tr>' +
                    '<tr><td><input type="radio" name="'+ panelId +'-rad-crop" id="'+ panelId +'-rad-interval-crop" class="rad-interval-crop"></td>' +
                        '<td><label for="'+ panelId +'-rad-latest-crop">show latest <input class="interval-crop-count" value="'+(oGraph.intervals||5)+'"> <span class="interval-crop-period"></span></label></td></tr>' +
                '</table>' +
                    '<button class="graph-crop" style="display: none;">crop</button></fieldset>' +
                '</div>' +
                '<div class="annotations"><fieldset><legend>Annotations</legend>' +
                    '<table class="annotations"></table>' +
                '</fieldset></div>' +
                '<div class="downloads">' +
                    '<fieldset>' +
                    '<legend>&nbsp;Downloads&nbsp;</legend>' +
                    'Data: ' +
                    '<a title="tooltip" class="md-csv rico">CSV</a>' +
                    //'<a class="md-xls rico">Excel</a><br>' +
                    ' Image: ' +
                    //'<a onclick="exportChart()" class="md-png rico" onclick="exportPNG(event)">PNG</a>' +
                    '<a onclick="exportChart(\'image/jpeg\')" class="md-jpg rico">JPG</a>' +
                    '<a onclick="exportChart(\'image/svg+xml\')" class="md-svg rico">SVG</a>' +
                    '<a onclick="exportChart(\'application/pdf\')" class="md-pdf rico">PDF</a>' +
                '</fieldset>' +
                '</div>' +
                '<div class="downloads">' +
                '<fieldset>' +
                '<legend>&nbsp;Sharing&nbsp;</legend>' +

                '<a href="#" class="post-facebook"><img src="http://www.eia.gov/global/images/icons/facebook.png" />facebook</a> ' +
                '<a href="#" class="post-twitter"><img src="http://www.eia.gov/global/images/icons/twitter.png" />twitter</a> ' +
                '<a href="#" class="email-link"><img src="http://www.eia.gov/global/images/icons/email.png" />email</a> ' +
                '<a href="#" class="graph-link"><img src="http://www.eia.gov/global/images/icons/email.png" />link</a> ' +
                '<a href="#" class="email-link"><img src="http://www.eia.gov/global/images/icons/email.png" />searchable</a> ' +
                '</fieldset>' +
                '</div>' +
                '<br /><button class="graph-save">save&nbsp;</button> <button class="graph-close">close&nbsp;</button> <button class="graph-delete">delete&nbsp;</button><br />' +
            '</div>' +
            '<div class="chart-map" style="width:70%;display:inline;float:right;">' +
                '<div class="chart"></div>' +
                '<div class="map" style="display:none;">' +
                    '<h3 class="map-title" style="color:black;"></h3>'+
                    '<div class="container map-controls">' +
                        '<div class="jvmap" style="display: inline-block;"></div>' +
                        '<div class="slider" style="display: inline-block;width: 280px;"></div>' +
                        '<button class="map-play">play</button>' +
                        '<button class="map-graph-selected" title="graph selected regions and markers" disabled="disabled">graph</button>' +
                        '<button class="make-map">reset</button>' +
                    '</div>' +
                '</div>' +
                '<div height="75px"><textarea style="width:100%;height:50px;margin-left:5px;"  class="graph-analysis" maxlength="1000" /></div>' +
            '</div>' +
        '</div>');
    var chart;
//load
    $thisPanel.find('select.graph-type').val(oGraph.type);
    $thisPanel.find('ol.graph-nav').children('li').click(function(){
        $thisPanel.find('ol.graph-nav').children('li').removeClass('graph-nav-active');
        $thisPanel.find('.graph-subpanel').hide();
        $thisPanel.find('.' + $(this).attr('data')).show();
        if(this)
        $(this).addClass('graph-nav-active');
    });

    $thisPanel.find('.graph-data-inner')
        .tabs({
            beforeActivate: function( event, ui ) {
                ui.newPanel.html(makeDataTable(panelId,ui.newPanel.attr('data')))
            }
        })
        .tabs(oGraph.plots?"enable":"disable",0)
        .tabs(oGraph.mapsets?"enable":"disable",1)
        .tabs(oGraph.pointsets?"enable":"disable",2);

    $thisPanel.find('.graph-nav-data').click(function(){
        var $dataPanel = $($thisPanel.find('.graph-data-inner li.ui-state-active a').attr('href'));
        $dataPanel.html(makeDataTable(panelId, $dataPanel.attr('data')));
    });
    $thisPanel.find('button.copy-to-clipboard').button({icons: {secondary: "ui-icon-copy"}}).click(function(){
        //invoke copy to clipboard lib here!!!!!!!!!!!!!
    });
    $thisPanel.find('.graph-subpanel').width($thisPanel.width()-35-2).height($thisPanel.height()-30)
        .find('.chart-map').width($thisPanel.width()-40-350); //
    $thisPanel.find('input.graph-publish').change(function(){
        if(this.checked){
            $thisPanel.find('button.graph-save-preview').removeAttr("disabled");
        } else {
            $thisPanel.find('button.graph-save-preview').attr("disabled","disabled");
        }
    }).prop('checked',(oGraph.published=='Y'));
    if(oGraph.published!='Y'){ $('#' + panelId + ' button.graph-save-preview').attr("disabled","disabled")}
    $thisPanel.find('.graph-analysis').val(oGraph.analysis);
//add events
    $thisPanel.find('button.interval-selector').click(function(){
        if(this.innerHTML=='on'){
            //chart.options.tooltip.shared=true;
            chart.options.tooltip.crosshairs=[true,false];
            $thisPanel.find('button.interval-selector-on').addClass('toggle-active').removeClass('toggle-inactive');
            $thisPanel.find('button.interval-selector-off').addClass('toggle-inactive').removeClass('toggle-active');
        } else {
            //chart.options.tooltip.shared=false;
            chart.options.tooltip.crosshairs=null;
            $thisPanel.find('button.interval-selector-on').addClass('toggle-inactive').removeClass('toggle-active');
            $thisPanel.find('button.interval-selector-off').addClass('toggle-active').removeClass('toggle-inactive');
        }
        chart.redraw();
    });
    $thisPanel.find('a.post-facebook').click(function(){
        annoSync();
        var svg = oHighCharts[panelId].getSVG();
        $.ajax({
            type: 'POST',
            url:"export/index.php",
            dataType: 'json',
            data:  {
                type: 'FB',  //'image/jpeg',
                width: "800",
                svg: svg},
            success: function(chartInfo, textStatus, jqXH){
                var body = oPanelGraphs[visiblePanelId()].analysis;
                var caption =  oPanelGraphs[visiblePanelId()].title;
                //check permissions first with: FB.api('/me/permissions', function(response) {if(response.data[0])});

                // calling the API ...
                var obj = {
                    method: 'feed',
                    link: 'http://www.mashabledata.com/workbench/view.php?g='+ oPanelGraphs[visiblePanelId()].ghash,
                    picture: chartInfo.imageURL,
                    message: body,
                    name: 'Facebook Dialogs',
                    caption: caption,
                    description: body
                };

                function callback(response) {
                    alert("Post ID: " + response['post_id']);
                }

                FB.ui(obj, callback);
            },
            error: function(response, textStatus, jqXH){
                console.log(textStatus);
            }
        });
    });

//  *** crop routines begin ***
    if(oGraph.intervals){ //initialize crop radio button selection
        $thisPanel.find('.rad-interval-crop').attr('checked',true)
    } else {
        if(oGraph.start && oGraph.end){
            $thisPanel.find('.rad-hard-crop').attr('checked',true)
        } else {
            $thisPanel.find('.rad-no-crop').attr('checked',true);
        }
    }
    var hardCropFromSlider = function(){
        var values = $thisPanel.find('.crop-slider').slider('values');
        $thisPanel.find('.rad-hard-crop').attr('checked',true);
        oGraph.intervals = null;
        oGraph.start = oHighCharts[panelId].options.chart.x[values[0]];
        oGraph.end = oHighCharts[panelId].options.chart.x[values[1]];
        $thisPanel.find('.graph-type').change();  //should be signals or a call to a local var  = function
    };
    var cropDates = function(slider){
        var values = $(slider).slider("values");
        return formatDateByPeriod(oHighCharts[panelId].options.chart.x[values[0]],oGraph.smallestPeriod)+' - '+formatDateByPeriod(oHighCharts[panelId].options.chart.x[values[1]],oGraph.smallestPeriod);
    };

    $thisPanel.find('div.crop-slider').slider(
        { //max and value[] are set in setCropSlider() after Highchart is called below
            range: true,
            stop: function(){
                hardCropFromSlider()
            },
            change: function(){
                if(oHighCharts[panelId]){
                    $thisPanel.find('.crop-dates').html(cropDates(this));
                }
            },
            slide: function(){
                $thisPanel.find('.crop-dates').html(cropDates(this));
            }
        });

    $('#'+panelId+'-rad-hard-crop').change(function(){
        hardCropFromSlider();
    });

    $('#'+panelId+'-rad-interval-crop').change(function(){
        var interval = parseInt($(this).val());
        if(!interval || interval<1){
            interval = 5;
            $(this).val(interval);
        }
        oGraph.intervals = interval;
        oGraph.start = null;
        oGraph.end = null;


    });
    $('#'+panelId+'-rad-no-crop').change(function(){
        oGraph.intervals = null;
        oGraph.start = null;
        oGraph.end = null;
        oGraph.minZoom = oGraph.firstdt;
        oGraph.maxZoom = oGraph.lastdt;
        //oHighCharts[panelId].xAxis[0].setExtremes(oPanelGraphs[panelId].firstdt,oPanelGraphs[panelId].lastdt);
        oHighCharts[panelId]=chartPanel(this);
        buildAnnotations(panelId);
        //$thisPanel.find('.graph-type').change();  //should be signals or a call to a local var  = function
    });

    $thisPanel.find('input.interval-crop-count').spinner({
            min:1,
            incrementalType: false,
            stop: function(event, ui) {
                $thisPanel.find('input#'+panelId+'-rad-interval-crop').attr('checked',true);
                oGraph.intervals = $(this).val();
                oGraph.start = null;
                oGraph.end = null;
                $thisPanel.find('graph-type').change();  //should be signals or a call to a local var  = function
            }
        });

    $thisPanel.find('button.graph-crop').click(function(){
        var graph = oPanelGraphs[panelId];
        graph.start = (graph.minZoom>graph.firstdt)?graph.minZoom:graph.firstdt;
        graph.end = (graph.maxZoom<graph.lastdt)?graph.maxZoom:graph.lastdt;
        $(this).attr("disabled","disabled");
        //oHighCharts[panelId].xAxis[0].setExtremes(oPanelGraphs[panelId].start,oPanelGraphs[panelId].end);
        oHighCharts[panelId]=chartPanel(this);
        buildAnnotations(panelId);
    });

// *** crop rountine end ***


    $thisPanel.find('input.graph-publish').change(function(){
        oGraph.published = (this.checked?'Y':'N');
    });
    $thisPanel.find('select.graph-type').change(function(){
        if($(this).val()=='logarithmic'){
            for(var y=0;y<oHighCharts[panelId].yAxis.length;y++){
                if(oHighCharts[panelId].yAxis[y].getExtremes().dataMin<=0){
                    $thisPanel.find('select.graph-type').val(oGraph.type);
                    dialogShow("Logarithmic scaling not available", "Logarithmic Y-axis scaling is not allowed if negative values are present");
                    return false;
                }
            }

        }
        oGraph.type=$(this).val();
        oHighCharts[panelId]=chartPanel(this);
        buildAnnotations(panelId);

    });

    $thisPanel.find('.graph-analysis').change(function(){
        oGraph.analysis=$(this).val();
    });
    //$thisPanel.find('input.graph-title').change(function(){titleChange(this);});

    $thisPanel.find('.graph-analysis').change(function(){
        oPanelGraphs[panelId].analysis=this.value;
        $thisPanel.find('.graph-save').button("enable");
    });
    oGraph.isDirty = oGraph.gid;
    $thisPanel.find('button.graph-save').button({icons: {secondary: "ui-icon-disk"}}).button(oGraph.gid?'disable':'enable').click(function(){
        saveGraph(getGraph(this));
        $thisPanel.find('button.graph-delete').button("enable");
    });
    $thisPanel.find('button.graph-close').button({icons: {secondary: "ui-icon-closethick"}}).click(function(){
        $('ul#graph-tabs a[href=#' + panelId + ']').siblings('span').click();
    });
    $thisPanel.find('button.graph-delete').button({icons: {secondary: "ui-icon-trash"}}).click(function(){
        dialogShow("Permanently Delete Graph", "Are you sure you want to delete this graph?",
            [
                {
                    text: 'Delete',
                    id: 'btn-dia-enable',
                    click: function() {
                        deleteMyGraph(panelId);
                        $(this).dialog('close');
                    }
                },
                {
                    text: 'Cancel',
                    id:'btn-dia-disable',
                    click:  function() {
                        $(this).dialog('close');
                    }
                }
            ]);
    });
    if(oGraph.gid)$thisPanel.find('button.graph-delete').button("disable");
    oGraph.smallestPeriod = "A";
    oGraph.largestPeriod = "N";
    var min, max, key, jsdt, handle;
    for(var key in oGraph.assets){
        if(!oGraph.assets[key].firstdt && (key.charAt(0)=='M' || key.charAt(0)=='X')){
            for(handle in oGraph.assets[key].data){
                jsdt = oGraph.assets[key].data[handle].firstdt;
                oGraph.assets[key].firstdt = Math.min(oGraph.assets[key].firstdt, jsdt)||jsdt;
                jsdt = oGraph.assets[key].data[handle].lastdt;
                oGraph.assets[key].lastdt = Math.max(oGraph.assets[key].lastdt, jsdt)||jsdt;
            }
        }
        if(periodValue[oGraph.smallestPeriod]>periodValue[oGraph.assets[key].period]) oGraph.smallestPeriod = oGraph.assets[key].period;
        if(periodValue[oGraph.largestPeriod]<periodValue[oGraph.assets[key].period]) oGraph.largestPeriod = oGraph.assets[key].period;

        jsdt = oGraph.assets[key].firstdt;
        min = Math.min(jsdt, min)  || jsdt;
        jsdt = oGraph.assets[key].lastdt;
        max = Math.max(jsdt, max)  || jsdt;
    }
    oGraph.firstdt = min;
    oGraph.lastdt = max;
    oGraph.minZoom = oGraph.start || oGraph.firstdt;
    oGraph.maxZoom = oGraph.end || oGraph.lastdt;
    $thisPanel.find('tr.graph-crop-none-row td.graph-from').html(formatDateByPeriod(min, oGraph.smallestPeriod));
    $thisPanel.find('tr.graph-crop-none-row td.graph-to').html(formatDateByPeriod(max, oGraph.smallestPeriod));
    oPanelGraphs[panelId]=oGraph;  //oPanelGraphs will be synced will oMyGraphs on save

    if(oGraph.plots){
        oHighCharts[panelId]=chartPanel($thisPanel.find('select.graph-type').get(0));
        buildAnnotations(panelId);
        setCropSlider(panelId);
        $thisPanel.find('div.highcharts-container').mousedown(function (b) {
            if(b.which==3){}  //???
        });
    } else {
        $thisPanel.find('div.chart').hide();
    }
    ////////////MMMMMMMMMMMMMMAAAAAAAAAAAAAAAAAAPPPPPPPPPPPPPPPPPPPPPP
    var $map;
    if(oGraph.map && (oGraph.mapsets||oGraph.pointsets)){
        var calculatedMapData = calcMap(oGraph);

        var jvmap_template;
        switch(oGraph.map){
            case "US states":
                jvmap_template = "us_aea_en";
                break;
            case "European Union":
                jvmap_template = "europe_mill_en";
                break;
            default:
                jvmap_template = "world_mill_en";
        }
        var vectorMapSettings = {
            map: jvmap_template,
            markersSelectable: true,
            markerStyle: {initial: {r: 0}}, //default for null values in the data
            series: {
                regions:  [{
                    attribute: "fill",
                    values: getMapDataByContainingDate(calculatedMapData.regionData, calculatedMapData.dates[calculatedMapData.dates.length-1].s), //val=aMapDates.length-1 will need to be harmonized with pointsets' most recent date
                    scale: ['#C8EEFF', '#0071A4'],
                    normalizeFunction: (calculatedMapData.regionDataMin>0)?'polynomial':'linear', //jVMap's polynominal scaling routine goes haywire with neg min
                    min: calculatedMapData.regionDataMin,
                    max: calculatedMapData.regionDataMax
                }],
                markers:  [{
                    attribute: 'r',
                    scale: [1, 20],
                    values: getMapDataByContainingDate(calculatedMapData.markerData,calculatedMapData.dates[calculatedMapData.dates.length-1].s),
                    min: calculatedMapData.markerDataMin,
                    max: calculatedMapData.markerDataMax
                }]
            },
            onRegionLabelShow: function(event, label, code){
                var i, vals=[], containingDateData = getMapDataByContainingDate(calculatedMapData.regionData,calculatedMapData.dates[val].s);
                if(containingDateData && containingDateData[code]){
                    for(i=0;i<calculatedMapData.dates.length;i++){
                        if(calculatedMapData.regionData[calculatedMapData.dates[i].s]) vals.push(calculatedMapData.regionData[calculatedMapData.dates[i].s][code]);
                    }
                    var y = containingDateData[code];
                    label.html(
                        '<span style="display: inline-block;"><b>'+label.html()+':</b><br />'
                            + Highcharts.numberFormat(y, (parseInt(y)==y)?0:2)
                            + " " + ((calculatedMapData.units)?calculatedMapData.units:'')
                            + '</span><span class="inlinesparkline" style="height: 30px;margin:0 5px;"></span>'
                    ).css("z-Index",400);
                    var sparkOptions = {height:"30px", valueSpots:{}, spotColor: false, minSpotColor:false, maxSpotColor:false, disableInteraction:true};
                    sparkOptions.valueSpots[y.toString()+':'+y.toString()] = 'red';
                    $('.inlinesparkline').sparkline(vals, sparkOptions);
                }
            },
            regionsSelectable: (typeof oGraph.mapsets != "undefined"),
            markers: calculatedMapData.markers,
            onMarkerLabelShow: function(event, label, code){
                var i, vals=[], containingDateData = getMapDataByContainingDate(calculatedMapData.markerData,calculatedMapData.dates[val].s);
                for(i=0;i<calculatedMapData.dates.length;i++){
                    if(calculatedMapData.markerData[calculatedMapData.dates[i].s]) vals.push(calculatedMapData.markerData[calculatedMapData.dates[i].s][code]);
                }
                var y = containingDateData[code];
                label.html(
                    '<span style="display: inline-block;"><b>'+label.html()+':</b><br />'
                        + Highcharts.numberFormat(containingDateData[code], (parseInt(containingDateData[code])==containingDateData[code])?0:2)
                        + " " + ((calculatedMapData.units)?calculatedMapData.units:'')
                        + '</span><span class="inlinesparkline" style="height: 30px;margin:0 5px;"></span>'
                ).css("z-Index",400);
                var sparkOptions = {height:"30px", valueSpots:{}, spotColor: false, minSpotColor:false, maxSpotColor:false, disableInteraction:true};
                sparkOptions.valueSpots[y.toString()+':'+y.toString()] = 'red';
                $('.inlinesparkline').sparkline(vals, sparkOptions);
            },
            onRegionSelected: function(e, code, isSelected){
                var selectedMarkers = $map.getSelectedMarkers();
                if(selectedMarkers.length>0){
                    $thisPanel.find('.map-graph-selected').removeAttr('disabled');
                    return;
                }
                var selectedRegions = $map.getSelectedRegions();
                for(var i=0;i<selectedRegions.length;i++){
                    if(calculatedMapData.regionData[calculatedMapData.dates[0].s]&&calculatedMapData.regionData[calculatedMapData.dates[0].s][selectedRegions[i]]){
                        $thisPanel.find('.map-graph-selected').removeAttr('disabled');
                        return;
                    }
                }
                //default if no markers selected or region that have data are selected:
                $thisPanel.find('.map-graph-selected').attr('disabled','disabled');
            },
            onMarkerSelected: function(e, code, isSelected){
                vectorMapSettings.onRegionSelected(e, code, isSelected)
            }
        };

        var val = calculatedMapData.dates.length-1; //initial value
        $thisPanel.find('div.map').show();

        //TODO:  use title, graph controls, and analysis box heights instead of fixed pixel heights
        $thisPanel.find('div.jvmap').show().height(($('div.graph-panel').height()-85-(oGraph.plots?0:55)) * ((oGraph.plots)?0.6:1)).vectorMap(vectorMapSettings);
        $map = $thisPanel.find('div.jvmap').vectorMap('get', 'mapObject');
        $thisPanel.find('button.map-unselect').show().click(function(){$map.reset()});
        var $slider = $thisPanel.find('.slider').show().slider({
            value: val,
            min: 0,
            max: val,
            step: 1,
            change: function( event, ui ) {
                val = ui.value;
                $map.series.regions[0].setValues(getMapDataByContainingDate(calculatedMapData.regionData,calculatedMapData.dates[val].s));
                $map.series.markers[0].setValues(getMapDataByContainingDate(calculatedMapData.markerData,calculatedMapData.dates[val].s));
                if(oGraph.plots){
                    var timeAxis = oHighCharts[panelId].xAxis[0];
                    timeAxis.removePlotLine('timeLine');
                    timeAxis.addPlotLine({
                        value: calculatedMapData.dates[val].dt,
                        color: 'red',
                        width: 2,
                        id: 'timeLine'
                    })
                } else {
                    $thisPanel.find('div.map h3').html(calculatedMapData.title+" - "+formatDateByPeriod(calculatedMapData.dates[val].dt.getTime(), calculatedMapData.period));
                }

            }
        });
        $thisPanel.find('.map-graph-selected').click(function(){ //graph selected regions and markers (selectRegions/selectMarkers must be true for this to work
            /* calcData contains the values for markers and regions in a JVMap friendly (which is not a MD series firnedly format.
             If only a single mapset or pointset has only one component, we can go back to that pointset/mapset's asset data.
             If more than one component, we need to assemble a graph obect with plots, plot.options.name, components, and assets.
             OK.  That is a lot of work, but is correct.  quickGraph will need to detect a graph object as it currently expects a series object.
             * */

            var selectedRegions = $map.getSelectedRegions();
            var selectedMarkers = $map.getSelectedMarkers();
            var grph = emptyGraph(), plt, formula;
            grph.plots =[];
            grph.title = 'from map of ' + oGraph.title;
            for(var i=0;i<selectedMarkers.length;i++){
                var compPattern = /[SU][0-9]+/g;
                var comps = selectedMarkers[i].match(compPattern);  //!!!!point markers must use the formula of series handles as their ID
                plt = {options:{}, components:[]};
                formula = selectedMarkers[i];
                for(var c=0;c<comps.length;c++){ //loops through the component for this marker
                    formula.replace(comps[c], String.fromCharCode("a".charAt(0)+c));  //make the formula
                    plt.components.push({options:{},handle: comps[c]});
                    //find asset:  either directly in assets or part of a point or mapset
                    if(oGraph.assets[comps[c]]){
                        grph.assets[comps[c]] = oGraph.assets[comps[c]]
                    } else {
                        for(var aHandle in oGraph.assets){
                            if(oGraph.assets[aHandle].data[comps[c]]){
                                grph.assets[comps[c]] = oGraph.assets[aHandle].data[comps[c]];
                                grph.assets[comps[c]].period = oGraph.assets[aHandle].period;
                                grph.assets[comps[c]].units = oGraph.assets[aHandle].units;
                                break;
                            }
                        }
                    }
                }
                plt.options.name = calculatedMapData.markers[selectedMarkers[i]].name;
                plt.options.formula = formula;
                grph.plots.push(plt);
            }
            //regions (mapsets) are simply than markers (pointsets) because there is only one
            if(oGraph.mapsets && oGraph.mapsets){  //skip if not mapset
                for(var i=0;i<selectedRegions.length;i++){
                    for(var dateSet in calculatedMapData.regionData){ //just need the first date set; break after checking for existence
                        if(calculatedMapData.regionData[dateSet][selectedRegions[i]]){  //make sure this region has data (for multi-component mapsets, all component must this regions data (or be a straight series) for this region to have calculatedMapData data
                            plt = $.extend(true, {}, oGraph.mapsets);
                            for(var j=0;j<plt.components.length;j++){
                                if(plt.components[j].handle.substr(0,1)=='M'){ //need to replace mapset with this region's series (note: no pointseets components allowed in multi-component a mapset)
                                    var mapAsset = oGraph.assets[plt.components[j].handle];
                                    var regionSeries = $.extend(true, {name: mapAsset.geoname, period: mapAsset.period, units: mapAsset.units, mapsetid:  plt.components[j].handle.substr(1)}, mapAsset.data[selectedRegions[i]]);
                                    plt.components[j].handle = regionSeries.handle; //swap the series for the mapset in the plot blueprint
                                    grph.assets[regionSeries.handle] = regionSeries; //add the series to the graph assets
                                } else {
                                    grph.assets[plt.components[j].handle] = $.extend(true, {}, oGraph.assets[plt.components[j].handle]);
                                }
                            }
                            grph.plots.push(plt);
                        }
                        break;
                    }
                }
            }
            if(grph.plots.length>0) quickGraph(grph, true);
        });
        var $play = $thisPanel.find('.map-play');
        var player;
        $play.click(function(){
            if($play.attr("title")=="play"){
                $play.button({text: false, icons: {primary: "ui-icon-pause"}}).attr("title","pause");
                if($slider.slider("value")==calculatedMapData.dates.length-1) $slider.slider("value",0);
                player = setInterval(function(){
                    $slider.slider("value",$slider.slider("value")+1);
                    if($slider.slider("value")==calculatedMapData.dates.length-1) {
                        clearInterval(player);
                        $play.button({text: false, icons: {primary: "ui-icon-play"}});
                    }
                }, 1000);
            } else {
                clearInterval(player);
                $play.button({text: false, icons: {primary: "ui-icon-play"}}).attr("title", "play");
            }
        }).button({text: false, icons: {primary: "ui-icon-play"}});
        if(oGraph.plots)
            $thisPanel.find('h3.map-title').hide();
        else
            $thisPanel.find('div.map h3').html(calculatedMapData.title+" - "+formatDateByPeriod(calculatedMapData.dates[val].dt.getTime(), calculatedMapData.period));  //initialize here ratehr than set slider value which would trigger a map redraw

        $thisPanel.find('.make-map').click(function(){
            calculatedMapData  = calcMap(oGraph);
            vectorMapSettings.markers =  calculatedMapData.markers;
            vectorMapSettings.series.regions[0].values = getMapDataByContainingDate(calculatedMapData.regionData,calculatedMapData.dates[val].s);
            vectorMapSettings.series.regions[0].min = calculatedMapData.regionDataMin;
            vectorMapSettings.series.regions[0].max = calculatedMapData.regionDataMax;
            vectorMapSettings.series.markers[0].values = getMapDataByContainingDate(calculatedMapData.markerData,calculatedMapData.dates[val].s);
            vectorMapSettings.series.markers[0].min = calculatedMapData.markerDataMin;
            vectorMapSettings.series.markers[0].max = calculatedMapData.markerDataMax;
            $map.removeAllMarkers();
            console.info(vectorMapSettings);
            //not sure if this is the best way to destroy and rebuild a map..
            $map.remove();
            $thisPanel.find('div.jvmap').html('').vectorMap(vectorMapSettings);
            $map = $thisPanel.find('div.jvmap').vectorMap('get', 'mapObject');
        });
    }
};




//PROVENANCE PANEL CREATOR AND HELPER FUNCTIONS
function provenance(){
    var panelId, $tab, $prov, grph, i, j, plotList, mapList, componentHandle, plot, plotColor, okcancel;
    panelId = visiblePanelId();
    $tab = $('#'+panelId);
    $prov =  $tab.find('.provenance').show(); //compensation for margins @ 15px + borders
    grph = oPanelGraphs[panelId];
    okcancel = '<button onclick="provClose(this)" style="float:right;margin-right: 50px;">cancel</button> <button onclick="provOk(this)" style="float:right;">ok</button><br>';
    mapList = provenanceOfMap(grph);
    plotList = '';
    if(grph.plots) plotList = '<div class="chart-plots">Chart:<ol class="plots">';

    for(i=0;i<grph.plots.length;i++){
        //outer PLOT loop
        plot = grph.plots[i];
        if(plot.options.lineWidth) plot.options.lineWidth = parseInt(plot.options.lineWidth); else plot.options.lineWidth = 2;
        if(!plot.options.lineStyle) plot.options.lineStyle = 'Solid';
        plotColor = plot.options.lineColor||oHighCharts[panelId].get('P'+i).color;
        plotList += '<li class="plot ui-state-highlight">'
             + '<button class="edit-plot" style="float:right;">edit <span class="ui-icon ui-icon-arrowthickstop-1-s" style="display: inline-block;"> edit</span></button>'
             + '<div class="line-sample" style="padding:0;margin:0 10px 10px 0;display:inline-block;border-width:0;background-color:'+plotColor+';height:'+plot.options.lineWidth+'px;width:38px;"><img src="images/'+plot.options.lineStyle+'.png" height="'+plot.options.lineWidth+'px" width="'+plot.options.lineWidth*38+'px"></div>'
             + '<div class="plot-info" style="display:inline-block;"><span class="plot-title">'+plotName(grph, plot)+'</span> in ' + plotUnits(grph, plot) + ' ' + plotPeriodicity(grph, plot)+'</div>'
             + '<ul class="components" style="list-style-type: none;">';
        for(j=0;j< plot.components.length;j++){
            //inner COMPONENT SERIES loop
            //TODO: add op icon and order by (+,-,*,/)
            componentHandle = plot.components[j].handle;
            if(plot.components[j].op==null)plot.components[j].op="+";

            plotList += '<li class="component ui-state-default" data="'+ componentHandle + '">'
                + String.fromCharCode('a'.charCodeAt(0)+j) + ' '  //all series use lcase variables; ucase indicate a vector compnent such as a pointset or mapset
                + '<span class="plot-op ui-icon ' + opUI[plot.components[j].op] + '">operation</span> '
                + grph.assets[componentHandle].name + '</li>';
        }
        plotList +=   '</ul>';
        plotList += '</li>';
    }
    plotList += '</ol>'
             +  '<ul class="blank-plot components" style=""><li class="not-sortable">Drag and drop to plot lines to reorder them.  Drag and drop multiple series into a plot to create sums and ratios. Drag a series here to create a new plot line.  Double click on any series or plot line to edit its properties.</i></li></ul></div>';
    $prov.html(okcancel + plotList + mapList);
    grph.plotsEdits = $.extend(true, {}, grph.plots);  //this is the copy that the provenance panel will work with.  Will replace grph.plots on "OK"
    $prov.find(".components").sortable({
        containment: $prov.get(0),
        connectWith: ".components",
        axis: "y",
        delay: 150,   //in ms to prevent accidentally drags
        update: function(event, ui){ componentMoved(ui)}
        /* receive: function(event, ui){alert("received")},
         remove: function(event, ui) {alert("removed")}*/
    }).disableSelection();
    $prov.find("li.plot").click(function(evt){
        if(!evt.isPropagationStopped()){
            evt.stopPropagation();
            //alert("showPlotEditor(this");
        }
    });
    $prov.find("li.component").click(function(evt){
        if(!evt.isPropagationStopped()){
            evt.stopPropagation();
            //alert("showComponentEditor(this");
        }
    });
    $prov.find(".edit-comp").click(function(){
    });
    $prov.find(".edit-plot").click(function(){
        var $liPlot = $(this).closest("li");
        showPlotEditor($liPlot);
        $liPlot.find("li.component").each(function(){
            showComponentEditor(this);
        });
    });
    $prov.find(".plots").sortable({
        axis: "y", dropOnEmpty: false}).disableSelection();
}
function plotName(oGraph, plot){
    var handle, comp, c, calcName='';
    if(typeof(plot.options.name) != "undefined"){
        return plot.options.name;
    } else {
        //calculate from components
        for(c=0;c<plot.components.length;c++){  //application requirements:  (1) array is sorted by op (2) + and - op have common units
            comp = plot.components[c];
            handle = comp.handle;
            if(c!=0||(comp.options.op!='+' && !comp.options.op)) calcName += comp.options.op;
            calcName +=oGraph.assets[handle].name;
        }
        return calcName;
    }
}
function plotUnits(oGraph, plot){
    var sHandle, comp, seriesUnits;
    if(typeof(plot.options.calcUnits) == "undefined"){
        //calculate from series
        plot.options.calcUnits='';
        for(var c=0;c<plot.components.length;c++){  //application requirements:  (1) array is sorted by op (2) + and - op have common units
            comp = plot.components[c];
            sHandle = comp.handle;
            //TODO: nominator / denominator cancellations & user formula
            if(c==0 ||(comp.options.op=='*' ||comp.options.op=='/')){
                if(c>0) plot.options.calcUnits +=' ';
                seriesUnits = (typeof(comp.options.userUnits)!="undefined")?comp.options.userUnits:oGraph.assets[sHandle].units;
                if(comp.op=='/'){
                    plot.options.calcUnits+='per ' + seriesUnits;
                } else {
                    plot.options.calcUnits+= seriesUnits;
                }
            }
        }
    }
    if(typeof(plot.options.userUnits) == "undefined") {
        return '<span class="plot-units">'+ plot.options.calcUnits +'</span>';
    } else {
        return '<span class="plot-units">'+ plot.options.userUnits +'</span> <span class="plot-units-conversion">= '+ plot.options.k +' * ' + plot.options.calcUnits + '</span>';
    }
}
function plotPeriodicity(oGraph, plot){
    var sHandle, comp, fromPeriodicity;
    if(plot.components[0].options.downshiftPeriod){
        fromPeriodicity = plot.components[0].options.downshiftPeriod;
    } else {
        fromPeriodicity = oGraph.assets[plot.components[0].handle].period;
    }
    if(typeof(plot.options.downshiftPeriod) == "undefined"){
        return '<span class="plot-freq">'+periodName[fromPeriodicity]+'</span>';
    } else {
        return '<span class="plot-freq">'+periodName[plot.options.downshiftPeriod]+'</span> <span class="plot-from-freq">'+plot.options.downshiftMethod+' down from '+periodName[fromPeriodicity]+'</span>';
    }
}
function provenanceOfMap(grph){
    var provHTML = "", c, p, plt, componentHandle, isSet;
    if(grph.map&&(grph.mapsets||grph.pointsets)){ //map!!
        provHTML = '<div class="map-prov"><h3>Map of '+ grph.map +'</h3>';
        if(grph.mapsets){
            provHTML += '<div class="mapset">Mapset (regions)'
            + '<ol class="mapsets">'
            + '<li class="mapset ui-state-highlight">'
            + '<button class="edit-mapset" style="float:right;">edit <span class="ui-icon ui-icon-arrowthickstop-1-s" style="display: inline-block;"> edit</span></button>'
            + '<div class="color min" style="padding:0;margin:0;border: thin black solid; height: 10px; width: 10px;display:inline-block;background-color:'+ (grph.mapsets.options.minColor||'#C8EEFF') +';"></div> to '
            + '<div class="color max" style="padding:0;margin:0;border: thin black solid; height: 10px; width: 10px;display:inline-block;background-color:'+ (grph.mapsets.options.maxColor||'#0071A4') +';"></div>'
            + '<div class="plot-info" style="display:inline-block;"><span class="plot-title">'
            + plotName(grph, grph.mapsets)+'</span> in ' + (grph.mapsets.options.units||plotUnits(grph, grph.mapsets)) + ' ' + (grph.mapsets.options.period||plotPeriodicity(grph, grph.mapsets))+'</div>';

            provHTML += '<ol class="map-comp components" style="list-style-type: none;>';
            for(c=0;c<grph.mapsets.components.length;c++){
                componentHandle = grph.mapsets.components[c].handle;
                isSet = componentHandle.substr(0,1)=='M';
                provHTML += '<li class="component ui-state-default" data="'+ componentHandle + '">'
                    + String.fromCharCode((isSet?'A':'a').charCodeAt(0)+c) + ' '  //all series use lcase variables; ucase indicate a vector compnent such as a pointset or mapset
                    + '<span class="plot-op ui-icon ' + opUI[grph.mapsets.components[c].options.op||'+'] + '">operation</span> '
                    + grph.assets[componentHandle].name + '</li>';
            }
            provHTML += '</ol>'
                + '</ol>'
            + '</div>'; //close mapset
        }
        if(grph.pointsets){
            provHTML += '<div class="pointsets">Pointsets (location markers)<ol class="pointsets">';
            for(p=0;p<grph.pointsets.length;p++){
                pntset = grph.pointsets[p];
                provHTML += '<li class="pointset ui-state-highlight">'
                + '<button class="edit-pointset" style="float:right;">edit <span class="ui-icon ui-icon-arrowthickstop-1-s" style="display: inline-block;"> edit</span></button>'
                + '<div class="plot-info" style="display:inline-block;"><span class="plot-title">'
                + plotName(grph, pntset)+'</span> in ' + (pntset.options.units||plotUnits(grph, pntset)) + ' ' + (pntset.options.period||plotPeriodicity(grph, pntset))+'</div>'
                + '<ol class="point-comp components">';
                for(c=0;c<pntset.components.length;c++){
                    componentHandle = pntset.components[c].handle;
                    isSet = (/[XM]/).test(componentHandle);
                    provHTML += '<li class="component ui-state-default" data="'+ componentHandle  + '">'
                        + String.fromCharCode((isSet?'A':'a').charCodeAt(0)+c) + ' '  //all series use lcase variables; ucase indicate a vector compnent such as a pointset or mapset
                        + '<span class="plot-op ui-icon ' + opUI[pntset.components[c].options.op||'+'] + '">operation</span> '
                        + grph.assets[componentHandle].name + '</li>';
                }
                provHTML += '</ol></li>';
            }
            provHTML += '</ol></div>';
        }
        provHTML += '</div>'
    }
    return provHTML;
}
//TODO: FIX  componentMoved !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
function componentMoved(ui){  //triggered when an item is move between lists or sorted within.  Note that moving between plot lists triggers two calls
    //first find out whether a sort or a move, and whether that move empty or created a new component.
    var oGraph, $targetSeriesList, pFromHandle, fromIndex, pTargetHandle, sHandle, newPlotLi;
    var $prov = ui.item.closest(".provenance");
    if(ui.sender!=null){    // handle everything in the sorting call
        //is series already in here?  if not add
        sHandle = ui.item.attr('data');
        pFromHandle = ui.item.attr('plot');
        oGraph = oPanelGraphs[visiblePanelId()];
        fromIndex = getComponentIndex(oGraph.plotsEdits[pFromHandle], sHandle);
        $targetSeriesList = ui.item.closest("ol.components");
        if($targetSeriesList.hasClass("blank-plot")){
            //NEW!! series was dragged onto new plot landing area:  need to create new blank plot object, provide handle, and create new li/ul structure
            pTargetHandle = 'P' + (newPlotsIndex--);
            var newPlotName;
            if(oGraph.plotsEdits[pFromHandle].components[fromIndex].options.newName){
                newPlotName = oGraph.plotsEdits[pFromHandle].components[fromIndex].options.newName;
            } else {
                newPlotName = oGraph.assets[sHandle].name;
            }
            $newPlotLi = $('<li class="plot ui-state-highlight" data="' + pTargetHandle
                + '">'+ newPlotName +'<ul class="components ui-sortable" style="list-style-type: none;" data="' + pTargetHandle
                + '"><li class="component ui-state-default" data="'+sHandle+'" plot="'+ pTargetHandle +'">'+ ui.item.html() +'</li></ul></li>');
            $newPlotLi.find("." + opUI["/"] + ", ." + opUI["*"]).attr("class","plot-op ui-icon " + opUI["+"]);

            $prov.find("ol.plots").append($newPlotLi);
            //remove the body hanging out on the lower landing pad
            ui.item.remove();
            //insert an empty plot object that will get filled out of the end of this function
            oGraph.plotsEdits[pTargetHandle]={components: [],name: null,options: {}};
            //make sure the new items are sortable
            //.sortable(destroy);
            $prov.find(".components").sortable({
                connectWith: ".components",
                axis: "y",
                update: function(event, ui){ componentMoved(ui)}
            }).disableSelection();
            $prov.find(".plots").sortable({
                axis: "y",
                dropOnEmpty: false}).disableSelection();
        } else {
            pTargetHandle =  ui.item.closest("li.plot").attr('data');
            if($targetSeriesList.find("li[data='"+sHandle+"']").length>1||pTargetHandle==pFromHandle){  //cancel move if duplicate
                ui.item.closest(".provenance").find(".components[data='"+ pFromHandle +"']").sortable('cancel'); //do nothing else
                return;
            }
            //1.  it's a move so check to see operation / units for compatibility (all + or - op series must have matching units (either native or transformed)
            var incomingOp, incomingUnits, thisUnits, thisOp, thisHandle;
            incomingOp = oGraph.plotsEdits[pFromHandle].components[fromIndex].op;
            if(incomingOp == null || incomingOp=='+'||incomingOp=='-'){
                if(oGraph.plotsEdits[pFromHandle].components[fromIndex].options.newUnits){
                    incomingUnits = oGraph.plotsEdits[pFromHandle][sHandle].options.newUnits;
                } else {
                    incomingUnits = oGraph.assets[sHandle].units;
                }
                $targetSeriesList.find("li[data!='"+sHandle+"']").each(function(){
                    thisHandle = $(this).attr('data');
                    thisIndex = getComponentIndex(oGraph.plotsEdits[pTargetHandle], thisHandle);
                    thisOp = oGraph.plotsEdits[pTargetHandle].components[thisIndex].op;
                    if(thisOp == null || thisOp=='+' || thisOp=='-'){
                        if(oGraph.plotsEdits[pTargetHandle].components[thisIndex].options.newUnits){
                            thisUnits = oGraph.plotsEdits[pTargetHandle].components[thisIndex].options.newUnits;
                        } else {
                            thisUnits = oGraph.assets[thisHandle].units;
                        }
                        if(thisUnits!=incomingUnits){  //Problem!!!  resolve by changing op to '/'
                            oGraph.plotsEdits[pFromHandle].components[fromIndex].op='/';
                            ui.item.find(".plot-op").attr("class", "plot-op ui-icon op-divide");
                            //TODO: modify sprite to include a ".op-divide"; using "ui-icon-arrowthick-2-ne-sw" for now
                        }
                    }
                });
            }
            //2. reset plot attribute of the moved item
            ui.item.attr("plot",pTargetHandle);
        }
        //3. move component
        oGraph.plotsEdits[pTargetHandle].components.push(oGraph.plotsEdits[pFromHandle].components[fromIndex]);
        //4. delete from source
        oGraph.plotsEdits[pFromHandle].components.splice(fromIndex,1);
        //5. check to see if source if empty and kill if need be
        if(oGraph.plotsEdits[pFromHandle].components.length==0){
            delete oGraph.plotsEdits[pFromHandle];
            $prov.find("li.plot[data='"+ pFromHandle +"']").remove();
        }
        sortSeriesUlByOp($targetSeriesList);
    }
}
function getComponentIndex(plot, handle){
    for(var i= 0;i<plot.components.length;i++){
        if(plot.components[i].handle==handle) return i;
    }
    return null;
}
function sortSeriesUlByOp($list){

}
function provOk(btn){//save change to graph object and rechart
//TODO: save and rechart
    var grph = oPanelGraphs[visiblePanelId()];
    grph.plots = grph.plotsEdits;
    var $panel= $(btn).closest("div.graph-panel");
    provClose(btn);
    $panel.find(".graph-type").change();  //trigger redaw
}
function provClose(btn){ //called directly from cancel btn = close without saving
    var grph = oPanelGraphs[visiblePanelId()];
    delete grph.plotsEdits;
    var $prov = $(btn).closest(".provenance");
    $prov.find("ol, ul").sortable("destroy");
    $prov.closest('div.graph-panel').find('.graph-nav-graph').click();
}
function sortComponentsByOp(comp){
    comp.sort(function(a,b){
        if(!a.op)a.op="+";
        if(!b.op)b.op="+";
        return opValues[a.op]-opValues[b.op];
    })
}
function sortComponentsList(olComponents, oPlots){
    var $olComponents = $(olComponents);
    var plotIndex =  $olComponents.closest('li.plot').index();
    sortComponentsByOp(oPlots[plotIndex].components);
    for(var i=0;i<oPlots[plotIndex].components.length;i++){
        if($olComponents.find("li[data='"+ oPlots[plotIndex].components[i].handle +"']").index()!=i){
            $olComponents.find("li[data='"+ oPlots[plotIndex].components[i].handle +"']").insertBefore($ul.find("li:eg("+i+")"));
        }
    }
}
function showComponentEditor(liComp){
    var $liComp = $(liComp);
    var grph = oPanelGraphs[panelIdContaining(liComp)];
    var plotsEdits = grph.plotsEdits;
    var compHandle = $(liComp).attr('data');
    var plotIndex = $(liComp).closest('li.plot').index();
    var iComp = getComponentIndex(plotsEdits[plotIndex], compHandle); //could have just gotten index of liComp as the object should be in sync
    var components = plotsEdits[plotIndex].components;
    var component = components[iComp];
    //$liComp.find(".edit-comp").hide();
    var editDiv = '<div class="comp-editor" style="display: none;">'
        /*        + '<span class="edit-label">operation:</span><ul class="comp-op selectable">'
         +       '<li data="+" class="ui-widget-content"><span class="ui-icon op-addition"></span> add</li>'
         +       '<li data="-" class="ui-widget-content"><span class="ui-icon op-subtraction"></span> subtract</li>'
         +       '<li data="*" class="ui-widget-content"><span class="ui-icon op-multiply"></span> multiple summed series</li>'
         +       '<li data="/" class="ui-widget-content"><span class="ui-icon op-divide"></span> divide summed series</li>'
         + '</ul>'*/
        + '<div class="op">'
        +       '<input type="radio" data="+"  id="op-addition" name="op-radio" /><label for="op-addition"><span class="ui-icon op-addition"></span> add</label>'
        +       '<input type="radio" data="-"  id="op-subtraction" name="op-radio" checked="checked" /><label for="op-subtraction"><span class="ui-icon op-subtraction"></span> subtract</label>'
        +       '<input type="radio" data="*"  id="op-multiply" name="op-radio" /><label for="op-multiply"><span class="ui-icon op-multiply"></span> multiple summed series</label>'
        +       '<input type="radio" data="/"  id="op-divide" name="op-radio" /><label for="op-divide"><span class="ui-icon op-divide"></span> divide summed series</label>'
        + '</div>'
        + '<span class="edit-label">units:</span><br />'
        + '<span class="edit-label">frequency:</span>'
        //+ '<button class="comp-close prov-float-btn">close</button>'
        + '<button class="comp-copy prov-float-btn">make copy</button>'
        + '<button class="comp-delete prov-float-btn" style="background-color: #FF0000;">delete</button>'
        + '</div>';
    var $editDiv = $(editDiv);
    //$editDiv.find("li[data='"+component.op+"']").attr('checked','checked');
    $editDiv.find("div.op").buttonset().find("input[data='"+component.op+"']").attr('checked','checked');
    //$liComp.closest("div.provenance").find("button.plot-close, button.comp-close").click();  //close any open comp editors
    $editDiv.appendTo($liComp).slideDown();  //add the new comp editor and animate it open
    //add UI events
    $editDiv.find("ul.comp-op li").click(function(){
        $editDiv.find("li.selected").removeClass("selected");
        component.op = $(this).closest("li").addClass("selected").attr('data');
        $editDiv.closest("span.plot-op").attr("class","plot-op ui-icon " + opUI[component.op]);
    });
    $editDiv.find(".comp-delete").click(function(){
        components.splice(iComp,1);
        $liComp.remove();
    });
    $editDiv.find(".comp-copy").click(function(){
        var pTargetHandle = 'P' + (newPlotsIndex--);
        oPanelGraphs[panelIdContaining(liPlot)].plotsEdits[pTargetHandle] = {name: null, options: {}, components: [$.extend(true, {},component, {op: '+'})]};
        var name = grph.assets[compHandle].name;
        //todo:  creating the string / object should be a function
        var $newPlot = $('<li>'+ name + '<ul class="components" data="'+compHandle+'" plot="'+pTargetHandle+'"><li class="component"  data="'+compHandle+'" plot="'+pTargetHandle+'"></li></ul></li>');
        $liComp.closest("ol.plots").append($newPlot);
    });
    $editDiv.find(".comp-close").click(function(evt){
        sortComponentsList($liComp.closest("ul"), plotsEdits);
        $liComp.find(".comp-editor").slideUp("default",function(){ $liComp.find(".comp-editor").remove()});
        $liComp.find(".edit-comp").show();
    });
}
function showPlotEditor(liPlot){
    var $liPlot = $(liPlot);
    var oPlot = oPanelGraphs[panelIdContaining(liPlot)].plotsEdits[$liPlot.index()];
    var plotColor = oPlot.options.lineColor||oHighCharts[visiblePanelId()].get('P' + $liPlot.index()).color;
    $liPlot.find(".edit-plot, .plot-info").hide();
    //line thickness selector
    var selectThickness='<select class="plot-thickness">';
    for(var t=1;t<=5;t++) selectThickness+='<option>'+t+'px</option>';
    selectThickness += '</select>';
    //line style (solid, dots, dash...) selector
    var selectStyle = '<select class="plot-linestyle">';
    for(var ds=0;ds<dashStyles.length;ds++) selectStyle += '<option value="' +dashStyles[ds].replace(/ /g,'')+ '">' +dashStyles[ds].toLowerCase()+ '</option>';
    selectStyle += '</select>';

    var editDiv = '<div class="plot-editor" style="display: none;">'
        + '<button class="plot-close prov-float-btn">close</button>'
        + '<button class="plot-copy prov-float-btn">make copy</button>'
        + '<button class="plot-delete prov-float-btn" style="background-color: #FF0000;">delete</button>'
        + '<fieldset class="edit-line" style="padding: 0 5px;display:inline-block;"><legend>color, thickness, &amp; style</legend>'
        + ' <div style="display:inline-block;"><input class="plot-color" type="text" value="' + (oPlot.options.lineColor|| plotColor) + '" /></div>' + selectThickness + selectStyle
        + '</fieldset>'
        + '<span style="margin:0 10px">name:</span><input class="plot-name" type="text" value="'+((oPlot.name==null)?'':oPlot.name)+'" /><br />'
        + '<span class="edit-label">display as:</span><select class="plot-type"><option value="">graph default</option><option value="line">line</option><option value="column">column</option><option value="area">stacked area</option></select><br />'
        + ((oPlot.components.length>1)?'<span class="edit-label">missing points:</span><br />':'')
        + '<span class="edit-label">units:</span><br />'
        + '<span class="edit-label">component math:</span><div class="edit-math">'
        +  '<input type="radio" id="required" name="comp-math" /><label for="required">all series values required</label>'
        +  '<input type="radio" id="missingAsZero" name="comp-math" /><label for="missingAsZero">treat missing values as zeros in sums</label>'
        +  '<input type="radio" id="nullsMissingAsZero" name="comp-math" /><label for="nullsMissingAsZero">treat missing and null values as zeros in sums</label></div><br />'
        + '<span class="edit-label">line breaks:</span><div class="edit-breaks">'
        +  '<input type="radio" id="nulls" name="line-break" /><label for="nulls">on nulls</label>'
        +  '<input type="radio" id="missing" name="line-break" /><label for="missing">on missing value and nulls</label>'
        +  '<input type="radio" id="never" name="line-break" /><label for="never">never</label></div><br />'
        + '</div>';
    var $editDiv = $(editDiv);    //instantiate the editor
    $liPlot.closest("div.provenance").find("button.plot-close, button.comp-close").click();  //close any open
    $editDiv.find(".plot-name").val(oPlot.name).change(function(){
        oPlot.name = $(this).val();
    });
    if(!oPlot.options.componentData)oPlot.options.componentData='required'
    $editDiv.find("div.edit-math").find("input[id='"+oPlot.options.componentData+"']").attr('checked','checked').end().buttonset().change(function(){
        oPlot.options.componentData = $(this).find(".ui-state-active").attr("for");
    });
    if(!oPlot.options.breaks)oPlot.options.breaks='nulls'
    $editDiv.find("div.edit-breaks").find("input[id='"+oPlot.options.breaks+"']").attr('checked','checked').end().buttonset().change(function(){
        oPlot.options.breaks = $(this).find(".ui-state-active").attr("for");
    });
    $editDiv.find(".edit-line legend").after($liPlot.find(".line-sample").hide().clone().css("display","inline-block").show());
    $editDiv.find("input.plot-color").colorPicker().change(function(){
        oPlot.options.lineColor = $(this).val();
        $liPlot.find("div.line-sample").css('background-color',oPlot.options.lineColor);
    });
    $editDiv.find("select.plot-thickness").val(oPlot.options.lineWidth).change(function(){
        oPlot.options.lineWidth = $(this).val();
        $liPlot.find("div.line-sample").css("height",oPlot.options.lineWidth).find("img").css("height",oPlot.options.lineWidth).css("width",(parseInt(oPlot.options.lineWidth.substr(0,1)*38)+'px'))
    });
    $editDiv.find("select.plot-linestyle").val(oPlot.options.lineStyle).change(function(){
        oPlot.options.lineStyle = $(this).val();
        $liPlot.find("div.line-sample img").attr("src","images/"+oPlot.options.lineStyle+'.png');
    });
    $editDiv.find("select.plot-type").val(oPlot.options.type).change(function(){
        oPlot.options.type = $(this).val();
    });
    $editDiv.prependTo($liPlot).slideDown();
    $editDiv.find(".plot-delete").click(function(){
        delete oPlot;
        $liPlot.remove();
    });
    $editDiv.find(".plot-copy").click(function(){
        oPanelGraphs[panelIdContaining(liPlot)].plotsEdits.push($.extend(true,{},oPlot));
        var $newPlot = $liPlot.clone();
        $newPlot.remove(".plot-editor");  //.find("li.plot").attr('data', pTargetHandle).find("ol, li.component").attr("plot", pTargetHandle);
        $liPlot.closest("ol.plots").append($newPlot);
    });
    $editDiv.find(".plot-close").click(function(){
        $liPlot.find(".plot-editor").slideUp("default",function(){ $liPlot.find(".plot-editor").remove()});
        $liPlot.find(".edit-plot").show();
    });
}












function panelIdContaining(cntl){  //uniform way of getting ID of active panel for user events
    var visPan = $(cntl).closest('div.graph-panel:visible');
    if(visPan.length==1){
        return visPan.get(0).id;
    } else {
        return null;
    }
}

function exportChart(type){
    var panelID = visiblePanelId();
    if(oPanelGraphs[panelID].map){
        downloadMap(panelID, type);
    } else {
        var thisChart = oHighCharts[panelID];
        annoSync();
        thisChart.exportChart({type: type});
    }
}


//This object performs all of the task associated with editing and setting the chart title
var graphTitle = {
    show: function(oTitle){
        $('.showTitleEditor').click();
        var thisPanelID = $(oTitle).closest('div.graph-panel').get(0).id;
        /*
         $(oTitle).closest('div.highcharts-container').prepend('<div class="title-editor" style="position:absolute;z-index:100;border:thin solid black;background-color:white;left:0px;top:0px;margin:20px;width:90%;"><input type="text"><input type="text" name="title" value="'
         + oPanelGraphs[thisPanelID].title + '" /> <button onclick="graphTitle.changeOk(this)">OK</button> <button onclick="graphTitle.changeCancel(this)">cancel</button></div>');
         */

        $('#titleEditor input').attr('data',thisPanelID).val(oPanelGraphs[thisPanelID].title);
        $("#fancybox-wrap").stop().css({
            'top': '55px',
            'left': '50px'
        });
        $('#titleEditor input').css("width","450px").focus();
        //oHighCharts[thisPanelID].setTitle({text: ' '});
    },
    changeOk: function(){
        var thisPanelID =  $('#titleEditor input').attr('data');
        oPanelGraphs[thisPanelID].title = $('#titleEditor input').val();
        if(oPanelGraphs[thisPanelID].title.length==0){
            oHighCharts[thisPanelID].setTitle({text: 'untitled - click to edit', style: {color: 'grey', font: 'italic'}});
            var untitledTitle = "Graph " +  thisPanelID.substr(thisPanelID.indexOf('-')+1);
            $('ul#graph-tabs a[href=\'#'+ thisPanelID +'\']').attr('title',untitledTitle).html(untitledTitle);
        } else {
            oHighCharts[thisPanelID].setTitle({text: oPanelGraphs[thisPanelID].title, style: {color: 'black', font: 'normal'}});
            $('ul#graph-tabs a[href=\'#'+ thisPanelID +'\']').attr('title',oPanelGraphs[thisPanelID].title).html(oPanelGraphs[thisPanelID].title);
        }
        $('#' + thisPanelID + ' .highcharts-title').click(function(){graphTitle.show(this)});
        this.changeCancel();
    },
    changeCancel: function(){
        $.fancybox.close();
    }
};
//HELPER FUNCTIONS
function visiblePanelId(){  //uniform way of getting ID of active panel for user events
    var visPan = $('div.graph-panel:visible');
    if(visPan.length==1){
        return visPan.get(0).id;
    } else {
        return null;
    }
}
function periodWidth(period){
    switch(period){
        case "N":
            return 1;
        case "D":
            return 24*3600*1000;
        case "W":
            return 7*24*3600*1000;
        case "M":
            return 30*24*3600*1000;
        case 'Q':
            return 3*30*24*3600*1000;
        case 'SA':
            return 365*24*3600*1000/2;
        case "A":
            return 365*24*3600*1000;
        default:
            return null
    }
}
function UTCFromReadableDate(dateString){
    var dt = new Date(dateString + " UTC");  //this should work for year, month, day, and hours
    if(dt.toString()!="NaN")return dt;
    var pat = /^W[0-5]{0-1}[0-9]{1}\s[0-9]{4}/i;
    if(pat.test(dateString)){
        dt = new Date(parseInt(dateString.substr(3))+' UTC');
        return dt.setUTCMonth((parseInt(dateString.charAt(1))-1)*3);
    }
    //quarter?
    var pat = /^Q[1-4]{1}\s[0-9]{4}/i;
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
function trim(str){ //removes extra whitespace inside the string and from the ends
    var trimmed = str.replace(/\s+/, ' ').match(/\b.+\b/);
    if(trimmed===null) return "";
    else return trimmed[0];
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
function formatDateByPeriod(val, period) { //helper function for the data tables
    if(isNaN(val)==false) {
        var dt = new Date(parseInt(val));
        switch(period){
            case 'A': return dt.getUTCFullYear();
            case 'Q': return ('Q'+ parseInt((dt.getUTCMonth()+3)/3) +' '+ dt.getUTCFullYear());
            case 'SA':
            case 'M': return dt.toUTCString().substr(8,8);
            case 'W':
            case 'D': return dt.toUTCString().substr(5,11);
            default: return dt.toUTCString().substr(5,20);
        }
    }
    else
    {
        return null;
    }
}

//TODO: wrap the annotations functions and variables in an anonymous object
var bandNo = 0;
var lineNo = 0;
var banding = false;
var bandStartPoint;
var colorsPlotBands = ['aaaaaa', 'ffaaaa', 'aaffaa', 'aaaaff'];
$(document).ready(function(){
    require(["/global/js/highcharts/js/highcharts.2.2.5.src.js","/global/js/colorpicker/jquery.colorPicker.js","/global/js/jvectormap/jquery-jvectormap-1.1.1.min.js"], function(){
        require(["/global/js/highcharts/js/modules/exporting.2.1.6.src.js"]);
        $.fn.colorPicker.defaults.colors.splice(-1,0,hcColors, colorsPlotBands);
        Highcharts.setOptions({
            tooltip: {
                formatter: function(){  //shorten the data accord to period; add commas to number; show units
                    var tooltip = formatDateByPeriod(this.point.x, this.series.options.period) + '<br>'
                        + this.series.name + ':<br>'
                        + Highcharts.numberFormat(this.y,'','.',',') + ' ' + this.series.yAxis.options.title.text;
                    return tooltip;
                }
            }
        });
    });
});

//ANNOTATION CODE
function addStandardAnnotation(annoid){
    callApi({command: "GetAnnotation", annoid: annoid}, function(data){
        var panelId = visiblePanelId();
        standardAnno = jQuery.parseJSON(data.annotation);
        for(var i=0;i<standardAnno.length;i++){
            oPanelGraphs[panelId].annotations.push(standardAnno[i]);
        }
        buildAnnotations(panelId, 'new');
    });
}
function annoSync(){  //sync plot lines and bands to options.  must be done prior to printing or exporting
    var thisChart = oHighCharts[visiblePanelId()];
    var axis = thisChart.options.xAxis,
        plotLines = (axis.plotLines = []),
        plotBands = (axis.plotBands = []);
    var anno;
    for(var i=0;i<thisChart.xAxis[0].plotLinesAndBands.length;i++){
        anno = thisChart.xAxis[0].plotLinesAndBands[i];
        if(anno.id.substr(0,1)=='xb'){
            plotBands.push(anno.options)
        } else {
            plotLines.push(anno.options)
        }
    }
}
function XXXclickHCSeries(evt){
    if(banding){
        banding = false;  //band was already drawn in the mouseOver event
        bandNo++;
        var panelId = visiblePanelId();
        oPanelGraphs[panelId].annotations.push({
            type:	'band',
            text: 	'',
            id: 'xb' + bandNo,
            color: 	'#'+colorsPlotBands[0],
            from: 	formatDateByPeriod(bandStartPoint.x,bandStartPoint.series.options.period),
            to: formatDateByPeriod(evt.point.x, evt.point.series.options.period)
        });
        buildAnnotations(panelId,'none');  //redraw the annotation table only
    } else {
        if(standardAnnotations.length==0){
            callApi({command: "GetAnnotations"}, function(results){
                standardAnnotations = results.annotations;
                for(var i=0;i<standardAnnotations.length;i++){
                    $("div#annotationMenu table").append('<tr style="margin: 5px 0px;"><td><a style="cursor: pointer;" onclick="addStandardAnnotation('+standardAnnotations[i].annoid+')" title="'+standardAnnotations[i].description+'">'+standardAnnotations[i].name+'</a></td></tr>');
                }
            });
        }
        var x = evt.pageX-20;  // account for fancybox padding divs
        var y = evt.pageY-20;
        $('.showAnnotationMenu').click();
        $("#fancybox-wrap").stop().css({
            'top': y +'px',
            'left': x + 'px'
        });
        evt.point.select(true);
    }
}
function mouseOverHCPoint(e, point){
    var chart = oHighCharts[visiblePanelId()];
    if(banding=='x-Time'){
        try{
            chart.xAxis[0].removePlotBand('xb'+bandNo);
        }catch(err){}
        chart.xAxis[0].addPlotBand({
            from:  bandStartPoint.x,
            to: point.x,
            color:  makeRGBA(colorsPlotBands[0]),
            id: 'xb' + bandNo,
            label:  {text: ' ', y: 0, zIndex: 3}
        });
    }
}
function annotatePoint(selectedPoint){
    var panelId = visiblePanelId();
    var oGraph = oPanelGraphs[panelId];
    if(typeof(selectedPoint) != "undefined"){
        //remove all current point annotations
        var point;
        for(var i=0;i<oGraph.annotations.length;i++){
            if(oGraph.annotations[i].type=='point'){
                point = oHighCharts[panelId].get(oGraph.annotations[i].id);
                if(point){point.update([point.x, point.y], false)}
                delete oGraph.annotations[i].id
            }
        }
        //add annotation to oGraph object
        oGraph.annotations.push({
            type:	'point',
            text: 	'',
            id: null, //gets reordered and set in buildAnnotations
            series: selectedPoint.series.options.id,
            color: 	'#000000',
            from: 	formatDateByPeriod(selectedPoint.x,selectedPoint.series.options.period)
        });
        // redraw the point annotations in order and entire annotations table
        buildAnnotations(panelId,'point');
    }
}
function annotateXLine(selectedPoint){
    var panelId = visiblePanelId();
    var oGraph = oPanelGraphs[panelId];
    oHighCharts[panelId].xAxis[0].addPlotLine({
        value:  selectedPoint.x,
        color:  '#'+colorsPlotBands[0],
        id: 'xl' + lineNo,
        width: 2,
        label: {text: ' ', y: 0, zIndex: 3}
    });
    oGraph.annotations.push({
        type:	'line',
        text: 	'',
        id: 'xl' + lineNo,
        color: 	colorsPlotBands[0],
        from: 	formatDateByPeriod(selectedPoint.x,selectedPoint.series.options.period)
    });
    lineNo++;
    buildAnnotations(panelId,'table-only');
}
function annotateXBandStart(pointSelected){
    var panelId = visiblePanelId();
    var oGraph = oPanelGraphs[panelId];
    bandStartPoint = pointSelected;
    oHighCharts[panelId].xAxis[0].addPlotBand({
        from:  bandStartPoint.x,
        to: bandStartPoint.x,
        color:  makeRGBA(colorsPlotBands[0]),
        id: 'xb' + bandNo,
        label: {text: ' ', y: 0, zIndex: 3}
    });
    banding = 'x-Time';
}
function annotationY(chart, anno){
    var yStart = 10;
    var yInc = 20;
    var annoMargin = 0.20;  // 20% of graph width
    if(anno.text==" "||anno.text==" ") return 0;
    var plotLinesAndBands = chart.xAxis[0].plotLinesAndBands;
    var extremes = chart.xAxis[0].getExtremes();
    var minSeparation = (extremes.max-extremes.min) * annoMargin;
    var annoCenter;
    var overlappingAnnos = [];
    if(anno.to){
        annoCenter = (annoDateParse(anno.from) + annoDateParse(anno.to))/2;
    } else {
        annoCenter = annoDateParse(anno.from);
    }
    var overlaps = 0;
    for(var i=0;i<plotLinesAndBands.length;i++){
        var thisCenter;
        if(plotLinesAndBands[i].options.to){
            thisCenter = (plotLinesAndBands[i].options.from + plotLinesAndBands[i].options.to)/2;
        } else {
            thisCenter = plotLinesAndBands[i].options.from;
        }
        if(plotLinesAndBands[i].options.label.text.length>0 && (Math.abs(thisCenter-annoCenter) < minSeparation)){
            overlaps++;
            overlappingAnnos.push(plotLinesAndBands[i]);
        }
    }
    var y = yStart;
    for(var j=0;j<overlappingAnnos.length;j++){ //make sure there is no existing annotation in this y-space
        if(overlappingAnnos[j].options.label.y == y){
            y += yInc;
            j = -1;  //restarts the loops
        }
    }
    return y;
}
function buildAnnotations(panelId, redrawAnnoTypes){
    if($('div#' + panelId + ' table.annotations').html().length!=0) { //enable on all calls except initial build
        $('div#' + panelId + ' .graph-save').button("enable");
        oPanelGraphs[panelId].isDirty = true;
    }
    if(!redrawAnnoTypes) redrawAnnoTypes='all';
    var oGraph = oPanelGraphs[panelId];
// builds and return a fresh annotations table HTML string from oGraph
    var sTable = '';
    var annoLetter = 'A';
    var i, anno, point, annoSeries, annoScatter;
    var scatterData = {};
    for(i=0;i<oHighCharts[panelId].yAxis.length;i++){
        scatterData['labelsY-'+i] = [];
    }
    //make a sorted list of annotations by start date
    oGraph.annotations.sort(function(a,b){
        if(a.type.charAt(0)=='h' && a.type.charAt(0)=='h')return b.from - a.from;
        if(a.type.charAt(0)=='h') return -1;
        if(b.type.charAt(0)=='h') return 1;
        return annoDateParse(a.from) - annoDateParse(b.from)
    });
    for(i=0;i< oGraph.annotations.length;i++){
        anno = oGraph.annotations[i];
        switch(anno.type){
            case 'point':
                if(redrawAnnoTypes=='point'||redrawAnnoTypes=='all'){
                    annoSeries = oHighCharts[panelId].get(anno.series);
                    if(annoSeries==null){//cut anno out if we can't find it's reference series
                        oGraph.annotations.splice(i,1);
                        i--;
                        break;
                    }
                    annoScatter =  oHighCharts[panelId].get('labelsY-' + annoSeries.options.yAxis);
                    for(var j=0;j<annoSeries.data.length;j++){
                        if(annoSeries.data[j] ){  //prevent errors on cropped graphs
                            if(annoSeries.data[j].x == annoDateParse(anno.from)){
                                point = annoSeries.data[j];
                                scatterData['labelsY-' + annoSeries.options.yAxis].push({
                                    x: point.x,
                                    y: point.y,
                                    id: annoLetter,
                                    marker: {
                                        fillColor: anno.color,
                                        lineColor: anno.color,
                                        radius: 8,
                                        symbol: 'circle',
                                        enabled: true,
                                        'states': {
                                            hover: {
                                                enabled: true,
                                                marker: {
                                                    enabled: true,
                                                    fillColor: anno.color,
                                                    lineColor: anno.color,
                                                    radius: 8
                                                }
                                            }
                                        }
                                    }
                                });
                            }
                        }
                    }
                    anno.id =  annoLetter;
                }
                sTable+='<tr data="' + annoLetter + '"><td align="center"><b>'+annoLetter+'</b></td><td>'+anno.from+'</td><td><input class="anno-text" type="text" value="'+anno.text+'"></td><td><a class="ui-icon ui-icon-trash">delete</a></td></tr>'
                annoLetter=String.fromCharCode(annoLetter.charCodeAt(0)+1);
                break;
            case 'line':
                if(redrawAnnoTypes=='line'||redrawAnnoTypes=='all'||(redrawAnnoTypes=='new'&&!anno.id)){
                    anno.id ='xl' + lineNo;
                    lineNo++;
                    var yOffset = annotationY(oHighCharts[panelId], anno);
                    oHighCharts[panelId].xAxis[0].addPlotLine({
                        color: anno.color,
                        value: annoDateParse(anno.from),
                        id: anno.id,
                        width: 2,
                        label: {text: anno.text, y: yOffset, zIndex: 3}
                    });
                }
                sTable+='<tr data="' + anno.id + '"><td><input class="annotation-color-picker" type="text" value="' + anno.color + '" /></td><td>'+anno.from+'</td><td><input class="anno-text" type="text" value="'+anno.text+'"></td><td><a class="ui-icon ui-icon-trash">delete</a></td></tr>';

                break;
            case 'hline':
                if(redrawAnnoTypes=='hline'||redrawAnnoTypes=='all'||(redrawAnnoTypes=='new'&&!anno.id)){
                    anno.id ='hl' + lineNo;
                    lineNo++;
                    //var yOffset = annotationY(oHighCharts[panelId], anno);
                    for(var y=0;y<oHighCharts[panelId].yAxis.length;y++){
                        if(oHighCharts[panelId].yAxis[y].userOptions.title.text==anno.yAxis){
                            oHighCharts[panelId].yAxis[y].addPlotLine({
                                color: anno.color,
                                value: anno.from,
                                id: anno.id,
                                width: 2,
                                label: {text: anno.text, zIndex: 3}
                            });
                        }
                    }
                }
                sTable+='<tr data="' + anno.id + '"><td><input class="annotation-color-picker" type="text" value="' + anno.color + '" /></td><td>'+anno.from + ' ' + anno.yAxis + '</td><td><input class="anno-text" type="text" value="'+anno.text+'"></td><td><a class="ui-icon ui-icon-trash">delete</a></td></tr>';
                break;
            case 'band':
                if(redrawAnnoTypes=='band'||redrawAnnoTypes=='all'||(redrawAnnoTypes=='new'&&!anno.id)){
                    anno.id ='xb' + bandNo;
                    bandNo++;
                    var yOffset = annotationY(oHighCharts[panelId], anno);
                    oHighCharts[panelId].xAxis[0].addPlotBand({
                        color: makeRGBA(anno.color),
                        from: annoDateParse(anno.from),
                        to: annoDateParse(anno.to),
                        id: anno.id,
                        label: {text: anno.text, y: yOffset, zIndex: 3}
                    });
                }
                sTable+='<tr data="' + anno.id + '"><td><input class="annotation-color-picker" type="text" value="' + anno.color + '" /></td><td>'+anno.from+'-'+anno.to+'</td><td><input class="anno-text" type="text" value="'+anno.text+'"></td><td><a class="ui-icon ui-icon-trash">delete</a></td></tr>';
                break;
            case 'hband':
                if(redrawAnnoTypes=='hband'||redrawAnnoTypes=='all'||(redrawAnnoTypes=='new'&&!anno.id)){
                    anno.id ='hb' + bandNo;
                    bandNo++;
                    for(var y=0;y<oHighCharts[panelId].yAxis.length;y++){
                        if(oHighCharts[panelId].yAxis[y].userOptions.title.text==anno.yAxis){
                            oHighCharts[panelId].yAxis[y].addPlotBand({
                                color: makeRGBA(anno.color),
                                from: anno.from,
                                to: anno.to,
                                id: anno.id,
                                label: {text: anno.text, zIndex: 3}
                            });
                        }
                    }
                }
                sTable+='<tr data="' + anno.id + '"><td><input class="annotation-color-picker" type="text" value="' + anno.color + '" /></td><td>'+anno.from+'-'+anno.to+' '+anno.yAxis+'</td><td><input class="anno-text" type="text" value="'+anno.text+'"></td><td><a class="ui-icon ui-icon-trash">delete</a></td></tr>';
                break;
        }
    }
    if(redrawAnnoTypes=='point'||redrawAnnoTypes=='all'){
        for(var key in scatterData){   //replace the scatter series makers all at once, but don't redraw
            oHighCharts[panelId].get(key).setData(scatterData[key], false);
        }
        oHighCharts[panelId].redraw(); //redraw after all have been updated
    }
    if(oGraph.annotations.length==0){sTable+='<tr><td colspan="3" style="font-style:italic;color:aaaaaa#">right-click on the chart to annotate a point, a band, or an event</td></tr>'};
    $('div#' + panelId + ' table.annotations').html(sTable).find('input, select').change(function(){changeAnno(this)});
    $('div#' + panelId + ' .annotation-color-picker').colorPicker();
    $('div#' + panelId + ' table.annotations a.ui-icon-trash').click(function(){deleteAnno(this)});
}
function annoDateParse(partialDateString){
    if(partialDateString.length==4){partialDateString = '1 Jan ' + partialDateString + ' UTC'}
    else if(partialDateString.length==8){partialDateString = '1 ' + partialDateString + ' UTC'}
    else {partialDateString += ' UTC'}
    return Date.parse(partialDateString);
}
function deleteAnno(deleteAnchor){
    var id = $(deleteAnchor).closest('tr').attr('data');
    var panelId = $(deleteAnchor).closest('div.graph-panel').attr('id');
    var oGraph = oPanelGraphs[panelId];
    for(var i=0;i< oGraph.annotations.length;i++){
        if(id == oGraph.annotations[i].id){
            oGraph.annotations.splice(i,1);
            break;
        }
    }
    oHighCharts[panelId]=chartPanel(deleteAnchor);
    buildAnnotations(panelId);
}
function makeRGBA(hexColor){
    var r, g, b, a;
    a = 0.5;
    if(hexColor.substr(0,1)=='#')hexColor=hexColor.substr(1);  //get rid of any potential # prefix
    r = gun(parseInt(hexColor.substr(0,2),16),a);
    g = gun(parseInt(hexColor.substr(2,2),16),a);
    b = gun(parseInt(hexColor.substr(4,2),16),a);
    if(r>0&&g>0&&b>0){
        return 'rgba(' + r +','+  g +','+  b +','+a+')';
    } else {
        return 'rgb(' + parseInt(hexColor.substr(0,2),16) +','+  parseInt(hexColor.substr(2,2),16) +','+  parseInt(hexColor.substr(4,2),16) +')';
    }
}
function gun(desired, alpha){
    return  parseInt(desired/alpha - (1-alpha)*255/alpha);
}
function changeAnno(obj){
    var id = $(obj).closest('tr').attr('data');
    var panelId = $(obj).closest('div.graph-panel').attr('id');
    var oGraph = oPanelGraphs[panelId];
    var anno;
    for(var i=0;i< oGraph.annotations.length;i++){
        if(id == oGraph.annotations[i].id){
            anno = oGraph.annotations[i];
            break;
        }
    }
    anno.text = $(obj).closest('tr').find('input.anno-text').val();
    anno.color = $(obj).closest('tr').find('.annotation-color-picker').val();
    switch(id.substr(0,2)){
        case 'xb':
            var yOffset = annotationY(oHighCharts[panelId], anno);
            oHighCharts[panelId].xAxis[0].removePlotBand(id);
            oHighCharts[panelId].xAxis[0].addPlotBand({
                color: makeRGBA(anno.color),
                from: annoDateParse(anno.from),
                to: annoDateParse(anno.to),
                id: anno.id,
                label: {text: anno.text, y: yOffset, zIndex: 3}
            });
            break;
        case 'hb':
            for(var i=0;i<oHighCharts[panelId].yAxis.length;i++){
                if(oHighCharts[panelId].yAxis[i].userOptions.title.text = anno.yAxis){
                    oHighCharts[panelId].yAxis[0].removePlotBand(id);
                    oHighCharts[panelId].yAxis[0].addPlotBand({
                        color: makeRGBA(anno.color),
                        from: parseFloat(anno.from),
                        to: parseFloat(anno.to),
                        id: anno.id,
                        label: {text: anno.text, zIndex: 3}
                    });
                }
            }
            break;
        case 'hl':
            for(var i=0;i<oHighCharts[panelId].yAxis.length;i++){
                if(oHighCharts[panelId].yAxis[i].userOptions.title.text = anno.yAxis){
                    oHighCharts[panelId].yAxis[0].removePlotLine(id);
                    oHighCharts[panelId].yAxis[0].addPlotLine({
                        color: anno.color,
                        value: parseFloat(anno.from),
                        id: anno.id,
                        width: 2,
                        label: {text: anno.text, zIndex: 3}
                    });
                }
            }
            break;
        case 'xl':
            var yOffset = annotationY(oHighCharts[panelId], anno);
            oHighCharts[panelId].xAxis[0].removePlotLine(id);
            oHighCharts[panelId].xAxis[0].addPlotLine({
                color: anno.color,
                value: annoDateParse(anno.from),
                id: anno.id,
                width: 2,
                label: {text: anno.text, y: yOffset, zIndex: 3}
            });
    }
}
