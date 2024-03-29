"use strict";
/** Plot object
 * Created by Mark Elbert on 11/11/14.
 */

MashableData.Plot = function(components, options){
    //this.graph set in graph.addPlot
    this.components = components || [];
    this.options = options || {};
    return this;
};

(function(){
    var MD = MashableData, common = MD.common, globals = MD.globals, Plot = MD.Plot;
    Plot.prototype.removeCompnent  = function(components, options){
        //this.graph set in graph.addPlot
        this.components = components || [];
        this.options = options || {};
        return this
    };
    /*   Plot.prototype.destroy = function(){
     delete this.components;
     this.graph.removePlot(this);
     delete this.graph;
     };*/
    Plot.prototype.name = function(newName){ //optionally sets and returns created or user-defined name; if newName === false, returns the default (calculated) name
        var handle, comp, c, calcName='';
        if(typeof newName != 'undefined' && newName!==false){
            if(newName && newName.trim()){
                this.options.name = newName;
            } else {
                delete this.options.name;
            }
        }
        if(this.options.name && newName!==false){
            return this.options.name;
        } else {
            //calculate from components
            var isDenom = false;
            for(c=0;c<this.components.length;c++){  //application requirements:  (1) array is sorted by op (2) + and - op have common units
                comp = this.components[c];
                handle = comp.handle();
                calcName += ((c!=0 && comp.options.op)?((comp.options.dn=='d'&&!isDenom)?' / ':' '+comp.options.op+' '):' ') + comp.name();
                isDenom = comp.options.dn=='d' || isDenom;
            }
            return calcName;
        }
    };
    Plot.prototype.isMapPlot = function(){
        this.eachComponent(function(){
            if(this.isMapSet()) return true
        });
        return false;
    };
    Plot.prototype.isPointPlot = function(){
        this.eachComponent(function(){
            if(this.isPointSet()) return true
        });
        return false;
    };
    Plot.prototype.freq = function(){
        return this.options.fdown || this.components[0].freq;
    };
    Plot.prototype.units = function plotUnits(forceCalculated, formulaObj){
        var c, i, terms, numUnits = '', denomUnits = '', graph = this.graph, plot = this;
        //short cut for single component plots
        if(plot.components.length==1){
            return plot.options.units || (plot.components[0].options.op=='/'?'per ':'') + plot.components[0].units||'';
        }
        if(!plot.options.units || forceCalculated){
            //calculate from component series
            if(!formulaObj) formulaObj = plot.calculateFormula();
            //use local copies
            var numerUnits = formulaObj.numFormula;
            var denomFormula = formulaObj.denomFormula;
            // remove any leading negative sign or numerator "1" to not trip ourselves up
            replaceFormula('^(\-)?(1)?','');
            //1. remove any numerical scalor and flag
            var patKs=/[0-9]+/g;
            var scalorFlag = patKs.test(numerUnits) || patKs.test(denomFormula);
            numerUnits = numerUnits.replace(patKs, ' ');
            denomFormula = denomFormula.replace(patKs, ' ');
            //2. remove any numerical scalers K
            var patRemoveOps = /(\*|\(|\))/g;
            numerUnits = numerUnits.replace(patRemoveOps, ' ');
            denomFormula = denomFormula.replace(patRemoveOps, ' ');
            var patPer = /\//g;
            numerUnits = numerUnits.replace(patPer, ' per ');
            denomFormula = denomFormula.replace(patPer, ' per ');
            var patMinus = /-/g;
            numerUnits = numerUnits.replace(patMinus, '+');
            denomFormula = denomFormula.replace(patMinus, '+');
            var patWhiteSpace = /[\s]+/g;
            numerUnits = numerUnits.replace(patWhiteSpace, ' ');
            denomFormula = denomFormula.replace(patWhiteSpace, ' ');
            //3. wrapped variable in code to prevent accident detection in next step
            replaceFormula('([A-Z]+)','{{$1}}');
            //4. swap in units (removing any + signs)
            var patPlus = /\+/g;
            for(c=0;c<plot.components.length;c++){  //application requirements:  (1) array is sorted by op (2) + and - op have common units
                replaceFormula('{{'+this.compSymbol(c)+'}}', (plot.components[c].units||'').replace(patPlus,' '));
            }
            var error = false;
            if(numerUnits!=''){
                terms = numerUnits.split('+');
                numerUnits = terms[0].trim();
                for(i=1;i<terms.length;i++){
                    if(terms[i].trim()!=numerUnits) error = true;
                }
            }
            if(denomFormula!=''){
                terms = denomFormula.split('+');
                denomUnits = terms[0].trim();
                for(i=1;i<terms.length;i++){
                    if(terms[i].trim()!=terms[0]) error = true;
                }
            }
            if(error){
                return 'potentially mismatched units';
            } else {
                if(numerUnits==denomUnits && numerUnits.length>0){
                    return 'ratio';
                } else {
                    return  (scalorFlag?'user scaled ':'') + numerUnits + (denomUnits==''?'':' per ' + denomUnits);
                }
            }
        } else {
            return plot.options.units;
        }

        function replaceFormula(search, replace){
            var pat = new RegExp(search, 'g');
            numerUnits = numerUnits.replace(pat, replace);
            denomUnits = denomUnits.replace(pat, replace);
        }
    };

    Plot.prototype.calculateFormula = function plotFormula(){//returns a formula object for display and eval
        var cmp, variable, isDenom = false, inDivision=false, numFormula='', denomFormula='', term='', formula=''
        var patMultiterm = /[+-/*]+/;
        for(var i=0;i<this.components.length;i++){
            cmp = this.components[i];
            //variable  = (cmp.handle.match(/MX/))?String.fromCharCode('A'.charCodeAt(0)+i):variable = String.fromCharCode('a'.charCodeAt(0)+i);
            variable  = this.compSymbol(i);
            if(!isDenom && cmp.options.dn && cmp.options.dn=='d'){ //first denom component causes all following components forced to denom even if their flag is nto set
                if(inDivision){
                    inDivision = false;
                    if(patMultiterm.test(term)) term = '(' + term + ')';
                    formula += term;
                }
                numFormula = formula;
                formula = '';
                isDenom = true;
            }
            if(formula.length==0){
                switch(cmp.options.op){
                    case '/':
                        inDivision = true;
                        term = subTerm();
                        formula = '1/';
                        break;
                    case '-':
                        formula = '-'+subTerm();
                        break;
                    case '+':
                    case '*':
                    default:
                        formula = subTerm();
                }
            } else {
                switch(cmp.options.op){
                    case "+":
                    case '-':
                        if(inDivision){
                            inDivision = false;
                            if(patMultiterm.test(term)) term = '(' + term + ')';
                            formula += term + ' ' + cmp.options.op + ' ' + subTerm();
                        } else {
                            formula += ' ' + cmp.options.op + ' ' + subTerm();
                        }
                        break;
                    case '*':
                        if(inDivision){
                            term += '*' + subTerm();
                        } else {
                            formula += '*' + subTerm();
                        }
                        break;
                    case '/':
                        if(inDivision){
                            term += '*' + subTerm();
                        } else {
                            inDivision = true;
                            formula += "/";
                            term = subTerm();
                        }
                }
            }
        }
        if(inDivision){
            inDivision = false;
            if(patMultiterm.test(term)) term = '(' + term + ')';
            formula += term;
        }
        if(isDenom){
            denomFormula = formula
        } else {
            numFormula = formula;
        }
        if((this.options.k||1)==1){
            if(isDenom){
                formula = (numFormula==''?1:(patMultiterm.test(numFormula)?'('+numFormula+')':numFormula)) + ' / ' + (patMultiterm.test(denomFormula)?'('+ denomFormula + ')':denomFormula);
            } else {
                formula = numFormula;
            }
        } else {
            if(isDenom){
                formula = this.options.k+' * ' + (numFormula=''?'':(patMultiterm.test(numFormula)?'('+numFormula+')':numFormula)) + ' / ' + (patMultiterm.test(denomFormula)?'('+ denomFormula + ')':denomFormula);
            } else {
                formula = this.options.k + ' * ' + (patMultiterm.test(numFormula)?'('+numFormula+')':numFormula);
            }
        }
        this.calculatedFormula = {
            formula: formula,
            denomFormula: denomFormula,
            numFormula: numFormula,
            k: this.options.k||1
        };
        return this.calculatedFormula;

        function subTerm(){return (isNaN(cmp.options.k)||cmp.options.k==1)?variable:cmp.options.k+'*' + variable;}
    };
    Plot.prototype.formula = function formula(){ //calculated formula expected to be correct is present
        if(this.options.userFormula) return this.options.userFormula;
        if(!this.calculatedFormula) this.calculateFormula();
        return this.calculatedFormula.formula;
    };
    Plot.prototype.createHighSeries = function(){
        console.time('createHighSeries');
        var valuesObject, y, i, j, highSeries, data, point, plotData=[], dateKey, oComponentData = {};
        var plot = this, components = plot.components;

        highSeries = {name: plot.name(), units: plot.units()};
        components = plot.components;
        //note freq in a plot must be the same, either natively or through transformations
        highSeries.freq = plot.options.fdown || components[0].freq;
        var formula = plot.formula(); //refesh the formula object

        //THE BRAINS:
        var expression = 'return ' + formula.replace(globals.patVariable,'values.$1') + ';';
        var compute = new Function('values', expression);

        //1. rearrange series data into single object by date keys
        var compSymbols = [], symbol;
        for(i=0;i<components.length;i++ ){
            symbol = plot.compSymbol(i);
            compSymbols.push(symbol); //calculate once and use as lookup below
            //DOWNSHIFT DETECTION
            if(plot.options.fdown && plot.options.fdown!= components[i].freq){
                data = common.downShiftData(components[i], plot.options.fdown, plot.options.algorithm, plot.options.missing);
            } else {
                data = components[i].parsedData();
            }
            for(j=0; j<data.length; j++){
                //point = Array.isArray(data[j]) ? data[j] : data[j].split(':');
                point = data[j].split(':');
                if(!oComponentData[point[0].toString()]){
                    oComponentData[point[0].toString()] = {};
                }
                oComponentData[point[0].toString()][symbol] = point[1];
            }
        }
        //2. calculate value for each date key (= grouped points)
        var required = !plot.options.componentData || plot.options.componentData=='required';
        var missingAsZero =  plot.options.componentData=='missingAsZero';
        var nullsMissingAsZero =  plot.options.componentData=='nullsMissingAsZero';

        var breakNever = !plot.options.breaks || plot.options.breaks=='never';
        var breakNulls = plot.options.breaks=='nulls';
        var breakMissing = plot.options.breaks=='missing';

        for(dateKey in oComponentData){
            valuesObject = {};
            y = true;
            for(i=0;i<compSymbols.length;i++ ){
                if(!isNaN(oComponentData[dateKey][compSymbols[i]])){
                    valuesObject[compSymbols[i]] = parseFloat(oComponentData[dateKey][compSymbols[i]]);
                } else {
                    if(oComponentData[dateKey][compSymbols[i]]=='null'){
                        if(nullsMissingAsZero){
                            valuesObject[compSymbols[i]] = 0;
                        } else {
                            y = null;
                            break;
                        }
                    } else {
                        if(required) {
                            y = null;
                            break;
                        } else {
                            valuesObject[compSymbols[i]] = 0;
                        }
                    }
                }
            }
            if(y) {
                try{
                    y = compute(valuesObject);
                    if(Math.abs(y)==Infinity || isNaN(y)) y=null;
                } catch(err){
                    y = null;
                }
            }
            if(y!==null || !breakNever){
                if(y!==null) y = common.rationalize(y);  //fix floating point math rounding errors
                plotData.push([Date.parse(common.dateFromMdDate(dateKey)), y]);
            }
        }
        //3. reconstruct an ordered MD data array
        plotData.sort(function(a,b){return a[0]-b[0];});
        if(breakMissing){
            plotData = common.addBreaks(plotData, highSeries.freq);
        }
        highSeries.data = plotData;
        console.timeEnd('createHighSeries');
        return highSeries;
    };

    Plot.prototype.compSymbol = function compSymbol(compIndex){ //handles up to 26^2 = 676 symbols.  Proper would be to recurse, but current function will work in practical terms
        var symbol='';
        if(compIndex>25){
            symbol = String.fromCharCode('A'.charCodeAt(0)+parseInt(compIndex/26));
        }
        symbol += String.fromCharCode('A'.charCodeAt(0)+(compIndex%26));
        return symbol;
    };
    Plot.prototype.type = function(){ //accounts for downshifting
        var plotType = "S";  //default until proven otherwise!
        this.eachComponent(function(){
            if(this.isPointSet()) plotType = "X";
            if(this.isMapSet()) plotType = "M";
        });
        return plotType;
    };
    Plot.prototype.mapMode = function(){ //accounts for downshifting
        if(!this.type()=='M' || !this.graph){
            return false;
        } else {
            return this.options.mapMode || this.graph.mapconfig.mapMode || 'heat';
        }
    };
    Plot.prototype.clone = function(mapCodes){
        //mapCodes is a '+' concatenated string of codes
        //if mapCodes is given, mapset and pointset components will be converted from set to series by each mapCode =  regionCode or latlon
        var mapCodesArray = false;
        if(mapCodes) { //can only handle simple plot where components added TODO: handle scalar multiplication or division of a set
            var allSets = true, summationMath = !this.options.userFormula;
            this.eachComponent(function(c){
                if(this.isSeries()) allSets = false;
                if(this.options.op == '/' || this.options.op == '*') summationMath = false
            });
            mapCodesArray = mapCodes.split('+');
            if(mapCodesArray.length>1 && (!allSets || !summationMath || this.options.userFormula)) return null;  //even with a complex formula, a single region or marker (non-additives bubbles) can be converted to plots
        }
        var plot = this, components = [], seriesComp, symbolMap;
        plot.eachComponent(function(c){
            if(mapCodesArray  && (this.isMapSet() || this.isPointSet())){
                for(var i=0;i<mapCodesArray.length;i++){ //this loop can create extra components that may need to be addressed in formulas other than single or simple additions
                    var seriesComp = this.clone(mapCodesArray[i]);
                    if(seriesComp) components.push(seriesComp);  //some codes may not have data
                }
            } else {  //straight copy
                components.push(this.clone());
            }
        });
        var clone = new Plot(components, $.extend({}, plot.options));
        return clone;
    };
    Plot.prototype.summationComponentSeries = function(vizChartGeos, mapDate){ //used by supplementary map vizes to show components are lines, stacked area, or bars
        var series = [], timeSerie, barSerie, y, point, comp, data, geoCode;
        if(mapDate) mapDate = common.dateFromMdDate(mapDate).getTime();
        for(var i=0;i<vizChartGeos.length;i++){
            geoCode = vizChartGeos[i].code;
            if(mapDate){
                barSerie = {
                    data: [],
                    units: this.units(),
                    geoname: vizChartGeos[i].geoname,
                    name: vizChartGeos[i].geoname,
                    geoid: vizChartGeos[i].geoid,
                    latlon: vizChartGeos[i].latlon
                };
            }
            for(var j=0;j<this.components.length;j++){
                comp = this.components[j];
                if(mapDate){ //bars grouped into one series per geo
                    point = {
                        y: comp.geoScaledData(geoCode, mapDate, mapDate),
                        setname: comp.setname,
                        name: comp.category,
                        freq: comp.freq,
                        src: comp.src,
                        setid: comp.setid
                    };
                    if(comp.data && comp.data[geoCode]){
                        point.seriesname = comp.data[geoCode].seriesname || (comp.setname + ': ' + comp.data[geoCode].geoname);
                    }
                    barSerie.data.push(point);
                } else { //times series
                    if(comp.data && comp.data[geoCode]){
                        if(this.calculatedMapData){
                            data = comp.geoScaledData(geoCode,  this.calculatedMapData.dates[this.calculatedMapData.startDateIndex].dt.getTime(), this.calculatedMapData.dates[this.calculatedMapData.endDateIndex].dt.getTime());
                        } else {
                            data = comp.geoScaledData(geoCode);
                        }
                        timeSerie = {
                            data: data,
                            geoname: comp.data[geoCode].geoname,
                            seriesname: comp.data[geoCode].seriesname || (comp.setname + ': ' + comp.data[geoCode].geoname),
                            setname: comp.setname,
                            name: comp.category,
                            units: this.units(),
                            freq: comp.freq,
                            src: comp.src,
                            setid: comp.setid,
                            geoid: vizChartGeos[i].geoid,
                            latlon: vizChartGeos[i].latlon
                        };
                        series.push(timeSerie);
                    }
                }
            }
            if(mapDate) series.push(barSerie);
        }
        return series;
    };
    Plot.prototype.eachComponent = function(callback){
        var plot = this;
        $.each(
            plot.components, function(c){callback.call(this, c, plot)}
        );
    };
    Plot.prototype.validateUserFormula = function(formulaString){  //returns true or false to validate user formulas

    };
})();
