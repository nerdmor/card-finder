const basicLands = ['plains', 'island', 'swamp', 'mountain', 'forest'];
const rarities = ['common', 'uncommon', 'rare', 'mythic', 'special'];
const colors = ['w', 'u', 'b', 'r', 'g', 'c', 'land', 'multi'];
const emojiSuggestions = ['💔', '❤️', '🖤', '💯', '💢', '💬', '💭', '🛑', '🕐', '🔔', '⚠️', '⛔', '🚫', '☢️', '⬆️', '⬇️', '🔄', '➕', '‼️', '⁉️', '❓', '✅', '❌', '🔴', '🟡', '🟢'];
const konami =  [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];
var pressedKeys = [];


$(function() {
    window.controller = window.controller || 0;
    if(window.controller == 0){
        window.controller = new MainController;
    }

    window.scryfall = window.scryfall || new ScryfallClient;

    window.addEventListener("error", (event) => {
        window.controller.log(`err: ${event.type}: ${event.message}`);
    });

    // Tooltips ################################################################
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))

    // Konami code and debug menu handler
    $('body').on('keydown', function(event) {
        if(pressedKeys.length >= 10){
            pressedKeys = pressedKeys.slice(1);
        }
        pressedKeys.push(event.which);

        if(pressedKeys.length == konami.length){
            for (var i = 0; i < konami.length; i++) {
                if(konami[i] != pressedKeys[i]){
                    return;
                }
            }
        }else{
            return;
        }

        window.controller.toggleDebug();
    });

    // Debug button binds ######################################################
    $('#btnDebugClearStorage').on('click', function(e) {
        window.controller.clearAndReload();
    });

    $('#btnDebugClearCards').on('click', function(e) {
        window.controller.clearCards();
    });

    $('#btnDebugClearConsole').on('click', function(e) {
        window.controller.clearConsole();
    });

    // Card list button binds ##################################################
    $('#cardListEntrySubmit').on('click', function(e) {
        window.controller.loadCardsFromList();
    });

    // Card interaction binds ##################################################
    $('#cardListDisplay').on('click', '.card-div', function(e) {
        const cardIndex = parseInt($(this).attr('card_index'));
        window.controller.advanceCardStatus(cardIndex);
    });

    $('#cardListDisplay').on('click', '.card-version-selector', function(e) {
        const cardIndex = parseInt($(this).parent().attr('card_index'));
        window.controller.callSelectCardVersionModal(cardIndex)
    });

    //Filter binds #############################################################
    $('.color-filter-switch').on('change', function(e) {
        const eColor = $(this).attr('id').replaceAll('filterColor', '').toLowerCase();

        if($(this).is(":checked")){
            window.controller.addFilterColor(eColor);
        }else{
            window.controller.removeFilterColor(eColor);
        }
    });

    $('#filterColorAll').on('click', function(e) {
        window.controller.addFilterColor('all');
    });

    $('#filterColorNone').on('click', function(e) {
        window.controller.removeFilterColor('all');
    });

    $('.rarity-filter-switch').on('change', function(e) {
        const eRarity = $(this).attr('id').replaceAll('filterRarity', '').toLowerCase();
        if($(this).is(":checked")){
            window.controller.addFilterRarity(eRarity);
        }else{
            window.controller.removeFilterRarity(eRarity);
        }
    });

    $('#filterRarityAll').on('click', function(e) {
        window.controller.addFilterRarity('all');
    });

    $('#filterRarityNone').on('click', function(e) {
        window.controller.removeFilterRarity('all');
    });

    $('#filterStatusList').on('change', '.status-filter-switch', function(e) {
        const eStatus = $(this).attr('id').replaceAll('filterStatus', '');
        if($(this).is(":checked")){
            window.controller.addFilterStatus(eStatus);
        }else{
            window.controller.removeFilterStatus(eStatus);
        }
    });

    $('#filterStatusAll').on('click', function(e) {
        window.controller.addFilterStatus('all');
    });

    $('#filterStatusNone').on('click', function(e) {
        window.controller.removeFilterStatus('all');
    });

    $('#btnFilterApply').on('click', function(e) {
        window.controller.drawCards();
    });

    // Settings bindings #######################################################
    $('#settingsApplyFilters').on('change', function(e){
        window.controller.setSettings('apply_filters_on_select', $(this).is(":checked"));
    });
    $('#settingsShowSet').on('change', function(e){
        window.controller.setSettings('show_set_symbols', $(this).is(":checked"));
    });

    $('#cardStatusList').on('click', '.status-options-btn-up', function(e) {
        const targetIndex = $(this).parent().attr('status_index');
        window.controller.moveCardStatusUp(targetIndex);
    });
    $('#cardStatusList').on('click', '.status-options-btn-down', function(e) {
        const targetIndex = $(this).parent().attr('status_index');
        window.controller.moveCardStatusDown(targetIndex);
    });
    $('#cardStatusList').on('click', '.status-options-btn-remove', function(e) {
        const targetIndex = $(this).parent().attr('status_index');
        window.controller.removeCardStatus(targetIndex);
    });
    $('#cardStatusList').on('click', '.status-options-btn-add', function(e) {
        window.controller.callAddStatusModal();
    });
    $('#statusSuggestionList').on('click', '.btn-emoji-suggestion', function(e) {
        window.controller.addCardStatus($(this).html());
    });
    $('#add-custom-status').on('click', function(e) {
        const val = $('#custom-status').val();
        if(/\p{Emoji}/u.test(val) == false){
            window.controller.alertAddStatusModal(`"${val}" is not a valid emoji`);
            return;
        }
        window.controller.addCardStatus(val);
    });
    $('#sorter-block').on('change', '.sorter-switch', function(e) {
        const sort = $(this).parent().attr('sort_value');
        if($(this).is(":checked")) window.controller.addGrouper(sort);
        else window.controller.removeGrouper(sort);
    });

    // Card Version Select bindings ############################################
    $('#selectCardVersionList').on('click', '.selectCardHolder', function(e) {
        const index = parseInt($(this).attr('card_index'));
        window.controller.selectCardVersion(index, $(this).attr('code'));
    });


});