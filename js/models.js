window.mainModels = {
    'card_outer': `
        <div class="col-sm-6 col-md-3 col-lg-2 card-div-wrapper" card_index="%%card_index%%">
            %%card_inner%%
        </div>`,

    'card_inner': `
        <span class="btn btn-light card-version-selector"><i class="bi bi-three-dots"></i></span>
        <div class="card-div" card_index="%%card_index%%">
            <img src="%%card_image%%" alt="%%card_name%%">
            <div class="status-icon">%%status_symbol%%</div>
            <div class="quantity-row">
              <div class="col-sm-2 quantity-box">%%card_quantity%%</div>
            </div>
           <div class="rarity-row">
              %%rarities%%
           </div> 
        </div>
    `,

    'rarity': `
        <div class="rarity-symbol">
            <img src="img/mtg_%%rarity_letter%%.png">
        </div>
    `, 

    'rarity_set': `
        <div class="rarity-symbol">
            <img src="%%src%%" class="set-icon modern-%%rarity%%" alt="%%alt%%">
        </div>`,

    'status_filter': `
        <div class="form-check form-switch">
          <input id="filterStatus%%status%%" class="form-check-input status-filter-switch" type="checkbox" role="switch">
          <label class="form-check-label status-filter-label" for="filterStatus%%status%%">
            <span class="status-filter-text">%%status_display%%</span>
          </label>
        </div>
    `,

    'status_element': `
        <div class="status-button-group-wrapper">
            <div class="btn-group" role="group" status_value="%%status%%" status_index="%%status_index%%">
              <button type="button" class="btn btn-outline-secondary status-options-btn-display" disabled>%%status%%</button>
              <button type="button" class="btn btn-outline-secondary status-options-btn-up"><i class="bi bi-arrow-up"></i></button>
              <button type="button" class="btn btn-outline-secondary status-options-btn-down"><i class="bi bi-arrow-down"></i></button>
              <button type="button" class="btn btn-outline-secondary status-options-btn-remove"><i class="bi bi-trash-fill"></i></button>
            </div>
        </div>
    `,

    'status_add': `
        <div class="status-button-group-wrapper">
            <button type="button" class="btn btn-outline-secondary status-options-btn-add"><i class="bi bi-plus-circle"></i></button>
        </div>
    `, 

    'status_emoji': `
        <button type="button" class="btn btn-outline-secondary btn-emoji-suggestion">%%status%%</button>
    `,

    'sorter_switch': `
        <div class="form-check form-switch sorter-switch-wrapper" sort_value="%%sort%%">
          <input id="sorter%%sort%%" class="form-check-input sorter-switch" type="checkbox" role="switch">
          <label class="form-check-label sorter-switch-label" for="sorter%%sort%%">%%sort_display%%</label>
        </div>
    `,

    'version_select_item': `
        <div class="col-sm-12 col-md-6 col-lg-3 selectCardHolder" code="%%code%%" card_index="%%index%%">
          <img src="%%image%%" alt="%%code%%">
        </div>
    `
};