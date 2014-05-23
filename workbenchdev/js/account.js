/**
 * Created with JetBrains PhpStorm.
 * User: mark__000
 * Date: 2/14/13
 * Time: 11:32 PM
 * To change this template use File | Settings | File Templates.
 */

account = {
    info: {
        username: null,
        userid: null,
        auth: null,  //FB or MD
        email: null,
        fbemail: null,
        fbid: null,
        admin: null,
        ccName: null,
        ccadresss: null,
        cccity: null,
        ccstateprov: null,
        ccpostal: null,
        cccountry: null,
        ccType: null,
        ccLast4: null,
        ccExpMMYY: null,
        subscription: null,  //[T|I|C|X] for trial|individual|corporate|canceled
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
                '<div class="account-auth">' +
                '<input type="radio" name="auth" id="authfb" value="fb" /><label for="authfb"><strong>use Facebook to authenticate me.</strong>  You don\'t have to remember another password.  Everybody wins!</label><br />' +
                '<input type="radio" name="auth" id="authmd" value="md" /><label for="authmd"><strong>create a separate MashableData password.</strong>  Your personal information will be hashed or encrypted.</label>' +
                '</div>' +
                '<h3>Basic information:</h3>' +
                '<span class="over">display name:</span><input class="req uname medium" data="user name" type="text" /><br />' +
                '<span class="over">main email:</span><input class="req email medium" data="email" type="text" /><br />' +

                '<div class="account-pwd hidden blue-inset">' +
                '<span class="over">MashableData password:</span><input class="req medium pwd" data="pwd" type="password" /><br />' +
                '<span class="over">confirm password:</span><input class="req medium pwdConfirm" data="pwdConfirm" type="password" />' +
                '</div>' +
                /*'<div id="account-post">' +
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
                '</div>' +*/
                '<div>' +
                '<h3>Subscription type:</h3>' +
                '<label><input type="radio" name="account-level" class="account-level" id="account-lvl-trial" value="T" /><strong>free trial</strong> <em>Access to all features for a limited number of requests.</em></label><br />' +
                '<label><input type="radio" name="account-level" class="account-level" id="account-lvl-ind" value="I" /><strong>individual</strong> <em>Unlimited graphs, custom series, searches and downloads for US$10 every 6 months.</em></label><br />' +
                //'<input type="radio" name="account-level" id="account-lvl-org" value="org" />' +
                //'<label for="account-lvl-org"><strong>organization</strong> <em>Same unlimited usage and cost as per individual account, but shares your custom series and draft graphs within your organization.  All payments for organization members are processed by the organization\'s administrator, so only a single credit card is required.   Select this option to create a new organization account or join an existing one.</em></label><br />' +
                '<label><input type="radio" name="account-level" class="account-level" id="account-lvl-member" value="C" /><strong>join my organization\'s corporate account</strong> </label><br />' +
                '<label><input type="radio" name="account-level" class="account-level" id="account-lvl-admin" value="A" /><strong>create a corporate account</strong> <em>Members will get unlimited usage plus confidential sharing of data and visualizations amoung members.  All billing and membership will be managed through this account, so only a single credit card is required.  Select this option to create and administer a new corporate account.</em></label><br />' +
                '<div class="validation blue-inset hidden">' +
                'Email validation code (required): <input class="req valcode" data="valcode" type="text" /><br />' +
                '<em>You email validation code is in an email sent moments ago from admin@mashabledata.com.</em>' +
                '</div>' +
                '<div class="regcode blue-inset hidden">' +
                'Registration code (required): <input class="req regcode" data="regcode" type="text" /><br />' +
                '<em>Your code is included in your invitation email sent by your organization\'s administrator.</em>' +
                '</div>' +
                '<div class="joinmode blue-inset hidden">' +
                'Company / organization name: <input data="orgName" id="account-org-name" class="long" /><br />' +
                'How will users join your organization?<br />' +
                '<label><input type="radio" name="account-join" id="account-inviteonly" value="inviteonly" /><strong>by invitation only</strong></label><br />' +
                '<label><input type="radio" name="account-join" id="account-emailorinvite" value="emailorinvite" /><strong>by invitation OR anyone able to receive email through an @<span class="italics account-main-email-domain"></span> account</strong></label>' +
                '<br /><br />' +
                '<em>You will be able to add email addresses of new members via the administration panel after your credit card is accepted. MashableData will then email an invitation with a unique registration code and instructions to each new member.</em><br />' +
                '</div>' +
                '</div>' +
                '<h3 class="payments hidden">Payment method:</h3>' +
                '<div class="payments hidden">' +
                //cardCountry: $screen.find('input.cardCountry').val()
                '<span class="llabel">credit card number:</span><input class="cardNum" data="ccnum" type="text" />' +
                '<span class="mlabel">CCV:</span><input class="cardCCV tiny" data="ccv" data="optional" type="text" />' +
                '<span class="right"><span class="mlabel">Expiration:</span>' +
                '<select class="cardMonth"><option val="1">Jan</option><option val="2">Feb</option><option val="3">Mar</option><option val="4">Apr</option><option val="5">May</option><option val="6">Jun</option><option val="7">Jul</option><option val="8">Aug</option><option val="9">Sep</option><option val="10">Oct</option><option val="11">Nov</option><option val="12">Dec</option></select>' +
                '<select class="cardYear"></select></span>' +
                '<br /><span class="llabel">name on card:</span><input type="text" data="ccname" class="cardName medium" /><br />' +
                '<span class="llabel">address:</span><input type="text" data="ccaddress" class="cardAddress long" /><br />' +
                '<span class="llabel">city:</span><input type="text" data="cccity" class="cardCity medium" /><span class="cardStateProv mlabel">state:</span><input type="text" data="ccstateprov" class="cardStateProv short" /><span class="cardPostal mlabel">ZIP code:</span><input type="text" class="cardPostal tiny" data="ccpostal"  /><span class="mlabel">country:</span><select class="cardCountry"></select>' +
                '</div>' +
                '<button class="ok">ok</button> <button class="cancel">cancel</button>' +
                '</div>',
        signIn:
            '<div id="signin-md">Email:<br><input id="signin-email"><br>Password:<br><input id="signin-pwd"><br><button id="signin-signin">Sign in</button> <input id="signin-stay" type="checkbox" /> stay signed in<br><br>New to MashableData? Create an <a id="create-account" href="javascript:void(0)">account</a></div> ' +
                '<div id="signin-or">~ OR ~</div>' +
                '<div id="signin-fb"> <fb:login-button></fb:login-button><br /><br />Use your FaceBook account to log in.<br /><br />(No spam or posting without your consent.  We promise and Facebook enforces our promise.)</div>' +
                '<div style="text-align: center;"><a id="license-link" href="license.html">MashableData Workbench Term of Service</a></div>',
        signedIn:
            '<div id="signedin-md"><button id="signedin-signout">Sign out</button><br><br><a id="signedin-subscribe" href="javascript:void(0);">Account &amp; Subscription</a><span id="signedin-admin" style="display:none;"><br><br><a href="admin_users.php" target="_blank">User Management & Billing</a> (Administrator only)</span></div>',
        verify: '<div id="verify-email">The following email needs verification.  Please enter the verification code emailed to the following email account:  <span class="email"></span><br />' +
            '<br /><input class="email" type="test" /> <br /><button class="verify">Verify</button> <button class="cancel">Cancel</button> <button class="cancel">Send New Verifcation Code</button></div>'
    },
    showPanel: function(html, $btn){ //preloaded email from local storage if exists
        $.fancybox(html,
            {
                showCloseButton: false,
                autoScale: true,  //($btn?false:true),
                overlayOpacity: ($btn?0:0.5),
                hideOnOverlayClick: ($btn?true:false)
            });
        var $fancy = $("#fancybox-wrap");
        if($btn){
            var offset = $btn.offset();  //button offset relative to document
            $fancy.css({
                'top': parseInt(offset.top + $btn.height() -15) + 'px',
                'left': parseInt(offset.left - $fancy.width() - 18 + $btn.width()) + 'px'
            });
        }
        return $fancy;
    },
    showSignInOut: function(){
        var $btn = $('#menu-account');
        if(this.loggedIn()){
            account.showPanel(account.htmls.signedIn, $btn);
            if(account.info.subscription==='A')$('#signedin-admin').show();
            $('#signedin-signout').button().addClass('ui-state-error').click(function(){account.signOut()});
        } else {
            account.showPanel(account.htmls.signIn, $btn);
            $('#license-link').fancybox();
            FB.XFBML.parse(document.getElementById('signin-fb'));
        }
        $('#create-account,#signedin-subscribe').click(function(){
            account.showSubscribe();
        });
    },
    showSubscribe: function(){ //preloaded and configured with account.info.  JQ/UI call and event functions.
        var $fancy = account.showPanel(account.htmls.subscription);
        var $screen = $('#account-screen'), fbEmail='', twitEmail='';
        var eligible = false;
        var invited = false;
        var field;
        account.subscribing = true;
        $screen.find('[data]').each(function(){
            field = $(this).attr('data');
            $(this).val(account.info[field]);
        });
        $screen.find("input.account-level[value='"+(account.info.subscription||'T')+"']").click();
        if(account.info.subscription=='C'||account.info.subscription=='A'){
            $screen.find('input.account-level').attr('disabled',true);
            $screen.find('div.validation').html('You are a member of the corporate account of '+account.info.orgName+'.<br><br>This account can only be changed or cancelled in the '
            + (account.info.subscription=='A'?'<a href="admin_users.php" target="_blank">':'')+'account administrator\'s panel'+(account.info.subscription=='A'?'</>':'')+'.').show();
            /* handle all fo this in the administration panels
            if(account.info.subscription=='A'){
                $screen.find('div.joinmode').slideDown();
                $screen.find('.payments').slideDown();
            }*/
        }
        $screen.find('input.email')
            .val(account.info.email)
            .change(function(){
                if(account.isValidEmail(this.value)){
                    $('.account-main-email-domain').html(this.value.split('@')[1].trim());
                    callApi({command: 'CheckEmailForOrgInv', email: this.value.trim(), modal: 'none'}, function(oReturn, textStatus, jqXH){
                        invited = oReturn.invited;
                        eligible = oReturn.eligible;
                        if(oReturn.invited){
                            dialogShow('Corporate membership found','Our records show that a registration code to join the corporate account of '+oReturn.orgname+' was originally sent to '+this.value+' on '+oReturn.date
                            + '. The registration email was just resent.  Please copy the registration code from either email into the form to complete your registration.');
                            $('#account-lvl-member').click();
                        }
                        if(oReturn.eligible){
                            dialogShow('Corporate membership found','Based on your email, you are eligible to join the corporate account of "'+oReturn.orgname+'".  However, you must first validate your email address.  A registration code was just sent to '+this.value
                                + '. Please copy the validation code from the email into the registration form to complete your registration.');
                            $('#account-lvl-member').click();
                        }
                    });
                    if(!account.loggedIn() || this.value!=account.info.email){
                        account.sendVerificationCode(this.value.trim());
                    }
                } else {
                    $('.account-main-email-domain').html('*no domain detected*')
                }
            })
            .change();
        $screen.find('input.uname')
            .val(account.info.name);
        $screen.find('span.account-main-email').html(account.info.email);
        $screen.find('button.cancel').button({icons: {secondary:  'ui-icon-closethick'}}).click(function(){
            account.subscribing = false;
            $.fancybox.close();
        });
        if(this.loggedIn()){
            $screen.find('#'+(account.info.authmode=="Facebook"?'authfb':'authmd')).attr('checked',true);
            $screen.find('.email').attr('disabled',true);
            $screen.find("input:radio[name='auth']").attr("disabled",true)
        }
        //fill the cc country and exp year dropdowns
        callApi({command: 'CardSelects', modal: 'none'}, function(oReturn, textStatus, jqXH){
            var i, $years = $screen.find('select.cardYear'), $countries = $screen.find('select.cardCountry');
            for(i=0;i<oReturn.countries.length;i++){
                $countries.append('<option>' + oReturn.countries[i].name + '</option>');
            }
            $countries.val(account.info.ccountry||'United States');
            for(i=0;i<oReturn.years.length;i++){
                $years.append('<option>'+oReturn.years[i]+'</option>');
            }
            if(account.info.ccexpiration){
                var aex = account.info.ccexpiration.split('/');
                if(aex.length==2){
                    $years.val(aex[1]);
                    $screen.find('.cardMonth').val(aex[0]);
                }
            }
        });
        //authenticate with Facebook or MashableData
        $screen.find('input:radio[name=auth]').click(function(){
            if(this.id == 'authmd') {
                $screen.find('.email').removeAttr('disabled');
                $screen.find('div.account-pwd').slideDown();
                resize();
            }
            else {
                $screen.find('div.account-pwd').slideUp();
                if(account.loggedIn() && account.info.authmode=='Facebook'){
                    $screen.find('.email').attr("disabled", true);
                } else {
                    account.loginout();
                }
            }
        });
        $screen.find('input:radio[name=account-level]').click(function(){
            if(this.id == 'account-lvl-admin'){
                $screen.find('div.joinmode').slideDown();
                resize();
            } else $screen.find('div.joinmode').slideUp();
            if(this.id == 'account-lvl-admin' || this.id == 'account-lvl-ind'){
                $screen.find('.payments').slideDown();
                resize();
            } else $screen.find('.payments').slideUp();
            if(this.id == 'account-lvl-member'){
                if(eligible){
                    $screen.find('div.valcode').slideDown();
                } else {
                    $screen.find('div.regcode').slideDown();
                }
                if(!invited&&!eligible){
                    dialogShow("No corporate account available", "Our records do not show a corporate membership available to the email entered above.  Please contact the administrator of your organization's MashableData account to be added.");
                }
                resize();
            } else {
                $screen.find('div.regcode,div.valcode').slideUp();
            }

        });
        $screen.find('input:radio[name=account-auth]').click(function(){
            if(this.id == 'account-org-create'){
                $screen.find('div.joinmode').slideDown();
                resize();
            } else $screen.find('div.joinmode').slideUp();
        });
        $screen.find('button.ok').button({icons: {secondary: 'ui-icon-check'}}).click(function(){
            var validationMessage = '';
            //display name
            if($screen.find('input.uname').val().trim().length<5) validationMessage += '<li>Your display name must be least 5 characters</li>';
            //valid main email
            if(!account.isValidEmail($screen.find('input.email').val().trim())) validationMessage += '<li>Your main email is not a valid email address</li>';
            //twitter email selection made
            //auth mode radio selection made
            if(!$screen.find('input[name=auth]:checked')) validationMessage += '<li>Please indicate how you wish to be authenticated</li>';
            //matching password > 5 if md auth
            if($screen.find('input[name=auth]:checked').val()=='md' && ($screen.find('.pwd').val().trim().length<8 || $screen.find('.pwd').val().trim()!=$screen.find('.pwdConfirm').val().trim())){
                validationMessage += '<li>Your passwords must match and be at 8 characters long</li>';
                $screen.find('.pwd').val('');
                $screen.find('.pwdConfirm').val('');
            }
        /*
            //fb email selection made
            if(!$screen.find('input[name=account-fb]:checked').val()) validationMessage += '<li>Please indicate whether and how to integrate your Facebook account</li>';
            //valid fb email if separate is given
            if($screen.find('input[name=account-fb]:checked').val()=='fbdiff' && !account.isValidEmail($screen.find('input#account-fbemail').val().trim())) validationMessage += '<li>Your Facebook email is not a valid email address</li>';
            //twitter email selection made
            if(!$screen.find('input[name=account-twit]:checked').val()) validationMessage += '<li>Please indicate whether and how to integrate your Twitter account</li>';
            //valid twitter email if separate is given
            if($screen.find('input[name=account-fb]:checked').val()=='twitdiff' && !account.isValidEmail($screen.find('input#account-twitemail').val().trim())) validationMessage += '<li>Your Twitter email is not a valid email address</li>';
     */
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
                    pwd: $screen.find('input.pwd').val().trim(),
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
            $fancy.animate({top: 50});
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
    signInFB: function(basicResponse){
        if (basicResponse.authResponse) {
            if(this.signingIn) return; //insurance against double sign-in occuring during asynchronous calls
            this.signingIn = true;
            account.info.authmode = "Facebook";  //global variable
            var accessToken = basicResponse.authResponse.accessToken; //TODO: save this in user account from //www.mashabledata.com/fb_channel.php and pass in all server requests
            expiresIn = basicResponse.authResponse.expiresIn;
            FB.api('/me', function(response) {
                account.info.fbid = response.id;
                account.fb_user = response;
                account.fb_user.accessToken = accessToken;
                account.info.accesstoken = accessToken;
                account.info.name = response.name;
                account.info.email = response.email;
                if(response.email){
                    getUserId();
                    this.signingIn = false;
                } else {
                    FB.login();
                    dialogShow("Email required","You must authorize Facebook to share your email with MashableData.  Mashdata requires a single validated email address and will remain confidential");
                    this.signingIn = false;
                }
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
            window.onbeforeunload = false;
            window.location.reload();  // user is now logged out; reload will reset everything
        });
    },
    loginout: function (){ //
        if(account.loggedIn()){
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
    loggedIn:  function(){
        return (this.info.userId!=null)
    },
    sendVerificationCode: function(email){
        callApi({command: 'EmailVerify', email: email, verification: 'x'}, function(jsoData, textStatus, jqXH){
            dialogShow('email verification code','A verification code was sent to '+ email +'.  Please check this email account and enter the code where directed. ');
        });
    }
};
