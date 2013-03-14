/**
 * Created with JetBrains PhpStorm.
 * User: mark__000
 * Date: 2/14/13
 * Time: 11:30 PM
 * To change this template use File | Settings | File Templates.
 */

var BAND_TRANSPARENCY = 0.5;
var colorsPlotBands = ['aaaaaa', 'ffaaaa', 'aaffaa', 'aaaaff'];
var standardAnnotations = [];  //filled by API call on first use
$(document).ready(function(){
    require(["/global/js/highcharts/js/highcharts.src.2.3.5.js","/global/js/colorpicker/jquery.colorPicker.js","/global/js/jvectormap/jquery-jvectormap-1.2.2.min.js"], function(){
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

function AnnotationsController(panelId){
    var controller  = {
        panelId: panelId,
        $panel: $('#'+panelId),
        bandNo: 0,
        lineNo: 0,
        banding: false,
        bandStartPoint: void(0),
        standards: standardAnnotations,
        addStandard: function addStandardAnnotation(annoid){
            var self = this;
            callApi({command: "GetAnnotation", annoid: annoid}, function(data){
                standardAnno = jQuery.parseJSON(data.annotation);
                for(var i=0;i<standardAnno.length;i++){
                    oPanelGraphs[panelId].annotations.push(standardAnno[i]);
                }
                self.build( 'new');
            });
        },
        fetchStandards: function(){
            if(standardAnnotations.length==0){  //standardAnnotations is global scope, so the fetch only ever occurs once
                var self = this;
                callApi({command: "GetAnnotations"}, function(results){
                    for(var i=0;i<results.annotations.length;i++) standardAnnotations.push(results.annotations[i]);
                    self.standards = standardAnnotations;
                });
            } else {
                this.standards = standardAnnotations;
            }
        },
        sync: function annoSync(){  //sync plot lines and bands to options.  must be done prior to printing or exporting
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
        },
        addPoint: function annotatePoint(selectedPoint){
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
                    id: null, //gets reordered and set in AnnotationController.build()
                    series: selectedPoint.series.options.id,
                    color: 	'#000000',
                    from: 	formatDateByPeriod(selectedPoint.x,selectedPoint.series.options.period)
                });
                // redraw the point annotations in order and entire annotations table
                this.build('point');
            }
        },
        addXLine:  function annotateXLine(selectedPoint){
            var oGraph = oPanelGraphs[panelId];
            oHighCharts[panelId].xAxis[0].addPlotLine({
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
                from: 	formatDateByPeriod(selectedPoint.x,selectedPoint.series.options.period)
            });
            this.lineNo++;
            this.build('table-only');
        },
        startXBand: function annotateXBandStart(pointSelected){
            var oGraph = oPanelGraphs[panelId];
            this.bandStartPoint = pointSelected;
            this.bandColor = equivalentRGBA(colorsPlotBands[0], BAND_TRANSPARENCY);
            oHighCharts[panelId].xAxis[0].addPlotBand({
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
            var y, yOffset, self = this, $annotations = $('div#' + panelId + ' table.annotations');
            if($annotations.html().length!=0) { //enable on all calls except initial build
                $('div#' + panelId + ' .graph-save').button("enable");
                oPanelGraphs[panelId].isDirty = true;
            }
            if(!redrawAnnoTypes) redrawAnnoTypes='all';
            var oGraph = oPanelGraphs[panelId];
// builds and return a fresh annotations table HTML string from oGraph
            var sTable = '';
            var annoLetter = 'A';
            var i, anno, point, annoSeries, annoScatter, fromJS, toJS;
            var scatterData = {};
            for(i=0;i<oHighCharts[panelId].yAxis.length;i++){
                scatterData['labelsY-'+i] = [];
            }
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
                            annoSeries = oHighCharts[panelId].get(anno.series);
                            if(annoSeries==null){//cut anno out if we can't find it's reference series
                                oGraph.annotations.splice(i,1);
                                i--;
                                break;
                            }
                            annoScatter =  oHighCharts[panelId].get('labelsY-' + annoSeries.options.yAxis);
                            for(var j=0;j<annoSeries.data.length;j++){
                                if(annoSeries.data[j] ){  //prevent errors on cropped graphs
                                    if(annoSeries.data[j].x == this.parseDate(anno.from)){
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
                        sTable+='<tr data="' + annoLetter + '"><td align="center"><b>'+annoLetter+'</b></td><td>'+anno.from+'</td><td><input class="anno-text" type="text" value="'+anno.text+'"></td><td><a class="ui-icon ui-icon-trash">delete</a></td></tr>';
                        annoLetter=String.fromCharCode(annoLetter.charCodeAt(0)+1);
                        break;
                    case 'line':
                        fromJS = this.parseDate(anno.from);
                        if(fromJS>=parseInt(oGraph.start||oGraph.firstdt) && fromJS<=parseInt(oGraph.end||oGraph.lastdt)){
                            if(redrawAnnoTypes=='line'||redrawAnnoTypes=='all'||(redrawAnnoTypes=='new'&&!anno.id)){
                                anno.id ='xl' + this.lineNo;
                                this.lineNo++;
                                yOffset = this.labelOffset(oHighCharts[panelId], anno);
                                oHighCharts[panelId].xAxis[0].addPlotLine({
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
                            //var yOffset = this.labelOffset(oHighCharts[panelId], anno);
                            for(y=0;y<oHighCharts[panelId].yAxis.length;y++){
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
                        fromJS = this.parseDate(anno.from);
                        toJS = this.parseDate(anno.to);
                        if((fromJS>=parseInt(oGraph.start||oGraph.firstdt) && fromJS<=parseInt(oGraph.end||oGraph.lastdt)) || (toJS>=parseInt(oGraph.start||oGraph.firstdt) && toJS<=parseInt(oGraph.to||oGraph.lastdt))){
                            if(redrawAnnoTypes=='band'||redrawAnnoTypes=='all'||(redrawAnnoTypes=='new'&&!anno.id)){
                            anno.id ='xb' + this.bandNo++;
                            yOffset = this.labelOffset(oHighCharts[panelId], anno);
                            oHighCharts[panelId].xAxis[0].addPlotBand({
                                color: equivalentRGBA(anno.color, BAND_TRANSPARENCY),
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
                            for(y=0;y<oHighCharts[panelId].yAxis.length;y++){
                                if(oHighCharts[panelId].yAxis[y].userOptions.title.text==anno.yAxis){
                                    oHighCharts[panelId].yAxis[y].addPlotBand({
                                        color: equivalentRGBA(anno.color, BAND_TRANSPARENCY),
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
                for(var key in scatterData){   //replace the scatter series makers all at once, but don't redraw
                    oHighCharts[panelId].get(key).setData(scatterData[key], false);
                }
                oHighCharts[panelId].redraw(); //redraw after all have been updated
            }
            console.timeEnd('annotation redraw');
            console.time('annotation rest');
            if(oGraph.annotations.length==0) sTable+='<tr><td colspan="3" style="font-style:italic;color:aaaaaa#">right-click on the chart to annotate a point, a band, or an event</td></tr>';
            $annotations.html(sTable).find('input, select').change(function(){self.change(this)});
            $annotations.find('.annotation-color-picker').colorPicker();
            $annotations.find('.ui-icon-trash')
                .click(function(){
                    self.delete(this)
                });

            console.timeEnd('annotation rest');
        },
        change: function changeAnno(obj){
            var i, yOffset, y, id = $(obj).closest('tr').attr('data');
            this.$panel.find('.graph-save').button('enable');
            var oGraph = oPanelGraphs[panelId];
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
                    yOffset = this.labelOffset(oHighCharts[panelId], anno);
                    oHighCharts[panelId].xAxis[0].removePlotBand(id);
                    oHighCharts[panelId].xAxis[0].addPlotBand({
                        color: equivalentRGBA(anno.color, BAND_TRANSPARENCY),
                        from: this.parseDate(anno.from),
                        to: this.parseDate(anno.to),
                        id: anno.id,
                        label: {text: anno.text, y: yOffset, zIndex: 3}
                    });
                    break;
                case 'hb':
                    for(i=0;i<oHighCharts[panelId].yAxis.length;i++){
                        if(oHighCharts[panelId].yAxis[i].userOptions.title.text = anno.yAxis){
                            oHighCharts[panelId].yAxis[i].removePlotBand(id);
                            oHighCharts[panelId].yAxis[i].addPlotBand({
                                color: equivalentRGBA(anno.color, BAND_TRANSPARENCY),
                                from: parseFloat(anno.from),
                                to: parseFloat(anno.to),
                                id: anno.id,
                                label: {text: anno.text, zIndex: 3}
                            });
                        }
                    }
                    break;
                case 'hl':
                    for(i=0;i<oHighCharts[panelId].yAxis.length;i++){
                        if(oHighCharts[panelId].yAxis[i].userOptions.title.text = anno.yAxis){
                            oHighCharts[panelId].yAxis[i].removePlotLine(id);
                            oHighCharts[panelId].yAxis[i].addPlotLine({
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
                    yOffset = this.labelOffset(oHighCharts[panelId], anno);
                    oHighCharts[panelId].xAxis[0].removePlotLine(id);
                    oHighCharts[panelId].xAxis[0].addPlotLine({
                        color: anno.color,
                        value: this.parseDate(anno.from),
                        id: anno.id,
                        width: 2,
                        label: {text: anno.text, y: yOffset, zIndex: 3}
                    });
            }
        },
        delete: function deleteAnno(deleteAnchor){
            var idToDelete = $(deleteAnchor).closest('tr').attr('data');
            var oGraph = oPanelGraphs[panelId];
            for(var i=0;i< oGraph.annotations.length;i++){
                if(idToDelete == oGraph.annotations[i].id){
                    oGraph.annotations.splice(i,1);
                    break;
                }
            }
            if(idToDelete[1]=='b' || idToDelete[1]=='l'){ //band or line:  simply try to delete for all axis until found
                for(a=0;a<oHighCharts[panelId].axes.length;a++){
                    oHighCharts[panelId].axes[a].removePlotLine(idToDelete);  //does not error if not found
                    oHighCharts[panelId].axes[a].removePlotBand(idToDelete);
                }
                this.build( "none");
            } else {
                this.build( "point");
            }
        },
        startLinearRegression: function(point){
            var seriesColor = point.series.color;
            r = parseInt(seriesColor.substr(1,2),16);
            g = parseInt(seriesColor.substr(3,2),16);
            b = parseInt(seriesColor.substr(5,2),16);
            this.bandColor = 'rgba(' + r +','+  g +','+  b +',0.5)';
            this.banding = 'linreg-' + point.series.index;
            this.bandStartPoint = point;
            oHighCharts[panelId].xAxis[0].addPlotBand({
                from:  this.bandStartPoint.x,
                to: point.x,
                color:  this.bandColor,
                id: 'lr' + this.bandNo++,
                label:  {text: ' ', y: 0, zIndex: 3}
            })
        },
        deleteRegression: function(pointSelected){
            var fromX, toX, i, linRegressions, plotId = pointSelected.series.options.regression;
            if(plotId){
                fromX = pointSelected.series.data[0][0];
                toX = pointSelected.series.data[pointSelected.series.data.length-1][0];
                pointSelected.series.remove();
                linRegressions = oPanelGraphs[panelId].plots[parseInt(plotId.substr(1))].options.linRegressions;
                for(i=0;i<linRegressions.length;i++){
                    if(linRegressions[i][0]==toX && linRegressions[i][1]==fromX){
                        linRegressions.splice(i,1);
                        return true;
                    }
                }
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
        },
        mouseOverHCPoint: function mouseOverHCPoint(e, point){
            var chart = oHighCharts[panelId];
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
            if(this.banding.substr(0,7)=='linreg-'){
                try{
                    chart.xAxis[0].removePlotBand('lr'+this.bandNo);
                }catch(err){}
                this.endingX = closestDate(point.x, this.bandStartPoint.series.data);
                chart.xAxis[0].addPlotBand({
                    from:  this.bandStartPoint.x,
                    to: this.endingX,
                    color: this.bandColor,
                    id: 'lr' + this.bandNo,
                    label:  {text: ' ', y: 0, zIndex: 3}
                });
            }
        },
        endBanding:  function endBanding(e){
            var axisName, axisValue, userValue;
            var pointSelected = this.mouseoverPoint;  //grab reference (set by a HighCharts' event) before point's mouseout event can delete it
            var onPoint = (typeof(this.mouseoverPoint)!="undefined");
            var oGraph = oPanelGraphs[panelId];
            var self = this;
            if(this.banding=='x-Time'){
                if(onPoint){
                    var x1, x2;
                    x1 = formatDateByPeriod(this.bandStartPoint.x, this.bandStartPoint.series.options.period);
                    x2 = formatDateByPeriod(pointSelected.x, pointSelected.series.options.period);
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
            if(this.banding && this.banding.substr(0,7)=='linreg-'){
                //ending linear regression
                oHighCharts[panelId].xAxis[0].removePlotBand('lr'+this.bandNo);
                var fromX = Math.min(this.bandStartPoint.x, this.endingX);
                var toX = Math.max(this.bandStartPoint.x, this.endingX);
                if(fromX<toX){
                    this.plotLinearRegression(this.bandStartPoint.series, fromX, toX, true);
                    var plotOptions = oGraph.plots[parseInt(this.bandStartPoint.series.options.id.substr(1))].options;
                    if(!plotOptions.linRegressions) plotOptions.linRegressions= [];
                    plotOptions.linRegressions.push([fromX, toX]);
                } else {
                    dialogShow("Error","The starting point and ending points of a Linear Regression must be different." );
                }
                this.banding = false;
                return;
            } else {
                var top, left, x, y, i, chart = oHighCharts[panelId];
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
                                                        color: equivalentRGBA(colorsPlotBands[0], BAND_TRANSPARENCY),
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
        plotAllLinearRegressions: function(){  //COPIED DIRECTLY FROM md_hcharter.js.  NEEDS ADAPTING
            var p, i, LR;
            var chart = oHighCharts[panelId];
            var oGraph = oPanelGraphs[panelId];
            if(oGraph.plots && oGraph.plots.length>0){
                for(p=0;p<oGraph.plots.length;p++){
                    if(oGraph.plots[p].options.linRegressions){
                        for(i=0;i<oGraph.plots[p].options.linRegressions.length;i++){
                            LR = oGraph.plots[p].options.linRegressions[i];
                            if((LR[0]>=parseInt(oGraph.start||oGraph.firstdt) && LR[0]<=parseInt(oGraph.end||oGraph.lastdt)) && (LR[1]>=parseInt(oGraph.start||oGraph.firstdt) && LR[1]<=parseInt(oGraph.to||oGraph.lastdt))){
                                this.plotLinearRegression(chart.get("P"+p), LR[0], LR[1]);
                            }
                        }
                    }
                }
            }
            chart.redraw()
        },
        plotLinearRegression: function(series, start, end, redraw){ //start & end optional.  if present, start <= end
            if(!redraw) redraw = false;
            var hChart = oHighCharts[panelId];
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
            //console.log(series);
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
            //console.log("avg y: " + avgY);
            var num = 0;
            var den = 0;
            for(j=0;j<data.length;j++){
                if(data[j].x != null && data[j].y != null){
                    num += (data[j].x - avgX) * (data[j].y - avgY);
                    den += (data[j].x - avgX)*(data[j].x - avgX);
                }
            }
            var b1 = num / den;  //sum((x_i-x_avg)*(y_i-y_avg)) / sum((x_i-x_avg)^2)
            //console.log(b1 + "=" + num + "/" + den);
            var b0 = avgY - b1 * avgX;

            var newSeries = {
                name:  "Linear regression of " + series.name + "<BR>(m="+b1*period.value[series.options.period]+" per "+period.units[series.options.period]+")",
                dashStyle: 'LongDash',
                period: series.options.period,
                lineWidth: 1,
                color: series.color,
                data: [],
                id: "LR"+this.bandNo++,
                regression: series.options.id,
                shadow: false,
                marker: {enabled: false}
            };
            for(j=0;j<data.length;j++){
                if(data[j].x != null && data[j].y != null){
                    newSeries.data.push([data[j].x , (b1*data[j].x  + b0)]);  //y = b1*x + b0
                }
            }
            //newSeries.data.push([minX, (b1*minX + b0)]);  //y = b1*x + b0
            return(hChart.addSeries(newSeries, redraw));
        }
    };
    controller.fetchStandards();
    return controller;
}


//ANNOTATION CODE



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
        this.build('none');  //redraw the annotation table only
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

function equivalentRGBA(hexColor, alpha){
    var r, g, b;
    if(hexColor.substr(0,1)=='#')hexColor=hexColor.substr(1);  //get rid of any potential # prefix
    r = gun(parseInt(hexColor.substr(0,2),16), alpha);
    g = gun(parseInt(hexColor.substr(2,2),16), alpha);
    b = gun(parseInt(hexColor.substr(4,2),16), alpha);
    if(r>0&&g>0&&b>0){
        return 'rgba(' + r +','+  g +','+  b +','+alpha+')';
    } else {
        return 'rgb(' + parseInt(hexColor.substr(0,2),16) +','+  parseInt(hexColor.substr(2,2),16) +','+  parseInt(hexColor.substr(4,2),16) +')';
    }
    function gun(desired, alpha){
        return  parseInt(desired/alpha - (1-alpha)*255/alpha);
    }
}