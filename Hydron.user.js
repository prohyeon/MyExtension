// ==UserScript==
// @name         Hydron
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  Adds several sort options
// @author       Graval504
// @match        https://mfront.homeplus.co.kr/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=homeplus.co.kr
// @downloadURL  https://github.com/Graval504/MyExtension/raw/refs/heads/main/Hydron.user.js
// @updateURL    https://github.com/Graval504/MyExtension/raw/refs/heads/main/Hydron.user.js
// @grant        none
// @license      DBAD
// ==/UserScript==

(function() {
    'use strict';
    const ByUnitPrice = 0
    const ByDiscount = 1
    var sortingByUnitPrice = document.createElement('button');
    var sortingByDiscount = document.createElement('button');
    sortingByUnitPrice.textContent="단위가격순"
    sortingByDiscount.textContent="할인율순"
    sortingByUnitPrice.addEventListener('click', ()=>sortBy(ByUnitPrice));
    sortingByDiscount.addEventListener('click', ()=>sortBy(ByDiscount));

    function createButton(card) {
        card.prepend(sortingByUnitPrice,sortingByDiscount)
    }

    async function sortBy(Howto) {
        await scrollEnd()
        var itemlist = document.querySelector(".infinite-scroll-component > .unitItemWrap");
        var items = Array.from(itemlist.children);
        switch(Howto) {
            case ByDiscount:
                items.sort((a, b) => {
                    var FormerDiscount = a.querySelector(".discountRate")
                    var LatterDiscount = b.querySelector(".discountRate")
                    switch (FormerDiscount||LatterDiscount) {
                        case null:
                            return -1
                        case LatterDiscount:
                            return 1
                    }
                    if (LatterDiscount == null) return -1
                    return (LatterDiscount.textContent.match(/\d+/)[0] - FormerDiscount.textContent.match(/\d+/)[0])
                });
                document.querySelector(".sorting > button").textContent = "할인율순"
                break
            case ByUnitPrice:
                items.sort((a, b) => {
                    var FormerUnitPrice = a.querySelector(".priceQty > span")
                    var LatterUnitPrice = b.querySelector(".priceQty > span")
                    switch (FormerUnitPrice||LatterUnitPrice) {
                        case null:
                            return -1
                        case LatterUnitPrice:
                            return 1
                    }
                    if (LatterUnitPrice == null) return -1
                    return (FormerUnitPrice.textContent.trim().replace(/,/g, '') - LatterUnitPrice.textContent.trim().replace(/,/g, ''))
                });
                document.querySelector(".sorting > button").textContent = "단위가격순"
                break
        }
        itemlist.childNodes.forEach((child, index) => {
            child.remove();
        });
        for (var item of items) {
            itemlist.appendChild(item);
        }
    }


    async function scrollEnd() {
        var currentY = window.scrollY
        var load = document.querySelector(".loadMore")
        while(load) {
            load.scrollIntoView()
            await new Promise(resolve => setTimeout(resolve, 3));
            load = document.querySelector(".loadMore");
        }
        window.scroll(window.scrollX,currentY)
    }

    window.addEventListener('click', function (event) {
    if (event.target.parentNode.children[1]==event.target && event.target.parentNode.classList.contains("sorting")) {
        try {
            var card = document.querySelector(".card")
            createButton(card)
        } catch{
        }
    }
});
})();