




<!DOCTYPE html>
<html class="   ">
  <head prefix="og: http://ogp.me/ns# fb: http://ogp.me/ns/fb# object: http://ogp.me/ns/object# article: http://ogp.me/ns/article# profile: http://ogp.me/ns/profile#">
    <meta charset='utf-8'>
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    
    
    <title>SlickGrid/slick.core.js at master · mleibman/SlickGrid · GitHub</title>
    <link rel="search" type="application/opensearchdescription+xml" href="/opensearch.xml" title="GitHub" />
    <link rel="fluid-icon" href="https://github.com/fluidicon.png" title="GitHub" />
    <link rel="apple-touch-icon" sizes="57x57" href="/apple-touch-icon-114.png" />
    <link rel="apple-touch-icon" sizes="114x114" href="/apple-touch-icon-114.png" />
    <link rel="apple-touch-icon" sizes="72x72" href="/apple-touch-icon-144.png" />
    <link rel="apple-touch-icon" sizes="144x144" href="/apple-touch-icon-144.png" />
    <meta property="fb:app_id" content="1401488693436528"/>

      <meta content="@github" name="twitter:site" /><meta content="summary" name="twitter:card" /><meta content="mleibman/SlickGrid" name="twitter:title" /><meta content="SlickGrid - A lightning fast JavaScript grid/spreadsheet" name="twitter:description" /><meta content="https://avatars2.githubusercontent.com/u/168725?s=400" name="twitter:image:src" />
<meta content="GitHub" property="og:site_name" /><meta content="object" property="og:type" /><meta content="https://avatars2.githubusercontent.com/u/168725?s=400" property="og:image" /><meta content="mleibman/SlickGrid" property="og:title" /><meta content="https://github.com/mleibman/SlickGrid" property="og:url" /><meta content="SlickGrid - A lightning fast JavaScript grid/spreadsheet" property="og:description" />

    <link rel="assets" href="https://github.global.ssl.fastly.net/">
    <link rel="conduit-xhr" href="https://ghconduit.com:25035/">
    <link rel="xhr-socket" href="/_sockets" />

    <meta name="msapplication-TileImage" content="/windows-tile.png" />
    <meta name="msapplication-TileColor" content="#ffffff" />
    <meta name="selected-link" value="repo_source" data-pjax-transient />
    <meta content="collector.githubapp.com" name="octolytics-host" /><meta content="collector-cdn.github.com" name="octolytics-script-host" /><meta content="github" name="octolytics-app-id" /><meta content="D80F3A49:4D26:ECABA4:53637B58" name="octolytics-dimension-request_id" />
    

    
    
    <link rel="icon" type="image/x-icon" href="https://github.global.ssl.fastly.net/favicon.ico" />

    <meta content="authenticity_token" name="csrf-param" />
<meta content="NNwjyO++DlDhkEcTUxlg+DMkSde/R8Rzuini1NGa56mMOv8sbD8R8CXTMt4cjnGOHzzZ/qNBTLtSaLokdglnxQ==" name="csrf-token" />

    <link href="https://github.global.ssl.fastly.net/assets/github-e73e0646916a30d4e31df55ea3bc78cc29473d43.css" media="all" rel="stylesheet" type="text/css" />
    <link href="https://github.global.ssl.fastly.net/assets/github2-b94746040a61686e405f35f6a21b3b657aca5d48.css" media="all" rel="stylesheet" type="text/css" />
    


        <script crossorigin="anonymous" src="https://github.global.ssl.fastly.net/assets/frameworks-abc81e706df1b74d6ac26c344580917e7afe15bb.js" type="text/javascript"></script>
        <script async="async" crossorigin="anonymous" src="https://github.global.ssl.fastly.net/assets/github-0a1bfc834304e6a34b61368df72c105a3fb997a0.js" type="text/javascript"></script>
        
        
      <meta http-equiv="x-pjax-version" content="b09b4b5f30d93b083e6fb687f2466ad9">

      
  <meta name="description" content="SlickGrid - A lightning fast JavaScript grid/spreadsheet" />

  <meta content="168725" name="octolytics-dimension-user_id" /><meta content="mleibman" name="octolytics-dimension-user_login" /><meta content="440826" name="octolytics-dimension-repository_id" /><meta content="mleibman/SlickGrid" name="octolytics-dimension-repository_nwo" /><meta content="true" name="octolytics-dimension-repository_public" /><meta content="false" name="octolytics-dimension-repository_is_fork" /><meta content="440826" name="octolytics-dimension-repository_network_root_id" /><meta content="mleibman/SlickGrid" name="octolytics-dimension-repository_network_root_nwo" />
  <link href="https://github.com/mleibman/SlickGrid/commits/master.atom" rel="alternate" title="Recent Commits to SlickGrid:master" type="application/atom+xml" />

  </head>


  <body class="logged_out  env-production windows vis-public page-blob">
    <a href="#start-of-content" tabindex="1" class="accessibility-aid js-skip-to-content">Skip to content</a>
    <div class="wrapper">
      
      
      
      


      
      <div class="header header-logged-out">
  <div class="container clearfix">

    <a class="header-logo-wordmark" href="https://github.com/">
      <span class="mega-octicon octicon-logo-github"></span>
    </a>

    <div class="header-actions">
        <a class="button primary" href="/join">Sign up</a>
      <a class="button signin" href="/login?return_to=%2Fmleibman%2FSlickGrid%2Fblob%2Fmaster%2Fslick.core.js">Sign in</a>
    </div>

    <div class="command-bar js-command-bar  in-repository">

      <ul class="top-nav">
          <li class="explore"><a href="/explore">Explore</a></li>
        <li class="features"><a href="/features">Features</a></li>
          <li class="enterprise"><a href="https://enterprise.github.com/">Enterprise</a></li>
          <li class="blog"><a href="/blog">Blog</a></li>
      </ul>
        <form accept-charset="UTF-8" action="/search" class="command-bar-form" id="top_search_form" method="get">

<div class="commandbar">
  <span class="message"></span>
  <input type="text" data-hotkey="s, /" name="q" id="js-command-bar-field" placeholder="Search or type a command" tabindex="1" autocapitalize="off"
    
    
      data-repo="mleibman/SlickGrid"
      data-branch="master"
      data-sha="c3a6a06f4d740dee8fe572e55c85cea37a682db4"
  >
  <div class="display hidden"></div>
</div>

    <input type="hidden" name="nwo" value="mleibman/SlickGrid" />

    <div class="select-menu js-menu-container js-select-menu search-context-select-menu">
      <span class="minibutton select-menu-button js-menu-target" role="button" aria-haspopup="true">
        <span class="js-select-button">This repository</span>
      </span>

      <div class="select-menu-modal-holder js-menu-content js-navigation-container" aria-hidden="true">
        <div class="select-menu-modal">

          <div class="select-menu-item js-navigation-item js-this-repository-navigation-item selected">
            <span class="select-menu-item-icon octicon octicon-check"></span>
            <input type="radio" class="js-search-this-repository" name="search_target" value="repository" checked="checked" />
            <div class="select-menu-item-text js-select-button-text">This repository</div>
          </div> <!-- /.select-menu-item -->

          <div class="select-menu-item js-navigation-item js-all-repositories-navigation-item">
            <span class="select-menu-item-icon octicon octicon-check"></span>
            <input type="radio" name="search_target" value="global" />
            <div class="select-menu-item-text js-select-button-text">All repositories</div>
          </div> <!-- /.select-menu-item -->

        </div>
      </div>
    </div>

  <span class="help tooltipped tooltipped-s" aria-label="Show command bar help">
    <span class="octicon octicon-question"></span>
  </span>


  <input type="hidden" name="ref" value="cmdform">

</form>
    </div>

  </div>
</div>



      <div id="start-of-content" class="accessibility-aid"></div>
          <div class="site" itemscope itemtype="http://schema.org/WebPage">
    <div id="js-flash-container">
      
    </div>
    <div class="pagehead repohead instapaper_ignore readability-menu">
      <div class="container">
        

<ul class="pagehead-actions">


  <li>
    <a href="/login?return_to=%2Fmleibman%2FSlickGrid"
    class="minibutton with-count star-button tooltipped tooltipped-n"
    aria-label="You must be signed in to star a repository" rel="nofollow">
    <span class="octicon octicon-star"></span>Star
  </a>

    <a class="social-count js-social-count" href="/mleibman/SlickGrid/stargazers">
      4,101
    </a>

  </li>

    <li>
      <a href="/login?return_to=%2Fmleibman%2FSlickGrid"
        class="minibutton with-count js-toggler-target fork-button tooltipped tooltipped-n"
        aria-label="You must be signed in to fork a repository" rel="nofollow">
        <span class="octicon octicon-git-branch"></span>Fork
      </a>
      <a href="/mleibman/SlickGrid/network" class="social-count">
        1,173
      </a>
    </li>
</ul>

        <h1 itemscope itemtype="http://data-vocabulary.org/Breadcrumb" class="entry-title public">
          <span class="repo-label"><span>public</span></span>
          <span class="mega-octicon octicon-repo"></span>
          <span class="author"><a href="/mleibman" class="url fn" itemprop="url" rel="author"><span itemprop="title">mleibman</span></a></span><!--
       --><span class="path-divider">/</span><!--
       --><strong><a href="/mleibman/SlickGrid" class="js-current-repository js-repo-home-link">SlickGrid</a></strong>

          <span class="page-context-loader">
            <img alt="Octocat-spinner-32" height="16" src="https://github.global.ssl.fastly.net/images/spinners/octocat-spinner-32.gif" width="16" />
          </span>

        </h1>
      </div><!-- /.container -->
    </div><!-- /.repohead -->

    <div class="container">
      <div class="repository-with-sidebar repo-container new-discussion-timeline js-new-discussion-timeline  ">
        <div class="repository-sidebar clearfix">
            

<div class="sunken-menu vertical-right repo-nav js-repo-nav js-repository-container-pjax js-octicon-loaders">
  <div class="sunken-menu-contents">
    <ul class="sunken-menu-group">
      <li class="tooltipped tooltipped-w" aria-label="Code">
        <a href="/mleibman/SlickGrid" aria-label="Code" class="selected js-selected-navigation-item sunken-menu-item" data-hotkey="g c" data-pjax="true" data-selected-links="repo_source repo_downloads repo_commits repo_releases repo_tags repo_branches /mleibman/SlickGrid">
          <span class="octicon octicon-code"></span> <span class="full-word">Code</span>
          <img alt="Octocat-spinner-32" class="mini-loader" height="16" src="https://github.global.ssl.fastly.net/images/spinners/octocat-spinner-32.gif" width="16" />
</a>      </li>

        <li class="tooltipped tooltipped-w" aria-label="Issues">
          <a href="/mleibman/SlickGrid/issues" aria-label="Issues" class="js-selected-navigation-item sunken-menu-item js-disable-pjax" data-hotkey="g i" data-selected-links="repo_issues /mleibman/SlickGrid/issues">
            <span class="octicon octicon-issue-opened"></span> <span class="full-word">Issues</span>
            <span class='counter'>280</span>
            <img alt="Octocat-spinner-32" class="mini-loader" height="16" src="https://github.global.ssl.fastly.net/images/spinners/octocat-spinner-32.gif" width="16" />
</a>        </li>

      <li class="tooltipped tooltipped-w" aria-label="Pull Requests">
        <a href="/mleibman/SlickGrid/pulls" aria-label="Pull Requests" class="js-selected-navigation-item sunken-menu-item js-disable-pjax" data-hotkey="g p" data-selected-links="repo_pulls /mleibman/SlickGrid/pulls">
            <span class="octicon octicon-git-pull-request"></span> <span class="full-word">Pull Requests</span>
            <span class='counter'>99</span>
            <img alt="Octocat-spinner-32" class="mini-loader" height="16" src="https://github.global.ssl.fastly.net/images/spinners/octocat-spinner-32.gif" width="16" />
</a>      </li>


        <li class="tooltipped tooltipped-w" aria-label="Wiki">
          <a href="/mleibman/SlickGrid/wiki" aria-label="Wiki" class="js-selected-navigation-item sunken-menu-item" data-pjax="true" data-selected-links="repo_wiki /mleibman/SlickGrid/wiki">
            <span class="octicon octicon-book"></span> <span class="full-word">Wiki</span>
            <img alt="Octocat-spinner-32" class="mini-loader" height="16" src="https://github.global.ssl.fastly.net/images/spinners/octocat-spinner-32.gif" width="16" />
</a>        </li>
    </ul>
    <div class="sunken-menu-separator"></div>
    <ul class="sunken-menu-group">

      <li class="tooltipped tooltipped-w" aria-label="Pulse">
        <a href="/mleibman/SlickGrid/pulse" aria-label="Pulse" class="js-selected-navigation-item sunken-menu-item" data-pjax="true" data-selected-links="pulse /mleibman/SlickGrid/pulse">
          <span class="octicon octicon-pulse"></span> <span class="full-word">Pulse</span>
          <img alt="Octocat-spinner-32" class="mini-loader" height="16" src="https://github.global.ssl.fastly.net/images/spinners/octocat-spinner-32.gif" width="16" />
</a>      </li>

      <li class="tooltipped tooltipped-w" aria-label="Graphs">
        <a href="/mleibman/SlickGrid/graphs" aria-label="Graphs" class="js-selected-navigation-item sunken-menu-item" data-pjax="true" data-selected-links="repo_graphs repo_contributors /mleibman/SlickGrid/graphs">
          <span class="octicon octicon-graph"></span> <span class="full-word">Graphs</span>
          <img alt="Octocat-spinner-32" class="mini-loader" height="16" src="https://github.global.ssl.fastly.net/images/spinners/octocat-spinner-32.gif" width="16" />
</a>      </li>

      <li class="tooltipped tooltipped-w" aria-label="Network">
        <a href="/mleibman/SlickGrid/network" aria-label="Network" class="js-selected-navigation-item sunken-menu-item js-disable-pjax" data-selected-links="repo_network /mleibman/SlickGrid/network">
          <span class="octicon octicon-git-branch"></span> <span class="full-word">Network</span>
          <img alt="Octocat-spinner-32" class="mini-loader" height="16" src="https://github.global.ssl.fastly.net/images/spinners/octocat-spinner-32.gif" width="16" />
</a>      </li>
    </ul>


  </div>
</div>

              <div class="only-with-full-nav">
                

  

<div class="clone-url open"
  data-protocol-type="http"
  data-url="/users/set_protocol?protocol_selector=http&amp;protocol_type=clone">
  <h3><strong>HTTPS</strong> clone URL</h3>
  <div class="clone-url-box">
    <input type="text" class="clone js-url-field"
           value="https://github.com/mleibman/SlickGrid.git" readonly="readonly">

    <span aria-label="copy to clipboard" class="js-zeroclipboard url-box-clippy minibutton zeroclipboard-button" data-clipboard-text="https://github.com/mleibman/SlickGrid.git" data-copied-hint="copied!"><span class="octicon octicon-clippy"></span></span>
  </div>
</div>

  

<div class="clone-url "
  data-protocol-type="subversion"
  data-url="/users/set_protocol?protocol_selector=subversion&amp;protocol_type=clone">
  <h3><strong>Subversion</strong> checkout URL</h3>
  <div class="clone-url-box">
    <input type="text" class="clone js-url-field"
           value="https://github.com/mleibman/SlickGrid" readonly="readonly">

    <span aria-label="copy to clipboard" class="js-zeroclipboard url-box-clippy minibutton zeroclipboard-button" data-clipboard-text="https://github.com/mleibman/SlickGrid" data-copied-hint="copied!"><span class="octicon octicon-clippy"></span></span>
  </div>
</div>


<p class="clone-options">You can clone with
      <a href="#" class="js-clone-selector" data-protocol="http">HTTPS</a>
      or <a href="#" class="js-clone-selector" data-protocol="subversion">Subversion</a>.
  <span class="help tooltipped tooltipped-n" aria-label="Get help on which URL is right for you.">
    <a href="https://help.github.com/articles/which-remote-url-should-i-use">
    <span class="octicon octicon-question"></span>
    </a>
  </span>
</p>


  <a href="http://windows.github.com" class="minibutton sidebar-button" title="Save mleibman/SlickGrid to your computer and use it in GitHub Desktop." aria-label="Save mleibman/SlickGrid to your computer and use it in GitHub Desktop.">
    <span class="octicon octicon-device-desktop"></span>
    Clone in Desktop
  </a>

                <a href="/mleibman/SlickGrid/archive/master.zip"
                   class="minibutton sidebar-button"
                   aria-label="Download mleibman/SlickGrid as a zip file"
                   title="Download mleibman/SlickGrid as a zip file"
                   rel="nofollow">
                  <span class="octicon octicon-cloud-download"></span>
                  Download ZIP
                </a>
              </div>
        </div><!-- /.repository-sidebar -->

        <div id="js-repo-pjax-container" class="repository-content context-loader-container" data-pjax-container>
          

<a href="/mleibman/SlickGrid/blob/33e75b07bfd769349525dc084d987c406fc03e24/slick.core.js" class="hidden js-permalink-shortcut" data-hotkey="y">Permalink</a>

<!-- blob contrib key: blob_contributors:v21:171f40fa40079724c1f711df59dda25e -->

<p title="This is a placeholder element" class="js-history-link-replace hidden"></p>

<a href="/mleibman/SlickGrid/find/master" data-pjax data-hotkey="t" class="js-show-file-finder" style="display:none">Show File Finder</a>

<div class="file-navigation">
  

<div class="select-menu js-menu-container js-select-menu" >
  <span class="minibutton select-menu-button js-menu-target" data-hotkey="w"
    data-master-branch="master"
    data-ref="master"
    role="button" aria-label="Switch branches or tags" tabindex="0" aria-haspopup="true">
    <span class="octicon octicon-git-branch"></span>
    <i>branch:</i>
    <span class="js-select-button">master</span>
  </span>

  <div class="select-menu-modal-holder js-menu-content js-navigation-container" data-pjax aria-hidden="true">

    <div class="select-menu-modal">
      <div class="select-menu-header">
        <span class="select-menu-title">Switch branches/tags</span>
        <span class="octicon octicon-remove-close js-menu-close"></span>
      </div> <!-- /.select-menu-header -->

      <div class="select-menu-filters">
        <div class="select-menu-text-filter">
          <input type="text" aria-label="Filter branches/tags" id="context-commitish-filter-field" class="js-filterable-field js-navigation-enable" placeholder="Filter branches/tags">
        </div>
        <div class="select-menu-tabs">
          <ul>
            <li class="select-menu-tab">
              <a href="#" data-tab-filter="branches" class="js-select-menu-tab">Branches</a>
            </li>
            <li class="select-menu-tab">
              <a href="#" data-tab-filter="tags" class="js-select-menu-tab">Tags</a>
            </li>
          </ul>
        </div><!-- /.select-menu-tabs -->
      </div><!-- /.select-menu-filters -->

      <div class="select-menu-list select-menu-tab-bucket js-select-menu-tab-bucket" data-tab-filter="branches">

        <div data-filterable-for="context-commitish-filter-field" data-filterable-type="substring">


            <div class="select-menu-item js-navigation-item ">
              <span class="select-menu-item-icon octicon octicon-check"></span>
              <a href="/mleibman/SlickGrid/blob/2.1/slick.core.js"
                 data-name="2.1"
                 data-skip-pjax="true"
                 rel="nofollow"
                 class="js-navigation-open select-menu-item-text js-select-button-text css-truncate-target"
                 title="2.1">2.1</a>
            </div> <!-- /.select-menu-item -->
            <div class="select-menu-item js-navigation-item ">
              <span class="select-menu-item-icon octicon octicon-check"></span>
              <a href="/mleibman/SlickGrid/blob/gh-pages/slick.core.js"
                 data-name="gh-pages"
                 data-skip-pjax="true"
                 rel="nofollow"
                 class="js-navigation-open select-menu-item-text js-select-button-text css-truncate-target"
                 title="gh-pages">gh-pages</a>
            </div> <!-- /.select-menu-item -->
            <div class="select-menu-item js-navigation-item selected">
              <span class="select-menu-item-icon octicon octicon-check"></span>
              <a href="/mleibman/SlickGrid/blob/master/slick.core.js"
                 data-name="master"
                 data-skip-pjax="true"
                 rel="nofollow"
                 class="js-navigation-open select-menu-item-text js-select-button-text css-truncate-target"
                 title="master">master</a>
            </div> <!-- /.select-menu-item -->
            <div class="select-menu-item js-navigation-item ">
              <span class="select-menu-item-icon octicon octicon-check"></span>
              <a href="/mleibman/SlickGrid/blob/v2.0/slick.core.js"
                 data-name="v2.0"
                 data-skip-pjax="true"
                 rel="nofollow"
                 class="js-navigation-open select-menu-item-text js-select-button-text css-truncate-target"
                 title="v2.0">v2.0</a>
            </div> <!-- /.select-menu-item -->
        </div>

          <div class="select-menu-no-results">Nothing to show</div>
      </div> <!-- /.select-menu-list -->

      <div class="select-menu-list select-menu-tab-bucket js-select-menu-tab-bucket" data-tab-filter="tags">
        <div data-filterable-for="context-commitish-filter-field" data-filterable-type="substring">


            <div class="select-menu-item js-navigation-item ">
              <span class="select-menu-item-icon octicon octicon-check"></span>
              <a href="/mleibman/SlickGrid/tree/2.02/slick.core.js"
                 data-name="2.02"
                 data-skip-pjax="true"
                 rel="nofollow"
                 class="js-navigation-open select-menu-item-text js-select-button-text css-truncate-target"
                 title="2.02">2.02</a>
            </div> <!-- /.select-menu-item -->
            <div class="select-menu-item js-navigation-item ">
              <span class="select-menu-item-icon octicon octicon-check"></span>
              <a href="/mleibman/SlickGrid/tree/2.1.0/slick.core.js"
                 data-name="2.1.0"
                 data-skip-pjax="true"
                 rel="nofollow"
                 class="js-navigation-open select-menu-item-text js-select-button-text css-truncate-target"
                 title="2.1.0">2.1.0</a>
            </div> <!-- /.select-menu-item -->
            <div class="select-menu-item js-navigation-item ">
              <span class="select-menu-item-icon octicon octicon-check"></span>
              <a href="/mleibman/SlickGrid/tree/2.1/slick.core.js"
                 data-name="2.1"
                 data-skip-pjax="true"
                 rel="nofollow"
                 class="js-navigation-open select-menu-item-text js-select-button-text css-truncate-target"
                 title="2.1">2.1</a>
            </div> <!-- /.select-menu-item -->
            <div class="select-menu-item js-navigation-item ">
              <span class="select-menu-item-icon octicon octicon-check"></span>
              <a href="/mleibman/SlickGrid/tree/2.0b1/slick.core.js"
                 data-name="2.0b1"
                 data-skip-pjax="true"
                 rel="nofollow"
                 class="js-navigation-open select-menu-item-text js-select-button-text css-truncate-target"
                 title="2.0b1">2.0b1</a>
            </div> <!-- /.select-menu-item -->
            <div class="select-menu-item js-navigation-item ">
              <span class="select-menu-item-icon octicon octicon-check"></span>
              <a href="/mleibman/SlickGrid/tree/2.0.2/slick.core.js"
                 data-name="2.0.2"
                 data-skip-pjax="true"
                 rel="nofollow"
                 class="js-navigation-open select-menu-item-text js-select-button-text css-truncate-target"
                 title="2.0.2">2.0.2</a>
            </div> <!-- /.select-menu-item -->
            <div class="select-menu-item js-navigation-item ">
              <span class="select-menu-item-icon octicon octicon-check"></span>
              <a href="/mleibman/SlickGrid/tree/2.0.1/slick.core.js"
                 data-name="2.0.1"
                 data-skip-pjax="true"
                 rel="nofollow"
                 class="js-navigation-open select-menu-item-text js-select-button-text css-truncate-target"
                 title="2.0.1">2.0.1</a>
            </div> <!-- /.select-menu-item -->
            <div class="select-menu-item js-navigation-item ">
              <span class="select-menu-item-icon octicon octicon-check"></span>
              <a href="/mleibman/SlickGrid/tree/2.0/slick.core.js"
                 data-name="2.0"
                 data-skip-pjax="true"
                 rel="nofollow"
                 class="js-navigation-open select-menu-item-text js-select-button-text css-truncate-target"
                 title="2.0">2.0</a>
            </div> <!-- /.select-menu-item -->
            <div class="select-menu-item js-navigation-item ">
              <span class="select-menu-item-icon octicon octicon-check"></span>
              <a href="/mleibman/SlickGrid/tree/1.4b2/slick.core.js"
                 data-name="1.4b2"
                 data-skip-pjax="true"
                 rel="nofollow"
                 class="js-navigation-open select-menu-item-text js-select-button-text css-truncate-target"
                 title="1.4b2">1.4b2</a>
            </div> <!-- /.select-menu-item -->
            <div class="select-menu-item js-navigation-item ">
              <span class="select-menu-item-icon octicon octicon-check"></span>
              <a href="/mleibman/SlickGrid/tree/1.4b1/slick.core.js"
                 data-name="1.4b1"
                 data-skip-pjax="true"
                 rel="nofollow"
                 class="js-navigation-open select-menu-item-text js-select-button-text css-truncate-target"
                 title="1.4b1">1.4b1</a>
            </div> <!-- /.select-menu-item -->
            <div class="select-menu-item js-navigation-item ">
              <span class="select-menu-item-icon octicon octicon-check"></span>
              <a href="/mleibman/SlickGrid/tree/1.4.3/slick.core.js"
                 data-name="1.4.3"
                 data-skip-pjax="true"
                 rel="nofollow"
                 class="js-navigation-open select-menu-item-text js-select-button-text css-truncate-target"
                 title="1.4.3">1.4.3</a>
            </div> <!-- /.select-menu-item -->
            <div class="select-menu-item js-navigation-item ">
              <span class="select-menu-item-icon octicon octicon-check"></span>
              <a href="/mleibman/SlickGrid/tree/1.4.1/slick.core.js"
                 data-name="1.4.1"
                 data-skip-pjax="true"
                 rel="nofollow"
                 class="js-navigation-open select-menu-item-text js-select-button-text css-truncate-target"
                 title="1.4.1">1.4.1</a>
            </div> <!-- /.select-menu-item -->
            <div class="select-menu-item js-navigation-item ">
              <span class="select-menu-item-icon octicon octicon-check"></span>
              <a href="/mleibman/SlickGrid/tree/1.4/slick.core.js"
                 data-name="1.4"
                 data-skip-pjax="true"
                 rel="nofollow"
                 class="js-navigation-open select-menu-item-text js-select-button-text css-truncate-target"
                 title="1.4">1.4</a>
            </div> <!-- /.select-menu-item -->
            <div class="select-menu-item js-navigation-item ">
              <span class="select-menu-item-icon octicon octicon-check"></span>
              <a href="/mleibman/SlickGrid/tree/1.3.2/slick.core.js"
                 data-name="1.3.2"
                 data-skip-pjax="true"
                 rel="nofollow"
                 class="js-navigation-open select-menu-item-text js-select-button-text css-truncate-target"
                 title="1.3.2">1.3.2</a>
            </div> <!-- /.select-menu-item -->
        </div>

        <div class="select-menu-no-results">Nothing to show</div>
      </div> <!-- /.select-menu-list -->

    </div> <!-- /.select-menu-modal -->
  </div> <!-- /.select-menu-modal-holder -->
</div> <!-- /.select-menu -->

  <div class="breadcrumb">
    <span class='repo-root js-repo-root'><span itemscope="" itemtype="http://data-vocabulary.org/Breadcrumb"><a href="/mleibman/SlickGrid" data-branch="master" data-direction="back" data-pjax="true" itemscope="url"><span itemprop="title">SlickGrid</span></a></span></span><span class="separator"> / </span><strong class="final-path">slick.core.js</strong> <span aria-label="copy to clipboard" class="js-zeroclipboard minibutton zeroclipboard-button" data-clipboard-text="slick.core.js" data-copied-hint="copied!"><span class="octicon octicon-clippy"></span></span>
  </div>
</div>


  <div class="commit file-history-tease">
    <img alt="Michael Leibman" class="main-avatar js-avatar" data-user="168725" height="24" src="https://avatars1.githubusercontent.com/u/168725?s=140" width="24" />
    <span class="author"><a href="/mleibman" rel="author">mleibman</a></span>
    <local-time datetime="2013-12-03T21:11:29-08:00" from="now" title-format="%Y-%m-%d %H:%M:%S %z" title="2013-12-03 21:11:29 -0800">December 03, 2013</local-time>
    <div class="commit-title">
        <a href="/mleibman/SlickGrid/commit/dc5f4cef17925db0367ef18091d5d88dbaf62e97" class="message" data-pjax="true" title="Implement lazy totals calculation in the DataView.

Add a ‘lazyTotalsCalculation’ grouping info option (default = false)
that delays the totals calculation until the item is accessed via
getItem(index).  This can dramatically improve the perceived
performance of the DataView operations on very large datasets.">Implement lazy totals calculation in the DataView.</a>
    </div>

    <div class="participation">
      <p class="quickstat"><a href="#blob_contributors_box" rel="facebox"><strong>1</strong>  contributor</a></p>
      
    </div>
    <div id="blob_contributors_box" style="display:none">
      <h2 class="facebox-header">Users who have contributed to this file</h2>
      <ul class="facebox-user-list">
          <li class="facebox-user-list-item">
            <img alt="Michael Leibman" class=" js-avatar" data-user="168725" height="24" src="https://avatars1.githubusercontent.com/u/168725?s=140" width="24" />
            <a href="/mleibman">mleibman</a>
          </li>
      </ul>
    </div>
  </div>

<div class="file-box">
  <div class="file">
    <div class="meta clearfix">
      <div class="info file-name">
        <span class="icon"><b class="octicon octicon-file-text"></b></span>
        <span class="mode" title="File Mode">file</span>
        <span class="meta-divider"></span>
          <span>468 lines (411 sloc)</span>
          <span class="meta-divider"></span>
        <span>12.99 kb</span>
      </div>
      <div class="actions">
        <div class="button-group">
            <a class="minibutton tooltipped tooltipped-w"
               href="http://windows.github.com" aria-label="Open this file in GitHub for Windows">
                <span class="octicon octicon-device-desktop"></span> Open
            </a>
              <a class="minibutton disabled tooltipped tooltipped-w" href="#"
                 aria-label="You must be signed in to make or propose changes">Edit</a>
          <a href="/mleibman/SlickGrid/raw/master/slick.core.js" class="button minibutton " id="raw-url">Raw</a>
            <a href="/mleibman/SlickGrid/blame/master/slick.core.js" class="button minibutton js-update-url-with-hash">Blame</a>
          <a href="/mleibman/SlickGrid/commits/master/slick.core.js" class="button minibutton " rel="nofollow">History</a>
        </div><!-- /.button-group -->
          <a class="minibutton danger disabled empty-icon tooltipped tooltipped-w" href="#"
             aria-label="You must be signed in to make or propose changes">
          Delete
        </a>
      </div><!-- /.actions -->
    </div>
        <div class="blob-wrapper data type-javascript js-blob-data">
        <table class="file-code file-diff tab-size-8">
          <tr class="file-code-line">
            <td class="blob-line-nums">
              <span id="L1" rel="#L1">1</span>
<span id="L2" rel="#L2">2</span>
<span id="L3" rel="#L3">3</span>
<span id="L4" rel="#L4">4</span>
<span id="L5" rel="#L5">5</span>
<span id="L6" rel="#L6">6</span>
<span id="L7" rel="#L7">7</span>
<span id="L8" rel="#L8">8</span>
<span id="L9" rel="#L9">9</span>
<span id="L10" rel="#L10">10</span>
<span id="L11" rel="#L11">11</span>
<span id="L12" rel="#L12">12</span>
<span id="L13" rel="#L13">13</span>
<span id="L14" rel="#L14">14</span>
<span id="L15" rel="#L15">15</span>
<span id="L16" rel="#L16">16</span>
<span id="L17" rel="#L17">17</span>
<span id="L18" rel="#L18">18</span>
<span id="L19" rel="#L19">19</span>
<span id="L20" rel="#L20">20</span>
<span id="L21" rel="#L21">21</span>
<span id="L22" rel="#L22">22</span>
<span id="L23" rel="#L23">23</span>
<span id="L24" rel="#L24">24</span>
<span id="L25" rel="#L25">25</span>
<span id="L26" rel="#L26">26</span>
<span id="L27" rel="#L27">27</span>
<span id="L28" rel="#L28">28</span>
<span id="L29" rel="#L29">29</span>
<span id="L30" rel="#L30">30</span>
<span id="L31" rel="#L31">31</span>
<span id="L32" rel="#L32">32</span>
<span id="L33" rel="#L33">33</span>
<span id="L34" rel="#L34">34</span>
<span id="L35" rel="#L35">35</span>
<span id="L36" rel="#L36">36</span>
<span id="L37" rel="#L37">37</span>
<span id="L38" rel="#L38">38</span>
<span id="L39" rel="#L39">39</span>
<span id="L40" rel="#L40">40</span>
<span id="L41" rel="#L41">41</span>
<span id="L42" rel="#L42">42</span>
<span id="L43" rel="#L43">43</span>
<span id="L44" rel="#L44">44</span>
<span id="L45" rel="#L45">45</span>
<span id="L46" rel="#L46">46</span>
<span id="L47" rel="#L47">47</span>
<span id="L48" rel="#L48">48</span>
<span id="L49" rel="#L49">49</span>
<span id="L50" rel="#L50">50</span>
<span id="L51" rel="#L51">51</span>
<span id="L52" rel="#L52">52</span>
<span id="L53" rel="#L53">53</span>
<span id="L54" rel="#L54">54</span>
<span id="L55" rel="#L55">55</span>
<span id="L56" rel="#L56">56</span>
<span id="L57" rel="#L57">57</span>
<span id="L58" rel="#L58">58</span>
<span id="L59" rel="#L59">59</span>
<span id="L60" rel="#L60">60</span>
<span id="L61" rel="#L61">61</span>
<span id="L62" rel="#L62">62</span>
<span id="L63" rel="#L63">63</span>
<span id="L64" rel="#L64">64</span>
<span id="L65" rel="#L65">65</span>
<span id="L66" rel="#L66">66</span>
<span id="L67" rel="#L67">67</span>
<span id="L68" rel="#L68">68</span>
<span id="L69" rel="#L69">69</span>
<span id="L70" rel="#L70">70</span>
<span id="L71" rel="#L71">71</span>
<span id="L72" rel="#L72">72</span>
<span id="L73" rel="#L73">73</span>
<span id="L74" rel="#L74">74</span>
<span id="L75" rel="#L75">75</span>
<span id="L76" rel="#L76">76</span>
<span id="L77" rel="#L77">77</span>
<span id="L78" rel="#L78">78</span>
<span id="L79" rel="#L79">79</span>
<span id="L80" rel="#L80">80</span>
<span id="L81" rel="#L81">81</span>
<span id="L82" rel="#L82">82</span>
<span id="L83" rel="#L83">83</span>
<span id="L84" rel="#L84">84</span>
<span id="L85" rel="#L85">85</span>
<span id="L86" rel="#L86">86</span>
<span id="L87" rel="#L87">87</span>
<span id="L88" rel="#L88">88</span>
<span id="L89" rel="#L89">89</span>
<span id="L90" rel="#L90">90</span>
<span id="L91" rel="#L91">91</span>
<span id="L92" rel="#L92">92</span>
<span id="L93" rel="#L93">93</span>
<span id="L94" rel="#L94">94</span>
<span id="L95" rel="#L95">95</span>
<span id="L96" rel="#L96">96</span>
<span id="L97" rel="#L97">97</span>
<span id="L98" rel="#L98">98</span>
<span id="L99" rel="#L99">99</span>
<span id="L100" rel="#L100">100</span>
<span id="L101" rel="#L101">101</span>
<span id="L102" rel="#L102">102</span>
<span id="L103" rel="#L103">103</span>
<span id="L104" rel="#L104">104</span>
<span id="L105" rel="#L105">105</span>
<span id="L106" rel="#L106">106</span>
<span id="L107" rel="#L107">107</span>
<span id="L108" rel="#L108">108</span>
<span id="L109" rel="#L109">109</span>
<span id="L110" rel="#L110">110</span>
<span id="L111" rel="#L111">111</span>
<span id="L112" rel="#L112">112</span>
<span id="L113" rel="#L113">113</span>
<span id="L114" rel="#L114">114</span>
<span id="L115" rel="#L115">115</span>
<span id="L116" rel="#L116">116</span>
<span id="L117" rel="#L117">117</span>
<span id="L118" rel="#L118">118</span>
<span id="L119" rel="#L119">119</span>
<span id="L120" rel="#L120">120</span>
<span id="L121" rel="#L121">121</span>
<span id="L122" rel="#L122">122</span>
<span id="L123" rel="#L123">123</span>
<span id="L124" rel="#L124">124</span>
<span id="L125" rel="#L125">125</span>
<span id="L126" rel="#L126">126</span>
<span id="L127" rel="#L127">127</span>
<span id="L128" rel="#L128">128</span>
<span id="L129" rel="#L129">129</span>
<span id="L130" rel="#L130">130</span>
<span id="L131" rel="#L131">131</span>
<span id="L132" rel="#L132">132</span>
<span id="L133" rel="#L133">133</span>
<span id="L134" rel="#L134">134</span>
<span id="L135" rel="#L135">135</span>
<span id="L136" rel="#L136">136</span>
<span id="L137" rel="#L137">137</span>
<span id="L138" rel="#L138">138</span>
<span id="L139" rel="#L139">139</span>
<span id="L140" rel="#L140">140</span>
<span id="L141" rel="#L141">141</span>
<span id="L142" rel="#L142">142</span>
<span id="L143" rel="#L143">143</span>
<span id="L144" rel="#L144">144</span>
<span id="L145" rel="#L145">145</span>
<span id="L146" rel="#L146">146</span>
<span id="L147" rel="#L147">147</span>
<span id="L148" rel="#L148">148</span>
<span id="L149" rel="#L149">149</span>
<span id="L150" rel="#L150">150</span>
<span id="L151" rel="#L151">151</span>
<span id="L152" rel="#L152">152</span>
<span id="L153" rel="#L153">153</span>
<span id="L154" rel="#L154">154</span>
<span id="L155" rel="#L155">155</span>
<span id="L156" rel="#L156">156</span>
<span id="L157" rel="#L157">157</span>
<span id="L158" rel="#L158">158</span>
<span id="L159" rel="#L159">159</span>
<span id="L160" rel="#L160">160</span>
<span id="L161" rel="#L161">161</span>
<span id="L162" rel="#L162">162</span>
<span id="L163" rel="#L163">163</span>
<span id="L164" rel="#L164">164</span>
<span id="L165" rel="#L165">165</span>
<span id="L166" rel="#L166">166</span>
<span id="L167" rel="#L167">167</span>
<span id="L168" rel="#L168">168</span>
<span id="L169" rel="#L169">169</span>
<span id="L170" rel="#L170">170</span>
<span id="L171" rel="#L171">171</span>
<span id="L172" rel="#L172">172</span>
<span id="L173" rel="#L173">173</span>
<span id="L174" rel="#L174">174</span>
<span id="L175" rel="#L175">175</span>
<span id="L176" rel="#L176">176</span>
<span id="L177" rel="#L177">177</span>
<span id="L178" rel="#L178">178</span>
<span id="L179" rel="#L179">179</span>
<span id="L180" rel="#L180">180</span>
<span id="L181" rel="#L181">181</span>
<span id="L182" rel="#L182">182</span>
<span id="L183" rel="#L183">183</span>
<span id="L184" rel="#L184">184</span>
<span id="L185" rel="#L185">185</span>
<span id="L186" rel="#L186">186</span>
<span id="L187" rel="#L187">187</span>
<span id="L188" rel="#L188">188</span>
<span id="L189" rel="#L189">189</span>
<span id="L190" rel="#L190">190</span>
<span id="L191" rel="#L191">191</span>
<span id="L192" rel="#L192">192</span>
<span id="L193" rel="#L193">193</span>
<span id="L194" rel="#L194">194</span>
<span id="L195" rel="#L195">195</span>
<span id="L196" rel="#L196">196</span>
<span id="L197" rel="#L197">197</span>
<span id="L198" rel="#L198">198</span>
<span id="L199" rel="#L199">199</span>
<span id="L200" rel="#L200">200</span>
<span id="L201" rel="#L201">201</span>
<span id="L202" rel="#L202">202</span>
<span id="L203" rel="#L203">203</span>
<span id="L204" rel="#L204">204</span>
<span id="L205" rel="#L205">205</span>
<span id="L206" rel="#L206">206</span>
<span id="L207" rel="#L207">207</span>
<span id="L208" rel="#L208">208</span>
<span id="L209" rel="#L209">209</span>
<span id="L210" rel="#L210">210</span>
<span id="L211" rel="#L211">211</span>
<span id="L212" rel="#L212">212</span>
<span id="L213" rel="#L213">213</span>
<span id="L214" rel="#L214">214</span>
<span id="L215" rel="#L215">215</span>
<span id="L216" rel="#L216">216</span>
<span id="L217" rel="#L217">217</span>
<span id="L218" rel="#L218">218</span>
<span id="L219" rel="#L219">219</span>
<span id="L220" rel="#L220">220</span>
<span id="L221" rel="#L221">221</span>
<span id="L222" rel="#L222">222</span>
<span id="L223" rel="#L223">223</span>
<span id="L224" rel="#L224">224</span>
<span id="L225" rel="#L225">225</span>
<span id="L226" rel="#L226">226</span>
<span id="L227" rel="#L227">227</span>
<span id="L228" rel="#L228">228</span>
<span id="L229" rel="#L229">229</span>
<span id="L230" rel="#L230">230</span>
<span id="L231" rel="#L231">231</span>
<span id="L232" rel="#L232">232</span>
<span id="L233" rel="#L233">233</span>
<span id="L234" rel="#L234">234</span>
<span id="L235" rel="#L235">235</span>
<span id="L236" rel="#L236">236</span>
<span id="L237" rel="#L237">237</span>
<span id="L238" rel="#L238">238</span>
<span id="L239" rel="#L239">239</span>
<span id="L240" rel="#L240">240</span>
<span id="L241" rel="#L241">241</span>
<span id="L242" rel="#L242">242</span>
<span id="L243" rel="#L243">243</span>
<span id="L244" rel="#L244">244</span>
<span id="L245" rel="#L245">245</span>
<span id="L246" rel="#L246">246</span>
<span id="L247" rel="#L247">247</span>
<span id="L248" rel="#L248">248</span>
<span id="L249" rel="#L249">249</span>
<span id="L250" rel="#L250">250</span>
<span id="L251" rel="#L251">251</span>
<span id="L252" rel="#L252">252</span>
<span id="L253" rel="#L253">253</span>
<span id="L254" rel="#L254">254</span>
<span id="L255" rel="#L255">255</span>
<span id="L256" rel="#L256">256</span>
<span id="L257" rel="#L257">257</span>
<span id="L258" rel="#L258">258</span>
<span id="L259" rel="#L259">259</span>
<span id="L260" rel="#L260">260</span>
<span id="L261" rel="#L261">261</span>
<span id="L262" rel="#L262">262</span>
<span id="L263" rel="#L263">263</span>
<span id="L264" rel="#L264">264</span>
<span id="L265" rel="#L265">265</span>
<span id="L266" rel="#L266">266</span>
<span id="L267" rel="#L267">267</span>
<span id="L268" rel="#L268">268</span>
<span id="L269" rel="#L269">269</span>
<span id="L270" rel="#L270">270</span>
<span id="L271" rel="#L271">271</span>
<span id="L272" rel="#L272">272</span>
<span id="L273" rel="#L273">273</span>
<span id="L274" rel="#L274">274</span>
<span id="L275" rel="#L275">275</span>
<span id="L276" rel="#L276">276</span>
<span id="L277" rel="#L277">277</span>
<span id="L278" rel="#L278">278</span>
<span id="L279" rel="#L279">279</span>
<span id="L280" rel="#L280">280</span>
<span id="L281" rel="#L281">281</span>
<span id="L282" rel="#L282">282</span>
<span id="L283" rel="#L283">283</span>
<span id="L284" rel="#L284">284</span>
<span id="L285" rel="#L285">285</span>
<span id="L286" rel="#L286">286</span>
<span id="L287" rel="#L287">287</span>
<span id="L288" rel="#L288">288</span>
<span id="L289" rel="#L289">289</span>
<span id="L290" rel="#L290">290</span>
<span id="L291" rel="#L291">291</span>
<span id="L292" rel="#L292">292</span>
<span id="L293" rel="#L293">293</span>
<span id="L294" rel="#L294">294</span>
<span id="L295" rel="#L295">295</span>
<span id="L296" rel="#L296">296</span>
<span id="L297" rel="#L297">297</span>
<span id="L298" rel="#L298">298</span>
<span id="L299" rel="#L299">299</span>
<span id="L300" rel="#L300">300</span>
<span id="L301" rel="#L301">301</span>
<span id="L302" rel="#L302">302</span>
<span id="L303" rel="#L303">303</span>
<span id="L304" rel="#L304">304</span>
<span id="L305" rel="#L305">305</span>
<span id="L306" rel="#L306">306</span>
<span id="L307" rel="#L307">307</span>
<span id="L308" rel="#L308">308</span>
<span id="L309" rel="#L309">309</span>
<span id="L310" rel="#L310">310</span>
<span id="L311" rel="#L311">311</span>
<span id="L312" rel="#L312">312</span>
<span id="L313" rel="#L313">313</span>
<span id="L314" rel="#L314">314</span>
<span id="L315" rel="#L315">315</span>
<span id="L316" rel="#L316">316</span>
<span id="L317" rel="#L317">317</span>
<span id="L318" rel="#L318">318</span>
<span id="L319" rel="#L319">319</span>
<span id="L320" rel="#L320">320</span>
<span id="L321" rel="#L321">321</span>
<span id="L322" rel="#L322">322</span>
<span id="L323" rel="#L323">323</span>
<span id="L324" rel="#L324">324</span>
<span id="L325" rel="#L325">325</span>
<span id="L326" rel="#L326">326</span>
<span id="L327" rel="#L327">327</span>
<span id="L328" rel="#L328">328</span>
<span id="L329" rel="#L329">329</span>
<span id="L330" rel="#L330">330</span>
<span id="L331" rel="#L331">331</span>
<span id="L332" rel="#L332">332</span>
<span id="L333" rel="#L333">333</span>
<span id="L334" rel="#L334">334</span>
<span id="L335" rel="#L335">335</span>
<span id="L336" rel="#L336">336</span>
<span id="L337" rel="#L337">337</span>
<span id="L338" rel="#L338">338</span>
<span id="L339" rel="#L339">339</span>
<span id="L340" rel="#L340">340</span>
<span id="L341" rel="#L341">341</span>
<span id="L342" rel="#L342">342</span>
<span id="L343" rel="#L343">343</span>
<span id="L344" rel="#L344">344</span>
<span id="L345" rel="#L345">345</span>
<span id="L346" rel="#L346">346</span>
<span id="L347" rel="#L347">347</span>
<span id="L348" rel="#L348">348</span>
<span id="L349" rel="#L349">349</span>
<span id="L350" rel="#L350">350</span>
<span id="L351" rel="#L351">351</span>
<span id="L352" rel="#L352">352</span>
<span id="L353" rel="#L353">353</span>
<span id="L354" rel="#L354">354</span>
<span id="L355" rel="#L355">355</span>
<span id="L356" rel="#L356">356</span>
<span id="L357" rel="#L357">357</span>
<span id="L358" rel="#L358">358</span>
<span id="L359" rel="#L359">359</span>
<span id="L360" rel="#L360">360</span>
<span id="L361" rel="#L361">361</span>
<span id="L362" rel="#L362">362</span>
<span id="L363" rel="#L363">363</span>
<span id="L364" rel="#L364">364</span>
<span id="L365" rel="#L365">365</span>
<span id="L366" rel="#L366">366</span>
<span id="L367" rel="#L367">367</span>
<span id="L368" rel="#L368">368</span>
<span id="L369" rel="#L369">369</span>
<span id="L370" rel="#L370">370</span>
<span id="L371" rel="#L371">371</span>
<span id="L372" rel="#L372">372</span>
<span id="L373" rel="#L373">373</span>
<span id="L374" rel="#L374">374</span>
<span id="L375" rel="#L375">375</span>
<span id="L376" rel="#L376">376</span>
<span id="L377" rel="#L377">377</span>
<span id="L378" rel="#L378">378</span>
<span id="L379" rel="#L379">379</span>
<span id="L380" rel="#L380">380</span>
<span id="L381" rel="#L381">381</span>
<span id="L382" rel="#L382">382</span>
<span id="L383" rel="#L383">383</span>
<span id="L384" rel="#L384">384</span>
<span id="L385" rel="#L385">385</span>
<span id="L386" rel="#L386">386</span>
<span id="L387" rel="#L387">387</span>
<span id="L388" rel="#L388">388</span>
<span id="L389" rel="#L389">389</span>
<span id="L390" rel="#L390">390</span>
<span id="L391" rel="#L391">391</span>
<span id="L392" rel="#L392">392</span>
<span id="L393" rel="#L393">393</span>
<span id="L394" rel="#L394">394</span>
<span id="L395" rel="#L395">395</span>
<span id="L396" rel="#L396">396</span>
<span id="L397" rel="#L397">397</span>
<span id="L398" rel="#L398">398</span>
<span id="L399" rel="#L399">399</span>
<span id="L400" rel="#L400">400</span>
<span id="L401" rel="#L401">401</span>
<span id="L402" rel="#L402">402</span>
<span id="L403" rel="#L403">403</span>
<span id="L404" rel="#L404">404</span>
<span id="L405" rel="#L405">405</span>
<span id="L406" rel="#L406">406</span>
<span id="L407" rel="#L407">407</span>
<span id="L408" rel="#L408">408</span>
<span id="L409" rel="#L409">409</span>
<span id="L410" rel="#L410">410</span>
<span id="L411" rel="#L411">411</span>
<span id="L412" rel="#L412">412</span>
<span id="L413" rel="#L413">413</span>
<span id="L414" rel="#L414">414</span>
<span id="L415" rel="#L415">415</span>
<span id="L416" rel="#L416">416</span>
<span id="L417" rel="#L417">417</span>
<span id="L418" rel="#L418">418</span>
<span id="L419" rel="#L419">419</span>
<span id="L420" rel="#L420">420</span>
<span id="L421" rel="#L421">421</span>
<span id="L422" rel="#L422">422</span>
<span id="L423" rel="#L423">423</span>
<span id="L424" rel="#L424">424</span>
<span id="L425" rel="#L425">425</span>
<span id="L426" rel="#L426">426</span>
<span id="L427" rel="#L427">427</span>
<span id="L428" rel="#L428">428</span>
<span id="L429" rel="#L429">429</span>
<span id="L430" rel="#L430">430</span>
<span id="L431" rel="#L431">431</span>
<span id="L432" rel="#L432">432</span>
<span id="L433" rel="#L433">433</span>
<span id="L434" rel="#L434">434</span>
<span id="L435" rel="#L435">435</span>
<span id="L436" rel="#L436">436</span>
<span id="L437" rel="#L437">437</span>
<span id="L438" rel="#L438">438</span>
<span id="L439" rel="#L439">439</span>
<span id="L440" rel="#L440">440</span>
<span id="L441" rel="#L441">441</span>
<span id="L442" rel="#L442">442</span>
<span id="L443" rel="#L443">443</span>
<span id="L444" rel="#L444">444</span>
<span id="L445" rel="#L445">445</span>
<span id="L446" rel="#L446">446</span>
<span id="L447" rel="#L447">447</span>
<span id="L448" rel="#L448">448</span>
<span id="L449" rel="#L449">449</span>
<span id="L450" rel="#L450">450</span>
<span id="L451" rel="#L451">451</span>
<span id="L452" rel="#L452">452</span>
<span id="L453" rel="#L453">453</span>
<span id="L454" rel="#L454">454</span>
<span id="L455" rel="#L455">455</span>
<span id="L456" rel="#L456">456</span>
<span id="L457" rel="#L457">457</span>
<span id="L458" rel="#L458">458</span>
<span id="L459" rel="#L459">459</span>
<span id="L460" rel="#L460">460</span>
<span id="L461" rel="#L461">461</span>
<span id="L462" rel="#L462">462</span>
<span id="L463" rel="#L463">463</span>
<span id="L464" rel="#L464">464</span>
<span id="L465" rel="#L465">465</span>
<span id="L466" rel="#L466">466</span>
<span id="L467" rel="#L467">467</span>

            </td>
            <td class="blob-line-code"><div class="code-body highlight"><pre><div class='line' id='LC1'><span class="cm">/***</span></div><div class='line' id='LC2'><span class="cm"> * Contains core SlickGrid classes.</span></div><div class='line' id='LC3'><span class="cm"> * @module Core</span></div><div class='line' id='LC4'><span class="cm"> * @namespace Slick</span></div><div class='line' id='LC5'><span class="cm"> */</span></div><div class='line' id='LC6'><br/></div><div class='line' id='LC7'><span class="p">(</span><span class="kd">function</span> <span class="p">(</span><span class="nx">$</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC8'>&nbsp;&nbsp;<span class="c1">// register namespace</span></div><div class='line' id='LC9'>&nbsp;&nbsp;<span class="nx">$</span><span class="p">.</span><span class="nx">extend</span><span class="p">(</span><span class="kc">true</span><span class="p">,</span> <span class="nb">window</span><span class="p">,</span> <span class="p">{</span></div><div class='line' id='LC10'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="s2">&quot;Slick&quot;</span><span class="o">:</span> <span class="p">{</span></div><div class='line' id='LC11'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="s2">&quot;Event&quot;</span><span class="o">:</span> <span class="nx">Event</span><span class="p">,</span></div><div class='line' id='LC12'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="s2">&quot;EventData&quot;</span><span class="o">:</span> <span class="nx">EventData</span><span class="p">,</span></div><div class='line' id='LC13'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="s2">&quot;EventHandler&quot;</span><span class="o">:</span> <span class="nx">EventHandler</span><span class="p">,</span></div><div class='line' id='LC14'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="s2">&quot;Range&quot;</span><span class="o">:</span> <span class="nx">Range</span><span class="p">,</span></div><div class='line' id='LC15'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="s2">&quot;NonDataRow&quot;</span><span class="o">:</span> <span class="nx">NonDataItem</span><span class="p">,</span></div><div class='line' id='LC16'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="s2">&quot;Group&quot;</span><span class="o">:</span> <span class="nx">Group</span><span class="p">,</span></div><div class='line' id='LC17'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="s2">&quot;GroupTotals&quot;</span><span class="o">:</span> <span class="nx">GroupTotals</span><span class="p">,</span></div><div class='line' id='LC18'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="s2">&quot;EditorLock&quot;</span><span class="o">:</span> <span class="nx">EditorLock</span><span class="p">,</span></div><div class='line' id='LC19'><br/></div><div class='line' id='LC20'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC21'><span class="cm">       * A global singleton editor lock.</span></div><div class='line' id='LC22'><span class="cm">       * @class GlobalEditorLock</span></div><div class='line' id='LC23'><span class="cm">       * @static</span></div><div class='line' id='LC24'><span class="cm">       * @constructor</span></div><div class='line' id='LC25'><span class="cm">       */</span></div><div class='line' id='LC26'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="s2">&quot;GlobalEditorLock&quot;</span><span class="o">:</span> <span class="k">new</span> <span class="nx">EditorLock</span><span class="p">()</span></div><div class='line' id='LC27'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">}</span></div><div class='line' id='LC28'>&nbsp;&nbsp;<span class="p">});</span></div><div class='line' id='LC29'><br/></div><div class='line' id='LC30'>&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC31'><span class="cm">   * An event object for passing data to event handlers and letting them control propagation.</span></div><div class='line' id='LC32'><span class="cm">   * &lt;p&gt;This is pretty much identical to how W3C and jQuery implement events.&lt;/p&gt;</span></div><div class='line' id='LC33'><span class="cm">   * @class EventData</span></div><div class='line' id='LC34'><span class="cm">   * @constructor</span></div><div class='line' id='LC35'><span class="cm">   */</span></div><div class='line' id='LC36'>&nbsp;&nbsp;<span class="kd">function</span> <span class="nx">EventData</span><span class="p">()</span> <span class="p">{</span></div><div class='line' id='LC37'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="kd">var</span> <span class="nx">isPropagationStopped</span> <span class="o">=</span> <span class="kc">false</span><span class="p">;</span></div><div class='line' id='LC38'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="kd">var</span> <span class="nx">isImmediatePropagationStopped</span> <span class="o">=</span> <span class="kc">false</span><span class="p">;</span></div><div class='line' id='LC39'><br/></div><div class='line' id='LC40'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC41'><span class="cm">     * Stops event from propagating up the DOM tree.</span></div><div class='line' id='LC42'><span class="cm">     * @method stopPropagation</span></div><div class='line' id='LC43'><span class="cm">     */</span></div><div class='line' id='LC44'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">stopPropagation</span> <span class="o">=</span> <span class="kd">function</span> <span class="p">()</span> <span class="p">{</span></div><div class='line' id='LC45'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="nx">isPropagationStopped</span> <span class="o">=</span> <span class="kc">true</span><span class="p">;</span></div><div class='line' id='LC46'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">};</span></div><div class='line' id='LC47'><br/></div><div class='line' id='LC48'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC49'><span class="cm">     * Returns whether stopPropagation was called on this event object.</span></div><div class='line' id='LC50'><span class="cm">     * @method isPropagationStopped</span></div><div class='line' id='LC51'><span class="cm">     * @return {Boolean}</span></div><div class='line' id='LC52'><span class="cm">     */</span></div><div class='line' id='LC53'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">isPropagationStopped</span> <span class="o">=</span> <span class="kd">function</span> <span class="p">()</span> <span class="p">{</span></div><div class='line' id='LC54'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">return</span> <span class="nx">isPropagationStopped</span><span class="p">;</span></div><div class='line' id='LC55'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">};</span></div><div class='line' id='LC56'><br/></div><div class='line' id='LC57'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC58'><span class="cm">     * Prevents the rest of the handlers from being executed.</span></div><div class='line' id='LC59'><span class="cm">     * @method stopImmediatePropagation</span></div><div class='line' id='LC60'><span class="cm">     */</span></div><div class='line' id='LC61'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">stopImmediatePropagation</span> <span class="o">=</span> <span class="kd">function</span> <span class="p">()</span> <span class="p">{</span></div><div class='line' id='LC62'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="nx">isImmediatePropagationStopped</span> <span class="o">=</span> <span class="kc">true</span><span class="p">;</span></div><div class='line' id='LC63'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">};</span></div><div class='line' id='LC64'><br/></div><div class='line' id='LC65'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC66'><span class="cm">     * Returns whether stopImmediatePropagation was called on this event object.\</span></div><div class='line' id='LC67'><span class="cm">     * @method isImmediatePropagationStopped</span></div><div class='line' id='LC68'><span class="cm">     * @return {Boolean}</span></div><div class='line' id='LC69'><span class="cm">     */</span></div><div class='line' id='LC70'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">isImmediatePropagationStopped</span> <span class="o">=</span> <span class="kd">function</span> <span class="p">()</span> <span class="p">{</span></div><div class='line' id='LC71'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">return</span> <span class="nx">isImmediatePropagationStopped</span><span class="p">;</span></div><div class='line' id='LC72'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">}</span></div><div class='line' id='LC73'>&nbsp;&nbsp;<span class="p">}</span></div><div class='line' id='LC74'><br/></div><div class='line' id='LC75'>&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC76'><span class="cm">   * A simple publisher-subscriber implementation.</span></div><div class='line' id='LC77'><span class="cm">   * @class Event</span></div><div class='line' id='LC78'><span class="cm">   * @constructor</span></div><div class='line' id='LC79'><span class="cm">   */</span></div><div class='line' id='LC80'>&nbsp;&nbsp;<span class="kd">function</span> <span class="nx">Event</span><span class="p">()</span> <span class="p">{</span></div><div class='line' id='LC81'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="kd">var</span> <span class="nx">handlers</span> <span class="o">=</span> <span class="p">[];</span></div><div class='line' id='LC82'><br/></div><div class='line' id='LC83'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC84'><span class="cm">     * Adds an event handler to be called when the event is fired.</span></div><div class='line' id='LC85'><span class="cm">     * &lt;p&gt;Event handler will receive two arguments - an &lt;code&gt;EventData&lt;/code&gt; and the &lt;code&gt;data&lt;/code&gt;</span></div><div class='line' id='LC86'><span class="cm">     * object the event was fired with.&lt;p&gt;</span></div><div class='line' id='LC87'><span class="cm">     * @method subscribe</span></div><div class='line' id='LC88'><span class="cm">     * @param fn {Function} Event handler.</span></div><div class='line' id='LC89'><span class="cm">     */</span></div><div class='line' id='LC90'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">subscribe</span> <span class="o">=</span> <span class="kd">function</span> <span class="p">(</span><span class="nx">fn</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC91'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="nx">handlers</span><span class="p">.</span><span class="nx">push</span><span class="p">(</span><span class="nx">fn</span><span class="p">);</span></div><div class='line' id='LC92'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">};</span></div><div class='line' id='LC93'><br/></div><div class='line' id='LC94'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC95'><span class="cm">     * Removes an event handler added with &lt;code&gt;subscribe(fn)&lt;/code&gt;.</span></div><div class='line' id='LC96'><span class="cm">     * @method unsubscribe</span></div><div class='line' id='LC97'><span class="cm">     * @param fn {Function} Event handler to be removed.</span></div><div class='line' id='LC98'><span class="cm">     */</span></div><div class='line' id='LC99'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">unsubscribe</span> <span class="o">=</span> <span class="kd">function</span> <span class="p">(</span><span class="nx">fn</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC100'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">for</span> <span class="p">(</span><span class="kd">var</span> <span class="nx">i</span> <span class="o">=</span> <span class="nx">handlers</span><span class="p">.</span><span class="nx">length</span> <span class="o">-</span> <span class="mi">1</span><span class="p">;</span> <span class="nx">i</span> <span class="o">&gt;=</span> <span class="mi">0</span><span class="p">;</span> <span class="nx">i</span><span class="o">--</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC101'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">if</span> <span class="p">(</span><span class="nx">handlers</span><span class="p">[</span><span class="nx">i</span><span class="p">]</span> <span class="o">===</span> <span class="nx">fn</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC102'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="nx">handlers</span><span class="p">.</span><span class="nx">splice</span><span class="p">(</span><span class="nx">i</span><span class="p">,</span> <span class="mi">1</span><span class="p">);</span></div><div class='line' id='LC103'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">}</span></div><div class='line' id='LC104'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">}</span></div><div class='line' id='LC105'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">};</span></div><div class='line' id='LC106'><br/></div><div class='line' id='LC107'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC108'><span class="cm">     * Fires an event notifying all subscribers.</span></div><div class='line' id='LC109'><span class="cm">     * @method notify</span></div><div class='line' id='LC110'><span class="cm">     * @param args {Object} Additional data object to be passed to all handlers.</span></div><div class='line' id='LC111'><span class="cm">     * @param e {EventData}</span></div><div class='line' id='LC112'><span class="cm">     *      Optional.</span></div><div class='line' id='LC113'><span class="cm">     *      An &lt;code&gt;EventData&lt;/code&gt; object to be passed to all handlers.</span></div><div class='line' id='LC114'><span class="cm">     *      For DOM events, an existing W3C/jQuery event object can be passed in.</span></div><div class='line' id='LC115'><span class="cm">     * @param scope {Object}</span></div><div class='line' id='LC116'><span class="cm">     *      Optional.</span></div><div class='line' id='LC117'><span class="cm">     *      The scope (&quot;this&quot;) within which the handler will be executed.</span></div><div class='line' id='LC118'><span class="cm">     *      If not specified, the scope will be set to the &lt;code&gt;Event&lt;/code&gt; instance.</span></div><div class='line' id='LC119'><span class="cm">     */</span></div><div class='line' id='LC120'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">notify</span> <span class="o">=</span> <span class="kd">function</span> <span class="p">(</span><span class="nx">args</span><span class="p">,</span> <span class="nx">e</span><span class="p">,</span> <span class="nx">scope</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC121'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="nx">e</span> <span class="o">=</span> <span class="nx">e</span> <span class="o">||</span> <span class="k">new</span> <span class="nx">EventData</span><span class="p">();</span></div><div class='line' id='LC122'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="nx">scope</span> <span class="o">=</span> <span class="nx">scope</span> <span class="o">||</span> <span class="k">this</span><span class="p">;</span></div><div class='line' id='LC123'><br/></div><div class='line' id='LC124'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="kd">var</span> <span class="nx">returnValue</span><span class="p">;</span></div><div class='line' id='LC125'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">for</span> <span class="p">(</span><span class="kd">var</span> <span class="nx">i</span> <span class="o">=</span> <span class="mi">0</span><span class="p">;</span> <span class="nx">i</span> <span class="o">&lt;</span> <span class="nx">handlers</span><span class="p">.</span><span class="nx">length</span> <span class="o">&amp;&amp;</span> <span class="o">!</span><span class="p">(</span><span class="nx">e</span><span class="p">.</span><span class="nx">isPropagationStopped</span><span class="p">()</span> <span class="o">||</span> <span class="nx">e</span><span class="p">.</span><span class="nx">isImmediatePropagationStopped</span><span class="p">());</span> <span class="nx">i</span><span class="o">++</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC126'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="nx">returnValue</span> <span class="o">=</span> <span class="nx">handlers</span><span class="p">[</span><span class="nx">i</span><span class="p">].</span><span class="nx">call</span><span class="p">(</span><span class="nx">scope</span><span class="p">,</span> <span class="nx">e</span><span class="p">,</span> <span class="nx">args</span><span class="p">);</span></div><div class='line' id='LC127'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">}</span></div><div class='line' id='LC128'><br/></div><div class='line' id='LC129'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">return</span> <span class="nx">returnValue</span><span class="p">;</span></div><div class='line' id='LC130'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">};</span></div><div class='line' id='LC131'>&nbsp;&nbsp;<span class="p">}</span></div><div class='line' id='LC132'><br/></div><div class='line' id='LC133'>&nbsp;&nbsp;<span class="kd">function</span> <span class="nx">EventHandler</span><span class="p">()</span> <span class="p">{</span></div><div class='line' id='LC134'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="kd">var</span> <span class="nx">handlers</span> <span class="o">=</span> <span class="p">[];</span></div><div class='line' id='LC135'><br/></div><div class='line' id='LC136'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">subscribe</span> <span class="o">=</span> <span class="kd">function</span> <span class="p">(</span><span class="nx">event</span><span class="p">,</span> <span class="nx">handler</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC137'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="nx">handlers</span><span class="p">.</span><span class="nx">push</span><span class="p">({</span></div><div class='line' id='LC138'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="nx">event</span><span class="o">:</span> <span class="nx">event</span><span class="p">,</span></div><div class='line' id='LC139'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="nx">handler</span><span class="o">:</span> <span class="nx">handler</span></div><div class='line' id='LC140'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">});</span></div><div class='line' id='LC141'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="nx">event</span><span class="p">.</span><span class="nx">subscribe</span><span class="p">(</span><span class="nx">handler</span><span class="p">);</span></div><div class='line' id='LC142'><br/></div><div class='line' id='LC143'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">return</span> <span class="k">this</span><span class="p">;</span>  <span class="c1">// allow chaining</span></div><div class='line' id='LC144'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">};</span></div><div class='line' id='LC145'><br/></div><div class='line' id='LC146'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">unsubscribe</span> <span class="o">=</span> <span class="kd">function</span> <span class="p">(</span><span class="nx">event</span><span class="p">,</span> <span class="nx">handler</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC147'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="kd">var</span> <span class="nx">i</span> <span class="o">=</span> <span class="nx">handlers</span><span class="p">.</span><span class="nx">length</span><span class="p">;</span></div><div class='line' id='LC148'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">while</span> <span class="p">(</span><span class="nx">i</span><span class="o">--</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC149'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">if</span> <span class="p">(</span><span class="nx">handlers</span><span class="p">[</span><span class="nx">i</span><span class="p">].</span><span class="nx">event</span> <span class="o">===</span> <span class="nx">event</span> <span class="o">&amp;&amp;</span></div><div class='line' id='LC150'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="nx">handlers</span><span class="p">[</span><span class="nx">i</span><span class="p">].</span><span class="nx">handler</span> <span class="o">===</span> <span class="nx">handler</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC151'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="nx">handlers</span><span class="p">.</span><span class="nx">splice</span><span class="p">(</span><span class="nx">i</span><span class="p">,</span> <span class="mi">1</span><span class="p">);</span></div><div class='line' id='LC152'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="nx">event</span><span class="p">.</span><span class="nx">unsubscribe</span><span class="p">(</span><span class="nx">handler</span><span class="p">);</span></div><div class='line' id='LC153'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">return</span><span class="p">;</span></div><div class='line' id='LC154'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">}</span></div><div class='line' id='LC155'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">}</span></div><div class='line' id='LC156'><br/></div><div class='line' id='LC157'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">return</span> <span class="k">this</span><span class="p">;</span>  <span class="c1">// allow chaining</span></div><div class='line' id='LC158'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">};</span></div><div class='line' id='LC159'><br/></div><div class='line' id='LC160'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">unsubscribeAll</span> <span class="o">=</span> <span class="kd">function</span> <span class="p">()</span> <span class="p">{</span></div><div class='line' id='LC161'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="kd">var</span> <span class="nx">i</span> <span class="o">=</span> <span class="nx">handlers</span><span class="p">.</span><span class="nx">length</span><span class="p">;</span></div><div class='line' id='LC162'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">while</span> <span class="p">(</span><span class="nx">i</span><span class="o">--</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC163'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="nx">handlers</span><span class="p">[</span><span class="nx">i</span><span class="p">].</span><span class="nx">event</span><span class="p">.</span><span class="nx">unsubscribe</span><span class="p">(</span><span class="nx">handlers</span><span class="p">[</span><span class="nx">i</span><span class="p">].</span><span class="nx">handler</span><span class="p">);</span></div><div class='line' id='LC164'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">}</span></div><div class='line' id='LC165'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="nx">handlers</span> <span class="o">=</span> <span class="p">[];</span></div><div class='line' id='LC166'><br/></div><div class='line' id='LC167'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">return</span> <span class="k">this</span><span class="p">;</span>  <span class="c1">// allow chaining</span></div><div class='line' id='LC168'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">}</span></div><div class='line' id='LC169'>&nbsp;&nbsp;<span class="p">}</span></div><div class='line' id='LC170'><br/></div><div class='line' id='LC171'>&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC172'><span class="cm">   * A structure containing a range of cells.</span></div><div class='line' id='LC173'><span class="cm">   * @class Range</span></div><div class='line' id='LC174'><span class="cm">   * @constructor</span></div><div class='line' id='LC175'><span class="cm">   * @param fromRow {Integer} Starting row.</span></div><div class='line' id='LC176'><span class="cm">   * @param fromCell {Integer} Starting cell.</span></div><div class='line' id='LC177'><span class="cm">   * @param toRow {Integer} Optional. Ending row. Defaults to &lt;code&gt;fromRow&lt;/code&gt;.</span></div><div class='line' id='LC178'><span class="cm">   * @param toCell {Integer} Optional. Ending cell. Defaults to &lt;code&gt;fromCell&lt;/code&gt;.</span></div><div class='line' id='LC179'><span class="cm">   */</span></div><div class='line' id='LC180'>&nbsp;&nbsp;<span class="kd">function</span> <span class="nx">Range</span><span class="p">(</span><span class="nx">fromRow</span><span class="p">,</span> <span class="nx">fromCell</span><span class="p">,</span> <span class="nx">toRow</span><span class="p">,</span> <span class="nx">toCell</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC181'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">if</span> <span class="p">(</span><span class="nx">toRow</span> <span class="o">===</span> <span class="kc">undefined</span> <span class="o">&amp;&amp;</span> <span class="nx">toCell</span> <span class="o">===</span> <span class="kc">undefined</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC182'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="nx">toRow</span> <span class="o">=</span> <span class="nx">fromRow</span><span class="p">;</span></div><div class='line' id='LC183'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="nx">toCell</span> <span class="o">=</span> <span class="nx">fromCell</span><span class="p">;</span></div><div class='line' id='LC184'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">}</span></div><div class='line' id='LC185'><br/></div><div class='line' id='LC186'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC187'><span class="cm">     * @property fromRow</span></div><div class='line' id='LC188'><span class="cm">     * @type {Integer}</span></div><div class='line' id='LC189'><span class="cm">     */</span></div><div class='line' id='LC190'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">fromRow</span> <span class="o">=</span> <span class="nb">Math</span><span class="p">.</span><span class="nx">min</span><span class="p">(</span><span class="nx">fromRow</span><span class="p">,</span> <span class="nx">toRow</span><span class="p">);</span></div><div class='line' id='LC191'><br/></div><div class='line' id='LC192'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC193'><span class="cm">     * @property fromCell</span></div><div class='line' id='LC194'><span class="cm">     * @type {Integer}</span></div><div class='line' id='LC195'><span class="cm">     */</span></div><div class='line' id='LC196'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">fromCell</span> <span class="o">=</span> <span class="nb">Math</span><span class="p">.</span><span class="nx">min</span><span class="p">(</span><span class="nx">fromCell</span><span class="p">,</span> <span class="nx">toCell</span><span class="p">);</span></div><div class='line' id='LC197'><br/></div><div class='line' id='LC198'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC199'><span class="cm">     * @property toRow</span></div><div class='line' id='LC200'><span class="cm">     * @type {Integer}</span></div><div class='line' id='LC201'><span class="cm">     */</span></div><div class='line' id='LC202'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">toRow</span> <span class="o">=</span> <span class="nb">Math</span><span class="p">.</span><span class="nx">max</span><span class="p">(</span><span class="nx">fromRow</span><span class="p">,</span> <span class="nx">toRow</span><span class="p">);</span></div><div class='line' id='LC203'><br/></div><div class='line' id='LC204'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC205'><span class="cm">     * @property toCell</span></div><div class='line' id='LC206'><span class="cm">     * @type {Integer}</span></div><div class='line' id='LC207'><span class="cm">     */</span></div><div class='line' id='LC208'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">toCell</span> <span class="o">=</span> <span class="nb">Math</span><span class="p">.</span><span class="nx">max</span><span class="p">(</span><span class="nx">fromCell</span><span class="p">,</span> <span class="nx">toCell</span><span class="p">);</span></div><div class='line' id='LC209'><br/></div><div class='line' id='LC210'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC211'><span class="cm">     * Returns whether a range represents a single row.</span></div><div class='line' id='LC212'><span class="cm">     * @method isSingleRow</span></div><div class='line' id='LC213'><span class="cm">     * @return {Boolean}</span></div><div class='line' id='LC214'><span class="cm">     */</span></div><div class='line' id='LC215'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">isSingleRow</span> <span class="o">=</span> <span class="kd">function</span> <span class="p">()</span> <span class="p">{</span></div><div class='line' id='LC216'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">return</span> <span class="k">this</span><span class="p">.</span><span class="nx">fromRow</span> <span class="o">==</span> <span class="k">this</span><span class="p">.</span><span class="nx">toRow</span><span class="p">;</span></div><div class='line' id='LC217'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">};</span></div><div class='line' id='LC218'><br/></div><div class='line' id='LC219'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC220'><span class="cm">     * Returns whether a range represents a single cell.</span></div><div class='line' id='LC221'><span class="cm">     * @method isSingleCell</span></div><div class='line' id='LC222'><span class="cm">     * @return {Boolean}</span></div><div class='line' id='LC223'><span class="cm">     */</span></div><div class='line' id='LC224'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">isSingleCell</span> <span class="o">=</span> <span class="kd">function</span> <span class="p">()</span> <span class="p">{</span></div><div class='line' id='LC225'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">return</span> <span class="k">this</span><span class="p">.</span><span class="nx">fromRow</span> <span class="o">==</span> <span class="k">this</span><span class="p">.</span><span class="nx">toRow</span> <span class="o">&amp;&amp;</span> <span class="k">this</span><span class="p">.</span><span class="nx">fromCell</span> <span class="o">==</span> <span class="k">this</span><span class="p">.</span><span class="nx">toCell</span><span class="p">;</span></div><div class='line' id='LC226'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">};</span></div><div class='line' id='LC227'><br/></div><div class='line' id='LC228'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC229'><span class="cm">     * Returns whether a range contains a given cell.</span></div><div class='line' id='LC230'><span class="cm">     * @method contains</span></div><div class='line' id='LC231'><span class="cm">     * @param row {Integer}</span></div><div class='line' id='LC232'><span class="cm">     * @param cell {Integer}</span></div><div class='line' id='LC233'><span class="cm">     * @return {Boolean}</span></div><div class='line' id='LC234'><span class="cm">     */</span></div><div class='line' id='LC235'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">contains</span> <span class="o">=</span> <span class="kd">function</span> <span class="p">(</span><span class="nx">row</span><span class="p">,</span> <span class="nx">cell</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC236'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">return</span> <span class="nx">row</span> <span class="o">&gt;=</span> <span class="k">this</span><span class="p">.</span><span class="nx">fromRow</span> <span class="o">&amp;&amp;</span> <span class="nx">row</span> <span class="o">&lt;=</span> <span class="k">this</span><span class="p">.</span><span class="nx">toRow</span> <span class="o">&amp;&amp;</span></div><div class='line' id='LC237'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="nx">cell</span> <span class="o">&gt;=</span> <span class="k">this</span><span class="p">.</span><span class="nx">fromCell</span> <span class="o">&amp;&amp;</span> <span class="nx">cell</span> <span class="o">&lt;=</span> <span class="k">this</span><span class="p">.</span><span class="nx">toCell</span><span class="p">;</span></div><div class='line' id='LC238'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">};</span></div><div class='line' id='LC239'><br/></div><div class='line' id='LC240'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC241'><span class="cm">     * Returns a readable representation of a range.</span></div><div class='line' id='LC242'><span class="cm">     * @method toString</span></div><div class='line' id='LC243'><span class="cm">     * @return {String}</span></div><div class='line' id='LC244'><span class="cm">     */</span></div><div class='line' id='LC245'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">toString</span> <span class="o">=</span> <span class="kd">function</span> <span class="p">()</span> <span class="p">{</span></div><div class='line' id='LC246'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">if</span> <span class="p">(</span><span class="k">this</span><span class="p">.</span><span class="nx">isSingleCell</span><span class="p">())</span> <span class="p">{</span></div><div class='line' id='LC247'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">return</span> <span class="s2">&quot;(&quot;</span> <span class="o">+</span> <span class="k">this</span><span class="p">.</span><span class="nx">fromRow</span> <span class="o">+</span> <span class="s2">&quot;:&quot;</span> <span class="o">+</span> <span class="k">this</span><span class="p">.</span><span class="nx">fromCell</span> <span class="o">+</span> <span class="s2">&quot;)&quot;</span><span class="p">;</span></div><div class='line' id='LC248'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">}</span></div><div class='line' id='LC249'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">else</span> <span class="p">{</span></div><div class='line' id='LC250'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">return</span> <span class="s2">&quot;(&quot;</span> <span class="o">+</span> <span class="k">this</span><span class="p">.</span><span class="nx">fromRow</span> <span class="o">+</span> <span class="s2">&quot;:&quot;</span> <span class="o">+</span> <span class="k">this</span><span class="p">.</span><span class="nx">fromCell</span> <span class="o">+</span> <span class="s2">&quot; - &quot;</span> <span class="o">+</span> <span class="k">this</span><span class="p">.</span><span class="nx">toRow</span> <span class="o">+</span> <span class="s2">&quot;:&quot;</span> <span class="o">+</span> <span class="k">this</span><span class="p">.</span><span class="nx">toCell</span> <span class="o">+</span> <span class="s2">&quot;)&quot;</span><span class="p">;</span></div><div class='line' id='LC251'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">}</span></div><div class='line' id='LC252'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">}</span></div><div class='line' id='LC253'>&nbsp;&nbsp;<span class="p">}</span></div><div class='line' id='LC254'><br/></div><div class='line' id='LC255'><br/></div><div class='line' id='LC256'>&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC257'><span class="cm">   * A base class that all special / non-data rows (like Group and GroupTotals) derive from.</span></div><div class='line' id='LC258'><span class="cm">   * @class NonDataItem</span></div><div class='line' id='LC259'><span class="cm">   * @constructor</span></div><div class='line' id='LC260'><span class="cm">   */</span></div><div class='line' id='LC261'>&nbsp;&nbsp;<span class="kd">function</span> <span class="nx">NonDataItem</span><span class="p">()</span> <span class="p">{</span></div><div class='line' id='LC262'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">__nonDataRow</span> <span class="o">=</span> <span class="kc">true</span><span class="p">;</span></div><div class='line' id='LC263'>&nbsp;&nbsp;<span class="p">}</span></div><div class='line' id='LC264'><br/></div><div class='line' id='LC265'><br/></div><div class='line' id='LC266'>&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC267'><span class="cm">   * Information about a group of rows.</span></div><div class='line' id='LC268'><span class="cm">   * @class Group</span></div><div class='line' id='LC269'><span class="cm">   * @extends Slick.NonDataItem</span></div><div class='line' id='LC270'><span class="cm">   * @constructor</span></div><div class='line' id='LC271'><span class="cm">   */</span></div><div class='line' id='LC272'>&nbsp;&nbsp;<span class="kd">function</span> <span class="nx">Group</span><span class="p">()</span> <span class="p">{</span></div><div class='line' id='LC273'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">__group</span> <span class="o">=</span> <span class="kc">true</span><span class="p">;</span></div><div class='line' id='LC274'><br/></div><div class='line' id='LC275'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm">/**</span></div><div class='line' id='LC276'><span class="cm">     * Grouping level, starting with 0.</span></div><div class='line' id='LC277'><span class="cm">     * @property level</span></div><div class='line' id='LC278'><span class="cm">     * @type {Number}</span></div><div class='line' id='LC279'><span class="cm">     */</span></div><div class='line' id='LC280'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">level</span> <span class="o">=</span> <span class="mi">0</span><span class="p">;</span></div><div class='line' id='LC281'><br/></div><div class='line' id='LC282'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC283'><span class="cm">     * Number of rows in the group.</span></div><div class='line' id='LC284'><span class="cm">     * @property count</span></div><div class='line' id='LC285'><span class="cm">     * @type {Integer}</span></div><div class='line' id='LC286'><span class="cm">     */</span></div><div class='line' id='LC287'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">count</span> <span class="o">=</span> <span class="mi">0</span><span class="p">;</span></div><div class='line' id='LC288'><br/></div><div class='line' id='LC289'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC290'><span class="cm">     * Grouping value.</span></div><div class='line' id='LC291'><span class="cm">     * @property value</span></div><div class='line' id='LC292'><span class="cm">     * @type {Object}</span></div><div class='line' id='LC293'><span class="cm">     */</span></div><div class='line' id='LC294'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">value</span> <span class="o">=</span> <span class="kc">null</span><span class="p">;</span></div><div class='line' id='LC295'><br/></div><div class='line' id='LC296'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC297'><span class="cm">     * Formatted display value of the group.</span></div><div class='line' id='LC298'><span class="cm">     * @property title</span></div><div class='line' id='LC299'><span class="cm">     * @type {String}</span></div><div class='line' id='LC300'><span class="cm">     */</span></div><div class='line' id='LC301'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">title</span> <span class="o">=</span> <span class="kc">null</span><span class="p">;</span></div><div class='line' id='LC302'><br/></div><div class='line' id='LC303'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC304'><span class="cm">     * Whether a group is collapsed.</span></div><div class='line' id='LC305'><span class="cm">     * @property collapsed</span></div><div class='line' id='LC306'><span class="cm">     * @type {Boolean}</span></div><div class='line' id='LC307'><span class="cm">     */</span></div><div class='line' id='LC308'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">collapsed</span> <span class="o">=</span> <span class="kc">false</span><span class="p">;</span></div><div class='line' id='LC309'><br/></div><div class='line' id='LC310'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC311'><span class="cm">     * GroupTotals, if any.</span></div><div class='line' id='LC312'><span class="cm">     * @property totals</span></div><div class='line' id='LC313'><span class="cm">     * @type {GroupTotals}</span></div><div class='line' id='LC314'><span class="cm">     */</span></div><div class='line' id='LC315'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">totals</span> <span class="o">=</span> <span class="kc">null</span><span class="p">;</span></div><div class='line' id='LC316'><br/></div><div class='line' id='LC317'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm">/**</span></div><div class='line' id='LC318'><span class="cm">     * Rows that are part of the group.</span></div><div class='line' id='LC319'><span class="cm">     * @property rows</span></div><div class='line' id='LC320'><span class="cm">     * @type {Array}</span></div><div class='line' id='LC321'><span class="cm">     */</span></div><div class='line' id='LC322'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">rows</span> <span class="o">=</span> <span class="p">[];</span></div><div class='line' id='LC323'><br/></div><div class='line' id='LC324'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm">/**</span></div><div class='line' id='LC325'><span class="cm">     * Sub-groups that are part of the group.</span></div><div class='line' id='LC326'><span class="cm">     * @property groups</span></div><div class='line' id='LC327'><span class="cm">     * @type {Array}</span></div><div class='line' id='LC328'><span class="cm">     */</span></div><div class='line' id='LC329'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">groups</span> <span class="o">=</span> <span class="kc">null</span><span class="p">;</span></div><div class='line' id='LC330'><br/></div><div class='line' id='LC331'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm">/**</span></div><div class='line' id='LC332'><span class="cm">     * A unique key used to identify the group.  This key can be used in calls to DataView</span></div><div class='line' id='LC333'><span class="cm">     * collapseGroup() or expandGroup().</span></div><div class='line' id='LC334'><span class="cm">     * @property groupingKey</span></div><div class='line' id='LC335'><span class="cm">     * @type {Object}</span></div><div class='line' id='LC336'><span class="cm">     */</span></div><div class='line' id='LC337'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">groupingKey</span> <span class="o">=</span> <span class="kc">null</span><span class="p">;</span></div><div class='line' id='LC338'>&nbsp;&nbsp;<span class="p">}</span></div><div class='line' id='LC339'><br/></div><div class='line' id='LC340'>&nbsp;&nbsp;<span class="nx">Group</span><span class="p">.</span><span class="nx">prototype</span> <span class="o">=</span> <span class="k">new</span> <span class="nx">NonDataItem</span><span class="p">();</span></div><div class='line' id='LC341'><br/></div><div class='line' id='LC342'>&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC343'><span class="cm">   * Compares two Group instances.</span></div><div class='line' id='LC344'><span class="cm">   * @method equals</span></div><div class='line' id='LC345'><span class="cm">   * @return {Boolean}</span></div><div class='line' id='LC346'><span class="cm">   * @param group {Group} Group instance to compare to.</span></div><div class='line' id='LC347'><span class="cm">   */</span></div><div class='line' id='LC348'>&nbsp;&nbsp;<span class="nx">Group</span><span class="p">.</span><span class="nx">prototype</span><span class="p">.</span><span class="nx">equals</span> <span class="o">=</span> <span class="kd">function</span> <span class="p">(</span><span class="nx">group</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC349'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">return</span> <span class="k">this</span><span class="p">.</span><span class="nx">value</span> <span class="o">===</span> <span class="nx">group</span><span class="p">.</span><span class="nx">value</span> <span class="o">&amp;&amp;</span></div><div class='line' id='LC350'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">count</span> <span class="o">===</span> <span class="nx">group</span><span class="p">.</span><span class="nx">count</span> <span class="o">&amp;&amp;</span></div><div class='line' id='LC351'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">collapsed</span> <span class="o">===</span> <span class="nx">group</span><span class="p">.</span><span class="nx">collapsed</span> <span class="o">&amp;&amp;</span></div><div class='line' id='LC352'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">title</span> <span class="o">===</span> <span class="nx">group</span><span class="p">.</span><span class="nx">title</span><span class="p">;</span></div><div class='line' id='LC353'>&nbsp;&nbsp;<span class="p">};</span></div><div class='line' id='LC354'><br/></div><div class='line' id='LC355'>&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC356'><span class="cm">   * Information about group totals.</span></div><div class='line' id='LC357'><span class="cm">   * An instance of GroupTotals will be created for each totals row and passed to the aggregators</span></div><div class='line' id='LC358'><span class="cm">   * so that they can store arbitrary data in it.  That data can later be accessed by group totals</span></div><div class='line' id='LC359'><span class="cm">   * formatters during the display.</span></div><div class='line' id='LC360'><span class="cm">   * @class GroupTotals</span></div><div class='line' id='LC361'><span class="cm">   * @extends Slick.NonDataItem</span></div><div class='line' id='LC362'><span class="cm">   * @constructor</span></div><div class='line' id='LC363'><span class="cm">   */</span></div><div class='line' id='LC364'>&nbsp;&nbsp;<span class="kd">function</span> <span class="nx">GroupTotals</span><span class="p">()</span> <span class="p">{</span></div><div class='line' id='LC365'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">__groupTotals</span> <span class="o">=</span> <span class="kc">true</span><span class="p">;</span></div><div class='line' id='LC366'><br/></div><div class='line' id='LC367'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC368'><span class="cm">     * Parent Group.</span></div><div class='line' id='LC369'><span class="cm">     * @param group</span></div><div class='line' id='LC370'><span class="cm">     * @type {Group}</span></div><div class='line' id='LC371'><span class="cm">     */</span></div><div class='line' id='LC372'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">group</span> <span class="o">=</span> <span class="kc">null</span><span class="p">;</span></div><div class='line' id='LC373'><br/></div><div class='line' id='LC374'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC375'><span class="cm">     * Whether the totals have been fully initialized / calculated.</span></div><div class='line' id='LC376'><span class="cm">     * Will be set to false for lazy-calculated group totals.</span></div><div class='line' id='LC377'><span class="cm">     * @param initialized</span></div><div class='line' id='LC378'><span class="cm">     * @type {Boolean}</span></div><div class='line' id='LC379'><span class="cm">     */</span></div><div class='line' id='LC380'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">initialized</span> <span class="o">=</span> <span class="kc">false</span><span class="p">;</span></div><div class='line' id='LC381'>&nbsp;&nbsp;<span class="p">}</span></div><div class='line' id='LC382'><br/></div><div class='line' id='LC383'>&nbsp;&nbsp;<span class="nx">GroupTotals</span><span class="p">.</span><span class="nx">prototype</span> <span class="o">=</span> <span class="k">new</span> <span class="nx">NonDataItem</span><span class="p">();</span></div><div class='line' id='LC384'><br/></div><div class='line' id='LC385'>&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC386'><span class="cm">   * A locking helper to track the active edit controller and ensure that only a single controller</span></div><div class='line' id='LC387'><span class="cm">   * can be active at a time.  This prevents a whole class of state and validation synchronization</span></div><div class='line' id='LC388'><span class="cm">   * issues.  An edit controller (such as SlickGrid) can query if an active edit is in progress</span></div><div class='line' id='LC389'><span class="cm">   * and attempt a commit or cancel before proceeding.</span></div><div class='line' id='LC390'><span class="cm">   * @class EditorLock</span></div><div class='line' id='LC391'><span class="cm">   * @constructor</span></div><div class='line' id='LC392'><span class="cm">   */</span></div><div class='line' id='LC393'>&nbsp;&nbsp;<span class="kd">function</span> <span class="nx">EditorLock</span><span class="p">()</span> <span class="p">{</span></div><div class='line' id='LC394'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="kd">var</span> <span class="nx">activeEditController</span> <span class="o">=</span> <span class="kc">null</span><span class="p">;</span></div><div class='line' id='LC395'><br/></div><div class='line' id='LC396'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC397'><span class="cm">     * Returns true if a specified edit controller is active (has the edit lock).</span></div><div class='line' id='LC398'><span class="cm">     * If the parameter is not specified, returns true if any edit controller is active.</span></div><div class='line' id='LC399'><span class="cm">     * @method isActive</span></div><div class='line' id='LC400'><span class="cm">     * @param editController {EditController}</span></div><div class='line' id='LC401'><span class="cm">     * @return {Boolean}</span></div><div class='line' id='LC402'><span class="cm">     */</span></div><div class='line' id='LC403'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">isActive</span> <span class="o">=</span> <span class="kd">function</span> <span class="p">(</span><span class="nx">editController</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC404'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">return</span> <span class="p">(</span><span class="nx">editController</span> <span class="o">?</span> <span class="nx">activeEditController</span> <span class="o">===</span> <span class="nx">editController</span> <span class="o">:</span> <span class="nx">activeEditController</span> <span class="o">!==</span> <span class="kc">null</span><span class="p">);</span></div><div class='line' id='LC405'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">};</span></div><div class='line' id='LC406'><br/></div><div class='line' id='LC407'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC408'><span class="cm">     * Sets the specified edit controller as the active edit controller (acquire edit lock).</span></div><div class='line' id='LC409'><span class="cm">     * If another edit controller is already active, and exception will be thrown.</span></div><div class='line' id='LC410'><span class="cm">     * @method activate</span></div><div class='line' id='LC411'><span class="cm">     * @param editController {EditController} edit controller acquiring the lock</span></div><div class='line' id='LC412'><span class="cm">     */</span></div><div class='line' id='LC413'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">activate</span> <span class="o">=</span> <span class="kd">function</span> <span class="p">(</span><span class="nx">editController</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC414'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">if</span> <span class="p">(</span><span class="nx">editController</span> <span class="o">===</span> <span class="nx">activeEditController</span><span class="p">)</span> <span class="p">{</span> <span class="c1">// already activated?</span></div><div class='line' id='LC415'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">return</span><span class="p">;</span></div><div class='line' id='LC416'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">}</span></div><div class='line' id='LC417'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">if</span> <span class="p">(</span><span class="nx">activeEditController</span> <span class="o">!==</span> <span class="kc">null</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC418'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">throw</span> <span class="s2">&quot;SlickGrid.EditorLock.activate: an editController is still active, can&#39;t activate another editController&quot;</span><span class="p">;</span></div><div class='line' id='LC419'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">}</span></div><div class='line' id='LC420'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">if</span> <span class="p">(</span><span class="o">!</span><span class="nx">editController</span><span class="p">.</span><span class="nx">commitCurrentEdit</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC421'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">throw</span> <span class="s2">&quot;SlickGrid.EditorLock.activate: editController must implement .commitCurrentEdit()&quot;</span><span class="p">;</span></div><div class='line' id='LC422'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">}</span></div><div class='line' id='LC423'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">if</span> <span class="p">(</span><span class="o">!</span><span class="nx">editController</span><span class="p">.</span><span class="nx">cancelCurrentEdit</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC424'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">throw</span> <span class="s2">&quot;SlickGrid.EditorLock.activate: editController must implement .cancelCurrentEdit()&quot;</span><span class="p">;</span></div><div class='line' id='LC425'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">}</span></div><div class='line' id='LC426'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="nx">activeEditController</span> <span class="o">=</span> <span class="nx">editController</span><span class="p">;</span></div><div class='line' id='LC427'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">};</span></div><div class='line' id='LC428'><br/></div><div class='line' id='LC429'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC430'><span class="cm">     * Unsets the specified edit controller as the active edit controller (release edit lock).</span></div><div class='line' id='LC431'><span class="cm">     * If the specified edit controller is not the active one, an exception will be thrown.</span></div><div class='line' id='LC432'><span class="cm">     * @method deactivate</span></div><div class='line' id='LC433'><span class="cm">     * @param editController {EditController} edit controller releasing the lock</span></div><div class='line' id='LC434'><span class="cm">     */</span></div><div class='line' id='LC435'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">deactivate</span> <span class="o">=</span> <span class="kd">function</span> <span class="p">(</span><span class="nx">editController</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC436'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">if</span> <span class="p">(</span><span class="nx">activeEditController</span> <span class="o">!==</span> <span class="nx">editController</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC437'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">throw</span> <span class="s2">&quot;SlickGrid.EditorLock.deactivate: specified editController is not the currently active one&quot;</span><span class="p">;</span></div><div class='line' id='LC438'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">}</span></div><div class='line' id='LC439'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="nx">activeEditController</span> <span class="o">=</span> <span class="kc">null</span><span class="p">;</span></div><div class='line' id='LC440'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">};</span></div><div class='line' id='LC441'><br/></div><div class='line' id='LC442'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC443'><span class="cm">     * Attempts to commit the current edit by calling &quot;commitCurrentEdit&quot; method on the active edit</span></div><div class='line' id='LC444'><span class="cm">     * controller and returns whether the commit attempt was successful (commit may fail due to validation</span></div><div class='line' id='LC445'><span class="cm">     * errors, etc.).  Edit controller&#39;s &quot;commitCurrentEdit&quot; must return true if the commit has succeeded</span></div><div class='line' id='LC446'><span class="cm">     * and false otherwise.  If no edit controller is active, returns true.</span></div><div class='line' id='LC447'><span class="cm">     * @method commitCurrentEdit</span></div><div class='line' id='LC448'><span class="cm">     * @return {Boolean}</span></div><div class='line' id='LC449'><span class="cm">     */</span></div><div class='line' id='LC450'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">commitCurrentEdit</span> <span class="o">=</span> <span class="kd">function</span> <span class="p">()</span> <span class="p">{</span></div><div class='line' id='LC451'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">return</span> <span class="p">(</span><span class="nx">activeEditController</span> <span class="o">?</span> <span class="nx">activeEditController</span><span class="p">.</span><span class="nx">commitCurrentEdit</span><span class="p">()</span> <span class="o">:</span> <span class="kc">true</span><span class="p">);</span></div><div class='line' id='LC452'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">};</span></div><div class='line' id='LC453'><br/></div><div class='line' id='LC454'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm">/***</span></div><div class='line' id='LC455'><span class="cm">     * Attempts to cancel the current edit by calling &quot;cancelCurrentEdit&quot; method on the active edit</span></div><div class='line' id='LC456'><span class="cm">     * controller and returns whether the edit was successfully cancelled.  If no edit controller is</span></div><div class='line' id='LC457'><span class="cm">     * active, returns true.</span></div><div class='line' id='LC458'><span class="cm">     * @method cancelCurrentEdit</span></div><div class='line' id='LC459'><span class="cm">     * @return {Boolean}</span></div><div class='line' id='LC460'><span class="cm">     */</span></div><div class='line' id='LC461'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">this</span><span class="p">.</span><span class="nx">cancelCurrentEdit</span> <span class="o">=</span> <span class="kd">function</span> <span class="nx">cancelCurrentEdit</span><span class="p">()</span> <span class="p">{</span></div><div class='line' id='LC462'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">return</span> <span class="p">(</span><span class="nx">activeEditController</span> <span class="o">?</span> <span class="nx">activeEditController</span><span class="p">.</span><span class="nx">cancelCurrentEdit</span><span class="p">()</span> <span class="o">:</span> <span class="kc">true</span><span class="p">);</span></div><div class='line' id='LC463'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">};</span></div><div class='line' id='LC464'>&nbsp;&nbsp;<span class="p">}</span></div><div class='line' id='LC465'><span class="p">})(</span><span class="nx">jQuery</span><span class="p">);</span></div><div class='line' id='LC466'><br/></div><div class='line' id='LC467'><br/></div></pre></div></td>
          </tr>
        </table>
  </div>

  </div>
</div>

<a href="#jump-to-line" rel="facebox[.linejump]" data-hotkey="l" class="js-jump-to-line" style="display:none">Jump to Line</a>
<div id="jump-to-line" style="display:none">
  <form accept-charset="UTF-8" class="js-jump-to-line-form">
    <input class="linejump-input js-jump-to-line-field" type="text" placeholder="Jump to line&hellip;" autofocus>
    <button type="submit" class="button">Go</button>
  </form>
</div>

        </div>

      </div><!-- /.repo-container -->
      <div class="modal-backdrop"></div>
    </div><!-- /.container -->
  </div><!-- /.site -->


    </div><!-- /.wrapper -->

      <div class="container">
  <div class="site-footer">
    <ul class="site-footer-links right">
      <li><a href="https://status.github.com/">Status</a></li>
      <li><a href="http://developer.github.com">API</a></li>
      <li><a href="http://training.github.com">Training</a></li>
      <li><a href="http://shop.github.com">Shop</a></li>
      <li><a href="/blog">Blog</a></li>
      <li><a href="/about">About</a></li>

    </ul>

    <a href="/">
      <span class="mega-octicon octicon-mark-github" title="GitHub"></span>
    </a>

    <ul class="site-footer-links">
      <li>&copy; 2014 <span title="0.03349s from github-fe140-cp1-prd.iad.github.net">GitHub</span>, Inc.</li>
        <li><a href="/site/terms">Terms</a></li>
        <li><a href="/site/privacy">Privacy</a></li>
        <li><a href="/security">Security</a></li>
        <li><a href="/contact">Contact</a></li>
    </ul>
  </div><!-- /.site-footer -->
</div><!-- /.container -->


    <div class="fullscreen-overlay js-fullscreen-overlay" id="fullscreen_overlay">
  <div class="fullscreen-container js-fullscreen-container">
    <div class="textarea-wrap">
      <textarea name="fullscreen-contents" id="fullscreen-contents" class="fullscreen-contents js-fullscreen-contents" placeholder="" data-suggester="fullscreen_suggester"></textarea>
    </div>
  </div>
  <div class="fullscreen-sidebar">
    <a href="#" class="exit-fullscreen js-exit-fullscreen tooltipped tooltipped-w" aria-label="Exit Zen Mode">
      <span class="mega-octicon octicon-screen-normal"></span>
    </a>
    <a href="#" class="theme-switcher js-theme-switcher tooltipped tooltipped-w"
      aria-label="Switch themes">
      <span class="octicon octicon-color-mode"></span>
    </a>
  </div>
</div>



    <div id="ajax-error-message" class="flash flash-error">
      <span class="octicon octicon-alert"></span>
      <a href="#" class="octicon octicon-remove-close close js-ajax-error-dismiss"></a>
      Something went wrong with that request. Please try again.
    </div>

  </body>
</html>

