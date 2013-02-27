/**
 * Created with JetBrains PhpStorm.
 * User: mark__000
 * Date: 2/17/13
 * Time: 11:13 PM
 * To change this template use File | Settings | File Templates.
 */

//PROVENANCE PANEL CREATOR AND HELPER FUNCTIONS
var SigmaCode = '&#931;';
function ProvenanceController(panelId){
    var controller = {
        HTML: {
            nLanding: '<li class="component-landing">drag numerator series here</li>',
            dLanding: '<li class="component-landing">drag denominator series here</li>'
        },
        graph: oPanelGraphs[panelId],
        $prov: $('#'+panelId + ' .provenance'),
        build:  function build(plotIndex){  //redo entire panel if plotIndex omitted
            var self = this;
            var i, j, plotList, mapList, plot, okcancel;
            self.$prov.show(); //compensation for margins @ 15px + borders
            okcancel = '<button class="config-cancel">cancel</button> <button class="config-apply">apply</button><br>';
            plotList = '';
            if(typeof plotIndex != 'undefined'){
                self.$prov.find('ol.plots').append( self.plotHTML(plotIndex) );
            } else {
                self.plotsEdits = $.extend(true, [], self.graph.plots);  //this is the copy that the provenance panel will work with.  Will replace graph.plots on "OK"
                self.annoEdits = $.extend(true, [], self.graph.annotations);
                self.mapsetEdits = $.extend(true, [], self.graph.mapsets);
                self.pointsetsEdits = $.extend(true, [], self.graph.pointsets);
                if(self.graph.plots){
                    plotList = '<div class="chart-plots"><H4>Chart</H4><ol class="plots">';

                    for(i=0;i<self.graph.plots.length;i++){
                        //outer PLOT loop
                        plotList += self.plotHTML(i);
                    }
                }

                plotList += '</ol>'
                    +  '<ol class="blank-plot landing components" style=""><li class="not-sortable">Drag and drop to plot lines to reorder them.  Drag and drop multiple series into a plot to create sums and ratios. Drag a series here to create a new plot line.</i></li></ol></div>';
                mapList = self.provenanceOfMap();
                self.$prov.html(okcancel + plotList + mapList);
                //sortable
                self.$prov.find(".components")
                    .sortable({
                        containment: self.$prov.get(0),
                        connectWith: ".components",
                        cancel: ".component-landing",
                        axis: "y",
                        delay: 150,   //in ms to prevent accidentally drags
                        start: function(event, ui){
                            var plotIndex, compIndex, type, obj;
                            //determinate source type
                            if(ui.item.parent().hasClass("map-comp")){type="map"; obj = self.mapsetEdits}
                            if(ui.item.parent().hasClass("plot-comp")){type="plot"; obj = self.plotsEdits[ui.item.closest("li.plot").index()]}
                            if(ui.item.parent().hasClass("point-comp")){type="point"; obj = self.pointsetsEdits[ui.item.closest("li.plot").index()]}
                            //determine source model obj
                            if(type=='plot'||type=='point'){
                                plotIndex = ui.item.closest("li.plot").index();
                            } else {
                                plotIndex = null;
                            }
                            //determine comp index
                            if(ui.item.parent().hasClass("numer")){
                                compIndex = ui.item.index();
                            } else {
                                var numerLength = ui.item.closest("ol.components").parent().find("ol.numer li.component").length;
                                compIndex = ui.item.index() + numerLength;
                            }
                             /*else {  //THIS WILL NEVER HAPPEN:  MOVE TO PLOTS START
                                if(ui.item.hasClass("plot"))type="plot";
                                if(ui.item.hasClass("pointset"))type="point";
                                compIndex = null;
                                plotIndex = ui.item.closest("li.plot").index();
                            }*/
                            self.dragging = {
                                type: type,
                                plotIndex: plotIndex,
                                compIndex: compIndex,
                                obj: obj,
                                $ol: ui.item.parent()
                            }
                        },
                        update: function(event, ui){ self.componentMoved(ui)}
                    })
                    .disableSelection();
                self.$prov.find('.map-mode').buttonset()
                    .find('input').click(function(){
                        self.graph.mapsets.options.mode = $(this).val();
                        if(self.graph.mapsets.options.mode=='bubble' && !self.graph.mapsets.options.merges) {
                            self.graph.mapsets.options.merges = [];
                        } else {
                            $merge.show();
                        }
                    });
                var $merge = self.$prov.find('.merge-mode').buttonset()
                    .find('input').click(function(){
                        self.graph.mapsets.options.merge = $(this).val();
                    });
                if(self.graph.mapsets && (!self.graph.mapsets.options.mode || self.graph.mapsets.options.mode=='bubble')) $merge.hide();
                self.$prov.find(".plots")
                    .sortable({
                        axis: "y",
                        dropOnEmpty: false,
                        connectWith: ".plots",
                        start: function(event, ui){
                            self.dragging = {
                                type: "plot",
                                plotIndex: ui.item.index(),
                                compIndex: null,
                                $ol: ui.item.parent()
                            }
                        },
                        update: function(event, ui){  //only within!
                            var i, oldAnnoIndex;
                            var movedPlot = self.plotsEdits.splice(self.dragging.plotIndex, 1)[0];
                            self.plotsEdits.splice(ui.item.index(),0,movedPlot);
                            var shift = (ui.item.index()>self.dragging.plotIndex)?-1:1;
                            for(i=0;i<self.annoEdits.length;i++){
                                if(self.annoEdits[i].type=="point"){
                                    oldAnnoIndex = parseInt(self.annoEdits[i].series.substr(1));
                                    if(oldAnnoIndex==self.dragging.plotIndex){
                                        self.annoEdits[i].series = "P" +  ui.item.index();
                                    } else {
                                        self.annoEdits[i].series = "P" + (oldAnnoIndex+shift).toString();
                                    }
                                }
                            }

                        }
                    })
                    .disableSelection();
                self.$prov.find(".pointsets")
                    .sortable({
                        axis: "y",
                        dropOnEmpty: false,
                        connectWith: ".pointsets",
                        start: function(event, ui){
                            self.dragging = {
                                type: "point",
                                plotIndex: ui.item.index(),
                                compIndex: null,
                                $ol: ui.item.parent(),
                                obj: self.pointsetsEdits[ui.item.index()]
                            }
                        },
                        update: function(event, ui){  //only within!
                            if(ui.sender==null) return;
                            var movedPointset = self.pointsetEdits.splice(self.dragging.plotIndex,1);
                            self.pointsetEdits.splice(ui.item.index(),0,movedPointset);
                        }
                    })
                    .disableSelection();

                //main buttons
                self.$prov.find("button.config-cancel").button({icons: {secondary: 'ui-icon-closethick'}}).click(function(){
                    self.provClose(this);
                });
                self.$prov.find("button.config-apply").button({icons: {secondary: 'ui-icon-check'}}).click(function(){
                    self.provOk(this);
                });
            }

            //all matching prov components, therefore unbind before binding
            self.$prov.find("li.plot").off("click").click(function(evt){
                if(!evt.isPropagationStopped()){
                    evt.stopPropagation();
                    //alert("showPlotEditor(this");
                }
            });
            self.$prov.find("li.component").off("click").click(function(evt){
                if(!evt.isPropagationStopped()){
                    evt.stopPropagation();
                }
            });
            self.$prov.find(".edit-plot")
                .button({icons: {secondary: 'ui-icon-pencil'}})
                .off("click")
                .click(function(){
                    var $liPlot = $(this).closest("li");
                    self.showPlotEditor($liPlot);
                    $liPlot.find("li.component").each(function(){
                        self.showComponentEditor(this);
                    });
                });

            self.$prov.find(".edit-mapset")
                .button({icons: {secondary: 'ui-icon-pencil'}})
                .off("click")
                .click(function(){
                    var $liPlot = $(this).closest("li");
                    self.showMapSetEditor($liPlot);
                    $liPlot.find("li.component").each(function(){
                        self.showComponentEditor(this);
                    });
                });

            self.$prov.find(".edit-pointset")
                .button({icons: {secondary: 'ui-icon-pencil'}})
                .off("click")
                .click(function(){
                    var $liPlot = $(this).closest("li");
                    self.showPointSetEditor($liPlot);
                    $liPlot.find("li.component").each(function(){
                        self.showComponentEditor(this);
                    });
                });
        },
        plotHTML:  function plotHTML(i){
            var self = this;
            var graph = self.graph;
            var plotColor, plotList = '', plot = self.plotsEdits[i];
            if(plot.options.lineWidth) plot.options.lineWidth = parseInt(plot.options.lineWidth); else plot.options.lineWidth = 2;
            if(!plot.options.lineStyle) plot.options.lineStyle = 'Solid';
            plotColor = plot.options.lineColor || (oHighCharts[panelId].get('P'+i)?oHighCharts[panelId].get('P'+i).color:hcColors[i%hcColors.length]);
            plotList += '<li class="plot" data="P' + i + '">'
            + '<button class="edit-plot">configure</button>'
            + '<div class="line-sample" style="background-color:'+plotColor+';height:'+plot.options.lineWidth+'px;"><img src="images/'+plot.options.lineStyle+'.png" height="'+plot.options.lineWidth+'px" width="'+plot.options.lineWidth*38+'px"></div>'
            + '<div class="plot-info" style="display:inline-block;"><span class="plot-title">'+plotName(graph, plot)+'</span> (' + self.plotPeriodicity(plot)+') in ' + plotUnits(graph, plot) + '</div>'
            + '<span class="plot-formula">= ' + plotFormula(plot).formula + '</span><br>'
            + self.componentsHTML(plot)
            + '</li>';
            return plotList;
        },
        componentsHTML: function(plot){
            var plotList, type='plot', numer='', denom='', compHTML, isDenom=false, graph = this.graph;
            for(var j=0;j< plot.components.length;j++){
                //inner COMPONENT loop
                comp = plot.components[j];
                if(plot.components[j].options.op==null)plot.components[j].options.op="+";
                if(comp.handle[0]=='M')type='map';
                if(comp.handle[0]=='X')type='point';
                compHTML = '<li class="component ui-state-default" data="'+comp.handle+'">'
                    + '<span class="plot-op ui-icon ' + op.class[plot.components[j].options.op] + '">operation</span> '
                    + (comp.handle[0]=='X'?iconsHMTL.pointset:(comp.handle[0]=='M'?iconsHMTL.mapset:''))
                    + graph.assets[comp.handle].name
                    + ' ('+period.name[graph.assets[comp.handle].period]+') in '
                    + graph.assets[comp.handle].units
                    + '</li>';
                if(plot.components[j].options.dn=='d'||isDenom){isDenom= true; denom += compHTML} else {numer += compHTML}
            }
            plotList += '<ol class="components '+type+'-comp numer">'+(numer||this.HTML.nLanding) + '</ol>';
            plotList += '<hr>';
            plotList += '<ol class="components '+type+'-comp denom">'+(denom||this.HTML.dLanding) + '</ol>';
            return plotList;
        },
        plotPeriodicity:   function plotPeriodicity(plot){
            var self = this;
            var sHandle, comp, fromPeriodicity;
            if(plot.components[0].options.downshiftPeriod){
                fromPeriodicity = plot.components[0].options.downshiftPeriod;
            } else {
                fromPeriodicity = self.graph.assets[plot.components[0].handle].period;
            }
            if(typeof(plot.options.downshiftPeriod) == "undefined"){
                return '<span class="plot-freq">'+period.name[fromPeriodicity]+'</span>';
            } else {
                return '<span class="plot-freq">'+period.name[plot.options.downshiftPeriod]+'</span> <span class="plot-from-freq">'+plot.options.downshiftMethod+' down from '+period.name[fromPeriodicity]+'</span>';
            }
        },
        provenanceOfMap:  function provenanceOfMap(){
            var self = this;
            var provHTML = '', ps, pointset;
            if(self.graph.map&&(self.graph.mapsets||self.graph.pointsets)){ //map!!
                provHTML = '<div class="map-prov"><h3>Map of '+ self.graph.map +'</h3>';
                if(self.graph.mapsets){
                    provHTML += '<div class="mapset">'
                    + '<button class="edit-mapset right">configure</button>'
                    + '<h4>' + iconsHMTL.mapset + ' Mapped set of regions (country, state, or county)</h4>'
                    + hContinuousColor(self.graph.mapsets.options.minColor||'#C8EEFF', self.graph.mapsets.options.maxColor||'#0071A4')
                    //+ '<div class="color min" style="padding:0;margin:0;border: thin black solid; height: 10px; width: 10px;display:inline-block;background-color:'+ (self.graph.mapsets.options.minColor||'#C8EEFF') +';"></div> to '
                    //+ '<div class="color max" style="padding:0;margin:0;border: thin black solid; height: 10px; width: 10px;display:inline-block;background-color:'+ (self.graph.mapsets.options.maxColor||'#0071A4') +';"></div>'
                    + '<div class="plot-info" style="display:inline-block;">'
                    + '<span class="plot-title">' + plotName(self.graph, self.graph.mapsets)+ '</span> (' + self.plotPeriodicity(self.graph.mapsets)+') in <span class="plot-units">' + (self.graph.mapsets.options.units||plotUnits(self.graph, self.graph.mapsets)) +'</span></div>'
                    + '<span class="plot-formula">= ' + plotFormula(self.graph.mapsets).formula + '</span><br>';


                    /*  The TYPE AND MERGE MODE WILL BE AVAILABLE IN CONFIGURATION MODE, NOT THE INTIAL VIEW
                        + 'type: ' + ((!self.graph.mapsets.options.mode || self.graph.mapsets.options.mode!='bubble')?'heat map':'bubbles with user defined region');
                    if(self.graph.mapsets.options.mode || self.graph.mapsets.options.mode=='bubble') {
                        if(self.graph.mapsets.options.merge && self.graph.mapsets.options.merge=='sumnsumd'){
                            provHTML += '<span class="merge-formula">merge formula = &#931; numerator / &#931; denominator</span>';
                        } else {
                            provHTML += '<span class="merge-formula">&#931; (numerator / denominator)</span>';
                        }
                    }*/
                    /*+ '<div class="map-mode">'
                        + '<input type="radio" name="'+ panelId +'-map-mode" id="'+ panelId +'-map-mode-C" value="choropleth" '+ ((!self.graph.mapsets.options.mode || self.graph.mapsets.options.mode!='bubble')?'checked':'') +' /><label for="'+ panelId +'-map-mode-C">heat map</label>'
                        + '<input type="radio" name="'+ panelId +'-map-mode" id="'+ panelId +'-map-mode-B" value="bubble" '+ ((self.graph.mapsets.options.mode && self.graph.mapsets.options.mode=='bubble')?'checked':'') +' /><label for="'+ panelId +'-map-mode-B">bubble (mergable into regional sums)</label>'
                        + '</div>'
                        + '<div class="merge-mode">'
                        + '<input type="radio" name="'+ panelId +'-merge-mode" id="'+ panelId +'-merge-mode-sumnsumd" value="sumnsumd" '+ ((self.graph.mapsets.options.merge || self.graph.mapsets.options.merge!='simplesum')?'checked':'') +' /><label for="'+ panelId +'-merge-mode-sumnsumd">sum numerators / sum denominators</label>'
                        + '<input type="radio" name="'+ panelId +'-merge-mode" id="'+ panelId +'-merge-mode-sum" value="simplesum" '+ ((!self.graph.mapsets.options.merge || self.graph.mapsets.options.merge=='simplesum')?'checked':'') +' /><label for="'+ panelId +'-merge-mode-sum">sum values</label>'
                    + '</div>'*/
                    provHTML += self.componentsHTML(self.graph.mapsets)
                    + '</div>'; //close mapset
                }
                if(self.graph.pointsets){
                    provHTML += '<div class="pointsets">Pointsets (location markers)<ol class="pointsets">';
                    for(ps=0;ps<self.graph.pointsets.length;ps++){
                        pointset = self.graph.pointsets[ps];
                        provHTML += '<li class="pointset ui-state-highlight">'
                        + '<button class="edit-pointset right">edit</button>'
                        + '<div class="plot-info" style="display:inline-block;"><span class="plot-title">'
                        + plotName(self.graph, pointset)+'</span> in ' + (pointset.options.units||plotUnits(self.graph, pointset)) + ' ' + (pointset.options.period||self.plotPeriodicity(pointset))+'</div>'
                        + self.componentsHTML(self.graph.pointsets[ps])
                        + '</li>';
                    }
                    provHTML += '</ol></div>';
                }
                provHTML += '</div>'
            }
            return provHTML;
        },
        componentMoved:  function componentMoved(ui){  //triggered when an item is move between lists or sorted within.  Note that moving between plot lists triggers two calls
            //first find out whether a sort or a move, and whether that move empty or created a new component.
            var self = this;
            var $targetSeriesList, pFromHandle, draggedComponent;
            var i, handle, thisHandle, from, fromC, toC, fromP, toP, toOp, toType, toPlotObject;  //indexes
            var $prov = self.$prov;
            var oGraph = self.graph;

            if(ui.sender==null) return; //prevent double call

            //cancel if adding to a plot that already has the same series
            toP = ui.item.closest('.plot').index();

            //check to see if this is a new plot
            var newPlot = ui.item.parent().hasClass('blank-plot');

            //component landing type has to be either a plot, a mapset or a pointset
            if(ui.item.parent().hasClass("map-comp")){
                toType="map";
                if(!newPlot) toPlotObject = self.mapsetEdits;
            }
            if(ui.item.parent().hasClass("plot-comp")){
                toType="plot";
                if(!newPlot) toPlotObject = self.plotsEdits[toP];
            }
            if(ui.item.parent().hasClass("point-comp")){
                toType="point";
                if(!newPlot) toPlotObject = self.pointsetsEdits[toP]
            }

            //pointset and mapset type series must belong to a pointset or a mapset respectively
            thisHandle = ui.item.attr('data');
            if(thisHandle[0]=='M' && toType!='map'){
                self.$prov.find(".components").sortable("cancel");
                dialogShow('mapset restrictions', 'A mapset is a grouping of series, each correspond to an area on a map, such as a state or country.  Mapsets cannot be mixed with marker sets or displayed on a line graph.<br><br>Note that from from the map, you can easily select and chart any of this mapsets\' component series.');
                return;
            }
            if(thisHandle[0]=='M' && toType!='map'){
                self.$prov.find(".components").sortable("cancel");
                dialogShow('mapset restrictions', 'A pointset is a grouping of series, each correspond to a precise location determined by longitude and latitude values.  Pointsets cannot be mixed with area mapsets or displayed a line graph.<br><br>Note that from from the map, you can easily select and chart any of this pointsets\' component series.');
                return;
            }

            //duplicate series in same plot not permitted
            if(toP!=self.dragging.plotIndex && self.dragging.type!=toType && !newPlot){
                for(i=0;i<toPlotObject.components.length;i++){
                    if(toPlotObject.components[i].handle == thisHandle) {
                        self.$prov.find(".components").sortable("cancel");
                        return;
                    }
                    if(self.graph.assets[thisHandle].period!=self.graph.assets[toPlotObject.components[i].handle].period){
                        self.$prov.find(".components").sortable("cancel");
                        dialogShow('frequency discrepancy', 'When performing array math, the sample frequency of all component series must be the same.');
                        return;
                    }
                }
            }

            //we are good to move!  So...

            //1. remove unneeded landing <li>s
            ui.item.parent().find('.component-landing').remove();
            //2. add a landing to the source <ol> if needed
            if(self.dragging.$ol.children("li").length==0){
                if(self.dragging.$ol.hasClass('numer')){
                    self.dragging.$ol.append(self.HTML.nLanding);
                } else {
                    self.dragging.$ol.append(self.HTML.dLanding);
                }
            }
            //3. remove the component
            var cmp = self.dragging.obj.components.splice(self.dragging.compIndex,1)[0];
            //4. set the numer/denom flag and add the component
            if(ui.item.closest('ol').hasClass('numer') || newPlot){
                cmp.options.dn='n';
                toC = ui.item.index();
            } else {
                cmp.options.dn='d';
                var numerLength = ui.item.closest('ol').parent().find('ol.numer').children('li.component').length;
                toC = ui.item.index() + numerLength;
                ui.item.closest('ol').attr("start", numerLength+1);
            }
            if(newPlot){
                var toPlotObject = {options: {}, components: [cmp]};
                self.plotsEdits.push(toPlotObject);
                self.$prov.find('ol.plots').append(self.plotHTML(self.plotsEdits.length-1));
            } else {
                toPlotObject.components.splice(toC,0,cmp);
            }

            ui.item.closest(".plot").find("span.plot-formula").html(' = ' + plotFormula(toPlotObject).formula);
            //5. check for no components > delete object; remove plot; adjust annotations
            if(self.dragging.obj.components.length==0){
                if(self.dragging.type=='plot'){
                    self.plotsEdits.splice(self.dragging.plotIndex,1);
                    self.$prov.find("ol.plots li.plot")[self.dragging.plotIndex].remove();
                    //check annotations
                    var oldAnnoIndex;
                    for(i=0;i<self.annoEdits.length;i++){
                        if(self.annoEdits[i].type=="point"){
                            oldAnnoIndex = parseInt(self.annoEdits[i].series.substr(1));
                            if(oldAnnoIndex==self.dragging.plotIndex){
                                self.annoEdits.splice(i,1);
                                i--;
                            }
                            if(oldAnnoIndex>self.dragging.plotIndex){
                                self.annoEdits[i].series = "P" +  --oldAnnoIndex;
                            }
                        }
                    }
                }
                if(self.dragging.type=='point'){
                    self.pointsetsEdits.splice(self.dragging.plotIndex,1);
                    self.$prov.find("ol.pointsets li.plot")[self.dragging.plotIndex].remove();
                }
                //not possible to kill a mapset by dragging off its mapset components
            }
            if(newPlot) ui.item.remove();  //the spare component in the new plot landing zone

        },
        provOk: function provOk(btn){//save change to graph object and rechart
            //TODO: save and rechart
            var self = this;
            self.graph.plots = self.plotsEdits;
            self.graph.annotations = self.annoEdits;
            delete self.plotsEdits;
            delete self.annoEdits;
            delete self.mapsetEdits;
            delete self.pointsetsEdits;
            var $panel= $(btn).closest("div.graph-panel");
            this.provClose(btn);
            $panel.find(".graph-type").change();  //trigger redaw
        },
        provClose:  function provClose(btn){ //called directly from cancel btn = close without saving
            var self = this;
            delete self.plotsEdits;
            $("ol.ui-sortable").sortable("destroy");
            self.$prov.closest('div.graph-panel').find('.graph-nav-graph').click();
        },
        compIndex: function(liComp){
            $liComp = $(liComp);
            var cmpIndex = $liComp.index();
            if($liComp.parent().hasClass('denom')) {
                cmpIndex += $liComp.parent().parent().find('ol.numer li.component').length;
            }
            return cmpIndex;
        },
        showComponentEditor:  function showComponentEditor(liComp){
            var self = this;
            var $liComp = $(liComp);
            var plotsEdits = self.plotsEdits;
            var compHandle = $(liComp).attr('data');
            var plotIndex = $(liComp).closest('li.plot').index();
            var iComp = self.compIndex($liComp); //could have just gotten index of liComp as the object should be in sync
            var components = plotsEdits[plotIndex].components;
            var component = components[iComp];
            //$liComp.find(".edit-comp").hide();
            var editDiv =  '<button class="comp-copy prov-float-btn">make copy</button>'
                + '<button class="comp-delete prov-float-btn" style="background-color: #FF0000;">remove series</button>'
                + '<div class="comp-editor" style="display: none;">'
                +   '<span class="edit-label">units:</span> '
                +   '<span class="edit-label">frequency:</span>'
                + '</div>';
            var $editDiv = $(editDiv);
            $liComp.find(".plot-op").hide().after(
                '<div class="op">'
                    +       '<input type="radio" data="+"  id="op-addition'+compHandle+'" value="+" name="op-radio'+compHandle+'" /><label for="op-addition'+compHandle+'">+</label>'
                    +       '<input type="radio" data="-"  id="op-subtraction'+compHandle+'" value="-" name="op-radio'+compHandle+'" /><label for="op-subtraction'+compHandle+'">-</label>'
                    +       '<input type="radio" data="*"  id="op-multiply'+compHandle+'" value="*" name="op-radio'+compHandle+'" /><label for="op-multiply'+compHandle+'">*</label>'
                    +       '<input type="radio" data="/"  id="op-divide'+compHandle+'" value="/" name="op-radio'+compHandle+'" /><label for="op-divide'+compHandle+'">/</label>'
                    +   '</div>');
            //$editDiv.find("li[data='"+component.options.op+"']").attr('checked','checked');
            $liComp.find("div.op").find("input[data='"+component.options.op+"']").attr('checked','checked')
                .end()
                .buttonset()
                .find('input:radio')
                .click(function(){
                    var cmpIndex = self.compIndex($liComp);
                    var pltIndex = $liComp.closest(".plot").index();
                    plotsEdits[pltIndex].components[cmpIndex].options.op = $(this).val();
                    $liComp.closest(".plot").find("span.plot-formula").html(' = ' + plotFormula(self.plotsEdits[pltIndex]).formula);
                    $liComp.find('.plot-op').attr('class','plot-op ui-icon ' + op.class[plotsEdits[pltIndex].components[cmpIndex].options.op]);
                });
            //$liComp.closest("div.provenance").find("button.plot-close, button.comp-close").click();  //close any open comp editors
            $editDiv.appendTo($liComp).slideDown();  //add the new comp editor and animate it open
            //add UI events
            $editDiv.find("ul.comp-op li").click(function(){
                $editDiv.find("li.selected").removeClass("selected");
                component.options.op = $(this).closest("li").addClass("selected").attr('data');
                $editDiv.closest("span.plot-op").attr("class","plot-op ui-icon " + op.class[component.options.op]);
            });
            $liComp.find(".comp-delete").button({icons: {secondary: 'ui-icon-trash'}}).addClass('ui-state-error').click(function(){
                components.splice(iComp,1);
                if(components.length==0) $liComp.closest('li.plot').find('.plot-delete').click(); else $liComp.remove();
            });
            $liComp.find(".comp-copy").button({icons: {secondary: 'ui-icon-copy'}}).click(function(){
                var p = self.plotsEdits.push({options: {}, components: [$.extend(true, {}, component, {options: {op: '+'}})]}) - 1;
                var compHandle = self.plotsEdits[p].components[0].handle;
                var name = self.graph.assets[compHandle].name;
                //todo:  creating the string / object should be a function
                var $newPlot = $('<li>'+ name + '<ol class="components" data="P'+ p +'"><li class="component"  data="P'+ p +'-C0"></li></0l></li>');
                $liComp.closest("ol.plots").append($newPlot);
            });
            /*$editDiv.find(".comp-close").click(function(evt){
             sortComponentsList($liComp.closest("ul"), plotsEdits);
             $liComp.find(".comp-editor").slideUp("default",function(){ $liComp.find(".comp-editor").remove()});
             $liComp.find(".edit-comp").show();
             });*/
        },
        showPlotEditor:  function showPlotEditor(liPlot){
            var self = this;
            var $liPlot = $(liPlot);
            var oPlot = self.plotsEdits[$liPlot.index()];
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
                + '<button class="plot-delete prov-float-btn" style="background-color: #FF0000;">delete plot</button>'
                + '<fieldset class="edit-line" style="padding: 0 5px;display:inline-block;"><legend>color, thickness, &amp; style</legend>'
                +   '<div class="edit-block"><input class="plot-color" type="text" value="' + (oPlot.options.lineColor|| plotColor) + '" /></div>' + selectThickness + selectStyle
                + '</fieldset>'
                + '<div class="edit-block"><span style="margin:0 10px">name:</span><input class="plot-name" type="text" value="' + plotName(self.graph, oPlot) + '" /></div>'
                + '<div class="edit-block"><span class="edit-label">display as:</span><select class="plot-type"><option value="">graph default</option><option value="line">line</option><option value="column">column</option><option value="area">stacked area</option></select></div>'
                + '<div class="edit-block"><span class="edit-label">units:</span><input class="plot-units long" type="text" value="' + (oPlot.options.units||'') + '" /></div><br>'
                  + '<div class="edit-block"><span class="edit-label">calculations:</span><div class="edit-math">'
                +   '<input type="radio" id="required-'+panelId+'" name="comp-math-'+panelId+'" /><label for="required-'+panelId+'">all series values required</label>'
                +   '<input type="radio" id="missingAsZero-'+panelId+'" name="comp-math-'+panelId+'" /><label for="missingAsZero-'+panelId+'">treat missing values as zeros</label>'
                +   '<input type="radio" id="nullsMissingAsZero-'+panelId+'" name="comp-math-'+panelId+'" /><label for="nullsMissingAsZero-'+panelId+'">treat missing and null values as zeros</label></div>'
                + '</div>'
                + '<div class="edit-block"><span class="edit-label">break line:</span><div class="edit-breaks">'
                +   '<input type="radio" id="nulls-'+panelId+'" name="line-break-'+panelId+'" /><label for="nulls-'+panelId+'">on nulls</label>'
                +   '<input type="radio" id="missing-'+panelId+'" name="line-break-'+panelId+'" /><label for="missing-'+panelId+'">on missing value and nulls</label>'
                +   '<input type="radio" id="never-'+panelId+'" name="line-break-'+panelId+'" /><label for="never-'+panelId+'">never</label></div>'
                + '</div>'
                +'</div>';
            var $editDiv = $(editDiv);    //instantiate the editor
            $liPlot.closest("div.provenance").find("button.plot-close, button.comp-close").click();  //close any open editors
            //text boxes
            $editDiv.find("input.plot-name").change(function(){
                if(plotName(self.graph, oPlot, true) != $(this).val() && $(this).val().trim()!='') oPlot.options.name = $(this).val(); else delete oPlot.options.name;
            });
            $editDiv.find("input.plot-units").change(function(){
                if(plotUnits(self.graph, oPlot, true) != $(this).val() && $(this).val().trim()!='') oPlot.options.units = $(this).val(); else delete oPlot.options.units;
            });
            //buttonsets
            if(!oPlot.options.componentData)oPlot.options.componentData='required'
            $editDiv.find("div.edit-math").find("input[id='"+oPlot.options.componentData+"-"+panelId+"']").click().end().buttonset()
                .find('input:radio').change(function(){
                    oPlot.options.componentData = $(this).closest('div').find(".ui-state-active").attr("for").split('-')[0];
                });
            if(!oPlot.options.breaks)oPlot.options.breaks='nulls'
            $editDiv.find("div.edit-breaks").find("input[id='"+oPlot.options.breaks+'-'+panelId+"']").click().end().buttonset().find('input:radio').change(function(){
                oPlot.options.breaks = $(this).closest('div').find(".ui-state-active").attr("for").split('-')[0];
            });
            //line color and style
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

            //buttons
            $editDiv.find("button.plot-delete").button({icons: {secondary: 'ui-icon-trash'}}).addClass('ui-state-error').click(function(){
                self.plotsEdits.splice($liPlot.index(),1);
                $liPlot.remove();
            });
            $editDiv.find("button.plot-copy").button({icons: {secondary: 'ui-icon-copy'}}).click(function(){
                self.plotsEdits.push($.extend(true,{},oPlot));
                self.build(plotIndex);
            });
            $editDiv.find("button.plot-close").button({icons: {secondary: 'ui-icon-arrowstop-1-n'}}).click(function(){
                $liPlot.find(".edit-plot, .plot-info, .line-sample").show();
                $liPlot.find(".plot-editor").slideUp("default",function(){
                    $liPlot.find('.op.ui-buttonset').remove();
                    $liPlot.find('.plot-op').show();
                    $liPlot.find(".plot-editor").remove();
                    $liPlot.find("li button").remove()
                });
                $liPlot.find(".comp-editor").slideUp("default",function(){$(this).remove()});
                $liPlot.find(".edit-plot").show();
            });
            $editDiv.prependTo($liPlot).slideDown();
        }
    };
    return controller;
}

function hContinuousColor(a, b){
    return '<span class="map_legend_gradient" style="-ms-filter: progid:DXImageTransform.Microsoft.gradient(startColorstr='+a+', endColorstr='+b+', gradientType=1);filter: progid:DXImageTransform.Microsoft.gradient(startColorstr='+a+', endColorstr='+b+', gradientType=1)background-image: -webkit-gradient(linear, left bottom, right bottom, from('+a+'), to('+b+'));background-image: -webkit-linear-gradient(left, '+a+', '+b+');background-image: -moz-linear-gradient(left, '+a+', '+b+');background-image:  -o-linear-gradient(left, '+a+', '+b+';background-image: linear-gradient(to left, '+a+','+b+');"></span>';
    //return '<span class="map_legend_gradient" style="-ms-filter: progid:DXImageTransform.Microsoft.gradient(startColorstr=#7ce3ff, endColorstr=#00355b, gradientType=1); filter: progid:DXImageTransform.Microsoft.gradient(startColorstr=#7ce3ff, endColorstr=#00355b, gradientType=1)background-image: -webkit-gradient(linear, left bottom, right bottom, from(#7ce3ff), to(#00355b));background-image: -webkit-linear-gradient(left, #7ce3ff, #00355b);background-image:    -moz-linear-gradient(left, #7ce3ff, #00355b);background-image:      -o-linear-gradient(left, #7ce3ff, #00355b;background-image:         linear-gradient(to left, #7ce3ff,#00355b);"></span>';
}