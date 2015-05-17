<?php $workbenchVersion = "0.9";  ?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html>
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1" />
            <link rel="shortcut icon" href="/favicon.ico" />
            <meta http-equiv="X-UA-Compatible" content="IE=9">
            <title>MashableData Embedder Samples</title>

            <!--CSS files-->
            <link  rel="stylesheet" href="/global/css/smoothness/jquery-ui-1.9.2.custom.css" />
            <link rel="stylesheet" href="/embedder/mashabledata_embedtools.css" />

            <!--JQUERY LIBRARIES-->
<?php if($_SERVER["SERVER_NAME"]=='localhost'){ ?>
            <script type="text/javascript" src="/global/js/jquery/jquery-1.8.3.js"></script>
            <script type="text/javascript" src="/global/js/jqueryui/jquery-ui-1.9.2.custom.min.js"></script>
<?php } else { ?>
            <script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js"></script>
            <script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jqueryui/1.9.2/jquery-ui.min.js"></script>
<?php }  ?>
            <!--[if lte IE 8]><script language="javascript" type="text/javascript" src="/global/js/flot/excanvas.min.js"></script><![endif]-->
            <script type="text/javascript" src="/global/js/highcharts/js/highcharts.3.0.10.min.js"></script>
            <!--MASHABLEDATA EMBEDDER LIBRARY-->
<?php if(strrpos ($_SERVER["REQUEST_URI"], 'dev')!==FALSE){ ?>
            <script type="text/javascript" src="/global/js/jvectormap/jquery-jvectormap-2.0.1.min.js"></script>
            <script type="text/javascript" src="/global/js/flot/jquery.flot.min.js"></script><!-- 52 kb; version 0.8.3-->
            <script type="text/javascript" src="/global/js/flot/jquery.flot.time.min.js"></script><!--5kb-->
            <script type="text/javascript" src="/global/js/require/require.2.1.1.min.js"></script><!--15kb-->
            <script type="text/javascript" src="/global/js/fancybox/jquery.fancybox-1.3.4.pack.js"></script><!--16kb+images-->
            <script type="text/javascript" src="/global/js/loadmask/jquery.loadmask.min.js"></script><!--2kb+images-->
            <script type="text/javascript" src="/global/js/colour/Colour.js"></script>
            <script type="text/javascript" src="/workbenchdev/js/globals.js?v=<?=$workbenchVersion?>"></script>
            <script type="text/javascript" src="/workbenchdev/js/common.js?v=<?=$workbenchVersion?>"></script>
            <script type="text/javascript" src="/workbenchdev/js/set.js?v=<?=$workbenchVersion?>"></script>
            <script type="text/javascript" src="/workbenchdev/js/plot.js?v=<?=$workbenchVersion?>"></script>
            <script type="text/javascript" src="/workbenchdev/js/graph.js?v=<?=$workbenchVersion?>"></script>
            <script type="text/javascript" src="/workbenchdev/js/maps.js?v=<?=$workbenchVersion?>"></script>
            <script type="text/javascript" src="/workbenchdev/js/grapher.js?v=<?=$workbenchVersion?>"></script>
            <script type="text/javascript" src="/workbenchdev/js/shims.js?v=<?=$workbenchVersion?>"></script>
            <script type="text/javascript" src="/workbenchdev/js/jstat.js?v=<?=$workbenchVersion?>"></script>
            <script type="text/javascript" src="/workbenchdev/js/annotator.js?v=<?=$workbenchVersion?>"></script>
            <script type="text/javascript" src="/workbenchdev/js/treemap.js?v=<?=$workbenchVersion?>"></script>
            <script type="text/javascript" src="/embedder/mashabledata_embedtools.js?v=<?=$workbenchVersion?>"></script>
<?php } else { ?>
    <script type="text/javascript" src="/embedder/mashabledata_embedtools.min.js?v=<?=$workbenchVersion?>"></script>
<?php }  ?>
        </head>
<body style="font-family: arial, sans-serif;padding: 10px;">
<?php
    $graphcode = isset($_REQUEST["graphcode"])?$_REQUEST["graphcode"]:"7d46bf418efc7e417ec5cba6e533566c";
?>
<h2>How to Embed a MashableData visualization on your website</h2>
    <p>This is an plain HTML page with the MashableData embedder JavaScrip library referenced.  After the page loads, the library searches for DIV elements of class="mashabledata_embed" and instantiates an interactive graph in each DIV corresponding to the data attribute.</p>
<h3>Libraries</h3>
<div style="border: thin solid black;color: #00008b;margin: 10px;padding: 10px;">
    &lt;!-- jQuery is required if not already built into your website and jQueryUI is required for animated maps --&gt;<br />
    &lt;script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js"&gt;&lt;/script&gt;<br />
    &lt;script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jqueryui/1.9.2/jquery-ui.min.js"&gt;&lt;/script&gt;<br />
    <br />
    &lt;!-- the MashableDate Embed Tool libaray must be saved to your webserver --&gt;<br />
    &lt;script type="text/javascript" src="<a href="//www.mashabledata.com/embedder/mashabledata_embedtools.min.js">/embedder/mashabledata_embedtools.min.js</a>&gt;&lt;/script&gt;<br />
    <br />
    &lt;!--CSS files--&gt;<br />
    &lt;link  rel="stylesheet" href="//www.mashabledata.com/global/css/smoothness/jquery-ui-1.9.2.custom.css" /&gt;<br />
    &lt;link rel="stylesheet" href="<a href="//www.mashabledata.com/embedder/mashabledata_embedtools.css">/embedder/mashabledata_embedtools.css</a> /&gt;<br />
</div>
<div style="color:darkred;display: inline-block; background-color:lightpink;margin:20px;padding:20px;">Important: To embed this visualization on a high volume web page (100,000 page views per hour or more), please follow these <a href="supplemental.php">supplemental instructions</a> to decouple any dependence on the MashableData servers for file or data.</div>

<h3>HTML</h3>
In the body on your webpage, add the following HTML and MashableData_embedtool.js does the rest!
<div style="border: thin solid black;color: #00008b;margin: 10px;padding: 10px;">
    &lt;div class="mashabledata_embed"  data="<?=$graphcode ?>"&gt;&lt;/div&gt;<br />
</div>



    <div class="mashabledata_embed"  data="<?=$graphcode ?>" style="height: 1000px;"></div>
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
