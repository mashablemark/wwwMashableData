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
    htmls: {
        subscription:
            '<div id="account-screen">' +
                '<h2>Account Management:</h2>' +
                '<h3>basic information</h3>' +
                '<span class="over">user name:</span><input class="req uname" data="user name" type="text" /><br />' +
                '<span class="over">main email:</span><input class="req email" data="email" type="text" /><br />' +
                '<div class="account-auth">' +
                    '<input type="radio" name="auth" id="authfb" value="fb" /><label for="authfb"><strong>have Facebook authenticate me.</strong>  You don\'t have to remember another password and Facebook ensures that we cannot see your password.  Everybody wins!</label>' +
                    '<input type="radio" name="auth" id="authmd" value="md" /><label for="authmd"><strong>have MashableData manage my credentials.</strong>  Your personal information will be hashed or encrypted.</label>' +
                    '<div class"account-pwd"><span class="over">password (required):</span><input class="req" data="pwd" type="password" /></div>' +
                '</div>' +
                '<div id="account-post">' +
                    '<h3>Connect my Facebook and Twitter accounts:</h3>' +
                    '<p>My Facebook account\'s email is:' +
                    '<input type="radio" name="account-fb" id="fbsame" value="account-fbsame" /><label for="account-fbsame">My Facebook email is <span class="account-main-email"></span></label>' +
                    '<input type="radio" name="account-fb" id="fbdiff" value="account-fbdiff" /><label for="account-fbdiff">The following: <input id="account-fbemail" data="optional" type="text" /></label>' +
                    '</p>' +
                    '<span class="over">My Twitter account\'s email is: </span>' +
                    '<input type="radio" name="account-twit" id="account-twitsame" value="twitmain" /><label for="account-twitsame"><span class="account-main-email"></span></label>' +
                    '<input type="radio" name="account-twit" id="account-twitdiff" value="twitdiff" /><label for="account-twitdiff">The following: <input class="twitemail" data="optional" type="text" /></label>' +
                '</div>' +
                '<h3>subscription type</h3>' +
                '<input type="radio" name="account-level" id="account-lvl-trial" value="trial" />' +
                '<label for="account-lvl-trial"><strong>free trial</strong> <em>Access to all features for a limited number of requests.</em></label><br />' +
                '<input type="radio" name="account-level" id="account-lvl-ind" value="indiv" />' +
                '<label for="account-lvl-ind"><strong>individual</strong> <em>Unlimited graphs, custom series, searches and downloads for US$10 every 6 months.</em></label><br />' +
                '<input type="radio" name="account-level" id="account-lvl-org" value="org" />' +
                '<label for="account-lvl-org"><strong>organization</strong> <em>Same unlimited usage and cost as per individual account, but shares your custom series and draft graphs within your organization.  All payments for organization members are processed by the organization\'s administrator, so only a single credit card is required.   Select this option to create a new organization account or join an existing one.</em></label><br />' +
                '<div class="account-org">' +
                    '<input type="radio" name="account-auth" id="account-org-existing" value="org-existing" />' +
                    '<label for="account-authfb2"><strong>join an existing organization.</strong></label><br />' +
                    '<div class="regcode">' +
                        'Registration code (required): <input class="req regcode" data="regcode" type="text" />' +
                        '<em>(Your code is included in your invitation email sent by your organization\'s administrator.)</em></div>' +
                        '<label for="label2">' +
                        '<input type="radio" name="auth" id="authmd" value="md" />' +
                        '<strong>create an administrative account for a new organization.</strong>.</label>' +
                        '<em>This account will have tools to send invitations and to manage users and billing.</em>' +
                    '</div>' +
                    '<div class="joinmode">' +
                        '<p><em>How will users join your organization.</em></p>' +
                        '<label for="">' +
                        '<input type="radio" name="account-join" id="account-emailorinvite" value="emailorinvite" />' +
                        '<strong>anyone with a verified email address of the same domain as your main email address OR by invitation</strong></label>' +
                        '<br />' +
                        '<input type="radio" name="account-join" id="account-inviteonly" value="inviteonly" />' +
                        '<label for=""><strong> by invitation only</strong><em>You can supply the email addresses for each member at anytime. MashableData will then send an email with a unique registration code and instructions to each invitee.</em></label><br />' +
                        '<br />' +
                    '</div>' +
                '</div>' +
                '<div class="payments">' +
                    '<h3>payment method</h3>' +
                    '<span class="llabel">credit card number:</span> <input class="fbemail" data="optional" type="text" />' +
                    'Expiration:' +
                    '<select name="expmonth"><option val="1">Jan</option><option val="2">Feb</option><option val="3">Mar</option><option val="4">Apr</option><option val="5">May</option><option val="6">Jun</option><option val="7">Jul</option><option val="8">Aug</option><option val="9">Sep</option><option val="10">Oct</option><option val="11">Nov</option><option val="12">Dec</option></select>' +
                    '<select name="expyear"></select>' +
                    'CCV: <input class="ccv" style="width:40px;" data="optional" type="text" /><br />' +
                    '<span class="llabel">name on card:</span> <input style="width:300px;" type="text" class="nameoncard" /><br />' +
                    '<span class="llabel">address:</span> <input type="text" class="address" /><br />' +
                    '<span class="llabel">city:</span> <input type="text" class="city" />	<span class="stateprov">state:</span><input type="text" class="stateprov" /> <span class="postal">ZIP code:</span><input type="text" class="postal" /></p>' +
                '</div>' +
            '</div>',
        signIn:
            '<div id="signin-md">Email:<br><input id="signin-email"><br>Password:<br><input id="signin-pwd"><br><button id="signin-signin">Sign in</button> <input id="signin-stay" type="checkbox" /> stay signed in<br><br>New to MashableData? Create an <a href="javascript:void(0)">account</a></div> ' +
            '<div id="signin-or">~ OR ~</div>' +
            '<div id="signin-fb">FB tag<br>Use your FaceBook account to log in.  (No spam or posting without your consent.  We promise and Facebook enforces our promise.)</div>',
        signedIn:
            '<div id="signedin-md"><button id="signedin-signout">Sign out</button></div>',
        verify: ''
    },
    showVerify: function(email){

    },
    showPanel: function($btn, html, w){ //preloaded email from local storage if exists
        var offset = $btn.offset();  //button offset relative to document
        $.fancybox(html,
            {
                //width: w,
                showCloseButton: false,
                //autoDimensions: false,
                autoScale: false,
                overlayOpacity: 0
            });
        var $fancy = $("#fancybox-wrap");
        $fancy.css({
            'top': parseInt(offset.top + $btn.height() -30) + 'px',
            'left': parseInt(offset.left - $fancy.width() - 20 + $btn.width()) + 'px'
        });
    },
    showSignInOut: function(){
        var $btn = $('#menu-account');
        if(loggedIn){
            account.showPanel($btn, account.htmls.signedIn, 100);
            $('#signedin-signout').button().addClass('ui-icon-error').click(function(){account.signOut()});
        } else {
            account.showPanel($btn, account.htmls.signIn, 100);

        }
    },
    showSubscribe: function(){ //preloaded and configured with account.info.  JQ/UI call and event functions.

    },
    login: function(username, password, callback){ //MD credential login will fetch and population account.info.  executes callback on success

    },
    subscribe: function(password, callback){ //account.info must be populated

    },
    logoff: function(){},
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
    }
};