<?php
/**
 * Created by JetBrains PhpStorm.
 * User: Mark Elbert
 */
date_default_timezone_set('UTC');
/** Error reporting */
error_reporting(E_ALL);

/** Include path **/
ini_set('include_path', ini_get('include_path').';../classes/');

/** PHPExcel */
include 'PHPExcel.php';

/** PHPExcel_Writer_Excel2007 */
include 'PHPExcel/Writer/Excel2007.php';

$data = json_decode($_POST['data'], true);
// Create new PHPExcel object
$objPHPExcel = new PHPExcel();

// Set properties
$objPHPExcel->getProperties()->setCreator("Maarten Balliauw");
$objPHPExcel->getProperties()->setLastModifiedBy("Maarten Balliauw");
$objPHPExcel->getProperties()->setTitle("Office 2007 XLSX Test Document");
$objPHPExcel->getProperties()->setSubject("Office 2007 XLSX Test Document");
$objPHPExcel->getProperties()->setDescription("Graph data download for Office 2007 XLSX.");
$i = 0;
$objPHPExcel->removeSheetByIndex(0);
for($sheet=0;$sheet<count($data);$sheet++){
    $objWorksheet = $objPHPExcel->createSheet();
    //$objPHPExcel->setActiveSheetIndex($i);
    //loop through rows and columns and set spreadsheet values (no styling)

    //echo('<br>sheet:'.$sheet);
    for($row=0;$row<count($data[$sheet]['grid']);$row++){
        for($col=0;$col<count($data[$sheet]['grid'][$row]);$col++){
            //echo('<br>'.$row.':'.$col);
            $objWorksheet->setCellValueByColumnAndRow($col+1, $row+1, $data[$sheet]['grid'][$row]{$col});
        }
    }
    // Rename sheet
    $objWorksheet->setTitle($data[$sheet]['name']);
    $i++;
}

// Save Excel 2007 file
$objWriter = new PHPExcel_Writer_Excel2007($objPHPExcel);
$filename = sha1(time().rand()) . '.xlsx';
$objWriter->save($filename);

header("Content-Disposition: attachment; filename=\"graph_data.xlsx\"");
header("Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
echo file_get_contents($filename);

