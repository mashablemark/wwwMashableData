//GLOBAL VARIABLES mce

var MAP_COLORS = {POS: '#0071A4', NEG: '#FF0000', MID: '#CCCCCC'};
var DEFAULT_RADIUS_SCALE = 20; //(px) used for both bubble maps and marker maps
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
var primeColors=['#008000', '#FF0000','#0000FF', '#FFFF00', '#FF9900', '#00FFFF', '#FF0000'];  //green, red, blue, yellow, orange, azure, lime green
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
var period = {
    value:  { //used to determine rank and to set column widths
        N: 1000, //one second
        D: 24*3600*1000,
        W: 7*24*3600*1000,
        M: 30*24*3600*1000,
        Q: 365/4*24*3600*1000,
        SA: 365/2*24*3600*1000,
        A: 365*24*3600*1000
    },
    name: {
        N: 'non period data',
        D: 'daily',
        W: 'weekly',
        M: 'monthly',
        Q: 'quarterly',
        SA: 'semiannual',
        A: 'annual'
    },
    units: {
        'N': "non-periodic data",
        'D': "day",
        'W': "week",
        'M': "month",
        'Q': "quarter",
        'SA': "half-year",
        'A': "year"
    }
};
var oPanelGraphs = {}; //MyGraph objects by panelID allows easy access to oMyCharts
var oHighCharts = {}; //highchart objects by panelID
var op = {
    "value": {"+":1,"-":2,"*":3,"/":4},
    "cssClass": {"+":"op-addition","-":"op-subtraction","*":"op-multiply","/":"op-divide"}
};
var mapBackground = '#AAAAAA';
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
var vectorPattern = /[SU]/;   //series or userseries handle test
var handlePattern = /[MXSU]\d+/g;
var patVariable = /(\b[A-Z]{1,2}\b)/g;  //used to search and replace formulaa to use a passed in values object
var SVGNS = "http://www.w3.org/2000/svg";
var isIE = /msie/i.test(navigator.userAgent) && !window.opera;

if(typeof console == 'undefined') console = {info: function(m){}, log: function(m){}};  //allow console.log call without triggering errors in IE or FireFox w/o Firebug


function    chartPanel(panel, annotations){  //MAIN CHART OBJECT, CHART PANEL, AND MAP FUNCTION CODE
    console.time('chartPanel');
//panel can either be a DOM node anywhere is the panel or a panelID
    var panelId = typeof panel == 'string'?panel:$(panel).closest('div.graph-panel').get(0).id;
    if(oHighCharts[panelId]) {
        oHighCharts[panelId].destroy();
        $.contextMenu('destroy', '#' + panelId + ' div.chart');
    }
    var oGraph = oPanelGraphs[panelId];
    var chart;
    console.time('makeChartOptionsObject');
    var oChartOptions = makeChartOptionsObject(oPanelGraphs[panelId]);
    console.timeEnd('makeChartOptionsObject');
    var $chart = $('#' + panelId + ' div.chart');
    if(oChartOptions.series.length==0){
        $chart.hide();
        return void 0;
    }
    $chart.show().height();
    //final additions to the HC Chart Object
    oChartOptions.chart.renderTo = $chart.get(0);
    oChartOptions.plotOptions.series.point = {
        events: {
            mouseOver: function(evt) {
                annotations.mouseoverPoint = this;
                annotations.mouseOverHCPoint(evt, this);
            },
            mouseOut: function(evt) {
                delete annotations.mouseoverPoint;
            },
            click: function(evt){
                if(annotations.banding){
                    annotations.endBanding(evt);
                } else {
                    setMapDate(this.x);
                } //value only available during chart's click event:  need point click for full coverage
            }
        }
    };
    oChartOptions.chart.events={
        click:   function(e) {
            if(annotations.banding){
                annotations.endBanding(e);
            } else {
                setMapDate(e.xAxis[0].value);
            } //value only available during chart's click event:  need point click for full coverage
        },
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
        }
    };
    console.time('highcharts');
    chart = new Highcharts.Chart(oChartOptions);
    console.timeEnd('highcharts');
    oHighCharts[panelId] = chart;
    annotations.plotAllLinearRegressions();
    //for a highcharts div mouseover event that translates to X and Y axis coordinates:  http://highslide.com/forum/viewtopic.php?f=9&t=10204
    $chart
        .mouseover(function(e){
            if(annotations.banding){
                if(annotations.banding.substr(0,2)=='y-'){
                    var top = $(chart.container).offset().top,
                        left = $(chart.container).offset().left;
                    var x = (isIE ? e.originalEvent.x : e.clientX - left) - chart.plotLeft,
                        y = (isIE ? e.originalEvent.y : e.pageY - top) - chart.plotTop;
                    if(y >= 0 && y <= chart.plotSizeY ) {
                        for(var i=0;i<chart.yAxis.length;i++){
                            if(chart.yAxis[i].userOptions.title.text == annotations.banding.substr(2)){
                                var axisValue =  chart.yAxis[i].translate(chart.plotHeight-y, true);
                                chart.yAxis[i].removePlotBand('hb'+annotations.bandNo);
                                chart.yAxis[i].addPlotBand({
                                    id: 'hb'+annotations.bandNo,
                                    color: equivalentRGBA(colorsPlotBands[0], BAND_TRANSPARENCY),
                                    from: parseFloat(annotations.bandStartPoint),
                                    to: axisValue,
                                    label: {text: '', zIndex: 3}
                                });
                            }
                        }
                    }
                }
            }
        })
        .keydown(function(e){
            if(annotations.banding && e){
                for(var a=0;a<oHighCharts[panelId].axes.length;a++){
                    chart.axes[a].removePlotLine(annotations.banding);  //does not error if not found
                    chart.axes[a].removePlotBand(annotations.banding);
                }
                annotations.banding = false;
            }
        });

    console.time('contextMenu');
    $.contextMenu({
        selector: '#' + panelId + ' div.chart',
        build: function($trigger, e) {  //menu is built or cancelled dynamically in build function startin on the following line
            var i, x, y, top, left;
            var axisName, axisValue, isRegression;
            var pointSelected = annotations.mouseoverPoint;  //grab reference (set by a HighCharts' event) before point's mouseout event can delete it
            var onPoint = (typeof(annotations.mouseoverPoint)!="undefined");
            if(annotations.banding){ // false if not actively x or y banding
                return annotations.endBanding(e);
            } else {
                var mnu = {
                    items: {
                        point: {name: "annotate point",
                            disabled: !onPoint,
                            callback: function(key, opt){ annotations.addPoint(pointSelected) }
                        },
                        "sep0": "---------",
                        vline: {name: "add vertical line",
                            disabled: !onPoint,
                            callback: function(key, opt){ annotations.addXLine(pointSelected) }
                        },
                        vband: {name: "start vertical band",
                            disabled: !onPoint,
                            callback: function(key, opt){ annotations.startXBand(pointSelected); }
                        },
                        "sep1": "---------",
                        hline: {name: "add horizontal line", items:{} },
                        hband: {name: "start horizontal band", items:{} },
                        "sep2": "---------",
                        regression: {name: "start linear regression",
                            disabled: !onPoint,
                            callback: function(key, opt){
                                if(!isRegression){
                                    annotations.startLinearRegression(pointSelected);
                                } else {
                                    annotations.deleteRegression(pointSelected);
                                }
                            }
                        },
                        //rolling: {name: "add rolling average", disabled: !onPoint, items: {}},  //add choices depending on periodicity
                        standard: {name: "add standard annotations", items: {}}
                    }
                };
                if(onPoint && pointSelected.series.options.regression) {
                    mnu.items.regression.name = "delete linear regression";
                    isRegression = true
                }
                top = $(chart.container).offset().top;
                left = $(chart.container).offset().left;
                x = (isIE ? e.originalEvent.x : e.clientX - left) - chart.plotLeft;
                y = (isIE ? e.originalEvent.y : e.pageY - top) - chart.plotTop;
                if(y >= 0 && y <= chart.plotSizeY ) {
                    for(i=0;i<chart.yAxis.length;i++){
                        axisName = chart.yAxis[i].userOptions.title.text;
                        axisValue =  parseFloat(parseFloat(chart.yAxis[i].translate(chart.plotHeight-y, true).toPrecision(2))) ;
                        mnu.items.hline.items['hltext'+i] = {name: '<b>'+ axisName + ':</b>', type: 'text', value: axisValue};
                        mnu.items.hline.items['hladd'+i] = {
                            name: '<button>add</button>',
                            callback: function(key, opt){
                                var value = parseFloat($.contextMenu.getInputValues(opt)['hltext'+key.substr(5)]);
                                var id = 'hl' + annotations.lineNo++;
                                chart.yAxis[parseInt(key.substr(5))].addPlotLine({
                                    id: id,
                                    color: '#FF0000',
                                    width: 2,
                                    value: value
                                });
                                oGraph.annotations.push({
                                    id: id,
                                    type: 'hline',
                                    color: '#FF0000',
                                    from:  value,
                                    yAxis: chart.yAxis[parseInt(key.substr(5))].userOptions.title.text,
                                    text: ''
                                });
                                annotations.build('table-only');
                            }
                        };

                        mnu.items.hband.items['hbtext'+i] = {name: '<b>'+ axisName + ':</b>', type: 'text', value: axisValue};
                        mnu.items.hband.items['hbadd'+i] = {
                            name: '<button>start</button>',
                            callback: function(key, opt){
                                //START AN HBAND
                                annotations.bandStartPoint = parseFloat($.contextMenu.getInputValues(opt)['hbtext'+key.substr(5)]);
                                annotations.banding = 'y-'+chart.yAxis[key.substr(5)].userOptions.title.text;
                                chart.yAxis[parseInt(key.substr(5))].addPlotBand({
                                    id: 'hb'+annotations.bandNo++,
                                    color: equivalentRGBA(colorsPlotBands[0], BAND_TRANSPARENCY),
                                    from: annotations.bandStartPoint,
                                    to: annotations.bandStartPoint
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
                //standard annos
                for(i=0;i<annotations.standards.length;i++){
                    mnu.items.standard.items["SA"+annotations.standards[i].annoid] = {
                        name: annotations.standards[i].name,
                        callback: function(key, opt){
                            annotations.addStandard(parseInt(key.substr(2)));
                        }
                    }
                }
                return mnu;
            }
        }
    });
    console.timeEnd('contextMenu');
    $('#' + panelId + ' .highcharts-title').click(function(){graphTitle.show(this)});

    console.timeEnd('chartPanel');
    return chart;

    function setMapDate(jsDateClicked){
        if(oGraph.mapsets || oGraph.pointsets){
            var jsDate = closestDate(jsDateClicked, oGraph.calculatedMapData.dates);
            for(var i=0;i<oGraph.calculatedMapData.dates.length;i++){
                if(oGraph.calculatedMapData.dates[i]['dt'].getTime()==jsDate){
                    $('#' + panelId + ' .slider').slider('value',i);
                }
            }
        }
    }

}
function intervalStartDt(graph){
    var dt =  new Date(parseInt(graph.lastdt));
    switch (graph.largestPeriod){
        case 'A':
            return dt.setUTCFullYear(dt.getUTCFullYear() - (graph.intervals -1));
        case 'SA':
            return dt.setUTCMonth(dt.getUTCMonth()-(graph.intervals-1)*6);
        case 'Q':
            return dt.setUTCMonth(dt.getUTCMonth()-(graph.intervals-1)*3);
        case 'M':
            return dt.setUTCMonth(dt.getUTCMonth()-(graph.intervals-1));
        case 'W':
            return dt.setUTCDate(dt.getUTCDate()-(graph.intervals-1)*7);
        default:
            return dt.setUTCDate(dt.getUTCDate()-(graph.intervals-1));
    }
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

    $('#' + panelId + ' span.interval-crop-period').html(period.units[oGraph.largestPeriod]+'s');
    $('#' + panelId + ' div.crop-slider')
        .slider("option", "max", chartOptions.x.length-1)
        .slider("option", "values", [leftIndex, rightIndex]);
}

function dateFromMdDate(mddt){  //eliminate periodicity input
    var udt;
    udt = new Date('1/1/' + mddt.substr(0,4) + ' UTC'); //language & region independent
    if(mddt.length>4){
        switch(mddt.substr(4,1)){
            case 'Q':
                udt.setUTCMonth((mddt.substr(5,1)-1)*3);
                break;
            case 'H':
                udt.setUTCMonth((mddt.substr(5,1)-1)*6);
                break;
            default:
                udt.setUTCMonth(mddt.substr(4,2));
        }
        if(mddt.length>6){
            udt.setUTCDate(mddt.substr(6,2));
            if(mddt.length>8){
                udt.setUTCHours(mddt.substr(9,2));
                udt.setUTCMinutes(mddt.substr(12,2));
                udt.setUTCSeconds(mddt.substr(15,2));
            }
        }
    }
    return udt
}


function closestDate(nearbyDate, seriesData, closestYet){
    var x;
    for(var i=0;i<seriesData.length;i++){
        if(Array.isArray(seriesData[i])){
            x = seriesData[i][0]
        } else {
            if(seriesData[i].dt) {
                x = seriesData[i].dt.getTime();
            } else {
                x = seriesData[i].x;
            }
        }
        if(Math.abs(nearbyDate-x)<Math.abs(nearbyDate-closestYet) || closestYet===undefined) closestYet = x;
    }
    return closestYet;
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
function createMyGraph(id, onComplete){ //id can either be a graph id (int) or a ghash
    var mdGraph = oMyGraphs['G' + id];
    if(mdGraph){
        createGraph();
    } else {
        for(gid in oMyGraphs){ //check to check if this is one of my graphs
            if(oMyGraphs[gid].ghash==id){
                mdGraph = oMyGraphs[gid];
                break;
            }
        }
        if(mdGraph) {
            createGraph();
        } else {
            callApi({command: 'GetPublicGraph', ghash: id},
                function(oReturn, textStatus, jqXH){
                    for(var ghandle in oReturn.graphs){
                        mdGraph = oReturn.graphs[ghandle]
                        delete mdGraph.gid;  //user must save a copy as their own
                        inflateGraph(mdGraph);
                        createGraph();
                    }
                }
            );
        }
    }
    function createGraph(){
        var fileAssets = graphScriptFiles.concat(mdGraph.mapFile?['js/maps/'+ mdGraph.mapFile +'.js']:[]);  //get the map too if needed
        require(fileAssets); //parallel load while getting db assets
        getAssets(mdGraph, function(){
            require(fileAssets, function(){
                buildGraphPanel($.extend(true, {}, mdGraph));  //panelId not passed -> new panel
                if(onComplete) onComplete();
            });
        });
    }
}


function emptyGraph(){
    return  {
        annotations: [],
        title: '',
        type: 'auto',
        assets: {},
        analysis: null,
        mapconfig: {},
        start: null,
        end: null,
        published: 'N'
    };
}
function makeChartOptionsObject(oGraph){
    console.time('makeChartOptionsObject');
    var i, j, dt, allX = {};
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
                    y:9,
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
            min: (oGraph.start===null)?(oGraph.intervals?intervalStartDt(oGraph):null):parseInt(oGraph.start),
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
            period: oSerie.period,
            data: oSerie.data,
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
        for(j=0;j<oSerie.data.length;j++){
            allX[oSerie.data[j][0].toString()] = true;
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
    for(i=0;i<jschart.yAxis.length;i++){
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
                oSerie = jschart.series[i];
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
            //jschart.yAxis.min = 0;
            jschart.chart.type = 'column';
            break;
        case "area-percent":
            jschart.yAxis[0].title.text = 'percent';
            jschart.plotOptions.area.stacking="percent";
        case "area":
            jschart.chart.type = "area";
            break;
        case "auto":
            if(oGraph.smallestPeriod!=oGraph.largestPeriod ){
                for(i=0;i<jschart.series.length;i++){
                    if(oGraph.largestPeriod == jschart.series[i].period){  //only convert the largest to column (ie. if monthly + quarterly + annual, only annual data become columns) or very short series
                        jschart.series[i].type = 'column';
                        jschart.series[i].zIndex = 8;
                        jschart.series[i].pointRange = period.value[jschart.series[i].period];
                        jschart.series[i].pointPlacement = 'between';
                        jschart.series[i].pointPadding = 0; //default 0.1
                        jschart.series[i].groupPadding = 0.05; //default 0.2
                    }
                }
            } else {  //all periodicities the same; see if we have very short series
                var maxCount = 0, onscreenCount;
                for(i=0;i<jschart.series.length;i++){
                    if(jschart.series[i].period){  //scatter series used for annotations does not have a period property = skip these
                        onscreenCount = 0;
                        for(j=0;j<jschart.series[i].data.length;j++){
                            dt = jschart.series[i].data[j][0];
                            if((!jschart.xAxis.min || jschart.xAxis.min<=dt) && (!jschart.xAxis.max || jschart.xAxis.max>=dt)) onscreenCount++;
                        }
                        maxCount = Math.max(maxCount, onscreenCount);
                    }
                }
                if(maxCount<=5) jschart.chart.type = 'column';
                /*{
                 for(i=0;i<jschart.series.length;i++) jschart.series[i].type = 'column';
                 }*/
            }
            break;
        case "logarithmic":
            for(i=0;i<jschart.yAxis.length;i++){jschart.yAxis[i].type='logarithmic'}
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
        jschart.chart.x.push(Number(key));
    }
    jschart.chart.x.sort(function(a,b){return parseInt(a)-parseInt(b)});
    console.timeEnd('makeChartOptionsObject');
    return jschart
}
function createSerieFromPlot(oGraph, plotIndex){
    console.time('createSerieFromPlot');
    var valuesObject, y, components, i, j, sHandle, plot, calculatedSeries, data, point, plotData=[], dateKey, oComponentData = {};
    //TODO: this is stub code for a single series plot.  Vector math and transform code to be added
    plot = oGraph.plots[plotIndex];
    calculatedSeries = {name: plotName(oGraph,plot), units: plotUnits(oGraph, plot)};
    components = plot.components;

    //note freq in a plot must be the same, either natively or through transformations
    calculatedSeries.period = components[0].options.transformedPeriod || oGraph.assets[components[0].handle].period;
    plot.formula = plotFormula(plot);

    /*    if(components.length==1 && ((components[0].options.k||1)==1) && (components[0].options.op=='+' || components[0].options.op=='*')){ //short cut for straight plots
     calculatedSeries.data = oGraph.assets[components[0].handle].data;
     } else {*/
    //THE BRAINS:
    var expression = 'return ' + plot.formula.formula.replace(patVariable,'values.$1') + ';';
    var compute = new Function('values', expression);

    //1. rearrange series data into single object by date keys
    var compSymbols = [], symbol;
    for(i=0;i<components.length;i++ ){
        symbol = compSymbol(i);
        compSymbols.push(symbol); //calculate once and use as lookup below
        //TODO: apply series transforms / down shifting here instead of just parroting series data
        data = oGraph.assets[components[i].handle].data.split("||");
        for(j=0; j<data.length; j++){
            point = data[j].split("|");
            if(!oComponentData[point[0].toString()]){
                oComponentData[point[0].toString()] = {};
            }
            oComponentData[point[0].toString()][symbol] = point[1];
        }
    }
    //2. calculate value for each date key (= grouped points)
    var required = !plot.options.componentData || plot.options.componentData=='required';
    var missingAsZero =  plot.options.componentData=='missingAsZero';
    var nullsMissingAsZero =  plot.options.componentData=='nullsMissingAsZero';

    var breakNever = !plot.options.breaks || plot.options.breaks=='never';
    var breakNulls = plot.options.breaks=='nulls';
    var breakMissing = plot.options.breaks=='missing';

    for(dateKey in oComponentData){
        valuesObject = {};
        y = true;
        for(i=0;i<compSymbols.length;i++ ){
            if(!isNaN(oComponentData[dateKey][compSymbols[i]])){
                valuesObject[compSymbols[i]] = parseFloat(oComponentData[dateKey][compSymbols[i]]);
            } else {
                if(oComponentData[dateKey][compSymbols[i]]=='null'){
                    if(nullsMissingAsZero){
                        valuesObject[compSymbols[i]] = 0;
                    } else {
                        y = null;
                        break;
                    }
                } else {
                    if(required) {
                        y = null;
                        break;
                    } else {
                        valuesObject[compSymbols[i]] = 0;
                    }
                }
            }
        }
        if(y) {
            try{
                y = compute(valuesObject);
                if(Math.abs(y)==Infinity || isNaN(y)) y=null;
            } catch(err){
                y = null;
            }
        }
        if(y!==null || !breakNever){
            plotData.push([Date.parse(dateFromMdDate(dateKey)), y]);
        }
    }
    //3. reconstruct an ordered MD data array
    plotData.sort(function(a,b){return a[0]-b[0];});
    calculatedSeries.data = plotData;
    /*    }*/
    if(breakMissing){
        //todo:  break on missing code
    }
    console.timeEnd('createSerieFromPlot');
    return calculatedSeries;
}
function plotFormula(plot){//returns a formula object for display and eval
    var cmp, variable, isDenom = false, inDivision=false, numFormula='', denomFormula='', term='', formula=''
    var patMultiterm = /[+-/*]+/;
    for(var i=0;i<plot.components.length;i++){
        cmp = plot.components[i];
        //variable  = (cmp.handle.match(/MX/))?String.fromCharCode('A'.charCodeAt(0)+i):variable = String.fromCharCode('a'.charCodeAt(0)+i);
        variable  = compSymbol(i);
        if(!isDenom && cmp.options.dn && cmp.options.dn=='d'){ //first denom component causes all following components forced to denom even if their flag is nto set
            if(inDivision){
                inDivision = false;
                if(patMultiterm.test(term)) term = '(' + term + ')';
                formula += term;
            }
            numFormula = formula;
            formula = '';
            isDenom = true;
        }
        if(formula.length==0){
            switch(cmp.options.op){
                case '/':
                    inDivision = true;
                    term = subTerm();
                    formula = '1/';
                    break;
                case '-':
                    formula = '-'+subTerm();
                    break;
                case '+':
                case '*':
                default:
                    formula = subTerm();
            }
        } else {
            switch(cmp.options.op){
                case "+":
                case '-':
                    if(inDivision){
                        inDivision = false;
                        if(patMultiterm.test(term)) term = '(' + term + ')';
                        formula += term + ' ' + cmp.options.op + ' ' + subTerm();
                    } else {
                        formula += ' ' + cmp.options.op + ' ' + subTerm();
                    }
                    break;
                case '*':
                    if(inDivision){
                        term += '*' + subTerm();
                    } else {
                        formula += '*' + subTerm();
                    }
                    break;
                case '/':
                    if(inDivision){
                        term += '*' + subTerm();
                    } else {
                        inDivision = true;
                        formula += "/";
                        term = subTerm();
                    }
            }
        }
    }
    if(inDivision){
        inDivision = false;
        if(patMultiterm.test(term)) term = '(' + term + ')';
        formula += term;
    }
    if(isDenom){
        denomFormula = formula
    } else {
        numFormula = formula;
    }
    if((plot.options.k||1)==1){
        formula = (numFormula==''?1:numFormula) + (denomFormula==''?'':(patMultiterm.test(denomFormula)?' / ('+ denomFormula + ')':'/' + denomFormula));
    } else {
        formula = (numFormula==''?plot.options.k: plot.options.k+' * ('+numFormula+')') + (denomFormula==''?'':(patMultiterm.test(denomFormula)?' / ('+ denomFormula + ')':'/' + denomFormula));
    }
    plot.options.calculatedFormula = {
        formula: formula,
        denomFormula: denomFormula,
        numFormula: numFormula,
        k: plot.options.k||1
    };
    return plot.options.calculatedFormula;

    function subTerm(){return (isNaN(cmp.options.k)||cmp.options.k==1)?variable:cmp.options.k+'*' + variable;}
}
function compSymbol(compIndex){ //handles up to 26^2 = 676 symbols.  Proper would be to recurse, but current function will work in practical terms
    var symbol='';
    if(compIndex>25){
        symbol = String.fromCharCode('A'.charCodeAt(0)+parseInt(compIndex/26));
    }
    symbol += String.fromCharCode('A'.charCodeAt(0)+(compIndex%26));
    return symbol;
}
function makeDataGrid(panelId, type, mapData){  //create tables in data tab of data behind the chart, the map regions, and the map markers
    var hasMap, hasChart, m, r, i, p, c, plot, component, d, row, compData, serie, jsdt, mdPoint, mdDate;
    var oGraph = oPanelGraphs[panelId];
    var assets = oGraph.assets;
    var vals, transposedRegionData = {}, regionCode, region, dt, regions = [], period;
    if(oGraph.plots){
        var chart = oHighCharts[panelId];
        hasChart = true;
    } else {
        hasChart = false;
    }
    if(oGraph.map){
        hasMap = true;
        var $map = $('#' + panelId + ' .jvmap').vectorMap('get', 'mapObject');
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

    switch(type){

//CHART
        case 'chart':

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
                    makeSquare();
                    compData = component.data.split('||');
                    for(d=0;d<compData.length;d++){
                        mdPoint = compData[d].split('|');
                        jsdt = dateFromMdDate( mdPoint[0]);
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
                    makeSquare();
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
            break;
//REGIONS
        case 'regions':
            period = mapData.period;
            for(dt in mapData.regionData){
                for(regionCode in mapData.regionData[dt]){
                    regions.push({"regionCode": regionCode, "name": $map.getRegionName(regionCode)});
                }
                regions.sort(function(a,b){
                    return a.name > b.name?1:-1;
                }); //alphabetize by region name
                break;  //only need first set to get all of the regions (note: all regions element present for each data object (i.e this is a square data set))
            }
            var showComponents = oGraph.mapsets.components.length>1 || (oGraph.mapsets.options.formula && oGraph.mapsets.options.formula.length>1) || oGraph.mapsets.options.units;
            for(r in regions){ //main loop (like plot loop for chart data)
                region = regions[r];
                for(c=0;c<oGraph.mapsets.components.length;c++){
                    component = oGraph.mapsets.components[c];
                    if(component.handle[0]=='M'){
                        period = assets[component.handle].period;
                        asset = assets[component.handle].data[region.regionCode];
                        if(asset){   //mapsets may be not have all regions
                            grid[rowPosition.units].push(assets[component.handle].units);
                            grid[rowPosition.source].push('');  //TODO: src and url for mapset series
                            grid[rowPosition.notes].push('');  //TODO: note for mapset series
                            grid[rowPosition.region].push(region.regionCode);
                        }
                    } else {
                        asset = assets[component.handle];
                        period = asset.period;
                        grid[rowPosition.units].push(asset.units);
                        grid[rowPosition.source].push('<a href="'+ asset.url +'">' + asset.src + '</a>');
                        grid[rowPosition.notes].push(asset.notes);
                        grid[rowPosition.region].push(asset.iso1366?asset.iso1366:'');
                    }
                    if(asset){  //mapsets may be not have all regions
                        makeSquare();
                        grid[rowPosition.lat_lon].push((asset.lat)?'"' + asset.lat + ', ' + asset.lon + '"':'');
                        grid[rowPosition.name].push((showComponents?'':'<b>') + asset.name + (showComponents?'':'</b>'));
                        grid[rowPosition.date].push(showComponents?String.fromCharCode('a'.charCodeAt(0)+c):'values');
                        compData = asset.data.split('||');
                        for(d=0;d<compData.length;d++){
                            mdPoint = compData[d].split('|');
                            jsdt = dateFromMdDate( mdPoint[0]);
                            mdDate = formatDateByPeriod(jsdt.getTime(), period);
                            for(row=rowPosition.dataStart;row<grid.length;row++){  //find the row on which the dates line up
                                if(grid[row][0].dt.getTime() == jsdt.getTime()) break;
                                if(grid[row][0].dt.getTime() > jsdt.getTime()){  //need to insert new row
                                    grid.splice(row,0,new Array(grid[0].length));
                                    grid[row][0] = {dt: jsdt, s: mdDate};
                                    break;
                                }
                            }
                            if(row==grid.length){  //need to append new row
                                grid.push(new Array(grid[0].length));
                                grid[row][0] = {dt: jsdt, s: mdDate};
                            }
                            if(grid[row][0].s.length<mdDate.length) grid[row][0].s = mdDate;  //replace year with month or longer formatted output
                            grid[row][grid[0].length-1] = mdPoint[1];  //actually set the value!
                        }
                    }
                }
                if(showComponents){  //need to show calculated values
                    grid[rowPosition.units].push(oGraph.mapsets.options.units || assets[oGraph.mapsets.components[0].handle].units);
                    grid[rowPosition.source].push('calculated');
                    grid[rowPosition.notes].push('');
                    grid[rowPosition.region].push(region.regionCode);
                    grid[rowPosition.lat_lon].push('');
                    grid[rowPosition.name].push('<b>' + 'calculated' + '</b>');
                    grid[rowPosition.date].push(oGraph.mapsets.options.formula || 'y = a');
                    makeSquare();
                    for(i=0;i<mapData.dates.length;i++){
                        if(mapData.regionData[mapData.dates[i].s]) {
                            jsdt = mapData.dates[i].dt;
                            mdDate = mapData.dates[i].s;
                            for(row=rowPosition.dataStart;row<grid.length;r++){  //find the row on which the dates line up
                                if(grid[row][0].dt.getTime() == jsdt.getTime()) break;
                                if(grid[row][0].dt.getTime() > jsdt.getTime()){  //need to insert new row
                                    grid.splice(row,0,new Array(grid[0].length));
                                    grid[row][0] = {dt: jsdt, s: mdDate};
                                    break;
                                }
                            }
                            if(row==grid.length){  //need to append new row
                                grid.push(new Array(grid[0].length));
                                grid[row][0] = {dt: jsdt, s: mdDate};
                            }
                            if(grid[row][0].s.length<mdDate.length) grid[row][0].s = mdDate;  //replace year with month or longer formatted output
                            grid[row][grid[0].length-1] = mapData.regionData[mapData.dates[i].s][region.regionCode];  //actually set the value!
                        }
                    }
                }
            }
            break;
        case 'markers':
            period = mapData.period;
            var vectors = [];
            for(p=0;p<oGraph.pointsets.length;p++){
                for(c=0;c<oGraph.pointsets[p].components.length;c++){
                    if(vectorPattern.test(oGraph.pointsets[p].components[c].handle)) vectors.push(oGraph.pointsets[p].components[c].handle);
                }
            }
            for(var v=0;v<vectors.length;v++){
                asset = oGraph.assets[vectors[v]];
                grid[rowPosition.name].push(asset.geoid);
                grid[rowPosition.units].push(asset.units);
                grid[rowPosition.source].push(asset.source);
                grid[rowPosition.notes].push(asset.notes);
                grid[rowPosition.region].push(asset.geoid);//TODO: get geoname from db when fetching asset
                grid[rowPosition.lat_lon].push(asset.lat ? asset.lat + ', ' + asset.lon : '' );
                grid[rowPosition.date].push(vectors[v]);
                addDataToGrid(asset.data, asset.period);  // everything happens here!
            }
            var markers = [];  //used to order from East to West
            for(m in mapData.markers) {
                markers.push({marker: m, lon: mapData.markers[m].latLng[1]});
            }
            markers.sort(function(a,b){return a.lon- b.lon});
            for(m=0; m<markers.length; m++){
                markerKey = markers[m].marker; //this can be a complex handle
                handles =  markerKey.match(handlePattern);
                for(i=0; i<handles.length;i++){
                    if(vectors.indexOf(handles[i]) == -1){ //make sure series is in pointset and not a 1D vector
                        for(var key in oGraph.assets){
                            if(key[0]=='X'){
                                if(oGraph.assets[key].data[handles[i]]){
                                    grid[rowPosition.name].push(oGraph.assets[key].data[handles[i]].name);
                                    grid[rowPosition.units].push(oGraph.assets[key].units);
                                    grid[rowPosition.source].push('');
                                    grid[rowPosition.notes].push('');
                                    grid[rowPosition.region].push('');//TODO: get geoname from db when fetching asset
                                    grid[rowPosition.lat_lon].push(oGraph.assets[key].coordinates[handles[i]].latLng ? oGraph.assets[key].coordinates[handles[i]].latLng[0] + ', ' + oGraph.assets[key].coordinates[handles[i]].latLng[1] : '' );
                                    grid[rowPosition.date].push('values');
                                    addDataToGrid(oGraph.assets[key].data[handles[i]].data, oGraph.assets[key].period);  // everything else happens here!
                                    break;
                                }
                            }
                            if(key[0]=='M'){
                                //TODO: add mapset search code here
                            }
                        }
                    }
                }
                if(handles.length>1 || markerKey!=handles[0]){ //this is a calculated series (not a director single-series) therefore show the final value.
                    grid[rowPosition.name].push(mapData.markers[markerKey].name);
                    //grid[rowPosition.units].push(oGraph.assets[key].units);
                    grid[rowPosition.source].push('');
                    grid[rowPosition.notes].push('');
                    grid[rowPosition.region].push('');//TODO: get geoname from db when fetching asset
                    grid[rowPosition.lat_lon].push(mapData.markers[markerKey].latLng[0] + ', ' + mapData.markers[markerKey].latLng[1]);
                    grid[rowPosition.date].push(markerKey);
                    makeSquare();
                    for(date in mapData.markerData){
                        addPointToGrid(date + '|' + mapData.markerData[date][markerKey], mapData.period);  // everything else happens here!
                    }
                }
            }
            break;
    }
    for(row=rowPosition.dataStart;row<grid.length;row++){
        grid[row][0] = grid[row][0].s;  //replace the object with its MDdate string
    }
    return grid;

    //helper functions
    function addDataToGrid(mdData, period){  //helper function for
        makeSquare();
        var d, mdPoint, row, jsdt, mdDate;
        var dataArray = mdData.split('||');
        for(d=0; d<dataArray.length; d++){
            addPointToGrid(gdataArray[d], period);
        }
    }

    function makeSquare(){
        var length = grid[0].length;
        for(var row=1;row<grid.length;row++){
            if(grid[row].length<length)grid[row].push('');  //even out array to ensure the grid is square 2-D array of arrays
        }
    }

    function addPointToGrid(point, period){
        var jsdt, mdDate, row;
        mdPoint = point.split('|');
        jsdt = dateFromMdDate(mdPoint[0]);
        mdDate = formatDateByPeriod(jsdt.getTime(), period);
        for(row=rowPosition.dataStart;row<grid.length;row++){  //find the row on which the dates line up
            if(grid[row][0].dt.getTime() == jsdt.getTime()) break;
            if(grid[row][0].dt.getTime() > jsdt.getTime()){  //need to insert new row
                grid.splice(row,0,new Array(grid[0].length));
                grid[row][0] = {dt: jsdt, s: mdDate};
                break;
            }
        }
        if(row==grid.length){  //need to append new row
            grid.push(new Array(grid[0].length));
            grid[row][0] = {dt: jsdt, s: mdDate};
        }
        if(grid[row][0].s.length<mdDate.length) grid[row][0].s = mdDate;  //replace year with month or longer formatted output
        grid[row][grid[0].length-1] = mdPoint[1];  //actually set the value!
    }
}

function makeTableFromArray(grid){
    var r, c;
    if(grid[rowPosition.lat_lon].join('')=='lat, lon:') grid.splice(rowPosition.lat_lon,1);
    if(grid[rowPosition.region].join('')=='region code:') grid.splice(rowPosition.region,1);
    for(r=0;r<grid.length;r++){
        grid[r] = '<tr><td>' + grid[r].join('</td><td>') + '</td></tr>';
    }
    return '<table class="data-grid">' + grid.join('') + '</table>';
}


//MAP FUNCTIONS
//MAP FUNCTIONS

/*Object Documentation
 Inputs:
 mapsets.options
 mapconfig
 plot[i].options
 pointsets[i].options


 */

function calcMap(graph){
    //vars that will make up the return object
    var mapTitle, mapPeriod, mapUnits, mapDates={}, aMapDates=[], markers={}, dateKey;
    var markerData = {}; //2D object array:  [mdDate][shandle]=value
    var regionData = {};  //2D object array:  [mdDate][region-code]=value

    //local vars
    var mapRegionNames = {}, c, i, j, point, points, mddt, handle, dateHasData, valuesObject, pointHasData, y;
    var dataMin, dataMax;
    //var pointMin=null, pointMax=null;
    var oMapDates = {};

    var expression, compSymbols, geo, geos, components, data, symbol, oComponentData;
    if(graph.mapsets){
        //THE BRAINS:
        var mapset = graph.mapsets;
        mapset.formula = plotFormula(mapset);
        expression = 'return ' + mapset.formula.formula.replace(patVariable,'values.$1') + ';';
        var mapCompute = new Function('values', expression);

        //1. rearrange series data into single object by date keys
        compSymbols = [];
        geos={};
        components = mapset.components;
        oComponentData = {};
        for(i=0;i<components.length;i++ ){
            symbol = compSymbol(i);
            compSymbols.push(symbol); //calculate once and use as lookup below
            //TODO: apply series transforms / down shifting here instead of just parroting series data
            if(components[i].handle[0]=='M'){
                for(geo in graph.assets[components[i].handle].data){
                    geos[geo]=true;  //geos will be used later to loop over the geographies and square up the final set (i.e. add nulls for missing values)
                    data = graph.assets[components[i].handle].data[geo].data.split("||");
                    for(j=0; j<data.length; j++){
                        point = data[j].split("|");
                        if(!oComponentData[point[0].toString()]){
                            oComponentData[point[0].toString()] = {};
                        }
                        if(!oComponentData[point[0].toString()][symbol]){
                            oComponentData[point[0].toString()][symbol] = {};
                        }
                        oComponentData[point[0].toString()][symbol][geo] = (point[1]===null || point[1]=='null')?null:parseFloat(point[1]);
                    }
                }
            } else {
                data = graph.assets[components[i].handle].data.split("||");
                for(j=0; j<data.length; j++){
                    point = data[j].split("|");
                    if(!oComponentData[point[0].toString()]){
                        oComponentData[point[0].toString()] = {};
                    }
                    oComponentData[point[0].toString()][symbol] =  (point[1]===null || point[1]=='null')?null:parseFloat(point[1]);
                }
            }
        }

        //2. calculate value for each date key (= grouped points)
        var required = !mapset.options.componentData || mapset.options.componentData=='required';  //default
        var missingAsZero =  mapset.options.componentData=='missingAsZero';
        var nullsMissingAsZero =  mapset.options.componentData=='nullsMissingAsZero';

        var breakNever = !mapset.options.breaks || mapset.options.breaks=='never'; //default
        var breakNulls = mapset.options.breaks=='nulls';
        var breakMissing = mapset.options.breaks=='missing';

        mapTitle = plotName(graph, mapset);
        mapPeriod = graph.assets[components[0].handle].period; //for now, all components for have same periodicity, so just check the first component
        mapUnits = plotUnits(graph, mapset);

        for(dateKey in oComponentData){
            dataMin = Number.MAX_VALUE;
            dataMax = Number.MIN_VALUE;
            dateHasData = false;
            for(geo in geos){
                valuesObject = {};
                y = true;
                dateHasData = false;
                for(i=0;i<compSymbols.length;i++ ){
                    if(!isNaN(oComponentData[dateKey][compSymbols[i]])){ //test whether this component is a simple time series
                        valuesObject[compSymbols[i]] = parseFloat(oComponentData[dateKey][compSymbols[i]]);
                    } else {
                        if(oComponentData[dateKey][compSymbols[i]]=='null'){  //has a direct value, therefore still a simple time series (not a mapset)
                            if(nullsMissingAsZero){
                                valuesObject[compSymbols[i]] = 0;
                            } else {
                                y = null;
                                break;
                            }
                        } else {
                            //mapset
                            if(oComponentData[dateKey][compSymbols[i]] && oComponentData[dateKey][compSymbols[i]][geo]){
                                if(oComponentData[dateKey][compSymbols[i]][geo]=='null'){
                                    if(nullsMissingAsZero){
                                        valuesObject[compSymbols[i]] = 0;
                                    } else {
                                        y = null;
                                        break;
                                    }
                                } else {
                                    valuesObject[compSymbols[i]] = oComponentData[dateKey][compSymbols[i]][geo];
                                    pointHasData = true;
                                }
                            } else {
                                if(required) {
                                    y = null;
                                    break;
                                } else {
                                    valuesObject[compSymbols[i]] = 0;
                                }
                            }
                        }
                    }
                }
                if(pointHasData){
                    if(y) {
                        try{
                            y = mapCompute(valuesObject);
                            if(Math.abs(y)==Infinity || isNaN(y)) y=null;
                        } catch(err){
                            y = null;
                        }
                    }
                    if(y!==null) {
                        if(!regionData[dateKey]) regionData[dateKey] = {};
                        regionData[dateKey][geo] = y;
                        dateHasData = true;
                        dataMin = Math.min(dataMin||y, y);
                        dataMax = Math.max(dataMax||y, y);
                    }
                }
            }
            if(dateHasData){ //if all nulls, don't include this datum point
                mapDates[dateKey] = {regionMin: dataMin, regionMax: dataMax};
            } else {
                delete regionData[dateKey];
            }
        }
    }
    var fillUnits, radiusUnits;

    if(graph.pointsets){
        //3. create the date tree by date for pointsets
        var latlon, latlons={}, Xdata;
        var index = 0, pointset, cmp, k;
        for(i=0;i<graph.pointsets.length;i++){ //assemble the coordinates and colors for multiple mapsets
            pointset = graph.pointsets[i];
            pointset.formula = plotFormula(pointset);
            expression = 'return ' + pointset.formula.formula.replace(patVariable,'values.$1') + ';';
            var pointsetCompute = new Function('values', expression);
            //1. rearrange series data into single object by date keys
            compSymbols = [];
            components = pointset.components;
            oComponentData = {};
            for(j=0;j<components.length;j++ ){
                symbol = compSymbol(j);
                compSymbols.push(symbol); //calculate once and use as lookup below
                //TODO: apply series transforms / down shifting here instead of just parroting series data
                if(components[j].handle[0]=='X'){
                    Xdata = graph.assets[components[j].handle].data; //shortcut
                    for(latlon in Xdata){
                        latlons[latlon] = true;  //latlons will be used later to loop over the points and square up the final set (i.e. add nulls for missing values)
                        if(markers[latlon]){
                            markers[latlon].name += '<br>' + Xdata[latlon].name;
                        } else {
                            markers[latlon] = {latLng: latlon.split(','), name: Xdata[latlon].name};
                            markers[latlon].latLng[0] = parseFloat(markers[latlon].latLng[0]);
                            markers[latlon].latLng[1] = parseFloat(markers[latlon].latLng[1]);
                        }
                        markers[latlon].fill = "#ff0000";  //REMOVE AFTER TESTING
                        data = Xdata[latlon].data.split("||");
                        for(k=0; k<data.length; k++){
                            point = data[k].split("|");
                            if(!oComponentData[point[0].toString()]){
                                oComponentData[point[0].toString()] = {};
                            }
                            if(!oComponentData[point[0].toString()][symbol]){
                                oComponentData[point[0].toString()][symbol] = {};
                            }
                            oComponentData[point[0].toString()][symbol][latlon] = point[1];
                        }
                    }
                } else {
                    data = graph.assets[components[j].handle].data.split("||");
                    for(k=0; k<data.length; k++){
                        point = data[k].split("|");
                        if(!oComponentData[point[0].toString()]){
                            oComponentData[point[0].toString()] = {};
                        }
                        oComponentData[point[0].toString()][symbol] = point[1];
                    }
                }
            }

            //4. calculate value for each date key (= grouped points)
            var required = !pointset.options.componentData || pointset.options.componentData=='required';  //default
            var missingAsZero =  pointset.options.componentData=='missingAsZero';
            var nullsMissingAsZero =  pointset.options.componentData=='nullsMissingAsZero';

            var breakNever = !pointset.options.breaks || pointset.options.breaks=='never'; //default
            var breakNulls = pointset.options.breaks=='nulls';
            var breakMissing = pointset.options.breaks=='missing';

            mapTitle = mapTitle + plotName(graph, pointset);
            mapPeriod = graph.assets[components[0].handle].period; //for now, all components must have same periodicity, so just check the first component

            if(pointset.options.attribute=='fill'){
                fillUnits = plotUnits(graph, pointset);
            }else{
                radiusUnits = plotUnits(graph, pointset);  //default to radius
            }

            for(dateKey in oComponentData){
                dataMin = Number.MAX_VALUE;
                dataMax = Number.MIN_VALUE;
                dateHasData = false;
                for(latlon in latlons){
                    valuesObject = {};
                    y = true;
                    pointHasData = false;
                    for(j=0;j<compSymbols.length;j++ ){
                        if(!isNaN(oComponentData[dateKey][compSymbols[j]])){ //test whether this component is a simple time series
                            valuesObject[compSymbols[j]] = parseFloat(oComponentData[dateKey][compSymbols[j]]);
                        } else {
                            if(oComponentData[dateKey][compSymbols[j]]=='null'){  //this is a series too
                                if(nullsMissingAsZero){
                                    valuesObject[compSymbols[j]] = 0;
                                } else {
                                    y = null;
                                    break;
                                }
                            } else {  //not a simple series = a pointset
                                if(oComponentData[dateKey][compSymbols[j]] && oComponentData[dateKey][compSymbols[j]][latlon]){
                                    if(oComponentData[dateKey][compSymbols[j]][latlon]=='null'){
                                        if(nullsMissingAsZero){
                                            valuesObject[compSymbols[j]] = 0;
                                        } else {
                                            y = null;
                                            break;
                                        }
                                    } else {
                                        valuesObject[compSymbols[j]] = oComponentData[dateKey][compSymbols[j]][latlon];
                                        pointHasData = true;
                                    }
                                } else {
                                    if(required) {
                                        y = null;
                                        break;
                                    } else {
                                        valuesObject[compSymbols[j]] = 0;
                                    }
                                }
                            }
                        }
                    }
                    if(pointHasData){
                        if(y) {
                            try{
                                y = pointsetCompute(valuesObject);
                                if(Math.abs(y)==Infinity || isNaN(y)) y=null;
                            } catch(err){
                                y = null;
                            }
                        }
                        if(y!==null) {
                            dateHasData = true;
                            if(!markerData[dateKey]) markerData[dateKey] = {};
                            if(!markerData[dateKey][latlon]) markerData[dateKey][latlon] = {};
                            if(pointset.options.attribute=='fill'){
                                markerData[dateKey][latlon].f = y;
                                dataMin = Math.min(dataMin, y);
                                dataMax = Math.max(dataMax, y);
                            } else {
                                markerData[dateKey][latlon].r = y;
                                dataMin = Math.min(dataMin, y);
                                dataMax = Math.max(dataMax, y);
                            }
                        }
                    }
                }
                if(dateHasData){ //if all nulls, don't include this data
                    if(!mapDates[dateKey]) mapDates[dateKey]={};
                    if(pointset.options.attribute=='fill'){
                        mapDates[dateKey].markerFillMin = Math.min(mapDates[dateKey].markerFillMin||dataMin, dataMin); //in case there are multiple point sets
                        mapDates[dateKey].markerFillMax = Math.max(mapDates[dateKey].markerFillMax||dataMax, dataMax);
                    } else {
                        mapDates[dateKey].markerRadiusMin = Math.min(mapDates[dateKey].markerRadiusMin||dataMin, dataMin); //in case there are multiple point sets
                        mapDates[dateKey].markerRadiusMax = Math.max(mapDates[dateKey].markerRadiusMax||dataMax, dataMax);
                    }
                } else {
                    delete regionData[dateKey];
                }
            }
        }

        //fill holes in the matrix with nulls, otherwise jVectorMap leaves the last valid value when changing date
        for(mddt in markerData){
            for(latlon in latlons){
                if(typeof markerData[mddt][latlon] == "undefined") markerData[mddt][latlon]={f: null, r: null};
            }
        }
    }
    for(dateKey in mapDates){
        aMapDates.push({
            s: dateKey,
            dt: dateFromMdDate(dateKey),
            regionMin: mapDates[dateKey].regionMin,
            regionMax: mapDates[dateKey].regionMax,
            markerRadiusMin: mapDates[dateKey].markerRadiusMin,
            markerRadiusMax: mapDates[dateKey].markerRadiusMax,
            markerFillMin: mapDates[dateKey].markerFillMin,
            markerFillMax: mapDates[dateKey].markerFillMax
        });
    }
    aMapDates.sort(function(a,b){return a.dt - b.dt});

    graph.calculatedMapData = {
        title: mapTitle,  //string
        period: mapPeriod, //string: single periodicity for maps
        mapUnits: mapUnits,  //string
        markers: markers, //{pointid: {name:, style: {fill:}}  radius attribute set in CalcAttibute if
        markerData: markerData,  //
        dates: aMapDates,  // [{a: mdDate (string), dt: intval for js UTC date,  regionMin: (optional float), regionMax: (optional float), markerMin; (optional float), markerMax: (optional float)}]
        regionData: regionData,
        fillUnits: fillUnits,
        radiusUnits: radiusUnits
    };
    return graph.calculatedMapData;
}

function calcAttributes(graph){
    var i, y, firstDateKey, dateKey, geo, min, max, calcData = graph.calculatedMapData;

    //1.  find start and end indexes
    calcData.regionMin = Number.MAX_VALUE;
    calcData.regionMax = Number.MIN_VALUE;
    calcData.startDateIndex=calcData.dates.length-1;
    calcData.endDateIndex=0;
    for(i=0;i<calcData.dates.length;i++){
        if((!graph.start || parseInt(graph.start) <= calcData.dates[i].dt.getTime()) && (!graph.end || parseInt(graph.end) >= calcData.dates[i].dt.getTime())){
            if(calcData.startDateIndex>i)calcData.startDateIndex=i;
            if(calcData.endDateIndex<i)calcData.endDateIndex=i;
            if(graph.mapsets){
                calcData.regionMin = Math.min(calcData.dates[i].regionMin, calcData.regionMin);
                calcData.regionMax = Math.max(calcData.regionMax, calcData.dates[i].regionMax);
            }
        }
    }

    if(graph.mapsets){
        var spans, regionFillColors = {}, mapOptions = graph.mapsets.options;
        var rgb, continuous = !mapOptions.scale || mapOptions.scale=='continuous';

        min = calcData.regionMin;
        max = calcData.regionMax;

        //2. based on mapOptions, set regionData attributes = regionFillColors
        //2A  continuous attributes use the min and max just calculated (also used in legend)
        spans = min<0 && max>0;
        calcData.regionColors = {};
        if(continuous){  //this will be used in the loop
            rgb = {
                pos: makeRGB(mapOptions.posColor||MAP_COLORS.POS),
                neg: makeRGB(mapOptions.negColor||MAP_COLORS.NEG),
                posMid: makeRGB(colorInRange(1, 0, 3, makeRGB('FFFFFF'), makeRGB(mapOptions.posColor||MAP_COLORS.POS))), //don't go all the way to grey
                negMid: makeRGB(colorInRange(1, 0, 3, makeRGB('FFFFFF'), makeRGB(mapOptions.negColor||MAP_COLORS.NEG))),
                mid: makeRGB(MAP_COLORS.MID)
            };
        }
        for(i=calcData.startDateIndex;i<=calcData.endDateIndex;i++){
            dateKey = calcData.dates[i].s;
            calcData.regionColors[dateKey] = {};
            if(calcData.regionData[dateKey]){
                for(geo in calcData.regionData[dateKey]){
                    y = calcData.regionData[dateKey][geo];
                    if(!isNaN(y)&&y!==null){
                        y=parseFloat(y);
                        if(continuous){ //CONTINUOUS = relative to min and max data
                            if(y==0 && spans) {
                                calcData.regionColors[dateKey][geo] = MAP_COLORS.MID;
                            } else {
                                if(spans){
                                    calcData.regionColors[dateKey][geo] = colorInRange(y, y<0?min:(spans?0:min), y>0?max:(spans?0:max), y<0?rgb.neg:rgb.posMid, y<0?rgb.negMid:rgb.pos);
                                } else {
                                    calcData.regionColors[dateKey][geo] = colorInRange(y, min, max, Math.min(min,max)<0?rgb.neg:rgb.mid, Math.min(min,max)<0?rgb.mid:rgb.pos);
                                }
                            }
                        } else {//DISCRETE = cutoffs are hard coded (not relative to min or max data)
                            for(j=0;j<mapOptions.discreteColors.length;j++){
                                if((j==0 && parseFloat(mapOptions.discreteColors[j].cutoff)<=y) || (j!=0 && parseFloat(mapOptions.discreteColors[j].cutoff)<y)){
                                    calcData.regionColors[dateKey][geo] = mapOptions.discreteColors[j].color;
                                } else break;
                            }
                        }
                    } else {
                        calcData.regionColors[dateKey][geo] = '#ffffff';
                    }
                }
            } else {
                //whiteFillCurrentRegionData()beyond map range: create white fill
                for(firstDateKey in calcData.regionData){
                    for(geo in calcData.regionData[firstDateKey]){
                        calcData.regionColors[dateKey][geo] = '#ffffff'
                    }
                    break;
                }
            }
        }
    }
    //3. based on mapconfig, set markerData attributes
    if(graph.pointsets){
        //3A. calc min and max data for current start/end crop of graph
        var markerKey, markerValues;
        var markerFillMin = Number.MAX_VALUE, markerFillMax = Number.MIN_VALUE;
        var markerRadiusMin = Number.MAX_VALUE, markerRadiusMax = Number.MIN_VALUE;
        for(i=calcData.startDateIndex;i<=calcData.endDateIndex;i++){
            if(calcData.dates[i].markerRadiusMin){ //data for this marker that will determine its radius
                markerRadiusMin = Math.min(calcData.dates[i].markerRadiusMin, markerRadiusMin);
                markerRadiusMax = Math.max(calcData.dates[i].markerRadiusMax, markerRadiusMax);
            }
            if(calcData.dates[i].markerFillMin){  //data for this marker that will determine its fill color
                markerFillMin = Math.min(calcData.dates[i].markerFillMin, markerFillMin);
                markerFillMax = Math.max(calcData.dates[i].markerFillMax, markerFillMax);
            }
        }
        //determine mode booleans (hasRadiusScaling, hasFillShading) and set the min and max r- and fill-data.
        var markerRadiusAbs;
        var hasRadiusScaling = (markerRadiusMin != Number.MAX_VALUE);
        if(hasRadiusScaling) {
            markerRadiusAbs = Math.max(Math.abs(markerRadiusMin), Math.abs(markerRadiusMax));
            calcData.radiusScale = markerRadiusAbs;
        }
        var hasFillShading = (markerFillMin != Number.MAX_VALUE);
        if(hasFillShading){
            calcData.markerFillMinValue = markerFillMin;
            calcData.markerFillMaxValue = markerFillMax;
            continuous = hasFillShading &&(!graph.mapconfig.scale || mapOptions.scale=='continuous'); //redefined for pointsets
            spans = markerFillMin<0 && markerFillMax>0;
            if(continuous){  //this will be used in the loop
                rgb =  makeRGB(graph.mapconfig.maxMarkerColor||MAP_COLORS.POS);
            }
        }
        //3B. create attributes
        //(leave the fill colors unchanged from creation if !hasFillShading is radius.)
        var markerId, fillData, rData, markerAttr = {r:{}, fill:{}, stroke:{}};

        for(dateKey in calcData.markerData){
            markerAttr.r[dateKey] = {};
            markerAttr.fill[dateKey] = {};
            markerAttr.stroke[dateKey] = {};
            for(markerId in calcData.markers){
                if(hasRadiusScaling){
                    rData = calcData.markerData[dateKey][markerId].r || null;
                    if(rData<0){ //create the style object with the stroke = RED for neg numbers
                        markerAttr.stroke[dateKey][markerId] = '#ff0000';
                        rData = Math.abs(rData);
                    } else {
                        markerAttr.stroke[dateKey][markerId] = '#000000';
                    }
                    markerAttr.r[dateKey][markerId] = (graph.mapconfig.radius || DEFAULT_RADIUS_SCALE) *  Math.sqrt(rData)/Math.sqrt(markerRadiusAbs);
                }
                if(hasFillShading){
                    fillData = calcData.markerData[dateKey][markerId].f || null;
                    if(isNaN(fillData) || fillData===null){
                        markerAttr.fill[dateKey][markerId] = '#ffffff';
                    } else {
                        if(continuous){
                            if(spans){
                                markerAttr.fill[dateKey][markerId] = colorInRange(fillData, fillData<0?markerFillMin:(spans?0:markerFillMin), fillData>0?markerFillMax:(spans?0:markerFillMax), fillData<0?rgb.neg:rgb.posMid, fillData<0?rgb.negMid:rgb.pos);
                            } else {
                                markerAttr.fill[dateKey][markerId] = colorInRange(fillData, fillData<0?markerFillMin:(spans?0:markerFillMin), fillData>0?markerFillMax:(spans?0:markerFillMax), fillData<0?rgb.neg:MAP_COLORS.MID, fillData<0?MAP_COLORS.MID:rgb.pos);
                            }
                        } else {//DISCRETE = cutoffs are hard coded (not relative to min or max data)
                            for(j=0;j<graph.mapconfig.discreteColors;j++){
                                if((j==0 && parseFloat(graph.mapconfig.discreteColors[j].cutoff)<=fillData) || (j!=0 && parseFloat(graph.mapconfig.discreteColors[j].cutoff)<fillData)){
                                    markerAttr.fill[dateKey][markerId] = graph.mapconfig.discreteColors[j].color;
                                } else break;
                            }
                        }
                    }
                } else {
                    markerAttr.fill[dateKey][markerId] = '#0000ff';
                }
            }

        }
        calcData.markerAttr = markerAttr;
    }

    //DONE!!!
    function makeRGB(color){
        if(color.substr(0,1)=='#')color=color.substr(1);
        var r, g, b;
        r = parseInt(color.substr(0,2), 16);
        g = parseInt(color.substr(2,2), 16);
        b = parseInt(color.substr(4,2), 16);
        return {r:r, g:g, b:b};
    }
    function colorInRange(y, y1, y2, rgb1, rgb2){
        var r, g, b, percent = (y-y1)/ (y2-y1);
        r = octet(Math.round(percent * (rgb2.r-rgb1.r) + rgb1.r));
        g = octet(Math.round(percent * (rgb2.g-rgb1.g) + rgb1.g));
        b = octet(Math.round(percent * (rgb2.b-rgb1.b) + rgb1.b));
        return '#' + r + g + b;
    }
}

function getMapDataByContainingDate(mapData,mdDate){ //tries exact date match and then step back if weekly->monthly->annual or if monthly->annual
//this allows mixed-periodicity mapsets and marker set to be display controlled via the slider
    while(mdDate.length>=4){
        if(mapData[mdDate]) return mapData[mdDate];
        mdDate = mdDate.substr(0,mdDate.length-2);
    }
    return {};
}

function downloadMap(panelID, format){
    //format = 'image/jpeg';  //'application/pdf',
    var svg = $('#'+ panelID + ' div.jvmap div').html();
    svg = cleanMapSVG(svg);
    downloadMadeFile({
        type: format,
        filename: 'MashableDataMap',
        width: 800,
        svg: svg,
        url: 'export/index.php'
    });

}
function cleanMapSVG(svg){
    //jvector map sanitize
    svg = svg.replace(/<div.+<\/div>/gi, '');
    //svg = svg.replace(/ class="[^"]+"/gi, '');
    //svg = svg.replace(/ id="[^"]+"/gi, '');
    svg = svg.replace(/<svg /gi, '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" ');
    //svg = svg.replace(/<g [^>]+>/gi, '<g>');
    svg = svg.replace(/<g/,'<rect x="0" y="0" width="100%" height="100%" fill="'+mapBackground+'"></rect><g');
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

    return svg;
}
function downloadMadeFile(options){
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

    for(var name in options){
        createElement('input', {
            type: 'hidden',
            name: name,
            value: options[name]
        }, null, form);
    }
    // submit
    form.submit();

    // clean up
    Highcharts.discardElement(form);
}
function buildGraphPanel(oGraph, panelId){ //all highcharts, jvm, and colorpicker files need must already be loaded
    mask(window.SVGAngle?'drawing the graph':'drawing the graph<br>Note: Graphs will draw 20 times faster in a modern browser such as Chrome, Firefox, Safari or Internet Exploer 9 or later');
    window.setTimeout(function(){buildGraphPanelCore(oGraph, panelId)}, 20);
}
function buildGraphPanelCore(oGraph, panelId){ //all highcharts, jvm, and colorpicker files need must already be loaded
    console.time('buildGraphPanel');
    console.time('buildGraphPanel:header');
    var title, calculatedMapData;
    if(oGraph.title.length==0){ // set title if blank and just one asset to name of asset
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
    var annotations = new AnnotationsController(panelId);
    console.timeEnd('buildGraphPanel:header');
    console.time('buildGraphPanel:timeEnd');
    $thisPanel.html(
        '<div class="graph-nav">' +
            '<ol class="graph-nav">' +
            '<li class="graph-nav-talk" data="graph-talk"></li>' +
            '<li class="graph-nav-data" data="graph-data"></li>' +
            '<li class="graph-nav-sources"  data="graph-sources"></li>' +
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
            '</ul><button class="download-data ui-state-highlight" title="Download the graph data as an Excel workbook">Download to Excel&nbsp;</button>' +
            '<div id="data-chart-' + panelId + '" class="graph-data-subpanel" data="chart">c-d</div>' +
            '<div id="data-region-' + panelId + '" class="graph-data-subpanel" data="regions">r-d</div>' +
            '<div id="data-marker-' + panelId + '" class="graph-data-subpanel" data="markers">m-d</div>' +
            '</div>' +
            '</div>' +
            '<div class="provenance graph-sources graph-subpanel" style="display: none;"></div>' +
            '<div class="graph-chart graph-subpanel">' +
            '<div class="graph_control_panel" style="font-size: 11px !important;">' +
            //change map sleector and default
            '<div class="change-map">change base map ' +
            '<select class="change-map"></select>' +
            '</div>' +
            //default series type (line, column..)
            '<div class="graph-type">default graph type ' +
            '<select class="graph-type">' +
            '<option value="auto">auto (line &amp; column)</option>' +
            '<option value="line">line</option>' +
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
            '<td><label for="'+ panelId +'-rad-interval-crop">show latest <input class="interval-crop-count" value="'+(oGraph.intervals||5)+'"> <span class="interval-crop-period"></span></label></td></tr>' +
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
            '<a class="md-jpg rico export-chart">JPG</a>' +
            '<a class="md-svg rico export-chart">SVG</a>' +
            '<a class="md-pdf rico export-chart">PDF</a>' +
            '</fieldset>' +
            '</div>' +
            '<div class="sharing">' +
            '<fieldset>' +
            '<legend>&nbsp;Sharing&nbsp;</legend>' +
            '<div class="share-links">' +
            '<a href="#" class="post-facebook"><img src="images/icons/facebook.png" />facebook</a> ' + //copy from http://www.eia.gov/global/images/icons/facebook.png
            '<a href="#" class="post-twitter"><img src="images/icons/twitter.png" />twitter</a> ' + //copy from http://www.eia.gov/global/images/icons/twitter.png
            '<button class="email">email </button> ' +
            '<button class="link">link </button>' +
            //'<a href="#" class="email-link"><img src="http://www.eia.gov/global/images/icons/email.png" />email</a> ' +
            //'<a href="#" class="graph-link"><img src="http://www.eia.gov/global/images/icons/email.png" />link</a> ' +
            '</div><div class="searchability">' +
            '<input type="radio" name="'+ panelId +'-searchability" id="'+ panelId +'-searchable" value="Y" '+ (oGraph.published=='Y'?'checked':'') +' /><label for="'+ panelId +'-searchable">public graph</label>' +
            '<input type="radio" name="'+ panelId +'-searchability" id="'+ panelId +'-private" value="N" '+ (oGraph.published=='N'?'checked':'') +' /><label for="'+ panelId +'-private">' + (account.info.orgName?'restrict to '+ account.info.orgName:'not searchable') + '</label>' +
            '</div>' +
            '</fieldset>' +
            '</div>' +
            '<br /><button class="graph-save">save</button> <button class="graph-saveas">save as</button> <button class="graph-close">close</button> <button class="graph-delete">delete</button><br />' +
            '</div>' +
            '<div class="chart-map" style="width:70%;display:inline;float:right;">' +
            '<div class="chart"></div>' +
            '<div class="map" style="display:none;">' +
            '<h3 class="map-title" style="color:black;"></h3>'+
            '<div class="container map-controls">' +
            '<div class="jvmap" style="display: inline-block;"></div>' +
            '<div class="slider" style="display: inline-block;width: 280px;"></div>' +
            '<button class="map-step-backward">step backwards</button>' +
            '<button class="map-play">play</button>' +
            '<button class="map-step-forward">step forwards</button>' +
            '<button class="map-graph-selected" title="graph selected regions and markers"  disabled="disabled">graph</button>' +
            '<button class="make-map" disabled="disabled">reset</button>' +
            '<button class="merge group hidden" disabled="disabled">group</button>' +
            '<button class="merge ungroup hidden" disabled="disabled">ungroup</button>' +
            '<span class="right"><input type="checkbox" id="'+panelId+'-legend" class="legend"><label for="'+panelId+'-legend">legend</label></span>' +
            '</div>' +
            '</div>' +
            '<div height="75px"><textarea style="width:100%;height:50px;margin-left:5px;"  class="graph-analysis" maxlength="1000" /></div>' +
            '</div>' +
            '</div>');
    var chart;
    console.timeEnd('buildGraphPanel:thisPanel');
    console.time('buildGraphPanel:thisPanel events');
    //configure and bind the controls
    $thisPanel.find('ol.graph-nav').children('li')
        .click(function(){ //Graph-Configure-Data-Comments sub panels:  init show state dtermined by HTML template above
            var $this = $(this);
            $thisPanel.find('ol.graph-nav').children('li').removeClass('graph-nav-active');
            $thisPanel.find('.graph-subpanel').hide();
            $thisPanel.find('.' + $this.attr('data')).show();
            $this.addClass('graph-nav-active');
            switch($this.attr('data')){
                case 'graph-talk':
                    break;
                case 'graph-data':
                    var $dataPanel = $($thisPanel.find('.graph-data-inner li:not(.ui-state-disabled) a').attr('href'));
                    $dataPanel.html(makeTableFromArray(makeDataGrid(panelId, $dataPanel.attr('data'), calculatedMapData)));
                    break;
                case 'graph-sources':
                    provenance.build();
                    break;
                case 'graph-chart':
                    provenance.provOk();  //applies change if changes are waiting and have not been canceled
            }
        });

    $thisPanel.find('.graph-data-inner')
        .tabs({
            beforeActivate: function( event, ui ) {
                ui.newPanel.html(makeTableFromArray(makeDataGrid(panelId, ui.newPanel.attr('data'), calculatedMapData)));
            }
        })
        .tabs(oGraph.plots?"enable":"disable",0)
        .tabs(oGraph.mapsets?"enable":"disable",1)
        .tabs(oGraph.pointsets?"enable":"disable",2);

    $thisPanel.find('button.download-data').button({icons: {secondary: "ui-icon-calculator"}})
        .click(function(){
            var grids = [];
            if(oGraph.plots) grids.push({name: 'chart', grid: makeDataGrid(panelId, 'chart', calculatedMapData)});
            if(oGraph.mapsets) grids.push({name: 'regions', grid: makeDataGrid(panelId, 'regions', calculatedMapData)});
            if(oGraph.pointsets) grids.push({name: 'markers', grid: makeDataGrid(panelId, 'markers', calculatedMapData)});
            //do the highcharts trick to download a file
            downloadMadeFile({
                filename: oGraph.title,
                data: grids,
                url: 'excel.php'  //page of server that use PHPExcel library to create a workbook
            });
        });
    $thisPanel.find('.graph-subpanel').width($thisPanel.width()-35-2).height($thisPanel.height()).find('.chart-map').width($thisPanel.width()-40-350); //
    $thisPanel.find('.graph-sources').width($thisPanel.width()-35-2-40);
    $thisPanel.find('.graph-analysis').val(oGraph.analysis);
    $thisPanel.find('.export-chart').click(function(){
        var type, $this = $(this);
        if($this.hasClass('md-jpg')) type = 'image/jpeg';
        if($this.hasClass('md-svg')) type = 'image/svg+xml';
        if($this.hasClass('md-pdf')) type = 'application/pdf';
        exportChart(type);
    });
    $thisPanel.find('a.post-facebook')
        .click(function(){
            var svg;
            if(oGraph.mapsets||oGraph.pointsets){  //need check for IE<10 = isIE+ version check
                svg = cleanMapSVG($map.container.html());
            } else {
                annotations.sync();
                svg = oHighCharts[panelId].getSVG();
            }
            $.ajax({
                type: 'POST',
                url:"export/index.php",
                dataType: 'json',
                data:  {
                    type: 'FB',  //'image/jpeg',
                    width: "800",
                    svg: svg},
                success: function(chartInfo, textStatus, jqXH){
                    var body = oPanelGraphs[panelId].analysis;
                    var caption =  oPanelGraphs[panelId].title;
                    //check permissions first with: FB.api('/me/permissions', function(response) {if(response.data[0])});

                    // calling the API ...
                    var obj = {
                        method: 'feed',
                        link: 'http://www.mashabledata.com/workbench?t=g&graphcode='+ oPanelGraphs[panelId].ghash,
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
    $thisPanel.find('.email').button({icons: {primary: "ui-icon-mail-closed"},
        click: function(){
            //TODO: mail to code here
        }
    });
    $thisPanel.find('.link').button({icons: {primary: "ui-icon-link"}})
        .click(function(){
            if(oGraph.isDirty) {
                dialogShow("Graph is not saved", "Please save the graph first so that links will show the graph as currently displayed.");
                return;
            }
            //show link div code here
            var offset = $(this).offset();  //button offset relative to document
            var linkDivHTML =
                '<div id="link-editor">' +
                    '<button class="right" id="link-editor-close">close</button>' +
                    '<button id="ghash-reset" class="ui-state-error right">reset link code</button>' +
                    '<b>link code: </b><span id="link-ghash">' + oGraph.ghash + '</span><br><br>' +
                    '<em>The code below will create a link to your graph</em>' +
                    '<textarea id="link-html">&lt;a href=&quot;http://www.mashabledata.com/view?g='+oGraph.ghash+'&quot;&gt;'+(oGraph.title||'MashableData graph')+'&lt;/a&gt;</textarea>' +
                    '</div>';

            $.fancybox(linkDivHTML,
                {
                    width: 600,
                    height: 100,
                    showCloseButton: false,
                    autoDimensions: false,
                    autoScale: false,
                    overlayOpacity: 0
                });
            $("#fancybox-wrap").css({
                'top': parseInt(offset.top + $(this).height() -30) + 'px',
                'left': parseInt(offset.left - 620 + $(this).width()) + 'px'
            });
            $('#link-editor-close').button({icons: {secondary: 'ui-icon-close'}}).click(function(){$.fancybox.close()});
            $('#ghash-reset').button({icons: {secondary: 'ui-icon-refresh'}}).click(function(){
                dialogShow("confirm link code reset",
                    "If you have emailed a link to this graph or posted it on FaceBook or Twitter, those links will no longer work once the graph's link code is reset. Plese confirm to reset.",
                    [ { text: "Confirm", click: function() {
                        $( this ).dialog( "close" );
                        $('#ghash-reset').button("disable");
                        callApi({command: 'resetGhash', gid: oGraph.gid}, function(oReturn, textStatus, jqXH){
                            var $linkHtml = $('#link-html');
                            $linkHtml.html($linkHtml.html().replace(oGraph.ghash, oReturn.ghash));
                            oGraph.ghash = oReturn.ghash;
                            $('#link-ghash').html(oGraph.ghash);
                        });
                    }}, { text: "Cancel", click: function() { $( this ).dialog( "close" ); }} ]
                );
            });
        });
    $thisPanel.find('.searchability').buttonset()
        .find('#'+ panelId +'-private').button('option', 'icons' , { primary: "ui-icon-locked"}).end()
        .find('#'+ panelId +'-searchable').button('option', 'icons' , { primary: "ui-icon-search"}).end()
        .find('input').click(function(){
            oGraph.published = $(this).val();
            makeDirty();
        });

//  *** crop routines begin ***

    if(oGraph.start && oGraph.end){
        $thisPanel.find('.rad-hard-crop').attr('checked',true)
    } else {
        if(oGraph.intervals){ //initialize crop radio button selection
            $thisPanel.find('.rad-interval-crop').attr('checked',true)
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
        redraw();  //should be signals or a call to a local var  = function
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

    $('#'+panelId+'-rad-hard-crop')
        .change(function(){
            hardCropFromSlider();
        });

    $('#'+panelId+'-rad-interval-crop').change(function(){
        if($(this).val()=='on'){
            //runs when interval radio button changes to on state
            var interval = parseInt($thisPanel.find('input.interval-crop-count').val());
            if(!interval || interval<1){
                interval = 1;
                $thisPanel.find('input.interval-crop-count').val(interval);
            }
            oGraph.intervals = interval;
            oGraph.start = null;
            oGraph.end = null;
            redraw();
        }
    });
    $('#'+panelId+'-rad-no-crop').change(function(){
        oGraph.intervals = null;
        oGraph.start = null;
        oGraph.end = null;
        oGraph.minZoom = oGraph.firstdt;
        oGraph.maxZoom = oGraph.lastdt;
        redraw();
    });

    $thisPanel.find('input.interval-crop-count').spinner({
        min:1,
        incrementalType: false,
        stop: function(event, ui) {
            //triggered by <label> wrapping around this elecment $thisPanel.find('input#'+panelId+'-rad-interval-crop').attr('checked',true);
            oGraph.start = null;
            oGraph.end = null;
            if(oGraph.intervals != parseInt($(this).val())){
                oGraph.intervals = parseInt($(this).val());
                chartPanel(panelId, annotations);
                annotations.build();
            }
        }
    });

    $thisPanel.find('button.graph-crop').click(function(){  //TODO: replace this click event of hidden button with signals
        var graph = oPanelGraphs[panelId];
        graph.start = (graph.minZoom>graph.firstdt)?graph.minZoom:graph.firstdt;
        graph.end = (graph.maxZoom<graph.lastdt)?graph.maxZoom:graph.lastdt;
        $(this).attr("disabled","disabled");
        setCropSlider(panelId);
        $('#'+panelId+'-rad-hard-crop').click();
    });
// *** crop routine end ***


    $thisPanel.find('input.graph-publish')
        .change(function(){
            oGraph.published = (this.checked?'Y':'N');
        });
    $thisPanel.find('select.graph-type')
        .val(oGraph.type)
        .change(function(){
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
            redraw();
        });
    function fillChangeMapSelect(){
        var handle, i, map, html='<option>'+oGraph.map+'</option>', maps=[];
        for(handle in oGraph.assets){
            if(handle[0]=='M' && oGraph.assets[handle].maps){
                for(map in oGraph.assets[handle].maps){
                    if(map != oGraph.map){
                        maps.push(map);
                    }
                }
            }
        }
        maps.sort();
        for(i=0;i<maps.length;i++){
            html += '<option>'+ maps[i] +'</option>'
        }
        return html;
    }
    $thisPanel.find('select.change-map').html(fillChangeMapSelect()).change(function(){
        //create new map panel!
        var $mapSelect = $(this);
        //1. copy existing object but not its map assets or calculate map data (saves time for large point & mapsets)
        var assets = oGraph.assets;
        delete oGraph.assets;
        var calculatedMapData = oGraph.calculatedMapData;
        delete oGraph.calculatedMapData;
        var newGraph = $.extend(true, {}, oGraph);
        oGraph.assets = assets;
        newGraph.assets = {};
        oGraph.calculatedMapData = calculatedMapData;
        //2. set new map
        newGraph.map = $(this).val();
        newGraph.mapFile = mapsList[$(this).val()].jvectormap;
        //3. compile a list of the mapsetids and corresponding bunnies for the old graph
        var i, oBunnies={};
        function findBunnies(plot){
            var asset;
            for(i=0;i<plot.components.length;i++){
                if(vectorPattern.test(plot.components[i].handle)){ //tests for "S" or "U"
                    asset = assets[plot.components[i].handle];
                    if(asset.mapsetid && mapsList[oGraph.map].bunny && mapsList[oGraph.map].bunny==asset.geoid){
                        //found a bunny!
                        oBunnies[asset.handle] = {mapsetid: asset.mapsetid, handle: asset.handle}; //use object ot dedup
                    } else {
                        //not a bunny so we will need this asset...
                        newGraph.assets[asset.handle] = asset;
                    }
                }
            }
        }
        if(newGraph.plots){
            for(i=0;i<newGraph.plots.length;i++){
                findBunnies(newGraph.plots[i]);
            }
        }
        if(newGraph.pointsets){
            for(i=0;i<newGraph.pointsets.length;i++){
                findBunnies(newGraph.plots[i]);
            }
        }
        if(newGraph.mapsets){
            findBunnies(newGraph.mapsets);
        }
        var handle;
        function replaceBunny(plot, oldHandle, bunny, regex, replacment){
            var i, asset;
            for(i=0;i<plot.components.length;i++){
                if(plot.components[i].handle == oldHandle){
                    //replace bunny!
                    plot.components[i].handle = bunny.handle;
                    if(plot.options.name) plot.options.name = plot.options.name.replace(regex,replacement);
                }
            }
        }
        //4. talk to db (even if no bunnies to get regex and replacement string)
        callApi(
            {command:"ChangeMaps", bunnies: oBunnies, fromgeoid: mapsList[oGraph.map].bunny, togeoid: mapsList[newGraph.map].bunny,  modal:'persist'},
            function(jsoData, textStatus, jqXHR){
                var regex = new RegExp(jsoData.regex);
                newGraph.title = newGraph.title.replace(regex, jsoData.replacement);
                for(handle in jsoData.bunnies) {
                    newGraph.assets[jsoData.bunnies[handle].handle] = jsoData.bunnies[handle];
                    if(handle){ //undefined if no bunnies
                        if(newGraph.plots){
                            for(i=0;i<newGraph.plots.length;i++){
                                replaceBunny(newGraph.plots[i], handle, jsoData.bunnies[handle], jsoData.regex, jsoData.replacement);
                            }
                        }
                        if(newGraph.pointsets){
                            for(i=0;i<newGraph.pointsets.length;i++){
                                replaceBunny(newGraph.plots[i], handle, jsoData.bunnies[handle], jsoData.regex, jsoData.replacement);
                            }
                        }
                        if(newGraph.mapsets){
                            replaceBunny(newGraph.mapsets, handle, jsoData.bunnies[handle], jsoData.regex, jsoData.replacement);
                        }
                    }
                }

                var fileAssets = ['js/maps/'+ newGraph.mapFile +'.js'];
                require(fileAssets); //parallel load while getting db assets
                getAssets(newGraph, function(){ //this will get the Map and Pointset
                    require(fileAssets, function(){ //ensure that we have the new map file
                        buildGraphPanel(newGraph);//panelId not passed -> new panel
                        $mapSelect.val(oGraph.map);//for old graph, continue to show its map in teh selector
                    });
                });
            }
        );
    });

    showChangeSelectors();
    function showChangeSelectors(){
        if(oGraph.plots){
            $thisPanel.find('div.graph-type').show();
        } else {
            $thisPanel.find('div.graph-type').hide();
        }
        if(oGraph.mapsets||oGraph.pointsets){
            $thisPanel.find('div.change-map').show();
        } else {
            $thisPanel.find('div.change-map').hide();
        }
    }
    function redraw(){
        mask('redrawing');
        setTimeout(function(){
            if(oGraph.plots){
                chartPanel(panelId, annotations);
                annotations.build();
            }
            if(oGraph.mapsets||oGraph.pointsets){
                drawMap();
                $thisPanel.find('select.change-map').html(fillChangeMapSelect());
            }
            showChangeSelectors();
            unmask();
        }, 1);
    }
    $thisPanel.find('.graph-analysis')
        .keydown(function(){
            oPanelGraphs[panelId].analysis = this.value;
            makeDirty();
        });
    oGraph.isDirty = (!oGraph.gid); //initialize
    function makeDirty(){
        oGraph.isDirty = true;
        $thisPanel.find('.graph-save').button("enable");
    }
    function makeClean(){
        oGraph.isDirty = false;
        $thisPanel.find('.graph-save').button("disable");
    }
    function saveThisGraph(){
        saveGraph(oGraph);
        $thisPanel.find('button.graph-delete, button.graph-saveas').button("enable");
        makeClean();
    }
    function exportChart(type){
        if(oPanelGraphs[panelId].map){
            downloadMap(panelId, type);
        } else {
            annotations.sync();
            oHighCharts[panelId].exportChart({type: type});
        }
    }
    $thisPanel.find('button.graph-save').button({icons: {secondary: "ui-icon-disk"}}).button(oGraph.gid?'disable':'enable')
        .click(function(){
            saveThisGraph();
        });

    $thisPanel.find('button.graph-saveas').button({icons: {secondary: "ui-icon-copy"}, disabled: (!oGraph.gid)})
        .click(function(){
            delete oGraph.gid;
            graphTitle.show(this, function(){
                saveThisGraph();
            });
        });
    $thisPanel.find('button.graph-close').button({icons: {secondary: "ui-icon-closethick"}})
        .click(function(){
            $('ul#graph-tabs a[href=#' + panelId + ']').siblings('span').click();
        });
    $thisPanel.find('button.graph-delete').button({icons: {secondary: "ui-icon-trash"}, disabled: (!oGraph.gid)})
        .addClass('ui-state-error')
        .click(function(){
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
    console.timeEnd('buildGraphPanel:thisPanel events');
    console.time('buildGraphPanel:provController');
    calcGraphMinMaxZoomPeriod(oGraph);
    oPanelGraphs[panelId]=oGraph;  //oPanelGraphs will be synced will oMyGraphs on save
    var provenance = new ProvenanceController(panelId);  //needs to be set after oPanelGraphs is updated
    console.timeEnd('buildGraphPanel:provController');
    //DRAW THE CHART
    if(oGraph.plots){
        console.time('buildGraphPanel:build annoatations');
        chartPanel(panelId, annotations);
        annotations.build();
        setCropSlider(panelId);

        console.timeEnd('buildGraphPanel:build annoatations');
        $thisPanel.find('div.highcharts-container').mousedown(function (b) {
            if(b.which==3){}  //???
        });
    } else {
        $thisPanel.find('div.chart').hide();
    }
    ////////////MMMMMMMMMMMMMMAAAAAAAAAAAAAAAAAAPPPPPPPPPPPPPPPPPPPPPP
    var $map, vectorMapSettings, val, mergablity;

    console.time('buildGraphPanel:drawMap');
    drawMap();
    console.timeEnd('buildGraphPanel:drawMap');

    function drawMap(){
        if(oGraph.map && (oGraph.mapsets||oGraph.pointsets)){
            if(typeof $map != 'undefined') $map.remove();
            calculatedMapData = calcMap(oGraph);  //also sets a oGraph.calculatedMapData reference to the calculatedMapData object
            calcAttributes(oGraph);
            if(isBubble()) bubbleCalc();
            console.info(calculatedMapData);
            var minScale = /us.._merc_en/.test(oGraph.mapFile)?0.9:1;
            vectorMapSettings = {
                map: oGraph.mapFile,
                zoomMin: minScale,
                focusOn: {
                    scale: minScale,
                    x: 0.5,
                    y: 0.5
                },
                backgroundColor: mapBackground,
                zoomOnScroll: true,
                markersSelectable: true,
                markerStyle: {
                    initial: {r: 5},
                    selected: {
                        "stroke-width": 4,
                        stroke: 'yellow'
                    }
                }, //default for null values in the data
                regionStyle: {
                    selected: {
                        "stroke-width": 2,
                        stroke: 'black',
                        fill: "#ffff80"
                    },
                    hover: {
                        "stroke-width": 2,
                        stroke: 'black',
                        "fill-opacity": 1
                    }
                },
                series: {
                    regions:  [
                        {
                            attribute: "fill"
                            /* values: getMapDataByContainingDate(calculatedMapData.regionData, calculatedMapData.dates[calculatedMapData.dates.length-1].s), //val=aMapDates.length-1 will need to be harmonized with pointsets' most recent date
                             scale: ['#C8EEFF', '#ff0000'],
                             normalizeFunction: (calculatedMapData.regionDataMin>0)?'polynomial':'linear', //jVMap's polynominal scaling routine goes haywire with neg min
                             min: calculatedMapData.regionDataMin,
                             max: calculatedMapData.regionDataMax*/
                        }
                    ],
                    markers:  [
                        {
                            attribute: 'r'
                            //scale: [1, (isBubble()?50:20)]
                            //values: getMapDataByContainingDate(calculatedMapData.markerData,calculatedMapData.dates[calculatedMapData.dates.length-1].s),
                        },
                        {
                            attribute: 'fill'
                        },
                        {
                            attribute: 'stroke'
                        }
                    ]
                },
                onRegionLabelShow: function(event, label, code){
                    var i, vals=[], containingDateData = getMapDataByContainingDate(calculatedMapData.regionData,calculatedMapData.dates[val].s);
                    if(containingDateData && typeof containingDateData[code] != 'undefined'){
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
                        var sparkOptions = {height:"30px", valueSpots:{}, spotColor: false, disableInteraction:true, width: "400px"};
                        //sparkOptions.valueSpots[y.toString()+':'+y.toString()] = 'red';
                        $('.inlinesparkline').sparkline(vals, sparkOptions);
                    }
                },
                regionsSelectable: (typeof oGraph.mapsets != "undefined"),
                markers: calculatedMapData.markers,
                onMarkerLabelShow: function(event, label, code){
                    var i, vals=[], containingDateData = getMapDataByContainingDate(calculatedMapData.markerData,calculatedMapData.dates[val].s);
                    for(i=0;i<calculatedMapData.dates.length;i++){
                        //show sparkline of radius data if exists; else fill data
                        if(calculatedMapData.markerData[calculatedMapData.dates[i].s]) vals.push(calculatedMapData.markerData[calculatedMapData.dates[i].s][code].r||calculatedMapData.markerData[calculatedMapData.dates[i].s][code].f);
                    }
                    if(containingDateData && containingDateData[code]){

                        var y = containingDateData[code].r;
                        var html = '<span style="display: inline-block;"><b>'+label.html()+':</b><br />';
                        if(containingDateData[code].r) html += Highcharts.numberFormat(containingDateData[code].r, (parseInt(containingDateData[code].r)==containingDateData[code].r)?0:2) + " " + (calculatedMapData.radiusUnits||'')+'<br>';
                        if(containingDateData[code].f) html += Highcharts.numberFormat(containingDateData[code].f, (parseInt(containingDateData[code].f)==containingDateData[code].f)?0:2) + " " + (calculatedMapData.fillUnits||'')+'<br>';
                        html += '</span><span class="inlinesparkline" style="height: 30px;margin:0 5px;"></span>';
                        label.html(html).css("z-Index",400);
                        var sparkOptions = {height:"30px", valueSpots:{}, spotColor: false, minSpotColor:false, maxSpotColor:false, disableInteraction:true};
                        sparkOptions.valueSpots[y.toString()+':'+y.toString()] = 'red';
                        $('.inlinesparkline').sparkline(vals, sparkOptions);
                    }
                },
                onRegionSelected: function(e, code, isSelected){
                    setMergablity();
                    var selectedMarkers = $map.getSelectedMarkers();
                    if(selectedMarkers.length>0){
                        $thisPanel.find('.map-graph-selected, .make-map').button('enable');
                        return;
                    }
                    var selectedRegions = $map.getSelectedRegions();
                    for(var i=0;i<selectedRegions.length;i++){
                        if(calculatedMapData.regionData[calculatedMapData.dates[0].s]&&calculatedMapData.regionData[calculatedMapData.dates[0].s][selectedRegions[i]]){
                            $thisPanel.find('.map-graph-selected, .make-map').button('enable');
                            return;
                        }
                    }
                    //default if no markers selected or region that have data are selected:
                    $thisPanel.find('.map-graph-selected, .make-map').button('disable');
                },
                onMarkerSelected: function(e, code, isSelected){
                    vectorMapSettings.onRegionSelected(e, code, isSelected);
                },
                onZoom: function(e, scale){
                    transferTransform();
                }
            };

            val = calculatedMapData.endDateIndex; //initial value
            $thisPanel.find('div.map').show();

            //TODO:  use title, graph controls, and analysis box heights instead of fixed pixel heights
            $thisPanel.find('div.jvmap').show().height(($('div.graph-panel').height()-85-(oGraph.plots?0:55)) * ((oGraph.plots)?0.6:1)).vectorMap(vectorMapSettings);
            $map = $thisPanel.find('div.jvmap').vectorMap('get', 'mapObject');
            var $mapDateDiv = $('<div class="map-date"></div>').prependTo($thisPanel.find('div.jvectormap-container'));

            //BBBUUUUBBBBBLLEESS!!!!!
            var $g = $thisPanel.find('div.jvmap svg g:first');  //goes in createGraph closure

            if(isBubble()){
                positionBubbles();
                $map.series.regions[0].setAttributes(calculatedMapData.regionsColorsForBubbles);
                $thisPanel.find('button.merge').show();
            }

            //$thisPanel.find('button.map-unselect').show().click(function(){$map.reset()});
            var $mapSlider = $thisPanel.find('.slider').show().off().slider({
                value: 0,
                min: calculatedMapData.startDateIndex,
                max: calculatedMapData.endDateIndex,
                step: 1,
                change: function( event, ui ) {
                    val = ui.value;
                    if(!isBubble()&&calculatedMapData.regionColors){ //don't call if pointsets only
                        //attribute color calvulated in calcAttributes
                        $map.series.regions[0].setAttributes(getMapDataByContainingDate(calculatedMapData.regionColors, calculatedMapData.dates[val].s));
                        //value based: $map.series.regions[0].setValues(getMapDataByContainingDate(calculatedMapData.regionData,calculatedMapData.dates[val].s));
                    }
                    if(oGraph.pointsets || isBubble()){
                        //$map.series.markers[0].setValues(getMapDataByContainingDate(calculatedMapData.markerData,calculatedMapData.dates[val].s));
                        $map.series.markers[0].setAttributes(getMapDataByContainingDate(calculatedMapData.markerAttr.r, calculatedMapData.dates[val].s));
                        $map.series.markers[2].setAttributes(getMapDataByContainingDate(calculatedMapData.markerAttr.stroke, calculatedMapData.dates[val].s));
                        if(oGraph.pointsets){
                            $map.series.markers[1].setAttributes(getMapDataByContainingDate(calculatedMapData.markerAttr.fill, calculatedMapData.dates[val].s));
                        }
                    }
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
                    $mapDateDiv.html(formatDateByPeriod(calculatedMapData.dates[val].dt.getTime(), calculatedMapData.period));
                }
            }).slider( "value", calculatedMapData.endDateIndex);

            $thisPanel.find('.map-graph-selected').button({icons:{secondary: 'ui-icon-image'}}).off()
                .click(function(){ //graph selected regions and markers (selectRegions/selectMarkers must be true for this to work
                    /* calcData contains the values for markers and regions in a JVMap friendly (which is not a MD series firnedly format.
                     If only a single mapset or pointset has only one component, we can go back to that pointset/mapset's asset data.
                     If more than one component, we need to assemble a graph obect with plots, plot.options.name, components, and assets.
                     OK.  That is a lot of work, but is correct.  quickGraph will need to detect a graph object as it currently expects a series object.
                     * */

                    var selectedRegions = $map.getSelectedRegions();
                    var selectedMarkers = $map.getSelectedMarkers();
                    var grph = emptyGraph(), plt, formula, i, j, c, X, regionCodes, pointset, mapComps, comps, newComp, asset, found;
                    grph.plots =[];
                    grph.title = 'from map of ' + oGraph.title;
                    for(i=0;i<selectedMarkers.length;i++){  //the IDs of the markers are either the lat,lng in the case of pointsets or the '+' separated region codes for bubble graphs
                        if(isBubble()){
                            //get array of regions codes
                            plt = $.extend(true, {}, oGraph.mapset);
                            mapComps = plt.components;
                            plt.components = [];
                            regionCodes = selectedMarkers[i].split('+');
                            for(j=0;j<regionCodes.length;j++){
                                for(c=0;c<mapComps.length;c++){
                                    if(mapComps[c].handle[0]=='M'){
                                        asset = $.extend({units: oGraph.assets[mapComps[c].handle].units, period: oGraph.assets[mapComps[c].handle].period}, oGraph.assets[mapComps[c].handle].data[regionCodes[j]]);
                                        newComp = $.extend(true, {}, mapComps[c]);
                                        newComp.handle = asset.handle;
                                        grph.assets[asset.handle] = asset; //data, first/lastdt, handle & name
                                        plt.components.push(newComp);
                                    } else {
                                        plt.components.push($.extend(true, {}, mapComps[c]));
                                        grph.assets[mapComps[c].handle] = oGraph.assets[mapComps[c].handle];
                                    }
                                }
                            }
                            grph.plots.push(plt);
                        } else {
                            for(X=0;X<oGraph.pointsets.length;X++){
                                pointset = $.extend({}, oGraph.pointsets[X]);
                                found = false;
                                comps = pointset.components;
                                for(c=0;c<comps.length;c++){
                                    if(comps[c].handle[0]=='X' && oGraph.assets[comps[c].handle].data[selectedMarkers[i]]){
                                        found = true;
                                        sHandle = oGraph.assets[comps[c].handle].data[selectedMarkers[i]].handle;
                                        grph.assets[sHandle] = $.extend({units: oGraph.assets[comps[c].handle].units, period: oGraph.assets[comps[c].handle].period}, oGraph.assets[comps[c].handle].data[selectedMarkers[i]]); //data, first/lastdt, handle & name
                                        comps[c].handle = sHandle;
                                    } else {
                                        grph.assets[comps[c].handle] = oGraph.assets[comps[c].handle];
                                    }
                                }
                                if(found) grph.plots.push(pointset);
                            }
                        }
                    }
                    //regions (mapsets) are simply than markers (pointsets) because there is only one
                    if(oGraph.mapsets && oGraph.mapsets){  //skip if not mapset
                        for(i=0;i<selectedRegions.length;i++){
                            for(var dateSet in calculatedMapData.regionData){ //just need the first date set; break after checking for existence
                                if(calculatedMapData.regionData[dateSet][selectedRegions[i]]){  //make sure this region has data (for multi-component mapsets, all component must this regions data (or be a straight series) for this region to have calculatedMapData data
                                    plt = $.extend(true, {}, oGraph.mapsets);
                                    for(j=0;j<plt.components.length;j++){
                                        if(plt.components[j].handle.substr(0,1)=='M'){ //need to replace mapset with this region's series (note: no pointseets components allowed in multi-component a mapset)
                                            var mapAsset = oGraph.assets[plt.components[j].handle];
                                            var regionSeries = $.extend(true, {name: mapAsset.geoname, period: mapAsset.period, units: mapAsset.units, mapsetid:  plt.components[j].handle.substr(1)}, mapAsset.data[selectedRegions[i]]);
                                            plt.components[j].handle = regionSeries.handle; //swap the series for the mapset in the plot blueprint
                                            grph.assets[regionSeries.handle] = regionSeries; //add the series to the graph assets
                                        } else {
                                            grph.assets[plt.components[j].handle] = $.extend(true, {}, oGraph.assets[plt.components[j].handle]);
                                        }
                                    }
                                    if(plt.name) plt.name += ' - ' + $map.getRegionName(selectedRegions[i]);
                                    grph.plots.push(plt);
                                }
                                break;
                            }
                        }
                    }
                    if(grph.plots.length>0) quickGraph(grph, true);
                });

            var $play = $thisPanel.find('.map-play');
            $play.off().click(function(){
                var stepStart, stepEnd, timeToKill, optimalStepTime = Math.min(10000/calculatedMapData.dates.length, 500);  //total animation will take no more than 10 seconds
                if($play.attr("title")=="play"){
                    $play.button({text: false, icons: {primary: "ui-icon-pause"}}).attr("title","pause");
                    advanceSlider();
                } else {
                    $play.button({text: false, icons: {primary: "ui-icon-play"}}).attr("title", "play");
                }
                function advanceSlider(){
                    if($play.attr("title")=="pause"){
                        stepStart = new Date();
                        var newValue = $mapSlider.slider("value")+1;
                        if(newValue>calculatedMapData.endDateIndex) newValue = calculatedMapData.startDateIndex;
                        $mapSlider.slider("value", newValue);
                        stepEnd = new Date();
                        timeToKill = Math.max(1, optimalStepTime - (stepEnd.getTime()-stepStart.getTime()));
                        if(newValue==calculatedMapData.endDateIndex){
                            $play.button({text: false, icons: {primary: "ui-icon-play"}}).attr("title", "play");
                        } else {
                            if($play.attr("title")=="pause"){
                                window.setTimeout(advanceSlider, timeToKill);
                            }
                        }
                    }
                }
            }).button({text: false, icons: {primary: "ui-icon-play"}});
            $thisPanel.find('.map-step-backward').off()
                .click(function(){
                    $mapSlider.slider("value",$mapSlider.slider("value")-1);
                })
                .button({text: false, icons: {primary: "ui-icon-seek-first"}});
            $thisPanel.find('.map-step-forward').off()
                .click(function(){
                    $mapSlider.slider("value",$mapSlider.slider("value")+1);
                })
                .button({text: false, icons: {primary: "ui-icon-seek-end"}});
            if(oGraph.plots)
                $thisPanel.find('h3.map-title').hide();
            else
                $thisPanel.find('div.map h3').html(calculatedMapData.title+" - "+formatDateByPeriod(calculatedMapData.dates[val].dt.getTime(), calculatedMapData.period));  //initialize here ratehr than set slider value which would trigger a map redraw

            $thisPanel.find('.make-map').button({icons: {secondary: 'ui-icon-arrowrefresh-1-s'}}).off()
                .click(function(){
                    $map.clearSelectedMarkers();
                    $map.clearSelectedRegions();
                    $map.removeAllMarkers();
                    $map.addMarkers(calculatedMapData.markers);
                    calculatedMapData  = calcMap(oGraph);
                    calcAttributes(oGraph);
                    $mapSlider.slider("value", calculatedMapData.dates.length-1);
                    $thisPanel.find('.map-graph-selected, .make-map').button('disable');
                });
            function setMergablity(){
                var i, j, markerRegions;
                mergablity = {
                    "newMerge": false,
                    "growable": false,
                    "splinter": false,
                    "ungroupable": false
                };
                if(!isBubble()) return;
                var selectedMarkers = $map.getSelectedMarkers();
                var selectedRegions = $map.getSelectedRegions();
                //ungroupable
                for(i=0;i<selectedMarkers.length;i++){
                    if(selectedMarkers[i].split('+').length>1) {
                        mergablity.ungroupable = true;
                        break;
                    }
                }
                if(oGraph.mapsets.options.merges){
                    for(i=0;i<selectedRegions.length;i++){
                        for(j=0;j<oGraph.mapsets.options.merges.length;j++){
                            if(oGraph.mapsets.options.merges[j].indexOf(selectedRegions[i])>=0) {
                                mergablity.ungroupable = true;
                                break;
                            }
                        }
                    }
                }
                //mergable
                if(selectedMarkers.length>1){
                    mergablity.growable = true;
                } else {
                    if(selectedMarkers.length==1){ //must have selected regions the are not part of this marker to be mergablity
                        markerRegions = selectedMarkers[0].split('+');
                        for(i=0;i<selectedRegions.length;i++){
                            if(markerRegions.indexOf(selectedRegions[i])==-1){
                                mergablity.growable = true;
                                break;
                            }
                        }
                    } else { // no selected markers, so check if selectedRegions not part of same marker (whether that marker is selected or not)
                        if(selectedRegions.length>1){
                            if(mergablity.ungroupable){
                                mergablity.growable = true;
                            } else {
                                mergablity['newMerge'] = true; //IE compatiblity for reserved keyword
                            }
                        }
                    }
                }
                $thisPanel.find('button.group').button((mergablity.newMerge||mergablity.growable)?'enable':'disable');
                $thisPanel.find('button.ungroup').button(mergablity.ungroupable?'enable':'disable');
            }
            $thisPanel.find('button.group').button({icons: {secondary: 'ui-icon-circle-plus'}}).off()
                .click(function(){
                    if(mergablity.newMerge){
                        if(!oGraph.mapsets.options.merges) oGraph.mapsets.options.merges = [];
                        oGraph.mapsets.options.merges.push($map.getSelectedRegions());
                    }
                    if(mergablity.growable){
                        var i, j, newMerge = [];
                        var selectedMarkers = $map.getSelectedMarkers();
                        var selectedRegions = $map.getSelectedRegions();
                        //step 1.  remove the existing merges of compound markers
                        for(i=0;i<selectedMarkers.length;i++){
                            newMerge = newMerge.concat(selectedMarkers[i].split("+"));
                            if(selectedMarkers[i].split("+").length>1){
                                for(j=0;j<oGraph.mapsets.options.merges.length;j++){
                                    if(selectedMarkers[i] == oGraph.mapsets.options.merges[j].join("+")){
                                        oGraph.mapsets.options.merges.splice(j, 1);
                                        break;
                                    }
                                }
                            }
                        }
                        //step 2 add merges to which a selected region belongs
                        for(i=0;i<selectedRegions.length;i++){
                            for(j=0;j<oGraph.mapsets.options.merges.length;j++){
                                if(oGraph.mapsets.options.merges[j].indexOf(selectedRegions[i])>-1){
                                    newMerge = newMerge.concat(oGraph.mapsets.options.merges.splice(j,1)[0]);
                                    break;
                                }
                            }
                        }
                        //step 3 add in new regions
                        for(i=0;i<selectedRegions.length;i++){
                            if(newMerge.indexOf(selectedRegions[i])==-1) newMerge.push(selectedRegions[i]);
                        }
                        oGraph.mapsets.options.merges.push(newMerge);
                    }
                    $map.removeAllMarkers();
                    $map.clearSelectedRegions();
                    bubbleCalc();
                    positionBubbles();
                    $map.series.regions[0].setAttributes(calculatedMapData.regionsColorsForBubbles);
                    makeDirty();
                });
            $thisPanel.find('button.ungroup').button({icons: {secondary: 'ui-icon-arrow-4-diag'}}).off()
                .click(function(){
                    var i, j;
                    var selectedMarkers = $map.getSelectedMarkers();
                    var selectedRegions = $map.getSelectedRegions();

                    for(i=0;i<selectedMarkers.length;i++){
                        if(selectedMarkers[i].split("+").length>1){
                            for(j=0;j<oGraph.mapsets.options.merges.length;j++){
                                if(selectedMarkers[i] == oGraph.mapsets.options.merges[j].join("+")){
                                    oGraph.mapsets.options.merges.splice(j, 1);
                                    break;
                                }
                            }
                        }
                    }
                    for(i=0;i<selectedRegions.length;i++){
                        for(j=0;j<oGraph.mapsets.options.merges.length;j++){
                            pos = oGraph.mapsets.options.merges[j].indexOf(selectedRegions[i]);
                            if(pos != -1){
                                oGraph.mapsets.options.merges[j].splice(pos, 1);
                                if(oGraph.mapsets.options.merges[j].length==0){
                                    oGraph.mapsets.options.merges.splice(j,1);
                                }
                                break;
                            }
                        }
                    }
                    $map.removeAllMarkers();
                    $map.clearSelectedRegions();
                    bubbleCalc();
                    positionBubbles();
                    $map.series.regions[0].setAttributes(calculatedMapData.regionsColorsForBubbles);
                    makeDirty();
                });
            var gLegend;
            $thisPanel.find('.legend').button().off().change(function(){
                if($(this).prop('checked')) {
                    oGraph.mapconfig.showLegend = true;
                    gLegend = makeLegend($map, {
                        legend: oGraph.mapconfig.legendLocation||'TR',
                        markers:{
                            fill:{
                                named:[
                                    {name:'coal', color:'#000000'},
                                    {name:'hydro', color:'#0000FF'},
                                    {name:'wind', color:'#00FF00'}
                                ]
                                //alternate to named =   variable: {colorValueMin: , colorValueMax, colorPos:, colorNeg:}
                            },
                            radius:{
                                maxRadius:50,
                                radiusValueMin:300, // missing for fixed radius (markers' single attribute is expressed in color)
                                radiusValueMax:12000  // missing for fixed radius (markers' single attribute is expressed in color)
                            }
                        },
                        regions:{
                            //discrete: [{color: 'lightblue', cutoff: 1000},{color: 'lightgreen', cutoff: 2000},{color: 'pink', cutoff: 3000},{color: 'yellow', cutoff: 5000}],
                            min:300,
                            max:1200,
                            colorPos:'#00FF00',
                            colorNeg:'#FF0000'
                        }
                    });
                } else {
                    gLegend.remove();
                }
            });
        }
        function makeLegend(map, options){
            var standardRadius=10, textCenterFudge=5, lineHeight=20, spacer=10, markerLegendWidth, regionLegendWidth, regionHeight= 0, markerHeight= 0, y, i, yOffset, xOffset;


            if(oGraph.mapsets){
                if(oGraph.mapsets.options.discrete){
                    regionLegendWidth=185;
                    regionHeight = lineHeight + 2*spacer + options.regions.discrete.length*(spacer+20);
                } else {
                    regionLegendWidth=100;
                    if(oGraph.calculatedMapData.regionDataMin<0 && oGraph.calculatedMapData.regionDataMax>0) {
                        regionHeight = 6*spacer+2*80+3*lineHeight;
                    } else {
                        regionHeight = 4*spacer+80+2*lineHeight;
                    }
                }
            } else regionLegendWidth=0;
            if(options.markers) {
                markerLegendWidth=185;
                if(options.markers.fill && options.markers.fill.named){
                    markerHeight += (options.markers.fill.named.length)*(spacer+2*standardRadius)+(markerHeight==0?spacer:0);
                }
                if(options.markers.radius && options.markers.radius.radiusValueMax){
                    markerHeight += 2*(spacer+options.markers.radius.maxRadius+(options.markers.radius.minRadius||5))+(markerHeight==0?spacer:0);
                }
            } else markerLegendWidth = 0;


            //use JVM to add a new group not subject to zooming, where map = new jvm.WorldMap({....});
            var gLegend = map.canvas.addGroup(); //variable scoped one level up;
            //for some reason, adding an (invisiable) element in JVM straightens out the coordinate system for IE
            map.canvas.addCircle({cx:0,cy:0}, {initial: {r:20, "fill-opacity": 0, "stroke-width":  0 }}, gLegend);

            //use the more complete Highcharts renderer, which must be instantiated on its own (hidden dummy) DIV
            $thisPanel.append('<div id="dummyLegend" class="hidden"></div>');
            var hcr = new Highcharts.Renderer($('#dummyLegend')[0], map.width, map.height);
            //redirect the Highcharts' renderer to add element to JVM's new group instead of the dummy div's group
            hcr.box = gLegend.node;
            $('#dummyLegend').remove();

            switch((options.legend||'B').substr(0,1)){
                case 'T':
                    yOffset = spacer;
                    break;
                case 'C':
                    yOffset = (map.height - Math.max(markerHeight,regionHeight))/2 - spacer;
                    break;
                case 'B':
                    yOffset = map.height - Math.max(markerHeight,regionHeight) - spacer;
            }

            switch((options.legend||'B').substr(1,1)){
                case 'L':
                    xOffset = spacer;
                    if(options.legend&&options.legend[0]=='T')xOffset+30; //space for zoom buttons
                    break;
                case 'C':
                    xOffset = (map.width-regionLegendWidth-markerLegendWidth)/2-spacer
                    break;
                case 'R':
                    xOffset = map.width-regionLegendWidth-markerLegendWidth-spacer;
            }
            //the main panel = has to be first because SVG understands only order, not understand z-index
            //rounded corner
            hcr.rect(xOffset, yOffset, markerLegendWidth+regionLegendWidth, Math.max(markerHeight,regionHeight), 5).attr({
                fill: 'white',
                opacity: 0.5,
                'stroke-width': 0
            }).add();


            var gradientAttributes = {
                opacity: 1,
                'stroke-width': 0,
                'z-index': 1000
            };

            //subfunction draws a 80H x 20W bar from 2 pixel slices
            function gradient(x, y, topColor, bottomColor){
                var rTop, gTop, bTop, rBot, gBot, bBot, r, g, b;
                rTop = parseInt(topColor.substr(1,2), 16);
                gTop = parseInt(topColor.substr(3,2), 16);
                bTop = parseInt(topColor.substr(5,2), 16);
                rBot = parseInt(bottomColor.substr(1,2), 16);
                gBot = parseInt(bottomColor.substr(3,2), 16);
                bBot = parseInt(bottomColor.substr(5,2), 16);
                for(var i=0;i<40;i++){
                    r = Math.round(rTop-(rTop-rBot)*i/39).toString(16);
                    g = Math.round(gTop-(gTop-gBot)*i/39).toString(16);
                    b = Math.round(bTop-(bTop-bBot)*i/39).toString(16);
                    hcr.rect(x, y+2*i, 20, 2, 0).attr({
                        fill: '#'+(r.length==1?'0':'')+r+(g.length==1?'0':'')+g+(b.length==1?'0':'')+b,
                        opacity: 1,
                        'stroke-width': 0,
                        'z-index': 1000
                    }).add();
                }

            }
            if(options.markers){
                if(options.markers.fill.named){
                    for(i=0;i<options.markers.fill.named.length;i++){
                        y = (i+1)*(spacer+2*standardRadius)-standardRadius;
                        hcr.circle(xOffset + spacer + standardRadius, yOffset + y, (options.markers.radius.maxRadius<standardRadius?options.markers.radius.maxRadius:standardRadius)).attr({
                            fill: options.markers.fill.named[i].color,
                            opacity: 1,
                            'fill-opacity': 1,
                            stroke: 'black',
                            'stroke-width': 1
                        }).add();
                        hcr.text(options.markers.fill.named[i].name, xOffset + 2*(spacer + standardRadius), yOffset + y).add();
                    }
                    y += standardRadius;
                } else {
                    //must be options.markers.fill.variable
                    //TODO:  variable color
                }
                if(options.markers.radius.radiusValueMax){
                    //min radius size
                    y += spacer+(options.markers.radius.minRadius||5);
                    var MarkerSizeAttributes = {
                        'fill-opacity': 0,
                        opacity: 1,
                        stroke: 'black',
                        'stroke-width': 1
                    };
                    hcr.circle(xOffset + spacer + options.markers.radius.maxRadius, yOffset + y, options.markers.radius.minRadius||5).attr(MarkerSizeAttributes).add();
                    hcr.text(options.markers.radius.radiusValueMin, xOffset + 2*(options.markers.radius.maxRadius+spacer), yOffset + y).css({fontSize: '12px'}).add();
                    y+= (options.markers.radius.minRadius||5) + spacer + options.markers.radius.maxRadius;

                    hcr.circle(xOffset + spacer + options.markers.radius.maxRadius, yOffset + y, options.markers.radius.maxRadius).attr(MarkerSizeAttributes).add();
                    hcr.text(options.markers.radius.radiusValueMax, xOffset + 2*(options.markers.radius.maxRadius+spacer), yOffset + y).css({fontSize: '12px'}).add();
                }
            }
            if(oGraph.mapsets){
                if(oGraph.mapsets.options.discrete){
                    for(i=0;i<options.regions.discrete.length;i++){
                        y = spacer + i*(spacer+20);
                        hcr.rect(xOffset + markerLegendWidth + spacer, yOffset + y, lineHeight, lineHeight, 0).attr({
                            fill: options.regions.discrete[i].color,
                            opacity: 1,
                            stroke: 'black',
                            'stroke-width': 1
                        }).add();
                        hcr.text((i==0?'&#8804; ':'&gt; ')+options.regions.discrete[i].cutoff, xOffset + markerLegendWidth + spacer + lineHeight + spacer, yOffset + y +lineHeight/2+textCenterFudge).css({fontSize: '12px'}).add();
                    }
                } else {
                    y = spacer;
                    hcr.text(oGraph.calculatedMapData.regionDataMax, xOffset + markerLegendWidth + spacer, yOffset + y+lineHeight/2+textCenterFudge).css({fontSize: '12px'}).add();
                    y += lineHeight + spacer;


                    if(oGraph.calculatedMapData.regionDataMax>0){
                        gradient(xOffset + markerLegendWidth + spacer, yOffset + y, oGraph.mapsets.options.posColor||MAP_COLORS.POS, MAP_COLORS.MID);
                        y += 80 + spacer;
                        if(oGraph.calculatedMapData.regionDataMin<0){
                            hcr.text('0', xOffset + markerLegendWidth + spacer, yOffset + y+lineHeight/2+textCenterFudge).css({fontSize: '12px'}).add();
                            y += lineHeight + spacer;
                        }
                    }
                    if(oGraph.calculatedMapData.regionDataMin<0){
                        gradient(xOffset + markerLegendWidth + spacer, yOffset + y, MAP_COLORS.MID, oGraph.mapsets.options.negColor||MAP_COLORS.NEG);
                        y += 80 + spacer;
                    }
                    hcr.text(oGraph.calculatedMapData.regionDataMin, xOffset + markerLegendWidth + spacer, yOffset + y+lineHeight/2+textCenterFudge).css({fontSize: '12px'}).add();
                    y += lineHeight + spacer;
                }
            }
            return gLegend;
        }
        function bubbleCalc(){ //defined in the closure, therefor has access to calculatedMapData and other variables specific to this panelGraph
            var dateKey, markerId, markerTitle, regionColors = primeColors.concat(hcColors); //use bright + Highcharts colors
            calculatedMapData.regionsColorsForBubbles={};
            calculatedMapData.markers={};
            var pnt = {x:100, y:100};  //somewhere in the US.  If this works, need to fetch geometric center of map (US, world, Europe..)
            if(isBubble()){
                var region, mergedSum, i=0, d, j, allMergedRegions = [];
                /*co-opt the marker variables:
                 calculatedMapData.markerDataMin
                 calculatedMapData.markerDataMax
                 calculatedMapData.markerData
                 calculatedMapData.markerAttr.r[dateKey][markerId]
                 calculatedMapData.markerAttr.stroke[dateKey][markerId]
                */


                //initialize markerData variable object
                var merge, mergeCode, markerData = {}, markerAttr = {r: {}, stroke: {}};
                for(d=calculatedMapData.startDateIndex;d<=calculatedMapData.endDateIndex;d++){
                    dateKey = calculatedMapData.dates[d].s;
                    markerData[dateKey] = {};  //initalize
                    markerAttr.r[dateKey] = {};
                    markerAttr.stroke[dateKey] = {};
                }
                calculatedMapData.markerDataMin = Number.MAX_VALUE; //initialized; to be minned against merged and single point values below
                calculatedMapData.markerDataMax = Number.MIN_VALUE;  //initialize; to be maxxed against merged and single point values below

                //1A: calculate the merge values within the graph date range as determined by calculatedMapData.startDateIndex and .endDateIndex
                if(oGraph.mapsets.options.merges){
                    for(i=0;i<oGraph.mapsets.options.merges.length;i++){
                        merge = oGraph.mapsets.options.merges[i];
                        mergeCode = merge.join('+');
                        markerTitle = calculatedMapData.title + ' for ' + mergeCode ;
                        calculatedMapData.markers[merge.join('+')] = {name: markerTitle, point: pnt, style: {fill: 'pink'}};
                        for(d=calculatedMapData.startDateIndex;d<=calculatedMapData.endDateIndex;d++){
                            mergedSum = 0;  //merging regions only adds.  There is no complex math
                            for(j=0;j<merge.length;j++){
                                mergedSum += calculatedMapData.regionData[calculatedMapData.dates[d].s][merge[j]]||0;
                            }
                            markerData[calculatedMapData.dates[d].s][mergeCode] = {r: mergedSum};
                            if(mergedSum!==null){ //Math object methods treat nulls as zero
                                calculatedMapData.markerDataMin = Math.min(calculatedMapData.markerDataMin, mergedSum);
                                calculatedMapData.markerDataMax = Math.max(calculatedMapData.markerDataMax, mergedSum);
                            }
                        }
                        for(j=0;j<merge.length;j++){
                            calculatedMapData.regionsColorsForBubbles[merge[j]] = regionColors[i%regionColors.length];
                        }
                        allMergedRegions = allMergedRegions.concat(merge);
                    }
                }

                //1B: calculate the unmerged values (also within the graph date range as determined by calculatedMapData.startDateIndex and .endDateIndex)
                for(region in calculatedMapData.regionData[calculatedMapData.dates[0].s]){
                    if(allMergedRegions.indexOf(region) == -1 && calculatedMapData.regionData[calculatedMapData.dates[0].s][region]){  //this region is not part of a amerge and also has data
                        markerTitle = calculatedMapData.title + ' - ' + region;
                        calculatedMapData.markers[region] = {name: markerTitle, point: pnt, style: {fill: 'pink'}};
                        calculatedMapData.regionsColorsForBubbles[region] = regionColors[i++%regionColors.length];
                        for(d=calculatedMapData.startDateIndex;d<=calculatedMapData.endDateIndex;d++){
                            dateKey = calculatedMapData.dates[d].s;
                            markerData[dateKey][region] = {r: calculatedMapData.regionData[dateKey][region]};
                            if(markerData[dateKey][region].r!==null){ //Math object methods treat nulls as zero
                                calculatedMapData.markerDataMin = Math.min(calculatedMapData.markerDataMin, markerData[dateKey][region].r);
                                calculatedMapData.markerDataMax = Math.max(calculatedMapData.markerDataMax, markerData[dateKey][region].r);
                            }
                        }
                    }
                }
                //2.  go back and create attribute (.r and .stroke) objects
                var rScale = (oGraph.mapconfig.radius || DEFAULT_RADIUS_SCALE) / Math.sqrt(Math.max(Math.abs(calculatedMapData.markerDataMax), Math.abs(calculatedMapData.markerDataMin)));
                for(dateKey in markerData){
                    for(markerId in markerData[dateKey]){
                        rData = markerData[dateKey][markerId].r || null;
                        markerAttr.r[dateKey][markerId] = rScale *  Math.sqrt(Math.abs(rData));
                        markerAttr.stroke[dateKey][markerId] = rData<0?'#ff0000':'#000000'; //create the style object with the stroke = RED for neg numbers
                    }
                }

                calculatedMapData.markerData = markerData;  //set (or replace if user is adding and removing merges)
                calculatedMapData.markerAttr = markerAttr;
            }
        }

        function geometricCenter(regions){
            var bBox, totalArea=0, xArm=0, yArm=0, center;
            for(var i=0;i<regions.length;i++){  //iterate through the list
                bBox = $g.find('path[data-code='+regions[i]+']').get(0).getBBox();
                xArm += (bBox.x + bBox.width/2) * bBox.width * bBox.height;
                yArm += (bBox.y + bBox.height/2) * bBox.width * bBox.height;
                totalArea +=  bBox.width * bBox.height;
            }
            center = {
                x: (xArm / totalArea + $map.transX) * $map.scale,
                y: (yArm / totalArea + $map.transY) * $map.scale
            };
            return center;
        }

        function positionBubbles(){  //must be called after map creation in order to get x-y coordinates of SVG boundingBoxes and to use jvMap's pointToLatLng method
            var center, latLng;
            if(isBubble()){
                var region, i=0, j, allMergedRegions = [];
                if(oGraph.mapsets.options.merges){
                    for(i=0;i<oGraph.mapsets.options.merges.length;i++){
                        center = geometricCenter(oGraph.mapsets.options.merges[i]);
                        latLng = $map.pointToLatLng(center.x, center.y);
                        calculatedMapData.markers[oGraph.mapsets.options.merges[i].join('+')].latLng = [latLng.lat, latLng.lng];
                        allMergedRegions = allMergedRegions.concat(oGraph.mapsets.options.merges[i]);
                    }
                }
                $g.find('path[data-code]').each(function(){
                    region  = $(this).attr('data-code');
                    if(allMergedRegions.indexOf(region) == -1 && calculatedMapData.regionData[calculatedMapData.dates[0].s][region]){  //this region is not part of a amerge and also has data
                        center = geometricCenter([region]);
                        latLng = $map.pointToLatLng(center.x, center.y);
                        calculatedMapData.markers[region].latLng = [latLng.lat, latLng.lng]; //TODO: calc value and set color
                    }
                });
                /*                for(var m in calculatedMapData.markers){
                 $map.addMarker()
                 }*/
                $map.addMarkers(calculatedMapData.markers); //if the marker id exists, this method will reposition the marker
                //$map.series.markers[0].setAttributes (getMapDataByContainingDate(calculatedMapData.markerData,calculatedMapData.dates[val].s));
            }
        }
    }
    function isBubble(){
        return  oGraph.mapsets && oGraph.mapsets.options.mode && oGraph.mapsets.options.mode=='bubble';
    }
    console.timeEnd('buildGraphPanel');
    unmask();
    setPanelHash();
}










//HELPER FUNCTIONS

//This object performs all of the task associated with editing and setting the chart title
var graphTitle = {
    show: function(oTitle, callback){
        $('.showTitleEditor').click();
        var thisPanelID = $(oTitle).closest('div.graph-panel').get(0).id;
        $('#titleEditor input').attr('data',thisPanelID).val(oPanelGraphs[thisPanelID].title);
        $("#fancybox-wrap").stop().css({
            'top': '55px',
            'left': '50px'
        });
        $('#titleEditor input').css("width","450px").focus();
        this.callback = callback;
    },
    callBack: false,
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
        if(this.callback) this.callback();
        $('#' + thisPanelID + ' .highcharts-title').click(function(){graphTitle.show(this)});
        this.changeCancel();
    },
    changeCancel: function(){
        $.fancybox.close();
        this.callBack = false;
    }
};

function plotName(graph, plot, forceCalculated){
    var handle, comp, c, calcName='';
    if(typeof(plot.options.name)!="undefined" && plot.options.name!='' && !forceCalculated){
        return plot.options.name;
    } else {
        //calculate from components
        var isDenom = false;
        for(c=0;c<plot.components.length;c++){  //application requirements:  (1) array is sorted by op (2) + and - op have common units
            comp = plot.components[c];
            handle = comp.handle;
            calcName += ((c!=0 && comp.options.op)?((comp.options.dn=='d'&&!isDenom)?' / ':' '+comp.options.op+' '):' ') + graph.assets[handle].name;
            isDenom = comp.options.dn=='d' || isDenom;
        }
        return calcName;
    }
}
function plotUnits(graph, plot, forceCalculated, formulaObj){
    var c, i, terms, numUnits = '', denomUnits = '';
    //short cut for single component plots
    if(plot.components.length==1){
        return plot.options.units || (plot.components[0].op=='/'?'per ':'') + graph.assets[plot.components[0].handle].units;
    }
    if(!plot.options.units || forceCalculated){
        //calculate from component series
        if(!formulaObj) formulaObj = plotFormula(plot);
        // remove any leading negative sign or numerator "1" to not trip ourselves up
        replaceFormula('^(\-)?(1)?','');
        //1. remove any numerical scalor and flag
        var patKs=/[0-9]+/g;
        var scalorFlag = patKs.test(formulaObj.numFormula) || patKs.test(formulaObj.denomFormula);
        formulaObj.numFormula = formulaObj.numFormula.replace(patKs, ' ');
        formulaObj.denomFormula = formulaObj.denomFormula.replace(patKs, ' ');
        //2. remove any numerical scalers K
        var patRemoveOps = /(\*|\(|\))/g;
        formulaObj.numFormula = formulaObj.numFormula.replace(patRemoveOps, ' ');
        formulaObj.denomFormula = formulaObj.denomFormula.replace(patRemoveOps, ' ');
        var patPer = /\//g;
        formulaObj.numFormula = formulaObj.numFormula.replace(patPer, 'per');
        formulaObj.denomFormula = formulaObj.denomFormula.replace(patPer, 'per');
        var patMinus = /-/g;
        formulaObj.numFormula = formulaObj.numFormula.replace(patMinus, '+');
        formulaObj.denomFormula = formulaObj.denomFormula.replace(patMinus, '+');
        var patWhiteSpace = /[\s]+/g;
        formulaObj.numFormula = formulaObj.numFormula.replace(patWhiteSpace, ' ');
        formulaObj.denomFormula = formulaObj.denomFormula.replace(patWhiteSpace, ' ');
        //3. wrapped variable in code to prevent accident detection in next step
        replaceFormula('([A-Z]+)','{{$1}}');
        //4. swap in units (removing any + signs)
        var patPlus = /\+/g;
        for(c=0;c<plot.components.length;c++){  //application requirements:  (1) array is sorted by op (2) + and - op have common units
            replaceFormula('{{'+compSymbol(c)+'}}', (graph.assets[plot.components[c].handle].units||'').replace(patPlus,' '));
        }
        var error = false;
        if(formulaObj.numFormula!=''){
            terms = formulaObj.numFormula.split('+');
            numUnits = terms[0].trim();
            for(i=1;i<terms.length;i++){
                if(terms[i].trim()!=numUnits) error = true;
            }
        }
        if(formulaObj.denomFormula!=''){
            terms = formulaObj.denomFormula.split('+');
            denomUnits = terms[0].trim();
            for(i=1;i<terms.length;i++){
                if(terms[i].trim()!=terms[0]) error = true;
            }
        }
        if(error){
            return 'potentially mismatched units';
        } else {
            if(numUnits==denomUnits && numUnits.length>0){
                return 'ratio';
            } else {
                return  (scalorFlag?'user scaled ':'') + numUnits + (denomUnits==''?'':' per ' + denomUnits);
            }
        }
    } else {
        return plot.options.units;
    }

    function replaceFormula(search, replace){
        var pat = new RegExp(search, 'g');
        formulaObj.numFormula = formulaObj.numFormula.replace(pat, replace);
        formulaObj.denomFormula = formulaObj.denomFormula.replace(pat, replace);
    }
}
function panelIdContaining(cntl){  //uniform way of getting ID of active panel for user events
    var visPan = $(cntl).closest('div.graph-panel:visible');
    if(visPan.length==1){
        return visPan.get(0).id;
    } else {
        return null;
    }
}
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
    var pat, dt = new Date(dateString + " UTC");  //this should work for year, month, day, and hours
    if(dt.toString()!="NaN")return dt;
    pat = /^W[0-5]{0-1}[0-9]{1}\s[0-9]{4}/i;
    if(pat.test(dateString)){
        dt = new Date(parseInt(dateString.substr(3))+' UTC');
        return dt.setUTCMonth((parseInt(dateString.charAt(1))-1)*3);
    }
    //quarter?
    pat = /^Q[1-4]{1}\s[0-9]{4}/i;
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
var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function formatDateByPeriod(val, period) { //helper function for the data tables
    if(isNaN(val)==false) {
        var dt = new Date(parseInt(val));
        switch(period){
            case 'A': return dt.getUTCFullYear();
            case 'Q': return ('Q'+ parseInt((dt.getUTCMonth()+3)/3) +' '+ dt.getUTCFullYear());
            case 'SA':
            case 'M': return months[dt.getUTCMonth()]+' '+dt.getUTCFullYear();
            case 'W':
            case 'D': return dt.getUTCDate() + ' ' + months[dt.getUTCMonth()] + ' ' + dt.getUTCFullYear();
            default: return dt.toUTCString().substr(5,20);
        }
    }
    else
    {
        return null;
    }
}
function calcGraphMinMaxZoomPeriod(oGraph){
    oGraph.smallestPeriod = "A";
    oGraph.largestPeriod = "N";
    var min, max, jsdt, handle;
    for(key in oGraph.assets){
        if(!oGraph.assets[key].firstdt && (key.charAt(0)=='M' || key.charAt(0)=='X')){
            for(handle in oGraph.assets[key].data){
                jsdt = oGraph.assets[key].data[handle].firstdt;
                oGraph.assets[key].firstdt = Math.min(oGraph.assets[key].firstdt, jsdt)||jsdt;
                jsdt = oGraph.assets[key].data[handle].lastdt;
                oGraph.assets[key].lastdt = Math.max(oGraph.assets[key].lastdt, jsdt)||jsdt;
            }
        }
        if(period.value[oGraph.smallestPeriod]>period.value[oGraph.assets[key].period]) oGraph.smallestPeriod = oGraph.assets[key].period;
        if(period.value[oGraph.largestPeriod]<period.value[oGraph.assets[key].period]) oGraph.largestPeriod = oGraph.assets[key].period;

        jsdt = oGraph.assets[key].firstdt;
        min = Math.min(jsdt, min)  || jsdt;
        jsdt = oGraph.assets[key].lastdt;
        max = Math.max(jsdt, max)  || jsdt;
    }
    oGraph.firstdt = min;
    oGraph.lastdt = max;
    oGraph.minZoom = oGraph.start || oGraph.firstdt;
    oGraph.maxZoom = oGraph.end || oGraph.lastdt;
}

