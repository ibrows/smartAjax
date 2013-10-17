jQuery.fn.getPath = function () {
    if (this.length != 1) throw 'Requires one element.';

    var path = '',
        node = this;

    while (node.length) {
        var realNode = node[0], name = realNode.localName;
        if (!name) break;

        name = name.toLowerCase();
        if (realNode.id) {
            // As soon as an id is found, there's no need to specify more.
            return name + '#' + realNode.id + (path ? '>' + path : '');
        }
        // does not work whith masking the element
//		else if (realNode.className) {
//			name += '.' + realNode.className.split(/\s+/).join('.');
//		}

        var parent = node.parent(), siblings = parent.children(name);
        if (siblings.length > 1) name += ':eq(' + siblings.index(node) + ')';
        path = name + (path ? '>' + path : '');

        node = parent;
    }

    return path;
};

jQuery(document).ready(function() {
    loadAjaxForms();
    loadAjaxLinks();
});

//default values for status code 205 (reset content)
jQuery.ajaxSetup({
    statusCode: {
        205: function(data, textStatus, jqXHR){
            // infamous link hack
            var location = window.location;
            jQuery('.navbar').append('<form action='+location+' id="stupid-link-hack" method="Get" style="display:none;">link hack</form>');
            jQuery('#stupid-link-hack').submit();
        }
    }
});

function getAjaxTarget($element) {
    target = $element.attr('data-load');
    if(!target) {
        return $element;
    }
    var elements = jQuery(target);
    if(elements.size()>0) {
        return elements.first();
    }
    return elements;
}

function addAjaxOverlay($element) {
    if (window.debug && console) {
        console.log('masking element:');
        console.log($element);
    }
    $element.mask();
}

function removeAjaxOverlay($element) {
    if (window.debug && console) {
        console.log('unmasking element:');
        console.log($element);
    }
    $element.unmask();
}

function fillAjaxData($element, html) {
    var h = $element.prop('scrollHeight');

    $element.height(h);
    $element.html(html);

    var targetH = $element.prop('scrollHeight');

    if (h == targetH) {
        $element.height('auto');
    } else {
        $element.animate({
            height : targetH,
        },500, 'swing', function() {
            $element.height('auto');
        });
    }
}

function onAjaxSuccess(html, responseMessage, responseObject) {
    var 	$element = jQuery(this), $loadinto,
        functionname, func, selector;

    if ($element.attr('data-success-hide')) {
        var $parent = $element.parent();
        var $grandparent = $parent.parent();
        if ($parent.hasClass('modal')) {
            $parent.modal('hide');
        }
        if ($grandparent.hasClass('modal')) {
            $grandparent.modal('hide');
        }
    }

    functionname = $element.attr('data-load-function');
    func = (typeof window[functionname] === 'function') ? window[functionname] : null;
    if (func) {
        func.apply(null, [$element, html]);
    } else if ($element.attr('data-load') == "false") {
        // do nothing
    } else {
        $loadinto = getAjaxTarget($element);
        selector = $loadinto.selector ? $loadinto.selector : $loadinto.getPath();
        var loadData = jQuery(selector, '<div>' + html + '</div>').html();
        if (window.debug && console) {
            console.log('loading success data into element:');
            console.log($loadinto);
        }
        if(loadData) {
            fillAjaxData($loadinto, loadData);
        } else {
            fillAjaxData($loadinto, html);
        }
    }

    functionname = $element.attr('data-success-function');
    func = (typeof window[functionname] === 'function') ? window[functionname] : null;
    if (func) {
        func.apply(null, [$element, html]);
    } else if (functionname) {
        eval(functionname);
    }

    var refreshElements = $element.attr('data-success-refresh');
    if (refreshElements) {
        var element;
        refreshElements = refreshElements.split(',');
        for (var i = 0; i < refreshElements.length; ++i) {
            element = refreshElements[i];
            ajaxRefresh(element);
        }
    }
}

function ajaxRefresh(name) {
    name = jQuery.trim(name);
    $element = jQuery('[data-ajax-id="'+name+'"]');

    jQuery.ajax({
        cache: false,
        url: $element.attr('href') || $element.attr('data-remote') || $element.attr('action'),
        context: $element,
        beforeSend: onBeforeSend($element),
        complete: onComplete($element),
        success: onAjaxSuccess,
        error: onAjaxError
    });
}

function onComplete($element) {
    return function(xhr, settings) {
        removeAjaxOverlay($element);
    };
}

function onBeforeSend($element) {
    return function(xhr, settings) {
        addAjaxOverlay($element);
    };
}

function onAjaxError(html, responseMessage, responseObject) {
    if (window.debug && console) {
        console.log('ajax error: '+responseMessage);
    }
}

function loadAjaxForms() {
    jQuery(document).on('submit', 'form[data-toggle="ajax"]', function(event) {
        event.preventDefault();
        event.stopPropagation();

        var $form = jQuery(this),
            $target = getAjaxTarget($form);

        var options = {
            cache: false,
            context: $form,
            beforeSend: onBeforeSend($target),
            complete: onComplete($target),
            error: onAjaxError,
            statusCode: {
                200: onAjaxSuccess,
                217: function(html, responseMessage, responseObject) {
                    var selector = $form.selector ? $form.selector : $form.getPath();
                    var loadData = jQuery(selector, '<div>' + html + '</div>').html();
                    if (window.debug && console) {
                        console.log('loading form error into element:');
                        console.log(jQuery(selector));
                    }
                    if(loadData) {
                        $form.html(loadData);
                    } else {
                        $form.html(html);
                    }
                }
            }
        };

        // use jQuery Form Plugin (https://github.com/malsup/form) if available
        // since it does handle file uploads as well
        if (typeof $form.ajaxSubmit == 'function') {
            $form.ajaxSubmit(options);
        } else {
            var additionalOptions = {
                type: $form.attr('method'),
                url: $form.attr('action'),
                data: $form.serialize(),
            };

            for (var attrname in additionalOptions) {
                options[attrname] = additionalOptions[attrname];
            }
            jQuery.ajax(options);
        }

        return false;
    });
}

function loadAjaxLinks() {
    var loadAjax = function(event){
        event.preventDefault();
        event.stopPropagation();

        var $link = jQuery(this);
        var $target = getAjaxTarget($link);
        jQuery.ajax({
            cache: false,
            url: $link.attr('href'),
            context: $link,
            beforeSend: onBeforeSend($target),
            complete: onComplete($target),
            success: onAjaxSuccess,
            error: onAjaxError
        });
        return false;
    };

    jQuery(document).on('click', 'a[data-toggle="ajax"]', function(event) {
        loadAjax.call(this, event);
    });
    jQuery(document).on('click', 'a[data-toggle="ajax-modal"]', function(event) {
        var $element = jQuery(this),
            modalSelect = $element.attr('data-target'),
            $modal = jQuery(modalSelect);

        if (!$element.attr('data-load')) {
            $element.attr('data-load', modalSelect+' .modal-body');
        }

        $modal.modal('show');
        loadAjax.call(this, event);
    });
}