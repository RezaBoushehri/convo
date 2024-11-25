// Display the current font size as the slider is adjusted
// Select input elements
const bgColorPicker = document.getElementById("bgColorPicker");
const fgColorPicker = document.getElementById("fgColorPicker");
const fontSizeRange = document.getElementById("fontSizeRange");
const fontSizeValue = document.getElementById("fontSizeValue");
const previewArea = document.getElementById("previewArea");

// Update preview in real-time
function updatePreview() {
    previewArea.style.backgroundColor = bgColorPicker.value; // Background color
    previewArea.style.color = fgColorPicker.value;          // Font color
    previewArea.style.fontSize = `${fontSizeRange.value}px`; // Font size
    fontSizeValue.textContent = `${fontSizeRange.value}px`; // Display font size
}

// Add event listeners for real-time preview
bgColorPicker.addEventListener("input", updatePreview);
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
