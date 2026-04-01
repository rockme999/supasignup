(function ($, window, document) {
  ('use strict');

  // Get max height of any active menu
  function getMaxHeight() {
    var iTemp = 0;
    $('.menu.show').each(function () {
      var iElemHeight = $(this).outerHeight();
      iTemp = iTemp < iElemHeight ? iElemHeight : iTemp
    });

    return iTemp
  }

  $(document).on('click', '.navbar .menu-button-wrap', function () {
    if ($(this).children('.menu-button').attr('data-help_line') === 'false') {
      $('.navbar').toggleClass('shown');
      $('.navbar-backdrop').toggleClass('active');
      $('body').css('overflow', $('.navbar').hasClass('shown') ? 'hidden' : 'auto');
      $('body').css('overflow', $('.navbar-backdrop').hasClass('active') ? 'hidden' : 'auto');
      $('.menu-button').each(function() {
        $(this).attr('data-is_open', !($(this).attr('data-is_open') !== 'false')); 
      });
    } else {
      $('.menu-button').each(function() {
        $(this).attr('data-help_line', false); 
      })
      const oMainMenu = $('.navbar-content');
      const oHelpLineMenu = $('.help-line__menu');
      const oHelpLineIcon = $('.helpline-icon');
      const oHelpLineText = $('.helpline-text');
  
      if (window.innerWidth < 767) {
        oMainMenu.toggleClass('hide');
        oHelpLineMenu.toggleClass('show');
        oHelpLineIcon.toggleClass('hide');
        oHelpLineText.toggleClass('show');
      }
    }
  });

  if ($(window).width() > 1023) {
    $(document).on('mouseenter', '.toggle', function () {
      // Remove existing class show from other elements
      $(this).parent().siblings().find('.menu').removeClass('show');
      // Toggle class show on this element
      $(this).siblings('.menu').toggleClass('show');
      // Set aria-pressed as false on other elements
      $(this).parent().siblings().find('.toggle').attr('aria-pressed', 'false');
      // Toggle aria-pressed on this element 
      $(this).attr('aria-pressed', !($(this).attr('aria-pressed') !== 'false'));
    });

    $(window).scroll(function() {
      let height = $(window).scrollTop();
  
      if(height  > 400) {
        $(document).find('.menu').removeClass('show');
        $(document).find('.toggle').attr('aria-pressed', 'false');
      }
    });
  }
  
  $(document).on('click', '.toggle', function () {
    // Remove existing class show from other elements
    $(this).parent().siblings().find('.menu').removeClass('show');
    // Toggle class show on this element
    $(this).siblings('.menu').toggleClass('show');
    // Set aria-pressed as false on other elements
    $(this).parent().siblings().find('.toggle').attr('aria-pressed', 'false');
    // Toggle aria-pressed on this element 
    $(this).attr('aria-pressed', !($(this).attr('aria-pressed') !== 'false'));
  });

  $(document).on('click', function (oEvent) {
    if ($(oEvent.target).closest('.navbar-item').length === 0) {
      // Set all aria-pressed to false
      $('.navbar-dropdown .toggle').attr('aria-pressed', 'false');
      // Remove all class named show on menus
      $('.navbar-dropdown .menu').removeClass('show');
    }
  });

  $(document).on('click', '.toggle > a', function (oEvent) {
    oEvent.preventDefault();
    oEvent.stopPropagation();

    window.location.href = $(this).attr('href'); // trigger link only
  });

  $(window).on('resize', function () {
    if ($(window).width() <= 1270) {
      // Set menu height to initial
      $('.menu').css('height', 'initial');
    }
  });
})(jQuery, window, document);
