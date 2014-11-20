/*
 graph.js
 */

MashableData.grapher = function(){
    var MD = MashableData,
        globals = MD.globals,
        common = MD.common,
        mapsList = common.maps,
        panelGraphs = globals.panelGraphs,
        months = globals.months,
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
        mapBackground = globals.mapBackground,
        graphScriptFiles = globals.graphScriptFiles,
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
            var chart;  //the rendered HighChart object set below on render

            if(oGraph.controls && oGraph.controls.chart) {
                oGraph.controls.chart.destroy();
                $.contextMenu('destroy', '#' + panelId + ' div.mashabledata_chart');
            }
            $chart.show();
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
                                    standard: {name: "add standard annotations", items: {}}
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
        setCropSlider: function setCropSlider(panelId){  //get closest point to recorded js dt
            if(globals.isEmbedded) return;  //not available for embedded graphs

            var leftIndex, rightIndex, maxIndex, i, bestDelta, thisDelta, chartOptions, oGraph = panelGraphs[panelId];
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

            $('#' + panelId + ' span.interval-crop-period').html(period.units[oGraph.largestPeriod]+'s');
            $('#' + panelId + ' div.crop-slider')
                .slider("option", "max", maxIndex)
                .slider("option", "values", [leftIndex, rightIndex]);
        },
        dateFromMdDate: function dateFromMdDate(mddt){  //returns a data object
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



        createMyGraph: function createMyGraph(id, onComplete){ //id can either be a graph id (int) or a ghash
            console.time('createMyGraph');
            //1. check to see if it is a gid of a graph that is already loaded in MyGraphs
            var myGraph = oMyGraphs['G' + id];
            if(myGraph){  //graph is found!
                createGraph($.extend(true, {}, myGraph)); //make a working copy of myGraph and draw it
            } else {
                for(var gid in oMyGraphs){ //perhaps id is a ghash > search myGraphs
                    if(oMyGraphs[gid].ghash==id){
                        myGraph = oMyGraphs[gid]; //found!
                        break;
                    }
                }
                if(myGraph) {  //was only set if found
                    createGraph($.extend(true, {}, myGraph)); //create the interaction instance using a working copy
                } else {  //not found > id assumed to be the graphcode (ghash) of a public graph
                    callApi(
                        {command: globals.isEmbedded?'GetEmbeddedGraph':'GetPublicGraph', ghash: id},
                        function(oReturn, textStatus, jqXH){
                            for(var ghandle in oReturn.graphs){
                                //if user wants to save, it must be saved as a copy if graph.userid <> this user (enforced in API too)
                                grapher.inflateGraph(oReturn.graphs[ghandle]);
                                createGraph(oReturn.graphs[ghandle]);  //new obj for API = no need to creat working copy
                            }
                        }
                    );
                }
            }
            function createGraph(graph){
                //TODO:  get maps from https://embedservice.mashabledata.com/global/js/maps/
                var fileAssets = (globals.isEmbedded?[]:graphScriptFiles).concat(graph.mapFile?[(globals.isEmbedded?'//remote.mashabledata.com/':'/global/js/maps/')+ graph.mapFile +'.js']:[]);  //get the map too if needed
                require(fileAssets); //non-blocking parallel load while getting db assets
                getAssets(graph, function(){
                    require(fileAssets, function(){ //blocking check to ensure required libraries have loaded
                        buildGraphPanel(graph);  //panelId not passed -> new panel
                        if(onComplete) onComplete();
                    });
                });
            }
            console.timeEnd('createMyGraph');
        },

        inflateGraph: function inflateGraph(graph){
            if(graph.annotations){
                graph.annotations=safeParse(graph.annotations,[]);
            } else {
                graph.annotations=[];
            }
            graph.eachPlot(function(p, plot){plot.options = safeParse(plot.options, {})});
            graph.eachComponent(function(c, comp){comp.options = safeParse(comp.options, {})});
            graph.mapconfig = safeParse(graph.mapconfig, {});

            function safeParse(jsonString, emptyValue){
                try{
                    return JSON.parse(jsonString.replace(/u0022/g, '"'));
                }
                catch(e){
                    return emptyValue;
                }
            }
        },

        makeChartOptionsObject: function makeChartOptionsObject(oGraph){
            console.time('makeChartOptionsObject');
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
                    scatter: {
                        zIndex: 20,
                        showInLegend: false //scatter used to show labels only
                    },
                    series: {
                        zIndex: 10,
                        marker: {
                            enabled: true,
                            radius: 4,
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
                    text: "created with MashableData.com",
                    href:  'http://www.mashabledata.com'
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
            function firstLast(MashableSeries, component){
                if(typeof component.firstdt != 'undefined'){
                    MashableSeries.firstdt = typeof MashableSeries.firstdt == 'undefined' ? parseInt(component.firstdt) : Math.min(parseInt(component.firstdt), parseInt(MashableSeries.firstdt));
                    MashableSeries.lastdt = typeof MashableSeries.lastdt  == 'undefined' ? parseInt(component.lastdt ) : Math.max(parseInt(component.lastdt ), parseInt(MashableSeries.lastdt));
                } else {
                    if(component.mapsetid || component.pointsetid){
                        for(location in component.data){
                            MashableSeries.firstdt = typeof MashableSeries.firstdt == 'undefined' ? parseInt(component.data[location].firstdt) : Math.min(parseInt(component.data[location].firstdt), parseInt(MashableSeries.firstdt));
                            MashableSeries.lastdt = typeof MashableSeries.lastdt  == 'undefined' ? parseInt(component.data[location].lastdt ) : Math.max(parseInt(component.data[location].lastdt ), parseInt(MashableSeries.lastdt));
                        }
                    }
                }
            }
            //find and create any mathematical days per interval series
            oGraph.eachComponent(function(i, plot){
                if(this.src == 'MashableData'){
                    var MashableSeries = this;
                    //if single component, use start and end of graph else use start and end of plot components
                    if(plot.components.length==1){
                        if(!oGraph.firstdt&&!oGraph.lastdt) oGraph.eachComponent(function(){ firstLast(oGraph, oGraph.assets[this.handle()]) });
                        this.firstdt = oGraph.firstdt;
                        this.lastdt = oGraph.lastdt;
                    } else {
                        delete MashableSeries.firstdt;
                        delete MashableSeries.lastdt;
                        plot.eachComponent(function(){firstLast(MashableSeries, this)});
                    }
                    MashableSeries.data = MashableData.common.dateConversionData(MashableSeries);
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
                if(oPlot.options.lineWidth) oDataSeries.lineWidth = oPlot.options.lineWidth;
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
            }
            function buildGraphPanelCore(oGraph, panelId){ //all highcharts, jvm, and colorpicker files need must already be loaded
                var title, calculatedMapData, $thisPanel;

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
                var annotations = new MashableData.Annotator(panelId, makeDirty);
                oGraph.controls = {
                    annotations: annotations,
                    $thisPanel: $thisPanel,
                    provenance: {},
                    redraw: (typeof redraw == 'undefined'?null:redraw)
                };
                console.timeEnd('buildGraphPanel:header');

                if(isEmbedded) {
                    panelHTML =
                        '<div class="mashabledata_chart-map">' +
                            '<div class="mashabledata_chart"></div>' +
                            '<div class="mashabledata_map" style="display:none;">' +
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
                            '<span class="right"><label><input type="checkbox" class="mashabledata_legend" '+(oGraph.mapconfig.showLegend?'checked':'')+'>legend</label></span>' +
                            '<span class="right"><label><input type="checkbox" class="mashabledata_map-list" '+(oGraph.mapconfig.showList?'checked':'')+'>list</label></span>' +
                            '</div>' +
                            '</div>' +
                            '<div class="mashabledata_graph-analysis"></div>' +
                            '</div>';
                } else {
                    panelHTML =
                        '<div class="graph-nav">' +
                            '<ol class="graph-nav">' +
                            '<li class="graph-nav-talk" data="graph-talk"></li>' +
                            '<li class="graph-nav-data" data="graph-data"></li>' +
                            '<li class="graph-nav-sources"  data="graph-sources"></li>' +
                            '<li class="graph-nav-active graph-nav-graph" data="graph-chart"></li>' +
                            '</ol>' +
                            '</div>'+
                            '<div class="graph-talk graph-subpanel" style="display: none;"><p>This graph must be saved at least once to enable Facebook comments.</p></div>' +
                            '<div class="graph-data graph-subpanel" style="display: none;">' +
                            '<div class="graph-data-inner">' +
                            '<ul>' +
                            '<li><a href="#data-chart-' + panelId + '">chart data</a></li>' +
                            '<li><a href="#data-region-' + panelId + '">map region data</a></li>' +
                            '<li><a href="#data-marker-' + panelId + '">map marker data</a></li>' +
                            '</ul><button class="download-data ui-state-highlight" title="Download the graph data as an Excel workbook">Download to Excel&nbsp;</button>' +
                            '<div id="data-chart-' + panelId + '" class="graph-data-subpanel" data="chart"><div class="slick-holder" style="width: 100%; height:100%;"></div></div>' +
                            '<div id="data-region-' + panelId + '" class="graph-data-subpanel" data="regions"><div class="slick-holder" style="width: 100%; height:100%;"></div></div>' +
                            '<div id="data-marker-' + panelId + '" class="graph-data-subpanel" data="markers"><div class="slick-holder" style="width: 100%; height:100%;"></div></div>' +
                            '</div>' +
                            '</div>' +
                            '<div class="provenance graph-sources graph-subpanel" style="display: none;"></div>' +
                            '<div class="graph-chart graph-subpanel">' +
                            '<div class="graph_control_panel" style="font-size: 11px !important;">' +
                            //change map selector and default
                            '<div class="change-map">change base map ' +
                            '<select class="change-map"></select>' +
                            '</div>' +
                            //default series type (line, column..)
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
                            '<div class="annotations"><fieldset><legend>Chart annotations</legend>' +
                            '<table class="annotations"></table>' +
                            '</fieldset></div>' +
                            '<div class="downloads">' +
                            '<fieldset>' +
                            '<legend>&nbsp;Download visualization&nbsp;</legend>' +
                            '<select class="download-selector"></select> ' +
                            'format: ' +
                            '<span title="download the graph as a PNG formatted image" class="md-png rico export-chart">PNG</span>' +
                            //'<span title="download the graph as a JPG formatted image" class="md-jpg rico export-chart">JPG</span>' +
                            '<span title="download the graph as a SVG formatted vector graphic"class="md-svg rico export-chart">SVG</span>' +
                            '<span title="download the graph as a PDF document" class="md-pdf rico export-chart">PDF</span>' +
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
                            '</div><div class="searchability">' +
                            '<input type="radio" name="'+ panelId +'-searchability" id="'+ panelId +'-searchable" value="Y" '+ (oGraph.published=='Y'?'checked':'') +' /><label for="'+ panelId +'-searchable">Public Graphs searchable</label>' +
                            '<input type="radio" name="'+ panelId +'-searchability" id="'+ panelId +'-private" value="N" '+ (oGraph.published=='N'?'checked':'') +' /><label for="'+ panelId +'-private">' + (account.info.orgName?'restrict to '+ account.info.orgName:'private') + '</label>' +
                            '</div>' +
                            '</fieldset>' +
                            '</div>' +
                            '<br /><button class="graph-save">save</button> <button class="graph-saveas">save as</button> <button class="graph-close">close</button> <button class="graph-delete">delete</button><br />' +
                            '</div>' +
                            '<div class="mashabledata_chart-map" style="width:70%;display:inline;float:right;">' +
                            '<div class="mashabledata_chart"></div>' +
                            '<div class="mashabledata_map" style="display:none;">' +
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
                            '<button class="merge group hidden" disabled="disabled">group</button>' +
                            '<button class="merge ungroup hidden" disabled="disabled">ungroup</button>' +
                            '<span class="right"><label><input type="checkbox" class="mashabledata_legend" '+(oGraph.mapconfig.showLegend?'checked':'')+'>legend</label></span>' +
                            '<span class="right"><label><input type="checkbox" class="mashabledata_map-list" '+(oGraph.mapconfig.showList?'checked':'')+'>list</label></span>' +
                            '</div>' +
                            '</div>' +
                            '<div height="75px"><textarea style="width:98%;height:50px;margin-left:5px;" class="graph-analysis" maxlength="1000" /></div>' +
                            '</div>' +
                            '</div>';
                }
                $thisPanel.html(panelHTML);

                var chart, grid;
                console.timeEnd('buildGraphPanel:thisPanel');
                console.time('buildGraphPanel:thisPanel events');
                //configure and bind the controls
                if(isEmbedded){
                    $thisPanel.find('div.mashabledata_graph-analysis').html(oGraph.analysis);
                } else {
                    function enableComments(){
                        if(oGraph.ghash) $thisPanel.find('.graph-talk.graph-subpanel').html('<fb:comments href="https://www.mashabledata.com/workbench/#/t=g&graphcode='+oGraph.ghash+'"></fb:comments>');
                    }
                    enableComments();

                    $thisPanel.find('ol.graph-nav').children('li')
                        .click(function(){ //Graph-Configure-Data-Comments sub panels:  init show state dtermined by HTML template above
                            var $this = $(this);
                            $thisPanel.find('ol.graph-nav').children('li').removeClass('graph-nav-active');
                            $thisPanel.find('.graph-subpanel').hide();
                            var $div = $thisPanel.find('.' + $this.attr('data')).show();
                            $this.addClass('graph-nav-active');
                            switch($this.attr('data')){
                                case 'graph-talk':
                                    FB.XFBML.parse($div.get(0),
                                        function(){  //set size and margin in callback
                                            $thisPanel.find('iframe')
                                                .width($thisPanel.find('.graph-talk.graph-subpanel').width()*0.9+'px')
                                                .css('margin','15px');
                                        });
                                    break;
                                case 'graph-data':
                                    provenance.provOk();  //applies any pending changes.  will only run once.
                                    $thisPanel.find('.graph-data-inner')
                                        .tabs(oGraph.plots?"enable":"disable",0)
                                        .tabs(oGraph.mapsets?"enable":"disable",1)
                                        .tabs(oGraph.pointsets?"enable":"disable",2);
                                    var dataTabLink = $thisPanel.find('.graph-data-inner li:not(.ui-state-disabled)').first().find('a').click();
                                    if(dataTabLink.html()=='chart data') makeSlickDataGrid(grid, panelId, $(dataTabLink.attr('href')));
                                    break;
                                case 'graph-sources':
                                    provenance.build();
                                    break;
                                case 'graph-chart':
                                    provenance.provOk();  //applies change if changes are waiting and have not been canceled.  only runs once.
                            }
                        });

                    $thisPanel.find('.graph-data-inner')
                        .tabs({
                            activate: function( event, ui ) {
                                console.timeEnd("complete grid data into table");
                                makeSlickDataGrid(grid, panelId, ui.newPanel);
                                console.timeEnd("complete grid data into table");
                            }
                        });

                    $thisPanel.find('button.download-data').button({icons: {secondary: "ui-icon-calculator"}})
                        .click(function(){
                            var grids = [];
                            if(oGraph.plots) {
                                var chartDataObject = gridDataForChart(panelId);
                                grids.push({name: 'chart', grid: {columns: chartDataObject.columns,  data: chartDataObject.rows}});
                            }
                            if(oGraph.mapsets) grids.push({name: 'regions', grid: {columns: calculatedMapData.regionGrid.columns, data: calculatedMapData.regionGrid.data}});
                            if(oGraph.pointsets) grids.push({name: 'markers', grid: {columns: calculatedMapData.markerGrid.columns, data: calculatedMapData.markerGrid.data}});
                            //do the highcharts trick to download a file
                            downloadMadeFile({
                                filename: oGraph.title,
                                data: JSON.stringify(grids),
                                url: 'excel.php'  //page of server that use PHPExcel library to create a workbook
                            });
                        });
                    var innerHeight = $thisPanel.find('.graph-subpanel').width($thisPanel.width()-35-2).height($thisPanel.height()).find('.mashabledata_chart-map').width($thisPanel.width()-40-350).end().innerHeight();
                    $thisPanel.find('.graph-data-subpanel').height($thisPanel.innerHeight()-60);  //account for chart/region/markers tabs
                    $thisPanel.find('.graph-sources').width($thisPanel.width()-35-2-40);
                    $thisPanel.find('.graph-analysis').val(oGraph.analysis);
                    $thisPanel.find('select.download-selector').change(function(){
                        if($(this).val()=='map'){
                            if(!oGraph.mapsets&&!oGraph.pointsets) {
                                dialogShow("no map","This graph does not have a map to download.  Map are adding to graphs by finding a series that belongs to a map set or a marker set and mapping the set.");
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
                        exportChart(type);
                    });
                    $thisPanel.find('a.post-facebook')
                        .click(function(){
                            var svg;
                            if(oGraph.mapsets||oGraph.pointsets){  //need check for IE<10 = isIE+ version check
                                svg = cleanMapSVG($map.container.html());
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
                    var link = "mailto: "
                        + "?subject=" + escape(oGraph.title||"link to my MashableData visualization")
                        + "&body=" + escape((oGraph.analysis||'Link to my interactive visualization on MashableData.com:')+'<br><br>http://www.mashabledata.com/workbench/#/t=g2&graphcode='+oGraph.ghash);

                    $thisPanel.find('.graph-email').button({icons: {secondary: "ui-icon-mail-closed"}}).attr('href',link);
                    $thisPanel.find('.email-link').attr('href',link);
                    $thisPanel.find('.graph-embed').button({icons: {secondary: "ui-icon-script"}})
                        .click(function(){
                            if(oGraph.isDirty) {
                                dialogShow("Graph is not saved", "Please save the graph first so that links will show the graph as currently displayed.");
                                return;
                            }
                            var offset = $(this).offset();  //button offset relative to document
                            var linkDivHTML =
                                '<div id="embed-info">' +
                                    '<button class="right" id="embed-info-close">close</button>' +
                                    '<b>link code: </b><span id="link-ghash">' + oGraph.ghash + '</span><br><br>' +
                                    '<em>The code below will embed this visualization in a webpage.  (Requires installation of the <a target="_blank" href="/embedding">MashableData embed library</a>)</em>' +
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
                        if(oGraph.controls.chart){
                            oGraph.start = oGraph.controls.chart.options.chart.x[values[0]];
                            oGraph.end = oGraph.controls.chart.options.chart.x[values[1]];
                        } else {
                            oGraph.start = oGraph.calculatedMapData.dates[values[0]].dt.getTime();
                            oGraph.end = oGraph.calculatedMapData.dates[values[1]].dt.getTime()
                        }
                        redraw();  //should be signals or a call to a local var  = function
                    };
                    var cropDates = function(slider){
                        var values = $(slider).slider("values");
                        if(oGraph.controls.chart){
                            return formatDateByPeriod(oGraph.controls.chart.options.chart.x[values[0]],oGraph.smallestPeriod)+' - '+formatDateByPeriod(chart.options.chart.x[values[1]],oGraph.smallestPeriod);
                        } else {
                            return formatDateByPeriod(oGraph.calculatedMapData.dates[values[0]].dt.getTime(), oGraph.calculatedMapData.freq)+' - '
                                + formatDateByPeriod(oGraph.calculatedMapData.dates[values[1]].dt.getTime(), oGraph.calculatedMapData.freq);
                        }
                    };

                    $thisPanel.find('div.crop-slider').slider(
                        { //max and value[] are set in setCropSlider() after Highchart is called below
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

                    /*$('#'+panelId+'-rad-hard-crop')  HANDLED ABOVE + DELETE
                        .change(function(){
                            hardCropFromSlider();
                        });*/

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
                            //triggered by <label> wrapping around this element $thisPanel.find('input#'+panelId+'-rad-interval-crop').attr('checked',true);
                            oGraph.start = null;
                            oGraph.end = null;
                            if(oGraph.intervals != parseInt($(this).val())){
                                oGraph.intervals = parseInt($(this).val());
                                redraw();
                            }
                        }
                    });

                    $thisPanel.find('button.graph-crop').click(function(){  //TODO: replace this click event of hidden button with signals
                        var graph = panelGraphs[panelId];
                        graph.start = (graph.minZoom>graph.firstdt)?graph.minZoom:graph.firstdt;
                        graph.end = (graph.maxZoom<graph.lastdt)?graph.maxZoom:graph.lastdt;
                        $(this).attr("disabled","disabled");
                        setCropSlider(panelId);
                        $('#'+panelId+'-rad-hard-crop').click();
                    });
                    // *** crop routine end ***

                    //the annotations height must be set after the jQuery UI changes to buttons, spinners, ...
                    $thisPanel.find('div.annotations fieldset').height(
                        innerHeight //from graph subpanel
                            - $thisPanel.find('div.change-map').height()
                            - $thisPanel.find('div.crop-tool').height()
                            - $thisPanel.find('div.graph-type').height()
                            - $thisPanel.find('div.downloads').height()
                            - $thisPanel.find('div.sharing').height()
                            - 50 //save close buttons
                    );

                    $thisPanel.find('input.graph-publish')
                        .change(function(){
                            oGraph.published = (this.checked?'Y':'N');
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
                        var newGraph = oGraph.clone(); //doesn't copy assets or data
                        var newMapCode = $mapSelect.val();
                        $mapSelect.val(oGraph.map);  //for old graph, continue to show its map in its selector

                        var fileAssets = ['/global/js/maps/'+ globals.maps[newMapCode].jvectormap +'.js'];
                        require(fileAssets); //parallel load while getting db assets
                        newGraph.changeMap(newMapCode, function(){
                            require(fileAssets, function(){ //ensure that we have the new map file
                                buildGraphPanel(newGraph); //panelId not passed -> new panel
                            });
                        });
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
                        var downloadOptions = '';
                        if(oGraph.plots) downloadOptions  += '<option value="chart">chart</option>';
                        if(oGraph.mapsets||oGraph.pointsets) downloadOptions  += '<option value="map" selected>map</option>';
                        if(summationMap = isSummationMap(oGraph)){
                            if(!oGraph.cubeid) oGraph.mapconfig.summationCube = true;
                        } else {
                            delete oGraph.mapconfig.summationCube;
                        }
                        if(oGraph.mapconfig.summationCube || oGraph.cubeid) downloadOptions  += '<option value="cube">supplemental bar chart</option>';
                        $('.download-selector').html(downloadOptions);
                    }
                    function redraw(){
                        mask('redrawing');
                        setTimeout(function(){
                            //destroy
                            destroyChartMap(panelId); //destroy the Highchart, the map and the contectMenu if they exist.
                            if(oGraph.plots){
                                calcGraphMinMaxZoomPeriod(oGraph);
                                chart = chartPanel(panelId);
                                annotations.build();  //build and shows teh annotations table
                                $thisPanel.find('div.mashabledata_chart').show();
                            } else {
                                $thisPanel.find('div.mashabledata_chart').hide();
                                $thisPanel.find('div.annotations').hide();
                            }
                            showChangeSelectors();
                            if(oGraph.mapsets||oGraph.pointsets){
                                drawMap(); //shows the map div
                                if(oGraph.plots) $thisPanel.find('map-title').hide(); else $thisPanel.find('map-title').show();
                                $thisPanel.find('select.change-map').html(fillChangeMapSelect());
                            } else {
                                $thisPanel.find('div.mashabledata_map').hide();
                            }
                            unmask();
                        }, 10);
                    }
                }
                var summationMap;  //function level var allows isSummationMap() to be run only once per load/redraw
                if(!isEmbedded){
                    $thisPanel
                        .find('.graph-analysis')
                        .keydown(function(){
                            panelGraphs[panelId].analysis = this.value;
                            makeDirty();
                        });
                }
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
                    saveGraph(oGraph, enableComments);
                    $thisPanel.find('button.graph-delete, button.graph-saveas').button("enable");
                    makeClean();
                }
                function exportChart(type){
                    switch($thisPanel.find('select.download-selector').val()){
                        case 'map':
                            downloadMap(panelId, type);
                            break;
                        case 'chart':
                            annotations.sync();
                            chart.exportChart({type: type, width: 2000});
                            break;
                        case 'cube':
                            oGraph.controls.vizChart.exportChart({type: type, width: 2000});
                            break;
                    }
                }

                if(!isEmbedded){
                    $thisPanel.find('button.graph-save').button({icons: {secondary: "ui-icon-disk"}}).button('disable')
                        .click(saveThisGraph);

                    $thisPanel.find('button.graph-saveas').button({icons: {secondary: "ui-icon-copy"}, disabled: (!oGraph.gid)})
                        .click(function(){
                            delete oGraph.gid;
                            graphTitle.show(this, saveThisGraph);
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
                }

                console.timeEnd('buildGraphPanel:thisPanel events');
                calcGraphMinMaxZoomPeriod(oGraph);
                panelGraphs[panelId] = oGraph;  //panelGraphs will be synced to oMyGraphs on save
                if(!isEmbedded){
                    console.time('buildGraphPanel:provController');
                    var provenance = new ProvenanceController(panelId);  //needs to be set after panelGraphs is updated
                    oGraph.controls.provenance = provenance;
                    console.timeEnd('buildGraphPanel:provController');
                }
                //DRAW THE CHART
                if(oGraph.plots){
                    console.time('buildGraphPanel:build annoatations');
                    chart = chartPanel(panelId);
                    annotations.build();
                    console.timeEnd('buildGraphPanel:build annoatations');
                    $thisPanel.find('div.highcharts-container').mousedown(function (b) {
                        if(b.which==3){}  //???
                    });
                } else {
                    $thisPanel.find('div.mashabledata_chart').hide();
                    $thisPanel.find('div.annotations').hide();
                }
                ////////////MMMMMMMMMMMMMMAAAAAAAAAAAAAAAAAAPPPPPPPPPPPPPPPPPPPPPP
                var $map = null, vectorMapSettings, val, mergablity;

                console.time('buildGraphPanel:drawMap');
                drawMap();
                console.timeEnd('buildGraphPanel:drawMap');

                setCropSlider(panelId); //needs to be called after the map is calculated

                function drawMap(){
                    if(oGraph.map && (oGraph.mapsets||oGraph.pointsets)){

                        if($map) $map.remove();
                        //TODO:  use title, graph controls, and analysis box heights instead of fixed pixel heights
                        var mapHeight = (oGraph.controls.$thisPanel.height()-85-(oGraph.plots?0:55)) * ((oGraph.plots)?0.6:1);
                        if(parseInt(oGraph.mapconfig.cubeid) || oGraph.mapconfig.cubeid == 'sum'){
                            $thisPanel.find('.mashabledata_cube-viz').show().height(mapHeight); //css('display', 'inline-block');
                            $thisPanel.find('.mashabledata_jvmap').css('width', '70%');
                        } else {
                            if(oGraph.controls.vizChart){
                                oGraph.controls.vizChart.destroy();
                                delete oGraph.controls.vizChart;
                            }
                            $thisPanel.find('.mashabledata_cube-viz').hide();
                            $thisPanel.find('.mashabledata_jvmap').removeAttr("style");
                        }
                        console.time('buildGraphPanel:drawMap:calcMap');
                        calculatedMapData = calcMap(oGraph);  //also sets a oGraph.calculatedMapData reference to the calculatedMapData object
                        console.timeEnd('buildGraphPanel:drawMap:calcMap');
                        console.time('buildGraphPanel:drawMap:calcAttributes');
                        calcAttributes(oGraph);
                        console.timeEnd('buildGraphPanel:drawMap:calcAttributes');
                        if(isBubble()) bubbleCalc();
                        console.time('buildGraphPanel:drawMap:fillScaling+Scaling');
                        var fillScaling = fillScalingCount(oGraph.pointsets);
                        var areaScaling = areaScalingCount(oGraph.pointsets);
                        console.timeEnd('buildGraphPanel:drawMap:fillScaling+Scaling');
                        //console.info(calculatedMapData);
                        console.time('buildGraphPanel:drawMap:jvm call');
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
                                var i, vals=[], currentIndex, containingDateData = getMapDataByContainingDate(calculatedMapData.regionData,calculatedMapData.dates[val].s);
                                if(calculatedMapData.regionColors){
                                    var containingDateColor = getMapDataByContainingDate(calculatedMapData.regionColors, calculatedMapData.dates[val].s);
                                    if(containingDateColor && typeof containingDateColor[code] != 'undefined'){
                                        for(i=0;i<calculatedMapData.dates.length;i++){
                                            if(calculatedMapData.regionData[calculatedMapData.dates[i].s] && typeof calculatedMapData.regionData[calculatedMapData.dates[i].s][code]!='undefined') {
                                                vals.push([calculatedMapData.dates[i].dt.getTime(), calculatedMapData.regionData[calculatedMapData.dates[i].s][code]]);
                                                if(i==val) currentIndex = vals.length-1;
                                            }
                                        }
                                        var y = containingDateData[code];
                                        label.html(
                                            '<div><b>'+calculatedMapData.title+': '+$map.getRegionName(code)+'</b> '
                                                + common.numberFormat(y, (parseInt(y)==y)?0:2)
                                                + ' ' + (calculatedMapData.mapUnits||'')
                                                + '</div><div class="inlinesparkline" style="height: 30px;width: '+Math.min(400, 10*vals.length)+'px;margin:0 5px;"></div>'
                                        ).css("z-Index",400);

                                        var sparkOptions = {
                                            grid: {show: false}
                                        };
                                        // main series
                                        var series = [{
                                            data: vals,
                                            color: '#ddddff',
                                            lines: {lineWidth: 0.8, fill: true},
                                            shadowSize: 0
                                        }];
                                        if(vals.length<10) series.bars = {show: true};

                                        // colour the current point red
                                        if(typeof currentIndex != 'undefined'){
                                            series.push({
                                                data: [ vals[currentIndex] ],
                                                points: {show: true, radius: 1, fillColor: '#ff0000'},
                                                color: '#ff0000'
                                            });
                                        }

                                        label.find('div.inlinesparkline').plot(series, sparkOptions);  // draw the sparkline
                                    }
                                }
                            },
                            regionsSelectable: (typeof oGraph.mapsets != "undefined"),
                            markers: calculatedMapData.markers,
                            onMarkerLabelShow: function(event, label, code){
                                var i, vals=[], containingDateData = getMapDataByContainingDate(calculatedMapData.markerData,calculatedMapData.dates[val].s);
                                for(i=0;i<calculatedMapData.dates.length;i++){
                                    //show sparkline of radius data if exists; else fill data
                                    if(typeof calculatedMapData.markerData[calculatedMapData.dates[i].s]!='undefined') vals.push(calculatedMapData.markerData[calculatedMapData.dates[i].s][code].r||calculatedMapData.markerData[calculatedMapData.dates[i].s][code].f);
                                }
                                if(containingDateData && containingDateData[code]){

                                    var html, y = containingDateData[code].r;
                                    if(isBubble()){
                                        var regionNames = [], regionCodes = code.split('+');
                                        for(i=0;i<regionCodes.length;i++){
                                            regionNames.push($map.getRegionName(regionCodes[i]));
                                        }
                                        html = '<div><b>'+calculatedMapData.title+': '+regionNames.join(' + ') + '</b> ';
                                    } else {
                                        html = '<div><b>'+label.html()+':</b> ';
                                    }
                                    if(containingDateData[code].r) html += common.numberFormat(containingDateData[code].r, (parseInt(containingDateData[code].r)==containingDateData[code].r)?0:2) + " " + (calculatedMapData.radiusUnits||'')+'<br>';
                                    if(containingDateData[code].f) html += common.numberFormat(containingDateData[code].f, (parseInt(containingDateData[code].f)==containingDateData[code].f)?0:2) + " " + (calculatedMapData.fillUnits||'')+'<br>';
                                    html += '</div><span class="inlinesparkline" style="height: 30px;margin:0 5px;"></span>';
                                    label.html(html).css("z-Index",400);
                                    var sparkOptions = {height:"30px", valueSpots:{}, spotColor: false, minSpotColor:false, maxSpotColor:false, disableInteraction:true};
                                    sparkOptions.valueSpots[y.toString()+':'+y.toString()] = 'red';
                                    $('.inlinesparkline').sparkline(vals, sparkOptions);
                                }
                            },
                            onRegionClick: function(){
                                if(!$graphSelected.is(':visible')) $map.clearSelectedRegions();
                            },
                            onRegionSelected: function(e, code, isSelected){
                                cubeVizFromMap(code, isSelected);
                                setMergablity();
                                var selectedMarkers = $map.getSelectedMarkers();
                                if(selectedMarkers.length>0){
                                    $thisPanel.find('.mashabledata_map-graph-selected.ui-button, .mashabledata_make-map.ui-button').button('enable');
                                    return;
                                }
                                var selectedRegions = $map.getSelectedRegions();
                                console.info('onRegionSelected ' + selectedRegions.length);
                                if($graphSelected.is(':visible')){
                                    for(var i=0;i<selectedRegions.length;i++){
                                        if(calculatedMapData.regionColors){
                                            for(var dateKey in calculatedMapData.regionColors){ //only need a single valid region date key
                                                if(typeof calculatedMapData.regionColors[dateKey][selectedRegions[i]]!='undefined'){
                                                    $thisPanel.find('.mashabledata_map-graph-selected.ui-button, .mashabledata_make-map.ui-button').button('enable');
                                                    return;
                                                }
                                                break;
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

                        val = calculatedMapData.endDateIndex; //initial value
                        $thisPanel.find('div.mashabledata_map').show();

                        $thisPanel.find('div.mashabledata_jvmap').show().height(mapHeight).vectorMap(vectorMapSettings);
                        $map = $thisPanel.find('div.mashabledata_jvmap').vectorMap('get', 'mapObject');

                        console.timeEnd('buildGraphPanel:drawMap:jvm call');

                        console.time('buildGraphPanel:mapControls');
                        oGraph.controls.map = $map;
                        var $mapDateDiv = $('<div class="mashabledata_map-date"></div>').prependTo($thisPanel.find('div.jvectormap-container'));

                        //BBBUUUUBBBBBLLEESS!!!!!
                        var $g = $thisPanel.find('div.mashabledata_jvmap svg g:first');  //goes in createGraph closure

                        if(isBubble()){
                            positionBubbles();
                            $map.series.regions[0].setAttributes(calculatedMapData.regionsColorsForBubbles);
                            $thisPanel.find('button.merge').show();
                        }

                        function cubeVizFromMap(code, isSelected){
                            console.time('cubeVizFromMap');
                            //this will be called multiple time from RegionOnSelect event when deselecting all
                            //find the key.  If this get a visualization courtesy of being a Summation Map, create the cube
                            /*if(code&&summationMap&&!isSelected){
                             oGraph.controls.vizChart.get(code).remove();
                             return;
                             }*/
                            if(parseInt(oGraph.mapconfig.cubeid) || oGraph.mapconfig.cubeid == 'sum') {
                                var geoKey, mapDate = calculatedMapData.dates[val].s;
                                if(code){
                                    geoKey = code;
                                } else {
                                    geoKey = null;
                                    //is a (last) region selected
                                    var selectedRegions = $map.getSelectedRegions();
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
                                if(oGraph.mapconfig.cubeid == 'sum'){  //the cube must be made from the mapsets in assets
                                    if(!isNaN(geoKey)) geoKey = 'G'+geoKey; //don't show the map name for the bunny of a summation map:  only instructions
                                    var oFormula = oGraph.mapsets[0].options.calculatedFormula;
                                    var signedNumArray = oFormula.numFormula.replace('-','+-').split('+');
                                    var unsignedNumArray = oFormula.numFormula.replace('-','+').split('+');
                                    //loop though components and build a values array
                                    var asset, seriesVal, symbolData = {}, names = [], i, numNamesAsWords = [], symbol, o = {}, nameTree = {};
                                    $.each(oGraph.mapsets[0].components, function(c){
                                        asset = oGraph.assets[this.handle()];
                                        names.push(asset.name);
                                        symbol = mapsets[0].compSymbol(c);
                                        if(this.handle[0]=='M'){
                                            symbolData[symbol] = asset.data[geoKey]?asset.data[geoKey].data:null;
                                        } else {
                                            symbolData[symbol] = asset.data;
                                        }
                                        names.push(asset.name);
                                        nameTree[symbol] = asset.name;
                                    });
                                    for(i=unsignedNumArray.length-1;i>=0;i--){
                                        if(unsignedNumArray[i].trim()=="")
                                            unsignedNumArray.splice(i,0,1);
                                        else
                                            numNamesAsWords.unshift(nameTree[unsignedNumArray[i].trim()].split(' '));
                                    }

                                    //core the names to create categories
                                    var peeledWords = [], peelingFront = true, peelingBack = true;
                                    while(peelingFront && peelingBack){
                                        for(i=0;i<numNamesAsWords.length;i++){
                                            //expell blank words
                                            while(numNamesAsWords[i].length>0 && numNamesAsWords[i][0]=='') numNamesAsWords[i].shift();
                                            while(numNamesAsWords[i].length>0 && numNamesAsWords[i][numNamesAsWords[i].length-1]=='') numNamesAsWords[i].pop();
                                            if(numNamesAsWords[i].length>0){
                                                if(numNamesAsWords[i][0]!=numNamesAsWords[0][0]) peelingFront = false;
                                                if(numNamesAsWords[i].length>1){
                                                    if(numNamesAsWords[i][numNamesAsWords[i].length-1]!=numNamesAsWords[0][numNamesAsWords[0].length-1]) peelingBack = false;
                                                }
                                            } else {
                                                peelingFront = peelingBack = false;
                                                break;
                                            }
                                        }
                                        if(peelingFront) peeledWords.unshift(numNamesAsWords[0][0]);
                                        if(peelingBack) peeledWords.push(numNamesAsWords[0][numNamesAsWords[0].length-1]);
                                        for(i=0;i<numNamesAsWords.length;i++){
                                            if(peelingFront) numNamesAsWords[i].shift();
                                            if(peelingBack) numNamesAsWords[i].pop();
                                        }
                                    }
                                    var categories = [];
                                    //
                                    oGraph.assets.cube = {dimensions: [{list: []}]};
                                    var cube = oGraph.assets.cube;
                                    cube.theme =  peeledWords.join(' ');
                                    cube.name = '';
                                    cube.units = oGraph.mapsets[0].units();
                                    cube['G'+geoKey] = {facetedData: []};
                                    for(i=0;i<numNamesAsWords.length;i++){
                                        cube.dimensions[0].list.push({name: numNamesAsWords[i].join(' ')});
                                        //TODO: need to synthesize each numerator component as per createSerieFromPlot
                                        cube['G'+geoKey].facetedData[i] = symbolData[unsignedNumArray[i].trim()];
                                    }
                                }
                                var action = 'new';
                                if(summationMap){
                                    if(code){
                                        action = isSelected?'add':'remove';
                                    } else {
                                        action = 'summation';
                                    }
                                }
                                vizualizeCube(oGraph, geoKey, mapDate, action);

                                console.time('vizChart.redraw');
                                if(!noCubeRedraw && action=='remove') oGraph.controls.vizChart.redraw();
                                console.timeEnd('vizChart.redraw');
                            }
                            $mapDateDiv.html(formatDateByPeriod(calculatedMapData.dates[val].dt.getTime(), calculatedMapData.freq));
                            console.timeEnd('cubeVizFromMap');
                        }
                        //don't show if map has only a single date
                        function setRegionsMarkersAtribute(val){
                            if(!isBubble()&&calculatedMapData.regionColors){ //don't call if pointsets only
                                //attribute color calvulated in calcAttributes
                                $map.series.regions[0].setAttributes(getMapDataByContainingDate(calculatedMapData.regionColors, calculatedMapData.dates[val].s));
                                //value based: $map.series.regions[0].setValues(getMapDataByContainingDate(calculatedMapData.regionData,calculatedMapData.dates[val].s));
                            }
                            if(oGraph.pointsets){
                                if(areaScaling){
                                    $map.series.markers[0].setAttributes(getMapDataByContainingDate(calculatedMapData.markerAttr.r, calculatedMapData.dates[val].s));
                                    $map.series.markers[2].setAttributes(getMapDataByContainingDate(calculatedMapData.markerAttr.stroke, calculatedMapData.dates[val].s));
                                }
                                if(fillScaling){
                                    $map.series.markers[1].setAttributes(getMapDataByContainingDate(calculatedMapData.markerAttr.fill, calculatedMapData.dates[val].s));
                                }
                            }
                            if(isBubble()){
                                $map.series.markers[0].setAttributes(getMapDataByContainingDate(calculatedMapData.markerAttr.r, calculatedMapData.dates[val].s));
                                $map.series.markers[2].setAttributes(getMapDataByContainingDate(calculatedMapData.markerAttr.stroke, calculatedMapData.dates[val].s));
                            }
                            if(oGraph.plots){
                                var timeAxis = chart.xAxis[0];
                                timeAxis.removePlotLine('timeLine');
                                timeAxis.addPlotLine({
                                    value: calculatedMapData.dates[val].dt,
                                    color: 'red',
                                    width: 2,
                                    id: 'timeLine'
                                })
                            }
                            cubeVizFromMap();
                        }
                        var $mapSlider = $thisPanel.find('.mashabledata_map-slider');
                        if(calculatedMapData.startDateIndex!=calculatedMapData.endDateIndex){
                            $mapSlider
                                .show()
                                .slider({  //removed .off() because slider not working when reintialized
                                    value: calculatedMapData.endDateIndex,
                                    min: calculatedMapData.startDateIndex,
                                    max: calculatedMapData.endDateIndex,
                                    step: 1,
                                    change: function( event, ui ) { //this event fires when the map is first loaded
                                        val = ui.value;
                                        setRegionsMarkersAtribute(val);
                                    }
                                })
                                .slider("value", calculatedMapData.endDateIndex); //needed for first draw, but double triggers on true redraw = not end of the world
                        } else {
                            $mapSlider.hide();
                            setRegionsMarkersAtribute(calculatedMapData.startDateIndex);
                        }
                        if(oGraph.mapconfig.showList) {
                            makeList($map);
                        }
                        var $graphSelected = $thisPanel.find('.mashabledata_map-graph-selected');
                        $graphSelected.button({icons:{secondary: 'ui-icon-image'}}).off()
                            .click(function(){ //graph selected regions and markers (selectRegions/selectMarkers must be true for this to work
                                /* calcData contains the values for markers and regions in a JVMap friendly (which is not a MD series firnedly format.
                                 If only a single mapset or pointset has only one component, we can go back to that pointset/mapset's asset data.
                                 If more than one component, we need to assemble a graph obect with plots, plot.options.name, components, and assets.
                                 OK.  That is a lot of work, but is correct.  quickGraph will need to detect a graph object as it currently expects a series object.
                                 * */

                                var selectedRegions = $map.getSelectedRegions();
                                var selectedMarkers = $map.getSelectedMarkers();
                                var popGraph = new MD.Graph(), plt, formula, i, j, c, X, regionCodes, regionNames, pointset, mapComps, comps, newComp, asset, found;
                                popGraph.title = 'from map of ' + oGraph.title;
                                for(i=0;i<selectedMarkers.length;i++){  //the IDs of the markers are either the lat,lng in the case of pointsets or the '+' separated region codes for bubble graphs
                                    if(isBubble()){
                                        //get array of regions codes
                                        plt = $.extend(true, {}, oGraph.mapsets[0]);
                                        delete plt.formula;
                                        delete plt.options.calculatedFormula;
                                        mapComps = plt.components;
                                        plt.components = [];

                                        regionCodes = selectedMarkers[i].split('+');
                                        regionNames = [];
                                        for(j=0;j<regionCodes.length;j++){
                                            regionNames.push($map.getRegionName(regionCodes[j]));
                                            for(c=0;c<mapComps.length;c++){
                                                if(mapComps[c].handle[0]=='M'){
                                                    asset = $.extend({units: oGraph.assets[mapComps[c].handle()].units, period: oGraph.assets[mapComps[c].handle()].freq}, oGraph.assets[mapComps[c].handle()].data[regionCodes[j]]);
                                                    newComp = $.extend(true, {}, mapComps[c]);
                                                    newComp.handle = asset.handle;
                                                    popGraph.assets[asset.handle()] = asset; //data, first/lastdt, handle & name
                                                    plt.components.push(newComp);
                                                } else {
                                                    plt.components.push($.extend(true, {}, mapComps[c]));
                                                    popGraph.assets[mapComps[c].handle()] = oGraph.assets[mapComps[c].handle()];
                                                }
                                            }
                                        }
                                        plt.options.name = oGraph.mapsets[0].name() + " for " + regionNames.join('+');
                                        popGraph.plots.push(plt);
                                    } else {
                                        for(X=0;X<oGraph.pointsets.length;X++){
                                            pointset = $.extend(true, {}, oGraph.pointsets[X]);
                                            found = false;
                                            comps = pointset.components;
                                            for(c=0;c<comps.length;c++){
                                                if(comps[c].handle[0]=='X' && oGraph.assets[comps[c].handle()].data[selectedMarkers[i]]){
                                                    found = true;
                                                    sHandle = oGraph.assets[comps[c].handle()].data[selectedMarkers[i]].handle;
                                                    popGraph.assets[sHandle] = $.extend({units: oGraph.assets[comps[c].handle()].units, period: oGraph.assets[comps[c].handle()].freq}, oGraph.assets[comps[c].handle()].data[selectedMarkers[i]]); //data, first/lastdt, handle & name
                                                    comps[c].handle = sHandle;
                                                } else {
                                                    popGraph.assets[comps[c].handle()] = oGraph.assets[comps[c].handle()];
                                                }
                                            }
                                            if(found) popGraph.plots.push(pointset);
                                        }
                                    }
                                }
                                //regions (mapsets) are simpler than markers (pointsets) because there is only one
                                if(oGraph.mapsets){  //skip if not mapset
                                    var sourceMapPlot, sourceComponent, popComponent, popComponents, mapAsset, regionSeries;
                                    for(i=0;i<selectedRegions.length;i++){
                                        if(typeof calculatedMapData.regionColors[calculatedMapData.dates[val].s][selectedRegions[i]]!='undefined'){  //make sure this region has data (for multi-component mapsets, all component must this regions data (or be a straight series) for this region to have calculatedMapData data
                                            sourceMapPlot = oGraph.mapsets[0];
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
                                    if(isEmbedded) MD.plugin.popGraph(popGraph); else quickGraph(popGraph, true);
                                } else {
                                    $thisPanel.find('.mashabledata_make-map').click();
                                }
                            });

                        var $play = $thisPanel.find('.mashabledata_map-play');
                        if(calculatedMapData.startDateIndex!=calculatedMapData.endDateIndex){ //don't show the map slider and play controls if there only a single date
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
                            $thisPanel.find('.mashabledata_map-step-backward').off()
                                .click(function(){
                                    $mapSlider.slider("value",$mapSlider.slider("value")-1);
                                })
                                .button({text: false, icons: {primary: "ui-icon-seek-first"}});
                            $thisPanel.find('.mashabledata_map-step-forward').off()
                                .click(function(){
                                    $mapSlider.slider("value",$mapSlider.slider("value")+1);
                                })
                                .button({text: false, icons: {primary: "ui-icon-seek-end"}});

                        } else {
                            $play.hide();
                            $thisPanel.find('.mashabledata_map-step-backward, .mashabledata_map-step-forward').hide();
                        }
                        if(oGraph.plots)
                            $thisPanel.find('h3.mashabledata_map-title').hide();
                        else
                            $thisPanel.find('h3.mashabledata_map-title').html(oGraph.title).click(function(){
                                graphTitle.show(this);
                            });  //initialize here rather than set slider value which would trigger a map redraw

                        var noCubeRedraw = false;
                        $thisPanel.find('.mashabledata_make-map')
                            .button({icons: {secondary: 'ui-icon-arrowrefresh-1-s'}}).off()
                            .click(function(){
                                noCubeRedraw = true;
                                $map.clearSelectedMarkers();
                                $map.clearSelectedRegions();
                                noCubeRedraw = false;
                                if(oGraph.controls.vizChart) oGraph.controls.vizChart.redraw();
                                /*$map.removeAllMarkers();
                                 $map.addMarkers(calculatedMapData.markers);
                                 calculatedMapData  = calcMap(oGraph);
                                 calcAttributes(oGraph);
                                 bubbleCalc();
                                 $mapSlider.slider("value", calculatedMapData.dates.length-1);*/
                                $thisPanel.find('.mashabledata_map-graph-selected, .mashabledata_make-map.ui-button').button('disable');
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
                            if(oGraph.mapsets[0].options.merges){
                                for(i=0;i<selectedRegions.length;i++){
                                    for(j=0;j<oGraph.mapsets[0].options.merges.length;j++){
                                        if(oGraph.mapsets[0].options.merges[j].indexOf(selectedRegions[i])>=0) {
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
                        if(!isEmbedded){
                            $thisPanel.find('button.group').button({icons: {secondary: 'ui-icon-circle-plus'}}).off()
                                .click(function(){
                                    if(mergablity.newMerge){
                                        if(!oGraph.mapsets[0].options.merges) oGraph.mapsets[0].options.merges = [];
                                        oGraph.mapsets[0].options.merges.push($map.getSelectedRegions());
                                    }
                                    if(mergablity.growable){
                                        var i, j, newMerge = [];
                                        var selectedMarkers = $map.getSelectedMarkers();
                                        var selectedRegions = $map.getSelectedRegions();
                                        //step 1.  remove the existing merges of compound markers
                                        for(i=0;i<selectedMarkers.length;i++){
                                            newMerge = newMerge.concat(selectedMarkers[i].split("+"));
                                            if(selectedMarkers[i].split("+").length>1){
                                                for(j=0;j<oGraph.mapsets[0].options.merges.length;j++){
                                                    if(selectedMarkers[i] == oGraph.mapsets[0].options.merges[j].join("+")){
                                                        oGraph.mapsets[0].options.merges.splice(j, 1);
                                                        break;
                                                    }
                                                }
                                            }
                                        }
                                        //step 2 add merges to which a selected region belongs
                                        for(i=0;i<selectedRegions.length;i++){
                                            for(j=0;j<oGraph.mapsets[0].options.merges.length;j++){
                                                if(oGraph.mapsets[0].options.merges[j].indexOf(selectedRegions[i])>-1){
                                                    newMerge = newMerge.concat(oGraph.mapsets[0].options.merges.splice(j,1)[0]);
                                                    break;
                                                }
                                            }
                                        }
                                        //step 3 add in new regions
                                        for(i=0;i<selectedRegions.length;i++){
                                            if(newMerge.indexOf(selectedRegions[i])==-1) newMerge.push(selectedRegions[i]);
                                        }
                                        oGraph.mapsets[0].options.merges.push(newMerge);
                                    }
                                    $map.removeAllMarkers();
                                    $map.clearSelectedRegions();
                                    bubbleCalc();
                                    positionBubbles();

                                    $map.series.markers[0].setAttributes(getMapDataByContainingDate(calculatedMapData.markerAttr.r, calculatedMapData.dates[val].s));
                                    $map.series.markers[2].setAttributes(getMapDataByContainingDate(calculatedMapData.markerAttr.stroke, calculatedMapData.dates[val].s));

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
                                            for(j=0;j<oGraph.mapsets[0].options.merges.length;j++){
                                                if(selectedMarkers[i] == oGraph.mapsets[0].options.merges[j].join("+")){
                                                    oGraph.mapsets[0].options.merges.splice(j, 1);
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                    for(i=0;i<selectedRegions.length;i++){
                                        for(j=0;j<oGraph.mapsets[0].options.merges.length;j++){
                                            pos = oGraph.mapsets[0].options.merges[j].indexOf(selectedRegions[i]);
                                            if(pos != -1){
                                                oGraph.mapsets[0].options.merges[j].splice(pos, 1);
                                                if(oGraph.mapsets[0].options.merges[j].length==0){
                                                    oGraph.mapsets[0].options.merges.splice(j,1);
                                                }
                                                break;
                                            }
                                        }
                                    }
                                    $map.removeAllMarkers();
                                    $map.clearSelectedRegions();
                                    bubbleCalc();
                                    positionBubbles();
                                    $map.series.markers[0].setAttributes(getMapDataByContainingDate(calculatedMapData.markerAttr.r, calculatedMapData.dates[val].s));
                                    $map.series.markers[2].setAttributes(getMapDataByContainingDate(calculatedMapData.markerAttr.stroke, calculatedMapData.dates[val].s));
                                    $map.series.regions[0].setAttributes(calculatedMapData.regionsColorsForBubbles);
                                    makeDirty();
                                });
                        }

                        var gLegend;
                        if(oGraph.mapconfig.showLegend) gLegend = makeLegend($map);
                        $thisPanel.find('.mashabledata_legend').change(function(){
                            oGraph.mapconfig.showLegend = ($(this).prop('checked'));
                            makeDirty();
                            if(oGraph.mapconfig.showLegend) {
                                gLegend = makeLegend($map);
                            } else {
                                gLegend.remove();
                            }
                        });

                        $thisPanel.find('input.mashabledata_map-list').change(function(){
                            oGraph.mapconfig.showList = ($(this).prop('checked'));
                            makeDirty();
                            if(oGraph.mapconfig.showList) {
                                makeList($map);
                            } else {
                                $thisPanel.find('div.mashabledata_map-list').remove();
                            }
                        });
                        if(oGraph.mapconfig.showList) makeList($map);
                        console.timeEnd('buildGraphPanel:mapControls');
                    }

                    function makeList(map){
                        var list = [], id, units, attr;
                        if($thisPanel.find('div.mashabledata_map-list').length==0){
                            $thisPanel.find('div.jvectormap-container')
                                .prepend('<div class="mashabledata_map-list">'
                                    + '<div class="order">'
                                    + '<input type="radio" id="'+panelId+'-map-list-order-asc" name="'+panelId+'-map-list-order" value="asc" '+(oGraph.mapconfig.listOrder!='desc'?'checked':'')+'><label for="'+panelId+'-map-list-order-asc">ascending</label>'
                                    + '<input type="radio" id="'+panelId+'-map-list-order-desc" name="'+panelId+'-map-list-order" value="desc" '+(oGraph.mapconfig.listOrder=='desc'?'checked':'')+'><label for="'+panelId+'-map-list-order-desc">descending</label>'
                                    + '</div>'
                                    + (isEmbedded?'':'<button class="download-map-list">download list to Excel</button>')
                                    + '</div>')
                                .find('div.mashabledata_map-list .download-map-list')
                                .button({icons: {secondary: "ui-icon-calculator"}}).click(function(){
                                    var table = $thisPanel.find('div.mashabledata_map-list table').get(0);
                                    var grid = [];
                                    for(var r=0;r<table.rows.length;r++){ //header row = rank; plot name; plot units
                                        grid.push([table.rows[r].cells[0].innerHTML.replace('<br>',''), table.rows[r].cells[1].innerHTML, table.rows[r].cells[2].innerHTML]);
                                    }
                                    downloadMadeFile({   //does the highcharts trick to download an Excel file
                                        filename: oGraph.title,
                                        data: JSON.stringify([{name: 'ranked list', grid: grid}]),
                                        url: 'excel.php'  //page of server that use PHPExcel library to create a workbook
                                    });
                                })
                                .end().find('div.mashabledata_map-list div.order').buttonset()
                                .find('input:radio').click(function(){
                                    oGraph.mapconfig.listOrder = $(this).val();
                                    makeList($map);
                                }
                            );
                        }
                        if(oGraph.mapsets){
                            units = calculatedMapData.mapUnits;
                            var regionData = getMapDataByContainingDate(calculatedMapData.regionData, calculatedMapData.dates[val].s);
                            for(id in regionData){
                                if(regionData[id] !== null){
                                    list.push({name: $map.getRegionName(id), value: regionData[id]});
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
                            var markerData = getMapDataByContainingDate(calculatedMapData.markerData, calculatedMapData.dates[val].s);
                            for(id in markerData){
                                if(markerData[id][attr] !== null){
                                    list.push({name: calculatedMapData.markers[id].name, value: markerData[id][attr]});
                                }
                            }
                        }
                        list.sort(function(a,b){return (oGraph.mapconfig.listOrder=='desc'?-1:1)*(b.value - a.value);});


                        var html='<table><thead><th>Rank <br>' + $thisPanel.find('div.mashabledata_map-date').html() + '</th><th>' + calculatedMapData.title + '</th><th>' + units + '</th></thead><tbody>';
                        for(var i=0;i<list.length;i++){
                            html += '<tr><td>'+ (i+1) +'</td><td>'+ list[i].name +'</td><td>'+ list[i].value +'</td></tr>';
                        }
                        html += '</tbody></table>';

                        $thisPanel.find('div.mashabledata_map-list').find('table').remove().end().append(html).show();
                    }
                    function makeLegend(map){
                        var standardRadius=10, textCenterFudge=5, lineHeight=20, spacer=10, markerLegendWidth, regionLegendWidth, regionHeight= 0, markerHeight= 0, y=0, i, yOffset, xOffset, MAX_MARKER_LABEL_LENGTH = 20;

                        if(oGraph.mapsets && !isBubble()){
                            if(oGraph.mapsets[0].options.scale == 'discrete'){
                                regionLegendWidth=185;
                                regionHeight = lineHeight + 2*spacer + oGraph.mapsets[0].options.discreteColors.length*(spacer+20);
                            } else {
                                regionLegendWidth=100;
                                if(oGraph.calculatedMapData.regionMin<0 && oGraph.calculatedMapData.regionMax>0) { //spans?
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
                        if(oGraph.pointsets || isBubble()) {
                            markerLegendWidth=185;
                            if(areaCount>1 && fillCount==0){
                                markerHeight += (areaCount)*(spacer+2*standardRadius)+(markerHeight==0?spacer:0);
                            }
                            if(areaCount>0 || isBubble()){
                                var maxRadius = parseInt(oGraph.mapconfig.maxRadius)||DEFAULT_RADIUS_SCALE;
                                var smallRadius = +maxRadius/Math.sqrt(10);
                                markerHeight += 2*(spacer + Math.max(maxRadius,15) + smallRadius) + (markerHeight==0?spacer:0);
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

                        if(oGraph.pointsets||isBubble()){
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
                            if(areaCount>0||isBubble()){
                                //RADIUS SCALING
                                y += spacer+(smallRadius||5);
                                var MarkerSizeAttributes = {
                                    'fill-opacity': 0,
                                    opacity: 1,
                                    stroke: 'black',
                                    'stroke-width': 1
                                };
                                hcr.circle(xOffset + spacer + maxRadius, yOffset + y, smallRadius).attr(MarkerSizeAttributes).add();
                                hcr.text(formatRationalize((oGraph.calculatedMapData.radiusScale||oGraph.calculatedMapData.markerDataMax)/10), xOffset + 2*(maxRadius+spacer), yOffset + y).css({fontSize: '12px'}).add();
                                y+= (smallRadius||5) + spacer + maxRadius;

                                hcr.circle(xOffset + spacer + maxRadius, yOffset + y, maxRadius).attr(MarkerSizeAttributes).add();
                                hcr.text(formatRationalize(oGraph.calculatedMapData.radiusScale||oGraph.calculatedMapData.markerDataMax), xOffset + 2*(maxRadius+spacer), yOffset + y).css({fontSize: '12px'}).add();

                                hcr.text(oGraph.calculatedMapData.radiusUnits, xOffset + 2*(maxRadius+spacer), yOffset + y + 2*spacer).css({fontSize: '12px'}).add();
                            }
                        }
                        if(oGraph.mapsets && !isBubble()){
                            hcr.text(oGraph.mapsets[0].units().substr(0,25), xOffset+spacer, yOffset  + lineHeight + textCenterFudge).css({fontSize: '12px'}).add();
                            if(oGraph.mapsets[0].options.scale!='discrete' && oGraph.mapsets[0].options.logMode == 'on') hcr.text('logarymic scale', xOffset+spacer, yOffset  + 2*lineHeight).css({fontSize: '12px'}).add();

                            if(oGraph.mapsets[0].options.scale == 'discrete'){
                                for(i=0;i<oGraph.mapsets[0].options.discreteColors.length;i++){
                                    y = spacer + (oGraph.mapsets[0].options.discreteColors.length-i)*(spacer+20);
                                    hcr.rect(xOffset + markerLegendWidth + spacer, yOffset + y, lineHeight, lineHeight, 0).attr({
                                        fill: oGraph.mapsets[0].options.discreteColors[i].color,
                                        opacity: 1,
                                        stroke: 'black',
                                        'stroke-width': 1
                                    }).add();
                                    hcr.text((i==oGraph.mapsets[0].options.discreteColors.length-1?'&gt; ':' ')+oGraph.mapsets[0].options.discreteColors[i].cutoff, xOffset + markerLegendWidth + spacer + lineHeight + spacer, yOffset + y +lineHeight/2+textCenterFudge).css({fontSize: '12px'}).add();
                                }
                            } else {
                                //y = spacer;
                                y += 2*lineHeight;
                                hcr.text(formatRationalize(oGraph.calculatedMapData.regionMax), xOffset + markerLegendWidth + spacer, yOffset + y+lineHeight/2+textCenterFudge).css({fontSize: '12px'}).add();
                                y += lineHeight + spacer;


                                if(oGraph.calculatedMapData.regionMax>0){
                                    gradient(xOffset + markerLegendWidth + spacer, yOffset + y, oGraph.mapsets[0].options.posColor||MAP_COLORS.POS, MAP_COLORS.MID);
                                    y += 80 + spacer;
                                    if(oGraph.calculatedMapData.regionMin<0){
                                        hcr.text('0', xOffset + markerLegendWidth + spacer, yOffset + y+lineHeight/2+textCenterFudge).css({fontSize: '12px'}).add();
                                        y += lineHeight + spacer;
                                    }
                                }
                                if(oGraph.calculatedMapData.regionMin<0){
                                    gradient(xOffset + markerLegendWidth + spacer, yOffset + y, MAP_COLORS.MID, oGraph.mapsets[0].options.negColor||MAP_COLORS.NEG);
                                    y += 80 + spacer;
                                }
                                hcr.text(formatRationalize(oGraph.calculatedMapData.regionMin), xOffset + markerLegendWidth + spacer, yOffset + y+lineHeight/2+textCenterFudge).css({fontSize: '12px'}).add();
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
                            if(oGraph.mapsets[0].options.merges){
                                for(i=0;i<oGraph.mapsets[0].options.merges.length;i++){
                                    merge = oGraph.mapsets[0].options.merges[i];
                                    mergeCode = merge.join('+');
                                    markerTitle = calculatedMapData.title + ' for ' + mergeCode ;
                                    calculatedMapData.markers[mergeCode] = {name: mergeCode, point: pnt, style: {fill: 'pink'}};
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
                                if(allMergedRegions.indexOf(region) == -1 && typeof calculatedMapData.regionData[calculatedMapData.dates[0].s][region]!='undefined'){  //this region is not part of a amerge and also has data
                                    //markerTitle = calculatedMapData.title + ' ' + region;
                                    calculatedMapData.markers[region] = {name: region, point: pnt, style: {fill: 'pink'}};
                                    calculatedMapData.regionsColorsForBubbles[region] = globals.MAP_COLORS.MID; //don't color the unmerged regions! Was: regionColors[i++%regionColors.length];
                                    for(d=calculatedMapData.startDateIndex;d<=calculatedMapData.endDateIndex;d++){
                                        dateKey = calculatedMapData.dates[d].s;
                                        markerData[dateKey][region] = {r: calculatedMapData.regionData[dateKey][region]};
                                        if(markerData[dateKey][region].r!==null && !isNaN(markerData[dateKey][region].r)){ //Math object methods treat nulls as zero
                                            calculatedMapData.markerDataMin = Math.min(calculatedMapData.markerDataMin, markerData[dateKey][region].r);
                                            calculatedMapData.markerDataMax = Math.max(calculatedMapData.markerDataMax, markerData[dateKey][region].r);
                                        }
                                    }
                                }
                            }
                            //2.  go back and create attribute (.r and .stroke) objects
                            var rScale = (oGraph.mapconfig.maxRadius || DEFAULT_RADIUS_SCALE) / Math.sqrt(Math.max(Math.abs(calculatedMapData.markerDataMax), Math.abs(calculatedMapData.markerDataMin)));
                            for(dateKey in markerData){
                                for(markerId in markerData[dateKey]){
                                    rData = markerData[dateKey][markerId].r || null;
                                    markerAttr.r[dateKey][markerId] = rScale *  Math.sqrt(Math.abs(rData));
                                    markerAttr.stroke[dateKey][markerId] = rData<0?'#ff0000':'#000000'; //create the style object with the stroke = RED for neg numbers
                                }
                            }

                            calculatedMapData.markerData = markerData;  //set (or replace if user is adding and removing merges)
                            calculatedMapData.markerAttr = markerAttr;
                            calculatedMapData.radiusUnits = calculatedMapData.mapUnits; //for marker label routine
                        }
                    }

                    function geometricCenter(regions){
                        var bBox, totalArea=0, xArm=0, yArm=0, center, regCenter, latLon;
                        for(var i=0;i<regions.length;i++){  //iterate through the list
                            latLon=null;
                            $.each(oGraph.mapsets[0].components, function(c, comp){
                                if(oGraph.assets[comp.handle()].data[regions[i]]&&comp.handle[0]=='M'&&oGraph.assets[comp.handle()].data[regions[i]].latLon){
                                    latLon = oGraph.assets[comp.handle()].data[regions[i]].latLon.split(',');
                                }
                            });
                            bBox = $g.find('path[data-code='+regions[i]+']').get(0).getBBox();
                            if(latLon){
                                regCenter = $map.latLngToPoint(latLon[0],latLon[1]);
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

                    function positionBubbles(){  //must be called after map creation in order to get x-y coordinates of SVG boundingBoxes and to use jvMap's pointToLatLng method
                        var center, latLng;
                        if(isBubble()){
                            var region, i=0, j, allMergedRegions = [];
                            if(oGraph.mapsets[0].options.merges){
                                for(i=0;i<oGraph.mapsets[0].options.merges.length;i++){
                                    center = geometricCenter(oGraph.mapsets[0].options.merges[i]);
                                    latLng = $map.pointToLatLng(center.x, center.y);
                                    calculatedMapData.markers[oGraph.mapsets[0].options.merges[i].join('+')].latLng = [latLng.lat, latLng.lng];
                                    allMergedRegions = allMergedRegions.concat(oGraph.mapsets[0].options.merges[i]);
                                }
                            }
                            $g.find('path[data-code]').each(function(){
                                region  = $(this).attr('data-code');
                                if(allMergedRegions.indexOf(region) == -1 && typeof calculatedMapData.regionData[calculatedMapData.dates[0].s][region]!='undefined'){  //this region is not part of a merge and also has data
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
                    return  oGraph.mapsets && oGraph.mapsets[0].options.mode && oGraph.mapsets[0].options.mode=='bubble';
                }
                console.timeEnd('buildGraphPanel: '+panelId);
                if(!isEmbedded){
                    unmask();
                    setPanelHash(oGraph.ghash, $thisPanel.get(0).id);
                }

                function calcMap(graph){
                    //vars that will make up the return object
                    var mapTitle, mapFreq, mapUnits, mapDates={}, aMapDates=[], markers={}, dateKey;
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
                        var mapset = graph.mapsets[0];
                        var formula = mapset.calculateFormula(); //make a fresh the formula obj
                        expression = 'return ' + mapset.calculatedFormula.formula.replace(patVariable,'values.$1') + ';';
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
                                        geos[geo]=true;
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

                        //3.create slickgrid objects for REGIONS
                        //create a list of geographies sort by name
                        if(!isEmbedded){
                            var regionColumns = [{id: 'date', width: 100, field: 'date', name:'name:<br>location:<br>units:<br>source:<br>notes:<br>formula:', cssClass: 'grid-date-column'}]; //initialize with left most dat col
                            var regionRows = []; //initialize empty grid
                            var hasCalc = (mapset.calculatedFormula.formula != 'A'); //used to skip calculated column when plot = component
                            sortedGeoList.sort(function(a,b){return (a.name> b.name);}); //added to main calc routine to assist in ordering columns
                            var id, asset, row, firstDateKey = true, jsDateTime, mapsetName = mapset.name(), mapsetUnits = mapset.units();
                            for(dateKey in regionData){  //loop through the date (note:  order not guaranteed > regionRows.sort after loop)
                                //add row (pointsets will need to check if row exists first / create now row with '' values to square it up)
                                jsDateTime = dateFromMdDate(dateKey).getTime();
                                row = {"order": jsDateTime, "date": formatDateByPeriod(jsDateTime, graph.assets[components[0].handle()].freq)}; //TODO: handle down-shifted period
                                for(i=0;i<sortedGeoList.length;i++){ //first each date row, loop through geos
                                    for(j=0;j<compSymbols.length;j++){  //for each geo, loop through components
                                        geo = sortedGeoList[i].geo;
                                        id = compSymbols[j]+'_'+i;
                                        asset = graph.assets[components[j].handle()];
                                        //add columns on first date key loop through
                                        if(firstDateKey) regionColumns.push({id: id, field: id, name:'<b>'+((asset.maps&&asset.data[geo])?asset.data[geo].name:asset.name)+'</b><br>'+((asset.maps&&asset.data[geo])?asset.data[geo].geoname:asset.geoname||'')+'<br>'+asset.units+'<br>'+asset.src+'<br>'+((asset.maps&&asset.data[geo])?asset.data[geo].notes:asset.notes||'not available')+(hasCalc?'<br>component '+compSymbols[j]:''), cssClass: 'grid-series-column'});
                                        if(components[j].handle[0]=='M'){
                                            row[id] = oComponentData[dateKey][compSymbols[j]][geo];
                                        } else {
                                            row[id] = oComponentData[dateKey][compSymbols[j]];
                                        }
                                        if(typeof row[id] == 'undefined') row[id] = '-';
                                    }
                                    if(hasCalc){  //special
                                        if(firstDateKey) regionColumns.push({id: geo, field: geo, name: '<b>' + mapsetName + ': '+ sortedGeoList[i].name + '</b><br>'+mapsetUnits+'<br><br>'+(hasCalc?'<br>value = '+mapset.calculatedFormula.formula:''), cssClass: 'grid-calculated-column'});
                                        row[geo] = typeof regionData[dateKey][geo] == 'undefined'?'-':regionData[dateKey][geo];
                                    }
                                }
                                regionRows.push(row);
                                firstDateKey = false;  //used to detect first pass through = build the columns array
                            }
                            regionRows.sort(function(a,b){return b.order - a.order});  //guarentee order
                        }
                    }

                    var fillUnits, radiusUnits;
                    if(graph.pointsets){
                        //4. create the date tree by date for pointsets
                        var latlon, latlons={}, Xdata;
                        var index = 0, pointset, cmp, k;

                        //all pointsets in single grid
                        var markerColumns = [{id: 'date', field: 'date', name:'name:<br>location:<br>units:<br>source:<br>notes:<br>formula:', cssClass: 'grid-date-column'}]; //initialize with left most dat col
                        var markerRows = [];

                        for(i=0;i<graph.pointsets.length;i++){ //assemble the coordinates and colors for multiple mapsets
                            var sortedLatlonList = [];
                            pointset = graph.pointsets[i];
                            if(!pointset.options.color) pointset.options.color = nextColor(graph.pointsets);
                            pointset.formula(pointset);
                            expression = 'return ' + pointset.calculatedFormula.formula.replace(patVariable,'values.$1') + ';';
                            var pointsetCompute = new Function('values', expression);
                            //A. rearrange series data into single object by date keys
                            compSymbols = [];
                            components = pointset.components;
                            oComponentData = {};
                            for(j=0;j<components.length;j++ ){
                                symbol = pointset.compSymbol(j);
                                compSymbols.push(symbol); //calculate once and use as lookup below
                                //TODO: apply any series down-shifting here instead of just parroting series data
                                if(components[j].handle[0]=='X'){
                                    Xdata = graph.assets[components[j].handle()].data; //shortcut
                                    for(latlon in Xdata){
                                        //"markers" object and "latlons" array is common for all pointsets in graph, but "sortedLatlonList" is per pointset
                                        if(!latlons[latlon]){
                                            latlons[latlon] = true;  //latlons will be used later to loop over the points and square up the final set (i.e. add nulls for missing values)
                                            sortedLatlonList.push({latlon: latlon, name: Xdata[latlon].name}); //will be sorted and used to generate the slickgrid columns and rows
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
                                    data = graph.assets[components[j].handle()].data.split('|');
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
                            mapFreq = graph.assets[components[0].handle()].freq; //for now, all components must have same freq, so just check the first component

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
                            //C.  markerColumns and markerRows to drive slick grids in data tab (inside the pointsets loop)
                            if(!isEmbedded){
                                sortedLatlonList.sort(function(a,b){return (a.name> b.name);}); //added to main calc routine to assist in ordering columns
                                var pointsetHasCalc = (pointset.calculatedFormula.formula != 'A'); //used to skip calculated column when plot = component

                                var id, asset, row, firstDateKey = true, jsDateTime, pointsetName = pointset.name(), pointsetUnits = pointset.units();
                                for(dateKey in markerData){  //loop through the date (note:  order not guaranteed > markerRows.sort after loop)
                                    //add row (pointsets will need to check if row exists first / create now row with '' values to square it up)
                                    jsDateTime = dateFromMdDate(dateKey).getTime();
                                    row = {"id": jsDateTime, "date": formatDateByPeriod(jsDateTime, graph.assets[components[0].handle()].freq)}; //TODO: handle down-shifted period
                                    for(var ll=0;ll<sortedLatlonList.length;ll++){ //first each date row, loop through geos
                                        for(j=0;j<compSymbols.length;j++){  //for each latlon, loop through components
                                            latlon = sortedLatlonList[ll].latlon;
                                            id = compSymbols[j]+'_'+ll;
                                            asset = graph.assets[components[j].handle()];

                                            //add columns on first date key loop through
                                            if(firstDateKey) markerColumns.push({
                                                id: id,
                                                field: id,
                                                name:        //  name | location | units | source | notes | formula
                                                    '<b>'+((asset.coordinates&&asset.data[latlon])?asset.data[latlon].name:asset.name) + '</b>'
                                                        + '<br>'+ ((asset.coordinates&&asset.data[latlon])? latlon : asset.geoname||'')
                                                        + '<br>' + asset.units
                                                        + '<br>'+ asset.src
                                                        + '<br>'+((asset.maps&&asset.data[latlon])?asset.data[latlon].notes:asset.notes||'')
                                                        + (hasCalc?'<br>component '+compSymbols[j]:''),
                                                cssClass: 'grid-series-column'});

                                            if(components[j].handle[0]=='X'){
                                                row[id] = oComponentData[dateKey][compSymbols[j]][latlon];
                                            } else {
                                                row[id] = oComponentData[dateKey][compSymbols[j]];
                                            }
                                            if(typeof row[id] == 'undefined') row[id] = '-';
                                        }
                                        if(pointsetHasCalc){  //special
                                            if(firstDateKey) markerColumns.push({id: latlon+'-'+i, field: latlon+'-'+i, name: '<b>' + pointsetName + ': '+ sortedLatlonList[ll].name + '</b><br>'+pointsetUnits+'<br><br>'+(hasCalc?'<br>value = '+pointset.calculatedFormula.formula:''), cssClass: 'grid-calculated-column'});
                                            row[latlon+'-'+i] = typeof markerData[dateKey][latlon] == 'undefined'?'-':markerData[dateKey][latlon];
                                        }
                                    }
                                    for(var found=false, r=0;r<markerRows.length;r++){ //see if date row exists, else add
                                        if(markerRows[r].id == row.id){
                                            $.extend(markerRows[r], row);
                                            found = true;
                                            break;
                                        }
                                    }
                                    if(!found) markerRows.push(row);
                                    firstDateKey = false;  //used to detect first pass through = build the columns array
                                }
                                markerRows.sort(function(a,b){return b.id - a.id});  //guaranteed order because id is the getTime() of the row date
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
                        freq: mapFreq, //string: single freq for maps
                        mapUnits: mapUnits,  //string
                        markers: markers, //{pointid: {name:, style: {fill:}}  radius attribute set in CalcAttibute if
                        markerData: markerData,  //
                        dates: aMapDates,  // [{a: mdDate (string), dt: intval for js UTC date,  regionMin: (optional float), regionMax: (optional float), markerMin; (optional float), markerMax: (optional float)}]
                        regionData: regionData,
                        regionGrid:{columns: regionColumns, data: regionRows},
                        markerGrid:{columns: markerColumns, data: markerRows},
                        fillUnits: fillUnits,
                        radiusUnits: radiusUnits
                    };
                    return graph.calculatedMapData;
                }

                function calcAttributes(graph){
                    var i, y, firstDateKey, dateKey, geo, geos = {}, min, max, calcData = graph.calculatedMapData;

                    //1.  find start and end indexes
                    calcData.regionMin = Number.MAX_VALUE;
                    calcData.regionMax = Number.MIN_VALUE;
                    if(graph.intervals){
                        calcData.startDateIndex = calcData.dates.length-parseInt(graph.intervals);
                        calcData.endDateIndex = calcData.dates.length-1;
                        for(i=calcData.startDateIndex;i<calcData.endDateIndex+1;i++){
                            if(graph.mapsets){
                                calcData.regionMin = Math.min(calcData.dates[i].regionMin, calcData.regionMin);
                                calcData.regionMax = Math.max(calcData.regionMax, calcData.dates[i].regionMax);
                            }
                        }
                    } else {
                        calcData.startDateIndex = calcData.dates.length-1; //set to max
                        calcData.endDateIndex=0; //set end to min and advance in loop below
                        for(i=0;i<calcData.dates.length;i++){
                            if(    (!graph.start || parseInt(graph.start)<=calcData.dates[i].dt.getTime() )
                                && (!graph.end || parseInt(graph.end)>=calcData.dates[i].dt.getTime()) ){
                                if(calcData.startDateIndex>i)calcData.startDateIndex=i;
                                if(calcData.endDateIndex<i)calcData.endDateIndex=i;
                                if(graph.mapsets){
                                    calcData.regionMin = Math.min(calcData.dates[i].regionMin, calcData.regionMin);
                                    calcData.regionMax = Math.max(calcData.regionMax, calcData.dates[i].regionMax);
                                }
                            }
                        }
                    }
                    var rgb, continuous, spans, mapOptions;
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
                                pos: makeRGB(mapOptions.posColor||MAP_COLORS.POS),
                                neg: makeRGB(mapOptions.negColor||MAP_COLORS.NEG),
                                mid: makeRGB(MAP_COLORS.MID)
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
                        for(i=calcData.startDateIndex;i<=calcData.endDateIndex;i++){
                            dateKey = calcData.dates[i].s;
                            calcData.regionColors[dateKey] = {};
                            if(calcData.regionData[dateKey]){
                                for(geo in calcData.regionData[dateKey]){
                                    geos[geo] = true; //used to fill in holes (square up) below
                                    y = calcData.regionData[dateKey][geo];
                                    if(!isNaN(y)&&y!==null){
                                        y=parseFloat(y);
                                        if(continuous){ //CONTINUOUS = relative to min and max data
                                            if(y==0) {
                                                calcData.regionColors[dateKey][geo] = MAP_COLORS.MID;
                                            } else {
                                                calcData.regionColors[dateKey][geo] = colorInRange(y, y<0?min:(spans?0:min), y>0?max:(spans?0:max), y<0?rgb.neg:rgb.posMid, y<0?rgb.negMid:rgb.pos, mapOptions.logMode=='on' && !spans && min!=0 && max!=0);
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
                                    pos: makeRGB(mapOptions.posColor||MAP_COLORS.POS),
                                    neg: makeRGB(mapOptions.negColor||MAP_COLORS.NEG),
                                    posMid: {},
                                    negMid: {},
                                    mid: makeRGB(MAP_COLORS.MID)
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
                                                markerAttr.fill[dateKey][markerId] = colorInRange(fillData, fillData<0?markerFillMin:(spans?0:markerFillMin), fillData>0?markerFillMax:(spans?0:markerFillMax), fillData<0?rgb.neg:rgb.posMid, fillData<0?rgb.negMid:rgb.pos);
                                            } else {
                                                markerAttr.fill[dateKey][markerId] = colorInRange(fillData, fillData<0?markerFillMin:(spans?0:markerFillMin), fillData>0?markerFillMax:(spans?0:markerFillMax), fillData<0?rgb.neg:rgb.mid, fillData<0?rgb.mid :rgb.pos);
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
                                    //markerAttr.fill[dateKey][markerId] = '#0000ff';
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
                    function colorInRange(y, y1, y2, rgb1, rgb2, logScaling){  //y values must be all positive or all negative
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

                function getMapDataByContainingDate(mapData,mdDate){ //tries exact date match and then step back if weekly->monthly->annual or if monthly->annual
                    //this allows mixed-freq mapsets and marker set to be display controlled via the slider
                    while(mdDate.length>=4){
                        if(mapData[mdDate]) return mapData[mdDate];
                        mdDate = mdDate.substr(0,mdDate.length-2);
                    }
                    return false;
                }

            }
        },

        isSummationMap: function isSummationMap(oGraph){
            if(!oGraph.mapsets) return false;  //todo:  pointsets (only mapsets for now)
            if(!oGraph.mapsets[0].options.calculatedFormula) oGraph.mapsets[0].calculateFormula();
            var formula = oGraph.mapsets[0].options.calculatedFormula;
            for(var i=0;i<oGraph.mapsets[0].components.length;i++){
                if(oGraph.mapsets[0].components[i].handle[0]!='M') return false;  //mapsets only (no series)  TODO:  allow series multipliers/dividers
            }
            return (/[-+]/.test(formula.numFormula) && !/[*/]/.test(formula.numFormula));  //no division or multiplication TODO:  allow series multipliers/dividers
        },

        visiblePanelId: function visiblePanelId(){  //uniform way of getting ID of active panel for user events
            var visPan = $('div.graph-panel:visible');
            if(visPan.length==1){
                return visPan.get(0).id;
            } else {
                return null;
            }
        },

        formatDateByPeriod: function formatDateByPeriod(val, period) { //helper function for the data tables
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
        setCropSlider = grapher.setCropSlider,
        dateFromMdDate = grapher.dateFromMdDate,
        closestDate = grapher.closestDate,
        assetNeeded = grapher.assetNeeded,
        getAssets = grapher.getAssets,
        fetchAssets = grapher.fetchAssets,
        createMyGraph = grapher.createMyGraph,
        makeChartOptionsObject = grapher.makeChartOptionsObject,
        buildGraphPanel = grapher.buildGraphPanel,
        isSummationMap = grapher.isSummationMap,
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
                    'transitionIn'		: 'none',
                    'transitionOut'		: 'none',
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
            }
            this.changeCancel();
        },
        changeCancel: function(){
            $.fancybox.close();
            this.callBack = false;
        }
    };

    return grapher;  //return the graph functions object which will be accessable as MashableData.graph

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
        })
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
        var order =  Math.floor(Math.log(Math.abs(value))/Math.LN10);
        var y  = Math.round(value / Math.pow(10,order-2)) * Math.pow(10,order-2);
        return common.numberFormat(y, (order>1?0:2-order))
    }

    function vizualizeCube(graph, geoKey, mapDate, action){
        if(typeof action == 'undefined') action = 'new';
        var serie, i, j, k, cubeid = graph.cubeid;
        if(!graph.assets.cube) graph.assets.cube = {};
        var cube = graph.assets.cube;
        if(!cube['G'+geoKey]){
            var $cubViz = graph.controls.$thisPanel.find('div.mashabledata_cube-viz');
            $cubViz.mask('loading...');
            callApi(
                {command:"GetCubeSeries", ghash: graph.ghash||'', cubeid: cubeid, geokey: geoKey, modal:'none'},  //geoKey can be a "lat,lon" or the jVectorMaps code (requiring a lookup) or a geoid
                function(jsoData, textStatus, jqXHR){
                    cube['G'+geoKey] = {series: jsoData.series};
                    cube.dimensions = jsoData.dimensions;
                    cube.theme = jsoData.theme;
                    cube.name = jsoData.name;
                    cube.units = jsoData.units;
                    $cubViz.unmask();
                    makeCubeChart();
                }
            );
        } else {
            makeCubeChart();
        }
        function makeCubeChart(){
            //1. detect order
            var dimensions = cube.dimensions;
            var n = dimensions.length;

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
            var cubeData = cube['G'+geoKey];
            if(cubeData.series){
                var cubeSeries = cubeData.series;
                cubeData.facetedData = [];
                function makeFacetedData(d, facetArray, facetsItem){
                    var i, newFactetsItem;
                    for(i=0;i<dimensions[d].list.length;i++){
                        if(d==n-1){
                            newFactetsItem = facetsItem.slice();
                            newFactetsItem.push(dimensions[d].list[i]);
                            facetArray.push(getCubeSeries(newFactetsItem));
                        } else {
                            var facetSubArray = [];
                            facetArray.push(facetSubArray);
                            newFactetsItem = facetsItem.slice();
                            newFactetsItem.push(dimensions[d].list[i]);
                            makeFacetedData(d+1, facetSubArray, newFactetsItem);
                        }
                    }
                    function getCubeSeries(facetsItem){
                        var s, match, serie;
                        for(s=0;s<cubeSeries.length;s++){
                            match = true;
                            serie = cubeSeries[s];
                            for(var d=0;d<n;d++){
                                if(serie.name.toLowerCase().indexOf(' '+facetsItem[d].name.toLowerCase())===-1){ //start of word; requires space
                                    match = false;
                                    break;
                                }
                            }
                            if(match){
                                cubeSeries.splice(s,1);
                                return serie.data;
                            }
                        }
                        return null;
                    }
                }
                makeFacetedData(0, cubeData.facetedData, []); //fills cubeFacets
                delete cubeData.series;
            }

            //3. make chart base chart object
            var vizChart = {
                chart: {
                    type: 'bar',
                    spacingRight: 50,
                    renderTo: graph.controls.$thisPanel.find('.mashabledata_cube-viz')[0]
                },
                title: {
                    text: cube.theme+'<br>'+(geoName||''),
                    style: {fontSize: '12px'}
                    //text: (graph.assets.cube.theme||'')  + (graph.assets.cube.name?' by '+graph.assets.cube.name:'') + ' for ' + geoName
                },
                subtitle: {
                    text: 'click on map to select location',
                    style: {fontSize: '10px'},
                    y: (geoName?50:30)
                },
                plotOptions: {
                    bar: {
                        dataLabels: {
                            enabled: false,
                            align: 'left'
                        },
                        borderWidth: 0,
                        animation: false,
                        stacking: null
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
                        text: cube.units||''
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
                    text: "created with MashableData.com"
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
                    formatter: function(){
                        return '<b>'+ cube.theme + '</b><br/>' + this.point.name +':<br/>'
                            + common.numberFormat(Math.abs(this.point.y), 0) + ' ' + cube.units;
                    }
                }
            };
            var facetedData = cubeData.facetedData;
            //4. switch on dimension order n for 3 different routines:  fill chart objects series from faceted
            var point, varData;
            switch(n){
                case 1:
                    barData = [];
                    for(i=0;i<dimensions[0].list.length;i++){
                        point = {
                            y:  seriesValue(facetedData[i], mapDate),
                            name: dimensions[0].list[i].name
                        };
                        if(dimensions[0].list[i].color) point.color = dimensions[0].list[i].color;
                        barData.push(point);
                        vizChart.xAxis.categories.push(dimensions[0].list[i].short||dimensions[0].list[i].name);
                    }
                    //vizChart.legend = {enabled: false};
                    vizChart.series.push({
                        id: geoKey,
                        name: geoName,
                        data: barData,
                        showInLegend: false
                    });
                    vizChart.plotOptions.bar.dataLabels.enabled = true;
                    break;
                case 2:
                    for(i=0;i<dimensions[0].list.length;i++){
                        barData = [];
                        for(j=0;j<dimensions[1].list.length;j++){
                            if(i==0) vizChart.xAxis.categories.push(dimensions[1].list[j].short||dimensions[1].list[j].name);
                            point = {
                                y:  seriesValue(facetedData[i][j], mapDate),
                                name: dimensions[0].list[i].name + '<br>and ' + dimensions[1].list[j].name
                            };
                            barData.push(point);
                        }
                        serie = {
                            name: dimensions[0].list[i].name,
                            data: barData
                        };
                        if(dimensions[0].list[i].color) serie.color = dimensions[0].list[i].color;
                        vizChart.series.push(serie);
                        vizChart.plotOptions.bar.stacking = 'normal';
                    }
                    break;
                case 3:  //only 3-cube is demographics: sex x age x race
                    for(i=0;i<dimensions[0].list.length;i++){
                        for(k=0;k<dimensions[2].list.length;k++){
                            barData = [];
                            for(j=0;j<dimensions[1].list.length;j++){
                                if(i==0&&k==0) vizChart.xAxis.categories.push(dimensions[1].list[j].short||dimensions[1].list[j].name);
                                point = {
                                    y: (i==0?-1:1) * seriesValue(facetedData[i][j][k], mapDate),
                                    name: dimensions[0].list[i].name + '<br>and ' + dimensions[1].list[j].name + '<br>and ' + dimensions[2].list[k].name
                                };
                                barData.push(point);
                            }
                            serie = {
                                name: dimensions[2].list[k].name,
                                data: barData
                            };
                            if(dimensions[2].list[k].color) serie.color = dimensions[2].list[k].color;
                            vizChart.series.push(serie);
                        }
                    }
                    vizChart.legend.enabled = false;  //todo:  have only have the series show
                    vizChart.plotOptions.bar.stacking = 'normal';
                    vizChart.xAxis.lineWidth = 0;
                    break;
            }
            switch(action){
                case 'add':
                    vizChart.series[0].showInLegend = true;
                    graph.controls.vizChart.addSeries(vizChart.series[0]);
                    break;
                case 'remove':
                    graph.controls.vizChart.get(geoKey).remove(false);   //avoids redraw for each series removed, but requires a redarw call in main after all have been removed
                    break;
                case 'summation':
                    vizChart.series[0].pointWidth=1;
                    vizChart.series[0].pointPadding=0;
                    vizChart.plotOptions.bar.groupPadding=0;
                default:  //'new'
                    if(graph.controls.vizChart) graph.controls.vizChart.destroy();
                    graph.controls.vizChart = new Highcharts.Chart(vizChart);

            }
        }
    }

    function seriesValue(mdData, mdDate){
        if(!mdData) return null;
        var point, data = mdData.split('|');
        for(var i=0;i<data.length;i++){
            point = data[i].split(':');
            if(point[0]==mdDate) {
                if(point[1]=='null') return null; else return parseFloat(point[1]);
            }
        }
        return null
    }
}();
