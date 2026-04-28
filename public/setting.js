function rgbToHex(rgb) {
  const match = rgb.match(/^(\d+),\s*(\d+),\s*(\d+)$/);
  if (!match) return rgb; // اگر hex بود، برگردان
  
  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);
  
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

const hexToRgb = (hex) => {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `${r}, ${g}, ${b}`;
};
// انتخاب المنت‌ها با jQuery
const bgColorPicker = $("#bgColorPicker");
const fgColorPicker = $("#fgColorPicker");
const fontSizeRange = $("#fontSizeRange");
const borderRadRange = $("#borderRadRange");
const fontSizeValue = $("#fontSizeValue");
const borderRadSet = $("#borderRadSet");
const chat = $("#chat.message");
const previewArea = $("#previewArea");

// تابع به‌روزرسانی پیش‌نمایش
function updatePreview() {
    // TODO: 
    // suggest:
    // bg:"204, 238, 191"
    
    if (chat.length) chat.css('backgroundColor', bgColorPicker.val());
    if (chat.length) chat.css('color', fgColorPicker.val());
    if (chat.length) chat.css('fontSize', fontSizeRange.val() + 'px');
    if (chat.length) chat.css('borderRadius', borderRadRange.val() + 'px');
    if (fontSizeValue.length) fontSizeValue.text(fontSizeRange.val() + 'px');
    if (borderRadSet.length) borderRadSet.text(borderRadRange.val() + 'px');
    ChangeTheme($(theme).val())
}

$(document).ready(function() {
    // اضافه کردن event listeners با jQuery
    theme.on('change',()=> ChangeTheme($(theme).val()));
    bgColorPicker.on('input', updatePreview);
    fgColorPicker.on('input', updatePreview);
    fontSizeRange.on('change', updatePreview);
    borderRadRange.on('change', updatePreview);

    // رویدادهای اضافی
    bgColorPicker.on('input', function() {

        const bgColor = (bgColorPicker.val()).startsWith("#") ? hexToRgb(bgColorPicker.val()) : bgColorPicker.val();
        
        document.documentElement.style.setProperty("--user-bg-color", bgColor );
    });

    // رویدادهای اضافی
    fgColorPicker.on('input', function() {

        const fgColor = (fgColorPicker.val()).startsWith("#") ? hexToRgb(fgColorPicker.val()) : fgColorPicker.val();
        
        document.documentElement.style.setProperty("--user-fg-color", fgColor );
    });

    // رویدادهای اضافی
    fontSizeRange.on('change', function() {
        const fontSize = $(this).val() + 'px';
        if (fontSizeValue.length) fontSizeValue.text(fontSize);
        document.documentElement.style.setProperty("--user-font-size", fontSize);
    });

    borderRadRange.on('change', function() {
        const borderRad = $(this).val() + 'px';
        if (borderRadSet.length) borderRadSet.text(borderRad);
    });

    const savedSettings = JSON.parse(localStorage.getItem("userSettings"));
    if (Notification.permission !== "granted") {
        Notification.requestPermission();
    }

    if (savedSettings) {

        const bgColor = savedSettings.bgColor.startsWith("#") ? hexToRgb(savedSettings.bgColor) : savedSettings.bgColor;
        const fgColor = savedSettings.fgColor.startsWith("#") ? hexToRgb(savedSettings.fgColor) : savedSettings.fgColor;
        fontSizeRange.val(savedSettings?.fontSize.split('px')[0])
        borderRadRange.val(savedSettings?.borderRad.split('px')[0])
        bgColorPicker.val(rgbToHex(bgColor))
        fgColorPicker.val(rgbToHex(fgColor))
        console.log(rgbToHex(bgColor),rgbToHex(fgColor))
        document.documentElement.style.setProperty("--user-font-size", savedSettings.fontSize);
        document.documentElement.style.setProperty("--user-bg-color", bgColor);
        document.documentElement.style.setProperty("--user-fg-color", fgColor);
        document.documentElement.style.setProperty("--user-border-radius", savedSettings.borderRad);
        console.log("Settings applied from local storage:", document.documentElement.style.getPropertyValue("--user-bg-color"));
    }
    updatePreview()

});


if(document.getElementById("saveSettings")){
    document.getElementById("saveSettings").addEventListener("click", () => {
        const panel = document.getElementById("settingsPanel");

        panel.style.display = panel.style.display === "block" ? "none" : "block";
        const bgColor = (bgColorPicker.val()).startsWith("#") ? hexToRgb(bgColorPicker.val()) : bgColorPicker.val();

        const fgColor = (fgColorPicker.val()).startsWith("#") ? hexToRgb(fgColorPicker.val()) : fgColorPicker.val();

        // Save settings locally
        const userSettings = {
            
            bgColor: bgColor, // Assuming a background color picker exists
            fgColor: fgColor, // Assuming a background color picker exists
            fontSize: `${fontSizeRange.val()}px`, // Get font size from range input
            borderRad: `${borderRadRange.val()}px`, // Get font size from range input
        };
        localStorage.setItem("userSettings", JSON.stringify(userSettings));

        // Optionally save settings to the server
        socket.emit("saveSettings", userSettings , currentUser.username);

        showAlert("Settings saved successfully!");
        document.getElementById("settingsPanel").style.display = "none"; // Close panel
        window.location.reload(); // This will refresh the page and reset the UI

    });
}
socket.on("applySettings", (settings) => {

    localStorage.setItem("userSettings", JSON.stringify(settings));
    document.documentElement.style.setProperty("--user-bg-color", settings.bgColor);
    document.documentElement.style.setProperty("--user-fg-color", settings.fgColor);
    document.documentElement.style.setProperty("--user-font-size", settings.fontSize);
    document.documentElement.style.setProperty("--user-border-radius", settings.borderRad);
});
if(document.getElementById("resetSettings")){
    document.getElementById("resetSettings").addEventListener("click", () => {
        if(confirm("تنظیمات فعلی شما پاک میشود. آیا اطمینان دارید؟")){
            
            localStorage.removeItem("userSettings");

            // Optionally save settings to the server
            socket.emit("saveSettings");
        
            showAlert("شخصی سازی شما بازنویسی شد",'success');
            document.getElementById("settingsPanel").style.display = "none"; // Close panel
            window.location.reload(); // This will refresh the page and reset the UI

        }
    })
}
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
                      <span>${i}</span>s
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