<?php $workbenchVersion = "0.9";  ?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html>
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1" />
            <link rel="shortcut icon" href="/favicon.ico" />
            <meta http-equiv="X-UA-Compatible" content="IE=9">
            <title>MashableData Embed Preview</title>

            <!--CSS files-->
            <link  rel="stylesheet" href="/global/css/smoothness/jquery-ui-1.11.css" />
            <link rel="stylesheet" href="/embed/mashabledata_embedtools.css" />

            <!--JQUERY LIBRARIES-->
<?php if($_SERVER["SERVER_NAME"]=='localhost'){ ?>
            <script type="text/javascript" src="/global/js/jquery/jquery-1.8.3.js"></script>
            <script type="text/javascript" src="/global/js/jqueryui/jquery-ui-1.9.2.custom.min.js"></script>
<?php } else { ?>
    <script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js"></script>
    <script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jqueryui/1.11.4/jquery-ui.min.js"></script>
<?php }  ?>
                    </head>
<body style="font-family: arial, sans-serif;padding: 10px;">
<?php
    $graphcode = isset($_REQUEST["graphcode"])?$_REQUEST["graphcode"]:"7d46bf418efc7e417ec5cba6e533566c";
    $height = max(isset($_REQUEST["h"])?intval($_REQUEST["h"]):500, 200);
    $width = isset($_REQUEST["w"])?max(intval($_REQUEST["w"]),200)."px":"100%";

?>
<h2>Embedding a MashableData visualization in your webpage</h2>
    <p>Copy and paste the code below into your webpage.  Any changes you save in workbench will appear in your webpage when refreshed.</p>
    <div style="border: thin solid black;color: #00008b;margin: 10px;padding: 10px;">
        &lt;iframe type="text/javascript" src="https://www.mashabledata.com/embed?g=<?=$graphcode?>" height="<?=$height?>" style="border:none;padding:0;width:<?=$width?>;"&gt;&lt;/iframe&gt;
    </div>
    <p>The visualization is sized to be 500 pixels high and the full width of its container (DIV or page) by default.  Use the form below to customize the size:</p>
<form action="index.php" method="post">
    <input name="graphcode" value="<?=$graphcode?>" type="hidden">
    <input name="h" value="<?=$height?>">
    <input name="w" value="<?=$width?>">
    <button type="submit">resize</button>
</form>


<div style="color:darkred;display: inline-block; background-color:lightpink;margin:20px;padding:20px;">Archival note: Some websites require all assets to be copied on their servers so that all content renders 100% independent of third party services such as MashableData.com.  While MashableData content is served form a global network of 32 data centers, we respect your website's archival policies.  For instructions on how to install our code libraries and your data files, please follow the <a href="/preview/archival.php">supplemental instructions</a> to decouple any dependence on the MashableData servers for code or data.</div>

<h3>Your visualization embedded as currently configured and sized</h3>
<iframe type="text/javascript" src="https://www.mashabledata.com/embed/?g=<?=$graphcode?>" height="<?=$height?>px" style="border:none;padding:0;width:<?=$width?>;">;</iframe>;

<!---
<br />
<br />
<br />

<h3><a id="hv">Additional instructions for high volume websites</a> (>100,000 embedded visualization views per hour)</h3>


<p>MashableData.com allows embedded graph&rsquo;s to request data and map definitions from our servers using Cross-Domain
    Origin Scripting (CORS).  This simplifies embedding your MashableData visualizations and our cached Content Delivery
    Network can meet the needs of the vaste majority of websites.</p>
<p>However, high volume websites are required to include the graph and map definitions on webpage with embedded MashableData
    visualization expecting very high volumes.</p>
<p>This is done by copying the JavaScript below into an inline
    &lt;SCRIPT&gt; tag or into a JavaScript file that is referenced by your webpage.  This removes all dependencies on
    the MashableData servers and the only limitations is your own servers and content delivery network.</p>
<p>Failure to do so may result in refused requests for data for graphs exceeding 100,000 impressions per hour.</p>

textarea id="MashableData_graphData" style="width:90%;height:500px;border: thin solid black;color: #00008b;margin: 10px;padding: 10px;">
//embedded graph definition for <?=$graphcode ?>

</textarea--->

</body>
