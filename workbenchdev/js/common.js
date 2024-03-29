

MashableData.common = {
/*    getParameterByName: function getParameterByName(name){
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regexS = "[\\?&]" + name + "=([^&#]*)";
        var regex = new RegExp(regexS);
        var results = regex.exec(window.location.search);
        if(results == null)
            return "";
        else
            return decodeURIComponent(results[1].replace(/\+/g, " "));
    },*/
    numberFormat: function numberFormat(number, decimals, decPoint, thousandsSep) {
        var lang = MashableData.globals.lang,
        // http://kevin.vanzonneveld.net/techblog/article/javascript_equivalent_for_phps_number_format/
        n = +number || 0,
        c = decimals === -1 ?
            (n.toString().split('.')[1] || '').length : // preserve decimals
            (isNaN(decimals = Math.abs(decimals)) ? 2 : decimals),
        d = decPoint === undefined ? lang.decimalPoint : decPoint,
        t = thousandsSep === undefined ? lang.thousandsSep : thousandsSep,
        s = n < 0 ? "-" : "",
        i = String(parseInt(n = Math.abs(n).toFixed(c))),
        j = i.length > 3 ? i.length % 3 : 0;

        return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) +
            (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
    },
    octet: function octet(s){
        s = s.toString(16);
        return (s.length==1?0:'') + s;
    },
    mustacheRegex: /{{([^}]+)}}/g,
    mustache: function(template, valuesObject){ //single level simplistic mustache-like templating
        rep = template.match(this.mustacheRegex);
        if(valuesObject){
            var key, searchRegex;
            for(key in valuesObject){
                searchRegex = new RegExp('{{'+key+'}}','g');
                template = template.replace(searchRegex, valuesObject[key]);
            }
        }
        return template;
    },
    mashableDataString: function mashableDataString(serie){
        var i, points=[];
        if (typeof serie.data == 'string'){
            return serie.data;
        } else {
            for (i = 0; i < serie.data.length; i++) {
                points.push( mashableDate(serie.data[i][0], serie.period) + ':' + (isNaN(serie.data[i][1])||serie.data[i][1]===null? 'null' : serie.data[i][1]));
            }
            return points.join('|');
        }
    },

    isoDateFromMdDate: function(mdDate){
        var isoDate = mdDate;
        if(mdDate.length>4){
            isoDate = isoDate.substr(0,4)+'-'+isoDate.substr(4);
            if(mdDate.length>6) isoDate = isoDate.substr(0,7)+'-'+isoDate.substr(7);
        }
        return isoDate;
    },
    mashableDate: function mashableDate(jsDate, period){
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
    },

    dateFromMdDate: function dateFromMdDate(mddt){  //returns a Date object
        var udt;
        udt = new Date(mddt.substr(0,4) + '-01-01 UTC'); //language & region independent
        if(mddt.length==6) {
            switch (mddt.substr(4, 1)) {
                case 'Q':
                    udt.period = 'Q';
                    udt.setUTCMonth((mddt.substr(5, 1) - 1) * 3);
                    break;
                case 'H':
                    udt.period = 'H';
                    udt.setUTCMonth((mddt.substr(5, 1) - 1) * 6);
                    break;
                default:
                    udt = new Date(mddt.substr(0, 4) + '-' + mddt.substr(4, 2) + '-01 UTC');  //better validation than just setting the month separately
                    udt.period = 'M';
            }
        }
        if(mddt.length>6){
            udt = new Date(mddt.substr(0, 4) + '-' + mddt.substr(4, 2) + '-' + mddt.substr(6,2) + ' UTC');  //better validation than just setting the year, month and day separately
            udt.period = 'D';
            if(mddt.length>8){
                udt.period = 'H';
                udt.setUTCHours(mddt.substr(9,2));
                udt.setUTCMinutes(mddt.substr(12,2));
                udt.setUTCSeconds(mddt.substr(15,2));
            }
        }
        return udt
    },

    dateConversionData: function dateConversionData(series){
    //if end is not specified, this year is used.
    //if start is not specified, a 10 year interval  is used
        var key=series.sourcekey, jsStart=false, jsEnd=false, period = MashableData.globals.period;
        if(series.firstdt) jsStart = new Date(parseInt(series.firstdt));
        if(series.lastdt) jsEnd = new Date(parseInt(series.lastdt));
        var data = [], altStart;
        var oneDay = 24*60*60*1000; // hours*minutes*seconds*milliseconds
        var today = new Date();
        var mashableDate = this.mashableDate;
        switch(key.toUpperCase()){ //time series: apiid = 7; root catid = 382243
            case "DAYSPERMONTH": //setid = 1
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
                    data.push(mashableDate(jsStart.getTime(), 'M') + ':' +  Math.round(Math.abs(jsStart.getTime() - jsStart.setUTCMonth(jsStart.getUTCMonth()+1))/oneDay));
                }
                break;
            case "DAYSPERQUARTER":  //setid = 2
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
                    data.push(mashableDate(jsStart.getTime(), 'Q') + ':' +  Math.round(Math.abs(jsStart.getTime() - jsStart.setUTCMonth(jsStart.getUTCMonth()+3))/oneDay));
                }
                break;
            case "DAYSPERYEAR":  //setid=3
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
                    data.push(mashableDate(jsStart.getTime(), 'A') + ':' +  Math.round(Math.abs(jsStart.getTime() - jsStart.setUTCFullYear(jsStart.getUTCFullYear()+1))/period.value.D));
                }
                break;
        }
        series.data = data; //already parsed!
        return data;
    },

    selectDownshift: function selectDownshift(graph, fdown, plot, callback){
        var i, asset;
        var html = '<div id="downshiftWizard" style="width:600px;">'  //TODO: CSS entries
            +   '<h4>Frequency Shifting:</h4>';
        if(fdown) html += 'You have selected to have the plot recalculated as <b></b>'+period.name[fdown]+'</b>.  Please select the method and treatment of missing and null values.<br>';
        else html += 'You have requested to mash series with different frequencies.  This will require first recalculating the series data having a shorter reporting period to a common longer period.  Please confirm by selecting the algorithm and the treatment of missing and null values.<br>';
        html += '<br>Component series that must be recalculated:'
            + '<ol>';
        plot.eachComponent(function(){
            html += '<li><b>'+this.name()+'</b> ('+this.units+') '+common.period.name[fdown=='A'&&(this.freqset.indexOf(Q)==-1?'Q':'M')]+'</li>';
        });
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
    },

    downShiftData: function downShiftData(asset, fdown, algorithm, missing){
        var period = MashableData.globals.period;
        //algorithm = [sum|wavg] *required
        //not programmed for require all points|missing/null as zero|impute null/missing
        if(period.value[fdown]==period.value[asset.freq]) return asset.data;
        if(period.value[fdown]<period.value[asset.freq] || (fdown!='A'&&fdown!='Q') || period.value[asset.freq]<period.value['M']) throw('unable to change data frequency from '+period.name[asset.freq]+' to '+period.name[fdown]);
        //real down-shift work begins...

        //1.  chunk input into output period sized arrays
        var aData = asset.data.split('|'), newData=[], bin=[],
            lengthInMonths = (fdown=='Q'?3:12),  //can downshift to only annual or quarterly
            lengthAssetPeriod = asset.freq=='M'?1:3, //can downshift from only monthly or quarterly
            periodsStartDate=false,
            mdDate, point, pointDate;

        for(var i=0;i<aData.length;i++){
            point = aData[i].split(':');
            pointDate = this.dateFromMdDate(point[0]);
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
            var subPeriodDays, valueDays=0, missingDays=0, missingPeriods=0, newY= 0;
            mdDate = MashableData.common.mashableDate(periodsStartDate.getTime(), fdown);
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
            return mdDate + ':' + (algorithm=='wavg'?newY/valueDays:newY);
        }
    },

    rationalize: function rationalize(value){ //fixes rounding errors introduced by floating point operations
        if(Math.log(Math.abs(value))>-13) return  Math.round(value * Math.pow(10,10)) / Math.pow(10,10); else return value;
    },

    equivalentRGBA: function equivalentRGBA(hexColor, alpha){
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
    },

    addBreaks: function addBreaks(seriesData, freq){ //adds null to create line breaks to periodic statistical data which is missing periods
        var data = seriesData.slice(0); //make a copy
        data.sort(function(a,b){return a[0]-b[0]});
        var oData = [];
        if(data.length>0) oData.push([data[0][0], data[0][1]]);  //oData.push({x: data[0][0], y: data[0][1], marker: {enabled: (data.length==1)}});
        var interval;
        switch(freq){
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
                switch(freq){
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
    },

    callApi: function callApi(params, callBack){ //modal waiting screen is shown by default. params.modal option can modify this behavior
        var data, embed = MashableData.globals.isEmbedded, callStartTime = new Date();
        if(embed){
            data = $.extend({uid: false, host: window.location.host}, params)
        } else {
            data = $.extend({uid: getUserId(), v: MashableData.globals.version, accessToken: account.info.accessToken}, params)
        }
        if(!embed && params.modal!='none') mask();
        $.ajax({
            type: embed?'GET':'POST', //IE only allows GET vars for CORS
            url: embed?"//www.mashabledata.com/graph_data/":"api.php",
            encoding:"UTF-8",
            cache: false,
            data: data,
            dataType: 'json',
            success: function(jsoData, textStatus, jqXHR){
                if(MashableData.globals.isDev) console.info(jsoData);
                if(jsoData.status=="ok"){
                    if(!embed){
                        globals.totalServerTime += parseFloat(jsoData.exec_time);
                        if(jsoData.msg) dialogShow('', jsoData.msg);
                        var callEndTime = new Date();
                        console.info(params.command+': '+jsoData.exec_time+' (total server time: '+globals.totalServerTime+'ms); roundtrip: '+ (callEndTime.getTime()-callStartTime.getTime()) +'ms; '+JSON.stringify(jsoData).length/1000+'kb');
                    }
                    if(callBack) callBack(jsoData, textStatus, jqXHR);
                    if(params.modal!='persist' && !embed) unmask();
                } else {
                    if(embed){
                        return jsoData.status;
                    } else {
                        unmask();
                        dialogShow('Connected to server, but the command failed.', jsoData.status+'<br><br>If this is a system error and continues to occur, please email <a href="mailto:support@mashabledata.com">support@mashabledata.com</a>.');
                    }
                }
            },
            error: function(jqXHR, textStatus, errorThrown){
                console.log(textStatus);
                console.log(jqXHR);
                if(embed){
                    return "A system error occurred while trying to connect to the MashableData servers.  Please try again later";
                } else {
                    unmask();
                    dialogShow(textStatus, "A system error occurred while trying to connect to the server.  Check your internet connectivity and try again later.");
                }
            }
        });
    },
    setFactory: function(recordset){
        var newSets = [];
        for(var i=0;i<recordset.length;i++){
            newSets.push(new MashableData.Set(recordset[i]));
        }
        return newSets;
    },
    placeName: function(setName, seriesName){
        var setWords = setName.split(' '), position;
        var placeName  = ' '+seriesName+' ';
        for(var i=0;i<setWords.length;i++){
            if(setWords[i].length){
                while(-1 != (position = placeName.indexOf(' '+setWords[i]+' '))){
                    placeName = placeName.substr(0,position) + placeName.substr(position+setWords[i].length+1);
                }
            }
        }
        return placeName.trim();
    },
    extactCategoryNamesTitle: function (components){ //returns an array of the unique word cores from the series' names, stripping off common words from the beginning and ends of the string
        var i, nonNullSeries, categories;
        //create the local list
        for(i in components){
            if(components[i].setname) {
                components[i].category = components[i].setname.split(' ');
                nonNullSeries = components[i].setname.split(' ');
            }
        }
        var titleStartWords = _removeCommonStartWords();
        _reverse(); //reverse order so we can from common words from the end of the series name
        var titleEndWords = _removeCommonStartWords();
        _reverse(true);  //reverse again = normal order and rejoin array into a string
        var title = titleStartWords.concat(titleEndWords.reverse()).join(' ');
        return title;

        function _removeCommonStartWords(){
            var s, word, isCommon, titleWords = [];
            while(nonNullSeries.length){
                word = nonNullSeries[0];
                isCommon = true;
                for(i in components){
                    if(components[i].category && components[i].category[0]!=word) {
                        isCommon = false;
                        break;
                    }
                }
                if(isCommon){
                    titleWords.push(word);
                    for(i in components){
                        if(components[i].category) components[i].category.shift();
                    }
                } else {
                    break;
                }
            }
            return titleWords;
        }
        function _reverse(rejoinToString){
            for(i in components){
                if(components[i].category){
                    components[i].category.reverse();
                    if(rejoinToString) components[i].category = components[i].category.join(' ');
                }
            }
        }
    }
};



