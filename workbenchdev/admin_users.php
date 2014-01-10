<?php
/**
 * Created by JetBrains PhpStorm.
 * User: mark__000
 * Date: 3/24/13
 * Time: 11:17 PM
 * To change this template use File | Settings | File Templates.
 */

include_once("../global/php/common_functions.php");
date_default_timezone_set('UTC');

if(!isset($_COOKIE["md_auth"])) die("admin priviledges required");
$aryCrumbs = explode(":", myDecrypt($_COOKIE["md_auth"]));
if(count($aryCrumbs)!=5) die("admin priviledges required");
$admin_info = array("userid"=>$aryCrumbs[0],"orgid"=>$aryCrumbs[1],"orgname"=>$aryCrumbs[2],"permission"=>$aryCrumbs[3],"subscription"=>$aryCrumbs[4]);
$rsUsers = runQuery("select * from users where orgid=".$admin_info["orgid"]);
$rsInvites = runQuery("select * from invitations where orgid=".$admin_info["orgid"]);

?><!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <link rel="shortcut icon" href="/favicon.ico" />
    <meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1" />
    <title>MashableData Administration</title>

    <!--CSS files-->
    <link  rel="stylesheet" href="css/smoothness/jquery-ui-1.9.2.custom.css" />
    <link  rel="stylesheet" href="/global/css/datatables/datatable.css" />
    <!--link  rel="stylesheet" href="css/ColVis.css" /-->
    <!--link  rel="stylesheet" href="md_workbench.css" /-->
    <link rel="stylesheet" href="js/fancybox/jquery.fancybox-1.3.4.css" type="text/css">

    <!--JavaScript files-->
    <script type="text/javascript" src="/global/js/jquery/jquery-1.8.3.js"></script><!-- latest verions is 1.8.3-->
    <script type="text/javascript" src="/global/js/jqueryui/jquery-ui-1.9.2.custom.min.js"></script>
    <script type="text/javascript" src="/global/js/datatables/jquery.dataTables.1.8.2.min.js"></script><!-- latest version is 1.9.4-->
    <script type="text/javascript" src="js/fancybox/jquery.fancybox-1.3.4.pack.js"></script>
    <script type="text/javascript" src="/global/js/loadmask/jquery.loadmask.min.js"></script>
    <script type="text/javascript" src="common.js"></script>
    <script type="text/javascript" src="shims.js"></script>
    <script type="text/javascript" src="admin_panel.js"></script>


</head>
<body>
<table id="users">
<thead><tr>
<?php
    $fields = $rsUsers->fetch_fields();
    foreach($fields as $field) {
        print('<td>'.$field->name.'</td>');
    }
?>
</tr></thead>
<?php
    while ($aRow = $rsUsers->fetch_assoc()) {
        print('<tr>');
        foreach($aRow as $value) print('<td>'.$value.'</td>');
        print('</tr>');
    }
?>
</table>


<table id="invites">

</table>
</body>

