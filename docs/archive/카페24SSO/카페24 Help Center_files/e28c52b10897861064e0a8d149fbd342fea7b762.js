var sArticleJsonLink = $(document.currentScript).data('articles');

document.addEventListener("DOMContentLoaded", function () {
  if ($('.article-paginate').length !== 0) {
    // Previous block
    var oPrevBlock = $('.article-paginate .prev-block');
    // Next block
    var oNextBlock = $('.article-paginate .next-block');
    // Get current article
    var iCurrentArticleId = $('#article-id').data('current_id');
    // Get current section
    var iCurrentSectionId = $('#section-id').data('current_id');

    $.getJSON(sArticleJsonLink, function (aArticles) {
      // Set Base URL
      var sBaseUrl = (aArticles[iCurrentArticleId] !== undefined) ? '//support.cafe24.com/hc/ko/articles/' : '//support.cafe24.com/hc/ko/sections/';
      var sPrevLink = (aArticles[iCurrentArticleId] !== undefined) ? aArticles[iCurrentArticleId].prev : aArticles[iCurrentSectionId].prev;
      var sNextLink = (aArticles[iCurrentArticleId] !== undefined) ? aArticles[iCurrentArticleId].next : aArticles[iCurrentSectionId].next;

      // If prev is empty, hide 
      // Else change href attribute
      if (sPrevLink === "") oPrevBlock.addClass('hide');
      else oPrevBlock.attr('href', sBaseUrl + sPrevLink);

      // If next is empty, hide
      // Else change href attribute
      if (sNextLink === "") oNextBlock.addClass('hide');
      else oNextBlock.attr('href', sBaseUrl + sNextLink);
    });
  }
});