
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

function downShiftData(asset, fdown, algorithm){
    //not programmed for require|missing as zero|impute
    if(period.value[fdown]==period.value[asset.period]) return asset.data;
    if(period.value[fdown]<period.value[asset.period] || (fdown!='A'&&fdown!='Q') || period.value[asset.period]<period.value['M']) throw('unable to change data frequency from '+period.name[asset.period]+' to '+period.name[fdown]);
    //real down-shift work begins...

    //1.  chunk input into output period sized arrays
    var newData=[], aData = asset.data.split('||'), bin=[], point, pointDate, lengthInMonths = (fdown=='Q'?3:12), newY, periodStartDate=false, mdDate, sumDays, days;

    for(var i=0;i<aData.length;i++){
        point = aData.split('|');
        pointDate = dateFromMdDate(point[0]);
        if(pointDate.getUTCMonth()%lengthInMonths==0){
            bin = [point[1]];
            periodStartDate = pointDate;
        } else {
            if(periodStartDate!==false) bin.push(point[1]);
        }
        //process bin if full
        if(bin.length==lengthInMonths && (pointDate.getUTCMonth()-periodStartDate.getUTCMonth()==lengthInMonths) && (pointDate.getUTCFullYear()==periodStartDate.getUTCFullYear())){
            //full bin = new point!
            newY = 0; sumDays = 0;
            mdDate = mashableDate(periodStartDate.getTime());
            for(var j=0;j<lengthInMonths;j++){
                switch(algorithm){
                    case 'wavg':
                        days = Math.round(Math.abs(periodStartDate.getTime() - periodStartDate.setUTCMonth(periodStartDate.getUTCMonth()+(asset.period=='M'?1:3)))/period.value.D);
                        newY += bin[j]*days;
                        sumDays += days;
                        break;
                    case 'sum':
                        newY += bin[j];
                        break;
                    default:
                        throw('unrecognized down frequency conversion algorithm')
                }
            }
            newData.push(mdDate + '|' + (algorithm=='wavg'?newY/sumDays:newY));
        }
    }
    return newData.join('||');
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