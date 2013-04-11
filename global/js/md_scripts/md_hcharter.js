/*MashableData Plugin for Highcharts  Copyright 2012.  All rights reserved.  Visit MashableData.com for usage guidelines.
 jQuery.js, Highcharts.js and Highcharts' export.js must be loaded first
 */



// Add ECMA262-5 Array methods if not supported natively
//  indexOf not native to IE8
if (!('indexOf' in Array.prototype)) {
    Array.prototype.indexOf= function(find, i /*opt*/) {
        if (i===undefined) i= 0;
        if (i<0) i+= this.length;
        if (i<0) i= 0;
        for (var n= this.length; i<n; i++)
            if (i in this && this[i]===find)
                return i;
        return -1;
    };
}

window.MashableData = { //mashableData namespace
    version: "0.1",
    isMashableDefault: true, //default site setting.  May my overridden on a per page, per chart or per charted series basis as follows:
    //Setting chart.isMashable = false; overrides the defaultMashableDataSharing setting
    //Setting chart.series[x].isMashable = true;  overrides both the chart level and the global MashableDataSharing setting
    iframeLoaded: false,
    iframeRequested: false, //plumbing along with function md_iframe_load() to make sure message don't get sent before the iFrame is ready.
    aMsg: [],  //if md_secure_xfer iFrame not ready, msg stored here instead of being posted. iFrame onload event fires md_iframe_load() which then post the satores messages
    recentsKey: null,
    bookmarksKey: null,
    bookmarks: [],
    recents: [],
    series: {},
    regDQuotes: /"/g, //by including her, the regex is compiled only once
    iframe_load: function (){  //post any backlogged messages and indicate state
        var mdFrame = document.getElementById("md_secure_xfer").contentWindow; //document.getElementById("md_frame_holder");
        this.iframe_loaded = true; //global variable to indicate state
        for(var i=0;i<MashableData.aMsg.length;i++){
            mdFrame.postMessage(MashableData.aMsg[i], 'http://www.mashabledata.com/secure_xfer.php');
        }
    },
    calcSeriesInfo:  function(PointArray){
        var oSereiesInfo = {
            minDate: null,
            maxDate: null,
            minValue: null,
            maxValue: null,
            perodicity: 'A'
        };
        var dayOfMonth = null;
        var dayOfWeek = null;
        var monthOfYear = null;
        var timeOfDay = null;

        for(var pointIndex in PointArray){
            //console.info(pointIndex);
            var thisPoint = PointArray[pointIndex];
            if(oSereiesInfo.minDate == null || oSereiesInfo.minDate > thisPoint.x) {oSereiesInfo.minDate = thisPoint.x}
            if(oSereiesInfo.maxDate == null || oSereiesInfo.maxDate < thisPoint.x) {oSereiesInfo.maxDate = thisPoint.x}
            if(oSereiesInfo.minValue == null || oSereiesInfo.minValue > thisPoint.y) {oSereiesInfo.minValue = thisPoint.y}
            if(oSereiesInfo.maxValue == null || oSereiesInfo.maxValue < thisPoint.x) {oSereiesInfo.maxValue = thisPoint.y}
            var xDateTime = new Date(thisPoint.x);
            //console.info(xDateTime);
            if(timeOfDay == null){timeOfDay = xDateTime.getUTCHours() + ":" +  xDateTime.getUTCMinutes() + ":" +  xDateTime.getUTCSeconds() + "." + xDateTime.getUTCMilliseconds()}
            else if(timeOfDay !== true && timeOfDay != xDateTime.getUTCHours() + ":" +  xDateTime.getUTCMinutes() + ":" +  xDateTime.getUTCSeconds() + "." + xDateTime.getUTCMilliseconds()){timeOfDay = true}
            if(dayOfMonth == null){dayOfMonth = xDateTime.getUTCDate()}
            else if(dayOfMonth !== true && dayOfMonth != xDateTime.getUTCDate()){dayOfMonth = true}
            if(dayOfWeek == null){dayOfWeek = xDateTime.getUTCDay()}
            else if(dayOfWeek !== true && dayOfWeek != xDateTime.getUTCDay()){dayOfWeek = true}
            if(monthOfYear == null){monthOfYear = xDateTime.getUTCMonth()}
            else if(monthOfYear !== true && monthOfYear != xDateTime.getUTCMonth()){monthOfYear = true}
        }
        /*
         console.info("timeOfDay: " + timeOfDay);
         console.info("dayOfWeek: " + dayOfWeek);
         console.info(dayOfWeek !== true);
         console.info("monthOfYear: " + monthOfYear);
         console.info("dayOfMonth: " + dayOfMonth);
         */
        if(timeOfDay === true) {oSereiesInfo.perodicity = 'T'}
        else if(dayOfWeek !== true) {oSereiesInfo.perodicity = 'W'}
        else if(dayOfMonth === true) {oSereiesInfo.perodicity = 'D'}
        else if(monthOfYear === true) {oSereiesInfo.perodicity = 'M'}
        else {oSereiesInfo.perodicity = 'A'}
        oSereiesInfo.from = MashableData.formatDateByPeriod(oSereiesInfo.minDate, oSereiesInfo.perodicity);
        oSereiesInfo.to = MashableData.formatDateByPeriod(oSereiesInfo.maxDate, oSereiesInfo.perodicity);
        return oSereiesInfo
    },
    storeChartSeries: function(thischart){
        var i, j, thisSerie, serie, lsKey, recents, bookmarks, idxRecent, idxBookmark, poppedKey, isMashable;
        recents = JSON.parse(localStorage.recents||'[]');
        bookmarks = JSON.parse(localStorage.bookmarks||'[]');

        if(localStorage.getItem('md_authorized')=='N') return false;
        for(i=0;i<thischart.series.length;i++){
            thisSerie = thischart.series[i];
            if(thisSerie.xAxis.options.type=='datetime'){ //only mash datetime series
                if(typeof thisSerie.options.isMashable!='undefined'){
                    isMashable = thisSerie.options.isMashable;
                } else {
                    if(typeof thischart.options.isMashable!='undefined'){
                        isMashable = thischart.options.isMashable;
                    } else {
                        isMashable = this.isMashableDefault;
                    }
                }
                if(isMashable){
                    serie = MashableData.calcSeriesInfo(thisSerie.data);
                    serie.data = [];
                    for(j=0;j<thisSerie.data.length;j++){
                        serie.data.push([thisSerie.data[j].x,thisSerie.data[j].y])
                    }
                    serie.name = thisSerie.name||'untitled series';
                    serie.description = thisSerie.description;
                    serie.skey = thisSerie.skey;
                    serie.graph = (thischart.options.title&&thischart.options.title.text)?thischart.options.title.text:'';
                    serie.credit = (thischart.options.credits&&thischart.options.credits.text)?thischart.options.credits.text:null;
                    serie.url = window.location.href;
                    serie.units = thisSerie.units || (thisSerie.yAxis.options.title?thisSerie.yAxis.options.title.text:'');
                    serie.viewed = (new Date()).getTime();

                    /*var dataPortion = "";
                     for(var datapoint in thisSeries.data){
                     var xDate = new Date(thisSeries.data[datapoint].x);
                     switch(seriesInfo.perodicity){
                     case 'A':
                     dataPortion += ("||" + xDate.getUTCFullYear() + "|" + thisSeries.data[datapoint].y);
                     break;
                     case 'W':
                     case 'D':
                     dataPortion += ("||" + xDate.getUTCFullYear() + ((xDate.getUTCMonth()<=9)?"0":"") + xDate.getUTCMonth() + ((xDate.getUTCDate()<=9)?"0":"") + xDate.getUTCDate() + "|" + thisSeries.data[datapoint].y);
                     break;
                     case 'M':
                     case 'Q':
                     case 'SA':
                     dataPortion += ("||" + xDate.getUTCFullYear() + ((xDate.getUTCMonth()<=9)?"0":"") + xDate.getUTCMonth() + "|" + thisSeries.data[datapoint].y);
                     break;
                     case 'N':
                     dataPortion += ("||" + xDate.getUTCFullYear() + ((xDate.getUTCMonth()<=9)?"0":"") + xDate.getUTCMonth() + ((xDate.getUTCDate()<=9)?"0":"") + xDate.getUTCDate() + " " + xDate.getUTCHours() + ":" + xDate.getUTCHours() + ":" + xDate.getUTCMinutes() + "|" + thisSeries.data[datapoint].y);
                     break;
                     }
                     }*/
                    lsKey = serie.skey || (serie.name + '|' + serie.units);
                    //get recents and bookmark arrays from localStrage
                    recents = localStorage.recents;
                    if(recents) recents = JSON.parse(recents); else recents = [];
                    bookmarks = localStorage.bookmarks;
                    if(bookmarks) bookmarks = JSON.parse(bookmarks); else bookmarks = [];
                    //check if exists and react accordingly
                    idxRecent = recents.indexOf(lsKey);
                    idxBookmark = bookmarks.indexOf(lsKey);
                    if(idxBookmark>0){ //move the bookmark to the top as the bookmarked series was just reviewed
                        thisSerie.bookmark = (new Date()).getTime();
                        bookmarks.splice(idxBookmark,1);  //move from current location ...
                        bookmarks.unshift(lsKey); //...to the top
                    }
                    if(idxRecent>=0) recents.splice(idxRecent,1); //remove it from the middle if it existed
                    recents.unshift(lsKey); //add it to the top
                    localStorage.setItem(lsKey, JSON.stringify(serie));
                }
            }
        }
        while(recents.length>99){ //pop excess keys/series
            poppedKey = recents.pop();
            if(bookmarks.indexOf(poppedKey)==-1) localStorage.removeItem(poppedKey); //remove the corresponding series if not bookmarked
        }
        localStorage.recents = JSON.stringify(recents);
        localStorage.bookmarks = JSON.stringify(bookmarks);
    },
    postSeries: function(serie){
        if(!MashableData.iframeRequested) {  //add the iFrame is not already added
            $('body').append('<div id="md_frame_holder" style="display:none"><iframe id="md_secure_xfer" onload="MashableData.iframe_load()" src="http://www.mashabledata.com/secure_xfer.php"></iframe></div>');
            MashableData.iframeRequested = true;
        }
        if(MashableData.iframeLoaded){
            var mdFrame = document.getElementById("md_secure_xfer").contentWindow;
            if(md_iframe_loaded){ // this handles slow iFrame loads.  If not loaded, than store message until md_iframe_load fires
                mdFrame.postMessage(JSON.stringify(serie), 'http://www.mashabledata.com/secure_xfer.php');
            } else {
                MashableData.aMsg.push(JSON.stringify(serie))
            }
        }
    },
    loadAllSeries: function(){
        var i;
        if(this.recentsKey!=localStorage.recents){
            this.recentsKey = localStorage.recents;
            this.recents = JSON.parse(this.recentsKey);
            for(i=0;i<this.recents.length;i++){
                if(!this.series[this.recents[i]]) this.series[this.recents[i]] = JSON.parse(localStorage.getItem(this.recents[i]));
            }
        }

        if(this.bookmarksKey!=localStorage.bookmarks){
            this.bookmarksKey = localStorage.bookmarks;
            this.bookmarks = JSON.parse(this.bookmarksKey);
            for(i=0;i<this.bookmarks.length;i++){
                if(!this.series[this.bookmarks[i]]) {
                    this.series[this.bookmarks[i]] = JSON.parse(localStorage.getItem(this.bookmarks[i]));
                    this.series[this.bookmarks[i]].name = this.series[this.bookmarks[i]].name.replace(this.regDQuotes, '&quot;');
                    this.series[this.bookmarks[i]].units = this.series[this.bookmarks[i]].units.replace(this.regDQuotes, '&quot;');
                }
            }
        }
    },
    bookmarkSeries: function(key){
        this.series[key].bookmark = (new Date()).getTime();
        this.series[key].isDirty = true;
    },
    unBookmarkSeries: function(key){
        MashableData.bookmarks.splice(MashableData.bookmarks.indexOf(key),1);
        delete this.series[key].bookmark;
        this.series[key].isDirty = true;
    },
    showPanel: function(chart){
        $('#mashabledata_panel').remove();  //get rid of any open panels
        this.loadAllSeries();

        //from the old md_charter.js:
        /*var chartWidth = chart.chartWidth;
         var chartHeight = chart.chartHeight;
         var containID = chart.container.id;
         var fudgeFactor = 10; //don't know why this is needed
         var theme = Highcharts.getOptions();
         var y = theme.exporting.buttons.exportButton.y;
         y=10;
         var right = - theme.exporting.buttons.exportButton.x;
         */
        var $panel, self=this, html = '<div id="mashabledata_panel">'
            + 'Charting Toolbox:'
            + ((chart.options.exporting&&chart.options.exporting.enable!==false)?'<button id="mashabledata_print">print chart</button><span id="mashabledata_dlform"><select><option value="PNG">PNG</option><option value="image/jpeg">JPG</option><option value="application/pdf">PDF</option><option value="image/svg+xml">SVG</option></select><button id="mashabledata_download">download chart</button></span>':'')
            + '<div id="mashabledata_tabs">'
            +   '<ol><li class="mashabledata_active"><a data="#mashabledata_recents">recent<span id="mashabledata_rinfo">('+this.recents.length+')</span></a></li><li><a data="#mashabledata_bookmarks">bookmarked<span id="mashabledata_binfo">('+this.bookmarks.length+')</span></a></li></ol>'
            +   '<input class="mashabledata_inputmsg" value="type here to filter series">'
            +   '<div id="mashabledata_recents">'
            +     '<table><tr><th class="mashabledata_cell_check"></th><th class="mashabledata_cell_bookmark"></th><th class="mashabledata_cell_name">name</th><th class="mashabledata_cell_units">units</th><th class="mashabledata_cell_f">f</th><th class="mashabledata_cell_from">from</th><th class="mashabledata_cell_to">to</th><th class="mashabledata_cell_viewed">viewed</th><th class="mashabledata_cell_url">url</th></tr></table>'
            +     '<div class="mashabledata_scroll"><table>'+this.makeRows(this.recents)+'</table></div>'
            +   '</div>'
            +   '<div id="mashabledata_bookmarks">'
            +     '<table><tr><th class="mashabledata_cell_check"></th><th class="mashabledata_cell_bookmark"></th><th class="mashabledata_cell_name">name</th><th class="mashabledata_cell_units">units</th><th class="mashabledata_cell_f">f</th><th class="mashabledata_cell_from">from</th><th class="mashabledata_cell_to">to</th><th class="mashabledata_cell_viewed">viewed</th><th class="mashabledata_cell_url">url</th></tr></table>'
            +     '<div class="mashabledata_scroll"><table>'+this.makeRows(this.bookmarks)+'</table></div>'
            +   '</div>'
            +   '<label><input type="radio" name="mashabledata_action" class="mashabledata_action" value="chart">add series to chart</label>'
            +   '<label><input type="radio" name="mashabledata_action" class="mashabledata_action" value="md">open with MashableData.com</label>'
            +   '<button id="mashabledata_ok">ok</button>'
            +   '<button id="mashabledata_cancel">cancel</button>'
            + '</div>'
            + '</div>';
        $panel = $(html).appendTo(chart.container);
        //events of control from ordered as displayed (top to bottom)
        $panel.find('#mashabledata_print').click(function(){ //print
            chart.print();
        });
        $panel.find('#mashabledata_download').click(function(){  //download
            var type = $panel.find('select').val();
            if(type=='PNG') chart.exportChart(); else chart.exportChart({type: type});
        });
        $panel.find('input.mashabledata_inputmsg')  //search box
            .focus(function(){
                $(this).removeClass('mashabledata_inputmsg');
            })
            .keyup(function(){
                var table, visible, keyWords = $(this).val();
                //filter recents table
                table = $panel.find('#mashabledata_recents div.mashabledata_scroll table');
                visible = self.searchTable(table, keyWords); //TODO:  convert search to ANDed key-word search from key-phrase search
                if(table.rows.length==visible){
                    $panel.find('#mashabledata_rinfo').html('('+visible+')');
                } else {
                    $panel.find('#mashabledata_rinfo').html('('+visible+' of '+table.rows.length+')');
                }
                //filter bookmarks table
                table = $panel.find('#mashabledata_bookmarks div.mashabledata_scroll table');
                visible = self.searchTable(table, keyWords); //TODO:  convert search to ANDed key-word search from key-phrase search
                if(table.rows.length==visible){
                    $panel.find('#mashabledata_binfo').html('('+visible+')');
                } else {
                    $panel.find('#mashabledata_binfo').html('('+visible+' of '+table.rows.length+')');
                }
            });
        $panel.find('input:checkbox').click(function(){
            ableOK();
        });
        function ableOK(){if($panel.find('input:checked').length>0) $('#mashabledata_ok').attr('disabled','disabled'); else $('#mashabledata_ok').removeAttr('disabled');}
        ableOK(); //initial
        $panel.find('ol a').click(function(){  //tabs
            $panel.find('#mashabledata_recents, #mashabledata_bookmarks').hide();
            $panel.find($(this).attr('data')).show();
        });
        $panel.find('th')  //table column sorts
            .wrapInner('<span title="sort this column"/>')
            .each(function(){
                var $th = $(this), thIndex = $th.index(), inverse = false;
                $th.click(function(){
                    var table = $th.closest('div').find('div.mashabledata_scroll table');
                    table.find('td').filter(function(){
                        return $(this).index() === thIndex;
                    }).sortElements(function(a, b){
                            if( $.text([a]) == $.text([b]) )
                                return 0;
                            return $.text([a]) > $.text([b]) ?
                                inverse ? -1 : 1
                                : inverse ? 1 : -1;
                        }, function(){
                            // parentNode is the element we want to move
                            return this.parentNode;
                        });
                    inverse = !inverse;
                });
            }
        );
        $panel.find('td.mashabledata_cell_bookmark span').click(function(){
            var key = $(this).closest('tr').find('td.mashabledata_cell_check').attr('data');
            if(self.series[key]){
                if(self.series[key].bookmark) { //could have been deselected from either panel
                    self.unBookmarkSeries(key);
                    $panel.find('#mashabledata_bookmarks div.mashabledata_scroll td.mashabledata_cell_check[data=\''+key+'\'').remove();
                    $panel.find('#mashabledata_recents div.mashabledata_scroll td.mashabledata_cell_check[data=\''+key+'\'').addClass('mashabledata_nostar').removeClass('mashabledata_star');
                } else { //must have been clicked in the recents panel
                    self.bookmarkSeries(key);
                    $(this).addClass('mashabledata_star').removeClass('mashabledata_nostar');
                    $(this).closest('tr').clone(true,true).prependTo($panel.find('#mashabledata_bookmarks div.mashabledata_scroll table'));
                }
            }
        });
        $panel.find('#mashabledata_ok').click(function(){
            //1. save what needs to be saved
            for(var key in self.series){
                if(self.series[key].isDirty){
                    if(self.bookmarks.indexOf(key)+self.recents.indexOf(key)==-1){
                        localStorage.removeItem(key);
                    } else {
                        delete self.series[key].isDirty;
                        localStorage.setItem(key, JSON.stringify(self.series[key]));
                    }
                }
            }
            localStorage.recents = JSON.stringify(recents);
            localStorage.bookmarks = JSON.stringify(bookmarks);

            //make array of checked keys
            var checkedKeys = [], series, y;
            $panel.find('input:checked').each(function(){
                key = $(this).attr('data');
                if(checkedKeys.indexOf(key)==-1) checkedKeys.push(key);  //avoid double counting from recents + bookmarks
            });

            if($panel.find('input.mashabledata_action').val()=='chart'){
                //2. if graph, add / remove series from chart
                //2A. first remove
                for(var i=0;i<chart.series.length;i++){
                    if(chart.series[i].options.mash && checkedKeys.indexOf(chart.series[i].options.id)==-1) chart.series[i].remove();
                }
                //2B. now add
                for(i=0;i<checkedKeys.length;i++){
                    if(!chart.get(checkedKeys[i])){
                        series = self.series[checkedKeys[i]];
                        for(y=0;y<chart.yAxis.length;y++){ //check for and add y-axis if necessary
                            if(series.units == chart.yAxis[y].title.text || 'values') break;
                        }
                        if(y==chart.yAxis.length){ //not found (no break) therefore add new yAxis
                            chart.addAxis({
                                id: (series.units || 'values') +'-axis',
                                title: {
                                    text: series.units || 'values'
                                }
                            });
                        }
                        chart.addSeries({
                            name: series.name,
                            data: series.data,
                            mash: true,
                            id: checkedKeys[i],
                            yAxis: y
                        });
                    }
                }
                //3. remove any unused yAxis
                for(y=chart.yAxis.length-1;y>=0;y--){ //check for and add y-axis not have not series
                    if(chart.yAxis[y].series.length==0) chart.yAxis[y].remove();
                }

            } else {
                //3. if MD, post checked series and open in new page
                for(i=0;i<checkedKeys.length;i++){
                    self.postSeries(self.series[checkedKeys[i]]);
                }
            }
        });
        $panel.find('#mashabledata_cancel').click(function(){
            $panel.remove();
        });

    },
    makeRows: function(aryKeys){
        var i, series, rows = '';
        for(i=0;i<aryKeys.length;i++){
            series = this.series[aryKeys[i]];
            rows += '<tr><td class="mashabledata_cell_check"><input type="checkbox" data="'+aryKeys[i]+'"'+(series.checked?' checked':'')+'></td>'
                + '<td class="mashabledata_cell_bookmark"><span class="'+(series.bookmark?'mashabledata_star':'mashabledata_nostar')+'"></span></td>'
                + '<td class="mashabledata_cell_name" title="'+series.name+'">'+series.name+'</td>'
                + '<td class="mashabledata_cell_units" title="'+series.units+'">'+series.units+'</td>'
                + '<td class="mashabledata_cell_f">'+series.perodicity+'</td>'
                + '<td class="mashabledata_cell_from" >'+series.from+'</td>'
                + '<td class="mashabledata_cell_to">'+series.to+'</td>'
                + '<td class="mashabledata_cell_viewed" title="'+series.viewed+'">'+series.viewed+'</td>'
                + '<td class="mashabledata_cell_url" title="'+series.url+'"><a href="'+series.url+'">'+series.url.substr(series.url.substr(8).indexOf('/'))+'</a></td></tr>';
        }
        return rows;
    },
    searchTable: function(table, inputVal){
        var allCells, found, regExp, visibleCount = 0;
        table.find('tr').each(function(index, row)
        {
            allCells = $(row).find('td');
            if(allCells.length > 0)
            {
                found = false;
                allCells.each(function(index, td)
                {
                    regExp = new RegExp(inputVal, 'i');
                    if(regExp.test($(td).text()))
                    {
                        found = true;
                        return false;
                    }
                });
                if(found == true){
                    $(row).show();
                    visibleCount++;
                } else $(row).hide();
            }
        });
        return visibleCount;
    },
    formatDateByPeriod: function(val, period) { //helper function for the data tables
        if(isNaN(val)==false) {
            var dt = new Date(parseInt(val));
            switch(period){
                case 'A': return dt.getUTCFullYear();
                case 'Q': return ('Q'+ parseInt((dt.getUTCMonth()+3)/3) +' '+ dt.getUTCFullYear());
                case 'SA':
                case 'M': return dt.toUTCString().substr(8,8);
                case 'W':
                case 'D': return dt.toUTCString().substr(5,11);
                default: return dt.toUTCString().substr(5,20);
            }
        }
        else
        {
            return null;
        }
    }
};


$(document).ready(function(){
    if(Highcharts){
        var btnHeight = 20;
        var btnsWidth = 24;
        var btnsX = 10;
        var btnsY = 10;
        var currentTheme =  Highcharts.setOptions({});
        var mashableDataHcTheme = {
            chart: {
                events: {
                    load: function(){
                        window.MashableData.storeChartSeries(this);
                    }
                }
            },
            exporting: {
                buttons:{
                    contextButton: {
                        enabled: true,
                        menuItems: null,
                        onclick:  function() {
                            window.MashableData.showPanel(this);
                        },
                        text: 'tools',
                        symbol: 'gear'
                    }
                }
            }
        };

        var highchartsOptions = Highcharts.setOptions(mashableDataHcTheme);

        $.extend(Highcharts.Renderer.prototype.symbols, {
            gear: function() {
                var innerR =5;
                var outterR=7;
                var offset=11;
                var teeth=7;
                var i=0;
                var angle;
                gearCommands = ['M',offset,offset-outterR];
                for(i=0;i<teeth;i++){
                    angle = (2*Math.PI / teeth * i) + (2*Math.PI / (teeth*4));
                    gearCommands.push('L');
                    gearCommands.push(Math.sin(angle)*outterR + offset);
                    gearCommands.push(offset-Math.cos(angle)*outterR);
                    gearCommands.push('L');
                    gearCommands.push(Math.sin(angle)*innerR + offset);
                    gearCommands.push(offset-Math.cos(angle)*innerR);
                    angle = (2*Math.PI / teeth * i) + 3* (2*Math.PI / (teeth*4));
                    gearCommands.push('L');
                    gearCommands.push(Math.sin(angle)*innerR + offset);
                    gearCommands.push(offset-Math.cos(angle)*innerR);
                    gearCommands.push('L');
                    gearCommands.push(Math.sin(angle)*outterR + offset);
                    gearCommands.push(offset-Math.cos(angle)*outterR);
                }
                gearCommands.push('Z');
                return gearCommands;
            }
        });
    }
});


