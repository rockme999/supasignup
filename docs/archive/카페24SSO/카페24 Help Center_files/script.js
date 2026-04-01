hljs.initHighlightingOnLoad();

var HC_SETTINGS = {
  css: {
    activeClass: "is-active",
    hiddenClass: "is-hidden",
  },
};

/**
 * Show/Hide Tabs for Mobile
 *
 * @param null
 */
$(document).on("click", "#tabs_SM", function () {
  $(this).addClass("active").siblings().removeClass("active");
  $(".tab-shopping--mall").show();
  $(".tab-market--plus").hide();
});

$(document).on("click", "#tabs_MP", function () {
  $(this).addClass("active").siblings().removeClass("active");
  $(".tab-market--plus").show();
  $(".tab-shopping--mall").hide();
});


$(window).on('resize', function() {
  if (window.innerWidth >= 768) {
    $(".tab-market--plus").show();
    $(".tab-shopping--mall").show();
  } else {
    const oActiveTab = $('.tabs__mobile .active');
    if (oActiveTab.attr('id') === 'tabs_SM') {
      $(".tab-market--plus").hide();
    } else {
      $(".tab-shopping--mall").hide();
    }
  }
});

/* displays the article snippet */
function getSnippet(sBody) {
  const oTempDiv = document.createElement("div");
  oTempDiv.innerHTML = sBody;

  /* object will be used to check if class exists in the article's body document */
  const oClassContent = oTempDiv.getElementsByClassName("article-snippets");

  /* object will be used to set the snippet text */
  const sTagHTML = oTempDiv.getElementsByClassName("article-snippets")[0];

  /* checks if class array is empty or not */
  if (oClassContent.length === 0) {
    return "";
  } else {
    return sTagHTML.innerHTML;
  }
}

/** Home Page - Swiper Section */

document.addEventListener("DOMContentLoaded", function () {
  const oCards = $(".swiper-slide.cards-item");
  const oSections = $(".swiper-wrapper");
  const oCardSectionButtons = $("#tabsGuide .sections-item-link");
  const oScrollButtonLeft = $("#PrevButton");
  const oScrollButtonRight = $("#NextButton");
  const SCROLL_RANGE = {
    desktop: 700,
    tablet: 630,
  };

  /**
   * Validator : Removes a link if it has no href defined and stretches the other link to fit the entire card
   *
   * @param {*} oCard
   */
  function _validateLinks(oCard) {
    const oLink1 = $(oCard.children(".cards-item__link")[0]);
    const oLink2 = $(oCard.children(".cards-item__link")[1]);
    if (oLink1.attr("href") === "") {
      oLink2.css("width", "100%");
      oLink1.remove();
    } else if (oLink2.attr("href") === "") {
      oLink1.css("width", "100%");
      oLink2.remove();
    }
  }

  /**
   * Validator : Hides a card if it has no contents
   */
  function _checkCardContents() {
    oCards.each(function () {
      const oCurrentCard = $(this);
      _validateLinks(oCurrentCard);
      if (oCurrentCard.text().trim() === "") {
        oCurrentCard.hide();
        return;
      }
    });
  }

  /**
   * Handles disabling / enabling of the scroll buttons
   *
   * @param {*} oActiveSection
   * @param {*} sCurrentDevice
   */
  function _checkScrollLimit(oActiveSection, sCurrentDevice) {
    const iScrollLeft = oActiveSection.scrollLeft();
    oScrollButtonLeft.removeClass("disabled");
    oScrollButtonRight.removeClass("disabled");
    if (iScrollLeft === 0) oScrollButtonLeft.addClass("disabled");
    if (sCurrentDevice === "desktop" && iScrollLeft > 600)
      oScrollButtonRight.addClass("disabled");
    if (sCurrentDevice === "tablet" && iScrollLeft > 1000)
      oScrollButtonRight.addClass("disabled");
  }

  /**
   * Handles setting the active section button & displays the appropriate section cards
   *
   * @param {*} oSectionButton
   */
  function setActiveSection(oSectionButton) {
    const sTargetSection = oSectionButton.text();
    oCardSectionButtons.each(function () {
      $(this).parent().removeClass("active");
    });
    oSections.removeClass("active");
    oSectionButton.parent().addClass("active");
    $("#" + sTargetSection)
      .addClass("active")
      .scrollLeft(0);
    oScrollButtonLeft.addClass("disabled");
    oScrollButtonRight.removeClass("disabled");
  }

  /**
   * Handles the scroll behavior of the swiper section
   *
   * @param {*} oActiveSection
   * @param {*} sDirection
   */
  function scrollSection(oActiveSection, sDirection) {
    const iScreenWidth = window.innerWidth;
    let sCurrentDevice = "tablet";
    sDirection = sDirection === "left" ? "-" : "+";
    if (iScreenWidth >= 1080) sCurrentDevice = "desktop";
    oActiveSection.animate(
      { scrollLeft: sDirection + "=" + SCROLL_RANGE[sCurrentDevice] },
      300
    );
    setTimeout(function () {
      _checkScrollLimit(oActiveSection, sCurrentDevice);
    }, 350);
  }

  function _init() {
    _checkCardContents();
  }

  /**
   * Init Event Listeners
   */
  oCardSectionButtons.on("click", function () {
    setActiveSection($(this));
  });
  oScrollButtonLeft.on("click", function () {
    const oActiveSection = $(".swiper-wrapper.active");
    scrollSection(oActiveSection, "left");
  });
  oScrollButtonRight.on("click", function () {
    const oActiveSection = $(".swiper-wrapper.active");
    scrollSection(oActiveSection, "right");
  });

  _init();

  $(document).on("click", "#query", function (event) {
    setTimeout(() => {
      if (!this.value.length) $(".search__preview").remove();
      $('.suggested-keyword--list').show();
    }, 100);
  });

  $(document).on("keyup", 'input[name="query"]', function () {
    if (this.value.trim().length === 0) {
      $(".search__preview").remove();
      $('.suggested-keyword--list').show();
    }
  });

  $('input[name="query"]').on('textInput', async function (event) {
    var iKeyCode = event.originalEvent.data.charCodeAt(0);
    if (this.value.trim().length && iKeyCode === 32) {

      let oSearchBar = $(".search__form");
      let oSearchPreview = $(`<div id="search__box" class="box__section home search__preview" style="position: relative;display: block;z-index: 1000000000000000;margin: 8px auto 0;">
      <div class="box__item" style="max-width: initial;z-index: 10000000000000; border-radius: 4px; padding: 0;"></div>
    </div>`);

      if ($(this).hasClass('search-bar__input')) {
          oSearchBar = $(".search-bar__form");
          oSearchPreview = $(`<div id="search__box" class="box__section search__preview" style="position: absolute;display: block; z-index: 1000000000000000;">
          <div class="box__item" style="max-width: initial;z-index: 10000000000000; border-radius: 4px; padding: 0;"></div>
        </div>`);
      }

      if (!$("#search__box").length) {
        $(".search__content").css("position", "relative");
        oSearchPreview.insertAfter(oSearchBar);
        $('.suggested-keyword--list').hide();
      }

      $("#search__box > .box__item").html(
        '<div style="padding: 16px">결과를 가져오는 중입니다. 잠시만 기다려 주십시오...</div'
      );

      const response = await fetch(
        `/api/v2/help_center/articles/search.json?query=${this.value.trim()}`
      );
      const data = await response.json();

      if (!data.results.length) {
        $("#search__box > div").html(
          `<div style="padding: 16px">‘${this.value.trim()}’ 에 대한 검색결과가 없습니다.</div>`
        );
        return;
      }

      $("#search__box > div")
        .html(`<ul class="box__item--wrapper" style="z-index: 10000000000000;max-height: 250px;overflow-y: auto;">
          ${data.results
            .map(
              ({ title, html_url: url }, idx) => `<li style="padding: 16px 16px 0 16px;">
            <div class="content">
              <a class="title" style="display: block; padding-bottom:16px; border-bottom: 1px solid rgba(0,0,0,0.2);white-space: nowrap;overflow: hidden;text-overflow: ellipsis;" href="${url}">${title}</a>
            </div>
          </li>`
            )
            .join("\n")}
      </ul>`);
    } else if (this.value.trim().length === 0) { $(".search__preview").remove(); $('.suggested-keyword--list').show(); }
  });
});

$(document).ready(function() {
  $(document).on('click', '.search__box--close', function() {
    $('#search__box').remove();
  });
});

$(document).ready(function() {
  $(document).on('click', '.search__box--close', function() {
    $('#search__box').remove();
  });

  if ($(".is-guide-template").length !== 0) {
    $(".breadcrumbs-section ol li:not(:nth-child(1)) a").each(function () {
      $(this).removeAttr("href");
    });
  }
});
