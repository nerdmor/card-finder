function onlyUnique(arr) {
  var tmp = [];
  for (var i = 0; i < arr.length; i++) {
      if(!tmp.includes(arr[i])){
        tmp.push(arr[i])
      }
  }
  return tmp;
}

const delay = ms => new Promise(res => setTimeout(res, ms));



class MainController{
    constructor(){
        this.version = '0.5.0';
        this.cardList = [];
        this.filteredList = null;
        this.setData = null;
        this.state = {
            'page': 'home',
            'show_rarities': true,
            'group_order': ['color', 'rarity', 'cmc'],
            'card_status': [
                '&nbsp;',
                '✔️',
                '💲',
                '❔',
                '⭕'
            ],
            'filters': {
                'color': [],
                'rarity': [],
                'status': []
            },
            'version': this.version,
            'options': {
                'add_filter_on_select': true,
                'show_set_symbols': false,
                'debug': false
            }
        };
        this.invalidSets = [
            'plist', 'anb', 'prm'
        ];
        this.loadState();
        this.setBody();
    }

    clearAndReload(){
        console.log('clear and reload triggered');
        localStorage.clear();
        location.reload(true);
    }

    loadState(){
        if(localStorage.getItem('state')){
            this.cardList = JSON.parse(localStorage.getItem('cardList'));
            this.state = JSON.parse(localStorage.getItem('state'));
            this.setData = JSON.parse(localStorage.getItem('setData'));

            this.state.version = this.state.version || '0.0';
            if(this.state.version != this.version){
                this.clearAndReload();
            }

            if(this.state.filters.color == null) this.state.filters.color = [];
            if(this.state.filters.rarity == null) this.state.filters.rarity = [];
            if(this.state.filters.status == null) this.state.filters.status = [];
        }else{
            console.log('nothing to load');
        }
    }

    saveState(){
        localStorage.setItem('state', JSON.stringify(this.state));
        localStorage.setItem('cardList', JSON.stringify(this.cardList));
        localStorage.setItem('setData', JSON.stringify(this.setData));
    }

    clearCardList(){
        this.cardList = [];
        this.state.filters.color = [];
        this.state.filters.rarity = [];
        this.state.filters.status = [];
        $('#cardListEntry').val('');
        $('#displayList').html('');
        this.saveState();
    }

    setBody(){
        if(this.state.filters.color.length > 0 || this.state.filters.rarity.length > 0 || this.state.filters.status.length > 0)
            this.populateFilterLists();

        if(this.state.options.show_set_symbols == true) $('#optShowSetSymbols').attr('checked', 'checked');
        if(this.state.options.add_filter_on_select == true) $('#optAddFilterOnSelect').attr('checked', 'checked');
        if(this.state.options.debug == true){
            $('#storageClear').show();
        }else{
            $('#storageClear').hide();
        }


        if(this.cardList.length > 0){
            this.displayCards();
        }
    }

    async getSetData(){
        $('#console').html('going to scryfall for set data');
        var sets = {};
        var setKeys = [];
        var card = {};
        var cardSets = [];
        var url = '';
        var setCode = '';
        const basics = ['plains', 'island', 'swamp', 'mountain', 'forest'];
        if(this.setData !== null){
            sets = JSON.parse(JSON.stringify(this.setData));
        }
        setKeys = Object.keys(sets);

        for (var i = 0; i < this.cardList.length; i++) {
            card = this.cardList[i];
            if(basics.includes(card.name.toLowerCase())) continue;
            cardSets = Object.keys(card.sets);
            for (var j = 0; j < cardSets.length; j++) {
                setCode = cardSets[j];
                
                if(setCode.length > 3 && setKeys.includes(setCode.substr(1))){
                    this.invalidSets.push(setCode);
                    continue;
                }
                if(setKeys.includes(setCode) || this.invalidSets.includes(setCode)) continue;
                
                sets[setCode] = '';
                setKeys.push(setCode);
                url = 'https://api.scryfall.com/sets/' + setCode;
                await fetch(url)
                    .then((response) => response.json())
                    .then((data) => {
                        if(data.digital == false){
                            sets[setCode] = data.icon_svg_uri;
                        }else{
                            window.mainController.invalidSets.push(data.code);
                        }
                    })
                    .catch((error) => {
                        console.error('Error:', error);
                    });
            }
        }

        this.setData = JSON.parse(JSON.stringify(sets));
        $('#console').html('');
    }

    async parseCardList(){
        this.blockInput();
        var typedList = $('#cardListEntry').val();
        if(!typedList){
            return;
        }
        typedList = typedList.toLowerCase().split('\n').filter(e => e.length >= 2);
        if(typedList.length < 1){
            return;
        }

        var existingNames = [];
        for (var i = 0; i < this.cardList.length; i++) {
            existingNames.push(this.cardList[i].typed_name);
            existingNames.push(this.cardList[i].name);
        }

        var cardList = [];
        var identifiers = [];
        const reWithNum = /^(\d+)[xX]? (.+)/;
        var found = '';
        var typedName = '';
        var quantity = '';
        var cardname = '';
        var newCard = {};
        var searchQuery = '';
        var url = '';
        for (var i = 0; i < typedList.length; i++) {
            found = typedList[i].match(reWithNum);

            cardname = typedList[i];
            typedName = typedList[i];
            quantity = 1;
            if(found){
                cardname = found[2];
                typedName = cardname;
                quantity = parseInt(found[1]);
            }

            if(cardname.indexOf('//') > -1){
                cardname = cardname.split(' // ')[0];
            }

            if(existingNames.includes(cardname) || existingNames.includes(typedName)){
                continue;
            }

            cardname = cardname.replaceAll('\'', '').replaceAll(',', '').replaceAll(':', '').replaceAll('!', '').replaceAll('"', '');
            var newCard = {
                'typed_name': typedName,
                'name': null,
                'quantity': quantity,
                'sets': {},
                'images': {},
                'rarities': [],
                'color': [],
                'cmc': null,
                'is_land': null,
                'oracle_id': null,
                'scryfound': null,
                'status': '&nbsp;',
                'selected_set': null,
                'index': null
            }


            searchQuery = encodeURI('?unique=prints&q=!"' + cardname + '"');
            url = 'https://api.scryfall.com/cards/search' + searchQuery;

            console.log('going to scryfall for ' + typedName + ' (' + cardname + ')');
            $('#console').html('going to scryfall for ' + typedName);
            await fetch(url)
                .then((response) => response.json())
                .then((data) => {
                    var response_status = data.status || 200;
                    var firstFace = {};
                    var scrycard = {};
                    if(response_status != 200){
                        console.log('could not find ' + typedName);
                    }else{
                        for (var i = 0; i < data.data.length; i++) {
                            scrycard = data.data[i];
                            if(scrycard.hasOwnProperty('card_faces')){
                                firstFace = scrycard.card_faces[0];
                            }else{
                                firstFace = scrycard;
                            }
                            if(newCard.name === null){
                                newCard.scryfound = true;
                                newCard.oracle_id = scrycard.oracle_id;
                                newCard.cmc = scrycard.cmc;

                                newCard.name = firstFace.name;
                                for (var c = 0; c < firstFace.colors.length; c++) {
                                    newCard.color.push(firstFace.colors[c]);
                                }
                                if(firstFace.type_line.indexOf('Land') > -1){
                                    newCard.is_land = true;
                                }else{
                                    newCard.is_land = false;
                                }
                            }

                            newCard.sets[scrycard['set']] = scrycard['rarity'];
                            newCard.images[scrycard['set']] = firstFace.image_uris.normal;

                            newCard.rarities.push(scrycard['rarity']);
                            // if(scrycard['rarity'] != 'special'){
                            //     newCard.rarities.push(scrycard['rarity']);
                            // }
                        }

                        newCard.rarities = onlyUnique(newCard.rarities);
                        if(newCard.rarities.length > 1){
                            newCard.rarities.sort(function(a, b){
                                if(a == b) return 0;
                                if(a == 'common') return -1;
                                if(a == 'uncommon'){
                                    if(b == 'common') return 1;
                                    else return -1;
                                }
                                if(a == 'rare'){
                                    if(b == 'mythic') return -1;
                                    else return 1;
                                }
                                if(a == 'mythic') return 1;
                                return 0;
                            });
                        }
                    }

                })
                .catch((error) => {
                    console.error('Error:', error);
                });
            // console.log(newCard);

            cardList.push(newCard);
            if(i < typedList.length -1){
                await delay(100);
            }
        }
        $('#console').html('');

        this.cardList = this.cardList.concat(cardList);
        this.saveState();
        this.displayCards();
        this.enableInput();
    }

    async displayCards(){
        this.blockInput();
        if(this.state.options.show_set_symbols == true){
            await this.getSetData();

        }
        
        this.filteredList = null;
        this.filterCardsByColor();
        this.filterCardsByRarity();
        this.filterCardsByStatus();

        this.sortCardsByCost();

        this.populateDisplayList();
        this.populateFilterLists();
        this.enableInput();
    }

    filterCardsByColor(){
        if(this.state.filters.color.length == 0) return;

        var source = [];
        var result = [];

        if(this.filteredList == null){
            source = this.cardList.slice();
        }else{
            source = this.filteredList.slice();
        }

        for (var i = 0; i < source.length; i++) {
            if(this.state.filters.color.includes('land') && source[i].is_land == true){
                result.push(source[i]);
            }else if(this.state.filters.color.includes('c') && source[i].color.length == 0 && source[i].is_land == false){
                result.push(source[i]);
            }else if(this.state.filters.color.includes('multi') && source[i].color.length >= 2){
                result.push(source[i]);
            }else if(source[i].color.length == 1 && this.state.filters.color.includes(source[i].color[0])){
                result.push(source[i]);
            }
        }

        this.filteredList = result.slice();
    }

    filterCardsByRarity(){
        if(this.state.filters.rarity.length == 0) return;

        var source = [];
        var result = [];

        if(this.filteredList == null){
            source = this.cardList.slice();
        }else{
            source = this.filteredList.slice();
        }

        for (var i = 0; i < source.length; i++) {
            for (var k = 0; k < this.state.filters.rarity.length; k++) {
                if(source[i].rarities.includes(this.state.filters.rarity[k])){
                    result.push(source[i]);
                    break;
                }
            }
        }

        this.filteredList = result.slice();
    }

    filterCardsByStatus(){
        if(this.state.filters.status.length == 0) return;

        var source = [];
        var result = [];

        if(this.filteredList == null){
            source = this.cardList.slice();
        }else{
            source = this.filteredList.slice();
        }

        for (var i = 0; i < source.length; i++) {
            if(this.state.filters.status.includes(source[i].status)){
                result.push(source[i]);
            }
        }

        this.filteredList = result.slice();
    }

    populateFilterLists(){
        var filterElements = [];
        var newFilter = '';

        // color
        for (var i = 0; i < this.state.filters.color.length; i++) {
            newFilter = window.mainModels.filter_element;
            newFilter = newFilter.replaceAll('%%filterValue%%', this.state.filters.color[i]);
            newFilter = newFilter.replaceAll('%%filterType%%', 'color');

            if(this.state.filters.color[i] == 'W'){
                newFilter = newFilter.replaceAll('%%displayValue%%', 'White');
            }else if(this.state.filters.color[i] == 'U'){
                newFilter = newFilter.replaceAll('%%displayValue%%', 'Blue');
            }else if(this.state.filters.color[i] == 'B'){
                newFilter = newFilter.replaceAll('%%displayValue%%', 'Black');
            }else if(this.state.filters.color[i] == 'R'){
                newFilter = newFilter.replaceAll('%%displayValue%%', 'Red');
            }else if(this.state.filters.color[i] == 'G'){
                newFilter = newFilter.replaceAll('%%displayValue%%', 'Green');
            }else if(this.state.filters.color[i] == 'multi'){
                newFilter = newFilter.replaceAll('%%displayValue%%', 'Multicolor');
            }else if(this.state.filters.color[i] == 'c'){
                newFilter = newFilter.replaceAll('%%displayValue%%', 'Colorless');
            }else if(this.state.filters.color[i] == 'land'){
                newFilter = newFilter.replaceAll('%%displayValue%%', 'Land');
            }else{
                continue;
            }

            filterElements.push(newFilter);
        }
        $('#filterListColor').html(filterElements.join('\n'));

        // rarity
        filterElements = [];
        for (var i = 0; i < this.state.filters.rarity.length; i++) {
            newFilter = window.mainModels.filter_element;
            newFilter = newFilter.replaceAll('%%filterValue%%', this.state.filters.rarity[i]);
            newFilter = newFilter.replaceAll('%%filterType%%', 'rarity');
            newFilter = newFilter.replaceAll('%%displayValue%%', this.state.filters.rarity[i].substring(0,1).toUpperCase() + this.state.filters.rarity[i].substring(1));
            filterElements.push(newFilter);
        }
        $('#filterListRarity').html(filterElements.join('\n'));


        // status
        filterElements = [];
        for (var i = 0; i < this.state.filters.status.length; i++) {
            newFilter = window.mainModels.filter_element;
            newFilter = newFilter.replaceAll('%%filterValue%%', this.state.filters.status[i]);
            newFilter = newFilter.replaceAll('%%filterType%%', 'status');
            if(this.state.filters.status[i] == '&nbsp;'){
                newFilter = newFilter.replaceAll('%%displayValue%%', '[blank]');
            }else{
                newFilter = newFilter.replaceAll('%%displayValue%%', this.state.filters.status[i]);
            }
            filterElements.push(newFilter);
        }
        $('#filterListStatus').html(filterElements.join('\n'));
    }

    flattenGroup(group=null){
        var result = [];
        if(group === null){
            group = JSON.parse(JSON.stringify(this.groupedCardList));
        }else{
            group = JSON.parse(JSON.stringify(group));
        }

        for (var [key, value] of Object.entries(group)) {
            if(value.constructor !== Array){
                value = this.flattenGroup(value);
            }
            result = result.concat(value);
        }

        return result;
    }

    ensureIndex(){
        for (var i = this.cardList.length - 1; i >= 0; i--) {
            this.cardList[i].index = i;
        }
    }

    blockInput(){
        $('.input-control').each(function(i, val) {
             $(this).prop("disabled", true);
        });

        $('#cardListEntrySubmit').removeClass('btn-primary').addClass('btn-secondary')
        $('#cardListClear').removeClass('btn-danger').addClass('btn-secondary')
        $('#storageClear').removeClass('btn-danger').addClass('btn-secondary')

    }

    enableInput(){
        $('.input-control').each(function(i, val) {
             $(this).prop("disabled", false);
        });

        $('#cardListEntrySubmit').removeClass('btn-secondary').addClass('btn-primary')
        $('#cardListClear').removeClass('btn-secondary').addClass('btn-danger')
        $('#storageClear').removeClass('btn-secondary').addClass('btn-danger')
    }

    populateDisplayList(){
        console.log('calling populateDisplayList')
        $('#console').html('Thinking, please wait');
        var cardList = [];
        if(this.filteredList != null){
            cardList = this.filteredList.slice();
        }else{
            cardList = this.cardList.slice();
        }

        var displayList = [];

        var card = {};
        var cardDiv = '';
        var rarityDiv = '';
        var cardRarities = [];
        var cardStatus = '';
        const validColors = ['W', 'U', 'B', 'R', 'G'];
        const validRarities = ['c', 'u', 'r', 'm'];
        var rarityLetter = '';
        var keepCard = false;
        for (var i = 0; i < cardList.length; i++) {
            card = cardList[i];

            if(!card.scryfound){
                continue;
            }

            if(this.state.options.show_set_symbols === true){
                for (const [key, value] of Object.entries(card.sets)) {
                    if(this.invalidSets.includes(key)){
                        continue;
                    }
                    rarityDiv = window.mainModels.setRarity;
                    rarityDiv = rarityDiv.replaceAll('%%src%%', this.setData[key]);
                    rarityDiv = rarityDiv.replaceAll('%%rarity%%', value);
                    rarityDiv = rarityDiv.replaceAll('%%alt%%', key);
                    cardRarities.push(rarityDiv);
                }
            }else{
                for (var j = card.rarities.length - 1; j >= 0; j--) {
                    rarityDiv = window.mainModels.rarity;
                    rarityLetter = card.rarities[j].substr(0, 1);
                    if(validRarities.includes(rarityLetter)){
                        rarityDiv = rarityDiv.replaceAll('%%rarity%%', rarityLetter);
                    }else{
                        rarityDiv = rarityDiv.replaceAll('%%rarity%%', 't');
                    }
                    cardRarities.push(rarityDiv);
                }
            }
            

            cardStatus = card.status || '&nbsp;';
            cardDiv = window.mainModels.card
                        .replaceAll('%%card_quantity%%', card.quantity)
                        .replaceAll('%%status_icon%%', cardStatus)
                        .replaceAll('%%card_index%%', card.index)
                        .replaceAll('%%rarity_row%%', cardRarities.join('\n'));

            for (const [key, value] of Object.entries(card.images)) {
                if(card.selected_set === null || card.selected_set == key){
                    cardDiv = cardDiv.replaceAll('%%img_url%%', value).replaceAll('%%card_name%%', card.name);
                    break;
                }
            }
            displayList.push(cardDiv);
            cardRarities = [];
        }

        var displayDiv = window.mainModels.card_row.replaceAll('%%cards%%', displayList.join('\n'));
        $('#displayList').html(displayDiv);
        $('#console').html('');
    }

    sortCardsByColor(cardList=null){
        console.log('sorting cards by color')
        if(cardList === null){
            cardList = [];
            if(this.groupedCardList){
                cardList = this.groupedCardList;
            }else{
                for (var i = 0; i < this.cardList.length; i++) {
                    cardList.push(i);
                }
            }
        }
        cardList = JSON.parse(JSON.stringify(cardList));


        var result = {};
        if(cardList.constructor != Array){
            for (const [key, value] of Object.entries(cardList)) {
                result[key] = this.sortCardsByColor(value);
            }
            return result;
        }

        result = {
            'W': [],
            'U': [],
            'B': [],
            'R': [],
            'G': [],
            'multi': [],
            'land': [],
            'c': [],
        }

        var card = {};
        for (var i = 0; i < cardList.length; i++) {
            card = this.cardList[cardList[i]];

            if(card.is_land === true){
                result['land'].push(card.index);
            }else if(card.color.length == 0){
                result['c'].push(card.index);
            }else if(card.color.length > 1){
                result['multi'].push(card.index);
            }else{
                result[card.color].push(card.index);
            }
        }

        return result;
    }

    sortCardsByRarity(cardList=null){
        console.log('sorting cards by rarities')
        if(cardList === null){
            cardList = [];
            if(this.groupedCardList){
                cardList = this.groupedCardList;
            }else{
                for (var i = 0; i < this.cardList.length; i++) {
                    cardList.push(this.cardList[i].index);
                }
            }
        }
        cardList = JSON.parse(JSON.stringify(cardList));

        var result = {};
        if(cardList.constructor != Array){
            for (const [key, value] of Object.entries(cardList)) {
                result[key] = this.sortCardsByRarity(value);
            }
            return result;
        }

        result = {
            'common': [],
            'uncommon': [],
            'rare': [],
            'mythic': [],
            'special': []
        };

        for (var i = 0; i < cardList.length; i++) {
            result[this.cardList[cardList[i]].rarities[0]].push(cardList[i]);
        }

        return result;
    }

    sortCardsByCost(){
        console.log('sorting cards by cost')
        if(this.filteredList == null) return;

        var cardList = this.filteredList.slice();
        cardList.sort(function(a, b){
            if(a.cmc < b.cmc){
                return -1;
            }
            if(a.cmc > b.cmc){
                return 1;
            }
            return 0;
        });

        this.filteredList = cardList.slice();
    }

    removeCardsWithStatus(status){
        var newCardList = [];
        for (var i = 0; i < this.cardList.length; i++) {
            if(this.cardList[i].status != status){
                newCardList.push(this.cardList[i]);
            }
        }
        this.cardList = newCardList;
    }

    reverseListParse(){
        var result = [];
        var cardList = JSON.parse(JSON.stringify(this.cardList));
        cardList.sort(function(a, b) {
            var textA = a.name.toUpperCase();
            var textB = b.name.toUpperCase();
            return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
        });

        for (var i = 0; i < cardList.length; i++) {
            result.push(String(cardList[i].quantity) + ' ' + cardList[i].name);
        }
        return result.join('\n');
    }

    addFilterColor(){
        const value = $('#color-filter').val();
        if(value != 'all' && !this.state.filters.color.includes(value)){
            this.state.filters.color.push(value);
            this.saveState();
            this.displayCards();
            $('#color-filter').val('all');
        }
    }

    addFilterStatus(){
        const value = $('#statusFilter').val();
        if(value != 'all' && !this.state.filters.status.includes(value)){
            this.state.filters.status.push(value);
            this.saveState();
            this.displayCards();
            $('#statusFilter').val('all');
        }
    }

    addFilterRarity(){
        const value = $('#rarity-filter').val();
        if(value != 'all' && !this.state.filters.rarity.includes(value)){
            this.state.filters.rarity.push(value);
            this.saveState();
            this.displayCards();
            $('#rarity-filter').val('all');
        }
    }

}


// startup block
$(function() {
    window.mainController = window.mainController || 1;
    if(window.mainController == 1){
        window.mainController = new MainController;
    }

    $('#versioning').html('current version: ' + window.mainController.version);

    var tmp = '';
    for (var i = 0; i < window.mainController.state.card_status.length; i++) {
        if(window.mainController.state.card_status[i] == '&nbsp;'){
            tmp = '[blank]';
        }else{
            tmp = window.mainController.state.card_status[i];
        }
        $('#statusFilter').append($('<option>', {
            'value': window.mainController.state.card_status[i],
            'text': tmp
        }));
        $('#statusClearSelect').append($('<option>', {
            'value': window.mainController.state.card_status[i],
            'text': tmp
        }));
    }

    $('body').on('click', '#cardListEntrySubmit', function(event) {
        event.preventDefault();
        window.mainController.parseCardList();
    });

    $('body').on('keydown', function(event) {
        window.pressedKeys = window.pressedKeys || [];
        if(window.pressedKeys.length >= 10){
            window.pressedKeys = window.pressedKeys.slice(1);
        }
        window.pressedKeys.push(event.which);

        const konami =  [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];
        if(window.pressedKeys.length == konami.length){
            var success = true;
            for (var i = 0; i < konami.length; i++) {
                if(konami[i] != window.pressedKeys[i]){
                    success = false;
                    break;
                }
            }
        }


        if(success){
            window.mainController.state.options.debug = true;
            window.mainController.saveState();
            $('#console').html('Debug mode activated');
        }
    });

    $('#displayList').on('click', '.card-div', function(e) {
        var cardIndex = parseInt($(this).attr('card_index'));
        var currentStatus = window.mainController.cardList[cardIndex].status;
        var statusIndex = window.mainController.state.card_status.indexOf(currentStatus);
        var newStatus = '';
        var newStatusIndex = 0;
        if(statusIndex == window.mainController.state.card_status.length - 1){
            newStatusIndex = 0;
        }else{
            newStatusIndex = statusIndex + 1;
        }
        newStatus = window.mainController.state.card_status[newStatusIndex];
        window.mainController.cardList[cardIndex].status = newStatus;
        $(this).children('.status-row').children('.status-icon').html(newStatus);
        window.mainController.saveState();
    });

    $('#cardListClear').on('click', function(e) {
        window.mainController.clearCardList();
        $('#color-filter').val('all');
        $('#rarity-filter').val('all');
        $('#statusFilter').val('all');
    });

    $('#storageClear').on('click', function(e) {
        window.mainController.clearAndReload();
    });

    $('.filter-list').on('click', '.filter-remove-btn', function(e) {
        e.preventDefault();
        var value = $(this).attr('value');
        const filterType = $(this).attr('filter_type');
        var doUpdate = false;
        if(filterType == 'color'){
            for (var i = 0; i < window.mainController.state.filters.color.length; i++) {
                if(window.mainController.state.filters.color[i] == value){
                    window.mainController.state.filters.color.splice(i, 1);
                    doUpdate = true;
                    break;
                }
            }
        }else if(filterType == 'rarity'){
            for (var i = 0; i < window.mainController.state.filters.rarity.length; i++) {
                if(window.mainController.state.filters.rarity[i] == value){
                    window.mainController.state.filters.rarity.splice(i, 1);
                    doUpdate = true;
                    break;
                }
            }
        }else if(filterType == 'status'){
            if(value.match(/^\s+$/g)){
                value = '&nbsp;';
            }
            for (var i = 0; i < window.mainController.state.filters.status.length; i++) {
                if(window.mainController.state.filters.status[i] == value){
                    window.mainController.state.filters.status.splice(i, 1);
                    doUpdate = true;
                    break;
                }
            }
        }

        if(doUpdate){
            window.mainController.saveState();
            window.mainController.displayCards();
        }
    });

    $('#addFilterColor').on('click', function(e) {
        e.preventDefault();
        window.mainController.addFilterColor();
    });

    $('#color-filter').on('change', function(e) {
        event.preventDefault();
        if(window.mainController.state.options.add_filter_on_select == true)
            window.mainController.addFilterColor();
    });

    $('#addFilterRarity').on('click', function(e) {
        e.preventDefault();
        window.mainController.addFilterRarity();
    });

    $('#rarity-filter').on('change', function(e) {
        e.preventDefault();
        if(window.mainController.state.options.add_filter_on_select == true)
            window.mainController.addFilterRarity();
    });

    $('#addFilterStatus').on('click', function(e) {
        e.preventDefault();
        window.mainController.addFilterStatus();
    });

    $('#statusFilter').on('change', function(e) {
        e.preventDefault();
        if(window.mainController.state.options.add_filter_on_select == true)
            window.mainController.addFilterStatus();
    });

    $('#statusClearBtn').on('click', function(e) {
        const value = $('#statusClearSelect').val();
        if(value == 'all'){return;}
        window.mainController.removeCardsWithStatus(value);
        window.mainController.saveState();
        window.mainController.displayCards();
        $('#statusClearSelect').val('all');
    });

    $('#rebuildCardList').on('click', function(e) {
        const newList = window.mainController.reverseListParse();
        $('#cardListEntry').val(newList);
        window.mainController.saveState();
    });

    $('#reapply-filters').on('click', function(e){
        window.mainController.displayCards();
    });

    $('#optAddFilterOnSelect').on('change', function(e) {
        const val = $(this).is(":checked");
        window.mainController.state.options.add_filter_on_select = val;
        window.mainController.saveState();
        window.mainController.displayCards();
    });
    $('#optShowSetSymbols').on('change', function(e) {
        const val = $(this).is(":checked");
        window.mainController.state.options.show_set_symbols = val;
        window.mainController.saveState();
        window.mainController.displayCards();
    });

});