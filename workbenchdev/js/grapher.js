"use strict";
/*
 grapher.js
 */
MashableData.grapher = function(){
    var MD = MashableData,
        globals = MD.globals,
        common = MD.common,
        mapsList = globals.maps,
        panelGraphs = globals.panelGraphs,
        period = globals.period,
        patVariable = globals.patVariable,
        hcColors = globals.hcColors,
        primeColors = globals.primeColors,
        MAP_COLORS = globals.MAP_COLORS,
        DEFAULT_RADIUS_SCALE = globals.DEFAULT_RADIUS_SCALE,
        DEFAULT_RADIUS_FIXED = globals.DEFAULT_RADIUS_FIXED,
        dashStyles = globals.dashStyles,
        op = globals.op,
        oMyGraphs = globals.MyGraphs,
        isIE = globals.isIE,
        dateFromMdDate = common.dateFromMdDate,
        rationalize = common.rationalize,
        callApi = common.callApi;
    var grapher = {
        chartPanel: function chartPanel(panelId){  //MAIN CHART OBJECT, CHART PANEL, AND MAP FUNCTION CODE
            console.time('chartPanel');
            //panelId  = key to panelGraphs object
            var oGraph = panelGraphs[panelId];
            console.time('makeChartOptionsObject');
            var oChartOptions = makeChartOptionsObject(oGraph);
            console.timeEnd('makeChartOptionsObject');
            var $chart = oGraph.controls.$thisPanel.find('div.mashabledata_chart');
            if(oChartOptions.series.length==0){
                $chart.hide();
                return void 0;
            }
            var chart;  //the rendered HighChart object set below on render and reference in oChartOptions events
            if(oGraph.controls && oGraph.controls.chart) {
                oGraph.controls.chart.destroy();
                $.contextMenu('destroy', '#' + panelId + ' div.mashabledata_chart');
            }
            //final additions to the HC Chart Object
            oChartOptions.chart.renderTo = $chart.get(0);
            var annotations = oGraph.controls.annotations;
            if(globals.isEmbedded){
                //embedded charts need interact with map, but no annotations!
                oChartOptions.plotOptions.series.point = {
                    events: {
                        click: function(evt){ setMapDate(this.x);}
                    }
                };
                oChartOptions.chart.events = {
                    click: function(e){ setMapDate(e.xAxis[0].value); }
                };
            } else {
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
                        var chart = oGraph.controls.chart; //if chart is redrawn, the closure var is null
                        var min;
                        var max;
                        if(event.resetSelection){
                            if(chart.cropButton) chart.cropButton = chart.cropButton.destroy();
                            oGraph.minZoom = (oGraph.start===null)?oGraph.firstdt:oGraph.start;
                            oGraph.maxZoom = (oGraph.end===null)?oGraph.lastdt:oGraph.end;
                        } else {
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
            }
            console.time('highcharts');
            chart = new Highcharts.Chart(oChartOptions);
            if(oGraph.controls) oGraph.controls.chart = chart;
            console.timeEnd('highcharts');
            annotations.plotAnnotationSeries();  //linear regressions, averages...
            //for a highcharts div mouseover event that translates to X and Y axis coordinates:  http://highslide.com/forum/viewtopic.php?f=9&t=10204
            if(!globals.isEmbedded){
                $chart
                    .mouseover(function(e){
                        var chart = oGraph.controls.chart; //if chart is redrawn, the closure var is null
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
                                                color: common.equivalentRGBA(colorsPlotBands[0], BAND_TRANSPARENCY),
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
                        var chart = oGraph.controls.chart; //if chart is redrawn, the closure var is null
                        if(annotations.banding && e){
                            for(var a=0;a<chart.axes.length;a++){
                                chart.axes[a].removePlotLine(annotations.banding);  //does not error if not found
                                chart.axes[a].removePlotBand(annotations.banding);
                            }
                            annotations.banding = false;
                        }
                    });
                console.time('contextMenu');
                $.contextMenu({
                    selector: '#' + panelId + ' div.mashabledata_chart',
                    build: function($trigger, e) {  //menu is built or cancelled dynamically in build function startin on the following line
                        var i, x, y, top, left;
                        var axisName, axisValue, isRegression, isAverage;
                        var pointSelected = annotations.mouseoverPoint;  //grab reference (set by a HighCharts' event) before point's mouseout event can delete it
                        var onPoint = (typeof(annotations.mouseoverPoint)!="undefined");
                        if(annotations.banding){ // false if not actively x or y banding
                            return annotations.endBanding(e);
                        } else {
                            var mnu = {
                                className: 'annotations-context-menu-title',
                                items: {
                                    point: {name: "annotate point",
                                        disabled: !onPoint,
                                        callback: function(key, opt){ annotations.addPoint(pointSelected) }
                                    },
                                    "sep0": "---------",
                                    vline: {name: "add date line",
                                        disabled: !onPoint,
                                        callback: function(key, opt){ annotations.addXLine(pointSelected) }
                                    },
                                    vband: {name: "start date band",
                                        disabled: !onPoint,
                                        callback: function(key, opt){ annotations.startXBand(pointSelected); }
                                    },
                                    "sep1": "---------",
                                    hline: {name: "add horizontal line", items:{} },
                                    hband: {name: "start horizontal band", items:{} },
                                    "sep2": "---------",
                                    avg: {name: "start average",
                                        disabled: !onPoint,
                                        callback: function(key, opt){
                                            if(!isAverage){
                                                annotations.startAnalysisBanding(pointSelected, 'AV');
                                            } else {
                                                annotations.deleteAnalysis(pointSelected);
                                            }
                                        }
                                    },
                                    regression: {name: "start linear regression",
                                        disabled: !onPoint,
                                        callback: function(key, opt){
                                            if(!isRegression){
                                                annotations.startAnalysisBanding(pointSelected, 'LR');
                                            } else {
                                                annotations.deleteAnalysis(pointSelected);
                                            }
                                        }
                                    },
                                    //rolling: {name: "add rolling average", disabled: !onPoint, items: {}},  //add choices depending on freq
                                    standard: {name: "add standard annotations", className: 'standard-anno-context-menu', items: {}}
                                }
                            };
                            if(onPoint && pointSelected.series.options.calculatedFrom && pointSelected.series.options.id.substr(0,2)=='LR') {
                                mnu.items.regression.name = "delete linear regression";
                                mnu.items.regression.className ="delete-item";
                                isRegression = true;
                                delete mnu.items.avg;
                            }
                            if(onPoint && pointSelected.series.options.calculatedFrom && pointSelected.series.options.id.substr(0,2)=='AV') {
                                mnu.items.avg.name = "delete average";
                                mnu.items.avg.className ="delete-item";
                                isAverage = true;
                                delete mnu.items.regression;
                            }
                            var chart = oGraph.controls.chart; //if chart is redrawn, the closure var is null
                            top = $(chart.container).offset().top;
                            left = $(chart.container).offset().left;
                            x = (isIE ? e.originalEvent.x : e.clientX - left) - chart.plotLeft;
                            y = (isIE ? e.originalEvent.y : e.pageY - top) - chart.plotTop;
                            if(y >= 0 && y <= chart.plotSizeY ) {
                                for(i=0;i<chart.yAxis.length;i++){
                                    axisName = chart.yAxis[i].userOptions.title.text.trim();
                                    axisValue =  parseFloat(parseFloat(chart.yAxis[i].translate(chart.plotHeight-y, true).toPrecision(2))) ;
                                    if(i!=0) {
                                        mnu.items.hline.items['yadd'+i+"sep"] = "---------";
                                        mnu.items.hband.items['yadd'+i+"sep"] = "---------";
                                    }
                                    mnu.items.hline.items['hltext'+i] = {
                                        name: (axisName||'y axis value') + ':',
                                        type: 'text',
                                        value: axisValue};
                                    mnu.items.hline.items['hladd'+i] = {
                                        name: 'ADD',
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
                                    mnu.items.hband.items['hbtext'+i] = {name: (axisName || 'y axis') + ':', type: 'text', value: axisValue};
                                    mnu.items.hband.items['hbadd'+i] = {
                                        name: 'START',
                                        callback: function(key, opt){
                                            //START AN HBAND
                                            annotations.bandStartPoint = parseFloat($.contextMenu.getInputValues(opt)['hbtext'+key.substr(5)]);
                                            annotations.banding = 'y-'+chart.yAxis[key.substr(5)].userOptions.title.text;
                                            chart.yAxis[parseInt(key.substr(5))].addPlotBand({
                                                id: 'hb'+annotations.bandNo++,
                                                color: common.equivalentRGBA(colorsPlotBands[0], BAND_TRANSPARENCY),
                                                from: annotations.bandStartPoint,
                                                to: annotations.bandStartPoint
                                            });
                                        }
                                    };
                                }
                            } else {
                                if(!onPoint)
                                    return false;  //nothing enabled therefore do not show
                                mnu.items.hline.disabled = true;
                                mnu.items.hband.disabled = true;
                            }
                            //standard annos
                            for(i=0;i<MD.globals.standardAnnotations.length;i++){
                                mnu.items.standard.items["SA"+MD.globals.standardAnnotations[i].annoid] = {
                                    name: MD.globals.standardAnnotations[i].name,
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
            }
            console.timeEnd('chartPanel');
            return chart;
            //PRIVATE METHODS
            function setMapDate(jsDateClicked){
                var calcData = oGraph.calculatedMapData;
                if(oGraph.mapsets || oGraph.pointsets){
                    if(calcData.startDateIndex!=calcData.endDateIndex){ //skip if map has only a single date
                        var jsDate = closestDate(jsDateClicked, calcData.dates);
                        for(var i=0;i<calcData.dates.length;i++){
                            if(calcData.dates[i]['dt'].getTime()==jsDate){
                                oGraph.controls.$thisPanel.find('.mashabledata_map-slider').slider('value',i);
                            }
                        }
                    }
                }
            }
        },
        intervalStartDt: function intervalStartDt(graph){
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
        },
        setCropSliderSpinner: function setCropSliderSpinner(panelId){  //get closest point to recorded js dt
            if(globals.isEmbedded) return;  //not available for embedded graphs
            var leftIndex, rightIndex, maxIndex, i, bestDelta, thisDelta, chartOptions, oGraph = panelGraphs[panelId];
            if(oGraph.isEmpty()) return;
            if(oGraph.controls.chart){
                chartOptions = oGraph.controls.chart.options.chart;
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
                maxIndex  = chartOptions.x.length-1;
            } else {
                leftIndex = oGraph.calculatedMapData.startDateIndex;
                rightIndex = oGraph.calculatedMapData.endDateIndex;
                maxIndex = oGraph.calculatedMapData.dates.length - 1;
            }
            $('#' + panelId + ' div.crop-slider')
                .slider("option", "max", maxIndex)
                .slider("option", "values", [leftIndex, rightIndex]);
            $('#' + panelId + ' span.interval-crop-period').html(period.units[oGraph.largestPeriod]+'s');
            $('#' + panelId + ' input.interval-crop-count').spinner('option', 'max', maxIndex)
        },
        closestDate: function closestDate(nearbyDate, seriesData, closestYet){
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
        },
        createMyGraph: function createMyGraph(ghash, onComplete){ //id can either be a graph id (int) or a ghash
            console.time('createMyGraph');
            var graphModel;
            //1. check to see if the blueprint of an embedded graph is preloaded as a script
            if(globals.isEmbedded){
                if(MashableData.globals.graphBluePrints[ghash]){
                    graphModel = new MD.Graph(MashableData.globals.graphBluePrints[ghash]);
                    graphModel.fetchMap();  //if the bluePrint is loaded, so should the map def.  This call is (a) for insurance and (b) creates derivative maps as needed
                    _createGraph();  //new obj for API = no need to create working copy
                } else {
                    require(['//www.mashabledata.com/graph_data/'+ghash+'.js'], function(){
                        graphModel = new MD.Graph(MashableData.globals.graphBluePrints[ghash]);
                        _createGraph();
                    });
                }
                callApi({command: 'GetEmbeddedGraph', ghash: ghash, logonly: true}); //still log the embedded usage (non-blocking and no data is fetched)
            } else {
                callApi(
                    {command: globals.isEmbedded?'GetEmbeddedGraph':'GetFullGraph', ghash: ghash},
                    function(oReturn, textStatus, jqXH){
                        for(var ghandle in oReturn.graphs){
                            //if user wants to save, it must be saved as a copy if graph.userid <> this user (enforced in API too)
                            graphModel = new MD.Graph(oReturn.graphs[ghandle]);
                            graphModel.fetchMap();  //prefetch and continue proocessing without waitng for call back (a second gating fetchMap() call occurs deep inside buildGraphPanel() just before map draw)
                            // if(globals.isEmbedded){
                            MashableData.globals.graphBluePrints[ghash] = oReturn.graphs[ghandle]; //share if shown twice on same webpage
                            if(document.URL.indexOf('mashabledata.com/preview')!==-1){
                                //for preview pages, show the data and the map file in a DIV as part of the instructions for high volume websites
                                var graphDataHtml = 'MashableData.globals.graphBluePrints["'+ghash+'"] = ' + JSON.stringify(oReturn.graphs[ghandle]);
                                var $JsonDiv = $('#MashableData_graphData');
                                $JsonDiv.html($JsonDiv.html() + '&#13;&#10;&#13;&#10;' + graphDataHtml + '&#13;&#10;&#13;&#10;');
                                if(graphModel.mapFile){
                                    $.get('/global/js/maps/'+ graphModel.mapFile +'.js', function(mapDef){
                                        $JsonDiv.html($JsonDiv.html() + mapDef + '&#13;&#10;');
                                    });
                                }
                            }
                        }
                        _createGraph();  //new obj for API = no need to creat working copy
                    }
                );
            }
            function _createGraph(){
                if(globals.isEmbedded){
                    buildGraphPanel(graphModel);  //panelId not passed -> new panel
                    if(onComplete) onComplete();
                } else {
                    require(globals.graphScriptFiles, function(){ //blocking check to ensure required libraries have loaded
                        buildGraphPanel(graphModel);  //panelId not passed -> new panel
                        if(onComplete) onComplete();
                    });
                }
            }
            console.timeEnd('createMyGraph');
        },
        makeChartOptionsObject: function makeChartOptionsObject(oGraph){
            console.time('makeChartOptionsObject');
            calcGraphMinMaxZoomPeriod(oGraph);
            var i, j, dt, allX = {}, xVals = {};
            var	jschart = {
                chart:
                {
                    animation: false,
                    type: 'line',
                    zoomType: 'x',
                    x: []
                },
                exporting: {enabled: false},  //don't show buttons.  Access through interface.
                plotOptions: {
                    area: {stacking: 'normal'},
                    series: {
                        zIndex: 10,
                        marker: {
                            enabled: true,
                            radius: 3,
                            symbol: 'circle',
                            //fillColor: '#FFFFFF',
                            //lineColor: null,
                            states: {
                                hover: {
                                    enabled: true
                                }
                            }
                        },
                        shadow: false,
                        states: { hover: {lineWidthPlus: 1}},
                        dataLabels:{
                            align: 'center',
                            enabled:true,
                            color:'#ffffff',
                            formatter:function(){
                                if( typeof(this.point.id) != 'undefined' ){
                                    return this.point.id;
                                }
                            },
                            y:11,
                            x:-1
                        }
                    }
                },
                legend: { enabled : true},
                credits: {
                    enabled: true,
                    text: oGraph.literal('src'),
                    href:  'http://www.mashabledata.com'
                },
                series: [],
                title: {
                    text: oGraph.title,
                    style: {cursor: 'pointer'}
                },
                //tooltip: {shared:true, crosshairs:[true,false]},
                xAxis: {
                    type: 'datetime',
                    min: (oGraph.start===null)?(oGraph.intervals?intervalStartDt(oGraph):null):parseInt(oGraph.start),
                    max: (oGraph.end===null)?null:parseInt(oGraph.end)

                    //maxZoom: 10 * 365 * 24 * 3600 * 1000
                },
                yAxis: [],
                tooltip: {
                    formatter: function(){  //shorten the data accord to period; add commas to number; show units
                        return'<b>' + this.series.name.trim() + '</b><br>' +MD.grapher.formatDateByPeriod(this.point.x, this.series.options.freq) + ':'
                            + Highcharts.numberFormat(this.y,(parseInt(this.y)==this.y?0:3),'.',',') + ' ' + this.series.yAxis.options.title.text
                            + (this.point.id&&this.point.text?'<br><br>'+this.point.text:'');
                    }
                }
            };
            //TODO:  use title, graph controls, and analysis box heights instead of fixed pixel heights
            if(oGraph.controls) jschart.chart.height = (oGraph.controls.$thisPanel.height()-70 - (oGraph.map?70:0)) * ((oGraph.mapsets||oGraph.pointsets)?0.4:1); //leave space for analysis textarea
            if(oGraph.title.length==0){
                jschart.title.text = 'untitled - click to edit';
                jschart.title.style.color= 'grey';
                jschart.title.style.font= 'italic'
            }
            //loop through the data rows
            var lineIndex = 0;

            //MashableData's time conversion series are mathematical creations. Make data as needed
            function _firstLast(plotOrGraph, mashableDataDaysPerSeries){
                //delete plot.firstdt;
                //delete plot.lastdt;
                plotOrGraph.eachComponent(function(component){
                    if(typeof component.firstdt != 'undefined' && component.src != 'MashableData'){
                        mashableDataDaysPerSeries.firstdt = typeof mashableDataDaysPerSeries.firstdt == 'undefined' ? parseInt(component.firstdt) : Math.min(parseInt(component.firstdt), parseInt(mashableDataDaysPerSeries.firstdt));
                        mashableDataDaysPerSeries.lastdt = typeof mashableDataDaysPerSeries.lastdt  == 'undefined' ? parseInt(component.lastdt ) : Math.max(parseInt(component.lastdt ), parseInt(mashableDataDaysPerSeries.lastdt));
                    }
                });
            }

            //find and create any mathematical days per interval series
            oGraph.eachPlot(function(){
                var plot = this;
                plot.eachComponent(function(component){
                    if(this.src == 'MashableData'){
                        var mashableDataDaysPerSeries = this;
                        delete mashableDataDaysPerSeries.firstdt;  //database has 0, but these are not true first and last data dates...
                        delete mashableDataDaysPerSeries.lastdt;   //..or they could be left over from a previous configuration
                        _firstLast(plot, mashableDataDaysPerSeries);
                        if(typeof mashableDataDaysPerSeries.lastdt  == 'undefined')  _firstLast(oGraph, mashableDataDaysPerSeries);
                        mashableDataDaysPerSeries.data = MashableData.common.dateConversionData(mashableDataDaysPerSeries);
                    }
                });
            });

            oGraph.eachComponent(function(i, plot){
                if(this.src == 'MashableData'){
                    var MashableSeries = this;
                    //if single component, use start and end of graph else use start and end of plot components
                    if(plot.components.length==1){
                        if(!oGraph.firstdt&&!oGraph.lastdt) oGraph.eachComponent(function(){ _firstLast(oGraph, oGraph.assets[this.handle()]) });
                        this.firstdt = oGraph.firstdt;
                        this.lastdt = oGraph.lastdt;
                    } else {
                        delete MashableSeries.firstdt;
                        delete MashableSeries.lastdt;
                        plot.eachComponent(function(){_firstLast(MashableSeries, this)});
                    }
                }
            });
            for(i=0;i<oGraph.plots.length;i++){
                var oPlot = oGraph.plots[i];
                var oSerie = oPlot.createHighSeries();
                if(!oPlot.options.color) oPlot.options.color = nextColor(oGraph.plots);
                var oDataSeries = {
                    name: oSerie.name,
                    marker: {enabled: oGraph.type=='marker'},
                    id: 'P'+i,
                    freq: oSerie.freq,
                    color: oPlot.options.color,
                    data: oSerie.data,
                    yAxis: 0
                };
                if(oPlot.options.type){
                    if(oPlot.options.type!='default') oDataSeries.type = oPlot.options.type;
                }
                if(oPlot.options.lineWidth) {
                    oDataSeries.lineWidth = oPlot.options.lineWidth;
                    oDataSeries.states = {hover: {lineWidth: parseInt(oPlot.options.lineWidth)+2}};
                }
                if(oPlot.options.lineStyle) oDataSeries.dashStyle  = oPlot.options.lineStyle;
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
                        newAxis.title.style.color = oDataSeries.color;
                        newAxis.labels.style.color = oDataSeries.color;
                        jschart.yAxis[0].title.style.color = jschart.series[0].color; //axis is black for single axis; color is added for two or more axes
                        jschart.yAxis[0].labels.style.color = jschart.series[0].color;
                        newAxis.opposite = true;
                        jschart.yAxis.push(newAxis);
                        oDataSeries.yAxis = iAxis;
                    }
                }
                jschart.series.push(oDataSeries);
                lineIndex++
            }
            // additional series object process for specialty charts
            for(var key in allX){
                jschart.chart.x.push(Number(key));
            }
            jschart.chart.x.sort(function(a,b){return parseInt(a)-parseInt(b)});

            //note: annotation markers (and lines and bands) added by annonator after chart is made by updating the points
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
                case "marker":
                    //handle in series creation
                    break;
                case "auto":
                    if(oGraph.smallestPeriod!=oGraph.largestPeriod ){
                        for(i=0;i<jschart.series.length;i++){
                            if(oGraph.largestPeriod == jschart.series[i].freq){  //convert the largest periods to column if multi-frequency (ie. if monthly + quarterly + annual, only annual data become columns) or very short series
                                jschart.series[i].type = 'column';
                                jschart.series[i].zIndex = 8;
                                jschart.series[i].pointRange = period.value[jschart.series[i].freq];
                                jschart.series[i].pointPlacement = 'between';
                                jschart.series[i].pointPadding = 0; //default 0.1
                                jschart.series[i].groupPadding = 0.05; //default 0.2
                            }
                        }
                    } else {  //all frequencies the same; see if we have very short series
                        var maxCount = 0, onscreenCount;
                        for(i=0;i<jschart.series.length;i++){
                            if(jschart.series[i].freq){  //scatter series used for annotations does not have a freq property = skip these
                                onscreenCount = 0;
                                for(j=0;j<jschart.series[i].data.length;j++){
                                    dt = jschart.series[i].data[j][0];
                                    if((!jschart.xAxis.min || jschart.xAxis.min<=dt) && (!jschart.xAxis.max || jschart.xAxis.max>=dt)) onscreenCount++;
                                }
                                maxCount = Math.max(maxCount, onscreenCount);
                            }
                        }
                        if(maxCount<=5) {
                            jschart.chart.type = 'column';
                            if(maxCount==1 && oGraph.smallestPeriod){
                                if(jschart.xAxis.min) jschart.xAxis.min -= period.value[oGraph.smallestPeriod]/4;
                                if(jschart.xAxis.max) jschart.xAxis.max += period.value[oGraph.smallestPeriod]/4;
                            }
                            //for(i=0;i<jschart.series.length;i++) jschart.series[i].type = 'column'  //TODO use categories
                        }
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
            if(oGraph.smallestPeriod) jschart.xAxis.minTickInterval = period.value[oGraph.smallestPeriod];
            console.timeEnd('makeChartOptionsObject');
            return jschart
        },
        buildGraphPanel: function buildGraphPanel(oGraph, panelId){ //all highcharts, jvm, and colorpicker files need must already be loaded
            if(globals.isEmbedded){
                console.time('buildGraphPanelCore');
                buildGraphPanelCore(oGraph);
                console.timeEnd('buildGraphPanelCore');
            } else {
                mask('drawing the graph'+(window.SVGAngle?'':'<br>Note: Graphs will draw 20 times faster in a modern browser such as Chrome, Firefox, Safari or Internet Exploer 9 or later'));
                window.setTimeout(function(){
                    buildGraphPanelCore(oGraph, panelId);
                }, 20);
                if(oGraph.missingSets) dialogShow("missing data", "This graph uses data that is no longer available.  This could be because of copyright changes requiring it removal or technical issues.  Your visualization will lack some or all plots or maps.");
            }
            function buildGraphPanelCore(oGraph, panelId){ //all highcharts, jvm, and colorpicker files need must already be loaded
                var title, calculatedMapData, $thisPanel;
                var activeMapTab = 0, mapMode; //global variable to track and show different map tab (different mapsets)

                //missing assets detect
                var missingAssets = [];
                oGraph.eachComponent(function(c, plot){
                    if(!this.data && !oGraph.assets[this.handle()]) {
                        missingAssets.push(this.handle());
                        plot.components.splice(c--, 1);
                    }
                });
                console.time('buildGraphPanel:header');
                if(oGraph.title.length==0){ // set title if blank and just one asset to name of asset
                    var key, assetCount=0;
                    for(key in oGraph.assets){
                        assetCount++;
                        if(assetCount>1) break;
                    }
                    if(assetCount==1) oGraph.title = oGraph.assets[key].name;
                }
                title = oGraph.title;
                var panelHTML, isEmbedded = globals.isEmbedded;
                if(isEmbedded){
                    panelId = 'G' + oGraph.ghash;
                    $thisPanel = $('div[data=\''+ oGraph.ghash +'\']:first');
                    if($thisPanel.length==0) return;  //abort if not found
                } else {
                    if(!panelId){
                        panelId = addTab(title);
                        $("#graph-tabs li").find("[href='#" + panelId + "']").html(title);
                    }
                    $thisPanel = $('#' + panelId);
                }
                if(missingAssets.length>0){
                    var msg = 'Unable to find data assets ('+missingAssets.join(', ')+') required by this graphs.';
                    if(isEmbedded){
                        $thisPanel.html(msg);
                        return;
                    } else {
                        dialogShow("data error", msg);
                    }
                }
                if(oGraph.intervals==0) oGraph.intervals = null;
                var annotations = new MashableData.Annotator(panelId, _makeDirty);
                oGraph.controls = {
                    annotations: annotations,
                    $thisPanel: $thisPanel,
                    provenance: {},
                    redraw: (typeof _redraw == 'undefined'?null:_redraw)
                };
                console.timeEnd('buildGraphPanel:header');
                if(isEmbedded) {
                    panelHTML =
                        '<div class="mashabledata_chart-map">' +
                        '<div class="mashabledata_chart"></div>' +
                        '<div class="mashabledata_map" style="display:none;">' +
                        '<div class="mashabledata_maptabs"></div>' +
                        '<h3 class="mashabledata_map-title" style="color:black;"></h3>'+  //block element = reduces map height when shown
                        '<div class="mashabledata_map-and-cub-viz">' +
                        '<div class="mashabledata_cube-viz right" style="width:29%;display:none;border:thin black solid;"></div>' +
                        '<div class="mashabledata_jvmap" style="display: inline-block;"></div>' +
                        '</div>' +
                        '<div class="container mashabledata_map-controls">' +
                        '<div class="mashabledata_map-slider" style="display: inline-block;width: 280px;"></div>' +
                        '<button class="mashabledata_map-step-backward">step backwards</button>' +
                        '<button class="mashabledata_map-play">play</button>' +
                        '<button class="mashabledata_map-step-forward">step forwards</button>' +
                        '<button class="mashabledata_map-graph-selected" title="graph selected regions and markers"  disabled="disabled">graph</button>' +
                        '<button class="mashabledata_make-map" disabled="disabled">reset</button>' +
                        '</div>' +
                        '</div>' +
                        '<div class="mashabledata_graph-analysis"></div>' +
                        '</div>';
                } else {
                    panelHTML =
                        '<div class="provenance graph-sources graph-subpanel" style="display: none;"></div>' +
                        '<div class="graph-chart graph-subpanel">' +
                        '<div class="resize">' +
                        '<p>Drag the lower nd right edge of the visualizations\' borders to fix the exact dimensions of the maps and graphs.  The default is to expand to fit the container.  Exact sizing ensures that what you see in the workbench is what your website\'s visitors will see.</p>' +
                        '<button class="size_reset">use default sizing</button><br />' +
                        '<button class="size_set">finished resizing</button>' +
                        '</div>' +
                        '<div class="graph_control_panel" style="font-size: 11px !important;">' +
                            //default series type (line, column..)
                        '<div class="configuration" style="border: none;">' +
                        '<fieldset>' +
                        '<legend>&nbsp;Configure&nbsp;</legend>' +
                        '<div class="language">language ' +
                        '<select class="language"></select>' +
                        '</div>' +
                        '<div class="graph-type">default graph type ' +
                        '<select class="graph-type">' +
                        '<option value="auto">auto (line &amp; column)</option>' +
                        '<option value="line">line</option>' +
                        '<option value="marker">line with markers</option>' +
                        '<option value="column">column</option>' +
                        '<option value="stacked-column">stacked column</option>' +
                        '<option value="area-percent">stacked percent</option>' +
                        '<option value="area">stacked area</option>' +
                        '<option value="logarithmic">logarithmic</option>' +
                        '<option value="normalized-line">normalized line</option>' +
                        '<option value="pie">pie</option>' +
                        '</select>' +
                        '</div>' +
                        '<div class="graph-map-mode">default map type ' +
                        '<select class="graph-map-mode">' +
                        '<option value="heat">colored heat map of values</option>' +
                        '<option value="abs-change">colored heat map of changes</option>' +
                        '<option value="percent-change">colored heat map of percent changes</option>' +
                        '<option value="bubbles">overlay circles to show values</option>' +
                        '<option value="change-bubbles">overlay circles to show changes</option>' +
                        '<option value="max">shows when max value was reached</option>' +
                        '<option value="min">shows when min value was reached</option>' +
                        '<option value="treemap">abstract values to rectangles</option>' +
                        '<option value="change-treemap">abstract change to rectangles</option>' +
                        '</select>' +
                        '</div>' +
                        '<div class="change-basemap">base map ' +
                        '<select class="change-basemap"></select>' +
                        '<div class="mashabledata_legend"><label><input type="checkbox" class="mashabledata_legend" '+(oGraph.mapconfig.showLegend?'checked':'')+'>show legend for all maps</label></div>' +
                        '<div class="map-viz-select">map interactive' +
                        '<select class="map-viz-select">' +
                        '</select>' +
                        '</div>' +
                            //change map selector and default
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
                        '<button class="provenance">more configurations</button>' +
                        '<button class="resize">set size</button>' +
                        '</fieldset>' +
                        '</div>' +
                        '<div class="annotations"><fieldset><legend>Chart annotations</legend>' +
                        '<table class="annotations"></table>' +
                        '</fieldset>'+
                        '</div>' +
                        '<div class="downloads">' +
                        '<fieldset>' +
                        '<legend>&nbsp;Download&nbsp;</legend>' +
                        '<select class="download-selector"></select> ' +
                        'format: ' +
                        '<span title="download the graph as a PNG formatted image" class="md-png rico export-chart">PNG</span>' +
                            //'<span title="download the graph as a JPG formatted image" class="md-jpg rico export-chart">JPG</span>' +
                        '<span title="download the graph as a SVG formatted vector graphic"class="md-svg rico export-chart">SVG</span>' +
                        '<span title="download the graph as a PDF document" class="md-pdf rico export-chart">PDF</span>' +
                        '<button class="download-data" title="Download the graph data as an Excel workbook">download data</button>' +
                        '</fieldset>' +
                        '</div>' +
                        '<div class="sharing">' +
                        '<fieldset>' +
                        '<legend>&nbsp;Sharing&nbsp;</legend>' +
                        '<div class="share-links">' +
                        '<a href="#" class="post-facebook"><img src="images/icons/facebook.png" />facebook</a> ' +
                            //'<a href="#" class="post-twitter"><img src="images/icons/twitter.png" />twitter</a> ' +
                        '<a class="graph-email">email </a> ' +
                        '<button class="graph-link">link </button>' +
                        '<button class="graph-embed">embed </button>' +
                            //'<a href="#" class="email-link"><img src="images/icons/email.png" />email</a> ' +
                        '</div>'+
                        '<div class="searchability">' +
                        '<input type="radio" name="'+ panelId +'-searchability" id="'+ panelId +'-searchable" value="Y" '+ (oGraph.published=='Y'?'checked':'') +' /><label for="'+ panelId +'-searchable">Public Graphs searchable</label>' +
                        '<input type="radio" name="'+ panelId +'-searchability" id="'+ panelId +'-private" value="N" '+ (oGraph.published=='N'?'checked':'') +' /><label for="'+ panelId +'-private">' + (account.info.orgName?'restrict to '+ account.info.orgName:'private') + '</label>' +
                        '</div>' +
                        '</fieldset>' +
                        '</div>' +
                        '<br /><button class="graph-save">save</button> <button class="graph-saveas">save as</button> <button class="graph-close">close</button> <button class="graph-delete">delete</button><br />' +
                        '</div>' +
                        '<div class="chart-map-scroll-window">' +
                        '<div class="mashabledata_chart-map" style="width:75%;display:inline;float:left;">' +
                        '<div class="mashabledata_chart"></div>' +
                        '<div class="mashabledata_map" style="display:none;">' +
                        '<div class="mashabledata_maptabs"></div>' +
                        '<h3 class="mashabledata_map-title" style="color:black;"></h3>'+  //block element = reduces map height when shown
                        '<div class="mashabledata_map-and-cub-viz">' +
                        '<div class="mashabledata_cube-viz right" style="display:none;"></div>' +
                        '<div class="mashabledata_jvmap" style="display: inline-block;"></div>' +
                        '</div>' +
                        '<div class="container mashabledata_map-controls">' +
                        '<div class="mashabledata_map-slider" style="display: inline-block;width: 280px;"></div>' +
                        '<button class="mashabledata_map-step-backward">step backwards</button>' +
                        '<button class="mashabledata_map-play">play</button>' +
                        '<button class="mashabledata_map-step-forward">step forwards</button>' +
                        '<button class="mashabledata_map-graph-selected" title="graph selected regions and markers"  disabled="disabled">graph</button>' +
                        '<button class="mashabledata_make-map" disabled="disabled">reset</button>' +
                        '<button class="merge group hidden" disabled="disabled">group</button>' +
                        '<button class="merge ungroup hidden" disabled="disabled">ungroup</button>' +
                        '</div>' +
                        '</div>' +
                        '</div>' +
                        '<div height="30px"><textarea style="width:98%;height:50px;margin-left:5px;" class="graph-analysis" maxlength="1000" /></div>' +
                        '</div>' +
                        '</div>'
                    //'</div>';
                }
                $thisPanel.html(panelHTML);
                sizeShowPanels(oGraph);
                var chart, grid;
                console.timeEnd('buildGraphPanel:thisPanel');
                console.time('buildGraphPanel:thisPanel events');
                //configure and bind the controls
                if(isEmbedded){
                    $thisPanel.find('div.mashabledata_graph-analysis').html(oGraph.analysis);
                } else {
                    //show prov panel
                    $thisPanel.find('button.provenance').button().click(function(){
                        provenance.build();
                        $thisPanel.find('div.provenance').show();
                        $thisPanel.find('div.graph-chart').hide();
                    });
                    //RESIZABLE
                    $thisPanel.find('button.resize')
                        .button({icons: {secondary: "ui-icon-arrow-4-diag"}})
                        .click(function(){
                            _makeDirty();
                            if(oGraph.controls.map) oGraph.controls.map.remove();
                            if(oGraph.controls.chart){
                                oGraph.controls.chart.destroy();
                                delete oGraph.controls.chart;
                                $thisPanel.find('.mashabledata_chart').css('background-color','grey');
                            }
                            $thisPanel.find('div.graph_control_panel').hide();
                            $thisPanel.find('div.resize').show();
                            $thisPanel.find('.mashabledata_chart, .mashabledata_cube-viz, .mashabledata_jvmap').resizable({
                                helper: 'ui-resizable-helper',
                                resize: function( event, ui ){},
                                stop: function( event, ui){
                                    var $container, $chart, $viz, viz, $map, map, deltaWidth;
                                    $container = $thisPanel.find('.mashabledata_chart-map');
                                    $chart = $thisPanel.find('.mashabledata_chart');
                                    $viz = $thisPanel.find('.mashabledata_cube-viz');
                                    $map = $thisPanel.find('.mashabledata_jvmap');
                                    if(ui.originalElement.hasClass('mashabledata_chart')){
                                        viz = $viz.is(':visible')?1:0;
                                        map = $map.is(':visible')?1:0;
                                        deltaWidth = ui.size.width-ui.originalSize.width;
                                        if(viz)$viz.width($viz.width()+deltaWidth/(viz+map));
                                        if(map)$map.width($map.width()+deltaWidth/(viz+map));
                                        $container.width($container.width()+deltaWidth);
                                        if(!oGraph.mapconfig.sizes) oGraph.mapconfig.sizes = {};
                                    }
                                    if(ui.originalElement.hasClass('mashabledata_cube-viz')){
                                        $container.width($container.width()+ui.size.width-ui.originalSize.width);
                                        $thisPanel.find('.mashabledata_jvmap').height(ui.size.height).width($container.width()-ui.size.width-10);
                                    }
                                    if(ui.originalElement.hasClass('mashabledata_jvmap')){
                                        $container.width($container.width()+ui.size.width-ui.originalSize.width);
                                        if(oGraph.plots && oGraph.hasMapViz()) $thisPanel.find('.mashabledata_chart').width($container.width());
                                        $thisPanel.find('.mashabledata_jvmap').height(ui.size.height).width(ui.size.width);
                                        if(oGraph.hasMapViz()) $viz.height(ui.size.height).width($viz.width()-ui.size.width+ui.originalSize.width)
                                    }
                                    oGraph.mapconfig.sizes = {};
                                    if($chart.width() && $chart.height() && oGraph.plots){
                                        oGraph.mapconfig.sizes.chart = {
                                            height: $chart.height(),
                                            width: $chart.width()
                                        };
                                    }
                                    if($map.width() && $map.height() && (oGraph.pointsets||oGraph.mapsets)){
                                        oGraph.mapconfig.sizes.map = {
                                            height: $map.height(),
                                            width: $map.width()
                                        };
                                    }
                                    if($viz.width() && $viz.height() && oGraph.hasMapViz()){
                                        oGraph.mapconfig.sizes.viz = {
                                            height: $viz.height(),
                                            width: $viz.width()
                                        };
                                    }
                                    _redraw();

                                }
                            });
                        });

                    $thisPanel.find('button.size_reset').button().click(function(){
                        delete oGraph.mapconfig.sizes;
                        _endResize();
                    });
                    var _endResize = function(){
                        $('.mashabledata_chart, .mashabledata_cube-viz, .mashabledata_jvmap').resizable("destroy");
                        $thisPanel.find('div.graph_control_panel').show();
                        $thisPanel.find('div.resize').hide();
                        _redraw();
                    };
                    $thisPanel.find('button.size_set').button().click(_endResize);
                    $thisPanel.find('button.download-data').button({icons: {secondary: "ui-icon-calculator"}})
                        .click(function(){
                            //if multiple tabbed maps, make sure the data has been calculated for each map tab
                            for(var i=0;i<oGraph.mapsets.length;i++) {
                                if(!oGraph.mapsets[i].calculatedMapData)  {
                                    _calcMap(oGraph, i);
                                }
                            }
                            downloadGraphData(panelId);
                        });
                    var downloadList = function(){
                        var table = $thisPanel.find('div.mashabledata_cube-viz table').get(0);
                        var grid = [];
                        for(var r=0;r<table.rows.length;r++){ //header row = rank; plot name; plot units
                            grid.push([table.rows[r].cells[0].innerHTML.replace('<br>',''), table.rows[r].cells[1].innerHTML, table.rows[r].cells[2].innerHTML]);
                        }
                        downloadMadeFile({   //does the highcharts trick to download an Excel file
                            filename: oGraph.title,
                            data: JSON.stringify([{name: 'ranked list', grid: grid}]),
                            url: 'excel.php'  //page of server that use PHPExcel library to create a workbook
                        });
                    };
                    $thisPanel.find('.graph-analysis').val(oGraph.analysis);
                    $thisPanel.find('select.download-selector').change(function(){
                        if($(this).val()=='map'){
                            if(!oGraph.mapsets&&!oGraph.pointsets) {
                                dialogShow("no map","This graph does not have a map to download.  Maps are added to graphs by finding a series that belongs to a map set or a marker set and mapping the set.");
                                $(this).val('chart');
                            }
                        } else {
                            if(!oGraph.plots){
                                dialogShow("no chart","This graph does not have a chart to download.");
                                $(this).val('map');
                            }
                        }
                    });
                    $thisPanel.find('.export-chart').click(function(){
                        var type, $this = $(this);
                        if($this.hasClass('md-jpg')) type = 'image/jpeg';
                        if($this.hasClass('md-png')) type = 'image/png';
                        if($this.hasClass('md-svg')) type = 'image/svg+xml';
                        if($this.hasClass('md-pdf')) type = 'application/pdf';
                        _exportChart(type);
                    });
                    $thisPanel.find('a.post-facebook')
                        .click(function(){
                            var svg;
                            if(oGraph.mapsets||oGraph.pointsets){  //need check for IE<10 = isIE+ version check
                                svg = cleanMapSVG($map.container.html(), oGraph.mapconfig.mapBackground||globals.mapBackground);
                            } else {
                                annotations.sync();
                                svg = oGraph.controls.chart.getSVG();
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
                                    var body = panelGraphs[panelId].analysis;
                                    var caption =  panelGraphs[panelId].title;
                                    //check permissions first with: FB.api('/me/permissions', function(response) {if(response.data[0])});
                                    // calling the API ...
                                    var obj = {
                                        method: 'feed',
                                        link: 'http://www.mashabledata.com/workbench#/t=g1&graphcode='+ panelGraphs[panelId].ghash,
                                        picture: chartInfo.imageURL,
                                        message: body,
                                        name: 'MashableData visualization',
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
                    $thisPanel.find('.graph-email').button({icons: {secondary: "ui-icon-mail-closed"}}).click(function(){
                        if(oGraph.isDirty) {
                            dialogShow("graph not saved", "Please save the graph first so that links will show the graph as currently displayed.");
                        }
                    });

                    var _setEmailLink = function (){
                        if(oGraph.ghash){
                            var link = "mailto: "
                                + "?subject=" + escape(oGraph.title||"link to my MashableData visualization")
                                + "&body=" + escape((oGraph.analysis||'Link to my interactive visualization on MashableData.com:')+'<br><br>http://www.mashabledata.com/workbench/#/t=g2&graphcode='+oGraph.ghash);
                            $thisPanel.find('.email-link').attr('href',link);
                            $thisPanel.find('.graph-email').off().attr('href',link);
                        }
                    };
                    _setEmailLink();
                    $thisPanel.find('.graph-embed').button({icons: {secondary: "ui-icon-script"}})
                        .click(function(){
                            if(oGraph.isDirty) {
                                dialogShow("graph not saved", "Please save the graph first so that links will show the graph as currently displayed.");
                                return;
                            }
                            //var offset = $(this).offset();  //button offset relative to document
                            var linkDivHTML =
                                '<div id="embed-info">' +
                                '<button class="right" id="embed-info-close">close</button>' +
                                '<b>link code: </b><span id="link-ghash">' + oGraph.ghash + '</span><br><br>' +
                                '<em>To preview the embedded graph and for instructions for embedding it on your website, please visit this <a href="/preview'+(globals.isDev?'dev':'')+'?graphcode='+oGraph.ghash+'" target="_blank">graph\'s preview page</a>. ' +
                                '<textarea id="link-html">&lt;div class=&quot;mashabledata_embed&quot; data=&quot;'+oGraph.ghash+'&quot;&gt;&lt;/div&gt;</textarea>' +
                                '</div>';
                            $.fancybox(linkDivHTML,
                                {
                                    width: 600,
                                    height: 'auto',
                                    showCloseButton: false,
                                    autoDimensions: false,
                                    autoScale: false,
                                    overlayOpacity: 0
                                });
                            $('#embed-info-close').button({icons: {secondary: 'ui-icon-close'}}).click(function(){$.fancybox.close()});
                        });
                    $thisPanel.find('.graph-link').button({icons: {secondary: "ui-icon-link"}})
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
                                '<textarea id="link-html">&lt;a href=&quot;http://www.mashabledata.com/workbench/#/t=g2&graphcode='+oGraph.ghash+'&quot;&gt;'+(oGraph.title||'MashableData graph')+'&lt;/a&gt;</textarea>' +
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
                            $('#link-editor-close').button({icons: {secondary: 'ui-icon-close'}}).click(function(){$.fancybox.close()});
                            $('#ghash-reset').button({icons: {secondary: 'ui-icon-refresh'}}).click(function(){
                                dialogShow("confirm link code reset",
                                    "If you have emailed a link to this graph or posted it on FaceBook or Twitter, those links will no longer work once the graph's link code is reset. Plese confirm to reset.",
                                    [ { text: "Confirm", click: function() {
                                        $( this ).dialog( "close" );
                                        $('#ghash-reset').button("disable");
                                        var oldHash = oGraph.ghash;
                                        oGraph.resetHash(function(){
                                            var $linkHtml = $('#link-html');
                                            $linkHtml.html($linkHtml.html().replace(oldHash, oGraph.ghash));
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
                            _makeDirty();
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
                        var needRedraw = oGraph.intervals !== null, newStart, newEnd;
                        oGraph.intervals = null;
                        if(oGraph.controls.chart){
                            newStart = oGraph.controls.chart.options.chart.x[values[0]];
                            newEnd = oGraph.controls.chart.options.chart.x[values[1]];
                            needRedraw = needRedraw || oGraph.start !== newStart || oGraph.end !== newEnd;
                            oGraph.start = newStart;
                            oGraph.end = newEnd;
                        } else {
                            newStart = oGraph.calculatedMapData.dates[values[0]].dt.getTime();
                            newEnd = oGraph.calculatedMapData.dates[values[1]].dt.getTime();
                            needRedraw = needRedraw || oGraph.start !== newStart || oGraph.end !== newEnd;
                            oGraph.start = newStart;
                            oGraph.end = newEnd;
                        }
                        if(needRedraw) _redraw();  //should be signals or a call to a local var  = function
                    };
                    var cropDates = function(slider){
                        var values = $(slider).slider("values");
                        if(oGraph.controls.chart){
                            return formatDateByPeriod(oGraph.controls.chart.options.chart.x[values[0]],oGraph.smallestPeriod)+' - '+formatDateByPeriod(chart.options.chart.x[values[1]],oGraph.smallestPeriod);
                        } else {
                            return formatDateByPeriod(oGraph.calculatedMapData.dates[values[0]].dt.getTime(), oGraph.calculatedMapData.freq)+' - '
                                + formatDateByPeriod(oGraph.calculatedMapData.dates[values[1]].dt.getTime(), oGraph.calculatedMapData.freq);
                        }
                        _makeDirty();
                    };
                    $thisPanel.find('div.crop-slider').slider(
                        { //max and value[] are set in setCropSliderSpinner() after Highchart is called below
                            range: true,
                            stop: function(){
                                hardCropFromSlider()
                            },
                            change: function(){
                                if(oGraph.controls.chart){
                                    $thisPanel.find('.crop-dates').html(cropDates(this));
                                }
                            },
                            slide: function(){
                                $thisPanel.find('.crop-dates').html(cropDates(this));
                            }
                        });
                    $('#'+panelId+'-rad-hard-crop').change(function(){ //might cause the rebuild to fire twice
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
                            _redraw();
                        }
                    });
                    $('#'+panelId+'-rad-no-crop').change(function(){
                        oGraph.intervals = null;
                        oGraph.start = null;
                        oGraph.end = null;
                        oGraph.minZoom = oGraph.firstdt;
                        oGraph.maxZoom = oGraph.lastdt;
                        _redraw();
                    });
                    $thisPanel.find('input.interval-crop-count').spinner({
                        min:1,
                        incrementalType: false,
                        stop: function(event, ui) {
                            //triggered by <label> wrapping around this element $thisPanel.find('input#'+panelId+'-rad-interval-crop').attr('checked',true);
                            oGraph.start = null;
                            oGraph.end = null;
                            if(oGraph.intervals != parseInt($(this).val())){
                                oGraph.intervals = parseInt($(this).val());
                                _redraw();
                            }
                        }
                    });
                    $thisPanel.find('button.graph-crop').click(function(){  //TODO: replace this click event of hidden button with signals
                        var graph = panelGraphs[panelId];
                        graph.start = (graph.minZoom>graph.firstdt)?graph.minZoom:graph.firstdt;
                        graph.end = (graph.maxZoom<graph.lastdt)?graph.maxZoom:graph.lastdt;
                        $(this).attr("disabled","disabled");
                        setCropSliderSpinner(panelId);
                        $('#'+panelId+'-rad-hard-crop').click();
                    });
                    // *** crop routine end ***
                    //the annotations height must be set after the jQuery UI changes to buttons, spinners, ...
                    $thisPanel.find('div.annotations fieldset').height(
                        $thisPanel.innerHeight() //from graph subpanel
                        - $thisPanel.find('div.configuration').outerHeight()
                        - $thisPanel.find('div.downloads').outerHeight()
                        - $thisPanel.find('div.sharing').outerHeight()
                        - 50 //save close buttons
                        - 30 //notes / analysis
                    );
                    $thisPanel.find('input.graph-publish')
                        .change(function(){
                            oGraph.published = (this.checked?'Y':'N');
                        });
                    var $lang = $thisPanel.find('select.language');
                    for(var language in globals.translations){
                        $lang.append('<option value="' + language + '">' + language + '</option>');
                    }
                    $lang.val(oGraph.mapconfig.lang||'English').change(function(){
                        oGraph.mapconfig.lang = $(this).val();
                        oGraph.literals = globals.translations[oGraph.mapconfig.lang];
                        _makeDirty();
                        _redraw();
                        dialogShow('language localization', 'This only changes the literals (such as month abbreviation and country names on the map) in the embedded graph iteself.  The Workbench controls and messages will remain in English only.<br><br>To change plot names please uses <b>more configurations</b> button to configure the plot with translated titles and units.')
                    });


                    $thisPanel.find('select.graph-type')
                        .val(oGraph.type)
                        .change(function(){
                            if($(this).val()=='logarithmic'){
                                for(var y=0;y<chart.yAxis.length;y++){
                                    if(chart.yAxis[y].getExtremes().dataMin<=0){
                                        $thisPanel.find('select.graph-type').val(oGraph.type);
                                        dialogShow("Logarithmic scaling not available", "Logarithmic Y-axis scaling is not allowed if negative values are present");
                                        return false;
                                    }
                                }
                            }
                            if(oGraph.type!=$(this).val() && oGraph.hasPlotModes()) dialogShow("warning", "The type can be set globally or for each plot.  This visualization contains plots that override your global setting.  Use the <b>more configurations</b> button below to revert the individual plot type to this global setting.");
                            oGraph.type=$(this).val();
                            _makeDirty();
                            _redraw();
                        });
                    var $vizSelect = $thisPanel.find('select.map-viz-select');
                    fillCubeSelector($vizSelect, [], [], oGraph);
                    $vizSelect
                        .change(function(){
                            var val = $(this).val();
                            if(val.indexOf('components-')===0 && !oGraph.isSummationMap()) dialogShow('showing components', 'A map can sum or subtract together several sets of data, such as &quot;production of rice&quot; + &quot;production of wheat&quot; + &quot;production of millet&quot;.  These components can be displayed as the user interact with the map.<br><br>This map current does not have components, so only the totals with be displayed.<br><br><i>Note that user formulas and complex component math will also cause the interaction to display totals.</i>')
                            if(val=='scatter' && (!oGraph.mapsets||oGraph.mapsets!=2)) dialogShow('two maps requires', 'This requires two maps.  Find data and select to add the map set to this graph.');
                            if(!isNaN(val)){
                                if(val!=oGraph.cubeid){
                                    //new cubeid
                                    oGraph.cubeid = val;
                                    delete oGraph.assets.cube;
                                    oGraph.cubename = this.options[this.selectedIndex].text;
                                    _redraw();
                                }
                            } else {
                                if(val!=oGraph.mapconfig.mapViz||'none'){
                                    //new supplemental map vizualization which is not a data cube
                                    delete oGraph.cubeid;
                                    delete oGraph.cubename;
                                    if(val=='none'){
                                        delete oGraph.mapconfig.mapViz
                                    } else {
                                        oGraph.mapconfig.mapViz = val;
                                    }
                                    _redraw();
                                }
                            }
                        });
                    $thisPanel.find('select.graph-map-mode')
                        .val(oGraph.mapconfig.mapMode || 'default')
                        .change(function(){
                            if(this.value=='default'){
                                delete oGraph.mapconfig.mapMode;
                            } else {
                                oGraph.mapconfig.mapMode = this.value;
                            }
                            if(oGraph.hasMapModes()) dialogShow("warning", "The map type can be set globally or for each mapset.  This visualization  contains mapsets that override your global setting.  Use the <b>more configurations</b> button below to revert the individual mapset types to this global setting.");
                            _redraw();  //note: _redraw() calls _drawMap() which updates mapMode variable
                        });
                    $thisPanel.find('select.change-basemap').html(_fillChangeMapSelect()).change(function(){
                        //create new map panel!
                        var $mapSelect = $(this);
                        var newGraph = oGraph.clone(); //doesn't copy assets or data
                        var newMapCode = $mapSelect.val();
                        $mapSelect.val(oGraph.map);  //for old graph, continue to show its map in its selector
                        newGraph.changeMap(newMapCode, function(){  //this will fire a non-blocking require file fetch for the map assets
                            buildGraphPanel(newGraph); //panelId not passed -> new panel
                        });
                    });
                    _showChangeSelectors();
                }
                if(!isEmbedded){
                    $thisPanel
                        .find('.graph-analysis')
                        .keydown(function(){
                            panelGraphs[panelId].analysis = this.value;
                            _makeDirty();
                        });
                }
                oGraph.isDirty = (!oGraph.gid); //initialize
                if(!isEmbedded){
                    $thisPanel.find('button.graph-save').button({icons: {secondary: "ui-icon-disk"}, disabled: !oGraph.isDirty})
                        .click(_saveThisGraph);
                    $thisPanel.find('button.graph-saveas').button({icons: {secondary: "ui-icon-copy"}, disabled: oGraph.isDirty})
                        .click(function(){
                            delete oGraph.gid;
                            graphTitle.show(this, _saveThisGraph);
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
                                            oGraph.deleteGraph(function(jsoData){
                                                if(jsoData){
                                                    $('#canvas a[href="#'+visiblePanelId()+'"]').closest('li').find('span').click();
                                                    var $trMyGraph = $dtMyGraphs.find("td.title span.handle[data='G" + oGraph.gid + "']").closest('tr');
                                                    if($trMyGraph.length==1){
                                                        $dtMyGraphs.fnDeleteRow($trMyGraph.get(0));
                                                    }
                                                }
                                            });
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
                }
                console.timeEnd('buildGraphPanel:thisPanel events');
                //calcGraphMinMaxZoomPeriod(oGraph); << inside of makeChartOptionsObject
                panelGraphs[panelId] = oGraph;  //panelGraphs will be synced to oMyGraphs on save
                if(!isEmbedded){
                    console.time('buildGraphPanel:provController');
                    var provenance = new ProvenanceController(panelId);  //needs to be set after panelGraphs is updated
                    oGraph.controls.provenance = provenance;
                    console.timeEnd('buildGraphPanel:provController');
                }
                //DRAW THE CHART
                if(oGraph.plots){
                    console.time('buildGraphPanel:build annotations');
                    chart = chartPanel(panelId);
                    annotations.build();
                    console.timeEnd('buildGraphPanel:build annotations');
                    $thisPanel.find('div.highcharts-container').mousedown(function (b) {
                        if(b.which==3){}  //???
                    });
                }
                ////////////MMMMMMMMMMMMMMAAAAAAAAAAAAAAAAAAPPPPPPPPPPPPPPPPPPPPPP
                var $map = null, vectorMapSettings, val, mergablity;
                console.time('buildGraphPanel:_drawMap');
                oGraph.fetchMap(function(){  //needs to be called after the map is calculated
                    _drawMap();
                    console.timeEnd('buildGraphPanel:_drawMap');
                    setCropSliderSpinner(panelId);
                    console.timeEnd('buildGraphPanel: '+panelId);
                    if(!isEmbedded){
                        unmask();
                        setPanelHash(oGraph.ghash, $thisPanel.get(0).id);
                    }
                }); //ensures we have the map def and shows the map div
                //PRIVATE FUNCTIONS FOR buildGraphPanel
                function _fillChangeMapSelect(){
                    if(!oGraph.map) return "";
                    var handle, i, map, html='<option value="'+oGraph.map+'">'+globals.maps[oGraph.map].name+'</option>', maps=[];
                    for(handle in oGraph.assets){
                        if((handle[0]=='M' || handle[0]=='X') && oGraph.assets[handle].maps){
                            if( Object.prototype.toString.call(oGraph.assets[handle].maps) == '[object String]') oGraph.assets[handle].maps = JSON.parse('{'+oGraph.assets[handle].maps+'}');
                            for(map in oGraph.assets[handle].maps){
                                if(map != oGraph.map){
                                    maps.push(map);
                                }
                            }
                        }
                    }
                    maps.sort();
                    for(i=0;i<maps.length;i++){
                        html += '<option value="'+ maps[i] +'">'+ globals.maps[maps[i]].name +'</option>'
                    }
                    return html;
                }
                function _showChangeSelectors(){
                    if(oGraph.plots){
                        $thisPanel.find('div.graph-type').show();
                    } else {
                        $thisPanel.find('div.graph-type').hide();
                    }
                    if(oGraph.mapsets||oGraph.pointsets){
                        $thisPanel.find('div.change-basemap, div.graph-map-mode, div.map-viz-select').show();
                    } else {
                        $thisPanel.find('div.change-basemap, div.graph-map-mode, div.map-viz-select').hide();
                    }
                    var downloadOptions = '';
                    if(oGraph.plots) downloadOptions  += '<option value="chart">chart</option>';
                    if(oGraph.mapsets||oGraph.pointsets) downloadOptions  += '<option value="map" selected>map</option>';
                    if(oGraph.hasMapViz()) downloadOptions  += '<option value="cube">supplemental bar chart</option>';
                    $('.download-selector').html(downloadOptions);
                }
                function _setMapTabs(){
                    if(oGraph.mapsets && oGraph.mapsets.length>1){ //map tabs!!!
                        var $maptabs = $thisPanel.find('div.mashabledata_maptabs'), count = oGraph.mapsets.length, maxWidth = parseInt($thisPanel.find('.mashabledata_jvmap').innerWidth()/count), mapTabsHTML = '', ms;
                        for(ms=0;ms<count;ms++){
                            mapTabsHTML += '<div class="mashabledata_maptab'+(ms==activeMapTab?' mashabledata_activetab':'')+'" style="max-width: '+maxWidth+'px" data="'+ms+'">'+oGraph.mapsets[ms].name()+'</div>';
                        }
                        $maptabs.html(mapTabsHTML).show().find('.mashabledata_maptab').click(function(){
                            var i = $(this).attr('data');
                            if(i!=activeMapTab){
                                $thisPanel.find('div.mashabledata_activetab').removeClass('mashabledata_activetab');
                                $(this).addClass("mashabledata_activetab");
                                activeMapTab = i;
                                _drawMap(true);  //_redraw me
                            }
                        });
                    } else {
                        $thisPanel.find('div.mashabledata_maptabs').hide();
                    }
                }
                function _drawMap(tabChanged){
                    makeLegend = _drawMap_makeLegend; //pass reference to function up
                    if(oGraph.map && (oGraph.mapsets||oGraph.pointsets)){
                        if(!tabChanged) {
                            if($map) $map.remove();
                            _setMapTabs();
                        }
                        //sizing routines moved to sizeShowPanels()
                        if(!tabChanged || !oGraph.mapsets[activeMapTab].calculatedMapData){
                            console.time('buildGraphPanel:_drawMap:_calcMap');
                            calculatedMapData = _calcMap(oGraph, activeMapTab);  //also sets a oGraph.calculatedMapData reference to the calculatedMapData object
                            oGraph.calculatedMapData = calculatedMapData;
                            console.timeEnd('buildGraphPanel:_drawMap:_calcMap');
                            console.time('buildGraphPanel:_drawMap:_calcAttributes');
                            if(oGraph.mapsets) {
                                oGraph.mapsets[activeMapTab].calculatedMapData = calculatedMapData; //keep a reference when switching tabbed maps
                                mapMode = oGraph.mapsets[activeMapTab].mapMode();
                                switch(mapMode){
                                    case 'heat':
                                    case 'abs-change':
                                    case 'percent-change':
                                        _calcAttributes(oGraph);
                                        break;
                                    case 'min':
                                    case 'max':
                                        _calcMinMax(mapMode);
                                        break;
                                    case 'bubbles':  //_drawMap_isBubble()?????
                                    case 'change-bubbles':
                                        //_drawMap_bubbleCalc(); must be called after map creation to be able to detect bunnies ( = no markers!)
                                        break;
                                    case 'treemap':
                                    case 'change-treemap':
                                        //real work done in _drawMap_setRegionsMarkersAttribute()
                                        if($map){
                                            $map.remove();
                                            $map = false;
                                        }
                                        _setStartEndDateIndexes();
                                        break;
                                }
                            } else {
                                if(oGraph.pointsets) _calcAttributes(oGraph);
                            }
                            console.timeEnd('buildGraphPanel:_drawMap:_calcAttributes');
                            if(mapMode!='treemap'&&mapMode!='change-treemap'){
                                console.time('buildGraphPanel:_drawMap:fillScaling+Scaling');
                                var fillScaling = fillScalingCount(oGraph.pointsets);
                                var areaScaling = areaScalingCount(oGraph.pointsets);
                                console.timeEnd('buildGraphPanel:_drawMap:fillScaling+Scaling');
                                //console.info(calculatedMapData);
                                console.time('buildGraphPanel:_drawMap:jvm call');
                                var minScale = /us.._merc_en/.test(oGraph.mapFile)?0.9:1; //HACK!!!!!
                                var mapFocus = {
                                    scale: minScale,
                                    x: 0.5,
                                    y: 0.5
                                };
                                //aspect ratio hack for possible use with legend to create space
                                /*if(!(oGraph.mapconfig.showLegend===false)){ //move map centroid to give max room for the legend
                                 var mapDefHeight = jvm.Map.maps[oGraph.mapFile].height,
                                 mapDefWidth = jvm.Map.maps[oGraph.mapFile].width,
                                 mapAspectRatio = mapDefHeight / mapDefWidth,
                                 $mapDiv = $thisPanel.find('.mashabledata_jvmap'),
                                 $mapInner = $thisPanel.find('.mashabledata_jvmap'),
                                 mapDivHeight = $mapDiv.height(),
                                 mapDivWidth = $mapDiv.width(),
                                 divAspectRatio = mapDivHeight / mapDivWidth,
                                 heightConstrained = mapAspectRatio > divAspectRatio,
                                 extraPixels;
                                 if(heightConstrained){
                                 var actualMapWidth = mapDivHeight / mapAspectRatio;
                                 extraPixels = mapDivWidth - actualMapWidth;
                                 if(globals.maps[oGraph.map].legend[1]=='L'){ //left
                                 mapFocus.x = 0.5 - extraPixels / (2* actualMapWidth);
                                 }
                                 if(globals.maps[oGraph.map].legend[1]=='R'){ //right
                                 mapFocus.x = 0.5 + extraPixels / (2* actualMapWidth);
                                 }
                                 } else { //width constrained
                                 var actualMapHeight = mapDivWidth * mapAspectRatio;
                                 extraPixels = mapDivHeight - actualMapHeight;
                                 if(globals.maps[oGraph.map].legend[0]=='B'){ //bottom
                                 mapFocus.y = 0.5 - extraPixels / (2 * actualMapHeight);
                                 }
                                 if(globals.maps[oGraph.map].legend[0]=='T'){ //top
                                 mapFocus.y = 0.5 + extraPixels / (2 * actualMapHeight);
                                 }
                                 }
                                 }*/
                                vectorMapSettings = {
                                    map: oGraph.mapFile,
                                    zoomMin: minScale,
                                    focusOn: mapFocus,
                                    backgroundColor: oGraph.mapconfig.mapBackground||globals.mapBackground,
                                    zoomOnScroll: false,
                                    zoomAnimate: true,
                                    markersSelectable: true,
                                    markerStyle: {
                                        initial: {r: oGraph.mapconfig.maxRadius || 5},
                                        selected: {
                                            "stroke-width": 4,
                                            "stroke": 'yellow'
                                        }
                                    }, //default for null values in the data
                                    regionStyle: {
                                        selected: {
                                            "stroke-width": 2,
                                            "stroke": 'yellow',
                                            "fill": null
                                        },
                                        hover: {
                                            "fill-opacity": 0.8
                                        }
                                    },
                                    series: {
                                        regions:  [
                                            {
                                                attribute: "fill",
                                                /* values: _getMapDataByContainingDate(calculatedMapData.regionData, calculatedMapData.dates[calculatedMapData.dates.length-1].s), //val=aMapDates.length-1 will need to be harmonized with pointsets' most recent date*/
                                                scale: [(oGraph.mapsets && oGraph.mapsets[activeMapTab].options.negColor) || globals.MAP_COLORS.NEG, globals.MAP_COLORS.MID, (oGraph.mapsets && oGraph.mapsets[activeMapTab].options.posColor) || globals.MAP_COLORS.POS],
                                                /*                                             normalizeFunction: function(value){
                                                 console.info(value);
                                                 return value;
                                                 },*/
                                                min: calculatedMapData.regionMin,
                                                max: calculatedMapData.regionMax
                                            }
                                        ],
                                        markers:  [
                                            {
                                                attribute: 'r'
                                                //scale: [1, (_drawMap_isBubble()?50:20)]
                                                //values: _getMapDataByContainingDate(calculatedMapData.markerData,calculatedMapData.dates[calculatedMapData.dates.length-1].s),
                                            },
                                            {
                                                attribute: 'fill'
                                            },
                                            {
                                                attribute: 'stroke'
                                            }
                                        ]
                                    },
                                    onViewportChange: function(event, scale){
                                        //console.info(event);  <-provide no usful info
                                    },
                                    onRegionOver: function(event, code){
                                        //handle mouse over changes any supplementary map visualizations
                                        _drawMap_updateSupplementaryVizFromMap(code, true);
                                    },
                                    onRegionOut: function(event, code){
                                        //if(!oGraph.cubeid && oGraph.hasMapViz(){  //this check is in _drawMap_updateSupplementaryVizFromMap
                                        _drawMap_updateSupplementaryVizFromMap(code, false);
                                        //}
                                    },
                                    onRegionTipShow: function(event, label, code){
                                        var i, sparkData=[], currentIndex, containingDateData, containingDateColor, mapMode;
                                        if(calculatedMapData.regionColors){
                                            mapMode = oGraph.mapsets[activeMapTab].mapMode();
                                            if(mapMode=='min' || mapMode=='max'){
                                                containingDateColor = calculatedMapData.regionColors;
                                            } else {
                                                containingDateData = _getMapDataByContainingDate(calculatedMapData.regionData, calculatedMapData.dates[val].s);
                                                containingDateColor = _getMapDataByContainingDate(calculatedMapData.regionColors, calculatedMapData.dates[val].s);
                                            }
                                            if(containingDateColor && typeof containingDateColor[code] != 'undefined'){
                                                var effectiveVizMode = oGraph.effectiveVizMode();
                                                if(!effectiveVizMode || effectiveVizMode.indexOf('line')==-1){  //don't do the sparkline if the mouse over effect is already displaying the time series to the right
                                                    for(i=calculatedMapData.startDateIndex;i<=calculatedMapData.endDateIndex;i++){
                                                        if(calculatedMapData.regionData[calculatedMapData.dates[i].s] && typeof calculatedMapData.regionData[calculatedMapData.dates[i].s][code]!='undefined') {
                                                            sparkData.push([calculatedMapData.dates[i].dt.getTime(), calculatedMapData.regionData[calculatedMapData.dates[i].s][code]]);
                                                            if(mapMode=='min' || mapMode=='max'){
                                                                if(calculatedMapData.dates[i].dt.getTime() == containingDateColor[code]) currentIndex = sparkData.length-1;
                                                            } else {
                                                                if(i==val) currentIndex = sparkData.length-1;
                                                            }
                                                        }
                                                    }
                                                }
                                                var valueReport, startingDateDate, y, y0, readableDate;
                                                switch(mapMode){
                                                    case 'heat':
                                                        y = containingDateData[code];
                                                        valueReport = ' in ' + formatDateByPeriod(calculatedMapData.dates[val].dt.getTime(), calculatedMapData.freq)+ ':<br>'
                                                        + (typeof y == 'undefined'?'no data available': common.numberFormat(y, (parseInt(y)==y)?0:2) + ' ' + (calculatedMapData.mapUnits||''));
                                                        break;
                                                    case 'abs-change':
                                                        y = containingDateData[code];
                                                        startingDateDate  =  _getMapDataByContainingDate(calculatedMapData.regionData, calculatedMapData.dates[calculatedMapData.startDateIndex].s);
                                                        y0 = startingDateDate[code];
                                                        valueReport = ' in ' + formatDateByPeriod(calculatedMapData.dates[val].dt.getTime(), calculatedMapData.freq)+ ':<br>'
                                                        + (typeof y == 'undefined' || typeof y0== 'undefined' ? 'no data available': (y-y0>0?'+':'') + common.numberFormat(y-y0, (parseInt(y-y0)==y-y0)?0:2) + ' ' + (calculatedMapData.mapUnits||'') + ' from ' + calculatedMapData.dates[calculatedMapData.startDateIndex].s);
                                                        break;
                                                    case 'percent-change':
                                                        y = containingDateData[code];
                                                        startingDateDate  =  _getMapDataByContainingDate(calculatedMapData.regionData, calculatedMapData.dates[calculatedMapData.startDateIndex].s);
                                                        y0 = startingDateDate[code];
                                                        valueReport = ' in ' + formatDateByPeriod(calculatedMapData.dates[val].dt.getTime(), calculatedMapData.freq)+ ':<br>'
                                                        + (typeof y == 'undefined' || typeof y0== 'undefined' ? 'no data available': common.numberFormat(100*(y-y0)/y0, 1) + '% change from ' + calculatedMapData.dates[calculatedMapData.startDateIndex].s);
                                                        break;
                                                    case 'min':
                                                    case 'max':
                                                        y = calculatedMapData.regionData[common.mashableDate(containingDateColor[code], calculatedMapData.freq)][code];
                                                        valueReport = mapMode + 'imum value of ' + y + ' ' + (calculatedMapData.mapUnits||'') + ' reported for <b>' + formatDateByPeriod(containingDateColor[code], calculatedMapData.freq) + '</b>';

                                                }
                                                label.html(
                                                    '<div><b>'+$map.getRegionName(code)+'</b><br>'+calculatedMapData.title
                                                    + valueReport
                                                    + (sparkData.length?'</div><div class="inlinesparkline" style="height: 30px;width: '+Math.min(400, 10*sparkData.length)+'px;margin:0 5px;"></div>':'')
                                                ).css("z-Index",400);
                                                var sparkOptions = {
                                                    grid: {show: false}
                                                };
                                                // main series
                                                if(sparkData.length){
                                                    var series = [{
                                                        data: sparkData,
                                                        color: '#ddddff',
                                                        lines: {lineWidth: 0.8, fill: true},
                                                        shadowSize: 0
                                                    }];
                                                    if(sparkData.length<10) series.bars = {show: true};
                                                    // colour the current point red
                                                    if(typeof currentIndex != 'undefined'){
                                                        series.push({
                                                            data: [ sparkData[currentIndex] ],
                                                            points: {show: true, radius: 1, fillColor: '#ff0000'},
                                                            color: '#ff0000'
                                                        });
                                                    }
                                                    label.find('div.inlinesparkline').plot(series, sparkOptions);  // draw the sparkline
                                                }
                                            }
                                        }
                                    },
                                    regionsSelectable: (typeof oGraph.mapsets != "undefined"),
                                    regionsSelectableOne: !!(oGraph.cubeid),
                                    markers: calculatedMapData.markers,
                                    onMarkerTipShow: function(event, label, code){
                                        var i, sparkData=[], currentIndex, dateKey = calculatedMapData.dates[val].s, containingDateData = _getMapDataByContainingDate(calculatedMapData.markerData, dateKey);
                                        var markerSparkData = _drawMap_markerSparkData(code);
                                        if(containingDateData && containingDateData[code]){
                                            var html, y0, y = containingDateData[code].r;
                                            if(_drawMap_isBubble()){
                                                var regionNames = [], regionCodes = code.split('+');
                                                for(i=0;i<regionCodes.length;i++){
                                                    regionNames.push($map.getRegionName(regionCodes[i]));
                                                }
                                                html = '<div>'+calculatedMapData.title+'<br><b>'+regionNames.join(' + ') + '</b> ';
                                            } else {
                                                html = '<div><b>'+label.html()+':</b><br> ';
                                            }
                                            if(oGraph.mapsets && mapMode=='change-bubbbles'){
                                                var startDateKey = calculatedMapData.dates[calculatedMapData.startDateIndex].s;
                                                var startDateData = _getMapDataByContainingDate(calculatedMapData.markerData,startDateKey);
                                                y=containingDateData[code].r; //change bubble have to have an r attribute
                                                y0=startDateData[code].r;  //and a valid start or no bubble to click on!
                                                html += (y-y0>0?'+':'') + common.numberFormat(y-y0, (parseInt(y-y0)==y-y0)?0:2) + " " + (calculatedMapData.radiusUnits||'')+' change from '+startDateKey+' to '+dateKey+'<br>';
                                                html += common.numberFormat(y, (parseInt(y)==y)?0:2) + " " + (calculatedMapData.radiusUnits||'')+' in '+dateKey+'<br>';
                                                html += common.numberFormat(y0, (parseInt(y0)==y0)?0:2) + " " + (calculatedMapData.radiusUnits||'')+' in '+startDateKey+'<br>';
                                            } else {
                                                if(containingDateData[code].r) html += common.numberFormat(containingDateData[code].r, (parseInt(containingDateData[code].r)==containingDateData[code].r)?0:2) + " " + (calculatedMapData.radiusUnits||'')+'<br>';
                                                if(containingDateData[code].f) html += common.numberFormat(containingDateData[code].f, (parseInt(containingDateData[code].f)==containingDateData[code].f)?0:2) + " " + (calculatedMapData.fillUnits||'')+'<br>';
                                            }
                                            html += '</div><div class="inlinesparkline" style="height: 30px;width: '
                                            + Math.min(400, 10*markerSparkData.data.length).toString() + 'px;margin:0 5px;"></div>';
                                            label.html(html).css("z-Index",400);
                                            var sparkOptions = {
                                                grid: {show: false}
                                            };
                                            // main series
                                            var series = [{
                                                data: markerSparkData.data,
                                                color: '#ddddff',
                                                lines: {lineWidth: 0.8, fill: true},
                                                shadowSize: 0
                                            }];
                                            if(markerSparkData.data.length<10) series.bars = {show: true};
                                            // color the current point red
                                            if(typeof markerSparkData.currentIndex != 'undefined'){
                                                series.push({
                                                    data: [ markerSparkData.data[markerSparkData.currentIndex] ],
                                                    points: {show: true, radius: 1, fillColor: '#ff0000'},
                                                    color: '#ff0000'
                                                });
                                            }
                                            label.find('div.inlinesparkline').plot(series, sparkOptions);  // draw the sparkline using Flot
                                        }
                                    },
                                    onRegionClick: function(){
                                        //if(!$graphSelected.is(':visible')) $map.clearSelectedRegions();
                                    },
                                    onRegionSelected: function(e, code, isSelected){
                                        if(oGraph.hasMapViz()){
                                            if(oGraph.cubeid) {
                                                _drawMap_makeSupplementaryViz(code, isSelected);
                                            } else {
                                                _drawMap_updateSupplementaryVizFromMap(code, isSelected);
                                            }
                                        }
                                        _drawMap_setMergablity();
                                        var selectedMarkers = $map.getSelectedMarkers();
                                        if(selectedMarkers.length>0){
                                            $thisPanel.find('.mashabledata_map-graph-selected.ui-button, .mashabledata_make-map.ui-button').button('enable');
                                            return;
                                        }
                                        var dateKey, selectedRegions = $map.getSelectedRegions();
                                        if($graphSelected.is(':visible')){
                                            for(var i=0;i<selectedRegions.length;i++){
                                                 //bubble map do not have regionColors, but have (unsquared) regionData
                                                if(calculatedMapData.regionData){
                                                    for(dateKey in calculatedMapData.regionData){ //only need a single valid region date key
                                                        if(typeof calculatedMapData.regionData[dateKey][selectedRegions[i]]!='undefined'){
                                                            $thisPanel.find('.mashabledata_map-graph-selected.ui-button, .mashabledata_make-map.ui-button').button('enable');
                                                            return;
                                                        }
                                                        //don't break as regionData is not squared up:  check all dates for the selected region until data is found (return)
                                                    }
                                                }
                                            }
                                            //default if no markers selected or region that have data are selected:
                                            $thisPanel.find('.mashabledata_map-graph-selected.ui-button, .mashabledata_make-map.ui-button').button('disable');
                                        }
                                    },
                                    onMarkerSelected: function(e, code, isSelected){
                                        vectorMapSettings.onRegionSelected(e, code, isSelected);
                                    },
                                    onZoom: function(e, scale){
                                        transferTransform();  //unsure how this is supposed to work.  perhaps for bubble.
                                    }
                                };
                                /*if(!(oGraph.mapconfig.showLegend===false)){
                                 if(oGraph.mapsets){
                                 vectorMapSettings.series.regions[0].legend = {
                                 vertical: heightConstrained,
                                 cssClass: 'mashabledata_legend_'+globals.maps[oGraph.map].legend,
                                 title: oGraph.mapsets[activeMapTab].units()
                                 };
                                 }
                                 }*/
                                if($map) $map.remove();
                                var $jvmap = $thisPanel.find('div.mashabledata_jvmap');
                                $jvmap.html('').vectorMap(vectorMapSettings);
                                $map = $jvmap.vectorMap('get', 'mapObject');
                                if(oGraph.mapconfig.showLegend) gLegend = _drawMap_makeLegend($map);
                                console.timeEnd('buildGraphPanel:_drawMap:jvm call');
                            } else {
                                $map = false;
                            }
                        } else { //tabChanged==true
                            oGraph.calculatedMapData = oGraph.mapsets[activeMapTab].calculatedMapData;
                            calculatedMapData = oGraph.calculatedMapData;
                            _calcAttributes(oGraph);
                        }

                        val = calculatedMapData.endDateIndex; //initial value
                        console.time('buildGraphPanel:mapControls');
                        oGraph.controls.map = $map;
                        var $mapDateDiv = $thisPanel.find('.mashabledata_map-date');
                        if(!$mapDateDiv.length) $mapDateDiv = $('<div class="mashabledata_map-date"></div>').prependTo($thisPanel.find('div.jvectormap-container'));
                        //BBBUUUUBBBBBLLEESS!!!!!
                        var $g = $thisPanel.find('div.mashabledata_jvmap svg g:first');  //goes in _createGraph closure
                        if(_drawMap_isBubble()){
                            _drawMap_bubbleCalc();
                            _drawMap_positionBubbles();
                            $map.series.regions[0].setAttributes(calculatedMapData.regionsColorsForBubbles);
                            $thisPanel.find('button.merge').show();
                        }
                        var $mapSlider = $thisPanel.find('.mashabledata_map-slider');
                        if(calculatedMapData.startDateIndex!=calculatedMapData.endDateIndex){
                            if($mapSlider.hasClass("ui-slider")) $mapSlider.slider('destroy');
                            $mapSlider
                                .show()
                                .slider({  //removed .off() because slider not working when reintialized
                                    value: calculatedMapData.endDateIndex,
                                    min: calculatedMapData.startDateIndex,
                                    max: calculatedMapData.endDateIndex,
                                    step: 1,
                                    change: function( event, ui ) { //this event fires when the map is first loaded
                                        val = ui.value;
                                        _drawMap_setRegionsMarkersAttribute(val);
                                        if($map){
                                            if(val==calculatedMapData.endDateIndex){
                                                if(!$map.getSelectedRegions().length) $('.mashabledata_make-map.ui-button').button('disable');
                                            } else {
                                                $('.mashabledata_make-map.ui-button').button('enable');
                                            }
                                        }
                                        $mapDateDiv.html(formatDateByPeriod(calculatedMapData.dates[val].dt.getTime(), calculatedMapData.freq));
                                    }
                                })
                                .slider("value", calculatedMapData.endDateIndex); //needed for first draw, but double triggers on true _redraw = not end of the world
                        } else {
                            $mapSlider.hide();
                            _drawMap_setRegionsMarkersAttribute(calculatedMapData.startDateIndex);
                        }
                        var $graphSelected = $thisPanel.find('.mashabledata_map-graph-selected');
                        $graphSelected
                            .html(oGraph.literal('graph'))
                            .button($thisPanel.width()>650?{icons:{secondary: 'ui-icon-image'}}:null)
                            .off()
                            .click(function(){ //graph selected regions and markers (selectRegions/selectMarkers must be true for this to work)
                                /* calcData contains the values for markers and regions in a JVMap friendly (which is not a MD series friendly format.
                                 If only a single mapset or pointset has only one component, we can go back to that pointset/mapset's asset data.
                                 If more than one component, we need to assemble a graph obect with plots, plot.options.name, components, and assets.
                                 OK.  That is a lot of work, but it is the correct way.  quickGraph will detect a graph object (instead of a series object) and act accordingly.
                                */
                                var selectedRegions = $map.getSelectedRegions();
                                var selectedMarkers = $map.getSelectedMarkers();
                                var popGraph = new MD.Graph(), plt, formula, i, j, c, X, regionCodes, regionNames, pointset, mapComps, comps, newComp, asset, found;
                                popGraph.title = 'from map of ' + oGraph.title;
                                for(i=0;i<selectedMarkers.length;i++){  //the IDs of the markers are either the lat,lng in the case of pointsets or the '+' separated region codes for bubble graphs
                                    if(_drawMap_isBubble()){
                                        //get array of regions codes
                                        plt = oGraph.mapsets[activeMapTab].clone(selectedMarkers[i]);
                                        if(plt) {
                                            popGraph.addPlot(plt);
                                        } else {
                                            //create series
                                            regionNames = [];
                                            regionCodes = selectedMarkers[i].split('+');
                                            for(i=0;i<regionCodes.length;i++){
                                                regionNames.push($map.getRegionName(regionCodes[i]));
                                            }
                                            var markerSparkData = _drawMap_markerSparkData(selectedMarkers[i]);
                                            var nonEditableSeriesForDisplay = new MD.Component({
                                                seriesname: calculatedMapData.title + ': ' + regionNames.join(' + '),
                                                units: calculatedMapData.radiusUnits,
                                                data: markerSparkData.data
                                            });
                                            popGraph.addPlot(new MD.Plot([nonEditableSeriesForDisplay]));  //do not pass on options such as userFormulas
                                        }
                                    } else {
                                        for(X=0;X<oGraph.pointsets.length;X++){
                                            pointset = oGraph.pointsets[X].clone(selectedMarkers[i]);
                                            if(pointset) popGraph.addPlot(pointset);
                                        }
                                    }
                                }
                                //regions (mapsets) are simpler than markers (pointsets) because there is only one
                                if(oGraph.mapsets){  //skip if not mapset
                                    var sourceMapPlot, sourceComponent, popComponent, popComponents, mapAsset, regionSeries;
                                    for(i=0;i<selectedRegions.length;i++){
                                        if(
                                            (calculatedMapData.regionData && typeof calculatedMapData.regionData[calculatedMapData.dates[val].s][selectedRegions[i]]!='undefined') //bubble map don't have regionColors
                                            ||
                                            (calculatedMapData.regionColors && typeof calculatedMapData.regionColors[calculatedMapData.dates[val].s][selectedRegions[i]]!='undefined') //but regionData is not "squared up", so check regionColors too if possible
                                        ){  //make sure this region has data (for multi-component mapsets, all component must this regions data (or be a straight series) for this region to have calculatedMapData data
                                            sourceMapPlot = oGraph.mapsets[activeMapTab];
                                            popComponents = [];
                                            sourceMapPlot.eachComponent(function(){
                                                sourceComponent = this;
                                                popComponent = sourceComponent.clone();
                                                if(sourceComponent.isMapSet()){
                                                    mapAsset = oGraph.assets[sourceComponent.handle()];
                                                    regionSeries = mapAsset.data[selectedRegions[i]];
                                                    //popComponent = new MD.Component(regionSeries.handle);  //bare bones component!
                                                    //popComponent.setname = mapAsset.name;
                                                    //popComponent.maps = mapAsset.maps;
                                                    //popComponent.freqs = mapAsset.freqs;
                                                    popComponent.geoname = regionSeries.geoname;
                                                    popComponent.geoid = regionSeries.geoid;
                                                    popComponent.parsedData(regionSeries.data);
                                                    popComponent.firstdt = regionSeries.firstdt;
                                                    popComponent.lastdt = regionSeries.lastdt;
                                                    //popComponent.units = mapAsset.units;
                                                    //popComponent.src = mapAsset.src;
                                                    //popComponent.setmetdata = mapAsset.setmetadata;
                                                    //popComponent.themeid = mapAsset.themeid;
                                                    //popComponent.options = {op: sourceComponent.options.op, k: sourceComponent.options.k};
                                                }
                                                popComponents.push(popComponent);
                                            });
                                            popGraph.addPlot(popComponents, {userFormula: sourceMapPlot.userFormula});
                                        }
                                    }
                                }
                                if(popGraph.plots && popGraph.plots.length) {
                                    if(isEmbedded) {
                                        MD.plugin.popGraph(popGraph);
                                    } else {
                                        $('#quick-view-select-viz').val('none').hide();
                                        quickGraph(popGraph, oGraph.map, true);
                                    }
                                } else {
                                    $thisPanel.find('.mashabledata_make-map').click();
                                }
                            });
                        var $play = $thisPanel.find('.mashabledata_map-play');
                        if(calculatedMapData.startDateIndex!=calculatedMapData.endDateIndex){ //don't show the map slider and play controls if there only a single date
                            $play
                                .off()
                                .click(function(){
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
                                })
                                .html(oGraph.literal('play'))
                                .button({text: false, icons: {primary: "ui-icon-play"}});
                            $thisPanel.find('.mashabledata_map-step-backward').off()
                                .click(function(){
                                    $mapSlider.slider("value",$mapSlider.slider("value")-1);
                                })
                                .html(oGraph.literal('backward'))
                                .button({text: false, icons: {primary: "ui-icon-seek-first"}});
                            $thisPanel.find('.mashabledata_map-step-forward').off()
                                .click(function(){
                                    $mapSlider.slider("value",$mapSlider.slider("value")+1);
                                })
                                .html(oGraph.literal('forward'))
                                .button({text: false, icons: {primary: "ui-icon-seek-end"}});
                        } else {
                            $play.hide();
                            $thisPanel.find('.mashabledata_map-step-backward, .mashabledata_map-step-forward').hide();
                        }
                        if(!oGraph.plots && !(oGraph.mapsets && oGraph.mapsets.length>1)){
                            $thisPanel.find('h3.mashabledata_map-title')
                                .show()
                                .html(oGraph.title)
                                .off()
                                .click(function(){
                                    if(!isEmbedded) graphTitle.show(this);
                            });  //initialize here rather than set slider value which would trigger a map _redraw
                        } else {
                            $thisPanel.find('h3.mashabledata_map-title').hide();
                        }
                        var noCubeRedraw = false;
                        $thisPanel.find('.mashabledata_make-map')
                            .button($thisPanel.width()>650?{icons: {secondary: 'ui-icon-arrowrefresh-1-s'}}:null).off()
                            .click(function(){
                                noCubeRedraw = true;
                                $map.clearSelectedMarkers();
                                $map.clearSelectedRegions();
                                noCubeRedraw = false;
                                //if(oGraph.controls.vizChart) oGraph.controls.vizChart.redraw();
                                /*$map.removeAllMarkers();
                                 $map.addMarkers(calculatedMapData.markers);
                                 calculatedMapData  = _calcMap(oGraph);
                                 _calcAttributes(oGraph);
                                 _drawMap_bubbleCalc();*/
                                $mapSlider.slider("value", calculatedMapData.endDateIndex);
                                $thisPanel.find('.mashabledata_map-graph-selected, .mashabledata_make-map.ui-button').button('disable');
                            });
                        if(isEmbedded){
                            //set the slider width here after all the button calls
                            var sliderWidth = Math.max(100, $thisPanel.find('.mashabledata_map-controls').outerWidth(true)-$thisPanel.find('.mashabledata_map-step-backward').outerWidth(true)-$play.outerWidth(true)-$thisPanel.find('.mashabledata_map-step-forward').outerWidth(true)-$thisPanel.find('.mashabledata_map-graph-selected').outerWidth(true)-$thisPanel.find('.mashabledata_make-map').outerWidth(true)-30);
                            $mapSlider.width(sliderWidth);
                        } else {
                            $thisPanel.find('button.group').button({icons: {secondary: 'ui-icon-circle-plus'}}).off()
                                .click(function(){
                                    if(mergablity.newMerge){
                                        if(!oGraph.mapsets[activeMapTab].options.merges) oGraph.mapsets[activeMapTab].options.merges = [];
                                        oGraph.mapsets[activeMapTab].options.merges.push($map.getSelectedRegions());
                                    }
                                    if(mergablity.growable){
                                        var i, j, newMerge = [];
                                        var selectedMarkers = $map.getSelectedMarkers();
                                        var selectedRegions = $map.getSelectedRegions();
                                        //step 1.  remove the existing merges of compound markers
                                        for(i=0;i<selectedMarkers.length;i++){
                                            newMerge = newMerge.concat(selectedMarkers[i].split("+"));
                                            if(selectedMarkers[i].split("+").length>1){
                                                for(j=0;j<oGraph.mapsets[activeMapTab].options.merges.length;j++){
                                                    if(selectedMarkers[i] == oGraph.mapsets[activeMapTab].options.merges[j].join("+")){
                                                        oGraph.mapsets[activeMapTab].options.merges.splice(j, 1);
                                                        break;
                                                    }
                                                }
                                            }
                                        }
                                        //step 2 add merges to which a selected region belongs
                                        for(i=0;i<selectedRegions.length;i++){
                                            for(j=0;j<oGraph.mapsets[activeMapTab].options.merges.length;j++){
                                                if(oGraph.mapsets[activeMapTab].options.merges[j].indexOf(selectedRegions[i])>-1){
                                                    newMerge = newMerge.concat(oGraph.mapsets[activeMapTab].options.merges.splice(j,1)[0]);
                                                    break;
                                                }
                                            }
                                        }
                                        //step 3 add in new regions
                                        for(i=0;i<selectedRegions.length;i++){
                                            if(newMerge.indexOf(selectedRegions[i])==-1) newMerge.push(selectedRegions[i]);
                                        }
                                        oGraph.mapsets[activeMapTab].options.merges.push(newMerge);
                                    }
                                    $map.removeAllMarkers();
                                    $map.clearSelectedRegions();
                                    _drawMap_bubbleCalc();
                                    _drawMap_positionBubbles();
                                    $map.series.markers[0].setAttributes(_getMapDataByContainingDate(calculatedMapData.markerAttr.r, calculatedMapData.dates[val].s));
                                    $map.series.markers[2].setAttributes(_getMapDataByContainingDate(calculatedMapData.markerAttr.stroke, calculatedMapData.dates[val].s));
                                    $map.series.regions[0].setAttributes(calculatedMapData.regionsColorsForBubbles);
                                    _makeDirty();
                                });
                            $thisPanel.find('button.ungroup').button({icons: {secondary: 'ui-icon-arrow-4-diag'}}).off()
                                .click(function(){
                                    var i, j, pos;
                                    var selectedMarkers = $map.getSelectedMarkers();
                                    var selectedRegions = $map.getSelectedRegions();
                                    for(i=0;i<selectedMarkers.length;i++){
                                        if(selectedMarkers[i].split("+").length>1){
                                            for(j=0;j<oGraph.mapsets[activeMapTab].options.merges.length;j++){
                                                if(selectedMarkers[i] == oGraph.mapsets[activeMapTab].options.merges[j].join("+")){
                                                    oGraph.mapsets[activeMapTab].options.merges.splice(j, 1);
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                    for(i=0;i<selectedRegions.length;i++){
                                        for(j=0;j<oGraph.mapsets[activeMapTab].options.merges.length;j++){
                                            pos = oGraph.mapsets[activeMapTab].options.merges[j].indexOf(selectedRegions[i]);
                                            if(pos != -1){
                                                oGraph.mapsets[activeMapTab].options.merges[j].splice(pos, 1);
                                                if(oGraph.mapsets[activeMapTab].options.merges[j].length==0){
                                                    oGraph.mapsets[activeMapTab].options.merges.splice(j,1);
                                                }
                                                break;
                                            }
                                        }
                                    }
                                    $map.removeAllMarkers();
                                    $map.clearSelectedRegions();
                                    _drawMap_bubbleCalc();
                                    _drawMap_positionBubbles();
                                    $map.series.markers[0].setAttributes(_getMapDataByContainingDate(calculatedMapData.markerAttr.r, calculatedMapData.dates[val].s));
                                    $map.series.markers[2].setAttributes(_getMapDataByContainingDate(calculatedMapData.markerAttr.stroke, calculatedMapData.dates[val].s));
                                    $map.series.regions[0].setAttributes(calculatedMapData.regionsColorsForBubbles);
                                    _makeDirty();
                                });
                        }
                        //legend no longer a user option:  set in workbench only and uses JVM 2.0 legend rather than SVG
                        var gLegend,
                            makeLegend;  //reference to _drawmap_makeLegend()
                        $thisPanel.find('input.mashabledata_legend').change(function(){
                            oGraph.mapconfig.showLegend = ($(this).prop('checked'));
                            _makeDirty();
                            if(oGraph.mapconfig.showLegend) {
                                gLegend = makeLegend($map);
                            } else {
                                gLegend.remove();
                            }
                        });
                        console.timeEnd('buildGraphPanel:mapControls');
                    }
                    //PRIVATE FUNCTION FOR _drawMap
                    function _drawMap_markerSparkData(code){
                        var markerSparkData = {data: []}, i;
                        for(i=0;i<calculatedMapData.dates.length;i++){
                            //show sparkline of radius data if exists; else fill data
                            if(typeof calculatedMapData.markerData[calculatedMapData.dates[i].s]!='undefined') {
                                markerSparkData.data.push([calculatedMapData.dates[i].dt.getTime(), calculatedMapData.markerData[calculatedMapData.dates[i].s][code].f||calculatedMapData.markerData[calculatedMapData.dates[i].s][code].r]);  //when markers have been fill and radius scale, fill usually has more variance (e.g r=population and f=unemployment)
                                if(i==val) markerSparkData.currentIndex = markerSparkData.data.length-1;
                            }
                        }
                        return markerSparkData;
                    }

                    function _drawMap_setMergablity(){
                        var i, j, markerRegions;
                        mergablity = {
                            "newMerge": false,
                            "growable": false,
                            "splinter": false,
                            "ungroupable": false
                        };
                        if(!_drawMap_isBubble()) return;
                        var selectedMarkers = $map.getSelectedMarkers();
                        var selectedRegions = $map.getSelectedRegions();
                        //ungroupable
                        for(i=0;i<selectedMarkers.length;i++){
                            if(selectedMarkers[i].split('+').length>1) {
                                mergablity.ungroupable = true;
                                break;
                            }
                        }
                        if(oGraph.mapsets[activeMapTab].options.merges){
                            for(i=0;i<selectedRegions.length;i++){
                                for(j=0;j<oGraph.mapsets[activeMapTab].options.merges.length;j++){
                                    if(oGraph.mapsets[activeMapTab].options.merges[j].indexOf(selectedRegions[i])>=0) {
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
                    function _drawMap_makeList(action, code){  //if action = new, recalc and make the list table otherwise just highlight the code row
                        var list = [], id, units, attr;
                        if(action=='new'){
                            if(oGraph.mapsets){
                                units = calculatedMapData.mapUnits;
                                var regionData = _getMapDataByContainingDate(calculatedMapData.regionData, calculatedMapData.dates[val].s);
                                for(id in regionData){
                                    if(regionData[id] !== null && $map.mapData.paths[id]){ //exclude regions (bunnies, over seas terriories) included in mapset data but not on basemap
                                        list.push({name: $map.getRegionName(id), value: regionData[id], id: id});
                                    }
                                }
                            } else { //pointsets only if no map sets
                                if (calculatedMapData.fillUnits) { //fill over radius
                                    units = calculatedMapData.fillUnits;
                                    attr = 'f';
                                } else {
                                    units = calculatedMapData.radiusUnits;
                                    attr = 'r';
                                }
                                var markerData = _getMapDataByContainingDate(calculatedMapData.markerData, calculatedMapData.dates[val].s);
                                for(id in markerData){
                                    if(markerData[id][attr] !== null){
                                        list.push({name: calculatedMapData.markers[id].name, value: markerData[id][attr], id: id});
                                    }
                                }
                            }
                            list.sort(function(a,b){return (oGraph.mapconfig.mapViz=='list-desc'?-1:1)*(a.value - b.value);});
                            var html='<div class="mashabledata_map-list"><table><thead><th>Rank <br>' + $mapDateDiv.html() + '</th><th>' + calculatedMapData.title + '</th><th>' + units + '</th></thead><tbody>';
                            for(var i=0;i<list.length;i++){
                                html += '<tr data="'+list[i].id+'"><td>'+ (i+1) +'</td><td>'+ list[i].name +'</td><td>'+ list[i].value +'</td></tr>';
                            }
                            html += '</tbody></table></div>';
                            var vizHeight = $thisPanel.find('.mashabledata_cube-viz').html(html)
                                .find('tbody tr').hover(
                                function(){//mouse enter
                                    var code = $(this).attr('data');
                                    if(code && code!='undefined'){
                                        $map.setSelectedRegions(code);
                                    }
                                },
                                function(){//mouse exit
                                    var code = $(this).attr('data');
                                    if(code && code!='undefined'){
                                        var selection = {};
                                        selection[code] = false;
                                        $map.setSelectedRegions(selection);
                                    }
                                }
                            )
                                .end().innerHeight();
                            $thisPanel.find('.mashabledata_cube-viz tbody').css("height", (vizHeight-$thisPanel.find('.mashabledata_cube-viz thead').height())+'px');
                        }
                        if(code){
                            $thisPanel.find('.mashabledata_cube-viz table tr').removeClass('ui-selected').find("tr[data='"+code+"']").addClass('ui-selected');
                        }
                    }
                    function _drawMap_isBubble(){
                        return  oGraph.mapsets && (mapMode == 'bubbles' || mapMode =='change-bubbles');
                    }
                    function _drawMap_bubbleCalc(){ //defined in the closure, therefor has access to calculatedMapData and other variables specific to this panelGraph
                        var dateKey, markerId, markerTitle, regionColors = primeColors.concat(hcColors); //use bright + Highcharts colors
                        //mapMode must either be 'bubbles' or
                        calculatedMapData.regionsColorsForBubbles={};
                        calculatedMapData.markers={};
                        var pnt = {x:100, y:100};  //somewhere in the US.  If this works, need to fetch geometric center of map (US, world, Europe..)
                        if(_drawMap_isBubble()){ //triple check that we should be executing this routine
                            var region, mergedSum, i=0, d, j, allMergedRegions = [];
                            /*co-opt the marker variables:
                             calculatedMapData.markerDataMin
                             calculatedMapData.markerDataMax
                             calculatedMapData.markerData
                             calculatedMapData.markerAttr.r[dateKey][markerId]
                             calculatedMapData.markerAttr.stroke[dateKey][markerId]
                             */
                            //initialize markerData variable object
                            var merge, mergeCode, markerData = {}, markerAttr = {r: {}, stroke: {}}, bubbleValue, y, y0;
                            _setStartEndDateIndexes();
                            //initalize markerData and markerAttr
                            for(d=calculatedMapData.startDateIndex;d<=calculatedMapData.endDateIndex;d++){
                                dateKey = calculatedMapData.dates[d].s;
                                markerData[dateKey] = {};
                                markerAttr.r[dateKey] = {};
                                markerAttr.stroke[dateKey] = {};
                            }
                            //calculate values and marker min and max
                            calculatedMapData.markerDataMin = Number.MAX_VALUE; //initialized; to be minned against merged and single point values below
                            calculatedMapData.markerDataMax = Number.MIN_VALUE;  //initialize; to be maxxed against merged and single point values below
                            //1A: calculate the merge values within the graph date range as determined by calculatedMapData.startDateIndex and .endDateIndex
                            var mapsetOptions = oGraph.mapsets[activeMapTab].options;
                            var startDateKey = calculatedMapData.dates[calculatedMapData.startDateIndex].s;
                            if(mapsetOptions.merges){
                                for(i=0;i<mapsetOptions.merges.length;i++){
                                    merge = mapsetOptions.merges[i];
                                    mergeCode = merge.join('+');
                                    markerTitle = calculatedMapData.title + ' for ' + mergeCode ;
                                    calculatedMapData.markers[mergeCode] = {name: mergeCode, point: pnt, style: {fill: 'pink'}};
                                    for(d=calculatedMapData.startDateIndex;d<=calculatedMapData.endDateIndex;d++){
                                        mergedSum = 0;  //merging regions only adds.  There is no complex math
                                        for(j=0;j<merge.length;j++){
                                            mergedSum += calculatedMapData.regionData[calculatedMapData.dates[d].s][merge[j]]||0;
                                        }
                                        if(mapMode=='change-bubbles'){
                                            bubbleValue = mergedSum - markerData[startDateKey][mergeCode][r];
                                        } else {  //'bubbles'
                                            bubbleValue = mergedSum;
                                        }
                                        markerData[calculatedMapData.dates[d].s][mergeCode] = {r: mergedSum};
                                        if(mergedSum!==null){ //Math object methods treat nulls as zero
                                            calculatedMapData.markerDataMin = Math.min(calculatedMapData.markerDataMin, bubbleValue);
                                            calculatedMapData.markerDataMax = Math.max(calculatedMapData.markerDataMax, bubbleValue);
                                        }
                                    }
                                    for(j=0;j<merge.length;j++){
                                        calculatedMapData.regionsColorsForBubbles[merge[j]] = regionColors[i%regionColors.length];
                                    }
                                    allMergedRegions = allMergedRegions.concat(merge);
                                }
                            }
                            //1B: calculate the unmerged values (also within the graph date range as determined by calculatedMapData.startDateIndex and .endDateIndex)
                            var regionName = true;
                            for(region in calculatedMapData.regionData[calculatedMapData.dates[0].s]){
                                //don't make bubbles for the bunnies!
                                try{regionName = $map.getRegionName(region)} catch(ex){regionName = false} //jVectorMaps throws an error on
                                if(regionName && allMergedRegions.indexOf(region) == -1 && typeof calculatedMapData.regionData[calculatedMapData.dates[0].s][region]!='undefined'){  //make sure this region is also not part of a merge and has data
                                    calculatedMapData.markers[region] = {name: region, point: pnt, style: {fill: globals.bubbleColor}};
                                    calculatedMapData.regionsColorsForBubbles[region] = globals.MAP_COLORS.MID; //don't color the unmerged regions! Was: regionColors[i++%regionColors.length];
                                    y0 = null;
                                    for(d=calculatedMapData.startDateIndex;d<=calculatedMapData.endDateIndex;d++){
                                        dateKey = calculatedMapData.dates[d].s;
                                        markerData[dateKey][region] = {r: calculatedMapData.regionData[dateKey][region]};
                                        if(markerData[dateKey][region].r!==null && !isNaN(markerData[dateKey][region].r)){ //Math object methods treat nulls as zero
                                            if(d==calculatedMapData.startDateIndex) y0 = markerData[dateKey][region].r;
                                            if(mapMode=='change-bubbles' && y0!==null && !isNaN(y0)){
                                                calculatedMapData.markerDataMin = Math.min(calculatedMapData.markerDataMin, markerData[dateKey][region].r - y0);
                                                calculatedMapData.markerDataMax = Math.max(calculatedMapData.markerDataMax, markerData[dateKey][region].r - y0);
                                            } else {  //mapMode=='bubbles'
                                                calculatedMapData.markerDataMin = Math.min(calculatedMapData.markerDataMin, markerData[dateKey][region].r);
                                                calculatedMapData.markerDataMax = Math.max(calculatedMapData.markerDataMax, markerData[dateKey][region].r);
                                            }
                                        }
                                    }
                                }
                            }
                            //2.  go back and create attribute (.r and .stroke) objects
                            var rData,
                                rScale = (oGraph.mapconfig.maxRadius || DEFAULT_RADIUS_SCALE) / Math.sqrt(Math.max(Math.abs(calculatedMapData.markerDataMax), Math.abs(calculatedMapData.markerDataMin)));
                            for(dateKey in markerData){
                                for(markerId in markerData[dateKey]){
                                    y = markerData[dateKey][markerId].r;
                                    if(mapMode=='change-bubbles'){
                                        y0 = markerData[startDateKey][markerId].r;
                                        rData = (!isNaN(y) && !isNaN(y0) && y!==null && y0!==null)? y-y0 : null;
                                    } else {
                                        rData = y || null;
                                    }
                                    markerAttr.r[dateKey][markerId] = rScale *  Math.sqrt(Math.abs(rData));
                                    markerAttr.stroke[dateKey][markerId] = rData<0?'#ff0000':'#000000'; //create the style object with the stroke = RED for neg numbers
                                }
                            }
                            calculatedMapData.markerData = markerData;  //set (or replace if user is adding and removing merges)
                            calculatedMapData.markerAttr = markerAttr;
                            calculatedMapData.radiusUnits = calculatedMapData.mapUnits; //for marker label routine
                        }
                    }
                    function _drawMap_geometricCenter(regions){
                        var bBox, totalArea=0, xArm=0, yArm=0, center, regCenter, latlon, compHandle;
                        for(var i=0;i<regions.length;i++){  //iterate through the list
                            latlon=null;
                            $.each(oGraph.mapsets[activeMapTab].components, function(c, comp){
                                compHandle = comp.handle();
                                if(oGraph.assets[compHandle].data[regions[i]]&&comp.isMapSet()&&oGraph.assets[compHandle].data[regions[i]].latlon){
                                    latlon = oGraph.assets[compHandle].data[regions[i]].latlon.split(',');
                                }
                            });
                            bBox = $g.find('path[data-code='+regions[i]+']').get(0).getBBox();
                            if(latlon){
                                regCenter = $map.latLngToPoint(latlon[0],latlon[1]);
                                xArm += (regCenter.x - $map.transX) * bBox.width * bBox.height / $map.scale;
                                yArm += (regCenter.y - $map.transY) * bBox.width * bBox.height / $map.scale;
                            } else {
                                xArm += (bBox.x + bBox.width/2) * bBox.width * bBox.height;
                                yArm += (bBox.y + bBox.height/2) * bBox.width * bBox.height;
                            }
                            totalArea +=  bBox.width * bBox.height;
                        }
                        center = {
                            x: (xArm / totalArea + $map.transX) * $map.scale,
                            y: (yArm / totalArea + $map.transY) * $map.scale
                        };
                        return center;
                    }
                    function _drawMap_positionBubbles(){  //must be called after map creation in order to get x-y coordinates of SVG boundingBoxes and to use jvMap's pointToLatLng method
                        var center, latLng;
                        if(_drawMap_isBubble()){
                            var region, i=0, j, allMergedRegions = [];
                            if(oGraph.mapsets[activeMapTab].options.merges){
                                for(i=0;i<oGraph.mapsets[activeMapTab].options.merges.length;i++){
                                    center = _drawMap_geometricCenter(oGraph.mapsets[activeMapTab].options.merges[i]);
                                    latLng = $map.pointToLatLng(center.x, center.y);
                                    calculatedMapData.markers[oGraph.mapsets[activeMapTab].options.merges[i].join('+')].latLng = [latLng.lat, latLng.lng];
                                    allMergedRegions = allMergedRegions.concat(oGraph.mapsets[activeMapTab].options.merges[i]);
                                }
                            }
                            $g.find('path[data-code]').each(function(){
                                region  = $(this).attr('data-code');
                                if(allMergedRegions.indexOf(region) == -1 && typeof calculatedMapData.regionData[calculatedMapData.dates[0].s][region]!='undefined'){  //this region is not part of a merge and also has data
                                    center = _drawMap_geometricCenter([region]);
                                    latLng = $map.pointToLatLng(center.x, center.y);
                                    calculatedMapData.markers[region].latLng = [latLng.lat, latLng.lng]; //TODO: calc value and set color
                                }
                            });
                            /*                for(var m in calculatedMapData.markers){
                             $map.addMarker()
                             }*/
                            $map.addMarkers(calculatedMapData.markers); //if the marker id exists, this method will reposition the marker
                            //$map.series.markers[0].setAttributes (_getMapDataByContainingDate(calculatedMapData.markerData,calculatedMapData.dates[val].s));
                        }
                    }
                    function _drawMap_updateSupplementaryVizFromMap(code, isSelected){
                        //just for the auto cubes
                        var i, j, vizChart = oGraph.controls.vizChart, redrawNeeded = false;
                        if(oGraph.hasMapViz() && !oGraph.cubeid){
                            var mapPlot = oGraph.mapsets[activeMapTab],
                                selectedRegions = $map.getSelectedRegions(),
                                mapDate = calculatedMapData.dates[val].s,
                                thisCode;
                            if(code && isSelected && selectedRegions.indexOf(code)===-1) selectedRegions.push(code);
                            var vizChartGeos = getVizChartGeos(selectedRegions, oGraph, mapPlot, oGraph.mapconfig.mapViz=='line-bunnies'||oGraph.mapconfig.mapViz=='bar-component-bunnies');

                            switch(oGraph.effectiveVizMode()){
                                case 'scatter':
                                    if(vizChartGeos.length){
                                        for(i=0;i<vizChartGeos.length;i++){
                                            var pointOver = oGraph.controls.vizChart.get(vizChartGeos[i].code);
                                            if(pointOver && pointOver.select) pointOver.select(true, i>0);
                                        }
                                    } else {
                                        var selectedPoints = oGraph.controls.vizChart.getSelectedPoints();
                                        for(i=0;i<selectedPoints.length;i++){
                                            selectedPoints[i].select(false);
                                        }
                                    }
                                    break;
                                case 'line':
                                case 'line-bunnies':
                                    //all other cube viz need a geokey, whether bunny or a selected code
                                    var geoKey, mapCode;
                                    var sDate, regionData = oGraph.calculatedMapData.regionData;
                                    var colorIndex = 0, serie, chartedCodes = [];
                                    //add new series
                                    for(i=0;i<vizChartGeos.length;i++){
                                        thisCode = vizChartGeos[i].code;
                                        if(chartedCodes.indexOf(thisCode)===-1){
                                            if(!vizChart.get(thisCode)){
                                                serie = {
                                                    id: thisCode,
                                                    animation: false,
                                                    marker: {enabled: false},
                                                    name: vizChartGeos[i].geoname,
                                                    data: [],
                                                    color: hcColors[colorIndex % hcColors.length]
                                                };
                                                if(vizChartGeos[i].regionalBunny) serie.dashStyle = 'ShortDot';  //short dash
                                                for(j=calculatedMapData.startDateIndex;j<=calculatedMapData.endDateIndex;j++){
                                                    sDate = calculatedMapData.dates[j].s;
                                                    if(regionData[sDate] && typeof regionData[sDate][thisCode] != 'undefined')  serie.data.push([dateFromMdDate(sDate).getTime(), regionData[sDate][thisCode]]);
                                                }

                                                serie.data.sort(function(a,b) {return a[0]-b[0]});
                                                vizChart.addSeries(serie, false);
                                                redrawNeeded = true;
                                            }
                                            if(!vizChartGeos[i].regionalBunny) colorIndex++;
                                            chartedCodes.push(thisCode);
                                        }
                                    }
                                    //remove leftovers
                                    for(i=vizChart.series.length-1;i>=0;i--){ //loop backwards otherwise series.length will change and not all series will be removed
                                        serie = vizChart.series[i];
                                        if(chartedCodes.indexOf(serie.userOptions.id)===-1) {
                                            serie.remove(false);
                                            redrawNeeded = true;
                                        }
                                    }
                                    if(redrawNeeded) vizChart.redraw();
                                    break;
                                case 'components-bar':
                                case 'components-bar-bunnies':
                                    if(vizChartGeos.length){
                                        var bars = mapPlot.summationComponentSeries(vizChartGeos, mapDate);
                                        //remove any existing charted series
                                        while(vizChart.series.length){
                                            vizChart.series[0].remove(false);
                                        }
                                        for(i=0;i<bars.length;i++){
                                            bars[i].marker = {enabled: false};
                                            bars[i].color = globals.hcColors[i % globals.hcColors.length];
                                            vizChart.addSeries(bars[i], redrawNeeded)
                                        }
                                        vizChart.redraw();
                                    }

                                    break;
                                case 'components-area':
                                    if(vizChartGeos.length){
                                        var lastvizChartGeo = vizChartGeos[vizChartGeos.length-1];
                                        var series = mapPlot.summationComponentSeries([lastvizChartGeo]);
                                        vizChart.setTitle({}, {text: series.length?series[0].geoname:''}, redrawNeeded);
                                        //remove any existing charted series
                                        for(i=vizChart.series.length-1;i>=0;i--){ //loop backwards otherwise series.length will change and not all series will be removed
                                            vizChart.series[i].remove(false);
                                        }
                                        //add the components as stacked series
                                        for(i=0;i<series.length;i++){
                                            series[i].marker = {enabled: false};
                                            series[i].color = globals.hcColors[i % globals.hcColors.length];
                                            vizChart.addSeries(series[i], redrawNeeded)
                                        }
                                        vizChart.redraw();
                                    }
                                    break;
                                case 'components-line':
                                    if(vizChartGeos.length) {
                                        var series = mapPlot.summationComponentSeries(vizChartGeos);
                                        vizChart.setTitle({}, {text: vizChartGeos.length==1?series[0].geoname:''}, redrawNeeded);
                                        //remove any existing charted series
                                        while(vizChart.series.length){ //loop backwards otherwise series.length will change and not all series will be removed
                                            vizChart.series[0].remove(false);
                                        }
                                        //add the components as stacked series
                                        for(i=0;i<series.length;i++){
                                            if(vizChartGeos.length>1) series[i].name = series[i].seriesname || (series[i].name + ': ' + series[i].geoname);
                                            series[i].marker = {enabled: false};
                                            series[i].color = globals.hcColors[i % globals.hcColors.length];
                                            vizChart.addSeries(series[i], redrawNeeded)
                                        }
                                        vizChart.redraw();
                                    }
                                    break;
                                case 'list-asc':
                                case 'list-desc':
                                    $thisPanel.find('div.mashabledata_map-list tr.mashabledata_map-list-selected').removeClass('mashabledata_map-list-selected');
                                    for(i=0;i<vizChartGeos.length;i++){
                                        thisCode = vizChartGeos[i].code;
                                        $thisPanel.find('div.mashabledata_map-list tr[data=\''+thisCode+'\']').addClass('mashabledata_map-list-selected');
                                    }
                                    break;
                            }
                        }
                    }
                    function _drawMap_makeSupplementaryViz(code, isSelected){
                        console.time('_drawMap_makeSupplementaryViz');
                        //Called from _drawMap_setRegionsMarkersAttribute and from _drawMap_setRegionsMarkersAttribute (initial setup and after map slider change).
                        //This will be called multiple time from RegionOnSelect event when deselecting all.
                        //exit now if no cube or map viz
                        if(!oGraph.hasMapViz()) return; //abort if
                        //LISTS
                        if(!oGraph.cubeid && (oGraph.mapconfig.mapViz=='list-asc' || oGraph.mapconfig.mapViz=='list-desc')){
                            _drawMap_makeList(code?false:'new', code);
                            return;
                        }
                        //COMMON TO ALL OTHER CUBE VIZES
                        var mapPlot = oGraph.mapsets? oGraph.mapsets[activeMapTab] : oGraph.pointset[0];

                        //all other cube viz need a geokey, whether bunny or a selected code
                        var geoKey, mapDate = calculatedMapData.dates[val].s, mapCode;
                        var selectedRegions = $map.getSelectedRegions();
                        if(code){
                            geoKey = code;
                        } else {
                            geoKey = null;
                            //is a (last) region selected
                            if(selectedRegions.length>0){
                                geoKey = selectedRegions[0]
                            } else { //how about a marker
                                var selectedMarkers = $map.getSelectedMarkers();
                                if(selectedMarkers.length>0){
                                    geoKey = selectedMarkers[0]
                                } else {
                                    geoKey = oGraph.bunny || mapsList[oGraph.map].bunny;  //attached to the graph
                                }
                            }
                        }
                        //COMPONENTS (bars, lines, and stacked area)  note:  if not a summation map, degrade to regular 'line' vizMode
                        if(!oGraph.cubeid && oGraph.isSummationMap(activeMapTab) && (oGraph.mapconfig.mapViz=='components-bar' || oGraph.mapconfig.mapViz=='components-line' || oGraph.mapconfig.mapViz=='components-area')){
                            if(!isNaN(geoKey)) geoKey = 'G'+geoKey; //don't show the map name for the bunny of a summation map:  only instructions
                            var oFormula = mapPlot.calculatedFormula;
                            var signedNumArray = oFormula.numFormula.replace('-','+-').split('+');
                            var unsignedNumArray = oFormula.numFormula.replace('-','+').split('+');

                            //get the categories and title
                            var supVizGraphTitle = common.extactCategoryNamesTitle(mapPlot.components); //the category properties has been added to each component object

                            var vizChart = {
                                chart: {
                                    type: 'line',
                                    spacingRight: 50,
                                    renderTo: oGraph.controls.$thisPanel.find('.mashabledata_cube-viz')[0]
                                },
                                title: {
                                    text: supVizGraphTitle,
                                    style: {fontSize: '12px'}
                                },
                                subtitle: {
                                    text: oGraph.literal('vizMsg'),
                                    style: {fontSize: '10px'}
                                },
                                xAxis: {
                                    type: 'datetime'
                                },
                                yAxis: {
                                    title: {
                                        text: mapPlot.units()
                                    }
                                },
                                credits: {
                                    href: "http://www.mashabledata.com",
                                    text: oGraph.literal('src')
                                },
                                exporting: {
                                    enabled: false
                                },
                                legend: {
                                    floating: false,
                                    borderWidth: 0,
                                    y: -5
                                },
                                series: [],
                                tooltip: {
                                    formatter: function(){
                                        return '<b>'+ (this.series.userOptions.seriesname || this.series.name) + '</b><br>'
                                            + formatDateByPeriod(this.point.x, this.series.userOptions.freq) + ':<br>'
                                            + common.numberFormat(Math.abs(this.point.y), 0) + ' ' + mapPlot.units()
                                            + (this.series.userOptions.src?'<br><i>source: '+this.series.userOptions.src+'</i>':'');
                                    }
                                }
                            };

                            switch(oGraph.mapconfig.mapViz){
                                case 'components-bar':
                                case 'components-bar-bunnies':
                                    vizChart.chart.type = 'bar';
                                    vizChart.xAxis = {categories: []};
                                    mapPlot.eachComponent(function(){vizChart.xAxis.categories.push(this.category)});
                                    break;
                                case 'components-line':
                                    break;
                                case 'components-area':
                                    vizChart.plotOptions = {area: {stacking: 'normal'}};
                                    vizChart.chart.type = 'area';
                                    break;
                            }

                            //loop though components and add data
                            mapPlot.eachComponent(function(){
                                var serie = {
                                    name: this.category,
                                    seriesname: this.name(),
                                    data: this.geoScaledData(code, oGraph.calculatedMapData.dates[oGraph.calculatedMapData.startDateIndex], oGraph.calculatedMapData.dates[oGraph.calculatedMapData.endDateIndex])
                                };
                            });

                            if(oGraph.controls.vizChart) oGraph.controls.vizChart.destroy();
                            oGraph.controls.vizChart = new Highcharts.Chart(vizChart);
                        }
                        //LINES
                        if(!oGraph.cubeid && (
                               oGraph.mapconfig.mapViz=='line'
                            || oGraph.mapconfig.mapViz=='line-bunnies'
                            || (!oGraph.isSummationMap(activeMapTab) && (oGraph.mapconfig.mapViz=='components-line' || oGraph.mapconfig.mapViz=='components-area'))
                            )
                        ){
                            var flotChartOptions = {title: mapPlot.name(), xaxis: 'time'};
                            if(code && isSelected && selectedRegions.indexOf(code)===-1) selectedRegions.push(code);
                            //make HighCharts options object and add series from vizGeos array and calcData (while avoid repeated containing geos)
                            var vizChart = {
                                chart: {
                                    type: 'line',
                                    spacingRight: 50,
                                    renderTo: oGraph.controls.$thisPanel.find('.mashabledata_cube-viz')[0]
                                },
                                title: {
                                    text: mapPlot.name(),
                                    style: {fontSize: '12px'}
                                    //text: (graph.assets.cube.theme||'')  + (graph.assets.cube.name?' by '+graph.assets.cube.name:'') + ' for ' + geoName
                                },
                                subtitle: {
                                    text: oGraph.literal('vizMsg'),
                                    style: {fontSize: '10px'}
                                    //y: (geoName?50:30)
                                },
                                xAxis: {
                                    type: 'datetime'
                                },
                                yAxis: {
                                    title: {
                                        text: mapPlot.units()
                                    } /*,
                                     labels: {
                                     enabled: false
                                     },
                                     lineWidth: 0,
                                     minorGridLineWidth: 0,
                                     lineColor: 'transparent',
                                     gridLineColor: 'transparent',
                                     gridLineWidth: 0*/
                                },
                                credits: {
                                    href: "http://www.mashabledata.com",
                                    text: oGraph.literal('src')
                                },
                                exporting: {
                                    enabled: false
                                },
                                legend: {
                                    floating: false,
                                    borderWidth: 0,
                                    y: -5
                                },
                                series: [],
                                tooltip: {
                                    formatter: function(){
                                        return '<b>'+ mapPlot.name() + '</b><br/>'
                                            + (this.id || this.series.name) +':<br/>'
                                            + common.numberFormat(Math.abs(this.point.y), 0) + ' ' + mapPlot.units();
                                    }
                                }
                            };
                            var sDate, regionData = oGraph.calculatedMapData.regionData;
                            var vizChartGeos = getVizChartGeos(selectedRegions, oGraph, mapPlot, oGraph.mapconfig.mapViz=='line-bunnies');
                            var serie, chartedCodes = [], thisCode, i, j;
                            for(i=0;i<vizChartGeos.length;i++){
                                thisCode = vizChartGeos[i].code;
                                if(chartedCodes.indexOf(thisCode)===-1){
                                    serie = {
                                        id: thisCode,
                                        marker: {enabled: false},
                                        name: vizChartGeos[i].geoname,
                                        data: []
                                    };
                                    if(vizChartGeos[i].bunny) serie.dashStyle = 'ShortDash';
                                    for(j=oGraph.calculatedMapData.startDateIndex;j<=oGraph.calculatedMapData.endDateIndex;j++){
                                        sDate = oGraph.calculatedMapData.dates[j].s;
                                        if(typeof regionData[sDate][thisCode] != 'undefined')  serie.data.push([dateFromMdDate(sDate).getTime(), regionData[sDate][thisCode]]);
                                    }
                                    serie.data.sort(function(a,b) {return a[0]-b[0]});
                                    vizChart.series.push(serie);
                                    chartedCodes.push(thisCode);
                                }
                            }
                            if(oGraph.controls.vizChart) oGraph.controls.vizChart.destroy();
                            oGraph.controls.vizChart = new Highcharts.Chart(vizChart);
                        }
                        //SCATTER / CROSS-CORRELATION
                        if(!oGraph.cubeid &&  oGraph.mapconfig.mapViz=='scatter' && oGraph.mapsets.length==2){
                            var mapPlotX = oGraph.mapsets[0], mapPlotY = oGraph.mapsets[1], scatterData = [];
                            if(!mapPlotX.calculatedMapData) _calcMap(oGraph, 0);
                            if(!mapPlotY.calculatedMapData) _calcMap(oGraph, 1);
                            var xArr = [],
                                yArr = [],
                                xData = _getMapDataByContainingDate(mapPlotX.calculatedMapData.regionData, mapDate),
                                yData = _getMapDataByContainingDate(mapPlotY.calculatedMapData.regionData, mapDate);
                            for(mapCode in xData){
                                if(yData[mapCode] && jvm.Map.maps[oGraph.mapFile].paths[mapCode]){ //has to be present on both maps
                                    scatterData.push({
                                        id: mapCode,
                                        x: xData[mapCode],
                                        y: yData[mapCode]
                                    }) ;
                                    xArr.push(xData[mapCode]);
                                    yArr.push(yData[mapCode]);
                                }
                            }

                            var correlationCoefficient = jStat.corrcoeff(xArr, yArr);
                            var pointMouse = function(point, active){
                                var regionSel = {};
                                regionSel[point.id] = active;
                                $map.setSelectedRegions(regionSel);
                            };
                            var xName = mapPlotX.name(), yName = mapPlotY.name(),
                                xUnits = mapPlotX.units(), yUnits = mapPlotY.units(),
                                highChartOptions = {
                                    chart: {
                                        type: 'scatter',
                                        spacingRight: 50,
                                        renderTo: oGraph.controls.$thisPanel.find('.mashabledata_cube-viz').get(0)
                                    },
                                    title: {text: ''},
                                    subtitle: {text: oGraph.literal('cor') + correlationCoefficient.toString().substr(0,6)},
                                    series: [{
                                        data: scatterData.sort(function(a,b){return a.x- b.x}),
                                        name:  xName + ' vs. ' + yName
                                    }],
                                    exporting: {enabled: false},
                                    tooltip: {
                                        formatter: function(){
                                            return '<b>'+$map.getRegionName(this.point.id) +'</b><br/><br/>' +
                                                '<b>'+ xName + ':</b><br/>' +
                                                common.numberFormat(this.point.x, 0) + ' ' + xUnits + '<br/><br/>' +
                                                '<b>'+ yName + ':</b><br/>' +
                                                common.numberFormat(this.point.y, 0) + ' ' + yUnits;
                                        },
                                        useHTML: true,
                                        style: {
                                            "max-width": "200px"
                                        }
                                    },
                                    plotOptions:  {
                                        series: {
                                            point: {
                                                events: {
                                                    mouseOver: function(){pointMouse(this, true)},
                                                    mouseOut: function(){pointMouse(this, false)}
                                                }
                                            }
                                        }
                                    },
                                    legend: {enabled: false},
                                    xAxis: {title: {text: mapPlotX.name() + '<br>'+mapPlotX.calculatedMapData.mapUnits+''}},
                                    yAxis: {title: {x:-20, text: mapPlotY.name() + '<br>'+mapPlotY.calculatedMapData.mapUnits+''}}
                                };
                            oGraph.controls.vizChart = new Highcharts.Chart(highChartOptions);
                            oGraph.controls.annotations.plotLinearRegression(oGraph.controls.vizChart, highChartOptions.series[0], true);
                        }
                        //CUBE FETCH
                        if(parseInt(oGraph.cubeid)) {
                            var action = 'new';
                            if(oGraph.isSummationMap()){
                                if(code){
                                    action = isSelected?'add':'remove';
                                } else {
                                    action = 'summation';
                                }
                            }
                            vizualizeCube(oGraph, activeMapTab, geoKey, mapDate, action);
                            console.time('vizChart.redraw');
                            if(!noCubeRedraw && action=='remove') oGraph.controls.vizChart.redraw();
                            console.timeEnd('vizChart.redraw');
                        }
                        $mapDateDiv.html(formatDateByPeriod(calculatedMapData.dates[val].dt.getTime(), calculatedMapData.freq));
                        console.timeEnd('_drawMap_makeSupplementaryViz');
                    }
                    //don't show if map has only a single date
                    function _drawMap_setRegionsMarkersAttribute(val, tabChanged){
                        //Need to handle for activeMapTab
                        if(oGraph.mapsets){
                            switch(mapMode){
                                case 'heat':
                                case 'abs-change':
                                case 'percent-change':
                                case 'correlation':
                                    //these are all region shadings.  Magic is in calcAttribute and in onRegionTipShow
                                    $map.series.regions[0].setAttributes(_getMapDataByContainingDate(calculatedMapData.regionColors, calculatedMapData.dates[val].s));
                                    break;
                                case 'min':
                                case 'max':
                                    $map.series.regions[0].setValues(calculatedMapData.regionColors);
                                    break;
                                case 'bubbles':  //_drawMap_isBubble()?????
                                case 'change-bubbles':
                                    //these are bubble maps.  Magic is in bubbleCalc and onMarkerTipShow
                                    $map.series.markers[0].setAttributes(_getMapDataByContainingDate(calculatedMapData.markerAttr.r, calculatedMapData.dates[val].s));
                                    $map.series.markers[2].setAttributes(_getMapDataByContainingDate(calculatedMapData.markerAttr.stroke, calculatedMapData.dates[val].s));
                                    break;
                                case 'treemap':
                                    //calculate the squarified matrix, draws the SVG, and assigns tool tips on the fly
                                    if($map){
                                        $map.remove();
                                        $map = false;
                                    }
                                    makeTreeMap(
                                        $thisPanel.find('div.mashabledata_jvmap').html(''),
                                        oGraph.mapsets[activeMapTab].calculatedMapData,
                                        oGraph.mapFile,
                                        oGraph.mapsets[activeMapTab].calculatedMapData.dates[val].s
                                    );
                                    break;
                                case 'change-treemap':
                                    if($map){
                                        $map.remove();
                                        $map = false;
                                    }
                                    makeTreeMap(
                                        $thisPanel.find('div.mashabledata_jvmap').html(''),
                                        oGraph.mapsets[activeMapTab].calculatedMapData,
                                        oGraph.mapFile,
                                        oGraph.mapsets[activeMapTab].calculatedMapData.dates[val].s,
                                        oGraph.mapsets[activeMapTab].calculatedMapData.dates[0].s //fromDate for delta calc
                                    );
                                    //calculate the squarified matrix, draws the SVG, and assigns tool tips on the fly
                                    break;
                            }
                        }
                        if(oGraph.pointsets){
                            if(areaScaling){
                                $map.series.markers[0].setAttributes(_getMapDataByContainingDate(calculatedMapData.markerAttr.r, calculatedMapData.dates[val].s));
                                $map.series.markers[2].setAttributes(_getMapDataByContainingDate(calculatedMapData.markerAttr.stroke, calculatedMapData.dates[val].s));
                            }
                            if(fillScaling){
                                $map.series.markers[1].setAttributes(_getMapDataByContainingDate(calculatedMapData.markerAttr.fill, calculatedMapData.dates[val].s));
                            }
                        }
                        if(oGraph.plots && oGraph.mapsets[activeMapTab].mapMode()!='min' && oGraph.mapsets[activeMapTab].mapMode()!='max'){
                            var timeAxis = chart.xAxis[0];
                            timeAxis.removePlotLine('timeLine');
                            if(val<calculatedMapData.dates.length-1){
                                timeAxis.addPlotLine({
                                    value: calculatedMapData.dates[val].dt,
                                    color: 'red',
                                    width: 2,
                                    id: 'timeLine'
                                })
                            }
                        }
                        var vizChart = oGraph.controls.vizChart, isVizChartDataTime = false;
                        if(vizChart && vizChart.xAxis && vizChart.xAxis.length && vizChart.xAxis[0].options.type=='datetime'){
                            isVizChartDataTime = true;
                            timeAxis = vizChart.xAxis[0];
                            timeAxis.removePlotLine('timeLine');
                            if(val<calculatedMapData.dates.length-1){
                                timeAxis.addPlotLine({
                                    value: calculatedMapData.dates[val].dt,
                                    color: 'red',
                                    width: 2,
                                    id: 'timeLine'
                                })
                            }
                        }
                        if(!(mapMode == 'correlation' && tabChanged) && !isVizChartDataTime) _drawMap_makeSupplementaryViz();
                    }
                    function _drawMap_makeLegend(map){
                        var standardRadius=10, textCenterFudge=5, lineHeight=20, spacer=10, markerLegendWidth, regionLegendWidth, regionHeight= 0, markerHeight= 0, y=0, i, yOffset, xOffset, MAX_MARKER_LABEL_LENGTH = 20;
                        if(oGraph.mapsets && !_drawMap_isBubble()){
                            if(oGraph.mapsets[activeMapTab].options.scale == 'discrete'){
                                regionLegendWidth=185;
                                regionHeight = lineHeight + 2*spacer + oGraph.mapsets[activeMapTab].options.discreteColors.length*(spacer+20);
                            } else {
                                regionLegendWidth=100;
                                if(calculatedMapData.regionMin<0 && calculatedMapData.regionMax>0) { //spans?
                                    regionHeight = 6*spacer+2*80+4*lineHeight; //yes = need two continuous scale segments
                                } else {
                                    regionHeight = 4*spacer+80+3*lineHeight;  //no = just one continuous scale segment
                                }
                            }
                        } else regionLegendWidth=0;
                        /*for markers, we need to know if how many pointset attribute are fill and how many are area:
                         area=1 & fill=0: show filled min and max circles only with unit label
                         area>1 & fill=0: show hollow min and max circles with units + colored fixed-radius circles with names
                         area=0 & fill>0: color scale with units
                         area>0 & fill>0: show hollow min and max circles with units + color scale with units
                         legend components:
                         1. solid fix-radius circle with names iff area>1 & fill=0
                         2. min & max cicles iff area>0
                         2b. never fill the scale circles XXXfill min and max iif (area=1 & fill=0)
                         3. show color scale iff fill>0
                         */
                        var areaCount = areaScalingCount(oGraph.pointsets), fillCount = fillScalingCount(oGraph.pointsets);
                        if(oGraph.pointsets || _drawMap_isBubble()) {
                            markerLegendWidth=185;
                            if(areaCount>1 && fillCount==0){
                                markerHeight += (areaCount)*(spacer+2*standardRadius)+(markerHeight==0?spacer:0);
                            }
                            if(areaCount>0 || _drawMap_isBubble()){
                                var maxRadius = parseInt(oGraph.mapconfig.maxRadius)||DEFAULT_RADIUS_SCALE;
                                var smallRadius = +maxRadius/Math.sqrt(10);
                                markerHeight += 2*(spacer + Math.max(maxRadius,15) + smallRadius) + (markerHeight==0?spacer:0);
                            }
                        } else markerLegendWidth = 0;
                        //use JVM to add a new group not subject to zooming, where map = new jvm.Map({....});
                        var gLegend = map.canvas.addGroup(); //gLegend ultimately returned;
                        //for some reason, adding an (invisiable) element in JVM straightens out the coordinate system for IE
                        map.canvas.addCircle({cx:0,cy:0}, {initial: {r:20, "fill-opacity": 0, "stroke-width":  0 }}, gLegend);
                        //use the more complete Highcharts renderer, which must be instantiated on its own (hidden dummy) DIV
                        $thisPanel.append('<div id="dummyLegend" class="hidden"></div>');
                        var hcr = new Highcharts.Renderer($('#dummyLegend')[0], map.width, map.height);
                        //redirect the Highcharts' renderer to add element to JVM's new group instead of the dummy div's group
                        hcr.box = gLegend.node;
                        $('#dummyLegend').remove();
                        var legendLocation = oGraph.mapconfig.legendLocation || mapsList[oGraph.map].legend || 'TR';
                        switch(legendLocation.substr(0,1)){
                            case 'T':
                                yOffset = spacer;
                                break;
                            case 'C':
                                yOffset = (map.height - Math.max(markerHeight,regionHeight))/2 - spacer;
                                break;
                            case 'B':
                                yOffset = map.height - Math.max(markerHeight,regionHeight) - spacer;
                        }
                        switch(legendLocation.substr(1,1)){
                            case 'L':
                                xOffset = spacer;
                                if(legendLocation.substr(0,1)=='T') xOffset+=30; //space for zoom buttons
                                break;
                            case 'C':
                                xOffset = (map.width-regionLegendWidth-markerLegendWidth)/2-spacer;
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
                        if(oGraph.pointsets||_drawMap_isBubble()){
                            if(areaCount>1 && fillCount==0){
                                //POINTSET LABELS
                                $.each(oGraph.pointsets, function(i){
                                    if(this.options.attribute!='fill'){
                                        y = (i+1)*(spacer+2*standardRadius)-standardRadius;
                                        hcr.circle(xOffset + spacer + standardRadius, yOffset + y, Math.min(maxRadius, standardRadius)).attr({
                                            fill: this.options.color,
                                            opacity: 1,
                                            'fill-opacity': 1,
                                            stroke: 'black',
                                            'stroke-width': 1
                                        }).add();
                                        hcr.text(oGraph.pointsets[i].name().substring(0, MAX_MARKER_LABEL_LENGTH), xOffset + 2*(spacer + standardRadius), yOffset + y).add(); //clip at MAX_MARKER_LABEL_LENGTH
                                    }
                                    y += standardRadius;
                                });
                            }
                            if(areaCount>0||_drawMap_isBubble()){
                                //RADIUS SCALING
                                y += spacer+(smallRadius||5);
                                var MarkerSizeAttributes = {
                                    fill: globals.bubbleColor,
                                    'fill-opacity': 1,
                                    opacity: 1,
                                    stroke: 'black',
                                    'stroke-width': 1
                                };
                                hcr.circle(xOffset + spacer + maxRadius, yOffset + y, smallRadius).attr(MarkerSizeAttributes).add();
                                hcr.text(formatRationalize((calculatedMapData.radiusScale||calculatedMapData.markerDataMax)/10), xOffset + 2*(maxRadius+spacer), yOffset + y).css({fontSize: '12px'}).add();
                                y+= (smallRadius||5) + spacer + maxRadius;
                                hcr.circle(xOffset + spacer + maxRadius, yOffset + y, maxRadius).attr(MarkerSizeAttributes).add();
                                hcr.text(formatRationalize(calculatedMapData.radiusScale||calculatedMapData.markerDataMax), xOffset + 2*(maxRadius+spacer), yOffset + y).css({fontSize: '12px'}).add();
                                hcr.text(calculatedMapData.radiusUnits, xOffset + 2*(maxRadius+spacer), yOffset + y + 2*spacer).css({fontSize: '12px'}).add();
                            }
                        }
                        if(oGraph.mapsets && !_drawMap_isBubble()){
                            //hcr.text(oGraph.mapsets[activeMapTab].units().substr(0,25), xOffset+spacer, yOffset  + lineHeight + textCenterFudge).css({fontSize: '12px'}).add();
                            if(oGraph.mapsets[activeMapTab].options.scale!='discrete' && oGraph.mapsets[activeMapTab].options.logMode == 'on') hcr.text('log scale', xOffset+spacer, yOffset  + 2*lineHeight).css({fontSize: '12px'}).add();
                            if(oGraph.mapsets[activeMapTab].options.scale == 'discrete'){
                                for(i=0;i<oGraph.mapsets[activeMapTab].options.discreteColors.length;i++){
                                    y = spacer + (oGraph.mapsets[activeMapTab].options.discreteColors.length-i)*(spacer+20);
                                    hcr.rect(xOffset + markerLegendWidth + spacer, yOffset + y, lineHeight, lineHeight, 0).attr({
                                        fill: oGraph.mapsets[activeMapTab].options.discreteColors[i].color,
                                        opacity: 1,
                                        stroke: 'black',
                                        'stroke-width': 1
                                    }).add();
                                    hcr.text((i==oGraph.mapsets[activeMapTab].options.discreteColors.length-1?'&gt; ':' ')+oGraph.mapsets[activeMapTab].options.discreteColors[i].cutoff, xOffset + markerLegendWidth + spacer + lineHeight + spacer, yOffset + y +lineHeight/2+textCenterFudge).css({fontSize: '12px'}).add();
                                }
                            } else {
                                //y = spacer;
                                y += 2*lineHeight;
                                hcr.text(formatRationalize(calculatedMapData.regionMax), xOffset + markerLegendWidth + spacer, yOffset + y+lineHeight/2+textCenterFudge).css({fontSize: '12px'}).add();
                                y += lineHeight + spacer;
                                if(calculatedMapData.regionMax>0){
                                    _makeLegend_gradient(xOffset + markerLegendWidth + spacer, yOffset + y, oGraph.mapsets[activeMapTab].options.posColor||MAP_COLORS.POS, MAP_COLORS.MID);
                                    y += 80 + spacer;
                                    if(calculatedMapData.regionMin<0){
                                        hcr.text('0', xOffset + markerLegendWidth + spacer, yOffset + y+lineHeight/2+textCenterFudge).css({fontSize: '12px'}).add();
                                        y += lineHeight + spacer;
                                    }
                                }
                                if(calculatedMapData.regionMin<0){
                                    _makeLegend_gradient(xOffset + markerLegendWidth + spacer, yOffset + y, MAP_COLORS.MID, oGraph.mapsets[activeMapTab].options.negColor||MAP_COLORS.NEG);
                                    y += 80 + spacer;
                                }
                                hcr.text(formatRationalize(calculatedMapData.regionMin), xOffset + markerLegendWidth + spacer, yOffset + y+lineHeight/2+textCenterFudge).css({fontSize: '12px'}).add();
                                y += lineHeight + spacer;
                            }
                        }
                        return gLegend;
                        //subfunction draws a 80H x 20W bar from 2 pixel slices
                        function _makeLegend_gradient(x, y, topColor, bottomColor){
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
                    }
                    makeLegend = _drawMap_makeLegend; //pass a ref to function to allow it it to be called outside of _drawMap()
                }
                function _redraw(){ //does not get called on initial draw of graph
                    mask('redrawing');
                    setTimeout(function(){
                        //destroy
                        destroyChartMap(panelId); //destroy the Highchart, the map and the context Menu if they exist.
                        sizeShowPanels(oGraph);
                        if(oGraph.plots){
                            chart = chartPanel(panelId); //creates and return an instantiated Highchart chart
                            annotations.build();  //build and shows the annotations table
                        }
                        _showChangeSelectors();
                        if(oGraph.mapsets||oGraph.pointsets){
                            oGraph.fetchMap(_drawMap); //ensures we have the map def and shows the map div
                            if(oGraph.plots) $thisPanel.find('map-title').hide(); else $thisPanel.find('map-title').show();
                            $thisPanel.find('select.change-basemap').html(_fillChangeMapSelect());
                        }
                        unmask();
                    }, 10);
                    _makeDirty();
                }
                function _makeDirty(){
                    oGraph.isDirty = true;
                    $thisPanel.find('.graph-save').button("enable");
                }
                function _makeClean(){
                    oGraph.isDirty = false;
                    $thisPanel.find('.graph-save').button("disable");
                }
                function _saveThisGraph(){
                    oGraph.save();
                    $thisPanel.find('button.graph-delete, button.graph-saveas').button("enable");
                    _makeClean();
                }
                function _exportChart(type){
                    switch($thisPanel.find('select.download-selector').val()){
                        case 'map':
                            downloadMap(panelId, type);
                            break;
                        case 'chart':
                            annotations.sync();
                            oGraph.controls.chart._exportChart({type: type, width: 2000});
                            break;
                        case 'cube':
                            oGraph.controls.vizChart._exportChart({type: type, width: 2000});
                            break;
                    }
                }
                function _calcMap(graph, mapIndex){
                    //vars that will be assemble into an output object and returned
                    var mapTitle, mapFreq, mapUnits, mapDates={}, aMapDates=[], markers={}, dateKey;
                    var markerData = {}; //2D object array:  [mdDate][shandle]=value
                    var regionData = {};  //2D object array:  [mdDate][region-code]=value
                    //local vars
                    var mapRegionNames = {}, c, i, j, point, points, mddt, handle, dateHasData, dateHasRegionData, valuesObject, pointHasData, y;
                    var dataMin, dataMax;
                    //var pointMin=null, pointMax=null;
                    var oMapDates = {};
                    var expression, compSymbols, geo, geos, components, data, symbol, oComponentData;
                    if(graph.mapsets){
                        //THE BRAINS:
                        var mapset = graph.mapsets[mapIndex];
                        var formula = mapset.formula(); //make a fresh the formula obj
                        expression = 'return ' + formula.replace(patVariable,'values.$1') + ';';
                        var mapCompute = new Function('values', expression);
                        //1. rearrange series data into single object by date keys
                        compSymbols = [];
                        geos={};
                        components = mapset.components;
                        //this is the christmas tree on which the all component values will be hung by symbol and whose branches will be feed to the evaluator
                        oComponentData = {};  //[mddate][symbol][geo]=value if mapset or [mddate][symbol]=value if time series
                        var sortedGeoList = [];
                        for(i=0;i<components.length;i++ ){
                            symbol = mapset.compSymbol(i);
                            compSymbols.push(symbol); //calculate once and use as lookup below
                            //TODO: apply any series down-shifting here instead of just parroting series data
                            if(components[i].isMapSet()){
                                for(geo in graph.assets[components[i].handle()].data){
                                    if(!geos[geo]) { //geos will be used later to loop over the geographies and square up the final set (i.e. add nulls for missing values)
                                        geos[geo]= graph.assets[components[i].handle()].data[geo].isBunny?'b':'r';
                                        sortedGeoList.push({geo: geo, name: graph.assets[components[i].handle()].geoname});
                                    }
                                    data = graph.assets[components[i].handle()].data[geo].data.split('|');
                                    for(j=0; j<data.length; j++){
                                        point = data[j].split(':');
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
                                data = graph.assets[components[i].handle()].data.split('|');
                                for(j=0; j<data.length; j++){
                                    point = data[j].split(':');
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
                        mapTitle = mapset.name();
                        mapFreq = graph.assets[components[0].handle()].freq; //for now, all components for have same freq, so just check the first component
                        mapUnits = mapset.units();
                        for(dateKey in oComponentData){
                            dataMin = Number.MAX_VALUE;
                            dataMax = Number.MIN_VALUE;
                            dateHasData = false;
                            dateHasRegionData = false;
                            for(geo in geos){
                                valuesObject = {};
                                y = true;
                                pointHasData = false;
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
                                            if(oComponentData[dateKey][compSymbols[i]] && !isNaN(oComponentData[dateKey][compSymbols[i]][geo])){
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
                                        y = rationalize(y); //fix floating point rounding error
                                        if(!regionData[dateKey]) regionData[dateKey] = {};
                                        regionData[dateKey][geo] = y;
                                        dateHasData = true;
                                        if(geos[geo]=='r') {//skip the bunnies
                                            dataMin = Math.min(dataMin||y, y);
                                            dataMax = Math.max(dataMax||y, y);
                                            dateHasRegionData = true;
                                        }
                                    }
                                }
                            }
                            if(dateHasRegionData) mapDates[dateKey] = {regionMin: dataMin, regionMax: dataMax}; //not just bunny data
                            if(!dateHasData) delete regionData[dateKey]; //if all nulls, don't include this datum point

                        }
                    }
                    var fillUnits, radiusUnits;
                    if(graph.pointsets){
                        //4. create the date tree by date for pointsets
                        var latlon, latlons={}, Xdata;
                        var index = 0, pointset, cmp, k;
                        for(i=0;i<graph.pointsets.length;i++){ //assemble the coordinates and colors for multiple mapsets
                            pointset = graph.pointsets[i];
                            if(!pointset.options.color) pointset.options.color = nextColor(graph.pointsets);
                            expression = 'return ' + pointset.formula().replace(patVariable,'values.$1') + ';';
                            var pointsetCompute = new Function('values', expression);
                            //A. rearrange series data into single object by date keys
                            compSymbols = [];
                            components = pointset.components;
                            oComponentData = {};
                            for(j=0;j<components.length;j++ ){
                                symbol = pointset.compSymbol(j);
                                compSymbols.push(symbol); //calculate once and use as lookup below
                                var compHandle = components[j].handle();
                                //TODO: apply any series down-shifting here instead of just parroting series data
                                if(compHandle[0] =='X'){
                                    Xdata = graph.assets[compHandle].data; //shortcut
                                    for(latlon in Xdata){
                                        //"markers" object and "latlons" array is common for all pointsets in graph
                                        if(!latlons[latlon]){
                                            latlons[latlon] = true;  //latlons will be used later to loop over the points and square up the final set (i.e. add nulls for missing values)
                                        }
                                        if(!Xdata[latlon].name){
                                            Xdata[latlon].name = (Xdata[latlon].seriesname)?common.placeName(graph.assets[compHandle].setname, Xdata[latlon].seriesname):latlon;
                                        }
                                        if(markers[latlon]){
                                            markers[latlon].name += '<br>' + Xdata[latlon].name;
                                        } else {
                                            markers[latlon] = {latLng: latlon.split(','), name: Xdata[latlon].name, style: {fill: pointset.options.color}};
                                            markers[latlon].latLng[0] = parseFloat(markers[latlon].latLng[0]); //TODO:  test if this is really necessary
                                            markers[latlon].latLng[1] = parseFloat(markers[latlon].latLng[1]);
                                        }
                                        data = Xdata[latlon].data.split('|');
                                        for(k=0; k<data.length; k++){
                                            point = data[k].split(':');
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
                                    data = graph.assets[compHandle].data.split('|');
                                    for(k=0; k<data.length; k++){
                                        point = data[k].split(':');
                                        if(!oComponentData[point[0].toString()]){
                                            oComponentData[point[0].toString()] = {};
                                        }
                                        oComponentData[point[0].toString()][symbol] = point[1];
                                    }
                                }
                            }
                            //B. calculate value for each date key ( = grouped points)
                            var required = !pointset.options.componentData || pointset.options.componentData=='required';  //default
                            var missingAsZero =  pointset.options.componentData=='missingAsZero';
                            var nullsMissingAsZero =  pointset.options.componentData=='nullsMissingAsZero';
                            var breakNever = !pointset.options.breaks || pointset.options.breaks=='never'; //default
                            var breakNulls = pointset.options.breaks=='nulls';
                            var breakMissing = pointset.options.breaks=='missing';
                            mapTitle = mapTitle + pointset.name();
                            mapFreq = graph.assets[compHandle].freq; //for now, all components must have same freq, so just check the first component
                            if(pointset.options.attribute=='fill'){
                                fillUnits = pointset.units();
                            }else{
                                radiusUnits = pointset.units();  //default to radius
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
                                                if(oComponentData[dateKey][compSymbols[j]] && !isNaN(oComponentData[dateKey][compSymbols[j]][latlon])){
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
                                            y = rationalize(y);  //fix floating point math rounding errors
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
                                    delete markerData[dateKey];
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
                    var thisMapsCalculatedMapData = {
                        title: mapTitle,  //string
                        freq: mapFreq, //string: single freq for maps
                        mapUnits: mapUnits,  //string
                        markers: markers, //{pointid: {name:, style: {fill:}}  radius attribute set in CalcAttibute if
                        markerData: markerData,  //
                        dates: aMapDates,  // [{a: mdDate (string), dt: intval for js UTC date,  regionMin: (optional float), regionMax: (optional float), markerMin; (optional float), markerMax: (optional float)}]
                        regionData: regionData,
                        fillUnits: fillUnits,
                        radiusUnits: radiusUnits
                    };
                    if(graph.mapsets) graph.mapsets[mapIndex].calculatedMapData = thisMapsCalculatedMapData; //keep a reference on the mapPlot to avoid recalculating
                    return thisMapsCalculatedMapData;
                }
                function _setStartEndDateIndexes(){
                    //determine startDateIndex and endDateIndex
                    if(oGraph.intervals){
                        calculatedMapData.startDateIndex = calculatedMapData.dates.length-parseInt(oGraph.intervals);
                        calculatedMapData.endDateIndex = calculatedMapData.dates.length-1;
                    } else {
                        calculatedMapData.startDateIndex = calculatedMapData.dates.length-1; //set to max
                        calculatedMapData.endDateIndex=0; //set end to min and advance in loop below
                        for(var i=0;i<calculatedMapData.dates.length;i++){
                            if( (!oGraph.start || parseInt(oGraph.start)<=calculatedMapData.dates[i].dt.getTime())
                                &&  (!oGraph.end || parseInt(oGraph.end)>=calculatedMapData.dates[i].dt.getTime()) ){
                                if(calculatedMapData.startDateIndex>i) calculatedMapData.startDateIndex = i;
                                if(calculatedMapData.endDateIndex<i) calculatedMapData.endDateIndex = i;
                            }
                        }
                    }
                }
                function _calcAttributes(graph){
                    var i, y, firstDateKey, dateKey, geo, geos = {}, min, max, calcData = graph.calculatedMapData;
                    //if one of the change modes, must recalculate the min and maxes
                    var mapMode = oGraph.mapsets && oGraph.mapsets[activeMapTab].mapMode();
                    var changeCalc = false;
                    switch(mapMode){
                        case 'abs-change':
                        case 'change-bubbles':
                            changeCalc = function(a,b){ return b-a;};
                            break;
                        case 'percent-change':
                            changeCalc = function(a,b){ return (b-a)/a;};
                            break;
                        default:
                    }

                    //1.  find start and end indexes
                    // also calculate regionMin and regionMax within the graph dates, if graph has mapsets
                    calcData.regionMin = Number.MAX_VALUE;
                    calcData.regionMax = Number.MIN_VALUE;
                    if(graph.intervals){
                        calcData.startDateIndex = Math.max(0, calcData.dates.length-parseInt(graph.intervals));
                        calcData.endDateIndex = calcData.dates.length-1;
                        for(i=calcData.startDateIndex;i<calcData.endDateIndex+1;i++){
                            if(graph.mapsets){
                                if(!changeCalc){
                                    calcData.regionMin = Math.min(calcData.dates[i].regionMin, calcData.regionMin);
                                    calcData.regionMax = Math.max(calcData.regionMax, calcData.dates[i].regionMax);
                                } else {
                                    if(i!=calcData.startDateIndex ){
                                        for(geo in calcData.regionData[calcData.dates[i].s]){
                                            var startValue = calcData.regionData[calcData.dates[calcData.startDateIndex].s][geo];
                                            var endValue = calcData.regionData[calcData.dates[i].s][geo];
                                            var changeValue = changeCalc(startValue, endValue);
                                            if(!isNaN(changeValue)){
                                                calcData.regionMin = Math.min(changeValue, calcData.regionMin);
                                                calcData.regionMax = Math.max(calcData.regionMax, changeValue);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        calcData.startDateIndex = calcData.dates.length-1; //set to max
                        calcData.endDateIndex=0; //set end to min and advance in loop below
                        for(i=0;i<calcData.dates.length;i++){
                            if( (!graph.start || parseInt(graph.start)<=calcData.dates[i].dt.getTime())
                                &&  (!graph.end || parseInt(graph.end)>=calcData.dates[i].dt.getTime()) ){
                                if(calcData.startDateIndex>i) calcData.startDateIndex = i;
                                if(calcData.endDateIndex<i) calcData.endDateIndex = i;
                                if(graph.mapsets){
                                    if(!changeCalc){
                                        calcData.regionMin = Math.min(calcData.dates[i].regionMin, calcData.regionMin);
                                        calcData.regionMax = Math.max(calcData.regionMax, calcData.dates[i].regionMax);
                                    } else {
                                        if(i!=calcData.startDateIndex ){
                                            for(geo in calcData.regionData[calcData.dates[i].s]){
                                                var startValue = calcData.regionData[calcData.dates[calcData.startDateIndex].s][geo];
                                                var endValue = calcData.regionData[calcData.dates[i].s][geo];
                                                var changeValue = changeCalc(startValue, endValue);
                                                if(!isNaN(changeValue)){
                                                    calcData.regionMin = Math.min(changeValue, calcData.regionMin);
                                                    calcData.regionMax = Math.max(calcData.regionMax, changeValue);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    var rgb, continuous, spans, mapOptions, startVal;
                    if(graph.mapsets){
                        var regionFillColors = {};
                        mapOptions = graph.mapsets[0].options;
                        continuous = !mapOptions.scale || mapOptions.scale=='continuous';
                        min = calcData.regionMin;
                        max = calcData.regionMax;
                        //2. based on mapOptions, set regionData attributes = regionFillColors
                        //2A  continuous attributes use the min and max just calculated (also used in legend)
                        spans = min<0 && max>0;
                        calcData.regionColors = {};
                        if(continuous){  //this will be used in the loop
                            rgb = {
                                pos: _calcAttributes_makeRGB(mapOptions.posColor||MAP_COLORS.POS),
                                neg: _calcAttributes_makeRGB(mapOptions.negColor||MAP_COLORS.NEG),
                                mid: _calcAttributes_makeRGB(MAP_COLORS.MID)
                            };
                            var posRGB = new RGBColour(rgb.pos.r, rgb.pos.b, rgb.pos.g);
                            var posHSV = posRGB.getHSV();
                            var posMid = new HSVColour(posHSV.h, (spans?10:20), (spans?90:100));
                            var posMidRGB = posMid.getIntegerRGB();
                            rgb.posMid = {r: posMidRGB.r, g:posMidRGB.g, b: posMidRGB.b};
                            var negRGB = new RGBColour(rgb.neg.r, rgb.neg.b, rgb.neg.g);
                            var negHSV = negRGB.getHSV();
                            var negMid = new HSVColour(negHSV.h, (spans?10:20), (spans?90:100));
                            var negMidRGB = negMid.getIntegerRGB();
                            rgb.negMid = {r: negMidRGB.r, g:negMidRGB.g, b: negMidRGB.b};
                        }
                        var j, startDateKey = calcData.dates[calcData.startDateIndex].s;
                        for(i=calcData.startDateIndex;i<=calcData.endDateIndex;i++){
                            dateKey = calcData.dates[i].s;
                            calcData.regionColors[dateKey] = {};
                            if(calcData.regionData[dateKey]){
                                for(geo in calcData.regionData[dateKey]){
                                    geos[geo] = true; //used to fill in holes (square up) below
                                    y = calcData.regionData[dateKey][geo];
                                    if(changeCalc){
                                        if(calcData.regionData[startDateKey] && calcData.regionData[startDateKey][geo]) {
                                            startVal = calcData.regionData[startDateKey][geo];
                                            y = changeCalc(startVal, y);
                                        } else {
                                            y = null;
                                        }
                                    }
                                    if(!isNaN(y)&&y!==null){
                                        y=parseFloat(y);
                                        if(continuous){ //CONTINUOUS = relative to min and max data
                                            if(y==0) {
                                                calcData.regionColors[dateKey][geo] = MAP_COLORS.MID;
                                            } else {
                                                calcData.regionColors[dateKey][geo] = _calcAttributes_colorInRange(y, y<0?min:(spans?0:min), y>0?max:(spans?0:max), y<0?rgb.neg:rgb.posMid, y<0?rgb.negMid:rgb.pos, mapOptions.logMode=='on' && !spans && min!=0 && max!=0);
                                            }
                                        } else {//DISCRETE = cutoffs are hard coded (not relative to min or max data)
                                            for(j=0;j<mapOptions.discreteColors.length;j++){
                                                if((j!=mapOptions.discreteColors.length-1 && y<=parseFloat(mapOptions.discreteColors[j].cutoff)) || j==mapOptions.discreteColors.length-1){
                                                    calcData.regionColors[dateKey][geo] = mapOptions.discreteColors[j].color;
                                                    break;
                                                }
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
                        for(dateKey in calcData.regionColors){
                            for(geo in geos){
                                if(typeof calcData.regionColors[dateKey][geo] == 'undefined') {
                                    calcData.regionColors[dateKey][geo] = '#ffffff';
                                }
                            }
                        }
                    }
                    //3. based on mapconfig, set markerData attributes
                    if(graph.pointsets){
                        //3A. calc min and max data for current start/end crop of graph
                        mapOptions = graph.mapconfig;
                        continuous = !mapOptions.scale || mapOptions.scale=='continuous';
                        if(continuous){  //this will be used in the loop
                        }
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
                                rgb = {
                                    pos: _calcAttributes_makeRGB(mapOptions.posColor||MAP_COLORS.POS),
                                    neg: _calcAttributes_makeRGB(mapOptions.negColor||MAP_COLORS.NEG),
                                    posMid: {},
                                    negMid: {},
                                    mid: _calcAttributes_makeRGB(MAP_COLORS.MID)
                                };
                                var posRGB = new RGBColour(rgb.pos.r, rgb.pos.b, rgb.pos.g);
                                var posHSV = posRGB.getHSV();
                                var posMid = new HSVColour(posHSV.h, (spans?10:20), (spans?90:100));  //if spans, low end will be 10% bright = same as mid = #e5e5e5
                                var posMidRGB = posMid.getIntegerRGB();
                                rgb.posMid = {r: posMidRGB.r, g:posMidRGB.g, b: posMidRGB.b};
                                var negRGB = new RGBColour(rgb.neg.r, rgb.neg.b, rgb.neg.g);
                                var negHSV = negRGB.getHSV();
                                var negMid = new HSVColour(negHSV.h, (spans?10:20), (spans?90:100));
                                var negMidRGB = negMid.getIntegerRGB();
                                rgb.negMid = {r: negMidRGB.r, g:negMidRGB.g, b: negMidRGB.b};
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
                                    markerAttr.r[dateKey][markerId] = (graph.mapconfig.maxRadius || DEFAULT_RADIUS_SCALE) *  Math.sqrt(rData)/Math.sqrt(markerRadiusAbs);
                                }
                                if(hasFillShading){
                                    fillData = calcData.markerData[dateKey][markerId].f || null;
                                    if(isNaN(fillData) || fillData===null){
                                        markerAttr.fill[dateKey][markerId] = '#ffffff';
                                    } else {
                                        if(continuous){
                                            if(spans){
                                                markerAttr.fill[dateKey][markerId] = _calcAttributes_colorInRange(fillData, fillData<0?markerFillMin:(spans?0:markerFillMin), fillData>0?markerFillMax:(spans?0:markerFillMax), fillData<0?rgb.neg:rgb.posMid, fillData<0?rgb.negMid:rgb.pos);
                                            } else {
                                                markerAttr.fill[dateKey][markerId] = _calcAttributes_colorInRange(fillData, fillData<0?markerFillMin:(spans?0:markerFillMin), fillData>0?markerFillMax:(spans?0:markerFillMax), fillData<0?rgb.neg:rgb.mid, fillData<0?rgb.mid :rgb.pos);
                                            }
                                        } else {//DISCRETE = cutoffs are hard coded (not relative to min or max data)
                                            for(j=0;j<graph.mapconfig.discreteColors.length;j++){
                                                if((j==0 && parseFloat(graph.mapconfig.discreteColors[j].cutoff)<=fillData) || (j!=0 && parseFloat(graph.mapconfig.discreteColors[j].cutoff)<fillData)){
                                                    markerAttr.fill[dateKey][markerId] = graph.mapconfig.discreteColors[j].color;
                                                } else break;
                                            }
                                        }
                                    }
                                } else {
                                    //markerAttr.fill[dateKey][markerId] = '#0000ff';
                                }
                            }
                        }
                        calcData.markerAttr = markerAttr;
                    }
                    //DONE!!!
                    function _calcAttributes_makeRGB(color){
                        if(color.substr(0,1)=='#')color=color.substr(1);
                        var r, g, b;
                        r = parseInt(color.substr(0,2), 16);
                        g = parseInt(color.substr(2,2), 16);
                        b = parseInt(color.substr(4,2), 16);
                        return {r:r, g:g, b:b};
                    }
                    function _calcAttributes_colorInRange(y, y1, y2, rgb1, rgb2, logScaling){  //y values must be all positive or all negative
                        var r, g, b, yl, yl1, yl2, percent, octet = MD.common.octet;
                        if(logScaling){  //log = compressive
                            yl = Math.log(Math.abs(y));
                            yl1 = Math.log(Math.min(Math.abs(y1),Math.abs(y2)));
                            yl2 = Math.log(Math.max(Math.abs(y1),Math.abs(y2)));
                            percent = (yl-yl1)/ (yl2-yl1);
                        } else {
                            percent = (y-y1)/ (y2-y1);
                        }
                        r = octet(Math.round(percent * (rgb2.r-rgb1.r) + rgb1.r));
                        g = octet(Math.round(percent * (rgb2.g-rgb1.g) + rgb1.g));
                        b = octet(Math.round(percent * (rgb2.b-rgb1.b) + rgb1.b));
                        return '#' + r + g + b;
                    }
                }
                function _calcMinMax(mode){
                    //_caclMap should already have been run; mode must either be 'min' or 'max'
                    var calcData = oGraph.calculatedMapData, extremes = {}, value, dateKey, geo, dateInt;
                    calcData['regionColors'] = {};
                    calcData['regionMin'] = Number.MAX_VALUE;
                    calcData['regionMax'] = Number.MIN_VALUE;
                    for(dateKey in calcData.regionData){
                        dateInt = dateFromMdDate(dateKey).getTime();
                        calcData['regionMin'] = Math.min(calcData['regionMin'], dateInt);
                        calcData['regionMax'] = Math.max(calcData['regionMax'], dateInt);
                        for(geo in calcData.regionData[dateKey]){
                            if(calcData.regionData[dateKey]){
                                value = calcData.regionData[dateKey][geo];
                                if(value!==null){
                                    if(typeof extremes[geo] == 'undefined' || (mode=='min'?value<extremes[geo]:value>extremes[geo])){
                                        extremes[geo] = value;
                                        calcData['regionColors'][geo] = dateInt;
                                    }
                                }
                            }
                        }
                    }
                    calcData['marker'+mode] = {};
                    calcData['markerMin'] = Number.MAX_VALUE;
                    calcData['markerMax'] = Number.MIN_VALUE;
                    if(!calcData.markerAttr) calcData.markerAttr = {};
                    if(!calcData.markerAttr.fill) calcData.markerAttr.fill = {};
                    for(dateKey in calcData.markerData){
                        dateInt = dateFromMdDate(dateKey).getTime();
                        calcData['markerMin'] = Math.min(calcData['markerMin'], dateInt);
                        calcData['markerMax'] = Math.max(calcData['markerMax'], dateInt);
                        for(geo in calcData.markerData[dateKey]){
                            if(calcData.markerData[dateKey]){
                                value = calcData.markerData[dateKey][geo];
                                if(value!==null){
                                    if(typeof extremes[geo] == 'undefined' || (mode=='min'?value<extremes[geo]:value>extremes[geo])){
                                        extremes[geo] = value;
                                        calcData.markerAttr.fill[geo] = dateInt;
                                    }
                                }
                            }
                        }
                    }
                }
                function _getMapDataByContainingDate(mapData,mdDate){ //tries exact date match and then step back if weekly->monthly->annual or if monthly->annual
                    //this allows mixed-freq mapsets and marker set to be display controlled via the slider
                    while(mdDate.length>=4){
                        if(mapData[mdDate]) return mapData[mdDate];
                        mdDate = mdDate.substr(0,mdDate.length-2);
                    }
                    return false;
                }
            }
        },
        visiblePanelId: function visiblePanelId(){  //uniform way of getting ID of active panel for user events
            var visPan = $('div.graph-panel:visible');
            if(visPan.length==1){
                return visPan.get(0).id;
            } else {
                return null;
            }
        },
        formatDateByPeriod: function formatDateByPeriod(val, period, months) { //helper function for the data tables
            if(!months) months = globals.translations.English.months;
            if(isNaN(val)==false && val !== null) {
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
                return '-';
            }
        },
        fillScalingCount: function fillScalingCount(pointsets){
            var fill = 0;
            if(pointsets instanceof Array) {   //returns if not an array
                fill = pointsets.length - areaScalingCount(pointsets);
            }
            return fill;
        },
        areaScalingCount: function areaScalingCount(pointsets){
            var area = 0;
            if(pointsets instanceof Array) {  //returns if not an array
                $.each(pointsets, function(){
                    if(this.options.attribute!='fill') area++; // defaults to r if not fill
                });
            }
            return area;
        }
    };
    //define shortcuts
    var chartPanel = grapher.chartPanel,
        intervalStartDt = grapher.intervalStartDt,
        setCropSliderSpinner = grapher.setCropSliderSpinner,
        closestDate = grapher.closestDate,
        createMyGraph = grapher.createMyGraph,
        makeChartOptionsObject = grapher.makeChartOptionsObject,
        buildGraphPanel = grapher.buildGraphPanel,
        visiblePanelId = grapher.visiblePanelId,
        formatDateByPeriod = grapher.formatDateByPeriod,
        fillScalingCount = grapher.fillScalingCount,
        areaScalingCount = grapher.areaScalingCount;
    //STATELESS HELPER FUNCTIONS ONLY USED BY GRAPH OBJECT
    var graphTitle = {  //This object performs all of the task associated with editing and setting the chart title
        template: '<div id="dwrap2">'
        + '<div id="titleEditor" style="width: 560px">'
        + '<input type="text" width="300px" name="title" /> '
        + '<button id="graph-title-change-ok">OK</button> '
        + '<button id="graph-title-change-cancel">cancel</button>'
        + '</div>'
        + '</div>',
        show: function(oTitle, callback){
            var self = this;
            $.fancybox(
                this.template,
                {
                    'width'             :  '100%',
                    'height'            : '100%',
                    'autoScale'         : true,
                    'showCloseButton'   : false,
                    'scrolling'         : 'no',
                    'transitionIn'	: 'none',
                    'transitionOut'	: 'none',
                    left              : '55px',
                    top               : '55px'
                }
            );
            $("#fancybox-wrap").stop().css({
                'top': '70px'
            });
            $('#graph-title-change-ok').click(self.changeOk);
            $('#graph-title-change-cancel').click(self.changeCancel);
            var thisPanelID = $(oTitle).closest('div.graph-panel').get(0).id;
            $('#titleEditor input')
                .keyup(function(event){
                    if(event.keyCode==13) self.changeOk()
                })
                .attr('data',thisPanelID)
                .val(panelGraphs[thisPanelID].title)
                .css("width","450px")
                .focus();
            this.callback = callback;
        },
        callBack: false,
        changeOk: function(){
            var thisPanelID =  $('#titleEditor input').attr('data');
            var newTitle = $('#titleEditor input').val().trim();
            var graph = panelGraphs[thisPanelID];
            if(newTitle!=graph.title){
                graph.title = newTitle || 'untitled';
                if(graph.plots){
                    if(graph.title.length==0){
                        graph.controls.chart.setTitle({text: 'untitled - click to edit', style: {color: 'grey', font: 'italic'}});
                    } else {
                        graph.controls.chart.setTitle({text: graph.title, style: {color: 'black', font: 'normal'}});
                    }
                    $('#' + thisPanelID + ' .highcharts-title').click(function(){graphTitle.show(this)});
                }
                var tabLabel = newTitle || "Graph " +  thisPanelID.substr(thisPanelID.indexOf('-')+1);
                $('#graph-tabs a[href=\'#'+ thisPanelID +'\']').attr('title',tabLabel).html(tabLabel);
                $('#' + thisPanelID + ' h3.mashabledata_map-title').html(graph.title);
                if(graph.title.length==0){
                    if(this.callback) this.callback();
                }
                graph.controls.annotations.makeDirty();
            }
            graphTitle.changeCancel();
        },
        changeCancel: function(){
            $.fancybox.close();
            this.callBack = false;
        }
    };
    return grapher;  //return the graph functions object which will be accessible as MashableData.graph

    //stateless graph object functions
    function calcGraphMinMaxZoomPeriod(oGraph){
        oGraph.smallestPeriod = "A";
        oGraph.largestPeriod = "N";
        var min, max, jsdt, handle, key;
        oGraph.eachComponent(function(){
            if(!this.firstdt && (this.handle.charAt(0)=='M' || this.handle.charAt(0)=='X')){
                for(handle in oGraph.assets[this.handle()].data){
                    jsdt = oGraph.assets[this.handle()].data[handle].firstdt;
                    oGraph.assets[this.handle()].firstdt = Math.min(oGraph.assets[this.handle()].firstdt, jsdt)||jsdt;
                    jsdt = oGraph.assets[this.handle()].data[handle].lastdt;
                    oGraph.assets[this.handle()].lastdt = Math.max(oGraph.assets[this.handle()].lastdt, jsdt)||jsdt;
                }
            }
            jsdt = this.firstdt;
            min = Math.min(jsdt, min)  || jsdt || min; //in case first date is missing
            jsdt = this.lastdt;
            max = Math.max(jsdt, max)  || jsdt || min; //in case lasst date is missing
        });
        oGraph.eachPlot(function(){
            var thisFreq = this.freq();
            if(period.value[oGraph.smallestPeriod]>period.value[thisFreq]) oGraph.smallestPeriod = thisFreq;
            if(period.value[oGraph.largestPeriod]<period.value[thisFreq]) oGraph.largestPeriod = thisFreq;
        });
        oGraph.firstdt = min;
        oGraph.lastdt = max;
        oGraph.minZoom = oGraph.start || oGraph.firstdt;
        oGraph.maxZoom = oGraph.end || oGraph.lastdt;
    }
    function nextColor(aryOptionedObjects){ //either graph.plots or graph.pointsets
        var usedColors = [];
        $.each(aryOptionedObjects, function(){
            if(this.options && this.options.color) usedColors.push(this.options.color);
        });
        var allColors = hcColors.concat(primeColors);
        for(var i=0;i<allColors.length;i++){
            if(usedColors.indexOf(allColors[i])==-1) return allColors[i];
        }
        return allColors[aryOptionedObjects.length % allColors.length];
    }
    function formatRationalize(value){
        if(value == 0) return "0";
        var order =  Math.floor(Math.log(Math.abs(value))/Math.LN10);
        var y  = Math.round(value / Math.pow(10,order-2)) * Math.pow(10,order-2);
        return common.numberFormat(y, (order>1?0:2-order))
    }
    function vizualizeCube(graph, activeMapTab, geoKey, mapDate, action){
        console.time('vizualizeCube');
        if(typeof action == 'undefined') action = 'new';
        var j, k, cubeid = graph.cubeid, mapPlot = graph.mapsets[activeMapTab];
        if(!graph.assets.cube) graph.assets.cube = {data: {}, id:cubeid};
        var cube = graph.assets.cube;
        if(!cube.data['G'+geoKey]){
            var $cubViz = graph.controls.$thisPanel.find('div.mashabledata_cube-viz');
            $cubViz.mask('loading...');
            callApi(
                {command:"GetCubeSeries", ghash: graph.ghash||'', cubeid: cubeid, geokey: geoKey, freq: mapPlot.freq(), modal:'none'},  //geoKey can be a "lat,lon" or the jVectorMaps code (requiring a lookup) or a geoid
                function(jsoData, textStatus, jqXHR){
                    cube.data['G'+geoKey] = jsoData.series;
                    cube.theme = jsoData.theme;
                    cube.name = jsoData.name;
                    cube.units = jsoData.units;
                    cube.barAxis = jsoData.baraxis;
                    cube.barNames = jsoData.barnames?JSON.parse(jsoData.barnames.replace(/u0022/g,'"')):false;
                    cube.stackAxis = jsoData.stackaxis;
                    cube.stackNames = jsoData.stacknames?JSON.parse(jsoData.stacknames.replace(/u0022/g,'"')):false;
                    cube.sideAxis = jsoData.sideaxis;
                    cube.sideNames = jsoData.sidenames?JSON.parse(jsoData.sidenames.replace(/u0022/g,'"')):false;
                    $cubViz.unmask();
                    makeCubeChart();
                }
            );
        } else {
            makeCubeChart();
        }
        function makeCubeChart(){
            //1. detect order no longer possible (it complicated!)
            //2. find geoName from assets geoKey
            var geoName = null;
            if(isNaN(geoKey)){
                graph.eachComponent(function(){
                    if(!geoName){ //TODO: pointsets names
                        if(this.handle[0]=='M' && graph.assets[this.handle()].data[geoKey]) geoName = graph.assets[this.handle()].data[geoKey].geoname;
                    }
                });
            } else {
                geoName = graph.map;
            }
            //if not already organized...
            //organize into nested arrays of facets (= unique combo of dims) which will be used to organize the series and to create the chart object
            var cubeData = cube.data['G'+geoKey], i;
            cube.hasData = false; //var defined in drawmap to being accessable only from this closure
            for(i=0;i<cubeData.length;i++){
                if(cubeData[i].data){
                    cube.hasData = true;
                    break;
                }
            }
            //3. make base chart options object
            var title = ((graph.mapconfig&&graph.mapconfig.cube&&graph.mapconfig.cube.name)||cube.name||cube.theme)+'<br>'+(cube.hasData?geoName||'':'');
            var vizChart = {
                chart: {
                    type: 'bar',
                    spacingRight: 50,
                    renderTo: graph.controls.$thisPanel.find('.mashabledata_cube-viz')[0],
                    cubeId: graph.cubeid
                },
                title: {
                    text: title,
                    style: {fontSize: '12px'}
                    //text: (graph.assets.cube.theme||'')  + (graph.assets.cube.name?' by '+graph.assets.cube.name:'') + ' for ' + geoName
                },
                subtitle: {
                    text: (jvm.Map.maps[graph.mapFile].paths[geoKey]?jvm.Map.maps[graph.mapFile].paths[geoKey].name:graph.literals.cubeMsg),
                    style: {fontSize: '10px'} //,
                    //y: (geoName?50:30)
                },
                plotOptions: {
                    bar: {
                        dataLabels: {
                            enabled: false,
                            align: 'left',
                            formatter: function(){
                                return cube.hasData?(this.point.rawY===null?"no data":this.y):'';
                            }
                        },
                        borderWidth: 0,
                        animation: false,
                        stacking: 'normal'
                    }
                },
                xAxis: {
                    categories: [],
                    title: {
                        text: null
                    },
                    lineWidth: 1,
                    minorGridLineWidth: 0,
                    labels: {
                        enabled: true
                    },
                    minorTickLength: 0,
                    tickLength: 0
                },
                yAxis: {
                    title: {
                        text: (graph.mapconfig&&graph.mapconfig.cube&&graph.mapconfig.cube.units)||cube.units||''
                    },
                    labels: {
                        enabled: false
                    },
                    lineWidth: 0,
                    minorGridLineWidth: 0,
                    lineColor: 'transparent',
                    gridLineColor: 'transparent',
                    gridLineWidth: 0
                },
                credits: {
                    href: "http://www.mashabledata.com",
                    text: graph.literals.src
                },
                exporting: {
                    enabled: false,
                    type: "image/png",
                    url: "https://www.mashabledata.com/workbench/export/index.php"
                },
                legend: {
                    floating: false,
                    borderWidth: 0,
                    y: -5
                },
                series: [],
                tooltip: {
                    useHTML: true,
                    formatter: function(){
                        return '<b>'+ cube.theme + '</b><br/>' + this.point.name +':<br/>'
                            + common.numberFormat(Math.abs(this.point.y), 0) + ' ' + cube.units;
                    }
                }
            };
            //4. loop through the cubeData (note:  setdata must be left outer joined to cubecompents to produce NULL placeholders when missing for certain geographies)
            //TODO: bar-side with no stack
            var point, y, barOrder, stackOrder, sideOrder, data = [], lastBar = 0;
            var barAxis = cube.barAxis, stackAxis = cube.stackAxis, sideAxis = cube.sideAxis, cubeConfig = graph.mapconfig.cube;
            for(i=0;i<cubeData.length;i++){
                barOrder =  parseInt(cubeData[i].barorder);
                sideOrder = parseInt(cubeData[i].sideorder);
                stackOrder = parseInt(cubeData[i].stackorder);
                y = seriesValue(cubeData[i].data, mapDate);
                point = {
                    y:  ((cube.sideAxis && sideOrder==0)?-1:1) * y,
                    rawY: y,
                    name: cubeData[i].name
                };
                data.push(point);
                if(barOrder==cube.barNames.length-1){
                    var serie = {data: data, color: cube.stackNames?globals.hcColors[stackOrder]:globals.hcColors[sideOrder]};
                    if(cube.stackNames) serie.name = (cubeConfig&&cubeConfig.dims[stackAxis] && cubeConfig.dims[stackAxis][stackOrder]) || cube.stackNames[stackOrder];
                    if(sideOrder == 1) serie.linkedTo = ':previous';
                    if(sideOrder == 1 || !cube.stackNames) serie.showInLegend = false;
                    vizChart.series.push(serie);
                    data = [];
                }
            }
            //add the categories
            for(i=0;i<cube.barNames.length;i++){
                vizChart.xAxis.categories.push((cubeConfig&&cubeConfig.dims[barAxis]&&cubeConfig.dims[barAxis][i]) || cube.barNames[i]);
            }
            //vizChart.legend = {enabled: false};
            if(!cube.stackNames){
                vizChart.plotOptions.bar.dataLabels.enabled = true;
            }
            if(cube.sideAxis) vizChart.xAxis.lineWidth = 0;
            switch(action){
                case 'add':
                    vizChart.series[0].showInLegend = true;
                    graph.controls.vizChart.addSeries(vizChart.series[0]);
                    break;
                case 'remove':
                    graph.controls.vizChart.get(geoKey).remove(false);   //avoids _redraw for each series removed, but requires a redarw call in main after all have been removed
                    break;
                case 'summation':
                    vizChart.series[0].pointWidth=1;
                    vizChart.series[0].pointPadding=0;
                    vizChart.plotOptions.bar.groupPadding=0;
                default:  //'new' with fst update if same CubeId
                    if(graph.controls.vizChart && graph.controls.vizChart.options.chart.cubeId!=graph.cubeid){
                        graph.controls.vizChart.destroy();
                    }
                    if(graph.controls.vizChart) {
                        graph.controls.vizChart.setTitle(title, geoName, false);
                        while(graph.controls.vizChart.series.length) graph.controls.vizChart.series[0].remove(false);
                        for(i=0;i<vizChart.series.length;i++){
                            graph.controls.vizChart.addSeries(vizChart.series[i], false)
                        }
                        graph.controls.vizChart.redraw();
                    } else {
                        graph.controls.vizChart = new Highcharts.Chart(vizChart);
                    }
            }
        }
        console.timeEnd('vizualizeCube');
    }
    function getVizChartGeos(selectedRegions, oGraph, mapPlot, includeBunnies){
        //gets order list of geoInfo objects should be in vizChart
        var vizChartGeos = [], geoInfo, containingGeoInfo;
        if(includeBunnies){
            if(mapsList[oGraph.map].bunny) {
                geoInfo = _getGeoInfo(mapsList[oGraph.map].bunny, oGraph, mapPlot);
                if(geoInfo){
                    geoInfo.bunny = true;
                    //containingIds.push(geoInfo.geoid);
                    vizChartGeos.push(geoInfo);
                    //data[geoInfo.code] = geoInfo;
                }
            }
        }
        for(var i=0;i<selectedRegions.length;i++){
            var regionCode = selectedRegions[i];
            if(geoInfo = _getGeoInfo(regionCode, oGraph, mapPlot)){
                if(includeBunnies && geoInfo.c_geoid){
                    containingGeoInfo = _getGeoInfo(geoInfo.c_geoid, oGraph, mapPlot);
                    containingGeoInfo.regionalBunny = true;
                    if(containingGeoInfo) vizChartGeos.push(containingGeoInfo);
                }
                vizChartGeos.push(geoInfo);
            }
        }
        return vizChartGeos;
        function _getGeoInfo(geoid, oGraph, mapPlot){
            var info, mapCode;
            if(isNaN(geoid)){ //jvm code
                info = {code: geoid};
                mapPlot.eachComponent(function(){
                    if(!info.geoname && this.isMapSet()){
                        var asset = oGraph.assets[this.handle()];
                        if(asset.data[info.code]){
                            info.geoid = asset.data[info.code].geoid;
                            info.geoname = asset.data[info.code].geoname;
                            info.c_geoid = asset.data[info.code].cg;
                        }
                    }
                });
            } else {
                info = {geoid: geoid};
                mapPlot.eachComponent(function(){
                    if(!info.geoname && this.isMapSet()){
                        var asset = oGraph.assets[this.handle()];
                        for(mapCode in asset.data){
                            if(asset.data[mapCode].geoid==geoid){
                                info.geoname = asset.data[mapCode].geoname;
                                info.code =  mapCode;
                                info.c_geoid = asset.data[info.code].cg;
                                break;
                            }
                        }
                    }
                });
            }
            return info.geoname?info : false;
        }
    }
    function seriesValue(mdData, mdDate){
        if(!mdData) return null;
        var point, data = Array.isArray(mdData)?mdData:mdData.split('|');
        for(var i=0;i<data.length;i++){
            point = data[i].split(':');
            if(point[0]==mdDate) {
                if(point[1]=='null' || point[1]===null) return null; else return parseFloat(point[1]);
            }
        }
        return null;
    }
    function sizeShowPanels(graph){ //shows/hides panels and ressizes them based on graph
        if(!graph.controls) return;  // must be an instantiated graph
        var hasChart = (graph.plots!=null),
            hasMapViz = graph.hasMapViz(),
            hasMap = graph.mapsets||graph.pointsets != null,
            sizes = graph.mapconfig.sizes,
            $thisPanel = graph.controls.$thisPanel,
            $container = $thisPanel.find('.mashabledata_chart-map'),
            $chart = $thisPanel.find('.mashabledata_chart'),
            $anno = $thisPanel.find('div.annotations'),
            $viz = $thisPanel.find('.mashabledata_cube-viz'),
            $mapTitle = $thisPanel.find('h3.mashabledata_map-title'),  //the replace title is no main HighChart to show the title
            $mapAndVizContainer = $thisPanel.find('.mashabledata_map'), //contains both _jvmap and _cube-viz
            $jvmap = $thisPanel.find('.mashabledata_jvmap');
        //show / hide the panels
        if(hasChart) {
            $chart.show();
            $anno.show();
            $mapTitle.hide();
        } else {
            $chart.hide();
            $anno.hide();
            $mapTitle.show();
            if(graph.controls.chart){
                graph.controls.chart.destroy();
                delete graph.controls.chart;
            }
        }
        if(hasMap) {
            $jvmap.show();
        } else {
            $jvmap.hide();
        }
        if(hasMapViz) {
            $viz.show();
        } else {
            $viz.hide();
            if(graph.controls.vizChart){
                graph.controls.vizChart.destroy();
                delete graph.controls.vizChart;
            }
        }
        if(hasMap || hasMapViz){
            $mapAndVizContainer.show();
        } else {
            $mapAndVizContainer.hide();
        }
        //if panels have been added or removed that are not accounted for in mapconfig.sizes, revert to default sizing
        if(sizes && (_xor(sizes.chart, hasChart) || _xor(sizes.map, hasMap) ||_xor(sizes.viz, hasMapViz))){
            sizes = false;  //use default
            delete graph.mapconfig.sizes;
        }
        if(sizes){ //
            if(hasChart) $chart.width(sizes.chart.width).height(sizes.chart.height);
            if(hasMap) $jvmap.width(sizes.map.width).height(sizes.map.height);
            if(hasMapViz) $viz.width(sizes.viz.width).height(sizes.viz.height);
        } else {
            //TODO:  use title, graph controls, and analysis box heights instead of fixed pixel heights
            var mapHeight = ($thisPanel.height()-85-(graph.plots?0:55)) * ((graph.plots)?0.6:1) + 'px';  //60%/40% split between chart height and map height
            if(hasMapViz){
                $viz.height(mapHeight); //css('display', 'inline-block');
                $jvmap.css('width', '70%');
            } else {
                $jvmap.removeAttr("style");
            }
            if(hasMap) $jvmap.height(mapHeight);
            if(hasChart) {
                var plotHeight = (($thisPanel.height()-70 - (hasMap&&graph.mapsets&&graph.mapsets.length>1?70:0)) * ((hasMap||hasMapViz)?0.4:1)) + 'px';  //60%/40% split between chart height and map height
                $chart.removeAttr("style").height(plotHeight); //allow is to conform to div

            } //leave space for analysis textarea
            //panel sizing:  sub-panel reduce for thin border and possible scrolling
            $thisPanel.find('.graph-subpanel').width($thisPanel.width()-35-2).height($thisPanel.height());
            $thisPanel.find('.graph-sources').width($thisPanel.width()-35-2-40);
            $container.width($thisPanel.width()-365);
        }
        function _xor(a, b){ return a&&!b || !a&&b}
    }
}();

//TODO:  remove these and update the workbench to NOT use these shortcuts
if(window.grapher) grapher = MashableData.grapher;  //replace the workbench shortcut to allow in browser editting