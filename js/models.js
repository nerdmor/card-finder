window.mainModels = {
	'card': `
		<div class="col-sm-6 col-md-3 col-lg-2 card-div" card_index="%%card_index%%">
            <img src="%%img_url%%" alt="%%card_name%%">
            <div class="row rarity-row">
             	<div class="col-sm-2 rarity-symbol quantity-box">%%card_quantity%%</div>
             	%%rarity_row%%
            </div>
            <div class="row status-row">
                <div class="col-12 status-icon">%%status_icon%%</div>
            </div>
        </div>`,
    'rarity': `
    	<div class="col-sm-2 rarity-symbol">
            <img src="img/mtg_%%rarity%%.png">
        </div>`,
    'card_row': `<div class="row mb-3 card_row">%%cards%%</div>`
};