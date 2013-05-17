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
/**
 * jQuery.fn.sortElements
 * --------------
 * @author James Padolsey (http://james.padolsey.com)
 * @version 0.11
 * @updated 18-MAR-2010
 * Dual licensed under the MIT and GPL licenses.
 */
jQuery.fn.sortElements = (function(){
    var sort = [].sort;
    return function(comparator, getSortable) {
        getSortable = getSortable || function(){return this;};
        var placements = this.map(function(){
            var sortElement = getSortable.call(this),
                parentNode = sortElement.parentNode,
            // Since the element itself will change position, we have
            // to have some way of storing it's original position in
            // the DOM. The easiest way is to have a 'flag' node:
                nextSibling = parentNode.insertBefore(
                    document.createTextNode(''),
                    sortElement.nextSibling
                );
            return function() {
                if (parentNode === this) {
                    throw new Error(
                        "You can't sort elements if any one is a descendant of another."
                    );
                }
                // Insert before flag:
                parentNode.insertBefore(this, nextSibling);
                // Remove flag:
                parentNode.removeChild(nextSibling);
            };
        });
        return sort.call(this, comparator).each(function(i){
            placements[i].call(getSortable.call(this));
        });
    };
})();

window.MashableData = { //mashableData namespace
    version: "0.3",
    isMashableDefault: true, //default site setting.  May my overridden on a per page, per chart or per charted series basis as follows:
    //Setting chart.isMashable = false; overrides the defaultMashableDataSharing setting
    //Setting chart.series[x].isMashable = true;  overrides both the chart level and the global MashableDataSharing setting
    iframeLoaded: false,
    iframeRequested: false, //plumbing along with function md_iframe_load() to make sure message don't get sent before the iFrame is ready.
    aMsg: [],  //if mashabledata_secure_xfer iFrame not ready, msg stored here instead of being posted. iFrame onload event fires md_iframe_load() which then post the satores messages
    recentsKey: null,
    bookmarksKey: null,
    bookmarks: [],
    recents: [],
    series: {},
    regDQuotes: /"/g, //by including her, the regex is compiled only once
    iframe_load: function (){  //post any backlogged messages and indicate state
        var mdFrame = document.getElementById("mashabledata_secure_xfer").contentWindow;
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
    storeChartSeries: function(thisChart){
        var i, j, thisSerie, serie, lsKey, recents, bookmarks, idxRecent, idxBookmark, oldSerieString, poppedKey, isMashable;
        if(localStorage.getItem('md_authorized')=='N') return false;
        var title = thisChart.options.title?thisChart.options.title.text||'':'';

        //get recents and bookmark arrays from localStrage
        recents = JSON.parse(localStorage.recents||'[]');
        bookmarks = JSON.parse(localStorage.bookmarks||'[]');
        for(i=0;i<thisChart.series.length;i++){
            thisSerie = thisChart.series[i];
            if(thisSerie.xAxis.options.type=='datetime'){ //only mash datetime series
                if(typeof thisSerie.options.isMashable!='undefined'){
                    isMashable = thisSerie.options.isMashable;
                } else {
                    if(typeof thisChart.options.isMashable!='undefined'){
                        isMashable = thisChart.options.isMashable;
                    } else {
                        isMashable = this.isMashableDefault;
                    }
                }
                if(isMashable&&(thisSerie.name ||(thisChart.title && thisChart.title.text&&thisChart.series.length==1) )){
                    serie = MashableData.calcSeriesInfo(thisSerie.data);
                    serie.data = [];
                    for(j=0;j<thisSerie.data.length;j++){
                        serie.data.push([thisSerie.data[j].x,thisSerie.data[j].y])
                    }
                    serie.name = thisSerie.fullName||(thisSerie.name?(title.length>0&&thisSerie.name.indexOf(title)==-1?title+': '+thisSerie.name:thisSerie.name):title);
                    serie.description = thisSerie.description;
                    serie.skey = thisSerie.skey;
                    serie.graph = (thisChart.options.title&&thisChart.options.title.text)?thisChart.options.title.text:'';
                    serie.credit = (thisChart.options.credits&&thisChart.options.credits.text)?thisChart.options.credits.text:null;
                    serie.url = window.location.href;
                    serie.units = thisSerie.units || (thisSerie.yAxis.options.title?thisSerie.yAxis.options.title.text||'':'');
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
                    lsKey = serie.skey || (serie.name + '|' + serie.units + '|' + serie.perodicity);
                    if(!serie.skey) serie.md_key = lsKey;
                    thisSerie.options.md_key = lsKey;  //store in chart object to be used to matched against table to fill check boxes
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
                    if(idxBookmark!=-1){
                        oldSerieString = localStorage.getItem(lsKey);
                        if (oldSerieString){
                            serie.bookmark = JSON.parse(oldSerieString).bookmark;
                        }
                    }
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
        if(!this.iframeRequested) {  //add the iFrame is not already added
            jQuery('body').append('<div id="md_frame_holder" style="display:none"><iframe id="mashabledata_secure_xfer" onload="MashableData.iframe_load()" src="http://www.mashabledata.com/secure_xfer.php"></iframe></div>');
            this.iframeRequested = true;
        }
        if(this.iframe_loaded){ // this handles slow iFrame loads.  If not loaded, than store message until md_iframe_load fires
            var mdFrame = document.getElementById("mashabledata_secure_xfer").contentWindow;
            mdFrame.postMessage(JSON.stringify(serie), 'http://www.mashabledata.com/secure_xfer.php');
        } else {
            this.aMsg.push(JSON.stringify(serie))
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
        var index =  this.bookmarks.indexOf(key);
        if(index!=-1) this.bookmarks.splice(index,1);
        this.bookmarks.unshift(key);
    },
    unBookmarkSeries: function(key){
        MashableData.bookmarks.splice(MashableData.bookmarks.indexOf(key),1);
        delete this.series[key].bookmark;
        var index =  this.bookmarks.indexOf(key);
        if(index!=-1) this.bookmarks.splice(index,1);
        if(this.recents.indexOf(key)==-1){
            delete this.series[key];
        }
        this.series[key].isDirty = true;
    },
    showPanel: function(chart){
        jQuery('#mashabledata_panel').remove();  //get rid of any open panels
        this.loadAllSeries();
        this.activeChart = chart;

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
            + '<h3>Charting Toolbox</h3>'
            //+ ((chart.options.exporting&&chart.options.exporting.enable!==false)?'<fieldset><legend>&nbsp;Download chart as file&nbsp;</legend><a class="mashabledata_png" data="image/png">PNG</a><a class="mashabledata_jpg" data="image/jpeg">JPG</a><a class="mashabledata_svg" data="image/svg+xml">SVG</a><a class="mashabledata_pdf" data="application/pdf">PDF</a></fieldset><button id="mashabledata_print">print chart</button>':'')
            + ((chart.options.exporting&&chart.options.exporting.enable!==false)?'<span>Download chart as: <a class="mashabledata_png" data="image/png">PNG</a><a class="mashabledata_jpg" data="image/jpeg">JPG</a><a class="mashabledata_svg" data="image/svg+xml">SVG</a><a class="mashabledata_pdf" data="application/pdf">PDF</a><button id="mashabledata_print">print chart</button></span>':'')
            + '<div id="mashabledata_tabs">'
            +   '<ol><li class="mashabledata_active mashabledata_recents"><a data="#mashabledata_recents">recent<span class="mashabledata_info">('+this.recents.length+')</span></a></li><li class="mashabledata_bookmarks"><a data="#mashabledata_bookmarks">bookmarks<span class="mashabledata_info">('+this.bookmarks.length+')</span></a></li></ol>'
            +   '<span><input class="mashabledata_inputmsg" value="type here to filter series"></span>'
            +   '<div id="mashabledata_recents">'
            +     '<table><tr><th class="mashabledata_cell_check"></th><th class="mashabledata_cell_bookmark"></th><th class="mashabledata_cell_name">name</th><th class="mashabledata_cell_units">units</th><th class="mashabledata_cell_f">f</th><th class="mashabledata_cell_from">from</th><th class="mashabledata_cell_to">to</th><th class="mashabledata_cell_viewed">viewed<span id="mashabledata_desc"></span></th><th class="mashabledata_cell_url">url</th></tr></table>'
            +     '<div class="mashabledata_scroll"><table>'+this.makeRows(this.recents)+'</table></div>'
            +   '</div>'
            +   '<div id="mashabledata_bookmarks">'
            +     '<table><tr><th class="mashabledata_cell_check"></th><th class="mashabledata_cell_bookmark"></th><th class="mashabledata_cell_name">name</th><th class="mashabledata_cell_units">units</th><th class="mashabledata_cell_f">f</th><th class="mashabledata_cell_from">from</th><th class="mashabledata_cell_to">to</th><th class="mashabledata_cell_viewed">viewed<span id="mashabledata_desc"></span></th><th class="mashabledata_cell_url">url</th></tr></table>'
            +     '<div class="mashabledata_scroll"><table>'+this.makeRows(this.bookmarks)+'</table></div>'
            +   '</div>'
            +   '<span class="mashabledata_these">applies to</span> <span id="mashabledata_check_all">check all</span> '
            +   '<label><input type="radio" name="mashabledata_action" class="mashabledata_action" value="chart" checked>update chart</label>'
            +   '<label><input type="radio" name="mashabledata_action" class="mashabledata_action" value="md">open in the MashableData.com Workbench</label>'
            +   '<button id="mashabledata_ok" disabled="disabled">ok</button>'
            +   '<button id="mashabledata_cancel">close</button>'
            + '</div>'
            + '</div>';
        $panel = jQuery(html).prependTo(chart.container);
        //events of control from ordered as displayed (top to bottom)
        $panel.find('').click(function(){ //print
            chart.print();
            closePanel();
        });
        $panel.find('a.mashableddata-jpg, a.mashableddata-svg, a.mashableddata-pdf, mashableddata-png').click(function(){  //download
            var type = jQuery(this).attr('data');
            if(type=='PNG') chart.exportChart(); else chart.exportChart({type: type});
            closePanel();
        });
        $panel.find('input.mashabledata_inputmsg')  //search box
            .click(function(){
                if(jQuery(this).hasClass('mashabledata_inputmsg')){
                    jQuery(this).removeClass('mashabledata_inputmsg').val('').focus();
                }
            })
            .keyup(function(){
                var table, visible, keyWords = jQuery(this).val();
                //filter recents table
                table = $panel.find('#mashabledata_recents div.mashabledata_scroll table');
                visible = self.searchTable(table, keyWords); //TODO:  convert search to ANDed key-word search from key-phrase search
                $panel.find('li.mashabledata_recents span').html('('+visible+(table[0].rows.length==visible?'':' of '+table[0].rows.length)+')');
                //filter bookmarks table
                table = $panel.find('#mashabledata_bookmarks div.mashabledata_scroll table');
                visible = self.searchTable(table, keyWords); //TODO:  convert search to ANDed key-word search from key-phrase search
                $panel.find('li.mashabledata_bookmarks span').html('('+visible+(table[0].rows.length==visible?'':' of '+table[0].rows.length)+')');
            });
        $panel.find('input:checkbox, input:radio').change(function(){
            jQuery('#mashabledata_ok').removeAttr('disabled');
        });
        $panel.find('ol a').click(function(){  //tabs
            $panel.find('ol li').removeClass('mashabledata_active');
            $panel.find('#mashabledata_recents, #mashabledata_bookmarks').hide();
            $panel.find(jQuery(this).closest('li').addClass('mashabledata_active').end().attr('data')).show();
        });
        $panel.find('th')  //table column sorts
            .attr('title', 'click to sort on this column')
            .each(function(){
                var $th = jQuery(this), thIndex = $th.index(), inverse = false;
                $th.click(function(){
                    var table = $th.closest('div').find('div.mashabledata_scroll table');
                    table.find('td').filter(function(){
                        return jQuery(this).index() === thIndex;
                    }).sortElements(function(a, b){
                            if( jQuery.text([a]) == jQuery.text([b]) )
                                return 0;
                            return jQuery.text([a]) > jQuery.text([b]) ?
                                inverse ? -1 : 1
                                : inverse ? 1 : -1;
                        }, function(){
                            // parentNode is the element we want to move
                            return this.parentNode;
                        });
                    $panel.find('.mashabledata_asc, .mashabledata_desc').remove();
                    $th.append('<span class="'+(inverse?'mashabledata_asc':'mashabledata_desc')+'"></span>')
                    inverse = !inverse;
                });
            }
        );
        $panel.find('td.mashabledata_cell_bookmark span').click(function(){
            var key = jQuery(this).closest('tr').find('input').attr('data');
            if(self.series[key]){
                if(self.series[key].bookmark) { //could have been deselected from either panel
                    self.unBookmarkSeries(key);
                    $panel.find('#mashabledata_bookmarks div.mashabledata_scroll input[data=\''+key+'\']').closest('tr').remove();
                    $panel.find('#mashabledata_recents div.mashabledata_scroll input[data=\''+key+'\']').closest('tr').find('td.mashabledata_cell_bookmark span').addClass('mashabledata_nostar').removeClass('mashabledata_star');
                } else { //must have been clicked in the recents panel
                    self.bookmarkSeries(key);
                    jQuery(this).addClass('mashabledata_star').removeClass('mashabledata_nostar');
                    $panel.find('#mashabledata_bookmarks div.mashabledata_scroll table').prepend(self.makeRows([key]));
                }
                //update the tab with the counts
                var $table = $panel.find('#mashabledata_bookmarks div.mashabledata_scroll table');
                var visible = $table.find('tr:visible').length;
                $panel.find('li.mashabledata_bookmarks span').html('('+visible+($table[0].rows.length==visible?'':' of '+$table[0].rows.length)+')');

                updateLocalStorage();
            }
        });
        $panel.find('#mashabledata_check_all').click(function(){
            if(this.innerHTML=='check all'){
                $panel.find('div>div:visible input:not(:checked)').each(function(){
                    this.checked = true;
                });
                this.innerHTML='uncheck all';
            } else {
                $panel.find('div>div:visible input:checked').each(function(){
                    this.checked = false;
                });
                this.innerHTML='check all';
            }
        });
        $panel.find('#mashabledata_ok').click(function(){
            //1.make array of checked keys
            var checkedKeys = [], series, y;
            $panel.find('table input:checked').each(function(){
                key = jQuery(this).attr('data');
                if(checkedKeys.indexOf(key)==-1) checkedKeys.push(key);  //avoid double counting from recents + bookmarks
            });

            if($panel.find('input:radio[name=mashabledata_action]:checked').val()=='chart'){
                //2. if graph, add / remove series from chart
                //2A. first remove
                for(var i=0;i<chart.series.length;i++){
                    if(chart.series[i].options.md_key && checkedKeys.indexOf(chart.series[i].options.md_key)==-1){
                        chart.series[i--].remove();  //need to backup one to account for the change in the series array
                    }
                }
                //2B. now add
                for(i=0;i<checkedKeys.length;i++){
                    if(!self.hasSeries(checkedKeys[i])){
                        series = self.series[checkedKeys[i]];
                        for(y=0;y<chart.yAxis.length;y++){ //check for and add y-axis if necessary
                            if((series.units || 'values') == chart.yAxis[y].options.title.text) break;
                        }
                        if(y==chart.yAxis.length){ //not found (no break) therefore add new yAxis
                            chart.addAxis({
                                title: {
                                    text: series.units || 'values'
                                }
                            });
                        }
                        chart.addSeries({
                            name: series.name,
                            data: series.data,
                            mash: true,
                            md_key: checkedKeys[i],
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
            closePanel();
        });
        $panel.find('#mashabledata_cancel').click(function(){
            closePanel();
        });
        function closePanel(){
            $panel.slideUp(function(){$panel.remove();});
        }
        jQuery('#mashabledata_recents th.mashabledata_cell_check').click();  //sort by most recently viewed
        function updateLocalStorage(){
            //save bookmark changes
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
            localStorage.recents = JSON.stringify(self.recents);
            localStorage.bookmarks = JSON.stringify(self.bookmarks);
        }
    },
    makeRows: function(aryKeys){
        var i, series, rows = '', now = new Date(), viewed, inChart;
        for(i=0;i<aryKeys.length;i++){
            series = this.series[aryKeys[i]];
            viewed = new Date(parseInt(series.viewed));
            inChart = this.hasSeries(aryKeys[i]);
            rows += '<tr><td class="mashabledata_cell_check"><input type="checkbox" data="'+aryKeys[i]+'"'+(inChart?' checked><span>a'+series.viewed+'</span>':'><span>b'+series.viewed+'</span>')+'</td>'
                + '<td class="mashabledata_cell_bookmark"><span class="'+(series.bookmark?'mashabledata_star':'mashabledata_nostar')+'"></span></td>'
                + '<td class="mashabledata_cell_name" title="'+series.name+'">'+series.name+'</td>'
                + '<td class="mashabledata_cell_units" title="'+series.units+'">'+series.units+'</td>'
                + '<td class="mashabledata_cell_f">'+series.perodicity+'</td>'
                + '<td class="mashabledata_cell_from" >'+series.from+'</td>'
                + '<td class="mashabledata_cell_to">'+series.to+'</td>'
                + '<td class="mashabledata_cell_viewed" title="'+viewed.toLocaleString()+'">'+(viewed.toLocaleDateString()==now.toLocaleDateString()?localeHM(viewed):viewed.toLocaleDateString())+'</td>'
                + '<td class="mashabledata_cell_url" title="'+series.url+'">'+(series.url==window.location.href?(inChart?'current chart':'current page'):series.url.substr(series.url.substr(8).indexOf('/')).anchor(series.url))+'</td></tr>';
        }
        return rows;
        function localeHM(dt){
            var localeTime = dt.toLocaleTimeString(), pos = localeTime.lastIndexOf(':');
            return localeTime.substr(0,pos)+localeTime.substr(pos+3);
        }
    },
    hasSeries: function(md_key){
        for(var i=0;i<this.activeChart.series.length;i++){
            if(this.activeChart.series[i].options.md_key==md_key) return true;
        }
        return false;
    },
    searchTable: function(table, inputVal){
        var allCells, searchText, found, regExp, visibleCount = 0;
        regExp = new RegExp(inputVal, 'i');
        table.find('tr').each(function(index, row)
        {
            searchText = row.cells[2].innerHTML + ' ' + row.cells[3].innerHTML;
            found = regExp.test(searchText);
            if(found == true){
                jQuery(row).show();
                visibleCount++;
            } else jQuery(row).hide();
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


jQuery(document).ready(function(){
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
                        symbol: 'gear',
                        symbolSize: 20,
                        symbolStrokeWidth: 1
                    }
                }
            }
        };

        var highchartsOptions = Highcharts.setOptions(mashableDataHcTheme);
        jQuery.extend(Highcharts.Renderer.prototype.symbols, {
            gear: function() {
//TODO: comment out calculations and return path as a string
                var innerR =7;
                var outterR=9;
                var offset=13;
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

