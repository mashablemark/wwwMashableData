/* mashabledata_embedtools.js

 MashableData Plugin for Highcharts  Copyright 2012.  All rights reserved.  Visit MashableData.com for usage guidelines.

 For embedded visualization, supporting libraries to be loaded before  mashabledata_embedtools.js:
 jQuery.js (required)
 Highcharts (optional)
 jQuery-UI (optional)

 */
//jquery.ie.cors.js copyright 2013 Allen Institute for Brain Science Licensed under the Apache License
(function( jQuery ) {
    if ( window.XDomainRequest ) {
        jQuery.ajaxTransport(function( s ) {
            if ( s.crossDomain && s.async ) {
                if ( s.timeout ) {
                    s.xdrTimeout = s.timeout;
                    delete s.timeout;
                }
                var xdr;
                return {
                    send: function( _, complete ) {
                        function callback( status, statusText, responses, responseHeaders ) {
                            xdr.onload = xdr.onerror = xdr.ontimeout = jQuery.noop;
                            xdr = undefined;
                            complete( status, statusText, responses, responseHeaders );
                        }
                        xdr = new window.XDomainRequest();
                        xdr.onload = function() {
                            callback( 200, "OK", { text: xdr.responseText }, "Content-Type: " + xdr.contentType );
                        };
                        xdr.onerror = function() {
                            callback( 404, "Not Found" );
                        };
                        xdr.onprogress = function() {};
                        if ( s.xdrTimeout ) {
                            xdr.ontimeout = function() {
                                callback( 0, "timeout" );
                            };
                            xdr.timeout = s.xdrTimeout;
                        }

                        xdr.open( s.type, s.url, true );
                        xdr.send( ( s.hasContent && s.data ) || null );
                    },
                    abort: function() {
                        if ( xdr ) {
                            xdr.onerror = jQuery.noop();
                            xdr.abort();
                        }
                    }
                };
            }
        });
    }
})( jQuery );

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
window.MashableData.plugin = function(){ //mashableData namespace
    var $ = jQuery, MD = MashableData, grapher = MD.grapher;
    var plugin_obj = {
        version: "0.5", //0.5 is a major upgrade, adding easily embeddable fully function MD visualizations on load
        //0.6
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
        seriesXferCount: 0,
        seriesXfered: 0,
        regDQuotes: /"/g, //by including here, the regex is compiled only once
        iframe_load: function (){  //post any backlogged messages and indicate state
            var mdFrame = document.getElementById("mashabledata_secure_xfer").contentWindow;
            this.iframe_loaded = true; //global variable to indicate state
            if (window.addEventListener){  //standard compliant browsers (Chrome, FireFire, Safari...)
                window.addEventListener('message', this.receiveReply, false);
            } else if (window.attachEvent){  //Internet Explorer
                window.attachEvent('message', this.receiveReply);
            }
            for(var i=0;i<MD.plugin.aMsg.length;i++){
                mdFrame.postMessage(MD.plugin.aMsg[i], 'https://www.mashabledata.com/secure_xfer.php');
            }
        },
        receiveReply: function(event){
            if(event.origin.toLowerCase().indexOf(".mashabledata.com")!=-1) MD.plugin.seriesXfered++;
            if(MD.plugin.seriesXfered == MD.plugin.seriesXferCount && MD.plugin.OKToNavigate) MD.plugin.navigate();
        },
        calcSeriesInfo:  function(PointArray){
            var oSereiesInfo = {
                firstdt: null,
                lastdt: null,
                minValue: null,
                maxValue: null,
                period: 'A'
            };
            var dayOfMonth = null;
            var dayOfWeek = null;
            var monthOfYear = null;
            var timeOfDay = null;
            var xDateTime, thisPoint ;
            for(var pointIndex in PointArray){
                //console.info(pointIndex);
                thisPoint = PointArray[pointIndex];
                if(oSereiesInfo.firstdt == null || oSereiesInfo.firstdt > thisPoint.x) {oSereiesInfo.firstdt = thisPoint.x}
                if(oSereiesInfo.lastdt == null || oSereiesInfo.lastdt < thisPoint.x) {oSereiesInfo.lastdt = thisPoint.x}
                if(oSereiesInfo.minValue == null || oSereiesInfo.minValue > thisPoint.y) {oSereiesInfo.minValue = thisPoint.y}
                if(oSereiesInfo.maxValue == null || oSereiesInfo.maxValue < thisPoint.x) {oSereiesInfo.maxValue = thisPoint.y}
                xDateTime = new Date(parseInt(thisPoint.x));
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
            if(timeOfDay === true) {oSereiesInfo.period = 'T'}
            else if(dayOfWeek !== true) {oSereiesInfo.period = 'W'}
            else if(dayOfMonth === true) {oSereiesInfo.period = 'D'}
            else if(monthOfYear === true) {oSereiesInfo.period = 'M'}
            else {oSereiesInfo.period = 'A'}
            return oSereiesInfo
        },
        storeChartSeries: function(thisChart){
            if(window.console&&window.console.time) window.console.time('storeChartSeries');
            var i, j, thisSerie, serie, lsKey, recents, bookmarks, idxRecent, idxBookmark, oldSerieString, poppedKey, isMashable;
            var timestamp = (new Date()).getTime();
            if(localStorage.getItem('md_authorized')=='N') return false;
            var title = thisChart.options.title?thisChart.options.title.text||'':'';

            //get recents and bookmark arrays from localStrage
            recents = JSON.parse(localStorage.md_recents||'[]');
            bookmarks = JSON.parse(localStorage.md_bookmarks||'[]');
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
                        serie = MD.plugin.calcSeriesInfo(thisSerie.data);
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
                        serie.save_dt = timestamp;

                        /*var dataPortion = "";
                         for(var datapoint in thisSeries.data){
                         var xDate = new Date(thisSeries.data[datapoint].x);
                         switch(seriesInfo.periodicity){
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
                        lsKey = serie.skey || (serie.name + '|' + serie.units + '|' + serie.period);
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
            localStorage.md_recents = JSON.stringify(recents);
            localStorage.md_bookmarks = JSON.stringify(bookmarks);
            if(window.console&&window.console.time) window.console.timeEnd('storeChartSeries');
        },
        postSeries: function(serie){
            if(!this.iframeRequested) {  //add the iFrame is not already added
                jQuery('body').append('<div id="md_frame_holder" style="display:none"><iframe id="mashabledata_secure_xfer" onload="MashableData.plugin.iframe_load()" src="https://www.mashabledata.com/secure_xfer.php"></iframe></div>');
                this.iframeRequested = true;
            }
            if(this.iframe_loaded){ // this handles the delay in loading the iFrame.  If not loaded, than store message until md_iframe_load fires
                var mdFrame = document.getElementById("mashabledata_secure_xfer").contentWindow;
                mdFrame.postMessage(JSON.stringify(serie), 'https://www.mashabledata.com/secure_xfer.php');
            } else {
                this.aMsg.push(JSON.stringify(serie))
            }
        },
        navigate: function(){window.location.href="../workbench"},
        loadAllSeries: function(){
            var i;
            if(this.recentsKey!=localStorage.md_recents){
                this.recentsKey = localStorage.md_recents;
                this.recents = JSON.parse(this.recentsKey);
                for(i=0;i<this.recents.length;i++){
                    if(!this.series[this.recents[i]]) this.series[this.recents[i]] = JSON.parse(localStorage.getItem(this.recents[i]));
                }
            }

            if(this.bookmarksKey!=localStorage.md_bookmarks){
                this.bookmarksKey = localStorage.md_bookmarks;
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
            MD.plugin.bookmarks.splice(MD.plugin.bookmarks.indexOf(key),1);
            delete this.series[key].bookmark;
            var index =  this.bookmarks.indexOf(key);
            if(index!=-1) this.bookmarks.splice(index,1);
            if(this.recents.indexOf(key)==-1){
                delete this.series[key];
            }
            this.series[key].isDirty = true;
        },
        showPanel: function(chart){
            jQuery(document).bind('click', closePanel);
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
                +   '<span id="mashabledata_cancel" class="mashabledata_close">close</span>'
                + ((chart.options.exporting&&chart.options.exporting.enable!==false)?'<span>Download chart as: <a class="mashabledata_png" data="image/png">PNG</a><a class="mashabledata_jpg" data="image/jpeg">JPG</a><a class="mashabledata_svg" data="image/svg+xml">SVG</a><a class="mashabledata_pdf" data="application/pdf">PDF</a><span id="mashabledata_print" class="mashabledata_print">print chart</span></span>':'')
                + '<div id="mashabledata_tabs">'
                +   '<ol><li class="mashabledata_active mashabledata_recents"><a data="#mashabledata_recents">recent<span class="mashabledata_info">('+this.recents.length+')</span></a></li><li class="mashabledata_bookmarks"><a data="#mashabledata_bookmarks">bookmarks<span class="mashabledata_info">('+this.bookmarks.length+')</span></a></li></ol>'
                +   '<span><input class="mashabledata_inputmsg mashabledata_filter" value="type here to filter series"></span>'
                +   '<div id="mashabledata_recents">'
                +     '<table><tr><th class="mashabledata_cell_bookmark"></th><th class="mashabledata_cell_check"></th><th class="mashabledata_cell_name">name</th><th class="mashabledata_cell_units">units</th><th class="mashabledata_cell_f">f</th><th class="mashabledata_cell_from">from</th><th class="mashabledata_cell_to">to</th><th class="mashabledata_cell_viewed">viewed<span id="mashabledata_desc"></span></th><th class="mashabledata_cell_url">url</th></tr></table>'
                +     '<div class="mashabledata_scroll"><table>'+this.makeRows(this.recents)+'</table></div>'
                +   '</div>'
                +   '<div id="mashabledata_bookmarks">'
                +     '<table><tr><th class="mashabledata_cell_check"></th><th class="mashabledata_cell_bookmark"></th><th class="mashabledata_cell_name">name</th><th class="mashabledata_cell_units">units</th><th class="mashabledata_cell_f">f</th><th class="mashabledata_cell_from">from</th><th class="mashabledata_cell_to">to</th><th class="mashabledata_cell_viewed">viewed<span id="mashabledata_desc"></span></th><th class="mashabledata_cell_url">url</th></tr></table>'
                +     '<div class="mashabledata_scroll"><table>'+this.makeRows(this.bookmarks)+'</table></div>'
                +   '</div>'
                +   '<span class="mashabledata_these">applies to</span> <span id="mashabledata_check_all">uncheck all</span> '
                +   '<button id="mashabledata_update" value="chart" disabled>update chart</button>'
                +   '<button id="mashabledata_export" value="md">send to MashableData.com *</button>'
                +   '<br><span style="font-size: 9px;margin: 1px 10px;float:right;">* MashableData.com curates millions of statistics and provides visualization tools to create and share interactive maps and graphs</span>'
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

            $panel.find('div.mashabledata_scroll table').click(function(evt){
                var $target = jQuery(evt.target);
                var $td = $target.closest('td');
                if($td.hasClass('mashabledata_cell_bookmark')){
                    var key = $td.parent().find('input').attr('data');
                    if(self.series[key]){
                        if(self.series[key].bookmark) { //could have been deselected from either panel
                            self.unBookmarkSeries(key);
                            $panel.find('#mashabledata_bookmarks div.mashabledata_scroll input[data=\''+key+'\']').closest('tr').remove();
                            $panel.find('#mashabledata_recents div.mashabledata_scroll input[data=\''+key+'\']').closest('tr').find('td.mashabledata_cell_bookmark span').addClass('mashabledata_nostar').removeClass('mashabledata_star');
                        } else { //must have been clicked in the recents panel
                            self.bookmarkSeries(key);
                            $td.find('span').addClass('mashabledata_star').removeClass('mashabledata_nostar');
                            $panel.find('#mashabledata_bookmarks div.mashabledata_scroll table').prepend(self.makeRows([key]));
                        }
                        //update the tab with the counts
                        var $table = $panel.find('#mashabledata_bookmarks div.mashabledata_scroll table');
                        var visible = $table.find('tr:visible').length;
                        $panel.find('li.mashabledata_bookmarks span').html('('+visible+($table[0].rows.length==visible?'':' of '+$table[0].rows.length)+')');

                        updateLocalStorage();
                    }
                } else {
                    if(!$target.is(':checkbox')){
                        $td.parent().find('input:checkbox').click();
                    }

                    jQuery('#mashabledata_update').removeAttr('disabled');
                    if($panel.find('input:checkbox:checked').length==0){
                        $panel.find('#mashabledata_check_all').innerHTML='uncheck all';
                    } else {
                        $panel.find('#mashabledata_check_all').innerHTML='check all';
                    }
                }
            });

            $panel.find('input:checkbox').change(function(){
            });

            $panel.find('td.mashabledata_cell_bookmark span').click(function(){
            });

            $panel.find('ol a').click(function(){  //tabs
                $panel.find('ol li').removeClass('mashabledata_active');
                $panel.find('#mashabledata_recents, #mashabledata_bookmarks').hide();
                $panel.find(jQuery(this).closest('li').addClass('mashabledata_active').end().attr('data')).show();
            });
            $panel.find('th')  //table column sorts (maybe shift to a table click event for efficiency)
                .attr('title', 'click to sort on this column')
                .each(function(){
                    var $th = jQuery(this), thIndex = $th.index(), inverse = false;
                    $th.click(function(){
                        var $table = $th.closest('div').find('div.mashabledata_scroll table');
                        $table.find('td').filter(function(){
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
            function getCheckKeys(){
                var checkedKeys = [], key;
                $panel.find('table input:checked').each(function(){
                    key = jQuery(this).attr('data');
                    if(checkedKeys.indexOf(key)==-1) checkedKeys.push(key);  //avoid double counting from recents + bookmarks
                });
                return checkedKeys;
            }
            $panel.find('#mashabledata_update').click(function(){
                //1.make array of checked keys
                var checkedKeys = getCheckKeys(), series, y;

                //2. if graph, add / remove series from chart
                //2A. first remove
                for(var i=0;i<chart.series.length;i++){
                    if(chart.series[i].options.md_key && checkedKeys.indexOf(chart.series[i].options.md_key)==-1){
                        chart.series[i--].remove(false);  //need to backup one to account for the change in the series array
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
                            }, false, false);
                        }
                        chart.addSeries({
                            name: series.name,
                            data: series.data,
                            mash: true,
                            md_key: checkedKeys[i],
                            yAxis: y
                        }, false);
                    }
                }
                //3. remove any unused yAxis
                for(y=chart.yAxis.length-1;y>=0;y--){ //check for and add y-axis not have not series
                    if(chart.yAxis[y].series.length==0) chart.yAxis[y].remove(false);
                }
                chart.redraw();

                closePanel();
            });
            $panel.find('#mashabledata_export').click(function(){
                var checkedKeys = getCheckKeys();
                //3. if MD, post checked series and open in new page
                for(i=0;i<checkedKeys.length;i++){
                    self.seriesXferCount++;
                    self.postSeries(self.series[checkedKeys[i]]);
                }
                if(self.seriesXferCount==self.seriesXfered) self.navigate(); else self.OKToNavigate = true;
                closePanel();
            });
            $panel.find('#mashabledata_cancel').click(function(){
                closePanel();
            });
            function closePanel(evt){
                if(evt && jQuery(evt.target).closest('#mashabledata_panel').length==1) return;  //this is also the document click event to detect click outside the panel
                $panel.remove();
                jQuery(document).unbind('click', closePanel);
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
                localStorage.md_recents = JSON.stringify(self.recents);
                localStorage.md_bookmarks = JSON.stringify(self.bookmarks);
            }
        },
        makeRows: function(aryKeys){
            var i, series, rows = '', now = new Date(), viewed, inChart;
            for(i=0;i<aryKeys.length;i++){
                series = this.series[aryKeys[i]];
                viewed = new Date(parseInt(series.save_dt));
                inChart = this.hasSeries(aryKeys[i]);
                rows += '<tr><td class="mashabledata_cell_bookmark"><span class="'+(series.bookmark?'mashabledata_star':'mashabledata_nostar')+'"></span></td>'
                    + '<td class="mashabledata_cell_check"><input type="checkbox" data="'+aryKeys[i]+'"'+(inChart?' checked><span>a'+viewed.getTime()+'</span>':'><span>b'+viewed.getTime()+'</span>')+'</td>'
                    + '<td class="mashabledata_cell_name" title="'+series.name+'">'+series.name+'</td>'
                    + '<td class="mashabledata_cell_units" title="'+series.units+'">'+series.units+'</td>'
                    + '<td class="mashabledata_cell_f">'+series.period+'</td>'
                    + '<td class="mashabledata_cell_from" >'+this.formatDateByPeriod(series.firstdt,series.period)+'</td>'
                    + '<td class="mashabledata_cell_to">'+this.formatDateByPeriod(series.lastdt, series.period)+'</td>'
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
        },
        embed: function embed(div){
            var $div = $(div);  //div can be a DIM node, a DOM selector, or a jQuery DIV element
            if($div.length==1){
                //$.support.cors = true;
                var graphcode = $div.attr('data');
                if(graphcode && graphcode.length==32 && !/[^a-f0-9]/g.test(graphcode))
                    grapher.createMyGraph(graphcode);
                else
                    $div.html('The data attribute must be a graphcode');
            }
        },
        popGraph: function(quickGraph){
            var quickChart = false, quickFlot, quickChartOptions = grapher.makeChartOptionsObject(quickGraph);
            delete quickChartOptions.chart.height;
            quickChartOptions.chart.borderWidth = 2;

            quickChartOptions.chart.renderTo = 'mashabledata_quick-graph';
            $.fancybox('<div id="mashabledata_quick-graph" style="width:'+window.innerWidth * 0.75+'px;height:'+window.innerHeight * 0.75+'px;"></div>',
                {
                    showCloseButton: true,
                    autoScale: true,
                    overlayOpacity: 0.5,
                    hideOnOverlayClick: true,
                    onCleanup: function(){
                        if(quickChart) {
                            quickChart.destroy();
                        } else {
                            quickFlot.shutdown();
                        }
                    }
                });
            if(window.Highcharts){
                quickChart = new Highcharts.Chart(quickChartOptions);
            } else {  //use flot
                $('<h3>' + quickChartOptions.title.text + ' ('+quickChartOptions.yAxis[0].title.text+')</h3>').insertBefore('#mashabledata_quick-graph');
                $.each(quickChartOptions.series, function(){
                    this.label = this.geoname || this.name;
                });
                var flotOptions = {
                    legend: {
                        show: true,
                        noColumns: 1,
                        position: "nw"
                    },
                    xaxis: {
                        mode: "time"
                        //timeformat: "%Y/%m/%d"
                    },
                    grid: {
                            hoverable: true,
                            clickable: true
                    }
                };
                if($('#mashabledata_flottip').length==0)
                    $("<div id='mashabledata_flottip'></div>").css({
                        position: "absolute",
                        display: "none",
                        border: "1px solid #fdd",
                        padding: "2px",
                        "background-color": "#fee",
                        opacity: 0.80,
                        "z-index": 1200
                }).appendTo("body");
                quickFlot = $.plot('#mashabledata_quick-graph', quickChartOptions.series, flotOptions);
                $("#mashabledata_quick-graph").bind("plothover", function (event, pos, item) {
                    if (item) {
                        var x = item.datapoint[0].toFixed(2),
                            y = item.datapoint[1].toFixed(2);

                        $("#mashabledata_flottip")
                            .html(item.series.label + ":<br>" + y + " " + quickChartOptions.yAxis[0].title.text+" in " + grapher.formatDateByPeriod(y,quickChartOptions.series[0].period))
                            .css({top: item.pageY+5, left: item.pageX+5})
                            .fadeIn(200);
                    } else {
                        $("#mashabledata_flottip").hide();
                    }
                });
            }
        }
    };
    return plugin_obj;
}();


jQuery(document).ready(function(){
    //detect and build embedded MashableData graphs/visualizations
    jQuery('div.mashabledata_embed').each(function(){
        var $this = jQuery(this);
        MashableData.plugin.embed($this);
    });

    //Highcharts mod
    if(window.Highcharts){
        var btnHeight = 20;
        var btnsWidth = 24;
        var btnsX = 10;
        var btnsY = 10;
        var currentTheme =  Highcharts.setOptions({});
        var mashableDataHcTheme = {
            chart: {
                events: {
                    load: function(){
                        window.MashableData.plugin.storeChartSeries(this);
                    }
                }
            },
            exporting: {
                buttons:{
                    contextButton: {
                        enabled: true,
                        menuItems: null,
                        onclick:  function() {
                            window.MashableData.plugin.showPanel(this);
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
