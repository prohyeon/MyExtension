// ==UserScript==
// @name         Tekken8-SearchMove
// @namespace    http://tampermonkey.net/
// @version      2025-02-22
// @description  Search Movelist by move characteristc (ex. power crush)
// @author       Graval504
// @match        https://tekken8.movelist.xyz/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=movelist.xyz
// @downloadURL  https://github.com/Graval504/MyExtension/raw/refs/heads/main/SearchMove.user.js
// @updateURL    https://github.com/Graval504/MyExtension/raw/refs/heads/main/SearchMove.user.js
// @grant        none
// @license      DBAD
// ==/UserScript==

(function() {
    'use strict';

    function searchmove() {

        var powercrush = document.querySelectorAll("[alt=powercrush]")
        powercrush.forEach((move)=>{
            var text = document.createElement('p');
            text.textContent="파워크러시파워크래시파크"
            text.style.width = 0
            text.style.height = 0
            text.classList.add("overflow-hidden")
            move.parentNode.append(text)
        })

        var wall_break = document.querySelectorAll("[alt=wall_break]")
        wall_break.forEach((move)=>{
            var text = document.createElement('p');
            text.textContent="월브레이크벽꽝"
            text.style.width = 0
            text.style.height = 0
            text.classList.add("overflow-hidden")
            move.parentNode.append(text)
            move.alt = "wall_break_t"
        })

        var heatburst = document.querySelectorAll("[alt=heatburst]")
        heatburst.forEach((move)=>{
            var text = document.createElement('p');
            text.textContent="히트버스트히트인게이저히트대시"
            text.style.width = 0
            text.style.height = 0
            text.classList.add("overflow-hidden")
            move.parentNode.append(text)
            move.alt = "heatburst_t"
        })

       var floor_break = document.querySelectorAll("[alt=floor_break]")
        floor_break.forEach((move)=>{
            var text = document.createElement('p');
            text.textContent="플로어브레이크바닥꽝"
            text.style.width = 0
            text.style.height = 0
            text.classList.add("overflow-hidden")
            move.parentNode.append(text)
            move.alt = "floor_break_t"
        })

        var tornado = document.querySelectorAll("[alt=tornado]")
        tornado.forEach((move)=>{
            var text = document.createElement('p');
            text.textContent="토네이도스크류"
            text.style.width = 0
            text.style.height = 0
            text.classList.add("overflow-hidden")
            move.parentNode.append(text)
            move.alt = "tornado_t"
        })

        var homing = document.querySelectorAll("[alt=homing]")
        homing.forEach((move)=>{
            var text = document.createElement('p');
            text.textContent="호밍뺑글이"
            text.style.width = 0
            text.style.height = 0
            text.classList.add("overflow-hidden")
            move.parentNode.append(text)
            move.alt = "homing_t"
        })
    }

    //script start
    console.log("[SearchMove]: Loading..")
    setInterval(searchmove,1000)
    console.log("[SearchMove]: Active.")
})();
