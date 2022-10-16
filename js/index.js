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
        this.cardList = [];
        this.groupedCardList = null;
        this.state = {
            'page': 'home',
            'show_rarities': true,
            'show_set_symbols': false,
            'group_order': ['color', 'rarity', 'cmc'],
            'card_status': [
                '&nbsp;',
                '✅',
                '💰',
                '❓'
            ]
        };
        this.loadState();
        this.setBody();
    }

    loadState(){
        if(localStorage.getItem('state')){
            this.cardList = JSON.parse(localStorage.getItem('cardList'));
            this.state = JSON.parse(localStorage.getItem('state'));
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
        var cardname = '';
        var typedName = '';
        var quantity = '';
        var searchQuery = '';
        var url = '';
        var newCard = {};
        var scrycard = null;
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
            newCard = {
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


            searchQuery = encodeURI('?unique=print&q=!"' + cardname + '"');
            url = 'https://api.scryfall.com/cards/search' + searchQuery;

            console.log('going to scryfall for ' + typedName + ' (' + cardname + ')');
            await fetch(url)
                .then((response) => response.json())
                .then((data) => {
                    var response_status = data.status || 200;
                    var firstFace = {};
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

            cardList.push(newCard);
            if(i < typedList.length -1){
                await delay(100);
            }
        }

        this.cardList = this.cardList.concat(cardList);
        for (var i = 0; i < this.cardList.length; i++) {
            this.cardList[i].index = i;
        }
        this.groupedCardList = null;
        this.saveState();
        this.displayCards();
    }

    displayCards(){
        // TODO: make this respect a given sorting order
        this.groupedCardList = null;
        this.groupedCardList = this.sortCardsByColor();
        this.groupedCardList = this.sortCardsByRarity();
        this.populateDisplayList();
    }

    flattenGroup(group=null){
        var result = [];
        if(group === null){
            group = JSON.parse(JSON.stringify(this.groupedCardList));
        }else{
            group = JSON.parse(JSON.stringify(group));
        }

        for (const [key, value] of Object.entries(group)) {
            if(value.constructor !== Array){
                value = this.flattenGroup(value);
            }
            result = result.concat(value);
        }

        return result;
    }

    populateDisplayList(){
        console.log('calling populateDisplayList')
        var cardList = [];
        if(this.groupedCardList != null){
            cardList = this.flattenGroup();
        }else{
            cardList = this.cardList;
        }



        var displayList = [];

        var card = {};
        var cardDiv = '';
        var rarityDiv = '';
        var cardRarities = [];
        var cardStatus = '';
        for (var i = 0; i < cardList.length; i++) {
            card = cardList[i];
            if(!card.scryfound){
                continue;
            }

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
    }

    sortCardsByColor(cardList=null){
        console.log('sorting cards by color')
        if(cardList === null){
            cardList = this.groupedCardList || this.cardList;
            cardList = JSON.parse(JSON.stringify(cardList));
        }else{
            cardList = JSON.parse(JSON.stringify(cardList));
        }

        var result = {};

        if(cardList.constructor != Array){
            for (const [key, value] of Object.entries(cardList)) {
                result[key] = this.sortCardsByColor(value);
            }
            this.groupedCardList = result;
            return;
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
            card = cardList[i];

            if(card.is_land === true){
                result['land'].push(card);
            }else if(card.color === null){
                result['c'].push(card);
            }else if(card.color.length == 0){
                result['c'].push(card);
            }else if(card.color.length > 1){
                result['multi'].push(card);
            }else{
                result[card.color].push(card);
            }

        }

        var removeKeys = [];
        for (const [key, value] of Object.entries(result)) {
            if(value.length < 1){
                removeKeys.push(key);
            }
        }
        for (var i = 0; i < removeKeys.length; i++) {
            delete result[removeKeys[i]];
        }

        return result;
    }


    sortCardsByRarity(cardList=null){
        console.log('sorting cards by rarities')
        if(cardList === null){
            cardList = this.groupedCardList || this.cardList;
            cardList = JSON.parse(JSON.stringify(cardList));
        }else{
            cardList = JSON.parse(JSON.stringify(cardList));
        }

        var result = {};
        if(cardList.constructor != Array){
            for (const [key, value] of Object.entries(cardList)) {
                result[key] = this.sortCardsByRarity(value);
            }
            this.groupedCardList = result;
            return;
        }


        result = {
            'common': [],
            'uncommon': [],
            'rare': [],
            'mythic': []
        };

        for (var i = 0; i < cardList.length; i++) {
            result[cardList[i].rarities[0]].push(cardList[i]);
        }



        var removeKeys = [];
        for (const [key, value] of Object.entries(result)) {
            if(value.length < 1){
                removeKeys.push(key);
            }
        }
        for (var i = 0; i < removeKeys.length; i++) {
            delete result[removeKeys[i]];
        }

        return result;
    }

}



$(function() {
    window.mainController = window.mainController || 1;
    if(window.mainController == 1){
        window.mainController = new MainController;
    }

    $('body').on('click', '#cardListEntrySubmit', function(event) {
        event.preventDefault();
        window.mainController.parseCardList();
    });

    $('#displayList').on('click', '.card-div', function(e) {
        var cardIndex = parseInt($(this).attr('card_index'));
        var currentStatus = window.mainController.cardList[cardIndex].status;
        var statusIndex = window.mainController.card_status.indexOf(currentStatus);
        var newStatus = '';
        var newStatusIndex = 0;
        if(statusIndex == window.mainController.card_status.length - 1){
            newStatusIndex = 0;
        }else{
            newStatusIndex = statusIndex + 1;
        }
        newStatus = window.mainController.card_status[newStatusIndex];
        window.mainController.cardList[cardIndex].status = newStatus;
        $(this).children('.status-icon').html(newStatus);
        window.mainController.saveState();
    });

    $('#cardListClear').on('click', function(e) {
        window.mainController.clearCardList();
    });
});