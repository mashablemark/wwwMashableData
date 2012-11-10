<html>
<script type="text/javascript" src="/workbench/js/jquery.min.js"></script>
<body>
<?php
/**
 * Created by JetBrains PhpStorm.
 * User: mark
 * Date: 6/17/12
 * Time: 12:25 AM
 * To change this template use File | Settings | File Templates.
 */

echo "<br>post:<br>";
var_dump($_POST);
echo "<br>files:<br>";
var_dump($_FILES);
echo "<br>file exists:<br>";

if(is_file($_FILES["img"]["tmp_name"])){
    echo "exists!";
} else {
    echo "does not exist!";
}
if(is_file("/tmp/phpGCHemi")){
    echo "/tmp/phpGCHemi exists!";
} else {
    echo "/tmp/phpGCHemi does not exist!";
}

?>

<form method="POST" enctype="multipart/form-data" action="temp.php">
    <input name="img" type="file">
    <input name="me" value="mce">
    <input type="submit">
</form>
</body>
</html>