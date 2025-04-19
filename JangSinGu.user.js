// ==UserScript==
// @name         JangSinGu-SsalMukGi
// @namespace    http://tampermonkey.net/
// @version      2025-04-15
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
  "추가 피해": 41,
  "적에게 주는 피해 증가": 42,
  공격력: 45,
  "무기 공격력": 46,
  "치명타 적중률": 49,
  "치명타 피해": 50,
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

const reduceOptionName = {
  "추가 피해": "추피",
  "적에게 주는 피해 증가": "적주피",
  공격력: "공퍼",
  "무기 공격력": "무공퍼",
  "치명타 적중률": "치적",
  "치명타 피해": "치피",
  "공격력+": "깡공",
  "무기 공격력+": "깡무공",
};

const optionValue = {
  추피: { 상: 260, 중: 160, 하: 60 },
  적주피: { 상: 200, 중: 120, 하: 55 },
  공퍼: { 상: 155, 중: 95, 하: 40 },
  무공퍼: { 상: 300, 중: 180, 하: 80 },
  치적: { 상: 155, 중: 95, 하: 40 },
  치피: { 상: 400, 중: 240, 하: 110 },
  깡공: { 상: 390, 중: 195, 하: 80 },
  깡무공: { 하: 960, 중: 480, 하: 195 },
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

// 우선순위 조합 생성 (backtrack 분리)
function generateCombinationsFromPriority(priorityString, nameArray) {
  const result = new Set();
  const priorityMap = { 상: 3, 중: 2, 하: 1 };
  const priorityInput = priorityString.split("").map((k) => priorityMap[k]);
  const allowedPriority = {
    0: [1, 2, 3],
    1: [1, 2, 3],
    2: [1],
    3: [1],
  };
  function backtrack(pos, path, usedSet) {
    if (pos === priorityInput.length) {
      const mapped = path.map((idx, i) => [nameArray[idx], priorityInput[i]]);
      const normalized = mapped
        .slice()
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map((x) => x[0])
        .join(",");
      result.add(normalized);
      return;
    }
    for (let i = 0; i < nameArray.length; i++) {
      if (usedSet.has(i) || !allowedPriority[i].includes(priorityInput[pos])) continue;
      usedSet.add(i);
      backtrack(pos + 1, [...path, i], usedSet);
      usedSet.delete(i);
    }
  }
  backtrack(0, [], new Set());
  return Array.from(result).map((s) => s.split(","));
}

// 옵션 조합 생성 (switch-case depth 감소)
function getAllOptions(input, checkbox) {
  const accTypeOptions = {
    반지: ["치적", "치피"],
    귀걸이: ["공퍼", "무공퍼"],
    목걸이: ["추피", "적주피"],
  };
  const possibleOptions = [...accTypeOptions[input[0]]];
  if (checkbox) possibleOptions.push("깡공", "깡무공");
  return generateCombinationsFromPriority(input[2], possibleOptions);
}

// 반복되는 styleInput, optionSelects 생성 분리
function styleInput(el, minWidth = "120px") {
  el.style.padding = "0.4em";
  el.style.minWidth = minWidth;
  el.style.flex = "1 1 auto";
  el.style.boxSizing = "border-box";
}

function createOptionSelects(optionFullName) {
  return Array.from({ length: 6 }, (_, i) => {
    const sel = document.createElement("select");
    if (i % 2 == 0) {
      ["", ...Object.keys(optionFullName).slice(0, 8)].forEach((val) => {
        const opt = document.createElement("option");
        opt.value = val;
        opt.textContent = val || "옵션 선택";
        sel.appendChild(opt);
        styleInput(sel);
      });
    } else {
      ["", "상", "중", "하"].forEach((val) => {
        const opt = document.createElement("option");
        opt.value = val;
        opt.textContent = val || "등급";
        sel.appendChild(opt);
        styleInput(sel, "100px");
      });
    }
    return sel;
  });
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
  const stat = JsonItem["Options"].filter((item) => item["OptionName"] == "힘")[0]["Value"];
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
async function getSearchResult(input, apikey, optionResult, checkbox, submitBtn) {
  const [accType, searchGrade, filter] = input;
  let count = 0;
  const productsAll = [[], [], [], []];
  const optionList = optionResult.length === 0 ? getAllOptions(input, checkbox) : optionResult;
  const loopLength = (4 - input[2].length) * optionList.length;
  for (let grindNum = input[2].length; grindNum <= 3; grindNum++) {
    for (const options of optionList) {
      count++;
      submitBtn.value = `${Math.round((count * 100) / loopLength)}%`;
      const form = {
        apikey,
        category: category[accType],
        grade: searchGrade,
        upgrade: grindNum,
        enlightenment: GetEnlightenment(grade[searchGrade] - 5, grindNum) + Number(accType === "목걸이"),
        grindOption1: input[2][0] && { type: option[options[0]], grade: optionValue[options[0]][input[2][0]] },
        grindOption2: input[2][1] && { type: option[options[1]], grade: optionValue[options[1]][input[2][1]] },
        grindOption3: input[2][2] && { type: option[options[2]], grade: optionValue[options[2]][input[2][2]] },
      };
      let products = await trySearch(form, 1);
      productsAll[grindNum].push(...products);
      let page = 1;
      let foundProducts = 0;
      // getAllOptions 반복 제거, foundProducts 계산 개선
      while (products.length === 10 && foundProducts < ProductNum) {
        page++;
        await new Promise((resolve) => setTimeout(resolve, SEARCH_DELAY * 1000));
        products = await trySearch(form, page);
        productsAll[grindNum].push(...products);
        foundProducts += products.filter((product) => product.price).length;
      }
      await new Promise((resolve) => setTimeout(resolve, SEARCH_DELAY * 1000));
    }
  }
  return productsAll;
}

let originalResult = null; // 최초 데이터 저장용

// 히스토리 저장용 배열
let searchHistory = [];

// 히스토리 UI 생성 및 관리 함수
function renderHistoryUI() {
  let historyWrapper = document.getElementById("history-wrapper");
  if (!historyWrapper) {
    historyWrapper = document.createElement("div");
    historyWrapper.id = "history-wrapper";
    historyWrapper.style.display = "flex";
    historyWrapper.style.flexWrap = "wrap";
    historyWrapper.style.gap = "0.5em";
    historyWrapper.style.margin = "1em 0";
    historyWrapper.style.padding = "0.5em 0";
    historyWrapper.style.borderBottom = "1px solid #ddd";
    document.querySelector("form").prepend(historyWrapper);
  }
  historyWrapper.innerHTML = "";
  if (searchHistory.length === 0) {
    const empty = document.createElement("span");
    empty.textContent = "검색 히스토리 없음";
    empty.style.color = "#aaa";
    historyWrapper.appendChild(empty);
    return;
  }
  searchHistory.forEach((entry, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.style.padding = "0.4em 1em";
    btn.style.border = "1px solid #888";
    btn.style.borderRadius = "4px";
    btn.style.background = idx === searchHistory.length - 1 ? "#e0f7fa" : "#f8f8f8";
    btn.style.cursor = "pointer";
    btn.style.fontSize = "0.95em";
    btn.title = entry.label;
    btn.textContent = entry.label.length > 40 ? entry.label.slice(0, 40) + "…" : entry.label;
    btn.onclick = () => {
      originalResult = entry.result.map((arr) => arr.slice());
      updateChart(entry.result, entry.input);
    };
    historyWrapper.appendChild(btn);
  });
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

    // 가격 필터 UI 추가
    let priceFilterWrapper = document.getElementById("price-filter-wrapper");
    if (!priceFilterWrapper) {
      priceFilterWrapper = document.createElement("div");
      priceFilterWrapper.id = "price-filter-wrapper";
      priceFilterWrapper.style.display = "flex";
      priceFilterWrapper.style.gap = "0.5em";
      priceFilterWrapper.style.alignItems = "center";
      priceFilterWrapper.style.margin = "0.5em 0";
      // 최대 가격 입력
      const priceInput = document.createElement("input");
      priceInput.type = "number";
      priceInput.placeholder = "최대 가격(골드)";
      priceInput.id = "max-price-input";
      priceInput.style.padding = "0.4em";
      priceInput.style.width = "120px";
      // 적용 버튼
      const applyBtn = document.createElement("button");
      applyBtn.type = "button";
      applyBtn.textContent = "적용";
      applyBtn.style.padding = "0.4em 1em";
      // 리셋 버튼
      const resetBtn = document.createElement("button");
      resetBtn.type = "button";
      resetBtn.textContent = "리셋";
      resetBtn.style.padding = "0.4em 1em";
      // 이벤트
      applyBtn.onclick = () => {
        const maxPrice = Number(priceInput.value);
        if (!originalResult) {
          return;
        }
        // 필터링
        const filtered = originalResult.map((arr) =>
          arr.filter((item) => !maxPrice || item.buyPrice <= maxPrice)
        );
        updateChart(filtered, input);
      };
      resetBtn.onclick = () => {
        if (!originalResult) {
          return;
        }
        priceInput.value = "";
        updateChart(originalResult, input);
      };
      priceFilterWrapper.appendChild(priceInput);
      priceFilterWrapper.appendChild(applyBtn);
      priceFilterWrapper.appendChild(resetBtn);
      document.querySelector("form").prepend(priceFilterWrapper);
    }
    // 최초 데이터 저장
    originalResult = result.map((arr) => arr.slice());
    // 차트 생성
    updateChart(result, input);
  };
  document.head.appendChild(script);
}

function getOptionKey(effects) {
  const mainOptions = Object.keys(reduceOptionName);
  return (
    mainOptions
      .map((opt) =>
        effects.some((e) => e.OptionName.includes(opt)) ? opt : ""
      )
      .filter(Boolean)
      .join("+") || "기타"
  );
}

// 주요 옵션 포함 개수에 따라 pointStyle 반환
function getPointStyleByOption(effects) {
  const mainOptions = Object.keys(reduceOptionName);
  const count = mainOptions.filter((opt) => {
    // 예외 처리: +가 붙은 옵션은 IsPercentage: false, 아닌 옵션은 IsPercentage: true
    if (opt === "공격력") {
      return effects.some(
        (e) => e.OptionName === "공격력" && e.IsPercentage === true
      );
    }
    if (opt === "공격력+") {
      return effects.some(
        (e) => e.OptionName === "공격력" && e.IsPercentage === false
      );
    }
    if (opt === "무기 공격력") {
      return effects.some(
        (e) => e.OptionName === "무기 공격력" && e.IsPercentage === true
      );
    }
    if (opt === "무기 공격력+") {
      return effects.some(
        (e) => e.OptionName === "무기 공격력" && e.IsPercentage === false
      );
    }
    // 그 외 옵션은 기존대로 부분 일치
    return effects.some((e) => e.OptionName.includes(opt));
  }).length;

  if (count >= 3) {
    return {
      pointStyle: "circle",
      borderColor: "#222222",
    };
  }
  if (count === 2) {
    return {
      pointStyle: "circle",
      borderColor: "#9e9e9e",
    };
  }
  return {
    pointStyle: "rect"
  };
}

// pointStyle, label 콜백 분리
function getTooltipLabel(result, input, context) {
  const idx = context.dataIndex;
  const grindIdx = context.datasetIndex + input[2].length;
  const item = result[grindIdx][idx];
  if (!item) return '';
  return `힘민지: ${item.stat}-${Math.round(context.raw.x * 100000) / 1000}% | 거래횟수: ${item.tradeLeft}회 | 골드: ${context.raw.y} | \n${item.effects.slice(5).map((item) => [item["OptionName"] + ": " + item["Value"] + "%".repeat(item["Value"] % 1 != 0)]).join(' | ')}`;
}

function makeDataset(result, input) {
  const grindColors = ["#aacff3", "#f6b7c1", "#f8d2a5"];
  const datasets = [];
  for (let grindNum = input[2].length; grindNum <= 3; grindNum++) {
    const dataArr = result[grindNum] || [];
    // pointStyle, borderColor 배열을 한 번에 계산
    const pointStyles = [];
    const pointBorderColors = [];
    for (const item of dataArr) {
      const style = getPointStyleByOption(item.effects);
      pointStyles.push(style.pointStyle);

      if (!style.borderColor) {
        pointBorderColors.push(grindColors[grindNum - 1]); 
      } else {
        pointBorderColors.push(style.borderColor);
      }
    }
    datasets.push({
      label: `${grindNum}연마`,
      data: dataArr.map((item) => ({ x: item.statPer, y: item.buyPrice })),
      borderColor: grindColors[grindNum - 1],
      backgroundColor: grindColors[grindNum - 1],
      pointRadius: 4,
      pointStyle: pointStyles,
      pointBorderColor: pointBorderColors,
      pointBorderWidth: 0.5,
    });
  }
  return datasets;
}

function updateChart(result, input) {
  const datasets = makeDataset(result, input);
  const ctx = document.getElementById("scatter-chart").getContext("2d");
  if (window.myChart) window.myChart.destroy();
  window.myChart = new Chart(ctx, {
    type: "scatter",
    data: { datasets },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          callbacks: {
            label: (context) => getTooltipLabel(result, input, context),
          },
          bodyFont: { size: 14 },
        },
        zoom: {
          pan: { enabled: true, mode: "xy", modifierKey: "ctrl" },
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: "xy",
            onZoomStart: ({ chart, event }) => {
              if (event.altKey) { chart.options.plugins.zoom.zoom.mode = "x"; return true; }
              if (event.shiftKey) { chart.options.plugins.zoom.zoom.mode = "y"; return true; }
              return false;
            },
            onZoomComplete: ({ chart }) => { chart.options.plugins.zoom.zoom.mode = "xy"; },
          },
          limits: { x: { min: 0, max: 1 }, y: { min: 0 } },
        },
      },
      onClick: handleChartClick(result, input),
      scales: {
        x: { title: { display: true, text: "힘민지%", font: { size: 24 } } },
        y: { title: { display: true, text: "골드", font: { size: 24 } } },
      },
    },
  });
}

// 차트 클릭 핸들러 분리
function handleChartClick(result, input) {
  return async (event, elements) => {
    var btn = document.createElement("button");
    btn.className = "button button--deal-buy";
    btn.textContent = "구매하기";
    btn.dataset.productid = null;
    btn.hidden = true;
    document.querySelector(".content--auction").appendChild(btn);
    if (elements.length > 0) {
      const index = elements[0].index;
      const grindIdx = elements[0].datasetIndex + input[2].length;
      const item = result[grindIdx] && result[grindIdx][index];
      if (!item) return;
      var grindOptions = item.effects.slice(5);
      const form = {
        itemName: item.name,
        gradeQuality: item.gradeQuality == 100 ? item.gradeQuality : Math.floor(item.gradeQuality / 10) * 10,
        category: category[input[0]],
        grade: item.grade,
        upgrade: item.grindNum,
        enlightenment: item.effects[0]["Value"],
        grindOption1: grindOptions[0] && {
          type: optionFullName[grindOptions[0]["OptionName"] + "+".repeat(!grindOptions[0]["IsPercentage"])],
          grade: grindOptions[0]["IsPercentage"] ? grindOptions[0]["Value"] * 100 : grindOptions[0]["Value"],
        },
        grindOption2: grindOptions[1] && {
          type: optionFullName[grindOptions[1]["OptionName"] + "+".repeat(!grindOptions[1]["IsPercentage"])],
          grade: grindOptions[1]["IsPercentage"] ? grindOptions[1]["Value"] * 100 : grindOptions[1]["Value"],
        },
        grindOption3: grindOptions[2] && {
          type: optionFullName[grindOptions[2]["OptionName"] + "+".repeat(!grindOptions[2]["IsPercentage"])],
          grade: grindOptions[2]["IsPercentage"] ? grindOptions[2]["Value"] * 100 : grindOptions[2]["Value"],
        },
      };
      var pageCount = 0;
      var done = false;
      while (!done) {
        var doc = await searchAuction(form, pageCount);
        const id = findItemEqual(doc, item);
        if (id) {
          btn.dataset.productid = id;
          btn.click();
          done = true;
          btn.remove();
        }
        pageCount += 1;
      }
    }
  };
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
      if (!row) {
        return false;
      }
      const priceEl = row.querySelector(`td:nth-child(6) > div > em`);
      const nameEl = row.querySelector(`td:nth-child(1) > div.grade > span.name`);
      const statEl = row.querySelector(`td:nth-child(1)>div.grade>span`);
      const countEl = row.querySelector(`td:nth-child(1) > div.grade > span.count`);
      const btnEl = row.querySelector("td:nth-child(7) > button");
      if (!priceEl || !nameEl || !statEl || !countEl || !btnEl) {
        return false;
      }
      const buyPrice = parseFloat(priceEl.innerText.trim().replace(/,/g, ""));
      const name = nameEl.innerText.trim();
      const stat = parseInt(
        JSON.parse(statEl.dataset.item).Element_005.value.Element_001.match(
          /힘 \+(\d+)<BR>민첩 \+\1<BR>지능 \+\1/
        )[1]
      );
      const tradeLeftStr = countEl.innerText.trim();
      const tradeLeft =
        tradeLeftStr === "[구매 후 거래 불가]"
          ? 0
          : parseInt(tradeLeftStr.split("거래 ")[1].split("회")[0], 10);
      const id = btnEl.getAttribute("data-productid");
      return id &&
        buyPrice == item.buyPrice &&
        name == item.name &&
        stat == item.effects[2]["Value"] &&
        tradeLeft == item.tradeLeft
        ? id
        : false;
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

  // 모드 선택 (1: 텍스트, 2: 셋옵션)
  const modeSelect = document.createElement("select");
  ["특정등급필터", "특정옵션필터"].forEach((val) => {
    const option = document.createElement("option");
    option.value = val;
    option.textContent = val;
    modeSelect.appendChild(option);
  });
  styleInput(modeSelect);

  const textInput = document.createElement("input");
  textInput.type = "text";
  textInput.placeholder = "연마 옵션 등급 필터 (ex.상중)";
  textInput.setAttribute("autocomplete", "off");
  styleInput(textInput);

  const optionCheckbox = document.createElement("input");
  optionCheckbox.type = "checkbox";
  optionCheckbox.id = "myCheckbox";
  optionCheckbox.checked = true;
  optionCheckbox.style.margin = "0";

  const checkboxLabel = document.createElement("label");
  checkboxLabel.textContent = "깡공/깡무공 고려";
  checkboxLabel.setAttribute("for", "myCheckbox");

  // 스타일 통일을 위해 감싸는 div
  const checkboxWrapper = document.createElement("div");
  checkboxWrapper.style.display = "flex";
  checkboxWrapper.style.alignItems = "center";
  checkboxWrapper.style.gap = "0.3em";
  checkboxWrapper.appendChild(checkboxLabel);
  checkboxWrapper.appendChild(optionCheckbox);
  checkboxWrapper.style.display = "flex";
  checkboxWrapper.style.alignItems = "center";
  checkboxWrapper.style.padding = "0.4em";
  checkboxWrapper.style.border = "1px solid #777777";
  checkboxWrapper.style.borderRadius = "3px";
  checkboxWrapper.style.minWidth = "120px";
  checkboxWrapper.style.boxSizing = "border-box";
  checkboxWrapper.style.cursor = "pointer";
  checkboxWrapper.style.cursor = "pointer";
  checkboxWrapper.style.gap = "0.5em";

  // 6개의 select input 생성
  const optionSelects = createOptionSelects(optionFullName);

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
    const mode = modeSelect.value;
    const longText = longTextInput.value;
    const checkboxState = optionCheckbox.checked;
    if (mode === "특정등급필터") {
      const shortText = textInput.value;
      handleInputs(
        type,
        grade,
        mode,
        shortText,
        checkboxState,
        null,
        longText,
        submitInput
      );
    } else {
      const options = optionSelects.map((sel) => sel.value);
      handleInputs(type, grade, mode, null, null, options, longText, submitInput);
    }
  });

  // DOM 구성
  inlineWrapper.appendChild(typeSelect);
  inlineWrapper.appendChild(gradeSelect);
  inlineWrapper.appendChild(modeSelect);

  // 이 부분은 mode에 따라 다르게 삽입됨
  const inputAreaWrapper = document.createElement("div");
  inputAreaWrapper.style.display = "flex";
  inputAreaWrapper.style.flexWrap = "wrap";
  inputAreaWrapper.style.gap = "0.5em";
  inputAreaWrapper.style.justifyContent = "center";
  inputAreaWrapper.appendChild(textInput); // 초기값은 textInput
  inputAreaWrapper.appendChild(checkboxWrapper);

  inlineWrapper.appendChild(inputAreaWrapper);
  inlineWrapper.appendChild(submitInput);
  container.appendChild(inlineWrapper);

  // modeSelect 변경 이벤트
  modeSelect.addEventListener("change", () => {
    inputAreaWrapper.innerHTML = ""; // 초기화
    if (modeSelect.value === "특정등급필터") {
      inputAreaWrapper.appendChild(textInput);
      inputAreaWrapper.appendChild(checkboxWrapper);
    } else {
      optionSelects.forEach((sel) => inputAreaWrapper.appendChild(sel));
    }
  });

  // 긴 입력 + 저장 버튼
  const longInputWrapper = document.createElement("div");
  longInputWrapper.style.display = "flex";
  longInputWrapper.style.gap = "0.5em";
  longInputWrapper.style.alignItems = "center";
  longInputWrapper.style.position = "relative";
  longInputWrapper.style.marginTop = "1em";
  longInputWrapper.style.width = "100%";

  const longTextInput = document.createElement("input");
  longTextInput.type = "text";
  longTextInput.placeholder = "API Key";
  longTextInput.style.flex = "1";
  longTextInput.style.padding = "0.4em 2.4em 0.4em 0.6em"; // 오른쪽 여백 확보
  longTextInput.style.boxSizing = "border-box";
  longTextInput.setAttribute("autocomplete", "off");

  const faLink = document.createElement("link");
  faLink.rel = "stylesheet";
  faLink.href =
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css";
  document.head.appendChild(faLink);

  const toggleIcon = document.createElement("i");
  toggleIcon.className = "fa-solid fa-eye-slash";
  toggleIcon.style.position = "absolute";
  toggleIcon.style.top = "50%";
  toggleIcon.style.right = "100px";
  toggleIcon.style.transform = "translateY(-50%)";
  toggleIcon.style.cursor = "pointer";
  toggleIcon.style.color = "#888";

  toggleIcon.addEventListener("click", () => {
    const isPassword = longTextInput.type === "password";
    longTextInput.type = isPassword ? "text" : "password";
    toggleIcon.className = isPassword
      ? "fa-solid fa-eye-slash"
      : "fa-solid fa-eye";
  });

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
  longInputWrapper.appendChild(toggleIcon);
  longInputWrapper.appendChild(saveButton);
  container.appendChild(longInputWrapper);

  form.insertBefore(container, form.firstChild);

  function handleInputs(
    type,
    grade,
    mode,
    shortText,
    checkbox,
    options,
    longText,
    submitBtn
  ) {
    const input = [];
    const apikey = longText;
    var optionResult = [];
    let result;
    if (mode == "특정등급필터") {
      input.push(type, grade, shortText);
      console.log(input);
      console.log("타입:", type);
      console.log("등급:", grade);
      console.log("짧은 입력:", shortText);
      console.log("체크박스:", checkbox);
      console.log("긴 입력:", longText);
    } else {
      input.push(type, grade, options[1] + options[3] + options[5]);
      optionResult.push(
        [options[0], options[2], options[4]].map(
          (optionName) => reduceOptionName[optionName]
        )
      );
      console.log(input);
      console.log("타입:", type);
      console.log("등급:", grade);
      console.log("옵션:", options);
      console.log("긴 입력:", longText);
    }
    const btn = document.getElementById("copyBtn");
    if (btn) {
      btn.remove();
    }
    getSearchResult(input, apikey, optionResult, checkbox, submitBtn).then(
      (res) => {
        console.log("[!] 검색 결과:", res);
        result = res;
        // 히스토리 추가
        let label = `[${input[0]}][${input[1]}]`;
        if (optionResult && optionResult.length && optionResult[0]) {
          label += ` 옵션:${optionResult[0].join(",")}`;
        } else if (input[2]) {
          label += ` 등급:${input[2]}`;
        }
        searchHistory.push({
          label,
          input: JSON.parse(JSON.stringify(input)),
          result: res.map((arr) => arr.slice()),
        });
        renderHistoryUI();
        createChartAndOpenImage(res, input);
        submitBtn.value = "실행";
      }
    );
  }
})();
