/* copyright MashableData.com 2013 */

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
            points.push(formatDateByPeriod(serie.data[i][0], serie.period) + '|' + (isNaN(serie.data[i][1])||serie.data[i][1]===null? 'null' : serie.data[i][1]));
        }
        return points.join('||');
    }
}
