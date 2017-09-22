/* global $, stringify, CodeMirror, document, io */

const $inputObjectId = $('#input-object-id');

const $indicatorObjectId = $('#indicator-object-id');
const $indicatorViewId = $('#indicator-view-id');

const $buttonSaveObject = $('#button-save-object');
const $buttonDelObject = $('#button-del-object');
const $buttonConfirmDelObject = $('#button-confirm-del-object');

const $inputViewId = $('#input-view-id');
const $inputViewFilter = $('#input-view-filter');

const $buttonSaveView = $('#button-save-view');
const $buttonDelView = $('#button-del-view');
const $buttonConfirmDelView = $('#button-confirm-del-view');

const $indicatorObjectSaved = $('#indicator-object-saved');
const $indicatorViewSaved = $('#indicator-view-saved');

const $objectRev = $('#object-rev');
const $objectRevServer = $('#object-rev-server');
const $objectRevEditor = $('#object-rev-editor');

const $objectConflictId = $('#object-conflict-id');
const $buttonSaveObjectForce = $('#button-save-object-force');
const $buttonReloadObject = $('#button-reload-object');

const $dialogConfirmConflict = $('#dialog-confirm-conflict');
const $dialogConfirmDelObject = $('#dialog-confirm-del-object');
const $dialogConfirmDelView = $('#dialog-confirm-del-view');

const $jsonlint = $('#jsonlint');

let objectIds = [];
let currentObjectId;
let currentViewId;

const cmMap = CodeMirror.fromTextArea(document.querySelector('#input-view-map'), {
    autoCloseBrackets: true,
    lineNumbers: true,
    mode: 'javascript',
    foldGutter: true,
    gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter']
});

const cmReduce = CodeMirror.fromTextArea(document.querySelector('#input-view-reduce'), {
    autoCloseBrackets: true,
    lineNumbers: true,
    mode: 'javascript',
    foldGutter: true,
    gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter']
});

const cmResult = CodeMirror.fromTextArea(document.querySelector('#input-view-result'), {
    autoCloseBrackets: true,
    lineNumbers: true,
    mode: 'javascript',
    readOnly: 'nocursor',
    foldGutter: true,
    gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter']
});

const cmObject = CodeMirror.fromTextArea(document.querySelector('#input-object'), {
    autoCloseBrackets: true,
    lineNumbers: true,
    mode: 'javascript',
    foldGutter: true,
    gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter']
});

$('a[aria-controls="views"][data-toggle="tab"]').on('shown.bs.tab', () => {
    cmMap.refresh();
    cmReduce.refresh();
    cmResult.refresh();
});

const socket = io.connect();

socket.on('objectIds', data => {
    objectIds = data;

    if ($inputObjectId.typeahead) {
        $inputObjectId.typeahead('destroy');
    }

    $inputObjectId.typeahead({
        source: objectIds,
        minLength: 0,
        items: 12,
        afterSelect: () => {
            getObject($inputObjectId.val());
        }
    });

    $inputObjectId.keyup(e => {
        const id = $inputObjectId.val();
        if (id !== currentObjectId) {
            $inputObjectId.css({color: 'grey'});
        }
        if (e.which === 13) {
            if (id !== currentObjectId || !$indicatorObjectSaved.is(':visible')) {
                getObject(id);
            }
        }
    });

    $inputObjectId.blur(() => {
        const id = $inputObjectId.val();
        if (currentObjectId !== id) {
            getObject(id);
        }
    });
});

socket.on('viewIds', viewIds => {
    if ($inputViewId.typeahead) {
        $inputViewId.typeahead('destroy');
    }

    $inputViewId.typeahead({
        source: viewIds,
        minLength: 0,
        items: 12,
        afterSelect: () => {
            getView($inputViewId.val());
        }});

    $inputViewId.keyup(e => {
        const id = $inputViewId.val();
        if (id !== currentViewId) {
            $inputViewId.css({color: 'grey'});
        }
        if (e.which === 13) {
            if (id !== currentViewId || !$indicatorViewSaved.is(':visible')) {
                getView(id);
            }
        }
    });

    $inputViewId.blur(() => {
        if (currentViewId !== $inputViewId.val()) {
            getView($inputViewId.val(), true);
        }
    });
});

socket.on('updateView', id => {
    if (id === currentViewId) {
        getView(id);
    }
});

function clearObject() {
    $objectRev.html('');
    cmObject.setValue('');
    $buttonDelObject.attr('disabled', true);
    $buttonSaveObject.attr('disabled', true);
    $indicatorObjectSaved.hide();
    jsonLint();
}

function clearView() {
    // $viewsRev.html('');
    cmMap.setValue('');
    cmReduce.setValue('');
    cmResult.setValue('');
    $inputViewFilter.val('');
    $buttonDelView.attr('disabled', true);
    $buttonSaveView.attr('disabled', true);
    $indicatorViewSaved.hide();
}

function getObject(id) {
    currentObjectId = id;
    $inputObjectId.css({color: 'black'});

    socket.emit('getObject', id, data => {
        if (data) {
            $objectRev.html(data._rev);
            cmObject.setValue(stringify(data));
            $buttonDelObject.removeAttr('disabled');
            $indicatorObjectSaved.show();
        } else {
            clearObject();
        }

        jsonLint();
    });
}

function getView(id) {
    currentViewId = id;

    $inputViewId.css({color: 'black'});

    socket.emit('getView', id, data => {
        console.log('getView', id, data);
        if (data.query) {
            cmMap.setValue(data.query.map || '');
            cmReduce.setValue(data.query.reduce || '');
            $inputViewFilter.val(data.query.filter || '#');
            // $viewsRev.html(data.rev);
            const obj = {};
            if (data.view.error) {
                obj.error = data.view.error;
                obj._id = id;
            } else {
                obj.result = data.view.result;
                obj.length = data.view.result.length;
                obj._id = id;
                obj._rev = data.view._rev;
            }

            /* TODO this is really dirty... find a better way to create object links!
            const linkMap = {};
            if (obj.result && obj.result.length > 0) {
                obj.result.forEach(r => {
                    if (typeof r === 'string' && objectIds.indexOf(r) !== -1) {
                        linkMap[JSON.stringify($('<div>').text(r).html())] = '<a class="object-link" data-object=' + JSON.stringify(r) + '>' + $('<div>').text(r).html() + '</a>';
                    }
                });
            }

            let str = $('<div>').text(stringify(obj)).html();
            Object.keys(linkMap).forEach(l => {
                str = str.replace(l, linkMap[l]);
            });
            */

            cmResult.setValue(stringify(obj));
            $('.object-link').click(function () {
                console.log($(this).data('object'));
                const id = JSON.parse('"' + $(this).data('object') + '"');
                console.log(id);
                $inputObjectId.val(id);
                getObject(id);
                $('#tablist a[href="#tab-objects"]').tab('show');
            });
            $indicatorViewSaved.show();
            $buttonDelView.removeAttr('disabled');
            $buttonSaveView.removeAttr('disabled');
        } else {
            clearView();
            if (id) {
                $buttonSaveView.removeAttr('disabled');
            }
        }
    });
}

function jsonLint() {
    try {
        JSON.parse(cmObject.getValue());
        $jsonlint.html('<span style="color: green;">✔</span>');
        $buttonSaveObject.removeAttr('disabled');
    } catch (err) {
        $jsonlint.html('<span style="color: red;">❌</span>');
        $buttonSaveObject.attr('disabled', true);
    }
}

$buttonSaveObject.attr('disabled', true);
$buttonDelObject.attr('disabled', true);
$indicatorObjectSaved.hide();

$buttonSaveView.attr('disabled', true);
$buttonDelView.attr('disabled', true);
$indicatorViewSaved.hide();

cmObject.on('change', () => {
    $indicatorObjectSaved.hide();
    jsonLint();
});

$inputViewFilter.keyup(() => {
    $indicatorViewSaved.hide();
});

cmMap.on('change', () => {
    $indicatorViewSaved.hide();
});

cmReduce.on('change', () => {
    $indicatorViewSaved.hide();
});

$buttonSaveObject.click(() => {
    const data = JSON.parse(cmObject.getValue());
    data._rev = parseInt($objectRev.html(), 10);
    socket.emit('set', $inputObjectId.val(), data, res => {
        if (res === 'ok') {
            $indicatorObjectSaved.show();
            getObject($inputObjectId.val());
        } else if (res.startsWith('rev mismatch')) {
            const [, revServer] = res.match(/rev mismatch ([0-9]+)/);
            $objectRevServer.html(revServer);
            $objectRevEditor.html($objectRev.html());
            $objectConflictId.html($inputObjectId.val());
            $dialogConfirmConflict.modal('show');
        }
    });
});

$buttonSaveObjectForce.click(() => {
    const data = JSON.parse(cmObject.getValue());
    data._rev = null;
    socket.emit('set', $inputObjectId.val(), data, () => {
        $indicatorObjectSaved.show();
        getObject($inputObjectId.val());
    });
    $dialogConfirmConflict.modal('hide');
});

$buttonReloadObject.click(() => {
    getObject($inputObjectId.val());
    $dialogConfirmConflict.modal('hide');
});

$buttonDelObject.click(() => {
    $indicatorObjectId.html($inputObjectId.val());
    $dialogConfirmDelObject.modal('show');
});

$buttonConfirmDelObject.click(() => {
    socket.emit('del', $inputObjectId.val(), () => {
        $inputObjectId.val('');
        clearObject();
    });
    $dialogConfirmDelObject.modal('hide');
});

$buttonSaveView.click(() => {
    socket.emit('query', $inputViewId.val(), {
        map: cmMap.getValue(),
        reduce: cmReduce.getValue(),
        filter: $inputViewFilter.val()
    }, () => {
        $indicatorViewSaved.show();
    });
});

$buttonDelView.click(() => {
    $indicatorViewId.html($inputViewId.val());
    $dialogConfirmDelView.modal('show');
});

$buttonConfirmDelView.click(() => {
    socket.emit('query', $inputViewId.val(), '', () => {
        $inputViewId.val('');
        clearView();
    });
    $dialogConfirmDelView.modal('hide');
});

$('.panel-top').resizable({
    handleSelector: '.splitter-horizontal',
    resizeWidth: false
});

$('.panel-left').resizable({
    handleSelector: '.splitter-vertical',
    resizeHeight: false
});
