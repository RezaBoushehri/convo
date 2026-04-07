// Display the current font size as the slider is adjusted
// Select input elements
const bgColorPicker = document.getElementById("bgColorPicker");
const fgColorPicker = document.getElementById("fgColorPicker");
const fontSizeRange = document.getElementById("fontSizeRange");
const borderRadRange = document.getElementById("borderRadRange");
const chatWindowBg = document.getElementById("chatWindowBg-color");
const chatWindowFg = document.getElementById("chatWindowFg-color");
const fontSizeValue = document.getElementById("fontSizeValue");
const borderRadSet = document.getElementById("borderRadSet");
const chat = document.getElementById("chat");
const previewArea = document.getElementById("previewArea");

// Update preview in real-time
function updatePreview() {
    chat.style.backgroundColor = bgColorPicker.value; // Background color
    chat.style.color = fgColorPicker.value;          // Font color
    chat.style.fontSize = `${fontSizeRange.value}px`; // Font size
    chat.style.borderRadius = `${borderRadRange.value}px`; // Font size
    previewArea.style.color = chatWindowFg.value;          // Font color
    previewArea.style.backgroundColor = chatWindowBg.value; // Background color
    fontSizeValue.textContent = `${fontSizeRange.value}px`; // Display font size
    borderRadSet.textContent = `${borderRadRange.value}px`; // Display font size
    scroll()
}

// Add event listeners for real-time preview
bgColorPicker.addEventListener("input", updatePreview);
chatWindowBg.addEventListener("input", updatePreview);
chatWindowFg.addEventListener("input", updatePreview);
fgColorPicker.addEventListener("input", updatePreview);
fontSizeRange.addEventListener("input", updatePreview);
borderRadRange.addEventListener("input", updatePreview);

fontSizeRange.addEventListener("input", () => {
    const fontSize = `${fontSizeRange.value}px`;
    fontSizeValue.textContent = fontSize;

    // Apply the font size dynamically to the document
    document.documentElement.style.setProperty("--user-font-size", fontSize);
});
borderRadRange.addEventListener("input", () => {
    const borderRad = `${borderRadRange.value}px`;
    borderRadRange.textContent = borderRad;

    // Apply the font size dynamically to the document
    // document.documentElement.style.setProperty("--user-font-size", borderRad);
});
document.getElementById("closeSettings").addEventListener("click", () => {
    document.getElementById("settingsPanel").style.display = "none";
});
function res_alert(message, type = 'info', duration = 5000) {
      let i = Math.floor(duration / 1000);
      const type_check_class={
        'info':'info',
        'warning':'warning',
        'success':'success',
        'danger':'danger',
        'error':'danger',
      }
      // Remove any existing alert so they don’t stack like bad life choices
      $('#response').remove();

      const $alert = $(`
          <div id="response"
              class="alert alert-${type_check_class[type]??'info'} alert-dismissible position-fixed top-0 end-0  mt-3 col-md-auto me-3 animate__animated"
              role="alert"
              style="
                  z-index: 1060;
                  display: none;
              ">
              <div class="d-flex col-12 justify-content-between align-items-center">
                  <span class="col-auto">${message}</span>
                  <small class="ms-3 col text-muted">
                      fade out in : <span>${i}</span>s
                  </small>
              </div>
              <button type="button" class="btn-close btn-sm btn m-1 p-1" data-bs-dismiss="alert"></button>
          </div>
      `);

      $('body').append($alert);

      // Animate in
      $alert
          .removeClass('animate__fadeOutRight')
          .addClass('animate__fadeInRight')
          .show();

      const interval = setInterval(() => {
          i--;
          $('#response span:last').text(i);

          if (i <= 0) {
              clearInterval(interval);

              $alert
                  .removeClass('animate__fadeInRight')
                  .addClass('animate__fadeOutRight');

              setTimeout(() => {
                  $alert.remove();
              }, 800); // match animation duration
          }
      }, 1000);
  }

    function capitalizeWord(word) {
        if (!word) return "";
        return word[0].toUpperCase() + word.slice(1);
    }

    $(document).ready(()=>{
        $(document).on('click','[data-bs-toggle="collapse"]',()=>{
            $('[aria-expanded="true"] i').addClass('bi-chevron-compact-up').removeClass('bi-chevron-compact-down')
            $('[aria-expanded="false"] i').addClass('bi-chevron-compact-down').removeClass('bi-chevron-compact-up')
        })
        
    })