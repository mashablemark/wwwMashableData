<?php
/**
 * Copyright MashableData 2015.  Public usage be used to embed a MashableData visualization on third party website using an IFRAME tag which calls this resource
 * User: Mark Elbert
 * Date: 7/4/2015
 *
 *
 */

$workbenchVersion = "-1.0";
?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html style="height:100%;">
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1" />
            <link rel="shortcut icon" href="/favicon.ico" />
            <meta http-equiv="X-UA-Compatible" content="IE=9">
            <title>MashableData Embedded Visualization</title>

            <!--CSS files-->
            <link  rel="stylesheet" href="/global/css/smoothness/jquery-ui-1.11.css" />
            <link rel="stylesheet" href="/embed/mashabledata_embedtools.css" />
            <!-- Google Analytics -->
            <script type="text/javascript">
                (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
                (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
                m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
                })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

                ga('create', 'UA-37101083-1', 'auto');
                ga('set', {
                page: '/embed/?url=' + document.referrer,
                title: 'Embedded MD Visualization'
                });
                ga('send', 'pageview');
            </script>
            <!--JQUERY LIBRARIES-->
            <script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js"></script>
            <script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jqueryui/1.11.4/jquery-ui.min.js"></script>

            <script type="text/javascript" src="/global/js/highcharts/js/highcharts.3.0.10.min.js"></script>
            <!--MASHABLEDATA EMBEDDER LIBRARY-->
            <?php if(strrpos ($_SERVER["HTTP_REFERER"], 'www.mashabledata.com/previewdev')!==FALSE){ ?>
                <script type="text/javascript" src="/global/js/jvectormap/jquery-jvectormap-2.0.1.min.js"></script>
                <script type="text/javascript" src="/global/js/require/require.2.1.1.js"></script><!--15kb-->
                <script type="text/javascript" src="/global/js/fancybox/jquery.fancybox-1.3.4.pack.js"></script><!--16kb+images-->
                <script type="text/javascript" src="/global/js/loadmask/jquery.loadmask.min.js"></script><!--2kb+images-->
                <script type="text/javascript" src="/global/js/colour/Colour.js"></script>
                <script type="text/javascript" src="/workbenchdev/js/globals.js"></script>
                <script type="text/javascript" src="/workbenchdev/js/common.js"></script>
                <script type="text/javascript" src="/workbenchdev/js/set.js"></script>
                <script type="text/javascript" src="/workbenchdev/js/plot.js"></script>
                <script type="text/javascript" src="/workbenchdev/js/graph.js"></script>
                <script type="text/javascript" src="/workbenchdev/js/maps.js"></script>
                <script type="text/javascript" src="/workbenchdev/js/grapher.js"></script>
                <script type="text/javascript" src="/workbenchdev/js/shims.js"></script>
                <script type="text/javascript" src="/workbenchdev/js/jstat.js"></script>
                <script type="text/javascript" src="/workbenchdev/js/annotator.js"></script>
                <script type="text/javascript" src="/workbenchdev/js/treemap.js"></script>
                <script type="text/javascript" src="/embed/mashabledata_embedtools.js>"></script>
            <?php } else { ?>
                <script type="text/javascript" src="/embed/mashabledata_embedtools.min.js"></script>
            <?php }
            // the graphcode could be read by jQuery, but this will request and load the graph definition and map definition faster
            if(isset($_REQUEST["g"])) {
                $graphcode = $_REQUEST["g"];
                print('<script type="text/javascript" src="//www.mashabledata.com/graph_data/' . $graphcode . '.js"></script>');
            } else {
                $graphcode = false;
            }
            if(isset($_REQUEST["map"])) {
                $map = $_REQUEST["map"];
                print('<script type="text/javascript" src="//www.mashabledata.com/global/js/map/$map.js"></script>');
            }
            // the height and width will be ready by jQuery
            ?>
    </head>
    <body style="font-family: arial, sans-serif;padding:0;margin:0;height:100%;">
        <div class="mashabledata_embed if"  data="<?=$graphcode ?>" style="height:100%;"></div>
    </body>
</html>



