/* copyright MashableData.com 2013 */

//'use strict';

// SHIMS
//
//add JSON.stringify if not supported natively
function addJQueryStringify(){ //stringify extension ensure stringify functionality for older browsers
    jQuery.extend({
        stringify  : function stringify(obj) {
            if ("JSON" in window) {
                return JSON.stringify(obj); //use the browser function whenever possible
            }
            var t = typeof (obj);
            if (t != "object" || obj === null) {
                // simple data type
                if (t == "string") obj = '"' + obj + '"';
                return String(obj);
            } else {
                // recurse array or object
                var n, v, json = [], arr = (obj && obj.constructor == Array);
                for (n in obj) {
                    v = obj[n];
                    t = typeof(v);
                    if (obj.hasOwnProperty(n)) {
                        if (t == "string") {
                            v = '"' + v + '"';
                        } else if (t == "object" && v !== null){
                            v = jQuery.stringify(v);
                        }
                        json.push((arr ? "" : '"' + n + '":') + String(v));
                    }
                }
                return (arr ? "[" : "{") + String(json) + (arr ? "]" : "}");
            }
        }
    });
}

// Add ECMA262-5 method binding if not supported natively
if (!('bind' in Function.prototype)) {
    Function.prototype.bind= function(owner) {
        var that= this;
        if (arguments.length<=1) {
            return function() {
                return that.apply(owner, arguments);
            };
        } else {
            var args= Array.prototype.slice.call(arguments, 1);
            return function() {
                return that.apply(owner, arguments.length===0? args : args.concat(Array.prototype.slice.call(arguments)));
            };
        }
    };
}

// Add ECMA262-5 string trim if not supported natively
//
if (!('trim' in String.prototype)) {
    String.prototype.trim= function() {
        return this.replace(/^\s+/, '').replace(/\s+$/, '');
    };
}

// Add ECMA262-5 Array methods if not supported natively
//
if (!('indexOf' in Array.prototype)) {
    Array.prototype.indexOf= function(find, i /*opt*/) {
        if (i===undefined) i= 0;
        if (i<0) i+= this.length;
        if (i<0) i= 0;
        for (var n= this.length; i<n; i++)
            if (i in this && this[i]===find)
                return i;
        return -1;
    };
}
if (!('lastIndexOf' in Array.prototype)) {
    Array.prototype.lastIndexOf= function(find, i /*opt*/) {
        if (i===undefined) i= this.length-1;
        if (i<0) i+= this.length;
        if (i>this.length-1) i= this.length-1;
        for (i++; i-->0;) /* i++ because from-argument is sadly inclusive */
            if (i in this && this[i]===find)
                return i;
        return -1;
    };
}
if (!('forEach' in Array.prototype)) {
    Array.prototype.forEach= function(action, that /*opt*/) {
        for (var i= 0, n= this.length; i<n; i++)
            if (i in this)
                action.call(that, this[i], i, this);
    };
}
if (!('map' in Array.prototype)) {
    Array.prototype.map= function(mapper, that /*opt*/) {
        var other= new Array(this.length);
        for (var i= 0, n= this.length; i<n; i++)
            if (i in this)
                other[i]= mapper.call(that, this[i], i, this);
        return other;
    };
}
if (!('filter' in Array.prototype)) {
    Array.prototype.filter= function(filter, that /*opt*/) {
        var other= [], v;
        for (var i=0, n= this.length; i<n; i++)
            if (i in this && filter.call(that, v= this[i], i, this))
                other.push(v);
        return other;
    };
}
if (!('every' in Array.prototype)) {
    Array.prototype.every= function(tester, that /*opt*/) {
        for (var i= 0, n= this.length; i<n; i++)
            if (i in this && !tester.call(that, this[i], i, this))
                return false;
        return true;
    };
}
if (!('some' in Array.prototype)) {
    Array.prototype.some= function(tester, that /*opt*/) {
        for (var i= 0, n= this.length; i<n; i++)
            if (i in this && tester.call(that, this[i], i, this))
                return true;
        return false;
    };
}


account = {
    info: {
        name: null,
        uid: null,
        email: null,
        fbemail: null,
        fbid: null,
        admin: null,
        ccType: null,
        ccLast4: null,
        ccExpMMYY: null,
        subscription: null,  //[Trial|Free|Xpired|Admin]
        expire: null,
        orgid: null,
        organization: null,
        accesstoken: null, //may be FaceBook
        md: null // MD token = encryption with Unix login TS;uid;orgid;subscription
    },
    htmls: {
        subscription:
            '<div id="account-screen">' +
                '<h2>Account Management</h2>' +
                '<h3>Basic information:</h3>' +
                '<span class="over">display name:</span><input class="req uname medium" data="user name" type="text" /><br />' +
                '<span class="over">main email:</span><input class="req email medium" data="email" type="text" /><br />' +
                '<div class="account-auth">' +
                    '<input type="radio" name="auth" id="authfb" value="fb" /><label for="authfb"><strong>use Facebook to authenticate me.</strong>  You don\'t have to remember another password.  Everybody wins!</label><br />' +
                    '<input type="radio" name="auth" id="authmd" value="md" /><label for="authmd"><strong>create a separate MashableData password.</strong>  Your personal information will be hashed or encrypted.</label>' +
                    '<div class="account-pwd hidden blue-inset">' +
                        '<span class="over">MashableData password:</span><input class="req medium" data="pwd" type="password" /><br />' +
                        '<span class="over">confirm password:</span><input class="req medium" data="pwdConfirm" type="password" />' +
                    '</div>' +
                '</div>' +
                '<div id="account-post">' +
                    '<h3>Connect my Facebook and Twitter accounts:</h3>' +
                    '<span class="over">My Facebook account\'s email is:</span>' +
                    '<input type="radio" name="account-fb" id="account-fbsame" value="fbsame" /><label for="account-fbsame"><span class="account-main-email"></span></label>' +
                    '<input type="radio" name="account-fb" id="account-fbdiff" value="fbdiff" /><label for="account-fbdiff"><input id="account-fbemail" class="medium" data="optional" type="text" /></label>' +
                    '<input type="radio" name="account-fb" id="account-fbnone" value="fbskip" /><label for="account-fbnone">skip</label>' +
                    '<br />' +
                    '<span class="over">My Twitter account\'s email is: </span>' +
                    '<input type="radio" name="account-twit" id="account-twitsame" value="twitmain" /><label for="account-twitsame"><span class="account-main-email"></span></label>' +
                    '<input type="radio" name="account-twit" id="account-twitdiff" value="twitdiff" /><label for="account-twitdiff"><input id="account-twitemail" class="medium" data="optional" type="text" /></label>' +
                    '<input type="radio" name="account-twit" id="account-twitnone" value="twitskip" /><label for="account-twitnone">skip</label>' +
                '</div>' +
                '<div>' +
                    '<h3>Subscription type:</h3>' +
                    '<input type="radio" name="account-level" id="account-lvl-trial" value="trial" />' +
                    '<label for="account-lvl-trial"><strong>free trial</strong> <em>Access to all features for a limited number of requests.</em></label><br />' +
                    '<input type="radio" name="account-level" id="account-lvl-ind" value="indiv" />' +
                    '<label for="account-lvl-ind"><strong>individual</strong> <em>Unlimited graphs, custom series, searches and downloads for US$10 every 6 months.</em></label><br />' +
                    //'<input type="radio" name="account-level" id="account-lvl-org" value="org" />' +
                    //'<label for="account-lvl-org"><strong>organization</strong> <em>Same unlimited usage and cost as per individual account, but shares your custom series and draft graphs within your organization.  All payments for organization members are processed by the organization\'s administrator, so only a single credit card is required.   Select this option to create a new organization account or join an existing one.</em></label><br />' +
                    '<input type="radio" name="account-level" id="account-lvl-member" value="member" />' +
                    '<label for="account-lvl-member"><strong>join my organization\'s corporate account</strong> </label><br />' +
                    '<input type="radio" name="account-level" id="account-lvl-admin" value="admin" />' +
                    '<label for="account-lvl-admin"><strong>create a corporate account</strong> <em>Members will get unlimited usage plus confidential sharing of data and visualizations amoung members.  All billing and membership will be managed through this account, so only a single credit card is required.  Select this option to create and administer a new corporate account.</em></label><br />' +
                    '<div class="regcode blue-inset hidden">' +
                    'Registration code (required): <input class="req regcode" data="regcode" type="text" /><br />' +
                    '<em>Your code is included in your invitation email sent by your organization\'s administrator.</em>' +
                '</div>' +
                '<div class="joinmode blue-inset hidden">' +
                    'How will users join your organization?<br />' +
                    '<label for="account-emailorinvite">' +
                    '<input type="radio" name="account-join" id="account-emailorinvite" value="emailorinvite" />' +
                    '<strong>anyone with a verified email with the same domain as <span class="account-main-email"></span> OR by invitation</strong></label>' +
                    '<br />' +
                    '<input type="radio" name="account-join" id="account-inviteonly" value="inviteonly" />' +
                    '<label for="account-inviteonly"><strong>by invitation only</strong></label>' +
                    '<br /><em>You can supply email addresses for new members at anytime. MashableData will then send an invitation via email with a unique registration code and instructions to each invitee.</em><br />' +
                '</div>' +
            '</div>' +
                '<h3 class="payments hidden">Payment method:</h3>' +
                '<div class="payments hidden">' +
    //cardCountry: $screen.find('input.cardCountry').val()
                    '<span class="llabel">credit card number:</span> <input class="cardNum" data="optional" type="text" />' +
                    'Expiration:' +
                    '<select class="cardMonth"><option val="1">Jan</option><option val="2">Feb</option><option val="3">Mar</option><option val="4">Apr</option><option val="5">May</option><option val="6">Jun</option><option val="7">Jul</option><option val="8">Aug</option><option val="9">Sep</option><option val="10">Oct</option><option val="11">Nov</option><option val="12">Dec</option></select>' +
                    '<select class="cardYear"></select>' +
                    'CCV: <input class="cardCCV" style="width:40px;" data="optional" type="text" /><br />' +
                    '<span class="llabel">name on card:</span> <input type="text" class="cardName medium" /><br />' +
                    '<span class="llabel">address:</span> <input type="text" class="cardAddress long" /><br />' +
                    '<span class="llabel">city:</span> <input type="text" class="cardCity medium" />	<span class="cardStateProv">state:</span><input type="text" class="cardStateProv short" /> <span class="cardPostal short">ZIP code:</span><input type="text" class="cardPostal short" /> <span class="llabel">country:</span> <select class="cardCountry"></select>' +
                '</div>' +
                '<button class="ok">ok</button> <button class="cancel">cancel</button>' +
            '</div>',
        signIn:
            '<div id="signin-md">Email:<br><input id="signin-email"><br>Password:<br><input id="signin-pwd"><br><button id="signin-signin">Sign in</button> <input id="signin-stay" type="checkbox" /> stay signed in<br><br>New to MashableData? Create an <a href="javascript:void(0)">account</a></div> ' +
                '<div id="signin-or">~ OR ~</div>' +
                '<div id="signin-fb"> <fb:login-button></fb:login-button><br /><br />Use your FaceBook account to log in.<br /><br />(No spam or posting without your consent.  We promise and Facebook enforces our promise.)</div>',
        signedIn:
            '<div id="signedin-md"><button id="signedin-signout">Sign out</button><br><br><a id="signedin-subscribe" href="javascript:void(0);">Account &amp; Subscription</a><br><br><a id="signedin-admin" href="javascript:void(0)">Open administration panel</a></div>',
        verify: '<div id="verify-email">The following email needs verification.  Please enter the verification code emailed to the following email account:  <span class="email"></span><br />' +
            '<br /><input class="email" type="test" /> <br /><button class="verify">Verify</button> <button class="cancel">Cancel</button> <button class="cancel">Send New Verifcation Code</button></div>'
    },
    showPanel: function(html, $btn){ //preloaded email from local storage if exists
        $.fancybox(html,
            {
                showCloseButton: false,
                autoScale: false,
                overlayOpacity: ($btn?0:0.5),
                hideOnOverlayClick: ($btn?true:false)
            });
        var $fancy = $("#fancybox-wrap");
        if($btn){
            var offset = $btn.offset();  //button offset relative to document
            $fancy.css({
                'top': parseInt(offset.top + $btn.height() -20) + 'px',
                'left': parseInt(offset.left - $fancy.width() - 10 + $btn.width()) + 'px'
            });
        }
        return $fancy;
    },
    showSignInOut: function(){
        var $btn = $('#menu-account');
        if(loggedIn){
            account.showPanel(account.htmls.signedIn, $btn);
            $('#signedin-signout').button().addClass('ui-state-error').click(function(){account.signOut()});
            $('#signedin-subscribe').click(function(){
                    account.showSubscribe();
                });
        } else {
            account.showPanel(account.htmls.signIn, $btn);
            FB.XFBML.parse(document.getElementById('signin-fb'));
        }
    },
    showSubscribe: function(){ //preloaded and configured with account.info.  JQ/UI call and event functions.
        account.showPanel(account.htmls.subscription);
        var $screen = $('#account-screen'), fbEmail='', twitEmail='';
        $screen.find('input.email').val(fb_user.email);
        $screen.find('input.uname').val(fb_user.name);
        $screen.find('span.account-main-email').html(fb_user.email);
        $screen.find('button.cancel').button({icons: {secondary: 'ui-icon-closethick'}}).click(function(){
            $.fancybox.close();
        });
        callApi({command: 'CardSelects'}, function(oReturn, textStatus, jqXH){
            var i, $years = $screen.find('select.cardYear'), $countries = $screen.find('select.cardCountry');
            for(i=0;i<oReturn.countries.length;i++){
                $countries.append('<option value="'+oReturn.countries[i].code+'">' + oReturn.countries[i].name + '</option>');
            }
            $countries.val('USA');
            for(i=0;i<oReturn.years.length;i++){
                $years.append('<option>'+oReturn.years[i]+'</option>');
            }
        });
        $screen.find('input:radio[name=auth]').click(function(){
            if(this.id == 'authmd')
                $screen.find('div.account-pwd').slideDown();
            else
                $screen.find('div.account-pwd').slideUp();
        });
        $screen.find('input:radio[name=account-level]').click(function(){
            if(this.id == 'account-lvl-admin')$screen.find('div.joinmode').slideDown(); else $screen.find('div.joinmode').slideUp();
            if(this.id == 'account-lvl-admin' || this.id == 'account-lvl-ind') $screen.find('.payments').slideDown(); else $screen.find('.payments').slideUp();
            if(this.id == 'account-lvl-member')$screen.find('div.regcode').slideDown(); else $screen.find('div.regcode').slideUp();

        });
        $screen.find('input:radio[name=account-auth]').click(function(){
            if(this.id == 'account-org-create')
                $screen.find('div.joinmode').slideDown();
            else
                $screen.find('div.joinmode').slideUp();
        });
        $screen.find('button.ok').button({icons: {secondary: 'ui-icon-check'}}).click(function(){
            var validationMessage = '';
            //display name
            if($screen.find('input.uname').val().trim().length<5) validationMessage += '<li>Your display name must be least 5 characters</li>';
            //valid main email
            if(!account.isValidEmail($screen.find('input.email').val().trim())) validationMessage += '<li>Your main email is not a valid email address</li>';
            //twitter email selection made
            //auth mode radio selection made
            if(!$screen.find('input[name=auth]:checked').val()) validationMessage += '<li>Please indicate how you wish to be authenticated</li>';
            //matching password > 5 if md auth
            if($screen.find('input[name=auth]:checked').val()=='md' && ($screen.find('pwd').val().trim().length<8 || $screen.find('pwd').val().trim()!=$screen.find('pwdConfirm').val().trim())){
                validationMessage += '<li>Your passwords must match and be at 8 characters long</li>';
                $screen.find('pwd').val('');
                $screen.find('pwdConfirm').val('');
            }
            //fb email selection made
            if(!$screen.find('input[name=account-fb]:checked').val()) validationMessage += '<li>Please indicate whether and how to integrate your Facebook account</li>';
            //valid fb email if separate is given
            if($screen.find('input[name=account-fb]:checked').val()=='fbdiff' && !account.isValidEmail($screen.find('input#account-fbemail').val().trim())) validationMessage += '<li>Your Facebook email is not a valid email address</li>';
            //twitter email selection made
            if(!$screen.find('input[name=account-twit]:checked').val()) validationMessage += '<li>Please indicate whether and how to integrate your Twitter account</li>';
            //valid twitter email if separate is given
            if($screen.find('input[name=account-fb]:checked').val()=='twitdiff' && !account.isValidEmail($screen.find('input#account-twitemail').val().trim())) validationMessage += '<li>Your Twitter email is not a valid email address</li>';
            //subscription type radio selection made
            var accountLevel = $screen.find('input[name=account-level]:checked').val();
            if(!accountLevel) validationMessage += '<li>You must select a subscription level</li>';
            //if org, join mode selection made
            if(accountLevel =='admin' && !$screen.find('input[name=account-join]:checked').val()) validationMessage += '<li>You must indicate how users will be allowed to join your organization.</li>';
            //if joining, reg code
            //TODO
            //if single account or creating org account, validate credit card
            if(accountLevel =='admin' || accountLevel =='indiv'){
                //TODO
            }
            if(validationMessage.length>0){
                dialogShow('Invalid responses','The following problems were detected:<br><ol>'+validationMessage+'</ol>Please correct these issues and resubmit.');
            } else {
                //process!
                var params = {
                    command: 'Subscribe',
                    name: $screen.find('input.uname').val().trim(),
                    email: $screen.find('input.email').val().trim(),
                    auth: $screen.find('input[name=auth]:checked').val(),
                    pwd: $screen.find('pwd').val().trim(),
                    fbemail: $screen.find('input[name=account-fb]:checked').val()=='fbdiff'?$screen.find('input#account-fbemail').val().trim():$screen.find('input.email').val().trim(),
                    twitemail: $screen.find('input[name=account-twit]:checked').val()=='twitdiff'?$screen.find('input#account-twitemail').val().trim():$screen.find('input.email').val().trim(),
                    accountLevel: accountLevel,
                    regCode: $screen.find('input.regcode').val(),
                    accountJoinMode: $screen.find('input[name=account-join]:checked').val(),
                    cardNum: $screen.find('input.cardNum').val(),
                    cardMonth: $screen.find('input.cardMonth').val(),
                    cardYear: $screen.find('input.cardYear').val(),
                    cardCCV: $screen.find('input.cardCCV').val(),
                    cardName: $screen.find('input.cardName').val(),
                    cardAddress: $screen.find('input.cardAddress').val(),
                    cardCity: $screen.find('input.cardCity').val(),
                    cardStateProv: $screen.find('input.cardStateProv').val(),
                    cardPostal: $screen.find('input.cardPostal').val(),
                    cardCountry: $screen.find('input.cardCountry').val()
                };
                callApi(
                    params,
                    function (oReturn, textStatus, jqXH) {
                        if(oReturn.status=="OK") {
                            $.fancybox().close();
                            account.info.name = params.name;
                            account.info.email = params.email;
                            account.info.fbemail = params.fbemail;
                            /*account.info. = params.name;
                            account.info.name = params.name;
                            account.info.name = params.name;
                            account.info.name = params.name;
                            account.info.name = params.name;*/

                        }
                        dialogShow('Account and subscription managment', oRetrun.msg);
                    }
                );
            }
        });
        function resize(){

        }

    },
    isValidEmail: function(email){
        return email.split('@').length==2 && email.split('@')[1].split('.').length>0 && !(/[\s]/.test(email));
    },
    showVerify: function(email){
        account.showPanel(account.htmls.verify);
        var $verify = $('#verify-email');
        $verify.find('span.email').html(email);
        $verify.find('.cancel').button({icons: {secondary: 'ui-icon-closethick'}}).addClass('ui-state-error').click(function(){
            account.showSubscribe();
        });
        $verify.find('.cancel').button({icons: {secondary: 'ui-icon-check'}}).click(function(){
                account.verified(email, $verify.find('input.email').val())}
        );
    },
    signIn: function(username, password, callback){ //MD credential login will fetch and population account.info.  executes callback on success

    },
    signInFB: function(response){
        if (response.authResponse) {
            loggedIn = "Facebook";  //global variable
            accessToken = response.authResponse.accessToken; //TODO: save this in user account from //www.mashabledata.com/fb_channel.php and pass in all server requests
            expiresIn = response.authResponse.expiresIn;
            FB.api('/me', function(response) {
                fb_user = response;  //global variable
                getUserId();
            });
            $.fancybox.close()
        }
    },
    subscribe: function(password, callback){ //account.info must be populated

    },
    signOut: function(){
        FB.logout(function(response) {
            localStorage.removeItem('token');  //remove the FB token
            localStorage.removeItem('mdtoken');  //remove the MD encryted token
            window.location.reload();  // user is now logged out; reload will reset everything
        });
    },
    loginout: function (){ //
        if(loggedIn){
            account.signOut();
        } else {
            FB.login(function(response) {
                if (response.authResponse) {
                    loggedIn = "facebook";  //global variable
                    accessToken =  response.authResponse.accessToken;
                    localStorage.setItem('fbtoken', accessToken); //used for uploading when Workbench is not open but user is authorized and has logged in
                    expiresIn = response.authResponse.expiresIn;
                    FB.api('/me', function(response) {
                        fb_user = response;  //global variable
                        getUserId(); //trigger an account sync on first call
                    });
                }
            });
        }
    },
    sendVerificationCode: function(email){
        callApi({command: 'sendVerificationCode', email: email}, function(jsoData, textStatus, jqXH){
            dialogShow('A new verification code was sent to '+ email +'.  Please check your account. ' +  (jsoData.reissued?'<br><br><em>Note that any previous verification codes are no longer valid.</em>':''));
        });
    }
};

