/* global $, stringify */

const $inputObjectId = $('#input-object-id');
const $inputObject = $('#input-object');


const $indicatorObjectId = $('#indicator-object-id');
const $indicatorViewId = $('#indicator-view-id');

const $buttonSaveObject = $('#button-save-object');
const $buttonDelObject = $('#button-del-object');
const $buttonConfirmDelObject = $('#button-confirm-del-object');

const $inputViewId = $('#input-view-id');
const $inputViewResult = $('#input-view-result');
const $inputViewFilter = $('#input-view-filter');

const $buttonSaveView = $('#button-save-view');
const $buttonDelView = $('#button-del-view');
const $buttonConfirmDelView = $('#button-confirm-del-view');

const $indicatorObjectSaved = $('#indicator-object-saved');

const $viewsRev = $('#views-rev');
const $objectRev = $('#object-rev');
const $objectRevServer = $('#object-rev-server');
const $objectRevEditor = $('#object-rev-editor');

const $dialogConfirmConflict = $('#dialog-confirm-conflict');
const $dialogConfirmDelObject = $('#dialog-confirm-del-object');
const $dialogConfirmDelView = $('#dialog-confirm-del-view');


const $jsonlint = $('#jsonlint');


let objectIds = [];
let currentObjectId;
let currentViewId;


const cm = CodeMirror.fromTextArea(document.querySelector('#input-view-condition'), {
    lineNumbers: false
});

const socket = io.connect();


socket.on('objectIds', function (data) {
    objectIds = data;

    if ($inputObjectId.typeahead) {
        $inputObjectId.typeahead('destroy');
    }

    $inputObjectId.typeahead({source: objectIds, afterSelect: () => {
        getObject($inputObjectId.val());
    }});

    $inputObjectId.keyup(e => {
        $inputObjectId.css({color: 'grey'});
        if (e.which === 13) {
            const id = $inputObjectId.val()
            getObject(id);
        }
    });

    $inputObjectId.blur(() => {
        const id = $inputObjectId.val();
        if (currentObjectId !== id) {
            getObject(id);
        }
    });
});

socket.on('viewIds', function (viewIds) {
    if ($inputViewId.typeahead) {
        $inputViewId.typeahead('destroy');
    }

    $inputViewId.typeahead({source: viewIds, afterSelect: () => {
        getView($inputViewId.val());
    }});

    $inputViewId.keyup(e => {
        $inputViewId.css({color: 'grey'});
        if (e.which === 13) {
            getView($inputViewId.val());
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
    $inputObject.val('');
    $buttonDelObject.attr('disabled', true);
    $buttonSaveObject.attr('disabled', true);
    $indicatorObjectSaved.hide();
    jsonLint();
}

function clearView() {
    $viewsRev.html('');
    cm.setValue('');
    $inputViewFilter.val('');
    $inputViewResult.html('');
    //$buttonDelView.attr('disabled', true);
    //$buttonSaveView.attr('disabled', true);
}

function getObject(id, nofocus) {
    currentObjectId = id;
    $inputObjectId.css({color: 'black'});

    socket.emit('getObject', id, data => {
        if (data) {
            $objectRev.html(data._rev);
            $inputObject.val(stringify(data));
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
        console.log(data);
        if (data) {
            cm.setValue(data.condition);
            $inputViewFilter.val(data.filter || '#');
            $viewsRev.html(data.rev);
            $inputViewResult.html(data.serror || data.error || stringify(data.res));
            $buttonDelView.removeAttr('disabled');
            $buttonSaveView.removeAttr('disabled');
        } else {
            clearView();
        }
    });
}

function jsonLint() {
    try {
        JSON.parse($inputObject.val());
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

$inputObject.keyup(() => {
    $indicatorObjectSaved.hide();
    jsonLint();
});


$buttonSaveObject.click(() => {
    const data = JSON.parse($inputObject.val());
    data._rev = parseInt($objectRev.val(), 10);
    socket.emit('set', $inputObjectId.val(), data, res => {
        if (res === 'ok') {
            $indicatorObjectSaved.show();
            getObject($inputObjectId.val());

        } else if (data.startsWith('rev mismatch')) {
            const [, revServer] = data.match(/rev mismatch ([0-9]+)/);
            $revServer.html(revServer);
            $revEdited.html($rev.html());
            $('.topic').html($inputObjectId.val());
            $confirmConflict.modal('show');
        }
    });
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
        condition: cm.getValue(),
        filter: $inputViewFilter.val()
    }, () => {

    });
});

$buttonDelView.click(() => {
    $indicatorViewId.html($inputViewId.val());
    $dialogConfirmDelView.modal('show');
});

$buttonDelView.click(() => {
    socket.emit('query', $inputViewId.val(), '', () => {
        $inputViewId.val('');
        clearView();
    });
    $dialogConfirmDelView.modal('hide');
});

