/** Plot object
 * Created by Mark Elbert on 11/11/14.
 */

MashableData.Plot = function(properties){
    //this.graph set in graph.addPlot
    this.components = this.components || [];
    this.options = properties.options || {};
    return this
};


MashableData.Plot.prototype.name = function(newName){ //optionally sets and returns created or user-defined name
    var handle, comp, c, calcName='';
    if(typeof newName != 'undefined'){
        if(newName && newName.trim()){
            this.options.name = newName;
        } else {
            delete this.options.name;
        }
    }
    if(this.options.name){
        return this.options.name;
    } else {
        //calculate from components
        var isDenom = false;
        for(c=0;c<this.components.length;c++){  //application requirements:  (1) array is sorted by op (2) + and - op have common units
            comp = this.components[c];
            handle = comp.handle;
            calcName += ((c!=0 && comp.options.op)?((comp.options.dn=='d'&&!isDenom)?' / ':' '+comp.options.op+' '):' ') + this.graph.assets[handle].name;
            isDenom = comp.options.dn=='d' || isDenom;
        }
        return calcName;
    }
};


MashableData.Plot.prototype.units = function plotUnits(plot, forceCalculated, formulaObj){
    var c, i, terms, numUnits = '', denomUnits = '', graph = this.graph;
    //short cut for single component plots
    if(plot.components.length==1){
        return plot.options.units || (plot.components[0].op=='/'?'per ':'') + (graph.assets[plot.components[0].handle].units||'');
    }
    if(!plot.options.units || forceCalculated){
        //calculate from component series
        if(!formulaObj) formulaObj = plot.formula();
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
            replaceFormula('{{'+compSymbol(c)+'}}', (graph.assets[plot.components[c].handle].units||'').replace(patPlus,' '));
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

MashableData.Plot.prototype.formula = function plotFormula(){//returns a formula object for display and eval
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
    this.options.calculatedFormula = {
        formula: formula,
        denomFormula: denomFormula,
        numFormula: numFormula,
        k: this.options.k||1
    };
    return this.options.calculatedFormula;

    function subTerm(){return (isNaN(cmp.options.k)||cmp.options.k==1)?variable:cmp.options.k+'*' + variable;}
};

MashableData.Plot.prototype.compSymbol = function compSymbol(compIndex){ //handles up to 26^2 = 676 symbols.  Proper would be to recurse, but current function will work in practical terms
    var symbol='';
    if(compIndex>25){
        symbol = String.fromCharCode('A'.charCodeAt(0)+parseInt(compIndex/26));
    }
    symbol += String.fromCharCode('A'.charCodeAt(0)+(compIndex%26));
    return symbol;
};

MashableData.Plot.prototype.freq = function(){ //accounts for downshifting

};
MashableData.Plot.prototype.eachComponent = function(callback){
    var plot = this;
    $.each(
        plot.components, function(c){callback.call(this, c, plot)}
    );
};
MashableData.Plot.prototype.validateUserFormula = function(formalaString){  //returns true or false to validate user formulas

};