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
 *  1. freq = A, M;
 *  2. $reporting countries = world + 14 largest economies / media markets
 *  3. $partners = universe of 254 countries and geographies (including world)
 *
 * locked:
 *  freq = M (skip A)
 *  flows: imports and exports (skip re-import and re-export)  http://comtrade.un.org/data/cache/tradeRegimes.json
 *   2-digit classifications = 98 <-
 *   4-digit classifications = 1259 (averaging 13 per 2-digit class)
 *   6-digit classifications = 6294 (averaging 5 per 4-digit class)
 *  cc=all = all 7,656 commodity codes
 *  px: classification not specified = defaults to HS Harmonized System (HS)
 *  ps: periods are determined by $period array and must be manually change to start a new cycle (note "recent" fetches 5 most recent periods that have data for requested freq)
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
$periodicities = [
    ["freq" => "A", "ps"=> "recent"],
    ["freq" => "M", "ps"=> "recent"],
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
/*
    This crawler is intended to be kicked off every hour and makes 100 data fetches from the UNCOMM Trade API.  The nested loops are reporter >  partners for most recent Annual, than monthly data.
    The periods request are controlled by the $annualPeriods and $monthlyPeriods global variables, which are hard coded for now.
    The current position in the grand loop is stored in the last  apirun's runson;  each jobJSON for this apiid=9.  The
    fatalAdmin email occurs when loop is complete for the current periods.

*/
    global $reporting, $partners, $periodicities, $dataFolder, $db;

    //get the runid and the starting configurations
    $apiid = $api_row["appid"];
    if(isset($api_row["runid"])){
        //new run
        $runId = $api_row["runid"];
        $runIndexes = [
            "freq"=>0,
            "reporter"=>0,
            "partner"=>0,
        ];
        $jobjson = json_encode($runIndexes);
    } else {
        //no runid = "Continue" command = get last run
        $result = runQuery("select max(runid) as lastrunid from apiruns where apiid=$apiid");
        $row = $result->fetch_assoc();
        if($row["lastrunid"]) {
            $runId = $row["lastrunid"];
            $result = runQuery("select * from apiruns where runid = $row[lastrunid]");
            $run_row = $result->fetch_assoc();
            $jobjson = $run_row["runjson"];
            $runIndexes = json_decode($jobjson, true);
        } else {
            emailAdminFatal("fatal UNCOMMTRADE error","no apirun to Continue for apiid=$apiid");
        }
    }
    //marked as successful at end of run
    $result = runQuery("insert into apirunjobs (runid, jobjson, status, startdt) values ($runId, '$jobjson', 'F', now())");
    $jobId = $db->insert_id;

    $counts = [];
    $maxRecords = 0;
    $NetWeights = 0;


    $unApiCallCount = 0; //max possible records = 2 flows * 7656 commodities * 5 partners * 5 recent periods = 378,000 records, but in practise much less.  US to world = 50k records; EU to world = 38k records
    $status = ["skipped"=>0, "added"=>0, "failed"=>0,"updated"=>0];
    $PARTNERS_PER_REQUEST = 5;
    $MAX_CALLS_PER_HOUR = 100;
    $UNCOMM_TRADE_URL = "http://comtrade.un.org/";

    for($iFreq = $runIndexes["freq"]; $iFreq < count($periodicities); $iFreq++){
        $frequency = $periodicities[$iFreq];
        for($iReporter = $runIndexes["reporter"]; $iReporter < count($reporting); $iReporter++){
            $reporter = $reporting[$iReporter];
            $iPartner = 0;
            print("<b>Reporter".$reporter["text"]."</b><br>");
            $reporterGeography = nameLookup($reporter["text"]);
/*            $counts[$reporter["text"]] = [
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
            ];*/
            $reporterId = $reporter["id"];
            for($iPartner = $runIndexes["partner"]; $iPartner < count($reporting); $iPartner += $PARTNERS_PER_REQUEST){
                if($unApiCallCount >= $MAX_CALLS_PER_HOUR){
                    //end this command
                    runQuery("update apirunjobs set status='S', enddt=now() where jobid = $jobId");
                    ApiRunFinished($api_row);  //update the counts, freqs, maps, and ghandles
                    return;
                }

                $slicePartners = array_slice($partners, $iPartner, $PARTNERS_PER_REQUEST);
                $apIds = [];
                foreach($slicePartners as $partner){
                    array_push($apIds, $partner["id"]);
                }
                $spIds = implode(",", $apIds);
                $freq = $periodicities[$iFreq]["freq"];
                $periods = $periodicities[$iFreq]["ps"];
                $url = "http://comtrade.un.org/api/get?r=$reporterId&p=".$spIds."&max=100000&cc=ALL&rg=1,2&freq=$freq&ps=$periods&fmt=csv";
                //cc = commodity codes; rg= imports and exports; ps = period (recent = 5 most recent reporting periods)
                //fmt=csv because resulting download is less than 1/3 = faster + no json_decode with large memory requirements
                //example of US to first 5: http://comtrade.un.org/api/get?r=842&p=0,4,8,12,20&max=100000&cc=ALL&rg=1,2&freq=M&ps=recent&fmt=json

                $iPartner += $PARTNERS_PER_REQUEST;
                $unApiCallCount++;

                //wget works whereas the php curl and fopen command fails (similar to eurostat)
                $outputfile = $dataFolder . "undata".microtime(true).".csv";
                $cmd = "wget -q \"$url\" -O $outputfile";
                print($url);
                print(exec($cmd));

                $fp = fopen($outputfile, 'r');
                $header = fgetcsv($fp);
                if(implode(",",$header) != "Classification,Year,Period,Period Desc.,Aggregate Level,Is Leaf Code,Trade Flow Code,Trade Flow,Reporter Code,Reporter,Reporter ISO,Partner Code,Partner,Partner ISO,Commodity Code,Commodity,Qty Unit Code,Qty Unit,Qty,Netweight (kg),Trade Value (US$),Flag")
                    emailAdminFatal("UN Commtrade fatal error","unrecognized header". preprint($header));
                print("<PRE>CSV header: ".print_r($header, true)."</PRE>");
                $recordCount = 0;
                $collation = [];  //each CSV return is collated by flow, commodity (set), partner (series), periods (setdata array) before any saves to the database because periods are not together and sets are not together.  This will greatly reduced DB operations
                while(!feof($fp)){
                    $record = fgetcsv($fp);
                    $recordCount++;
                    //if($recordCount<10){print($recordCount); print_r($record);}
                    $partnerName = $record[array_search("Partner", $header, true)];
                    $aggregateLevel = $record[array_search("Aggregate Level", $header)];
                    $commodityCode = $record[array_search("Commodity Code", $header)];
                    $commodityName = $record[array_search("Commodity", $header)];
                    $period = $record[array_search("Period", $header)];
                    $tradeFlow = strtolower($record[array_search("Trade Flow", $header)]);
                    $value = trim($record[array_search("Trade Value (US$)", $header)]);
                    $weight = trim($record[array_search("Netweight (kg)", $header)]);



                    if(!isset($collation[$tradeFlow])) $collation[$tradeFlow] = [];
                    $commodityKey = "HS" . sprintf("%06d", $commodityCode);
                    if(!isset($collation[$tradeFlow][$commodityKey])) $collation[$tradeFlow][$commodityKey] = [
                        "commodityCode" => $commodityCode,
                        "commodityName" => $commodityName,
                        "level" => $aggregateLevel,
                        "partners" => [],
                    ];

                    if(!isset($collation[$tradeFlow][$commodityKey]["partners"][$partnerName])) $collation[$tradeFlow][$commodityKey]["partners"][$partnerName] = [
                        "id"=> $record[array_search("Partner Code", $header, true)],
                        "value" => [],
                        "weight" => [],
                    ];
                    if(is_numeric($value)) $collation[$tradeFlow][$commodityKey]["partners"][$partnerName]["value"][] = [$period . ":" . $value];
                    if(is_numeric($weight)) $collation[$tradeFlow][$commodityKey]["partners"][$partnerName]["weight"][] = [$period . ":" . $weight];
                }
                if($recordCount>=99999) emailAdminFatal("UN CommTrade fatal error", "Maximum recordcount exceeded for $url");
                unlink($outputfile);

                //save the collation's sets, setdata and categories
                foreach($collation as $tradeFlow => &$flowData){
                    asort($flowData);  //make sure the commodity keys are ordered
                    $valueSetId = null;
                    $weightSetId = null;
                    $tradeCatId = setCategoryById($apiid, $tradeFlow, $tradeFlow, "HS"); //harmonized system = root UN Comm Trade apicatid
                    foreach($flowData as $commodityKey => &$commodityData) {
                        if($commodityData["level"] == 2){
                            //root level aggregate
                            $commodityCatId = setCategoryById($apiid, $tradeFlow, $tradeFlow, $tradeFlow);
                        } else {
                            //else 
                        }
                        foreach($commodityData["partners"] as $partnerName => &$partnerData){
                            $partnerGeoId = nameLookup($partnerName);
                            if(!$partnerGeoId) emailAdminFatal("UN CommTrade fatal error", "Unable to found geogrpahy for $partnerName");
                            if(count($partnerData["value"])) {
                                if (!$valueSetId) {
                                    $valueKey = $reporterId . "-" . $tradeFlow . "-" . $commodityKey . "-USD";
                                    $name = "$reporterGeography[name] $tradeFlow of $commodityData[name]";
                                    $valueSetId = saveSet($apiid, $valueKey, $name, "US Dollars", $api_row["name"], $UNCOMM_TRADE_URL, "", "", "null", "", null, "M");
                                }
                                saveSetData($status, $valueSetId, null, null, $freq, $partnerGeoId, "", $partnerData["value"]);
                            }
                            if(count($partnerData["weight"])) {
                                if (!$valueSetId) {
                                    $valueKey = $reporterId . "-" . $tradeFlow . "-" . $commodityKey . "-KG";
                                    $name = "$reporterGeography[name] $tradeFlow of $commodityData[name]";
                                    $valueSetId = saveSet($apiid, $valueKey, $name, "kg (net)", $api_row["name"], $UNCOMM_TRADE_URL, "", "", "null", "", null, "M");
                                    $valueCatId = setCategoryById();
                                }
                                saveSetData($status, $valueSetId, null, null, $freq, $partnerGeoId, "", $partnerData["value"]);
                            }
                        }
                    }
                }



                printNow("Precessed $recordCount records");
                sleep(1);
            }
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