<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>PHP Configuration</title>
</head>
<?php

$event_logging = true;
$sql_logging = true;
include_once("./global/php/common_functions.php");
date_default_timezone_set('UTC');
$con = getConnection();

closeConnection();

phpinfo();


?>
<body>
</body>
</html>
