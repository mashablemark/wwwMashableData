
function getParameterByName(name)
{
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\?&]" + name + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(window.location.search);
    if(results == null)
        return "";
    else
        return decodeURIComponent(results[1].replace(/\+/g, " "));
}

function octet(s){
    s = s.toString(16);
    return (s.length==1?0:'') + s;
}

function mashableDataString(serie){
    var i, points=[];
    if (typeof serie.data == 'string'){
        return serie.data;
    } else {
        for (i = 0; i < serie.data.length; i++) {
            points.push( mashableDate(serie.data[i][0], serie.period) + '|' + (isNaN(serie.data[i][1])||serie.data[i][1]===null? 'null' : serie.data[i][1]));
        }
        return points.join('||');
    }
}

function mashableDate(jsDate, period){
    var dt = new Date(parseInt(jsDate));
    var mdDate = dt.getUTCFullYear();
    switch (period){
        case 'M':
            mdDate += (dt.getUTCMonth().toString().length==1?'0':'')+dt.getUTCMonth();
            break;
        case 'Q':
            mdDate += 'Q'+parseInt((dt.getUTCMonth()+3)/3);
            break;
        case 'SA':
            mdDate += 'H'+parseInt((dt.getUTCMonth()+6)/6);
            break;
        case 'W':
        case 'D':
            mdDate += (dt.getUTCMonth().toString().length==1?'0':'')+dt.getUTCMonth();
            mdDate += (dt.getUTCDate().toString().length==1?'0':'')+dt.getUTCDate();
            break;

    }
    return mdDate;
}
function dateFromMdDate(mddt){  //returns a data object
    var udt;
    udt = new Date('1/1/' + mddt.substr(0,4) + ' UTC'); //language & region independent
    if(mddt.length>4){
        switch(mddt.substr(4,1)){
            case 'Q':
                udt.period = 'Q';
                udt.setUTCMonth((mddt.substr(5,1)-1)*3);
                break;
            case 'H':
                udt.period = 'H';
                udt.setUTCMonth((mddt.substr(5,1)-1)*6);
                break;
            default:
                udt.period = 'M';
                udt.setUTCMonth(mddt.substr(4,2));
        }
        if(mddt.length>6){
            udt.period = 'D';
            udt.setUTCDate(mddt.substr(6,2));
            if(mddt.length>8){
                udt.setUTCHours(mddt.substr(9,2));
                udt.setUTCMinutes(mddt.substr(12,2));
                udt.setUTCSeconds(mddt.substr(15,2));
            }
        }
    }else{
        udt.period = 'A';
    }
    udt.s = mddt;
    return udt
}

Date.prototype.toMDDateString = function(period){
    var p = period || this.period;
    if(!p) throw('no period found');
    var mdDate = this.getUTCFullYear();
    switch (period){
        case 'M':
            mdDate += (this.getUTCMonth().toString().length==1?'0':'')+this.getUTCMonth();
            break;
        case 'Q':
            mdDate += 'Q'+parseInt((this.getUTCMonth()+3)/3);
            break;
        case 'SA':
            mdDate += 'H'+parseInt((this.getUTCMonth()+6)/6);
            break;
        case 'W':
        case 'D':
            mdDate += (this.getUTCMonth().toString().length==1?'0':'')+this.getUTCMonth();
            mdDate += (this.getUTCDate().toString().length==1?'0':'')+this.getUTCDate();
            break;

    }
    return mdDate;
};

if (!('pushUnique' in Array.prototype)) {
    Array.prototype.pushUnique = function(item) {
        if(this.indexOf(item)===-1){
            return this.push(item);
        } else {
            return false;
        }
    };
}

function dateConversionData(key, jsStart, jsEnd){
//if end is not specified, this year is used.
//if start is not specified, a 10 year interval  is used
    if(jsStart && typeof jsStart != "object") jsStart = new Date(parseInt(jsStart));
    if(jsEnd && typeof jsEnd != "object") jsEnd = new Date(parseInt(jsEnd));
    var data = '', altStart;
    var oneDay = 24*60*60*1000; // hours*minutes*seconds*milliseconds
    var today = new Date();
    switch(key.toUpperCase()){ //time series: apiid = 7; root catid = 382243
        case "DAYSPERMONTH": //seriesid = 5258277
            if(jsEnd){
                jsEnd = new Date(jsEnd.getUTCFullYear() + '-' + (jsEnd.getUTCMonth()+1) + '-01 UTC');
            } else {
                jsEnd = new Date(today.getUTCFullYear() + '-12-01 UTC');
            }
            if(jsStart && jsStart < jsEnd){
                jsStart = new Date(jsStart.getUTCFullYear() + '-' + (jsStart.getUTCMonth()+1) + '-01 UTC');
            } else {
                jsStart = new Date(jsEnd.getTime());
                jsStart.setUTCMonth(jsStart.getUTCMonth() - 119);
            }
            while(jsStart <= jsEnd){
                data += (data?'||':'') + mashableDate(jsStart.getTime(), 'M') + '|' +  Math.round(Math.abs(jsStart.getTime() - jsStart.setUTCMonth(jsStart.getUTCMonth()+1))/oneDay);
            }
            break;
        case "DAYSPERQUARTER":  //seriesid = 5258276
            if(jsEnd){
                jsEnd = new Date(jsEnd.getUTCFullYear() + '-' + (jsEnd.getUTCMonth()+3) + '-01 UTC');
            } else {
                jsEnd = new Date(today.getUTCFullYear() + '-12-01 UTC');
            }
            if(jsStart && jsStart < jsEnd){
                jsStart = new Date(jsStart.getUTCFullYear() + '-' + (jsStart.getUTCMonth()+3) + '-01 UTC');
            } else {
                jsStart = new Date(jsEnd.getTime());
                jsStart.setUTCMonth(jsStart.getUTCMonth() - 119);
            }
            while(jsStart <= jsEnd){
                data += (data?'||':'') + mashableDate(jsStart.getTime(), 'Q') + '|' +  Math.round(Math.abs(jsStart.getTime() - jsStart.setUTCMonth(jsStart.getUTCMonth()+3))/oneDay);
            }
            break;
        case "DAYSPERYEAR":  //seriesid = 5258275
            jsEnd = jsEnd || new Date(today.getUTCFullYear() + '-01-01 UTC');


            if(jsEnd){
                jsEnd = new Date(jsEnd.getUTCFullYear() + '-01-01 UTC');
            } else {
                jsEnd = new Date(today.getUTCFullYear() + '-01-01 UTC');
            }
            if(jsStart && jsStart < jsEnd){
                jsStart = new Date(jsStart.getUTCFullYear() + '-01-01 UTC');
            } else {
                jsStart = new Date((jsEnd.getUTCFullYear() - 20)  + '-01-01 UTC');
            }
            while(jsStart <= jsEnd){
                data += (data?'||':'') + mashableDate(jsStart.getTime(), 'A') + '|' +  Math.round(Math.abs(jsStart.getTime() - jsStart.setUTCFullYear(jsStart.getUTCFullYear()+1))/period.value.D);
            }
            break;
    }
    return data;
}

function selectDownshift(graph, fdown, plot, callback){
    var i, asset;
    var html = '<div id="downshiftWizard" style="width:600px;">'  //TODO: CSS entries
        +   '<h4>Frequency Shifting:</h4>';
    if(fdown) html += 'You have selected to have the plot recalculated as <b></b>'+period.name[fdown]+'</b>.  Please select the method and treatment of missing and null values.<br>';
    else html += 'You have requested to mash series with different frequencies.  This will require first recalculating the series data having a shorter reporting period to a common longer period.  Please confirm by selecting the algorithm and the treatment of missing and null values.<br>';
    html += '<br>Component series that must be recalculated:'
        + '<ol>';
    for(i=0;i<plot.components.length;i++){
        asset = graph.assets[plot.components[i].handle];
        html += '<li><b>'+asset.name+'</b> ('+asset.units+') '+period.name[fdown=='A'&&asset.freqset.Q?'Q':'M']+'</li>';
    }
    html += '</ol>'
        //+ 'Recalculate individual compnent series data to be <select id="dsw_period"><option value="A">annual</option>'+ (minPeriod=='Q'?'<option value="Q">quarterly</option>':'')+'</select> if different<br>'
        + '<br>Each component series will be individual recalculated as needed to the new frequency by:<br>'
        + '<label><input type="radio" name="dsw_algor" value="sum"> simple summation</label><br>'
        + '<label><input type="radio" name="dsw_algor" value="wavg"> day-weighted average</label><br>'
        + '<br>If some of the values used to calculate a new datum point are are null or missing (e.g. a month is missing when calulating an annual value):<br>'
        + '<label><input type="radio" name="dsw_missing" value="null"> the computed value for the datum will be null (i.e. all sub-values are required)</label><br>'
        + '<label><input type="radio" name="dsw_missing" value="zero"> treat as if the value were zero</label><br>'
        + '<label><input type="radio" name="dsw_missing" value="impute"> estimate value to be the day-weighted average of new period\'s existing component values if at least three-quarters of the component values exist</label><br>'
        + '<span class="ui-state-error warning-box"><span class="ui-icon ui-icon-alert" style="display:inline-block;"></span>WARNING: Change frequencies and use estimates with care.  Summations produce valid results for monthly production quantities, whereas day-weighted averages are statistically correct for rates where the implied denominator is constant.<br><br>For more information, see <a href="/workbench-help/changing-frequency/" traget="_blank" class="link">changing frequencies help</a>.</span>'
        + '<button id="dsw_ok" class="right">OK</button> <button id="dsw_cancel" class="right">cancel</button>'
        + '</div>';

    $.fancybox(html,
        {
            showCloseButton: false,
            autoScale: true,  //($btn?false:true),
            overlayOpacity: 0.5,
            hideOnOverlayClick: false
        });
    var $dsw = $('#downshiftWizard');
    $('#dsw_ok').button({icons: {secondary: 'ui-icon-check'}}).click(function(){
        var downshift = {
            algorithm: $dsw.find('input:radio[name=\'dsw_algor\']:checked').val(),
            missing: $dsw.find('input:radio[name=\'dsw_missing\']:checked').val()
        };
        if(downshift.algorithm && downshift.missing) {
            callback(downshift);
            $.fancybox.close();
        } else {
            dialogShow('error', 'All form selections are required.');
        }
    });
    $('#dsw_cancel').button({icons: {secondary: 'ui-icon-close'}}).click(function(){
        $.fancybox.close();
        callback(false);
    });
}
function downShiftData(asset, fdown, algorithm, missing){
    //algorithm = [sum|wavg] *required
    //not programmed for require all points|missing/null as zero|impute null/missing
    if(period.value[fdown]==period.value[asset.period]) return asset.data;
    if(period.value[fdown]<period.value[asset.period] || (fdown!='A'&&fdown!='Q') || period.value[asset.period]<period.value['M']) throw('unable to change data frequency from '+period.name[asset.period]+' to '+period.name[fdown]);
    //real down-shift work begins...

    //1.  chunk input into output period sized arrays
    var aData = asset.data.split('||'), newData=[], bin=[],
        lengthInMonths = (fdown=='Q'?3:12),  //can downshift to only annual or quarterly
        lengthAssetPeriod = asset.period=='M'?1:3, //can downshift from only monthly or quarterly
        periodsStartDate=false,
        mdDate, point, pointDate;

    for(var i=0;i<aData.length;i++){
        point = aData[i].split('|');
        pointDate = dateFromMdDate(point[0]);
        //old new interval check: if(pointDate.getUTCMonth()%lengthInMonths==0){
        if(periodsStartDate===false
            || pointDate.getUTCMonth()-periodsStartDate.getUTCMonth()>lengthInMonths-1
            || pointDate.getUTCFullYear()!=periodsStartDate.getUTCFullYear()){
            if(bin.length!=0) {
                newData.push(downShiftDatum());
                bin = [];
            }
            periodsStartDate = new Date(pointDate.getUTCFullYear()+'-'+(Math.floor(pointDate.getUTCMonth()/lengthInMonths)*lengthInMonths+1)+'-1 UTC');
        }
        bin[pointDate.getUTCMonth()] = point[1];
    }
    if(bin.length!=0) newData.push(downShiftDatum()); //final datum if needed
    return newData;

    function downShiftDatum(){ //process bin, including imputations if requested
        var subPeriodDays, valueDays=0, missingDays=0, missingPeriods=0, newY=0;
        mdDate = mashableDate(periodsStartDate.getTime(), fdown);
        var startMonth = periodsStartDate.getUTCMonth();
        for(var j=startMonth;j<startMonth+lengthInMonths;j=j+lengthAssetPeriod){
            subPeriodDays = -Math.round(periodsStartDate.getTime()-periodsStartDate.setUTCMonth(periodsStartDate.getUTCMonth()+lengthAssetPeriod)/period.value.D);
            if(typeof bin[j]=='undefined' || bin[j]===null){
                if(missing=='null'){
                    return mdDate + '|null';
                }
                bin[j] = 0;
                if(missing=='impute'){
                    missingPeriods++;
                    missingDays += subPeriodDays;
                    valueDays -=  subPeriodDays;  //this will be adding back in
                } //if not require and not impute, must be treat missing/null as zero

            }

            switch(algorithm){
                case 'wavg':
                    newY += parseFloat(bin[j])*subPeriodDays;
                    valueDays += subPeriodDays;
                    break;
                case 'sum':
                    newY += parseFloat(bin[j]);
                    break;
                default:
                    throw('unrecognized down frequency conversion algorithm')
            }
        }
        if(missingDays!=0 && newY != 'null') newY = newY*(valueDays+missingDays)/valueDays; //IMPUTATION
        return mdDate + '|' + (algorithm=='wavg'?newY/valueDays:newY);
    }
}

function rationalize(value){ //fixes rounding errors introduced by floating point operations
    if(Math.log(Math.abs(value))>-13) return  Math.round(value * Math.pow(10,10)) / Math.pow(10,10); else return value;
}

function equivalentRGBA(hexColor, alpha){
    var r, g, b;
    if(hexColor.substr(0,1)=='#')hexColor=hexColor.substr(1);  //get rid of any potential # prefix
    r = gun(parseInt(hexColor.substr(0,2),16), alpha);
    g = gun(parseInt(hexColor.substr(2,2),16), alpha);
    b = gun(parseInt(hexColor.substr(4,2),16), alpha);
    if(r>0&&g>0&&b>0){
        return 'rgba(' + r +','+  g +','+  b +','+alpha+')';
    } else {
        return 'rgb(' + parseInt(hexColor.substr(0,2),16) +','+  parseInt(hexColor.substr(2,2),16) +','+  parseInt(hexColor.substr(4,2),16) +')';
    }
    function gun(desired, alpha){
        return  parseInt(desired/alpha - (1-alpha)*255/alpha);
    }
}


function addBreaks(seriesData, periodicity){
    var data = seriesData.slice(0); //make a copy
    data.sort(function(a,b){return a[0]-b[0]});
    var oData = [];
    if(data.length>0) oData.push([data[0][0], data[0][1]]);  //oData.push({x: data[0][0], y: data[0][1], marker: {enabled: (data.length==1)}});
    var interval;
    switch(periodicity){
        case 'T':
        case 'N':
        case 'D':
        /*return data;
         break;*/
        case 'W':
            maxInterval = Date.UTC(2000,0,9)-Date.UTC(2000,0,1);
            break;
        case 'M':
            maxInterval = Date.UTC(2000,1,2)-Date.UTC(2000,0,1);
            break;
        case 'SA':
            maxInterval = Date.UTC(2000,7,2)-Date.UTC(2000,0,1);
            break;

        default: //annual
            maxInterval =  Date.UTC(2001, 2)-Date.UTC(2000,1);
    }
    for(var i=1;i<data.length;i++){
        if(data[i-1][1]!= null && data[i][1]!= null && ((data[i][0]-data[i-1][0]) > maxInterval)){
            var interDate = new Date(data[i][0] );
            switch(periodicity){
                case 'd':
                case 'w':
                    interDate.setDate(interDate.getDate()+7);
                    break;
                case '4':
                    interDate.setDate(interDate.getDate()+28);
                    break;
                case 'm':
                    interDate.setMonth(interDate.getMonth()+1);
                    break;
                default: //annual
                    interDate.setMonth(interDate.getMonth()+12);
            }
            data.splice(i,0,[parseInt(interDate), null]);
            /*
             oData.push({x: parseInt(interDate), y: null, marker: {enabled: false}});
             if(i==1){
             oData[0].marker.enabled = true;
             } else if(oData[i-2].y==null){
             oData[i-1].marker.enabled = true;
             }
             */
            i++;
        }
        //oData.push({x: data[i][0], y: data[i][1], marker: {enabled: false}});

    }

    /*    if(oData.length>1){
     if(oData[oData.length-2].y==null){
     oData[oData.length-1].marker.enabled = true;
     }
     }
     */
    return data //oData
}
