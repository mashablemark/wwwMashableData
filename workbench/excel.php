<?php
/**
 * Created by JetBrains PhpStorm.
 * User: Mark Elbert
 */
date_default_timezone_set('UTC');
/** Error reporting */
error_reporting(E_ALL);

/** Include path **/
//failed because of odd initial path of ".:" -> ini_set('include_path', ini_get('include_path').';../classes/');
ini_set('include_path', '../classes/');

/** PHPExcel */
include 'PHPExcel.php';

/** PHPExcel_Writer_Excel2007 */
include 'PHPExcel/Writer/Excel2007.php';

$data = json_decode($_POST['data'], true);
// Create new PHPExcel object
$objPHPExcel = new PHPExcel();

// Set properties
$objPHPExcel->getProperties()->setCreator("MashableData user");
$objPHPExcel->getProperties()->setLastModifiedBy("MashableData user");
$objPHPExcel->getProperties()->setTitle("MashableData graph data");
$objPHPExcel->getProperties()->setSubject("MashableData graph data");
$objPHPExcel->getProperties()->setDescription("MashableData graph data download in Office 2007 XLSX format, with separate worksheets for charts, maps, and locations.  Underlying component data and sources create transparency.");

$i = 0;
$objPHPExcel->removeSheetByIndex(0);
for($sheet=0;$sheet<count($data);$sheet++){
    $objWorksheet = $objPHPExcel->createSheet();
    //$objPHPExcel->setActiveSheetIndex($i);
    //loop through rows and columns and set spreadsheet values (no styling)

    //echo('<br>sheet:'.$sheet);
    for($row=0;$row<count($data[$sheet]['grid']);$row++){
        for($col=0;$col<count($data[$sheet]['grid'][$row]);$col++){
            //echo('<br>'.$row.':'.$col." = ". $data[$sheet]['grid'][$row][$col]);
            $objWorksheet->setCellValueByColumnAndRow($col+1, $row+1, $data[$sheet]['grid'][$row][$col]);
        }
    }
    // Rename sheet
    $objWorksheet->setTitle($data[$sheet]['name']);
    $i++;
}

// Redirect output to a client’s web browser (Excel2007)
header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
header('Content-Disposition: attachment;filename="graph_data.xlsx"');
header('Cache-Control: max-age=0');

$objWriter = PHPExcel_IOFactory::createWriter($objPHPExcel, 'Excel2007');
$objWriter->save('php://output');
exit;

