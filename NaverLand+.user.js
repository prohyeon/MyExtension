// ==UserScript==
// @name         NaverLand+
// @namespace    http://tampermonkey.net/
// @version      0.2.0
// @description  try to take over the world!
// @author       Graval504
// @match        https://new.land.naver.com/rooms*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=naver.com
// @downloadURL    https://github.com/Graval504/MyExtension/raw/refs/heads/main/NaverLand+.user.js
// @updateURL    https://github.com/Graval504/MyExtension/raw/refs/heads/main/NaverLand+.user.js
// @grant        none
// @license      DBAD
// ==/UserScript==

(function() {
    'use strict';

    var sortingButton = document.createElement('a');
    var removeButtonFrame = document.createElement('div');
    var removeButtonFrameInner = document.createElement('div');
    var removeButton = document.createElement('a');
    removeButtonFrame.prepend(removeButtonFrameInner);
    removeButtonFrameInner.prepend(removeButton);

    async function sortByArea() {
        var otherButtons = document.querySelectorAll(".list_fixed > .sorting > [data-nclk]");
        otherButtons.forEach((button, index) => {
            button.ariaPressed = 'false';
        });
        await scrollEnd()
        var itemlist = document.querySelector("#listContents1 > div > div > div:not(.loader)");
        var items = Array.from(itemlist.children);
        items.sort((a, b) => {
            try{
                var formerArea = Number(a.querySelector(".spec").childNodes[1].textContent.match(/\d+/)[0]);
                var latterArea = Number(b.querySelector(".spec").childNodes[1].textContent.match(/\d+/)[0]);
                return latterArea - formerArea
            } catch{
                return -1
            }
        });
        itemlist.childNodes.forEach((child, index) => {
            child.remove();
        });
        for (var item of items) {
            itemlist.appendChild(item);
        }
        console.log("[NaverLand+] : Sort Complete.");
    }

    async function removeBasement() {
        await scrollEnd()
        var itemlist = document.querySelector("#listContents1 > div > div > div:not(.loader)");
        itemlist.childNodes.forEach((child, index) => {
            if (child.querySelector(".spec").childNodes[2].textContent.match("B")) child.remove();
        });
        console.log("[NaverLand+] : Remove Complete.");
    }


    function createButton() {
        var sorting_contents = document.querySelector(".list_fixed > .sorting");
        var filter_contents = document.querySelector("#filter > .filter_area");

        if (sorting_contents !== null) {
            sortingButton.className = "sorting_type";
            sortingButton.href = "#"
            sortingButton.setAttribute('role', 'button');
            sortingButton.setAttribute('aria-pressed', 'false');
            sortingButton.textContent = "전용면적순";
            sortingButton.addEventListener('click', sortByArea);
            sorting_contents.prepend(sortingButton);
        }

        if (filter_contents !== null) {
            removeButtonFrame.className = "filter_group";
            removeButtonFrame.id = "basement_filter";
            removeButtonFrameInner.className = "filter_inner";
            removeButton.className = "filter_btn_select";
            removeButton.href = "#"
            removeButton.setAttribute('role', 'button');
            removeButton.setAttribute('aria-haspopup', 'true');
            removeButton.setAttribute('aria-expanded', 'false');
            removeButton.setAttribute('aria-pressed', 'false');
            removeButton.style.paddingRight='9px';
            removeButton.textContent = "반지하 제거";
            removeButton.addEventListener('click', removeBasement);
            removeButton.addEventListener('mousedown', () => removeButton.setAttribute('aria-expanded', 'true'));
            removeButton.addEventListener('mouseup', () => removeButton.setAttribute('aria-expanded', 'false'));
            removeButton.addEventListener('mouseout', () => removeButton.setAttribute('aria-expanded', 'false'));
            filter_contents.appendChild(removeButtonFrame);
        };
    }

    async function scrollEnd() {
        var item_list = document.querySelector(".item_list")
        var currentY = item_list.scrollTop
        var load = document.querySelector(".loader")
        while(load) {
            load.scrollIntoView()
            await new Promise(resolve => setTimeout(resolve, 3));
            load = document.querySelector(".loader");
        }
        item_list.scroll(item_list.scrollLeft,currentY)
    }


    console.log("[NaverLand+] : Turning on...");
    createButton();
    console.log("[NaverLand+] : Working.");
})();
