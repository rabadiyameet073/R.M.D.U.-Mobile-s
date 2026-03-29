// last build:2023-10-26T05:07:35.327Z
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
        // original console functions
        // var _error = console.error;
        // var _info = console.info;
        // var _warn = console.warn;

        // Determine if debug mode is enabled
        function determineDebugMode() {
            return ((document.location.search.indexOf("trondebug=true") != -1) || (sessionStorage.getItem('tronDebug') != null && (sessionStorage.getItem('tronDebug') === 'true')));
        }

        // error data pushed to ACDL
        function handleError(errorCode, errorMessage) {
            window.adobeDataLayer = window.adobeDataLayer || [];

            let componentTemplate = TRON.dataComponent;

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
    var domains = ['.bmw.', '.mini.', '.bmw-motorrad.', '.bmwusa.com', 'customer.bmwgroup.com'];
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
            domainName === "bmwusa" || (domainName === "bmwgroup" && subdomain === "customer")) {
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
            if(errorCode.indexOf('e0') > -1){
                versionName[versionName.length-1] = "error_" + versionName[versionName.length-1]
            }else if(errorCode.indexOf('w0') > -1){
                versionName[versionName.length-1] = "warning_" + versionName[versionName.length-1]
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
                        "linkedComponent": componentKey
                    }
                }
            };

            var productTemplate = {};
            var productReferences = [];
            var productReferences2 = [];

            var capturedProductsFromDataLayer = [];

            if (typeof window.adobeDataLayer != "undefined" && typeof window.adobeDataLayer.getState != "undefined" && typeof window.adobeDataLayer.getState('product') != "undefined") {
                capturedProductsFromDataLayer = Object.keys(adobeDataLayer.getState('product')).map(function (key) {
                    return adobeDataLayer.getState('product')[key];
                });
            }

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
            var capturedDealerFromDataLayer = []    ;

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
            
            if(errorCode.indexOf("w0") > -1){
                window.TRON.warningCode.push(objectError);
            }else{
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

                if (errorMessage.indexOf('Incorrect TRON implementation: â›” ') > -1) {
                    flagValue = true;
                    var errorMessageBe = errorMessage.split("Incorrect TRON implementation: â›” ")[1];
                    var errorTypes = {
                        "e001": "parameter is missing",
                        "e002": "value is incorrect",
                        "e003": "value is empty",
                        "e004": "does not exist"
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
                        //_error.apply(this, arguments);
                        console.error.apply(console, arguments);
                    }
                } else {
                    //_error.apply(this, arguments);
                    console.error.apply(console, arguments);
                }
                // if (determineDebugMode()) {
                //     _error.apply(this, arguments);
                // }
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

                if (infoMessage.indexOf('TEST check available events') > -1 || infoMessage.indexOf('Incorrect TRON implementation: âš ï¸') > -1) {
                    flagValue = true;
                }

                if (flagValue) {
                    if (determineDebugMode()) {
                        //_info.apply(this, arguments);
                        console.info.apply(console, arguments);
                    }
                } else {
                    //_info.apply(this, arguments);
                    console.info.apply(console, arguments);
                }

                // if (determineDebugMode()) {
                //     _info.apply(this, arguments);
                // }
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

                if (warningMessage.indexOf('Incorrect TRON implementation: âš ï¸ ') > -1) {
                    flagValue = true;
                    var errorMessageBe = warningMessage.split("Incorrect TRON implementation: âš ï¸ ")[1];
                    var errorTypes = {
                        "w002": "value is incorrect"
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
    'customeEventName': 'TRON: forms',
    'libraryName': 'generic_forms',
    'libraryVersion': '_v9.0.1',
    'prefix': '',
    'pageExist': true, //Always Set to True. If removed no page information is captured
    'vehicle': {
        'productType': '',
        'primaryCategory': '',
        'subCategory1': '',
    },
    'options': {
        'productType': '',
        'primaryCategory': '',
    }
}

export default class {
    // ************************
    // * configuration        *
    // ************************
    constructor() {
        this.detectDebugMode();
        this._TronVersion = "5.6.1";

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
        componentType: '', // hard coded for all events
        primaryCategory: '', // hard coded for all events
        subCategory1: 'forms' // hard coded for all events
      },
      componentInfo: {
        componentName: 'forms', // hard coded for all events
        componentID: 'forms' // hard coded for all events
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
        eventName: "form", //value might be overwritten by value specified in event below
        eventPoints: 0, //value might be overwritten by value specified in event below
        type: "ux", //value might be overwritten by value specified in event below
      },
      category: {
        subCategory1: "", //value will be overwritten by value specified in event below (form name)
        subCategory2: "" //value will be overwritten by value specified in event below (form name)
      },
      attributes: {
        requestedURL: "" //value will be overwritten by value specified in event below
      }
    }

    scope.page = {
      category: {
        primaryCategory: "",
        subCategory1: "",
        subCategory2: "",
        subCategory3: "",
        pageType: "tbd"
      }, // to be defined in the page view events below
      pageInfo: {
        pageID: "",
        pageName: "tbd",
        author: "",
        destinationURL: "",
        referringURL: "",
        sysEnv: "",
        variant: "tbd",
        version: "",
        language: "",
        geoRegion: ""
      },
      attributes: {
        brand: "",
        timeZone: "",
      }
    }

// ****************************************
// * PROJECT PARAMETERS FOR ALL FUNCTIONS *
// ****************************************
    scope.errorMandatoryData = ['formOrigin', 'formType'];// only add non-error parameters that are mandatory also at error event eg. componentName
    scope.baseMandatoryData = ['componentType' ,'formLeadType', 'formOrigin', 'formType', 'formVariant']; // all product data that is available in the front end must be provided in dynamic parameters as per description
    scope.baseOptionalData = ['formID', 'formName','userProfileID', 'userLoginStatus','componentDEVagency','componentPlatform','componentVersion','dealer[n].outletBuno','dealer[n].groupID', 'dealer[n].groupName',  'dealer[n].outletID', 'dealer[n].outletName', 'dealer[n].selectionState'];
    scope.productMandatoryData = [];
    scope.productOptionalData = ['options[n].businessDivision', 'options[n].category1', 'options[n].category2', 'options[n].manufacturer', 'options[n].name', 'options[n].productID', 'vehicle[n].bodyType','vehicle[n].businessDivision', 'vehicle[n].manufacturer', 'vehicle[n].name', 'vehicle[n].primaryCategory','options[n].primaryCategory', 'vehicle[n].productID', 'vehicle[n].range', 'vehicle[n].series','vehicle[n].category1', 'vehicle[n].category2', 'vehicle[n].codeAG','vehicle[n].codeVG', 'vehicle[n].color', 'vehicle[n].engine', 'vehicle[n].fuelType', 'vehicle[n].gearing', 'vehicle[n].hybridVersion', 'vehicle[n].status', 'vehicle[n].subSeries', 'vehicle[n].encVIN', 'vehicle[n].salesModel'];
    
// **************************
// * PROJECT ALLOWED VALUES *
// **************************
    
    scope.allowedPageNames = ['form', 'error','page not found error'];
    // *** start allowedValuesComponents.js ***

// *****************************
// * ALLOWED VALUES: COMPONENT *
// *****************************

// scope.allowedComponentNames will always be defined project specific in the config.js
scope.allowedComponentTypes = ['standalone', 'native in-page', 'standalone iframe', 'in-page iframe' ];
scope.allowedComponentPlatform = ['aem > central', 'aem > local', 'non-aem > central'  , 'non-aem > local', 'aem', 'non-aem', 'local' , 'central'];

// *** end allowedValuesComponents.js ***
    // *** start allowedValuesForms.js ***

// ************************
// * ALLOWED VALUES: FORM *
// ************************

scope.allowedFormTypes = ['campaign', 'online tda', 'registration', 'rfa', 'rfc', 'rfd', 'rfi', 'rfo','rfs', 'roi', 'tda', 'fs rfo', 'rfp', 'rft', 'sws', 'vco', 'evt'];
scope.allowedFormOrigins = ['local form', 'adobe form', 'custom central form', 'custom local form'];
scope.allowedFormVariants = ['dedicated form', 'combo form'];
scope.allowedFormLeadTypes = ["lead", "handraiser", "generic", "configurator", "visualizer", "stock locator", "showroom", "direct", "campaign"]
scope.allowedFormComChannel = ['email','text', 'phone', 'post', 'in-app', 'in-car', 'no consent given']; 
scope.allowedMappedVehiclesCount = ['value should be numeric'];

// *** end allowedValuesForms.js ***
    scope.allowedUserLoginStatus = ['logged in', 'not logged in'];
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
variable.allowedVehicleStatus = ['available for sale', 'sold out','order confirmed', 'pre-order confirmed','contract concluded','vehicle delivered', 'vehicle mapped', 'added item', 'removed item', 'automatically added item', 'automatically removed item'];
variable.allowedVehiclecodeAG = ["value should contain only 4 characters"];
variable.allowedVehiclecodeVG = ["value should contain only 4 characters"];
variable.allowedVehicleSalesModel = ["indirect sales", "direct sales b2b", "direct sales b2c", "direct sales"];

// *** end allowedValuesVehicles.js ***
    // *** start allowedValuesOptions.js ***

// **********************************
// * VALUE CHECKS: PRODUCT - OPTION *
// **********************************

scope.allowedOptionsBusinessDivision = ['new vehicle', 'used vehicle', 'after sales', 'other'];
scope.allowedOptionsPrimaryCategory = ['finance'];
scope.allowedOptionsCategory1 = ['accessories', 'car hood graphics', 'charging', 'colors', 'engine', 'interior trims', 'interior worlds', 'lines / trims', 'options', 'packages', 'roof and mirror caps', 'upholstery', 'wheels', 'winter wheels', 'standard equipment','loan', 'lease','physical goods', 'digital services'];
scope.allowedOptionsFinDownPayment = ['value should be numeric'];
scope.allowedOptionsFinMileage = ['value should be numeric'];
scope.allowedOptionsFinMonthlyPayment = ['value should be numeric'];
scope.allowedOptionsFinTerm = ['value should be numeric'];
scope.allowedOptionsStatus = ['added item', 'removed item', 'automatically added item', 'automatically removed item', 'product available','service already booked', 'service renewable', 'service available', 'service expiring', 'service booked unlimited', 'product sold out'];
scope.allowedOptionscodeVG = ["value should contain only 4 characters"];
// *** end allowedValuesOptions.js ***

    // *** start allowedValuesPages.js ***

// ************************
// * ALLOWED VALUES: PAGE *
// ************************

scope.allowedPageBrand = ["bmw", "mini", "motorrad", "bmw group", "alphera", "rolls-royce", "alphabet"];
scope.allowedPageVariant = ["real page", "virtual page"];
scope.allowedUserLoginStatus = ['logged in', 'not logged in'];
scope.allowedPageGeoRegion = ["country code should be two letters ISO 3166 Alpha-2 country code or 'global'"];
scope.allowedPageLanguage = ["language code should follow ISO standard of 2 letters in lowercase"];
scope.allowedPageSysEnv = ['dev', 'int', 'prod', 'test', 'staging'];

// *** end allowedValuesPages.js ***
    // *** start allowedValuesDealer.js ***

// **************************
// * ALLOWED VALUES: DEALER *
// **************************

scope.allowedDealerSelectionState = ['not selected', 'user selected', 'preselected', 'user selected (piloted)', 'user selected (non-piloted)'];

// *** end allowedValuesDealer.js ***
  },

  events: function (scope) {
    if (!scope.events) {
      scope.events = {};
    }
    var functionPrefix = "form"  
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
    var functionPrefix = "" 
scope.events = Object.assign(scope.events, {
    // *** start configEventsForm.txt ***

// ****************
// * EVENTS: FORM *
// ****************

[(functionPrefix + "FormStarted").replace(/^(.)(.*)$/, (match, firstChar, restOfString) => firstChar.toLowerCase() + restOfString)]: {
        event: {
            eventInfo: Object.assign({}, JSON.parse(JSON.stringify(scope.baseEvent.eventInfo)), {
                eventName: "form",
                effect: "form started",
                eventAction: "first page load",
                cause: "automatic"
            })
        },
        mandatoryData: (['componentType' ,'formLeadType', 'formOrigin', 'formType', 'formVariant']).concat(scope.baseMandatoryData.filter(v => !['componentType' ,'formLeadType', 'formOrigin', 'formType', 'formVariant'].includes(v))),
        optionalData: (['formID', 'formName', 'iframeURL', 'requestedURL', 'userProfileID', 'userLoginStatus', 'eventPoints']).concat(scope.productMandatoryData, scope.productOptionalData, (scope.baseOptionalData.filter(v => !['componentType' ,'formLeadType', 'formOrigin', 'formType', 'formVariant','formID', 'formName', 'iframeURL', 'requestedURL', 'userProfileID', 'userLoginStatus', 'eventPoints'].includes(v)))),
        description: `Form started should be triggered once on first page load on the page where the user enters the form funnel for the specific type. A form is considered started once it is visible to the customer. In multi-step forms it's irrelevant one which step the users starts the journey - eg. on step 1 model selection, or step 2 personal information if the user is coming from eg. con with pre-selected model. A page or page element is considered part of a form if the customer selects or inputs information that is later sent to the backend system, e.g. personal data, series/model information, etc. Local forms in iframes trigger the form start when the iframe content is loaded.
        <br><ul>
        <li>For parameters with value check (bold and blue) please go with the mouse over the value or refer to the <b>allowed values tab</b> on top to see acceptable values.</li>
        <li>For parameters without value check, please refer to the <b>values without check tab</b> on top to see samples.</li>
        </ul>`
    },

    [(functionPrefix + "FormFirstInteraction").replace(/^(.)(.*)$/, (match, firstChar, restOfString) => firstChar.toLowerCase() + restOfString)]: {
        event: {
            eventInfo: Object.assign({}, JSON.parse(JSON.stringify(scope.baseEvent.eventInfo)), {
                eventName: "form",
                effect: "form first interaction",
            })
        },
        mandatoryData: (['componentType' ,'formLeadType', 'formOrigin', 'formType', 'formVariant']).concat(scope.baseMandatoryData.filter(v => !['componentType' ,'formLeadType', 'formOrigin', 'formType', 'formVariant',].includes(v))),
        optionalData: (['formID', 'formName','iframeURL', 'requestedURL', 'userProfileID', 'userLoginStatus','eventAction', 'eventPoints' ]).concat(scope.productMandatoryData, scope.productOptionalData, (scope.baseOptionalData.filter(v => !['componentType' ,'formLeadType', 'formOrigin', 'formType', 'formVariant','formID', 'formName','iframeURL', 'requestedURL', 'userProfileID', 'userLoginStatus','eventAction', 'eventPoints' ].includes(v)))),
        description: `First form interaction should be triggered once of the first interaction with the form. As interaction counts e.g. a model selection from the drop-down, a filling of a free text field, a radio button selection etc. Page load or impression are NOT considered first interaction. The click on the form start intention CTA button before the form, is also NOT considered as first interaction. Furthermore any prefilled content is not considered an interaction. We only consider interaction if the user actively does anything with form. Especially for forms embedded on the showroom, it's recommended to trigger the first interaction.
        <br><ul>
        <li>For parameters with value check (bold and blue) please go with the mouse over the value or refer to the <b>allowed values tab</b> on top to see acceptable values.</li>
        <li>For parameters without value check, please refer to the <b>values without check tab</b> on top to see samples.</li>
        </ul>`
    },

    [(functionPrefix + "FormInteraction").replace(/^(.)(.*)$/, (match, firstChar, restOfString) => firstChar.toLowerCase() + restOfString)]: {
        event: {
            eventInfo: Object.assign({}, JSON.parse(JSON.stringify(scope.baseEvent.eventInfo)), {
                eventName: "form",
                effect: "form interaction", // or overwritten by "eventEffect"
            })
        },
        mandatoryData: (['componentType' ,'formLeadType', 'formOrigin', 'formType', 'formVariant','eventEffect',]).concat(scope.baseMandatoryData.filter(v => !['componentType' ,'formLeadType', 'formOrigin', 'formType', 'formVariant','eventEffect',].includes(v))),
        optionalData: (['formComChannel', 'formID', 'formName','iframeURL', 'requestedURL', 'userProfileID', 'userLoginStatus','eventAction', 'eventPoints', 'eventCause']).concat(scope.productMandatoryData, scope.productOptionalData, (scope.baseOptionalData.filter(v => !['formComChannel', 'formID', 'formName','iframeURL', 'requestedURL', 'userProfileID', 'userLoginStatus','eventAction', 'eventPoints', 'eventCause','componentType' ,'formLeadType', 'formOrigin', 'formType', 'formVariant','eventEffect'].includes(v)))),

        description: `Form interaction may be triggered for any interaction inside the for funnel eg. user clicked login button.
        <br> If the form finish is happening on an external site - eg. a dealer website - and hence may not be tracked, the last click inside the tracked form funnel should be tracked with this function and the URL of the landing page of the button should be provided the parameter "requestedURL". Furthermore in such cases you must use the form name "routing to external form (finish not trackable')". 
        <br><ul>
        <li>For parameters with value check (bold and blue) please go with the mouse over the value or refer to the <b>allowed values tab</b> on top to see acceptable values.</li>
        <li>For parameters without value check, please refer to the <b>values without check tab</b> on top to see samples.</li>
        </ul>`
    },

    [(functionPrefix + "FormStep").replace(/^(.)(.*)$/, (match, firstChar, restOfString) => firstChar.toLowerCase() + restOfString)]: {
        event: {
            eventInfo: Object.assign({}, JSON.parse(JSON.stringify(scope.baseEvent.eventInfo)), {
                eventName: "form",
                effect: "form step"
            })
        },
        mandatoryData: (['componentType' ,'formLeadType', 'formOrigin', 'formType', 'formVariant',]).concat(scope.baseMandatoryData.filter(v => !['componentType' ,'formLeadType', 'formOrigin', 'formType', 'formVariant',].includes(v))),
        optionalData: (['eventPoints','formComChannel', 'formID', 'formName','iframeURL', 'requestedURL', 'userProfileID', 'userLoginStatus','userSegment','userType', 'step', 'stepAmounts', 'stepName','formStep', 'formStepAmounts', 'formStepName']).concat(scope.productMandatoryData, scope.productOptionalData, (scope.baseOptionalData.filter(v => !['componentType' ,'formLeadType', 'formOrigin', 'formType', 'formVariant','eventPoints','formComChannel', 'formID', 'formName','iframeURL', 'requestedURL', 'userProfileID', 'userLoginStatus','userSegment','userType', 'step', 'stepAmounts', 'stepName','formStep', 'formStepAmounts', 'formStepName'].includes(v)))),
        description: `Form step should be triggered every time the user lands on a form step. Make sure to provide the current step number as well as the total amounts of step - not counting the thank you page as step. Everytime the user jumps back or forth the form step may be triggered to understand how the user moves through the form funnel.
        <br> <b>According to 2023 guidelines review 3 parameters were renamed. For now both - old and new values work -  hence classified as minor not major change, but going forward new parameter names should be used:
        <br> old parameter names: formStep, formStepName, formStepAmounts
        <br> new parameter names: step, stepName, stepAmounts
        <br><ul>
        <li>For parameters with value check (bold and blue) please go with the mouse over the value or refer to the <b>allowed values tab</b> on top to see acceptable values.</li>
        <li>For parameters without value check, please refer to the <b>values without check tab</b> on top to see samples.</li>
        </ul>`
    },

    [(functionPrefix + "FormFinishIntention").replace(/^(.)(.*)$/, (match, firstChar, restOfString) => firstChar.toLowerCase() + restOfString)]: {
        event: {
            eventInfo: Object.assign({}, JSON.parse(JSON.stringify(scope.baseEvent.eventInfo)), {
                eventName: "form",
                effect: "form finish intention",
            })
        },
        mandatoryData: (['componentType' ,'formLeadType', 'formOrigin', 'formType', 'formVariant']).concat(scope.baseMandatoryData.filter(v => !['componentType' ,'formLeadType', 'formOrigin', 'formType', 'formVariant',].includes(v))),
        optionalData: (['eventPoints','formComChannel', 'formID', 'formName','iframeURL', 'requestedURL', 'userProfileID', 'userLoginStatus']).concat(scope.productMandatoryData, scope.productOptionalData, (scope.baseOptionalData.filter(v => !['componentType' ,'formLeadType', 'formOrigin', 'formType', 'formVariant','eventPoints','formComChannel', 'formID', 'formName','iframeURL', 'requestedURL', 'userProfileID', 'userLoginStatus'].includes(v)))),
        description: `Form finish intention may be triggered upon CTA button "submit" the form. Independent if the submission is successful or not.
        <br><ul>
        <li>For parameters with value check (bold and blue) please go with the mouse over the value or refer to the <b>allowed values tab</b> on top to see acceptable values.</li>
        <li>For parameters without value check, please refer to the <b>values without check tab</b> on top to see samples.</li>
        </ul>`
    },
    [(functionPrefix + "FormFinished").replace(/^(.)(.*)$/, (match, firstChar, restOfString) => firstChar.toLowerCase() + restOfString)]: {
        event: {
            eventInfo: Object.assign({}, JSON.parse(JSON.stringify(scope.baseEvent.eventInfo)), {
                eventName: "form",
                effect: "form finished",
                eventAction: "page load",
                cause: "automatic"
            })
        },
        mandatoryData: (['componentType' ,'formLeadType', 'formOrigin', 'formType', 'formVariant']).concat(scope.baseMandatoryData.filter(v => !['componentType' ,'formLeadType', 'formOrigin', 'formType', 'formVariant'].includes(v))),
        optionalData: (['formComChannel', 'formID', 'formName','iframeURL', 'requestedURL', 'userProfileID', 'userLoginStatus', 'eventPoints' ]).concat(scope.productMandatoryData, scope.productOptionalData, (scope.baseOptionalData.filter(v => !['componentType' ,'formLeadType', 'formOrigin', 'formType', 'formVariant','formComChannel', 'formID', 'formName','iframeURL', 'requestedURL', 'userProfileID', 'userLoginStatus', 'eventPoints'].includes(v)))),
        description: `Form finished should be triggered once on the page load on the thank you page after a successful response was received from the CRM system. A form is considered finished once it has been sent to the backend system successfully. In case there is no feedback from the backend system form finish triggers on successful form submit without error message. Local forms in iframes usually trigger form finish when showing a â€œthank youâ€ message to the visitor.
        <br><ul>
        <li>For parameters with value check (bold and blue) please go with the mouse over the value or refer to the <b>allowed values tab</b> on top to see acceptable values.</li>
        <li>For parameters without value check, please refer to the <b>values without check tab</b> on top to see samples.</li>
        </ul>`
    },
    

// *** end configEventsForm.txt ***
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
        price: {
          attributes: {}
        },
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
        price: {
          attributes: {}
        },
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
      optionalData: scope.errorMandatoryData.concat(['componentVersion', 'eventPoints','options[n].productID','vehicle[n].productID','dealer[n].outletBuno']),
      description: `Trigger this event whenever the user clicks on a navigation item that does not navigate the user to a new page and hence triggers a server call.
      <br> This is used for pure non-contextual (without vehicle, dealer, form etc context) click tracking.
      <br> If on the page product data is already set, you can link your event to it by providing the respective productID.
      <br> If on the page dealer information is already pushed to ACDL, you can link your event to the selected dealer by providing the respective buno.
      <br>Please consult the <a href="https://atc.bmwgroup.net/confluence/x/TvwHrQ" target="_blank">Adobe Analytics 2023 - Activity Map confluence page</a> for further details.`
    },
  });

  scope._validErrorTypes = ['backend 1st party', 'backend 3rd party', 'frontend component', 'user'];
  scope._validErrorActions = scope._validEventActions = ['call', 'checkbox', 'component load', 'content closed', 'content opened', 'content visible', 'download', 'drop-down menu', 'first page load', 'first component interaction','form fill', 'internal click', 'outbound click', 'page load', 'radio button', 'rotate', 'item added', 'item removed', 'share', 'slide left', 'slide right', 'sort', 'suggested term', 'media played', 'media paused', 'media milestone reached', 'media stopped', 'email', 'swipe', 'form start intention', 'chat', 'print', 'swipe left', 'swipe right'];
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
            this[x[i]] = this[x[i]].map(item => item.toLowerCase())
        }

        this._createPublicMethods();

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
                    if ((typeof keySearch == 'string' && searchArray.length == 1) || ((typeof keySearch == 'string' && searchArray.length > 1 && searchArray[0].includes(keySearch)))) {
                        if (['optionscode'].indexOf(keySearch) < 0 && Array.isArray(this[Object.keys(this)[valueChecks.indexOf(searchArray[0])]])) {
                            var options = this[Object.keys(this)[valueChecks.indexOf(searchArray[0])]];
                            options = options.filter(function (e) {
                                return e !== ''
                            })

                            var dispOptions = "Possible Options: " + options.join(', ').toString();
                            parameters[i][j] = '<span style="color: #1000ff;font-weight: bold;" title="' + dispOptions + '">' + parameters[i][j] + '</span>';

                            if (keySearch == 'eventEffect') {
                                if (this.version.indexOf('Trade-in') < 0) {
                                    if (event.indexOf('ViewActions') < 0) {
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

    //for the parameters passed to the function, check if only the required parameters are sent 
    _checkParamsPassed(eventName, paramsPassed) {
        var notAvailable = false;
        paramsPassed = this.flattenObject(paramsPassed);
        paramsPassed = Object.keys(paramsPassed);
        paramsPassed = paramsPassed.map(function (item) {
            var regex = /(.)(\d+)(.)/;
            return item.replace(regex, '[n].');
        });

        var acceptedList = [];
        for (var i in this.events) {
            acceptedList.push.apply(acceptedList, this.events[i].mandatoryData);
            acceptedList.push.apply(acceptedList, this.events[i].optionalData);
        }

        acceptedList = acceptedList.filter((v, i, a) => a.indexOf(v) === i);
        for (var i in paramsPassed) {
            if (acceptedList.indexOf(paramsPassed[i]) < 0) {
                notAvailable = true;
                this._throwError('o', paramsPassed[i], 'not-defined', '');
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
                    value = value.toUpperCase();
                } else if (['pageSubCat1', 'category1'].indexOf(key) > -1) {
                    //value = value; //ignore case
                } else if (typeof value === 'string') {
                    value = value.toLowerCase();
                } else {
                    value = this.transformData(value);
                }
                transformedObj[key] = value;
            }
        }
        return transformedObj;
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

        this._checkParamsPassed(eventName, paramsPassed);
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
// defining prefix
if (mandatoryData['formOrigin'] == "adobe form") {
  this.message.component[0].category.primaryCategory = "nsc website";
  prefix = "nsc > "
} else if (mandatoryData['formOrigin'] == "local form") {
  this.message.component[0].category.primaryCategory = "locally developed";
  prefix = "local > "
} else {
  prefix = "not available > "
}

// DATALAYER HELPER: component 
// *** start eventHandlerComponents.js ***

// ***************************
// * VALUE CHECKS: COMPONENT *
// ***************************

if (typeof this.allowedComponentTypes != 'undefined'){
    this._validateProperty('componentType', this.allowedComponentTypes, eventName, mandatoryData);
}
if (typeof this.allowedComponentNames != 'undefined'){
    this._validateProperty('componentName', this.allowedComponentNames, eventName, mandatoryData);
}
if (typeof this.allowedComponentSubCat1 != 'undefined'){
    this._validateProperty('componentSubCat1', this.allowedComponentSubCat1, eventName, mandatoryData);
}
if (typeof this.allowedComponentPlatform != 'undefined'){
    this._validateProperty('componentPlatform', this.allowedComponentPlatform, eventName, mandatoryData);
}

// *******************************
// * VARIABLE MAPPING: COMPONENT *
// *******************************

// DATALAYER HELPER: component 
if (typeof mandatoryData['componentType'] != 'undefined') {
    this.message.component[0].category.componentType = mandatoryData['componentType'];
} else {
    this.message.component[0].category.componentType = (((this.component || '').category || '').componentType || '');
}

if (typeof mandatoryData['componentSubCat1'] != 'undefined') {
    this.message.component[0].category.subCategory1 = mandatoryData['componentSubCat1'];
} else {
    this.message.component[0].category.subCategory1 = (((this.component || '').category || '').subCategory1 || '');
}

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
    this.message.component[0].attributes.componentDEVagency = mandatoryData['componentDEVagency'];
}
if (typeof mandatoryData['componentPlatform'] != 'undefined') {
    this.message.component[0].attributes.platform = mandatoryData['componentPlatform'];
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
    var domains = ['.bmw.', '.mini.', '.bmw-motorrad.', '.bmwusa.com', 'customer.bmwgroup.com'];
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
            domainName === "bmwusa" || (domainName === "bmwgroup" && subdomain === "customer")) {
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
if(typeof TRON.dataComponent != "undefined"){
    TRON.dataComponent = Object.assign(TRON.dataComponent, this.message.component);
}

// *** end eventHandlerComponents.js ***
if (typeof mandatoryData['formOrigin'] != 'undefined') {
  this.message.component[0].componentInfo.componentName = mandatoryData['formOrigin'] || ((((this.component || "").componentInfo || "").componentName || ""));
}else{
  this.message.component[0].componentInfo.componentName = ((((this.component || "").componentInfo || "").componentName || ""));
}

// 'userLoginStatus'
// validate user login status
if (mandatoryData && mandatoryData['userLoginStatus'] && (typeof mandatoryData['userLoginStatus'] != 'undefined')) {
  let userLoginStatus = mandatoryData["userLoginStatus"];
  if (!this.allowedUserLoginStatus.includes(userLoginStatus)) {
    this._throwError('m', 'UserLoginStatus', 'incorrect', this.allowedUserLoginStatus);
    return;
  }
  mandatoryData["userLoginStatus"] = userLoginStatus;
}
if (typeof mandatoryData['userLoginStatus'] != 'undefined') {
  this.message.user[0].profile[0].attributes.loggedInStatus = mandatoryData['userLoginStatus'];
}

// 'userProfileID'
if (typeof mandatoryData['userProfileID'] != 'undefined') {
  this.message.user[0].profile[0].profileInfo.profileID = mandatoryData['userProfileID'];
}

// 'userSegment'
if (typeof mandatoryData['userSegment'] != 'undefined') {
  this.message.user[0].segment = mandatoryData['userSegment'];
}

// 'userType'
if (typeof mandatoryData['userType'] != 'undefined') {
  this.message.user[0].profile[0].profileInfo.type = mandatoryData['userType'];
}
// *** start eventHandlerForms.js ***

// **********************
// * VALUE CHECKS: FORM *
// **********************

if (typeof mandatoryData != 'undefined') {

    // validate form type
    this._validateProperty('formType', this.allowedFormTypes, eventName, mandatoryData, true);

    // validate form origin
    this._validateProperty('formOrigin', this.allowedFormOrigins, eventName, mandatoryData, true);

    // validate form variants
    this._validateProperty('formVariant', this.allowedFormVariants, eventName, mandatoryData, true);

    //formComChannel and formLeadType
    if (typeof mandatoryData != 'undefined' && typeof mandatoryData['formComChannel'] != 'undefined' && typeof mandatoryData['formComChannel'] == 'string') {
        //value is a comma seperated value and needs to check if these are part of possible values
        var returnValueFormChannel = mandatoryData['formComChannel'].split(',');
        var returnFlagFormChannel = true;
        for (var i in returnValueFormChannel) {
            if (this.allowedFormComChannel.indexOf(returnValueFormChannel[i].trim()) < 0) {
                returnFlagFormChannel = false;
            }
        }
        if (returnFlagFormChannel == false) {
            //Determin if it is mandatory or optional to determine the type of error to be dispalyed
            if (this.events[eventName].mandatoryData.indexOf('formComChannel') > -1) {
                this._throwError('m', 'formComChannel', 'incorrect', this.allowedFormComChannel, '(or a comma separated combination of any of those values)');
                return;
            } else {
                this._throwError('o', 'formComChannel', 'incorrect-o', this.allowedFormComChannel, '(or a comma separated combination of any of those values)');
                mandatoryData['formComChannel'] = '';
            }
        }
    }else{
        if(typeof mandatoryData['formComChannel'] != 'undefined'){
            if (this.events[eventName].mandatoryData.indexOf('formComChannel') > -1) {
                this._throwError('m', 'formComChannel', 'incorrect', this.allowedFormComChannel, '(or a comma separated combination of any of those values)');
                return;
            } else {
                this._throwError('o', 'formComChannel', 'incorrect-o', this.allowedFormComChannel, '(or a comma separated combination of any of those values)');
                mandatoryData['formComChannel'] = '';
            }
        }
    }




    //Special case for formLeadType
    if (typeof mandatoryData != 'undefined' && typeof mandatoryData['formLeadType'] != 'undefined' && typeof mandatoryData['formLeadType'] == 'string') {
        //value is a hypen seperated value and needs to check if these are part of possible values
        var returnValueFormLeadType = mandatoryData['formLeadType'].split('-');
        var returnFlagFormLeadType = true;
        for (var i in returnValueFormLeadType) {
            if (this.allowedFormLeadTypes.indexOf(returnValueFormLeadType[i].trim()) < 0) {
                returnFlagFormLeadType = false;
            }
        }
        if (returnFlagFormLeadType == false) {
            if (this.events[eventName].mandatoryData.indexOf('formLeadType') > -1) {
                this._throwError('m', 'formLeadType', 'incorrect', this.allowedFormLeadTypes, "(for lead type  = 'lead', 'handraiser' or 'generic'.  Or  provide a  combination of lead type with lead origin separated by '-' eg. 'lead - configurator'. Following values are allowed)");
                return;
            } else {
                this._throwError('o', 'formLeadType', 'incorrect-o', this.allowedFormLeadTypes, "(for lead type  = 'lead', 'handraiser' or 'generic'.  Or  provide a  combination of lead type with lead origin separated by '-' eg. 'lead - configurator'. Following values are allowed)");
                mandatoryData['formLeadType'] = '';
            }
        }
    } else {
        if(typeof mandatoryData['formLeadType'] != 'undefined'){
            if (this.events[eventName].mandatoryData.indexOf('formLeadType') > -1) {
                this._throwError('m', 'formLeadType', 'incorrect', this.allowedFormLeadTypes, "(for lead type  = 'lead', 'handraiser' or 'generic'.  Or  provide a  combination of lead type with lead origin separated by '-' eg. 'lead - configurator'. Following values are allowed)");
                return;
            } else {
                this._throwError('o', 'formLeadType', 'incorrect-o', this.allowedFormLeadTypes, "(for lead type  = 'lead', 'handraiser' or 'generic'.  Or  provide a  combination of lead type with lead origin separated by '-' eg. 'lead - configurator'. Following values are allowed)");
                mandatoryData['formLeadType'] = '';
            }
        }
    }

    // **************************
    // * VARIABLE MAPPING: FORM *
    // **************************
    // WORKAROUND for forms library to accept old parameters until they are updated

    // DATALAYER HELPER: event form
    if (this.message.event[0].eventInfo.eventName == 'form') {

        if (typeof mandatoryData != 'undefined' && typeof mandatoryData['eventEffect'] != 'undefined') {
            this.message.event[0].eventInfo.effect = mandatoryData['eventEffect'];
        }

        if (eventName == 'formStep' || eventName == 'tradeInStep') {
            if (typeof mandatoryData['step'] != "undefined") {
                this.message.event[0].eventInfo.effect = "form step " + (mandatoryData['step'] || mandatoryData['step'] || '');
            }
        } else {
            this.message.event[0].eventInfo.effect = this.message.event[0].eventInfo.effect;
        }

        if (typeof mandatoryData['formType'] != 'undefined') {
            this.message.event[0].eventInfo.type = mandatoryData["formType"];
        }
        if (typeof mandatoryData['formOrigin'] != 'undefined') {
            this.message.event[0].category.primaryCategory = mandatoryData['formOrigin'];
        }
        if (typeof mandatoryData['formName'] != 'undefined') {
            this.message.event[0].category.subCategory1 = mandatoryData['formName'];
        }
        if (typeof mandatoryData['formLeadType'] != 'undefined') {
            this.message.event[0].category.subCategory2 = mandatoryData['formLeadType'];
        }
        if (typeof mandatoryData['formComChannel'] != 'undefined') {
            this.message.event[0].attributes.form.preferredComChannel = mandatoryData['formComChannel'];
        }
        if (typeof mandatoryData['formID'] != 'undefined') {
            this.message.event[0].attributes.form.rfxID = (mandatoryData['formID'] || "");
            this.message.event[0].attributes.form.rfxID = this.message.event[0].attributes.form.rfxID.toUpperCase();
        }

        this.message.event[0].attributes.stepAmounts = ((mandatoryData['step'] && mandatoryData['stepAmounts'] && typeof mandatoryData['step'] != 'undefined' && typeof mandatoryData['stepAmounts'] != 'undefined') ? ('step ' + mandatoryData['step'] + '/' + mandatoryData['stepAmounts']) : '');

        if (typeof mandatoryData['formVariant'] != 'undefined') {
            this.message.event[0].attributes.form.formVariant = mandatoryData['formVariant'];
        }

        this.message.event[0].attributes.stepName = (typeof this.message.event[0].attributes.stepName != 'undefined') ? this.message.event[0].attributes.stepName : ((typeof mandatoryData['stepName'] != 'undefined') ? mandatoryData['stepName'] : '');
    }
}

if (typeof mandatoryData != "undefined" && typeof mandatoryData['formType'] != "undefined" && this.message.event[0].eventInfo.eventName == "error") {
    this.message.event[0].attributes.form.formType = mandatoryData['formType'];
}


//Check with client for push to data
if (typeof mandatoryData != "undefined" && typeof mandatoryData['formName'] != "undefined" && this.message.event[0].eventInfo.eventName == "error") {
    this.message.event[0].attributes.form.formName = mandatoryData['formName'];
}

// *** end eventHandlerForms.js ***
// *** start eventHanderVehicles.js ***

// *********************************
// * VALUE CHECKS: PRODUCT VEHICLE *
// *********************************

var variable = (typeof this != 'undefined') && this;

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
            this._throwError('m','vehicle[n].range','missing','');
            return;
        }
    }
} else if (this.events[eventName].mandatoryData.indexOf('vehicle[n].range') > -1 && typeof mandatoryData['vehicle'] == "undefined") {
    this._throwError('m','vehicle[n].range','missing','');
    return;
}

var productIDGenerate = 0;

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
        "salesModel":{
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
                        variable._throwError('m',expectedKey,'empty',possibleValues);
                    }else{
                        errArrayVal.push(expectedKey);
                        variable._throwError('m',expectedKey,'incorrect',possibleValues);
                    }
                }
                // check if all required data is provided
                if (typeof value == "undefined") {
                    variable._throwError('m',expectedKey,'missing');
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

                                variable._throwError('o',expectedKey,'incorrect-o',possibleValues);
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
        productElement.productInfo.productID = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.vehicle && PROJECT_SPECIFIC_DATA.vehicle.productID && PROJECT_SPECIFIC_DATA.vehicle.productID != "") ? PROJECT_SPECIFIC_DATA.vehicle.productID : ((typeof vehicle['productID'] != 'undefined' ? vehicle['productID'] : '') || (typeof vehicle['codeVG'] != 'undefined' ? vehicle['codeVG'] : '') || (typeof vehicle['codeAG'] != 'undefined' ? vehicle['codeAG'] : '') || (typeof vehicle['range'] != 'undefined' ? vehicle['range'] : '') || ("product" + (productIDGenerate + 1))); // map to product s.products

        if (typeof productElement.productInfo.productID == 'string' && productElement.productInfo.productID.indexOf('product') > -1) {
            productIDGenerate = productIDGenerate + 1;
        }

        productElement.productInfo.productName = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.vehicle && PROJECT_SPECIFIC_DATA.vehicle.productName && PROJECT_SPECIFIC_DATA.vehicle.productName != "") ? PROJECT_SPECIFIC_DATA.vehicle.productName : (typeof vehicle['name'] != 'undefined' ? vehicle['name'] : ''); // map to v52 inside s.products

        productElement.category.productType = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.vehicle && PROJECT_SPECIFIC_DATA.vehicle.productType && PROJECT_SPECIFIC_DATA.vehicle.productType != "") ? PROJECT_SPECIFIC_DATA.vehicle.productType : (typeof vehicle['businessDivision'] != 'undefined' ? vehicle['businessDivision'] : ''); // product type, map to category inside s.products

        productElement.category.primaryCategory = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.vehicle && PROJECT_SPECIFIC_DATA.vehicle.primaryCategory && PROJECT_SPECIFIC_DATA.vehicle.primaryCategory != "") ? PROJECT_SPECIFIC_DATA.vehicle.primaryCategory : (vehicle['primaryCategory'] ? vehicle['primaryCategory'] : ''); // map to v53 inside s.products

        productElement.category.subCategory1 = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.vehicle && PROJECT_SPECIFIC_DATA.vehicle.subCategory1 && PROJECT_SPECIFIC_DATA.vehicle.subCategory1 != "") ? PROJECT_SPECIFIC_DATA.vehicle.subCategory1 : (typeof vehicle['category1'] != 'undefined' ? vehicle['category1'] : ''); // map to v54 (sub category 1) inside s.products

        productElement.category.subCategory2 = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.vehicle && PROJECT_SPECIFIC_DATA.vehicle.subCategory2 && PROJECT_SPECIFIC_DATA.vehicle.subCategory2 != "") ? PROJECT_SPECIFIC_DATA.vehicle.subCategory2 : (typeof vehicle['category2'] != 'undefined' ? vehicle['category2'] : ''); // map to v55 (sub category 2) inside s.products

        productElement.productInfo.manufacturer = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.vehicle && PROJECT_SPECIFIC_DATA.vehicle.manufacturer && PROJECT_SPECIFIC_DATA.vehicle.manufacturer != "") ? PROJECT_SPECIFIC_DATA.vehicle.manufacturer : (typeof vehicle['manufacturer'] != 'undefined' ? vehicle['manufacturer'] : ''); // map to v60 inside s.products

        productElement.attributes.bodyType = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.vehicle && PROJECT_SPECIFIC_DATA.vehicle.bodyType && PROJECT_SPECIFIC_DATA.vehicle.bodyType != "") ? PROJECT_SPECIFIC_DATA.vehicle.bodyType : (typeof vehicle['bodyType'] != 'undefined' ? vehicle['bodyType'] : ''); // map to v51 inside s.products

        productElement.attributes.modelCodeAG = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.vehicle && PROJECT_SPECIFIC_DATA.vehicle.modelCodeAG && PROJECT_SPECIFIC_DATA.vehicle.modelCodeAG != "") ? PROJECT_SPECIFIC_DATA.vehicle.modelCodeAG : (typeof vehicle['codeAG'] != 'undefined' ? vehicle['codeAG'] : ''); // map to v69 inside s.products
        productElement.attributes.modelCodeAG = (((productElement || "").attributes || "").modelCodeAG || "").toUpperCase();

        productElement.attributes.modelCode = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.vehicle && PROJECT_SPECIFIC_DATA.vehicle.modelCode && PROJECT_SPECIFIC_DATA.vehicle.modelCode != "") ? PROJECT_SPECIFIC_DATA.vehicle.modelCode : (typeof vehicle['codeVG'] != 'undefined' ? vehicle['codeVG'] : ''); // map to v48 inside s.
        productElement.attributes.modelCode = (((productElement || "").attributes || "").modelCode || "").toUpperCase();

        productElement.productInfo.color = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.vehicle && PROJECT_SPECIFIC_DATA.vehicle.color && PROJECT_SPECIFIC_DATA.vehicle.color != "") ? PROJECT_SPECIFIC_DATA.vehicle.color : (typeof vehicle['color'] != 'undefined' ? vehicle['color'] : ''); // map to v47 inside s.products

        productElement.attributes.motorization = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.vehicle && PROJECT_SPECIFIC_DATA.vehicle.motorization && PROJECT_SPECIFIC_DATA.vehicle.motorization != "") ? PROJECT_SPECIFIC_DATA.vehicle.motorization : (typeof vehicle['engine'] != 'undefined' ? vehicle['engine'] : ''); // map to v58 inside s.products

        productElement.attributes.fuelType = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.vehicle && PROJECT_SPECIFIC_DATA.vehicle.fuelType && PROJECT_SPECIFIC_DATA.vehicle.fuelType != "") ? PROJECT_SPECIFIC_DATA.vehicle.fuelType : (typeof vehicle['fuelType'] ? vehicle['fuelType'] : ''); // map to v56 inside s.products

        productElement.attributes.gearing = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.vehicle && PROJECT_SPECIFIC_DATA.vehicle.gearing && PROJECT_SPECIFIC_DATA.vehicle.gearing != "") ? PROJECT_SPECIFIC_DATA.vehicle.gearing : (typeof vehicle['gearing'] != 'undefined' ? vehicle['gearing'] : ''); // map to v49 inside s.products

        productElement.attributes.hybridVersion = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.vehicle && PROJECT_SPECIFIC_DATA.vehicle.hybridVersion && PROJECT_SPECIFIC_DATA.vehicle.hybridVersion != "") ? PROJECT_SPECIFIC_DATA.vehicle.hybridVersion : (typeof vehicle['hybridVersion'] != 'undefined' ? vehicle['hybridVersion'] : ''); // map to v547 inside s.products

        productElement.attributes.mmdr = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.vehicle && PROJECT_SPECIFIC_DATA.vehicle.mmdr && PROJECT_SPECIFIC_DATA.vehicle.mmdr != "") ? PROJECT_SPECIFIC_DATA.vehicle.mmdr : ((typeof vehicle['rangeVG'] != 'undefined' ? vehicle['rangeVG'] : '') || (typeof vehicle['range'] != 'undefined' ? vehicle['range'] : '')); // map to v10 inside s.products
        productElement.attributes.mmdr = ((((productElement || "").attributes || "").mmdr || "").toString()).toUpperCase();

        productElement.attributes.series = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.vehicle && PROJECT_SPECIFIC_DATA.vehicle.series && PROJECT_SPECIFIC_DATA.vehicle.series != "") ? PROJECT_SPECIFIC_DATA.vehicle.series : (typeof vehicle['series'] != 'undefined' ? vehicle['series'] : ''); // map to v50 inside s.products

        productElement.attributes.modelName = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.vehicle && PROJECT_SPECIFIC_DATA.vehicle.modelName && PROJECT_SPECIFIC_DATA.vehicle.modelName != "") ? PROJECT_SPECIFIC_DATA.vehicle.modelName : (typeof vehicle['subSeries'] != 'undefined' ? vehicle['subSeries'] : ''); // map to v65 inside s.products

        productElement.attributes.status = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.vehicle && PROJECT_SPECIFIC_DATA.vehicle.status && PROJECT_SPECIFIC_DATA.vehicle.status != "") ? PROJECT_SPECIFIC_DATA.vehicle.status : (typeof vehicle['status'] != 'undefined' ? vehicle['status'] : ''); // map to v46 inside s.products

        //productElement.attributes.trim = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.vehicle && PROJECT_SPECIFIC_DATA.vehicle.trim && PROJECT_SPECIFIC_DATA.vehicle.trim != "") ? PROJECT_SPECIFIC_DATA.vehicle.trim : (typeof vehicle['trim'] != 'undefined' ? vehicle['trim'] : ''); // map to v66 inside s.products

        productElement.attributes.productionYear = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.vehicle && PROJECT_SPECIFIC_DATA.vehicle.productionYear && PROJECT_SPECIFIC_DATA.vehicle.productionYear != "") ? PROJECT_SPECIFIC_DATA.vehicle.productionYear : (typeof vehicle['yearOfProduction'] != 'undefined' ? vehicle['yearOfProduction'] : ''); // map to v44 inside s.products

        productElement.attributes.yearOfRegistration = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.vehicle && PROJECT_SPECIFIC_DATA.vehicle.yearOfRegistration && PROJECT_SPECIFIC_DATA.vehicle.yearOfRegistration != "") ? PROJECT_SPECIFIC_DATA.vehicle.yearOfRegistration : (typeof vehicle['yearOfRegistration'] != 'undefined' ? vehicle['yearOfRegistration'] : ''); // map to v45 inside s.products

        productElement.attributes.encVIN = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.vehicle && PROJECT_SPECIFIC_DATA.vehicle.encVIN && PROJECT_SPECIFIC_DATA.vehicle.encVIN != "") ? PROJECT_SPECIFIC_DATA.vehicle.encVIN : (typeof vehicle['encVIN'] != 'undefined' ? vehicle['encVIN'] : ''); // map inside s.products


        productElement.attributes.salesModel = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.vehicle && PROJECT_SPECIFIC_DATA.vehicle.salesModel && PROJECT_SPECIFIC_DATA.vehicle.salesModel != "") ? PROJECT_SPECIFIC_DATA.vehicle.salesModel : (typeof vehicle['salesModel'] != 'undefined' ? vehicle['salesModel'] : ''); // map inside s.products

        productElement = JSON.parse(JSON.stringify(productElement, (k, v) => (v == "" ? undefined : v)));
        this.message.product.push(productElement);
    });
}
// *** end eventHanderVehicles.js ***
// *** start eventHandlerOptions.js ***

if (typeof variable == "undefined") {
  variable = this;
}

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
var vehicleCodeVG;
if (mandatoryData && mandatoryData['vehicle']) {
  for (var i in mandatoryData['vehicle']) {
    if (mandatoryData['vehicle'][i]['codeVG'] && typeof mandatoryData['vehicle'][i]['codeVG'] != "undefined")
      vehicleCodeVG = mandatoryData['vehicle'][i]['codeVG'];
  }
}

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

      if (typeof mandatoryData['options'][i]['codeVG'] == "undefined") {
        mandatoryData['options'][i]['codeVG'] = vehicleCodeVG;
      }

      //CodeVG
      if (typeof mandatoryData['options'][i]['codeVG'] != "undefined") {
        if ((variable.allowedOptionscodeVG[0] == "value should contain only 4 characters" && (((mandatoryData['options'][i]['codeVG'] || "").length < 4 || (mandatoryData['options'][i]['codeVG'] || "").length > 4 )))) {
          if (variable.events[eventName].mandatoryData.indexOf('codeVG') > -1) {
            variable._throwError('m', 'options[n].codeVG', 'incorrect', variable.allowedOptionscodeVG);
            return;
          } else {
            variable._throwError('o', 'options[n].codeVG', 'incorrect', variable.allowedOptionscodeVG);
            mandatoryData['options'][i]['codeVG'] = '';
          }
        }
      }

      //businessDivision
      if (typeof mandatoryData['options'][i]['businessDivision'] != 'undefined' && mandatoryData['options'][i]['businessDivision'] && !variable.allowedVehicleBusinessDivision.includes(mandatoryData['options'][i]['businessDivision'])) {
        if (variable.events[eventName].mandatoryData.indexOf('businessDivision') > -1) {
          variable._throwError('m', 'businessDivision', 'incorrect', variable.allowedVehicleBusinessDivision, '(or a comma separated combination of any of those values)');
          return;
        } else {
          variable._throwError('o', 'businessDivision', 'incorrect-o', variable.allowedVehicleBusinessDivision, '(or a comma separated combination of any of those values)');
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
            variable._throwError('m', 'options[n].category1', 'incorrect', variable.allowedOptionsCategory1, "");
            return;
          } else {
            variable._throwError('o', 'options[n].category1', 'incorrect-o', variable.allowedOptionsCategory1, "");
            mandatoryData['options'][i]['category1'] = '';
          }
        }
      }else{
        if (variable.events[eventName].mandatoryData.indexOf('options[n].category1') > -1) {
          variable._throwError('m', 'options[n].category1', 'incorrect', variable.allowedOptionsCategory1, "");
          return;
        } else {
          variable._throwError('o', 'options[n].category1', 'incorrect-o', variable.allowedOptionsCategory1, "");
          mandatoryData['options'][i]['category1'] = '';
        }
      }
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
    productElement.productInfo.productName = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.options && PROJECT_SPECIFIC_DATA.options.productName && PROJECT_SPECIFIC_DATA.options.productName != "") ? PROJECT_SPECIFIC_DATA.options.productName : (typeof option['name'] != 'undefined' ? option['name'] : '');

    productElement.productInfo.productID = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.options && PROJECT_SPECIFIC_DATA.options.productID && PROJECT_SPECIFIC_DATA.options.productID != "") ? PROJECT_SPECIFIC_DATA.options.productID : ((typeof option['productID'] != 'undefined' ? option['productID'] : '') || (typeof option['code'] != 'undefined' ? option['code'] : '') || ("product" + (optionIdGenerate + 1)));

    productElement.productInfo.manufacturer = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.options && PROJECT_SPECIFIC_DATA.options.manufacturer && PROJECT_SPECIFIC_DATA.options.manufacturer != "") ? PROJECT_SPECIFIC_DATA.options.manufacturer : (typeof option['manufacturer'] != 'undefined' ? option['manufacturer'] : '');

    productElement.category.productType = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.options && PROJECT_SPECIFIC_DATA.options.productType && PROJECT_SPECIFIC_DATA.options.productType != "") ? PROJECT_SPECIFIC_DATA.options.productType : (typeof option['businessDivision'] != 'undefined' ? option['businessDivision'] : '');

    productElement.category.primaryCategory = ((typeof option['primaryCategory'] != 'undefined' && option['primaryCategory'] == 'finance') ? option['primaryCategory'] : ((typeof mandatoryData['componentName'] != "undefined") ? mandatoryData['componentName'] + " options" : variable.message.component[0].componentInfo.componentName + " options"));

    productElement.category.subCategory1 = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.options && PROJECT_SPECIFIC_DATA.options.subCategory1 && PROJECT_SPECIFIC_DATA.options.subCategory1 != "") ? PROJECT_SPECIFIC_DATA.options.subCategory1 : (typeof option['category1'] != 'undefined' ? option['category1'] : '');

    productElement.category.subCategory2 = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.options && PROJECT_SPECIFIC_DATA.options.subCategory2 && PROJECT_SPECIFIC_DATA.options.subCategory2 != "") ? PROJECT_SPECIFIC_DATA.options.subCategory2 : (typeof option['category2'] != 'undefined' ? option['category2'] : '');

    productElement.attributes.modelCode = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.options && PROJECT_SPECIFIC_DATA.options.codeVG && PROJECT_SPECIFIC_DATA.options.codeVG != "") ? PROJECT_SPECIFIC_DATA.options.codeVG : (typeof option['codeVG'] ? option['codeVG'] : '');
    productElement.attributes.modelCode = (((productElement || "").attributes || "").modelCode || "").toUpperCase();

    productElement.attributes.status = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.options && PROJECT_SPECIFIC_DATA.options.status && PROJECT_SPECIFIC_DATA.options.status != "") ? PROJECT_SPECIFIC_DATA.options.status : (typeof option['status'] ? option['status'] : '');

    productElement.attributes.mmdr = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.options && PROJECT_SPECIFIC_DATA.options.range && PROJECT_SPECIFIC_DATA.options.range != "") ? PROJECT_SPECIFIC_DATA.options.range : (typeof option['range'] ? option['range'] : '');
    productElement.attributes.mmdr = (((productElement || "").attributes || "").mmdr || "").toUpperCase();

    productElement.attributes.fin = {};

    productElement.attributes.fin.downPayment = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.options && PROJECT_SPECIFIC_DATA.options.downPayment && PROJECT_SPECIFIC_DATA.options.downPayment != "") ? PROJECT_SPECIFIC_DATA.options.downPayment : (typeof option['downPayment'] != 'undefined' ? option['downPayment'] : '');

    productElement.attributes.fin.finMileage = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.options && PROJECT_SPECIFIC_DATA.options.finMileage && PROJECT_SPECIFIC_DATA.options.finMileage != "") ? PROJECT_SPECIFIC_DATA.options.finMileage : (typeof option['finMileage'] != 'undefined' ? option['finMileage'] : '');

    productElement.attributes.fin.finMonthlyPayment = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.options && PROJECT_SPECIFIC_DATA.options.finMonthlyPayment && PROJECT_SPECIFIC_DATA.options.finMonthlyPayment != "") ? PROJECT_SPECIFIC_DATA.options.finMonthlyPayment : (typeof option['finMonthlyPayment'] != 'undefined' ? option['finMonthlyPayment'] : '');

    productElement.attributes.fin.finTerm = (PROJECT_SPECIFIC_DATA && PROJECT_SPECIFIC_DATA.options && PROJECT_SPECIFIC_DATA.options.finTerm && PROJECT_SPECIFIC_DATA.options.finTerm != "") ? PROJECT_SPECIFIC_DATA.options.finTerm : (typeof option['finTerm'] != 'undefined' ? option['finTerm'] : '');

    productElement = JSON.parse(JSON.stringify(productElement, (k, v) => (v == "" ? undefined : v)));
    variable.message.product.push(productElement);
  });
}

// *** end eventHandlerOptions.js ***
// *** start eventHandlerDealer.js ***

// ************************
// * VALUE CHECKS: DEALER *
// ************************

// validate dealer selection state
if (typeof mandatoryData != 'undefined' && typeof mandatoryData['dealer'] != "undefined" && mandatoryData['dealer'].length > 0) {
    var flagVariable = false;
    for (var i in mandatoryData['dealer']) {
        if (typeof mandatoryData['dealer'][i].selectionState != "undefined") {
            if (!this.allowedDealerSelectionState.includes(mandatoryData['dealer'][i].selectionState)) {
                flagVariable = true;
                mandatoryData['dealer'][i].selectionState = '';
            }
        }
    }
    if (flagVariable) {
        if (this.events[eventName].mandatoryData.indexOf('dealer[n].selectionState') > -1) {
            this._throwError('m', 'dealer[n].selectionState', 'incorrect', this.allowedDealerSelectionState);
            return;
        } else {
            this._throwError('o', 'dealer[n].selectionState', 'incorrect-o', this.allowedDealerSelectionState);
        }
    }
}

// ****************************
// * VARIABLE MAPPING: DEALER *
// ****************************

this.message.dealer = [];
if (typeof mandatoryData != 'undefined' && mandatoryData['dealer']) {
    mandatoryData['dealer'].forEach((dealer) => {
        let dealerElement = JSON.parse(JSON.stringify(this.defaultDatalayer.dealer[0]));

        if (typeof dealer['groupID'] != "undefined") {
            dealerElement.dealerInfo.dealerGroupID = dealer['groupID'];
        }
        if (typeof dealer['groupName'] != "undefined") {
            dealerElement.dealerInfo.dealerGroupName = dealer['groupName'];
        }
        if (typeof dealer['outletBuno'] != "undefined") {
            dealerElement.dealerInfo.dealerOutletBuno = dealer['outletBuno'];
        }
        if (typeof dealer['outletID'] != "undefined") {
            dealerElement.dealerInfo.dealerOutletID = dealer['outletID'];
        }
        if (typeof dealer['outletName'] != "undefined") {
            dealerElement.dealerInfo.dealerOutletName = dealer['outletName'];
        }
        if (typeof dealer['selectionState'] != "undefined") {
            dealerElement.attributes.selectionState = dealer['selectionState'];
        }
        if (typeof dealer['location'] != "undefined") {
            dealerElement.attributes.location = dealer['location'];
        }
        this.message.dealer.push(dealerElement);
    });
}

// *** end eventHandlerDealer.js ***
// *** start eventHandlerPages.js ***
if(typeof prefix == "undefined"){
  var prefix;
}
prefix = (typeof prefix != "undefined") ? prefix : TRON.prefix;

// **********************
// * VALUE CHECKS: PAGE *
// **********************

// validate page brand
this._validateProperty('pageBrand', this.allowedPageBrand, eventName, mandatoryData);

//validate page variant
this._validateProperty('pageVariant', this.allowedPageVariant, eventName, mandatoryData);

// validate page geoRegion
if (typeof mandatoryData != 'undefined' && typeof mandatoryData['pageGeoRegion'] != 'undefined') {
  if (mandatoryData['pageGeoRegion'].length == 2) {
    mandatoryData['pageGeoRegion'] = mandatoryData['pageGeoRegion'].toUpperCase();
  } else {
    mandatoryData['pageGeoRegion'] = mandatoryData['pageGeoRegion'].toLowerCase();
    if (!['global'].includes(mandatoryData['pageGeoRegion'])) {
      if (this.events[eventName].mandatoryData.indexOf('pageGeoRegion') > -1) {
        this._throwError('m', 'pageGeoRegion', 'incorrect', this.allowedPageGeoRegion);
        return;
      } else {
        this_throwError('o', 'pageGeoRegion', 'incorrect', this.allowedPageGeoRegion);
        mandatoryData['pageGeoRegion'] = '';
      }
    }
  }
}

// validate page Language
if (typeof mandatoryData != 'undefined' && typeof mandatoryData['pageLanguage'] != 'undefined') {
  if (mandatoryData['pageLanguage'].length != 2) {
    if (this.events[eventName].mandatoryData.indexOf('pageLanguage') > -1) {
      this._throwError('m', 'pageLanguage', 'incorrect', '', '(has to follow ISO standard of 2 letters in uppercase)');
      return;
    } else {
      this._throwError('o', 'pageLanguage', 'incorrect-o', '', '(has to follow ISO standard of 2 letters in uppercase)');
      mandatoryData['pageLanguage'] = '';
    }
  } else {
    mandatoryData['pageLanguage'] = mandatoryData['pageLanguage'].toLowerCase();
  }
}

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
    
    if(mandatoryData['pageSubCat1'].startsWith("option_group")) {
      mandatoryData['pageSubCat1'] = 'options';
    }else if (mandatoryData['pageSubCat1'] === 'EXTERIOR_HIGHLIGHTS') {
      mandatoryData['pageSubCat1'] = 'options';
      mandatoryData['pageSubCat2'] = 'exterior highlights';
    } else if (mandatoryData['pageSubCat1'] === 'INTERIOR_HIGHLIGHTS') {
      mandatoryData['pageSubCat1'] = 'options';
      mandatoryData['pageSubCat2'] = 'interior highlights';
    }

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
      this.message.page.attributes.brand = mandatoryData['pageBrand']
    }

    this.message.page.attributes.timeZone = ((new Date()).getTimezoneOffset() / 60) + ':00'; // should be Please provide the ISO 8601 time code format "ï¿½hh:mm". If the time is in UTC, add a Z . Z is the zone designator for the zero UTC offset:

    if (typeof mandatoryData['componentName'] != 'undefined'){
      this.message.page.category.primaryCategory = mandatoryData['componentName']
  } else {
    this.message.page.category.primaryCategory = this.message.component[0].componentInfo.componentName
  }

  if (typeof mandatoryData['pageSubCat1'] != 'undefined') {
    this.message.page.category.subCategory1 = mandatoryData['pageSubCat1'];
  }

  if (typeof mandatoryData['pageSubCat2'] != 'undefined') {
    this.message.page.category.subCategory2 = mandatoryData['pageSubCat2'];
  }

  if (typeof mandatoryData['pageSubCat3'] != 'undefined') {
    this.message.page.category.subCategory3 = mandatoryData['pageSubCat3'];
  }

  if (mandatoryData['pageType'] && typeof mandatoryData['pageType'] != 'undefined') {
    this.message.page.category.pageType = mandatoryData['pageType']
  }

  if (typeof mandatoryData['componentDEVagency'] != 'undefined') {
    this.message.page.pageInfo.author = mandatoryData['componentDEVagency']; // name of the developer agency
  }

  this.message.page.pageInfo.destinationURL = document.location.href; // URL of current page

  if (typeof mandatoryData['pageGeoRegion'] != 'undefined') {
    this.message.page.pageInfo.geoRegion = mandatoryData['pageGeoRegion']; //
  }

  if (typeof mandatoryData['pageLanguage'] != 'undefined') {
    this.message.page.pageInfo.language = mandatoryData['pageLanguage'];
  }

  this.message.page.pageInfo.pageName = prefix + this.message.page.pageInfo.pageName;

  this.message.page.pageInfo.referringURL = document.referrer; // URL of previous page

  if (typeof mandatoryData['pageSysEnv'] != 'undefined') {
    this.message.page.pageInfo.sysEnv = mandatoryData['pageSysEnv']; // map to v135
  }

  if (typeof mandatoryData['pageVariant'] != 'undefined') {
    this.message.page.pageInfo.variant = mandatoryData['pageVariant'];
  }

  if (typeof mandatoryData['pageVersion'] != 'undefined') {
    this.message.page.pageInfo.version = mandatoryData['pageVersion'] // map to c29
  } else if (typeof mandatoryData['componentVersion'] != 'undefined') {
    this.message.page.pageInfo.version = mandatoryData['componentVersion']
  }
}
}

// *** end eventHandlerPages.js ***

//**PROJECT SPECIFIC CONDITIONS**
// form page mapping
if (typeof this.message.custom != 'undefined' && this.message.event[0].eventInfo.eventName == 'page view') {
  if(typeof mandatoryData['formType'] != 'undefined'){
    this.message.page.pageInfo.pageName = "standalone " + mandatoryData['formType'] + " " + mandatoryData['pageName'];
    }
  if(typeof mandatoryData['formName'] != 'undefined'){
        this.message.page.pageInfo.pageName = "standalone " + mandatoryData['formType'] + " " +  mandatoryData['formName'] + " " + mandatoryData['pageName']
      }
  this.message.event[0].eventInfo.effect = "page: " + this.message.page.pageInfo.pageName + " shown"
if(typeof mandatoryData['pageSubCat1'] == "undefined" && typeof mandatoryData['formVariant'] != "undefined" ){
    this.message.page.category.subCategory1 = mandatoryData['formVariant'];
  }
  if(typeof mandatoryData['formOrigin'] != "undefined"){
    this.message.page.category.primaryCategory = mandatoryData['formOrigin'];  
  }}


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
        }

        if (typeof this.message.event[0].eventInfo.effect != 'undefined') {
            if(typeof prefix != "undefined"){
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
        if (mandatoryData && mandatoryData["eventPoints"] && (typeof mandatoryData['eventPoints'] != 'undefined' || (typeof mandatoryData['eventPoints'] == 'string' && mandatoryData['eventPoints'].trim().length == 0))) { // only for events with speed tracking
            if (typeof mandatoryData["eventPoints"] != "number") {
                if (this.events[eventName].mandatoryData.indexOf('eventPoints') > -1) {
                    this._throwError('m', 'eventPoints', 'incorrect-numeric', '', '(time between two events in miliseconds)');
                    return;
                } else {
                    this._throwError('o', 'eventPoints', 'incorrect-numeric', '', '(time between two events in miliseconds)');
                }
            }
            this.message.event[0].eventInfo.eventPoints = mandatoryData["eventPoints"]
        }

        //mapping the parameter "eventAction (item added/removed must not be overwritten)
        if (typeof mandatoryData['eventAction'] != 'undefined' && (this.message.event[0].eventInfo.eventAction == "item added" || this.message.event[0].eventInfo.eventAction == "item removed" || this.message.event[0].eventInfo.eventAction == "form start intention")) {
            this._throwError("o", this.message.event[0].eventInfo.eventAction, "specific case", "");
            //console.warn("since eventInfo.eventAction = 'item added' or 'item removed' or 'form start intention', it cannot be overwritten with eventAction");
        } else if (typeof mandatoryData['eventAction'] != 'undefined' && (this.message.event[0].eventInfo.eventAction !== "item added" && this.message.event[0].eventInfo.eventAction !== "item removed" && this.message.event[0].eventInfo.eventAction !== "form start intention")) {
            this.message.event[0].eventInfo.eventAction = mandatoryData['eventAction']
        }

        //effect should always be lower case
        this.message.event[0].eventInfo.effect = this.message.event[0].eventInfo.effect.toLowerCase();

        //change the component ID
        this.message.component[0].componentInfo.componentID = (((this.message.page || "").attributes || "").brand || "") + "/" + (((this.message.page || "").pageInfo || "").geoRegion || "") + "_" + (((this.message.page || "").pageInfo || "").language || "") + "/" + this.message.component[0].componentInfo.componentName;

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

        var ignoreParameters = ['formLeadType', 'formComChannel', 'dealer[n].selectionState', 'options[n].code', 'options[n].codeVG', 'options[n].category1', 'pageGeoRegion', 'pageLanguage', 'vehicle[n].range', 'pageSubCat1', 'eventPoints', 'viewMode', 'viewType', 'viewDayTime', 'viewScreen', 'viewPerspective', 'filterObject', 'search[n].searchState'];

        possibleValues = possibleValues.filter(function (e) {
            return e !== ''
        });
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
            }else if(type == "optional"){
                this._throwError('o', item, 'empty', possibleValues);
                returnValue = true;
            }
        }
        //value wrong
        if (Array.isArray(possibleValues) && possibleValues.length > 0 && !possibleValues.includes(value) && (((typeof value == "string" && value.trim().length > 0)) || (value == null) || (typeof value == 'undefined') || (typeof value == 'number')) && returnValue == true) {
            //Ignore vehicle data check here and will be taken care at the eventhandler
            if (item.indexOf('vehicle') > -1) {
                var ignoreCase = ['codeAG', 'codeVG', 'rangeAG', 'rangeVG','bodyType', 'businessDivision', 'category1', 'fuelType', 'hybridVersion', 'primaryCategory', 'series', 'salesModel', 'status'];
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
            if (item == "eventEffect") {
                if (this.version.indexOf('Trade-in') < 0) {
                    if (!(functionName.indexOf('ViewActions') > -1 && typeof parameterPassed['viewMode'] != 'undefined')) {
                        return true;
                    }
                }
            }


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
                message += `${key} parameter is missing, hence this ${buffer || ''} cannot be tracked. Please provide the parameter ${instruction || ''}: ${key}`;
                break;
            case 'empty':
                if (typeof possibleValue != 'string' && possibleValue.length == 0) {
                    message += `${key} value is empty, hence this ${buffer || ''} cannot be tracked. Please provide a valid value ${instruction || ''}`;
                } else {
                    message += `${key} value is empty, hence this ${buffer || ''} cannot be tracked. Please provide a valid value for ${instruction || ''}: ${possibleValue}`;
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
            case 'eventMessage':
                message += `custom event created was not sent, hence this event cannot be tracked. Please check the error ${instruction || ''}:`;
                break;
            case 'nonValidFunction':
                message += `function ${key}  is not defined in the library, hence this event cannot be tracked. Please make sure to use a correct reference name. ${instruction || ''};`;
                break;
        }

        message = flagType + message;

        if (paramType === "m") {
            TRON.customConsole.error(message)
        } else if (paramType == "o") {
            TRON.customConsole.warn(message)
        }
    }

    _validateProperty(propertyName, allowedValues, eventName, mandatoryData, flagValue = false) {
        if (mandatoryData && mandatoryData[propertyName] && typeof mandatoryData[propertyName] != undefined) {
            let propertyValue = mandatoryData[propertyName];
            if (!allowedValues.includes(propertyValue)) {
                if ((this.events[eventName].mandatoryData.indexOf(propertyName) > -1) || (flagValue == true)) {
                    this._throwError('m', propertyName, 'incorrect', allowedValues);
                    return
                } else {
                    this._throwError('o', propertyName, 'incorrect-o', allowedValues);
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
        if (this.message.component[0].category.componentType.indexOf('iframe') > -1) {
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
window.onerror = function () {
    if (arguments.length > 0) {
        if (typeof arguments[0] == 'string') {
            if (arguments[0].indexOf('Uncaught TypeError: ') > -1 && arguments[0].indexOf('not a function') > -1) {
                var functionName = arguments[0].split('Uncaught TypeError: ')[1].split('is not a function')[0];
                //this._throwError("m",functionName,'nonValidFunction',[arguments]);
                var x = TRON.version.split('Â¦');
                x[x.length - 1] = 'functionDoesNotExist';
                TRON.version = x.join('Â¦');
                TRON.currentEventName = 'functionDoesNotExist';
                TRON.customConsole.error("Incorrect TRON implementation: â›” this function " + functionName + " does not exist , hence this event cannot be tracked. Please make sure to use a correct reference name!", "\n", "Error occurred at:", arguments);
                return true;
            }
        }
    }
    return false;
};

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
                () => "homepage",
            ]),
            "subCategory1": gFFWNV([
                () => (typeof datalayerPath('page.category.secondaryTags') == 'object') && datalayerPath('page.category.secondaryTags.0'),
                () => ((typeof datalayerPath('pageInstanceId') != "undefined" && datalayerPath('pageInstanceId').split('/') && datalayerPath('pageInstanceId').split('/').length > 1 && typeof datalayerPath('pageInstanceId').split('/')[7] != "undefined")) && datalayerPath('pageInstanceId').split('/')[7],
                () => datalayerPath('page.pageLevel2'),
                () => datalayerPath('page.category.subCategory01'),
                () => datalayerPath('page.category.purchaseReason'),
                () => datalayerPath('page.category.subCategory1'),
                () => "content",
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

    //if details are not sent then add waht is available in ACDL already
    if (capturedProductsFromDataLayer.length <= 0 && typeof window.adobeDataLayer != "undefined" && typeof window.adobeDataLayer.getState != "undefined" && typeof window.adobeDataLayer.getState('product') != "undefined") {
        capturedProductsFromDataLayer = Object.keys(adobeDataLayer.getState('product')).map(function (key) {
            return adobeDataLayer.getState('product')[key];
        });
    }

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
        if (((ceddlObj.event[0].eventInfo.eventName == "commerce") && ((ceddlObj.event[0].eventInfo.type == "cart") || (ceddlObj.event[0].eventInfo.type == "checkout"))) || ((((ceddlObj || "").cart || "").cartID || "") != "")) {
            cartTemplate = Object.assign({}, productTemplate);
        }

        var cart = {
            'item': cartTemplate,
            'price': ceddlObj.cart.price || {},
            'cartID': ceddlObj.cart.cartID || ""
        }

        arrayDL.push({
            'cart': cart
        })
    }

    //push tarnsaction to ACDL
    var transactionTemplate = {};
    var capturedTransactionFromDatalayer = ceddlObj.transaction;
    if (capturedTransactionFromDatalayer && capturedTransactionFromDatalayer.item.length > 0 && typeof capturedTransactionFromDatalayer != 'string') {
        if (((ceddlObj.event[0].eventInfo.eventName == "commerce") && ((ceddlObj.event[0].eventInfo.type == "order"))) || ((((ceddlObj || "").transaction || "").transactionID || "") != "")) {
            transactionTemplate = Object.assign({}, productTemplate)
        }
        var transaction = {
            'item': transactionTemplate,
            'total': ceddlObj.transaction.total || {},
            'transactionID': ceddlObj.transaction.transactionID || ""
        }

        arrayDL.push({
            'transaction': transaction
        })
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
            
            if(typeof profIndex != "undefined" && profIndex.indexOf('profile') > -1){
                userIndex = 'user' + ((+i) + 1);
            }else{
                userIndex = profIndex;
            }
            
            userTemplate[userIndex] = JSON.parse(JSON.stringify(tronUserDetail[i]));
            userTemplate[userIndex].profile = JSON.parse(JSON.stringify(profileTemplate));
        }
        ceddlObj.user = JSON.parse(JSON.stringify(userTemplate));
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
                "linkedComponent": componentKey,
                "linkedProducts": (ceddlObj.event[0].eventInfo.eventName == "page view") ? productReferences2 : productReferences,
                "linkedDealers": dealerReferences,
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
        if(window.TRON.warningCode.length > 0){
            for(var i in window.TRON.warningCode){
                window.adobeDataLayer.push(window.TRON.warningCode[i]);
            }
            window.TRON.warningCode = [];
        }
    })
    TRON.isInitialized = true;
}
//*** end TRON.js ***
// TRON TRACKING LIBRARY END
