<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html>
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1" />
            <link rel="shortcut icon" href="/favicon.ico" />
            <meta http-equiv="X-UA-Compatible" content="IE=9">
            <title>MashableData Embedder Samples</title>

            <!--CSS files-->
            <link  rel="stylesheet" href="<?=$domain?>/global/css/smoothness/jquery-ui-1.9.2.custom.css" />

            <link rel="stylesheet" href="<?=$domain?>/embedder/mashabledata_embedtools.css" />

            <!--LIBRARIES-->
            <?php if($_SERVER["SERVER_NAME"]=='localhost' || isset($_REQUEST["full"])){ ?>
                <!--domestic JavaScript files-->
                <script type="text/javascript" src="<?=$domain?>/global/js/jquery/jquery-1.8.3.js"></script>
                <script type="text/javascript" src="<?=$domain?>/global/js/jqueryui/jquery-ui-1.9.2.custom.min.js"></script>
            <?php } else { ?>
                <!--Google API JavaScript files-->
                <script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js"></script>
                <script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jqueryui/1.9.2/jquery-ui.min.js"></script>
            <?php }  ?>
            <script type="text/javascript" src="<?=$domain?>/global/js/highcharts/js/highcharts.3.0.8.js"></script>
            <!---script type="text/javascript" src="/global/js/jvectormap/jquery-mousewheel.js"></script--->
            <script type="text/javascript" src="<?=$domain?>/global/js/jvectormap/jquery-jvectormap-1.2.2.min.js"></script>
            <script type="text/javascript" src="<?=$domain?>/global/js/sparklines/jquery.sparkline.js"></script><!-- version 2.1-->
            <!--WORKBENCH CODE-->
            <?php if(strrpos ($_SERVER["REQUEST_URI"], 'test')!==FALSE){ ?>
                <!--15kb--><script type="text/javascript" src="<?=$domain?>/global/js/require/require.2.1.1.min.js"></script>
                <!--16kb+images--><script type="text/javascript" src="<?=$domain?>/global/js/fancybox/jquery.fancybox-1.3.4.pack.js"></script>
                <!--2kb+images--><script type="text/javascript" src="<?=$domain?>/global/js/loadmask/jquery.loadmask.min.js"></script>
                <script type="text/javascript" src="<?=$domain?>/workbenchdev/js/globals.js"></script>
                <script type="text/javascript" src="<?=$domain?>/global/js/colour/Colour.js"></script>
                <script type="text/javascript" src="<?=$domain?>/workbenchdev/js/common.js"></script>
                <script type="text/javascript" src="<?=$domain?>/workbenchdev/js/annotator.js"></script>
                <script type="text/javascript" src="<?=$domain?>/workbenchdev/js/graph.js"></script>
                <script type="text/javascript" src="<?=$domain?>/workbenchdev/js/shims.js"></script>
                <script type="text/javascript" src="<?=$domain?>/embedder/mashabledata_embedtools.js"></script>
            <?php } else { ?>
                <script type="text/javascript" src="<?=$domain?>/embedder/mashabledata_embedtools.min.js"></script>
            <?php }  ?>
        </head>
<body>
    <p>This is an plain HTML page with the MashableData embedder JavaScrip library referenced.  After the page loads, the library searches for DIV element of class="mashabledata_embed" and instantiates an interactive graph corresponding to the data attribute:</p>
    <span style="font-family: sans-serif; font;background-color: lightcyan;margin-bottom: 15px; padding: 5px;">&lt;div class="mashabledata_embed"  data="a09fd213e478512872f1eb26de45d0b4"&gt;&lt;/div&gt;</span>
    <select><option value="">select a different graph</option><option value="da3d58a42f7c5cf7ae7948892b1be27c">map of US unemployment rate</option><option value="26e30b38e5f9fedef1c7d1083f790366">What to Grow: Wheat or Corn?</option></select>
    <div class="mashabledata_embed"  data="a09fd213e478512872f1eb26de45d0b4" style="margin: 10px; height: 1000px;border: thin solid black;"></div>

</body>
<script type="application/javascript">
$(document).ready(function(){
    var $select = $('select');
    $select.change(function(){
        var graphcode = $select.val();
        if(graphcode!=''){
            var $div = $('.mashabledata_embed');
            $div.attr('data', graphcode);
            MashableData.plugin.embed($div);
        }
    });
$()
});
</script>
