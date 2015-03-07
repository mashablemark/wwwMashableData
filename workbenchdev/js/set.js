/**
 * Created by mark__000 on 11/7/14.
 */
MashableData.Set = function(SetParams){
    if( Object.prototype.toString.call(SetParams) == '[object String]' ) {  //handle
        // a string = handle
        var nextChar, pos=0, handle = SetParams;
        this.type = handle[pos++];
        this.setid = parseInt(handle.substring(pos));
        pos += this.setid.toString().length;
        if(handle.length>pos){  //next char should be freq
            nextChar = handle[pos++];
            if(MashableData.globals.period.name[nextChar]){
                this.freq = nextChar;
                if(handle.length>pos) nextChar = handle[pos++]; else nextChar='';
            }
            if(nextChar=='G'){
                this.geoid = parseInt(handle.substring(pos));
                if(handle.length>pos) nextChar = handle[pos++]; else nextChar='';
            }
            if(nextChar=='L'){
                this.latlon = handle.substring(pos);
            }
        }
    } else { //hash object of parameters
        for(var param in SetParams){
            if(SetParams.hasOwnProperty(param))  {
                this[param] = SetParams[param];
            }
        }
    }
    if(this.maps && typeof this.maps=="string") this.maps = JSON.parse('{'+this.maps+'}');
    this.parsedData();
    if(this.freqs && !Array.isArray(this.freqs )) this.freqs = this.freqs.split(',');
    return this;
};
(function(){
    var MD = MashableData, globals = MD.globals, grapher = MD.grapher, Set = MD.Set, Graph = MD.Graph; 
    MashableData.Set.prototype.parsedData = function(updatedData){
        if(updatedData) this.data = updatedData;
        if(this.data){
            if(this.isSeries()){
                if(typeof this.data == "string") this.data = this.data.split('|');
            } else {
                for(var key in this.data){
                    if(typeof this.data[key] == "string"){
                        this.data[key] = this.data[key].split('|');
                    } else break;
                }
            }
            return this.data;
        } else {
            return false;
        }
    };
    MashableData.Set.prototype.fetchData = function(settings, callBack){
        var self = this;
        if(settings){ //optional definition of map, geoid, latLon and frequency
            if(settings.f){
                this.f = MashableData.globals.periodPref = settings.f; //settings.f should be a direct user selection
            }
            if(settings.mapFilter && settings.mapFilter!='all') this.options.mapFilter = settings.mapFilter; //if searching for public data for Africa, don't return a series for the France!!
            if(typeof settings.geoid != 'undefined'){
                //getting a specific series
                this.geoid = settings.geoid;
                delete this.options.mapFilter;   //don't care about the filter that was used to find the set if user has asked for a specific geography
            }
            if(settings.map){
                //getting a mapset or a markerset

            } else {
                //get a series
                var thisHandle = this.handle();
                var params = {
                    command: 'GetMashableData',
                    handles: {}
                };
                params.handles[thisHandle]= {
                            setid: this.setid,
                            freq: this.preferedFreq()
                };
                if(this.geoid) params.handles[thisHandle].geoid = this.geoid;
                if(this.latLon) params.handles[thisHandle].latlon = this.latlon;
                if(this.options.mapFilter) params.handles[thisHandle].mapFilter = this.options.mapFilter;
                callApi(params,
                    function(jsoData, textStatus, jqXH){
                        self.parsedData(jsoData.series[thisHandle].data);
                        self.freq = self.preferedFreq();
                        self.notes = jsoData.series[thisHandle].notes;
                        self.geocounts = jsoData.series[thisHandle].geocounts;

                        /*for(i=0;i<series.length;i++){
                            handle = series[i].handle;
                            if(oMySeries[handle]){ //if this happens to be in mySeries...
                                oMySeries[handle].data = jsoData.series[handle].data;
                                oMySeries[handle].notes = jsoData.series[handle].notes;
                                oMySeries[handle].geocounts = jsoData.series[handle].geocounts;
                            }
                            series.splice(i, 1, jsoData.series[handle]);
                        }*/
                        callBack();
                    }
                );
            }
        }
    };
    MashableData.Set.prototype.preferedFreq = function(){
        //hard set
        if(this.freq) return this.freq;
        //prefered (previous requested freq) is available
        if(MashableData.globals.periodPref && this.freqs.indexOf(MashableData.globals.periodPref)!==-1) return MashableData.globals.periodPref;
        //order of preference= monthly, annual, quarterly, semi-annual or whatever
        if(this.freqs.indexOf('M')!==-1) return 'M';
        if(this.freqs.indexOf('A')!==-1) return 'A';
        if(this.freqs.indexOf('Q')!==-1) return 'Q';
        if(this.freqs.indexOf('H')!==-1) return 'H';
        return(this.freqs[0]);  //whatever
    };
    MashableData.Set.prototype.name = function(){
        return this.setname + (this.geoname?': '+this.geoname:'');
    };
    MashableData.Set.prototype.handle = function(){
        var handle = this.settype + this.setid + this.preferedFreq();  //the bar minimum to be a set obj
        if(this.geoid) handle += 'G'+this.geoid;
        if(this.latLon) handle += 'L'+this.latLon;
        return handle;
    };
    MashableData.Set.prototype.clone = function(){
        var original = this;
        var clone = new MashableData.Set(original);  //new object, same parameters (note: data property may be referential)
        return clone;
    };
    MashableData.Set.prototype.isSeries = function(){
        return (this.freq && (this.geoid || this.latlon))?true:false;
    };
    MashableData.Set.prototype.isMapSet = function(){
        return (this.freq && (!this.geoid && !this.latlon) && this.settype=='M')?true:false;
    };
    MashableData.Set.prototype.isPointSet = function(){
        return (this.freq && !this.latlon && this.settype=='X')?true:false;
    };
    MashableData.Set.prototype.mapList = function(){
        if(this.maps){
            var mapCode, mapNames = [];
            for(mapCode in this.maps){
                if(this.maps[mapCode]>1 && globals.maps[mapCode]) mapNames.push(globals.maps[mapCode].name);
            }
            return mapNames.join('; ');
        } else return "";
    };

})();

MashableData.Component = function(SetParams, componentOptions){
    //if(SetParams.clone)   <<< should accept
    MashableData.Set.call(this, SetParams);
    this.options = $.extend({k:1, op:'+'}, componentOptions||{});
    return this;
};

MashableData.Component.prototype = Object.create(MashableData.Set.prototype);
MashableData.Component.prototype.clone = function(){
    var thisComp = this;
    var clone = new MashableData.Component(thisComp, thisComp.options);  //new object, same parameters
    return clone;  //data may be relational, but options are copies
};
