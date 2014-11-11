/**
 * Created by mark__000 on 11/7/14.
 */
MashableData.Set = function(SetParams){
    for(var param in SetParams){
        this[param] = SetParams[param];
    }
    this.parsedData();
    this.freqs = this.freqs.split(' ');
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
        if(settings){ //optional definition of map, geoid, latLon and frequency
            if(settings.f){
                this.f = MashableData.globals.periodPref = settings.f; //settings.f should be a direct user selection
            }
            if(settings.mapFilter) this.mapFilter = settings.mapFilter; //if searching for public data for Africa, don't return a series for the France!!
            if(typeof settings.geoid != 'undefined'){
                //getting a specific series
                this.geoid = settings.geoid;
                delete this.mapFilter;   //don't care about the filter that was used to find the set if user has asked for a specific geography
            }
            if(settings.map){
                //getting a mapset or a markerset

            } else {
                //get a series
                var params = {
                    command: 'GetMashableData',
                    setid: this.setid,
                    periodicity: this.preferedFreq()
                };
                if(this.geoid) params.geoid = this.geoid;
                if(this.latLon) params.latlon = this.geoid;
                callApi(params,
                    function(jsoData, textStatus, jqXH){
                        for(i=0;i<series.length;i++){
                            handle = series[i].handle;
                            if(oMySeries[handle]){ //if this happens to be in mySeries...
                                oMySeries[handle].data = jsoData.series[handle].data;
                                oMySeries[handle].notes = jsoData.series[handle].notes;
                                oMySeries[handle].geocounts = jsoData.series[handle].geocounts;
                            }
                            series.splice(i, 1, jsoData.series[handle]);
                        }
                        quickGraph(series, showAddSeries);
                    }
                );
            }
        }
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
    }
})();

