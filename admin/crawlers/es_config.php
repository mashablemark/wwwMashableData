<?php
//master ingest list used by eurostats.php
//hand picks dataset (groups) and optionally (1) corrects name, (2) sets units or indicates CL to use, (3) indicate hierarchy within CL, including total and no-viz codes
/*[
    "codes"=> ["hlth_cd_ynrt","hlth_cd_ynrm","hlth_cd_ynrf"],  //REQUIRED: one or more codes that will be consolidated into a single theme combining mapsets if TSV spans geo or by combining cubes if spans non-geo code list, such as sex
    "theme_name"=> "crude death rate", //overrides the TOC name.  Default is the name of codes[0] with "NUTS" references removed
    "mapping"=> [ //help with code list if needed.  Dimensionality follows order below or cell[0,0} if this section is missing
        "CL_AGE"=> [ //one or more CL abbreviations in the first cell of the first row whose default need defining
            "name"=> "English name override",  //
            "rootCode" =>  "T",  //default CL total code is "TOTAL" if exists
            "ex"=> ["85+"],  //list of codes to exclude from the cube viz, but still ingested
            "hierarchy" => [ //overrides "rootCode" and "exclude" values; cubes made from hierarchies (>1 and <50)
                "R patents" => ["a","b","c"],
                "D type patents" => ["x","y","z"]
            ],
            "shorts" => [ //name adjustments
                "R" => "manufacturing patents"
            ]
        ],

    ],
    "units"=> "persons",  //units string or code list name (e.g. "CL_TYPE") that is actually a units field.  Default = <units> || "CL_UNIT" || "CL_CURRENCY"
    "cube"=> true  //make viz cubes records for theme. defaults to true if missing
]*/

//default code list hierarchies (array_merge_recursive() with any code specific values in $config)
$cl_config = [
    "CL_SEX" => [  //!!! will not produce cubes with sex if no UNK component
        "hierarchy" => ["T" => ["M","F","UNK"]],
        "renames" => [ //name adjustments
            "UNK" => "Sex unknown", //e.g. migr_asyappctza
            "NAP" => null, //null = don't show anything (avoid hanging comma separator) form ef_ogadsexage
            "Y" => null //null = don't show anything (avoid hanging comma separator) form ef_ogadsexage
        ]
        //other codes:
        //  DIFF = Absolute difference between males and females (ilc_pnp9)
    ],
    "CL_SEX:basic" => [
        "hierarchy" => ["T" => ["M","F"]],
       /* "renames" => [ //name adjustments
            "T" => null, //null = don't show anything (avoid hanging comma separator)
        ]*/
        //other codes:
        //  DIFF = Absolute difference between males and females (ilc_pnp9)
    ],
    "CL_ICD10:hlth_cd_acdr" => [
        "hierarchy" => [
            "A-R_V-Y" => //"All causes of death (A00-Y89) excluding S00-T98",
                [
                    "A_B" => //"Certain infectious and parasitic diseases (A00-B99)",
                        [
                            "A15-A19_B90", //"Tuberculosis",
                            "B15-B19_B942", //"Viral hepatitis",
                            "B20-B24", //"Human immunodeficiency virus [HIV] disease",
                            "A_B_OTH" //"Other infectious and parasitic diseases (remainder of A00-B99)",
                        ],
                    "C00-D48"=> //"Neoplasms",
                        [
                            "C"=> //"Malignant neoplasms (C00-C97)",
                                [
                                    "C00-C14", //"Malignant neoplasm of lip, oral cavity, pharynx",
                                    "C15", //"Malignant neoplasm of oesophagus",
                                    "C16", //"Malignant neoplasm of stomach",
                                    "C18-C21", //"Malignant neoplasm of colon, rectosigmoid junction, rectum, anus and anal canal",
                                    "C22", //"Malignant neoplasm of liver and intrahepatic bile ducts",
                                    "C25", //"Malignant neoplasm of pancreas",
                                    "C32", //"Malignant neoplasm of larynx",
                                    "C33_C34", //"Malignant neoplasm of trachea, bronchus and lung",
                                    "C43", //"Malignant melanoma of skin",
                                    "C50", //"Malignant neoplasm of breast",
                                    "C53", //"Malignant neoplasm of cervix uteri",
                                    "C54_C55", //"Malignant neoplasm of other parts of uterus",
                                    "C56", //"Malignant neoplasm of ovary",
                                    "C61", //"Malignant neoplasm of prostate",
                                    "C64", //"Malignant neoplasm of kidney, except renal pelvis",
                                    "C67", //"Malignant neoplasm of bladder",
                                    "C70-C72", //"Malignant neoplasm of brain and central nervous system",
                                    "C73", //"Malignant neoplasm of thyroid gland",
                                    "C81-C85", //"Hodgkin disease and lymphomas",
                                    "C91-C95", //"Leukaemia",
                                    "C88_C90_C96", //"Other malignant neoplasm of lymphoid, haematopoietic and related tissue",
                                    "C_OTH", //"Other malignant neoplasms (remainder of C00-C97)",
                                ],
                            "D00-D48", //"Non-malignant neoplasms (benign and uncertain)",
                        ],
                    "D50-D89", //"Diseases of the blood and blood-forming organs and certain disorders involving the immune mechanism",
                    "E"=> //"Endocrine, nutritional and metabolic diseases (E00-E90)",
                        [
                            "E10-E14", //"Diabetes mellitus",
                            "E_OTH", //"Other endocrine, nutritional and metabolic diseases (remainder of E00-E90)",
                        ],
                    "F"=> //"Mental and behavioural disorders (F00-F99)",
                        [
                            "F01_F03", //"Dementia",
                            "F10", //"Mental and behavioural disorders due to use of alcohol",
                            "TOXICO", //"Drug dependence, toxicomania (F11-F16, F18-F19)",
                            "F_OTH", //"Other mental and behavioural disorders (remainder of F00-F99)",
                        ],
                    "G_H"=> //"Diseases of the nervous system and the sense organs (G00-H95)",
                        [
                            "G20", //"Parkinson disease",
                            "G30", //"Alzheimer disease",
                            "G_H_OTH", //"Other diseases of the nervous system and the sense organs (remainder of G00-H95)",
                        ],
                    "I"=> //"Diseases of the circulatory system (I00-I99)",
                        [
                            "I20-I25", //"Ischaemic heart diseases",
                            "I21_I22", //"Acute myocardial infarction including subsequent myocardial infarction",
                            "I20_I23-I25", //"Other ischaemic heart diseases",
                            "I30-I51", //"Other heart diseases",
                            "I60-I69", //"Cerebrovascular diseases",
                            "I_OTH", //"Other diseases of the circulatory system (remainder of I00-I99)",
                        ],
                    "J"=> //"Diseases of the respiratory system (J00-J99)",
                        [
                            "J09-J11", //"Influenza",
                            "J12-J18", //"Pneumonia",
                            "J40-J47", //"Chronic lower respiratory diseases",
                            "J45_J46", //"Asthma and status asthmaticus",
                            "J40-J44_J47", //"Other lower respiratory diseases",
                            "J_OTH", //"Other diseases of the respiratory system (remainder of J00-J99)",
                        ],
                    "K"=> //"Diseases of the digestive system (K00-K93)",
                        [
                            "K25-K28", //"Ulcer of stomach, duodenum and jejunum",
                            "K70_K73_K74", //"Chronic liver disease",
                            "K_OTH", //"Other diseases of the digestive system (remainder of K00-K93)",
                        ],
                    "L", //"Diseases of the skin and subcutaneous tissue (L00-L99)",
                    "M"=> //"Diseases of the musculoskeletal system and connective tissue (M00-M99)",
                        [
                            "RHEUM_ARTHRO", //"Rheumatoid arthritis and arthrosis (M05-M06,M15-M19)",
                            "M_OTH", //"Other diseases of the musculoskeletal system and connective tissue (remainder of M00-M99)",
                        ],
                    "N"=> //"Diseases of the genitourinary system (N00-N99)",
                        [
                            "N00-N29", //"Diseases of kidney and ureter",
                            "N_OTH", //"Other diseases of the genitourinary system (remainder of N00-N99)",
                        ],
                    "O", //"Pregnancy, childbirth and the puerperium (O00-O99)",
                    "P", //"Certain conditions originating in the perinatal period (P00-P96)",
                    "Q", //"Congenital malformations, deformations and chromosomal abnormalities (Q00-Q99)",
                    "R"=> //"Symptoms, signs and abnormal clinical and laboratory findings, not elsewhere classified (R00-R99)",
                        [
                            "R95", //"Sudden infant death syndrome",
                            "R96-R99", //"Ill-defined and unknown causes of mortality",
                            "R_OTH", //"Other symptoms, signs and abnormal clinical and laboratory findings (remainder of R00-R99)",
                        ],
                    "V01-Y89"=> //"External causes of morbidity and mortality (V01-Y89)",
                        [
                            "ACC"=> //"Accidents (V01-X59, Y85, Y86)",
                                [
                                    "V_Y85", //"Transport accidents (V01-V99, Y85)",
                                    "W00-W19", //"Falls",
                                    "W65-W74", //"Accidental drowning and submersion",
                                    "X40-X49", //"Accidental poisoning by and exposure to noxious substances",
                                    "ACC_OTH", //"Other accidents (W20-W64, W75-X39, X50-X59, Y86)",
                                ],
                            "X60-X84_Y870", //"Intentional self-harm",
                            "X85-Y09_Y871", //"Assault",
                            "Y10-Y34_Y872", //"Event of undetermined intent",
                            "V01-Y89_OTH", //"Other external causes of morbidity and mortality (remainder of V01-Y89)"}
                        ]
                ]
        ],
        "name" => "cause"
    ],
    "CL_AGE:hlth_cd_acdr"=> [ //one or more CL abbreviations in the first cell of the first row whose default need defining
        "name"=> "age", // English name override
        "renames" => [ //name adjustments
            "TOTAL" => "all ages",
        ],
        "ex"=> ["Y_LT15","Y15-24","Y_LT65","Y_GE65"],  //list of codes to exclude from the cube viz, but still ingested
    ],
    "CL_AGE:hlth_cd_ynrt"=> [ //one or more CL abbreviations in the first cell of the first row whose default need defining
        "name"=> "age", // English name override
        "ex"=> ["Y_LT15", "Y_LT65","Y_GE65"],  //list of codes to exclude from the cube viz, but still ingested
    ],
    "CL_AGE:hlth_cd_ycdrt"=> [ //one or more CL abbreviations in the first cell of the first row whose default need defining
        "name"=> "age", // English name override
        "ex"=> ["Y_LT15", "Y_LT65","Y_GE65"],  //list of codes to exclude from the cube viz, but still ingested
    ],
    "CL_AGE:demo_r_pjangroup"=> [ //one or more CL abbreviations in the first cell of the first row whose default need defining
        "name"=> "age", // English name override
        "ex"=> ["Y_GE65","Y_GE80","UNK"],  //list of codes to exclude from the cube viz, but still ingested
    ],
    "CL_AGE:demo_r_pjanaggr3"=> [ //broad age groups
        "name"=> "age", // English name override
        "ex"=> ["UNK"],  //list of codes to exclude from the cube viz, but still ingested
    ],
    "CL_IPC:pat_ep_ripc" =>[
        "hierarchy" => [
            "IPC"=>[//International patent classification (IPC) - total
                "A"=>[//Section A - Human necessities
                    "A01", //Agriculture; forestry; animal husbandry; hunting; trapping; fishing
                    "A21", //Baking; equipment for making or processing doughs; doughs for baking
                    "A22", //Butchering; meat treatment; processing poultry or fish
                    "A23", //Foods or foodstuffs; their treatment, not covered by other classes
                    "A24", //Tobacco; cigars; cigarettes; smokers' requisites
                    "A41", //Wearing apparel
                    "A42", //Headwear
                    "A43", //Footwear
                    "A44", //Haberdashery; jewellery
                    "A45", //Hand or travelling articles
                    "A46", //Brushware
                    "A47", //Furniture; domestic articles or appliances; coffee mills; spice mills; suction cleaners in general
                    "A61", //Medical or veterinary science; hygiene
                    "A62", //Life-saving; fire-fighting
                    "A63", //Sports; games; amusements
                ],
                "B"=>[ //Section B - Performing operations; transporting
                    "B01", //Physical or chemical processes or apparatus in general
                    "B02", //Crushing, pulverising, or disintegrating; preparatory treatment of grain for milling
                    "B03", //Separation of solid materials using liquids or using pneumatic tables or jigs; magnetic or electrostatic separation of solid materials from solid materials or fluids; separation by high-voltage electric fields
                    "B04", //Centrifugal apparatus or machines for carrying-out physical or chemical processes
                    "B05", //Spraying or atomising in general; applying liquids or other fluent materials to surfaces, in general
                    "B06", //Generating or transmitting mechanical vibrations in general
                    "B07", //Separating solids from solids; sorting
                    "B08", //Cleaning
                    "B09", //Disposal of solid waste; reclamation of contaminated soil
                    "B21", //Mechanical metal-working without essentially removing material; punching metal
                    "B22", //Casting; powder metallurgy
                    "B23", //Machine tools; metal-working not otherwise provided for
                    "B24", //Grinding; polishing
                    "B25", //Hand tools; portable power-driven tools; handles for hand implements; workshop equipment; manipulators
                    "B26", //Hand cutting tools; cutting; severing
                    "B27", //Working or preserving wood or similar material; nailing or stapling machines in general
                    "B28", //Working cement, clay, or stone
                    "B29", //Working of plastics; working of substances in a plastic state in general
                    "B30", //Presses
                    "B31", //Making paper articles; working paper
                    "B32", //Layered products
                    "B41", //Printing; lining machines; typewriters; stamps
                    "B42", //Bookbinding; albums; files; special printed matter
                    "B43", //Writing or drawing implements; bureau accessories
                    "B44", //Decorative arts
                    "B60", //Vehicles in general
                    "B61", //Railways
                    "B62", //Land vehicles for travelling otherwise than on rails
                    "B63", //Ships or other waterborne vessels; related equipment
                    "B64", //Aircraft; aviation; cosmonautics
                    "B65", //Conveying; packing; storing; handling thin or filamentary material
                    "B66", //Hoisting; lifting; hauling
                    "B67", //Opening or closing bottles, jars or similar containers; liquid handling
                    "B68", //Saddlery; upholstery
                    "B81", //Micro-structural technology
                    "B82", //Nanotechnology
                ],
                "C"=>[ //Section C - Chemistry; metallurgy
                    "C01", //Inorganic chemistry
                    "C02", //Treatment of water, waste water, sewage, or sludge
                    "C03", //Glass; mineral or slag wool
                    "C04", //Cements; concrete; artificial stone; ceramics; refractories
                    "C05", //Fertilisers; manufacture thereof
                    "C06", //Explosives; matches
                    "C07", //Organic chemistry
                    "C08", //Organic macromolecular compounds; their preparation or chemical working-up; compositions based thereon
                    "C09", //Dyes; paints; polishes; natural resins; adhesives; compositions not otherwise provided for; applications of materials not otherwise provided for
                    "C10", //Petroleum, gas or coke industries; technical gases containing carbon monoxide; fuels; lubricants; peat
                    "C11", //Animal or vegetable oils, fats, fatty substances or waxes; fatty acids therefrom; detergents; candles
                    "C12", //Biochemistry; beer; spirits; wine; vinegar; microbiology; enzymology; mutation or genetic engineering
                    "C13", //Sugar industry
                    "C14", //Skins; hides; pelts; leather
                    "C21", //Metallurgy of iron
                    "C22", //Metallurgy; ferrous or non-ferrous alloys; treatment of alloys or non-ferrous metals
                    "C23", //Coating metallic material; coating material with metallic material; chemical surface treatment; diffusion treatment of metallic material; coating by vacuum evaporation, by sputtering, by ion implantation or by chemical vapour deposition, in general; inhibiting corrosion of metallic material or incrustation in general
                    "C25", //Electrolytic or electrophoretic processes; apparatus therefor
                    "C30", //Crystal growth
                    "C40", //Combinatorial technology
                ],
                "D"=>[ //Section D - Textiles; paper
                    "D01", //Natural or artificial threads or fibres; spinning
                    "D02", //Yarns; mechanical finishing of yarns or ropes; warping or beaming
                    "D03", //Weaving
                    "D04", //Braiding; lace-making; knitting; trimmings; non-woven fabrics
                    "D05", //Sewing; embroidering; tufting
                    "D06", //Treatment of textiles or the like; laundering; flexible materials not otherwise provided for
                    "D07", //Ropes; cables other than electric
                    "D21", //Paper-making; production of cellulose
                ],
                "E"=>[ //Section E - Fixed constructions
                    "E01", //Construction of roads, railways, or bridges
                    "E02", //Hydraulic engineering; foundations; soil-shifting
                    "E03", //Water supply; sewerage
                    "E04", //Building
                    "E05", //Locks; keys; window or door fittings; safes
                    "E06", //Doors, windows, shutters, or roller blinds, in general; ladders
                    "E21", //Earth or rock drilling; mining
                ],
                "F"=>[ //Section F - Mechanical engineering; lighting; heating; weapons; blasting
                    "F01", //Machines or engines in general; engine plants in general; steam engines
                    "F02", //Combustion engines; hot-gas or combustion-product engine plants
                    "F03", //Machines or engines for liquids; wind, spring, or weight motors; producing mechanical power or a reactive propulsive thrust, not otherwise provided for
                    "F04", //Positive-displacement machines for liquids; pumps for liquids or elastic fluids
                    "F15", //Fluid-pressure actuators; hydraulics or pneumatics in general
                    "F16", //Engineering elements or units; general measures for producing and maintaining effective functioning of machines or installations; thermal insulation in general
                    "F17", //Storing or distributing gases or liquids
                    "F21", //Lighting
                    "F22", //Steam generation
                    "F23", //Combustion apparatus; combustion processes
                    "F24", //Heating; ranges; ventilating
                    "F25", //Refrigeration or cooling; combined heating and refrigeration systems; heat pump systems; manufacture or storage of ice; liquefaction or solidification of gases
                    "F26", //Drying
                    "F27", //Furnaces; kilns; ovens; retorts
                    "F28", //Heat exchange in general
                    "F41", //Weapons
                    "F42", //Ammunition; blasting
                ],
                "G"=>[ //Section G - Physics
                    "G01", //Measuring; testing
                    "G02", //Optics
                    "G03", //Photography; cinematography; analogous techniques using waves other than optical waves; electrography; holography
                    "G04", //Horology
                    "G05", //Controlling; regulating
                    "G06", //Computing; calculating; counting
                    "G07", //Checking-devices
                    "G08", //Signalling
                    "G09", //Educating; cryptography; display; advertising; seals
                    "G10", //Musical instruments; acoustics
                    "G11", //Information storage
                    "G12", //Instrument details
                    "G21", //Nuclear physics; nuclear engineering
                ],
                "H"=>[ //Section H - Electricity
                    "H01", //Basic electric elements
                    "H02", //Generation, conversion, or distribution of electric power
                    "H03", //Basic electronic circuitry
                    "H04", //Electric communication technique
                    "H05", //Electric techniques not otherwise provided for
                ],
                "UNK", //Unknown
            ]
        ]
    ],
    "CL_IPC:pat_ep_ntec"=> [ //one or more CL abbreviations in the first cell of the first row whose default need defining
        "rootCode"=> "HT", //High tech - total
    ],
    "CL_IPC:pat_ep_nbio"=> [ //one or more CL abbreviations in the first cell of the first row whose default need defining

    ],
    "CL_IPC:pat_ep_nict" => [
        "rootCode"=> "ICT", //Information and communication technology (ICT) - total
    ],
    "CL_IPC:pat_ep_nnano" => ["rootCode" => "B82", ], //B82 = nanotechnology
];

$skip_codes =[
    "demo_r_deaths", //within demo_r_gind3
// point-to-point networks, which MashableData does not handle:
// Freight and mail air transport between the main airports of XX and their main partner airports (routes data) avia_gor_xx
    "avia_gor_be",  //Belgium
    "avia_gor_dk",  //Denmark
    "avia_gor_de",  //Germany
    "avia_gor_ee",  //Estonia
    "avia_gor_el",  //Greece
    "avia_gor_es",  //Spain
    "avia_gor_fr",  //France
    "avia_gor_ie",  //Iceland
    "avia_gor_it",  //Italy
    "avia_gor_cy",  //Cyprus
    "avia_gor_lv",  //Latvia
    "avia_gor_lt",  //Lithuania
    "avia_gor_lu",  //Luxembourg
    "avia_gor_hu",  //Hungary
    "avia_gor_mt",  //Malta
    "avia_gor_nl",  //Netherlands
    "avia_gor_at",  //Austria
    "avia_gor_pl",  //Poland
    "avia_gor_pt",  //Portugal
    "avia_gor_si",  //Slovenia
    "avia_gor_fi",  //Finland
    "avia_gor_se",  //Sweden
    "avia_gor_uk",  //United Kingdom
    "avia_gor_is",  //Iceland
    "avia_gor_no",  //Norway
    "avia_gor_ch",  //Switzerland
    "avia_gor_bg",  //Bulgaria
    "avia_gor_ro",  //Romania
    "avia_gor_hr",  //Croatia
    "avia_gor_cz",  //Czech Republic
    "avia_gor_sk",  //Slovakia
// Air passenger transport between the main airports of XX and their main partner airports (routes data) avia_par_xx
    "avia_par_be",  //Belgium
    "avia_par_dk",  //Denmark
    "avia_par_de",  //Germany
    "avia_par_ee",  //Estonia
    "avia_par_el",  //Greece
    "avia_par_es",  //Spain
    "avia_par_fr",  //France
    "avia_par_ie",  //Iceland
    "avia_par_it",  //Italy
    "avia_par_cy",  //Cyprus
    "avia_par_lv",  //Latvia
    "avia_par_lt",  //Lithuania
    "avia_par_lu",  //Luxembourg
    "avia_par_hu",  //Hungary
    "avia_par_mt",  //Malta
    "avia_par_nl",  //Netherlands
    "avia_par_at",  //Austria
    "avia_par_pl",  //Poland
    "avia_par_pt",  //Portugal
    "avia_par_si",  //Slovenia
    "avia_par_fi",  //Finland
    "avia_par_se",  //Sweden
    "avia_par_uk",  //United Kingdom
    "avia_par_is",  //Iceland
    "avia_par_no",  //Norway
    "avia_par_ch",  //Switzerland
    "avia_par_bg",  //Bulgaria
    "avia_par_ro",  //Romania
    "avia_par_hr",  //Croatia
    "avia_par_cz",  //Czech Republic
    "avia_par_sk",  //Slovakia
//errors reading
    "road_go_na_rl3g","road_go_na_ru3g", "ilc_di30", "DS_043408", "DS_043409", "DS_008573", "DS_066341", "DS_066342", "comext", "road_go_ta_tg", "road_go_ta_dctg",
    "road_go_na_tgtt", "road_go_na_dctg", "road_go_ia_ugtt", "road_go_ia_lgtt","road_go_cta_gtt", "hrst_st_nnat",
    "hrst_st_ncob","hrst_st_nnatcob", "hrst_st_nxeunt", "hrst_st_nxeubt", "hrst_st_nnt", "hrst_st_nbt", "hrst_fl_tegr76",
    "hrst_fl_tepa76",
//Area under wine-grape vine varieties broken down by vine variety and by age of the vines :  each country has is separate list of varietals and heavy use of nonstandard geos (e.g )FR61_X_612: Aquitaine except Gironde)
    "vit_bs4_be",  //Belgium
    "vit_bs4_dk",  //Denmark
    "vit_bs4_de",  //Germany
    "vit_bs4_ee",  //Estonia
    "vit_bs4_el",  //Greece
    "vit_bs4_es",  //Spain
    "vit_bs4_fr",  //France
    "vit_bs4_ie",  //Iceland
    "vit_bs4_it",  //Italy
    "vit_bs4_cy",  //Cyprus
    "vit_bs4_lv",  //Latvia
    "vit_bs4_lt",  //Lithuania
    "vit_bs4_lu",  //Luxembourg
    "vit_bs4_hu",  //Hungary
    "vit_bs4_mt",  //Malta
    "vit_bs4_nl",  //Netherlands
    "vit_bs4_at",  //Austria
    "vit_bs4_pl",  //Poland
    "vit_bs4_pt",  //Portugal
    "vit_bs4_si",  //Slovenia
    "vit_bs4_fi",  //Finland
    "vit_bs4_se",  //Sweden
    "vit_bs4_uk",  //United Kingdom
    "vit_bs4_is",  //Iceland
    "vit_bs4_no",  //Norway
    "vit_bs4_ch",  //Switzerland
    "vit_bs4_bg",  //Bulgaria
    "vit_bs4_ro",  //Romania
    "vit_bs4_hr",  //Croatia
    "vit_bs4_cz",  //Czech Republic
    "vit_bs4_sk",  //Slovakia


];

$ingest = [
    [
        "codes"=> ["hlth_cd_acdr"],  //Causes of death by NUTS 2 regions - crude death rate per 100 000 inhabitants - annual data
        "theme_name"=> "Crude death rate", //overrides the TOC name.  Default is the name of codes[0] with "NUTS" references removed
        "mapping"=> [ //help with code list if needed.  Dimensionality follows order below or cell[0,0} if this section is missing
            "CL_AGE"=> "hlth_cd_acdr",
            "CL_UNITS"=>["renames"=>["CDTH_RT"=>""]],  //avoid repeat of "Causes of death"
            "CL_ICD10" => "hlth_cd_acdr", //version of code list in $cl_config to use
            "CL_SEX" => "basic"
        ],
        "units"=> "deaths per 100,000 inhabitants",  //units string or code list name (e.g. "CL_TYPE") that is actually a units field.  Default = <units> || "CL_UNIT" || "CL_CURRENCY"
        "cube"=> true  //make viz cubes records for theme. defaults to true if missing
    ],
    [
        "codes"=> ["hlth_cd_ynrt","hlth_cd_ynrm","hlth_cd_ynrf"],  //Male, Total & Female for:  Causes of death by NUTS 2 regions - crude death rate per 100 000 inhabitants - annual data
        "theme_name"=> "Causes of death - absolute number, 3 years average", //overrides the TOC name.  Default is the name of codes[0] with "NUTS" references removed
        "mapping"=> [ //help with code list if needed.  Dimensionality follows order below or cell[0,0} if this section is missing
            "CL_AGE"=> "hlth_cd_ynrt",
            "CL_ICD10" => "hlth_cd_acdr" //version of code list in $cl_config to use
        ],
        "units"=> "deaths",  //units string or code list name (e.g. "CL_TYPE") that is actually a units field.  Default = <units> || "CL_UNIT" || "CL_CURRENCY"
        "cube"=> true  //make viz cubes records for theme. defaults to true if missing
    ],
    [
        "codes"=> ["hlth_cd_ycdrt","hlth_cd_ycdrm","hlth_cd_ycdrf"],  //Male, Total & Female for:  Causes of death by NUTS 2 regions - crude death rate per 100 000 inhabitants - annual data
        "theme_name"=> "Causes of death - crude death rate, 3 years average", //overrides the TOC name.  Default is the name of codes[0] with "NUTS" references removed
        "mapping"=> [ //help with code list if needed.  Dimensionality follows order below or cell[0,0} if this section is missing
            "CL_AGE"=> "hlth_cd_ycdrt",
            "CL_ICD10" => "hlth_cd_acdr", //version of code list in $cl_config to use
        ],
        "units"=> "deaths per 100 000 inhabitants",  //units string or code list name (e.g. "CL_TYPE") that is actually a units field.  Default = <units> || "CL_UNIT" || "CL_CURRENCY"
        "cube"=> true  //make viz cubes records for theme. defaults to true if missing
    ],
    [
        "codes"=> ["hlth_cd_ysdr1"],  // Causes of death by NUTS 2 regions - standardised death rate per 100 000 inhabitants, 3 years average
        "theme_name"=> "Causes of death - standardised death rate, 3 years average", //overrides the TOC name.  Default is the name of codes[0] with "NUTS" references removed
        "mapping"=> [
            "CL_ICD10" => "hlth_cd_acdr", //version of code list in $cl_config to use
        ],
        "units"=> "deaths per 100 000 inhabitants",  //units string or code list name (e.g. "CL_TYPE") that is actually a units field.  Default = <units> || "CL_UNIT" || "CL_CURRENCY"
        "cube"=> true  //make viz cubes records for theme. defaults to true if missing
    ],
    [
        "codes"=> ["demo_r_d3avg"],  // Annual average population (1 000) by sex - NUTS 3 regions
        "theme_name"=> "Annual average population",
        "units"=> "1000 persons"
    ],
    [
        "codes"=> ["demo_r_d3area"],  // Area - NUTS 3 regions
        "theme_name"=> "Area"
    ],
    [
        "codes"=> ["demo_r_d3dens"],  // Population density - NUTS 3 regions
        "theme_name"=> "Population density",
        "units"=> "persons per square kilometre"
    ],
    [
        "codes"=> ["demo_r_pjangroup"],  // Population on 1 January by five years age groups and sex - NUTS 2 regions
        "theme_name"=> "Population on 1 January",
        "mapping"=> [ //help with code list if needed.  Dimensionality follows order below or cell[0,0} if this section is missing
            "CL_AGE"=> "demo_r_pjangroup"
        ],
        "units"=> "persons"
    ],
    [
        "codes"=> ["demo_r_pjanaggr3"],  // Population on 1 January by broad age groups and sex - NUTS 3 regions
        "theme_name"=> "Population on 1 January",
        "mapping"=> [ //help with code list if needed.  Dimensionality follows order below or cell[0,0} if this section is missing
            "CL_AGE"=> "demo_r_pjanaggr3"
        ],
        "units"=> "persons"
    ],
    [
        "codes"=> ["demo_r_gind3"],  // Demographic balance and crude rates - NUTS 3 regions
        "theme_name"=> "Demographic balance",
        "mapping"=> [ //help with code list if needed.  Dimensionality follows order below or cell[0,0} if this section is missing
            "CL_INDIC_DE"=> [
                "skip" => ["JAN"],
                "hierarchy" => [["LBIRTH","DEATH","NATGROW","CNMIGRAT","GROW"],["GBIRTHRT","GDEATHRT","NATGROWRT","CNMIGRATRT","GROWRT"]], //unrelated cubes
            ]
        ],
        "units" => [
            //skipped redundant "JAN" => "", //"Population on 1 January - total",
            "LBIRTH" => "number", //"Live births - total",
            "DEATH" => "number", //"Deaths - total",
            "NATGROW" => "number", //"Natural change of population",
            "CNMIGRAT" => "number", //"Net migration plus statistical adjustment",
            "GROW" => "number", //"Total population change",
            "GBIRTHRT" => "per 1000 of the average population", //"Crude birth rate",
            "GDEATHRT" => "per 1000 of the average population", //"Crude death rate",
            "NATGROWRT" => "per 1000 of the average population", //"Crude rate of natural change of population",
            "CNMIGRATRT" => "per 1000 of the average population", //"Crude rate of net migration plus statistical adjustment",
            "GROWRT" => "per 1000 of the average population", //"Crude rate of total population change"
        ]
    ],
    [
        "codes"=> ["demo_r_fagec"],  // Live births by mother's age at last birthday - NUTS 2 regions demo_r_fagec
        "theme_name"=> "Live births by mother's age",
        "units"=> "births"
    ],
    [
        "codes"=> ["demo_r_frate2"],  //  Fertility rates by age  - NUTS 2 regions
        "theme_name"=> "Fertility rate",
        "units"=> "Fertility rate"
    ],
    [
        "codes"=> ["cens_01rapop"],  //  Population by sex, age group, current activity status and NUTS 3 regions
        "theme_name"=> "Population",
        "mapping"=> [ //help with code list if needed.  Dimensionality follows order below or cell[0,0} if this section is missing
            "CL_SEX" => "basic",
            "CL_WSTATUS"=> ["rootCode"=>"POP"],
        ],
        "processUnknownGeos"=>false,
    ],
    [
        "codes"=> ["vit_bs5"],  // Area under wine-grape vine varieties broken down by type of production, yield class and regions
        "theme_name"=> "Area under wine-grape vine varieties",
        "units" => "hectares",
        "mapping"=> [ //help with code list if needed.  Dimensionality follows order below or cell[0,0} if this section is missing
            "CL_YIELDCLS"=> [
                "hierarchy" => [
                    "TOT_AR" => //Area under wine-grape vines - Total (ha)",
                        [
                            "QWA_AR" =>  //Area for quality wines - Total (ha)",
                                [
                                    "QWA_CL1", //Area for quality wines - Yield < 30 hl\/ha (ha)",
                                    "QWA_CL2", //Area for quality wines - Yield 30 - < 70 hl\/ha (ha)",
                                    "QWA_CL3", //Area for quality wines - Yield 70 - < 110 hl\/ha (ha)",
                                    "QWA_CL4", //Area for quality wines - Yield > 110 hl\/ha (ha)",
                                ],
                            "OWA_AR" =>  //Area for other wines - Total (ha)",
                                [
                                    "OWA_CL1", //Area for other wines - Yield < 40 hl\/ha (ha)",
                                    "OWA_CL2", //Area for other wines - Yield 40 - < 70 hl\/ha (ha)",
                                    "OWA_CL3", //Area for other wines - Yield 70 - < 100 hl\/ha (ha)",
                                    "OWA_CL4", //Area for other wines - Yield 100 - < 130 hl\/ha (ha)",
                                    "OWA_CL5", //Area for other wines - Yield > 130 hl\/ha (ha)"
                                ]
                        ]
                ]
            ]
        ],
    ],
    [
        "codes"=> ["pat_ep_rtot"],  //  Population by sex, age group, current activity status and NUTS 3 regions
        "theme_name"=> "Patent applications to the EPO",
    ],
    [
        "codes"=> ["vit_bs5"],  // Area under wine-grape vine varieties broken down by type of production, yield class and regions
        "theme_name"=> "Area under wine-grape vine varieties",
        "units" => "hectares",
        "mapping"=> [ //help with code list if needed.  Dimensionality follows order below or cell[0,0} if this section is missing
            "CL_IPC" => "pat_ep_ntec",
        ]
    ]
];