/**
 * Created with JetBrains PhpStorm.
 * User: mark__000
 * Date: 2/17/13
 * Time: 11:13 PM
 * To change this template use File | Settings | File Templates.
 */

//PROVENANCE PANEL CREATOR AND HELPER FUNCTIONS
function ProvenanceController(panelId){
    //shortcuts to application global functions and variables
    var mapsetLegend, pointsetLegend, 
        MD = MashableData, 
        globals = MD.globals,
        grapher = MD.grapher,
        common = MD.common,
        mustache = common.mustache,
        dashStyles = globals.dashStyles,
        DEFAULT_RADIUS_FIXED = globals.DEFAULT_RADIUS_FIXED,
        DEFAULT_RADIUS_SCALE = globals.DEFAULT_RADIUS_SCALE,
        hcColors = globals.hcColors,
        period = globals.period,
        op = globals.op,
        MAP_COLORS = globals.MAP_COLORS,
        fillScalingCount = grapher.fillScalingCount;
    //closure variables (set in build and accessible throughout
    var panelGraph,
        $panel,
        $prov,
        isDirty,
        provGraph,
        provMapPlots,
        provPlots,
        provPointPlots,
        provAnnotations,
        provMapconfig,
        snippets = {
            compMathDiv: '<div class="edit-block">'
                +       '<div class="edit-math">'
                +           '<input type="radio" id="required-'+panelId+'" name="comp-math-'+panelId+'" data="compMath"  value="required"/><label for="required-'+panelId+'">all values required else null</label>'
                +           '<input type="radio" id="missingAsZero-'+panelId+'" name="comp-math-'+panelId+'" data="compMath"  value="missingAsZero"/><label for="missingAsZero-'+panelId+'">use zero for missing values</label>'
                +           '<input type="radio" id="nullsMissingAsZero-'+panelId+'" name="comp-math-'+panelId+'" data="compMath" value="nullsMissingAsZero"/><label for="nullsMissingAsZero-'+panelId+'">use zero for missing and null values</label>'
                +       '</div>'
                +   '</div>'
        },
        templates =  {
            continuousColorScale: '<div class="continuous-strip-neg">{{negStrip}}</div>0<div class="continuous-strip-pos">{{posStrip}}</div>',
            continuousColorStrip: '<span class="map_legend_gradient" style="-ms-filter: progid:DXImageTransform.Microsoft.gradient(startColorstr={{a}}, endColorstr={{b}}, gradientType=1);filter: progid:DXImageTransform.Microsoft.gradient(startColorstr={{a}}, endColorstr={{b}}, gradientType=1)background-image: -webkit-gradient(linear, left bottom, right bottom, from({{a}}), to({{b}}));background-image: -webkit-linear-gradient(left, {{a}}, {{b}});background-image: -moz-linear-gradient(left, {{a}}, {{b}});background-image:  -o-linear-gradient(left, {{a}}, {{b}};background-image: linear-gradient(to left, {{a}},{{b}});"></span>',
            discreteLegendShell: '<div class="edit-block"><div class="edit-block discrete-legend"></div>'
                +   '<button class="inc-discrete">+</button>'
                +   '<button class="dec-discrete">-</button>'
                +   '<button class="reset-discrete">calculate colors</button>'
                + '</div>',
            legendEditor: '<div class="edit-block">' 
                + '<div class="map-mode edit-block">'
                +    '<input type="radio" name="'+ panelId +'-map-mode" id="'+ panelId +'-map-mode-C" value="fill" data="mode" {{notBubble}} /><label for="'+ panelId +'-map-mode-C">fill (heat map)</label>'
                +    '<input type="radio" name="'+ panelId +'-map-mode" id="'+ panelId +'-map-mode-B" value="bubble" data="mode" {{bubble}} /><label for="'+ panelId +'-map-mode-B">bubbles (mergable into regional sums)</label>'
                + '</div><span class="merge-formula ital">merge formula = &#931; numerator / &#931; denominator</span>'
                + '<div class="radius"  style="display: none;">'
                +    '<span class="edit-label radius-label">maximum {{markerType}} radius (pixels): </span><input class="radius-spinner" value="{{maxRadius}}" />'
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
                +       '-<div class="continuous-color"><input class="neg color-picker" type="text" data="negColor" value="{{negColor}}" /></div>{{continuousColorScale}}<div class="continuous-color"><input class="pos color-picker" type="text" data="posColor" value="{{posColor}}" /></div>+'
                +   '</div>'
                +   '<div class="edit-block legend-discrete" style="display: none;"></div>'
                + '</div>',
            mergeFormula: '<span class="merge-formula">merge formula = &#931; numerator / &#931; denominator</span>',
            mapsetEditor: '<div class="plot-editor" style="display: none;">{{mergeFormula}}'
                + '<button class="plot-close prov-float-btn">close</button>'
                +   '<button class="plot-delete prov-float-btn">delete heat map</button>'
                +   '<div class="edit-block">name: </span><input class="plot-name" type="text" data="name"/></div><br>'
                +   '<div class="edit-block"><span class="edit-label">units:</span><input class="plot-units long" data="units" type="text"/><span class="plot-edit-k"> scalor: <input class="short" value="{{k}}"></div><br>'
                +   '<span class="edit-label">Point calculations:</span>'
                +   snippets.compMathDiv
                +   '<div class="edit-block add-bunny"><button  class="add-bunny">add regional tracking plot</button></span></div> '
                +   '</div>',
            seriesPlotWithComponents: '<li class="plot" data="P{{i}}">'
                + '<button class="edit-plot">configure</button>'
                + '<div class="line-sample" style="background-color:{{plotColor}};height:{{lineHeight}}px;"><img src="images/{{lineStyle}}.png" height="{{lineHeight}}px" width="{{lineWidth}}px"></div>'
                + '<div class="plot-info" style="display:inline-block;"><span class="plot-title">'
                + '{{name}}</span> ({{plotPeriodicity}}) in <span class="plot-units">{{units}}</span></div>'
                + '<span class="plot-formula">= {{formula}}</span><br>'
                + '{{components}}'
                + '</li>',
            pointPlots: '<div class="pointsets"><h4>'+iconsHMTL.pointset+' mapped set of markers (defined latitude and longitude)</h4>'
                // NO SIMPLE MARKERS = FINISH CURRENT FUNCTIONALITY !!!  + '<span class="edit-label marker-scaling right"><label><input type="checkbox" '+(provMapconfig.markerScaling=='none'?'checked':'')+'> do not scale markers </label></span>'
                + '<div class="pointsets-colors" style="margin-bottom:5px;"></div>'
                + '<ol class="pointsets">{{pointPlotsHTML}}</ol></div>',
            pointPlot: '<li class="pointset">' 
                + '<button class="edit-pointset right">configure</button>'
                + '<div class="plot-info" style="display:inline-block;">'
                + '<div class="marker" style="background-color: {{color}}"></div>'
                + '<span class="plot-title">{{name}}</span> ({{readableFrequency) in <span class="plot-units">{{units}}</span>'
                + '<span class="plot-formula">= {{formula}}</span></div>'
                + '{{components}}'
                + '</li>',
            mapProv: '<div class="map-prov">{{cubeSelector}}<h3>Map of {{map}}</h3>'
                + '{{mapPlots}}{{pointPlots}}'
                + '</div>',
            mapPlots: '<div class="mapset">'
                + '<h4>' + iconsHMTL.mapset + ' Mapped set of regions (country, state, or county)</h4>'
                + '<span class="map-mode ehide">mode: {{mode}}</span>'
                + '{{mapPlots}}'
                + '</div>', 
            mapPlot: '<div class="mapset-colors" style="margin-bottom:5px;"></div>'
                + '<div class="plot-info">'
                + '<button class="edit-mapset right ehide">configure</button>'
                + '<div class="edit-block ehide">'
                +   '<span class="plot-title">{{name}}</span> ({{readableFrequency}}) in <span class="plot-units">{{units}}</span>'
                + '</div>'
                + '<span class="plot-formula">= {{formula}}</span><br>'
                /*                        + '<span class="map-legend ehide">-'
                 +    continuousColorScale(provMapPlots.options)
                 + '+</span>'*/
                + '<div class="editor"></div>' //where edit info is added
                + '</div>{{components}}',
            pointSetEditor:  '<div class="plot-editor" style="display: none;">'
                + '<button class="plot-close prov-float-btn">close</button>'
                + '<button class="plot-copy prov-float-btn">make copy</button>'
                + '<button class="plot-delete prov-float-btn">delete marker set</button>'
                + '<div class="edit-block"><input class="marker-color" type="text" data="color" value="{{color}}" /></div>'
                + '<div class="edit-block">name: </span><input class="plot-name" type="text"  /></div>'
                + '<div class="edit-block"><span class="edit-label">units:</span><input class="plot-units long" type="text" /><span class="plot-edit-k"><input class="short" value="{{k}}"> </div><br>'
                + '<span class="edit-label attribute">Values will change marker  </span>'
                + '<div class="attribute">'
                +   '<input type="radio" name="attribute-'+panelId+'" id="attribute-r-'+panelId+'" data="attribute" value="r"/><label for="attribute-r-'+panelId+'">area</label>'
                +   '<input type="radio" name="attribute-'+panelId+'" id="attribute-fill-'+panelId+'" data="attribute" value="fill" /><label for="attribute-fill-'+panelId+'">color</label>'
                + '</div>'
                + '<span class="edit-label">Point calculations:</span>'
                + snippets.compMathDiv,
            plotEditor: '<div class="plot-editor" style="display: none;">'
                + '<button class="plot-close prov-float-btn">close</button>'
                + '<button class="plot-copy prov-float-btn">make copy</button>'
                + '<button class="plot-delete prov-float-btn">delete plot</button>'
                + '<fieldset class="edit-line" style="padding: 0 5px;display:inline-block;"><legend>color, thickness, &amp; style</legend>'
                +   '<div class="edit-block"><input class="plot-color" type="text" data="color" value="{{color}}" /></div>' +
                + '</fieldset>'
                + '<div class="edit-block">Name: <input class="plot-name" type="text" data="name" /></div>'
                + '<div class="edit-block"><span class="edit-label">display as:</span><select class="plot-type" data="type"><option value="">graph default</option><option value="line">line</option><option value="column">column</option><option value="area">stacked area</option></select></div>'
                + '<div class="edit-block"><span class="edit-label">units:</span><input class="plot-units long" data="units" type="text"  /><span class="plot-edit-k edit-label">scalor:<input class="short" value="{{k}}"></span> '
                + '<span class="edit-label">frequency:</span><select class="dshift">{{fOptions}}</select></div><br>'
                + '<span class="edit-label">Point calculations:</span>'
                + snippets.compMathDiv
                + '<div class="edit-block"><span class="edit-label">Break line</span><div class="edit-breaks">'
                +   '<input type="radio" id="never-'+panelId+'" name="line-break-'+panelId+'" data="breaks" value="never" /><label for="never-'+panelId+'">never</label>'
                +   '<input type="radio" id="nulls-'+panelId+'" name="line-break-'+panelId+'" data="breaks" value="nulls" /><label for="nulls-'+panelId+'">on nulls</label>'
                +   '<input type="radio" id="missing-'+panelId+'" name="line-break-'+panelId+'" data="breaks" value="missing" /><label for="missing-'+panelId+'">on missing value and nulls</label></div>'
                + '</div>'
                +'</div>',
            component: '<li class="component ui-state-default" data="{{handle}}">'
                + '<span class="plot-op ui-icon {{opClass}}">operation</span> '
                + '<span class="comp-edit-k" style="display:none;"><input class="short" value="{{k}}"> * </span>'
                + '{{icon}}{{name}} ({{freq}}) in {{units}} {{source}}'
                + '</li>',
            components: '<ol class="components {{plotType}}-comp">{{components}}</ol>',
            okcancel: '<button class="config-cancel">cancel edits</button>'
        },
    controller = {
        build:  function build(plotIndex){  //redo entire panel if plotIndex omitted
            var self = this;
            var i, allSeriesPlots='', allMapPointPlots, plot;
            if(typeof plotIndex != 'undefined'){  //update single plot
                if($prov.find('.chart-plots').length==0) $prov.find('.config-cancel').after('<div class="chart-plots"><H4>Chart</H4><ol class="plots"></ol></div');
                $prov.find('ol.plots').append(self.seriesPlotHTML(plotIndex) );
            } else {  //initialize!!!
                $prov = $('#'+panelId + ' .provenance').show(); //compensation for margins @ 15px + borders
                panelGraph = globals.panelGraphs[panelId], //reference kept for duration
                isDirty = false;
                
                //make local copies that the provenance panel will work with.  Will replace graph.plots, mapsets, pointsets and annotations on "OK"
                provGraph = panelGraph.clone();
                provPlots = provGraph.plots || false;
                provMapPlots = provGraph.mapsets || false;
                provPointPlots = provGraph.pointsets || false;
                provAnnotations = provGraph.annotations;
                provMapconfig = provGraph.mapconfig;

                if(provPlots){
                    allSeriesPlots = '<div class="chart-plots"><H4>Chart</H4><ol class="plots">';
                    for(i=0;i<provPlots.length;i++){
                        //outer PLOT loop
                        allSeriesPlots += self.seriesPlotHTML(i);
                    }
                }

                allSeriesPlots += '</ol>'
                    +  '<ol class="blank-plot landing components" style=""><li class="not-sortable">Drag and drop to plot lines to reorder them.  Drag and drop multiple series into a plot to create sums and ratios. Drag a series here to create a new plot line.</i></li></ol></div>';
                allMapPointPlots = self.provenanceOfMap();  //
                $prov.html(templates.okcancel + allSeriesPlots + allMapPointPlots);
                if(provMapPlots){
                    for(i=0;i<provMapPlots.length;i++){
                        mapsetLegend = this.legendEditor($prov.find('.mapset-colors'), provMapPlots[i].options, 'M');
                    }
                }
                if(provPointPlots) {
                    pointsetLegend = this.legendEditor($prov.find('.pointsets-colors'), provMapconfig, 'X');
                    if(provMapconfig.markerScaling) $prov.find('div.pointsets div.color-scale').slideDown();
                    /* NO SIMPLE MARKERS = FINISH CURRENT FUNCTIONALITY !!!
                     $prov.find('.marker-scaling input').change(function(){
                     provMapconfig.markerScaling = (this.checked?'none':'yes');
                     $prov.find('div.pointsets div.color-scale').slideToggle();
                     $prov.find('.attribute').slideToggle();
                     makeDirty();
                     });*/
                }
                $prov.find('select.cubeSelector').change(function(){
                    self.set(provMapconfig, $(this));
                    delete panelGraph.assets.cube;
                });
                $prov.find('.map-mode').buttonset()
                    .find('input').click(function(){
                        provMapPlots.options.mode = $(this).val();
                        if(provMapPlots.options.mode=='bubble' && !provMapPlots.options.merges) {
                            provMapPlots.options.merges = [];
                        } else {
                            $merge.show();
                        }
                    });
                /*var $merge = $prov.find('.merge-mode').buttonset()
                    .find('input').click(function(){
                        provMapPlots.options.merge = $(this).val();
                    });
                if(provMapPlots && (!provMapPlots.options.mode || provMapPlots.options.mode=='bubble')) $merge.hide();
*/

                //main buttons
                $prov.find("button.config-cancel")
                    .button({disabled: true, icons: {secondary: 'ui-icon-closethick'}}).addClass('ui-state-error')
                    .click(function(){
                        self.provClose();
                    });
                $prov.find("button.config-apply").button({icons: {secondary: 'ui-icon-check'}}).click(function(){
                    self.provOk();
                });
            }

            //all matching prov components, therefore unbind before binding
            $prov.find("li.plot").off("click").click(function(evt){
                if(!evt.isPropagationStopped()){
                    evt.stopPropagation();
                }
            });
            $prov.find("li.component").off("click").click(function(evt){
                if(!evt.isPropagationStopped()){
                    evt.stopPropagation();
                }
            });
            $prov.find(".edit-plot")
                .button({icons: {secondary: 'ui-icon-pencil'}})
                .off("click")
                .click(function(){
                    var $liPlot = $(this).closest("li");
                    $liPlot.find("li.component").each(function(){
                        self.showComponentEditor(this, 'plot');
                    });
                    self.showSeriesPlotEditor($liPlot);
                });

            $prov.find(".edit-mapset")
                .button({icons: {secondary: 'ui-icon-pencil'}})
                .off("click")
                .click(function(){
                    self.sortableOff();
                    $prov.find('.mapset').find("ol.M-comp li.component").each(function(){
                        self.showComponentEditor(this, 'mapset');
                    });
                    self.showMapSetEditor();
                });

            $prov.find(".edit-pointset")
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
        seriesPlotHTML:  function seriesPlotHTML(i){ //generic
            var self = this, plot = provPlots[i];
            return mustache(templates.seriesPlotWithComponents,{
                i: i,
                plotColor: plot.options.color || ((panelGraph.chart&&panelGraph.chart.get('P'+i))?panelGraph.chart.get('P'+i).color:hcColors[i%hcColors.length]),
                lineWidth: 38 * plot.options.lineWidth,
                lineHeight: plot.options.lineWidth||2,
                lineStyle: plot.options.lineStyle || 'Solid',
                name: plot.name(),
                plotPeriodicity: self.plotPeriodicity(plot),
                units: plot.units(),
                formula: plot.formula(),
                components: self.componentsHTML(plot)
            });
        },
        componentsHTML: function(plot){
            var HTML = '', comp, componentsHTML='';
            var algorithm = {
                sum: 'summing',
                wavg: 'day-weighted averaging of'
            };
            for(var j=0;j< plot.components.length;j++){
                //inner COMPONENT loop
                comp = plot.components[j];
                if(plot.components[j].options.op==null) plot.components[j].options.op="+";

                HTML  += mustache(templates.component, {
                    handle: comp.handle(),
                    opClass: op.cssClass[plot.components[j].options.op],
                    k: comp.options.k||1,
                    icon: comp.isPointSet()?iconsHMTL.pointset:(comp.isMapSet()?iconsHMTL.mapset:''),
                    name: comp.name(),
                    freq: plot.options.fdown!=comp.freq&&plot.options.algorithm?period.name[comp.freq]+' created by <a href="/workbench-help/changing-frequency/" traget="_blank">'+algorithm[plot.options.algorithm] +'</a> '+period.name[comp.freq]+' data':period.name[comp.freq],
                    units: comp.units,
                    source: comp.isSeries()?' <a class="link comp-view">view source data</a>':''
                });
            }
            return mustache(templates.components, {
                type: plot.type(),
                components: componentsHTML
            });
        },
        plotPeriodicity:   function plotPeriodicity(plot){
            return '<span class="plot-freq">'+period.name[plot.freq()]+(plot.options.fdown? synthesized:'')+'</span>';
        },
        sortableOff: function(){
            var self = this;
            $prov.find("ol.plots").sortable('disable').enableSelection();
            $prov.find("ol.components").sortable('disable').enableSelection();
            $prov.find("ol.pointsets").sortable('disable').enableSelection();
        },
        sortableOn: function(){
            var self = this;
            $prov.find("ol.components")
                .sortable({
                    containment: $prov.get(0),
                    connectWith: ".components",
                    disabled: false,
                    cancel: ".component-landing",
                    axis: "y",
                    delay: 150,   //in ms to prevent accidentally drags
                    start: function(event, ui){
                        var plotIndex, compIndex, type, obj;
                        //determinate source type
                        if(ui.item.parent().hasClass("M-comp")){type="map"; obj = provMapPlots[ui.item.closest("li.plot").index()]}
                        if(ui.item.parent().hasClass("S-comp")){type="plot"; obj = provPlots[ui.item.closest("li.plot").index()]}
                        if(ui.item.parent().hasClass("X-comp")){type="point"; obj = provPointPlots[ui.item.closest("li.plot").index()]}
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
            $prov.find("ol.plots")
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
                        var movedPlot = provPlots.splice(self.dragging.plotIndex, 1)[0];
                        provPlots.splice(ui.item.index(),0,movedPlot);
                        var shift = (ui.item.index()>self.dragging.plotIndex)?-1:1;
                        for(i=0;i<provAnnotations.length;i++){
                            if(provAnnotations[i].type=="point"){
                                oldAnnoIndex = parseInt(provAnnotations[i].series.substr(1));
                                if(oldAnnoIndex==self.dragging.plotIndex){
                                    provAnnotations[i].series = "P" +  ui.item.index();
                                } else {
                                    provAnnotations[i].series = "P" + (oldAnnoIndex+shift).toString();
                                }
                            }
                        }
                        makeDirty();
                    }
                })
                .disableSelection();
            $prov.find("ol.pointsets")
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
                            obj: provPointPlots[ui.item.index()]
                        }
                    },
                    update: function(event, ui){  //only within!
                        if(ui.sender==null) return;
                        var movedPointset = provPointPlots.splice(self.dragging.plotIndex,1);
                        provPointPlots.splice(ui.item.index(),0,movedPointset);
                        makeDirty();
                    }
                })
                .disableSelection();
            $prov.find('a.comp-view').off().click(function(){
                var compHandle = $(this).closest('li').attr('data');
                if(compHandle){
                    preview(panelGraph.assets[compHandle]);
                }
            });
        },
        componentMoved:  function componentMoved(ui){  //triggered when an item is move between lists or sorted within.  Note that moving between plot lists triggers two calls
            //first find out whether a sort or a move, and whether that move empty or created a new component.
            var self = this;
            var $targetSeriesList, pFromHandle, draggedComponent;
            var i, handle, thisHandle, from, fromC, toC, fromP, toP, toOp, toType, toPlotObject;  //indexes
            var $prov = $prov;
            //sortable's update event gets triggered for each OL of components involved.  If the ui.sender is null, the event is trigger by the sending OL.
            if(ui.sender==null && ui.item.closest('ol')[0]!=self.dragging.$ol[0]) return; //prevent double call, but allow when sorting within

            //cancel if adding to a plot that already has the same series
            toP = ui.item.closest('.plot').index();

            //check to see if this is a new plot
            var newPlot = ui.item.parent().hasClass('blank-plot');

            //component landing type has to be either a plot, a mapset or a pointset
            if(ui.item.parent().hasClass("M-comp")){
                toType="map";
                if(!newPlot) toPlotObject = provMapPlots[toP];
            }
            if(ui.item.parent().hasClass("S-comp")){
                toType="plot";
                if(!newPlot) toPlotObject = provPlots[toP];
            }
            if(ui.item.parent().hasClass("X-comp")){
                toType="point";
                if(!newPlot) toPlotObject = provPointPlots[toP]
            }

            //pointset and mapset type series must belong to a pointset or a mapset respectively
            thisHandle = ui.item.attr('data');
            if(thisHandle[0]=='M' && toType!='map'){
                $prov.find("ol.components").sortable("cancel");
                dialogShow('mapset restrictions', 'A mapset is a grouping of series, each correspond to an area on a map, such as a state or country.  Mapsets cannot be mixed with marker sets or displayed on a line graph.<br><br>Note that from from the map, you can easily select and chart any of this mapsets\' component series.');
                return;
            }
            if(thisHandle[0]=='M' && toType!='map'){
                $prov.find("ol.components").sortable("cancel");
                dialogShow('mapset restrictions', 'A pointset is a grouping of series, each correspond to a precise location determined by longitude and latitude values.  Pointsets cannot be mixed with area mapsets or displayed a line graph.<br><br>Note that from from the map, you can easily select and chart any of this pointsets\' component series.');
                return;
            }

            //duplicate series in same plot not permitted
            if(toP!=self.dragging.plotIndex && self.dragging.type==toType && ui.item.closest('ol')[0]!=self.dragging.$ol[0]){
                for(i=0;i<toPlotObject.components.length;i++){
                    if(toPlotObject.components[i].handle() == thisHandle) {
                        $prov.find("ol.components").sortable("cancel");
                        dialogShow('duplicate series', 'This series is already a component of the target plot.<br><br>If you want to use a series multiple times in the plot formula, use <button class="manual ui-button ui-widget ui-state-default ui-corner-all ui-button-text-icon-secondary ui-state-hover" role="button" aria-disabled="false"><span class="ui-button-text">manual editing</span><span class="ui-button-icon-secondary ui-icon ui-icon-pencil"></span></button> of the formula from with the <button class="manual ui-button ui-widget ui-state-default ui-corner-all ui-button-text-icon-secondary ui-state-hover" role="button" aria-disabled="false"><span class="ui-button-text">manual editing</span><span class="ui-button-icon-secondary ui-icon ui-icon-pencil"></span></button> plot instead.');
                        return;
                    }
                }
            }

            //frequency must be the same
            if(toP!=self.dragging.plotIndex && self.dragging.type==toType && !newPlot){
                for(i=0;i<toPlotObject.components.length;i++){
                    if(panelGraph.assets[thisHandle].freq!=toPlotObject.components[i].freq){
                        $prov.find("ol.components").sortable("cancel");
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
                provPlots.push(toPlotObject);
                $prov.find('ol.plots').append(self.seriesPlotHTML(provPlots.length-1));
            } else {
                toPlotObject.components.splice(toC,0,cmp);
            }
            self.setFormula(toPlotObject, ui.item.closest(".plot"));

            //5. check for no components > delete object; remove plot; adjust annotations
            if(self.dragging.obj.components.length==0){
                if(self.dragging.type=='plot'){
                    provPlots.splice(self.dragging.plotIndex,1);
                    $prov.find("ol.plots li.plot")[self.dragging.plotIndex].remove();
                    //check annotations
                    var oldAnnoIndex;
                    for(i=0;i<provAnnotations.length;i++){
                        if(provAnnotations[i].type=="point"){
                            oldAnnoIndex = parseInt(provAnnotations[i].series.substr(1));
                            if(oldAnnoIndex==self.dragging.plotIndex){
                                provAnnotations.splice(i,1);
                                i--;
                            }
                            if(oldAnnoIndex>self.dragging.plotIndex){
                                provAnnotations[i].series = "P" +  --oldAnnoIndex;
                            }
                        }
                    }
                }
                if(self.dragging.type=='point'){
                    provPointPlots.splice(self.dragging.plotIndex,1);
                    $prov.find("ol.pointsets li.plot")[self.dragging.plotIndex].remove();
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
            if(isDirty && (provPlots||provMapPlots||provPointPlots)){
                if(provPlots && provPlots.length>0) panelGraph.plots = provPlots; else delete panelGraph.plots;
                panelGraph.annotations = provAnnotations;
                if(provMapPlots && provMapPlots.components && provMapPlots.components.length>0) panelGraph.mapsets = provMapPlots; else delete panelGraph.mapsets;
                if(provPointPlots && provPointPlots.length>0) panelGraph.pointsets = provPointPlots; else delete panelGraph.pointsets;
                panelGraph.mapconfig = provMapconfig;
                if(!panelGraph.mapsets && !panelGraph.pointsets) panelGraph.map='';  //remove map
                this.provClose();
                panelGraph.fetchAssets(function(){
                    if(!noRedraw) $('#'+panelId).find(".graph-type").change();  //trigger redaw
                });
            }
        },
        provClose:  function provClose(){ //called directly from cancel btn = close without saving
            var self = this;
            delete provPlots;
            delete provAnnotations;
            delete provMapPlots;
            delete provPointPlots;
            delete provMapconfig;
            $prov.find("ol.ui-sortable").sortable("destroy");
            $prov.closest('div.graph-panel').find('.graph-nav-graph').click();
            isDirty = false;
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
            if(type=="mapset") plot = provMapPlots;
            if(type=="pointset") plot = provPointPlots[plotIndex];
            if(type=="plot") plot = provPlots[plotIndex];
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
                provPlots.push(newPlot);
                var name = panelGraph.assets[compHandle].name;
                $prov.find("ol.plots").append(self.componentsHTML(newPlot));
            });
        },
        showSeriesPlotEditor:  function showSeriesPlotEditor(liPlot){
            var self = this;
            self.sortableOff();
            var $liPlot = $(liPlot);
            var plotIndex = $liPlot.index();
            var oPlot = provPlots[plotIndex];
            var options = oPlot.options;
            
            //TEMPLATE VALUES
            var plotColor = oPlot.options.color||panelGraph.chart.get('P' + $liPlot.index()).color;
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
            var f = oPlot.freq();
            var fOptions = this.freqOptions(oPlot);

            //close any open editors
            $prov.find("button.plot-close").click();  
            
            //instantiate the editor
            var $editDiv = $(mustache(templates.plotEditor, {
                    color: plotColor,
                    selectThickness: selectThickness,
                    selectStyle: selectStyle,
                    k: oPlot.options.k||1,
                    fOptions: fOptions
                })
            );    
            //EVENTS
            //text boxes
            $editDiv.find("input.plot-name").val(oPlot.name()).change(function(){
                if(oPlot() != $(this).val().trim()) $(this).val(oPlot.name($(this).val())); //Plot.name() resets name to default name if emprty string passed in
                makeDirty();
            });
            $editDiv.find("input.plot-units").val(oPlot.units()).change(function(){
                if(oPlot.units(true) != $(this).val() && $(this).val().trim()!='') {
                    oPlot.options.units = $(this).val();
                } else {
                    delete oPlot.options.units;
                }
                $liPlot.find('span.plot-units').html(oPlot.units());
                makeDirty();
            });
            $editDiv.find('select.dshift').val(f).change(function(){
                var newF = $(this).val();
                var synF = $editDiv.find('select.dshift option:selected').attr('data');

                if(newF != synF){
                    /* $.each(oPlot.components, function(){
                     if(!maxF||period.value[maxF]<period.value[panelGraph.assets[this.handle].freq]) maxF = panelGraph.assets[this.handle].freq
                     });*/
                    selectDownshift(panelGraph, newF, oPlot, function(oDown){
                        if(oDown){
                            options.fdown = newF;
                            options.algorithm = oDown.algorithm;
                            options.missing = oDown.missing;
                            $.each(oPlot.components, function(){ //swap in new series where possible
                                var asset = panelGraph.assets[this.handle];
                                if(asset.freqset[newF]){
                                    this.handle = asset.freqset[newF];
                                } else {
                                    this.handle = asset.freqset[newF=='A'&&asset.freqset.Q?'Q':'M'];
                                }
                            });
                            f = newF;
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
                        this.handle = panelGraph.assets[this.handle].freqset[newF];
                    });
                    f = newF;
                    makeDirty();
                }
            });
            //buttonsets
            if(!oPlot.options.componentData)oPlot.options.componentData='required';
            $editDiv.find("div.edit-math").find("input[id='"+oPlot.options.componentData+"-"+panelId+"']").click().end().buttonset()
                .find('input:radio').change(function(){
                    oPlot.options.componentData = $(this).closest('div').find(".ui-state-active").attr("for").split('-')[0];
                    makeDirty();
                });
            if(!oPlot.options.breaks)oPlot.options.breaks='nulls';
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
                provPlots.splice($liPlot.index(),1);
                $liPlot.remove();
                makeDirty();
            });
            $editDiv.find("button.plot-copy").button({icons: {secondary: 'ui-icon-copy'}}).click(function(){
                provPlots.push($.extend(true,{},oPlot));
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


                $prov.find('.landing').slideDown();
                $liPlot.find(".comp-editor").slideUp("default",function(){$(this).remove()});
                $liPlot.find(".edit-plot").show();
                self.sortableOn();
            });
            $editDiv.prependTo($liPlot);
            this.editPlotFormula(oPlot, $liPlot);
            $editDiv.slideDown();
            $prov.find('.landing').slideUp();
        },
        freqOptions: function(plot){
            var i, c, allComps, comp, options = '', freqs={}, thisPeriod;
            //1. see what alternative frequencies exist is the APIs datasets
            for(i=0;i<period.order.length;i++){
                allComps = true;
                thisPeriod = period.order[i];
                plot.eachComponent(function(){if(!this.freqs || this.freqs.indexOf(thisPeriod)!==-1) allComps = false;});
                if(allComps){
                    options += '<option value="'+thisPeriod+'" data="'+thisPeriod+'">'+period.name[thisPeriod]+' using official data</option>';
                    freqs[thisPeriod] = true;
                }
            }
            //2. add options to calculate Quarterly and Annual frequencies if (A) they don't exist and (B) the right precursor periodicities exist
            if(!freqs['Q'] && freqs['M']) options += '<option value="Q" data="M">'+period.name.Q +' calculated from monthly data</option>';
            if(!freqs['A'] && (freqs['M'] || freqs['Q'])) options += '<option value="A" data="'+(freqs['Q']?'Q':'M')+'">'+period.name.A +' calculated from '+(freqs['Q']?period.name.Q:period.name.M)+' data</option>';

            return options;
        },
        showPointSetEditor: function($liPointSet){
            var self = this;
            self.sortableOff();
            //var $liPointSet = $(liPointSet);
            var oPointset = provPointPlots[$liPointSet.index()];
            var options = oPointset.options;

            $liPointSet.find(".edit-plot, .plot-info").hide();

            //close any open editors
            $prov.find("button.plot-close").click();  
            
            //instantiate the editor
            var $editDiv = $(mustache(templates.pointSetEditor, {
                    color: options.color,
                    k: options.k||1
                })
            );
            
            //add events
            

            //text boxes
            $editDiv.find("input.plot-name").val(oPointset.name()).change(function(){
                if(oPointset.name() != $(this).val().trim()) $(this).val(oPointset.name($(this).val()));  //Plot.name() resets name to default name if emprty string passed in
                makeDirty();
            });
            $editDiv.find("input.plot-units").val(oPointset.units()).change(function(){
                if(oPointset.units(true) != $(this).val() && $(this).val().trim()!='') options.units = $(this).val(); else delete options.units;
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
                for(var ps=0; ps<provPointPlots.length;ps++){
                    if(provPointPlots[ps].options.attribute == 'fill') {
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
                provPlots.splice($liPointSet.index(),1);
                $liPointSet.remove();
                makeDirty();
            });
            $editDiv.find("button.plot-copy").button({icons: {secondary: 'ui-icon-copy'}}).click(function(){
                provPlots.push($.extend(true,{},oPointset));
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


                $prov.find('.landing').slideDown();
                $liPointSet.find(".comp-editor").slideUp("default",function(){$(this).remove()});
                $liPointSet.find(".edit-plot").show();
                self.sortableOn();
            });
            $editDiv.prependTo($liPointSet);
            this.editPlotFormula(oPointset ,$liPointSet);
            $editDiv.slideDown();
            $prov.find('.landing').slideUp();
            $liPointSet.find('.edit-pointset').hide();
        },
        provenanceOfMap:  function provenanceOfMap(){
            var self = this,
                mapProvHTML = '',
                mapPlotsHTML = '',
                pointPlotsHTML = '',
                ps,
                pointset,
                ms,
                mapPlot,
                setids = [],
                cubeSelector='',
                summationMap = MD.grapher.isSummationMap(panelGraph);
            
            
            if(panelGraph.map && (provMapPlots || provPointPlots)){ //map!!
                //TODO:  move this fetch into selector click event to avoid unnecessary db fetch
                //find the setids that (1) are mapped and (2) are part of a theme
                panelGraph.eachComponent(function(){
                    if(this.isMapSet()=='M' && this.themeid) {
                        if(setids.indexOf(this.setid)===-1) setids.push(this.setid);
                    }
                });
                setids.sort();
                if(setids.length>0 || summationMap){
                    if(setids.length>0 && (!panelGraph.possibleCubes || !panelGraph.possibleCubes.setsids!=setids.join("S"))) {
                        callApi({command: "GetCubeList", setids: setids}, function(jsoData, textStatus, jqXH){
                            panelGraph.possibleCubes = {  //save on the main graph to ensure availibility betweeon prove panel ops.
                                setsids: setids.join("S"),
                                cubes: jsoData.cubes
                            };
                            $prov.find('select.cubeSelector').html(cubeOptions());
                        });
                    }
                    cubeSelector = '<div class="cubeSelector right">supplemental visualization: <select class="cubeSelector" data="cubeid">' + cubeOptions() + '</select></div>';
                }

                if(provMapPlots){
                    var mapPlotsInnerHTML = '';
                    for(ms=0;ms<provMapPlots.length;ms++){
                        mapPlot = provMapPlots[ms];
                        mapPlotsInnerHTML += mustache(templates.mapPlot, {
                            color: mapPlot.options.color||'#000000',
                            name: mapPlot.name(),
                            units: mapPlot.units(),
                            readableFrequency: self.plotPeriodicity(mapPlot),
                            formula: mapPlot.calculateFormula().formula,
                            components: self.componentsHTML(mapPlot),
                            mode: (!mapPlot.options.mode || mapPlot.options.mode!='bubble')?'heat map':'bubbles with user defined regions'
                        });
                    }
                    mapPlotsHTML = mustache(templates.mapPlots,{
                        mapPlots: mapPlotsInnerHTML
                    });
                }

                if(provPointPlots){
                    var pointPlotInnerHTML = '';
                    for(ps=0;ps<provPointPlots.length;ps++){
                        pointset = provPointPlots[ps];
                        pointPlotInnerHTML += mustache(templates.pointPlot, {
                            color: pointset.options.color||'#000000',
                            name: pointset.name(),
                            readableFrequency: self.plotPeriodicity(pointset),
                            formula: pointset.calculateFormula().formula,
                            components: self.componentsHTML(provPointPlots[ps])
                        });
                    }
                    pointPlotsHTML = mustache(templates.pointPlots,{pointPlots: pointPlotsHTML});
                }

                mapProvHTML =  mustache(templates.mapProv, {
                    cubeSelector: cubeSelector,
                    map:  globals.maps[panelGraph.map].name,
                    mapPlots: mapPlotsHTML,
                    pointPlots: pointPlotsHTML
                })
            }
            return mapProvHTML;

            function cubeOptions(){
                var t, c, theme, options = '<option value="0">none</option>';
                if(summationMap) options += '<option value="sum" '+(provMapconfig.cubeid=='sum'?'selected':'')+'>bar graph of components</option>';
                for(t=0;t<themes.length;t++){
                    theme = themeCubes['T'+themes[t]];
                    if(theme){
                        for(c=0;c<theme.cubes.length;c++){
                            options += '<option value="'+theme.cubes[c].cubeid+'" '+(provMapconfig.cubeid==theme.cubes[c].cubeid?'selected':'')+'>'+theme.name+': '+theme.cubes[c].name+'</option>';
                        }
                    }
                }
                return options;
            }
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
                $plot.find('input.plot-formula').val(plot.options.userFormula|| plot.calculateFormula().formula).keyup(function(){
                    try{
                        var userFormula = $(this).val();
                        if(userFormula.indexOf(';')>=0) throw('invalid mathematical syntax');
                        var expression = 'return ' + userFormula.replace(patVariable,'values.$1') + ';';
                        var compute = new Function('values', expression);
                        var valuesObject = {}, symbol;
                        $.each(plot.components, function(c){
                                symbol = plot.compSymbol(c);
                                if(userFormula.indexOf(symbol)===-1) throw('all symbols must be used');
                                valuesObject[plot.compSymbol(c)] = c;}
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
                $plot.find('span.plot-formula').html('= ' + plot.calculateFormula().formula).show()
                    .after('<button class="manual">manual editing</button>');
                delete plot.options.userFormula;
                $plot.find('button.manual').button({icons: {secondary: 'ui-icon-pencil'}}).click(function(){
                    manualEditing();
                });

            }

        },
        showMapSetEditor: function($liMapPlot){
            var self = this;
            var options = provMapPlots.options;
            var $mapset = $prov.find('.mapset');
            
            self.editPlotFormula(provMapPlots, $mapset);
            $prov.find("button.plot-close").click();  //close any open editors
            $mapset.find('.edit-mapset').hide();
            //The TYPE AND MERGE MODE WILL BE AVAILABLE IN CONFIGURATION MODE, NOT THE INTIAL VIEW
            var $editDiv = $(mustache(templates.mapsetEditor, {
                    mergeFormula: options.mode=='bubble' ? templates.mergeFormula : '', 
                    k:options.k||1
                })
            );

            //bunny
            $editDiv.find('button.add-bunny').button({icons: {secondary: 'ui-icon-plus'}}).click(function(){  //this is a multifunction selector: delete bunny, use existing plot, or create bunny
                var val = "add";
                if(val=="add"){
                    var i, handle, setids=[];
                    provMapPlots.eachComponent(function(){
                        if(this.type()=='M')  setids.push(this.setid);
                    });
                    //TODO: rationalize this with grapher bunny routines into Graph object.
                    callApi(
                        {command: 'GetBunnySeries', setids: setids, geoid: parseInt(globals.maps[panelGraph.map].bunny), mapname: panelGraph.map},
                        function (oReturn, textStatus, jqXH) {
                        if(oReturn.allfound){
                            for(handle in oReturn.assets){ //the handle being looped over in the mappset handle
                                panelGraph.assets[oReturn.assets[handle].handle] = oReturn.assets[handle];
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
                            var p, plots = provPlots, bunnyExists = false;
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
                                provPlots.push(bunnyPlot);
                                self.build(p); //p set correctly to length of plots before the above push
                            }
                        } else {
                            dialogShow('unable to automatically create tracking plot','One or more of the component map sets does not have series for '+ panelGraph.map +' level of aggregation.');
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
                provMapPlots = {};
                $mapset.remove();
                if(!provPointPlots) $prov.find('map-prov').remove();
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
                $prov.find('.landing').slideDown();
                $mapset.find(".comp-editor").slideUp("default",function(){
                    $(this).remove();
                });
                self.sortableOn();
            });

            //sync
            $editDiv.find("input.plot-name").val(mapset.name()).change(function(){
                self.set(options, $(this));  //mapset.options.name = $(this).val();
                $mapset.find('span.plot-title').html(mapset.options.name);
            });
            $editDiv.find("input.plot-units").val(mapset.nits()).change(function(){
                self.set(options, $(this));  //mapset.options.units = $(this).val();
                $mapset.find('span.plot-units').html(mapset.options.units);
            });
            $editDiv.appendTo($mapset.find('.editor').html('')).slideDown();
            $mapset.find('.ehide').hide();
            $prov.find('.landing').slideUp();
        },
        setFormula: function(plot, $container){
            var formula = plot.calculateFormula();
            if($container) {
                $container.find('span.plot-formula').html('= '+ formula);
                //if plot units are calculated, change those
                if(!plot.options.units) $container.find('input.plot-units').val(plot.units());
                if(!plot.options.name) $container.find('input.plot-name').val(plot.name());
            }
        },
        legendEditor: function($target, options, type){
            //used by both mapsets and pointsets, depending on type = 'X' or 'M'
            //appends the controls to $target = a fieldset labeled 'legend'
            //controls blocks = 1) radius, 2) color scale: a) continuous b) discrete
            var i, self = this, $mapProv = $prov.find('.map-prov');
    
            var $legend = $(mustache(templates.legendEditor, {
                notBubble: ((!options.mode || options.mode!='bubble')?'checked':''),
                bubble:((options.mode && options.mode=='bubble')?'checked':''), 
                markerType: (type=='X'?'marker':'bubble'),
                maxRadius: options.attribute=='fill'?provMapconfig.fixedRadius||DEFAULT_RADIUS_FIXED:provMapconfig.maxRadius||DEFAULT_RADIUS_SCALE,
                negColor: options.negColor||MAP_COLORS.NEG, 
                continuousColorScale: continuousColorScale(options),
                posColor: options.posColor||MAP_COLORS.POS
            }));

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
                            provMapconfig.maxRadius = $(this).val();
                        } else {
                            provMapconfig.fixedRadius = $(this).val();
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
            $legend.find('.legend-discrete').append(self.discreteLegend($target, type, options));

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
                if((type=='M' && options.mode!='bubble') || (type=='X' && provMapconfig.markerScaling!='none' && fillScalingCount(provPointPlots)>0)){
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
        discreteLegend: function($target, type, mapPlotOptions){
            var $legend, i, changing, val, self = this;
            var options = (type=='X'?provMapconfig:mapPlotOptions);
            if(!Array.isArray(options.discreteColors) || options.discreteColors.length==1) options.discreteColors = resetLegend(5, options);
            $legend = $(templates.discreteLegendShell); //uncustomized shell does not need mustache
            drawLegend();
            $legend.find('button.inc-discrete').button({disabled: options.discreteColors.length>9}).click(function(){
                $legend.find('button.inc-discrete').button('enable');
                options.discreteColors = resetLegend(options.discreteColors.length+1, options);
                if(options.discreteColors.length>9) $(this).button('disable');
                drawLegend();
                makeDirty();
            });
            $legend.find('button.dec-discrete').button({disabled: options.discreteColors.length<2}).click(function(){
                $legend.find('button.inc-discrete').button('enable');
                options.discreteColors = resetLegend(options.discreteColors.length-1, options);
                if(options.discreteColors.length<2) $(this).button('disable');
                drawLegend();
                makeDirty();
            });
            $legend.find('button.reset-discrete').button().click(function(){
                options.discreteColors = resetLegend(options.discreteColors.length, options);
                drawLegend();
                makeDirty();
            });
            return $legend;


            function drawLegend(){
                var legendHTML = '';
                for(i=0;i<options.discreteColors.length;i++){
                    legendHTML += '<div class="discrete-color"><input class="color" data="'+i+'" value="'+options.discreteColors[i].color+'" /></div>';
                    if(i!=options.discreteColors.length-1){
                        legendHTML += ' &#8804; <input class="cutoff" data="'+i+'" value="'+options.discreteColors[i].cutoff+'" />';
                    }
                }
                $legend.find('.discrete-legend').html(legendHTML);
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
                var data = type=='X'?panelGraph.calculatedMapData.markerData:panelGraph.calculatedMapData.regionData;
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
                var index, skipped = 0, fullPosColor = options.posColor||MAP_COLORS.POS, octet = MD.common.octet;
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
        return mustache(templates.continuousColorScale, {a: a, b: b});
    }
    function continuousColorScale(options){
        return mustache(templates.continuousColorScale, {
            negStrip: continuousColorStrip(options.negColor||MAP_COLORS.NEG, MAP_COLORS.MID),
            posStrip: continuousColorStrip(MAP_COLORS.MID, options.posColor||MAP_COLORS.POS)
        });
    }
}
