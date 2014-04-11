/**
 * Created with JetBrains PhpStorm.
 * User: mark__000
 * Date: 2/17/13
 * Time: 11:13 PM
 * To change this template use File | Settings | File Templates.
 */

//PROVENANCE PANEL CREATOR AND HELPER FUNCTIONS
function ProvenanceController(panelId){
    var mapsetLegend, pointsetLegend, MD = MashableData, globals = MD.globals, grapher = MD.grapher;
    var dashStyles = globals.dashStyles,
        sdf = globals.DEFAULT_RADIUS_FIXED,
        DEFAULT_RADIUS_SCALE = globals.DEFAULT_RADIUS_SCALE,
        hcColors = globals.hcColors,
        period = globals.period,
        op = globals.op,
        MAP_COLORS = globals.MAP_COLORS,
        plotName = grapher.plotName,
        plotUnits = grapher.plotUnits,
        plotFormula = grapher.plotFormula,
        fillScalingCount = grapher.fillScalingCount,
        eachComponent = grapher.eachComponent;


    var controller = {
        HTML: {
            /*            nLanding: '<li class="component-landing"><span class="landing">drag numerator series here</span></li>',
             dLanding: '<li class="component-landing"><span class="landing">drag denominator series here</span></li>',*/
            compMath: '<div class="edit-block">'
                +       '<div class="edit-math">'
                +           '<input type="radio" id="required-'+panelId+'" name="comp-math-'+panelId+'" data="compMath"  value="required"/><label for="required-'+panelId+'">all values required else null</label>'
                +           '<input type="radio" id="missingAsZero-'+panelId+'" name="comp-math-'+panelId+'" data="compMath"  value="missingAsZero"/><label for="missingAsZero-'+panelId+'">use zero for missing values</label>'
                +           '<input type="radio" id="nullsMissingAsZero-'+panelId+'" name="comp-math-'+panelId+'" data="compMath" value="nullsMissingAsZero"/><label for="nullsMissingAsZero-'+panelId+'">use zero for missing and null values</label>'
                +       '</div>'
                +   '</div>'
        },
        graph: globals.panelGraphs[panelId],
        $prov: $('#'+panelId + ' .provenance'),
        isDirty: false,
        build:  function build(plotIndex){  //redo entire panel if plotIndex omitted
            var self = this;
            var i, j, plotList, mapList, plot, okcancel;
            self.$prov.show(); //compensation for margins @ 15px + borders
            okcancel = '<button class="config-cancel">cancel edits</button>';
            plotList = '';
            if(typeof plotIndex != 'undefined'){
                if(self.$prov.find('.chart-plots').length==0) self.$prov.find('.config-cancel').after('<div class="chart-plots"><H4>Chart</H4><ol class="plots"></ol></div');
                self.$prov.find('ol.plots').append( self.plotHTML(plotIndex) );
            } else {
                if(self.graph.plots) self.plotsEdits = $.extend(true, [], self.graph.plots);  //this is the copy that the provenance panel will work with.  Will replace graph.plots on "OK"
                self.annoEdits = $.extend(true, [], self.graph.annotations);
                if(self.graph.mapsets) self.mapsetEdits = $.extend(true, {}, self.graph.mapsets);
                if(self.graph.pointsets) self.pointsetsEdits = $.extend(true, [], self.graph.pointsets);
                self.mapconfigEdits= $.extend(true, {}, self.graph.mapconfig);


                if(self.plotsEdits){
                    plotList = '<div class="chart-plots"><H4>Chart</H4><ol class="plots">';

                    for(i=0;i<self.plotsEdits.length;i++){
                        //outer PLOT loop
                        plotList += self.plotHTML(i);
                    }
                }

                plotList += '</ol>'
                    +  '<ol class="blank-plot landing components" style=""><li class="not-sortable">Drag and drop to plot lines to reorder them.  Drag and drop multiple series into a plot to create sums and ratios. Drag a series here to create a new plot line.</i></li></ol></div>';
                mapList = self.provenanceOfMap();
                self.$prov.html(okcancel + plotList + mapList);

                if(self.mapsetEdits) mapsetLegend = this.legendEditor(self.$prov.find('.mapset-colors'), this.mapsetEdits.options, 'M');
                if(self.pointsetsEdits) {
                    pointsetLegend = this.legendEditor(self.$prov.find('.pointsets-colors'), this.mapconfigEdits, 'X');
                    if(self.mapconfigEdits.markerScaling) self.$prov.find('div.pointsets div.color-scale').slideDown();
                    /* NO SIMPLE MARKERS = FINISH CURRENT FUNCTIONALITY !!!
                     self.$prov.find('.marker-scaling input').change(function(){
                     self.mapconfigEdits.markerScaling = (this.checked?'none':'yes');
                     self.$prov.find('div.pointsets div.color-scale').slideToggle();
                     self.$prov.find('.attribute').slideToggle();
                     makeDirty();
                     });*/
                }
                self.$prov.find('select.cubeSelector').change(function(){
                    self.set(self.mapconfigEdits, $(this));
                    delete self.graph.assets.cube;
                });
                self.$prov.find('.map-mode').buttonset()
                    .find('input').click(function(){
                        self.mapsetEdits.options.mode = $(this).val();
                        if(self.mapsetEdits.options.mode=='bubble' && !self.mapsetEdits.options.merges) {
                            self.mapsetEdits.options.merges = [];
                        } else {
                            $merge.show();
                        }
                    });
                var $merge = self.$prov.find('.merge-mode').buttonset()
                    .find('input').click(function(){
                        self.mapsetEdits.options.merge = $(this).val();
                    });
                if(self.mapsetEdits && (!self.mapsetEdits.options.mode || self.mapsetEdits.options.mode=='bubble')) $merge.hide();


                //main buttons
                self.$prov.find("button.config-cancel")
                    .button({disabled: true, icons: {secondary: 'ui-icon-closethick'}}).addClass('ui-state-error')
                    .click(function(){
                        self.provClose();
                    });
                self.$prov.find("button.config-apply").button({icons: {secondary: 'ui-icon-check'}}).click(function(){
                    self.provOk();
                });
            }

            //all matching prov components, therefore unbind before binding
            self.$prov.find("li.plot").off("click").click(function(evt){
                if(!evt.isPropagationStopped()){
                    evt.stopPropagation();
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
                    $liPlot.find("li.component").each(function(){
                        self.showComponentEditor(this, 'plot');
                    });
                    self.showPlotEditor($liPlot);
                });

            self.$prov.find(".edit-mapset")
                .button({icons: {secondary: 'ui-icon-pencil'}})
                .off("click")
                .click(function(){
                    self.sortableOff();
                    self.$prov.find('.mapset').find("ol.map-comp li.component").each(function(){
                        self.showComponentEditor(this, 'mapset');
                    });
                    self.showMapSetEditor();
                });

            self.$prov.find(".edit-pointset")
                .button({icons: {secondary: 'ui-icon-pencil'}})
                .off("click")
                .click(function(){
                    var $liPlot = $(this).closest("li");
                    $liPlot.find("ol li.component").each(function(){
                        self.showComponentEditor(this, 'pointset');
                    });
                    self.showPointSetEditor($liPlot);
                });
            self.sortableOn();
        },
        plotHTML:  function plotHTML(i){
            var self = this;
            var graph = self.graph;
            var plotColor, plotList = '', plot = self.plotsEdits[i];
            plot.options.lineWidth = plot.options.lineWidth||2;
            plot.options.lineStyle = plot.options.lineStyle || 'Solid';
            plotColor = plot.options.color || ((self.graph.chart&&self.graph.chart.get('P'+i))?self.graph.chart.get('P'+i).color:hcColors[i%hcColors.length]);
            plotList += '<li class="plot" data="P' + i + '">'
                + '<button class="edit-plot">configure</button>'
                + '<div class="line-sample" style="background-color:'+plotColor+';height:'+plot.options.lineWidth+'px;"><img src="images/'+plot.options.lineStyle+'.png" height="'+plot.options.lineWidth+'px" width="'+plot.options.lineWidth*38+'px"></div>'
                + '<div class="plot-info" style="display:inline-block;"><span class="plot-title">'
                + plotName(graph, plot)+'</span> (' + self.plotPeriodicity(plot)+') in <span class="plot-units">' + plotUnits(graph, plot) + '</span></div>'
                + '<span class="plot-formula">= ' + plotFormula(plot).formula + '</span><br>'
                + self.componentsHTML(plot)
                + '</li>';
            return plotList;
        },
        componentsHTML: function(plot){
            var plotList, comp, type='plot', compHTML='', graph = this.graph;
            var algorithm = {
                sum: 'summing',
                wavg: 'day-weighted averaging of'
            };
            for(var j=0;j< plot.components.length;j++){
                //inner COMPONENT loop
                comp = plot.components[j];
                if(plot.components[j].options.op==null)plot.components[j].options.op="+";
                if(comp.handle[0]=='M')type='map';  //overides default = 'plot'
                if(comp.handle[0]=='X')type='point';
                compHTML += '<li class="component ui-state-default" data="'+comp.handle+'">'
                    + '<span class="plot-op ui-icon ' + op.cssClass[plot.components[j].options.op] + '">operation</span> '
                    + '<span class="comp-edit-k" style="display:none;"><input class="short" value="'+(comp.options.k||1)+'"> * </span>'
                    + (comp.handle[0]=='X'?iconsHMTL.pointset:(comp.handle[0]=='M'?iconsHMTL.mapset:''))
                    + graph.assets[comp.handle].name
                    + ' ('
                    + (plot.options.fdown!=graph.assets[comp.handle].period&&plot.options.algorithm?period.name[graph.assets[comp.handle].period]+' created by <a href="/workbench-help/changing-frequency/" traget="_blank">'+algorithm[plot.options.algorithm] +'</a> '+period.name[graph.assets[comp.handle].period]+' data':period.name[graph.assets[comp.handle].period])
                    + ') in '
                    + graph.assets[comp.handle].units
                    + (type=='plot'?' <a class="link comp-view">view source data</a>':'')
                    + '</li>';

            }
            plotList = '<ol class="components '+type+'-comp">'+compHTML + '</ol>';
            return plotList;
        },
        plotPeriodicity:   function plotPeriodicity(plot){
            var self = this;
            var sHandle, comp, fromPeriodicity;
            if(plot.options.fdown){
                fromPeriodicity = plot.options.fdown;
            } else {  //if no frequency downshift is specified, all components must be the same
                fromPeriodicity = self.graph.assets[plot.components[0].handle].period;
            }
            if(plot.options.fdown){
                return '<span class="plot-freq">'+period.name[plot.options.fdown]+' synthesized</span>';
            } else {
                return '<span class="plot-freq">'+period.name[fromPeriodicity]+'</span>';
            }
        },
        sortableOff: function(){
            var self = this;
            self.$prov.find("ol.plots").sortable('disable').enableSelection();
            self.$prov.find("ol.components").sortable('disable').enableSelection();
            self.$prov.find("ol.pointsets").sortable('disable').enableSelection();
        },
        sortableOn: function(){
            var self = this;
            self.$prov.find("ol.components")
                .sortable({
                    containment: self.$prov.get(0),
                    connectWith: ".components",
                    disabled: false,
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
                        compIndex = ui.item.index();

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
            self.$prov.find("ol.plots")
                .sortable({
                    axis: "y",
                    dropOnEmpty: false,
                    connectWith: ".plots",
                    disabled: false,
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
                        makeDirty();
                    }
                })
                .disableSelection();
            self.$prov.find("ol.pointsets")
                .sortable({
                    axis: "y",
                    dropOnEmpty: false,
                    connectWith: ".pointsets",
                    disabled: false,
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
                        makeDirty();
                    }
                })
                .disableSelection();
            this.$prov.find('a.comp-view').off().click(function(){
                var compHandle = $(this).closest('li').attr('data');
                if(compHandle){
                    preview(self.graph.assets[compHandle]);
                }
            });
        },
        componentMoved:  function componentMoved(ui){  //triggered when an item is move between lists or sorted within.  Note that moving between plot lists triggers two calls
            //first find out whether a sort or a move, and whether that move empty or created a new component.
            var self = this;
            var $targetSeriesList, pFromHandle, draggedComponent;
            var i, handle, thisHandle, from, fromC, toC, fromP, toP, toOp, toType, toPlotObject;  //indexes
            var $prov = self.$prov;
            //sortable's update event gets triggered for each OL of components involved.  If the ui.sender is null, the event is trigger by the sending OL.
            if(ui.sender==null && ui.item.closest('ol')[0]!=self.dragging.$ol[0]) return; //prevent double call, but allow when sorting within

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
                self.$prov.find("ol.components").sortable("cancel");
                dialogShow('mapset restrictions', 'A mapset is a grouping of series, each correspond to an area on a map, such as a state or country.  Mapsets cannot be mixed with marker sets or displayed on a line graph.<br><br>Note that from from the map, you can easily select and chart any of this mapsets\' component series.');
                return;
            }
            if(thisHandle[0]=='M' && toType!='map'){
                self.$prov.find("ol.components").sortable("cancel");
                dialogShow('mapset restrictions', 'A pointset is a grouping of series, each correspond to a precise location determined by longitude and latitude values.  Pointsets cannot be mixed with area mapsets or displayed a line graph.<br><br>Note that from from the map, you can easily select and chart any of this pointsets\' component series.');
                return;
            }

            //duplicate series in same plot not permitted
            if(toP!=self.dragging.plotIndex && self.dragging.type==toType && ui.item.closest('ol')[0]!=self.dragging.$ol[0]){
                for(i=0;i<toPlotObject.components.length;i++){
                    if(toPlotObject.components[i].handle == thisHandle) {
                        self.$prov.find("ol.components").sortable("cancel");
                        dialogShow('duplicate series', 'This series is already a component of the target plot.<br><br>If you want to use a series multiple times in the plot formula, use <button class="manual ui-button ui-widget ui-state-default ui-corner-all ui-button-text-icon-secondary ui-state-hover" role="button" aria-disabled="false"><span class="ui-button-text">manual editing</span><span class="ui-button-icon-secondary ui-icon ui-icon-pencil"></span></button> of the formula from with the <button class="manual ui-button ui-widget ui-state-default ui-corner-all ui-button-text-icon-secondary ui-state-hover" role="button" aria-disabled="false"><span class="ui-button-text">manual editing</span><span class="ui-button-icon-secondary ui-icon ui-icon-pencil"></span></button> plot instead.');
                        return;
                    }
                }
            }

            if(toP!=self.dragging.plotIndex && self.dragging.type==toType && !newPlot){
                for(i=0;i<toPlotObject.components.length;i++){
                    if(self.graph.assets[thisHandle].period!=self.graph.assets[toPlotObject.components[i].handle].period){
                        self.$prov.find("ol.components").sortable("cancel");
                        dialogShow('frequency discrepancy', 'When performing array math, the sample frequency of all component series must be the same.');
                        return;
                    }
                }
            }

            //we are good to move!  So...

            //1. remove unneeded landing <li>s
            ui.item.parent().find('.component-landing').remove();
            //2. add a landing to the source <ol> if needed
            /*if(self.dragging.$ol.children("li").length==0){
             if(self.dragging.$ol.hasClass('numer')){
             self.dragging.$ol.append(self.HTML.nLanding);
             } else {
             self.dragging.$ol.append(self.HTML.dLanding);
             }
             }*/
            //3. remove the component
            var cmp = self.dragging.obj.components.splice(self.dragging.compIndex,1)[0];
            //4. set the numer/denom flag and add the component
            toC = ui.item.index();

            if(newPlot){
                toPlotObject = {options: {}, components: [cmp]};
                self.plotsEdits.push(toPlotObject);
                self.$prov.find('ol.plots').append(self.plotHTML(self.plotsEdits.length-1));
            } else {
                toPlotObject.components.splice(toC,0,cmp);
            }
            self.setFormula(toPlotObject, ui.item.closest(".plot"));

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
            } else { //recalc the formula of the sender
                self.setFormula(self.dragging.obj, self.dragging.$ol.parent());
            }
            if(newPlot) {
                ui.item.remove();  //the spare component in the new plot landing zone
                self.sortableOn();
            }
            //6. you are DIRTY!
            makeDirty();

        },
        provOk: function provOk(noRedraw){//save change to graph object and rechart
            //TODO: save and rechart
            var self = this;
            if(self.isDirty && (self.plotsEdits||self.mapsetEdits||self.pointsetsEdits)){
                if(self.plotsEdits && self.plotsEdits.length>0) self.graph.plots = self.plotsEdits; else delete self.graph.plots;
                self.graph.annotations = self.annoEdits;
                if(self.mapsetEdits && self.mapsetEdits.components && self.mapsetEdits.components.length>0) self.graph.mapsets = self.mapsetEdits; else delete self.graph.mapsets;
                if(self.pointsetsEdits && self.pointsetsEdits.length>0) self.graph.pointsets = self.pointsetsEdits; else delete self.graph.pointsets;
                self.graph.mapconfig = self.mapconfigEdits;
                if(!self.graph.mapsets && !self.graph.pointsets) self.graph.map='';  //remove map
                this.provClose();
                if(!noRedraw) $('#'+panelId).find(".graph-type").change();  //trigger redaw
            }
        },
        provClose:  function provClose(){ //called directly from cancel btn = close without saving
            var self = this;
            delete self.plotsEdits;
            delete self.annoEdits;
            delete self.mapsetEdits;
            delete self.pointsetsEdits;
            delete self.mapconfigEdits;
            self.$prov.find("ol.ui-sortable").sortable("destroy");
            self.$prov.closest('div.graph-panel').find('.graph-nav-graph').click();
            self.isDirty = false;
        },
        compIndex: function(liComp){
            var $liComp = $(liComp);
            var cmpIndex = $liComp.index();
            return cmpIndex;
        },
        showComponentEditor:  function showComponentEditor(liComp, type){
            var self = this;
            var plot, components, $liComp = $(liComp);
            var plotIndex = $(liComp).closest('li.plot, li.pointset').index();
            if(type=="mapset") plot = self.mapsetEdits;
            if(type=="pointset") plot = self.pointsetsEdits[plotIndex];
            if(type=="plot") plot = self.plotsEdits[plotIndex];
            var iComp = self.compIndex($liComp); //could have just gotten index of liComp as the object should be in sync
            var compHandle = $(liComp).attr('data');
            var component = plot.components[iComp];
            var editDiv = (globals.vectorPattern.test(compHandle)?'<button class="comp-copy prov-float-btn">make copy</button>':'')
                + '<button class="comp-delete prov-float-btn">remove series</button>'
            var $editDiv = $(editDiv);
            $liComp.find(".plot-op").hide().after(
                '<div class="op">'
                    +       '<input type="radio" data="+"  id="op-addition'+compHandle+'" value="+" name="op-radio'+compHandle+'" /><label for="op-addition'+compHandle+'">+</label>'
                    +       '<input type="radio" data="-"  id="op-subtraction'+compHandle+'" value="-" name="op-radio'+compHandle+'" /><label for="op-subtraction'+compHandle+'">-</label>'
                    +       '<input type="radio" data="*"  id="op-multiply'+compHandle+'" value="*" name="op-radio'+compHandle+'" /><label for="op-multiply'+compHandle+'">*</label>'
                    +       '<input type="radio" data="/"  id="op-divide'+compHandle+'" value="/" name="op-radio'+compHandle+'" /><label for="op-divide'+compHandle+'">/</label>'
                    //+       '<input type="radio" data="(..)*(..)"  id="op-term-multiply'+compHandle+'" value="(..)*(..)" name="op-radio'+compHandle+'" /><label for="op-term-multiply'+compHandle+'"><b>()*</b></label>'
                    //+       '<input type="radio" data="(..)/(..)"  id="op-term-divide'+compHandle+'" value="(..)/(..)" name="op-radio'+compHandle+'" /><label for="op-term-divide'+compHandle+'"><b>(..)/</b></label>'
                    +   '</div>');
            $liComp.find("div.op").find("input[data='"+component.options.op+"']").attr('checked','checked')
                .end()
                .buttonset()
                .find('input:radio')
                .change(function(){
                    self.set(plot.components[iComp].options, 'op', $(this).val());
                    self.setFormula(plot, $liComp.closest(".plot,.mapset"));
                    $liComp.find('.plot-op').attr('class','plot-op ui-icon ' + op.cssClass[plot.components[iComp].options.op]);
                });

            $editDiv.appendTo($liComp).slideDown();  //add the new comp editor and animate it open
            //add UI events
            /*            $editDiv.find("ul.comp-op li").click(function(){
             $editDiv.find("li.selected").removeClass("selected");
             component.options.op = $(this).closest("li").addClass("selected").attr('data');
             $editDiv.closest("span.plot-op").attr("class","plot-op ui-icon " + op.cssClass[component.options.op]);
             });*/
            $liComp.find('.comp-edit-k').show()
                .find("input").change(function(){
                    if(!isNaN(parseFloat(this.value))){
                        component.options.k = Math.abs(parseFloat(this.value));
                        if(component.options.k==0) component.options.k=1;
                        makeDirty();
                        self.setFormula(plot,$liComp.closest('ol').parent());
                    }  else {
                        dialogShow('Error','Scalors must be numerical');
                    }
                    $(this).val(component.options.k);
                });
            $liComp.find(".comp-delete").button({icons: {secondary: 'ui-icon-trash'}}).addClass('ui-state-error').click(function(){
                if(plot.components.length==1) {
                    $liComp.closest('li.plot, div.mapset').find('.plot-delete').click();
                } else {
                    plot.components.splice(iComp,1);
                    $liComp.remove();
                    makeDirty();
                }
            });
            $liComp.find(".comp-copy").button({icons: {secondary: 'ui-icon-copy'}}).click(function(){ //copy make a new plot, even if in X or M
                var newPlot = {options: {}, components: [$.extend(true, {}, component, {options: {op: '+'}})]};
                self.plotsEdits.push(newPlot);
                var name = self.graph.assets[compHandle].name;
                self.$prov.find("ol.plots").append(self.componentsHTML(newPlot));
            });
        },
        showPlotEditor:  function showPlotEditor(liPlot){
            var self = this;
            self.sortableOff();
            var $liPlot = $(liPlot);
            var plotIndex = $liPlot.index();
            var oPlot = self.plotsEdits[plotIndex];
            var options = oPlot.options;
            var plotColor = oPlot.options.color||self.graph.chart.get('P' + $liPlot.index()).color;
            $liPlot.find(".edit-plot, .plot-info").hide();
            //line thickness selector
            var selectThickness='<select class="plot-thickness" data="lineWidth">';
            for(var t=1;t<=5;t++) selectThickness+='<option value="'+t+'">'+t+'px</option>';
            selectThickness += '</select>';
            //line style (solid, dots, dash...) selector
            var selectStyle = '<select class="plot-linestyle" data="lineStyle">';
            for(var ds=0;ds<dashStyles.length;ds++) selectStyle += '<option value="' +dashStyles[ds].replace(/ /g,'')+ '">' +dashStyles[ds].toLowerCase()+ '</option>';
            selectStyle += '</select>';

            //plotFrequency
            var f = options.fdown || self.graph.assets[oPlot.components[0].handle].period;
            var fOptions = this.freqOptions(oPlot);


            var editDiv = '<div class="plot-editor" style="display: none;">'
                + '<button class="plot-close prov-float-btn">close</button>'
                + '<button class="plot-copy prov-float-btn">make copy</button>'
                + '<button class="plot-delete prov-float-btn">delete plot</button>'
                + '<fieldset class="edit-line" style="padding: 0 5px;display:inline-block;"><legend>color, thickness, &amp; style</legend>'
                +   '<div class="edit-block"><input class="plot-color" type="text" data="color" value="' + (oPlot.options.color|| plotColor) + '" /></div>' + selectThickness + selectStyle
                + '</fieldset>'
                + '<div class="edit-block">Name: <input class="plot-name" type="text" data="name" /></div>'
                + '<div class="edit-block"><span class="edit-label">display as:</span><select class="plot-type" data="type"><option value="">graph default</option><option value="line">line</option><option value="column">column</option><option value="area">stacked area</option></select></div>'
                + '<div class="edit-block"><span class="edit-label">units:</span><input class="plot-units long" data="units" type="text"  /><span class="plot-edit-k edit-label">scalor:<input class="short" value="'+(oPlot.options.k||1)+'"></span> '
                + '<span class="edit-label">frequency:</span><select class="dshift">'+ fOptions +'</select></div><br>'
                + '<span class="edit-label">Point calculations:</span>'
                + self.HTML.compMath
                + '<div class="edit-block"><span class="edit-label">Break line</span><div class="edit-breaks">'
                +   '<input type="radio" id="never-'+panelId+'" name="line-break-'+panelId+'" data="breaks" value="never" /><label for="never-'+panelId+'">never</label>'
                +   '<input type="radio" id="nulls-'+panelId+'" name="line-break-'+panelId+'" data="breaks" value="nulls" /><label for="nulls-'+panelId+'">on nulls</label>'
                +   '<input type="radio" id="missing-'+panelId+'" name="line-break-'+panelId+'" data="breaks" value="missing" /><label for="missing-'+panelId+'">on missing value and nulls</label></div>'
                + '</div>'
                +'</div>';
            var $editDiv = $(editDiv);    //instantiate the editor
            self.$prov.find("button.plot-close").click();  //close any open editors
            //text boxes
            $editDiv.find("input.plot-name").val(plotName(self.graph, oPlot)).change(function(){
                if(plotName(self.graph, oPlot, true) != $(this).val() && $(this).val().trim()!='') oPlot.options.name = $(this).val(); else delete oPlot.options.name;
                makeDirty();
            });
            $editDiv.find("input.plot-units").val(plotUnits(self.graph, oPlot)).change(function(){
                if(plotUnits(self.graph, oPlot, true) != $(this).val() && $(this).val().trim()!='') {
                    oPlot.options.units = $(this).val();
                } else {
                    delete oPlot.options.units;
                }
                $liPlot.find('span.plot-units').html(plotUnits(self.graph, oPlot));
                makeDirty();
            });
            $editDiv.find('select.dshift').val(f).change(function(){
                var newF = $(this).val();
                var synF = $editDiv.find('select.dshift option:selected').attr('data');

                if(newF != synF){
                    /* $.each(oPlot.components, function(){
                     if(!maxF||period.value[maxF]<period.value[self.graph.assets[this.handle].period]) maxF = self.graph.assets[this.handle].period
                     });*/
                    selectDownshift(self.graph, newF, oPlot, function(oDown){
                        if(oDown){
                            options.fdown = newF;
                            options.algorithm = oDown.algorithm;
                            options.missing = oDown.missing;
                            $.each(oPlot.components, function(){ //swap in new series where possible
                                var asset = self.graph.assets[this.handle];
                                if(asset.freqset[newF]){
                                    this.handle = asset.freqset[newF];
                                } else {
                                    this.handle = asset.freqset[newF=='A'&&asset.freqset.Q?'Q':'M'];
                                }
                            });
                            f = newF;
                            self.fetchNewSeries(oPlot);
                            makeDirty();
                        } else {
                            $editDiv.find('select.dshift').val(f);  //reset to former value
                        }
                    })
                } else {
                    //able plot at new frequency using only API series...
                    delete options.fdown;  //..therefore remove the downshift params
                    delete options.algorithm;
                    delete options.missing;
                    $.each(oPlot.components, function(){ //and swap in new series
                        this.handle = self.graph.assets[this.handle].freqset[newF];
                    });
                    f = newF;
                    self.fetchNewSeries(oPlot);
                    makeDirty();
                }
            });
            //buttonsets
            if(!oPlot.options.componentData)oPlot.options.componentData='required'
            $editDiv.find("div.edit-math").find("input[id='"+oPlot.options.componentData+"-"+panelId+"']").click().end().buttonset()
                .find('input:radio').change(function(){
                    oPlot.options.componentData = $(this).closest('div').find(".ui-state-active").attr("for").split('-')[0];
                    makeDirty();
                });
            if(!oPlot.options.breaks)oPlot.options.breaks='nulls'
            $editDiv.find("div.edit-breaks").find("input[id='"+oPlot.options.breaks+'-'+panelId+"']").click().end().
                buttonset().find('input:radio')
                .change(function(){
                    self.set(oPlot.options, $(this));  //oPlot.options.breaks = $(this).val();
                });
            //line color and style
            $editDiv.find(".edit-line legend").after($liPlot.find(".line-sample").hide().clone().css("display","inline-block").show());
            $editDiv.find("input.plot-color").colorPicker().change(function(){
                self.set(oPlot.options, $(this));
                $liPlot.find("div.line-sample").css('background-color',oPlot.options.color);
            });
            $editDiv.find("select.plot-thickness").val(oPlot.options.lineWidth).change(function(){
                self.set(oPlot.options, $(this));   //oPlot.options.lineWidth = $(this).val();
                $liPlot.find("div.line-sample").css("height",oPlot.options.lineWidth).find("img").css("height",oPlot.options.lineWidth).css("width",(parseInt(oPlot.options.lineWidth.substr(0,1)*38)+'px'))
            });
            $editDiv.find("select.plot-linestyle").val(oPlot.options.lineStyle).change(function(){
                self.set(oPlot.options, $(this));   //oPlot.options.lineStyle = $(this).val();
                $liPlot.find("div.line-sample img").attr("src","images/"+oPlot.options.lineStyle+'.png');
            });
            $editDiv.find("select.plot-type").val(oPlot.options.type).change(function(){
                self.set(oPlot.options, $(this));   //oPlot.options.type = $(this).val();
            });
            $editDiv.find('.plot-edit-k input').change(function(){
                if(!isNaN(parseFloat(this.value))){
                    oPlot.options.k = Math.abs(parseFloat(this.value));
                    if(oPlot.options.k==0)oPlot.options.k=1;
                    self.setFormula(oPlot, $liPlot);
                    makeDirty();
                }  else {
                    dialogShow('Error','Scalors must be numerical');
                }
                $(this).val(oPlot.options.k||1);
            });
            //buttons
            $editDiv.find("button.plot-delete").button({icons: {secondary: 'ui-icon-trash'}}).addClass('ui-state-error').click(function(){
                self.plotsEdits.splice($liPlot.index(),1);
                $liPlot.remove();
                makeDirty();
            });
            $editDiv.find("button.plot-copy").button({icons: {secondary: 'ui-icon-copy'}}).click(function(){
                self.plotsEdits.push($.extend(true,{},oPlot));
                self.build(plotIndex);
            });
            $editDiv.find("button.plot-close").button({icons: {secondary: 'ui-icon-arrowstop-1-n'}}).click(function(){
                var k;
                $liPlot.find(".edit-plot, .plot-info, .line-sample, span.plot-formula").show();
                $liPlot.find(".plot-editor").slideUp("default",function(){
                    $liPlot.find('.op.ui-buttonset').remove();
                    if(!options.userFormula) $liPlot.find('.plot-op').show();
                    $liPlot.find(".plot-editor, button.manual, button.guided, input.plot-formula").remove();
                    $liPlot.find("li button").remove();
                    $editDiv.remove();
                });

                $liPlot.find('.comp-edit-k').hide();


                self.$prov.find('.landing').slideDown();
                $liPlot.find(".comp-editor").slideUp("default",function(){$(this).remove()});
                $liPlot.find(".edit-plot").show();
                self.sortableOn();
            });
            $editDiv.prependTo($liPlot);
            this.editPlotFormula(oPlot, $liPlot);
            $editDiv.slideDown();
            self.$prov.find('.landing').slideUp();
        },
        freqOptions: function(plot){
            var i, c, allComps, asset, options = '', freqs={}, thisPeriod;
            //1. see what alternative periodicities exist is the APIs datasets
            for(i=0;i<period.order.length;i++){
                allComps = true;
                thisPeriod = period.order[i];
                for(c=0;c<plot.components.length;c++){
                    asset = this.graph.assets[plot.components[c].handle];
                    if(!asset.freqset) {
                        asset.freqset = {};
                        asset.freqset[asset.period] = asset.handle;
                    }
                    if(!asset.freqset[thisPeriod]) allComps = false;
                }
                if(allComps){
                    options += '<option value="'+thisPeriod+'" data="'+thisPeriod+'">'+period.name[thisPeriod]+' using official data</option>';
                    freqs[thisPeriod] = true;
                }
            }
            //2. add options to calculate Quarterly and Annual periodicities if (A) they don't exist and (B) the right precursor periodicities exist
            if(!freqs['Q'] && freqs['M']) options += '<option value="Q" data="M">'+period.name.Q +' calculated from monthly data</option>';
            if(!freqs['A'] && (freqs['M'] || freqs['Q'])) options += '<option value="A" data="'+(freqs['Q']?'Q':'M')+'">'+period.name.A +' calculated from '+(freqs['Q']?period.name.Q:period.name.M)+' data</option>';

            return options;
        },
        fetchNewSeries: function (oPlot){
            var self = this, assetsToFetch = {S:[],U:[], X:[], M:[]};
            $.each(oPlot.components, function(){ assetNeeded(this.handle, self.graph, assetsToFetch)});
            fetchAssets(self.graph, assetsToFetch, unmask);
        },
        showPointSetEditor: function($liPointSet){
            var self = this;
            self.sortableOff();
            //var $liPointSet = $(liPointSet);
            var oPointset = self.pointsetsEdits[$liPointSet.index()];
            var options = oPointset.options;

            $liPointSet.find(".edit-plot, .plot-info").hide();

            var editDiv =     '<div class="plot-editor" style="display: none;">'
                + '<button class="plot-close prov-float-btn">close</button>'
                + '<button class="plot-copy prov-float-btn">make copy</button>'
                + '<button class="plot-delete prov-float-btn">delete marker set</button>'
                + '<div class="edit-block"><input class="marker-color" type="text" data="color" value="' + (options.color) + '" /></div>'
                + '<div class="edit-block">name: </span><input class="plot-name" type="text"  /></div>'
                + '<div class="edit-block"><span class="edit-label">units:</span><input class="plot-units long" type="text" /><span class="plot-edit-k"><input class="short" value="'+(options.k||1)+'"> </div><br>'
                + '<span class="edit-label attribute">Values will change marker  </span>'
                + '<div class="attribute">'
                +   '<input type="radio" name="attribute-'+panelId+'" id="attribute-r-'+panelId+'" data="attribute" value="r"/><label for="attribute-r-'+panelId+'">area</label>'
                +   '<input type="radio" name="attribute-'+panelId+'" id="attribute-fill-'+panelId+'" data="attribute" value="fill" /><label for="attribute-fill-'+panelId+'">color</label>'
                + '</div>'
                + '<span class="edit-label">Point calculations:</span>'
                + self.HTML.compMath
                //+   '<label><input type="radio" name="attribute-'+panelId+'"  data="attribute" value="none" />no scaling</label>'
                + '</div>'
                + '</div>';
            var $editDiv = $(editDiv);    //instantiate the editor
            self.$prov.find("button.plot-close").click();  //close any open editors

            var $editDiv = $(editDiv);
            //text boxes
            $editDiv.find("input.plot-name").val(plotName(self.graph, oPointset)).change(function(){
                if(plotName(self.graph, oPointset, true) != $(this).val() && $(this).val().trim()!='') options.name = $(this).val(); else delete options.name;
                makeDirty();
            });
            $editDiv.find("input.plot-units").val(plotUnits(self.graph, oPointset)).change(function(){
                if(plotUnits(self.graph, oPointset, true) != $(this).val() && $(this).val().trim()!='') options.units = $(this).val(); else delete options.units;
                makeDirty();
            });
            $editDiv.find('.plot-edit-k input').change(function(){
                if(!isNaN(parseFloat(this.value))){
                    options.k = Math.abs(parseFloat(this.value));
                    if(options.k==0)options.k=1;
                    self.setFormula(oPointset, $liPointSet);
                }  else {
                    dialogShow('Error','Scalors must be numerical');
                }
                $(this).val(options.k||1);
            });
            //color picker
            $editDiv.find('.marker-color').colorPicker().change(function(){
                self.set(options, $(this));  //particular pointset ooptions;
                $editDiv.find('div.marker').css('background-color', $(this).val()); //set the hidden marker's color for correction resume
            });
            function showHideMarkerColorPicker(){ //show if this and all other pointset are not fill
                for(var ps=0; ps<self.pointsetsEdits.length;ps++){
                    if(self.pointsetsEdits[ps].options.attribute == 'fill') {
                        $editDiv.find('.color-picker.marker-color').hide();
                        return;
                    }
                }
                $editDiv.find('.color-picker.marker-color').show();
            }
            showHideMarkerColorPicker();

            //buttonsets
            $editDiv.find('div.attribute')
                .find("[value='"+(options.attribute||'r')+"']").attr('checked',true).end()
                .buttonset()
                .find('input:radio').change(function(){
                    self.set(options, $(this)); //plot.options.attribute
                    pointsetLegend.setRadLabel();
                    pointsetLegend.legendOptionsShowHide();
                });
            if(!options.componentData)options.componentData='required';
            $editDiv.find("div.edit-math").find("input[id='"+options.componentData+"-"+panelId+"']").click().end().buttonset()
                .find('input:radio').change(function(){
                    options.componentData = $(this).closest('div').find(".ui-state-active").attr("for").split('-')[0];
                    makeDirty();
                });

            //buttons
            $editDiv.find("button.plot-delete").button({icons: {secondary: 'ui-icon-trash'}}).addClass('ui-state-error').click(function(){
                self.plotsEdits.splice($liPointSet.index(),1);
                $liPointSet.remove();
                makeDirty();
            });
            $editDiv.find("button.plot-copy").button({icons: {secondary: 'ui-icon-copy'}}).click(function(){
                self.plotsEdits.push($.extend(true,{},oPointset));
                self.build(plotIndex);
            });
            $editDiv.find("button.plot-close").button({icons: {secondary: 'ui-icon-arrowstop-1-n'}}).click(function(){
                var k;
                $liPointSet.find(".edit-plot, .plot-info, .line-sample").show();
                $liPointSet.find(".plot-editor").slideUp("default",function(){
                    $liPointSet.find('.op.ui-buttonset').remove();
                    if(!options.userFormula)$liPointSet.find('.plot-op').show();
                    $liPointSet.find('.guided, .manual, input.plot-formula, .plot-editor, li button').remove();
                    $editDiv.remove();
                });

                $liPointSet.find('.comp-edit-k').hide();


                self.$prov.find('.landing').slideDown();
                $liPointSet.find(".comp-editor").slideUp("default",function(){$(this).remove()});
                $liPointSet.find(".edit-plot").show();
                self.sortableOn();
            });
            $editDiv.prependTo($liPointSet);
            this.editPlotFormula(oPointset ,$liPointSet);
            $editDiv.slideDown();
            self.$prov.find('.landing').slideUp();
            $liPointSet.find('.edit-pointset').hide();
        },
        provenanceOfMap:  function provenanceOfMap(){
            var self = this;
            var provHTML = '', ps, pointset, themes = [], tid, fetchThemes = [], cubeSelector='', summationMap = MD.grapher.isSummationMap(self.graph);
            if(self.graph.map&&(self.mapsetEdits || self.pointsetsEdits)){ //map!!
                eachComponent(self.graph, function(){
                    tid = self.graph.assets[this.handle].themeid;
                    if(tid) {
                        themes.pushUnique(tid);
                        if(!themeCubes['T'+tid]) fetchThemes.pushUnique(tid);
                    }
                });
                if(themes.length>0 || summationMap){
                    if(fetchThemes.length>0) {
                        callApi({command: "GetCubeList", themeids: fetchThemes}, function(jsoData, textStatus, jqXH){
                            for(var tHandle in jsoData.themes){
                                themeCubes[tHandle] = jsoData.themes[tHandle];
                            }
                            self.$prov.find('select.cubeSelector').html(cubeOptions());
                        });
                    }
                    cubeSelector = '<div class="cubeSelector right">supplemental visualization: <select class="cubeSelector" data="cubeid">' + cubeOptions() + '</select></div>';
                }
                function cubeOptions(){
                    var t, c, theme, options = '<option value="0">none</option>';
                    if(summationMap) options += '<option value="sum" '+(self.mapconfigEdits.cubeid=='sum'?'selected':'')+'>bar graph of components</option>';
                    for(t=0;t<themes.length;t++){
                        theme = themeCubes['T'+themes[t]];
                        if(theme){
                            for(c=0;c<theme.cubes.length;c++){
                                options += '<option value="'+theme.cubes[c].cubeid+'" '+(self.mapconfigEdits.cubeid==theme.cubes[c].cubeid?'selected':'')+'>'+theme.name+': '+theme.cubes[c].name+'</option>';
                            }
                        }
                    }
                    return options;
                }

                provHTML = '<div class="map-prov">'+ cubeSelector +'<h3>Map of '+ self.graph.map +'</h3>';
                if(self.mapsetEdits){
                    var mapset = self.mapsetEdits;
                    provHTML += '<div class="mapset">'
                        + '<h4>' + iconsHMTL.mapset + ' Mapped set of regions (country, state, or county)</h4>'
                        + '<div class="mapset-colors" style="margin-bottom:5px;"></div>'
                        + '<div class="plot-info">'
                        + '<button class="edit-mapset right ehide">configure</button>'
                        + '<div class="edit-block ehide">'
                        +   '<span class="plot-title">' + plotName(self.graph, mapset)+ '</span> (' + self.plotPeriodicity(mapset)+') in <span class="plot-units">' + plotUnits(self.graph, mapset) +'</span>'
                        + '</div>'
                        + '<span class="plot-formula">= ' + plotFormula(mapset).formula + '</span><br>'
                        + '<span class="map-mode ehide">mode: ' + ((!mapset.options.mode || mapset.options.mode!='bubble')?'heat map':'bubbles with user defined regions') + '</span>'
                        /*                        + '<span class="map-legend ehide">-'
                         +    continuousColorScale(self.mapsetEdits.options)
                         + '+</span>'*/
                        + '<div class="editor"></div>' //where edit info is added
                        + '</div>' //close plotinfo
                        + self.componentsHTML(mapset)
                        + '</div>'; //close mapset
                }
                if(self.pointsetsEdits){
                    provHTML += '<div class="pointsets"><h4>'+iconsHMTL.pointset+' mapped set of markers (defined latitude and longitude)</h4>'
                        // NO SIMPLE MARKERS = FINISH CURRENT FUNCTIONALITY !!!  + '<span class="edit-label marker-scaling right"><label><input type="checkbox" '+(self.mapconfigEdits.markerScaling=='none'?'checked':'')+'> do not scale markers </label></span>'
                        + '<div class="pointsets-colors" style="margin-bottom:5px;"></div>'
                        + '<ol class="pointsets">';
                    for(ps=0;ps<self.pointsetsEdits.length;ps++){
                        pointset = self.pointsetsEdits[ps];
                        provHTML += '<li class="pointset">'
                            + '<button class="edit-pointset right">configure</button>'
                            + '<div class="plot-info" style="display:inline-block;">'
                            + '<div class="marker" style="background-color: '+(pointset.options.color||'#000000')+'"></div>'
                            + '<span class="plot-title">' + plotName(self.graph, pointset)+'</span> (' + self.plotPeriodicity(pointset) + ') in <span class="plot-units">' + plotUnits(self.graph, pointset) + '</span>'
                            + '<span class="plot-formula">= ' + plotFormula(pointset).formula + '</span></div>'
                            + self.componentsHTML(self.pointsetsEdits[ps])
                            + '</li>';
                    }
                    provHTML += '</ol></div>';
                }
                provHTML += '</div>'
            }
            return provHTML;
        },
        editPlotFormula: function(plot, $plot){
            if(plot.options.userFormula){
                manualEditing();
            } else {
                guidedEditing();
            }
            function manualEditing(){
                $plot.find('div.op, span.comp-edit-k').hide();
                $plot.find('button.manual').remove();
                $plot.find('span.plot-formula').hide()
                    .after('<button class="guided">guided editing</button>')
                    .after('<input class="plot-formula">');
                $plot.find('input.plot-formula').val(plot.options.userFormula|| plotFormula(plot).formula).keyup(function(){
                    try{
                        var userFormula = $(this).val();
                        if(userFormula.indexOf(';')>=0) throw('invalid mathematical syntax');
                        var expression = 'return ' + userFormula.replace(patVariable,'values.$1') + ';';
                        var compute = new Function('values', expression);
                        var valuesObject = {}, symbol;
                        $.each(plot.components, function(c){
                                symbol = compSymbol(c);
                                if(userFormula.indexOf(symbol)===-1) throw('all symbols must be used');
                                valuesObject[compSymbol(c)] = c;}
                        );
                        var testCalc = compute(valuesObject);
                        $(this).removeClass('ui-state-error');
                        //if we got to here, the formula is valid
                        plot.options.userFormula = userFormula;
                        $plot.find('span.plot-formula').html('= ' + plot.options.userFormula);
                    } catch(err){
                        $(this).addClass('ui-state-error');
                        delete plot.options.userFormula;
                    }
                });
                $plot.find('button.guided').button({icons: {secondary: 'ui-icon-star'}}).click(function(){
                    guidedEditing();
                });
            }
            function guidedEditing(){
                $plot.find('div.op, span.comp-edit-k').show();
                $plot.find('input.plot-formula, button.guided').remove();
                $plot.find('span.plot-formula').html('= ' + plotFormula(plot).formula).show()
                    .after('<button class="manual">manual editing</button>');
                delete plot.options.userFormula;
                $plot.find('button.manual').button({icons: {secondary: 'ui-icon-pencil'}}).click(function(){
                    manualEditing();
                });

            }

        },
        showMapSetEditor: function(){
            var self = this;
            var mapset = this.mapsetEdits;
            var options = this.mapsetEdits.options;
            var $mapset = self.$prov.find('.mapset');
            this.editPlotFormula(this.mapsetEdits, $mapset);

            var i;
            self.$prov.find("button.plot-close").click();  //close any open editors
            $mapset.find('.edit-mapset').hide();
            //The TYPE AND MERGE MODE WILL BE AVAILABLE IN CONFIGURATION MODE, NOT THE INTIAL VIEW
            var editDiv = '<div class="plot-editor" style="display: none;">';
            if(options.mode=='bubble') {
                editDiv += '<span class="merge-formula">merge formula = &#931; numerator / &#931; denominator</span>';  //&#931; = Sigma in HTML code;
            }
            editDiv += '<button class="plot-close prov-float-btn">close</button>'
                +   '<button class="plot-delete prov-float-btn">delete heat map</button>'
                +   ''
                +   '<div class="edit-block">name: </span><input class="plot-name" type="text" data="name"/></div><br>'
                +   '<div class="edit-block"><span class="edit-label">units:</span><input class="plot-units long" data="units" type="text"/><span class="plot-edit-k"> scalor: <input class="short" value="'+(options.k||1)+'"></div><br>'
                +   '<span class="edit-label">Point calculations:</span>'
                +   self.HTML.compMath
                +   '<div class="edit-block add-bunny"><button  class="add-bunny">add regional tracking plot</button></span></div> ';
            editDiv += '</div>';
            var $editDiv = $(editDiv);

            //bunny
            $editDiv.find('button.add-bunny').button({icons: {secondary: 'ui-icon-plus'}}).click(function(){  //this is a multifunction selector: delete bunny, use existing plot, or create bunny
                var val = "add";
                if(val=="add"){
                    var i, handle, asset, mapsetids=[];
                    for(i=0;i<mapset.components.length;i++){
                        if(mapset.components[i].handle[0]=='M'){
                            mapsetids.push(mapset.components[i].handle.substr(1));
                        }
                    }
                    callApi({command: 'GetBunnySeries', mapsetids: mapsetids, geoid: parseInt(mapsList[self.graph.map].bunny), mapname: self.graph.map}, function (oReturn, textStatus, jqXH) {
                        if(oReturn.allfound){
                            for(handle in oReturn.assets){ //the handle being looped over in the mappset handle
                                self.graph.assets[oReturn.assets[handle].handle] = oReturn.assets[handle];
                            }
                            var bunnyPlot = {options:{k: mapset.options.k||1, units: mapset.options.units}, components: []};
                            for(i=0;i<mapset.components.length;i++){
                                if(mapset.components[i].handle[0]=='M'){
                                    handle = oReturn.assets[mapset.components[i].handle].handle;
                                } else {
                                    handle = mapset.components[i].handle;
                                }
                                bunnyPlot.components.push({
                                    handle: handle,
                                    options: {
                                        k: mapset.components[i].k||1,
                                        op: mapset.components[i].op||'+'
                                    }
                                });
                            }
                            //check to see if this already exists
                            var p, plots = self.plotsEdits, bunnyExists = false;
                            if(plots){
                                for(p=0;p<plots.length;p++){
                                    if(bunnyPlot.options.k!=plots[p].options.k||1){ //check plot options first for consistency
                                        for(i=0;i<plots[p].components.length;i++){ // then check component and component options for consistency
                                            if(plots[p].components[i].handle!=bunnyPlot.components[i].handle
                                                || plots[p].components[i].options.k||1!=bunnyPlot.components[i].options.k
                                                || plots[p].components[i].options.op||'+'!=bunnyPlot.components[i].options.op) break;

                                        }
                                        if(i==plots[p].components.length){
                                            bunnyExists = true;
                                            $(this).val(p);  //this will force the selector to the bunny plot already found to be exisiting and trigger another call to this routine where the bunny property will be set
                                            break;
                                        }
                                    }
                                }
                            }
                            if(!bunnyExists){
                                self.plotsEdits.push(bunnyPlot);
                                self.build(p); //p set correctly to length of plots before the above push
                            }
                        } else {
                            dialogShow('unable to automatically create tracking plot','One or more of the component map sets does not have series for '+ self.graph.map +' level of aggregation.');
                        }
                        makeDirty();
                    });
                } else {
                    if(val=="-1"){
                        delete options.bunny;
                    }  else {
                        options.bunny = parseInt(val);
                    }
                }
                self.setFormula(mapset, $mapset);
                makeDirty();
            });
            $editDiv.find('.plot-edit-k input').change(function(){
                if(!isNaN(parseFloat(this.value))){
                    options.k = Math.abs(parseFloat(this.value));
                    if(options.k==0)options.k=1;
                    self.setFormula(mapset, $mapset);
                    makeDirty();
                }  else {
                    dialogShow('Error','Scalors must be numerical');
                }
                $(this).val(options.k||1);
            });

            //buttonsets
            $editDiv.find('div.edit-math')
                .find("[value='"+(options.compMath||"required")+"']").attr('checked',true).end()
                .buttonset().find('input:radio').change(function(){
                    self.set(options, $(this));  //options.compMath = this.value;
                });
            //buttons
            $editDiv.find("button.plot-delete").button({icons: {secondary: 'ui-icon-trash'}}).addClass('ui-state-error').click(function(){
                self.mapsetEdits = {};
                $mapset.remove();
                if(!self.pointsetsEdits) self.$prov.find('map-prov').remove();
                makeDirty();
            });
            $editDiv.find("button.plot-close").button({icons: {secondary: 'ui-icon-arrowstop-1-n'}}).click(function(){
                $mapset.find(".edit-mapset, .plot-info").show();
                $mapset.find(".plot-editor").slideUp("default",function(){
                    $mapset.find('.op.ui-buttonset, .comp-delete').remove();
                    $(this).remove();
                    $mapset.find('.plot-op').show();
                });

                $mapset.find('.guided, .manual, input.plot-formula, span.comp-edit-k').remove();

                $mapset.find('.ehide').show();
                self.$prov.find('.landing').slideDown();
                $mapset.find(".comp-editor").slideUp("default",function(){
                    $(this).remove();
                });
                self.sortableOn();
            });

            //sync
            $editDiv.find("input.plot-name").val(plotName(self.graph, mapset)).change(function(){
                self.set(options, $(this));  //mapset.options.name = $(this).val();
                $mapset.find('span.plot-title').html(mapset.options.name);
            });
            $editDiv.find("input.plot-units").val(plotUnits(self.graph, mapset)).change(function(){
                self.set(options, $(this));  //mapset.options.units = $(this).val();
                $mapset.find('span.plot-units').html(mapset.options.units);
            });
            $editDiv.appendTo($mapset.find('.editor').html('')).slideDown();
            $mapset.find('.ehide').hide();
            self.$prov.find('.landing').slideUp();
        },
        setFormula: function(plot, $container){
            plot.formula = plotFormula(plot);
            var formula = plot.formula.formula;
            if($container) {
                $container.find('span.plot-formula').html('= '+ formula);
                //if plot units are calculated, change those
                if(!plot.options.units) $container.find('input.plot-units').val(plotUnits(this.graph, plot));
                if(!plot.options.name) $container.find('input.plot-name').val(plotName(this.graph, plot));
            }
        },
        legendEditor: function($target, options, type){
            //used by both mapsets and pointsets, depending on type = 'X' or 'M'
            //appends the controls to $target = a fieldset labeled 'legend'
            //controls blocks = 1) radius, 2) color scale: a) continuous b) discrete
            var i, self = this, $mapProv = self.$prov.find('.map-prov');
            var legendHTML = '<div class="edit-block">'
                + '<div class="map-mode edit-block">'
                +    '<input type="radio" name="'+ panelId +'-map-mode" id="'+ panelId +'-map-mode-C" value="fill" data="mode" '+ ((!options.mode || options.mode!='bubble')?'checked':'') +' /><label for="'+ panelId +'-map-mode-C">fill (heat map)</label>'
                +    '<input type="radio" name="'+ panelId +'-map-mode" id="'+ panelId +'-map-mode-B" value="bubble" data="mode" '+ ((options.mode && options.mode=='bubble')?'checked':'') +' /><label for="'+ panelId +'-map-mode-B">bubbles (mergable into regional sums)</label>'
                + '</div><span class="merge-formula ital">merge formula = &#931; numerator / &#931; denominator</span>'
                + '<div class="radius"  style="display: none;">'
                +    '<span class="edit-label radius-label">maximum '+(type=='X'?'marker':'bubble')+' radius (pixels): </span><input class="radius-spinner" value="'+(options.attribute=='fill'?self.mapconfigEdits.fixedRadius||DEFAULT_RADIUS_FIXED:self.mapconfigEdits.maxRadius||DEFAULT_RADIUS_SCALE)+'" />'
                + '</div>'
                + '<div class="edit-block color-scale" style="display: none;">'
                +   '<div class="legend-scale"><span class="edit-label">Color scale:</span>'
                +       '<input type="radio" id="legend-continuous-'+panelId+'" name="legend-type-'+panelId+'" data="scale" value="continuous" /><label for="legend-continuous-'+panelId+'">continous</label>'
                +       '<input type="radio" id="legend-discrete-'+panelId+'" name="legend-type-'+panelId+'" data="scale" value="discrete"/><label for="legend-discrete-'+panelId+'">discrete</label>'
                +   '</div>'
                +   '<div class="lin-log-scaling"><span class="edit-label">Color mode:</span>'
                +       '<input type="radio" id="lin-scaling-'+panelId+'" name="color-mode-'+panelId+'" data="logMode" value="off" /><label for="lin-scaling-'+panelId+'">linear</label>'
                +       '<input type="radio" id="log-scaling-'+panelId+'" name="color-mode-'+panelId+'" data="logMode" value="on"/><label for="log-scaling-'+panelId+'">enhanced color</label>'
                +   '</div>'
                +   '<div class="edit-block legend-continuous" style="display: none;">'
                +       '-<div class="continuous-color"><input class="neg color-picker" type="text" data="negColor" value="' + (options.negColor||MAP_COLORS.NEG) + '" /></div>'
                +       continuousColorScale(options)
                +       '<div class="continuous-color"><input class="pos color-picker" type="text" data="posColor" value="' + (options.posColor||MAP_COLORS.POS) + '" /></div>+'
                +   '</div>'
                +   '<div class="edit-block legend-discrete" style="display: none;"></div>'
                + '</div>';

            var $legend = $(legendHTML);

            $legend.find('div.map-mode')
                .find("[value='"+(options.mode||"fill")+"']").attr('checked',true).end()//default mode is fill (i.e. not bubble)
                .buttonset().find('input:radio').change(function(){
                    self.set(options, $(this));  //options.mode= this.value;
                    mapsetLegend.legendOptionsShowHide();
                    showHideMergeFormula();
                });
            showHideMergeFormula();
            function showHideMergeFormula(){
                if(options.mode=='bubble') $legend.find('.merge-formula').show(); else $legend.find('.merge-formula').hide();
            }

            $legend.find('div.legend-scale')
                .find("[value='"+(options.scale||'continuous')+"']").attr('checked',true).end()
                .buttonset().find('input:radio').change(function(){
                    self.set(options,  $(this));
                    showHideLinLog();
                });
            function showHideLinLog(){
                if(options.scale=='discrete'){
                    $legend.find('.legend-discrete').removeAttr('style');
                    $legend.find('.lin-log-scaling').hide();
                    $legend.find('.legend-continuous').hide();
                } else {
                    $legend.find('.legend-discrete').hide();
                    $legend.find('.lin-log-scaling').removeAttr('style');
                    $legend.find('.legend-continuous').removeAttr('style');  //show method that does not add style=display: block;
                }
            }
            showHideLinLog(); //inital set
            $legend.find('.lin-log-scaling')
                .find("[value='"+(options.logMode||'off')+"']").attr('checked',true).end()
                .buttonset().find('input').change(function(){
                    self.set(options,  $(this));
                });
            $legend.find('.radius-spinner')
                .spinner({
                    min: 2,
                    max:200,
                    change: function(event, ui){
                        if(type=='M' || options.attribute!='fill'){
                            self.mapconfigEdits.maxRadius = $(this).val();
                        } else {
                            self.mapconfigEdits.fixedRadius = $(this).val();
                        }
                        makeDirty();
                    }
                });
            $legend.find('.color-picker.pos').colorPicker().change(function(){
                self.set(options, $(this));  //options.posColor = this.value;  // this is a universal val for pointsets
                $legend.find('.continuous-strip-pos').html(continuousColorStrip('#CCCCCC', options.posColor));
                $mapProv.find('.map-legend').html('-'+continuousColorScale(options)+'+');
            });
            $legend.find('.color-picker.neg').colorPicker().change(function(){
                self.set(options, $(this)); //options.negColor = this.value; // this is a universal val for pointsets
                $legend.find('.continuous-strip-neg').html(continuousColorStrip(options.negColor, '#CCCCCC'));
                $mapProv.find('.map-legend').html('-'+continuousColorScale(options)+'+');
            });
            $legend.find('.legend-discrete').append(self.discreteLegend(type));

            legendOptionsShowHide();
            $target.append($legend);
            return {"legendOptionsShowHide": legendOptionsShowHide, "setRadLabel": setRadLabel};

            function legendOptionsShowHide(){
                //radius spinner:  bubble OR X
                if(type=='X' || (type=='M' && options.mode=='bubble')){ //RADIUS-SPINNER (options.attribute only exists for mapsets (not pointsets))
                    $legend.find('div.radius').slideDown();
                } else {
                    $legend.find('div.radius').slideUp();
                }
                //color scale if heatmap OR markerShading
                if((type=='M' && options.mode!='bubble') || (type=='X' && self.mapconfigEdits.markerScaling!='none' && fillScalingCount(self.pointsetsEdits)>0)){
                    $legend.find('div.color-scale').slideDown();
                    if(options.scale=='discrete'){ //default is 'continuous'
                        $legend.find('div.legend-continuous').hide();
                        $legend.find('div.legend-discrete').removeAttr('style');  //show method that does not add style=display: block;
                    } else {
                        $legend.find('div.legend-continuous').removeAttr('style');  //show method that does not add style=display: block;
                        $legend.find('div.legend-discrete').hide();
                    }
                } else {
                    $legend.find('div.color-scale').slideUp();
                }
            }
            function setRadLabel(){
                /*if(options.attribute=='fill'){
                 $legend.find('.radius-label').html('Marker radius: ');
                 $legend.find('.color').hide();
                 } else {
                 $legend.find('.radius-label').html('Maximum marker radius: ');
                 $legend.find('.color').show();
                 }*/
            }
        },
        discreteLegend: function(type){
            var legendHtml, $legend, i, changing, val, self = this;
            var options = (type=='X'?self.mapconfigEdits:self.mapsetEdits.options);
            if(!Array.isArray(options.discreteColors) || options.discreteColors.length==1) options.discreteColors = resetLegend(5, options);
            legendHtml = '<div class="edit-block">'
                +   '<div class="edit-block discrete-legend"></div>'
                +   '<button class="inc-discrete">+</button>'
                +   '<button class="dec-discrete">-</button>'
                +   '<button class="reset-discrete">calculate colors</button>'
                + '</div>';
            $legend = $(legendHtml);
            makeLegend();
            $legend.find('button.inc-discrete').button({disabled: options.discreteColors.length>9}).click(function(){
                $legend.find('button.inc-discrete').button('enable');
                options.discreteColors = resetLegend(options.discreteColors.length+1, options);
                if(options.discreteColors.length>9) $(this).button('disable');
                makeLegend();
                makeDirty();
            });
            $legend.find('button.dec-discrete').button({disabled: options.discreteColors.length<2}).click(function(){
                $legend.find('button.inc-discrete').button('enable');
                options.discreteColors = resetLegend(options.discreteColors.length-1, options);
                if(options.discreteColors.length<2) $(this).button('disable');
                makeLegend();
                makeDirty();
            });
            $legend.find('button.reset-discrete').button().click(function(){
                options.discreteColors = resetLegend(options.discreteColors.length, options);
                makeLegend();
                makeDirty();
            });
            return $legend;


            function makeLegend(){
                var discreteLegend = '';
                for(i=0;i<options.discreteColors.length;i++){
                    discreteLegend += '<div class="discrete-color"><input class="color" data="'+i+'" value="'+options.discreteColors[i].color+'" /></div>';
                    if(i!=options.discreteColors.length-1){
                        discreteLegend += ' &#8804; <input class="cutoff" data="'+i+'" value="'+options.discreteColors[i].cutoff+'" />';
                    }
                }
                $legend.find('.discrete-legend').html(discreteLegend);
                $legend.find('.color').colorPicker().change(function(){
                    changing = parseInt($(this).attr('data'));
                    options.discreteColors[changing].color = $(this).val();
                    makeDirty();
                });
                $legend.find('.cutoff').change(function(){
                    changing = parseInt($(this).attr('data'));
                    val = $(this).val();
                    if(isNaN(val)){
                        for(i=0;i<options.discreteColors.length;i++){
                            if(i<changing) options.discreteColors[i].cutoff = Math.min(options.discreteColors[i].cutoff , val);
                            if(i==changing) options.discreteColors[i].cutoff = val;
                            if(i>changing) options.discreteColors[i].cutoff = Math.max(options.discreteColors[i].cutoff , val);
                        }
                    }
                    makeDirty();
                });
            }
            function resetLegend(count, options){
                var i, key1, key2, nums = [], discreteColors = [];
                var data = type=='X'?self.graph.calculatedMapData.markerData:self.graph.calculatedMapData.regionData;
                for(key1 in data){
                    for(key2 in data[key1]){
                        if(data[key1][key2]!=null) nums.push(data[key1][key2]);
                    }
                }
                nums.sort(function(a,b){return(a-b)});
                var negTranchCount=0, indexCrossing=0;
                for(i=0;i<count;i++){
                    if(nums[parseInt(nums.length/(count/(i+1)))]<0)negTranchCount++;
                }
                var crossesZero = nums[0]<0 && nums[nums.length-1]>0;
                if(crossesZero) {
                    for(indexCrossing=0;indexCrossing<nums.length;indexCrossing++){
                        if(nums[indexCrossing]>=0) break;
                    }
                    if(crossesZero){
                        if(negTranchCount==0) {
                            negTranchCount++;
                        } else {
                            var delta = (indexCrossing/nums.length-negTranchCount/count)*count;
                            if(delta<(-0.5)) negTranchCount++;
                            if(delta>0.5 && negTranchCount>1) negTranchCount--;
                        }
                    }
                }
                var posTranchCount= count - negTranchCount;

                var fullNegColor = options.negColor||MAP_COLORS.NEG;
                if(fullNegColor.substr(0,1)=='#')fullNegColor=fullNegColor.substr(1);

                var r, g, b, fullR, fullG, fullB, discreteColor;
                fullR = parseInt(fullNegColor.substr(0,2), 16);
                fullG = parseInt(fullNegColor.substr(2,2), 16);
                fullB = parseInt(fullNegColor.substr(4,2), 16);
                for(i=0;i<negTranchCount;i++){ //NEGATIVE TRANCHES (default RED) tranches
                    r = parseInt(fullR + (255-fullR)*(negTranchCount-i-1)/negTranchCount);
                    g = parseInt(fullG + (255-fullG)*(negTranchCount-i-1)/negTranchCount);
                    b = parseInt(fullB + (255-fullB)*(negTranchCount-i-1)/negTranchCount);
                    discreteColor = '#' + r.toString(16) + g.toString(16) + b.toString(16);
                    discreteColors.push(
                        {
                            color: discreteColor,
                            cutoff: (i+1==negTranchCount && crossesZero)?0:nums[Math.round((nums.length-1)*(i+1)/count)]
                        }
                    );
                }
                var index, skipped = 0, fullPosColor = options.posColor||MAP_COLORS.POS;
                if(fullPosColor.substr(0,1)=='#')fullPosColor=fullPosColor.substr(1);
                fullR = parseInt(fullPosColor.substr(0,2), 16);
                fullG = parseInt(fullPosColor.substr(2,2), 16);
                fullB = parseInt(fullPosColor.substr(4,2), 16);
                for(i=negTranchCount;i<posTranchCount;i++){ //POSITIVE TRANCHES(default BLUE)
                    r = parseInt(fullR + (255-fullR)*(posTranchCount-i-1)/posTranchCount);
                    g = parseInt(fullG + (255-fullG)*(posTranchCount-i-1)/posTranchCount);
                    b = parseInt(fullB + (255-fullB)*(posTranchCount-i-1)/posTranchCount);
                    discreteColor = '#' + octet(r) + octet(g) + octet(b);
                    index = Math.round((nums.length-1-skipped)*i/count + skipped);
                    while(index<nums.length-1 && nums[index]==nums[index+1]){
                        index++;
                        skipped++;
                    }
                    discreteColors.push(
                        {
                            color: discreteColor,
                            cutoff: nums[index]
                        }
                    );
                }
                return discreteColors;


            }
        },
        set: function(options, property, value){
            if(typeof property == 'string'){
                options[property] = value;
            } else { //JQ object
                options[property.attr('data')] = property.val();
            }
            makeDirty();
        }
    };
    return controller;

    //private provence methods
    function makeDirty(){
        controller.isDirty = true;
        controller.$prov.find('.config-cancel').button('enable');
    }
    function continuousColorStrip(a, b){
        return '<span class="map_legend_gradient" style="-ms-filter: progid:DXImageTransform.Microsoft.gradient(startColorstr='+a+', endColorstr='+b+', gradientType=1);filter: progid:DXImageTransform.Microsoft.gradient(startColorstr='+a+', endColorstr='+b+', gradientType=1)background-image: -webkit-gradient(linear, left bottom, right bottom, from('+a+'), to('+b+'));background-image: -webkit-linear-gradient(left, '+a+', '+b+');background-image: -moz-linear-gradient(left, '+a+', '+b+');background-image:  -o-linear-gradient(left, '+a+', '+b+';background-image: linear-gradient(to left, '+a+','+b+');"></span>';
        //return '<span class="map_legend_gradient" style="-ms-filter: progid:DXImageTransform.Microsoft.gradient(startColorstr=#7ce3ff, endColorstr=#00355b, gradientType=1); filter: progid:DXImageTransform.Microsoft.gradient(startColorstr=#7ce3ff, endColorstr=#00355b, gradientType=1)background-image: -webkit-gradient(linear, left bottom, right bottom, from(#7ce3ff), to(#00355b));background-image: -webkit-linear-gradient(left, #7ce3ff, #00355b);background-image:    -moz-linear-gradient(left, #7ce3ff, #00355b);background-image:      -o-linear-gradient(left, #7ce3ff, #00355b;background-image:         linear-gradient(to left, #7ce3ff,#00355b);"></span>';
    }
    function continuousColorScale(options){
        return '<div class="continuous-strip-neg">' + continuousColorStrip(options.negColor||MAP_COLORS.NEG, MAP_COLORS.MID) + '</div>'
            + '0'
            + '<div class="continuous-strip-pos">' + continuousColorStrip(MAP_COLORS.MID, options.posColor||MAP_COLORS.POS) + '</div>'
    }
}
