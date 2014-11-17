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
            if(SetParams.hasOwnProperty(param))  this[param] = SetParams[param];
        }
    }
    this.parsedData();
    if(this.freqs) this.freqs = this.freqs.split(' ');
    return this;
};
(function(){
    MashableData.Set.prototype.parsedData = function(updatedData){
        if(updatedData) this.data = updatedData;
        if(this.data){
            if(Array.isArray(updatedData)){
                this.data = updatedData;
            } else {
                this.data = updatedData.split('|');
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
        if(this.f) return this.f;
        //prefered (previous requested freq) is available
        if(MashableData.globals.periodPref && this.freqs.indexOf(MashableData.globals.periodPref)!==-1) return MashableData.globals.periodPref;
        //order of preference= monthly, annual, quarterly, semi-annual or whatever
        if(this.freqs.indexOf('M')) return 'M';
        if(this.freqs.indexOf('A')) return 'A';
        if(this.freqs.indexOf('Q')) return 'Q';
        if(this.freqs.indexOf('H')) return 'H';
        return(this.freqs[0]);  //whatever
    };
    MashableData.Set.prototype.handle = function(){
        var handle = this.type + this.setid + this.preferedFreq();  //the bar minimum to be a set obj
        if(this.geoid) handle += 'G'+this.geoid;
        if(this.latLon) handle += 'L'+this.latLon;
        return handle;
    };
    MashableData.Set.prototype.clone = function(){
        var original = this;
        var clone = new MashableData.Set(original);
        return clone;
    };
    MashableData.Set.prototype.isSeries = function(){
        return (this.freq && (this.geoid || this.latlon));
    };
    MashableData.Set.prototype.isRegionSet = function(){
        return (this.freq && (!this.geoid && !this.latlon) && this.type=='M');
    };
    MashableData.Set.prototype.isMarkerSet = function(){
        return (this.freq && !this.latlon && this.type=='X');
    }
})();

MashableData.Component = function(SetParams, compnentOptions){
    MashableData.Set.call(this, SetParams);
    this.options = compnentOptions;
    return this;
};

MashableData.Component.prototype = Object.create(MashableData.Set.prototype);

