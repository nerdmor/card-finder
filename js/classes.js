class MainController{
    constructor(){
        // savables
        this.version = '0.10.2';
        this.cards = [];
        this.sets = {};
        this.settings = {
            'apply_filters_on_select': true,
            'show_set_symbols': false,
            'group_order': ['color', 'rarity', 'cmc'],
            'debug': false
        };
        this.cardStatus = [
            '✔️',
            '💲',
            '❔',
            '⭕'
        ];
        this.filters = {
            'color': ['w', 'u', 'b', 'r', 'g', 'c', 'land', 'multi'],
            'rarity': ['common', 'uncommon', 'rare', 'mythic', 'special'],
            'status': deepCopy(this.cardStatus.concat(['Null']))
        }


        // constants
        this.saveItems = ['cards', 'sets', 'settings', 'cardStatus', 'filters'];
        this.sorters = ['color', 'name', 'rarity', 'cmc'];

        // privates
        this.cardQueue = [];
        this.cardErrors = [];
        this.cardNames = {};
        this.digitalSets = [];
        this.loadingModal = new bootstrap.Modal('#loadingModal', {backdrop: 'static', keyboard: false});
        this.alertModal = new bootstrap.Modal('#alertModal');
        this.addStatusModal = new bootstrap.Modal('#addStatusModal');
        this.selectCardVersionModal = new bootstrap.Modal('#selectCardVersionModal');
        this.clearCardsModal = new bootstrap.Modal('#clear-cards-modal');

        // function calls
        this.loadState();
        this.drawStatusFilters();
        this.drawSorterSwitches();
        this.setFilterToggles();
        this.setSorterToggles();
        this.setSettingsToggles();
        this.drawCardStatusOptions();
        this.drawOptionalElements();
        this.drawDebugItems();
        this.drawCards();
    }

    log(msg){
        if(this.settings.debug == true){
           console.log(msg);
        }
        $("#debugConsole").append( `<p>${msg}</p>` );
    }

    clearConsole(){
        $("#debugConsole").html('<p>&nbsp;</p>');
    }

    loadState(){
        var savedVersion = localStorage.getItem('version');
        if(savedVersion && savedVersion != this.version){
            this.log('saved version and current version are different. Reloading;');
            this.clearAndReload();
            return;
        }

        var itemName = '';
        var storedItem = '';
        for (var i = 0; i < this.saveItems.length; i++) {
            itemName = this.saveItems[i];
            storedItem = localStorage.getItem(itemName);
            if(storedItem){
                this.log(`loading ${itemName} from storage`);
                this[itemName] = JSON.parse(storedItem);
            }
        }

        var tmp = '';
        for (var i = 0; i < this.cards.length; i++) {
            tmp = JSON.parse(JSON.stringify(this.cards[i]));
            this.cards[i] = new MtgCard;
            this.cards[i].fromJson(tmp);
        }
    }

    clearAndReload(){
        this.log('clear and reload triggered');
        localStorage.clear();
        location.reload(true);
    }

    saveState(targetItems=null){
        if (targetItems === null) {
            targetItems = this.saveItems;
        }else if(!Array.isArray(targetItems)){
            targetItems = [targetItems];
        }

        var itemName = '';
        for (var i = 0; i < targetItems.length; i++) {
            itemName = targetItems[i];
            if(!this.saveItems.includes(itemName)) continue;
            this.log(`saving to storage: ${itemName}`);
            localStorage.setItem(itemName, JSON.stringify(this[itemName]));
        }
        localStorage.setItem('version', this.version);
    }

    toggleDebug(){
        this.settings.debug = !this.settings.debug;
        if(this.settings.debug == true){
            this.log('debug menu enabled');
        }
        this.saveState('settings');
        this.drawDebugItems();
    }

    drawDebugItems(){
        if(this.settings.debug){
            $('.debug-item').each(function(i, e) {
                $(this).removeClass('start-hidden');
                $(this).show();
            });
        }else{
            $('.debug-item').each(function(i, e) {
                $(this).hide();
            });
        }
    }

    clearCards(){
        this.log('clearing cards');
        this.cards = [];
        this.cardQueue = [];
        this.cardErrors = [];
        this.cardNames = {};
        this.sets = {};
        this.saveState(['cards', 'sets']);
        this.drawCards();
    }

    callLoadingModal(){
        document.getElementById('loadingModalText').innerHTML = '<strong>Loading...</strong>';
        this.loadingModal.show();
    }

    setLoadingModalText(txt){
        document.getElementById('loadingModalText').innerHTML = txt;
    }

    callAlertModal(title, body){
        document.getElementById('alertModalLabel').innerHTML = title;
        document.getElementById('alertModalBody').innerHTML = body;
        this.alertModal.show();
    }

    dismissAlertModal(){
        this.alertModal.hide();
    }

    callAddStatusModal(){
        $('#custom-status-alert-area').hide();
        $('#custom-status').val('');
        this.drawStatusSuggestions();
        this.addStatusModal.show();
    }

    dismissAddStatusModal(){
        this.addStatusModal.hide();
    }

    callSelectCardVersionModal(cardIndex){
        this.drawCardVersionOptions(cardIndex);
        this.selectCardVersionModal.show();
    }

    dismissSelectCardVersionModal(){
        this.selectCardVersionModal.hide();
    }

    callClearCardsModal(){
        $('#clear-cards-all').prop('checked', false);
        this.clearCardsModal.show();
    }

    clearCardsModalCallback(clearAll){
        if(clearAll){
            this.clearAndReload();
        }else{
            this.clearCards();
        }
        this.clearCardsModal.hide();
    }

    makeErrorsModal(){
        if(this.cardErrors.length < 1) return;
        const title = "Error getting cards";
        var body = ["<p>The following cards couldn't be found and were ignored", "<ul>"];
        for (var i = 0; i < this.cardErrors.length; i++) {
            body.push(`<li>${this.cardErrors[i]}</li>`);
        }
        body.push('</ul></p>');
        body = body.join('\n');
        this.callAlertModal(title, body);
    }

    dismissLoadingModal(){
        this.loadingModal.hide();
    }

    loadCardsFromList(){
        var typedList = $('#cardListEntry').val();
        if(!typedList){
            return;
        }

        // start by calling a loading modal
        this.callLoadingModal();
        typedList = typedList.toLowerCase().split('\n').filter(e => e.length >= 2);
        if(typedList.length < 1){
            this.dismissLoadingModal();
            return;
        }

        this.cardQueue = [];
        const reWithNum = /^(\d+)[xX]? (.+)/;
        var match = null;
        var typedName = '';
        var quantity = 0;
        var newCard = null;
        var cardIndex = 0;
        this.ensureCardSanity();
        for (var i = 0; i < typedList.length; i++) {
            match = typedList[i].match(reWithNum);
            typedName = typedList[i].toLowerCase();
            quantity = 1;
            if(match){
                typedName = match[2];
                quantity = parseInt(match[1]);
            }

            if(typedName.indexOf('//') > -1){
                typedName = typedName.split('//')[0];
            }

            typedName = typedName.replaceAll('\'', '').replaceAll(',', '').replaceAll(':', '').replaceAll('!', '').replaceAll('"', '').trim().toLowerCase();

            if(this.cardNames.hasOwnProperty(typedName)){
                this.cards[this.cardNames[typedName]].quantity = this.cards[this.cardNames[typedName]].quantity + quantity;
                continue;
            }

            cardIndex = this.cards.length;
            this.cardNames[typedName] = cardIndex;
            newCard = new MtgCard;
            newCard.init(typedName, quantity, cardIndex);
            this.cards.push(newCard);
            this.cardQueue.push(cardIndex);
        }

        this.processScryfallQueue();
    }

    ensureCardSanity(){
        this.log('controller.ensureCardSanity() called');
        // 1: remove cards with errors
        var tmp = this.cards.filter(c => c.error!==null);
        this.cardErrors = [];
        for (var i = 0; i < tmp.length; i++) {
            this.cardErrors.push(tmp[i].typedName);
        }
        this.cards = this.cards.filter(c => c.error===null);

        // 2: ensure index of cards and feed the cardnames
        this.cardNames = {};
        for (var i = 0; i < this.cards.length; i++) {
            this.cards[i].index = i;
            if(this.cards[i].loaded === true){
                this.cardNames[this.cards[i].name.toLowerCase()] = this.cards[i].index;
                this.cardNames[this.cards[i].typedName.toLowerCase()] = this.cards[i].index;
            }
        }
    }

    async processScryfallQueue(){
        await delay(100);
        if(this.cardQueue.length < 1){
            this.log('controller.cardQueue is empty');
            await delay(500);
            this.ensureCardSanity();
            this.dismissLoadingModal();
            this.makeErrorsModal();
            this.saveState();
            this.drawCards();
            return;
        }
        const cardIndex = this.cardQueue[0];
        this.cardQueue = this.cardQueue.slice(1);
        this.setLoadingModalText(`Processing ${this.cards[cardIndex].typedName}...`);
        this.cards[cardIndex].index = cardIndex;
        this.cards[cardIndex].findInScryfall(window.scryfall);
    }

    loadScryfallSetResponse(data, params){
        if(data.digital == true){
            this.digitalSets.push(params.key);
            return;
        }
        this.sets[params.key] = {
            'name': data.name,
            'icon': data.icon_svg_uri,
            'code': params.key
        };
    }

    async processScryfallSetQueue(){
        var ret = true;
        for (const [key, value] of Object.entries(this.sets)) {
            await delay(100);
            if(value !== null) continue;
            if(this.digitalSets.includes(key)) continue;
            ret = false;
            this.setLoadingModalText(`Getting set data for ${key.toUpperCase()}...`);
            await window.scryfall.sets(key,
                                       (d, p) => window.controller.loadScryfallSetResponse(d, p),
                                       {'key': key}
                                      );
        }

        if(ret == true){
            for (var i = 0; i < this.digitalSets.length; i++) {
                delete this.sets[this.digitalSets[i]]; 
            }
            this.saveState('sets');
            await delay(200);
            this.dismissLoadingModal();
            return;
        }

        this.processScryfallSetQueue();
    }

    loadScryfallResponse(data, params){
        this.cards[params.index].loadFromScryfallResponse(data);
        this.processScryfallQueue();
    }

    async loadScryfallOracleResponse(data, params){
        this.cards[params.index].loadFromScryfallResponse(data);
        this.dismissLoadingModal();
        await delay(200);
        this.callSelectCardVersionModal(params.index);
    }

    async getVersionsByOracle(cardIndex){
        this.dismissSelectCardVersionModal();
        await delay(200);
        this.callLoadingModal();
        window.scryfall.cardOracleId(this.cards[cardIndex].oracleId, (d, p) => window.controller.loadScryfallOracleResponse(d, p), {'index': cardIndex});
    }

    checkSetsLoaded(){
        const keys = Object.keys(this.sets)
        for (var i = keys.length - 1; i >= 0; i--) {
            if(this.sets[keys[i]] === null) return false;
        }
        return true;
    }

    ensureSetList(){
        var keys = [];
        for (var c = 0; c < this.cards.length; c++) {
            keys = Object.keys(this.cards[c].sets);
            for (var s = 0; s < keys.length; s++) {
                if (!this.sets.hasOwnProperty(keys[s])) {
                    this.sets[keys[s]] = null;
                }
            }
        }
    }

    createPrintableCardList(sort=true){
        var cardList = this.cards.slice();
        cardList = this.filterCardsByColor(cardList);
        cardList = this.filterCardsByRarity(cardList);
        cardList = this.filterCardsByStatus(cardList);
        if(sort===true){
            cardList = this.groupAndSortCards(cardList);
        }else{
            cardList = this.flattenGroup(cardList);
        }
        return cardList;
    }

    async drawCards(){
        if(this.settings.show_set_symbols == true){
            this.ensureSetList();
            this.getSetData();
            while(this.checkSetsLoaded() == false){
                await delay(200);
            }
            // for some effing reason we need to do this
            window.sets = deepCopy(this.sets);
        }

        var cardList = this.createPrintableCardList();
        var html = [];
        for (var i = 0; i < cardList.length; i++) {
            html.push(cardList[i].makeDiv(this.settings.show_set_symbols));
        }
        $('#cardListDisplay').html(html.join('\n'));
    }

    drawOptionalElements(){
        if(this.settings.apply_filters_on_select == true){
            $('#filterApply').hide();
        }else{
            $('#filterApply').show();
        }
    }

    drawStatusSuggestions(){
        var html = [];
        for (var i = 0; i < emojiSuggestions.length; i++) {
            if(this.cardStatus.includes(emojiSuggestions[i])) continue;
            html.push(window.mainModels.status_emoji.replaceAll('%%status%%', emojiSuggestions[i]));
        }
        document.getElementById('statusSuggestionList').innerHTML = html.join('\n');
    }

    advanceCardStatus(cardIndex){
        const currentCardStatus = this.cards[cardIndex].status;
        const currentCardStatusIndex = this.cardStatus.indexOf(currentCardStatus);

        if(currentCardStatus == null){
            this.cards[cardIndex].status = this.cardStatus[0];
        }else if(currentCardStatusIndex == this.cardStatus.length - 1){
            this.cards[cardIndex].status = null;
        }else{
            this.cards[cardIndex].status = this.cardStatus[currentCardStatusIndex + 1];
        }

        this.saveState(['cards']);
        this.drawCards();
    }

    filterCardsByColor(cardList){
        var filteredList = [];
        for (var i = 0; i < cardList.length; i++) {
            if(cardList[i].filterByColor(this.filters.color)){
                filteredList.push(cardList[i]);
            }
        }

        return filteredList;
    }

    filterCardsByRarity(cardList){
        var filteredList = [];
        for (var i = 0; i < cardList.length; i++) {
            if(cardList[i].filterByRarity(this.filters.rarity)){
                filteredList.push(cardList[i]);
            }
        }

        return filteredList;
    }

    filterCardsByStatus(cardList){
        var filteredList = [];
        for (var i = 0; i < cardList.length; i++) {
            if(cardList[i].filterByStatus(this.filters.status)){
                filteredList.push(cardList[i]);
            }
        }

        return filteredList;
    }

    drawStatusFilters(){
        var html = [window.mainModels.status_filter.replaceAll('%%status%%', 'Null').replaceAll('%%status_display%%', '[none]')];
        for (var i = 0; i < this.cardStatus.length; i++) {
            html.push(window.mainModels.status_filter.replaceAll('%%status%%', this.cardStatus[i]).replaceAll('%%status_display%%', this.cardStatus[i]));
        }

        $('#filterStatusList').html(html.join('\n'));
    }

    drawCardStatusOptions(){
        var html = [];
        for (var i = 0; i < this.cardStatus.length; i++) {
            html.push(window.mainModels.status_element.replaceAll('%%status%%', this.cardStatus[i]).replaceAll('%%status_index%%', i))
        }
        html.push(window.mainModels.status_add);
        $('#cardStatusList').html(html.join('\n'));
    }

    drawSorterSwitches(){
        var html = [];
        var sortDisplay = '';
        for (var i = 0; i < this.sorters.length; i++) {
            sortDisplay = properize(this.sorters[i]);
            if(sortDisplay.length < 3) sortDisplay = sortDisplay.toUpperCase();
            html.push(window.mainModels.sorter_switch.replaceAll('%%sort%%', this.sorters[i]).replaceAll('%%sort_display%%', sortDisplay));
        }
        document.getElementById('sorter-block').innerHTML = html.join('\n');
    }

    drawCardVersionOptions(cardIndex){
        const keys = Object.keys(this.cards[cardIndex].sets);
        var html = [];
        for (var i = 0; i < keys.length; i++) {
            html.push(window.mainModels.version_select_item
                .replaceAll('%%code%%', keys[i])
                .replaceAll('%%index%%', cardIndex)
                .replaceAll('%%image%%', this.cards[cardIndex].sets[keys[i]].image)
            )
        }

        document.getElementById('selectCardVersionList').innerHTML = html.join('\n');
        $('#loadMoreCardVersions').attr('card_index', cardIndex);
    }

    setFilterToggles(groups = null){
        if (groups === null) {
            groups = ['color', 'rarity', 'status'];
        }else{
            if(!Array.isArray(groups)){
                groups = [groups];
            }
        }

        var filterElement = '';
        var targetElement = '';

        if(groups.includes('color')){
            for (var i = 0; i < colors.length; i++) {
                targetElement = '#filterColor' + properize(colors[i]);
                if(this.filters.color.includes(colors[i])){
                    $(targetElement).prop('checked', true);
                }else{
                    $(targetElement).prop('checked', false);
                }
            }
        }

        if(groups.includes('rarity')){
            for (var i = 0; i < rarities.length; i++) {
                targetElement = '#filterRarity' + properize(rarities[i]);
                if(this.filters.rarity.includes(rarities[i])){
                    $(targetElement).prop('checked', true);
                }else{
                    $(targetElement).prop('checked', false);
                }
            }
        }

        if(groups.includes('status')){
            const statuses = deepCopy(this.cardStatus.concat(['Null']));
            for (var i = 0; i < statuses.length; i++) {
                targetElement = '#filterStatus' + properize(statuses[i]);
                if(this.filters.status.includes(statuses[i])){
                    $(targetElement).prop('checked', true);
                }else{
                    $(targetElement).prop('checked', false);
                }
            }
        }

    }

    setSettingsToggles(){
        $('#settingsApplyFilters').prop('checked', this.settings.apply_filters_on_select);
        $('#settingsShowSet').prop('checked', this.settings.show_set_symbols);
    }

    setSorterToggles(){
        var tgt = '';
        for (var i = 0; i < this.sorters.length; i++) {
            tgt = `#sorter${this.sorters[i]}`;
            if(this.settings.group_order.includes(this.sorters[i])){
                $(tgt).prop('checked', true);
            }else{
                $(tgt).prop('checked', false);
            }
        }
    }

    addFilterColor(color){
        if(this.filters.color.includes(color)) return;
        if(color == 'all'){
            this.filters.color = deepCopy(colors);
            this.setFilterToggles(['color']);
        }else this.filters.color.push(color);
        this.postProcessFilters();
    }

    removeFilterColor(color){
        if(color == 'all'){
            this.filters.color = [];
            this.setFilterToggles(['color']);
        }else{
            if(!this.filters.color.includes(color)) return;
            this.filters.color = this.filters.color.filter(e => e != color);
        }
        this.postProcessFilters();
    }

    addFilterRarity(rarity){
        if(rarity == 'all'){
            this.filters.rarity = deepCopy(rarities);
            this.setFilterToggles(['rarity']);
        }else{
            if(this.filters.rarity.includes(rarity)) return;
            this.filters.rarity.push(rarity);
        }
        this.postProcessFilters();
    }

    removeFilterRarity(rarity){
        if(rarity == 'all'){
            this.filters.rarity = [];
            this.setFilterToggles(['rarity']);
        }else{
            if(!this.filters.rarity.includes(rarity)) return;
            this.filters.rarity = this.filters.rarity.filter(e => e != rarity);
        }
        this.postProcessFilters();
    }

    addFilterStatus(status){
        if(status == 'all'){
            this.filters.status = deepCopy(this.cardStatus.concat(['Null']));
            this.setFilterToggles(['status']);
        }else{
            if(!this.cardStatus.includes(status) && status != 'Null') return;
            if(this.filters.status.includes(status)) return;
            this.filters.status.push(status);
        }
        this.postProcessFilters();
    }

    removeFilterStatus(status){
        if(status == 'all'){
            this.filters.status = [];
            this.setFilterToggles(['status']);
        }else{
            if(!this.cardStatus.includes(status) && status != 'Null') return;
            if(!this.filters.status.includes(status)) return;
            this.filters.status = this.filters.status.filter(e => e != status);
        }
        
        this.postProcessFilters();
    }

    postProcessFilters(){
        this.saveState(['filters', 'cardStatus']);
        if(this.settings.apply_filters_on_select){
            this.drawCards();
        }
    }

    setSettings(setting, value){
        if(!this.settings.hasOwnProperty(setting)) return;
        this.settings[setting] = value;
        this.drawOptionalElements();
        this.saveState(['settings']);
        this.drawCards();
    }

    getSetData(){
        this.ensureSetList();
        if(this.checkSetsLoaded() === true) return;

        var keys = [];
        for (var i = 0; i < this.cards.length; i++) {
            if(basicLands.includes(this.cards[i].name.toLowerCase())) continue;

            keys = Object.keys(this.cards[i].sets);
            for (var j = 0; j < keys.length; j++) {
                if(!this.sets.hasOwnProperty(keys[j])){
                    this.sets[keys[j]] = null;
                }
            }
        }
        this.callLoadingModal();
        this.processScryfallSetQueue();
    }

    getSet(key){
        if(!this.sets.hasOwnProperty(key)){
            return null;
        }
        return this.sets[key];
    }

    removeDeadStatus(){
        for (var i = this.cards.length - 1; i >= 0; i--) {
            if(this.cards[i].status === null) continue;
            if(!this.cardStatus.includes(this.cards[i].status)) this.cards[i].status = null;
        }
    }

    postProcessStatusChange(){
        this.filters.status = deepCopy(this.cardStatus.concat(['Null']));
        this.drawStatusFilters();
        this.drawCardStatusOptions();
        this.setFilterToggles();
        this.saveState(['cardStatus']);
    }

    removeCardStatus(index){
        const status = this.cardStatus[index];
        this.cardStatus = this.cardStatus.filter(e => !status.includes(e));
        this.removeDeadStatus();
        this.postProcessStatusChange();
        this.saveState(['cards']);
        this.drawCards();
    }

    moveCardStatusUp(index){
        if(index == 0){
            var newIndex = this.cardStatus.length - 1;
        }else{
            var newIndex = index - 1;
        }
        arrayMove(this.cardStatus, index, newIndex);
        this.postProcessStatusChange();
    }

    moveCardStatusDown(index){
        if(index == this.cardStatus.length - 1){
            var newIndex = 0;
        }else{
            var newIndex = index + 1;
        }
        arrayMove(this.cardStatus, index, newIndex);
        this.postProcessStatusChange();
    }

    addCardStatus(status){
        if(this.cardStatus.includes(status)) return;
        this.cardStatus.push(status);
        this.postProcessStatusChange();
        this.dismissAddStatusModal();
    }

    alertAddStatusModal(msg){
        document.getElementById('custom-status-alert-area').innerHTML = msg
        $('#custom-status-alert-area').show();
    }

    flattenGroup(obj){
        if(Array.isArray(obj)){
            return obj;
        }

        var result = [];
        var sub = [];
        const keys = Object.keys(obj);
        for (var i = 0; i < keys.length; i++) {
            result = result.concat(this.flattenGroup(obj[keys[i]]));
        }
        return result;
    }

    groupByColor(list){
        var result = {};
        if(!Array.isArray(list)){
            const keys = Object.keys(list);
            for (var i = 0; i < keys.length; i++) {
                result[keys[i]] = this.groupByColor(list[keys[i]]);
            }
            return result;
        }

        for (var i = 0; i < colors.length; i++) {
            result[colors[i]] = [];
        }

        for (var i = 0; i < list.length; i++) {
            if(list[i].isLand){
                result['land'].push(list[i]);
                continue;
            }

            if(list[i].color.length == 0){
                result['c'].push(list[i]);
                continue;   
            }

            if(list[i].color.length > 1){
                result['multi'].push(list[i]);
                continue;   
            }

            result[list[i].color[0]].push(list[i]);
        }

        for (var i = 0; i < colors.length; i++) {
            if(result[colors[i]].length == 0) delete result[colors[i]];
        }

        return result;
    }

    groupByCmc(list){
        var result = {};
        var keys = [];
        if(!Array.isArray(list)){
            const keys = Object.keys(list);
            for (var i = 0; i < keys.length; i++) {
                result[keys[i]] = this.groupByCmc(list[keys[i]]);
            }
            return result;
        }

        // first pass: list cmcs as keys
        for (var i = 0; i < list.length; i++) {
            keys.push(list[i].cmc);
        }

        keys = onlyUnique(keys);
        keys.sort();
        for (var i = 0; i < keys.length; i++) {
            result[keys[i]] = [];
        }

        // second pass, actually set the keys
        for (var i = 0; i < list.length; i++) {
            result[list[i].cmc].push(list[i]);
        }

        return result;
    }

    groupByRarity(list){
        var result = {};
        var keys = [];
        if(!Array.isArray(list)){
            const keys = Object.keys(list);
            for (var i = 0; i < keys.length; i++) {
                result[keys[i]] = this.groupByRarity(list[keys[i]]);
            }
            return result;
        }

        for (var i = 0; i < rarities.length; i++) {
            result[rarities[i]] = [];
        }

        for (var i = 0; i < list.length; i++) {
            result[list[i].rarities[0]].push(list[i]);
        }

        for (var i = 0; i < rarities.length; i++) {
            if(result[rarities[i]].length == 0) delete result[rarities[i]];
        }

        return result;
    }

    sortByName(list){
        var result = {};
        if(!Array.isArray(list)){
            const keys = Object.keys(list);
            for (var i = 0; i < keys.length; i++) {
                result[keys[i]] = this.sortByName(list[keys[i]]);
            }
            return result;
        }

        result = list.slice();
        result.sort(function(a, b){
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();
            if (nameA > nameB) return 1;
            if (nameA < nameB) return -1;
            return 0;
        });

        return result;
    }

    groupAndSortCards(list){
        var grp = '';
        for (var i = 0; i < this.settings.group_order.length; i++) {
            grp = this.settings.group_order[i];
            if (grp == 'color') list = this.groupByColor(list);
            else if (grp == 'cmc') list = this.groupByCmc(list);
            else if (grp == 'rarity') list = this.groupByRarity(list);
            else if (grp == 'name') list = this.sortByName(list);
        }
        list = this.flattenGroup(list);
        return list;
    }

    addGrouper(group){
        if(this.settings.group_order.includes(group)) return;
        if(group == 'name') this.settings.group_order.push(group);
        else this.settings.group_order = [group].concat(this.settings.group_order);
        this.saveState(['settings']);
        this.drawCards();
    }

    removeGrouper(group){
        if(!this.settings.group_order.includes(group)) return;
        this.settings.group_order = this.settings.group_order.filter(e => e!=group);
        this.saveState(['settings']);
        this.drawCards();
    }

    selectCardVersion(cardIndex, setCode){
        const r = this.cards[cardIndex].selectSet(setCode);
        if(r === true){
            this.saveState(['cards']);
            this.drawCards();
        }
        this.dismissSelectCardVersionModal();
    }

    clearFilteredCards(){
        var list = this.createPrintableCardList(false);
        var oracleIds = [];
        for (var i = list.length - 1; i >= 0; i--) {
            if(list[i].oracleId === null) continue;
            oracleIds.push(list[i].oracleId);
        }

        var newCardList = [];
        for (var i = 0; i < this.cards.length; i++) {
            if(oracleIds.includes(this.cards[i].oracleId)) newCardList.push(this.cards[i].getCopy());
        }

        this.cards = newCardList;
        this.ensureCardSanity();
        this.drawCards();
    }

    rebuildTextCardList(){
        var text = [];
        for (var i = 0; i < this.cards.length; i++) {
            text.push(`${this.cards[i].quantity} ${this.cards[i].name}`);
        }
        text = text.join('\n');
        $('#cardListEntry').val(text);
    }

    copyTextCardList(){
        this.rebuildTextCardList();

        var copyText = document.getElementById("cardListEntry");

        copyText.select();
        copyText.setSelectionRange(0, 999999999999); // For mobile devices

        navigator.clipboard.writeText(copyText.value);
    }


}


class ScryfallClient{
    baseUrl = 'https://api.scryfall.com';

    constructor(){
    }

    async sets(setCode, callback, params){
        const url = `${this.baseUrl}/sets/${setCode}`;
        await fetch(url)
            .then((response) => response.json())
            .then((data) => {
                callback(data, params);
            })
            .catch((error) => {
                console.error('Error:', error);
            });

    }

    async cardsSearch(query, options, callback, params){
        var url = `${this.baseUrl}/cards/search`;
        var opts = [`q=${query}`];

        if(options !== null && typeof options === 'object' && !Array.isArray(options)) {
            const validOptions = {
                'unique': ['cards', 'art', 'prints'],
                'order': ['name', 'set', 'released', 'rarity', 'color', 'usd', 'tix', 'eur', 'cmc', 'power', 'toughness', 'edhrec', 'penny', 'artist', 'review'],
                'dir': ['auto', 'asc', 'desc'],
                'include_extras': ['true', 'false'],
                'include_multilingual': ['true', 'false'],
                'include_variations': ['true', 'false'],
                'page': 'number',
                'format': ['csv', 'json'],
                'pretty': ['true', 'false']
            }

            const validOptionKeys = Object.keys(validOptions);
            for (const [key, value] of Object.entries(options)) {
                if(!validOptionKeys.includes(key)) continue;
                if(Array.isArray(validOptions[key])){
                    if(!validOptions[key].includes(value)) continue;
                }else if(typeof value != validOptions[key]) continue;
                opts.push(`${key}=${value}`);
            }
        }
        opts = opts.join('&');

        url = `${url}?${opts}`;
        await fetch(url)
            .then((response) => response.json())
            .then((data) => {
                callback(data, params);
            })
            .catch((error) => {
                console.error('Error:', error);
            });
    }

    async cardOracleId(oracleId, callback, params){
        const url = `${this.baseUrl}/cards/oracle/${oracleId}`;
        await fetch(url)
            .then((response) => response.json())
            .then((data) => {
                callback(data, params);
            })
            .catch((error) => {
                console.error('Error:', error);
            });

    }
}


class MtgCard{
    constructor(){
        this.typedName = null;
        this.quantity = null;
        this.index = null;
        this.selectedSet = null;
        this.status = null;

        this.name = null;
        this.cmc = null;
        this.color = [];
        this.sets = {};
        this.oracleId = null;
        this.collectorNumber = null;
        this.typeLine = '';

        this.loaded = false;
        this.error = null;
        this.isLand = false;
        this.isMulticolor = false;
        this.mainImage = null;
        this.rarities = [];
    }

    init(typedName, quantity, index){
        this.typedName = typedName.toLowerCase();
        this.quantity = quantity;
        this.index = index;
    }

    fromJson(json){
        for (const [key, value] of Object.entries(json)) {
            if(this.hasOwnProperty(key)){
                this[key] = value;
            }
        }

    }

    findInScryfall(client){
        client.cardsSearch(
            `!"${this.typedName}"`, {'unique': 'prints'},
            (d, p) => window.controller.loadScryfallResponse(d, p),
            {'index': this.index}
        )
    }

    loadFromScryfallResponse(data){
        const responseStatus = data.status || 200;
        var firstFace = {};
        var scrycard = {};
        if(responseStatus != 200){
            window.controller.log(`error finding ${this.typedName}: ${data.details}`);
            this.error = data.details;
            return;
        }
        for (var i = 0; i < data.data.length; i++) {
            scrycard = data.data[i];
            if(scrycard.digital == true) continue;

            if(scrycard.hasOwnProperty('card_faces') && scrycard.layout != 'split'){
                firstFace = scrycard.card_faces[0];
            }else{
                firstFace = scrycard;
            }

            if(this.loaded === false){
                this.loaded = true;
                this.oracleId = scrycard.oracle_id;
                this.cmc = scrycard.cmc;
                this.collectorNumber = scrycard.collector_number;

                this.name = firstFace.name;

                for (var c = 0; c < firstFace.colors.length; c++) {
                    this.color.push(firstFace.colors[c].toLowerCase());
                }
                if(this.color.length > 1) this.isMulticolor = true;

                this.typeLine = onlyUnique(firstFace.type_line.replaceAll(' // ', ' ').replaceAll(' - ', ' ').toLowerCase().split(' ')).join(' ');
                if(firstFace.type_line.indexOf('Land') > -1){
                    this.isLand = true;
                }
            }

            this.sets[scrycard['set']] = {
                'rarity': translateRarity(scrycard['rarity']),
                'image': firstFace.image_uris.normal
            }

            this.selectedSet = scrycard['set'];
            this.rarities.push(scrycard['rarity'].toLowerCase());
        }

        this.rarities = onlyUnique(this.rarities);
        if(this.rarities.length > 1){
            var tmp = [];
            for (var i = 0; i < rarities.length; i++) {
                if(this.rarities.includes(rarities[i])){
                    tmp.push(rarities[i]);
                }
            }
            this.rarities = tmp;
        }
        this.selectSet(this.selectedSet);
    }

    selectSet(setCode){
        if(!Object.keys(this.sets).includes(setCode)){
            return false;
        }

        if(this.mainImage == this.sets[setCode].image) return false;

        this.mainImage = this.sets[setCode].image;
        return true;
    }

    makeDiv(showSets){
        var html = window.mainModels.card
            .replaceAll('%%card_index%%', this.index)
            .replaceAll('%%card_image%%', this.mainImage)
            .replaceAll('%%card_name%%', this.name)
            .replaceAll('%%status_symbol%%', (this.status ? this.status : '&nbsp;'))
            .replaceAll('%%card_quantity%%', this.quantity);

        var rarities = [];
        if(showSets == true && !basicLands.includes(this.name.toLowerCase())){
            var setKeys = Object.keys(this.sets);
            var key = '';
            var value = {};
            var setData = {};
            for (var i = 0; i < setKeys.length; i++) {
                key = setKeys[i];
                value = this.sets[key];
                if(!window.sets.hasOwnProperty(key)){
                    console.log('we dont know ' + key);
                    continue;
                }

                setData = window.sets[key];
                if(setData === null) continue;
                rarities.push(window.mainModels.rarity_set
                    .replaceAll('%%src%%', setData.icon)
                    .replaceAll('%%rarity%%', value.rarity)
                    .replaceAll('%%alt%%', `${setData.name} - ${properize(value.rarity)}`)
                );
            }
        }else{
            for (var i = 0; i < this.rarities.length; i++) {
                rarities.push(window.mainModels.rarity.replaceAll('%%rarity_letter%%', this.rarities[i].substring(0, 1)));
            }
        }
        html = html.replaceAll('%%rarities%%', rarities.join('\n'));
        return html;
    }

    filterByColor(allowedColors){
        if(this.isLand && allowedColors.includes('land')) return true;
        if(this.color.length > 1 && allowedColors.includes('multi')) return true;
        if(this.color.length == 1 && allowedColors.includes(this.color[0])) return true;
        if(this.isLand && !allowedColors.includes('land')) return false;
        if(this.color.length == 0 && allowedColors.includes('c')) return true;
        return false;
    }

    filterByRarity(allowedRarities){
        for (var i = 0; i < this.rarities.length; i++) {
            if(allowedRarities.includes(this.rarities[i])) return true;
        }
        return false;
    }

    filterByStatus(allowedStatus){
        if(this.status === null && allowedStatus.includes('Null')) return true;
        if(allowedStatus.includes(this.status)) return true;
        return false;

    }

    getCopy(){
        var copy = new MtgCard;
        copy.fromJson(JSON.parse(JSON.stringify(this)));
        return copy;
    }
}