// ==UserScript==
// @name         EveryComment
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  웹사이트의 input을 textarea로 변환합니다. ChatGPT를 이용하여 작성되었습니다.
// @author       Graval504
// @match        https://everytime.kr/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=everytime.kr
// @downloadURL  https://github.com/Graval504/MyExtension/raw/refs/heads/main/EveryComment.user.js
// @updateURL    https://github.com/Graval504/MyExtension/raw/refs/heads/main/EveryComment.user.js
// @grant        none
// @license      DBAD
// ==/UserScript==

(function() {
    'use strict';
    function replaceInput(){
        document.querySelectorAll('input[type="text"]').forEach(input => {
            let textarea = document.createElement('textarea'); // textarea 생성
            textarea.value = input.value; // 기존 값 유지
            textarea.style.width = input.offsetWidth - 105 + "px"; // 크기 유지
            textarea.style.height = "20px"; // 기본 높이 설정
            textarea.style.padding = "10px";
            textarea.style.border = 'none';
            textarea.style.resize = 'none';
            textarea.style.color = 'rgb(38, 38, 38)';
            textarea.style.backgroundColor = 'rgba(0, 0, 0, 0)';
            textarea.name = "text";
            textarea.class = "text";
            // 기존 input의 속성 복사
            [...input.attributes].forEach(attr => {
                if (attr.name !== "type") { // type은 textarea에 필요 없음
                    textarea.setAttribute(attr.name, attr.value);
                }
            });

            // 입력 시 기존 input의 이벤트 유지 (폼 제출 등)
            textarea.addEventListener('input', function() {
                input.value = this.value;
                input.dispatchEvent(new Event('input', { bubbles: true })); // 이벤트 전파
            });
            input.replaceWith(textarea); // input을 textarea로 변경
        });
    }
    setInterval(()=>{replaceInput()}, 1)

    // unsafeWindow가 없으면 window를 사용하도록 함
    const myWindow = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;

    // jQuery가 로드될 때까지 대기하는 함수
    function waitForjQuery() {
        if (myWindow.jQuery) {
            overrideFind();
        } else {
            setTimeout(waitForjQuery, 100);
        }
    }

    // jQuery의 .find 메서드를 오버라이드하는 함수
    function overrideFind() {
        const $ = myWindow.jQuery;
        const originalFind = $.fn.find;
        $.fn.find = function(selector) {
            if (selector === 'input[name="text"]') {
                // input과 textarea 둘 다 선택하도록 변경
                return originalFind.call(this, 'input[name="text"], textarea[name="text"]');
            }
            return originalFind.call(this, selector);
        };
        console.log("jQuery .find 오버라이드 완료: input[name='text'] 호출 시 textarea도 선택됩니다.");
    }

    waitForjQuery();
})();