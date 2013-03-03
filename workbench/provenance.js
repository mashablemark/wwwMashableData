/**
 * Created with JetBrains PhpStorm.
 * User: mark__000
 * Date: 2/17/13
 * Time: 11:13 PM
 * To change this template use File | Settings | File Templates.
 */

//PROVENANCE PANEL CREATOR AND HELPER FUNCTIONS
function ProvenanceController(panelId){
    var controller = {
        HTML: {
            nLanding: '<li class="component-landing"><span class="landing">drag numerator series here</span></li>',
            dLanding: '<li class="component-landing"><span class="landing">drag denominator series here</span></li>',
            compMath: '<div class="edit-block">'
                +       '<div class="edit-math">'
                +           '<input type="radio" id="required-'+panelId+'" name="comp-math-'+panelId+'"  value="required"/><label for="required-'+panelId+'">all series values required</label>'
                +           '<input type="radio" id="missingAsZero-'+panelId+'" name="comp-math-'+panelId+'"  value="missingAsZero"/><label for="missingAsZero-'+panelId+'">treat missing values as zeros</label>'
                +           '<input type="radio" id="nullsMissingAsZero-'+panelId+'" name="comp-math-'+panelId+'" value="nullsMissingAsZero"/><label for="nullsMissingAsZero-'+panelId+'">treat missing and null values as zeros</label>'
                +       '</div>'
                +   '</div>'
        },
        graph: oPanelGraphs[panelId],
        $prov: $('#'+panelId + ' .provenance'),
        build:  function build(plotIndex){  //redo entire panel if plotIndex omitted
            var self = this;
            var i, j, plotList, mapList, plot, okcancel;
            self.$prov.show(); //compensation for margins @ 15px + borders
            okcancel = '<button class="config-cancel">cancel edits</button>';
            plotList = '';
            if(typeof plotIndex != 'undefined'){
                self.$prov.find('ol.plots').append( self.plotHTML(plotIndex) );
            } else {
                self.plotsEdits = $.extend(true, [], self.graph.plots);  //this is the copy that the provenance panel will work with.  Will replace graph.plots on "OK"
                self.annoEdits = $.extend(true, [], self.graph.annotations);
                self.mapsetEdits = $.extend(true, [], self.graph.mapsets);
                self.pointsetsEdits = $.extend(true, [], self.graph.pointsets);
                self.mapconfigEdits= $.extend(true, [], self.graph.mapconfig);


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


                //main buttons
                self.$prov.find("button.config-cancel")
                    .button({icons: {secondary: 'ui-icon-closethick'}}).addClass('ui-state-error')
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
                        self.showComponentEditor(this, 'plot');
                    });
                });

            self.$prov.find(".edit-mapset")
                .button({icons: {secondary: 'ui-icon-pencil'}})
                .off("click")
                .click(function(){
                    self.sortableOff();
                    self.showMapSetEditor();
                    self.$prov.find('.mapset').find("ol.map-comp li.component").each(function(){
                        self.showComponentEditor(this, 'mapset');
                    });
                });

            self.$prov.find(".edit-pointset")
                .button({icons: {secondary: 'ui-icon-pencil'}})
                .off("click")
                .click(function(){
                    var $liPlot = $(this).closest("li");
                    self.showPointSetEditor($liPlot);
                    $liPlot.find("ol li.component").each(function(){
                        self.showComponentEditor(this, 'pointset');
                    });
                });
            self.sortableOn();
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
            var plotList, comp, type='plot', numer='', denom='', compHTML, isDenom=false, graph = this.graph;
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
            plotList = '<ol class="components '+type+'-comp numer">'+(numer||this.HTML.nLanding) + '</ol>'
            + '<hr>'
            + '<ol class="components '+type+'-comp denom">'+(denom||this.HTML.dLanding) + '</ol>';
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
        sortableOff: function(){
            var self = this;
            self.$prov.find(".plots").sortable('disable').enableSelection();
            self.$prov.find(".components").sortable('disable').enableSelection();
            self.$prov.find(".pointsets").sortable('disable').enableSelection();
        },
        sortableOn: function(){
            var self = this;
            self.$prov.find(".components")
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
            self.$prov.find(".plots")
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

                    }
                })
                .disableSelection();
            self.$prov.find(".pointsets")
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
                    }
                })
                .disableSelection();
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
                toPlotObject = {options: {}, components: [cmp]};
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
            } else { //recalc the formula of the sender
                self.dragging.$ol.parent().find('span.plot-formula').html('= '+plotFormula(self.dragging.obj).formula);
            }
            if(newPlot) {
                ui.item.remove();  //the spare component in the new plot landing zone
                self.sortableOn();
            }

        },
        provOk: function provOk(){//save change to graph object and rechart
            //TODO: save and rechart
            var self = this;
            if(self.plotsEdits||self.mapsetEdits||self.pointsetsEdits){
                self.graph.plots = self.plotsEdits;
                self.graph.annotations = self.annoEdits;
                self.graph.mapsets = self.mapsetEdits;
                self.graph.pointsets = self.pointsetsEdits;
                self.graph.mapconfig = self.mapconfigEdits;

                delete self.plotsEdits;
                delete self.annoEdits;
                delete self.mapsetEdits;
                delete self.pointsetsEdits;
                delete self.mapconfigEdits;
                this.provClose();
                $('#'+panelId).find(".graph-type").change();  //trigger redaw
            }
        },
        provClose:  function provClose(){ //called directly from cancel btn = close without saving
            var self = this;
            delete self.plotsEdits;
            delete self.annoEdits;
            delete self.mapsetEdits;
            delete self.pointsetsEdits;
            delete self.mapconfigEdits;
            $("ol.ui-sortable").sortable("destroy");
            self.$prov.closest('div.graph-panel').find('.graph-nav-graph').click();
        },
        compIndex: function(liComp){
            var $liComp = $(liComp);
            var cmpIndex = $liComp.index();
            if($liComp.parent().hasClass('denom')) {
                cmpIndex += $liComp.parent().parent().find('ol.numer li.component').length;
            }
            return cmpIndex;
        },
        showComponentEditor:  function showComponentEditor(liComp, type){
            var self = this;
            var plot, components, $liComp = $(liComp);
            var plotIndex = $(liComp).closest('li.plot').index();
            if(type=="mapset") plot = self.mapsetEdits;
            if(type=="pointset") plot = self.pointsetsEdits[plotIndex];
            if(type=="plot") plot = self.plotsEdits[plotIndex];
            var iComp = self.compIndex($liComp); //could have just gotten index of liComp as the object should be in sync
            var compHandle = $(liComp).attr('data');
            var component = plot.components[iComp];
            var editDiv = (vectorPattern.test(compHandle)?'<button class="comp-copy prov-float-btn">make copy</button>':'')
                + '<button class="comp-delete prov-float-btn">remove series</button>'
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
            $liComp.find("div.op").find("input[data='"+component.options.op+"']").attr('checked','checked')
                .end()
                .buttonset()
                .find('input:radio')
                .click(function(){
                    plot.components[iComp].options.op = $(this).val();
                    $liComp.closest(".plot,.mapset").find("span.plot-formula").html(' = ' + plotFormula(plot).formula);
                    $liComp.find('.plot-op').attr('class','plot-op ui-icon ' + op.class[plot.components[iComp].options.op]);
                });
            $editDiv.appendTo($liComp).slideDown();  //add the new comp editor and animate it open
            //add UI events
/*            $editDiv.find("ul.comp-op li").click(function(){
                $editDiv.find("li.selected").removeClass("selected");
                component.options.op = $(this).closest("li").addClass("selected").attr('data');
                $editDiv.closest("span.plot-op").attr("class","plot-op ui-icon " + op.class[component.options.op]);
            });*/
            $liComp.find(".comp-delete").button({icons: {secondary: 'ui-icon-trash'}}).addClass('ui-state-error').click(function(){
                components.splice(iComp,1);
                if(components.length==0) $liComp.closest('li.plot').find('.plot-delete').click(); else $liComp.remove();
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
                + '<button class="plot-delete prov-float-btn">delete plot</button>'
                + '<fieldset class="edit-line" style="padding: 0 5px;display:inline-block;"><legend>color, thickness, &amp; style</legend>'
                +   '<div class="edit-block"><input class="plot-color" type="text" value="' + (oPlot.options.lineColor|| plotColor) + '" /></div>' + selectThickness + selectStyle
                + '</fieldset>'
                + '<div class="edit-block"><span style="margin:0 10px">name:</span><input class="plot-name" type="text" value="' + plotName(self.graph, oPlot) + '" /></div>'
                + '<div class="edit-block"><span class="edit-label">display as:</span><select class="plot-type"><option value="">graph default</option><option value="line">line</option><option value="column">column</option><option value="area">stacked area</option></select></div>'
                + '<div class="edit-block"><span class="edit-label">units:</span><input class="plot-units long" type="text" value="' + (oPlot.options.units||'') + '" /></div><br>'
                + '<span class="edit-label">calculations:</span>+' +
                + self.HTML.compMath
                + '<div class="edit-block"><span class="edit-label">break line:</span><div class="edit-breaks">'
                +   '<input type="radio" id="nulls-'+panelId+'" name="line-break-'+panelId+'" /><label for="nulls-'+panelId+'">on nulls</label>'
                +   '<input type="radio" id="missing-'+panelId+'" name="line-break-'+panelId+'" /><label for="missing-'+panelId+'">on missing value and nulls</label>'
                +   '<input type="radio" id="never-'+panelId+'" name="line-break-'+panelId+'" /><label for="never-'+panelId+'">never</label></div>'
                + '</div>'
                +'</div>';
            var $editDiv = $(editDiv);    //instantiate the editor
            self.$prov.find("button.plot-close").click();  //close any open editors
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
                self.$prov.find('.landing').slideDown();
                $liPlot.find(".comp-editor").slideUp("default",function(){$(this).remove()});
                $liPlot.find(".edit-plot").show();
                self.sortableOn();
            });
            $editDiv.prependTo($liPlot).slideDown();
            self.$prov.find('.landing').slideUp();
        },
        showPointSetEditor: function($liPointSet){

        },

        provenanceOfMap:  function provenanceOfMap(){
            var self = this;
            var provHTML = '', ps, pointset;
            if(self.graph.map&&(self.graph.mapsets||self.graph.pointsets)){ //map!!
                provHTML = '<div class="map-prov"><h3>Map of '+ self.graph.map +'</h3>';
                if(self.graph.mapsets){
                    var mapset = self.graph.mapsets;
                    provHTML += '<div class="mapset">'
                        + '<h4>' + iconsHMTL.mapset + ' Mapped set of regions (country, state, or county)</h4>'
                        + '<div class="plot-info">'
                        + '<div class="edit-block ehide">'
                        +   '<span class="plot-title">' + plotName(self.graph, mapset)+ '</span> (' + self.plotPeriodicity(mapset)+') in <span class="plot-units">' + (mapset.options.units||plotUnits(self.graph, mapset)) +'</span>'
                        + '</div>'
                        + '<span class="plot-formula">= ' + plotFormula(mapset).formula + '</span><br>'
                        + '<button class="edit-mapset right ehide">configure</button>'
                        + '<span class="map-mode ehide">mode: ' + ((!mapset.options.mode || mapset.options.mode!='bubble')?'heat map':'bubbles with user defined regions') + '</span>'
                        + '<span class="map-legend ehide">'
                        +    continuousColorScale(self.mapsetEdits.options)
                        + '</span>'
                        + '<div class="editor"></div>'
                        + '</div>' //close plotinfo
                        + self.componentsHTML(mapset)
                        + '</div>'; //close mapset
                }
                if(self.graph.pointsets){
                    provHTML += '<div class="pointsets"><h4>'+iconsHMTL.pointset+' mapped set of markers (defined latitude and longitude)</h4>'
                        + '<ol class="pointsets">';
                    for(ps=0;ps<self.graph.pointsets.length;ps++){
                        pointset = self.graph.pointsets[ps];
                        provHTML += '<li class="pointset ui-state-highlight">'
                            + '<button class="edit-pointset right">configure</button>'
                            + '<div class="plot-info" style="display:inline-block;">'
                            + '<span class="plot-title">' + plotName(self.graph, pointset)+'</span> (' + self.plotPeriodicity(pointset) + ') in <span class="plot-units">' + (pointset.options.units||plotUnits(self.graph, pointset)) + '</span>'
                            + '<span class="plot-formula">= ' + plotFormula(pointset).formula + '</span></div>'
                            + self.componentsHTML(self.graph.pointsets[ps])
                            + '</li>';
                    }
                    provHTML += '</ol></div>';
                }
                provHTML += '</div>'
            }
            return provHTML;
        },
        showMapSetEditor: function(){
            var self = this, mapset = this.mapsetEdits, options = this.mapsetEdits.options, $mapset = self.$prov.find('.mapset');

            self.$prov.find("button.plot-close").click();  //close any open editors
            $mapset.find('.edit-mapset').hide();
            //The TYPE AND MERGE MODE WILL BE AVAILABLE IN CONFIGURATION MODE, NOT THE INTIAL VIEW
            var editDiv = '<div class="plot-editor" style="display: none;">';
            if(options.mode=='bubble') {
                editDiv += '<span class="merge-formula">merge formula = &#931; numerator / &#931; denominator</span>';  //&#931; = Sigma in HTML code;
            }
            editDiv += '<button class="plot-close prov-float-btn">close</button>'
                +   '<button class="plot-delete prov-float-btn">delete plot</button>'
                +   '<div class="edit-block"><span class="edit-label">name:</span><input class="plot-name" type="text" value="' + plotName(self.graph, mapset) + '" /></div><br>'
                +   '<div class="edit-block"><span class="edit-label">units:</span><input class="plot-units long" type="text" value="' + plotUnits(self.graph, mapset) + '" /></div><br>'
                +   self.HTML.CompMath
                +   '<div class="map-mode edit-block">'
                +       '<input type="radio" name="'+ panelId +'-map-mode" id="'+ panelId +'-map-mode-C" value="fill" '+ ((!options.mode || options.mode!='bubble')?'checked':'') +' /><label for="'+ panelId +'-map-mode-C">fill (heat map)</label>'
                +       '<input type="radio" name="'+ panelId +'-map-mode" id="'+ panelId +'-map-mode-B" value="bubble" '+ ((options.mode && options.mode=='bubble')?'checked':'') +' /><label for="'+ panelId +'-map-mode-B">bubbles (mergable into regional sums)</label>'
                +   '</div><span class="merge-formula ital">merge formula = &#931; numerator / &#931; denominator</span>'
                +   '<fieldset class="edit-color" style="padding: 0 5px;display:inline-block;"><legend>legend</legend>'
                // legendEditor appended here
                +   '</fieldset>'
                + '</div>';
            var $editDiv = $(editDiv);
            var legendControls = self.legendEditor($editDiv.find('.edit-color'), options, 'M');

            //buttonsets
            $editDiv.find('div.edit-math')
                .find("[value='"+(options.compMath||"required")+"']").attr('checked',true).end()
                .buttonset().find('input:radio').change(function(){
                    options.compMath = this.value;
                });
            $editDiv.find('div.map-mode')
                .find("[value='"+(options.mode||"fill")+"']").attr('checked',true).end()
                .buttonset().find('input:radio').change(function(){
                    options.mode= this.value;
                    legendControls.legendOptionsShowHide();
                });

            //buttons
            $editDiv.find("button.plot-delete").button({icons: {secondary: 'ui-icon-trash'}}).addClass('ui-state-error').click(function(){
                self.mapsetEdits = {};
                $mapset.remove();
                if(!self.graph.pointsetsEdits) self.$prov.find('map-prov').remove();
            });
            $editDiv.find("button.plot-close").button({icons: {secondary: 'ui-icon-arrowstop-1-n'}}).click(function(){
                $mapset.find(".edit-mapset, .plot-info").show();
                $mapset.find(".plot-editor").slideUp("default",function(){
                    $mapset.find('.op.ui-buttonset, .comp-delete').remove();
                    $(this).remove();
                    $mapset.find('.plot-op').show();
                });
                $mapset.find('.ehide').show();
                self.$prov.find('.landing').slideDown();
                $mapset.find(".comp-editor").slideUp("default",function(){
                    $(this).remove();
                });
                self.sortableOn();
            });

            //sync
            $editDiv.find("input.plot-name").change(function(){
                mapset.options.name = $(this).val();
                $mapset.find('span.plot-title').html(mapset.options.name);
            });
            $editDiv.find("input.plot-units").change(function(){
                mapset.options.units = $(this).val();
                $mapset.find('span.plot-units').html(mapset.options.units);
            });
            $editDiv.appendTo($mapset.find('.editor').html('')).slideDown();
            $mapset.find('.ehide').hide();
            self.$prov.find('.landing').slideUp();
        },
        legendEditor: function($target, options, type){
            var i, self = this, $mapset = self.$prov.find('.mapset');
            var legendHTML = '<div class="edit-block">';
            if(type=='X'){
                legendHTML +=  '<span class="edit-label attribute">Series data value will change </span>'
                    + '<div class="attribute">'
                    +   '<input type="radio" id="attribute-radius-'+panelId+'" value="radius"/><label for="attribute-radius-'+panelId+'">radius of marker</label>'
                    +   '<input type="radio" id="attribute-fill-'+panelId+'" value="fill" /><label for="attribute-fill-'+panelId+'">fill color of marker</label>'
                    + '</div>'
                    + '<div class="edit-block color" style="display: none;">'
                    +   ' <input class="markerColor color-picker" type="text" value="' + (options.color||'#0071A4') + '" />'
                    +   (self.graph.pointsets.length>1?' name in legend: <input class="legend-name" type="text" value="' + (options.legendName||options.name||'') + '" />':'')
                    + '</div>';
            }
            legendHTML +=  '<div class="edit-block radius"  style="display: none;">'
                +   '<span class="edit-label radius-label"></span><input class="radius-spinner" value="'+(options.attribute=='fill'?options.fixedRadius||20:options.maxRadius||20)+'" />'
                + '</div>'
                + '<div class="edit-block color-scale" style="display: none;">'
                +   '<div class="legend-scale"><span class="edit-label">Color scale:</span>'
                +       '<input type="radio" id="legend-continuous-'+panelId+'" name="legend-type-'+panelId+'" value="continuous" /><label for="legend-continuous-'+panelId+'">continous</label>'
                +       '<input type="radio" id="legend-discrete-'+panelId+'" name="legend-type-'+panelId+'" value="discrete"/><label for="legend-discrete-'+panelId+'">discrete</label>'
                +   '</div>'
                +   '<div class="edit-block legend-continuous" style="display: none;">'
                +       '<div class="continuous-color"><input class="neg color-picker" type="text" value="' + (options.negColor||MAP_COLORS.NEG) + '" /></div>'
                +       continuousColorScale(self.mapsetEdits.options)
                +       '<div class="continuous-color"><input class="pos color-picker" type="text" value="' + (options.posColor||MAP_COLORS.POS) + '" /></div>'
                +   '</div>'
                +   '<div class="edit-block legend-discrete" style="display: none;"></div>'
                + '</div>';

            var $legend = $(legendHTML);
            $legend.find('div.legend-scale')
                .find("[value='"+(options.scale||'continuous')+"']").attr('checked',true).end()
                .buttonset().find('input:radio').change(function(){
                    options.scale = this.value;
                    if(options.scale=='continuous'){
                        $legend.find('.legend-discrete').slideUp();
                        $legend.find('.legend-continuous').slideDown();
                    } else {
                        $legend.find('.legend-discrete').slideDown();
                        $legend.find('.legend-continuous').slideUp();
                    }
                });
            setRadLabel();
            $legend.find('div.attribute')
                .find("[value='"+(options.attribute||'radius')+"']").attr('checked',true).end()
                .buttonset().find('input:radio').change(function(){
                    options.attribute = this.value;
                    setRadLabel();
                    legendOptionsShowHide();
                });
            $legend.find('.radius-spinner')
                .spinner({min: 2, max:200})
                .change(function(){
                    if(options.attribute=='fill'){
                        self.mapconfigEdits.maxRadius = $(this).val();
                    } else {
                        self.mapconfigEdits.fixedRadius = $(this).val();
                    }
                });
            $legend.find('.color-picker.pos').colorPicker().change(function(){
                var legendOptions = type=='M'?self.mapsetEdits.options:self.mapconfigEdits;
                legendOptions.posColor = this.value;  // this is a universal val for pointsets
                $legend.find('.continuous-strip-pos').html(continuousColorStrip('#CCCCCC', legendOptions.posColor));
                $mapset.find('.map-legend').html(continuousColorScale(legendOptions));
            });
            $legend.find('.color-picker.neg').colorPicker().change(function(){
                var legendOptions = type=='M'?self.mapsetEdits.options:self.mapconfigEdits;
                legendOptions.negColor = this.value; // this is a universal val for pointsets
                $legend.find('.continuous-strip-neg').html(continuousColorStrip(legendOptions.negColor, '#CCCCCC'));
                $mapset.find('.map-legend').html(continuousColorScale(legendOptions));
            });
            $legend.find('.color-picker.markerColor').colorPicker().change(function(){
                options.markerColor = this.value;
            });
            $legend.find('.legend-discrete').append(self.discreteLegend(options, type));

            legendOptionsShowHide();
            $target.append($legend);
            return {"legendOptionsShowHide": legendOptionsShowHide, "setRadLabel": setRadLabel};

            function legendOptionsShowHide(){
                if((options.mode=='bubble')||(options.attribute=='radius')){ //RADIUS-SPINNER (options.attribute only exists for mapsets (not pointsets))
                    $legend.find('div.radius').slideDown();
                } else {
                    $legend.find('div.radius').slideUp();
                }
                if(((type=='M')&&(options.mode!='bubble'))||(options.attribute=='fill')){  //COLOR SCALE NEEDED
                    $legend.find('div.color-scale').slideDown();
                    if(options.scale=='discrete'){ //default is 'continuous'
                        $legend.find('div.legend-continuous').slideUp();
                        $legend.find('div.legend-discrete').slideDown();
                    } else {
                        $legend.find('div.legend-continuous').slideDown();
                        $legend.find('div.legend-discrete').slideUp();
                    }
                } else {
                    $legend.find('div.color-scale').slideUp();
                }
            }
            function setRadLabel(){
                $legend.find('.radius-label').html(options.attribute=='fill'?'Marker radius: ':'Maximum marker radius: ');
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
            });
            $legend.find('button.dec-discrete').button({disabled: options.discreteColors.length<2}).click(function(){
                $legend.find('button.inc-discrete').button('enable');
                options.discreteColors = resetLegend(options.discreteColors.length-1, options);
                if(options.discreteColors.length<2) $(this).button('disable');
                makeLegend();
            });
            $legend.find('button.reset-discrete').button().click(function(){
                options.discreteColors = resetLegend(options.discreteColors.length, options);
                makeLegend();
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
                    discreteColors.push({color: discreteColor, cutoff: (i+1==negTranchCount && crossesZero)?0:nums[Math.round((nums.length-1)*(i+1)/count)]});
                }
                var fullPosColor = options.posColor||MAP_COLORS.POS;
                if(fullPosColor.substr(0,1)=='#')fullPosColor=fullPosColor.substr(1);
                fullR = parseInt(fullPosColor.substr(0,2), 16);
                fullG = parseInt(fullPosColor.substr(2,2), 16);
                fullB = parseInt(fullPosColor.substr(4,2), 16);
                for(i=negTranchCount;i<posTranchCount;i++){ //POSITIVE TRANCHES(default BLUE)
                    r = parseInt(fullR + (255-fullR)*(posTranchCount-i-1)/posTranchCount);
                    g = parseInt(fullG + (255-fullG)*(posTranchCount-i-1)/posTranchCount);
                    b = parseInt(fullB + (255-fullB)*(posTranchCount-i-1)/posTranchCount);
                    discreteColor = '#' + octet(r) + octet(g) + octet(b);
                    discreteColors.push({color: discreteColor, cutoff: nums[Math.round((nums.length-1)*(i+1)/count)]})
                }
                return discreteColors;

                function octet(s){
                    s = s.toString(16);
                    return (s.length==1?0:'') + s;
                }
            }
        }
    };
    return controller;
}

function continuousColorStrip(a, b){
    return '<span class="map_legend_gradient" style="-ms-filter: progid:DXImageTransform.Microsoft.gradient(startColorstr='+a+', endColorstr='+b+', gradientType=1);filter: progid:DXImageTransform.Microsoft.gradient(startColorstr='+a+', endColorstr='+b+', gradientType=1)background-image: -webkit-gradient(linear, left bottom, right bottom, from('+a+'), to('+b+'));background-image: -webkit-linear-gradient(left, '+a+', '+b+');background-image: -moz-linear-gradient(left, '+a+', '+b+');background-image:  -o-linear-gradient(left, '+a+', '+b+';background-image: linear-gradient(to left, '+a+','+b+');"></span>';
    //return '<span class="map_legend_gradient" style="-ms-filter: progid:DXImageTransform.Microsoft.gradient(startColorstr=#7ce3ff, endColorstr=#00355b, gradientType=1); filter: progid:DXImageTransform.Microsoft.gradient(startColorstr=#7ce3ff, endColorstr=#00355b, gradientType=1)background-image: -webkit-gradient(linear, left bottom, right bottom, from(#7ce3ff), to(#00355b));background-image: -webkit-linear-gradient(left, #7ce3ff, #00355b);background-image:    -moz-linear-gradient(left, #7ce3ff, #00355b);background-image:      -o-linear-gradient(left, #7ce3ff, #00355b;background-image:         linear-gradient(to left, #7ce3ff,#00355b);"></span>';
}
function continuousColorScale(options){
    return '<div class="continuous-strip-neg">' + continuousColorStrip(options.negColor||MAP_COLORS.NEG, '#CCCCCC') + '</div>'
        + '0.0'
        + '<div class="continuous-strip-pos">' + continuousColorStrip('#CCCCCC', options.posColor||MAP_COLORS.POS) + '</div>'
}