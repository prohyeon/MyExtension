// ==UserScript==
// @name         JangSinGu-SsalMukGi
// @namespace    http://tampermonkey.net/
// @version      2025-04-13
// @description  로스트아크 경매장에서 장신구를 힘민지/골드 그래프로 보여줍니다.
// @author       Graval504
// @match        https://lostark.game.onstove.com/Auction
// @icon         https://www.google.com/s2/favicons?sz=64&domain=onstove.com
// @downloadURL  https://github.com/Graval504/MyExtension/raw/refs/heads/main/JangSinGu.user.js
// @updateURL    https://github.com/Graval504/MyExtension/raw/refs/heads/main/JangSinGu.user.js
// @grant        none
// @license      DBAD
// ==/UserScript==

const ProductNum = 200; // 검색할 물량 수 (낮은가격순부터)
const category = { 목걸이: 200010, 귀걸이: 200020, 반지: 200030 };
const grade = { 유물: 5, 고대: 6, 전체: null };
const option = {
  추피: 41,
  적주피: 42,
  공퍼: 45,
  무공퍼: 46,
  치적: 49,
  치피: 50,
  깡공: 53,
  깡무공: 54,
};
const optionFullName = {
  "치명타 적중률": 49,
  "치명타 피해": 50,
  "적에게 주는 피해 증가": 42,
  "추가 피해": 41,
  "무기 공격력": 46,
  공격력: 45,
  "무기 공격력+": 54,
  "공격력+": 53,
  낙인력: 44,
  "상태이상 공격 지속시간": 57,
  "세레나데,신성,조화 게이지 획득량 증가": 43,
  "아군 공격력 강화 효과": 51,
  "아군 피해량 강화 효과": 52,
  "전투 중 생명력 회복량+": 58,
  "최대 마나+": 56,
  "최대 생명력+": 55,
  "파티원 보호막 효과": 48,
  "파티원 회복 효과": 47,
};
const optionValue = {
  추피: { 상: 260, 중: 160, 하: 60 },
  적주피: { 상: 200, 중: 120, 하: 55 },
  공퍼: { 상: 155, 중: 95, 하: 40 },
  무공퍼: { 상: 300, 중: 180, 하: 80 },
  치적: { 상: 155, 중: 95, 하: 40 },
  치피: { 상: 400, 중: 240, 하: 110 },
  깡공: { 하: 390 },
  깡무공: { 하: 960 },
};
const statRange = {
  200010: [12678, 15357],
  200020: [9861, 11944],
  200030: [9156, 11091],
};
const grindStat = {
  200010: [357, 714, 1429],
  200020: [278, 556, 1111],
  200030: [258, 516, 1032],
};
const internalDataMap = new Map();
function GetEnlightenment(grade, grindNum) {
  return grindNum == 0
    ? 3
    : grade + grindNum + GetEnlightenment(grade, grindNum - 1);
}

function normalizeArray(arr) {
  return arr.map((item) => (Array.isArray(item) ? item : [item]));
}

function generateCombinationsFromPriority(priorityString, nameArray) {
  const result = new Set();

  // "상", "중", "하" → 3, 2, 1
  const priorityMap = { 상: 3, 중: 2, 하: 1 };
  const priorityInput = priorityString.split("").map((k) => priorityMap[k]);

  // 각 name의 index → 허용 우선순위
  const allowedPriority = {
    0: [1, 2, 3], // nameArray[0]
    1: [1, 2, 3], // nameArray[1]
    2: [1], // nameArray[2]
    3: [1], // nameArray[3]
  };

  function backtrack(pos, path, usedSet) {
    if (pos === priorityInput.length) {
      const mapped = path.map((idx, i) => [nameArray[idx], priorityInput[i]]);
      const normalized = mapped
        .slice()
        .sort((a, b) => {
          if (a[1] !== b[1]) return b[1] - a[1]; // 우선순위 내림차순 (상 > 중 > 하)
          return a[0].localeCompare(b[0]); // 이름 정렬
        })
        .map((x) => x[0])
        .join(",");
      result.add(normalized);
      return;
    }

    for (let i = 0; i < nameArray.length; i++) {
      if (usedSet.has(i)) continue; // 이미 사용된 이름이면 건너뜀
      if (!allowedPriority[i].includes(priorityInput[pos])) continue;

      usedSet.add(i);
      backtrack(pos + 1, [...path, i], usedSet);
      usedSet.delete(i);
    }
  }

  backtrack(0, [], new Set());
  return Array.from(result).map((s) => s.split(","));
}

function getAllOptions(input) {
  const targets = ["상", "중", "하"];
  var possibleOptions;
  switch (input[0]) {
    case "반지":
      possibleOptions = ["치적", "치피"];
      break;
    case "귀걸이":
      possibleOptions = ["공퍼", "무공퍼"];
      break;
    case "목걸이":
      possibleOptions = ["추피", "적주피"];
      break;
  }
  possibleOptions.push("깡공", "깡무공");
  var results = generateCombinationsFromPriority(input[2], possibleOptions);
  console.log(results);
  return results;
}

function parse(jsonData, index, category) {
  if (!jsonData) {
    return;
  }
  const JsonItem = jsonData["Items"][index];
  const gradeQuality = JsonItem["GradeQuality"];
  const grade = JsonItem["Grade"];
  const name = JsonItem["Name"];
  const tradeLeft = JsonItem["AuctionInfo"]["TradeAllowCount"];
  const grindNum = JsonItem["AuctionInfo"]["UpgradeLevel"];
  const effects = JsonItem["Options"].map((opt) => ({
    OptionName: opt.OptionName.trim(),
    Value: opt.Value,
    IsPercentage: opt.IsValuePercentage,
  }));
  const buyPrice = JsonItem["AuctionInfo"]["BuyPrice"];
  const auctionPrice = JsonItem["AuctionInfo"]["BidPrice"];
  const stat = JsonItem["Options"].filter(
    (item) => item["OptionName"] == "힘"
  )[0]["Value"];
  const statPer =
    (stat -
      statRange[category][0] -
      grindStat[category].slice(0, grindNum).reduce((a, b) => a + b, 0)) /
    (statRange[category][1] - statRange[category][0]);
  const price = buyPrice || auctionPrice;
  const pageNo = jsonData["PageNo"];
  const productNum = index;

  return {
    name,
    grade,
    gradeQuality,
    grindNum,
    stat,
    statPer,
    tradeLeft,
    effects,
    price,
    buyPrice,
    auctionPrice,
    pageNo,
    productNum,
  };
}

async function search(form, pageNo) {
  const body = {
    CategoryCode: form.category,
    ItemTier: 4,
    ItemGrade: form.grade ?? "",
    ItemLevelMin: 0,
    ItemLevelMax: 1700,
    ItemUpgradeLevel: form.upgrade,
    EtcOptions: [
      {
        FirstOption: 8,
        SecondOption: 1,
        MinValue: form.enlightenment ?? "",
        MaxValue: form.enlightenment ?? "",
      },
      {
        FirstOption: 7,
        SecondOption: form.grindOption1?.type ?? "",
        MinValue: form.grindOption1?.grade ?? "",
        MaxValue: form.grindOption1?.grade ?? "",
      },
      {
        FirstOption: 7,
        SecondOption: form.grindOption2?.type ?? "",
        MinValue: form.grindOption2?.grade ?? "",
        MaxValue: form.grindOption2?.grade ?? "",
      },
      {
        FirstOption: 7,
        SecondOption: form.grindOption3?.type ?? "",
        MinValue: form.grindOption3?.grade ?? "",
        MaxValue: form.grindOption3?.grade ?? "",
      },
    ],
    PageNo: pageNo,
    SortOption: {
      Sort: "BUY_PRICE",
    },
  };

  return fetch("https://developer-lostark.game.onstove.com/auctions/items", {
    headers: {
      "content-type": "application/json",
      authorization: "bearer " + form.apikey,
    },
    body: JSON.stringify(body),
    method: "POST",
  })
    .then((res) => {
      if (res.status === 500) {
        throw new Error("ERR_INTERNAL_SERVER");
      }
      return res.json();
    })
    .then((jsonData) => {
      var index = Math.min(
        jsonData["TotalCount"] - (jsonData["PageNo"] - 1) * 10,
        10
      );
      const products = Array.from({ length: index }, (_, i) => i)
        .map((index) => parse(jsonData, index, form.category))
        .filter((x) => !!x);
      return products;
    });
}

async function trySearch(form, pageNo) {
  let searchResult;
  let failCount = 0;
  while (true) {
    try {
      searchResult = await search(form, pageNo);
      return searchResult;
    } catch (err) {
      failCount += 1;
      if (failCount > 5) {
        throw new Error(
          "경매장 검색에 5회 연속 실패했습니다. 스크립트를 종료합니다."
        );
      }
      if (err.message === "ERR_LIMIT_REACHED") {
        console.log(
          "경매장 검색 횟수 제한을 초과했습니다. 5분 후에 자동으로 재시도합니다."
        );
        await new Promise((resolve) => setTimeout(resolve, 60000 * 5 + 1000));
        continue;
      }
      if (err.message === "ERR_INTERNAL_SERVER") {
        console.log(
          "경매장 검색 서버에 오류가 발생했습니다. 30초 후에 자동으로 재시도합니다."
        );
        await new Promise((resolve) => setTimeout(resolve, 30000));
        continue;
      }
      if (err.message === "ERR_MAINTENANCE") {
        console.log("경매장 서비스 점검 중입니다. 스크립트를 종료합니다.");
        throw err;
      }
      if (err.message === "ERR_NO_LOGIN") {
        console.log("로그인이 필요합니다. 스크립트를 종료합니다.");
        throw err;
      }
      console.log("식별되지 않은 오류가 발생했습니다. 스크립트를 종료합니다.");
      throw err;
    }
  }
}

const SEARCH_DELAY = 0.2;
async function getSearchResult(input, apikey) {
  var [accType, searchGrade, filter] = input;
  let count = 0;
  var productsAll = [];
  for (var grindNum = input[2].length; grindNum <= 3; grindNum++) {
    for (const options of getAllOptions(input)) {
      count += 1;
      console.log(options, input);
      const form = {
        apikey: apikey,
        category: category[accType],
        grade: searchGrade,
        upgrade: grindNum,
        enlightenment:
          GetEnlightenment(grade[searchGrade] - 5, grindNum) +
          Number(accType == "목걸이"),
        grindOption1: input[2][0] && {
          type: option[options[0]],
          grade: optionValue[options[0]][input[2][0]],
        },
        grindOption2: input[2][1] && {
          type: option[options[1]],
          grade: optionValue[options[1]][input[2][1]],
        },
        grindOption3: input[2][2] && {
          type: option[options[2]],
          grade: optionValue[options[2]][input[2][2]],
        },
      };
      var products = await trySearch(form, 1);
      productsAll.push(...products);
      var page = 1;
      var foundProducts = 0;
      while (
        products.length == 10 &&
        foundProducts * getAllOptions(input).length < ProductNum
      ) {
        page += 1;
        await new Promise((resolve) =>
          setTimeout(resolve, SEARCH_DELAY * 1000)
        );
        products = await trySearch(form, page);
        productsAll.push(...products);
        foundProducts += products.filter((product) => product.price).length;
        console.log(foundProducts, getAllOptions(input).length, ProductNum);
      }
      await new Promise((resolve) => setTimeout(resolve, SEARCH_DELAY * 1000));
    }
  }
  return productsAll;
}

function createChartAndOpenImage(result, input) {
  // 1. Chart.js 로드
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/chart.js";
  script.onload = async () => {
    if (window.myChart) {
      window.myChart.destroy();
    }
    // 2. 캔버스 생성
    if (!Chart.registry.plugins.get("zoom")) {
      await new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom";
        script.onload = resolve;
        document.head.appendChild(script);
      });
    }
    let canvas = document.getElementById("scatter-chart");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "scatter-chart";
      canvas.style.width = "100%";
      document.querySelector("form").prepend(canvas);
    }

    // 3. 차트 생성
    const ctx = document.getElementById("scatter-chart").getContext("2d");
    window.myChart = new Chart(ctx, {
      type: "scatter",
      data: {
        datasets: [
          {
            label: "장신구",
            data: result.map((item) => ({
              x: item.statPer,
              y: item.buyPrice,
            })),
            pointBackgroundColor: "blue",
            pointRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => {
                const idx = context.dataIndex;
                return `힘민지: ${result[idx].stat}-${
                  Math.round(context.raw.x * 100000) / 1000
                }%, 골드: ${context.raw.y},\n${result[idx].effects
                  .slice(5)
                  .map((item) => [item["OptionName"] + ": " + item["Value"]])}`;
              },
            },
            bodyFont: { size: 14 },
          },
          zoom: {
            pan: {
              enabled: true,
              mode: "xy",
              modifierKey: "ctrl", // ctrl 키 누르고 드래그로 이동
            },
            zoom: {
              wheel: {
                enabled: true,
              },
              pinch: {
                enabled: true,
              },
              mode: "xy",
              onZoomStart: ({ chart, event }) => {
                // Alt키 누르면 x축 줌만 허용
                if (event.altKey) {
                  chart.options.plugins.zoom.zoom.mode = "x";
                  return true;
                } else if (event.shiftKey) {
                  chart.options.plugins.zoom.zoom.mode = "y";
                  return true;
                } else {
                  return false; // 키 안 누르면 줌 안 됨
                }
              },
              onZoomComplete: ({ chart }) => {
                // 줌 끝난 뒤 모드 초기화 (안 해도 됨)
                chart.options.plugins.zoom.zoom.mode = "xy";
              },
            },
            limits: {
              x: { min: 0, max: 1 }, // 줌 가능한 범위 제한
              y: { min: 0 },
            },
          },
        },
        onClick: async (event, elements) => {
          var btn = document.createElement("button");
          btn.className = "button button--deal-buy";
          btn.textContent = "구매하기";
          btn.dataset.productid = null;
          btn.hidden = true;
          document.querySelector(".content--auction").appendChild(btn);
          if (elements.length > 0) {
            const index = elements[0].index;

            var grindOptions = result[index].effects.slice(5);
            const form = {
              itemName: result[index].name,
              gradeQuality:
                result[index].gradeQuality == 100
                  ? result[index].gradeQuality
                  : Math.floor(result[index].gradeQuality / 10) * 10,
              category: category[input[0]],
              grade: result[index].grade,
              upgrade: result[index].grindNum,
              enlightenment: result[index].effects[0]["Value"],
              grindOption1: grindOptions[0] && {
                type: optionFullName[
                  grindOptions[0]["OptionName"] +
                    "+".repeat(!grindOptions[0]["IsPercentage"])
                ],
                grade: grindOptions[0]["IsPercentage"]
                  ? grindOptions[0]["Value"] * 100
                  : grindOptions[0]["Value"],
              },
              grindOption2: grindOptions[1] && {
                type: optionFullName[
                  grindOptions[1]["OptionName"] +
                    "+".repeat(!grindOptions[1]["IsPercentage"])
                ],
                grade: grindOptions[1]["IsPercentage"]
                  ? grindOptions[1]["Value"] * 100
                  : grindOptions[1]["Value"],
              },
              grindOption3: grindOptions[2] && {
                type: optionFullName[
                  grindOptions[2]["OptionName"] +
                    "+".repeat(!grindOptions[2]["IsPercentage"])
                ],
                grade: grindOptions[2]["IsPercentage"]
                  ? grindOptions[2]["Value"] * 100
                  : grindOptions[2]["Value"],
              },
            };
            console.log(form);
            var pageCount = 0;
            var done = false;

            while (!done) {
              var doc = await searchAuction(form, pageCount);
              const id = findItemEqual(doc, result[index]);
              if (id) {
                btn.dataset.productid = id;
                console.log(btn.dataset.productid);
                btn.click();
                done = true;
                btn.remove();
              }
              pageCount += 1;
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "힘민지%",
              font: { size: 24 },
            },
          },
          y: {
            title: {
              display: true,
              text: "골드",
              font: { size: 24 },
            },
          },
        },
      },
    });
  };

  document.head.appendChild(script);
}

async function searchAuction(form, pageNo) {
  const body = new URLSearchParams();
  body.append("request[firstCategory]", 200000);
  body.append("request[secondCategory]", form.category);
  body.append("request[itemName]", form.itemName);
  body.append("request[itemTier]", 4);
  body.append("request[gradeQuality]", form.gradeQuality);
  body.append("request[itemGrade]", form.grade ?? "");
  body.append("request[itemLevelMin]", 0);
  body.append("request[itemLevelMax]", 1700);
  body.append("request[upgradeLevel]", form.upgrade);
  body.append("request[etcOptionList][0][firstOption]", 8);
  body.append("request[etcOptionList][0][secondOption]", 1);
  body.append("request[etcOptionList][0][minValue]", form.enlightenment ?? "");
  body.append("request[etcOptionList][0][maxValue]", form.enlightenment ?? "");
  body.append("request[etcOptionList][1][firstOption]", 7);
  body.append(
    "request[etcOptionList][1][secondOption]",
    form.grindOption1?.type ?? ""
  );
  body.append(
    "request[etcOptionList][1][minValue]",
    form.grindOption1?.grade ?? ""
  );
  body.append(
    "request[etcOptionList][1][maxValue]",
    form.grindOption1?.grade ?? ""
  );
  body.append("request[etcOptionList][2][firstOption]", 7);
  body.append(
    "request[etcOptionList][2][secondOption]",
    form.grindOption2?.type ?? ""
  );
  body.append(
    "request[etcOptionList][2][minValue]",
    form.grindOption2?.grade ?? ""
  );
  body.append(
    "request[etcOptionList][2][maxValue]",
    form.grindOption2?.grade ?? ""
  );
  body.append("request[etcOptionList][3][firstOption]", 7);
  body.append(
    "request[etcOptionList][3][secondOption]",
    form.grindOption3?.type ?? ""
  );
  body.append(
    "request[etcOptionList][3][minValue]",
    form.grindOption3?.grade ?? ""
  );
  body.append(
    "request[etcOptionList][3][maxValue]",
    form.grindOption3?.grade ?? ""
  );
  body.append("request[pageNo]", pageNo);
  body.append("request[sortOption][Sort]", "BUY_PRICE");
  body.append("request[sortOption][IsDesc]", false);

  return fetch("https://lostark.game.onstove.com/Auction", {
    headers: {
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body: body,
    method: "POST",
  })
    .then((res) => {
      if (res.status === 500) {
        throw new Error("ERR_INTERNAL_SERVER");
      }
      return res.text();
    })
    .then((html) => {
      if (html.includes("서비스 점검 중입니다.")) {
        throw new Error("ERR_MAINTENANCE");
      }
      const parser = new DOMParser();
      return parser.parseFromString(html, "text/html");
    })
    .then((document) => {
      if (document.querySelector("#idLogin")) {
        throw new Error("ERR_NO_LOGIN");
      }
      if (document.querySelector("#auctionListTbody > tr.empty")) {
        if (
          document
            .querySelector("#auctionListTbody > tr.empty")
            .innerText.trim() ===
          "경매장 연속 검색으로 인해 검색 이용이 최대 5분간 제한되었습니다."
        ) {
          throw new Error("ERR_LIMIT_REACHED");
        }
        return document;
      }
      return document;
    });
}

function findItemEqual(document, item) {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    .map((index) => {
      const row = document.querySelector(
        `#auctionListTbody > tr:nth-child(${index})`
      );
      if (!row) return false;
      const buyPrice = parseFloat(
        row
          .querySelector(`td:nth-child(6) > div > em`)
          .innerText.trim()
          .replace(/,/g, "")
      );
      const name = row
        .querySelector(`td:nth-child(1) > div.grade > span.name`)
        .innerText.trim();
      const stat = parseInt(
        JSON.parse(
          row.querySelector(`td:nth-child(1)>div.grade>span`).dataset.item
        ).Element_005.value.Element_001.match(
          /힘 \+(\d+)<BR>민첩 \+\1<BR>지능 \+\1/
        )[1]
      );
      const tradeLeftStr = row
        .querySelector(`td:nth-child(1) > div.grade > span.count`)
        .innerText.trim();
      const tradeLeft =
        tradeLeftStr === "[구매 후 거래 불가]"
          ? 0
          : parseInt(tradeLeftStr.split("거래 ")[1].split("회")[0], 10);
      const id = row
        .querySelector("td:nth-child(7) > button")
        .getAttribute("data-productid");
      return id.repeat(
        buyPrice == item.buyPrice &&
          name == item.name &&
          stat == item.effects[2]["Value"] &&
          tradeLeft == item.tradeLeft
      );
    })
    .filter((x) => !!x)[0];
}

(function waitForFormAndInject() {
  const form = document.querySelector("form");
  if (!form) {
    requestAnimationFrame(waitForFormAndInject);
    return;
  }

  // form이 발견되면 실행
  const container = document.createElement("div");
  container.style.marginBottom = "1em";

  const inlineWrapper = document.createElement("div");
  inlineWrapper.style.display = "flex";
  inlineWrapper.style.justifyContent = "center";
  inlineWrapper.style.flexWrap = "wrap";
  inlineWrapper.style.gap = "0.5em";
  inlineWrapper.style.marginBottom = "0.5em";

  const styleInput = (el, minWidth = "120px") => {
    el.style.padding = "0.4em";
    el.style.minWidth = minWidth;
    el.style.flex = "1 1 auto";
    el.style.boxSizing = "border-box";
  };

  const typeSelect = document.createElement("select");
  ["목걸이", "귀걸이", "반지"].forEach((optionText) => {
    const option = document.createElement("option");
    option.value = optionText;
    option.textContent = optionText;
    typeSelect.appendChild(option);
  });
  styleInput(typeSelect);

  const gradeSelect = document.createElement("select");
  ["고대", "유물"].forEach((optionText) => {
    const option = document.createElement("option");
    option.value = optionText;
    option.textContent = optionText;
    gradeSelect.appendChild(option);
  });
  styleInput(gradeSelect);

  const textInput = document.createElement("input");
  textInput.type = "text";
  textInput.placeholder = "연마 옵션 필터 (ex.상중)";
  styleInput(textInput);

  const submitInput = document.createElement("input");
  submitInput.type = "submit";
  submitInput.value = "실행";
  submitInput.style.padding = "0.4em";
  submitInput.style.minWidth = "80px";
  submitInput.style.width = "80px";
  submitInput.style.boxSizing = "border-box";
  submitInput.style.cursor = "pointer";
  submitInput.style.cursor = "pointer";

  submitInput.addEventListener("click", (e) => {
    e.preventDefault();
    const type = typeSelect.value;
    const grade = gradeSelect.value;
    const shortText = textInput.value;
    const longText = longTextInput.value;

    handleInputs(type, grade, shortText, longText);
  });

  inlineWrapper.appendChild(typeSelect);
  inlineWrapper.appendChild(gradeSelect);
  inlineWrapper.appendChild(textInput);
  inlineWrapper.appendChild(submitInput);
  container.appendChild(inlineWrapper);

  // 긴 입력 + 저장 버튼
  const longInputWrapper = document.createElement("div");
  longInputWrapper.style.display = "flex";
  longInputWrapper.style.gap = "0.5em";
  longInputWrapper.style.alignItems = "stretch";

  const longTextInput = document.createElement("input");
  longTextInput.type = "text";
  longTextInput.placeholder = "API Key";
  longTextInput.style.flex = "1";
  longTextInput.style.padding = "0.5em";
  longTextInput.style.boxSizing = "border-box";

  // 저장 버튼 (input으로 변경)
  const saveButton = document.createElement("input");
  saveButton.type = "button";
  saveButton.value = "저장";
  // 실행 버튼과 동일한 스타일 수동 적용
  saveButton.style.padding = "0.4em";
  saveButton.style.minWidth = "80px";
  saveButton.style.width = "80px";
  saveButton.style.boxSizing = "border-box";
  saveButton.style.cursor = "pointer";

  saveButton.addEventListener("click", () => {
    localStorage.setItem("myLongInput", longTextInput.value);
    alert("저장되었습니다!");
  });

  // 저장된 값이 있다면 불러오기
  const saved = localStorage.getItem("myLongInput");
  if (saved) {
    longTextInput.value = saved;
  }

  longInputWrapper.appendChild(longTextInput);
  longInputWrapper.appendChild(saveButton);
  container.appendChild(longInputWrapper);

  form.insertBefore(container, form.firstChild);

  function handleInputs(type, grade, shortText, longText) {
    const input = [type, grade, shortText];
    console.log(input);
    const apikey = longText;
    console.log("타입:", type);
    console.log("등급:", grade);
    console.log("짧은 입력:", shortText);
    console.log("긴 입력:", longText);
    let result;
    const btn = document.getElementById("copyBtn");
    if (btn) {
      btn.remove();
    }
    getSearchResult(input, apikey).then((res) => {
      result = res;
      createChartAndOpenImage(result, input);
      // const el = document.createElement("button");
      // el.id = "copyBtn";
      // el.style = "width: 100%; height: 64px; text-align: center";
      // el.innerText = "검색 결과 복사";
      // el.onclick = copyResult;
      // document.body.prepend(el);
    });
  }
})();
