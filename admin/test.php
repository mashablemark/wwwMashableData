<?php
/**
 * Created by JetBrains PhpStorm.
 * User: mark
 * Date: 8/28/12
 * Time: 8:03 AM
 * To change this template use File | Settings | File Templates.
 */

$con = getConnection();
$sql = "insert into globalstatus (statuskey, status, modifieddt) values ('sleeptest', 'Sleeptest: ', now()) on duplicate key update status='Sleeptest: ', modifieddt=now()";
mysql_query($sql);
for($i=0;$i<8;$i++){
    set_time_limit(20);
    $starttime = time();
    $j=0;
    while((time()-$starttime)<5){
        $j++;
    }
    print("time: ".time()."<br>");
    $sql = "update globalstatus set status=CONCAT(status,' 5s=".$i."') where statuskey='sleeptest'";
    //sleep(5);
    mysql_query($sql);
}

function getConnection(){
    $con = mysql_connect("localhost","melbert_admin","g4bmyLl890e0");
    if (!$con)
    {
        die("status: 'db connection error'");
    }
    mysql_select_db("melbert_mashabledata", $con);
    return $con;
}