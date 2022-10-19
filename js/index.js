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
        this.version = '0.3';
        this.cardList = [];
        this.groupedCardList = null;
        this.state = {
            'page': 'home',
            'show_rarities': true,
            'show_set_symbols': false,
            'group_order': ['color', 'rarity', 'cmc'],
            'card_status': [
                '&nbsp;',
                '✔️',
                '💲',
                '❔',
                '⭕'
            ],
            'filters': {
                'color': null,
                'rarity': null,
                'status': null
            },
            'version': this.version
        };
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
            this.state.version = this.state.version || '0.0';
            if(this.state.version != this.version){
                this.clearAndReload();
            }
            if(this.cardList.length > 0){
                this.displayCards();
            }
        }else{
            console.log('nothing to load');
        }
    }

    saveState(){
        localStorage.setItem('state', JSON.stringify(this.state));
        localStorage.setItem('cardList', JSON.stringify(this.cardList));
    }

    clearCardList(){
        this.cardList = [];
        this.groupedCardList = null;
        this.state.filters.color = null;
        this.state.filters.rarity = null;
        this.state.filters.status = null;
        $('#cardListEntry').val('');
        $('#displayList').html('');
        this.saveState();
    }

    setBody(){
        if(this.state == 'home'){
            $('#home').show();
        }
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

        // var oldList = JSON.parse(JSON.stringify(this.cardList));

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
                'color': null,
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
                                newCard.color = firstFace.colors.join('');
                                if(firstFace.type_line.indexOf('Land') > -1){
                                    newCard.is_land = true;
                                }else{
                                    newCard.is_land = false;
                                }
                            }

                            newCard.sets[scrycard['set']] = scrycard['rarity'];
                            newCard.images[scrycard['set']] = firstFace.image_uris.normal;
                            newCard.rarities.push(scrycard['rarity']);
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
            console.log(newCard);

            cardList.push(newCard);
            if(i < typedList.length -1){
                await delay(100);
            }
        }
        $('#console').html('');

        this.cardList = this.cardList.concat(cardList);
        this.groupedCardList = null;
        this.saveState();
        this.displayCards();
        this.enableInput();
    }

    async createCardFromScryfall(typedName, cardname, quantity){
        cardname = cardname.replaceAll('\'', '').replaceAll(',', '').replaceAll(':', '').replaceAll('!', '').replaceAll('"', '');
        var newCard = {
            'typed_name': typedName,
            'name': null,
            'quantity': quantity,
            'sets': {},
            'images': {},
            'rarities': [],
            'color': null,
            'cmc': null,
            'is_land': null,
            'oracle_id': null,
            'scryfound': null,
            'status': '&nbsp;',
            'selected_set': null,
            'index': null
        }


        const searchQuery = encodeURI('?unique=prints&q=!"' + cardname + '"');
        var url = 'https://api.scryfall.com/cards/search' + searchQuery;

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
                            newCard.color = firstFace.colors.join('');
                            if(firstFace.type_line.indexOf('Land') > -1){
                                newCard.is_land = true;
                            }else{
                                newCard.is_land = false;
                            }
                        }

                        newCard.sets[scrycard['set']] = scrycard['rarity'];
                        newCard.images[scrycard['set']] = firstFace.image_uris.normal;
                        newCard.rarities.push(scrycard['rarity']);
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

        return newCard;
    }

    displayCards(){
        this.ensureIndex();
        // TODO: make this respect a given sorting order
        this.groupedCardList = null;
        this.groupedCardList = this.sortCardsByColor();
        this.groupedCardList = this.sortCardsByRarity(this.groupedCardList);
        this.groupedCardList = this.sortCardsByCost(this.groupedCardList);
        this.populateDisplayList();
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
        if(this.groupedCardList != null){
            cardList = this.flattenGroup();
        }else{
            cardList = [];
            for (var i = 0; i < this.cardList.length; i++) {
                cardList.push(i);
            }
        }

        var displayList = [];

        var card = {};
        var cardDiv = '';
        var rarityDiv = '';
        var cardRarities = [];
        var cardStatus = '';
        const validColors = ['W', 'U', 'B', 'R', 'G'];
        for (var i = 0; i < cardList.length; i++) {
            card = this.cardList[cardList[i]];

            if(!card.scryfound){
                continue;
            }

            /* *****************************************************************
             * filter block
             * ****************************************************************/
            if(this.state.filters.status){
                if(this.state.filters.status == '&nbsp;' && card.status != '&nbsp;' && card.status !== null){
                    continue;
                }
                if(this.state.filters.status != card.status){
                    continue;
                }
            }

            if (this.state.filters.rarity !== null){
                if(!card.rarities.includes(this.state.filters.rarity)){
                    continue;
                }
            }

            if(this.state.filters.color !== null){
                if(this.state.filters.color == 'land' && card.is_land == false){
                    continue;
                }
                if(this.state.filters.color == 'c' && (card.color !== null  || card.color.length > 0)){
                    continue;
                }
                if(this.state.filters.color == 'multi' && (card.color === null || card.color.length < 2)){
                    continue;
                }
                if(validColors.includes(this.state.filters.color) && card.color != this.state.filters.color){
                    continue;
                }
            }
            /* end filter block ***********************************************/



            for (var j = card.rarities.length - 1; j >= 0; j--) {
                rarityDiv = window.mainModels.rarity;
                if(card.rarities[j] == 'common'){
                    rarityDiv = rarityDiv.replaceAll('%%rarity%%', 'c');
                }else if(card.rarities[j] == 'uncommon'){
                    rarityDiv = rarityDiv.replaceAll('%%rarity%%', 'u');
                }else if(card.rarities[j] == 'rare'){
                    rarityDiv = rarityDiv.replaceAll('%%rarity%%', 'r');
                }else if(card.rarities[j] == 'mythic'){
                    rarityDiv = rarityDiv.replaceAll('%%rarity%%', 'm');
                }else{
                    rarityDiv = rarityDiv.replaceAll('%%rarity%%', 't');
                }

                cardRarities.push(rarityDiv);
            }

            if(card.status === null){
                cardStatus = '&nbsp;';
            }else{
                cardStatus = card.status;
            }


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
            }else if(card.color === null){
                result['c'].push(card.index);
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
            'mythic': []
        };

        for (var i = 0; i < cardList.length; i++) {
            result[this.cardList[cardList[i]].rarities[0]].push(cardList[i]);
        }

        return result;
    }

    sortCardsByCost(cardList=null){
        console.log('sorting cards by cost')
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
                result[key] = this.sortCardsByCost(value);
            }
            return result;
        }


        //references in JS are hell
        var tmp = [];
        for (var i = 0; i < cardList.length; i++) {
            tmp.push({
                'index': cardList[i],
                'cmc': this.cardList[cardList[i]].cmc
            });
            
        }

        tmp.sort(function(a, b){
            if(a.cmc < b.cmc){
                return -1;
            }
            if(a.cmc > b.cmc){
                return 1;
            }
            return 0;
        });

        var result = [];
        for (var i = 0; i < tmp.length; i++) {
            result.push(tmp[i].index);
        }

        return result;
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
            tmp = '<blank>';
        }else{
            tmp = window.mainController.state.card_status[i];
        }
        $('#status-filter').append($('<option>', {
            'value': window.mainController.state.card_status[i],
            'text': tmp
        }));
    }

    $('body').on('click', '#cardListEntrySubmit', function(event) {
        event.preventDefault();
        window.mainController.parseCardList();
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
        $('#status-filter').val('all');
    });

    $('#storageClear').on('click', function(e) {
        window.mainController.clearAndReload();
    });

    $('#color-filter').on('change', function() {
        const value = $(this).val();
        if(value == 'all'){
            window.mainController.state.filters.color = null;
        }else{
            window.mainController.state.filters.color = value;
        }
        window.mainController.saveState();
        window.mainController.displayCards();
    });

    $('#rarity-filter').on('change', function() {
        const value = $(this).val();
        if(value == 'all'){
            window.mainController.state.filters.rarity = null;
        }else{
            window.mainController.state.filters.rarity = value;
        }
        window.mainController.saveState();
        window.mainController.displayCards();
    });

    $('#status-filter').on('change', function() {
        const value = $(this).val();
        if(value == 'all'){
            window.mainController.state.filters.status = null;
        }else{
            window.mainController.state.filters.status = value;
        }
        window.mainController.saveState();
        window.mainController.displayCards();
    });

});