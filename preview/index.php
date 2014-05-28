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
            <!--MASHABLEDATA EMBEDDER LIBRARY-->
<?php if(strrpos ($_SERVER["REQUEST_URI"], 'dev')!==FALSE){ ?>
            <script type="text/javascript" src="/global/js/jvectormap/jquery-jvectormap-1.2.2.min.js"></script>
            <script type="text/javascript" src="/global/js/flot/jquery.flot.min.js"></script><!-- 52 kb; version 0.8.3-->
            <script type="text/javascript" src="/global/js/flot/jquery.flot.time.min.js"></script><!--5kb-->
            <script type="text/javascript" src="/global/js/require/require.2.1.1.min.js"></script><!--15kb-->
            <script type="text/javascript" src="/global/js/fancybox/jquery.fancybox-1.3.4.pack.js"></script><!--16kb+images-->
            <script type="text/javascript" src="/global/js/loadmask/jquery.loadmask.min.js"></script><!--2kb+images-->
            <script type="text/javascript" src="/workbenchdev/js/globals.js"></script>
            <script type="text/javascript" src="/global/js/colour/Colour.js"></script>
            <script type="text/javascript" src="/workbenchdev/js/common.js"></script>
            <script type="text/javascript" src="/workbenchdev/js/annotator.js"></script>
            <script type="text/javascript" src="/workbenchdev/js/graph.js"></script>
            <script type="text/javascript" src="/workbenchdev/js/shims.js"></script>
            <script type="text/javascript" src="/embedder/mashabledata_embedtools.js"></script>
<?php } else { ?>
    <script type="text/javascript" src="/global/js/highcharts/js/highcharts.3.0.8.js"></script>
    <script type="text/javascript" src="/embedder/mashabledata_embedtools.min.js"></script>
<?php }  ?>
        </head>
<body>
<?php
    $graphcode = isset($_REQUEST["graphcode"])?$_REQUEST["graphcode"]:"a09fd213e478512872f1eb26de45d0b4";
?>
    <p>This is an plain HTML page with the MashableData embedder JavaScrip library referenced.  After the page loads, the library searches for DIV element of class="mashabledata_embed" and instantiates an interactive graph corresponding to the data attribute:</p>
    <span style="font-family: sans-serif; font;background-color: lightcyan;margin-bottom: 15px; padding: 5px;">&lt;div class="mashabledata_embed"  data="<?=$graphcode ?>"&gt;&lt;/div&gt;</span>

    <div class="mashabledata_embed"  data="<?=$graphcode ?>" style="margin: 10px; height: 1000px;border: thin solid black;"></div>

</body>
