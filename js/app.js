let filterObject = {
    platformType: 1,
    activationsFilter: {},
    seriesFilter: {},
    labelsFilter: {},
    genresFilter: {},
    sortType: '',
    search: '',
    page: 1
}

let lastPaymentMethod = 0;

async function sendRequest(url, type, data, beforeSend = () => {}) {
    return $.ajax({
        url,
        type,
        dataType: 'json',
        data,
        beforeSend
    });
}

async function sendJsonRequest(url, type, data, beforeSend = () => {}) {
    return $.ajax({
        url,
        type,
        dataType: 'json',
        contentType: 'application/json',
        data,
        beforeSend
    });
}

function btnLoading(btn, loading) {
    loading ? $(btn).addClass('loading').append('<i class="fas fa-spinner fa-spin"></i>') : $(btn).removeClass('loading').find('.fa-spinner').remove();
}

function filter() {
    let catalogContainer = $('.catalog-items');
    let showMoreButton = $('.catalog-more button');
    sendJsonRequest('/catalog?act=filter&ajaxRequest', 'POST', JSON.stringify(filterObject), () => {
            catalogContainer.addClass('loading');
        })
        .then(function (data) {
            catalogContainer.removeClass('loading');
            btnLoading(showMoreButton, false);
            if (data.status == 'success') {
                data.quantity == 0 ? $('.no-items').show() : $('.no-items').hide();
                data.nextPage > data.lastPage ? $('.catalog-more').hide() : $('.catalog-more').show();

                if (data.nextPage > 2) {
                    catalogContainer.append(data.html);
                    showMoreButton.data('page', data.nextPage);
                } else {
                    catalogContainer.html(data.html);
                    showMoreButton.data('page', 2);
                }
            } else {
               
            }
        })
        .catch(function () {
            showMoreButton.removeClass('loading').find('.sk-fading-circle').remove();
            catalogContainer.removeClass('loading');
        });
}

function priceCalculation() {
    let priceWithDiscount = $('.price-with-discount-value');
    let price = priceWithDiscount.length > 0 ? priceWithDiscount.find('span').html() : parseInt($('.price-value span').html());
    let promo = parseInt($('.promo-value span').html());
    let total = $('.total-amount-value span');
    let bonus = $('.bonus-value');
    if(bonus.length > 0) {
        if($('.balance-pay-btn').hasClass('active')) {
            let bonusValue = parseInt(bonus.find('span').html());
            price = Math.round(price - bonusValue);
        }
    }
    if(promo > 0) {
        price = Math.round(price - price * promo / 100);
    } 
    total.html(price);
}

function calculateFinalPrice(price, markup, serviceComission, commission, applyDiscounts) {
    let promo = applyDiscounts ? parseInt($('.promo-value span').html()) : 0,
        bonusValue = applyDiscounts ? parseInt($('.bonus-value span').html()) : 0,
        finalPrice = price + price * serviceComission / 100;
    
    promo = Number.isNaN(promo) ? 0 : promo; 
    bonusValue = Number.isNaN(bonusValue) ? 0 : bonusValue;
    finalPrice = Math.round(finalPrice + finalPrice * markup / 100);
    let commission1 = finalPrice * commission / 100;
    finalPrice = Math.round(finalPrice + commission1);
    let commission2 = finalPrice * commission / 100;
    finalPrice = Math.round(finalPrice - (commission2 - commission1));
    finalPrice = parseInt(finalPrice.toString().slice(0, -1) + '9', 10);
    finalPrice = Math.round(finalPrice - finalPrice * promo / 100 - bonusValue);
    return finalPrice;
}

function setRegionsPrices(markup, serviceComission, commission) {
    if (markup === undefined || commission === undefined || serviceComission === undefined) {
        const method = $('.purchase-paymethod.selected');
        markup = parseFloat(method.data('markup'));
        commission = parseFloat(method.data('commission')),
        serviceComission = parseFloat(method.data('service-commission'));
    }

    const regionsDisplay = $('.steam-more-info-block').length > 0 && $('.steam-more-info-block').is(':visible');
    if(regionsDisplay) {
        $('.steam-more-info-block .form-check-input').each((i, region) => {
            const regionNetPrice = parseInt($(region).data('net-price')),
                  regionTotalPrice = calculateFinalPrice(regionNetPrice, markup, serviceComission, commission, false);
            $(region).data('price', regionTotalPrice);
            $(region).parents('.form-check').find('.form-check-label span').html(regionTotalPrice);
        }); 
    }
}
 
function checkPaymentsMethods() {
    let netPrice = 0;
    const random = $('#purchaseGame').hasClass('random'),
          isGift = $('.purchase-info_activations__list___item.selected').data('gift'),
          regionsDisplay = $('.steam-more-info-block').length > 0 && $('.steam-more-info-block').is(':visible');

    if(regionsDisplay) {
        netPrice = $('.form-check-input:checked').data('net-price');
    } else {
        netPrice = $('#depositBalanceModal').length > 0 ? parseInt($('#depositBalanceModal .step-2 .font-weight-bold').html()) : parseInt($('.purchase-info_activations__list___item.selected').data('net-price'));
    }

    const items = $('.purchase-paymethod:not(.ecoin-method)');
    items.each((i, el) => {
        const $item = $(el),
            minAmount = parseFloat($item.data('min-amount')) || 0,
            markup = parseFloat($item.data('markup')) || 0,
            commission = parseFloat($item.data('commission')) || 0,
            serviceCommission = parseFloat($item.data('service-commission')) || 0,
            totalPrice = random ? parseInt($('.purchase-info_activations__list___item.selected').data('price')) : calculateFinalPrice(netPrice, markup, serviceCommission, commission, true);
        if (!random) $item.find('.purchase-paymethod_div__info span').html(totalPrice);

        const isMinAmountValid = minAmount <= totalPrice;

        const $parentCol = $item.parents('.col-6');
        const isGiftMethod = $parentCol.hasClass('payment-method-for-gift');
        const shouldShow = isGift && !random ? isGiftMethod && isMinAmountValid : !isGiftMethod && isMinAmountValid;

        shouldShow ? $parentCol.show() : $parentCol.hide().find('.purchase-paymethod').removeClass('selected');
    });

    if ($('.purchase-paymethod.selected').length === 0) {
        let firstVisibleItem = items.filter(':visible').eq(0);
        if (firstVisibleItem.length) { 
            let id = firstVisibleItem.data('id');
            firstVisibleItem.addClass('selected');
            $('#payment-method-id').val(id);
        }
    }
}

function checkUserBalance() {
    let priceWithDiscount = $('.price-with-discount-value');
    let price = 0;
    let promoTableRow = $('.purchase-form-prices-row.promo');
    if(promoTableRow.find('span').html() == '') {
        price = priceWithDiscount.length > 0 ? priceWithDiscount.find('span').html() : parseInt($('.price-value span').html());
    } else {
        price = parseInt($('.total-amount-value span').html());
    }
    const userBalance = parseInt($('.app-nav-balance.ecoin-balance span').html());
    const payBonusBtn = $('.balance-pay-btn');
    if (userBalance >= price) {
        payBonusBtn.data('value', price);
        payBonusBtn.find('i:not(.icon)').html(price);
    } else {
        payBonusBtn.data('value', userBalance);
        payBonusBtn.find('i:not(.icon)').html(userBalance);
    }
}

function resetBalancePay() {
    const payBonusBtn = $('.balance-pay-btn'),
          priceElement = $('.total-amount-value span'),
          random = $('#purchaseGame').hasClass('random');
    let bonusValue = parseInt(payBonusBtn.data('value'));
    let price = parseInt(priceElement.html());
    payBonusBtn.find('span').html('Учесть');
    payBonusBtn.removeClass('active').addClass('gray');
    $('.bonus-value span').html('');
    $('.bonus').hide();
    let newPrice = Math.round(price + bonusValue);
    priceElement.html(newPrice);
    $('.purchase-paymethod:not(.ecoin-method)').parents('.col-6').show();
    $('.purchase-paymethod.ecoin-method').removeClass('selected').parents('.col-6').hide();
    checkPaymentsMethods();
    // let firstVisibleItem = $('.purchase-paymethod:not(.ecoin-method)').filter(':visible').eq(0);
    // $('.purchase-paymethods-list .purchase-paymethod').removeClass('selected');
    // firstVisibleItem.addClass('selected');
    // $('#payment-method-id').val(firstVisibleItem.data('id'));
}

function showError(title, msg) {
    let modal = $('#errorModal');
    modal.find('.swal2-title').html(title);
    modal.find('.swal2-html-container').html(msg);
    modal.modal('show');
}

function checkCasePayoutsMethods() {
    const items = $('#withdrawForm li'),
          priceInt = parseInt($('.box-drops_drop__price span').html());

    $('#withdrawDripBtn').prop('disabled', false);
    items.each(function (){
        item = $(this).find('a');
        minAmount = parseInt(item.data('minamount'));
        container = $(item.attr('href'));
        if(priceInt < minAmount) {
            if(item.hasClass('active')) {
                $('#withdrawDripBtn').prop('disabled', true);
            } 
            container.find('input').prop('disabled', true);
        }
    });
}

$(document).ready(function () {
    let platformType = 1;
    if($('#catalog .nav-link.active').length > 0) {
        platformType = $('#catalog .nav-link.active').data('id');
    }

    filterObject.platformType = platformType;

    Math.rand = function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    $('.roulette-carret.slow').css('transform', 'translate3d(-3413px, 0px, 0px)');

    if($('#goPayModal').length > 0) {
       $('#goPayModal').modal('show');
    }

    $('.question-popover').popover();

    if ($('.fancybox').length > 0) {
        $('.fancybox').fancybox({
            openEffect: 'none',
            closeEffect: 'none',
            helpers: {
                media: {}
            }
        });
    }

    if($('.chance-slider').length > 0) {
        $('.chance-slider').jRange({
            from: 1,
            to: 5,
            step: 1,
            scale: ['x1','x2','x3','x4','x5'],
            format: '%s',
            width: 160,
            showLabels: false,
            snap: true,
            onstatechange: function(e) {
                let buyBtn = $('.box-buy-btn');
                let buyChance = $('.box-chance-value');
                let chance = parseInt(e);
                let price = parseInt(buyBtn.data('price'));
                let newPrice = (chance * price).toFixed();
                buyChance.html(`x${chance}`);
                buyBtn.data('chance', chance);
                buyBtn.removeClass('chanced-color-1 chanced-color-2 chanced-color-3 chanced-color-4 chanced-color-5');
                buyChance.removeClass('box-chance-value_1 box-chance-value_2 box-chance-value_3 box-chance-value_4 box-chance-value_5');
                buyBtn.find('span').html(newPrice);
                buyBtn.addClass(`chanced-color-${chance}`);
                buyChance.addClass(`box-chance-value_${chance}`);
                if(chance > 1) {
                    $('.box-chance-info').hide();
                    $('.box-chance-plus').html(`+${(newPrice - price).toFixed()}₽`);
                    $('.box-chance-plus').show();
                } else {
                    $('.box-chance-info').show();
                    $('.box-chance-plus').html('');
                    $('.box-chance-plus').hide();
                }
            }
        });
    }

    $(this).on('click', '.slider-container .scale span', function (e) {
        let element = $(this);
        let index = element.index() + 1;
        $('.chance-slider').jRange('setValue', index.toString());
    });

    if ($('.order-page').length > 0) {
        setInterval(() => {
            let url = `${window.location.href}?act=check&ajaxRequest`;
            sendRequest(url, 'GET', {})
                .then(function (data) {
                    if (data.status == 'success') {
                        window.location.reload();
                    }
                });
        }, 2000);
    }

    if ($('.time').length > 0) {
        $('.time').each(function () {
            let item = $(this);
            item.countdown({
                seconds: item.data('time'),
            });
        });
    }
    
    $(this).on('click', 'body', function (e) {
        let search = $('.searchForm');

        if ((!search.is(e.target) && search.has(e.target).length === 0)) {
            $('.searchForm .fa-search').show();
            $('.searchForm .fa-spinner').hide();
            $('.search-result').hide();
            $('#searchForm').val('');
        }
    });

    $('.ecoin-balance, .case-balance').tooltip();

    $(this).on('click', '#depositBalanceModal .nav-btn', function (e) {
        const stepElement = $('#depositBalanceVue'),
              step = stepElement.data('step'),
              progressBar = $('#depositBalanceProgressBar'),
              stepText = $('.purchase-step-heading .step'),
              modalTitle = $('.deposit-modal-title'),
              prevButton = $('#depositBalanceModal .prev-btn'),
              modalFooter = $('#depositBalanceModal .modal-footer-inner'),
              amountElement = $('#depositBalanceAmountInput'),
              amount = $('.step-2 .font-weight-bold'),
              btn = $(this);

        if(step == 1) {
            if(amountElement.val() >= 100) {
                $('.step-1 .invalid-feedback').hide();
                amountElement.removeClass('is-invalid');
                stepElement.data('step', 2);
                stepText.html('2');
                modalTitle.html('Выберите способ оплаты');
                btn.find('span').html('Оформить заказ');
                progressBar.css('width', '50%');
                prevButton.show();
                modalFooter.removeClass('justify-content-end').addClass('justify-content-between');
                amount.html(amountElement.val() + ' ₽');
                $('.step-1').hide();
                $('.step-2').show();
                checkPaymentsMethods();
            } else {
                amountElement.addClass('is-invalid');
                $('.step-1 .invalid-feedback').show();
            }
        }

        if(step == 2) {
            if(btn.hasClass('prev-btn')) {
                stepElement.data('step', 1);
                stepText.html('1');
                modalTitle.html('Введите сумму пополнения баланса');
                btn.find('span').html('Продолжить');
                progressBar.css('width', '33.3333%');
                prevButton.hide();
                modalFooter.removeClass('justify-content-between').addClass('justify-content-end');
                amount.html('100 ₽');
                $('.step-1').show();
                $('.step-2').hide();
                checkPaymentsMethods();
            } else {
                const alert = $('.step-2 .alert');
                const url = '/checkout?act=deposit&ajaxRequest';
                const data = {
                    amount: amountElement.val(),
                    method: $('#payment-method-id').val()
                };
                sendRequest(url, 'GET', data, beforeSend = () => {
                    btnLoading(btn, true);
                }).then(function (data) {
                        btnLoading(btn, false);
                        if (data.status == 'success') {
                            alert.html('').hide();
                            $('#depositBalanceModal .modal-footer').hide();
                            progressBar.css('width', '100%');
                            stepElement.data('step', 3);
                            stepText.html('3');
                            modalTitle.html('Оплатите заказ');
                            $('.deposit-order-id').html(data.id);
                            $('.deposit-link').attr('href', data.url);
                            $('.step-2').hide();
                            $('.step-3').show();
                        } else {
                            alert.html(data.msg).show();
                        }
                    })
                    .catch(function (e) {
                        btnLoading(btn, false);
                        alert.html('Ошибка загрузки').show();
                    });
            }
        }
    });
    

    $(this).on('input', '#searchForm', function (e) {
        const text = $(this).val().trim();
        const ajaxUrl = '/search?act=search&ajaxRequest';
        if(text.length >= 3) {
            sendJsonRequest(ajaxUrl, 'POST', JSON.stringify({text}), beforeSend = () => {
                $('.searchForm .fa-search').hide();
                $('.searchForm .fa-spinner').show();
            })
            .then(function (data) {
                $('.searchForm .fa-search').show();
                $('.searchForm .fa-spinner').hide();
                if (data.status == 'success') {
                    if(data.quantity > 0) {
                        $('.search-result').html(data.html);
                        $('.search-result').show();
                    } else {
                        $('.search-result').hide();
                    }
                }
            })
            .catch(function () {
                $('.searchForm .fa-search').show();
                $('.searchForm .fa-spinner').hide();
            });
        } else {
            $('.searchForm .fa-search').show();
            $('.searchForm .fa-spinner').hide();
            $('.search-result').hide();
        }
    });

    $(this).on('click', '.index-game-filter-toggle', function (e) {
        $(this).toggleClass('shown');
        $(this).hasClass('shown') ? $('.catalog-filter').show() : $('.catalog-filter').hide();
    });

    $(this).on('click', '.box-buy-btn', function (e) {
        let btn = $(this);
        if(btn.attr('href') == '#') {
            e.preventDefault();
            let data = {chance: btn.data('chance')};
            let url = `${window.location.href}?act=checkout&ajaxRequest`;
            sendRequest(url, 'GET', data, beforeSend = () => {
                btnLoading(btn, true);
            }).then(function (data) {
                    btnLoading(btn, false);
                    if (data.status == 'success') {
                        window.location.href = '/order/' + data.id;
                    } else if(data.errorType == 2){
                        window.location.href = '/auth';
                    } else if(data.errorType == 1) {
                        $('#depositBalanceModal').modal('show');
                    } else {
                        showError('Ошибка', data.msg);
                    }
                })
                .catch(function (e) {
                    btnLoading(btn, false);
                    showError('Ошибка', 'Ошибка загрузки');
                });
        }
    });

    $(this).on('click', '.anchor-link', function (e) {
        var id = $(this).attr('href');
        $('html, body').animate({
            scrollTop: $(id).offset().top
        }, 500);
        return false;
    });

    $(this).on('click', '.index-game-series .index-game-series_item', function (e) {
        $(this).toggleClass('selected');
        let id = $(this).data('target');
        if ($(this).hasClass('selected')) {
            filterObject.seriesFilter[id] = id;
        } else {
            if (filterObject.seriesFilter[id] != undefined) {
                delete filterObject.seriesFilter[id];
            }
        }
        filterObject.page = 1;
        filter();
    });

    $(this).on('click', '.catalog-more:not(.not-catalog) button', function (e) {
        filterObject.page = $(this).data('page');
        btnLoading(this, true);
        filter();
    });

    $(this).on('click', '.catalog-filter-sorting .catalog-filter-sorting-item', function (e) {
        $('.catalog-filter-sorting .catalog-filter-sorting-item').removeClass('selected');
        $(this).addClass('selected');
        filterObject.sortType = $(this).data('target');
        filterObject.page = 1;
        filter();
    });

    $(this).on('input', '.catalog-search-input', function (e) {
        const text = $(this).val().trim();
        if(text.length >= 3) {
            filterObject.search = text;
            filter();
        } else {
            if($('body').hasClass('home-catalog')) {
                if(text == '') {
                    filterObject.search = '';
                    filter();
                }
            } else {
                $('.catalog-more').hide();
                $('.no-items').show();
            }
        }
    });

    $(this).on('blur', '#steam_link', function (e) {
        let steamURLRegex = /^(https?:\/\/)?(www\.)?steamcommunity\.com\/(id|profiles)\/[a-zA-Z0-9-_]+(\/)?$/;
    
        if(steamURLRegex.test($(this).val().trim())) {
            $(this).addClass('is-valid').removeClass('is-invalid');
        } else {
            $(this).addClass('is-invalid').removeClass('is-valid');
        }
    });

    $(this).on('input', '#promo', function (e) {
        let promoInput = $(this);
        let promocode = promoInput.val();
        let url = `${window.location.href}&act=checkPromo&ajaxRequest`;
        let promoContainer = promoInput.parents('.purchase-promo');
        let promoTableRow = $('.purchase-form-prices-row.promo');
        if($(this).val().length >= 3) {
            sendRequest(url, 'POST', {promocode}, () => {
                promoContainer.find('.fa-spinner').show();
            })
            .then(function (data) {
                promoContainer.find('.fa-spinner').hide();
                if (data.status == 'success') {
                    promoInput.removeClass('is-invalid').addClass('is-valid');
                    promoContainer.find('.invalid-feedback').hide();
                    promoContainer.find('.valid-feedback').show();
                    promoTableRow.show();
                    promoTableRow.find('span').html(data.promocodePercent);
                } else {
                    promoContainer.find('.valid-feedback').hide();
                    promoInput.removeClass('is-valid').addClass('is-invalid');
                    promoContainer.find('.invalid-feedback').html(data.msg).show();
                    promoTableRow.find('span').html('');
                    promoTableRow.hide();
                }
                resetBalancePay();
                priceCalculation();
                checkPaymentsMethods();
                checkUserBalance();
            })
            .catch(function () {
                promoContainer.find('.fa-spinner').hide();
                promoContainer.find('.valid-feedback').hide();
                promoContainer.find('.invalid-feedback').html('Ошибка загрузки').show();
            });
        } else {
            promoInput.removeClass('is-invalid is-valid');
            promoContainer.find('.invalid-feedback').hide();
            promoContainer.find('.valid-feedback').hide();
            promoTableRow.find('span').html('');
            promoTableRow.hide();
            if(lastPaymentMethod != 0) {
                $(`.purchase-paymethod[data-id="${lastPaymentMethod}"]`).addClass('selected');
                $('#payment-method-id').val(lastPaymentMethod);
                lastPaymentMethod = 0;
            }
            resetBalancePay();
            priceCalculation();
            checkPaymentsMethods();
            checkUserBalance();
        }
    });

    $(this).on('click', '.balance-pay-btn', function (e) {
        let bonusValue = parseInt($(this).data('value'));
        $(this).toggleClass('active');
        const priceElement = $('.total-amount-value span');
        let price = parseInt(priceElement.html());
        if ($(this).hasClass('active')) {
            $(this).find('span').html('Учтено');
            $(this).removeClass('gray');
            $('.bonus-value span').html(bonusValue);
            $('.bonus').show();
            let newPrice = Math.round(price - bonusValue);
            priceElement.html(newPrice);
            if (bonusValue >= price) {
                lastPaymentMethod = $('.purchase-paymethod.selected').data('id');
                $('.purchase-paymethod:not(.ecoin-method)').removeClass('selected').parents('.col-6').hide();
                $('.purchase-paymethod:not(.ecoin-method)').parents('.col-6').hide();
                $('.purchase-paymethod.ecoin-method').addClass('selected').parents('.col-6').show();
                // $('#payment-method-id').val('');
            } else {
                checkPaymentsMethods();
            }
        } else {
            if(lastPaymentMethod != 0) {
                $(`.purchase-paymethod[data-id="${lastPaymentMethod}"]`).addClass('selected');
                $('#payment-method-id').val(lastPaymentMethod);
                lastPaymentMethod = 0;
            }
            resetBalancePay();
            checkPaymentsMethods();
        }
    });

    $(this).on('click', '.activations-filter .catalog-filter-selector_list__item', function (e) {
        $(this).toggleClass('selected');
        let id = $(this).data('target');
        if ($(this).hasClass('selected')) {
            filterObject.activationsFilter[id] = id;
        } else {
            if (filterObject.activationsFilter[id] != undefined) {
                delete filterObject.activationsFilter[id];
            }
        }
        filterObject.page = 1;
        filter();
    });

    $(this).on('click', '.genres-filter .catalog-filter-selector_list__item', function (e) {
        $(this).toggleClass('selected');
        let id = $(this).data('target');
        if ($(this).hasClass('selected')) {
            filterObject.genresFilter[id] = id;
        } else {
            if (filterObject.genresFilter[id] != undefined) {
                delete filterObject.genresFilter[id];
            }
        }
        filterObject.page = 1;
        filter();
    });

    $(this).on('click', '#catalog .nav-link', function (e) {
        const platformType = $(this).data('id');
        if(platformType != undefined) {
            switch (platformType) {
                case 1:
                    $('.activations-filter .catalog-filter-selector_list__item.pc').show();
                    $('.activations-filter .catalog-filter-selector_list__item.console').hide();
                    $('.activations-filter .catalog-filter-selector_list__item.money').hide();
                    $('.index-game-series').removeClass('disabled');
                    $('.genres-filter-catalog').show();
                    $('#catalogGames').show();
                    break;

                case 2:
                    $('.activations-filter .catalog-filter-selector_list__item.pc').hide();
                    $('.activations-filter .catalog-filter-selector_list__item.console').show();
                    $('.activations-filter .catalog-filter-selector_list__item.money').hide();
                    $('.index-game-series').removeClass('disabled');
                    $('.genres-filter-catalog').show();
                    $('#catalogGames').show();
                    break;

                case 3:
                    $('.activations-filter .catalog-filter-selector_list__item.pc').hide();
                    $('.activations-filter .catalog-filter-selector_list__item.console').hide();
                    $('.activations-filter .catalog-filter-selector_list__item.money').show();
                    $('.index-game-series').addClass('disabled');
                    $('.genres-filter-catalog').hide();
                    $('#catalogGames').hide();
                    break;
            }
            filterObject.platformType = platformType;
            filterObject.page = 1;
            filterObject.activationsFilter = {};
            filterObject.seriesFilter = {};
            filterObject.search = '';
            $('.activations-filter .catalog-filter-selector_list__item').removeClass('active');
            $('.index-game-series .index-game-series_item').removeClass('active');
            filter();
        }
    });

    $(this).on('click', '.game-mode-switcher .game-mode-switcher_toggle', function (e) {
        e.preventDefault();
        let text;
        let oldText;
        $('#gameModeSwitcherDiv').toggleClass('sale-mode');
        let buyBtn = $('.checkout-btn');
        let url = buyBtn.attr('href');
        if(buyBtn.data('text') != '') {
            text = buyBtn.data('text');
            oldText = buyBtn.find('span').html();
            buyBtn.data('text', oldText);
            buyBtn.find('span').html(text);
        }
        if(!$('#gameModeSwitcherDiv').hasClass('sale-mode')) {
            $('.game-content-buy_prices').removeClass('sell').addClass('random');
            $('#gameModeBanner').removeClass('sell').addClass('random');
            url = url + '&random';
            if(buyBtn.data('text') != '') {
                buyBtn.find('i').removeClass('fa-shopping-cart').addClass('fa-dice');
            }
        } else {
            $('.game-content-buy_prices').addClass('sell').removeClass('random');
            $('#gameModeBanner').addClass('sell').removeClass('random');
            url = url.replace('&random', '');
            if(buyBtn.data('text') != '') {
                buyBtn.find('i').addClass('fa-shopping-cart').removeClass('fa-dice');
            }
        }
        buyBtn.attr('href', url);
    });

    $(this).on('click', '.purchase-info_activations__list .purchase-info_activations__list___item', function (e) {
        e.preventDefault();
        let steamMoreInfoContainer = $('.steam-more-info-block');

        steamMoreInfoContainer.length > 0 && $(this).data('id') == 1 ? steamMoreInfoContainer.show() : steamMoreInfoContainer.hide();

        $('.purchase-info_activations__list .purchase-info_activations__list___item').removeClass('selected');
        $('.purchase-info_activations__list .purchase-info_activations__list___item').find('.fa-check-circle').remove();
        $(this).addClass('selected');
        $(this).prepend('<i class="fa fa-sm fa-check-circle"></i>');
        let platformPrice = $(this).data('price');
        let platformOldPrice = $(this).data('old-price');
        let regions = $(this).data('regions');
        let title = $(this).data('title');
        let displayPrice = $('.price-wrapper .price span');
        let oldPrice = $('.price-wrapper .old-price span');
        $('.purchase-info_product__regions span').html(regions);
        $('.product-type span').html(title);
        platformOldPrice == '0' ? displayPrice.html(platformPrice) : oldPrice.html(platformOldPrice);
        if($('.price-with-discount-value').length > 0) {
            $('.price-value span').html(platformOldPrice);
        } else {
            $('.price-value span').html(platformPrice);
        }

        if($('.steam-more-info-block').length > 0) {
            $('.steam-more-info-block .form-check-input').prop('checked', false);
            $('#region-none').prop('checked', true);
        } 

        resetBalancePay();
        priceCalculation();
        checkUserBalance();
        checkPaymentsMethods();

        setRegionsPrices();
    });

    $(this).on('click', '.steam-more-info-block .form-check-input', function (e) {
        const regionPrice = $(this).data('price');

        if($('.price-with-discount-value').length > 0) {
            $('.price-value span').html(regionPrice);
        } else {
            $('.price-value span').html(regionPrice);
        }
        resetBalancePay();
        priceCalculation();
        checkUserBalance();
        checkPaymentsMethods();
    });

    $(this).on('click', '#checkout-btn', function (e) {
        e.preventDefault();
        let btn = $(this);
        const balancePaybtn = $('.balance-pay-btn');
        let userEmail = $('#email');
        let promocode = $('#promo');
        let steamUrl = '';
        let steamRegion = 0;
        let platformId = $('.purchase-info_activations__list___item.selected').data('id');
        let gift = $('.purchase-info_activations__list___item.selected').data('gift');
        let bonusPay = balancePaybtn.hasClass('active') ? 1 : 0;
        let paymentMethodId = $('#payment-method-id').val();
        let url = `${window.location.href}&act=checkout&ajaxRequest`;
        if ($('.steam-more-info-block').length > 0) {
            steamUrl = $('#steam_link').val();
            steamRegion = $('.form-check .form-check-input:checked').val();
        }


        if(userEmail.val().length == 0) {
            return showError('Email', 'Пожалуйста, укажите свой Email.');
        }

        data = {
            userEmail: userEmail.val(),
            promocode: promocode.val(),
            regionId: steamRegion,
            steamUrl,
            platformId,
            paymentMethodId,
            bonusPay,
            gift
        };
        
        let steamURLRegex = /^(https?:\/\/)?(www\.)?steamcommunity\.com\/(id|profiles)\/[a-zA-Z0-9-_]+(\/)?$/;
    
        if($('.steam-more-info-block').length > 0 && platformId == 1) {
            if(!steamURLRegex.test(steamUrl.trim())) {
                return showError('Steam профиль', 'Пожалуйста, укажите ссылку на ваш Steam профиль. Формата https://steamcommunity.com/id/XXXXXXXXXXX, где XXXXXXXXXXX – ваш id в Steam');
            }

            if(steamRegion == 0) {
                return showError('Регион Steam аккаунта', 'Пожалуйста, укажите регион Вашего Steam аккаунта. ');
            }
        }
       
        sendRequest(url, 'GET', data, beforeSend = () => {
            btnLoading(btn, true);
        }).then(function (data) {
                btnLoading(btn, false);
                if (data.status == 'success') {
                    window.location.href = '/order/' + data.id;
                } else if(data.errorType == 2){
                    window.location.href = '/auth/';
                } else {
                    showError('Ошибка', data.msg);
                }
            })
            .catch(function (e) {
                btnLoading(btn, false);
                showError('Ошибка', 'Ошибка загрузки');
            });
    });

    $(this).on('click', '#withdrawDripBtn', function(e) {
        e.preventDefault();
        const methodId = $('#withdrawForm .nav-link.active').data('id')
              field = $('#withdrawModal .tab-pane.active input')
              wallet = field.val(),
              btn = $(this);

        if(wallet.length > 3) {
            field.removeClass('is-invalid');
            $('#withdrawModal .tab-pane.active .form-group small').html('').removeClass('text-danger').addClass('text-muted');
            let url = window.location.href + '?act=payout&ajaxRequest';

            sendRequest(url, 'GET', {methodId, wallet}, () => {
                    btnLoading(btn, true);
                })
                .then(function (data) {
                    btnLoading(btn, false);
                    if (data.status == 'success') {
                        $('#withdrawModal').modal('hide');
                        setTimeout(() => {
                            showError('Вывод оформлен', 'Вывод производится в ручном режиме и может занимать до 48 часов');
                        }, 100);
                        $('.win-box-title.group1').remove();
                        $('.win-buttons.group1').hide();
                        $('.win-box-title.group2').show();
                        $('.win-buttons.group2').show();
                    } else {
                        field.addClass('is-invalid');
                        $('#withdrawModal .tab-pane.active .form-group small').html(data.msg).addClass('text-danger').removeClass('text-muted');
                    }
                })
                .catch(function (e) {
                    btnLoading(btn, false);
                    showError('Ошибка', 'Ошибка загрузки');
                });
        } else {
            field.addClass('is-invalid');
        }
    });

    $(this).on('click', '#withdrawForm .nav-link', function(e) {
        checkCasePayoutsMethods();
    });

    $(this).on('click', '.pickup-item-btn', function (e) {
        const item = $('.box-drops_drop'),
              title = item.find('.box-drops_drop__name').html(),
              image = item.find('.box-drops_drop__cover img').attr('src'),
              price = item.find('.box-drops_drop__price span').html(),
              modal = $('#withdrawModal');
            
        $('#withdrawModalCover').attr('src', image);
        $('#withdrawModalName').html(title);
        $('#withdrawModalPrice').html(price);
        checkCasePayoutsMethods();
        modal.modal('show');

    });

    $(this).on('click', '.start-roullete:not(.rolling)', function (e) {
        const btn = $(this);
        let url = window.location.href;
        url = url.includes('?') ? `${url}&act=spin&ajaxRequest` : `${url}?act=spin&ajaxRequest`;
        btn.addClass('rolling');

        sendRequest(url, 'GET', {}, () => {
                btnLoading(btn, true);
            })
            .then(function (data) {
                if (data.status == 'success') {
                    const roulleteItems = $('.roulette-wrapper .roulette-carret');
                    const winWrapper = $('.box-winblock');
                    let a = 7536;
                    let b = 10;
                    let c = 145;
                    const animationWidth = Math.rand(a + b, a + c);
                    roulleteItems.removeClass('slow').addClass('rolling').css('transform', `translate3d(-${animationWidth}px, 0px, 0px)`);
                    const winItem = winWrapper.find('.box-drops_drop');
                    const roulleteWinItem = roulleteItems.find('.roulette-item').eq(46);
                    const showPrice = roulleteWinItem.data('show-price');
                    const itemMoney = roulleteWinItem.data('money');
                    setTimeout(() => {
                        roulleteItems.addClass('rolled');
                        roulleteWinItem.addClass('prize');
                    }, 12100);

                    setTimeout(() => {
                        btn.remove();
                        $('.roulette').remove();
                        winItem.find('img').attr('src', roulleteWinItem.find('img').attr('src'));
                        winItem.find('img').attr('alt', roulleteWinItem.find('img').attr('alt'));
                        winItem.find('.box-drops_drop__name').html(roulleteWinItem.find('.roulette-item-title').html());
                        if(winWrapper.hasClass('csgo')) {
                            $('.chance-col').remove();
                            let color = roulleteWinItem.data('color');
                            winItem.find('.box-drops_drop__name').html(roulleteWinItem.find('.roulette-item_name').html());
                            winWrapper.find('.box-drops_drop').css('background-color', `rgba(${color}, 0.1)`);
                            winWrapper.find('.box-drops_drop').css('border-bottom', `3px solid rgb(${color})`);
                            winWrapper.find('.box-drops_drop__price span').css('color', `rgb(${color})`);
                            winWrapper.find('.box-drops_drop__price span').css('box-shadow', `0 2px 15px 2px rgba(${color}, 0.3)`);
                        }
                        // if (roulleteWinItem.find('.activations-list').length > 0) {
                        //     winItem.find('.image').prepend(roulleteWinItem.find('.activations-list'));
                        // }
                        if(showPrice && showPrice != 0) {
                            $('.box-drops_drop__price span').html(`${showPrice} ₽`);
                            $('.box-drops_drop__price').show();
                        } 
                        $('.sell-item-btn span b').html(roulleteWinItem.data('price'));
                        if(itemMoney == 1) {
                            $('.sell-item-btn').remove();
                        }
                        winWrapper.show();
                    }, 13000);
                } else {
                    btnLoading(btn, false);
                    showError('Ошибка', 'Вы уже прокрутили рулетку в другом окне. Пожалуйста дождитесь окончания прокрутки.');
                }
            })
            .catch(function (e) {
                btnLoading(btn, false);
                showError('Ошибка', 'Ошибка загрузки');
            });
    });

    $(this).on('click', '.sell-item-btn', function (e) {
        let url = `${window.location.href}?act=sell&ajaxRequest`;
        const btn = $(this);
        sendRequest(url, 'GET', {}, () => {
            btnLoading(btn, true);
            })
            .then(function (data) {
                btnLoading(btn, false);
                if (data.status == 'success') {
                    $('.win-box-title.group1').remove();
                    $('.win-buttons.group1').hide();
                    $('.win-box-title.group3').show();
                    $('.win-buttons.group2').show();
                    let userBalanceElement;
                    if($('.game-content').hasClass('games-container')) {
                        userBalanceElement = $('.navbar-nav .app-nav-balance.ecoin-balance span');
                    } else {
                        userBalanceElement = $('.navbar-nav .app-nav-balance.case-balance span');
                    }
                    let userBalance = parseInt(userBalanceElement.html()) + data.price;
                    userBalanceElement.html(userBalance);
                } else {
                    showError('Ошибка', data.msg);
                }
            })
            .catch(function () {
                btnLoading(btn, false);
                showError('Ошибка', 'Ошибка загрузки');
            });
    });

    $(this).on('click', '.pick-up-btn', function (e) {
        let url = `${window.location.href}?act=pick-up&ajaxRequest`;
        const btn = $(this);
        sendRequest(url, 'GET', {}, () => {
                btnLoading(btn, true);
            })
            .then(function (data) {
                btnLoading(btn, false);
                if (data.status == 'success') {
                    $('.win-box-title.group1').remove();
                    $('.win-buttons.group1').hide();
                    $('.win-box-title.group2').show();
                    $('.win-buttons.group2').show();
                    if(data.balance != 0) {
                        $('.navbar-nav .app-nav-balance.ecoin-balance span').html(data.balance);
                    }
                } else {
                    showError('Ошибка', data.msg);
                }
            })
            .catch(function () {
                btnLoading(btn, false);
                showError('Ошибка', 'Ошибка загрузки');
            });
    });

    $(this).on('submit', '#get-steam-balance-form', function (e) {
        e.preventDefault();
        let form = $(this),
            url = form.attr('action'),
            method = form.attr('method'),
            btn = form.find('.btn-submit');
        
            data = form.serialize();
            if($('#user-steam-login').val().length > 0) {
            sendRequest(url, method, data, () => {
                    form.find('.form-inner').addClass('loading');
                    btnLoading(btn, true);
                })
                .then(function (data) {
                    form.find('.form-inner').removeClass('loading');
                    btnLoading(btn, false);
                    if (data.status == 'success') {
                        form.find('.alert.alert-danger').hide();
                        $('#getSteamBalanceModal').modal('hide');
                        let html = `<p>Вывод на сумму: ${data.amount}₽ на аккаунт Steam "${data.login}" будет зачислен через несколько минут</p></p>`;
                        if($('.delivery-waithing-text_common').length > 0) {
                            $('.delivery-waithing-text_common').html(html);
                            $('.delivery-waithing-heading').html('Ождиание вывода');
                        } else {
                            if($('.purchase-done-key-content').length > 0) {
                                $('.purchase-done-key-content').html(html);
                            } else {
                                window.location.href = '/my-gifts/' + data.id;
                            }
                        }
                    } else {
                        form.find('.alert.alert-danger').html(data.msg).show();
                    }
                })
                .catch(function () {
                    form.find('.form-inner').removeClass('loading');
                    btnLoading(btn, false);
                    form.find('.alert.alert-danger').html('Ошибка загрузки').show();
                });
            } else {
                form.find('.alert.alert-danger').html('Введите логин Steam').show();
            }
    });
    

    $(this).on('submit', '#submit-more-info', function (e) {
        e.preventDefault();
        let form = $(this),
            url = form.attr('action'),
            method = form.attr('method'),
            btn = form.find('.btn-submit');

        data = form.serialize();
        sendRequest(url, method, data, () => {
                form.find('.form-inner').addClass('loading');
                btnLoading(btn, true);
            })
            .then(function (data) {
                form.find('.form-inner').removeClass('loading');
                btnLoading(btn, false);
                if (data.status == 'success') {
                    form.find('.alert').hide();
                    $('.get-more-info').remove();
                    $('.delivery-waithing-text_common').show();
                    $('#more-info-modal').modal('hide');
                } else {
                    form.find('.alert').html(data.msg).show();
                }
            })
            .catch(function () {
                form.find('.form-inner').removeClass('loading');
                btnLoading(btn, false);
                form.find('.alert').html('Ошибка загрузки').show();
            });
    });

    $(this).on('click', '.submitPaymentMethod', function (e) {
        let btn = $(this),
            url = `${window.location.href}?act=changePaymentMethod&ajaxRequest`,
            methodId = btn.data('id'),
            selectedMethodId = $('.purchase-paymethod.selected').data('id');
        sendRequest(url, 'POST', {methodId}, beforeSend = () => {
            btnLoading(btn, true);
        }).then(function (data) {
                btnLoading(btn, false);
                if (data.status == 'success') {
                    $('.purchase-paymethod').removeClass('selected');
                    $('#changePaymentMethodModal').modal('hide');
                    $('.purchase-paymethod[data-id="' + methodId + '"]').addClass('selected');
                    $('purchase-form-prices-row.cashback .purchase-form-prices-row__value span').html(data.cashback);
                    $('.purchase-form-prices-row.summ .purchase-form-prices-row__value span').html(data.price);
                    let promo = parseInt($('.promo-value span').html()),
                        bonusValue = parseInt($('.bonus-value span').html());

                    if(Number.isNaN(promo) && Number.isNaN(bonusValue)) {
                        $('.purchase-form-prices-row.product-price .purchase-form-prices-row__value span').html(data.price);
                    }
                } 
            })
            .catch(function (e) {
                btnLoading(btn, false);
            });
    });

    $(this).on('click', '.purchase-paymethod:not(.ecoin-method)', function (e) {
        if($('.purchase-paymethods-list').hasClass('order-page')) {
            if(!$(this).hasClass('selected')) {
                $('.submitPaymentMethod').data('id', $(this).data('id'));
                $('#changePaymentMethodModal').modal('show');
            }
        } else {
            const random = $('#purchaseGame').hasClass('random'),
                  totalPrice = parseInt($(this).find('.purchase-paymethod_div__info span').html()),
                  markup = parseFloat($(this).data('markup')),
                  serviceCommission = parseFloat($(this).data('service-commission')),
                  commission = parseFloat($(this).data('commission'));
            if(!random) {
                const regionsDisplay = $('.steam-more-info-block').length > 0 && $('.steam-more-info-block').is(':visible');
                let promo = parseInt($('.promo-value span').html()),
                    bonusValue = parseInt($('.bonus-value span').html()),
                    price = regionsDisplay ? $('.form-check-input:checked').data('net-price') : parseInt($('.purchase-info_activations__list___item.selected').data('net-price'));
                promo = Number.isNaN(promo) ? 0 : promo;
                bonusValue = Number.isNaN(bonusValue) ? 0 : bonusValue;
                price = calculateFinalPrice(price, markup, serviceCommission, commission, false);
                if(promo != 0 || bonusValue != 0) {
                    $('.purchase-form-prices-row__value.price-value span').html(price);
                } else {
                    $('.purchase-form-prices-row__value.price-value span').html(totalPrice);
                }
                $('.total-amount-value span').html(totalPrice);
                setRegionsPrices(markup, serviceCommission, commission);
            }
            $('.purchase-paymethod').removeClass('selected');
            $(this).addClass('selected');
            $('#payment-method-id').val($(this).data('id'));

            //resetBalancePay();
            priceCalculation();
            checkPaymentsMethods();
            checkUserBalance();
        }
    });

    $(this).on('click', '.show-more-wrapper.not-catalog .show-more', function (e) {
        const btn = $(this);
        const page = btn.data('page');
        const itemsContainer = $('.profile-purchase');
        let url = window.location.href;
        url = url.includes('?') ? `${url}&act=showMore&ajaxRequest` : `${url}?act=showMore&ajaxRequest`;
        
        sendJsonRequest(url, 'GET', {page}, () => {
                itemsContainer.addClass('loading');
                btnLoading(btn, true);
            })
            .then(function (data) {
                itemsContainer.removeClass('loading');
                btnLoading(btn, false);
                if (data.status == 'success') {
                    if (data.nextPage > data.lastPage) {
                        $('.show-more-wrapper').hide();
                    } else {
                        $('.show-more-wrapper').show();
                    }
    
                    if (data.nextPage > 2) {
                        itemsContainer.append(data.html);
                        btn.data('page', data.nextPage);
                    } else {
                        itemsContainer.html(data.html);
                        btn.data('page', 2);
                    }
                } else {
                    showError('Ошибка', data.msg);
                }
            })
            .catch(function () {
                btnLoading(btn, false);
                itemsContainer.removeClass('loading');
                showError('Ошибка', 'Ошибка загрузки');
            });
    });

    $(this).on('click', '.cancel-order-btn', function (e) {
        const btn = $(this),
              id = btn.data('id'),
              url = window.location.href + '?act=cancelOrder&ajaxRequest';
        
              sendJsonRequest(url, 'GET', {id}, () => {
                btnLoading(btn, true);
            })
            .then(function (data) {
                btnLoading(btn, false);
                if (data.status == 'success') {
                    btn.parents('tr').remove();
                    $('.app-nav-balance.ecoin-balance span').html(data.balance)
                    $('.profile-info .profile-info-balance_value span').html(data.balance);
                } else {
                    showError('Ошибка', data.msg);
                }
            })
            .catch(function () {
                btnLoading(btn, true);
                showError('Ошибка', 'Ошибка загрузки');
            });
    });

    $(this).on('click', '#submit-orderid .btn-submit', function (e) {
        e.preventDefault();
        let form = $('#submit-orderid'),
            url = form.attr('action') + '?act=checkOrderId&ajaxRequest',
            method = form.attr('method'),
            btn = $(this);

        data = form.serialize();
        sendRequest(url, method, data, () => {
                form.find('.form-inner').addClass('loading');
                btnLoading(btn, true);
            })
            .then(function (data) {
                form.find('.form-inner').removeClass('loading');
                btnLoading(btn, false);
                if (data.status == 'success') {
                    form.submit();
                } else {
                    showError('Ошибка', data.msg);
                }
            })
            .catch(function () {
                form.find('.form-inner').removeClass('loading');
                btnLoading(btn, false);
                showError('Ошибка', 'Ошибка загрузки');
            });
    });

    $(this).on('click', '.gift-steps-step-cards-wrapper', function (e) {
        let card = $(this),
            index = card.index(),
            id = $('.gift-steps').data('id'),
            url = window.location.href + '?act=open&ajaxRequest',
            data = {id, index};

            sendRequest(url, 'POST', data, () => {
                $('.gift-steps-step-cards-wrapper').addClass('fired');
                card.addClass('selected');
            })
            .then(function (data) {
                if (data.status == 'success') {
                    let items = data.items;
                    for (var i = 0; i < items.length; i++) {
                        $('.gift-steps-step-cards-wrapper').eq(i).find('.back img').attr('src', items[i].image);
                        $('.gift-steps-step-cards-wrapper').eq(i).find('.back img').attr('alt', items[i].title);
                    }

                    setTimeout(() => {
                        card.find('.flip-container').addClass('hover');
                        card.find('.back img').css('opacity', 1);
                        $('.gift-steps-step-result .purchase-done-key-heading div').html(data.title);
                        $('.gift-steps-step-result .purchase-done-key-content div').html(data.content);
                        $('.gift-steps-step-result').show();
                        if(data.type == 2) {
                            $('.gift-steps-step-result-info').show();
                        }
                    }, 300);

                    setTimeout(() => {
                        $('.gift-steps-step-cards-wrapper:not(.selected) .flip-container').addClass('hover');
                    }, 1000);
                    
                } else {
                    $('.gift-steps-step-cards-wrapper').removeClass('fired');
                    showError('Ошибка', data.msg);
                }
            })
            .catch(function () {
                $('.gift-steps-step-cards-wrapper').removeClass('fired');
                showError('Ошибка', 'Ошибка загрузки');
            });
    });

    $(this).on('click', '.open-get-steam-balance-modal', function (e) {
        e.preventDefault();
        const amount = $(this).data('amount'),
              id = $(this).data('id'),
              type = $(this).data('type');
        $('#getSteamBalanceModal .steam-balance-amount').html(amount);
        $('#order-for-payout-id').val(id);
        $('#order-for-payout-type').val(type);
        $('#getSteamBalanceModal').modal('show');
    });

    $(this).on('click', '.get-balance-btn', function (e) {
        e.preventDefault();
        const btn = $(this);
        let url = `${window.location.href}?act=getBalance&ajaxRequest`;
        sendRequest(url, 'GET', {}, () => {
                btnLoading(btn, true);
            })
            .then(function (data) {
                btnLoading(btn, false);
                if (data.status == 'success') {
                    btn.remove();
                    $('.purchase-done-key-content p span').remove();
                    $('.app-nav-balance.ecoin-balance span').html(data.balance);
                } else {
                    showError('Ошибка', data.msg);
                }
            })
            .catch(function () {
                btnLoading(btn, false);
                showError('Ошибка', 'Ошибка загрузки');
            });
    });

    $(this).on('submit', '#auth-form', function (e) {
        e.preventDefault();
        let form = $(this);
        let btn = form.find('.btn');
        let email = $('#email');
        if (email.val().length == 0) {
            form.find('.error').html('Введите Ваш email адрес').show();
            email.addClass('is-invalid');
        } else {
            let url = form.attr('action');
            sendRequest(url, 'POST', {
                    email: email.val()
                }, () => {
                    form.find('.form-inner').addClass('loading');
                    btnLoading(btn, true);
                })
                .then(function (data) {
                    btnLoading(btn, false);
                    form.find('.form-inner').removeClass('loading');
                    form.find('.alert').html('').hide();
                    if (data.status == 'success') {
                        $('.auth-screen').remove();
                        $('.success-screen').show();
                        if(data.hasOwnProperty('balance')) {
                            window.location.reload();
                        }
                    } else {
                        if(data.type == 'email') {
                            form.find('.error').html(data.msg).show();
                            email.addClass('is-invalid');
                        } else {
                            form.find('.alert').html(data.msg).show();
                        }
                    }
                })
                .catch(function () {
                    btnLoading(btn, false);
                    form.find('.form-inner').removeClass('loading');
                    form.find('.alert').html('Ошибка загрузки').show();
                });
        }
    });

});