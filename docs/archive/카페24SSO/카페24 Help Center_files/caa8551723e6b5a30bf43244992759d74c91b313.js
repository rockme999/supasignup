  /**
   * @author Jeremy La Vina <jeremy01@simplexi.com.ph>
   *  
   * Slide from left GNB menu
   * 
   */
  let oNavbarIcon;
  let oNavbarContent;

document.addEventListener('DOMContentLoaded', () => {
  const oMenuButton = $('.menu-button');
  let oMenuButtonBack;
  const oHelpLineMenu = $('.help-line__menu');
  const oMenuTitle = $('.help-line--title');
  const oHelpLineButton = $('.helpc-button');
  
  document.addEventListener('click', function (eClick) {
    oNavbarIcon = $('.navbar-icon__container--TM');
    oNavbarContent = $('.navbar-content');

    if (eClick.target.classList.contains('help-line__button')) {
      oNavbarIcon.addClass('hide');
      oNavbarContent.addClass('hide');
      oMenuTitle.addClass('active');
      oHelpLineMenu.addClass('active');
      oMenuButton.dataset.help_line = true;
      oMenuButton.addClass('menu-button--back');
      oMenuButton.removeClass('menu-button');
    }
  });

  document.addEventListener('click', (eClick) => {
    oMenuButtonBack = $('.menu-button--back');
    if (eClick.target.classList.contains('menu-button--back')) {
      oMenuButtonBack.addClass('menu-button');
      oMenuButtonBack.removeClass('menu-button--back');
      oNavbarIcon = $('.navbar-icon__container--TM');
      oNavbarContent = $('.navbar-content');
      oNavbarIcon.removeClass('hide');
      oNavbarContent.removeClass('hide')
      oMenuTitle.removeClass('active');
      oHelpLineMenu.removeClass('active');
      oMenuButton.dataset.help_line = false;
    }
  });

  oHelpLineButton[0].addEventListener('click', (eClick) => {
    const oMainMenu = $('.navbar-content');
    const oHelpLineMenu = $('.help-line__menu');
    const oHelpLineIcon = $('.helpline-icon');
    const oHelpLineText = $('.helpline-text');

    if (oHelpLineText.hasClass('show')) return;

    if (window.innerWidth < 767) {
      oMenuButton.each(function () {
        $(this).attr('data-help_line', true); 
      });
      oMainMenu.toggleClass('hide');
      oHelpLineMenu.toggleClass('show');
      oHelpLineIcon.toggleClass('hide');
      oHelpLineText.toggleClass('show');
    }
  });
})  
