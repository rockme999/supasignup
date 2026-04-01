/**
 * @author Gian Paolo Carpena <gian@simplexi.com.ph>
 * @version 1.0
 * 
 * Article Page - custom event listeners
 * 
 */
 document.addEventListener("DOMContentLoaded", function() {
  if ($('.is-guide-template').length === 1) {
    //  Article Main
    let oArticleSummary = document.querySelector('#article-summary');
    const oArticleBody = document.querySelector('.article-main__content');
    let oReviewTextArea = document.querySelector('.review-textarea__input');

    // Table of contents
    let oArticleToc = document.querySelector('.article-main__toc');
    let aTocItems = document.querySelectorAll('.article-body h2, h3, h4')
    let oArticleTocContent = document.querySelector('.toc-content');

    // Sidenav
    const oSidenavButton = document.querySelector('.sidenav-mobile__button');
    const oSidenavMenu = document.querySelector('.sidenav-menu');

    //Related Articles
    const oRelatedArticleMain = $('#related-article-wrapper');

    //Review Section
    const oReviewSection = $('#review-section');

    //Video Article
    const oVideoTimeStampWrapper = $('#video-timestamp');
    const oVideoTimeStampContent = $('#timestamp-content');

    /**
     * @author Gian Paolo Carpena <gian@simplexi.com.ph>
     * @version 1.0
     * 
     * Filters headers with class
     * 
     */
    function filterHeaders() {
      aTocItems = Array.from(aTocItems).filter(function(oTocItem) {
        return oTocItem.hasAttribute('class') === false &&
          oTocItem.parentElement.classList.contains('article-body') === true &&
          oTocItem.innerHTML !== '&nbsp;';
      })
    }

    /**
     * @author Gian Paolo Carpena <gian@simplexi.com.ph>
     * @version 1.0
     * 
     * Creates table of contents
     * 
     */
    function createTableOfContents() {

      // First Depth
      let oTocMenu = document.createElement('UL');
      oTocMenu.classList.add('toc-menu');
      let oPreviousFirstDepth;

      if (aTocItems.length !== 0 || $('#article-summary').length > 0) {
        oArticleTocContent.append(oTocMenu);
      }

      if ($('#article-summary').length > 0) {
        const oTocSummary = document.createElement('LI');
        oTocSummary.classList.add('toc-menu__item', 'toc-menu__summary');
        const oTocSummaryLink = document.createElement('A');
        oTocSummaryLink.href = '#article-summary';
        oTocSummaryLink.classList.add('toc-menu__text');
        oTocSummaryLink.innerHTML = '요약';
        oTocSummary.insertAdjacentElement('afterbegin', oTocSummaryLink);
        oTocMenu.insertAdjacentElement('afterbegin', oTocSummary);
      }

      if (aTocItems.length === 0 && $('#article-summary').length > 0) {
        $('.toc-menu').css({'overflow-y': 'unset'});
      }

      //Create hiearchy
      aTocItems.forEach(function(oTocItem, iIndex) {
        oTocItem.classList.add('toc-header--on-scroll');
        oTocItem.id = oTocItem.textContent.replace(/\//g, '').split(' ').join('_') + iIndex;
        let oTocMenuItem = document.createElement('LI');
        let oTocMenuItemText = document.createElement('A');

        oTocMenuItemText.innerHTML = oTocItem.textContent;
        oTocMenuItemText.href = '#' + oTocItem.id;
        oTocMenuItem.append(oTocMenuItemText)

        if (oTocItem.tagName === 'H3') {
          setTocSubmenu(oTocMenuItem, oTocMenuItemText, oPreviousFirstDepth)
          return
        }
  
        oTocMenu.insertAdjacentElement('beforeend', oTocMenuItem)
        oTocMenuItem.classList.add('toc-menu__item');
        oTocMenuItemText.classList.add('toc-menu__text')
        oPreviousFirstDepth = oTocMenuItemText;
      })
      setMobileToc();
      checkHeaderDisplayedOnScroll();
    }

    /**
     * @author Gian Paolo Carpena <gian@simplexi.com.ph>
     * @version 1.0
     * 
     * Set table of contents submenu
     * 
     * @param {object} oItem
     * @param {object} oItemText
     * @param {object} oMainItem
     */
    function setTocSubmenu(oItem, oItemText, oMainItem) {
      const oCreatedMenu = document.querySelectorAll('.toc-menu__item')[0];
      if (typeof(oCreatedMenu) != 'undefined' && oCreatedMenu !== null && oMainItem !== undefined) {
        let oTocSubmenu;
        if (oMainItem.nextElementSibling === null) {
          oTocSubmenu = document.createElement('UL');
          oTocSubmenu.classList.add('toc-submenu');
          oMainItem.insertAdjacentElement('afterend', oTocSubmenu);
        } else {
          oTocSubmenu = oMainItem.nextElementSibling;
        }
        oItem.classList.add('toc-submenu__item');
        oItemText.classList.add('toc-submenu__text');
        oTocSubmenu.insertAdjacentElement('beforeend', oItem);
      }
    }

    /**
     * @author Gian Paolo Carpena <gian@simplexi.com.ph>
     * @version 1.0
     * 
     * Toggle table of contents for mobile view
     * 
     * @param {object} oEvent
     * @param {object} oContent
     */
    function toggleTableOfContents(oEvent, oContent) {
      if (oContent.classList.contains('toc-content-show') === false) {
        oContent.classList.add('toc-content-show')
        oEvent.currentTarget.classList.add('toc-title-active')
        return
      }
      oContent.classList.remove('toc-content-show')
      oEvent.currentTarget.classList.remove('toc-title-active')
    }

    /**
     * @author Gian Paolo Carpena <gian@simplexi.com.ph>
     * @version 1.0
     * 
     * Set table of contents for mobile view
     * 
     */
    function setMobileToc() {
      let oArticleContainer = document.querySelector('#article-content');
      let oMobileToc = oArticleToc.cloneNode(true);
      oMobileToc.classList.remove('article-main__toc--desktop');
      oMobileToc.classList.add('article-main__toc--mobile');

      if (oArticleSummary != null) {
        oArticleSummary.after(oMobileToc);
      } else {
        oArticleContainer.insertBefore(oMobileToc, oArticleContainer.firstChild);
      }

      let oMobileTocTitle = document.querySelector('.toc-title');
      let oMobileTocContent = document.querySelector('.toc-content');
      oMobileTocTitle.addEventListener('click', function(oEvent) {
        toggleTableOfContents(oEvent, oMobileTocContent);
      })
    }

    /**
     * @author Gian Paolo Carpena <gian@simplexi.com.ph>
     * @version 1.0
     * 
     * Add active class based on active href
     * 
     */
    function setTocItemAsActive(sActiveHref) {
      let oTocMenuItem = document.querySelectorAll('.toc-menu__item a');
      oTocMenuItem.forEach(function(oItem) {
        if (oItem.getAttribute('href').replace('#', '') === sActiveHref) {
          oItem.parentNode.classList.add('toc-item-active');
        } else {
          oItem.parentNode.classList.remove('toc-item-active');
        }
      })
    }
    /**
     * @author Gian Paolo Carpena <gian@simplexi.com.ph>
     * @version 1.0
     * 
     * Check current item header shown based on scroll position
     * 
     */
    function checkHeaderDisplayedOnScroll() {
      const oArticleSummary = document.getElementsByClassName('toc-menu__summary')[0];
      let currentActiveIndex = 0;
      if (aTocItems.length === 0) return;
      if ($(window).scrollTop() === 0) {
        setTocItemAsActive('article-summary');
      } else {
        setTocItemAsActive(aTocItems[currentActiveIndex].id);
      }
      $(window).scroll(function() {
        let iScrollPos = $(window).scrollTop();
        for (let iCounter = 0; iCounter < aTocItems.length; iCounter +=1) {
          let iCurrentItemOffset = document.getElementById(`${aTocItems[iCounter].id}`).offsetTop;
          if (oArticleSummary.classList.contains('toc-item-active')) {
            setTocItemAsActive(aTocItems[0].id);
          }
          if ((iCurrentItemOffset - iScrollPos) < 50) {
            currentActiveIndex = iCounter;
            setTocItemAsActive(aTocItems[currentActiveIndex].id);
          }
          // first item
          if (iScrollPos === 0) {
            setTocItemAsActive('article-summary');
          }
        }
      });
    }

    /**
     * @author Gian Paolo Carpena <gian@simplexi.com.ph>
     * @version 1.0
     * 
     * Sets article table of contents display
     * 
     */
    function setArticleTocDisplay() {
      const aSidebarComponents = document.querySelector('.right-recent-views, .article-paginate');
      if (aTocItems.length === 0 && aSidebarComponents === null) {
        oArticleToc.style.display = 'none';
      }
    }

    /**
     * Sets the max width for article contents if the page has a TOC section
     * 
     * @returns void
     */
    function _setArticleContentWidth() {
      if (oArticleToc.style.display !== 'none') { oArticleBody.style.maxWidth = '720px'; }
    }

    /**
     * @author Gian Paolo Carpena <gian@simplexi.com.ph>
     * @version 1.0
     * 
     * Executes callback if element is not null
     * 
     * @param {object} oElement
     * @param {function} fCallback
     */
    function executeIfNotNull(oElement, fCallback) {
      if (oElement !== null) {
        fCallback()
      }
    }
    executeIfNotNull(aTocItems, filterHeaders)
    executeIfNotNull(oArticleToc, setArticleTocDisplay)
    executeIfNotNull(oArticleTocContent, createTableOfContents)
    executeIfNotNull(oReviewTextArea, function() {
      oReviewTextArea.setAttribute('placeholder', 'What did you like about this page?(optional)')
    })

    /* Load Articles from API
     * Include article ID or Base URL
     * 
     * @param string sArticleId
     * @param string sLabel
     * @param string sUrl
     */
    function getArticles(sLabel = '', sArticleId = '.json?') {
      let oArticles = {};
      let sBaseUrl = '/api/v2/help_center/articles'
      $.ajax({
        url: sBaseUrl + sArticleId + sLabel,
        async: false,
        success: function(oResponse) {
          oArticles = oResponse
        },
        error: function(oResponse) {
          console.error(oResponse);
        }
      })
      return oArticles;
    }

    /* Generate Label url
     * 
     * @param array aLabels
     */
    function getLabels(aLabels) {
      let sArticleLabels = 'page[size]=4&label_names='
      return (aLabels.length === 0) ? 0 : sArticleLabels + aLabels.join(',')
    }

    /* Display loaded articles to page
     * 
     * @param string sArticleLabels
     * @param bool bShowDates
     * @param string sDiv
     */
    function generateArticles(sArticleLabels, bShowDates, sDiv) {
      if (sArticleLabels === 0) return
      let oArticles = getArticles(sArticleLabels + (bShowDates === true ? ',' + sChangelogLabel : ''))
      let sArticleHTML = generateHTML(oArticles, bShowDates)
      if (sArticleHTML !== '') {
        $(sDiv).append(sArticleHTML)
        $(sDiv).show();
      }
    }

    /* Build html tags for Article display
     * 
     * @param object oArticles
     * @param bool bShowDates
     */
    function generateHTML(oArticles, bShowDates) {
      let sHTML = ''
      let sDate = ''
      let iCount = 0
      let bAddArticle = true;
      oArticles.articles.forEach(function(oArticle) {
        bAddArticle = oArticle.id !== sArticleId && (bShowDates === true ? bShowDates : (oArticle.label_names.includes(sChangelogLabel) === false))
        if (bAddArticle === true) {
          sDate = formatDate(oArticle.created_at)
          sHTML += `<p class="margin-reset"><a class="article-section article-section-item ${bShowDates === false ? 'full-width' : 'article-section-item-width'}" href="${oArticle.html_url}">${oArticle.title}</a>`
          sHTML += bShowDates === false ? '</p>' : `<span class="article-section article-section-timestamp">${sDate}</span></p>`
        }
      })
      return sHTML
    }

    /* Format date for display: 2021-07-05
     * 
     * @param string sDate
     */
    function formatDate(sDate) {
      let sYear = new Date(sDate).toLocaleDateString('default', { year: 'numeric' })
      let sMonth = new Date(sDate).toLocaleDateString('default', { month: 'numeric' })
      let sDay = new Date(sDate).toLocaleDateString('default', { day: 'numeric' })
      return `${sYear}-${(sMonth < 10 ? '0' : '') + sMonth}-${(sDay < 10 ? '0' : '') + sDay}`
    }

    /* Change the Recently Viewed Generated Title
     * 
     * @return Void
     */
    function changeRecentViewTitle() {
      const oRecentViewWrapper = $('.right-recent-views');
      const oRecentCiewTitle = oRecentViewWrapper.find('.recent-articles-title');
      $('.recently-view-mobile .recent-articles-title').html('최근 본 콘텐츠');
      oRecentCiewTitle.html('최근 본 콘텐츠');

    }

    /* Set section to hidden if children nodes length is less than one
     * 
     * @param object oElement
     */
    function setSectionToHidden(oElement) {
      if ($(oElement).children().length > 1) {
        $(oElement).show();
        return
      }
      $(oElement).hide();
    }

    /* Mobile navigation menu button function
     * Hide/Show the navigation menu
     * 
     */
    function hideShowSidenav() {
      oSidenavButton.addEventListener('click', function() {
        if (this.classList.contains('sidenav-mobile__button--active') === true) {
          oSidenavMenu.style.display = 'none';
          oSidenavButton.classList.remove('sidenav-mobile__button--active');
        } else {
          oSidenavMenu.style.display = 'block';
          oSidenavButton.classList.add('sidenav-mobile__button--active');
        }
      });
    }

    /* Mobile navigation menu button function
     * Hides the navigation menu when user scrolls past 400px
     * 
     */
    if ($(window).width() < 767) {
      $(window).scroll(function() {
        let height = $(window).scrollTop();
    
        if(height  > 400) {
          oSidenavMenu.style.display = 'none';
          oSidenavButton.classList.remove('sidenav-mobile__button--active');
        }
      });
    }

    let sArticleId = $('#article-id').data('current_id')
    let sRecentDiv = '#recent-updates'
    let sRelatedDiv = '#related-guide'
    let sChangelogLabel = 'changelog'

    setSectionToHidden(sRecentDiv);
    setSectionToHidden(sRelatedDiv);
    _setArticleContentWidth();
    changeRecentViewTitle();
    hideShowSidenav();


    /* Generate Label of the current article
     * 
     * @param array aLabels
     */
    function getCurrentLabel(aLabel) {
      return (aLabel.length === 0) ? 0 : aLabel;
    }

    /* Transfer the related article from content to the bottom of the content
     * 
     */
    oRelatedArticleMain.insertAfter(oReviewSection);

    /* Transfer the video timestamp from content to sidebar
     * 
     */
    oVideoTimeStampContent.detach().appendTo(oVideoTimeStampWrapper);
  }

  // REVIEW SECTION COMPONENT

    let oReviewSection = document.querySelector('.review-section');
    // Vote section
    let oReviewVoteBtnAll = document.querySelectorAll('.review-vote__button');
    let oReviewVoteBtnYes = document.querySelector('.review-vote__button-yes');
    let oReviewVoteBtnNo = document.querySelector('.review-vote__button-no');

    // Vote and Comment helpers
    let oHelperVoteBtnYes = document.querySelector('.vote-helper-button-yes');
    let oHelperVoteBtnNo = document.querySelector('.vote-helper-button-no');
    let oHelperBtnSelected = document.querySelector('.vote-helper-button--selected')
    let oHelperFormButton = document.querySelector('.form-helper-button');

    // Notification Text
    const oYesNotification = document.getElementsByClassName('eVotedYes')[0];
    const oNoNotification = document.getElementsByClassName('eVotedNo')[0];
    const oContactButton = document.getElementsByClassName('voteButtonContact')[0];

    /**
     * @author Gian Paolo Carpena <gian@simplexi.com.ph>
     * @version 1.0
     * 
     * Sets review button active on load
     * 
     * @param {object} oEvent
     */
    function setReviewButtonActiveOnLoad() {
        if (oHelperBtnSelected === null) {
            return
        }
        if (oHelperBtnSelected.dataset.type === 'up') {
            oReviewVoteBtnYes.classList.add('review-vote__button-selected');
            oReviewVoteBtnYes.setAttribute('aria-pressed', 'true')
            return
        }
        oReviewVoteBtnNo.classList.add('review-vote__button-selected');
        oReviewVoteBtnNo.setAttribute('aria-pressed', 'true')
    }

    /**
     * @author Gian Paolo Carpena <gian@simplexi.com.ph>
     * @version 1.0
     * 
     * Checks selected vote by user
     * 
     */
    function checkSelectedVote() {
        let oVoteSelected = document.querySelector('.review-vote__button-selected')
        if (oVoteSelected.dataset.vote === 'yes') {
            oHelperVoteBtnYes.click();
            return
        }
        oHelperVoteBtnNo.click();
    }

    /**
     * @author Jasz <james@simplexi.com.ph>
     * @version 1.1.4
     * 
     * Function when the button was clicked.
     * 
     */
    function checkClickedButton(oEvent) {
        oReviewVoteBtnAll.forEach(function (oBtn) {
            if (oEvent.currentTarget !== oBtn) {
                oBtn.classList.remove('review-vote__button-selected');
                oBtn.setAttribute('aria-pressed', 'false');
            }
        })
        if (oEvent.currentTarget.getAttribute('aria-pressed') === 'true' && oEvent.currentTarget.nextElementSibling.getAttribute('aria-pressed') === 'true') {
            oEvent.currentTarget.setAttribute('aria-pressed', 'false');
            oEvent.currentTarget.classList.remove('review-vote__button-selected')
            oEvent.currentTarget.nextElementSibling.click();
            return
        }
        if (oEvent.currentTarget.getAttribute('aria-pressed') === 'true') {
            oEvent.currentTarget.setAttribute('aria-pressed', 'false');
            oEvent.currentTarget.classList.remove('review-vote__button-selected')
            return
        }
        if (oEvent.currentTarget.getAttribute('aria-pressed') === 'false') {
            oEvent.currentTarget.setAttribute('aria-pressed', 'true');
            oEvent.currentTarget.classList.add('review-vote__button-selected')
            oEvent.currentTarget.nextElementSibling.click();
            return
        }
    }

    /**
     * @author Jasz <james@simplexi.com.ph>
     * @version 1.1.4
     * 
     * Notification text function.
     * 
     */
    function showNotificationText() {
        const oSelectedVote = document.querySelector('.review-vote__button-selected');
        if (oSelectedVote.dataset.vote === 'yes') {
            oYesNotification.classList.add('voteButtonClickedShow');
            oNoNotification.classList.remove('voteButtonClickedShow');
        } else {
            oYesNotification.classList.remove('voteButtonClickedShow');
            oNoNotification.classList.add('voteButtonClickedShow');
        }
        checkSelectedVote();
        setTimeout(function () {
            oYesNotification.classList.remove('voteButtonClickedShow');
            oNoNotification.classList.remove('voteButtonClickedShow');
        }, 5000)
    }

    /**
     * @author Jasz <james@simplexi.com.ph>
     * @version 1.1.4
     * 
     * Check if Review Section exist.
     * 
     */

    if (oReviewSection === null) {
        return
    }

    setReviewButtonActiveOnLoad();

    /**
     * @author Jasz <james@simplexi.com.ph>
     * @version 1.1.4
     * 
     * Trigger function on button click.
     * 
     */
    oReviewVoteBtnAll.forEach(function (oElement) {
        oElement.addEventListener('click', function(oThis) {
            checkClickedButton(oThis);
            showNotificationText();
        });
    });

    /**
     * @author Jasz <james@simplexi.com.ph>
     * @version 1.1.4
     * 
     * Open chatbot when contact button was clicked.
     * 
     */
    oContactButton.addEventListener('click', function() {
        const oChatbotButton = document.getElementsByClassName('gzVfHp')[0];
        const oChatbotButtonMobile = document.getElementsByClassName('jQPSEh')[0];
        const iPcViewport = window.matchMedia('(min-width: 769px)');
        const iMobileViewport = window.matchMedia('(max-width: 768px)');

        oNoNotification.classList.remove('voteButtonClickedShow');
        if (iPcViewport.matches) {
            oChatbotButton.click();
        }
        if (iMobileViewport.matches) {
            oChatbotButtonMobile.click();
        }
        oContactButton.parentNode.parentNode.click();
    });

});
