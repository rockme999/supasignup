/**
 * @author Gian Paolo Carpena <gian@simplexi.com.ph>
 * @version 1.0
 * 
 * Article - Video Main Section - custom event listeners
 * 
 */
document.addEventListener("DOMContentLoaded", function() {
    let oVideoList =  document.querySelector('.video-main-list');
    let oVideoListButton = document.querySelector('.video-main-button');

    const iMinVideoListCount = screen.width <= 1024 ? 6 : 12;
    let iVideoListCount = oVideoList?.children.length;
    let iCurrentVideoCount = iMinVideoListCount;
    let iPageCount = iVideoListCount / iMinVideoListCount;
    let iCurrentVideoPageCount = 1
    let iTotalVideoPageCount = iPageCount % 1 != 0 ? Math.round(iPageCount) + 1 : iPageCount; 

    function displayViewMoreBtn() {

        if (iVideoListCount <= iMinVideoListCount) {
            oVideoListButton.classList.add('video-main-button--hidden');
        } else {
            oVideoListButton.classList.remove('video-main-button--hidden');
            oVideoListButton.addEventListener('click', function(event) {
                event.preventDefault()
                displayVideoList();
            })
        }
    }

    function displayVideoList() {
        iCurrentVideoPageCount += 1;
        let iMaxVideoList = iCurrentVideoPageCount * iMinVideoListCount;

        if (iCurrentVideoPageCount > iTotalVideoPageCount || iMaxVideoList === 0) {
            return
        }

        while (iCurrentVideoCount < iMaxVideoList) {
            if (iCurrentVideoCount >= iVideoListCount) {
                oVideoListButton.classList.add('video-main-button--hidden');
                break;
            }
            oVideoList.children[iCurrentVideoCount].style.display = 'block';
            iCurrentVideoCount++
        }
        iCurrentVideoCount = iMaxVideoList;
    }

    if (oVideoList !== null) {
        displayViewMoreBtn();
    }
})