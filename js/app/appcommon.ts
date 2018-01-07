class LoggedInUser {

    isAdmin?: string;
    preferredCampus?: string;
    loginTime?: string;
    preferredUnit?:string;
    idxLogin?: string;
    user?: string;

}
import $ from 'jquery';
import _ from 'lodash'
import * as Rx from 'rxjs';
//var eunits = [];
//var wunits = [];
//var beds = [];


//var peSvcUrl = "http://webdev.nyp.org/InventoryTrackerSvcProd/"
//var peSvcUrl = "http://webdev.nyp.org/InventoryTrackerSvc/"
export var peSvcUrl = "http://localhost:58087/";

var loggedInUser: LoggedInUser = {};
var currResourceFunc;
var currResourceTblIdx;
var currTabletFunc;
var currSelectedCampus;
var prevSortColumn = "";

var resources = {
    emails: [],
    units: [],
    users: [],
    tablets: []
}

function initApp() {

    var isLoggedIn = verifyLogin();

    if (isLoggedIn == false) {

        window.location.href = "http://" + window.location.host + "/login.html";

    }

    //$("#campusHdr").text((loggedInUser.preferredCampus == "E") ? "East Campus" : "West Campus")
    //window.localStorage.setItem("selectedUnit", loggedInUser.preferredUnit);
    //window.localStorage.setItem("selectedCampus", loggedInUser.preferredCampus);
    //$('input[type=radio][name=campuses]').on('change', changeCampuses);

    //set up click handlers
    $("#btnLogoff").on("click", doLogoff);
    $("#sidebar-toggle").click(toggleSidebar);

    $("#divCampusFilter").on('change', changeCampuses);
    //$("#divUnitFilter").on('change', filterUnits);

    $("#manageTablets").on('click', manageResource);
    $("#manageEmails").on('click', manageResource);
    $("#manageUsers").on('click', manageResource);
    $("#manageUnits").on('click', manageResource);
    //$("#manageEmails").hide();

    $("#btnAddResource").on('click', addResource);
    $("input[type=radio][name=resourceCampus]").on('change', changeCampusForAddEdit);

    currSelectedCampus = loggedInUser.preferredCampus;
    $(`#rbCampuses${currSelectedCampus}`).prop('checked', true);

    initResource();

    //if ((loggedInUser.isAdmin == "1") || (loggedInUser.isAdmin == "2")) {

    //    showAlert("This cwid is not authorized to use this page. Please logout.", "glyphicon-exclamation-sign");
    //    return;
    //}

}

function initResource() {

    Rx.Observable
        .forkJoin(
            getResource("email"), getResource("unit"), getResource("user"), getResource("tablet")
        )
        .flatMap(function (data) {

            console.log(data);
            return data;
        })
        .subscribe(
            onNext,
            onError,
            onComplete
        );

}

function getResource(resourceName) {

    var url = peSvcUrl + resourceName + 's';

    var p = $.ajax(url, {
        type: "GET",
        contentType: "application/json",
        data: "",

    }).promise();

    return Rx.Observable.fromPromise(p);
}

function onNext(data) {

    var rName = _.keys(data)[0].toLowerCase();

    if (data.Status != 'ok') {

        showAlert("Error getting" + rName + ":" + data.ErrMsg, "glyphicon-exclamation-sign", null, '');

        return;

    }

    normalizeResources(rName, data);

}

//function ncFilter() {

//    if ((loggedInUser.isAdmin == '2') || (loggedInUser.isAdmin == '8')) {

//        //nc users can only see nc units
//        var nunits = _.filter(resources["units"], function (aunit) { return aunit.unitTypeOrig == '3'; })

//        //nc users can only see nc users
//        var nusers = _.filter(resources["users"], function (auser) { return ((auser.isAdmin == '2') || (auser.isAdmin == '8')); })

//        resources["units"] = nunits;
//        resources["users"] = nusers;

//    }

//}

function normalizeResources(rName, data) {

    switch (rName) {

        case "emails":
            resources[rName] = _.map(data.Emails, function (item) { item.rName = item.EmailAddress; item.rCampus = item.Campus; item.rUnit = item.Unit; return item; });

            break;
        case "users":

            var xx = _.map(data.Users, function (item) {

                item.rName = item.userCwid;
                item.rCampus = item.preferredCampus;
                item.rUnit = item.preferredUnit;
                item.tblIdx = item.idUser;

                var userType = '';

                switch (item.isAdmin) {

                    case "1": userType = 'User'; break;
                    case "2": userType = 'NC User'; break;
                    case "4": userType = 'Admin'; break;
                    case "8": userType = 'NC Admin'; break;

                }

                item.userType = userType;

                return item;

            });

            if ((loggedInUser.isAdmin == '2') || (loggedInUser.isAdmin == '8')) {

                //nc users can only see nc users
                var yy = _.filter(xx,  function (auser) { return ((auser.isAdmin == '2') || (auser.isAdmin == '8')); })
                
                resources["users"] = yy;

            }
            else { resources["users"] = xx;  }

            break;

        case "units":
                var xx = _.map(data.Units, function (item) {

                item.rName   = item.unitName;
                item.rCampus = item.campus;
                item.rUnit = item.unitName;
                item.tblIdx = item.idUnit;

                var unitType = '';

                switch (item.unitType) {

                    case "0": unitType = 'Inactive'; break;
                    case "1": unitType = 'Clinical - Beds'; break;
                    case "2": unitType = 'Clinical - No Beds'; break;
                    case "3": unitType = 'Non-Clinical'; break;

                }

                if (_.isEmpty(item.unitTypeOrig) == true) {

                    item.unitTypeOrig = item.unitType;
                    item.unitType     = unitType;
                }

                return item;
            });

            if ((loggedInUser.isAdmin == '2') || (loggedInUser.isAdmin == '8')) {

                //nc users can only see nc users
                var yy = _.filter(xx, function (aunit) { return aunit.unitTypeOrig == '3'; })

                resources["units"] = yy;

            }
            else { resources["units"] = xx; }

            break;

        case "tablets":
            resources[rName] = _.map(data.Tablets, function (item) { item.rName = item.TabletName; item.rCampus = item.Campus; item.rUnit = item.Unit; return item; });

            break;
    }
}


function onError(error) {

    console.log('here');
}

function onComplete() {

    $("#divCampusFilter").show();
   // $("#divResource").show();

    $("#manageTablets").trigger('click');

}

function manageResource() {

    var resourceName = this.name;
    var btnLabel     = "Add " + this.name;
    var hdrText      = this.name + "s";

    $("#divAlertResource").hide();

    $("#btnAddResource").text(btnLabel);
    $("#hdrResource").text(hdrText);
    $("#divResource").show();
  
    window.localStorage.setItem("currResource", resourceName.toLowerCase());

    window[hdrText.toLowerCase()] = resources[hdrText.toLowerCase()];
    rebuildResourceTable(window[hdrText.toLowerCase()]);//, "campus");
  
    //window.localStorage.setItem("currFunction", resourceName.toLowerCase());

}

function addResource() {

    var currResource   = window.localStorage.getItem("currResource");
    currResourceFunc   = 'add';
    currResourceTblIdx = 0;
    currTabletFunc     = 'add';

    $(`#resourceCampus${loggedInUser.preferredCampus}`).prop('checked', true);
    $("#promptHdrResource").text("Add New " + currResource);
    $("#lblResourceName").text("Enter " + currResource + " name");

    $("#divResourceUserType").hide();
    $("#divResourceUnitType").hide();
    $("#divResourceUnits").show();

    switch (currResource) {

        case "unit":

            $("#rbUnitType3").prop("checked", "checked");
            $("#divResourceUnitType").show();
            $("#divResourceUnits").hide();

            if ((loggedInUser.isAdmin == '2') || (loggedInUser.isAdmin == '8')) {

                //nc users can only create nc units, so disable other types
                $("#rbUnitType0").prop("disabled", true);
                $("#rbUnitType1").prop("disabled", true);
                $("#rbUnitType2").prop("disabled", true);

            }
            break;

        case "user":

            $("#resourceName").prop('disabled', false);
            $("#divResourceUserType").show();

            if ((loggedInUser.isAdmin == '2') || (loggedInUser.isAdmin == '8')) {

                //nc users can only define nc users, so disable others
                $("#rbUserType1").prop("disabled", true);
                $("#rbUserType4").prop("disabled", true);

            }

            break;

    }

    if (currResource != 'unit') {

        $("#divResourceUnits").show();

        fillDropdown('units');

    }

    $("#divAddResource").modal('show');

}

function editResource(idx, tabletFunc) {

    var currResource   = window.localStorage.getItem("currResource");
    currResourceFunc   = "edit";
    currResourceTblIdx = idx;
    currTabletFunc     = tabletFunc;

    var resourceInTable = $("#tblResource").data("#tblResource");
    var theResource = _.find(resourceInTable, function (aresource) {
        return aresource.tblIdx == idx;
    });

    var currResourceName = theResource['rName'];
    var currResourceCampus = theResource['rCampus'];
    var currResourceUnit = theResource['rUnit'];

    if ((currResource == "tablet") && (tabletFunc == "checkin")) {
        //checkin does not need to display a form, just update db
        resourceSave("checkin");
        return;
    }

    $("#resourceName").prop('disabled', false);
    $("#resourceName").val(currResourceName);
    $(`#resourceCampus${currResourceCampus}`).prop('checked', true);
    $("#lblResourceName").text(`Edit ${_.capitalize(currResource)}`);
    $("#promptHdrResource").text(`Edit ${_.capitalize(currResource)}`);
    $("#divResourceUnitType").hide();
    $("#divResourceUserType").hide();

     $("#divResourceUnits").show();
     fillDropdown('units');
     $("#resourceUnits").val(currResourceUnit);

    if ((currResource == "tablet") && (tabletFunc == "checkout")) {

        $("#promptHdrAssignTablet").text("Assign Tablet " + currResourceName + " to User");

        fillDropdown('users');
        $("#divAssignTablet").modal('show');
      
        return;

    }

    if ((currResource == "tablet") && (tabletFunc == "edit")) {

        var isAssigned = (theResource.Status == 'unassigned') ? 'no' : 'yes';

        if (isAssigned == 'yes') {

            showAlert('Cannot edit a checked out tablet', "glyphicon-exclamation-sign", "alert-danger", '');
            return;
        }

    }

    if (currResource == "user") {

        let currResourceUserType = theResource["userType"];
        let currResourceUserType1 = theResource["isAdmin"];

        $(`#rbUserType${currResourceUserType1}`).prop("checked", true);
        $("#resourceName").prop('disabled', true);
        $("#divResourceUserType").show();

        if ((loggedInUser.isAdmin == '2') || (loggedInUser.isAdmin == '8')) {

            //nc users can only define nc users, so disable others
            $("#rbUserType1").prop("disabled", true);
            $("#rbUserType4").prop("disabled", true);

        }
    }

    if (currResource == "unit") {

        $("#divResourceUnits").hide();

        let currResourceUnitType = theResource["unitType"];
        let currResourceUnitTypeOrig = theResource["unitTypeOrig"];

        $(`#rbUnitType${currResourceUnitTypeOrig}`).prop("checked", true);
        $("#divResourceUnitType").show();

        if ((loggedInUser.isAdmin == '2') || (loggedInUser.isAdmin == '8')) {

            //nc users can only create nc units, so disable other types
            $("#rbUnitType0").prop("disabled", true);
            $("#rbUnitType1").prop("disabled", true);
            $("#rbUnitType2").prop("disabled", true);

        }

    }

    $("#divAddResource").modal('show');

}

function tabletAssign(savetype) {
    
    var auser = $("#tabletAssignUsers option:selected").val();

    if (_.isEmpty(auser) == true) {

        $("#promptErrorAssignTablet").text("Please select a user before saving");

        return;
    }

    resourceSave(savetype);

}

function clearAndHide() {

    var currResource = window.localStorage.getItem("currResource");

    if ( (currTabletFunc == 'checkin') || (currTabletFunc == 'checkout') ) {
                
        $("#tabletAssignUsers").val('');
        $("#promptErrorAssignTablet").text("");
        $("#divAssignTablet").modal('hide');
        return;
    }
    
    $("#frmAddResource").each(function () {

        this.reset();

    });

    $("#promptErrorResource").text("");
    $("#divAddResource").modal('hide');

}

function resourceSave(savetype) {

    var func;
    var currResource = window.localStorage.getItem("currResource");

    if (savetype == 'cancel') {
        clearAndHide();
        return;
    }

    var rName     = $("#resourceName").val();
    var rCampus   = $("input[name='resourceCampus']:checked").val();

    var rUnit     = $("#resourceUnits").val();
    var rUnitIdx  = $("#resourceUnits").prop("selectedIndex");
    var rUnitType = $("input[name='rbUnitType']:checked").val();

    var rUser     = $("#resourceUsers").val();
    var rUserIdx  = $("#resourceUsers").prop("selectedIndex");
    var rUserType = $("input[name='rbUserType']:checked").val();
    var rStatus   = "unassigned";
        

    var url       = peSvcUrl + currResource + 's/' + currResourceTblIdx + "/save"
    var httpFunc  = "PUT"; //(currResourceFunc == "add") ? "POST" : "PUT";

    var isValid = true;

    if ( currResource == 'email'  ) {

        if ( _.isEmpty(rName) || _.isEmpty(rCampus) || (rUnitIdx == -1)) {

            isValid = false;
        }
    }

    if ((currResource == 'unit')) {

        if (_.isEmpty(rName) || _.isEmpty(rCampus) || _.isEmpty(rUnitType)) {

            isValid = false;
        }
    }

    if ((currResource == 'user')) {

        if (_.isEmpty(rName) || _.isEmpty(rCampus) || _.isEmpty(rUserType) || (rUnitIdx == -1)) {

            isValid = false;
        }
    }

    if ( currResource == 'tablet') {
    
        if ((currTabletFunc == 'add') || (currTabletFunc == 'edit')) {

            if (_.isEmpty(rName) || _.isEmpty(rCampus) || (rUnitIdx == -1)) {

                isValid = false;
            }
        }

        if ((currTabletFunc == "checkout") || (currTabletFunc == "checkin")) {

            //get data to save from resource table, since not present on add/save form
            var resourceInTable = $("#tblResource").data("#tblResource");
            var theResource     = _.find(resourceInTable, function (aresource) {
                return aresource.tblIdx == currResourceTblIdx;
            });
            
            rCampus = theResource.rCampus;
            rUnit   = theResource.rUnit;
            rName   = theResource.rName;

            url = peSvcUrl + currResource + 's/' + currResourceTblIdx + "/" + currTabletFunc;
            
            if (currTabletFunc == 'checkin') {
                
                rStatus = "unassigned";

            }
            else {
                
                var tabletUserIdx = $("#tabletAssignUsers").prop("selectedIndex");

                if (tabletUserIdx == -1) {
                    $("#promptErrorAssignTablet").text("Please select a user before saving");
                    return;
                }

                var auser = $("#tabletAssignUsers option:selected").val();
                var tabletUser = $("#tabletAssignUsers").val();

                rStatus = tabletUser;
            }
        }

    }
    

    if (isValid == false) {
        $("#promptErrorResource").text("Please enter all fields before saving");
        return;
    }

    clearAndHide();
  
    switch (currResource) {

        case 'email':
            var emailObj = { campus: rCampus,
                             unit: rUnit,
                             emailAddress: rName,
                             tblIdx: currResourceTblIdx
                           };

            invokeSvc(url, httpFunc, emailObj, parseSaveResource);

            break;

        case 'user':
            var userObj = { preferredCampus: rCampus, 
                            preferredUnit: rUnit, 
                            userCwid: rName, 
                            isAdmin: rUserType,
                            tblIdx: currResourceTblIdx
                          };

            invokeSvc(url, httpFunc, userObj, parseSaveResource);

            break;

        case 'unit':
            var UnitObj = { campus: rCampus, 
                            unitName: rName,
                            unitType: rUnitType,
                            tblIdx: currResourceTblIdx
                          };

            invokeSvc(url, httpFunc, UnitObj, parseSaveResource);

            break;

        case 'tablet':
            var tabletObj = { campus: rCampus,
                              unit: rUnit,
                              cwid: rUser,
                              status: rStatus,
                              tabletName: rName,
                              tblIdx: currResourceTblIdx
                            };

            invokeSvc(url, httpFunc, tabletObj, parseSaveResource);

            break;

    }
   
}

function parseSaveResource(data) {

    var currResource = window.localStorage.getItem("currResource");

    if (data.Status != "ok") {

        if (currResource == 'tablet') {
    
            var verb = (currTabletFunc == 'checkout') ? 'assigning' : 'adding';

            showAlert("Error " + verb + " tablet:" + data.ErrMsg, "glyphicon-exclamation-sign", null, '');
            return;
        }

        showAlert("Error " + currResourceFunc + "ing " + currResource + ":" + data.ErrMsg, "glyphicon-exclamation-sign", null, '');

        return;

    }

    $('#divAlertResource').toggle(false);

    var currResource = window.localStorage.getItem("currResource");
    currResource += "s";

    normalizeResources(currResource, data);
    window[currResource] = resources[currResource];
    rebuildResourceTable(window[currResource]);//, "campus");

}

function rebuildResourceTable(data) {

    var xx, campusName, msg;

    var currResource = window.localStorage.getItem("currResource");
    var CurrResource = _.capitalize(currResource);

    //if ( (currResource == 'unit') || (currResource == 'user') ) ncFilter();

    $("#tblResource").empty();
    $("#divAlertResource").hide();
    
    if (currSelectedCampus == "B") {
        campusName = "Both";
        xx = data;
    }
    else {

        campusName = (currSelectedCampus == "E") ? "East" : "West";
        xx = _.filter(data, function (item) { return (item.rCampus == currSelectedCampus) ? true : false });
    }

    if (xx.length == 0) {
        msg = `No ${CurrResource}s defined for ${campusName} campus, add a ${CurrResource}`
        $("#hdrResource").text(msg);
        showAlert(msg, "glyphicon-exclamation-sign", null, '');

        return;
    }

    msg = `${CurrResource}s  allocated on ${campusName} campus`;
    $("#hdrResource").text(msg);

    xx = _.orderBy(xx, ['rCampus', 'rUnit'], ['asc', 'asc']);

    var zz = _.map(xx, function (item) {

        if (currResource == 'tablet') {
        
            item.CheckOut = "checkOut";
            item.CheckIn = "checkIn";

        }

        item.Edit = "edit";
        item.Delete = "delete";


        return item;

    });

    constructTable(zz, $("#tblResource"));

}

function constructHeaderCol(dataTable, key, atrhead) {

    var glyphClass, glyphColor;
    var tableName = dataTable.selector;
    var akey = "";

    switch (key) {

        case "DateUsed": akey            = "Date"; break;
        case "totalCOs": akey            = "Total Checkouts"; break;
        case "totalCIs": akey            = "Total Checkins"; break;
        case "TotalPadsInUse": akey      = "Tablets in Use"; break;
        case "TabletID": akey            = "Tablet ID"; break;
        case "TotalUsageInMinutes": akey = "Time in use (minutes)"; break;
        case "campus": akey              = "Campus"; break;
        case "preferredCampus": akey     = "Campus"; break;
        case "patient": akey             = "Patient"; break;
        case "unit": akey                = "Unit"; break;
        case "preferredUnit": akey       = "Unit"; break;
        case "userCwid": akey            = "CWID"; break;
        case "bed": akey                 = "Bed"; break;
        case "fname": akey               = "First Name"; break;
        case "lname": akey               = "Last Name"; break;
        case "firstName": akey           = "First Name"; break;
        case "lastName": akey            = "Last Name"; break;
        case "checkInTime": akey         = "Check In Time"; break;
        case "checkedInBy": akey         = "Checked In By"; break;
        case "checkOutTime": akey        = "Check Out Time"; break;
        case "checkedOutBy": akey        = "Checked Out By"; break;
        case "iPadTag": akey             = "Tablet ID"; break;
        case "notcheckedIn": akey        = "Checked Out?"; break;
        case "tabName": akey             = "Tablet ID"; break;
        case "discharged": akey          = "Discharged?"; break;
        case "userType": akey            = "User Type"; break;
        case "userName": akey            = "User Name"; break;
        case "unitName": akey            = "Unit Name"; break;
        case "unitType": akey            = "Unit Type"; break;
        case "EmailAddress": akey        = "Email Address"; break;
        case "TabletName": akey          = "Tablet Name"; break;
        case "Status": akey              = "Assigned"; break;
        case "isAdmin": akey             = ""; break;
        case "tblIdx": akey              = ""; break;
        case "idUser": akey              = ""; break;
        case "idUnit": akey              = ""; break;
        case "InOut": akey               = ""; break;
        case "idxInventory": akey        = ""; break;
        case "unitTypeOrig": akey        = ""; break;
        case "rName": akey = '';break;
        case "rCampus": akey = '';break;
        case "rUnit": akey = '';break;
        default: akey                    = key;

    }

    if (akey == "") return "no";

    var direction = dataTable.data(key);

    if (_.isEmpty(direction) == true) {

        //glyphClass = "glyphicon glyphicon-triangle-right";
        //glyphColor = "red";

    } else {

        if (direction == "asc") {

            //glyphClass = "glyphicon glyphicon-triangle-top";
            //glyphColor = "green";

        } else {

            //glyphClass = "glyphicon glyphicon-triangle-bottom";
            //glyphColor = "green";

        }
    }

    var athcol = $("<th>", {
                    text: akey,
                    onclick: "sortColumn('" + tableName + "', '" + key + "')"
                  });

    var aspan = $("<span>", {
                    class: glyphClass,
                    style: "; padding-left: 5px; color: " + glyphColor + ";"
                });

    aspan.appendTo(athcol);
    athcol.appendTo(atrhead);
    return "yes";
}

function constructRowColValue(data, idx, value, key, atr) {

    var atd, aa, aspan;

     var yy = (value == null) ? "" : value;
     var xx = (key == null) ? "" : key;
     var atd = $("<td>");

     switch (xx) {

         case "Delete":
             aa = $("<a>", { href: "#", onclick: "deleteResource(" + data[idx].tblIdx + ")" })
             aspan = $("<span>", { class: "glyphicon glyphicon-trash", style: "color: red; padding-left: 5px;" });
             break;
         case "Edit":
             aa = $("<a>", { href: "#", onclick: "editResource(" + data[idx].tblIdx + ", 'edit')" })
             aspan = $("<span>", { class: "glyphicon glyphicon-pencil", });
             break;
         case "CheckOut":
             if (data[idx].Status == "unassigned") {
                 aa = $("<a>", { href: "#", onclick: "editResource(" + data[idx].tblIdx + ", 'checkout')" })
                 aspan = $("<span>", { class: "glyphicon glyphicon-pencil", });
             } else { atd.text(''); }
             break;
         case "CheckIn":
             if (data[idx].Status != 'unassigned') {
                 aa = $("<a>", { href: "#", onclick: "editResource(" + data[idx].tblIdx + ", 'checkin')" })
                 aspan = $("<span>", { class: "glyphicon glyphicon-pencil", });
             } else { atd.text(''); }
             break;
         default:
             atd.text(yy);
             break;
     }

     if (_.isEmpty(aspan) == false) {
            aspan.appendTo(aa);
            aa.appendTo(atd);
     }

     atd.appendTo(atr);

}

function constructTable(data, dataTable) {

    var akey;

    $("#divAlert").toggle(false);
    dataTable.empty();

    var tableName = dataTable.selector;

    dataTable.data(tableName, data);

    var atrhead = $("<tr>");
    atrhead.css('background-color', 'lightblue');
    var hasCol = [];

    _.forEach(data, function (aresource, idx) {

        var atr = $("<tr>");

        _.forOwn(aresource, function (value, key, item) {

            if (idx == 0) {
                hasCol[key] = constructHeaderCol( dataTable, key, atrhead);
            }

            if ( hasCol[key] == "yes") constructRowColValue(data, idx, value, key, atr);

        })

        if (idx == 0) atrhead.appendTo(dataTable);

        atr.appendTo(dataTable);

    });

}

function changeCampusForAddEdit() {

    var currResource = window.localStorage.getItem("currResource");
    currSelectedCampus = $("input[name=resourceCampus]:checked").val();

    $(`#rbCampuses${currSelectedCampus}`).prop('checked', true);

    //unit resource add/edit does not have a unit listbox
    if ( currResource == "unit") return;

    fillDropdown("units");
    
}

function changeCampuses() {

    //$("#tblActivity").empty();
    //$("#tblCensus").empty();

    //var xx = $(this).prop('id');
    //$("#unitHdr").empty();
    //var rebuildFuncName = "rebuildTable" + _.capitalize(currResource);

    $("#divAlertResource").hide();
    currSelectedCampus = $("input[name=rbCampuses]:checked").val();

    var currResource = window.localStorage.getItem("currResource");
    currResource += "s";

    window[currResource] = resources[currResource];

    rebuildResourceTable( window[currResource] );

}


function fillDropdown(ddType) {

    var currResource = window.localStorage.getItem("currResource");
    var selectedCampus = $("input[name=resourceCampus]:checked").val();
    var ddResource     =  (ddType == 'units') ? $("#resourceUnits") : $("#tabletAssignUsers");
    var ddData         = resources[ddType];
    
    ddResource.empty();
    
    var options = ddResource.prop("options");

    _.each(ddData, function (item) {

        //if (currResource == 'user') {
        //    //new user has no campus        
        //    options[options.length] = new Option(item.rName, item.rName);

        //} else {
            if (item.rCampus == selectedCampus) {

                options[options.length] = new Option(item.rName, item.rName);
            }
     //   }

    });

}

function deleteResource(idx) {
    
    var currResource = window.localStorage.getItem("currResource");
    currResourceTblIdx = idx;

    if (currResource == "tablet") {

        var resourceInTable = $("#tblResource").data("#tblResource");
        var theResource     = _.find(resourceInTable, function (aresource) {
            return aresource.tblIdx == currResourceTblIdx;
        });

        var isAssigned = (theResource.Status == 'unassigned') ? 'no' : 'yes';

        if (isAssigned == 'yes') {

            showAlert('Cannot delete a checked out tablet', "glyphicon-exclamation-sign", "alert-danger", '');
            return;
        }

    }


    var url = peSvcUrl + currResource + "s/" + idx;

    invokeSvc(url, "DELETE", null, parseDeleteResource);

}

function parseDeleteResource(data) {

    var currResource = window.localStorage.getItem("currResource");

    if (data.Status != "ok") {

        showAlert("Error deleting " + currResource + ":" + data.ErrMsg, "glyphicon-exclamation-sign", null, '');

        return;

    }

    currResource += "s";

    normalizeResources(currResource, data);
    window[currResource] = resources[currResource];

    rebuildResourceTable(window[currResource]);//, "campus");

}

function sortColumn(tableName, sortColumn) {

    var table = $(tableName);
    var data = table.data(tableName);

    if (_.isEmpty(data) == true) return;

    var direction = table.data(sortColumn);

    if (_.isEmpty(direction) == true) {

        direction = 'asc';
    } else {

        direction = (direction == 'asc') ? 'desc' : 'asc';
    }

    if (prevSortColumn != "") {

        table.data(prevSortColumn, "")

    }

    prevSortColumn = sortColumn;

    table.data(sortColumn, direction);
    $(tableName + " th > span").attr('class', 'glyphicon glyphicon-triangle-right').css('color', 'red');

    var sortedData = _.sortByOrder(data, [sortColumn], [direction])

    constructTable(sortedData, table);

}
export function showAlert(msg, icon, alertClass, adiv) {

    if (alertClass != null) {

        $('#divAlert' + adiv).removeClass().addClass("alert " + alertClass);

    }

    var adiv = (_.isEmpty(adiv) == true) ? 'Resource' : adiv;

    $("#msgIcon" + adiv).removeClass();
    $("#msgIcon" + adiv).addClass("glyphicon " + icon);
    $("#msgAlert" + adiv).text(msg);

    $('#divAlert' + adiv).toggle(true);

}

function verifyLogin() {

    var rc = true;

    var xx = window.localStorage.getItem('loggedInUserAdmin');


    if (xx == null) {

        console.log('no login');

        rc = false;

    } else {

        loggedInUser = JSON.parse(xx);
        var loginTime = +loggedInUser.loginTime;
        var currTime = new Date().getTime();
        var diff = currTime - loginTime;

        console.log("time after login " + diff);

        if (diff > 300000) {

            console.log("too long after login " + diff);
            rc = false;

        }

        rc = true;
    }

    return rc;
}

function doLogoff() {

    var idxLogin = loggedInUser.idxLogin
    var pcampus = loggedInUser.preferredCampus;
    var punit = loggedInUser.preferredUnit;
    var theuser = loggedInUser.user;

    var url = peSvcUrl + "login/" + idxLogin;

    var o = {
        userName: theuser,
        preferredCampus: pcampus,
        preferredUnit: punit
    };

    invokeSvc(url, "PUT", o, parseLogoffData);

}

function parseLogoffData(data) {

    if (data.Status != "ok") {

        console.log(data.Status + "," + data.ErrMsg);
    }

    window.localStorage.setItem('loggedInUserAdmin', JSON.stringify(loggedInUser));

    window.location.href = window.location.href.substring(0, window.location.href.lastIndexOf("/") + 1) + "login.html";

}

function toggleSidebar(e) {

    e.preventDefault();
    if ($("#sidebar-toggle-img").hasClass("glyphicon glyphicon-arrow-left") == true) {

        var remove = "glyphicon glyphicon-arrow-left";
        var add = "glyphicon glyphicon-arrow-right"
    } else {
        var remove = "glyphicon glyphicon-arrow-right";
        var add = "glyphicon glyphicon-arrow-left"
    }
    $("#sidebar-toggle-img").removeClass(remove);
    $("#sidebar-toggle-img").addClass(add);


    $("#wrapper").toggleClass("toggled");
}

export function invokeSvc(url, op, user, responseFunc) {

    var xx = JSON.stringify(user);

    $.support.cors = true;

    $.ajax(url, {
        type: op,
        contentType: "application/json",
        data: xx,
        success: function (data) {

            responseFunc(data);

        },
        error: function (jqxhr, textstatus, errorthrown) {

            console.log("invoked webapi svc, error: " + textstatus + "," + errorthrown);

            showAlert("Communication error, please try later", "glyphicon-exclamation-sign", "alert-danger", null);

            $("#btnSubmit").button('reset');
            $("#btnSubmit").prop("disabled", false);
            $("#btnSubmit").css("cursor", "pointer");
            //$("#waitForBedInfo").modal('hide');

        }
        //,beforeSend: function () {
        //    console.log("invoke webapi svc, before send");
        //}
        //,complete: function (jqxhr, textstatus) {
        //    console.log("invoked webapi svc, complete: " + textstatus);
        //}
    });

}

//function constructTableOrig(stats, statsTable) {

//    $("#divAlert").toggle(false);
//    statsTable.empty();

//    var tableName = statsTable.selector;

//    statsTable.data(tableName, stats);

//    var atrhead = $("<tr>");
//    atrhead.css('background-color', 'lightblue');

//    _.forEach(stats, function (astat, idx) {

//        var atr = $("<tr>");

//        if ((_.has(astat, 'checkInTime') && astat.checkInTime == null) || (_.has(astat, 'note') && astat.note != ""))
//            atr.css('background-color', 'salmon');

//        if ((_.has(astat, 'discharged') && astat.discharged == "Y"))
//            atr.css('background-color', 'salmon');

//        _.forOwn(astat, function (value, key, item) {

//            if (idx == 0) {

//                var akey;

//                switch (key) {

//                    case "DateUsed":
//                        akey = "Date";
//                        break;
//                    case "totalCOs":
//                        akey = "Total Checkouts";
//                        break;
//                    case "totalCIs":
//                        akey = "Total Checkins";
//                        break;
//                    case "TotalPadsInUse":
//                        akey = "Tablets in Use";
//                        break;
//                    case "TabletID":
//                        akey = "Tablet ID";
//                        break;
//                    case "TotalUsageInMinutes":
//                        akey = "Time in use (minutes)";
//                        break;
//                    case "campus":
//                        akey = "Campus";
//                        break;
//                    case "preferredCampus":
//                        akey = "Campus";
//                        break;
//                    case "patient":
//                        akey = "Patient";
//                        break;
//                    case "unit":
//                        akey = "Unit";
//                        break;
//                    case "preferredUnit":
//                        akey = "Unit";
//                        break;
//                    case "userCwid":
//                        akey = "CWID";
//                        break;
//                    case "bed":
//                        akey = "Bed";
//                        break;
//                    case "fname":
//                        akey = "First Name";
//                        break;
//                    case "lname":
//                        akey = "Last Name";
//                        break;
//                    case "firstName":
//                        akey = "First Name";
//                        break;
//                    case "lastName":
//                        akey = "Last Name";
//                        break;
//                    case "checkInTime":
//                        akey = "Check In Time";
//                        break;
//                    case "checkedInBy":
//                        akey = "Checked In By";
//                        break;
//                    case "checkOutTime":
//                        akey = "Check Out Time";
//                        break;
//                    case "checkedOutBy":
//                        akey = "Checked Out By";
//                        break;
//                    case "iPadTag":
//                        akey = "Tablet ID";
//                        break;
//                    case "notcheckedIn":
//                        akey = "Checked Out?";
//                        break;
//                    case "tabName":
//                        akey = "Tablet ID";
//                        break;
//                    case "discharged":
//                        akey = "Discharged?";
//                        break;
//                    case "userType":
//                        akey = "User Type";
//                        break;
//                    case "userName":
//                        akey = "User Name";
//                        break;
//                    case "unitName":
//                        akey = "Unit Name";
//                        break;
//                    case "unitType":
//                        akey = "Unit Type";
//                        break;
//                    case "EmailAddress":
//                        akey = "Email Address";
//                        break;
//                    case "TabletName":
//                        akey = "Tablet Name";
//                        break;
//                    case "Status":
//                        akey = "Assigned";
//                        break;
//                    case "isAdmin":
//                        akey = "";
//                        break;
//                    case "tblIdx":
//                        akey = "";
//                        break;
//                    case "idUser":
//                        akey = "";
//                        break;
//                    case "idUnit":
//                        akey = "";
//                        break;
//                    case "InOut":
//                        akey = "";
//                        break;
//                    case "idxInventory":
//                        akey = "";
//                        break;
//                    case "unitTypeOrig":
//                        akey = "";
//                        break;

//                    default:
//                        akey = key;

//                }

//                if (akey != "") {

//                    var direction = statsTable.data(key);
//                    var glyphClass, glyphColor;

//                    if (_.isEmpty(direction) == true) {

//                        //glyphClass = "glyphicon glyphicon-triangle-right";
//                        //glyphColor = "red";

//                    } else {

//                        if (direction == "asc") {

//                            //glyphClass = "glyphicon glyphicon-triangle-top";
//                            //glyphColor = "green";

//                        } else {

//                            //glyphClass = "glyphicon glyphicon-triangle-bottom";
//                            //glyphColor = "green";

//                        }
//                    }

//                    var ath = $("<th>", {
//                        text: akey,
//                        onclick: "sortColumn('" + tableName + "', '" + key + "')"
//                    });
//                    var aspan = $("<span>", {
//                        class: glyphClass,
//                        style: "; padding-left: 5px; color: " + glyphColor + ";"
//                    });

//                    aspan.appendTo(ath);
//                    ath.appendTo(atrhead);
//                }

//            }

//            var atd;

//            var yy = (value == null) ? "" : value;
//            var xx = (key == null) ? "" : key;

//            switch (xx) {

//                case "yes":

//                    atd = $("<td>");
//                    var aspan = $("<span>", {
//                        class: "glyphicon glyphicon-remove",
//                        style: "color: red; padding-left: 5px;"
//                    });
//                    aspan.appendTo(atd);
//                    break;

//                case "no":

//                    atd = $("<td>", {
//                        text: "yes"
//                    });
//                    break;

//                    //case "EmailAddress":

//                    //    var Idx = stats[idx].tblIdx;
//                    //    var atd = $("<td>", { id: 'ea' + Idx, text: yy });
//                    //    break;

//                    //case "TabletName":

//                    //    var Idx = stats[idx].tblIdx;
//                    //    var atd = $("<td>", { id: 'ea' + Idx, text: yy });
//                    //    break;

//                    //case "userCwid":

//                    //    var Idx = stats[idx].tblIdx;
//                    //    var atd = $("<td>", { id: 'ea' + Idx, text: yy });
//                    //    break;

//                    //case "userType":

//                    //    var Idx = stats[idx].tblIdx;
//                    //    var atd = $("<td>", { id: 'ut' + Idx, text: yy });
//                    //    break;

//                    //case "campus":

//                    //    var Idx = stats[idx].tblIdx;
//                    //    var atd = $("<td>", { id: 'uc' + Idx, text: yy });
//                    //    break;

//                    //case "unitName":

//                    //    var Idx = stats[idx].tblIdx;
//                    //    var atd = $("<td>", { id: 'un' + Idx, text: yy });
//                    //    break;

//                    //case "unitType":

//                    //    var Idx = stats[idx].tblIdx;
//                    //    var atd = $("<td>", { id: 'ut' + Idx, text: yy });
//                    //    break;

//                case "Delete":

//                    var atd = $("<td>");
//                    var Idx = stats[idx].tblIdx;

//                    var aa = $("<a>", {
//                        href: "#",
//                        onclick: "deleteObj(" + Idx + ")"
//                    })
//                    var aspan = $("<span>", {
//                        class: "glyphicon glyphicon-trash",
//                        style: "color: red; padding-left: 5px;"
//                    });
//                    aspan.appendTo(aa);

//                    aa.appendTo(atd);
//                    atd.appendTo(atr);
//                    break;

//                case "Edit":

//                    var atd = $("<td>");
//                    var Idx = stats[idx].tblIdx;

//                    var aa = $("<a>", {
//                        href: "#",
//                        onclick: "editObj(" + Idx + ")"
//                    })
//                    var aspan = $("<span>", {
//                        class: "glyphicon glyphicon-pencil",
//                    });
//                    aspan.appendTo(aa);

//                    aa.appendTo(atd);
//                    atd.appendTo(atr);
//                    break;

//                case "CheckOut":

//                    if (stats[idx].Status == "unassigned") {

//                        var atd = $("<td>");
//                        var Idx = stats[idx].tblIdx;

//                        var aa = $("<a>", {
//                            href: "#",
//                            onclick: "editObj(" + Idx + ", 'checkout')"
//                        })
//                        var aspan = $("<span>", {
//                            class: "glyphicon glyphicon-pencil",
//                        });

//                        aspan.appendTo(aa);

//                        aa.appendTo(atd);

//                    } else {

//                        atd = $("<td>", {
//                            text: ''
//                        });
//                    }

//                    atd.appendTo(atr);
//                    break;

//                case "CheckIn":

//                    if (stats[idx].Status != 'unassigned') {

//                        var atd = $("<td>");
//                        var Idx = stats[idx].tblIdx;

//                        var aa = $("<a>", {
//                            href: "#",
//                            onclick: "editObj(" + Idx + ", 'checkin')"
//                        })
//                        var aspan = $("<span>", {
//                            class: "glyphicon glyphicon-pencil",
//                        });

//                        aspan.appendTo(aa);
//                        aa.appendTo(atd);

//                    } else {

//                        atd = $("<td>", {
//                            text: ''
//                        });
//                    }

//                    atd.appendTo(atr);

//                    break;

//                case "tblIdx":
//                case "idUser":
//                case "InOut":
//                case "idxInventory":
//                    break;

//                default:

//                    atd = $("<td>", {
//                        text: yy
//                    });
//                    break;
//            }

//            if ((xx != 'idxInventory') && (xx != 'tblIdx') && (xx != 'idUser') && (xx != 'idUnit') && (xx != 'isAdmin') && (xx != 'InOut') && (xx != 'unitTypeOrig')) {

//                atd.appendTo(atr);

//            }

//        })

//        if (idx == 0) atrhead.appendTo(statsTable);

//        atr.appendTo(statsTable);

//    });

//}

// function deleteObj(idx) {

//     currFunc = window.localStorage.getItem("currFunction")

//     deleteResource(idx);

// }

// function editObj(idx, tabletFunc) {

//     editResource(idx, tabletFunc);

// }
//function parseAddTablet(data) {

//    var xx;

//    if (data.Status != "ok") {

//        var verb = (currTabletFunc == 'checkout') ? 'assigning' : 'adding';

//        showAlert("Error " + verb + " tablet:" + data.ErrMsg, "glyphicon-exclamation-sign", null, 'Tablet');

//        return;

//    }

//    rebuildTableTablet(data.Tablets, 'campus');

//}

//function parseAddEmail(data) {

//    var xx;

//    if (data.Status != "ok") {

//        showAlert("Error adding new email:" + data.ErrMsg, "glyphicon-exclamation-sign", null, 'Email');

//        return;

//    }

//    rebuildTableEmail(data.Emails, 'campus');

//}
//function parseAddUser(data) {

//    var xx;

//    if (data.Status != "ok") {

//        showAlert("Error adding new user:" + data.ErrMsg, "glyphicon-exclamation-sign", null, 'User');

//        return;

//    }

//    rebuildTableUser(data.Users, 'campus');

//}

//function parseAddUnit(data) {

//    var xx;

//    if (data.Status != "ok") {

//        showAlert("Error adding new Unit:" + data.ErrMsg, "glyphicon-exclamation-sign", null, 'Unit');

//        return;

//    }

//    rebuildTableUnit(data.Units, 'campus');

//}

//    case "8": //nc admin
//manageResource();
//  $("#manageTablets").click();

//    $("#manageEmails").hide();
//return;
//break;

//    $("#nonclinical").prop("checked", true);
//    nonClinical()

//    break;

//case "4": //admin

//  $("#manageTablets").click();
// return;
// break;
//    //get all units in all campuses
//    getUnits();

//    //$("#manageUnits").on('click', manageUnits);
//    //$("#btnAddUnit").on('click', addUnit);


//    //$("#nonClinical").on('click', nonClinical);

//    $("#divEmails").hide();
//    $("#divTabletsNC").hide();
//    $("#divUsers").hide();
//    $("#divStats").hide();
//    //$("#rbsTypes").hide();
//    //$("#rbsUnits").hide();
//    //$("#frmDates").hide();
//    //var end = moment();
//    //var start = moment().subtract(1, 'months');
//    //var sstart = moment(start).format('YYYY-MM-DD')
//    //var send = moment(end).format('YYYY-MM-DD')

//    //$("#startdate").val(sstart)
//    //$("#enddate").val(send)

//    //get all units in all campuses
//    break;

//}
//$("#usageStats").on('click', usageStats);
//$('input[type=radio][name=adminType]').on('change', nonClinical);
// $("#btnAddTablet").on('click', addTablet);
// $("#btnAddEmail").on('click', addEmail);
// $("#btnAddUser").on('click', addUser);
// $("#btnAddUnit").on('click', addUnit);

//function activateCampus(activeListGroup, inactiveListGroup, label, units) {

//    $(activeListGroup).toggle(true);
//    $(inactiveListGroup).toggle(false);
//    $(label).addClass('active');
//    $(inactiveListGroup).empty();
//    $(activeListGroup).empty();

//    var unitsList = $(activeListGroup);

//    //rebuild list of units
//    $.each(units, function (idx, aunit) {

//        var li = $('<li/>')
//            .addClass('list-group-item')
//            .appendTo(unitsList);

//        var a = $('<a/>', {
//            id: "u" + aunit.idUnit,
//            text: aunit.unitName,
//            href: "#"

//        });

//        a.bind('click', unitClicked).appendTo(li);

//    });

//}