/* global $, stringify */

const $id = $('#topic');
const $rev = $('#rev');
const $save = $('#save');
const $confirm = $('#confirm');
const $json = $('#json');
const $jsonlint = $('#jsonlint');

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
        if (body !== '') {
            const obj = JSON.parse(body);
            $rev.html(obj._rev);
            $confirm.show();
            delete obj._rev;
            $json.val(stringify(obj));
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

$json.keyup(() => {
    $confirm.hide();
    jsonLint();
});

$save.click(() => {
    const obj = JSON.parse($json.val());
    obj._rev = parseInt($rev.html(), 10);
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
                // Todo show popup if data changed while editing
                // const match = data.match(/rev mismatch ([0-9]+)/);
            }
        }
    });
});

$id.focus();
