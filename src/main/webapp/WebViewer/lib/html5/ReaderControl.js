/*global Modernizr */

(function(exports) {
    "use strict";

    exports.ReaderControl = exports.ReaderControl || {};

    var Text = XODText;
    var ToolMode = exports.PDFTron.WebViewer.ToolMode;


    /**
     * Creates a new instance of ReaderControl
     * @name ReaderControl
     * @extends BaseReaderControl
     * @class Represents the full-featured ReaderControl reusable UI component that extends DocumentViewer.
     * @see ReaderControl.html ReaderControl.js ReaderControl.css
     * @param {object} options Options for the reader control
     **/
    exports.ReaderControl = function(options) {
        exports.BaseReaderControl.call(this, options);

        var me = this;
        this.eventsBound = false;

        this.thumbContainerWidth = 170;
        this.thumbContainerHeight = 200;
        this.requestedThumbs = {};
        this.lastRequestedThumbs = [];
        this.clickedThumb = -1;
        this.hasBeenClosed = false;

        this.clickedSearchResult = -1;
        this.clickedBookMark = -1;

        // Key binding.
        var fKey = 70;
        var leftArrowKey = 37;
        var upArrowKey = 38;
        var rightArrowKey = 39;
        var downArrowKey = 40;
        var pageDownKey = 34;
        var pageUpKey = 33;
        var cKey = 67;
        var vKey = 86;
        var sKey = 83;
        var tKey = 84;
        var plusKeys = [187, 61];
        var minusKeys = [189, 173];

        if (options.hideAnnotationPanel) {
            ReaderControl.config.ui.hideAnnotationPanel = true;
        }

        if (!options.pageHistory) {
            $('#backPage').hide();
            $('#forwardPage').hide();
        }

        this.initUI();

        if (!options.hideToolbar) {
            // use a setTimeout here because setting the toolbar to be visible first
            // affects the size of the scroll container because of loading elements in the toolbar
            setTimeout(function() {
                me.setToolbarVisibility(true);
            }, 0);
        }

        var stickyNoteTool = this.toolModeMap[ToolMode.AnnotationCreateSticky];
        stickyNoteTool.on('annotationAdded', function(e, annotation) {
            /*jshint unused:false */
            me.setToolMode(ToolMode.AnnotationEdit);
        });

        $(exports).keydown(function(e) {
            var ctrlDown = e.metaKey || e.ctrlKey;

            // document navigation
            // don't change pages if a text input is currently focused
            var currentPage = me.docViewer.getCurrentPage();
            var currentElementEditable = exports.utils.isEditableElement($(document.activeElement));

            if (!currentElementEditable) {
                if (e.which === leftArrowKey) {
                    if (currentPage > 1) {
                        me.docViewer.setCurrentPage(currentPage - 1);
                        me.trackPageHistory(currentPage - 1);
                    }
                } else if (e.which === rightArrowKey) {
                    if (currentPage <= me.docViewer.getPageCount()) {
                        me.docViewer.setCurrentPage(currentPage + 1);
                        me.trackPageHistory(currentPage + 1);
                    }
                } else if (e.which === upArrowKey) {
                    e.preventDefault();
                    scrollPage(-1, false, true);
                } else if (e.which === downArrowKey) {
                    e.preventDefault();
                    scrollPage(1, false, true);
                } else if (e.which === pageUpKey) {
                    e.preventDefault();
                    scrollPage(-1, true, true);
                } else if (e.which === pageDownKey) {
                    e.preventDefault();
                    scrollPage(1, true, true);
                }
            }

            var am = me.docViewer.getAnnotationManager();
            if (ctrlDown) {
                if (e.which === fKey) {
                    if ($("#control").is(':visible')) {
                        document.getElementById('searchBox').focus();
                        return false;
                    }
                } else if (_.contains(plusKeys, e.which)) {
                    // zoom in
                    setZoomLevelWithBounds(me.getZoomLevel() + 0.25);
                    e.preventDefault();
                } else if (_.contains(minusKeys, e.which)) {
                    // zoom out
                    setZoomLevelWithBounds(me.getZoomLevel() - 0.25);
                    e.preventDefault();
                } else if (!currentElementEditable) {
                    if (e.which === cKey && me.enableAnnotations) {
                        if (am) {
                            am.updateCopiedAnnotations();
                        }
                    } else if (e.which === vKey && me.enableAnnotations) {
                        if (am) {
                            am.pasteCopiedAnnotations();
                        }
                    }
                }

                // ctrl + p to print
                if (e.keyCode === 80) {
                    me.print();
                    return false;
                }
            }
            else if (e.altKey) {
                if (e.which === sKey && me.enableAnnotations) {
                    me.saveAnnotations();
                } else if (e.which === tKey && me.enableAnnotations) {
                    if (am) {
                        am.toggleAnnotations();
                        me.setToolMode(ToolMode.TextSelect);
                    }
                }
            }

        });

        var toolbarOffset = $('#control').outerHeight();
        var $viewerElement = $('#DocumentViewer');
        $viewerElement.bind('mousewheel', function(event, delta) {
            if (event.ctrlKey || event.altKey) {
                var sidePanelWidth = me.sidePanelVisible() ? $('#sidePanel').width() : 0;
                // zoom in and out with ctrl + scrollwheel
                if (delta < 0) {
                    me.docViewer.zoomToMouse(calcZoomLevelWithBounds(me.getZoomLevel() * 0.8), sidePanelWidth, toolbarOffset);
                } else {
                    me.docViewer.zoomToMouse(calcZoomLevelWithBounds(me.getZoomLevel() * 1.25), sidePanelWidth, toolbarOffset);
                }

                event.preventDefault();
                return;
            }

            var displayMode = me.docViewer.getDisplayModeManager().getDisplayMode();
            if (displayMode.isContinuous()) {
                // don't need to scroll between pages if we're in continuous mode
                return;
            }

            if (delta < 0) {
                // // scrolling down
                scrollPage(1);
            } else if (delta > 0) {
                // scrolling up
                scrollPage(-1);
            }
        });

        var scrollPage = function(change, pageKey, manualScroll) {
            var pageNum;
            var scrollPosition = $viewerElement.scrollTop();
            var scrollAmount = pageKey ? (window.innerHeight - $('#control').outerHeight()) : 30;

            if (change > 0) {
                // scroll down
                // +1 because IE is sometimes one pixel off
                var scrollBottom = scrollPosition + $viewerElement.height() + 1;
                if (scrollBottom >= $viewerElement[0].scrollHeight) {
                    pageNum = getChangedPageIndex(change);
                    if (pageNum >= 0) {
                        me.docViewer.setCurrentPage(pageNum + 1);
                    }
                } else if (manualScroll) {
                    $viewerElement.scrollTop(scrollPosition + scrollAmount);
                }
            } else {
                // scroll up
                if (Math.abs(scrollPosition) <= 1) {
                    pageNum = getChangedPageIndex(change);
                    if (pageNum >= 0) {
                        me.docViewer.setCurrentPage(pageNum + 1);
                        // scroll to the bottom of the new page
                        $viewerElement.scrollTop($viewerElement[0].scrollHeight);
                    }
                } else if (manualScroll) {
                    $viewerElement.scrollTop(scrollPosition - scrollAmount);
                }
            }
        };

        // Get the updated page index when increasing the row by "change", returns -1 if that row would be invalid
        var getChangedPageIndex = function(change) {
            var displayMode = me.docViewer.getDisplayModeManager().getDisplayMode();
            var cols = (displayMode.mode === exports.CoreControls.DisplayModes.Single) ? 1 : 2;

            var rowNum;
            if (displayMode.mode === exports.CoreControls.DisplayModes.CoverFacing) {
                rowNum = Math.floor(me.docViewer.getCurrentPage() / cols);
            } else {
                rowNum = Math.floor((me.docViewer.getCurrentPage() - 1) / cols);
            }

            rowNum += change;
            var pageIndex = rowNum * cols;

            if (displayMode.mode === exports.CoreControls.DisplayModes.CoverFacing) {
                if (pageIndex === 0) {
                    return 0;
                } else if (pageIndex < (me.docViewer.getPageCount() + 1)) {
                    return pageIndex - 1;
                } else {
                    return -1;
                }
            } else {
                if (pageIndex < me.docViewer.getPageCount()) {
                    return pageIndex;
                } else {
                    return -1;
                }
            }
        };

        var calcZoomLevelWithBounds = function(zoom) {
            if (zoom <= me.MIN_ZOOM) {
                zoom = me.MIN_ZOOM;
            } else if (zoom > me.MAX_ZOOM) {
                zoom = me.MAX_ZOOM;
            }
            return zoom;
        };

        var setZoomLevelWithBounds = function(zoom) {
            me.setZoomLevel(calcZoomLevelWithBounds(zoom));
        };

        this.$thumbnailViewContainer = $("#thumbnailView");
        this.$thumbnailViewContainer.scroll(function() {
            clearTimeout(me.thumbnailRenderTimeout);

            me.thumbnailRenderTimeout = setTimeout(function () {
                if(me.docViewer.getRenderingPipeline().hasPipeline('ReaderControl.updateThumbnails')){
                    me.docViewer.getRenderingPipeline().pushChange('ReaderControl.updateThumbnails', {
                        'type': 'updateThumbnails'
                    });
                }
            }, 80);
        });

        $('#lastPage').bind('click', function() {
            me.docViewer.displayLastPage();
        });

        $('#zoomBox').keyup(function(e) {
            if (e.which === 13) {
                var input = this.value;
                var number = parseInt(input, 10);
                if (isNaN(number)) {
                    alert("'" + input + "' is not a valid zoom level.");
                } else {
                    var zoom = number / 100.0;
                    setZoomLevelWithBounds(zoom);
                }
            }
        });

        $("#zoomOut").click(function() {
            var zoom = me.getZoomLevel();
            if (zoom > 1.0 && (zoom - 0.25) < 1.0) {
                zoom = 1.0;
            } else {
                zoom -= 0.25;
            }
            setZoomLevelWithBounds(zoom);
        });

        $("#zoomIn").click(function() {
            var zoom = me.getZoomLevel();
            if (zoom < 1.0 && (zoom + 0.25) > 1.0) {
                zoom = 1.0;
            } else {
                zoom += 0.25;
            }
            setZoomLevelWithBounds(zoom);
        });

        me.docViewer.on('zoomUpdated', function(e, zoom) {
            var zoomVal = Math.round(zoom * 100);

            $('#zoomBox').val(zoomVal + "%");
            if ($("#slider").slider("value") !== zoomVal) {
                $("#slider").slider({
                    value: zoomVal
                });
            }
            me.fireEvent('zoomChanged', [zoom]);
        });

        me.resize();

        $(window).resize(function(e) {
            if (e && e.target !== window) {
                return;
            }

            me.resize();
            if (me.sidePanelVisible() || me.notesPanelVisible()) {
                me.shiftSidePanel();
            }
            $("#thumbnailView").trigger('scroll');
        });

        $("#slider").slider({
            slide: function(event, ui) {
                var number = parseInt(ui.value, 10);
                if (isNaN(number)) {
                    alert("'" + number + "' is not a valid zoom level.");
                } else {
                    clearTimeout(me.zoomSliderTimeout);
                    me.zoomSliderTimeout = setTimeout(function() {
                        setZoomLevelWithBounds(number / 100.0);
                    }, 50);
                }
            }
        });

        $('#pageNumberBox').keyup(function(e) {
            // check for the enter key
            if (e.which === 13) {
                var input = this.value;
                var number = parseInt(input, 10);
                if (isNaN(number) || number > me.docViewer.getPageCount() || number <= 0) {
                    $('#pageNumberBox').val(me.docViewer.getCurrentPage());
                } else {
                    me.docViewer.setCurrentPage(number);
                    me.trackPageHistory(number);
                }
            }
        });

        me.docViewer.on('beforeDocumentLoaded', function() {
            // switch to single page for large documents to improve initial load time
            if (me.docViewer.getPageCount() >= 1000) {
                me.setLayoutMode(exports.CoreControls.DisplayModes.Single);
            }
        });

        me.docViewer.on('layoutChanged', function(e, changes){
            $('#totalPages').text('/' + me.docViewer.getPageCount());
            //me.clearSidePanelData();

            //me.applyPageChangesToThumbnails(changes);
            me.docViewer.getRenderingPipeline().pushChange('ReaderControl.updateThumbnails', {
                'type': 'applyPageChangesToThumbnails',
                'changes': changes
            });
            me.docViewer.getRenderingPipeline().pushChange('ReaderControl.updateThumbnails', {
                'type': 'updateThumbnails'
            });
            //me.updateThumbnailPages();
            //me.updateThumbnailView();
            //me.initBookmarkView();
        });

        me.docViewer.on('bookmarksUpdated', function(){
            me.updateBookmarkView();
        });

        me.docViewer.on('toolModeUpdated', function(e, newToolMode, oldToolMode) {
            me.fireEvent('toolModeChanged', [newToolMode, oldToolMode]);
        });

        me.docViewer.on('pageNumberUpdated', function(e, pageNumber) {
            $('#pageNumberBox').val(pageNumber);
            var pageIndex = pageNumber - 1;

            if (me.clickedThumb !== -1) {
                $("#thumbContainer" + me.clickedThumb).removeClass('ui-state-active');
            }

            var $selectedThumbContainer = $("#thumbContainer" + pageIndex);
            if (typeof me.thumbnailsElement !== 'undefined') {
                //thumbnail control viewport
                var viewportTop = me.thumbnailsElement.scrollTop;
                var viewportHeight = me.thumbnailsElement.offsetHeight;
                var viewportWidth = me.thumbnailsElement.offsetWidth - $.position.scrollbarWidth();
                var viewportBottom = viewportTop + viewportHeight;

                //absolute height of thumbnail containers (including border/padding/margin)
                var thumbContainerHeight = $selectedThumbContainer.outerHeight(true);
                var thumbContainerWidth = $selectedThumbContainer.outerWidth(true);
                var numColumns = Math.floor(viewportWidth / thumbContainerWidth);

                var top = Math.floor(pageIndex / numColumns) * thumbContainerHeight;
                var bottom = top + thumbContainerHeight;

                if (top < viewportTop) {
                    //thumbnail container is above the viewport
                    me.thumbnailsElement.scrollTop = top;
                } else if (bottom > viewportBottom) {
                    //thumbnail container is below the viewport
                    me.thumbnailsElement.scrollTop = top + thumbContainerHeight - viewportHeight;
                }
            }

            me.clickedThumb = pageIndex;
            $selectedThumbContainer.addClass('ui-state-active');
            me.fireEvent('pageChanged', [pageNumber]);
        });

        $("#layoutModeDropDown .content").on('click', 'li', function() {
            var layoutModeVal = $(this).data('layout-mode');
            if (layoutModeVal) {
                me.setLayoutMode(layoutModeVal);
            }
        });

        $("#rotateGroup").on('click', '[data-rotate]', function() {
            var action = $(this).data('rotate');
            if (action === "cc") {
                me.rotateClockwise();
            } else if (action === "ccw") {
                me.rotateCounterClockwise();
            }
        });

        var drop = new Drop({
            target: document.querySelector('#layoutModeDropDown .drop-target'),
            content: document.querySelector('#layoutModeDropDown .content'),
            position: 'bottom center',
            openOn: 'hover',
            classes: 'drop-theme-arrows-bounce layout-mode-dropdown-content',
            tetherOptions: {
                targetOffset: '10px 0'
            }
        });

        drop.once('open', function() {
            me.docViewer.trigger('displayModeUpdated');

            var content = $(this.drop);
            content.i18n();
            content.css('z-index', 50);
        });

        drop.on('close', function() {
            // workaround so that IE9 doesn't show the menu when hovering over the area where it should be hidden
            $(this.drop).css({
                'left': -1000,
                'top': -1000,
                'transform': ''
            });
        });

        $('#fitWidth').on('click', function() {
            me.docViewer.setFitMode(me.docViewer.FitMode.FitWidth);
        });

        $('#fitPage').on('click', function() {
            me.docViewer.setFitMode(me.docViewer.FitMode.FitPage);
        });

        $('#fullScreenButton').on('click', function() {
            var inFullScreenMode = document.fullscreenElement ||
                document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement;

            if (inFullScreenMode) {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
            } else {
                var docElm = document.documentElement;
                if (docElm.requestFullscreen) {
                    docElm.requestFullscreen();
                } else if (docElm.msRequestFullscreen) {
                    docElm.msRequestFullscreen();
                } else if (docElm.mozRequestFullScreen) {
                    docElm.mozRequestFullScreen();
                } else if (docElm.webkitRequestFullScreen) {
                    docElm.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
                    //Safari silently fails with the above, use workaround:
                    setTimeout(function() {
                        if (!document.webkitCurrentFullScreenElement) {
                            docElm.webkitRequestFullScreen();
                        }
                    },200);
                }
            }
        });

        me.docViewer.on('textSelected', function() {
            var allSelectedText = me.docViewer.getSelectedText();

            var $clipboard = $("#clipboard");
            var clipboard = $clipboard.get(0);

            clipboard.value = allSelectedText;
            if (allSelectedText.length > 0) {
                $clipboard.show();
                clipboard.focus();
                clipboard.selectionStart = 0;
                clipboard.setSelectionRange(0, clipboard.value.length);
            } else {
                $clipboard.hide();
            }

        });

        me.docViewer.on('displayModeUpdated', function() {
            var displayMode = me.docViewer.getDisplayModeManager().getDisplayMode();

            $('.layout-mode-dropdown-content #layoutModes [data-layout-mode]').removeClass('active');
            var sel = $('.layout-mode-dropdown-content #layoutModes [data-layout-mode=' + displayMode.mode + ']');
            sel.addClass('active');

            me.fireEvent('layoutModeChanged', [displayMode]);
        });

        me.docViewer.on('fitModeUpdated', function(e, fitMode) {
            var fitWidth = $('#fitWidth');
            var fitPage = $('#fitPage');

            if (fitMode === me.docViewer.FitMode.FitWidth) {
                fitWidth.addClass('active');
                fitPage.removeClass('active');
            } else if (fitMode === me.docViewer.FitMode.FitPage) {
                fitWidth.removeClass('active');
                fitPage.addClass('active');
            } else {
                // Zoom mode.
                fitWidth.removeClass('active');
                fitPage.removeClass('active');
            }

            me.fireEvent('fitModeChanged', [fitMode]);
        });

        me.docViewer.on('pageComplete', function(e, pageIndex) {
            me.fireEvent("pageCompleted", [pageIndex + 1]);
        });

        me.docViewer.on('beginRendering', function() {
            me.beginRendering();
        });

        me.docViewer.on('finishedRendering', function() {
            me.finishedRendering();
        });

        $(document).on('error', function (e,msg,userMessage) {
            me.onError(e, msg, userMessage);
        });
    };

    exports.ReaderControl.prototype = {
        MAX_ZOOM: 5,
        MIN_ZOOM: 0.05,
        // XOD uses 96 units per inch which is the same as window.print
        printFactor: 1,
        MIN_SIDE_PANEL_WIDTH: 195,
        DEFAULT_SIDE_PANEL_WIDTH: 200,

        /**
         * Initialize UI controls.
         * @ignore
         */
        initUI: function(){
            var me = this;

            $("#toggleSidePanel").on('click', function() {
                me.setShowSideWindow(!me.sidePanelVisible());
            });

            $('#toggleNotesPanel').on('click', function() {
                me.showNotesPanel(!me.notesPanelVisible());
            });

            $("#slider").slider({
                min: me.MIN_ZOOM * 100,
                max: me.MAX_ZOOM * 100,
                value: 100,
                animate: true
            });

            $('#optionsMenuList').hide().menu();

            context.init({
                compress: true
            });

            //extend
            $.widget( "ui.tabs", $.ui.tabs, {
                updateHeight: function($panels) {
                    //if panel index is provided, only update height that panel

//                    var $panels =  $("#tabs .ui-tabs-panel");
//                    if(typeof index !== 'undefined'){
//                        $panels = $($panels[index]);
//                    }
                    if (typeof $panels === 'undefined') {
                        $panels = $("#tabs .ui-tabs-panel");
                    }
                    var screenHeight = $('#ui-display').height();
                    var extraHeight = 0;
                    $('#tabs').children(':visible:not(.ui-tabs-panel)').each(function() {
                        extraHeight += $(this).outerHeight(true);
                    });

                    var extraBottomPadding = 4;
                    var panelHeight = screenHeight - extraHeight - extraBottomPadding;

                    $panels.each(function() {
                        var $this = $(this);

                        // need to have this before returning or the thumbcontainer will think it should get every thumbnail!
                        var $panel_stretch_elements = $this.find(".tab-panel-stretch").css('height', '100%');

                        // for some reason if the panel isn't visible and we run the rest of the code it takes a significant amount of time
                        // so just stop it here
                        if (!$this.is(":visible")) {
                            $this.css('height', window.innerHeight);
                            return;
                        }

                        var paddingH = $this.innerHeight() - $this.height();
                        $this.css('height', panelHeight - paddingH);

                        $panel_stretch_elements.each(function() {
                            var $this = $(this);
                            var fixedHeight = 0;
                            if (!$this.is(":visible")) {
                                //the panel is not yet loaded. don't do anything
                                return;
                            } else {
                                $this.css('visibility', 'visible');
                                //$this.css({opacity: 0.0, visibility: "visible"}).animate({opacity: 1.0});
                            }

                            $this.children('.tab-panel-item-fixed').each(function() {
                                fixedHeight += $(this).outerHeight(true);
                            });

                            var panelHeight = $this.innerHeight();
                            $this.children('.tab-panel-item-stretch').height(panelHeight - fixedHeight);
                        });
                    });
                    this._trigger('afterUpdateHeight');
                }
            });

            var $tabs = $("#tabs");
            $tabs.tabs({
                cache: true,
                //heightStyle: "fill",
                show: {
                    effect: "fade",
                    duration: 250
                },
                beforeActivate: function(event, ui) {
                    ui.oldTab.find('span').removeClass('active');
                    ui.newTab.find('span').addClass('active');
                },
                activate: function(event, ui) {
                    var $newPanel = $(ui.newPanel);
                    $tabs.tabs("updateHeight", $newPanel);

                    if ($newPanel.find('#searchView').length > 0) {
                        $newPanel.find('#fullSearchBox').focus();
                    }
                },
                afterUpdateHeight: function() {
                    if ($("#thumbnailView").is(':visible')) {
                        $("#thumbnailView").trigger('scroll');
                    }
                },
                create: function(event, ui) {
                    var initInterval = setInterval(function() {
                        var extraHeight = 0;
                        $('#tabs').children(':visible:not(.ui-tabs-panel)').each(function() {
                            extraHeight += $(this).outerHeight(true);
                        });
                        var tabVisible = $('#tabs').is(":visible");
                        if (tabVisible) {
                            $('#tabs').tabs("updateHeight", ui.panel);
                            clearInterval(initInterval);
                        }
                        //else continue interval

                    }, 500);
                }
            });

            if (!this.enableAnnotations || ReaderControl.config.ui.hideAnnotationPanel || ReaderControl.config.ui.hideSidePanel) {
                // hide notes panel button
                $('#toggleNotesPanel').parent().hide();
                $('#notesPanelWrapper').hide();
            }

            if (!Modernizr.fullscreen) {
                $("#fullScreenButton").hide();
            }

            if (ReaderControl.config.ui.hidePrint) {
                $('#printButton').hide();
            }

            if (!ReaderControl.config.ui.hideControlBar) {
                //$("#control").show();

                if (ReaderControl.config.ui.hideDisplayModes) {
                    $('#layoutModeDropDown').parent().hide();
                }

                if (ReaderControl.config.ui.hideTextSearch) {
                    $('#searchControl').parent().hide();
                }
                if (ReaderControl.config.ui.hideZoom) {
                    $('#zoomBox').parent().hide();
                }
            }

            var resizeHidden = false;
            // always initially hide the panel itself
            var $sidePanel = $('#sidePanel');
            $sidePanel.hide();
            $sidePanel.resizable({
                handles: 'e',
                resize: function() {
                    if (resizeHidden) {
                        $sidePanel.width(me.DEFAULT_SIDE_PANEL_WIDTH);
                        return;
                    }

                    me.shiftSidePanel(false);

                    if ($sidePanel.width() < me.MIN_SIDE_PANEL_WIDTH) {
                        me.setShowSideWindow(false, false);
                        $sidePanel.width(me.DEFAULT_SIDE_PANEL_WIDTH);
                        resizeHidden = true;
                    }
                },
                stop: function() {
                    me.docViewer.scrollViewUpdated();
                    resizeHidden = false;
                }
            });

            if (ReaderControl.config.ui.hideSidePanel) {
                // don't show the toggle button in this case
                document.getElementById('toggleSidePanel').style.visibility = 'hidden';
            }

            $.extend({
                alert: function (message, title) {
                    $(document.createElement('div'))
                        .html(message)
                        .dialog({
                            close: function() {
                                $(this).remove();
                            },
                            dialogClass: 'alert',
                            title: title,
                            modal: true,
                            resizable: false
                        });
                }
            });
        },

        onError: function (e, msg, userMessage) {
            var errorDialog = $('<div>').attr({
                'id': 'passwordDialog'
            });

            $('<label>').attr({
                'for': 'passwordInput'
            })
            .text(userMessage)
            .appendTo(errorDialog);

            errorDialog.dialog({
                modal: true,
                resizable: false,
                closeOnEscape: false,
                buttons: {
                    'OK': function () {
                        $(this).dialog('close');
                    },
                }
            });

        },

        setContextMenu: function(readonly) {
            var me = this;

            context.settings({
                click: false,
                right: false,
                minWidth: true
            });

            // create context menu
            var contextArray = [{ header: 'contextMenu.changeToolHeader' }];

            function addToolOptions(toolMap) {
                function addToolMode(toolName, toolMode) {
                    contextArray.push({
                        text: toolName,
                        action: function(e) {
                            e.preventDefault();
                            me.docViewer.setToolMode(toolMode);
                        }
                    });
                }

                for (var toolName in toolMap) {
                    addToolMode(toolName, toolMap[toolName]);
                }
            }

            addToolOptions({
                'contextMenu.pan': this.toolModeMap[ToolMode.Pan],
                'contextMenu.textSelect': this.toolModeMap[ToolMode.TextSelect]
            });

            if (this.enableAnnotations && !readonly) {
                addToolOptions({
                    'contextMenu.highlight': this.toolModeMap[ToolMode.AnnotationCreateTextHighlight],
                    'contextMenu.underline': this.toolModeMap[ToolMode.AnnotationCreateTextUnderline],
                    'contextMenu.freeHand': this.toolModeMap[ToolMode.AnnotationCreateFreeHand],
                    'contextMenu.freeText': this.toolModeMap[ToolMode.AnnotationCreateFreeText],
                    'contextMenu.arrow': this.toolModeMap['AnnotationCreateArrow'],
                    'contextMenu.note': this.toolModeMap[ToolMode.AnnotationCreateSticky],
                    'contextMenu.signature': this.toolModeMap['AnnotationCreateSignature']
                });
            }

            context.attach('#DocumentViewer', contextArray);
            context.getElement().i18n();
        },

        getViewerHeight: function() {
            var viewerHeight = window.innerHeight;
            var $controlToolbar = $("#control");
            if ($controlToolbar.is(':visible')) {
                viewerHeight -= $controlToolbar.outerHeight();
            }
            return viewerHeight;
        },
        resize: function() {
            // find the height of the internal page
            var scrollContainer = $(document.getElementById('DocumentViewer'));

            // change the height of the viewer element
            var viewerHeight = this.getViewerHeight();
            scrollContainer.height(viewerHeight);

            $('#tabs').tabs("updateHeight");

            var $sidePanel = $('#sidePanel');
            var availableWidth = window.innerWidth - $('#control .right-aligned').width() - 45;
            var maxWidth = Math.max(Math.min(availableWidth, window.innerWidth * 0.45), this.MIN_SIDE_PANEL_WIDTH);
            $sidePanel.resizable('option', 'maxWidth', maxWidth);

            // if we just resized to a smaller width then cap the current size of the panel
            if ($sidePanel.width() > maxWidth) {
                $sidePanel.width(maxWidth);
            }
        },

        onDocumentLoaded: function() {
            if(this.hasBeenClosed) {
                this.closeDocument();
                return;
            }
            exports.BaseReaderControl.prototype.onDocumentLoaded.call(this);
            var me = this;
            var loaded = me.eventsBound;

            me.clearSidePanelData();
            me.resize();

            if (!loaded && !ReaderControl.config.ui.hideSidePanel) {
                me.setShowSideWindow(this.userPreferences.showSideWindow, false);
            }

            me.initBookmarkView();
            me.initThumbnailView();
            me.initSearchView();
            me.setInterfaceDefaults();

            if (!loaded) {
                me.eventsBound = true;

                me.bindEvents();
                this.setContextMenu(this.readOnly);
            }

            this.pageHistory = [this.docViewer.getCurrentPage()];
            this.pageHistoryTracker = 0; // the current pageHistory index that the viewer is on.
            $('#forwardPage').removeClass('back-forward-enabled').addClass('back-forward-disabled');
            $('#backPage').removeClass('back-forward-enabled').addClass('back-forward-disabled');

            var origOnTrigger = exports.Actions.GoTo.prototype.onTriggered;
            exports.Actions.GoTo.prototype.onTriggered = function() {
                origOnTrigger.apply(this, arguments);
                me.trackPageHistory(this.dest.page);
            };

            var origNamedOnTrigger = exports.Actions.Named.prototype.onTriggered;
            exports.Actions.Named.prototype.onTriggered = function() {
                origNamedOnTrigger.apply(this, arguments);
                switch(this.action) {
                    case "NextPage":
                        me.trackPageHistory(me.docViewer.getCurrentPage() + 1);
                        break;
                    case "PrevPage":
                        me.trackPageHistory(me.docViewer.getCurrentPage() - 1);
                        break;
                    case "FirstPage":
                        me.trackPageHistory(1);
                        break;
                    case "LastPage":
                        me.trackPageHistory(me.docViewer.getPageCount());
                        break;
                }
            };

            var am = me.docViewer.getAnnotationManager();

            // only want to initialize the textareas as flexible when they become visible
            // as it can take a significant amount of time when done on the initial load
            am.on('annotationPopupStateChanged', function(e, annotation, $popupel, isOpen) {
                // chrome needs the settimeout because for some reason even though the textarea is visible
                // chrome doesn't see it that way and the flexible plugin won't be able to get properties on it yet\
                if (isOpen) {
                    setTimeout(function() {
                        // set it to be a flexible textarea, needs to be after the popup is appended to the page
                        var $textarea = $popupel.find('.popup-comment');
                        $textarea.flexible();
                    }, 0);
                }
            });

            am.on('annotationPopupCreated', function(e, annotation, $popupel, $textarea) {
                if (annotation.isReply()) {
                    // replies will be visible so initialize it
                    $textarea.flexible();
                }
            });

            am.on('annotationPopupDeleted', function(e, annotation, $popupel, $textarea) {
                $textarea.flexible('remove');
            });

            //make it easier to select annotations
            Annotations.ControlHandle.selectionAccuracyPadding = 3;
            Annotations.SelectionAlgorithm.canvasVisibilityPadding = 10;

            me.fireEvent('documentLoaded');
        },

        offlineReady: function() {
            var container = $('<div>').addClass('group');
            $('#control .right-aligned').prepend(container);

            $('<span>').attr({
                'id': 'offlineDownloadButton',
                'class': 'glyphicons download',
                'data-i18n': '[title]offline.downloadOfflineViewing'
            })
            .data('downloading', false)
            .appendTo(container)
            .i18n();

            $('<span>').attr({
                'id': 'toggleOfflineButton',
                'class': 'glyphicons cloud_minus',
                'data-i18n': '[title]offline.enableOffline'
            })
            .appendTo(container)
            .i18n();

            var doc = this.docViewer.getDocument();

            $('#offlineDownloadButton').click(function() {
                var $this = $(this);

                var isDownloading = $this.data("downloading");

                if (isDownloading) {
                    // allow cancelling while the download is happening
                    $this.data("downloading", false);
                    doc.cancelOfflineModeDownload();
                } else {
                    $this.data("downloading", true);

                    doc.storeOffline(function() {
                        $this.data("downloading", false);

                        $this.removeClass('circle_remove').addClass('download');

                        if (doc.isDownloaded()) {
                            $('#toggleOfflineButton').removeClass('disabled');
                        }

                        $this.attr('data-i18n', '[title]offline.downloadOfflineViewing').i18n();
                    });

                    // switch to the cancel icon while the download is going on
                    $this.removeClass('download').addClass('circle_remove');

                    $this.attr('data-i18n', '[title]offline.cancelDownload').i18n();
                }
            });

            $('#toggleOfflineButton').click(function() {
                if ($(this).hasClass('disabled')) {
                    return false;
                }

                var offlineEnabled = !doc.getOfflineModeEnabled();
                doc.setOfflineModeEnabled(offlineEnabled);

                toggleOfflineButtonText(offlineEnabled);
            });

            function toggleOfflineButtonText(offlineEnabled) {
                var button = $('#toggleOfflineButton');

                if (offlineEnabled) {
                    button.attr('data-i18n', '[title]offline.disableOffline').i18n();
                    button.addClass('active');
                } else {
                    button.attr('data-i18n', '[title]offline.enableOffline').i18n();
                    button.removeClass('active');
                }
            }

            if (doc.getOfflineModeEnabled()) {
                toggleOfflineButtonText(true);
            }

            if (!doc.isDownloaded()) {
                $('#toggleOfflineButton').addClass('disabled');
            }
        },

        updateAnnotations: function() {
            if (this.serverUrl === null) {
                console.warn("Server URL was not specified.");
                return;
            }

            var am = this.docViewer.getAnnotationManager();
            var saveAnnotUrl = this.serverUrl;
            if (this.docId !== null) {
                saveAnnotUrl += "?did=" + this.docId;
            }

            var command = am.getAnnotCommand();
            $.ajax({
                type: 'POST',
                url: saveAnnotUrl,
                data: {
                    'data': command
                },
                contentType: 'xml',
                success: function(data) {
                    /*jshint unused:false */
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    /*jshint unused:false */
                },
                dataType: 'xml'
            });
        },

        saveAnnotations: function() {
            //---------------------------
            // Save annotations
            //---------------------------
            // You'll need server-side communication here

            // 1) local saving
            //var xfdfString = this.docViewer.getAnnotationManager().exportAnnotations();
            //var uriContent = "data:text/xml," + encodeURIComponent(xfdfString);
            //newWindow = window.open(uriContent, 'XFDF Document');

            // 2) saving to server (simple)

            var me = this;

            return new Promise(function(resolve, reject) {
                var overlayMessage;

                me.exportAnnotations({
                    start: function() {
                        overlayMessage = $('#overlayMessage');
                        overlayMessage.attr('data-i18n', 'annotations.savingAnnotations');
                        overlayMessage.i18n();

                        overlayMessage.dialog({
                            dialogClass: 'no-title',
                            draggable: false,
                            resizable: false,
                            minHeight: 50,
                            minWidth: window.innerWidth / 3,
                            show: {
                                effect: 'fade',
                                duration: 400
                            },
                            hide: {
                                effect: 'fade',
                                duration: 1000
                            }
                        });
                    },
                    success: function(data) {
                        /*jshint unused:false */
                        //Annotations were sucessfully uploaded to server
                        overlayMessage.attr('data-i18n', 'annotations.saveSuccess');
                        overlayMessage.i18n();
                        resolve();
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        /*jshint unused:false */
                        console.warn("Failed to send annotations to server.");
                        overlayMessage.attr('data-i18n', 'annotations.saveError');
                        overlayMessage.i18n();
                        reject();
                    },
                    complete: function() {
                        setTimeout(function() {
                            overlayMessage.dialog('close');
                        }, 1000);
                    }
                });
            });

            // 3) saving to server (avoid conflicts)
            // NOT IMPLEMENTED
        },

        initBookmarkView: function(){
            this.updateBookmarkView();
        },

        updateBookmarkView: function() {
            var me = this;
            var doc = this.docViewer.getDocument();

            doc.getBookmarks().then(function(bookmarks){
                $('#bookmarkView').empty();
                //delegate event
                $("#bookmarkView")
                    .off("mouseenter").on("mouseenter", "div.bookmarkWrapper", function() {
                        $(me).addClass("ui-state-hover");
                    })
                    .off("mouseleave").on("mouseleave", "div.bookmarkWrapper", function() {
                        $(me).removeClass("ui-state-hover");
                    });
                displayBookmarks(bookmarks, $("#bookmarkView"), 0);
                $("#bookmarkView").treeview();
            }, function(err){
                console.warn('Error retrieving bookmarks', err);
            });

            function displayBookmarks(bookmarks, currentNode, id) {
                /*jshint loopfunc:true */
                for (var i = 0; i < bookmarks.length; i++) {
                    var node = document.createElement('span');
                    node.id = "bookmark" + id;
                    node.innerHTML = bookmarks[i].getName();

                    var newNode;
                    if (bookmarks[i].getChildren().length > 0) {
                        newNode = $("<li class=\"closed\"></li>");
                        node.className = "Node";
                    } else {
                        newNode = $("<li></li>");
                        node.className = "Leaf";
                    }
                    var otherNode = $(node);
                    var wrapper = $("<div class='bookmarkWrapper' id=bookmarkWrapper" + id + "></div>");
                    newNode.append(wrapper.append(otherNode));

                    wrapper.data('data', {
                        bookmark: bookmarks[i],
                        id: id++
                    })
                    .click(function() {
                        var bookmark = $(this).data("data").bookmark;
                        if(!bookmark.isValid()){
                            return;
                        }
                        if (me.clickedBookmark !== -1) {
                            $("#bookmarkWrapper" + me.clickedBookmark).removeClass('ui-state-active');
                            me.clickedBookmark = -1;
                        }
                        me.clickedBookmark = $(this).data("data").id;
                        $(this).addClass('ui-state-active');

                        me.docViewer.displayBookmark(bookmark);
                        me.trackPageHistory(bookmark.pageNumber);
                    });

                    currentNode.append(newNode);

                    if (bookmarks[i].getChildren().length > 0) {
                        var $list = $("<ul></ul>");
                        newNode.append($list);

                        id = displayBookmarks(bookmarks[i].getChildren(), $list, id);
                    }
                }

                if (i === 0) {
                    $("#bookmarkView").append('<div style="padding:5px 3px;" data-i18n="sidepanel.outlineTab.noOutlines"></div>');
                    $("#bookmarkView").i18n();
                }

                return id;
            }
        },

        initThumbnailView: function() {
            /*jshint loopfunc: true */
            var me = this;
            me.requestedThumbs = {};
            me.lastRequestedThumbs = [];
            me.thumbNailPages = 0;
            me.haveThumbs = {};

            //delegate event
            $("#thumbnailView")
                .off("mouseenter").on("mouseenter", "div.ui-widget-content", function() {
                    $(this).addClass("ui-state-hover");
                })
                .off("mouseleave").on("mouseleave", "div.ui-widget-content", function() {
                    $(this).removeClass("ui-state-hover");
                });

            me.docViewer.getRenderingPipeline().registerHandlers('ReaderControl.updateThumbnails', {
                'read': function(state){
                    var visibleThumbs = me.getVisibleThumbs();
                    /* jshint unused:false */
                    return {
                        visibleThumbs: visibleThumbs
                    };
                },
                'write': function(state, changes){
                    changes.forEach(function(change){
                        if(change['type'] === 'appendThumb'){
                            if(me.haveThumbs[change['pageIndex']]){
                                me.receivedThumb(change['thumb'], change['pageIndex']);
                            }
                        }else if(change['type'] === 'updateThumbnails'){
                            me.updateThumbnailPages();
                            me.updateThumbnailView(state.visibleThumbs);
                        }else if(change['type'] === 'applyPageChangesToThumbnails'){
                            me.applyPageChangesToThumbnails(change['changes']);
                        }
                    });
                }
            });

            this.thumbnailsElement = this.$thumbnailViewContainer.get(0);

            // add all thumbnails to DOM at once
            //this.updateThumbnailPages();
            this.docViewer.getRenderingPipeline().pushChange('ReaderControl.updateThumbnails', {
                'type': 'updateThumbnails'
            });
            //this.updateThumbnailView();
        },

        createThumbnailContainer: function(pageIndex){
            var me = this;
            var thumbContainer = document.createElement('div');
            thumbContainer.id = "thumbContainer" + pageIndex;
            thumbContainer.style.height = me.thumbContainerHeight + "px";
            thumbContainer.style.width = me.thumbContainerWidth + "px";
            thumbContainer.className = "thumbContainer ui-widget-content";

            var thumbDiv = document.createElement('div');
            thumbDiv.className = "thumbdiv";

            var span = document.createElement("span");
            span.style.height = "150px";
            span.style.display = "block";

            thumbDiv.appendChild(span);
            thumbContainer.appendChild(thumbDiv);

            var div = document.createElement('div');
            div.style.textAlign = "center";
            div.innerHTML = pageIndex + 1;
            thumbContainer.appendChild(div);

            thumbContainer.addEventListener('click', function() {
                var $this = $(this);

                if (me.clickedThumb !== -1) {
                    $("#thumbContainer" + me.clickedThumb).removeClass('ui-state-active');
                }
                me.clickedThumb = pageIndex;

                $this.addClass('ui-state-active');
                setTimeout(function() {
                    me.docViewer.setCurrentPage(pageIndex + 1);
                    me.trackPageHistory(pageIndex + 1);
                }, 0);
            });

            return thumbContainer;
        },
        invalidateThumbnail: function(pageIndex){
            if(pageIndex in this.requestedThumbs){
                this.cancelThumbnail(this.requestedThumbs[pageIndex]);
                delete this.requestedThumbs[pageIndex];
            }
            delete this.haveThumbs[pageIndex];
            $('#thumbContainer' + pageIndex).find('.thumb').remove();
        },
        applyPageChangesToThumbnails: function(changes){
            var me = this;
            changes.removed.forEach(function(pageNum){
                me.invalidateThumbnail(pageNum - 1);
            });
            changes.contentChanged.forEach(function(pageNum){
                me.invalidateThumbnail(pageNum - 1);
            });
            Object.keys(changes.moved).forEach(function(pageNum){
                me.invalidateThumbnail(pageNum - 1);
            });
        },
        updateThumbnailPages: function(){
            var docPages = this.docViewer.getPageCount();
            if(this.thumbNailPages < docPages){
                var frag = document.createDocumentFragment();
                for(var i = this.thumbNailPages; i < docPages; ++i){
                    frag.appendChild(this.createThumbnailContainer(i));
                }
                this.thumbnailsElement.appendChild(frag);
            }else if(this.thumbNailPages > docPages){
                var range = document.createRange();
                range.setStartBefore(this.thumbnailsElement.children[docPages]);
                range.setEndAfter(this.thumbnailsElement.children[this.thumbNailPages - 1]);
                range.deleteContents();
            }
            this.thumbNailPages = docPages;
        },

        initSearchView: function() {
            //delegate event
            $("#fullSearchView")
                .off("mouseenter").on("mouseenter", "div.searchResultLine", function() {
                    $(this).addClass("ui-state-hover");
                })
                .off("mouseleave").on("mouseleave", "div.searchResultLine", function() {
                    $(this).removeClass("ui-state-hover");
                });
        },

        beginRendering: function() {
            for (var page in this.requestedThumbs) {
                this.cancelThumbnail(this.requestedThumbs[page]);
            }
            var arrLength = this.lastRequestedThumbs.length;
            for (var i = 0; i < arrLength; ++i) {
                delete this.requestedThumbs[this.lastRequestedThumbs[i]];
            }
            this.requestedThumbs = {};
            this.lastRequestedThumbs = [];
            this.viewerRendering = true;
        },

        finishedRendering: function() {
            this.viewerRendering = false;
            //this.updateThumbnailView();
            if(this.docViewer.getRenderingPipeline().hasPipeline('ReaderControl.updateThumbnails')){
                this.docViewer.getRenderingPipeline().pushChange('ReaderControl.updateThumbnails', {
                    'type': 'updateThumbnails'
                });
            }
        },

        cancelThumbnail: function (requestId) {
            this.docViewer.getDocument().cancelLoadThumbnail(requestId);
        },

        updateThumbnailView: function (visibleThumbs) {
            var me = this;
            visibleThumbs = visibleThumbs || me.getVisibleThumbs();

            var thumbIndex;
            for (var i = 0; i < me.lastRequestedThumbs.length; i++) {
                thumbIndex = me.lastRequestedThumbs[i];
                if (me.requestedThumbs[thumbIndex] && !_.contains(visibleThumbs, thumbIndex)) {
                    // cancel thumbnail request if it is no longer visible
                    me.cancelThumbnail(me.requestedThumbs[thumbIndex]);
                    delete me.requestedThumbs[thumbIndex];
                }
            }

            me.lastRequestedThumbs = visibleThumbs;

            me.appendThumbs(visibleThumbs);


        },

        receivedThumb: function (thumb,pageIndex) {
            var me = this;
            delete me.requestedThumbs[pageIndex];

            var width, height, ratio;
            if (thumb.width > thumb.height) {
                ratio = thumb.width / 150;
                height = Math.round(thumb.height / ratio);
                width = 150;
            } else {
                ratio = thumb.height / 150;
                width = Math.round(thumb.width / ratio);  //Chrome has trouble displaying borders of non integer width canvases.
                height = 150;
            }
            thumb.style.width = width + 'px';
            thumb.style.height = height + 'px';

            thumb.className = "thumb";

            var $thumbContainer = $("#thumbContainer" + pageIndex);
            $thumbContainer.find(".thumbdiv").empty().append(thumb);

            // Vertical centering of canvas
            var pad = document.createElement('div');
            pad.className = "thumbPad";
            var pHeight = me.thumbContainerHeight - height;
            var size = parseInt(pHeight / 2.0, 10);

            pad.style.marginBottom = size + 'px';

            $thumbContainer.prepend(pad);
        },

        appendThumbs: function(visibleThumbs) {
            /*jshint loopfunc: true */
            var me = this;
            if (me.viewerRendering) {
                // we don't want to slow down the main viewer so wait until it is done
                return;
            }
            var doc = this.docViewer.getDocument();

            for (var i = 0; i < visibleThumbs.length; i++) {
                (function() {
                    var pageIndex = visibleThumbs[i];
                    if (me.requestedThumbs[pageIndex] || $('#thumbContainer' + pageIndex).find('.thumb').length > 0) {
                        return;
                    }
                    var requestId = doc.loadThumbnailAsync(pageIndex, function(thumb) {
                        me.haveThumbs[pageIndex] = true;
                        delete me.requestedThumbs[pageIndex];
                        me.docViewer.getRenderingPipeline().pushChange('ReaderControl.updateThumbnails', {
                            'type': 'appendThumb',
                            'thumb': thumb,
                            'pageIndex': pageIndex
                        });
                    });
                    me.requestedThumbs[pageIndex] = requestId;
                })();
            }
        },

        getVisibleThumbs: function () {
            if (this.docViewer.getDocument() === null) {
                return [];
            }

            var thumbIndexes = [];
            var thumbViewContainerHeight = this.thumbnailsElement.offsetHeight; //height of the current viewport
            var thumbViewContainerWidth = this.thumbnailsElement.offsetWidth - $.position.scrollbarWidth();
            var thumbItemHeight = this.$thumbnailViewContainer.find('#thumbContainer0').outerHeight(true); //outer height including margin
            var thumbItemWidth = this.$thumbnailViewContainer.find('#thumbContainer0').outerWidth(true);
            if (typeof this.thumbnailsElement === 'undefined') {
                return thumbIndexes;
            }
            var scrollTop = this.thumbnailsElement.scrollTop;
            var scrollBottom = scrollTop + thumbViewContainerHeight;

            var numColumns = Math.floor(thumbViewContainerWidth / thumbItemWidth);
            var isPartiallyObstructed = thumbViewContainerWidth > 0 && numColumns === 0;
            if (isPartiallyObstructed) {
                numColumns = 1;
            }
            var topVisiblePageIndex =  Math.floor((scrollTop / thumbItemHeight) * numColumns);
            var bottomVisiblePageIndex = Math.ceil((scrollBottom / thumbItemHeight) * numColumns) - 1;
            var totalVisiblePages = bottomVisiblePageIndex - topVisiblePageIndex  + 1;

            //keep around/pre-load surrounding thumbnails that are not immediately visible.
            var topVisibleWithCache = topVisiblePageIndex - totalVisiblePages;
            if (topVisibleWithCache < 0) {
                topVisibleWithCache = 0;
            }
            var nPages = this.docViewer.getPageCount();
            var bottomVisibleWithCache = bottomVisiblePageIndex + (totalVisiblePages);
            if (bottomVisibleWithCache >= nPages) {
                bottomVisibleWithCache = (nPages - 1);
            }

            for (var i = topVisibleWithCache; i <= bottomVisibleWithCache; i++ ) {
                thumbIndexes.push(i);
            }
            return thumbIndexes;
        },

        sidePanelVisible: function() {
            return !!this._showSideWindow;
        },

        shiftSidePanel: function(doAnimate) {
            if (typeof doAnimate === 'undefined') {
                doAnimate = true;
            }

            var scrollView = $('#DocumentViewer');
            var notesPanel = $('#notesPanelWrapper');
            // there is a distinction between the notes panel being shown or not shown and it being completely invisible
            // in this case we want to see if it's completely invisible because even when the panel isn't shown the bar still has a width
            var notesPanelInvisible = notesPanel.css('display') === 'none';

            var leftShift = this.sidePanelVisible() ? $('#sidePanel').width() : 0;
            var rightShift = notesPanelInvisible ? 0 : notesPanel.width();
            if (doAnimate) {
                $('.right-content').animate({
                    'margin-left': leftShift
                }, 150);

                scrollView.animate({
                    'margin-right': rightShift
                }, 150);
            } else {
                $('.right-content').css({
                    'margin-left': leftShift
                });
                scrollView.css({
                    'margin-right': rightShift
                });
            }
        },

        clearSidePanelData: function() {
            $('#fullSearchView').empty();
            $('#bookmarkView').empty();
            $('#thumbnailView').empty();
        },

        searchText: function(pattern, mode) {
            var me = this;
            if (pattern !== '') {
                mode = mode | me.docViewer.SearchMode.e_page_stop | me.docViewer.SearchMode.e_highlight;
                me.docViewer.textSearchInit(pattern, mode, false);
            }
        },

        fullTextSearch: function(pattern) {
            var pageResults = [];

            $('#fullSearchView').empty();

            var me = this;
            var searchResultLineId = 0;
            if (pattern !== '') {
                var mode = me.docViewer.SearchMode.e_page_stop | me.docViewer.SearchMode.e_ambient_string | me.docViewer.SearchMode.e_highlight;
                if ($('#wholeWordSearch').prop('checked')) {
                    mode = mode | me.docViewer.SearchMode.e_whole_word;
                }
                if ($('#caseSensitiveSearch').prop('checked')) {
                    mode = mode | me.docViewer.SearchMode.e_case_sensitive;
                }
                me.docViewer.textSearchInit(pattern, mode, true,
                    // onSearchCallback
                    function(result) {
                        if (result.resultCode === Text.ResultCode.e_found){
                            pageResults.push(result.page_num);
                            var $resultLine = $("<div id=\"searchResultLine" + searchResultLineId + "\">").addClass("searchResultLine ui-widget-content");
                            $('<span>').text(result.ambient_str.slice(0, result.result_str_start)).appendTo($resultLine);
                            $('<b>').text(result.ambient_str.slice(result.result_str_start, result.result_str_end)).appendTo($resultLine);
                            $('<span>').text(result.ambient_str.slice(result.result_str_end, result.ambient_str.length)).appendTo($resultLine);
                            $resultLine.data('data', {
                                result: result,
                                quads: result.quads,
                                searchResultLineId: searchResultLineId++
                            })
                            .click(function() {
                                if (me.clickedSearchResult !== -1) {
                                    $("#searchResultLine" + me.clickedSearchResult).removeClass('ui-state-active');
                                    me.clickedSearchResult = -1;
                                }
                                me.clickedSearchResult = $(this).data("data").searchResultLineId;

                                $(this).addClass('ui-state-active');

                                me.docViewer.displaySearchResult($(this).data("data").result);
                            }).appendTo($("#fullSearchView"));
                            if (searchResultLineId === 1) {
                                $resultLine.click();
                            }
                        } else if (result.resultCode === Text.ResultCode.e_done) {
                            // All pages searched.
                            var $fullSearchView = $("#fullSearchView");
                            if ($fullSearchView.is(':empty')) {
                                $fullSearchView.append("<div data-i18n='sidepanel.searchTab.noResults'></div>");
                                $fullSearchView.i18n();
                            }
                        }
                    });
            }
        },
        trackPageHistory: function(pageNumber){
            var me = this;
            if (me.pageHistoryTracker+1 < me.pageHistory.length) {
                // handle case where we have pages in the future due to back traversing.
                me.pageHistory = me.pageHistory.slice(0, me.pageHistoryTracker+1);
            }
            if (me.pageHistory[me.pageHistory.length-1] !== pageNumber) {
                me.pageHistoryTracker += 1;
                // add page to keep track of in history and update history buttons
                me.pageHistory.push(pageNumber);
                $('#backPage').addClass('back-forward-enabled').removeClass('back-forward-disabled');
                $('#forwardPage').addClass('back-forward-disabled').removeClass('back-forward-enabled');
            }
        },
        bindEvents: function() {
            var me = this;

            $('#backPage').on('click', function() {
                if(me.pageHistoryTracker > 0){
                    me.pageHistoryTracker -= 1;
                    me.docViewer.setCurrentPage(me.pageHistory[me.pageHistoryTracker]);
                    if(me.pageHistoryTracker > 0){
                        $('#backPage').addClass('back-forward-enabled').removeClass('back-forward-disabled');
                    } else {
                        $('#backPage').addClass('back-forward-disabled').removeClass('back-forward-enabled');
                    }
                    $('#forwardPage').addClass('back-forward-enabled').removeClass('back-forward-disabled');
                }
            });

            $('#forwardPage').on('click', function() {
                if(me.pageHistoryTracker < me.pageHistory.length-1){
                    me.pageHistoryTracker += 1;
                    me.docViewer.setCurrentPage(me.pageHistory[me.pageHistoryTracker]);
                    $('#backPage').addClass('back-forward-enabled').removeClass('back-forward-disabled');
                    if(me.pageHistoryTracker < me.pageHistory.length - 1){
                        $('#forwardPage').addClass('back-forward-enabled').removeClass('back-forward-disabled');
                    } else {
                        $('#forwardPage').addClass('back-forward-disabled').removeClass('back-forward-enabled');
                    }
                }
            });

            $('#prevPage').on('click', function() {
                var currentPage = me.docViewer.getCurrentPage();
                if (currentPage > 1) {
                    me.docViewer.setCurrentPage(currentPage - 1);
                    me.trackPageHistory(currentPage - 1);
                }
            });

            $('#nextPage').on('click', function() {
                var currentPage = me.docViewer.getCurrentPage();
                if (currentPage <= me.docViewer.getPageCount()) {
                    me.docViewer.setCurrentPage(currentPage + 1);
                    me.trackPageHistory(currentPage + 1);
                }
            });

            $('#searchButton').on('click', function() {
                me.searchText($('#searchBox').val());
            });

            $('#searchBox').on('keypress', function(e) {
                if (e.which === 13) { //Enter keycode
                    var searchTerm = $(this).val();

                    if (e.shiftKey) {
                        me.searchText(searchTerm, me.docViewer.SearchMode.e_search_up);
                    } else {
                        me.searchText(searchTerm);
                    }
                }
            });

            // Side Panel events
            $('#fullSearchButton').on('click', function() {
                me.fullTextSearch($('#fullSearchBox').val());
            });

            $('#fullSearchBox').on('keypress', function(e) {
                if(e.which === 13) { //Enter keycode
                    me.fullTextSearch($(this).val());
                }
            });

            me.bindPrintEvents();
        },

        getAllPageNumbers: function() {
            var pageList = [];
            for (var k = 1; k <= this.getPageCount(); k++) {
                pageList.push(k);
            }
            return pageList;
        },

        endPrintJob: function() {
            BaseReaderControl.prototype.endPrintJob.apply(this, arguments);
            $('#invalidPageSelectionError').hide();
            $('#printProgress').hide();
            $('.progressLabel').hide();
        },

        print: function() {
            var me = this;
            var printPageNumbers;

            function getPageNumbersToPrint() {
                if ($('#allPages').prop("checked")) {
                    return me.getAllPageNumbers();
                }
                var pageInput = $('#selectedPagesInput').val();
                return me.getPagesToPrint(pageInput);
            }

            function updatePrintButton(numPagesToPrint) {
                var printButton = $('#printStartButton');
                if (numPagesToPrint === 0) {
                    $('#invalidPageSelectionError').show();
                    printButton.prop('disabled', true);
                } else {
                    $('#invalidPageSelectionError').hide();
                    printButton.prop('disabled', false);
                }
            }

            function updatePrintDialog() {
                printPageNumbers = getPageNumbersToPrint();
                $('.numberPagesLabel').attr('data-i18n', 'print.totalPageCount')
                    .data('i18n-options', {
                        "count": printPageNumbers.length
                    })
                    .i18n();

                updatePrintButton(printPageNumbers.length);
            }

            $('#numberPagesToPrint').show();
            $('.numberPagesLabel').show();
            updatePrintDialog();

            var changeElementsAffectingNumPages = [$('#allPages'), $('#selectedPages')];
            for (var i = 0; i < changeElementsAffectingNumPages.length; i++) {
                changeElementsAffectingNumPages[i].on("change", updatePrintDialog);
            }
            var customPagesTextbox = $('#selectedPagesInput');
            var throttleUpdate = _.throttle(updatePrintDialog, 200, {leading: false});
            customPagesTextbox.on("keyup", throttleUpdate);
            customPagesTextbox.on("click", function() {
               $('#selectedPages').prop("checked", true);
               updatePrintDialog();
            });

            $('#printDialog').dialog({
              modal: true,
              resizable: false,
              show: {
                effect: "scale",
                duration: 100
              },
              hide: {
                effect: "scale",
                duration: 100
              },
              open: function() {
                  $('#allPages').prop("checked", true);
                  $('#selectedPagesInput').val("");
                  updatePrintDialog();
              },
              close: function() {
                me.endPrintJob();
              },
              buttons: [{
                id: "printStartButton",
                text: i18n.t("print.print"),
                click: function() {
                    me.startPrintJob(printPageNumbers, me.pageOrientations.Auto, false, function() {
                        window.print();
                    });
                }
              }, {
                text: i18n.t("print.done"),
                click: function() {
                  $(this).dialog("close");
                }
              }]
            });
        },

        printHandler: function() {
            var me = this;
            me.print();
        },


        bindPrintEvents: function() {
          var me = this;
          var printProgress = $('#printProgress');
          var progressLabel = $('.progressLabel');

          $('#printButton').on('click', function(){
            me.printHandler();
          });

          $(document).on('printProgressChanged', function(e, pageNum, totalPages) {
            printProgress.show().progressbar({
              'value': pageNum / totalPages * 100
            });
            progressLabel.show().attr('data-i18n', 'print.preparingPages')
              .data('i18n-options', {
                "current": pageNum,
                "total": totalPages
              })
              .i18n();
          });
        },

        getPageContainer: function(pageIndex) {
            return $('#DocumentViewer').find('#pageContainer' + pageIndex);
        },

        setInterfaceDefaults: function() {
            var pageIndex = this.docViewer.getCurrentPage() - 1;

            $('#totalPages').text('/' + this.docViewer.getPageCount());
            var zoom = Math.round(this.docViewer.getZoom() * 100);
            $('#zoomBox').val(zoom + "%");
            $('#slider').slider({
                value: zoom
            });
            $('#pageNumberBox').val(pageIndex + 1);

            this.docViewer.setToolMode(this.defaultToolMode);
            this.clickedThumb = pageIndex;
            $("#thumbContainer" + pageIndex).addClass('ui-state-active');
        },

        setVisibleTab: function(index) {
            $("#tabs").tabs("option", "active", index);
        },

        //==========================================================
        // Implementation of the WebViewer.js interface
        //==========================================================
        getShowSideWindow: function() {
            return !!this._showSideWindow;
        },

        setShowSideWindow: function(value, animate) {
            if (_.isUndefined(animate)) {
                animate = true;
            }

            exports.ControlUtils.userPreferences.setViewerPreference('showSideWindow', value);

            var $sidePanel = $('#sidePanel');
            var $toggleButton = $('#toggleSidePanel');
            var animation = animate ?  {effect: "slide", duration: 150} : undefined;

            if (value) {
                $sidePanel.show(animation);
                $toggleButton.addClass('customicons collapse_left').removeClass('collapse');
                $('#ui-display').addClass('left-panel-visible');
            } else {
                $sidePanel.hide(animation);
                $toggleButton.addClass('collapse').removeClass('customicons collapse_left');
                $('#ui-display').removeClass('left-panel-visible');
            }
            this._showSideWindow = value;
            this.shiftSidePanel(animate);
            var me = this;
            var timeout = animate ? 250 : 0;
            setTimeout(function() {
                me.docViewer.scrollViewUpdated();
                me.fireEvent('sidePanelVisibilityChanged', value);
            }, timeout);
        },

        notesPanelVisible: function() {
            return !!this._showNotesPanel;
        },

        showNotesPanel: function(value) {
            var me = this;
            this._showNotesPanel = value;
            var $notesPanelWrapper = $('#notesPanelWrapper');
            var $notesPanel = $notesPanelWrapper.find('#notesPanel');
            var $toggleNotesButton = $('#toggleNotesPanel');
            if (value) {
                $notesPanelWrapper.removeClass('hidden');
                $notesPanel.removeClass('hidden');
                $toggleNotesButton.addClass('active');
                this.fireEvent('notesPanelBecomingVisible');
            } else {
                $notesPanelWrapper.addClass('hidden');
                $notesPanel.addClass('hidden');
                $toggleNotesButton.removeClass('active');
            }

            this.shiftSidePanel();
            setTimeout(function(){
                me.docViewer.scrollViewUpdated();
                me.fireEvent('notesPanelVisibilityChanged', value);
            }, 250);
        },

        setToolbarVisibility: function(isVisible) {
            if (isVisible) {
                $("#control").show();
            } else {
                $("#control").hide();
            }
            this.resize();
        },

        rotateClockwise: function(pageNumber) {
            this.docViewer.rotateClockwise(pageNumber);
        },

        rotateCounterClockwise: function(pageNumber) {
            this.docViewer.rotateCounterClockwise(pageNumber);
        },

        fitWidth: function() {
            this.docViewer.setFitMode(this.docViewer.FitMode.FitWidth);
        },

        fitPage: function() {
            this.docViewer.setFitMode(this.docViewer.FitMode.FitPage);
        },

        fitZoom: function() {
            this.docViewer.setFitMode(this.docViewer.FitMode.Zoom);
        },

        getFitMode: function() {
            return this.docViewer.getFitMode();
        },

        setFitMode: function(fitMode) {
            this.docViewer.setFitMode(fitMode);
        },

        getLayoutMode: function() {
            return this.docViewer.getDisplayModeManager().getDisplayMode().mode;
        },

        setLayoutMode: function(layoutMode) {
            var newDisplayMode = new exports.CoreControls.DisplayMode(this.docViewer, layoutMode);
            this.docViewer.getDisplayModeManager().setDisplayMode(newDisplayMode);
        },


        closeDocument: function() {
            exports.BaseReaderControl.prototype.closeDocument.call(this);
            // if doc is null, we aren't open yet so don't cancel thumbnail requests
            if(this.docViewer.getDocument()){
                for (var page in this.requestedThumbs) {
                    this.cancelThumbnail(this.requestedThumbs[page]);
                }
            }
            this.clearSidePanelData();
        },

        /**
         *Sets the search mode.
         *All sub-sequent text searches will use the search mode that was set.
         */
        SetSearchModes: function(searchModes) {
            if (!searchModes) {
                return;
            }
            if (searchModes.CaseSensitive) {
                $('#caseSensitiveSearch').prop('checked', true);
            }
            if (searchModes.WholeWord) {
                $('#wholeWordSearch').prop('checked', true);
            }
        }
    };

    exports.ReaderControl.prototype = $.extend({}, exports.BaseReaderControl.prototype, exports.ReaderControl.prototype);



/* ReaderControl event doclet */

/**
 * A global DOM event that is triggered when the viewer has been loaded and ReaderControl is constructed.
 * @name ReaderControl#viewerLoaded
 * @event
 * @param e a JavaScript event object
 */

/**
 * A global DOM event that is triggered when a document has been loaded.
 * @name ReaderControl#documentLoaded
 * @event
 * @param e a JavaScript event object
 */

/** A global DOM event that is triggered when the document view's zoom level has changed.
 * @name ReaderControl#zoomChanged
 * @event
 * @param e a JavaScript event object
 * @param {number} zoom the new zoom level value
 */



/** A global DOM event that is triggered when the current page number has changed.
 * @name ReaderControl#pageChanged
 * @event
 * @param e a JavaScript event object
 * @param {integer} pageNumber the new 1-based page number
 */

/** A global DOM event that is triggered when the display mode has changed
 * @name ReaderControl#layoutModeChanged
 * @event
 * @param e a JavaScript event object
 * @param {object} toolMode the new display mode
 */

/** A global DOM event that is triggered when the fit mode has changed
 * @name ReaderControl#fitModeChanged
 * @event
 * @param e a JavaScript event object
 * @param {object} toolMode the new fit mode
 */

/** A global DOM event that is triggered when a page had finished rendering.
 * @name ReaderControl#pageCompleted
 * @event
 * @param e a JavaScript event object
 * @param {integer} pageNumber the 1-based page number that finished rendering
 */
})(window);

$(function() {
    window.ControlUtils.initialize(function() {
        $('#ui-display').children().hide();
        $('#unsupportedErrorMessage').show();
    });
});
