 <?php
 $con = getConnection();
 $log="";
 foreach($_POST as $key => $value){$log = $log . $key.": ".$value.';'; };
 logEvent("fb_channel POST", "test");

 $cache_expire = 60*60*24*365;
 header("Pragma: public");
 header("Cache-Control: max-age=".$cache_expire);
 header('Expires: ' . gmdate('D, d M Y H:i:s', time()+$cache_expire) . ' GMT');

//helper functions
function logEvent($command,$sql){
	$log_sql = "insert into eventlog(event, data) values('" . $command . "','" . mysql_real_escape_string($sql) . "')";
	$event = mysql_query($log_sql);
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

 ?>
 <script src="//connect.facebook.net/en_US/all.js"></script>