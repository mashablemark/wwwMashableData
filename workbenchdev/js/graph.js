/** Graph object
 * Created by Mark Elbert on 11/11/14.
 */


MashableData.Graph = function(properties){
    return this
};
(function(){
    var Graph = MashableData.Graph, globals = MashableData.globals;
    Graph.prototype.delete = function(){

    };
    Graph.prototype.draw = function(){

    };
    Graph.prototype.redraw = function(){

    };
    Graph.prototype.undraw = function(){

    };
    Graph.prototype.fetchAssets = function(callback){
        var assetsToFetch = {series:[], regionSets:[], markerSets:[]}, fetchTracker = [];
        var c, comp, plot, handle, graph = this;
        this.eachComponent(function(c, plot){
            var comp = this;
            handle = comp.handle();
            if((!graph.assets[handle] || !graph.assets[handle].data) && fetchTracker.indexOf(handle)!==-1){
                if(globals.MySets && globals.MySets[handle] && globals.MySets[handle].data){
                    graph.assets[handle] = globals.MySets[handle].clone();
                } else {
                    if(comp.isSeries) assetsToFetch.series.push({setid: comp.setid, freq: comp.freq, geoid: comp.geoid, latlon: comp.latlon});
                    if(comp.isRegionSet) assetsToFetch.regionSets.push({setid: comp.setid, freq: comp.freq});
                    if(comp.isMarkerSet) assetsToFetch.markerSets.push({setid: comp.setid, freq: comp.freq});
                    fetchTracker.push(handle);
                }
            }
        });
        if(assetsToFetch.series.length + assetsToFetch.regionSets.length  + assetsToFetch.markerSets.length >0){
            var params = {command:"GetSets", map: graph.map, modal:'persist'};
            $.extend(true, params, assetsToFetch);
            callApi(params,
                function(jsoData, textStatus, jqXHR){
                    for(handle in jsoData.sets) graph.assets[handle] = jsoData.sets[handle];
                    callBack();
                }
            );
        } else callBack();
    };
    Graph.prototype.changeMap = function(mapCode, callbak){
        if(this.map && this.map!=mapCode) {
            var oldMap = MashableData.Maps[this.map];
            var newMap = MashableData.Maps[mapCode];
            var graph = this;
            var bunnySeries = {}, fetchNeeded = false;
            graph.eachComponent(function(){  //remove the region and market sets' data in assets
                if(this.isRegionSet() || this.isMarkerSet()) {
                    delete graph.assets[this.handle()];
                } else {
                    if(this.geoid==oldMap.bunny && !this.latlon){
                        bunnySeries[this.handle()] = {setid: this.setid, freq: this.freq, geoid: this.geoid};
                        fetchNeeded = true;
                    }
                }
            });
            if(fetchNeeded){
                //TODO: do fetch and replace titles and component moving replaceBunny and findBunnies functionality from graph.js.to here
            } else {
                if(callback) callback();
            }
        }
        this.map = map;
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
        oGraph.eachComponent(function(){oGraph.serieslist.push(oGraph.assets[this.handle].name)});
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
        if(graph.mapsets) $.each(graph.mapsets, function(p){callback.call(this, p, graph.mapsets[p])});
        if(graph.pointsets) $.each(graph.pointsets, function(p){callback.call(this, p, graph.pointsets[p])});
        if(graph.plots) $.each(graph.plots, function(p){callback.call(this, p, graph.plots[p])});
    };
    Graph.prototype.eachComponent = function eachComponent(callback){
        var graph = this;
        graph.eachPlot(function(){
            var plot = this;
            plot.eachComponent(callback);
        });
    };
})();

