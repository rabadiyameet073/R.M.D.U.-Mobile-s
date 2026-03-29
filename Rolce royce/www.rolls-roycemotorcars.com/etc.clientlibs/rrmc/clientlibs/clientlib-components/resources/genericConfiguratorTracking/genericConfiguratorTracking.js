// last build:2024-02-28T06:28:19.735Z
// TRON TRACKING LIBRARY START
//*** start TRON.js ***
//*** start errorTracking.js ***

//Variable to determine if the eventlistner has to be loaded on the page or not
window.TRON = window.TRON || {};
window.TRON.warningCode = [];
//Error Tracking - for any error intercepted detect if its tron related error and then push those details to ACDL
if (!TRON.isInitialized) {
    window.TRON.customConsole;
    (function () {
        // Determine if debug mode is enabled
        function determineDebugMode() {
            return gFFWNV([
                () => document.location.search.indexOf("trondebug=true") != -1,
                () => sessionStorage.getItem('tronDebug') != null && (sessionStorage.getItem('tronDebug') === 'true')
            ]);
            //return ((document.location.search.indexOf("trondebug=true") != -1) || (sessionStorage.getItem('tronDebug') != null && (sessionStorage.getItem('tronDebug') === 'true')));
        }

        // error data pushed to ACDL
        function handleError(errorCode, errorMessage) {
            window.adobeDataLayer = window.adobeDataLayer || [];

            let componentTemplate = TRON.dataComponent;

            componentTemplate[0].componentInfo.componentID = `${gFFWNV([ //brand
                () => adobeDataLayer.getState('page.attributes.brand'),
                () => determineBrand()
            ]) || ""}/${gFFWNV([ //geoRegion
                () => adobeDataLayer.getState('page.pageInfo.geoRegion'),
                () => window.location.href.split('country=')[1].split('&')[0],
                () => window.location.href.split('country_origin=')[1].split('&')[0],
                () => (window.location.host.indexOf('bmwusa') > -1) ? "US" : "",
            ]) || ""}_${gFFWNV([ //language
                () => adobeDataLayer.getState('page.pageInfo.language'),
                () => (window.location.host.indexOf('bmwusa') > -1) ? "en" : ""
            ]) || ""}/${componentTemplate[0].componentInfo.componentName}` //componentName


            //check the prefix
            // *** start eventHandlerPrefix.js ***

var prefixVariable = (typeof prefix != "undefined") ? prefix : TRON.prefix;;
//check the prefix
var determinPrimaryCategory = {
    'con >': 'configurator',
    'stock >': 'stock locator',
    'sales >': 'sales',
    'fin >': 'finance',
    'rent >': 'rental'
};


var obj = (typeof this != "undefined" && this.message && this.message.component) ? this.message.component : (TRON.dataComponent || {});
var compVar = (obj || [])[0] || {};
var primaryCategory = (typeof determinPrimaryCategory[prefixVariable] != "undefined") ? determinPrimaryCategory[prefixVariable] : ((compVar.category || {}).primaryCategory || '');

//check the fallback
if (primaryCategory == '' || prefixVariable == 'shared > ' || prefixVariable == "local > ") {
    var domains = ['.bmw.', '.mini.', '.bmw-motorrad.', '.bmwusa.com', 'customer.bmwgroup.com', 'rolls-roycemotorcars.com', 'tron.bmwgroup.com'];
    var match = domains.some(domain => window.location.href.includes(domain));
    if (match) {
        var host = location.host;
        var componentSubCategory1 = host.split(".")[1];
        var subdomain = host.split(".")[0];
        var host = location.host;
        var domainName = host.split(".")[1];
        var path = location.pathname;
        var languageMarket = path.split("/")[1];
        var languageMarketLength = languageMarket.length;
        if (host.split(".")[2] === "com" && domainName === "bmw" && languageMarketLength === 2) {
            primaryCategory = "special website";
            prefixVariable = "special > "
        } else if (domainName === "bmw" || domainName === "mini" || domainName === "bmw-motorrad" ||
            domainName === "bmwusa" || domainName === "rolls-roycemotorcars" || (domainName === "bmwgroup" && subdomain === "customer") || (domainName === "bmwgroup" && subdomain === "tron")) {
            primaryCategory = "nsc website";
            prefixVariable = "nsc > "
        } else {
            primaryCategory = "special website";
            prefixVariable = "special > "
        }
    } else {
        primaryCategory = "special website";
        prefixVariable = "special > ";
    }
}

if (typeof prefix != "undefined") {
    prefix = prefixVariable;
}

if (typeof TRON.prefix != "undefined") {
    TRON.prefix = prefixVariable;
}
// *** end eventHandlerPrefix.js ***

            //update component
            let compObj = {};
            let componentKey = "";
            if (typeof componentTemplate != "undefined") {
                componentTemplate[0].category.primaryCategory = primaryCategory;
                componentKey = componentTemplate[0].componentInfo.componentID
                compObj[componentKey] = componentTemplate[0]
            }

            var versionName = TRON.version;
            versionName = versionName.split('Â¦');
            if (errorCode.indexOf('e0') > -1) {
                versionName[versionName.length - 1] = "error_" + versionName[versionName.length - 1]
            } else if (errorCode.indexOf('w0') > -1) {
                versionName[versionName.length - 1] = "warning_" + versionName[versionName.length - 1]
            }
            versionName = versionName.join('Â¦');

            var objectError = {
                'component': compObj,
                'version': versionName,
                "event": "tron event",
                "eventInfo": {
                    "cause": "TRON implementation > " + ((TRON || "").currentEventName || ""),
                    "effect": (TRON.prefix) + errorMessage,
                    "eventAction": "trigger tron function",
                    "eventName": "error",
                    "eventPoints": 0,
                    "timeStamp": new Date().getTime(),
                    "type": "frontend component",
                    "category": {
                        "primaryCategory": ((TRON || "").componentName || ""),
                        "subCategory1": errorCode,
                        "subCategory2": "TRON library"
                    },
                    "reference": {
                        "linkedComponent": [componentKey]
                    }
                }
            };

            var productTemplate = {};
            var productReferences = [];
            var productReferences2 = [];

            var capturedProductsFromDataLayer = [];

            // if (typeof window.adobeDataLayer != "undefined" && typeof window.adobeDataLayer.getState != "undefined" && typeof window.adobeDataLayer.getState('product') != "undefined") {
            //     capturedProductsFromDataLayer = Object.keys(adobeDataLayer.getState('product')).map(function (key) {
            //         return adobeDataLayer.getState('product')[key];
            //     });
            // }

            if (capturedProductsFromDataLayer.length > 0 && typeof capturedProductsFromDataLayer != 'string') {
                for (var i in capturedProductsFromDataLayer) {
                    if (typeof capturedProductsFromDataLayer[i] != 'undefined' && typeof capturedProductsFromDataLayer[i].productInfo != 'undefined') {
                        var productKey = capturedProductsFromDataLayer[i].productInfo.productID;
                        if (typeof productKey == "undefined") {
                            productKey = 'product' + (i + 1);
                        }
                        productTemplate[productKey] = capturedProductsFromDataLayer[i];
                        if (typeof capturedProductsFromDataLayer[i].category.primaryCategory != 'undefined' && (capturedProductsFromDataLayer[i].category.primaryCategory.indexOf('car') > -1 || capturedProductsFromDataLayer[i].category.primaryCategory.indexOf('bike') > -1)) {
                            productReferences2.push(productKey);
                        }
                    }
                }
                Object.keys(productTemplate).forEach(key => productReferences.push(key));
                objectError.product = productTemplate;
            }

            var dealerTemplate = {};
            var dealerReferences = {};
            var capturedDealerFromDataLayer = [];

            if (typeof window.adobeDataLayer != "undefined" && typeof window.adobeDataLayer.getState != "undefined" && typeof window.adobeDataLayer.getState('dealer') != "undefined") {
                capturedDealerFromDataLayer = Object.keys(adobeDataLayer.getState('dealer')).map(function (key) {
                    return adobeDataLayer.getState('dealer')[key];
                });
            }

            if (capturedDealerFromDataLayer.length > 0 && typeof capturedDealerFromDataLayer != 'string') {
                for (var i in capturedDealerFromDataLayer) {
                    if (typeof capturedDealerFromDataLayer[i] != 'undefined' && typeof capturedDealerFromDataLayer[i].dealerInfo != 'undefined') {
                        var dealerKey = capturedDealerFromDataLayer[i].dealerInfo.dealerOutletBuno;
                        dealerTemplate[dealerKey] = capturedDealerFromDataLayer[i];
                    }
                }
                Object.keys(dealerTemplate).forEach(key => dealerReferences[key] = "");
                objectError.dealer = dealerTemplate;
            }

            if (typeof window.adobeDataLayer != "undefined" && typeof window.adobeDataLayer.getState != "undefined" && typeof window.adobeDataLayer.getState('user') != "undefined") {
                var users = window.adobeDataLayer.getState('user');
                if (typeof users != "undefined" && Object.keys(users).length > 0) {
                    objectError.user = users;
                }
            }

            if (errorCode.indexOf("w0") > -1) {
                window.TRON.warningCode.push(objectError);
            } else {
                window.adobeDataLayer.push(objectError);
            }
        }

        // Custom console object
        TRON.customConsole = {
            error: function () {
                var errorMessage = "";
                var flagValue = false;
                for (var i = 0; i < arguments.length; i++) {
                    if (typeof arguments[i] == "number" || typeof arguments[i] == "string") {
                        errorMessage += arguments[i] + " ";
                    } else {
                        errorMessage += JSON.stringify(arguments[i]) + " ";
                    }
                }
                errorMessage = errorMessage.split(' ').filter(word => word).join(' ');

                if (errorMessage.indexOf('Incorrect TRON implementation: â›” ') > -1) {
                    flagValue = true;
                    var errorMessageBe = errorMessage.split("Incorrect TRON implementation: â›” ")[1];
                    var errorTypes = {
                        "e001": "parameter is missing", //mandatory parameter is missing 
                        "e002": "value is incorrect", //mandatory parameter value is incorrect
                        "e003": "value is empty", //mandatory parameter value is empty
                        //"e004": "does not exist" //function does not exist
                    }

                    var errorCode = Object.entries(errorTypes).find(([key, value]) => errorMessageBe.includes(value));
                    if (errorCode) {
                        errorCode = errorCode[0];
                    } else {
                        errorCode = "Unknown error";
                    }

                    handleError(errorCode, errorMessageBe);
                }

                if (flagValue) {
                    if (determineDebugMode()) {
                        console.error.apply(console, arguments);
                    }
                } else {
                    console.error.apply(console, arguments);
                }
            },
            info: function () {
                var infoMessage = "";
                var flagValue = false;
                for (var i = 0; i < arguments.length; i++) {
                    if (typeof arguments[i] === "number" || typeof arguments[i] === "string") {
                        infoMessage += arguments[i] + " ";
                    } else {
                        infoMessage += JSON.stringify(arguments[i]) + " ";
                    }
                }
                infoMessage = infoMessage.split(' ').filter(word => word).join(' ');

                if (infoMessage.indexOf('TEST check available events') > -1 || infoMessage.indexOf('Incorrect TRON implementation: âš ï¸') > -1) {
                    flagValue = true;
                }

                if (flagValue) {
                    if (determineDebugMode()) {
                        console.info.apply(console, arguments);
                    }
                } else {
                    console.info.apply(console, arguments);
                }
            },
            warn: function () {
                var warningMessage = "";
                var flagValue = false;
                for (var i = 0; i < arguments.length; i++) {
                    if (typeof arguments[i] === "number" || typeof arguments[i] === "string") {
                        warningMessage += arguments[i] + " ";
                    } else {
                        warningMessage += JSON.stringify(arguments[i]) + " ";
                    }
                }
                warningMessage = warningMessage.split(' ').filter(word => word).join(' ');

                if (warningMessage.indexOf('Incorrect TRON implementation: âš ï¸ ') > -1) {
                    flagValue = true;
                    var errorMessageBe = warningMessage.split("Incorrect TRON implementation: âš ï¸ ")[1];
                    var errorTypes = {
                        "w002": "value is incorrect" //optional parameter value is incorrect
                    }

                    var errorCode = Object.entries(errorTypes).find(([key, value]) => errorMessageBe.includes(value));
                    if (errorCode) {
                        errorCode = errorCode[0];
                    } else {
                        errorCode = "Unknown error";
                    }

                    if (errorCode != "Unknown error") {
                        handleError(errorCode, errorMessageBe);
                    }
                }

                if (flagValue) {
                    if (determineDebugMode()) {
                        console.warn.apply(console, arguments);
                    }
                } else {
                    console.warn.apply(console, arguments);
                }
            }
        };
    })();
}
//*** end errorTracking.js ***
const PROJECT_SPECIFIC_DATA = {
    'customeEventName': 'TRON: generic configurator',
    'libraryName': 'generic_configurator',
    'libraryVersion': '_v3.1.2',
    'prefix': 'con > ',
    'pageExist': true, //Always Set to True. If removed no page information is captured
    'vehicle': {
        'productType': '',
        'primaryCategory': '',
        'subCategory1': '',
    },
    'options': {
        'productType': '',
        'primaryCategory': '',
    },
}

export default class {
    // ************************
    // * configuration        *
    // ************************
    constructor() {
        this.detectDebugMode();
        this._TronVersion = "5.9.0";

        // config.js
const config = {
  library: function (scope) {
    scope.genericEventName = 'TRON: adobeDataLayer generic event listener';
    scope.customEventName = PROJECT_SPECIFIC_DATA.customeEventName;

    scope._componentTrackingVersion = PROJECT_SPECIFIC_DATA.libraryName + "" + PROJECT_SPECIFIC_DATA.libraryVersion;
    scope.version = `TRON_${scope._TronVersion}__${scope._componentTrackingVersion}`;
  },

  defaults: function (scope) {
    // base configuration of component
    scope.component = {
      category: {
        componentType: 'standalone', // hard coded for all events
        primaryCategory: 'configurator', // hard coded for all events
        subCategory1: '' // hard coded for all events
      },
      attributes: {
        touchpoint: 'web', // hard coded values for all events
      }
    };

    // defaults for event object
    scope.baseEvent = {
      eventInfo: {
        cause: "default", //value might be overwritten by value specified in event below
        effect: "na", //value will be overwritten by value specified in event below
        eventAction: "internal click", //value might be overwritten by value specified in event below
        eventName: "interaction", //value might be overwritten by value specified in event below
        eventPoints: 0, //value might be overwritten by value specified in event below
        type: "ux", //value might be overwritten by value specified in event below
      },
      category: {},
      attributes: {}
    }

    scope.page = {
      category: {},
      pageInfo: {
        pageName: "tbd",
      },
      attributes: {}
    }

// ****************************************
// * PROJECT PARAMETERS FOR ALL FUNCTIONS *
// ****************************************
    scope.errorMandatoryData = ['componentName', 'componentSubCat1',];// only add non-error parameters that are mandatory also at error event eg. componentName
    scope.baseMandatoryData = ['componentName', 'componentSubCat1']; 
    scope.baseOptionalData = ['componentDEVagency','componentVersion',
//total price
'totalCurrency','totalPaymentMethod','totalShippingCost','totalTaxAmountAdditional','totalDiscountAmountAdditional',
'totalBasePrice','totalDiscountAmount','totalTaxAmount','totalPriceWithTax','totalFinalPrice',
]; 
scope.productMandatoryData = []
scope.productOptionalData = [
  //vehicle
  'vehicle[n].bodyType','vehicle[n].businessDivision','vehicle[n].category1','vehicle[n].category2','vehicle[n].category3','vehicle[n].codeAG','vehicle[n].codeVG','vehicle[n].color','vehicle[n].encVIN','vehicle[n].engine','vehicle[n].fuelType', 'vehicle[n].gearing','vehicle[n].hybridVersion','vehicle[n].manufacturer','vehicle[n].name','vehicle[n].packageID', 'vehicle[n].primaryCategory','vehicle[n].productID','vehicle[n].range', 'vehicle[n].salesModel', 'vehicle[n].series', 'vehicle[n].status', 'vehicle[n].subSeries','vehicle[n].linkedDealerCount', 'vehicle[n].linkedDealerOutletBuno',
  //vehicle price
  'vehicle[n].itemBasePrice', 'vehicle[n].itemDiscountOtherAmount','vehicle[n].itemDiscountSalesAmount','vehicle[n].itemPriceWithTax','vehicle[n].itemQuantity','vehicle[n].itemShippingMethod', 'vehicle[n].itemTaxAmount', 'vehicle[n].itemVoucherCode', 
  //options
  'options[n].businessDivision','options[n].category1', 'options[n].category2','options[n].category3','options[n].codeVG','options[n].color',
  'options[n].manufacturer','options[n].name','options[n].packageID','options[n].primaryCategory','options[n].productID','options[n].range','options[n].salesModel','options[n].size','options[n].status','options[n].finDownPayment','options[n].finMileage','options[n].finMonthlyPayment','options[n].finTerm','options[n].linkedDealerCount','options[n].linkedDealerOutletBuno',
  // options price
  'options[n].itemBasePrice','options[n].itemDiscountOtherAmount','options[n].itemDiscountSalesAmount','options[n].itemPriceWithTax','options[n].itemQuantity','options[n].itemShippingMethod','options[n].itemTaxAmount','options[n].itemVoucherCode'
  ]

// **************************
// * PROJECT ALLOWED VALUES *
// **************************
    scope.allowedPageSubCat1 = ['accessories','car hood graphics','charging','colors','engine','interior trims','interior worlds','lines / trims','options','packages','roof and mirror caps','upholstery','wheels','winter wheels'];
    scope.allowedComponentNames = ['con','boutique'];
    scope.allowedComponentSubCat1 = ['new car configurator', 'new bike configurator', 'accessory configurator'];
    scope.allowedPageSubCat1 = ['accessories', 'car hood graphics', 'charging', 'colors', 'engine', 'interior trims', 'interior worlds', 'lines / trims', 'options', 'packages', 'roof and mirror caps', 'upholstery', 'wheels', 'winter wheels', 'standard equipment', 'summary', 'other'];
    scope.allowedPageName = ['summary', 'configure']

    // *** start allowedValuesComponents.js ***

// *****************************
// * ALLOWED VALUES: COMPONENT *
// *****************************

// scope.allowedComponentNames will always be defined project specific in the config.js
scope.allowedComponentTypes = ['standalone', 'native in-page', 'standalone iframe', 'in-page iframe' ];
scope.allowedComponentPlatform = ['aem > central', 'aem > local', 'non-aem > central'  , 'non-aem > local', 'aem', 'non-aem', 'local' , 'central'];

// *** end allowedValuesComponents.js ***
    // *** start allowedValuesPages.js ***

// ************************
// * ALLOWED VALUES: PAGE *
// ************************

scope.allowedPageBrand = ["bmw", "mini", "motorrad", "bmw group", "alphera", "rolls-royce", "alphabet"];
scope.allowedPageVariant = ["real page", "virtual page"];
scope.allowedUserLoginStatus = ['logged in', 'not logged in'];
scope.allowedPageGeoRegion = ["country code should be two letters ISO 3166 Alpha-2 country code or 'global'"];
scope.allowedPageLanguage = ["language code should follow ISO standard of 2 letters in lowercase"];
scope.allowedPageSysEnv = ['dev', 'int', 'prod', 'test', 'staging', 'preprod'];

// *** end allowedValuesPages.js ***
    // *** start allowedValuesClicks.js ***

scope.allowedListTypes = ['wish list', 'compare list'];
scope.allowedViewModes = ['360', '3d'];
scope.allowedViewTypes = ['exterior', 'interior'];
scope.allowedViewDayTimes = ['day', 'night'];
scope.allowedViewScreens = ['full screen', 'default screen'];
scope.allowedViewPerspectives = ['rear', 'roof', 'side', 'front'];
scope.allowedEventEffectGeneric = ['360', '3d','exterior', 'interior','day', 'night','full screen', 'default screen','rear', 'roof', 'side', 'front', 'rotate', 'close doors', 'lights off', 'lights on', 'open doors', 'open roof', 'close roof', 'image background', 'close view'];

// *** end allowedValuesClicks.js ***
    // *** start allowedValuesVehicles.js ***

// ***********************************
// * ALLOWED VALUES: PRODUCT VEHICLE *
// ***********************************

var variable = (typeof scope != 'undefined') ? scope : this;
variable.allowedVehicleBodyType = ['ca', 'hb', 'ko', 'co', 'cp', 'li', 'mp', 'ro', 'sc', 'st', 'gf', 'hc', 'sh', 'to', 'gs', 'ga', 'x', 'xr', 'gt', 'gl', 'r', 'rs', 'rr', 'rt', '9p', '9s', '9u', 'b', 's', '9t', 'rrmc'];
variable.allowedVehicleBusinessDivision = ['new vehicle', 'used vehicle', 'after sales', 'other'];
variable.allowedVehicleCategory1 = ['build to order', 'pre-order', 'build to stock', 'young used car', 'demonstration car', 'young used bike', 'demonstration bike','used car (excl. yuc)', 'used bike (excl. yub)', 'used (excl. yub)', 'young used', 'demonstration'];
variable.allowedVehicleFuelType = ['b', 'o', 'd', 'e', 'g', 'h', 'm', 't', 'x', 'y', 'z', 'rrmc'];
variable.allowedVehicleHybridVersion = ['beve', 'erex', 'hybr','phev', 'nohy', 'rrmc'];
variable.allowedVehiclePrimaryCategory = ['new car', 'used car', 'used bike', 'new bike', 'rental bike', 'rental car', 'owned bike', 'owned car'];
variable.allowedVehicleSeries = ['1', '2', '3', '4', '5', '6', '7', '8', 'x', 'i', 'm', 'z', 'clubman', '5-doors', '3-doors', 'cabrio', 'countryman', 'ad', 'gs', 'he', 'lt', 'ms', 'na', 'sp', 'mini', 'rrmc'];
variable.allowedVehicleStatus = ['available for sale', 'sold out','order confirmed', 'pre-order confirmed','contract concluded','vehicle delivered', 'vehicle mapped', 'added item', 'removed item', 'automatically added item', 'automatically removed item','canceled', 'reservation confirmed', 'received', 'in production', 'ready', 'for delivery', 'delivered'];
variable.allowedVehiclecodeAG = ["value should contain only 4 characters"];
variable.allowedVehiclecodeVG = ["value should contain only 4 characters"];
variable.allowedVehicleSalesModel = ["indirect sales", "direct sales b2b", "direct sales b2c", "direct sales"];
variable.allowedVehiclelinkedDealerCount = ["value should be numeric"];

// *** end allowedValuesVehicles.js ***
    // *** start allowedValuesOptions.js ***

// **********************************
// * VALUE CHECKS: PRODUCT - OPTION *
// **********************************

scope.allowedOptionsBusinessDivision = ['new vehicle', 'used vehicle', 'after sales', 'other'];
scope.allowedOptionsPrimaryCategory = ['finance'];
scope.allowedOptionsCategory1 = ['accessories', 'car hood graphics', 'charging', 'colors', 'engine', 'interior trims', 'interior worlds', 'lines / trims', 'options', 'packages', 'roof and mirror caps', 'upholstery', 'wheels', 'winter wheels', 'standard equipment','loan', 'lease','physical goods', 'digital services', 'safety training', 'bmw m nordschleife pro', 'bmw m race track', 'bmw m training', 'bmw m nordschleife tech workshop', 'bmw m race track plus', 'bmw m race track training compact', 'bmw m gt', 'bmw tour experience', 'bmw professional safety experience', 'bmw sondertraining', 'bmw m nordschleife', 'bmw snow & ice experience', 'bmw m product experience', 'm race track training', 'bmw m trackday'];
scope.allowedOptionsFinDownPayment = ['value should be numeric'];
scope.allowedOptionsFinMileage = ['value should be numeric'];
scope.allowedOptionsFinMonthlyPayment = ['value should be numeric'];
scope.allowedOptionsFinTerm = ['value should be numeric'];
scope.allowedOptionsStatus = ['added item', 'removed item', 'automatically added item', 'automatically removed item', 'product available','service already booked', 'service renewable', 'service available', 'service expiring', 'service booked unlimited', 'product sold out'];
scope.allowedOptionscodeVG = ["value should contain only 4 characters"];
scope.allowedOptionslinkedDealerCount = ["value should be numeric"];
// *** end allowedValuesOptions.js ***

    //*** start allowedValuesPrice.js ***

// *****************************************
// * ALLOWED VALUES: PRODUCT VEHICLE PRICE *
// *****************************************
var variable = (typeof scope != 'undefined') ? scope : this;
variable.allowedVehicleItemBasePrice = ["value should be numeric"];
variable.allowedVehicleItemDiscountAmount = ["value should be numeric"];
variable.allowedVehicleItemPriceWithTax = ["value should be numeric"];
variable.allowedVehicleItemQuantity = ["value should be numeric"];
variable.allowedVehicleItemTaxAmount = ["value should be numeric"];
variable.allowedVehicleItemDiscountOtherAmount = ["value should be numeric"];
variable.allowedVehicleItemDiscountSalesAmount = ["value should be numeric"];

// ****************************************
// * ALLOWED VALUES: PRODUCT OPTION PRICE *
// ****************************************
variable.allowedOptionsItemBasePrice = ['value should be numeric'];
variable.allowedOptionsItemDiscountAmount = ['value should be numeric'];
variable.allowedOptionsItemPriceWithTax = ['value should be numeric'];
variable.allowedOptionsItemQuantity = ['value should be numeric'];
variable.allowedOptionsItemTaxAmount = ['value should be numeric'];
variable.allowedOptionsItemDiscountOtherAmount = ['value should be numeric'];
variable.allowedOptionsItemDiscountSalesAmount = ['value should be numeric'];

// *******************************
// * ALLOWED VALUES: TOTAL PRICE *
// *******************************
variable.allowedTotalBasePrice = ['value should be numeric'];
variable.allowedTotalDiscountAmount = ['value should be numeric'];
variable.allowedTotalFinalPrice = ['value should be numeric'];
variable.allowedTotalPriceWithTax = ['value should be numeric'];
variable.allowedTotalShippingCost = ['value should be numeric'];
variable.allowedTotalTaxAmount = ['value should be numeric'];
variable.allowedTotalCurrency = ['value shoud be ISO 3-letter currency code all upper case'];
variable.allowedTotalTaxAmountAdditional = ['value should be numeric'];
variable.allowedTotalDiscountAmountAdditional = ['value should be numeric'];
//*** end allowedValuesPrice.js ***

  },

  events: function (scope) {
    if (!scope.events) {
      scope.events = {};
    }
    const functionPrefix = "con"
    scope.events = Object.assign(scope.events, {
    [(functionPrefix + "PageLoad").replace(/^(.)(.*)$/, (match, firstChar, restOfString) => firstChar.toLowerCase() + restOfString)]: {
    event: {
        eventInfo: Object.assign({}, JSON.parse(JSON.stringify(scope.baseEvent.eventInfo)), {
            effect: "page shown ", // actual effect is defined in eventHandler
            eventName: "page view",
            cause: "automatic",
            eventAction: "page load"
        })
    },
    page: {
        category: Object.assign({}, JSON.parse(JSON.stringify(scope.page.category)), {
            pageType: "overview",
        }),
        pageInfo: Object.assign({}, JSON.parse(JSON.stringify(scope.page.pageInfo)), {
            pageName: "tbd", // provided as dynamic data in mandatory parameter
            variant: "real page"
        })
    },
    mandatoryData: scope.errorMandatoryData.filter(v => !['pageType','pageBrand', 'pageGeoRegion', 'pageLanguage', 'pageName'].includes(v)).concat(['pageBrand', 'pageGeoRegion', 'pageLanguage', 'pageName']),
    optionalData: scope.baseMandatoryData.filter(v => !(['pageType','pageBrand', 'pageGeoRegion', 'pageLanguage', 'pageName'].concat(scope.errorMandatoryData).includes(v))).concat(scope.baseOptionalData.filter(v => !(['componentDEVagency', 'formID'].concat(scope.errorMandatoryData).includes(v)))).concat(scope.productMandatoryData, scope.productOptionalData, ['pageSubCat1', 'pageSubCat2', 'pageSubCat3', 'pageVariant', 'pageSysEnv', 'pageVersion', 'componentDEVagency', 'pageType']),
    description: `Only trigger this event if the page is on a standalone page that doesn't have Adobe Analytics page view tracking implemented yet.Don't trigger this event if the page is integrated on a website of the AEM or any website that already has Adobe Analytics page view tracking included.
    <br> If you trigger this function, make sure to always trigger the "page load" function first before any other TRON functions on the page. This way, we can get the right information and calculate things correctly. It's like setting the groundwork for everything else. It should be triggered automatically upon page load before DOM ready.
        <br><ul>
            <li><b>'componentDEVagency'</b> is used to capture the name of the agency that developed the page and implemented the analytics tracking of it</li>
            <li><b>'pageBrand'</b> is used to capture the brand eg. "bmw", "mini", etc. If the page is showing content that's valid for multiple bmw group brands pass the value "bmw group" </li>
            <li><b>'pageGeoRegion'</b> is used to capture the country code as two letters iso 3166 alpha-2 country code all upper case. In case the page is used by more than one market pass "global"</li>
            <li><b>'pageLanguage'</b> is used to capture the language code in iso standard of 2 letters and lowercase;</li>
            <li><b>'pageName'</b> is used to capture the page name, which is the most granular page value.</li>
            <li><b>'pageSubCat1'</b> can be set to group the page names. Hierarchy is componentName ( =page primary category) > 'pageSubCat3' > 'pageSubCat2' > 'pageSubCat1' > 'pageName' </li>
            <li><b>'pageSubCat2'</b> can be set to group the page sub categories 1. Hierarchy is componentName ( =page primary category) > 'pageSubCat3' > 'pageSubCat2' > 'pageSubCat1' > 'pageName'</li>
            <li><b>'pageSubCat3'</b> can be set to group the page sub categories 2. Hierarchy is componentName ( =page primary category) > 'pageSubCat3' > 'pageSubCat2' > 'pageSubCat1' > 'pageName'</li>
            <li><b>'pageSysEnv'</b> is used to capture the environment eg. "dev", "prod" etc. </li>
            <li><b>'pageType'</b> is used to capture the page template type.</li>
            <li><b>'pageVariant'</b> is used to capture the  if the page is a "virtual page". If it's a real page you don't have to set this parameter</li>
            <li><b>'pageVersion'</b> is used to capture the page code changes. Any semantic is welcome. Could also be the time stamp of last build. </li>
        </ul>`
},




[(functionPrefix + "PageLoadError").replace(/^(.)(.*)$/, (match, firstChar, restOfString) => firstChar.toLowerCase() + restOfString)]: {
    event: {
        eventInfo: Object.assign({}, JSON.parse(JSON.stringify(scope.baseEvent.eventInfo)), {
            effect: "page shown ", // actual effect is defined in eventHandler
            eventName: "page view",
            cause: "automatic",
            eventAction: "page load"
        })
    },
    page: {
        pageInfo: Object.assign({}, JSON.parse(JSON.stringify(scope.page.pageInfo)), {
            pageName: "tbd", // provided as dynamic data in mandatory parameter
            variant: "real page"
        })
    },
    mandatoryData: scope.errorMandatoryData.filter(v => !['pageType','pageBrand', 'pageGeoRegion', 'pageLanguage', 'pageName'].includes(v)).concat(['pageBrand', 'pageGeoRegion', 'pageLanguage', 'pageName','pageType']),
    optionalData: scope.baseMandatoryData.filter(v => !(['pageBrand', 'pageGeoRegion', 'pageLanguage', 'pageName',].concat(scope.errorMandatoryData).includes(v))).concat(scope.baseOptionalData.filter(v => !(['componentDEVagency', 'formID','pageType'].concat(scope.errorMandatoryData).includes(v)))).concat(scope.productMandatoryData, scope.productOptionalData, ['pageSubCat1', 'pageSubCat2', 'pageSubCat3', 'pageVariant', 'pageSysEnv', 'pageVersion', 'componentDEVagency',]),
    description: `Only trigger this event if the page is on a standalone page that doesn't have Adobe Analytics page view tracking implemented yet.Don't trigger this event if the page is integrated on a website of the AEM or any website that already has Adobe Analytics page view tracking included.
    <br> If you trigger this function, make sure to always trigger the "page load" function first before any other TRON functions on the page. This way, we can get the right information and calculate things correctly. It's like setting the groundwork for everything else. It should be triggered automatically upon page load before DOM ready.
        <br><ul>
            <li><b>'pageName'</b> the page name should contain the string value "error".
            <li><b>'pageType'</b> please proivde "error" for any error pages except of the "page not found" error page. For 404 page not found error pages the page type must be "error 404".
            <li><b>'pageBrand'</b> is used to capture the brand eg. "bmw", "mini", etc. If the page is showing content that's valid for multiple bmw group brands pass the value "bmw group" </li>
            <li><b>'pageGeoRegion'</b> is used to capture the country code as two letters iso 3166 alpha-2 country code all upper case. In case the page is used by more than one market pass "global"</li>
            <li><b>'pageLanguage'</b> is used to capture the language code in iso standard of 2 letters and lowercase;</li>
        </ul>`
},

    }) 
    scope.events = Object.assign(scope.events, {
    
// *** start configEventsConfiguration.txt ***

// *************************
// * EVENTS: CONFIGURATION *
// *************************


[(functionPrefix + "ChangeConfiguration").replace(/^(.)(.*)$/, (match, firstChar, restOfString) => firstChar.toLowerCase() + restOfString)]: {
        event: {
            eventInfo: Object.assign({}, JSON.parse(JSON.stringify(scope.baseEvent.eventInfo)), {
                effect: "user changed the ",
            }),
            category: Object.assign({}, JSON.parse(JSON.stringify(scope.baseEvent.category)), {
                subCategory1: "configuration change"
            })
        },
        mandatoryData: scope.baseMandatoryData.concat(scope.productMandatoryData.filter(v => !['options[n].businessDivision','options[n].category1', 'options[n].productID','options[n].codeVG', 'options[n].status'].includes(v)),['options[n].businessDivision','options[n].category1', 'options[n].productID','options[n].codeVG', 'options[n].status']),
        optionalData: scope.baseOptionalData.concat(scope.productOptionalData.filter(v => !['options[n].businessDivision','options[n].category1', 'options[n].productID','options[n].codeVG','options[n].status', 'options[n].range'].includes(v)),['eventAction', 'eventCause', 'eventPoints','options[n].range']),
        description: `Trigger this function when the user changes a selection within a configuration. Provide the details of the item(s) that were added or removed in the options[n] parameters. Use the options[n].status parameter to state for each item whether it has been added item, automatically added item, automatically removed item, removed item. In case you are not sure whether or not the action was initated by the user or happened automatically, use the value without automatically as default - that is added item or removed item respectively.
        <br>Use the options[n].codeVG parameter to reference the model code of the related vehicle. You may use the options[n].range parameter to refer to the marketing model range of the related vehicle. 
        <br><ul>
        <li>For parameters with value check (bold and blue) please go with the mouse over the value or refer to the <b>allowed values tab</b> on top to see acceptable values.</li>
        <li>For parameters without value check, please refer to the <b>values without check tab</b> on top to see samples.</li>
        </ul>`
    },

// *** end configEventsConfiguration.txt ***
    // ******************
// * LAUNCH MAPPING *
// ******************
// scOpen = Carts => eventName ==  "commerce" && type =  "cart" && eventAction == "item added" . If possible use cartID as event serialization ID, to deduplicate.
// scView = Cart Views => pageType == "cart"
// scAdd = Cart Additions => eventName ==  "commerce" && type =  "cart" && eventAction == "item added"
// scRemove = Cart Removals => eventName ==  "commerce" && type =  "cart" && eventAction == "item removed"
// scCheckout = Checkouts => eventName ==  "commerce" && type =  "cart" && eventAction == "checkout"
// purchase = Revenue, Orders and Units => eventName ==  "commerce" && type =  "order" && purchaseID != 'undefined'
// ********************


// *** start configEventsCommerce.txt ***

// ********************
// * EVENTS: COMMERCE *
// ********************

[(functionPrefix + "CartAdd").replace(/^(.)(.*)$/, (match, firstChar, restOfString) => firstChar.toLowerCase() + restOfString)]: {
    event: {
            eventInfo: Object.assign({}, JSON.parse(JSON.stringify(scope.baseEvent.eventInfo)), {
                eventName: "commerce",
                type: "cart",
                effect: "user added product to cart",
                eventAction: "item added"
            }),
            category: Object.assign({}, JSON.parse(JSON.stringify(scope.baseEvent.category)), {
                subCategory1: "cart interaction",
            })
        },
        mandatoryData: scope.baseMandatoryData.concat(scope.productMandatoryData), 
        optionalData: scope.baseOptionalData.filter(v => !['searchResults', 'positionClicked','cartID', 'transactionID','step','stepName',].includes(v)).concat(scope.productOptionalData.filter(v => !['options[n].productID','vehicle[n].productID'].includes(v)),['cartID', 'eventSubCat1', 'linkLocation', 'options[n].productID','vehicle[n].productID']).filter(v => !scope.productMandatoryData.includes(v)),
        description: `Trigger this whenever the user clicks on add to cart icon/button and the product has been added successfully to the cart.
        <br> <i>If the user clicks on the add to cart icon/button, but the product is not immediately added, then track the first click with the xxxClick function and only when the product is actually successfully added, then use this xxxCartAdd function</i>.
        <br><ul>
            <li>For parameters with value check (bold and blue) please go with the mouse over the value or refer to the <b>allowed values tab</b> on top to see acceptable values.</li>
            <li>For parameters without value check, please refer to the <b>values without check tab</b> on top to see samples.</li>
            <li><b>'cartID'</b> is used to capture the unique ID of a visitor's shopping basket. </li> 
            <li><b>'eventSubCat1'</b> can be used in case you want to group certain clicks together. For project specific recommended values check the values without check tab above.</li>
            <li><b>'linkLocation'</b> can be used to describe where the clickable element was located in case the same element exists multiple times on the same page.</li>
            <li><b>'vehicle[n]'</b> for cars and motorcycles or <b>'options[n]'</b> for services and after sales products should be provided to give more details about the product(s) that is/are added to the cart. </li> 
        </ul>
        <br> <i> This functions triggers the standard adobe analytics commerce metric 'Cart additionsâ€™.  When a customer adds their first product to a shopping cart, both â€˜Cartsâ€™ and â€˜Cart additionsâ€™ are triggered.</i>`
    },

[(functionPrefix + "CartRemove").replace(/^(.)(.*)$/, (match, firstChar, restOfString) => firstChar.toLowerCase() + restOfString)]: {
        event: {
            eventInfo: Object.assign({}, JSON.parse(JSON.stringify(scope.baseEvent.eventInfo)), {
                eventName: "commerce",
                type: "cart",
                effect: "user removed product from cart",
                eventAction: "item removed"
            }),
            category: Object.assign({}, JSON.parse(JSON.stringify(scope.baseEvent.category)), {
                subCategory1: "cart interaction",
            })
        },
        mandatoryData: scope.baseMandatoryData.concat(scope.productMandatoryData), 
        optionalData: scope.baseOptionalData.filter(v => !['searchResults', 'positionClicked','cartID', 'transactionID','step','stepName',].includes(v)).concat(scope.productOptionalData.filter(v => !['options[n].productID','vehicle[n].productID'].includes(v)),['cartID', 'eventSubCat1', 'linkLocation', 'options[n].productID','vehicle[n].productID']).filter(v => !scope.productMandatoryData.includes(v)),
        description: `Trigger this whenever the user clicks on remove from cart icon/button and the product has been successfully remove from the cart.
        <br><ul>
            <li>For parameters with value check (bold and blue) please go with the mouse over the value or refer to the <b>allowed values tab</b> on top to see acceptable values.</li>
            <li>For parameters without value check, please refer to the <b>values without check tab</b> on top to see samples.</li>
            <li><b>'cartID'</b> is used to capture the unique ID of a visitor's shopping basket. </li> 
            <li><b>'eventSubCat1'</b> can be used in case you want to group certain clicks together. For project specific recommended values check the values without check tab above.</li>
            <li><b>'linkLocation'</b> can be used to describe where the clickable element was located in case the same element exists multiple times on the same page.</li>
            <li><b>'vehicle[n]'</b> for cars and motorcycles or <b>'options[n]'</b> for services and after sales products should be provided to give more details about the product(s) that is/are removed from the cart. </li> 
        </ul>
        <br> <i> This functions triggers the standard adobe analytics commerce metric 'Cart removalsâ€™. </i>`
    },

[(functionPrefix + "CartCheckout").replace(/^(.)(.*)$/, (match, firstChar, restOfString) => firstChar.toLowerCase() + restOfString)]: {
        event: {
            eventInfo: Object.assign({}, JSON.parse(JSON.stringify(scope.baseEvent.eventInfo)), {
                eventName: "commerce",
                type: "cart",
                effect: "user started checkout process",
                eventAction: "checkout"
            }),
            category: Object.assign({}, JSON.parse(JSON.stringify(scope.baseEvent.category)), {
                subCategory1: "cart interaction",
            })
        },
        mandatoryData: scope.baseMandatoryData.concat(scope.productMandatoryData, ['cartID']),
        optionalData: scope.baseOptionalData.filter(v => !['searchResults', 'positionClicked','cartID', 'transactionID'].includes(v)).concat(scope.productOptionalData.filter(v => !['options[n].productID','vehicle[n].productID'].includes(v)),['linkLocation','eventSubCat1','options[n].productID','vehicle[n].productID']).filter(v => !scope.productMandatoryData.includes(v)),
        description: `Trigger this whenever the user clicks the button to start the checkout process.
        <br><ul>
            <li>For parameters with value check (bold and blue) please go with the mouse over the value or refer to the <b>allowed values tab</b> on top to see acceptable values.</li>
            <li>For parameters without value check, please refer to the <b>values without check tab</b> on top to see samples.</li>
            <li><b>'cartID'</b> is used to capture the unique ID of a visitor's shopping basket. </li> 
            <li><b>'eventSubCat1'</b> can be used in case you want to group certain clicks together. For project specific recommended values check the values without check tab above.</li>
            <li><b>'linkLocation'</b> can be used to describe where the clickable element was located in case the same element exists multiple times on the same page.</li>
            <li><b>'vehicle[n]'</b> for cars and motorcycles or <b>'options[n]'</b> for services and after sales products should be provided to give more details about the product(s) for which the checkout process is started. </li> 
        </ul>
        <br> <i> This functions triggers the standard adobe analytics commerce metric 'Checkoutsâ€™. </i>`
    },

[(functionPrefix + "CheckoutProcess").replace(/^(.)(.*)$/, (match, firstChar, restOfString) => firstChar.toLowerCase() + restOfString)]: {
        event: {
            eventInfo: Object.assign({}, JSON.parse(JSON.stringify(scope.baseEvent.eventInfo)), {
                eventName: "commerce",
                type: "checkout",
                effect: "user updated checkout details", // "user updated " + stepName
                eventAction: "internal click"
            }),
            category: Object.assign({}, JSON.parse(JSON.stringify(scope.baseEvent.category)), {
                subCategory1: "checkout interaction",
            })
        },
        mandatoryData: scope.baseMandatoryData.concat(scope.productMandatoryData,['stepName','cartID']),
        optionalData: scope.baseOptionalData.filter(v => !['searchResults', 'positionClicked','step','stepAmounts','stepName','cartID', 'transactionID'].includes(v)).concat(scope.productOptionalData.filter(v => !['options[n].productID','vehicle[n].productID'].includes(v)),['linkLocation','eventSubCat1','options[n].productID','vehicle[n].productID','step','stepAmounts',]).filter(v => !scope.productMandatoryData.includes(v)),
        description: `Trigger this when the user updates information on any of the checkout process steps by clicking a save button/link and staying on the same process step. In case the next (virtual) step page loads, use the pageLoad function only.
        <br><ul>
            <li>For parameters with value check (bold and blue) please go with the mouse over the value or refer to the <b>allowed values tab</b> on top to see acceptable values.</li>
            <li>For parameters without value check, please refer to the <b>values without check tab</b> on top to see samples.</li>
            <li><b>'step'</b> is used to capture the number of the checkout step the user currently interacts. This is a numeric value. </li> 
            <li><b>'stepName'</b> is used to capture the name of the checkout process step .  </li> 
            <li><b>'cartID'</b> is used to capture the unique ID of a visitor's shopping basket. </li> 
            <li><b>'eventSubCat1'</b> can be used in case you want to group certain clicks together. For project specific recommended values check the values without check tab above.</li>
            <li><b>'linkLocation'</b
            > can be used to describe where the clickable element was located in case the same element exists multiple times on the same page.</li>
            <li><b>'vehicle[n]'</b> for cars and motorcycles or <b>'options[n]'</b> for services and after sales products should be provided to give more details about the product(s) that is/are being checked out. </li> 
        </ul>`
    },
    /*
    oneshop:
        personal data updated,  personal data updated - email added, personal data updated - phone number added, personal data updated - phone number changed, billing address updated, personal data updated - email changed, billing address updated - address added, billing address updated - address changed, pickup location updated, payment details updated, payment details updated - card changed, payment details updated - card added

    oneshop canceled events: 
        personal data update canceled, billing address update canceled, payment details update canceled, payment details updated - card deleted
        
    ohter oneshop event:
        payment started
    */

[(functionPrefix + "OrderSuccess").replace(/^(.)(.*)$/, (match, firstChar, restOfString) => firstChar.toLowerCase() + restOfString)]: {
            event: {
                eventInfo: Object.assign({}, JSON.parse(JSON.stringify(scope.baseEvent.eventInfo)), {
                    eventName: "commerce",
                    type: "order",
                    effect: "user successfully submitted order", 
                    eventAction: "page load",
                    cause: "automatic"
                }),
                category: Object.assign({}, JSON.parse(JSON.stringify(scope.baseEvent.category)), {
                    subCategory1: "order interaction",
                })
            },
            mandatoryData: scope.baseMandatoryData.concat(scope.productMandatoryData,['transactionID']),
            optionalData: scope.baseOptionalData.filter(v => !['searchResults', 'positionClicked','cartID','transactionID'].includes(v)).concat(scope.productOptionalData.filter(v => !['options[n].productID','vehicle[n].productID'].includes(v)),['cartID','linkLocation','eventSubCat1','options[n].productID','vehicle[n].productID']).filter(v => !scope.productMandatoryData.includes(v)),
            description: `<br>Trigger this when the user successfully submitted the order for the product(s) from the shopping basket. This generally is the case, when in the user interface a "thank you for your purchase" page is loaded.
            <br><ul>
                <li>For parameters with value check (bold and blue) please go with the mouse over the value or refer to the <b>allowed values tab</b> on top to see acceptable values.</li>
                <li>For parameters without value check, please refer to the <b>values without check tab</b> on top to see samples.</li>
                <li><b>'cartID'</b> is used to capture the unique ID of a visitor's shopping basket. </li> 
                <li><b>'transactionID'</b> is used to capture the unique ID of a visitor's successful order. It's often referred to as order number. </li> 
                <li><b>'eventSubCat1'</b> can be used in case you want to group certain clicks together. For project specific recommended values check the values without check tab above.</li>
                <li><b>'linkLocation'</b> can be used to describe where the clickable element was located in case the same element exists multiple times on the same page.</li>
                <li><b>'vehicle[n]'</b> for cars and motorcycles or <b>'options[n]'</b> for services and after sales products should be provided to give more details about the product(s) that were ordered. </li> 
            </ul>
            <br> <i> This functions triggers the standard adobe analytics commerce metric 'Revenueâ€™, 'Ordersâ€™ and 'Unitsâ€™. In order to track the 'Revenue' and 'Orders', the product details must be passed in vehicle[n] and/or options[n] parameters respectively.</i>`
        },

[(functionPrefix + "OrderCancel").replace(/^(.)(.*)$/, (match, firstChar, restOfString) => firstChar.toLowerCase() + restOfString)]: {
            event: {
                eventInfo: Object.assign({}, JSON.parse(JSON.stringify(scope.baseEvent.eventInfo)), {
                    eventName: "commerce",
                    type: "order",
                    effect: "user cancelled the order", 
                    eventAction: "item removed",
                }),
                category: Object.assign({}, JSON.parse(JSON.stringify(scope.baseEvent.category)), {
                    subCategory1: "order interaction",
                })
            },
            mandatoryData: scope.baseMandatoryData.concat(scope.productMandatoryData,['transactionID']),
            optionalData: scope.baseOptionalData.filter(v => !['searchResults', 'positionClicked','cartID','transactionID'].includes(v)).concat(scope.productOptionalData.filter(v => !['options[n].productID','vehicle[n].productID'].includes(v)),['cartID','linkLocation','eventSubCat1','options[n].productID','vehicle[n].productID']).filter(v => !scope.productMandatoryData.includes(v)),
            description: `<br>Trigger this when the user successfully cancelled an order. 
            <br><ul>
                <li>For parameters with value check (bold and blue) please go with the mouse over the value or refer to the <b>allowed values tab</b> on top to see acceptable values.</li>
                <li>For parameters without value check, please refer to the <b>values without check tab</b> on top to see samples.</li>
                <li><b>'cartID'</b> is used to capture the unique ID of a visitor's shopping basket. </li> 
                <li><b>'transactionID'</b> is used to capture the unique ID of a visitor's successful order. It's often referred to as order number. </li> 
                <li><b>'eventSubCat1'</b> can be used in case you want to group certain clicks together. For project specific recommended values check the values without check tab above.</li>
                <li><b>'linkLocation'</b> can be used to describe where the clickable element was located in case the same element exists multiple times on the same page.</li>
                <li><b>'vehicle[n]'</b> for cars and motorcycles or <b>'options[n]'</b> for services and after sales products should be provided to give more details about the product(s) that were ordered. </li> 
            </ul>`
        },

    // *** end configEventsCommerce.txt ***


    // *** start configEventsClicks.txt ***

// ******************
// * EVENTS: Clicks *
// ******************

[(functionPrefix + "Click").replace(/^(.)(.*)$/, (match, firstChar, restOfString) => firstChar.toLowerCase() + restOfString)]: {
    event: {
        eventInfo: Object.assign({}, JSON.parse(JSON.stringify(scope.baseEvent.eventInfo)), {
            eventName: "interaction",
            eventAction: "internal click",
            type: "ux",
            effect: "user clicked on ",
            cause: "default"
        }),
        category: Object.assign({}, JSON.parse(JSON.stringify(scope.baseEvent.category)), {
            subCategory1: "clicks",
        })
    },
    mandatoryData: scope.baseMandatoryData.concat(['ctaTarget',]),
    optionalData: scope.baseOptionalData.concat(scope.productMandatoryData, scope.productOptionalData,['linkLocation', 'eventSubCat1', 'eventAction','requestedURL', 'eventPoints' ]),
    description: `Trigger this whenever the user clicks on any clickable element that should be tracked with contextual (product, dealer,etc,) data. The eVar34 event effect will be "user clicked on " + ['ctaTarget'].
    <br> Whenever the user clicks on a CTA, that leads the user to another component (eg. from central new car stock locator to digital checkout solution, etc.) then make sure ['eventSubCat1'] contains "finish", so your component (eg. central new car stock locator, adobe form, con,visualizer, etc.) finish metric can be tracked.
    <br> Whenever the user clicks on a CTA, that leads the user outside the current component and to a form component (eg. from central new car stock locator to adobe form, etc.) use ['eventAction'] = "form start intention", so this metric can be tracked.
        <br><ul>
            <li>For parameters with value check (bold and blue) please go with the mouse over the value or refer to the <b>allowed values tab</b> on top to see acceptable values.</li>
            <li>For parameters without value check, please refer to the <b>values without check tab</b> on top to see samples.</li>
            <li><b>'ctaTarget'</b> is used to capture on what the user clicked. Some generic samples could be "tda", "product details page", "digital checkout solution", "electric vehicle tab", "price information", "image arrow right", etc. For project specific recommended values check the values without check tab above.</li>
            <li><b>'eventAction'</b> can be used in case the user interaction wasn't a "internal click" but eg. a "content opened", "share", "swipe", "outbound click", etc.</li>
            <li><b>'eventSubCat1'</b> can be used in case you want to group certain clicks together. For project specific recommended values check the values without check tab above.</li>
            <li><b>'linkLocation'</b> can be used to describe where the clickable element was located in case the same element exists multiple times on the same page.</li>
            <li><b>'requestedURL'</b> can be used to capture the target URL of the CTA</li>
        </ul>`
},
    

[(functionPrefix + "ListAdd").replace(/^(.)(.*)$/, (match, firstChar, restOfString) => firstChar.toLowerCase() + restOfString)]: {
    event: {
        eventInfo: Object.assign({}, JSON.parse(JSON.stringify(scope.baseEvent.eventInfo)), {
            eventName: "interaction",
            type: "ux",
            effect: "user added product to the ",
            eventAction: "item added",
            cause: "default"
        }),
        category: Object.assign({}, JSON.parse(JSON.stringify(scope.baseEvent.category)), {
            subCategory1: " interaction",
        })
    },
    mandatoryData: scope.baseMandatoryData.concat(scope.productMandatoryData,['listType']),
    optionalData: scope.baseOptionalData.concat(scope.productOptionalData,['linkLocation', 'eventPoints' ]),
    description: `Trigger this event whenever the user adds a product to a list (eg. wish list, compare list, etc.) successfully, meaning the product is actually added to the list. Note: for some components this requires the user to login first. For such components the click on eg. the wish list heart (which then doesn't add the product to the list but opens another window where the user needs to login first) should be tracked with the Click function.
    <br><ul>
        <li>For parameters with value check (bold and blue) please go with the mouse over the value or refer to the <b>allowed values tab</b> on top to see acceptable values.</li>
        <li>For parameters without value check, please refer to the <b>values without check tab</b> on top to see samples.</li>
        <li><b>'linkLocation'</b> can be used to describe where the clickable element was located in case the same element exists multiple times on the same page.</li>
        <li><b>'listType'</b> is used to capture the kind of list eg "wish list" or "compare list". Check allowed value for details.</li>
    </ul>`
},

[(functionPrefix + "ListRemove").replace(/^(.)(.*)$/, (match, firstChar, restOfString) => firstChar.toLowerCase() + restOfString)]: {
    event: {
        eventInfo: Object.assign({}, JSON.parse(JSON.stringify(scope.baseEvent.eventInfo)), {
            eventName: "interaction",
            type: "ux",
            effect: "user removed product from the ",
            eventAction: "item removed",
            cause: "default"
        }),
        category: Object.assign({}, JSON.parse(JSON.stringify(scope.baseEvent.category)), {
            subCategory1: " interaction",
        })
    },
    mandatoryData: scope.baseMandatoryData.concat(scope.productMandatoryData,['listType']),
    optionalData: scope.baseOptionalData.concat(scope.productOptionalData,['linkLocation','eventPoints' ]),
    description: `Trigger this event whenever the user removes a product from a list (eg. wishlist, compare list, etc.) successfully, meaning the product is actually removed from the list. Note: If this is a multi-step approach for your component, and when clicking on remove product a window opens to ask the user if he really wants to remove it and only after confirmation it's actually removed, then the first click on remove product should only be tracked with the Click function, and only the last click, after which the product really is removed from the list, should be tracked with this function.
    <br><ul>
        <li>For parameters with value check (bold and blue) please go with the mouse over the value or refer to the <b>allowed values tab</b> on top to see acceptable values.</li>
        <li>For parameters without value check, please refer to the <b>values without check tab</b> on top to see samples.</li>
        <li><b>'linkLocation'</b> can be used to describe where the clickable element was located in case the same element exists multiple times on the same page.</li>
        <li><b>'listType'</b> is used to capture the kind of list eg "wish list" or "compare list". Check allowed value for details.</li>
    </ul>`
},

[(functionPrefix + "ViewActions").replace(/^(.)(.*)$/, (match, firstChar, restOfString) => firstChar.toLowerCase() + restOfString)]: {
    event: {
        eventInfo: Object.assign({}, JSON.parse(JSON.stringify(scope.baseEvent.eventInfo)), {
            eventName: "interaction",
            eventAction: "internal click",
            type: "ux",
            effect: "user clicked on ",
            cause: "default"
        }),
        category: Object.assign({}, JSON.parse(JSON.stringify(scope.baseEvent.category)), {
            subCategory1: "view"
        })
    },
    mandatoryData: scope.baseMandatoryData.concat(['viewMode', 'eventEffect']),
    optionalData: scope.baseOptionalData.concat(scope.productMandatoryData,scope.productOptionalData,['imageBackground','viewDayTime','viewPerspective','viewScreen','viewType','eventPoints', 'eventAction']),
    description: `Trigger this event whenever the user plays with the view eg opens it, closes it, rotates the car, opens doors, checks out interior view etc.
    <br><ul>
    <li>For parameters with value check (bold and blue) please go with the mouse over the value or refer to the <b>allowed values tab</b> on top to see acceptable values.</li>
    <li>For parameters without value check, please refer to the <b>values without check tab</b> on top to see samples.</li>
    <li><b>'eventEffect'</b> describes on what the user clicked</li>
    <li><b>'imageBackground'</b> describes the background of the product eg. in the studio or in the desert etc.</li>
    <li><b>'viewDayTime'</b> describes whether it's day or night</li>
    <li><b>'viewMode'</b> describes is either 360 or 3d</li>
    <li><b>'viewPerspective'</b> describes from which angle the user views the product</li>
    <li><b>'viewScreen'</b> describes whether it's full screen or default screen</li>
    <li><b>'viewType'</b> describes whether the user sees a product exterior or interior view</li>
    </ul>`
},


// *** end configEventsClicks.txt ***

//END OF EVENTS
}) 
  }
};

//*** start globalDefaults.js ***
config.globalDefaults = function (scope) {

  scope.productSchema = {
    'category': {},
    'productInfo': {},
    'attributes': {}
  };

  scope.defaultDatalayer = {
    component: [{
      category: {},
      componentInfo: {},
      attributes: {}
    }],
    event: [{
      category: {},
      eventInfo: {},
      attributes: {
        //activityMap: {},
        form: {},
        search: [],
        media: {},
        survey: {},
        solutionSpecific: {},
      }
    }],
    custom: {},
    page: {
      category: {},
      pageInfo: {},
      attributes: {}
    },
    product: [],
    cart: {
      item: [{
        category: {},
        productInfo: {},
        price: {},
        attributes: {}
      }],
      price: {}
    },
    transaction: {
      total: {
        attributes: {}
      },
      item: [{
        category: {},
        productInfo: {},
        price: {},
        attributes: {}
      }]
    },
    user: [{
      segment: {},
      profile: [{
        profileInfo: {},
        attributes: {}
      }]
    }],
    dealer: [{
      dealerInfo: {},
      attributes: {}
    }],
    version: scope.version
  };

  if (!scope.events) {
    scope.events = {};
  }

  scope.events.error = {
    event: {
      eventInfo: {
        eventName: 'error',
        type: '', // mandatoryData.errorType (options: backend 1st party, backend 3rd party, frontend component, frontend page, user, product data, emission service, web links)
        eventAction: 'internal click', // mandatoryData.errorAction
        eventPoints: '0',
        cause: 'default', // mandatoryData.errorCause
        effect: 'na' // mandatoryData.errorMessage
      }
    },
    custom: {
      'errorCode': '', // subcategory1
      'errorOrigin': '', // subcategory2
      'errorURL': document.location.href,
    },
    mandatoryData: scope.errorMandatoryData.concat(['errorAction', 'errorMessage', 'errorCause', 'errorType', 'errorCode', 'errorOrigin']),
    optionalData: scope.baseMandatoryData.concat(scope.baseOptionalData,scope.productOptionalData, scope.productMandatoryData).concat(['errorURL', 'eventPoints']).filter(v => !scope.errorMandatoryData.includes(v)).filter(v => !['formLeadType', 'formVariant', 'linkLocation', 'ctaTarget', 'anchorName', 'hashName'].includes(v)),
    //optionalData: ['errorURL'].filter(v => !scope.errorMandatoryData.includes(v)),
    description: `Trigger this event whenever an error occurs that prevents the user from continuing with its journey. 
                <br> All parameters that are mandatory for every other function, are optional for error events by the code (refer to parameters listed on the right). However, please provide as much information as possible eg. vehicle, options, dealer, etc. whenever it's available to you at the moment the error occurred.
                <br>Please consult the <a href="https://atc.bmwgroup.net/confluence/x/1FsYrw" target="_blank">Adobe Analytics 2023 - Error Tracking confluence page</a> for further details.`
  };

  scope.events = Object.assign(scope.events, {
    activityMapClick: {
      event: {
        eventInfo: Object.assign({}, JSON.parse(JSON.stringify(scope.baseEvent.eventInfo)), {
          effect: "user clicked on an on page navigation element"
        })
      },
      mandatoryData: [],
      optionalData: scope.errorMandatoryData.concat(['componentVersion', 'eventPoints','options[n].productID','vehicle[n].productID','options[n].linkedDealerCount','options[n].linkedDealerOutletBuno','vehicle[n].linkedDealerCount', 'vehicle[n].linkedDealerOutletBuno',]),
      description: `Trigger this event whenever the user clicks on a navigation item that does not navigate the user to a new page and hence triggers a server call.
      <br> This is used for pure non-contextual (without vehicle, dealer, form etc context) click tracking.
      <br> If on the page product data is already set, you can link your event to it by providing the respective productID.
      <br> If on the page dealer information is already pushed to ACDL, you can link your event to the selected dealer by providing the respective buno.
      <br>Please consult the <a href="https://atc.bmwgroup.net/confluence/x/TvwHrQ" target="_blank">Adobe Analytics 2023 - Activity Map confluence page</a> for further details.`
    },
  });

  scope._validErrorTypes = ['backend 1st party', 'backend 3rd party', 'frontend component', 'user'];
  scope._validErrorActions = scope._validEventActions = ['call', 'checkbox', 'component load', 'content closed', 'content opened', 'content visible', 'download', 'drop-down menu', 'first page load', 'first component interaction','form fill', 'internal click', 'outbound click', 'page load', 'radio button', 'rotate', 'item added', 'item removed', 'share', 'slide left', 'slide right', 'sort', 'suggested term', 'media played', 'media paused', 'media milestone reached', 'media stopped', 'email', 'swipe', 'form start intention', 'chat', 'print', 'swipe left', 'swipe right', 'form finish intention'];
  scope._validEventCauses = ['automatic'];
  scope._validEventPoints = ['time between two events in miliseconds provided as numeric value'];

  scope.defaultValue = '';
};
//*** end globalDefaults.js ***
        config.library(this);
        config.defaults(this);
        config.globalDefaults(this)
        config.events(this);

        //allowed Values filter - from the list of library attributes which contain the key 'allowed', convert their values into lower case
        var x = Object.keys(this).filter(key => key.includes('allowed'));
        for (var i in x) {
            this[x[i]] = this[x[i]].map(item => typeof item === 'string' ? item.toLowerCase() : item)
        }

        this._createPublicMethods();

        this.findPIIMatches = this.findPIIMatches.bind(this);
        this.scanForPIIKeywords = this.scanForPIIKeywords.bind(this);
        this.ignoreParamsNotApplicable = [];
        this.piiKeywords = [
            'firstname', 'lastname', 'vin', 'username', 'enname', 'name', 'loginid', 'registrationpassword', 'confirmationpassword', 'confirmregistrationpassword', 'registrationid', 'passwordconfirmation', 'password', 'token', 'telephone', 'email'
        ];

        this.message = {};
    }

    // ***********************************
    // * public custom functions         *
    // ***********************************

    // helper functions
    // function to return list of associated events and their resp parameters. The parameters further contain the information of list of possible values
    getSupportedEvents() {
        var allEvents = {}
        for (const event in this.events) {
            var mandatoryData = JSON.parse(JSON.stringify(this.events[event].mandatoryData));
            var optionalData = JSON.parse(JSON.stringify(this.events[event].optionalData));
            var valueChecks = Object.keys(this).map(v => v.toLowerCase());

            var parameters = [mandatoryData.sort(), optionalData.sort()];
            for (var i in parameters) {
                for (var j in parameters[i]) {
                    var keySearch = parameters[i][j];
                    keySearch = (keySearch.indexOf('[n].') > -1) ? keySearch.replace('[n].', '') : keySearch;
                    if (keySearch.includes("searchsearch")) {
                        keySearch = keySearch.replace("searchsearch", "search");
                    }
                    var searchArray = valueChecks.filter(s => s.includes(keySearch.toLowerCase()));
                    if ((typeof keySearch == 'string' && searchArray.length == 1) || ((typeof keySearch == 'string' && searchArray.length > 1 && searchArray[0].includes(keySearch))) || ((typeof keySearch == 'string' && searchArray.length > 1 && searchArray[0].includes((keySearch.toLowerCase()))))) {
                        if (['optionscode'].indexOf(keySearch) < 0 && Array.isArray(this[Object.keys(this)[valueChecks.indexOf(searchArray[0])]])) {

                            //eventEffect not defined in config
                            //eventEffect not defined i

                            var options;
                            //var searchIndex = ((keySearch == 'eventEffect' && event.indexOf('ViewActions') > -1) || (keySearch == 'stepName' && event.indexOf('CheckoutProcess') > -1)) ? 0 : 1;
                            //var options = this[Object.keys(this)[valueChecks.indexOf(searchArray[searchIndex])]];

                            if (keySearch == 'eventEffect') {
                                options = [];
                                //if (event.indexOf('ViewActions') > -1) {
                                if (event.toLowerCase().indexOf('viewactions') > -1) {
                                    if((searchArray[0]).indexOf('generic') > -1){
                                        options = this[Object.keys(this)[valueChecks.indexOf(searchArray[0])]];
                                    }
                                } else {
                                    if (searchArray.length > 1) {
                                        options = this[Object.keys(this)[valueChecks.indexOf(searchArray[1])]];
                                    }else if(searchArray.length == 1 && ((searchArray[0]).indexOf('generic') < 0)){
                                        options = this[Object.keys(this)[valueChecks.indexOf(searchArray[0])]];
                                    }
                                }
                            } else if (keySearch == 'stepName') {
                                options = [];
                                //if (event.indexOf('CheckoutProcess') > -1) {
                                if (event.toLowerCase().indexOf('checkoutprocess') > -1) {
                                    if((searchArray[0]).indexOf('generic') > -1){
                                        options = this[Object.keys(this)[valueChecks.indexOf(searchArray[0])]];
                                    }
                                } else {
                                    if (searchArray.length > 1) {
                                        options = this[Object.keys(this)[valueChecks.indexOf(searchArray[1])]];
                                    }else if(searchArray.length == 1 && ((searchArray[0]).indexOf('generic') < 0)){
                                        options = this[Object.keys(this)[valueChecks.indexOf(searchArray[0])]];
                                    }
                                }
                            } else {
                                //remove the generic since its not required
                                searchArray = searchArray.filter(item => !item.includes('generic'));
                                options = this[Object.keys(this)[valueChecks.indexOf(searchArray[0])]];
                            }

                            if((options || []).length > 0){
                                options = options.filter(function (e) {
                                    return e !== ''
                                })

                                var dispOptions = "Possible Options: " + options.join(', ').toString();
                                parameters[i][j] = '<span style="color: #1000ff;font-weight: bold;" title="' + dispOptions + '">' + parameters[i][j] + '</span>';
                            }

                            if (keySearch == 'eventEffect' || keySearch == 'stepName') {
                                //if (event.indexOf('ViewActions') < 0 && event.indexOf('CheckoutProcess') < 0) {
                                    if (event.toLowerCase().indexOf('viewactions') < 0 && event.toLowerCase().indexOf('checkoutprocess') < 0) {
                                    if (searchArray.length <= 1 && ((searchArray[0]).indexOf('generic') > -1)) {
                                        parameters[i][j] = keySearch;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            allEvents[event] = {
                "description": this.events[event].description,
                "mandatory parameters": parameters[0].join(', <br>').toString(),
                "optional parameters": parameters[1].join(', <br>').toString()
            };
        }
        return allEvents;
    }

    //function to set debug mode where console statments are printed
    setDebug(newValue) {
        if (typeof newValue != "boolean") {
            return false;
        }
        sessionStorage.setItem('tronDebug', newValue);
        this.debug = newValue;
    }

    //function to detect debug mode where console statments are printed
    detectDebugMode() {
        let debugMode;
        if (sessionStorage.getItem('tronDebug') != null) {
            debugMode = (sessionStorage.getItem('tronDebug') === 'true');
        }

        if (document.location.search.indexOf("trondebug") != -1) {
            debugMode = (document.location.search.indexOf("trondebug=true") != -1) ? true : false;
            sessionStorage.setItem('tronDebug', debugMode);
        }
        this.setDebug(debugMode);
    }
    // **************************************
    // * internal private functions         *
    // **************************************
    _createPublicMethods(t) {
        for (const eventName in this.events) {
            this[eventName] = (function (eventName) {
                return function (mandatoryData) {
                    this._processEvent(`${eventName}`, mandatoryData)
                }
            })(eventName);
        }
    }

    //for the nested objects passed to an event, convert them to flatten structure to further process 
    flattenObject(ob) {
        var toReturn = {};

        for (var i in ob) {
            if (!ob.hasOwnProperty(i)) continue;

            if ((typeof ob[i]) == 'object' && ob[i] !== null) {
                var flatObject = this.flattenObject(ob[i]);
                for (var x in flatObject) {
                    if (!flatObject.hasOwnProperty(x)) continue;

                    toReturn[i + '.' + x] = flatObject[x];
                }
            } else {
                toReturn[i] = ob[i];
            }
        }
        return toReturn;
    }

    _trimWhitespace(obj) {
        if (typeof obj === 'string') {
            const whitespaceRegex = /^\s+|\s+$/g;
            return obj.replace(whitespaceRegex, '');
        } else if (typeof obj === 'object' && obj !== null) {
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    obj[key] = this._trimWhitespace(obj[key]);
                }
            }
        }
        return obj;
    }

    _removeUndefinedValues(obj) {
        for (let key in obj) {
            if (obj[key] === '<not defined>') {
                delete obj[key];
            } else if (typeof obj[key] === 'object') {
                this._removeUndefinedValues(obj[key]);
            }
        }
    }

    //for the parameters passed to the function, check if only the required parameters are sent 
    _checkParamsPassed(eventName, paramsPassed, mandatoryData) {
        //reset for every function call
        this.ignoreParamsNotApplicable = [];
        var notAvailable = false;
        paramsPassed = this.flattenObject(paramsPassed);
        paramsPassed = Object.keys(paramsPassed);
        paramsPassed = paramsPassed.map(function (item) {
            var regex = /(.)(\d+)(.)/;
            return item.replace(regex, '[n].');
        });

        // var acceptedList = [];
        // for (var i in this.events) {
        //     acceptedList.push.apply(acceptedList, this.events[i].mandatoryData);
        //     acceptedList.push.apply(acceptedList, this.events[i].optionalData);
        // }
        // acceptedList = acceptedList.filter((v, i, a) => a.indexOf(v) === i);

        var transformedParams = {};
        Object.keys(this.flattenObject(mandatoryData)).forEach(function (originalKey) {
            var regex = /(.)(\d+)(.)/;
            var matches = originalKey.match(regex);
            if (matches) {
                var transformedKey = originalKey.replace(regex, '[n].');
                if (transformedParams.hasOwnProperty(transformedKey)) {
                    transformedParams[transformedKey] += originalKey + ",";
                } else {
                    transformedParams[transformedKey] = originalKey + ",";
                }
            } else {
                transformedParams[originalKey] = originalKey;
            }
        });

        var eventParameters = [];
        eventParameters.push.apply(eventParameters, this.events[eventName].mandatoryData);
        eventParameters.push.apply(eventParameters, this.events[eventName].optionalData);
        eventParameters = eventParameters.filter((v, i, a) => a.indexOf(v) === i);

        // for (var z in paramsPassed) {
        //     if (acceptedList.indexOf(paramsPassed[z]) < 0) {
        //         notAvailable = true;
        //         this._throwError('o', paramsPassed[z], 'not-defined', '');
        //     }
        // }

        for (var i in paramsPassed) {
            if (eventParameters.indexOf(paramsPassed[i]) < 0) {
                var determination = transformedParams[paramsPassed[i]];
                if (determination.indexOf(',') > -1) {
                    determination = determination.split(',');
                    for (var j in determination) {
                        if (determination[j] != '') {
                            if (determination[j].indexOf('.') > -1) {
                                var success = determination[j].split('.');
                                var currentLevel = mandatoryData;
                                for (var k = 0; k < success.length; k++) {
                                    var key = success[k];
                                    if (k === success.length - 1) {
                                        currentLevel[key] = '<not defined>';
                                        this.ignoreParamsNotApplicable.push(paramsPassed[i]);
                                        this._throwError('o', paramsPassed[i], 'not-defined', '');
                                    } else {
                                        currentLevel = currentLevel[key] = currentLevel[key] || {};
                                    }
                                }
                            }
                        }
                    }
                } else {
                    mandatoryData[paramsPassed[i]] = '<not defined>';
                    this.ignoreParamsNotApplicable.push(paramsPassed[i]);
                    this._throwError('o', paramsPassed[i], 'not-defined', '');
                }
            }
        }
    }

    transformData(obj) {
        if (typeof obj !== 'object' || obj === null) {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.transformData(item));
        }

        var transformedObj = {};

        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                var value = obj[key];
                if (key === 'pageGeoRegion' && typeof value !== 'undefined') {
                    value = (value || "").toUpperCase();
                } else if (['pageSubCat1', 'category1', 'totalCurrency'].indexOf(key) > -1) {
                    //value = value; //ignore case
                } else if (typeof value === 'string') {
                    value = (value || "").toLowerCase();
                } else {
                    value = this.transformData(value);
                }
                transformedObj[key] = value;
            }
        }
        return transformedObj;
    }

    findPIIMatches(inputObject, parentKey, matches) {
        Object.keys(inputObject).forEach((key) => {
            const currentKey = parentKey ? parentKey + '.' + key : key;
            var value = inputObject[key];

            if (typeof value === 'object' && value !== null) {
                this.findPIIMatches(value, currentKey, matches);
            } else {
                this.piiKeywords.forEach((keyword) => {
                    if (String(value).toLowerCase().includes(keyword.toLowerCase())) {
                        matches.push({
                            key: currentKey,
                            match: keyword
                        });
                        // const matchIndex = String(value).toLowerCase().indexOf(keyword.toLowerCase());
                        // const truncatedValue = value.slice(0, matchIndex) + value.slice(matchIndex + keyword.length);
                        // inputObject[currentKey] = truncatedValue; //TO BE CHECKED WITH JOHANNA
                        // value = truncatedValue;
                        return true;
                    }
                    return false;
                });
            }
        });
    }

    scanForPIIKeywords(inputObject) {
        const matches = [];
        this.findPIIMatches(inputObject, null, matches);
        const matchesUnique = Object.values(matches.reduce((acc, obj) => {
            const {
                key,
                match
            } = obj;
            if (!acc[key]) {
                acc[key] = {
                    key,
                    match
                };
            }
            return acc;
        }, {}));
        if (Object.keys(matchesUnique).length > 0) {
            matchesUnique.forEach((match) => {
                this._throwError('o', match.key, 'pii-keyword', this.piiKeywords, match.match);
            });
        }
    }

    //for every tron event triggered, check if the parameters are correct and then further map it as per the component
    _processEvent(eventName, mandatoryData) {
        if (typeof mandatoryData == "undefined") {
            mandatoryData = {};
        }

        //initialize values that would be required for error tracking
        TRON.currentEventName = eventName;
        TRON.prefix = PROJECT_SPECIFIC_DATA.prefix;
        TRON.componentName = PROJECT_SPECIFIC_DATA.libraryName || ((((this.component || "").componentInfo || "").componentName || ""));

        if (typeof mandatoryData != "undefined") {
            if (typeof mandatoryData['componentName'] != "undefined") {
                TRON.componentName = mandatoryData['componentName']
            }

            if (typeof mandatoryData['formOrigin'] != "undefined") {
                TRON.componentName = mandatoryData['formOrigin']
            }

            if (typeof mandatoryData['componentDEVagency'] != "undefined") {
                TRON.componentName = TRON.componentName + " " + (mandatoryData['componentDEVagency']);
            }
        }

        TRON.version = 'tron_v' + this._TronVersion + 'Â¦' + this._componentTrackingVersion + 'Â¦' + eventName;

        var componentIDBuild = `${determineBrand()}/${gFFWNV([
            () => window.location.href.split('country=')[1].split('&')[0],
            () => window.location.href.split('country_origin=')[1].split('&')[0],
            () => datalayerPath('page.pageInfo.geoRegion'),
            () => datalayerPath('page.pageInfo.language').indexOf('-') > -1 && datalayerPath('page.pageInfo.language').split('-')[1],
            () => (window.location.host.indexOf('bmwusa') > -1) ? "US" : "",
            () => typeof mandatoryData != "undefined" && typeof mandatoryData['pageGeoRegion'] != "undefined" && mandatoryData['pageGeoRegion'].toLowerCase()
        ])}_${gFFWNV([
            () => datalayerPath('page.pageInfo.language').slice(0, 2) || ((datalayerPath('page.pageInfo.language').indexOf('-') > -1) ? datalayerPath('page.pageInfo.language').split('-')[0] : (window.location.host.indexOf('bmwusa') > -1) ? "en" : ((typeof mandatoryData != "undefined" && typeof mandatoryData['pageLanguage'] != "undefined") ? mandatoryData['pageLanguage'].toLowerCase() : ""))
        ])}/${TRON.componentName}`;

        TRON.dataComponent = [{
            category: {
                componentType: (this.component.category.componentType || ""), // hard coded for all events
                primaryCategory: (this.component.category.primaryCategory || ""), // hard coded for all events
                subCategory1: (this.component.category.subCategory1 || "") // hard coded for all events
            },
            componentInfo: {
                componentName: TRON.componentName, // hard coded for all events
                componentID: componentIDBuild
            },
            attributes: {
                touchpoint: (this.component.attributes.touchpoint || ""), // hard coded values for all events
            }
        }]

        var paramsPassed = JSON.parse(JSON.stringify(mandatoryData));
        this._debug("ðŸ’¡ event triggered:" + eventName, paramsPassed);

        //handle upper case and lower case
        mandatoryData = this.transformData(mandatoryData);

        //handle whiteSpace characters
        mandatoryData = this._trimWhitespace(mandatoryData);

        //check for PII
        this.scanForPIIKeywords(mandatoryData);

        this._checkParamsPassed(eventName, paramsPassed, mandatoryData);
        //empty the warning error array so that previous triggered functions warning should not be added in the current function execution
        if (typeof window.TRON.warningCode != 'undefined') {
            window.TRON.warningCode = [];
        }

        window.TRON.priceCalculation = false;

        //process and remove the undefiend values
        this._removeUndefinedValues(mandatoryData);

        this.message = this._loadEventData(eventName, mandatoryData);

        try {
            this._checkmandatoryData(eventName, mandatoryData);
            if (this.events[eventName].optionalData) {
                this._checkOptionalData(eventName, mandatoryData);
            }
        } catch (error) {
            if (!(typeof error == 'object' && typeof error.name != 'undefined' && error.name == 'SyntaxError' && typeof error.message != "undefined" && error.message == 'Missing Mandatory Data')) {
                TRON.customConsole.error(error);
            }
            return false;
        }

        // PREFIX
//prefix depends on component primary category and is set in each pageName and event effect
var prefix = PROJECT_SPECIFIC_DATA.prefix;

// DATALAYER HELPER: component
// *** start eventHandlerComponents.js ***

// ***************************
// * VALUE CHECKS: COMPONENT *
// ***************************

if (typeof this.allowedComponentTypes != 'undefined') {
    try {
        this._validateProperty('componentType', this.allowedComponentTypes, eventName, mandatoryData);
    } catch (e) {
        return false
    }

}
if (typeof this.allowedComponentNames != 'undefined') {
    try {
        this._validateProperty('componentName', this.allowedComponentNames, eventName, mandatoryData);
    } catch (e) {
        return false
    }
}
if (typeof this.allowedComponentSubCat1 != 'undefined') {
    try {
        this._validateProperty('componentSubCat1', this.allowedComponentSubCat1, eventName, mandatoryData);
    } catch (e) {
        return false
    }
}
if (typeof this.allowedComponentPlatform != 'undefined') {
    try {
        this._validateProperty('componentPlatform', this.allowedComponentPlatform, eventName, mandatoryData);
    } catch (e) {
        return false
    }
}

// *******************************
// * VARIABLE MAPPING: COMPONENT *
// *******************************

// DATALAYER HELPER: component 
this.message.component[0].category.componentType = gFFWNV([
    () => mandatoryData['componentType'],
    () => (((this.component || '').category || '').componentType || '')
]);

this.message.component[0].category.primaryCategory = gFFWNV([
    () => mandatoryData['componentPrimaryCat'],
    () => (((this.component || '').category || '').primaryCategory || '')
]);


this.message.component[0].category.subCategory1 = gFFWNV([
    () => mandatoryData['componentSubCat1'],
    () => (((this.component || '').category || '').subCategory1 || '')
]);

if (typeof mandatoryData['componentVersion'] != 'undefined') {
    this.message.component[0].attributes.componentVersion = ['componentVersion'];
    delete this.message.custom.componentVersion;
}

if (typeof this.message.component[0].componentInfo == 'undefined') {
    this.message.component[0].componentInfo = {};
}

if (typeof mandatoryData['componentName'] != 'undefined') {
    this.message.component[0].componentInfo.componentName = mandatoryData['componentName'];
    this.message.event[0].category.primaryCategory = mandatoryData['componentName'];
} else {
    this.message.component[0].componentInfo.componentName = this.message.component[0].componentInfo.componentName;
    this.message.event[0].category.primaryCategory = this.message.component[0].componentInfo.componentName;
}

if (typeof mandatoryData['componentDEVagency'] != 'undefined') {
    this.message.component[0].attributes.componentDEVagency = gFFWNV([
        () => mandatoryData['componentDEVagency']
    ]);
}

if (typeof mandatoryData['componentPlatform'] != 'undefined') {
    this.message.component[0].attributes.platform = gFFWNV([
        () => mandatoryData['componentPlatform']
    ]);
}

// *** start eventHandlerPrefix.js ***

var prefixVariable = (typeof prefix != "undefined") ? prefix : TRON.prefix;;
//check the prefix
var determinPrimaryCategory = {
    'con >': 'configurator',
    'stock >': 'stock locator',
    'sales >': 'sales',
    'fin >': 'finance',
    'rent >': 'rental'
};


var obj = (typeof this != "undefined" && this.message && this.message.component) ? this.message.component : (TRON.dataComponent || {});
var compVar = (obj || [])[0] || {};
var primaryCategory = (typeof determinPrimaryCategory[prefixVariable] != "undefined") ? determinPrimaryCategory[prefixVariable] : ((compVar.category || {}).primaryCategory || '');

//check the fallback
if (primaryCategory == '' || prefixVariable == 'shared > ' || prefixVariable == "local > ") {
    var domains = ['.bmw.', '.mini.', '.bmw-motorrad.', '.bmwusa.com', 'customer.bmwgroup.com', 'rolls-roycemotorcars.com', 'tron.bmwgroup.com'];
    var match = domains.some(domain => window.location.href.includes(domain));
    if (match) {
        var host = location.host;
        var componentSubCategory1 = host.split(".")[1];
        var subdomain = host.split(".")[0];
        var host = location.host;
        var domainName = host.split(".")[1];
        var path = location.pathname;
        var languageMarket = path.split("/")[1];
        var languageMarketLength = languageMarket.length;
        if (host.split(".")[2] === "com" && domainName === "bmw" && languageMarketLength === 2) {
            primaryCategory = "special website";
            prefixVariable = "special > "
        } else if (domainName === "bmw" || domainName === "mini" || domainName === "bmw-motorrad" ||
            domainName === "bmwusa" || domainName === "rolls-roycemotorcars" || (domainName === "bmwgroup" && subdomain === "customer") || (domainName === "bmwgroup" && subdomain === "tron")) {
            primaryCategory = "nsc website";
            prefixVariable = "nsc > "
        } else {
            primaryCategory = "special website";
            prefixVariable = "special > "
        }
    } else {
        primaryCategory = "special website";
        prefixVariable = "special > ";
    }
}

if (typeof prefix != "undefined") {
    prefix = prefixVariable;
}

if (typeof TRON.prefix != "undefined") {
    TRON.prefix = prefixVariable;
}
// *** end eventHandlerPrefix.js ***

//update component
this.message.component[0].category.primaryCategory = primaryCategory;

//update the Component value defined to be used in error function
if (typeof TRON.dataComponent != "undefined") {
    TRON.dataComponent = Object.assign(TRON.dataComponent, this.message.component);
}

// *** end eventHandlerComponents.js ***

// **************************************
// * MAP SALES GROUPS TO DESIRED VALUES *
// **************************************

// sorted A-Z by desired value

//import categoryMapping 
var valueMappingCategory = {
    'accessories_zub': 'accessories',
    'graphics': 'car hood graphics',
    'accessories_lad': 'charging',
    'BODY_COLOURS': 'colors',
    'colours': 'colors',
    'ENGINES': 'engine',
    'model': 'engine',
    'TRIMS': 'interior trims',
    'interior_trims': 'interior trims',
    'INTERIOR_WORLDS': 'interior worlds',
    'lines': 'lines / trims',
    'trimlevel': 'lines / trims',
    'OPTIONS': 'options',
    'EXTERIOR_HIGHLIGHTS': 'options',
    'INTERIOR_HIGHLIGHTS': 'options',
    'PACKAGES': 'packages',
    'PACKAGES_AND_OPTIONS': 'packages',
    'TOP_COLOURS': 'roof and mirror caps',
    'roof_and_mirror_caps': 'roof and mirror caps',
    'UPHOLSTERY': 'upholstery',
    'fabrics': 'upholstery',
    'RIMS': 'wheels',
    'wheels': 'wheels',
    'accessories:pwr': 'winter wheels',
    'ACCESSORIES_PWR': 'winter wheels'
};

if (typeof mandatoryData != 'undefined' && mandatoryData['pageSubCat1']) {
    if (typeof mandatoryData['pageSubCat1'] != "undefined") {
  
      if (valueMappingCategory.hasOwnProperty(mandatoryData['pageSubCat1'])) {
        mandatoryData['pageSubCat1'] = valueMappingCategory[mandatoryData['pageSubCat1']];
      }
  
      if (mandatoryData['pageSubCat1'].startsWith("option_group")) {
        mandatoryData['pageSubCat1'] = 'options';
      } else if (mandatoryData['pageSubCat1'] === 'EXTERIOR_HIGHLIGHTS') {
        mandatoryData['pageSubCat1'] = 'options';
        mandatoryData['pageSubCat2'] = 'exterior highlights';
      } else if (mandatoryData['pageSubCat1'] === 'INTERIOR_HIGHLIGHTS') {
        mandatoryData['pageSubCat1'] = 'options';
        mandatoryData['pageSubCat2'] = 'interior highlights';
      }
  
    }
  }

//Validation
if (typeof mandatoryData["pageSubCat1"] != "undefined") {
  let flagVariablePageSubCat1 = false;
  if (!this.allowedPageSubCat1.includes(mandatoryData["pageSubCat1"])) {
    flagVariablePageSubCat1 = true;
    mandatoryData["pageSubCat1"] = '';
  }
  if (flagVariablePageSubCat1) {
    if (this.events[eventName].mandatoryData.indexOf('pageSubCat1') > -1) {
      this._throwError('m', 'pageSubCat1', 'incorrect', this.allowedPageSubCat1);
      return;
    } else {
      this._throwError('o', 'pageSubCat1', 'incorrect-o', this.allowedPageSubCat1);
    }
  }
}

// *** start eventHandlerPages.js ***
if (typeof prefix == "undefined") {
  var prefix;
}
prefix = (typeof prefix != "undefined") ? prefix : TRON.prefix;

// **********************
// * VALUE CHECKS: PAGE *
// **********************

// validate page brand
try {
  this._validateProperty('pageBrand', this.allowedPageBrand, eventName, mandatoryData);
} catch (e) {
  return false
}

//validate page variant
try {
  this._validateProperty('pageVariant', this.allowedPageVariant, eventName, mandatoryData);
} catch (e) {
  return false
}

// validate page geoRegion
if (typeof mandatoryData != 'undefined' && typeof mandatoryData['pageGeoRegion'] != 'undefined') {
  if (mandatoryData['pageGeoRegion'].length == 2) {
    mandatoryData['pageGeoRegion'] = (mandatoryData['pageGeoRegion'] || "").toUpperCase();
  } else {
    mandatoryData['pageGeoRegion'] = (mandatoryData['pageGeoRegion'] || "").toLowerCase();
    if (!['global'].includes(mandatoryData['pageGeoRegion'])) {
      if (this.events[eventName].mandatoryData.indexOf('pageGeoRegion') > -1) {
        let determineErrorCase = (typeof mandatoryData['pageGeoRegion'] == "string" && mandatoryData['pageGeoRegion'].trim().length == 0) ? 'empty' : 'incorrect';
        this._throwError('m', 'pageGeoRegion', determineErrorCase, this.allowedPageGeoRegion);
        return;
      } else {
        let determineErrorCase = (typeof mandatoryData['pageGeoRegion'] == "string" && mandatoryData['pageGeoRegion'].trim().length == 0) ? 'incorrect-o' : 'incorrect-o';
        this._throwError('o', 'pageGeoRegion', determineErrorCase, this.allowedPageGeoRegion);
        mandatoryData['pageGeoRegion'] = '';
      }
    }
  }
}

// validate page Language
if (typeof mandatoryData != 'undefined' && typeof mandatoryData['pageLanguage'] != 'undefined') {
  if (mandatoryData['pageLanguage'].length != 2) {
    if (this.events[eventName].mandatoryData.indexOf('pageLanguage') > -1) {
      let determineErrorCase = (typeof mandatoryData['pageLanguage'] == "string" && mandatoryData['pageLanguage'].trim().length == 0) ? 'empty' : 'incorrect';
      this._throwError('m', 'pageLanguage', determineErrorCase, '', '(has to follow ISO standard of 2 letters in uppercase)');
      return;
    } else {
      let determineErrorCase = (typeof mandatoryData['pageLanguage'] == "string" && mandatoryData['pageLanguage'].trim().length == 0) ? 'incorrect-o' : 'incorrect-o';
      this._throwError('o', 'pageLanguage', determineErrorCase, '', '(has to follow ISO standard of 2 letters in uppercase)');
      mandatoryData['pageLanguage'] = '';
    }
  } else {
    mandatoryData['pageLanguage'] = (mandatoryData['pageLanguage'] || "").toLowerCase();
  }
}


// **************************
// * VARIABLE MAPPING: PAGE *
// **************************

if (typeof mandatoryData['pageName'] != 'undefined') {
  this.message.page.pageInfo.pageName = mandatoryData['pageName']
  this.message.event[0].eventInfo.effect = "page: " + mandatoryData['pageName'] + " shown"
}

if (typeof this.message.custom != "undefined" && this.message.event[0].eventInfo.eventName == 'page view' || this.message.event[0].eventInfo.eventName == 'error') {
  if (typeof this.message.page != 'undefined') {

    if (typeof mandatoryData['pageBrand'] != 'undefined') {
      this.message.page.attributes.brand = gFFWNV([
        () => mandatoryData['pageBrand']
      ]);
    }

    this.message.page.attributes.timeZone = ((new Date()).getTimezoneOffset() / 60) + ':00'; // should be Please provide the ISO 8601 time code format "ï¿½hh:mm". If the time is in UTC, add a Z . Z is the zone designator for the zero UTC offset:

    this.message.page.category.primaryCategory = gFFWNV([
      () => mandatoryData['componentName'],
      () => this.message.component[0].componentInfo.componentName
    ]);

    if (typeof mandatoryData['pageSubCat1'] != 'undefined') {
      this.message.page.category.subCategory1 = gFFWNV([
        () => mandatoryData['pageSubCat1']
      ]);
    }

    if (typeof mandatoryData['pageSubCat2'] != 'undefined') {
      this.message.page.category.subCategory2 = gFFWNV([
        () => mandatoryData['pageSubCat2']
      ]);
    }

    if (typeof mandatoryData['pageSubCat3'] != 'undefined') {
      this.message.page.category.subCategory3 = gFFWNV([
        () => mandatoryData['pageSubCat3']
      ]);
    }

    if (typeof mandatoryData['pageType'] != 'undefined') {
      this.message.page.category.pageType = gFFWNV([
        () => mandatoryData['pageType']
      ]);
    }

    if (typeof mandatoryData['componentDEVagency'] != 'undefined') {
      this.message.page.pageInfo.author = gFFWNV([
        () => mandatoryData['componentDEVagency']
      ]);
    }

    this.message.page.pageInfo.destinationURL = document.location.href; // URL of current page

    if (typeof mandatoryData['pageGeoRegion'] != 'undefined') {
      this.message.page.pageInfo.geoRegion = gFFWNV([
        () => mandatoryData['pageGeoRegion']
      ]);
    }

    if (typeof mandatoryData['pageLanguage'] != 'undefined') {
      this.message.page.pageInfo.language = gFFWNV([
        () => mandatoryData['pageLanguage']
      ]);
    }

    this.message.page.pageInfo.pageName = prefix + this.message.page.pageInfo.pageName;

    this.message.page.pageInfo.referringURL = document.referrer; // URL of previous page

    if (typeof mandatoryData['pageSysEnv'] != 'undefined') {
      this.message.page.pageInfo.sysEnv = gFFWNV([
        () => mandatoryData['pageSysEnv']
      ]);
    }

    if (typeof mandatoryData['pageVariant'] != 'undefined') {
      this.message.page.pageInfo.variant = gFFWNV([
        () => mandatoryData['pageVariant']
      ]);
    }

    this.message.page.pageInfo.version = gFFWNV([
      () => mandatoryData['pageVersion'],
      () => mandatoryData['componentVersion']
    ]);
  }
}

// *** end eventHandlerPages.js ***

if (typeof mandatoryData['pageSubCat1'] != 'undefined' && this.message.page.pageInfo.pageName == prefix + 'configure' ) {
  this.message.page.pageInfo.pageName= this.message.page.pageInfo.pageName +" "+ mandatoryData['pageSubCat1'];
}


//map modelCode to options if present in vehicle
var vehicleCodeVG;
if (mandatoryData && mandatoryData['vehicle']) {
  for (var i in mandatoryData['vehicle']) {
    if (mandatoryData['vehicle'][i]['codeVG'] && typeof mandatoryData['vehicle'][i]['codeVG'] != "undefined")
      vehicleCodeVG = mandatoryData['vehicle'][i]['codeVG'];
  }
}

if (typeof mandatoryData != 'undefined' && typeof mandatoryData['options'] != 'undefined') {
  if (mandatoryData['options'].length > 0) {
    for (var i in mandatoryData['options']) {
      if (typeof mandatoryData['options'][i]['codeVG'] == "undefined") {
        mandatoryData['options'][i]['codeVG'] = vehicleCodeVG;
      }
    }
  }
}


// *** start eventHanderVehicles.js ***

// *********************************
// * VALUE CHECKS: PRODUCT VEHICLE *
// *********************************

var variable = (typeof this != 'undefined') && this;

var includePriceCalculationVehicle = false;

// validate vehicle range
if (typeof mandatoryData != 'undefined' && typeof mandatoryData['vehicle'] != "undefined" && mandatoryData['vehicle'].length > 0 && this.events[eventName].mandatoryData.indexOf('vehicle[n].range') > -1) {
    var flagVariable = false;
    for (var i in mandatoryData['vehicle']) {
        if (typeof mandatoryData['vehicle'][i]['range'] == 'undefined' && typeof mandatoryData['vehicle'][i]['rangeVG'] != 'undefined') {
            mandatoryData['vehicle'][i]['range'] = mandatoryData['vehicle'][i]['rangeVG'];
        } else if (typeof mandatoryData['vehicle'][i]['range'] == 'undefined' && typeof mandatoryData['vehicle'][i]['rangeVG'] == 'undefined') {
            flagVariable = true;
        }
    }
    if (flagVariable) {
        if (this.events[eventName].mandatoryData.indexOf('vehicle[n].range') > -1) {
            this._throwError('m', 'vehicle[n].range', 'missing', '');
            return;
        }
    }
} else if (this.events[eventName].mandatoryData.indexOf('vehicle[n].range') > -1 && typeof mandatoryData['vehicle'] == "undefined") {
    this._throwError('m', 'vehicle[n].range', 'missing', '');
    return;
}

if (this.events[eventName].optionalData.indexOf('vehicle[n].range') > -1) {
    for (var i in mandatoryData['vehicle']) {
        if (mandatoryData['vehicle'][i]['range'] == "") {
            this._throwError('o', 'vehicle[n].range', 'empty', '');
        }
    }
}


//value check for outeletBuno - direct convert to string
for (var i in mandatoryData['vehicle']) {
    if (Object.keys(mandatoryData['vehicle'][i]).indexOf('linkedDealerOutletBuno') > -1) {

        let numericRegex = /^[0-9]+$/;
        mandatoryData['vehicle'][i]['linkedDealerOutletBuno'] = (numericRegex.test(mandatoryData['vehicle'][i]['linkedDealerOutletBuno'])) ? parseInt(mandatoryData['vehicle'][i]['linkedDealerOutletBuno'], 10) : NaN;

        if (typeof mandatoryData['vehicle'][i]['linkedDealerOutletBuno'] != 'undefined' && ((typeof convertToNumeric(mandatoryData['vehicle'][i]['linkedDealerOutletBuno']) != "number") || isNaN(mandatoryData['vehicle'][i]['linkedDealerOutletBuno']))) {
            variable._throwError('o', `vehicle[n].linkedDealerOutletBuno`, 'incorrect-numeric', '');
            mandatoryData['vehicle'][i]['linkedDealerOutletBuno'] = '';
        } else if (typeof mandatoryData['vehicle'][i]['linkedDealerOutletBuno'] != 'undefined' && typeof convertToNumeric(mandatoryData['vehicle'][i]['linkedDealerOutletBuno']) == "number") {
            mandatoryData['vehicle'][i]['linkedDealerOutletBuno'] = convertToNumeric(mandatoryData['vehicle'][i]['linkedDealerOutletBuno']);
        }

        mandatoryData['vehicle'][i]['linkedDealerOutletBuno'] = "" + mandatoryData['vehicle'][i]['linkedDealerOutletBuno'];
        while (mandatoryData['vehicle'][i]['linkedDealerOutletBuno'].length > 1 && mandatoryData['vehicle'][i]['linkedDealerOutletBuno'].length < 5) {
            mandatoryData['vehicle'][i]['linkedDealerOutletBuno'] = '0' + mandatoryData['vehicle'][i]['linkedDealerOutletBuno'];
        }
    }
    if (Object.keys(mandatoryData['vehicle'][i]).indexOf('linkedDealerCount') > -1) {

        if (typeof mandatoryData['vehicle'][i]['linkedDealerCount'] != 'undefined' && typeof (mandatoryData['vehicle'][i]['linkedDealerCount']) != "number") {
            if (variable.events[eventName].mandatoryData.indexOf(`vehicle[n].linkedDealerCount`) > -1) {
                variable._throwError('m', `vehicle[n].linkedDealerCount`, 'incorrect-numeric', '');
                return;
            } else {
                variable._throwError('o', `vehicle[n].linkedDealerCount`, 'incorrect-numeric', '');
                mandatoryData['vehicle'][i]['linkedDealerCount'] = '';
            }
        } else if (typeof mandatoryData['vehicle'][i]['linkedDealerCount'] != 'undefined' && typeof (mandatoryData['vehicle'][i]['linkedDealerCount']) == "number") {
            mandatoryData['vehicle'][i]['linkedDealerCount'] = convertToNumeric(mandatoryData['vehicle'][i]['linkedDealerCount']);
        }

    }
}


var productIDGenerate = 0;

function convertToNumeric(value) {
    if (typeof value === 'number') {
        return value;
    }

    if (!isValidNumericFormat(value)) {
        return null;
    }
    return Number(value.replace(/,/g, ''));
}


//vehicle data validation
function convertToLowerCase(argsData) {
    //validate of the data exists
    //Convert to lower case apart from the productID and Codes  
    //Applicable for vehicle
    let retainCase = ['codeAG', 'codeVG', 'rangeAG', 'rangeVG', 'name', 'productID', 'range', 'modelCode', 'modelCodeAG', 'mmdr', 'mmdrVG'];
    if (argsData && argsData.vehicle != undefined) {
        for (var i = 0; i <= argsData.vehicle.length; i++) {
            for (var j in argsData.vehicle[i]) {
                if (retainCase.indexOf(j) < 0) {
                    argsData.vehicle[i][j] = (typeof argsData.vehicle[i][j] == "string") ? argsData.vehicle[i][j].toLowerCase() : argsData.vehicle[i][j];
                }
            }
        }
    }
}

function validateVehicleData(itemName, itemValue) {
    let retainCase = ['codeAG', 'codeVG', 'rangeAG', 'rangeVG'];
    if (retainCase.indexOf(itemName) < 0) {
        itemValue = (typeof itemValue == 'String') ? (itemValue || "").toLowerCase() : itemValue;
    }
    let valueTypes = {
        "bodyType": {
            "values": variable.allowedVehicleBodyType
        },
        "businessDivision": {
            "values": variable.allowedVehicleBusinessDivision
        },
        "category1": {
            "values": variable.allowedVehicleCategory1
        },
        "codeAG": {
            "condition": "only 4 characters"
        },
        "codeVG": {
            "condition": "only 4 characters"
        },
        "fuelType": {
            "values": variable.allowedVehicleFuelType
        },
        "hybridVersion": {
            "values": variable.allowedVehicleHybridVersion
        },
        "primaryCategory": {
            "values": variable.allowedVehiclePrimaryCategory
        },
        "series": {
            "values": variable.allowedVehicleSeries
        },
        "salesModel": {
            "values": variable.allowedVehicleSalesModel
        },
        "status": {
            "values": variable.allowedVehicleStatus
        },
        // "category2": {
        //     "values": variable.allowedVehicleCategory2
        // },
    }
    let returnValue;
    if (valueTypes[itemName]) {
        let checkValue = valueTypes[itemName];
        if (checkValue['condition']) {
            if (checkValue['condition'] == "only 4 characters") {
                returnValue = (itemValue.length == 4) ? true : false;
            } else if (checkValue['condition'] == "only 3 characters") {
                returnValue = (itemValue.length == 3) ? true : false;
            } else if (checkValue['condition'] == "only 3 characters OR 4 if the last is 'E'") {
                returnValue = (itemValue.length == 4 && itemValue[itemValue.length - 1] == "E") ? true : (itemValue.length == 3) ? true : false;
            }
        } else {
            returnValue = (valueTypes[itemName].values.indexOf(itemValue) > -1) ? true : false;
        }
    } else {
        returnValue = true;
    }
    return returnValue;
}


function _requiredParams(eventName, mandatoryData, checkKeys, obj) {
    let expectedData = checkKeys;
    let errArrayVal = [];
    let value;

    let valueChecks = Object.keys(obj).map(v => v.toLowerCase());

    for (let i = 0; i < expectedData.length; i++) {
        let expectedKey = expectedData[i];
        if (expectedKey.indexOf('[n]') > -1) {
            let splitKey = expectedKey.split('[n]');
            if (splitKey[0] == 'vehicle') {
                let checkValue;
                if (typeof mandatoryData[expectedKey.split('[n]')[0]] != 'undefined') {
                    value = mandatoryData[expectedKey.split('[n]')[0]][0][expectedKey.split('[n]')[1].replace('.', '')];
                    checkValue = validateVehicleData(splitKey[1].replace('.', ''), value);
                } else {
                    checkValue = false;
                }

                let searchArray = valueChecks.filter(s => s.includes('vehicle' + expectedKey.split('[n]')[1].replace('.', '').toLowerCase()));
                searchArray = (searchArray.length > 0) ? searchArray[0] : "";
                let possibleValues = obj[Object.keys(obj)[valueChecks.indexOf((searchArray || ""))]] || [];

                if (checkValue == false) {
                    // if provided check for valid content (non-empty strings)
                    if (typeof value == "string" && value.trim().length == 0) {
                        errArrayVal.push(expectedKey);
                        variable._throwError('m', expectedKey, 'empty', possibleValues);
                    } else {
                        errArrayVal.push(expectedKey);
                        variable._throwError('m', expectedKey, 'incorrect', possibleValues);
                    }
                }
                // check if all required data is provided
                if (typeof value == "undefined") {
                    variable._throwError('m', expectedKey, 'missing');
                }
            }
        }
    }

    if (errArrayVal.length > 0) {
        //throw (`value does not match expected values: ${errArrayVal}`);
        throw ('');
    }

    return true;
}

function _optionalParams(eventName, mandatoryData, optionalData, obj) {
    let expectedData = optionalData;
    let errArrayVal = [];
    let valueChecks = Object.keys(obj).map(v => v.toLowerCase());
    for (let i = 0; i < expectedData.length; i++) {
        let expectedKey = expectedData[i];
        let value;
        if (expectedKey.indexOf('[n]') > -1) {
            let splitKey = expectedKey.split('[n]');
            //For vehicle specific
            if (expectedKey.split('[n]')[0] == 'vehicle') {
                if (mandatoryData['vehicle'] && mandatoryData['vehicle'].length > 0) {
                    for (var index = 0; index <= mandatoryData['vehicle'].length - 1; index++) {
                        value = mandatoryData[expectedKey.split('[n]')[0]][index][expectedKey.split('[n]')[1].replace('.', '')];
                        if (typeof value != "undefined") {
                            let checkValue = validateVehicleData(splitKey[1].replace('.', ''), value);
                            if (checkValue == false) {

                                let searchArray = valueChecks.filter(s => s.includes('vehicle' + expectedKey.split('[n]')[1].replace('.', '').toLowerCase()));
                                searchArray = (searchArray.length > 0) ? searchArray[0] : "";
                                let possibleValues = obj[Object.keys(obj)[valueChecks.indexOf(searchArray)]] || [];

                                mandatoryData[expectedKey.split('[n]')[0]][index][expectedKey.split('[n]')[1].replace('.', '')] = ''
                                errArrayVal.push(expectedKey);

                                let determineErrorCase = (typeof value == "string" && value.trim().length == 0) ? 'incorrect-o' : 'incorrect-o';
                                variable._throwError('o', expectedKey, determineErrorCase, possibleValues);
                            }
                        }
                    }
                }
            }
        }
    }
    //if (errArrayVal.length > 0) {}
    return true;
}

try {
    convertToLowerCase(mandatoryData);
    _requiredParams(eventName, mandatoryData, this.events[eventName].mandatoryData, this);
    if (this.events[eventName].optionalData) {
        _optionalParams(eventName, mandatoryData, this.events[eventName].optionalData, this);
    }
} catch (error) {
    //this._throwError("wrong mandatoryData input for function " + eventName, error);
    return false;
}

// *************************************
// * VARIABLE MAPPING: PRODUCT VEHICLE *
// *************************************

this.message.product = [];
if (typeof mandatoryData != 'undefined' && mandatoryData['vehicle']) {
    mandatoryData['vehicle'].forEach((vehicle) => {

        let productElement = JSON.parse(JSON.stringify(this.productSchema));

        let vehicleConst = PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.vehicle;

        productElement.productInfo.productID = gFFWNV([
            () => vehicleConst.productID,
            () => vehicle['productID'],
            () => vehicle['codeVG'],
            () => vehicle['codeAG'],
            () => vehicle['range'],
            () => "product" + (productIDGenerate + 1)
        ]);
        productElement.productInfo.productName = gFFWNV([
            () => vehicleConst.productName,
            () => vehicle['name']
        ]);
        productElement.category.productType = gFFWNV([
            () => vehicleConst.productType,
            () => vehicle['businessDivision']
        ]);
        productElement.category.primaryCategory = gFFWNV([
            () => vehicleConst.primaryCategory,
            () => vehicle['primaryCategory']
        ]);
        productElement.category.subCategory1 = gFFWNV([
            () => vehicleConst.subCategory1,
            () => vehicle['category1']
        ]);
        productElement.category.subCategory2 = gFFWNV([
            () => vehicleConst.subCategory2,
            () => vehicle['category2']
        ]);
        productElement.category.subCategory3 = gFFWNV([
            () => vehicleConst.subCategory3,
            () => vehicle['category3']
        ]);

        productElement.productInfo.manufacturer = gFFWNV([
            () => vehicleConst.manufacturer,
            () => vehicle['manufacturer']
        ]);
        productElement.attributes.bodyType = gFFWNV([
            () => vehicleConst.bodyType,
            () => vehicle['bodyType']
        ]);
        productElement.attributes.modelCodeAG = gFFWNV([
            () => vehicleConst.modelCodeAG,
            () => vehicle['codeAG']
        ]);
        productElement.attributes.modelCodeAG = (productElement.attributes.modelCodeAG || "").toUpperCase();

        productElement.attributes.modelCode = gFFWNV([
            () => vehicleConst.modelCode,
            () => vehicle['codeVG']
        ]);
        productElement.attributes.modelCode = (productElement.attributes.modelCode || "").toUpperCase();

        productElement.productInfo.color = gFFWNV([
            () => vehicleConst.color,
            () => vehicle['color']
        ]);
        productElement.attributes.motorization = gFFWNV([
            () => vehicleConst.motorization,
            () => vehicle['engine']
        ]);
        productElement.attributes.fuelType = gFFWNV([
            () => vehicleConst.fuelType,
            () => vehicle['fuelType']
        ]);
        productElement.attributes.gearing = gFFWNV([
            () => vehicleConst.gearing,
            () => vehicle['gearing']
        ]);
        productElement.attributes.hybridVersion = gFFWNV([
            () => vehicleConst.hybridVersion,
            () => vehicle['hybridVersion']
        ]);
        productElement.attributes.mmdr = gFFWNV([
            () => vehicleConst.mmdr,
            () => vehicle['rangeVG'],
            () => vehicle['range']
        ]);
        productElement.attributes.mmdr = (productElement.attributes.mmdr || "").toUpperCase();
        productElement.attributes.series = gFFWNV([
            () => vehicleConst.series,
            () => vehicle['series']
        ]);
        productElement.attributes.modelName = gFFWNV([
            () => vehicleConst.modelName,
            () => vehicle['subSeries']
        ]);
        productElement.attributes.status = gFFWNV([
            () => vehicleConst.status,
            () => vehicle['status']
        ]);
        productElement.attributes.productionYear = gFFWNV([
            () => vehicleConst.productionYear,
            () => vehicle['yearOfProduction']
        ]);
        productElement.attributes.yearOfRegistration = gFFWNV([
            () => vehicleConst.yearOfRegistration,
            () => vehicle['yearOfRegistration']
        ]);
        productElement.attributes.encVIN = gFFWNV([
            () => vehicleConst.encVIN,
            () => vehicle['encVIN']
        ]);
        productElement.attributes.salesModel = gFFWNV([
            () => vehicleConst.salesModel,
            () => vehicle['salesModel']
        ]);

        productElement.attributes.packageID = gFFWNV([
            () => vehicleConst.packageID,
            () => vehicle['packageID']
        ]);

        productElement.attributes.linkedDealerOutletBuno = gFFWNV([
            () => vehicleConst.linkedDealerOutletBuno,
            () => vehicle['linkedDealerOutletBuno']
        ]);

        productElement.attributes.linkedDealerCount = gFFWNV([
            () => vehicleConst.linkedDealerCount,
            () => vehicle['linkedDealerCount']
        ]);

        productElement = JSON.parse(JSON.stringify(productElement, (k, v) => (v == "" ? undefined : v)));
        this.message.product.push(productElement);

        if (vehicle['itemBasePrice'] != undefined || vehicle['itemDiscountSalesAmount'] != undefined || vehicle['itemDiscountOtherAmount'] != undefined || vehicle['itemTaxAmount'] != undefined || vehicle['itemPriceWithTax'] != undefined) {
            includePriceCalculationVehicle = true;
        }
    });
}


if (includePriceCalculationVehicle) {
    // *** start eventHandlerCart.js ***

this.message.cart.item = [];

 /* ðŸ’¡ AAAA-5442 @Naveen: please ensure the following calculations and mappings
adobeDataLayer.cart.item('productID').quantity =  data['itemQuantity'] || 1
adobeDataLayer.cart.item('productID').price.basePrice = data['itemBasePrice']
adobeDataLayer.cart.item('productID').price.voucherCode = data['itemVoucherCode'] || data['itemSalesVoucherType'] || 0
adobeDataLayer.cart.item('productID').price.attributes.discountAmount = data['itemDiscountAmount'] || data['itemSalesDiscountAmount']  0
adobeDataLayer.cart.item('productID').price.attributes.discountAmountSum = data['itemOtherDiscountAmount'] + data['itemSalesDiscountAmount'] || 0
adobeDataLayer.cart.item('productID').price.attributes.taxAmount = data['itemTaxAmount'] || 0
adobeDataLayer.cart.item('productID').price.priceWithTax = (data['itemBasePrice'] - (data['itemOtherDiscountAmount'] + data['itemSalesDiscountAmount']) + data['itemTaxAmount'] ) (if any of those parameters are undefined, but data['itemPriceWithTax'] is not undefined then map it ||  0
adobeDataLayer.cart.item('productID').price.shippingMethod = data['itemShippingMethod']
adobeDataLayer.cart.price.currency = mandatoryData['totalCurrency']
adobeDataLayer.cart.price.basePrice = âˆ‘ ( data['itemBasePrice'] ) || mandatoryData['totalBasePrice'] || 0
adobeDataLayer.cart.price.attributes.discountItemAmounts = âˆ‘ ( data['itemOtherDiscountAmount'] + data['itemSalesDiscountAmount']  ) || 0
adobeDataLayer.cart.price.attributes.discountAmountAdditional = ['totalOtherDiscountAmount'] 
adobeDataLayer.cart.price.attributes.discountAmountSum = (  .discountItemAmounts  + .discountAmountAdditional ) || mandatoryData['totalDiscountAmount'] || 0
adobeDataLayer.cart.price.attributes.taxItemsAmount = âˆ‘ ( data['itemTaxAmount'] ) || 0
adobeDataLayer.cart.price.attributes.taxAmount = mandatoryData['totalTaxAmount'] || 0
adobeDataLayer.cart.price.attributes.taxAmountSum = âˆ‘ ( data['itemTaxAmount'] ) + mandatoryData['totalTaxAmount'] || 0
adobeDataLayer.cart.price.priceWithTax = ( .basePrice - .discountAmountSum + .taxAmountSum )|| mandatoryData['totalPriceWithTax'] || 0
adobeDataLayer.cart.price.shipping  = mandatoryData['totalShippingCost'] || 0
adobeDataLayer.cart.price.cartTotal = .priceWithTax + mandatoryData['totalShippingCost'] || 0
note: we don't map percent anymore (taxRate, discountPercent), only absolut currency numbers
  ðŸ’¡ end comment for AAAA-5442 */

 //*** start priceCheckAndCalculation.js ***

 if (typeof variable == "undefined") {
     variable = this;
 }

 // *********************
 // * CONVERT TO NUMBER *
 // *********************

 //Convert to Numeric
 function isValidNumericFormat(value) {
     // Use a regular expression to check the format
     const pattern = /^\d{1,3}(,\d{3})*(\.\d+)?$/;
     return pattern.test(value);
 }

 function convertToNumeric(value) {
     if (typeof value === 'number') {
         // Return the value as-is if it's already a number
         return value;
     }

     if (!isValidNumericFormat(value)) {
         // Return null if the value is not in the correct format
         return null;
     }
     // Remove the commas and convert the value to a number
     return Number(value.replace(/,/g, ''));
 }

 function roundToDecimal(number, decimalPlaces) {
     decimalPlaces = decimalPlaces || 2;
     const factor = 10 ** decimalPlaces;
     return +(Math.round(number * factor) / factor).toFixed(decimalPlaces);
 }

 // **********************
 // * PRICE CALCULATIONS *
 // **********************

 var total_basePrice = 0;
 var total_priceWithTax = 0;
 var total_shipping = 0;
 var total_taxAmount = 0;
 var total_voucherDiscount = 0;
 var total_DiscountAmount = 0;
 var total_DiscountPercent = 0;
 var total_quantity = 0;
 var total_itemOtherDiscountAmount = 0;
 var total_itemSalesDiscountAmount = 0;
 var total_DiscountAmountSum = 0;

 function calculateValues(data) {
     if (data && data.length > 0) {
         for (var i in data) {
             //Calculated in the cart and transaction
             // if (typeof data[i].itemBasePrice != 'undefined' && (typeof data[i].itemDiscountAmount == 'undefined' || data[i].itemDiscountAmount == 0) && typeof data[i].itemDiscountPercent != 'undefined') {
             //     data[i].itemDiscountAmount = data[i].itemBasePrice * data[i].itemDiscountPercent;
             //     data[i].itemDiscountAmount = roundToDecimal(data[i].itemDiscountAmount, 2);
             // }

             // if (typeof data[i].itemBasePrice != 'undefined' && typeof data[i].itemDiscountAmount != 'undefined' && typeof data[i].itemTaxRate != 'undefined' && (typeof data[i].itemTaxAmount == 'undefined' || data[i].itemTaxAmount == 0)) {
             //     data[i].itemTaxAmount = (data[i].itemBasePrice - data[i].itemDiscountAmount) * data[i].itemTaxRate;
             //     data[i].itemTaxAmount = roundToDecimal(data[i].itemTaxAmount, 2);
             // }

             // if (typeof data[i].itemBasePrice != 'undefined' && typeof data[i].itemDiscountAmount != 'undefined' && typeof data[i].itemTaxAmount != 'undefined' && (typeof data[i].itemPriceWithTax == 'undefined' || data[i].itemPriceWithTax == 0)) {
             //     data[i].itemPriceWithTax = (data[i].itemBasePrice - data[i].itemDiscountAmount) + data[i].itemTaxAmount;
             //     data[i].itemPriceWithTax = roundToDecimal(data[i].itemPriceWithTax, 2);
             // }

             data[i].itemPriceWithTax = ((+(data[i].itemBasePrice || 0)) + ((+(data[i].itemDiscountSalesAmount || 0)) + (+(data[i].itemDiscountOtherAmount || 0)))) + (+(data[i].itemTaxAmount || 0));

             data[i].itemPriceWithTax = roundToDecimal(data[i].itemPriceWithTax, 2);
         }
     }
 }

 // if (mandatoryData && mandatoryData.vehicle) {
 //     //calculateValues(mandatoryData.vehicle);
 // }

 // if (mandatoryData && mandatoryData.options) {
 //     //calculateValues(mandatoryData.options);
 // }

 function validateNumericValue(value) {
     return typeof value === 'number' && !isNaN(value);
 }

 function toNegativeNumber(input) {
     return -1 * Math.abs(Number(input));
 }

 function handleNumericValue(property, obj, dataIndex, numericType) {
     var flagDetermine;
     if (numericType == 'negative') {
        //if provided as positive then convert to negative number;
         obj[property] = toNegativeNumber(obj[property]);
         flagDetermine = !(typeof obj[property] == 'number' && obj[property] < 0);
     } else {
         flagDetermine = (typeof convertToNumeric(obj[property]) != "number");
     }
     if (obj[property]) {
         if (flagDetermine) {
             flagDetermine = (numericType == 'negative') ? 'incorrect-numeric' : 'incorrect-numeric';
             if (variable.events[eventName].mandatoryData.indexOf(dataIndex) > -1) {
                 variable._throwError('m', dataIndex, flagDetermine, '');
                 return;
             } else {
                 variable._throwError('o', dataIndex, flagDetermine, '');
                 obj[property] = '';
             }
         } else {
             if (typeof convertToNumeric(obj[property]) == "number" && ['itemBasePrice', 'itemPriceWithTax', 'itemQuantity', 'itemShippingCost', 'itemTaxAmount', 'itemTaxRate'].indexOf(property) > -1) {
                 obj[property] = convertToNumeric(obj[property]);
                 obj[property] = roundToDecimal(obj[property], 2);
             }
         }
         //  if (['itemDiscountOtherAmount', 'itemDiscountSalesAmount'].indexOf(property) > -1) {
         //      obj[property] = toNegativeNumber(obj[property]);
         //      obj[property] = roundToDecimal(obj[property], 2);
         //  }
     }
 }

 function handleNumericData(dataArray, dataKey) {
     for (var i = 0; i < dataArray.length; i++) {
         var dataItem = dataArray[i];
         handleNumericValue('itemBasePrice', dataItem, dataKey + '[n].itemBasePrice');
         handleNumericValue('itemDiscountSalesAmount', dataItem, dataKey + '[n].itemDiscountSalesAmount', 'negative');
         handleNumericValue('itemDiscountOtherAmount', dataItem, dataKey + '[n].itemDiscountOtherAmount', 'negative');
         handleNumericValue('itemPriceWithTax', dataItem, dataKey + '[n].itemPriceWithTax', dataKey + '[n].itemPriceWithTax');
         handleNumericValue('itemQuantity', dataItem, dataKey + '[n].itemQuantity');
         handleNumericValue('itemTaxAmount', dataItem, dataKey + '[n].itemTaxAmount');
     }
 }

 // *****************************
 // * VALUE CHECKS: TOTAL PRICE *
 // *****************************
 if (!window.TRON.priceCalculation) {
     const properties = [
         'totalBasePrice',
         'totalDiscountAmount',
         'totalDiscountPercent',
         'totalFinalPrice',
         'totalPriceWithTax',
         'totalShippingCost',
         'totalTaxAmount',
         'totalTaxAmountAdditional',
         'totalDiscountAmountAdditional',
         'totalCurrency'
     ];

     for (const property of properties) {
         if (property == 'totalCurrency') {
             //Value check for totalCurrency
             if (typeof mandatoryData != 'undefined' && typeof mandatoryData['totalCurrency'] != 'undefined') {
                 if ((mandatoryData['totalCurrency'].length != 3) || (mandatoryData['totalCurrency'] !== mandatoryData['totalCurrency'].toUpperCase())) {
                     if (this.events[eventName].mandatoryData.indexOf('totalCurrency') > -1) {
                         let determineErrorCase = (typeof mandatoryData['totalCurrency'] == "string" && mandatoryData['totalCurrency'].trim().length == 0) ? 'empty' : 'incorrect';
                         this._throwError('m', 'totalCurrency', determineErrorCase, '', '(has to follow ISO 3-letter currency code all upper case)');
                         return;
                     } else {
                         let determineErrorCase = (typeof mandatoryData['totalCurrency'] == "string" && mandatoryData['totalCurrency'].trim().length == 0) ? 'incorrect-o' : 'incorrect-o';
                         this._throwError('o', 'totalCurrency', determineErrorCase, '', '(has to follow ISO 3-letter currency code all upper case)');
                         mandatoryData['totalCurrency'] = '';
                     }
                 }
             }
         } else {
             var value = mandatoryData && mandatoryData[property];
             var flagDetermine;
             if (['totalDiscountAmount', 'totalDiscountAmountAdditional'].indexOf(property) > -1) {
                //if provided as positive then convert to negative number;
                 value = toNegativeNumber(value);
                 flagDetermine = !(typeof value == 'number' && value < 0);
             } else {
                 flagDetermine = (typeof convertToNumeric(value) != "number");
             }
             if (value) {
                 if (flagDetermine) {
                     flagDetermine = (['totalDiscountAmount', 'totalDiscountAmountAdditional'].indexOf(property) > -1) ? 'incorrect-numeric' : 'incorrect-numeric';
                     if (variable.events[eventName].mandatoryData.indexOf(property) > -1) {
                         variable._throwError('m', property, flagDetermine, '');
                         return;
                     } else {
                         variable._throwError('o', property, flagDetermine, '');
                         mandatoryData[property] = '';
                     }
                 } else {
                     mandatoryData[property] = convertToNumeric(mandatoryData[property]);
                     mandatoryData[property] = roundToDecimal(mandatoryData[property], 3);
                 }
             }
         }
     }

     window.TRON.priceCalculation = true;
 }

 // ***************************************
 // * VALUE CHECKS: PRODUCT VEHICLE PRICE *
 // ***************************************

 if (typeof mandatoryData != 'undefined' && typeof mandatoryData['vehicle'] != 'undefined' && mandatoryData['vehicle'].length > 0) {
     handleNumericData(mandatoryData['vehicle'], 'vehicle');
 }

 // ***************************************
 // * VALUE CHECKS: PRODUCT OPTIONS PRICE *
 // ***************************************

 if (typeof mandatoryData != 'undefined' && typeof mandatoryData['options'] != 'undefined' && mandatoryData['options'].length > 0) {
     handleNumericData(mandatoryData['options'], 'options');
 }

 //*** end priceCheckAndCalculation.js ***

// **************************
// * VARIABLE MAPPING: CART *
// **************************

//process the products that are already processed from eventhandler options and evenhandler vehicles
var productsProcessed = {};
for (var i in this.message.product) {
    productsProcessed[this.message.product[i].productInfo.productID] = this.message.product[i];
}

function processCartItem(data, objectRef) {
    let cartItemElement = JSON.parse(JSON.stringify(objectRef));
    cartItemElement = Object.assign({}, cartItemElement, productsProcessed[data['productID']]);

    cartItemElement.quantity = gFFWNV([
        () => data['itemQuantity'],
        () => 1
    ]);
    total_quantity += cartItemElement.quantity;

    cartItemElement.price.basePrice = +(gFFWNV([
        () => data['itemBasePrice'],
        () => 0
    ]) || 0);
    cartItemElement.price.basePrice = roundToDecimal(cartItemElement.price.basePrice, 2);
    total_basePrice += cartItemElement.price.basePrice;

    cartItemElement.price.voucherCode = (gFFWNV([
        () => data['itemVoucherCode'],
        () => data['itemSalesVoucherType'],
        () => ''
    ]) || '');

    cartItemElement.price.discountAmount = +(gFFWNV([
        //() => data['itemDiscountAmount'],
        () => data['itemSalesDiscountAmount'],
        () => data['itemDiscountSalesAmount'],
        () => 0
    ]) || 0);
    cartItemElement.price.discountAmount = roundToDecimal(cartItemElement.price.discountAmount, 2);
    total_DiscountAmount += cartItemElement.price.discountAmount;
    total_itemSalesDiscountAmount += cartItemElement.price.discountAmount;

    cartItemElement.price.discountAmountOther = +(gFFWNV([
        () => data['itemOtherDiscountAmount'],
        () => data['itemDiscountOtherAmount'],
        () => 0
    ]) || 0);
    cartItemElement.price.discountAmountOther = roundToDecimal(cartItemElement.price.discountAmountOther, 2);
    total_DiscountAmount += cartItemElement.price.discountAmountOther;
    total_itemOtherDiscountAmount += cartItemElement.price.discountAmountOther;

    //Calculated
    cartItemElement.price.discountAmountSum = +(cartItemElement.price.discountAmount + cartItemElement.price.discountAmountOther);
    cartItemElement.price.discountAmountSum = toNegativeNumber(cartItemElement.price.discountAmountSum);
    cartItemElement.price.discountAmountSum = roundToDecimal(cartItemElement.price.discountAmountSum, 2);
    total_DiscountAmountSum += cartItemElement.price.discountAmountSum;

    cartItemElement.price.taxAmount = +(gFFWNV([
        () => data['itemTaxAmount'],
        () => 0
    ]) || 0);
    cartItemElement.price.taxAmount = roundToDecimal(cartItemElement.price.taxAmount, 2);
    total_taxAmount += cartItemElement.price.taxAmount;

    //if(typeof data['itemPriceWithTax'] != 'undefined'){
        cartItemElement.price.priceWithTax = +(gFFWNV([
            () => data['itemPriceWithTax'],
            () => ((cartItemElement.price.basePrice + (cartItemElement.price.discountAmountSum)) + cartItemElement.price.taxAmount),
            () => 0
        ]) || 0);
    // }else{
    //     cartItemElement.price.priceWithTax = 0;
    // }
    //cartItemElement.price.priceWithTax = data['itemPriceWithTax'] || 0;
    cartItemElement.price.priceWithTax = roundToDecimal(cartItemElement.price.priceWithTax, 2);
    total_priceWithTax += cartItemElement.price.priceWithTax;

    cartItemElement.price.shippingMethod = (gFFWNV([
        () => data['itemShippingMethod'],
        () => ''
    ]) || '');
    cartItemElement.price.shippingMethod = (cartItemElement.price.shippingMethod).toLowerCase();

    return cartItemElement;
}

if (mandatoryData !== undefined && mandatoryData['vehicle']) {
    for (var i in mandatoryData['vehicle']) {
        var cartProcessedElement = processCartItem(mandatoryData['vehicle'][i], this.defaultDatalayer.cart.item[0]);
        this.message.cart.item.push(cartProcessedElement);
    }
    //mandatoryData['vehicle'].forEach(vehicle => processCartItem('vehicle', vehicle, this.defaultDatalayer.cart.item[0]));
}

if (mandatoryData !== undefined && mandatoryData['options']) {
    for (var i in mandatoryData['options']) {
        var cartProcessedElement = processCartItem(mandatoryData['options'][i], this.defaultDatalayer.cart.item[0]);
        this.message.cart.item.push(cartProcessedElement);
    }
    //mandatoryData['options'].forEach(option => processCartItem('options', option, this.defaultDatalayer.cart.item[0]));
}

//Note: Developers are responsible for sending the amount * quantity
if (typeof this.message.custom != "undefined" && (mandatoryData['vehicle'] || mandatoryData['options'])) {

    this.message.cart.price = {};

    this.message.cart.price.currency = (gFFWNV([
        () => mandatoryData['totalCurrency'],
        () => ''
    ]) || '');
    this.message.cart.price.currency = (this.message.cart.price.currency).toUpperCase(); // regular eVar - no array

    this.message.cart.price.basePrice = +(gFFWNV([
        () => mandatoryData['totalBasePrice'],
        () => total_basePrice,
        () => 0
    ]) || 0);
    this.message.cart.price.basePrice = roundToDecimal(this.message.cart.price.basePrice, 2);

    this.message.cart.price.discountItemAmounts = (gFFWNV([
        () => total_DiscountAmountSum,
        () => 0
    ]) || 0);
    this.message.cart.price.discountItemAmounts = toNegativeNumber(this.message.cart.price.discountItemAmounts);
    this.message.cart.price.discountItemAmounts = roundToDecimal(this.message.cart.price.discountItemAmounts, 2);

    this.message.cart.price.discountAmountAdditional = +(gFFWNV([
        () => mandatoryData['totalDiscountAmountAdditional'],
        () => 0
    ]) || 0);
    this.message.cart.price.discountAmountAdditional = toNegativeNumber(this.message.cart.price.discountAmountAdditional);

    this.message.cart.price.discountAmountSum = +(gFFWNV([
        () => mandatoryData['totalDiscountAmount'],
        () => (this.message.cart.price.discountItemAmounts + this.message.cart.price.discountAmountAdditional),
        () => 0
    ]) || 0);
    this.message.cart.price.discountAmountSum = toNegativeNumber(this.message.cart.price.discountAmountSum);
    this.message.cart.price.discountAmountSum = roundToDecimal(this.message.cart.price.discountAmountSum, 2);
    
    this.message.cart.price.taxItemsAmount = (gFFWNV([
        () => total_taxAmount,
        () => 0
    ]) || 0);
    this.message.cart.price.taxItemsAmount = roundToDecimal(this.message.cart.price.taxItemsAmount, 2);

    this.message.cart.price.shipping = +(gFFWNV([
        () => mandatoryData['totalShippingCost'],
        () => 0
    ]) || 0);
    this.message.cart.price.shipping = roundToDecimal(this.message.cart.price.shipping, 2);
    total_shipping = this.message.cart.price.shipping;

    this.message.cart.cartID = (gFFWNV([
        () => mandatoryData['cartID'],
        () => ''
    ]) || '');
    this.message.cart.cartID = (this.message.cart.cartID || "").toUpperCase();

    // this.message.cart.price.shippingMethod = (gFFWNV([
    //     () => mandatoryData['totalShippingMethod'],
    //     () => ''
    // ]) || '');

    this.message.cart.price.taxAmountAdditional = +(gFFWNV([
        () => mandatoryData['totalTaxAmountAdditional'],
        () => 0
    ]) || 0);

    //this.message.cart.price.taxAmount - removed
    this.message.cart.price.taxAmountSum = +(gFFWNV([
        () => (total_taxAmount + this.message.cart.price.taxAmountAdditional),
        () => 0
    ]) || 0);

    // this.message.cart.price.taxAmountSum = (gFFWNV([
    //     () => (total_taxAmount + (mandatoryData['totalTaxAmount'] || 0)),
    //     () => 0
    // ]) || 0);
    // this.message.cart.price.taxAmountSum = roundToDecimal(this.message.cart.price.taxAmountSum, 2);

    this.message.cart.price.priceWithTax = (gFFWNV([
        () => (mandatoryData['totalPriceWithTax']),
        () => ((this.message.cart.price.basePrice + this.message.cart.price.discountAmountSum) + this.message.cart.price.taxAmountSum),
        () => 0
    ]) || 0);
    this.message.cart.price.priceWithTax = roundToDecimal(this.message.cart.price.priceWithTax, 2);

    this.message.cart.price.cartTotal = +(gFFWNV([
        () => mandatoryData['totalFinalPrice'],
        () => (this.message.cart.price.priceWithTax + this.message.cart.price.shipping),
        () => 0
    ]) || 0);
    this.message.cart.price.cartTotal = roundToDecimal(this.message.cart.price.cartTotal, 2);

    // this.message.cart.price.taxRate = mandatoryData['totalTaxRate'] || 0; // regular eVar - no array
    // this.message.cart.price.taxRate = roundToDecimal(this.message.cart.price.taxRate, 2);
    // if (typeof mandatoryData['totalVoucherCode'] != 'undefined') {
    //     this.message.cart.price.voucherCode = mandatoryData['totalVoucherCode'];
    // }
    // this.message.cart.price.voucherDiscount = mandatoryData['totalVoucherDiscount'] || 0;
    // this.message.cart.price.voucherDiscount = roundToDecimal(this.message.cart.price.voucherDiscount, 2);
    //this.message.cart.price.cartTotal = (total_priceWithTax) + (total_shipping) || mandatoryData['totalFinalPrice'] || 0;
}

// *** end eventHandlerCart.js ***
//if transaction id exists then import
if(typeof mandatoryData['transactionID'] != "undefined"){
    // *** start eventHandlerTransactions.js ***

this.message.transaction.item = [];

// if (((this.events[eventName].event.eventInfo.eventName == "commerce") && ((this.events[eventName].event.eventInfo.type == "order"))) || ((mandatoryData && mandatoryData['transactionID'] || "") != "")) {

//Reset values
['total_basePrice', 'total_priceWithTax', 'total_shipping', 'total_taxAmount', 'total_voucherDiscount', 'total_DiscountAmount', 'total_DiscountPercent', 'total_quantity', 'total_itemOtherDiscountAmount', 'total_itemSalesDiscountAmount', 'total_DiscountAmountSum'].forEach(function(variableName) {
    try {
        if (typeof eval(variableName) !== 'undefined') {
            eval(variableName + ' = 0;');
        } else {
            eval('var ' + variableName + ' = 0;');
        }
    } catch (error) {
        //console.error('An error occurred:', error);
    }
});


// *********************************
// * VARIABLE MAPPING: TRANSACTION *
// *********************************

//process the products that are already processed from eventhandler options and evenhandler vehicles
var productsProcessed = {};
for (var i in this.message.product) {
    productsProcessed[this.message.product[i].productInfo.productID] = this.message.product[i];
}

// DATALAYER HELPER : transaction items
function processTransactionItem(item, objectRef) {
    let transactionItemElement = JSON.parse(JSON.stringify(objectRef));

    transactionItemElement = Object.assign({}, transactionItemElement, productsProcessed[item['productID']]);

    transactionItemElement.quantity = gFFWNV([
        () => item.itemQuantity,
        () => 1
    ]);
    total_quantity += transactionItemElement.quantity;

    transactionItemElement.price.basePrice = +(gFFWNV([
        () => item.itemBasePrice,
        () => 0
    ]) || 0);
    transactionItemElement.price.basePrice = roundToDecimal(transactionItemElement.price.basePrice, 2);
    total_basePrice += transactionItemElement.price.basePrice;

    transactionItemElement.price.voucherCode = (gFFWNV([
        () => item.itemVoucherCode,
        () => ''
    ]) || '');

    transactionItemElement.price.discountAmount = +(gFFWNV([
        () => item.itemDiscountSalesAmount,
        () => 0
    ]) || 0);
    transactionItemElement.price.discountAmount = roundToDecimal(transactionItemElement.price.discountAmount, 2);
    total_itemSalesDiscountAmount += transactionItemElement.price.discountAmount;

    transactionItemElement.price.discountAmountOther = +(gFFWNV([
        () => item.itemDiscountOtherAmount,
        () => 0
    ]) || 0);
    transactionItemElement.price.discountAmountOther = roundToDecimal(transactionItemElement.price.discountAmountOther, 2);
    total_itemOtherDiscountAmount += transactionItemElement.price.discountAmountOther;

    transactionItemElement.price.discountAmountSum = (gFFWNV([
        () => (transactionItemElement.price.discountAmount + transactionItemElement.price.discountAmountOther),
        () => 0
    ]) || 0);
    transactionItemElement.price.discountAmountSum = toNegativeNumber(transactionItemElement.price.discountAmountSum);
    transactionItemElement.price.discountAmountSum = roundToDecimal(transactionItemElement.price.discountAmountSum, 2);
    total_DiscountAmountSum += transactionItemElement.price.discountAmountSum;

    transactionItemElement.price.taxAmount = +(gFFWNV([
        () => item.itemTaxAmount,
        () => 0
    ]) || 0);
    transactionItemElement.price.taxAmount = roundToDecimal(transactionItemElement.price.taxAmount, 2);
    total_taxAmount += transactionItemElement.price.taxAmount;

    transactionItemElement.price.priceWithTax = +(gFFWNV([
        () => item.itemPriceWithTax,
        () => ((transactionItemElement.price.basePrice + transactionItemElement.price.discountAmountSum) + transactionItemElement.price.taxAmount),
        () => 0
    ]) || 0);
    transactionItemElement.price.priceWithTax = roundToDecimal(transactionItemElement.price.priceWithTax, 2);
    total_priceWithTax += transactionItemElement.price.priceWithTax;

    transactionItemElement.price.shippingMethod = (gFFWNV([
        () => item.itemShippingMethod,
        () => ''
    ]) || '');

    // transactionItemElement.price.shipping = item.itemShippingCost || 0; // mapped inside s.products
    // transactionItemElement.price.shipping = roundToDecimal(transactionItemElement.price.shipping, 2);
    // total_shipping += transactionItemElement.price.shipping;

    // transactionItemElement.price.taxRate = item.itemTaxRate || 0; // mapped inside s.products
    // transactionItemElement.price.taxRate = roundToDecimal(transactionItemElement.price.taxRate, 2);

    // transactionItemElement.price.discountPercent = item.itemDiscountPercent || 0; // mapped inside s.products
    // transactionItemElement.price.discountPercent = roundToDecimal(transactionItemElement.price.discountPercent, 2);
    // total_DiscountPercent += transactionItemElement.price.discountPercent;

    return transactionItemElement;
    //this.message.transaction.item.push(transactionItemElement);
}

if (typeof mandatoryData != 'undefined' && typeof mandatoryData['vehicle'] != 'undefined') {
    for (var i in mandatoryData['vehicle']) {
        var transactionProcessedElement = processTransactionItem(mandatoryData['vehicle'][i], this.defaultDatalayer.transaction.item[0]);
        this.message.transaction.item.push(transactionProcessedElement);
    }
    //mandatoryData['vehicle'].forEach(vehicle => processTransactionItem(vehicle, this.defaultDatalayer.transaction.item[0]));
}

if (typeof mandatoryData != 'undefined' && typeof mandatoryData['options'] != 'undefined') {
    for (var i in mandatoryData['options']) {
        var transactionProcessedElement = processTransactionItem(mandatoryData['options'][i], this.defaultDatalayer.transaction.item[0]);
        this.message.transaction.item.push(transactionProcessedElement);
    }
    //mandatoryData['options'].forEach(option => processTransactionItem(option, this.defaultDatalayer.transaction.item[0]));
}

//Note: Developers are responsible for sending the amount * quantity

if (typeof this.message.custom != "undefined" && (mandatoryData['vehicle'] || mandatoryData['options'])) {

    this.message.transaction.total = {};

    this.message.transaction.transactionID = (gFFWNV([
        () => mandatoryData['transactionID'],
        () => ''
    ]) || '');
    this.message.transaction.transactionID = (this.message.transaction.transactionID).toUpperCase();// regular eVar - no array

    this.message.transaction.total.currency = (gFFWNV([
        () => mandatoryData['totalCurrency'],
        () => ''
    ]) || '');
    this.message.transaction.total.currency = (this.message.transaction.total.currency || "").toUpperCase();

    this.message.transaction.total.basePrice = +(gFFWNV([
        () => mandatoryData['totalBasePrice'],
        () => total_basePrice,
        () => 0
    ]) || 0);
    this.message.transaction.total.basePrice = roundToDecimal(this.message.transaction.total.basePrice, 2);

    this.message.transaction.total.discountItemAmounts = (gFFWNV([
        () => total_DiscountAmountSum,
        () => 0
    ]) || 0);
    this.message.transaction.total.discountItemAmounts = toNegativeNumber(this.message.transaction.total.discountItemAmounts);
    this.message.transaction.total.discountItemAmounts = roundToDecimal(this.message.transaction.total.discountItemAmounts, 2);

    this.message.transaction.total.discountAmountAdditional = +(gFFWNV([
        () => mandatoryData['totalDiscountAmountAdditional'],
        () => 0
    ]) || 0);
    this.message.transaction.total.discountAmountAdditional = toNegativeNumber(this.message.transaction.total.discountAmountAdditional);

    this.message.transaction.total.discountAmountSum = +(gFFWNV([
        () => mandatoryData['totalDiscountAmount'],
        () => (this.message.transaction.total.discountItemAmounts + this.message.transaction.total.discountAmountAdditional),
        () => 0
    ]) || 0);
    this.message.transaction.total.discountAmountSum = toNegativeNumber(this.message.transaction.total.discountAmountSum);
    this.message.transaction.total.discountAmountSum = roundToDecimal(this.message.transaction.total.discountAmountSum, 2);

    this.message.transaction.total.taxItemsAmount = +(gFFWNV([
        () => total_taxAmount,
        () => 0
    ]) || 0);
    this.message.transaction.total.taxItemsAmount = roundToDecimal(this.message.transaction.total.taxItemsAmount, 2);

    this.message.transaction.total.taxAmountAdditional = +(gFFWNV([
        () => mandatoryData['totalTaxAmountAdditional'],
        () => 0
    ]) || 0);

    //this.message.transaction.total.taxAmount =  - removed
    this.message.transaction.total.taxAmountSum = +(gFFWNV([
        () => (total_taxAmount + this.message.transaction.total.taxAmountAdditional),
        () => 0
    ]) || 0);

    // this.message.transaction.total.taxAmountSum = +(gFFWNV([
    //     () => (total_taxAmount + mandatoryData['totalTaxAmount']),
    //     () => 0
    // ]) || 0);
    // this.message.transaction.total.taxAmountSum = roundToDecimal(this.message.transaction.total.taxAmountSum, 2);

    this.message.transaction.total.shipping = +(gFFWNV([
        () => mandatoryData['totalShippingCost'],
        () => 0
    ]) || 0);
    this.message.transaction.total.shipping = roundToDecimal(this.message.transaction.total.shipping, 2);

    this.message.transaction.total.priceWithTax = +(gFFWNV([
        () => mandatoryData['totalPriceWithTax'],
        () => ((this.message.transaction.total.basePrice + this.message.transaction.total.discountAmountSum) + this.message.transaction.total.taxAmountSum),
        () => 0
    ]) || 0);
    this.message.transaction.total.priceWithTax = roundToDecimal(this.message.transaction.total.priceWithTax, 2);

    this.message.transaction.total.transactionTotal = +(gFFWNV([
        () => mandatoryData['totalFinalPrice'],
        () => (this.message.transaction.total.priceWithTax + this.message.transaction.total.shipping),
        () => 0
    ]) || 0);
    this.message.transaction.total.transactionTotal = roundToDecimal(this.message.transaction.total.transactionTotal, 2);

    this.message.transaction.total.paymentMethod = (gFFWNV([
        () => mandatoryData['totalPaymentMethod'],
        () => ''
    ]) || '');

    // if (typeof mandatoryData['totalShippingMethod'] != 'undefined') {
    //     this.message.transaction.total.shippingMethod = (mandatoryData['totalShippingMethod']).toLowerCase(); // regular eVar - no array
    // }
    // this.message.transaction.total.taxRate = mandatoryData['totalTaxRate'] || 0; // regular eVar - no array
    // this.message.transaction.total.taxRate = roundToDecimal(this.message.transaction.total.taxRate, 2);
    // if (typeof mandatoryData['totalVoucherCode'] != 'undefined') {
    //     this.message.transaction.total.voucherCode = mandatoryData['totalVoucherCode'];
    // }
    // this.message.transaction.total.voucherDiscount = mandatoryData['totalDiscountPercent'] || 0;
    // this.message.transaction.total.voucherDiscount = roundToDecimal(this.message.transaction.total.voucherDiscount, 2);
}
// }

// *** end eventHandlerTransactions.js ***
}
}
// *** end eventHanderVehicles.js ***
// *** start eventHandlerOptions.js ***

if (typeof variable == "undefined") {
  variable = this;
}

var includePriceCalculationOptions = false;

var optionIdGenerate = (typeof productIDGenerate == "undefined") ? 0 : productIDGenerate;

//Convert to Numeric
function isValidNumericFormat(value) {
  const pattern = /^\d{1,3}(,\d{3})*(\.\d+)?$/;
  return pattern.test(value);
}

function convertToNumeric(value) {
  if (typeof value === 'number') {
    return value;
  }

  if (!isValidNumericFormat(value)) {
    return null;
  }
  return Number(value.replace(/,/g, ''));
}

function toNegativeNumber(input) {
  return -1 * Math.abs(Number(input));
}

//derive codeVG value from vehicle
// var vehicleCodeVG;
// if (mandatoryData && mandatoryData['vehicle']) {
//   for (var i in mandatoryData['vehicle']) {
//     if (mandatoryData['vehicle'][i]['codeVG'] && typeof mandatoryData['vehicle'][i]['codeVG'] != "undefined")
//       vehicleCodeVG = mandatoryData['vehicle'][i]['codeVG'];
//   }
// }

// ********************************
// * VALUE CHECKS: PRODUCT OPTION *
// ********************************

function checkNumericValue(index, fieldName) {
  if (mandatoryData['options'][index][fieldName] && typeof convertToNumeric(mandatoryData['options'][index][fieldName]) != "number") {
    if (variable.events[eventName].mandatoryData.indexOf(`options[n].${fieldName}`) > -1) {
      variable._throwError('m', `options[n].${fieldName}`, 'incorrect-numeric', '');
      return;
    } else {
      variable._throwError('o', `options[n].${fieldName}`, 'incorrect-numeric', '');
      mandatoryData['options'][index][fieldName] = '';
    }
  } else if (mandatoryData['options'][index][fieldName] && typeof convertToNumeric(mandatoryData['options'][index][fieldName]) == "number") {
    mandatoryData['options'][index][fieldName] = convertToNumeric(mandatoryData['options'][index][fieldName]);
  }
}


if (typeof mandatoryData != 'undefined' && typeof mandatoryData['options'] != 'undefined') {
  if (mandatoryData['options'].length > 0) {
    for (var i in mandatoryData['options']) {

      // if (typeof mandatoryData['options'][i]['codeVG'] == "undefined") {
      //   mandatoryData['options'][i]['codeVG'] = vehicleCodeVG;
      // }

      //CodeVG
      if (typeof mandatoryData['options'][i]['codeVG'] != "undefined") {
        if ((variable.allowedOptionscodeVG[0] == "value should contain only 4 characters" && (((mandatoryData['options'][i]['codeVG'] || "").length < 4 || (mandatoryData['options'][i]['codeVG'] || "").length > 4)))) {
          if (variable.events[eventName].mandatoryData.indexOf('codeVG') > -1) {
            let determineErrorCase = (typeof mandatoryData['options'][i]['codeVG'] == "string" && mandatoryData['options'][i]['codeVG'].trim().length == 0) ? 'empty' : 'incorrect';
            variable._throwError('m', 'options[n].codeVG', determineErrorCase, variable.allowedOptionscodeVG);
            return;
          } else {
            let determineErrorCase = (typeof mandatoryData['options'][i]['codeVG'] == "string" && mandatoryData['options'][i]['codeVG'].trim().length == 0) ? 'incorrect-o' : 'incorrect-o';
            variable._throwError('o', 'options[n].codeVG', determineErrorCase, variable.allowedOptionscodeVG);
            mandatoryData['options'][i]['codeVG'] = '';
          }
        }
      }

      //businessDivision
      if (typeof mandatoryData['options'][i]['businessDivision'] != 'undefined' && mandatoryData['options'][i]['businessDivision'] && !variable.allowedVehicleBusinessDivision.includes(mandatoryData['options'][i]['businessDivision'])) {
        if (variable.events[eventName].mandatoryData.indexOf('businessDivision') > -1) {
          let determineErrorCase = (typeof mandatoryData['options'][i]['businessDivision'] == "string" && mandatoryData['options'][i]['businessDivision'].trim().length == 0) ? 'empty' : 'incorrect';
          variable._throwError('m', 'businessDivision', determineErrorCase, variable.allowedVehicleBusinessDivision, '(or a comma separated combination of any of those values)');
          return;
        } else {
          let determineErrorCase = (typeof mandatoryData['options'][i]['businessDivision'] == "string" && mandatoryData['options'][i]['businessDivision'].trim().length == 0) ? 'incorrect-o' : 'incorrect-o';
          variable._throwError('o', 'businessDivision', determineErrorCase, variable.allowedVehicleBusinessDivision, '(or a comma separated combination of any of those values)');
          mandatoryData['options'][i]['businessDivision'] = '';
        }
      }

      //finDownPayment
      checkNumericValue(i, 'finDownPayment');

      //finMileage
      checkNumericValue(i, 'finMileage');

      //finMonthlyPayment
      checkNumericValue(i, 'finMonthlyPayment');

      //finTerm
      checkNumericValue(i, 'finTerm');
    }
  }
}

// **************************************
// * MAP SALES GROUPS TO DESIRED VALUES *
// **************************************

//import categoryMapping 
var valueMappingCategory = {
    'accessories_zub': 'accessories',
    'graphics': 'car hood graphics',
    'accessories_lad': 'charging',
    'BODY_COLOURS': 'colors',
    'colours': 'colors',
    'ENGINES': 'engine',
    'model': 'engine',
    'TRIMS': 'interior trims',
    'interior_trims': 'interior trims',
    'INTERIOR_WORLDS': 'interior worlds',
    'lines': 'lines / trims',
    'trimlevel': 'lines / trims',
    'OPTIONS': 'options',
    'EXTERIOR_HIGHLIGHTS': 'options',
    'INTERIOR_HIGHLIGHTS': 'options',
    'PACKAGES': 'packages',
    'PACKAGES_AND_OPTIONS': 'packages',
    'TOP_COLOURS': 'roof and mirror caps',
    'roof_and_mirror_caps': 'roof and mirror caps',
    'UPHOLSTERY': 'upholstery',
    'fabrics': 'upholstery',
    'RIMS': 'wheels',
    'wheels': 'wheels',
    'accessories:pwr': 'winter wheels',
    'ACCESSORIES_PWR': 'winter wheels'
};

if (typeof mandatoryData != 'undefined' && mandatoryData['pageSubCat1']) {
    if (typeof mandatoryData['pageSubCat1'] != "undefined") {
  
      if (valueMappingCategory.hasOwnProperty(mandatoryData['pageSubCat1'])) {
        mandatoryData['pageSubCat1'] = valueMappingCategory[mandatoryData['pageSubCat1']];
      }
  
      if (mandatoryData['pageSubCat1'].startsWith("option_group")) {
        mandatoryData['pageSubCat1'] = 'options';
      } else if (mandatoryData['pageSubCat1'] === 'EXTERIOR_HIGHLIGHTS') {
        mandatoryData['pageSubCat1'] = 'options';
        mandatoryData['pageSubCat2'] = 'exterior highlights';
      } else if (mandatoryData['pageSubCat1'] === 'INTERIOR_HIGHLIGHTS') {
        mandatoryData['pageSubCat1'] = 'options';
        mandatoryData['pageSubCat2'] = 'interior highlights';
      }
  
    }
  }

if (typeof mandatoryData != 'undefined' && typeof mandatoryData['options'] != 'undefined') {
  if (mandatoryData['options'].length > 0) {
    for (var i in mandatoryData['options']) {
      if (mandatoryData['options'][i]['category1'] && typeof mandatoryData['options'][i]['category1'] != "undefined" && typeof mandatoryData['options'][i]['category1'] == "string") {

        if (valueMappingCategory.hasOwnProperty(mandatoryData['options'][i]['category1'])) {
          mandatoryData['options'][i]['category1'] = valueMappingCategory[mandatoryData['options'][i]['category1']];
        }

        if (mandatoryData['options'][i]['category1'].startsWith("option_group")) {
          mandatoryData['options'][i]['category1'] = 'options';
        } else if (mandatoryData['options'][i]['category1'] === 'EXTERIOR_HIGHLIGHTS') {
          mandatoryData['options'][i]['category1'] = 'options';
          mandatoryData['options'][i]['category2'] = 'exterior highlights';
        } else if (mandatoryData['options'][i]['category1'] === 'INTERIOR_HIGHLIGHTS') {
          mandatoryData['options'][i]['category1'] = 'options';
          mandatoryData['options'][i]['category2'] = 'interior highlights';
        }


        if (!variable.allowedOptionsCategory1.includes(mandatoryData['options'][i]['category1'])) {
          if (variable.events[eventName].mandatoryData.indexOf('options[n].category1') > -1) {
            let determineErrorCase = (typeof mandatoryData['options'][i]['category1'] == "string" && mandatoryData['options'][i]['category1'].trim().length == 0) ? 'empty' : 'incorrect';
            variable._throwError('m', 'options[n].category1', determineErrorCase, variable.allowedOptionsCategory1, "");
            return;
          } else {
            let determineErrorCase = (typeof mandatoryData['options'][i]['category1'] == "string" && mandatoryData['options'][i]['category1'].trim().length == 0) ? 'incorrect-o' : 'incorrect-o';
            variable._throwError('o', 'options[n].category1', determineErrorCase, variable.allowedOptionsCategory1, "");
            mandatoryData['options'][i]['category1'] = '';
          }
        }
      } else {
        if (variable.events[eventName].mandatoryData.indexOf('options[n].category1') > -1 && typeof mandatoryData['options'][i]['category1'] != "undefined") {
          let determineErrorCase = (typeof mandatoryData['options'][i]['category1'] == "string" && mandatoryData['options'][i]['category1'].trim().length == 0) ? 'empty' : 'incorrect';
          variable._throwError('m', 'options[n].category1', determineErrorCase, variable.allowedOptionsCategory1, "");
          return;
        } else if (variable.events[eventName].optionalData.indexOf('options[n].category1') > -1 && typeof mandatoryData['options'][i]['category1'] != "undefined") {
          let determineErrorCase = (typeof mandatoryData['options'][i]['category1'] == "string" && mandatoryData['options'][i]['category1'].trim().length == 0) ? 'incorrect-o' : 'incorrect-o';
          variable._throwError('o', 'options[n].category1', determineErrorCase, variable.allowedOptionsCategory1, "");
          mandatoryData['options'][i]['category1'] = '';
        }
      }
    }
  }
}

//value check for outeletBuno - direct convert to string
for (var i in mandatoryData['options']) {
  if (Object.keys(mandatoryData['options'][i]).indexOf('linkedDealerOutletBuno') > -1) {

    let numericRegex = /^[0-9]+$/;
    mandatoryData['options'][i]['linkedDealerOutletBuno'] = (numericRegex.test(mandatoryData['options'][i]['linkedDealerOutletBuno'])) ? parseInt(mandatoryData['options'][i]['linkedDealerOutletBuno'], 10) : NaN;

    if (typeof mandatoryData['options'][i]['linkedDealerOutletBuno'] != 'undefined' && ((typeof convertToNumeric(mandatoryData['options'][i]['linkedDealerOutletBuno']) != "number")|| isNaN(mandatoryData['options'][i]['linkedDealerOutletBuno']))) {
      variable._throwError('o', `options[n].linkedDealerOutletBuno`, 'incorrect-numeric', '');
      mandatoryData['options'][i]['linkedDealerOutletBuno'] = '';
    } else if (typeof mandatoryData['options'][i]['linkedDealerOutletBuno'] != 'undefined' && typeof convertToNumeric(mandatoryData['options'][i]['linkedDealerOutletBuno']) == "number") {
      mandatoryData['options'][i]['linkedDealerOutletBuno'] = convertToNumeric(mandatoryData['options'][i]['linkedDealerOutletBuno']);
    }

    mandatoryData['options'][i]['linkedDealerOutletBuno'] = "" + mandatoryData['options'][i]['linkedDealerOutletBuno'];
    while (mandatoryData['options'][i]['linkedDealerOutletBuno'].length > 1 && mandatoryData['options'][i]['linkedDealerOutletBuno'].length < 5) {
      mandatoryData['options'][i]['linkedDealerOutletBuno'] = '0' + mandatoryData['options'][i]['linkedDealerOutletBuno'];
    }
  }
  if (Object.keys(mandatoryData['options'][i]).indexOf('linkedDealerCount') > -1) {

    if (typeof mandatoryData['options'][i]['linkedDealerCount'] != 'undefined' && typeof (mandatoryData['options'][i]['linkedDealerCount']) != "number") {
      if (variable.events[eventName].mandatoryData.indexOf(`options[n].linkedDealerCount`) > -1) {
        variable._throwError('m', `options[n].linkedDealerCount`, 'incorrect-numeric', '');
        return;
      } else {
        variable._throwError('o', `options[n].linkedDealerCount`, 'incorrect-numeric', '');
        mandatoryData['options'][i]['linkedDealerCount'] = '';
      }
    } else if (typeof mandatoryData['options'][i]['linkedDealerCount'] != 'undefined' && typeof (mandatoryData['options'][i]['linkedDealerCount']) == "number") {
      mandatoryData['options'][i]['linkedDealerCount'] = convertToNumeric(mandatoryData['options'][i]['linkedDealerCount']);
    }

  }
}

// ************************************
// * VARIABLE MAPPING: PRODUCT OPTION *
// ************************************

// datalayer helper: product (options)
if (typeof mandatoryData != 'undefined' && typeof mandatoryData['options'] != 'undefined') {
  if (variable.message.product.length == 0) {
    variable.message.product = [];
  }
  mandatoryData['options'].forEach((option) => {

    let productElement = JSON.parse(JSON.stringify(variable.productSchema));

    let optionConst = PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.options;
    let mandatoryData = variable.message.component[0].componentInfo;

    productElement.productInfo.productName = gFFWNV([
      () => optionConst.productName,
      () => option['name']
    ]);

    productElement.productInfo.productID = gFFWNV([
      () => optionConst.productID,
      () => option['productID'],
      () => option['code'],
      () => "product" + (optionIdGenerate + 1)
    ]);

    productElement.productInfo.manufacturer = gFFWNV([
      () => optionConst.manufacturer,
      () => option['manufacturer']
    ]);

    productElement.category.productType = gFFWNV([
      () => optionConst.productType,
      () => option['businessDivision']
    ]);

    productElement.category.primaryCategory = gFFWNV([
      () => optionConst.primaryCategory,
      () => (option['primaryCategory'] == "finance") && "finance",
      () => mandatoryData['componentName'] && mandatoryData['componentName'] + " options",
      () => variable.message.component[0].componentInfo.componentName + " options"
    ]);

    productElement.category.subCategory1 = gFFWNV([
      () => optionConst.subCategory1,
      () => option['category1']
    ]);

    productElement.category.subCategory2 = gFFWNV([
      () => optionConst.subCategory2,
      () => option['category2']
    ]);

    productElement.category.subCategory3 = gFFWNV([
      () => optionConst.subCategory3,
      () => option['category3']
    ]);

    productElement.attributes.modelCode = gFFWNV([
      () => optionConst.codeVG,
      () => option['codeVG'] //code of the vehicle - info
    ]);
    productElement.attributes.modelCode = (productElement.attributes.modelCode || "").toUpperCase();

    productElement.attributes.status = gFFWNV([
      () => optionConst.status,
      () => option['status']
    ]);

    productElement.attributes.mmdr = gFFWNV([
      () => optionConst.range,
      () => option['range'] //range of the vehicle - info
    ]);
    productElement.attributes.mmdr = (productElement.attributes.mmdr || "").toUpperCase();

    productElement.attributes.linkedOutletBuno = gFFWNV([
      () => optionConst.linkedOutletBuno,
      () => option['linkedOutletBuno']
    ]);

    productElement.attributes.linkedDealerCount = gFFWNV([
      () => optionConst.linkedDealerCount,
      () => option['linkedDealerCount']
    ]);

    productElement.attributes.salesModel = gFFWNV([
      () => optionConst.salesModel,
      () => option['salesModel']
    ]);

    productElement.attributes.series = gFFWNV([
      () => optionConst.series,
      () => option['series']
    ]);

    productElement.productInfo.color = gFFWNV([
      () => optionConst.color,
      () => option['color']
    ]);

    productElement.attributes.fin = {};

    productElement.attributes.fin.downPayment = gFFWNV([
      () => optionConst.downPayment,
      () => option['downPayment']
    ]);

    productElement.attributes.fin.finMileage = gFFWNV([
      () => optionConst.finMileage,
      () => option['finMileage']
    ]);

    productElement.attributes.fin.finMonthlyPayment = gFFWNV([
      () => optionConst.finMonthlyPayment,
      () => option['finMonthlyPayment']
    ]);

    productElement.attributes.fin.finTerm = gFFWNV([
      () => optionConst.finTerm,
      () => option['finTerm']
    ]);

    productElement.attributes.packageID = gFFWNV([
      () => optionConst.packageID,
      () => option['packageID']
    ]);

    productElement.productInfo.size = gFFWNV([
      () => optionConst.size,
      () => option['size']
    ]);

    productElement.attributes.linkedDealerOutletBuno = gFFWNV([
      () => optionConst.linkedDealerOutletBuno,
      () => option['linkedDealerOutletBuno']
    ]);

    productElement = JSON.parse(JSON.stringify(productElement, (k, v) => (v == "" ? undefined : v)));
    variable.message.product.push(productElement);

    if (option['itemBasePrice'] != undefined || option['itemDiscountSalesAmount'] != undefined || option['itemDiscountOtherAmount'] != undefined || option['itemTaxAmount'] != undefined || option['itemPriceWithTax'] != undefined) {
      includePriceCalculationOptions = true;
    }

  });
}


if (includePriceCalculationOptions) {
  // *** start eventHandlerCart.js ***

this.message.cart.item = [];

 /* ðŸ’¡ AAAA-5442 @Naveen: please ensure the following calculations and mappings
adobeDataLayer.cart.item('productID').quantity =  data['itemQuantity'] || 1
adobeDataLayer.cart.item('productID').price.basePrice = data['itemBasePrice']
adobeDataLayer.cart.item('productID').price.voucherCode = data['itemVoucherCode'] || data['itemSalesVoucherType'] || 0
adobeDataLayer.cart.item('productID').price.attributes.discountAmount = data['itemDiscountAmount'] || data['itemSalesDiscountAmount']  0
adobeDataLayer.cart.item('productID').price.attributes.discountAmountSum = data['itemOtherDiscountAmount'] + data['itemSalesDiscountAmount'] || 0
adobeDataLayer.cart.item('productID').price.attributes.taxAmount = data['itemTaxAmount'] || 0
adobeDataLayer.cart.item('productID').price.priceWithTax = (data['itemBasePrice'] - (data['itemOtherDiscountAmount'] + data['itemSalesDiscountAmount']) + data['itemTaxAmount'] ) (if any of those parameters are undefined, but data['itemPriceWithTax'] is not undefined then map it ||  0
adobeDataLayer.cart.item('productID').price.shippingMethod = data['itemShippingMethod']
adobeDataLayer.cart.price.currency = mandatoryData['totalCurrency']
adobeDataLayer.cart.price.basePrice = âˆ‘ ( data['itemBasePrice'] ) || mandatoryData['totalBasePrice'] || 0
adobeDataLayer.cart.price.attributes.discountItemAmounts = âˆ‘ ( data['itemOtherDiscountAmount'] + data['itemSalesDiscountAmount']  ) || 0
adobeDataLayer.cart.price.attributes.discountAmountAdditional = ['totalOtherDiscountAmount'] 
adobeDataLayer.cart.price.attributes.discountAmountSum = (  .discountItemAmounts  + .discountAmountAdditional ) || mandatoryData['totalDiscountAmount'] || 0
adobeDataLayer.cart.price.attributes.taxItemsAmount = âˆ‘ ( data['itemTaxAmount'] ) || 0
adobeDataLayer.cart.price.attributes.taxAmount = mandatoryData['totalTaxAmount'] || 0
adobeDataLayer.cart.price.attributes.taxAmountSum = âˆ‘ ( data['itemTaxAmount'] ) + mandatoryData['totalTaxAmount'] || 0
adobeDataLayer.cart.price.priceWithTax = ( .basePrice - .discountAmountSum + .taxAmountSum )|| mandatoryData['totalPriceWithTax'] || 0
adobeDataLayer.cart.price.shipping  = mandatoryData['totalShippingCost'] || 0
adobeDataLayer.cart.price.cartTotal = .priceWithTax + mandatoryData['totalShippingCost'] || 0
note: we don't map percent anymore (taxRate, discountPercent), only absolut currency numbers
  ðŸ’¡ end comment for AAAA-5442 */

 //*** start priceCheckAndCalculation.js ***

 if (typeof variable == "undefined") {
     variable = this;
 }

 // *********************
 // * CONVERT TO NUMBER *
 // *********************

 //Convert to Numeric
 function isValidNumericFormat(value) {
     // Use a regular expression to check the format
     const pattern = /^\d{1,3}(,\d{3})*(\.\d+)?$/;
     return pattern.test(value);
 }

 function convertToNumeric(value) {
     if (typeof value === 'number') {
         // Return the value as-is if it's already a number
         return value;
     }

     if (!isValidNumericFormat(value)) {
         // Return null if the value is not in the correct format
         return null;
     }
     // Remove the commas and convert the value to a number
     return Number(value.replace(/,/g, ''));
 }

 function roundToDecimal(number, decimalPlaces) {
     decimalPlaces = decimalPlaces || 2;
     const factor = 10 ** decimalPlaces;
     return +(Math.round(number * factor) / factor).toFixed(decimalPlaces);
 }

 // **********************
 // * PRICE CALCULATIONS *
 // **********************

 var total_basePrice = 0;
 var total_priceWithTax = 0;
 var total_shipping = 0;
 var total_taxAmount = 0;
 var total_voucherDiscount = 0;
 var total_DiscountAmount = 0;
 var total_DiscountPercent = 0;
 var total_quantity = 0;
 var total_itemOtherDiscountAmount = 0;
 var total_itemSalesDiscountAmount = 0;
 var total_DiscountAmountSum = 0;

 function calculateValues(data) {
     if (data && data.length > 0) {
         for (var i in data) {
             //Calculated in the cart and transaction
             // if (typeof data[i].itemBasePrice != 'undefined' && (typeof data[i].itemDiscountAmount == 'undefined' || data[i].itemDiscountAmount == 0) && typeof data[i].itemDiscountPercent != 'undefined') {
             //     data[i].itemDiscountAmount = data[i].itemBasePrice * data[i].itemDiscountPercent;
             //     data[i].itemDiscountAmount = roundToDecimal(data[i].itemDiscountAmount, 2);
             // }

             // if (typeof data[i].itemBasePrice != 'undefined' && typeof data[i].itemDiscountAmount != 'undefined' && typeof data[i].itemTaxRate != 'undefined' && (typeof data[i].itemTaxAmount == 'undefined' || data[i].itemTaxAmount == 0)) {
             //     data[i].itemTaxAmount = (data[i].itemBasePrice - data[i].itemDiscountAmount) * data[i].itemTaxRate;
             //     data[i].itemTaxAmount = roundToDecimal(data[i].itemTaxAmount, 2);
             // }

             // if (typeof data[i].itemBasePrice != 'undefined' && typeof data[i].itemDiscountAmount != 'undefined' && typeof data[i].itemTaxAmount != 'undefined' && (typeof data[i].itemPriceWithTax == 'undefined' || data[i].itemPriceWithTax == 0)) {
             //     data[i].itemPriceWithTax = (data[i].itemBasePrice - data[i].itemDiscountAmount) + data[i].itemTaxAmount;
             //     data[i].itemPriceWithTax = roundToDecimal(data[i].itemPriceWithTax, 2);
             // }

             data[i].itemPriceWithTax = ((+(data[i].itemBasePrice || 0)) + ((+(data[i].itemDiscountSalesAmount || 0)) + (+(data[i].itemDiscountOtherAmount || 0)))) + (+(data[i].itemTaxAmount || 0));

             data[i].itemPriceWithTax = roundToDecimal(data[i].itemPriceWithTax, 2);
         }
     }
 }

 // if (mandatoryData && mandatoryData.vehicle) {
 //     //calculateValues(mandatoryData.vehicle);
 // }

 // if (mandatoryData && mandatoryData.options) {
 //     //calculateValues(mandatoryData.options);
 // }

 function validateNumericValue(value) {
     return typeof value === 'number' && !isNaN(value);
 }

 function toNegativeNumber(input) {
     return -1 * Math.abs(Number(input));
 }

 function handleNumericValue(property, obj, dataIndex, numericType) {
     var flagDetermine;
     if (numericType == 'negative') {
        //if provided as positive then convert to negative number;
         obj[property] = toNegativeNumber(obj[property]);
         flagDetermine = !(typeof obj[property] == 'number' && obj[property] < 0);
     } else {
         flagDetermine = (typeof convertToNumeric(obj[property]) != "number");
     }
     if (obj[property]) {
         if (flagDetermine) {
             flagDetermine = (numericType == 'negative') ? 'incorrect-numeric' : 'incorrect-numeric';
             if (variable.events[eventName].mandatoryData.indexOf(dataIndex) > -1) {
                 variable._throwError('m', dataIndex, flagDetermine, '');
                 return;
             } else {
                 variable._throwError('o', dataIndex, flagDetermine, '');
                 obj[property] = '';
             }
         } else {
             if (typeof convertToNumeric(obj[property]) == "number" && ['itemBasePrice', 'itemPriceWithTax', 'itemQuantity', 'itemShippingCost', 'itemTaxAmount', 'itemTaxRate'].indexOf(property) > -1) {
                 obj[property] = convertToNumeric(obj[property]);
                 obj[property] = roundToDecimal(obj[property], 2);
             }
         }
         //  if (['itemDiscountOtherAmount', 'itemDiscountSalesAmount'].indexOf(property) > -1) {
         //      obj[property] = toNegativeNumber(obj[property]);
         //      obj[property] = roundToDecimal(obj[property], 2);
         //  }
     }
 }

 function handleNumericData(dataArray, dataKey) {
     for (var i = 0; i < dataArray.length; i++) {
         var dataItem = dataArray[i];
         handleNumericValue('itemBasePrice', dataItem, dataKey + '[n].itemBasePrice');
         handleNumericValue('itemDiscountSalesAmount', dataItem, dataKey + '[n].itemDiscountSalesAmount', 'negative');
         handleNumericValue('itemDiscountOtherAmount', dataItem, dataKey + '[n].itemDiscountOtherAmount', 'negative');
         handleNumericValue('itemPriceWithTax', dataItem, dataKey + '[n].itemPriceWithTax', dataKey + '[n].itemPriceWithTax');
         handleNumericValue('itemQuantity', dataItem, dataKey + '[n].itemQuantity');
         handleNumericValue('itemTaxAmount', dataItem, dataKey + '[n].itemTaxAmount');
     }
 }

 // *****************************
 // * VALUE CHECKS: TOTAL PRICE *
 // *****************************
 if (!window.TRON.priceCalculation) {
     const properties = [
         'totalBasePrice',
         'totalDiscountAmount',
         'totalDiscountPercent',
         'totalFinalPrice',
         'totalPriceWithTax',
         'totalShippingCost',
         'totalTaxAmount',
         'totalTaxAmountAdditional',
         'totalDiscountAmountAdditional',
         'totalCurrency'
     ];

     for (const property of properties) {
         if (property == 'totalCurrency') {
             //Value check for totalCurrency
             if (typeof mandatoryData != 'undefined' && typeof mandatoryData['totalCurrency'] != 'undefined') {
                 if ((mandatoryData['totalCurrency'].length != 3) || (mandatoryData['totalCurrency'] !== mandatoryData['totalCurrency'].toUpperCase())) {
                     if (this.events[eventName].mandatoryData.indexOf('totalCurrency') > -1) {
                         let determineErrorCase = (typeof mandatoryData['totalCurrency'] == "string" && mandatoryData['totalCurrency'].trim().length == 0) ? 'empty' : 'incorrect';
                         this._throwError('m', 'totalCurrency', determineErrorCase, '', '(has to follow ISO 3-letter currency code all upper case)');
                         return;
                     } else {
                         let determineErrorCase = (typeof mandatoryData['totalCurrency'] == "string" && mandatoryData['totalCurrency'].trim().length == 0) ? 'incorrect-o' : 'incorrect-o';
                         this._throwError('o', 'totalCurrency', determineErrorCase, '', '(has to follow ISO 3-letter currency code all upper case)');
                         mandatoryData['totalCurrency'] = '';
                     }
                 }
             }
         } else {
             var value = mandatoryData && mandatoryData[property];
             var flagDetermine;
             if (['totalDiscountAmount', 'totalDiscountAmountAdditional'].indexOf(property) > -1) {
                //if provided as positive then convert to negative number;
                 value = toNegativeNumber(value);
                 flagDetermine = !(typeof value == 'number' && value < 0);
             } else {
                 flagDetermine = (typeof convertToNumeric(value) != "number");
             }
             if (value) {
                 if (flagDetermine) {
                     flagDetermine = (['totalDiscountAmount', 'totalDiscountAmountAdditional'].indexOf(property) > -1) ? 'incorrect-numeric' : 'incorrect-numeric';
                     if (variable.events[eventName].mandatoryData.indexOf(property) > -1) {
                         variable._throwError('m', property, flagDetermine, '');
                         return;
                     } else {
                         variable._throwError('o', property, flagDetermine, '');
                         mandatoryData[property] = '';
                     }
                 } else {
                     mandatoryData[property] = convertToNumeric(mandatoryData[property]);
                     mandatoryData[property] = roundToDecimal(mandatoryData[property], 3);
                 }
             }
         }
     }

     window.TRON.priceCalculation = true;
 }

 // ***************************************
 // * VALUE CHECKS: PRODUCT VEHICLE PRICE *
 // ***************************************

 if (typeof mandatoryData != 'undefined' && typeof mandatoryData['vehicle'] != 'undefined' && mandatoryData['vehicle'].length > 0) {
     handleNumericData(mandatoryData['vehicle'], 'vehicle');
 }

 // ***************************************
 // * VALUE CHECKS: PRODUCT OPTIONS PRICE *
 // ***************************************

 if (typeof mandatoryData != 'undefined' && typeof mandatoryData['options'] != 'undefined' && mandatoryData['options'].length > 0) {
     handleNumericData(mandatoryData['options'], 'options');
 }

 //*** end priceCheckAndCalculation.js ***

// **************************
// * VARIABLE MAPPING: CART *
// **************************

//process the products that are already processed from eventhandler options and evenhandler vehicles
var productsProcessed = {};
for (var i in this.message.product) {
    productsProcessed[this.message.product[i].productInfo.productID] = this.message.product[i];
}

function processCartItem(data, objectRef) {
    let cartItemElement = JSON.parse(JSON.stringify(objectRef));
    cartItemElement = Object.assign({}, cartItemElement, productsProcessed[data['productID']]);

    cartItemElement.quantity = gFFWNV([
        () => data['itemQuantity'],
        () => 1
    ]);
    total_quantity += cartItemElement.quantity;

    cartItemElement.price.basePrice = +(gFFWNV([
        () => data['itemBasePrice'],
        () => 0
    ]) || 0);
    cartItemElement.price.basePrice = roundToDecimal(cartItemElement.price.basePrice, 2);
    total_basePrice += cartItemElement.price.basePrice;

    cartItemElement.price.voucherCode = (gFFWNV([
        () => data['itemVoucherCode'],
        () => data['itemSalesVoucherType'],
        () => ''
    ]) || '');

    cartItemElement.price.discountAmount = +(gFFWNV([
        //() => data['itemDiscountAmount'],
        () => data['itemSalesDiscountAmount'],
        () => data['itemDiscountSalesAmount'],
        () => 0
    ]) || 0);
    cartItemElement.price.discountAmount = roundToDecimal(cartItemElement.price.discountAmount, 2);
    total_DiscountAmount += cartItemElement.price.discountAmount;
    total_itemSalesDiscountAmount += cartItemElement.price.discountAmount;

    cartItemElement.price.discountAmountOther = +(gFFWNV([
        () => data['itemOtherDiscountAmount'],
        () => data['itemDiscountOtherAmount'],
        () => 0
    ]) || 0);
    cartItemElement.price.discountAmountOther = roundToDecimal(cartItemElement.price.discountAmountOther, 2);
    total_DiscountAmount += cartItemElement.price.discountAmountOther;
    total_itemOtherDiscountAmount += cartItemElement.price.discountAmountOther;

    //Calculated
    cartItemElement.price.discountAmountSum = +(cartItemElement.price.discountAmount + cartItemElement.price.discountAmountOther);
    cartItemElement.price.discountAmountSum = toNegativeNumber(cartItemElement.price.discountAmountSum);
    cartItemElement.price.discountAmountSum = roundToDecimal(cartItemElement.price.discountAmountSum, 2);
    total_DiscountAmountSum += cartItemElement.price.discountAmountSum;

    cartItemElement.price.taxAmount = +(gFFWNV([
        () => data['itemTaxAmount'],
        () => 0
    ]) || 0);
    cartItemElement.price.taxAmount = roundToDecimal(cartItemElement.price.taxAmount, 2);
    total_taxAmount += cartItemElement.price.taxAmount;

    //if(typeof data['itemPriceWithTax'] != 'undefined'){
        cartItemElement.price.priceWithTax = +(gFFWNV([
            () => data['itemPriceWithTax'],
            () => ((cartItemElement.price.basePrice + (cartItemElement.price.discountAmountSum)) + cartItemElement.price.taxAmount),
            () => 0
        ]) || 0);
    // }else{
    //     cartItemElement.price.priceWithTax = 0;
    // }
    //cartItemElement.price.priceWithTax = data['itemPriceWithTax'] || 0;
    cartItemElement.price.priceWithTax = roundToDecimal(cartItemElement.price.priceWithTax, 2);
    total_priceWithTax += cartItemElement.price.priceWithTax;

    cartItemElement.price.shippingMethod = (gFFWNV([
        () => data['itemShippingMethod'],
        () => ''
    ]) || '');
    cartItemElement.price.shippingMethod = (cartItemElement.price.shippingMethod).toLowerCase();

    return cartItemElement;
}

if (mandatoryData !== undefined && mandatoryData['vehicle']) {
    for (var i in mandatoryData['vehicle']) {
        var cartProcessedElement = processCartItem(mandatoryData['vehicle'][i], this.defaultDatalayer.cart.item[0]);
        this.message.cart.item.push(cartProcessedElement);
    }
    //mandatoryData['vehicle'].forEach(vehicle => processCartItem('vehicle', vehicle, this.defaultDatalayer.cart.item[0]));
}

if (mandatoryData !== undefined && mandatoryData['options']) {
    for (var i in mandatoryData['options']) {
        var cartProcessedElement = processCartItem(mandatoryData['options'][i], this.defaultDatalayer.cart.item[0]);
        this.message.cart.item.push(cartProcessedElement);
    }
    //mandatoryData['options'].forEach(option => processCartItem('options', option, this.defaultDatalayer.cart.item[0]));
}

//Note: Developers are responsible for sending the amount * quantity
if (typeof this.message.custom != "undefined" && (mandatoryData['vehicle'] || mandatoryData['options'])) {

    this.message.cart.price = {};

    this.message.cart.price.currency = (gFFWNV([
        () => mandatoryData['totalCurrency'],
        () => ''
    ]) || '');
    this.message.cart.price.currency = (this.message.cart.price.currency).toUpperCase(); // regular eVar - no array

    this.message.cart.price.basePrice = +(gFFWNV([
        () => mandatoryData['totalBasePrice'],
        () => total_basePrice,
        () => 0
    ]) || 0);
    this.message.cart.price.basePrice = roundToDecimal(this.message.cart.price.basePrice, 2);

    this.message.cart.price.discountItemAmounts = (gFFWNV([
        () => total_DiscountAmountSum,
        () => 0
    ]) || 0);
    this.message.cart.price.discountItemAmounts = toNegativeNumber(this.message.cart.price.discountItemAmounts);
    this.message.cart.price.discountItemAmounts = roundToDecimal(this.message.cart.price.discountItemAmounts, 2);

    this.message.cart.price.discountAmountAdditional = +(gFFWNV([
        () => mandatoryData['totalDiscountAmountAdditional'],
        () => 0
    ]) || 0);
    this.message.cart.price.discountAmountAdditional = toNegativeNumber(this.message.cart.price.discountAmountAdditional);

    this.message.cart.price.discountAmountSum = +(gFFWNV([
        () => mandatoryData['totalDiscountAmount'],
        () => (this.message.cart.price.discountItemAmounts + this.message.cart.price.discountAmountAdditional),
        () => 0
    ]) || 0);
    this.message.cart.price.discountAmountSum = toNegativeNumber(this.message.cart.price.discountAmountSum);
    this.message.cart.price.discountAmountSum = roundToDecimal(this.message.cart.price.discountAmountSum, 2);
    
    this.message.cart.price.taxItemsAmount = (gFFWNV([
        () => total_taxAmount,
        () => 0
    ]) || 0);
    this.message.cart.price.taxItemsAmount = roundToDecimal(this.message.cart.price.taxItemsAmount, 2);

    this.message.cart.price.shipping = +(gFFWNV([
        () => mandatoryData['totalShippingCost'],
        () => 0
    ]) || 0);
    this.message.cart.price.shipping = roundToDecimal(this.message.cart.price.shipping, 2);
    total_shipping = this.message.cart.price.shipping;

    this.message.cart.cartID = (gFFWNV([
        () => mandatoryData['cartID'],
        () => ''
    ]) || '');
    this.message.cart.cartID = (this.message.cart.cartID || "").toUpperCase();

    // this.message.cart.price.shippingMethod = (gFFWNV([
    //     () => mandatoryData['totalShippingMethod'],
    //     () => ''
    // ]) || '');

    this.message.cart.price.taxAmountAdditional = +(gFFWNV([
        () => mandatoryData['totalTaxAmountAdditional'],
        () => 0
    ]) || 0);

    //this.message.cart.price.taxAmount - removed
    this.message.cart.price.taxAmountSum = +(gFFWNV([
        () => (total_taxAmount + this.message.cart.price.taxAmountAdditional),
        () => 0
    ]) || 0);

    // this.message.cart.price.taxAmountSum = (gFFWNV([
    //     () => (total_taxAmount + (mandatoryData['totalTaxAmount'] || 0)),
    //     () => 0
    // ]) || 0);
    // this.message.cart.price.taxAmountSum = roundToDecimal(this.message.cart.price.taxAmountSum, 2);

    this.message.cart.price.priceWithTax = (gFFWNV([
        () => (mandatoryData['totalPriceWithTax']),
        () => ((this.message.cart.price.basePrice + this.message.cart.price.discountAmountSum) + this.message.cart.price.taxAmountSum),
        () => 0
    ]) || 0);
    this.message.cart.price.priceWithTax = roundToDecimal(this.message.cart.price.priceWithTax, 2);

    this.message.cart.price.cartTotal = +(gFFWNV([
        () => mandatoryData['totalFinalPrice'],
        () => (this.message.cart.price.priceWithTax + this.message.cart.price.shipping),
        () => 0
    ]) || 0);
    this.message.cart.price.cartTotal = roundToDecimal(this.message.cart.price.cartTotal, 2);

    // this.message.cart.price.taxRate = mandatoryData['totalTaxRate'] || 0; // regular eVar - no array
    // this.message.cart.price.taxRate = roundToDecimal(this.message.cart.price.taxRate, 2);
    // if (typeof mandatoryData['totalVoucherCode'] != 'undefined') {
    //     this.message.cart.price.voucherCode = mandatoryData['totalVoucherCode'];
    // }
    // this.message.cart.price.voucherDiscount = mandatoryData['totalVoucherDiscount'] || 0;
    // this.message.cart.price.voucherDiscount = roundToDecimal(this.message.cart.price.voucherDiscount, 2);
    //this.message.cart.price.cartTotal = (total_priceWithTax) + (total_shipping) || mandatoryData['totalFinalPrice'] || 0;
}

// *** end eventHandlerCart.js ***
//if transaction id exists then import
if(typeof mandatoryData['transactionID'] != "undefined"){
    // *** start eventHandlerTransactions.js ***

this.message.transaction.item = [];

// if (((this.events[eventName].event.eventInfo.eventName == "commerce") && ((this.events[eventName].event.eventInfo.type == "order"))) || ((mandatoryData && mandatoryData['transactionID'] || "") != "")) {

//Reset values
['total_basePrice', 'total_priceWithTax', 'total_shipping', 'total_taxAmount', 'total_voucherDiscount', 'total_DiscountAmount', 'total_DiscountPercent', 'total_quantity', 'total_itemOtherDiscountAmount', 'total_itemSalesDiscountAmount', 'total_DiscountAmountSum'].forEach(function(variableName) {
    try {
        if (typeof eval(variableName) !== 'undefined') {
            eval(variableName + ' = 0;');
        } else {
            eval('var ' + variableName + ' = 0;');
        }
    } catch (error) {
        //console.error('An error occurred:', error);
    }
});


// *********************************
// * VARIABLE MAPPING: TRANSACTION *
// *********************************

//process the products that are already processed from eventhandler options and evenhandler vehicles
var productsProcessed = {};
for (var i in this.message.product) {
    productsProcessed[this.message.product[i].productInfo.productID] = this.message.product[i];
}

// DATALAYER HELPER : transaction items
function processTransactionItem(item, objectRef) {
    let transactionItemElement = JSON.parse(JSON.stringify(objectRef));

    transactionItemElement = Object.assign({}, transactionItemElement, productsProcessed[item['productID']]);

    transactionItemElement.quantity = gFFWNV([
        () => item.itemQuantity,
        () => 1
    ]);
    total_quantity += transactionItemElement.quantity;

    transactionItemElement.price.basePrice = +(gFFWNV([
        () => item.itemBasePrice,
        () => 0
    ]) || 0);
    transactionItemElement.price.basePrice = roundToDecimal(transactionItemElement.price.basePrice, 2);
    total_basePrice += transactionItemElement.price.basePrice;

    transactionItemElement.price.voucherCode = (gFFWNV([
        () => item.itemVoucherCode,
        () => ''
    ]) || '');

    transactionItemElement.price.discountAmount = +(gFFWNV([
        () => item.itemDiscountSalesAmount,
        () => 0
    ]) || 0);
    transactionItemElement.price.discountAmount = roundToDecimal(transactionItemElement.price.discountAmount, 2);
    total_itemSalesDiscountAmount += transactionItemElement.price.discountAmount;

    transactionItemElement.price.discountAmountOther = +(gFFWNV([
        () => item.itemDiscountOtherAmount,
        () => 0
    ]) || 0);
    transactionItemElement.price.discountAmountOther = roundToDecimal(transactionItemElement.price.discountAmountOther, 2);
    total_itemOtherDiscountAmount += transactionItemElement.price.discountAmountOther;

    transactionItemElement.price.discountAmountSum = (gFFWNV([
        () => (transactionItemElement.price.discountAmount + transactionItemElement.price.discountAmountOther),
        () => 0
    ]) || 0);
    transactionItemElement.price.discountAmountSum = toNegativeNumber(transactionItemElement.price.discountAmountSum);
    transactionItemElement.price.discountAmountSum = roundToDecimal(transactionItemElement.price.discountAmountSum, 2);
    total_DiscountAmountSum += transactionItemElement.price.discountAmountSum;

    transactionItemElement.price.taxAmount = +(gFFWNV([
        () => item.itemTaxAmount,
        () => 0
    ]) || 0);
    transactionItemElement.price.taxAmount = roundToDecimal(transactionItemElement.price.taxAmount, 2);
    total_taxAmount += transactionItemElement.price.taxAmount;

    transactionItemElement.price.priceWithTax = +(gFFWNV([
        () => item.itemPriceWithTax,
        () => ((transactionItemElement.price.basePrice + transactionItemElement.price.discountAmountSum) + transactionItemElement.price.taxAmount),
        () => 0
    ]) || 0);
    transactionItemElement.price.priceWithTax = roundToDecimal(transactionItemElement.price.priceWithTax, 2);
    total_priceWithTax += transactionItemElement.price.priceWithTax;

    transactionItemElement.price.shippingMethod = (gFFWNV([
        () => item.itemShippingMethod,
        () => ''
    ]) || '');

    // transactionItemElement.price.shipping = item.itemShippingCost || 0; // mapped inside s.products
    // transactionItemElement.price.shipping = roundToDecimal(transactionItemElement.price.shipping, 2);
    // total_shipping += transactionItemElement.price.shipping;

    // transactionItemElement.price.taxRate = item.itemTaxRate || 0; // mapped inside s.products
    // transactionItemElement.price.taxRate = roundToDecimal(transactionItemElement.price.taxRate, 2);

    // transactionItemElement.price.discountPercent = item.itemDiscountPercent || 0; // mapped inside s.products
    // transactionItemElement.price.discountPercent = roundToDecimal(transactionItemElement.price.discountPercent, 2);
    // total_DiscountPercent += transactionItemElement.price.discountPercent;

    return transactionItemElement;
    //this.message.transaction.item.push(transactionItemElement);
}

if (typeof mandatoryData != 'undefined' && typeof mandatoryData['vehicle'] != 'undefined') {
    for (var i in mandatoryData['vehicle']) {
        var transactionProcessedElement = processTransactionItem(mandatoryData['vehicle'][i], this.defaultDatalayer.transaction.item[0]);
        this.message.transaction.item.push(transactionProcessedElement);
    }
    //mandatoryData['vehicle'].forEach(vehicle => processTransactionItem(vehicle, this.defaultDatalayer.transaction.item[0]));
}

if (typeof mandatoryData != 'undefined' && typeof mandatoryData['options'] != 'undefined') {
    for (var i in mandatoryData['options']) {
        var transactionProcessedElement = processTransactionItem(mandatoryData['options'][i], this.defaultDatalayer.transaction.item[0]);
        this.message.transaction.item.push(transactionProcessedElement);
    }
    //mandatoryData['options'].forEach(option => processTransactionItem(option, this.defaultDatalayer.transaction.item[0]));
}

//Note: Developers are responsible for sending the amount * quantity

if (typeof this.message.custom != "undefined" && (mandatoryData['vehicle'] || mandatoryData['options'])) {

    this.message.transaction.total = {};

    this.message.transaction.transactionID = (gFFWNV([
        () => mandatoryData['transactionID'],
        () => ''
    ]) || '');
    this.message.transaction.transactionID = (this.message.transaction.transactionID).toUpperCase();// regular eVar - no array

    this.message.transaction.total.currency = (gFFWNV([
        () => mandatoryData['totalCurrency'],
        () => ''
    ]) || '');
    this.message.transaction.total.currency = (this.message.transaction.total.currency || "").toUpperCase();

    this.message.transaction.total.basePrice = +(gFFWNV([
        () => mandatoryData['totalBasePrice'],
        () => total_basePrice,
        () => 0
    ]) || 0);
    this.message.transaction.total.basePrice = roundToDecimal(this.message.transaction.total.basePrice, 2);

    this.message.transaction.total.discountItemAmounts = (gFFWNV([
        () => total_DiscountAmountSum,
        () => 0
    ]) || 0);
    this.message.transaction.total.discountItemAmounts = toNegativeNumber(this.message.transaction.total.discountItemAmounts);
    this.message.transaction.total.discountItemAmounts = roundToDecimal(this.message.transaction.total.discountItemAmounts, 2);

    this.message.transaction.total.discountAmountAdditional = +(gFFWNV([
        () => mandatoryData['totalDiscountAmountAdditional'],
        () => 0
    ]) || 0);
    this.message.transaction.total.discountAmountAdditional = toNegativeNumber(this.message.transaction.total.discountAmountAdditional);

    this.message.transaction.total.discountAmountSum = +(gFFWNV([
        () => mandatoryData['totalDiscountAmount'],
        () => (this.message.transaction.total.discountItemAmounts + this.message.transaction.total.discountAmountAdditional),
        () => 0
    ]) || 0);
    this.message.transaction.total.discountAmountSum = toNegativeNumber(this.message.transaction.total.discountAmountSum);
    this.message.transaction.total.discountAmountSum = roundToDecimal(this.message.transaction.total.discountAmountSum, 2);

    this.message.transaction.total.taxItemsAmount = +(gFFWNV([
        () => total_taxAmount,
        () => 0
    ]) || 0);
    this.message.transaction.total.taxItemsAmount = roundToDecimal(this.message.transaction.total.taxItemsAmount, 2);

    this.message.transaction.total.taxAmountAdditional = +(gFFWNV([
        () => mandatoryData['totalTaxAmountAdditional'],
        () => 0
    ]) || 0);

    //this.message.transaction.total.taxAmount =  - removed
    this.message.transaction.total.taxAmountSum = +(gFFWNV([
        () => (total_taxAmount + this.message.transaction.total.taxAmountAdditional),
        () => 0
    ]) || 0);

    // this.message.transaction.total.taxAmountSum = +(gFFWNV([
    //     () => (total_taxAmount + mandatoryData['totalTaxAmount']),
    //     () => 0
    // ]) || 0);
    // this.message.transaction.total.taxAmountSum = roundToDecimal(this.message.transaction.total.taxAmountSum, 2);

    this.message.transaction.total.shipping = +(gFFWNV([
        () => mandatoryData['totalShippingCost'],
        () => 0
    ]) || 0);
    this.message.transaction.total.shipping = roundToDecimal(this.message.transaction.total.shipping, 2);

    this.message.transaction.total.priceWithTax = +(gFFWNV([
        () => mandatoryData['totalPriceWithTax'],
        () => ((this.message.transaction.total.basePrice + this.message.transaction.total.discountAmountSum) + this.message.transaction.total.taxAmountSum),
        () => 0
    ]) || 0);
    this.message.transaction.total.priceWithTax = roundToDecimal(this.message.transaction.total.priceWithTax, 2);

    this.message.transaction.total.transactionTotal = +(gFFWNV([
        () => mandatoryData['totalFinalPrice'],
        () => (this.message.transaction.total.priceWithTax + this.message.transaction.total.shipping),
        () => 0
    ]) || 0);
    this.message.transaction.total.transactionTotal = roundToDecimal(this.message.transaction.total.transactionTotal, 2);

    this.message.transaction.total.paymentMethod = (gFFWNV([
        () => mandatoryData['totalPaymentMethod'],
        () => ''
    ]) || '');

    // if (typeof mandatoryData['totalShippingMethod'] != 'undefined') {
    //     this.message.transaction.total.shippingMethod = (mandatoryData['totalShippingMethod']).toLowerCase(); // regular eVar - no array
    // }
    // this.message.transaction.total.taxRate = mandatoryData['totalTaxRate'] || 0; // regular eVar - no array
    // this.message.transaction.total.taxRate = roundToDecimal(this.message.transaction.total.taxRate, 2);
    // if (typeof mandatoryData['totalVoucherCode'] != 'undefined') {
    //     this.message.transaction.total.voucherCode = mandatoryData['totalVoucherCode'];
    // }
    // this.message.transaction.total.voucherDiscount = mandatoryData['totalDiscountPercent'] || 0;
    // this.message.transaction.total.voucherDiscount = roundToDecimal(this.message.transaction.total.voucherDiscount, 2);
}
// }

// *** end eventHandlerTransactions.js ***
}
}

// *** end eventHandlerOptions.js ***
// *** start eventHandlerConfiguration.js ***

// ***********
// * MAPPING *
// ***********

//map section
var category1Value = '';
if (typeof mandatoryData != 'undefined' && typeof mandatoryData['options'] != 'undefined') {
  if (mandatoryData['options'].length > 0) {
    for (var i in mandatoryData['options']) {
      if (typeof mandatoryData['options'][i]['category1'] != 'undefined' && this.message.event[0].category.subCategory1 == 'configuration change') {
        category1Value = gFFWNV([
          () => mandatoryData['options'][0]['category1']
        ]);
        break;
      }
    }
    if (category1Value != '') {
      this.message.event[0].eventInfo.effect += category1Value;
    }
  }
}

// *** end eventHandlerConfiguration.js ***
// *** start eventHandlerCommerce.js ***

// ******************************
// * VARIABLE MAPPING: commerce *
// ******************************

if (typeof mandatoryData['stepName'] != 'undefined' && this.message.event[0].eventInfo.effect == "user updated checkout details") {
  this.message.event[0].eventInfo.effect = gFFWNV([
    () => "user updated " + mandatoryData['stepName']
  ]);
}

if (typeof mandatoryData['transactionID'] != 'undefined' && this.message.event[0].eventInfo.effect == "user paid successfully") {
  this.message.event[0].attributes.purchaseID = gFFWNV([
    () => mandatoryData['transactionID']
  ]);
}

// if (typeof mandatoryData['step'] != 'undefined') {
//   this.message.event[0].eventInfo.effect += " " + gFFWNV([
//     () => mandatoryData['step']
//   ]);
// }

// *** end eventHandlerCommerce.js ***
// *** start eventHandlerClicks.js ***

// ************************
// * VALUE CHECKS: Clicks *
// ************************

// validate viewMode
if (typeof this.allowedViewModes != 'undefined') {
  try {
    this._validateProperty('viewMode', this.allowedViewModes, eventName, mandatoryData);
  } catch (e) {
    return false
  }
}

// validate viewType
if (typeof this.allowedViewTypes != 'undefined') {
  try {
    this._validateProperty('viewType', this.allowedViewTypes, eventName, mandatoryData);
  } catch (e) {
    return false
  }
}

// validate viewDayTime
if (typeof this.allowedViewDayTimes != 'undefined') {
  try {
    this._validateProperty('viewDayTime', this.allowedViewDayTimes, eventName, mandatoryData);
  } catch (e) {
    return false
  }
}

// validate viewScreen
if (typeof this.allowedViewScreens != 'undefined') {
  try {
    this._validateProperty('viewScreen', this.allowedViewScreens, eventName, mandatoryData);
  } catch (e) {
    return false
  }
}

// validate viewPerspective
if (typeof this.allowedViewPerspectives != 'undefined') {
  try {
    this._validateProperty('viewPerspective', this.allowedViewPerspectives, eventName, mandatoryData);
  } catch (e) {
    return false
  }
}

// ****************************
// * VARIABLE MAPPING: clicks *
// ****************************

if (typeof mandatoryData['requestedURL'] != 'undefined') {
  this.message.event[0].attributes.requestedURL = gFFWNV([
    () => mandatoryData['requestedURL']
  ]);
}

if (typeof mandatoryData['ctaTarget'] != 'undefined' && this.message.event[0].eventInfo.eventName == "interaction") {
  this.message.event[0].eventInfo.effect = gFFWNV([
    () => this.message.event[0].eventInfo.effect + mandatoryData['ctaTarget']
  ]);
}

let effectString = this.message.event[0].eventInfo.effect;
if (typeof mandatoryData['ctaTarget'] == 'undefined' && typeof effectString != 'undefined' && effectString.includes("user clicked on") && mandatoryData['eventEffect'] && typeof mandatoryData['eventEffect'] != 'undefined') {
  this.message.event[0].eventInfo.effect = this.message.event[0].eventInfo.effect + mandatoryData['eventEffect']
}

if (typeof mandatoryData['eventSubCat1'] != 'undefined') {
  this.message.event[0].category.subCategory1 = gFFWNV([
    () => mandatoryData['eventSubCat1']
  ]);
}

if (mandatoryData['listType'] && typeof mandatoryData['listType'] != 'undefined') {
  this.message.event[0].eventInfo.effect = this.message.event[0].eventInfo.effect + mandatoryData['listType']
  this.message.event[0].category.subCategory1 = mandatoryData['listType'] + " " + this.message.event[0].category.subCategory1
  if (typeof this.message.event[0].category.subCategory1 == 'string' && this.message.event[0].category.subCategory1.length > 0) {
    this.message.event[0].category.subCategory1 = this.message.event[0].category.subCategory1.replace("  ", " ");
  }
}

if (this.message.event[0].category.subCategory1 == 'view' && mandatoryData['viewMode'] && typeof mandatoryData['viewMode'] != 'undefined') {
  this.message.event[0].category.subCategory1 = this.message.component[0].componentInfo.componentName + " " + mandatoryData['viewMode'] + ' view'
}

if (typeof mandatoryData['linkLocation'] != 'undefined') {
  this.message.event[0].category.subCategory2 = gFFWNV([
    () => mandatoryData['linkLocation']
  ]);
}

if (typeof mandatoryData['viewMode'] != 'undefined') {
  this.message.event[0].category.subCategory2 = gFFWNV([
    () => mandatoryData['viewMode']
  ]);
}

if (typeof mandatoryData['viewType'] != 'undefined') {
  this.message.event[0].category.subCategory2 = gFFWNV([
    () => mandatoryData['viewType']
  ]);
}

if (typeof mandatoryData['viewDayTime'] != 'undefined') {
  this.message.event[0].category.subCategory2 = gFFWNV([
    () => this.message.event[0].category.subCategory2 + " " + mandatoryData['viewDayTime'] + " mode"
  ]);
}

if (typeof mandatoryData['viewScreen'] != 'undefined') {
  this.message.event[0].category.subCategory2 = gFFWNV([
    () => this.message.event[0].category.subCategory2 + " on " + mandatoryData['viewScreen']
  ]);
}

if (typeof mandatoryData['viewPerspective'] != 'undefined') {
  this.message.event[0].category.subCategory2 = gFFWNV([
    () => this.message.event[0].category.subCategory2 + " " + mandatoryData['viewPerspective'] + " view"
  ]);
}

if (typeof mandatoryData['imageBackground'] != 'undefined') {
  this.message.event[0].category.subCategory2 = gFFWNV([
    () => this.message.event[0].category.subCategory2 + " " + mandatoryData['imageBackground']
  ]);
}

if (typeof mandatoryData['positionClicked'] != 'undefined') {
  this.message.event[0].attributes.positionClicked = gFFWNV([
    () => mandatoryData['positionClicked']
  ]);
}

if (typeof mandatoryData['searchResults'] != 'undefined' && typeof mandatoryData['positionClicked'] != 'undefined') {
  this.message.event[0].attributes.positionClicked = this.message.event[0].attributes.positionClicked + "/" + mandatoryData['searchResults']
}

if (typeof mandatoryData['eventCause'] != 'undefined') {
  this.message.event[0].eventInfo.cause = gFFWNV([
    () => mandatoryData['eventCause']
  ]);
}

// *** end eventHandlerClicks.js ***
// 'userLoginStatus'
// validate user login status
if (mandatoryData && mandatoryData['userLoginStatus'] && (typeof mandatoryData['userLoginStatus'] != 'undefined')) {
  let userLoginStatus = mandatoryData["userLoginStatus"];
  if (!this.allowedUserLoginStatus.includes(userLoginStatus)) {
    let determineErrorCase = (typeof mandatoryData['userLoginStatus'] == "string" && mandatoryData['userLoginStatus'].trim().length == 0) ? 'empty' : 'incorrect';
    this._throwError('m', 'UserLoginStatus', determineErrorCase, this.allowedUserLoginStatus);
    return;
  }
  mandatoryData["userLoginStatus"] = userLoginStatus;
}

if (typeof mandatoryData['userLoginStatus'] != 'undefined') {
  this.message.user[0].profile[0].attributes.loggedInStatus = gFFWNV([
    () => mandatoryData['userLoginStatus']
  ]);
}

// 'userProfileID'
if (typeof mandatoryData['userProfileID'] != 'undefined') {
  this.message.user[0].profile[0].profileInfo.profileID = gFFWNV([
    () => mandatoryData['userProfileID']
  ]);
}

// 'userSegment'
if (typeof mandatoryData['userSegment'] != 'undefined') {
  this.message.user[0].segment = gFFWNV([
    () => mandatoryData['userSegment']
  ]);
}

// 'userType'
if (typeof mandatoryData['userType'] != 'undefined') {
  this.message.user[0].profile[0].profileInfo.type = gFFWNV([
    () => mandatoryData['userType']
  ]);
}


        // GENERIC EVENT HANDLER - mapping every parameter that's the same across all projects
        if (typeof mandatoryData != "undefined") {
            if (mandatoryData['componentVersion']) {
                this.message.component[0].attributes.componentVersion = mandatoryData['componentVersion']
            }
        }

        this.message.event[0].category.primaryCategory = this.message.component[0].componentInfo.componentName;

        //Component ID
        if (typeof mandatoryData != "undefined") {

            this.message.component[0].componentInfo.componentID = determineBrand();

            this.message.component[0].componentInfo.componentID += " > " + ((typeof mandatoryData['pageGeoRegion'] != 'undefined' ? mandatoryData['pageGeoRegion'] : '') || datalayerPath('page.pageInfo.geoRegion') || '');

            this.message.component[0].componentInfo.componentID += " > " + ((typeof mandatoryData['componentName'] != 'undefined' ? mandatoryData['componentName'] : '') || this.message.component[0].componentInfo.componentName);

            if (this.message.event[0].eventInfo.eventName == "form") {
                this.message.component[0].componentInfo.componentID += " " + (typeof mandatoryData['formType'] != 'undefined' ? mandatoryData['formType'] : '');
            }

            //Update componentName 
            TRON.componentName = ((typeof mandatoryData['componentName'] != 'undefined' ? mandatoryData['componentName'] : '') || this.message.component[0].componentInfo.componentName) || TRON.componentName;
        }

        if (typeof this.message.event[0].eventInfo.effect != 'undefined') {
            if (typeof prefix != "undefined") {
                prefix = prefix.split('>').map(s => s.trim()).join(' > ');
            }
            this.message.event[0].eventInfo.effect = (prefix || "") + this.message.event[0].eventInfo.effect;
            //move event.timeStamp to event.eventInfo.timeStamp
            this.message.event[0].eventInfo.timeStamp = this.message.event[0].timeStamp;
            delete this.message.event[0].timeStamp;
        }

        if ((((window.adobeDataLayer || "")[0] || "").event || "") != "aem page loaded") {
            if (this.message.event[0].eventInfo.eventName != 'page view') {
                // if (typeof window.adobeDataLayer != "undefined" && typeof window.adobeDataLayer.getState != "undefined" && typeof window.adobeDataLayer.getState('page') == "undefined") {
                if (typeof getDL('page') != 'undefined' && (typeof getDL('page') != 'string' || getDL('page') == "")) {
                    this.message.page = buildPageObj();
                }
                // }
            }
        }

        //check if there are products sent and accordingly add to the page
        if (this.message.product.length > 0) {
            var prodRef = [];
            var prodRef2 = [];
            for (var i in this.message.product) {
                if (typeof this.message.product[i] != 'undefined' && typeof this.message.product[i].productInfo != 'undefined') {
                    var productKey = this.message.product[i].productInfo.productID;
                    if (typeof productKey == "undefined") {
                        productKey = 'product' + (i + 1);
                    }
                    prodRef.push(productKey);
                    if (typeof this.message.product[i].category.primaryCategory != 'undefined' && (this.message.product[i].category.primaryCategory.indexOf('car') > -1 || this.message.product[i].category.primaryCategory.indexOf('bike') > -1)) {
                        prodRef2.push(productKey);
                    }
                }
            }
            this.message.page.pageInfo.reference = {};
            this.message.page.pageInfo.reference.defaultProducts = [];
            if (this.message.event[0].eventInfo.eventName == 'page view') {
                this.message.page.pageInfo.reference.defaultProducts = [].concat(prodRef2);
            } else {
                this.message.page.pageInfo.reference.defaultProducts = [].concat(prodRef);
            }
        }

        var hasUserKey = Object.keys(mandatoryData).some(key => key.startsWith('user'));

        if (typeof mandatoryData != "undefined" && !hasUserKey) {
            if (typeof window.adobeDataLayer != "undefined" && typeof window.adobeDataLayer.getState != "undefined") {
                var users = window.adobeDataLayer.getState();
                if (typeof users['user'] != "undefined" && Object.keys(users['user']).length > 0) {
                    var userArray = [];
                    for (var i in users['user']) {
                        userArray.push(users['user'][i])
                    }
                    this.message.user = this.message.user;
                }
            } else if (typeof getDL('user') != 'undefined' && typeof getDL('user') != 'string') {
                this.message.user = getDL('user');
            }
        }

        if (typeof mandatoryData != "undefined" && typeof mandatoryData['dealer'] == "undefined") {
            if (typeof window.adobeDataLayer != "undefined" && typeof window.adobeDataLayer.getState != "undefined") {
                var dealer = window.adobeDataLayer.getState();
                if (typeof dealer['dealer'] != "undefined" && Object.keys(dealer['dealer']).length > 0) {
                    this.message.dealer = [];
                    for (var i in dealer['dealer']) {
                        this.message.dealer.push(dealer['dealer'][i])
                    }
                }
            } else if (typeof getDL('dealer') != 'undefined' && typeof getDL('dealer') != 'string') {
                this.message.dealer = getDL('dealer');
            }
        }
        // mapping error parameters
        if (this.message.event[0].eventInfo.eventName == 'error') {
            this.message.event[0].eventInfo.effect = ((typeof mandatoryData['errorMessage'] != 'undefined') ? ((prefix || '') + mandatoryData['errorMessage']) : '');

            if (typeof mandatoryData['errorAction'] != 'undefined') {
                this.message.event[0].eventInfo.eventAction = mandatoryData['errorAction'];
            }
            if (typeof mandatoryData['errorCause'] != 'undefined') {
                this.message.event[0].eventInfo.cause = mandatoryData['errorCause'];
            }
            if (typeof mandatoryData['errorType'] != 'undefined') {
                this.message.event[0].eventInfo.type = mandatoryData['errorType'];
            }

            this.message.event[0].category.primaryCategory = mandatoryData['componentName'] || this.message.component[0].componentInfo.componentName;

            if (typeof mandatoryData['errorCode'] != 'undefined') {
                this.message.event[0].category.subCategory1 = mandatoryData['errorCode'];
            }
            if (typeof mandatoryData['errorOrigin'] != 'undefined') {
                this.message.event[0].category.subCategory2 = mandatoryData['errorOrigin'];
            }
            if (typeof mandatoryData['errorURL'] != 'undefined') {
                this.message.event[0].attributes.requestedURL = mandatoryData['errorURL'];
            }

            // remove non CEDDL conform fields in event function
            delete this.message.event[0].type;
            delete this.message.event[0].action;
            delete this.message.event[0].cause;
            delete this.message.event[0].effect;
        }

        //mapping the parameter "eventCause"
        if (mandatoryData['eventCause'] && mandatoryData['eventCause'] != undefined) {
            this.message.event[0].eventInfo.cause = mandatoryData['eventCause'];
        }

        //eventPoints
        if ((typeof mandatoryData['eventPoints'] != 'undefined' || (typeof mandatoryData['eventPoints'] == 'string' && mandatoryData['eventPoints'].trim().length == 0))) { // only for events with speed tracking
            if (typeof mandatoryData["eventPoints"] != "number") {
                var determineError = (typeof mandatoryData['eventPoints'] != "undefined" && mandatoryData['eventPoints'] == "") ? 'empty' : 'incorrect-numeric';
                if (this.events[eventName].mandatoryData.indexOf('eventPoints') > -1) {
                    this._throwError('m', 'eventPoints', determineError, '', '(time between two events in miliseconds)');
                    return;
                } else {
                    this._throwError('o', 'eventPoints', determineError, '', '(time between two events in miliseconds)');
                }
            }
            this.message.event[0].eventInfo.eventPoints = mandatoryData["eventPoints"]
        }

        //mapping the parameter "eventAction (item added/removed must not be overwritten)
        if (typeof mandatoryData['eventAction'] != 'undefined' && (this.message.event[0].eventInfo.eventAction == "item added" || this.message.event[0].eventInfo.eventAction == "item removed" || this.message.event[0].eventInfo.eventAction == "form start intention")) {
            this._throwError("o", this.message.event[0].eventInfo.eventAction, "specific case", "");
            //console.warn("since eventInfo.eventAction = 'item added' or 'item removed' or 'form start intention', it cannot be overwritten with eventAction");
        } else if (typeof mandatoryData['eventAction'] != 'undefined' && (this.message.event[0].eventInfo.eventAction !== "item added" && this.message.event[0].eventInfo.eventAction !== "item removed" && this.message.event[0].eventInfo.eventAction !== "form start intention")) {
            if (typeof mandatoryData['eventAction'] == 'string' && mandatoryData['eventAction'].trim().length > 0) {
                this.message.event[0].eventInfo.eventAction = mandatoryData['eventAction']
            }
        }

        //effect should always be lower case
        this.message.event[0].eventInfo.effect = (this.message.event[0].eventInfo.effect || "").toLowerCase();

        //Map Step and StepAmounts
        if (mandatoryData['stepAmounts'] && typeof mandatoryData['stepAmounts'] != 'undefined') {
            if (mandatoryData['step'] && typeof mandatoryData['step'] != 'undefined') {
                this.message.event[0].attributes.stepAmounts = ('step ' + mandatoryData['step'] + '/' + mandatoryData['stepAmounts']);
            } else {
                this.message.event[0].attributes.stepAmounts = mandatoryData['stepAmounts'];
            }
        }

        //change the component ID
        this.message.component[0].componentInfo.componentID = `${gFFWNV([ //brand
            () => adobeDataLayer.getState('page.attributes.brand'),
            () => determineBrand()
        ]) || ""}/${gFFWNV([ //geoRegion
            () => adobeDataLayer.getState('page.pageInfo.geoRegion'),
            () => window.location.href.split('country=')[1].split('&')[0],
            () => window.location.href.split('country_origin=')[1].split('&')[0],
            () => (window.location.host.indexOf('bmwusa') > -1) ? "US" : "",
            () => (((this.message.page || "").pageInfo || "").geoRegion || "")
        ]) || ""}_${gFFWNV([ //language
            () => adobeDataLayer.getState('page.pageInfo.language'),
            () => (((this.message.page || "").pageInfo || "").language || ""),
            () => (window.location.host.indexOf('bmwusa') > -1) ? "en" : ""
        ]) || ""}/${this.message.component[0].componentInfo.componentName}` //componentName

        //this.message.component[0].componentInfo.componentID = (((this.message.page || "").attributes || "").brand || "") + "/" + (((this.message.page || "").pageInfo || "").geoRegion || "") + "_" + (((this.message.page || "").pageInfo || "").language || "") + "/" + this.message.component[0].componentInfo.componentName;

        //change the page ID
        //--/[pageType]/[brand]/[geoRegion]/[langugage]/[pagePrimaryCat]/[pageSubCat1]/[pageSubCat2]/[pageSubCat3]/[pageName]
        if (typeof this.message.page.pageInfo.pageID != "undefined") {
            this.message.page.pageInfo.pageID = "/" + (this.message.page.category.pageType || '') + "/" + this.message.page.attributes.brand + "/" + this.message.page.pageInfo.geoRegion + "/" + this.message.page.pageInfo.language + "/" + this.message.page.category.primaryCategory + "/";

            if (typeof this.message.page.category.subCategory1 != "undefined" && this.message.page.category.subCategory1 != "") {
                this.message.page.pageInfo.pageID = this.message.page.pageInfo.pageID + this.message.page.category.subCategory1 + "/"
            }

            if (typeof this.message.page.category.subCategory2 != "undefined" && this.message.page.category.subCategory2 != "") {
                this.message.page.pageInfo.pageID = this.message.page.pageInfo.pageID + this.message.page.category.subCategory2 + "/"
            }

            if (typeof this.message.page.category.subCategory3 != "undefined" && this.message.page.category.subCategory3 != "") {
                this.message.page.pageInfo.pageID = this.message.page.pageInfo.pageID + this.message.page.category.subCategory3 + "/"
            }

            this.message.page.pageInfo.pageID = this.message.page.pageInfo.pageID + ((typeof this.message.page.pageInfo.pageName != "undefined" && this.message.page.pageInfo.pageName.indexOf('>') > -1 && this.message.page.pageInfo.pageName.split(' > ').length > 0 && this.message.page.pageInfo.pageName.split(' > ')[1]) || (this.message.page.pageInfo.pageName));
        }

        //this._debug("ðŸ’² payload created", this.message);
        this._sendMessage();
    }

    //check if the required mandatory parameters are shared
    _checkmandatoryData(eventName, mandatoryData) {
        let expectedData = this.events[eventName].mandatoryData;
        let flag = true;
        let returnFlag;
        let item = '';
        for (let i = 0; i < expectedData.length; i++) {
            let expectedKey = expectedData[i];
            let value;
            if (expectedKey.indexOf('[n]') > -1) {
                let splitKey = expectedKey.split('[n]');
                item = splitKey[1].replace('.', '');
                value = mandatoryData[splitKey[0]] && mandatoryData[splitKey[0]][0][item];
            } else {
                value = mandatoryData[expectedKey];
            }
            //check from project specific configurations
            if (typeof value == "undefined") {
                switch (expectedKey) {
                    case 'componentType':
                        value = (((this.component || "").category || "").componentType || "");
                        break;
                    case 'componentName':
                        value = (((this.component || "").componentInfo || "").componentName || "");
                        break;
                    case 'componentSubCat1':
                        value = (((this.component || "").category || "").subCategory01 || "");
                        break;
                }
            }
            returnFlag = this._checkValidValue("mandatory", expectedKey, item, value, eventName, mandatoryData);
            if (returnFlag == false) {
                flag = false;
            }
        }
        if (flag == false) {
            //     //throw new SyntaxError(`value does not match expected values: ${flag}`);
            throw new SyntaxError('Missing Mandatory Data');
        }
        return true;
    }

    //check if the optional parameters are shared
    _checkOptionalData(eventName, mandatoryData) {
        let expectedData = this.events[eventName].optionalData;
        let flag = true;
        let returnFlag;
        let item = '';
        let errArrayVal = [];
        for (let i = 0; i < expectedData.length; i++) {
            let expectedKey = expectedData[i];
            let value;
            if (expectedKey.indexOf('[n]') > -1) {
                let splitKey = expectedKey.split('[n]');
                if (mandatoryData[splitKey[0]] && mandatoryData[splitKey[0]].length > 0) {
                    item = splitKey[1].replace('.', '');
                    value = mandatoryData[splitKey[0]][0][item];
                    if (value && value == "") {
                        //mandatoryData[splitKey[0]][0][splitKey[1].replace('.', '')] = ''
                        errArrayVal.push(expectedKey);
                    }
                }
            } else {
                value = mandatoryData[expectedKey];
            }
            if (!(typeof value == "undefined" && typeof mandatoryData[expectedKey] == "undefined")) {
                returnFlag = this._checkValidValue("optional", expectedKey, item, value, eventName, mandatoryData);
                if (returnFlag == false) {
                    if (expectedKey.indexOf('[n]') > -1) {
                        mandatoryData[expectedKey.split('[n]')[0]][0][expectedKey.split('[n]')[1].replace('.', '')] = '';
                    } else {

                        mandatoryData[expectedKey] = '';
                    }
                    flag = false;
                }
            }
        }
        return true;
    }

    //check if the value shared does belong to the list of allowed values per parameter
    _checkValidValue(type, item, key, value, functionName, parameterPassed) {
        let returnValue = true;
        let valueChecks = Object.keys(this).map(v => v.toLowerCase());
        key = (key != "" && item.indexOf('[n]') > -1) ? item.replace('[n].', '') : item;
        let searchArray = valueChecks.filter(s => s.includes(key.toLowerCase()));
        let possibleValues = (typeof this[Object.keys(this)[valueChecks.indexOf(searchArray[0])]] == 'object') ? this[Object.keys(this)[valueChecks.indexOf(searchArray[0])]] : [];

        if (key == 'eventEffect') {
            possibleValues = [];
            //if (functionName.indexOf('ViewActions') > -1) {
            if (functionName.toLowerCase().indexOf('viewactions') > -1) {
                if((searchArray[0]).indexOf('generic') > -1){
                possibleValues = this[Object.keys(this)[valueChecks.indexOf(searchArray[0])]];
                }
            } else {
                if (searchArray.length > 1) {
                    possibleValues = this[Object.keys(this)[valueChecks.indexOf(searchArray[1])]];
                }else if(searchArray.length == 1 && ((searchArray[0]).indexOf('generic') < 0)){
                    possibleValues = this[Object.keys(this)[valueChecks.indexOf(searchArray[0])]];
                }
            }
        } else if (key == 'stepName') {
            possibleValues = [];
            //if (functionName.indexOf('CheckoutProcess') > -1) {
            if (functionName.toLowerCase().indexOf('checkoutprocess') > -1) {
                if((searchArray[0]).indexOf('generic') > -1){
                possibleValues = this[Object.keys(this)[valueChecks.indexOf(searchArray[0])]];
                }
            } else {
                if (searchArray.length > 1) {
                    possibleValues = this[Object.keys(this)[valueChecks.indexOf(searchArray[1])]];
                }else if(searchArray.length == 1 && ((searchArray[0]).indexOf('generic') < 0)){
                    possibleValues = this[Object.keys(this)[valueChecks.indexOf(searchArray[0])]];
                }
            }
        }        

        var ignoreParameters = ['formLeadType', 'formComChannel', 'dealer[n].selectionState', 'options[n].code', 'options[n].codeVG', 'options[n].category1', 'pageGeoRegion', 'pageLanguage', 'vehicle[n].range', 'pageSubCat1', 'eventPoints', 'viewMode', 'viewType', 'viewDayTime', 'viewScreen', 'viewPerspective', 'filterObject', 'search[n].searchState', 'componentPlatform', 'pageVariant', 'videoCurrentTime', 'videoTotalLength', 'formVariant', 'componentSubCat1', 'componentType', 'step', 'stepAmounts', 'totalCurrency', 'vehicle[n].itemBasePrice', 'vehicle[n].itemDiscountSalesAmount', 'vehicle[n].itemDiscountOtherAmount', 'vehicle[n].itemPriceWithTax', 'vehicle[n].itemQuantity', 'vehicle[n].itemTaxAmount', 'options[n].itemBasePrice', 'options[n].itemDiscountSalesAmount', 'options[n].itemDiscountOtherAmount', 'options[n].itemPriceWithTax', 'options[n].itemQuantity', 'options[n].itemTaxAmount', 'totalBasePrice', 'totalDiscountAmount', 'totalFinalPrice', 'totalPriceWithTax', 'totalShippingCost', 'totalTaxAmount', 'totalTaxAmountAdditional', 'totalDiscountAmountAdditional', 'options[n].linkedDealerCount', 'vehicle[n].linkedDealerCount'];

        if (this.ignoreParamsNotApplicable.length > 0) {
            ignoreParameters = ignoreParameters.concat(this.ignoreParamsNotApplicable);
        }

        if((possibleValues || []).length > 0){
            possibleValues = possibleValues.filter(function (e) {
                return e !== ''
            });
        }
        
        value = (typeof value == 'string') ? (value || "").toLowerCase() : value;

        //value undefined
        if (typeof value == "undefined" || value == null) {
            if (type == "mandatory") {
                //Ignore form data check here and will be taken care at the eventhandler
                if (['vehicle[n].range'].indexOf(item) > -1) {
                    return true;
                } else {
                    this._throwError('m', item, 'missing', '');
                    returnValue = false;
                }
            }
        }
        //value empty
        if (typeof value == "string" && value.trim().length == 0) {

            //Ignore form data check here and will be taken care at the eventhandler
            if (ignoreParameters.indexOf(item) > -1) {
                return true;
            }

            if (item.indexOf('vehicle') > -1) {
                //'rangeAG', 'rangeVG',
                var ignoreCase = ['codeAG', 'codeVG', 'bodyType', 'businessDivision', 'category1', 'fuelType', 'hybridVersion', 'primaryCategory', 'series', 'salesModel', 'status'];
                item = item.split('.')[1];
                if (ignoreCase.indexOf(item) > -1) {
                    return true;
                }
                item = "vehicle[n]." + item;
            }
            if (item.indexOf('options') > -1) {
                var ignoreCase = ['codeVG'];
                item = item.split('.')[1];
                if (ignoreCase.indexOf(item) > -1) {
                    return true;
                }
                item = "options[n]." + item;
            }
            if (item.indexOf('dealer') > -1) {
                var ignoreCase = ['selectionState'];
                item = item.split('.')[1];
                if (ignoreCase.indexOf(item) > -1) {
                    return true;
                }
                item = "dealer[n]." + item;
            }

            if (type == "mandatory") {
                this._throwError('m', item, 'empty', possibleValues);
                returnValue = false;
            } else if (type == "optional") {
                if (!(possibleValues.length > 0)) {
                    this._throwError('o', item, 'empty', possibleValues);
                }

                if (possibleValues.length == 1 && possibleValues[0] == "value should be numeric") {
                    this._throwError('o', item, 'incorrect-o', possibleValues);
                }
                returnValue = true;
            }
        }
        //value wrong
        if (Array.isArray(possibleValues) && possibleValues.length > 0 && !possibleValues.includes(value) && returnValue == true) { //(((typeof value == "string" && value.trim().length == 0)) || (value == null) || (typeof value == 'undefined') || (typeof value == 'number'))
            //Ignore vehicle data check here and will be taken care at the eventhandler
            if (item.indexOf('vehicle') > -1) {
                var ignoreCase = ['codeAG', 'codeVG', 'rangeAG', 'rangeVG', 'bodyType', 'businessDivision', 'category1', 'fuelType', 'hybridVersion', 'primaryCategory', 'series', 'salesModel', 'status'];
                item = item.split('.')[1];
                if (ignoreCase.indexOf(item) > -1) {
                    return true;
                }
                item = "vehicle[n]." + item;
            }
            //Ignore form data check here and will be taken care at the eventhandler
            if (ignoreParameters.indexOf(item) > -1 && typeof value != "undefined") {
                return true;
            }
            //Ignore the numeric value checks
            if (possibleValues.length == 1 && possibleValues[0] == "value should be numeric") {
                return true;
            }

            //EventEffect
            // if (item == "eventEffect" || item == 'stepName') {
            //     if(functionName.indexOf('ViewActions') < 0 && functionName.indexOf('CheckoutProcess') < 0 ){
            //         return true
            //     }
            // }


            if (type == "mandatory") {
                this._throwError('m', item, 'incorrect', possibleValues);
                returnValue = false;
            } else if (type == "optional") {
                this._throwError('o', item, 'incorrect-o', possibleValues);
                returnValue = false;
            }
        }
        return returnValue;
    }

    //generate skeleton of the DL object
    _loadEventData(name, parameterShared) {
        const data = Object.assign({}, JSON.parse(JSON.stringify(this.defaultDatalayer))); // create default datalayer
        data.component[0] = Object.assign({}, JSON.parse(JSON.stringify(this.component))); // load component data into DL

        const defaultDatalayerEventClone = JSON.parse(JSON.stringify(this.defaultDatalayer.event[0]));
        const baseEventClone = JSON.parse(JSON.stringify(this.baseEvent));
        const customEventClone = JSON.parse(JSON.stringify(this.events[name].event));
        data.event[0] = [defaultDatalayerEventClone, baseEventClone, customEventClone].reduce(this._deepMerge.bind(this), {});
        data.event[0].timeStamp = new Date().getTime();

        if (PROJECT_SPECIFIC_DATA.pageExist) {
            if (typeof data.page != "undefined") {
                if (this.events[name].page) {
                    data.page = Object.assign({}, JSON.parse(JSON.stringify(this.page)), JSON.parse(JSON.stringify(this.events[name].page)))
                } else {
                    data.page = Object.assign({}, JSON.parse(JSON.stringify(this.page)))
                }
            }
        }

        if (PROJECT_SPECIFIC_DATA.projConditionCheck) {
            PROJECT_SPECIFIC_DATA.projectCondition(this, name, parameterShared);
        }

        this.events[name].custom = (this.events[name].custom) ? this.events[name].custom : {};
        const baseCustomClone = JSON.parse(JSON.stringify(this.baseCustom || {}));
        const customEventsCustomClone = JSON.parse(JSON.stringify(this.events[name].custom));
        data.custom = [baseCustomClone, customEventsCustomClone].reduce(this._deepMerge.bind(this), {});

        data.version = 'tron_v' + this._TronVersion + 'Â¦' + this._componentTrackingVersion + 'Â¦' + name;
        return data;
    }

    //generic error function
    _throwError(paramType, key, paramValueProperty, possibleValue, instruction) {
        const flagType = (paramType === "m") ? 'Incorrect TRON implementation: â›” ' : 'Incorrect TRON implementation: âš ï¸ ';

        let message = '';

        let buffer = (paramType == "m") ? 'event' : 'value';

        possibleValue = (possibleValue != "") ? possibleValue.reduce((p, s) => {
            return `${p},${s}`
        }) : possibleValue;

        let decideKORPV = (paramType == 'm' && paramValueProperty == 'missing') ? possibleValue : key;

        switch (paramValueProperty) {
            case 'not-defined':
                message += `the parameter ${key} is not defined in the library, hence this value cannot be tracked. The remaining data will be tracked. Please remove this parameter. ${instruction || ''}`;
                break;
            case 'specific case':
                if (['item added', 'item removed', 'form start intention'].includes(key)) {
                    message += `since eventInfo.eventAction = 'item added' or 'item removed' or 'form start intention', it cannot be overwritten with eventAction value ${instruction || ''}`;
                }
                break;
            case 'missing':
                if (typeof possibleValue != 'string' && possibleValue.length > 0) {
                    message += `${key} parameter is missing, hence this ${buffer || ''} cannot be tracked. Please provide the parameter ${instruction || ''}: ${key} with one of the following valid values: ${possibleValue}`;
                } else {
                    message += `${key} parameter is missing, hence this ${buffer || ''} cannot be tracked. Please provide the parameter ${instruction || ''}: ${key}`;
                }
                break;
            case 'empty':
                if (typeof possibleValue != 'string' && possibleValue.length == 0) {
                    message += `${key} value is empty, hence this ${buffer || ''} cannot be tracked. Please provide a valid value ${key} ${instruction || ''}`;
                } else {
                    message += `${key} value is empty, hence this ${buffer || ''} cannot be tracked. Please provide a valid value for ${key} ${instruction || ''}: ${possibleValue}`;
                }
                break;
            case 'incorrect':
                message += `${key} value is incorrect, hence this ${buffer || ''} cannot be tracked. Please pick a standard value ${instruction || ''}: ${possibleValue}`;
                break;
            case 'incorrect-o':
                message += `${key} value is incorrect, hence this value cannot be tracked. The remaining data will be tracked. Pick a standard value ${instruction || ''}: ${possibleValue}`;
                break;
            case 'incorrect-numeric':
                message += `${key} value is incorrect, hence this ${buffer || ''} cannot be tracked. Please send a numeric value. ${instruction || ''}`;
                break;
            case 'incorrect-numeric-negative':
                message += `${key} value is incorrect, hence this ${buffer || ''} cannot be tracked. Please send a negative numeric value. ${instruction || ''}`;
                break;
            case 'eventMessage':
                message += `custom event created was not sent, hence this event cannot be tracked. Please check the error ${instruction || ''}:`;
                break;
            case 'nonValidFunction':
                message += `function ${key}  is not defined in the library, hence this event cannot be tracked. Please make sure to use a correct reference name. ${instruction || ''};`;
                break;
            case 'pii-keyword':
                message += `Parameter ${key} value includes the PII keyword ${instruction}, hence this value will be truncated from the start of the PII keyword. Don't use any of the following PII keywords: ${possibleValue}`
        }

        message = flagType + message;

        if (paramType === "m") {
            TRON.customConsole.error(message)
        } else if (paramType == "o") {
            TRON.customConsole.warn(message)
        }
    }

    _validateProperty(propertyName, allowedValues, eventName, mandatoryData, flagValue = false) {
        if (typeof mandatoryData[propertyName] != "undefined") {
            let propertyValue = mandatoryData[propertyName];
            if (!allowedValues.includes(propertyValue)) {
                if ((this.events[eventName].mandatoryData.indexOf(propertyName) > -1)) { //|| (flagValue == true)
                    let determineErrorCase = (typeof propertyValue == 'string' && propertyValue.trim().length == 0) ? 'empty' : 'incorrect';
                    this._throwError('m', propertyName, determineErrorCase, allowedValues);
                    throw new Error('');
                    //return
                } else {
                    let determineErrorCase = (typeof propertyValue == 'string' && propertyValue.trim().length == 0) ? 'incorrect-o' : 'incorrect-o';
                    this._throwError('o', propertyName, determineErrorCase, allowedValues);
                    mandatoryData[propertyName] = '';
                }
            }
        }
    }

    //deprecated
    _debug(message, object) {
        if (!this.debug) {
            return;
        }
        if (message.indexOf('generic event successfully sent') > -1) {
            console.groupCollapsed('âœ… generic event successfully sent');
            TRON.customConsole.info(object);
            console.groupEnd();
        } else {
            TRON.customConsole.info(this.version, "\r\n", message, "\r\n", object);
        }
    }

    //generate to determine if the component is iframe or not and based on that decide teh browser event
    _sendMessage() {
        //this._debug("âŒ› sending data...");
        if ((this.message.component[0].category.componentType || '').indexOf('iframe') > -1) {
            this._sendPostMessage();
        } else {
            this._sendCustomEvent();
            this._sendGenericEvent();
        }
        this.message = {}; // reset for next event
    }

    //generate browser event and pass the DL built 
    _sendCustomEvent() {
        let event = false;
        try {
            event = new CustomEvent(this.customEventName, JSON.parse(JSON.stringify({
                detail: this.message
            })));
            window.dispatchEvent(event);
        } catch (error) {
            this._throwError('m', 'custom event', 'eventMessage', [error]);
            return false;
        }
        this._debug("âœ… custom event successfully sent", event);
    }

    //generate browser event and pass the DL built 
    _sendGenericEvent() {
        let event = false;
        try {
            event = new CustomEvent(this.genericEventName, JSON.parse(JSON.stringify({
                detail: this.message
            })));
            window.dispatchEvent(event);
        } catch (error) {
            this._throwError('m', 'custom event', 'eventMessage', [error]);
            return false;
        }
        this._debug("âœ… generic event successfully sent", event);
    }

    //pass the DL built to the parent page from iframe
    _sendPostMessage() {
        let message = false;
        try {
            var data = convertToACDL(this.message);
            message = JSON.parse(JSON.stringify({
                methodName: "TRON: postMessage",
                detail: data,
                type: "TRON: generic iframe event listener"
            }));
            window.top.postMessage(JSON.stringify(message), '*');
        } catch (error) {
            this._throwError('m', 'custom event', 'eventMessage', [error]);
            return false;
        }
        this._debug("âœ… postmessage successful sent", message);
    }

    //deep copy of two objects
    _deepMerge(target, source) {
        Object.entries(source).forEach(([key, value]) => {
            if (value && typeof value === 'object') {
                this._deepMerge(target[key] = target[key] || {}, value);
                return;
            }
            target[key] = value;
        });
        return target;
    }
}

//Catch errors to process them as per the syntax TRON follows
// window.onerror = function () {
//     if (arguments.length > 0) {
//         if (typeof arguments[0] == 'string') {
//             if (arguments[0].indexOf('Uncaught TypeError: ') > -1 && arguments[0].indexOf('not a function') > -1) {
//                 var functionName = arguments[0].split('Uncaught TypeError: ')[1].split('is not a function')[0];
//                 functionName = functionName.trim();
//                 //this._throwError("m",functionName,'nonValidFunction',[arguments]);
//                 var x = TRON.version.split('Â¦');
//                 x[x.length - 1] = 'functionDoesNotExist';
//                 TRON.version = x.join('Â¦');
//                 TRON.currentEventName = 'functionDoesNotExist';
//                 TRON.customConsole.error("Incorrect TRON implementation: â›” this function " + functionName + " does not exist, hence this event cannot be tracked. Please make sure to use a correct reference name!", "\n", "Error occurred at:", arguments);
//                 return true;
//             }
//         }
//     }
//     return false;
// };

//Function to extract snapshotDL
//--Extraction Datalayer Start--
export function getDataLayerFromApi() {
    const api = window.digitals2 && window.digitals2.tracking && window.digitals2.tracking.api;
    if (typeof api != 'undefined') {
        const curPage = api.getCurrentPageIndex();
        let dataLayer;
        for (let i = curPage; i > 0; i--) {
            if (typeof api.getPageObject(i).page == 'object') {
                if (api.getPageObject(i).page.category.primaryCategory == 'VCO') {
                    curPage = i;
                    break;
                }
            }
        }
        dataLayer = api.getPageObject(curPage);
        if (
            (typeof dataLayer.pageInstanceId != 'undefined' && dataLayer.pageInstanceId != '') &&
            dataLayer.pageInstanceId.indexOf('need-analyzer') == -1
        ) {
            return dataLayer; // Global DL for pages other than Need analyser
        } else if (
            typeof dataLayer.component != 'undefined' &&
            dataLayer &&
            dataLayer.component[0] &&
            dataLayer.component[0].category &&
            dataLayer.component[0].category.subCategory01 == 'stock locator'
        ) {
            return dataLayer;
        } else if (
            typeof dataLayer.component != 'undefined' &&
            dataLayer &&
            dataLayer.component[0] &&
            dataLayer.component[0].componentInfo &&
            dataLayer.component[0].componentInfo.componentName == 'digital checkout solution'
        ) {
            return dataLayer;
        } else {
            if (
                (typeof dataLayer.pageInstanceId != 'undefined' && dataLayer.pageInstanceId != '') &&
                dataLayer.product.length > 0
            ) {
                return dataLayer;
            } else {
                if (typeof dataLayer.pageInstanceId != 'undefined' && dataLayer.pageInstanceId != '') {
                    if (curPage && curPage > 0) {
                        dataLayer = api.getPageObject(curPage);
                        return dataLayer;
                    } else {
                        dataLayer = api.getPageObject(0);
                        return dataLayer;
                    }
                }
            }
        }
    }
}

export function getDataLayerFromSources() {
    const dataLayerSources = [
        getDataLayerFromApi,
        () => {
            if (typeof BMWdataLayer != 'undefined') {
                return JSON.parse(JSON.stringify(BMWdataLayer));
            }
        },
        () => {
            if (typeof mnm != 'undefined' && ((((mnm || '').mnmnsc || '').page || '').currentPage || '') != '' && typeof mnm.mnmnsc.page.currentPage.getTrackingService != 'undefined') {
                return mnm.mnmnsc.page.currentPage.getTrackingService().getDigitalData();
            }
        },
        () => {
            if (typeof datalayer_localForms != 'undefined') {
                const dl = datalayer_localForms || '';
                const dle = dl.event || [];
                if (dle.length > 0) {
                    return dle[dle.length - 1];
                }
            }
        },
        () => {
            if (window.digital && window.digital.tracking && typeof window.digital.tracking.getInstance == 'function' && typeof window.digitalData == 'undefined' && window.dataLayer) {
                const dataLayerApi = digital.tracking.getInstance(window.dataLayer);
                const currentPageIndex = dataLayerApi.getCurrentPageIndex() || 0;
                const digitalData = dataLayerApi.getPageObject(currentPageIndex);
                if (typeof digitalData == 'object' && Object.keys(digitalData).length == 0) {
                    if (typeof window.dataLayer != "undefined" && typeof window.dataLayer.activePageIndex != "undefined") {
                        const index = window.dataLayer.activePageIndex || 0;
                        if (((window.dataLayer || "").pages || "") != "" && window.dataLayer.pages.length > 0) {
                            return window.dataLayer.pages[index];
                        }
                    }
                }
                return JSON.parse(JSON.stringify(digitalData));
            }
        },
        () => {
            if (typeof window.h5vco != "undefined" && ((window.h5vco || "").digitalData || "") != "") {
                return window.h5vco.digitalData;
            }
        },
        () => {
            if (typeof window.dcsDataLayer != "undefined" && ((window.dcsDataLayer || "").pages || "") != "") {
                const index = window.dcsDataLayer.activePageIndex || 0;
                return window.dcsDataLayer.pages[index];
            }
        },
        () => {
            if (typeof window.dataLayer != "undefined" && typeof window.dataLayer.activePageIndex != "undefined") {
                const index = window.dataLayer.activePageIndex || 0;
                if (((window.dataLayer || "").pages || "") != "" && window.dataLayer.pages.length > 0) {
                    return window.dataLayer.pages[index];
                } else {
                    return window.dataLayer;
                }
            }
        },
        () => {
            if (typeof window.digitalData != 'undefined') {
                return JSON.parse(JSON.stringify(window.digitalData));
            }
        },
        () => {
            if (window.digital && window.digital.tracking && typeof window.digital.tracking.getInstance == "function" && typeof window.dataLayer == "undefined") {
                const dataLayerApi = digital.tracking.getInstance();
                const currentPageIndex = dataLayerApi.getCurrentPageIndex() || 0;
                const digitalData = dataLayerApi.getPageObject(currentPageIndex);
                return JSON.parse(JSON.stringify(digitalData));
            }
        }
    ];

    return gFFWNV(dataLayerSources, {});
}

export function extractFrmPageDL() {
    try {
        const dataLayer = getDataLayerFromSources();
        return dataLayer || '';
    } catch (e) {
        return '';
    }
}
//--Extraction Datalayer End--

//traverse object path and retrieve value
export function getDL(query, defaultValue) {
    try {
        query = query || '';
        var emptyValueEquivalents = ["", "na", "not set", "n/a", "not available", "not yet available", "not selected", "unknown"];
        var path = query.split(".");
        var value = extractFrmPageDL();
        for (var i = 0; i < path.length && value != undefined; i++) { // Traverse until found or undefined
            if (path[i] != undefined && path[i] != "") {
                if (Array.isArray(value) && /-[0-9]+/.test(path[i])) { //If parent is array and path is a negative index
                    value = value[value.length - Math.abs(parseInt(path[i]))];
                } else {
                    value = value[path[i]];
                }
            }
        }
        if (typeof value === 'string' && emptyValueEquivalents.indexOf(value.toLowerCase()) > -1) {
            return defaultValue; //if the value of the property is blank ('') or is blank like, return ''
        } else {
            return value || defaultValue || ''; //if the property is not found, return ''
        }
    } catch (e) {
        //console.error('Error:datalayer fetch-', e);
        return "";
    }
}

//deprecated
export function evaluateDLPath(exp) {
    var x = (getDL(exp) != '' && typeof getDL(exp) != "undefined") ? getDL(exp) : "";
    return x;
}

//evaluate DL expression
export function datalayerPath(exp) {
    var x = (getDL(exp) != '' && typeof getDL(exp) != "undefined") ? getDL(exp) : undefined;
    return x;
}

//from a list of conditions, return the first evalaution that has value
// export function getFirstFunctionWithValue(resolverFunctions, context) {
//     //var returnValue = '';
//     for (let rslvr of resolverFunctions) {
//         try {
//             const value = rslvr.apply(this, [context])
//             if (value !== undefined && !(context && context.isValid && !context.isValid(value))) {
//                 return value;
//             }
//         } catch (e) {}
//     }
// }

// export function gFFWNV(fcts, context = {}) {
//     return getFirstFunctionWithValue(fcts, context.isValid ? context : Object.assign(context, {
//         isValid: (v) => !!v
//     }));
// }

export function getFirstFunctionWithValue(resolverFunctions, context) {
    //var returnValue = '';
    for (let rslvr of resolverFunctions) {
        try {
            const value = rslvr.apply(this, [context])
            if (value !== undefined && !(context && context.isValid && !context.isValid(value))) {
                return value;
            }
        } catch (e) {}
    }
}

export function gFFWNV(fcts, context = {}) {
    return getFirstFunctionWithValue(fcts, context.isValid ? context : Object.assign(context, {
        isValid: (v) => !!v
    }));
}

export function determineBrand() {
    var returnObject = ((gFFWNV([
        () => datalayerPath('page.attributes.brand'),
        () => (window.location.hostname.indexOf('bmw-motorrad') > -1) && 'motorrad',
        () => (window.location.hostname.indexOf('bmw') > -1) && 'bmw',
        () => (window.location.hostname.indexOf('mini') > -1) && 'mini',
        () => (window.location.hostname.indexOf('rolls-royce') > -1) && 'rolls-royce'
    ])) || '');
    return returnObject;
}

//function to build page DL object
export function buildPageObj() {
    var pagAttributes = JSON.parse(JSON.stringify(datalayerPath('page.attributes') || '')) || {};
    pagAttributes['brand'] = determineBrand();

    pagAttributes['pageTitle'] = gFFWNV([
        () => datalayerPath('page.title'),
        () => datalayerPath('page.pageInfo.pageTitle'),
        () => document.title,
    ]);

    pagAttributes['timeZone'] = gFFWNV([
        () => datalayerPath('page.attributes.timeZone')
    ]);

    var returnObject = {
        "attributes": JSON.parse(JSON.stringify(pagAttributes)),
        "category": {
            "pageType": gFFWNV([
                () => datalayerPath('page.category.pageType'),
                () => datalayerPath('page.category.formType'),
                () => datalayerPath('page.category.primaryTags'),
            ]),
            "primaryCategory": gFFWNV([
                () => (datalayerPath('page.attributes.template') == "NBC") && "configurator",
                () => (typeof datalayerPath('page.category.primaryTags') == "object") && datalayerPath('page.category.primaryTags.0'),
                () => (typeof datalayerPath('pageInstanceId') != "undefined" && datalayerPath('pageInstanceId').split('/') && datalayerPath('pageInstanceId').split('/').length > 1 && datalayerPath('pageInstanceId').split('/')[6] == "all-models") && (datalayerPath('pageInstanceId').split('/')[6].length > 8) && 'showroom',
                () => (datalayerPath('pageInstanceId').split('/')[6].length == 8) && 'series overview',
                () => datalayerPath('page.pageHier'),
                () => datalayerPath('page.category.subCategory01'),
                () => datalayerPath('page.category.primaryCategory'),
                () => datalayerPath('page.primarySection'),
                () => datalayerPath('page.category.primaryTags'),
                //() => "homepage",
                () => TRON.componentName
            ]),
            "subCategory1": gFFWNV([
                () => (typeof datalayerPath('page.category.secondaryTags') == 'object') && datalayerPath('page.category.secondaryTags.0'),
                () => ((typeof datalayerPath('pageInstanceId') != "undefined" && datalayerPath('pageInstanceId').split('/') && datalayerPath('pageInstanceId').split('/').length > 1 && typeof datalayerPath('pageInstanceId').split('/')[7] != "undefined")) && datalayerPath('pageInstanceId').split('/')[7],
                () => datalayerPath('page.pageLevel2'),
                () => datalayerPath('page.category.subCategory01'),
                () => datalayerPath('page.category.purchaseReason'),
                () => datalayerPath('page.category.subCategory1'),
                //() => "content",
            ]),
            "subCategory2": gFFWNV([
                () => (typeof datalayerPath('pageInstanceId') != "undefined" && datalayerPath('pageInstanceId').split('/') && datalayerPath('pageInstanceId').split('/').length > 1 && typeof datalayerPath('pageInstanceId').split('/')[8] != "undefined") && (datalayerPath('pageInstanceId').split('/')[8]),
                () => datalayerPath('page.pageLevel3'),
                () => datalayerPath('page.category.subCategory02'),
                () => datalayerPath('page.category.subCategory2')
            ]),
            "subCategory3": gFFWNV([
                () => (typeof datalayerPath('pageInstanceId') != "undefined" && datalayerPath('pageInstanceId').split('/') && datalayerPath('pageInstanceId').split('/').length > 1 && typeof datalayerPath('pageInstanceId').split('/')[9] != "undefined") && (datalayerPath('pageInstanceId').split('/')[9]),
                () => datalayerPath('page.pageLevel4'),
                () => datalayerPath('page.category.subCategory03'),
                () => datalayerPath('page.category.subCategory3')
            ]),
        },
        "pageInfo": {
            "author": datalayerPath('page.pageInfo.author'),
            "destinationURL": gFFWNV([
                () => datalayerPath('page.url'),
                () => datalayerPath('page.pageInfo.destinationUrl'),
                () => datalayerPath('page.pageInfo.destinationURL')
            ]),
            "geoRegion": gFFWNV([
                () => window.location.href.split('country=')[1].split('&')[0],
                () => window.location.href.split('country_origin=')[1].split('&')[0],
                () => datalayerPath('page.pageInfo.geoRegion'),
                () => datalayerPath('page.pageInfo.language').indexOf('-') > -1 && datalayerPath('page.pageInfo.language').split('-')[1],
                () => (window.location.host.indexOf('bmwusa') > -1) ? "US" : "", // "US" if domain bmwusa.com
            ]),
            "language": gFFWNV([
                () => datalayerPath('page.pageInfo.language').slice(0, 2) || ((datalayerPath('page.pageInfo.language').indexOf('-') > -1) ? datalayerPath('page.pageInfo.language').split('-')[0] : (window.location.host.indexOf('bmwusa') > -1) ? "en" : '')
            ]),
            "pageID": gFFWNV([
                () => datalayerPath('page.path'),
                () => datalayerPath('page.name'),
                () => datalayerPath('page.pageInfo.pageInstanceId'),
                () => window.dataLayer && window.dataLayer.pages && ((window.dataLayer.pages[0] || "").pageInstanceId),
                () => datalayerPath('page.pageInfo.pageID')
            ]),
            "pageName": gFFWNV([
                () => datalayerPath('page.name'),
                () => datalayerPath('page.pageInfo.pageName')
            ]),
            "referringURL": gFFWNV([
                () => datalayerPath('page.pageInfo.referringUrl'),
                () => datalayerPath('page.pageInfo.referringURL'),
                () => document.referrer
            ]),
            "sysEnv": gFFWNV([
                () => datalayerPath('page.pageInfo.devEnv'),
                () => datalayerPath('page.pageInfo.envWork'),
                () => datalayerPath('page.pageInfo.sysEnv')
            ]),
            "variant": gFFWNV([
                () => datalayerPath('page.pageInfo.variant'),
                () => datalayerPath('page.attributes.virtualPage') == 'true' ? "virtual page" : "real page",
            ]),
            "version": "acdl: " + datalayerPath('page.pageInfo.version'),
        }
    }
    return returnObject;
}

//for the object built, process it and convert to ACDL structure that can later be pushed for launch to pick up
export function convertToACDL(ceddlObj) {
    var arrayDL = [];

    var productTemplate = {};
    var productReferences = [];
    var productReferences2 = [];

    var capturedProductsFromDataLayer = ceddlObj.product;

    //if details are not sent then add waht is available in ACDL already - AAAA-5581
    // if (capturedProductsFromDataLayer.length <= 0 && typeof window.adobeDataLayer != "undefined" && typeof window.adobeDataLayer.getState != "undefined" && typeof window.adobeDataLayer.getState('product') != "undefined") {
    //     capturedProductsFromDataLayer = Object.keys(adobeDataLayer.getState('product')).map(function (key) {
    //         return adobeDataLayer.getState('product')[key];
    //     });
    // }

    //Execute only if the products exist in the datalayer
    if (capturedProductsFromDataLayer.length > 0 && typeof capturedProductsFromDataLayer != 'string') {
        //Loop through all the products in the snapshot DL and generate a structure
        for (var i in capturedProductsFromDataLayer) {
            if (typeof capturedProductsFromDataLayer[i] != 'undefined' && typeof capturedProductsFromDataLayer[i].productInfo != 'undefined') {
                var productKey = capturedProductsFromDataLayer[i].productInfo.productID;
                if (typeof productKey == "undefined") {
                    productKey = 'product' + ((+i) + 1);
                }
                productTemplate[productKey] = capturedProductsFromDataLayer[i];
                if (typeof capturedProductsFromDataLayer[i].category.primaryCategory != 'undefined' && (capturedProductsFromDataLayer[i].category.primaryCategory.indexOf('car') > -1 || capturedProductsFromDataLayer[i].category.primaryCategory.indexOf('bike') > -1)) {
                    productReferences2.push(productKey);
                }
            }
        }
        //define keys var for event reference
        Object.keys(productTemplate).forEach(key => productReferences.push(key));
        //Push the product template to the ACDL
        arrayDL.push({
            'product': productTemplate
        })
    }


    var isPageView = (ceddlObj.event[0].eventInfo.eventName == "page view") ? true : false;
    var noAcdlPage = (typeof window.adobeDataLayer != "undefined" && typeof window.adobeDataLayer.getState != "undefined" && typeof window.adobeDataLayer.getState('page') == "undefined") ? true : false;
    var isPageName = (((ceddlObj.page || "").pageInfo || "").pageName || "");

    var islocalhost = (['127.0.0.1', 'localhost', 'tron.bmwgroup.com'].indexOf(window.location.hostname) > -1) ? true : false;

    if (islocalhost) {
        if (isPageView) { //real page
            if ((isPageName != 'tbd' && isPageName != '') || typeof isPageName != 'undefined') {
                if (isPageView) {
                    ceddlObj.page.pageInfo.reference = {};
                    ceddlObj.page.pageInfo.reference.defaultProducts = [];
                    ceddlObj.page.pageInfo.reference.defaultProducts = [].concat(productReferences2);
                }
                arrayDL.push({
                    'page': ceddlObj.page
                })
            }
        } else { //legacy import
            if (isPageName == 'tbd' && (typeof getDL('page') != 'undefined' && (typeof getDL('page') != 'string' || getDL('page') == ""))) {
                var pageObj = {};
                pageObj['page'] = buildPageObj();

                if (isPageView) {
                    pageObj.page.pageInfo.reference = {};
                    pageObj.page.pageInfo.reference.defaultProducts = [];
                    pageObj.page.pageInfo.reference.defaultProducts = [].concat(productReferences);
                }
                arrayDL.push(pageObj);
            }
        }
    } else {
        if (isPageView) {
            if (noAcdlPage) { //real page
                if (isPageName != 'tbd' && isPageName != '') {
                    if (isPageView) {
                        ceddlObj.page.pageInfo.reference = {};
                        ceddlObj.page.pageInfo.reference.defaultProducts = [];
                        ceddlObj.page.pageInfo.reference.defaultProducts = [].concat(productReferences2);
                    }

                    arrayDL.push({
                        'page': ceddlObj.page
                    })
                }
            } else if (!noAcdlPage) { //Virtual Page
                if ((isPageName != 'tbd' && isPageName != '') || typeof isPageName != 'undefined') {
                    if (isPageView) {
                        ceddlObj.page.pageInfo.reference = {};
                        ceddlObj.page.pageInfo.reference.defaultProducts = [];
                        ceddlObj.page.pageInfo.reference.defaultProducts = [].concat(productReferences2);
                    }
                    arrayDL.push({
                        'page': ceddlObj.page
                    })
                }
            }
        } else {
            if (noAcdlPage) { //legacy import
                if ((isPageName == 'tbd') && (typeof getDL('page') != 'undefined' && (typeof getDL('page') != 'string' || getDL('page') == ""))) {
                    var pageObj = {};
                    pageObj['page'] = buildPageObj();

                    if (isPageView) {
                        pageObj.page.pageInfo.reference = {};
                        pageObj.page.pageInfo.reference.defaultProducts = [];
                        pageObj.page.pageInfo.reference.defaultProducts = [].concat(productReferences);
                    }
                    arrayDL.push(pageObj);
                } else if ((isPageName != 'tbd') && (typeof getDL('page') != 'undefined' && (typeof getDL('page') != 'string' || getDL('page') == ""))) {
                    var pageObj = {};
                    pageObj['page'] = buildPageObj();

                    if (isPageView) {
                        pageObj.page.pageInfo.reference = {};
                        pageObj.page.pageInfo.reference.defaultProducts = [];
                        pageObj.page.pageInfo.reference.defaultProducts = [].concat(productReferences);
                    }
                    arrayDL.push(pageObj);
                }
            }
        }
    }

    //component
    let componentTemplate = {}
    let componentKey = ceddlObj.component[0].componentInfo.componentID
    componentTemplate[componentKey] = ceddlObj.component[0]

    arrayDL.push({
        'component': componentTemplate,
        'version': ceddlObj.version
    })

    //push cart to ACDL
    var cartTemplate = {};
    var capturedCartFromDatalayer = ceddlObj.cart;
    if (capturedCartFromDatalayer && capturedCartFromDatalayer.item.length > 0 && typeof capturedCartFromDatalayer != 'string') {
        //if (((ceddlObj.event[0].eventInfo.eventName == "commerce") && ((ceddlObj.event[0].eventInfo.type == "cart") || (ceddlObj.event[0].eventInfo.type == "checkout"))) || ((((ceddlObj || "").cart || "").cartID || "") != "")) {
        cartTemplate = Object.assign({}, productTemplate);
        //}

        for (var i in cartTemplate) {
            for (var j in ceddlObj.cart.item) {
                if (i == ceddlObj.cart.item[j].productInfo.productID) {
                    cartTemplate[i].price = Object.assign({}, ceddlObj.cart.item[j].price);
                    cartTemplate[i].quantity = ceddlObj.cart.item[j].quantity;
                }
            }
        }

        var cart = {
            'item': cartTemplate,
            'price': ceddlObj.cart.price || {},
            'cartID': ceddlObj.cart.cartID || ""
        }

        if (typeof cart.price.cartTotal != 'undefined') {
            arrayDL.push({
                'cart': cart
            })
        }
    }

    //push tarnsaction to ACDL
    var transactionTemplate = {};
    var capturedTransactionFromDatalayer = ceddlObj.transaction;
    if (capturedTransactionFromDatalayer && capturedTransactionFromDatalayer.item.length > 0 && typeof capturedTransactionFromDatalayer != 'string') {
        //if (((ceddlObj.event[0].eventInfo.eventName == "commerce") && ((ceddlObj.event[0].eventInfo.type == "order"))) || ((((ceddlObj || "").transaction || "").transactionID || "") != "")) {
        transactionTemplate = Object.assign({}, productTemplate)
        //}

        for (var i in transactionTemplate) {
            for (var j in ceddlObj.transaction.item) {
                if (i == ceddlObj.transaction.item[j].productInfo.productID) {
                    transactionTemplate[i].price = Object.assign({}, ceddlObj.transaction.item[j].price);
                    transactionTemplate[i].quantity = ceddlObj.transaction.item[j].quantity;
                }
            }
        }

        var transaction = {
            'item': transactionTemplate,
            'total': ceddlObj.transaction.total || {},
            'transactionID': ceddlObj.transaction.transactionID || ""
        }

        if (typeof transaction.total.transactionTotal != 'undefined') {
            arrayDL.push({
                'transaction': transaction
            })
        }
    }


    // push product to ACDL
    var dealerTemplate = {};
    var dealerReferences = {};
    var capturedDealerFromDataLayer = ceddlObj.dealer;


    //if details are not sent then add waht is available in ACDL already
    if (capturedDealerFromDataLayer.length <= 0 && typeof window.adobeDataLayer != "undefined" && typeof window.adobeDataLayer.getState != "undefined" && typeof window.adobeDataLayer.getState('dealer') != "undefined") {
        capturedDealerFromDataLayer = Object.keys(adobeDataLayer.getState('dealer')).map(function (key) {
            return adobeDataLayer.getState('dealer')[key];
        });
    }


    //Execute only if the products exist in the datalayer
    if (capturedDealerFromDataLayer.length > 0 && typeof capturedDealerFromDataLayer != 'string') {
        //Loop through all the products in the snapshot DL and generate a structure
        for (var i in capturedDealerFromDataLayer) {
            if (typeof capturedDealerFromDataLayer[i] != 'undefined' && typeof capturedDealerFromDataLayer[i].dealerInfo != 'undefined') {
                var dealerKey = capturedDealerFromDataLayer[i].dealerInfo.dealerOutletBuno;
                dealerTemplate[dealerKey] = capturedDealerFromDataLayer[i];
            }
        }
        Object.keys(dealerTemplate).forEach(key => dealerReferences[key] = "");
        dealerReferences = Object.keys(dealerReferences);
        arrayDL.push({
            'dealer': dealerTemplate
        })
    }

    // push user to ACDL - since there is no user or profile ID yet, we use array
    //Execute only if the products exist in the datalayer

    //if details are not sent then add waht is available in ACDL already
    if (ceddlObj.user.length <= 0 && typeof window.adobeDataLayer != "undefined" && typeof window.adobeDataLayer.getState != "undefined" && typeof window.adobeDataLayer.getState('user') != "undefined") {
        ceddlObj.user = Object.keys(adobeDataLayer.getState('user')).map(function (key) {
            return adobeDataLayer.getState('user')[key];
        });
    }


    var userReferences = {};
    var profileReferences = {};
    if (ceddlObj.user.length > 0 && typeof ceddlObj.user != 'string') {
        var userTemplate = {};
        var tronUserDetail = ceddlObj.user;
        for (var i in tronUserDetail) {
            var profileTemplate = {};
            //
            if (Array.isArray(tronUserDetail[i].profile) && tronUserDetail[i].profile.length > 0) {
                for (var j in tronUserDetail[i].profile) {
                    var profIndex = (tronUserDetail[i].profile[j].profileInfo.profileID != undefined) ? tronUserDetail[i].profile[j].profileInfo.profileID : 'profile' + ((+j) + 1);
                    profileTemplate[profIndex] = JSON.parse(JSON.stringify(tronUserDetail[i].profile[j]));
                }
            } else if (typeof tronUserDetail[i].profile == 'undefined' && typeof tronUserDetail[i].profileInfo != 'undefined' && !Array.isArray(tronUserDetail[i].profileInfo)) {
                var profIndex = 'profile' + ((+i) + 1);
                profileTemplate['profile'] = {};
                profileTemplate['profile'][profIndex] = JSON.parse(JSON.stringify(tronUserDetail[i].profileInfo));
            }
            var userIndex;

            if (typeof profIndex != "undefined" && (profIndex + '').indexOf('profile') > -1) {
                userIndex = 'user' + ((+i) + 1);
            } else {
                userIndex = profIndex;
            }

            userTemplate[userIndex] = JSON.parse(JSON.stringify(tronUserDetail[i]));
            userTemplate[userIndex].profile = JSON.parse(JSON.stringify(profileTemplate));
        }
        ceddlObj.user = JSON.parse(JSON.stringify(userTemplate));

        Object.keys(userTemplate).forEach(key => userReferences[key] = "");
        userReferences = Object.keys(userReferences);

        Object.keys(userTemplate).forEach(key => Object.keys(userTemplate[key].profile).forEach(k => profileReferences[k] = ""));
        profileReferences = Object.keys(profileReferences);

        arrayDL.push({
            'user': ceddlObj.user
        })
    }

    //push event to ACDL 
    var eventName = (ceddlObj.event[0].eventInfo.eventName == "page view") ? "tron page view" : "tron event";
    var tronObject = {
        "event": eventName,
        "eventInfo": {
            "cause": ceddlObj.event[0].eventInfo.cause,
            "effect": ceddlObj.event[0].eventInfo.effect,
            "eventAction": ceddlObj.event[0].eventInfo.eventAction,
            "eventName": ceddlObj.event[0].eventInfo.eventName,
            "eventPoints": ceddlObj.event[0].eventInfo.eventPoints,
            "timeStamp": ceddlObj.event[0].eventInfo.timeStamp,
            "type": ceddlObj.event[0].eventInfo.type,
            "category": ceddlObj.event[0].category,
            "attributes": ceddlObj.event[0].attributes,
            "reference": {
                "linkedComponent": [componentKey],
                "linkedProducts": (ceddlObj.event[0].eventInfo.eventName == "page view") ? productReferences2 : productReferences,
                "linkedDealers": dealerReferences,
                "linkedUser": userReferences,
                "linkedProfile": profileReferences
            }
        }
    }

    arrayDL.push(tronObject);
    return arrayDL;
}


if (!TRON.isInitialized) {
    window.addEventListener('TRON: adobeDataLayer generic event listener', function (e) {
        window.tronDetailDL = e.detail;
        window.adobeDataLayer = window.adobeDataLayer || [];
        var dlObj = convertToACDL(tronDetailDL);
        var result = {};
        for (var i = 0; i < dlObj.length; i++) {
            var obj = dlObj[i];
            var keys = Object.keys(obj);
            for (var j = 0; j < keys.length; j++) {
                var key = keys[j];
                result[key] = obj[key];
            }
        }
        window.adobeDataLayer.push(result);
        if (window.TRON.warningCode.length > 0) {
            for (var i in window.TRON.warningCode) {
                window.adobeDataLayer.push(window.TRON.warningCode[i]);
            }
            window.TRON.warningCode = [];
        }
    })
    TRON.isInitialized = true;
}
//*** end TRON.js ***
// TRON TRACKING LIBRARY END
