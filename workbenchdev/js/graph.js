/** Graph object
 * Created by Mark Elbert on 11/11/14.
 */


MashableData.Graph = function(properties){ //replaces function emptyGraph
    properties = properties || {};
    this.annotations = properties.annotations || [];
    this.title = properties.title || '';
    this.type = properties.type || 'auto';
    this.map = properties.map || '';
    this.assets = properties.assets || {};
    this.gid = properties.gid || null;
    this.ghash = properties.ghash || null;
    this.analysis = properties.analysis || null;
    this.mapconfig = properties.mapconfig || {};
    this.start = properties.start || null;
    this.end = properties.end || null;
    this.published = properties.published || 'N';
    this.userid = parseInt(properties.userid)||null

    //inflations
    if(typeof this.annotations =="string") this.annotations = safeParse(this.annotations, []);
    if(typeof this.mapconfig =="string") this.mapconfig = safeParse(this.mapconfig, {});

    //have allplot to inflate?
    if(properties.allplots){
        var p, c, comp, plot, handle, components, newComponet, newPlot;
        for(p=0;p<properties.allplots.length;p++){
            plot = properties.allplots[p];
            components = [];
            for(c=0;c<plot.components.length;c++){
                comp = plot.components[c];
                handle = comp.settype+comp.setid+comp.freq+(comp.geoid?'G'+comp.geoid:'')+(comp.latlon?'L'+comp.latlon:'');
                if(properties.assets&&properties.assets[handle]){  //required
                    components.push(new MashableData.Component(properties.assets[handle], safeParse(comp.options, {})));
                } else return false;
            }
            this.addPlot(new MashableData.Plot(components, safeParse(plot.options, {})));
        }
        this.assets = properties.assets;
    }

    return this;

    function safeParse(jsonString, emptyValue){
        try{
            return $.parseJSON(jsonString.replace(/u0022/g, '"'));
        }
        catch(e){
            return emptyValue;
        }
    }
};

(function(){
    var MD = MashableData, Graph = MD.Graph, globals = MD.globals, common = MD.common;
    Graph.prototype.addPlot = function(componentsOrPlot, options){
        if(Array.isArray(componentsOrPlot)){
            var plot = new MashableData.Plot(componentsOrPlot, options);
        } else {
            plot = componentsOrPlot
        }
        plot.graph = this;
        switch(plot.type()){
            case 'M':
                if(!this.mapsets) this.mapsets = [];
                this.mapsets.push(plot);
                break;
            case 'X':
                if(!this.pointsets) this.pointsets = [];
                this.pointsets.push(plot);
                break;
            case 'S':
                if(!this.plots) this.plots = [];
                this.plots.push(plot);
                break;
        }
        return plot;
    };
    Graph.prototype.addMapPlot = function(components, options){
        var plot = new MashableData.Plot(components, options);
        plot.graph = this;
        if (this.mapsets) this.mapsets.push(plot); else this.mapsets = [plot];
        return plot;
    };
    Graph.prototype.addPointPlot = function(components, options){
        var plot = new MashableData.Plot(components, options);
        plot.graph = this;
        if(this.pointsets) this.pointsets.push(plot); else this.pointsets = [plot];
        return plot;
    };
    Graph.prototype.clone = function(){
        var thisGraph = this, clone = new Graph();
        clone.map = thisGraph.map;
        clone.start = thisGraph.map;
        clone.end = thisGraph.map;
        clone.mapconfig = $.extend(true, {}, thisGraph.mapconfig);
        clone.title = thisGraph.title;
        clone.type = thisGraph.type;
        clone.analysis = thisGraph.analysis;
        clone.annotations = $.extend(true, {}, {a: thisGraph.annotations}).a;
        thisGraph.eachPlot(function(){
            clone.addPlot(this.clone());
        });
        return clone;
    };
    Graph.prototype.destroy = function(){

    };
    /*    Graph.prototype.removePlot = function(plot){
     this.eachPlot(function(p, graph){
     if(this==plot)
     });
     };*/
    Graph.prototype.draw = function(){

    };
    Graph.prototype.redraw = function(){

    };
    Graph.prototype.undraw = function(){

    };
    Graph.prototype.fetchAssets = function(callback){
        //data will reside in the component after fully inflating.  However, the data and the properties need to create the Component object often start an asset
        var assetsToFetch = {series:[], mapSets:[], pointSets:[]}, fetchTracker = [];
        var c, comp, plot, handle, graph = this;
        this.eachComponent(function(c, plot){
            var comp = this;
            if(!comp.data){
                handle = comp.handle();
                if((!graph.assets[handle] || !graph.assets[handle].data) && fetchTracker.indexOf(handle)==-1){
                    if(globals.MySets && globals.MySets[handle] && globals.MySets[handle].data){
                        graph.assets[handle] = globals.MySets[handle].clone();
                    } else {
                        if(comp.isSeries()) assetsToFetch.series.push({setid: comp.setid, freq: comp.freq, geoid: comp.geoid, latlon: comp.latlon});
                        if(comp.isMapSet()) assetsToFetch.mapSets.push({setid: comp.setid, freq: comp.freq});
                        if(comp.isPointSet()) assetsToFetch.pointSets.push({setid: comp.setid, freq: comp.freq});
                        fetchTracker.push(handle);
                    }
                }
            }
        });
        if(assetsToFetch.series.length + assetsToFetch.mapSets.length  + assetsToFetch.pointSets.length >0){
            var params = {command:"GetSets", map: graph.map, modal:'persist'};
            $.extend(true, params, assetsToFetch);
            common.callApi(params,
                function(jsoData, textStatus, jqXHR){
                    for(handle in jsoData.assets) graph.assets[handle] = jsoData.assets[handle];
                    callback();
                }
            );
        } else callback();
    };
    Graph.prototype.fetchMap = function(callback){
        var graph = this;
        if(graph.map){
            if(!graph.mapFile) graph.mapFile = globals.maps[graph.map].redef?graph.map:globals.maps[graph.map].jvectormap;
            var requiredFile = ['/global/js/maps/'+ graph.mapFile +'.js'];
            require(requiredFile, function(){
                if(globals.maps[graph.map].redef) common.makeMap(graph.map);  //if this a regional map derived from a master map (eg. world -> WB regions)
                if(callback) callback();
            });
        } else if(callback) callback();
    };
    Graph.prototype.changeMap = function(mapCode, callback){
        if(this.map && this.map!=mapCode) {
            var graph = this, comp;
            var oldMap = globals.maps[graph.map];
            var newMap = globals.maps[mapCode];
            delete graph.mapFile;
            graph.map = mapCode;
            graph.fetchMap();  //prefetch map while executing database query
            var changedAssets = {};
            graph.eachComponent(function(){  //remove the region and market sets' data in assets
                comp = this;
                var handle = comp.handle();
                if(comp.isSeries()){
                    if(this.geoid==oldMap.bunny && newMap.bunny!=oldMap.bunny && !this.latlon){
                        changedAssets.series = changedAssets.series || {};
                        changedAssets.series [handle] = {setid: this.setid, freq: this.freq, geoid: newMap.bunny};
                        delete comp.data;
                        delete graph.assets[handle]
                    }
                } else {
                    if(comp.isMapSet()) {
                        changedAssets.mapSets = changedAssets.mapSets || {};
                        changedAssets.mapSets [handle] = {setid: this.setid, freq: this.freq};
                    }
                    if(comp.isPointSet()) {
                        changedAssets.pointSets = changedAssets.pointSets || {};
                        changedAssets.pointSets [handle] = {setid: this.setid, freq: this.freq};
                    }
                    delete graph.assets[comp.handle];
                    delete comp.data;
                    delete comp.mappedTo;
                }
            });
            //get the assets
            common.callApi(
                {
                    command:"ChangeMaps",
                    map: mapCode,
                    sets:  changedAssets,
                    fromgeoid: oldMap.bunny,
                    togeoid: newMap.bunny,
                    modal:'persist'
                },
                function(jsoData, textStatus, jqXHR){
                    var regex = new RegExp(jsoData.regex);
                    graph.title = graph.title.replace(regex, jsoData.replacement);
                    graph.notes = graph.notes.replace(regex, jsoData.replacement);
                    graph.eachPlot(function(){
                        if(this.options.name) this.options.name = this.options.name.replace(regex, jsoData.replacement);
                        if(jsoData.bunnies){
                            this.eachComponent(function(){
                                var oldBunnyHandle = this.handle();
                                if(jsoData.bunnies[oldBunnyHandle]){
                                    this.parseData(jsoData.bunnies[oldBunnyHandle].data);
                                    this.geoname = jsoData.replacement;
                                    this.geoid = jsoData.bunnies[oldBunnyHandle].geoid;
                                }
                                delete graph.assets[oldBunnyHandle];
                            });
                        }
                    });
                    for(var handle in jsoData.assets){
                        graph.assets[handle] = jsoData.sets[handle];
                        graph.assets[handle].mappedTo = mapCode;
                    }
                    this.map = newMap;
                    callback();
                }
            );
        }
    };

    Graph.prototype.save = function saveGraph(callback) {
//first save to db and than to $dtMyGraphs and oMyGraphs once we have a gid
        var oGraph = this, serieslist = [], now = new Date().getTime(), mapseriespointplots = [], plotRepresentation;

        //create/update the series list
        this.eachComponent(function(){serieslist.push(this.name())});

        //flatten the plot (map, series and point) into mapseriespointplots array
        this.eachPlot(function(){
            plotRepresentation = {
                type: this.type(),
                options: $.stringify(this.options),
                components: []
            };
            this.eachComponent(function(){
                plotRepresentation.components.push({
                    setid: this.setid,
                    freq: this.freq,
                    geoid: this.geoid,
                    latlon: this.latlon,
                    options: $.stringify(this.options)
                });
            });
            mapseriespointplots.push(plotRepresentation);
        });

        var saveParams = {
            command: "ManageMyGraphs",
            serieslist:serieslist.join('; '),
            end: this.end,
            start: this.start,
            annotations: serializeAnnotations(oGraph),
            map: this.map,
            mapconfig: $.stringify(this.mapconfig),
            modifieddt: now,
            intervals: this.intervals,
            cubeid: this.cubeid,
            type: this.type,
            title: this.title,
            analysis: this.analysis,
            published: this.published || 'N',
            allplots: mapseriespointplots
        };

        callApi(saveParams,
            function(jsoData, textStatus, jqXH){
                //first find to whether this is a new row or an update
                oGraph.gid = jsoData.gid; //has db id and should be in MyGraphs table...
                oGraph.ghash = jsoData.ghash;
                oGraph.isDirty = false;
                var objForDataTable = $.extend({from: '', to: '', plottypes: ''}, oGraph);
                objForDataTable.updatedt = new Date().getTime();
                oGraph.eachPlot(function(){
                    objForDataTable.plottypes += this.type();
                });
                if(('G' + oGraph.gid) in oMyGraphs){
                    var trMyGraph;
                    trMyGraph = $($dtMyGraphs).find('span.handle[data=G' + oGraph.gid + ']').closest('tr').get(0);
                    $dtMyGraphs.fnUpdate(objForDataTable, trMyGraph);
                } else {
                    $dtMyGraphs.fnAddData(objForDataTable);
                }

                oMyGraphs['G'+oGraph.gid]=objForDataTable;
                panelGraphs[visiblePanelId()] =  oGraph;
                if(callback) callback();
            }
        );
        function serializeAnnotations(mdGraph){  //called by saveGraph.  Couldn't use stringify because of logic
            var serialized = '[';
            for(var i=0;i<mdGraph.annotations.length;i++){
                serialized += '{"type":"' + mdGraph.annotations[i].type + '",';
                if(mdGraph.annotations[i].type=='point')serialized += '"series":"' + mdGraph.annotations[i].series + '",';
                if(mdGraph.annotations[i].type.substring(0,1)=='h')serialized += '"yAxis":"' + mdGraph.annotations[i].yAxis + '",';
                serialized += '"color":"' + mdGraph.annotations[i].color + '",';
                serialized += '"from":"' + mdGraph.annotations[i].from + '",';
                if(mdGraph.annotations[i].type.indexOf('band')>-1)serialized += '"to":"' + mdGraph.annotations[i].to + '",';
                serialized += '"text":"' + mdGraph.annotations[i].text + '"}';
                if(i<mdGraph.annotations.length-1)serialized += ',';
            }
            return serialized + ']';
        }
    };

    Graph.prototype.saveAs = function(newName, callback){
        if(typeof newName != 'undefined') this.name = newName.trim();
        delete this.gid;
        delete this.ghash;
        this.save(callback);
    };

    Graph.prototype.deleteGraph = function(callback){
        if(this.userid == account.info.userId){
            common.callApi({command: 'DeleteMyGraphs', gids: [this.gid]}, callback);
        } else callback(false);
    };

    Graph.prototype.resetHash = function(callBack){
        callApi({command: 'ResetGhash', gid: oGraph.gid}, function(oReturn, textStatus, jqXH){
            this.ghash = oReturn.ghash;
            callBack();
        });
    }

    Graph.prototype.eachPlot = function eachPlot(callback){
        var graph = this;
        if(graph.mapsets) $.each(graph.mapsets, function(p){callback.call(this, p, graph, graph.mapsets)});
        if(graph.pointsets) $.each(graph.pointsets, function(p){callback.call(this, p, graph, graph.pointsets)});
        if(graph.plots) $.each(graph.plots, function(p){callback.call(this, p, graph, graph.plots)});
    };
    Graph.prototype.eachComponent = function eachComponent(callback){
        var graph = this;
        graph.eachPlot(function(){
            var plot = this;
            plot.eachComponent(callback);
        });
    };
    Graph.prototype.mapFreq = function (){
        var mapFreq = false, plotFreq;
        this.eachPlot(function(){
            if(this.type()!="S"){
                plotFreq=this.freq();
                if(mapFreq && mapFreq!=plotFreq) return "error";
                mapFreq=plotFreq;
            }
        });
        return mapFreq;
    };
    Graph.prototype.isSummationMap = function isSummationMap(){
        if(!this.mapsets) return false;  //todo:  pointsets (only mapsets for now)
        for(var ms=0;ms<this.mapsets.length;ms++){
            if(!this.mapsets[ms].calculatedFormula) this.mapsets[ms].calculateFormula();
            var formula = this.mapsets[ms].calculatedFormula;
            if(!/[-+]/.test(formula.numFormula) || /[*/]/.test(formula.numFormula)) return false;  //no division or multiplication TODO:  allow series multipliers/dividers
            this.mapsets[ms].eachComponent(function(){
                if(!this.isMapSet()) return false;  //mapsets only (no series)  TODO:  allow series multipliers/dividers
            });
        }
        return true;
    };
})();
