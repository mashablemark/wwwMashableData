<?php
/**
 * Created by PhpStorm.
 * User=> MEL
 * Date=> 8/7/14
 * http://comtrade.un.org/api/get?r=0&p=0,4,8,12,20&max=100000&cc=ALL&rg=1,2&freq=M&ps=recent
 */

/**
 * Created by MEL on 8/6/14.
 *
 * apiid = 10
 * UNCOMM trade API documentation:  http://comtrade.un.org/data/doc/api/
 * limits = 1 call per second & 100 calls per hour per IP of 50,000 records max
 * nested loops through:
 *  A. $reporting countries = world + 14 largest economies / media markets
 *  B. $partners = universe of 254 countries and geographies (including world)
 *
 * locked:
 *  freq = M (skip A)
 *  flows: imports and exports (skip re-import and re-export)  http://comtrade.un.org/data/cache/tradeRegimes.json
 *   2-digit classifications = 98 <-
 *   4-digit classifications = 1259 (averaging 13 per 2-digit class)
 *   6-digit classifications = 6294 (averaging 5 per 4-digit class)
 *  cc=all = all 7,656 commodity codes
 *  px: classification not specified = defaults to HS Harmonized System (HS)
 *  ps=recent: 5 most recent periods (months) that have data
 *
 * OHV server currently has 1 IP.  16 IP address cost $260 per year.  Free trial at http://www.ntrepidcorp.com/ion/
 *
 */


//CONSTANTS
$dataFolder = "bulkfiles/un/";
$flows = [
    "imports"=> 1,
    "exports"=> 2
];
$reporting = [
    ["id"=> "0","text"=> "World"],
    ["id"=> "97","text"=>  "EU-28"],
    ["id"=> "251","text"=>  "France"],
    ["id"=> "842","text"=>  "USA"],
    ["id"=> "276","text"=>  "Germany"],
    ["id"=> "381","text"=>  "Italy"],
    ["id"=> "36","text"=>  "Australia"],
    ["id"=> "40","text"=>  "Austria"],
    ["id"=> "724","text"=>  "Spain"],
    ["id"=> "826","text"=>  "United Kingdom"],
    ["id"=> "554","text"=>  "New Zealand"],
    ["id"=> "76","text"=>  "Brazil"],
    ["id"=> "643","text"=>  "Russian Federation"],
    ["id"=> "699","text"=>  "India"],
    ["id"=> "156","text"=>  "China"],
];
$partners =  [
    //["id"=> "all","text"=> "All"],  all is not a "World total", rather it is all valid partners codes in single request = too big!
    ["id"=> "0","text"=> "World"],
    ["id"=> "4","text"=> "Afghanistan"],
    ["id"=> "8","text"=> "Albania"],
    ["id"=> "12","text"=> "Algeria"],
    ["id"=> "20","text"=> "Andorra"],
    ["id"=> "24","text"=> "Angola"],
    ["id"=> "660","text"=> "Anguilla"],
    ["id"=> "28","text"=> "Antigua and Barbuda"],
    ["id"=> "32","text"=> "Argentina"],
    ["id"=> "51","text"=> "Armenia"],
    ["id"=> "533","text"=> "Aruba"],
    ["id"=> "36","text"=> "Australia"],
    ["id"=> "40","text"=> "Austria"],
    ["id"=> "31","text"=> "Azerbaijan"],
    ["id"=> "44","text"=> "Bahamas"],
    ["id"=> "48","text"=> "Bahrain"],
    ["id"=> "50","text"=> "Bangladesh"],
    ["id"=> "52","text"=> "Barbados"],
    ["id"=> "112","text"=> "Belarus"],
    ["id"=> "56","text"=> "Belgium"],
    ["id"=> "58","text"=> "Belgium-Luxembourg"],
    ["id"=> "84","text"=> "Belize"],
    ["id"=> "204","text"=> "Benin"],
    ["id"=> "60","text"=> "Bermuda"],
    ["id"=> "64","text"=> "Bhutan"],
    ["id"=> "68","text"=> "Bolivia (Plurinational State of)"],
    ["id"=> "535","text"=> "Bonaire"],
    ["id"=> "70","text"=> "Bosnia Herzegovina"],
    ["id"=> "72","text"=> "Botswana"],
    ["id"=> "92","text"=> "Br. Virgin Isds"],
    ["id"=> "76","text"=> "Brazil"],
    ["id"=> "96","text"=> "Brunei Darussalam"],
    ["id"=> "100","text"=> "Bulgaria"],
    ["id"=> "854","text"=> "Burkina Faso"],
    ["id"=> "108","text"=> "Burundi"],
    ["id"=> "132","text"=> "Cabo Verde"],
    ["id"=> "116","text"=> "Cambodia"],
    ["id"=> "120","text"=> "Cameroon"],
    ["id"=> "124","text"=> "Canada"],
    ["id"=> "136","text"=> "Cayman Isds"],
    ["id"=> "140","text"=> "Central African Rep."],
    ["id"=> "148","text"=> "Chad"],
    ["id"=> "152","text"=> "Chile"],
    ["id"=> "156","text"=> "China"],
    ["id"=> "344","text"=> "China, Hong Kong SAR"],
    ["id"=> "446","text"=> "China, Macao SAR"],
    ["id"=> "170","text"=> "Colombia"],
    ["id"=> "174","text"=> "Comoros"],
    ["id"=> "178","text"=> "Congo"],
    ["id"=> "184","text"=> "Cook Isds"],
    ["id"=> "188","text"=> "Costa Rica"],
    ["id"=> "384","text"=> "Cote d'Ivoire"],
    ["id"=> "191","text"=> "Croatia"],
    ["id"=> "192","text"=> "Cuba"],
    ["id"=> "531","text"=> "Curasao"],
    ["id"=> "196","text"=> "Cyprus"],
    ["id"=> "203","text"=> "Czech Rep."],
    ["id"=> "200","text"=> "Czechoslovakia"],
    ["id"=> "408","text"=> "Dem. People's Rep. of Korea"],
    ["id"=> "180","text"=> "Dem. Rep. of the Congo"],
    ["id"=> "208","text"=> "Denmark"],
    ["id"=> "262","text"=> "Djibouti"],
    ["id"=> "212","text"=> "Dominica"],
    ["id"=> "214","text"=> "Dominican Rep."],
    ["id"=> "588","text"=> "East and West Pakistan"],
    ["id"=> "218","text"=> "Ecuador"],
    ["id"=> "818","text"=> "Egypt"],
    ["id"=> "222","text"=> "El Salvador"],
    ["id"=> "226","text"=> "Equatorial Guinea"],
    ["id"=> "232","text"=> "Eritrea"],
    ["id"=> "233","text"=> "Estonia"],
    ["id"=> "231","text"=> "Ethiopia"],
    ["id"=> "97","text"=> "EU-28"],
    ["id"=> "234","text"=> "Faeroe Isds"],
    ["id"=> "238","text"=> "Falkland Isds (Malvinas)"],
    ["id"=> "242","text"=> "Fiji"],
    ["id"=> "246","text"=> "Finland"],
    ["id"=> "886","text"=> "Fmr Arab Rep. of Yemen"],
    ["id"=> "278","text"=> "Fmr Dem. Rep. of Germany"],
    ["id"=> "866","text"=> "Fmr Dem. Rep. of Vietnam"],
    ["id"=> "720","text"=> "Fmr Dem. Yemen"],
    ["id"=> "230","text"=> "Fmr Ethiopia"],
    ["id"=> "280","text"=> "Fmr Fed. Rep. of Germany"],
    ["id"=> "582","text"=> "Fmr Pacific Isds"],
    ["id"=> "590","text"=> "Fmr Panama, excl.Canal Zone"],
    ["id"=> "592","text"=> "Fmr Panama-Canal-Zone"],
    ["id"=> "868","text"=> "Fmr Rep. of Vietnam"],
    ["id"=> "717","text"=> "Fmr Rhodesia Nyas"],
    ["id"=> "736","text"=> "Fmr Sudan"],
    ["id"=> "835","text"=> "Fmr Tanganyika"],
    ["id"=> "810","text"=> "Fmr USSR"],
    ["id"=> "890","text"=> "Fmr Yugoslavia"],
    ["id"=> "836","text"=> "Fmr Zanzibar and Pemba Isd"],
    ["id"=> "251","text"=> "France"],
    ["id"=> "254","text"=> "French Guiana"],
    ["id"=> "258","text"=> "French Polynesia"],
    ["id"=> "583","text"=> "FS Micronesia"],
    ["id"=> "266","text"=> "Gabon"],
    ["id"=> "270","text"=> "Gambia"],
    ["id"=> "268","text"=> "Georgia"],
    ["id"=> "276","text"=> "Germany"],
    ["id"=> "288","text"=> "Ghana"],
    ["id"=> "292","text"=> "Gibraltar"],
    ["id"=> "300","text"=> "Greece"],
    ["id"=> "304","text"=> "Greenland"],
    ["id"=> "308","text"=> "Grenada"],
    ["id"=> "312","text"=> "Guadeloupe"],
    ["id"=> "320","text"=> "Guatemala"],
    ["id"=> "324","text"=> "Guinea"],
    ["id"=> "624","text"=> "Guinea-Bissau"],
    ["id"=> "328","text"=> "Guyana"],
    ["id"=> "332","text"=> "Haiti"],
    ["id"=> "336","text"=> "Holy See (Vatican City State)"],
    ["id"=> "340","text"=> "Honduras"],
    ["id"=> "348","text"=> "Hungary"],
    ["id"=> "352","text"=> "Iceland"],
    ["id"=> "699","text"=> "India"],
    ["id"=> "356","text"=> "India, excl. Sikkim"],
    ["id"=> "360","text"=> "Indonesia"],
    ["id"=> "364","text"=> "Iran"],
    ["id"=> "368","text"=> "Iraq"],
    ["id"=> "372","text"=> "Ireland"],
    ["id"=> "376","text"=> "Israel"],
    ["id"=> "381","text"=> "Italy"],
    ["id"=> "388","text"=> "Jamaica"],
    ["id"=> "392","text"=> "Japan"],
    ["id"=> "400","text"=> "Jordan"],
    ["id"=> "398","text"=> "Kazakhstan"],
    ["id"=> "404","text"=> "Kenya"],
    ["id"=> "296","text"=> "Kiribati"],
    ["id"=> "414","text"=> "Kuwait"],
    ["id"=> "417","text"=> "Kyrgyzstan"],
    ["id"=> "418","text"=> "Lao People's Dem. Rep."],
    ["id"=> "428","text"=> "Latvia"],
    ["id"=> "422","text"=> "Lebanon"],
    ["id"=> "426","text"=> "Lesotho"],
    ["id"=> "430","text"=> "Liberia"],
    ["id"=> "434","text"=> "Libya"],
    ["id"=> "440","text"=> "Lithuania"],
    ["id"=> "442","text"=> "Luxembourg"],
    ["id"=> "450","text"=> "Madagascar"],
    ["id"=> "454","text"=> "Malawi"],
    ["id"=> "458","text"=> "Malaysia"],
    ["id"=> "462","text"=> "Maldives"],
    ["id"=> "466","text"=> "Mali"],
    ["id"=> "470","text"=> "Malta"],
    ["id"=> "584","text"=> "Marshall Isds"],
    ["id"=> "474","text"=> "Martinique"],
    ["id"=> "478","text"=> "Mauritania"],
    ["id"=> "480","text"=> "Mauritius"],
    ["id"=> "175","text"=> "Mayotte"],
    ["id"=> "484","text"=> "Mexico"],
    ["id"=> "496","text"=> "Mongolia"],
    ["id"=> "499","text"=> "Montenegro"],
    ["id"=> "500","text"=> "Montserrat"],
    ["id"=> "504","text"=> "Morocco"],
    ["id"=> "508","text"=> "Mozambique"],
    ["id"=> "104","text"=> "Myanmar"],
    ["id"=> "580","text"=> "N. Mariana Isds"],
    ["id"=> "516","text"=> "Namibia"],
    ["id"=> "524","text"=> "Nepal"],
    ["id"=> "530","text"=> "Neth. Antilles"],
    ["id"=> "532","text"=> "Neth. Antilles and Aruba"],
    ["id"=> "528","text"=> "Netherlands"],
    ["id"=> "540","text"=> "New Caledonia"],
    ["id"=> "554","text"=> "New Zealand"],
    ["id"=> "558","text"=> "Nicaragua"],
    ["id"=> "562","text"=> "Niger"],
    ["id"=> "566","text"=> "Nigeria"],
    ["id"=> "579","text"=> "Norway"],
    ["id"=> "512","text"=> "Oman"],
    ["id"=> "490","text"=> "Other Asia, nes"],
    ["id"=> "586","text"=> "Pakistan"],
    ["id"=> "585","text"=> "Palau"],
    ["id"=> "591","text"=> "Panama"],
    ["id"=> "598","text"=> "Papua New Guinea"],
    ["id"=> "600","text"=> "Paraguay"],
    ["id"=> "459","text"=> "Peninsula Malaysia"],
    ["id"=> "604","text"=> "Peru"],
    ["id"=> "608","text"=> "Philippines"],
    ["id"=> "616","text"=> "Poland"],
    ["id"=> "620","text"=> "Portugal"],
    ["id"=> "634","text"=> "Qatar"],
    ["id"=> "410","text"=> "Rep. of Korea"],
    ["id"=> "498","text"=> "Rep. of Moldova"],
    ["id"=> "638","text"=> "Reunion"],
    ["id"=> "642","text"=> "Romania"],
    ["id"=> "643","text"=> "Russian Federation"],
    ["id"=> "646","text"=> "Rwanda"],
    ["id"=> "647","text"=> "Ryukyu Isd"],
    ["id"=> "461","text"=> "Sabah"],
    ["id"=> "654","text"=> "Saint Helena"],
    ["id"=> "659","text"=> "Saint Kitts and Nevis"],
    ["id"=> "658","text"=> "Saint Kitts, Nevis and Anguilla"],
    ["id"=> "662","text"=> "Saint Lucia"],
    ["id"=> "534","text"=> "Saint Maarten"],
    ["id"=> "666","text"=> "Saint Pierre and Miquelon"],
    ["id"=> "670","text"=> "Saint Vincent and the Grenadines"],
    ["id"=> "882","text"=> "Samoa"],
    ["id"=> "674","text"=> "San Marino"],
    ["id"=> "678","text"=> "Sao Tome and Principe"],
    ["id"=> "457","text"=> "Sarawak"],
    ["id"=> "682","text"=> "Saudi Arabia"],
    ["id"=> "686","text"=> "Senegal"],
    ["id"=> "688","text"=> "Serbia"],
    ["id"=> "891","text"=> "Serbia and Montenegro"],
    ["id"=> "690","text"=> "Seychelles"],
    ["id"=> "694","text"=> "Sierra Leone"],
    ["id"=> "702","text"=> "Singapore"],
    ["id"=> "703","text"=> "Slovakia"],
    ["id"=> "705","text"=> "Slovenia"],
    ["id"=> "711","text"=> "So. African Customs Union"],
    ["id"=> "90","text"=> "Solomon Isds"],
    ["id"=> "706","text"=> "Somalia"],
    ["id"=> "710","text"=> "South Africa"],
    ["id"=> "728","text"=> "South Sudan"],
    ["id"=> "724","text"=> "Spain"],
    ["id"=> "144","text"=> "Sri Lanka"],
    ["id"=> "275","text"=> "State of Palestine"],
    ["id"=> "729","text"=> "Sudan"],
    ["id"=> "740","text"=> "Suriname"],
    ["id"=> "748","text"=> "Swaziland"],
    ["id"=> "752","text"=> "Sweden"],
    ["id"=> "757","text"=> "Switzerland"],
    ["id"=> "760","text"=> "Syria"],
    ["id"=> "762","text"=> "Tajikistan"],
    ["id"=> "807","text"=> "TFYR of Macedonia"],
    ["id"=> "764","text"=> "Thailand"],
    ["id"=> "626","text"=> "Timor-Leste"],
    ["id"=> "768","text"=> "Togo"],
    ["id"=> "772","text"=> "Tokelau"],
    ["id"=> "776","text"=> "Tonga"],
    ["id"=> "780","text"=> "Trinidad and Tobago"],
    ["id"=> "788","text"=> "Tunisia"],
    ["id"=> "792","text"=> "Turkey"],
    ["id"=> "795","text"=> "Turkmenistan"],
    ["id"=> "796","text"=> "Turks and Caicos Isds"],
    ["id"=> "798","text"=> "Tuvalu"],
    ["id"=> "800","text"=> "Uganda"],
    ["id"=> "804","text"=> "Ukraine"],
    ["id"=> "784","text"=> "United Arab Emirates"],
    ["id"=> "826","text"=> "United Kingdom"],
    ["id"=> "834","text"=> "United Rep. of Tanzania"],
    ["id"=> "858","text"=> "Uruguay"],
    ["id"=> "850","text"=> "US Virgin Isds"],
    ["id"=> "842","text"=> "USA"],
    ["id"=> "841","text"=> "USA (before 1981)"],
    ["id"=> "860","text"=> "Uzbekistan"],
    ["id"=> "548","text"=> "Vanuatu"],
    ["id"=> "862","text"=> "Venezuela"],
    ["id"=> "704","text"=> "Viet Nam"],
    ["id"=> "876","text"=> "Wallis and Futuna Isds"],
    ["id"=> "887","text"=> "Yemen"],
    ["id"=> "894","text"=> "Zambia"],
    ["id"=> "716","text"=> "Zimbabwe"]
];

function ApiCrawl($catid, $api_row){
global $reporting, $partners, $flows, $dataFolder;
    $counts = [];
    $maxRecords = 0;
    $NetWeights = 0;
    foreach($reporting as $reporter){
        $iPartner = 0;
        $callSize = 5; //number of partner countries per request
        //max possible records = 2 flows * 7656 commodities * 5 partners * 5 recent periods = 378,000 records, but in practise
        print("<b>".$reporter["text"]."</b><br>");
        $counts[$reporter["text"]] = [
            "Export"=> [
                "L2"=>0,
                "L4"=>0,
                "L5"=>0,
                "L6"=>0,
                "NetWeight"=>0,
            ],
            "Import"=> [
                "L2"=>0,
                "L4"=>0,
                "L5"=>0,
                "L6"=>0,
                "NetWeight"=>0,
            ]
        ];
        $reporterId = $reporter["id"];
        $thisCounts =& $counts[$reporter["text"]];
        while($iPartner < count($partners)){
            $slicePartners = array_slice($partners, $iPartner, $callSize);
            $apIds = [];
            foreach($slicePartners as $partner){
                array_push($apIds, $partner["id"]);
            }
            $spIds = implode(",", $apIds);

            $url = "http://comtrade.un.org/api/get?r=$reporterId&p=".$spIds."&max=100000&cc=ALL&rg=1,2&freq=M&ps=recent&fmt=csv";
            //cc = commodity codes; rg= imports and exports; ps = period (recent = 5 most recent reporting periods)
            //fmt=csv because resulting download is less than 1/3 = faster + no json_decode with large memory requirements
            $iPartner += $callSize;

            //wget works whereas the php curl and fopen command fails (similar to eurostat)
            $outputfile = $dataFolder . "undata".microtime(true).".csv";
            $cmd = "wget -q \"$url\" -O $outputfile";
            print($url);
            print(exec($cmd));
            die();
            $recordCount = 0;

            $fp = fopen($outputfile, 'r');
            $header = fgetcsv($fp);
            print("<PRE>CSV header: ".print_r($header, true)."</PRE>");
            while(!feof($fp)){
                $record = fgetcsv($fp);
                if($recordCount<10){print($recordCount++); print_r($record);}

                //$rISO = $record["rt3ISO"];
                //$pISO = $record["pt3ISO"];
                $commCode = $record["cmdCode"];
                $flow = $record["rgDesc"];
                /*if(!isset($thisCounts[$pISO])){
                    $thisCounts[$pISO] = [];
                }*/
                $level = "L".strlen($commCode);
                if($record["TradeValue"]) $thisCounts[$flow][$level]++;
                if($record["NetWeight"]) $thisCounts[$flow]["NetWeight"]++;
            }
            if($recordCount>49999) print("Maximum recordcount reached for $url<br>");
            print($recordCount ." records<BR>");
            unlink($outputfile);
            sleep(1);
        }
    }
}


function ApiRunFinished($api_run){
    set_time_limit(200);
    setGhandlesFreqsFirstLast($api_run["apiid"]);
    set_time_limit(200);
    setMapsetCounts("all", $api_run["apiid"]);
}


function recordValue($field) {
    global $record, $header;
    $fieldIndex = array_search($field, $header);
    return $record[$fieldIndex];
}