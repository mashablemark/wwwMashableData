/**
 * Created with JetBrains PhpStorm.
 * User: mark__000
 * Date: 2/14/13
 * Time: 11:30 PM
 * To change this template use File | Settings | File Templates.
 */

MashableData.Annotator = function Annotator(panelId, makeDirty){
    var MD = MashableData, globals = MD.globals, common = MD.common;
    var BAND_TRANSPARENCY = globals.BAND_TRANSPARENCY;
    var panelGraphs = globals.panelGraphs;
    var equivalentRGBA = common.equivalentRGBA;
    var period = globals.period;
    var controller  = {
        panelId: panelId,
        bandNo: 0,
        lineNo: 0,
        banding: false,
        bandStartPoint: void(0),
        makeDirty: makeDirty,
        callApi: MD.common.callApi,
        addStandard: function addStandard(annoid){
            var self = this;
            self.callApi({command: "GetAnnotation", annoid: annoid}, function(data){
                standardAnno = jQuery.parseJSON(data.annotation);
                for(var i=0;i<standardAnno.length;i++){
                    panelGraphs[panelId].annotations.push(standardAnno[i]);
                }
                self.build( 'new');
            });
        },
        fetchStandards: function(){
            if(globals.standardAnnotations.length==0){  //standardAnnotations is global scope, so the fetch only ever occurs once
                var self = this;
                this.callApi({command: "GetAnnotations"}, function(results){
                    for(var i=0;i<results.annotations.length;i++) globals.standardAnnotations.push(results.annotations[i]);
                });
            }
        },
        sync: function annoSync(){  //sync plot lines and bands to options.  must be done prior to printing or exporting
            var thisChart = panelGraphs[this.panelId].controls.chart;
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
        },
        addPoint: function annotatePoint(selectedPoint){
            var oGraph = panelGraphs[panelId];
            if(typeof(selectedPoint) != "undefined"){
                //remove all current point annotations
                var point;
                for(var i=0;i<oGraph.annotations.length;i++){
                    if(oGraph.annotations[i].type=='point'){
                        point = oGraph.controls.chart.get(oGraph.annotations[i].id);
                        if(point){point.update([point.x, point.y], false)}
                        delete oGraph.annotations[i].id
                    }
                }
                //add annotation to oGraph object
                oGraph.annotations.push({
                    type:	'point',
                    text: 	'',
                    id: null, //gets reordered and set in AnnotationController.build()
                    series: selectedPoint.series.options.id,
                    color: 	'#000000',
                    from: 	MD.grapher.formatDateByPeriod(selectedPoint.x,selectedPoint.series.options.freq)
                });
                // redraw the point annotations in order and entire annotations table
                this.build('point');
            }
        },
        addXLine:  function annotateXLine(selectedPoint){
            var oGraph = panelGraphs[panelId];
            oGraph.controls.chart.xAxis[0].addPlotLine({
                value:  selectedPoint.x,
                color:  '#'+colorsPlotBands[0],
                id: 'xl' + this.lineNo,
                width: 2,
                label: {text: ' ', y: 0, zIndex: 3}
            });
            oGraph.annotations.push({
                type:	'line',
                text: 	'',
                id: 'xl' + this.lineNo,
                color: 	colorsPlotBands[0],
                from: 	MD.grapher.formatDateByPeriod(selectedPoint.x,selectedPoint.series.options.freq)
            });
            this.lineNo++;
            this.build('table-only');
        },
        startXBand: function annotateXBandStart(pointSelected){
            var oGraph = panelGraphs[panelId];
            this.bandStartPoint = pointSelected;
            this.bandColor = equivalentRGBA(colorsPlotBands[0], globals.BAND_TRANSPARENCY);
            oGraph.controls.chart.xAxis[0].addPlotBand({
                from:  this.bandStartPoint.x,
                to: this.bandStartPoint.x,
                color: this.bandColor,
                id: 'xb' + this.bandNo,
                label: {text: ' ', y: 0, zIndex: 3}
            });
            this.banding = 'x-Time';
            pointSelected.select(true);
        },
        build: function buildAnnotations( redrawAnnoTypes){
            //adds line, bands, and scatter series
            //CAN POINTS ON EXISTING SERIES BE MODIFIED TO SHOW A MARKER??
            var y, yOffset, self = this, oGraph = panelGraphs[panelId], $thisPanel = oGraph.controls.$thisPanel,
                $annotations = $thisPanel.find('div.annotations').show().find('table');
            if(!globals.isEmbedded && $annotations && $annotations.get(0).rows.length!=0) { //enable on all calls except initial build
                $thisPanel.find('.graph-save').button("enable");
                oGraph.isDirty = true;
            }
            if(!redrawAnnoTypes) redrawAnnoTypes='all';
            // builds and return a fresh annotations table HTML string from oGraph
            var sTable = '';
            var annoLetter = 'A';
            var i, anno, point, annoSeries, annoScatter, fromJS, toJS;
            //make a sorted list of annotations by start date
            oGraph.annotations.sort(function(a,b){
                if(a.type.charAt(0)=='h' && a.type.charAt(0)=='h')return b.from - a.from;
                if(a.type.charAt(0)=='h') return -1;
                if(b.type.charAt(0)=='h') return 1;
                return self.parseDate(a.from) - self.parseDate(b.from)
            });
            for(i=0;i< oGraph.annotations.length;i++){
                console.time('annotation loop');

                anno = oGraph.annotations[i];
                switch(anno.type){
                    case 'point':
                        if(redrawAnnoTypes=='point'||redrawAnnoTypes=='all'){
                            annoSeries = oGraph.controls.chart.get(anno.series);  //anno.series =  'P0', 'P1', 'P2'... = id given to each plot's series in Highcharts
                            if(annoSeries==null){//cut anno out if we can't find it's series
                                oGraph.annotations.splice(i,1);
                                i--;
                                break;
                            }
                            _removeMarker(annoLetter);
                            for(var j=0;j<annoSeries.data.length;j++){
                                if(annoSeries.data[j] ){  //prevent errors on cropped graphs
                                    if(annoSeries.data[j].x == this.parseDate(anno.from)){
                                        point = annoSeries.data[j];  //this is a HC point object
                                        point.update({
                                            x: point.x,
                                            y: point.y,
                                            id: annoLetter,
                                            text: anno.text,
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
                                        }, false);  //do not redraw graph for each annotation = slow; redraw at end
                                    }
                                }
                            }
                            anno.id =  annoLetter;
                        }
                        sTable+='<tr data="' + annoLetter + '"><td align="center"><b>'+annoLetter+'</b></td><td>'+anno.from+'</td><td><input class="anno-text" type="text" value="'+anno.text+'"></td><td><a class="ui-icon ui-icon-trash">delete</a></td></tr>';
                        annoLetter=String.fromCharCode(annoLetter.charCodeAt(0)+1);
                        break;
                    case 'line':
                        fromJS = this.parseDate(anno.from);
                        if(fromJS>=parseInt(oGraph.start||oGraph.firstdt) && fromJS<=parseInt(oGraph.end||oGraph.lastdt)){
                            if(redrawAnnoTypes=='line'||redrawAnnoTypes=='all'||(redrawAnnoTypes=='new'&&!anno.id)){
                                anno.id ='xl' + this.lineNo;
                                this.lineNo++;
                                yOffset = this.labelOffset(oGraph.controls.chart, anno);
                                oGraph.controls.chart.xAxis[0].addPlotLine({
                                    color: anno.color,
                                    value: this.parseDate(anno.from),
                                    id: anno.id,
                                    width: 2,
                                    label: {text: anno.text, y: yOffset, zIndex: 3}
                                });
                            }
                            sTable+='<tr data="' + anno.id + '"><td><input class="annotation-color-picker" type="text" value="' + anno.color + '" /></td><td>'+anno.from+'</td><td><input class="anno-text" type="text" value="'+anno.text+'"></td><td><a class="ui-icon ui-icon-trash">delete</a></td></tr>';
                        }
                        break;
                    case 'hline':
                        if(redrawAnnoTypes=='hline'||redrawAnnoTypes=='all'||(redrawAnnoTypes=='new'&&!anno.id)){
                            anno.id ='hl' + this.lineNo;
                            this.lineNo++;
                            for(y=0;y<oGraph.controls.chart.yAxis.length;y++){
                                if(oGraph.controls.chart.yAxis[y].userOptions.title.text==anno.yAxis){
                                    oGraph.controls.chart.yAxis[y].addPlotLine({
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
                        fromJS = this.parseDate(anno.from);
                        toJS = this.parseDate(anno.to);
                        if((fromJS>=parseInt(oGraph.start||oGraph.firstdt) && fromJS<=parseInt(oGraph.end||oGraph.lastdt)) || (toJS>=parseInt(oGraph.start||oGraph.firstdt) && toJS<=parseInt(oGraph.to||oGraph.lastdt))){
                            if(redrawAnnoTypes=='band'||redrawAnnoTypes=='all'||(redrawAnnoTypes=='new'&&!anno.id)){
                                anno.id ='xb' + this.bandNo++;
                                yOffset = this.labelOffset(oGraph.controls.chart, anno);
                                oGraph.controls.chart.xAxis[0].addPlotBand({
                                    color: equivalentRGBA(anno.color, globals.BAND_TRANSPARENCY),
                                    from: fromJS,
                                    to: toJS,
                                    id: anno.id,
                                    label: {text: anno.text, y: yOffset, zIndex: 3}
                                });
                            }
                            sTable+='<tr data="' + anno.id + '"><td><input class="annotation-color-picker" type="text" value="' + anno.color + '" /></td><td>'+anno.from+'-'+anno.to+'</td><td><input class="anno-text" type="text" value="'+anno.text+'"></td><td><a class="ui-icon ui-icon-trash">delete</a></td></tr>';
                        }
                        break;
                    case 'hband':
                        if(redrawAnnoTypes=='hband'||redrawAnnoTypes=='all'||(redrawAnnoTypes=='new'&&!anno.id)){
                            anno.id ='hb' + this.bandNo++;
                            for(y=0;y<oGraph.controls.chart.yAxis.length;y++){
                                if(oGraph.controls.chart.yAxis[y].userOptions.title.text==anno.yAxis){
                                    oGraph.controls.chart.yAxis[y].addPlotBand({
                                        color: equivalentRGBA(anno.color, globals.BAND_TRANSPARENCY),
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

                console.timeEnd('annotation loop');
            }
            console.time('annotation redraw');
            if(redrawAnnoTypes=='point'||redrawAnnoTypes=='all'){
                console.info('annotations fired chart redraw');
                oGraph.controls.chart.redraw(); //redraw after all have been updated
            }
            console.timeEnd('annotation redraw');
            if(!globals.isEmbedded){
                console.time('annotation rest');
                if(oGraph.annotations.length==0) sTable+='<tr><td colspan="3" class="grey-italics">right-click on the chart to annotate a point, band, or event, or to perform a linear regression or average</td></tr>';
                $annotations.html(sTable).find('input, select').change(function(){self.change(this)});
                $annotations.find('.annotation-color-picker').colorPicker();
                $annotations.find('.ui-icon-trash').click(function(){
                    self['delete'](this)
                });
                console.timeEnd('annotation rest');
            }
        },
        change: function changeAnno(obj){
            var i, yOffset, y, id = $(obj).closest('tr').attr('data');
            panelGraphs[panelId].controls.$thisPanel.find('.graph-save').button('enable');
            var oGraph = panelGraphs[panelId];
            var anno;
            for(i=0;i< oGraph.annotations.length;i++){
                if(id == oGraph.annotations[i].id){
                    anno = oGraph.annotations[i];
                    break;
                }
            }
            anno.text = $(obj).closest('tr').find('input.anno-text').val();
            anno.color = $(obj).closest('tr').find('.annotation-color-picker').val();
            switch(id.substr(0,2)){
                case 'xb':
                    yOffset = this.labelOffset(oGraph.controls.chart, anno);
                    oGraph.controls.chart.xAxis[0].removePlotBand(id);
                    oGraph.controls.chart.xAxis[0].addPlotBand({
                        color: equivalentRGBA(anno.color, globals.BAND_TRANSPARENCY),
                        from: this.parseDate(anno.from),
                        to: this.parseDate(anno.to),
                        id: anno.id,
                        label: {text: anno.text, y: yOffset, zIndex: 3}
                    });
                    break;
                case 'hb':
                    for(i=0;i<oGraph.controls.chart.yAxis.length;i++){
                        if(oGraph.controls.chart.yAxis[i].userOptions.title.text = anno.yAxis){
                            oGraph.controls.chart.yAxis[i].removePlotBand(id);
                            oGraph.controls.chart.yAxis[i].addPlotBand({
                                color: equivalentRGBA(anno.color, globals.BAND_TRANSPARENCY),
                                from: parseFloat(anno.from),
                                to: parseFloat(anno.to),
                                id: anno.id,
                                label: {text: anno.text, zIndex: 3}
                            });
                        }
                    }
                    break;
                case 'hl':
                    for(i=0;i<oGraph.controls.chart.yAxis.length;i++){
                        if(oGraph.controls.chart.yAxis[i].userOptions.title.text = anno.yAxis){
                            oGraph.controls.chart.yAxis[i].removePlotLine(id);
                            oGraph.controls.chart.yAxis[i].addPlotLine({
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
                    yOffset = this.labelOffset(oGraph.controls.chart, anno);
                    oGraph.controls.chart.xAxis[0].removePlotLine(id);
                    oGraph.controls.chart.xAxis[0].addPlotLine({
                        color: anno.color,
                        value: this.parseDate(anno.from),
                        id: anno.id,
                        width: 2,
                        label: {text: anno.text, y: yOffset, zIndex: 3}
                    });
                    break;
                default:
                    var point =  oGraph.controls.chart.get(id);
                    if(point){
                        point.text = anno.text;
                    }
            }
        },
        "delete": function deleteAnno(deleteAnchor){
            var idToDelete = $(deleteAnchor).closest('tr').attr('data');
            var oGraph = panelGraphs[panelId];
            for(var i=0;i< oGraph.annotations.length;i++){
                if(idToDelete == oGraph.annotations[i].id){
                    oGraph.annotations.splice(i,1);
                    break;
                }
            }
            if(idToDelete[1]=='b' || idToDelete[1]=='l'){ //band or line:  simply try to delete for all axis until found
                for(var a=0;a<oGraph.controls.chart.axes.length;a++){
                    oGraph.controls.chart.axes[a].removePlotLine(idToDelete);  //does not error if not found
                    oGraph.controls.chart.axes[a].removePlotBand(idToDelete);
                }
                this.build( "none");
            } else {
                _removeMarker(idToDelete);
                this.build("point");
            }
        },
        startAnalysisBanding: function(point, analysisType){
            var seriesColor = point.series.color;
            var chart = panelGraphs[panelId].controls.chart;
            r = parseInt(seriesColor.substr(1,2),16);
            g = parseInt(seriesColor.substr(3,2),16);
            b = parseInt(seriesColor.substr(5,2),16);
            this.bandColor = 'rgba(' + r +','+  g +','+  b +',0.5)';
            this.banding = analysisType + '-' + point.series.index;
            this.bandStartPoint = point;

            chart.xAxis[0].addPlotBand({
                from:  this.bandStartPoint.x,
                to: point.x,
                color:  this.bandColor,
                id: analysisType + this.bandNo++,
                label:  {text: ' ', y: 0, zIndex: 3}
            })
        },
        deleteAnalysis: function(pointSelected){
            var fromX, toX, i, analyses, plotId = pointSelected.series.options.calculatedFrom;
            var analysisType = pointSelected.series.options.id.substr(0,2);
            if(plotId){
                fromX = pointSelected.series.data[0][0];
                toX = pointSelected.series.data[pointSelected.series.data.length-1][0];
                pointSelected.series.remove();
                switch (analysisType){
                    case 'LR':
                        analyses = panelGraphs[panelId].plots[parseInt(plotId.substr(1))].options.linRegressions;
                        break;
                    case 'AV':
                        analyses = panelGraphs[panelId].plots[parseInt(plotId.substr(1))].options.averages;
                        break;
                }
                this.makeDirty();
                for(i=0;i<analyses.length;i++){
                    if(analyses[i][0]==toX && analyses[i][1]==fromX){
                        analyses.splice(i,1);
                        return true;
                    }
                }
                return false;
            }
        },
        parseDate: function annoDateParse(partialDateString){
            if(partialDateString.length==4){partialDateString = '1 Jan ' + partialDateString + ' UTC'}
            else if(partialDateString.length==8){partialDateString = '1 ' + partialDateString + ' UTC'}
            else {partialDateString += ' UTC'}
            return Date.parse(partialDateString);
        },
        labelOffset: function annotationY(chart, anno){
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
                annoCenter = (this.parseDate(anno.from) + this.parseDate(anno.to))/2;
            } else {
                annoCenter = this.parseDate(anno.from);
            }
            var overlaps = 0, thisCenter;
            for(var i=0;i<plotLinesAndBands.length;i++){
                if(plotLinesAndBands[i].id!="timeLine"){
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
            }
            var y = yStart;
            for(var j=0;j<overlappingAnnos.length;j++){ //make sure there is no existing annotation in this y-space
                if(overlappingAnnos[j].options.label.y == y){
                    y += yInc;
                    j = -1;  //restarts the loops
                }
            }
            return y;
        },
        mouseOverHCPoint: function mouseOverHCPoint(e, point){
            var chart = panelGraphs[panelId].controls.chart;
            if(!this.banding) return;
            if(this.banding=='x-Time'){
                try{
                    chart.xAxis[0].removePlotBand('xb'+this.bandNo);
                }catch(err){}
                chart.xAxis[0].addPlotBand({
                    from:  this.bandStartPoint.x,
                    to: point.x,
                    color: this.bandColor,
                    id: 'xb' + this.bandNo,
                    label:  {text: ' ', y: 0, zIndex: 3}
                });
                return;
            }
            if(this.banding.substr(0,3)=='LR-' || this.banding.substr(0,3)=='AV-'){
                var analysisType = this.banding.substr(0,2);
                try{
                    chart.xAxis[0].removePlotBand(analysisType+this.bandNo);
                }catch(err){}
                this.endingX = MD.grapher.closestDate(point.x, this.bandStartPoint.series.data);
                chart.xAxis[0].addPlotBand({
                    from:  this.bandStartPoint.x,
                    to: this.endingX,
                    color: this.bandColor,
                    id: analysisType + this.bandNo,
                    label:  {text: ' ', y: 0, zIndex: 3}
                });
            }
        },
        endBanding:  function endBanding(e){
            var axisName, axisValue, userValue;
            var pointSelected = this.mouseoverPoint;  //grab reference (set by a HighCharts' event) before point's mouseout event can delete it
            var onPoint = (typeof(this.mouseoverPoint)!="undefined");
            var oGraph = panelGraphs[panelId];
            var self = this;
            if(this.banding=='x-Time'){
                if(onPoint){
                    var x1, x2;
                    x1 = MD.grapher.formatDateByPeriod(this.bandStartPoint.x, this.bandStartPoint.series.options.freq);
                    x2 = MD.grapher.formatDateByPeriod(pointSelected.x, pointSelected.series.options.freq);
                    this.banding = false;  //band was already drawn in the mouseOver event
                    oGraph.annotations.push({
                        type:	'band',
                        text: 	'',
                        id: 'xb' + this.bandNo,
                        color: 	'#'+colorsPlotBands[0],
                        from: 	(x1<x2?x1:x2),
                        to: (x1<x2?x2:x1)
                    });
                    this.build('table-only');  //redraw the annotation table only
                    return false;  //no need to show a menu
                } else { //clicked to end time band, but not over point to provide xValue
                    return {items: {info: {name:"Mouse-over a series before right-clicking to terminate a vertical band.",callback: function(key, opt){ }}}}
                }
            }
            if(this.banding && (this.banding.substr(0,3)=='LR-' || this.banding.substr(0,3)=='AV-')){
                //ending linear regression
                var analysisType = this.banding.substr(0,2);
                oGraph.controls.chart.xAxis[0].removePlotBand(analysisType + this.bandNo);
                var fromX = Math.min(this.bandStartPoint.x, this.endingX);
                var toX = Math.max(this.bandStartPoint.x, this.endingX);
                if(fromX<toX){
                    switch(analysisType){
                        case 'LR':
                            this.plotLinearRegression(oGraph.controls.chart, this.bandStartPoint.series, true, fromX, toX);
                            var plotOptions = oGraph.plots[parseInt(this.bandStartPoint.series.options.id.substr(1))].options;
                            if(!plotOptions.linRegressions) plotOptions.linRegressions= [];
                            plotOptions.linRegressions.push([fromX, toX]);
                            break;
                        case 'AV':
                            this.plotAverage(this.bandStartPoint.series, fromX, toX, true);
                            var plotOptions = oGraph.plots[parseInt(this.bandStartPoint.series.options.id.substr(1))].options;
                            if(!plotOptions.averages) plotOptions.averages = [];
                            plotOptions.averages.push([fromX, toX]);
                            break;
                    }
                    self.makeDirty();
                } else {
                    dialogShow("Error","The starting point and ending points must be different." );
                }
                this.banding = false;
                return;
            } else {
                var top, left, x, y, i, chart = oGraph.controls.chart;
                for(i=0;i<chart.yAxis.length;i++){ //find the yAxis that we are banding
                    axisName = chart.yAxis[i].userOptions.title.text;
                    if(this.banding=='y-'+axisName){
                        top = $(chart.container).offset().top;
                        left = $(chart.container).offset().left;
                        x = (isIE ? e.originalEvent.x : e.clientX - left) - chart.plotLeft;
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
                                            //band was already drawn in the mouseOver event, but need to redraw it up in case user edited terminal value
                                            //do increment bandNo:  this was done at start of banding
                                            for(var i=0;i<chart.yAxis.length;i++){
                                                if(chart.yAxis[i].userOptions.title.text = self.banding.substr(2)){
                                                    chart.yAxis[i].removePlotBand('hb'+self.bandNo);
                                                    var y1, y2;
                                                    y1 = parseFloat(self.bandStartPoint);
                                                    y2 = parseFloat(userValue);
                                                    chart.yAxis[i].removePlotBand('hb'+self.bandNo);
                                                    chart.yAxis[i].addPlotBand({
                                                        id: 'hb'+self.bandNo,
                                                        color: equivalentRGBA(colorsPlotBands[0], globals.BAND_TRANSPARENCY),
                                                        from: Math.min(y1,y2),
                                                        to: Math.max(y1,y2),
                                                        label: {text: '', zIndex: 3}
                                                    });
                                                    oGraph.annotations.push({
                                                        id: 'hb' + self.bandNo,
                                                        type:	'hband',
                                                        yAxis: axisName,
                                                        text: 	'',
                                                        color: 	'#'+colorsPlotBands[0],
                                                        from: 	Math.min(self.bandStartPoint,userValue),
                                                        to: Math.max(self.bandStartPoint,userValue)
                                                    });
                                                    self.build('table-only');  //redraw the annotation table only
                                                    self.banding = false;
                                                    self.makeDirty();
                                                    break;
                                                }
                                            }
                                        }
                                    },
                                    cancel: {
                                        name: '<button>cancel</button>',
                                        callback: function(key, opt){
                                            for(i=0;i<chart.yAxis.length;i++){
                                                chart.yAxis[i].removePlotBand('hb'+self.bandNo);
                                                self.banding = false;
                                            }
                                        }
                                    }
                                }
                            };
                        } else {
                            return false;
                        }
                    }
                }
            }
        },
        plotAnnotationSeries: function(){
            var p, i, LR, AV;
            var oGraph = panelGraphs[panelId];
            var chart = oGraph.controls.chart;
            var start = oGraph.start||(oGraph.intervals?MD.grapher.intervalStartDt(oGraph):oGraph.firstdt);
            if(oGraph.plots && oGraph.plots.length>0){
                for(p=0;p<oGraph.plots.length;p++){
                    if(oGraph.plots[p].options.linRegressions){
                        for(i=0;i<oGraph.plots[p].options.linRegressions.length;i++){
                            LR = oGraph.plots[p].options.linRegressions[i];
                            if((LR[0]>=start && LR[0]<=parseInt(oGraph.end||oGraph.lastdt)) && (LR[1]>=start && LR[1]<=parseInt(oGraph.to||oGraph.lastdt))){
                                this.plotLinearRegression(chart, chart.get("P"+p), false, LR[0], LR[1]);
                            }
                        }
                    }
                    if(oGraph.plots[p].options.averages){
                        for(i=0;i<oGraph.plots[p].options.averages.length;i++){
                            AV = oGraph.plots[p].options.averages[i];
                            if((AV[0]>=start && AV[0]<=parseInt(oGraph.end||oGraph.lastdt)) && (AV[1]>=start && AV[1]<=parseInt(oGraph.to||oGraph.lastdt))){
                                this.plotAverage(chart.get("P"+p), AV[0], AV[1]);
                            }
                        }
                    }
                }
            }
            chart.redraw()
        },
        plotLinearRegression: function(chart, series, redraw, start, end){ //start & end optional.  if present, start <= end
            if(!redraw) redraw = false;
            var sumX = 0, minX = null, maxX = null;
            var sumY = 0, minY = null, maxY = null;
            var j, data=[], points = 0;
            if(typeof start == "undefined" || typeof end == "undefined"){
                data = series.data;
            } else {
                for(j=0;j<series.data.length;j++){
                    if(series.data[j].x>=start && series.data[j].x<=end){
                        data.push(series.data[j]);
                    }
                }
            }
            for(j=0;j<data.length;j++){
                if(data[j].x != null && data[j].y != null){
                    sumX +=  data[j].x;
                    sumY +=  data[j].y;
                    if(minX == null){minX=data[j].x;}
                    if(maxX == null){maxX=data[j].x;}
                    if(minY == null){minY=data[j].y;}
                    if(maxY == null){maxY=data[j].y;}
                    if(minX>data[j].x){minX=data[j].x;}
                    if(maxX<data[j].x){maxX=data[j].x;}
                    if(minY>data[j].y){minY=data[j].y;}
                    if(maxY<data[j].y){maxY=data[j].y;}
                    points++;
                }
            }
            var avgX = sumX / points;
            var avgY = sumY / points;
            var num = 0;
            var den = 0;
            for(j=0;j<data.length;j++){
                if(data[j].x != null && data[j].y != null){
                    num += (data[j].x - avgX) * (data[j].y - avgY);
                    den += (data[j].x - avgX)*(data[j].x - avgX);
                }
            }
            var b1 = num / den;  //sum((x_i-x_avg)*(y_i-y_avg)) / sum((x_i-x_avg)^2)
            var b0 = avgY - b1 * avgX;

            var m, firstDigit, decimalLocation, isTimeSeries = series.options && series.options.freq;
            if(isTimeSeries){
                m = b1*period.value[series.options.freq];
                firstDigit = m.toString().search(/[1-9]/);
                decimalLocation = m.toString().indexOf('.');
            }

            var newSeries = {
                name:  "Linear regression of " + series.name + (isTimeSeries?"<BR> (m="+common.numberFormat(m, (decimalLocation>5||decimalLocation==-1)?0:firstDigit+5-decimalLocation)+" per "+period.units[series.options.freq]+")":''),
                dashStyle: 'LongDash',
                lineWidth: 1,
                data: [],
                id: "LR"+this.bandNo++,
                shadow: false,
                marker: {enabled: false}
            };
            if(isTimeSeries){
                newSeries.freq = series.options.freq;
                newSeries.calculatedFrom = series.options.id;
                newSeries.color = series.color;
            }
            for(j=0;j<data.length;j++){
                if(data[j].x != null && data[j].y != null){
                    newSeries.data.push([data[j].x , (b1*data[j].x  + b0)]);  //y = b1*x + b0
                }
            }
            //newSeries.data.push([minX, (b1*minX + b0)]);  //y = b1*x + b0
            return(chart.addSeries(newSeries, redraw));
        },
        plotAverage: function(series, start, end, redraw){ //start & end optional.  if present, start <= end
            if(!redraw) redraw = false;
            var hChart = panelGraphs[panelId].controls.chart;
            var sumY = 0, pointCount = 0;
            var j, data=[], points = 0;
            if(typeof start == "undefined" || typeof end == "undefined"){
                data = series.data;
            } else {
                for(j=0;j<series.data.length;j++){
                    if(series.data[j].x>=start && series.data[j].x<=end){
                        data.push(series.data[j]);
                        if(series.data[j].y !== null){
                            sumY += series.data[j].y;
                            pointCount++;
                        }
                    }
                }
            }
            var avg = sumY / pointCount;

            var newSeries = {
                name:  "Average of " + series.name,
                dashStyle: 'ShortDash',
                freq: series.options.freq,
                lineWidth: 1,
                color: series.color,
                data: [],
                id: "AV"+this.bandNo++,
                calculatedFrom: series.options.id,
                shadow: false,
                marker: {enabled: false}
            };
            for(j=0;j<data.length;j++){
                newSeries.data.push([data[j].x , avg]);
            }
            return(hChart.addSeries(newSeries, redraw));
        }
    };

    function _removeMarker(idToDelete){
        var oGraph = panelGraphs[panelId];
        var point = oGraph.controls.chart.get(idToDelete);
        if(point){
            var series = point.series, x = point.x, y = point.y;
            point.update({x: x, y: y, id: null, marker: {enabled: false}}, false);
        }
    }
    if(!globals.isEmbedded) controller.fetchStandards();
    return controller;
};
