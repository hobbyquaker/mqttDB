/* global $, stringify */

const $id = $('#topic');
const $rev = $('#rev');
const $revEdited = $('#revEdited');
const $revServer = $('#revServer');
const $save = $('#save');
const $delete = $('#delete');
const $confirm = $('#confirm');
const $json = $('#json');
const $jsonlint = $('#jsonlint');
const $confirmDel = $('#confirm-del');
const $deleteReally = $('#delete-really');
const $saveForce = $('#save-force');
const $reload = $('#reload');
const $confirmConflict = $('#confirm-conflict');

let currentId;

$confirm.hide();

function idEvents() {
    $id.keyup(e => {
        $id.css({color: 'grey'});
        if (e.which === 13) {
            getObject($id.val());
        }
    });
    $id.blur(() => {
        getObject($id.val(), true);
    });
}

function getIds() {
    $.get('/ids', body => {
        if ($id.typeahead) {
            $id.typeahead('destroy');
            idEvents();
        }
        $id.typeahead({source: JSON.parse(body), afterSelect: () => {
            getObject($id.val());
        }});
    });
}

idEvents();

function getObject(id, nofocus) {
    $confirm.hide();
    $rev.html('');
    if (currentId !== id) {
        $json.val('');
        jsonLint();
    }
    currentId = id;
    $.get('/object', {id}, body => {
        $json.val('');
        jsonLint();
        if (body === '') {
            $delete.attr('disabled', true);
        } else {
            const obj = JSON.parse(body);
            $rev.html(obj._rev);
            $confirm.show();
            $delete.removeAttr('disabled');
            delete obj._rev;
            $json.val(stringify(obj));
            jsonLint();
        }
        if (!nofocus) {
            $id.blur();
            $id.focus();
        }
        $id.css({color: 'black'});
    });
}

getIds();

function jsonLint() {
    try {
        JSON.parse($json.val());
        $jsonlint.html('<span style="color: green;">✔</span>');
        $save.removeAttr('disabled');
    } catch (err) {
        $jsonlint.html('<span style="">❌</span>');
        $save.attr('disabled', true);
    }
}

function save(force) {
    const obj = JSON.parse($json.val());
    if (force) {
        obj._rev = parseInt($revServer.html(), 10);
        $confirmConflict.modal('hide');
    } else {
        obj._rev = parseInt($rev.html(), 10);
    }
    $.ajax({
        url: '/object',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({id: $id.val(), obj}),
        success: data => {
            if (data === 'ok') {
                $confirm.show();
                getObject($id.val());
                getIds();
            } else if (data.startsWith('rev mismatch')) {
                const [, revServer] = data.match(/rev mismatch ([0-9]+)/);
                $revServer.html(revServer);
                $revEdited.html($rev.html());
                $('.topic').html($id.val());
                $confirmConflict.modal('show');
            }
        }
    });
}

$confirmConflict.modal({
    backdrop: 'static',
    show: false
});

$confirmDel.modal({
    backdrop: 'static',
    show: false
});

$json.keyup(() => {
    $confirm.hide();
    jsonLint();
});

$save.click(() => {
    save();
});

$saveForce.click(() => {
    save(true);
});

$reload.click(() => {
    $confirmConflict.modal('hide');
    getObject($id.val(), true);
});

$delete.click(() => {
    $('.topic').html($id.val());
    $confirmDel.modal('show');
});

$deleteReally.click(() => {
    $.get('/delete', {id: $id.val()}, () => {
        $confirm.hide();
        $json.val('');
        $id.val('');
        $rev.html('');
        $save.attr('disabled', true);
        $delete.attr('disabled', true);
        jsonLint();
        getIds();
        $confirmDel.modal('hide');
        $id.focus();
    });
});

$save.attr('disabled', true);
$delete.attr('disabled', true);

$id.focus();
