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
        graph: oPanelGraphs[panelId],
        $prov: $('#'+panelId + ' .provenance'),
        build:  function build(plotIndex){  //redo entire panel is plotIndex omitted
            var self = this;
            var i, j, plotList, mapList, plot, okcancel;
            self.$prov.show(); //compensation for margins @ 15px + borders
            okcancel = '<button class="config-cancel">cancel</button> <button class="config-apply">apply</button><br>';
            plotList = '';
            if(typeof plotIndex != 'undefined'){
                self.$prov.find('ol.plots').append( self.plotHTML(plotIndex) );
            } else {
                self.graph.plotsEdits = $.extend(true, [], self.graph.plots);  //this is the copy that the provenance panel will work with.  Will replace graph.plots on "OK"
                if(self.graph.plots){
                    plotList = '<div class="chart-plots">Chart:<ol class="plots">';

                    for(i=0;i<self.graph.plots.length;i++){
                        //outer PLOT loop
                        plotList += self.plotHTML(i);
                    }
                }

                plotList += '</ol>'
                    +  '<ol class="blank-plot components" style=""><li class="not-sortable">Drag and drop to plot lines to reorder them.  Drag and drop multiple series into a plot to create sums and ratios. Drag a series here to create a new plot line.  Double click on any series or plot line to edit its properties.</i></li></ol></div>';
                mapList = self.provenanceOfMap();
                self.$prov.html(okcancel + plotList + mapList);
                //sortable
                self.$prov.find(".components")
                    .sortable({
                        containment: self.$prov.get(0),
                        connectWith: ".components",
                        axis: "y",
                        delay: 150,   //in ms to prevent accidentally drags
                        update: function(event, ui){ self.componentMoved(ui)}
                        /* receive: function(event, ui){alert("received")},
                         remove: function(event, ui) {alert("removed")}*/
                    })
                    .disableSelection();
                self.$prov.find('.map-mode').buttonset()
                    .find('input').click(function(){
                        self.graph.mapsets.options.mode = $(this).val();
                        if(self.graph.mapsets.options.mode=='bubble' && !self.graph.mapsets.options.merges) self.graph.mapsets.options.merges = [];
                    });
                self.$prov.find(".plots").sortable({
                    axis: "y", dropOnEmpty: false}).disableSelection();
                //main buttons
                self.$prov.find("button.config-cancel").button({icons: {secondary: 'ui-icon-closethick'}}).click(function(){
                    self.provClose(this);
                });
                self.$prov.find("button.config-apply").button({icons: {secondary: 'ui-icon-check'}}).click(function(){
                    self.provOk(this);
                });
            }

            //apply global
            self.$prov.find("li.plot").off("click").click(function(evt){
                if(!evt.isPropagationStopped()){
                    evt.stopPropagation();
                    //alert("showPlotEditor(this");
                }
            });
            self.$prov.find("li.component").off("click").click(function(evt){
                if(!evt.isPropagationStopped()){
                    evt.stopPropagation();
                    //alert("showComponentEditor(this");
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
        },
        plotHTML:  function plotHTML(i){
            var self = this;
            var graph = self.graph;
            var plotColor, plotList = '', plot = graph.plotsEdits[i], componentHandle;
            if(plot.options.lineWidth) plot.options.lineWidth = parseInt(plot.options.lineWidth); else plot.options.lineWidth = 2;
            if(!plot.options.lineStyle) plot.options.lineStyle = 'Solid';
            plotColor = plot.options.lineColor || (oHighCharts[panelId].get('P'+i)?oHighCharts[panelId].get('P'+i).color:hcColors[i%hcColors.length]);
            plotList += '<li class="plot ui-state-highlight" data="P' + i + '">'
                + '<button class="edit-plot">edit </button>'
                + '<div class="line-sample" style="background-color:'+plotColor+';height:'+plot.options.lineWidth+'px;"><img src="images/'+plot.options.lineStyle+'.png" height="'+plot.options.lineWidth+'px" width="'+plot.options.lineWidth*38+'px"></div>'
                + '<div class="plot-info" style="display:inline-block;"><span class="plot-title">'+plotName(graph, plot)+'</span> <span class="plot-units">' + plotUnits(graph, plot) + '</span> (' + self.plotPeriodicity(plot)+')</div>'
                + '<ol class="components">';
            for(var j=0;j< plot.components.length;j++){
                //inner COMPONENT SERIES loop
                //TODO: add op icon and order by (+,-,*,/)
                componentHandle = plot.components[j].handle;
                if(plot.components[j].options.op==null)plot.components[j].options.op="+";

                plotList += '<li class="component ui-state-default" data="P'+ i + '-C' + j + '">'
                    //             + String.fromCharCode('a'.charCodeAt(0)+j) + ' '  //all series use lcase variables; ucase indicate a vector compnent such as a pointset or mapset
                    + '<span class="plot-op ui-icon ' + op.class[plot.components[j].options.op] + '">operation</span> '
                    + graph.assets[componentHandle].name + '</li>';
            }
            plotList +=   '</ol>';
            plotList += '</li>';
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
            var provHTML = "", c, p, plt, componentHandle, isSet;
            if(self.graph.map&&(self.graph.mapsets||self.graph.pointsets)){ //map!!
                provHTML = '<div class="map-prov"><h3>Map of '+ self.graph.map +'</h3>';
                if(self.graph.mapsets){
                    provHTML += '<div class="mapset">Mapset '
                        + '<div class="map-mode right">'
                        + '<input type="radio" name="'+ panelId +'-map-mode" id="'+ panelId +'-map-mode-C" value="choropleth" '+ ((!self.graph.mapsets.options.mode || self.graph.mapsets.options.mode!='bubble')?'checked':'') +' /><label for="'+ panelId +'-map-mode-C">choropleth</label>'
                        + '<input type="radio" name="'+ panelId +'-map-mode" id="'+ panelId +'-map-mode-B" value="bubble" '+ ((self.graph.mapsets.options.mode && self.graph.mapsets.options.mode=='bubble')?'checked':'') +' /><label for="'+ panelId +'-map-mode-B">bubble (mergable into regional sums)</label>'
                        + '</div>'
                        + '<ol class="mapsets">'
                        + '<li class="mapset ui-state-highlight">'
                        + '<button class="edit-mapset" style="float:right;">edit <span class="ui-icon ui-icon-arrowthickstop-1-s" style="display: inline-block;"> edit</span></button>'
                        + '<div class="color min" style="padding:0;margin:0;border: thin black solid; height: 10px; width: 10px;display:inline-block;background-color:'+ (self.graph.mapsets.options.minColor||'#C8EEFF') +';"></div> to '
                        + '<div class="color max" style="padding:0;margin:0;border: thin black solid; height: 10px; width: 10px;display:inline-block;background-color:'+ (self.graph.mapsets.options.maxColor||'#0071A4') +';"></div>'
                        + '<div class="plot-info" style="display:inline-block;"><span class="plot-title">'
                        + plotName(self.graph, self.graph.mapsets)+'</span> in ' + (self.graph.mapsets.options.units||plotUnits(self.graph, self.graph.mapsets)) + ' ' + (self.graph.mapsets.options.period||self.plotPeriodicity(self.graph.mapsets))+'</div>';

                    provHTML += '<ol class="map-comp components" style="list-style-type: none;>';
                    for(c=0;c<self.graph.mapsets.components.length;c++){
                        componentHandle = self.graph.mapsets.components[c].handle;
                        isSet = componentHandle.substr(0,1)=='M';
                        provHTML += '<li class="component ui-state-default" data="'+ componentHandle + '">'
                            + String.fromCharCode((isSet?'A':'a').charCodeAt(0)+c) + ' '  //all series use lcase variables; ucase indicate a vector compnent such as a pointset or mapset
                            + '<span class="plot-op ui-icon ' + op.class[self.graph.mapsets.components[c].options.op||'+'] + '">operation</span> '
                            + self.graph.assets[componentHandle].name + '</li>';
                    }
                    provHTML += '</ol>'
                        + '</ol>'
                        + '</div>'; //close mapset
                }
                if(self.graph.pointsets){
                    provHTML += '<div class="pointsets">Pointsets (location markers)<ol class="pointsets">';
                    for(p=0;p<self.graph.pointsets.length;p++){
                        pntset = self.graph.pointsets[p];
                        provHTML += '<li class="pointset ui-state-highlight">'
                            + '<button class="edit-pointset" style="float:right;">edit <span class="ui-icon ui-icon-arrowthickstop-1-s" style="display: inline-block;"> edit</span></button>'
                            + '<div class="plot-info" style="display:inline-block;"><span class="plot-title">'
                            + plotName(self.graph, pntset)+'</span> in ' + (pntset.options.units||plotUnits(self.graph, pntset)) + ' ' + (pntset.options.period||self.plotPeriodicity(pntset))+'</div>'
                            + '<ol class="point-comp components">';
                        for(c=0;c<pntset.components.length;c++){
                            componentHandle = pntset.components[c].handle;
                            isSet = (/[XM]/).test(componentHandle);
                            provHTML += '<li class="component ui-state-default" data="'+ componentHandle  + '">'
                                + String.fromCharCode((isSet?'A':'a').charCodeAt(0)+c) + ' '  //all series use lcase variables; ucase indicate a vector compnent such as a pointset or mapset
                                + '<span class="plot-op ui-icon ' + op.class[pntset.components[c].options.op||'+'] + '">operation</span> '
                                + self.graph.assets[componentHandle].name + '</li>';
                        }
                        provHTML += '</ol></li>';
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
            var oGraph, $targetSeriesList, pFromHandle, draggedComponent;
            var from, fromC, toC, fromP, toP, toOp;  //indexes
            var $prov = ui.item.closest(".provenance");
            if(ui.sender!=null){    // handle everything in the sorting call
                //is series already in here?  if not add
                from = ui.item.attr('data').split('-');
                fromP = from[0].substr(1);
                fromC = from[1].substr(1);
                oGraph = oPanelGraphs[visiblePanelId()];


                $targetSeriesList = ui.item.closest("ol.components");
                if($targetSeriesList.hasClass("blank-plot")){
                    //NEW!! series was dragged onto new plot landing area:  need to create new blank plot object, provide handle, and create new li/ul structure
                    //1.remove component from donor plot object
                    draggedComponent = oGraph.plotsEdits[fromP].components.splice(toC, 1)[0];
                    draggedComponent.options.op = '+';
                    //2. add new plot
                    oGraph.plotsEdits.push({options:{}, components: [draggedComponent]});
                    //3. add it and event it
                    self.build(oGraph.plotsEdits.length-1);
                } else {
                    // component was moved between plots
                    toP = ui.item.closest('li.plot').index();
                    toC = ui.item.index();
                    var targetHandle = oGraph.plotsEdits[fromP].components[fromC].handle;
                    //cancel drop in asset already in the target plot
                    for(var c=0;c<oGraph.plotsEdits[toP].components.length;c++){
                        if(oGraph.plotsEdits[toP].components[c].handle == targetHandle){
                            ui.item.closest(".provenance").find(".components[data='"+ pFromHandle +"']").sortable('cancel'); //do nothing else
                            return;
                        }
                    }
                    ui.item.attr('data','P' + toP + ':C' + toC);
                    //check to see operation / units for compatibility (all + or - op series must have matching units (either native or transformed)
                    var incomingOp, incomingUnits, thisUnits, thisOp, thisHandle, toPlot;
                    incomingOp = oGraph.plotsEdits[fromP].components[fromC].options.op || '+';  //addition default for same units
                    if(incomingOp=='+'||incomingOp=='-'){
                        for(c=0;c<oGraph.plotsEdits[toP].components.length;c++){
                            oGraph.plotsEdits[toP].components[c].options.op = oGraph.plotsEdits[toP].components[c].options.op || '+';
                            toOp = oGraph.plotsEdits[toP].components[c].options.op;
                            if(toOp=='+' || toOp=='-'){
                                if((oGraph.plotsEdits[toP].components[c].units||oGraph.assets[oGraph.plotsEdits[toP].components[c].handle].units)
                                    != (oGraph.plotsEdits[fromP].components[fromC].options.units||oGraph.assets[oGraph.plotsEdits[fromP].components[fromC].handle].units)){
                                    oGraph.plotsEdits[fromP].components[fromC].options.op = '/';  //default to a ratio when units are different
                                    ui.item.find('.plot-op').removeClass().addClass('plot-op ui-icon' + op.class['/']);
                                    break;
                                }
                            }
                        }
                    }

                    draggedComponent = oGraph.plotsEdits[fromP].components.splice(fromC, 1)[0];
                    oGraph.plotsEdits[toP].components.splice(toC, 0, draggedComponent);
                }            //check to see if source if empty and kill if need be
                if(oGraph.plotsEdits[fromP].components.length==0){
                    oGraph.plotsEdits.splice(fromP, 1);
                    $prov.find("li.plot[data='P"+ fromP +"']").remove();
                }
                self.sortSeriesUlByOp($targetSeriesList);
            }
        },
        sortSeriesUlByOp:  function sortSeriesUlByOp($list){

        },
        provOk: function provOk(btn){//save change to graph object and rechart
            //TODO: save and rechart
            var self = this;
            self.graph.plots = self.graph.plotsEdits;
            delete this.graph.plotsEdits;
            delete this.graph.mapSetEdits;
            delete this.graph.pointSetEdits;
            var $panel= $(btn).closest("div.graph-panel");
            this.provClose(btn);
            $panel.find(".graph-type").change();  //trigger redaw
        },
        provClose:  function provClose(btn){ //called directly from cancel btn = close without saving
            var self = this;
            delete self.graph.plotsEdits;
            self.$prov.find("ol, ul").sortable("destroy");
            self.$prov.closest('div.graph-panel').find('.graph-nav-graph').click();
        },
        sortComponentsByOp:  function sortComponentsByOp(comp){
            comp.sort(function(a,b){
                if(!a.options.op)a.options.op="+";
                if(!b.options.op)b.options.op="+";
                return op.value[a.options.op]-op.value[b.options.op];
            })
        },
        sortComponentsList:  function sortComponentsList(olComponents, oPlots){
            var $olComponents = $(olComponents);
            var plotIndex =  $olComponents.closest('li.plot').index();
            this.sortComponentsByOp(oPlots[plotIndex].components);
            for(var i=0;i<oPlots[plotIndex].components.length;i++){
                if($olComponents.find("li[data='"+ oPlots[plotIndex].components[i].handle +"']").index()!=i){
                    $olComponents.find("li[data='"+ oPlots[plotIndex].components[i].handle +"']").insertBefore($ul.find("li:eg("+i+")"));
                }
            }
        },
        showComponentEditor:  function showComponentEditor(liComp){
            var self = this;
            var $liComp = $(liComp);
            var plotsEdits = self.graph.plotsEdits;
            var compHandle = $(liComp).attr('data');
            var plotIndex = $(liComp).closest('li.plot').index();
            var iComp = $liComp.index(); //could have just gotten index of liComp as the object should be in sync
            var components = plotsEdits[plotIndex].components;
            var component = components[iComp];
            //$liComp.find(".edit-comp").hide();
            var editDiv =  '<button class="comp-copy prov-float-btn">make copy</button>'
                + '<button class="comp-delete prov-float-btn" style="background-color: #FF0000;">remove series</button>'
                + '<div class="comp-editor" style="display: none;">'
                /*        + '<span class="edit-label">operation:</span><ul class="comp-op selectable">'
                 +       '<li data="+" class="ui-widget-content"><span class="ui-icon op-addition"></span> add</li>'
                 +       '<li data="-" class="ui-widget-content"><span class="ui-icon op-subtraction"></span> subtract</li>'
                 +       '<li data="*" class="ui-widget-content"><span class="ui-icon op-multiply"></span> multiple summed series</li>'
                 +       '<li data="/" class="ui-widget-content"><span class="ui-icon op-divide"></span> divide summed series</li>'
                 + '</ul>'*/
                +   '<span class="edit-label">units:</span><br />'
                +   '<span class="edit-label">frequency:</span>'
                + '</div>';
            var $editDiv = $(editDiv);
            $liComp.find(".plot-op").hide().after(
                '<div class="op">'
                    +       '<input type="radio" data="+"  id="op-addition'+compHandle+'" value="+" name="op-radio'+compHandle+'" /><label for="op-addition'+compHandle+'"><span class="ui-icon op-addition">add</span></label>'
                    +       '<input type="radio" data="-"  id="op-subtraction'+compHandle+'" value="-" name="op-radio'+compHandle+'" /><label for="op-subtraction'+compHandle+'"><span class="ui-icon op-subtraction">subtract</span></label>'
                    +       '<input type="radio" data="*"  id="op-multiply'+compHandle+'" value="*" name="op-radio'+compHandle+'" /><label for="op-multiply'+compHandle+'"><span class="ui-icon op-multiply">multiple summed series</span></label>'
                    +       '<input type="radio" data="/"  id="op-divide'+compHandle+'" value="/" name="op-radio'+compHandle+'" /><label for="op-divide'+compHandle+'"><span class="ui-icon op-divide">divide summed series</span></label>'
                    +   '</div>');
            //$editDiv.find("li[data='"+component.options.op+"']").attr('checked','checked');
            $liComp.find("div.op").buttonset()
                .find("input[data='"+component.options.op+"']")
                .click()
                .end()
                .find('input:radio')
                .click(function(){
                    plotsEdits[plotIndex].components[iComp].options.op = $(this).val()
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
                var p = self.graph.plotsEdits.push({options: {}, components: [$.extend(true, {}, component, {options: {op: '+'}})]}) - 1;
                var compHandle = self.graph.plotsEdits[p].components[0].handle;
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
            var oPlot = self.graph.plotsEdits[$liPlot.index()];
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
                + ((oPlot.components.length>1)?'<span class="edit-label">missing points:</span><br />':'')
                + '<div class="edit-block"><span class="edit-label">units:</span><input class="plot-units" type="text" value="' + (oPlot.options.units||'') + '" /></div>'
                + '<div class="edit-block"><span class="edit-label">line breaks:</span><div class="edit-breaks">'
                +   '<input type="radio" id="nulls-'+panelId+'" name="line-break-'+panelId+'" /><label for="nulls-'+panelId+'">on nulls</label>'
                +   '<input type="radio" id="missing-'+panelId+'" name="line-break-'+panelId+'" /><label for="missing-'+panelId+'">on missing value and nulls</label>'
                +   '<input type="radio" id="never-'+panelId+'" name="line-break-'+panelId+'" /><label for="never-'+panelId+'">never</label></div>'
                + '</div>'
                + '<div class="edit-block"><span class="edit-label">component math:</span><div class="edit-math">'
                +   '<input type="radio" id="required-'+panelId+'" name="comp-math-'+panelId+'" /><label for="required-'+panelId+'">all series values required</label>'
                +   '<input type="radio" id="missingAsZero-'+panelId+'" name="comp-math-'+panelId+'" /><label for="missingAsZero-'+panelId+'">treat missing values as zeros in sums</label>'
                +   '<input type="radio" id="nullsMissingAsZero-'+panelId+'" name="comp-math-'+panelId+'" /><label for="nullsMissingAsZero-'+panelId+'">treat missing and null values as zeros in sums</label></div>'
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
                self.graph.plotsEdits.splice($liPlot.index(),1);
                $liPlot.remove();
            });
            $editDiv.find("button.plot-copy").button({icons: {secondary: 'ui-icon-copy'}}).click(function(){
                self.graph.plotsEdits.push($.extend(true,{},oPlot));
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