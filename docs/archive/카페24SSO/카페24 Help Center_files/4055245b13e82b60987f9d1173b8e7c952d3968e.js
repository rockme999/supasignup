/**
 * @author Gian Paolo Carpena <gian@simplexi.com.ph>
 * @version 1.0
 * 
 * Global Help Center custom event listeners for layout components
 * 
 */

// SCROLL TO TOP BUTTON
document.addEventListener("DOMContentLoaded", function () {
    let oRootEl = document.documentElement;
    let oScrollToTopBtn = document.querySelector('.scroll-to-top');
    let oScrollToBottomBtn = document.querySelector('.scroll-to-bottom');

    /**
     * @author Gian Paolo Carpena <gian@simplexi.com.ph>
     * @version 1.0
     * 
     * Displays 'scroll to top' button's position
     * 
     */
    function displayScrollTop() {
        let iScrollTotal = oRootEl.scrollHeight - oRootEl.clientHeight
        let iDistanceFromBottom = ($(window).width() >= 768) ? 137 : 127;

        if ((oRootEl.scrollTop / iScrollTotal) > 0.05) {
            oScrollToTopBtn.style.opacity = '1';
            oScrollToTopBtn.style.transform = 'translateY(0)';
            oScrollToTopBtn.style.bottom = (iDistanceFromBottom + 'px');
            oScrollToBottomBtn.style.opacity = '1';
            oScrollToBottomBtn.style.transform = 'translateY(100%)';
            oScrollToBottomBtn.style.bottom = ((iDistanceFromBottom + 1) + 'px');
        }
        if ((oRootEl.scrollTop / iScrollTotal) < 0.05) {
            oScrollToTopBtn.style.opacity = "0";
            oScrollToTopBtn.style.transform = 'translateY(100px)';
            oScrollToBottomBtn.style.opacity = "0";
            oScrollToBottomBtn.style.transform = 'translateY(100px)';
        }
    }

    /**
     * @author Gian Paolo Carpena <gian@simplexi.com.ph>
     * @version 1.0
     * 
     * Executes scroll bar to scroll to top
     * 
     */
    function scrollTop() {
        oRootEl.scrollTo({
            top: 0,
            behavior: 'smooth'
        })
    }

    /**
     * @author Jeremy La Vina <jeremy01@simplexi.com.ph>
     * @version 1.0
     * 
     * Executes scroll bar to scroll to bottom
     * 
     */
    function scrollBottom() {
        oRootEl.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth'
        })
    }

    document.addEventListener('scroll', displayScrollTop);
    oScrollToTopBtn.addEventListener('click', scrollTop);
    oScrollToBottomBtn.addEventListener('click', scrollBottom)
})

// SEARCH BAR COMPONENT
document.addEventListener("DOMContentLoaded", function () {
    let oRootEl = document.documentElement;
    let oLayoutHead = document.querySelector('.layout__head');
    let oSearchBar = document.querySelector('.search-bar');
    let oSearchBarMainDefault = document.querySelector('.search__bar')
    let oSearchBarMainOnScroll = $('.search-section');
    const oBannerWrap = document.querySelector('.bannerWrap');
    const oMoTabs = document.getElementById('eFAQMobileTabs');
    const oHomeContent = document.getElementsByClassName('home__content')[0];
    let oTocList = document.querySelectorAll('.toc-menu__item a');
    let oArticleToc = $('.article-main__toc--desktop');
    const oLNBSection = $('.article-main__sidenav');
    const oLNBMainList = $('.sidenav-menu');
    let iLastScrollTop = window.scrollY;
    const sHomepagePath = '/hc/ko';

    /**
     * @author Gian Paolo Carpena <gian@simplexi.com.ph>
     * @version 1.0
     * 
     * Sets layout head and search bar when scrolling
     * 
     */
    function setLayoutHead() {

        let iScrollTop = oRootEl.scrollTop; // 현재 스크롤 위치

        if (window.location.pathname === sHomepagePath) {
            return;
        }
    
        // 스크롤 위치가 8.5픽셀 이상일 때 클래스 추가
        if (iScrollTop > 8.5) {
            oLayoutHead.classList.add('layout__head--fixed');
            oSearchBar.classList.add('search-bar--fixed');
        } else {
            oLayoutHead.classList.remove('layout__head--fixed');
            oSearchBar.classList.remove('search-bar--fixed');
        }
    }

    /**
     * @author Gian Paolo Carpena <gian@simplexi.com.ph>
     * @version 1.0
     * 
     * Checks if element is visible in viewport
     * 
     * @param {object} oElement
     */
    function isElementOutOfViewport(oElement) {
        let oRect = oElement.getBoundingClientRect();
        return oRect.bottom < 0 || oRect.right < 0 || oRect.left > window.innerWidth || oRect.top > window.innerHeight;
    }

    function lnbTopPosition() {
      if (oLNBSection.outerHeight() < 620) {
        oLNBSection.css('top', '5rem');
        oLNBMainList.css('padding-bottom', '5rem');
      }
    }

        /**
     * @author Gian Paolo Carpena <gian@simplexi.com.ph>
     * @version 1.0
     * 
     * Hides layout head based on scroll movement
     * 
     */
         function hideLayoutHead() {
            let iScrollTop = window.scrollY || oRootEl.scrollTop;
            const oLNBWrapper = $('.article-main__sidenav');

            if (window.location.pathname === sHomepagePath) {
                return;
            }
            // Scroll down
            if (iScrollTop > iLastScrollTop && iScrollTop >= 12) {
                oLayoutHead.style.opacity = '0';
                oLayoutHead.style.zIndex = '-1';
                oArticleToc.css('top', '5rem');
                oLNBWrapper.css('top', '5rem');
                oLNBMainList.css('padding-bottom', '5rem');
                lnbTopPosition();
                iLastScrollTop = iScrollTop <= 0 ? 0 : iScrollTop;
                return
            }
            // Scroll up
            oLayoutHead.removeAttribute('style');
            oArticleToc.css('top', '11rem');
            oLNBWrapper.css('top', '11rem');
            oLNBMainList.css('padding-bottom', '11rem');
            if (oLNBSection.outerHeight() < 620) {
              oLNBSection.css('top', '11rem');
              oLNBMainList.css('padding-bottom', '11rem');
            } else {
              lnbTopPosition();
            }
            iLastScrollTop = iScrollTop <= 0 ? 0 : iScrollTop;
        }
    

    /**
     * @author Gian Paolo Carpena <gian@simplexi.com.ph>
     * @version 1.0
     * 
     * Checks if elements exists before adding an event listener
     * 
     * @param {object} oElement
     * @param {object} oEventListener
     * @param {string} sEventName
     * @param {object} oEventHandler
     */
    function checkIfElementExists(oElement, oEventListener, sEventName, oEventHandler) {
        if (window.location.href.indexOf("/hc/ko/search") > -1 ) {return;} // Skip sticky search bar init for search page
        return oElement !== null ? oEventListener.addEventListener(sEventName, oEventHandler) : false;
    }

    oSearchBarMainOnScroll.attr('hidden', oSearchBarMainDefault !== null)
    
    checkIfElementExists(oLayoutHead, document, 'scroll', setLayoutHead)
    checkIfElementExists(oLayoutHead, document, 'scroll', hideLayoutHead)
    checkIfElementExists(oSearchBarMainDefault, document, 'scroll', function () {
        const isBannerOut = isElementOutOfViewport(oBannerWrap);

        if (!isBannerOut) {
            oMoTabs.classList.remove('faqMobileTabsFixedTop');
            oHomeContent.classList.remove('homeContentFixedTab');
        } else {
            oMoTabs.classList.add('faqMobileTabsFixedTop');
            oHomeContent.classList.add('homeContentFixedTab');
        }
    })
    oTocList.forEach(function (oItem) {
        oItem.addEventListener('click', function () {
            document.removeEventListener('scroll', hideLayoutHead);
            document.removeEventListener('scroll', setLayoutHead);
            oLayoutHead.style.opacity = '0';
            oLayoutHead.style.zIndex = '-1';
            oArticleToc.css('top', '5rem');
            setTimeout(function () {
                document.addEventListener('scroll', hideLayoutHead);
                document.addEventListener('scroll', setLayoutHead);
            }, 1000)
        })
    })
});

// FOOTER COMPONENT
document.addEventListener("DOMContentLoaded", function () {
    let oFooterMenu = document.querySelectorAll('.footer-nav__title');

    /**
     * @author Gian Paolo Carpena <gian@simplexi.com.ph>
     * @version 1.0
     * 
     * Displays footer submenu
     * 
     * @param {object} oEvent
     */
    function displayFooterSubmenu(oEvent) {
        if (window.innerWidth >= 1025) {return};
        let oSubmenu = oEvent.currentTarget.nextElementSibling;
        if (oSubmenu.classList.contains('footer-submenu-active') === false) {
            oSubmenu.classList.add('footer-submenu-active');
            oEvent.currentTarget.classList.add('footer-nav-active');
        } else {
            oSubmenu.classList.remove('footer-submenu-active');
            oEvent.currentTarget.classList.remove('footer-nav-active');
        }
    }

    oFooterMenu.forEach(oElement => oElement.addEventListener('click', displayFooterSubmenu))
})

// SIDEBAR COMPONENT
document.addEventListener("DOMContentLoaded", function () {
    let oSideNavMenuDefault = document.querySelectorAll('.sidenav-menu--default > .sidenav-menu__item')
    let oSideNavSubmenu = document.querySelectorAll('.sidenav-submenu__item');
    let oSidenavArticleIds = document.querySelectorAll('.sidenav-submenu__text a');

    /**
     * @author Gian Paolo Carpena <gian@simplexi.com.ph>
     * @version 1.0
     * 
     * Sets submenu class
     * 
     * @param {object} oElement
     * @param {string} sClass
     */
    function setSubmenu(oElement, sClass) {
        if (oElement.className === 'sidenav-menu__item' && document.querySelector("." + oElement.className + " > ul") !== null) {
            oElement.classList.add(sClass)
        } else if (oElement.querySelector('ul') !== null) {
            oElement.classList.add(sClass)
        } else {
            oElement.classList.remove(sClass)
        }
    }

    /**
     * @author Gian Paolo Carpena <gian@simplexi.com.ph>
     * @version 1.0
     * 
     * Displays side navigation submenu
     * 
     * @param {object} oEvent
     */
    function displaySideNavSubmenu(oEvent) {
        let oSubmenu = oEvent.currentTarget;
        oEvent.stopPropagation();
        if (oSubmenu.classList.contains('sidenav-submenu__item-has-children') === false ) {
            oSubmenu.firstElementChild.classList.add('sidenav-submenu__text-active');
            oSubmenu.firstElementChild.classList.add('sidenav-submenu__text-bg-active');
            const oAnchor = oSubmenu.firstElementChild.firstElementChild;
            const sRedirectLink = oAnchor.href;
            if (oAnchor.target === '_blank') {
                window.open(sRedirectLink, '_blank');
            } else { window.location.replace(sRedirectLink); }
            return
        }
        if (oSubmenu.lastElementChild.classList.contains('sidenav-submenu-active') === false) {
            // Set active sidenav as inactive
            $('.sidenav-menu').find('.sidenav-submenu-active:not(.current-page)').each(function () {
                var oSubmenuParent = $(oSubmenu).parent()[0];

                $(this).not(oSubmenuParent).not($(oSubmenuParent).parent().parent()[0]).removeClass('sidenav-submenu-active');
                $(this).not(oSubmenuParent).not($(oSubmenuParent).parent().parent().siblings()[0]).siblings().removeClass('sidenav-submenu__text-active');
            });

            oSubmenu.lastElementChild.classList.add('sidenav-submenu-active');
            oSubmenu.firstElementChild.classList.add('sidenav-submenu__text-active');
        } else if (oSubmenu.lastElementChild.classList.contains('sidenav-submenu-active')) {
            oSubmenu.lastElementChild.classList.remove('sidenav-submenu-active');
            oSubmenu.firstElementChild.classList.remove('sidenav-submenu__text-active');
        }
    }

    /**
    * @author Gian Paolo Carpena <gian@simplexi.com.ph>
    * @version 1.0
    * 
    * Finds current actice item in sidebar item list
    * 
    */
    function findSidebarCurrentActiveItem() {
        const iSectionId = $('#section-id').data('current_id');
        const iArticleId = $('#article-id').data('current_id');
        oSidenavArticleIds.forEach(function (oLink) {
            if (oLink.getAttribute('href').includes(iSectionId) || oLink.getAttribute('href').includes(iArticleId)) {
                $(oLink).css('pointer-events', 'none');
                setSidebarCurrentActiveItem(oLink)
            }
        })
        $('.sidenav-menu').find('.sidenav-submenu-active').each(function () {
            $(this).addClass('current-page');
        });
        $('.sidenav-menu').find('.sidenav-submenu__text-active').each(function () {
            $(this).addClass('current-page');
        });
    }

    /**
     * @author Gian Paolo Carpena <gian@simplexi.com.ph>
     * @version 1.0
     * 
     * Sets sidebar items active class based on current active item
     * 
     */
    function setSidebarCurrentActiveItem(oElement) {

        if (oElement.tagName === 'LI' && oElement.classList.contains('sidenav-menu__item')) {
            return
        }
        if (oElement.tagName === 'SPAN' && oElement.classList.contains('sidenav-submenu__text')) {
            oElement.classList.add('sidenav-submenu__text-active')
            oElement.classList.add('sidenav-submenu__text-bg-active')
            setSidebarCurrentActiveItem(oElement.parentElement)
        }
        if (oElement.tagName === 'LI' && oElement.classList.contains('sidenav-submenu__item-has-children') === true) {
            oElement.lastElementChild.classList.add('sidenav-submenu-active')
            oElement.firstElementChild.classList.remove('sidenav-submenu__text-bg-active')
            setSidebarCurrentActiveItem(oElement.parentElement)
        }
        if (oElement.tagName === 'UL' && oElement.classList.contains('sidenav-submenu')) {
            oElement.classList.add('sidenav-submenu-active')
            setSidebarCurrentActiveItem(oElement.previousElementSibling)
        }
        setSidebarCurrentActiveItem(oElement.parentElement)
    }

    oSideNavMenuDefault.forEach(oElement => setSubmenu(oElement, 'sidenav-menu__item-has-submenu'));
    oSideNavSubmenu.forEach(oElement => setSubmenu(oElement, 'sidenav-submenu__item-has-children'));
    oSideNavSubmenu.forEach(oElement => oElement.addEventListener('click', displaySideNavSubmenu));
    findSidebarCurrentActiveItem()
});

$(window).on('resize', function() {
    const oArticleMainContainer = $('#article-id');
    const oStickyHeader = $('.layout__head');
    const oLNBSection = $('.article-main__sidenav');
    const oMainWrapper = $('.article-main__side-content-wrap');

    if (window.innerWidth > 1054) {
        oLNBSection.detach().appendTo(oMainWrapper);
    } else {
        oLNBSection.detach().appendTo(oStickyHeader);
    }
});

/** Home Page - Sticky Nav Bar */
document.addEventListener('DOMContentLoaded', function() {
    const oStickyHeader = $('.layout__head');
    const oLNBSection = $('.article-main__sidenav');
    
    if (window.innerWidth < 1024) {
        oLNBSection.detach().appendTo(oStickyHeader);
    }
});
