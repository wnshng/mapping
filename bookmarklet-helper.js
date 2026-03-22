(function () {
  var RESULT_TEXT = "아래 코드를 복사해 북마크 URL에 붙여넣으세요.";

  function getCode() {
    function extractor() {
      var out = [];
      var seen = new Set();

      function toAbsolute(href) {
        try {
          return new URL(href, location.href).href;
        } catch (error) {
          return href || "";
        }
      }

      function isPlaceHref(href) {
        return /\/(p\/)?entry\/place\/|\/place\/[a-zA-Z0-9_-]+/i.test(href || "");
      }

      function isNoiseName(name) {
        var normalized = String(name || "").replace(/\s+/g, "");
        return (
          normalized === "지도" ||
          normalized === "홈" ||
          normalized === "MY" ||
          normalized === "내장소" ||
          normalized === "내장소보기"
        );
      }

      var anchors = Array.from(document.querySelectorAll("a[href]")).filter(function (a) {
        var href = a.getAttribute("href") || a.href || "";
        return isPlaceHref(href);
      });

      anchors.forEach(function (a) {
        var href = toAbsolute(a.getAttribute("href") || a.href || "");
        if (!href || /^https?:\/\/map\.naver\.com\/?([?#].*)?$/i.test(href)) {
          return;
        }

        var container = a.closest("li,article,[role='listitem'],div");
        var raw = (container ? container.innerText : a.innerText) || "";
        var lines = raw
          .split(/\n+/)
          .map(function (s) {
            return s.trim();
          })
          .filter(Boolean);

        var name = (
          a.getAttribute("aria-label") ||
          a.innerText ||
          lines[0] ||
          ""
        )
          .split("\n")[0]
          .trim();
        if (!name || name.length < 2 || isNoiseName(name)) {
          return;
        }

        var address =
          lines.find(function (line) {
            return /([가-힣]+(시|도)\s+)?[가-힣0-9]+(시|군|구)\s+[가-힣0-9]+(로|길|동|읍|면)/.test(line);
          }) ||
          lines.find(function (line) {
            return /(로|길|동|리)/.test(line) && /\d/.test(line);
          }) ||
          "";

        var key = name + "|" + address + "|" + href;
        if (seen.has(key)) {
          return;
        }
        seen.add(key);
        out.push([name, address, "", "", href].join("|"));
      });

      if (!out.length) {
        alert("장소를 찾지 못했습니다. 저장목록 리스트를 화면에 보이게 스크롤한 뒤 다시 실행하세요.");
        return;
      }

      var text = out.join("\n");
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard
          .writeText(text)
          .then(function () {
            alert("복사 완료: 앱의 텍스트 가져오기에 붙여넣으세요.");
          })
          .catch(function () {
            prompt("아래 텍스트를 복사하세요", text);
          });
      } else {
        prompt("아래 텍스트를 복사하세요", text);
      }
    }

    return "javascript:(" + extractor.toString() + ")();";
  }

  function fillBox() {
    var box = document.getElementById("bookmarkletCodeBox");
    if (box && !box.value) {
      box.value = getCode();
    }
  }

  function fallbackCopyText(text) {
    var temp = document.createElement("textarea");
    temp.value = text;
    temp.setAttribute("readonly", "true");
    temp.style.position = "fixed";
    temp.style.opacity = "0";
    document.body.appendChild(temp);
    temp.focus();
    temp.select();
    var copied = false;
    try {
      copied = document.execCommand("copy");
    } catch (error) {
      copied = false;
    }
    temp.remove();
    return copied;
  }

  function showMessage(message) {
    var helperMsg = document.getElementById("naverHelperMsg");
    if (helperMsg) {
      helperMsg.textContent = message;
    }
  }

  function copyCode() {
    var code = getCode();
    fillBox();

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(code)
        .then(function () {
          showMessage("북마클릿 코드가 복사되었습니다. 북마크 URL에 붙여넣어주세요.");
        })
        .catch(function () {
          var copiedByFallback = fallbackCopyText(code);
          if (copiedByFallback) {
            showMessage("대체 방식으로 복사했습니다. 북마크 URL에 붙여넣어주세요.");
          } else {
            var details = document.getElementById("bookmarkletManualWrap");
            if (details) {
              details.open = true;
            }
            showMessage("자동 복사 실패. 수동 복사 열기에서 코드를 복사해주세요.");
          }
        });
      return;
    }

    var copied = fallbackCopyText(code);
    if (copied) {
      showMessage("복사 완료. 북마크 URL에 붙여넣어주세요.");
    } else {
      var details2 = document.getElementById("bookmarkletManualWrap");
      if (details2) {
        details2.open = true;
      }
      showMessage(RESULT_TEXT);
    }
  }

  function selectCode() {
    fillBox();
    var box = document.getElementById("bookmarkletCodeBox");
    if (!box) {
      return;
    }
    box.focus();
    box.select();
    showMessage("코드가 선택되었습니다. Command + C 로 복사하세요.");
  }

  function bind() {
    fillBox();
    var copyBtn = document.getElementById("copyBookmarkletBtn");
    if (copyBtn && !copyBtn.__mapingBound) {
      copyBtn.__mapingBound = true;
      copyBtn.addEventListener("click", function () {
        copyCode();
      });
    }

    var selectBtn = document.getElementById("selectBookmarkletBtn");
    if (selectBtn && !selectBtn.__mapingBound) {
      selectBtn.__mapingBound = true;
      selectBtn.addEventListener("click", function () {
        selectCode();
      });
    }
  }

  window.getMapingBookmarkletCode = getCode;
  window.mapingCopyBookmarklet = copyCode;
  window.mapingSelectBookmarklet = selectCode;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
