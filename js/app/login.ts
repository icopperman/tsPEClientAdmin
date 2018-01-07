
import * as $ from 'jquery';
import _ from 'lodash';
import {showAlert, peSvcUrl, invokeSvc} from './appcommon';

var sloginTime, eloginTime;

function initLogin() {

    $("#btnSubmit").on("click", doLogin);

    $('.container').keypress(function (e) {

        if (e.which == 13) {

            doLogin();
        }

    });

}

function doLogin() {

    var u = "irc9012";// $("#username").val();
    var p = "Word20nyh!";//$("#password").val();

    u = $("#username").val();
    p = 'xxx';//$("#password").val();

    if ( _.isEmpty(u) || _.isEmpty(p)  ) {

        showAlert("Please enter all fields", "glyphicon-exclamation-sign", null ,'Login');

    }
    else {

        showAlert("Logging in....", "glyphicon-info-sign", "alert-info", 'Login');

        $("#btnSubmit").prop("disabled", true);
        $("#btnSubmit").css("cursor", "wait");

        var auser = { UserName: u, Password: p };
        
        var url = peSvcUrl + "login";

        sloginTime = new Date();

        invokeSvc(url, "POST", auser, parseLoginData);

    }

}

function parseLoginData(data) {

    eloginTime = new Date();
    var diff = (eloginTime - sloginTime)/1000;

    if (data.Status == "ok") {

        if (  ( data.isAdmin == 'N') || ( data.isAdmin <= 2 ) ) {

            showAlert("This cwid is not authorized to use this app. Please contact your system administrator.",
                "glyphicon-exclamation-sign", "alert-danger", 'Login');

            $("#btnSubmit").button('reset');
            $("#btnSubmit").prop("disabled", false);
            $("#btnSubmit").css("cursor", "pointer");

            return;

        }

        console.log(diff + "," + data.timeCwid + "," + data.timePswd + "," + data.timeDb);
        var currTime = new Date().getTime();

        //convert legacy admin indicator
        if (data.isAdmin == 'Y') {

            data.isAdmin = "4";
        }

        var o = {
            user: data.UserName,
            preferredCampus: data.PreferredCampus,
            preferredUnit: data.PreferredUnit,
            idxUser: data.idxUser,
            idxLogin: data.idxLogin,
            isAdmin: data.isAdmin,
            loginTime: currTime

        }

        window.localStorage.setItem('loggedInUserAdmin', JSON.stringify(o));

        var page = "stats.html";
        window.location.href = window.location.href.substring(0, window.location.href.lastIndexOf("/") + 1) + page;

    }
    else {

        var msg = "Invalid cwid and/or password";

        if (data.ErrMsg.indexOf('exception') != -1) {

            msg = "Communications error, please contact support";
        }

        showAlert(msg, "glyphicon-exclamation-sign", "alert-danger", 'Login');

        $("#btnSubmit").button('reset');
        $("#btnSubmit").prop("disabled", false);
        $("#btnSubmit").css("cursor", "pointer");

    }

}
