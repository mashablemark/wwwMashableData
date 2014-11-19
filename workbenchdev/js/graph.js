/** Graph object
 * Created by Mark Elbert on 11/11/14.
 */


MashableData.Graph = function(properties){ //replaces function emptyGraph
    this.annotations = [];
    this.title = '';
    this.type = 'auto';
    this.map = '';
    this.assets = {};
    this.analysis = null;
    this.mapconfig = {};
    this.start = null;
    this.end = null;
    this.published = 'N';
    return this;
};
(function(){
    var Graph = MashableData.Graph, globals = MashableData.globals;
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
                this.plots.push(plot);
                break;
            case 'X':
                if(!this.pointsets) this.pointsets = [];
                this.plots.push(plot);
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
            thisGraph.addPlot(this.clone());
        });
    };

    Graph.prototype.destroy = function(){

    };
    Graph.prototype.draw = function(){

    };
    Graph.prototype.redraw = function(){

    };
    Graph.prototype.undraw = function(){

    };
    Graph.prototype.fetchAssets = function(callback){
        //data will reside in the component after fully inflating.  However, the data and the properties need to create the Component object often start an asset
        var assetsToFetch = {series:[], regionSets:[], markerSets:[]}, fetchTracker = [];
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
                        if(comp.isMapSet()) assetsToFetch.regionSets.push({setid: comp.setid, freq: comp.freq});
                        if(comp.isPointSet()) assetsToFetch.markerSets.push({setid: comp.setid, freq: comp.freq});
                        fetchTracker.push(handle);
                    }
                }
            }
        });
        if(assetsToFetch.series.length + assetsToFetch.regionSets.length  + assetsToFetch.markerSets.length >0){
            var params = {command:"GetSets", map: graph.map, modal:'persist'};
            $.extend(true, params, assetsToFetch);
            callApi(params,
                function(jsoData, textStatus, jqXHR){
                    for(handle in jsoData.sets) graph.assets[handle] = jsoData.sets[handle];
                    callback();
                }
            );
        } else callback();
    };
    Graph.prototype.changeMap = function(mapCode, callback){
        if(this.map && this.map!=mapCode) {
            var graph = this, comp;
            var oldMap = globals.maps[graph.map];
            var newMap = globals.maps[mapCode];
            var changedAssets = {};
            graph.eachComponent(function(){  //remove the region and market sets' data in assets
                comp = this;
                var handle = comp.handle();
                if(comp.isSeries()){
                    if(this.geoid==oldMap.bunny && newMap.bunny!=oldMap.bunny && !this.latlon){
                        changedAssets.series = changedAssets.series || {};
                        changedAssets.series [handle] = {setid: this.setid, freq: this.freq, geoid: newMap.bunny};
                        delete comp.data;
                        delete graph.assets[comp.handle]
                    }
                } else {
                    if(comp.isMapSet()) {
                        changedAssets.regionSets = changedAssets.regionSets || {};
                        changedAssets.regionSets [handle] = {setid: this.setid, freq: this.freq};
                    }
                    if(comp.isPointSet()) {
                        changedAssets.markerSets = changedAssets.markerSets || {};
                        changedAssets.markerSets [handle] = {setid: this.setid, freq: this.freq};
                    }
                    delete graph.assets[comp.handle];
                    delete comp.data;
                    delete comp.mappedTo;
                }
            });
            //get the assets
            callApi(
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
                    graph.eachPlot(function(){
                        if(this.options.name) this.options.name = this.options.name.replace(regex, jsoData.replacement);
                        this.eachComponent(function(){
                            var handle = this.handle();
                            if(this.isSeries()){
                                if(!this.latlon){
                                    if(changedAssets.series[handle]){
                                        //find the new asset
                                        for(var sHandle in jsoData.series){
                                            if(jsoData.series[sHandle].setid == this.setid){
                                                this.geoid = jsoData.series[sHandle].geoid;
                                                this.parseData(jsoData.series[sHandle].data);
                                                this.geoname = jsoData.series[sHandle].geoname;
                                            }
                                        }
                                    }
                                }
                            }
                        });
                    });
                    for(var handle in jsoData.sets){
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
        var oGraph = this;
        if(oGraph.gid){
            oGraph.updatedt = (new Date()).getTime();
        } else {
            oGraph.createdt = (new Date()).getTime();
        }
        //create/update the series list
        oGraph.serieslist = [];
        oGraph.eachComponent(function(){oGraph.serieslist.push(oGraph.assets[this.handle()].name)});
        oGraph.serieslist = oGraph.serieslist.join('; ');

        var assets = oGraph.assets; //no need to send up the data ("plots" objects contains all the selection and configuration info)
        var calculatedMapData = oGraph.calculatedMapData; //ditto
        var controls = oGraph.controls; //ditto
        delete oGraph.assets; //temporarily remove after making local reference
        delete oGraph.calculatedMapData; //ditto
        delete oGraph.controls; //ditto

        var params = {command: 'ManageMyGraphs'};
        var o = {}, nonTransmit = ['assts'];
        $.extend(true, params, oGraph);
        params.annotations = serializeAnnotations(oGraph);  // over write array of object with a single serialized field
        params.mapconfig = $.stringify(oGraph.mapconfig);
        var plot, comp;
        oGraph.eachPlot(function(){
            this.options = $.stringify(this.options);
            this.eachComponent(function(){
                this.options = $.stringify(this.options);
            });
        });

        oGraph.assets = assets; //restore objects temporarily removed from oGraph
        oGraph.calculatedMapData = calculatedMapData;
        oGraph.controls = controls;

        callApi(params,
            function(jsoData, textStatus, jqXH){
                //first find to whether this is a new row or an update
                oGraph.gid = jsoData.gid; //has db id and should be in MyGraphs table...
                oGraph.ghash = jsoData.ghash;
                oGraph.isDirty = false;
                delete oGraph.assets; //but don't copy the potentially very large assets.   unattach and reattech instead
                delete oGraph.calculatedMapData; //ditto
                delete oGraph.controls; //ditto
                var objForDataTable = $.extend(true,{from: "", to: ""}, oGraph);
                oGraph.assets = assets; //restore objects temporarily removed from oGraph
                oGraph.calculatedMapData = calculatedMapData;
                oGraph.controls = controls;
                objForDataTable.updatedt = new Date().getTime();
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

    Graph.prototype.saveAs = function(newName){
        if(typeof newName != 'undefined') this.name = newName.trim();
        delete this.gid;
        this.save();
    };

    Graph.prototype.eachPlot = function eachPlot(callback){
        var graph = this;
        if(graph.mapsets) $.each(graph.mapsets, function(p){callback.call(this, p, graph)});
        if(graph.pointsets) $.each(graph.pointsets, function(p){callback.call(this, p, graph)});
        if(graph.plots) $.each(graph.plots, function(p){callback.call(this, p, graph)});
    };
    Graph.prototype.eachComponent = function eachComponent(callback){
        var graph = this;
        graph.eachPlot(function(){
            var plot = this;
            plot.eachComponent(callback);
        });
    };
})();

