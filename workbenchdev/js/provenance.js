/*
 drag and drop rules:
 1. plot lis can only be dragged within type ol (ie. li.plot within ol.plots; li.mapplot within ol.mapplots; and li.pointplot within ol.pointplots)
 2. series components can be dragged to any plot's 'ol.components'
 3. pointset component can be dragged to any 'li.pointplot ol.components'
 4. mapset component can be dragged to any 'li.pointplot ol.components'


 */

//PROVENANCE PANEL CREATOR AND HELPER FUNCTIONS
function ProvenanceController(panelId){
    //shortcuts to application global functions and variables
    var pointPlotLegend,
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
        provGraph,
        provMapPlots,
        provPlots,
        provPointPlots,
        provAnnotations,
        provMapconfig,
        objCounter = 1,
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
                +   '<select class="map-mode">' +
                +     '<option value="default">graph default</option>'
                +     '{{mapModeOptions}}'
                + '</select>'
                //+    '<input type="radio" name="'+ panelId +'-{{id}}-map-mode" id="'+ panelId +'-{{id}}-map-mode-C" value="fill" data="mode" {{fill}} /><label for="'+ panelId +'-{{id}}-map-mode-C"><b>fill</b> (heat map)</label>'
                //+    '<input type="radio" name="'+ panelId +'-{{id}}-map-mode" id="'+ panelId +'-{{id}}-map-mode-B" value="bubble" data="mode" {{bubbles}} /><label for="'+ panelId +'-{{id}}-map-mode-B"><b>bubbles</b> (mergable into regional sums)</label>'
                //+    '<input type="radio" name="'+ panelId +'-{{id}}-map-mode" id="'+ panelId +'-{{id}}-map-mode-T" value="rectangles" data="mode" {{rectangles}} /><label for="'+ panelId +'-{{id}}-map-mode-T"><b>rectangles</b> (non-geographic vizualizaton)</label>'
                + '</div><span class="merge-formula ital">merge formula = &#931; numerator / &#931; denominator</span>'
                + '<div class="radius"  style="display: none;">'
                +    '<span class="edit-label radius-label">maximum {{markerType}} radius (pixels): </span><input class="radius-spinner" value="{{maxRadius}}" />'
                + '</div>'
                + '<div class="edit-block color-scale" style="display: none;">'
                +   '<div class="legend-scale"><span class="edit-label">Color scale:</span>'
                +       '<input type="radio" id="legend-continuous-'+panelId+'-{{id}}" name="legend-type-'+panelId+'-{{id}}" data="scale" value="continuous" /><label for="legend-continuous-'+panelId+'-{{id}}">continous</label>'
                +       '<input type="radio" id="legend-discrete-'+panelId+'-{{id}}" name="legend-type-'+panelId+'-{{id}}" data="scale" value="discrete"/><label for="legend-discrete-'+panelId+'-{{id}}">discrete</label>'
                +   '</div>'
                +   '<div class="lin-log-scaling"><span class="edit-label">Color mode:</span>'
                +       '<input type="radio" id="lin-scaling-'+panelId+'-{{id}}" name="color-mode-'+panelId+'-{{id}}" data="logMode" value="off" /><label for="lin-scaling-'+panelId+'-{{id}}">linear</label>'
                +       '<input type="radio" id="log-scaling-'+panelId+'-{{id}}" name="color-mode-'+panelId+'-{{id}}" data="logMode" value="on"/><label for="log-scaling-'+panelId+'-{{id}}">enhanced color</label>'
                +   '</div>'
                +   '<div class="edit-block legend-continuous" style="display: none;">'
                +       '-<div class="continuous-color"><input class="neg color-picker" type="text" data="negColor" value="{{negColor}}" /></div>{{continuousColorScale}}<div class="continuous-color"><input class="pos color-picker" type="text" data="posColor" value="{{posColor}}" /></div>+'
                +   '</div>'
                +   '<div class="edit-block legend-discrete" style="display: none;"></div>'
                + '</div>',
            mergeFormula: '<span class="merge-formula">merge formula = &#931; numerator / &#931; denominator</span>',
            seriesPlots:  '<div class="chart-plots"><H4>Chart</H4><ol class="plots">'
                + '{{seriesPlots}}'
                + '</ol>',
            seriesPlot: '<li class="plot" data="P{{i}}">'
                + '<button class="edit-plot">configure</button>'
                + '<div class="line-sample" style="background-color:{{plotColor}};height:{{lineHeight}}px;"><img src="images/{{lineStyle}}.png" height="{{lineHeight}}px" width="{{lineWidth}}px"></div>'
                + '<div class="plot-info" style="display:inline-block;"><span class="plot-title">{{name}}</span> ({{plotPeriodicity}}) in <span class="plot-units">{{units}}</span></div>'
                + '<span class="plot-formula">= {{formula}}</span><br>'
                + '{{components}}'
                + '</li>',
            landing:  '<ol class="blank-plot landing components" style=""><li class="not-sortable">Drag and drop to plot lines to reorder them.  Drag and drop multiple series into a plot to create sums and ratios. Drag a series here to create a new plot line.</i></li></ol></div>',
            mapProv: '<div class="map-prov">{{cubeSelector}}<h3>Map of {{map}}</h3>'
                + '{{mapPlots}}{{pointPlots}}'
                + '</div>',
            pointPlots: '<div class="pointsets"><h4>'+iconsHMTL.pointset+' mapped set of markers (defined latitude and longitude)</h4>'
                // NO SIMPLE MARKERS = FINISH CURRENT FUNCTIONALITY !!!  + '<span class="edit-label marker-scaling right"><label><input type="checkbox" '+(provMapconfig.markerScaling=='none'?'checked':'')+'> do not scale markers </label></span>'
                + '<div class="pointsets-colors" style="margin-bottom:5px;"></div>'
                + '<ol class="pointsets">{{pointPlotsHTML}}</ol></div>',
            pointPlot: '<li class="pointPlot">'
                + '<button class="edit-pointPlot right">configure</button>'
                + '<div class="plot-info" style="display:inline-block;">'
                + '<div class="marker" style="background-color: {{color}}"></div>'
                + '<span class="plot-title">{{name}}</span> ({{readableFrequency) in <span class="plot-units">{{units}}</span>'
                + '<span class="plot-formula">= {{formula}}</span></div>'
                + '{{components}}'
                + '</li>',
            mapModeOptions: '<option value="heat">colored heat map of values</option>'
                + '<option value="abs-change">colored heat map of changes</option>'
                + '<option value="percent-change">colored heat map of percent changes</option>'
                + '<option value="bubbles">overlay circles to show values</option>'
                + '<option value="change-bubbles">overlay circles to show changes</option>'
                + '<option value="correlation">correlation (requires two maps)</option>'
                + '<option value="treemap">abstract values to rectangles</option>'
                + '<option value="change-treemap">abstract change to rectangles</option>',
            mapPlots: '<div class="mapplots">'
                + '<h4>' + iconsHMTL.mapset + ' Mapped set of regions (country, state, or county)</h4>'
                + '<span class="map-mode ehide">default mode: {{mode}}</span>'
                + '<ol class="mapplots">{{mapPlots}}</ol></div>'
                + '</div>',
            mapPlot: '<li class="mapplot">'
                + '<div class="mapplot-colors" style="margin-bottom:5px;"></div>'
                + '<div class="plot-info">'
                + '<button class="edit-mapplot right ehide">configure</button>'
                + '<div class="edit-block ehide">'
                +   '<span class="plot-title">{{name}}</span> ({{readableFrequency}}) in <span class="plot-units">{{units}}</span>'
                + '<span class="plot-formula">= {{formula}}</span><br>'
                /*                        + '<span class="map-legend ehide">-'
                 +    continuousColorScale(provMapPlots.options)
                 + '+</span>'*/
                + '</div>' //editor controls added here  (after the plot-info div)
                + '<div class="editor"></div>'
                + '</div>{{components}}'
                + '</li>',
            seriesPlotEditor: '<div class="plot-editor" style="display: none;">'
                + '<button class="plot-close prov-float-btn">close</button>'
                + '<button class="plot-copy prov-float-btn">make copy</button>'
                + '<button class="plot-delete prov-float-btn">delete plot</button>'
                + '<fieldset class="edit-line" style="padding: 0 5px;display:inline-block;"><legend>color, thickness, &amp; style</legend>'
                +   '<div class="edit-block"><input class="plot-color" type="text" data="color" value="{{color}}" /></div>' +
                + '</fieldset>'
                + '<div class="edit-block">Name: <input class="plot-name" type="text" data="name" /></div>'
                + '<div class="edit-block"><span class="edit-label">display as:</span><select class="plot-type" data="type"><option value="">graph default</option><option value="line">line</option><option value="column">column</option><option value="area">stacked area</option></select></div>'
                + '<div class="edit-block"><span class="edit-label">units:</span><input class="plot-units long" data="units" type="text" /><span class="plot-edit-k edit-label">scalor:<input class="short" value="{{k}}"></span> '
                + '<span class="edit-label">frequency:</span><select class="dshift">{{fOptions}}</select></div><br>'
                + '<span class="edit-label">Point calculations:</span>'
                + snippets.compMathDiv
                + '<div class="edit-block"><span class="edit-label">Break line</span><div class="edit-breaks">'
                +   '<input type="radio" id="never-'+panelId+'" name="line-break-'+panelId+'" data="breaks" value="never" /><label for="never-'+panelId+'">never</label>'
                +   '<input type="radio" id="nulls-'+panelId+'" name="line-break-'+panelId+'" data="breaks" value="nulls" /><label for="nulls-'+panelId+'">on nulls</label>'
                +   '<input type="radio" id="missing-'+panelId+'" name="line-break-'+panelId+'" data="breaks" value="missing" /><label for="missing-'+panelId+'">on missing value and nulls</label></div>'
                + '</div>'
                +'</div>',
            pointPlotEditor:  '<div class="plot-editor" style="display: none;">'
                + '<button class="plot-close prov-float-btn">close</button>'
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
            mapPlotEditor: '<div class="plot-editor" style="display: none;">{{mergeFormula}}'
                + '<button class="plot-close prov-float-btn">close</button>'
                + '<button class="plot-copy prov-float-btn">make copy</button>'
                + '<button class="plot-delete prov-float-btn">delete map set</button>'
                +   '<button class="plot-delete prov-float-btn">delete heat map</button>'
                +   '<div class="edit-block">name: </span><input class="plot-name" type="text" data="name"/></div><br>'
                +   '<div class="edit-block"><span class="edit-label">units:</span><input class="plot-units long" data="units" type="text"/><span class="plot-edit-k"> scalor: <input class="short" value="{{k}}"></div><br>'
                +   '<span class="edit-label">Point calculations:</span>'
                +   snippets.compMathDiv
                +   '<div class="edit-block add-bunny"><button  class="add-bunny">add regional tracking plot</button></span></div> '
                +   '</div>',
            components: '<ol class="components {{plotType}}-comp">{{components}}</ol>',
            component: '<li class="component ui-state-default" data="{{handle}}">'
                + '<span class="plot-op ui-icon {{opClass}}">operation</span> '
                + '<span class="comp-edit-k" style="display:none;"><input class="short" value="{{k}}"> * </span>'
                + '{{icon}}{{name}} ({{freq}}) in {{units}} {{source}}'
                + '</li>',
            okcancel: '<button class="config-ok">ok</button><button class="config-cancel">cancel edits</button>'
        },
        controller = {
            build:  function build(plotIndex){  //redo entire panel if plotIndex omitted
                var i, allSeriesPlots='', allMapPointPlots, plot;
                if(typeof plotIndex != 'undefined'){  //update single plot
                    if($prov.find('.chart-plots').length==0) $prov.find('.config-cancel').after('<div class="chart-plots"><H4>Chart</H4><ol class="plots"></ol></div');
                    $prov.find('ol.plots').append(controller.seriesPlotHTML(plotIndex) );
                } else {  //initialize!!!
                    $prov = $('#'+panelId + ' div.provenance').show(); //compensation for margins @ 15px + borders
                    panelGraph = globals.panelGraphs[panelId]; //reference kept for duration
                    controller.isDirty = false;


                    //make local copies that the provenance panel will work with.  Will replace graph.plots, mapsets, pointsets and annotations on "OK"
                    provGraph = panelGraph.clone();
                    provPlots = provGraph.plots || false;
                    provMapPlots = provGraph.mapsets || false;
                    provPointPlots = provGraph.pointsets || false;
                    provAnnotations = provGraph.annotations;
                    provMapconfig = provGraph.mapconfig;

                    if(provPlots){
                        var seriesPlotsHTLM = '';
                        for(i=0;i<provPlots.length;i++){
                            //outer PLOT loop
                            seriesPlotsHTLM += controller.seriesPlotHTML(i);
                        }
                    }
                    allSeriesPlots =  mustache(templates.seriesPlots,{seriesPlots: seriesPlotsHTLM});
                    allMapPointPlots = controller.provenanceOfMap();  //
                    $prov.html(templates.okcancel + allSeriesPlots + templates.landing + allMapPointPlots);
                    //each mapPlot has its own legend
                    mapPlotLegends = [];
                    $prov.find('.mapplot-colors').each(function(ms){
                        mapPlotLegends.push(controller.legendEditor($(this), provMapPlots[ms], 'M'));
                    });

                    if(provPointPlots) {
                        pointPlotLegend = this.legendEditor($prov.find('.pointsets-colors'), provMapconfig, 'X');
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
                        controller.set(provMapconfig, $(this));
                        delete panelGraph.assets.cube;
                    });

                    //main buttons
                    $prov.find("button.config-cancel")
                        .button({icons: {secondary: 'ui-icon-close'}}).addClass('ui-state-highlight')
                        .click(function(){
                            controller.provClose();
                        });
                    $prov.find("button.config-ok")
                        .button({disabled: true, icons: {secondary: 'ui-icon-check'}})
                        .click(function(){
                            controller.commitChanges()
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
                            controller.showComponentEditor(this, 'plot');
                        });
                        controller.showSeriesPlotEditor($liPlot);
                    });

                $prov.find("button.edit-mapplot")
                    .button({icons: {secondary: 'ui-icon-pencil'}})
                    .off("click")
                    .click(function(){
                        var $liMapPlot = $(this).closest("li");

                        controller.sortableOff();
                        $liMapPlot.find('ol li.component').each(function(){
                            controller.showComponentEditor(this, 'mapPlot');
                        });
                        controller.showMapPlotEditor($liMapPlot);
                    });

                $prov.find(".edit-pointPlot")
                    .button({icons: {secondary: 'ui-icon-pencil'}})
                    .off("click")
                    .click(function(){
                        var $liPlot = $(this).closest("li");
                        $liPlot.find("ol li.component").each(function(){
                            controller.showComponentEditor(this, 'pointPlot');
                        });
                        controller.showPointPlotEditor($liPlot);
                    });
                controller.sortableOn();
            },
            seriesPlotHTML:  function seriesPlotHTML(i){ //generic
                var plot = provPlots[i];
                return mustache(templates.seriesPlot,{
                    i: i,
                    plotColor: plot.options.color || ((panelGraph.chart&&panelGraph.chart.get('P'+i))?panelGraph.chart.get('P'+i).color:hcColors[i%hcColors.length]),
                    lineWidth: 38 * (plot.options.lineWidth||2),
                    lineHeight: plot.options.lineWidth||2,
                    lineStyle: plot.options.lineStyle || 'Solid',
                    name: plot.name(),
                    plotPeriodicity: controller.plotPeriodicity(plot),
                    units: plot.units(),
                    formula: plot.formula(),
                    plotType: plot.type(),
                    components: controller.componentsHTML(plot)
                });
            },
            componentsHTML: function(plot){  //universal: used by series, point, and map plot compo nents
                var listItemsHTML = '', comp, componentsHTML='';
                var algorithm = {
                    sum: 'summing',
                    wavg: 'day-weighted averaging of'
                };
                for(var j=0;j< plot.components.length;j++){
                    //inner COMPONENT loop
                    comp = plot.components[j];
                    if(plot.components[j].options.op==null) plot.components[j].options.op="+";

                    listItemsHTML  += mustache(templates.component, {
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
                    plotType: plot.type(),
                    components: listItemsHTML
                });
            },
            plotPeriodicity:   function plotPeriodicity(plot){
                return '<span class="plot-freq">'+period.name[plot.freq()]+(plot.options.fdown? synthesized:'')+'</span>';
            },
            sortableOff: function(){
                $prov.find("ol.plots").sortable('disable').enableSelection();
                $prov.find("ol.components").sortable('disable').enableSelection();
                $prov.find("ol.pointsets").sortable('disable').enableSelection();
            },
            sortableOn: function(){
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
                            controller.dragging = {
                                type: type,
                                plotIndex: plotIndex,
                                compIndex: compIndex,
                                obj: obj,
                                $ol: ui.item.parent()
                            }
                        },
                        update: function(event, ui){ controller.componentMoved(ui)}
                    })
                    .disableSelection();
                $prov.find("ol.plots")
                    .sortable({
                        axis: "y",
                        dropOnEmpty: false,
                        connectWith: ".plots",
                        disabled: false,
                        start: function(event, ui){
                            controller.dragging = {
                                type: "plot",
                                plotIndex: ui.item.index(),
                                compIndex: null,
                                $ol: ui.item.parent()
                            }
                        },
                        update: function(event, ui){  //only within!
                            var i, oldAnnoIndex;
                            var movedPlot = provPlots.splice(controller.dragging.plotIndex, 1)[0];
                            provPlots.splice(ui.item.index(),0,movedPlot);
                            var shift = (ui.item.index()>controller.dragging.plotIndex)?-1:1;
                            for(i=0;i<provAnnotations.length;i++){
                                if(provAnnotations[i].type=="point"){
                                    oldAnnoIndex = parseInt(provAnnotations[i].series.substr(1));
                                    if(oldAnnoIndex==controller.dragging.plotIndex){
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
                            controller.dragging = {
                                type: "point",
                                plotIndex: ui.item.index(),
                                compIndex: null,
                                $ol: ui.item.parent(),
                                obj: provPointPlots[ui.item.index()]
                            }
                        },
                        update: function(event, ui){  //only within!
                            if(ui.sender==null) return;
                            var movedPointset = provPointPlots.splice(controller.dragging.plotIndex,1);
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
                var $targetSeriesList, pFromHandle, draggedComponent;
                var i, handle, thisHandle, from, fromC, toC, fromP, toP, toOp, toType, toPlotObject;  //indexes
                //sortable's update event gets triggered for each OL of components involved.  If the ui.sender is null, the event is trigger by the sending OL.
                if(ui.sender==null && ui.item.closest('ol')[0]!=controller.dragging.$ol[0]) return; //prevent double call, but allow when sorting within

                //cancel if adding to a plot that already has the same series
                toP = ui.item.closest('.plot').index();

                //check to see if this is a new plot
                var newPlot = ui.item.parent().hasClass('blank-plot');

                //component landing type has to be either a plot, a mapPlot or a pointPlot
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

                //pointset and mapset type series must belong to a pointPlot or a mapPlot respectively
                thisHandle = ui.item.attr('data');
                if(thisHandle[0]=='M' && toType!='map'){
                    $prov.find("ol.components").sortable("cancel");
                    dialogShow('mapset restrictions', 'A mapset is a grouping of series, each correspond to an area on a map, such as a state or country.  Mapsets cannot be mixed with marker sets or displayed on a line graph.<br><br>Note that from from the map, you can easily select and chart any of this mapsets\' component series.');
                    return;
                }
                if(thisHandle[0]=='M' && toType!='map'){
                    $prov.find("ol.components").sortable("cancel");
                    dialogShow('pointset restrictions', 'A pointset is a grouping of series, each correspond to a precise location determined by longitude and latitude values.  Pointsets cannot be mixed with area mapsets or displayed a line graph.<br><br>Note that from from the map, you can easily select and chart any of this pointsets\' component series.');
                    return;
                }

                //duplicate series in same plot not permitted
                if(toP!=controller.dragging.plotIndex && controller.dragging.type==toType && ui.item.closest('ol')[0]!=controller.dragging.$ol[0]){
                    for(i=0;i<toPlotObject.components.length;i++){
                        if(toPlotObject.components[i].handle() == thisHandle) {
                            $prov.find("ol.components").sortable("cancel");
                            dialogShow('duplicate series', 'This series is already a component of the target plot.<br><br>If you want to use a series multiple times in the plot formula, use <button class="manual ui-button ui-widget ui-state-default ui-corner-all ui-button-text-icon-secondary ui-state-hover" role="button" aria-disabled="false"><span class="ui-button-text">manual editing</span><span class="ui-button-icon-secondary ui-icon ui-icon-pencil"></span></button> of the formula from with the <button class="manual ui-button ui-widget ui-state-default ui-corner-all ui-button-text-icon-secondary ui-state-hover" role="button" aria-disabled="false"><span class="ui-button-text">manual editing</span><span class="ui-button-icon-secondary ui-icon ui-icon-pencil"></span></button> plot instead.');
                            return;
                        }
                    }
                }

                //frequency must be the same
                if(toP!=controller.dragging.plotIndex && controller.dragging.type==toType && !newPlot){
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
                var cmp = controller.dragging.obj.components.splice(controller.dragging.compIndex,1)[0];
                //4. set the numer/denom flag and add the component
                toC = ui.item.index();

                if(newPlot){
                    toPlotObject = {options: {}, components: [cmp]};
                    provPlots.push(toPlotObject);
                    $prov.find('ol.plots').append(controller.seriesPlotHTML(provPlots.length-1));
                } else {
                    toPlotObject.components.splice(toC,0,cmp);
                }
                controller.setFormula(toPlotObject, ui.item.closest(".plot"));

                //5. check for no components > delete object; remove plot; adjust annotations
                if(controller.dragging.obj.components.length==0){
                    if(controller.dragging.type=='plot'){
                        provPlots.splice(controller.dragging.plotIndex,1);
                        $prov.find("ol.plots li.plot")[controller.dragging.plotIndex].remove();
                        //check annotations
                        var oldAnnoIndex;
                        for(i=0;i<provAnnotations.length;i++){
                            if(provAnnotations[i].type=="point"){
                                oldAnnoIndex = parseInt(provAnnotations[i].series.substr(1));
                                if(oldAnnoIndex==controller.dragging.plotIndex){
                                    provAnnotations.splice(i,1);
                                    i--;
                                }
                                if(oldAnnoIndex>controller.dragging.plotIndex){
                                    provAnnotations[i].series = "P" +  --oldAnnoIndex;
                                }
                            }
                        }
                    }
                    if(controller.dragging.type=='point'){
                        provPointPlots.splice(controller.dragging.plotIndex,1);
                        $prov.find("ol.pointsets li.plot")[controller.dragging.plotIndex].remove();
                    }
                    //not possible to kill a mapPlot by dragging off its mapset components
                } else { //recalc the formula of the sender
                    controller.setFormula(controller.dragging.obj, controller.dragging.$ol.parent());
                }
                if(newPlot) {
                    ui.item.remove();  //the spare component in the new plot landing zone
                    controller.sortableOn();
                }
                //6. you are DIRTY!
                makeDirty();

            },
            commitChanges: function commitChanges(noRedraw){//save change to graph object and rechart
                //called by workbench on tab change = autocommit.  Cancel button must be explicitly to avoid saving prov changes
                if(controller.isDirty && (provPlots||provMapPlots||provPointPlots)){
                    if(provPlots && provPlots.length>0) panelGraph.plots = provPlots; else delete panelGraph.plots;
                    panelGraph.annotations = provAnnotations;
                    if(provMapPlots && provMapPlots.length>0) panelGraph.mapsets = provMapPlots; else delete panelGraph.mapsets;
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
                delete provPlots;
                delete provAnnotations;
                delete provMapPlots;
                delete provPointPlots;
                delete provMapconfig;
                delete provGraph;  //don't graph.destroy() as that would destroy the transferred plots
                $prov.html('');  //remove of HTML elements and their events
                controller.isDirty = false;
                $prov.closest('div.graph-panel').find('.graph-nav-graph').click();
            },
            compIndex: function(liComp){
                var $liComp = $(liComp);
                var cmpIndex = $liComp.index();
                return cmpIndex;
            },
            getModels: function(li){ //li can be a plot of a component list item (DOM or jQuery object)
                var models = {}, $li = $(li), $liPlot;
                if($li.hasClass('component')){
                    $liComp = $li;
                    $liPlot.closest('li');
                } else {
                    $liPlot = $liComp;
                    $liComp = false;
                }
                if($liPlot.hasClass('plot')){}
                if($liPlot.hasClass('mapplot')){}
                if($liPlot.hasClass('pointPlot')){}
                models.plot = d;


                return models;
            },
            getComponent$li: function(plot, comp){

            },
            getPlot$li: function(plot){

            },
            showComponentEditor:  function showComponentEditor(liComp, plotType){
                var plotObject, components, $liComp = $(liComp);
                var plotIndex = $(liComp).closest('li.plot, li.pointPlot, li.mapplot').index();
                if(plotType=="mapPlot") plotObject = provMapPlots[plotIndex];
                if(plotType=="pointPlot") plotObject = provPointPlots[plotIndex];
                if(plotType=="plot") plotObject = provPlots[plotIndex];
                var iComp = controller.compIndex($liComp); //could have just gotten index of liComp as the object should be in sync
                var component = plotObject.components[iComp];
                var compHandle = component .handle();
                var editDiv = (component.isSeries()?'<button class="comp-copy prov-float-btn">make copy</button>':'')
                    + '<button class="comp-delete prov-float-btn">remove series</button>'
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
                    .change(function(){
                        controller.set(plotObject.components[iComp].options, 'op', $(this).val());
                        controller.setFormula(plotObject, $liComp.closest(".plot"));
                        $liComp.find('.plot-op').attr('class','plot-op ui-icon ' + op.cssClass[plotObject.components[iComp].options.op]);
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
                            controller.setFormula(plotObject,$liComp.closest('ol').parent());
                        }  else {
                            dialogShow('Error','Scalors must be numerical');
                        }
                        $(this).val(component.options.k);
                    });
                $liComp.find(".comp-delete").button({icons: {secondary: 'ui-icon-trash'}}).addClass('ui-state-error').click(function(){
                    if(plotObject.components.length==1) {
                        $liComp.closest('li.plot').find('.plot-delete').click();
                    } else {
                        plotObject.components.splice(iComp,1);
                        $liComp.remove();
                        makeDirty();
                    }
                });
                $liComp.find(".comp-copy").button({icons: {secondary: 'ui-icon-copy'}}).click(function(){ //copy make a new plot, even if in X or M
                    var newPlot = {options: {}, components: [$.extend(true, {}, component, {options: {op: '+'}})]};
                    provPlots.push(newPlot);
                    var name = panelGraph.assets[compHandle].name;
                    $prov.find("ol.plots").append(controller.componentsHTML(newPlot));
                });
            },
            showSeriesPlotEditor:  function showSeriesPlotEditor(liPlot){
                controller.sortableOff();
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
                var $editDiv = $(mustache(templates.seriesPlotEditor, {  //units and name set in jQuery below
                    color: plotColor,
                    selectThickness: selectThickness,
                    selectStyle: selectStyle,
                    k: oPlot.options.k||1,
                    fOptions: fOptions,
                    name: oPlot.name(),
                    units: oPlot.units()
                })
                );
                //EVENTS
                //text boxes
                $editDiv.find("input.plot-name").val(oPlot.name()).change(function(){
                    $(this).val(oPlot.name(oPlot.name(false)!= $(this).val().trim()?$(this).val().trim():'')); //Plot.name() resets name to default name if empty string passed in
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
                        controller.set(oPlot.options, $(this));  //oPlot.options.breaks = $(this).val();
                    });
                //line color and style
                $editDiv.find(".edit-line legend").after($liPlot.find(".line-sample").hide().clone().css("display","inline-block").show());
                $editDiv.find("input.plot-color").colorPicker().change(function(){
                    controller.set(oPlot.options, $(this));
                    $liPlot.find("div.line-sample").css('background-color',oPlot.options.color);
                });
                $editDiv.find("select.plot-thickness").val(oPlot.options.lineWidth).change(function(){
                    controller.set(oPlot.options, $(this));   //oPlot.options.lineWidth = $(this).val();
                    $liPlot.find("div.line-sample").css("height",oPlot.options.lineWidth).find("img").css("height",oPlot.options.lineWidth).css("width",(parseInt(oPlot.options.lineWidth.substr(0,1)*38)+'px'))
                });
                $editDiv.find("select.plot-linestyle").val(oPlot.options.lineStyle).change(function(){
                    controller.set(oPlot.options, $(this));   //oPlot.options.lineStyle = $(this).val();
                    $liPlot.find("div.line-sample img").attr("src","images/"+oPlot.options.lineStyle+'.png');
                });
                $editDiv.find("select.plot-type").val(oPlot.options.type).change(function(){
                    controller.set(oPlot.options, $(this));   //oPlot.options.type = $(this).val();
                });
                $editDiv.find('.plot-edit-k input').change(function(){
                    if(!isNaN(parseFloat(this.value))){
                        oPlot.options.k = Math.abs(parseFloat(this.value));
                        if(oPlot.options.k==0)oPlot.options.k=1;
                        controller.setFormula(oPlot, $liPlot);
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
                    controller.build(plotIndex);
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
                    controller.sortableOn();
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
            showPointPlotEditor: function($liPointSet){
                controller.sortableOff();
                var oPointset = provPointPlots[$liPointSet.index()];
                var options = oPointset.options;

                $liPointSet.find(".edit-plot, .plot-info").hide();

                //close any open editors
                $prov.find("button.plot-close").click();

                //instantiate the editor
                var $editDiv = $(mustache(templates.pointPlotEditor, {
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
                        controller.setFormula(oPointset, $liPointSet);
                    }  else {
                        dialogShow('Error','Scalors must be numerical');
                    }
                    $(this).val(options.k||1);
                });
                //color picker
                $editDiv.find('.marker-color').colorPicker().change(function(){
                    controller.set(options, $(this));  //particular pointPlot options;
                    $editDiv.find('div.marker').css('background-color', $(this).val()); //set the hidden marker's color for correction resume
                });
                function showHideMarkerColorPicker(){ //show if this and all other pointPlot are not fill
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
                        controller.set(options, $(this)); //plot.options.attribute
                        pointPlotLegend.setRadLabel();
                        pointPlotLegend.legendOptionsShowHide();
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
                    controller.build(plotIndex);
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
                    controller.sortableOn();
                });
                $editDiv.prependTo($liPointSet);
                this.editPlotFormula(oPointset ,$liPointSet);
                $editDiv.slideDown();
                $prov.find('.landing').slideUp();
                $liPointSet.find('.edit-pointPlot').hide();
            },
            provenanceOfMap:  function provenanceOfMap(){
                var mapProvHTML = '',
                    mapPlotsHTML = '',
                    pointPlotsHTML = '',
                    ps,
                    pointPlot,
                    ms,
                    mapPlot,
                    setids = [],
                    cubeSelector='',
                    summationMap = panelGraph.isSummationMap();


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
                                readableFrequency: controller.plotPeriodicity(mapPlot),
                                formula: mapPlot.calculateFormula().formula,
                                components: controller.componentsHTML(mapPlot)
                            });
                        }
                        mapPlotsHTML = mustache(templates.mapPlots,{
                            mapPlots: mapPlotsInnerHTML,
                            mode: (!mapPlot.options.mode || mapPlot.options.mode!='bubble')?'heat map':'bubbles with user defined regions'
                        });
                    }

                    if(provPointPlots){
                        var pointPlotInnerHTML = '';
                        for(ps=0;ps<provPointPlots.length;ps++){
                            pointPlot = provPointPlots[ps];
                            pointPlotInnerHTML += mustache(templates.pointPlot, {
                                color: pointPlot.options.color||'#000000',
                                name: pointPlot.name(),
                                readableFrequency: controller.plotPeriodicity(pointPlot),
                                formula: pointPlot.calculateFormula().formula,
                                components: controller.componentsHTML(provPointPlots[ps])
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
            showMapPlotEditor: function($liMapPlot){
                var oMapPlot = provMapPlots[$liMapPlot.index()];
                var options = oMapPlot.options;

                controller.sortableOff();
                $liMapPlot.find(".edit-plot, .plot-info").hide();

                //close any open editors
                $prov.find("button.plot-close").click();

                controller.editPlotFormula(oMapPlot, $liMapPlot);
                $prov.find("button.plot-close").click();  //close any open editors
                $liMapPlot.find('button.edit-mapplot').hide();
                //The TYPE AND MERGE MODE WILL BE AVAILABLE IN CONFIGURATION MODE, NOT THE INITIAL VIEW
                var $editDiv = $(mustache(templates.mapPlotEditor, {
                    mergeFormula: options.mode=='bubble' ? templates.mergeFormula : '',
                    k:options.k||1
                })
                );

                //bunny
                $editDiv.find('button.add-bunny').button({icons: {secondary: 'ui-icon-plus'}}).click(function(){  //this is a multifunction selector: delete bunny, use existing plot, or create bunny
                    var val = "add";
                    if(val=="add"){
                        var i, handle, setids=[];
                        oMapPlot.eachComponent(function(){
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
                                        controller.build(p); //p set correctly to length of plots before the above push
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
                    controller.setFormula(oMapPlot, $liMapPlot);
                    makeDirty();
                });
                $editDiv.find('.plot-edit-k input').change(function(){
                    if(!isNaN(parseFloat(this.value))){
                        options.k = Math.abs(parseFloat(this.value));
                        if(options.k==0)options.k=1;
                        controller.setFormula(oMapPlot, $liMapPlot);
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
                        controller.set(options, $(this));  //options.compMath = this.value;
                    });
                //buttons
                $editDiv.find("button.plot-delete").button({icons: {secondary: 'ui-icon-trash'}}).addClass('ui-state-error').click(function(){
                    provPlots.splice($liPlot.index(),1);
                    oMapPlot.destroy();
                    $liMapPlot.remove();
                    if(!provPointPlots) $prov.find('map-prov').remove();
                    makeDirty();
                });
                $editDiv.find("button.plot-close").button({icons: {secondary: 'ui-icon-arrowstop-1-n'}}).click(function(){
                    $liMapPlot.find("button.edit-mapplot, .plot-info").show();
                    $liMapPlot.find(".plot-editor").slideUp("default",function(){
                        $liMapPlot.find('.op.ui-buttonset, .comp-delete').remove();
                        $(this).remove();
                        $liMapPlot.find('.plot-op').show();
                    });

                    $liMapPlot.find('.guided, .manual, input.plot-formula, span.comp-edit-k').remove();

                    $liMapPlot.find('.ehide').show();
                    $prov.find('.landing').slideDown();
                    $liMapPlot.find(".comp-editor").slideUp("default",function(){
                        $(this).remove();
                    });
                    controller.sortableOn();
                });

                //sync
                $editDiv.find("input.plot-name").val(oMapPlot.name()).change(function(){
                    controller.set(oMapPlot.options, $(this));  //oMapPlot.options.name = $(this).val();
                    $liMapPlot.find('span.plot-title').html(oMapPlot.name());
                });
                $editDiv.find("input.plot-units").val(oMapPlot.units()).change(function(){
                    controller.set(oMapPlot.options, $(this));  //oMapPlot.options.units = $(this).val();
                    $liMapPlot.find('span.plot-units').html(oMapPlot.units());
                });
                $liMapPlot.find('.ehide').hide();
                $liMapPlot.find('.plot-info').after($editDiv);
                $editDiv.show();
                $prov.find('.landing').hide();
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

            legendEditor: function($target, obj, type){
                var options = type == 'M' ? obj.options : obj;
                //used by both mapsets and pointsets, depending on type = 'X' or 'M'
                //appends the controls to $target = a fieldset labeled 'legend'
                //controls blocks = 1) radius, 2) color scale: a) continuous b) discrete
                var i, $mapProv = $prov.find('.map-prov');

                var $legend = $(mustache(templates.legendEditor, {
                    id: objCounter++,
                    mapModeOptions: templates.mapModeOptions,
                    //fill: ((!options.mode || options.mode =='fill')?'checked':''),
                    //bubbles:((options.mode && options.mode=='bubble')?'checked':''),
                    //rectangles:((options.mode && options.mode=='rectangles')?'checked':''),
                    markerType: (type=='X'?'marker':'bubble'),
                    maxRadius: options.attribute=='fill'?provMapconfig.fixedRadius||DEFAULT_RADIUS_FIXED:provMapconfig.maxRadius||DEFAULT_RADIUS_SCALE,
                    negColor: options.negColor||MAP_COLORS.NEG,
                    continuousColorScale: continuousColorScale(options),
                    posColor: options.posColor||MAP_COLORS.POS
                }));
                $legend.find('select.map-mode').val(options.mode || 'default')
                    .change(function(){  //default mode is fill (i.e. not bubble)
                        if(this.value=='default') delete options.mapMode; else options.mapMode= this.value;
                        if(options.mapMode=='bubble') options.merges = options.merges || [];  //bubble allows merges of maps
                        showHideMergeFormula();
                    });
                showHideMergeFormula();
                function showHideMergeFormula(){
                    if(options.mode=='bubble') $legend.find('.merge-formula').show(); else $legend.find('.merge-formula').hide();
                    legendOptionsShowHide();
                }


                $legend.find('div.legend-scale')
                    .find("[value='"+(options.scale||'continuous')+"']").attr('checked',true).end()
                    .buttonset().find('input:radio').change(function(){
                        controller.set(options,  $(this));
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
                        controller.set(options,  $(this));
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
                    controller.set(options, $(this));  //options.posColor = this.value;  // this is a universal val for pointsets
                    $legend.find('.continuous-strip-pos').html(continuousColorStrip('#CCCCCC', options.posColor));
                    $mapProv.find('.map-legend').html('-'+continuousColorScale(options)+'+');
                });
                $legend.find('.color-picker.neg').colorPicker().change(function(){
                    controller.set(options, $(this)); //options.negColor = this.value; // this is a universal val for pointsets
                    $legend.find('.continuous-strip-neg').html(continuousColorStrip(options.negColor, '#CCCCCC'));
                    $mapProv.find('.map-legend').html('-'+continuousColorScale(options)+'+');
                });
                $legend.find('.legend-discrete').append(controller.discreteLegend($target, obj, type));

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
                    if((type=='M' && (options.mode||'fill'=='fill')) || (type=='X' && provMapconfig.markerScaling!='none' && fillScalingCount(provPointPlots)>0)){
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

            discreteLegend: function($target, obj, type){
                var $legend, i, changing, val;
                var options = (type=='X'?provMapconfig:obj.options);
                if(!Array.isArray(options.discreteColors) || options.discreteColors.length==1) options.discreteColors = resetLegend(5);
                $legend = $(templates.discreteLegendShell); //uncustomized shell does not need mustache
                drawLegend();
                $legend.find('button.inc-discrete').button({disabled: options.discreteColors.length>9}).click(function(){
                    $legend.find('button.inc-discrete').button('enable');
                    options.discreteColors = resetLegend(options.discreteColors.length+1);
                    if(options.discreteColors.length>9) $(this).button('disable');
                    drawLegend();
                    makeDirty();
                });
                $legend.find('button.dec-discrete').button({disabled: options.discreteColors.length<2}).click(function(){
                    $legend.find('button.inc-discrete').button('enable');
                    options.discreteColors = resetLegend(options.discreteColors.length-1);
                    if(options.discreteColors.length<2) $(this).button('disable');
                    drawLegend();
                    makeDirty();
                });
                $legend.find('button.reset-discrete').button().click(function(){
                    options.discreteColors = resetLegend(options.discreteColors.length);
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
                function resetLegend(count){
                    var i, key1, key2, nums = [], discreteColors = [], data;
                    if(type=='X') data = panelGraph.calculatedMapData.markerData;
                    if(type=='M') data = obj.calculatedMapData?obj.calculatedMapData.regionData:panelGraph.calculatedMapData.regionData;

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
        $prov.find('.config-cancel').button('enable');
    }
    function continuousColorStrip(a, b){
        return mustache(templates.continuousColorStrip, {a: a, b: b});
    }
    function continuousColorScale(options){
        return mustache(templates.continuousColorScale, {
            negStrip: continuousColorStrip(options.negColor||MAP_COLORS.NEG, MAP_COLORS.MID),
            posStrip: continuousColorStrip(MAP_COLORS.MID, options.posColor||MAP_COLORS.POS)
        });
    }
};
