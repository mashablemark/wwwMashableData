
function makeTreeMap($div, calculatedMapData, mapFile, dateKey, fromDateKey){
    console.time('makeTreeMap');
    $div.html(''); //clear anything there
    var renderer = new Highcharts.Renderer(
        $div[0],
        $div.width(),
        $div.height()
    );
    $div.hide(); //hide it for faster drawing

    console.time('makeTreeMap calc');
    var rect = [0, 0, $div.width(), $div.height()];
    if(!dateKey) dateKey = calculatedMapData.dates[calculatedMapData.dates.length-1].s;
    var sortedCodes = [], i, code, value, total= 0, sortedValues = [], valueObject;
    for(code in calculatedMapData.regionData[dateKey]){
        if(jvm.Map.maps[mapFile].paths[code]){
            valueObject = {code: code}
            if(fromDateKey){
                valueObject.fromValue = calculatedMapData.regionData[fromDateKey][code];
                valueObject.toValue = calculatedMapData.regionData[dateKey][code];
                valueObject.value = valueObject.toValue - valueObject.fromValue;
            } else {
                valueObject.value = calculatedMapData.regionData[dateKey][code];
            }
            if(!isNaN(valueObject.value)){
                total += Math.abs(valueObject.value);
                sortedCodes.push(valueObject);
            }
        } else {
            console.info(code+' code in fetched mapset is not found in '+mapFile);
        }
    }
    sortedCodes.sort(function(a,b){return b.value-a.value;});
    for(i=0;i<sortedCodes.length;i++){
        sortedValues.push(Math.abs(sortedCodes[i].value)/total);
    }
    var squarified = MashableData.common.squarify(rect, sortedValues);

    console.timeEnd('makeTreeMap calc');
    var $statBox = $('#MashableData_statBox');
    if(!$statBox.length){
        $div.append('<div id="MashableData_statBox" style="border:thin solid black;z-index:10000;display:none;position:relative;"></div>');
        $statBox = $('#MashableData_statBox');
    }
    for(i=0;i<squarified.length;i++){
        renderer.rect(squarified[i][0], squarified[i][1], squarified[i][2], squarified[i][3], 0)
            .attr({
                fill: sortedCodes[i].value>0?'#99CCFF':'red',
                stroke: 'black',
                'stroke-width': 1
            })
            .on('mouseover', treeOver(i))
            .add();
        renderer.text(
                jvm.Map.maps[mapFile].paths[sortedCodes[i].code].name+ '<br>'
                    + Highcharts.numberFormat(sortedCodes[i].value)
                    + (calculatedMapData.fillUnits?' '+calculatedMapData.fillUnits:''),
                squarified[i][0]+2,
                squarified[i][1]+10)
            .attr({rotation: 0})
            .css({fontSize: '6pt', color: 'black'}).
            add();
    }

    function treeOver(i){
        return function(){
            var regionName = jvm.Map.maps[mapFile].paths[sortedCodes[i].code].name;
            //console.info(regionName+': '+ sortedCodes[i].value);
            $statBox.html(jvm.states[i]+'<br>'+vals[i]);
        }
    }
    $div.show().off().on('mouseout',function(){$statBox.hide()});
    console.timeEnd('makeTreeMap');
}


//
// sumArray is copied from:
// http://stackoverflow.com/questions/3762589/fastest-javascript-summation
//
MashableData.common.sumArray = (function() {
    // Use one adding function rather than create a new one each
    // time sumArray is called.
    function add(a,b) {
        return a + b;
    }
    return function(arr) {
        return arr.reduce(add);
    };
}());

//
// Treemap squarify layout function.
//  rect - containing rectangle; an array of 4 values x, y, width, height
//  vals - array of (normalized) float values each representing percent contribution to total area of containing rectangle
//
// Non-recursive implementation of the squarify treemap layout algorithm published in:
// "Squarified Treemaps" by Mark Bruls, Kees Huizing and Jarke J. van Wijk
// http://www.win.tue.nl/~vanwijk/stm.pdf
//
// Includes tips and tricks from:
// http://ejohn.org/blog/fast-javascript-maxmin/#postcomment
//
MashableData.common.squarify = function(rect,vals) {

    // "We assume a datatype Rectangle that contains the layout during the computation and
// is global to the procedure squarify. It supports a function width() that gives the length of
// the shortest side of the remaining subrectangle in which the current row is placed and a
// function layoutrow() that adds a new row of children to the rectangle." - Bruls et. al.
    var Subrectangle = function(rect) {
        this.setX = function(x) {
            rect[2] -= x - rect[0];
            rect[0] = x;
        };
        this.setY = function(y) {
            rect[3] -= y - rect[1];
            rect[1] = y;
        };
        this.getX = function() {
            return rect[0];
        };
        this.getY = function() {
            return rect[1];
        };
        this.getW = function() {
            return rect[2];
        };
        this.getH = function() {
            return rect[3];
        };
        this.getWidth = function() {
            return Math.min(rect[2],rect[3]);
        };
    };

    //
    // "The function worst() gives the highest aspect ratio of a list
// of rectangles, given the length of the side along which they are to
// be laid out.
// ...
// Let a list of areas R be given and let s be their total sum. Then the function worst is
// defined by:
// worst(R,w) = max(max(w^2r=s^2; s^2=(w^2r)))
//              for all r in R
// Since one term is increasing in r and the other is decreasing, this is equal to
//              max(w^2r+=(s^2); s^2=(w^2r-))
// where r+ and r- are the maximum and minimum of R.
// Hence, the current maximum and minimum of the row that is being laid out." - Bruls et. al.
    // 
    var worst = function(r,w) {
        var rMax = Math.max.apply(null,r);
        var rMin = Math.min.apply(null,r);
        var s = MashableData.common.sumArray(r);
        var sSqr = s*s;
        var wSqr = w*w;
        return Math.max((wSqr*rMax)/sSqr,sSqr/(wSqr*rMin));
    };

    // Take row of values and calculate the set of rectangles 
    // that will fit in the current subrectangle.
    var layoutrow = function(row) {
        var x = subrect.getX(),
            y = subrect.getY(),
            maxX = x + subrect.getW(),
            maxY = y + subrect.getH(),
            rowHeight,
            i,
            w;

        if (subrect.getW() < subrect.getH()) {
            rowHeight = MashableData.common.sumArray(row)/subrect.getW();
            if (y+rowHeight >= maxY) { rowHeight = maxY-y; }
            for (i = 0; i < row.length; i++) {
                w = row[i]/rowHeight;
                if (x+w > maxX || i+1 === row.length) { w = maxX-x; }
                layout.push([x,y,w,rowHeight]);
                x = (x+w);
            }
            subrect.setY(y+rowHeight);
        } else {
            rowHeight = MashableData.common.sumArray(row)/subrect.getH();
            if (x+rowHeight >= maxX) { rowHeight = maxX-x; }
            for (i = 0; i < row.length; i++) {
                w = row[i]/rowHeight;
                if (y+w > maxY || i+1 === row.length) { w = maxY-y; }
                layout.push([x,y,rowHeight,w]);
                y = (y+w);
            }
            subrect.setX(x+rowHeight);
        }
    };

    // Pull values from input array until the aspect ratio of rectangles in row
    // under construction degrades.
    var buildRow = function(children) {
        var row = [];
        row.push(children.shift()); // descending input
        //row.push(children.pop()); // ascending input
        if (children.length === 0) {
            return row;
        }
        var newRow = row.slice();
        var w = subrect.getWidth();
        do {
            newRow.push(children[0]); // descending input
            //newRow.push(children[children.length-1]); // ascending input
            if (worst(row,w) > worst(newRow,w)){
                row = newRow.slice();
                children.shift(); // descending input
                //children.pop(); // ascending input
            }
            else {
                break;
            }
        } while (children.length > 0);
        return row;
    };

    // Non recursive version of Bruls, Huizing and van Wijk
    // squarify layout algorithim.
    // While values exist in input array, make a row with good aspect
    // ratios for its values then caclulate the row's geometry, repeat.
    var nrSquarify = function(children) {
        do {
            layoutrow(buildRow(children));
        } while (children.length > 0);
    };

    var row = [];
    var layout = [];
    var newVals = [];
    var i;

    // if either height or width of containing rect are <= 0 simply copy containing rect to layout rects
    if (rect[2] <= 0 || rect[3] <= 0) {
        for (i = 0; i < vals.length; i++) {
            layout.push(rect.slice());
        }
    } else { // else compute squarified layout
        // vals come in normalized. convert them here to make them relative to containing rect
        newVals = $.map( vals, function(item){return item*(rect[2]*rect[3]);});
        //newVals = vals.map(function(item){return item*(rect[2]*rect[3]);}); 
        var subrect = new Subrectangle(rect.slice());
        nrSquarify(newVals);
    }
    return layout;
};
