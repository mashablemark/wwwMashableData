/**
 * Created on 4/9/14.
 *
 * global constants and variable used by and shared between modules
 * should be first script file loaded or compiled as it defines
 * the MashableData object
 */

var MashableData = {
    globals: {
        graphBluePrints: {}, //used to preload embedded graphs for high volume websites
        totalServerTime: 0,
        isEmbedded: (window.location.hostname.indexOf('www.mashabledata.com')===-1 || window.location.pathname.indexOf('workbench')===-1),
        isDev: (window.location.hostname.indexOf('www.mashabledata.com')!==-1 && window.location.pathname.indexOf('workbenchdev')!==-1),
        lang: {
            decimalPoint : '.',
            thousandsSep: ','
        },
        //ANNOTATOR
        BAND_TRANSPARENCY: 0.5,
        colorsPlotBands: ['aaaaaa', 'ffaaaa', 'aaffaa', 'aaaaff'],
        bubbleColor: 'pink',
        standardAnnotations: [],  //filled by API call on first use
        //WORKBENCH
        iconsHMTL: {
            mapset: '<span class="ui-icon ui-icon-mapset" title="series is part of a map set"></span>',
            pointset: '<span class="ui-icon ui-icon-pointset" title="series is part of a set of markers (defined longitude and latitude)"></span>',
            hasCubeViz: '<span class="ui-icon ui-icon-cube" title="map has supplemental visualizations"></span>',
            hasHeatMap: '<span class="ui-icon ui-icon-mapset" title="contains a heat-map"></span>',
            hasMarkerMap: '<span class="ui-icon ui-icon-pointset" title="contains sets of mapped markers (defined longitude and latitude)."></span>',
            hasBubbleMap: '<span class="ui-icon ui-icon-bubble" title="bubble map of data aggregated into user-defined regions"></span>'
        },
        themeCubes: {}, //stores {cubes: [{cubeid, name}...] under T+themeid key to eliminate repretative calls
        panelGraphs: {}, //oMyGraphs objects are copied and referenced by the tab's panelID (i.e. panelGraphs['graphTab1']).  Kept in sync by UI events.  Used by save/publish operations.
        //These 2 master objects contain representations of MySeries and MyGraphs.  They are filled by API calls and in turn are used populate the datatables
        MySets: {},  //referenced by 'S'+seriesid (i.e. oMySeries['S173937']). Filled from localstatoraged, API.getMySeries (header only; no data for speed), and when series is added from PublicSeries viewer.  Data fetched as needed.  Used to populate graph data (and vice-versa ) as possible.
        //var oPublicSeries = {}; //NOT USED. DataTables fetches directly from API.SearchSeries = endless scroll style fetch
        MyGraphs: {},  //complete fetch from API.GetMyGraphs.  Kept in sync with cloud by API.ManageMyGraphs and API.DeleteMyGraphs
        //var oPublicGraphs = {};  //NOT USED.  DataTables fetches directly from API.SearchGraphs = endless scroll style fetch TODO: show button not programmed

//GRAPH
        MAP_COLORS: {POS: '#0071A4', NEG: '#FF0000', MID: '#E5E5E5'},
        DEFAULT_RADIUS_SCALE: 30, //(px) used for both bubble maps and marker maps
        DEFAULT_RADIUS_FIXED: 10, //size of marker using full scaling and fixed radius
        hcColors: [
            '#2f7ed8',
            '#8bbc21',
            '#910000',
            '#1aadce',
            '#492970',
            '#f28f43',
            '#77a1e5',
            '#c42525',
            '#a6c96a',
            '#4572A7',
            '#AA4643',
            '#89A54E',
            '#80699B',
            '#3D96AE',
            '#DB843D',
            '#92A8CD',
            '#A47D7C',
            '#B5CA92',
            '#0d233a'  //very close to black
        ],
        primeColors: ['#008000', '#FF0000','#0000FF', '#FFFF00', '#FF9900', '#00FFFF', '#FF0000'],  //green, red, blue, yellow, orange, azure, lime green
        dashStyles: [
            'Solid',
            'Short Dash',
            'Short Dot',
            'Short Dash Dot',
            'Short Dash Dot Dot',
            'Dot',
            'Dash',
            'Long Dash',
            'Dash Dot',
            'Long Dash Dot',
            'Long Dash Dot Dot'
        ],
        period: {
            value:  { //used to determine rank and to set column widths
                N: 1000, //one second
                D: 24*3600*1000,
                W: 7*24*3600*1000,
                M: 30*24*3600*1000,
                Q: 365/4*24*3600*1000,
                SA: 365/2*24*3600*1000,
                A: 365*24*3600*1000
            },
            order: ['N','D','W','M','Q','SA','A'],
            name: {
                N: 'non period data',
                D: 'daily',
                W: 'weekly',
                M: 'monthly',
                Q: 'quarterly',
                SA: 'semiannual',
                A: 'annual'
            },
            units: {
                'N': "non-periodic data",
                'D': "day",
                'W': "week",
                'M': "month",
                'Q': "quarter",
                'SA': "half-year",
                'A': "year"
            }
        },
        op: {
            "value": {"+":1,"-":2,"*":3,"/":4},
            "cssClass": {"+":"op-addition","-":"op-subtraction","*":"op-multiply","/":"op-divide"}
        },
        mapBackground: '#AAAAAA',
        graphScriptFiles: ["/global/js/highcharts/js/modules/exporting.src.js","/global/js/colorpicker/jquery.colorPicker.min.js","/global/js/colour/Colour.js","/global/js/jvectormap/jquery-jvectormap-2.0.1.js"],
        rowPosition: {
            name: 0,
            units: 1,
            source: 2,
            notes: 3,
            region: 4,
            lat_lon: 5,
            date: 6,
            dataStart: 7
        },
        patVariable: /(\b[A-Z]{1,2}\b)/g,  //used to search and replace formula to use a passed in values object
        //SVGNS: "http://www.w3.org/2000/svg",
        isIE: /msie/i.test(navigator.userAgent) && !window.opera,
        months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
        mapModes: {
            "heat":  'colored heat map of values',
            "abs-change": 'colored heat map of changes',
            "percent-change": 'colored heat map of percent changes',
            "bubbles": 'overlay circles to show values',
            "change-bubbles": 'overlay circles to show changes',
            "correlation": 'correlation (requires two maps)',
            "treemap": 'abstract values to rectangles',
            "change-treemap": 'abstract change to rectangles',
            "min": 'color by date of minimum value',
            "max": 'color by date of maximum value'
        }

    }
};

if(typeof console == 'undefined') console = {info: function(m){}, log: function(m){}};  //allow console.log call without triggering errors in IE or FireFox w/o Firebug
