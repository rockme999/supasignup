document.addEventListener("DOMContentLoaded", function() {
    const oSuggestedKeywordContainer = $('.suggested-keyword__search');
    const oSuggestedKeywords = $('.suggested-keyword--list .list-item');
    let bIsEmpty = true;

    function setSuggestedKeywordQueries() {
        oSuggestedKeywords.each(function() {
            const oKeywordLink = $(this).children('.kr-search__text');
            const sRedirectLink = '/hc/ko/search?query=' + oKeywordLink.text().replaceAll('#', '');
            if (oKeywordLink.text() !== '') bIsEmpty = false;
            oKeywordLink.attr('href', sRedirectLink);
        });
        if (bIsEmpty === true ) oSuggestedKeywordContainer.hide();
    }

    setSuggestedKeywordQueries();
});
