/**
 * Created by mark__000 on 7/6/14.
 */
(function makeMapDiv(){
    var orderedMapList = [
        {"map":"none","name":"no map filter","level":0},
        {"map":"world","name":"world","geographycount":"172","bunny":"321","jvectormap":"world_mill_en","legend":"BL","level":0},
        {"map":"wb_incomes","name":"World Bank income levels","geographycount":"11","bunny":"321","jvectormap":"wb_incomes","legend":"BL","level":1},
        {"map":"wb_regions","name":"World Bank regions","geographycount":"13","bunny":"321","jvectormap":"wb_regions","legend":"BL","level":1},
        {"map":"africa","name":"Africa","geographycount":"57","bunny":"3837","jvectormap":"africa_mill_en","legend":"BL","level":0},
        {"map":"europe_nafrica","name":"Europe and North Africa","geographycount":"53","bunny":null,"jvectormap":"europe_nafrica_mill_en","legend":"BL","level":0},
        {"map":"europe","name":"Europe","geographycount":"41","bunny":"3841","jvectormap":"europe_mill_en","legend":"BL","level":0},
        {"map":"eu28","name":"European Union - countries","geographycount":"28","bunny":"307","jvectormap":"eu_mill_en","legend":"BL","level":0},
        {"map":"eu_nuts1","name":"European Union - NUTS1 regions","geographycount":"104","bunny":"307","jvectormap":"eu_nuts1_mill_en","legend":"BL","level":1},
        {"map":"eu_nuts2","name":"European Union - NUTS2 regions","geographycount":"289","bunny":"307","jvectormap":"eu_nuts2_mill_en","legend":"BL","level":1},
        {"map":"eu_nuts2","name":"European Union - NUTS3 regions","geographycount":"1373","bunny":"307","jvectormap":"eu_nuts3_mill_en","legend":"BL","level":1},
        {"map":"at_nuts2","name":"Austria/Österreich NUTS2 regions","geographycount":"9","bunny":"16","jvectormap":"at_nuts2_mill_en","legend":"BR","level":2},
        {"map":"at_nuts3","name":"Austria/Österreich NUTS3 regions","geographycount":"35","bunny":"16","jvectormap":"at_nuts3_mill_en","legend":"BR","level":2},
        {"map":"be_nuts2","name":"Belgium/Belgique-België NUTS2 regions","geographycount":"11","bunny":"19","jvectormap":"be_nuts2_mill_en","legend":"BR","level":2},
        {"map":"be_nuts3","name":"Belgium/Belgique-België NUTS3 regions","geographycount":"44","bunny":"19","jvectormap":"be_nuts3_mill_en","legend":"BR","level":2},
        {"map":"bg_nuts2","name":"Bulgaria NUTS2 regions","geographycount":"6","bunny":"24","jvectormap":"bg_nuts2_mill_en","legend":"BR","level":2},
        {"map":"bg_nuts3","name":"Bulgaria NUTS3 regions","geographycount":"28","bunny":"24","jvectormap":"bg_nuts3_mill_en","legend":"BR","level":2},
        {"map":"ch_nuts2","name":"Switzerland/Suisse-Schweiz NUTS2 regions","geographycount":"7","bunny":"42","jvectormap":"ch_nuts2_mill_en","legend":"BR","level":2},
        {"map":"ch_nuts3","name":"Switzerland/Suisse/Schweiz NUTS3 regions","geographycount":"26","bunny":"42","jvectormap":"ch_nuts3_mill_en","legend":"BR","level":2},
        {"map":"cz_nuts2","name":"Czech/?eská Republika NUTS2 regions","geographycount":"8","bunny":"59","jvectormap":"cz_nuts2_mill_en","legend":"BR","level":2},
        {"map":"cz_nuts3","name":"Czech/?eská Republika NUTS3 regions","geographycount":"14","bunny":"59","jvectormap":"cz_nuts3_mill_en","legend":"BR","level":2},
        {"map":"de_nuts1","name":"Germany/Deutschland  NUTS1 regions","geographycount":"16","bunny":"60","jvectormap":"de_nuts1_mill_en","legend":"BR","level":2},
        {"map":"de_nuts2","name":"Germany/Deutschland NUTS2 regions","geographycount":"37","bunny":"60","jvectormap":"de_nuts2_mill_en","legend":"BR","level":2},
        {"map":"de_nuts3","name":"Germany/Deutschland NUTS3 regions","geographycount":"413","bunny":"60","jvectormap":"de_nuts3_mill_en","legend":"BR","level":2},
        {"map":"dk_nuts2","name":"Denmark/Danmark NUTS2 regions","geographycount":"5","bunny":"63","jvectormap":"dk_nuts2_mill_en","legend":"BR","level":2},
        {"map":"dk_nuts3","name":"Denmark/Danmark NUTS3 regions","geographycount":"11","bunny":"63","jvectormap":"dk_nuts3_mill_en","legend":"BR","level":2},
        {"map":"el_nuts2","name":"Greece/Ellada NUTS2 regions","geographycount":"13","bunny":"90","jvectormap":"el_nuts2_mill_en","legend":"BR","level":2},
        {"map":"el_nuts3","name":"Greece/Ellada NUTS3 regions","geographycount":"51","bunny":"90","jvectormap":"el_nuts3_mill_en","legend":"BR","level":2},
        {"map":"es_nuts2","name":"Spain/España NUTS2 regions","geographycount":"19","bunny":"70","jvectormap":"es_nuts2_mill_en","legend":"BR","level":2},
        {"map":"es_nuts3","name":"Spain/España NUTS3 regions","geographycount":"59","bunny":"70","jvectormap":"es_nuts3_mill_en","legend":"BR","level":2},
        {"map":"fi_nuts2","name":"Finland/Suomi NUTS2 regions","geographycount":"5","bunny":"73","jvectormap":"fi_nuts2_mill_en","legend":"BR","level":2},
        {"map":"fi_nuts3","name":"Finland/Suomi NUTS3 regions","geographycount":"19","bunny":"73","jvectormap":"fi_nuts3_mill_en","legend":"BR","level":2},
        {"map":"fr_nuts2","name":"France NUTS2 regions","geographycount":"26","bunny":"76","jvectormap":"fr_nuts2_mill_en","legend":"BR","level":2},
        {"map":"fr_nuts3","name":"France NUTS3 regions","geographycount":"100","bunny":"76","jvectormap":"fr_nuts3_mill_en","legend":"BR","level":2},
        {"map":"hu_nuts2","name":"Hungary/Magyarország NUTS2 regions","geographycount":"7","bunny":"102","jvectormap":"hu_nuts2_mill_en","legend":"BR","level":2},
        {"map":"hu_nuts3","name":"Hungary/Magyarország NUTS3 regions","geographycount":"20","bunny":"102","jvectormap":"hu_nuts3_mill_en","legend":"BR","level":2},
        {"map":"ie_nuts3","name":"Ireland NUTS3 regions","geographycount":"8","bunny":"107","jvectormap":"ie_nuts3_mill_en","legend":"BR","level":2},
        {"map":"it_nuts2","name":"Italy/Italia NUTS2 regions","geographycount":"21","bunny":"112","jvectormap":"it_nuts2_mill_en","legend":"BR","level":2},
        {"map":"it_nuts3","name":"Italy/Italia NUTS3 regions","geographycount":"110","bunny":"112","jvectormap":"it_nuts3_mill_en","legend":"BR","level":2},
        {"map":"lt_nuts3","name":"Lithuania/Lietuva NUTS3 regions","geographycount":"10","bunny":"113","jvectormap":"lt_nuts3_mill_en","legend":"BR","level":2},
        {"map":"lv_nuts3","name":"Latvia/Latvija NUTS3 regions","geographycount":"6","bunny":"135","jvectormap":"lv_nuts3_mill_en","legend":"BR","level":2},
        {"map":"nl_nuts2","name":"Netherlands/Nederland NUTS2 regions","geographycount":"12","bunny":"167","jvectormap":"nl_nuts2_mill_en","legend":"BR","level":2},
        {"map":"nl_nuts3","name":"Netherlands/Nederland NUTS3 regions","geographycount":"40","bunny":"167","jvectormap":"nl_nuts3_mill_en","legend":"BR","level":2},
        {"map":"no_nuts2","name":"Norway/Norge NUTS2 regions","geographycount":"7","bunny":"168","jvectormap":"no_nuts2_mill_en","legend":"BR","level":2},
        {"map":"no_nuts3","name":"Norway/Norge NUTS3 regions","geographycount":"19","bunny":"168","jvectormap":"no_nuts3_mill_en","legend":"BR","level":2},
        {"map":"pl_nuts2","name":"Poland/Polska NUTS2 regions","geographycount":"16","bunny":"180","jvectormap":"pl_nuts2_mill_en","legend":"BR","level":2},
        {"map":"pl_nuts3","name":"Poland/Polska NUTS3 regions","geographycount":"66","bunny":"180","jvectormap":"pl_nuts3_mill_en","legend":"BR","level":2},
        {"map":"pt_nuts2","name":"Portugal NUTS2 regions","geographycount":"7","bunny":"183","jvectormap":"pt_nuts2_mill_en","legend":"BR","level":2},
        {"map":"pt_nuts3","name":"Portugal NUTS3 regions","geographycount":"30","bunny":"183","jvectormap":"pt_nuts3_mill_en","legend":"BR","level":2},
        {"map":"ro_nuts2","name":"Romania/România NUTS2 regions","geographycount":"8","bunny":"189","jvectormap":"ro_nuts2_mill_en","legend":"BR","level":2},
        {"map":"ro_nuts3","name":"Romania/România NUTS3 regions","geographycount":"42","bunny":"189","jvectormap":"ro_nuts3_mill_en","legend":"BR","level":2},
        {"map":"se_nuts2","name":"Sweden/Sverige NUTS2 regions","geographycount":"8","bunny":"211","jvectormap":"se_nuts2_mill_en","legend":"BR","level":2},
        {"map":"se_nuts3","name":"Sweden/Sverige NUTS3 regions","geographycount":"21","bunny":"211","jvectormap":"se_nuts3_mill_en","legend":"BR","level":2},
        {"map":"si_nuts3","name":"Slovakia/Slovenija NUTS3 regions","geographycount":"12","bunny":"210","jvectormap":"si_nuts3_mill_en","legend":"BR","level":2},
        {"map":"sk_nuts3","name":"Slovenia/Slovensko NUTS3 regions","geographycount":"8","bunny":"209","jvectormap":"sk_nuts3_mill_en","legend":"BR","level":2},
        {"map":"uk_nuts1","name":"United Kingdom NUTS1 regions","geographycount":"12","bunny":"80","jvectormap":"uk_nuts1_mill_en","legend":"BR","level":2},
        {"map":"uk_nuts2","name":"United Kingdom NUTS2 regions","geographycount":"37","bunny":"80","jvectormap":"uk_nuts2_mill_en","legend":"BR","level":2},
        {"map":"uk_nuts3","name":"United Kingdom NUTS3 regions","geographycount":"139","bunny":"80","jvectormap":"uk_nuts3_mill_en","legend":"BR","level":2},
        {"map":"us","name":"USA (states)","geographycount":"51","bunny":"235","jvectormap":"us_aea_en","legend":"BL","level":0},
        {"map":"us_counties","name":"US counties","geographycount":"3145","bunny":"235","jvectormap":"us_counties_merc_en","legend":"BL","level":1},
        {"map":"eia_regions","name":"US by EIA statistical regions","geographycount":"10","bunny":"235","jvectormap":"us_aea_en","legend":"BL","level":1},
        {"map":"padds","name":"US Petroleum Districts","geographycount":"5","bunny":"235","jvectormap":"us_aea_en","legend":"BL","level":1},
        {"map":"padds_sub","name":"US Petroleum Districts - detailed","geographycount":"7","bunny":"235","jvectormap":"us_aea_en","legend":"BL","level":1},
        {"map":"us_ak","name":"Alaska","geographycount":"29","bunny":"251","jvectormap":"usak_merc_en","legend":"TR","level":2},
        {"map":"us_al","name":"Alabama","geographycount":"67","bunny":"250","jvectormap":"usal_merc_en","legend":"BR","level":2},
        {"map":"us_ar","name":"Arkansas","geographycount":"75","bunny":"253","jvectormap":"usar_merc_en","legend":"BR","level":2},
        {"map":"us_az","name":"Arizona","geographycount":"15","bunny":"252","jvectormap":"usaz_merc_en","legend":"BR","level":2},
        {"map":"us_ca","name":"California","geographycount":"58","bunny":"254","jvectormap":"usca_merc_en","legend":"TR","level":2},
        {"map":"us_co","name":"Colorado","geographycount":"64","bunny":"255","jvectormap":"usco_merc_en","legend":"BR","level":2},
        {"map":"us_ct","name":"Connecticut","geographycount":"8","bunny":"256","jvectormap":"usct_merc_en","legend":"BR","level":2},
        {"map":"us_dc","name":"District of Columbia","geographycount":"2","bunny":"694","jvectormap":"usdc_merc_en","legend":"BR","level":2},
        {"map":"us_de","name":"Delaware","geographycount":"3","bunny":"257","jvectormap":"usde_merc_en","legend":"TR","level":2},
        {"map":"us_fl","name":"Florida","geographycount":"67","bunny":"258","jvectormap":"usfl_merc_en","legend":"BL","level":2},
        {"map":"us_ga","name":"Georgia","geographycount":"159","bunny":"259","jvectormap":"usga_merc_en","legend":"TR","level":2},
        {"map":"us_hi","name":"Hawaii","geographycount":"5","bunny":"260","jvectormap":"ushi_merc_en","legend":"BL","level":2},
        {"map":"us_ia","name":"Iowa","geographycount":"99","bunny":"264","jvectormap":"usia_merc_en","legend":"BR","level":2},
        {"map":"us_id","name":"Idaho","geographycount":"44","bunny":"261","jvectormap":"usid_merc_en","legend":"TR","level":2},
        {"map":"us_il","name":"Illinois","geographycount":"102","bunny":"262","jvectormap":"usil_merc_en","legend":"BL","level":2},
        {"map":"us_in","name":"Indiana","geographycount":"92","bunny":"263","jvectormap":"usin_merc_en","legend":"BR","level":2},
        {"map":"us_ks","name":"Kansas","geographycount":"105","bunny":"265","jvectormap":"usks_merc_en","legend":"BR","level":2},
        {"map":"us_ky","name":"Kentucky","geographycount":"120","bunny":"266","jvectormap":"usky_merc_en","legend":"TL","level":2},
        {"map":"us_la","name":"Louisiana","geographycount":"64","bunny":"267","jvectormap":"usla_merc_en","legend":"TR","level":2},
        {"map":"us_md","name":"Maryland","geographycount":"24","bunny":"269","jvectormap":"usmd_merc_en","legend":"BL","level":2},
        {"map":"us_me","name":"Maine","geographycount":"16","bunny":"268","jvectormap":"usme_merc_en","legend":"TR","level":2},
        {"map":"us_ma","name":"Massachusetts","geographycount":"14","bunny":"270","jvectormap":"usma_merc_en","legend":"BL","level":2},
        {"map":"us_mi","name":"Michigan","geographycount":"83","bunny":"271","jvectormap":"usmi_merc_en","legend":"BL","level":2},
        {"map":"us_mn","name":"Minnesota","geographycount":"87","bunny":"272","jvectormap":"usmn_merc_en","legend":"BR","level":2},
        {"map":"us_ms","name":"Mississippi","geographycount":"82","bunny":"273","jvectormap":"usms_merc_en","legend":"BR","level":2},
        {"map":"us_mo","name":"Missouri","geographycount":"115","bunny":"274","jvectormap":"usmo_merc_en","legend":"TR","level":2},
        {"map":"us_mt","name":"Montana","geographycount":"56","bunny":"275","jvectormap":"usmt_merc_en","legend":"BR","level":2},
        {"map":"us_nc","name":"North Carolina","geographycount":"100","bunny":"282","jvectormap":"usnc_merc_en","legend":"BR","level":2},
        {"map":"us_nd","name":"North Dakota","geographycount":"53","bunny":"283","jvectormap":"usnd_merc_en","legend":"BR","level":2},
        {"map":"us_ne","name":"Nebraska","geographycount":"93","bunny":"276","jvectormap":"usne_merc_en","legend":"BL","level":2},
        {"map":"us_nh","name":"New Hampshire","geographycount":"10","bunny":"278","jvectormap":"usnh_merc_en","legend":"TR","level":2},
        {"map":"us_nj","name":"New Jersey","geographycount":"21","bunny":"279","jvectormap":"usnj_merc_en","legend":"BR","level":2},
        {"map":"us_nm","name":"New Mexico","geographycount":"33","bunny":"280","jvectormap":"usnm_merc_en","legend":"BR","level":2},
        {"map":"us_nv","name":"Nevada","geographycount":"17","bunny":"277","jvectormap":"usnv_merc_en","legend":"BR","level":2},
        {"map":"us_ny","name":"New York","geographycount":"62","bunny":"281","jvectormap":"usny_merc_en","legend":"TR","level":2},
        {"map":"us_oh","name":"Ohio","geographycount":"88","bunny":"284","jvectormap":"usoh_merc_en","legend":"BR","level":2},
        {"map":"us_ok","name":"Oklahoma","geographycount":"77","bunny":"285","jvectormap":"usok_merc_en","legend":"BR","level":2},
        {"map":"us_or","name":"Oregon","geographycount":"36","bunny":"286","jvectormap":"usor_merc_en","legend":"BR","level":2},
        {"map":"us_pa","name":"Pennsylvania","geographycount":"67","bunny":"287","jvectormap":"uspa_merc_en","legend":"BR","level":2},
        {"map":"us_ri","name":"Rhode Island","geographycount":"5","bunny":"288","jvectormap":"usri_merc_en","legend":"BR","level":2},
        {"map":"us_sc","name":"South Carolina","geographycount":"46","bunny":"289","jvectormap":"ussc_merc_en","legend":"BR","level":2},
        {"map":"us_sd","name":"South Dakota","geographycount":"66","bunny":"290","jvectormap":"ussd_merc_en","legend":"BR","level":2},
        {"map":"us_tn","name":"Tennessee","geographycount":"95","bunny":"291","jvectormap":"ustn_merc_en","legend":"BR","level":2},
        {"map":"us_tx","name":"Texas","geographycount":"254","bunny":"292","jvectormap":"ustx_merc_en","legend":"BL","level":2},
        {"map":"us_ut","name":"Utah","geographycount":"29","bunny":"293","jvectormap":"usut_merc_en","legend":"BR","level":2},
        {"map":"us_va","name":"Virginia","geographycount":"136","bunny":"295","jvectormap":"usva_merc_en","legend":"TL","level":2},
        {"map":"us_vt","name":"Vermont","geographycount":"14","bunny":"294","jvectormap":"usvt_merc_en","legend":"BR","level":2},
        {"map":"us_wa","name":"Washington","geographycount":"39","bunny":"296","jvectormap":"uswa_merc_en","legend":"BR","level":2},
        {"map":"us_wi","name":"Wisconsin","geographycount":"72","bunny":"298","jvectormap":"uswi_merc_en","legend":"BL","level":2},
        {"map":"us_wv","name":"West Virginia","geographycount":"55","bunny":"297","jvectormap":"uswv_merc_en","legend":"BR","level":2},
        {"map":"us_wy","name":"Wyoming","geographycount":"23","bunny":"299","jvectormap":"uswy_merc_en","legend":"BR","level":2},
        {"map":"au","name":"Australia","geographycount":"8","bunny":"15","jvectormap":"au_mill_en","legend":"BR","level":0},
        {"map":"ca","name":"Canada","geographycount":"13","bunny":"40","jvectormap":"ca_mill_en","legend":"BR","level":0},
        {"map":"cn","name":"China","geographycount":"31","bunny":"44","jvectormap":"cn_mill_en","legend":"BR","level":0},
        {"map":"co","name":"Colombia","geographycount":"33","bunny":"50","jvectormap":"co_mill_en","legend":"BR","level":0},
        {"map":"in","name":"India","geographycount":"34","bunny":"105","jvectormap":"in_mill_en","legend":"BR","level":0},
        {"map":"nz","name":"New Zealand","geographycount":"13","bunny":"171","jvectormap":"nz_mill_en","legend":"BR","level":0},
        {"map":"ph","name":"Philippines","geographycount":"17","bunny":"177","jvectormap":"ph_mill_en","legend":"BR","level":0},
        {"map":"th","name":"Thailand","geographycount":"76","bunny":"219","jvectormap":"th_mill_en","legend":"BR","level":0},
        {"map":"ve","name":"Venezuela","geographycount":"25","bunny":"239","jvectormap":"ve_mill_en","legend":"BR","level":0},
        {"map":"za","name":"South Africa","geographycount":"9","bunny":"247","jvectormap":"za_mill_en","legend":"BR","level":0}
    ];
        
        

    MashableData.globals.orderedMapList = orderedMapList;
    MashableData.globals.maps = {};
    var map, listHtml = '';
    for(var i=0; i<orderedMapList.length;i++){
        map = orderedMapList[i];
        listHtml += '<li class="map-list-item map-level'+map.level+'" data="'+map.map+'">'+map.name+'</li>';
        MashableData.globals.maps[map.map] = map;
    }
    var mapsUl = '<ul class="map-list">'+listHtml+'</ul>';

    MashableData.common.selectMap = function(event){
        //handles global map selector click event used in FindData tab (#find-data-map)
        //event.data
        var initializing = true;
        var $selector = $(this).blur();
        var offset = $selector.offset();
        var divHtml = '<div id="select-map" style="left:'+offset.left+'px;top:'+(offset.top+$selector.innerHeight())+'px;">'+mapsUl+'</div>';
        var $divHtml = $(divHtml)
            .appendTo('body')
            .find('li[data="'+$selector.val()+'"]').addClass('selector-selected').end()
            .css('max-height', ($(window).innerHeight() *0.8)+'px')
            .show();
        $('body').bind('click', handleMapSelect);
        function handleMapSelect(event){
            if(initializing) return initializing=false;
            var $target = $(event.target);
            if($target.hasClass('map-list-item')){
                var selectedMap = $target.attr('data');
                $('#find-data-map').html('<option value="'+selectedMap+'" selected>'+MashableData.globals.maps[selectedMap].name+'</option>');
                $divHtml.remove();
                return selectedMap;
            } else {
                $divHtml.remove();
                $('body').unbind('click', handleMapSelect);
                return false;
            }
        }
    };


})();






