"use strict";
/**
 * Created by mark__000 on 7/6/14.
 */
(function makeMapDiv(){
    var orderedMapList = [
        {"map":"none","name":"no map filter","level":0},
        {"map":"world","name":"world","geographycount":"172","bunny":"321","jvectormap":"world_mill_en","legend":"BL","level":0},
        {"map":"wb_incomes","name":"World Bank income levels","geographycount":"11","bunny":"321","jvectormap":"world_mill_en","legend":"BL","level":1,
            redef: {"regions":[{"name":"High income: nonOECD","code":"NOC","components":["AD","AG","AW","BH","BB","BM","BN","KY","","HR","CW","CY","GQ","FO","PF","GL","GU","HK","IM","KW","LV","LI","LT","MO","MT","MC","NC","MP","OM","PR","QA","RU","SM","SA","SG","SX","KN","MF","BS","TT","TC","AE","UY","VI"]},{"name":"High income: OECD","code":"OEC","components":["AU","AT","BE","CA","CL","CZ","DK","EE","FI","FR","DE","EL","IS","IE","IL","IT","JP","KR","LU","NL","NZ","NO","PL","PT","SK","SI","ES","SE","CH","UK","US"]},{"name":"Low income","code":"LIC","components":["AF","BD","BJ","BF","BI","KH","CF","TD","KM","KP","CD","ER","ET","GN","GW","HT","KE","LR","MG","MW","ML","MZ","MM","NP","NE","RW","SL","SO","TJ","TZ","GM","TG","UG","ZW"]},{"name":"Lower middle income","code":"LMC","components":["AM","BT","BO","CV","CM","CG","CI","DJ","EG","SV","GE","GH","GT","GY","HN","IN","ID","KI","","KG","LA","LS","MR","FM","MD","MN","MA","NI","NG","PK","PG","PY","PH","WS","ST","SN","SB","SS","LK","SD","SZ","SY","TL","UA","UZ","VU","VN","PS","YE","ZM"]},{"name":"Upper middle income","code":"UMC","components":["AL","DZ","AS","AO","AR","AZ","BY","BZ","BA","BW","BR","BG","CN","CO","CR","CU","DM","DO","EC","FJ","GA","GD","HU","IR","IQ","JM","JO","KZ","LB","LY","MK","MY","MV","MH","MU","MX","ME","NA","PW","PA","PE","RO","RS","SC","ZA","LC","VC","SR","TH","TO","TN","TR","TM","TV","VE"]}]}
        },
        {"map":"wb_regions","name":"World Bank regions","geographycount":"13","bunny":"321","jvectormap":"world_mill_en","legend":"BL","level":1,
            redef: {"regions":[{"name":"East Asia & Pacific","code":"EAS","components":["BN","PF","GU","HK","MO","NC","MP","SG","AU","JP","KR","NZ","KH","KP","MM","ID","KI","LA","FM","MN","PG","PH","WS","SB","TL","VU","VN","AS","CN","FJ","MY","MH","PW","TH","TO","TV"]},{"name":"Europe & Central Asia","code":"ECS","components":["AD","","HR","CY","FO","GL","IM","LV","LI","LT","MC","RU","SM","AT","BE","CZ","DK","EE","FI","FR","DE","EL","IS","IE","IT","LU","NL","NO","PL","PT","SK","SI","ES","SE","CH","UK","TJ","AM","GE","","KG","MD","UA","UZ","AL","AZ","BY","BA","BG","HU","KZ","MK","ME","RO","RS","TR","TM"]},{"name":"Latin America & Caribbean","code":"LCN","components":["AG","AW","BB","KY","CW","PR","SX","KN","MF","BS","TT","TC","UY","VI","CL","HT","BO","SV","GT","GY","HN","NI","PY","AR","BZ","BR","CO","CR","CU","DM","DO","EC","GD","JM","MX","PA","PE","LC","VC","SR","VE"]},{"name":"Middle East & North Africa","code":"MEA","components":["BH","KW","MT","OM","QA","SA","AE","IL","DJ","EG","MA","SY","PS","YE","DZ","IR","IQ","JO","LB","LY","TN"]},{"name":"North America","code":"NAC","components":["BM","CA","US"]},{"name":"South Asia","code":"SAS","components":["AF","BD","NP","BT","IN","PK","LK","MV"]},{"name":"Sub-Saharan Africa","code":"SSF","components":["GQ","BJ","BF","BI","CF","TD","KM","CD","ER","ET","GN","GW","KE","LR","MG","MW","ML","MZ","NE","RW","SL","SO","TZ","GM","TG","UG","ZW","CV","CM","CG","CI","GH","LS","MR","NG","ST","SN","SS","SD","SZ","ZM","AO","BW","GA","MU","NA","SC","ZA"]}]}
        },
        {"map":"africa","name":"Africa","geographycount":"57","bunny":"3837","jvectormap":"africa_mill_en","legend":"BL","level":0},
        {"map":"europe_nafrica","name":"Europe and North Africa","geographycount":"53","bunny":"6555","jvectormap":"europe_nafrica_mill_en","legend":"BL","level":0},
        {"map":"europe","name":"Europe","geographycount":"41","bunny":"3841","jvectormap":"europe_mill_en","legend":"BL","level":0},
        {"map":"eu28","name":"European Union - countries","geographycount":"28","bunny":"307","jvectormap":"eu_mill_en","legend":"BL","level":0},
        {"map":"eu_nuts1","name":"European Union - NUTS1 regions","geographycount":"104","bunny":"307","jvectormap":"eu_nuts1_mill_en","legend":"BL","level":1},
        {"map":"eu_nuts2","name":"European Union - NUTS2 regions","geographycount":"289","bunny":"307","jvectormap":"eu_nuts2_mill_en","legend":"BL","level":1},
        {"map":"eu_nuts3","name":"European Union - NUTS3 regions","geographycount":"1373","bunny":"307","jvectormap":"eu_nuts3_mill_en","legend":"BL","level":1},
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
        {"map":"us","name":"USA (states)","geographycount":"51","bunny":"235","jvectormap":"us_aea_en","legend":"BR","level":0},
        {"map":"us_counties","name":"US counties","geographycount":"3145","bunny":"235","jvectormap":"us_counties_merc_en","legend":"BR","level":1},
        {"map":"eia_regions","name":"US by EIA statistical regions","geographycount":"10","bunny":"235","jvectormap":"us_aea_en","legend":"BR","level":1,
            redef: {"regions":[{"name":"New England","code":"EIA_NE","components":["US-CT","US-ME","US-MA","US-NH","US-RI","US-VT"]},{"name":"Middle Atlantic","code":"EIA_MA","components":["US-NJ","US-NY","US-PA"]},{"name":"East North Central","code":"EIA_ENC","components":["US-IL","US-IN","US-MI","US-OH","US-WI"]},{"name":"West North Central","code":"EIAWNC","components":["US-IA","US-KS","US-MN","US-MO","US-NE","US-ND","US-SD"]},{"name":"South Atlantic","code":"EIA_SA","components":["US-DE","US-DC","US-FL","US-GA","US-MD","US-NC","US-SC","US-VA","US-WV"]},{"name":"East South Central","code":"EIA_ESC","components":["US-AL","US-KY","US-MS","US-TN"]},{"name":"West South Central","code":"EIA_WSC","components":["US-AR","US-LA","US-OK","US-TX"]},{"name":"Mountain","code":"EIA_MTN","components":["US-AZ","US-CO","US-ID","US-MT","US-NV","US-NM","US-UT","US-WY"]},{"name":"Pacific Contiguous","code":"EIA_PC","components":["US-CA","US-OR","US-WA"]},{"name":"Pacific Noncontiguous","code":"EIA_PNC","components":["US-AK","US-HI"]}]}
        },
        {"map":"padds","name":"US Petroleum Districts","geographycount":"5","bunny":"235","jvectormap":"us_aea_en","legend":"BR","level":1,
            redef: {"regions":[{"name":"PADD I (East Coast)","code":"PADD1","components":["US-CT","US-ME","US-MA","US-NH","US-RI","US-VT","US-DE","US-DC","US-MD","US-NJ","US-NY","US-PA","US-FL","US-GA","US-NC","US-SC","US-VA","US-WV"]},{"name":"PADD II (Midwest)","code":"PADD2","components":["US-IL","US-IN","US-IA","US-KS","US-KY","US-MI","US-MN","US-MO","US-NE","US-ND","US-SD","US-OH","US-OK","US-TN","US-WI"]},{"name":"PADD III (Gulf Coast)","code":"PADD3","components":["US-AL","US-AR","US-LA","US-MS","US-NM","US-TX"]},{"name":"PADD IV (Rocky Mountain)","code":"PADD4","components":["US-CO","US-ID","US-MT","US-UT","US-WY"]},{"name":"PADD V (West Coast)","code":"PADD5","components":["US-AK","US-AZ","US-CA","US-HI","US-NV","US-OR","US-WA"]}]}
        },
        {"map":"padds_sub","name":"US Petroleum Districts - detailed","geographycount":"7","bunny":"235","jvectormap":"us_aea_en","legend":"BR","level":1,
            redef: {"regions":[{"name":"PADD I, Subdistrict A (New England): Connecticut, Maine, Massachusetts, New Hampshire, Rhode Island, and Vermont.","code":"PADD1a","components":["US-CT","US-ME","US-MA","US-NH","US-RI","US-VT"]},{"name":"PADD I, Subdistrict B (Central Atlantic): Delaware, District of Columbia, Maryland, New Jersey, New York, and Pennsylvania.","code":"PADD1b","components":["US-DE","US-DC","US-MD","US-NJ","US-NY","US-PA"]},{"name":"PADD I, Subdistrict C (Lower Atlantic): Florida, Georgia, North Carolina, South Carolina, Virginia, and West Virginia.","code":"PADD1c","components":["US-FL","US-GA","US-NC","US-SC","US-VA","US-WV"]},{"name":"PADD II (Midwest): Illinois, Indiana, Iowa, Kansas, Kentucky, Michigan, Minnesota, Missouri, Nebraska, North Dakota, South Dakota, Ohio, Oklahoma, Tennessee, and Wisconsin.","code":"PADD2","components":["US-IL","US-IN","US-IA","US-KS","US-KY","US-MI","US-MN","US-MO","US-NE","US-ND","US-SD","US-OH","US-OK","US-TN","US-WI"]},{"name":"PADD III (Gulf Coast): Alabama, Arkansas, Louisiana, Mississippi, New Mexico, and Texas","code":"PADD3","components":["US-AL","US-AR","US-LA","US-MS","US-NM","US-TX"]},{"name":"PADD IV (Rocky Mountain): Colorado, Idaho, Montana, Utah, and Wyoming.","code":"PADD4","components":["US-CO","US-ID","US-MT","US-UT","US-WY"]},{"name":"PADD V (West Coast): Alaska, Arizona, California, Hawaii, Nevada, Oregon, and Washington.","code":"PADD5","components":["US-AK","US-AZ","US-CA","US-HI","US-NV","US-OR","US-WA"]}]}
        },
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
        {"map":"pr","name":"Puerto Rico","geographycount":"78","bunny":"181","jvectormap":"pr_merc_en","legend":"BR","level":0},
        {"map":"th","name":"Thailand","geographycount":"76","bunny":"219","jvectormap":"th_mill_en","legend":"BR","level":0},
        {"map":"tr_nuts1","name":"Turkey NUTS1 regions","geographycount":"12","bunny":"227","jvectormap":"tr_nuts1_mill_en","legend":"BL","level":0},
        {"map":"tr_nuts2","name":"Turkey NUTS2 regions","geographycount":"26","bunny":"227","jvectormap":"tr_nuts2_mill_en","legend":"BL","level":0},
        {"map":"tr_nuts3","name":"Turkey NUTS3 regions","geographycount":"81","bunny":"227","jvectormap":"tr_nuts3_mill_en","legend":"BL","level":0},
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
                seriesCloudSearch();
                $divHtml.remove();
                return selectedMap;
            } else {
                $divHtml.remove();
                $('body').unbind('click', handleMapSelect);
                return false;
            }
        }
    };

    MashableData.common.makeMap = function(newMap, fromMap, mapDef){ //makes a new map definition by reconfiguring/merging paths from an existing map
        if(!jvm.Map.maps[newMap] || mapDef){ //don't rerun if this is a standard map that has already been created
            mapDef = mapDef || MashableData.globals.maps[newMap].redef; //if not provided, must be in standard definitions
            fromMap = fromMap || MashableData.globals.maps[newMap].jvectormap; //if not provided, must be in standard definitions

            jvm.Map.maps[newMap] = $.extend(true, {}, jvm.Map.maps[fromMap]);
            var newMapObject = jvm.Map.maps[newMap];
            for(var i=0;i<mapDef.regions.length;i++){
                var regionDef = mapDef.regions[i];
                newMapObject.paths[regionDef.code] = {name: regionDef.name, path: ""};
                for(var j=0;j<regionDef.components.length;j++){
                    if(newMapObject.paths[regionDef.components[j]]){
                        newMapObject.paths[regionDef.code].path += (j==0?'':' ') + newMapObject.paths[regionDef.components[j]].path;
                    } else {
                        //console.info(regionDef.components[j]+' not found in '+mapDef.derivedFrom);
                    }
                    delete newMapObject.paths[regionDef.components[j]];
                }
            }
        }
    };

})();



/*
 insert into mapgeographies
 (select mg.map, gn.geoid
 from geographies g join mapgeographies mg on g.geoid=mg.geoid
 join geographies gn on concat(gn.iso3166_2,'000') = g.iso3166_2
 where g.geoset like 'nuts_' and g.iso3166_2 like '%000');

 delete from mapgeographies where geoid in (
 select g.geoid
 from geographies g where g.geoset like 'nuts_' and g.iso3166_2 like '%000'
 );

 delete from geographies where geoset like 'nuts_' and iso3166_2 like '%000';*/
