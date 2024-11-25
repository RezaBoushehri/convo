// Display the current font size as the slider is adjusted
// Select input elements
const bgColorPicker = document.getElementById("bgColorPicker");
const fgColorPicker = document.getElementById("fgColorPicker");
const fontSizeRange = document.getElementById("fontSizeRange");
const chatWindowBg = document.getElementById("chatWindowBg-color");
const chatWindowFg = document.getElementById("chatWindowFg-color");
const fontSizeValue = document.getElementById("fontSizeValue");
const chat = document.getElementById("chat");
const previewArea = document.getElementById("previewArea");

// Update preview in real-time
function updatePreview() {
    chat.style.backgroundColor = bgColorPicker.value; // Background color
    chat.style.color = fgColorPicker.value;          // Font color
    chat.style.fontSize = `${fontSizeRange.value}px`; // Font size
    previewArea.style.color = chatWindowFg.value;          // Font color
    previewArea.style.backgroundColor = chatWindowBg.value; // Background color
    fontSizeValue.textContent = `${fontSizeRange.value}px`; // Display font size
    scroll()
}

// Add event listeners for real-time preview
bgColorPicker.addEventListener("input", updatePreview);
chatWindowBg.addEventListener("input", updatePreview);
chatWindowFg.addEventListener("input", updatePreview);
fgColorPicker.addEventListener("input", updatePreview);
fontSizeRange.addEventListener("input", updatePreview);

fontSizeRange.addEventListener("input", () => {
    const fontSize = `${fontSizeRange.value}px`;
    fontSizeValue.textContent = fontSize;

    // Apply the font size dynamically to the document
    document.documentElement.style.setProperty("--user-font-size", fontSize);
});
document.getElementById("closeSettings").addEventListener("click", () => {
    document.getElementById("settingsPanel").style.display = "none";
});
