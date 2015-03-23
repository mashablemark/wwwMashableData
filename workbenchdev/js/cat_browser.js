/**
 * Created by Mark Elbert on 3/22/15.
 * Provides the category browser functionality for the MashabelData workbench.
 * Not intended for embedded use
 */


/*
 API SERIES BROWSE FUNCTIONS


 */

var browserTemplates = {
    innerItem:  '<li class="cat-item {{liClass}}" data="{{catid}}">{{name}}{{icon}}</li>',
    outerItem: '<li class="cat-level" data="{{parentid}}">'
        + '<div class="cat-div">'
        + '<ul class="cat-level" data="{{parentid}}">'
        + '{{listHtml}}'
        + '</ul></div></li>',
    folderIcon: '<span class="cat-show-children"><span class="ui-icon ui-icon-folder-collapsed">show children</span></span>',
    pathIcon: '<span class="cat-open-indicator"><span class="ui-icon ui-icon-play">children shown</span></span>'
};

function browseFromSeries(setid){ //initial chain-table build only
    callApi({command:'GetCatChain', setid: setid||0},function(jsoData){
        var olList = '', level;
        for(var levelCount=0;levelCount<jsoData.chain.length;levelCount++){
            level = jsoData.chain[levelCount];
            olList += makeChainLevel(level, levelCount==jsoData.chain.length-1);
            
            if($('#cloud-series:visible').length==1){
                $('div#browse-api').height($('#cloud-series').height()).width($('#cloud-series').width());
            }
            var $browseDiv = $('div#browse-api')
                .empty()
                .prepend('<div><span style="padding:5px;">Click below to expand sibling and child categories.  Categories containing series are shown as links.  Note that a series can be in more than one category.</span></div>'
                    + '<button id="browse-close" class="right">close</button>'
                    + '<ol id="cat-browser"><div></div></ol>');
            $('#cat-browser')
                .html(olList)
                .click(catBrowserClicked);
            $('#browse-close').button({icons: {secondary: 'ui-icon-close'}}).click(function(){browseClose();});
            $browseDiv.fadeIn();
        }
    });
}

function makeChainLevel(level, isTerminalLevel){
    var list = '';
    for(var li=0;li<level.children.length;li++){
        var child = level.children[li];  //props: catid, name, scount, children
        if(parseInt(child.scount)>0) {
            child.name += ' ('+ child.scount + ')';
            child.liClass = 'cat-has-sets'
        } else {
            child.liClass = '';
        }
        if(parseInt(child.children)>0) {
            child.icon = browserTemplates.folderIcon;
        } else {
            child.icon = '';
        }
        if(child["in-path"]) {
            child.liClass += ' in-path';
            if(isTerminalLevel){
                //child.liClass += ' end-of-path';
                //child.name = '<b>'+ child.name +'</b>';  //bold the last in path
            } else {
                child.icon = browserTemplates.pathIcon;
            }
        }
        list += common.mustache(browserTemplates.innerItem, child);
    }
    return common.mustache(browserTemplates.outerItem, {parentid: level.catid, listHtml: list});

}
function catBrowserClicked(evt){
    var $target = $(evt.target),
        $li = $target.closest('li.cat-item'),
        $liLevel = $target.closest('li.cat-level'),
        $olChain = $('ol#cat-browser'),
        dataFetched = false,
        removalComplete = false;
    if($target.hasClass('ui-icon-folder-collapsed') || $target.hasClass('cat-show-children')){
        //expand requested:
        //1.slide close any li.cat-level to the right
        var thisLevelIndex = $olChain.find('li.cat-level').index($liLevel),
            $liClosingLevels = $olChain.find('li.cat-level:gt('+thisLevelIndex+')');
        if($liClosingLevels.length==0){
            removalComplete = true;
        } else {
            $liClosingLevels.fadeOut(400, function(){
                $liClosingLevels.remove();
                if(dataFetched){
                    _addNextLevel();
                }else {
                    removalComplete = true; //add immediately oon return from apiCall
                }
            })
        }
        //3. fetch children cats in fetchedChildren and add children if slide closed complete
        callApi({command: "GetCatChildren", catid: $li.attr("data")}, function(jso){
            dataFetched = jso;
            if(removalComplete) _addNextLevel();
        });
        function _addNextLevel(){
            //2. swap in-path for folder and add children if they have been returned
            $liLevel
                .find('.in-path').removeClass('in-path')
                .find('span.cat-open-indicator').closest('li').append(browserTemplates.folderIcon)
                .find('span.cat-open-indicator').remove();
            $li.find('span').remove();
            $li.addClass('in-path').append(browserTemplates.pathIcon);
            $olChain.append(makeChainLevel(dataFetched, true));
            dataFetched = false; //prevent multiple triggers when multiple level are removed
        }
    }
    if($target.hasClass('cat-has-sets')){
        //user clicked on a "link"
        searchCatId = $li.attr('data');  //global var. reset on filter change
        $li.find('span').remove();
        var catName = $li.html();
        //trim the '(scount)'
        for(var i=catName.length-1;i>0;i--){
            if(catName[i]=='(') break;
        }
        searchCatName = catName.substr(0,i-1);
        hasher.replaceHash(panelHash()); //set the hash using the global searchCatID, which is then interpreted by the has listener parseHash()

    }
    if($li.hasClass('cat-item')){

    }
}

function publicCat(catId){
    searchCatId = catId; //global var. reset on filter change
    hasher.replaceHash(panelHash()); //set the hash using the global searchCatID, which is then interpreted by the has listener parseHash()
}

function browseClose(){
    $('div#browse-api').fadeOut(function(){$(this).empty()});
    //$('div#cloudSeriesTableDiv').fadeIn();
}

