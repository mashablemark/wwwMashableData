<?php 

       $con = getConnection();
       logEvent('fb_login','ran');
   $app_id = "209270205811334";
   $app_secret = "asdfasdf"; //"2dc6b6ba22905a82c891f388f1f93b10";
   $my_url = "http://www.MashableData.com/workbench";

   session_start();
   $code = $_REQUEST["code"];

   if(empty($code)) {
     $_SESSION['state'] = md5(uniqid(rand(), TRUE)); //CSRF protection
     $dialog_url = "http://www.facebook.com/dialog/oauth?client_id=" 
       . $app_id . "&redirect_uri=" . urlencode($my_url) . "&state="
       . $_SESSION['state'];

     echo("<script> top.location.href='" . $dialog_url . "'</script>");
   }

   if($_REQUEST['state'] == $_SESSION['state']) {
     $token_url = "https://graph.facebook.com/oauth/access_token?"
       . "client_id=" . $app_id . "&redirect_uri=" . urlencode($my_url)
       . "&client_secret=" . $app_secret . "&code=" . $code;
echo('<a href="' .  $token_url . '">' .  $token_url . '</a>');
exit('not run yet');

     $response = file_get_contents($token_url);
     $params = null;
     parse_str($response, $params);


       logEvent('fb_login',$response);

     $graph_url = "https://graph.facebook.com/me?access_token=" 
       . $params['access_token'];

     $user = json_decode(file_get_contents($graph_url));
     echo("Hello " . $user->name);
		 echo("<br>");
     echo("username" . $user->username);
		 echo("<br>");
     echo("fb_id" . $user->id);
		 echo("<br>");
     echo("link" . $user->link);
   }
   else {
     echo("The state does not match. You may be a victim of CSRF.");
   }
mysql_close($con);

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