(function($, win){

    "use strict";

    // Apply all given eventNames on the event
    var blockEvents = function(e, eventNames){
        for(var i = 0; i < eventNames.length; i++){
            var methodName = eventNames[i];
            // do not use .apply() or .call() - chrome will not work as expected
            if(typeof e[methodName] == "function"){
                e[methodName]();
            }
        }
    };

    // Helper for getting a function in a defined namespace and maybe splitted functionName like "ibrows.namespace.function"
    var getFunctionInNamespace = function(functionName, namespace, doSplitting){
        if(!functionName){
            return null;
        }

        var func = null;
        if(!doSplitting){
            func = namespace[functionName];
        }else{
            var splits = functionName.split(".");
            var funcNamespace = namespace;
            for(var i = 0; i < splits.length-1; i++){
                funcNamespace = funcNamespace[splits[i]];
                if(typeof funcNamespace != "object"){
                    throw "Invalid func namespace "+ functionName +" in given namespace";
                }
            }
            func = funcNamespace[splits[splits.length-1]];
        }

        if(typeof func !== "function"){
            return null;
        }

        return (typeof func == "function") ? func : null;
    };

    $.fn.ibrowsSmartAjaxAutoSubmitForm = function(options){
        var settings = $.extend(true, {
            // Child selector for the form elements, on which the change listener is applied
            // <form data-auto-submit> = change listener on whole form -> each input element. Same as data-auto-submit="true"
            // <form data-auto-submit="select"> = only change listener applied on select elements (every jQuery selector is OK)
            'selector': 'auto-submit'
        }, options);

        return this.each(function(){
            var form = $(this);
            var selector = form.data(settings.selector).toString();

            if(selector !== "true"){
                form.on('change', selector, function(e){
                    form.submit();
                });
            }else{
                form.change(function(e){
                    form.submit();
                });
            }
        });
    };

    $.fn.ibrowsSmartAjaxForm = function(options){
        var settings = $.extend(true, {
            // If clicked on a submit button, normally ajax scripts only send all the form data, without the clicked submit button value
            // This can cause miss interpretation on controller/server side, if for example 2 submit buttons exist and no information exists which one was pressed
            'generateHiddenSubmitValue': true,

            // Default refresh elements, for example #flashmessages so that after every ajax submit flashmessages are rendered
            'defaultRefreshElements': [],

            'blockedEvents': ['preventDefault', 'stopPropagation'],

            // search on form for 'data-refresh-elements' string to get refreshing selectors, separated by ","
            'refreshElementsDataAttribute': 'refresh-elements',
            'refreshElementsSeparator': ',',

            // Ajax Redirect - Has to be in sync with the configuration of the AjaxRedirectListener
            'redirectStatusCode': 205,
            'redirectHeader': 'Redirect-Location',

            // Called when ajax error occurs - this = form as jQuery object
            'errorCallback': function(xhr, ajaxOptions, thrownError){},

            'ajaxSettings': {
                'cache': false,
                'headers': {'Ibrows-Smart-Ajax-Request': 'form'}
            },

            /**
             * DataLoad Function = method which handels the whole response from ajax
             * load = target to find on response for replace
             * successFunction = callback after ajax success
             * <form data-load-function="ibrows.loadAjaxForm" data-load="#myContent" data-success-function="ibrows.successAjaxForm">
             */
            'dataSelectors': {
                'loadFunction': 'load-function',
                'load': 'load',
                'successFunction': 'success-function'
            },

            'callbackRootNamespace': win,

            // Whether or not a data-load-function="ibrows.loadAjaxForm" should be splitted to call
            // callbackRootNamespace.ibrows.loadAjaxForm (true / default) or callbackRootNamespace["ibrows.loadAjaxForm"] (false)
            'callbackNamespaceSplitting': true
        }, options);

        return this.each(function(){
            var form = $(this);

            // Apply submit value hack, see generateHiddenSubmitValue settings info
            if(settings.generateHiddenSubmitValue){
                form.find(':submit').click(function(){
                    var submit = $(this);
                    var name = submit.attr('name');
                    var value = submit.val();
                    var hiddenInput = form.find('input:submit[name="'+ name +'"]');

                    if(hiddenInput.length > 0){
                        hiddenInput.val(value);
                    }else{
                        form.append('<input type="hidden" name="'+ name +'" value="'+ value +'">');
                    }
                });
            }

            form.on('submit', function(e) {
                // block events
                blockEvents(e, settings.blockedEvents);

                // collect refresh selectors
                var refreshElementsString = form.data(settings.refreshElementsDataAttribute);
                var refreshSelectors = settings.defaultRefreshElements;
                if(refreshElementsString){
                    refreshSelectors = refreshSelectors.concat(refreshElementsString.split(settings.refreshElementsSeparator));
                }

                // setup ajax settings
                var ajaxSettings = $.extend(true, settings.ajaxSettings, {
                    success: function(html, responseMessage, responseObject, context){

                        // Check if special redirect status code given
                        // @see Ibrows\SmartAjaxBundle\Listener\AjaxRedirectListener::onKernelResponse
                        var statusCode = responseObject.status;
                        var redirectLocation = responseObject.getResponseHeader(settings.redirectHeader);
                        if(statusCode == settings.redirectStatusCode && redirectLocation){
                            location.href = redirectLocation;
                            return;
                        }

                        // Get a loadFunction if defined
                        var loadFunctionName = form.data(settings.dataSelectors.loadFunction);
                        var loadFunction = getFunctionInNamespace(loadFunctionName, settings.callbackRootNamespace, settings.callbackNamespaceSplitting);

                        var loadinto = null;
                        var loadfrom = null;

                        if(loadFunction){
                            // if found -> apply
                            loadFunction.apply(form, [context, html, responseMessage, responseObject]);
                        }else{
                            // if not found, check if a data-load attr is given, else search for equal form in response and replace inner html of that
                            var loadintoSelector = form.data(settings.dataSelectors.load);

                            // load into selector or the context form
                            loadinto = loadintoSelector ? loadintoSelector : form;

                            // load from (ajax response) is loadintoSelector or try to find the same form on response
                            loadfrom = loadintoSelector ? loadintoSelector : 'form[action="'+ form.attr('action') +'"]';

                            $(loadinto).html($(loadfrom, '<div>'+ html +'</div>').html());
                        }

                        // Apply success function if given
                        var successFunctionName = form.data(settings.dataSelectors.successFunction);
                        var successFunction = getFunctionInNamespace(successFunctionName, settings.callbackRootNamespace, settings.callbackNamespaceSplitting);
                        if(successFunction){
                            successFunction.apply(form, [context, html, loadinto, loadfrom, responseMessage, responseObject]);
                        }

                        // refresh additional elements
                        if(refreshSelectors){
                            jQuery.each(refreshSelectors, function(index, selector){
                                var target = jQuery(win.document).find(selector);
                                var targetHtml = jQuery(selector, '<div>'+html+'</div>').html();
                                jQuery(target).html(targetHtml);
                            });
                        }

                        if( jQuery(form).attr('data-notify') ) {
                            var notificationElement = jQuery(form).attr('data-notify');
                            jQuery(notificationElement).trigger('smartajax-success');
                        }

                        if( jQuery(form).find("[data-notify]").length > 0 ) {
                            jQuery(jQuery(form).find("[data-notify]").attr('data-notify')).trigger('smartajax-success');
                        }
                    },

                    error: function(xhr, ajaxOptions, thrownError){
                        settings.errorCallback.apply(form, [xhr, ajaxOptions, thrownError]);
                    }
                });

                if(typeof form.ajaxSubmit != "function"){
                    throw "load jquery.form.min.js";
                }

                form.ajaxSubmit(ajaxSettings);
            });

        });
    };

    var ibrowsSmartAjaxLinkSettings = {
        // Maybe add 'stopPropagation'
        'blockedEvents': ['preventDefault'],
        'dataSelectors': {
            // Url that will be called over ajax - fallback is href attribute
            'loadUrl': 'load-url',
            // Determine which content should be selected to replace
            'loadFrom': 'load-from',
            // Target to replace - is also used as loadFrom if no loadFrom is defined
            'load': 'load',
            // Function name for success, called after replace
            'successFunction': 'success-function',
            // Own load function - replace must be done manually
            'loadFunction': 'load-function',
            // Replace content only once? (if doCache is true)
            'doCache': 'do-cache',
            // Internal variable to determine if ajax request is already done (cached = true)
            'cached': 'cache'
        },
        'ajaxSettings': {
            cache: false
        },
        // Called when ajax error occurs - this = form as jQuery object
        'errorCallback': function(xhr, ajaxOptions, thrownError){},

        'callbackRootNamespace': win,

        // Whether or not a data-load-function="ibrows.loadAjaxForm" should be splitted to call
        // callbackRootNamespace.ibrows.loadAjaxForm (true / default) or callbackRootNamespace["ibrows.loadAjaxForm"] (false)
        'callbackNamespaceSplitting': true
    };

    $.fn.ibrowsSmartAjaxLink = function(options){
        var settings = $.extend(true, ibrowsSmartAjaxLinkSettings, options);
        return this.each(function(){
            var elem = $(this);
            elem.on('click', function(e){
                // block events
                blockEvents(e, settings.blockedEvents);
                elem.ibrowsSmartAjaxLinkExecute(settings);
            });
        });
    };

    $.ibrowsSmartAjaxLinkOn = function(parentSelector, filterSelector, options){
        var settings = $.extend(true, ibrowsSmartAjaxLinkSettings, options);
        $(parentSelector).on('click', filterSelector, function(e){
            // block events
            blockEvents(e, settings.blockedEvents);
            $(this).ibrowsSmartAjaxLinkExecute(settings);
        });
    };

    $.fn.ibrowsSmartAjaxLinkExecute = function(options){
        var settings = $.extend(true, ibrowsSmartAjaxLinkSettings, options);
        return this.each(function(){
            var elem = $(this);

            // Is caching on?
            var doCacheValue = elem.data(settings.dataSelectors.doCache);
            var doCaching = typeof doCacheValue != "undefined" && doCacheValue !== false;
            if(doCaching && elem.data(settings.dataSelectors.cached) == true){
                return;
            }

            // determine url to make the request to the server, fallback to normal href attribute
            var loadUrl = elem.data(settings.dataSelectors.loadUrl);
            if(!loadUrl){
                loadUrl = elem.attr('href');
            }

            var ajaxSettings = $.extend(true, settings.ajaxSettings, {
                url: loadUrl,
                context: elem,
                success: function(html, responseMessage, responseObject, context){
                    var loadFunctionName = elem.data(settings.dataSelectors.loadFunction);
                    var loadFunction = getFunctionInNamespace(loadFunctionName, settings.callbackRootNamespace, settings.callbackNamespaceSplitting);

                    var loadfrom = null;
                    var loadinto = null;

                    if(loadFunction){
                        loadFunction.apply(elem, [elem, html]);
                    }else{
                        loadfrom = elem.data(settings.dataSelectors.loadFrom);
                        loadinto = elem.data(settings.dataSelectors.load);

                        if(typeof loadfrom == "undefined"){
                            loadfrom = loadinto;
                        }

                        var loadintoElement = $(loadinto);
                        if(loadfrom == false){
                            loadintoElement.html(html);
                        } else {
                            var targetHtml = $('<div>'+ html +'</div>').html();
                            loadintoElement.html(targetHtml);
                            $(loadintoElement).trigger('data-loaded');
                        }
                    }

                    var successFunctionName = elem.data(settings.dataSelectors.successFunction);
                    var successFunction = getFunctionInNamespace(successFunctionName, settings.callbackRootNamespace, settings.callbackNamespaceSplitting);
                    if(successFunction){
                        successFunction.apply(elem, [elem, html, loadintoElement, loadfrom, responseMessage, responseObject, context]);
                    }

                    if(doCaching){
                        elem.data(settings.dataSelectors.cached, true);
                    }
                },
                error: function(xhr, ajaxOptions, thrownError){
                    settings.errorCallback.apply(elem, [xhr, ajaxOptions, thrownError]);
                }
            });

            jQuery.ajax(ajaxSettings);
        });
    };

})(window.jQuery, window);
