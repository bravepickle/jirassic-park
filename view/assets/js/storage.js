function saveInput() {
    let data = {
        uri: uriBaseEl.value,
        user: userEl.value,
        token: tokenEl.value,
        filter: filterEl.value,
        hideParents: hideParentsBtn.checked,
        hideTests: hideTestsBtn.checked,
        openImage: openImgEl.checked,
        shortIssue: shortIssueEl.checked,
        disableIcons: disableIconsEl.checked,
        extraParams: extraParamsEl.value,
        showMatched: showMatchedEl.checked,
    };

    localStorage.setItem('input', JSON.stringify(data));

    notify('Form input is stored!')
}

function restoreInput(silent) {
    let input = localStorage.getItem('input');

    if (!input) {
        if (typeof silent === 'undefined' || !silent) {
            notify('Storage is empty');
        }

        return;
    }

    input = JSON.parse(input)

    uriBaseEl.value = input.uri
    userEl.value = input.user
    tokenEl.value = input.token
    filterEl.value = input.filter
    hideParentsBtn.checked = !!input.hideParents;
    hideTestsBtn.checked = !!input.hideTests;
    openImgEl.checked = !!input.openImage;
    shortIssueEl.checked = !!input.shortIssue;
    disableIconsEl.checked = !!input.disableIcons;
    extraParamsEl.value = !!input.extraParams ? input.extraParams : '';
    showMatchedEl.checked = !!input.showMatched;
}

function clearInput() {
    localStorage.clear();

    uriBaseEl.value = '{{ .uri }}'
    userEl.value = '{{ .user }}'
    tokenEl.value = '{{ .token }}'
    filterEl.value = ''
    hideParentsBtn.checked = false;
    hideTestsBtn.checked = false;
    openImgEl.checked = false;
    shortIssueEl.checked = false;
    extraParamsEl.value = '';
    showMatchedEl.checked = false;

    notifyModalEl.querySelector('.modal-body').innerText = 'Form input storage is cleared!'
    notifyModal.show();
}
