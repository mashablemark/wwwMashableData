/**
 * MashableData.Date object
 *
 * extends (but does not modify!) JavaScript Date object to remember freq and provide formatted output options
 * Created 11/22/14
 */


MashableData.Date = function(dateRepresentation, freq){
/*
dateRepresentation can be:
    an integer representation of a JavaScript date
    a MashableData formatted date string (losely follows ISO 8601 formats)
    a UTC data string
freq is optional and can be derived from MashableData formatted date string.  Should be specified if dateRepresentation is not a MashableData format
*/
    Date.call(this, dateRepresentation);
    this.freq = freq;
    this.mashableDate = dateRepresentation;
    return this;
};

(function(){
    MashableData.Date.prototype.mashableDataDate = function(dateSource, freq){

    };
    MashableData.Date.prototype.readble = function(dateSource, freq){

    };

})();